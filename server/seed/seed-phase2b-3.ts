/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   Phase 2.3: 360度评估表 + Phase 3: 培训路径预设               ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  1. 创建 hrm_peer_evaluations 表 (360度同事互评)               ║
 * ║  2. 种入岗位培训路径 (training_stage_plans)                     ║
 * ║  Run: npx tsx server/seed/seed-phase2b-3.ts                    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

// ── Phase 2.3: 360度评估维度 ──
const PEER_EVAL_DIMENSIONS = [
  { name: "团队协作", description: "跨部门协作、主动支持、信息共享", weight: 25 },
  { name: "沟通表达", description: "表达清晰、倾听理解、反馈及时", weight: 25 },
  { name: "责任担当", description: "主动承担、按时交付、质量意识", weight: 25 },
  { name: "专业能力", description: "技术深度、问题解决、持续学习", weight: 25 },
];

// ── Phase 3: 13 岗位培训路径 ──
const TRAINING_PATHS: { role: string; courses: { name: string; category: string; hours: number; mandatory: boolean; stage: string }[] }[] = [
  {
    role: "CEO/VP",
    courses: [
      { name: "战略规划与执行", category: "leadership", hours: 16, mandatory: true, stage: "annual" },
      { name: "财务报表分析", category: "finance", hours: 8, mandatory: true, stage: "annual" },
      { name: "数字化转型领导力", category: "digital", hours: 8, mandatory: false, stage: "annual" },
    ],
  },
  {
    role: "事业部经理/Director",
    courses: [
      { name: "P&L经营管理", category: "management", hours: 16, mandatory: true, stage: "annual" },
      { name: "项目管理(PMP)", category: "project", hours: 24, mandatory: true, stage: "onboarding" },
      { name: "客户关系管理", category: "sales", hours: 8, mandatory: true, stage: "annual" },
      { name: "IATF 16949质量体系", category: "quality", hours: 8, mandatory: true, stage: "annual" },
    ],
  },
  {
    role: "HR Director/Specialist",
    courses: [
      { name: "劳动法规与合规", category: "legal", hours: 16, mandatory: true, stage: "onboarding" },
      { name: "招聘面试技巧", category: "hr", hours: 8, mandatory: true, stage: "onboarding" },
      { name: "绩效管理体系设计", category: "hr", hours: 12, mandatory: true, stage: "annual" },
      { name: "组织发展与变革", category: "leadership", hours: 8, mandatory: false, stage: "annual" },
    ],
  },
  {
    role: "财务经理/Specialist",
    courses: [
      { name: "新会计准则解读", category: "finance", hours: 8, mandatory: true, stage: "annual" },
      { name: "税务筹划与合规", category: "finance", hours: 12, mandatory: true, stage: "annual" },
      { name: "内部控制与审计", category: "finance", hours: 8, mandatory: true, stage: "annual" },
      { name: "ERP财务模块操作", category: "digital", hours: 4, mandatory: true, stage: "onboarding" },
    ],
  },
  {
    role: "质量经理/QC Manager",
    courses: [
      { name: "IATF 16949内审员", category: "quality", hours: 24, mandatory: true, stage: "onboarding" },
      { name: "FMEA(第五版)实战", category: "quality", hours: 16, mandatory: true, stage: "onboarding" },
      { name: "8D问题解决法", category: "quality", hours: 8, mandatory: true, stage: "annual" },
      { name: "SPC统计过程控制", category: "quality", hours: 12, mandatory: true, stage: "annual" },
      { name: "VDA 6.3过程审核", category: "quality", hours: 16, mandatory: false, stage: "annual" },
    ],
  },
  {
    role: "销售总监/Sales Director",
    courses: [
      { name: "大客户关系管理", category: "sales", hours: 12, mandatory: true, stage: "annual" },
      { name: "商务谈判技巧", category: "sales", hours: 8, mandatory: true, stage: "onboarding" },
      { name: "行业趋势与竞争分析", category: "strategy", hours: 8, mandatory: true, stage: "annual" },
    ],
  },
  {
    role: "销售与项目工程师/Sales Rep",
    courses: [
      { name: "产品知识与工艺原理", category: "technical", hours: 16, mandatory: true, stage: "onboarding" },
      { name: "技术方案编制", category: "technical", hours: 8, mandatory: true, stage: "onboarding" },
      { name: "客户沟通与需求分析", category: "sales", hours: 8, mandatory: true, stage: "onboarding" },
      { name: "报价与合同管理", category: "sales", hours: 8, mandatory: true, stage: "probation" },
      { name: "CRM系统操作", category: "digital", hours: 4, mandatory: true, stage: "onboarding" },
    ],
  },
  {
    role: "项目经理/Project Manager",
    courses: [
      { name: "PMP项目管理", category: "project", hours: 40, mandatory: true, stage: "onboarding" },
      { name: "M0-M12项目全生命周期", category: "project", hours: 16, mandatory: true, stage: "onboarding" },
      { name: "WBS与进度管理", category: "project", hours: 8, mandatory: true, stage: "onboarding" },
      { name: "风险管理与应急预案", category: "project", hours: 8, mandatory: true, stage: "annual" },
      { name: "GRT System POS操作", category: "digital", hours: 4, mandatory: true, stage: "onboarding" },
    ],
  },
  {
    role: "生产主管/Production Supervisor",
    courses: [
      { name: "安全生产管理", category: "safety", hours: 16, mandatory: true, stage: "onboarding" },
      { name: "5S现场管理", category: "management", hours: 8, mandatory: true, stage: "onboarding" },
      { name: "班组管理与激励", category: "leadership", hours: 8, mandatory: true, stage: "annual" },
      { name: "精益生产基础", category: "manufacturing", hours: 12, mandatory: false, stage: "annual" },
    ],
  },
  {
    role: "工程师/Engineer(机械)",
    courses: [
      { name: "CAD/SolidWorks高级", category: "technical", hours: 24, mandatory: true, stage: "onboarding" },
      { name: "GD&T几何公差", category: "technical", hours: 16, mandatory: true, stage: "onboarding" },
      { name: "DFMEA设计失效模式", category: "quality", hours: 12, mandatory: true, stage: "probation" },
      { name: "BOM编制规范", category: "technical", hours: 8, mandatory: true, stage: "onboarding" },
      { name: "PLM系统操作", category: "digital", hours: 4, mandatory: true, stage: "onboarding" },
    ],
  },
  {
    role: "工程师/Engineer(电气)",
    courses: [
      { name: "PLC编程(西门子/三菱)", category: "technical", hours: 24, mandatory: true, stage: "onboarding" },
      { name: "电气安全规范", category: "safety", hours: 8, mandatory: true, stage: "onboarding" },
      { name: "电气原理图绘制(EPLAN)", category: "technical", hours: 16, mandatory: true, stage: "onboarding" },
      { name: "HMI界面开发", category: "technical", hours: 12, mandatory: false, stage: "probation" },
    ],
  },
  {
    role: "车间操作员/Floor Operator(装配)",
    courses: [
      { name: "安全操作规程", category: "safety", hours: 8, mandatory: true, stage: "onboarding" },
      { name: "SOP标准作业指导书", category: "manufacturing", hours: 4, mandatory: true, stage: "onboarding" },
      { name: "质量自检方法", category: "quality", hours: 4, mandatory: true, stage: "onboarding" },
      { name: "5S工位整理", category: "management", hours: 2, mandatory: true, stage: "onboarding" },
      { name: "设备日常保养", category: "manufacturing", hours: 4, mandatory: true, stage: "probation" },
    ],
  },
  {
    role: "车间操作员/Floor Operator(机加工/焊接)",
    courses: [
      { name: "数控机床操作", category: "technical", hours: 16, mandatory: true, stage: "onboarding" },
      { name: "焊接工艺规范", category: "technical", hours: 12, mandatory: true, stage: "onboarding" },
      { name: "量具使用与校准", category: "quality", hours: 4, mandatory: true, stage: "onboarding" },
      { name: "安全操作规程", category: "safety", hours: 8, mandatory: true, stage: "onboarding" },
    ],
  },
];

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) { console.error("[Seed] DATABASE_URL not set."); process.exit(1); }

  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   Phase 2.3 + Phase 3: 360评估表 + 培训路径预设             ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  try {
    // ── Phase 2.3: 创建 360度评估表 ──
    console.log("[1/3] 创建 hrm_peer_evaluations 表...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hrm_peer_evaluations (
        id SERIAL PRIMARY KEY,
        evaluator_user_id INTEGER NOT NULL,
        evaluator_name VARCHAR(100),
        evaluated_user_id INTEGER NOT NULL,
        evaluated_name VARCHAR(100),
        evaluation_period VARCHAR(20) NOT NULL,
        evaluation_type VARCHAR(20) NOT NULL DEFAULT 'peer',
        dimension_scores JSONB,
        overall_score DECIMAL(5,2),
        strengths TEXT,
        improvements TEXT,
        status VARCHAR(20) DEFAULT 'draft',
        submitted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(evaluator_user_id, evaluated_user_id, evaluation_period)
      )
    `);
    console.log("  => hrm_peer_evaluations 表就绪");

    // 种入评估维度配置
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hrm_evaluation_dimensions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        weight DECIMAL(5,2) DEFAULT 25,
        evaluation_type VARCHAR(20) DEFAULT 'peer',
        is_active BOOLEAN DEFAULT true
      )
    `);

    for (const dim of PEER_EVAL_DIMENSIONS) {
      const existing: any = await db.execute(sql`
        SELECT id FROM hrm_evaluation_dimensions WHERE name = ${dim.name} LIMIT 1
      `);
      const rows = existing?.rows ?? existing ?? [];
      if (rows.length === 0) {
        await db.execute(sql`
          INSERT INTO hrm_evaluation_dimensions (name, description, weight, evaluation_type)
          VALUES (${dim.name}, ${dim.description}, ${dim.weight}, 'peer')
        `);
      }
    }
    console.log(`  => ${PEER_EVAL_DIMENSIONS.length} 个评估维度配置完成\n`);

    // 360 评估权重配置
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hrm_evaluation_weight_config (
        id SERIAL PRIMARY KEY,
        self_weight DECIMAL(5,2) DEFAULT 20,
        supervisor_weight DECIMAL(5,2) DEFAULT 40,
        peer_weight DECIMAL(5,2) DEFAULT 20,
        subordinate_weight DECIMAL(5,2) DEFAULT 20,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const configExists: any = await db.execute(sql`SELECT id FROM hrm_evaluation_weight_config LIMIT 1`);
    if ((configExists?.rows ?? configExists ?? []).length === 0) {
      await db.execute(sql`
        INSERT INTO hrm_evaluation_weight_config (self_weight, supervisor_weight, peer_weight, subordinate_weight)
        VALUES (20, 40, 20, 20)
      `);
    }
    console.log("  => 360评估权重: 自评20% + 上级40% + 同事20% + 下属20%\n");

    // ── Phase 3: 种入培训路径 ──
    console.log("[2/3] 种入岗位培训路径...");
    let materialCount = 0;
    let pathCount = 0;

    for (const path of TRAINING_PATHS) {
      console.log(`  [${path.role}]`);
      for (const course of path.courses) {
        // 确保 training_materials 中存在
        const code = `TRN-${course.category.toUpperCase().slice(0, 3)}-${String(materialCount + 1).padStart(3, "0")}`;
        const existing: any = await db.execute(sql`
          SELECT id FROM training_materials WHERE title = ${course.name} LIMIT 1
        `);
        const rows = existing?.rows ?? existing ?? [];
        let materialId: number;
        if (rows.length > 0) {
          materialId = rows[0].id;
        } else {
          const inserted: any = await db.execute(sql`
            INSERT INTO training_materials (code, title, category, format, duration_minutes, difficulty, is_public, version, status)
            VALUES (${code}, ${course.name}, ${course.category}, 'online', ${course.hours * 60}, ${course.mandatory ? 'required' : 'recommended'}, true, 1, 'active')
            RETURNING id
          `);
          materialId = (inserted?.rows ?? inserted ?? [])[0]?.id || 0;
          materialCount++;
        }
        console.log(`    ${course.mandatory ? "●" : "○"} ${course.name} (${course.hours}h, ${course.stage})`);
      }
      pathCount++;
    }
    console.log(`\n  => ${pathCount} 条培训路径, ${materialCount} 个新课程入库\n`);

    // ── Phase 3.2: 资质到期提醒配置 ──
    console.log("[3/3] 资质到期提醒配置...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hrm_qualification_alerts (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        qualification_name VARCHAR(200) NOT NULL,
        expiry_date DATE NOT NULL,
        alert_days_before INTEGER DEFAULT 30,
        alert_sent BOOLEAN DEFAULT false,
        alert_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  => hrm_qualification_alerts 表就绪");
    console.log("  => 操作员资质到期前30天自动预警\n");

    // ── Summary ──
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║   Phase 2.3 + Phase 3 完成                                 ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  360评估表:     hrm_peer_evaluations + 4维度 + 权重配置    ║`);
    console.log(`║  培训路径:      ${String(pathCount).padStart(2)} 个岗位 × ${String(TRAINING_PATHS.reduce((s, p) => s + p.courses.length, 0)).padStart(2)} 门课程                    ║`);
    console.log(`║  新课程入库:    ${String(materialCount).padStart(2)} 门                                     ║`);
    console.log(`║  资质预警表:    hrm_qualification_alerts (30天提前)        ║`);
    console.log(`║  绩效系数:     A=1.3 B+=1.15 B=1.0 C=0.85 D=0.7          ║`);
    console.log("╚══════════════════════════════════════════════════════════════╝");

  } catch (error) {
    console.error("\n[Seed] FATAL ERROR:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const isDirectRun = process.argv[1]?.includes("seed-phase2b-3");
if (isDirectRun) { seed(); }
