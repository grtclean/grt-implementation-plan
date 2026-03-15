/**
 * Sandbox I/O Configuration — defines input/output connections, M365 integrations,
 * keyboard shortcuts, file import types, and tools for each sandbox.
 */
import type { LucideIcon } from "lucide-react";

// ── I/O Connection Types ──
export interface SandboxIO {
  /** Upstream sandboxes that feed data INTO this sandbox */
  inputs: SandboxDataFlow[];
  /** Downstream sandboxes that receive data FROM this sandbox */
  outputs: SandboxDataFlow[];
}

export interface SandboxDataFlow {
  sandboxId: string;
  sandboxName: string;
  dataType: string;
  description: string;
  descriptionEn: string;
  /** Event bus event that triggers this flow */
  eventName?: string;
}

// ── M365 Integration Types ──
export type M365Service = "outlook" | "teams" | "planner" | "onenote" | "onedrive" | "sharepoint";

export interface M365Integration {
  service: M365Service;
  label: string;
  labelEn: string;
  description: string;
  /** Specific action this integration performs */
  action: string;
}

// ── Tool Types ──
export interface SandboxTool {
  id: string;
  label: string;
  labelEn: string;
  icon: string; // lucide icon name
  action: string;
  shortcut?: string;
}

// ── File Import Types ──
export interface SandboxFileConfig {
  accept: string;
  label: string;
  labelEn: string;
  targetTable: string;
}

// ── Per-Sandbox Config ──
export interface SandboxEnhancedConfig {
  id: string;
  num: string;
  name: string;
  nameEn: string;
  io: SandboxIO;
  m365: M365Integration[];
  tools: SandboxTool[];
  fileImports: SandboxFileConfig[];
  shortcuts: { key: string; label: string; labelEn: string }[];
}

// ══════════════════════════════════════════════════════════════
// SANDBOX CONFIGURATIONS
// ══════════════════════════════════════════════════════════════

export const SANDBOX_IO_CONFIG: Record<string, SandboxEnhancedConfig> = {
  // ──────────────────────────────────────────────────
  // ① Annual Planning (年度规划与预算)
  // ──────────────────────────────────────────────────
  "annual-planning": {
    id: "annual-planning",
    num: "①",
    name: "年度规划与预算",
    nameEn: "Annual Planning & Budget",
    io: {
      inputs: [
        { sandboxId: "performance-points", sandboxName: "③ 绩效与积分", dataType: "KPI actuals", description: "上年绩效结果反馈", descriptionEn: "Prior year performance results", eventName: "PERF_CALIBRATION_DONE" },
        { sandboxId: "acceptance-tracking", sandboxName: "⑩ 验收追踪", dataType: "Revenue data", description: "项目验收收入确认", descriptionEn: "Project acceptance revenue recognition" },
      ],
      outputs: [
        { sandboxId: "project-lifecycle", sandboxName: "⑤ 项目M0-M12", dataType: "Budget allocation", description: "年度预算分配到项目", descriptionEn: "Annual budget allocated to projects", eventName: "ANNUAL_PLAN_APPROVED" },
        { sandboxId: "performance-points", sandboxName: "③ 绩效与积分", dataType: "KPI targets", description: "KPI目标下达", descriptionEn: "KPI targets cascaded down", eventName: "KPI_TARGETS_SET" },
        { sandboxId: "payroll-attendance", sandboxName: "② 薪酬与打卡", dataType: "Headcount plan", description: "人员编制与薪酬预算", descriptionEn: "Headcount plan & salary budget" },
      ],
    },
    m365: [
      { service: "outlook", label: "发送规划通知", labelEn: "Send planning notifications", description: "邮件通知各部门规划截止日期", action: "sendMail" },
      { service: "planner", label: "同步规划任务", labelEn: "Sync planning tasks", description: "创建规划里程碑到Planner看板", action: "createTask" },
      { service: "onenote", label: "规划笔记本", labelEn: "Planning notebook", description: "记录规划会议纪要与决策", action: "createPage" },
      { service: "teams", label: "规划讨论频道", labelEn: "Planning channel", description: "推送规划进展到Teams频道", action: "sendTeamsMessage" },
      { service: "sharepoint", label: "规划文档库", labelEn: "Planning doc library", description: "归档年度规划文档", action: "syncProjectFolders" },
    ],
    tools: [
      { id: "kpi-wizard", label: "KPI向导", labelEn: "KPI Wizard", icon: "Target", action: "openKpiWizard", shortcut: "ctrl+k" },
      { id: "budget-calc", label: "预算计算器", labelEn: "Budget Calculator", icon: "Calculator", action: "openBudgetCalc", shortcut: "ctrl+b" },
      { id: "scenario-compare", label: "情景对比", labelEn: "Scenario Compare", icon: "GitCompare", action: "openScenarioCompare" },
      { id: "ai-interpret", label: "AI解读", labelEn: "AI Interpretation", icon: "Brain", action: "runAiInterpret" },
    ],
    fileImports: [
      { accept: ".xlsx,.csv", label: "导入KPI模板", labelEn: "Import KPI template", targetTable: "annual_kpi" },
      { accept: ".xlsx", label: "导入预算表", labelEn: "Import budget sheet", targetTable: "annual_budget" },
    ],
    shortcuts: [
      { key: "ctrl+k", label: "KPI向导", labelEn: "KPI Wizard" },
      { key: "ctrl+b", label: "预算计算器", labelEn: "Budget Calculator" },
      { key: "ctrl+shift+a", label: "审批提交", labelEn: "Submit for approval" },
    ],
  },

  // ──────────────────────────────────────────────────
  // ② Payroll & Attendance (薪酬与打卡异常)
  // ──────────────────────────────────────────────────
  "payroll-attendance": {
    id: "payroll-attendance",
    num: "②",
    name: "薪酬与打卡异常",
    nameEn: "Payroll & Attendance",
    io: {
      inputs: [
        { sandboxId: "performance-points", sandboxName: "③ 绩效与积分", dataType: "Performance scores", description: "三档绩效工资系数", descriptionEn: "3-tier performance wage coefficients", eventName: "PERF_CALIBRATION_DONE" },
        { sandboxId: "annual-planning", sandboxName: "① 年度规划", dataType: "Salary budget", description: "薪酬预算总额", descriptionEn: "Total salary budget allocation" },
        { sandboxId: "production-scheduling", sandboxName: "⑪ 排产与报工", dataType: "Labor hours", description: "实际工时报工数据", descriptionEn: "Actual labor hour reports", eventName: "LABOR_REPORT_APPROVED" },
        { sandboxId: "hr-lifecycle", sandboxName: "④ HR生命周期", dataType: "Employee roster", description: "在职人员花名册", descriptionEn: "Active employee roster" },
      ],
      outputs: [
        { sandboxId: "annual-planning", sandboxName: "① 年度规划", dataType: "Payroll actuals", description: "实际薪酬支出反馈", descriptionEn: "Actual payroll expenditure feedback" },
        { sandboxId: "project-lifecycle", sandboxName: "⑤ 项目M0-M12", dataType: "Labor cost", description: "项目人工成本归集", descriptionEn: "Project labor cost aggregation", eventName: "PAYROLL_CYCLE_CALCULATED" },
      ],
    },
    m365: [
      { service: "outlook", label: "发送工资条", labelEn: "Send payslips", description: "加密邮件发送个人工资条", action: "sendMail" },
      { service: "teams", label: "考勤异常通知", labelEn: "Attendance alerts", description: "推送打卡异常到个人Teams", action: "sendTeamsMessage" },
      { service: "onedrive", label: "工资档案同步", labelEn: "Payroll archive sync", description: "月度工资报表归档OneDrive", action: "syncToOneDrive" },
      { service: "onenote", label: "薪酬分析笔记", labelEn: "Payroll analysis notes", description: "薪酬趋势分析记录", action: "createPage" },
      { service: "sharepoint", label: "HR文档中心", labelEn: "HR document center", description: "薪酬制度文件存储", action: "listFiles" },
    ],
    tools: [
      { id: "trial-calc", label: "试算运行", labelEn: "Trial Calculation", icon: "Calculator", action: "runTrialCalc", shortcut: "ctrl+r" },
      { id: "anomaly-detect", label: "异常检测", labelEn: "Anomaly Detection", icon: "AlertTriangle", action: "detectAnomalies" },
      { id: "payslip-gen", label: "工资条生成", labelEn: "Generate Payslips", icon: "FileSpreadsheet", action: "generatePayslips" },
      { id: "variance-report", label: "差异报告", labelEn: "Variance Report", icon: "BarChart3", action: "generateVarianceReport" },
    ],
    fileImports: [
      { accept: ".csv,.xlsx", label: "导入考勤数据", labelEn: "Import attendance data", targetTable: "attendance_records" },
      { accept: ".csv", label: "导入津贴表", labelEn: "Import allowances", targetTable: "payroll_allowances" },
      { accept: ".xlsx", label: "导入社保公积金", labelEn: "Import social insurance", targetTable: "payroll_deductions" },
    ],
    shortcuts: [
      { key: "ctrl+r", label: "试算运行", labelEn: "Run trial calc" },
      { key: "ctrl+shift+p", label: "发布工资条", labelEn: "Publish payslips" },
      { key: "ctrl+d", label: "异常检测", labelEn: "Detect anomalies" },
    ],
  },

  // ──────────────────────────────────────────────────
  // ③ Performance & Points (绩效与积分奖惩)
  // ──────────────────────────────────────────────────
  "performance-points": {
    id: "performance-points",
    num: "③",
    name: "绩效与积分奖惩",
    nameEn: "Performance & Points",
    io: {
      inputs: [
        { sandboxId: "annual-planning", sandboxName: "① 年度规划", dataType: "KPI targets", description: "年度KPI目标值", descriptionEn: "Annual KPI target values", eventName: "KPI_TARGETS_SET" },
        { sandboxId: "project-lifecycle", sandboxName: "⑤ 项目M0-M12", dataType: "Project milestones", description: "项目里程碑完成情况", descriptionEn: "Project milestone completion status", eventName: "PROJECT_GATE_PASSED" },
        { sandboxId: "production-scheduling", sandboxName: "⑪ 排产与报工", dataType: "Productivity data", description: "生产效率数据", descriptionEn: "Production efficiency data" },
      ],
      outputs: [
        { sandboxId: "payroll-attendance", sandboxName: "② 薪酬与打卡", dataType: "Performance coefficients", description: "三档绩效工资系数", descriptionEn: "3-tier performance wage coefficients", eventName: "PERF_CALIBRATION_DONE" },
        { sandboxId: "hr-lifecycle", sandboxName: "④ HR生命周期", dataType: "Promotion signals", description: "晋升/调岗建议", descriptionEn: "Promotion/transfer recommendations" },
        { sandboxId: "annual-planning", sandboxName: "① 年度规划", dataType: "KPI actuals", description: "KPI实际达成值", descriptionEn: "KPI actual achievement values" },
      ],
    },
    m365: [
      { service: "outlook", label: "绩效通知邮件", labelEn: "Performance notifications", description: "发送绩效评估结果通知", action: "sendMail" },
      { service: "teams", label: "积分排行推送", labelEn: "Points leaderboard push", description: "月度积分排行推送到Teams", action: "sendTeamsMessage" },
      { service: "planner", label: "绩效改进计划", labelEn: "PIP tasks", description: "创建绩效改进任务到Planner", action: "createTask" },
      { service: "onenote", label: "绩效面谈记录", labelEn: "Review meeting notes", description: "1-on-1绩效面谈笔记", action: "createPage" },
      { service: "onedrive", label: "证据材料归档", labelEn: "Evidence archive", description: "绩效证据材料同步OneDrive", action: "syncToOneDrive" },
    ],
    tools: [
      { id: "calibration", label: "校准工具", labelEn: "Calibration Tool", icon: "Scale", action: "openCalibration" },
      { id: "add-evidence", label: "添加证据", labelEn: "Add Evidence", icon: "FilePlus", action: "addEvidence", shortcut: "ctrl+e" },
      { id: "points-sim", label: "积分模拟", labelEn: "Points Simulator", icon: "Sparkles", action: "simulatePoints" },
      { id: "radar-view", label: "能力雷达", labelEn: "Capability Radar", icon: "Radar", action: "showRadar" },
    ],
    fileImports: [
      { accept: ".csv,.xlsx", label: "导入绩效评分", labelEn: "Import performance scores", targetTable: "perf_reviews" },
      { accept: ".csv", label: "导入积分明细", labelEn: "Import points detail", targetTable: "points_ledger" },
    ],
    shortcuts: [
      { key: "ctrl+e", label: "添加证据", labelEn: "Add evidence" },
      { key: "ctrl+shift+c", label: "校准面板", labelEn: "Calibration panel" },
      { key: "ctrl+l", label: "积分排行", labelEn: "Leaderboard" },
    ],
  },

  // ──────────────────────────────────────────────────
  // ④ HR Lifecycle (HR生命周期)
  // ──────────────────────────────────────────────────
  "hr-lifecycle": {
    id: "hr-lifecycle",
    num: "④",
    name: "HR生命周期",
    nameEn: "HR Lifecycle",
    io: {
      inputs: [
        { sandboxId: "performance-points", sandboxName: "③ 绩效与积分", dataType: "Promotion signals", description: "绩效驱动的晋升建议", descriptionEn: "Performance-driven promotion recommendations" },
        { sandboxId: "annual-planning", sandboxName: "① 年度规划", dataType: "Headcount plan", description: "年度人员编制计划", descriptionEn: "Annual headcount plan" },
      ],
      outputs: [
        { sandboxId: "payroll-attendance", sandboxName: "② 薪酬与打卡", dataType: "Employee roster", description: "在职人员花名册变动", descriptionEn: "Active employee roster changes", eventName: "HR_EMPLOYEE_ONBOARDED" },
        { sandboxId: "performance-points", sandboxName: "③ 绩效与积分", dataType: "New employees", description: "新员工绩效初始化", descriptionEn: "New employee performance initialization" },
        { sandboxId: "project-lifecycle", sandboxName: "⑤ 项目M0-M12", dataType: "Resource pool", description: "可用人力资源池", descriptionEn: "Available human resource pool" },
      ],
    },
    m365: [
      { service: "outlook", label: "入职通知", labelEn: "Onboarding emails", description: "发送入职/离职通知邮件", action: "sendMail" },
      { service: "teams", label: "新员工欢迎", labelEn: "Welcome new hires", description: "在Teams团队频道欢迎新成员", action: "sendTeamsMessage" },
      { service: "planner", label: "入职清单", labelEn: "Onboarding checklist", description: "创建30/60/90天入职任务", action: "createTask" },
      { service: "onenote", label: "面试笔记", labelEn: "Interview notes", description: "记录面试评估笔记", action: "createPage" },
      { service: "sharepoint", label: "员工档案库", labelEn: "Employee file library", description: "员工合同/证书存储", action: "listFiles" },
    ],
    tools: [
      { id: "new-workflow", label: "新建流程", labelEn: "New Workflow", icon: "Plus", action: "createWorkflow", shortcut: "ctrl+n" },
      { id: "org-chart", label: "组织架构", labelEn: "Org Chart", icon: "Network", action: "showOrgChart" },
      { id: "skill-matrix", label: "技能矩阵", labelEn: "Skill Matrix", icon: "LayoutGrid", action: "showSkillMatrix" },
      { id: "headcount-plan", label: "编制规划", labelEn: "Headcount Planning", icon: "Users", action: "openHeadcountPlan" },
    ],
    fileImports: [
      { accept: ".csv,.xlsx", label: "导入花名册", labelEn: "Import employee roster", targetTable: "employees" },
      { accept: ".csv", label: "导入培训记录", labelEn: "Import training records", targetTable: "training_records" },
    ],
    shortcuts: [
      { key: "ctrl+n", label: "新建流程", labelEn: "New workflow" },
      { key: "ctrl+o", label: "组织架构", labelEn: "Org chart" },
      { key: "ctrl+shift+t", label: "培训管理", labelEn: "Training management" },
    ],
  },

  // ──────────────────────────────────────────────────
  // ⑤ Project Lifecycle M0-M12 (项目生命周期)
  // ──────────────────────────────────────────────────
  "project-lifecycle": {
    id: "project-lifecycle",
    num: "⑤",
    name: "项目M0-M12生命周期",
    nameEn: "Project Lifecycle M0-M12",
    io: {
      inputs: [
        { sandboxId: "annual-planning", sandboxName: "① 年度规划", dataType: "Budget allocation", description: "年度预算分配", descriptionEn: "Annual budget allocation", eventName: "ANNUAL_PLAN_APPROVED" },
        { sandboxId: "hr-lifecycle", sandboxName: "④ HR生命周期", dataType: "Resource pool", description: "可用工程师资源", descriptionEn: "Available engineer resources" },
        { sandboxId: "quoting-bom", sandboxName: "⑥ 报价与BOM", dataType: "Awarded quotes", description: "中标报价→立项", descriptionEn: "Awarded quotes → project initiation", eventName: "BOM_FINALIZED" },
      ],
      outputs: [
        { sandboxId: "production-scheduling", sandboxName: "⑪ 排产与报工", dataType: "Production order", description: "生产工单下达", descriptionEn: "Production order release", eventName: "PROJECT_GATE_PASSED" },
        { sandboxId: "mechanical-standards", sandboxName: "⑦ 机械标准", dataType: "Design baseline", description: "设计基线冻结", descriptionEn: "Design baseline freeze" },
        { sandboxId: "electrical-standards", sandboxName: "⑧ 电气规范", dataType: "Electrical spec", description: "电气规格要求", descriptionEn: "Electrical specification requirements" },
        { sandboxId: "performance-points", sandboxName: "③ 绩效与积分", dataType: "Milestones", description: "里程碑完成触发绩效评分", descriptionEn: "Milestone completion triggers performance scoring" },
        { sandboxId: "site-delivery", sandboxName: "⑪ 现场交付", dataType: "Delivery plan", description: "现场交付计划", descriptionEn: "Site delivery plan" },
      ],
    },
    m365: [
      { service: "planner", label: "项目任务看板", labelEn: "Project task board", description: "同步项目里程碑到Planner看板", action: "createTask" },
      { service: "teams", label: "项目频道通知", labelEn: "Project channel alerts", description: "里程碑通过/延期通知到Teams", action: "sendTeamsMessage" },
      { service: "outlook", label: "会议邀请", labelEn: "Meeting invites", description: "发送项目评审会议邀请", action: "sendMail" },
      { service: "sharepoint", label: "项目文档库", labelEn: "Project doc library", description: "P-{YYYY}-{SEQ} 12子文件夹模板", action: "syncProjectFolders" },
      { service: "onenote", label: "项目日志", labelEn: "Project journal", description: "记录项目决策与变更日志", action: "createPage" },
      { service: "onedrive", label: "图纸同步", labelEn: "Drawing sync", description: "CAD图纸双向同步", action: "syncToOneDrive" },
    ],
    tools: [
      { id: "gate-review", label: "过门评审", labelEn: "Gate Review", icon: "Shield", action: "passGate", shortcut: "ctrl+g" },
      { id: "gantt-view", label: "甘特图", labelEn: "Gantt Chart", icon: "GanttChart", action: "showGantt" },
      { id: "risk-matrix", label: "风险矩阵", labelEn: "Risk Matrix", icon: "AlertTriangle", action: "showRiskMatrix" },
      { id: "resource-alloc", label: "资源分配", labelEn: "Resource Allocation", icon: "Users", action: "allocateResources" },
      { id: "milestone-track", label: "里程碑追踪", labelEn: "Milestone Tracker", icon: "Milestone", action: "trackMilestones" },
    ],
    fileImports: [
      { accept: ".xlsx,.mpp,.csv", label: "导入项目计划", labelEn: "Import project plan", targetTable: "project_tasks" },
      { accept: ".xlsx", label: "导入WBS", labelEn: "Import WBS", targetTable: "project_wbs" },
    ],
    shortcuts: [
      { key: "ctrl+g", label: "过门评审", labelEn: "Pass gate" },
      { key: "ctrl+m", label: "里程碑视图", labelEn: "Milestone view" },
      { key: "ctrl+shift+r", label: "风险登记", labelEn: "Risk register" },
    ],
  },

  // ──────────────────────────────────────────────────
  // ⑥ Quoting & BOM (智能报价与BOM)
  // ──────────────────────────────────────────────────
  "quoting-bom": {
    id: "quoting-bom",
    num: "⑥",
    name: "智能报价与BOM梳理",
    nameEn: "Smart Quoting & BOM",
    io: {
      inputs: [
        { sandboxId: "customer-config", sandboxName: "⑨ 客户档案", dataType: "Customer profile", description: "客户技术要求与价格策略", descriptionEn: "Customer tech requirements & pricing strategy" },
        { sandboxId: "mechanical-standards", sandboxName: "⑦ 机械标准", dataType: "Standard configs", description: "标准件库与配置", descriptionEn: "Standard component library & configs", eventName: "MECH_CONFIG_VALIDATED" },
        { sandboxId: "production-scheduling", sandboxName: "⑪ 排产与报工", dataType: "Historical costs", description: "历史工时成本基准", descriptionEn: "Historical labor cost benchmarks" },
      ],
      outputs: [
        { sandboxId: "project-lifecycle", sandboxName: "⑤ 项目M0-M12", dataType: "Awarded quote", description: "中标→自动立项", descriptionEn: "Award → auto project initiation", eventName: "BOM_FINALIZED" },
        { sandboxId: "production-scheduling", sandboxName: "⑪ 排产与报工", dataType: "BOM work hours", description: "BOM工时分解输入排产", descriptionEn: "BOM work hours feed scheduling" },
        { sandboxId: "customer-config", sandboxName: "⑨ 客户档案", dataType: "Quote history", description: "报价历史更新客户档案", descriptionEn: "Quote history updates customer profile" },
      ],
    },
    m365: [
      { service: "outlook", label: "发送报价单", labelEn: "Send quotation", description: "PDF报价单邮件发送给客户", action: "sendMail" },
      { service: "sharepoint", label: "报价文档库", labelEn: "Quote doc library", description: "归档报价单与BOM版本", action: "syncProjectFolders" },
      { service: "onedrive", label: "BOM模板同步", labelEn: "BOM template sync", description: "BOM Excel模板云端同步", action: "syncToOneDrive" },
      { service: "teams", label: "报价审批通知", labelEn: "Quote approval alerts", description: "报价审批流程通知", action: "sendTeamsMessage" },
      { service: "planner", label: "报价跟踪", labelEn: "Quote follow-up", description: "创建报价跟进任务", action: "createTask" },
    ],
    tools: [
      { id: "quote-gen", label: "生成报价", labelEn: "Generate Quote", icon: "FileSpreadsheet", action: "generateQuote", shortcut: "ctrl+q" },
      { id: "bom-explode", label: "BOM展开", labelEn: "BOM Explode", icon: "Network", action: "explodeBom" },
      { id: "cost-compare", label: "成本对比", labelEn: "Cost Compare", icon: "BarChart3", action: "compareCosts" },
      { id: "rag-search", label: "RAG知识搜索", labelEn: "RAG Knowledge Search", icon: "Brain", action: "ragSearch" },
    ],
    fileImports: [
      { accept: ".xlsx,.csv", label: "导入BOM树", labelEn: "Import BOM tree", targetTable: "bom_items" },
      { accept: ".xlsx", label: "导入物料价格", labelEn: "Import material prices", targetTable: "material_costs" },
    ],
    shortcuts: [
      { key: "ctrl+q", label: "生成报价", labelEn: "Generate quote" },
      { key: "ctrl+shift+b", label: "BOM展开", labelEn: "Explode BOM" },
      { key: "ctrl+f", label: "RAG搜索", labelEn: "RAG search" },
    ],
  },

  // ──────────────────────────────────────────────────
  // ⑦ Mechanical Standards (机械标准治理)
  // ──────────────────────────────────────────────────
  "mechanical-standards": {
    id: "mechanical-standards",
    num: "⑦",
    name: "机械标准治理",
    nameEn: "Mechanical Standards Governance",
    io: {
      inputs: [
        { sandboxId: "project-lifecycle", sandboxName: "⑤ 项目M0-M12", dataType: "Design baseline", description: "设计基线冻结触发标准校验", descriptionEn: "Design baseline freeze triggers standard validation" },
        { sandboxId: "ai-process-twin", sandboxName: "⑬ AI工艺孪生", dataType: "Process requirements", description: "工艺参数要求反馈", descriptionEn: "Process parameter requirements feedback" },
      ],
      outputs: [
        { sandboxId: "quoting-bom", sandboxName: "⑥ 报价与BOM", dataType: "Standard configs", description: "标准件配置库", descriptionEn: "Standard component config library", eventName: "MECH_CONFIG_VALIDATED" },
        { sandboxId: "electrical-standards", sandboxName: "⑧ 电气规范", dataType: "Mechanical specs", description: "机械接口规格", descriptionEn: "Mechanical interface specifications" },
        { sandboxId: "production-scheduling", sandboxName: "⑪ 排产与报工", dataType: "Process routing", description: "工艺路线定义", descriptionEn: "Process routing definitions" },
      ],
    },
    m365: [
      { service: "sharepoint", label: "标准文档库", labelEn: "Standards doc library", description: "GB/ISO/企标文档管理", action: "listFiles" },
      { service: "teams", label: "ECO变更通知", labelEn: "ECO change alerts", description: "工程变更通知相关团队", action: "sendTeamsMessage" },
      { service: "onenote", label: "评审记录", labelEn: "Review records", description: "标准评审会议记录", action: "createPage" },
      { service: "onedrive", label: "CAD图纸同步", labelEn: "CAD drawing sync", description: "图纸版本同步到OneDrive", action: "syncToOneDrive" },
    ],
    tools: [
      { id: "validate-config", label: "校验配置", labelEn: "Validate Config", icon: "CheckCircle", action: "validateConfig", shortcut: "ctrl+v" },
      { id: "conflict-detect", label: "冲突检测", labelEn: "Conflict Detection", icon: "AlertTriangle", action: "detectConflicts" },
      { id: "version-compare", label: "版本对比", labelEn: "Version Compare", icon: "GitCompare", action: "compareVersions" },
      { id: "eco-create", label: "创建ECO", labelEn: "Create ECO", icon: "FileEdit", action: "createEco" },
    ],
    fileImports: [
      { accept: ".csv,.xlsx", label: "导入配置库", labelEn: "Import config library", targetTable: "mech_configs" },
      { accept: ".csv", label: "导入标准清单", labelEn: "Import standards list", targetTable: "mech_standards" },
    ],
    shortcuts: [
      { key: "ctrl+v", label: "校验配置", labelEn: "Validate config" },
      { key: "ctrl+shift+e", label: "创建ECO", labelEn: "Create ECO" },
      { key: "ctrl+shift+d", label: "冲突检测", labelEn: "Detect conflicts" },
    ],
  },

  // ──────────────────────────────────────────────────
  // ⑧ Electrical Standards (电气规范治理)
  // ──────────────────────────────────────────────────
  "electrical-standards": {
    id: "electrical-standards",
    num: "⑧",
    name: "电气规范治理",
    nameEn: "Electrical Standards Governance",
    io: {
      inputs: [
        { sandboxId: "project-lifecycle", sandboxName: "⑤ 项目M0-M12", dataType: "Electrical spec", description: "项目电气规格要求", descriptionEn: "Project electrical spec requirements" },
        { sandboxId: "mechanical-standards", sandboxName: "⑦ 机械标准", dataType: "Mechanical specs", description: "机械接口规格(电气适配)", descriptionEn: "Mechanical interface specs for electrical adaptation" },
      ],
      outputs: [
        { sandboxId: "production-scheduling", sandboxName: "⑪ 排产与报工", dataType: "IO point list", description: "IO点表与PLC程序规格", descriptionEn: "IO point list & PLC program specs", eventName: "ELEC_CONFIG_VALIDATED" },
        { sandboxId: "site-delivery", sandboxName: "⑪ 现场交付", dataType: "Wiring diagram", description: "接线图与调试手册", descriptionEn: "Wiring diagrams & commissioning manual" },
        { sandboxId: "ai-process-twin", sandboxName: "⑬ AI工艺孪生", dataType: "PLC parameters", description: "PLC参数模板", descriptionEn: "PLC parameter templates" },
      ],
    },
    m365: [
      { service: "sharepoint", label: "电气文档库", labelEn: "Electrical doc library", description: "电气图纸与标准文档", action: "listFiles" },
      { service: "teams", label: "电气变更通知", labelEn: "Electrical change alerts", description: "电气变更通知到Teams", action: "sendTeamsMessage" },
      { service: "onedrive", label: "PLC程序同步", labelEn: "PLC program sync", description: "PLC程序版本同步", action: "syncToOneDrive" },
      { service: "onenote", label: "调试笔记", labelEn: "Commissioning notes", description: "电气调试过程记录", action: "createPage" },
    ],
    tools: [
      { id: "io-validate", label: "IO点校验", labelEn: "IO Point Validation", icon: "Cpu", action: "validateIO" },
      { id: "plc-gen", label: "PLC模板生成", labelEn: "PLC Template Gen", icon: "Code", action: "generatePlcTemplate" },
      { id: "circuit-check", label: "回路检查", labelEn: "Circuit Check", icon: "Zap", action: "checkCircuit" },
    ],
    fileImports: [
      { accept: ".csv,.xlsx", label: "导入IO点表", labelEn: "Import IO point list", targetTable: "elec_io_points" },
      { accept: ".csv", label: "导入PLC配置", labelEn: "Import PLC config", targetTable: "elec_plc_config" },
    ],
    shortcuts: [
      { key: "ctrl+i", label: "IO点校验", labelEn: "IO point validation" },
      { key: "ctrl+shift+p", label: "PLC模板", labelEn: "PLC template" },
    ],
  },

  // ──────────────────────────────────────────────────
  // ⑨ Customer Config (VIP战略客户档案)
  // ──────────────────────────────────────────────────
  "customer-config": {
    id: "customer-config",
    num: "⑨",
    name: "VIP战略客户档案",
    nameEn: "VIP Strategic Customer Profiles",
    io: {
      inputs: [
        { sandboxId: "acceptance-tracking", sandboxName: "⑩ 验收追踪", dataType: "Satisfaction data", description: "客户满意度评分反馈", descriptionEn: "Customer satisfaction scores feedback", eventName: "ACCEPTANCE_COMPLETED" },
        { sandboxId: "quoting-bom", sandboxName: "⑥ 报价与BOM", dataType: "Quote history", description: "历史报价记录", descriptionEn: "Historical quote records" },
      ],
      outputs: [
        { sandboxId: "quoting-bom", sandboxName: "⑥ 报价与BOM", dataType: "Customer profile", description: "客户偏好与定价策略", descriptionEn: "Customer preferences & pricing strategy", eventName: "CUSTOMER_PROFILE_UPDATED" },
        { sandboxId: "project-lifecycle", sandboxName: "⑤ 项目M0-M12", dataType: "Customer requirements", description: "客户技术要求模板", descriptionEn: "Customer technical requirement templates" },
        { sandboxId: "site-delivery", sandboxName: "⑪ 现场交付", dataType: "Contact info", description: "客户现场联系人信息", descriptionEn: "Customer site contact information" },
      ],
    },
    m365: [
      { service: "outlook", label: "客户沟通邮件", labelEn: "Customer communication", description: "客户关系维护邮件", action: "sendMail" },
      { service: "teams", label: "客户专属频道", labelEn: "Customer channels", description: "VIP客户专属Teams频道", action: "sendTeamsMessage" },
      { service: "planner", label: "客户跟进任务", labelEn: "Customer follow-up", description: "客户拜访与跟进计划", action: "createTask" },
      { service: "onenote", label: "客户拜访笔记", labelEn: "Visit notes", description: "客户拜访记录与洞察", action: "createPage" },
      { service: "sharepoint", label: "客户文档库", labelEn: "Customer doc library", description: "客户合同与技术文档", action: "listFiles" },
    ],
    tools: [
      { id: "new-profile", label: "新建档案", labelEn: "New Profile", icon: "UserPlus", action: "createProfile", shortcut: "ctrl+p" },
      { id: "tier-analysis", label: "分级分析", labelEn: "Tier Analysis", icon: "TrendingUp", action: "analyzeTier" },
      { id: "reading-channel", label: "阅读通道", labelEn: "Reading Channel", icon: "BookOpen", action: "openReadingChannel" },
      { id: "brand-dna", label: "品牌基因", labelEn: "Brand DNA", icon: "Palette", action: "editBrandDna" },
    ],
    fileImports: [
      { accept: ".csv,.xlsx", label: "批量导入客户档案", labelEn: "Batch import customer profiles", targetTable: "customer_profiles" },
      { accept: ".csv", label: "导入联系人", labelEn: "Import contacts", targetTable: "customer_contacts" },
    ],
    shortcuts: [
      { key: "ctrl+p", label: "新建档案", labelEn: "New profile" },
      { key: "ctrl+t", label: "分级分析", labelEn: "Tier analysis" },
      { key: "ctrl+shift+r", label: "阅读通道", labelEn: "Reading channel" },
    ],
  },

  // ──────────────────────────────────────────────────
  // ⑩ Acceptance Tracking (验收追踪与满意度)
  // ──────────────────────────────────────────────────
  "acceptance-tracking": {
    id: "acceptance-tracking",
    num: "⑩",
    name: "验收追踪与满意度",
    nameEn: "Acceptance Tracking & Satisfaction",
    io: {
      inputs: [
        { sandboxId: "project-lifecycle", sandboxName: "⑤ 项目M0-M12", dataType: "Project completion", description: "项目完工信号", descriptionEn: "Project completion signal" },
        { sandboxId: "site-delivery", sandboxName: "⑪ 现场交付", dataType: "Commissioning report", description: "调试完成报告", descriptionEn: "Commissioning completion report" },
        { sandboxId: "production-scheduling", sandboxName: "⑪ 排产与报工", dataType: "Quality records", description: "生产质量检测记录", descriptionEn: "Production quality inspection records" },
      ],
      outputs: [
        { sandboxId: "customer-config", sandboxName: "⑨ 客户档案", dataType: "Satisfaction data", description: "满意度评分更新客户档案", descriptionEn: "Satisfaction scores update customer profile", eventName: "ACCEPTANCE_COMPLETED" },
        { sandboxId: "annual-planning", sandboxName: "① 年度规划", dataType: "Revenue recognition", description: "验收确认→收入确认", descriptionEn: "Acceptance confirmed → revenue recognized" },
        { sandboxId: "performance-points", sandboxName: "③ 绩效与积分", dataType: "Project scores", description: "项目验收评分→绩效", descriptionEn: "Project acceptance scores → performance" },
      ],
    },
    m365: [
      { service: "outlook", label: "验收通知", labelEn: "Acceptance notifications", description: "发送FAT/SAT验收通知", action: "sendMail" },
      { service: "teams", label: "验收进度推送", labelEn: "Acceptance progress", description: "推送验收节点到项目Teams频道", action: "sendTeamsMessage" },
      { service: "sharepoint", label: "验收文档库", labelEn: "Acceptance doc library", description: "验收报告与签字文件", action: "listFiles" },
      { service: "onedrive", label: "证据归档", labelEn: "Evidence archive", description: "验收证据材料归档", action: "syncToOneDrive" },
      { service: "planner", label: "整改任务", labelEn: "Rectification tasks", description: "验收整改项任务跟踪", action: "createTask" },
    ],
    tools: [
      { id: "fat-checklist", label: "FAT清单", labelEn: "FAT Checklist", icon: "ClipboardCheck", action: "openFatChecklist" },
      { id: "sat-checklist", label: "SAT清单", labelEn: "SAT Checklist", icon: "ClipboardList", action: "openSatChecklist" },
      { id: "satisfaction-survey", label: "满意度调查", labelEn: "Satisfaction Survey", icon: "Heart", action: "openSurvey" },
      { id: "evidence-vault", label: "证据库", labelEn: "Evidence Vault", icon: "Archive", action: "openEvidenceVault" },
    ],
    fileImports: [
      { accept: ".xlsx,.csv", label: "导入验收清单", labelEn: "Import acceptance checklist", targetTable: "acceptance_items" },
      { accept: ".pdf,.jpg,.png", label: "上传验收证据", labelEn: "Upload acceptance evidence", targetTable: "acceptance_evidence" },
    ],
    shortcuts: [
      { key: "ctrl+shift+f", label: "FAT清单", labelEn: "FAT checklist" },
      { key: "ctrl+shift+s", label: "SAT清单", labelEn: "SAT checklist" },
      { key: "ctrl+shift+v", label: "证据库", labelEn: "Evidence vault" },
    ],
  },

  // ──────────────────────────────────────────────────
  // ⑪ Site Delivery (现场交付)
  // ──────────────────────────────────────────────────
  "site-delivery": {
    id: "site-delivery",
    num: "⑪",
    name: "现场交付与调试",
    nameEn: "Site Delivery & Commissioning",
    io: {
      inputs: [
        { sandboxId: "project-lifecycle", sandboxName: "⑤ 项目M0-M12", dataType: "Delivery plan", description: "现场交付计划与时间表", descriptionEn: "Site delivery plan & schedule" },
        { sandboxId: "electrical-standards", sandboxName: "⑧ 电气规范", dataType: "Wiring diagrams", description: "接线图与调试手册", descriptionEn: "Wiring diagrams & commissioning manual" },
        { sandboxId: "customer-config", sandboxName: "⑨ 客户档案", dataType: "Site contacts", description: "客户现场联系人", descriptionEn: "Customer site contacts" },
        { sandboxId: "production-scheduling", sandboxName: "⑪ 排产与报工", dataType: "Shipping manifest", description: "发货清单与装箱信息", descriptionEn: "Shipping manifest & packing info" },
      ],
      outputs: [
        { sandboxId: "acceptance-tracking", sandboxName: "⑩ 验收追踪", dataType: "Commissioning report", description: "调试完成→验收启动", descriptionEn: "Commissioning done → acceptance start" },
        { sandboxId: "customer-config", sandboxName: "⑨ 客户档案", dataType: "Site feedback", description: "现场反馈更新档案", descriptionEn: "Site feedback updates customer profile" },
      ],
    },
    m365: [
      { service: "teams", label: "现场指挥频道", labelEn: "Site command channel", description: "双时区现场指挥通讯", action: "sendTeamsMessage" },
      { service: "outlook", label: "进场通知", labelEn: "Site entry notice", description: "发送进场协调邮件", action: "sendMail" },
      { service: "planner", label: "调试任务看板", labelEn: "Commissioning task board", description: "调试阶段任务追踪", action: "createTask" },
      { service: "onenote", label: "现场日志", labelEn: "Site journal", description: "每日现场工作日志", action: "createPage" },
      { service: "sharepoint", label: "调试文档", labelEn: "Commissioning docs", description: "调试报告与黑匣子记录", action: "syncProjectFolders" },
      { service: "onedrive", label: "现场照片同步", labelEn: "Site photo sync", description: "现场照片实时同步", action: "syncToOneDrive" },
    ],
    tools: [
      { id: "pre-site-check", label: "进场检查", labelEn: "Pre-Site Check", icon: "ClipboardCheck", action: "preSiteCheck" },
      { id: "commissioning", label: "联调控制", labelEn: "Commissioning Control", icon: "Settings", action: "startCommissioning" },
      { id: "black-box", label: "黑匣子记录", labelEn: "Black Box Log", icon: "HardDrive", action: "openBlackBox" },
      { id: "handoff", label: "交钥匙移交", labelEn: "Turnkey Handoff", icon: "Key", action: "startHandoff" },
    ],
    fileImports: [
      { accept: ".xlsx,.csv", label: "导入调试清单", labelEn: "Import commissioning checklist", targetTable: "commissioning_items" },
      { accept: ".jpg,.png,.pdf", label: "上传现场照片", labelEn: "Upload site photos", targetTable: "site_evidence" },
    ],
    shortcuts: [
      { key: "ctrl+shift+c", label: "联调控制", labelEn: "Commissioning control" },
      { key: "ctrl+shift+b", label: "黑匣子", labelEn: "Black box" },
      { key: "ctrl+shift+h", label: "交钥匙", labelEn: "Turnkey handoff" },
    ],
  },

  // ──────────────────────────────────────────────────
  // ⑫ Production Scheduling (排产与报工)
  // ──────────────────────────────────────────────────
  "production-scheduling": {
    id: "production-scheduling",
    num: "⑫",
    name: "排产控制台与报工追踪",
    nameEn: "Production Scheduling & Labor Tracking",
    io: {
      inputs: [
        { sandboxId: "project-lifecycle", sandboxName: "⑤ 项目M0-M12", dataType: "Production order", description: "项目生产工单", descriptionEn: "Project production orders", eventName: "PROJECT_GATE_PASSED" },
        { sandboxId: "quoting-bom", sandboxName: "⑥ 报价与BOM", dataType: "BOM work hours", description: "BOM工时分解", descriptionEn: "BOM work hours breakdown" },
        { sandboxId: "mechanical-standards", sandboxName: "⑦ 机械标准", dataType: "Process routing", description: "工艺路线(T1-T15)", descriptionEn: "Process routing (T1-T15)" },
        { sandboxId: "electrical-standards", sandboxName: "⑧ 电气规范", dataType: "IO specs", description: "电气IO规格", descriptionEn: "Electrical IO specifications", eventName: "ELEC_CONFIG_VALIDATED" },
      ],
      outputs: [
        { sandboxId: "payroll-attendance", sandboxName: "② 薪酬与打卡", dataType: "Labor hours", description: "实际工时→工资计算", descriptionEn: "Actual hours → payroll calculation", eventName: "LABOR_REPORT_APPROVED" },
        { sandboxId: "performance-points", sandboxName: "③ 绩效与积分", dataType: "Productivity data", description: "生产效率数据→绩效", descriptionEn: "Productivity data → performance" },
        { sandboxId: "acceptance-tracking", sandboxName: "⑩ 验收追踪", dataType: "Quality records", description: "质量检测记录", descriptionEn: "Quality inspection records" },
        { sandboxId: "site-delivery", sandboxName: "⑪ 现场交付", dataType: "Shipping manifest", description: "发货清单", descriptionEn: "Shipping manifest", eventName: "SCHEDULING_PLAN_PUBLISHED" },
        { sandboxId: "ai-process-twin", sandboxName: "⑬ AI工艺孪生", dataType: "Actual vs planned", description: "实际vs计划工时偏差", descriptionEn: "Actual vs planned hours variance" },
      ],
    },
    m365: [
      { service: "teams", label: "车间通知", labelEn: "Shop floor alerts", description: "排产变更通知到车间Teams", action: "sendTeamsMessage" },
      { service: "planner", label: "生产任务看板", labelEn: "Production task board", description: "工单任务分配到Planner", action: "createTask" },
      { service: "outlook", label: "排产报表", labelEn: "Scheduling reports", description: "每周排产报表邮件", action: "sendMail" },
      { service: "sharepoint", label: "工艺文档库", labelEn: "Process doc library", description: "SOP/作业指导书管理", action: "listFiles" },
      { service: "onenote", label: "生产日志", labelEn: "Production journal", description: "每日生产问题记录", action: "createPage" },
      { service: "onedrive", label: "报工模板同步", labelEn: "Labor template sync", description: "工时报告模板云端同步", action: "syncToOneDrive" },
    ],
    tools: [
      { id: "labor-submit", label: "提交报工", labelEn: "Submit Labor Report", icon: "Clock", action: "submitLabor", shortcut: "ctrl+shift+w" },
      { id: "schedule-gen", label: "智能排程", labelEn: "Smart Scheduling", icon: "CalendarClock", action: "generateSchedule" },
      { id: "capacity-view", label: "产能视图", labelEn: "Capacity View", icon: "BarChart3", action: "showCapacity" },
      { id: "bottleneck", label: "瓶颈分析", labelEn: "Bottleneck Analysis", icon: "AlertTriangle", action: "analyzeBottleneck" },
    ],
    fileImports: [
      { accept: ".csv,.xlsx", label: "导入工时数据", labelEn: "Import labor hours", targetTable: "work_logs" },
      { accept: ".xlsx", label: "导入排产计划", labelEn: "Import production schedule", targetTable: "scheduling_plans" },
      { accept: ".csv", label: "导入物料需求", labelEn: "Import material requirements", targetTable: "material_requirements" },
    ],
    shortcuts: [
      { key: "ctrl+shift+w", label: "提交报工", labelEn: "Submit labor report" },
      { key: "ctrl+shift+s", label: "智能排程", labelEn: "Smart scheduling" },
      { key: "ctrl+shift+c", label: "产能视图", labelEn: "Capacity view" },
    ],
  },

  // ──────────────────────────────────────────────────
  // ⑬ AI Process Twin (AI工艺编排与孪生)
  // ──────────────────────────────────────────────────
  "ai-process-twin": {
    id: "ai-process-twin",
    num: "⑬",
    name: "AI工艺编排与孪生",
    nameEn: "AI Process Orchestration & Digital Twin",
    io: {
      inputs: [
        { sandboxId: "mechanical-standards", sandboxName: "⑦ 机械标准", dataType: "Process definitions", description: "工艺参数与标准配置", descriptionEn: "Process parameters & standard configs" },
        { sandboxId: "electrical-standards", sandboxName: "⑧ 电气规范", dataType: "PLC parameters", description: "PLC参数模板", descriptionEn: "PLC parameter templates" },
        { sandboxId: "production-scheduling", sandboxName: "⑪ 排产与报工", dataType: "Actual vs planned", description: "实际偏差数据驱动优化", descriptionEn: "Actual variance data drives optimization" },
        { sandboxId: "quoting-bom", sandboxName: "⑥ 报价与BOM", dataType: "BOM structure", description: "BOM结构用于工序绑定", descriptionEn: "BOM structure for process binding" },
      ],
      outputs: [
        { sandboxId: "mechanical-standards", sandboxName: "⑦ 机械标准", dataType: "Process requirements", description: "工艺参数要求反馈", descriptionEn: "Process parameter requirements feedback" },
        { sandboxId: "production-scheduling", sandboxName: "⑪ 排产与报工", dataType: "Optimized routing", description: "AI优化工艺路线", descriptionEn: "AI-optimized process routing" },
        { sandboxId: "site-delivery", sandboxName: "⑪ 现场交付", dataType: "SOP packages", description: "SOP作业包推送现场", descriptionEn: "SOP work packages pushed to site" },
      ],
    },
    m365: [
      { service: "onenote", label: "FMEA笔记本", labelEn: "FMEA notebook", description: "FMEA风险分析记录", action: "createPage" },
      { service: "teams", label: "工艺变更通知", labelEn: "Process change alerts", description: "SOP更新通知到Teams", action: "sendTeamsMessage" },
      { service: "sharepoint", label: "工艺文档库", labelEn: "Process doc library", description: "SOP/FMEA/作业指导书", action: "syncProjectFolders" },
      { service: "onedrive", label: "孪生模型同步", labelEn: "Twin model sync", description: "数字孪生模型文件同步", action: "syncToOneDrive" },
      { service: "planner", label: "工艺改进任务", labelEn: "Process improvement tasks", description: "FMEA改进项任务追踪", action: "createTask" },
    ],
    tools: [
      { id: "fmea-scan", label: "FMEA扫描", labelEn: "FMEA Scan", icon: "Shield", action: "scanFmea" },
      { id: "sop-generate", label: "AI生成SOP", labelEn: "AI Generate SOP", icon: "Brain", action: "generateSop" },
      { id: "twin-simulate", label: "孪生仿真", labelEn: "Twin Simulation", icon: "Cpu", action: "simulateTwin" },
      { id: "shop-floor-push", label: "车间大屏推送", labelEn: "Shop Floor Push", icon: "Monitor", action: "pushToShopFloor" },
    ],
    fileImports: [
      { accept: ".json,.csv", label: "导入FMEA数据", labelEn: "Import FMEA data", targetTable: "fmea_items" },
      { accept: ".xlsx", label: "导入SOP模板", labelEn: "Import SOP template", targetTable: "sop_templates" },
      { accept: ".json", label: "导入工艺参数", labelEn: "Import process parameters", targetTable: "process_params" },
    ],
    shortcuts: [
      { key: "ctrl+shift+f", label: "FMEA扫描", labelEn: "FMEA scan" },
      { key: "ctrl+shift+g", label: "AI生成SOP", labelEn: "AI generate SOP" },
      { key: "ctrl+shift+t", label: "孪生仿真", labelEn: "Twin simulation" },
    ],
  },
};

// ── Helper: get config by sandbox ID ──
export function getSandboxIOConfig(sandboxId: string): SandboxEnhancedConfig | undefined {
  return SANDBOX_IO_CONFIG[sandboxId];
}

// ── Helper: get all upstream sandboxes for a given sandbox ──
export function getUpstreamSandboxes(sandboxId: string): SandboxDataFlow[] {
  return SANDBOX_IO_CONFIG[sandboxId]?.io.inputs ?? [];
}

// ── Helper: get all downstream sandboxes for a given sandbox ──
export function getDownstreamSandboxes(sandboxId: string): SandboxDataFlow[] {
  return SANDBOX_IO_CONFIG[sandboxId]?.io.outputs ?? [];
}

// ── M365 service labels ──
export const M365_SERVICE_LABELS: Record<M365Service, { label: string; labelEn: string; icon: string; color: string }> = {
  outlook: { label: "Outlook", labelEn: "Outlook", icon: "Mail", color: "#0078D4" },
  teams: { label: "Teams", labelEn: "Teams", icon: "MessageSquare", color: "#6264A7" },
  planner: { label: "Planner", labelEn: "Planner", icon: "KanbanSquare", color: "#31752F" },
  onenote: { label: "OneNote", labelEn: "OneNote", icon: "BookOpen", color: "#7719AA" },
  onedrive: { label: "OneDrive", labelEn: "OneDrive", icon: "Cloud", color: "#0078D4" },
  sharepoint: { label: "SharePoint", labelEn: "SharePoint", icon: "Database", color: "#038387" },
};
