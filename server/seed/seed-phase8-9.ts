/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   Phase 8-9: BI 角色看板配置 + 预算持久化 + 通知模板           ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  8.1 角色定制看板预设配置                                       ║
 * ║  8.2 预算标准持久化表                                           ║
 * ║  9.1 空状态引导配置                                             ║
 * ║  9.2 通知模板预设                                               ║
 * ║  Run: npx tsx server/seed/seed-phase8-9.ts                     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) { console.error("[Seed] DATABASE_URL not set."); process.exit(1); }
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   Phase 8-9: BI看板 + 预算 + 通知 + 体验优化               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  try {
    // ═══════════════════════════════════════════
    // Phase 8.1: 角色看板配置
    // ═══════════════════════════════════════════
    console.log("── Phase 8.1: 角色看板配置 ──");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bi_role_dashboard_config (
        id SERIAL PRIMARY KEY,
        role_code VARCHAR(30) NOT NULL,
        role_name VARCHAR(100),
        dashboard_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
        refresh_interval_seconds INTEGER DEFAULT 300,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(role_code)
      )
    `);

    const dashboards = [
      { role: "ceo", name: "CEO/CTO", widgets: [
        { type: "metric", title: "年度营收", source: "finance.revenue", size: "sm" },
        { type: "metric", title: "毛利率", source: "finance.margin", size: "sm" },
        { type: "metric", title: "项目健康度", source: "project.health", size: "sm" },
        { type: "metric", title: "人均产值", source: "finance.per_capita", size: "sm" },
        { type: "chart", title: "营收趋势(月)", source: "finance.revenue_trend", size: "lg" },
        { type: "chart", title: "项目阶段分布", source: "project.phase_dist", size: "md" },
        { type: "list", title: "待审批事项", source: "approval.pending", size: "md" },
        { type: "list", title: "高风险项目", source: "project.high_risk", size: "md" },
      ]},
      { role: "director", name: "事业部经理", widgets: [
        { type: "metric", title: "BU营收", source: "finance.bu_revenue", size: "sm" },
        { type: "metric", title: "交付准时率", source: "project.on_time", size: "sm" },
        { type: "metric", title: "质量DPPM", source: "quality.dppm", size: "sm" },
        { type: "metric", title: "人员出勤率", source: "hr.attendance", size: "sm" },
        { type: "chart", title: "项目甘特图", source: "project.gantt", size: "lg" },
        { type: "list", title: "本周交付", source: "project.deliveries", size: "md" },
      ]},
      { role: "hr_director", name: "HR", widgets: [
        { type: "metric", title: "在职人数", source: "hr.headcount", size: "sm" },
        { type: "metric", title: "月度流失率", source: "hr.turnover", size: "sm" },
        { type: "metric", title: "培训覆盖率", source: "hr.training_coverage", size: "sm" },
        { type: "metric", title: "绩效达标率", source: "hr.performance_pass", size: "sm" },
        { type: "chart", title: "人员结构分布", source: "hr.org_chart", size: "lg" },
        { type: "list", title: "待入职人员", source: "hr.onboarding", size: "md" },
        { type: "list", title: "资质到期预警", source: "hr.cert_expiry", size: "md" },
      ]},
      { role: "finance_manager", name: "财务", widgets: [
        { type: "metric", title: "现金余额", source: "finance.cash", size: "sm" },
        { type: "metric", title: "应收总额", source: "finance.ar_total", size: "sm" },
        { type: "metric", title: "应付总额", source: "finance.ap_total", size: "sm" },
        { type: "metric", title: "预算执行率", source: "finance.budget_exec", size: "sm" },
        { type: "chart", title: "现金流趋势", source: "finance.cashflow", size: "lg" },
        { type: "list", title: "待报销审批", source: "finance.pending_expense", size: "md" },
      ]},
      { role: "bu_pm", name: "项目经理", widgets: [
        { type: "metric", title: "在管项目", source: "project.my_active", size: "sm" },
        { type: "metric", title: "里程碑达标", source: "project.milestone_pass", size: "sm" },
        { type: "metric", title: "预算偏差", source: "project.budget_var", size: "sm" },
        { type: "metric", title: "风险项数", source: "project.risk_count", size: "sm" },
        { type: "chart", title: "项目进度", source: "project.progress_chart", size: "lg" },
        { type: "list", title: "本周任务", source: "task.my_week", size: "md" },
      ]},
      { role: "bu_sales", name: "销售工程师", widgets: [
        { type: "metric", title: "签约金额", source: "crm.contract_amount", size: "sm" },
        { type: "metric", title: "商机数", source: "crm.opportunity_count", size: "sm" },
        { type: "metric", title: "回款率", source: "finance.collection_rate", size: "sm" },
        { type: "chart", title: "销售漏斗", source: "crm.funnel", size: "lg" },
        { type: "list", title: "近期跟进客户", source: "crm.followup", size: "md" },
      ]},
      { role: "engineer", name: "工程师", widgets: [
        { type: "metric", title: "在管项目", source: "project.my_active", size: "sm" },
        { type: "metric", title: "图纸任务", source: "plm.my_drawings", size: "sm" },
        { type: "list", title: "我的任务", source: "task.my_todo", size: "lg" },
        { type: "list", title: "设计评审", source: "plm.pending_review", size: "md" },
      ]},
      { role: "production_supervisor", name: "生产主管", widgets: [
        { type: "metric", title: "今日产出", source: "mes.today_output", size: "sm" },
        { type: "metric", title: "OEE", source: "mes.oee", size: "sm" },
        { type: "metric", title: "质量合格率", source: "quality.pass_rate", size: "sm" },
        { type: "chart", title: "工位状态", source: "mes.station_status", size: "lg" },
        { type: "list", title: "异常工单", source: "mes.abnormal_orders", size: "md" },
      ]},
      { role: "floor_operator", name: "车间操作员", widgets: [
        { type: "metric", title: "今日任务", source: "task.my_today", size: "sm" },
        { type: "metric", title: "完成工时", source: "mes.my_hours", size: "sm" },
        { type: "list", title: "待执行工序", source: "mes.my_queue", size: "lg" },
      ]},
    ];

    for (const d of dashboards) {
      const exists: any = await db.execute(sql`SELECT id FROM bi_role_dashboard_config WHERE role_code = ${d.role} LIMIT 1`);
      if ((exists?.rows ?? exists ?? []).length === 0) {
        await db.execute(sql.raw(`INSERT INTO bi_role_dashboard_config (role_code, role_name, dashboard_widgets) VALUES ('${d.role}', '${d.name}', '${JSON.stringify(d.widgets)}')`));
      }
    }
    console.log(`  [+] ${dashboards.length} 个角色看板配置`);

    // ═══════════════════════════════════════════
    // Phase 8.2: 预算标准持久化
    // ═══════════════════════════════════════════
    console.log("\n── Phase 8.2: 预算标准持久化 ──");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS budget_standards (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        item_name VARCHAR(200) NOT NULL,
        region VARCHAR(20) DEFAULT 'CN',
        tier VARCHAR(20) DEFAULT 'standard',
        level VARCHAR(20) DEFAULT 'staff',
        amount DECIMAL(15,2) NOT NULL,
        unit VARCHAR(20) DEFAULT 'CNY/day',
        effective_from DATE DEFAULT CURRENT_DATE,
        effective_to DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(category, item_name, region, tier, level)
      )
    `);

    const standards = [
      // 差旅标准
      { cat: "travel", item: "住宿标准", region: "CN", tier: "tier1", level: "director", amount: 800, unit: "CNY/晚" },
      { cat: "travel", item: "住宿标准", region: "CN", tier: "tier1", level: "manager", amount: 500, unit: "CNY/晚" },
      { cat: "travel", item: "住宿标准", region: "CN", tier: "tier1", level: "staff", amount: 350, unit: "CNY/晚" },
      { cat: "travel", item: "住宿标准", region: "CN", tier: "tier2", level: "director", amount: 600, unit: "CNY/晚" },
      { cat: "travel", item: "住宿标准", region: "CN", tier: "tier2", level: "manager", amount: 400, unit: "CNY/晚" },
      { cat: "travel", item: "住宿标准", region: "CN", tier: "tier2", level: "staff", amount: 250, unit: "CNY/晚" },
      { cat: "travel", item: "餐补标准", region: "CN", tier: "standard", level: "all", amount: 100, unit: "CNY/天" },
      { cat: "travel", item: "交通补贴", region: "CN", tier: "standard", level: "all", amount: 80, unit: "CNY/天" },
      // 国际差旅
      { cat: "travel", item: "住宿标准", region: "US", tier: "standard", level: "all", amount: 200, unit: "USD/晚" },
      { cat: "travel", item: "住宿标准", region: "EU", tier: "standard", level: "all", amount: 180, unit: "EUR/晚" },
      { cat: "travel", item: "餐补标准", region: "US", tier: "standard", level: "all", amount: 60, unit: "USD/天" },
      { cat: "travel", item: "餐补标准", region: "EU", tier: "standard", level: "all", amount: 50, unit: "EUR/天" },
      // 办公用品
      { cat: "office", item: "月度文具预算", region: "CN", tier: "standard", level: "dept", amount: 500, unit: "CNY/月" },
      { cat: "office", item: "设备采购预算", region: "CN", tier: "standard", level: "per_person", amount: 5000, unit: "CNY/年" },
      // 招待费
      { cat: "entertainment", item: "客户招待标准", region: "CN", tier: "standard", level: "director", amount: 500, unit: "CNY/人次" },
      { cat: "entertainment", item: "客户招待标准", region: "CN", tier: "standard", level: "manager", amount: 300, unit: "CNY/人次" },
    ];

    for (const s of standards) {
      const exists: any = await db.execute(sql`
        SELECT id FROM budget_standards WHERE category = ${s.cat} AND item_name = ${s.item} AND region = ${s.region} AND tier = ${s.tier} AND level = ${s.level} LIMIT 1
      `);
      if ((exists?.rows ?? exists ?? []).length === 0) {
        await db.execute(sql`
          INSERT INTO budget_standards (category, item_name, region, tier, level, amount, unit)
          VALUES (${s.cat}, ${s.item}, ${s.region}, ${s.tier}, ${s.level}, ${s.amount}, ${s.unit})
        `);
      }
    }
    console.log(`  [+] ${standards.length} 条预算标准 (差旅/办公/招待)`);

    // ═══════════════════════════════════════════
    // Phase 9: 通知模板 + 体验配置
    // ═══════════════════════════════════════════
    console.log("\n── Phase 9: 通知模板 + 体验 ──");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(50) UNIQUE NOT NULL,
        title_template VARCHAR(200) NOT NULL,
        body_template TEXT NOT NULL,
        channels JSONB DEFAULT '["in_app"]'::jsonb,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const notifTemplates = [
      { event: "approval_pending", title: "您有新的审批待处理", body: "{{submitter}} 提交了 {{formType}} 申请，请及时审批。", channels: '["in_app","email"]' },
      { event: "approval_timeout", title: "审批即将超时", body: "{{submitter}} 的 {{formType}} 申请已等待 {{hours}} 小时，请尽快处理。", channels: '["in_app","email"]' },
      { event: "approval_approved", title: "您的申请已批准", body: "您提交的 {{formType}} 已由 {{approver}} 批准。", channels: '["in_app"]' },
      { event: "approval_rejected", title: "您的申请已驳回", body: "您提交的 {{formType}} 已由 {{approver}} 驳回。原因: {{reason}}", channels: '["in_app","email"]' },
      { event: "meeting_reminder", title: "会议提醒", body: "{{meetingTitle}} 将于 {{time}} 开始，请准时参加。", channels: '["in_app"]' },
      { event: "task_assigned", title: "您有新任务", body: "{{assigner}} 给您分配了任务: {{taskName}}，截止 {{dueDate}}。", channels: '["in_app"]' },
      { event: "task_overdue", title: "任务已逾期", body: "任务 {{taskName}} 已逾期 {{days}} 天，请尽快处理。", channels: '["in_app","email"]' },
      { event: "training_reminder", title: "培训提醒", body: "{{courseName}} 将于 {{date}} 开课，请提前准备。", channels: '["in_app"]' },
      { event: "cert_expiry", title: "资质即将到期", body: "您的 {{certName}} 将于 {{expiryDate}} 到期，请及时更新。", channels: '["in_app","email"]' },
      { event: "kpi_review_due", title: "月度绩效评审", body: "{{month}} 月度绩效评审已开放，请在 {{deadline}} 前完成自评。", channels: '["in_app"]' },
      { event: "project_milestone", title: "项目里程碑", body: "项目 {{projectName}} 已到达 {{milestone}} 阶段。", channels: '["in_app"]' },
      { event: "ncr_created", title: "新 NCR 通知", body: "{{productName}} (批次 {{batchNumber}}) 发现不合格，NCR: {{ncrNumber}}。", channels: '["in_app","email"]' },
    ];

    for (const n of notifTemplates) {
      const exists: any = await db.execute(sql`SELECT id FROM notification_templates WHERE event_type = ${n.event} LIMIT 1`);
      if ((exists?.rows ?? exists ?? []).length === 0) {
        await db.execute(sql.raw(`INSERT INTO notification_templates (event_type, title_template, body_template, channels) VALUES ('${n.event}', '${n.title}', '${n.body.replace(/'/g, "''")}', '${n.channels}')`));
      }
    }
    console.log(`  [+] ${notifTemplates.length} 个通知模板`);

    // Summary
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║   Phase 8-9 完成                                            ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  角色看板:    ${String(dashboards.length).padStart(2)} 个角色 × 各 4-8 个 Widget             ║`);
    console.log(`║  预算标准:    ${String(standards.length).padStart(2)} 条 (差旅CN/US/EU + 办公 + 招待)      ║`);
    console.log(`║  通知模板:    ${String(notifTemplates.length).padStart(2)} 个事件类型                          ║`);
    console.log("╚══════════════════════════════════════════════════════════════╝");

  } catch (error) {
    console.error("\n[Seed] FATAL ERROR:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const isDirectRun = process.argv[1]?.includes("seed-phase8-9");
if (isDirectRun) { seed(); }
