import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { db } from "../db";
import { executiveReviewComments, executiveReviewSnapshots } from "../../drizzle/executive-review-schema";
import { users } from "../../drizzle/schema";
import { hrmMonthlyPerformanceReviews, hrmKpiLibrary, hrmPositionKpiTargets } from "../../drizzle/kpi-performance-schema";
import { employeeTaskMetrics, employeeRewardsPenalties, employeePeriodicReports } from "../../drizzle/employee-growth-schema";
import { perfCompositeScores, perf360Feedback } from "../../drizzle/perf-calibration-schema";
import { performanceRecords } from "../../drizzle/performance-schema";
import { okrObjectives, okrKeyResults } from "../../drizzle/okr-schema";
import { globalArenaRankings } from "../../drizzle/battle-arena-schema";
import { eq, and, sql, desc, asc, gte, lte, like, inArray, count } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const logger = createChildLogger("executive-review");

// ── Helper: require manager+ role ──
function assertExecutiveRole(role: string | undefined) {
  const allowed = ["bu_gm", "dept_manager", "director", "gm", "chairman", "admin", "ceo", "cto", "cfo", "hr_director"];
  if (!role || !allowed.includes(role)) {
    throw new Error("需要部门经理及以上权限查看高管绩效总览");
  }
}

// ── Company Overview Sub-router ──────────────────────────────────────
const companyRouter = router({
  // Get company-wide snapshot for a period
  getSnapshot: protectedProcedure
    .input(z.object({ period: z.string(), periodType: z.string().default("monthly") }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const rows = await db
        .select()
        .from(executiveReviewSnapshots)
        .where(and(
          eq(executiveReviewSnapshots.scopeType, "company"),
          eq(executiveReviewSnapshots.period, input.period),
          eq(executiveReviewSnapshots.periodType, input.periodType),
        ))
        .limit(1);
      return rows[0] ?? null;
    }),

  // Get all department snapshots for a period (横向对比)
  getDepartmentComparison: protectedProcedure
    .input(z.object({ period: z.string(), periodType: z.string().default("monthly") }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      return db
        .select()
        .from(executiveReviewSnapshots)
        .where(and(
          eq(executiveReviewSnapshots.scopeType, "department"),
          eq(executiveReviewSnapshots.period, input.period),
          eq(executiveReviewSnapshots.periodType, input.periodType),
        ))
        .orderBy(desc(executiveReviewSnapshots.avgKpiScore))
        .limit(50);
    }),

  // Get BU snapshots for a period
  getBuComparison: protectedProcedure
    .input(z.object({ period: z.string(), periodType: z.string().default("monthly") }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      return db
        .select()
        .from(executiveReviewSnapshots)
        .where(and(
          eq(executiveReviewSnapshots.scopeType, "bu"),
          eq(executiveReviewSnapshots.period, input.period),
          eq(executiveReviewSnapshots.periodType, input.periodType),
        ))
        .orderBy(desc(executiveReviewSnapshots.avgKpiScore))
        .limit(20);
    }),

  // Trend: get snapshots for a scope across multiple periods
  getTrend: protectedProcedure
    .input(z.object({
      scopeType: z.string(),
      scopeId: z.string(),
      periodType: z.string().default("monthly"),
      limit: z.number().min(1).max(24).default(12),
    }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      return db
        .select()
        .from(executiveReviewSnapshots)
        .where(and(
          eq(executiveReviewSnapshots.scopeType, input.scopeType),
          eq(executiveReviewSnapshots.scopeId, input.scopeId),
          eq(executiveReviewSnapshots.periodType, input.periodType),
        ))
        .orderBy(desc(executiveReviewSnapshots.period))
        .limit(input.limit);
    }),

  // Save/update snapshot (for system or admin)
  upsertSnapshot: protectedProcedure
    .input(z.object({
      scopeType: z.string(),
      scopeId: z.string(),
      scopeName: z.string(),
      period: z.string(),
      periodType: z.string(),
      data: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const existing = await db
        .select({ id: executiveReviewSnapshots.id })
        .from(executiveReviewSnapshots)
        .where(and(
          eq(executiveReviewSnapshots.scopeType, input.scopeType),
          eq(executiveReviewSnapshots.scopeId, input.scopeId),
          eq(executiveReviewSnapshots.period, input.period),
          eq(executiveReviewSnapshots.periodType, input.periodType),
        ))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(executiveReviewSnapshots)
          .set({ ...input.data, generatedAt: new Date() })
          .where(eq(executiveReviewSnapshots.id, existing[0].id));
        return { action: "updated", id: existing[0].id };
      }
      const ins = await db
        .insert(executiveReviewSnapshots)
        .values({
          scopeType: input.scopeType,
          scopeId: input.scopeId,
          scopeName: input.scopeName,
          period: input.period,
          periodType: input.periodType,
          ...input.data,
        })
        .returning({ id: executiveReviewSnapshots.id });
      return { action: "created", id: ins[0]?.id };
    }),
});

// ── Department Drill-down Sub-router ─────────────────────────────────
const departmentRouter = router({
  // Get department snapshot
  getSnapshot: protectedProcedure
    .input(z.object({ department: z.string(), period: z.string(), periodType: z.string().default("monthly") }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const rows = await db
        .select()
        .from(executiveReviewSnapshots)
        .where(and(
          eq(executiveReviewSnapshots.scopeType, "department"),
          eq(executiveReviewSnapshots.scopeId, input.department),
          eq(executiveReviewSnapshots.period, input.period),
          eq(executiveReviewSnapshots.periodType, input.periodType),
        ))
        .limit(1);
      return rows[0] ?? null;
    }),

  // Get employees in department with their KPI for a period
  getEmployeeKpis: protectedProcedure
    .input(z.object({ department: z.string(), period: z.string() }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const reviews = await db
        .select({
          userId: hrmMonthlyPerformanceReviews.userId,
          employeeId: hrmMonthlyPerformanceReviews.employeeId,
          overallKpiScore: hrmMonthlyPerformanceReviews.overallKpiScore,
          bonusCoefficient: hrmMonthlyPerformanceReviews.bonusCoefficient,
          status: hrmMonthlyPerformanceReviews.status,
          kpiDetailsJson: hrmMonthlyPerformanceReviews.kpiDetailsJson,
        })
        .from(hrmMonthlyPerformanceReviews)
        .innerJoin(users, eq(users.id, hrmMonthlyPerformanceReviews.userId))
        .where(and(
          eq(users.department, input.department),
          eq(hrmMonthlyPerformanceReviews.monthDate, input.period),
        ))
        .orderBy(desc(hrmMonthlyPerformanceReviews.overallKpiScore))
        .limit(200);
      return reviews;
    }),

  // Get task metrics for department employees in a period
  getTaskMetrics: protectedProcedure
    .input(z.object({ department: z.string(), period: z.string() }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const metrics = await db
        .select({
          userId: employeeTaskMetrics.userId,
          employeeId: employeeTaskMetrics.employeeId,
          period: employeeTaskMetrics.period,
          tasksAssigned: employeeTaskMetrics.tasksAssigned,
          tasksCompleted: employeeTaskMetrics.tasksCompleted,
          tasksOnTime: employeeTaskMetrics.tasksOnTime,
          tasksLate: employeeTaskMetrics.tasksLate,
          tasksOverdue: employeeTaskMetrics.tasksOverdue,
          avgQualityScore: employeeTaskMetrics.avgQualityScore,
          defectCount: employeeTaskMetrics.defectCount,
        })
        .from(employeeTaskMetrics)
        .innerJoin(users, eq(users.id, employeeTaskMetrics.userId))
        .where(and(
          eq(users.department, input.department),
          eq(employeeTaskMetrics.period, input.period),
        ))
        .orderBy(desc(employeeTaskMetrics.avgQualityScore))
        .limit(200);
      return metrics;
    }),

  // Get rewards/penalties summary for a department in a period
  getRewardPenaltySummary: protectedProcedure
    .input(z.object({ department: z.string(), period: z.string() }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const items = await db
        .select({
          userId: employeeRewardsPenalties.userId,
          employeeId: employeeRewardsPenalties.employeeId,
          type: employeeRewardsPenalties.type,
          category: employeeRewardsPenalties.category,
          title: employeeRewardsPenalties.title,
          amount: employeeRewardsPenalties.amount,
          issuedAt: employeeRewardsPenalties.issuedAt,
        })
        .from(employeeRewardsPenalties)
        .innerJoin(users, eq(users.id, employeeRewardsPenalties.userId))
        .where(and(
          eq(users.department, input.department),
          eq(employeeRewardsPenalties.period, input.period),
        ))
        .orderBy(desc(employeeRewardsPenalties.issuedAt))
        .limit(200);
      return items;
    }),
});

// ── Employee Drill-down Sub-router ───────────────────────────────────
const employeeRouter = router({
  // Get employee's full performance profile for a period
  getProfile: protectedProcedure
    .input(z.object({ userId: z.number(), period: z.string() }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      // Parallel fetch from multiple sources
      const [user, kpiReview, taskMetric, compositeScore, rewards, arenaRank] = await Promise.all([
        db.select().from(users).where(eq(users.id, input.userId)).limit(1),
        db.select().from(hrmMonthlyPerformanceReviews)
          .where(and(eq(hrmMonthlyPerformanceReviews.userId, input.userId), eq(hrmMonthlyPerformanceReviews.monthDate, input.period)))
          .limit(1),
        db.select().from(employeeTaskMetrics)
          .where(and(eq(employeeTaskMetrics.userId, input.userId), eq(employeeTaskMetrics.period, input.period)))
          .limit(1),
        db.select().from(perfCompositeScores)
          .where(and(eq(perfCompositeScores.employeeId, String(input.userId)), eq(perfCompositeScores.period, input.period)))
          .limit(1),
        db.select().from(employeeRewardsPenalties)
          .where(and(eq(employeeRewardsPenalties.userId, input.userId), eq(employeeRewardsPenalties.period, input.period)))
          .limit(100),
        db.select().from(globalArenaRankings)
          .where(and(eq(globalArenaRankings.entityId, String(input.userId)), eq(globalArenaRankings.period, input.period)))
          .limit(1),
      ]);
      return {
        user: user[0] ?? null,
        kpiReview: kpiReview[0] ?? null,
        taskMetric: taskMetric[0] ?? null,
        compositeScore: compositeScore[0] ?? null,
        rewards,
        arenaRank: arenaRank[0] ?? null,
      };
    }),

  // Get employee KPI trend (monthly scores over time)
  getKpiTrend: protectedProcedure
    .input(z.object({ userId: z.number(), months: z.number().min(1).max(24).default(12) }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      return db
        .select({
          monthDate: hrmMonthlyPerformanceReviews.monthDate,
          overallKpiScore: hrmMonthlyPerformanceReviews.overallKpiScore,
          bonusCoefficient: hrmMonthlyPerformanceReviews.bonusCoefficient,
          status: hrmMonthlyPerformanceReviews.status,
        })
        .from(hrmMonthlyPerformanceReviews)
        .where(eq(hrmMonthlyPerformanceReviews.userId, input.userId))
        .orderBy(desc(hrmMonthlyPerformanceReviews.monthDate))
        .limit(input.months);
    }),

  // Get employee task metrics trend
  getTaskTrend: protectedProcedure
    .input(z.object({ userId: z.number(), months: z.number().min(1).max(24).default(12) }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      return db
        .select()
        .from(employeeTaskMetrics)
        .where(eq(employeeTaskMetrics.userId, input.userId))
        .orderBy(desc(employeeTaskMetrics.period))
        .limit(input.months);
    }),

  // Get employee periodic reports
  getReports: protectedProcedure
    .input(z.object({ userId: z.number(), reportType: z.string().optional(), year: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const conditions = [eq(employeePeriodicReports.userId, input.userId)];
      if (input.reportType) conditions.push(eq(employeePeriodicReports.reportType, input.reportType));
      if (input.year) conditions.push(like(employeePeriodicReports.period, `${input.year}%`));
      return db
        .select()
        .from(employeePeriodicReports)
        .where(and(...conditions))
        .orderBy(desc(employeePeriodicReports.period))
        .limit(100);
    }),

  // Get 360° feedback for an employee
  get360Feedback: protectedProcedure
    .input(z.object({ userId: z.number(), period: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const conditions = [eq(perf360Feedback.targetEmployeeId, String(input.userId))];
      if (input.period) conditions.push(eq(perf360Feedback.period, input.period));
      return db
        .select({
          id: perf360Feedback.id,
          relationship: perf360Feedback.relationship,
          overallScore: perf360Feedback.overallScore,
          strengths: perf360Feedback.strengths,
          improvements: perf360Feedback.improvements,
          isAnonymous: perf360Feedback.isAnonymous,
          status: perf360Feedback.status,
          period: perf360Feedback.period,
        })
        .from(perf360Feedback)
        .where(and(...conditions))
        .orderBy(desc(perf360Feedback.period))
        .limit(50);
    }),

  // Search employees across company
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      return db
        .select({
          id: users.id,
          name: users.name,
          employeeId: users.employeeId,
          department: users.department,
          position: users.position,
          role: users.role,
        })
        .from(users)
        .where(sql`(${users.name} ILIKE ${'%' + input.query + '%'} OR ${users.employeeId} ILIKE ${'%' + input.query + '%'} OR ${users.department} ILIKE ${'%' + input.query + '%'})`)
        .limit(input.limit);
    }),
});

// ── Project Performance Sub-router ───────────────────────────────────
const projectRouter = router({
  // Get performance records by project (from performanceRecords)
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string().optional(), period: z.string().optional(), limit: z.number().max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const conditions = [];
      if (input.period) {
        conditions.push(eq(performanceRecords.year, parseInt(input.period.split("-")[0])));
      }
      return db
        .select()
        .from(performanceRecords)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(performanceRecords.year), desc(performanceRecords.quarter))
        .limit(input.limit);
    }),

  // Get OKR status for company/department
  getOkrStatus: protectedProcedure
    .input(z.object({ year: z.number().optional(), quarter: z.string().optional(), department: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const conditions = [];
      if (input.year) conditions.push(eq(okrObjectives.year, input.year));
      if (input.quarter) conditions.push(eq(okrObjectives.quarter, input.quarter));
      if (input.department) conditions.push(eq(okrObjectives.ownerDepartment, input.department));

      const objectives = await db
        .select()
        .from(okrObjectives)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(okrObjectives.year))
        .limit(50);

      // Fetch key results for each objective
      const objectiveIds = objectives.map(o => o.id);
      let keyResults: any[] = [];
      if (objectiveIds.length > 0) {
        keyResults = await db
          .select()
          .from(okrKeyResults)
          .where(inArray(okrKeyResults.objectiveId, objectiveIds))
          .limit(500);
      }

      return { objectives, keyResults };
    }),
});

// ── Review/Comment Sub-router (评价管理) ─────────────────────────────
const reviewRouter = router({
  // Create an evaluation comment
  create: protectedProcedure
    .input(z.object({
      targetType: z.enum(["department", "employee", "project", "bu"]),
      targetId: z.string(),
      targetName: z.string(),
      period: z.string(),
      periodType: z.enum(["monthly", "quarterly", "annual"]),
      rating: z.number().min(1).max(5).optional(),
      comment: z.string().min(1).max(2000),
      tags: z.array(z.string()).optional(),
      isPrivate: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const ins = await db
        .insert(executiveReviewComments)
        .values({
          reviewerId: ctx.user!.id,
          reviewerName: ctx.user!.name ?? "未知",
          reviewerRole: ctx.user!.role ?? "unknown",
          targetType: input.targetType,
          targetId: input.targetId,
          targetName: input.targetName,
          period: input.period,
          periodType: input.periodType,
          rating: input.rating,
          comment: input.comment,
          tags: input.tags ?? [],
          isPrivate: input.isPrivate ?? false,
        })
        .returning({ id: executiveReviewComments.id });
      logger.info({ commentId: ins[0]?.id, targetType: input.targetType, targetId: input.targetId }, "executive review comment created");
      return ins[0];
    }),

  // List comments for a target
  listByTarget: protectedProcedure
    .input(z.object({
      targetType: z.string(),
      targetId: z.string(),
      period: z.string().optional(),
      limit: z.number().max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const conditions = [
        eq(executiveReviewComments.targetType, input.targetType),
        eq(executiveReviewComments.targetId, input.targetId),
        eq(executiveReviewComments.status, "active"),
      ];
      if (input.period) conditions.push(eq(executiveReviewComments.period, input.period));
      // Hide private comments from non-authors
      return db
        .select()
        .from(executiveReviewComments)
        .where(and(...conditions))
        .orderBy(desc(executiveReviewComments.createdAt))
        .limit(input.limit);
    }),

  // List all comments by a reviewer
  listByReviewer: protectedProcedure
    .input(z.object({ reviewerId: z.number().optional(), limit: z.number().max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const rid = input.reviewerId ?? ctx.user!.id;
      return db
        .select()
        .from(executiveReviewComments)
        .where(and(eq(executiveReviewComments.reviewerId, rid), eq(executiveReviewComments.status, "active")))
        .orderBy(desc(executiveReviewComments.createdAt))
        .limit(input.limit);
    }),

  // Update comment
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      comment: z.string().min(1).max(2000).optional(),
      rating: z.number().min(1).max(5).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      // Only author can edit
      const existing = await db.select().from(executiveReviewComments).where(eq(executiveReviewComments.id, id)).limit(1);
      if (!existing[0] || existing[0].reviewerId !== ctx.user!.id) {
        throw new Error("只能编辑自己的评价");
      }
      await db
        .update(executiveReviewComments)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(executiveReviewComments.id, id));
      return { success: true };
    }),

  // Archive (soft delete) comment
  archive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.select().from(executiveReviewComments).where(eq(executiveReviewComments.id, input.id)).limit(1);
      if (!existing[0] || existing[0].reviewerId !== ctx.user!.id) {
        throw new Error("只能删除自己的评价");
      }
      await db
        .update(executiveReviewComments)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(executiveReviewComments.id, input.id));
      return { success: true };
    }),

  // Get comment statistics for a period
  getStats: protectedProcedure
    .input(z.object({ period: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const conditions = [eq(executiveReviewComments.status, "active")];
      if (input.period) conditions.push(eq(executiveReviewComments.period, input.period));
      const stats = await db
        .select({
          targetType: executiveReviewComments.targetType,
          count: count(),
        })
        .from(executiveReviewComments)
        .where(and(...conditions))
        .groupBy(executiveReviewComments.targetType)
        .limit(10);
      return stats;
    }),
});

// ── Cross-comparison Sub-router (横向纵向对比) ───────────────────────
const comparisonRouter = router({
  // Horizontal: compare departments on a metric
  horizontal: protectedProcedure
    .input(z.object({
      period: z.string(),
      periodType: z.string().default("monthly"),
      metric: z.enum(["avgKpiScore", "taskCompletionRate", "onTimeRate", "avgTaskQuality", "trainingCompletionRate", "okrProgressAvg"]),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const orderFn = input.sortOrder === "desc" ? desc : asc;
      const metricCol = {
        avgKpiScore: executiveReviewSnapshots.avgKpiScore,
        taskCompletionRate: executiveReviewSnapshots.taskCompletionRate,
        onTimeRate: executiveReviewSnapshots.onTimeRate,
        avgTaskQuality: executiveReviewSnapshots.avgTaskQuality,
        trainingCompletionRate: executiveReviewSnapshots.trainingCompletionRate,
        okrProgressAvg: executiveReviewSnapshots.okrProgressAvg,
      }[input.metric];
      return db
        .select()
        .from(executiveReviewSnapshots)
        .where(and(
          eq(executiveReviewSnapshots.scopeType, "department"),
          eq(executiveReviewSnapshots.period, input.period),
          eq(executiveReviewSnapshots.periodType, input.periodType),
        ))
        .orderBy(orderFn(metricCol))
        .limit(50);
    }),

  // Vertical: compare same entity across time periods
  vertical: protectedProcedure
    .input(z.object({
      scopeType: z.string(),
      scopeId: z.string(),
      periodType: z.string().default("monthly"),
      periods: z.array(z.string()).max(24),
    }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      if (input.periods.length === 0) return [];
      return db
        .select()
        .from(executiveReviewSnapshots)
        .where(and(
          eq(executiveReviewSnapshots.scopeType, input.scopeType),
          eq(executiveReviewSnapshots.scopeId, input.scopeId),
          eq(executiveReviewSnapshots.periodType, input.periodType),
          inArray(executiveReviewSnapshots.period, input.periods),
        ))
        .orderBy(asc(executiveReviewSnapshots.period))
        .limit(24);
    }),

  // Ranking: get arena rankings for a period by entity type
  arenaRanking: protectedProcedure
    .input(z.object({
      period: z.string(),
      entityType: z.enum(["SALES", "ENGINEER", "DIVISION", "MANAGER"]).optional(),
      limit: z.number().max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const conditions = [eq(globalArenaRankings.period, input.period)];
      if (input.entityType) conditions.push(eq(globalArenaRankings.entityType, input.entityType));
      return db
        .select()
        .from(globalArenaRankings)
        .where(and(...conditions))
        .orderBy(asc(globalArenaRankings.rankPosition))
        .limit(input.limit);
    }),
});

// ── Dashboard aggregation (公司级仪表板) ─────────────────────────────
const dashboardRouter = router({
  // Get comprehensive dashboard data in one call
  getSummary: protectedProcedure
    .input(z.object({ period: z.string(), periodType: z.string().default("monthly") }))
    .query(async ({ ctx, input }) => {
      assertExecutiveRole(ctx.user?.role);
      const [companySnapshot, deptSnapshots, buSnapshots, reviewStats] = await Promise.all([
        db.select().from(executiveReviewSnapshots)
          .where(and(
            eq(executiveReviewSnapshots.scopeType, "company"),
            eq(executiveReviewSnapshots.period, input.period),
            eq(executiveReviewSnapshots.periodType, input.periodType),
          ))
          .limit(1),
        db.select().from(executiveReviewSnapshots)
          .where(and(
            eq(executiveReviewSnapshots.scopeType, "department"),
            eq(executiveReviewSnapshots.period, input.period),
            eq(executiveReviewSnapshots.periodType, input.periodType),
          ))
          .orderBy(desc(executiveReviewSnapshots.avgKpiScore))
          .limit(50),
        db.select().from(executiveReviewSnapshots)
          .where(and(
            eq(executiveReviewSnapshots.scopeType, "bu"),
            eq(executiveReviewSnapshots.period, input.period),
            eq(executiveReviewSnapshots.periodType, input.periodType),
          ))
          .limit(20),
        db.select({ targetType: executiveReviewComments.targetType, count: count() })
          .from(executiveReviewComments)
          .where(and(eq(executiveReviewComments.period, input.period), eq(executiveReviewComments.status, "active")))
          .groupBy(executiveReviewComments.targetType)
          .limit(10),
      ]);
      return {
        company: companySnapshot[0] ?? null,
        departments: deptSnapshots,
        bus: buSnapshots,
        reviewStats,
      };
    }),

  // Available periods
  getAvailablePeriods: protectedProcedure
    .query(async ({ ctx }) => {
      assertExecutiveRole(ctx.user?.role);
      const periods = await db
        .select({ period: executiveReviewSnapshots.period, periodType: executiveReviewSnapshots.periodType })
        .from(executiveReviewSnapshots)
        .groupBy(executiveReviewSnapshots.period, executiveReviewSnapshots.periodType)
        .orderBy(desc(executiveReviewSnapshots.period))
        .limit(100);
      return periods;
    }),
});

// ── Combined Router ──────────────────────────────────────────────────
export const executiveReviewRouter = router({
  company: companyRouter,
  department: departmentRouter,
  employee: employeeRouter,
  project: projectRouter,
  review: reviewRouter,
  comparison: comparisonRouter,
  dashboard: dashboardRouter,
});
