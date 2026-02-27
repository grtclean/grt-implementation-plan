/**
 * Role-Based AI Agent Router — role-specific quick actions, suggestions, activity feed
 *
 * Provides:
 *   - getQuickActions: returns role-specific quick action cards
 *   - getSuggestions: returns contextual AI suggestions
 *   - getRecentActivity: returns recent activity feed items
 *   - list: legacy stub
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";

// ── Role Action Configs ──

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  route: string;
}

interface Suggestion {
  id: string;
  text: string;
  textEn: string;
}

const ROLE_ACTIONS: Record<string, QuickAction[]> = {
  bu_sales: [
    { id: "new-lead", icon: "Plus", label: "新建线索", labelEn: "New Lead", description: "录入潜在客户", descriptionEn: "Create new sales lead", route: "/crm" },
    { id: "pipeline", icon: "TrendingUp", label: "销售管道", labelEn: "Pipeline", description: "查看商机进展", descriptionEn: "View sales pipeline", route: "/crm" },
    { id: "visit-plan", icon: "Users", label: "拜访计划", labelEn: "Visit Plan", description: "安排客户拜访", descriptionEn: "Schedule customer visits", route: "/crm" },
    { id: "quote", icon: "FileText", label: "报价单", labelEn: "Quotation", description: "创建/管理报价", descriptionEn: "Create/manage quotations", route: "/operations/new-project" },
  ],
  bu_pm: [
    { id: "projects", icon: "FolderKanban", label: "项目看板", labelEn: "Project Board", description: "查看项目进度", descriptionEn: "View project progress", route: "/projects" },
    { id: "t-milestones", icon: "Activity", label: "T节点追踪", labelEn: "T-Milestones", description: "检查T1-T15进度", descriptionEn: "Check T1-T15 progress", route: "/task-cockpit" },
    { id: "risk", icon: "AlertTriangle", label: "风险管理", labelEn: "Risk Mgmt", description: "项目风险预警", descriptionEn: "Project risk alerts", route: "/projects" },
    { id: "gate-review", icon: "CheckCircle", label: "阶段评审", labelEn: "Gate Review", description: "门径评审管理", descriptionEn: "Stage gate reviews", route: "/project-gate" },
  ],
  director: [
    { id: "dashboard", icon: "LayoutDashboard", label: "管理驾驶舱", labelEn: "Dashboard", description: "全景数据看板", descriptionEn: "Executive overview", route: "/strategy" },
    { id: "okr", icon: "BarChart3", label: "OKR看板", labelEn: "OKR Board", description: "目标达成情况", descriptionEn: "OKR progress", route: "/strategy" },
    { id: "approval", icon: "ClipboardList", label: "待审批", labelEn: "Approvals", description: "审批事项处理", descriptionEn: "Pending approvals", route: "/oa-forms" },
    { id: "report", icon: "FileText", label: "汇报中枢", labelEn: "Reports", description: "部门汇报管理", descriptionEn: "Department reports", route: "/report-center" },
  ],
  bu_gm: [
    { id: "bu-dashboard", icon: "LayoutDashboard", label: "BU概览", labelEn: "BU Overview", description: "事业部全景", descriptionEn: "Business unit overview", route: "/strategy" },
    { id: "pnl", icon: "DollarSign", label: "损益分析", labelEn: "P&L", description: "BU损益报表", descriptionEn: "Profit & loss analysis", route: "/cost" },
    { id: "team", icon: "Users", label: "团队管理", labelEn: "Team", description: "BU人员管理", descriptionEn: "Team management", route: "/employee-management" },
  ],
  bu_mech: [
    { id: "solidworks", icon: "FileText", label: "图纸管理", labelEn: "Drawings", description: "SolidWorks图纸", descriptionEn: "SolidWorks drawings", route: "/plm" },
    { id: "bom", icon: "ClipboardList", label: "BOM管理", labelEn: "BOM", description: "物料清单", descriptionEn: "Bill of materials", route: "/bom" },
    { id: "fmea", icon: "AlertTriangle", label: "FMEA", labelEn: "FMEA", description: "失效分析", descriptionEn: "Failure mode analysis", route: "/fmea" },
  ],
  bu_elec: [
    { id: "eplan", icon: "Zap", label: "电气图纸", labelEn: "E-Plan", description: "EPLAN电气设计", descriptionEn: "Electrical drawings", route: "/plm" },
    { id: "plc", icon: "Factory", label: "PLC程序", labelEn: "PLC", description: "控制程序管理", descriptionEn: "PLC program management", route: "/plm" },
    { id: "test", icon: "CheckCircle", label: "测试管理", labelEn: "Testing", description: "电气测试记录", descriptionEn: "Electrical testing", route: "/test-engine" },
  ],
  team_lead: [
    { id: "tasks", icon: "Kanban", label: "任务分配", labelEn: "Tasks", description: "团队任务管理", descriptionEn: "Team task management", route: "/task-cockpit" },
    { id: "kiosk", icon: "Factory", label: "车间看板", labelEn: "Kiosk", description: "生产进度", descriptionEn: "Production progress", route: "/kiosk" },
    { id: "shift", icon: "Clock", label: "交接班", labelEn: "Shift", description: "交接班记录", descriptionEn: "Shift handover", route: "/shift-handover" },
  ],
  cs_engineer: [
    { id: "tickets", icon: "Ticket", label: "工单管理", labelEn: "Tickets", description: "客户服务工单", descriptionEn: "Customer tickets", route: "/customer-repair" },
    { id: "spare-parts", icon: "Package", label: "备件管理", labelEn: "Spare Parts", description: "备件库存查询", descriptionEn: "Spare parts inventory", route: "/after-sales" },
    { id: "kb", icon: "HelpCircle", label: "知识库", labelEn: "Knowledge Base", description: "故障解决方案", descriptionEn: "Solution knowledge base", route: "/knowledge-base" },
  ],
  hr_manager: [
    { id: "employees", icon: "Users", label: "员工管理", labelEn: "Employees", description: "人员信息维护", descriptionEn: "Employee management", route: "/employee-management" },
    { id: "training", icon: "GraduationCap", label: "培训管理", labelEn: "Training", description: "培训计划安排", descriptionEn: "Training schedule", route: "/training" },
    { id: "kpi", icon: "BarChart3", label: "绩效管理", labelEn: "KPI", description: "考核与评估", descriptionEn: "KPI assessment", route: "/kpi-performance" },
    { id: "competency", icon: "UserCheck", label: "能力矩阵", labelEn: "Competency", description: "TSDCKL六大能力", descriptionEn: "TSDCKL capability", route: "/my-360" },
  ],
  finance_manager: [
    { id: "expense", icon: "Wallet", label: "费用管理", labelEn: "Expenses", description: "报销审批", descriptionEn: "Expense approvals", route: "/expense-report" },
    { id: "budget", icon: "Calculator", label: "预算管理", labelEn: "Budget", description: "预算执行分析", descriptionEn: "Budget analysis", route: "/cost" },
    { id: "cost-std", icon: "DollarSign", label: "成本标准", labelEn: "Cost Standards", description: "产品成本基准", descriptionEn: "Product cost standards", route: "/cost-standards" },
  ],
  procurement_eng: [
    { id: "po", icon: "ShoppingCart", label: "采购订单", labelEn: "Purchase Orders", description: "采购管理", descriptionEn: "Purchase management", route: "/procurement" },
    { id: "supplier", icon: "Truck", label: "供应商", labelEn: "Suppliers", description: "供应商评估", descriptionEn: "Supplier assessment", route: "/supply-chain" },
    { id: "iqc", icon: "CheckCircle", label: "来料检验", labelEn: "IQC", description: "入库质检", descriptionEn: "Incoming quality check", route: "/supply-chain" },
  ],
};

const ROLE_SUGGESTIONS: Record<string, Suggestion[]> = {
  bu_sales: [
    { id: "s1", text: "本月有3个线索即将过期，建议尽快跟进", textEn: "3 leads expiring this month — follow up soon" },
    { id: "s2", text: "客户「比亚迪」上次拜访已超30天", textEn: "Customer 'BYD' last visited over 30 days ago" },
  ],
  bu_pm: [
    { id: "s1", text: "项目 P-2024-015 的T7节点延迟2天", textEn: "Project P-2024-015 T7 milestone delayed 2 days" },
    { id: "s2", text: "建议检查本周Gate评审准备材料", textEn: "Check gate review materials for this week" },
  ],
  director: [
    { id: "s1", text: "OKR Q1达成率偏低(68%)，建议召开复盘会", textEn: "OKR Q1 achievement rate low (68%) — consider review meeting" },
  ],
  default: [
    { id: "s1", text: "今日有2项待审批事项需处理", textEn: "2 pending approvals need attention today" },
    { id: "s2", text: "本周培训课程《质量管理基础》已开放报名", textEn: "Training course 'Quality Basics' now open for enrollment" },
  ],
};

// ── Mock activity data ──

interface ActivityItem {
  id: string;
  type: string;
  text: string;
  textEn: string;
  time: string;
  timeZh: string;
}

const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: "a1", type: "project", text: "Project P-2024-018 moved to M2", textEn: "Project P-2024-018 moved to M2", time: "2h ago", timeZh: "2小时前" },
  { id: "a2", type: "approval", text: "Travel request approved by Manager Li", textEn: "Travel request approved by Manager Li", time: "3h ago", timeZh: "3小时前" },
  { id: "a3", type: "meeting", text: "Weekly sync meeting scheduled for Friday", textEn: "Weekly sync meeting scheduled for Friday", time: "5h ago", timeZh: "5小时前" },
  { id: "a4", type: "document", text: "BOM v2.3 uploaded for GRT-UC200", textEn: "BOM v2.3 uploaded for GRT-UC200", time: "1d ago", timeZh: "1天前" },
  { id: "a5", type: "alert", text: "Supplier delivery delay — Huadong Steel", textEn: "Supplier delivery delay — Huadong Steel", time: "1d ago", timeZh: "1天前" },
];

export const roleAgentRouter = router({
  /** Legacy stub */
  list: publicProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(async () => {
      return { items: [], total: 0 };
    }),

  /** Get role-specific quick action cards */
  getQuickActions: publicProcedure
    .input(z.object({ role: z.string() }))
    .query(async ({ input }) => {
      // Try exact role match first, then fallback to employee defaults
      const actions = ROLE_ACTIONS[input.role] ?? ROLE_ACTIONS["bu_sales"] ?? [];
      return actions;
    }),

  /** Get contextual AI suggestions for the given role */
  getSuggestions: publicProcedure
    .input(z.object({ role: z.string() }))
    .query(async ({ input }) => {
      const suggestions = ROLE_SUGGESTIONS[input.role] ?? ROLE_SUGGESTIONS["default"] ?? [];
      return suggestions;
    }),

  /** Get recent activity feed */
  getRecentActivity: publicProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ input }) => {
      return MOCK_ACTIVITIES.slice(0, input.limit);
    }),
});
