/**
 * CRM Demo Data Seed Script
 *
 * Seeds realistic demo data into the CRM v2 tables for the GRT System CEO demo.
 *
 * Tables seeded:
 *   1. crm_customers_v2    - 8 customers
 *   2. crm_contacts_v2     - 12 contacts
 *   3. crm_leads            - 6 leads
 *   4. crm_opportunities_v2 - 6 opportunities
 *   5. crm_interactions     - 10 interactions
 *
 * Usage:
 *   npx tsx scripts/seed-crm-data.ts
 */

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Connected to database.");

  // Idempotency check
  const exists = await client.query("SELECT id FROM crm_customers_v2 WHERE code = $1 LIMIT 1", ["CUS-001"]);
  if (exists.rows.length > 0) {
    console.log("CRM demo data already seeded (CUS-001 exists). Skipping.");
    await client.end();
    return;
  }

  // Look up user IDs for assigned_to / created_by
  const userRows = await client.query(
    "SELECT id, name FROM users LIMIT 5"
  );
  const userIds = userRows.rows.map((r: any) => r.id as number);
  const uid = (idx: number) => userIds[idx % userIds.length] || 1;
  console.log("User IDs:", userIds);

  try {
    await client.query("BEGIN");

    // =========================================================================
    // 1. Customers (8 rows)
    // =========================================================================
    const customers = [
      { code: "CUS-001", name: "Detroit Engine Corp", shortName: "DEC", type: "customer", level: "A", industry: "Automotive OEM", region: "North America", address: "1200 W Fort St, Detroit, MI 48226", website: "https://detroitengine.com", phone: "+1-313-555-0101", email: "info@detroitengine.com", taxId: "US-EIN-383901245", annualRevenue: "850000000.00", employeeCount: 12000, source: "exhibition", assignedTo: uid(0), status: "active", notes: "Key OEM partner for NA market" },
      { code: "CUS-002", name: "一汽集团", shortName: "一汽", type: "customer", level: "S", industry: "汽车制造", region: "东北", address: "吉林省长春市汽车产业开发区", website: "https://www.faw.com.cn", phone: "0431-85990000", email: "contact@faw.com.cn", taxId: "91220101123456789A", annualRevenue: "620000000000.00", employeeCount: 120000, source: "referral", assignedTo: uid(0), status: "active", notes: "国内最大客户，S级战略伙伴" },
      { code: "CUS-003", name: "上汽通用", shortName: "SGM", type: "customer", level: "A", industry: "汽车制造", region: "华东", address: "上海市浦东新区申江路1500号", website: "https://www.sgmw.com.cn", phone: "021-28901000", email: "info@sgm.com.cn", taxId: "91310000717806310B", annualRevenue: "180000000000.00", employeeCount: 28000, source: "direct", assignedTo: uid(1), status: "active", notes: "IATF 16949认证合作伙伴" },
      { code: "CUS-004", name: "宝马沈阳工厂", shortName: "BMW-SY", type: "customer", level: "A", industry: "汽车制造", region: "东北", address: "辽宁省沈阳市大东区", website: "https://www.bmw-brilliance.cn", phone: "024-84851888", email: "procurement@bmw-sy.cn", taxId: "91210100MA0UXK3R2C", annualRevenue: "250000000000.00", employeeCount: 18000, source: "exhibition", assignedTo: uid(1), status: "active", notes: "VDA 6.3审核通过" },
      { code: "CUS-005", name: "博世苏州工厂", shortName: "Bosch-SZ", type: "customer", level: "A", industry: "汽车零部件", region: "华东", address: "江苏省苏州市工业园区苏虹东路188号", website: "https://www.bosch.com.cn", phone: "0512-62880000", email: "sz.procurement@bosch.com", taxId: "91320500682036543X", annualRevenue: "78000000000.00", employeeCount: 8500, source: "direct", assignedTo: uid(2), status: "active", notes: "Tier-1供应商，技术合作伙伴" },
      { code: "CUS-006", name: "采埃孚上海", shortName: "ZF-SH", type: "prospect", level: "B", industry: "汽车零部件", region: "华东", address: "上海市嘉定区安亭路1001号", website: "https://www.zf.com/cn", phone: "021-39576000", email: "info.cn@zf.com", taxId: "91310000MA1FP9HN3L", annualRevenue: "45000000000.00", employeeCount: 5200, source: "website", assignedTo: uid(2), status: "active", notes: "潜在大客户，进行中" },
      { code: "CUS-007", name: "比亚迪深圳", shortName: "BYD-SZ", type: "prospect", level: "B", industry: "新能源汽车", region: "华南", address: "广东省深圳市坪山区比亚迪路3009号", website: "https://www.byd.com", phone: "0755-89888888", email: "supply@byd.com", taxId: "914403007178096575", annualRevenue: "602300000000.00", employeeCount: 290000, source: "cold_call", assignedTo: uid(3), status: "active", notes: "新能源车领域重点开拓" },
      { code: "CUS-008", name: "三一重工", shortName: "三一", type: "prospect", level: "C", industry: "工程机械", region: "华中", address: "湖南省长沙市经济开发区三一工业城", website: "https://www.sany.com.cn", phone: "0731-84031888", email: "info@sany.com.cn", taxId: "91430100185075880T", annualRevenue: "178000000000.00", employeeCount: 45000, source: "referral", assignedTo: uid(3), status: "active", notes: "工程机械跨行业客户" },
    ];

    const customerIds: number[] = [];
    for (const c of customers) {
      const res = await client.query(
        `INSERT INTO crm_customers_v2
         (code, name, short_name, type, level, industry, region, address, website, phone, email, tax_id, annual_revenue, employee_count, source, assigned_to, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         RETURNING id`,
        [c.code, c.name, c.shortName, c.type, c.level, c.industry, c.region, c.address, c.website, c.phone, c.email, c.taxId, c.annualRevenue, c.employeeCount, c.source, c.assignedTo, c.status, c.notes]
      );
      customerIds.push(res.rows[0].id);
    }
    console.log("Inserted 8 customers, IDs:", customerIds);

    // =========================================================================
    // 2. Contacts (12 rows)
    // =========================================================================
    const contacts = [
      { cIdx: 0, name: "John Mitchell", position: "VP Engineering", department: "Engineering", mobile: "+1-313-555-0201", landline: "+1-313-555-0200", email: "j.mitchell@detroitengine.com", wechat: null, isKey: true, notes: "Primary technical contact" },
      { cIdx: 0, name: "Sarah Chen", position: "Procurement Manager", department: "Supply Chain", mobile: "+1-313-555-0301", landline: "+1-313-555-0300", email: "s.chen@detroitengine.com", wechat: "sarah_chen_dec", isKey: false, notes: "Handles all PO approvals" },
      { cIdx: 1, name: "张建国", position: "总工程师", department: "技术中心", mobile: "13800138001", landline: "0431-85991001", email: "zhangjg@faw.com.cn", wechat: "zjg_faw", isKey: true, notes: "关键决策人，技术评审负责人" },
      { cIdx: 1, name: "李海燕", position: "采购经理", department: "采购部", mobile: "13800138002", landline: "0431-85991002", email: "lihy@faw.com.cn", wechat: "lhy_faw_buy", isKey: true, notes: "采购审批权限500万以下" },
      { cIdx: 2, name: "王志强", position: "技术总监", department: "研发中心", mobile: "13900139001", landline: "021-28901100", email: "wangzq@sgm.com.cn", wechat: "wzq_sgm", isKey: true, notes: "IATF 16949审核对接人" },
      { cIdx: 2, name: "赵雪梅", position: "品质部长", department: "品质保证部", mobile: "13900139002", landline: "021-28901200", email: "zhaoxm@sgm.com.cn", wechat: "zxm_sgm_qa", isKey: false, notes: "质量投诉处理主要联系人" },
      { cIdx: 3, name: "Hans Weber", position: "Senior Quality Engineer", department: "Quality", mobile: "13700137001", landline: "024-84851900", email: "hans.weber@bmw-sy.cn", wechat: "hans_bmw_sy", isKey: true, notes: "VDA 6.3 audit lead" },
      { cIdx: 4, name: "刘德华", position: "采购总监", department: "采购部", mobile: "13600136001", landline: "0512-62880100", email: "liudh@bosch-sz.com", wechat: "ldh_bosch", isKey: true, notes: "Tier-1采购决策人" },
      { cIdx: 4, name: "陈立学", position: "工程师", department: "产品开发部", mobile: "13600136002", landline: "0512-62880200", email: "chenlx@bosch-sz.com", wechat: "clx_bosch_rd", isKey: false, notes: "技术对接工程师" },
      { cIdx: 5, name: "周明达", position: "供应链经理", department: "供应链管理部", mobile: "13500135001", landline: "021-39576100", email: "zhoumd@zf-sh.com", wechat: "zmd_zf", isKey: true, notes: "新供应商导入对接人" },
      { cIdx: 6, name: "林婷婷", position: "新能源采购经理", department: "采购中心", mobile: "13400134001", landline: "0755-89888100", email: "lintt@byd.com", wechat: "ltt_byd", isKey: true, notes: "新能源零部件采购负责人" },
      { cIdx: 7, name: "范志峰", position: "设备采购主管", department: "采购部", mobile: "13300133001", landline: "0731-84031900", email: "fanzf@sany.com.cn", wechat: "fzf_sany", isKey: false, notes: "工程机械零部件采购" },
    ];

    const contactIds: number[] = [];
    for (const ct of contacts) {
      const res = await client.query(
        `INSERT INTO crm_contacts_v2
         (customer_id, name, position, department, mobile, landline, email, wechat, is_key_person, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [customerIds[ct.cIdx], ct.name, ct.position, ct.department, ct.mobile, ct.landline, ct.email, ct.wechat, ct.isKey, ct.notes]
      );
      contactIds.push(res.rows[0].id);
    }
    console.log("Inserted 12 contacts, IDs:", contactIds);

    // =========================================================================
    // 3. Leads (6 rows)
    // =========================================================================
    const leads = [
      { companyName: "广汽集团", contactName: "黄志超", contactPhone: "13200132001", contactEmail: "huangzc@gac.com.cn", source: "exhibition", productInterest: "发动机装配线自动化设备", estimatedBudget: "15000000.00", priority: "high", status: "qualified", aiConfidence: "0.8500", assignedTo: uid(0), notes: "广州车展收集，已完成技术交流" },
      { companyName: "吉利汽车", contactName: "谢建强", contactPhone: "13200132002", contactEmail: "xiejq@geely.com", source: "website", productInterest: "IATF 16949咨询服务", estimatedBudget: "3000000.00", priority: "medium", status: "contacted", aiConfidence: "0.6200", assignedTo: uid(1), notes: "官网表单提交，已回电" },
      { companyName: "宁德时代", contactName: "张永利", contactPhone: "13200132003", contactEmail: "zhangyl@catl.com", source: "referral", productInterest: "电池包装配质检系统", estimatedBudget: "28000000.00", priority: "high", status: "new", aiConfidence: "0.9100", assignedTo: uid(2), notes: "宝马沈阳Hans推荐" },
      { companyName: "长城汽车", contactName: "周立波", contactPhone: "13200132004", contactEmail: "zhoulb@gwm.cn", source: "cold_call", productInterest: "整车检测线升级", estimatedBudget: "8000000.00", priority: "low", status: "lost", aiConfidence: "0.3800", assignedTo: uid(3), notes: "已选择竞争对手" },
      { companyName: "南京依维柯", contactName: "戴晓燕", contactPhone: "13200132005", contactEmail: "daixy@iveco-nj.com", source: "direct", productInterest: "商用车排放检测设备", estimatedBudget: "5500000.00", priority: "medium", status: "new", aiConfidence: "0.5500", assignedTo: uid(1), notes: "南京依维柯商用车基地" },
      { companyName: "潍柴动力", contactName: "王建文", contactPhone: "13200132006", contactEmail: "wangjw@weichai.com", source: "exhibition", productInterest: "柴油发动机性能测试台架", estimatedBudget: "12000000.00", priority: "high", status: "contacted", aiConfidence: "0.7200", assignedTo: uid(0), notes: "上海内燃机展会收集" },
    ];

    const leadIds: number[] = [];
    for (const ld of leads) {
      const res = await client.query(
        `INSERT INTO crm_leads
         (company_name, contact_name, contact_phone, contact_email, source, product_interest, estimated_budget, priority, status, ai_confidence_score, assigned_to, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [ld.companyName, ld.contactName, ld.contactPhone, ld.contactEmail, ld.source, ld.productInterest, ld.estimatedBudget, ld.priority, ld.status, ld.aiConfidence, ld.assignedTo, ld.notes]
      );
      leadIds.push(res.rows[0].id);
    }
    console.log("Inserted 6 leads, IDs:", leadIds);

    // =========================================================================
    // 4. Opportunities (6 rows)
    // =========================================================================
    const opportunities = [
      { name: "一汽集团-发动机装配线自动化升级", customerId: customerIds[1], contactId: contactIds[2], stage: "negotiation", expectedAmount: "25000000.00", currency: "CNY", probability: 70, expectedCloseDate: "2026-04-15", actualCloseDate: null, productInterest: "装配线自动化+MES系统", competitorInfo: "西门子、三菱电机", assignedTo: uid(0), source: "referral", notes: "技术方案已通过，价格谈判中" },
      { name: "DEC-Engine Test Bench Upgrade", customerId: customerIds[0], contactId: contactIds[0], stage: "qualification", expectedAmount: "1800000.00", currency: "USD", probability: 40, expectedCloseDate: "2026-06-30", actualCloseDate: null, productInterest: "Engine dynamometer + emission analyzer", competitorInfo: "AVL, Horiba", assignedTo: uid(0), source: "exhibition", notes: "Technical evaluation phase" },
      { name: "上汽通用-IATF16949审核咨询", customerId: customerIds[2], contactId: contactIds[4], stage: "closed_won", expectedAmount: "3500000.00", currency: "CNY", probability: 100, expectedCloseDate: "2026-01-31", actualCloseDate: "2026-01-28", productInterest: "IATF 16949认证咨询+VDA 6.3审核", competitorInfo: "SGS, TUV", assignedTo: uid(1), source: "direct", notes: "已签约，项目启动中" },
      { name: "博世苏州-质检设备升级", customerId: customerIds[4], contactId: contactIds[7], stage: "proposal", expectedAmount: "8500000.00", currency: "CNY", probability: 55, expectedCloseDate: "2026-05-20", actualCloseDate: null, productInterest: "在线质检设备+SPC系统", competitorInfo: "Zeiss, Keyence", assignedTo: uid(2), source: "direct", notes: "方案已提交，等待客户评审" },
      { name: "比亚迪-新能源电池检测线", customerId: customerIds[6], contactId: contactIds[10], stage: "lead", expectedAmount: "35000000.00", currency: "CNY", probability: 15, expectedCloseDate: "2026-09-30", actualCloseDate: null, productInterest: "电池包检测线+数据采集系统", competitorInfo: "先导智能, 天永智能", assignedTo: uid(3), source: "cold_call", notes: "初步接触，待深入了解需求" },
      { name: "宝马沈阳-VDA6.3审核辅导", customerId: customerIds[3], contactId: contactIds[6], stage: "closed_won", expectedAmount: "4200000.00", currency: "CNY", probability: 100, expectedCloseDate: "2026-02-10", actualCloseDate: "2026-02-08", productInterest: "VDA 6.3审核辅导+培训", competitorInfo: "TUV SUD", assignedTo: uid(1), source: "exhibition", notes: "已签约并收款" },
    ];

    const opportunityIds: number[] = [];
    for (const op of opportunities) {
      const res = await client.query(
        `INSERT INTO crm_opportunities_v2
         (name, customer_id, contact_id, stage, expected_amount, currency, probability, expected_close_date, actual_close_date, product_interest, competitor_info, assigned_to, source, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id`,
        [op.name, op.customerId, op.contactId, op.stage, op.expectedAmount, op.currency, op.probability, op.expectedCloseDate, op.actualCloseDate, op.productInterest, op.competitorInfo, op.assignedTo, op.source, op.notes]
      );
      opportunityIds.push(res.rows[0].id);
    }
    console.log("Inserted 6 opportunities, IDs:", opportunityIds);

    // =========================================================================
    // 5. Interactions (10 rows)
    // =========================================================================
    const interactions = [
      { customerId: customerIds[1], opportunityId: opportunityIds[0], type: "visit", subject: "一汽集团技术交流访问", content: "参观装配车间，讨论自动化升级方案，客户对MES集成非常感兴趣", sentiment: "positive", isComplaint: false, complaintSeverity: null, resolution: null, createdBy: uid(0) },
      { customerId: customerIds[0], opportunityId: opportunityIds[1], type: "call", subject: "DEC Technical Requirements Call", content: "Discussed engine test bench specifications. Customer needs 600kW dyno with emission measurement.", sentiment: "positive", isComplaint: false, complaintSeverity: null, resolution: null, createdBy: uid(0) },
      { customerId: customerIds[2], opportunityId: opportunityIds[2], type: "email", subject: "上汽通用IATF16949合同确认", content: "发送最终合同版本，客户确认无异议，待签章回传", sentiment: "positive", isComplaint: false, complaintSeverity: null, resolution: null, createdBy: uid(1) },
      { customerId: customerIds[3], opportunityId: opportunityIds[5], type: "visit", subject: "宝马沈阳VDA6.3现场评估", content: "完成了为期2天的现场评估，识别了3个主要改进项", sentiment: "neutral", isComplaint: false, complaintSeverity: null, resolution: null, createdBy: uid(1) },
      { customerId: customerIds[4], opportunityId: opportunityIds[3], type: "wechat", subject: "博世苏州报价跟进", content: "刘总微信确认收到报价，预计下周内部评审后反馈", sentiment: "neutral", isComplaint: false, complaintSeverity: null, resolution: null, createdBy: uid(2) },
      { customerId: customerIds[1], opportunityId: null, type: "call", subject: "一汽集团质量投诉跟进", content: "客户反映上批交付的传感器有2%不良率，要求补货并提供8D报告", sentiment: "negative", isComplaint: true, complaintSeverity: "high", resolution: "已安排补货并启动8D流程，预计5个工作日内关闭", createdBy: uid(0) },
      { customerId: customerIds[2], opportunityId: null, type: "email", subject: "上汽通用交付延迟投诉", content: "客户投诉上月订单延迟3天交付，要求更新交付计划并提供根因分析", sentiment: "negative", isComplaint: true, complaintSeverity: "medium", resolution: "已提供根因分析报告，调整生产排期确保后续准时交付", createdBy: uid(1) },
      { customerId: customerIds[5], opportunityId: null, type: "call", subject: "采埃孚上海初次接触", content: "与周明达经理电话沟通，介绍GRT体系能力，客户表示有兴趣进一步了解", sentiment: "positive", isComplaint: false, complaintSeverity: null, resolution: null, createdBy: uid(2) },
      { customerId: customerIds[6], opportunityId: opportunityIds[4], type: "visit", subject: "比亚迪深圳工厂参观", content: "参观比亚迪深圳电池生产基地，了解其检测需求和现有设备情况", sentiment: "positive", isComplaint: false, complaintSeverity: null, resolution: null, createdBy: uid(3) },
      { customerId: customerIds[7], opportunityId: null, type: "email", subject: "三一重工产品资料发送", content: "应范志峰要求发送产品目录和典型案例，等待客户反馈", sentiment: "neutral", isComplaint: false, complaintSeverity: null, resolution: null, createdBy: uid(3) },
    ];

    for (const ix of interactions) {
      await client.query(
        `INSERT INTO crm_interactions
         (customer_id, opportunity_id, type, subject, content, sentiment, is_complaint, complaint_severity, resolution, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [ix.customerId, ix.opportunityId, ix.type, ix.subject, ix.content, ix.sentiment, ix.isComplaint, ix.complaintSeverity, ix.resolution, ix.createdBy]
      );
    }
    console.log("Inserted 10 interactions.");

    await client.query("COMMIT");
    console.log("Transaction committed.");

    // =========================================================================
    // Verification
    // =========================================================================
    console.log("\n========== Verification ==========");

    const custStats = await client.query("SELECT type, count(*) as cnt FROM crm_customers_v2 GROUP BY type ORDER BY type");
    console.log("\nCustomers by type:");
    for (const r of custStats.rows) console.log("  " + r.type + ": " + r.cnt);

    const custLevels = await client.query("SELECT level, count(*) as cnt FROM crm_customers_v2 GROUP BY level ORDER BY level");
    console.log("\nCustomers by level:");
    for (const r of custLevels.rows) console.log("  " + r.level + ": " + r.cnt);

    const contactCount = await client.query("SELECT count(*) as cnt FROM crm_contacts_v2");
    const keyCount = await client.query("SELECT count(*) as cnt FROM crm_contacts_v2 WHERE is_key_person = true");
    console.log("\nContacts: " + contactCount.rows[0].cnt + " total, " + keyCount.rows[0].cnt + " key persons");

    const leadStats = await client.query("SELECT status, count(*) as cnt FROM crm_leads GROUP BY status ORDER BY status");
    console.log("\nLeads by status:");
    for (const r of leadStats.rows) console.log("  " + r.status + ": " + r.cnt);

    const oppStats = await client.query("SELECT stage, count(*) as cnt FROM crm_opportunities_v2 GROUP BY stage ORDER BY stage");
    console.log("\nOpportunities by stage:");
    for (const r of oppStats.rows) console.log("  " + r.stage + ": " + r.cnt);

    const ixStats = await client.query("SELECT type, count(*) as cnt FROM crm_interactions GROUP BY type ORDER BY type");
    console.log("\nInteractions by type:");
    for (const r of ixStats.rows) console.log("  " + r.type + ": " + r.cnt);

    const complaintStats = await client.query("SELECT complaint_severity, count(*) as cnt FROM crm_interactions WHERE is_complaint = true GROUP BY complaint_severity");
    console.log("\nComplaints by severity:");
    for (const r of complaintStats.rows) console.log("  " + r.complaint_severity + ": " + r.cnt);

    console.log("\n========== CRM Seed Complete ==========");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Transaction rolled back due to error:", err);
    throw err;
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
