const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
function loadEnv() { const v={}; for(const f of [".env.development",".env"]){try{fs.readFileSync(path.resolve(__dirname,"..",f),"utf-8").split("\n").forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m&&!v[m[1]])v[m[1]]=m[2].trim();})}catch{}} return v; }

async function main() {
  const c = new Client({ connectionString: loadEnv().DATABASE_URL });
  await c.connect();

  // 员工ID映射
  const userMap = {};
  const users = await c.query('SELECT id, "openId" FROM users');
  users.rows.forEach(u => { userMap[u.openId] = u.id; });

  const projects = [
    // 事业一部 (BU1)
    { code:"GRT-PRJ-2026-001", name:"博世CVJ清洗线", bu:"BU1", manager:"GRT004", status:"active", phase:"M6", budget:4500000, customer:"博世汽车" },
    { code:"GRT-PRJ-2026-002", name:"伊顿齿轴清洗线", bu:"BU1", manager:"GRT004", status:"active", phase:"M4", budget:3800000, customer:"伊顿液压" },
    { code:"GRT-PRJ-2026-003", name:"美利信铝压铸清洗", bu:"BU1", manager:"GRT004", status:"active", phase:"M3", budget:2200000, customer:"美利信科技" },
    { code:"GRT-PRJ-2026-004", name:"比亚迪电池壳清洗", bu:"BU1", manager:"GRT030", status:"active", phase:"M2", budget:5600000, customer:"比亚迪" },
    { code:"GRT-PRJ-2026-012", name:"Bosch US清洗线(北美)", bu:"BU1", manager:"GRT004", status:"active", phase:"M3", budget:7200000, customer:"Bosch US" },
    { code:"GRT-PRJ-2026-013", name:"Eaton EU清洗线(欧洲)", bu:"BU1", manager:"GRT004", status:"draft", phase:"M0", budget:5500000, customer:"Eaton EU" },

    // 事业二部 (BU2)
    { code:"GRT-PRJ-2026-005", name:"采埃孚变速箱清洗", bu:"BU2", manager:"GRT006", status:"active", phase:"M5", budget:4200000, customer:"采埃孚" },
    { code:"GRT-PRJ-2026-006", name:"宁德时代模组清洗", bu:"BU2", manager:"GRT006", status:"active", phase:"M3", budget:3100000, customer:"宁德时代" },

    // 事业三部 (BU3) — 周辉管理
    { code:"GRT-PRJ-2026-007", name:"查特超声清洗设备", bu:"BU3", manager:"GRT058", status:"completed", phase:"M12", budget:1800000, customer:"查特工业" },
    { code:"GRT-PRJ-2026-008", name:"伊洛美克动力总成", bu:"BU3", manager:"GRT058", status:"active", phase:"M7", budget:6500000, customer:"伊洛美克" },
    { code:"GRT-PRJ-2026-009", name:"大众汽车缸体清洗", bu:"BU3", manager:"GRT058", status:"active", phase:"M4", budget:4800000, customer:"大众汽车" },
    { code:"GRT-PRJ-2026-010", name:"吉利汽车齿轮清洗", bu:"BU3", manager:"GRT045", status:"active", phase:"M2", budget:2900000, customer:"吉利汽车" },
    { code:"GRT-PRJ-2026-014", name:"上汽通用清洗产线", bu:"BU3", manager:"GRT058", status:"draft", phase:"M1", budget:3500000, customer:"上汽通用" },

    // 事业十部 (BU10)
    { code:"GRT-PRJ-2026-011", name:"半导体晶圆清洗", bu:"BU10", manager:"GRT008", status:"draft", phase:"M0", budget:8000000, customer:"华虹半导体" },

    // 公司级/系统 (HQ)
    { code:"GRT-PRJ-SYS-001", name:"GRT System数字化平台", bu:"HQ", manager:"GRT049", status:"active", phase:"M6", budget:0, customer:"内部" },
    { code:"GRT-PRJ-SYS-002", name:"美国公司系统部署", bu:"HQ", manager:"GRT049", status:"active", phase:"M2", budget:0, customer:"GRT US" },
  ];

  let ok = 0;
  for (const p of projects) {
    const mgrId = userMap[p.manager] || null;
    try {
      await c.query(`INSERT INTO projects ("projectCode", name, bu_code, "managerId", status, "currentPhase", budget, description, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT DO NOTHING`,
        [p.code, p.name, p.bu, mgrId, p.status, p.phase, p.budget, `客户:${p.customer}`]);
      ok++;
    } catch(e) { console.log("ERR " + p.code + ": " + e.message.substring(0,60)); }
  }

  // 给剩余旧项目分配BU
  await c.query(`UPDATE projects SET bu_code = 'HQ' WHERE bu_code IS NULL AND "projectCode" LIKE 'XM%'`);
  await c.query(`UPDATE projects SET bu_code = 'HQ' WHERE bu_code IS NULL`);

  console.log("\nCreated: " + ok + "/" + projects.length);

  // 最终统计
  const stats = await c.query(`SELECT bu_code, COUNT(*) as cnt FROM projects GROUP BY bu_code ORDER BY bu_code`);
  console.log("\n=== 项目分布 ===");
  stats.rows.forEach(r => console.log("  " + (r.bu_code||"NULL").padEnd(8) + r.cnt + "个"));
  const total = await c.query("SELECT COUNT(*) as cnt FROM projects");
  console.log("  TOTAL   " + total.rows[0].cnt + "个");

  // 周辉能看到的项目
  const zhouProjects = await c.query(`SELECT "projectCode", name, status, "currentPhase" FROM projects WHERE bu_code = 'BU3' ORDER BY "projectCode"`);
  console.log("\n=== 周辉(事业三部)项目 ===");
  zhouProjects.rows.forEach(p => console.log("  " + p.projectCode.padEnd(22) + p.name.padEnd(20) + p.status.padEnd(12) + p.currentPhase));

  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
