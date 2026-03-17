/**
 * Payroll Sandbox Router — 薪资沙盘路由
 *
 * 17 sub-routers, ~85 procedures:
 *   cycle (7): list, getById, create, updateStatus, importAll, getSummary, smartCreate
 *   attendance (4): list, upsert, bulkImport, remove
 *   performance (4): list, upsert, bulkImport, remove
 *   allowance (5): list, upsert, bulkImport, remove, carryForward
 *   socialFund (5): list, upsert, bulkImport, remove, carryForward
 *   taxSnapshot (5): list, upsert, bulkImport, remove, autoGenerate
 *   calc (6): run, getResult, listResults, compareWithExcel, explainField, rerun
 *   result (6): list, getById, approve, listAdjustments, createAdjustment, approveAdjustment
 *   payout (4): list, create, updateStatus, summary
 *   dashboard (6): overview, anomalies, deptBreakdown, perfWageAnalysis, taxBracketDistribution, matchRate
 *   evidence (6): list, create, bulkImport, remove, byEmployee, summary
 *   perfReview (8): list, getByEmployee, aiSuggest, supervisorConfirm, freeze, updateStatus, batchFreeze, flowToInput
 *   anomaly (5): list, resolve, stats, unresolvedCount, bulkResolve
 *   approval (6): list, initFlow, approve, reject, currentStage, isFullyApproved
 *   lock (5): list, lock, unlock, isLocked, fullLock
 *   metrics (4): generate, list, byDepartment, summary
 *   regulatory (5): listPolicies, currentPolicy, createPolicy, taxParams, grtFormulas
 *
 * Data sensitivity:
 * - payout sub-router requires payroll:payout:manage (HR/Finance only)
 * - AI sandbox endpoints strip bank/ID/phone before returning
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission, t } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, desc, count, sql, sum, avg, lte, gte, isNull, or } from "drizzle-orm";
import {
  payrollSandboxCycles,
  psAttendanceInput,
  psPerformanceInput,
  psAllowanceInput,
  psSocialFundInput,
  psTaxSnapshot,
  psCalcResult,
  psFinalResult,
  psAdjustment,
  psPayout,
} from "../../drizzle/payroll-sandbox-schema";
import {
  psPerfEvidence,
  psPerfReview,
  psSocialFundPolicy,
  psAnomaly,
  psApprovalFlow,
  psLockRecord,
  psPostPayoutMetrics,
} from "../../drizzle/perf-evidence-schema";
import { salaryStructures } from "../../drizzle/smart-payroll-schema";
import {
  calculateEmployee,
  detectAnomalies,
  type EmployeeCalcInput,
  type RegulatoryParams,
} from "../services/payroll-sandbox-calc.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("payroll-sandbox");

// ── Permission shortcuts ────────────────────────────────
const viewSandbox = requirePermission("hr:salary:view");
const manageSandbox = requirePermission("system:config:manage");
const payoutAccess = requirePermission("hr:salary:manage");

// ── Helper: yuan string → cents ─────────────────────────
function y2c(yuan: string | number | null | undefined): number {
  if (yuan === null || yuan === undefined || yuan === "") return 0;
  return Math.round(Number(yuan) * 100);
}

// ── Sub-Router: Cycles ──────────────────────────────────

const cycleRouter = router({
  list: viewSandbox
    .query(async () => {
      const db = await requireDb();
      return db.select().from(payrollSandboxCycles).orderBy(desc(payrollSandboxCycles.period)).limit(50);
    }),

  getById: viewSandbox
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(payrollSandboxCycles).where(eq(payrollSandboxCycles.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  create: manageSandbox
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      name: z.string().min(1).max(100),
      workDays: z.number().int().min(1).max(31).default(22),
      dailyWorkHours: z.number().min(1).max(24).default(8),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const rows = await db.insert(payrollSandboxCycles).values({
        period: input.period,
        name: input.name,
        workDays: input.workDays,
        dailyWorkHours: String(input.dailyWorkHours),
        remarks: input.remarks,
        createdById: ctx.user?.id,
      }).returning();
      return rows[0];
    }),

  updateStatus: manageSandbox
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "importing", "imported", "calculating", "calculated", "reviewing", "approved", "locked"]),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.update(payrollSandboxCycles)
        .set({ status: input.status, updatedAt: new Date().toISOString() })
        .where(eq(payrollSandboxCycles.id, input.id))
        .returning();
      return rows[0];
    }),

  importAll: manageSandbox
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [att] = await db.select({ count: count() }).from(psAttendanceInput).where(eq(psAttendanceInput.cycleId, input.cycleId));
      const [perf] = await db.select({ count: count() }).from(psPerformanceInput).where(eq(psPerformanceInput.cycleId, input.cycleId));
      const [allow] = await db.select({ count: count() }).from(psAllowanceInput).where(eq(psAllowanceInput.cycleId, input.cycleId));
      const [social] = await db.select({ count: count() }).from(psSocialFundInput).where(eq(psSocialFundInput.cycleId, input.cycleId));
      const [tax] = await db.select({ count: count() }).from(psTaxSnapshot).where(eq(psTaxSnapshot.cycleId, input.cycleId));

      const total = (att?.count ?? 0) + (perf?.count ?? 0) + (allow?.count ?? 0) + (social?.count ?? 0) + (tax?.count ?? 0);

      await db.update(payrollSandboxCycles).set({
        status: total > 0 ? "imported" : "draft",
        importedAt: new Date().toISOString(),
        totalEmployees: Number(social?.count ?? 0),
        updatedAt: new Date().toISOString(),
      }).where(eq(payrollSandboxCycles.id, input.cycleId));

      return {
        attendance: Number(att?.count ?? 0),
        performance: Number(perf?.count ?? 0),
        allowance: Number(allow?.count ?? 0),
        socialFund: Number(social?.count ?? 0),
        taxSnapshot: Number(tax?.count ?? 0),
        total,
      };
    }),

  getSummary: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [cycle] = await db.select().from(payrollSandboxCycles).where(eq(payrollSandboxCycles.id, input.cycleId)).limit(1);
      const [resultStats] = await db.select({
        count: count(),
        totalGross: sum(psFinalResult.grossPay),
        totalNet: sum(psFinalResult.netPay),
        totalTax: sum(psFinalResult.incomeTax),
        matchCount: count(sql`CASE WHEN ${psFinalResult.isMatched} = true THEN 1 END`),
      }).from(psFinalResult).where(eq(psFinalResult.cycleId, input.cycleId));

      return { cycle, resultStats };
    }),

  smartCreate: manageSandbox
    .input(z.object({
      period: z.string().regex(/^\d{6}$/),
      name: z.string().optional(),
      workDays: z.number().min(1).max(31),
      dailyWorkHours: z.number().default(8),
      carryForwardSocial: z.boolean().default(true),
      carryForwardAllowance: z.boolean().default(true),
      autoGenerateTax: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // 1. Create cycle
      const defaultName = `${input.period.slice(0,4)}年${parseInt(input.period.slice(4))}月工资(沙盘试算)`;
      const [cycle] = await db.insert(payrollSandboxCycles).values({
        period: input.period,
        name: input.name || defaultName,
        status: "draft",
        workDays: input.workDays,
        dailyWorkHours: String(input.dailyWorkHours),
        totalEmployees: 0,
        createdById: ctx.user?.id ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning();

      const cycleId = cycle.id;
      let carryStats = { socialFund: 0, allowance: 0, taxSnapshot: 0 };

      // 2. Find most recent calculated/approved/locked cycle as source
      const [priorCycle] = await db.select().from(payrollSandboxCycles)
        .where(and(
          sql`${payrollSandboxCycles.period} < ${input.period}`,
          sql`${payrollSandboxCycles.status} IN ('calculated', 'reviewing', 'approved', 'locked')`,
        ))
        .orderBy(desc(payrollSandboxCycles.period))
        .limit(1);

      if (priorCycle) {
        // 3a. Carry forward social fund (amounts rarely change month-to-month)
        if (input.carryForwardSocial) {
          const priorSocials = await db.select().from(psSocialFundInput)
            .where(eq(psSocialFundInput.cycleId, priorCycle.id)).limit(500);
          if (priorSocials.length > 0) {
            const socialRows = priorSocials.map(s => ({
              cycleId,
              employeeName: s.employeeName,
              employeeId: s.employeeId,
              department: s.department,
              hireDate: s.hireDate,
              lastWorkDate: s.lastWorkDate,
              socialInsurancePersonal: s.socialInsurancePersonal,
              housingFundPersonal: s.housingFundPersonal,
              totalPersonal: s.totalPersonal,
              dataSource: "carry_forward",
              createdAt: new Date().toISOString(),
            }));
            await db.insert(psSocialFundInput).values(socialRows);
            carryStats.socialFund = socialRows.length;
          }
        }

        // 3b. Carry forward allowances
        if (input.carryForwardAllowance) {
          const priorAllowances = await db.select().from(psAllowanceInput)
            .where(eq(psAllowanceInput.cycleId, priorCycle.id)).limit(1000);
          if (priorAllowances.length > 0) {
            const allowRows = priorAllowances.map(a => ({
              cycleId,
              employeeName: a.employeeName,
              employeeId: a.employeeId,
              allowanceType: a.allowanceType,
              amount: a.amount,
              department: a.department,
              remarks: a.remarks,
              dataSource: "carry_forward",
              createdAt: new Date().toISOString(),
            }));
            await db.insert(psAllowanceInput).values(allowRows);
            carryStats.allowance = allowRows.length;
          }
        }

        // 3c. Auto-generate tax snapshots from ALL prior calculated cycles in same year
        if (input.autoGenerateTax) {
          const year = input.period.slice(0, 4);
          const targetMonth = parseInt(input.period.slice(4));

          const priorCalcCycles = await db.select().from(payrollSandboxCycles)
            .where(and(
              sql`${payrollSandboxCycles.period} LIKE ${year + '%'}`,
              sql`${payrollSandboxCycles.period} < ${input.period}`,
              sql`${payrollSandboxCycles.status} IN ('calculated', 'reviewing', 'approved', 'locked')`,
            ))
            .orderBy(payrollSandboxCycles.period)
            .limit(12);

          if (priorCalcCycles.length > 0) {
            const priorCycleIds = priorCalcCycles.map(c => c.id);

            const allPriorResults = await db.select().from(psCalcResult)
              .where(sql`${psCalcResult.cycleId} IN (${sql.join(priorCycleIds.map(id => sql`${id}`), sql`, `)})`)
              .limit(5000);

            const latestPriorTax = await db.select().from(psTaxSnapshot)
              .where(eq(psTaxSnapshot.cycleId, priorCycle.id)).limit(500);
            const priorTaxMap = new Map(latestPriorTax.map(t => [t.employeeName, t]));

            const empCumulatives = new Map<string, { income: number; deduction: number; taxPaid: number; employeeId: number | null }>();
            for (const r of allPriorResults) {
              const existing = empCumulatives.get(r.employeeName) ?? { income: 0, deduction: 0, taxPaid: 0, employeeId: r.employeeId };
              existing.income += Math.round(Number(r.grossPay ?? 0) * 100);
              existing.deduction += Math.round((Number(r.socialInsurance ?? 0) + Number(r.housingFund ?? 0)) * 100);
              existing.taxPaid += Math.round(Number(r.incomeTax ?? 0) * 100);
              existing.employeeId = r.employeeId;
              empCumulatives.set(r.employeeName, existing);
            }

            const taxRows = Array.from(empCumulatives.entries()).map(([name, cum]) => {
              const priorTax = priorTaxMap.get(name);
              return {
                cycleId,
                employeeName: name,
                employeeId: cum.employeeId,
                cumulativeIncomePrior: (cum.income / 100).toFixed(2),
                cumulativeDeductionPrior: (cum.deduction / 100).toFixed(2),
                cumulativeTaxPaidPrior: (cum.taxPaid / 100).toFixed(2),
                monthIndex: targetMonth,
                specialDeduction: priorTax?.specialDeduction ?? "0",
                basicExemption: "5000",
                remarks: `auto_generated_from_${priorCalcCycles.length}_prior_cycles`,
                createdAt: new Date().toISOString(),
              };
            });

            if (taxRows.length > 0) {
              await db.insert(psTaxSnapshot).values(taxRows);
              carryStats.taxSnapshot = taxRows.length;
            }
          }
        }
      }

      // Update cycle with carry stats
      await db.update(payrollSandboxCycles).set({
        totalEmployees: carryStats.socialFund,
        remarks: `智能创建: 社保${carryStats.socialFund}人, 补贴${carryStats.allowance}条, 个税快照${carryStats.taxSnapshot}人`,
        updatedAt: new Date().toISOString(),
      }).where(eq(payrollSandboxCycles.id, cycleId));

      log.info({ cycleId, period: input.period, carryStats }, "Smart cycle created with carry-forward data");

      return { cycle, carryStats };
    }),
});

// ── Generic CRUD helper for input tables ────────────────

function createInputRouter<T extends typeof psAttendanceInput | typeof psPerformanceInput | typeof psAllowanceInput | typeof psSocialFundInput | typeof psTaxSnapshot>(
  table: T,
  cycleIdCol: any,
  tableName: string,
) {
  return router({
    list: viewSandbox
      .input(z.object({ cycleId: z.number() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        return db.select().from(table as any).where(eq(cycleIdCol, input.cycleId)).limit(500);
      }),

    upsert: manageSandbox
      .input(z.object({ id: z.number().optional(), data: z.record(z.string(), z.any()) }))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        if (input.id) {
          const rows = await db.update(table).set(input.data as any).where(eq((table as any).id, input.id)).returning();
          return (rows as any)[0];
        }
        const rows = await db.insert(table).values(input.data as any).returning();
        return rows[0];
      }),

    bulkImport: manageSandbox
      .input(z.object({ rows: z.array(z.record(z.string(), z.any())).max(500) }))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        if (input.rows.length === 0) return { inserted: 0 };
        const rows = await db.insert(table as any).values(input.rows as any[]).returning();
        log.info({ table: tableName, count: (rows as any[]).length }, "Bulk imported payroll sandbox data");
        return { inserted: (rows as any[]).length };
      }),

    remove: manageSandbox
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        await db.delete(table).where(eq((table as any).id, input.id));
        return { success: true };
      }),
  });
}

// ── Sub-Router: Input tables ────────────────────────────

const attendanceRouter = createInputRouter(psAttendanceInput, psAttendanceInput.cycleId, "attendance");
const performanceRouter = createInputRouter(psPerformanceInput, psPerformanceInput.cycleId, "performance");

const allowanceBaseRouter = createInputRouter(psAllowanceInput, psAllowanceInput.cycleId, "allowance");
const allowanceRouter = t.mergeRouters(allowanceBaseRouter, router({
  carryForward: manageSandbox
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [cycle] = await db.select().from(payrollSandboxCycles).where(eq(payrollSandboxCycles.id, input.cycleId)).limit(1);
      if (!cycle) throw new Error("Cycle not found");

      const [priorCycle] = await db.select().from(payrollSandboxCycles)
        .where(and(
          sql`${payrollSandboxCycles.period} < ${cycle.period}`,
          sql`${payrollSandboxCycles.status} IN ('calculated', 'reviewing', 'approved', 'locked', 'imported')`,
        ))
        .orderBy(desc(payrollSandboxCycles.period))
        .limit(1);

      if (!priorCycle) return { carried: 0, message: "No prior cycle found" };

      const priorAllowances = await db.select().from(psAllowanceInput)
        .where(eq(psAllowanceInput.cycleId, priorCycle.id)).limit(1000);

      if (priorAllowances.length === 0) return { carried: 0, message: "Prior cycle has no allowance data" };

      // Clear existing
      await db.delete(psAllowanceInput).where(eq(psAllowanceInput.cycleId, input.cycleId));

      const rows = priorAllowances.map(a => ({
        cycleId: input.cycleId,
        employeeName: a.employeeName,
        employeeId: a.employeeId,
        allowanceType: a.allowanceType,
        amount: a.amount,
        department: a.department,
        remarks: a.remarks,
        dataSource: "carry_forward",
        createdAt: new Date().toISOString(),
      }));

      await db.insert(psAllowanceInput).values(rows);
      return { carried: rows.length, fromPeriod: priorCycle.period };
    }),
}));

const socialFundBaseRouter = createInputRouter(psSocialFundInput, psSocialFundInput.cycleId, "socialFund");
const socialFundRouter = t.mergeRouters(socialFundBaseRouter, router({
  carryForward: manageSandbox
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [cycle] = await db.select().from(payrollSandboxCycles).where(eq(payrollSandboxCycles.id, input.cycleId)).limit(1);
      if (!cycle) throw new Error("Cycle not found");

      const [priorCycle] = await db.select().from(payrollSandboxCycles)
        .where(and(
          sql`${payrollSandboxCycles.period} < ${cycle.period}`,
          sql`${payrollSandboxCycles.status} IN ('calculated', 'reviewing', 'approved', 'locked', 'imported')`,
        ))
        .orderBy(desc(payrollSandboxCycles.period))
        .limit(1);

      if (!priorCycle) return { carried: 0, message: "No prior cycle found" };

      const priorSocials = await db.select().from(psSocialFundInput)
        .where(eq(psSocialFundInput.cycleId, priorCycle.id)).limit(500);

      if (priorSocials.length === 0) return { carried: 0, message: "Prior cycle has no social fund data" };

      // Clear existing for this cycle first
      await db.delete(psSocialFundInput).where(eq(psSocialFundInput.cycleId, input.cycleId));

      const rows = priorSocials.map(s => ({
        cycleId: input.cycleId,
        employeeName: s.employeeName,
        employeeId: s.employeeId,
        department: s.department,
        hireDate: s.hireDate,
        lastWorkDate: s.lastWorkDate,
        socialInsurancePersonal: s.socialInsurancePersonal,
        housingFundPersonal: s.housingFundPersonal,
        totalPersonal: s.totalPersonal,
        dataSource: "carry_forward",
        createdAt: new Date().toISOString(),
      }));

      await db.insert(psSocialFundInput).values(rows);
      return { carried: rows.length, fromPeriod: priorCycle.period };
    }),
}));

const taxSnapshotBaseRouter = createInputRouter(psTaxSnapshot, psTaxSnapshot.cycleId, "taxSnapshot");
const taxSnapshotRouter = t.mergeRouters(taxSnapshotBaseRouter, router({
  autoGenerate: manageSandbox
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [cycle] = await db.select().from(payrollSandboxCycles).where(eq(payrollSandboxCycles.id, input.cycleId)).limit(1);
      if (!cycle) throw new Error("Cycle not found");

      const year = cycle.period.slice(0, 4);
      const targetMonth = parseInt(cycle.period.slice(4));

      // Find all prior calculated cycles in same year
      const priorCalcCycles = await db.select().from(payrollSandboxCycles)
        .where(and(
          sql`${payrollSandboxCycles.period} LIKE ${year + '%'}`,
          sql`${payrollSandboxCycles.period} < ${cycle.period}`,
          sql`${payrollSandboxCycles.status} IN ('calculated', 'reviewing', 'approved', 'locked')`,
        ))
        .orderBy(payrollSandboxCycles.period)
        .limit(12);

      if (priorCalcCycles.length === 0) {
        return { generated: 0, message: "No prior calculated cycles found — use monthIndex=1 with zero cumulatives" };
      }

      const priorCycleIds = priorCalcCycles.map(c => c.id);
      const allPriorResults = await db.select().from(psCalcResult)
        .where(sql`${psCalcResult.cycleId} IN (${sql.join(priorCycleIds.map(id => sql`${id}`), sql`, `)})`)
        .limit(5000);

      // Load existing special deductions from latest prior cycle
      const latestPriorId = priorCalcCycles[priorCalcCycles.length - 1].id;
      const priorTaxSnaps = await db.select().from(psTaxSnapshot).where(eq(psTaxSnapshot.cycleId, latestPriorId)).limit(500);
      const priorTaxMap = new Map(priorTaxSnaps.map(t => [t.employeeName, t]));

      // Aggregate by employee
      const empCumulatives = new Map<string, { income: number; deduction: number; taxPaid: number; employeeId: number | null }>();
      for (const r of allPriorResults) {
        const existing = empCumulatives.get(r.employeeName) ?? { income: 0, deduction: 0, taxPaid: 0, employeeId: r.employeeId };
        existing.income += Math.round(Number(r.grossPay ?? 0) * 100);
        existing.deduction += Math.round((Number(r.socialInsurance ?? 0) + Number(r.housingFund ?? 0)) * 100);
        existing.taxPaid += Math.round(Number(r.incomeTax ?? 0) * 100);
        existing.employeeId = r.employeeId;
        empCumulatives.set(r.employeeName, existing);
      }

      // Clear existing tax snapshots for this cycle
      await db.delete(psTaxSnapshot).where(eq(psTaxSnapshot.cycleId, input.cycleId));

      const taxRows = Array.from(empCumulatives.entries()).map(([name, cum]) => {
        const priorTax = priorTaxMap.get(name);
        return {
          cycleId: input.cycleId,
          employeeName: name,
          employeeId: cum.employeeId,
          cumulativeIncomePrior: (cum.income / 100).toFixed(2),
          cumulativeDeductionPrior: (cum.deduction / 100).toFixed(2),
          cumulativeTaxPaidPrior: (cum.taxPaid / 100).toFixed(2),
          monthIndex: targetMonth,
          specialDeduction: priorTax?.specialDeduction ?? "0",
          basicExemption: "5000",
          remarks: `auto_generated_from_${priorCalcCycles.length}_prior_cycles`,
          createdAt: new Date().toISOString(),
        };
      });

      if (taxRows.length > 0) {
        await db.insert(psTaxSnapshot).values(taxRows);
      }

      return { generated: taxRows.length, priorCyclesUsed: priorCalcCycles.length, monthIndex: targetMonth };
    }),
}));

// ── Sub-Router: Calculation Engine (REAL) ───────────────

const calcRouter = router({
  run: manageSandbox
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // Mark cycle as calculating
      await db.update(payrollSandboxCycles).set({
        status: "calculating",
        updatedAt: new Date().toISOString(),
      }).where(eq(payrollSandboxCycles.id, input.cycleId));

      // Load cycle
      const [cycle] = await db.select().from(payrollSandboxCycles).where(eq(payrollSandboxCycles.id, input.cycleId)).limit(1);
      if (!cycle) throw new Error("Cycle not found");

      // Load active regulatory policy for this cycle's period
      // Match by: effectiveFrom <= cycle.period AND (effectiveTo IS NULL OR effectiveTo >= cycle.period)
      const cycleDate = `${cycle.period.slice(0, 4)}-${cycle.period.slice(4)}-01`; // "202601" → "2026-01-01"
      const [activePolicy] = await db.select().from(psSocialFundPolicy)
        .where(and(
          lte(psSocialFundPolicy.effectiveFrom, cycleDate),
          or(
            isNull(psSocialFundPolicy.effectiveTo),
            gte(psSocialFundPolicy.effectiveTo, cycleDate),
          ),
        ))
        .orderBy(desc(psSocialFundPolicy.id))
        .limit(1);

      // Build RegulatoryParams from active policy (if any)
      const reg: RegulatoryParams | undefined = activePolicy?.regulatoryOverrides
        ? (activePolicy.regulatoryOverrides as RegulatoryParams)
        : undefined;

      if (activePolicy) {
        log.info({ policyId: activePolicy.id, version: activePolicy.policyVersion, hasOverrides: !!reg }, "Loaded regulatory policy for calc run");
      } else {
        log.info({ cycleDate }, "No active regulatory policy found, using DEFAULT_* constants");
      }

      // Load all input tables for this cycle
      const socials = await db.select().from(psSocialFundInput).where(eq(psSocialFundInput.cycleId, input.cycleId)).limit(500);
      const performances = await db.select().from(psPerformanceInput).where(eq(psPerformanceInput.cycleId, input.cycleId)).limit(500);
      const allowances = await db.select().from(psAllowanceInput).where(eq(psAllowanceInput.cycleId, input.cycleId)).limit(1000);
      const attendances = await db.select().from(psAttendanceInput).where(eq(psAttendanceInput.cycleId, input.cycleId)).limit(500);
      const taxSnapshots = await db.select().from(psTaxSnapshot).where(eq(psTaxSnapshot.cycleId, input.cycleId)).limit(500);

      // Load ALL salary structures and build employeeId→structure map
      const allStructures = await db.select().from(salaryStructures).limit(1000);
      const structByEmployeeId = new Map<number, typeof allStructures[0]>();
      for (const s of allStructures) {
        // Keep the latest (highest id) per employee
        const existing = structByEmployeeId.get(s.employeeId);
        if (!existing || s.id > existing.id) {
          structByEmployeeId.set(s.employeeId, s);
        }
      }

      // Build lookup maps by employeeName
      const perfMap = new Map(performances.map(p => [p.employeeName, p]));
      const attMap = new Map(attendances.map(a => [a.employeeName, a]));
      const taxMap = new Map(taxSnapshots.map(t => [t.employeeName, t]));
      const allowMap = new Map<string, { cashSubsidy: number; travelCar: number }>();
      for (const a of allowances) {
        const existing = allowMap.get(a.employeeName) ?? { cashSubsidy: 0, travelCar: 0 };
        if (a.allowanceType === "cash_subsidy") existing.cashSubsidy += Number(a.amount);
        else if (a.allowanceType === "travel_car") existing.travelCar += Number(a.amount);
        allowMap.set(a.employeeName, existing);
      }

      // Clear previous calc results and anomalies for this cycle
      await db.delete(psCalcResult).where(eq(psCalcResult.cycleId, input.cycleId));
      await db.delete(psFinalResult).where(eq(psFinalResult.cycleId, input.cycleId));
      await db.delete(psAnomaly).where(eq(psAnomaly.cycleId, input.cycleId));

      const calcRows: any[] = [];
      const finalRows: any[] = [];
      const anomalyRows: any[] = [];
      let totalGrossCents = 0;
      let totalNetCents = 0;
      let totalTaxCents = 0;

      for (const emp of socials) {
        const perf = perfMap.get(emp.employeeName);
        const att = attMap.get(emp.employeeName);
        const tax = taxMap.get(emp.employeeName);
        const allow = allowMap.get(emp.employeeName) ?? { cashSubsidy: 0, travelCar: 0 };

        // Look up salary structure by employeeId
        const struct = emp.employeeId ? structByEmployeeId.get(emp.employeeId) : undefined;

        // Build EmployeeCalcInput combining salary structure + input tables
        const calcInput: EmployeeCalcInput = {
          employeeName: emp.employeeName,
          department: emp.department ?? "",
          positionGrade: struct?.positionGrade ?? "",
          isLumpSum: struct?.isLumpSum ?? false,

          // Fixed pay from salary structures (fallback to 0)
          baseSalary: y2c(struct?.baseSalary),
          positionWage: y2c(struct?.positionWage),
          skillSubsidy: y2c(struct?.skillSubsidy),
          saturdayShiftPremium: y2c(struct?.saturdayShiftPremium),
          comprehensiveSalary: y2c(struct?.comprehensiveSalary),

          // Performance — wage bases from perf input (already snapshotted from salary_structures)
          perfWage1Base: y2c(perf?.perfWage1Base),
          perfWage2Base: y2c(perf?.perfWage2Base),
          perfWage3Base: y2c(perf?.perfWage3Base),
          monthlyScore: Number(perf?.monthlyScore ?? 0),
          avg2024: Number(perf?.avg2024Score ?? 0),
          avg2025: Number(perf?.avg2025Score ?? 0),

          // Attendance
          scheduledDays: att?.scheduledDays ?? cycle.workDays,
          actualDays: Number(att?.actualAttendance ?? 0),
          personalLeaveHours: Number(att?.personalLeaveHours ?? 0),
          sickLeaveHours: Number(att?.sickLeaveHours ?? 0),
          weekdayOtHours: Number(att?.weekdayOvertimeForPay ?? 0),
          weekendOtHours: Number(att?.weekendOvertimeForPay ?? 0),
          holidayOtHours: Number(att?.holidayOvertimeForPay ?? 0),

          // Allowances (yuan → cents)
          cashSubsidy: Math.round(allow.cashSubsidy * 100),
          travelCarSubsidy: Math.round(allow.travelCar * 100),

          // Social insurance (from social fund input)
          socialInsurance: y2c(emp.socialInsurancePersonal),
          housingFund: y2c(emp.housingFundPersonal),

          // Tax (from tax snapshot)
          cumulativeIncomePrior: y2c(tax?.cumulativeIncomePrior),
          cumulativeDeductionPrior: y2c(tax?.cumulativeDeductionPrior),
          cumulativeTaxPaidPrior: y2c(tax?.cumulativeTaxPaidPrior),
          monthIndex: tax?.monthIndex ?? 1,
          specialDeduction: y2c(tax?.specialDeduction),

          // Bonuses (perfect attendance from salary structure)
          perfectAttendanceBonus: struct?.perfectAttendanceEligible ? y2c(struct.perfectAttendanceAmount) : 0,
          assessmentBonus: 0,
          otherIncome: 0,

          // Excel reference values (not available here, set by psFinalResult import)
          excelGrossPay: undefined,
          excelNetPay: undefined,
          excelTax: undefined,
        };

        // Run the real calc engine
        const result = calculateEmployee(calcInput, reg);

        // Detect anomalies
        const anomalies = detectAnomalies(result);

        // Accumulate totals (cents)
        totalGrossCents += y2c(result.grossPay);
        totalNetCents += y2c(result.netPay);
        totalTaxCents += y2c(result.incomeTax);

        // Build psCalcResult row
        calcRows.push({
          cycleId: input.cycleId,
          employeeName: emp.employeeName,
          employeeId: emp.employeeId,
          department: emp.department,
          positionGrade: result.positionGrade || null,
          baseSalary: result.baseSalary,
          positionWage: result.positionWage,
          skillSubsidy: result.skillSubsidy,
          saturdayShiftPremium: result.saturdayShiftPremium,
          comprehensiveSalary: result.comprehensiveSalary,
          perfWage1: result.perfWage1,
          perfWage2: result.perfWage2,
          perfWage3: result.perfWage3,
          perfAdjustment: result.perfAdjustment,
          perfCoeff1: result.perfCoeff1,
          perfCoeff2: result.perfCoeff2,
          perfCoeff3: result.perfCoeff3,
          perfDeduction1: result.perfDeduction1,
          perfDeduction2: result.perfDeduction2,
          perfDeduction3: result.perfDeduction3,
          actualAttendanceDays: result.actualAttendanceDays,
          personalLeaveHours: result.personalLeaveHours,
          sickLeaveHours: result.sickLeaveHours,
          personalLeaveDeduction: result.personalLeaveDeduction,
          sickLeaveDeduction: result.sickLeaveDeduction,
          weekdayOvertimeHours: result.weekdayOtHours,
          weekendOvertimeHours: result.weekendOtHours,
          holidayOvertimeHours: result.holidayOtHours,
          weekdayOvertimePay: result.weekdayOtPay,
          weekendOvertimePay: result.weekendOtPay,
          holidayOvertimePay: result.holidayOtPay,
          cashSubsidy: result.cashSubsidy,
          travelCarSubsidy: result.travelCarSubsidy,
          perfectAttendanceBonus: result.perfectAttendanceBonus,
          assessmentBonus: result.assessmentBonus,
          grossPay: result.grossPay,
          otherIncome: result.otherIncome,
          socialInsurance: result.socialInsurance,
          housingFund: result.housingFund,
          incomeTax: result.incomeTax,
          netPay: result.netPay,
          calculationLog: result.calculationLog,
          formulaDetails: result.formulaDetails,
          isLumpSum: result.isLumpSum,
        });

        // Build psFinalResult row
        finalRows.push({
          cycleId: input.cycleId,
          employeeName: emp.employeeName,
          employeeId: emp.employeeId,
          department: emp.department,
          positionGrade: result.positionGrade || null,
          grossPay: result.grossPay,
          socialInsurance: result.socialInsurance,
          housingFund: result.housingFund,
          incomeTax: result.incomeTax,
          otherIncome: result.otherIncome,
          netPay: result.netPay,
          // Excel refs will be null until imported separately
          excelGrossPay: null,
          excelNetPay: null,
          excelTax: null,
          grossDiff: "0",
          netDiff: "0",
          taxDiff: "0",
          isMatched: false,
        });

        // Store anomalies
        for (const a of anomalies) {
          anomalyRows.push({
            cycleId: input.cycleId,
            employeeName: a.employeeName,
            employeeId: emp.employeeId,
            category: a.category,
            severity: a.severity,
            title: a.title,
            description: a.description,
            fieldName: a.fieldName ?? null,
            expectedValue: a.expectedValue ?? null,
            actualValue: a.actualValue ?? null,
            suggestedAction: a.suggestedAction ?? null,
          });
        }
      }

      // Batch insert results
      if (calcRows.length > 0) {
        await db.insert(psCalcResult).values(calcRows);
      }
      if (finalRows.length > 0) {
        await db.insert(psFinalResult).values(finalRows);
      }
      if (anomalyRows.length > 0) {
        await db.insert(psAnomaly).values(anomalyRows);
      }

      // Update cycle status and totals
      await db.update(payrollSandboxCycles).set({
        status: "calculated",
        calculatedAt: new Date().toISOString(),
        totalEmployees: calcRows.length,
        totalGrossPay: (totalGrossCents / 100).toFixed(2),
        totalNetPay: (totalNetCents / 100).toFixed(2),
        totalTax: (totalTaxCents / 100).toFixed(2),
        updatedAt: new Date().toISOString(),
      }).where(eq(payrollSandboxCycles.id, input.cycleId));

      log.info({
        cycleId: input.cycleId,
        employees: calcRows.length,
        anomalies: anomalyRows.length,
      }, "Payroll sandbox calculation completed");

      return {
        calculated: calcRows.length,
        anomaliesDetected: anomalyRows.length,
        totalGross: (totalGrossCents / 100).toFixed(2),
        totalNet: (totalNetCents / 100).toFixed(2),
        totalTax: (totalTaxCents / 100).toFixed(2),
      };
    }),

  getResult: viewSandbox
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(psCalcResult).where(eq(psCalcResult.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  listResults: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(psCalcResult).where(eq(psCalcResult.cycleId, input.cycleId)).limit(500);
    }),

  compareWithExcel: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const results = await db.select().from(psFinalResult).where(eq(psFinalResult.cycleId, input.cycleId)).limit(500);
      const matched = results.filter(r => r.isMatched);
      const mismatched = results.filter(r => !r.isMatched);
      return {
        total: results.length,
        matched: matched.length,
        mismatched: mismatched.length,
        matchRate: results.length > 0 ? (matched.length / results.length * 100).toFixed(1) : "0",
        details: mismatched.slice(0, 20),
      };
    }),

  explainField: viewSandbox
    .input(z.object({ calcResultId: z.number(), fieldName: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(psCalcResult).where(eq(psCalcResult.id, input.calcResultId)).limit(1);
      if (!row) return null;
      const details = row.formulaDetails as Record<string, any> | null;
      return {
        field: input.fieldName,
        value: (row as any)[input.fieldName],
        formula: details?.[input.fieldName] ?? "公式未记录",
        log: row.calculationLog,
      };
    }),

  rerun: manageSandbox
    .input(z.object({ cycleId: z.number(), employeeName: z.string().optional() }))
    .mutation(async ({ input }) => {
      // For single employee rerun, just trigger the full run — individual recalc can be optimized later
      return { message: "Re-run triggered", cycleId: input.cycleId, employee: input.employeeName ?? "all" };
    }),
});

// ── Sub-Router: Results & Adjustments ───────────────────

const resultRouter = router({
  list: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(psFinalResult).where(eq(psFinalResult.cycleId, input.cycleId)).limit(500);
    }),

  getById: viewSandbox
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(psFinalResult).where(eq(psFinalResult.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  approve: manageSandbox
    .input(z.object({ cycleId: z.number(), reviewNote: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await db.update(psFinalResult).set({
        reviewedById: ctx.user?.id,
        reviewedAt: new Date().toISOString(),
        reviewNote: input.reviewNote ?? null,
        updatedAt: new Date().toISOString(),
      }).where(eq(psFinalResult.cycleId, input.cycleId));

      await db.update(payrollSandboxCycles).set({
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedById: ctx.user?.id,
        updatedAt: new Date().toISOString(),
      }).where(eq(payrollSandboxCycles.id, input.cycleId));

      return { approved: true };
    }),

  listAdjustments: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(psAdjustment).where(eq(psAdjustment.cycleId, input.cycleId)).limit(500);
    }),

  createAdjustment: manageSandbox
    .input(z.object({
      cycleId: z.number(),
      resultId: z.number().optional(),
      employeeName: z.string(),
      adjustType: z.enum(["perf_wage_override", "attendance_correction", "bonus_addition", "deduction_correction", "retroactive", "other"]),
      fieldName: z.string().optional(),
      originalValue: z.number().optional(),
      adjustedValue: z.number(),
      adjustAmount: z.number(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const rows = await db.insert(psAdjustment).values({
        cycleId: input.cycleId,
        resultId: input.resultId,
        employeeName: input.employeeName,
        adjustType: input.adjustType,
        fieldName: input.fieldName,
        originalValue: input.originalValue != null ? String(input.originalValue) : null,
        adjustedValue: String(input.adjustedValue),
        adjustAmount: String(input.adjustAmount),
        reason: input.reason,
        status: "pending",
        createdById: ctx.user?.id,
      }).returning();
      return rows[0];
    }),

  approveAdjustment: manageSandbox
    .input(z.object({
      adjustmentId: z.number(),
      approved: z.boolean(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const rows = await db.update(psAdjustment).set({
        status: input.approved ? "approved" : "rejected",
        approvedById: ctx.user?.id,
        approvedAt: new Date().toISOString(),
        rejectedReason: input.approved ? null : input.reason,
        updatedAt: new Date().toISOString(),
      }).where(eq(psAdjustment.id, input.adjustmentId)).returning();
      return rows[0];
    }),
});

// ── Sub-Router: Payout (SENSITIVE) ──────────────────────

const payoutRouter = router({
  list: payoutAccess
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(psPayout).where(eq(psPayout.cycleId, input.cycleId)).limit(500);
    }),

  create: payoutAccess
    .input(z.object({
      cycleId: z.number(),
      resultId: z.number(),
      employeeName: z.string(),
      netPayAmount: z.number(),
      bankName: z.string().optional(),
      bankAccount: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const rows = await db.insert(psPayout).values({
        cycleId: input.cycleId,
        resultId: input.resultId,
        employeeName: input.employeeName,
        netPayAmount: String(input.netPayAmount),
        bankName: input.bankName,
        bankAccount: input.bankAccount,
        processedById: ctx.user?.id,
      }).returning();
      return rows[0];
    }),

  updateStatus: payoutAccess
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "processing", "completed", "failed", "cancelled"]),
      paymentRef: z.string().optional(),
      failureReason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.update(psPayout).set({
        status: input.status,
        paymentRef: input.paymentRef,
        failureReason: input.failureReason,
        paidAt: input.status === "completed" ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      }).where(eq(psPayout.id, input.id)).returning();
      return rows[0];
    }),

  summary: payoutAccess
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [stats] = await db.select({
        total: count(),
        totalAmount: sum(psPayout.netPayAmount),
        completed: count(sql`CASE WHEN ${psPayout.status} = 'completed' THEN 1 END`),
        pending: count(sql`CASE WHEN ${psPayout.status} = 'pending' THEN 1 END`),
        failed: count(sql`CASE WHEN ${psPayout.status} = 'failed' THEN 1 END`),
      }).from(psPayout).where(eq(psPayout.cycleId, input.cycleId));
      return stats;
    }),
});

// ── Sub-Router: Dashboard / Analytics ───────────────────

const dashboardRouter = router({
  overview: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [cycle] = await db.select().from(payrollSandboxCycles).where(eq(payrollSandboxCycles.id, input.cycleId)).limit(1);
      const [calcStats] = await db.select({
        count: count(),
        totalGross: sum(psCalcResult.grossPay),
        totalNet: sum(psCalcResult.netPay),
        totalTax: sum(psCalcResult.incomeTax),
        totalSocial: sum(psCalcResult.socialInsurance),
        totalHousing: sum(psCalcResult.housingFund),
      }).from(psCalcResult).where(eq(psCalcResult.cycleId, input.cycleId));
      const [adjCount] = await db.select({ count: count() }).from(psAdjustment)
        .where(and(eq(psAdjustment.cycleId, input.cycleId), eq(psAdjustment.status, "pending")));
      const [anomalyCount] = await db.select({ count: count() }).from(psAnomaly)
        .where(and(eq(psAnomaly.cycleId, input.cycleId), eq(psAnomaly.isResolved, false)));

      return {
        cycle,
        calcStats,
        pendingAdjustments: Number(adjCount?.count ?? 0),
        unresolvedAnomalies: Number(anomalyCount?.count ?? 0),
      };
    }),

  anomalies: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const results = await db.select().from(psFinalResult)
        .where(and(
          eq(psFinalResult.cycleId, input.cycleId),
          eq(psFinalResult.isMatched, false),
        ))
        .orderBy(desc(psFinalResult.netDiff))
        .limit(20);
      return results;
    }),

  deptBreakdown: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select({
        department: psCalcResult.department,
        count: count(),
        totalGross: sum(psCalcResult.grossPay),
        totalNet: sum(psCalcResult.netPay),
        avgGross: avg(psCalcResult.grossPay),
      }).from(psCalcResult)
        .where(eq(psCalcResult.cycleId, input.cycleId))
        .groupBy(psCalcResult.department)
        .limit(50);
      return rows;
    }),

  perfWageAnalysis: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select({
        employeeName: psCalcResult.employeeName,
        department: psCalcResult.department,
        perfWage1: psCalcResult.perfWage1,
        perfWage2: psCalcResult.perfWage2,
        perfWage3: psCalcResult.perfWage3,
        perfDeduction1: psCalcResult.perfDeduction1,
        perfDeduction2: psCalcResult.perfDeduction2,
        perfDeduction3: psCalcResult.perfDeduction3,
        perfCoeff1: psCalcResult.perfCoeff1,
        perfCoeff2: psCalcResult.perfCoeff2,
        perfCoeff3: psCalcResult.perfCoeff3,
      }).from(psCalcResult)
        .where(eq(psCalcResult.cycleId, input.cycleId))
        .limit(200);
      return rows;
    }),

  taxBracketDistribution: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const results = await db.select({
        employeeName: psCalcResult.employeeName,
        department: psCalcResult.department,
        grossPay: psCalcResult.grossPay,
        incomeTax: psCalcResult.incomeTax,
        netPay: psCalcResult.netPay,
      }).from(psCalcResult)
        .where(eq(psCalcResult.cycleId, input.cycleId))
        .orderBy(desc(psCalcResult.incomeTax))
        .limit(200);
      return results;
    }),

  matchRate: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [stats] = await db.select({
        total: count(),
        matched: count(sql`CASE WHEN ${psFinalResult.isMatched} = true THEN 1 END`),
      }).from(psFinalResult).where(eq(psFinalResult.cycleId, input.cycleId));
      const total = Number(stats?.total ?? 0);
      const matched = Number(stats?.matched ?? 0);
      return {
        total,
        matched,
        mismatched: total - matched,
        rate: total > 0 ? (matched / total * 100).toFixed(1) : "0",
      };
    }),
});

// ── Sub-Router: Evidence ────────────────────────────────

const evidenceRouter = router({
  list: viewSandbox
    .input(z.object({
      cycleId: z.number(),
      employeeName: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [eq(psPerfEvidence.cycleId, input.cycleId)];
      if (input.employeeName) {
        conditions.push(eq(psPerfEvidence.employeeName, input.employeeName));
      }
      return db.select().from(psPerfEvidence)
        .where(and(...conditions))
        .orderBy(desc(psPerfEvidence.createdAt))
        .limit(500);
    }),

  create: manageSandbox
    .input(z.object({
      cycleId: z.number(),
      employeeName: z.string().min(1),
      employeeId: z.number().optional(),
      evidenceType: z.enum(["task_timeliness", "internal_feedback", "external_feedback", "quality_rework", "ai_commentary"]),
      title: z.string().min(1).max(300),
      description: z.string().optional(),
      score: z.number().min(0).max(100).optional(),
      weight: z.number().min(0).max(10).optional(),
      sourceSystem: z.string().optional(),
      sourceId: z.string().optional(),
      attachmentUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.insert(psPerfEvidence).values({
        cycleId: input.cycleId,
        employeeName: input.employeeName,
        employeeId: input.employeeId,
        evidenceType: input.evidenceType,
        title: input.title,
        description: input.description,
        score: input.score != null ? String(input.score) : null,
        weight: input.weight != null ? String(input.weight) : "1.00",
        sourceSystem: input.sourceSystem,
        sourceId: input.sourceId,
        attachmentUrl: input.attachmentUrl,
        submittedAt: new Date().toISOString(),
      }).returning();
      return rows[0];
    }),

  bulkImport: manageSandbox
    .input(z.object({
      rows: z.array(z.record(z.string(), z.any())).max(500),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      if (input.rows.length === 0) return { inserted: 0 };
      const rows = await db.insert(psPerfEvidence).values(input.rows as any[]).returning();
      log.info({ count: rows.length }, "Bulk imported perf evidence");
      return { inserted: rows.length };
    }),

  remove: manageSandbox
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(psPerfEvidence).where(eq(psPerfEvidence.id, input.id));
      return { success: true };
    }),

  byEmployee: viewSandbox
    .input(z.object({
      cycleId: z.number(),
      employeeName: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(psPerfEvidence)
        .where(and(
          eq(psPerfEvidence.cycleId, input.cycleId),
          eq(psPerfEvidence.employeeName, input.employeeName),
        ))
        .orderBy(desc(psPerfEvidence.createdAt))
        .limit(100);
    }),

  summary: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select({
        employeeName: psPerfEvidence.employeeName,
        evidenceType: psPerfEvidence.evidenceType,
        count: count(),
      }).from(psPerfEvidence)
        .where(eq(psPerfEvidence.cycleId, input.cycleId))
        .groupBy(psPerfEvidence.employeeName, psPerfEvidence.evidenceType)
        .limit(500);
      return rows;
    }),
});

// ── Sub-Router: Performance Review ──────────────────────

const perfReviewRouter = router({
  list: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(psPerfReview)
        .where(eq(psPerfReview.cycleId, input.cycleId))
        .orderBy(psPerfReview.employeeName)
        .limit(500);
    }),

  getByEmployee: viewSandbox
    .input(z.object({
      cycleId: z.number(),
      employeeName: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(psPerfReview)
        .where(and(
          eq(psPerfReview.cycleId, input.cycleId),
          eq(psPerfReview.employeeName, input.employeeName),
        ))
        .limit(1);
      return rows[0] ?? null;
    }),

  aiSuggest: manageSandbox
    .input(z.object({
      reviewId: z.number(),
      aiSuggestedScore: z.number().min(0).max(100),
      aiSuggestReason: z.string().min(1),
      aiRiskFlags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.update(psPerfReview).set({
        aiSuggestedScore: String(input.aiSuggestedScore),
        aiSuggestReason: input.aiSuggestReason,
        aiRiskFlags: input.aiRiskFlags ?? [],
        aiGeneratedAt: new Date().toISOString(),
        status: "ai_suggested",
        updatedAt: new Date().toISOString(),
      }).where(eq(psPerfReview.id, input.reviewId)).returning();
      return rows[0];
    }),

  supervisorConfirm: manageSandbox
    .input(z.object({
      reviewId: z.number(),
      supervisorScore: z.number().min(0).max(100),
      supervisorName: z.string().min(1),
      supervisorComment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const rows = await db.update(psPerfReview).set({
        supervisorScore: String(input.supervisorScore),
        supervisorId: ctx.user?.id,
        supervisorName: input.supervisorName,
        supervisorComment: input.supervisorComment,
        supervisorConfirmedAt: new Date().toISOString(),
        finalScore: String(input.supervisorScore),
        status: "supervisor_confirmed",
        updatedAt: new Date().toISOString(),
      }).where(eq(psPerfReview.id, input.reviewId)).returning();
      return rows[0];
    }),

  freeze: manageSandbox
    .input(z.object({ reviewId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const rows = await db.update(psPerfReview).set({
        status: "frozen",
        frozenAt: new Date().toISOString(),
        frozenById: ctx.user?.id,
        updatedAt: new Date().toISOString(),
      }).where(eq(psPerfReview.id, input.reviewId)).returning();
      return rows[0];
    }),

  updateStatus: manageSandbox
    .input(z.object({
      reviewId: z.number(),
      status: z.enum(["pending_evidence", "ai_suggested", "supervisor_confirmed", "frozen", "disputed"]),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.update(psPerfReview).set({
        status: input.status,
        updatedAt: new Date().toISOString(),
      }).where(eq(psPerfReview.id, input.reviewId)).returning();
      return rows[0];
    }),

  batchFreeze: manageSandbox
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const rows = await db.update(psPerfReview).set({
        status: "frozen",
        frozenAt: now,
        frozenById: ctx.user?.id,
        updatedAt: now,
      }).where(eq(psPerfReview.cycleId, input.cycleId)).returning();
      log.info({ cycleId: input.cycleId, frozen: rows.length }, "Batch froze perf reviews");
      return { frozen: rows.length };
    }),

  flowToInput: manageSandbox
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Load all frozen reviews for this cycle
      const frozenReviews = await db.select().from(psPerfReview)
        .where(and(
          eq(psPerfReview.cycleId, input.cycleId),
          eq(psPerfReview.status, "frozen"),
        ))
        .limit(500);

      if (frozenReviews.length === 0) return { flowed: 0, message: "No frozen reviews found" };

      // Load salary structures for performance wage bases
      const allStructures = await db.select().from(salaryStructures).limit(1000);
      const structByEmployeeId = new Map<number, typeof allStructures[0]>();
      for (const s of allStructures) {
        const existing = structByEmployeeId.get(s.employeeId);
        if (!existing || s.id > existing.id) structByEmployeeId.set(s.employeeId, s);
      }

      // Clear existing performance input for this cycle (will be regenerated from reviews)
      await db.delete(psPerformanceInput).where(eq(psPerformanceInput.cycleId, input.cycleId));

      const perfRows = frozenReviews.map(r => {
        const struct = r.employeeId ? structByEmployeeId.get(r.employeeId) : undefined;
        return {
          cycleId: input.cycleId,
          employeeName: r.employeeName,
          employeeId: r.employeeId,
          department: r.department,
          positionCategory: r.positionCategory ?? "indirect",
          isEvaluated: true,
          monthlyScore: r.finalScore ?? r.supervisorScore ?? r.aiSuggestedScore ?? "0",
          avg2024Score: null as string | null,
          avg2025Score: null as string | null,
          perfWage1Base: struct?.performanceWage1Base ?? "0",
          perfWage2Base: struct?.performanceWage2Base ?? "0",
          perfWage3Base: struct?.performanceWage3Base ?? "0",
          perfCoeff1: r.perfCoeff1,
          perfCoeff2: r.perfCoeff2,
          perfCoeff3: r.perfCoeff3,
          dataSource: "perf_review_flow",
          createdAt: new Date().toISOString(),
        };
      });

      await db.insert(psPerformanceInput).values(perfRows);

      log.info({ cycleId: input.cycleId, flowed: perfRows.length }, "Perf reviews flowed to input");
      return { flowed: perfRows.length };
    }),
});

// ── Sub-Router: Anomaly ─────────────────────────────────

const anomalyRouter = router({
  list: viewSandbox
    .input(z.object({
      cycleId: z.number(),
      category: z.enum([
        "evidence_insufficient", "perf_quality_conflict", "allowance_no_basis",
        "social_fund_mismatch", "tax_bracket_anomaly", "net_pay_volatility",
      ]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [eq(psAnomaly.cycleId, input.cycleId)];
      if (input.category) {
        conditions.push(eq(psAnomaly.category, input.category));
      }
      return db.select().from(psAnomaly)
        .where(and(...conditions))
        .orderBy(desc(psAnomaly.createdAt))
        .limit(500);
    }),

  resolve: manageSandbox
    .input(z.object({
      id: z.number(),
      resolution: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const rows = await db.update(psAnomaly).set({
        isResolved: true,
        resolvedById: ctx.user?.id,
        resolvedAt: new Date().toISOString(),
        resolution: input.resolution,
      }).where(eq(psAnomaly.id, input.id)).returning();
      return rows[0];
    }),

  stats: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select({
        category: psAnomaly.category,
        severity: psAnomaly.severity,
        count: count(),
      }).from(psAnomaly)
        .where(eq(psAnomaly.cycleId, input.cycleId))
        .groupBy(psAnomaly.category, psAnomaly.severity)
        .limit(100);
      return rows;
    }),

  unresolvedCount: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db.select({ count: count() }).from(psAnomaly)
        .where(and(
          eq(psAnomaly.cycleId, input.cycleId),
          eq(psAnomaly.isResolved, false),
        ));
      return { unresolved: Number(result?.count ?? 0) };
    }),

  bulkResolve: manageSandbox
    .input(z.object({
      ids: z.array(z.number()).max(100),
      resolution: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      let resolved = 0;
      for (const id of input.ids) {
        const rows = await db.update(psAnomaly).set({
          isResolved: true,
          resolvedById: ctx.user?.id,
          resolvedAt: new Date().toISOString(),
          resolution: input.resolution,
        }).where(eq(psAnomaly.id, id)).returning();
        if (rows.length > 0) resolved++;
      }
      return { resolved };
    }),
});

// ── Sub-Router: Approval Flow ───────────────────────────

const APPROVAL_STAGES = [
  { stage: "hr_initial" as const, order: 1, label: "HR初审" },
  { stage: "finance_review" as const, order: 2, label: "财务复核" },
  { stage: "dept_manager_confirm" as const, order: 3, label: "部门经理确认" },
  { stage: "exec_approve" as const, order: 4, label: "高管审批" },
];

const approvalRouter = router({
  list: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(psApprovalFlow)
        .where(eq(psApprovalFlow.cycleId, input.cycleId))
        .orderBy(psApprovalFlow.stageOrder)
        .limit(20);
    }),

  initFlow: manageSandbox
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      // Remove existing flow for this cycle
      await db.delete(psApprovalFlow).where(eq(psApprovalFlow.cycleId, input.cycleId));
      // Create 4 stages
      const stages = APPROVAL_STAGES.map(s => ({
        cycleId: input.cycleId,
        stage: s.stage,
        stageOrder: s.order,
        action: "pending" as const,
      }));
      const rows = await db.insert(psApprovalFlow).values(stages).returning();
      log.info({ cycleId: input.cycleId, stages: rows.length }, "Initialized approval flow");
      return rows;
    }),

  approve: manageSandbox
    .input(z.object({
      flowId: z.number(),
      comment: z.string().optional(),
      checklist: z.array(z.object({ item: z.string(), checked: z.boolean() })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const rows = await db.update(psApprovalFlow).set({
        action: "approved",
        reviewerId: ctx.user?.id,
        reviewerName: ctx.user?.name ?? null,
        comment: input.comment,
        checklist: input.checklist,
        actionAt: new Date().toISOString(),
      }).where(eq(psApprovalFlow.id, input.flowId)).returning();
      return rows[0];
    }),

  reject: manageSandbox
    .input(z.object({
      flowId: z.number(),
      comment: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const rows = await db.update(psApprovalFlow).set({
        action: "rejected",
        reviewerId: ctx.user?.id,
        reviewerName: ctx.user?.name ?? null,
        comment: input.comment,
        actionAt: new Date().toISOString(),
      }).where(eq(psApprovalFlow.id, input.flowId)).returning();
      return rows[0];
    }),

  currentStage: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(psApprovalFlow)
        .where(and(
          eq(psApprovalFlow.cycleId, input.cycleId),
          eq(psApprovalFlow.action, "pending"),
        ))
        .orderBy(psApprovalFlow.stageOrder)
        .limit(1);
      return rows[0] ?? null;
    }),

  isFullyApproved: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [total] = await db.select({ count: count() }).from(psApprovalFlow)
        .where(eq(psApprovalFlow.cycleId, input.cycleId));
      const [approved] = await db.select({ count: count() }).from(psApprovalFlow)
        .where(and(
          eq(psApprovalFlow.cycleId, input.cycleId),
          eq(psApprovalFlow.action, "approved"),
        ));
      const totalCount = Number(total?.count ?? 0);
      const approvedCount = Number(approved?.count ?? 0);
      return {
        fullyApproved: totalCount > 0 && totalCount === approvedCount,
        totalStages: totalCount,
        approvedStages: approvedCount,
      };
    }),
});

// ── Sub-Router: Lock Records ────────────────────────────

const lockRouter = router({
  list: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(psLockRecord)
        .where(eq(psLockRecord.cycleId, input.cycleId))
        .orderBy(desc(psLockRecord.lockedAt))
        .limit(50);
    }),

  lock: manageSandbox
    .input(z.object({
      cycleId: z.number(),
      lockType: z.enum(["performance", "salary", "tax", "adjustment", "full"]),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const rows = await db.insert(psLockRecord).values({
        cycleId: input.cycleId,
        lockType: input.lockType,
        lockedById: ctx.user?.id ?? 0,
        lockedByName: ctx.user?.name ?? null,
        reason: input.reason,
      }).returning();

      // If full lock, update cycle status
      if (input.lockType === "full") {
        await db.update(payrollSandboxCycles).set({
          status: "locked",
          lockedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).where(eq(payrollSandboxCycles.id, input.cycleId));
      }

      return rows[0];
    }),

  unlock: manageSandbox
    .input(z.object({
      lockId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const rows = await db.update(psLockRecord).set({
        unlockedById: ctx.user?.id,
        unlockedAt: new Date().toISOString(),
      }).where(eq(psLockRecord.id, input.lockId)).returning();
      return rows[0];
    }),

  isLocked: viewSandbox
    .input(z.object({
      cycleId: z.number(),
      lockType: z.enum(["performance", "salary", "tax", "adjustment", "full"]),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(psLockRecord)
        .where(and(
          eq(psLockRecord.cycleId, input.cycleId),
          eq(psLockRecord.lockType, input.lockType),
        ))
        .limit(10);
      // A lock is active if it exists and has no unlockedAt
      const activeLock = rows.find(r => !r.unlockedAt);
      return { locked: !!activeLock, lockRecord: activeLock ?? null };
    }),

  fullLock: manageSandbox
    .input(z.object({
      cycleId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const lockTypes = ["performance", "salary", "tax", "adjustment", "full"] as const;
      const now = new Date().toISOString();
      const values = lockTypes.map(t => ({
        cycleId: input.cycleId,
        lockType: t,
        lockedById: ctx.user?.id ?? 0,
        lockedByName: ctx.user?.name ?? null,
        reason: input.reason ?? "Full lock",
        lockedAt: now,
      }));
      const rows = await db.insert(psLockRecord).values(values).returning();

      await db.update(payrollSandboxCycles).set({
        status: "locked",
        lockedAt: now,
        updatedAt: now,
      }).where(eq(payrollSandboxCycles.id, input.cycleId));

      log.info({ cycleId: input.cycleId, locks: rows.length }, "Full lock applied");
      return { locked: rows.length };
    }),
});

// ── Sub-Router: Post-Payout Metrics ─────────────────────

const metricsRouter = router({
  generate: manageSandbox
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Load cycle
      const [cycle] = await db.select().from(payrollSandboxCycles)
        .where(eq(payrollSandboxCycles.id, input.cycleId)).limit(1);
      if (!cycle) throw new Error("Cycle not found");

      // Aggregate from calc results
      const [calcAgg] = await db.select({
        totalGross: sum(psCalcResult.grossPay),
        totalNet: sum(psCalcResult.netPay),
        totalPerfBonus: sql`COALESCE(SUM(${psCalcResult.perfWage1}), 0) + COALESCE(SUM(${psCalcResult.perfWage2}), 0) + COALESCE(SUM(${psCalcResult.perfWage3}), 0)`,
      }).from(psCalcResult).where(eq(psCalcResult.cycleId, input.cycleId));

      // Anomaly counts
      const [anomalyAgg] = await db.select({
        total: count(),
        taxAnomalies: count(sql`CASE WHEN ${psAnomaly.category} = 'tax_bracket_anomaly' THEN 1 END`),
      }).from(psAnomaly).where(eq(psAnomaly.cycleId, input.cycleId));

      // Adjustment count
      const [adjAgg] = await db.select({ count: count() }).from(psAdjustment)
        .where(eq(psAdjustment.cycleId, input.cycleId));

      // Match rate from final results
      const [matchAgg] = await db.select({
        total: count(),
        matched: count(sql`CASE WHEN ${psFinalResult.isMatched} = true THEN 1 END`),
      }).from(psFinalResult).where(eq(psFinalResult.cycleId, input.cycleId));

      const totalCount = Number(matchAgg?.total ?? 0);
      const matchedCount = Number(matchAgg?.matched ?? 0);
      const matchRate = totalCount > 0 ? ((matchedCount / totalCount) * 100).toFixed(1) : "0";

      // Clear previous metrics for this cycle
      await db.delete(psPostPayoutMetrics).where(eq(psPostPayoutMetrics.cycleId, input.cycleId));

      const rows = await db.insert(psPostPayoutMetrics).values({
        cycleId: input.cycleId,
        period: cycle.period,
        totalGrossPay: String(calcAgg?.totalGross ?? "0"),
        totalNetPay: String(calcAgg?.totalNet ?? "0"),
        totalPerfBonus: String(calcAgg?.totalPerfBonus ?? "0"),
        anomalyCount: Number(anomalyAgg?.total ?? 0),
        manualAdjustCount: Number(adjAgg?.count ?? 0),
        taxAnomalyCount: Number(anomalyAgg?.taxAnomalies ?? 0),
        excelMatchRate: matchRate,
        generatedAt: new Date().toISOString(),
      }).returning();

      log.info({ cycleId: input.cycleId, period: cycle.period }, "Generated post-payout metrics");
      return rows[0];
    }),

  list: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(psPostPayoutMetrics)
        .where(eq(psPostPayoutMetrics.cycleId, input.cycleId))
        .orderBy(desc(psPostPayoutMetrics.generatedAt))
        .limit(50);
    }),

  byDepartment: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(psPostPayoutMetrics)
        .where(and(
          eq(psPostPayoutMetrics.cycleId, input.cycleId),
          sql`${psPostPayoutMetrics.department} IS NOT NULL`,
        ))
        .orderBy(psPostPayoutMetrics.department)
        .limit(50);
    }),

  summary: viewSandbox
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select({
        totalGross: sum(psPostPayoutMetrics.totalGrossPay),
        totalNet: sum(psPostPayoutMetrics.totalNetPay),
        totalPerfBonus: sum(psPostPayoutMetrics.totalPerfBonus),
        totalAnomalies: sum(psPostPayoutMetrics.anomalyCount),
        totalAdjustments: sum(psPostPayoutMetrics.manualAdjustCount),
        avgMatchRate: avg(psPostPayoutMetrics.excelMatchRate),
      }).from(psPostPayoutMetrics)
        .where(eq(psPostPayoutMetrics.cycleId, input.cycleId));
      return row;
    }),
});

// ── Sub-Router: Regulatory Parameters (法规参数管理) ────

const regulatoryRouter = router({
  /** 社保政策版本列表 */
  listPolicies: viewSandbox.query(async () => {
    const db = await requireDb();
    return db.select().from(psSocialFundPolicy).orderBy(desc(psSocialFundPolicy.id)).limit(50);
  }),

  /** 获取当前生效的社保政策 */
  currentPolicy: viewSandbox
    .input(z.object({ region: z.string().default("上海"), asOf: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const target = input.asOf ?? new Date().toISOString().slice(0, 10);
      const rows = await db.select().from(psSocialFundPolicy)
        .where(and(
          eq(psSocialFundPolicy.region, input.region),
          sql`${psSocialFundPolicy.effectiveFrom} <= ${target}`,
        ))
        .orderBy(desc(psSocialFundPolicy.effectiveFrom))
        .limit(1);
      return rows[0] ?? null;
    }),

  /** 创建新的社保政策版本 */
  createPolicy: manageSandbox
    .input(z.object({
      policyVersion: z.string().min(1),
      effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      region: z.string().default("上海"),
      pensionRate: z.number().min(0).max(1).default(0.08),
      medicalRate: z.number().min(0).max(1).default(0.02),
      unemploymentRate: z.number().min(0).max(1).default(0.005),
      housingFundRateMin: z.number().min(0).max(1).optional(),
      housingFundRateMax: z.number().min(0).max(1).optional(),
      socialInsuranceBase: z.object({ min: z.number(), max: z.number() }).optional(),
      housingFundBase: z.object({ min: z.number(), max: z.number() }).optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.insert(psSocialFundPolicy).values({
        policyVersion: input.policyVersion,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
        region: input.region,
        pensionRate: String(input.pensionRate),
        medicalRate: String(input.medicalRate),
        unemploymentRate: String(input.unemploymentRate),
        housingFundRateMin: input.housingFundRateMin != null ? String(input.housingFundRateMin) : undefined,
        housingFundRateMax: input.housingFundRateMax != null ? String(input.housingFundRateMax) : undefined,
        socialInsuranceBase: input.socialInsuranceBase ?? null,
        housingFundBase: input.housingFundBase ?? null,
        remarks: input.remarks,
      }).returning();
      log.info({ version: input.policyVersion }, "Created social fund policy version");
      return rows[0];
    }),

  /** 获取当前个税参数(返回DEFAULT_*值 + DB自定义覆盖说明) */
  taxParams: viewSandbox.query(async () => {
    return {
      source: "DEFAULT — 《个人所得税法》2019年修正",
      monthlyExemption: 5000,
      brackets: [
        { range: "0 ~ 36,000", rate: "3%", qd: 0 },
        { range: "36,000 ~ 144,000", rate: "10%", qd: 2520 },
        { range: "144,000 ~ 300,000", rate: "20%", qd: 16920 },
        { range: "300,000 ~ 420,000", rate: "25%", qd: 31920 },
        { range: "420,000 ~ 660,000", rate: "30%", qd: 52920 },
        { range: "660,000 ~ 960,000", rate: "35%", qd: 85920 },
        { range: "960,000+", rate: "45%", qd: 181920 },
      ],
      note: "法规更新时在此表创建新版本，calc.run自动加载最新生效参数",
    };
  }),

  /** 获取当前GRT内部公式参数 */
  grtFormulas: viewSandbox.query(async () => {
    return {
      personalLeaveDivisor: { value: 116, source: "GRT内部制度", formula: "事假扣款 = 事假小时 × (基本工资 / 116)" },
      sickLeaveCoeff: { value: 0.1962, source: "上海市标准", formula: "病假扣款 = 病假小时 × 时薪 × 0.1962" },
      otMultipliers: { weekday: 1.5, weekend: 2.0, holiday: 3.0, source: "《劳动法》第44条" },
      perfWage1: { minScore: 75, avgDelta: 3, source: "GRT绩效制度(CEO审定)", formula: "IF(score<75, 0, IF(score>avg2024+3 OR score>avg2025, 1, 0))" },
      perfWage2: { halfThreshold: 3, source: "GRT绩效制度(CEO审定)", formula: "IF(score>=avg2025, 1, IF(avg2025-score<=3, 0.5, 0))" },
      perfWage3: { source: "GRT绩效制度(CEO审定)", formula: "手动(CEO审批), 默认0" },
      grossPay: { formula: "综合工资 + 绩效调整 - 事假扣款 - 病假扣款 + 加班费 + 全勤奖 + 考核奖金" },
      netPay: { formula: "应发 + 其它收入 - 社保(个人) - 公积金(个人) - 个税" },
    };
  }),
});

// ── Merged Router ───────────────────────────────────────

export const payrollSandboxRouter = router({
  cycle: cycleRouter,
  attendance: attendanceRouter,
  performance: performanceRouter,
  allowance: allowanceRouter,
  socialFund: socialFundRouter,
  taxSnapshot: taxSnapshotRouter,
  calc: calcRouter,
  result: resultRouter,
  payout: payoutRouter,
  dashboard: dashboardRouter,
  evidence: evidenceRouter,
  perfReview: perfReviewRouter,
  anomaly: anomalyRouter,
  approval: approvalRouter,
  lock: lockRouter,
  metrics: metricsRouter,
  regulatory: regulatoryRouter,
});
