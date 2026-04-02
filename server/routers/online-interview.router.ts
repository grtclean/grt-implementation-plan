/**
 * 在线面试系统 Router
 *
 * 候选人自助申请 → AI题库推荐 → 在线答题 → AI评分 → 安排面试时间
 * 支持按岗位族自动匹配题目
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ═══ 岗位族题库 ═══
const QUESTION_BANK: Record<string, Array<{
  id: string; question: string; questionEn: string;
  type: "text" | "choice" | "scenario";
  options?: string[];
  category: string;
  difficulty: "basic" | "intermediate" | "advanced";
  idealAnswer?: string;
  weight: number;
}>> = {
  sales: [
    { id: "S01", question: "请描述你最成功的一次大客户开发经历，包括客户规模和签约金额", questionEn: "Describe your most successful large client acquisition", type: "text", category: "业务能力", difficulty: "intermediate", idealAnswer: "需体现:客户分析→痛点挖掘→方案定制→关系建设→成交闭环", weight: 15 },
    { id: "S02", question: "如果客户对报价表示太贵，但你知道产品有明显技术优势，你会怎么处理？", questionEn: "How would you handle price objection when you have clear tech advantage?", type: "text", category: "谈判能力", difficulty: "intermediate", idealAnswer: "TCO分析+竞品对比+价值量化+分阶段合作", weight: 15 },
    { id: "S03", question: "工业清洗设备的主要应用行业有哪些？", questionEn: "What are the main industries for industrial cleaning equipment?", type: "choice", options: ["汽车动力总成(齿轴/缸体)", "铝压铸件", "半导体/精密电子", "新能源电池", "以上全部"], category: "行业认知", difficulty: "basic", idealAnswer: "以上全部", weight: 10 },
    { id: "S04", question: "你如何制定一个新市场的开拓计划？请以北美市场为例", questionEn: "How would you plan to develop the North American market?", type: "text", category: "战略思维", difficulty: "advanced", idealAnswer: "市场调研→目标客户画像→渠道选择→参展/拜访→本地化策略→合规", weight: 15 },
    { id: "S05", question: "GRT的3条发展路线(激进/稳健/保守)中，你认为哪条最合理？为什么？", questionEn: "Which GRT growth scenario do you think is most reasonable?", type: "text", category: "战略认知", difficulty: "basic", idealAnswer: "考察是否提前了解了GRT(talent-portal自学习)", weight: 10 },
    { id: "S06", question: "你能带领一个3人销售团队在一年内实现多少销售额？如何分配目标？", questionEn: "What revenue target can you achieve with a 3-person team?", type: "text", category: "团队管理", difficulty: "advanced", idealAnswer: "具体数字+分解逻辑+辅导计划+风险预案", weight: 15 },
  ],
  engineer: [
    { id: "E01", question: "请描述你参与过的最复杂的机械/电气设计项目，包括挑战和解决方案", questionEn: "Describe your most complex engineering project", type: "text", category: "项目经验", difficulty: "intermediate", idealAnswer: "项目背景→技术难点→解决方案→结果验证", weight: 15 },
    { id: "E02", question: "BOM管理中，如何确保物料清单的准确性和版本控制？", questionEn: "How do you ensure BOM accuracy and version control?", type: "text", category: "专业技能", difficulty: "intermediate", idealAnswer: "PDM工具+审批流程+变更ECN+冻结机制", weight: 15 },
    { id: "E03", question: "超声波清洗的基本原理是什么？影响清洗效果的关键参数有哪些？", questionEn: "What is the principle of ultrasonic cleaning?", type: "text", category: "行业知识", difficulty: "basic", idealAnswer: "空化效应+频率/功率/温度/时间/清洗剂", weight: 10 },
    { id: "E04", question: "你使用过哪些3D设计软件？请描述有限元分析(FEA)的应用场景", questionEn: "Which CAD software have you used? Describe FEA applications", type: "text", category: "工具技能", difficulty: "basic", idealAnswer: "SolidWorks/Inventor+强度/振动/热分析+案例", weight: 10 },
    { id: "E05", question: "如何从M0(立项)到M12(结项)管理一个清洗设备项目的技术交付？", questionEn: "How to manage technical delivery from M0 to M12?", type: "text", category: "全流程", difficulty: "advanced", idealAnswer: "阶段gate→设计评审→BOM冻结→制造→FAT→SAT→验收", weight: 15 },
    { id: "E06", question: "如果FAT(工厂验收)发现超声功率不达标，你的排查思路是什么？", questionEn: "FAT finds ultrasonic power below spec. Your troubleshooting?", type: "text", category: "问题解决", difficulty: "advanced", idealAnswer: "系统化排查:发生器→换能器→匹配→负载→测量方法", weight: 15 },
  ],
  production: [
    { id: "P01", question: "你操作过哪些数控设备？最大加工精度可以达到多少？", questionEn: "What CNC machines have you operated?", type: "text", category: "技能经验", difficulty: "basic", idealAnswer: "具体设备型号+加工精度+材料类型", weight: 20 },
    { id: "P02", question: "在装配过程中发现零件尺寸偏差，你的处理流程是什么？", questionEn: "How do you handle dimensional deviation during assembly?", type: "text", category: "质量意识", difficulty: "intermediate", idealAnswer: "停止→记录→通知质检→NCR→返工/让步→预防", weight: 20 },
    { id: "P03", question: "5S管理的具体内容是什么？你在上一家公司的执行情况如何？", questionEn: "What is 5S? How did you implement it?", type: "text", category: "管理基础", difficulty: "basic", idealAnswer: "整理/整顿/清扫/清洁/素养+具体案例", weight: 15 },
    { id: "P04", question: "你能看懂机械图纸的公差标注吗？请举例说明", questionEn: "Can you read GD&T on mechanical drawings?", type: "text", category: "专业技能", difficulty: "intermediate", idealAnswer: "尺寸公差+形位公差+表面粗糙度+示例", weight: 20 },
  ],
  finance: [
    { id: "F01", question: "请描述月末结账的完整流程，包括需要核对的关键节点", questionEn: "Describe the month-end closing process", type: "text", category: "专业流程", difficulty: "intermediate", idealAnswer: "应收确认→应付确认→折旧计提→工资计提→费用计提→试算平衡→结转损益", weight: 20 },
    { id: "F02", question: "如何进行银行对账？如果发现差异如何处理？", questionEn: "How do you perform bank reconciliation?", type: "text", category: "实务操作", difficulty: "intermediate", idealAnswer: "银行对账单vs账面→未达账项→编制余额调节表→跟踪处理", weight: 15 },
    { id: "F03", question: "你使用过金蝶K/3系统吗？对ERP系统的了解程度如何？", questionEn: "Have you used Kingdee K/3 or similar ERP?", type: "text", category: "系统技能", difficulty: "basic", idealAnswer: "模块使用经验+凭证录入+报表+期末处理", weight: 15 },
  ],
  service: [
    { id: "SV01", question: "客户设备出现故障停机，远在800公里外，你的第一步是什么？", questionEn: "Customer equipment down 800km away. First step?", type: "text", category: "应急响应", difficulty: "intermediate", idealAnswer: "电话诊断→远程连接→判断是否可远程解决→安排现场→备件准备", weight: 20 },
    { id: "SV02", question: "如何编写一份客户可以理解的设备维护保养计划？", questionEn: "How to write a customer-friendly maintenance plan?", type: "text", category: "文档能力", difficulty: "intermediate", idealAnswer: "频次+检查项+步骤图+备件清单+预期寿命+联系方式", weight: 15 },
  ],
  general: [
    { id: "G01", question: "你为什么想加入GRT？你了解GRT的主要产品和客户吗？", questionEn: "Why GRT? What do you know about our products?", type: "text", category: "动机与了解", difficulty: "basic", idealAnswer: "了解清洗设备+知道客户群+个人职业匹配", weight: 20 },
    { id: "G02", question: "描述一次你主动学习新技能并应用到工作中的经历", questionEn: "Describe a time you proactively learned and applied a new skill", type: "text", category: "学习能力", difficulty: "basic", idealAnswer: "学习动机→方法→应用→结果", weight: 15 },
    { id: "G03", question: "你对未来3-5年的职业规划是什么？", questionEn: "What's your 3-5 year career plan?", type: "text", category: "职业规划", difficulty: "basic", idealAnswer: "清晰目标+可行路径+与GRT契合", weight: 15 },
  ],
};

function getQuestionsForRole(roleFamily: string): typeof QUESTION_BANK["sales"] {
  const general = QUESTION_BANK.general || [];
  const specific = QUESTION_BANK[roleFamily] || [];
  return [...general, ...specific];
}

// ═══ AI评分函数 ═══
function aiScoreAnswer(question: any, answer: string): { score: number; feedback: string } {
  if (!answer || answer.trim().length < 10) return { score: 10, feedback: "回答过于简短，请详细阐述" };
  const len = answer.length;
  const hasKeywords = question.idealAnswer ? question.idealAnswer.split(/[+→·/]/).filter((k: string) => k.length > 1 && answer.includes(k.trim())).length : 0;
  const totalKeywords = question.idealAnswer ? question.idealAnswer.split(/[+→·/]/).filter((k: string) => k.length > 1).length : 1;
  const keywordRate = totalKeywords > 0 ? hasKeywords / totalKeywords : 0;
  const lengthScore = Math.min(len / 200, 1) * 30;
  const keywordScore = keywordRate * 50;
  const baseScore = 20;
  const score = Math.min(Math.round(baseScore + lengthScore + keywordScore), 100);
  let feedback = "";
  if (score >= 80) feedback = "回答全面且有深度，体现了丰富的经验";
  else if (score >= 60) feedback = "回答基本到位，建议补充更多具体案例和数据";
  else if (score >= 40) feedback = "回答有基础认知，但缺少实践经验的支撑";
  else feedback = "回答不够充分，建议深入思考后重新作答";
  return { score, feedback };
}

// ═══ Router ═══
export const onlineInterviewRouter = router({
  /** 获取岗位族题目列表 */
  getQuestions: publicProcedure
    .input(z.object({ roleFamily: z.string() }))
    .query(({ input }) => {
      return getQuestionsForRole(input.roleFamily);
    }),

  /** 提交面试答案 + AI评分 */
  submitAnswers: publicProcedure
    .input(z.object({
      candidateName: z.string(),
      roleFamily: z.string(),
      targetPosition: z.string(),
      answers: z.array(z.object({ questionId: z.string(), answer: z.string() })),
      preferredDate: z.string().optional(),
      preferredTime: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const questions = getQuestionsForRole(input.roleFamily);
      let totalScore = 0, totalWeight = 0;
      const results = input.answers.map(a => {
        const q = questions.find(q => q.id === a.questionId);
        if (!q) return { questionId: a.questionId, score: 0, feedback: "题目未找到", weight: 0 };
        const { score, feedback } = aiScoreAnswer(q, a.answer);
        totalScore += score * q.weight;
        totalWeight += q.weight;
        return { questionId: a.questionId, question: q.question, score, feedback, weight: q.weight };
      });
      const compositeScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
      const recommendation = compositeScore >= 75 ? "recommend" : compositeScore >= 50 ? "consider" : "not_recommend";
      const suggestedAction = recommendation === "recommend"
        ? "建议安排正式面试，候选人表现优秀"
        : recommendation === "consider"
          ? "建议安排电话初筛，进一步了解实际能力"
          : "暂不建议推进，可建议候选人通过KPI学习中心自学后重新申请";

      // Save to DB
      try {
        const db = await requireDb();
        await db.execute(sql`
          INSERT INTO hrm_ai_interview_records (record_code, candidate_id, round, interview_type,
            interview_questions, transcript, overall_score, recommendation, follow_up_actions,
            interviewed_at, created_at, updated_at)
          VALUES (${`ONLINE-${Date.now()}`}, ${ctx.user?.id || 0}, 0, 'video',
            ${JSON.stringify(input.answers)}, ${JSON.stringify(results)},
            ${compositeScore}, ${recommendation === "recommend" ? "hire" : recommendation === "consider" ? "pending" : "reject"},
            ${suggestedAction}, NOW(), NOW(), NOW())
        `);
      } catch {}

      return {
        candidateName: input.candidateName,
        targetPosition: input.targetPosition,
        compositeScore,
        recommendation,
        suggestedAction,
        questionResults: results,
        suggestedInterviewDate: input.preferredDate || null,
        suggestedInterviewTime: input.preferredTime || null,
      };
    }),

  /** 获取可用面试时间段 */
  getAvailableSlots: publicProcedure.query(() => {
    const slots = [];
    const now = new Date();
    for (let d = 1; d <= 10; d++) {
      const date = new Date(now.getTime() + d * 86400000);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const dateStr = date.toISOString().substring(0, 10);
      for (const time of ["09:30", "10:30", "14:00", "15:00", "16:00"]) {
        slots.push({ date: dateStr, time, available: Math.random() > 0.3 });
      }
    }
    return slots;
  }),

  /** AI生成面试官建议报告 — 依据岗位+候选人在线得分 */
  generateInterviewerBrief: protectedProcedure
    .input(z.object({ roleFamily: z.string(), compositeScore: z.number(), candidateName: z.string() }))
    .query(({ input }) => {
      const { roleFamily, compositeScore, candidateName } = input;
      // 5维评估建议: 能力·语言·表达·数学·专业
      const dimensions = [
        { dim: "专业能力", dimEn: "Technical", weight: 30,
          questions: roleFamily === "engineer" ? ["请现场画出你设计过的一个关键部件的简图","解释超声清洗线的工艺流程","BOM变更时的ECN审批逻辑是什么"]
            : roleFamily === "sales" ? ["请模拟一次向客户介绍GRT清洗设备的pitch","如何计算客户TCO(总拥有成本)","描述你管理过的最大销售漏斗"]
            : roleFamily === "production" ? ["请解读这张图纸上的公差标注","操作CNC时遇到刀具磨损的处理流程","如何确保装配精度"]
            : ["描述你在上一个岗位的核心输出","你最擅长的专业技能是什么"] },
        { dim: "语言能力", dimEn: "Language", weight: 15,
          questions: ["请用英语做30秒自我介绍","阅读这段英文技术文档并翻译关键参数","如果接到海外客户英文邮件投诉，你如何回复"] },
        { dim: "表达与沟通", dimEn: "Communication", weight: 20,
          questions: ["请用2分钟向我介绍你自己，重点是与本岗位的匹配度","如果你的方案被主管否决，你会如何沟通","描述一次你成功说服别人的经历"] },
        { dim: "逻辑与数学", dimEn: "Logic/Math", weight: 15,
          questions: roleFamily === "finance" ? ["一笔报销单计算：基本工资4640+岗位工资2000+技能补贴1983，绩效系数0.5，实际绩效工资是多少","13%增值税下含税价11300的不含税价是多少"]
            : ["一台设备报价120万，毛利率35%，成本是多少","如果生产线OEE从75%提升到85%，产量增加百分之几"] },
        { dim: "综合素养", dimEn: "Soft Skills", weight: 20,
          questions: ["你如何平衡工作质量和交付速度","描述一次你在压力下完成任务的经历","你对GRT的三条发展路线有什么看法"] },
      ];
      const focusAreas = compositeScore >= 75
        ? "候选人在线评估表现优秀，正式面试重点验证实际操作能力和团队协作。"
        : compositeScore >= 50
          ? "候选人在线评估中等，重点深挖专业深度和问题解决能力，评估是否有培养潜力。"
          : "候选人在线评估偏低，建议重点考察基础功和学习意愿，判断是否适合初级岗位。";

      return {
        candidateName,
        roleFamily,
        onlineScore: compositeScore,
        focusAreas,
        dimensions,
        interviewDuration: "45-60分钟",
        suggestedPanel: roleFamily === "sales" ? "销售总监+HR" : roleFamily === "engineer" ? "技术主管+项目经理+HR" : "部门经理+HR",
        candidateFormRequired: [
          "个人详细简历(含项目经历)",
          "过往业绩数据(销售额/项目数/管理人数)",
          "典型工作案例(1-2个详细描述)",
          "期望薪资范围",
          "可到岗时间",
          "推荐人信息(至少1位)",
        ],
      };
    }),

  /** 候选人正式面试前资料提交 */
  submitCandidateProfile: publicProcedure
    .input(z.object({
      candidateName: z.string(),
      phone: z.string().optional(),
      email: z.string().optional(),
      education: z.string().optional(),
      workYears: z.number().optional(),
      currentCompany: z.string().optional(),
      currentPosition: z.string().optional(),
      achievements: z.string().optional(),
      caseStudy: z.string().optional(),
      expectedSalary: z.string().optional(),
      availableDate: z.string().optional(),
      referenceContact: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const code = `C-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        await db.execute(sql`
          INSERT INTO hrm_candidates (candidate_code, name, phone, email, education,
            work_years, source, resume_analysis, status, created_at, updated_at)
          VALUES (${code}, ${input.candidateName}, ${input.phone || ''},
            ${input.email || ''}, ${input.education || ''},
            ${input.workYears || 0}, 'online_interview',
            ${JSON.stringify({ company: input.currentCompany, position: input.currentPosition, achievements: input.achievements, caseStudy: input.caseStudy, expectedSalary: input.expectedSalary, availableDate: input.availableDate, reference: input.referenceContact })},
            'screening', NOW(), NOW())
        `);
        return { success: true, candidateCode: code };
      } catch (e: any) {
        return { success: false, candidateCode: null, error: e.message?.substring(0, 80) };
      }
    }),
});
