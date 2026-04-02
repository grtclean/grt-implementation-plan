const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
function loadEnv() { const v={}; for(const f of [".env.development",".env"]){try{fs.readFileSync(path.resolve(__dirname,"..",f),"utf-8").split("\n").forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m&&!v[m[1]])v[m[1]]=m[2].trim();})}catch{}} return v; }

async function main() {
  const c = new Client({ connectionString: loadEnv().DATABASE_URL });
  await c.connect();
  const projId = 118;

  // 1. 团队成员
  const members = [
    [166, "lead", "M0商机主负责人·销售与市场主管·刘坤"],
    [226, "member", "M0商机识别·销售与项目工程师·李柯瑶"],
    [167, "member", "M0商机识别·市场专员·朱文韬"],
  ];
  for (const [uid, role, resp] of members) {
    try {
      await c.query(`INSERT INTO project_team_members ("projectId", "userId", role, responsibility, "joinedAt", status, "createdAt") VALUES ($1,$2,$3,$4,NOW(),$5,NOW())`, [projId, uid, role, resp, "active"]);
      console.log("✅ 团队: " + uid + " " + role);
    } catch(e) { console.log("team " + uid + ": " + e.message.substring(0,60)); }
  }

  // 2. M0阶段
  try {
    await c.query(`INSERT INTO project_stages_v2 (project_id, "stageCode", stage_name, status, owner, planned_start_date, planned_end_date, notes, completion_percent, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
      [projId, "M0", "M0 商机识别与立项", "InProgress", 166,
       "2026-04-01", "2026-05-15",
       "负责人: 刘坤(主导)+李柯瑶+朱文韬\n来源: 理想SQE卜永波\n客户: 爱柯迪10厂厂长李超", 20]);
    console.log("✅ M0阶段创建");
  } catch(e) { console.log("M0: " + e.message.substring(0,60)); }

  // 3. M0任务
  const stageR = await c.query(`SELECT id FROM project_stages_v2 WHERE project_id = $1 AND "stageCode" = $2`, [projId, "M0"]);
  const stageId = stageR.rows[0]?.id;
  if (stageId) {
    const tasks = [
      ["确认客户联系人姓名(李超vs李昌)", "刘坤", "2026-04-05"],
      ["通过卜永波安排首次拜访", "刘坤", "2026-04-10"],
      ["收集爱柯迪清洗需求(工艺/产线/产能)", "李柯瑶", "2026-04-15"],
      ["准备铝压铸清洗技术方案初稿", "朱文韬", "2026-04-20"],
      ["首次客户拜访+需求确认", "刘坤", "2026-04-25"],
      ["编写M0立项报告", "李柯瑶", "2026-05-01"],
      ["M0→M1阶段评审", "刘坤", "2026-05-15"],
    ];
    let order = 1;
    for (const [name, assignee, due] of tasks) {
      await c.query(`INSERT INTO project_stage_tasks (stage_id, project_id, task_name, assignee, status, due_date, sort_order, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
        [stageId, projId, name, assignee, "pending", due, order++]);
    }
    console.log("✅ M0任务: " + tasks.length + "个");
  }

  // 验证
  const team = await c.query(`SELECT "userId", role, responsibility FROM project_team_members WHERE "projectId" = $1`, [projId]);
  console.log("\n=== 爱柯迪项目团队 ===");
  team.rows.forEach(r => console.log("  #" + r.userId + " " + r.role + ": " + r.responsibility));
  const taskList = await c.query(`SELECT task_name, assignee, due_date FROM project_stage_tasks WHERE project_id = $1 ORDER BY sort_order`, [projId]);
  console.log("\n=== M0任务清单 ===");
  taskList.rows.forEach(t => console.log("  " + t.assignee.padEnd(6) + " " + new Date(t.due_date).toISOString().substring(0,10) + " " + t.task_name));

  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
