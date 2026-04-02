/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  简道云 → GRT System 全量迁移 (Master Script v3.0)          ║
 * ║  Consolidates: direct-migrate + data-import + transform     ║
 * ║               + repair + 7 new entities + validation        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Phases:
 *   1. org       — 组织架构 (部门/成员/角色)
 *   2. discovery — 表单发现 & 自动分类
 *   3. fields    — 拉取表单字段结构
 *   4. cache     — 分批拉取表单数据 → 缓存表
 *   5. transform — 缓存 → GRT 业务表 (26 entities)
 *   6. repair    — 数据修复 + 关系链接 + GRT核心灌入
 *   7. validate  — 全量数据质量校验 & 报告
 *
 * Usage:
 *   node scripts/jdy-master-migrate.cjs                       # 全量 (1-7)
 *   node scripts/jdy-master-migrate.cjs --phase org           # 仅组织同步
 *   node scripts/jdy-master-migrate.cjs --phase cache,transform
 *   node scripts/jdy-master-migrate.cjs --validate            # 仅校验
 *   node scripts/jdy-master-migrate.cjs --dry-run             # 预演
 *   node scripts/jdy-master-migrate.cjs --entity task,finance # 仅转换指定entity
 *   node scripts/jdy-master-migrate.cjs --stats               # 仅统计
 */

const https = require("https");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════════
//  CONFIG & CLI
// ═══════════════════════════════════════════════════════════════

function loadEnv() {
  const vars = {};
  for (const f of [".env.development", ".env"]) {
    try {
      fs.readFileSync(path.resolve(__dirname, "..", f), "utf-8").split("\n").forEach(line => {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !vars[m[1]]) vars[m[1]] = m[2].trim();
      });
    } catch {}
  }
  return vars;
}

const ENV = loadEnv();
const API_KEY = ENV.EXT_SYNC_API_KEY || ENV.JIANDAOYUN_API_KEY;
const DB_URL = ENV.DATABASE_URL;

const ALL_PHASES = ["org", "discovery", "fields", "cache", "transform", "repair", "validate"];
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--phase" && args[i + 1]) { flags.phases = args[i + 1].split(","); i++; }
  else if (args[i] === "--entity" && args[i + 1]) { flags.entities = args[i + 1].split(","); i++; }
  else if (args[i] === "--dry-run") flags.dryRun = true;
  else if (args[i] === "--validate") flags.phases = ["validate"];
  else if (args[i] === "--stats") flags.statsOnly = true;
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function log(tag, msg) { console.log(`  [${new Date().toISOString().substring(11, 19)}] ${tag.padEnd(7)} ${msg}`); }
function section(t) { console.log(`\n${"═".repeat(64)}\n  ${t}\n${"═".repeat(64)}`); }
function str(v, max = 255) { if (v == null) return null; if (typeof v === "object" && v.name) return String(v.name).substring(0, max); return String(v).substring(0, max); }
function num(v) { if (v == null) return null; const n = parseFloat(v); return isNaN(n) ? null : n; }
function dt(v) { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString(); }
function userName(v) { if (!v) return null; return typeof v === "object" ? (v.name || null) : String(v); }
function addr(v) { if (!v) return null; if (typeof v === "string") return v; return [v.province, v.city, v.district, v.detail].filter(Boolean).join(" "); }
function genCode(prefix, id) { return prefix + "-" + (id || "").toString().substring(0, 8).toUpperCase(); }

function resolveRecord(record, fieldSchema) {
  const data = typeof record === "string" ? JSON.parse(record) : record;
  const schema = typeof fieldSchema === "string" ? JSON.parse(fieldSchema) : fieldSchema;
  if (!schema) return data;
  const m = {}; schema.forEach(f => { m[f.id] = f.label; });
  const r = {}; Object.entries(data).forEach(([k, v]) => { r[m[k] || k] = v; });
  return r;
}

// ═══════════════════════════════════════════════════════════════
//  API CLIENT
// ═══════════════════════════════════════════════════════════════

let apiCallCount = 0;
let lastCallTime = 0;

function jdyApi(apiPath, params) {
  apiCallCount++;
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params);
    const req = https.request({
      hostname: "api.jiandaoyun.com", path: apiPath, method: "POST",
      headers: { Authorization: "Bearer " + API_KEY, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        if (!raw) { resolve(null); return; }
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ _error: true, status: res.statusCode, raw: raw.substring(0, 200) }); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function rateLimitedApi(path, params) {
  const now = Date.now();
  if (now - lastCallTime < 50) await new Promise(r => setTimeout(r, 50 - (now - lastCallTime)));
  lastCallTime = Date.now();
  return jdyApi(path, params);
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 1: ORG SYNC (depts / users / roles)
// ═══════════════════════════════════════════════════════════════

async function phaseOrg(db) {
  section("Phase 1: 组织架构同步");
  const stats = { deptCreated: 0, deptUpdated: 0, memberCreated: 0, memberUpdated: 0, roleCreated: 0, roleUpdated: 0 };

  // 1a. Departments
  log("INFO", "拉取部门列表...");
  await db.query(`
    CREATE TABLE IF NOT EXISTS jiandaoyun_dept_mappings (
      id SERIAL PRIMARY KEY, jdy_dept_no INTEGER UNIQUE, jdy_dept_name TEXT,
      jdy_parent_no INTEGER, jdy_dept_type INTEGER DEFAULT 0, jdy_dept_status INTEGER DEFAULT 1,
      grt_dept_id INTEGER, "syncStatus" TEXT DEFAULT 'synced',
      last_sync_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())
  `);

  const deptResp = await jdyApi("/api/v5/corp/department/list", { dept_no: 1, has_child: true });
  const depts = deptResp?.departments || [];
  log("OK", `获取 ${depts.length} 个部门`);

  for (const dept of depts) {
    if (flags.dryRun) { stats.deptCreated++; continue; }
    const existing = await db.query("SELECT id FROM jiandaoyun_dept_mappings WHERE jdy_dept_no=$1", [dept.dept_no]);
    if (existing.rows.length > 0) {
      await db.query("UPDATE jiandaoyun_dept_mappings SET jdy_dept_name=$1,jdy_parent_no=$2,jdy_dept_status=$3,last_sync_at=NOW(),updated_at=NOW() WHERE jdy_dept_no=$4",
        [dept.name, dept.parent_no, dept.status || 1, dept.dept_no]);
      stats.deptUpdated++;
    } else {
      await db.query("INSERT INTO jiandaoyun_dept_mappings (jdy_dept_no,jdy_dept_name,jdy_parent_no,jdy_dept_type,jdy_dept_status) VALUES ($1,$2,$3,$4,$5)",
        [dept.dept_no, dept.name, dept.parent_no, dept.type || 0, dept.status || 1]);
      stats.deptCreated++;
    }
  }
  log("OK", `部门: 新增 ${stats.deptCreated}, 更新 ${stats.deptUpdated}`);

  // 1b. Members (paginated, dedup)
  log("INFO", "拉取成员列表...");
  await db.query(`
    CREATE TABLE IF NOT EXISTS jiandaoyun_user_mappings (
      id SERIAL PRIMARY KEY, jdy_username TEXT UNIQUE, jdy_name TEXT,
      jdy_departments JSONB, jdy_status INTEGER DEFAULT 1, jdy_integrate_id TEXT,
      grt_user_id INTEGER, grt_open_id TEXT, "syncStatus" TEXT DEFAULT 'synced',
      last_sync_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())
  `);

  let allMembers = [], skip = 0;
  while (true) {
    const r = await jdyApi("/api/v5/corp/department/user/list", { dept_no: 1, has_child: true, limit: 100, skip });
    if (!r?.users || r.users.length === 0) break;
    allMembers = allMembers.concat(r.users);
    if (r.users.length < 100) break;
    skip += 100;
  }
  const seen = new Set();
  allMembers = allMembers.filter(m => { if (seen.has(m.username)) return false; seen.add(m.username); return true; });
  log("OK", `获取 ${allMembers.length} 名成员`);

  for (const m of allMembers) {
    if (flags.dryRun) { stats.memberCreated++; continue; }
    const existing = await db.query("SELECT id FROM jiandaoyun_user_mappings WHERE jdy_username=$1", [m.username]);
    if (existing.rows.length > 0) {
      await db.query("UPDATE jiandaoyun_user_mappings SET jdy_name=$1,jdy_departments=$2,jdy_status=$3,last_sync_at=NOW(),updated_at=NOW() WHERE jdy_username=$4",
        [m.name, JSON.stringify(m.departments), m.status || 1, m.username]);
      stats.memberUpdated++;
    } else {
      await db.query("INSERT INTO jiandaoyun_user_mappings (jdy_username,jdy_name,jdy_departments,jdy_status,jdy_integrate_id) VALUES ($1,$2,$3,$4,$5)",
        [m.username, m.name, JSON.stringify(m.departments), m.status || 1, m.integrate_id || null]);
      stats.memberCreated++;
    }
  }
  log("OK", `成员: 新增 ${stats.memberCreated}, 更新 ${stats.memberUpdated}`);

  // 1c. User linking (JDY→GRT)
  log("INFO", "关联用户...");
  const jdyUsers = await db.query("SELECT id,jdy_username,jdy_name FROM jiandaoyun_user_mappings WHERE grt_user_id IS NULL");
  let linked = 0;
  for (const jdy of jdyUsers.rows) {
    const grt = await db.query('SELECT id,name FROM users WHERE name=$1 OR "openId"=$2 LIMIT 1', [jdy.jdy_name, jdy.jdy_username]);
    if (grt.rows.length > 0 && !flags.dryRun) {
      await db.query('UPDATE jiandaoyun_user_mappings SET grt_user_id=$1,"syncStatus"=\'synced\',updated_at=NOW() WHERE id=$2', [grt.rows[0].id, jdy.id]);
      linked++;
    }
  }
  log("OK", `用户关联: ${linked} 新关联`);

  // 1d. Roles
  log("INFO", "拉取角色列表...");
  await db.query(`
    CREATE TABLE IF NOT EXISTS jiandaoyun_role_mappings (
      id SERIAL PRIMARY KEY, jdy_role_no INTEGER UNIQUE, jdy_group_no INTEGER,
      jdy_role_name TEXT, jdy_role_type INTEGER DEFAULT 0, jdy_role_status INTEGER DEFAULT 1,
      grt_role_id TEXT, grt_role_name TEXT, permission_mapping JSONB, "syncStatus" TEXT DEFAULT 'synced',
      last_sync_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())
  `);

  const roleResp = await jdyApi("/api/v5/corp/role/list", {});
  const roles = roleResp?.roles || [];
  for (const role of roles) {
    if (flags.dryRun) { stats.roleCreated++; continue; }
    const existing = await db.query("SELECT id FROM jiandaoyun_role_mappings WHERE jdy_role_no=$1", [role.role_no]);
    if (existing.rows.length > 0) {
      await db.query("UPDATE jiandaoyun_role_mappings SET jdy_role_name=$1,jdy_group_no=$2,jdy_role_status=$3,last_sync_at=NOW() WHERE jdy_role_no=$4",
        [role.name, role.group_no, role.status || 1, role.role_no]);
      stats.roleUpdated++;
    } else {
      await db.query("INSERT INTO jiandaoyun_role_mappings (jdy_role_no,jdy_group_no,jdy_role_name,jdy_role_type,jdy_role_status) VALUES ($1,$2,$3,$4,$5)",
        [role.role_no, role.group_no, role.name, role.type || 0, role.status || 1]);
      stats.roleCreated++;
    }
  }
  log("OK", `角色: ${roles.length} (新增 ${stats.roleCreated}, 更新 ${stats.roleUpdated})`);
  return stats;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 2: FORM DISCOVERY & CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

function classifyForm(appName, formName) {
  const c = appName + " " + formName;
  if (/项目立项|项目总览|项目计划|项目管理/.test(c)) return "project";
  if (/客户管理|联系人|跟进记录|商机/.test(c)) return "crmCustomer";
  if (/销售订单|报价单|开票/.test(c)) return "salesOrder";
  if (/采购申请|采购订单|采购入库|采购退货/.test(c)) return "purchaseOrder";
  if (/供应商/.test(c)) return "supplier";
  if (/入库|出库|库存|仓库|调拨/.test(c)) return "inventory";
  if (/员工档案|入职|转正|离职|岗位调动/.test(c)) return "hrmEmployee";
  if (/招聘|简历|面试|offer/.test(c)) return "hrmRecruitment";
  if (/考勤|打卡|请假|加班|调休|出差/.test(c)) return "hrmAttendance";
  if (/工资|薪资|五险一金|个人所得税/.test(c)) return "hrmPayroll";
  if (/绩效|考核|指标/.test(c)) return "hrmPerformance";
  if (/会议|会议室/.test(c)) return "meeting";
  if (/费用报销|付款|收款|发票|对账/.test(c)) return "finance";
  if (/生产工单|生产任务|生产报工|生产入库|生产计划/.test(c)) return "productionOrder";
  if (/BOM|物料|产品信息|产品BOM/.test(c)) return "bom";
  if (/工艺路线|工序/.test(c)) return "process";
  if (/日报|周报|公告/.test(c)) return "communication";
  if (/合同/.test(c)) return "contract";
  if (/任务管理|任务验收/.test(c)) return "task";
  if (/车辆|用车|油卡|加油/.test(c)) return "fleet";
  if (/物品|办公用品/.test(c)) return "assets";
  if (/印章|用印/.test(c)) return "seal";
  if (/售后|现场问题|驻场|清洁度/.test(c)) return "afterSales";
  if (/工时/.test(c)) return "laborHours";
  if (/回款/.test(c)) return "receivable";
  if (/检验|8D|质量/.test(c)) return "quality";
  if (/说明|必看|辅助/.test(formName)) return "reference";
  return null;
}

async function phaseDiscovery(db) {
  section("Phase 2: 表单发现与分类");
  const stats = { appsScanned: 0, formsDiscovered: 0, formsClassified: 0, formsNew: 0, formsUpdated: 0 };

  await db.query(`
    CREATE TABLE IF NOT EXISTS jiandaoyun_form_mappings (
      id SERIAL PRIMARY KEY, jdy_app_id TEXT, jdy_app_name TEXT,
      jdy_form_id TEXT, jdy_form_name TEXT, target_entity TEXT,
      field_schema JSONB, record_count INTEGER DEFAULT 0,
      is_confirmed BOOLEAN DEFAULT false, last_discovered_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(jdy_app_id, jdy_form_id))
  `);

  log("INFO", "拉取应用列表...");
  let allApps = [], skip = 0;
  while (true) {
    const r = await jdyApi("/api/v5/app/list", { limit: 100, skip });
    if (!r?.apps || r.apps.length === 0) break;
    allApps = allApps.concat(r.apps);
    if (r.apps.length < 100) break;
    skip += 100;
  }
  log("OK", `${allApps.length} 个应用`);

  for (const app of allApps) {
    if (/个人练习|个人测试|个人作业|personal|测试员/.test(app.name)) continue;
    const r = await jdyApi("/api/v5/app/entry/list", { app_id: app.app_id });
    const forms = r?.forms || [];
    if (forms.length === 0) continue;
    stats.appsScanned++;

    for (const form of forms) {
      stats.formsDiscovered++;
      const entity = classifyForm(app.name, form.name);
      if (entity) stats.formsClassified++;
      if (flags.dryRun) { stats.formsNew++; continue; }

      const existing = await db.query("SELECT id FROM jiandaoyun_form_mappings WHERE jdy_app_id=$1 AND jdy_form_id=$2", [app.app_id, form.entry_id]);
      if (existing.rows.length > 0) {
        await db.query("UPDATE jiandaoyun_form_mappings SET jdy_app_name=$1,jdy_form_name=$2,target_entity=$3,last_discovered_at=NOW(),updated_at=NOW() WHERE jdy_app_id=$4 AND jdy_form_id=$5",
          [app.name, form.name, entity, app.app_id, form.entry_id]);
        stats.formsUpdated++;
      } else {
        await db.query("INSERT INTO jiandaoyun_form_mappings (jdy_app_id,jdy_app_name,jdy_form_id,jdy_form_name,target_entity,is_confirmed) VALUES ($1,$2,$3,$4,$5,$6)",
          [app.app_id, app.name, form.entry_id, form.name, entity, entity ? true : false]);
        stats.formsNew++;
      }
    }
    await new Promise(r => setTimeout(r, 200));
  }
  log("OK", `应用 ${stats.appsScanned}, 表单 ${stats.formsDiscovered}, 已分类 ${stats.formsClassified}, 新增 ${stats.formsNew}, 更新 ${stats.formsUpdated}`);
  return stats;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 3: FIELD SCHEMA PULL
// ═══════════════════════════════════════════════════════════════

async function phaseFields(db) {
  section("Phase 3: 拉取表单字段结构");
  const formsResult = await db.query(
    "SELECT id,jdy_app_id,jdy_form_id FROM jiandaoyun_form_mappings WHERE target_entity IS NOT NULL AND (field_schema IS NULL OR field_schema::text='null')"
  );
  const forms = formsResult.rows;
  log("INFO", `${forms.length} forms need field schema`);
  let updated = 0, failed = 0;

  for (let i = 0; i < forms.length; i++) {
    try {
      const resp = await rateLimitedApi("/api/v5/app/entry/widget/list", { app_id: forms[i].jdy_app_id, entry_id: forms[i].jdy_form_id });
      if (resp?.widgets) {
        const schema = resp.widgets.map(w => ({ id: w.name, label: w.label, type: w.type }));
        await db.query("UPDATE jiandaoyun_form_mappings SET field_schema=$1,updated_at=NOW() WHERE id=$2", [JSON.stringify(schema), forms[i].id]);
        updated++;
      } else failed++;
    } catch { failed++; }
    if ((i + 1) % 50 === 0) log("PROG", `${i + 1}/${forms.length}`);
  }
  log("OK", `字段结构: 更新 ${updated}, 失败 ${failed}, 跳过 ${forms.length - updated - failed}`);
  return { updated, failed };
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 4: DATA CACHE (pull form records)
// ═══════════════════════════════════════════════════════════════

async function phaseCache(db) {
  section("Phase 4: 分批拉取表单数据 → 缓存");

  await db.query(`
    CREATE TABLE IF NOT EXISTS jiandaoyun_form_data_cache (
      id SERIAL PRIMARY KEY, jdy_app_id TEXT NOT NULL, jdy_form_id TEXT NOT NULL,
      jdy_record_id TEXT NOT NULL, record_data JSONB NOT NULL,
      target_entity TEXT, jdy_form_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(jdy_app_id, jdy_form_id, jdy_record_id))
  `);
  await db.query("CREATE INDEX IF NOT EXISTS idx_cache_entity ON jiandaoyun_form_data_cache (target_entity)");

  let whereClause = "WHERE target_entity IS NOT NULL AND target_entity NOT IN ('personalExercise','systemReference','systemIntegration','miscellaneous','thirdPartyHR','reference','aiPlugin')";
  const params = [];
  if (flags.entities) { whereClause += " AND target_entity = ANY($1)"; params.push(flags.entities); }

  const formsResult = await db.query(
    `SELECT id,jdy_app_id,jdy_app_name,jdy_form_id,jdy_form_name,target_entity,field_schema,record_count FROM jiandaoyun_form_mappings ${whereClause} ORDER BY target_entity`,
    params
  );
  const forms = formsResult.rows;
  log("INFO", `${forms.length} forms to cache`);

  let totalRecords = 0, totalForms = 0, totalErrors = 0;
  const entityGroups = {};
  for (const f of forms) { const e = f.target_entity; if (!entityGroups[e]) entityGroups[e] = []; entityGroups[e].push(f); }

  for (const [entity, entityForms] of Object.entries(entityGroups)) {
    let entityRecords = 0;
    for (const f of entityForms) {
      try {
        let dataId = undefined, formRecords = 0, pageCount = 0;
        while (true) {
          const params = { app_id: f.jdy_app_id, entry_id: f.jdy_form_id, limit: 100 };
          if (dataId) params.data_id = dataId;
          const resp = await rateLimitedApi("/api/v5/app/entry/data/list", params);
          if (!resp?.data || resp.data.length === 0 || resp._error) break;

          for (const record of resp.data) {
            const recordId = record._id || `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            await db.query(
              `INSERT INTO jiandaoyun_form_data_cache (jdy_app_id,jdy_form_id,jdy_record_id,record_data,target_entity,jdy_form_name) VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (jdy_app_id,jdy_form_id,jdy_record_id) DO UPDATE SET record_data=EXCLUDED.record_data,target_entity=EXCLUDED.target_entity,updated_at=NOW()`,
              [f.jdy_app_id, f.jdy_form_id, recordId, JSON.stringify(record), entity, f.jdy_form_name]
            );
          }
          formRecords += resp.data.length;
          dataId = resp.data[resp.data.length - 1]._id;
          if (resp.data.length < 100 || ++pageCount >= 50) break;
        }
        if (formRecords > 0) {
          await db.query("UPDATE jiandaoyun_form_mappings SET record_count=$1,updated_at=NOW() WHERE id=$2", [formRecords, f.id]);
          entityRecords += formRecords;
        }
        totalForms++;
      } catch (err) { totalErrors++; log("ERR", `${f.jdy_form_name}: ${err.message.substring(0, 80)}`); }
    }
    totalRecords += entityRecords;
    if (entityRecords > 0) log("DATA", `${entity}: ${entityRecords} records (${entityForms.length} forms)`);
  }

  log("DONE", `总计: ${totalRecords} records, ${totalForms} forms, ${totalErrors} errors, ${apiCallCount} API calls`);
  return { totalRecords, totalForms, totalErrors };
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 5: TRANSFORM — ALL 26 ENTITIES
// ═══════════════════════════════════════════════════════════════

// Generic bulk upsert
async function bulkInsert(db, table, records, columnMap, formFilter) {
  let created = 0, skipped = 0;
  for (const { data: r, formName, jdyId } of records) {
    if (formFilter && !formFilter(formName, r)) { skipped++; continue; }
    const row = {};
    for (const [col, extractor] of Object.entries(columnMap)) {
      row[col] = typeof extractor === "function" ? extractor(r, formName) : r[extractor];
    }
    row.jdy_id = jdyId;
    row.form_name = formName;
    const vals = Object.values(row).filter(v => v != null && v !== "" && v !== formName && v !== jdyId);
    if (vals.length < 2) { skipped++; continue; }
    const cols = Object.keys(row);
    try {
      await db.query(
        `INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map((_, i) => "$" + (i + 1)).join(",")}) ON CONFLICT (jdy_id) DO NOTHING`,
        cols.map(c => row[c])
      );
      created++;
    } catch { skipped++; }
  }
  return { created, skipped };
}

// ── DDL for all entity tables ────────────────────────────────

const ALL_DDL = [
  // Original 12 from jdy-transform-all
  `CREATE TABLE IF NOT EXISTS jdy_tasks (
    id SERIAL PRIMARY KEY, task_name TEXT, task_type VARCHAR(50), assignee VARCHAR(100),
    department VARCHAR(200), status VARCHAR(50) DEFAULT 'pending', priority VARCHAR(20),
    start_date TIMESTAMPTZ, due_date TIMESTAMPTZ, completed_date TIMESTAMPTZ,
    description TEXT, progress INT DEFAULT 0, parent_task_id INT,
    project_name VARCHAR(255), form_name VARCHAR(200),
    jdy_id VARCHAR(100) UNIQUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_finance_records (
    id SERIAL PRIMARY KEY, record_type VARCHAR(50), record_code VARCHAR(100),
    title VARCHAR(500), amount NUMERIC, currency VARCHAR(10) DEFAULT 'CNY',
    payer VARCHAR(200), payee VARCHAR(200), category VARCHAR(100),
    record_date TIMESTAMPTZ, status VARCHAR(50), notes TEXT,
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_attendance (
    id SERIAL PRIMARY KEY, employee_name VARCHAR(100), record_type VARCHAR(50),
    record_date DATE, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ,
    duration_hours NUMERIC, location TEXT, status VARCHAR(50),
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_inventory (
    id SERIAL PRIMARY KEY, warehouse VARCHAR(200), product_name VARCHAR(255),
    product_code VARCHAR(100), spec VARCHAR(255), unit VARCHAR(50),
    quantity NUMERIC, unit_price NUMERIC, total_amount NUMERIC,
    transaction_type VARCHAR(50), transaction_date TIMESTAMPTZ,
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_performance (
    id SERIAL PRIMARY KEY, employee_name VARCHAR(100), department VARCHAR(200),
    period VARCHAR(50), score NUMERIC, grade VARCHAR(20),
    indicator_name VARCHAR(255), target_value NUMERIC, actual_value NUMERIC,
    bonus_amount NUMERIC, evaluator VARCHAR(100),
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_bom (
    id SERIAL PRIMARY KEY, product_name VARCHAR(255), product_code VARCHAR(100),
    material_name VARCHAR(255), material_code VARCHAR(100),
    quantity NUMERIC, unit VARCHAR(50), level INT,
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_production (
    id SERIAL PRIMARY KEY, work_order_code VARCHAR(100), product_name VARCHAR(255),
    process_name VARCHAR(200), worker VARCHAR(100), quantity NUMERIC,
    planned_qty NUMERIC, completed_qty NUMERIC, reject_qty NUMERIC,
    start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, status VARCHAR(50),
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_purchase (
    id SERIAL PRIMARY KEY, po_code VARCHAR(100), pr_code VARCHAR(100),
    supplier_name VARCHAR(255), material_name VARCHAR(255), material_code VARCHAR(100),
    quantity NUMERIC, unit_price NUMERIC, total_amount NUMERIC,
    order_date TIMESTAMPTZ, delivery_date TIMESTAMPTZ,
    status VARCHAR(50), form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_payroll (
    id SERIAL PRIMARY KEY, employee_name VARCHAR(100), department VARCHAR(200),
    pay_period VARCHAR(50), base_salary NUMERIC, bonus NUMERIC,
    deductions NUMERIC, net_pay NUMERIC, tax NUMERIC,
    social_insurance NUMERIC, housing_fund NUMERIC,
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_recruitment (
    id SERIAL PRIMARY KEY, position_name VARCHAR(255), department VARCHAR(200),
    candidate_name VARCHAR(100), phone VARCHAR(50), email VARCHAR(255),
    education VARCHAR(50), university VARCHAR(200),
    stage VARCHAR(50), interview_date TIMESTAMPTZ, interviewer VARCHAR(100),
    result VARCHAR(50), salary_expectation NUMERIC, notes TEXT,
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_meetings (
    id SERIAL PRIMARY KEY, title VARCHAR(500), room VARCHAR(200),
    organizer VARCHAR(100), attendees TEXT, meeting_date TIMESTAMPTZ,
    start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, duration_min INT,
    summary TEXT, action_items TEXT,
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_quality (
    id SERIAL PRIMARY KEY, inspection_type VARCHAR(50), product_name VARCHAR(255),
    supplier_name VARCHAR(255), batch_code VARCHAR(100),
    inspector VARCHAR(100), inspection_date TIMESTAMPTZ,
    result VARCHAR(50), defect_desc TEXT, corrective_action TEXT,
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,

  // ── 7 NEW ENTITY TABLES ──────────────────────────────────
  `CREATE TABLE IF NOT EXISTS jdy_labor_hours (
    id SERIAL PRIMARY KEY, employee_name VARCHAR(100), department VARCHAR(200),
    project_name VARCHAR(255), project_code VARCHAR(100),
    phase_name VARCHAR(200), hours NUMERIC, work_date DATE,
    description TEXT, status VARCHAR(50) DEFAULT 'submitted',
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_receivables (
    id SERIAL PRIMARY KEY, customer_name VARCHAR(255), project_name VARCHAR(255),
    contract_code VARCHAR(100), invoice_code VARCHAR(100),
    amount NUMERIC, received_amount NUMERIC, pending_amount NUMERIC,
    due_date DATE, received_date DATE, status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50), notes TEXT,
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_processes (
    id SERIAL PRIMARY KEY, process_name VARCHAR(255), process_code VARCHAR(100),
    product_name VARCHAR(255), step_number INT,
    equipment VARCHAR(200), standard_hours NUMERIC, unit VARCHAR(50),
    description TEXT, quality_standard TEXT,
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_communications (
    id SERIAL PRIMARY KEY, comm_type VARCHAR(50), title VARCHAR(500),
    author VARCHAR(100), department VARCHAR(200),
    content TEXT, publish_date TIMESTAMPTZ,
    recipients TEXT, status VARCHAR(50) DEFAULT 'published',
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_fleet (
    id SERIAL PRIMARY KEY, record_type VARCHAR(50), plate_number VARCHAR(20),
    driver VARCHAR(100), department VARCHAR(200),
    destination TEXT, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ,
    mileage NUMERIC, fuel_amount NUMERIC, fuel_cost NUMERIC,
    purpose TEXT, status VARCHAR(50) DEFAULT 'approved',
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_assets (
    id SERIAL PRIMARY KEY, asset_name VARCHAR(255), asset_code VARCHAR(100),
    category VARCHAR(100), applicant VARCHAR(100), department VARCHAR(200),
    quantity NUMERIC, unit_price NUMERIC, total_amount NUMERIC,
    apply_date DATE, receive_date DATE, status VARCHAR(50) DEFAULT 'pending',
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jdy_seals (
    id SERIAL PRIMARY KEY, seal_type VARCHAR(50), seal_name VARCHAR(100),
    applicant VARCHAR(100), department VARCHAR(200),
    purpose TEXT, document_name VARCHAR(500),
    apply_date DATE, use_date DATE, return_date DATE,
    approver VARCHAR(100), status VARCHAR(50) DEFAULT 'pending',
    form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,

  // GRT core tables created by jdy-transform-to-grt
  `CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY, customer_code VARCHAR(50) UNIQUE, customer_name VARCHAR(255) NOT NULL,
    category VARCHAR(100), source VARCHAR(100), tags VARCHAR(255), sales_person VARCHAR(100),
    address TEXT, tax_rate NUMERIC, invoice_title VARCHAR(255), tax_id VARCHAR(100),
    invoice_type VARCHAR(50), bank_account VARCHAR(100), bank_name VARCHAR(100),
    email VARCHAR(255), phone VARCHAR(50), jiandaoyun_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS employee_profiles (
    id SERIAL PRIMARY KEY, employee_code VARCHAR(50), name VARCHAR(100) NOT NULL,
    department VARCHAR(200), position VARCHAR(200), phone VARCHAR(50), email VARCHAR(255),
    gender VARCHAR(10), birth_date DATE, hire_date DATE, regular_date DATE,
    id_card VARCHAR(30), education VARCHAR(50), university VARCHAR(200), major VARCHAR(200),
    employment_type VARCHAR(50), employee_status VARCHAR(50) DEFAULT 'active',
    emergency_contact JSONB, bank_account VARCHAR(100), bank_name VARCHAR(200),
    social_security_no VARCHAR(50), housing_fund_no VARCHAR(50), address TEXT,
    jiandaoyun_id VARCHAR(100) UNIQUE, user_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS sales_orders (
    id SERIAL PRIMARY KEY, order_code VARCHAR(50) UNIQUE, order_name VARCHAR(255),
    customer_code VARCHAR(50), customer_name VARCHAR(255), order_date DATE,
    sales_person VARCHAR(100), sales_department VARCHAR(200), delivery_address TEXT,
    total_amount NUMERIC, order_status VARCHAR(50) DEFAULT 'pending',
    shipping_status VARCHAR(50), payment_status VARCHAR(50), invoice_status VARCHAR(50),
    notes TEXT, jiandaoyun_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS customer_tickets (
    id SERIAL PRIMARY KEY, ticket_code VARCHAR(50), title VARCHAR(255),
    description TEXT, reporter VARCHAR(100), report_date TIMESTAMPTZ,
    category VARCHAR(100) DEFAULT 'field_issue', priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(30) DEFAULT 'open', source VARCHAR(30) DEFAULT 'jiandaoyun',
    jiandaoyun_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
];

// ── Entity column mappings (original 12 + 7 new) ─────────────

const ENTITY_MAP = {
  task: {
    table: "jdy_tasks", label: "任务",
    columns: {
      task_name: r => str(r["任务名称"] || r["任务标题"] || r["名称"] || r["标题"]),
      task_type: (r, fn) => fn.includes("验收") ? "acceptance" : fn.includes("变更") ? "change" : "task",
      assignee: r => userName(r["负责人"] || r["执行人"] || r["任务负责人"] || r["销售人员"]),
      department: r => str(r["部门"] || r["所属部门"]),
      status: r => str(r["状态"] || r["任务状态"] || r["进度状态"]) || "pending",
      start_date: r => dt(r["开始日期"] || r["计划开始"] || r["createTime"]),
      due_date: r => dt(r["截止日期"] || r["计划结束"] || r["截止时间"]),
      description: r => str(r["描述"] || r["任务描述"] || r["备注"] || r["说明"], 2000),
      progress: r => num(r["完成率"] || r["进度"]),
      project_name: r => str(r["所属项目"] || r["项目名称"] || r["项目"]),
    },
  },
  finance: {
    table: "jdy_finance_records", label: "财务",
    columns: {
      record_type: (r, fn) => /报销/.test(fn) ? "expense" : /付款/.test(fn) ? "payment" : /收款/.test(fn) ? "receipt" : /发票/.test(fn) ? "invoice" : /对账/.test(fn) ? "reconciliation" : "other",
      record_code: r => str(r["流水号"] || r["单据编号"] || r["编号"]),
      title: r => str(r["活动名称"] || r["摘要"] || r["项目名称"] || r["标题"] || r["收支明细"], 500),
      amount: r => num(r["费用总计"] || r["金额"] || r["合计金额"] || r["付款金额"] || r["收款金额"] || r["合计"]),
      category: r => str(r["费用类别"] || r["科目"] || r["类别"] || r["类型"]),
      payer: r => userName(r["申请人"] || r["付款方"] || r["提交人"] || r["creator"]),
      payee: r => str(r["收款方"] || r["供应商"] || r["收款人"]),
      record_date: r => dt(r["日期"] || r["单据日期"] || r["申请日期"] || r["createTime"]),
      status: r => str(r["审批状态"] || r["状态"] || r["审批结果"]) || "submitted",
      notes: r => str(r["备注"] || r["说明"], 2000),
    },
  },
  hrmAttendance: {
    table: "jdy_attendance", label: "考勤",
    columns: {
      employee_name: r => userName(r["姓名"] || r["员工"] || r["打卡人"] || r["申请人"] || r["creator"]),
      record_type: (r, fn) => /请假/.test(fn) ? "leave" : /加班/.test(fn) ? "overtime" : /出差/.test(fn) ? "business_trip" : /补卡/.test(fn) ? "makeup" : /调休/.test(fn) ? "comp_leave" : /打卡/.test(fn) ? "clock_in" : "attendance",
      record_date: r => dt(r["日期"] || r["打卡日期"] || r["开始日期"] || r["申请日期"] || r["createTime"]),
      start_time: r => dt(r["开始时间"] || r["上班打卡时间"]),
      end_time: r => dt(r["结束时间"] || r["下班打卡时间"]),
      duration_hours: r => num(r["时长"] || r["小时数"] || r["天数"]),
      location: r => addr(r["打卡地点"] || r["地点"] || r["工作地点"]),
      status: r => str(r["审批状态"] || r["状态"]) || "recorded",
    },
  },
  inventory: {
    table: "jdy_inventory", label: "库存",
    columns: {
      warehouse: r => str(r["仓库"] || r["仓库信息"] || r["入库仓库"]),
      product_name: r => str(r["产品名称"] || r["物料名称"] || r["品名"] || r["名称"]),
      product_code: r => str(r["产品编码"] || r["物料编码"] || r["编号"]),
      spec: r => str(r["规格型号"] || r["规格"]),
      unit: r => str(r["单位"] || r["计量单位"]),
      quantity: r => num(r["数量"] || r["入库数量"] || r["出库数量"] || r["盘点数量"] || r["期末数量"]),
      unit_price: r => num(r["单价"]),
      total_amount: r => num(r["金额"] || r["总金额"]),
      transaction_type: (r, fn) => /入库/.test(fn) ? "inbound" : /出库/.test(fn) ? "outbound" : /调拨/.test(fn) ? "transfer" : /盘点/.test(fn) ? "count" : "record",
      transaction_date: r => dt(r["日期"] || r["入库时间"] || r["出库时间"] || r["createTime"]),
    },
  },
  hrmPerformance: {
    table: "jdy_performance", label: "绩效",
    columns: {
      employee_name: r => userName(r["姓名"] || r["被考核人"] || r["员工"] || r["creator"]),
      department: r => str(r["部门"] || r["所属部门"]),
      period: r => str(r["考核周期"] || r["周期"] || r["年份"]),
      score: r => num(r["得分"] || r["总分"] || r["分数"] || r["绩效得分"]),
      grade: r => str(r["等级"] || r["评级"] || r["绩效等级"]),
      indicator_name: r => str(r["指标名称"] || r["考核项目"] || r["KPI"]),
      target_value: r => num(r["目标值"] || r["目标（W）"]),
      actual_value: r => num(r["实际值"] || r["实际完成值（W）"]),
      bonus_amount: r => num(r["2025年终奖总金额（260213）"] || r["奖金"] || r["年终奖"]),
      evaluator: r => userName(r["考核人"] || r["评估人"]),
    },
  },
  bom: {
    table: "jdy_bom", label: "BOM",
    columns: {
      product_name: r => str(r["产品名称"] || r["成品名称"] || r["名称"]),
      product_code: r => str(r["产品编码"] || r["成品编码"] || r["编码"]),
      material_name: r => str(r["物料名称"] || r["子件名称"] || r["材料名称"]),
      material_code: r => str(r["物料编码"] || r["子件编码"]),
      quantity: r => num(r["用量"] || r["数量"] || r["总行数"]),
      unit: r => str(r["单位"]),
      level: r => num(r["层级"] || r["BOM层级"]),
    },
  },
  productionOrder: {
    table: "jdy_production", label: "生产",
    columns: {
      work_order_code: r => str(r["生产工单编号"] || r["工单编号"] || r["生产计划编号"]),
      product_name: r => str(r["产品名称"] || r["产品"] || r["品名"]),
      process_name: r => str(r["工序名称"] || r["工序"] || r["工艺"]),
      worker: r => userName(r["报工人"] || r["操作员"] || r["生产人员"] || r["creator"]),
      quantity: r => num(r["数量"] || r["生产数量"]),
      planned_qty: r => num(r["计划数量"]),
      completed_qty: r => num(r["完成数量"] || r["合格数量"]),
      reject_qty: r => num(r["不良数量"] || r["报废数量"]),
      start_time: r => dt(r["开始时间"] || r["开工时间"]),
      end_time: r => dt(r["结束时间"] || r["完工时间"]),
      status: r => str(r["生产计划状态"] || r["状态"] || r["工单状态"]) || "active",
    },
  },
  purchaseOrder: {
    table: "jdy_purchase", label: "采购",
    columns: {
      po_code: r => str(r["采购订单编号"] || r["入库申请单编号"] || r["订单编号"]),
      pr_code: r => str(r["采购申请编号"]),
      supplier_name: r => str(r["供应商"] || r["供应商名称"]),
      material_name: r => str(r["物料名称"] || r["产品名称"] || r["采购订单名称"]),
      material_code: r => str(r["物料编码"] || r["产品编码"]),
      quantity: r => num(r["数量"] || r["采购数量"]),
      unit_price: r => num(r["单价"]),
      total_amount: r => num(r["金额"] || r["总金额"] || r["合计金额"]),
      order_date: r => dt(r["下单日期"] || r["订单日期"] || r["入库时间"] || r["createTime"]),
      delivery_date: r => dt(r["交货日期"] || r["预计到货日期"]),
      status: r => str(r["申请单状态"] || r["订单状态"] || r["状态"]) || "pending",
    },
  },
  hrmPayroll: {
    table: "jdy_payroll", label: "薪资",
    columns: {
      employee_name: r => userName(r["姓名"] || r["员工姓名"] || r["creator"]),
      department: r => str(r["部门"]),
      pay_period: r => str(r["薪资月份"] || r["月份"] || r["期间"]),
      base_salary: r => num(r["基本工资"] || r["底薪"]),
      bonus: r => num(r["奖金"] || r["绩效奖金"]),
      deductions: r => num(r["扣款"] || r["扣除合计"]),
      net_pay: r => num(r["实发工资"] || r["实际到手"]),
      tax: r => num(r["个人所得税"] || r["个税"]),
      social_insurance: r => num(r["社保个人"] || r["社保"]),
      housing_fund: r => num(r["公积金个人"] || r["公积金"]),
    },
  },
  hrmRecruitment: {
    table: "jdy_recruitment", label: "招聘",
    columns: {
      position_name: r => str(r["招聘岗位"] || r["应聘岗位"] || r["岗位名称"] || r["职位"]),
      department: r => str(r["需求部门"] || r["用人部门"] || r["部门"]),
      candidate_name: r => str(r["候选人姓名"] || r["姓名"] || r["应聘人"]),
      phone: r => str(r["联系电话"] || r["手机号"]),
      email: r => str(r["邮箱"]),
      education: r => str(r["学历"] || r["最高学历"]),
      university: r => str(r["毕业院校"]),
      stage: (r, fn) => /简历/.test(fn) ? "resume" : /面试/.test(fn) ? "interview" : /offer/.test(fn) ? "offer" : "applied",
      interview_date: r => dt(r["面试时间"] || r["面试日期"]),
      interviewer: r => userName(r["面试官"] || r["面试人"]),
      result: r => str(r["面试结果"] || r["筛选结果"] || r["审批结果"]),
      salary_expectation: r => num(r["期望薪资"]),
      notes: r => str(r["备注"] || r["面试评价"] || r["评价"], 2000),
    },
  },
  meeting: {
    table: "jdy_meetings", label: "会议",
    columns: {
      title: r => str(r["会议内容"] || r["会议主题"] || r["标题"], 500),
      room: r => str(r["会议室"] || r["会议地点"]),
      organizer: r => userName(r["预约人"] || r["发起人"] || r["creator"]),
      attendees: r => { const a = r["参会人员"] || r["成员多选"] || r["与会人员"]; if (!a) return null; if (Array.isArray(a)) return a.map(x => x.name || x).join(", "); return str(a, 2000); },
      meeting_date: r => dt(r["日期"] || r["会议日期"] || r["预约日期"] || r["createTime"]),
      start_time: r => dt(r["开始时间"]),
      end_time: r => dt(r["结束时间"]),
      summary: r => str(r["记录和todo"] || r["会议纪要"] || r["会议记录"], 5000),
      action_items: r => str(r["待办事项"] || r["后续行动"], 2000),
    },
  },
  quality: {
    table: "jdy_quality", label: "质量",
    columns: {
      inspection_type: (r, fn) => /来料/.test(fn) ? "incoming" : /样品/.test(fn) ? "sample" : /8D/.test(fn) ? "8d_report" : "inspection",
      product_name: r => str(r["产品名称"] || r["物料名称"]),
      supplier_name: r => str(r["供应商名称"] || r["供应商"]),
      batch_code: r => str(r["批次号"] || r["邮寄单号"]),
      inspector: r => userName(r["检验员"] || r["审批人"] || r["creator"]),
      inspection_date: r => dt(r["检验日期"] || r["邮寄时间"] || r["审批时间"] || r["createTime"]),
      result: r => str(r["检验结果"] || r["样品检验结果"] || r["样品签收确认"]),
      defect_desc: r => str(r["不合格描述"] || r["不通过原因"] || r["问题描述"], 2000),
      corrective_action: r => str(r["纠正措施"] || r["改善措施"], 2000),
    },
  },

  // ── 7 NEW ENTITIES ────────────────────────────────────────

  laborHours: {
    table: "jdy_labor_hours", label: "工时",
    columns: {
      employee_name: r => userName(r["报工人"] || r["员工"] || r["员工姓名"] || r["姓名"] || r["creator"]),
      department: r => str(r["部门"] || r["所属部门"]),
      project_name: r => str(r["项目名称"] || r["所属项目"] || r["项目"]),
      project_code: r => str(r["项目编号"] || r["生产工单编号"]),
      phase_name: r => str(r["项目阶段"] || r["工序名称"] || r["阶段任务"] || r["工序"]),
      hours: r => num(r["报工工时/h"] || r["所用工时（小时）"] || r["工时"] || r["小时数"]),
      work_date: r => dt(r["报工时间"] || r["填报日期"] || r["日期"] || r["createTime"]),
      description: r => str(r["描述"] || r["问题描述"] || r["项目内容"] || r["备注"], 2000),
      status: r => str(r["审批状态"] || r["状态"]) || "submitted",
    },
  },
  receivable: {
    table: "jdy_receivables", label: "回款",
    columns: {
      customer_name: r => str(r["客户名称"] || r["客户"] || r["收款客户"]),
      project_name: r => str(r["合同名称"] || r["项目名称"] || r["合同项目"]),
      contract_code: r => str(r["合同编号"] || r["应收合同编号"] || r["收款单号"]),
      invoice_code: r => str(r["销项发票编号"] || r["发票编号"] || r["开票编号"]),
      amount: r => num(r["本次收款总额/元"] || r["合同金额/元"] || r["回款金额"] || r["收款金额"] || r["金额"]),
      received_amount: r => num(r["已收款金额/元"] || r["F-总收款金额/元"] || r["已回款金额"]),
      pending_amount: r => num(r["未收款金额/元"] || r["未回款金额"]),
      due_date: r => dt(r["收款时间"] || r["预计回款日期"] || r["到期日"]),
      received_date: r => dt(r["收款时间"] || r["实际回款日期"] || r["createTime"]),
      status: r => str(r["收款状态"] || r["回款状态"] || r["状态"]) || "pending",
      payment_method: r => str(r["收款方式"] || r["回款方式"]),
      notes: r => str(r["备注"] || r["说明"], 2000),
    },
  },
  process: {
    table: "jdy_processes", label: "工艺",
    columns: {
      process_name: r => str(r["工序名称"] || r["工艺名称"] || r["名称"]),
      process_code: r => str(r["工序编号"] || r["工艺编号"] || r["编码"]),
      product_name: r => str(r["产品名称"] || r["适用产品"]),
      step_number: r => num(r["工序序号"] || r["序号"] || r["步骤"]),
      equipment: r => str(r["设备"] || r["工装设备"] || r["机床"]),
      standard_hours: r => num(r["标准工时"] || r["工时定额"] || r["工时"]),
      unit: r => str(r["单位"]),
      description: r => str(r["工序描述"] || r["工艺描述"] || r["备注"], 2000),
      quality_standard: r => str(r["质量标准"] || r["检验标准"] || r["技术要求"], 2000),
    },
  },
  communication: {
    table: "jdy_communications", label: "沟通",
    columns: {
      comm_type: (r, fn) => /日报/.test(fn) ? "daily_report" : /周报/.test(fn) ? "weekly_report" : /公告|通知/.test(fn) ? "announcement" : "notice",
      title: r => str(r["通知标题"] || r["标题"] || r["主题"] || r["公告标题"], 500),
      author: r => userName(r["提交人"] || r["填写人"] || r["发布人"] || r["creator"]),
      department: r => str(r["部门"] || r["所属部门"]),
      content: r => str(r["具体内容"] || r["内容"] || r["日报内容"] || r["工作内容"] || r["公告内容"], 5000),
      publish_date: r => dt(r["日期"] || r["提交日期"] || r["发布日期"] || r["createTime"]),
      recipients: r => { const a = r["选择被通知的供应商"] || r["接收人"] || r["抄送人"]; if (!a) return null; if (Array.isArray(a)) return a.map(x => x.name || x).join(", "); return str(a); },
      status: r => str(r["状态"]) || "published",
    },
  },
  fleet: {
    table: "jdy_fleet", label: "车辆",
    columns: {
      record_type: (r, fn) => /用车/.test(fn) ? "request" : /油卡/.test(fn) ? "fuel_card" : /加油/.test(fn) ? "refuel" : /维修/.test(fn) ? "maintenance" : "vehicle",
      plate_number: r => str(r["车牌号码"] || r["车牌号"] || r["选择车辆"] || r["车辆"] || r["车号"]),
      driver: r => userName(r["申请人"] || r["驾驶人"] || r["用车人"] || r["creator"]),
      department: r => str(r["归属部门"] || r["部门"] || r["所属部门"]),
      destination: r => str(r["目的地"] || r["行程"] || r["出发地"]),
      start_time: r => dt(r["计划用车时间"] || r["出发时间"] || r["开始时间"] || r["用车时间"]),
      end_time: r => dt(r["预计返回时间"] || r["还车时间"] || r["返回时间"] || r["结束时间"]),
      mileage: r => num(r["行驶里程/km"] || r["里程数"] || r["行驶里程"] || r["公里数"]),
      fuel_amount: r => num(r["加油量"] || r["升数"]),
      fuel_cost: r => num(r["加油金额"] || r["油费"] || r["费用"]),
      purpose: r => str(r["用车事由"] || r["用途"] || r["备注"], 500),
      status: r => str(r["审批结果"] || r["审批状态"] || r["状态"]) || "approved",
    },
  },
  assets: {
    table: "jdy_assets", label: "物资",
    columns: {
      asset_name: r => str(r["物品名称"] || r["用品名称"] || r["名称"] || r["资产名称"] || r["办公用品名称"]),
      asset_code: r => str(r["物品编号"] || r["编号"] || r["资产编号"]),
      category: r => str(r["物品类别"] || r["分类"] || r["类别"] || r["资产类别"]),
      applicant: r => userName(r["申请人"] || r["领用人"] || r["creator"]),
      department: r => str(r["部门"] || r["所属部门"] || r["归属部门"]),
      quantity: r => num(r["数量"] || r["领用数量"] || r["总行数"]),
      unit_price: r => num(r["单价"]),
      total_amount: r => num(r["金额"] || r["总金额"]),
      apply_date: r => dt(r["申请日期"] || r["领用日期"] || r["createTime"]),
      receive_date: r => dt(r["发放日期"]),
      status: r => str(r["审批状态"] || r["状态"]) || "pending",
    },
  },
  seal: {
    table: "jdy_seals", label: "印章",
    columns: {
      seal_type: r => str(r["印章类型"] || r["用印类型"] || r["类型"]),
      seal_name: r => str(r["印章名称"] || r["用印名称"]),
      applicant: r => userName(r["申请人"] || r["用印人"] || r["creator"]),
      department: r => str(r["部门"] || r["所属部门"]),
      purpose: r => str(r["用途"] || r["用印事由"] || r["事由"], 500),
      document_name: r => str(r["文件名称"] || r["合同名称"] || r["文件"], 500),
      apply_date: r => dt(r["申请日期"] || r["createTime"]),
      use_date: r => dt(r["用印日期"]),
      return_date: r => dt(r["归还日期"]),
      approver: r => userName(r["审批人"]),
      status: r => str(r["审批状态"] || r["状态"]) || "pending",
    },
  },
};

// ── GRT core transformers (project/customer/supplier/contract/employee/salesOrder/afterSales) ──

async function transformGrtCore(db, entity, records) {
  let created = 0, skipped = 0;

  if (entity === "project") {
    for (const { data: r, formName, jdyId } of records) {
      if (!["项目立项", "⭐项目总览", "项目计划"].some(pf => formName.includes(pf))) continue;
      const name = str(r["项目名称"] || r["项目全称"] || r["项目号"]); if (!name) { skipped++; continue; }
      const existing = await db.query('SELECT id FROM projects WHERE "jiandaoyunId"=$1', [jdyId]);
      if (existing.rows.length > 0) { skipped++; continue; }
      const code = str(r["项目编号"] || r["项目号"]) || genCode("JDY", jdyId);
      try {
        await db.query(
          `INSERT INTO projects ("projectCode",name,type,status,priority,"plannedStartDate","plannedEndDate",budget,"contractAmount",description,"jiandaoyunId","completionPercent","riskLevel","healthStatus",version)
           VALUES ($1,$2,'standard','active','medium',$3,$4,$5,$6,$7,$8,0,'low','green',1)`,
          [code, name, dt(r["计划开始日期"] || r["计划开工时间"]), dt(r["计划结束日期"] || r["计划完工时间"]),
           num(r["项目预算"] || r["预算金额"]), num(r["合同金额"] || r["合同总额"]),
           str(r["项目描述"] || r["备注"], 2000), jdyId]);
        created++;
      } catch { skipped++; }
    }
  } else if (entity === "crmCustomer") {
    for (const { data: r, formName, jdyId } of records) {
      if (!["客户", "客户管理", "M0-1 客户管理"].some(f => formName.includes(f))) { skipped++; continue; }
      const name = str(r["客户名称"] || r["客户"]); if (!name) { skipped++; continue; }
      const existing = await db.query("SELECT id FROM customers WHERE jiandaoyun_id=$1", [jdyId]);
      if (existing.rows.length > 0) { skipped++; continue; }
      try {
        await db.query(
          `INSERT INTO customers (customer_code,customer_name,category,source,tags,sales_person,address,tax_rate,invoice_title,tax_id,invoice_type,bank_account,bank_name,email,phone,jiandaoyun_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (jiandaoyun_id) DO NOTHING`,
          [str(r["客户编码"]) || genCode("C", jdyId), name, str(r["客户分类"] || r["客户类型"]), str(r["客户来源"]),
           str(r["客户标签"]), userName(r["销售负责人"]), addr(r["客户地址"] || r["地址"]),
           num(r["增值税税率 %"]), str(r["开票抬头"]), str(r["开票税号"] || r["税号"]),
           str(r["发票类型"]), str(r["银行账户"]), str(r["开户银行"]),
           str(r["收票邮箱"] || r["邮箱"]), str(r["电话"] || r["联系电话"]), jdyId]);
        created++;
      } catch { skipped++; }
    }
  } else if (entity === "supplier") {
    for (const { data: r, formName, jdyId } of records) {
      if (!["供应商档案", "供应商注册", "供应商准入", "供应商信息", "供应商"].some(f => formName === f || formName.startsWith(f))) { skipped++; continue; }
      const name = str(r["供应商名称"] || r["供应商全称"] || r["企业名称"]); if (!name) { skipped++; continue; }
      const code = str(r["供应商编码"]) || genCode("S", jdyId);
      const existing = await db.query('SELECT id FROM suppliers WHERE "supplierCode"=$1 OR "supplierName"=$2', [code, name]);
      if (existing.rows.length > 0) { skipped++; continue; }
      try {
        await db.query(
          `INSERT INTO suppliers ("supplierCode","supplierName","supplierCategory","contactPerson","contactPhone","contactEmail",address,status,"createdBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,'active',1,NOW(),NOW())`,
          [code, name, str(r["供应商类型"] || r["供应商分类"]) || "general",
           str(r["联系人"]), str(r["联系电话"]), str(r["邮箱"]), addr(r["地址"])]);
        created++;
      } catch { skipped++; }
    }
  } else if (entity === "contract") {
    for (const { data: r, formName, jdyId } of records) {
      if (!["采购合同", "应付合同", "应收合同", "合同签订", "员工合同管理", "合同审查"].some(f => formName.includes(f))) { skipped++; continue; }
      const title = str(r["合同名称"] || r["合同标题"]); if (!title) { skipped++; continue; }
      const code = (str(r["合同编号"] || r["应付合同编号"] || r["应收合同编号"]) || genCode("CT", jdyId)).substring(0, 50);
      const existing = await db.query("SELECT id FROM contracts WHERE contract_code=$1", [code]);
      if (existing.rows.length > 0) { skipped++; continue; }
      const type = formName.includes("应付") ? "payable" : formName.includes("应收") ? "receivable" : formName.includes("员工") ? "employment" : "procurement";
      try {
        await db.query(
          "INSERT INTO contracts (contract_code,title,type,amount,status,sign_date,start_date,end_date,notes,created_at,updated_at) VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8,NOW(),NOW())",
          [code, title, type, num(r["合同金额/元"] || r["合同金额"]),
           str(r["合同签订日期"]), str(r["合同开始日期"]), str(r["合同结束日期"]),
           str(r["备注"], 2000)]);
        created++;
      } catch { skipped++; }
    }
  } else if (entity === "hrmEmployee") {
    for (const { data: r, formName, jdyId } of records) {
      if (formName !== "员工档案") { skipped++; continue; }
      const name = str(r["姓名"]); if (!name) { skipped++; continue; }
      const existing = await db.query("SELECT id FROM employee_profiles WHERE jiandaoyun_id=$1", [jdyId]);
      if (existing.rows.length > 0) { skipped++; continue; }
      const userMatch = await db.query("SELECT id FROM users WHERE name=$1 LIMIT 1", [name]);
      try {
        await db.query(
          `INSERT INTO employee_profiles (employee_code,name,department,position,phone,email,gender,birth_date,hire_date,regular_date,id_card,education,university,major,employment_type,employee_status,bank_account,bank_name,social_security_no,housing_fund_no,address,jiandaoyun_id,user_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) ON CONFLICT (jiandaoyun_id) DO NOTHING`,
          [str(r["工号"]), name, str(r["部门"]), str(r["岗位"]), str(r["手机号"]), str(r["邮箱"]),
           str(r["性别"]), dt(r["出生日期"]), dt(r["入职日期"]), dt(r["转正日期"]),
           str(r["身份证号"]), str(r["最高学历"]), str(r["毕业院校"]), str(r["所学专业"]),
           str(r["聘用形式"]), str(r["员工状态"]) || "active",
           str(r["银行卡号"]), str(r["开户行"]), str(r["社保账号"]), str(r["公积金账号"]),
           addr(r["常住地址"]), jdyId, userMatch.rows[0]?.id || null]);
        created++;
      } catch { skipped++; }
    }
  } else if (entity === "salesOrder") {
    for (const { data: r, formName, jdyId } of records) {
      if (!formName.includes("销售订单")) { skipped++; continue; }
      const code = str(r["销售订单编号"]); if (!code) { skipped++; continue; }
      const existing = await db.query("SELECT id FROM sales_orders WHERE jiandaoyun_id=$1", [jdyId]);
      if (existing.rows.length > 0) { skipped++; continue; }
      try {
        await db.query(
          `INSERT INTO sales_orders (order_code,order_name,customer_name,order_date,sales_person,delivery_address,total_amount,order_status,shipping_status,payment_status,invoice_status,jiandaoyun_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (jiandaoyun_id) DO NOTHING`,
          [code, str(r["销售订单名称"]), str(r["客户名称"]), dt(r["单据日期"]),
           userName(r["销售负责人"]), addr(r["送货地址"]), num(r["销售总金额/元"]),
           str(r["订单状态"]) || "pending", str(r["出库状态"]), str(r["收款状态"]), str(r["开票状态"]), jdyId]);
        created++;
      } catch { skipped++; }
    }
  } else if (entity === "afterSales") {
    for (const { data: r, formName, jdyId } of records) {
      const existing = await db.query("SELECT id FROM customer_tickets WHERE jiandaoyun_id=$1", [jdyId]);
      if (existing.rows.length > 0) { skipped++; continue; }
      try {
        await db.query(
          "INSERT INTO customer_tickets (ticket_code,title,reporter,report_date,source,jiandaoyun_id) VALUES ($1,$2,$3,$4,'jiandaoyun',$5) ON CONFLICT (jiandaoyun_id) DO NOTHING",
          [genCode("TK", jdyId), str(r["问题描述"] || r["走线问题清单"] || formName),
           userName(r["姓名"] || r["creator"]), dt(r["走线时间"] || r["createTime"]), jdyId]);
        created++;
      } catch { skipped++; }
    }
  }
  return { created, skipped };
}

const GRT_CORE_ENTITIES = ["project", "crmCustomer", "supplier", "contract", "hrmEmployee", "salesOrder", "afterSales"];

async function phaseTransform(db) {
  section("Phase 5: 缓存 → GRT 业务表转换 (26 entities)");

  // Create all tables
  for (const ddl of ALL_DDL) await db.query(ddl);
  log("OK", "所有目标表已就绪");

  const allEntities = flags.entities || [...Object.keys(ENTITY_MAP), ...GRT_CORE_ENTITIES];
  const results = {};

  for (const entity of allEntities) {
    const isGrt = GRT_CORE_ENTITIES.includes(entity);
    const config = ENTITY_MAP[entity];

    if (!isGrt && !config) { log("SKIP", entity); continue; }

    // Load cached records
    const cached = await db.query(
      `SELECT c.jdy_record_id, c.record_data, c.jdy_form_name, m.field_schema
       FROM jiandaoyun_form_data_cache c
       LEFT JOIN jiandaoyun_form_mappings m ON c.jdy_app_id=m.jdy_app_id AND c.jdy_form_id=m.jdy_form_id
       WHERE c.target_entity=$1`, [entity]
    );
    if (cached.rows.length === 0) continue;

    const resolved = cached.rows.map(row => ({
      data: resolveRecord(row.record_data, row.field_schema),
      formName: row.jdy_form_name,
      jdyId: row.jdy_record_id,
    }));

    let result;
    if (isGrt) {
      result = await transformGrtCore(db, entity, resolved);
    } else {
      result = await bulkInsert(db, config.table, resolved, config.columns);
    }
    results[entity] = result;
    if (result.created > 0) log("OK", `${isGrt ? entity : config.label}: 写入 ${result.created}, 跳过 ${result.skipped}`);
  }

  // Summary table
  section("转换报告");
  console.log("\n  ┌────────────────────────┬──────────┬──────────┐");
  console.log("  │ Entity                 │ 写入     │ 跳过     │");
  console.log("  ├────────────────────────┼──────────┼──────────┤");
  let tc = 0, ts = 0;
  for (const [e, r] of Object.entries(results)) {
    console.log(`  │ ${e.padEnd(22)} │ ${String(r.created).padStart(8)} │ ${String(r.skipped).padStart(8)} │`);
    tc += r.created; ts += r.skipped;
  }
  console.log("  ├────────────────────────┼──────────┼──────────┤");
  console.log(`  │ ${"TOTAL".padEnd(22)} │ ${String(tc).padStart(8)} │ ${String(ts).padStart(8)} │`);
  console.log("  └────────────────────────┴──────────┴──────────┘");
  return results;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 6: REPAIR & GRT CORE INTEGRATION
// ═══════════════════════════════════════════════════════════════

async function phaseRepair(db) {
  section("Phase 6: 数据修复 + 关系链接 + GRT核心灌入");

  // 6A: Finance title/amount repair
  log("INFO", "6A: 修复财务 title/amount...");
  const finRows = await db.query(
    `SELECT f.id, c.record_data, m.field_schema, c.jdy_form_name
     FROM jdy_finance_records f
     JOIN jiandaoyun_form_data_cache c ON f.jdy_id=c.jdy_record_id
     LEFT JOIN jiandaoyun_form_mappings m ON c.jdy_app_id=m.jdy_app_id AND c.jdy_form_id=m.jdy_form_id
     WHERE m.field_schema IS NOT NULL`
  );
  let finFixed = 0;
  for (const row of finRows.rows) {
    const r = resolveRecord(row.record_data, row.field_schema);
    const title = str(r["活动名称"] || r["摘要"] || r["收票登记编号"] || r["报销事由"] || r["项目名称"] || r["采购订单名称"] || r["供应商名称"] || r["科目"] || row.jdy_form_name, 500);
    const amount = num(r["费用总计"] || r["金额合计"] || r["合计金额"] || r["本次收票金额/元"] || r["付款金额"] || r["收款金额"] || r["合同金额/元"]);
    const category = str(r["费用类别"] || r["科目"] || r["会计科目"]);
    const payee = str(r["供应商名称"] || r["收款方"] || r["收款人"]);
    if (title || amount) {
      await db.query("UPDATE jdy_finance_records SET title=COALESCE($1,title),amount=COALESCE($2,amount),category=COALESCE($3,category),payee=COALESCE($4,payee),updated_at=NOW() WHERE id=$5",
        [title, amount, category, payee, row.id]);
      finFixed++;
    }
  }
  log("OK", `财务修复: ${finFixed}/${finRows.rows.length}`);

  // 6B: Production repair
  log("INFO", "6B: 修复生产报工...");
  const prodRows = await db.query(
    `SELECT p.id, c.record_data, m.field_schema FROM jdy_production p
     JOIN jiandaoyun_form_data_cache c ON p.jdy_id=c.jdy_record_id
     LEFT JOIN jiandaoyun_form_mappings m ON c.jdy_app_id=m.jdy_app_id AND c.jdy_form_id=m.jdy_form_id
     WHERE m.field_schema IS NOT NULL`
  );
  let prodFixed = 0;
  for (const row of prodRows.rows) {
    const r = resolveRecord(row.record_data, row.field_schema);
    await db.query(
      `UPDATE jdy_production SET quantity=COALESCE($1,quantity),product_name=COALESCE($2,product_name),process_name=COALESCE($3,process_name),completed_qty=COALESCE($4,completed_qty),reject_qty=COALESCE($5,reject_qty),worker=COALESCE($6,worker),updated_at=NOW() WHERE id=$7`,
      [num(r["报工数量"] || r["数量"]), str(r["生产物料名称"] || r["产品名称"]), str(r["工序名称"] || r["工序"]),
       num(r["良品数量"] || r["合格数量"]), num(r["返工数量"] || r["不良数量"]), userName(r["报工人"] || r["操作员"]), row.id]);
    prodFixed++;
  }
  log("OK", `生产修复: ${prodFixed}/${prodRows.rows.length}`);

  // 6C: Purchase repair
  log("INFO", "6C: 修复采购...");
  const purRows = await db.query(
    `SELECT p.id, c.record_data, m.field_schema FROM jdy_purchase p
     JOIN jiandaoyun_form_data_cache c ON p.jdy_id=c.jdy_record_id
     LEFT JOIN jiandaoyun_form_mappings m ON c.jdy_app_id=m.jdy_app_id AND c.jdy_form_id=m.jdy_form_id
     WHERE m.field_schema IS NOT NULL`
  );
  let purFixed = 0;
  for (const row of purRows.rows) {
    const r = resolveRecord(row.record_data, row.field_schema);
    await db.query("UPDATE jdy_purchase SET quantity=COALESCE($1,quantity),unit_price=COALESCE($2,unit_price),total_amount=COALESCE($3,total_amount),supplier_name=COALESCE($4,supplier_name),updated_at=NOW() WHERE id=$5",
      [num(r["数量"]), num(r["单价"]), num(r["金额"] || r["含税金额"]), str(r["供应商名称"]), row.id]);
    purFixed++;
  }
  log("OK", `采购修复: ${purFixed}/${purRows.rows.length}`);

  // 6D: Performance repair
  log("INFO", "6D: 修复绩效...");
  const perfRows = await db.query(
    `SELECT p.id, c.record_data, m.field_schema FROM jdy_performance p
     JOIN jiandaoyun_form_data_cache c ON p.jdy_id=c.jdy_record_id
     LEFT JOIN jiandaoyun_form_mappings m ON c.jdy_app_id=m.jdy_app_id AND c.jdy_form_id=m.jdy_form_id
     WHERE m.field_schema IS NOT NULL`
  );
  let perfFixed = 0;
  for (const row of perfRows.rows) {
    const r = resolveRecord(row.record_data, row.field_schema);
    const score = num(r["得分"] || r["总分"] || r["完成率"]);
    const bonus = num(r["2025年终奖总金额（260213）"] || r["奖金"] || r["年终奖"]);
    if (score || bonus) {
      await db.query("UPDATE jdy_performance SET score=COALESCE($1,score),period=COALESCE($2,period),bonus_amount=COALESCE($3,bonus_amount),target_value=COALESCE($4,target_value),actual_value=COALESCE($5,actual_value),updated_at=NOW() WHERE id=$6",
        [score, str(r["考核周期"] || r["年份"]), bonus, num(r["目标值"]), num(r["实际值"]), row.id]);
      perfFixed++;
    }
  }
  log("OK", `绩效修复: ${perfFixed}/${perfRows.rows.length}`);

  // 6E: Employee↔User linking
  log("INFO", "6E: 员工↔用户关联...");
  const unlinked = await db.query("SELECT id,name FROM employee_profiles WHERE user_id IS NULL");
  let linked = 0;
  for (const emp of unlinked.rows) {
    const user = await db.query("SELECT id FROM users WHERE name=$1 LIMIT 1", [emp.name]);
    if (user.rows.length > 0) {
      await db.query("UPDATE employee_profiles SET user_id=$1,updated_at=NOW() WHERE id=$2", [user.rows[0].id, emp.id]);
      linked++;
    }
  }
  log("OK", `员工关联: ${linked}/${unlinked.rows.length}`);

  // 6F: Production → production_work_orders
  log("INFO", "6F: 灌入 production_work_orders...");
  const prodData = await db.query("SELECT work_order_code,product_name,process_name,worker,quantity,completed_qty,reject_qty,status,start_time,end_time FROM jdy_production WHERE work_order_code IS NOT NULL");
  let woCreated = 0;
  for (const p of prodData.rows) {
    try {
      await db.query(
        `INSERT INTO production_work_orders (work_order_code,product_name,quantity,status,planned_start_date,planned_end_date,actual_hours,completion_rate,notes,created_by,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,1,NOW(),NOW()) ON CONFLICT (work_order_code) DO NOTHING`,
        [p.work_order_code, p.product_name || 'N/A', p.quantity || 0,
         p.status === '已完结' ? 'completed' : p.status === '已派工' ? 'in_progress' : 'pending',
         p.start_time, p.end_time,
         p.completed_qty && p.quantity ? Math.round(p.completed_qty / p.quantity * 100) : 0,
         `JDY工序:${p.process_name || ''} 工人:${p.worker || ''}`]);
      woCreated++;
    } catch {}
  }
  log("OK", `工单写入: ${woCreated}`);

  // 6G: Labor reports → labor_costs + work_logs
  log("INFO", "6G: 灌入 labor_costs + work_logs...");
  const reportRows = await db.query(
    `SELECT c.record_data, m.field_schema, c.jdy_record_id FROM jiandaoyun_form_data_cache c
     LEFT JOIN jiandaoyun_form_mappings m ON c.jdy_app_id=m.jdy_app_id AND c.jdy_form_id=m.jdy_form_id
     WHERE c.jdy_form_name IN ('生产报工','装配报工','外协生产报工表','03-3 工时表','4-报工单') AND m.field_schema IS NOT NULL`
  );
  let laborCreated = 0, wlCreated = 0;
  for (const row of reportRows.rows) {
    const r = resolveRecord(row.record_data, row.field_schema);
    const hours = num(r["报工工时/h"] || r["所用工时（小时）"] || r["工时"]);
    const workerName = userName(r["报工人"] || r["员工"] || r["员工姓名"]);
    const workDate = dt(r["报工时间"] || r["填报日期"] || r["createTime"]);
    if (!hours && !workerName) continue;

    let userId = 1;
    if (workerName) { const u = await db.query("SELECT id FROM users WHERE name=$1 LIMIT 1", [workerName]); if (u.rows.length > 0) userId = u.rows[0].id; }

    try {
      await db.query(
        `INSERT INTO labor_costs ("projectId","userId","workDate",hours,"hourlyRate","totalCost","phaseCode",description,status,"createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,0,0,$5,$6,'approved',NOW(),NOW())`,
        [null, userId, workDate ? new Date(workDate) : new Date(), hours || 0,
         str(r["项目阶段"] || r["工序名称"]),
         `[JDY] ${str(r["项目编号"] || "") || ""} ${str(r["描述"] || "") || ""}`.trim()]);
      laborCreated++;
    } catch {}

    const logCode = str(r["生产报工单编号"] || r["工时信息流水号"]) || 'JDY-' + row.jdy_record_id.substring(0, 8);
    try {
      await db.query(
        `INSERT INTO work_logs (log_code,worker_id,worker_name,"logType",log_time,duration,notes,is_manual_entry,created_at)
         VALUES ($1,$2,$3,'production',$4,$5,$6,true,NOW())`,
        [logCode, userId, workerName, workDate ? new Date(workDate) : new Date(),
         hours ? Math.round(hours * 60) : null, str(r["工序名称"] || r["项目阶段"], 500)]);
      wlCreated++;
    } catch {}
  }
  log("OK", `工时记录: ${laborCreated}, 报工日志: ${wlCreated}`);

  // 6H: Repair new entities from cache (fleet, assets, communication, receivable)
  log("INFO", "6H: 修复新entity数据...");
  const newEntityRepairs = [
    { table: "jdy_fleet", entity: "fleet", repairs: {
      plate_number: r => str(r["车牌号码"] || r["选择车辆"]),
      driver: r => userName(r["申请人"]),
      destination: r => str(r["目的地"]),
      mileage: r => num(r["行驶里程/km"]),
      purpose: r => str(r["用车事由"], 500),
      status: r => str(r["审批结果"]),
    }},
    { table: "jdy_communications", entity: "communication", repairs: {
      title: r => str(r["通知标题"], 500),
      content: r => str(r["具体内容"], 5000),
    }},
    { table: "jdy_receivables", entity: "receivable", repairs: {
      amount: r => num(r["本次收款总额/元"] || r["合同金额/元"]),
      received_amount: r => num(r["已收款金额/元"] || r["F-总收款金额/元"]),
      pending_amount: r => num(r["未收款金额/元"]),
      status: r => str(r["收款状态"]),
      customer_name: r => str(r["客户名称"]),
      contract_code: r => str(r["合同编号"] || r["收款单号"]),
    }},
    { table: "jdy_assets", entity: "assets", repairs: {
      asset_name: r => str(r["物品名称"] || r["资产名称"] || r["办公用品名称"]),
      quantity: r => num(r["数量"] || r["总行数"]),
    }},
  ];
  let newEntityFixed = 0;
  for (const { table, entity, repairs } of newEntityRepairs) {
    const rows = await db.query(
      `SELECT t.id, c.record_data, m.field_schema FROM ${table} t
       JOIN jiandaoyun_form_data_cache c ON t.jdy_id=c.jdy_record_id
       LEFT JOIN jiandaoyun_form_mappings m ON c.jdy_app_id=m.jdy_app_id AND c.jdy_form_id=m.jdy_form_id
       WHERE m.field_schema IS NOT NULL`
    );
    let fixed = 0;
    for (const row of rows.rows) {
      const r = resolveRecord(row.record_data, row.field_schema);
      const sets = [], vals = [];
      let paramIdx = 1;
      for (const [col, extractor] of Object.entries(repairs)) {
        const v = extractor(r);
        if (v != null) { sets.push(`${col}=COALESCE($${paramIdx},${col})`); vals.push(v); paramIdx++; }
      }
      if (sets.length > 0) {
        vals.push(row.id);
        await db.query(`UPDATE ${table} SET ${sets.join(",")},updated_at=NOW() WHERE id=$${paramIdx}`, vals);
        fixed++;
      }
    }
    if (fixed > 0) { log("OK", `${entity}修复: ${fixed}/${rows.rows.length}`); newEntityFixed += fixed; }
  }
  log("OK", `新entity修复总计: ${newEntityFixed}`);

  return { finFixed, prodFixed, purFixed, perfFixed, linked, woCreated, laborCreated, wlCreated, newEntityFixed };
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 7: DATA QUALITY VALIDATION
// ═══════════════════════════════════════════════════════════════

async function phaseValidate(db) {
  section("Phase 7: 全量数据质量校验");

  // ── 7A: Row counts ──
  const allTables = [
    // JDY staging tables (19)
    ["jdy_tasks", "任务"], ["jdy_finance_records", "财务"], ["jdy_attendance", "考勤"],
    ["jdy_inventory", "库存"], ["jdy_performance", "绩效"], ["jdy_bom", "BOM"],
    ["jdy_production", "生产报工"], ["jdy_purchase", "采购"], ["jdy_payroll", "薪资"],
    ["jdy_recruitment", "招聘"], ["jdy_meetings", "会议"], ["jdy_quality", "质量"],
    // 7 new
    ["jdy_labor_hours", "工时"], ["jdy_receivables", "回款"], ["jdy_processes", "工艺"],
    ["jdy_communications", "沟通"], ["jdy_fleet", "车辆"], ["jdy_assets", "物资"], ["jdy_seals", "印章"],
    // GRT core
    ["projects", "项目"], ["customers", "客户"], ["suppliers", "供应商"],
    ["contracts", "合同"], ["employee_profiles", "员工档案"],
    ["sales_orders", "销售订单"], ["customer_tickets", "售后工单"],
    // GRT derived
    ["production_work_orders", "生产工单(GRT)"], ["labor_costs", "工时成本(GRT)"], ["work_logs", "报工日志(GRT)"],
    // Mapping tables
    ["jiandaoyun_dept_mappings", "部门映射"], ["jiandaoyun_user_mappings", "用户映射"],
    ["jiandaoyun_role_mappings", "角色映射"], ["jiandaoyun_form_mappings", "表单映射"],
    ["jiandaoyun_form_data_cache", "数据缓存"],
  ];

  console.log("\n  ┌──────────────────────────┬──────────┐");
  console.log("  │ 数据表                   │ 记录数   │");
  console.log("  ├──────────────────────────┼──────────┤");
  let grandTotal = 0;
  const tableCounts = {};
  for (const [t, label] of allTables) {
    try {
      const r = await db.query(`SELECT COUNT(*) as cnt FROM "${t}"`);
      const cnt = parseInt(r.rows[0].cnt);
      tableCounts[t] = cnt;
      if (cnt > 0) {
        console.log(`  │ ${label.padEnd(24)} │ ${String(cnt).padStart(8)} │`);
        grandTotal += cnt;
      }
    } catch { tableCounts[t] = -1; }
  }
  console.log("  ├──────────────────────────┼──────────┤");
  console.log(`  │ ${"总计".padEnd(24)} │ ${String(grandTotal).padStart(8)} │`);
  console.log("  └──────────────────────────┴──────────┘");

  // ── 7B: Null% analysis (key fields) ──
  section("7B: 关键字段填充率");
  const nullChecks = [
    ["jdy_finance_records", "title", "财务.title"],
    ["jdy_finance_records", "amount", "财务.amount"],
    ["jdy_production", "quantity", "生产.quantity"],
    ["jdy_production", "worker", "生产.worker"],
    ["jdy_purchase", "supplier_name", "采购.supplier"],
    ["jdy_purchase", "total_amount", "采购.total_amount"],
    ["jdy_tasks", "task_name", "任务.task_name"],
    ["jdy_tasks", "assignee", "任务.assignee"],
    ["jdy_attendance", "employee_name", "考勤.employee"],
    ["jdy_performance", "score", "绩效.score"],
    ["jdy_payroll", "employee_name", "薪资.employee"],
    ["jdy_payroll", "net_pay", "薪资.net_pay"],
    ["jdy_inventory", "product_name", "库存.product"],
    ["jdy_quality", "result", "质量.result"],
    ["jdy_meetings", "title", "会议.title"],
    ["jdy_labor_hours", "hours", "工时.hours"],
    ["jdy_receivables", "amount", "回款.amount"],
    ["jdy_processes", "process_name", "工艺.name"],
    ["jdy_communications", "content", "沟通.content"],
    ["jdy_fleet", "plate_number", "车辆.plate"],
    ["jdy_assets", "asset_name", "物资.name"],
    ["jdy_seals", "applicant", "印章.applicant"],
    ["employee_profiles", "user_id", "员工.user_id"],
  ];

  console.log("\n  ┌──────────────────────────┬────────┬────────┬────────┐");
  console.log("  │ 字段                     │ 总量   │ 已填   │ 填充率 │");
  console.log("  ├──────────────────────────┼────────┼────────┼────────┤");
  let totalScore = 0, totalChecks = 0;
  for (const [table, col, label] of nullChecks) {
    if (tableCounts[table] <= 0) continue;
    try {
      const total = tableCounts[table];
      const filled = await db.query(`SELECT COUNT(*) as cnt FROM "${table}" WHERE "${col}" IS NOT NULL AND "${col}"::text != ''`);
      const filledCnt = parseInt(filled.rows[0].cnt);
      const pct = total > 0 ? Math.round(filledCnt / total * 100) : 0;
      const bar = pct >= 80 ? "OK" : pct >= 50 ? "!!" : "XX";
      console.log(`  │ ${label.padEnd(24)} │ ${String(total).padStart(6)} │ ${String(filledCnt).padStart(6)} │ ${String(pct).padStart(4)}% ${bar} │`);
      totalScore += pct;
      totalChecks++;
    } catch {}
  }
  console.log("  └──────────────────────────┴────────┴────────┴────────┘");
  const avgFill = totalChecks > 0 ? Math.round(totalScore / totalChecks) : 0;
  log("INFO", `平均填充率: ${avgFill}%`);

  // ── 7C: Cache vs Transform reconciliation ──
  section("7C: 缓存 vs 转换 对账");
  const cacheByEntity = await db.query(
    "SELECT target_entity, COUNT(*) as cnt FROM jiandaoyun_form_data_cache WHERE target_entity IS NOT NULL GROUP BY target_entity ORDER BY cnt DESC"
  );
  const entityTableMap = {};
  for (const [entity, config] of Object.entries(ENTITY_MAP)) { entityTableMap[entity] = config.table; }
  for (const e of GRT_CORE_ENTITIES) {
    const tbl = e === "project" ? "projects" : e === "crmCustomer" ? "customers" : e === "supplier" ? "suppliers"
      : e === "contract" ? "contracts" : e === "hrmEmployee" ? "employee_profiles"
      : e === "salesOrder" ? "sales_orders" : e === "afterSales" ? "customer_tickets" : null;
    if (tbl) entityTableMap[e] = tbl;
  }

  console.log("\n  ┌──────────────────────────┬────────┬────────┬────────┐");
  console.log("  │ Entity                   │ 缓存   │ 转换   │ 转化率 │");
  console.log("  ├──────────────────────────┼────────┼────────┼────────┤");
  let totalCached = 0, totalTransformed = 0;
  for (const row of cacheByEntity.rows) {
    const entity = row.target_entity;
    const cached = parseInt(row.cnt);
    totalCached += cached;
    const table = entityTableMap[entity];
    let transformed = 0;
    if (table && tableCounts[table] > 0) { transformed = tableCounts[table]; }
    totalTransformed += transformed;
    const pct = cached > 0 ? Math.round(transformed / cached * 100) : 0;
    console.log(`  │ ${entity.padEnd(24)} │ ${String(cached).padStart(6)} │ ${String(transformed).padStart(6)} │ ${String(pct).padStart(4)}%   │`);
  }
  console.log("  ├──────────────────────────┼────────┼────────┼────────┤");
  const totalPct = totalCached > 0 ? Math.round(totalTransformed / totalCached * 100) : 0;
  console.log(`  │ ${"TOTAL".padEnd(24)} │ ${String(totalCached).padStart(6)} │ ${String(totalTransformed).padStart(6)} │ ${String(totalPct).padStart(4)}%   │`);
  console.log("  └──────────────────────────┴────────┴────────┴────────┘");

  // ── 7D: Orphan detection ──
  section("7D: 孤立引用检测");
  const orphanChecks = [
    { label: "员工无GRT用户", sql: "SELECT COUNT(*) as cnt FROM employee_profiles WHERE user_id IS NULL" },
    { label: "JDY用户无GRT关联", sql: "SELECT COUNT(*) as cnt FROM jiandaoyun_user_mappings WHERE grt_user_id IS NULL" },
    { label: "表单无分类", sql: "SELECT COUNT(*) as cnt FROM jiandaoyun_form_mappings WHERE target_entity IS NULL" },
    { label: "表单无字段结构", sql: "SELECT COUNT(*) as cnt FROM jiandaoyun_form_mappings WHERE field_schema IS NULL AND target_entity IS NOT NULL" },
    { label: "缓存无entity标记", sql: "SELECT COUNT(*) as cnt FROM jiandaoyun_form_data_cache WHERE target_entity IS NULL" },
  ];
  for (const { label, sql } of orphanChecks) {
    try {
      const r = await db.query(sql);
      const cnt = parseInt(r.rows[0].cnt);
      const status = cnt === 0 ? "OK" : cnt < 10 ? "WARN" : "ALERT";
      log(status.padEnd(5), `${label}: ${cnt}`);
    } catch { log("SKIP", label); }
  }

  // ── 7E: Entity classification breakdown ──
  section("7E: 表单分类统计");
  try {
    const breakdown = await db.query(
      "SELECT target_entity, COUNT(*) as forms, SUM(record_count) as records FROM jiandaoyun_form_mappings WHERE target_entity IS NOT NULL GROUP BY target_entity ORDER BY records DESC NULLS LAST"
    );
    for (const r of breakdown.rows) {
      console.log(`  ${(r.target_entity || "?").padEnd(22)} ${String(r.forms).padStart(4)} forms  ${String(r.records || 0).padStart(6)} records`);
    }
  } catch {}

  // ── 7F: Overall quality score ──
  section("7F: 综合数据质量评分");
  const scores = [];

  // Completeness: cache coverage
  scores.push({ name: "缓存完整性", score: totalCached > 0 ? Math.min(100, Math.round(totalCached / 100)) : 0, weight: 20 });
  // Transform rate
  scores.push({ name: "转换成功率", score: totalPct, weight: 25 });
  // Fill rate
  scores.push({ name: "字段填充率", score: avgFill, weight: 25 });
  // User linking
  const empTotal = tableCounts["employee_profiles"] || 0;
  const empLinkedResult = empTotal > 0 ? await db.query("SELECT COUNT(*) as cnt FROM employee_profiles WHERE user_id IS NOT NULL") : { rows: [{ cnt: 0 }] };
  const empLinkPct = empTotal > 0 ? Math.round(parseInt(empLinkedResult.rows[0].cnt) / empTotal * 100) : 0;
  scores.push({ name: "用户关联率", score: empLinkPct, weight: 15 });
  // Form classification
  const formTotal = tableCounts["jiandaoyun_form_mappings"] || 0;
  const formClassified = formTotal > 0 ? (await db.query("SELECT COUNT(*) as cnt FROM jiandaoyun_form_mappings WHERE target_entity IS NOT NULL")).rows[0].cnt : 0;
  const formClassPct = formTotal > 0 ? Math.round(parseInt(formClassified) / formTotal * 100) : 0;
  scores.push({ name: "表单分类率", score: formClassPct, weight: 15 });

  let weightedTotal = 0, weightSum = 0;
  console.log("\n  ┌──────────────────────┬────────┬────────┐");
  console.log("  │ 维度                 │ 得分   │ 权重   │");
  console.log("  ├──────────────────────┼────────┼────────┤");
  for (const s of scores) {
    console.log(`  │ ${s.name.padEnd(20)} │ ${String(s.score).padStart(4)}%  │ ${String(s.weight).padStart(4)}%  │`);
    weightedTotal += s.score * s.weight;
    weightSum += s.weight;
  }
  const finalScore = weightSum > 0 ? Math.round(weightedTotal / weightSum) : 0;
  console.log("  ├──────────────────────┼────────┼────────┤");
  const grade = finalScore >= 90 ? "A" : finalScore >= 75 ? "B" : finalScore >= 60 ? "C" : "D";
  console.log(`  │ ${"综合得分".padEnd(20)} │ ${String(finalScore).padStart(4)}%  │  ${grade}     │`);
  console.log("  └──────────────────────┴────────┴────────┘");

  log("DONE", `数据质量: ${finalScore}% (${grade})`);
  return { grandTotal, avgFill, totalPct, empLinkPct, formClassPct, finalScore, grade };
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  简道云 → GRT System 全量迁移 (Master v3.0)                 ║");
  console.log("║  26 entities · 7 phases · data quality validation           ║");
  console.log(`║  ${new Date().toISOString().substring(0, 19).replace("T", " ")}                                      ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  if (!DB_URL) { console.error("ERROR: DATABASE_URL not configured"); process.exit(1); }
  if (!API_KEY && !(flags.phases || []).every(p => ["transform", "repair", "validate"].includes(p))) {
    console.error("ERROR: JIANDAOYUN_API_KEY not configured (needed for org/discovery/fields/cache phases)");
    process.exit(1);
  }

  log("INFO", `Database: ${DB_URL.replace(/:[^:@]+@/, ":***@")}`);
  if (API_KEY) log("INFO", `API Key: ${API_KEY.substring(0, 8)}...`);
  if (flags.dryRun) log("WARN", "预演模式 — 不写入数据");

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  log("OK", "数据库已连接");

  const startTime = Date.now();

  try {
    if (flags.statsOnly) {
      await phaseValidate(db);
      return;
    }

    const phases = flags.phases || ALL_PHASES;
    const results = {};

    for (const phase of phases) {
      switch (phase) {
        case "org":       results.org = await phaseOrg(db); break;
        case "discovery": results.discovery = await phaseDiscovery(db); break;
        case "fields":    results.fields = await phaseFields(db); break;
        case "cache":     results.cache = await phaseCache(db); break;
        case "transform": results.transform = await phaseTransform(db); break;
        case "repair":    results.repair = await phaseRepair(db); break;
        case "validate":  results.validate = await phaseValidate(db); break;
        default: log("WARN", `Unknown phase: ${phase}`);
      }
    }

    // Final summary
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    section("迁移完成");
    console.log(`\n  总耗时: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
    console.log(`  API调用: ${apiCallCount}`);
    for (const [phase, r] of Object.entries(results)) {
      if (r && typeof r === "object") {
        const summary = Object.entries(r).map(([k, v]) => typeof v === "object" ? null : `${k}=${v}`).filter(Boolean).join(", ");
        if (summary) console.log(`  ${phase}: ${summary}`);
      }
    }
  } finally {
    await db.end();
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
