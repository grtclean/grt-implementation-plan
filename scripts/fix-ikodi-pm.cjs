const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
function loadEnv() { const v={}; for(const f of [".env.development",".env"]){try{fs.readFileSync(path.resolve(__dirname,"..",f),"utf-8").split("\n").forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m&&!v[m[1]])v[m[1]]=m[2].trim();})}catch{}} return v; }

async function main() {
  const c = new Client({ connectionString: loadEnv().DATABASE_URL });
  await c.connect();
  const likeyaoId = 226;

  await c.query(`UPDATE projects SET "managerId" = $1 WHERE "projectCode" = $2`, [likeyaoId, "GRT-PRJ-2026-015"]);
  await c.query(`UPDATE projects_v2 SET pm = $1 WHERE id = 118`, [likeyaoId]);
  await c.query(`UPDATE project_stages_v2 SET owner = $1, planned_start_date = $2, planned_end_date = $3 WHERE project_id = 118 AND "stageCode" = $4`, [likeyaoId, "2026-03-31", "2026-04-15", "M0"]);
  await c.query(`UPDATE project_team_members SET role = $1, responsibility = $2 WHERE "projectId" = 118 AND "userId" = $3`, ["lead", "M0项目负责人·销售与项目工程师·李柯瑶", likeyaoId]);
  await c.query(`UPDATE project_team_members SET role = $1, responsibility = $2 WHERE "projectId" = 118 AND "userId" = $3`, ["member", "M0商机支持·销售与市场主管·刘坤", 166]);
  await c.query(`UPDATE leads SET assigned_to = $1 WHERE customer_name = $2`, [likeyaoId, "爱柯迪股份有限公司"]);

  const p = await c.query(`SELECT "managerId" FROM projects WHERE "projectCode" = $1`, ["GRT-PRJ-2026-015"]);
  const s = await c.query(`SELECT owner, planned_start_date, planned_end_date FROM project_stages_v2 WHERE project_id = 118 AND "stageCode" = $1`, ["M0"]);
  const t = await c.query(`SELECT "userId", role, responsibility FROM project_team_members WHERE "projectId" = 118`);

  console.log("✅ 项目负责人: " + p.rows[0].managerId + " (李柯瑶=226)");
  console.log("✅ M0时间: " + new Date(s.rows[0].planned_start_date).toISOString().substring(0,10) + " → " + new Date(s.rows[0].planned_end_date).toISOString().substring(0,10));
  console.log("✅ 团队:");
  t.rows.forEach(r => console.log("   #" + r.userId + " " + r.role + ": " + r.responsibility));

  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
