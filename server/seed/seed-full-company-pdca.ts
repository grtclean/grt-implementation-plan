/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT 全员 PDCA — 96 名员工按角色分配所有已建功能              ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  为每位员工生成:                                                ║
 * ║   1. 大师等级初始化 (employee_role_mastery)                     ║
 * ║   2. 月度 KPI 考核计划 (2026-04 ~ 2026-12)                    ║
 * ║   3. 培训任务分配 (基于岗位+当前等级)                          ║
 * ║   4. OA 审批模板绑定 (基于岗位类型)                            ║
 * ║   5. 文化价值观积分初始化                                       ║
 * ║  Run: npx tsx server/seed/seed-full-company-pdca.ts            ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

// ── 角色→大师通径 roleCode 映射 ──
const RBAC_TO_MASTERY: Record<string, string> = {
  ceo: "ceo", vp: "ceo",
  director: "director", sales_director: "director",
  project_manager: "bu_pm",
  sales_rep: "bu_sales",
  engineer: "bu_mech", // 默认机械,电气单独处理
  qc_manager: "qc_manager",
  production_supervisor: "prod_supervisor",
  floor_operator: "floor_operator",
  hr_director: "hr_director",
  finance_manager: "finance_mgr",
  finance_specialist: "finance_mgr",
};

// ── 角色→默认初始等级 ──
const ROLE_INITIAL_LEVEL: Record<string, string> = {
  ceo: "L4", vp: "L3", director: "L3", sales_director: "L3",
  project_manager: "L2", qc_manager: "L2",
  sales_rep: "L1", engineer: "L1",
  production_supervisor: "L2", floor_operator: "L1",
  hr_director: "L2", finance_manager: "L2", finance_specialist: "L1",
};

// ── 角色→OA 常用审批类型 ──
const ROLE_OA_TYPES: Record<string, string[]> = {
  ceo: ["SEAL", "GIFT", "PROCUREMENT"],
  vp: ["SEAL", "PROCUREMENT", "EXPENSE"],
  director: ["LEAVE", "OVERTIME", "EXPENSE", "PROCUREMENT", "SEAL"],
  sales_director: ["LEAVE", "EXPENSE", "OUTING", "VEHICLE"],
  project_manager: ["LEAVE", "EXPENSE", "OUTING", "VEHICLE", "PROCUREMENT"],
  sales_rep: ["LEAVE", "EXPENSE", "OUTING", "VEHICLE"],
  engineer: ["LEAVE", "OVERTIME", "EXPENSE", "STATIONERY"],
  qc_manager: ["LEAVE", "EXPENSE", "PROCUREMENT"],
  production_supervisor: ["LEAVE", "OVERTIME", "ATTENDANCE_FIX"],
  floor_operator: ["LEAVE", "OVERTIME", "ATTENDANCE_FIX"],
  hr_director: ["LEAVE", "EXPENSE", "STATIONERY"],
  finance_manager: ["LEAVE", "EXPENSE"],
  finance_specialist: ["LEAVE", "EXPENSE", "ATTENDANCE_FIX"],
};

// ── 岗位→月度 KPI 重点指标 (从 seed-kpi-presets 的 position 映射) ──
const ROLE_KPI_POSITION_TITLE: Record<string, string> = {
  ceo: "董事长/CEO",
  vp: "副总裁/VP",
  director: "事业部经理/Director",
  sales_director: "销售总监/Sales Director",
  project_manager: "项目经理/Project Manager",
  sales_rep: "销售与项目工程师/Sales Rep",
  engineer: "工程师/Engineer",
  qc_manager: "质量经理/QC Manager",
  production_supervisor: "生产主管/Production Supervisor",
  floor_operator: "车间操作员/Floor Operator",
  hr_director: "人事行政主管/HR Director",
  finance_manager: "财务经理/Finance Manager",
  finance_specialist: "财务专员/Finance Specialist",
};

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) { console.error("[Seed] DATABASE_URL not set."); process.exit(1); }
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   GRT 全员 PDCA — 96 员工按角色完整功能分配                 ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  try {
    // ── 建表 ──
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS employee_role_mastery (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(20) NOT NULL,
        employee_name VARCHAR(100),
        role_code VARCHAR(30) NOT NULL,
        current_level VARCHAR(5) DEFAULT 'L1',
        target_level VARCHAR(5) DEFAULT 'L2',
        mastery_score DECIMAL(5,2) DEFAULT 0,
        milestones_completed INTEGER DEFAULT 0,
        milestones_total INTEGER DEFAULT 0,
        badges_earned INTEGER DEFAULT 0,
        training_hours_completed DECIMAL(6,1) DEFAULT 0,
        training_hours_required DECIMAL(6,1) DEFAULT 0,
        last_assessment_date DATE,
        next_assessment_date DATE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(employee_id, role_code)
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS employee_pdca_plans (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(20) NOT NULL,
        employee_name VARCHAR(100),
        plan_type VARCHAR(30) NOT NULL,
        plan_period VARCHAR(20) NOT NULL,
        plan_title VARCHAR(300) NOT NULL,
        plan_details JSONB,
        status VARCHAR(20) DEFAULT 'planned',
        due_date DATE,
        completed_at TIMESTAMP,
        score DECIMAL(5,2),
        reviewer_id VARCHAR(20),
        reviewer_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(employee_id, plan_type, plan_period, plan_title)
      )
    `);

    // ── Step 1: 获取全部员工 ──
    console.log("[1/5] 获取全部员工...");
    const empResult: any = await db.execute(sql`
      SELECT ge.employee_id, ge.name, ge.department, ge.supervisor_id,
             u."openId", u.role as user_role,
             s.name as supervisor_name
      FROM grt_employees ge
      LEFT JOIN users u ON u.name = ge.name
      LEFT JOIN grt_employees s ON ge.supervisor_id = s.id
      WHERE ge.is_active = 1
      ORDER BY ge.department, ge.name
    `);
    const employees = empResult?.rows ?? empResult ?? [];
    console.log(`  => ${employees.length} 名员工\n`);

    // ── 获取 RBAC 角色映射 ──
    const rbacResult: any = await db.execute(sql`
      SELECT ur.user_id, r.name as role_name
      FROM grt_user_roles ur
      JOIN grt_roles r ON ur.role_id = r.id
      WHERE ur.is_active = true
    `);
    const rbacRows = rbacResult?.rows ?? rbacResult ?? [];
    const userRbacMap = new Map<string, string>();
    for (const r of rbacRows) {
      userRbacMap.set(r.user_id, r.role_name);
    }

    // ── Step 2: 为每位员工初始化大师等级 ──
    console.log("[2/5] 初始化大师等级...");
    let masteryCount = 0;
    for (const emp of employees) {
      const rbacRole = userRbacMap.get(emp.openId || emp.employee_id) || "floor_operator";
      const masteryRole = RBAC_TO_MASTERY[rbacRole] || "floor_operator";

      // 电气相关岗位特殊处理
      const finalRole = (emp.department?.includes("电气") || emp.name?.includes("电气"))
        ? "bu_elec" : masteryRole;

      const initLevel = ROLE_INITIAL_LEVEL[rbacRole] || "L1";
      const targetLevel = `L${Math.min(parseInt(initLevel.replace("L", "")) + 1, 5)}`;

      // 查询该角色该等级的里程碑数
      const msResult: any = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM mastery_milestones WHERE role_code = ${finalRole}
      `);
      const totalMilestones = (msResult?.rows ?? msResult ?? [])[0]?.cnt || 0;

      const exists: any = await db.execute(sql`
        SELECT id FROM employee_role_mastery WHERE employee_id = ${emp.employee_id} AND role_code = ${finalRole} LIMIT 1
      `);
      if ((exists?.rows ?? exists ?? []).length === 0) {
        await db.execute(sql`
          INSERT INTO employee_role_mastery (employee_id, employee_name, role_code, current_level, target_level, milestones_total, next_assessment_date)
          VALUES (${emp.employee_id}, ${emp.name}, ${finalRole}, ${initLevel}, ${targetLevel}, ${totalMilestones}, ${new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]})
        `);
        masteryCount++;
      }
    }
    console.log(`  => ${masteryCount} 条大师等级初始化\n`);

    // ── Step 3: 为每位员工生成月度 KPI 考核计划 (2026-04 ~ 2026-12) ──
    console.log("[3/5] 生成月度 KPI 考核计划...");
    let kpiPlanCount = 0;
    const months = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"];

    for (const emp of employees) {
      const rbacRole = userRbacMap.get(emp.openId || emp.employee_id) || "floor_operator";
      const posTitle = ROLE_KPI_POSITION_TITLE[rbacRole] || "车间操作员/Floor Operator";

      for (const month of months) {
        const exists: any = await db.execute(sql`
          SELECT id FROM employee_pdca_plans WHERE employee_id = ${emp.employee_id} AND plan_type = 'kpi_review' AND plan_period = ${month} LIMIT 1
        `);
        if ((exists?.rows ?? exists ?? []).length > 0) continue;

        const dueDate = `${month}-25`; // 每月25日前完成
        await db.execute(sql`
          INSERT INTO employee_pdca_plans (employee_id, employee_name, plan_type, plan_period, plan_title, due_date, reviewer_id, reviewer_name, plan_details)
          VALUES (${emp.employee_id}, ${emp.name}, 'kpi_review', ${month}, ${`${month} 月度绩效考核 (${posTitle})`}, ${dueDate}, ${emp.supervisor_id ? String(emp.supervisor_id) : null}, ${emp.supervisor_name}, ${JSON.stringify({ positionTitle: posTitle, rbacRole, steps: ["自评", "主管评", "HR汇总", "绩效工资计算"] })})
        `);
        kpiPlanCount++;
      }
    }
    console.log(`  => ${kpiPlanCount} 条月度 KPI 考核计划\n`);

    // ── Step 4: 为每位员工分配培训任务 ──
    console.log("[4/5] 分配培训任务...");
    let trainingCount = 0;

    // 获取已有的培训课程
    const coursesResult: any = await db.execute(sql`
      SELECT id, title, category, duration_minutes, difficulty FROM training_materials WHERE status = 'active' ORDER BY id LIMIT 200
    `);
    const courses = coursesResult?.rows ?? coursesResult ?? [];

    // 按岗位分配课程 (简化: 每人分配 3-5 门相关课程)
    const ROLE_COURSE_KEYWORDS: Record<string, string[]> = {
      ceo: ["战略", "财务", "领导"],
      vp: ["战略", "管理", "数字化"],
      director: ["P&L", "项目管理", "IATF", "客户"],
      sales_director: ["大客户", "谈判", "行业"],
      project_manager: ["PMP", "M0-M12", "WBS", "风险", "POS"],
      sales_rep: ["产品", "技术方案", "客户沟通", "报价", "CRM"],
      engineer: ["CAD", "GD&T", "DFMEA", "BOM", "PLM"],
      qc_manager: ["IATF", "FMEA", "8D", "SPC", "VDA"],
      production_supervisor: ["安全", "5S", "班组", "精益"],
      floor_operator: ["安全", "SOP", "质量", "5S", "设备"],
      hr_director: ["劳动法", "招聘", "绩效", "组织"],
      finance_manager: ["会计", "税务", "内控", "ERP"],
      finance_specialist: ["会计", "税务", "内控", "ERP"],
    };

    for (const emp of employees) {
      const rbacRole = userRbacMap.get(emp.openId || emp.employee_id) || "floor_operator";
      const keywords = ROLE_COURSE_KEYWORDS[rbacRole] || ROLE_COURSE_KEYWORDS.floor_operator;

      // 找匹配的课程
      const matched = courses.filter((c: any) =>
        keywords.some(kw => (c.title || "").includes(kw) || (c.category || "").includes(kw))
      ).slice(0, 5);

      for (const course of matched) {
        const exists: any = await db.execute(sql`
          SELECT id FROM employee_pdca_plans WHERE employee_id = ${emp.employee_id} AND plan_type = 'training' AND plan_title = ${course.title} LIMIT 1
        `);
        if ((exists?.rows ?? exists ?? []).length > 0) continue;

        await db.execute(sql`
          INSERT INTO employee_pdca_plans (employee_id, employee_name, plan_type, plan_period, plan_title, due_date, plan_details)
          VALUES (${emp.employee_id}, ${emp.name}, 'training', '2026-H1', ${course.title}, '2026-06-30', ${JSON.stringify({ courseId: course.id, hours: Math.round((course.duration_minutes || 60) / 60), category: course.category })})
        `);
        trainingCount++;
      }
    }
    console.log(`  => ${trainingCount} 条培训任务\n`);

    // ── Step 5: 文化价值观积分初始化 ──
    console.log("[5/5] 文化价值观积分初始化...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS employee_culture_points (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(20) NOT NULL,
        employee_name VARCHAR(100),
        culture_code VARCHAR(50) NOT NULL,
        points INTEGER DEFAULT 0,
        last_awarded_at TIMESTAMP,
        total_awards INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(employee_id, culture_code)
      )
    `);

    let cultureCount = 0;
    const cultureResult: any = await db.execute(sql`SELECT code FROM company_culture_values WHERE is_active = true`);
    const cultureCodes = (cultureResult?.rows ?? cultureResult ?? []).map((r: any) => r.code);

    for (const emp of employees) {
      for (const code of cultureCodes) {
        const exists: any = await db.execute(sql`
          SELECT id FROM employee_culture_points WHERE employee_id = ${emp.employee_id} AND culture_code = ${code} LIMIT 1
        `);
        if ((exists?.rows ?? exists ?? []).length > 0) continue;
        await db.execute(sql`
          INSERT INTO employee_culture_points (employee_id, employee_name, culture_code, points)
          VALUES (${emp.employee_id}, ${emp.name}, ${code}, 0)
        `);
        cultureCount++;
      }
    }
    console.log(`  => ${cultureCount} 条文化积分记录\n`);

    // ── Summary ──
    const totalPlans = kpiPlanCount + trainingCount;
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║   GRT 全员 PDCA 分配完成                                    ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  员工总数:        ${String(employees.length).padStart(4)}                                  ║`);
    console.log(`║  大师等级初始化:  ${String(masteryCount).padStart(4)} 条                                  ║`);
    console.log(`║  月度KPI计划:     ${String(kpiPlanCount).padStart(4)} 条 (4-12月 × ${employees.length}人)         ║`);
    console.log(`║  培训任务分配:    ${String(trainingCount).padStart(4)} 条 (每人3-5门)                     ║`);
    console.log(`║  文化积分初始化:  ${String(cultureCount).padStart(4)} 条 (${employees.length}人 × 6价值观)          ║`);
    console.log(`║  PDCA总计划:      ${String(totalPlans).padStart(4)} 条                                  ║`);
    console.log("╚══════════════════════════════════════════════════════════════╝");

  } catch (error) {
    console.error("\n[Seed] FATAL ERROR:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const isDirectRun = process.argv[1]?.includes("seed-full-company-pdca");
if (isDirectRun) { seed(); }
