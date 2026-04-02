/**
 * 简道云 → GRT System 直接迁移脚本（不依赖GRT服务器）
 * 直接调用简道云API + 写入PostgreSQL数据库
 *
 * 用法:
 *   node scripts/jdy-direct-migrate.cjs                     # 全量迁移
 *   node scripts/jdy-direct-migrate.cjs --phase org         # 仅组织同步
 *   node scripts/jdy-direct-migrate.cjs --phase discovery   # 仅表单发现
 *   node scripts/jdy-direct-migrate.cjs --dry-run           # 预演
 *   node scripts/jdy-direct-migrate.cjs --verify            # 仅校验
 */

const https = require("https");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// ── 读取环境变量 ──────────────────────────────────────────
function loadEnv() {
  const envFiles = [".env.development", ".env"];
  const vars = {};
  for (const f of envFiles) {
    try {
      const content = fs.readFileSync(path.resolve(__dirname, "..", f), "utf-8");
      for (const line of content.split("\n")) {
        const m = line.match(/^([A-Z_]+[A-Z0-9_]*)=(.*)$/);
        if (m && !vars[m[1]]) vars[m[1]] = m[2].trim();
      }
    } catch {}
  }
  return vars;
}

const ENV = loadEnv();
const API_KEY = ENV.EXT_SYNC_API_KEY || ENV.JIANDAOYUN_API_KEY;
const CORP_ID = ENV.EXT_SYNC_CORP_ID || ENV.JIANDAOYUN_CORP_ID;
const DB_URL = ENV.DATABASE_URL;

// ── CLI参数 ──────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--phase" && args[i + 1]) { flags.phases = args[i + 1].split(","); i++; }
  else if (args[i] === "--dry-run") flags.dryRun = true;
  else if (args[i] === "--verify") flags.verifyOnly = true;
}

const ALL_PHASES = ["org", "user", "discovery"];

// ── 简道云API ──────────────────────────────────────────
function jdyApi(apiPath, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params);
    const req = https.request({
      hostname: "api.jiandaoyun.com",
      path: apiPath,
      method: "POST",
      headers: {
        Authorization: "Bearer " + API_KEY,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        if (!raw) { resolve(null); return; }
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error(`API parse error (${res.statusCode}): ${raw.substring(0, 200)}`)); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── 格式化 ──────────────────────────────────────────────
function log(tag, msg) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`  [${ts}] ${tag.padEnd(6)} ${msg}`);
}
function section(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
}

// ── Phase 1: 组织同步 ──────────────────────────────────
async function phaseOrg(db, dryRun) {
  section("Phase 1: 组织架构同步");
  const stats = { deptCreated: 0, deptUpdated: 0, memberCreated: 0, memberUpdated: 0, roleCreated: 0, roleUpdated: 0 };

  // 1a. 部门
  log("INFO", "拉取部门列表...");
  const deptResp = await jdyApi("/api/v5/corp/department/list", { dept_no: 1, has_child: true });
  const depts = deptResp?.departments || [];
  log("OK", `获取 ${depts.length} 个部门`);

  // Ensure table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS jiandaoyun_dept_mappings (
      id SERIAL PRIMARY KEY,
      jdy_dept_no INTEGER UNIQUE,
      jdy_dept_name TEXT,
      jdy_parent_no INTEGER,
      jdy_dept_type INTEGER DEFAULT 0,
      jdy_dept_status INTEGER DEFAULT 1,
      grt_dept_id INTEGER,
      "syncStatus" TEXT DEFAULT 'synced',
      last_sync_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  for (const dept of depts) {
    if (dryRun) { stats.deptCreated++; continue; }
    const existing = await db.query("SELECT id FROM jiandaoyun_dept_mappings WHERE jdy_dept_no = $1", [dept.dept_no]);
    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE jiandaoyun_dept_mappings SET jdy_dept_name=$1, jdy_parent_no=$2, jdy_dept_status=$3, last_sync_at=NOW(), updated_at=NOW() WHERE jdy_dept_no=$4`,
        [dept.name, dept.parent_no, dept.status || 1, dept.dept_no]
      );
      stats.deptUpdated++;
    } else {
      await db.query(
        `INSERT INTO jiandaoyun_dept_mappings (jdy_dept_no, jdy_dept_name, jdy_parent_no, jdy_dept_type, jdy_dept_status) VALUES ($1,$2,$3,$4,$5)`,
        [dept.dept_no, dept.name, dept.parent_no, dept.type || 0, dept.status || 1]
      );
      stats.deptCreated++;
    }
  }
  log("OK", `部门: 新增 ${stats.deptCreated}, 更新 ${stats.deptUpdated}`);

  // 1b. 成员
  log("INFO", "拉取成员列表...");
  let allMembers = [];
  let skip = 0;
  while (true) {
    const r = await jdyApi("/api/v5/corp/department/user/list", { dept_no: 1, has_child: true, limit: 100, skip });
    if (!r?.users || r.users.length === 0) break;
    allMembers = allMembers.concat(r.users);
    if (r.users.length < 100) break;
    skip += 100;
  }
  // Deduplicate
  const seen = new Set();
  allMembers = allMembers.filter((m) => { if (seen.has(m.username)) return false; seen.add(m.username); return true; });
  log("OK", `获取 ${allMembers.length} 名成员`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS jiandaoyun_user_mappings (
      id SERIAL PRIMARY KEY,
      jdy_username TEXT UNIQUE,
      jdy_name TEXT,
      jdy_departments JSONB,
      jdy_status INTEGER DEFAULT 1,
      jdy_integrate_id TEXT,
      grt_user_id INTEGER,
      grt_open_id TEXT,
      "syncStatus" TEXT DEFAULT 'synced',
      last_sync_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  for (const m of allMembers) {
    if (dryRun) { stats.memberCreated++; continue; }
    const existing = await db.query("SELECT id FROM jiandaoyun_user_mappings WHERE jdy_username = $1", [m.username]);
    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE jiandaoyun_user_mappings SET jdy_name=$1, jdy_departments=$2, jdy_status=$3, last_sync_at=NOW(), updated_at=NOW() WHERE jdy_username=$4`,
        [m.name, JSON.stringify(m.departments), m.status || 1, m.username]
      );
      stats.memberUpdated++;
    } else {
      await db.query(
        `INSERT INTO jiandaoyun_user_mappings (jdy_username, jdy_name, jdy_departments, jdy_status, jdy_integrate_id) VALUES ($1,$2,$3,$4,$5)`,
        [m.username, m.name, JSON.stringify(m.departments), m.status || 1, m.integrate_id || null]
      );
      stats.memberCreated++;
    }
  }
  log("OK", `成员: 新增 ${stats.memberCreated}, 更新 ${stats.memberUpdated}`);

  // 1c. 角色
  log("INFO", "拉取角色列表...");
  const roleResp = await jdyApi("/api/v5/corp/role/list", {});
  const roles = roleResp?.roles || [];
  log("OK", `获取 ${roles.length} 个角色`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS jiandaoyun_role_mappings (
      id SERIAL PRIMARY KEY,
      jdy_role_no INTEGER UNIQUE,
      jdy_group_no INTEGER,
      jdy_role_name TEXT,
      jdy_role_type INTEGER DEFAULT 0,
      jdy_role_status INTEGER DEFAULT 1,
      grt_role_id TEXT,
      grt_role_name TEXT,
      permission_mapping JSONB,
      "syncStatus" TEXT DEFAULT 'synced',
      last_sync_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  for (const role of roles) {
    if (dryRun) { stats.roleCreated++; continue; }
    const existing = await db.query("SELECT id FROM jiandaoyun_role_mappings WHERE jdy_role_no = $1", [role.role_no]);
    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE jiandaoyun_role_mappings SET jdy_role_name=$1, jdy_group_no=$2, jdy_role_status=$3, last_sync_at=NOW() WHERE jdy_role_no=$4`,
        [role.name, role.group_no, role.status || 1, role.role_no]
      );
      stats.roleUpdated++;
    } else {
      await db.query(
        `INSERT INTO jiandaoyun_role_mappings (jdy_role_no, jdy_group_no, jdy_role_name, jdy_role_type, jdy_role_status) VALUES ($1,$2,$3,$4,$5)`,
        [role.role_no, role.group_no, role.name, role.type || 0, role.status || 1]
      );
      stats.roleCreated++;
    }
  }
  log("OK", `角色: 新增 ${stats.roleCreated}, 更新 ${stats.roleUpdated}`);

  return stats;
}

// ── Phase 2: 用户关联 ──────────────────────────────────
async function phaseUser(db, dryRun) {
  section("Phase 2: 用户关联（简道云→GRT）");
  const stats = { linked: 0, alreadyLinked: 0, noMatch: 0 };

  // Get all JDY users without GRT link
  const jdyUsers = await db.query(
    `SELECT id, jdy_username, jdy_name FROM jiandaoyun_user_mappings WHERE grt_user_id IS NULL`
  );
  log("INFO", `${jdyUsers.rows.length} 名用户待关联`);

  for (const jdy of jdyUsers.rows) {
    // Try to match by name or openId in GRT users table
    const grtUser = await db.query(
      `SELECT id, "openId", name FROM users WHERE name = $1 OR "openId" = $2 LIMIT 1`,
      [jdy.jdy_name, jdy.jdy_username]
    );

    if (grtUser.rows.length > 0) {
      if (!dryRun) {
        await db.query(
          `UPDATE jiandaoyun_user_mappings SET grt_user_id=$1, "syncStatus"='synced', updated_at=NOW() WHERE id=$2`,
          [grtUser.rows[0].id, jdy.id]
        );
      }
      stats.linked++;
      log("LINK", `${jdy.jdy_name} → GRT #${grtUser.rows[0].id} (${grtUser.rows[0].name})`);
    } else {
      stats.noMatch++;
    }
  }

  // Count already linked
  const linked = await db.query(`SELECT COUNT(*) as cnt FROM jiandaoyun_user_mappings WHERE grt_user_id IS NOT NULL`);
  stats.alreadyLinked = parseInt(linked.rows[0].cnt);

  log("OK", `新关联 ${stats.linked}, 已关联 ${stats.alreadyLinked}, 未匹配 ${stats.noMatch}`);
  if (stats.noMatch > 0) {
    const unmatched = await db.query(
      `SELECT jdy_username, jdy_name FROM jiandaoyun_user_mappings WHERE grt_user_id IS NULL ORDER BY jdy_name LIMIT 20`
    );
    log("INFO", "未匹配用户:");
    unmatched.rows.forEach((u) => console.log(`    ${u.jdy_name} (${u.jdy_username})`));
  }

  return stats;
}

// ── Phase 3: 表单发现 ──────────────────────────────────
async function phaseDiscovery(db, dryRun) {
  section("Phase 3: 表单发现与分类");
  const stats = { appsScanned: 0, formsDiscovered: 0, formsClassified: 0, formsNew: 0, formsUpdated: 0 };

  // Table already exists via Drizzle migration — skip CREATE

  // Get all apps
  log("INFO", "拉取应用列表...");
  let allApps = [];
  let skip = 0;
  while (true) {
    const r = await jdyApi("/api/v5/app/list", { limit: 100, skip });
    if (!r?.apps || r.apps.length === 0) break;
    allApps = allApps.concat(r.apps);
    if (r.apps.length < 100) break;
    skip += 100;
  }
  log("OK", `${allApps.length} 个应用`);

  // Classification rules
  const classifyForm = (appName, formName) => {
    const combined = appName + " " + formName;
    if (/项目立项|项目总览|项目计划|项目管理/.test(combined)) return "project";
    if (/客户管理|联系人|跟进记录|商机/.test(combined)) return "crmCustomer";
    if (/销售订单|报价单|开票/.test(combined)) return "salesOrder";
    if (/采购申请|采购订单|采购入库|采购退货/.test(combined)) return "purchaseOrder";
    if (/供应商/.test(combined)) return "supplier";
    if (/入库|出库|库存|仓库|调拨/.test(combined)) return "inventory";
    if (/员工档案|入职|转正|离职|岗位调动/.test(combined)) return "hrmEmployee";
    if (/招聘|简历|面试|offer/.test(combined)) return "hrmRecruitment";
    if (/考勤|打卡|请假|加班|调休|出差/.test(combined)) return "hrmAttendance";
    if (/工资|薪资|五险一金|个人所得税/.test(combined)) return "hrmPayroll";
    if (/绩效|考核|指标/.test(combined)) return "hrmPerformance";
    if (/会议|会议室/.test(combined)) return "meeting";
    if (/费用报销|付款|收款|发票|对账/.test(combined)) return "finance";
    if (/生产工单|生产任务|生产报工|生产入库|生产计划/.test(combined)) return "productionOrder";
    if (/BOM|物料|产品信息|产品BOM/.test(combined)) return "bom";
    if (/工艺路线|工序/.test(combined)) return "process";
    if (/日报|周报|公告/.test(combined)) return "communication";
    if (/合同/.test(combined)) return "contract";
    if (/任务管理|任务验收/.test(combined)) return "task";
    if (/车辆|用车|油卡|加油/.test(combined)) return "fleet";
    if (/物品|办公用品/.test(combined)) return "assets";
    if (/印章|用印/.test(combined)) return "seal";
    if (/售后|现场问题|驻场|清洁度/.test(combined)) return "afterSales";
    if (/工时/.test(combined)) return "laborHours";
    if (/回款/.test(combined)) return "receivable";
    if (/检验|8D|质量/.test(combined)) return "quality";
    if (/说明|必看|辅助/.test(formName)) return "reference";
    return null;
  };

  // Scan each app
  for (const app of allApps) {
    // Skip personal exercise apps
    if (/个人练习|个人测试|个人作业|personal|测试员/.test(app.name)) continue;

    const r = await jdyApi("/api/v5/app/entry/list", { app_id: app.app_id });
    const forms = r?.forms || [];
    if (forms.length === 0) continue;

    stats.appsScanned++;
    log("SCAN", `${app.name}: ${forms.length} forms`);

    for (const form of forms) {
      stats.formsDiscovered++;
      const entity = classifyForm(app.name, form.name);
      if (entity) stats.formsClassified++;

      if (dryRun) { stats.formsNew++; continue; }

      const existing = await db.query(
        "SELECT id FROM jiandaoyun_form_mappings WHERE jdy_app_id=$1 AND jdy_form_id=$2",
        [app.app_id, form.entry_id]
      );
      if (existing.rows.length > 0) {
        await db.query(
          `UPDATE jiandaoyun_form_mappings SET jdy_app_name=$1, jdy_form_name=$2, target_entity=$3, last_discovered_at=NOW(), updated_at=NOW()
           WHERE jdy_app_id=$4 AND jdy_form_id=$5`,
          [app.name, form.name, entity, app.app_id, form.entry_id]
        );
        stats.formsUpdated++;
      } else {
        await db.query(
          `INSERT INTO jiandaoyun_form_mappings (jdy_app_id, jdy_app_name, jdy_form_id, jdy_form_name, target_entity, is_confirmed)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [app.app_id, app.name, form.entry_id, form.name, entity, entity ? true : false]
        );
        stats.formsNew++;
      }
    }

    // Rate limit: 30 req/s max, be conservative
    await new Promise((r) => setTimeout(r, 200));
  }

  log("OK", `应用扫描 ${stats.appsScanned}, 表单发现 ${stats.formsDiscovered}, 已分类 ${stats.formsClassified}, 新增 ${stats.formsNew}, 更新 ${stats.formsUpdated}`);
  return stats;
}

// ── 校验 ──────────────────────────────────────────────
async function verify(db) {
  section("数据完整性校验");

  const queries = [
    ["部门映射", "SELECT COUNT(*) as cnt FROM jiandaoyun_dept_mappings"],
    ["成员映射", "SELECT COUNT(*) as cnt FROM jiandaoyun_user_mappings"],
    ["已关联用户", "SELECT COUNT(*) as cnt FROM jiandaoyun_user_mappings WHERE grt_user_id IS NOT NULL"],
    ["未关联用户", "SELECT COUNT(*) as cnt FROM jiandaoyun_user_mappings WHERE grt_user_id IS NULL"],
    ["角色映射", "SELECT COUNT(*) as cnt FROM jiandaoyun_role_mappings"],
    ["表单映射", "SELECT COUNT(*) as cnt FROM jiandaoyun_form_mappings"],
    ["已分类表单", "SELECT COUNT(*) as cnt FROM jiandaoyun_form_mappings WHERE target_entity IS NOT NULL"],
    ["未分类表单", "SELECT COUNT(*) as cnt FROM jiandaoyun_form_mappings WHERE target_entity IS NULL"],
    ["GRT用户总数", "SELECT COUNT(*) as cnt FROM users"],
  ];

  console.log("\n  ┌─────────────────────┬──────────┐");
  console.log("  │ 数据项              │ 数量     │");
  console.log("  ├─────────────────────┼──────────┤");

  for (const [label, sql] of queries) {
    try {
      const r = await db.query(sql);
      const cnt = r.rows[0]?.cnt || 0;
      console.log(`  │ ${label.padEnd(19)} │ ${String(cnt).padStart(8)} │`);
    } catch {
      console.log(`  │ ${label.padEnd(19)} │ ${"N/A".padStart(8)} │`);
    }
  }
  console.log("  └─────────────────────┴──────────┘");

  // Show classification breakdown
  try {
    const breakdown = await db.query(
      `SELECT target_entity, COUNT(*) as cnt FROM jiandaoyun_form_mappings
       WHERE target_entity IS NOT NULL GROUP BY target_entity ORDER BY cnt DESC`
    );
    if (breakdown.rows.length > 0) {
      console.log("\n  表单分类统计:");
      breakdown.rows.forEach((r) => {
        console.log(`    ${(r.target_entity || "unclassified").padEnd(22)} ${r.cnt}`);
      });
    }
  } catch {}
}

// ── 主流程 ──────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  简道云 → GRT System 直接迁移 (DB模式)                 ║");
  console.log("║  版本: 2.0  日期: 2026-03-30                           ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  if (!API_KEY) { console.error("ERROR: JIANDAOYUN_API_KEY 未配置"); process.exit(1); }
  if (!DB_URL) { console.error("ERROR: DATABASE_URL 未配置"); process.exit(1); }

  log("INFO", `API Key: ${API_KEY.substring(0, 8)}...`);
  log("INFO", `Database: ${DB_URL.replace(/:[^:@]+@/, ":***@")}`);
  if (flags.dryRun) log("WARN", "预演模式 — 不写入数据");

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  log("OK", "数据库已连接");

  try {
    if (flags.verifyOnly) {
      await verify(db);
      return;
    }

    const phases = flags.phases || ALL_PHASES;
    const results = {};

    for (const phase of phases) {
      switch (phase) {
        case "org":
          results.org = await phaseOrg(db, flags.dryRun);
          break;
        case "user":
          results.user = await phaseUser(db, flags.dryRun);
          break;
        case "discovery":
          results.discovery = await phaseDiscovery(db, flags.dryRun);
          break;
        default:
          log("WARN", `未知阶段: ${phase}`);
      }
    }

    // Final verification
    await verify(db);

    // Summary
    section("迁移报告");
    for (const [phase, r] of Object.entries(results)) {
      console.log(`  ${phase}: ${JSON.stringify(r)}`);
    }
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
