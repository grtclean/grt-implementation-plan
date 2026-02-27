import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Ensure tables exist (auto-migrate)
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
    console.warn("strategy-goals ensureTables:", e.message);
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
    const cnt = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM company_goals WHERE year = 2026`);
    if (Number((cnt.rows as any[])[0]?.cnt) > 0) return;

    // 6 Company Goals
    await db.execute(sql`
      INSERT INTO company_goals (id, year, metric_name, metric_name_en, target_value, current_value, unit, weight, category) VALUES
        (1, 2026, '制造事业部营收', 'Manufacturing Division Revenue', 280000000, 68000000, 'CNY', 0.30, 'revenue'),
        (2, 2026, 'FAT一次通过率', 'FAT First-Pass Rate', 95, 91.2, '%', 0.20, 'quality'),
        (3, 2026, '项目交付及时率', 'Project On-Time Delivery', 92, 88.5, '%', 0.20, 'delivery'),
        (4, 2026, '质量百万缺陷率', 'Quality DPPM', 500, 620, 'DPPM', 0.15, 'quality'),
        (5, 2026, '制造成本控制', 'Manufacturing Cost Reduction', 5, 3.2, '% reduction', 0.10, 'cost'),
        (6, 2026, '团队建设完成率', 'Team Building Completion', 90, 72, '%', 0.05, 'team')
    `);
    await db.execute(sql`SELECT setval('company_goals_id_seq', 6, true)`);

    // 30 Division KPIs (6 per BU × 5 BUs)
    // BU1 海外 — 张海涛
    await db.execute(sql`
      INSERT INTO division_kpis (company_goal_id, division_name, division_code, manager_name, metric_name, metric_name_en, target_value, current_value, unit, weight, evaluation_criteria, rag_status, completion_pct, year) VALUES
        (1, '海外事业部', 'BU1', '张海涛', '事业部营收', 'Division Revenue', 85000000, 22000000, 'CNY', 0.30, '全年营收达成85M CNY，含海外OEM及售后服务收入', 'A', 25.9, 2026),
        (2, '海外事业部', 'BU1', '张海涛', 'FAT一次通过率', 'FAT First-Pass Rate', 96, 94.5, '%', 0.20, '海外项目FAT一次通过率≥96%，含远程FAT', 'A', 98.4, 2026),
        (3, '海外事业部', 'BU1', '张海涛', '项目交付及时率', 'Project OTD', 93, 90, '%', 0.20, '海外项目交付及时率≥93%，扣除不可抗力', 'A', 96.8, 2026),
        (4, '海外事业部', 'BU1', '张海涛', '质量百万缺陷率', 'Quality DPPM', 450, 380, 'DPPM', 0.15, '海外发运产品DPPM≤450，含IQC及终检', 'G', 100, 2026),
        (5, '海外事业部', 'BU1', '张海涛', '制造成本控制', 'Cost Reduction', 6, 4.8, '% reduction', 0.10, '海外BU制造成本同比降低≥6%', 'A', 80, 2026),
        (6, '海外事业部', 'BU1', '张海涛', '团队建设完成率', 'Team Building', 90, 85, '%', 0.05, '海外团队培训覆盖率、认证通过率综合≥90%', 'G', 94.4, 2026)
    `);

    // BU2 商用车 — 王志强
    await db.execute(sql`
      INSERT INTO division_kpis (company_goal_id, division_name, division_code, manager_name, metric_name, metric_name_en, target_value, current_value, unit, weight, evaluation_criteria, rag_status, completion_pct, year) VALUES
        (1, '商用车事业部', 'BU2', '王志强', '事业部营收', 'Division Revenue', 72000000, 16500000, 'CNY', 0.30, '全年营收达成72M CNY，含新能源商用车清洗线', 'A', 22.9, 2026),
        (2, '商用车事业部', 'BU2', '王志强', 'FAT一次通过率', 'FAT First-Pass Rate', 94, 91, '%', 0.20, '商用车项目FAT一次通过率≥94%', 'A', 96.8, 2026),
        (3, '商用车事业部', 'BU2', '王志强', '项目交付及时率', 'Project OTD', 91, 87, '%', 0.20, '商用车项目交付及时率≥91%', 'R', 95.6, 2026),
        (4, '商用车事业部', 'BU2', '王志强', '质量百万缺陷率', 'Quality DPPM', 550, 610, 'DPPM', 0.15, '商用车DPPM≤550，重点关注焊接及涂装工序', 'R', 90.2, 2026),
        (5, '商用车事业部', 'BU2', '王志强', '制造成本控制', 'Cost Reduction', 4.5, 3.1, '% reduction', 0.10, '商用车BU制造成本同比降低≥4.5%', 'A', 68.9, 2026),
        (6, '商用车事业部', 'BU2', '王志强', '团队建设完成率', 'Team Building', 88, 78, '%', 0.05, '商用车团队培训覆盖率≥88%', 'A', 88.6, 2026)
    `);

    // BU3 乘用车 — 李明远
    await db.execute(sql`
      INSERT INTO division_kpis (company_goal_id, division_name, division_code, manager_name, metric_name, metric_name_en, target_value, current_value, unit, weight, evaluation_criteria, rag_status, completion_pct, year) VALUES
        (1, '乘用车事业部', 'BU3', '李明远', '事业部营收', 'Division Revenue', 58000000, 14200000, 'CNY', 0.30, '全年营收达成58M CNY，含新能源乘用车零部件清洗线', 'A', 24.5, 2026),
        (2, '乘用车事业部', 'BU3', '李明远', 'FAT一次通过率', 'FAT First-Pass Rate', 95, 93.8, '%', 0.20, '乘用车项目FAT一次通过率≥95%', 'A', 98.7, 2026),
        (3, '乘用车事业部', 'BU3', '李明远', '项目交付及时率', 'Project OTD', 92, 91, '%', 0.20, '乘用车项目交付及时率≥92%', 'G', 98.9, 2026),
        (4, '乘用车事业部', 'BU3', '李明远', '质量百万缺陷率', 'Quality DPPM', 480, 450, 'DPPM', 0.15, '乘用车DPPM≤480，重点关注精密清洗', 'G', 100, 2026),
        (5, '乘用车事业部', 'BU3', '李明远', '制造成本控制', 'Cost Reduction', 5, 3.5, '% reduction', 0.10, '乘用车BU制造成本同比降低≥5%', 'A', 70, 2026),
        (6, '乘用车事业部', 'BU3', '李明远', '团队建设完成率', 'Team Building', 90, 82, '%', 0.05, '乘用车团队培训覆盖率≥90%', 'A', 91.1, 2026)
    `);

    // BU4 半导体 — 陈立学
    await db.execute(sql`
      INSERT INTO division_kpis (company_goal_id, division_name, division_code, manager_name, metric_name, metric_name_en, target_value, current_value, unit, weight, evaluation_criteria, rag_status, completion_pct, year) VALUES
        (1, '半导体事业部', 'BU4', '陈立学', '事业部营收', 'Division Revenue', 35000000, 9800000, 'CNY', 0.30, '全年营收达成35M CNY，含晶圆清洗及封装清洗设备', 'G', 28.0, 2026),
        (2, '半导体事业部', 'BU4', '陈立学', 'FAT一次通过率', 'FAT First-Pass Rate', 98, 97.5, '%', 0.20, '半导体项目FAT一次通过率≥98%，洁净度Class100', 'G', 99.5, 2026),
        (3, '半导体事业部', 'BU4', '陈立学', '项目交付及时率', 'Project OTD', 95, 94, '%', 0.20, '半导体项目交付及时率≥95%', 'G', 98.9, 2026),
        (4, '半导体事业部', 'BU4', '陈立学', '质量百万缺陷率', 'Quality DPPM', 300, 280, 'DPPM', 0.15, '半导体DPPM≤300，零颗粒污染标准', 'G', 100, 2026),
        (5, '半导体事业部', 'BU4', '陈立学', '制造成本控制', 'Cost Reduction', 5.5, 4.2, '% reduction', 0.10, '半导体BU制造成本同比降低≥5.5%', 'A', 76.4, 2026),
        (6, '半导体事业部', 'BU4', '陈立学', '团队建设完成率', 'Team Building', 92, 88, '%', 0.05, '半导体团队培训覆盖率≥92%，含洁净室认证', 'G', 95.7, 2026)
    `);

    // BU5 工业通用 — 周建国
    await db.execute(sql`
      INSERT INTO division_kpis (company_goal_id, division_name, division_code, manager_name, metric_name, metric_name_en, target_value, current_value, unit, weight, evaluation_criteria, rag_status, completion_pct, year) VALUES
        (1, '工业通用事业部', 'BU5', '周建国', '事业部营收', 'Division Revenue', 30000000, 6500000, 'CNY', 0.30, '全年营收达成30M CNY，含通用工业清洗线', 'R', 21.7, 2026),
        (2, '工业通用事业部', 'BU5', '周建国', 'FAT一次通过率', 'FAT First-Pass Rate', 93, 89, '%', 0.20, '工业通用项目FAT一次通过率≥93%', 'R', 95.7, 2026),
        (3, '工业通用事业部', 'BU5', '周建国', '项目交付及时率', 'Project OTD', 90, 84, '%', 0.20, '工业通用项目交付及时率≥90%', 'R', 93.3, 2026),
        (4, '工业通用事业部', 'BU5', '周建国', '质量百万缺陷率', 'Quality DPPM', 600, 720, 'DPPM', 0.15, '工业通用DPPM≤600', 'R', 83.3, 2026),
        (5, '工业通用事业部', 'BU5', '周建国', '制造成本控制', 'Cost Reduction', 4, 2.8, '% reduction', 0.10, '工业通用BU制造成本同比降低≥4%', 'A', 70, 2026),
        (6, '工业通用事业部', 'BU5', '周建国', '团队建设完成率', 'Team Building', 85, 70, '%', 0.05, '工业通用团队培训覆盖率≥85%', 'R', 82.4, 2026)
    `);

    console.log("[strategy-goals] Seeded 6 company goals + 30 division KPIs");
  } catch (e: any) {
    console.warn("strategy-goals seedIfEmpty:", e.message);
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const strategyGoalsRouter = router({
  // ── Get company-level goals by year ───────────────
  getCompanyGoals: publicProcedure
    .input(z.object({ year: z.number().default(2026) }))
    .query(async ({ input }) => {
      await ensureTables();
      await seedIfEmpty();
      const db = await requireDb();
      const rows = await db.execute(
        sql`SELECT * FROM company_goals WHERE year = ${input.year} ORDER BY id`
      );
      return (rows.rows as any[]) || [];
    }),

  // ── Get division KPIs with optional filter ────────
  getDivisionKpis: publicProcedure
    .input(z.object({
      year: z.number().default(2026),
      divisionCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      await ensureTables();
      await seedIfEmpty();
      const db = await requireDb();
      if (input.divisionCode) {
        const rows = await db.execute(
          sql`SELECT dk.*, cg.metric_name AS company_metric_name, cg.metric_name_en AS company_metric_name_en
              FROM division_kpis dk
              LEFT JOIN company_goals cg ON dk.company_goal_id = cg.id
              WHERE dk.year = ${input.year} AND dk.division_code = ${input.divisionCode}
              ORDER BY dk.id`
        );
        return (rows.rows as any[]) || [];
      }
      const rows = await db.execute(
        sql`SELECT dk.*, cg.metric_name AS company_metric_name, cg.metric_name_en AS company_metric_name_en
            FROM division_kpis dk
            LEFT JOIN company_goals cg ON dk.company_goal_id = cg.id
            WHERE dk.year = ${input.year}
            ORDER BY dk.division_code, dk.id`
      );
      return (rows.rows as any[]) || [];
    }),

  // ── Aggregated dashboard view ─────────────────────
  getDashboard: publicProcedure
    .input(z.object({ year: z.number().default(2026) }))
    .query(async ({ input }) => {
      await ensureTables();
      await seedIfEmpty();
      const db = await requireDb();

      // Fetch company goals
      const goalsResult = await db.execute(
        sql`SELECT * FROM company_goals WHERE year = ${input.year} ORDER BY id`
      );
      const companyGoals = (goalsResult.rows as any[]) || [];

      // Fetch all division KPIs
      const kpisResult = await db.execute(
        sql`SELECT * FROM division_kpis WHERE year = ${input.year} ORDER BY division_code, id`
      );
      const allKpis = (kpisResult.rows as any[]) || [];

      // Group by division
      const divisionMap = new Map<string, any[]>();
      for (const kpi of allKpis) {
        const code = kpi.division_code;
        if (!divisionMap.has(code)) divisionMap.set(code, []);
        divisionMap.get(code)!.push(kpi);
      }

      // Build division summaries
      const divisionSummary = Array.from(divisionMap.entries()).map(([code, kpis]) => {
        const first = kpis[0];
        const totalWeight = kpis.reduce((s: number, k: any) => s + (Number(k.weight) || 0), 0);
        const weightedScore = totalWeight > 0
          ? kpis.reduce((s: number, k: any) => s + (Number(k.completion_pct) || 0) * (Number(k.weight) || 0), 0) / totalWeight
          : 0;
        const ragCounts = { R: 0, A: 0, G: 0 };
        for (const k of kpis) {
          const rag = (k.rag_status || "G") as "R" | "A" | "G";
          ragCounts[rag] = (ragCounts[rag] || 0) + 1;
        }
        return {
          divisionCode: code,
          divisionName: first.division_name,
          managerName: first.manager_name,
          weightedScore: Math.round(weightedScore * 10) / 10,
          ragCounts,
          kpis,
        };
      });

      // Overall company progress (weighted avg of company goals)
      let overallProgress = 0;
      const totalCompanyWeight = companyGoals.reduce((s: number, g: any) => s + (Number(g.weight) || 0), 0);
      if (totalCompanyWeight > 0) {
        // Calculate completion for each company goal
        for (const goal of companyGoals) {
          const target = Number(goal.target_value) || 1;
          const current = Number(goal.current_value) || 0;
          const isLowerBetter = goal.category === "quality" && goal.unit === "DPPM";
          const pct = isLowerBetter
            ? Math.min(100, (target / Math.max(current, 1)) * 100)
            : Math.min(100, (current / target) * 100);
          overallProgress += pct * (Number(goal.weight) || 0);
        }
        overallProgress = Math.round((overallProgress / totalCompanyWeight) * 10) / 10;
      }

      // AI alignment counts
      const totalKpis = allKpis.length;
      const green = allKpis.filter((k: any) => k.rag_status === "G").length;
      const amber = allKpis.filter((k: any) => k.rag_status === "A").length;
      const red = allKpis.filter((k: any) => k.rag_status === "R").length;
      const syncPct = totalKpis > 0 ? Math.round((green / totalKpis) * 1000) / 10 : 0;

      return {
        companyGoals,
        divisionSummary,
        overallProgress,
        aiAlignment: { totalKpis, green, amber, red, syncPct },
      };
    }),

  // ── Update a division KPI ─────────────────────────
  updateDivisionKpi: publicProcedure
    .input(z.object({
      id: z.number(),
      currentValue: z.number().optional(),
      ragStatus: z.enum(["R", "A", "G"]).optional(),
      completionPct: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const sets: string[] = [];
      if (input.currentValue !== undefined) sets.push(`current_value = ${input.currentValue}`);
      if (input.ragStatus !== undefined) sets.push(`rag_status = '${input.ragStatus}'`);
      if (input.completionPct !== undefined) sets.push(`completion_pct = ${input.completionPct}`);
      if (sets.length === 0) return { success: false, message: "No fields to update" };
      sets.push("updated_at = NOW()");

      await db.execute(sql.raw(`UPDATE division_kpis SET ${sets.join(", ")} WHERE id = ${input.id}`));
      return { success: true };
    }),

  // ── Force re-seed for demo ────────────────────────
  seedDemo: publicProcedure.mutation(async () => {
    await ensureTables();
    const db = await requireDb();
    await db.execute(sql`DELETE FROM division_kpis WHERE year = 2026`);
    await db.execute(sql`DELETE FROM company_goals WHERE year = 2026`);
    seeded = false;
    await seedIfEmpty();
    return { success: true, message: "Seeded 6 company goals + 30 division KPIs" };
  }),
});
