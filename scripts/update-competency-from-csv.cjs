/**
 * Update employee_competence_assessments from CSV assessment data.
 * Maps CSV names → canonical employee_id via fuzzy name matching.
 * Skips 侯晓丽 (removed employee).
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

// CSV name → canonical roster name (for mismatches between CSV and seed-real-users)
const NAME_CORRECTIONS = {
  "田桃红": "田炜钰",   // GRT100
  "胡炜": "胡杨",       // GRT049
  "侯晓丽": null,       // removed — skip
  "朱文栋": "朱文韬",   // GRT103
  "刘建康": "刘健康",   // GRT063
  "钱绍辉": "钱佳奇",   // GRT097
  "侯亚琴": "倪亚琴",   // GRT003
  "沈迎风": "沈迎凤",   // GRT055
  "张鹏飞": "张腾飞",   // GRT024
};

function parseScoreCell(cell) {
  // "L4 (85)" → 85
  if (!cell) return null;
  const m = cell.match(/\((\d+)\)/);
  return m ? m[1] : null;
}

async function main() {
  const csvPath = path.join(__dirname, "..", "data", "GRT人员能力测评（202602）.xlsx - Sheet1.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n");
  const header = lines[0].split(",");
  // Columns: 姓名,部门,岗位,T_硬核技术力,S_软性通用力,D_设计与创新力,C_沟通协作力,K_专业标准力,L_领导与战略力

  const c = new Client({ connectionString: "postgresql://postgres:Gerry123456@localhost:5432/grt_system" });
  await c.connect();

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 9) continue;

    let csvName = cols[0].trim();
    const tScore = parseScoreCell(cols[3]);
    const sScore = parseScoreCell(cols[4]);
    const dScore = parseScoreCell(cols[5]);
    const cScore = parseScoreCell(cols[6]);
    const kScore = parseScoreCell(cols[7]);
    const lScore = parseScoreCell(cols[8]);

    // Apply name correction
    if (csvName in NAME_CORRECTIONS) {
      const corrected = NAME_CORRECTIONS[csvName];
      if (corrected === null) {
        console.log(`  SKIP: ${csvName} (removed employee)`);
        skipped++;
        continue;
      }
      csvName = corrected;
    }

    // Find in DB by name
    const { rows } = await c.query(
      "SELECT employee_id, employee_name FROM employee_competence_assessments WHERE employee_name = $1 LIMIT 1",
      [csvName]
    );

    if (rows.length === 0) {
      console.log(`  NOT FOUND: ${csvName}`);
      notFound++;
      continue;
    }

    const empId = rows[0].employee_id;

    // Update scores
    await c.query(
      `UPDATE employee_competence_assessments
       SET t_score = $1, s_score = $2, d_score = $3, c_score = $4, k_score = $5, l_score = $6,
           assessed_at = '2026-02-21', updated_at = NOW()
       WHERE employee_id = $7`,
      [tScore, sScore, dScore, cScore, kScore, lScore, empId]
    );
    updated++;
    console.log(`  OK: ${csvName} (ID ${empId}) → T:${tScore} S:${sScore} D:${dScore} C:${cScore} K:${kScore} L:${lScore}`);
  }

  // Summary
  const { rows: summary } = await c.query(`
    SELECT COUNT(*) as total,
           COUNT(t_score) as scored,
           COUNT(*) - COUNT(t_score) as pending
    FROM (SELECT DISTINCT ON (employee_id) * FROM employee_competence_assessments ORDER BY employee_id, assessed_at DESC) t
  `);

  console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${notFound} not found`);
  console.log("DB status:", summary[0]);

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
