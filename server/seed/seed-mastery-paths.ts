/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT 全岗位大师级成长通径 — L1(入门) → L5(大师)              ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  A.1: 13 岗位 × 5 级 = 65 条大师通径                          ║
 * ║  A.2: 13 岗位 × 5 级 × 2-3 里程碑 ≈ 150 条成就               ║
 * ║  A.3: 65 个大师徽章 (铜→银→金→铂金→钻石)                     ║
 * ║  A.4: 培训绑定 + 晋升门槛                                     ║
 * ║  B.1: 6 大文化价值观 + 奋斗精神积分规则                        ║
 * ║  Run: npx tsx server/seed/seed-mastery-paths.ts               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

// ── TSDCKL 权重 (每维度在该岗位的重要性%) ──
const ROLE_WEIGHTS: Record<string, { T: number; S: number; D: number; C: number; K: number; L: number; nameZh: string; nameEn: string }> = {
  bu_sales:       { T: 15, S: 25, D: 10, C: 25, K: 15, L: 10, nameZh: "销售与项目工程师", nameEn: "Sales & Project Engineer" },
  bu_pm:          { T: 10, S: 20, D: 15, C: 20, K: 15, L: 20, nameZh: "项目经理", nameEn: "Project Manager" },
  bu_mech:        { T: 35, S: 10, D: 25, C: 10, K: 15, L:  5, nameZh: "机械设计工程师", nameEn: "Mechanical Engineer" },
  bu_elec:        { T: 35, S: 10, D: 25, C: 10, K: 15, L:  5, nameZh: "电气工程师", nameEn: "Electrical Engineer" },
  director:       { T: 10, S: 15, D: 10, C: 15, K: 15, L: 35, nameZh: "事业部经理", nameEn: "BU Director" },
  qc_manager:     { T: 20, S: 15, D: 15, C: 15, K: 25, L: 10, nameZh: "质量经理", nameEn: "Quality Manager" },
  prod_supervisor:{ T: 20, S: 15, D: 10, C: 15, K: 20, L: 20, nameZh: "生产主管", nameEn: "Production Supervisor" },
  floor_operator: { T: 40, S: 10, D: 15, C: 10, K: 20, L:  5, nameZh: "车间操作员", nameEn: "Floor Operator" },
  hr_director:    { T: 10, S: 25, D: 10, C: 20, K: 20, L: 15, nameZh: "HR主管", nameEn: "HR Director" },
  finance_mgr:    { T: 15, S: 10, D: 10, C: 15, K: 35, L: 15, nameZh: "财务经理", nameEn: "Finance Manager" },
  procurement:    { T: 15, S: 20, D: 10, C: 25, K: 20, L: 10, nameZh: "采购工程师", nameEn: "Procurement Engineer" },
  cs_engineer:    { T: 25, S: 20, D: 10, C: 25, K: 15, L:  5, nameZh: "售后工程师", nameEn: "Service Engineer" },
  ceo:            { T:  5, S: 15, D: 10, C: 15, K: 15, L: 40, nameZh: "CEO/CTO", nameEn: "CEO / CTO" },
};

// ── 5 级定义 ──
const LEVELS = [
  { code: "L1", name: "入门", nameEn: "Novice",        color: "#CD7F32", tier: "bronze",   minMonths: 0,  points: 100 },
  { code: "L2", name: "熟练", nameEn: "Proficient",    color: "#C0C0C0", tier: "silver",   minMonths: 6,  points: 300 },
  { code: "L3", name: "精通", nameEn: "Expert",        color: "#FFD700", tier: "gold",     minMonths: 18, points: 600 },
  { code: "L4", name: "专家", nameEn: "Master",        color: "#E5E4E2", tier: "platinum", minMonths: 36, points: 1000 },
  { code: "L5", name: "大师", nameEn: "Grandmaster",   color: "#B9F2FF", tier: "diamond",  minMonths: 60, points: 2000 },
];

// ── 每岗位每级里程碑 ──
type Milestone = { name: string; description: string; metric?: string };
const MILESTONES: Record<string, Milestone[][]> = {
  bu_sales: [
    [{ name: "首次客户拜访", description: "独立完成第一次客户现场拜访" }, { name: "CRM达人", description: "CRM录入≥10条有效商机", metric: "crm_opportunities≥10" }],
    [{ name: "报价能手", description: "独立完成≥5个项目报价", metric: "quotations≥5" }, { name: "首单签约", description: "签约首个合同(≥100万)", metric: "contract_amount≥1000000" }],
    [{ name: "年度签约800万", description: "年度累计签约≥800万", metric: "annual_contract≥8000000" }, { name: "客户满意度85+", description: "获得客户NPS≥85分" }, { name: "带教新人", description: "指导1名新销售工程师通过L1认证" }],
    [{ name: "年度签约2000万", description: "年度累计签约≥2000万" }, { name: "新客户开拓", description: "年度开发≥3个新客户" }, { name: "战略项目", description: "主导1个战略级项目(≥500万)" }],
    [{ name: "累计签约1亿", description: "职业生涯累计签约≥1亿" }, { name: "行业标杆", description: "建立1个可复制的行业标杆案例" }, { name: "培养精英", description: "培养≥2名L3销售工程师" }],
  ],
  bu_pm: [
    [{ name: "首个项目参与", description: "作为成员参与1个M0-M12项目" }, { name: "WBS编制", description: "完成首个项目WBS分解" }],
    [{ name: "独立管项目", description: "独立管理≥2个项目" }, { name: "按期交付", description: "项目按期交付率≥85%" }],
    [{ name: "多项目并行", description: "同时管理≥3个项目" }, { name: "预算控制", description: "项目预算偏差≤5%" }, { name: "FAT通过率90%", description: "FAT一次通过率≥90%" }],
    [{ name: "PMP认证", description: "获得PMP项目管理认证" }, { name: "风险管理", description: "成功预防≥3个重大项目风险" }, { name: "指导新PM", description: "培养1名新项目经理" }],
    [{ name: "项目管理标准", description: "建立公司级项目管理标准流程" }, { name: "累计交付20项目", description: "职业生涯成功交付≥20个项目" }, { name: "行业分享", description: "在行业会议上分享项目管理经验" }],
  ],
  bu_mech: [
    [{ name: "首张工程图", description: "完成首张工程图纸" }, { name: "CAD认证", description: "通过SolidWorks/CAD认证考试" }],
    [{ name: "独立BOM", description: "独立完成≥3个项目BOM编制" }, { name: "M2方案设计", description: "主导1个M2概念方案设计" }],
    [{ name: "DFMEA认证", description: "通过DFMEA认证考试" }, { name: "主导设计3项目", description: "主导≥3个项目的详细设计" }, { name: "图纸准确率98%", description: "图纸准确率≥98%" }],
    [{ name: "发明专利", description: "获得1项发明专利/实用新型" }, { name: "创新设计", description: "主导1个创新性设计方案" }, { name: "设计导师", description: "指导≥2名新工程师" }],
    [{ name: "技术论文", description: "发表行业技术论文/标准" }, { name: "战略设计5项目", description: "主导≥5个战略级项目设计" }, { name: "设计规范建立", description: "建立公司级设计规范标准" }],
  ],
  bu_elec: [
    [{ name: "首套电气图", description: "完成首套电气原理图" }, { name: "PLC基础", description: "完成PLC基础编程培训" }],
    [{ name: "独立接线", description: "独立完成≥3个项目电气接线设计" }, { name: "HMI开发", description: "完成1个项目HMI界面开发" }],
    [{ name: "PLC高级", description: "掌握西门子+三菱双平台编程" }, { name: "电气安全认证", description: "通过电气安全认证" }, { name: "调试成功率95%", description: "调试一次成功率≥95%" }],
    [{ name: "控制系统架构", description: "独立设计复杂控制系统架构" }, { name: "视觉/IoT集成", description: "完成机器视觉或IoT系统集成" }, { name: "电气导师", description: "指导≥2名新电气工程师" }],
    [{ name: "自动化标准", description: "建立公司电气自动化标准" }, { name: "行业技术交流", description: "在行业展会做技术演讲" }, { name: "专利成果", description: "获得≥2项技术专利" }],
  ],
  director: [
    [{ name: "部门运营理解", description: "完成事业部全流程轮岗学习" }, { name: "P&L基础", description: "完成P&L财务分析培训" }],
    [{ name: "年度计划", description: "制定并执行事业部年度计划" }, { name: "团队10人", description: "管理≥10人团队" }],
    [{ name: "营收达标", description: "事业部年度营收目标达成率≥100%" }, { name: "客户开发", description: "年度开发≥5个新客户" }, { name: "人才培养", description: "培养≥3名主管级人才" }],
    [{ name: "战略布局", description: "制定3年事业部战略规划" }, { name: "跨BU协同", description: "主导≥2个跨事业部协作项目" }, { name: "行业影响力", description: "在行业协会担任委员" }],
    [{ name: "行业领袖", description: "成为行业细分领域Top3负责人" }, { name: "商业模式创新", description: "建立新的商业模式/市场" }, { name: "继任者培养", description: "培养≥1名合格继任者" }],
  ],
  qc_manager: [
    [{ name: "质量体系入门", description: "完成IATF16949基础培训" }, { name: "首次审核参与", description: "参与1次内部审核" }],
    [{ name: "内审员资质", description: "获得IATF16949内审员证书" }, { name: "NCR闭环5个", description: "独立完成≥5个NCR闭环处理" }],
    [{ name: "体系审核主导", description: "主导≥2次体系审核" }, { name: "DPPM<500", description: "管辖范围DPPM<500" }, { name: "供应商审核", description: "完成≥5家供应商质量审核" }],
    [{ name: "VDA6.3审核员", description: "获得VDA6.3过程审核员证书" }, { name: "8D专家", description: "主导≥10个8D案例" }, { name: "质量导师", description: "培养≥2名质量工程师" }],
    [{ name: "质量标准制定", description: "建立公司级质量标准体系" }, { name: "零客诉月", description: "实现连续6个月零客户投诉" }, { name: "行业质量标杆", description: "获得行业质量奖项" }],
  ],
  prod_supervisor: [
    [{ name: "班组管理入门", description: "完成安全+5S基础培训" }, { name: "首次排产", description: "参与1次生产排产" }],
    [{ name: "独立管班组", description: "独立管理≥5人班组" }, { name: "安全零事故", description: "班组连续6个月零安全事故" }],
    [{ name: "OEE≥75%", description: "班组OEE达成≥75%" }, { name: "多技能培养", description: "班组≥3人持双岗证" }, { name: "精益改善", description: "主导≥3个精益改善项目" }],
    [{ name: "跨线管理", description: "同时管理≥2条产线" }, { name: "成本节约", description: "年度成本节约≥50万" }, { name: "班组长培养", description: "培养≥2名副班长" }],
    [{ name: "精益标杆线", description: "打造公司级精益标杆线" }, { name: "行业交流", description: "在精益论坛分享经验" }, { name: "TPM体系", description: "建立完整的TPM体系" }],
  ],
  floor_operator: [
    [{ name: "安全考试通过", description: "通过安全操作考试" }, { name: "首件合格", description: "独立完成首件产品且合格" }],
    [{ name: "本工位达标", description: "本工位产出达标率≥95%" }, { name: "质量自检", description: "连续3个月自检合格率100%" }],
    [{ name: "双岗能力", description: "持≥2个工位的上岗证" }, { name: "SOP指导", description: "能指导新人按SOP操作" }, { name: "改善提案", description: "提出≥3个被采纳的改善提案" }],
    [{ name: "全能工", description: "持≥4个工位上岗证" }, { name: "技术比武", description: "在技能比武中获奖" }, { name: "带教师傅", description: "获得正式带教师傅资格" }],
    [{ name: "技能状元", description: "获得公司年度技能状元" }, { name: "行业技能赛", description: "参加市/省级技能竞赛获奖" }, { name: "工艺优化", description: "主导工艺优化项目落地" }],
  ],
  hr_director: [
    [{ name: "HR入门", description: "完成劳动法规基础培训" }, { name: "首次招聘", description: "独立完成1个岗位招聘" }],
    [{ name: "HR全模块", description: "掌握招聘/培训/薪酬/绩效4模块" }, { name: "员工关系", description: "成功处理≥5个员工关系case" }],
    [{ name: "体系建设", description: "建立≥1个HR管理制度" }, { name: "人才盘点", description: "主导年度人才盘点" }, { name: "流失率<8%", description: "年度员工流失率<8%" }],
    [{ name: "组织发展", description: "主导1次组织架构优化" }, { name: "雇主品牌", description: "建立公司雇主品牌" }, { name: "HR数字化", description: "推动HR数字化系统上线" }],
    [{ name: "战略HR", description: "HR战略与公司战略深度协同" }, { name: "行业HR标杆", description: "获得行业最佳雇主奖" }, { name: "继任计划", description: "建立完整的继任者计划" }],
  ],
  finance_mgr: [
    [{ name: "会计基础", description: "完成新会计准则培训" }, { name: "首次月结", description: "参与1次月度财务结账" }],
    [{ name: "独立月结", description: "独立完成月度财务结账" }, { name: "报表准确99%", description: "报表准确率≥99%" }],
    [{ name: "预算管理", description: "主导年度预算编制" }, { name: "税务筹划", description: "完成≥1项税务筹划方案" }, { name: "成本分析", description: "建立项目成本分析模型" }],
    [{ name: "内控体系", description: "建立完整的内部控制体系" }, { name: "资金运营", description: "优化公司资金周转效率≥10%" }, { name: "财务BP", description: "成为事业部财务BP" }],
    [{ name: "财务战略", description: "参与公司战略规划的财务建模" }, { name: "融资能力", description: "完成1次外部融资/授信" }, { name: "财务标准", description: "建立公司级财务管理标准" }],
  ],
  procurement: [
    [{ name: "采购入门", description: "完成采购流程基础培训" }, { name: "首次询价", description: "独立完成1次询价/比价" }],
    [{ name: "供应商管理", description: "独立管理≥10家供应商" }, { name: "成本谈判", description: "完成≥5次成功的成本谈判" }],
    [{ name: "战略采购", description: "制定≥1类物料的采购策略" }, { name: "交期管理", description: "物料准时交付率≥95%" }, { name: "国产替代", description: "完成≥3项国产替代方案" }],
    [{ name: "供应链优化", description: "年度采购成本降低≥5%" }, { name: "风险管理", description: "建立供应链风险预警机制" }, { name: "采购导师", description: "培养≥1名新采购工程师" }],
    [{ name: "供应链战略", description: "建立公司级供应链战略" }, { name: "供应商生态", description: "建立优质供应商生态圈" }, { name: "行业标杆", description: "获得供应链管理行业认可" }],
  ],
  cs_engineer: [
    [{ name: "产品知识", description: "通过产品知识考试" }, { name: "首次现场", description: "完成首次客户现场服务" }],
    [{ name: "独立服务", description: "独立完成≥10次现场服务" }, { name: "故障诊断", description: "独立解决≥5个现场故障" }],
    [{ name: "SAT通过率90%", description: "SAT一次通过率≥90%" }, { name: "客户满意度", description: "服务满意度≥90分" }, { name: "远程诊断", description: "掌握远程故障诊断能力" }],
    [{ name: "服务标准", description: "建立标准化服务流程" }, { name: "培训客户", description: "为客户提供≥3次操作培训" }, { name: "服务导师", description: "指导≥2名新售后工程师" }],
    [{ name: "全球服务", description: "具备海外独立服务能力" }, { name: "预防性维护", description: "建立预防性维护体系" }, { name: "服务创新", description: "推动智能远程运维系统" }],
  ],
  ceo: [
    [{ name: "全局视野", description: "完成所有部门轮岗了解" }, { name: "战略思维", description: "通过战略管理课程" }],
    [{ name: "年度目标", description: "制定并推动年度经营目标" }, { name: "团队建设", description: "组建核心管理团队" }],
    [{ name: "营收增长", description: "公司年度营收增长≥20%" }, { name: "国际化", description: "拓展≥1个海外市场" }, { name: "创新驱动", description: "推动≥2项技术创新" }],
    [{ name: "行业地位", description: "公司进入行业Top10" }, { name: "资本运作", description: "完成1轮融资或战略并购" }, { name: "文化建设", description: "建立深入人心的企业文化" }],
    [{ name: "行业领袖", description: "成为行业公认领袖" }, { name: "商业传承", description: "建立可持续的商业模式" }, { name: "社会责任", description: "推动ESG/社会责任项目" }],
  ],
};

// ── 晋升门槛 ──
const PROMOTION_GATES = [
  { from: "bu_sales", fromLevel: "L4", to: "director", toLevel: "L1", desc: "销售专家→事业部经理" },
  { from: "bu_mech", fromLevel: "L4", to: "bu_pm", toLevel: "L2", desc: "机械专家→项目经理" },
  { from: "bu_elec", fromLevel: "L4", to: "bu_pm", toLevel: "L2", desc: "电气专家→项目经理" },
  { from: "bu_pm", fromLevel: "L4", to: "director", toLevel: "L2", desc: "PM专家→事业部经理" },
  { from: "prod_supervisor", fromLevel: "L4", to: "director", toLevel: "L1", desc: "生产专家→事业部经理" },
  { from: "floor_operator", fromLevel: "L4", to: "prod_supervisor", toLevel: "L2", desc: "全能工→生产主管" },
  { from: "hr_director", fromLevel: "L4", to: "ceo", toLevel: "L1", desc: "HR专家→高管" },
  { from: "finance_mgr", fromLevel: "L4", to: "ceo", toLevel: "L1", desc: "财务专家→高管" },
  { from: "cs_engineer", fromLevel: "L3", to: "bu_sales", toLevel: "L2", desc: "售后精通→销售" },
  { from: "procurement", fromLevel: "L3", to: "bu_pm", toLevel: "L1", desc: "采购精通→项目管理" },
];

// ── 企业文化价值观 ──
const CULTURE_VALUES = [
  { code: "customer_first", nameZh: "客户至上", nameEn: "Customer First", icon: "👥", description: "以客户需求为导向，超越客户期望", pointRule: "customer_satisfaction_bonus", points: 50 },
  { code: "continuous_improvement", nameZh: "精益求精", nameEn: "Continuous Improvement", icon: "🔧", description: "持续改善，追求卓越品质", pointRule: "improvement_proposal", points: 30 },
  { code: "teamwork", nameZh: "团队协作", nameEn: "Teamwork", icon: "🤝", description: "跨部门协作，共同达成目标", pointRule: "cross_team_collab", points: 20 },
  { code: "innovation", nameZh: "创新驱动", nameEn: "Innovation", icon: "💡", description: "勇于创新，拥抱变化", pointRule: "innovation_proposal", points: 100 },
  { code: "integrity", nameZh: "诚信担当", nameEn: "Integrity", icon: "🛡️", description: "诚实守信，勇于担当", pointRule: "integrity_award", points: 50 },
  { code: "striver_spirit", nameZh: "奋斗者精神", nameEn: "Striver Spirit", icon: "🔥", description: "以奋斗者为本，艰苦奋斗", pointRule: "striver_monthly", points: 200 },
];

// ── Seed Execution ──
async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) { console.error("[Seed] DATABASE_URL not set."); process.exit(1); }
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   GRT 全岗位大师级成长通径 + 企业文化                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  try {
    // ── A.1 大师通径表 ──
    console.log("[A.1] 创建 role_mastery_paths 表...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS role_mastery_paths (
        id SERIAL PRIMARY KEY,
        role_code VARCHAR(30) NOT NULL,
        role_name_zh VARCHAR(100),
        role_name_en VARCHAR(100),
        level_code VARCHAR(5) NOT NULL,
        level_name VARCHAR(20) NOT NULL,
        level_name_en VARCHAR(30),
        tier VARCHAR(20),
        color VARCHAR(10),
        tsdckl_weights JSONB NOT NULL,
        min_months INTEGER DEFAULT 0,
        reward_points INTEGER DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(role_code, level_code)
      )
    `);

    let pathCount = 0;
    for (const [roleCode, w] of Object.entries(ROLE_WEIGHTS)) {
      for (const lv of LEVELS) {
        const exists: any = await db.execute(sql`SELECT id FROM role_mastery_paths WHERE role_code = ${roleCode} AND level_code = ${lv.code} LIMIT 1`);
        if ((exists?.rows ?? exists ?? []).length > 0) continue;
        const weights = JSON.stringify({ T: w.T, S: w.S, D: w.D, C: w.C, K: w.K, L: w.L });
        await db.execute(sql.raw(`INSERT INTO role_mastery_paths (role_code, role_name_zh, role_name_en, level_code, level_name, level_name_en, tier, color, tsdckl_weights, min_months, reward_points) VALUES ('${roleCode}', '${w.nameZh}', '${w.nameEn}', '${lv.code}', '${lv.name}', '${lv.nameEn}', '${lv.tier}', '${lv.color}', '${weights}', ${lv.minMonths}, ${lv.points})`));
        pathCount++;
      }
    }
    console.log(`  => ${pathCount} 条大师通径 (13岗位 × 5级)\n`);

    // ── A.2 里程碑成就表 ──
    console.log("[A.2] 创建 mastery_milestones 表...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mastery_milestones (
        id SERIAL PRIMARY KEY,
        role_code VARCHAR(30) NOT NULL,
        level_code VARCHAR(5) NOT NULL,
        milestone_name VARCHAR(200) NOT NULL,
        description TEXT,
        metric_key VARCHAR(100),
        reward_points INTEGER DEFAULT 50,
        badge_tier VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    let milestoneCount = 0;
    for (const [roleCode, levels] of Object.entries(MILESTONES)) {
      for (let i = 0; i < levels.length; i++) {
        const lvCode = LEVELS[i].code;
        for (const m of levels[i]) {
          const exists: any = await db.execute(sql`SELECT id FROM mastery_milestones WHERE role_code = ${roleCode} AND level_code = ${lvCode} AND milestone_name = ${m.name} LIMIT 1`);
          if ((exists?.rows ?? exists ?? []).length > 0) continue;
          await db.execute(sql`INSERT INTO mastery_milestones (role_code, level_code, milestone_name, description, metric_key, reward_points, badge_tier) VALUES (${roleCode}, ${lvCode}, ${m.name}, ${m.description}, ${m.metric || null}, ${LEVELS[i].points / 2}, ${LEVELS[i].tier})`);
          milestoneCount++;
        }
      }
    }
    console.log(`  => ${milestoneCount} 条里程碑成就\n`);

    // ── A.3 大师徽章表 ──
    console.log("[A.3] 创建 mastery_badges 表...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mastery_badges (
        id SERIAL PRIMARY KEY,
        badge_code VARCHAR(50) UNIQUE NOT NULL,
        role_code VARCHAR(30) NOT NULL,
        level_code VARCHAR(5) NOT NULL,
        badge_name VARCHAR(200) NOT NULL,
        description TEXT,
        color VARCHAR(10),
        tier VARCHAR(20),
        icon_emoji VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const tierEmoji: Record<string, string> = { bronze: "🥉", silver: "🥈", gold: "🥇", platinum: "💎", diamond: "👑" };
    let badgeCount = 0;
    for (const [roleCode, w] of Object.entries(ROLE_WEIGHTS)) {
      for (const lv of LEVELS) {
        const code = `${roleCode}_${lv.code}`;
        const exists: any = await db.execute(sql`SELECT id FROM mastery_badges WHERE badge_code = ${code} LIMIT 1`);
        if ((exists?.rows ?? exists ?? []).length > 0) continue;
        const name = `${w.nameZh} ${lv.name}`;
        const desc = `${w.nameZh}岗位达到${lv.name}(${lv.nameEn})等级`;
        await db.execute(sql.raw(`INSERT INTO mastery_badges (badge_code, role_code, level_code, badge_name, description, color, tier, icon_emoji) VALUES ('${code}', '${roleCode}', '${lv.code}', '${name}', '${desc}', '${lv.color}', '${lv.tier}', '${tierEmoji[lv.tier]}')`));
        badgeCount++;
      }
    }
    console.log(`  => ${badgeCount} 个大师徽章\n`);

    // ── A.5 晋升门槛表 ──
    console.log("[A.5] 创建 mastery_promotion_gates 表...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mastery_promotion_gates (
        id SERIAL PRIMARY KEY,
        from_role VARCHAR(30) NOT NULL,
        from_level VARCHAR(5) NOT NULL,
        to_role VARCHAR(30) NOT NULL,
        to_level VARCHAR(5) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(from_role, from_level, to_role)
      )
    `);

    let gateCount = 0;
    for (const g of PROMOTION_GATES) {
      const exists: any = await db.execute(sql`SELECT id FROM mastery_promotion_gates WHERE from_role = ${g.from} AND to_role = ${g.to} LIMIT 1`);
      if ((exists?.rows ?? exists ?? []).length > 0) continue;
      await db.execute(sql`INSERT INTO mastery_promotion_gates (from_role, from_level, to_role, to_level, description) VALUES (${g.from}, ${g.fromLevel}, ${g.to}, ${g.toLevel}, ${g.desc})`);
      gateCount++;
    }
    console.log(`  => ${gateCount} 条晋升门槛\n`);

    // ── B.1 企业文化价值观表 ──
    console.log("[B.1] 创建企业文化 + 奋斗精神...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS company_culture_values (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name_zh VARCHAR(100) NOT NULL,
        name_en VARCHAR(100),
        icon VARCHAR(10),
        description TEXT,
        point_rule_code VARCHAR(50),
        bonus_points INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const v of CULTURE_VALUES) {
      const exists: any = await db.execute(sql`SELECT id FROM company_culture_values WHERE code = ${v.code} LIMIT 1`);
      if ((exists?.rows ?? exists ?? []).length > 0) continue;
      await db.execute(sql`INSERT INTO company_culture_values (code, name_zh, name_en, icon, description, point_rule_code, bonus_points) VALUES (${v.code}, ${v.nameZh}, ${v.nameEn}, ${v.icon}, ${v.description}, ${v.pointRule}, ${v.points})`);
    }
    console.log(`  => ${CULTURE_VALUES.length} 大文化价值观`);

    // ── B.2 特殊积分规则 ──
    console.log("[B.2] 奋斗者积分规则...");
    const specialRules = [
      { code: "problem_hunter", name: "问题猎人", desc: "发现并解决生产问题", points: 50, category: "innovation" },
      { code: "mentor_badge", name: "导师勋章", desc: "带教新人通过L1认证", points: 200, category: "collaboration" },
      { code: "innovation_pioneer", name: "创新先锋", desc: "提出改善提案并落地", points: 100, category: "innovation" },
      { code: "cert_pass_bonus", name: "认证通过奖励", desc: "每次技能认证通过", points: 80, category: "training" },
      { code: "striver_monthly", name: "月度奋斗者", desc: "月度积分Top10%", points: 200, category: "attendance" },
      { code: "zero_defect_week", name: "零缺陷周", desc: "连续1周零质量缺陷", points: 30, category: "quality" },
    ];
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mastery_point_rules (
        id SERIAL PRIMARY KEY,
        rule_code VARCHAR(50) UNIQUE NOT NULL,
        rule_name VARCHAR(100) NOT NULL,
        description TEXT,
        points INTEGER DEFAULT 0,
        category VARCHAR(30),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    for (const r of specialRules) {
      const exists: any = await db.execute(sql`SELECT id FROM mastery_point_rules WHERE rule_code = ${r.code} LIMIT 1`);
      if ((exists?.rows ?? exists ?? []).length > 0) continue;
      await db.execute(sql`INSERT INTO mastery_point_rules (rule_code, rule_name, description, points, category) VALUES (${r.code}, ${r.name}, ${r.desc}, ${r.points}, ${r.category})`);
    }
    console.log(`  => ${specialRules.length} 条奋斗者积分规则\n`);

    // ── Summary ──
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║   全岗位大师级成长通径 — 完成                               ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  大师通径:    ${String(pathCount).padStart(3)} 条 (13岗位 × 5级)                   ║`);
    console.log(`║  里程碑成就:  ${String(milestoneCount).padStart(3)} 条 (每级2-3个)                     ║`);
    console.log(`║  大师徽章:    ${String(badgeCount).padStart(3)} 个 (铜→银→金→铂金→钻石)            ║`);
    console.log(`║  晋升门槛:    ${String(gateCount).padStart(3)} 条 (跨岗位晋升路径)                 ║`);
    console.log(`║  文化价值观:    6 大核心价值                              ║`);
    console.log(`║  奋斗者规则:    6 条特殊积分规则                          ║`);
    console.log("╚══════════════════════════════════════════════════════════════╝");

  } catch (error) {
    console.error("\n[Seed] FATAL ERROR:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const isDirectRun = process.argv[1]?.includes("seed-mastery-paths");
if (isDirectRun) { seed(); }
