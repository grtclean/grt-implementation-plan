import { z } from "zod";
import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import { buScopeCondition } from "../_core/gateway-bu-context.middleware";
import { requireDb } from "../db";
import { eq, and, count, sql } from "drizzle-orm";
import { companyGoals, divisionKpis } from "../../drizzle/strategy-goals-schema";
import { buSalesPlans, buSalesPlanDetails } from "../../drizzle/schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("strategy-goals");

// ---------------------------------------------------------------------------
// Ensure tables exist (auto-migrate — keeps backward compat)
// ---------------------------------------------------------------------------

let tablesEnsured = false;

async function ensureTables() {
  if (tablesEnsured) return;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS company_goals (
        id SERIAL PRIMARY KEY,
        year INTEGER NOT NULL DEFAULT 2026,
        metric_name VARCHAR(200) NOT NULL,
        metric_name_en VARCHAR(200),
        target_value REAL NOT NULL,
        current_value REAL NOT NULL DEFAULT 0,
        unit VARCHAR(30) NOT NULL,
        weight REAL NOT NULL,
        category VARCHAR(30) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS division_kpis (
        id SERIAL PRIMARY KEY,
        company_goal_id INTEGER NOT NULL,
        division_name VARCHAR(100) NOT NULL,
        division_code VARCHAR(10) NOT NULL,
        manager_name VARCHAR(100) NOT NULL,
        manager_id INTEGER,
        metric_name VARCHAR(200) NOT NULL,
        metric_name_en VARCHAR(200),
        target_value REAL NOT NULL,
        current_value REAL NOT NULL DEFAULT 0,
        unit VARCHAR(30) NOT NULL,
        weight REAL NOT NULL,
        evaluation_criteria TEXT,
        rag_status VARCHAR(1) NOT NULL DEFAULT 'G',
        completion_pct REAL NOT NULL DEFAULT 0,
        year INTEGER NOT NULL DEFAULT 2026,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    tablesEnsured = true;
  } catch (e: any) {
    log.warn({ message: e.message }, "ensureTables warning");
    tablesEnsured = true;
  }
}

// ---------------------------------------------------------------------------
// Seed data (inserted once if tables are empty)
// ---------------------------------------------------------------------------

let seeded = false;

async function seedIfEmpty() {
  if (seeded) return;
  seeded = true;
  try {
    const db = await requireDb();
    const [cnt] = await db.select({ value: count() }).from(companyGoals).where(eq(companyGoals.year, 2026));
    if (Number(cnt?.value ?? 0) > 0) return;

    // 6 Company Goals
    await db.insert(companyGoals).values([
      { year: 2026, metricName: '制造事业部营收', metricNameEn: 'Manufacturing Division Revenue', targetValue: 280000000, currentValue: 68000000, unit: 'CNY', weight: 0.30, category: 'revenue' },
      { year: 2026, metricName: 'FAT一次通过率', metricNameEn: 'FAT First-Pass Rate', targetValue: 95, currentValue: 91.2, unit: '%', weight: 0.20, category: 'quality' },
      { year: 2026, metricName: '项目交付及时率', metricNameEn: 'Project On-Time Delivery', targetValue: 92, currentValue: 88.5, unit: '%', weight: 0.20, category: 'delivery' },
      { year: 2026, metricName: '质量百万缺陷率', metricNameEn: 'Quality DPPM', targetValue: 500, currentValue: 620, unit: 'DPPM', weight: 0.15, category: 'quality' },
      { year: 2026, metricName: '制造成本控制', metricNameEn: 'Manufacturing Cost Reduction', targetValue: 5, currentValue: 3.2, unit: '% reduction', weight: 0.10, category: 'cost' },
      { year: 2026, metricName: '团队建设完成率', metricNameEn: 'Team Building Completion', targetValue: 90, currentValue: 72, unit: '%', weight: 0.05, category: 'team' },
    ]);

    // Fetch inserted IDs for FK references
    const goals = await db.select().from(companyGoals).where(eq(companyGoals.year, 2026)).limit(1000);
    const goalIdMap: Record<number, number> = {};
    goals.forEach((g, i) => { goalIdMap[i + 1] = g.id; });

    // Helper to build division KPI rows
    const mkKpis = (divName: string, code: string, mgr: string, data: Array<[number, string, string, number, number, string, number, string, string, number]>) =>
      data.map(([goalIdx, metric, metricEn, target, current, unit, weight, criteria, rag, pct]) => ({
        companyGoalId: goalIdMap[goalIdx] ?? goalIdx,
        divisionName: divName,
        divisionCode: code,
        managerName: mgr,
        metricName: metric,
        metricNameEn: metricEn,
        targetValue: target,
        currentValue: current,
        unit,
        weight,
        evaluationCriteria: criteria,
        ragStatus: rag,
        completionPct: pct,
        year: 2026,
      }));

    const allKpis = [
      // BU1 海外 — 张海涛
      ...mkKpis('海外事业部', 'BU1', '张海涛', [
        [1, '事业部营收', 'Division Revenue', 85000000, 22000000, 'CNY', 0.30, '全年营收达成85M CNY，含海外OEM及售后服务收入', 'A', 25.9],
        [2, 'FAT一次通过率', 'FAT First-Pass Rate', 96, 94.5, '%', 0.20, '海外项目FAT一次通过率≥96%，含远程FAT', 'A', 98.4],
        [3, '项目交付及时率', 'Project OTD', 93, 90, '%', 0.20, '海外项目交付及时率≥93%，扣除不可抗力', 'A', 96.8],
        [4, '质量百万缺陷率', 'Quality DPPM', 450, 380, 'DPPM', 0.15, '海外发运产品DPPM≤450，含IQC及终检', 'G', 100],
        [5, '制造成本控制', 'Cost Reduction', 6, 4.8, '% reduction', 0.10, '海外BU制造成本同比降低≥6%', 'A', 80],
        [6, '团队建设完成率', 'Team Building', 90, 85, '%', 0.05, '海外团队培训覆盖率、认证通过率综合≥90%', 'G', 94.4],
      ]),
      // BU2 商用车 — 王志强
      ...mkKpis('商用车事业部', 'BU2', '王志强', [
        [1, '事业部营收', 'Division Revenue', 72000000, 16500000, 'CNY', 0.30, '全年营收达成72M CNY，含新能源商用车清洗线', 'A', 22.9],
        [2, 'FAT一次通过率', 'FAT First-Pass Rate', 94, 91, '%', 0.20, '商用车项目FAT一次通过率≥94%', 'A', 96.8],
        [3, '项目交付及时率', 'Project OTD', 91, 87, '%', 0.20, '商用车项目交付及时率≥91%', 'R', 95.6],
        [4, '质量百万缺陷率', 'Quality DPPM', 550, 610, 'DPPM', 0.15, '商用车DPPM≤550，重点关注焊接及涂装工序', 'R', 90.2],
        [5, '制造成本控制', 'Cost Reduction', 4.5, 3.1, '% reduction', 0.10, '商用车BU制造成本同比降低≥4.5%', 'A', 68.9],
        [6, '团队建设完成率', 'Team Building', 88, 78, '%', 0.05, '商用车团队培训覆盖率≥88%', 'A', 88.6],
      ]),
      // BU3 乘用车 — 李明远
      ...mkKpis('乘用车事业部', 'BU3', '李明远', [
        [1, '事业部营收', 'Division Revenue', 58000000, 14200000, 'CNY', 0.30, '全年营收达成58M CNY，含新能源乘用车零部件清洗线', 'A', 24.5],
        [2, 'FAT一次通过率', 'FAT First-Pass Rate', 95, 93.8, '%', 0.20, '乘用车项目FAT一次通过率≥95%', 'A', 98.7],
        [3, '项目交付及时率', 'Project OTD', 92, 91, '%', 0.20, '乘用车项目交付及时率≥92%', 'G', 98.9],
        [4, '质量百万缺陷率', 'Quality DPPM', 480, 450, 'DPPM', 0.15, '乘用车DPPM≤480，重点关注精密清洗', 'G', 100],
        [5, '制造成本控制', 'Cost Reduction', 5, 3.5, '% reduction', 0.10, '乘用车BU制造成本同比降低≥5%', 'A', 70],
        [6, '团队建设完成率', 'Team Building', 90, 82, '%', 0.05, '乘用车团队培训覆盖率≥90%', 'A', 91.1],
      ]),
      // BU4 半导体 — 陈立学
      ...mkKpis('半导体事业部', 'BU4', '陈立学', [
        [1, '事业部营收', 'Division Revenue', 35000000, 9800000, 'CNY', 0.30, '全年营收达成35M CNY，含晶圆清洗及封装清洗设备', 'G', 28.0],
        [2, 'FAT一次通过率', 'FAT First-Pass Rate', 98, 97.5, '%', 0.20, '半导体项目FAT一次通过率≥98%，洁净度Class100', 'G', 99.5],
        [3, '项目交付及时率', 'Project OTD', 95, 94, '%', 0.20, '半导体项目交付及时率≥95%', 'G', 98.9],
        [4, '质量百万缺陷率', 'Quality DPPM', 300, 280, 'DPPM', 0.15, '半导体DPPM≤300，零颗粒污染标准', 'G', 100],
        [5, '制造成本控制', 'Cost Reduction', 5.5, 4.2, '% reduction', 0.10, '半导体BU制造成本同比降低≥5.5%', 'A', 76.4],
        [6, '团队建设完成率', 'Team Building', 92, 88, '%', 0.05, '半导体团队培训覆盖率≥92%，含洁净室认证', 'G', 95.7],
      ]),
      // BU5 工业通用 — 周建国
      ...mkKpis('工业通用事业部', 'BU5', '周建国', [
        [1, '事业部营收', 'Division Revenue', 30000000, 6500000, 'CNY', 0.30, '全年营收达成30M CNY，含通用工业清洗线', 'R', 21.7],
        [2, 'FAT一次通过率', 'FAT First-Pass Rate', 93, 89, '%', 0.20, '工业通用项目FAT一次通过率≥93%', 'R', 95.7],
        [3, '项目交付及时率', 'Project OTD', 90, 84, '%', 0.20, '工业通用项目交付及时率≥90%', 'R', 93.3],
        [4, '质量百万缺陷率', 'Quality DPPM', 600, 720, 'DPPM', 0.15, '工业通用DPPM≤600', 'R', 83.3],
        [5, '制造成本控制', 'Cost Reduction', 4, 2.8, '% reduction', 0.10, '工业通用BU制造成本同比降低≥4%', 'A', 70],
        [6, '团队建设完成率', 'Team Building', 85, 70, '%', 0.05, '工业通用团队培训覆盖率≥85%', 'R', 82.4],
      ]),
    ];

    await db.insert(divisionKpis).values(allKpis);
    log.info({}, "Seeded 6 company goals + 30 division KPIs");
  } catch (e: any) {
    log.warn({ message: e.message }, "seedIfEmpty warning");
  }
}

// ---------------------------------------------------------------------------
// Router — all procedures use Drizzle ORM (no raw SQL)
// ---------------------------------------------------------------------------

export const strategyGoalsRouter = router({
  // ── Get company-level goals by year
  getCompanyGoals: protectedProcedure
    .input(z.object({ year: z.number().default(2026) }))
    .query(async ({ input }) => {
      await ensureTables();
      await seedIfEmpty();
      const db = await requireDb();
      return db.select().from(companyGoals).where(eq(companyGoals.year, input.year)).limit(1000);
    }),

  // ── Get division KPIs with optional filter (BU-scoped)
  getDivisionKpis: protectedProcedure
    .input(z.object({
      year: z.number().default(2026),
      divisionCode: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      await ensureTables();
      await seedIfEmpty();
      const db = await requireDb();

      const conditions = [eq(divisionKpis.year, input.year)];

      // BU scope: non-admin users only see their BU's KPIs
      if (ctx.bu?.buCode) {
        conditions.push(eq(divisionKpis.divisionCode, ctx.bu.buCode));
      } else if (input.divisionCode) {
        conditions.push(eq(divisionKpis.divisionCode, input.divisionCode));
      }

      return db.select().from(divisionKpis).where(and(...conditions)).limit(1000);
    }),

  // ── Aggregated dashboard view
  getDashboard: protectedProcedure
    .input(z.object({ year: z.number().default(2026) }))
    .query(async ({ input }) => {
      await ensureTables();
      await seedIfEmpty();
      const db = await requireDb();

      const goals = await db.select().from(companyGoals).where(eq(companyGoals.year, input.year)).limit(1000);
      const allKpis = await db.select().from(divisionKpis).where(eq(divisionKpis.year, input.year)).limit(1000);

      // Group by division
      const divisionMap = new Map<string, (typeof allKpis)[number][]>();
      for (const kpi of allKpis) {
        const code = kpi.divisionCode;
        if (!divisionMap.has(code)) divisionMap.set(code, []);
        divisionMap.get(code)!.push(kpi);
      }

      // Build division summaries
      const divisionSummary = Array.from(divisionMap.entries()).map(([code, kpis]) => {
        const first = kpis[0];
        const totalWeight = kpis.reduce((s, k) => s + (k.weight ?? 0), 0);
        const weightedScore = totalWeight > 0
          ? kpis.reduce((s, k) => s + (k.completionPct ?? 0) * (k.weight ?? 0), 0) / totalWeight
          : 0;
        const ragCounts = { R: 0, A: 0, G: 0 };
        for (const k of kpis) {
          const rag = (k.ragStatus || "G") as "R" | "A" | "G";
          ragCounts[rag] = (ragCounts[rag] || 0) + 1;
        }
        return {
          divisionCode: code,
          divisionName: first.divisionName,
          managerName: first.managerName,
          weightedScore: Math.round(weightedScore * 10) / 10,
          ragCounts,
          kpis,
        };
      });

      // Overall company progress
      let overallProgress = 0;
      const totalCompanyWeight = goals.reduce((s, g) => s + (g.weight ?? 0), 0);
      if (totalCompanyWeight > 0) {
        for (const goal of goals) {
          const target = goal.targetValue ?? 1;
          const current = goal.currentValue ?? 0;
          const isLowerBetter = goal.category === "quality" && goal.unit === "DPPM";
          const pct = isLowerBetter
            ? Math.min(100, (target / Math.max(current, 1)) * 100)
            : Math.min(100, (current / target) * 100);
          overallProgress += pct * (goal.weight ?? 0);
        }
        overallProgress = Math.round((overallProgress / totalCompanyWeight) * 10) / 10;
      }

      // RAG alignment counts
      const totalKpis = allKpis.length;
      const green = allKpis.filter(k => k.ragStatus === "G").length;
      const amber = allKpis.filter(k => k.ragStatus === "A").length;
      const red = allKpis.filter(k => k.ragStatus === "R").length;
      const syncPct = totalKpis > 0 ? Math.round((green / totalKpis) * 1000) / 10 : 0;

      return {
        companyGoals: goals,
        divisionSummary,
        overallProgress,
        aiAlignment: { totalKpis, green, amber, red, syncPct },
      };
    }),

  // ── Update a division KPI (parameterized — no SQL injection)
  updateDivisionKpi: requirePermission('strategy:okr:manage')
    .input(z.object({
      id: z.number(),
      currentValue: z.number().optional(),
      ragStatus: z.enum(["R", "A", "G"]).optional(),
      completionPct: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const updates: Partial<typeof divisionKpis.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.currentValue !== undefined) updates.currentValue = input.currentValue;
      if (input.ragStatus !== undefined) updates.ragStatus = input.ragStatus;
      if (input.completionPct !== undefined) updates.completionPct = input.completionPct;

      await db.update(divisionKpis).set(updates).where(eq(divisionKpis.id, input.id));
      return { success: true };
    }),

  // ── Auto-decompose company goals → BU sales plans
  // Creates buSalesPlans + 12-month details for each BU from divisionKpis revenue targets
  decomposeToBuPlans: requirePermission('strategy:okr:manage')
    .input(z.object({
      year: z.number().default(2026),
      growthRules: z.object({
        Q2_vs_Q1: z.number().default(0.2),
        Q3_vs_Q2: z.number().default(0.2),
        Q4_vs_Q3: z.number().default(0.1),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // Get revenue KPIs per division (category = 'revenue' equivalent = metric contains '营收')
      const revenueKpis = await db.select().from(divisionKpis)
        .where(and(
          eq(divisionKpis.year, input.year),
          sql`${divisionKpis.metricName} LIKE '%营收%'`,
        )).limit(1000);

      if (revenueKpis.length === 0) {
        return { success: false, message: "No revenue KPIs found for decomposition", created: 0 };
      }

      const rules = input.growthRules ?? { Q2_vs_Q1: 0.2, Q3_vs_Q2: 0.2, Q4_vs_Q3: 0.1 };
      const { Q2_vs_Q1: g1, Q3_vs_Q2: g2, Q4_vs_Q3: g3 } = rules;
      const divisor = 1 + (1 + g1) + (1 + g1) * (1 + g2) + (1 + g1) * (1 + g2) * (1 + g3);

      let created = 0;

      for (const kpi of revenueKpis) {
        const buCode = kpi.divisionCode; // BU1..BU5
        const totalTarget = kpi.targetValue ?? 0;

        // Check if plan already exists for this BU+year
        const [existing] = await db.select({ id: buSalesPlans.id })
          .from(buSalesPlans)
          .where(and(
            eq(buSalesPlans.year, input.year),
            eq(buSalesPlans.departmentId, buCode),
          ));

        if (existing) continue; // Skip if already exists

        // Create BU sales plan
        const salesQ1 = totalTarget / divisor;
        const salesQ = [salesQ1, salesQ1 * (1 + g1), salesQ1 * (1 + g1) * (1 + g2), salesQ1 * (1 + g1) * (1 + g2) * (1 + g3)];

        const [plan] = await db.insert(buSalesPlans).values({
          year: input.year,
          departmentId: buCode,
          totalSalesTarget: String(totalTarget),
          totalOutputTarget: String(totalTarget),
          growthRules: rules,
          status: 'draft',
        }).returning();

        // Generate 12 monthly details
        const monthlyDetails = [];
        for (let m = 1; m <= 12; m++) {
          const qIdx = Math.floor((m - 1) / 3);
          const monthlyTarget = salesQ[qIdx] / 3;
          monthlyDetails.push({
            buSalesPlanId: plan.id,
            periodType: 'monthly' as const,
            periodValue: m,
            salesTarget: String(Math.round(monthlyTarget * 100) / 100),
            outputTarget: String(Math.round(monthlyTarget * 100) / 100),
            kpiTarget: String(kpi.weight ?? 0),
            capabilityLevel: '1.00',
            isAdjusted: false,
          });
        }

        await db.insert(buSalesPlanDetails).values(monthlyDetails);
        created++;
      }

      return {
        success: true,
        message: `Auto-decomposed ${created} BU sales plans from company goals`,
        created,
      };
    }),

  // ── Force re-seed for demo
  seedDemo: requirePermission('strategy:okr:manage').mutation(async () => {
    await ensureTables();
    const db = await requireDb();
    await db.delete(divisionKpis).where(eq(divisionKpis.year, 2026));
    await db.delete(companyGoals).where(eq(companyGoals.year, 2026));
    seeded = false;
    await seedIfEmpty();
    return { success: true, message: "Seeded 6 company goals + 30 division KPIs" };
  }),
});
