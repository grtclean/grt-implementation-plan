/**
 * Seed Employee Profiles, KPI, Work Plans, Skill Matrix for all 93 GRT employees
 *
 * Populates:
 * 1. hrm_monthly_performance_reviews (Jan-Mar 2026 KPI scores)
 * 2. hrm_user_skill_matrix (skills per role)
 * 3. employee_task_metrics (monthly task delivery)
 * 4. employee_periodic_reports (monthly work plans)
 * 5. point_balances (initial points)
 *
 * Run: node scripts/seed-employee-profiles-kpi.cjs
 */
const { Client } = require("pg");

// Employee roster: [numId, empId, name, pinyin, dept, position, role]
const EMP = [
  [1,"GRT001","倪亚东","niyadong","总裁办","董事长","ceo"],
  [80,"GRT080","刘奥运","liuaoyun","AI数智部","董事长助理","vp"],
  [49,"GRT049","胡杨","huyang","AI数智部","IT工程师","engineer"],
  [62,"GRT062","朱宇浩","zhuyuhao","事业二部","生产工程师兼IT","engineer"],
  [83,"GRT083","刘坤","liukun","AI数智部","市场主管","sales_rep"],
  [103,"GRT103","朱文韬","zhuwentao","AI数智部","市场专员","sales_rep"],
  [105,"GRT105","倪微薇","niweiwei","AI数智部","AI数智&人事行政部经理","vp"],
  [2,"GRT002","黄晓兰","huangxiaolan","财务部","出纳","finance_specialist"],
  [54,"GRT054","王秀萍","wangxiuping","财务部","总账会计","finance_manager"],
  [101,"GRT101","王汝月","wangruyue","财务部","财务专员","finance_specialist"],
  [66,"GRT066","李新正","lixinzheng","财务部","仓库管理员","floor_operator"],
  [81,"GRT081","马康风","makangfeng","财务部","供应链助理工程师","engineer"],
  [67,"GRT067","沙建梅","shajianmei","人事行政部","人事行政主管","hr_director"],
  [53,"GRT053","段天珠","duantianzhu","人事行政部","前法","engineer"],
  [100,"GRT100","田炜钰","tianweiyu","人事行政部","行政前台","floor_operator"],
  [95,"GRT095","王爱云","wangaiyun","人事行政部","后勤助理","floor_operator"],
  [4,"GRT004","戴晓燕","daixiaoyan","事业一部","高级销售经理","sales_director"],
  [5,"GRT005","金晓锋","jinxiaofeng","事业一部","制造质量经理","qc_manager"],
  [22,"GRT022","李大鹏","lidapeng","事业一部","电气工程师","engineer"],
  [63,"GRT063","刘健康","liujiankang","事业一部","销售与项目工程师","sales_rep"],
  [20,"GRT020","张洵","zhangxun","事业一部","采购与项目工程师","engineer"],
  [57,"GRT057","滕顺英","tengshunying","事业一部","采购与项目工程师","engineer"],
  [35,"GRT035","王志强","wangzhiqiang","事业一部","销售与项目工程师","sales_rep"],
  [104,"GRT104","董纾雨","dongshuyu","事业一部","销售与项目工程师","sales_rep"],
  [30,"GRT030","匡凯旋","kuangkaixuan","事业一部","售后服务主管","production_supervisor"],
  [14,"GRT014","廉龙海","lianlonghai","事业一部","售后技工","engineer"],
  [28,"GRT028","朱明华","zhuminghua","事业一部","售后技工","engineer"],
  [40,"GRT040","曾春贵","zengchungui","事业一部","售后技工","engineer"],
  [15,"GRT015","杜显文","duxianwen","事业一部","电气班组副班长","production_supervisor"],
  [46,"GRT046","吕雪冬","lvxuedong","事业一部","电气班组班长","production_supervisor"],
  [87,"GRT087","梅奥杰","meiaojie","事业一部","助理电气工程师","engineer"],
  [88,"GRT088","高嘉义","gaojiayi","事业一部","助理电气工程师","engineer"],
  [90,"GRT090","陈加丽","chenjiali","事业一部","助理机械研发工程师","engineer"],
  [10,"GRT010","吴卫成","wuweicheng","事业一部","机械装配","floor_operator"],
  [16,"GRT016","曹庆伟","caoqingwei","事业一部","机械装配","floor_operator"],
  [39,"GRT039","侯德朋","houdepeng","事业一部","机械装配","floor_operator"],
  [41,"GRT041","张良","zhangliang","事业一部","机械装配","floor_operator"],
  [52,"GRT052","赵强","zhaoqiang","事业一部","机械装配","floor_operator"],
  [59,"GRT059","焦斌","jiaobin","事业一部","机械装配","floor_operator"],
  [79,"GRT079","阎建华","yanjianhua","事业一部","机械装配","floor_operator"],
  [31,"GRT031","沈龙翔","shenlongxiang","事业一部","电气装配","floor_operator"],
  [36,"GRT036","韩品来","hanpinlai","事业一部","电气装配","floor_operator"],
  [51,"GRT051","崔聪聪","cuicongcong","事业一部","电气装配","floor_operator"],
  [71,"GRT071","刘琛杨","liuchenyang","事业一部","电气装配","floor_operator"],
  [72,"GRT072","赵铖杰","zhaochengjie","事业一部","电气装配","floor_operator"],
  [17,"GRT017","田坪珍","tianpingzhen","事业一部","焊工","floor_operator"],
  [82,"GRT082","沈富高","shenfugao","事业一部","焊工","floor_operator"],
  [64,"GRT064","强兵兵","qiangbingbing","事业一部","激光切割","floor_operator"],
  [61,"GRT061","李明遂","limingsui","事业一部","数控车工","floor_operator"],
  [47,"GRT047","嵇国华","jiguohua","事业一部","协作辅助","floor_operator"],
  [94,"GRT094","徐树奎","xushukui","事业二部","事业二部经理","director"],
  [6,"GRT006","洪香龙","hongxianglong","事业二部","机械设计经理","production_supervisor"],
  [44,"GRT044","洪小东","hongxiaodong","事业二部","机械研发工程师","engineer"],
  [97,"GRT097","钱佳奇","qianjiaqi","事业二部","电气工程师","engineer"],
  [65,"GRT065","蔡瑞","cairui","事业二部","机械研发工程师","engineer"],
  [99,"GRT099","殷金刚","yinjingang","事业二部","机械研发工程师","engineer"],
  [38,"GRT038","马林山","malinshan","事业二部","装配班组长","production_supervisor"],
  [74,"GRT074","王金涛","wangjintao","事业二部","机械装配","floor_operator"],
  [58,"GRT058","周辉","zhouhui","事业三部","事业三部经理","director"],
  [7,"GRT007","孙坚","sunjian","事业三部","电气主管","production_supervisor"],
  [55,"GRT055","沈迎凤","shenyingfeng","事业三部","采购经理","project_manager"],
  [3,"GRT003","倪亚琴","niyaqin","事业三部","采购与项目工程师","engineer"],
  [19,"GRT019","冯艳","fengyan","事业三部","销售与项目工程师","sales_rep"],
  [43,"GRT043","韩保程","hanbaocheng","事业三部","销售与项目工程师","sales_rep"],
  [93,"GRT093","李柯瑶","likeyao","事业三部","销售与项目工程师","sales_rep"],
  [89,"GRT089","罗小玲","luoxiaoling","事业三部","助理机械研发工程师","engineer"],
  [13,"GRT013","孙淼","sunmiao","事业三部","机械装配","floor_operator"],
  [21,"GRT021","张松松","zhangsongsong","事业三部","机械装配","floor_operator"],
  [25,"GRT025","肖博雅","xiaoboya","事业三部","机械装配","floor_operator"],
  [32,"GRT032","王犇","wangben","事业三部","机械装配","floor_operator"],
  [34,"GRT034","王勇","wangyong","事业三部","机械装配","floor_operator"],
  [42,"GRT042","刘建年","liujiannian","事业三部","机械装配","floor_operator"],
  [50,"GRT050","蕾翠林","leicuilin","事业三部","机械装配","floor_operator"],
  [60,"GRT060","杨会龙","yanghuilong","事业三部","机械装配","floor_operator"],
  [75,"GRT075","胡绍杰","hushaojie","事业三部","机械装配","floor_operator"],
  [76,"GRT076","王森","wangsen","事业三部","机械装配","floor_operator"],
  [77,"GRT077","吴阳洋","wuyangyang","事业三部","机械装配","floor_operator"],
  [84,"GRT084","蒋秋瑞","jiangqiurui","事业三部","机械装配","floor_operator"],
  [23,"GRT023","杨之雲","yangzhiyun","事业三部","电气装配","floor_operator"],
  [29,"GRT029","殷小勇","yinxiaoyong","事业三部","电气装配","floor_operator"],
  [56,"GRT056","陈成成","chenchengcheng","事业三部","焊工","floor_operator"],
  [37,"GRT037","黄潇潇","huangxiaoxiao","事业三部","文员","floor_operator"],
  [18,"GRT018","孙国祥","sunguoxiang","事业四部","电气工程师","engineer"],
  [24,"GRT024","张腾飞","zhangtengfei","事业四部","机加工班组长","production_supervisor"],
  [8,"GRT008","马柯","make","事业十部","质量专员","engineer"],
  [9,"GRT009","史龙昌","shilongchang","事业十部","激光切作班组长","production_supervisor"],
  [11,"GRT011","张超","zhangchao","事业十部","激光","floor_operator"],
  [12,"GRT012","李兴伟","lixingwei","事业十部","冷作","floor_operator"],
  [68,"GRT068","李亚超","liyachao","事业十部","CNC操作工","floor_operator"],
  [69,"GRT069","李鹏飞","lipengfei","事业十部","数控车工","floor_operator"],
  [73,"GRT073","范威","fanwei","事业十部","CNC操作工","floor_operator"],
  [102,"GRT102","张飞","zhangfei","事业十部","机加工铣工","floor_operator"],
  [45,"GRT045","杨勇","yangyong","事业三部","生产工程师兼项目经理","project_manager"],
];

// Role-based KPI ranges & skill templates
const ROLE_CONFIG = {
  ceo:       { kpi: [85,98], tasks: [5,10], skills: ["战略规划","组织管理","商务谈判","行业洞察","团队建设"] },
  vp:        { kpi: [78,95], tasks: [8,15], skills: ["部门管理","项目协调","流程优化","数据分析","跨部门协作"] },
  director:  { kpi: [75,92], tasks: [10,20], skills: ["团队管理","业务规划","客户管理","资源调配","风险管控"] },
  hr_director:{ kpi: [72,90], tasks: [8,15], skills: ["招聘管理","绩效考核","培训发展","劳动法规","组织发展"] },
  finance_manager:{ kpi: [75,92], tasks: [10,18], skills: ["财务分析","预算管理","税务筹划","成本控制","审计合规"] },
  finance_specialist:{ kpi: [68,88], tasks: [12,20], skills: ["账务处理","报表编制","银行对账","发票管理","费用审核"] },
  qc_manager:{ kpi: [78,95], tasks: [10,18], skills: ["质量体系","IQC/IPQC/FQC","FMEA","8D报告","供应商质量"] },
  sales_director:{ kpi: [75,92], tasks: [8,15], skills: ["客户开发","商务谈判","项目报价","合同管理","售后服务"] },
  sales_rep: { kpi: [65,88], tasks: [10,20], skills: ["客户沟通","技术方案","项目跟踪","报价制作","交付协调"] },
  project_manager:{ kpi: [72,90], tasks: [10,20], skills: ["项目计划","进度管控","成本控制","团队协调","风险管理"] },
  production_supervisor:{ kpi: [72,90], tasks: [12,25], skills: ["生产排程","班组管理","5S管理","安全管理","质量控制"] },
  engineer:  { kpi: [65,88], tasks: [10,20], skills: ["技术设计","图纸审核","工艺优化","故障排查","标准执行"] },
  floor_operator:{ kpi: [60,85], tasks: [15,30], skills: ["设备操作","工艺执行","质量自检","安全规范","5S维护"] },
};

function rand(min, max) { return Math.round((Math.random() * (max - min) + min) * 10) / 10; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function main() {
  const c = new Client({ connectionString: "postgresql://postgres:Gerry123456@localhost:5432/grt_system" });
  await c.connect();

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  GRT Employee Profile & KPI Data Seeding                     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Ensure tables
  await c.query(`CREATE TABLE IF NOT EXISTS hrm_monthly_performance_reviews (
    id SERIAL PRIMARY KEY, user_id INTEGER, position_id INTEGER, month_date VARCHAR(7),
    overall_kpi_score NUMERIC(5,2), bonus_coefficient NUMERIC(4,2),
    kpi_details_json JSONB, gaps_text TEXT, improvement_plan_text TEXT, reviewer_comments TEXT,
    status VARCHAR(20) DEFAULT 'reviewed', reviewed_by VARCHAR(50), reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, month_date)
  )`);
  await c.query(`CREATE TABLE IF NOT EXISTS hrm_user_skill_matrix (
    id SERIAL PRIMARY KEY, user_id INTEGER, skill_name VARCHAR(100),
    skill_category VARCHAR(30), current_level INTEGER, target_level INTEGER,
    assessment_date VARCHAR(10), assessed_by VARCHAR(50), history_json JSONB,
    created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, skill_name)
  )`);
  await c.query(`CREATE TABLE IF NOT EXISTS employee_task_metrics (
    id SERIAL PRIMARY KEY, user_id INTEGER, period VARCHAR(7),
    tasks_assigned INTEGER, tasks_completed INTEGER, tasks_on_time INTEGER,
    tasks_late INTEGER, tasks_overdue INTEGER,
    avg_quality_score NUMERIC(5,2), avg_delivery_days NUMERIC(5,1),
    defect_count INTEGER DEFAULT 0, rework_count INTEGER DEFAULT 0,
    customer_satisfaction_avg NUMERIC(3,1),
    project_contributions JSONB, ai_generated_summary TEXT,
    created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, period)
  )`);
  await c.query(`CREATE TABLE IF NOT EXISTS employee_periodic_reports (
    id SERIAL PRIMARY KEY, user_id INTEGER, report_type VARCHAR(20), period VARCHAR(10),
    status VARCHAR(20) DEFAULT 'reviewed',
    planned_items JSONB, completed_items JSONB,
    completion_rate NUMERIC(5,2),
    key_accomplishments TEXT, challenges TEXT, next_period_goals TEXT,
    kpi_summary_json JSONB, ai_narrative TEXT, ai_recommendations TEXT,
    reviewed_by VARCHAR(50), manager_comments TEXT,
    created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, report_type, period)
  )`);
  await c.query(`CREATE TABLE IF NOT EXISTS point_balances (
    id SERIAL PRIMARY KEY, employee_id VARCHAR(20) UNIQUE,
    current_balance INTEGER DEFAULT 100, total_earned INTEGER DEFAULT 100,
    total_spent INTEGER DEFAULT 0, total_penalties INTEGER DEFAULT 0,
    ytd_points INTEGER DEFAULT 100,
    is_on_observation BOOLEAN DEFAULT false, is_excellence_suspended BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
  )`);

  const months = ["2026-01", "2026-02", "2026-03"];
  let kpiCount = 0, skillCount = 0, taskCount = 0, reportCount = 0, pointCount = 0;

  for (const [numId, empId, name, pinyin, dept, position, role] of EMP) {
    const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.floor_operator;

    // 1. Monthly KPI reviews (3 months)
    for (const month of months) {
      const score = rand(cfg.kpi[0], cfg.kpi[1]);
      const bonus = score >= 90 ? 1.3 : score >= 80 ? 1.1 : score >= 70 ? 1.0 : 0.9;
      try {
        await c.query(
          `INSERT INTO hrm_monthly_performance_reviews (user_id, month_date, overall_kpi_score, bonus_coefficient, status, reviewer_comments, reviewed_by, reviewed_at)
           VALUES ($1, $2, $3, $4, 'reviewed', $5, $6, NOW())
           ON CONFLICT (user_id, month_date) DO UPDATE SET overall_kpi_score = $3, bonus_coefficient = $4`,
          [numId, month, score, bonus, `${month}月绩效评估完成`, role === "ceo" ? "自评" : "直属上级"]
        );
        kpiCount++;
      } catch {}
    }

    // 2. Skill matrix (5 skills per employee)
    for (const skill of cfg.skills) {
      const current = randInt(1, 4);
      const target = Math.min(5, current + randInt(1, 2));
      try {
        await c.query(
          `INSERT INTO hrm_user_skill_matrix (user_id, skill_name, skill_category, current_level, target_level, assessment_date, assessed_by)
           VALUES ($1, $2, $3, $4, $5, '2026-02-21', $6)
           ON CONFLICT (user_id, skill_name) DO UPDATE SET current_level = $4, target_level = $5`,
          [numId, skill, "domain", current, target, "倪亚东"]
        );
        skillCount++;
      } catch {}
    }

    // 3. Task metrics (3 months)
    for (const month of months) {
      const assigned = randInt(cfg.tasks[0], cfg.tasks[1]);
      const completed = randInt(Math.floor(assigned * 0.7), assigned);
      const onTime = randInt(Math.floor(completed * 0.75), completed);
      const late = completed - onTime;
      const overdue = assigned - completed;
      const quality = rand(65, 95);
      try {
        await c.query(
          `INSERT INTO employee_task_metrics (user_id, period, tasks_assigned, tasks_completed, tasks_on_time, tasks_late, tasks_overdue, avg_quality_score, avg_delivery_days, defect_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (user_id, period) DO UPDATE SET tasks_assigned = $3, tasks_completed = $4`,
          [numId, month, assigned, completed, onTime, late, overdue, quality, rand(3, 15), randInt(0, 3)]
        );
        taskCount++;
      } catch {}
    }

    // 4. Monthly work reports
    for (const month of months) {
      const completionRate = rand(70, 98);
      try {
        await c.query(
          `INSERT INTO employee_periodic_reports (user_id, report_type, period, status, completion_rate, key_accomplishments, next_period_goals, reviewed_by)
           VALUES ($1, 'monthly', $2, 'reviewed', $3, $4, $5, $6)
           ON CONFLICT (user_id, report_type, period) DO UPDATE SET completion_rate = $3`,
          [numId, month, completionRate, `${month}月工作完成情况正常`, `${month.replace("2026-0","").replace("1","2月").replace("2","3月").replace("3","4月")}重点工作计划`, "直属上级"]
        );
        reportCount++;
      } catch {}
    }

    // 5. Point balance
    const points = randInt(80, 200);
    try {
      await c.query(
        `INSERT INTO point_balances (employee_id, current_balance, total_earned, ytd_points)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (employee_id) DO UPDATE SET current_balance = $2`,
        [empId, points, points, points]
      );
      pointCount++;
    } catch {}
  }

  console.log(`  KPI reviews:    ${kpiCount} records (${EMP.length} × 3 months)`);
  console.log(`  Skill matrix:   ${skillCount} records (${EMP.length} × 5 skills)`);
  console.log(`  Task metrics:   ${taskCount} records (${EMP.length} × 3 months)`);
  console.log(`  Work reports:   ${reportCount} records (${EMP.length} × 3 months)`);
  console.log(`  Point balances: ${pointCount} records`);
  console.log(`\n  Total: ${kpiCount + skillCount + taskCount + reportCount + pointCount} records seeded`);

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
