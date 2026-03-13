/**
 * AI Canvas Router — Workflow Parser & Action Router
 *
 * Provides:
 *   - quickParse: lightweight intent detection (debounced live hint)
 *   - parseWorkflow: full workflow generation with entity extraction
 *   - applyWorkflow: create task + workflow instance
 *   - list: legacy stub
 */
import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

// ── Workflow Rule Definitions ──

interface WorkflowRule {
  category: string;
  templateZh: string;
  templateEn: string;
  keywords: string[];
  route: string;
  steps: { step: number; label: string; approver: string }[];
}

const WORKFLOW_RULES: WorkflowRule[] = [
  {
    category: "travel",
    templateZh: "出差申请",
    templateEn: "Travel Request",
    keywords: ["出差", "差旅", "机票", "酒店", "飞", "trip", "travel", "flight", "hotel", "detroit", "shanghai"],
    route: "/travel-dashboard",
    steps: [
      { step: 1, label: "填写出差申请", approver: "申请人" },
      { step: 2, label: "部门经理审批", approver: "部门经理" },
      { step: 3, label: "财务确认预算", approver: "财务" },
    ],
  },
  {
    category: "quality",
    templateZh: "质量问题处理",
    templateEn: "Quality Issue",
    keywords: ["质量", "8d", "capa", "投诉", "缺陷", "不合格", "complaint", "quality", "defect", "nonconformance"],
    route: "/8d-capa",
    steps: [
      { step: 1, label: "问题登记", approver: "质量工程师" },
      { step: 2, label: "团队调查", approver: "8D Team" },
      { step: 3, label: "纠正措施审批", approver: "质量经理" },
    ],
  },
  {
    category: "project",
    templateZh: "项目立项",
    templateEn: "Project Initiation",
    keywords: ["项目", "立项", "开发", "新产品", "project", "initiation", "develop", "new product"],
    route: "/projects",
    steps: [
      { step: 1, label: "需求分析", approver: "PM" },
      { step: 2, label: "可行性评审", approver: "技术总监" },
      { step: 3, label: "立项审批", approver: "总经理" },
    ],
  },
  {
    category: "hr",
    templateZh: "人事申请",
    templateEn: "HR Request",
    keywords: ["请假", "调岗", "培训", "招聘", "离职", "入职", "leave", "transfer", "training", "recruit", "onboard"],
    route: "/hr-lifecycle",
    steps: [
      { step: 1, label: "提交申请", approver: "申请人" },
      { step: 2, label: "直属上级审批", approver: "直属上级" },
      { step: 3, label: "HR确认", approver: "HR" },
    ],
  },
  {
    category: "finance",
    templateZh: "费用报销",
    templateEn: "Expense Claim",
    keywords: ["报销", "费用", "发票", "expense", "reimburse", "invoice", "receipt", "报销单"],
    route: "/expense-report",
    steps: [
      { step: 1, label: "填写报销单", approver: "申请人" },
      { step: 2, label: "部门经理审批", approver: "部门经理" },
      { step: 3, label: "财务审核", approver: "财务" },
      { step: 4, label: "付款", approver: "出纳" },
    ],
  },
  {
    category: "procurement",
    templateZh: "采购申请",
    templateEn: "Procurement Request",
    keywords: ["采购", "购买", "物料", "供应商", "purchase", "procure", "material", "supplier", "vendor"],
    route: "/procurement",
    steps: [
      { step: 1, label: "采购需求", approver: "申请人" },
      { step: 2, label: "询价/比价", approver: "采购员" },
      { step: 3, label: "审批下单", approver: "采购经理" },
    ],
  },
  {
    category: "production",
    templateZh: "生产排程",
    templateEn: "Production Schedule",
    keywords: ["生产", "排产", "制造", "工单", "production", "manufacturing", "work order", "schedule"],
    route: "/production",
    steps: [
      { step: 1, label: "生产计划", approver: "计划员" },
      { step: 2, label: "物料确认", approver: "仓库" },
      { step: 3, label: "排程确认", approver: "生产主管" },
    ],
  },
  {
    category: "approval",
    templateZh: "审批流程",
    templateEn: "Approval Workflow",
    keywords: ["审批", "审核", "签字", "批准", "approve", "sign", "review", "authorize"],
    route: "/oa-forms",
    steps: [
      { step: 1, label: "提交表单", approver: "申请人" },
      { step: 2, label: "上级审批", approver: "审批人" },
      { step: 3, label: "完成归档", approver: "系统" },
    ],
  },
  {
    category: "general",
    templateZh: "会议纪要",
    templateEn: "Meeting Minutes",
    keywords: ["会议", "纪要", "开会", "讨论", "meeting", "minutes", "discussion", "agenda"],
    route: "/meeting-hub",
    steps: [
      { step: 1, label: "记录纪要", approver: "记录人" },
      { step: 2, label: "分发确认", approver: "参会者" },
    ],
  },
  // Additional rules
  {
    category: "general",
    templateZh: "CRM/销售",
    templateEn: "Sales/CRM",
    keywords: ["销售", "客户", "lead", "商机", "sales", "crm", "customer", "pipeline"],
    route: "/crm",
    steps: [
      { step: 1, label: "线索登记", approver: "销售" },
      { step: 2, label: "跟进计划", approver: "销售经理" },
    ],
  },
  {
    category: "general",
    templateZh: "客户服务",
    templateEn: "Customer Service",
    keywords: ["客服", "售后", "维修", "service", "warranty", "repair", "complaint"],
    route: "/after-sales",
    steps: [
      { step: 1, label: "工单创建", approver: "客服" },
      { step: 2, label: "服务派单", approver: "服务经理" },
    ],
  },
  {
    category: "procurement",
    templateZh: "供应链/库存",
    templateEn: "Supply Chain/Inventory",
    keywords: ["库存", "仓库", "入库", "出库", "盘点", "inventory", "warehouse", "stock"],
    route: "/warehouse",
    steps: [
      { step: 1, label: "库存检查", approver: "仓管" },
      { step: 2, label: "调拨/补货", approver: "采购" },
    ],
  },
  {
    category: "quality",
    templateZh: "FMEA/控制计划",
    templateEn: "FMEA/Control Plan",
    keywords: ["fmea", "控制计划", "control plan", "风险分析", "rpn", "risk"],
    route: "/fmea",
    steps: [
      { step: 1, label: "风险评估", approver: "工程师" },
      { step: 2, label: "措施确认", approver: "质量经理" },
    ],
  },
  {
    category: "hr",
    templateZh: "培训/能力提升",
    templateEn: "Training/Capability",
    keywords: ["培训", "考试", "证书", "能力", "学习", "training", "exam", "certificate", "capability"],
    route: "/training",
    steps: [
      { step: 1, label: "培训需求", approver: "部门" },
      { step: 2, label: "培训安排", approver: "HR" },
    ],
  },
];

// ── Matching helpers ──

function scoreMatch(text: string, rule: WorkflowRule): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of rule.keywords) {
    if (lower.includes(kw.toLowerCase())) score++;
  }
  return score;
}

function extractEntities(text: string) {
  const locations: string[] = [];
  const dates: string[] = [];
  const materials: string[] = [];
  const people: string[] = [];

  // Location patterns
  const locPatterns = [
    /(?:去|到|在|from|to|at|in)\s*([^\s,，。]+(?:工厂|公司|基地|plant|factory|office))/gi,
    /(?:底特律|上海|深圳|北京|广州|苏州|Detroit|Shanghai|Shenzhen|Beijing)/gi,
  ];
  for (const p of locPatterns) {
    const m = text.match(p);
    if (m) locations.push(...m.map(s => s.trim()));
  }

  // Date patterns
  const datePatterns = [
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}/g,
    /(?:下周|本周|明天|后天|next week|tomorrow|this week)/gi,
    /\d{1,2}月\d{1,2}[日号]/g,
  ];
  for (const p of datePatterns) {
    const m = text.match(p);
    if (m) dates.push(...m);
  }

  // Material patterns
  const matPatterns = [
    /(?:物料|材料|零件|material|part|component|不锈钢|铝合金|轴承|密封圈)/gi,
  ];
  for (const p of matPatterns) {
    const m = text.match(p);
    if (m) materials.push(...m);
  }

  // People patterns
  const pplPatterns = [
    /(?:张三|李四|王五|经理|总监|主管)/g,
  ];
  for (const p of pplPatterns) {
    const m = text.match(p);
    if (m) people.push(...m);
  }

  return { locations: [...new Set(locations)], dates: [...new Set(dates)], materials: [...new Set(materials)], people: [...new Set(people)] };
}

// ── Router ──

export const aiCanvasRouter = router({
  /** Legacy list stub */
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(async () => {
      return { items: [], total: 0 };
    }),

  /** Lightweight quick parse — returns top match only (for live intent bar) */
  quickParse: requirePermission('ai:hub:access')
    .input(z.object({
      text: z.string().min(1),
      language: z.enum(["zh", "en"]).default("zh"),
    }))
    .mutation(async ({ input }) => {
      const scores = WORKFLOW_RULES.map(rule => ({
        rule,
        score: scoreMatch(input.text, rule),
      }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scores.length === 0) {
        return {
          detected: false,
          category: null,
          template: null,
          confidence: 0,
          route: null,
          matchCount: 0,
        };
      }

      const top = scores[0];
      const confidence = Math.min(95, 40 + top.score * 15);

      return {
        detected: true,
        category: top.rule.category,
        template: input.language === "zh" ? top.rule.templateZh : top.rule.templateEn,
        confidence,
        route: top.rule.route,
        matchCount: scores.length,
      };
    }),

  /** Full workflow parse — returns ranked suggestions with entity extraction */
  parseWorkflow: requirePermission('ai:hub:access')
    .input(z.object({
      text: z.string().min(1),
      language: z.enum(["zh", "en"]).default("zh"),
      currentRoute: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const scores = WORKFLOW_RULES.map(rule => ({
        rule,
        score: scoreMatch(input.text, rule),
      }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score);

      const entities = extractEntities(input.text);

      if (scores.length === 0) {
        return {
          detected: false,
          summary: input.language === "zh"
            ? "AI 未识别到明确的业务意图。请尝试使用更具体的关键词。"
            : "AI did not detect a clear business intent. Try using more specific keywords.",
          suggestions: [],
          entities,
        };
      }

      const isZh = input.language === "zh";
      const suggestions = scores.slice(0, 3).map((s, i) => ({
        rank: i + 1,
        confidence: Math.min(95, 40 + s.score * 15),
        suggestedTemplate: isZh ? s.rule.templateZh : s.rule.templateEn,
        linkedEntities: [isZh ? s.rule.templateZh : s.rule.templateEn, s.rule.category],
        proposedWorkflow: s.rule.steps,
        route: s.rule.route,
        category: s.rule.category,
        matchedKeywords: s.rule.keywords.filter(kw =>
          input.text.toLowerCase().includes(kw.toLowerCase())
        ),
      }));

      const topTemplate = isZh ? scores[0].rule.templateZh : scores[0].rule.templateEn;
      return {
        detected: true,
        summary: isZh
          ? `AI 识别到「${topTemplate}」业务意图 (置信度 ${suggestions[0].confidence}%)。共匹配 ${scores.length} 个工作流模板。`
          : `AI detected "${topTemplate}" business intent (${suggestions[0].confidence}% confidence). ${scores.length} workflow template(s) matched.`,
        suggestions,
        entities,
      };
    }),

  /** Apply workflow — creates a task and returns workflow tracker state */
  applyWorkflow: protectedProcedure
    .input(z.object({
      originalText: z.string(),
      templateName: z.string(),
      route: z.string(),
      workflowSteps: z.array(z.object({
        step: z.number(),
        label: z.string(),
        approver: z.string(),
      })),
      linkedEntities: z.array(z.string()),
      language: z.enum(["zh", "en"]).default("zh"),
    }))
    .mutation(async ({ input }) => {
      const isZh = input.language === "zh";
      const taskId = `TASK-${Date.now().toString(36).toUpperCase()}`;
      const workflowId = `WF-${Date.now().toString(36).toUpperCase()}`;

      const workflow = input.workflowSteps.map((step, i) => ({
        ...step,
        status: i === 0 ? "active" : "pending",
      }));

      return {
        taskId,
        workflowId,
        message: isZh
          ? `已创建「${input.templateName}」工作流，任务 ${taskId} 已启动。`
          : `Created "${input.templateName}" workflow. Task ${taskId} started.`,
        nextAction: {
          label: isZh
            ? `前往${input.templateName}`
            : `Go to ${input.templateName}`,
          route: input.route,
        },
        workflow,
      };
    }),
});
