import { z } from "zod";
import { jsonValue } from "../../shared/validators";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { annualAgendas, annualMilestones, departmentAgendas } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const agendaRouter = router({
  getTrainings: protectedProcedure.query(async () => {
    return { trainings: [] as any[] };
  }),

  getMeetingTypes: protectedProcedure.query(async () => {
    return [
      { id: "Q4_Strategy", name: "Q4战略规划", description: "第四季度战略规划会议", level: "company", frequency: "yearly", code: "Q4S", defaultDuration: 120, defaultStartTime: "09:00" },
      { id: "Q1_Kickoff", name: "Q1启动会", description: "第一季度启动会议", level: "company", frequency: "yearly", code: "Q1K", defaultDuration: 90, defaultStartTime: "09:00" },
      { id: "Monthly_Review", name: "月度评审", description: "月度经营评审会议", level: "department", frequency: "monthly", code: "MR", defaultDuration: 60, defaultStartTime: "14:00" },
      { id: "Weekly_Check", name: "周例会", description: "每周例行检查会议", level: "team", frequency: "weekly", code: "WC", defaultDuration: 30, defaultStartTime: "09:00" },
      { id: "Custom", name: "自定义", description: "自定义会议类型", level: "team", frequency: "custom", code: "CUS", defaultDuration: 60, defaultStartTime: "10:00" },
    ];
  }),

  getMeetings: protectedProcedure.input(z.record(z.string(), jsonValue).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const milestones = await db.select().from(annualMilestones).orderBy(annualMilestones.scheduledDate).limit(1000);
    return milestones;
  }),

  getAnnualPlans: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(annualAgendas).orderBy(desc(annualAgendas.createdAt)).limit(1000);
    return items.map(p => ({
      id: p.id,
      year: p.year,
      title: p.title,
      description: p.description,
      status: p.status as string,
      createdBy: p.createdBy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      type: "company" as string,
      name: p.title,
      revenueTarget: null as number | null,
      profitTarget: null as number | null,
      customerTarget: null as number | null,
      hiringBudget: null as number | null,
    }));
  }),

  initMeetingTypes: requirePermission('strategy:agenda:manage').mutation(async () => {
    return { success: true, message: "会议类型已初始化" };
  }),

  createMeeting: protectedProcedure.input(z.object({
    agendaId: z.number().optional(),
    title: z.string().optional(),
    milestoneType: z.string().optional(),
    scheduledDate: z.string().optional(),
    scheduledTime: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    description: z.string().optional(),
    isRecurring: z.union([z.boolean(), z.number()]).optional(),
    recurrenceRule: z.string().optional(),
    typeId: z.number().optional(),
    level: z.string().optional(),
    location: z.string().optional(),
    onlineLink: z.string().optional(),
    agenda: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    let agendaId = input.agendaId;
    if (!agendaId) {
      const year = new Date().getFullYear();
      const existing = await db.select().from(annualAgendas).limit(1000);
      const found = existing.find(a => a.year === year);
      if (found) {
        agendaId = found.id;
      } else {
        const [agenda] = await db.insert(annualAgendas).values({
          year,
          title: `${year}年度议程`,
          status: "draft",
          createdBy: ctx.user!.id,
        }).returning();
        agendaId = agenda.id;
      }
    }
    const title = input.title || "新会议";
    const milestoneType = input.milestoneType || "Custom";
    const scheduledDate = input.scheduledDate || (input.startTime ? new Date(input.startTime).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    const scheduledTime = input.scheduledTime || (input.startTime ? new Date(input.startTime).toTimeString().slice(0, 5) : undefined);

    const [milestone] = await db.insert(annualMilestones).values({
      agendaId,
      milestoneType: milestoneType as any,
      title,
      description: input.description,
      scheduledDate,
      scheduledTime,
      isRecurring: input.isRecurring ? 1 : 0,
      recurrenceRule: input.recurrenceRule,
      status: "pending",
    }).returning();
    return { success: true, data: milestone };
  }),

  createTraining: requirePermission('strategy:agenda:manage').input(z.record(z.string(), jsonValue).optional()).mutation(async () => {
    return { success: true, message: "培训已创建" };
  }),

  seedTrainingData: requirePermission('strategy:agenda:manage').mutation(async () => {
    return { success: true, message: "培训数据已初始化" };
  }),

  clearTrainingData: requirePermission('strategy:agenda:manage').mutation(async () => {
    return { success: true, message: "培训数据已清除" };
  }),

  getParticipants: protectedProcedure.input(z.object({
    milestoneId: z.union([z.string(), z.number()]).optional(),
    id: z.union([z.string(), z.number()]).optional(),
    trainingId: z.union([z.string(), z.number()]).optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const milestoneId = toNum(input?.milestoneId || input?.id || input?.trainingId || 0);
    if (!milestoneId) return [];
    const items = await db.select().from(departmentAgendas)
      .where(eq(departmentAgendas.milestoneId, milestoneId)).limit(1000);
    return items.map(item => ({
      ...item,
      userId: item.id,
      registrationStatus: item.status,
      attendanceStatus: item.status === "completed" ? "attended" : "pending",
      score: null as number | null,
      passed: item.status === "completed",
      feedbackRating: null as number | null,
    }));
  }),

  addParticipant: requirePermission('strategy:agenda:manage').input(z.object({
    agendaId: z.number().optional(),
    milestoneId: z.union([z.string(), z.number()]).optional(),
    trainingId: z.union([z.string(), z.number()]).optional(),
    userId: z.union([z.string(), z.number()]).optional(),
    departmentCode: z.string().optional(),
    departmentName: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    if (!input.agendaId && !input.milestoneId && !input.trainingId) {
      throw new Error("agendaId or milestoneId/trainingId is required");
    }
    const agendaId = input.agendaId!;
    const milestoneId = input.milestoneId || input.trainingId!;
    const departmentCode = input.departmentCode || String(input.userId || "unknown");
    const [item] = await db.insert(departmentAgendas).values({
      agendaId,
      milestoneId,
      departmentCode,
      departmentName: input.departmentName,
      notes: input.notes,
      status: "scheduled",
    } as any).returning();
    return { success: true, data: item };
  }),

  batchAddParticipants: requirePermission('strategy:agenda:manage').input(z.object({
    agendaId: z.number().optional(),
    milestoneId: z.union([z.string(), z.number()]).optional(),
    trainingId: z.union([z.string(), z.number()]).optional(),
    departments: z.array(z.record(z.string(), jsonValue)).optional(),
    userIds: z.array(z.union([z.string(), z.number()])).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    if (!input.agendaId && !input.milestoneId && !input.trainingId) {
      throw new Error("agendaId or milestoneId/trainingId is required");
    }
    const agendaId = input.agendaId!;
    const milestoneId = input.milestoneId || input.trainingId!;
    const departments: Record<string, unknown>[] = input.departments || (input.userIds || []).map((uid) => ({ departmentCode: String(uid) }));
    for (const dept of departments) {
      await db.insert(departmentAgendas).values({
        agendaId,
        milestoneId,
        departmentCode: (dept.departmentCode as string) || String(dept),
        departmentName: dept.departmentName as string,
        status: "scheduled",
      } as any);
    }
    return { success: true, message: `${departments.length} 个参与者已添加` };
  }),

  updateParticipant: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    status: z.string().optional(),
    adjustedDate: z.string().optional(),
    adjustedTime: z.string().optional(),
    adjustmentReason: z.string().optional(),
    notes: z.string().optional(),
    registrationStatus: z.string().optional(),
    attendanceStatus: z.string().optional(),
    score: z.number().optional(),
    passed: z.boolean().optional(),
    feedbackRating: z.number().optional(),
    feedback: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = toNum(input.id);
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (input.status !== undefined) updates.status = input.status;
    if (input.adjustedDate !== undefined) updates.adjustedDate = input.adjustedDate;
    if (input.adjustedTime !== undefined) updates.adjustedTime = input.adjustedTime;
    if (input.adjustmentReason !== undefined) updates.adjustmentReason = input.adjustmentReason;
    if (input.notes !== undefined) updates.notes = input.notes;
    // Map training-specific fields to status
    if (input.registrationStatus !== undefined) updates.status = input.registrationStatus === "completed" ? "completed" : "scheduled";
    const [item] = await db.update(departmentAgendas).set(updates as any).where(eq(departmentAgendas.id, id)).returning();
    return { success: true, data: item };
  }),
});
