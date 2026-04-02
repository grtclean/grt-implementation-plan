/**
 * Phase C: 将 jiandaoyun_form_data_cache → GRT 业务表
 *
 * 使用 field_schema 将 widget_id 转为中文标签，再映射到 GRT 列
 *
 * 用法:
 *   node scripts/jdy-transform-to-grt.cjs                  # 全量转换
 *   node scripts/jdy-transform-to-grt.cjs --entity project  # 单entity
 *   node scripts/jdy-transform-to-grt.cjs --dry-run         # 预演
 *   node scripts/jdy-transform-to-grt.cjs --stats           # 统计
 */

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const vars = {};
  for (const f of [".env.development", ".env"]) {
    try {
      const content = fs.readFileSync(path.resolve(__dirname, "..", f), "utf-8");
      for (const line of content.split("\n")) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !vars[m[1]]) vars[m[1]] = m[2].trim();
      }
    } catch {}
  }
  return vars;
}
const DB_URL = loadEnv().DATABASE_URL;

const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--entity" && args[i + 1]) { flags.entities = args[i + 1].split(","); i++; }
  else if (args[i] === "--dry-run") flags.dryRun = true;
  else if (args[i] === "--stats") flags.statsOnly = true;
}

function log(tag, msg) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`  [${ts}] ${tag.padEnd(7)} ${msg}`);
}
function section(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
}

// ── Helper: resolve cached record to readable object ─────
function resolveRecord(record, fieldSchema) {
  const data = typeof record === "string" ? JSON.parse(record) : record;
  const schema = typeof fieldSchema === "string" ? JSON.parse(fieldSchema) : fieldSchema;
  if (!schema) return data;
  const labelMap = {};
  for (const f of schema) { labelMap[f.id] = f.label; }
  const result = {};
  for (const [k, v] of Object.entries(data)) {
    result[labelMap[k] || k] = v;
  }
  return result;
}

// ── Extract helpers ─────────────────────────────────────
function str(v, maxLen = 255) {
  if (v == null) return null;
  if (typeof v === "string") return v.substring(0, maxLen);
  if (typeof v === "object" && v.name) return v.name;
  return String(v).substring(0, maxLen);
}
function num(v) {
  if (v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}
function dt(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
function userName(v) {
  if (!v) return null;
  if (typeof v === "string") return v;
  return v.name || null;
}
function addr(v) {
  if (!v) return null;
  if (typeof v === "string") return v;
  return [v.province, v.city, v.district, v.detail].filter(Boolean).join(" ");
}
function genCode(prefix, id) {
  return prefix + "-" + (id || "").toString().substring(0, 8).toUpperCase();
}

// ── Entity Transformers ────────────────────────────────

async function transformProjects(db, records, dryRun) {
  let created = 0, skipped = 0;
  // Priority forms for project data
  const projectForms = ["项目立项", "⭐项目总览", "项目计划"];

  for (const { data: r, formName, jdyId } of records) {
    if (!projectForms.some(pf => formName.includes(pf))) continue;

    const name = str(r["项目名称"] || r["项目全称"] || r["项目号"] || r["客户项目名称"]);
    if (!name) { skipped++; continue; }

    const existing = await db.query('SELECT id FROM projects WHERE "jiandaoyunId"=$1', [jdyId]);
    if (existing.rows.length > 0) { skipped++; continue; }

    const code = str(r["项目编号"] || r["项目号"]) || genCode("JDY", jdyId);
    if (dryRun) { created++; continue; }

    try {
      await db.query(
        `INSERT INTO projects ("projectCode", name, type, status, priority, "plannedStartDate", "plannedEndDate",
         budget, "contractAmount", description, "jiandaoyunId", "completionPercent", "riskLevel", "healthStatus", version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          code, name,
          "standard", "active", "medium",
          dt(r["计划开始日期"] || r["计划开工时间"] || r["开始日期"]),
          dt(r["计划结束日期"] || r["计划完工时间"] || r["结束日期"]),
          num(r["项目预算"] || r["预算金额"]),
          num(r["合同金额"] || r["合同总额"]),
          str(r["项目描述"] || r["备注"] || r["项目简介"], 2000),
          jdyId, 0, "low", "green", 1,
        ]
      );
      created++;
    } catch (e) {
      log("ERR", `project ${name}: ${e.message.substring(0, 100)}`);
      skipped++;
    }
  }
  return { created, skipped };
}

async function transformCustomers(db, records, dryRun) {
  // Create customers table if not exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      customer_code VARCHAR(50) UNIQUE,
      customer_name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      source VARCHAR(100),
      tags VARCHAR(255),
      sales_person VARCHAR(100),
      address TEXT,
      tax_rate NUMERIC,
      invoice_title VARCHAR(255),
      tax_id VARCHAR(100),
      invoice_type VARCHAR(50),
      bank_account VARCHAR(100),
      bank_name VARCHAR(100),
      email VARCHAR(255),
      phone VARCHAR(50),
      jiandaoyun_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  let created = 0, skipped = 0;
  const customerForms = ["客户", "客户管理", "M0-1 客户管理"];

  for (const { data: r, formName, jdyId } of records) {
    if (!customerForms.some(f => formName.includes(f))) { skipped++; continue; }

    const name = str(r["客户名称"] || r["客户"]);
    if (!name) { skipped++; continue; }

    const existing = await db.query("SELECT id FROM customers WHERE jiandaoyun_id=$1", [jdyId]);
    if (existing.rows.length > 0) { skipped++; continue; }
    if (dryRun) { created++; continue; }

    try {
      await db.query(
        `INSERT INTO customers (customer_code, customer_name, category, source, tags, sales_person,
         address, tax_rate, invoice_title, tax_id, invoice_type, bank_account, bank_name, email, phone, jiandaoyun_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (jiandaoyun_id) DO NOTHING`,
        [
          str(r["客户编码"]) || genCode("C", jdyId),
          name,
          str(r["客户分类"] || r["客户类型"]),
          str(r["客户来源"]),
          str(r["客户标签"]),
          userName(r["销售负责人"]),
          addr(r["客户地址"] || r["地址"]),
          num(r["增值税税率 %"]),
          str(r["开票抬头"]),
          str(r["开票税号"] || r["税号"]),
          str(r["发票类型"]),
          str(r["银行账户"]),
          str(r["开户银行"]),
          str(r["收票邮箱"] || r["邮箱"]),
          str(r["电话"] || r["联系电话"]),
          jdyId,
        ]
      );
      created++;
    } catch (e) {
      log("ERR", `customer ${name}: ${e.message.substring(0, 100)}`);
      skipped++;
    }
  }
  return { created, skipped };
}

async function transformSuppliers(db, records, dryRun) {
  let created = 0, skipped = 0;
  const supplierForms = ["供应商档案", "供应商注册", "供应商准入", "供应商信息", "供应商"];

  for (const { data: r, formName, jdyId } of records) {
    if (!supplierForms.some(f => formName === f || formName.startsWith(f))) { skipped++; continue; }

    const name = str(r["供应商名称"] || r["供应商全称"] || r["企业名称"]);
    if (!name) { skipped++; continue; }

    const code = str(r["供应商编码"]) || genCode("S", jdyId);
    const existing = await db.query('SELECT id FROM suppliers WHERE "supplierCode"=$1 OR "supplierName"=$2', [code, name]);
    if (existing.rows.length > 0) { skipped++; continue; }
    if (dryRun) { created++; continue; }

    try {
      await db.query(
        `INSERT INTO suppliers ("supplierCode", "supplierName", "supplierCategory", "contactPerson", "contactPhone",
         "contactEmail", address, status, "createdBy", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
        [
          code, name,
          str(r["供应商类型"] || r["供应商分类"] || r["类型"]) || "general",
          str(r["联系人"] || r["供应商联系人姓名"]),
          str(r["联系电话"] || r["供应商联系人手机"] || r["电话"]),
          str(r["邮箱"] || r["供应商联系人邮箱"]),
          addr(r["地址"] || r["供应商地址"]),
          "active", 1,
        ]
      );
      created++;
    } catch (e) {
      log("ERR", `supplier ${name}: ${e.message.substring(0, 100)}`);
      skipped++;
    }
  }
  return { created, skipped };
}

async function transformContracts(db, records, dryRun) {
  let created = 0, skipped = 0;
  const contractForms = ["采购合同", "应付合同", "应收合同", "合同签订", "员工合同管理", "合同审查"];

  for (const { data: r, formName, jdyId } of records) {
    if (!contractForms.some(f => formName.includes(f))) { skipped++; continue; }

    const title = str(r["合同名称"] || r["合同标题"]);
    if (!title) { skipped++; continue; }

    const rawCode = str(r["合同编号"] || r["应付合同编号"] || r["应收合同编号"]) || genCode("CT", jdyId);
    const code = rawCode.substring(0, 50);
    const existing = await db.query("SELECT id FROM contracts WHERE contract_code=$1", [code]);
    if (existing.rows.length > 0) { skipped++; continue; }
    if (dryRun) { created++; continue; }

    try {
      const type = formName.includes("应付") ? "payable" : formName.includes("应收") ? "receivable" : formName.includes("员工") ? "employment" : "procurement";
      await db.query(
        `INSERT INTO contracts (contract_code, title, type, amount, status, sign_date, start_date, end_date, notes, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
        [
          code, title, type,
          num(r["合同金额/元"] || r["合同金额"]),
          "active",
          str(r["合同签订日期"] || r["签订日期"]),
          str(r["合同开始日期"] || r["开始日期"]),
          str(r["合同结束日期"] || r["结束日期"]),
          str(r["备注"] || r["不通过原因"], 2000),
        ]
      );
      created++;
    } catch (e) {
      log("ERR", `contract ${title}: ${e.message.substring(0, 100)}`);
      skipped++;
    }
  }
  return { created, skipped };
}

async function transformEmployees(db, records, dryRun) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS employee_profiles (
      id SERIAL PRIMARY KEY,
      employee_code VARCHAR(50),
      name VARCHAR(100) NOT NULL,
      department VARCHAR(200),
      position VARCHAR(200),
      phone VARCHAR(50),
      email VARCHAR(255),
      gender VARCHAR(10),
      birth_date DATE,
      hire_date DATE,
      regular_date DATE,
      id_card VARCHAR(30),
      education VARCHAR(50),
      university VARCHAR(200),
      major VARCHAR(200),
      employment_type VARCHAR(50),
      employee_status VARCHAR(50) DEFAULT 'active',
      emergency_contact JSONB,
      bank_account VARCHAR(100),
      bank_name VARCHAR(200),
      social_security_no VARCHAR(50),
      housing_fund_no VARCHAR(50),
      address TEXT,
      jiandaoyun_id VARCHAR(100) UNIQUE,
      user_id INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  let created = 0, skipped = 0;
  const empForms = ["员工档案"];

  for (const { data: r, formName, jdyId } of records) {
    if (!empForms.some(f => formName === f)) { skipped++; continue; }

    const name = str(r["姓名"]);
    if (!name) { skipped++; continue; }

    const existing = await db.query("SELECT id FROM employee_profiles WHERE jiandaoyun_id=$1", [jdyId]);
    if (existing.rows.length > 0) { skipped++; continue; }
    if (dryRun) { created++; continue; }

    // Try to link to GRT user
    const userMatch = await db.query('SELECT id FROM users WHERE name=$1 LIMIT 1', [name]);
    const userId = userMatch.rows[0]?.id || null;

    try {
      await db.query(
        `INSERT INTO employee_profiles (employee_code, name, department, position, phone, email, gender,
         birth_date, hire_date, regular_date, id_card, education, university, major, employment_type,
         employee_status, bank_account, bank_name, social_security_no, housing_fund_no, address, jiandaoyun_id, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
         ON CONFLICT (jiandaoyun_id) DO NOTHING`,
        [
          str(r["工号"]), name, str(r["部门"]), str(r["岗位"]),
          str(r["手机号"]), str(r["邮箱"]), str(r["性别"]),
          dt(r["出生日期"]), dt(r["入职日期"]), dt(r["转正日期"]),
          str(r["身份证号"]), str(r["最高学历"]), str(r["毕业院校"]),
          str(r["所学专业"]), str(r["聘用形式"]),
          str(r["员工状态"]) || "active",
          str(r["银行卡号"]), str(r["开户行"]),
          str(r["社保账号"]), str(r["公积金账号"]),
          addr(r["常住地址"]),
          jdyId, userId,
        ]
      );
      created++;
    } catch (e) {
      log("ERR", `employee ${name}: ${e.message.substring(0, 100)}`);
      skipped++;
    }
  }
  return { created, skipped };
}

async function transformSalesOrders(db, records, dryRun) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS sales_orders (
      id SERIAL PRIMARY KEY,
      order_code VARCHAR(50) UNIQUE,
      order_name VARCHAR(255),
      customer_code VARCHAR(50),
      customer_name VARCHAR(255),
      order_date DATE,
      sales_person VARCHAR(100),
      sales_department VARCHAR(200),
      delivery_address TEXT,
      total_amount NUMERIC,
      order_status VARCHAR(50) DEFAULT 'pending',
      shipping_status VARCHAR(50),
      payment_status VARCHAR(50),
      invoice_status VARCHAR(50),
      notes TEXT,
      jiandaoyun_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  let created = 0, skipped = 0;
  for (const { data: r, formName, jdyId } of records) {
    if (!formName.includes("销售订单")) { skipped++; continue; }
    const code = str(r["销售订单编号"]);
    if (!code) { skipped++; continue; }

    const existing = await db.query("SELECT id FROM sales_orders WHERE jiandaoyun_id=$1", [jdyId]);
    if (existing.rows.length > 0) { skipped++; continue; }
    if (dryRun) { created++; continue; }

    try {
      await db.query(
        `INSERT INTO sales_orders (order_code, order_name, customer_name, order_date, sales_person,
         delivery_address, total_amount, order_status, shipping_status, payment_status, invoice_status, jiandaoyun_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (jiandaoyun_id) DO NOTHING`,
        [
          code, str(r["销售订单名称"]), str(r["客户名称"]),
          dt(r["单据日期"]), userName(r["销售负责人"]),
          addr(r["送货地址"]), num(r["销售总金额/元"]),
          str(r["订单状态"]) || "pending",
          str(r["出库状态"]), str(r["收款状态"]), str(r["开票状态"]),
          jdyId,
        ]
      );
      created++;
    } catch (e) {
      log("ERR", `sales_order ${code}: ${e.message.substring(0, 100)}`);
      skipped++;
    }
  }
  return { created, skipped };
}

async function transformAfterSales(db, records, dryRun) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS customer_tickets (
      id SERIAL PRIMARY KEY,
      ticket_code VARCHAR(50),
      title VARCHAR(255),
      description TEXT,
      reporter VARCHAR(100),
      report_date TIMESTAMPTZ,
      category VARCHAR(100) DEFAULT 'field_issue',
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(30) DEFAULT 'open',
      source VARCHAR(30) DEFAULT 'jiandaoyun',
      jiandaoyun_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  let created = 0, skipped = 0;
  for (const { data: r, formName, jdyId } of records) {
    const title = str(r["问题描述"] || r["走线问题清单"] || formName);
    const reporter = userName(r["姓名"] || r["creator"]);

    const existing = await db.query("SELECT id FROM customer_tickets WHERE jiandaoyun_id=$1", [jdyId]);
    if (existing.rows.length > 0) { skipped++; continue; }
    if (dryRun) { created++; continue; }

    try {
      await db.query(
        `INSERT INTO customer_tickets (ticket_code, title, reporter, report_date, source, jiandaoyun_id)
         VALUES ($1,$2,$3,$4,'jiandaoyun',$5)
         ON CONFLICT (jiandaoyun_id) DO NOTHING`,
        [genCode("TK", jdyId), title, reporter, dt(r["走线时间"] || r["createTime"]), jdyId]
      );
      created++;
    } catch (e) { skipped++; }
  }
  return { created, skipped };
}

// ── Main orchestrator ──────────────────────────────────

const ENTITY_HANDLERS = {
  project:        { handler: transformProjects,    label: "项目" },
  crmCustomer:    { handler: transformCustomers,   label: "客户" },
  supplier:       { handler: transformSuppliers,   label: "供应商" },
  contract:       { handler: transformContracts,   label: "合同" },
  hrmEmployee:    { handler: transformEmployees,   label: "员工档案" },
  salesOrder:     { handler: transformSalesOrders,  label: "销售订单" },
  afterSales:     { handler: transformAfterSales,   label: "售后工单" },
};

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Phase C: 缓存数据 → GRT 业务表转换                   ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  log("OK", "数据库已连接");
  if (flags.dryRun) log("WARN", "预演模式");

  try {
    if (flags.statsOnly) {
      await showStats(db);
      return;
    }

    const entitiesToProcess = flags.entities || Object.keys(ENTITY_HANDLERS);
    const results = {};

    for (const entity of entitiesToProcess) {
      const config = ENTITY_HANDLERS[entity];
      if (!config) { log("SKIP", `${entity}: 无转换器`); continue; }

      section(`转换 ${config.label} (${entity})`);

      // Load cached records with field_schema
      const cached = await db.query(
        `SELECT c.id, c.jdy_record_id, c.record_data, c.jdy_form_name,
                m.field_schema
         FROM jiandaoyun_form_data_cache c
         LEFT JOIN jiandaoyun_form_mappings m ON c.jdy_app_id=m.jdy_app_id AND c.jdy_form_id=m.jdy_form_id
         WHERE c.target_entity=$1`,
        [entity]
      );

      log("INFO", `${cached.rows.length} cached records`);

      // Resolve widget IDs to labels
      const resolved = cached.rows.map((row) => ({
        data: resolveRecord(row.record_data, row.field_schema),
        formName: row.jdy_form_name,
        jdyId: row.jdy_record_id,
      }));

      const result = await config.handler(db, resolved, flags.dryRun);
      results[entity] = result;
      log("OK", `${config.label}: 写入 ${result.created}, 跳过 ${result.skipped}`);
    }

    // Final summary
    section("转换完成报告");
    console.log("\n  ┌─────────────────────┬──────────┬──────────┐");
    console.log("  │ Entity              │ 写入     │ 跳过     │");
    console.log("  ├─────────────────────┼──────────┼──────────┤");
    let totalCreated = 0, totalSkipped = 0;
    for (const [entity, r] of Object.entries(results)) {
      console.log(`  │ ${entity.padEnd(19)} │ ${String(r.created).padStart(8)} │ ${String(r.skipped).padStart(8)} │`);
      totalCreated += r.created;
      totalSkipped += r.skipped;
    }
    console.log("  ├─────────────────────┼──────────┼──────────┤");
    console.log(`  │ ${"TOTAL".padEnd(19)} │ ${String(totalCreated).padStart(8)} │ ${String(totalSkipped).padStart(8)} │`);
    console.log("  └─────────────────────┴──────────┴──────────┘");

    await showStats(db);
  } finally {
    await db.end();
  }
}

async function showStats(db) {
  section("GRT 业务表现有数据");
  const tables = [
    ["projects", "项目"],
    ["customers", "客户"],
    ["suppliers", "供应商"],
    ["contracts", "合同"],
    ["employee_profiles", "员工档案"],
    ["sales_orders", "销售订单"],
    ["customer_tickets", "售后工单"],
    ["purchase_orders", "采购订单"],
    ["materials", "物料"],
    ["bom_items", "BOM"],
    ["meetings", "会议"],
  ];
  for (const [t, label] of tables) {
    try {
      const r = await db.query(`SELECT COUNT(*) as cnt FROM "${t}"`);
      const jdy = await db.query(`SELECT COUNT(*) as cnt FROM "${t}" WHERE "jiandaoyun_id" IS NOT NULL OR "jiandaoyunId" IS NOT NULL`).catch(() => ({ rows: [{ cnt: 0 }] }));
      console.log(`  ${label.padEnd(12)} ${t.padEnd(25)} ${String(r.rows[0].cnt).padStart(6)} (JDY: ${jdy.rows[0].cnt})`);
    } catch {
      console.log(`  ${label.padEnd(12)} ${t.padEnd(25)} N/A`);
    }
  }
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
