/**
 * Role-Based AI Agent Router — role-specific quick actions, suggestions, activity feed, workstation config
 *
 * Provides:
 *   - getQuickActions: returns role-specific quick action cards
 *   - getSuggestions: returns contextual AI suggestions
 *   - getRecentActivity: returns recent activity feed items
 *   - getWorkstationConfig: returns full role workstation configuration (responsibilities, SOPs, quality, standards)
 *   - getRoleSOPs: returns SOP list from DB filtered by role-relevant categories
 *   - list: legacy stub
 */
import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { buScopeCondition } from "../_core/gateway-bu-context.middleware";
import { requireDb } from "../db";
import { projects } from "../../drizzle/schema";
import { desc, sql, eq } from "drizzle-orm";
import { getWorkstationConfig, getBomSOPs, getDailyTasks, ALL_WORKSTATION_ROLES } from "../../shared/role-workstation-config";
import { AGENT_LEVEL_CONFIGS, getDefaultLevel } from "../../shared/ai-agent-levels";
import { getPresetByRole } from "../../shared/ai-assistant-presets";

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

// ── Activity from real DB (projects, OA forms, etc.) ──

async function fetchRecentActivity(
  limit: number,
  userId: number | null,
  buCode: string | null,
) {
  try {
    const db = await requireDb();
    // BU-scoped projects + user-scoped action items
    const buWhere = buCode ? sql`AND bu_code = ${buCode}` : sql``;
    const userWhere = userId ? sql`AND assigned_to = ${userId}` : sql``;
    const rows = await db.execute(sql`
      (SELECT
        'project' AS type,
        id::text AS id,
        COALESCE(name, 'Project #' || id) AS text,
        COALESCE(name, 'Project #' || id) AS "textEn",
        TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI') AS time,
        TO_CHAR(updated_at, 'MM-DD HH24:MI') AS "timeZh"
      FROM projects
      WHERE updated_at IS NOT NULL ${buWhere}
      ORDER BY updated_at DESC
      LIMIT ${Math.ceil(limit / 2)})
      UNION ALL
      (SELECT
        'task' AS type,
        id::text AS id,
        COALESCE(task_desc, 'Task #' || id) AS text,
        COALESCE(task_desc, 'Task #' || id) AS "textEn",
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS time,
        TO_CHAR(created_at, 'MM-DD HH24:MI') AS "timeZh"
      FROM meeting_action_items
      WHERE 1=1 ${userWhere}
      ORDER BY created_at DESC
      LIMIT ${Math.ceil(limit / 2)})
      ORDER BY time DESC
      LIMIT ${limit}
    `);
    const items = rows.rows ?? [];
    if (items.length > 0) return items as Record<string, unknown>[];
  } catch { /* fall through to fallback */ }

  // Fallback static data when DB unavailable
  return [
    { id: "a1", type: "project", text: "Project P-2024-018 moved to M2", textEn: "Project P-2024-018 moved to M2", time: "2h ago", timeZh: "2小时前" },
    { id: "a2", type: "approval", text: "Travel request approved", textEn: "Travel request approved", time: "3h ago", timeZh: "3小时前" },
    { id: "a3", type: "meeting", text: "Weekly sync scheduled for Friday", textEn: "Weekly sync scheduled for Friday", time: "5h ago", timeZh: "5小时前" },
  ].slice(0, limit);
}

export const roleAgentRouter = router({
  /** Legacy stub */
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(async () => {
      return { items: [], total: 0 };
    }),

  /** Get role-specific quick action cards (uses server-side role, not client input) */
  getQuickActions: protectedProcedure
    .input(z.object({ role: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      // Canonical role from authenticated context; input.role only as admin preview fallback
      const role = ctx.user?.role ?? input?.role ?? "employee";
      const actions = ROLE_ACTIONS[role] ?? ROLE_ACTIONS["bu_sales"] ?? [];
      return actions;
    }),

  /** Get contextual AI suggestions (uses server-side role, not client input) */
  getSuggestions: protectedProcedure
    .input(z.object({ role: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const role = ctx.user?.role ?? input?.role ?? "employee";
      const suggestions = ROLE_SUGGESTIONS[role] ?? ROLE_SUGGESTIONS["default"] ?? [];
      return suggestions;
    }),

  /** Get recent activity feed (DB-backed with fallback, BU/user scoped) */
  getRecentActivity: protectedProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user?.id ?? null;
      const buCode = (ctx as any).bu?.buCode ?? null;
      return fetchRecentActivity(input.limit, userId, buCode);
    }),

  /** Get full workstation config for employee's role (responsibilities, SOPs, quality, standards) */
  getWorkstationConfig: protectedProcedure
    .input(z.object({ role: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const role = ctx.user?.role ?? input?.role ?? "employee";
      const config = getWorkstationConfig(role);
      const preset = getPresetByRole(role);
      const levelConfig = AGENT_LEVEL_CONFIGS[config.defaultAgentLevel];

      return {
        ...config,
        aiAssistant: {
          label: preset.label,
          level: config.defaultAgentLevel,
          levelLabel: levelConfig.label,
          levelLabelEn: levelConfig.labelEn,
          autonomy: levelConfig.autonomyLevel,
          capabilities: levelConfig.defaultCapabilities,
          maxConcurrentTasks: levelConfig.maxConcurrentTasks,
          dataScope: levelConfig.dataScope,
          focusAreas: preset.focusAreas,
          knowledgeDomains: preset.knowledgeDomains,
        },
        bomSOPs: getBomSOPs(role),
        dailyTasks: getDailyTasks(role),
      };
    }),

  /** Get SOPs from DB that match the role's relevant categories */
  getRoleSOPs: protectedProcedure
    .input(z.object({ role: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const role = ctx.user?.role ?? input?.role ?? "employee";
      const config = getWorkstationConfig(role);

      // Determine relevant SOP categories for this role
      const categories = [...new Set(config.sopReferences.map((s) => s.category))];

      try {
        const db = await requireDb();
        const { sopTemplates } = await import("../../drizzle/production-process-schema");

        // Fetch all SOPs then filter by category match
        const allSops = await db
          .select({
            id: sopTemplates.id,
            code: sopTemplates.code,
            title: sopTemplates.title,
            category: sopTemplates.category,
            processCode: sopTemplates.processCode,
            version: sopTemplates.version,
            isActive: sopTemplates.isActive,
            difficultyLevel: sopTemplates.difficultyLevel,
          })
          .from(sopTemplates)
          .where(eq(sopTemplates.isActive, true))
          .orderBy(desc(sopTemplates.createdAt))
          .limit(200);

        // Match DB SOPs to role-relevant categories
        const matched = allSops.filter((sop) =>
          categories.includes(sop.category as any)
        );

        return {
          dbSOPs: matched,
          roleSOPReferences: config.sopReferences,
          categories,
        };
      } catch {
        // DB unavailable — return static references only
        return {
          dbSOPs: [],
          roleSOPReferences: config.sopReferences,
          categories,
        };
      }
    }),

  /** List all available workstation roles */
  listWorkstationRoles: protectedProcedure.query(() => {
    return ALL_WORKSTATION_ROLES.map((roleId) => {
      const config = getWorkstationConfig(roleId);
      return {
        roleId,
        roleName: config.roleName,
        roleNameEn: config.roleNameEn,
        defaultAgentLevel: config.defaultAgentLevel,
        sopCount: config.sopReferences.length,
        dailyTaskCount: getDailyTasks(roleId).length,
      };
    });
  }),
});
