/**
 * Employee Growth Platform Router — 员工成长平台
 *
 * 6 sub-routers, ~50 procedures:
 *   material       (8) — 培训资料库 CRUD + 搜索
 *   stagePlan     (10) — 阶段性培训计划 (入职/3M/6M/12M)
 *   rewardPenalty  (7) — 表彰与处罚管理
 *   taskMetrics    (5) — 任务质量交付指标
 *   cloudHallAccess(8) — 云厅内容授权申请/审批
 *   periodicReport(10) — 周期性报告 (日/周/月/季/年)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  trainingMaterials,
  trainingStagePlans,
  employeeRewardsPenalties,
  employeeTaskMetrics,
  cloudHallAccessGrants,
  employeePeriodicReports,
  MATERIAL_CATEGORIES,
  MATERIAL_DIFFICULTIES,
  LIFECYCLE_STAGES,
  TRAINING_FORMATS,
  STAGE_STATUSES,
  REWARD_PENALTY_TYPES,
  RP_CATEGORIES,
  CONTENT_TYPES,
  GRANT_STATUSES,
  REPORT_TYPES,
  REPORT_STATUSES,
} from "../../drizzle/employee-growth-schema";
import { eq, and, desc, asc, gte, lte, count, sql, like, or, inArray } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("employee-growth");

// ═══════════════════════════════════════════════════════════════
// 1. Material — 培训资料库
// ═══════════════════════════════════════════════════════════════

const materialRouter = router({
  list: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      difficulty: z.string().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { category, difficulty, status, search, page = 1, pageSize = 20 } = input ?? {};
      const conditions = [];
      if (category) conditions.push(eq(trainingMaterials.category, category));
      if (difficulty) conditions.push(eq(trainingMaterials.difficulty, difficulty));
      if (status) conditions.push(eq(trainingMaterials.status, status));
      else conditions.push(eq(trainingMaterials.status, "active"));
      if (search) conditions.push(or(
        like(trainingMaterials.title, `%${search}%`),
        like(trainingMaterials.code, `%${search}%`),
      ));

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [items, [total]] = await Promise.all([
        db.select().from(trainingMaterials).where(where)
          .orderBy(desc(trainingMaterials.createdAt))
          .limit(pageSize).offset((page - 1) * pageSize),
        db.select({ count: count() }).from(trainingMaterials).where(where),
      ]);
      return { items, total: total?.count ?? 0, page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(trainingMaterials).where(eq(trainingMaterials.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Material not found" });
      return row;
    }),

  create: requirePermission("hr:training:manage")
    .input(z.object({
      code: z.string().min(1),
      title: z.string().min(1),
      category: z.enum(MATERIAL_CATEGORIES),
      format: z.string().optional(),
      description: z.string().optional(),
      fileUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      durationMinutes: z.number().optional(),
      difficulty: z.enum(MATERIAL_DIFFICULTIES).optional(),
      tags: z.array(z.string()).optional(),
      targetRoles: z.array(z.string()).optional(),
      targetDepartments: z.array(z.string()).optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [row] = await db.insert(trainingMaterials).values({
        ...input,
        createdBy: ctx.user!.id,
      }).returning();
      log.info({ materialId: row.id, code: input.code }, "Training material created");
      return row;
    }),

  update: requirePermission("hr:training:manage")
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      category: z.string().optional(),
      format: z.string().optional(),
      description: z.string().optional(),
      fileUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      durationMinutes: z.number().optional(),
      difficulty: z.string().optional(),
      tags: z.array(z.string()).optional(),
      targetRoles: z.array(z.string()).optional(),
      targetDepartments: z.array(z.string()).optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [row] = await db.update(trainingMaterials)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(trainingMaterials.id, id)).returning();
      return row;
    }),

  archive: requirePermission("hr:training:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(trainingMaterials)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(trainingMaterials.id, input.id));
      return { success: true };
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(trainingMaterials)
        .where(and(
          eq(trainingMaterials.status, "active"),
          or(
            like(trainingMaterials.title, `%${input.query}%`),
            like(trainingMaterials.code, `%${input.query}%`),
            sql`${trainingMaterials.tags}::text ILIKE ${"%" + input.query + "%"}`,
          ),
        ))
        .orderBy(desc(trainingMaterials.createdAt))
        .limit(input.limit);
    }),

  stats: requirePermission("hr:training:manage")
    .query(async () => {
      const db = await requireDb();
      const rows = await db.select({
        category: trainingMaterials.category,
        count: count(),
      }).from(trainingMaterials)
        .where(eq(trainingMaterials.status, "active"))
        .groupBy(trainingMaterials.category);
      return rows;
    }),

  getCategories: protectedProcedure
    .query(() => MATERIAL_CATEGORIES),
});

// ═══════════════════════════════════════════════════════════════
// 2. StagePlan — 阶段性培训计划
// ═══════════════════════════════════════════════════════════════

const stagePlanRouter = router({
  getMyPlans: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select().from(trainingStagePlans)
        .where(eq(trainingStagePlans.userId, ctx.user!.id))
        .orderBy(asc(trainingStagePlans.dueDate));
    }),

  getByEmployee: requirePermission("hr:training:manage")
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(trainingStagePlans)
        .where(eq(trainingStagePlans.employeeId, input.employeeId))
        .orderBy(asc(trainingStagePlans.dueDate));
    }),

  create: requirePermission("hr:training:manage")
    .input(z.object({
      employeeId: z.number(),
      userId: z.number(),
      lifecycleStage: z.enum(LIFECYCLE_STAGES),
      planName: z.string().min(1),
      dueDate: z.string(),
      triggerDate: z.string(),
      trainingFormat: z.enum(TRAINING_FORMATS).optional(),
      materialIds: z.array(z.number()).optional(),
      prerequisiteKpiScore: z.number().optional(),
      prerequisiteCapabilityLevel: z.number().optional(),
      completionCriteria: z.object({
        testRequired: z.boolean(),
        minScore: z.number().optional(),
        managerApproval: z.boolean(),
        selfStudyHours: z.number().optional(),
      }).optional(),
      testId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [row] = await db.insert(trainingStagePlans).values({
        ...input,
        createdBy: ctx.user!.id,
      }).returning();
      log.info({ planId: row.id, stage: input.lifecycleStage, employeeId: input.employeeId }, "Stage plan created");
      return row;
    }),

  bulkCreateOnboarding: requirePermission("hr:training:manage")
    .input(z.object({
      employeeId: z.number(),
      userId: z.number(),
      employeeName: z.string(),
      hireDate: z.string(),
      role: z.string().optional(),
      department: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const hire = new Date(input.hireDate);
      const addDays = (d: Date, days: number) => {
        const r = new Date(d);
        r.setDate(r.getDate() + days);
        return r.toISOString().slice(0, 10);
      };

      const stages: Array<{
        lifecycleStage: string;
        planName: string;
        triggerDate: string;
        dueDate: string;
        trainingFormat: string;
      }> = [
        {
          lifecycleStage: "onboarding",
          planName: `${input.employeeName} — 入职培训`,
          triggerDate: input.hireDate,
          dueDate: addDays(hire, 14),
          trainingFormat: "blended",
        },
        {
          lifecycleStage: "3_month",
          planName: `${input.employeeName} — 3个月岗位技能培训`,
          triggerDate: addDays(hire, 90),
          dueDate: addDays(hire, 104),
          trainingFormat: "blended",
        },
        {
          lifecycleStage: "6_month",
          planName: `${input.employeeName} — 6个月专业深化培训`,
          triggerDate: addDays(hire, 180),
          dueDate: addDays(hire, 194),
          trainingFormat: "online",
        },
        {
          lifecycleStage: "12_month",
          planName: `${input.employeeName} — 12个月综合评估与进阶培训`,
          triggerDate: addDays(hire, 365),
          dueDate: addDays(hire, 379),
          trainingFormat: "blended",
        },
      ];

      const rows = await db.insert(trainingStagePlans).values(
        stages.map((s) => ({
          ...s,
          employeeId: input.employeeId,
          userId: input.userId,
          status: "pending" as const,
          completionCriteria: { testRequired: true, minScore: 60, managerApproval: true },
          createdBy: ctx.user!.id,
        })),
      ).returning();

      log.info({ employeeId: input.employeeId, count: rows.length }, "Bulk onboarding stage plans created");
      return rows;
    }),

  updateStatus: requirePermission("hr:training:manage")
    .input(z.object({
      id: z.number(),
      status: z.enum(STAGE_STATUSES),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const updates: Record<string, unknown> = { status: input.status, updatedAt: new Date() };
      if (input.notes) updates.notes = input.notes;
      if (input.status === "completed") updates.completedAt = new Date();
      const [row] = await db.update(trainingStagePlans)
        .set(updates)
        .where(eq(trainingStagePlans.id, input.id)).returning();
      return row;
    }),

  submitTest: protectedProcedure
    .input(z.object({
      id: z.number(),
      testScore: z.number().min(0).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [plan] = await db.select().from(trainingStagePlans)
        .where(and(eq(trainingStagePlans.id, input.id), eq(trainingStagePlans.userId, ctx.user!.id)))
        .limit(1);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });

      const minScore = (plan.completionCriteria as { minScore?: number })?.minScore ?? 60;
      const passed = input.testScore >= minScore;

      const [row] = await db.update(trainingStagePlans).set({
        testScore: input.testScore,
        testPassed: passed,
        updatedAt: new Date(),
      }).where(eq(trainingStagePlans.id, input.id)).returning();

      log.info({ planId: input.id, score: input.testScore, passed }, "Stage plan test submitted");
      return row;
    }),

  supervisorSignoff: requirePermission("hr:training:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [row] = await db.update(trainingStagePlans).set({
        supervisorSignoff: ctx.user!.id,
        supervisorSignoffAt: new Date(),
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(trainingStagePlans.id, input.id)).returning();
      return row;
    }),

  getUpcoming: requirePermission("hr:training:manage")
    .input(z.object({ daysAhead: z.number().default(30) }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const days = input?.daysAhead ?? 30;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      return db.select().from(trainingStagePlans)
        .where(and(
          inArray(trainingStagePlans.status, ["pending", "active"]),
          lte(trainingStagePlans.dueDate, futureDate.toISOString().slice(0, 10)),
        ))
        .orderBy(asc(trainingStagePlans.dueDate))
        .limit(100);
    }),

  getOverview: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      const rows = await db.select({
        status: trainingStagePlans.status,
        stage: trainingStagePlans.lifecycleStage,
        count: count(),
      }).from(trainingStagePlans)
        .groupBy(trainingStagePlans.status, trainingStagePlans.lifecycleStage);
      return rows;
    }),
});

// ═══════════════════════════════════════════════════════════════
// 3. RewardPenalty — 表彰与处罚
// ═══════════════════════════════════════════════════════════════

const rewardPenaltyRouter = router({
  list: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
      type: z.enum(REWARD_PENALTY_TYPES).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { type, startDate, endDate, page = 1, pageSize = 20 } = input ?? {};
      const targetUserId = input?.userId ?? ctx.user!.id;
      const conditions = [eq(employeeRewardsPenalties.userId, targetUserId)];
      if (type) conditions.push(eq(employeeRewardsPenalties.type, type));
      if (startDate) conditions.push(gte(employeeRewardsPenalties.issuedAt, startDate));
      if (endDate) conditions.push(lte(employeeRewardsPenalties.issuedAt, endDate));

      const where = and(...conditions);
      const [items, [total]] = await Promise.all([
        db.select().from(employeeRewardsPenalties).where(where)
          .orderBy(desc(employeeRewardsPenalties.issuedAt))
          .limit(pageSize).offset((page - 1) * pageSize),
        db.select({ count: count() }).from(employeeRewardsPenalties).where(where),
      ]);
      return { items, total: total?.count ?? 0, page, pageSize };
    }),

  create: requirePermission("hr:performance:manage")
    .input(z.object({
      userId: z.number(),
      employeeId: z.number().optional(),
      type: z.enum(REWARD_PENALTY_TYPES),
      category: z.enum(RP_CATEGORIES),
      title: z.string().min(1),
      description: z.string().optional(),
      severity: z.string().optional(),
      amount: z.number().optional(),
      sourceType: z.string().optional(),
      sourceId: z.number().optional(),
      issuedAt: z.string(),
      period: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [row] = await db.insert(employeeRewardsPenalties).values({
        ...input,
        issuedBy: ctx.user!.id,
        period: input.period ?? input.issuedAt.slice(0, 7),
      }).returning();
      log.info({ id: row.id, type: input.type, userId: input.userId }, "Reward/penalty created");
      return row;
    }),

  getByEmployee: protectedProcedure
    .input(z.object({ userId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const targetId = input?.userId ?? ctx.user!.id;
      return db.select().from(employeeRewardsPenalties)
        .where(eq(employeeRewardsPenalties.userId, targetId))
        .orderBy(desc(employeeRewardsPenalties.issuedAt))
        .limit(200);
    }),

  getSummary: protectedProcedure
    .input(z.object({ userId: z.number().optional(), year: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const targetId = input?.userId ?? ctx.user!.id;
      const yearPrefix = input?.year ?? new Date().getFullYear().toString();
      const rows = await db.select().from(employeeRewardsPenalties)
        .where(and(
          eq(employeeRewardsPenalties.userId, targetId),
          like(employeeRewardsPenalties.period, `${yearPrefix}%`),
          eq(employeeRewardsPenalties.status, "active"),
        ));

      const rewards = rows.filter((r) => r.type === "reward");
      const penalties = rows.filter((r) => r.type === "penalty");
      return {
        totalRewards: rewards.length,
        totalPenalties: penalties.length,
        rewardAmount: rewards.reduce((s, r) => s + (r.amount ?? 0), 0),
        penaltyAmount: penalties.reduce((s, r) => s + (r.amount ?? 0), 0),
        netAmount: rewards.reduce((s, r) => s + (r.amount ?? 0), 0) - penalties.reduce((s, r) => s + (r.amount ?? 0), 0),
        byCategory: Object.fromEntries(
          RP_CATEGORIES.map((c) => [c, rows.filter((r) => r.category === c).length]),
        ),
      };
    }),

  appeal: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(employeeRewardsPenalties)
        .where(and(eq(employeeRewardsPenalties.id, input.id), eq(employeeRewardsPenalties.userId, ctx.user!.id)))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.type !== "penalty") throw new TRPCError({ code: "BAD_REQUEST", message: "Can only appeal penalties" });

      const [updated] = await db.update(employeeRewardsPenalties).set({
        status: "appealed",
        appealReason: input.reason,
        updatedAt: new Date(),
      }).where(eq(employeeRewardsPenalties.id, input.id)).returning();
      return updated;
    }),

  revoke: requirePermission("hr:performance:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(employeeRewardsPenalties).set({
        status: "revoked",
        updatedAt: new Date(),
      }).where(eq(employeeRewardsPenalties.id, input.id));
      return { success: true };
    }),

  getMonthly: protectedProcedure
    .input(z.object({ userId: z.number().optional(), period: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const targetId = input.userId ?? ctx.user!.id;
      return db.select().from(employeeRewardsPenalties)
        .where(and(
          eq(employeeRewardsPenalties.userId, targetId),
          eq(employeeRewardsPenalties.period, input.period),
        ))
        .orderBy(desc(employeeRewardsPenalties.issuedAt));
    }),
});

// ═══════════════════════════════════════════════════════════════
// 4. TaskMetrics — 任务质量交付指标
// ═══════════════════════════════════════════════════════════════

const taskMetricsRouter = router({
  getByEmployee: protectedProcedure
    .input(z.object({ userId: z.number().optional(), limit: z.number().default(12) }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const targetId = input.userId ?? ctx.user!.id;
      return db.select().from(employeeTaskMetrics)
        .where(eq(employeeTaskMetrics.userId, targetId))
        .orderBy(desc(employeeTaskMetrics.period))
        .limit(input.limit);
    }),

  getMonthly: requirePermission("hr:performance:manage")
    .input(z.object({ period: z.string(), page: z.number().default(1), pageSize: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [items, [total]] = await Promise.all([
        db.select().from(employeeTaskMetrics)
          .where(eq(employeeTaskMetrics.period, input.period))
          .orderBy(desc(employeeTaskMetrics.avgQualityScore))
          .limit(input.pageSize).offset((input.page - 1) * input.pageSize),
        db.select({ count: count() }).from(employeeTaskMetrics)
          .where(eq(employeeTaskMetrics.period, input.period)),
      ]);
      return { items, total: total?.count ?? 0 };
    }),

  upsert: requirePermission("hr:performance:manage")
    .input(z.object({
      userId: z.number(),
      employeeId: z.number().optional(),
      period: z.string(),
      tasksAssigned: z.number().default(0),
      tasksCompleted: z.number().default(0),
      tasksOnTime: z.number().default(0),
      tasksLate: z.number().default(0),
      tasksOverdue: z.number().default(0),
      avgQualityScore: z.number().optional(),
      avgDeliveryDays: z.number().optional(),
      defectCount: z.number().default(0),
      reworkCount: z.number().default(0),
      customerSatisfactionAvg: z.number().optional(),
      projectContributions: z.array(z.object({
        projectId: z.number(),
        projectName: z.string(),
        role: z.string(),
        hours: z.number(),
        deliverables: z.number(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [existing] = await db.select().from(employeeTaskMetrics)
        .where(and(
          eq(employeeTaskMetrics.userId, input.userId),
          eq(employeeTaskMetrics.period, input.period),
        )).limit(1);

      if (existing) {
        const [row] = await db.update(employeeTaskMetrics)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(employeeTaskMetrics.id, existing.id)).returning();
        return row;
      }
      const [row] = await db.insert(employeeTaskMetrics).values(input).returning();
      return row;
    }),

  getDashboard: requirePermission("hr:performance:manage")
    .input(z.object({ period: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(employeeTaskMetrics)
        .where(eq(employeeTaskMetrics.period, input.period));

      const total = rows.length;
      if (total === 0) return { total: 0, avgCompletion: 0, avgOnTime: 0, avgQuality: 0, avgDefects: 0 };
      return {
        total,
        avgCompletion: rows.reduce((s, r) => s + (r.tasksCompleted ?? 0), 0) / Math.max(rows.reduce((s, r) => s + (r.tasksAssigned ?? 0), 0), 1) * 100,
        avgOnTime: rows.reduce((s, r) => s + (r.tasksOnTime ?? 0), 0) / Math.max(rows.reduce((s, r) => s + (r.tasksCompleted ?? 0), 0), 1) * 100,
        avgQuality: rows.reduce((s, r) => s + (r.avgQualityScore ?? 0), 0) / total,
        avgDefects: rows.reduce((s, r) => s + (r.defectCount ?? 0), 0) / total,
      };
    }),

  getTrend: protectedProcedure
    .input(z.object({ userId: z.number().optional(), months: z.number().default(12) }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const targetId = input.userId ?? ctx.user!.id;
      return db.select().from(employeeTaskMetrics)
        .where(eq(employeeTaskMetrics.userId, targetId))
        .orderBy(asc(employeeTaskMetrics.period))
        .limit(input.months);
    }),
});

// ═══════════════════════════════════════════════════════════════
// 5. CloudHallAccess — 云厅内容授权
// ═══════════════════════════════════════════════════════════════

const cloudHallAccessRouter = router({
  requestAccess: protectedProcedure
    .input(z.object({
      contentType: z.enum(CONTENT_TYPES),
      contentId: z.number(),
      contentTitle: z.string().optional(),
      requestReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [existing] = await db.select().from(cloudHallAccessGrants)
        .where(and(
          eq(cloudHallAccessGrants.userId, ctx.user!.id),
          eq(cloudHallAccessGrants.contentId, input.contentId),
        )).limit(1);

      if (existing && existing.grantStatus === "approved") {
        return existing;
      }

      if (existing) {
        const [row] = await db.update(cloudHallAccessGrants).set({
          grantStatus: "pending",
          requestReason: input.requestReason,
          requestedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(cloudHallAccessGrants.id, existing.id)).returning();
        return row;
      }

      const [row] = await db.insert(cloudHallAccessGrants).values({
        userId: ctx.user!.id,
        ...input,
      }).returning();
      log.info({ userId: ctx.user!.id, contentId: input.contentId }, "Cloud hall access requested");
      return row;
    }),

  listMyGrants: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select().from(cloudHallAccessGrants)
        .where(eq(cloudHallAccessGrants.userId, ctx.user!.id))
        .orderBy(desc(cloudHallAccessGrants.requestedAt));
    }),

  listPending: requirePermission("hr:training:manage")
    .query(async () => {
      const db = await requireDb();
      return db.select().from(cloudHallAccessGrants)
        .where(eq(cloudHallAccessGrants.grantStatus, "pending"))
        .orderBy(asc(cloudHallAccessGrants.requestedAt))
        .limit(100);
    }),

  approve: requirePermission("hr:training:manage")
    .input(z.object({
      id: z.number(),
      validDays: z.number().default(365),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const now = new Date();
      const until = new Date(now);
      until.setDate(until.getDate() + input.validDays);
      const [row] = await db.update(cloudHallAccessGrants).set({
        grantStatus: "approved",
        approvedBy: ctx.user!.id,
        approvedAt: now,
        validFrom: now,
        validUntil: until,
        updatedAt: now,
      }).where(eq(cloudHallAccessGrants.id, input.id)).returning();
      return row;
    }),

  reject: requirePermission("hr:training:manage")
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [row] = await db.update(cloudHallAccessGrants).set({
        grantStatus: "rejected",
        approvedBy: ctx.user!.id,
        rejectedReason: input.reason,
        updatedAt: new Date(),
      }).where(eq(cloudHallAccessGrants.id, input.id)).returning();
      return row;
    }),

  revoke: requirePermission("hr:training:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(cloudHallAccessGrants).set({
        grantStatus: "revoked",
        updatedAt: new Date(),
      }).where(eq(cloudHallAccessGrants.id, input.id));
      return { success: true };
    }),

  getAccessibleContent: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select().from(cloudHallAccessGrants)
        .where(and(
          eq(cloudHallAccessGrants.userId, ctx.user!.id),
          eq(cloudHallAccessGrants.grantStatus, "approved"),
        ))
        .orderBy(desc(cloudHallAccessGrants.approvedAt));
    }),

  logAccess: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(cloudHallAccessGrants).set({
        viewCount: sql`${cloudHallAccessGrants.viewCount} + 1`,
        lastAccessedAt: new Date(),
      }).where(and(
        eq(cloudHallAccessGrants.id, input.id),
        eq(cloudHallAccessGrants.userId, ctx.user!.id),
      ));
      return { success: true };
    }),
});

// ═══════════════════════════════════════════════════════════════
// 6. PeriodicReport — 周期性报告 (日/周/月/季/年)
// ═══════════════════════════════════════════════════════════════

const periodicReportRouter = router({
  getOrCreate: protectedProcedure
    .input(z.object({
      reportType: z.enum(REPORT_TYPES),
      period: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const [existing] = await db.select().from(employeePeriodicReports)
        .where(and(
          eq(employeePeriodicReports.userId, ctx.user!.id),
          eq(employeePeriodicReports.reportType, input.reportType),
          eq(employeePeriodicReports.period, input.period),
        )).limit(1);

      if (existing) return existing;

      // Auto-create empty report
      const title = generateReportTitle(input.reportType, input.period);
      const [row] = await db.insert(employeePeriodicReports).values({
        userId: ctx.user!.id,
        reportType: input.reportType,
        period: input.period,
        title,
        status: "draft",
      }).returning();
      return row;
    }),

  submitDaily: protectedProcedure
    .input(z.object({
      period: z.string(),
      plannedItems: z.array(z.object({
        title: z.string(),
        priority: z.string(),
        estimatedHours: z.number(),
      })).optional(),
      completedItems: z.array(z.object({
        title: z.string(),
        status: z.enum(["done", "partial", "not_started", "carried_over"]),
        actualHours: z.number(),
        qualityRating: z.number().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const completed = input.completedItems ?? [];
      const planned = input.plannedItems ?? [];
      const doneCount = completed.filter((c) => c.status === "done").length;
      const completionRate = planned.length > 0 ? (doneCount / planned.length) * 100 : 0;

      const [existing] = await db.select().from(employeePeriodicReports)
        .where(and(
          eq(employeePeriodicReports.userId, ctx.user!.id),
          eq(employeePeriodicReports.reportType, "daily"),
          eq(employeePeriodicReports.period, input.period),
        )).limit(1);

      const data = {
        plannedItems: input.plannedItems,
        completedItems: input.completedItems,
        completionRate,
        status: "submitted" as const,
        updatedAt: new Date(),
      };

      if (existing) {
        const [row] = await db.update(employeePeriodicReports)
          .set(data)
          .where(eq(employeePeriodicReports.id, existing.id)).returning();
        return row;
      }

      const [row] = await db.insert(employeePeriodicReports).values({
        userId: ctx.user!.id,
        reportType: "daily",
        period: input.period,
        title: generateReportTitle("daily", input.period),
        ...data,
      }).returning();
      return row;
    }),

  submitWeekly: protectedProcedure
    .input(z.object({
      period: z.string(),
      keyAccomplishments: z.array(z.string()),
      challenges: z.array(z.string()).optional(),
      nextPeriodGoals: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [existing] = await db.select().from(employeePeriodicReports)
        .where(and(
          eq(employeePeriodicReports.userId, ctx.user!.id),
          eq(employeePeriodicReports.reportType, "weekly"),
          eq(employeePeriodicReports.period, input.period),
        )).limit(1);

      const data = {
        keyAccomplishments: input.keyAccomplishments,
        challenges: input.challenges,
        nextPeriodGoals: input.nextPeriodGoals,
        status: "submitted" as const,
        updatedAt: new Date(),
      };

      if (existing) {
        const [row] = await db.update(employeePeriodicReports).set(data)
          .where(eq(employeePeriodicReports.id, existing.id)).returning();
        return row;
      }

      const [row] = await db.insert(employeePeriodicReports).values({
        userId: ctx.user!.id,
        reportType: "weekly",
        period: input.period,
        title: generateReportTitle("weekly", input.period),
        ...data,
      }).returning();
      return row;
    }),

  saveReport: protectedProcedure
    .input(z.object({
      id: z.number(),
      plannedItems: z.array(z.any()).optional(),
      completedItems: z.array(z.any()).optional(),
      keyAccomplishments: z.array(z.string()).optional(),
      challenges: z.array(z.string()).optional(),
      nextPeriodGoals: z.array(z.string()).optional(),
      kpiSummaryJson: z.array(z.any()).optional(),
      status: z.enum(REPORT_STATUSES).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [row] = await db.update(employeePeriodicReports)
        .set({ ...data, updatedAt: new Date() })
        .where(and(
          eq(employeePeriodicReports.id, id),
          eq(employeePeriodicReports.userId, ctx.user!.id),
        )).returning();
      return row;
    }),

  listHistory: protectedProcedure
    .input(z.object({
      reportType: z.enum(REPORT_TYPES),
      userId: z.number().optional(),
      year: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const targetId = input.userId ?? ctx.user!.id;
      const conditions = [
        eq(employeePeriodicReports.userId, targetId),
        eq(employeePeriodicReports.reportType, input.reportType),
      ];
      if (input.year) {
        conditions.push(like(employeePeriodicReports.period, `${input.year}%`));
      }

      const where = and(...conditions);
      const [items, [total]] = await Promise.all([
        db.select().from(employeePeriodicReports).where(where)
          .orderBy(desc(employeePeriodicReports.period))
          .limit(input.pageSize).offset((input.page - 1) * input.pageSize),
        db.select({ count: count() }).from(employeePeriodicReports).where(where),
      ]);
      return { items, total: total?.count ?? 0, page: input.page, pageSize: input.pageSize };
    }),

  managerReview: requirePermission("hr:performance:manage")
    .input(z.object({
      id: z.number(),
      comments: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [row] = await db.update(employeePeriodicReports).set({
        reviewedBy: ctx.user!.id,
        reviewedAt: new Date(),
        managerComments: input.comments,
        status: "reviewed",
        updatedAt: new Date(),
      }).where(eq(employeePeriodicReports.id, input.id)).returning();
      return row;
    }),

  getYears: protectedProcedure
    .input(z.object({ userId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const targetId = input?.userId ?? ctx.user!.id;
      const rows = await db.selectDistinct({ period: employeePeriodicReports.period })
        .from(employeePeriodicReports)
        .where(eq(employeePeriodicReports.userId, targetId));
      const years = [...new Set(rows.map((r) => r.period.slice(0, 4)))].sort().reverse();
      return years;
    }),

  getReportTypes: protectedProcedure
    .query(() => REPORT_TYPES),

  // Get enriched monthly report with data from multiple sources
  getEnrichedMonthly: protectedProcedure
    .input(z.object({ period: z.string(), userId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const targetId = input.userId ?? ctx.user!.id;

      // Parallel fetch: report + task metrics + rewards/penalties
      const [report, metrics, rp] = await Promise.all([
        db.select().from(employeePeriodicReports).where(and(
          eq(employeePeriodicReports.userId, targetId),
          eq(employeePeriodicReports.reportType, "monthly"),
          eq(employeePeriodicReports.period, input.period),
        )).limit(1).then((r) => r[0]),

        db.select().from(employeeTaskMetrics).where(and(
          eq(employeeTaskMetrics.userId, targetId),
          eq(employeeTaskMetrics.period, input.period),
        )).limit(1).then((r) => r[0]),

        db.select().from(employeeRewardsPenalties).where(and(
          eq(employeeRewardsPenalties.userId, targetId),
          eq(employeeRewardsPenalties.period, input.period),
        )),
      ]);

      return {
        report,
        taskMetrics: metrics ?? null,
        rewardsPenalties: rp,
        rewardSummary: {
          rewards: rp.filter((r) => r.type === "reward").length,
          penalties: rp.filter((r) => r.type === "penalty").length,
        },
      };
    }),
});

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

function generateReportTitle(type: string, period: string): string {
  const labels: Record<string, string> = {
    daily: "日报",
    weekly: "周报",
    monthly: "月度报告",
    quarterly: "季度报告",
    annual: "年度报告",
  };
  return `${labels[type] ?? "报告"} — ${period}`;
}

// ═══════════════════════════════════════════════════════════════
// Main Router Export
// ═══════════════════════════════════════════════════════════════

export const employeeGrowthRouter = router({
  material: materialRouter,
  stagePlan: stagePlanRouter,
  rewardPenalty: rewardPenaltyRouter,
  taskMetrics: taskMetricsRouter,
  cloudHallAccess: cloudHallAccessRouter,
  periodicReport: periodicReportRouter,
});
