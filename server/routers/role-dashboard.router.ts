/**
 * 角色驾驶舱路由 — Role-Based Dashboard
 * Returns personalized dashboard widgets and quick actions for each user role/BU.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as employeeService from "../services/employee.service";

// ── Widget & Quick Action Types ────────────────────────────────────────────────

interface QuickAction {
  label: string;
  route: string;
}

interface DashboardData {
  employee: {
    name: string;
    department: string;
    position: string;
    buCode: string | null;
    systemRole: string | null;
  };
  widgets: string[];
  quickActions: QuickAction[];
}

// ── Widget Mapping by systemRole ───────────────────────────────────────────────

function getWidgets(systemRole: string | null): string[] {
  switch (systemRole) {
    case "admin":
    case "director":
    case "bu_gm":
    case "bu_pm":
    case "dept_manager":
      return ["project_overview", "financial_summary", "team_performance", "pending_approvals"];

    case "bu_sales":
    case "cs_engineer":
    case "procurement_eng":
    case "employee":
      return ["my_projects", "my_customers", "my_tasks", "upcoming_visits"];

    case "team_lead":
      return ["team_tasks", "production_progress", "quality_alerts", "shift_schedule"];

    case "production_worker":
    case "bu_mech":
    case "bu_elec":
      return ["my_shift", "work_instructions", "quality_checklist", "safety_alerts"];

    case "finance_manager":
    case "finance_specialist":
      return ["budget_overview", "expense_reports", "cost_alerts", "payment_schedule"];

    case "hr_manager":
    case "hr_specialist":
      return ["attendance", "onboarding", "training_schedule", "compliance"];

    default:
      return ["my_tasks", "notifications", "help"];
  }
}

// ── Quick Actions Mapping by systemRole ───────────────────────────────────────

function getQuickActions(systemRole: string | null, position: string): QuickAction[] {
  // Position-based overrides (sales / project engineers)
  const positionLower = position.toLowerCase();
  const isSalesEngineer =
    positionLower.includes("销售") || systemRole === "bu_sales";
  const isProjectEngineer =
    positionLower.includes("采购与项目") || positionLower.includes("project engineer");

  if (isSalesEngineer && systemRole !== "dept_manager" && systemRole !== "bu_gm") {
    return [
      { label: "新建客户", route: "/crm/customers/new" },
      { label: "创建报价", route: "/quotation/new" },
      { label: "我的项目", route: "/projects" },
      { label: "拜访记录", route: "/crm/interactions" },
    ];
  }

  if (isProjectEngineer && systemRole !== "dept_manager" && systemRole !== "bu_gm") {
    return [
      { label: "我的项目", route: "/projects" },
      { label: "采购申请", route: "/procurement/new" },
      { label: "任务看板", route: "/tasks" },
      { label: "进度报告", route: "/projects/reports" },
    ];
  }

  switch (systemRole) {
    case "admin":
    case "director":
    case "bu_gm":
      return [
        { label: "经营看板", route: "/ceo-cockpit" },
        { label: "审批中心", route: "/approvals" },
        { label: "项目总览", route: "/projects" },
      ];

    case "bu_pm":
    case "dept_manager":
      return [
        { label: "项目总览", route: "/projects" },
        { label: "审批中心", route: "/approvals" },
        { label: "团队绩效", route: "/hr/performance" },
        { label: "任务看板", route: "/tasks" },
      ];

    case "team_lead":
      return [
        { label: "今日工单", route: "/shopfloor" },
        { label: "班组任务", route: "/tasks" },
        { label: "质检记录", route: "/quality" },
        { label: "交接班", route: "/shift-handover" },
      ];

    case "production_worker":
    case "bu_mech":
    case "bu_elec":
      return [
        { label: "今日工单", route: "/shopfloor" },
        { label: "质检记录", route: "/quality" },
        { label: "交接班", route: "/shift-handover" },
      ];

    case "finance_manager":
    case "finance_specialist":
      return [
        { label: "费用报销", route: "/expense-reports/new" },
        { label: "预算总览", route: "/budget" },
        { label: "付款计划", route: "/finance/payments" },
        { label: "成本预警", route: "/finance/alerts" },
      ];

    case "hr_manager":
    case "hr_specialist":
      return [
        { label: "员工考勤", route: "/hr/attendance" },
        { label: "新员工入职", route: "/hr/onboarding" },
        { label: "培训安排", route: "/hr/training" },
        { label: "合规检查", route: "/hr/compliance" },
      ];

    case "cs_engineer":
      return [
        { label: "客户工单", route: "/crm/tickets" },
        { label: "售后记录", route: "/crm/service" },
        { label: "技术支持", route: "/crm/support" },
      ];

    case "procurement_eng":
      return [
        { label: "采购申请", route: "/procurement/new" },
        { label: "供应商管理", route: "/procurement/suppliers" },
        { label: "我的项目", route: "/projects" },
      ];

    default:
      return [
        { label: "任务看板", route: "/tasks" },
        { label: "消息通知", route: "/notifications" },
        { label: "帮助中心", route: "/help" },
      ];
  }
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const roleDashboardRouter = router({
  /**
   * getMyDashboard — returns role-personalized dashboard data.
   *
   * Input: optional employeeId. When omitted the caller is expected to look up
   * their own employee record via context (falls back gracefully to defaults
   * when no matching employee is found in DB).
   */
  getMyDashboard: protectedProcedure
    .input(
      z.object({
        employeeId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }): Promise<DashboardData> => {
      const employeeId = input?.employeeId;

      let employee: employeeService.Employee | null = null;

      if (employeeId) {
        employee = await employeeService.getEmployeeById(employeeId);
      }

      // Fallback: try to derive a display name / role from the session context
      // so the dashboard is still useful even if the employee record is missing.
      if (!employee) {
        const user = ctx.user as any;
        const fallbackName: string =
          user?.name ?? user?.displayName ?? user?.openId ?? "用户";
        const fallbackRole: string | null =
          user?.systemRole ?? user?.role ?? null;
        const fallbackBu: string | null =
          (ctx as any).bu?.buCode ?? null;

        const widgets = getWidgets(fallbackRole);
        const quickActions = getQuickActions(fallbackRole, "");

        return {
          employee: {
            name: fallbackName,
            department: "",
            position: "",
            buCode: fallbackBu,
            systemRole: fallbackRole,
          },
          widgets,
          quickActions,
        };
      }

      const widgets = getWidgets(employee.systemRole);
      const quickActions = getQuickActions(employee.systemRole, employee.position);

      return {
        employee: {
          name: employee.name,
          department: employee.department,
          position: employee.position,
          buCode: employee.buCode,
          systemRole: employee.systemRole,
        },
        widgets,
        quickActions,
      };
    }),
});
