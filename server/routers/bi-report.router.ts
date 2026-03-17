/**
 * BI Report Router — 综合报告平台
 *
 * 4 sub-routers, ~22 procedures:
 *   period (5):     create, list, get, publish, archive
 *   department (5): upsert, getByPeriod, getHorizontalComparison, getByDept, generateAiEval
 *   individual (6): upsert, getByPeriod, getByUser, getByDept, getRankings, generateAiEval
 *   access (6):     grant, revoke, listRules, checkAccess, listMyReports, getAccessibleDepts
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";
import {
  biReportPeriods,
  biDepartmentMetrics,
  biIndividualMetrics,
  biReportAccessRules,
} from "../../drizzle/bi-report-schema";
import { users } from "../../drizzle/schema";
import { submitTask } from "../services/task-worker.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("bi-report");

const viewBI = requirePermission("bi:report:view");
const manageBI = requirePermission("bi:report:manage");

const periodTypeSchema = z.enum(["weekly", "monthly", "quarterly", "yearly"]);

// ══════════════════════════════════════════════════════
// Period Sub-Router — 报告周期管理
// ══════════════════════════════════════════════════════

const periodRouter = router({
  /** Create a new report period */
  create: manageBI
    .input(z.object({
      periodType: periodTypeSchema,
      periodLabel: z.string().min(1).max(20),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.insert(biReportPeriods).values({
        periodType: input.periodType,
        periodLabel: input.periodLabel,
        startDate: input.startDate,
        endDate: input.endDate,
        generatedBy: ctx.user!.id,
      }).returning();
      log.info({ periodLabel: input.periodLabel, periodType: input.periodType }, "BI report period created");
      return row;
    }),

  /** List report periods */
  list: viewBI
    .input(z.object({
      periodType: periodTypeSchema.optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.periodType) conditions.push(eq(biReportPeriods.periodType, input.periodType));

      const query = db.select().from(biReportPeriods);
      const rows = conditions.length > 0
        ? await query.where(and(...conditions)).orderBy(desc(biReportPeriods.createdAt)).limit(input.limit ?? 50)
        : await query.orderBy(desc(biReportPeriods.createdAt)).limit(input.limit ?? 50);
      return rows;
    }),

  /** Get single period with stats */
  get: viewBI
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(biReportPeriods)
        .where(eq(biReportPeriods.id, input.id)).limit(1);
      return row ?? null;
    }),

  /** Publish report — triggers AI summary generation */
  publish: manageBI
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // Trigger AI executive summary generation
      const result = await submitTask("BI_EXECUTIVE_SUMMARY", {
        reportPeriodId: input.id,
      }, String(ctx.user!.id));

      const [row] = await db.update(biReportPeriods)
        .set({ status: "generating", generationTaskId: result.taskId, updatedAt: new Date().toISOString() })
        .where(eq(biReportPeriods.id, input.id))
        .returning();

      log.info({ reportPeriodId: input.id, taskId: result.taskId }, "BI report publishing triggered");
      return { ...row, taskId: result.taskId };
    }),

  /** Archive old report */
  archive: manageBI
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.update(biReportPeriods)
        .set({ status: "archived", updatedAt: new Date().toISOString() })
        .where(eq(biReportPeriods.id, input.id))
        .returning();
      return row;
    }),
});

// ══════════════════════════════════════════════════════
// Department Sub-Router — 部门聚合指标
// ══════════════════════════════════════════════════════

const departmentRouter = router({
  /** Upsert department metrics */
  upsert: manageBI
    .input(z.object({
      reportPeriodId: z.number(),
      departmentCode: z.string().min(1),
      departmentName: z.string().min(1),
      departmentType: z.string().optional(),
      targetRevenue: z.string().optional(),
      actualRevenue: z.string().optional(),
      rewardCount: z.number().int().optional(),
      penaltyCount: z.number().int().optional(),
      rewardAmount: z.string().optional(),
      penaltyAmount: z.string().optional(),
      planTotal: z.number().int().optional(),
      planCompleted: z.number().int().optional(),
      trainingSessions: z.number().int().optional(),
      trainingAttendees: z.number().int().optional(),
      trainingQualityScore: z.string().optional(),
      headcount: z.number().int().optional(),
      activeProjects: z.number().int().optional(),
      buCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Compute achievement rates
      const targetRev = parseFloat(input.targetRevenue ?? "0");
      const actualRev = parseFloat(input.actualRevenue ?? "0");
      const achievementRate = targetRev > 0 ? ((actualRev / targetRev) * 100).toFixed(2) : null;

      const planTotal = input.planTotal ?? 0;
      const planCompleted = input.planCompleted ?? 0;
      const planAchievementRate = planTotal > 0 ? ((planCompleted / planTotal) * 100).toFixed(2) : null;

      const values = {
        reportPeriodId: input.reportPeriodId,
        departmentCode: input.departmentCode,
        departmentName: input.departmentName,
        departmentType: input.departmentType ?? null,
        targetRevenue: input.targetRevenue ?? null,
        actualRevenue: input.actualRevenue ?? null,
        achievementRate,
        rewardCount: input.rewardCount ?? 0,
        penaltyCount: input.penaltyCount ?? 0,
        rewardAmount: input.rewardAmount ?? "0",
        penaltyAmount: input.penaltyAmount ?? "0",
        planTotal,
        planCompleted,
        planAchievementRate,
        trainingSessions: input.trainingSessions ?? 0,
        trainingAttendees: input.trainingAttendees ?? 0,
        trainingQualityScore: input.trainingQualityScore ?? null,
        headcount: input.headcount ?? 0,
        activeProjects: input.activeProjects ?? 0,
        buCode: input.buCode ?? null,
      };

      const [row] = await db.insert(biDepartmentMetrics)
        .values(values)
        .onConflictDoUpdate({
          target: [biDepartmentMetrics.reportPeriodId, biDepartmentMetrics.departmentCode],
          set: values,
        })
        .returning();

      return row;
    }),

  /** Get all department metrics for a period — 横向对比 */
  getByPeriod: viewBI
    .input(z.object({
      reportPeriodId: z.number(),
      buCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [eq(biDepartmentMetrics.reportPeriodId, input.reportPeriodId)];
      if (input.buCode) conditions.push(eq(biDepartmentMetrics.buCode, input.buCode));

      const rows = await db.select().from(biDepartmentMetrics)
        .where(and(...conditions))
        .orderBy(desc(biDepartmentMetrics.achievementRate))
        .limit(100);
      return rows;
    }),

  /** Horizontal comparison — cross-department ranked by metric */
  getHorizontalComparison: viewBI
    .input(z.object({
      reportPeriodId: z.number(),
      sortBy: z.enum(["achievement_rate", "plan_achievement_rate", "training_quality_score"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const sortCol = input.sortBy === "plan_achievement_rate"
        ? biDepartmentMetrics.planAchievementRate
        : input.sortBy === "training_quality_score"
        ? biDepartmentMetrics.trainingQualityScore
        : biDepartmentMetrics.achievementRate;

      const rows = await db.select().from(biDepartmentMetrics)
        .where(eq(biDepartmentMetrics.reportPeriodId, input.reportPeriodId))
        .orderBy(desc(sortCol))
        .limit(50);
      return rows;
    }),

  /** Get single department detail */
  getByDept: viewBI
    .input(z.object({
      reportPeriodId: z.number(),
      departmentCode: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(biDepartmentMetrics)
        .where(and(
          eq(biDepartmentMetrics.reportPeriodId, input.reportPeriodId),
          eq(biDepartmentMetrics.departmentCode, input.departmentCode),
        ))
        .limit(1);
      return row ?? null;
    }),

  /** Generate AI evaluation for a department */
  generateAiEval: manageBI
    .input(z.object({
      reportPeriodId: z.number(),
      departmentCode: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await submitTask("BI_DEPT_AI_EVAL", {
        reportPeriodId: input.reportPeriodId,
        departmentCode: input.departmentCode,
      }, String(ctx.user!.id));
      log.info({ ...input, taskId: result.taskId }, "BI department AI evaluation triggered");
      return { taskId: result.taskId, status: "generating" };
    }),
});

// ══════════════════════════════════════════════════════
// Individual Sub-Router — 个人绩效指标
// ══════════════════════════════════════════════════════

const individualRouter = router({
  /** Upsert individual metrics */
  upsert: manageBI
    .input(z.object({
      reportPeriodId: z.number(),
      userId: z.number(),
      userName: z.string().optional(),
      departmentCode: z.string(),
      departmentName: z.string().optional(),
      position: z.string().optional(),
      targetValue: z.string().optional(),
      actualValue: z.string().optional(),
      rewards: z.array(z.object({ title: z.string(), amount: z.number(), date: z.string() })).optional(),
      penalties: z.array(z.object({ title: z.string(), amount: z.number(), date: z.string() })).optional(),
      planItemsTotal: z.number().int().optional(),
      planItemsCompleted: z.number().int().optional(),
      trainingAttended: z.number().int().optional(),
      trainingHours: z.string().optional(),
      trainingScore: z.string().optional(),
      kpiScore: z.string().optional(),
      buCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const targetVal = parseFloat(input.targetValue ?? "0");
      const actualVal = parseFloat(input.actualValue ?? "0");
      const achievementRate = targetVal > 0 ? ((actualVal / targetVal) * 100).toFixed(2) : null;

      const planTotal = input.planItemsTotal ?? 0;
      const planCompleted = input.planItemsCompleted ?? 0;
      const planAchievementRate = planTotal > 0 ? ((planCompleted / planTotal) * 100).toFixed(2) : null;

      const values = {
        reportPeriodId: input.reportPeriodId,
        userId: input.userId,
        userName: input.userName ?? null,
        departmentCode: input.departmentCode,
        departmentName: input.departmentName ?? null,
        position: input.position ?? null,
        targetValue: input.targetValue ?? null,
        actualValue: input.actualValue ?? null,
        achievementRate,
        rewards: input.rewards ?? null,
        penalties: input.penalties ?? null,
        planItemsTotal: planTotal,
        planItemsCompleted: planCompleted,
        planAchievementRate,
        trainingAttended: input.trainingAttended ?? 0,
        trainingHours: input.trainingHours ?? "0",
        trainingScore: input.trainingScore ?? null,
        kpiScore: input.kpiScore ?? null,
        buCode: input.buCode ?? null,
      };

      const [row] = await db.insert(biIndividualMetrics)
        .values(values)
        .onConflictDoUpdate({
          target: [biIndividualMetrics.reportPeriodId, biIndividualMetrics.userId],
          set: values,
        })
        .returning();

      return row;
    }),

  /** Get all individuals for a period */
  getByPeriod: viewBI
    .input(z.object({
      reportPeriodId: z.number(),
      departmentCode: z.string().optional(),
      buCode: z.string().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [eq(biIndividualMetrics.reportPeriodId, input.reportPeriodId)];
      if (input.departmentCode) conditions.push(eq(biIndividualMetrics.departmentCode, input.departmentCode));
      if (input.buCode) conditions.push(eq(biIndividualMetrics.buCode, input.buCode));

      const rows = await db.select().from(biIndividualMetrics)
        .where(and(...conditions))
        .orderBy(desc(biIndividualMetrics.kpiScore))
        .limit(input.limit ?? 200);
      return rows;
    }),

  /** Get single user's metrics */
  getByUser: protectedProcedure
    .input(z.object({
      reportPeriodId: z.number(),
      userId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(biIndividualMetrics)
        .where(and(
          eq(biIndividualMetrics.reportPeriodId, input.reportPeriodId),
          eq(biIndividualMetrics.userId, input.userId),
        ))
        .limit(1);
      return row ?? null;
    }),

  /** Get department member list — 纵向分析 */
  getByDept: viewBI
    .input(z.object({
      reportPeriodId: z.number(),
      departmentCode: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(biIndividualMetrics)
        .where(and(
          eq(biIndividualMetrics.reportPeriodId, input.reportPeriodId),
          eq(biIndividualMetrics.departmentCode, input.departmentCode),
        ))
        .orderBy(asc(biIndividualMetrics.rankInDepartment))
        .limit(200);
      return rows;
    }),

  /** Get overall rankings */
  getRankings: viewBI
    .input(z.object({
      reportPeriodId: z.number(),
      sortBy: z.enum(["kpi_score", "achievement_rate", "plan_achievement_rate"]).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const sortCol = input.sortBy === "achievement_rate"
        ? biIndividualMetrics.achievementRate
        : input.sortBy === "plan_achievement_rate"
        ? biIndividualMetrics.planAchievementRate
        : biIndividualMetrics.kpiScore;

      const rows = await db.select().from(biIndividualMetrics)
        .where(eq(biIndividualMetrics.reportPeriodId, input.reportPeriodId))
        .orderBy(desc(sortCol))
        .limit(input.limit ?? 50);
      return rows;
    }),

  /** Generate AI coordinated evaluation for a user */
  generateAiEval: manageBI
    .input(z.object({
      reportPeriodId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await submitTask("BI_INDIVIDUAL_AI_EVAL", {
        reportPeriodId: input.reportPeriodId,
        userId: input.userId,
      }, String(ctx.user!.id));
      log.info({ ...input, taskId: result.taskId }, "BI individual AI evaluation triggered");
      return { taskId: result.taskId, status: "generating" };
    }),
});

// ══════════════════════════════════════════════════════
// Access Sub-Router — 报告授权管理
// ══════════════════════════════════════════════════════

const accessRouter = router({
  /** Grant access to a role or user */
  grant: manageBI
    .input(z.object({
      periodType: periodTypeSchema.optional(),
      departmentCode: z.string().optional(),
      grantedToRole: z.string().optional(),
      grantedToUserId: z.number().optional(),
      accessLevel: z.enum(["view_summary", "view_detail", "view_individual", "manage"]),
      expiresAt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.insert(biReportAccessRules).values({
        periodType: input.periodType ?? null,
        departmentCode: input.departmentCode ?? null,
        grantedToRole: input.grantedToRole ?? null,
        grantedToUserId: input.grantedToUserId ?? null,
        accessLevel: input.accessLevel,
        grantedBy: ctx.user!.id,
        expiresAt: input.expiresAt ?? null,
      }).returning();
      log.info({ ruleId: row.id, ...input }, "BI access rule granted");
      return row;
    }),

  /** Revoke access rule */
  revoke: manageBI
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.update(biReportAccessRules)
        .set({ isActive: false })
        .where(eq(biReportAccessRules.id, input.id))
        .returning();
      return row;
    }),

  /** List all access rules */
  listRules: manageBI
    .input(z.object({
      activeOnly: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.activeOnly !== false) conditions.push(eq(biReportAccessRules.isActive, true));

      const query = db.select().from(biReportAccessRules);
      const rows = conditions.length > 0
        ? await query.where(and(...conditions)).orderBy(desc(biReportAccessRules.createdAt)).limit(200)
        : await query.orderBy(desc(biReportAccessRules.createdAt)).limit(200);
      return rows;
    }),

  /** Check if current user has access to a report */
  checkAccess: protectedProcedure
    .input(z.object({
      periodType: periodTypeSchema,
      departmentCode: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const userRole = ctx.user!.role;

      // Admin/director always has full access
      if (["admin", "director", "ceo"].includes(userRole)) {
        return { hasAccess: true, level: "manage" as const };
      }

      // Check user-specific rules first
      const userRules = await db.select().from(biReportAccessRules)
        .where(and(
          eq(biReportAccessRules.grantedToUserId, ctx.user!.id),
          eq(biReportAccessRules.isActive, true),
        ))
        .limit(10);

      // Check role-based rules
      const roleRules = await db.select().from(biReportAccessRules)
        .where(and(
          eq(biReportAccessRules.grantedToRole, userRole),
          eq(biReportAccessRules.isActive, true),
        ))
        .limit(10);

      const allRules = [...userRules, ...roleRules];

      // Filter matching rules
      const matching = allRules.filter(r => {
        if (r.periodType && r.periodType !== input.periodType) return false;
        if (r.departmentCode && r.departmentCode !== input.departmentCode) return false;
        if (r.expiresAt && new Date(r.expiresAt) < new Date()) return false;
        return true;
      });

      if (matching.length === 0) {
        return { hasAccess: false, level: null };
      }

      // Return highest access level
      const levels = ["view_summary", "view_detail", "view_individual", "manage"] as const;
      let best = 0;
      for (const rule of matching) {
        const idx = levels.indexOf(rule.accessLevel);
        if (idx > best) best = idx;
      }

      return { hasAccess: true, level: levels[best] };
    }),

  /** List reports accessible to current user */
  listMyReports: protectedProcedure
    .input(z.object({
      periodType: periodTypeSchema.optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [eq(biReportPeriods.status, "published")];
      if (input.periodType) conditions.push(eq(biReportPeriods.periodType, input.periodType));

      const rows = await db.select().from(biReportPeriods)
        .where(and(...conditions))
        .orderBy(desc(biReportPeriods.createdAt))
        .limit(50);
      return rows;
    }),

  /** Get departments accessible to current user */
  getAccessibleDepts: protectedProcedure
    .input(z.object({ reportPeriodId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select({
        departmentCode: biDepartmentMetrics.departmentCode,
        departmentName: biDepartmentMetrics.departmentName,
      }).from(biDepartmentMetrics)
        .where(eq(biDepartmentMetrics.reportPeriodId, input.reportPeriodId))
        .orderBy(asc(biDepartmentMetrics.departmentName))
        .limit(50);
      return rows;
    }),
});

// ══════════════════════════════════════════════════════
// Combined Router
// ══════════════════════════════════════════════════════

export const biReportRouter = router({
  period: periodRouter,
  department: departmentRouter,
  individual: individualRouter,
  access: accessRouter,
});
