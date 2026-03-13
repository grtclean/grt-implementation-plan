/**
 * 岗位工作站配置 — 军团管理
 *
 * 每个角色在公用电脑登录后看到的完整工作站信息：
 * 1. 岗位职责
 * 2. M级助理等级映射
 * 3. SOP分类（BOM相关 + 通用工作任务）
 * 4. 质量要求（IATF 16949 / ISO 9001 / GRT内部标准）
 * 5. 工作要求（日常任务清单）
 * 6. 公司规范（GRT GS标准）
 */

import type { AgentLevel } from "./ai-agent-levels";

// ─── 类型定义 ────────────────────────────────────────────

export interface RoleResponsibility {
  title: string;
  titleEn: string;
  items: string[];
  itemsEn: string[];
}

export interface SOPReference {
  code: string;
  title: string;
  titleEn: string;
  category: "bom" | "design" | "production" | "quality" | "service" | "management" | "safety" | "procurement" | "hr" | "finance";
  priority: "critical" | "high" | "normal";
  processCode?: string;
}

export interface QualityRequirement {
  standard: string;
  clause: string;
  description: string;
  descriptionEn: string;
  checkFrequency: "per_task" | "daily" | "weekly" | "per_gate";
}

export interface WorkRequirement {
  id: string;
  task: string;
  taskEn: string;
  frequency: "daily" | "weekly" | "monthly" | "per_project" | "per_event";
  tools: string[];
  route?: string;
}

export interface CompanyStandard {
  code: string;
  title: string;
  titleEn: string;
  category: "gs_culture" | "gs_process" | "gs_quality" | "gs_safety" | "gs_communication";
  description: string;
}

export interface RoleWorkstationConfig {
  roleId: string;
  roleName: string;
  roleNameEn: string;
  defaultAgentLevel: AgentLevel;
  responsibilities: RoleResponsibility;
  sopReferences: SOPReference[];
  qualityRequirements: QualityRequirement[];
  workRequirements: WorkRequirement[];
  companyStandards: CompanyStandard[];
  keySystemRoutes: { label: string; labelEn: string; path: string; icon: string }[];
}

// ─── GRT公司共用标准 (GS规范) ─────────────────────────────

export const GRT_COMPANY_STANDARDS: CompanyStandard[] = [
  {
    code: "GS-001",
    title: "GRT行为准则",
    titleEn: "GRT Code of Conduct",
    category: "gs_culture",
    description: "诚信、协作、创新、结果导向。所有员工必须遵守公司核心价值观，保持积极正面态度。",
  },
  {
    code: "GS-002",
    title: "GRT沟通标准",
    titleEn: "GRT Communication Standard",
    category: "gs_communication",
    description: "内部沟通使用钉钉/飞书，外部客户沟通使用邮件/微信。会议需有会议纪要，48小时内分发。",
  },
  {
    code: "GS-003",
    title: "GRT保密协议",
    titleEn: "GRT Confidentiality Policy",
    category: "gs_culture",
    description: "客户技术资料、项目报价、内部流程均属机密信息，严禁外泄。违者按公司纪律处分。",
  },
  {
    code: "GS-004",
    title: "GRT质量第一原则",
    titleEn: "GRT Quality First Principle",
    category: "gs_quality",
    description: "不接受不良品、不制造不良品、不传递不良品。发现问题立即上报，不隐瞒。",
  },
  {
    code: "GS-005",
    title: "GRT安全生产规范",
    titleEn: "GRT Production Safety Standard",
    category: "gs_safety",
    description: "进入车间必须佩戴安全帽、护目镜、劳保鞋。操作设备前必须确认安全联锁状态。",
  },
  {
    code: "GS-006",
    title: "GRT 5S管理规范",
    titleEn: "GRT 5S Management Standard",
    category: "gs_process",
    description: "整理、整顿、清扫、清洁、素养。每日下班前完成工位5S，每周五部门5S检查。",
  },
  {
    code: "GS-007",
    title: "GRT环保责任",
    titleEn: "GRT Environmental Responsibility",
    category: "gs_culture",
    description: "废液按规定收集处理，化学品使用MSDS存档，节能减排纳入KPI考核。",
  },
  {
    code: "GS-008",
    title: "GRT知识产权保护",
    titleEn: "GRT IP Protection",
    category: "gs_culture",
    description: "所有研发成果归公司所有。专利申报奖励制度：实用新型2000元/件，发明5000元/件。",
  },
];

// ─── 共用质量要求 ──────────────────────────────────────────

const COMMON_QUALITY_REQUIREMENTS: QualityRequirement[] = [
  {
    standard: "ISO 9001:2015",
    clause: "§7.1.6",
    description: "组织知识 — 确保掌握完成工作所需的知识和技能",
    descriptionEn: "Organizational knowledge — ensure necessary knowledge to perform work",
    checkFrequency: "per_project",
  },
  {
    standard: "GRT-GS-004",
    clause: "全员",
    description: "三不原则 — 不接受不良品、不制造不良品、不传递不良品",
    descriptionEn: "Three-No principle — don't accept, create, or pass defects",
    checkFrequency: "per_task",
  },
];

// ─── 18 角色工作站配置 ──────────────────────────────────────

export const ROLE_WORKSTATION_CONFIGS: Record<string, RoleWorkstationConfig> = {
  // ══════════════════════ 系统角色 ══════════════════════
  admin: {
    roleId: "admin",
    roleName: "系统管理员",
    roleNameEn: "System Administrator",
    defaultAgentLevel: 4 as AgentLevel,
    responsibilities: {
      title: "系统管理员核心职责",
      titleEn: "System Administrator Core Responsibilities",
      items: [
        "维护系统架构安全与稳定运行",
        "管理用户账号、权限与角色分配",
        "执行定期安全审计和漏洞扫描",
        "监控服务器性能与资源使用",
        "管理数据库备份与灾难恢复",
        "协调ERP/钉钉/微信等第三方集成",
        "响应IT服务工单（4小时SLA）",
        "维护CI/CD流水线与部署脚本",
      ],
      itemsEn: [
        "Maintain system architecture security and stability",
        "Manage user accounts, permissions, and role assignments",
        "Perform regular security audits and vulnerability scans",
        "Monitor server performance and resource utilization",
        "Manage database backups and disaster recovery",
        "Coordinate ERP/DingTalk/WeChat integrations",
        "Respond to IT service tickets (4-hour SLA)",
        "Maintain CI/CD pipelines and deployment scripts",
      ],
    },
    sopReferences: [
      { code: "SOP-IT-001", title: "系统部署与版本更新流程", titleEn: "System Deployment & Update Process", category: "management", priority: "critical" },
      { code: "SOP-IT-002", title: "数据库备份与恢复操作", titleEn: "Database Backup & Recovery", category: "management", priority: "critical" },
      { code: "SOP-IT-003", title: "用户权限变更审批流程", titleEn: "User Permission Change Approval", category: "management", priority: "high" },
      { code: "SOP-IT-004", title: "安全事件应急响应流程", titleEn: "Security Incident Response", category: "safety", priority: "critical" },
    ],
    qualityRequirements: [
      ...COMMON_QUALITY_REQUIREMENTS,
      { standard: "ISO 27001", clause: "§A.9", description: "访问控制 — 最小权限原则，定期审查用户权限", descriptionEn: "Access control — least privilege, periodic access reviews", checkFrequency: "weekly" },
    ],
    workRequirements: [
      { id: "admin-d1", task: "检查系统监控告警", taskEn: "Check system monitoring alerts", frequency: "daily", tools: ["监控面板"], route: "/monitoring" },
      { id: "admin-d2", task: "审查安全日志", taskEn: "Review security logs", frequency: "daily", tools: ["审计日志"], route: "/security" },
      { id: "admin-w1", task: "执行数据库备份验证", taskEn: "Verify database backups", frequency: "weekly", tools: ["备份工具"] },
      { id: "admin-w2", task: "更新系统安全补丁", taskEn: "Apply security patches", frequency: "weekly", tools: ["部署脚本"] },
      { id: "admin-m1", task: "生成权限审计报告", taskEn: "Generate permission audit report", frequency: "monthly", tools: ["权限管理"], route: "/permissions" },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "系统监控", labelEn: "Monitoring", path: "/monitoring", icon: "Activity" },
      { label: "权限管理", labelEn: "Permissions", path: "/permissions", icon: "Shield" },
      { label: "安全面板", labelEn: "Security", path: "/security", icon: "Lock" },
      { label: "定时任务", labelEn: "Scheduler", path: "/scheduler", icon: "Clock" },
    ],
  },

  director: {
    roleId: "director",
    roleName: "总监",
    roleNameEn: "Director",
    defaultAgentLevel: 5 as AgentLevel,
    responsibilities: {
      title: "总监核心职责",
      titleEn: "Director Core Responsibilities",
      items: [
        "制定和推进公司年度战略目标(OKR)",
        "跨事业部资源协调与绩效评估",
        "审批重大项目投标与合同",
        "主持月度经营分析会",
        "审阅财务报表与预算执行情况",
        "代表公司参加行业会议与客户高层拜访",
        "批准组织架构调整与人事任命",
        "监督安全生产与合规运营",
      ],
      itemsEn: [
        "Set and drive annual strategic goals (OKR)",
        "Cross-BU resource coordination and performance evaluation",
        "Approve major project bids and contracts",
        "Chair monthly business review meetings",
        "Review financial statements and budget execution",
        "Represent company at industry events and C-level client visits",
        "Approve organizational changes and personnel appointments",
        "Oversee production safety and regulatory compliance",
      ],
    },
    sopReferences: [
      { code: "SOP-MGT-001", title: "重大决策审批流程", titleEn: "Major Decision Approval Process", category: "management", priority: "critical" },
      { code: "SOP-MGT-002", title: "月度经营分析会流程", titleEn: "Monthly Business Review Process", category: "management", priority: "high" },
      { code: "SOP-MGT-003", title: "OKR制定与复盘流程", titleEn: "OKR Setting & Review Process", category: "management", priority: "high" },
    ],
    qualityRequirements: [
      ...COMMON_QUALITY_REQUIREMENTS,
      { standard: "ISO 9001:2015", clause: "§5.1", description: "领导作用 — 确保质量目标与战略一致", descriptionEn: "Leadership — ensure quality objectives align with strategy", checkFrequency: "per_gate" },
    ],
    workRequirements: [
      { id: "dir-d1", task: "审阅当日重要审批事项", taskEn: "Review daily important approvals", frequency: "daily", tools: ["OA审批"], route: "/oa-forms" },
      { id: "dir-w1", task: "周度经营数据看板审阅", taskEn: "Review weekly operations dashboard", frequency: "weekly", tools: ["战略仪表板"], route: "/strategy" },
      { id: "dir-m1", task: "主持月度经营分析会", taskEn: "Chair monthly business review", frequency: "monthly", tools: ["会议系统"], route: "/meeting-intelligence" },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "战略仪表板", labelEn: "Strategy Dashboard", path: "/strategy", icon: "Target" },
      { label: "OKR看板", labelEn: "OKR Board", path: "/strategy", icon: "BarChart3" },
      { label: "审批中心", labelEn: "Approval Center", path: "/oa-forms", icon: "ClipboardList" },
    ],
  },

  bu_gm: {
    roleId: "bu_gm",
    roleName: "事业部总经理",
    roleNameEn: "BU General Manager",
    defaultAgentLevel: 5 as AgentLevel,
    responsibilities: {
      title: "事业部总经理核心职责",
      titleEn: "BU GM Core Responsibilities",
      items: [
        "事业部年度营收目标达成（P&L责任）",
        "客户战略开发与大客户维护",
        "项目组合管理（M0-M12全流程）",
        "团队建设与组织优化",
        "预算编制与成本控制审批",
        "关键节点质量评审Gate Review",
        "市场竞争策略制定",
        "技术路线图规划参与",
      ],
      itemsEn: [
        "Annual BU revenue target achievement (P&L responsibility)",
        "Strategic customer development and key account management",
        "Project portfolio management (M0-M12 lifecycle)",
        "Team building and organizational optimization",
        "Budget preparation and cost control approval",
        "Key gate review quality assessments",
        "Market competition strategy development",
        "Technology roadmap planning participation",
      ],
    },
    sopReferences: [
      { code: "SOP-BU-001", title: "项目立项审批流程 (M0→M1)", titleEn: "Project Initiation Approval (M0→M1)", category: "management", priority: "critical" },
      { code: "SOP-BU-002", title: "客户报价审批流程", titleEn: "Customer Quotation Approval", category: "management", priority: "critical" },
      { code: "SOP-BU-003", title: "事业部预算月度执行评审", titleEn: "BU Monthly Budget Review", category: "management", priority: "high" },
    ],
    qualityRequirements: [
      ...COMMON_QUALITY_REQUIREMENTS,
      { standard: "ISO 9001:2015", clause: "§5.2", description: "质量方针 — 确保BU质量目标可测量、可追踪", descriptionEn: "Quality policy — ensure BU quality objectives are measurable", checkFrequency: "per_gate" },
    ],
    workRequirements: [
      { id: "gm-d1", task: "审阅BU当日项目进度", taskEn: "Review BU daily project progress", frequency: "daily", tools: ["项目看板"], route: "/pos" },
      { id: "gm-w1", task: "主持BU周度例会", taskEn: "Chair BU weekly meeting", frequency: "weekly", tools: ["会议系统"], route: "/meeting-intelligence" },
      { id: "gm-m1", task: "BU月度经营分析", taskEn: "BU monthly business analysis", frequency: "monthly", tools: ["BU绩效"], route: "/bu-performance" },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "BU概览", labelEn: "BU Overview", path: "/bu-performance", icon: "BarChart3" },
      { label: "项目看板", labelEn: "Project Board", path: "/pos", icon: "FolderKanban" },
      { label: "年度日程", labelEn: "Annual Agenda", path: "/annual-agenda", icon: "Calendar" },
    ],
  },

  // ══════════════════════ BU 业务角色 ══════════════════════
  bu_pm: {
    roleId: "bu_pm",
    roleName: "项目经理",
    roleNameEn: "Project Manager",
    defaultAgentLevel: 3 as AgentLevel,
    responsibilities: {
      title: "项目经理核心职责",
      titleEn: "Project Manager Core Responsibilities",
      items: [
        "项目全生命周期管理（M0-M12阶段门）",
        "编制项目计划与WBS分解",
        "跨部门协调（设计/采购/生产/服务）",
        "项目风险识别与变更管理",
        "客户需求对接与技术澄清",
        "监控T1-T15任务节点完成度",
        "组织Gate Review评审会议",
        "项目成本控制与利润达成",
      ],
      itemsEn: [
        "Full lifecycle project management (M0-M12 gate model)",
        "Project plan preparation and WBS breakdown",
        "Cross-department coordination (Design/Procurement/Production/Service)",
        "Project risk identification and change management",
        "Customer requirement alignment and technical clarification",
        "Monitor T1-T15 task milestone completion",
        "Organize Gate Review meetings",
        "Project cost control and profit achievement",
      ],
    },
    sopReferences: [
      { code: "SOP-PM-001", title: "项目立项流程 (M0→M1)", titleEn: "Project Initiation (M0→M1)", category: "management", priority: "critical", processCode: "M0" },
      { code: "SOP-PM-002", title: "阶段门评审执行流程 (Gate Review)", titleEn: "Gate Review Execution Process", category: "management", priority: "critical" },
      { code: "SOP-PM-003", title: "项目变更控制流程 (ECN/ECO)", titleEn: "Project Change Control (ECN/ECO)", category: "management", priority: "high" },
      { code: "SOP-BOM-001", title: "BOM创建与审批流程", titleEn: "BOM Creation & Approval", category: "bom", priority: "critical", processCode: "T3" },
      { code: "SOP-BOM-002", title: "BOM版本变更管理", titleEn: "BOM Version Change Management", category: "bom", priority: "high" },
      { code: "SOP-PM-004", title: "客户需求跟踪表管理", titleEn: "Customer Requirement Tracking", category: "management", priority: "high" },
      { code: "SOP-PM-005", title: "项目风险登记簿维护", titleEn: "Project Risk Register Maintenance", category: "management", priority: "normal" },
    ],
    qualityRequirements: [
      ...COMMON_QUALITY_REQUIREMENTS,
      { standard: "IATF 16949", clause: "§8.3.2", description: "设计和开发策划 — 项目里程碑与质量验证点一致", descriptionEn: "Design & dev planning — milestones aligned with quality gates", checkFrequency: "per_gate" },
      { standard: "IATF 16949", clause: "§8.3.4", description: "设计和开发评审 — Gate Review必须有质量代表参与", descriptionEn: "Design review — Gate Review must include quality representative", checkFrequency: "per_gate" },
      { standard: "VDA 6.3", clause: "P3", description: "产品与过程开发策划 — 确保APQP时间表可行", descriptionEn: "Product/process development planning — ensure APQP timeline feasibility", checkFrequency: "per_project" },
    ],
    workRequirements: [
      { id: "pm-d1", task: "更新项目进度看板", taskEn: "Update project progress board", frequency: "daily", tools: ["项目看板", "甘特图"], route: "/pos" },
      { id: "pm-d2", task: "检查T节点到期任务", taskEn: "Check T-milestone due tasks", frequency: "daily", tools: ["任务驾驶舱"], route: "/task-cockpit" },
      { id: "pm-w1", task: "组织项目周例会", taskEn: "Organize weekly project meeting", frequency: "weekly", tools: ["会议系统"], route: "/meeting-intelligence" },
      { id: "pm-w2", task: "更新风险登记簿", taskEn: "Update risk register", frequency: "weekly", tools: ["风险管理"], route: "/projects" },
      { id: "pm-pe", task: "Gate Review评审材料准备", taskEn: "Prepare Gate Review materials", frequency: "per_event", tools: ["阶段门管理"], route: "/stage-gate" },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "项目看板", labelEn: "Project Board", path: "/pos", icon: "FolderKanban" },
      { label: "阶段门", labelEn: "Stage Gate", path: "/stage-gate", icon: "Target" },
      { label: "BOM管理", labelEn: "BOM", path: "/bom-management", icon: "Package" },
      { label: "任务驾驶舱", labelEn: "Task Cockpit", path: "/task-cockpit", icon: "Gauge" },
    ],
  },

  bu_sales: {
    roleId: "bu_sales",
    roleName: "销售工程师",
    roleNameEn: "Sales Engineer",
    defaultAgentLevel: 2 as AgentLevel,
    responsibilities: {
      title: "销售工程师核心职责",
      titleEn: "Sales Engineer Core Responsibilities",
      items: [
        "客户开发与商机管理（CRM录入/跟进）",
        "技术方案编写与客户需求澄清",
        "报价策略制定与价格谈判",
        "竞品分析与差异化定位",
        "售前技术支持与投标响应",
        "客户拜访计划执行（每月≥8家）",
        "合同条款审核与签约推进",
        "项目立项申请（M0）提交",
      ],
      itemsEn: [
        "Customer development and opportunity management (CRM entry/follow-up)",
        "Technical proposal writing and customer requirement clarification",
        "Pricing strategy development and price negotiation",
        "Competitor analysis and differentiation positioning",
        "Pre-sales technical support and bid response",
        "Customer visit plan execution (≥8 visits/month)",
        "Contract terms review and signing facilitation",
        "Project initiation request (M0) submission",
      ],
    },
    sopReferences: [
      { code: "SOP-SALES-001", title: "客户需求调研与技术评估流程", titleEn: "Customer Requirement Survey & Technical Assessment", category: "management", priority: "critical" },
      { code: "SOP-SALES-002", title: "报价审批流程（<50万/≥50万）", titleEn: "Quotation Approval Process (<500K/≥500K)", category: "management", priority: "critical" },
      { code: "SOP-SALES-003", title: "投标文件编制流程", titleEn: "Bid Document Preparation", category: "management", priority: "high" },
      { code: "SOP-BOM-003", title: "报价BOM估算参考", titleEn: "Quotation BOM Estimation Reference", category: "bom", priority: "high" },
    ],
    qualityRequirements: [
      ...COMMON_QUALITY_REQUIREMENTS,
      { standard: "IATF 16949", clause: "§8.2", description: "产品和服务的要求 — 客户需求必须完整评审后录入系统", descriptionEn: "Product/service requirements — customer needs must be fully reviewed before system entry", checkFrequency: "per_project" },
    ],
    workRequirements: [
      { id: "sales-d1", task: "更新CRM商机进度", taskEn: "Update CRM opportunity progress", frequency: "daily", tools: ["CRM"], route: "/crm" },
      { id: "sales-d2", task: "回复客户邮件/消息（2小时内）", taskEn: "Reply to customer messages (within 2hrs)", frequency: "daily", tools: ["邮件", "钉钉"] },
      { id: "sales-w1", task: "提交周度销售报告", taskEn: "Submit weekly sales report", frequency: "weekly", tools: ["报表中心"], route: "/report-center" },
      { id: "sales-m1", task: "客户拜访计划执行（≥8家/月）", taskEn: "Execute visit plan (≥8/month)", frequency: "monthly", tools: ["CRM"], route: "/crm" },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "CRM管理", labelEn: "CRM", path: "/crm", icon: "Users" },
      { label: "报价管理", labelEn: "Quotation", path: "/operations/new-project", icon: "FileText" },
      { label: "客户问卷", labelEn: "Questionnaire", path: "/customer-questionnaire", icon: "ClipboardList" },
    ],
  },

  bu_mech: {
    roleId: "bu_mech",
    roleName: "机械设计工程师",
    roleNameEn: "Mechanical Design Engineer",
    defaultAgentLevel: 3 as AgentLevel,
    responsibilities: {
      title: "机械设计工程师核心职责",
      titleEn: "Mechanical Design Engineer Core Responsibilities",
      items: [
        "清洗设备机械结构设计（SolidWorks 3D建模）",
        "BOM编制与管理（200-500行项）",
        "FMEA/DVP&R/控制计划编制",
        "材料选型与成本优化",
        "图纸审查与公差分析（GD&T）",
        "工艺路线规划与加工工艺评审",
        "设计变更ECN/ECO评估与执行",
        "设计评审参与与技术文档归档(PLM)",
      ],
      itemsEn: [
        "Cleaning equipment mechanical structure design (SolidWorks 3D modeling)",
        "BOM preparation and management (200-500 line items)",
        "FMEA/DVP&R/Control plan preparation",
        "Material selection and cost optimization",
        "Drawing review and tolerance analysis (GD&T)",
        "Process routing planning and manufacturing process review",
        "Design change ECN/ECO evaluation and execution",
        "Design review participation and technical document archival (PLM)",
      ],
    },
    sopReferences: [
      { code: "SOP-BOM-001", title: "BOM创建与审批流程", titleEn: "BOM Creation & Approval", category: "bom", priority: "critical", processCode: "T3" },
      { code: "SOP-BOM-002", title: "BOM版本变更管理（ECN触发）", titleEn: "BOM Version Change Mgmt (ECN trigger)", category: "bom", priority: "critical" },
      { code: "SOP-BOM-004", title: "BOM物料替代审批流程", titleEn: "BOM Material Substitution Approval", category: "bom", priority: "high" },
      { code: "SOP-MECH-001", title: "设计图纸出图检查清单", titleEn: "Design Drawing Release Checklist", category: "design", priority: "critical" },
      { code: "SOP-MECH-002", title: "FMEA编制与更新流程", titleEn: "FMEA Preparation & Update", category: "quality", priority: "critical" },
      { code: "SOP-MECH-003", title: "设计评审(DR)流程", titleEn: "Design Review (DR) Process", category: "design", priority: "high" },
      { code: "SOP-MECH-004", title: "零件加工工艺路线编制", titleEn: "Part Manufacturing Route Planning", category: "production", priority: "normal" },
    ],
    qualityRequirements: [
      ...COMMON_QUALITY_REQUIREMENTS,
      { standard: "IATF 16949", clause: "§8.3.3", description: "设计和开发输入 — BOM必须包含所有客户要求的输入项", descriptionEn: "Design input — BOM must include all customer-required inputs", checkFrequency: "per_project" },
      { standard: "IATF 16949", clause: "§8.3.5", description: "设计和开发输出 — 图纸/BOM/FMEA/CP必须经过审批才能release", descriptionEn: "Design output — drawings/BOM/FMEA/CP must be approved before release", checkFrequency: "per_gate" },
      { standard: "ISO 2768", clause: "General", description: "一般公差标注 — 所有图纸必须标注公差等级(m/f/c)", descriptionEn: "General tolerances — all drawings must specify tolerance class", checkFrequency: "per_task" },
    ],
    workRequirements: [
      { id: "mech-d1", task: "更新设计任务进度", taskEn: "Update design task progress", frequency: "daily", tools: ["任务看板"], route: "/tasks" },
      { id: "mech-d2", task: "BOM变更检查（有无待处理ECN）", taskEn: "BOM change check (pending ECN)", frequency: "daily", tools: ["BOM管理"], route: "/bom-management" },
      { id: "mech-w1", task: "参加设计评审会(DR)", taskEn: "Attend design review (DR)", frequency: "weekly", tools: ["PLM"], route: "/plm" },
      { id: "mech-pp", task: "FMEA更新（新项目/变更时）", taskEn: "FMEA update (new project/change)", frequency: "per_project", tools: ["FMEA"], route: "/fmea" },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "PLM工作台", labelEn: "PLM", path: "/plm", icon: "FileText" },
      { label: "BOM管理", labelEn: "BOM", path: "/bom-management", icon: "Package" },
      { label: "FMEA", labelEn: "FMEA", path: "/fmea", icon: "AlertTriangle" },
      { label: "图纸库", labelEn: "Drawing Library", path: "/drawing-library", icon: "FileImage" },
    ],
  },

  bu_elec: {
    roleId: "bu_elec",
    roleName: "电气设计工程师",
    roleNameEn: "Electrical Design Engineer",
    defaultAgentLevel: 3 as AgentLevel,
    responsibilities: {
      title: "电气设计工程师核心职责",
      titleEn: "Electrical Design Engineer Core Responsibilities",
      items: [
        "电气控制系统设计（EPLAN P8原理图）",
        "PLC程序编写与调试（Inovance/Siemens）",
        "传感器选型与信号采集方案设计",
        "HMI触摸屏界面开发",
        "电气BOM编制与审查",
        "CE/UL等国际认证合规设计",
        "自动化集成方案制定",
        "现场调试支持与问题解决",
      ],
      itemsEn: [
        "Electrical control system design (EPLAN P8 schematics)",
        "PLC programming and debugging (Inovance/Siemens)",
        "Sensor selection and signal acquisition design",
        "HMI touchscreen interface development",
        "Electrical BOM preparation and review",
        "CE/UL certification compliance design",
        "Automation integration solution development",
        "On-site commissioning support and troubleshooting",
      ],
    },
    sopReferences: [
      { code: "SOP-BOM-001", title: "BOM创建与审批流程", titleEn: "BOM Creation & Approval", category: "bom", priority: "critical", processCode: "T3" },
      { code: "SOP-BOM-005", title: "电气BOM编制标准", titleEn: "Electrical BOM Standard", category: "bom", priority: "critical" },
      { code: "SOP-ELEC-001", title: "EPLAN出图与审查流程", titleEn: "EPLAN Drawing Release & Review", category: "design", priority: "critical" },
      { code: "SOP-ELEC-002", title: "PLC程序版本管理流程", titleEn: "PLC Program Version Management", category: "design", priority: "critical" },
      { code: "SOP-ELEC-003", title: "电气安全测试规范", titleEn: "Electrical Safety Test Standard", category: "safety", priority: "critical" },
      { code: "SOP-ELEC-004", title: "CE合规设计检查清单", titleEn: "CE Compliance Design Checklist", category: "quality", priority: "high" },
    ],
    qualityRequirements: [
      ...COMMON_QUALITY_REQUIREMENTS,
      { standard: "IATF 16949", clause: "§8.3.5", description: "设计输出 — 电气图纸必须经过交叉审查才能发布", descriptionEn: "Design output — electrical drawings must be cross-reviewed before release", checkFrequency: "per_gate" },
      { standard: "IEC 60204-1", clause: "General", description: "机械电气安全 — 急停回路/安全联锁/接地保护必须符合标准", descriptionEn: "Machine electrical safety — E-stop/safety interlock/grounding must comply", checkFrequency: "per_project" },
    ],
    workRequirements: [
      { id: "elec-d1", task: "更新电气设计进度", taskEn: "Update electrical design progress", frequency: "daily", tools: ["任务看板"], route: "/tasks" },
      { id: "elec-w1", task: "PLC程序备份与版本提交", taskEn: "PLC program backup & version commit", frequency: "weekly", tools: ["PLC版本管理"], route: "/plm" },
      { id: "elec-pp", task: "电气BOM编制（新项目启动时）", taskEn: "Electrical BOM preparation (project start)", frequency: "per_project", tools: ["BOM管理"], route: "/bom-management" },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "PLM工作台", labelEn: "PLM", path: "/plm", icon: "Zap" },
      { label: "BOM管理", labelEn: "BOM", path: "/bom-management", icon: "Package" },
      { label: "测试管理", labelEn: "Test Engine", path: "/test-engine", icon: "CheckCircle" },
    ],
  },

  procurement_eng: {
    roleId: "procurement_eng",
    roleName: "采购工程师",
    roleNameEn: "Procurement Engineer",
    defaultAgentLevel: 2 as AgentLevel,
    responsibilities: {
      title: "采购工程师核心职责",
      titleEn: "Procurement Engineer Core Responsibilities",
      items: [
        "供应商开发与QCD评估",
        "采购订单管理与交期跟踪",
        "BOM物料询价与比价",
        "供应链风险预警与应急处理",
        "来料检验(IQC)协调",
        "IATF 16949供应商审核配合",
        "成本分析与议价策略执行",
        "供应商绩效评估（月度/年度）",
      ],
      itemsEn: [
        "Supplier development and QCD evaluation",
        "Purchase order management and delivery tracking",
        "BOM material inquiry and price comparison",
        "Supply chain risk alert and emergency handling",
        "Incoming quality check (IQC) coordination",
        "IATF 16949 supplier audit support",
        "Cost analysis and negotiation strategy execution",
        "Supplier performance evaluation (monthly/annual)",
      ],
    },
    sopReferences: [
      { code: "SOP-PROC-001", title: "采购申请与审批流程", titleEn: "Purchase Requisition & Approval", category: "procurement", priority: "critical" },
      { code: "SOP-PROC-002", title: "供应商准入评审流程", titleEn: "Supplier Qualification Review", category: "procurement", priority: "critical" },
      { code: "SOP-BOM-006", title: "BOM物料采购对照检查", titleEn: "BOM Material Procurement Cross-check", category: "bom", priority: "high" },
      { code: "SOP-PROC-003", title: "来料检验(IQC)不合格处理", titleEn: "IQC Non-conformance Handling", category: "quality", priority: "high" },
    ],
    qualityRequirements: [
      ...COMMON_QUALITY_REQUIREMENTS,
      { standard: "IATF 16949", clause: "§8.4", description: "外部提供的过程/产品/服务 — 供应商必须按PPAP提交样件", descriptionEn: "External provision — suppliers must submit PPAP samples", checkFrequency: "per_project" },
    ],
    workRequirements: [
      { id: "proc-d1", task: "检查采购订单交期状态", taskEn: "Check PO delivery status", frequency: "daily", tools: ["采购管理"], route: "/procurement" },
      { id: "proc-d2", task: "处理来料检验异常", taskEn: "Handle IQC exceptions", frequency: "daily", tools: ["供应链"], route: "/supply-chain" },
      { id: "proc-w1", task: "供应商交付准时率统计", taskEn: "Supplier OTD rate report", frequency: "weekly", tools: ["供应商管理"], route: "/supply-chain" },
      { id: "proc-m1", task: "供应商月度绩效评估", taskEn: "Monthly supplier performance review", frequency: "monthly", tools: ["供应商评估"], route: "/supply-chain" },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "采购管理", labelEn: "Procurement", path: "/procurement", icon: "ShoppingCart" },
      { label: "供应链", labelEn: "Supply Chain", path: "/supply-chain", icon: "Truck" },
      { label: "仓库管理", labelEn: "Warehouse", path: "/warehouse-management", icon: "Package" },
    ],
  },

  cs_engineer: {
    roleId: "cs_engineer",
    roleName: "客服/售后工程师",
    roleNameEn: "Service Engineer",
    defaultAgentLevel: 2 as AgentLevel,
    responsibilities: {
      title: "客服/售后工程师核心职责",
      titleEn: "Service Engineer Core Responsibilities",
      items: [
        "现场安装调试与客户验收(FAT/SAT)",
        "售后服务工单处理与故障诊断",
        "客户培训（设备操作/日常维护）",
        "8D报告编写与CAPA闭环跟踪",
        "备件需求评估与库存管理",
        "设备保养计划制定与执行",
        "服务合同管理与到期提醒",
        "现场问题→设计改进反馈(ECR)",
      ],
      itemsEn: [
        "On-site installation, commissioning & acceptance (FAT/SAT)",
        "After-sales service ticket handling and fault diagnosis",
        "Customer training (equipment operation/daily maintenance)",
        "8D report writing and CAPA closure tracking",
        "Spare parts demand assessment and inventory management",
        "Equipment maintenance plan development and execution",
        "Service contract management and expiry reminder",
        "Field issue → design improvement feedback (ECR)",
      ],
    },
    sopReferences: [
      { code: "SOP-SVC-001", title: "现场安装调试流程(FAT)", titleEn: "On-site Installation & Commissioning (FAT)", category: "service", priority: "critical" },
      { code: "SOP-SVC-002", title: "客户验收流程(SAT)", titleEn: "Customer Acceptance (SAT)", category: "service", priority: "critical" },
      { code: "SOP-SVC-003", title: "售后故障诊断与8D流程", titleEn: "After-sales Fault Diagnosis & 8D", category: "quality", priority: "critical" },
      { code: "SOP-SVC-004", title: "备件申请与发货流程", titleEn: "Spare Parts Request & Shipping", category: "service", priority: "high" },
      { code: "SOP-BOM-007", title: "备件BOM对照与替代确认", titleEn: "Spare Parts BOM Cross-check & Substitution", category: "bom", priority: "normal" },
    ],
    qualityRequirements: [
      ...COMMON_QUALITY_REQUIREMENTS,
      { standard: "IATF 16949", clause: "§10.2", description: "不合格和纠正措施 — 现场问题必须在48小时内启动8D流程", descriptionEn: "NC & corrective actions — field issues must initiate 8D within 48hrs", checkFrequency: "per_event" as "per_task" },
    ],
    workRequirements: [
      { id: "svc-d1", task: "检查服务工单状态", taskEn: "Check service ticket status", frequency: "daily", tools: ["工单系统"], route: "/after-sales" },
      { id: "svc-d2", task: "更新现场进度（在外出差时）", taskEn: "Update field progress (when on-site)", frequency: "daily", tools: ["移动端"] },
      { id: "svc-w1", task: "备件库存盘点", taskEn: "Spare parts inventory check", frequency: "weekly", tools: ["备件管理"], route: "/after-sales" },
      { id: "svc-pe", task: "8D报告完成（故障发生后5天内）", taskEn: "Complete 8D report (within 5 days)", frequency: "per_event", tools: ["8D系统"], route: "/eight-d-capa" },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "服务工单", labelEn: "Service Tickets", path: "/after-sales", icon: "Headphones" },
      { label: "备件管理", labelEn: "Spare Parts", path: "/after-sales", icon: "Package" },
      { label: "8D/CAPA", labelEn: "8D/CAPA", path: "/eight-d-capa", icon: "AlertTriangle" },
      { label: "知识库", labelEn: "Knowledge Base", path: "/knowledge-base", icon: "BookOpen" },
    ],
  },

  // ══════════════════════ 部门管理角色 ══════════════════════
  dept_manager: {
    roleId: "dept_manager",
    roleName: "部门经理",
    roleNameEn: "Department Manager",
    defaultAgentLevel: 4 as AgentLevel,
    responsibilities: {
      title: "部门经理核心职责",
      titleEn: "Department Manager Core Responsibilities",
      items: [
        "部门年度目标与KPI制定",
        "团队绩效评估与人才培养",
        "部门预算编制与执行监控",
        "跨部门协作与资源协调",
        "部门工作流程优化",
        "员工培训计划安排",
        "异常问题升级处理",
        "部门周/月报编制提交",
      ],
      itemsEn: [
        "Department annual goals and KPI setting",
        "Team performance evaluation and talent development",
        "Department budget preparation and execution monitoring",
        "Cross-department collaboration and resource coordination",
        "Department workflow optimization",
        "Employee training plan arrangement",
        "Escalated issue handling",
        "Department weekly/monthly report submission",
      ],
    },
    sopReferences: [
      { code: "SOP-MGT-004", title: "部门预算编制与审批流程", titleEn: "Department Budget Preparation & Approval", category: "management", priority: "high" },
      { code: "SOP-MGT-005", title: "员工绩效考核流程", titleEn: "Employee Performance Review Process", category: "management", priority: "high" },
      { code: "SOP-MGT-006", title: "部门周/月报编制要求", titleEn: "Department Weekly/Monthly Report Requirements", category: "management", priority: "normal" },
    ],
    qualityRequirements: COMMON_QUALITY_REQUIREMENTS,
    workRequirements: [
      { id: "dm-d1", task: "审核部门当日任务进度", taskEn: "Review daily department task progress", frequency: "daily", tools: ["任务看板"], route: "/task-cockpit" },
      { id: "dm-w1", task: "主持部门周例会", taskEn: "Chair department weekly meeting", frequency: "weekly", tools: ["会议系统"], route: "/meeting-intelligence" },
      { id: "dm-m1", task: "提交部门月度报告", taskEn: "Submit monthly department report", frequency: "monthly", tools: ["报表中心"], route: "/report-center" },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "任务驾驶舱", labelEn: "Task Cockpit", path: "/task-cockpit", icon: "Gauge" },
      { label: "绩效管理", labelEn: "Performance", path: "/kpi-performance", icon: "Target" },
      { label: "团队管理", labelEn: "Team", path: "/employee-management", icon: "Users" },
    ],
  },

  team_lead: {
    roleId: "team_lead",
    roleName: "组长/主管",
    roleNameEn: "Team Leader",
    defaultAgentLevel: 2 as AgentLevel,
    responsibilities: {
      title: "组长/主管核心职责",
      titleEn: "Team Leader Core Responsibilities",
      items: [
        "团队日常任务分配与进度管理",
        "下属绩效辅导与技能培养",
        "生产/装配进度实时跟踪",
        "首件检验与过程巡检",
        "异常问题快速响应（30分钟内）",
        "早会/晚会/交接班管理",
        "5S现场管理检查",
        "安全隐患巡查与上报",
      ],
      itemsEn: [
        "Daily task assignment and progress management",
        "Subordinate coaching and skill development",
        "Production/assembly progress real-time tracking",
        "First article inspection and process patrol",
        "Quick response to anomalies (within 30 min)",
        "Morning/evening meeting and shift handover management",
        "5S workplace management inspection",
        "Safety hazard inspection and reporting",
      ],
    },
    sopReferences: [
      { code: "SOP-PROD-001", title: "首件检验流程", titleEn: "First Article Inspection Process", category: "quality", priority: "critical" },
      { code: "SOP-PROD-002", title: "生产交接班流程", titleEn: "Shift Handover Process", category: "production", priority: "critical" },
      { code: "SOP-PROD-003", title: "生产异常处理流程", titleEn: "Production Anomaly Handling", category: "production", priority: "critical" },
      { code: "SOP-BOM-008", title: "生产BOM领料对照检查", titleEn: "Production BOM Material Picking Check", category: "bom", priority: "high" },
    ],
    qualityRequirements: [
      ...COMMON_QUALITY_REQUIREMENTS,
      { standard: "IATF 16949", clause: "§8.5.1", description: "生产和服务提供的控制 — 首件检验必须100%执行", descriptionEn: "Production control — first article inspection must be 100% executed", checkFrequency: "per_task" },
      { standard: "VDA 6.3", clause: "P6.1", description: "过程输入 — 生产前必须确认BOM/SOP/工装齐备", descriptionEn: "Process input — confirm BOM/SOP/tooling ready before production", checkFrequency: "daily" },
    ],
    workRequirements: [
      { id: "tl-d1", task: "主持早会（昨日总结+今日计划）", taskEn: "Morning meeting (yesterday review + today plan)", frequency: "daily", tools: ["车间看板"], route: "/shopfloor" },
      { id: "tl-d2", task: "巡检生产现场5S与安全", taskEn: "Inspect production floor 5S and safety", frequency: "daily", tools: ["巡检记录"] },
      { id: "tl-d3", task: "更新生产进度看板", taskEn: "Update production progress board", frequency: "daily", tools: ["生产执行"], route: "/production-execution" },
      { id: "tl-w1", task: "提交周度生产报告", taskEn: "Submit weekly production report", frequency: "weekly", tools: ["报表"] },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "车间看板", labelEn: "Shopfloor", path: "/shopfloor", icon: "Factory" },
      { label: "生产执行", labelEn: "Production", path: "/production-execution", icon: "Wrench" },
      { label: "交接班", labelEn: "Shift Handover", path: "/shift-handover", icon: "Clock" },
    ],
  },

  // ══════════════════════ 职能角色 ══════════════════════
  hr_manager: {
    roleId: "hr_manager",
    roleName: "HR经理",
    roleNameEn: "HR Manager",
    defaultAgentLevel: 3 as AgentLevel,
    responsibilities: {
      title: "HR经理核心职责",
      titleEn: "HR Manager Core Responsibilities",
      items: [
        "人力资源战略规划与年度编制",
        "招聘渠道管理与人才画像匹配",
        "薪酬福利体系设计与调整",
        "组织发展与人才梯队建设",
        "员工关系管理与劳动合规",
        "培训体系搭建与效果评估",
        "绩效考核制度设计与执行",
        "企业文化建设与员工满意度",
      ],
      itemsEn: [
        "HR strategic planning and annual workforce planning",
        "Recruitment channel management and talent profiling",
        "Compensation and benefits system design",
        "Organization development and talent pipeline building",
        "Employee relations and labor compliance",
        "Training system building and effectiveness evaluation",
        "Performance review system design and execution",
        "Corporate culture building and employee satisfaction",
      ],
    },
    sopReferences: [
      { code: "SOP-HR-001", title: "招聘流程（需求→面试→录用）", titleEn: "Recruitment Process (Req→Interview→Offer)", category: "hr", priority: "critical" },
      { code: "SOP-HR-002", title: "员工入职流程", titleEn: "Employee Onboarding Process", category: "hr", priority: "critical" },
      { code: "SOP-HR-003", title: "员工离职流程", titleEn: "Employee Offboarding Process", category: "hr", priority: "high" },
      { code: "SOP-HR-004", title: "绩效考核执行流程", titleEn: "Performance Review Execution", category: "hr", priority: "high" },
    ],
    qualityRequirements: COMMON_QUALITY_REQUIREMENTS,
    workRequirements: [
      { id: "hr-d1", task: "审核招聘简历", taskEn: "Review recruitment resumes", frequency: "daily", tools: ["招聘系统"] },
      { id: "hr-w1", task: "更新人力资源周报", taskEn: "Update HR weekly report", frequency: "weekly", tools: ["HR系统"], route: "/employee-management" },
      { id: "hr-m1", task: "薪酬核算与发放确认", taskEn: "Payroll calculation and confirmation", frequency: "monthly", tools: ["薪酬系统"], route: "/compensation" },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "员工管理", labelEn: "Employees", path: "/employee-management", icon: "Users" },
      { label: "绩效管理", labelEn: "Performance", path: "/kpi-performance", icon: "Target" },
      { label: "培训管理", labelEn: "Training", path: "/training", icon: "GraduationCap" },
    ],
  },

  hr_specialist: {
    roleId: "hr_specialist",
    roleName: "HR专员",
    roleNameEn: "HR Specialist",
    defaultAgentLevel: 1 as AgentLevel,
    responsibilities: {
      title: "HR专员核心职责",
      titleEn: "HR Specialist Core Responsibilities",
      items: [
        "员工信息管理与档案维护",
        "招聘流程执行与面试安排",
        "培训计划执行与出勤追踪",
        "考勤管理与社保公积金操作",
        "员工入转调离手续办理",
        "劳动合同管理与续签提醒",
        "人事报表编制",
        "员工活动组织",
      ],
      itemsEn: [
        "Employee information management and file maintenance",
        "Recruitment process execution and interview scheduling",
        "Training plan execution and attendance tracking",
        "Attendance management and social insurance operations",
        "Employee onboarding/transfer/resignation processing",
        "Labor contract management and renewal reminders",
        "HR report preparation",
        "Employee activity organization",
      ],
    },
    sopReferences: [
      { code: "SOP-HR-002", title: "员工入职流程", titleEn: "Employee Onboarding Process", category: "hr", priority: "critical" },
      { code: "SOP-HR-003", title: "员工离职流程", titleEn: "Employee Offboarding Process", category: "hr", priority: "high" },
      { code: "SOP-HR-005", title: "考勤异常处理流程", titleEn: "Attendance Anomaly Handling", category: "hr", priority: "normal" },
    ],
    qualityRequirements: COMMON_QUALITY_REQUIREMENTS,
    workRequirements: [
      { id: "hrs-d1", task: "处理考勤异常记录", taskEn: "Handle attendance anomalies", frequency: "daily", tools: ["考勤系统"] },
      { id: "hrs-d2", task: "更新员工信息变动", taskEn: "Update employee info changes", frequency: "daily", tools: ["HR系统"], route: "/employee-management" },
      { id: "hrs-m1", task: "社保公积金月度申报", taskEn: "Monthly social insurance declaration", frequency: "monthly", tools: ["薪酬系统"] },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "员工管理", labelEn: "Employees", path: "/employee-management", icon: "Users" },
      { label: "培训", labelEn: "Training", path: "/training", icon: "GraduationCap" },
    ],
  },

  finance_manager: {
    roleId: "finance_manager",
    roleName: "财务经理",
    roleNameEn: "Finance Manager",
    defaultAgentLevel: 4 as AgentLevel,
    responsibilities: {
      title: "财务经理核心职责",
      titleEn: "Finance Manager Core Responsibilities",
      items: [
        "公司财务战略与全面预算管理",
        "成本分析与利润优化建议",
        "税务筹划与审计配合",
        "资金流管理与风险控制",
        "财务报表编制与经营分析",
        "固定资产管理与折旧核算",
        "项目成本核算与利润分析",
        "财务制度优化与合规检查",
      ],
      itemsEn: [
        "Financial strategy and comprehensive budget management",
        "Cost analysis and profit optimization recommendations",
        "Tax planning and audit coordination",
        "Cash flow management and risk control",
        "Financial statement preparation and business analysis",
        "Fixed asset management and depreciation accounting",
        "Project cost accounting and profit analysis",
        "Financial policy optimization and compliance checks",
      ],
    },
    sopReferences: [
      { code: "SOP-FIN-001", title: "费用报销审批流程", titleEn: "Expense Reimbursement Approval", category: "finance", priority: "critical" },
      { code: "SOP-FIN-002", title: "项目成本核算流程", titleEn: "Project Cost Accounting Process", category: "finance", priority: "critical" },
      { code: "SOP-FIN-003", title: "采购付款审批流程", titleEn: "Purchase Payment Approval", category: "finance", priority: "high" },
    ],
    qualityRequirements: COMMON_QUALITY_REQUIREMENTS,
    workRequirements: [
      { id: "fin-d1", task: "审核费用报销单", taskEn: "Review expense reimbursement", frequency: "daily", tools: ["费用系统"], route: "/expense-report" },
      { id: "fin-w1", task: "资金流水报告", taskEn: "Cash flow report", frequency: "weekly", tools: ["财务系统"] },
      { id: "fin-m1", task: "月度财务报表编制", taskEn: "Monthly financial statement preparation", frequency: "monthly", tools: ["财务系统"] },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "费用管理", labelEn: "Expenses", path: "/expense-report", icon: "Wallet" },
      { label: "成本标准", labelEn: "Cost Standards", path: "/cost-standards", icon: "DollarSign" },
      { label: "预算管理", labelEn: "Budget", path: "/cost", icon: "Calculator" },
    ],
  },

  finance_specialist: {
    roleId: "finance_specialist",
    roleName: "财务专员",
    roleNameEn: "Finance Specialist",
    defaultAgentLevel: 1 as AgentLevel,
    responsibilities: {
      title: "财务专员核心职责",
      titleEn: "Finance Specialist Core Responsibilities",
      items: [
        "费用报销审核与发票管理",
        "应收/应付账款日常处理",
        "日常记账与凭证管理",
        "固定资产盘点与折旧计算",
        "差旅费用审核与标准执行",
        "银行对账与资金流水记录",
        "税务申报材料准备",
        "财务档案管理与归档",
      ],
      itemsEn: [
        "Expense reimbursement review and invoice management",
        "AR/AP daily processing",
        "Daily bookkeeping and voucher management",
        "Fixed asset inventory and depreciation calculation",
        "Travel expense review and standard enforcement",
        "Bank reconciliation and cash flow records",
        "Tax filing material preparation",
        "Financial archive management",
      ],
    },
    sopReferences: [
      { code: "SOP-FIN-001", title: "费用报销审批流程", titleEn: "Expense Reimbursement Approval", category: "finance", priority: "critical" },
      { code: "SOP-FIN-004", title: "发票管理与验真流程", titleEn: "Invoice Management & Verification", category: "finance", priority: "high" },
      { code: "SOP-FIN-005", title: "银行对账流程", titleEn: "Bank Reconciliation Process", category: "finance", priority: "normal" },
    ],
    qualityRequirements: COMMON_QUALITY_REQUIREMENTS,
    workRequirements: [
      { id: "fns-d1", task: "处理费用报销单据", taskEn: "Process expense reimbursement documents", frequency: "daily", tools: ["费用系统"], route: "/expense-report" },
      { id: "fns-d2", task: "录入会计凭证", taskEn: "Enter accounting vouchers", frequency: "daily", tools: ["财务系统"] },
      { id: "fns-m1", task: "月末结账与对账", taskEn: "Month-end closing and reconciliation", frequency: "monthly", tools: ["财务系统"] },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "费用管理", labelEn: "Expenses", path: "/expense-report", icon: "Wallet" },
    ],
  },

  // ══════════════════════ 基础角色 ══════════════════════
  production_worker: {
    roleId: "production_worker",
    roleName: "产线员工",
    roleNameEn: "Production Worker",
    defaultAgentLevel: 1 as AgentLevel,
    responsibilities: {
      title: "产线员工核心职责",
      titleEn: "Production Worker Core Responsibilities",
      items: [
        "按SOP执行工序操作",
        "工时记录与产量统计",
        "质量自检与首检配合",
        "设备日常点检与维护",
        "物料领用与BOM核对",
        "安全规范与劳防用品正确佩戴",
        "异常情况立即上报组长",
        "5S工位管理（下班前整理）",
      ],
      itemsEn: [
        "Execute work operations per SOP",
        "Record work hours and production output",
        "Quality self-inspection and first article check support",
        "Daily equipment inspection and maintenance",
        "Material requisition and BOM verification",
        "Safety compliance and proper PPE usage",
        "Report anomalies to team leader immediately",
        "5S workstation management (cleanup before shift end)",
      ],
    },
    sopReferences: [
      { code: "SOP-PROD-004", title: "工位操作SOP（通用）", titleEn: "Station Operation SOP (General)", category: "production", priority: "critical" },
      { code: "SOP-PROD-005", title: "设备日常点检规范", titleEn: "Daily Equipment Inspection Standard", category: "production", priority: "critical" },
      { code: "SOP-PROD-006", title: "物料领用与BOM核对流程", titleEn: "Material Requisition & BOM Verification", category: "bom", priority: "high" },
      { code: "SOP-SAFE-001", title: "车间安全操作规范", titleEn: "Workshop Safety Operation Standard", category: "safety", priority: "critical" },
      { code: "SOP-SAFE-002", title: "劳防用品使用规范", titleEn: "PPE Usage Standard", category: "safety", priority: "critical" },
    ],
    qualityRequirements: [
      ...COMMON_QUALITY_REQUIREMENTS,
      { standard: "IATF 16949", clause: "§8.5.1", description: "过程控制 — 每道工序必须按SOP操作，自检合格后转序", descriptionEn: "Process control — each operation per SOP, self-inspect before transfer", checkFrequency: "per_task" },
      { standard: "IATF 16949", clause: "§8.5.2", description: "标识与追溯 — 物料条码扫描记录，确保批次可追溯", descriptionEn: "Identification & traceability — scan material barcodes for batch traceability", checkFrequency: "per_task" },
    ],
    workRequirements: [
      { id: "pw-d1", task: "上岗前设备点检", taskEn: "Pre-shift equipment inspection", frequency: "daily", tools: ["点检表"], route: "/kiosk" },
      { id: "pw-d2", task: "按SOP执行工序", taskEn: "Execute operations per SOP", frequency: "daily", tools: ["SOP查看"], route: "/kiosk" },
      { id: "pw-d3", task: "工时记录填写", taskEn: "Fill in work hour records", frequency: "daily", tools: ["工时系统"] },
      { id: "pw-d4", task: "下班前5S整理", taskEn: "End-of-shift 5S cleanup", frequency: "daily", tools: ["5S检查表"] },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "工位终端", labelEn: "Kiosk", path: "/kiosk", icon: "Factory" },
      { label: "SOP查看", labelEn: "SOP Viewer", path: "/sop-viewer", icon: "BookOpen" },
    ],
  },

  employee: {
    roleId: "employee",
    roleName: "员工",
    roleNameEn: "Employee",
    defaultAgentLevel: 1 as AgentLevel,
    responsibilities: {
      title: "员工通用职责",
      titleEn: "Employee General Responsibilities",
      items: [
        "按时完成分配的工作任务",
        "遵守公司规章制度与GS标准",
        "主动学习岗位所需知识和技能",
        "参加公司培训与技能考核",
        "保守公司商业和技术机密",
        "保持工作区域整洁(5S)",
        "积极参与团队协作",
        "合理使用公司资源",
      ],
      itemsEn: [
        "Complete assigned work tasks on time",
        "Follow company rules and GS standards",
        "Proactively learn required job knowledge and skills",
        "Attend company training and skill assessments",
        "Protect company business and technical confidentiality",
        "Maintain clean work area (5S)",
        "Actively participate in team collaboration",
        "Use company resources responsibly",
      ],
    },
    sopReferences: [
      { code: "SOP-GEN-001", title: "新员工入职指南", titleEn: "New Employee Onboarding Guide", category: "management", priority: "high" },
      { code: "SOP-GEN-002", title: "请假/加班申请流程", titleEn: "Leave/Overtime Request Process", category: "management", priority: "normal" },
      { code: "SOP-GEN-003", title: "IT设备使用规范", titleEn: "IT Equipment Usage Policy", category: "management", priority: "normal" },
    ],
    qualityRequirements: COMMON_QUALITY_REQUIREMENTS,
    workRequirements: [
      { id: "emp-d1", task: "查看当日任务清单", taskEn: "Review daily task list", frequency: "daily", tools: ["任务看板"], route: "/me" },
      { id: "emp-w1", task: "参加培训课程", taskEn: "Attend training sessions", frequency: "weekly", tools: ["培训系统"], route: "/training" },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "个人门户", labelEn: "My Portal", path: "/me", icon: "User" },
      { label: "培训", labelEn: "Training", path: "/training", icon: "GraduationCap" },
    ],
  },

  // ── 缺省映射（quality_eng等未单独配置的角色回退） ──
  quality_eng: {
    roleId: "quality_eng",
    roleName: "质量工程师",
    roleNameEn: "Quality Engineer",
    defaultAgentLevel: 3 as AgentLevel,
    responsibilities: {
      title: "质量工程师核心职责",
      titleEn: "Quality Engineer Core Responsibilities",
      items: [
        "来料检验(IQC)标准制定与执行",
        "过程质量巡检(IPQC)与SPC监控",
        "成品检验(OQC)与放行判定",
        "FMEA/PPAP/MSA/SPC推进",
        "8D/CAPA不合格品处理闭环",
        "客户投诉分析与改善",
        "供应商质量审核(VDA 6.3)",
        "质量体系(ISO 9001/IATF 16949)维护",
      ],
      itemsEn: [
        "Incoming quality inspection (IQC) standards and execution",
        "Process quality patrol (IPQC) and SPC monitoring",
        "Final quality inspection (OQC) and release decisions",
        "FMEA/PPAP/MSA/SPC implementation",
        "8D/CAPA non-conformance closure",
        "Customer complaint analysis and improvement",
        "Supplier quality audit (VDA 6.3)",
        "Quality system (ISO 9001/IATF 16949) maintenance",
      ],
    },
    sopReferences: [
      { code: "SOP-QA-001", title: "来料检验(IQC)流程", titleEn: "Incoming Quality Inspection (IQC)", category: "quality", priority: "critical" },
      { code: "SOP-QA-002", title: "过程巡检(IPQC)流程", titleEn: "In-Process Quality Check (IPQC)", category: "quality", priority: "critical" },
      { code: "SOP-QA-003", title: "成品检验(OQC)与放行流程", titleEn: "Outgoing Quality Check (OQC) & Release", category: "quality", priority: "critical" },
      { code: "SOP-QA-004", title: "不合格品控制流程", titleEn: "Non-conforming Product Control", category: "quality", priority: "critical" },
      { code: "SOP-BOM-009", title: "BOM质量检查点定义", titleEn: "BOM Quality Checkpoint Definition", category: "bom", priority: "high" },
    ],
    qualityRequirements: [
      ...COMMON_QUALITY_REQUIREMENTS,
      { standard: "IATF 16949", clause: "§9.1.1", description: "监视测量分析评价 — SPC控制图需每班更新", descriptionEn: "Monitoring measurement analysis — SPC charts updated per shift", checkFrequency: "daily" },
      { standard: "IATF 16949", clause: "§10.2.3", description: "问题解决 — 客户投诉8D报告5个工作日内完成", descriptionEn: "Problem solving — customer complaint 8D within 5 working days", checkFrequency: "per_task" },
    ],
    workRequirements: [
      { id: "qa-d1", task: "执行来料检验(IQC)", taskEn: "Execute incoming quality inspection", frequency: "daily", tools: ["IQC记录"], route: "/supply-chain" },
      { id: "qa-d2", task: "过程巡检(IPQC)", taskEn: "In-process quality check patrol", frequency: "daily", tools: ["巡检记录"] },
      { id: "qa-w1", task: "SPC数据分析", taskEn: "SPC data analysis", frequency: "weekly", tools: ["质量工具"] },
      { id: "qa-pe", task: "8D报告编写与跟踪", taskEn: "8D report writing and tracking", frequency: "per_event", tools: ["8D系统"], route: "/eight-d-capa" },
    ],
    companyStandards: GRT_COMPANY_STANDARDS,
    keySystemRoutes: [
      { label: "质量工作台", labelEn: "Quality Workbench", path: "/quality-workbench", icon: "ShieldCheck" },
      { label: "8D/CAPA", labelEn: "8D/CAPA", path: "/eight-d-capa", icon: "AlertTriangle" },
      { label: "FMEA", labelEn: "FMEA", path: "/fmea", icon: "FileText" },
      { label: "控制计划", labelEn: "Control Plan", path: "/control-plan", icon: "ClipboardCheck" },
    ],
  },
};

// ─── 辅助函数 ────────────────────────────────────────────

/**
 * 根据角色ID获取工作站配置
 */
export function getWorkstationConfig(roleId: string): RoleWorkstationConfig {
  return ROLE_WORKSTATION_CONFIGS[roleId] || ROLE_WORKSTATION_CONFIGS["employee"];
}

/**
 * 获取角色的BOM相关SOP列表
 */
export function getBomSOPs(roleId: string): SOPReference[] {
  const config = getWorkstationConfig(roleId);
  return config.sopReferences.filter((s) => s.category === "bom");
}

/**
 * 获取角色的所有Critical优先级SOP
 */
export function getCriticalSOPs(roleId: string): SOPReference[] {
  const config = getWorkstationConfig(roleId);
  return config.sopReferences.filter((s) => s.priority === "critical");
}

/**
 * 获取角色的日常工作清单
 */
export function getDailyTasks(roleId: string): WorkRequirement[] {
  const config = getWorkstationConfig(roleId);
  return config.workRequirements.filter((w) => w.frequency === "daily");
}

/**
 * 所有角色ID列表
 */
export const ALL_WORKSTATION_ROLES = Object.keys(ROLE_WORKSTATION_CONFIGS);
