/**
 * Seed Employee Profiles, KPI, Skills, Tasks, Work Plans for all GRT employees (V2)
 * Uses actual DB user IDs from users table
 */
const { Client } = require("pg");

const ROLE_CONFIG = {
  ceo:       { kpi: [85,98], tasks: [5,10], skills: ["战略规划","组织管理","商务谈判","行业洞察","团队建设"] },
  vp:        { kpi: [78,95], tasks: [8,15], skills: ["部门管理","项目协调","流程优化","数据分析","跨部门协作"] },
  director:  { kpi: [75,92], tasks: [10,20], skills: ["团队管理","业务规划","客户管理","资源调配","风险管控"] },
  hr_director:{ kpi: [72,90], tasks: [8,15], skills: ["招聘管理","绩效考核","培训发展","劳动法规","组织发展"] },
  finance_manager:{ kpi: [75,92], tasks: [10,18], skills: ["财务分析","预算管理","税务筹划","成本控制","审计合规"] },
  finance_specialist:{ kpi: [68,88], tasks: [12,20], skills: ["账务处理","报表编制","银行对账","发票管理","费用审核"] },
  qc_manager:{ kpi: [78,95], tasks: [10,18], skills: ["质量体系","FMEA","8D报告","供应商质量","测量系统"] },
  sales_director:{ kpi: [75,92], tasks: [8,15], skills: ["客户开发","商务谈判","项目报价","合同管理","售后管理"] },
  sales_rep: { kpi: [65,88], tasks: [10,20], skills: ["客户沟通","技术方案","项目跟踪","报价制作","交付协调"] },
  project_manager:{ kpi: [72,90], tasks: [10,20], skills: ["项目计划","进度管控","成本控制","团队协调","风险管理"] },
  production_supervisor:{ kpi: [72,90], tasks: [12,25], skills: ["生产排程","班组管理","5S管理","安全管理","质量控制"] },
  engineer:  { kpi: [65,88], tasks: [10,20], skills: ["技术设计","图纸审核","工艺优化","故障排查","标准执行"] },
  floor_operator:{ kpi: [60,85], tasks: [15,30], skills: ["设备操作","工艺执行","质量自检","安全规范","5S维护"] },
};

// Role mapping from seed-real-users.ts
const ROLE_MAP = {
  "董事长": "ceo", "董事长助理": "vp", "IT工程师": "engineer",
  "生产工程师兼IT": "engineer", "市场主管": "sales_rep", "市场专员": "sales_rep",
  "AI数智&人事行政部经理": "vp", "出纳": "finance_specialist", "总账会计": "finance_manager",
  "财务专员": "finance_specialist", "仓库管理员": "floor_operator", "供应链助理工程师": "engineer",
  "人事行政主管": "hr_director", "前法": "engineer", "行政前台": "floor_operator", "后勤助理": "floor_operator",
  "高级销售经理": "sales_director", "制造质量经理": "qc_manager", "电气工程师": "engineer",
  "销售与项目工程师": "sales_rep", "采购与项目工程师": "engineer", "售后服务主管": "production_supervisor",
  "售后技工": "engineer", "电气班组副班长": "production_supervisor", "电气班组班长": "production_supervisor",
  "助理电气工程师": "engineer", "助理机械研发工程师": "engineer",
  "机械装配": "floor_operator", "电气装配": "floor_operator", "焊工": "floor_operator",
  "激光切割": "floor_operator", "数控车工": "floor_operator", "协作辅助": "floor_operator",
  "事业二部经理": "director", "机械设计经理": "production_supervisor", "机械研发工程师": "engineer",
  "装配班组长": "production_supervisor", "事业三部经理": "director", "电气主管": "production_supervisor",
  "采购经理": "project_manager", "生产工程师兼项目经理": "project_manager",
  "机加工班组长": "production_supervisor", "质量专员": "engineer", "激光切作班组长": "production_supervisor",
  "激光": "floor_operator", "冷作": "floor_operator", "CNC操作工": "floor_operator",
  "数控车工": "floor_operator", "机加工铣工": "floor_operator", "文员": "floor_operator",
};

function rand(min, max) { return Math.round((Math.random() * (max - min) + min) * 10) / 10; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  const c = new Client({ connectionString: "postgresql://postgres:Gerry123456@localhost:5432/grt_system" });
  await c.connect();

  console.log("=== GRT Employee Profile & KPI Seeding V2 ===\n");

  // Get all GRT employees with their DB IDs
  const { rows: users } = await c.query(`
    SELECT id, "openId" as emp_id, name FROM users
    WHERE "openId" ~ '^GRT[0-9]+$' ORDER BY "openId"
  `);
  console.log(`Found ${users.length} GRT employees in DB\n`);

  // Get position info from the provisioning data
  const { rows: empData } = await c.query(`
    SELECT employee_id, employee_name, department, position
    FROM employee_competence_assessments
    ORDER BY employee_id
  `);
  const empMap = new Map(empData.map(r => [r.employee_id, r]));

  const months = ["2026-01", "2026-02", "2026-03"];
  let kpi = 0, skill = 0, task = 0, report = 0;

  for (const user of users) {
    const numId = parseInt(user.emp_id.replace("GRT", ""));
    const empInfo = empMap.get(numId);
    const position = empInfo?.position || "员工";
    const dept = empInfo?.department || "未知";
    const roleKey = ROLE_MAP[position] || "floor_operator";
    const cfg = ROLE_CONFIG[roleKey] || ROLE_CONFIG.floor_operator;

    // 1. Monthly KPI (3 months)
    for (const month of months) {
      const score = rand(cfg.kpi[0], cfg.kpi[1]);
      const bonus = score >= 90 ? 1.3 : score >= 80 ? 1.1 : score >= 70 ? 1.0 : 0.9;
      try {
        await c.query(
          `INSERT INTO hrm_monthly_performance_reviews (user_id, employee_id, month_date, overall_kpi_score, bonus_coefficient, status, reviewer_comments, reviewed_at)
           VALUES ($1, $2, $3, $4, $5, 'reviewed', $6, NOW())
           ON CONFLICT (user_id, month_date) DO UPDATE SET overall_kpi_score = $4, bonus_coefficient = $5`,
          [user.id, user.id, month, score, bonus, `${user.name} ${month}月绩效: ${score}分`]
        );
        kpi++;
      } catch (e) { if (!e.message.includes("CONFLICT")) console.log("KPI err:", user.emp_id, e.message.slice(0,60)); }
    }

    // 2. Skills (5 per employee)
    for (const skillName of cfg.skills) {
      const current = randInt(1, 4);
      const target = Math.min(5, current + randInt(1, 2));
      try {
        await c.query(
          `INSERT INTO hrm_user_skill_matrix (user_id, employee_id, skill_name, skill_category, current_level, target_level, assessment_date)
           VALUES ($1, $2, $3, 'domain', $4, $5, NOW())
           ON CONFLICT (user_id, skill_name) DO UPDATE SET current_level = $4, target_level = $5`,
          [user.id, user.id, skillName, current, target]
        );
        skill++;
      } catch (e) { if (!e.message.includes("CONFLICT")) console.log("Skill err:", user.emp_id, e.message.slice(0,60)); }
    }

    // 3. Task metrics (3 months)
    for (const month of months) {
      const assigned = randInt(cfg.tasks[0], cfg.tasks[1]);
      const completed = randInt(Math.floor(assigned * 0.7), assigned);
      const onTime = randInt(Math.floor(completed * 0.75), completed);
      try {
        await c.query(
          `INSERT INTO employee_task_metrics (user_id, employee_id, period, tasks_assigned, tasks_completed, tasks_on_time, tasks_late, tasks_overdue, avg_quality_score, avg_delivery_days, defect_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (user_id, period) DO UPDATE SET tasks_assigned = $4, tasks_completed = $5`,
          [user.id, user.id, month, assigned, completed, onTime, completed - onTime, assigned - completed, rand(65, 95), rand(3, 15), randInt(0, 3)]
        );
        task++;
      } catch (e) { if (!e.message.includes("CONFLICT")) console.log("Task err:", user.emp_id, e.message.slice(0,60)); }
    }

    // 4. Work reports (3 months)
    for (const month of months) {
      const rate = rand(70, 98);
      try {
        await c.query(
          `INSERT INTO employee_periodic_reports (user_id, employee_id, report_type, period, status, completion_rate, key_accomplishments, next_period_goals)
           VALUES ($1, $2, 'monthly', $3, 'reviewed', $4, $5, $6)
           ON CONFLICT (user_id, report_type, period) DO UPDATE SET completion_rate = $4`,
          [user.id, user.id, month, rate, JSON.stringify([{title: `${month}月工作完成`, status: "done"}]), JSON.stringify([{title: `${cfg.skills[0]}提升`, priority: "high"}])]
        );
        report++;
      } catch (e) { if (!e.message.includes("CONFLICT")) console.log("Report err:", user.emp_id, e.message.slice(0,60)); }
    }
  }

  console.log(`KPI reviews:     ${kpi} (${users.length}人 × 3月)`);
  console.log(`Skill matrix:    ${skill} (${users.length}人 × 5技能)`);
  console.log(`Task metrics:    ${task} (${users.length}人 × 3月)`);
  console.log(`Work reports:    ${report} (${users.length}人 × 3月)`);
  console.log(`Points:          93 (already seeded)`);
  console.log(`\nTotal: ${kpi + skill + task + report + 93} records`);

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
