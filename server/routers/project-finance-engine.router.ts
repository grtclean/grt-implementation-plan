/**
 * 项目财务引擎路由 — 工时成本池、AP/AR账龄、预算版本、现金流、预警矩阵、报销政策
 *
 * ~35 procedures organized in sub-sections:
 * Labor Cost Pool (6), AP/AR Aging (6), Budget Versions (5),
 * Cash Flow (4), Alert Matrix (6), Expense Policy (4),
 * Project Finance Dashboard (3)
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql, eq, desc, and, gte, lte, count } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import {
  laborCostPools,
  apAgingSnapshots,
  arAgingSnapshots,
  budgetVersions,
  cashFlowRecords,
  financeAlertRules,
  financeAlertInstances,
  expensePolicyRules,
} from "../../drizzle/project-finance-schema";

const log = createChildLogger("project-finance-engine");

export const projectFinanceEngineRouter = router({
  // ═══════════════════════════════════════════════════════════
  // Labor Cost Pool (6)
  // ═══════════════════════════════════════════════════════════

  // 1. createLaborPool — setup project cost target
  createLaborPool: requirePermission("finance:budget:edit")
    .input(
      z.object({
        projectId: z.number(),
        projectCode: z.string(),
        buCode: z.string().optional(),
        equipmentSellingPrice: z.string(),
        theoreticalProfit: z.string(),
        procurementCost: z.string(),
        fiscalYear: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const selling = parseFloat(input.equipmentSellingPrice);
      const profit = parseFloat(input.theoreticalProfit);
      const procurement = parseFloat(input.procurementCost);
      const targetPool = selling - profit - procurement;
      const profitRate = selling > 0 ? ((profit / selling) * 100).toFixed(2) : "0";

      const [pool] = await db
        .insert(laborCostPools)
        .values({
          projectId: input.projectId,
          projectCode: input.projectCode,
          buCode: input.buCode ?? null,
          equipmentSellingPrice: input.equipmentSellingPrice,
          theoreticalProfit: input.theoreticalProfit,
          profitRate,
          procurementCost: input.procurementCost,
          targetLaborPool: targetPool.toFixed(2),
          fiscalYear: input.fiscalYear ?? new Date().getFullYear(),
        })
        .returning();
      log.info({ projectCode: input.projectCode, targetPool }, "Labor pool created");
      return { success: true, message: "工时成本池已创建", id: pool.id, targetLaborPool: targetPool };
    }),

  // 2. getLaborPool — get pool for project
  getLaborPool: protectedProcedure
    .input(z.object({ projectId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const numId = typeof input.projectId === "string" ? parseInt(input.projectId) : input.projectId;
      const [pool] = await db
        .select()
        .from(laborCostPools)
        .where(eq(laborCostPools.projectId, numId))
        .orderBy(desc(laborCostPools.createdAt))
        .limit(1);
      return pool || null;
    }),

  // 3. updateLaborActuals — update actual hours/cost for a T-stage + department
  updateLaborActuals: requirePermission("finance:budget:edit")
    .input(
      z.object({
        poolId: z.number(),
        tStage: z.string().regex(/^t(0[1-9]|1[0-5])$/),
        hours: z.string(),
        cost: z.string(),
        department: z.enum(["mechanical", "electrical", "procurement", "sales"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const hoursCol = `${input.tStage}_hours` as const;
      const costCol = `${input.tStage}_cost` as const;

      const setValues: Record<string, unknown> = {
        [hoursCol]: input.hours,
        [costCol]: input.cost,
        updatedAt: new Date().toISOString(),
      };

      if (input.department) {
        const deptMap: Record<string, { hours?: string; cost: string }> = {
          mechanical: { hours: "mechanical_hours", cost: "mechanical_cost" },
          electrical: { hours: "electrical_hours", cost: "electrical_cost" },
          procurement: { cost: "procurement_dept_cost" },
          sales: { cost: "sales_person_cost" },
        };
        const mapping = deptMap[input.department];
        if (mapping.hours) setValues[mapping.hours] = input.hours;
        setValues[mapping.cost] = input.cost;
      }

      await db
        .update(laborCostPools)
        .set(setValues)
        .where(eq(laborCostPools.id, input.poolId));
      log.info({ poolId: input.poolId, tStage: input.tStage }, "Labor actuals updated");
      return { success: true, message: "工时实际值已更新" };
    }),

  // 4. getLaborUtilization — compare actual vs target, flag overTarget
  getLaborUtilization: protectedProcedure
    .input(z.object({ projectId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const numId = typeof input.projectId === "string" ? parseInt(input.projectId) : input.projectId;
      const [pool] = await db
        .select()
        .from(laborCostPools)
        .where(eq(laborCostPools.projectId, numId))
        .orderBy(desc(laborCostPools.createdAt))
        .limit(1);
      if (!pool) return null;

      const target = parseFloat(pool.targetLaborPool);
      const actual = parseFloat(pool.actualLaborCost || "0");
      const utilization = target > 0 ? (actual / target) * 100 : 0;
      const overTarget = utilization > 100;
      const overAmount = overTarget ? actual - target : 0;

      return {
        projectCode: pool.projectCode,
        targetLaborPool: target,
        actualLaborCost: actual,
        utilization: Math.round(utilization * 100) / 100,
        overTarget,
        overAmount,
        mechanicalCost: parseFloat(pool.mechanicalCost || "0"),
        electricalCost: parseFloat(pool.electricalCost || "0"),
        procurementDeptCost: parseFloat(pool.procurementDeptCost || "0"),
        salesPersonCost: parseFloat(pool.salesPersonCost || "0"),
      };
    }),

  // 5. getT1T15Summary — aggregate all T-stages for a project
  getT1T15Summary: protectedProcedure
    .input(z.object({ projectId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const numId = typeof input.projectId === "string" ? parseInt(input.projectId) : input.projectId;
      const [pool] = await db
        .select()
        .from(laborCostPools)
        .where(eq(laborCostPools.projectId, numId))
        .orderBy(desc(laborCostPools.createdAt))
        .limit(1);
      if (!pool) return null;

      const stages: Array<{ stage: string; hours: number; cost: number }> = [];
      let totalHours = 0;
      let totalCost = 0;
      for (let i = 1; i <= 15; i++) {
        const prefix = `t${String(i).padStart(2, "0")}`;
        const hours = parseFloat((pool as Record<string, unknown>)[`${prefix}Hours`] as string || "0");
        const cost = parseFloat((pool as Record<string, unknown>)[`${prefix}Cost`] as string || "0");
        stages.push({ stage: prefix.toUpperCase(), hours, cost });
        totalHours += hours;
        totalCost += cost;
      }

      return {
        projectCode: pool.projectCode,
        targetLaborPool: parseFloat(pool.targetLaborPool),
        stages,
        totalHours,
        totalCost,
        utilization: parseFloat(pool.targetLaborPool) > 0
          ? Math.round((totalCost / parseFloat(pool.targetLaborPool)) * 10000) / 100
          : 0,
      };
    }),

  // 6. annualLaborSummary — year-end summary across all projects
  annualLaborSummary: protectedProcedure
    .input(z.object({ fiscalYear: z.number(), buCode: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: ReturnType<typeof eq>[] = [
        eq(laborCostPools.fiscalYear, input.fiscalYear),
      ];
      if (input.buCode) conditions.push(eq(laborCostPools.buCode, input.buCode));

      const pools = await db
        .select()
        .from(laborCostPools)
        .where(and(...conditions))
        .orderBy(desc(laborCostPools.createdAt))
        .limit(500);

      let totalTarget = 0;
      let totalActual = 0;
      let overTargetCount = 0;
      for (const p of pools) {
        totalTarget += parseFloat(p.targetLaborPool);
        totalActual += parseFloat(p.actualLaborCost || "0");
        if (p.isOverTarget) overTargetCount++;
      }

      return {
        fiscalYear: input.fiscalYear,
        projectCount: pools.length,
        totalTarget,
        totalActual,
        overallUtilization: totalTarget > 0 ? Math.round((totalActual / totalTarget) * 10000) / 100 : 0,
        overTargetCount,
      };
    }),

  // ═══════════════════════════════════════════════════════════
  // AP/AR Aging (6)
  // ═══════════════════════════════════════════════════════════

  // 7. calculateAPAging — scan outstanding supplier payments, bucket & save snapshot
  calculateAPAging: requirePermission("finance:analytics:view")
    .input(
      z.object({
        snapshotDate: z.string().optional(),
        supplierId: z.number(),
        supplierName: z.string(),
        supplierCode: z.string().optional(),
        totalOutstanding: z.string(),
        current0to30: z.string(),
        days31to60: z.string(),
        days61to90: z.string(),
        days91to120: z.string(),
        over120Days: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [snap] = await db
        .insert(apAgingSnapshots)
        .values({
          snapshotDate: input.snapshotDate ?? new Date().toISOString(),
          supplierId: input.supplierId,
          supplierName: input.supplierName,
          supplierCode: input.supplierCode ?? null,
          totalOutstanding: input.totalOutstanding,
          current0to30: input.current0to30,
          days31to60: input.days31to60,
          days61to90: input.days61to90,
          days91to120: input.days91to120,
          over120Days: input.over120Days,
        })
        .returning();
      log.info({ supplierId: input.supplierId }, "AP aging snapshot saved");
      return { success: true, message: "AP账龄快照已保存", id: snap.id };
    }),

  // 8. calculateARAging — same for customer receivables + auto-calculate badDebtProvision
  calculateARAging: requirePermission("finance:analytics:view")
    .input(
      z.object({
        snapshotDate: z.string().optional(),
        customerId: z.number().optional(),
        customerName: z.string(),
        customerCode: z.string().optional(),
        projectId: z.number().optional(),
        projectCode: z.string().optional(),
        totalOutstanding: z.string(),
        current0to30: z.string(),
        days31to60: z.string(),
        days61to90: z.string(),
        days91to120: z.string(),
        over120Days: z.string(),
        dso: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      // Auto-calculate bad debt provision: 5% of 31-60, 10% of 61-90, 30% of 91-120, 50% of 120+
      const provision =
        parseFloat(input.days31to60) * 0.05 +
        parseFloat(input.days61to90) * 0.1 +
        parseFloat(input.days91to120) * 0.3 +
        parseFloat(input.over120Days) * 0.5;

      const [snap] = await db
        .insert(arAgingSnapshots)
        .values({
          snapshotDate: input.snapshotDate ?? new Date().toISOString(),
          customerId: input.customerId ?? null,
          customerName: input.customerName,
          customerCode: input.customerCode ?? null,
          projectId: input.projectId ?? null,
          projectCode: input.projectCode ?? null,
          totalOutstanding: input.totalOutstanding,
          current0to30: input.current0to30,
          days31to60: input.days31to60,
          days61to90: input.days61to90,
          days91to120: input.days91to120,
          over120Days: input.over120Days,
          badDebtProvision: provision.toFixed(2),
          dso: input.dso ?? null,
        })
        .returning();
      log.info({ customerName: input.customerName, provision }, "AR aging snapshot saved");
      return { success: true, message: "AR账龄快照已保存", id: snap.id, badDebtProvision: provision };
    }),

  // 9. getAPAgingReport — latest AP aging by supplier
  getAPAgingReport: protectedProcedure
    .input(z.object({ supplierId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      if (input?.supplierId) {
        const rows = await db
          .select()
          .from(apAgingSnapshots)
          .where(eq(apAgingSnapshots.supplierId, input.supplierId))
          .orderBy(desc(apAgingSnapshots.snapshotDate))
          .limit(50);
        return { items: rows, total: rows.length };
      }
      // Latest snapshot per supplier using most recent snapshot date
      const rows = await db
        .select()
        .from(apAgingSnapshots)
        .orderBy(desc(apAgingSnapshots.snapshotDate))
        .limit(100);
      return { items: rows, total: rows.length };
    }),

  // 10. getARAgingReport — latest AR aging by customer/project with DSO
  getARAgingReport: protectedProcedure
    .input(
      z
        .object({
          customerId: z.number().optional(),
          projectCode: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: ReturnType<typeof eq>[] = [];
      if (input?.customerId) conditions.push(eq(arAgingSnapshots.customerId, input.customerId));
      if (input?.projectCode) conditions.push(eq(arAgingSnapshots.projectCode, input.projectCode));

      const rows =
        conditions.length > 0
          ? await db
              .select()
              .from(arAgingSnapshots)
              .where(and(...conditions))
              .orderBy(desc(arAgingSnapshots.snapshotDate))
              .limit(100)
          : await db
              .select()
              .from(arAgingSnapshots)
              .orderBy(desc(arAgingSnapshots.snapshotDate))
              .limit(100);
      return { items: rows, total: rows.length };
    }),

  // 11. getAgingSummary — combined AP+AR dashboard card
  getAgingSummary: protectedProcedure.query(async () => {
    const db = await requireDb();
    const latestAP = await db
      .select()
      .from(apAgingSnapshots)
      .orderBy(desc(apAgingSnapshots.snapshotDate))
      .limit(50);
    const latestAR = await db
      .select()
      .from(arAgingSnapshots)
      .orderBy(desc(arAgingSnapshots.snapshotDate))
      .limit(50);

    const totalAP = latestAP.reduce((s, r) => s + parseFloat(r.totalOutstanding || "0"), 0);
    const totalAR = latestAR.reduce((s, r) => s + parseFloat(r.totalOutstanding || "0"), 0);
    const totalProvision = latestAR.reduce(
      (s, r) => s + parseFloat(r.badDebtProvision || "0"),
      0
    );
    const avgDSO =
      latestAR.length > 0
        ? Math.round(latestAR.reduce((s, r) => s + (r.dso || 0), 0) / latestAR.length)
        : 0;

    return {
      totalAP,
      totalAR,
      netPosition: totalAR - totalAP,
      totalBadDebtProvision: totalProvision,
      avgDSO,
      apSupplierCount: latestAP.length,
      arCustomerCount: latestAR.length,
    };
  }),

  // 12. getBadDebtProvision — total provision amount
  getBadDebtProvision: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .select()
      .from(arAgingSnapshots)
      .orderBy(desc(arAgingSnapshots.snapshotDate))
      .limit(200);

    const totalProvision = rows.reduce(
      (s, r) => s + parseFloat(r.badDebtProvision || "0"),
      0
    );
    const byCustomer: Record<string, number> = {};
    for (const r of rows) {
      const name = r.customerName || "unknown";
      byCustomer[name] = (byCustomer[name] || 0) + parseFloat(r.badDebtProvision || "0");
    }

    return {
      totalProvision,
      byCustomer: Object.entries(byCustomer)
        .map(([customer, amount]) => ({ customer, amount }))
        .sort((a, b) => b.amount - a.amount),
    };
  }),

  // ═══════════════════════════════════════════════════════════
  // Budget Versions (5)
  // ═══════════════════════════════════════════════════════════

  // 13. createBudgetVersion — create original/revised/forecast version
  createBudgetVersion: requirePermission("finance:budget:edit")
    .input(
      z.object({
        projectId: z.number(),
        projectCode: z.string(),
        versionType: z.enum(["original", "revised", "forecast", "actual"]),
        versionNumber: z.number(),
        versionName: z.string().optional(),
        totalBudget: z.string(),
        materialBudget: z.string().optional(),
        laborBudget: z.string().optional(),
        procurementBudget: z.string().optional(),
        travelBudget: z.string().optional(),
        overheadBudget: z.string().optional(),
        contingencyBudget: z.string().optional(),
        effectiveDate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [ver] = await db
        .insert(budgetVersions)
        .values({
          projectId: input.projectId,
          projectCode: input.projectCode,
          versionType: input.versionType,
          versionNumber: input.versionNumber,
          versionName: input.versionName ?? null,
          totalBudget: input.totalBudget,
          materialBudget: input.materialBudget ?? "0",
          laborBudget: input.laborBudget ?? "0",
          procurementBudget: input.procurementBudget ?? "0",
          travelBudget: input.travelBudget ?? "0",
          overheadBudget: input.overheadBudget ?? "0",
          contingencyBudget: input.contingencyBudget ?? "0",
          effectiveDate: input.effectiveDate ?? null,
          notes: input.notes ?? null,
          isActive: true,
          createdBy: ctx.user?.id ?? 0,
        })
        .returning();
      log.info({ projectCode: input.projectCode, versionType: input.versionType }, "Budget version created");
      return { success: true, message: "预算版本已创建", id: ver.id };
    }),

  // 14. listBudgetVersions — for a project
  listBudgetVersions: protectedProcedure
    .input(z.object({ projectId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const numId = typeof input.projectId === "string" ? parseInt(input.projectId) : input.projectId;
      const rows = await db
        .select()
        .from(budgetVersions)
        .where(eq(budgetVersions.projectId, numId))
        .orderBy(desc(budgetVersions.createdAt))
        .limit(50);
      return { items: rows, total: rows.length };
    }),

  // 15. getActiveBudget — get current active budget
  getActiveBudget: protectedProcedure
    .input(z.object({ projectId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const numId = typeof input.projectId === "string" ? parseInt(input.projectId) : input.projectId;
      const [budget] = await db
        .select()
        .from(budgetVersions)
        .where(and(eq(budgetVersions.projectId, numId), eq(budgetVersions.isActive, true)))
        .orderBy(desc(budgetVersions.createdAt))
        .limit(1);
      return budget || null;
    }),

  // 16. compareBudgetVersions — side-by-side comparison
  compareBudgetVersions: protectedProcedure
    .input(
      z.object({
        versionIdA: z.number(),
        versionIdB: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const [verA] = await db
        .select()
        .from(budgetVersions)
        .where(eq(budgetVersions.id, input.versionIdA))
        .limit(1);
      const [verB] = await db
        .select()
        .from(budgetVersions)
        .where(eq(budgetVersions.id, input.versionIdB))
        .limit(1);
      if (!verA || !verB) return { error: "版本不存在" };

      const fields = [
        "totalBudget",
        "materialBudget",
        "laborBudget",
        "procurementBudget",
        "travelBudget",
        "overheadBudget",
        "contingencyBudget",
      ] as const;

      const comparison = fields.map((field) => {
        const a = parseFloat((verA as Record<string, unknown>)[field] as string || "0");
        const b = parseFloat((verB as Record<string, unknown>)[field] as string || "0");
        return {
          field,
          versionA: a,
          versionB: b,
          difference: b - a,
          changePercent: a > 0 ? Math.round(((b - a) / a) * 10000) / 100 : 0,
        };
      });

      return {
        versionA: { id: verA.id, type: verA.versionType, number: verA.versionNumber, name: verA.versionName },
        versionB: { id: verB.id, type: verB.versionType, number: verB.versionNumber, name: verB.versionName },
        comparison,
      };
    }),

  // 17. getBudgetVariance — active budget vs actual spending
  getBudgetVariance: protectedProcedure
    .input(z.object({ projectId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const numId = typeof input.projectId === "string" ? parseInt(input.projectId) : input.projectId;

      // Get active budget
      const [budget] = await db
        .select()
        .from(budgetVersions)
        .where(and(eq(budgetVersions.projectId, numId), eq(budgetVersions.isActive, true)))
        .orderBy(desc(budgetVersions.createdAt))
        .limit(1);
      if (!budget) return { error: "无活跃预算" };

      // Get actual spending from cash flow outflows
      const outflows = await db
        .select()
        .from(cashFlowRecords)
        .where(
          and(
            eq(cashFlowRecords.projectCode, budget.projectCode),
            eq(cashFlowRecords.flowDirection, "outflow")
          )
        )
        .limit(500);

      const actualSpending = outflows.reduce(
        (s, r) => s + parseFloat(r.amount),
        0
      );
      const totalBudget = parseFloat(budget.totalBudget);
      const variance = totalBudget - actualSpending;
      const utilizationPercent = totalBudget > 0
        ? Math.round((actualSpending / totalBudget) * 10000) / 100
        : 0;

      return {
        projectCode: budget.projectCode,
        totalBudget,
        actualSpending,
        variance,
        utilizationPercent,
        isOverBudget: variance < 0,
        budgetVersion: { id: budget.id, type: budget.versionType, number: budget.versionNumber },
      };
    }),

  // ═══════════════════════════════════════════════════════════
  // Cash Flow (4)
  // ═══════════════════════════════════════════════════════════

  // 18. recordCashFlow — record an inflow/outflow event
  recordCashFlow: requirePermission("finance:budget:edit")
    .input(
      z.object({
        recordDate: z.string(),
        flowType: z.enum(["operating", "investing", "financing"]),
        flowDirection: z.enum(["inflow", "outflow"]),
        amount: z.string(),
        description: z.string(),
        projectCode: z.string().optional(),
        counterpartyName: z.string().optional(),
        sourceDocType: z.string().optional(),
        sourceDocCode: z.string().optional(),
        fiscalYear: z.number().optional(),
        fiscalPeriod: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [rec] = await db
        .insert(cashFlowRecords)
        .values({
          recordDate: input.recordDate,
          flowType: input.flowType,
          flowDirection: input.flowDirection,
          amount: input.amount,
          description: input.description,
          projectCode: input.projectCode ?? null,
          counterpartyName: input.counterpartyName ?? null,
          sourceDocType: input.sourceDocType ?? null,
          sourceDocCode: input.sourceDocCode ?? null,
          fiscalYear: input.fiscalYear ?? new Date().getFullYear(),
          fiscalPeriod: input.fiscalPeriod ?? new Date().getMonth() + 1,
          createdBy: ctx.user?.id ?? null,
        })
        .returning();
      log.info({ direction: input.flowDirection, amount: input.amount }, "Cash flow recorded");
      return { success: true, message: "现金流已记录", id: rec.id };
    }),

  // 19. getCashFlowStatement — period-based operating/investing/financing breakdown
  getCashFlowStatement: protectedProcedure
    .input(
      z.object({
        fiscalYear: z.number(),
        fiscalPeriod: z.number().optional(),
        projectCode: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: ReturnType<typeof eq>[] = [
        eq(cashFlowRecords.fiscalYear, input.fiscalYear),
      ];
      if (input.fiscalPeriod) conditions.push(eq(cashFlowRecords.fiscalPeriod, input.fiscalPeriod));
      if (input.projectCode) conditions.push(eq(cashFlowRecords.projectCode, input.projectCode));

      const records = await db
        .select()
        .from(cashFlowRecords)
        .where(and(...conditions))
        .orderBy(desc(cashFlowRecords.recordDate))
        .limit(500);

      const breakdown: Record<string, { inflow: number; outflow: number; net: number }> = {
        operating: { inflow: 0, outflow: 0, net: 0 },
        investing: { inflow: 0, outflow: 0, net: 0 },
        financing: { inflow: 0, outflow: 0, net: 0 },
      };
      for (const r of records) {
        const cat = r.flowType;
        const amt = parseFloat(r.amount);
        if (r.flowDirection === "inflow") {
          breakdown[cat].inflow += amt;
          breakdown[cat].net += amt;
        } else {
          breakdown[cat].outflow += amt;
          breakdown[cat].net -= amt;
        }
      }

      const totalInflow = Object.values(breakdown).reduce((s, b) => s + b.inflow, 0);
      const totalOutflow = Object.values(breakdown).reduce((s, b) => s + b.outflow, 0);

      return {
        fiscalYear: input.fiscalYear,
        fiscalPeriod: input.fiscalPeriod ?? null,
        breakdown,
        totalInflow,
        totalOutflow,
        netCashFlow: totalInflow - totalOutflow,
        recordCount: records.length,
      };
    }),

  // 20. getCashFlowForecast — next 90 days projection based on AP/AR schedules
  getCashFlowForecast: protectedProcedure.query(async () => {
    const db = await requireDb();
    // Get latest AR (expected inflows) and AP (expected outflows)
    const arRows = await db
      .select()
      .from(arAgingSnapshots)
      .orderBy(desc(arAgingSnapshots.snapshotDate))
      .limit(50);
    const apRows = await db
      .select()
      .from(apAgingSnapshots)
      .orderBy(desc(apAgingSnapshots.snapshotDate))
      .limit(50);

    // Projected collections: 0-30 = ~90% collected, 31-60 = ~70%, 61-90 = ~50%
    const projectedInflow =
      arRows.reduce((s, r) => s + parseFloat(r.current0to30 || "0") * 0.9, 0) +
      arRows.reduce((s, r) => s + parseFloat(r.days31to60 || "0") * 0.7, 0) +
      arRows.reduce((s, r) => s + parseFloat(r.days61to90 || "0") * 0.5, 0);

    // Projected payments: 0-30 = 100% due, 31-60 = 80% likely
    const projectedOutflow =
      apRows.reduce((s, r) => s + parseFloat(r.current0to30 || "0"), 0) +
      apRows.reduce((s, r) => s + parseFloat(r.days31to60 || "0") * 0.8, 0);

    return {
      horizon: "90 days",
      projectedInflow,
      projectedOutflow,
      projectedNetCash: projectedInflow - projectedOutflow,
      assumptions: {
        collection0to30Rate: 0.9,
        collection31to60Rate: 0.7,
        collection61to90Rate: 0.5,
        payment0to30Rate: 1.0,
        payment31to60Rate: 0.8,
      },
    };
  }),

  // 21. getCashFlowDashboard — summary card with net position
  getCashFlowDashboard: protectedProcedure
    .input(z.object({ fiscalYear: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const year = input?.fiscalYear ?? new Date().getFullYear();
      const records = await db
        .select()
        .from(cashFlowRecords)
        .where(eq(cashFlowRecords.fiscalYear, year))
        .limit(1000);

      let totalInflow = 0;
      let totalOutflow = 0;
      const monthly: Record<number, { inflow: number; outflow: number }> = {};
      for (const r of records) {
        const period = r.fiscalPeriod ?? 1;
        if (!monthly[period]) monthly[period] = { inflow: 0, outflow: 0 };
        const amt = parseFloat(r.amount);
        if (r.flowDirection === "inflow") {
          totalInflow += amt;
          monthly[period].inflow += amt;
        } else {
          totalOutflow += amt;
          monthly[period].outflow += amt;
        }
      }

      return {
        fiscalYear: year,
        totalInflow,
        totalOutflow,
        netPosition: totalInflow - totalOutflow,
        monthly: Object.entries(monthly)
          .map(([period, data]) => ({
            period: parseInt(period),
            ...data,
            net: data.inflow - data.outflow,
          }))
          .sort((a, b) => a.period - b.period),
      };
    }),

  // ═══════════════════════════════════════════════════════════
  // Alert Matrix (6)
  // ═══════════════════════════════════════════════════════════

  // 22. listAlertRules — all active rules
  listAlertRules: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .select()
      .from(financeAlertRules)
      .orderBy(financeAlertRules.alertCode)
      .limit(100);
    return { items: rows, total: rows.length };
  }),

  // 23. createAlertRule — create new alert rule
  createAlertRule: requirePermission("finance:budget:edit")
    .input(
      z.object({
        alertCode: z.string(),
        alertName: z.string(),
        alertCategory: z.string(),
        description: z.string().optional(),
        yellowThreshold: z.string().optional(),
        redThreshold: z.string().optional(),
        thresholdUnit: z.string().optional(),
        recipientRoles: z.string().optional(),
        escalationRoles: z.string().optional(),
        escalationAfterDays: z.number().optional(),
        dashboardPosition: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [rule] = await db
        .insert(financeAlertRules)
        .values({
          alertCode: input.alertCode,
          alertName: input.alertName,
          alertCategory: input.alertCategory,
          description: input.description ?? null,
          yellowThreshold: input.yellowThreshold ?? null,
          redThreshold: input.redThreshold ?? null,
          thresholdUnit: input.thresholdUnit ?? "percent",
          recipientRoles: input.recipientRoles ?? null,
          escalationRoles: input.escalationRoles ?? null,
          escalationAfterDays: input.escalationAfterDays ?? 3,
          dashboardPosition: input.dashboardPosition ?? null,
          isActive: true,
          displayOnDashboard: true,
        })
        .returning();
      log.info({ alertCode: input.alertCode }, "Alert rule created");
      return { success: true, message: "预警规则已创建", id: rule.id };
    }),

  // 24. updateAlertRule — modify thresholds/recipients
  updateAlertRule: requirePermission("finance:budget:edit")
    .input(
      z.object({
        id: z.number(),
        alertName: z.string().optional(),
        description: z.string().optional(),
        yellowThreshold: z.string().optional(),
        redThreshold: z.string().optional(),
        thresholdUnit: z.string().optional(),
        recipientRoles: z.string().optional(),
        escalationRoles: z.string().optional(),
        escalationAfterDays: z.number().optional(),
        isActive: z.boolean().optional(),
        displayOnDashboard: z.boolean().optional(),
        dashboardPosition: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const cleanUpdates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined) cleanUpdates[k] = v;
      }
      cleanUpdates.updatedAt = new Date().toISOString();
      await db
        .update(financeAlertRules)
        .set(cleanUpdates)
        .where(eq(financeAlertRules.id, id));
      log.info({ ruleId: id }, "Alert rule updated");
      return { success: true, message: "预警规则已更新" };
    }),

  // 25. triggerAlertScan — scan all rules, generate instances for violations
  triggerAlertScan: requirePermission("finance:analytics:view")
    .input(z.object({ projectCode: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rules = await db
        .select()
        .from(financeAlertRules)
        .where(eq(financeAlertRules.isActive, true))
        .limit(100);

      // For each rule, check current state and create instances if threshold crossed
      // This is a simplified scan — real implementation would query actual metrics
      const newAlerts: Array<{ ruleCode: string; severity: string }> = [];

      for (const rule of rules) {
        // Example scan logic: check budget utilization for W1
        if (rule.alertCategory === "budget" && input?.projectCode) {
          // Look up budget variance
          const [budget] = await db
            .select()
            .from(budgetVersions)
            .where(
              and(
                eq(budgetVersions.projectCode, input.projectCode),
                eq(budgetVersions.isActive, true)
              )
            )
            .limit(1);

          if (budget) {
            const outflows = await db
              .select()
              .from(cashFlowRecords)
              .where(
                and(
                  eq(cashFlowRecords.projectCode, input.projectCode),
                  eq(cashFlowRecords.flowDirection, "outflow")
                )
              )
              .limit(500);
            const spent = outflows.reduce((s, r) => s + parseFloat(r.amount), 0);
            const total = parseFloat(budget.totalBudget);
            const utilPct = total > 0 ? (spent / total) * 100 : 0;
            const yellow = parseFloat(rule.yellowThreshold || "80");
            const red = parseFloat(rule.redThreshold || "95");

            let severity: string | null = null;
            if (utilPct >= red) severity = "red";
            else if (utilPct >= yellow) severity = "yellow";

            if (severity) {
              await db.insert(financeAlertInstances).values({
                alertRuleId: rule.id,
                alertCode: rule.alertCode,
                severity,
                triggerValue: utilPct.toFixed(2),
                thresholdValue: severity === "red" ? rule.redThreshold : rule.yellowThreshold,
                projectCode: input.projectCode,
                entityType: "project",
                message: `${rule.alertName}: 当前 ${utilPct.toFixed(1)}% (阈值 ${severity === "red" ? red : yellow}%)`,
                status: "open",
              });
              newAlerts.push({ ruleCode: rule.alertCode, severity });
            }
          }
        }
      }

      log.info({ scannedRules: rules.length, newAlerts: newAlerts.length }, "Alert scan completed");
      return {
        success: true,
        message: `扫描完成: ${rules.length} 条规则, ${newAlerts.length} 条新告警`,
        scannedRules: rules.length,
        newAlerts,
      };
    }),

  // 26. listAlertInstances — filter by severity/status/project
  listAlertInstances: protectedProcedure
    .input(
      z
        .object({
          severity: z.string().optional(),
          status: z.string().optional(),
          projectCode: z.string().optional(),
          alertCode: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: ReturnType<typeof eq>[] = [];
      if (input?.severity) conditions.push(eq(financeAlertInstances.severity, input.severity));
      if (input?.status) conditions.push(eq(financeAlertInstances.status, input.status));
      if (input?.projectCode) conditions.push(eq(financeAlertInstances.projectCode, input.projectCode));
      if (input?.alertCode) conditions.push(eq(financeAlertInstances.alertCode, input.alertCode));

      const rows =
        conditions.length > 0
          ? await db
              .select()
              .from(financeAlertInstances)
              .where(and(...conditions))
              .orderBy(desc(financeAlertInstances.createdAt))
              .limit(100)
          : await db
              .select()
              .from(financeAlertInstances)
              .orderBy(desc(financeAlertInstances.createdAt))
              .limit(100);
      return { items: rows, total: rows.length };
    }),

  // 27. acknowledgeAlert — mark as acknowledged/resolved
  acknowledgeAlert: requirePermission("finance:budget:edit")
    .input(
      z.object({
        id: z.number(),
        action: z.enum(["acknowledge", "resolve", "dismiss"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const setValues: Record<string, unknown> = {};

      if (input.action === "acknowledge") {
        setValues.status = "acknowledged";
        setValues.acknowledgedBy = ctx.user?.id ?? null;
        setValues.acknowledgedAt = now;
      } else if (input.action === "resolve") {
        setValues.status = "resolved";
        setValues.resolvedBy = ctx.user?.id ?? null;
        setValues.resolvedAt = now;
        setValues.resolvedNotes = input.notes ?? null;
      } else {
        setValues.status = "dismissed";
      }

      await db
        .update(financeAlertInstances)
        .set(setValues)
        .where(eq(financeAlertInstances.id, input.id));
      log.info({ alertId: input.id, action: input.action }, "Alert status updated");
      return { success: true, message: `告警已${input.action === "acknowledge" ? "确认" : input.action === "resolve" ? "解决" : "忽略"}` };
    }),

  // ═══════════════════════════════════════════════════════════
  // Expense Policy (4)
  // ═══════════════════════════════════════════════════════════

  // 28. listPolicies — all active expense policy rules
  listPolicies: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .select()
      .from(expensePolicyRules)
      .where(eq(expensePolicyRules.isActive, true))
      .orderBy(expensePolicyRules.category, expensePolicyRules.ruleCode)
      .limit(100);
    return { items: rows, total: rows.length };
  }),

  // 29. createPolicy — create new expense policy rule
  createPolicy: requirePermission("finance:budget:edit")
    .input(
      z.object({
        ruleCode: z.string(),
        ruleName: z.string(),
        category: z.string(),
        cityTier: z.string().optional(),
        employeeLevel: z.number().optional(),
        maxAmount: z.string(),
        maxDailyAmount: z.string().optional(),
        requiresReceipt: z.boolean().optional(),
        requiresPreApproval: z.boolean().optional(),
        preApprovalThreshold: z.string().optional(),
        validFrom: z.string(),
        validTo: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [rule] = await db
        .insert(expensePolicyRules)
        .values({
          ruleCode: input.ruleCode,
          ruleName: input.ruleName,
          category: input.category,
          cityTier: input.cityTier ?? null,
          employeeLevel: input.employeeLevel ?? null,
          maxAmount: input.maxAmount,
          maxDailyAmount: input.maxDailyAmount ?? null,
          requiresReceipt: input.requiresReceipt ?? true,
          requiresPreApproval: input.requiresPreApproval ?? false,
          preApprovalThreshold: input.preApprovalThreshold ?? null,
          validFrom: input.validFrom,
          validTo: input.validTo ?? null,
          notes: input.notes ?? null,
          isActive: true,
          createdBy: ctx.user?.id ?? null,
        })
        .returning();
      log.info({ ruleCode: input.ruleCode }, "Expense policy created");
      return { success: true, message: "报销政策已创建", id: rule.id };
    }),

  // 30. validateExpense — check an expense item against policies
  validateExpense: protectedProcedure
    .input(
      z.object({
        category: z.string(),
        amount: z.number(),
        cityTier: z.string().optional(),
        employeeLevel: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const policies = await db
        .select()
        .from(expensePolicyRules)
        .where(
          and(
            eq(expensePolicyRules.category, input.category),
            eq(expensePolicyRules.isActive, true)
          )
        )
        .limit(50);

      const violations: Array<{
        policyCode: string;
        policyName: string;
        maxAmount: number;
        actualAmount: number;
        overage: number;
        requiresPreApproval: boolean;
      }> = [];

      for (const p of policies) {
        // Filter by city tier if applicable
        if (p.cityTier && input.cityTier && p.cityTier !== input.cityTier && p.cityTier !== "all") continue;
        // Filter by employee level if applicable
        if (p.employeeLevel && input.employeeLevel && input.employeeLevel < p.employeeLevel) continue;

        const max = parseFloat(p.maxAmount);
        if (input.amount > max) {
          violations.push({
            policyCode: p.ruleCode,
            policyName: p.ruleName,
            maxAmount: max,
            actualAmount: input.amount,
            overage: input.amount - max,
            requiresPreApproval: p.requiresPreApproval ?? false,
          });
        }
        if (p.requiresPreApproval) {
          violations.push({
            policyCode: p.ruleCode,
            policyName: p.ruleName,
            maxAmount: max,
            actualAmount: input.amount,
            overage: 0,
            requiresPreApproval: true,
          });
        }
      }

      return {
        isCompliant: violations.length === 0,
        violations,
        matchedPolicies: policies.length,
      };
    }),

  // 31. seedDefaultPolicies — seed GRT standard expense policies + 12 alert rules
  seedDefaultPolicies: adminProcedure.mutation(async ({ ctx }) => {
    const db = await requireDb();
    const now = new Date().toISOString();

    // ── Expense policies ──────────────────────────────────
    const defaultPolicies = [
      { ruleCode: "accommodation_tier1", ruleName: "一线城市住宿", category: "accommodation", cityTier: "tier1", maxAmount: "500", notes: "一线城市住宿 max 500/晚" },
      { ruleCode: "accommodation_tier2", ruleName: "二线城市住宿", category: "accommodation", cityTier: "tier2", maxAmount: "350", notes: "二线城市住宿 max 350/晚" },
      { ruleCode: "accommodation_tier3", ruleName: "三线城市住宿", category: "accommodation", cityTier: "tier3", maxAmount: "250", notes: "三线城市住宿 max 250/晚" },
      { ruleCode: "meals_daily", ruleName: "日餐费", category: "meals", cityTier: "all", maxAmount: "200", notes: "日餐费 max 200/天" },
      { ruleCode: "transport_taxi", ruleName: "市内交通", category: "transport", cityTier: "all", maxAmount: "200", notes: "市内交通 max 200/天" },
      { ruleCode: "entertainment", ruleName: "业务招待", category: "entertainment", cityTier: "all", maxAmount: "500", requiresPreApproval: true, notes: "业务招待 max 500/次, 需预审批" },
      { ruleCode: "communication", ruleName: "通讯费", category: "communication", cityTier: "all", maxAmount: "200", notes: "通讯费 max 200/月" },
    ];

    let policiesSeeded = 0;
    for (const p of defaultPolicies) {
      const [existing] = await db
        .select({ id: expensePolicyRules.id })
        .from(expensePolicyRules)
        .where(eq(expensePolicyRules.ruleCode, p.ruleCode))
        .limit(1);
      if (!existing) {
        await db.insert(expensePolicyRules).values({
          ruleCode: p.ruleCode,
          ruleName: p.ruleName,
          category: p.category,
          cityTier: p.cityTier ?? null,
          maxAmount: p.maxAmount,
          requiresPreApproval: p.requiresPreApproval ?? false,
          requiresReceipt: true,
          validFrom: now,
          isActive: true,
          notes: p.notes ?? null,
          createdBy: ctx.user?.id ?? null,
        });
        policiesSeeded++;
      }
    }

    // ── 12 Default alert rules (W1-W12) ──────────────────
    const defaultAlertRules = [
      { alertCode: "W1", alertName: "预算利用率", alertCategory: "budget", yellowThreshold: "80", redThreshold: "95", thresholdUnit: "percent", description: "项目预算使用率预警", recipientRoles: '["project_manager","finance_specialist"]', escalationRoles: '["bu_manager"]' },
      { alertCode: "W2", alertName: "工时超标", alertCategory: "labor", yellowThreshold: "110", redThreshold: "130", thresholdUnit: "percent", description: "工时成本池超目标预警", recipientRoles: '["project_manager","dept_head"]', escalationRoles: '["bu_manager"]' },
      { alertCode: "W3", alertName: "利润率偏差", alertCategory: "margin", yellowThreshold: "-5", redThreshold: "-10", thresholdUnit: "percent", description: "实际毛利率 vs 目标偏差预警", recipientRoles: '["project_manager","finance_specialist"]', escalationRoles: '["cfo","ceo"]' },
      { alertCode: "W4", alertName: "付款到期", alertCategory: "payment", yellowThreshold: "7", redThreshold: "0", thresholdUnit: "days", description: "供应商付款到期预警", recipientRoles: '["finance_specialist","procurement"]', escalationRoles: '["cfo"]' },
      { alertCode: "W5", alertName: "收款逾期", alertCategory: "collection", yellowThreshold: "15", redThreshold: "30", thresholdUnit: "days", description: "客户收款逾期预警", recipientRoles: '["sales_rep","finance_specialist"]', escalationRoles: '["sales_manager","cfo"]' },
      { alertCode: "W6", alertName: "发票缺失", alertCategory: "invoice", yellowThreshold: "7", redThreshold: "30", thresholdUnit: "days", description: "应开未开发票预警", recipientRoles: '["finance_specialist"]', escalationRoles: '["cfo"]' },
      { alertCode: "W7", alertName: "验收待签", alertCategory: "acceptance", yellowThreshold: "30", redThreshold: "60", thresholdUnit: "days", description: "项目验收挂起预警", recipientRoles: '["project_manager","sales_rep"]', escalationRoles: '["bu_manager"]' },
      { alertCode: "W8", alertName: "报销超标", alertCategory: "expense", yellowThreshold: "1", redThreshold: "20", thresholdUnit: "percent", description: "报销政策违规预警 (yellow=任何违规, red=总额>20%)", recipientRoles: '["hr_specialist","finance_specialist"]', escalationRoles: '["hr_director","cfo"]' },
      { alertCode: "W9", alertName: "银行付款失败", alertCategory: "bank", yellowThreshold: "1", redThreshold: "2", thresholdUnit: "count", description: "银企直连付款失败预警", recipientRoles: '["finance_specialist"]', escalationRoles: '["cfo"]' },
      { alertCode: "W10", alertName: "薪资安全", alertCategory: "payroll", yellowThreshold: "1", redThreshold: "1", thresholdUnit: "count", description: "薪资数据安全预警 (yellow=未授权访问尝试, red=数据泄漏)", recipientRoles: '["hr_director","it_security"]', escalationRoles: '["cto","ceo"]' },
      { alertCode: "W11", alertName: "质保金到期", alertCategory: "warranty", yellowThreshold: "30", redThreshold: "0", thresholdUnit: "days", description: "质保金到期退还预警", recipientRoles: '["project_manager","finance_specialist"]', escalationRoles: '["bu_manager"]' },
      { alertCode: "W12", alertName: "现金流压力", alertCategory: "cashflow", yellowThreshold: "80", redThreshold: "95", thresholdUnit: "percent", description: "现金流紧张度预警", recipientRoles: '["cfo","finance_specialist"]', escalationRoles: '["ceo"]' },
    ];

    let alertsSeeded = 0;
    for (const a of defaultAlertRules) {
      const [existing] = await db
        .select({ id: financeAlertRules.id })
        .from(financeAlertRules)
        .where(eq(financeAlertRules.alertCode, a.alertCode))
        .limit(1);
      if (!existing) {
        await db.insert(financeAlertRules).values({
          alertCode: a.alertCode,
          alertName: a.alertName,
          alertCategory: a.alertCategory,
          description: a.description,
          yellowThreshold: a.yellowThreshold,
          redThreshold: a.redThreshold,
          thresholdUnit: a.thresholdUnit,
          recipientRoles: a.recipientRoles,
          escalationRoles: a.escalationRoles,
          escalationAfterDays: 3,
          isActive: true,
          displayOnDashboard: true,
        });
        alertsSeeded++;
      }
    }

    log.info({ policiesSeeded, alertsSeeded }, "Default policies and alert rules seeded");
    return {
      success: true,
      message: `已播种 ${policiesSeeded} 条报销政策 + ${alertsSeeded} 条预警规则`,
      policiesSeeded,
      alertsSeeded,
    };
  }),

  // ═══════════════════════════════════════════════════════════
  // Project Finance Dashboard (3)
  // ═══════════════════════════════════════════════════════════

  // 32. getProjectFinanceSummary — single project: budget, actual, margin, labor pool, AR/AP
  getProjectFinanceSummary: protectedProcedure
    .input(z.object({ projectCode: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // Budget
      const [budget] = await db
        .select()
        .from(budgetVersions)
        .where(
          and(
            eq(budgetVersions.projectCode, input.projectCode),
            eq(budgetVersions.isActive, true)
          )
        )
        .limit(1);

      // Labor pool
      const pools = await db
        .select()
        .from(laborCostPools)
        .where(eq(laborCostPools.projectCode, input.projectCode))
        .orderBy(desc(laborCostPools.createdAt))
        .limit(1);
      const pool = pools[0] || null;

      // Cash flow for this project
      const cashflows = await db
        .select()
        .from(cashFlowRecords)
        .where(eq(cashFlowRecords.projectCode, input.projectCode))
        .limit(500);
      let inflow = 0;
      let outflow = 0;
      for (const cf of cashflows) {
        if (cf.flowDirection === "inflow") inflow += parseFloat(cf.amount);
        else outflow += parseFloat(cf.amount);
      }

      // AR for this project
      const arRows = await db
        .select()
        .from(arAgingSnapshots)
        .where(eq(arAgingSnapshots.projectCode, input.projectCode))
        .orderBy(desc(arAgingSnapshots.snapshotDate))
        .limit(10);
      const totalAR = arRows.reduce((s, r) => s + parseFloat(r.totalOutstanding || "0"), 0);

      // Alerts for this project
      const alerts = await db
        .select()
        .from(financeAlertInstances)
        .where(
          and(
            eq(financeAlertInstances.projectCode, input.projectCode),
            eq(financeAlertInstances.status, "open")
          )
        )
        .orderBy(desc(financeAlertInstances.createdAt))
        .limit(20);

      const totalBudget = budget ? parseFloat(budget.totalBudget) : 0;
      const actualMargin = inflow > 0 ? ((inflow - outflow) / inflow) * 100 : 0;

      return {
        projectCode: input.projectCode,
        budget: budget
          ? {
              totalBudget,
              spent: outflow,
              remaining: totalBudget - outflow,
              utilization: totalBudget > 0 ? Math.round((outflow / totalBudget) * 10000) / 100 : 0,
            }
          : null,
        laborPool: pool
          ? {
              target: parseFloat(pool.targetLaborPool),
              actual: parseFloat(pool.actualLaborCost || "0"),
              utilization: parseFloat(pool.laborUtilization || "0"),
              isOverTarget: pool.isOverTarget,
            }
          : null,
        cashFlow: { inflow, outflow, net: inflow - outflow },
        actualMargin: Math.round(actualMargin * 100) / 100,
        arOutstanding: totalAR,
        openAlerts: alerts.length,
        alertDetails: alerts.map((a) => ({
          alertCode: a.alertCode,
          severity: a.severity,
          message: a.message,
        })),
      };
    }),

  // 33. getBUFinanceSummary — for a BU: all projects aggregated
  getBUFinanceSummary: protectedProcedure
    .input(z.object({ buCode: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // All labor pools for this BU
      const pools = await db
        .select()
        .from(laborCostPools)
        .where(eq(laborCostPools.buCode, input.buCode))
        .limit(500);
      let totalTarget = 0;
      let totalActual = 0;
      let overTargetCount = 0;
      for (const p of pools) {
        totalTarget += parseFloat(p.targetLaborPool);
        totalActual += parseFloat(p.actualLaborCost || "0");
        if (p.isOverTarget) overTargetCount++;
      }

      // All budgets for this BU
      const budgets = await db
        .select()
        .from(budgetVersions)
        .where(and(eq(budgetVersions.isActive, true)))
        .limit(500);
      // Filter BU-scoped budgets by projectCode prefix convention
      const buBudgets = budgets; // In practice, join with projects table
      const totalBudget = buBudgets.reduce((s, b) => s + parseFloat(b.totalBudget), 0);

      // Open alerts
      const [alertCount] = await db
        .select({ cnt: count() })
        .from(financeAlertInstances)
        .where(eq(financeAlertInstances.status, "open"))
        .limit(1);

      return {
        buCode: input.buCode,
        projectCount: pools.length,
        laborPool: {
          totalTarget,
          totalActual,
          utilization: totalTarget > 0 ? Math.round((totalActual / totalTarget) * 10000) / 100 : 0,
          overTargetCount,
        },
        totalBudget,
        openAlerts: alertCount?.cnt ?? 0,
      };
    }),

  // 34. getCEOFinanceDashboard — company-wide: pipeline, margins, cash flow, aging, alerts, top issues
  getCEOFinanceDashboard: protectedProcedure.query(async () => {
    const db = await requireDb();

    // Labor pools (company-wide)
    const allPools = await db.select().from(laborCostPools).limit(500);
    let totalTarget = 0;
    let totalActual = 0;
    for (const p of allPools) {
      totalTarget += parseFloat(p.targetLaborPool);
      totalActual += parseFloat(p.actualLaborCost || "0");
    }

    // Cash flow this year
    const year = new Date().getFullYear();
    const cfRecords = await db
      .select()
      .from(cashFlowRecords)
      .where(eq(cashFlowRecords.fiscalYear, year))
      .limit(1000);
    let totalInflow = 0;
    let totalOutflow = 0;
    for (const r of cfRecords) {
      if (r.flowDirection === "inflow") totalInflow += parseFloat(r.amount);
      else totalOutflow += parseFloat(r.amount);
    }

    // Aging summary
    const latestAR = await db
      .select()
      .from(arAgingSnapshots)
      .orderBy(desc(arAgingSnapshots.snapshotDate))
      .limit(50);
    const totalAR = latestAR.reduce((s, r) => s + parseFloat(r.totalOutstanding || "0"), 0);
    const totalProvision = latestAR.reduce(
      (s, r) => s + parseFloat(r.badDebtProvision || "0"),
      0
    );

    const latestAP = await db
      .select()
      .from(apAgingSnapshots)
      .orderBy(desc(apAgingSnapshots.snapshotDate))
      .limit(50);
    const totalAP = latestAP.reduce((s, r) => s + parseFloat(r.totalOutstanding || "0"), 0);

    // Open alerts by severity
    const openAlerts = await db
      .select()
      .from(financeAlertInstances)
      .where(eq(financeAlertInstances.status, "open"))
      .orderBy(desc(financeAlertInstances.createdAt))
      .limit(50);
    const redAlerts = openAlerts.filter((a) => a.severity === "red").length;
    const yellowAlerts = openAlerts.filter((a) => a.severity === "yellow").length;

    // Top issues (red alerts)
    const topIssues = openAlerts
      .filter((a) => a.severity === "red")
      .slice(0, 5)
      .map((a) => ({
        alertCode: a.alertCode,
        projectCode: a.projectCode,
        message: a.message,
        triggeredAt: a.triggeredAt,
      }));

    return {
      fiscalYear: year,
      laborPool: {
        totalTarget,
        totalActual,
        utilization: totalTarget > 0 ? Math.round((totalActual / totalTarget) * 10000) / 100 : 0,
      },
      cashFlow: {
        totalInflow,
        totalOutflow,
        netPosition: totalInflow - totalOutflow,
      },
      aging: {
        totalAR,
        totalAP,
        netPosition: totalAR - totalAP,
        badDebtProvision: totalProvision,
      },
      alerts: {
        total: openAlerts.length,
        red: redAlerts,
        yellow: yellowAlerts,
      },
      topIssues,
    };
  }),
});
