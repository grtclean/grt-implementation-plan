/**
 * Phase C-Full: 全量转换 jiandaoyun_form_data_cache → GRT 业务表
 * 覆盖所有19个entity，15,901条缓存数据
 *
 * node scripts/jdy-transform-all.cjs               # 全量
 * node scripts/jdy-transform-all.cjs --entity task  # 单entity
 * node scripts/jdy-transform-all.cjs --stats        # 统计
 */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

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
const DB_URL = loadEnv().DATABASE_URL;
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--entity" && args[i + 1]) { flags.entities = args[i + 1].split(","); i++; }
  else if (args[i] === "--stats") flags.statsOnly = true;
}

// ── Helpers ──────────────────────────────────────────
function str(v, max = 255) { if (v == null) return null; if (typeof v === "object" && v.name) return String(v.name).substring(0, max); return String(v).substring(0, max); }
function num(v) { if (v == null) return null; const n = parseFloat(v); return isNaN(n) ? null : n; }
function dt(v) { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString(); }
function userName(v) { if (!v) return null; return typeof v === "object" ? v.name : String(v); }
function addr(v) { if (!v) return null; if (typeof v === "string") return v; return [v.province, v.city, v.district, v.detail].filter(Boolean).join(" "); }
function log(tag, msg) { console.log(`  [${new Date().toISOString().substring(11,19)}] ${tag.padEnd(7)} ${msg}`); }
function section(t) { console.log(`\n${"═".repeat(60)}\n  ${t}\n${"═".repeat(60)}`); }

function resolveRecord(record, fieldSchema) {
  const data = typeof record === "string" ? JSON.parse(record) : record;
  const schema = typeof fieldSchema === "string" ? JSON.parse(fieldSchema) : fieldSchema;
  if (!schema) return data;
  const m = {}; schema.forEach(f => { m[f.id] = f.label; });
  const r = {}; Object.entries(data).forEach(([k, v]) => { r[m[k] || k] = v; });
  return r;
}

// ── DDL: ensure all target tables exist ──────────────
async function ensureTables(db) {
  const ddls = [
    `CREATE TABLE IF NOT EXISTS jdy_tasks (
      id SERIAL PRIMARY KEY, task_name TEXT, task_type VARCHAR(50), assignee VARCHAR(100),
      department VARCHAR(200), status VARCHAR(50) DEFAULT 'pending', priority VARCHAR(20),
      start_date TIMESTAMPTZ, due_date TIMESTAMPTZ, completed_date TIMESTAMPTZ,
      description TEXT, progress INT DEFAULT 0, parent_task_id INT,
      project_name VARCHAR(255), form_name VARCHAR(200),
      jdy_id VARCHAR(100) UNIQUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS jdy_finance_records (
      id SERIAL PRIMARY KEY, record_type VARCHAR(50), record_code VARCHAR(100),
      title VARCHAR(500), amount NUMERIC, currency VARCHAR(10) DEFAULT 'CNY',
      payer VARCHAR(200), payee VARCHAR(200), category VARCHAR(100),
      record_date TIMESTAMPTZ, status VARCHAR(50), notes TEXT,
      form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS jdy_attendance (
      id SERIAL PRIMARY KEY, employee_name VARCHAR(100), record_type VARCHAR(50),
      record_date DATE, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ,
      duration_hours NUMERIC, location TEXT, status VARCHAR(50),
      form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS jdy_inventory (
      id SERIAL PRIMARY KEY, warehouse VARCHAR(200), product_name VARCHAR(255),
      product_code VARCHAR(100), spec VARCHAR(255), unit VARCHAR(50),
      quantity NUMERIC, unit_price NUMERIC, total_amount NUMERIC,
      transaction_type VARCHAR(50), transaction_date TIMESTAMPTZ,
      form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS jdy_performance (
      id SERIAL PRIMARY KEY, employee_name VARCHAR(100), department VARCHAR(200),
      period VARCHAR(50), score NUMERIC, grade VARCHAR(20),
      indicator_name VARCHAR(255), target_value NUMERIC, actual_value NUMERIC,
      bonus_amount NUMERIC, evaluator VARCHAR(100),
      form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS jdy_bom (
      id SERIAL PRIMARY KEY, product_name VARCHAR(255), product_code VARCHAR(100),
      material_name VARCHAR(255), material_code VARCHAR(100),
      quantity NUMERIC, unit VARCHAR(50), level INT,
      form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS jdy_production (
      id SERIAL PRIMARY KEY, work_order_code VARCHAR(100), product_name VARCHAR(255),
      process_name VARCHAR(200), worker VARCHAR(100), quantity NUMERIC,
      planned_qty NUMERIC, completed_qty NUMERIC, reject_qty NUMERIC,
      start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, status VARCHAR(50),
      form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS jdy_purchase (
      id SERIAL PRIMARY KEY, po_code VARCHAR(100), pr_code VARCHAR(100),
      supplier_name VARCHAR(255), material_name VARCHAR(255), material_code VARCHAR(100),
      quantity NUMERIC, unit_price NUMERIC, total_amount NUMERIC,
      order_date TIMESTAMPTZ, delivery_date TIMESTAMPTZ,
      status VARCHAR(50), form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS jdy_payroll (
      id SERIAL PRIMARY KEY, employee_name VARCHAR(100), department VARCHAR(200),
      pay_period VARCHAR(50), base_salary NUMERIC, bonus NUMERIC,
      deductions NUMERIC, net_pay NUMERIC, tax NUMERIC,
      social_insurance NUMERIC, housing_fund NUMERIC,
      form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS jdy_recruitment (
      id SERIAL PRIMARY KEY, position_name VARCHAR(255), department VARCHAR(200),
      candidate_name VARCHAR(100), phone VARCHAR(50), email VARCHAR(255),
      education VARCHAR(50), university VARCHAR(200),
      stage VARCHAR(50), interview_date TIMESTAMPTZ, interviewer VARCHAR(100),
      result VARCHAR(50), salary_expectation NUMERIC, notes TEXT,
      form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS jdy_meetings (
      id SERIAL PRIMARY KEY, title VARCHAR(500), room VARCHAR(200),
      organizer VARCHAR(100), attendees TEXT, meeting_date TIMESTAMPTZ,
      start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, duration_min INT,
      summary TEXT, action_items TEXT,
      form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS jdy_quality (
      id SERIAL PRIMARY KEY, inspection_type VARCHAR(50), product_name VARCHAR(255),
      supplier_name VARCHAR(255), batch_code VARCHAR(100),
      inspector VARCHAR(100), inspection_date TIMESTAMPTZ,
      result VARCHAR(50), defect_desc TEXT, corrective_action TEXT,
      form_name VARCHAR(200), jdy_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];
  for (const ddl of ddls) await db.query(ddl);
}

// ── Generic bulk upsert ──────────────────────────────
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

    // Skip if no meaningful data
    const vals = Object.values(row).filter(v => v != null && v !== "" && v !== formName && v !== jdyId);
    if (vals.length < 2) { skipped++; continue; }

    const cols = Object.keys(row);
    const placeholders = cols.map((_, i) => "$" + (i + 1));
    const values = cols.map(c => row[c]);

    try {
      await db.query(
        `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders.join(",")}) ON CONFLICT (jdy_id) DO NOTHING`,
        values
      );
      created++;
    } catch (e) {
      skipped++;
    }
  }
  return { created, skipped };
}

// ── Entity configs ──────────────────────────────────
const ENTITIES = {
  task: {
    table: "jdy_tasks",
    label: "任务",
    columns: {
      task_name: (r) => str(r["任务名称"] || r["任务标题"] || r["名称"] || r["标题"]),
      task_type: (r, fn) => fn.includes("验收") ? "acceptance" : fn.includes("变更") ? "change" : "task",
      assignee: (r) => userName(r["负责人"] || r["执行人"] || r["任务负责人"] || r["销售人员"]),
      department: (r) => str(r["部门"] || r["所属部门"]),
      status: (r) => str(r["状态"] || r["任务状态"] || r["进度状态"]) || "pending",
      start_date: (r) => dt(r["开始日期"] || r["计划开始"] || r["createTime"]),
      due_date: (r) => dt(r["截止日期"] || r["计划结束"] || r["截止时间"]),
      description: (r) => str(r["描述"] || r["任务描述"] || r["备注"] || r["说明"], 2000),
      progress: (r) => num(r["完成率"] || r["进度"]),
      project_name: (r) => str(r["所属项目"] || r["项目名称"] || r["项目"]),
    },
  },
  finance: {
    table: "jdy_finance_records",
    label: "财务",
    columns: {
      record_type: (r, fn) => {
        if (/报销/.test(fn)) return "expense";
        if (/付款/.test(fn)) return "payment";
        if (/收款/.test(fn)) return "receipt";
        if (/发票/.test(fn)) return "invoice";
        if (/对账/.test(fn)) return "reconciliation";
        return "other";
      },
      record_code: (r) => str(r["流水号"] || r["单据编号"] || r["编号"]),
      title: (r) => str(r["活动名称"] || r["摘要"] || r["项目名称"] || r["标题"] || r["收支明细"], 500),
      amount: (r) => num(r["费用总计"] || r["金额"] || r["合计金额"] || r["付款金额"] || r["收款金额"] || r["合计"]),
      category: (r) => str(r["费用类别"] || r["科目"] || r["类别"] || r["类型"]),
      payer: (r) => userName(r["申请人"] || r["付款方"] || r["提交人"] || r["creator"]),
      payee: (r) => str(r["收款方"] || r["供应商"] || r["收款人"]),
      record_date: (r) => dt(r["日期"] || r["单据日期"] || r["申请日期"] || r["createTime"]),
      status: (r) => str(r["审批状态"] || r["状态"] || r["审批结果"]) || "submitted",
      notes: (r) => str(r["备注"] || r["说明"], 2000),
    },
  },
  hrmAttendance: {
    table: "jdy_attendance",
    label: "考勤",
    columns: {
      employee_name: (r) => userName(r["姓名"] || r["员工"] || r["打卡人"] || r["申请人"] || r["creator"]),
      record_type: (r, fn) => {
        if (/请假/.test(fn)) return "leave";
        if (/加班/.test(fn)) return "overtime";
        if (/出差/.test(fn)) return "business_trip";
        if (/补卡/.test(fn)) return "makeup";
        if (/调休/.test(fn)) return "comp_leave";
        if (/打卡/.test(fn)) return "clock_in";
        if (/工作日历/.test(fn)) return "calendar";
        return "attendance";
      },
      record_date: (r) => dt(r["日期"] || r["打卡日期"] || r["开始日期"] || r["申请日期"] || r["createTime"]),
      start_time: (r) => dt(r["开始时间"] || r["上班打卡时间"]),
      end_time: (r) => dt(r["结束时间"] || r["下班打卡时间"]),
      duration_hours: (r) => num(r["时长"] || r["小时数"] || r["天数"]),
      location: (r) => addr(r["打卡地点"] || r["地点"] || r["工作地点"]),
      status: (r) => str(r["审批状态"] || r["状态"]) || "recorded",
    },
  },
  inventory: {
    table: "jdy_inventory",
    label: "库存",
    columns: {
      warehouse: (r) => str(r["仓库"] || r["仓库信息"] || r["入库仓库"]),
      product_name: (r) => str(r["产品名称"] || r["物料名称"] || r["品名"] || r["名称"]),
      product_code: (r) => str(r["产品编码"] || r["物料编码"] || r["编号"]),
      spec: (r) => str(r["规格型号"] || r["规格"]),
      unit: (r) => str(r["单位"] || r["计量单位"]),
      quantity: (r) => num(r["数量"] || r["入库数量"] || r["出库数量"] || r["盘点数量"] || r["期末数量"]),
      unit_price: (r) => num(r["单价"]),
      total_amount: (r) => num(r["金额"] || r["总金额"]),
      transaction_type: (r, fn) => {
        if (/入库/.test(fn)) return "inbound";
        if (/出库/.test(fn)) return "outbound";
        if (/调拨/.test(fn)) return "transfer";
        if (/盘点/.test(fn)) return "count";
        return "record";
      },
      transaction_date: (r) => dt(r["日期"] || r["入库时间"] || r["出库时间"] || r["createTime"]),
    },
  },
  hrmPerformance: {
    table: "jdy_performance",
    label: "绩效",
    columns: {
      employee_name: (r) => userName(r["姓名"] || r["被考核人"] || r["员工"] || r["creator"]),
      department: (r) => str(r["部门"] || r["所属部门"]),
      period: (r) => str(r["考核周期"] || r["周期"] || r["年份"]),
      score: (r) => num(r["得分"] || r["总分"] || r["分数"] || r["绩效得分"]),
      grade: (r) => str(r["等级"] || r["评级"] || r["绩效等级"]),
      indicator_name: (r) => str(r["指标名称"] || r["考核项目"] || r["KPI"]),
      target_value: (r) => num(r["目标值"] || r["目标（W）"]),
      actual_value: (r) => num(r["实际值"] || r["实际完成值（W）"]),
      bonus_amount: (r) => num(r["2025年终奖总金额（260213）"] || r["奖金"] || r["年终奖"]),
      evaluator: (r) => userName(r["考核人"] || r["评估人"]),
    },
  },
  bom: {
    table: "jdy_bom",
    label: "BOM",
    columns: {
      product_name: (r) => str(r["产品名称"] || r["成品名称"] || r["名称"]),
      product_code: (r) => str(r["产品编码"] || r["成品编码"] || r["编码"]),
      material_name: (r) => str(r["物料名称"] || r["子件名称"] || r["材料名称"]),
      material_code: (r) => str(r["物料编码"] || r["子件编码"]),
      quantity: (r) => num(r["用量"] || r["数量"] || r["总行数"]),
      unit: (r) => str(r["单位"]),
      level: (r) => num(r["层级"] || r["BOM层级"]),
    },
  },
  productionOrder: {
    table: "jdy_production",
    label: "生产",
    columns: {
      work_order_code: (r) => str(r["生产工单编号"] || r["工单编号"] || r["生产计划编号"]),
      product_name: (r) => str(r["产品名称"] || r["产品"] || r["品名"]),
      process_name: (r) => str(r["工序名称"] || r["工序"] || r["工艺"]),
      worker: (r) => userName(r["报工人"] || r["操作员"] || r["生产人员"] || r["creator"]),
      quantity: (r) => num(r["数量"] || r["生产数量"]),
      planned_qty: (r) => num(r["计划数量"]),
      completed_qty: (r) => num(r["完成数量"] || r["合格数量"]),
      reject_qty: (r) => num(r["不良数量"] || r["报废数量"]),
      start_time: (r) => dt(r["开始时间"] || r["开工时间"]),
      end_time: (r) => dt(r["结束时间"] || r["完工时间"]),
      status: (r) => str(r["生产计划状态"] || r["状态"] || r["工单状态"]) || "active",
    },
  },
  purchaseOrder: {
    table: "jdy_purchase",
    label: "采购",
    columns: {
      po_code: (r) => str(r["采购订单编号"] || r["入库申请单编号"] || r["订单编号"]),
      pr_code: (r) => str(r["采购申请编号"]),
      supplier_name: (r) => str(r["供应商"] || r["供应商名称"]),
      material_name: (r) => str(r["物料名称"] || r["产品名称"] || r["采购订单名称"]),
      material_code: (r) => str(r["物料编码"] || r["产品编码"]),
      quantity: (r) => num(r["数量"] || r["采购数量"]),
      unit_price: (r) => num(r["单价"]),
      total_amount: (r) => num(r["金额"] || r["总金额"] || r["合计金额"]),
      order_date: (r) => dt(r["下单日期"] || r["订单日期"] || r["入库时间"] || r["createTime"]),
      delivery_date: (r) => dt(r["交货日期"] || r["预计到货日期"]),
      status: (r) => str(r["申请单状态"] || r["订单状态"] || r["状态"]) || "pending",
    },
  },
  hrmPayroll: {
    table: "jdy_payroll",
    label: "薪资",
    columns: {
      employee_name: (r) => userName(r["姓名"] || r["员工姓名"] || r["creator"]),
      department: (r) => str(r["部门"]),
      pay_period: (r) => str(r["薪资月份"] || r["月份"] || r["期间"]),
      base_salary: (r) => num(r["基本工资"] || r["底薪"]),
      bonus: (r) => num(r["奖金"] || r["绩效奖金"]),
      deductions: (r) => num(r["扣款"] || r["扣除合计"]),
      net_pay: (r) => num(r["实发工资"] || r["实际到手"]),
      tax: (r) => num(r["个人所得税"] || r["个税"]),
      social_insurance: (r) => num(r["社保个人"] || r["社保"]),
      housing_fund: (r) => num(r["公积金个人"] || r["公积金"]),
    },
  },
  hrmRecruitment: {
    table: "jdy_recruitment",
    label: "招聘",
    columns: {
      position_name: (r) => str(r["招聘岗位"] || r["应聘岗位"] || r["岗位名称"] || r["职位"]),
      department: (r) => str(r["需求部门"] || r["用人部门"] || r["部门"]),
      candidate_name: (r) => str(r["候选人姓名"] || r["姓名"] || r["应聘人"]),
      phone: (r) => str(r["联系电话"] || r["手机号"]),
      email: (r) => str(r["邮箱"]),
      education: (r) => str(r["学历"] || r["最高学历"]),
      university: (r) => str(r["毕业院校"]),
      stage: (r, fn) => {
        if (/简历/.test(fn)) return "resume";
        if (/面试/.test(fn)) return "interview";
        if (/offer/.test(fn)) return "offer";
        return "applied";
      },
      interview_date: (r) => dt(r["面试时间"] || r["面试日期"]),
      interviewer: (r) => userName(r["面试官"] || r["面试人"]),
      result: (r) => str(r["面试结果"] || r["筛选结果"] || r["审批结果"]),
      salary_expectation: (r) => num(r["期望薪资"]),
      notes: (r) => str(r["备注"] || r["面试评价"] || r["评价"], 2000),
    },
  },
  meeting: {
    table: "jdy_meetings",
    label: "会议",
    columns: {
      title: (r) => str(r["会议内容"] || r["会议主题"] || r["标题"], 500),
      room: (r) => str(r["会议室"] || r["会议地点"]),
      organizer: (r) => userName(r["预约人"] || r["发起人"] || r["creator"]),
      attendees: (r) => {
        const a = r["参会人员"] || r["成员多选"] || r["与会人员"];
        if (!a) return null;
        if (Array.isArray(a)) return a.map(x => x.name || x).join(", ");
        return str(a, 2000);
      },
      meeting_date: (r) => dt(r["日期"] || r["会议日期"] || r["预约日期"] || r["createTime"]),
      start_time: (r) => dt(r["开始时间"]),
      end_time: (r) => dt(r["结束时间"]),
      summary: (r) => str(r["记录和todo"] || r["会议纪要"] || r["会议记录"], 5000),
      action_items: (r) => str(r["待办事项"] || r["后续行动"], 2000),
    },
  },
  quality: {
    table: "jdy_quality",
    label: "质量",
    columns: {
      inspection_type: (r, fn) => {
        if (/来料/.test(fn)) return "incoming";
        if (/样品/.test(fn)) return "sample";
        if (/8D/.test(fn)) return "8d_report";
        return "inspection";
      },
      product_name: (r) => str(r["产品名称"] || r["物料名称"]),
      supplier_name: (r) => str(r["供应商名称"] || r["供应商"]),
      batch_code: (r) => str(r["批次号"] || r["邮寄单号"]),
      inspector: (r) => userName(r["检验员"] || r["审批人"] || r["creator"]),
      inspection_date: (r) => dt(r["检验日期"] || r["邮寄时间"] || r["审批时间"] || r["createTime"]),
      result: (r) => str(r["检验结果"] || r["样品检验结果"] || r["样品签收确认"]),
      defect_desc: (r) => str(r["不合格描述"] || r["不通过原因"] || r["问题描述"], 2000),
      corrective_action: (r) => str(r["纠正措施"] || r["改善措施"], 2000),
    },
  },
};

// ── Main ────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Phase C-Full: 全量缓存 → GRT 业务表转换              ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  log("OK", "数据库已连接");

  try {
    await ensureTables(db);
    log("OK", "所有目标表已就绪");

    if (flags.statsOnly) { await showStats(db); return; }

    const entitiesToProcess = flags.entities || Object.keys(ENTITIES);
    const results = {};

    for (const entity of entitiesToProcess) {
      const config = ENTITIES[entity];
      if (!config) { log("SKIP", entity); continue; }

      section(`转换 ${config.label} (${entity})`);

      // Load cached records
      const cached = await db.query(
        "SELECT c.jdy_record_id, c.record_data, c.jdy_form_name, m.field_schema " +
        "FROM jiandaoyun_form_data_cache c " +
        "LEFT JOIN jiandaoyun_form_mappings m ON c.jdy_app_id=m.jdy_app_id AND c.jdy_form_id=m.jdy_form_id " +
        "WHERE c.target_entity='" + entity + "'"
      );
      log("INFO", `${cached.rows.length} cached records`);

      const resolved = cached.rows.map(row => ({
        data: resolveRecord(row.record_data, row.field_schema),
        formName: row.jdy_form_name,
        jdyId: row.jdy_record_id,
      }));

      const result = await bulkInsert(db, config.table, resolved, config.columns);
      results[entity] = result;
      log("OK", `${config.label}: 写入 ${result.created}, 跳过 ${result.skipped}`);
    }

    // Summary
    section("转换完成报告");
    console.log("\n  ┌──────────────────────┬──────────┬──────────┐");
    console.log("  │ Entity               │ 写入     │ 跳过     │");
    console.log("  ├──────────────────────┼──────────┼──────────┤");
    let tc = 0, ts = 0;
    for (const [e, r] of Object.entries(results)) {
      console.log(`  │ ${e.padEnd(20)} │ ${String(r.created).padStart(8)} │ ${String(r.skipped).padStart(8)} │`);
      tc += r.created; ts += r.skipped;
    }
    console.log("  ├──────────────────────┼──────────┼──────────┤");
    console.log(`  │ ${"TOTAL".padEnd(20)} │ ${String(tc).padStart(8)} │ ${String(ts).padStart(8)} │`);
    console.log("  └──────────────────────┴──────────┴──────────┘");

    await showStats(db);
  } finally {
    await db.end();
  }
}

async function showStats(db) {
  section("GRT 全量业务表数据");
  const tables = [
    // Phase C original
    ["projects", "项目"], ["customers", "客户"], ["suppliers", "供应商"],
    ["contracts", "合同"], ["employee_profiles", "员工档案"],
    ["sales_orders", "销售订单"], ["customer_tickets", "售后工单"],
    // Phase C-Full new
    ["jdy_tasks", "任务"], ["jdy_finance_records", "财务"],
    ["jdy_attendance", "考勤"], ["jdy_inventory", "库存"],
    ["jdy_performance", "绩效"], ["jdy_bom", "BOM"],
    ["jdy_production", "生产"], ["jdy_purchase", "采购"],
    ["jdy_payroll", "薪资"], ["jdy_recruitment", "招聘"],
    ["jdy_meetings", "会议"], ["jdy_quality", "质量"],
    // Existing
    ["purchase_orders", "采购订单(旧)"], ["materials", "物料"], ["bom_items", "BOM(旧)"],
  ];
  let total = 0;
  for (const [t, label] of tables) {
    try {
      const r = await db.query('SELECT COUNT(*) as cnt FROM "' + t + '"');
      const cnt = parseInt(r.rows[0].cnt);
      if (cnt > 0) {
        console.log(`  ${label.padEnd(14)} ${t.padEnd(25)} ${String(cnt).padStart(6)}`);
        total += cnt;
      }
    } catch {}
  }
  console.log(`  ${"─".repeat(47)}`);
  console.log(`  ${"TOTAL".padEnd(14)} ${"".padEnd(25)} ${String(total).padStart(6)}`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
