/**
 * 职业灯塔引擎 (Career Lighthouse Engine)
 *
 * GRT System 作为每个员工的导师：
 *  - 3条发展路线（激进/稳健/保守）× 岗位特性 → 个人目标地图
 *  - 结合岗位职能+薪酬政策+能力现状+心理特征 → 个性化赋能
 *  - 每日/周/月阶段性导师建议
 *  - 全球项目参与机会匹配
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ── GRT 3条发展路线 (2026-2030) ──
const SCENARIOS = {
  aggressive: {
    id: "aggressive",
    nameZh: "激进路线 🚀", nameEn: "Aggressive",
    revenue: { 2026: 1.5, 2027: 2.0, 2028: 3.0, 2029: 4.0, 2030: 5.0 }, // 亿RMB
    headcount: { 2026: 96, 2027: 130, 2028: 180, 2029: 240, 2030: 300 },
    regionMix: { 2026: { cn: 80, na: 15, eu: 5 }, 2028: { cn: 60, na: 25, eu: 15 }, 2030: { cn: 40, na: 20, eu: 40 } },
    tagZh: "2030年营收5亿·全球化领导者", tagEn: "¥500M by 2030 · Global Leader",
    descZh: "大量海外项目·快速扩招·高强度成长·薪资涨幅大·晋升机会多·需适应高压节奏",
    descEn: "Rapid overseas expansion, fast hiring, high growth intensity, significant salary increases",
  },
  steady: {
    id: "steady",
    nameZh: "稳健路线 📈", nameEn: "Steady Growth",
    revenue: { 2026: 1.2, 2027: 1.5, 2028: 2.0, 2029: 2.5, 2030: 3.0 },
    headcount: { 2026: 96, 2027: 110, 2028: 140, 2029: 170, 2030: 200 },
    regionMix: { 2026: { cn: 80, na: 15, eu: 5 }, 2028: { cn: 65, na: 20, eu: 15 }, 2030: { cn: 50, na: 20, eu: 30 } },
    tagZh: "2030年营收3亿·稳步全球化", tagEn: "¥300M by 2030 · Steady Globalization",
    descZh: "平衡国内与海外·有序扩招·稳定晋升·工作生活平衡·能力沉淀充分",
    descEn: "Balanced domestic and overseas, orderly expansion, stable promotions",
  },
  conservative: {
    id: "conservative",
    nameZh: "保守路线 🛡️", nameEn: "Conservative",
    revenue: { 2026: 1.0, 2027: 1.2, 2028: 1.5, 2029: 1.8, 2030: 2.0 },
    headcount: { 2026: 96, 2027: 100, 2028: 110, 2029: 120, 2030: 130 },
    regionMix: { 2026: { cn: 80, na: 15, eu: 5 }, 2028: { cn: 70, na: 18, eu: 12 }, 2030: { cn: 55, na: 20, eu: 25 } },
    tagZh: "2030年营收2亿·专精深耕", tagEn: "¥200M by 2030 · Deep Specialization",
    descZh: "聚焦核心客户·精益运营·深耕技术·低压力·适合追求专业深度",
    descEn: "Focus on core clients, lean operations, deep technical expertise",
  },
};

// ── 岗位发展模型 ──
const ROLE_GROWTH_MODELS: Record<string, any> = {
  bu_sales: {
    titleZh: "销售工程师", titleEn: "Sales Engineer",
    pathZh: "销售→高级销售→区域经理→BU销售总监→VP销售",
    pathEn: "SE → Senior SE → Regional Mgr → BU Sales Dir → VP Sales",
    keySkills: ["客户关系", "方案设计", "商务谈判", "行业洞察", "团队管理"],
    scenarioImpact: {
      aggressive: { opportunity: "大量海外客户拓展机会，2028年前可晋升区域经理", salary: "+40-60%", travel: "50%出差" },
      steady: { opportunity: "国内+海外均衡发展，2029年可晋升区域经理", salary: "+25-35%", travel: "30%出差" },
      conservative: { opportunity: "深耕现有大客户，提升客单价", salary: "+15-25%", travel: "20%出差" },
    },
  },
  bu_mech: {
    titleZh: "机械设计工程师", titleEn: "Mechanical Engineer",
    pathZh: "助理工程师→工程师→高级工程师→主任工程师→技术总监",
    pathEn: "Jr → ME → Senior ME → Principal → Tech Director",
    keySkills: ["3D设计", "有限元分析", "工艺优化", "项目协调", "技术创新"],
    scenarioImpact: {
      aggressive: { opportunity: "参与全球标杆项目，快速积累多行业经验", salary: "+35-50%", travel: "30%海外安装" },
      steady: { opportunity: "深耕1-2个行业，成为领域专家", salary: "+20-30%", travel: "15%海外" },
      conservative: { opportunity: "聚焦标准化，提升设计效率和复用率", salary: "+15-20%", travel: "少" },
    },
  },
  bu_elec: {
    titleZh: "电气设计工程师", titleEn: "Electrical Engineer",
    pathZh: "助理→电气工程师→高级电气→自动化架构师→CTO方向",
    pathEn: "Jr → EE → Senior EE → Automation Architect → CTO Track",
    keySkills: ["PLC编程", "电气设计", "自动化集成", "IoT/MES", "系统架构"],
    scenarioImpact: {
      aggressive: { opportunity: "智能化+数字化核心角色，参与GRTS平台建设", salary: "+40-55%", travel: "25%海外调试" },
      steady: { opportunity: "标准化+模块化深耕，成为自动化领域专家", salary: "+25-35%", travel: "15%海外" },
      conservative: { opportunity: "优化现有系统，提升稳定性和可维护性", salary: "+15-25%", travel: "少" },
    },
  },
  bu_pm: {
    titleZh: "项目经理", titleEn: "Project Manager",
    pathZh: "助理PM→PM→高级PM→项目总监→运营VP",
    pathEn: "Asst PM → PM → Sr PM → Program Dir → VP Operations",
    keySkills: ["M0-M12全流程", "客户管理", "成本控制", "团队协调", "风险管理"],
    scenarioImpact: {
      aggressive: { opportunity: "管理多国项目群，快速晋升项目总监", salary: "+35-50%", travel: "40%全球" },
      steady: { opportunity: "深耕重点项目，积累标杆案例", salary: "+25-35%", travel: "25%海外" },
      conservative: { opportunity: "优化项目交付流程，提升准时率", salary: "+20-30%", travel: "15%" },
    },
  },
  cs_engineer: {
    titleZh: "售后服务工程师", titleEn: "Service Engineer",
    pathZh: "现场工程师→高级服务→服务经理→全球服务总监",
    pathEn: "Field SE → Sr SE → Service Mgr → Global Service Dir",
    keySkills: ["故障诊断", "客户沟通", "远程支持", "培训交付", "服务创新"],
    scenarioImpact: {
      aggressive: { opportunity: "全球设备保有量增3倍，服务团队大幅扩编", salary: "+30-45%", travel: "40%全球驻场" },
      steady: { opportunity: "建立远程服务体系，AI辅助诊断", salary: "+20-30%", travel: "25%海外" },
      conservative: { opportunity: "深耕客户满意度，打造服务标杆", salary: "+15-25%", travel: "20%" },
    },
  },
  employee: {
    titleZh: "通用岗位", titleEn: "General Staff",
    pathZh: "初级→中级→高级→专家→管理方向",
    pathEn: "Junior → Mid → Senior → Expert → Management Track",
    keySkills: ["专业技能", "协作能力", "自驱力", "学习力", "创新思维"],
    scenarioImpact: {
      aggressive: { opportunity: "公司快速扩张=大量晋升空位", salary: "+25-40%", travel: "视岗位" },
      steady: { opportunity: "稳步成长，积累核心竞争力", salary: "+15-25%", travel: "视岗位" },
      conservative: { opportunity: "深耕专业，成为不可替代的专家", salary: "+10-20%", travel: "少" },
    },
  },
};

// ── Router ──
const scenarioRouter = router({
  /** 获取3条路线全景 */
  getThreeScenarios: protectedProcedure.query(() => {
    return Object.values(SCENARIOS);
  }),

  /** 获取员工个性化路线分析 */
  getMyCareerMap: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const userId = ctx.user!.id;
    const userRole = (ctx.user as any)?.effectiveRole || "employee";

    // 员工基本信息
    let employee: any = {};
    try {
      const [emp] = (await db.execute(sql`
        SELECT id, "openId", name, role FROM users WHERE id = ${userId}
      `)).rows as any[];
      employee = emp || {};
    } catch {}

    // 年度绩效
    let perfScore = 0;
    try {
      const [perf] = (await db.execute(sql`
        SELECT COALESCE(SUM(CAST(d.current_score AS NUMERIC) * CAST(d.weight AS NUMERIC)) / NULLIF(SUM(CAST(d.weight AS NUMERIC)),0), 0) as score
        FROM annual_goal_dimensions d JOIN annual_goal_agreements a ON d.agreement_id = a.id
        WHERE a.employee_id = ${userId} AND a.year = ${new Date().getFullYear()}
      `)).rows as any[];
      perfScore = Math.round(Number(perf?.score || 0));
    } catch {}

    // 积分
    let points = 0;
    try {
      const [pts] = (await db.execute(sql`SELECT COALESCE(current_balance, 0) as pts FROM point_balances WHERE employee_id = ${userId}`)).rows as any[];
      points = Number(pts?.pts || 0);
    } catch {}

    // 人格画像
    let persona: any = null;
    try {
      const [p] = (await db.execute(sql`SELECT * FROM employee_persona_profiles WHERE employee_id = ${userId} ORDER BY year DESC LIMIT 1`)).rows as any[];
      persona = p;
    } catch {}

    // 岗位模型
    const roleModel = ROLE_GROWTH_MODELS[userRole] || ROLE_GROWTH_MODELS.employee;

    // 生成3条个性化路线
    const personalScenarios = Object.entries(SCENARIOS).map(([key, s]) => {
      const impact = roleModel.scenarioImpact[key];
      return {
        ...s,
        roleTitle: roleModel.titleZh,
        careerPath: roleModel.pathZh,
        keySkills: roleModel.keySkills,
        personalImpact: impact,
        // 基于当前绩效的个性化建议
        fitnessScore: key === "aggressive" ? Math.min(perfScore + 10, 100) :
                      key === "steady" ? Math.min(perfScore + 20, 100) :
                      Math.min(perfScore + 30, 100),
      };
    });

    return {
      employee: { id: userId, name: employee.name, role: userRole },
      currentState: { perfScore, points, personaTier: persona?.persona_tier || "unknown" },
      roleModel,
      scenarios: personalScenarios,
    };
  }),
});

// ── 阶段性导师建议 ──
const mentorRouter = router({
  /** 每日导师寄语 — 基于当前状态生成 */
  getDailyGuidance: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const userId = ctx.user!.id;
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const dayOfMonth = new Date().getDate();

    const guidance: any = { userId, timestamp: new Date().toISOString(), messages: [] };

    // 晨间导师 (6-10点)
    if (hour >= 6 && hour < 10) {
      guidance.messages.push({
        type: "morning",
        titleZh: "晨间导师", titleEn: "Morning Mentor",
        messageZh: "今天是成为更好自己的机会。先提交计划，明确3件最重要的事，让每一分钟都有方向。",
        messageEn: "Today is your chance to grow. Submit your plan, focus on 3 priorities.",
        actionZh: "提交今日计划", actionPath: "/empowerment-engine",
      });
    }

    // 午间反思 (12-14点)
    if (hour >= 12 && hour < 14) {
      guidance.messages.push({
        type: "midday",
        titleZh: "午间反思", titleEn: "Midday Reflection",
        messageZh: "上午的产出是否对齐了你的年度目标？如果偏离了，下午是调整的最好时机。",
        messageEn: "Did morning output align with your annual goals? Afternoon is the best time to recalibrate.",
        actionZh: "查看目标进度", actionPath: "/goal-tracking",
      });
    }

    // 傍晚总结 (17-20点)
    if (hour >= 17 && hour < 20) {
      guidance.messages.push({
        type: "evening",
        titleZh: "今日收获", titleEn: "Daily Harvest",
        messageZh: "每天进步1%，一年后你将成长37倍。花5分钟写下今天的成就和明天的方向。",
        messageEn: "1% daily improvement = 37x growth in a year. Spend 5 minutes on your summary.",
        actionZh: "提交工作总结", actionPath: "/empowerment-engine",
      });
    }

    // 周一激励
    if (dayOfWeek === 1) {
      guidance.messages.push({
        type: "weekly",
        titleZh: "新周寄语", titleEn: "Weekly Kickoff",
        messageZh: "新的一周=新的52分之一。本周你要在哪个能力维度上突破？看看你的能力雷达图。",
        messageEn: "New week = 1/52 of your year. Which capability dimension will you break through?",
        actionZh: "查看能力雷达", actionPath: "/empowerment-engine",
      });
    }

    // 月初规划
    if (dayOfMonth <= 3) {
      guidance.messages.push({
        type: "monthly",
        titleZh: "月度规划", titleEn: "Monthly Planning",
        messageZh: "本月是冲刺绩效的好时机。检查你的KPI完成度，找到最大的得分增长点。",
        messageEn: "Review your KPI completion. Find the highest-impact scoring opportunity this month.",
        actionZh: "查看绩效运营中心", actionPath: "/performance-ops-center",
      });
    }

    // 通用成长建议
    guidance.messages.push({
      type: "growth",
      titleZh: "成长洞察", titleEn: "Growth Insight",
      messageZh: getGrowthInsight(),
      messageEn: "Your growth is the greatest investment.",
      actionZh: "查看职业灯塔", actionPath: "/career-lighthouse",
    });

    return guidance;
  }),
});

function getGrowthInsight(): string {
  const insights = [
    "在GRT的3条发展路线中，选择适合你的那条。不是最快的，而是最让你心安的。",
    "能力=知识×技能×意愿。找到你当前最短的那块板，每天花30分钟刻意练习。",
    "全球化不是遥远的概念——GRT的每个项目都在连接世界。你的下一个成长机会可能在北美或欧洲。",
    "最好的学习方式是教别人。找一个比你晚入职的同事，成为他的mentor。",
    "高质量的工作输出>长时间的加班。用AI Copilot提效，把省下的时间用于学习。",
    "你的积分不只是数字——它是你的努力被看见的证明。每天+10积分=一年+3650积分。",
    "项目交付不是终点，客户满意才是。想想你的工作如何让客户的工厂更好。",
    "2030年的你回看2026年，会感谢今天每一个认真提交的计划和总结。",
  ];
  return insights[new Date().getDate() % insights.length];
}

export const careerLighthouseRouter = router({
  scenario: scenarioRouter,
  mentor: mentorRouter,
});
