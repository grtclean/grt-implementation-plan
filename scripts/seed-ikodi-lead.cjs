const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
function loadEnv() { const v={}; for(const f of [".env.development",".env"]){try{fs.readFileSync(path.resolve(__dirname,"..",f),"utf-8").split("\n").forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m&&!v[m[1]])v[m[1]]=m[2].trim();})}catch{}} return v; }

async function main() {
  const c = new Client({ connectionString: loadEnv().DATABASE_URL });
  await c.connect();

  // 1. 商机线索
  await c.query(`INSERT INTO leads (customer_name, contact_name, contact_phone, company_name, source, status, priority, estimated_amount, assigned_to, notes, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
    ["爱柯迪股份有限公司", "李超(可能李昌)·10厂厂长", "", "爱柯迪",
     "理想SQE卜永波推荐", "qualified", "high", 5000000, 166,
     "战略客户·铝压铸行业·刘坤主导·李柯瑶+朱文韬参与·来源:理想资深SQE卜永波(15826650779)"]);
  console.log("✅ 商机: 爱柯迪 → 刘坤(GRT083)");

  // 2. 更新项目描述+团队
  await c.query(`UPDATE projects SET description = $1, "managerId" = $2 WHERE "projectCode" = $3`,
    ["战略客户·来源:理想SQE卜永波(15826650779)·10厂厂长李超(可能李昌)\n\n商机识别团队:\n  主负责: 刘坤(GRT083) 销售与市场主管\n  参与: 李柯瑶(GRT093) 销售与项目工程师\n  参与: 朱文韬(GRT103) 市场专员\n\n下一步: 通过卜永波安排首次拜访→需求调研→M1概念方案",
     166, "GRT-PRJ-2026-015"]);
  console.log("✅ 项目更新: 刘坤为PM + 团队描述");

  // 3. 项目团队成员
  try {
    const members = [[166,"project_manager"],[226,"sales_engineer"],[167,"market_specialist"]];
    for (const [uid, role] of members) {
      await c.query(`INSERT INTO project_team_members (project_id, user_id, role, created_at, updated_at) VALUES (118, $1, $2, NOW(), NOW())`, [uid, role]);
    }
    console.log("✅ 团队成员: 刘坤+李柯瑶+朱文韬");
  } catch(e) { console.log("team: " + e.message.substring(0,60)); }

  // Verify
  const v = await c.query("SELECT customer_name, assigned_to, notes FROM leads ORDER BY id DESC LIMIT 1");
  console.log("\n客户:", v.rows[0].customer_name);
  console.log("负责人:", v.rows[0].assigned_to, "(刘坤)");
  console.log("备注:", v.rows[0].notes.substring(0,80));

  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
