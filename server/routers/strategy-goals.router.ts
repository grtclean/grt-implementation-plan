import { z } from "zod";
import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import { buScopeCondition } from "../_core/gateway-bu-context.middleware";
import { requireDb } from "../db";
import { eq, and, count, sql, ne, gte, isNotNull } from "drizzle-orm";
import { companyGoals, divisionKpis } from "../../drizzle/strategy-goals-schema";
import { buSalesPlans, buSalesPlanDetails, projects, productionWorkOrders, workLogs } from "../../drizzle/schema";
import { mechAcceptanceRecords } from "../../drizzle/mechanical-config-schema";
import { okrObjectives, okrKeyResults } from "../../drizzle/okr-schema";
import { createChildLogger } from "../lib/logger";
import { eventBus, SANDBOX_EVENTS } from "../events/event-bus";

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

  // ── Create company goal
  createCompanyGoal: requirePermission('strategy:okr:manage')
    .input(z.object({
      year: z.number().default(2026),
      metricName: z.string().min(1),
      metricNameEn: z.string().optional(),
      targetValue: z.number(),
      currentValue: z.number().default(0),
      unit: z.string().min(1),
      weight: z.number().min(0).max(1),
      category: z.enum(["revenue", "quality", "delivery", "cost", "team"]),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [goal] = await db.insert(companyGoals).values(input).returning();
      log.info({ id: goal.id, metric: input.metricName }, "Company goal created");
      return { success: true, id: goal.id };
    }),

  // ── Update company goal
  updateCompanyGoal: requirePermission('strategy:okr:manage')
    .input(z.object({
      id: z.number(),
      metricName: z.string().optional(),
      metricNameEn: z.string().optional(),
      targetValue: z.number().optional(),
      currentValue: z.number().optional(),
      unit: z.string().optional(),
      weight: z.number().min(0).max(1).optional(),
      category: z.enum(["revenue", "quality", "delivery", "cost", "team"]).optional(),
      status: z.enum(["active", "paused", "completed"]).optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { id, ...rest } = input;
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) updates[k] = v;
      }
      await db.update(companyGoals).set(updates).where(eq(companyGoals.id, id));
      log.info({ id }, "Company goal updated");
      return { success: true };
    }),

  // ── Delete company goal
  deleteCompanyGoal: requirePermission('strategy:okr:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Also delete linked division KPIs
      await db.delete(divisionKpis).where(eq(divisionKpis.companyGoalId, input.id));
      await db.delete(companyGoals).where(eq(companyGoals.id, input.id));
      log.info({ id: input.id }, "Company goal + linked KPIs deleted");
      return { success: true };
    }),

  // ── Create division KPI
  createDivisionKpi: requirePermission('strategy:okr:manage')
    .input(z.object({
      companyGoalId: z.number(),
      divisionName: z.string().min(1),
      divisionCode: z.string().min(1),
      managerName: z.string().min(1),
      metricName: z.string().min(1),
      metricNameEn: z.string().optional(),
      targetValue: z.number(),
      currentValue: z.number().default(0),
      unit: z.string().min(1),
      weight: z.number().min(0).max(1),
      evaluationCriteria: z.string().optional(),
      ragStatus: z.enum(["R", "A", "G"]).default("G"),
      completionPct: z.number().default(0),
      year: z.number().default(2026),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [kpi] = await db.insert(divisionKpis).values(input).returning();
      log.info({ id: kpi.id, division: input.divisionCode }, "Division KPI created");
      return { success: true, id: kpi.id };
    }),

  // ── Delete division KPI
  deleteDivisionKpi: requirePermission('strategy:okr:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.delete(divisionKpis).where(eq(divisionKpis.id, input.id));
      log.info({ id: input.id }, "Division KPI deleted");
      return { success: true };
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

  // ═══════════════════════════════════════════════════════════════
  //  联动 (Linkage) — Live operational metrics from real modules
  // ═══════════════════════════════════════════════════════════════

  /** Aggregate LIVE operational metrics from projects, work orders, quality, work logs */
  getLiveMetrics: protectedProcedure
    .input(z.object({ buCode: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const buFilter = input?.buCode;

      // ── 1. Project Pipeline ──
      const allProjects = buFilter
        ? await db.select().from(projects).where(eq(projects.buCode, buFilter)).limit(1000)
        : await db.select().from(projects).limit(1000);

      const activeProjects = allProjects.filter(p => p.status === "active");
      const completedProjects = allProjects.filter(p => p.status === "completed");
      const totalBudget = allProjects.reduce((s, p) => s + (p.budget ?? 0), 0);
      const totalContractAmount = allProjects.reduce((s, p) => s + (p.contractAmount ?? 0), 0);
      const avgCompletion = activeProjects.length > 0
        ? Math.round(activeProjects.reduce((s, p) => s + (p.completionPercent ?? 0), 0) / activeProjects.length)
        : 0;

      // Project health distribution
      const healthCounts = { green: 0, yellow: 0, red: 0 };
      for (const p of activeProjects) {
        const h = p.healthStatus ?? "green";
        if (h in healthCounts) healthCounts[h as keyof typeof healthCounts]++;
      }

      // ── 2. Production OTD (On-Time Delivery) ──
      const allWOs = await db.select().from(productionWorkOrders).limit(1000);
      const completedWOs = allWOs.filter(w => w.status === "completed" || w.status === "Completed");
      const overdueWOs = completedWOs.filter(w => {
        if (!w.plannedEndDate || !w.actualEndDate) return false;
        return new Date(w.actualEndDate) > new Date(w.plannedEndDate);
      });
      const otdRate = completedWOs.length > 0
        ? Math.round(((completedWOs.length - overdueWOs.length) / completedWOs.length) * 1000) / 10
        : 0;

      // ── 3. Quality Metrics (from acceptance records) ──
      const acceptanceRows = await db.select().from(mechAcceptanceRecords).limit(1000);
      const totalAccepted = acceptanceRows.filter(r => r.result === "ACCEPTED").length;
      const totalInspected = acceptanceRows.length;
      const fatPassRate = totalInspected > 0
        ? Math.round((totalAccepted / totalInspected) * 1000) / 10
        : 0;
      const avgQualityScore = totalInspected > 0
        ? Math.round(acceptanceRows.reduce((s, r) => s + (r.score ?? 0), 0) / totalInspected * 10) / 10
        : 0;

      // ── 4. Work Hours / Team Utilization ──
      const logStats = await db.select({
        totalLogs: count(),
        approvedLogs: sql<number>`count(*) filter (where ${workLogs.approvalStatus} = 'approved')`,
        totalHours: sql<number>`coalesce(sum(${workLogs.duration}), 0)`,
        uniqueWorkers: sql<number>`count(distinct ${workLogs.workerId})`,
      }).from(workLogs);

      // ── 5. OKR Progress ──
      const okrStats = await db.select({
        totalObjectives: count(),
        avgProgress: sql<number>`coalesce(avg(${okrObjectives.progress}), 0)`,
        activeCount: sql<number>`count(*) filter (where ${okrObjectives.status} = 'active')`,
        completedCount: sql<number>`count(*) filter (where ${okrObjectives.status} = 'completed')`,
      }).from(okrObjectives);

      // ── 6. BU Breakdown ──
      const buBreakdown: Record<string, { projects: number; revenue: number; wos: number; completion: number }> = {};
      for (const p of allProjects) {
        const bu = p.buCode ?? "UNKNOWN";
        if (!buBreakdown[bu]) buBreakdown[bu] = { projects: 0, revenue: 0, wos: 0, completion: 0 };
        buBreakdown[bu].projects++;
        buBreakdown[bu].revenue += p.contractAmount ?? p.budget ?? 0;
        buBreakdown[bu].completion += p.completionPercent ?? 0;
      }
      for (const wo of allWOs) {
        // find project BU
        const proj = allProjects.find(p => p.id === wo.projectId);
        const bu = proj?.buCode ?? "UNKNOWN";
        if (!buBreakdown[bu]) buBreakdown[bu] = { projects: 0, revenue: 0, wos: 0, completion: 0 };
        buBreakdown[bu].wos++;
      }
      // avg completion per BU
      for (const bu of Object.keys(buBreakdown)) {
        if (buBreakdown[bu].projects > 0) {
          buBreakdown[bu].completion = Math.round(buBreakdown[bu].completion / buBreakdown[bu].projects);
        }
      }

      return {
        timestamp: new Date().toISOString(),
        projectPipeline: {
          total: allProjects.length,
          active: activeProjects.length,
          completed: completedProjects.length,
          totalBudget,
          totalContractAmount,
          avgCompletion,
          healthCounts,
        },
        production: {
          totalWorkOrders: allWOs.length,
          completedWorkOrders: completedWOs.length,
          overdueWorkOrders: overdueWOs.length,
          otdRate,
        },
        quality: {
          totalInspected,
          totalAccepted,
          fatPassRate,
          avgQualityScore,
        },
        workforce: {
          totalLogs: Number(logStats[0]?.totalLogs ?? 0),
          approvedLogs: Number(logStats[0]?.approvedLogs ?? 0),
          totalHours: Number(logStats[0]?.totalHours ?? 0),
          uniqueWorkers: Number(logStats[0]?.uniqueWorkers ?? 0),
        },
        okr: {
          totalObjectives: Number(okrStats[0]?.totalObjectives ?? 0),
          avgProgress: Math.round(Number(okrStats[0]?.avgProgress ?? 0) * 10) / 10,
          activeCount: Number(okrStats[0]?.activeCount ?? 0),
          completedCount: Number(okrStats[0]?.completedCount ?? 0),
        },
        buBreakdown,
      };
    }),

  /** Sync live operational metrics → division KPIs (auto-update RAG & completion) */
  syncLiveToKpis: requirePermission('strategy:okr:manage')
    .input(z.object({ year: z.number().default(2026) }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();

      // Get live metrics for each BU
      const allProjects2 = await db.select().from(projects).limit(1000);
      const allWOs2 = await db.select().from(productionWorkOrders).limit(1000);
      const acceptanceRows2 = await db.select().from(mechAcceptanceRecords).limit(1000);

      // BU revenue from project budgets/contracts
      const buRevenue: Record<string, number> = {};
      for (const p of allProjects2) {
        const bu = p.buCode ?? "UNKNOWN";
        buRevenue[bu] = (buRevenue[bu] ?? 0) + (p.contractAmount ?? p.budget ?? 0);
      }

      // BU delivery (OTD) from work orders
      const buOtd: Record<string, { completed: number; onTime: number }> = {};
      for (const wo of allWOs2) {
        const proj = allProjects2.find(p => p.id === wo.projectId);
        const bu = proj?.buCode ?? "UNKNOWN";
        if (!buOtd[bu]) buOtd[bu] = { completed: 0, onTime: 0 };
        if (wo.status === "completed" || wo.status === "Completed") {
          buOtd[bu].completed++;
          if (wo.plannedEndDate && wo.actualEndDate && new Date(wo.actualEndDate) <= new Date(wo.plannedEndDate)) {
            buOtd[bu].onTime++;
          } else if (!wo.actualEndDate) {
            buOtd[bu].onTime++; // no actual end = still on time
          }
        }
      }

      // BU quality (FAT pass rate) from acceptance records
      const buQuality: Record<string, { total: number; accepted: number; scores: number[] }> = {};
      for (const ar of acceptanceRows2) {
        // We don't have BU directly on acceptance, derive from project
        const bu = "ALL"; // acceptance is cross-BU for now
        if (!buQuality[bu]) buQuality[bu] = { total: 0, accepted: 0, scores: [] };
        buQuality[bu].total++;
        if (ar.result === "ACCEPTED") buQuality[bu].accepted++;
        if (ar.score) buQuality[bu].scores.push(ar.score);
      }

      // Now update division KPIs
      const allKpis = await db.select().from(divisionKpis).where(eq(divisionKpis.year, input.year)).limit(1000);
      let updatedCount = 0;

      for (const kpi of allKpis) {
        let newCurrentValue: number | null = null;
        let newCompletionPct: number | null = null;
        let newRag: string | null = null;

        // Revenue KPI — update from project pipeline
        if (kpi.metricName.includes("营收")) {
          const rev = buRevenue[kpi.divisionCode] ?? 0;
          newCurrentValue = rev;
          newCompletionPct = kpi.targetValue > 0 ? Math.min(100, Math.round((rev / kpi.targetValue) * 1000) / 10) : 0;
        }

        // OTD KPI
        if (kpi.metricName.includes("交付") || kpi.metricName.includes("OTD")) {
          const otd = buOtd[kpi.divisionCode];
          if (otd && otd.completed > 0) {
            const rate = Math.round((otd.onTime / otd.completed) * 1000) / 10;
            newCurrentValue = rate;
            newCompletionPct = kpi.targetValue > 0 ? Math.min(100, Math.round((rate / kpi.targetValue) * 1000) / 10) : 0;
          }
        }

        // FAT pass rate KPI
        if (kpi.metricName.includes("FAT") || kpi.metricName.includes("通过率")) {
          const q = buQuality["ALL"];
          if (q && q.total > 0) {
            const rate = Math.round((q.accepted / q.total) * 1000) / 10;
            newCurrentValue = rate;
            newCompletionPct = kpi.targetValue > 0 ? Math.min(100, Math.round((rate / kpi.targetValue) * 1000) / 10) : 0;
          }
        }

        // Auto-compute RAG if we have new completion
        if (newCompletionPct !== null) {
          newRag = newCompletionPct >= 90 ? "G" : newCompletionPct >= 70 ? "A" : "R";
        }

        // Apply updates
        if (newCurrentValue !== null || newCompletionPct !== null) {
          const updates: Record<string, unknown> = { updatedAt: new Date() };
          if (newCurrentValue !== null) updates.currentValue = newCurrentValue;
          if (newCompletionPct !== null) updates.completionPct = newCompletionPct;
          if (newRag !== null) updates.ragStatus = newRag;

          await db.update(divisionKpis).set(updates).where(eq(divisionKpis.id, kpi.id));
          updatedCount++;
        }
      }

      // Publish sync event
      try {
        await eventBus.publish({
          type: "strategy.kpi.live_sync",
          sourceModule: "strategy-goals",
          targetModules: ["ceo-dashboard", "okr", "annual-planning"],
          payload: { year: input.year, updatedKpis: updatedCount, timestamp: new Date().toISOString() },
          userId: ctx.user?.id ?? 0,
          timestamp: new Date(),
        });
      } catch { /* best-effort */ }

      log.info({ year: input.year, updatedCount }, "Live metrics synced to division KPIs");
      return { success: true, updatedCount, message: `已同步 ${updatedCount} 个KPI指标（来自实时运营数据）` };
    }),

  /** Strategy ↔ Module linkage map — shows which operational modules feed which KPIs */
  getLinkageMap: protectedProcedure.query(async () => {
    return {
      linkages: [
        { kpiCategory: "revenue", sources: ["project.create", "project.update", "quotation.saveDraft"], modules: ["项目管理", "报价管理"], icon: "TrendingUp", description: "项目合同额 + 报价订单 → 营收目标" },
        { kpiCategory: "quality", sources: ["mechanicalConfig.acceptance.create", "m7m9.gateCheck.executeAIGateCheck"], modules: ["机械配置验收", "Gate检查"], icon: "Target", description: "FAT通过率 + 验收评分 → 质量目标" },
        { kpiCategory: "delivery", sources: ["productionDashboard.updateStatus", "m7m9.delivery.create"], modules: ["生产管理", "交付管理"], icon: "Truck", description: "工单完成率 + OTD → 交付目标" },
        { kpiCategory: "cost", sources: ["smartProductionScheduling.laborReport.submit"], modules: ["工时管理", "生产排程"], icon: "DollarSign", description: "制造工时 + 材料成本 → 成本目标" },
        { kpiCategory: "team", sources: ["attendanceClock.clock.clockIn", "performanceCalibration.submit"], modules: ["考勤打卡", "绩效管理"], icon: "Users", description: "出勤率 + 培训完成 + 绩效评分 → 团队目标" },
      ],
      events: [
        { event: "strategy.kpi.live_sync", direction: "strategy → modules", description: "KPI实时同步到运营模块" },
        { event: "PROJECT_MILESTONE_HIT", direction: "modules → strategy", description: "项目里程碑达成 → 更新战略进度" },
        { event: "SCHEDULING_PLAN_PUBLISHED", direction: "modules → strategy", description: "生产计划发布 → 更新交付预测" },
        { event: "PROJECT_PROCESS_COMPLETED", direction: "modules → strategy", description: "工序完成 → 更新成本/工时" },
      ],
    };
  }),

  /** OKR cascade view — company goals → OKR objectives → project KPIs */
  getOkrCascade: protectedProcedure
    .input(z.object({ year: z.number().default(2026) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const goals = await db.select().from(companyGoals).where(eq(companyGoals.year, input.year)).limit(100);
      const objectives = await db.select().from(okrObjectives).limit(200);
      const krs = await db.select().from(okrKeyResults).limit(500);

      // Build cascade tree
      const cascade = goals.map(goal => {
        // Match OKR objectives to goals by category keyword
        const matchingOkrs = objectives.filter(o => {
          const titleLower = (o.title ?? "").toLowerCase();
          if (goal.category === "revenue") return titleLower.includes("营收") || titleLower.includes("revenue") || titleLower.includes("销售");
          if (goal.category === "quality") return titleLower.includes("质量") || titleLower.includes("quality") || titleLower.includes("FAT");
          if (goal.category === "delivery") return titleLower.includes("交付") || titleLower.includes("delivery") || titleLower.includes("OTD");
          if (goal.category === "cost") return titleLower.includes("成本") || titleLower.includes("cost");
          if (goal.category === "team") return titleLower.includes("团队") || titleLower.includes("team") || titleLower.includes("培训");
          return false;
        });

        return {
          goal: { id: goal.id, metricName: goal.metricName, category: goal.category, targetValue: goal.targetValue, currentValue: goal.currentValue, unit: goal.unit, weight: goal.weight },
          okrObjectives: matchingOkrs.map(o => ({
            id: o.id, title: o.title, level: o.level, progress: o.progress, status: o.status, period: o.period,
            keyResults: krs.filter(kr => kr.objectiveId === o.id).map(kr => ({
              id: kr.id, title: kr.title, targetValue: kr.targetValue, currentValue: kr.currentValue, unit: kr.unit, status: kr.status,
            })),
          })),
          linkedOkrCount: matchingOkrs.length,
        };
      });

      return { year: input.year, cascade, totalGoals: goals.length, totalOkrs: objectives.length };
    }),

  /** Get recent strategy-related events from event bus */
  getRecentEvents: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(15) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      try {
        const { sandboxEventLog } = await import("../../drizzle/sandbox-event-schema");
        return db.select().from(sandboxEventLog)
          .orderBy(sql`${sandboxEventLog.createdAt} DESC`)
          .limit(input.limit);
      } catch {
        return [];
      }
    }),
});
