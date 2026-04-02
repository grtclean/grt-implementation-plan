/**
 * Seed annual goal agreements for ALL employees
 * with position-based dimension templates
 *
 * Run: node scripts/seed-all-annual-goals.cjs
 */
const pg = require("pg");
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:Gerry123456@localhost:5432/grt_system";

// ══════════════════════════════════════════════════════════════
// Position → Dimension Templates (岗位模板)
// ══════════════════════════════════════════════════════════════
const POSITION_TEMPLATES = {
  // ── 高管 ──
  "executive": {
    label: "高管/总监",
    positions: ["董事长", "董事长助理", "运营总监", "总经理", "副总经理"],
    dimensions: [
      { name: "战略规划", nameEn: "Strategy", code: "strategy", weight: 30, desc: "公司战略制定与执行、年度目标分解" },
      { name: "组织管理", nameEn: "Organization", code: "organization", weight: 25, desc: "团队建设、人才发展、组织效能" },
      { name: "业务增长", nameEn: "Growth", code: "growth", weight: 25, desc: "营收增长、市场拓展、客户开发" },
      { name: "创新变革", nameEn: "Innovation", code: "innovation", weight: 20, desc: "数字化转型、流程优化、技术创新" },
    ],
    careerPath: null,
    perfLevels: [
      { level: "差", code: "D", bonusMonths: 0 },
      { level: "中", code: "C", bonusMonths: 2 },
      { level: "良", code: "B", bonusMonths: 4 },
      { level: "优", code: "A", bonusMonths: 6 },
    ],
  },
  // ── 事业部经理 ──
  "bu_manager": {
    label: "事业部经理",
    positions: ["事业二部经理", "事业三部经理", "事业部经理"],
    dimensions: [
      { name: "业务目标", nameEn: "Business Target", code: "business_target", weight: 35, desc: "营收达成、订单量、毛利率" },
      { name: "团队管理", nameEn: "Team Management", code: "team_mgmt", weight: 25, desc: "人员培养、绩效管理、团队稳定性" },
      { name: "客户关系", nameEn: "Client Relations", code: "client", weight: 25, desc: "客户满意度、客户拓展、重点客户维护" },
      { name: "质量交付", nameEn: "Quality Delivery", code: "quality", weight: 15, desc: "项目按期交付率、质量合格率" },
    ],
    careerPath: { upgradeRole: "副总经理/总经理", salaryDeltaPct: 25, bonusCapMultiplier: 2 },
    perfLevels: [
      { level: "差", code: "D", bonusMonths: 0 },
      { level: "中", code: "C", bonusMonths: 1.5 },
      { level: "良", code: "B", bonusMonths: 3 },
      { level: "优", code: "A", bonusMonths: 5 },
    ],
  },
  // ── 销售 ──
  "sales": {
    label: "销售/市场",
    positions: ["高级销售经理", "销售与项目工程师", "销售主管", "市场主管", "市场专员"],
    dimensions: [
      { name: "营销", nameEn: "Marketing", code: "marketing", weight: 40, desc: "市场推广、品牌建设、展会参与、行业洞察" },
      { name: "销售", nameEn: "Sales", code: "sales", weight: 40, desc: "订单转化、客户开发、报价跟进、合同签署" },
      { name: "客户管理", nameEn: "Client Mgmt", code: "client_mgmt", weight: 20, desc: "客户关系维护、满意度提升、复购率" },
    ],
    careerPath: { upgradeRole: "销售与市场主管/经理", salaryDeltaPct: 20, bonusCapMultiplier: 2 },
    perfLevels: [
      { level: "差", code: "D", bonusMonths: 0 },
      { level: "中", code: "C", bonusMonths: 1 },
      { level: "良", code: "B", bonusMonths: 2 },
      { level: "优", code: "A", bonusMonths: 3 },
    ],
  },
  // ── 工程师 ──
  "engineer": {
    label: "工程师",
    positions: ["机械工程师", "电气工程师", "机械研发工程师", "助理机械研发工程师", "助理电气工程师", "IT工程师", "供应链工程师", "供应链助理工程师", "生产工程师兼项目及IT工程师"],
    dimensions: [
      { name: "技术能力", nameEn: "Technical Skills", code: "technical", weight: 40, desc: "设计质量、技术攻关、专业深度" },
      { name: "项目交付", nameEn: "Project Delivery", code: "delivery", weight: 30, desc: "按时交付、文档规范、变更控制" },
      { name: "协作创新", nameEn: "Collaboration", code: "collaboration", weight: 20, desc: "跨部门协作、知识分享、改善提案" },
      { name: "学习成长", nameEn: "Learning", code: "learning", weight: 10, desc: "新技术掌握、认证考取、标准学习" },
    ],
    careerPath: { upgradeRole: "高级工程师/主管", salaryDeltaPct: 15, bonusCapMultiplier: 1.5 },
    perfLevels: [
      { level: "差", code: "D", bonusMonths: 0 },
      { level: "中", code: "C", bonusMonths: 1 },
      { level: "良", code: "B", bonusMonths: 2 },
      { level: "优", code: "A", bonusMonths: 3 },
    ],
  },
  // ── 项目经理 ──
  "project_manager": {
    label: "项目经理",
    positions: ["项目经理", "生产工程师兼项目经理", "采购与项目工程师", "采购经理"],
    dimensions: [
      { name: "项目管理", nameEn: "Project Mgmt", code: "project_mgmt", weight: 35, desc: "进度控制、成本管理、风险预判" },
      { name: "客户交付", nameEn: "Delivery", code: "delivery", weight: 30, desc: "按期交付率、客户满意度、验收通过率" },
      { name: "资源协调", nameEn: "Resource Coord", code: "resource", weight: 20, desc: "跨部门协调、供应商管理、产能调度" },
      { name: "团队协作", nameEn: "Teamwork", code: "teamwork", weight: 15, desc: "带教新人、知识传承、流程优化" },
    ],
    careerPath: { upgradeRole: "高级项目经理/部门经理", salaryDeltaPct: 15, bonusCapMultiplier: 1.5 },
    perfLevels: [
      { level: "差", code: "D", bonusMonths: 0 },
      { level: "中", code: "C", bonusMonths: 1 },
      { level: "良", code: "B", bonusMonths: 2 },
      { level: "优", code: "A", bonusMonths: 3 },
    ],
  },
  // ── 质量 ──
  "quality": {
    label: "质量管理",
    positions: ["制造质量经理", "质量专员"],
    dimensions: [
      { name: "质量控制", nameEn: "Quality Control", code: "qc", weight: 40, desc: "合格率、客诉率、体系维护" },
      { name: "过程改善", nameEn: "Process Improvement", code: "improvement", weight: 30, desc: "FMEA、8D、持续改进" },
      { name: "供应商质量", nameEn: "Supplier Quality", code: "supplier_quality", weight: 20, desc: "来料检验、供应商审核" },
      { name: "团队培训", nameEn: "Training", code: "training", weight: 10, desc: "质量意识培训、标准推广" },
    ],
    careerPath: { upgradeRole: "质量总监", salaryDeltaPct: 20, bonusCapMultiplier: 1.5 },
    perfLevels: [
      { level: "差", code: "D", bonusMonths: 0 },
      { level: "中", code: "C", bonusMonths: 1 },
      { level: "良", code: "B", bonusMonths: 2 },
      { level: "优", code: "A", bonusMonths: 3 },
    ],
  },
  // ── 生产主管/班组长 ──
  "supervisor": {
    label: "生产主管/班组长",
    positions: ["电气主管", "售后服务主管", "电气班组班长", "电气班组副班长", "装配班组长", "激光切作班组长", "机加工班组长"],
    dimensions: [
      { name: "生产达成", nameEn: "Production Target", code: "production", weight: 35, desc: "产量达成率、按期完成率" },
      { name: "质量管理", nameEn: "Quality", code: "quality", weight: 25, desc: "一次合格率、返工率控制" },
      { name: "团队管理", nameEn: "Team Mgmt", code: "team", weight: 25, desc: "人员考勤、技能培训、安全管理" },
      { name: "成本控制", nameEn: "Cost Control", code: "cost", weight: 15, desc: "工时效率、物料损耗、设备维护" },
    ],
    careerPath: { upgradeRole: "车间主任/生产经理", salaryDeltaPct: 15, bonusCapMultiplier: 1.5 },
    perfLevels: [
      { level: "差", code: "D", bonusMonths: 0 },
      { level: "中", code: "C", bonusMonths: 0.5 },
      { level: "良", code: "B", bonusMonths: 1 },
      { level: "优", code: "A", bonusMonths: 2 },
    ],
  },
  // ── 生产操作工 ──
  "operator": {
    label: "生产操作工",
    positions: ["机械装配", "电气装配", "焊工", "激光切割", "数控车工", "冷作", "激光", "机加工", "机加工铣工", "CNC操作工", "协作辅助"],
    dimensions: [
      { name: "产量达成", nameEn: "Output", code: "output", weight: 35, desc: "日/周/月产量完成率" },
      { name: "质量合格", nameEn: "Quality", code: "quality", weight: 30, desc: "一次合格率、报废率、返工次数" },
      { name: "技能提升", nameEn: "Skill Growth", code: "skill", weight: 20, desc: "新工艺掌握、多岗位能力、认证考取" },
      { name: "安全规范", nameEn: "Safety", code: "safety", weight: 15, desc: "安全操作、6S执行、设备保养" },
    ],
    careerPath: { upgradeRole: "班组长/技术骨干", salaryDeltaPct: 10, bonusCapMultiplier: 1.5 },
    perfLevels: [
      { level: "差", code: "D", bonusMonths: 0 },
      { level: "中", code: "C", bonusMonths: 0.5 },
      { level: "良", code: "B", bonusMonths: 1 },
      { level: "优", code: "A", bonusMonths: 1.5 },
    ],
  },
  // ── 财务 ──
  "finance": {
    label: "财务",
    positions: ["出纳/银行账户执行", "总账会计/财务复核", "财务专员/报销初审", "会计", "会计助理", "财务"],
    dimensions: [
      { name: "账务准确", nameEn: "Accuracy", code: "accuracy", weight: 35, desc: "账务准确率、报表及时性、差错率" },
      { name: "合规风控", nameEn: "Compliance", code: "compliance", weight: 30, desc: "税务合规、审计配合、内控执行" },
      { name: "效率提升", nameEn: "Efficiency", code: "efficiency", weight: 20, desc: "月结速度、自动化程度、流程优化" },
      { name: "业务支持", nameEn: "Biz Support", code: "biz_support", weight: 15, desc: "经营分析、预算管理、成本分析" },
    ],
    careerPath: { upgradeRole: "高级会计/财务主管", salaryDeltaPct: 15, bonusCapMultiplier: 1.5 },
    perfLevels: [
      { level: "差", code: "D", bonusMonths: 0 },
      { level: "中", code: "C", bonusMonths: 1 },
      { level: "良", code: "B", bonusMonths: 2 },
      { level: "优", code: "A", bonusMonths: 3 },
    ],
  },
  // ── HR/行政 ──
  "hr_admin": {
    label: "人事行政",
    positions: ["AI数智&人事行政部经理", "人事行政主管", "行政前台", "后勤助理", "后勤", "前法", "文员"],
    dimensions: [
      { name: "人事管理", nameEn: "HR Mgmt", code: "hr_mgmt", weight: 30, desc: "招聘达成、培训计划、员工关系" },
      { name: "行政服务", nameEn: "Admin Service", code: "admin_svc", weight: 25, desc: "日常行政、办公管理、接待服务" },
      { name: "制度执行", nameEn: "Policy Execution", code: "policy", weight: 25, desc: "制度落地、合规检查、档案管理" },
      { name: "协调沟通", nameEn: "Coordination", code: "coordination", weight: 20, desc: "跨部门协调、员工满意度" },
    ],
    careerPath: { upgradeRole: "人事行政经理", salaryDeltaPct: 15, bonusCapMultiplier: 1.5 },
    perfLevels: [
      { level: "差", code: "D", bonusMonths: 0 },
      { level: "中", code: "C", bonusMonths: 1 },
      { level: "良", code: "B", bonusMonths: 2 },
      { level: "优", code: "A", bonusMonths: 2.5 },
    ],
  },
  // ── 售后 ──
  "aftersales": {
    label: "售后服务",
    positions: ["售后技工"],
    dimensions: [
      { name: "服务响应", nameEn: "Response", code: "response", weight: 30, desc: "响应速度、上门及时率" },
      { name: "问题解决", nameEn: "Problem Solving", code: "problem_solving", weight: 35, desc: "一次修复率、故障诊断能力" },
      { name: "客户满意", nameEn: "CSAT", code: "csat", weight: 20, desc: "客户满意度评分、投诉处理" },
      { name: "知识积累", nameEn: "Knowledge", code: "knowledge", weight: 15, desc: "故障案例库、维修手册贡献" },
    ],
    careerPath: { upgradeRole: "售后服务主管", salaryDeltaPct: 15, bonusCapMultiplier: 1.5 },
    perfLevels: [
      { level: "差", code: "D", bonusMonths: 0 },
      { level: "中", code: "C", bonusMonths: 0.5 },
      { level: "良", code: "B", bonusMonths: 1 },
      { level: "优", code: "A", bonusMonths: 2 },
    ],
  },
  // ── 仓库/PMC ──
  "warehouse": {
    label: "仓库/PMC",
    positions: ["仓库管理员", "PMC专员"],
    dimensions: [
      { name: "库存准确", nameEn: "Inventory Accuracy", code: "inventory", weight: 35, desc: "库存准确率、盘点差异率" },
      { name: "收发效率", nameEn: "Logistics", code: "logistics", weight: 30, desc: "出入库及时率、配送准时率" },
      { name: "计划管理", nameEn: "Planning", code: "planning", weight: 20, desc: "物料计划准确率、缺料预警" },
      { name: "6S管理", nameEn: "6S", code: "6s", weight: 15, desc: "仓库整洁度、标识规范、安全" },
    ],
    careerPath: { upgradeRole: "仓库/PMC主管", salaryDeltaPct: 10, bonusCapMultiplier: 1.5 },
    perfLevels: [
      { level: "差", code: "D", bonusMonths: 0 },
      { level: "中", code: "C", bonusMonths: 0.5 },
      { level: "良", code: "B", bonusMonths: 1 },
      { level: "优", code: "A", bonusMonths: 1.5 },
    ],
  },
};

// Position → Template mapping
function matchTemplate(position) {
  for (const [key, tpl] of Object.entries(POSITION_TEMPLATES)) {
    if (tpl.positions.some(p => position.includes(p) || p.includes(position))) {
      return { key, ...tpl };
    }
  }
  // Fuzzy match
  if (position.includes("销售") || position.includes("市场")) return { key: "sales", ...POSITION_TEMPLATES.sales };
  if (position.includes("工程师")) return { key: "engineer", ...POSITION_TEMPLATES.engineer };
  if (position.includes("经理") || position.includes("总监")) return { key: "bu_manager", ...POSITION_TEMPLATES.bu_manager };
  if (position.includes("班组长") || position.includes("主管")) return { key: "supervisor", ...POSITION_TEMPLATES.supervisor };
  if (position.includes("装配") || position.includes("焊") || position.includes("车工") || position.includes("切割") || position.includes("CNC") || position.includes("加工") || position.includes("冷作") || position.includes("激光")) return { key: "operator", ...POSITION_TEMPLATES.operator };
  if (position.includes("财务") || position.includes("会计") || position.includes("出纳")) return { key: "finance", ...POSITION_TEMPLATES.finance };
  if (position.includes("行政") || position.includes("人事") || position.includes("前台") || position.includes("后勤") || position.includes("文员")) return { key: "hr_admin", ...POSITION_TEMPLATES.hr_admin };
  if (position.includes("售后") || position.includes("技工")) return { key: "aftersales", ...POSITION_TEMPLATES.aftersales };
  if (position.includes("仓库") || position.includes("PMC")) return { key: "warehouse", ...POSITION_TEMPLATES.warehouse };
  return { key: "operator", ...POSITION_TEMPLATES.operator }; // default
}

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    // 1. Save position templates as JSON in strategy table for frontend use
    await client.query(`
      CREATE TABLE IF NOT EXISTS annual_goal_position_templates (
        id SERIAL PRIMARY KEY,
        template_key VARCHAR(50) NOT NULL UNIQUE,
        label VARCHAR(100) NOT NULL,
        positions JSON NOT NULL,
        dimensions JSON NOT NULL,
        career_path JSON,
        perf_levels JSON NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`DELETE FROM annual_goal_position_templates`);
    for (const [key, tpl] of Object.entries(POSITION_TEMPLATES)) {
      await client.query(`
        INSERT INTO annual_goal_position_templates (template_key, label, positions, dimensions, career_path, perf_levels)
        VALUES ($1, $2, $3::json, $4::json, $5::json, $6::json)
      `, [key, tpl.label, JSON.stringify(tpl.positions), JSON.stringify(tpl.dimensions), JSON.stringify(tpl.careerPath), JSON.stringify(tpl.perfLevels)]);
    }
    console.log(`[OK] Position templates: ${Object.keys(POSITION_TEMPLATES).length} saved`);

    // 2. Get all employees from users table
    const usersRes = await client.query(`
      SELECT u.id, u."openId", u.name
      FROM users u
      WHERE u."openId" LIKE 'GRT%' AND u.name IS NOT NULL
      ORDER BY u."openId"
    `);
    console.log(`[OK] Found ${usersRes.rows.length} GRT employees`);

    // 3. Get employee details from hrm_employees
    const empRes = await client.query(`
      SELECT id, "employeeCode", name, department, position
      FROM hrm_employees
      WHERE status IN ('regular', 'probation') AND "employeeCode" IS NOT NULL
      ORDER BY "employeeCode"
    `);
    const empMap = {};
    for (const e of empRes.rows) {
      empMap[e.employeeCode] = e;
    }
    console.log(`[OK] HRM employees: ${empRes.rows.length}`);

    const CEO_ID = 12;
    const CEO_NAME = "倪亚东";
    const YEAR = 2026;
    let created = 0, skipped = 0;

    for (const user of usersRes.rows) {
      // Skip existing agreements
      const existing = await client.query(
        `SELECT id FROM annual_goal_agreements WHERE employee_id = $1 AND year = $2`,
        [user.id, YEAR]
      );
      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      // Find employee info
      const emp = empMap[user.open_id];
      const dept = emp?.department || "";
      const position = emp?.position || "";
      const name = user.name;

      if (!position && !dept) { skipped++; continue; }

      // Match template
      const tpl = matchTemplate(position);

      // Determine manager (BU manager or CEO)
      let managerId = CEO_ID, managerName = CEO_NAME;

      // Create agreement
      const agRes = await client.query(`
        INSERT INTO annual_goal_agreements (
          employee_id, employee_name, employee_open_id, manager_id, manager_name, year,
          status, performance_levels_json, bonus_cap_months, projected_bonus_months,
          total_weight_validation, communication_channel,
          signed_by_employee, signed_by_manager, employee_signed_at, manager_signed_at,
          department, notes, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          'active', $7::json, 3.0, 0.0,
          100.00, 'email',
          true, true, NOW(), NOW(),
          $8, $9, $4
        ) RETURNING id
      `, [user.id, name, user.open_id, managerId, managerName, YEAR,
          JSON.stringify(tpl.perfLevels), dept,
          `岗位模板: ${tpl.label} | 自动生成，待主管与员工确认调整`]);

      const agId = agRes.rows[0].id;

      // Create dimensions from template
      for (let i = 0; i < tpl.dimensions.length; i++) {
        const d = tpl.dimensions[i];
        await client.query(`
          INSERT INTO annual_goal_dimensions (agreement_id, dimension_name, dimension_name_en, dimension_code, weight, description, current_score, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, 0.00, $7)
        `, [agId, d.name, d.nameEn, d.code, d.weight, d.desc, i]);
      }

      // Create checkpoints
      await client.query(`
        INSERT INTO annual_goal_checkpoints (agreement_id, checkpoint_type, scheduled_date, status) VALUES
          ($1, 'Q1', '2026-03-31', 'scheduled'),
          ($1, 'Q2', '2026-06-30', 'scheduled'),
          ($1, 'mid_year', '2026-06-30', 'scheduled'),
          ($1, 'Q3', '2026-09-30', 'scheduled'),
          ($1, 'Q4', '2026-12-31', 'scheduled'),
          ($1, 'year_end', '2027-01-15', 'scheduled')
      `, [agId]);

      // Create persona profile
      await client.query(`
        INSERT INTO employee_persona_profiles (employee_id, employee_name, "employeeCode", department, position, year, persona_score, persona_tier)
        VALUES ($1, $2, $3, $4, $5, $6, 50.00, 'mid')
        ON CONFLICT (employee_id, year) DO NOTHING
      `, [user.id, name, user.open_id, dept, position, YEAR]);

      created++;
    }

    console.log(`\n════════════════════════════════════════`);
    console.log(`  BATCH SEED COMPLETE`);
    console.log(`════════════════════════════════════════`);
    console.log(`  Created: ${created} agreements`);
    console.log(`  Skipped: ${skipped} (already exist or no position)`);
    console.log(`  Templates: ${Object.keys(POSITION_TEMPLATES).length} position types`);
    console.log(`  Year: ${YEAR}`);
    console.log(`════════════════════════════════════════`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
