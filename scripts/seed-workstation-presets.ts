/**
 * GRT Workstation Preset Seed — 全员工作台预设
 *
 * Based on CEO directive: 依据提交的员工实际名单与工资表中的入职日期，
 * 绩效表现，岗位职责等预设所有员工的工作台设置
 *
 * Sources:
 *   - data/employees.json (96 employees, departments, positions)
 *   - data/salary-summary-202601.csv (grades, salary tiers)
 *   - data/performance-scores-202601.csv (KPI scores)
 *
 * Generates workstation_presets entries for ALL 96 employees.
 *
 * Usage: npx tsx scripts/seed-workstation-presets.ts
 */

// ══════════════════════════════════════════════════════════
// 1. Position → System Role Mapping
// ══════════════════════════════════════════════════════════

type SystemRole =
  | "ceo" | "director" | "dept_manager" | "team_leader"
  | "bu_gm" | "bu_pm" | "bu_sales" | "bu_mech" | "bu_elec"
  | "hr_manager" | "hr_specialist" | "finance_manager" | "finance_specialist"
  | "procurement_eng" | "cs_engineer" | "production_worker" | "employee";

function mapPositionToRole(position: string, department: string): SystemRole {
  const p = position || "";
  if (p.includes("董事长")) return "ceo";
  if (p.includes("总经理")) return "director";
  if (p === "AI数智&人事行政部经理") return "dept_manager";
  if (p.includes("部门经理") || p === "事业三部经理" || p === "事业二部经理") return "bu_gm";
  if (p.includes("高级销售经理") || p.includes("制造质量经理") || p.includes("机械设计经理")
    || p.includes("商务经理") || p.includes("市场与客户经理") || p.includes("客户与服务经理")) return "dept_manager";
  if (p.includes("销售经理") || p.includes("市场主管")) return "bu_sales";
  if (p.includes("董事长助理")) return "director";
  if (p.includes("人事行政主管")) return "hr_manager";
  if (p.includes("行政前台") || p.includes("前法") || p.includes("后勤")) return "hr_specialist";
  if (p.includes("总账会计")) return "finance_manager";
  if (p.includes("会计") || p.includes("会计助理")) return "finance_specialist";
  if (p.includes("仓库管理") || p.includes("供应链")) return "procurement_eng";
  if (p.includes("班组长") || p.includes("副班长") || p.includes("主管")) return "team_leader";
  if (p.includes("售后技工") || p.includes("售后服务")) return "cs_engineer";
  if (p.includes("PMC")) return "bu_pm";
  if (p.includes("采购") && p.includes("工程师")) return "procurement_eng";
  if (p.includes("采购经理")) return "procurement_eng";
  if (p.includes("电气工程师") || p.includes("助理电气")) return "bu_elec";
  if (p.includes("机械研发") || p.includes("助理机械") || p.includes("机械设计")) return "bu_mech";
  if (p.includes("销售与项目工程师") || p.includes("市场专员")) return "bu_sales";
  if (p.includes("IT工程师") || p.includes("生产工程师")) return "employee";
  if (p.includes("质量专员") || p.includes("质量")) return "employee";
  if (p.includes("文员")) return "employee";
  // Production workers
  if (p.includes("装配") || p.includes("焊工") || p.includes("冷作") || p.includes("激光")
    || p.includes("铣工") || p.includes("钳工") || p.includes("铆工") || p.includes("机加工")
    || p.includes("CNC") || p.includes("数控") || p.includes("协作辅助")) return "production_worker";
  return "employee";
}

// ══════════════════════════════════════════════════════════
// 2. Department → BU Code Mapping
// ══════════════════════════════════════════════════════════

function mapDeptToBU(dept: string): string {
  const map: Record<string, string> = {
    "事业一部": "BU1", "事业二部": "BU2", "事业三部": "BU3",
    "事业四部": "BU4", "事业十部": "BU5",
    "总裁办": "HQ", "财务部": "FIN", "人事行政部": "HR",
    "AI数智部": "IT", "事业部支持部": "SUP", "未分配": "HQ",
  };
  return map[dept] || "HQ";
}

// ══════════════════════════════════════════════════════════
// 3. Role → Workstation Template Mapping
// ══════════════════════════════════════════════════════════

interface WorkstationPreset {
  // Identity
  employeeId: string;
  name: string;
  department: string;
  position: string;
  systemRole: SystemRole;
  buCode: string;

  // Dashboard config
  dashboardLayout: string;        // layout template
  pinnedMenuPaths: string[];      // quick-access menu items
  defaultLandingPage: string;     // first page after login
  widgetConfig: WidgetConfig[];   // dashboard widgets
  aiAssistantLevel: number;       // 1-5 AI assistant capability
  briefingModules: string[];      // 智能早报 modules
  kpiWidgets: string[];           // KPI tracking widgets

  // Work schedule
  workSchedule: "six_day" | "five_day" | "alternating" | "shift";
  attendanceGroup: string;

  // Feature flags
  canAccessSalary: boolean;
  canAccessFinance: boolean;
  canApproveOrders: boolean;
  canManageTeam: boolean;
  canViewAllBU: boolean;

  // Performance tier
  performanceTier: "elite" | "standard" | "new_hire" | "probation";
  kpiScore?: number;
  salaryGrade?: string;
}

interface WidgetConfig {
  id: string;
  title: string;
  size: "sm" | "md" | "lg" | "xl";
  position: number;
}

// ── Role-based dashboard templates ──

const ROLE_TEMPLATES: Record<SystemRole, {
  layout: string;
  pinnedPaths: string[];
  landing: string;
  widgets: WidgetConfig[];
  aiLevel: number;
  briefing: string[];
  kpiWidgets: string[];
}> = {
  ceo: {
    layout: "executive-cockpit",
    pinnedPaths: [
      "/ceo-cockpit", "/strategy-dashboard", "/annual-planning",
      "/perf-calibration", "/payroll-approval", "/bi-report",
      "/go-live-command", "/employee-points", "/meeting-executive",
    ],
    landing: "/ceo-cockpit",
    widgets: [
      { id: "revenue_overview", title: "营收总览", size: "xl", position: 1 },
      { id: "bu_performance", title: "五大事业部KPI", size: "lg", position: 2 },
      { id: "cash_flow", title: "现金流", size: "md", position: 3 },
      { id: "employee_points_summary", title: "全员积分概览", size: "md", position: 4 },
      { id: "project_pipeline", title: "项目漏斗", size: "lg", position: 5 },
      { id: "approval_queue", title: "待审批", size: "sm", position: 6 },
      { id: "ai_insights", title: "AI洞察", size: "md", position: 7 },
    ],
    aiLevel: 5,
    briefing: ["finance_summary", "project_alerts", "hr_summary", "ai_recommendations", "market_intelligence"],
    kpiWidgets: ["company_revenue", "customer_satisfaction", "employee_retention", "project_delivery_rate"],
  },

  director: {
    layout: "executive-overview",
    pinnedPaths: [
      "/ceo-cockpit", "/bi-report", "/meeting-executive",
      "/perf-calibration", "/employee-points", "/annual-planning",
    ],
    landing: "/personal-dashboard",
    widgets: [
      { id: "cross_dept_metrics", title: "跨部门指标", size: "lg", position: 1 },
      { id: "approval_queue", title: "待审批", size: "md", position: 2 },
      { id: "project_overview", title: "项目总览", size: "lg", position: 3 },
      { id: "team_performance", title: "团队绩效", size: "md", position: 4 },
      { id: "ai_daily_brief", title: "AI每日简报", size: "md", position: 5 },
    ],
    aiLevel: 4,
    briefing: ["cross_dept_alerts", "project_status", "approval_reminders", "ai_recommendations"],
    kpiWidgets: ["dept_completion_rate", "budget_utilization", "team_satisfaction"],
  },

  bu_gm: {
    layout: "bu-command-center",
    pinnedPaths: [
      "/bu-performance", "/bu-team", "/project-management",
      "/sales-coach", "/production-dashboard", "/employee-points",
      "/meeting-dashboard", "/quality-dashboard",
    ],
    landing: "/bu-performance",
    widgets: [
      { id: "bu_revenue", title: "事业部营收", size: "lg", position: 1 },
      { id: "order_pipeline", title: "订单漏斗", size: "lg", position: 2 },
      { id: "production_status", title: "生产进度", size: "md", position: 3 },
      { id: "team_kpi", title: "团队KPI", size: "md", position: 4 },
      { id: "customer_issues", title: "客户问题", size: "sm", position: 5 },
      { id: "quality_metrics", title: "质量指标", size: "md", position: 6 },
    ],
    aiLevel: 4,
    briefing: ["bu_sales_update", "production_alerts", "quality_issues", "team_attendance"],
    kpiWidgets: ["bu_revenue_target", "order_conversion", "production_oee", "quality_yield"],
  },

  dept_manager: {
    layout: "department-dashboard",
    pinnedPaths: [
      "/my-tasks", "/meeting-dashboard", "/team-management",
      "/employee-points", "/approval-management", "/performance-review",
    ],
    landing: "/personal-dashboard",
    widgets: [
      { id: "team_tasks", title: "团队任务", size: "lg", position: 1 },
      { id: "approval_queue", title: "待审批", size: "md", position: 2 },
      { id: "team_attendance", title: "团队考勤", size: "md", position: 3 },
      { id: "dept_budget", title: "部门预算", size: "sm", position: 4 },
      { id: "team_kpi", title: "下属KPI", size: "md", position: 5 },
    ],
    aiLevel: 3,
    briefing: ["team_status", "approval_reminders", "project_deadlines", "meeting_prep"],
    kpiWidgets: ["team_completion_rate", "dept_quality", "team_attendance_rate"],
  },

  team_leader: {
    layout: "team-lead-board",
    pinnedPaths: [
      "/my-tasks", "/morning-meeting", "/role-workstation",
      "/employee-points", "/quality-dashboard",
    ],
    landing: "/role-workstation",
    widgets: [
      { id: "team_tasks", title: "班组任务", size: "lg", position: 1 },
      { id: "production_board", title: "生产看板", size: "lg", position: 2 },
      { id: "quality_checklist", title: "质量检查", size: "md", position: 3 },
      { id: "attendance_today", title: "今日考勤", size: "sm", position: 4 },
    ],
    aiLevel: 2,
    briefing: ["shift_handover", "production_targets", "quality_alerts"],
    kpiWidgets: ["team_output", "defect_rate", "attendance"],
  },

  bu_sales: {
    layout: "sales-workbench",
    pinnedPaths: [
      "/sales-crm", "/lead-management", "/sales-coach",
      "/customer-management", "/my-tasks", "/employee-points",
    ],
    landing: "/sales-crm",
    widgets: [
      { id: "sales_pipeline", title: "销售漏斗M0-M6", size: "xl", position: 1 },
      { id: "customer_list", title: "我的客户", size: "lg", position: 2 },
      { id: "monthly_target", title: "月度目标", size: "md", position: 3 },
      { id: "lead_followup", title: "待跟进线索", size: "md", position: 4 },
      { id: "quote_status", title: "报价状态", size: "sm", position: 5 },
    ],
    aiLevel: 3,
    briefing: ["customer_followup", "deal_alerts", "market_news", "competitor_activity"],
    kpiWidgets: ["revenue_vs_target", "new_customers_m2", "quote_win_rate", "order_backlog"],
  },

  bu_pm: {
    layout: "project-command",
    pinnedPaths: [
      "/project-management", "/my-tasks", "/stage-gate",
      "/meeting-dashboard", "/employee-points",
    ],
    landing: "/project-management",
    widgets: [
      { id: "project_gantt", title: "项目甘特图", size: "xl", position: 1 },
      { id: "milestone_tracker", title: "里程碑跟踪", size: "lg", position: 2 },
      { id: "risk_register", title: "风险登记", size: "md", position: 3 },
      { id: "resource_allocation", title: "资源分配", size: "md", position: 4 },
    ],
    aiLevel: 3,
    briefing: ["project_status", "milestone_alerts", "resource_conflicts"],
    kpiWidgets: ["on_time_delivery", "budget_variance", "scope_change_count"],
  },

  bu_mech: {
    layout: "engineering-station",
    pinnedPaths: [
      "/pdm-workbench", "/drawing-library", "/bom-import",
      "/my-tasks", "/model-viewer-3d", "/employee-points",
    ],
    landing: "/role-workstation",
    widgets: [
      { id: "my_drawings", title: "我的图纸任务", size: "lg", position: 1 },
      { id: "bom_status", title: "BOM状态", size: "md", position: 2 },
      { id: "eco_tracking", title: "工程变更跟踪", size: "md", position: 3 },
      { id: "design_review", title: "设计评审", size: "sm", position: 4 },
    ],
    aiLevel: 3,
    briefing: ["design_tasks", "eco_updates", "quality_feedback"],
    kpiWidgets: ["drawing_completion", "eco_cycle_time", "design_quality_score"],
  },

  bu_elec: {
    layout: "engineering-station",
    pinnedPaths: [
      "/pdm-workbench", "/ccd-integration", "/my-tasks",
      "/drawing-library", "/employee-points",
    ],
    landing: "/role-workstation",
    widgets: [
      { id: "my_circuits", title: "我的电气任务", size: "lg", position: 1 },
      { id: "plc_programs", title: "PLC程序管理", size: "md", position: 2 },
      { id: "test_results", title: "调试结果", size: "md", position: 3 },
      { id: "wiring_checklist", title: "接线检查", size: "sm", position: 4 },
    ],
    aiLevel: 3,
    briefing: ["electrical_tasks", "test_schedule", "safety_alerts"],
    kpiWidgets: ["task_completion", "first_pass_rate", "debug_hours"],
  },

  hr_manager: {
    layout: "hr-command-center",
    pinnedPaths: [
      "/employee-profile", "/performance-review", "/salary-preparation",
      "/employee-points", "/offboarding", "/org-tree",
      "/meeting-dashboard", "/attendance-clock",
    ],
    landing: "/personal-dashboard",
    widgets: [
      { id: "headcount", title: "人员概览", size: "lg", position: 1 },
      { id: "attendance_summary", title: "考勤汇总", size: "md", position: 2 },
      { id: "perf_distribution", title: "绩效分布", size: "md", position: 3 },
      { id: "leave_requests", title: "请假审批", size: "sm", position: 4 },
      { id: "training_status", title: "培训进展", size: "md", position: 5 },
    ],
    aiLevel: 3,
    briefing: ["attendance_anomalies", "leave_requests", "perf_alerts", "training_reminders"],
    kpiWidgets: ["attendance_rate", "turnover_rate", "training_completion"],
  },

  hr_specialist: {
    layout: "hr-assistant",
    pinnedPaths: [
      "/employee-profile", "/attendance-clock", "/oa-dashboard",
      "/employee-points", "/notifications",
    ],
    landing: "/personal-dashboard",
    widgets: [
      { id: "daily_tasks", title: "今日待办", size: "lg", position: 1 },
      { id: "attendance_today", title: "今日考勤", size: "md", position: 2 },
      { id: "pending_forms", title: "待处理表单", size: "md", position: 3 },
    ],
    aiLevel: 2,
    briefing: ["daily_tasks", "attendance_reminders"],
    kpiWidgets: ["task_completion", "form_processing_time"],
  },

  finance_manager: {
    layout: "finance-dashboard",
    pinnedPaths: [
      "/salary-preparation", "/finance-dashboard", "/expense-report",
      "/employee-points", "/approval-management", "/budget-management",
    ],
    landing: "/personal-dashboard",
    widgets: [
      { id: "cash_position", title: "资金状况", size: "lg", position: 1 },
      { id: "payroll_status", title: "薪资发放状态", size: "md", position: 2 },
      { id: "expense_approvals", title: "费用审批", size: "md", position: 3 },
      { id: "budget_tracking", title: "预算跟踪", size: "lg", position: 4 },
      { id: "tax_calendar", title: "税务日历", size: "sm", position: 5 },
    ],
    aiLevel: 3,
    briefing: ["finance_summary", "payment_due", "budget_alerts", "tax_reminders"],
    kpiWidgets: ["budget_utilization", "collection_rate", "payroll_accuracy"],
  },

  finance_specialist: {
    layout: "finance-assistant",
    pinnedPaths: [
      "/salary-report", "/expense-report", "/oa-dashboard",
      "/employee-points",
    ],
    landing: "/personal-dashboard",
    widgets: [
      { id: "daily_tasks", title: "今日待办", size: "lg", position: 1 },
      { id: "invoice_queue", title: "发票处理", size: "md", position: 2 },
      { id: "reconciliation", title: "对账", size: "md", position: 3 },
    ],
    aiLevel: 2,
    briefing: ["daily_tasks", "payment_reminders"],
    kpiWidgets: ["task_completion", "processing_accuracy"],
  },

  procurement_eng: {
    layout: "procurement-workbench",
    pinnedPaths: [
      "/supply-chain-workbench", "/procurement-management", "/supplier-management",
      "/inventory-dashboard", "/my-tasks", "/employee-points",
    ],
    landing: "/supply-chain-workbench",
    widgets: [
      { id: "purchase_orders", title: "采购订单", size: "lg", position: 1 },
      { id: "supplier_performance", title: "供应商评分", size: "md", position: 2 },
      { id: "inventory_alerts", title: "库存预警", size: "md", position: 3 },
      { id: "delivery_tracking", title: "交期跟踪", size: "md", position: 4 },
    ],
    aiLevel: 3,
    briefing: ["po_status", "delivery_alerts", "inventory_warnings", "supplier_issues"],
    kpiWidgets: ["on_time_delivery", "cost_savings", "supplier_score"],
  },

  cs_engineer: {
    layout: "service-workbench",
    pinnedPaths: [
      "/service-tickets", "/field-service", "/customer-management",
      "/knowledge-base", "/my-tasks", "/employee-points",
    ],
    landing: "/service-tickets",
    widgets: [
      { id: "open_tickets", title: "待处理工单", size: "lg", position: 1 },
      { id: "field_schedule", title: "外出计划", size: "md", position: 2 },
      { id: "customer_feedback", title: "客户反馈", size: "md", position: 3 },
      { id: "spare_parts", title: "备件库存", size: "sm", position: 4 },
    ],
    aiLevel: 2,
    briefing: ["ticket_status", "customer_alerts", "travel_schedule"],
    kpiWidgets: ["ticket_resolution_time", "customer_satisfaction", "first_fix_rate"],
  },

  production_worker: {
    layout: "shop-floor",
    pinnedPaths: [
      "/role-workstation", "/morning-meeting", "/employee-points",
      "/attendance-clock",
    ],
    landing: "/role-workstation",
    widgets: [
      { id: "my_tasks_today", title: "今日任务", size: "lg", position: 1 },
      { id: "quality_checklist", title: "质量检查表", size: "md", position: 2 },
      { id: "safety_reminder", title: "安全提醒", size: "sm", position: 3 },
    ],
    aiLevel: 1,
    briefing: ["shift_tasks", "safety_alerts"],
    kpiWidgets: ["daily_output", "quality_pass_rate"],
  },

  employee: {
    layout: "standard-workspace",
    pinnedPaths: [
      "/my-tasks", "/role-workstation", "/employee-points",
      "/personal-dashboard", "/attendance-clock",
    ],
    landing: "/personal-dashboard",
    widgets: [
      { id: "my_tasks", title: "我的任务", size: "lg", position: 1 },
      { id: "daily_plan", title: "今日计划", size: "md", position: 2 },
      { id: "notifications", title: "通知", size: "md", position: 3 },
      { id: "points_summary", title: "积分概览", size: "sm", position: 4 },
    ],
    aiLevel: 2,
    briefing: ["daily_tasks", "meeting_reminders"],
    kpiWidgets: ["task_completion", "attendance"],
  },
};

// ══════════════════════════════════════════════════════════
// 4. Performance Data Lookup (from CSV)
// ══════════════════════════════════════════════════════════

const PERFORMANCE_SCORES: Record<string, number> = {
  "GRT003": 87.1, "GRT004": 59.2, "GRT005": 81.2, "GRT006": 79.6,
  "GRT007": 81, "GRT018": 77, "GRT019": 60, "GRT020": 86.7,
  "GRT022": 85.6, "GRT030": 82.6, "GRT035": 74.6, "GRT043": 60,
  "GRT044": 78.6, "GRT045": 74, "GRT049": 81, "GRT054": 92,
  "GRT055": 77.8, "GRT057": 81.3, "GRT058": 64, "GRT062": 81,
  "GRT063": 61.2, "GRT067": 82, "GRT080": 81, "GRT081": 83.5,
  "GRT083": 78, "GRT087": 77, "GRT088": 77.6, "GRT089": 76,
  "GRT090": 79.6, "GRT094": 69, "GRT097": 88.6, "GRT099": 81.6,
};

// ══════════════════════════════════════════════════════════
// 5. Salary Grade Lookup (from CSV)
// ══════════════════════════════════════════════════════════

const SALARY_GRADES: Record<string, string> = {
  "GRT001": "CEO",    // 倪亚东 — lump sum 35000
  "GRT105": "MGR",    // 倪微薇 — lump sum 20000
  "GRT002": "CFO",    // 黄晓兰 — lump sum 35000
  "GRT078": "12A",    // 曹二
  "GRT045": "11B",    // 杨勇
  "GRT080": "8",      // 刘奥运
  "GRT067": "8",      // 沙建梅
  "GRT100": "4",      // 田炜钰
  "GRT062": "8",      // 朱宇浩
  "GRT049": "8",      // 胡杨
  "GRT103": "4",      // 朱文韬
  "GRT054": "7",      // 王秀萍
  "GRT101": "4",      // 王汝月
  "GRT055": "10B",    // 沈迎凤
  "GRT003": "5",      // 倪亚琴
  "GRT020": "7",      // 张洵
  "GRT057": "5",      // 滕顺英
  "GRT004": "10C",    // 戴晓燕
  "GRT019": "7",      // 冯艳
  "GRT035": "7",      // 王志强
  "GRT043": "6",      // 韩保程
  "GRT104": "5",      // 董纾雨
  "GRT063": "9A",     // 刘健康
  "GRT083": "8",      // 刘坤
  "GRT005": "9B",     // 金晓锋
  "GRT008": "4",      // 马柯
  "GRT081": "5",      // 马康风
  "GRT066": "5",      // 李新正 (季蔚正 mapping)
};

// ══════════════════════════════════════════════════════════
// 6. Performance Tier Classification
// ══════════════════════════════════════════════════════════

function classifyPerformanceTier(
  kpiScore: number | undefined,
  grade: string | undefined,
  position: string,
): "elite" | "standard" | "new_hire" | "probation" {
  // New hires (no grade, no KPI, or junior positions)
  if (!kpiScore && !grade) return "new_hire";
  if (grade === "4" || grade === "3" || grade === "2") {
    if (!kpiScore || kpiScore === 0) return "new_hire";
  }

  // Elite performers
  if (kpiScore && kpiScore >= 85 && grade && parseInt(grade) >= 8) return "elite";

  // Standard
  if (kpiScore && kpiScore >= 70) return "standard";

  // Probation / low performers
  if (kpiScore && kpiScore < 60) return "probation";

  return "standard";
}

// ══════════════════════════════════════════════════════════
// 7. Work Schedule Mapping
// ══════════════════════════════════════════════════════════

function mapWorkSchedule(role: SystemRole, dept: string): { schedule: string; group: string } {
  if (role === "ceo" || role === "director") {
    return { schedule: "six_day", group: "管理层" };
  }
  if (role === "production_worker" || role === "team_leader") {
    return { schedule: "six_day", group: "6天生产班组" };
  }
  if (dept === "人事行政部" && (role === "hr_specialist")) {
    return { schedule: "six_day", group: "6天行政班组" };
  }
  return { schedule: "six_day", group: "6天办公室" };
}

// ══════════════════════════════════════════════════════════
// 8. Feature Flag Mapping
// ══════════════════════════════════════════════════════════

function getFeatureFlags(role: SystemRole) {
  return {
    canAccessSalary: ["ceo", "director", "finance_manager"].includes(role),
    canAccessFinance: ["ceo", "director", "finance_manager", "finance_specialist"].includes(role),
    canApproveOrders: ["ceo", "director", "bu_gm", "dept_manager", "procurement_eng"].includes(role),
    canManageTeam: ["ceo", "director", "bu_gm", "dept_manager", "team_leader", "hr_manager"].includes(role),
    canViewAllBU: ["ceo", "director", "hr_manager", "finance_manager"].includes(role),
  };
}

// ══════════════════════════════════════════════════════════
// 9. Generate All Presets
// ══════════════════════════════════════════════════════════

export interface EmployeeWorkstationPreset {
  employeeId: string;
  name: string;
  department: string;
  position: string;
  systemRole: SystemRole;
  buCode: string;
  dashboardLayout: string;
  pinnedMenuPaths: string[];
  defaultLandingPage: string;
  widgetConfig: WidgetConfig[];
  aiAssistantLevel: number;
  briefingModules: string[];
  kpiWidgets: string[];
  workSchedule: string;
  attendanceGroup: string;
  canAccessSalary: boolean;
  canAccessFinance: boolean;
  canApproveOrders: boolean;
  canManageTeam: boolean;
  canViewAllBU: boolean;
  performanceTier: string;
  kpiScore: number | null;
  salaryGrade: string | null;
}

export function generateAllPresets(employees: Array<{ id: string; name: string; department: string; position: string }>): EmployeeWorkstationPreset[] {
  return employees.map(emp => {
    const role = mapPositionToRole(emp.position, emp.department);
    const buCode = mapDeptToBU(emp.department);
    const template = ROLE_TEMPLATES[role];
    const kpi = PERFORMANCE_SCORES[emp.id];
    const grade = SALARY_GRADES[emp.id];
    const tier = classifyPerformanceTier(kpi, grade, emp.position);
    const schedule = mapWorkSchedule(role, emp.department);
    const flags = getFeatureFlags(role);

    // Customizations per specific employee
    let pinnedPaths = [...template.pinnedPaths];
    let widgets = [...template.widgets];
    let landing = template.landing;

    // CEO gets extra dashboards
    if (emp.id === "GRT001") {
      pinnedPaths = ["/ceo-cockpit", "/strategy-dashboard", "/annual-planning",
        "/perf-calibration", "/payroll-approval", "/bi-report",
        "/go-live-command", "/employee-points", "/meeting-executive",
        "/sales-coach", "/battle-arena"];
    }

    // 倪微薇 (AI & HR department manager) gets both HR and IT dashboards
    if (emp.id === "GRT105") {
      pinnedPaths = ["/employee-profile", "/performance-review", "/salary-preparation",
        "/system-health", "/monitoring-dashboard", "/employee-points",
        "/ai-assistant-hub", "/org-tree"];
      landing = "/personal-dashboard";
    }

    // 刘奥运 (董事长助理) gets wide visibility
    if (emp.id === "GRT080") {
      pinnedPaths = ["/ceo-cockpit", "/bi-report", "/meeting-executive",
        "/system-health", "/employee-points", "/monitoring-dashboard"];
    }

    // BU managers get their BU-specific views
    if (emp.id === "GRT058") { // 周辉 事业三部经理
      pinnedPaths = ["/bu-performance", "/project-management", "/sales-crm",
        "/production-dashboard", "/employee-points", "/meeting-dashboard"];
    }
    if (emp.id === "GRT094") { // 徐树奎 事业二部经理
      pinnedPaths = ["/bu-performance", "/project-management", "/sales-crm",
        "/production-dashboard", "/employee-points", "/quality-dashboard"];
    }

    return {
      employeeId: emp.id,
      name: emp.name,
      department: emp.department,
      position: emp.position,
      systemRole: role,
      buCode,
      dashboardLayout: template.layout,
      pinnedMenuPaths: pinnedPaths,
      defaultLandingPage: landing,
      widgetConfig: widgets,
      aiAssistantLevel: template.aiLevel,
      briefingModules: template.briefing,
      kpiWidgets: template.kpiWidgets,
      workSchedule: schedule.schedule,
      attendanceGroup: schedule.group,
      ...flags,
      performanceTier: tier,
      kpiScore: kpi ?? null,
      salaryGrade: grade ?? null,
    };
  });
}

// ══════════════════════════════════════════════════════════
// 10. Print Summary (for verification)
// ══════════════════════════════════════════════════════════

if (typeof require !== "undefined" || import.meta.url) {
  // Allow direct execution
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dataPath = path.join(__dirname, "..", "data", "employees.json");
  const raw = fs.readFileSync(dataPath, "utf-8");
  const { employees } = JSON.parse(raw);

  const presets = generateAllPresets(employees);

  // Summary statistics
  const roleCount: Record<string, number> = {};
  const tierCount: Record<string, number> = {};
  const layoutCount: Record<string, number> = {};

  for (const p of presets) {
    roleCount[p.systemRole] = (roleCount[p.systemRole] ?? 0) + 1;
    tierCount[p.performanceTier] = (tierCount[p.performanceTier] ?? 0) + 1;
    layoutCount[p.dashboardLayout] = (layoutCount[p.dashboardLayout] ?? 0) + 1;
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  GRT Workstation Preset Report — 全员工作台预设");
  console.log("═══════════════════════════════════════════════════\n");
  console.log(`Total employees: ${presets.length}\n`);

  console.log("── Role Distribution ──");
  for (const [role, count] of Object.entries(roleCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${role.padEnd(20)} ${count}`);
  }

  console.log("\n── Performance Tier Distribution ──");
  for (const [tier, count] of Object.entries(tierCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tier.padEnd(20)} ${count}`);
  }

  console.log("\n── Dashboard Layout Distribution ──");
  for (const [layout, count] of Object.entries(layoutCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${layout.padEnd(25)} ${count}`);
  }

  // Print individual presets for key employees
  console.log("\n── Key Employee Presets ──\n");
  const keyEmployees = ["GRT001", "GRT105", "GRT080", "GRT058", "GRT094", "GRT004", "GRT005", "GRT067", "GRT054", "GRT062"];
  for (const id of keyEmployees) {
    const p = presets.find(x => x.employeeId === id);
    if (!p) continue;
    console.log(`${p.employeeId} ${p.name.padEnd(6)} | ${p.position.padEnd(20)} | role=${p.systemRole.padEnd(15)} | layout=${p.dashboardLayout.padEnd(22)} | AI=${p.aiAssistantLevel} | tier=${p.performanceTier} | KPI=${p.kpiScore ?? "N/A"} | grade=${p.salaryGrade ?? "N/A"}`);
    console.log(`  → Landing: ${p.defaultLandingPage}`);
    console.log(`  → Pinned: ${p.pinnedMenuPaths.slice(0, 5).join(", ")}${p.pinnedMenuPaths.length > 5 ? "..." : ""}`);
    console.log(`  → Widgets: ${p.widgetConfig.map(w => w.title).join(", ")}`);
    console.log(`  → Schedule: ${p.workSchedule} (${p.attendanceGroup})`);
    console.log(`  → Flags: salary=${p.canAccessSalary} finance=${p.canAccessFinance} team=${p.canManageTeam} allBU=${p.canViewAllBU}`);
    console.log("");
  }

  // Output full JSON for DB import
  const outputPath = path.join(__dirname, "..", "data", "workstation-presets.json");
  fs.writeFileSync(outputPath, JSON.stringify(presets, null, 2), "utf-8");
  console.log(`\nFull presets written to: ${outputPath}`);
  console.log(`Total: ${presets.length} employee workstation configurations\n`);
}
