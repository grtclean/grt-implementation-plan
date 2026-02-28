/**
 * GRT Smart OA & Command Center — tRPC Router
 *
 * 24 procedures:
 *   Workflows      (8): list, get, create, approve, reject, cancel, myPending, stats
 *   Meetings       (6): list, create, update, generateAgenda, getAgendaItems, updateAgendaItem
 *   Trips          (3): list, create, get
 *   Leave Balances (3): getMyBalances, initBalances, listAll
 *   Announcements  (4): list, get, create, publish
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  oaWorkflows,
  companyEventsMeetings,
  meetingAgendasActions,
  businessTripReports,
  oaLeaveBalances,
  oaAnnouncements,
  OA_WORKFLOW_TYPES,
  OA_WORKFLOW_STATUSES,
  OA_AGENDA_STATUSES,
  OA_LEAVE_TYPES,
  OA_ANNOUNCEMENT_STATUSES,
} from "../../drizzle/oa-schema";
import { users } from "../../drizzle/schema";
import {
  createOARequest,
  approveOARequest,
  rejectOARequest,
  generateMondayMorningAgenda,
  submitTripReport,
  getLeaveBalances,
  initLeaveBalances,
  createAnnouncement,
} from "../services/oa.service";
import { eq, and, desc, count, ne, ilike, sql } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const oaRouter = router({

  // ══════════════════════════════════════════════════
  // OA Workflows
  // ══════════════════════════════════════════════════

  listWorkflows: protectedProcedure.input(z.object({
    type: z.enum(OA_WORKFLOW_TYPES).optional(),
    status: z.enum(OA_WORKFLOW_STATUSES).optional(),
    applicantId: z.union([z.string(), z.number()]).optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [];

    if (input?.type) conditions.push(eq(oaWorkflows.type, input.type));
    if (input?.status) conditions.push(eq(oaWorkflows.status, input.status));
    if (input?.applicantId) conditions.push(eq(oaWorkflows.applicantId, toNum(input.applicantId)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ value: total }]] = await Promise.all([
      db.select().from(oaWorkflows)
        .where(where)
        .orderBy(desc(oaWorkflows.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0),
      db.select({ value: count() }).from(oaWorkflows).where(where),
    ]);

    return { items, total: Number(total) };
  }),

  getWorkflow: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [workflow] = await db.select().from(oaWorkflows)
      .where(eq(oaWorkflows.id, toNum(input.id)));
    return workflow ?? null;
  }),

  createWorkflow: protectedProcedure.input(z.object({
    type: z.enum(OA_WORKFLOW_TYPES),
    title: z.string().min(1).max(200),
    content: z.record(z.string(), z.unknown()).optional(),
    linkedProjectId: z.number().optional(),
    approverId: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    return createOARequest({
      applicantId: ctx.user.id,
      type: input.type,
      title: input.title,
      content: input.content as Record<string, unknown> | undefined,
      linkedProjectId: input.linkedProjectId,
      approverId: input.approverId,
    });
  }),

  approveWorkflow: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    comment: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    return approveOARequest(toNum(input.id), ctx.user.id, input.comment);
  }),

  rejectWorkflow: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    comment: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    return rejectOARequest(toNum(input.id), ctx.user.id, input.comment);
  }),

  cancelWorkflow: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    // Atomic status guard: WHERE status='PENDING' prevents race condition
    const [workflow] = await db.update(oaWorkflows)
      .set({
        status: "CANCELLED",
        version: sql`${oaWorkflows.version} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(oaWorkflows.id, numId), eq(oaWorkflows.status, "PENDING")))
      .returning();
    if (!workflow) {
      throw new Error(`Workflow #${input.id} not found or not PENDING`);
    }
    return workflow;
  }),

  getMyPendingApprovals: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const userId = ctx.user.id;
    const items = await db.select().from(oaWorkflows)
      .where(
        and(
          eq(oaWorkflows.approverId, userId),
          eq(oaWorkflows.status, "PENDING"),
        )
      )
      .orderBy(desc(oaWorkflows.createdAt));
    return items;
  }),

  getWorkflowStats: protectedProcedure.query(async () => {
    const db = await requireDb();

    const stats = await db
      .select({
        type: oaWorkflows.type,
        status: oaWorkflows.status,
        count: count(),
      })
      .from(oaWorkflows)
      .groupBy(oaWorkflows.type, oaWorkflows.status);

    // Aggregate into a summary
    const summary: Record<string, Record<string, number>> = {};
    let totalPending = 0;

    for (const row of stats) {
      if (!summary[row.type]) summary[row.type] = {};
      summary[row.type][row.status] = Number(row.count);
      if (row.status === "PENDING") totalPending += Number(row.count);
    }

    return { byTypeAndStatus: summary, totalPending };
  }),

  // ══════════════════════════════════════════════════
  // Meetings
  // ══════════════════════════════════════════════════

  listMeetings: protectedProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(companyEventsMeetings)
      .where(eq(companyEventsMeetings.isActive, true))
      .orderBy(companyEventsMeetings.dayOfWeek);
  }),

  createMeeting: protectedProcedure.input(z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    departmentId: z.number().optional(),
    organizerId: z.number().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    recurrenceRule: z.string().optional(),
    location: z.string().optional(),
    autoAgendaContext: z.object({
      sourceTypes: z.array(z.string()),
      lookbackDays: z.number(),
      maxItems: z.number(),
    }).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [meeting] = await db.insert(companyEventsMeetings).values({
      title: input.title,
      description: input.description,
      departmentId: input.departmentId,
      organizerId: input.organizerId,
      startTime: input.startTime,
      endTime: input.endTime,
      dayOfWeek: input.dayOfWeek,
      recurrenceRule: input.recurrenceRule,
      location: input.location,
      autoAgendaContext: input.autoAgendaContext,
    }).returning();
    return meeting;
  }),

  updateMeeting: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string().optional(),
    description: z.string().optional(),
    departmentId: z.number().optional(),
    organizerId: z.number().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    recurrenceRule: z.string().optional(),
    location: z.string().optional(),
    autoAgendaContext: z.object({
      sourceTypes: z.array(z.string()),
      lookbackDays: z.number(),
      maxItems: z.number(),
    }).optional(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...rest } = input;
    const setData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (rest.title !== undefined) setData.title = rest.title;
    if (rest.description !== undefined) setData.description = rest.description;
    if (rest.departmentId !== undefined) setData.departmentId = rest.departmentId;
    if (rest.organizerId !== undefined) setData.organizerId = rest.organizerId;
    if (rest.startTime !== undefined) setData.startTime = rest.startTime;
    if (rest.endTime !== undefined) setData.endTime = rest.endTime;
    if (rest.dayOfWeek !== undefined) setData.dayOfWeek = rest.dayOfWeek;
    if (rest.recurrenceRule !== undefined) setData.recurrenceRule = rest.recurrenceRule;
    if (rest.location !== undefined) setData.location = rest.location;
    if (rest.autoAgendaContext !== undefined) setData.autoAgendaContext = rest.autoAgendaContext;
    if (rest.isActive !== undefined) setData.isActive = rest.isActive;

    const [meeting] = await db.update(companyEventsMeetings)
      .set(setData)
      .where(eq(companyEventsMeetings.id, toNum(id)))
      .returning();
    if (!meeting) throw new Error(`Meeting #${id} not found`);
    return meeting;
  }),

  generateAgenda: protectedProcedure.input(z.object({
    meetingId: z.union([z.string(), z.number()]),
  })).mutation(async ({ input }) => {
    return generateMondayMorningAgenda(toNum(input.meetingId));
  }),

  getAgendaItems: protectedProcedure.input(z.object({
    meetingId: z.union([z.string(), z.number()]),
    meetingDate: z.string().optional(), // YYYY-MM-DD
  })).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [eq(meetingAgendasActions.meetingId, toNum(input.meetingId))];
    if (input.meetingDate) {
      conditions.push(eq(meetingAgendasActions.meetingDate, input.meetingDate));
    }
    return db.select().from(meetingAgendasActions)
      .where(and(...conditions))
      .orderBy(meetingAgendasActions.sortOrder);
  }),

  updateAgendaItem: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    decision: z.string().optional(),
    assignedTo: z.number().optional(),
    deadline: z.string().optional(),
    status: z.enum(OA_AGENDA_STATUSES).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...updates } = input;
    const setData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (updates.decision !== undefined) setData.decision = updates.decision;
    if (updates.assignedTo !== undefined) setData.assignedTo = updates.assignedTo;
    if (updates.deadline !== undefined) setData.deadline = updates.deadline;
    if (updates.status !== undefined) setData.status = updates.status;

    const [item] = await db.update(meetingAgendasActions)
      .set(setData)
      .where(eq(meetingAgendasActions.id, toNum(id)))
      .returning();
    if (!item) throw new Error(`Agenda item #${id} not found`);
    return item;
  }),

  concludeMeeting: protectedProcedure.input(z.object({
    meetingId: z.union([z.string(), z.number()]),
    meetingDate: z.string(),
    updates: z.array(z.object({
      id: z.union([z.string(), z.number()]),
      decision: z.string().optional(),
      assignedTo: z.number().optional(),
      deadline: z.string().optional(),
      status: z.enum(OA_AGENDA_STATUSES).optional(),
    })),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const now = new Date().toISOString();
    let updatedCount = 0;

    // 1. Batch-update each item with inline edits
    for (const item of input.updates) {
      const setData: Record<string, unknown> = { updatedAt: now };
      if (item.decision !== undefined) setData.decision = item.decision;
      if (item.assignedTo !== undefined) setData.assignedTo = item.assignedTo;
      if (item.deadline !== undefined) setData.deadline = item.deadline;
      if (item.status !== undefined) setData.status = item.status;
      if (Object.keys(setData).length > 1) {
        await db.update(meetingAgendasActions)
          .set(setData)
          .where(eq(meetingAgendasActions.id, toNum(item.id)));
        updatedCount++;
      }
    }

    // 2. Transition remaining "open" items → "in_progress"
    const transitioned = await db.update(meetingAgendasActions)
      .set({ status: "in_progress", updatedAt: now })
      .where(
        and(
          eq(meetingAgendasActions.meetingId, toNum(input.meetingId)),
          eq(meetingAgendasActions.meetingDate, input.meetingDate),
          eq(meetingAgendasActions.status, "open"),
        )
      )
      .returning();
    updatedCount += transitioned.length;

    return {
      meetingId: toNum(input.meetingId),
      meetingDate: input.meetingDate,
      updatedCount,
      concludedAt: now,
    };
  }),

  // ══════════════════════════════════════════════════
  // Trip Reports
  // ══════════════════════════════════════════════════

  listTripReports: protectedProcedure.input(z.object({
    employeeId: z.union([z.string(), z.number()]).optional(),
    projectId: z.union([z.string(), z.number()]).optional(),
    status: z.enum(["draft", "submitted", "reviewed"]).optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [];

    if (input?.employeeId) conditions.push(eq(businessTripReports.employeeId, toNum(input.employeeId)));
    if (input?.projectId) conditions.push(eq(businessTripReports.projectId, toNum(input.projectId)));
    if (input?.status) conditions.push(eq(businessTripReports.status, input.status));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ value: total }]] = await Promise.all([
      db.select().from(businessTripReports)
        .where(where)
        .orderBy(desc(businessTripReports.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0),
      db.select({ value: count() }).from(businessTripReports).where(where),
    ]);

    return { items, total: Number(total) };
  }),

  createTripReport: protectedProcedure.input(z.object({
    employeeId: z.number().optional(),
    projectId: z.number().optional(),
    tripRequestId: z.number().optional(),
    customerId: z.number().optional(),
    travelStartDate: z.string().optional(),
    travelEndDate: z.string().optional(),
    destination: z.string().optional(),
    tripSummary: z.string().optional(),
    keyFindings: z.string().optional(),
    followUpActions: z.array(z.object({
      action: z.string(),
      assignee: z.string(),
      deadline: z.string(),
    })).optional(),
    technicalQuestionnaireData: z.record(z.string(), z.unknown()).optional(),
    attachments: z.array(z.object({
      name: z.string(),
      url: z.string(),
      type: z.string(),
    })).optional(),
  })).mutation(async ({ input }) => {
    return submitTripReport({
      employeeId: input.employeeId,
      projectId: input.projectId,
      tripRequestId: input.tripRequestId,
      customerId: input.customerId,
      travelStartDate: input.travelStartDate,
      travelEndDate: input.travelEndDate,
      destination: input.destination,
      tripSummary: input.tripSummary,
      keyFindings: input.keyFindings,
      followUpActions: input.followUpActions,
      technicalQuestionnaireData: input.technicalQuestionnaireData as any,
      attachments: input.attachments,
    });
  }),

  getTripReport: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [report] = await db.select().from(businessTripReports)
      .where(eq(businessTripReports.id, toNum(input.id)));
    return report ?? null;
  }),

  // ══════════════════════════════════════════════════
  // Leave Balances (假期余额 — from JDY 考勤管理)
  // ══════════════════════════════════════════════════

  getMyLeaveBalances: protectedProcedure.input(z.object({
    year: z.number().optional(),
  }).optional()).query(async ({ input, ctx }) => {
    const year = input?.year ?? new Date().getFullYear();
    return getLeaveBalances(ctx.user.id, year);
  }),

  initLeaveBalances: protectedProcedure.input(z.object({
    employeeId: z.number(),
    year: z.number(),
    allocations: z.array(z.object({
      leaveType: z.string(),
      totalDays: z.number(),
      carriedOverDays: z.number().optional(),
    })),
  })).mutation(async ({ input }) => {
    return initLeaveBalances(input.employeeId, input.year, input.allocations);
  }),

  listAllLeaveBalances: protectedProcedure.input(z.object({
    year: z.number().optional(),
    limit: z.number().default(100),
    offset: z.number().default(0),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const year = input?.year ?? new Date().getFullYear();
    const conditions = [eq(oaLeaveBalances.year, year)];

    const where = and(...conditions);
    const [items, [{ value: total }]] = await Promise.all([
      db.select().from(oaLeaveBalances)
        .where(where)
        .limit(input?.limit ?? 100)
        .offset(input?.offset ?? 0),
      db.select({ value: count() }).from(oaLeaveBalances).where(where),
    ]);
    return { items, total: Number(total) };
  }),

  // ══════════════════════════════════════════════════
  // Announcements (公告通知 — from JDY 会议管理/通知)
  // ══════════════════════════════════════════════════

  listAnnouncements: protectedProcedure.input(z.object({
    status: z.enum(OA_ANNOUNCEMENT_STATUSES).optional(),
    category: z.string().optional(),
    departmentId: z.number().optional(),
    limit: z.number().default(20),
    offset: z.number().default(0),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [];

    if (input?.status) conditions.push(eq(oaAnnouncements.status, input.status));
    if (input?.category) conditions.push(eq(oaAnnouncements.category, input.category));
    if (input?.departmentId) conditions.push(eq(oaAnnouncements.departmentId, input.departmentId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ value: total }]] = await Promise.all([
      db.select().from(oaAnnouncements)
        .where(where)
        .orderBy(desc(oaAnnouncements.isPinned), desc(oaAnnouncements.publishedAt))
        .limit(input?.limit ?? 20)
        .offset(input?.offset ?? 0),
      db.select({ value: count() }).from(oaAnnouncements).where(where),
    ]);
    return { items, total: Number(total) };
  }),

  getAnnouncement: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [ann] = await db.select().from(oaAnnouncements)
      .where(eq(oaAnnouncements.id, toNum(input.id)));
    if (!ann) return null;
    // Increment view count atomically (fire-and-forget)
    db.update(oaAnnouncements)
      .set({ viewCount: sql`coalesce(${oaAnnouncements.viewCount}, 0) + 1` })
      .where(eq(oaAnnouncements.id, ann.id))
      .then(() => {})
      .catch(() => {});
    return ann;
  }),

  createAnnouncement: protectedProcedure.input(z.object({
    title: z.string().min(1).max(300),
    content: z.string().optional(),
    category: z.string().optional(),
    priority: z.enum(["normal", "important", "urgent"]).optional(),
    authorId: z.number().optional(),
    departmentId: z.number().optional(),
    notifyDingtalk: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    expiresAt: z.string().optional(),
    attachments: z.array(z.object({
      name: z.string(),
      url: z.string(),
      type: z.string(),
    })).optional(),
    publish: z.boolean().default(false),
  })).mutation(async ({ input }) => {
    const { publish, ...data } = input;
    return createAnnouncement({
      title: data.title,
      content: data.content,
      category: data.category,
      priority: data.priority,
      authorId: data.authorId,
      departmentId: data.departmentId,
      notifyDingtalk: data.notifyDingtalk,
      isPinned: data.isPinned,
      expiresAt: data.expiresAt,
      attachments: data.attachments,
    }, publish);
  }),

  publishAnnouncement: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [ann] = await db.update(oaAnnouncements)
      .set({
        status: "published",
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(oaAnnouncements.id, toNum(input.id)))
      .returning();
    if (!ann) throw new Error(`Announcement #${input.id} not found`);
    return ann;
  }),
});
