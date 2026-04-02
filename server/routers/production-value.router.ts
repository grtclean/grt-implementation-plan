/**
 * 生产产值统计引擎
 *
 * 核心概念：
 *   产值 = 有效工时 × 工序费率
 *   有效工时 = min(实际工时, 理论工时)  — 超理论部分为无效工时
 *
 * 统计维度：
 *   时间: 周 / 月 / 季度 / 年
 *   组织: 项目 / 事业部 / 全公司
 *   工序: 7大制造工序 + 6类工程工时
 *
 * Tables:
 *   weekly_labor_records   — 每周工时发生记录（按项目×工序）
 *   bu_annual_targets      — 事业部年度产值目标
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ── DDL ──────────────────────────────────────────────
let _ready = false;
async function ensureTables() {
  if (_ready) return;
  const db = await requireDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS weekly_labor_records (
      id SERIAL PRIMARY KEY,
      year INTEGER NOT NULL,
      week INTEGER NOT NULL,
      week_start DATE NOT NULL,
      week_end DATE NOT NULL,
      project_code VARCHAR(50) NOT NULL,
      bu_code VARCHAR(20) NOT NULL,
      process_code VARCHAR(50) NOT NULL,
      process_name VARCHAR(100) NOT NULL,
      category VARCHAR(30) NOT NULL DEFAULT 'mfg_labor',
      theory_hours NUMERIC(10,2) DEFAULT 0,
      actual_hours NUMERIC(10,2) DEFAULT 0,
      effective_hours NUMERIC(10,2) DEFAULT 0,
      invalid_hours NUMERIC(10,2) DEFAULT 0,
      hourly_rate NUMERIC(10,2) DEFAULT 0,
      production_value NUMERIC(14,2) DEFAULT 0,
      invalid_cost NUMERIC(14,2) DEFAULT 0,
      worker_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(year, week, project_code, process_code)
    );
    CREATE TABLE IF NOT EXISTS bu_annual_targets (
      id SERIAL PRIMARY KEY,
      fiscal_year INTEGER NOT NULL,
      bu_code VARCHAR(20) NOT NULL,
      bu_name VARCHAR(100) NOT NULL,
      target_revenue NUMERIC(14,2) DEFAULT 0,
      target_production_value NUMERIC(14,2) DEFAULT 0,
      target_projects INTEGER DEFAULT 0,
      target_efficiency_pct NUMERIC(5,2) DEFAULT 85,
      target_invalid_hours_pct NUMERIC(5,2) DEFAULT 10,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(fiscal_year, bu_code)
    );
  `);
  try {
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wlr_year_week ON weekly_labor_records(year, week)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wlr_project ON weekly_labor_records(project_code)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wlr_bu ON weekly_labor_records(bu_code)`);
  } catch { /* */ }
  _ready = true;
}

// ── BU mapping ──────────────────────────────────────
const PROJECT_BU_MAP: Record<string, string> = {};
// Projects GRT-4xx → BU mapping based on historical patterns
function inferBU(projectCode: string): string {
  if (PROJECT_BU_MAP[projectCode]) return PROJECT_BU_MAP[projectCode];
  // Round-robin assignment for demo; in production this comes from project master
  const num = parseInt(projectCode.replace(/\D/g, "")) || 0;
  const BUS = ["BU1", "BU2", "BU3", "BU1", "BU2"];
  return BUS[num % BUS.length];
}

const PROCESS_RATES: Record<string, { name: string; rate: number }> = {
  laser_cutting:       { name: "激光切割",       rate: 95 },
  machining:           { name: "机加工",         rate: 110 },
  shearing_bending:    { name: "剪板折弯",       rate: 90 },
  sub_assembly:        { name: "部件制作",       rate: 100 },
  mechanical_assembly: { name: "机械装配",       rate: 125 },
  electrical_assembly: { name: "电气装配",       rate: 130 },
  debug_ship_install:  { name: "调试/发货/安装", rate: 140 },
};

// ═══════════════════════════════════════════════════════
export const productionValueRouter = router({

  // ────────────────────────────────────────
  // 种子：从 project_process_hours 生成周度记录
  // ────────────────────────────────────────

  /** 按项目进度模拟生成每周工时发生记录 */
  seedWeeklyRecords: protectedProcedure
    .input(z.object({ year: z.number().default(2026) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // Read all projects with theory hours
      const projects = await db.execute(sql`
        SELECT project_code, laser_cutting, machining, shearing_bending,
               sub_assembly, mechanical_assembly, electrical_assembly, debug_ship_install
        FROM project_process_hours WHERE part_no = '00' AND hours_type = 'theory'
      `);

      // Read actual consumption where available
      const consumption = await db.execute(sql`
        SELECT project_code, process_name, actual_hours, completion_rate
        FROM process_consumption_stats
      `);
      const consumptionMap = new Map<string, Map<string, { actual: number; completion: number }>>();
      for (const c of consumption.rows as any[]) {
        if (!consumptionMap.has(c.project_code)) consumptionMap.set(c.project_code, new Map());
        const pn = String(c.process_name);
        let code = "";
        if (pn.includes("激光") || pn.includes("5.2")) code = "laser_cutting";
        else if (pn.includes("机加工") || pn.includes("5.3")) code = "machining";
        else if (pn.includes("剪板") || pn.includes("5.4")) code = "shearing_bending";
        else if (pn.includes("部件") || pn.includes("5.5")) code = "sub_assembly";
        else if (pn.includes("机械装配") || pn.includes("5.6")) code = "mechanical_assembly";
        else if (pn.includes("电气装配") || pn.includes("5.7")) code = "electrical_assembly";
        else if (pn.includes("调试") || pn.includes("发货")) code = "debug_ship_install";
        if (code) consumptionMap.get(c.project_code)!.set(code, {
          actual: Number(c.actual_hours ?? 0), completion: Number(c.completion_rate ?? 0)
        });
      }

      // Get rate configs
      const rates = await db.execute(sql`
        SELECT rate_code, hourly_rate FROM quote_rate_configs
        WHERE fiscal_year = ${input.year} AND category = 'mfg_process' AND is_active = true AND bu_code IS NULL
      `);
      const rateMap: Record<string, number> = {};
      for (const r of rates.rows as any[]) rateMap[r.rate_code] = Number(r.hourly_rate);

      // Clear existing
      await db.execute(sql`DELETE FROM weekly_labor_records WHERE year = ${input.year}`);

      let totalRecords = 0;
      const COLS = ["laser_cutting", "machining", "shearing_bending", "sub_assembly", "mechanical_assembly", "electrical_assembly", "debug_ship_install"];

      for (const proj of projects.rows as any[]) {
        const projectCode = proj.project_code;
        const buCode = inferBU(projectCode);

        // Distribute hours across weeks (simulate project timeline)
        // Each project spans ~8-20 weeks depending on total hours
        const totalTheory = COLS.reduce((s, c) => s + Number(proj[c] ?? 0), 0);
        const projectWeeks = Math.max(8, Math.min(40, Math.ceil(totalTheory / 200)));
        // Start week is staggered by project number
        const projNum = parseInt(projectCode.replace(/\D/g, "")) || 0;
        const startWeek = Math.max(1, ((projNum * 3) % 40) + 1);

        for (const col of COLS) {
          const theoryTotal = Number(proj[col] ?? 0);
          if (theoryTotal <= 0) continue;

          const rate = rateMap[col] ?? PROCESS_RATES[col]?.rate ?? 100;
          const procName = PROCESS_RATES[col]?.name ?? col;
          const cData = consumptionMap.get(projectCode)?.get(col);
          const actualTotal = cData?.actual ?? theoryTotal * (0.85 + Math.random() * 0.3);

          // Distribute across weeks with a bell-curve pattern
          for (let w = 0; w < projectWeeks; w++) {
            const weekNum = startWeek + w;
            if (weekNum > 52) break;

            // Bell-curve weight: more hours in middle of project
            const mid = projectWeeks / 2;
            const weight = Math.exp(-0.5 * Math.pow((w - mid) / (mid * 0.6), 2));
            const weekTheory = Math.round(theoryTotal * weight / projectWeeks * 100) / 100;
            const weekActual = Math.round(actualTotal * weight / projectWeeks * 100) / 100;

            if (weekTheory < 0.1 && weekActual < 0.1) continue;

            const effective = Math.min(weekActual, weekTheory);
            const invalid = Math.max(0, weekActual - weekTheory);
            const value = Math.round(effective * rate * 100) / 100;
            const invalidCost = Math.round(invalid * rate * 100) / 100;

            // Calculate week dates
            const jan1 = new Date(input.year, 0, 1);
            const weekStart = new Date(jan1.getTime() + (weekNum - 1) * 7 * 86400000);
            const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
            const wsStr = weekStart.toISOString().split("T")[0];
            const weStr = weekEnd.toISOString().split("T")[0];

            await db.execute(sql`
              INSERT INTO weekly_labor_records (year, week, week_start, week_end, project_code, bu_code,
                process_code, process_name, category, theory_hours, actual_hours, effective_hours,
                invalid_hours, hourly_rate, production_value, invalid_cost, worker_count)
              VALUES (${input.year}, ${weekNum}, ${wsStr}, ${weStr}, ${projectCode}, ${buCode},
                ${col}, ${procName}, 'mfg_labor', ${weekTheory}, ${weekActual}, ${effective},
                ${invalid}, ${rate}, ${value}, ${invalidCost}, ${Math.ceil(weekActual / 40)})
              ON CONFLICT (year, week, project_code, process_code) DO UPDATE SET
                actual_hours = ${weekActual}, effective_hours = ${effective}, invalid_hours = ${invalid},
                production_value = ${value}, invalid_cost = ${invalidCost}
            `);
            totalRecords++;
          }
        }
      }

      return { success: true, totalRecords };
    }),

  /** 种子：事业部年度目标 */
  seedBUTargets: protectedProcedure
    .input(z.object({ year: z.number().default(2026) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const targets = [
        { bu: "BU1", name: "事业一部(海外)", revenue: 45000000, prodValue: 12000000, projects: 15, eff: 88 },
        { bu: "BU2", name: "事业二部(商用车)", revenue: 35000000, prodValue: 9000000, projects: 10, eff: 85 },
        { bu: "BU3", name: "事业三部(乘用车)", revenue: 40000000, prodValue: 10000000, projects: 12, eff: 86 },
        { bu: "BU4", name: "事业四部(半导体)", revenue: 20000000, prodValue: 5000000, projects: 5, eff: 90 },
        { bu: "BU5", name: "事业十部(工业通用)", revenue: 15000000, prodValue: 4000000, projects: 8, eff: 82 },
      ];
      for (const t of targets) {
        await db.execute(sql`
          INSERT INTO bu_annual_targets (fiscal_year, bu_code, bu_name, target_revenue, target_production_value,
            target_projects, target_efficiency_pct, target_invalid_hours_pct)
          VALUES (${input.year}, ${t.bu}, ${t.name}, ${t.revenue}, ${t.prodValue}, ${t.projects}, ${t.eff}, 10)
          ON CONFLICT (fiscal_year, bu_code) DO UPDATE SET
            target_revenue=${t.revenue}, target_production_value=${t.prodValue}, target_projects=${t.projects},
            target_efficiency_pct=${t.eff}, updated_at=NOW()
        `);
      }
      return { success: true, count: targets.length };
    }),

  // ────────────────────────────────────────
  // 统计查询
  // ────────────────────────────────────────

  /** 周度统计 — 按项目 */
  getWeeklyByProject: protectedProcedure
    .input(z.object({
      year: z.number().default(2026),
      week: z.number().optional(),
      projectCode: z.string().optional(),
      buCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT project_code, bu_code, week, week_start,
          sum(theory_hours) AS theory_hours,
          sum(actual_hours) AS actual_hours,
          sum(effective_hours) AS effective_hours,
          sum(invalid_hours) AS invalid_hours,
          sum(production_value) AS production_value,
          sum(invalid_cost) AS invalid_cost,
          CASE WHEN sum(actual_hours) > 0
            THEN round((sum(theory_hours) / sum(actual_hours) * 100)::numeric, 1)
            ELSE 0 END AS efficiency
        FROM weekly_labor_records
        WHERE year = ${input.year}
        GROUP BY project_code, bu_code, week, week_start
        ORDER BY week, project_code
        LIMIT 2000
      `);
      let rows = result.rows as any[];
      if (input.week) rows = rows.filter(r => Number(r.week) === input.week);
      if (input.projectCode) rows = rows.filter(r => r.project_code === input.projectCode);
      if (input.buCode) rows = rows.filter(r => r.bu_code === input.buCode);
      return rows;
    }),

  /** 周度统计 — 按事业部汇总 */
  getWeeklyByBU: protectedProcedure
    .input(z.object({ year: z.number().default(2026), buCode: z.string().optional() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT bu_code, week, min(week_start) AS week_start,
          count(DISTINCT project_code) AS project_count,
          sum(theory_hours) AS theory_hours,
          sum(actual_hours) AS actual_hours,
          sum(effective_hours) AS effective_hours,
          sum(invalid_hours) AS invalid_hours,
          sum(production_value) AS production_value,
          sum(invalid_cost) AS invalid_cost,
          CASE WHEN sum(actual_hours) > 0
            THEN round((sum(theory_hours) / sum(actual_hours) * 100)::numeric, 1)
            ELSE 0 END AS efficiency
        FROM weekly_labor_records WHERE year = ${input.year}
        GROUP BY bu_code, week
        ORDER BY bu_code, week
      `);
      let rows = result.rows as any[];
      if (input.buCode) rows = rows.filter(r => r.bu_code === input.buCode);
      return rows;
    }),

  /** 月度统计 — 按事业部 */
  getMonthlyByBU: protectedProcedure
    .input(z.object({ year: z.number().default(2026), buCode: z.string().optional() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT bu_code, EXTRACT(MONTH FROM week_start)::integer AS month,
          count(DISTINCT project_code) AS project_count,
          round(sum(theory_hours)::numeric, 1) AS theory_hours,
          round(sum(actual_hours)::numeric, 1) AS actual_hours,
          round(sum(effective_hours)::numeric, 1) AS effective_hours,
          round(sum(invalid_hours)::numeric, 1) AS invalid_hours,
          round(sum(production_value)::numeric, 0) AS production_value,
          round(sum(invalid_cost)::numeric, 0) AS invalid_cost,
          CASE WHEN sum(actual_hours) > 0
            THEN round((sum(theory_hours) / sum(actual_hours) * 100)::numeric, 1)
            ELSE 0 END AS efficiency
        FROM weekly_labor_records WHERE year = ${input.year}
        GROUP BY bu_code, EXTRACT(MONTH FROM week_start)
        ORDER BY bu_code, month
      `);
      let rows = result.rows as any[];
      if (input.buCode) rows = rows.filter(r => r.bu_code === input.buCode);
      return rows;
    }),

  /** 季度统计 — 按事业部 */
  getQuarterlyByBU: protectedProcedure
    .input(z.object({ year: z.number().default(2026), buCode: z.string().optional() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT bu_code, EXTRACT(QUARTER FROM week_start)::integer AS quarter,
          count(DISTINCT project_code) AS project_count,
          round(sum(theory_hours)::numeric, 0) AS theory_hours,
          round(sum(actual_hours)::numeric, 0) AS actual_hours,
          round(sum(effective_hours)::numeric, 0) AS effective_hours,
          round(sum(invalid_hours)::numeric, 0) AS invalid_hours,
          round(sum(production_value)::numeric, 0) AS production_value,
          round(sum(invalid_cost)::numeric, 0) AS invalid_cost,
          CASE WHEN sum(actual_hours) > 0
            THEN round((sum(theory_hours) / sum(actual_hours) * 100)::numeric, 1)
            ELSE 0 END AS efficiency
        FROM weekly_labor_records WHERE year = ${input.year}
        GROUP BY bu_code, EXTRACT(QUARTER FROM week_start)
        ORDER BY bu_code, quarter
      `);
      let rows = result.rows as any[];
      if (input.buCode) rows = rows.filter(r => r.bu_code === input.buCode);
      return rows;
    }),

  /** 年度统计 — 按事业部 + 与目标对比 */
  getAnnualByBU: protectedProcedure
    .input(z.object({ year: z.number().default(2026) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const actual = await db.execute(sql`
        SELECT bu_code,
          count(DISTINCT project_code) AS project_count,
          round(sum(theory_hours)::numeric, 0) AS theory_hours,
          round(sum(actual_hours)::numeric, 0) AS actual_hours,
          round(sum(effective_hours)::numeric, 0) AS effective_hours,
          round(sum(invalid_hours)::numeric, 0) AS invalid_hours,
          round(sum(production_value)::numeric, 0) AS production_value,
          round(sum(invalid_cost)::numeric, 0) AS invalid_cost,
          CASE WHEN sum(actual_hours) > 0
            THEN round((sum(theory_hours) / sum(actual_hours) * 100)::numeric, 1)
            ELSE 0 END AS efficiency,
          CASE WHEN sum(actual_hours) > 0
            THEN round((sum(invalid_hours) / sum(actual_hours) * 100)::numeric, 1)
            ELSE 0 END AS invalid_pct
        FROM weekly_labor_records WHERE year = ${input.year}
        GROUP BY bu_code ORDER BY bu_code
      `);

      const targets = await db.execute(sql`
        SELECT bu_code, bu_name, target_revenue, target_production_value,
          target_projects, target_efficiency_pct, target_invalid_hours_pct
        FROM bu_annual_targets WHERE fiscal_year = ${input.year}
      `);
      const targetMap = new Map((targets.rows as any[]).map(t => [t.bu_code, t]));

      return (actual.rows as any[]).map(a => {
        const t = targetMap.get(a.bu_code);
        const targetPV = Number(t?.target_production_value ?? 0);
        const actualPV = Number(a.production_value ?? 0);
        return {
          ...a,
          buName: t?.bu_name ?? a.bu_code,
          targetRevenue: t?.target_revenue ?? 0,
          targetProductionValue: targetPV,
          targetProjects: t?.target_projects ?? 0,
          targetEfficiency: t?.target_efficiency_pct ?? 85,
          targetInvalidPct: t?.target_invalid_hours_pct ?? 10,
          // 目标达成率
          pvAchievementRate: targetPV > 0 ? Math.round(actualPV / targetPV * 1000) / 10 : 0,
          projectAchievementRate: t?.target_projects > 0
            ? Math.round(Number(a.project_count) / Number(t.target_projects) * 1000) / 10 : 0,
          efficiencyVsTarget: Number(a.efficiency) - Number(t?.target_efficiency_pct ?? 85),
        };
      });
    }),

  /** 按工序分类统计 — 指定时间范围 */
  getByProcessCategory: protectedProcedure
    .input(z.object({
      year: z.number().default(2026),
      buCode: z.string().optional(),
      period: z.enum(["week", "month", "quarter", "year"]).default("month"),
      periodValue: z.number().optional(),
    }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      let periodExpr = sql`EXTRACT(MONTH FROM week_start)::integer`;
      if (input.period === "week") periodExpr = sql`week`;
      else if (input.period === "quarter") periodExpr = sql`EXTRACT(QUARTER FROM week_start)::integer`;
      else if (input.period === "year") periodExpr = sql`year`;

      const result = await db.execute(sql`
        SELECT process_code, process_name,
          round(sum(theory_hours)::numeric, 1) AS theory_hours,
          round(sum(actual_hours)::numeric, 1) AS actual_hours,
          round(sum(effective_hours)::numeric, 1) AS effective_hours,
          round(sum(invalid_hours)::numeric, 1) AS invalid_hours,
          round(sum(production_value)::numeric, 0) AS production_value,
          round(sum(invalid_cost)::numeric, 0) AS invalid_cost,
          CASE WHEN sum(actual_hours) > 0
            THEN round((sum(theory_hours) / sum(actual_hours) * 100)::numeric, 1)
            ELSE 0 END AS efficiency
        FROM weekly_labor_records WHERE year = ${input.year}
        GROUP BY process_code, process_name
        ORDER BY production_value DESC
      `);
      let rows = result.rows as any[];
      // BU filter in-memory since the SQL is simpler
      if (input.buCode) {
        const buFiltered = await db.execute(sql`
          SELECT process_code, process_name,
            round(sum(theory_hours)::numeric, 1) AS theory_hours,
            round(sum(actual_hours)::numeric, 1) AS actual_hours,
            round(sum(effective_hours)::numeric, 1) AS effective_hours,
            round(sum(invalid_hours)::numeric, 1) AS invalid_hours,
            round(sum(production_value)::numeric, 0) AS production_value,
            round(sum(invalid_cost)::numeric, 0) AS invalid_cost,
            CASE WHEN sum(actual_hours) > 0
              THEN round((sum(theory_hours) / sum(actual_hours) * 100)::numeric, 1)
              ELSE 0 END AS efficiency
          FROM weekly_labor_records WHERE year = ${input.year} AND bu_code = ${input.buCode}
          GROUP BY process_code, process_name ORDER BY production_value DESC
        `);
        rows = buFiltered.rows as any[];
      }
      return rows;
    }),

  /** 产值趋势 — 周度累计产值 vs 目标线 */
  getProductionValueTrend: protectedProcedure
    .input(z.object({ year: z.number().default(2026), buCode: z.string().optional() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const weekly = input.buCode
        ? await db.execute(sql`
            SELECT week, round(sum(production_value)::numeric, 0) AS weekly_value,
              round(sum(invalid_cost)::numeric, 0) AS weekly_invalid
            FROM weekly_labor_records WHERE year = ${input.year} AND bu_code = ${input.buCode}
            GROUP BY week ORDER BY week
          `)
        : await db.execute(sql`
            SELECT week, round(sum(production_value)::numeric, 0) AS weekly_value,
              round(sum(invalid_cost)::numeric, 0) AS weekly_invalid
            FROM weekly_labor_records WHERE year = ${input.year}
            GROUP BY week ORDER BY week
          `);

      // Get target for cumulative line
      const target = input.buCode
        ? await db.execute(sql`SELECT target_production_value FROM bu_annual_targets WHERE fiscal_year = ${input.year} AND bu_code = ${input.buCode}`)
        : await db.execute(sql`SELECT sum(target_production_value) AS target_production_value FROM bu_annual_targets WHERE fiscal_year = ${input.year}`);
      const annualTarget = Number((target.rows as any[])[0]?.target_production_value ?? 0);
      const weeklyTarget = annualTarget / 52;

      let cumValue = 0, cumTarget = 0;
      const trend = (weekly.rows as any[]).map(w => {
        cumValue += Number(w.weekly_value);
        cumTarget += weeklyTarget;
        return {
          week: Number(w.week),
          weeklyValue: Number(w.weekly_value),
          weeklyInvalid: Number(w.weekly_invalid),
          cumulativeValue: Math.round(cumValue),
          cumulativeTarget: Math.round(cumTarget),
          gapToTarget: Math.round(cumValue - cumTarget),
          achievementRate: cumTarget > 0 ? Math.round(cumValue / cumTarget * 1000) / 10 : 0,
        };
      });
      return { trend, annualTarget };
    }),

  /** 绩效排名 — 事业部效率 + 产值排名 */
  getBUPerformanceRanking: protectedProcedure
    .input(z.object({ year: z.number().default(2026) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const result = await db.execute(sql`
        SELECT bu_code,
          count(DISTINCT project_code) AS projects,
          round(sum(production_value)::numeric, 0) AS production_value,
          round(sum(actual_hours)::numeric, 0) AS actual_hours,
          round(sum(invalid_hours)::numeric, 0) AS invalid_hours,
          CASE WHEN sum(actual_hours) > 0
            THEN round((sum(effective_hours) / sum(actual_hours) * 100)::numeric, 1)
            ELSE 0 END AS efficiency,
          CASE WHEN sum(actual_hours) > 0
            THEN round((sum(invalid_hours) / sum(actual_hours) * 100)::numeric, 1)
            ELSE 0 END AS invalid_rate,
          CASE WHEN sum(actual_hours) > 0
            THEN round((sum(production_value) / sum(actual_hours))::numeric, 0)
            ELSE 0 END AS value_per_hour
        FROM weekly_labor_records WHERE year = ${input.year}
        GROUP BY bu_code ORDER BY production_value DESC
      `);

      const targets = await db.execute(sql`SELECT * FROM bu_annual_targets WHERE fiscal_year = ${input.year}`);
      const tMap = new Map((targets.rows as any[]).map(t => [t.bu_code, t]));

      return (result.rows as any[]).map((r, i) => {
        const t = tMap.get(r.bu_code);
        return {
          rank: i + 1,
          ...r,
          buName: t?.bu_name ?? r.bu_code,
          targetPV: Number(t?.target_production_value ?? 0),
          pvAchievement: Number(t?.target_production_value ?? 0) > 0
            ? Math.round(Number(r.production_value) / Number(t.target_production_value) * 1000) / 10 : 0,
          efficiencyScore: Number(r.efficiency) >= Number(t?.target_efficiency_pct ?? 85) ? "达标" : "未达标",
        };
      });
    }),
});
