/**
 * Menu Module Configuration — 全因后果 · 逻辑继承 · 输入输出 · 可选 · 整合包
 *
 * Every menu group gets:
 *   - causeEffect:  为什么存在 / 不存在会怎样 (Root Cause & Consequence)
 *   - inheritance:  逻辑继承链 (Parent → Self → Children)
 *   - inputs:       输入数据流 (What feeds IN)
 *   - outputs:      输出数据流 (What flows OUT)
 *   - optional:     可选功能 (Toggleable features)
 *   - integrations: 整合包 (M365, ERP, external)
 */

// ── Types ──

export interface ModuleDataFlow {
  source: string;      // Module/system name
  dataType: string;    // What data
  description: string; // Chinese description
  descriptionEn: string;
  event?: string;      // Event bus event name if applicable
}

export interface ModuleIntegration {
  system: string;      // e.g. "Outlook", "Teams", "ERP", "DingTalk"
  type: "m365" | "erp" | "iot" | "ai" | "external";
  label: string;
  labelEn: string;
  actions: string[];   // Specific operations
  color: string;       // Brand hex
}

export interface ModuleOptionalFeature {
  id: string;
  label: string;
  labelEn: string;
  defaultOn: boolean;
  description: string;
}

export interface MenuModuleConfig {
  /** Menu group key — matches menuConfig group name */
  groupName: string;
  groupNameEn: string;
  /** Emoji icon for quick identification */
  emoji: string;
  /** 全因后果: Why this module exists */
  causeEffect: {
    rootCause: string;       // 根因 — 为什么需要
    rootCauseEn: string;
    consequence: string;     // 后果 — 缺失会怎样
    consequenceEn: string;
    businessValue: string;   // 业务价值
    businessValueEn: string;
  };
  /** 逻辑继承: upstream parent → self → downstream children */
  inheritance: {
    parents: { name: string; nameEn: string; relationship: string }[];
    children: { name: string; nameEn: string; relationship: string }[];
  };
  /** 输入数据流 */
  inputs: ModuleDataFlow[];
  /** 输出数据流 */
  outputs: ModuleDataFlow[];
  /** 可选功能 */
  optional: ModuleOptionalFeature[];
  /** 整合包 */
  integrations: ModuleIntegration[];
  /** 模块健康指标 */
  metrics: { label: string; value: string; color: string }[];
}

// ══════════════════════════════════════════════════════════════
// ALL 15 MODULE CONFIGURATIONS
// ══════════════════════════════════════════════════════════════

export const MODULE_CONFIGS: Record<string, MenuModuleConfig> = {

  // ──────────────────────────────────────────
  // ① 工作台 (Workspace / Portal)
  // ──────────────────────────────────────────
  "工作台": {
    groupName: "工作台",
    groupNameEn: "Workspace",
    emoji: "🏠",
    causeEffect: {
      rootCause: "员工需要统一入口访问所有系统功能，消除信息孤岛",
      rootCauseEn: "Employees need a unified portal to access all system functions, eliminating information silos",
      consequence: "无法形成统一工作入口，员工在多系统间切换效率低下，信息分散无法聚合",
      consequenceEn: "No unified work entry point, employees waste time switching between systems, information scattered",
      businessValue: "提升人均效率30%+，减少系统切换时间，统一决策数据源",
      businessValueEn: "Improve per-capita efficiency 30%+, reduce system switching time, unify decision data source",
    },
    inheritance: {
      parents: [
        { name: "用户认证系统", nameEn: "Authentication System", relationship: "身份验证与权限" },
        { name: "角色权限矩阵", nameEn: "RBAC Matrix", relationship: "18角色×280权限" },
      ],
      children: [
        { name: "市场与销售", nameEn: "Sales & Marketing", relationship: "销售人员工作台入口" },
        { name: "项目管理", nameEn: "Project Management", relationship: "项目经理驾驶舱" },
        { name: "生产制造", nameEn: "Manufacturing", relationship: "车间看板入口" },
        { name: "人力资源", nameEn: "Human Resources", relationship: "HR自助服务入口" },
        { name: "AI助手", nameEn: "AI Intelligence", relationship: "AI画布Ctrl+/入口" },
      ],
    },
    inputs: [
      { source: "人力资源", dataType: "员工档案", description: "员工个人信息与角色", descriptionEn: "Employee profile & role", event: "HR_EMPLOYEE_ONBOARDED" },
      { source: "项目管理", dataType: "任务列表", description: "我的待办任务", descriptionEn: "My pending tasks" },
      { source: "AI助手", dataType: "AI推荐", description: "智能推荐与提醒", descriptionEn: "AI recommendations & reminders" },
      { source: "Microsoft 365", dataType: "日历/邮件", description: "Outlook日历与Teams消息", descriptionEn: "Outlook calendar & Teams messages" },
    ],
    outputs: [
      { source: "工作台", dataType: "用户偏好", description: "语言/BU/主题/布局设置", descriptionEn: "Language/BU/theme/layout preferences" },
      { source: "工作台", dataType: "导航记录", description: "用户行为数据驱动菜单优化", descriptionEn: "User behavior data drives menu optimization" },
      { source: "工作台", dataType: "快捷操作", description: "审批/签到/日报等快捷入口", descriptionEn: "Approval/check-in/daily report quick entries" },
    ],
    optional: [
      { id: "ai-canvas", label: "AI画布", labelEn: "AI Canvas", defaultOn: true, description: "Alt+A唤起AI辅助" },
      { id: "copilot-bar", label: "Copilot栏", labelEn: "Copilot Bar", defaultOn: true, description: "Ctrl+/唤起Copilot" },
      { id: "dark-mode", label: "暗色模式", labelEn: "Dark Mode", defaultOn: false, description: "工业暗黑主题" },
      { id: "mobile-bottom-nav", label: "移动底部导航", labelEn: "Mobile Bottom Nav", defaultOn: true, description: "移动端五宫格" },
      { id: "waffle-menu", label: "华夫饼菜单", labelEn: "Waffle Menu", defaultOn: true, description: "O365风格应用网格" },
    ],
    integrations: [
      { system: "Outlook", type: "m365", label: "企业邮箱", labelEn: "Enterprise Mail", actions: ["getInbox", "sendMail", "getUnreadCount"], color: "#0078D4" },
      { system: "Teams", type: "m365", label: "即时通讯", labelEn: "Instant Messaging", actions: ["getChats", "sendTeamsMessage"], color: "#6264A7" },
      { system: "Calendar", type: "m365", label: "日程管理", labelEn: "Calendar", actions: ["getTodayEvents", "createEvent"], color: "#0078D4" },
      { system: "Planner", type: "m365", label: "任务看板", labelEn: "Task Board", actions: ["getTasks", "createTask"], color: "#31752F" },
    ],
    metrics: [
      { label: "菜单项", value: "32", color: "#3B82F6" },
      { label: "子组", value: "4", color: "#8B5CF6" },
      { label: "驾驶舱", value: "8", color: "#06B6D4" },
      { label: "大屏", value: "5", color: "#F59E0B" },
    ],
  },

  // ──────────────────────────────────────────
  // ② 市场与销售 (Sales & Marketing)
  // ──────────────────────────────────────────
  "市场与销售": {
    groupName: "市场与销售",
    groupNameEn: "Sales & Marketing",
    emoji: "💼",
    causeEffect: {
      rootCause: "企业需要系统化管理从线索到成交的全销售漏斗，实现收入可预测",
      rootCauseEn: "Enterprise needs systematic management of the full sales funnel from lead to close, enabling predictable revenue",
      consequence: "销售过程不透明，报价随意，客户跟进无序，收入无法预测",
      consequenceEn: "Opaque sales process, arbitrary quoting, chaotic customer follow-up, unpredictable revenue",
      businessValue: "缩短销售周期20%，提高报价准确率至95%，客户转化率提升15%",
      businessValueEn: "Shorten sales cycle 20%, improve quote accuracy to 95%, increase conversion rate 15%",
    },
    inheritance: {
      parents: [
        { name: "战略规划", nameEn: "Strategic Planning", relationship: "年度销售目标与市场策略" },
        { name: "工作台", nameEn: "Workspace", relationship: "销售人员入口" },
      ],
      children: [
        { name: "项目管理", nameEn: "Project Management", relationship: "中标→立项" },
        { name: "研发设计", nameEn: "R&D Design", relationship: "客户需求→设计输入" },
        { name: "财务管理", nameEn: "Finance", relationship: "报价→预算→收入确认" },
        { name: "客户服务", nameEn: "Customer Service", relationship: "售前→售后衔接" },
      ],
    },
    inputs: [
      { source: "战略规划", dataType: "销售目标", description: "年度/季度销售目标", descriptionEn: "Annual/quarterly sales targets" },
      { source: "客户服务", dataType: "客户反馈", description: "售后满意度影响复购", descriptionEn: "After-sales satisfaction affects repurchase" },
      { source: "研发设计", dataType: "技术方案", description: "可行性分析与技术方案", descriptionEn: "Feasibility analysis & technical proposals" },
      { source: "生产制造", dataType: "产能信息", description: "交期承诺依据", descriptionEn: "Delivery commitment basis" },
    ],
    outputs: [
      { source: "市场与销售", dataType: "中标通知", description: "中标→项目立项", descriptionEn: "Award → project initiation", event: "BOM_FINALIZED" },
      { source: "市场与销售", dataType: "BOM报价", description: "报价BOM→成本核算", descriptionEn: "Quote BOM → cost calculation" },
      { source: "市场与销售", dataType: "客户档案", description: "客户信息→CRM", descriptionEn: "Customer info → CRM", event: "CUSTOMER_PROFILE_UPDATED" },
      { source: "市场与销售", dataType: "销售预测", description: "Pipeline→财务预测", descriptionEn: "Pipeline → financial forecast" },
    ],
    optional: [
      { id: "ai-quotation", label: "AI智能报价", labelEn: "AI Smart Quoting", defaultOn: true, description: "基于历史成本的AI报价建议" },
      { id: "sales-coach", label: "销售教练", labelEn: "Sales Coach", defaultOn: false, description: "AI驱动的销售技能提升" },
      { id: "churn-predict", label: "客户流失预测", labelEn: "Churn Prediction", defaultOn: false, description: "AI客户流失风险预警" },
      { id: "exhibition-mgmt", label: "展会管理", labelEn: "Exhibition Management", defaultOn: true, description: "参展计划与效果追踪" },
    ],
    integrations: [
      { system: "Outlook", type: "m365", label: "客户邮件", labelEn: "Customer Emails", actions: ["sendMail", "searchMail"], color: "#0078D4" },
      { system: "Teams", type: "m365", label: "销售协同", labelEn: "Sales Collaboration", actions: ["sendTeamsMessage", "getChats"], color: "#6264A7" },
      { system: "Planner", type: "m365", label: "商机跟进", labelEn: "Opportunity Follow-up", actions: ["createTask", "updateProgress"], color: "#31752F" },
      { system: "SharePoint", type: "m365", label: "方案文档", labelEn: "Proposal Documents", actions: ["listFiles", "syncProjectFolders"], color: "#038387" },
      { system: "ERP/天斯", type: "erp", label: "价格同步", labelEn: "Price Sync", actions: ["syncPriceList", "getInventory"], color: "#E74C3C" },
    ],
    metrics: [
      { label: "菜单项", value: "21", color: "#3B82F6" },
      { label: "CRM", value: "5", color: "#EC4899" },
      { label: "AI", value: "3", color: "#F59E0B" },
      { label: "报价", value: "5", color: "#10B981" },
    ],
  },

  // ──────────────────────────────────────────
  // ③ 研发设计 (R&D Design)
  // ──────────────────────────────────────────
  "研发设计": {
    groupName: "研发设计",
    groupNameEn: "R&D Design",
    emoji: "🔬",
    causeEffect: {
      rootCause: "非标自动化行业核心竞争力在于设计能力，需要系统化管理图纸、BOM、PLM全流程",
      rootCauseEn: "Core competitiveness of custom automation lies in design capability, requiring systematic management of drawings, BOM, PLM",
      consequence: "图纸版本混乱，BOM错误导致采购/生产返工，ECO变更失控",
      consequenceEn: "Drawing version chaos, BOM errors cause procurement/production rework, ECO changes out of control",
      businessValue: "设计错误减少60%，BOM准确率提升至99%，ECO变更周期缩短50%",
      businessValueEn: "Design errors reduced 60%, BOM accuracy improved to 99%, ECO change cycle shortened 50%",
    },
    inheritance: {
      parents: [
        { name: "市场与销售", nameEn: "Sales & Marketing", relationship: "客户需求→设计输入" },
        { name: "项目管理", nameEn: "Project Management", relationship: "M0-M3设计阶段管控" },
      ],
      children: [
        { name: "生产制造", nameEn: "Manufacturing", relationship: "图纸+BOM→生产" },
        { name: "供应链管理", nameEn: "Supply Chain", relationship: "BOM→采购清单" },
        { name: "市场与销售", nameEn: "Sales & Marketing", relationship: "技术方案反馈" },
      ],
    },
    inputs: [
      { source: "市场与销售", dataType: "客户需求规格书", description: "技术要求与规格参数", descriptionEn: "Technical requirements & specifications" },
      { source: "项目管理", dataType: "设计里程碑", description: "M0-M3阶段节点", descriptionEn: "M0-M3 phase milestones" },
      { source: "生产制造", dataType: "工艺反馈", description: "可制造性反馈", descriptionEn: "Manufacturability feedback" },
    ],
    outputs: [
      { source: "研发设计", dataType: "图纸包", description: "机械/电气图纸发布", descriptionEn: "Mechanical/electrical drawing release" },
      { source: "研发设计", dataType: "BOM清单", description: "多层BOM树发布", descriptionEn: "Multi-level BOM tree release", event: "BOM_FINALIZED" },
      { source: "研发设计", dataType: "ECO通知", description: "工程变更通知", descriptionEn: "Engineering change notice", event: "MECH_CONFIG_VALIDATED" },
      { source: "研发设计", dataType: "技术文档", description: "设计说明/计算书", descriptionEn: "Design specifications/calculation sheets" },
    ],
    optional: [
      { id: "3d-viewer", label: "3D模型查看", labelEn: "3D Model Viewer", defaultOn: true, description: "在线3D模型预览" },
      { id: "ai-design-review", label: "AI设计审查", labelEn: "AI Design Review", defaultOn: false, description: "AI自动检查设计规范" },
      { id: "bom-excel-import", label: "BOM Excel导入", labelEn: "BOM Excel Import", defaultOn: true, description: "Excel批量导入BOM" },
      { id: "pdm-workbench", label: "PDM工作台", labelEn: "PDM Workbench", defaultOn: true, description: "产品数据管理" },
    ],
    integrations: [
      { system: "SharePoint", type: "m365", label: "图纸库", labelEn: "Drawing Library", actions: ["listFiles", "syncProjectFolders", "getFileUrl"], color: "#038387" },
      { system: "OneDrive", type: "m365", label: "CAD同步", labelEn: "CAD Sync", actions: ["syncToOneDrive", "pullChanges"], color: "#0078D4" },
      { system: "OneNote", type: "m365", label: "设计笔记", labelEn: "Design Notes", actions: ["createPage", "getPageContent"], color: "#7719AA" },
      { system: "Teams", type: "m365", label: "设计评审", labelEn: "Design Review", actions: ["sendTeamsMessage", "createEvent"], color: "#6264A7" },
    ],
    metrics: [
      { label: "菜单项", value: "21", color: "#3B82F6" },
      { label: "BOM", value: "5", color: "#10B981" },
      { label: "PLM", value: "6", color: "#8B5CF6" },
      { label: "AI", value: "3", color: "#F59E0B" },
    ],
  },

  // ──────────────────────────────────────────
  // ④ 项目管理 (Project Management)
  // ──────────────────────────────────────────
  "项目管理": {
    groupName: "项目管理",
    groupNameEn: "Project Management",
    emoji: "📊",
    causeEffect: {
      rootCause: "非标项目从M0到M12生命周期长达18个月，需要门径管控确保里程碑可控",
      rootCauseEn: "Custom projects span M0-M12 lifecycle of 18 months, requiring stage-gate control for milestone management",
      consequence: "项目延期频发，成本超支无预警，资源冲突无协调机制",
      consequenceEn: "Frequent project delays, cost overruns without early warning, resource conflicts without coordination",
      businessValue: "项目准时交付率提升至85%，成本偏差控制在±5%以内",
      businessValueEn: "On-time delivery rate improved to 85%, cost variance controlled within ±5%",
    },
    inheritance: {
      parents: [
        { name: "战略规划", nameEn: "Strategic Planning", relationship: "年度项目立项计划" },
        { name: "市场与销售", nameEn: "Sales & Marketing", relationship: "中标→自动立项" },
      ],
      children: [
        { name: "研发设计", nameEn: "R&D Design", relationship: "设计阶段管控" },
        { name: "生产制造", nameEn: "Manufacturing", relationship: "生产阶段管控" },
        { name: "客户服务", nameEn: "Customer Service", relationship: "交付与验收阶段" },
        { name: "财务管理", nameEn: "Finance", relationship: "项目预算与成本" },
      ],
    },
    inputs: [
      { source: "市场与销售", dataType: "中标合同", description: "中标通知→项目立项", descriptionEn: "Award notice → project initiation" },
      { source: "人力资源", dataType: "资源池", description: "可分配工程师", descriptionEn: "Available engineers for assignment" },
      { source: "战略规划", dataType: "年度预算", description: "项目预算分配", descriptionEn: "Project budget allocation", event: "ANNUAL_PLAN_APPROVED" },
    ],
    outputs: [
      { source: "项目管理", dataType: "生产工单", description: "M4阶段→生产工单下达", descriptionEn: "M4 phase → production order release", event: "PROJECT_GATE_PASSED" },
      { source: "项目管理", dataType: "设计任务", description: "M1-M3→设计任务分配", descriptionEn: "M1-M3 → design task allocation" },
      { source: "项目管理", dataType: "交付计划", description: "M7-M9→现场交付计划", descriptionEn: "M7-M9 → site delivery plan" },
      { source: "项目管理", dataType: "里程碑状态", description: "门径评审结果→绩效", descriptionEn: "Gate review results → performance" },
    ],
    optional: [
      { id: "gantt-chart", label: "甘特图", labelEn: "Gantt Chart", defaultOn: true, description: "项目时间线可视化" },
      { id: "risk-matrix", label: "风险矩阵", labelEn: "Risk Matrix", defaultOn: true, description: "项目风险评估" },
      { id: "ai-planning", label: "AI排程", labelEn: "AI Planning", defaultOn: false, description: "AI驱动项目排程" },
      { id: "pos-system", label: "POS系统", labelEn: "POS System", defaultOn: false, description: "海外POS项目管理" },
      { id: "digital-twin", label: "项目数字孪生", labelEn: "Project Digital Twin", defaultOn: false, description: "项目进度3D可视化" },
    ],
    integrations: [
      { system: "Planner", type: "m365", label: "任务看板", labelEn: "Task Board", actions: ["createTask", "updateProgress", "getTasks"], color: "#31752F" },
      { system: "Teams", type: "m365", label: "项目频道", labelEn: "Project Channels", actions: ["sendTeamsMessage", "getChats"], color: "#6264A7" },
      { system: "SharePoint", type: "m365", label: "项目文档库", labelEn: "Project Doc Library", actions: ["syncProjectFolders", "listFiles"], color: "#038387" },
      { system: "Outlook", type: "m365", label: "评审会议", labelEn: "Review Meetings", actions: ["createEvent", "sendMail"], color: "#0078D4" },
      { system: "OneNote", type: "m365", label: "项目日志", labelEn: "Project Journal", actions: ["createPage", "updatePage"], color: "#7719AA" },
    ],
    metrics: [
      { label: "菜单项", value: "26", color: "#3B82F6" },
      { label: "门径", value: "M0-M12", color: "#14B8A6" },
      { label: "POS", value: "6", color: "#F59E0B" },
      { label: "AI", value: "1", color: "#EC4899" },
    ],
  },

  // ──────────────────────────────────────────
  // ⑤ 生产制造 (Manufacturing)
  // ──────────────────────────────────────────
  "生产制造": {
    groupName: "生产制造",
    groupNameEn: "Manufacturing",
    emoji: "🏭",
    causeEffect: {
      rootCause: "非标制造涉及13道工序(T1-T15)，需要精细化排产、工时追踪、质量管控",
      rootCauseEn: "Custom manufacturing involves 13 processes (T1-T15), requiring fine-grained scheduling, labor tracking, quality control",
      consequence: "排产混乱导致交期延误，工时失控推高成本，质量问题导致返工和客诉",
      consequenceEn: "Scheduling chaos causes delivery delays, uncontrolled labor inflates costs, quality issues cause rework and complaints",
      businessValue: "生产效率提升25%，质量合格率提升至98%，工时成本透明可控",
      businessValueEn: "Production efficiency improved 25%, quality pass rate to 98%, labor costs transparent and controllable",
    },
    inheritance: {
      parents: [
        { name: "项目管理", nameEn: "Project Management", relationship: "生产工单来源" },
        { name: "研发设计", nameEn: "R&D Design", relationship: "图纸+BOM+工艺" },
        { name: "供应链管理", nameEn: "Supply Chain", relationship: "物料到位" },
      ],
      children: [
        { name: "客户服务", nameEn: "Customer Service", relationship: "产品→交付→验收" },
        { name: "财务管理", nameEn: "Finance", relationship: "生产成本→财务核算" },
        { name: "人力资源", nameEn: "Human Resources", relationship: "工时→薪酬计算" },
      ],
    },
    inputs: [
      { source: "项目管理", dataType: "生产工单", description: "M4门径通过→生产工单", descriptionEn: "M4 gate passed → production order", event: "PROJECT_GATE_PASSED" },
      { source: "研发设计", dataType: "BOM+图纸", description: "冻结版本BOM与图纸", descriptionEn: "Frozen BOM version & drawings" },
      { source: "供应链管理", dataType: "物料状态", description: "物料到位/缺料预警", descriptionEn: "Material availability / shortage alert" },
      { source: "AI助手", dataType: "工艺优化", description: "AI工艺参数推荐", descriptionEn: "AI process parameter recommendations" },
    ],
    outputs: [
      { source: "生产制造", dataType: "工时报工", description: "实际工时→薪酬计算", descriptionEn: "Actual hours → payroll calculation", event: "LABOR_REPORT_APPROVED" },
      { source: "生产制造", dataType: "质量记录", description: "质检数据→质量管理", descriptionEn: "QC data → quality management" },
      { source: "生产制造", dataType: "生产进度", description: "工单完成率→项目状态", descriptionEn: "Work order completion → project status" },
      { source: "生产制造", dataType: "成本数据", description: "实际成本→财务核算", descriptionEn: "Actual costs → financial accounting" },
      { source: "生产制造", dataType: "发货清单", description: "装箱→物流→现场", descriptionEn: "Packing → logistics → site", event: "SCHEDULING_PLAN_PUBLISHED" },
    ],
    optional: [
      { id: "smart-aps", label: "智能APS排程", labelEn: "Smart APS", defaultOn: true, description: "AI驱动高级排程" },
      { id: "spc-charts", label: "SPC统计", labelEn: "SPC Charts", defaultOn: true, description: "统计过程控制" },
      { id: "oee-dashboard", label: "OEE看板", labelEn: "OEE Dashboard", defaultOn: false, description: "设备综合效率" },
      { id: "uwb-tracking", label: "UWB定位", labelEn: "UWB Tracking", defaultOn: false, description: "车间人员/物料定位" },
      { id: "ccd-vision", label: "CCD视觉检测", labelEn: "CCD Vision Inspection", defaultOn: false, description: "视觉质量检测" },
      { id: "workshop-kiosk", label: "车间Kiosk", labelEn: "Workshop Kiosk", defaultOn: true, description: "工位触屏终端" },
    ],
    integrations: [
      { system: "Teams", type: "m365", label: "车间通知", labelEn: "Shop Floor Alerts", actions: ["sendTeamsMessage"], color: "#6264A7" },
      { system: "Planner", type: "m365", label: "生产任务", labelEn: "Production Tasks", actions: ["createTask", "updateProgress"], color: "#31752F" },
      { system: "SharePoint", type: "m365", label: "工艺文档", labelEn: "Process Documents", actions: ["listFiles"], color: "#038387" },
      { system: "ERP/天斯", type: "erp", label: "工单同步", labelEn: "Work Order Sync", actions: ["syncWorkOrders", "syncMaterialStatus"], color: "#E74C3C" },
      { system: "IoT传感器", type: "iot", label: "设备数据", labelEn: "Equipment Data", actions: ["getOeeData", "getAlarms"], color: "#06B6D4" },
      { system: "CCD系统", type: "iot", label: "视觉检测", labelEn: "Vision Inspection", actions: ["getInspectionResults"], color: "#8B5CF6" },
    ],
    metrics: [
      { label: "菜单项", value: "61", color: "#3B82F6" },
      { label: "工序", value: "T1-T15", color: "#F59E0B" },
      { label: "质量", value: "20", color: "#EF4444" },
      { label: "IoT", value: "3", color: "#06B6D4" },
    ],
  },

  // ──────────────────────────────────────────
  // ⑤.5 供应链管理 (Supply Chain)
  // ──────────────────────────────────────────
  "供应链管理": {
    groupName: "供应链管理",
    groupNameEn: "Supply Chain",
    emoji: "🔗",
    causeEffect: {
      rootCause: "非标件采购周期长(4-12周)，物料齐套率直接影响生产排产",
      rootCauseEn: "Custom part procurement cycle is long (4-12 weeks), material completeness directly affects production scheduling",
      consequence: "缺料停产，采购成本失控，供应商质量风险无法预警",
      consequenceEn: "Material shortage halts production, procurement costs out of control, supplier quality risks unwarned",
      businessValue: "物料齐套率提升至95%，采购成本降低8%，供应商交付准时率90%+",
      businessValueEn: "Material completeness to 95%, procurement costs reduced 8%, supplier on-time delivery 90%+",
    },
    inheritance: {
      parents: [
        { name: "研发设计", nameEn: "R&D Design", relationship: "BOM→采购清单" },
        { name: "生产制造", nameEn: "Manufacturing", relationship: "物料需求计划" },
      ],
      children: [
        { name: "生产制造", nameEn: "Manufacturing", relationship: "物料到位→开工" },
        { name: "财务管理", nameEn: "Finance", relationship: "采购成本→应付账款" },
      ],
    },
    inputs: [
      { source: "研发设计", dataType: "BOM清单", description: "采购物料需求", descriptionEn: "Purchase material requirements" },
      { source: "生产制造", dataType: "MRP需求", description: "物料需求计划", descriptionEn: "Material requirement planning" },
    ],
    outputs: [
      { source: "供应链管理", dataType: "物料状态", description: "到货/缺料状态", descriptionEn: "Arrival/shortage status" },
      { source: "供应链管理", dataType: "采购成本", description: "实际采购价格", descriptionEn: "Actual procurement prices" },
      { source: "供应链管理", dataType: "供应商评级", description: "供应商质量评分", descriptionEn: "Supplier quality ratings" },
    ],
    optional: [
      { id: "ai-rfq", label: "AI询价", labelEn: "AI RFQ", defaultOn: false, description: "AI驱动供应商比价" },
      { id: "supplier-radar", label: "供应商风险雷达", labelEn: "Supplier Risk Radar", defaultOn: true, description: "供应链风险预警" },
    ],
    integrations: [
      { system: "ERP/天斯", type: "erp", label: "采购订单", labelEn: "Purchase Orders", actions: ["syncPO", "getMaterialStatus"], color: "#E74C3C" },
      { system: "Outlook", type: "m365", label: "供应商邮件", labelEn: "Supplier Emails", actions: ["sendMail"], color: "#0078D4" },
      { system: "SharePoint", type: "m365", label: "供应商文档", labelEn: "Supplier Documents", actions: ["listFiles"], color: "#038387" },
    ],
    metrics: [
      { label: "菜单项", value: "10", color: "#3B82F6" },
      { label: "采购", value: "3", color: "#10B981" },
      { label: "仓储", value: "4", color: "#F59E0B" },
    ],
  },

  // ──────────────────────────────────────────
  // ⑥ 客户服务 (Customer Service)
  // ──────────────────────────────────────────
  "客户服务": {
    groupName: "客户服务",
    groupNameEn: "Customer Service",
    emoji: "🤝",
    causeEffect: {
      rootCause: "非标设备交付后需要长期维保，客户满意度直接影响复购率和品牌口碑",
      rootCauseEn: "Custom equipment requires long-term maintenance after delivery, customer satisfaction directly affects repurchase and brand reputation",
      consequence: "客诉处理滞后，设备故障响应慢，客户流失率升高",
      consequenceEn: "Delayed complaint handling, slow equipment fault response, increased customer churn",
      businessValue: "客户满意度NPS≥80，售后响应时间<4h，复购率提升20%",
      businessValueEn: "Customer NPS≥80, after-sales response <4h, repurchase rate improved 20%",
    },
    inheritance: {
      parents: [
        { name: "项目管理", nameEn: "Project Management", relationship: "M9-M12交付验收" },
        { name: "生产制造", nameEn: "Manufacturing", relationship: "产品质量基础" },
      ],
      children: [
        { name: "市场与销售", nameEn: "Sales & Marketing", relationship: "满意度→复购" },
        { name: "研发设计", nameEn: "R&D Design", relationship: "现场反馈→设计改进" },
        { name: "战略规划", nameEn: "Strategic Planning", relationship: "NPS→战略调整" },
      ],
    },
    inputs: [
      { source: "项目管理", dataType: "交付包", description: "项目交付与验收文档", descriptionEn: "Project delivery & acceptance documents" },
      { source: "生产制造", dataType: "设备数据", description: "出厂测试与调试记录", descriptionEn: "Factory test & commissioning records" },
    ],
    outputs: [
      { source: "客户服务", dataType: "满意度数据", description: "NPS/CSAT→战略决策", descriptionEn: "NPS/CSAT → strategic decisions", event: "ACCEPTANCE_COMPLETED" },
      { source: "客户服务", dataType: "故障知识库", description: "维修记录→知识沉淀", descriptionEn: "Repair records → knowledge base" },
      { source: "客户服务", dataType: "设计反馈", description: "现场问题→设计改进", descriptionEn: "Field issues → design improvements" },
    ],
    optional: [
      { id: "ai-fault-diag", label: "AI故障诊断", labelEn: "AI Fault Diagnosis", defaultOn: false, description: "AI驱动故障根因分析" },
      { id: "remote-support", label: "远程支持", labelEn: "Remote Support", defaultOn: true, description: "AR远程技术支持" },
      { id: "sla-dashboard", label: "SLA看板", labelEn: "SLA Dashboard", defaultOn: true, description: "服务等级协议监控" },
    ],
    integrations: [
      { system: "Teams", type: "m365", label: "客户支持", labelEn: "Customer Support", actions: ["sendTeamsMessage"], color: "#6264A7" },
      { system: "Outlook", type: "m365", label: "工单通知", labelEn: "Ticket Notifications", actions: ["sendMail"], color: "#0078D4" },
      { system: "OneNote", type: "m365", label: "维修日志", labelEn: "Repair Logs", actions: ["createPage"], color: "#7719AA" },
      { system: "Planner", type: "m365", label: "维修任务", labelEn: "Repair Tasks", actions: ["createTask"], color: "#31752F" },
    ],
    metrics: [
      { label: "菜单项", value: "18", color: "#3B82F6" },
      { label: "交付", value: "5", color: "#14B8A6" },
      { label: "售后", value: "7", color: "#F59E0B" },
      { label: "AI", value: "3", color: "#EC4899" },
    ],
  },

  // ──────────────────────────────────────────
  // ⑦ 人力资源 (Human Resources)
  // ──────────────────────────────────────────
  "人力资源": {
    groupName: "人力资源",
    groupNameEn: "Human Resources",
    emoji: "👥",
    causeEffect: {
      rootCause: "96名员工的全生命周期管理（招聘→在职→离职），薪酬绩效直接影响核心人才稳定性",
      rootCauseEn: "Full lifecycle management of 96 employees (hire→active→exit), compensation & performance directly affect core talent stability",
      consequence: "薪酬不透明引发核心人才流失，绩效考核主观化，招聘到岗周期过长",
      consequenceEn: "Opaque compensation causes core talent loss, subjective performance reviews, lengthy recruitment cycles",
      businessValue: "核心人才保留率95%+，三档绩效工资激活全员战斗力，招聘周期缩短30%",
      businessValueEn: "Core talent retention 95%+, 3-tier performance wages activate workforce, recruitment cycle shortened 30%",
    },
    inheritance: {
      parents: [
        { name: "战略规划", nameEn: "Strategic Planning", relationship: "人才战略与编制规划" },
        { name: "工作台", nameEn: "Workspace", relationship: "员工自助入口" },
      ],
      children: [
        { name: "能力体系", nameEn: "Capability System", relationship: "员工→能力评估" },
        { name: "财务管理", nameEn: "Finance", relationship: "薪酬→财务核算" },
        { name: "生产制造", nameEn: "Manufacturing", relationship: "工人→车间排班" },
      ],
    },
    inputs: [
      { source: "战略规划", dataType: "编制计划", description: "年度人员编制", descriptionEn: "Annual headcount plan" },
      { source: "生产制造", dataType: "工时数据", description: "车间报工→薪酬", descriptionEn: "Shop floor labor → payroll", event: "LABOR_REPORT_APPROVED" },
      { source: "能力体系", dataType: "能力评估", description: "TSDCKL六维评分", descriptionEn: "TSDCKL 6D capability scores" },
    ],
    outputs: [
      { source: "人力资源", dataType: "花名册", description: "在职人员信息", descriptionEn: "Active employee roster", event: "HR_EMPLOYEE_ONBOARDED" },
      { source: "人力资源", dataType: "薪酬数据", description: "工资计算结果", descriptionEn: "Salary calculation results", event: "PAYROLL_CYCLE_CALCULATED" },
      { source: "人力资源", dataType: "绩效系数", description: "三档绩效工资系数", descriptionEn: "3-tier performance coefficients", event: "PERF_CALIBRATION_DONE" },
    ],
    optional: [
      { id: "payroll-agent", label: "薪酬Agent", labelEn: "Payroll Agent", defaultOn: true, description: "AI驱动薪酬分析" },
      { id: "arena", label: "竞技场", labelEn: "The Arena", defaultOn: false, description: "团队绩效PK" },
      { id: "smart-perf", label: "智能绩效", labelEn: "Smart Performance", defaultOn: true, description: "AI绩效预测" },
      { id: "ai-talent", label: "AI人才画像", labelEn: "AI Talent Profile", defaultOn: false, description: "AI人才推荐" },
      { id: "cn-compliance", label: "中国劳动法合规", labelEn: "CN Labor Compliance", defaultOn: true, description: "合规自检" },
    ],
    integrations: [
      { system: "Outlook", type: "m365", label: "HR邮件", labelEn: "HR Emails", actions: ["sendMail"], color: "#0078D4" },
      { system: "Teams", type: "m365", label: "员工沟通", labelEn: "Employee Communication", actions: ["sendTeamsMessage"], color: "#6264A7" },
      { system: "Planner", type: "m365", label: "HR任务", labelEn: "HR Tasks", actions: ["createTask"], color: "#31752F" },
      { system: "OneNote", type: "m365", label: "面试笔记", labelEn: "Interview Notes", actions: ["createPage"], color: "#7719AA" },
      { system: "SharePoint", type: "m365", label: "员工档案", labelEn: "Employee Files", actions: ["listFiles", "syncProjectFolders"], color: "#038387" },
      { system: "钉钉", type: "external", label: "考勤打卡", labelEn: "Attendance Clock", actions: ["syncAttendance"], color: "#3089DC" },
    ],
    metrics: [
      { label: "菜单项", value: "48", color: "#3B82F6" },
      { label: "绩效", value: "12", color: "#EC4899" },
      { label: "薪酬", value: "13", color: "#10B981" },
      { label: "AI", value: "5", color: "#F59E0B" },
    ],
  },

  // ──────────────────────────────────────────
  // ⑧ 能力体系 (Capability System)
  // ──────────────────────────────────────────
  "能力体系": {
    groupName: "能力体系",
    groupNameEn: "Capability System",
    emoji: "🎯",
    causeEffect: {
      rootCause: "TSDCKL六维能力模型是人才发展基石，需要系统化沉淀员工能力数据",
      rootCauseEn: "TSDCKL 6D capability model is the foundation of talent development, requiring systematic employee capability data",
      consequence: "人才发展无数据支撑，晋升决策主观，关键岗位继任无规划",
      consequenceEn: "Talent development without data support, subjective promotion decisions, no succession planning",
      businessValue: "人才盘点数据化，能力缺口可量化，学习路径个性化",
      businessValueEn: "Data-driven talent inventory, quantifiable capability gaps, personalized learning paths",
    },
    inheritance: {
      parents: [
        { name: "人力资源", nameEn: "Human Resources", relationship: "员工基础数据" },
      ],
      children: [
        { name: "人力资源", nameEn: "Human Resources", relationship: "能力评估→绩效/晋升" },
        { name: "战略规划", nameEn: "Strategic Planning", relationship: "组织能力→战略匹配" },
      ],
    },
    inputs: [
      { source: "人力资源", dataType: "员工档案", description: "员工基本信息", descriptionEn: "Employee profile data" },
      { source: "生产制造", dataType: "技能认证", description: "工种技能认证", descriptionEn: "Skill certifications" },
    ],
    outputs: [
      { source: "能力体系", dataType: "能力雷达", description: "TSDCKL六维评分", descriptionEn: "TSDCKL 6D radar scores" },
      { source: "能力体系", dataType: "学习建议", description: "AI学习路径推荐", descriptionEn: "AI learning path recommendations" },
    ],
    optional: [
      { id: "red-blue-board", label: "红蓝对抗", labelEn: "Red-Blue Competition", defaultOn: true, description: "团队能力PK" },
      { id: "hr-sandbox", label: "HR沙盘", labelEn: "HR Sandbox", defaultOn: false, description: "能力沙盘模拟" },
    ],
    integrations: [
      { system: "OneNote", type: "m365", label: "学习笔记", labelEn: "Learning Notes", actions: ["createPage"], color: "#7719AA" },
      { system: "Teams", type: "m365", label: "培训频道", labelEn: "Training Channels", actions: ["sendTeamsMessage"], color: "#6264A7" },
    ],
    metrics: [
      { label: "菜单项", value: "14", color: "#3B82F6" },
      { label: "个人", value: "5", color: "#10B981" },
      { label: "团队", value: "6", color: "#8B5CF6" },
    ],
  },

  // ──────────────────────────────────────────
  // ⑨ 财务管理 (Finance)
  // ──────────────────────────────────────────
  "财务管理": {
    groupName: "财务管理",
    groupNameEn: "Finance",
    emoji: "💰",
    causeEffect: {
      rootCause: "非标项目成本核算复杂(人工+物料+外协)，需要实时成本透视与预算管控",
      rootCauseEn: "Custom project cost accounting is complex (labor+material+outsource), requiring real-time cost visibility and budget control",
      consequence: "成本失控，利润侵蚀无感知，现金流风险无预警",
      consequenceEn: "Cost out of control, profit erosion unnoticed, cash flow risks unwarned",
      businessValue: "项目毛利率提升5%，预算偏差控制在±3%，财务报表T+1自动生成",
      businessValueEn: "Project gross margin improved 5%, budget variance within ±3%, financial reports auto-generated T+1",
    },
    inheritance: {
      parents: [
        { name: "战略规划", nameEn: "Strategic Planning", relationship: "年度预算" },
        { name: "生产制造", nameEn: "Manufacturing", relationship: "生产成本" },
        { name: "人力资源", nameEn: "Human Resources", relationship: "薪酬成本" },
        { name: "供应链管理", nameEn: "Supply Chain", relationship: "采购成本" },
      ],
      children: [
        { name: "战略规划", nameEn: "Strategic Planning", relationship: "财务结果→战略调整" },
        { name: "市场与销售", nameEn: "Sales & Marketing", relationship: "成本→报价底线" },
      ],
    },
    inputs: [
      { source: "生产制造", dataType: "生产成本", description: "工时+物料+外协成本", descriptionEn: "Labor+material+outsource costs" },
      { source: "人力资源", dataType: "薪酬总额", description: "月度工资总额", descriptionEn: "Monthly payroll total" },
      { source: "供应链管理", dataType: "采购支出", description: "采购订单与付款", descriptionEn: "Purchase orders & payments" },
    ],
    outputs: [
      { source: "财务管理", dataType: "财务报表", description: "损益/资产/现金流", descriptionEn: "P&L/Balance Sheet/Cash Flow" },
      { source: "财务管理", dataType: "预算预警", description: "超支预警通知", descriptionEn: "Overspend alert notifications" },
      { source: "财务管理", dataType: "成本标准", description: "标准成本基准", descriptionEn: "Standard cost baselines" },
    ],
    optional: [
      { id: "ai-budget", label: "AI预算", labelEn: "AI Budget", defaultOn: false, description: "AI预算预测" },
      { id: "ai-cost-opt", label: "AI降本", labelEn: "AI Cost Optimization", defaultOn: false, description: "AI降本建议" },
      { id: "finance-agent", label: "财务Agent", labelEn: "Finance Agent", defaultOn: false, description: "AI财务问答" },
    ],
    integrations: [
      { system: "ERP/天斯", type: "erp", label: "财务同步", labelEn: "Finance Sync", actions: ["syncInvoices", "syncPayments"], color: "#E74C3C" },
      { system: "Outlook", type: "m365", label: "审批通知", labelEn: "Approval Notifications", actions: ["sendMail"], color: "#0078D4" },
      { system: "SharePoint", type: "m365", label: "财务文档", labelEn: "Finance Documents", actions: ["listFiles"], color: "#038387" },
    ],
    metrics: [
      { label: "菜单项", value: "14", color: "#3B82F6" },
      { label: "预算", value: "7", color: "#10B981" },
      { label: "AI", value: "4", color: "#F59E0B" },
    ],
  },

  // ──────────────────────────────────────────
  // ⑩ AI助手 (AI Intelligence)
  // ──────────────────────────────────────────
  "AI助手": {
    groupName: "AI助手",
    groupNameEn: "AI Intelligence",
    emoji: "🤖",
    causeEffect: {
      rootCause: "工业制造领域存在大量经验知识(FMEA、工艺参数、故障模式)需要AI沉淀与复用",
      rootCauseEn: "Industrial manufacturing has vast experiential knowledge (FMEA, process params, fault modes) that needs AI capture & reuse",
      consequence: "知识随人才流失，新人培养周期长，决策依赖个人经验而非数据",
      consequenceEn: "Knowledge lost with talent turnover, long new hire training, decisions rely on personal experience not data",
      businessValue: "知识复用率提升80%，新人上手时间缩短50%，AI辅助决策准确率90%+",
      businessValueEn: "Knowledge reuse rate improved 80%, onboarding time shortened 50%, AI-assisted decision accuracy 90%+",
    },
    inheritance: {
      parents: [
        { name: "所有业务模块", nameEn: "All Business Modules", relationship: "AI赋能全链路" },
      ],
      children: [
        { name: "所有业务模块", nameEn: "All Business Modules", relationship: "AI分析结果回注业务" },
      ],
    },
    inputs: [
      { source: "全系统", dataType: "业务数据", description: "所有模块的结构化数据", descriptionEn: "Structured data from all modules" },
      { source: "知识库", dataType: "历史案例", description: "FMEA/质量/故障案例", descriptionEn: "FMEA/quality/fault historical cases" },
      { source: "用户", dataType: "自然语言查询", description: "用户问答与指令", descriptionEn: "User Q&A and commands" },
    ],
    outputs: [
      { source: "AI助手", dataType: "智能建议", description: "AI分析结果与建议", descriptionEn: "AI analysis results & recommendations" },
      { source: "AI助手", dataType: "预测预警", description: "风险/异常/趋势预测", descriptionEn: "Risk/anomaly/trend predictions" },
      { source: "AI助手", dataType: "自动化操作", description: "Agent自动执行任务", descriptionEn: "Agent automated task execution" },
    ],
    optional: [
      { id: "ai-genesis", label: "AI Genesis", labelEn: "AI Genesis", defaultOn: true, description: "零信任AI治理" },
      { id: "knowledge-graph", label: "知识图谱", labelEn: "Knowledge Graph", defaultOn: false, description: "企业知识图谱构建" },
      { id: "agent-fleet", label: "Agent舰队", labelEn: "Agent Fleet", defaultOn: true, description: "13个AI Agent管理" },
      { id: "model-training", label: "模型训练", labelEn: "Model Training", defaultOn: false, description: "自定义模型微调" },
    ],
    integrations: [
      { system: "Claude API", type: "ai", label: "大模型", labelEn: "LLM", actions: ["chat", "analyze", "generate"], color: "#CC785C" },
      { system: "OneNote", type: "m365", label: "AI笔记", labelEn: "AI Notes", actions: ["createPage", "analyzeEntry"], color: "#7719AA" },
      { system: "Teams", type: "m365", label: "AI Bot", labelEn: "AI Bot", actions: ["sendTeamsMessage"], color: "#6264A7" },
    ],
    metrics: [
      { label: "菜单项", value: "27", color: "#3B82F6" },
      { label: "Agent", value: "13", color: "#EC4899" },
      { label: "模型", value: "10", color: "#F59E0B" },
      { label: "知识", value: "7", color: "#8B5CF6" },
    ],
  },

  // ──────────────────────────────────────────
  // ⑪ AI DevOps
  // ──────────────────────────────────────────
  "AI DevOps": {
    groupName: "AI DevOps",
    groupNameEn: "AI DevOps",
    emoji: "⚡",
    causeEffect: {
      rootCause: "多AI模型并行运行需要统一管控、版本管理、部署编排",
      rootCauseEn: "Multiple AI models running in parallel need unified governance, version management, deployment orchestration",
      consequence: "AI模型失控，版本混乱，部署故障影响业务",
      consequenceEn: "AI models out of control, version chaos, deployment failures affect business",
      businessValue: "AI模型上线时间缩短70%，模型质量可追溯，部署零故障",
      businessValueEn: "AI model deployment time shortened 70%, model quality traceable, zero-fault deployment",
    },
    inheritance: {
      parents: [{ name: "AI助手", nameEn: "AI Intelligence", relationship: "模型管理基础" }],
      children: [{ name: "AI助手", nameEn: "AI Intelligence", relationship: "部署后的模型服务" }],
    },
    inputs: [
      { source: "AI助手", dataType: "模型定义", description: "模型结构与参数", descriptionEn: "Model structure & parameters" },
    ],
    outputs: [
      { source: "AI DevOps", dataType: "部署状态", description: "模型上线/回滚状态", descriptionEn: "Model deployment/rollback status" },
    ],
    optional: [
      { id: "dual-ai-matrix", label: "双AI矩阵", labelEn: "Dual-AI Matrix", defaultOn: true, description: "双模型协同" },
      { id: "simulator", label: "模拟器", labelEn: "Simulator", defaultOn: true, description: "AI行为模拟" },
    ],
    integrations: [
      { system: "Teams", type: "m365", label: "部署通知", labelEn: "Deploy Alerts", actions: ["sendTeamsMessage"], color: "#6264A7" },
    ],
    metrics: [
      { label: "菜单项", value: "5", color: "#3B82F6" },
      { label: "矩阵", value: "2×2", color: "#F59E0B" },
    ],
  },

  // ──────────────────────────────────────────
  // ⑫ 战略规划 (Strategic Planning)
  // ──────────────────────────────────────────
  "战略规划": {
    groupName: "战略规划",
    groupNameEn: "Strategic Planning",
    emoji: "🏛️",
    causeEffect: {
      rootCause: "企业战略需要从愿景→OKR→KPI→执行的端到端闭环管理",
      rootCauseEn: "Enterprise strategy needs end-to-end closed-loop management from vision→OKR→KPI→execution",
      consequence: "战略与执行脱节，目标分解不到位，变革推进无章法",
      consequenceEn: "Strategy disconnected from execution, inadequate target decomposition, unstructured change management",
      businessValue: "战略目标100%分解到部门/个人，OKR达成率可视化，变革里程碑可追踪",
      businessValueEn: "Strategy 100% decomposed to dept/individual, OKR achievement visualized, change milestones trackable",
    },
    inheritance: {
      parents: [
        { name: "CEO/董事会", nameEn: "CEO/Board", relationship: "公司愿景与三年规划" },
      ],
      children: [
        { name: "项目管理", nameEn: "Project Management", relationship: "年度项目立项" },
        { name: "人力资源", nameEn: "Human Resources", relationship: "编制与预算" },
        { name: "财务管理", nameEn: "Finance", relationship: "年度预算分配" },
        { name: "市场与销售", nameEn: "Sales & Marketing", relationship: "销售目标" },
        { name: "生产制造", nameEn: "Manufacturing", relationship: "产能规划" },
      ],
    },
    inputs: [
      { source: "财务管理", dataType: "财务结果", description: "上年度财务数据", descriptionEn: "Previous year financial data" },
      { source: "客户服务", dataType: "市场反馈", description: "客户NPS与市场趋势", descriptionEn: "Customer NPS & market trends" },
    ],
    outputs: [
      { source: "战略规划", dataType: "年度计划", description: "年度经营计划", descriptionEn: "Annual operating plan", event: "ANNUAL_PLAN_APPROVED" },
      { source: "战略规划", dataType: "OKR矩阵", description: "公司→部门→个人OKR", descriptionEn: "Company→dept→individual OKR" },
      { source: "战略规划", dataType: "预算分配", description: "年度预算分配方案", descriptionEn: "Annual budget allocation plan" },
    ],
    optional: [
      { id: "okr-matrix", label: "OKR矩阵", labelEn: "OKR Matrix", defaultOn: true, description: "全公司OKR看板" },
      { id: "change-mgmt", label: "变革管理", labelEn: "Change Management", defaultOn: true, description: "组织变革追踪" },
      { id: "global-growth", label: "全球化增长", labelEn: "Global Growth", defaultOn: false, description: "海外市场拓展" },
    ],
    integrations: [
      { system: "Planner", type: "m365", label: "战略任务", labelEn: "Strategy Tasks", actions: ["createTask"], color: "#31752F" },
      { system: "OneNote", type: "m365", label: "战略笔记", labelEn: "Strategy Notes", actions: ["createPage"], color: "#7719AA" },
      { system: "Teams", type: "m365", label: "战略会议", labelEn: "Strategy Meetings", actions: ["sendTeamsMessage", "createEvent"], color: "#6264A7" },
      { system: "SharePoint", type: "m365", label: "战略文档", labelEn: "Strategy Documents", actions: ["listFiles"], color: "#038387" },
    ],
    metrics: [
      { label: "菜单项", value: "9", color: "#3B82F6" },
      { label: "OKR", value: "4", color: "#10B981" },
      { label: "治理", value: "3", color: "#8B5CF6" },
    ],
  },

  // ──────────────────────────────────────────
  // ⑬ Smart OA
  // ──────────────────────────────────────────
  "Smart OA": {
    groupName: "Smart OA",
    groupNameEn: "Smart OA",
    emoji: "📋",
    causeEffect: {
      rootCause: "日常行政审批、会议纪要、差旅报告等流程需要数字化提效",
      rootCauseEn: "Daily admin approvals, meeting minutes, travel reports need digitization for efficiency",
      consequence: "审批流程慢，纸质表单易丢失，信息传递延迟",
      consequenceEn: "Slow approval processes, paper forms easily lost, information transmission delays",
      businessValue: "审批效率提升60%，零纸化，信息即时触达",
      businessValueEn: "Approval efficiency improved 60%, paperless, instant information delivery",
    },
    inheritance: {
      parents: [{ name: "工作台", nameEn: "Workspace", relationship: "OA入口" }],
      children: [{ name: "人力资源", nameEn: "Human Resources", relationship: "考勤/请假/出差" }],
    },
    inputs: [
      { source: "全系统", dataType: "审批请求", description: "各模块审批表单", descriptionEn: "Approval forms from all modules" },
    ],
    outputs: [
      { source: "Smart OA", dataType: "审批结果", description: "审批通过/驳回/转签", descriptionEn: "Approval approved/rejected/forwarded" },
      { source: "Smart OA", dataType: "会议纪要", description: "晨会/周会/专题会记录", descriptionEn: "Morning/weekly/topic meeting records" },
    ],
    optional: [
      { id: "dynamic-forms", label: "动态表单", labelEn: "Dynamic Forms", defaultOn: true, description: "可配置表单引擎" },
      { id: "morning-meeting", label: "智能晨会", labelEn: "Smart Morning Meeting", defaultOn: true, description: "AI驱动晨会议程" },
    ],
    integrations: [
      { system: "Outlook", type: "m365", label: "审批邮件", labelEn: "Approval Emails", actions: ["sendMail"], color: "#0078D4" },
      { system: "Teams", type: "m365", label: "审批通知", labelEn: "Approval Alerts", actions: ["sendTeamsMessage"], color: "#6264A7" },
      { system: "钉钉", type: "external", label: "钉钉审批", labelEn: "DingTalk Approval", actions: ["syncApproval"], color: "#3089DC" },
    ],
    metrics: [
      { label: "菜单项", value: "9", color: "#3B82F6" },
      { label: "表单", value: "2", color: "#10B981" },
      { label: "会议", value: "3", color: "#F59E0B" },
    ],
  },

  // ──────────────────────────────────────────
  // ⑭ 系统管理 (System Admin)
  // ──────────────────────────────────────────
  "系统管理": {
    groupName: "系统管理",
    groupNameEn: "System Admin",
    emoji: "⚙️",
    causeEffect: {
      rootCause: "全系统428+功能点需要统一的权限管控、安全审计、集成配置",
      rootCauseEn: "428+ system features need unified permission control, security audit, integration configuration",
      consequence: "权限泄露风险，无法追溯操作，集成故障无法定位",
      consequenceEn: "Permission leak risks, unable to trace operations, integration failures hard to diagnose",
      businessValue: "零安全事故，100%操作可审计，集成健康度99.5%+",
      businessValueEn: "Zero security incidents, 100% operation auditable, integration health 99.5%+",
    },
    inheritance: {
      parents: [{ name: "基础设施", nameEn: "Infrastructure", relationship: "服务器/数据库/网络" }],
      children: [{ name: "所有模块", nameEn: "All Modules", relationship: "权限/配置/安全基座" }],
    },
    inputs: [
      { source: "全系统", dataType: "审计日志", description: "所有模块操作日志", descriptionEn: "Operation logs from all modules" },
    ],
    outputs: [
      { source: "系统管理", dataType: "权限矩阵", description: "18角色×280权限", descriptionEn: "18 roles × 280 permissions" },
      { source: "系统管理", dataType: "安全报告", description: "安全态势报告", descriptionEn: "Security posture reports" },
    ],
    optional: [
      { id: "ai-security", label: "AI安全治理", labelEn: "AI Security", defaultOn: true, description: "AI安全合规" },
      { id: "cbam", label: "碳足迹CBAM", labelEn: "Carbon Footprint CBAM", defaultOn: false, description: "碳边境调节" },
    ],
    integrations: [
      { system: "MS Graph", type: "m365", label: "统一认证", labelEn: "Unified Auth", actions: ["testConnection", "clearCache"], color: "#0078D4" },
      { system: "钉钉", type: "external", label: "钉钉集成", labelEn: "DingTalk Integration", actions: ["syncOrg", "syncNotification"], color: "#3089DC" },
      { system: "ERP/天斯", type: "erp", label: "ERP对接", labelEn: "ERP Integration", actions: ["syncMasterData"], color: "#E74C3C" },
    ],
    metrics: [
      { label: "菜单项", value: "61", color: "#3B82F6" },
      { label: "沙盘", value: "13", color: "#F59E0B" },
      { label: "安全", value: "9", color: "#EF4444" },
      { label: "集成", value: "9", color: "#06B6D4" },
    ],
  },

  // ──────────────────────────────────────────
  // ⑮ 协作与文档 (Collaboration & Docs)
  // ──────────────────────────────────────────
  "协作与文档": {
    groupName: "协作与文档",
    groupNameEn: "Collaboration & Docs",
    emoji: "📁",
    causeEffect: {
      rootCause: "跨部门协作需要统一的文档管理、会议管理、社群沟通平台",
      rootCauseEn: "Cross-department collaboration needs unified document management, meeting management, community communication platform",
      consequence: "文档分散在个人电脑，协作靠微信/邮件，版本管理混乱",
      consequenceEn: "Documents scattered on personal PCs, collaboration via WeChat/email, version management chaotic",
      businessValue: "文档检索效率提升50%，协作响应时间<30min，知识资产100%归企业",
      businessValueEn: "Document retrieval efficiency improved 50%, collaboration response <30min, 100% knowledge assets owned by enterprise",
    },
    inheritance: {
      parents: [{ name: "工作台", nameEn: "Workspace", relationship: "协作入口" }],
      children: [{ name: "所有模块", nameEn: "All Modules", relationship: "文档/会议支撑" }],
    },
    inputs: [
      { source: "全系统", dataType: "文档", description: "各模块产生的文档", descriptionEn: "Documents from all modules" },
    ],
    outputs: [
      { source: "协作与文档", dataType: "结构化文档", description: "归档后的文档", descriptionEn: "Archived documents" },
      { source: "协作与文档", dataType: "会议纪要", description: "智能会议纪要", descriptionEn: "Smart meeting minutes" },
    ],
    optional: [
      { id: "digital-cloud", label: "数字云展厅", labelEn: "Digital Cloud Hall", defaultOn: false, description: "VR展厅" },
      { id: "iot-twin", label: "IoT数字孪生", labelEn: "IoT Digital Twin", defaultOn: false, description: "设备孪生" },
      { id: "achievements", label: "成就系统", labelEn: "Achievements", defaultOn: true, description: "员工成就勋章" },
    ],
    integrations: [
      { system: "SharePoint", type: "m365", label: "文档中心", labelEn: "Document Center", actions: ["listFiles", "searchFiles"], color: "#038387" },
      { system: "OneDrive", type: "m365", label: "个人云盘", labelEn: "Personal Drive", actions: ["syncToOneDrive", "listFiles"], color: "#0078D4" },
      { system: "OneNote", type: "m365", label: "共享笔记", labelEn: "Shared Notes", actions: ["getNotebooks", "createPage"], color: "#7719AA" },
      { system: "Teams", type: "m365", label: "协作频道", labelEn: "Collaboration Channels", actions: ["sendTeamsMessage", "getChats"], color: "#6264A7" },
    ],
    metrics: [
      { label: "菜单项", value: "16", color: "#3B82F6" },
      { label: "会议", value: "4", color: "#10B981" },
      { label: "平台", value: "6", color: "#8B5CF6" },
    ],
  },
};

// ── Helper: get module config by group name ──
export function getModuleConfig(groupName: string): MenuModuleConfig | undefined {
  return MODULE_CONFIGS[groupName];
}

// ── Helper: get all module names ──
export function getAllModuleNames(): string[] {
  return Object.keys(MODULE_CONFIGS);
}
