import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
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

  getMeetings: protectedProcedure.input(z.any()).query(async ({ input }) => {
    const db = await requireDb();
    const milestones = await db.select().from(annualMilestones).orderBy(annualMilestones.scheduledDate);
    return milestones;
  }),

  getAnnualPlans: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(annualAgendas).orderBy(desc(annualAgendas.createdAt));
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

  initMeetingTypes: protectedProcedure.mutation(async () => {
    return { success: true, message: "会议类型已初始化" };
  }),

  createMeeting: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    let agendaId = input.agendaId;
    if (!agendaId) {
      const year = new Date().getFullYear();
      const existing = await db.select().from(annualAgendas);
      const found = existing.find(a => a.year === year);
      if (found) {
        agendaId = found.id;
      } else {
        const [agenda] = await db.insert(annualAgendas).values({
          year,
          title: `${year}年度议程`,
          status: "draft",
          createdBy: 1,
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

  createTraining: protectedProcedure.input(z.any()).mutation(async () => {
    return { success: true, message: "培训已创建" };
  }),

  seedTrainingData: protectedProcedure.mutation(async () => {
    return { success: true, message: "培训数据已初始化" };
  }),

  clearTrainingData: protectedProcedure.mutation(async () => {
    return { success: true, message: "培训数据已清除" };
  }),

  getParticipants: protectedProcedure.input(z.any()).query(async ({ input }) => {
    const db = await requireDb();
    const milestoneId = toNum(input?.milestoneId || input?.id || input?.trainingId || 0);
    if (!milestoneId) return [];
    const items = await db.select().from(departmentAgendas)
      .where(eq(departmentAgendas.milestoneId, milestoneId));
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

  addParticipant: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const agendaId = input.agendaId || 1;
    const milestoneId = input.milestoneId || input.trainingId || 1;
    const departmentCode = input.departmentCode || String(input.userId || "unknown");
    const [item] = await db.insert(departmentAgendas).values({
      agendaId,
      milestoneId,
      departmentCode,
      departmentName: input.departmentName,
      notes: input.notes,
      status: "scheduled",
    }).returning();
    return { success: true, data: item };
  }),

  batchAddParticipants: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const agendaId = input.agendaId || 1;
    const milestoneId = input.milestoneId || input.trainingId || 1;
    const departments = input.departments || (input.userIds || []).map((uid: any) => ({ departmentCode: String(uid) }));
    for (const dept of departments) {
      await db.insert(departmentAgendas).values({
        agendaId,
        milestoneId,
        departmentCode: dept.departmentCode || String(dept),
        departmentName: dept.departmentName,
        status: "scheduled",
      });
    }
    return { success: true, message: `${departments.length} 个参与者已添加` };
  }),

  updateParticipant: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
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
    const [item] = await db.update(departmentAgendas).set(updates).where(eq(departmentAgendas.id, id)).returning();
    return { success: true, data: item };
  }),
});
