/**
 * 财务高级功能路由
 * P2-1: 银行对账 | P2-2: 项目EVA | P2-3: 多币种
 * P2-4: 财务报表 | P2-5: 项目对标 | P2-8: 自动折旧
 *
 * ~37 procedures covering:
 *   Bank Reconciliation (8)
 *   Project Earned Value (6)
 *   Multi-Currency (5)
 *   Financial Reports (6)
 *   Project Cost Benchmarking (6)
 *   Auto-Depreciation (4)
 *   Dashboard (2)
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import { processBusinessEvent } from "../services/finance-event-bridge.service";

const log = createChildLogger("finance-advanced");

/** Extract rows array from db.execute QueryResult */
function qRows(result: unknown): any[] {
  return (result as any)?.rows ?? [];
}

/** Extract first row from db.execute QueryResult */
function firstRow(result: unknown): any | undefined {
  return qRows(result)[0];
}

// ═══════════════════════════════════════════════════════════════════════
// Helper schemas
// ═══════════════════════════════════════════════════════════════════════

const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(20),
});

const dateRangeInput = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function paginate(page: number, pageSize: number) {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}

function nowISO(): string {
  return new Date().toISOString();
}

// ═══════════════════════════════════════════════════════════════════════
// Pure calculation engines (exported for Vitest)
// ═══════════════════════════════════════════════════════════════════════

/** EVM metric calculation from budget + actuals */
export interface EVMInput {
  budgetAtCompletion: number; // BAC
  plannedPercentComplete: number; // 0-1
  actualPercentComplete: number; // 0-1
  actualCost: number; // AC
}

export interface EVMResult {
  plannedValue: number;       // PV = BAC × planned%
  earnedValue: number;        // EV = BAC × actual%
  actualCost: number;         // AC
  scheduleVariance: number;   // SV = EV - PV
  costVariance: number;       // CV = EV - AC
  spiRaw: number;             // SPI = EV / PV
  cpiRaw: number;             // CPI = EV / AC
  spi: number;                // clamped 0-5
  cpi: number;                // clamped 0-5
  estimateAtCompletion: number;   // EAC = BAC / CPI
  estimateToComplete: number;     // ETC = EAC - AC
  varianceAtCompletion: number;   // VAC = BAC - EAC
  healthScore: number;            // composite 0-100
  healthStatus: "green" | "yellow" | "red";
}

export function calculateEVMMetrics(input: EVMInput): EVMResult {
  const { budgetAtCompletion: bac, plannedPercentComplete, actualPercentComplete, actualCost: ac } = input;
  const pv = bac * plannedPercentComplete;
  const ev = bac * actualPercentComplete;
  const sv = ev - pv;
  const cv = ev - ac;
  const spiRaw = pv === 0 ? 1 : ev / pv;
  const cpiRaw = ac === 0 ? 1 : ev / ac;
  const spi = Math.max(0, Math.min(5, spiRaw));
  const cpi = Math.max(0, Math.min(5, cpiRaw));
  const eac = cpiRaw === 0 ? bac * 2 : bac / cpiRaw;
  const etc = Math.max(0, eac - ac);
  const vac = bac - eac;

  // Health score: weighted average of SPI and CPI (capped at 1.0 for scoring)
  const spiScore = Math.min(1, spi) * 50;
  const cpiScore = Math.min(1, cpi) * 50;
  const healthScore = Math.round(spiScore + cpiScore);
  const healthStatus = healthScore >= 80 ? "green" : healthScore >= 60 ? "yellow" : "red";

  return {
    plannedValue: Math.round(pv * 100) / 100,
    earnedValue: Math.round(ev * 100) / 100,
    actualCost: Math.round(ac * 100) / 100,
    scheduleVariance: Math.round(sv * 100) / 100,
    costVariance: Math.round(cv * 100) / 100,
    spiRaw: Math.round(spiRaw * 1000) / 1000,
    cpiRaw: Math.round(cpiRaw * 1000) / 1000,
    spi: Math.round(spi * 1000) / 1000,
    cpi: Math.round(cpi * 1000) / 1000,
    estimateAtCompletion: Math.round(eac * 100) / 100,
    estimateToComplete: Math.round(etc * 100) / 100,
    varianceAtCompletion: Math.round(vac * 100) / 100,
    healthScore,
    healthStatus,
  };
}

/** Straight-line depreciation for a single period */
export function straightLineDepreciation(cost: number, salvage: number, usefulLifeMonths: number): number {
  if (usefulLifeMonths <= 0) return 0;
  return Math.round(((cost - salvage) / usefulLifeMonths) * 100) / 100;
}

/** Declining-balance depreciation for a single period */
export function decliningBalanceDepreciation(netBookValue: number, usefulLifeMonths: number): number {
  if (usefulLifeMonths <= 0) return 0;
  const rate = 2 / usefulLifeMonths;
  return Math.round(netBookValue * rate * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════

export const financeAdvancedRouter = router({

  // ─────────────────────────────────────────────────────────────────────
  // P2-1: Bank Reconciliation (8 procedures)
  // ─────────────────────────────────────────────────────────────────────

  importBankStatement: requirePermission("finance:bank:manage")
    .input(z.object({
      bankAccountId: z.number().int(),
      bankAccountName: z.string().max(200),
      transactions: z.array(z.object({
        transactionDate: z.string(),
        description: z.string().max(500),
        counterparty: z.string().max(200).optional(),
        amount: z.number(),
        type: z.enum(["debit", "credit"]),
        referenceNo: z.string().max(100).optional(),
      })).min(1).max(5000),
      source: z.enum(["csv", "manual", "api"]).default("manual"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const importBatchId = `BANK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const userId = ctx.user!.id;
      const now = nowISO();

      log.info({ importBatchId, accountId: input.bankAccountId, count: input.transactions.length }, "importing bank statement");

      const inserted: Array<{ id: number }> = [];
      for (const tx of input.transactions) {
        const row = firstRow(await db.execute(sql`
          INSERT INTO bank_statements (
            bank_account_id, import_batch_id, transaction_date, description,
            counterparty, amount, type, reference_no, match_status,
            source, imported_by, created_at
          ) VALUES (
            ${input.bankAccountId}, ${importBatchId}, ${tx.transactionDate}, ${tx.description},
            ${tx.counterparty ?? null}, ${tx.amount}, ${tx.type}, ${tx.referenceNo ?? null},
            'unmatched', ${input.source}, ${userId}, ${now}
          ) RETURNING id
        `));
        inserted.push({ id: (row as any)?.id ?? inserted.length + 1 });
      }

      log.info({ importBatchId, inserted: inserted.length }, "bank statement import complete");
      return { success: true, importBatchId, importedCount: inserted.length };
    }),

  listBankStatements: requirePermission("finance:bank:view")
    .input(z.object({
      bankAccountId: z.number().int().optional(),
      matchStatus: z.enum(["unmatched", "matched", "disputed", "all"]).default("all"),
      ...dateRangeInput.shape,
      ...paginationInput.shape,
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { limit, offset } = paginate(input.page, input.pageSize);

      const conditions: ReturnType<typeof sql>[] = [sql`1=1`];

      if (input.bankAccountId) {
        conditions.push(sql`bank_account_id = ${input.bankAccountId}`);
      }
      if (input.matchStatus !== "all") {
        conditions.push(sql`match_status = ${input.matchStatus}`);
      }
      if (input.startDate) {
        conditions.push(sql`transaction_date >= ${input.startDate}`);
      }
      if (input.endDate) {
        conditions.push(sql`transaction_date <= ${input.endDate}`);
      }

      const whereClause = sql.join(conditions, sql` AND `);

      const rows = qRows(await db.execute(
        sql`SELECT * FROM bank_statements WHERE ${whereClause} ORDER BY transaction_date DESC LIMIT ${limit} OFFSET ${offset}`
      ));

      const countRow = firstRow(await db.execute(
        sql`SELECT count(*)::int AS total FROM bank_statements WHERE ${whereClause}`
      ));

      return {
        items: rows,
        total: (countRow as any)?.total ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  autoMatchStatements: requirePermission("finance:bank:manage")
    .input(z.object({
      bankAccountId: z.number().int(),
      toleranceDays: z.number().int().min(0).max(7).default(2),
      toleranceAmount: z.number().min(0).max(1).default(0.01),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      log.info({ bankAccountId: input.bankAccountId, toleranceDays: input.toleranceDays }, "auto-matching bank statements");

      // Fetch unmatched bank transactions
      const unmatched = qRows(await db.execute(sql`
        SELECT id, transaction_date, amount, type, counterparty, reference_no
        FROM bank_statements
        WHERE bank_account_id = ${input.bankAccountId}
          AND match_status = 'unmatched'
        ORDER BY transaction_date
        LIMIT 5000
      `));

      const unmatchedList = unmatched;
      let matchedCount = 0;

      for (const stmt of unmatchedList) {
        const s = stmt as any;
        // Try to match against payments/receipts by amount + date window + counterparty
        const candidates = qRows(await db.execute(sql`
          SELECT id, document_type, document_id, amount, counterparty, transaction_date
          FROM payment_receipts
          WHERE ABS(amount - ${s.amount}) <= ${input.toleranceAmount * Math.abs(s.amount)}
            AND ABS(EXTRACT(DAY FROM (transaction_date::timestamp - ${s.transaction_date}::timestamp))) <= ${input.toleranceDays}
            AND matched_bank_statement_id IS NULL
          ORDER BY ABS(amount - ${s.amount})
          LIMIT 1
        `));

        const candidateList = candidates;
        if (candidateList.length > 0) {
          const match = candidateList[0] as any;
          await db.execute(sql`
            UPDATE bank_statements
            SET match_status = 'matched',
                matched_document_type = ${match.document_type},
                matched_document_id = ${match.document_id},
                matched_at = ${nowISO()}
            WHERE id = ${s.id}
          `);
          await db.execute(sql`
            UPDATE payment_receipts
            SET matched_bank_statement_id = ${s.id}
            WHERE id = ${match.id}
          `);
          matchedCount++;
        }
      }

      log.info({ bankAccountId: input.bankAccountId, matchedCount, totalUnmatched: unmatchedList.length }, "auto-match complete");
      return { success: true, matchedCount, remainingUnmatched: unmatchedList.length - matchedCount };
    }),

  manualMatchStatement: requirePermission("finance:bank:manage")
    .input(z.object({
      bankStatementId: z.number().int(),
      documentType: z.string().max(50),
      documentId: z.number().int(),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.info({ statementId: input.bankStatementId, docType: input.documentType, docId: input.documentId }, "manual match");

      await db.execute(sql`
        UPDATE bank_statements
        SET match_status = 'matched',
            matched_document_type = ${input.documentType},
            matched_document_id = ${input.documentId},
            matched_at = ${nowISO()},
            match_notes = ${input.notes ?? null},
            matched_by = ${ctx.user!.id}
        WHERE id = ${input.bankStatementId}
      `);

      return { success: true, message: "手动匹配成功" };
    }),

  createReconciliation: requirePermission("finance:bank:manage")
    .input(z.object({
      bankAccountId: z.number().int(),
      bankAccountName: z.string().max(200),
      reconciliationDate: z.string(),
      statementEndingBalance: z.number(),
      bookBalance: z.number(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const reconCode = `RECON-${input.bankAccountId}-${input.reconciliationDate.replace(/-/g, "")}`;
      const now = nowISO();

      log.info({ reconCode, bankAccountId: input.bankAccountId, date: input.reconciliationDate }, "creating reconciliation");

      const row = firstRow(await db.execute(sql`
        INSERT INTO bank_reconciliations (
          recon_code, bank_account_id, bank_account_name,
          reconciliation_date, statement_ending_balance, book_balance,
          status, created_by, notes, created_at, updated_at
        ) VALUES (
          ${reconCode}, ${input.bankAccountId}, ${input.bankAccountName},
          ${input.reconciliationDate}, ${input.statementEndingBalance}, ${input.bookBalance},
          'draft', ${ctx.user!.id}, ${input.notes ?? null}, ${now}, ${now}
        ) RETURNING id
      `));

      return { success: true, id: (row as any)?.id, reconCode };
    }),

  calculateReconciliation: requirePermission("finance:bank:manage")
    .input(z.object({ reconciliationId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Fetch reconciliation header
      const recon = firstRow(await db.execute(sql`
        SELECT * FROM bank_reconciliations WHERE id = ${input.reconciliationId} LIMIT 1
      `));
      if (!recon) {
        log.warn({ reconciliationId: input.reconciliationId }, "reconciliation not found");
        return { success: false, message: "对账单不存在" };
      }

      const r = recon as any;

      // Outstanding checks: issued by us but not yet cleared at bank
      const ocRow = firstRow(await db.execute(sql`
        SELECT COALESCE(SUM(amount), 0)::numeric AS total
        FROM bank_statements
        WHERE bank_account_id = ${r.bank_account_id}
          AND type = 'debit'
          AND match_status = 'unmatched'
          AND transaction_date <= ${r.reconciliation_date}
      `));
      const outstandingChecks = Number((ocRow as any)?.total ?? 0);

      // Deposits in transit: received by us but not yet at bank
      const ditRow = firstRow(await db.execute(sql`
        SELECT COALESCE(SUM(amount), 0)::numeric AS total
        FROM bank_statements
        WHERE bank_account_id = ${r.bank_account_id}
          AND type = 'credit'
          AND match_status = 'unmatched'
          AND transaction_date <= ${r.reconciliation_date}
      `));
      const depositsInTransit = Number((ditRow as any)?.total ?? 0);

      const adjustedBankBalance = Number(r.statement_ending_balance) + depositsInTransit - outstandingChecks;
      const difference = Math.round((adjustedBankBalance - Number(r.book_balance)) * 100) / 100;

      await db.execute(sql`
        UPDATE bank_reconciliations
        SET outstanding_checks = ${outstandingChecks},
            deposits_in_transit = ${depositsInTransit},
            adjusted_bank_balance = ${adjustedBankBalance},
            difference = ${difference},
            status = 'calculated',
            updated_at = ${nowISO()}
        WHERE id = ${input.reconciliationId}
      `);

      log.info({ reconciliationId: input.reconciliationId, difference }, "reconciliation calculated");

      return {
        success: true,
        outstandingChecks,
        depositsInTransit,
        adjustedBankBalance,
        bookBalance: Number(r.book_balance),
        difference,
        isBalanced: Math.abs(difference) < 0.01,
      };
    }),

  approveReconciliation: requirePermission("finance:bank:approve")
    .input(z.object({
      reconciliationId: z.number().int(),
      toleranceAmount: z.number().min(0).max(100).default(0.01),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      const recon = firstRow(await db.execute(sql`
        SELECT difference, status FROM bank_reconciliations WHERE id = ${input.reconciliationId} LIMIT 1
      `));
      if (!recon) return { success: false, message: "对账单不存在" };

      const r = recon as any;
      if (r.status !== "calculated") {
        return { success: false, message: "对账单需先完成计算才能审批" };
      }

      const diff = Math.abs(Number(r.difference));
      if (diff > input.toleranceAmount) {
        log.warn({ reconciliationId: input.reconciliationId, difference: r.difference, tolerance: input.toleranceAmount }, "reconciliation difference exceeds tolerance");
        return { success: false, message: `差异 ${r.difference} 超出容忍范围 ${input.toleranceAmount}` };
      }

      await db.execute(sql`
        UPDATE bank_reconciliations
        SET status = 'approved',
            approved_by = ${ctx.user!.id},
            approved_at = ${nowISO()},
            updated_at = ${nowISO()}
        WHERE id = ${input.reconciliationId}
      `);

      log.info({ reconciliationId: input.reconciliationId, approvedBy: ctx.user!.id }, "reconciliation approved");
      return { success: true, message: "对账审批通过" };
    }),

  getReconciliationHistory: requirePermission("finance:bank:view")
    .input(z.object({
      bankAccountId: z.number().int(),
      ...paginationInput.shape,
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { limit, offset } = paginate(input.page, input.pageSize);

      const rows = qRows(await db.execute(sql`
        SELECT * FROM bank_reconciliations
        WHERE bank_account_id = ${input.bankAccountId}
        ORDER BY reconciliation_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `));

      const countRow = firstRow(await db.execute(sql`
        SELECT count(*)::int AS total FROM bank_reconciliations
        WHERE bank_account_id = ${input.bankAccountId}
      `));

      return {
        items: rows,
        total: (countRow as any)?.total ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // ─────────────────────────────────────────────────────────────────────
  // P2-2: Project Earned Value Management (6 procedures)
  // ─────────────────────────────────────────────────────────────────────

  calculateEVM: requirePermission("finance:project:manage")
    .input(z.object({
      projectId: z.number().int(),
      projectCode: z.string().max(50),
      projectName: z.string().max(200),
      budgetAtCompletion: z.number().positive(),
      plannedPercentComplete: z.number().min(0).max(1),
      actualPercentComplete: z.number().min(0).max(1),
      actualCost: z.number().min(0),
      snapshotDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const metrics = calculateEVMMetrics({
        budgetAtCompletion: input.budgetAtCompletion,
        plannedPercentComplete: input.plannedPercentComplete,
        actualPercentComplete: input.actualPercentComplete,
        actualCost: input.actualCost,
      });

      const snapshotDate = input.snapshotDate ?? new Date().toISOString().slice(0, 10);
      const now = nowISO();

      log.info({ projectId: input.projectId, spi: metrics.spi, cpi: metrics.cpi, health: metrics.healthStatus }, "EVM calculated");

      const row = firstRow(await db.execute(sql`
        INSERT INTO project_earned_value (
          project_id, project_code, project_name, snapshot_date,
          budget_at_completion, planned_percent, actual_percent, actual_cost,
          planned_value, earned_value, schedule_variance, cost_variance,
          spi, cpi, estimate_at_completion, estimate_to_complete, variance_at_completion,
          health_score, health_status, created_by, created_at
        ) VALUES (
          ${input.projectId}, ${input.projectCode}, ${input.projectName}, ${snapshotDate},
          ${input.budgetAtCompletion}, ${input.plannedPercentComplete}, ${input.actualPercentComplete}, ${input.actualCost},
          ${metrics.plannedValue}, ${metrics.earnedValue}, ${metrics.scheduleVariance}, ${metrics.costVariance},
          ${metrics.spi}, ${metrics.cpi}, ${metrics.estimateAtCompletion}, ${metrics.estimateToComplete}, ${metrics.varianceAtCompletion},
          ${metrics.healthScore}, ${metrics.healthStatus}, ${ctx.user!.id}, ${now}
        ) RETURNING id
      `));

      return { success: true, id: (row as any)?.id, metrics };
    }),

  listEVMSnapshots: requirePermission("finance:project:view")
    .input(z.object({
      projectId: z.number().int(),
      ...paginationInput.shape,
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { limit, offset } = paginate(input.page, input.pageSize);

      const rows = qRows(await db.execute(sql`
        SELECT * FROM project_earned_value
        WHERE project_id = ${input.projectId}
        ORDER BY snapshot_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `));

      const countRow = firstRow(await db.execute(sql`
        SELECT count(*)::int AS total FROM project_earned_value
        WHERE project_id = ${input.projectId}
      `));

      return {
        items: rows,
        total: (countRow as any)?.total ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  getEVMDashboard: requirePermission("finance:project:view")
    .query(async () => {
      const db = await requireDb();

      // Get latest snapshot per active project
      const rows = qRows(await db.execute(sql`
        SELECT DISTINCT ON (project_id)
          project_id, project_code, project_name, snapshot_date,
          spi, cpi, health_score, health_status,
          budget_at_completion, actual_cost, earned_value, planned_value,
          estimate_at_completion
        FROM project_earned_value
        ORDER BY project_id, snapshot_date DESC
        LIMIT 100
      `));

      const projects = rows;
      const summary = {
        totalProjects: projects.length,
        green: projects.filter((p: any) => p.health_status === "green").length,
        yellow: projects.filter((p: any) => p.health_status === "yellow").length,
        red: projects.filter((p: any) => p.health_status === "red").length,
        avgSPI: projects.length > 0
          ? Math.round(projects.reduce((sum: number, p: any) => sum + Number(p.spi || 0), 0) / projects.length * 1000) / 1000
          : 0,
        avgCPI: projects.length > 0
          ? Math.round(projects.reduce((sum: number, p: any) => sum + Number(p.cpi || 0), 0) / projects.length * 1000) / 1000
          : 0,
      };

      return { projects, summary };
    }),

  getProjectHealthScore: requirePermission("finance:project:view")
    .input(z.object({ projectId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const latest = firstRow(await db.execute(sql`
        SELECT * FROM project_earned_value
        WHERE project_id = ${input.projectId}
        ORDER BY snapshot_date DESC
        LIMIT 1
      `));

      if (!latest) {
        return { projectId: input.projectId, healthScore: null, message: "无EVM数据" };
      }

      const l = latest as any;
      return {
        projectId: input.projectId,
        projectCode: l.project_code,
        projectName: l.project_name,
        spi: Number(l.spi),
        cpi: Number(l.cpi),
        healthScore: Number(l.health_score),
        healthStatus: l.health_status,
        snapshotDate: l.snapshot_date,
      };
    }),

  compareProjectsEVM: requirePermission("finance:project:view")
    .input(z.object({
      projectIds: z.array(z.number().int()).min(2).max(10),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const results: any[] = [];
      for (const pid of input.projectIds) {
        const latest = firstRow(await db.execute(sql`
          SELECT * FROM project_earned_value
          WHERE project_id = ${pid}
          ORDER BY snapshot_date DESC
          LIMIT 1
        `));
        if (latest) results.push(latest);
      }

      return { projects: results, comparedAt: nowISO() };
    }),

  seedEVMCalculation: requirePermission("finance:project:manage")
    .input(z.object({ projectId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      log.info({ projectId: input.projectId }, "seeding EVM from labor pool + budget");

      // Pull budget and labor cost data
      const budget = firstRow(await db.execute(sql`
        SELECT budget_amount, project_code, project_name
        FROM projects
        WHERE id = ${input.projectId}
        LIMIT 1
      `));

      if (!budget) return { success: false, message: "项目不存在" };

      const b = budget as any;
      const laborRow = firstRow(await db.execute(sql`
        SELECT COALESCE(SUM(cost_amount), 0)::numeric AS total_labor_cost
        FROM work_logs
        WHERE project_id = ${input.projectId}
      `));

      const actualCost = Number((laborRow as any)?.total_labor_cost ?? 0);
      const bac = Number(b.budget_amount ?? 0);

      if (bac <= 0) return { success: false, message: "项目预算为零，无法计算" };

      // Estimate percent complete from cost ratio (simplified)
      const actualPercent = Math.min(1, actualCost / bac);
      // Assume planned percent is based on time elapsed (simplified to actual for seed)
      const plannedPercent = actualPercent;

      const metrics = calculateEVMMetrics({
        budgetAtCompletion: bac,
        plannedPercentComplete: plannedPercent,
        actualPercentComplete: actualPercent,
        actualCost,
      });

      log.info({ projectId: input.projectId, bac, actualCost, metrics }, "EVM seed complete");
      return { success: true, projectId: input.projectId, budgetAtCompletion: bac, actualCost, metrics };
    }),

  // ─────────────────────────────────────────────────────────────────────
  // P2-3: Multi-Currency (5 procedures)
  // ─────────────────────────────────────────────────────────────────────

  setExchangeRate: requirePermission("finance:currency:manage")
    .input(z.object({
      fromCurrency: z.string().length(3),
      toCurrency: z.string().length(3),
      rate: z.number().positive(),
      effectiveDate: z.string(),
      source: z.enum(["manual", "central_bank", "api"]).default("manual"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = nowISO();

      log.info({ from: input.fromCurrency, to: input.toCurrency, rate: input.rate, date: input.effectiveDate }, "setting exchange rate");

      // Upsert: replace rate for same pair+date
      await db.execute(sql`
        INSERT INTO exchange_rates (from_currency, to_currency, rate, effective_date, source, updated_by, created_at, updated_at)
        VALUES (${input.fromCurrency}, ${input.toCurrency}, ${input.rate}, ${input.effectiveDate}, ${input.source}, ${ctx.user!.id}, ${now}, ${now})
        ON CONFLICT (from_currency, to_currency, effective_date)
        DO UPDATE SET rate = ${input.rate}, source = ${input.source}, updated_by = ${ctx.user!.id}, updated_at = ${now}
      `);

      if (input.source === 'manual') {
        log.info({ from: input.fromCurrency, to: input.toCurrency, rate: input.rate }, '手动录入汇率，建议定期与央行/PBOC数据核对');
      }

      return { success: true, message: `汇率 ${input.fromCurrency}/${input.toCurrency} = ${input.rate} 已设置` };
    }),

  listExchangeRates: requirePermission("finance:currency:view")
    .input(z.object({
      fromCurrency: z.string().length(3).optional(),
      toCurrency: z.string().length(3).optional(),
      ...dateRangeInput.shape,
      ...paginationInput.shape,
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { limit, offset } = paginate(input.page, input.pageSize);

      const conditions: ReturnType<typeof sql>[] = [sql`1=1`];
      if (input.fromCurrency) conditions.push(sql`from_currency = ${input.fromCurrency}`);
      if (input.toCurrency) conditions.push(sql`to_currency = ${input.toCurrency}`);
      if (input.startDate) conditions.push(sql`effective_date >= ${input.startDate}`);
      if (input.endDate) conditions.push(sql`effective_date <= ${input.endDate}`);

      const whereClause = sql.join(conditions, sql` AND `);

      const rows = qRows(await db.execute(
        sql`SELECT * FROM exchange_rates WHERE ${whereClause} ORDER BY effective_date DESC LIMIT ${limit} OFFSET ${offset}`
      ));

      const countRow = firstRow(await db.execute(
        sql`SELECT count(*)::int AS total FROM exchange_rates WHERE ${whereClause}`
      ));

      if (rows.length === 0) {
        // 返回参考汇率(仅供参考，需手动确认后正式录入)
        return {
          rates: [
            { fromCurrency: 'USD', toCurrency: 'CNY', rate: 7.2450, rateDate: new Date().toISOString(), rateType: 'reference', source: '参考汇率(需确认)' },
            { fromCurrency: 'EUR', toCurrency: 'CNY', rate: 7.8920, rateDate: new Date().toISOString(), rateType: 'reference', source: '参考汇率(需确认)' },
            { fromCurrency: 'JPY', toCurrency: 'CNY', rate: 0.0483, rateDate: new Date().toISOString(), rateType: 'reference', source: '参考汇率(需确认)' },
          ],
          isReference: true,
          note: '当前无正式汇率记录，显示参考汇率。请通过setExchangeRate录入正式汇率。',
          items: [],
          total: 0,
          page: input.page,
          pageSize: input.pageSize,
        };
      }

      return {
        items: rows,
        total: (countRow as any)?.total ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  getLatestRate: requirePermission("finance:currency:view")
    .input(z.object({
      fromCurrency: z.string().length(3),
      toCurrency: z.string().length(3),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const row = firstRow(await db.execute(sql`
        SELECT * FROM exchange_rates
        WHERE from_currency = ${input.fromCurrency}
          AND to_currency = ${input.toCurrency}
        ORDER BY effective_date DESC
        LIMIT 1
      `));

      if (!row) {
        return { found: false, fromCurrency: input.fromCurrency, toCurrency: input.toCurrency, rate: null };
      }

      const r = row as any;
      return {
        found: true,
        fromCurrency: r.from_currency,
        toCurrency: r.to_currency,
        rate: Number(r.rate),
        effectiveDate: r.effective_date,
        source: r.source,
      };
    }),

  runRevaluation: requirePermission("finance:currency:manage")
    .input(z.object({
      revaluationDate: z.string(),
      baseCurrency: z.string().length(3).default("CNY"),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = nowISO();
      const revalCode = `REVAL-${input.revaluationDate.replace(/-/g, "")}`;

      log.info({ revalCode, date: input.revaluationDate, baseCurrency: input.baseCurrency }, "running FX revaluation");

      // Get all foreign currency GL balances
      const balances = qRows(await db.execute(sql`
        SELECT gl_account_code, currency, SUM(amount)::numeric AS balance
        FROM gl_entries
        WHERE currency != ${input.baseCurrency}
          AND posting_date <= ${input.revaluationDate}
        GROUP BY gl_account_code, currency
        HAVING SUM(amount) != 0
        LIMIT 1000
      `));

      const balanceList = balances;
      let totalGainLoss = 0;
      const details: Array<{ glAccount: string; currency: string; balance: number; closingRate: number; revaluedAmount: number; gainLoss: number }> = [];

      for (const bal of balanceList) {
        const b = bal as any;
        // Get closing rate
        const rateRow = firstRow(await db.execute(sql`
          SELECT rate FROM exchange_rates
          WHERE from_currency = ${b.currency}
            AND to_currency = ${input.baseCurrency}
            AND effective_date <= ${input.revaluationDate}
          ORDER BY effective_date DESC
          LIMIT 1
        `));

        if (!rateRow) continue;

        const closingRate = Number((rateRow as any).rate);
        const balance = Number(b.balance);
        const revaluedAmount = Math.round(balance * closingRate * 100) / 100;

        // Get original book value in base currency
        const bookRow = firstRow(await db.execute(sql`
          SELECT COALESCE(SUM(base_currency_amount), 0)::numeric AS book_value
          FROM gl_entries
          WHERE gl_account_code = ${b.gl_account_code}
            AND currency = ${b.currency}
            AND posting_date <= ${input.revaluationDate}
        `));
        const bookValue = Number((bookRow as any)?.book_value ?? 0);
        const gainLoss = Math.round((revaluedAmount - bookValue) * 100) / 100;

        totalGainLoss += gainLoss;
        details.push({
          glAccount: b.gl_account_code,
          currency: b.currency,
          balance,
          closingRate,
          revaluedAmount,
          gainLoss,
        });
      }

      // Store revaluation record
      await db.execute(sql`
        INSERT INTO foreign_currency_revaluations (
          reval_code, revaluation_date, base_currency,
          total_gain_loss, detail_count, details_json,
          status, created_by, notes, created_at
        ) VALUES (
          ${revalCode}, ${input.revaluationDate}, ${input.baseCurrency},
          ${totalGainLoss}, ${details.length}, ${JSON.stringify(details)},
          'completed', ${ctx.user!.id}, ${input.notes ?? null}, ${now}
        ) RETURNING id
      `);

      log.info({ revalCode, totalGainLoss, detailCount: details.length }, "FX revaluation complete");

      return {
        success: true,
        revalCode,
        totalGainLoss: Math.round(totalGainLoss * 100) / 100,
        detailCount: details.length,
        details,
      };
    }),

  listRevaluations: requirePermission("finance:currency:view")
    .input(z.object({ ...paginationInput.shape }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { limit, offset } = paginate(input.page, input.pageSize);

      const rows = qRows(await db.execute(sql`
        SELECT id, reval_code, revaluation_date, base_currency, total_gain_loss,
               detail_count, status, created_by, notes, created_at
        FROM foreign_currency_revaluations
        ORDER BY revaluation_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `));

      const countRow = firstRow(await db.execute(sql`
        SELECT count(*)::int AS total FROM foreign_currency_revaluations
      `));

      return {
        items: rows,
        total: (countRow as any)?.total ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // ─────────────────────────────────────────────────────────────────────
  // P2-4: Financial Reports (6 procedures)
  // ─────────────────────────────────────────────────────────────────────

  listReportTemplates: requirePermission("finance:reports:view")
    .input(z.object({
      reportType: z.enum(["BS", "PL", "CF", "all"]).default("all"),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const type = input?.reportType ?? "all";

      const rows = type === "all"
        ? await db.execute(sql`SELECT * FROM financial_report_templates ORDER BY report_type, sort_order LIMIT 100`)
        : await db.execute(sql`SELECT * FROM financial_report_templates WHERE report_type = ${type} ORDER BY sort_order LIMIT 100`);

      return { items: rows };
    }),

  createReportTemplate: requirePermission("finance:reports:manage")
    .input(z.object({
      reportType: z.enum(["BS", "PL", "CF"]),
      templateName: z.string().max(200),
      lineItems: z.array(z.object({
        lineCode: z.string().max(50),
        lineName: z.string().max(200),
        lineNameEn: z.string().max(200).optional(),
        formula: z.string().max(500), // GL account codes: "1001+1002" or "SUM(A1:A5)"
        lineType: z.enum(["detail", "subtotal", "total", "header", "blank"]),
        indent: z.number().int().min(0).max(5).default(0),
        sortOrder: z.number().int(),
        sign: z.enum(["normal", "reversed"]).default("normal"),
      })),
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = nowISO();

      log.info({ reportType: input.reportType, templateName: input.templateName, lineCount: input.lineItems.length }, "creating report template");

      const row = firstRow(await db.execute(sql`
        INSERT INTO financial_report_templates (
          report_type, template_name, line_items_json,
          description, created_by, created_at, updated_at
        ) VALUES (
          ${input.reportType}, ${input.templateName}, ${JSON.stringify(input.lineItems)},
          ${input.description ?? null}, ${ctx.user!.id}, ${now}, ${now}
        ) RETURNING id
      `));

      return { success: true, id: (row as any)?.id };
    }),

  generateReport: requirePermission("finance:reports:manage")
    .input(z.object({
      templateId: z.number().int(),
      periodStart: z.string(),
      periodEnd: z.string(),
      buCode: z.string().max(50).optional(),
      title: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = nowISO();

      // Get template
      const template = firstRow(await db.execute(sql`
        SELECT * FROM financial_report_templates WHERE id = ${input.templateId} LIMIT 1
      `));
      if (!template) return { success: false, message: "报表模板不存在" };

      const t = template as any;
      let lineItems: any[];
      try {
        lineItems = typeof t.line_items_json === "string" ? JSON.parse(t.line_items_json) : t.line_items_json;
      } catch {
        return { success: false, message: "模板行项目格式错误" };
      }

      log.info({ templateId: input.templateId, period: `${input.periodStart}~${input.periodEnd}`, lines: lineItems.length }, "generating financial report");

      // 从GL余额表聚合实际数据
      const [startYear, startMonth] = input.periodStart.split("-").map(Number);
      const [endYear, endMonth] = input.periodEnd.split("-").map(Number);
      const balances = await db.execute(sql`
        SELECT ab.account_code, ga.account_name, ga.account_type, ga.balance_direction,
               COALESCE(ab.end_balance, 0) AS end_balance,
               COALESCE(ab.period_debit, 0) AS period_debit,
               COALESCE(ab.period_credit, 0) AS period_credit
        FROM account_balances ab
        JOIN gl_accounts ga ON ab.account_id = ga.id
        WHERE ab.fiscal_year >= ${startYear} AND ab.fiscal_year <= ${endYear}
          AND ab.fiscal_period >= ${startMonth} AND ab.fiscal_period <= ${endMonth}
        ORDER BY ga.account_code
      `);
      const balanceRows = (balances as any).rows ?? [];

      // Build lookup: account_code -> aggregated balance
      const balanceLookup = new Map<string, { endBalance: number; periodDebit: number; periodCredit: number }>();
      for (const row of balanceRows) {
        const code = String((row as any).account_code);
        const prev = balanceLookup.get(code) ?? { endBalance: 0, periodDebit: 0, periodCredit: 0 };
        prev.endBalance += Number((row as any).end_balance ?? 0);
        prev.periodDebit += Number((row as any).period_debit ?? 0);
        prev.periodCredit += Number((row as any).period_credit ?? 0);
        balanceLookup.set(code, prev);
      }

      // Calculate each line from GL data
      const reportLines: Array<{ lineCode: string; lineName: string; lineType: string; amount: number; indent: number }> = [];

      for (const line of lineItems) {
        if (line.lineType === "header" || line.lineType === "blank") {
          reportLines.push({ lineCode: line.lineCode, lineName: line.lineName, lineType: line.lineType, amount: 0, indent: line.indent ?? 0 });
          continue;
        }

        if (line.lineType === "subtotal" || line.lineType === "total") {
          // Sum referenced lines
          const referencedCodes = (line.formula ?? "").split("+").map((s: string) => s.trim()).filter(Boolean);
          const sum = reportLines
            .filter(rl => referencedCodes.includes(rl.lineCode))
            .reduce((acc, rl) => acc + rl.amount, 0);
          reportLines.push({ lineCode: line.lineCode, lineName: line.lineName, lineType: line.lineType, amount: Math.round(sum * 100) / 100, indent: line.indent ?? 0 });
          continue;
        }

        // Detail line: formula contains GL account codes like "1001+1002" or "1601-1602"
        const formula = (line.formula ?? "") as string;
        const glCodes = formula.match(/\d{4}/g) ?? [];
        let amount = 0;

        for (const code of glCodes) {
          const isSubtract = formula.indexOf(`-${code}`) >= 0;

          // Try account_balances lookup first, fall back to gl_entries query
          const lookupMatch = balanceLookup.get(code);
          let bal = 0;
          if (lookupMatch) {
            bal = lookupMatch.periodDebit - lookupMatch.periodCredit;
          } else {
            // Fallback: query gl_entries directly (handles prefix matching)
            const balRow = firstRow(await db.execute(sql`
              SELECT COALESCE(SUM(
                CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END
              ), 0)::numeric AS balance
              FROM gl_entries
              WHERE gl_account_code LIKE ${code + "%"}
                AND posting_date >= ${input.periodStart}
                AND posting_date <= ${input.periodEnd}
                ${input.buCode ? sql`AND bu_code = ${input.buCode}` : sql``}
            `));
            bal = Number((balRow as any)?.balance ?? 0);
          }

          amount += isSubtract ? -bal : bal;
        }

        if (line.sign === "reversed") amount = -amount;
        reportLines.push({ lineCode: line.lineCode, lineName: line.lineName, lineType: line.lineType, amount: Math.round(amount * 100) / 100, indent: line.indent ?? 0 });
      }

      // Save snapshot
      const snapshotTitle = input.title ?? `${t.template_name} ${input.periodStart}~${input.periodEnd}`;
      const snapshot = firstRow(await db.execute(sql`
        INSERT INTO financial_report_snapshots (
          template_id, report_type, title, period_start, period_end,
          bu_code, report_data_json, generated_by, generated_at, created_at
        ) VALUES (
          ${input.templateId}, ${t.report_type}, ${snapshotTitle},
          ${input.periodStart}, ${input.periodEnd},
          ${input.buCode ?? null}, ${JSON.stringify(reportLines)},
          ${ctx.user!.id}, ${now}, ${now}
        ) RETURNING id
      `));

      log.info({ snapshotId: (snapshot as any)?.id, lineCount: reportLines.length }, "report generated");

      return {
        success: true,
        snapshotId: (snapshot as any)?.id,
        title: snapshotTitle,
        reportType: t.report_type,
        lines: reportLines,
      };
    }),

  getReportSnapshot: requirePermission("finance:reports:view")
    .input(z.object({ snapshotId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const row = firstRow(await db.execute(sql`
        SELECT * FROM financial_report_snapshots WHERE id = ${input.snapshotId} LIMIT 1
      `));

      if (!row) return { found: false };

      const r = row as any;
      let lines: any[];
      try {
        lines = typeof r.report_data_json === "string" ? JSON.parse(r.report_data_json) : r.report_data_json;
      } catch {
        lines = [];
      }

      return {
        found: true,
        id: r.id,
        title: r.title,
        reportType: r.report_type,
        periodStart: r.period_start,
        periodEnd: r.period_end,
        buCode: r.bu_code,
        lines,
        generatedBy: r.generated_by,
        generatedAt: r.generated_at,
      };
    }),

  comparePeriodsReport: requirePermission("finance:reports:view")
    .input(z.object({
      currentSnapshotId: z.number().int(),
      priorSnapshotId: z.number().int(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const current = firstRow(await db.execute(sql`
        SELECT * FROM financial_report_snapshots WHERE id = ${input.currentSnapshotId} LIMIT 1
      `));
      const prior = firstRow(await db.execute(sql`
        SELECT * FROM financial_report_snapshots WHERE id = ${input.priorSnapshotId} LIMIT 1
      `));

      if (!current || !prior) return { success: false, message: "快照不存在" };

      const parseLine = (r: any) => {
        try {
          return typeof r.report_data_json === "string" ? JSON.parse(r.report_data_json) : r.report_data_json;
        } catch {
          return [];
        }
      };

      const currentLines: any[] = parseLine(current);
      const priorLines: any[] = parseLine(prior);
      const priorMap = new Map(priorLines.map((l: any) => [l.lineCode, l]));

      const comparison = currentLines.map((line: any) => {
        const priorLine = priorMap.get(line.lineCode);
        const priorAmount = priorLine?.amount ?? 0;
        const change = Math.round((line.amount - priorAmount) * 100) / 100;
        const changePct = priorAmount !== 0 ? Math.round((change / Math.abs(priorAmount)) * 10000) / 100 : null;
        return {
          lineCode: line.lineCode,
          lineName: line.lineName,
          lineType: line.lineType,
          currentAmount: line.amount,
          priorAmount,
          change,
          changePct,
          indent: line.indent,
        };
      });

      return {
        success: true,
        currentPeriod: { start: (current as any).period_start, end: (current as any).period_end },
        priorPeriod: { start: (prior as any).period_start, end: (prior as any).period_end },
        comparison,
      };
    }),

  seedDefaultTemplates: requirePermission("finance:reports:manage")
    .mutation(async ({ ctx }) => {
      const db = await requireDb();
      const now = nowISO();
      const userId = ctx.user!.id;

      log.info("seeding default CN-GAAP financial report templates");

      // ── Balance Sheet (资产负债表) ──
      const bsLines = [
        { lineCode: "BS_H_ASSET", lineName: "资产", lineNameEn: "Assets", formula: "", lineType: "header" as const, indent: 0, sortOrder: 1, sign: "normal" as const },
        { lineCode: "BS_H_CA", lineName: "流动资产", lineNameEn: "Current Assets", formula: "", lineType: "header" as const, indent: 1, sortOrder: 2, sign: "normal" as const },
        { lineCode: "BS_CASH", lineName: "货币资金", lineNameEn: "Cash & Bank", formula: "1001+1002", lineType: "detail" as const, indent: 2, sortOrder: 3, sign: "normal" as const },
        { lineCode: "BS_AR", lineName: "应收账款", lineNameEn: "Accounts Receivable", formula: "1122", lineType: "detail" as const, indent: 2, sortOrder: 4, sign: "normal" as const },
        { lineCode: "BS_PREPAY", lineName: "预付账款", lineNameEn: "Prepayments", formula: "1123", lineType: "detail" as const, indent: 2, sortOrder: 5, sign: "normal" as const },
        { lineCode: "BS_INV", lineName: "存货", lineNameEn: "Inventory", formula: "1405", lineType: "detail" as const, indent: 2, sortOrder: 6, sign: "normal" as const },
        { lineCode: "BS_CA_TOTAL", lineName: "流动资产合计", lineNameEn: "Total Current Assets", formula: "BS_CASH+BS_AR+BS_PREPAY+BS_INV", lineType: "subtotal" as const, indent: 1, sortOrder: 7, sign: "normal" as const },
        { lineCode: "BS_H_NCA", lineName: "非流动资产", lineNameEn: "Non-Current Assets", formula: "", lineType: "header" as const, indent: 1, sortOrder: 8, sign: "normal" as const },
        { lineCode: "BS_FA", lineName: "固定资产", lineNameEn: "Fixed Assets (Net)", formula: "1601-1602", lineType: "detail" as const, indent: 2, sortOrder: 9, sign: "normal" as const },
        { lineCode: "BS_CIP", lineName: "在建工程", lineNameEn: "Construction in Progress", formula: "1604", lineType: "detail" as const, indent: 2, sortOrder: 10, sign: "normal" as const },
        { lineCode: "BS_TOTAL_ASSET", lineName: "资产总计", lineNameEn: "Total Assets", formula: "BS_CA_TOTAL+BS_FA+BS_CIP", lineType: "total" as const, indent: 0, sortOrder: 11, sign: "normal" as const },
        { lineCode: "BS_BLANK1", lineName: "", lineNameEn: "", formula: "", lineType: "blank" as const, indent: 0, sortOrder: 12, sign: "normal" as const },
        { lineCode: "BS_H_LIAB", lineName: "负债", lineNameEn: "Liabilities", formula: "", lineType: "header" as const, indent: 0, sortOrder: 13, sign: "normal" as const },
        { lineCode: "BS_H_CL", lineName: "流动负债", lineNameEn: "Current Liabilities", formula: "", lineType: "header" as const, indent: 1, sortOrder: 14, sign: "normal" as const },
        { lineCode: "BS_STLOAN", lineName: "短期借款", lineNameEn: "Short-term Borrowings", formula: "2001", lineType: "detail" as const, indent: 2, sortOrder: 15, sign: "normal" as const },
        { lineCode: "BS_AP", lineName: "应付账款", lineNameEn: "Accounts Payable", formula: "2202", lineType: "detail" as const, indent: 2, sortOrder: 16, sign: "normal" as const },
        { lineCode: "BS_ADV", lineName: "预收账款", lineNameEn: "Advance Receipts", formula: "2203", lineType: "detail" as const, indent: 2, sortOrder: 17, sign: "normal" as const },
        { lineCode: "BS_PAYROLL", lineName: "应付职工薪酬", lineNameEn: "Employee Benefits Payable", formula: "2211", lineType: "detail" as const, indent: 2, sortOrder: 18, sign: "normal" as const },
        { lineCode: "BS_TAX", lineName: "应交税费", lineNameEn: "Taxes Payable", formula: "2221", lineType: "detail" as const, indent: 2, sortOrder: 19, sign: "normal" as const },
        { lineCode: "BS_CL_TOTAL", lineName: "流动负债合计", lineNameEn: "Total Current Liabilities", formula: "BS_STLOAN+BS_AP+BS_ADV+BS_PAYROLL+BS_TAX", lineType: "subtotal" as const, indent: 1, sortOrder: 20, sign: "normal" as const },
        { lineCode: "BS_TOTAL_LIAB", lineName: "负债合计", lineNameEn: "Total Liabilities", formula: "BS_CL_TOTAL", lineType: "total" as const, indent: 0, sortOrder: 21, sign: "normal" as const },
        { lineCode: "BS_BLANK2", lineName: "", lineNameEn: "", formula: "", lineType: "blank" as const, indent: 0, sortOrder: 22, sign: "normal" as const },
        { lineCode: "BS_H_EQ", lineName: "所有者权益", lineNameEn: "Owners Equity", formula: "", lineType: "header" as const, indent: 0, sortOrder: 23, sign: "normal" as const },
        { lineCode: "BS_CAPITAL", lineName: "实收资本", lineNameEn: "Paid-in Capital", formula: "4001", lineType: "detail" as const, indent: 1, sortOrder: 24, sign: "normal" as const },
        { lineCode: "BS_CAPSURP", lineName: "资本公积", lineNameEn: "Capital Surplus", formula: "4002", lineType: "detail" as const, indent: 1, sortOrder: 25, sign: "normal" as const },
        { lineCode: "BS_SURPRES", lineName: "盈余公积", lineNameEn: "Surplus Reserve", formula: "4101", lineType: "detail" as const, indent: 1, sortOrder: 26, sign: "normal" as const },
        { lineCode: "BS_RETEAR", lineName: "未分配利润", lineNameEn: "Retained Earnings", formula: "4104", lineType: "detail" as const, indent: 1, sortOrder: 27, sign: "normal" as const },
        { lineCode: "BS_TOTAL_EQ", lineName: "所有者权益合计", lineNameEn: "Total Owners Equity", formula: "BS_CAPITAL+BS_CAPSURP+BS_SURPRES+BS_RETEAR", lineType: "subtotal" as const, indent: 0, sortOrder: 28, sign: "normal" as const },
        { lineCode: "BS_TOTAL_LE", lineName: "负债和所有者权益总计", lineNameEn: "Total Liabilities & Equity", formula: "BS_TOTAL_LIAB+BS_TOTAL_EQ", lineType: "total" as const, indent: 0, sortOrder: 29, sign: "normal" as const },
      ];

      // ── Income Statement (利润表) ──
      const plLines = [
        { lineCode: "PL_REV", lineName: "营业收入", lineNameEn: "Revenue", formula: "6001", lineType: "detail" as const, indent: 0, sortOrder: 1, sign: "reversed" as const },
        { lineCode: "PL_COGS", lineName: "营业成本", lineNameEn: "Cost of Goods Sold", formula: "6401+6402", lineType: "detail" as const, indent: 0, sortOrder: 2, sign: "normal" as const },
        { lineCode: "PL_GP", lineName: "毛利", lineNameEn: "Gross Profit", formula: "PL_REV+PL_COGS", lineType: "subtotal" as const, indent: 0, sortOrder: 3, sign: "normal" as const },
        { lineCode: "PL_SURTAX", lineName: "税金及附加", lineNameEn: "Business Taxes & Surcharges", formula: "6403", lineType: "detail" as const, indent: 0, sortOrder: 4, sign: "normal" as const },
        { lineCode: "PL_SELL", lineName: "销售费用", lineNameEn: "Selling Expenses", formula: "6601", lineType: "detail" as const, indent: 0, sortOrder: 5, sign: "normal" as const },
        { lineCode: "PL_ADMIN", lineName: "管理费用", lineNameEn: "Administrative Expenses", formula: "6602", lineType: "detail" as const, indent: 0, sortOrder: 6, sign: "normal" as const },
        { lineCode: "PL_RND", lineName: "研发费用", lineNameEn: "R&D Expenses", formula: "6603", lineType: "detail" as const, indent: 0, sortOrder: 7, sign: "normal" as const },
        { lineCode: "PL_FIN", lineName: "财务费用", lineNameEn: "Financial Expenses", formula: "6604", lineType: "detail" as const, indent: 0, sortOrder: 8, sign: "normal" as const },
        { lineCode: "PL_OPINC", lineName: "营业利润", lineNameEn: "Operating Profit", formula: "PL_GP+PL_SURTAX+PL_SELL+PL_ADMIN+PL_RND+PL_FIN", lineType: "subtotal" as const, indent: 0, sortOrder: 9, sign: "normal" as const },
        { lineCode: "PL_NOPINC", lineName: "营业外收入", lineNameEn: "Non-operating Income", formula: "6301", lineType: "detail" as const, indent: 0, sortOrder: 10, sign: "reversed" as const },
        { lineCode: "PL_NOPEXP", lineName: "营业外支出", lineNameEn: "Non-operating Expenses", formula: "6711", lineType: "detail" as const, indent: 0, sortOrder: 11, sign: "normal" as const },
        { lineCode: "PL_PBT", lineName: "利润总额", lineNameEn: "Profit Before Tax", formula: "PL_OPINC+PL_NOPINC+PL_NOPEXP", lineType: "subtotal" as const, indent: 0, sortOrder: 12, sign: "normal" as const },
        { lineCode: "PL_ITAX", lineName: "所得税费用", lineNameEn: "Income Tax Expense", formula: "6801", lineType: "detail" as const, indent: 0, sortOrder: 13, sign: "normal" as const },
        { lineCode: "PL_NI", lineName: "净利润", lineNameEn: "Net Profit", formula: "PL_PBT+PL_ITAX", lineType: "total" as const, indent: 0, sortOrder: 14, sign: "normal" as const },
      ];

      // Insert both templates
      const bsRow = firstRow(await db.execute(sql`
        INSERT INTO financial_report_templates (
          report_type, template_name, line_items_json, description,
          is_default, created_by, created_at, updated_at
        ) VALUES (
          'BS', '资产负债表 (CN-GAAP)', ${JSON.stringify(bsLines)},
          'CN-GAAP标准资产负债表模板 — 制造业适用',
          true, ${userId}, ${now}, ${now}
        ) ON CONFLICT DO NOTHING
        RETURNING id
      `));

      const plRow = firstRow(await db.execute(sql`
        INSERT INTO financial_report_templates (
          report_type, template_name, line_items_json, description,
          is_default, created_by, created_at, updated_at
        ) VALUES (
          'PL', '利润表 (CN-GAAP)', ${JSON.stringify(plLines)},
          'CN-GAAP标准利润表模板 — 制造业适用',
          true, ${userId}, ${now}, ${now}
        ) ON CONFLICT DO NOTHING
        RETURNING id
      `));

      log.info({ bsId: (bsRow as any)?.id, plId: (plRow as any)?.id }, "default templates seeded");

      return {
        success: true,
        templates: [
          { type: "BS", name: "资产负债表 (CN-GAAP)", id: (bsRow as any)?.id, lines: bsLines.length },
          { type: "PL", name: "利润表 (CN-GAAP)", id: (plRow as any)?.id, lines: plLines.length },
        ],
      };
    }),

  // ─────────────────────────────────────────────────────────────────────
  // P2-5: Project Cost Benchmarking (6 procedures)
  // ─────────────────────────────────────────────────────────────────────

  createBenchmark: requirePermission("finance:benchmark:manage")
    .input(z.object({
      projectId: z.number().int(),
      projectCode: z.string().max(50),
      projectName: z.string().max(200),
      equipmentType: z.string().max(100),
      industry: z.string().max(100).optional(),
      scale: z.enum(["small", "medium", "large"]).optional(),
      totalCost: z.number().positive(),
      materialCost: z.number().min(0),
      laborCost: z.number().min(0),
      overheadCost: z.number().min(0),
      subcontractCost: z.number().min(0).default(0),
      designCost: z.number().min(0).default(0),
      contractAmount: z.number().positive(),
      durationMonths: z.number().int().positive(),
      completionDate: z.string(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = nowISO();

      const grossMargin = Math.round(((input.contractAmount - input.totalCost) / input.contractAmount) * 10000) / 100;
      const materialRatio = Math.round((input.materialCost / input.totalCost) * 10000) / 100;
      const laborRatio = Math.round((input.laborCost / input.totalCost) * 10000) / 100;
      const overheadRatio = Math.round((input.overheadCost / input.totalCost) * 10000) / 100;

      log.info({ projectCode: input.projectCode, equipmentType: input.equipmentType, grossMargin }, "creating benchmark");

      const row = firstRow(await db.execute(sql`
        INSERT INTO project_cost_benchmarks (
          project_id, project_code, project_name, equipment_type,
          industry, scale, total_cost, material_cost, labor_cost,
          overhead_cost, subcontract_cost, design_cost,
          contract_amount, gross_margin_pct, material_ratio_pct,
          labor_ratio_pct, overhead_ratio_pct,
          duration_months, completion_date, notes,
          created_by, created_at, updated_at
        ) VALUES (
          ${input.projectId}, ${input.projectCode}, ${input.projectName}, ${input.equipmentType},
          ${input.industry ?? null}, ${input.scale ?? null}, ${input.totalCost}, ${input.materialCost}, ${input.laborCost},
          ${input.overheadCost}, ${input.subcontractCost}, ${input.designCost},
          ${input.contractAmount}, ${grossMargin}, ${materialRatio},
          ${laborRatio}, ${overheadRatio},
          ${input.durationMonths}, ${input.completionDate}, ${input.notes ?? null},
          ${ctx.user!.id}, ${now}, ${now}
        ) RETURNING id
      `));

      return { success: true, id: (row as any)?.id, grossMargin, materialRatio, laborRatio, overheadRatio };
    }),

  listBenchmarks: requirePermission("finance:benchmark:view")
    .input(z.object({
      equipmentType: z.string().optional(),
      industry: z.string().optional(),
      scale: z.enum(["small", "medium", "large"]).optional(),
      ...paginationInput.shape,
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { limit, offset } = paginate(input.page, input.pageSize);

      const conditions: ReturnType<typeof sql>[] = [sql`1=1`];
      if (input.equipmentType) conditions.push(sql`equipment_type = ${input.equipmentType}`);
      if (input.industry) conditions.push(sql`industry = ${input.industry}`);
      if (input.scale) conditions.push(sql`scale = ${input.scale}`);

      const whereClause = sql.join(conditions, sql` AND `);

      const rows = qRows(await db.execute(
        sql`SELECT * FROM project_cost_benchmarks WHERE ${whereClause} ORDER BY completion_date DESC LIMIT ${limit} OFFSET ${offset}`
      ));

      const countRow = firstRow(await db.execute(
        sql`SELECT count(*)::int AS total FROM project_cost_benchmarks WHERE ${whereClause}`
      ));

      return {
        items: rows,
        total: (countRow as any)?.total ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  getBenchmark: requirePermission("finance:benchmark:view")
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const row = firstRow(await db.execute(sql`
        SELECT * FROM project_cost_benchmarks WHERE id = ${input.id} LIMIT 1
      `));

      if (!row) return { found: false };
      return { found: true, benchmark: row };
    }),

  generateQuoteReference: requirePermission("finance:benchmark:view")
    .input(z.object({
      equipmentType: z.string().max(100),
      estimatedScale: z.enum(["small", "medium", "large"]).optional(),
      estimatedDuration: z.number().int().positive().optional(),
      adjustmentFactors: z.record(z.string(), z.number()).optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      log.info({ equipmentType: input.equipmentType, scale: input.estimatedScale }, "generating quote reference from benchmarks");

      // Find similar completed projects
      const conditions: ReturnType<typeof sql>[] = [sql`equipment_type = ${input.equipmentType}`];
      if (input.estimatedScale) conditions.push(sql`scale = ${input.estimatedScale}`);

      const whereClause = sql.join(conditions, sql` AND `);
      const benchmarks = qRows(await db.execute(
        sql`SELECT * FROM project_cost_benchmarks WHERE ${whereClause} ORDER BY completion_date DESC LIMIT 20`
      ));

      const list = benchmarks;
      if (list.length === 0) {
        return { found: false, message: `无 ${input.equipmentType} 类型的历史对标数据` };
      }

      // Calculate averages
      const avg = (field: string) => {
        const vals = list.map((b: any) => Number(b[field] ?? 0)).filter(v => v > 0);
        return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100 : 0;
      };

      const reference = {
        sampleSize: list.length,
        avgTotalCost: avg("total_cost"),
        avgContractAmount: avg("contract_amount"),
        avgGrossMarginPct: avg("gross_margin_pct"),
        avgMaterialRatioPct: avg("material_ratio_pct"),
        avgLaborRatioPct: avg("labor_ratio_pct"),
        avgOverheadRatioPct: avg("overhead_ratio_pct"),
        avgDurationMonths: avg("duration_months"),
        costRange: {
          min: Math.min(...list.map((b: any) => Number(b.total_cost ?? 0))),
          max: Math.max(...list.map((b: any) => Number(b.total_cost ?? 0))),
        },
        marginRange: {
          min: Math.min(...list.map((b: any) => Number(b.gross_margin_pct ?? 0))),
          max: Math.max(...list.map((b: any) => Number(b.gross_margin_pct ?? 0))),
        },
      };

      // Apply adjustment factors if provided
      let adjustedCost = reference.avgTotalCost;
      const appliedAdjustments: Array<{ factor: string; multiplier: number }> = [];

      if (input.adjustmentFactors) {
        for (const [factor, multiplier] of Object.entries(input.adjustmentFactors)) {
          adjustedCost = Math.round(adjustedCost * multiplier * 100) / 100;
          appliedAdjustments.push({ factor, multiplier });
        }
      }

      return {
        found: true,
        equipmentType: input.equipmentType,
        reference,
        adjustedEstimate: adjustedCost,
        appliedAdjustments,
      };
    }),

  compareWithBenchmark: requirePermission("finance:benchmark:view")
    .input(z.object({
      projectId: z.number().int(),
      benchmarkId: z.number().int(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // Get current project costs
      const project = firstRow(await db.execute(sql`
        SELECT id, project_code, project_name, budget_amount
        FROM projects WHERE id = ${input.projectId} LIMIT 1
      `));

      const benchmark = firstRow(await db.execute(sql`
        SELECT * FROM project_cost_benchmarks WHERE id = ${input.benchmarkId} LIMIT 1
      `));

      if (!project || !benchmark) return { success: false, message: "项目或对标数据不存在" };

      const p = project as any;
      const b = benchmark as any;

      // Get actual costs from work_logs / gl_entries
      const actualRow = firstRow(await db.execute(sql`
        SELECT COALESCE(SUM(cost_amount), 0)::numeric AS actual_cost
        FROM work_logs WHERE project_id = ${input.projectId}
      `));

      const actualCost = Number((actualRow as any)?.actual_cost ?? 0);
      const budgetAmount = Number(p.budget_amount ?? 0);
      const benchmarkCost = Number(b.total_cost ?? 0);

      return {
        success: true,
        project: {
          id: p.id,
          code: p.project_code,
          name: p.project_name,
          budget: budgetAmount,
          actualCost,
        },
        benchmark: {
          id: b.id,
          projectCode: b.project_code,
          totalCost: benchmarkCost,
          grossMarginPct: Number(b.gross_margin_pct),
          materialRatioPct: Number(b.material_ratio_pct),
          laborRatioPct: Number(b.labor_ratio_pct),
        },
        comparison: {
          costVsBenchmark: Math.round((actualCost - benchmarkCost) * 100) / 100,
          costVsBenchmarkPct: benchmarkCost > 0
            ? Math.round(((actualCost - benchmarkCost) / benchmarkCost) * 10000) / 100
            : null,
          costVsBudget: Math.round((actualCost - budgetAmount) * 100) / 100,
          costVsBudgetPct: budgetAmount > 0
            ? Math.round(((actualCost - budgetAmount) / budgetAmount) * 10000) / 100
            : null,
        },
      };
    }),

  getIndustryAverages: requirePermission("finance:benchmark:view")
    .input(z.object({
      equipmentType: z.string().max(100).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();

      const typeFilter = input?.equipmentType
        ? sql`WHERE equipment_type = ${input.equipmentType}`
        : sql``;

      const rows = qRows(await db.execute(sql`
        SELECT
          equipment_type,
          count(*)::int AS project_count,
          ROUND(AVG(gross_margin_pct)::numeric, 2) AS avg_gross_margin,
          ROUND(AVG(material_ratio_pct)::numeric, 2) AS avg_material_ratio,
          ROUND(AVG(labor_ratio_pct)::numeric, 2) AS avg_labor_ratio,
          ROUND(AVG(overhead_ratio_pct)::numeric, 2) AS avg_overhead_ratio,
          ROUND(AVG(total_cost)::numeric, 2) AS avg_total_cost,
          ROUND(AVG(duration_months)::numeric, 1) AS avg_duration
        FROM project_cost_benchmarks
        ${typeFilter}
        GROUP BY equipment_type
        ORDER BY project_count DESC
        LIMIT 50
      `));

      return { averages: rows };
    }),

  // ─────────────────────────────────────────────────────────────────────
  // P2-8: Auto-Depreciation (4 procedures)
  // ─────────────────────────────────────────────────────────────────────

  runMonthlyDepreciation: requirePermission("finance:depreciation:manage")
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/, "格式: YYYY-MM"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const periodStart = `${input.period}-01`;
      const now = nowISO();

      log.info({ period: input.period }, "running monthly depreciation for all active assets");

      // Fetch all active fixed assets
      const assets = qRows(await db.execute(sql`
        SELECT id, asset_code, asset_name, category, cost, salvage_value,
               useful_life_months, depreciation_method, accumulated_depreciation,
               in_service_date
        FROM fixed_assets
        WHERE status = 'active'
          AND in_service_date <= ${periodStart}
        ORDER BY id
        LIMIT 10000
      `));

      const assetList = assets;
      const results: Array<{
        assetId: number;
        assetCode: string;
        category: string;
        method: string;
        periodAmount: number;
        newAccumulated: number;
        netBookValue: number;
      }> = [];

      let totalDepreciation = 0;

      for (const asset of assetList) {
        const a = asset as any;
        const cost = Number(a.cost ?? 0);
        const salvage = Number(a.salvage_value ?? 0);
        const usefulLife = Number(a.useful_life_months ?? 0);
        const accumulated = Number(a.accumulated_depreciation ?? 0);
        const netBookValue = cost - accumulated;
        const method = a.depreciation_method ?? "straight_line";

        // Skip fully depreciated assets
        if (netBookValue <= salvage) continue;

        let periodAmount: number;
        if (method === "declining_balance") {
          periodAmount = decliningBalanceDepreciation(netBookValue, usefulLife);
          // Ensure we don't depreciate below salvage
          periodAmount = Math.min(periodAmount, netBookValue - salvage);
        } else {
          // Default: straight-line
          periodAmount = straightLineDepreciation(cost, salvage, usefulLife);
          periodAmount = Math.min(periodAmount, netBookValue - salvage);
        }

        if (periodAmount <= 0) continue;

        const newAccumulated = Math.round((accumulated + periodAmount) * 100) / 100;
        const newNBV = Math.round((cost - newAccumulated) * 100) / 100;

        // Update asset
        await db.execute(sql`
          UPDATE fixed_assets
          SET accumulated_depreciation = ${newAccumulated},
              last_depreciation_date = ${periodStart},
              updated_at = ${now}
          WHERE id = ${a.id}
        `);

        // Record depreciation entry
        await db.execute(sql`
          INSERT INTO depreciation_entries (
            asset_id, asset_code, period, depreciation_amount,
            accumulated_after, net_book_value_after, method,
            calculated_by, created_at
          ) VALUES (
            ${a.id}, ${a.asset_code}, ${input.period}, ${periodAmount},
            ${newAccumulated}, ${newNBV}, ${method},
            ${ctx.user!.id}, ${now}
          )
        `);

        totalDepreciation += periodAmount;
        results.push({
          assetId: a.id,
          assetCode: a.asset_code,
          category: a.category,
          method,
          periodAmount,
          newAccumulated,
          netBookValue: newNBV,
        });
      }

      log.info({ period: input.period, assetsProcessed: results.length, totalDepreciation }, "monthly depreciation complete");

      return {
        success: true,
        period: input.period,
        assetsProcessed: results.length,
        totalDepreciation: Math.round(totalDepreciation * 100) / 100,
        details: results,
      };
    }),

  postDepreciationToGL: requirePermission("finance:depreciation:manage")
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/, "格式: YYYY-MM"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = nowISO();
      const postingDate = `${input.period}-28`; // Post near month end

      log.info({ period: input.period }, "posting depreciation to GL");

      // Get depreciation entries for the period
      const entries = qRows(await db.execute(sql`
        SELECT de.asset_id, de.asset_code, de.depreciation_amount, de.method,
               fa.category
        FROM depreciation_entries de
        JOIN fixed_assets fa ON fa.id = de.asset_id
        WHERE de.period = ${input.period}
          AND de.posted_to_gl = false
        LIMIT 10000
      `));

      const entryList = entries;
      if (entryList.length === 0) {
        return { success: true, message: "本期无未过账的折旧分录", entriesPosted: 0 };
      }

      // Group by category for consolidated GL entries
      const categoryTotals = new Map<string, number>();
      for (const e of entryList) {
        const entry = e as any;
        const cat = entry.category ?? "general";
        categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + Number(entry.depreciation_amount));
      }

      let entriesPosted = 0;

      for (const [category, total] of Array.from(categoryTotals.entries())) {
        const amount = Math.round(total * 100) / 100;
        const depExpenseAccount = category === "production" ? "6602.01" : "6602.02"; // Admin expense sub-accounts
        const accumDepAccount = "1602"; // Accumulated depreciation

        // Debit: Depreciation Expense
        await db.execute(sql`
          INSERT INTO gl_entries (
            gl_account_code, entry_type, amount, currency, posting_date,
            description, source_type, source_ref, bu_code,
            created_by, created_at
          ) VALUES (
            ${depExpenseAccount}, 'debit', ${amount}, 'CNY', ${postingDate},
            ${"月度折旧-" + category + "-" + input.period}, 'depreciation', ${input.period},
            NULL, ${ctx.user!.id}, ${now}
          )
        `);

        // Credit: Accumulated Depreciation
        await db.execute(sql`
          INSERT INTO gl_entries (
            gl_account_code, entry_type, amount, currency, posting_date,
            description, source_type, source_ref, bu_code,
            created_by, created_at
          ) VALUES (
            ${accumDepAccount}, 'credit', ${amount}, 'CNY', ${postingDate},
            ${"月度折旧-" + category + "-" + input.period}, 'depreciation', ${input.period},
            NULL, ${ctx.user!.id}, ${now}
          )
        `);

        entriesPosted += 2;
      }

      // Mark depreciation entries as posted
      await db.execute(sql`
        UPDATE depreciation_entries
        SET posted_to_gl = true, posted_at = ${now}
        WHERE period = ${input.period} AND posted_to_gl = false
      `);

      log.info({ period: input.period, entriesPosted, categories: categoryTotals.size }, "depreciation posted to GL");

      // Event Bridge — 折旧过账事件通知
      try {
        const totalAmount = Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0);
        const glResult = processBusinessEvent({
          eventType: 'depreciation_posted',
          eventId: `EVT-DEPR-${input.period}`,
          sourceModule: 'finance-advanced',
          sourceDocType: 'depreciation',
          sourceDocId: 0,
          sourceDocCode: `DEPR-${input.period}`,
          amount: Math.round(totalAmount * 100) / 100,
          userId: ctx.user!.id,
          metadata: { period: input.period, entriesPosted, categoryBreakdown: Object.fromEntries(categoryTotals) },
          timestamp: new Date().toISOString(),
        });
        log.info({ glResult: glResult.glResult?.success }, 'GL Event Bridge通知完成(折旧)');
      } catch (glErr) {
        log.error({ err: glErr }, 'GL Event Bridge通知失败(不阻塞折旧过账)');
      }

      return {
        success: true,
        period: input.period,
        entriesPosted,
        categoryBreakdown: Object.fromEntries(categoryTotals),
      };
    }),

  getDepreciationSchedule: requirePermission("finance:depreciation:view")
    .input(z.object({ assetId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const asset = firstRow(await db.execute(sql`
        SELECT * FROM fixed_assets WHERE id = ${input.assetId} LIMIT 1
      `));

      if (!asset) return { found: false };

      const a = asset as any;
      const cost = Number(a.cost ?? 0);
      const salvage = Number(a.salvage_value ?? 0);
      const usefulLife = Number(a.useful_life_months ?? 0);
      const accumulated = Number(a.accumulated_depreciation ?? 0);
      const method = a.depreciation_method ?? "straight_line";
      const inServiceDate = a.in_service_date as string;

      // Build remaining schedule
      const schedule: Array<{ month: number; period: string; amount: number; accumulated: number; netBookValue: number }> = [];
      let runningAccumulated = accumulated;
      let runningNBV = cost - accumulated;

      // Determine current month offset
      const startDate = new Date(inServiceDate);
      const now = new Date();
      const monthsElapsed = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());

      for (let m = monthsElapsed + 1; m <= usefulLife && runningNBV > salvage; m++) {
        let amount: number;
        if (method === "declining_balance") {
          amount = decliningBalanceDepreciation(runningNBV, usefulLife);
          amount = Math.min(amount, runningNBV - salvage);
        } else {
          amount = straightLineDepreciation(cost, salvage, usefulLife);
          amount = Math.min(amount, runningNBV - salvage);
        }

        if (amount <= 0) break;

        runningAccumulated = Math.round((runningAccumulated + amount) * 100) / 100;
        runningNBV = Math.round((cost - runningAccumulated) * 100) / 100;

        const periodDate = new Date(startDate);
        periodDate.setMonth(periodDate.getMonth() + m);
        const period = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, "0")}`;

        schedule.push({ month: m, period, amount, accumulated: runningAccumulated, netBookValue: runningNBV });
      }

      // Get past depreciation history
      const history = qRows(await db.execute(sql`
        SELECT period, depreciation_amount, accumulated_after, net_book_value_after
        FROM depreciation_entries
        WHERE asset_id = ${input.assetId}
        ORDER BY period
        LIMIT 500
      `));

      return {
        found: true,
        asset: {
          id: a.id,
          code: a.asset_code,
          name: a.asset_name,
          category: a.category,
          cost,
          salvage,
          usefulLifeMonths: usefulLife,
          method,
          inServiceDate,
          currentAccumulated: accumulated,
          currentNBV: cost - accumulated,
        },
        history: history,
        futureSchedule: schedule,
      };
    }),

  getDepreciationSummary: requirePermission("finance:depreciation:view")
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/, "格式: YYYY-MM"),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // By category
      const byCategory = qRows(await db.execute(sql`
        SELECT fa.category,
               count(*)::int AS asset_count,
               ROUND(SUM(de.depreciation_amount)::numeric, 2) AS total_depreciation,
               ROUND(SUM(fa.accumulated_depreciation)::numeric, 2) AS total_accumulated,
               ROUND(SUM(fa.cost - fa.accumulated_depreciation)::numeric, 2) AS total_net_book_value,
               ROUND(SUM(fa.cost)::numeric, 2) AS total_cost
        FROM depreciation_entries de
        JOIN fixed_assets fa ON fa.id = de.asset_id
        WHERE de.period = ${input.period}
        GROUP BY fa.category
        ORDER BY total_depreciation DESC
        LIMIT 50
      `));

      const categories = byCategory;

      // Totals
      const totalDepreciation = categories.reduce((sum: number, c: any) => sum + Number(c.total_depreciation ?? 0), 0);
      const totalAccumulated = categories.reduce((sum: number, c: any) => sum + Number(c.total_accumulated ?? 0), 0);
      const totalNBV = categories.reduce((sum: number, c: any) => sum + Number(c.total_net_book_value ?? 0), 0);
      const totalCost = categories.reduce((sum: number, c: any) => sum + Number(c.total_cost ?? 0), 0);
      const totalAssets = categories.reduce((sum: number, c: any) => sum + Number(c.asset_count ?? 0), 0);

      return {
        period: input.period,
        totalAssets,
        totalDepreciation: Math.round(totalDepreciation * 100) / 100,
        totalAccumulated: Math.round(totalAccumulated * 100) / 100,
        totalNetBookValue: Math.round(totalNBV * 100) / 100,
        totalOriginalCost: Math.round(totalCost * 100) / 100,
        depreciationRatio: totalCost > 0 ? Math.round((totalAccumulated / totalCost) * 10000) / 100 : 0,
        byCategory: categories,
      };
    }),

  // ─────────────────────────────────────────────────────────────────────
  // Dashboard (2 procedures)
  // ─────────────────────────────────────────────────────────────────────

  getFinanceAdvancedDashboard: requirePermission("finance:dashboard:view")
    .query(async () => {
      const db = await requireDb();

      // Bank reconciliation status
      const reconStatus = firstRow(await db.execute(sql`
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status = 'approved')::int AS approved,
          count(*) FILTER (WHERE status = 'calculated')::int AS pending_approval,
          count(*) FILTER (WHERE status = 'draft')::int AS draft
        FROM bank_reconciliations
        WHERE reconciliation_date >= (CURRENT_DATE - INTERVAL '90 days')
      `));

      // EVM health across projects
      const evmRows = qRows(await db.execute(sql`
        SELECT DISTINCT ON (project_id) health_status
        FROM project_earned_value
        ORDER BY project_id, snapshot_date DESC
        LIMIT 100
      `));
      const evmList = evmRows;
      const evmHealth = {
        green: evmList.filter((r: any) => r.health_status === "green").length,
        yellow: evmList.filter((r: any) => r.health_status === "yellow").length,
        red: evmList.filter((r: any) => r.health_status === "red").length,
      };

      // FX exposure
      const fxRow = firstRow(await db.execute(sql`
        SELECT count(DISTINCT currency)::int AS foreign_currencies,
               COALESCE(SUM(ABS(amount)), 0)::numeric AS total_exposure
        FROM gl_entries
        WHERE currency != 'CNY'
          AND posting_date >= (CURRENT_DATE - INTERVAL '30 days')
      `));

      // Report generation status (this month)
      const reportRow = firstRow(await db.execute(sql`
        SELECT count(*)::int AS reports_generated
        FROM financial_report_snapshots
        WHERE generated_at >= date_trunc('month', CURRENT_DATE)
      `));

      // Depreciation status (current month)
      const currentPeriod = new Date().toISOString().slice(0, 7);
      const depRow = firstRow(await db.execute(sql`
        SELECT count(*)::int AS assets_depreciated,
               COALESCE(SUM(depreciation_amount), 0)::numeric AS total_depreciation
        FROM depreciation_entries
        WHERE period = ${currentPeriod}
      `));

      return {
        bankReconciliation: {
          total: (reconStatus as any)?.total ?? 0,
          approved: (reconStatus as any)?.approved ?? 0,
          pendingApproval: (reconStatus as any)?.pending_approval ?? 0,
          draft: (reconStatus as any)?.draft ?? 0,
        },
        evmHealth,
        fxExposure: {
          foreignCurrencies: (fxRow as any)?.foreign_currencies ?? 0,
          totalExposure: Number((fxRow as any)?.total_exposure ?? 0),
        },
        reportsGenerated: (reportRow as any)?.reports_generated ?? 0,
        depreciation: {
          period: currentPeriod,
          assetsDepreciated: (depRow as any)?.assets_depreciated ?? 0,
          totalAmount: Number((depRow as any)?.total_depreciation ?? 0),
        },
      };
    }),

  getMonthEndStatus: requirePermission("finance:dashboard:view")
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/, "格式: YYYY-MM").optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const period = input?.period ?? new Date().toISOString().slice(0, 7);
      const periodStart = `${period}-01`;
      const periodEnd = `${period}-31`;

      // Check depreciation posted
      const depCheck = firstRow(await db.execute(sql`
        SELECT
          count(*) FILTER (WHERE posted_to_gl = true)::int AS posted,
          count(*) FILTER (WHERE posted_to_gl = false)::int AS unposted,
          count(*)::int AS total
        FROM depreciation_entries
        WHERE period = ${period}
      `));

      // Check revaluation done
      const revalCheck = firstRow(await db.execute(sql`
        SELECT count(*)::int AS count
        FROM foreign_currency_revaluations
        WHERE revaluation_date >= ${periodStart}
          AND revaluation_date <= ${periodEnd}
          AND status = 'completed'
      `));

      // Check reports generated
      const reportCheck = firstRow(await db.execute(sql`
        SELECT count(*)::int AS count
        FROM financial_report_snapshots
        WHERE period_end >= ${periodStart}
          AND period_end <= ${periodEnd}
      `));

      // Check reconciliation complete
      const reconCheck = firstRow(await db.execute(sql`
        SELECT
          count(*) FILTER (WHERE status = 'approved')::int AS approved,
          count(*)::int AS total
        FROM bank_reconciliations
        WHERE reconciliation_date >= ${periodStart}
          AND reconciliation_date <= ${periodEnd}
      `));

      const dc = depCheck as any;
      const rc = reconCheck as any;

      const checklist = {
        period,
        depreciationPosted: (dc?.unposted ?? 0) === 0 && (dc?.total ?? 0) > 0,
        depreciationDetail: { posted: dc?.posted ?? 0, unposted: dc?.unposted ?? 0, total: dc?.total ?? 0 },
        revaluationDone: ((revalCheck as any)?.count ?? 0) > 0,
        reportsGenerated: ((reportCheck as any)?.count ?? 0) > 0,
        reportCount: (reportCheck as any)?.count ?? 0,
        reconciliationComplete: (rc?.total ?? 0) > 0 && rc?.approved === rc?.total,
        reconciliationDetail: { approved: rc?.approved ?? 0, total: rc?.total ?? 0 },
      };

      const allComplete = checklist.depreciationPosted && checklist.revaluationDone
        && checklist.reportsGenerated && checklist.reconciliationComplete;

      return {
        ...checklist,
        allComplete,
        status: allComplete ? "complete" : "incomplete",
      };
    }),
});
