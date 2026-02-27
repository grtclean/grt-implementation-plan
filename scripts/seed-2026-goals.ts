/**
 * 2026 CEO Strategic Goals Seed Script
 *
 * Seeds the company_goals and division_kpis tables with the CEO's
 * finalized 2026 Division Manager Performance System data.
 *
 * Tables seeded:
 *   1. company_goals   - 6 company-level strategic metrics
 *   2. division_kpis   - 30 division KPIs (6 per BU × 5 BUs)
 *
 * Usage:
 *   npx tsx scripts/seed-2026-goals.ts
 */

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

// ---------------------------------------------------------------------------
// Data definitions
// ---------------------------------------------------------------------------

const COMPANY_GOALS = [
  { metric_name: "制造事业部营收", metric_name_en: "Manufacturing Division Revenue", target_value: 280000000, current_value: 68000000, unit: "CNY", weight: 0.30, category: "revenue" },
  { metric_name: "FAT一次通过率", metric_name_en: "FAT First-Pass Rate", target_value: 95, current_value: 91.2, unit: "%", weight: 0.20, category: "quality" },
  { metric_name: "项目交付及时率", metric_name_en: "Project On-Time Delivery", target_value: 92, current_value: 88.5, unit: "%", weight: 0.20, category: "delivery" },
  { metric_name: "质量百万缺陷率", metric_name_en: "Quality DPPM", target_value: 500, current_value: 620, unit: "DPPM", weight: 0.15, category: "quality" },
  { metric_name: "制造成本控制", metric_name_en: "Manufacturing Cost Reduction", target_value: 5, current_value: 3.2, unit: "% reduction", weight: 0.10, category: "cost" },
  { metric_name: "团队建设完成率", metric_name_en: "Team Building Completion", target_value: 90, current_value: 72, unit: "%", weight: 0.05, category: "team" },
];

interface BUConfig {
  division_name: string;
  division_code: string;
  manager_name: string;
  kpis: { target: number; current: number; rag: string; pct: number; criteria: string }[];
}

const BU_CONFIGS: BUConfig[] = [
  {
    division_name: "海外事业部", division_code: "BU1", manager_name: "张海涛",
    kpis: [
      { target: 85000000, current: 22000000, rag: "A", pct: 25.9, criteria: "全年营收达成85M CNY，含海外OEM及售后服务收入" },
      { target: 96, current: 94.5, rag: "A", pct: 98.4, criteria: "海外项目FAT一次通过率≥96%，含远程FAT" },
      { target: 93, current: 90, rag: "A", pct: 96.8, criteria: "海外项目交付及时率≥93%，扣除不可抗力" },
      { target: 450, current: 380, rag: "G", pct: 100, criteria: "海外发运产品DPPM≤450，含IQC及终检" },
      { target: 6, current: 4.8, rag: "A", pct: 80, criteria: "海外BU制造成本同比降低≥6%" },
      { target: 90, current: 85, rag: "G", pct: 94.4, criteria: "海外团队培训覆盖率、认证通过率综合≥90%" },
    ],
  },
  {
    division_name: "商用车事业部", division_code: "BU2", manager_name: "王志强",
    kpis: [
      { target: 72000000, current: 16500000, rag: "A", pct: 22.9, criteria: "全年营收达成72M CNY，含新能源商用车清洗线" },
      { target: 94, current: 91, rag: "A", pct: 96.8, criteria: "商用车项目FAT一次通过率≥94%" },
      { target: 91, current: 87, rag: "R", pct: 95.6, criteria: "商用车项目交付及时率≥91%" },
      { target: 550, current: 610, rag: "R", pct: 90.2, criteria: "商用车DPPM≤550，重点关注焊接及涂装工序" },
      { target: 4.5, current: 3.1, rag: "A", pct: 68.9, criteria: "商用车BU制造成本同比降低≥4.5%" },
      { target: 88, current: 78, rag: "A", pct: 88.6, criteria: "商用车团队培训覆盖率≥88%" },
    ],
  },
  {
    division_name: "乘用车事业部", division_code: "BU3", manager_name: "李明远",
    kpis: [
      { target: 58000000, current: 14200000, rag: "A", pct: 24.5, criteria: "全年营收达成58M CNY，含新能源乘用车零部件清洗线" },
      { target: 95, current: 93.8, rag: "A", pct: 98.7, criteria: "乘用车项目FAT一次通过率≥95%" },
      { target: 92, current: 91, rag: "G", pct: 98.9, criteria: "乘用车项目交付及时率≥92%" },
      { target: 480, current: 450, rag: "G", pct: 100, criteria: "乘用车DPPM≤480，重点关注精密清洗" },
      { target: 5, current: 3.5, rag: "A", pct: 70, criteria: "乘用车BU制造成本同比降低≥5%" },
      { target: 90, current: 82, rag: "A", pct: 91.1, criteria: "乘用车团队培训覆盖率≥90%" },
    ],
  },
  {
    division_name: "半导体事业部", division_code: "BU4", manager_name: "陈立学",
    kpis: [
      { target: 35000000, current: 9800000, rag: "G", pct: 28.0, criteria: "全年营收达成35M CNY，含晶圆清洗及封装清洗设备" },
      { target: 98, current: 97.5, rag: "G", pct: 99.5, criteria: "半导体项目FAT一次通过率≥98%，洁净度Class100" },
      { target: 95, current: 94, rag: "G", pct: 98.9, criteria: "半导体项目交付及时率≥95%" },
      { target: 300, current: 280, rag: "G", pct: 100, criteria: "半导体DPPM≤300，零颗粒污染标准" },
      { target: 5.5, current: 4.2, rag: "A", pct: 76.4, criteria: "半导体BU制造成本同比降低≥5.5%" },
      { target: 92, current: 88, rag: "G", pct: 95.7, criteria: "半导体团队培训覆盖率≥92%，含洁净室认证" },
    ],
  },
  {
    division_name: "工业通用事业部", division_code: "BU5", manager_name: "周建国",
    kpis: [
      { target: 30000000, current: 6500000, rag: "R", pct: 21.7, criteria: "全年营收达成30M CNY，含通用工业清洗线" },
      { target: 93, current: 89, rag: "R", pct: 95.7, criteria: "工业通用项目FAT一次通过率≥93%" },
      { target: 90, current: 84, rag: "R", pct: 93.3, criteria: "工业通用项目交付及时率≥90%" },
      { target: 600, current: 720, rag: "R", pct: 83.3, criteria: "工业通用DPPM≤600" },
      { target: 4, current: 2.8, rag: "A", pct: 70, criteria: "工业通用BU制造成本同比降低≥4%" },
      { target: 85, current: 70, rag: "R", pct: 82.4, criteria: "工业通用团队培训覆盖率≥85%" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Connected to database.");

  try {
    await client.query("BEGIN");

    // Create tables if they don't exist
    await client.query(`
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
    await client.query(`
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

    // Clear existing 2026 data for idempotency
    const existing = await client.query("SELECT COUNT(*)::int AS cnt FROM company_goals WHERE year = 2026");
    if (Number(existing.rows[0]?.cnt) > 0) {
      console.log("Clearing existing 2026 data...");
      await client.query("DELETE FROM division_kpis WHERE year = 2026");
      await client.query("DELETE FROM company_goals WHERE year = 2026");
    }

    // =========================================================================
    // 1. Company Goals (6 rows)
    // =========================================================================
    const goalIds: number[] = [];
    for (const g of COMPANY_GOALS) {
      const res = await client.query(
        `INSERT INTO company_goals (year, metric_name, metric_name_en, target_value, current_value, unit, weight, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [2026, g.metric_name, g.metric_name_en, g.target_value, g.current_value, g.unit, g.weight, g.category]
      );
      goalIds.push(res.rows[0].id);
    }
    console.log(`Inserted ${goalIds.length} company goals, IDs: [${goalIds.join(", ")}]`);

    // =========================================================================
    // 2. Division KPIs (30 rows = 6 per BU × 5 BUs)
    // =========================================================================
    let kpiCount = 0;
    for (const bu of BU_CONFIGS) {
      for (let i = 0; i < bu.kpis.length; i++) {
        const kpi = bu.kpis[i];
        const goal = COMPANY_GOALS[i];
        const goalId = goalIds[i];
        await client.query(
          `INSERT INTO division_kpis
           (company_goal_id, division_name, division_code, manager_name,
            metric_name, metric_name_en, target_value, current_value,
            unit, weight, evaluation_criteria, rag_status, completion_pct, year)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            goalId, bu.division_name, bu.division_code, bu.manager_name,
            goal.metric_name, goal.metric_name_en, kpi.target, kpi.current,
            goal.unit, goal.weight, kpi.criteria, kpi.rag, kpi.pct, 2026,
          ]
        );
        kpiCount++;
      }
    }
    console.log(`Inserted ${kpiCount} division KPIs across ${BU_CONFIGS.length} BUs.`);

    await client.query("COMMIT");
    console.log("Transaction committed.");

    // =========================================================================
    // Verification
    // =========================================================================
    console.log("\n========== Verification ==========");

    const goalStats = await client.query(
      "SELECT category, COUNT(*)::int AS cnt FROM company_goals WHERE year = 2026 GROUP BY category ORDER BY category"
    );
    console.log("\nCompany goals by category:");
    for (const r of goalStats.rows) console.log(`  ${r.category}: ${r.cnt}`);

    const kpiStats = await client.query(
      "SELECT division_code, division_name, COUNT(*)::int AS cnt FROM division_kpis WHERE year = 2026 GROUP BY division_code, division_name ORDER BY division_code"
    );
    console.log("\nDivision KPIs:");
    for (const r of kpiStats.rows as any[]) console.log(`  ${r.division_code} (${r.division_name}): ${r.cnt} KPIs`);

    const ragStats = await client.query(
      "SELECT rag_status, COUNT(*)::int AS cnt FROM division_kpis WHERE year = 2026 GROUP BY rag_status ORDER BY rag_status"
    );
    console.log("\nRAG distribution:");
    for (const r of ragStats.rows as any[]) console.log(`  ${r.rag_status}: ${r.cnt}`);

    console.log("\n========== 2026 Strategy Goals Seed Complete ==========");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Transaction rolled back due to error:", err);
    throw err;
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
