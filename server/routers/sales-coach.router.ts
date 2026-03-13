/**
 * Sales Coach Engine Router — 全球销售全域赋能与战术指导引擎
 *
 * 3 sub-routers, ~18 procedures:
 *   budget (7):   list, getById, upsert, delete, getBudgetAlerts, getBudgetSummary, markOverdue
 *   tactical (6): create, update, getByProject, getByOpportunity, getTacticalBoard, delete
 *   coach (5):    submitSalesReport, getCoachingFeedback, getTaskStatus, getPipelineHealth, getCoachHistory
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, desc, sql, isNull, asc, count } from "drizzle-orm";
import {
  clientAnnualBudgets,
  projectBiddingStrategies,
} from "../../drizzle/sales-coach-schema";
import { employeeDailyLogs } from "../../drizzle/empowerment-schema";
import { crmCustomers, projects, aiTasks } from "../../drizzle/schema";
import { submitTask } from "../services/task-worker.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("sales-coach");

const writeBudget = requirePermission("sales:budget:write");
const writeStrategy = requirePermission("sales:strategy:write");

// ══════════════════════════════════════════════════════
// Budget Sub-Router — CAPEX年度投资预算采集
// ══════════════════════════════════════════════════════

const budgetRouter = router({
  /** List budgets for BU + year */
  list: protectedProcedure
    .input(z.object({
      year: z.number().int().min(2020).max(2040).optional(),
      buCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.year) conditions.push(eq(clientAnnualBudgets.year, input.year));
      if (input.buCode) conditions.push(eq(clientAnnualBudgets.buCode, input.buCode));

      const rows = await db
        .select()
        .from(clientAnnualBudgets)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(clientAnnualBudgets.updatedAt))
        .limit(500);
      return rows;
    }),

  /** Single budget by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(clientAnnualBudgets)
        .where(eq(clientAnnualBudgets.id, input.id))
        .limit(1);
      return row ?? null;
    }),

  /** Create/update budget (ON CONFLICT client_id+year) */
  upsert: protectedProcedure
    .use(writeBudget)
    .input(z.object({
      clientId: z.number(),
      year: z.number().int(),
      cleaningCapex: z.string().optional().default("0"),
      visionCapex: z.string().optional().default("0"),
      zldCapex: z.string().optional().default("0"),
      deadlineDate: z.string().nullable().optional(),
      buCode: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const totalCapex = String(
        parseFloat(input.cleaningCapex) +
        parseFloat(input.visionCapex) +
        parseFloat(input.zldCapex)
      );

      // Determine deadline_status
      const hasAll = parseFloat(input.cleaningCapex) > 0 &&
        parseFloat(input.visionCapex) > 0 &&
        parseFloat(input.zldCapex) > 0;
      const hasAny = parseFloat(input.cleaningCapex) > 0 ||
        parseFloat(input.visionCapex) > 0 ||
        parseFloat(input.zldCapex) > 0;
      const deadlineStatus = hasAll ? "completed" as const : hasAny ? "partial" as const : "pending" as const;

      const [row] = await db
        .insert(clientAnnualBudgets)
        .values({
          clientId: input.clientId,
          year: input.year,
          cleaningCapex: input.cleaningCapex,
          visionCapex: input.visionCapex,
          zldCapex: input.zldCapex,
          totalCapex,
          deadlineStatus,
          deadlineDate: input.deadlineDate ?? null,
          recordedBy: ctx.user!.id,
          buCode: input.buCode ?? null,
          notes: input.notes ?? null,
        })
        .onConflictDoUpdate({
          target: [clientAnnualBudgets.clientId, clientAnnualBudgets.year],
          set: {
            cleaningCapex: input.cleaningCapex,
            visionCapex: input.visionCapex,
            zldCapex: input.zldCapex,
            totalCapex,
            deadlineStatus,
            deadlineDate: input.deadlineDate ?? null,
            notes: input.notes ?? null,
            updatedAt: new Date().toISOString(),
          },
        })
        .returning();

      log.info({ clientId: input.clientId, year: input.year }, "Budget upserted");
      return row;
    }),

  /** Delete budget record */
  delete: protectedProcedure
    .use(writeBudget)
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .delete(clientAnnualBudgets)
        .where(eq(clientAnnualBudgets.id, input.id));
      return { success: true };
    }),

  /** Core red alert: clients missing budgets + countdown */
  getBudgetAlerts: protectedProcedure
    .input(z.object({
      year: z.number().int().optional(),
      buCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const year = input.year ?? new Date().getFullYear();

      // Get all customers with their budget status
      const rows = await db.execute(sql`
        SELECT
          c.id AS client_id,
          c."customerName" AS client_name,
          c."customerCode" AS client_code,
          b.id AS budget_id,
          b.cleaning_capex,
          b.vision_capex,
          b.zld_capex,
          b.total_capex,
          b.deadline_status,
          b.deadline_date,
          CASE
            WHEN b.id IS NULL THEN 'missing'
            WHEN b.deadline_status = 'overdue' THEN 'overdue'
            WHEN b.deadline_status = 'pending' THEN 'pending'
            WHEN b.deadline_status = 'partial' THEN 'partial'
            ELSE 'completed'
          END AS alert_level,
          CASE
            WHEN b.deadline_date IS NOT NULL THEN
              EXTRACT(DAY FROM b.deadline_date - NOW())::integer
            ELSE NULL
          END AS days_remaining
        FROM crm_customers c
        LEFT JOIN client_annual_budgets b ON b.client_id = c.id AND b.year = ${year}
        WHERE (b.id IS NULL OR b.deadline_status != 'completed')
        ${input.buCode ? sql`AND (b.bu_code = ${input.buCode} OR b.bu_code IS NULL)` : sql``}
        ORDER BY
          CASE WHEN b.deadline_status = 'overdue' THEN 0
               WHEN b.id IS NULL THEN 1
               WHEN b.deadline_status = 'pending' THEN 2
               ELSE 3 END,
          b.deadline_date ASC NULLS LAST
        LIMIT 200
      `);

      return (rows as any).rows ?? rows;
    }),

  /** Aggregate budget summary */
  getBudgetSummary: protectedProcedure
    .input(z.object({
      year: z.number().int().optional(),
      buCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const year = input.year ?? new Date().getFullYear();

      const [totalClients] = await db
        .select({ count: count() })
        .from(crmCustomers);

      const conditions = [eq(clientAnnualBudgets.year, year)];
      if (input.buCode) conditions.push(eq(clientAnnualBudgets.buCode, input.buCode));

      const budgets = await db
        .select()
        .from(clientAnnualBudgets)
        .where(and(...conditions))
        .limit(1000);

      const totalCleaning = budgets.reduce((sum, b) => sum + parseFloat(b.cleaningCapex ?? "0"), 0);
      const totalVision = budgets.reduce((sum, b) => sum + parseFloat(b.visionCapex ?? "0"), 0);
      const totalZld = budgets.reduce((sum, b) => sum + parseFloat(b.zldCapex ?? "0"), 0);
      const completed = budgets.filter(b => b.deadlineStatus === "completed").length;
      const overdue = budgets.filter(b => b.deadlineStatus === "overdue").length;

      return {
        year,
        totalClients: totalClients?.count ?? 0,
        budgetsRecorded: budgets.length,
        coveragePercent: totalClients?.count ? Math.round((budgets.length / Number(totalClients.count)) * 100) : 0,
        completed,
        overdue,
        capexByLine: {
          cleaning: totalCleaning,
          vision: totalVision,
          zld: totalZld,
          total: totalCleaning + totalVision + totalZld,
        },
      };
    }),

  /** Batch-update pending→overdue past deadline */
  markOverdue: protectedProcedure
    .use(writeBudget)
    .mutation(async () => {
      const db = await requireDb();
      const result = await db.execute(sql`
        UPDATE client_annual_budgets
        SET deadline_status = 'overdue', updated_at = NOW()
        WHERE deadline_status IN ('pending', 'partial')
          AND deadline_date IS NOT NULL
          AND deadline_date < NOW()
      `);
      log.info("Marked overdue budgets");
      return { updated: (result as any).rowCount ?? 0 };
    }),
});

// ══════════════════════════════════════════════════════
// Tactical Sub-Router — M阶段投标策略管理
// ══════════════════════════════════════════════════════

const tacticalRouter = router({
  /** Create bidding strategy for project */
  create: protectedProcedure
    .use(writeStrategy)
    .input(z.object({
      projectId: z.number(),
      opportunityId: z.number().optional(),
      projectBackground: z.string().optional(),
      communicationPlan: z.string().optional(),
      biddingStrategy: z.string().optional(),
      competitorAnalysis: z.array(z.object({
        name: z.string(),
        strengths: z.string(),
        weaknesses: z.string(),
        strategy: z.string(),
      })).optional(),
      confidenceLevel: z.number().int().min(1).max(5).optional(),
      stage: z.enum(["M0", "M1", "M2", "M3"]).optional(),
      buCode: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db
        .insert(projectBiddingStrategies)
        .values({
          projectId: input.projectId,
          opportunityId: input.opportunityId ?? null,
          projectBackground: input.projectBackground ?? null,
          communicationPlan: input.communicationPlan ?? null,
          biddingStrategy: input.biddingStrategy ?? null,
          competitorAnalysis: input.competitorAnalysis ?? null,
          confidenceLevel: input.confidenceLevel ?? 3,
          stage: input.stage ?? "M0",
          createdBy: ctx.user!.id,
          buCode: input.buCode ?? null,
        })
        .returning();
      log.info({ projectId: input.projectId }, "Strategy created");
      return row;
    }),

  /** Update strategy fields */
  update: protectedProcedure
    .use(writeStrategy)
    .input(z.object({
      id: z.number(),
      projectBackground: z.string().optional(),
      communicationPlan: z.string().optional(),
      biddingStrategy: z.string().optional(),
      competitorAnalysis: z.array(z.object({
        name: z.string(),
        strengths: z.string(),
        weaknesses: z.string(),
        strategy: z.string(),
      })).optional(),
      confidenceLevel: z.number().int().min(1).max(5).optional(),
      stage: z.enum(["M0", "M1", "M2", "M3"]).optional(),
      status: z.enum(["draft", "submitted", "reviewed", "approved"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const setFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (updates.projectBackground !== undefined) setFields.projectBackground = updates.projectBackground;
      if (updates.communicationPlan !== undefined) setFields.communicationPlan = updates.communicationPlan;
      if (updates.biddingStrategy !== undefined) setFields.biddingStrategy = updates.biddingStrategy;
      if (updates.competitorAnalysis !== undefined) setFields.competitorAnalysis = updates.competitorAnalysis;
      if (updates.confidenceLevel !== undefined) setFields.confidenceLevel = updates.confidenceLevel;
      if (updates.stage !== undefined) setFields.stage = updates.stage;
      if (updates.status !== undefined) setFields.status = updates.status;

      const [row] = await db
        .update(projectBiddingStrategies)
        .set(setFields)
        .where(eq(projectBiddingStrategies.id, id))
        .returning();
      return row ?? null;
    }),

  /** Get by projectId */
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(projectBiddingStrategies)
        .where(eq(projectBiddingStrategies.projectId, input.projectId))
        .limit(1);
      return row ?? null;
    }),

  /** Get by opportunityId */
  getByOpportunity: protectedProcedure
    .input(z.object({ opportunityId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(projectBiddingStrategies)
        .where(eq(projectBiddingStrategies.opportunityId, input.opportunityId))
        .limit(1);
      return row ?? null;
    }),

  /** Core M-stage board: projects + strategies grouped by stage */
  getTacticalBoard: protectedProcedure
    .input(z.object({ buCode: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const rows = await db.execute(sql`
        SELECT
          p.id AS project_id,
          p.name AS project_name,
          p."projectCode" AS project_code,
          p.status AS project_status,
          c."customerName" AS customer_name,
          s.id AS strategy_id,
          s.project_background,
          s.communication_plan,
          s.bidding_strategy,
          s.competitor_analysis,
          s.confidence_level,
          COALESCE(s.stage, 'M0') AS stage,
          s.status AS strategy_status,
          CASE WHEN s.project_background IS NOT NULL AND s.project_background != '' THEN 1 ELSE 0 END AS has_background,
          CASE WHEN s.communication_plan IS NOT NULL AND s.communication_plan != '' THEN 1 ELSE 0 END AS has_plan,
          CASE WHEN s.bidding_strategy IS NOT NULL AND s.bidding_strategy != '' THEN 1 ELSE 0 END AS has_strategy
        FROM projects p
        LEFT JOIN project_bidding_strategies s ON s.project_id = p.id
        LEFT JOIN crm_customers c ON c.id = p."customerId"
        WHERE p.status NOT IN ('cancelled', 'completed', 'closed')
        ${input.buCode ? sql`AND (p."buCode" = ${input.buCode} OR s.bu_code = ${input.buCode})` : sql``}
        ORDER BY
          CASE COALESCE(s.stage, 'M0')
            WHEN 'M0' THEN 0 WHEN 'M1' THEN 1 WHEN 'M2' THEN 2 WHEN 'M3' THEN 3
            ELSE 4 END,
          p.name ASC
        LIMIT 200
      `);

      // Group by stage
      const resultRows = (rows as any).rows ?? rows;
      const board: Record<string, unknown[]> = { M0: [], M1: [], M2: [], M3: [] };
      for (const r of (Array.isArray(resultRows) ? resultRows : [])) {
        const stage = (r as any).stage || "M0";
        if (!board[stage]) board[stage] = [];
        board[stage].push(r);
      }

      return board;
    }),

  /** Delete strategy */
  delete: protectedProcedure
    .use(writeStrategy)
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .delete(projectBiddingStrategies)
        .where(eq(projectBiddingStrategies.id, input.id));
      return { success: true };
    }),
});

// ══════════════════════════════════════════════════════
// Coach Sub-Router — AI销售教练
// ══════════════════════════════════════════════════════

const coachRouter = router({
  /** Submit daily sales report → trigger async AI coaching */
  submitSalesReport: protectedProcedure
    .input(z.object({
      logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      loggedHours: z.number().min(0).max(24),
      completedTasks: z.array(z.object({
        title: z.string(),
        category: z.string().optional(),
        hours: z.number().optional(),
      })).optional(),
      blockers: z.string().optional(),
      notes: z.string().optional(),
      energyLevel: z.number().int().min(1).max(5).optional(),
      clientsVisited: z.number().int().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user!.id;

      // Upsert daily log
      const [logRow] = await db
        .insert(employeeDailyLogs)
        .values({
          userId,
          logDate: input.logDate,
          loggedHours: input.loggedHours,
          completedTasks: input.completedTasks ?? null,
          blockers: input.blockers ?? null,
          notes: input.notes ?? null,
          energyLevel: input.energyLevel ?? null,
          status: "submitted",
        })
        .onConflictDoUpdate({
          target: [employeeDailyLogs.userId, employeeDailyLogs.logDate, employeeDailyLogs.projectId],
          set: {
            loggedHours: input.loggedHours,
            completedTasks: input.completedTasks ?? null,
            blockers: input.blockers ?? null,
            notes: input.notes ?? null,
            energyLevel: input.energyLevel ?? null,
            status: "submitted",
            updatedAt: new Date().toISOString(),
          },
        })
        .returning();

      // Fire async AI coaching task
      let taskId: number | null = null;
      try {
        taskId = await submitTask("SALES_COACH_FEEDBACK", {
          userId,
          logId: logRow.id,
          logDate: input.logDate,
          buCode: ctx.bu?.code ?? null,
          clientsVisited: input.clientsVisited ?? 0,
        });
        log.info({ userId, logId: logRow.id, taskId }, "Sales coach task submitted");
      } catch (err) {
        log.error({ err }, "Failed to submit sales coach task");
      }

      return { log: logRow, taskId };
    }),

  /** Read AI coaching feedback for a date */
  getCoachingFeedback: protectedProcedure
    .input(z.object({
      logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db
        .select({
          id: employeeDailyLogs.id,
          aiCoachFeedback: employeeDailyLogs.aiCoachFeedback,
          pipelineHealthScore: employeeDailyLogs.pipelineHealthScore,
          logDate: employeeDailyLogs.logDate,
        })
        .from(employeeDailyLogs)
        .where(and(
          eq(employeeDailyLogs.userId, ctx.user!.id),
          eq(employeeDailyLogs.logDate, input.logDate),
        ))
        .limit(1);

      return row ?? null;
    }),

  /** Poll AI task status */
  getTaskStatus: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [task] = await db
        .select({
          id: aiTasks.id,
          status: aiTasks.status,
          resultData: aiTasks.resultData,
          errorMessage: aiTasks.errorMessage,
        })
        .from(aiTasks)
        .where(eq(aiTasks.id, input.taskId))
        .limit(1);
      return task ?? null;
    }),

  /** Pipeline health summary */
  getPipelineHealth: protectedProcedure
    .input(z.object({ buCode: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();

      // Latest pipeline health score for this user
      const [latestLog] = await db
        .select({
          pipelineHealthScore: employeeDailyLogs.pipelineHealthScore,
          logDate: employeeDailyLogs.logDate,
        })
        .from(employeeDailyLogs)
        .where(and(
          eq(employeeDailyLogs.userId, ctx.user!.id),
          sql`${employeeDailyLogs.pipelineHealthScore} IS NOT NULL`,
        ))
        .orderBy(desc(employeeDailyLogs.logDate))
        .limit(1);

      // M-stage counts from strategies
      const stageCountsResult = await db.execute(sql`
        SELECT stage, COUNT(*)::integer AS cnt
        FROM project_bidding_strategies
        ${input.buCode ? sql`WHERE bu_code = ${input.buCode}` : sql``}
        GROUP BY stage
        ORDER BY stage
      `);

      // Budget coverage
      const year = new Date().getFullYear();
      const [totalClients] = await db.select({ count: count() }).from(crmCustomers);
      const [budgetCount] = await db
        .select({ count: count() })
        .from(clientAnnualBudgets)
        .where(eq(clientAnnualBudgets.year, year));

      const totalC = Number(totalClients?.count ?? 0);
      const budgetC = Number(budgetCount?.count ?? 0);

      return {
        healthScore: latestLog?.pipelineHealthScore ?? null,
        lastDate: latestLog?.logDate ?? null,
        stageCounts: (stageCountsResult as any).rows ?? stageCountsResult,
        budgetCoverage: {
          total: totalC,
          covered: budgetC,
          percent: totalC > 0 ? Math.round((budgetC / totalC) * 100) : 0,
        },
      };
    }),

  /** Last N coaching feedbacks */
  getCoachHistory: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).optional() }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const rows = await db
        .select({
          id: employeeDailyLogs.id,
          logDate: employeeDailyLogs.logDate,
          aiCoachFeedback: employeeDailyLogs.aiCoachFeedback,
          pipelineHealthScore: employeeDailyLogs.pipelineHealthScore,
        })
        .from(employeeDailyLogs)
        .where(and(
          eq(employeeDailyLogs.userId, ctx.user!.id),
          sql`${employeeDailyLogs.aiCoachFeedback} IS NOT NULL`,
        ))
        .orderBy(desc(employeeDailyLogs.logDate))
        .limit(input.limit ?? 10);
      return rows;
    }),
});

// ══════════════════════════════════════════════════════
// Combined Router
// ══════════════════════════════════════════════════════

export const salesCoachRouter = router({
  budget: budgetRouter,
  tactical: tacticalRouter,
  coach: coachRouter,
});
