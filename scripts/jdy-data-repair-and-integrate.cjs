/**
 * Layer 1: 数据修复 — 回溯cache原始数据修复量值字段
 * Layer 2: 关系链接 — 项目↔任务↔人员↔工单
 * Layer 3: 灌入GRT核心表 — production_work_orders, labor_costs, work_logs
 *
 * node scripts/jdy-data-repair-and-integrate.cjs
 */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const vars = {};
  for (const f of [".env.development", ".env"]) {
    try { fs.readFileSync(path.resolve(__dirname, "..", f), "utf-8").split("\n").forEach(l => { const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (m && !vars[m[1]]) vars[m[1]] = m[2].trim(); }); } catch {}
  }
  return vars;
}
const DB_URL = loadEnv().DATABASE_URL;

function log(tag, msg) { console.log(`  [${new Date().toISOString().substring(11,19)}] ${tag.padEnd(7)} ${msg}`); }
function section(t) { console.log(`\n${"═".repeat(60)}\n  ${t}\n${"═".repeat(60)}`); }
function str(v, max=255) { if(v==null) return null; if(typeof v==='object'&&v.name) return String(v.name).substring(0,max); return String(v).substring(0,max); }
function num(v) { if(v==null) return null; const n=parseFloat(v); return isNaN(n)?null:n; }
function dt(v) { if(!v) return null; const d=new Date(v); return isNaN(d.getTime())?null:d.toISOString(); }
function userName(v) { if(!v) return null; if(typeof v==='object') return v.name||null; return String(v); }

function resolveRecord(record, fieldSchema) {
  const data = typeof record === "string" ? JSON.parse(record) : record;
  const schema = typeof fieldSchema === "string" ? JSON.parse(fieldSchema) : fieldSchema;
  if (!schema) return data;
  const m = {}; schema.forEach(f => { m[f.id] = f.label; });
  const r = {}; Object.entries(data).forEach(([k, v]) => { r[m[k] || k] = v; });
  return r;
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Layer 1-3: 数据修复 + 关系链接 + GRT核心表灌入       ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  log("OK", "数据库已连接");

  // ═══════════════════════════════════════════════════════════
  // LAYER 1A: 修复财务 — 从cache重新提取title/amount
  // ═══════════════════════════════════════════════════════════
  section("Layer 1A: 修复财务记录 title/amount");
  const finRows = await db.query(
    `SELECT f.id, c.record_data, m.field_schema, c.jdy_form_name
     FROM jdy_finance_records f
     JOIN jiandaoyun_form_data_cache c ON f.jdy_id = c.jdy_record_id
     LEFT JOIN jiandaoyun_form_mappings m ON c.jdy_app_id=m.jdy_app_id AND c.jdy_form_id=m.jdy_form_id
     WHERE m.field_schema IS NOT NULL`
  );
  let finFixed = 0;
  for (const row of finRows.rows) {
    const r = resolveRecord(row.record_data, row.field_schema);
    const title = str(r["活动名称"] || r["摘要"] || r["收票登记编号"] || r["报销事由"] || r["项目名称"]
      || r["采购订单名称"] || r["供应商名称"] || r["科目"] || r["费用类别"] || row.jdy_form_name, 500);
    const amount = num(r["费用总计"] || r["金额合计"] || r["合计金额"] || r["本次收票金额/元"]
      || r["付款金额"] || r["收款金额"] || r["合同金额/元"] || r["总金额"]);
    const category = str(r["费用类别"] || r["科目"] || r["会计科目"] || r["发票类型"]);
    const payee = str(r["供应商名称"] || r["收款方"] || r["收款人"]);

    if (title || amount) {
      await db.query(
        `UPDATE jdy_finance_records SET title=COALESCE($1,title), amount=COALESCE($2,amount),
         category=COALESCE($3,category), payee=COALESCE($4,payee), updated_at=NOW() WHERE id=$5`,
        [title, amount, category, payee, row.id]
      );
      finFixed++;
    }
  }
  log("OK", `财务修复: ${finFixed}/${finRows.rows.length}`);

  // ═══════════════════════════════════════════════════════════
  // LAYER 1B: 修复生产报工 — 提取报工数量/工时/工序/物料
  // ═══════════════════════════════════════════════════════════
  section("Layer 1B: 修复生产报工数据");
  const prodRows = await db.query(
    `SELECT p.id, c.record_data, m.field_schema, c.jdy_form_name
     FROM jdy_production p
     JOIN jiandaoyun_form_data_cache c ON p.jdy_id = c.jdy_record_id
     LEFT JOIN jiandaoyun_form_mappings m ON c.jdy_app_id=m.jdy_app_id AND c.jdy_form_id=m.jdy_form_id
     WHERE m.field_schema IS NOT NULL`
  );
  let prodFixed = 0;
  for (const row of prodRows.rows) {
    const r = resolveRecord(row.record_data, row.field_schema);
    const qty = num(r["报工数量"] || r["数量"] || r["计划数量"] || r["生产数量"]);
    const product = str(r["生产物料名称"] || r["产品名称"] || r["品名"]);
    const process = str(r["工序名称"] || r["工序"] || r["工艺路线"]);
    const completedQty = num(r["良品数量"] || r["合格数量"]);
    const rejectQty = num(r["返工数量"] || r["不良数量"]);
    const worker = userName(r["报工人"] || r["操作员"] || r["班组长"]);

    await db.query(
      `UPDATE jdy_production SET quantity=COALESCE($1,quantity), product_name=COALESCE($2,product_name),
       process_name=COALESCE($3,process_name), completed_qty=COALESCE($4,completed_qty),
       reject_qty=COALESCE($5,reject_qty), worker=COALESCE($6,worker), updated_at=NOW() WHERE id=$7`,
      [qty, product, process, completedQty, rejectQty, worker, row.id]
    );
    prodFixed++;
  }
  log("OK", `生产修复: ${prodFixed}/${prodRows.rows.length}`);

  // ═══════════════════════════════════════════════════════════
  // LAYER 1C: 修复采购 — 提取数量/单价
  // ═══════════════════════════════════════════════════════════
  section("Layer 1C: 修复采购数据");
  const purRows = await db.query(
    `SELECT p.id, c.record_data, m.field_schema
     FROM jdy_purchase p
     JOIN jiandaoyun_form_data_cache c ON p.jdy_id = c.jdy_record_id
     LEFT JOIN jiandaoyun_form_mappings m ON c.jdy_app_id=m.jdy_app_id AND c.jdy_form_id=m.jdy_form_id
     WHERE m.field_schema IS NOT NULL`
  );
  let purFixed = 0;
  for (const row of purRows.rows) {
    const r = resolveRecord(row.record_data, row.field_schema);
    const qty = num(r["数量"] || r["采购数量"] || r["入库数量"]);
    const price = num(r["单价"] || r["含税单价"]);
    const total = num(r["金额"] || r["含税金额"] || r["总金额"]);
    const supplier = str(r["供应商名称"] || r["供应商"]);

    await db.query(
      `UPDATE jdy_purchase SET quantity=COALESCE($1,quantity), unit_price=COALESCE($2,unit_price),
       total_amount=COALESCE($3,total_amount), supplier_name=COALESCE($4,supplier_name), updated_at=NOW() WHERE id=$5`,
      [qty, price, total, supplier, row.id]
    );
    purFixed++;
  }
  log("OK", `采购修复: ${purFixed}/${purRows.rows.length}`);

  // ═══════════════════════════════════════════════════════════
  // LAYER 1D: 修复绩效 — 提取分数/周期/奖金
  // ═══════════════════════════════════════════════════════════
  section("Layer 1D: 修复绩效数据");
  const perfRows = await db.query(
    `SELECT p.id, c.record_data, m.field_schema
     FROM jdy_performance p
     JOIN jiandaoyun_form_data_cache c ON p.jdy_id = c.jdy_record_id
     LEFT JOIN jiandaoyun_form_mappings m ON c.jdy_app_id=m.jdy_app_id AND c.jdy_form_id=m.jdy_form_id
     WHERE m.field_schema IS NOT NULL`
  );
  let perfFixed = 0;
  for (const row of perfRows.rows) {
    const r = resolveRecord(row.record_data, row.field_schema);
    const score = num(r["得分"] || r["总分"] || r["分数"] || r["完成率"]);
    const period = str(r["考核周期"] || r["年份"] || r["月份"]);
    const bonus = num(r["2025年终奖总金额（260213）"] || r["奖金"] || r["年终奖"] || r["原申报金额（25.12）"]);
    const target = num(r["目标值"] || r["目标（W）"]);
    const actual = num(r["实际值"] || r["实际完成值（W）"]);

    if (score || period || bonus || target || actual) {
      await db.query(
        `UPDATE jdy_performance SET score=COALESCE($1,score), period=COALESCE($2,period),
         bonus_amount=COALESCE($3,bonus_amount), target_value=COALESCE($4,target_value),
         actual_value=COALESCE($5,actual_value), updated_at=NOW() WHERE id=$6`,
        [score, period, bonus, target, actual, row.id]
      );
      perfFixed++;
    }
  }
  log("OK", `绩效修复: ${perfFixed}/${perfRows.rows.length}`);

  // ═══════════════════════════════════════════════════════════
  // LAYER 2A: 员工↔用户 补全关联
  // ═══════════════════════════════════════════════════════════
  section("Layer 2A: 员工档案↔用户关联补全");
  const unlinked = await db.query("SELECT id, name FROM employee_profiles WHERE user_id IS NULL");
  let linked = 0;
  for (const emp of unlinked.rows) {
    const user = await db.query("SELECT id FROM users WHERE name=$1 LIMIT 1", [emp.name]);
    if (user.rows.length > 0) {
      await db.query("UPDATE employee_profiles SET user_id=$1, updated_at=NOW() WHERE id=$2", [user.rows[0].id, emp.id]);
      linked++;
    }
  }
  log("OK", `员工关联: ${linked}/${unlinked.rows.length} 新关联`);

  // ═══════════════════════════════════════════════════════════
  // LAYER 2B: 项目↔任务 关联（通过项目编号/名称模糊匹配）
  // ═══════════════════════════════════════════════════════════
  section("Layer 2B: 项目↔任务关联");
  // Update tasks that have project_name matching a project
  const projLinkResult = await db.query(`
    UPDATE jdy_tasks t SET project_name = p.name
    FROM projects p
    WHERE t.project_name IS NOT NULL
      AND (t.project_name = p."projectCode" OR t.project_name = p.name)
      AND t.project_name != p.name
  `);
  // Count how many tasks can be linked
  const linkable = await db.query(`
    SELECT COUNT(*) as cnt FROM jdy_tasks t
    WHERE EXISTS (SELECT 1 FROM projects p WHERE p."projectCode" = t.project_name OR p.name = t.project_name)
  `);
  log("OK", `可关联任务: ${linkable.rows[0].cnt}/4328`);

  // ═══════════════════════════════════════════════════════════
  // LAYER 3A: 灌入 production_work_orders（GRT原生工单表）
  // ═══════════════════════════════════════════════════════════
  section("Layer 3A: 灌入 production_work_orders");
  const existingWO = await db.query("SELECT COUNT(*) as cnt FROM production_work_orders");
  log("INFO", `现有工单: ${existingWO.rows[0].cnt}`);

  const prodData = await db.query(`
    SELECT work_order_code, product_name, process_name, worker, quantity,
           completed_qty, reject_qty, status, start_time, end_time, jdy_id
    FROM jdy_production WHERE work_order_code IS NOT NULL
  `);
  let woCreated = 0;
  for (const p of prodData.rows) {
    try {
      await db.query(`
        INSERT INTO production_work_orders
          (work_order_code, product_name, quantity, status, planned_start_date, planned_end_date,
           actual_hours, completion_rate, notes, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, NOW(), NOW())
        ON CONFLICT (work_order_code) DO NOTHING`,
        [
          p.work_order_code,
          p.product_name || 'N/A',
          p.quantity || 0,
          p.status === '已完结' ? 'completed' : p.status === '已派工' ? 'in_progress' : 'pending',
          p.start_time, p.end_time,
          0, // actual_hours
          p.completed_qty && p.quantity ? Math.round(p.completed_qty / p.quantity * 100) : 0,
          `JDY工序:${p.process_name||''} 工人:${p.worker||''}`,
        ]
      );
      woCreated++;
    } catch {}
  }
  log("OK", `工单写入: ${woCreated}`);

  // ═══════════════════════════════════════════════════════════
  // LAYER 3B: 灌入 labor_costs（工时成本表）
  // ═══════════════════════════════════════════════════════════
  section("Layer 3B: 灌入 labor_costs（工时记录）");

  // From 生产报工 → labor_costs
  const reportRows = await db.query(`
    SELECT c.record_data, m.field_schema, c.jdy_record_id
    FROM jiandaoyun_form_data_cache c
    LEFT JOIN jiandaoyun_form_mappings m ON c.jdy_app_id=m.jdy_app_id AND c.jdy_form_id=m.jdy_form_id
    WHERE c.jdy_form_name IN ('生产报工', '装配报工', '外协生产报工表', '03-3 工时表', '4-报工单')
      AND m.field_schema IS NOT NULL
  `);
  let laborCreated = 0;
  for (const row of reportRows.rows) {
    const r = resolveRecord(row.record_data, row.field_schema);
    const hours = num(r["报工工时/h"] || r["所用工时（小时）"] || r["工时"]);
    const workerName = userName(r["报工人"] || r["员工"] || r["员工姓名"]);
    const workDate = dt(r["报工时间"] || r["填报日期"] || r["createTime"]);
    const phaseCode = str(r["项目阶段"] || r["工序名称"] || r["阶段任务"]);
    const projectCode = str(r["项目编号"] || r["生产工单编号"]);
    const desc = str(r["描述"] || r["问题描述"] || r["项目内容"], 500);

    if (!hours && !workerName) continue;

    // Find user_id
    let userId = 1;
    if (workerName) {
      const u = await db.query("SELECT id FROM users WHERE name=$1 LIMIT 1", [workerName]);
      if (u.rows.length > 0) userId = u.rows[0].id;
    }

    try {
      await db.query(`
        INSERT INTO labor_costs
          ("projectId", "userId", "workDate", hours, "hourlyRate", "totalCost", "phaseCode", description, status, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', NOW(), NOW())`,
        [
          null, // projectId — can link later
          userId,
          workDate ? new Date(workDate) : new Date(),
          hours || 0,
          0, // hourlyRate
          0, // totalCost
          phaseCode,
          `[JDY] ${projectCode||''} ${desc||''}`.trim(),
        ]
      );
      laborCreated++;
    } catch {}
  }
  log("OK", `工时记录写入: ${laborCreated}`);

  // ═══════════════════════════════════════════════════════════
  // LAYER 3C: 灌入 work_logs（报工日志）
  // ═══════════════════════════════════════════════════════════
  section("Layer 3C: 灌入 work_logs（报工日志）");
  let wlCreated = 0;
  for (const row of reportRows.rows) {
    const r = resolveRecord(row.record_data, row.field_schema);
    const workerName = userName(r["报工人"] || r["员工"] || r["员工姓名"]);
    const logTime = dt(r["报工时间"] || r["填报日期"] || r["createTime"]);
    const duration = num(r["报工工时/h"] || r["所用工时（小时）"]);
    const logCode = str(r["生产报工单编号"] || r["工时信息流水号"]);

    if (!workerName) continue;

    let workerId = null;
    const u = await db.query("SELECT id FROM users WHERE name=$1 LIMIT 1", [workerName]);
    if (u.rows.length > 0) workerId = u.rows[0].id;

    try {
      await db.query(`
        INSERT INTO work_logs
          (log_code, worker_id, worker_name, "logType", log_time, duration, notes, is_manual_entry, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())`,
        [
          logCode || 'JDY-' + row.jdy_record_id.substring(0, 8),
          workerId,
          workerName,
          'production',
          logTime ? new Date(logTime) : new Date(),
          duration ? Math.round(duration * 60) : null, // convert hours to minutes
          str(r["工序名称"] || r["项目阶段"] || r["阶段任务"], 500),
        ]
      );
      wlCreated++;
    } catch {}
  }
  log("OK", `报工日志写入: ${wlCreated}`);

  // ═══════════════════════════════════════════════════════════
  // FINAL: 全量统计
  // ═══════════════════════════════════════════════════════════
  section("全量数据统计");
  const stats = [
    ["projects", "项目"],
    ["production_work_orders", "生产工单(GRT)"],
    ["labor_costs", "工时成本(GRT)"],
    ["work_logs", "报工日志(GRT)"],
    ["weekly_labor_records", "周工时(GRT)"],
    ["employee_profiles", "员工档案"],
    ["jdy_tasks", "任务"],
    ["jdy_finance_records", "财务"],
    ["jdy_attendance", "考勤"],
    ["jdy_inventory", "库存"],
    ["jdy_performance", "绩效"],
    ["jdy_production", "生产报工(JDY)"],
    ["jdy_purchase", "采购"],
    ["jdy_payroll", "薪资"],
    ["jdy_recruitment", "招聘"],
    ["jdy_meetings", "会议"],
    ["jdy_quality", "质量"],
    ["customers", "客户"],
    ["suppliers", "供应商"],
    ["sales_orders", "销售订单"],
    ["contracts", "合同"],
    ["customer_tickets", "售后工单"],
  ];
  let total = 0;
  console.log("\n  ┌──────────────────────┬──────────┐");
  console.log("  │ 数据表               │ 记录数   │");
  console.log("  ├──────────────────────┼──────────┤");
  for (const [t, label] of stats) {
    try {
      const r = await db.query('SELECT COUNT(*) as cnt FROM "' + t + '"');
      const cnt = parseInt(r.rows[0].cnt);
      if (cnt > 0) {
        console.log(`  │ ${label.padEnd(20)} │ ${String(cnt).padStart(8)} │`);
        total += cnt;
      }
    } catch {}
  }
  console.log("  ├──────────────────────┼──────────┤");
  console.log(`  │ ${"总计".padEnd(20)} │ ${String(total).padStart(8)} │`);
  console.log("  └──────────────────────┴──────────┘");

  // Data quality re-check
  console.log("\n  数据质量修复验证:");
  const finFilled = await db.query("SELECT COUNT(*) as cnt FROM jdy_finance_records WHERE title IS NOT NULL AND title != ''");
  const finTotal = await db.query("SELECT COUNT(*) as cnt FROM jdy_finance_records");
  console.log(`  财务 title: ${finFilled.rows[0].cnt}/${finTotal.rows[0].cnt} (${Math.round(finFilled.rows[0].cnt/finTotal.rows[0].cnt*100)}%)`);

  const prodQty = await db.query("SELECT COUNT(*) as cnt FROM jdy_production WHERE quantity IS NOT NULL");
  const prodTotal = await db.query("SELECT COUNT(*) as cnt FROM jdy_production");
  console.log(`  生产 quantity: ${prodQty.rows[0].cnt}/${prodTotal.rows[0].cnt} (${Math.round(prodQty.rows[0].cnt/prodTotal.rows[0].cnt*100)}%)`);

  const empLinked = await db.query("SELECT COUNT(*) as cnt FROM employee_profiles WHERE user_id IS NOT NULL");
  const empTotal = await db.query("SELECT COUNT(*) as cnt FROM employee_profiles");
  console.log(`  员工 user_id: ${empLinked.rows[0].cnt}/${empTotal.rows[0].cnt} (${Math.round(empLinked.rows[0].cnt/empTotal.rows[0].cnt*100)}%)`);

  await db.end();
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
