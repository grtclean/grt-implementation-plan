import {
  Bell,
  Home,
  Brain,
  Lightbulb,
  Calculator,
  CalendarClock,
  Gauge,
  Upload,
  Cloud,
  BarChart3,
  Award,
  Globe,
  FileCheck,
  Swords,
  Medal,
  Route,
  Users,
  FolderKanban,
  Milestone,
  Sparkles,
  Clock,
  Truck,
  UserCheck,
  TrendingUp,
  Contact,
  Target,
  Factory,
  HardHat,
  ClipboardCheck,
  MapPin,
  Wallet,
  Receipt,
  Plane,
  AlertTriangle,
  LineChart,
  Bot,
  Cpu,
  Stethoscope,
  Activity,
  Network,
  Database,
  Webhook,
  Timer,
  ShieldAlert,
  FileText,
  Settings,
  Video,
  Code2,
  Server,
  Shield,
  Lock,
  Menu,
  Calendar,
  Layers,
  GitBranch,
  Kanban,
  DollarSign,
  GraduationCap,
  CalendarRange,
  Tags,
  BookOpen,
  MessageSquare,
  Send,
  Monitor,
  GitCompare,
  Building2,
  Cog,
  Zap,
  ShoppingCart,
  Headphones,
  Package,
  Wrench,
  TestTube,
  CheckCircle,
  Ticket,
  MessageCircle,
  UserCog,
  Star,
  LayoutDashboard,
  BellRing,
  Crown,
  Trophy,
  Cable,
  RefreshCw,
  Warehouse,
  Boxes,
  CheckSquare,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/contexts/UserProfileContext";

// ============================================
// 菜单类型定义
// ============================================

export interface MenuItem {
  name: string;
  nameEn: string;
  nameDe?: string;
  nameFr?: string;
  path: string;
  icon: LucideIcon;
  // 可访问该菜单项的角色列表（空=所有人可见）
  allowedRoles?: UserRole[];
  // 最低角色等级要求（与ROLE_HIERARCHY配合）
  minLevel?: number;
  // 是否需要BU选择
  requiresBU?: boolean;
  // 标记为新功能
  isNew?: boolean;
}

export interface MenuGroup {
  name: string;
  nameEn: string;
  nameDe?: string;
  nameFr?: string;
  icon: LucideIcon;
  items: MenuItem[];
  defaultOpen?: boolean;
  // 可见角色列表
  allowedRoles?: UserRole[];
  // 最低角色等级
  minLevel?: number;
  // 权限key（用于canAccessRoute检查）
  permissionKey?: string;
}

// ============================================
// 菜单配置 - 按业务流程重�?// 12个一级模块，面向事业部微分工
// ============================================

export const menuConfig: MenuGroup[] = [
  // ────────────────────────────────────
  // 一、工作台（所有人可见）  // ────────────────────────────────────
  {
    name: "工作台",
    nameEn: "Workspace",
    nameDe: "Arbeitsbereich",
    nameFr: "Espace de travail",
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { name: "我的看板", nameEn: "My Dashboard", path: "/", icon: Home },
      { name: "通知中心", nameEn: "Notifications", path: "/notifications", icon: BellRing },
      { name: "智慧会议", nameEn: "Smart Meeting", path: "/smart-meeting", icon: Video },
      { name: "会议效能分析", nameEn: "Meeting Executive", path: "/meeting-executive", icon: BarChart3, isNew: true },
      { name: "实施路线图", nameEn: "Roadmap", path: "/roadmap", icon: Calendar },
      { name: "工具箱", nameEn: "Tools", path: "/tools", icon: Layers },
    ],
  },

  // ────────────────────────────────────
  // 二、市场与销售  // ────────────────────────────────────
  {
    name: "市场与销售",
    nameEn: "Sales & Marketing",
    nameDe: "Vertrieb & Marketing",
    nameFr: "Ventes & Marketing",
    icon: TrendingUp,
    permissionKey: "canAccessSales",
    items: [
      { name: "客户管理", nameEn: "Customers", path: "/crm/customers", icon: Users, requiresBU: true },
      { name: "商机管理", nameEn: "Opportunities", path: "/crm/opportunities", icon: Target, requiresBU: true },
      { name: "联系人", nameEn: "Contacts", path: "/crm/contacts", icon: Contact },
      { name: "线索管理", nameEn: "Leads", path: "/leads", icon: TrendingUp },
      { name: "报价管理", nameEn: "Quotation Mgmt", path: "/quotation-management", icon: Calculator, isNew: true, requiresBU: true },
      { name: "合同管理", nameEn: "Contracts", path: "/contract-management", icon: FileCheck, isNew: true },
      { name: "AI报价助手", nameEn: "AI Quotation", path: "/ai/quotation-assistant", icon: Bot },
      { name: "客户门户", nameEn: "Customer Portal", path: "/customer-portal", icon: UserCheck },
      { name: "销售分析", nameEn: "Sales Analytics", path: "/sales-analytics", icon: BarChart3, isNew: true, requiresBU: true },
      { name: "客户价值视图", nameEn: "Customer Value", path: "/customer-value-view", icon: Crown },
      { name: "报价生成", nameEn: "Quotation Create", path: "/quotation-create", icon: Calculator, isNew: true, requiresBU: true },
    ],
  },

  // ────────────────────────────────────
  // 三、研发设计（TX-001~TX-005）  // ────────────────────────────────────
  {
    name: "研发设计",
    nameEn: "R&D Design",
    nameDe: "F&E Design",
    nameFr: "Conception R&D",
    icon: Cog,
    permissionKey: "canAccessRnD",
    items: [
      { name: "需求分析", nameEn: "Requirements", path: "/requirements-analysis", icon: ClipboardCheck, requiresBU: true, isNew: true },
      { name: "方案设计", nameEn: "Solution Design", path: "/solution-design", icon: Lightbulb, requiresBU: true, isNew: true },
      { name: "机械设计", nameEn: "Mechanical Design", path: "/mechanical-design", icon: Cog, requiresBU: true, isNew: true },
      { name: "电气设计", nameEn: "Electrical Design", path: "/electrical-design", icon: Zap, requiresBU: true, isNew: true },
      { name: "BOM管理", nameEn: "BOM Management", path: "/bom-management", icon: Package, requiresBU: true, isNew: true },
      { name: "技术文档", nameEn: "Tech Documents", path: "/tech-documents", icon: FileText, isNew: true },
      { name: "AI方案助手", nameEn: "AI Solution", path: "/ai/solution-assistant", icon: Bot },
    ],
  },

  // ────────────────────────────────────
  // 四、项目管理  // ────────────────────────────────────
  {
    name: "项目管理",
    nameEn: "Project Management",
    nameDe: "Projektmanagement",
    nameFr: "Gestion de projet",
    icon: FolderKanban,
    items: [
      { name: "项目列表", nameEn: "Projects", path: "/projects", icon: FolderKanban, requiresBU: true },
      { name: "研发验证中心", nameEn: "R&D Verification", path: "/rd-verification", icon: Shield, isNew: true },
      { name: "门径管理", nameEn: "Stage Gate", path: "/stage-gate", icon: CheckSquare, isNew: true },
      { name: "M1启动会", nameEn: "M1 Kickoff", path: "/m1-kickoff", icon: Sparkles },
      { name: "M7-M9交付", nameEn: "M7-M9 Delivery", path: "/m7-m9-delivery", icon: Clock },
      { name: "项目看板", nameEn: "Kanban Board", path: "/tasks", icon: Kanban },
      { name: "甘特图", nameEn: "Gantt Chart", path: "/gantt", icon: BarChart3, isNew: true },
      { name: "交付管理", nameEn: "Delivery Mgmt", path: "/delivery-management", icon: Truck },
      { name: "AI计划助手", nameEn: "AI Planning", path: "/ai/planning-assistant", icon: Bot },
      { name: "风险管理", nameEn: "Risk Mgmt", path: "/risks", icon: AlertTriangle },
      { name: "SOP模板库", nameEn: "SOP Library", path: "/sop-library", icon: BookOpen, isNew: true },
      { name: "阶段文档管理", nameEn: "Phase Documents", path: "/project-phase-documents", icon: FileText, isNew: true },
      { name: "项目数字孪生", nameEn: "Project Digital Twin", path: "/project-digital-twin", icon: Cpu, isNew: true },
      // ── POS (Project Organization System) ──
      { name: "POS总览", nameEn: "POS Dashboard", path: "/pos/dashboard", icon: LayoutDashboard, isNew: true,
        allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "bu_sales"] },
      { name: "POS项目", nameEn: "POS Projects", path: "/pos/projects", icon: FolderKanban, isNew: true,
        allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "bu_sales"] },
      { name: "POS客户", nameEn: "POS Customers", path: "/pos/customers", icon: Users, isNew: true,
        allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "bu_sales"] },
      { name: "POS采购", nameEn: "POS Procurement", path: "/pos/procurement", icon: ShoppingCart, isNew: true,
        allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "bu_sales"] },
      { name: "POS-MES同步", nameEn: "POS MES Sync", path: "/pos/mes", icon: RefreshCw, isNew: true,
        allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "bu_sales"] },
      { name: "POS连接器配置", nameEn: "POS Connectors", path: "/pos/connectors", icon: Cable, isNew: true,
        allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "bu_sales"] },
    ],
  },

  // ────────────────────────────────────
  // 五、生产制造（TX-006~TX-012）  // ────────────────────────────────────
  {
    name: "生产制造",
    nameEn: "Manufacturing",
    nameDe: "Fertigung",
    nameFr: "Production",
    icon: Factory,
    permissionKey: "canAccessManufacturing",
    items: [
      { name: "生产指挥中心", nameEn: "Command Center", path: "/production-command-center", icon: Monitor, isNew: true },
      { name: "生产看板", nameEn: "Production Board", path: "/production-dashboard", icon: Factory },
      { name: "工序管理", nameEn: "Process Mgmt", path: "/process-management", icon: Wrench, isNew: true },
      { name: "工人管理", nameEn: "Worker Mgmt", path: "/worker-management", icon: HardHat },
      { name: "工人导入", nameEn: "Worker Import", path: "/worker-import", icon: Users },
      { name: "智能排程", nameEn: "Smart Scheduling", path: "/intelligent-scheduling", icon: Cpu },
      { name: "质检管理", nameEn: "QC Management", path: "/qc-management", icon: ClipboardCheck },
      { name: "UWB定位", nameEn: "UWB Tracking", path: "/uwb-management", icon: MapPin },
      { name: "物料追踪", nameEn: "Material Tracking", path: "/material-tracking", icon: Package, isNew: true },
      { name: "仓库管理", nameEn: "Warehouse Mgmt", path: "/warehouse-management", icon: Warehouse, isNew: true },
      { name: "库存看板", nameEn: "Inventory Dashboard", path: "/inventory-dashboard", icon: Boxes, isNew: true },
      { name: "M8 FAT协调", nameEn: "M8 FAT Coordination", path: "/fat-coordination", icon: ClipboardCheck, isNew: true,
        allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "cs_engineer"] },
      { name: "供应商评估", nameEn: "Supplier Assessment", path: "/supplier-assessment", icon: Truck, isNew: true },
      { name: "库存优化", nameEn: "Inventory Optimization", path: "/inventory-optimization", icon: Package, isNew: true },
      { name: "质量预测", nameEn: "Quality Prediction", path: "/quality-prediction", icon: Shield, isNew: true },
      { name: "生产效率分析", nameEn: "Production Efficiency", path: "/production-efficiency", icon: TrendingUp, isNew: true },
    ],
  },

  // ────────────────────────────────────
  // 六、客户服务（TX-013~TX-015 + 售后）  // ────────────────────────────────────
  {
    name: "客户服务",
    nameEn: "Customer Service",
    nameDe: "Kundendienst",
    nameFr: "Service client",
    icon: Headphones,
    permissionKey: "canAccessCustomerService",
    items: [
      { name: "现场安装", nameEn: "Field Installation", path: "/field-installation", icon: Wrench, isNew: true, requiresBU: true },
      { name: "SAT测试", nameEn: "SAT Testing", path: "/sat-testing", icon: TestTube, isNew: true, requiresBU: true },
      { name: "终验收", nameEn: "Final Acceptance", path: "/final-acceptance", icon: CheckCircle, isNew: true, requiresBU: true },
      { name: "售后工单", nameEn: "Service Tickets", path: "/service-tickets", icon: Ticket, isNew: true },
      { name: "客户反馈", nameEn: "Customer Feedback", path: "/customer-feedback", icon: MessageCircle, isNew: true },
      { name: "备件管理", nameEn: "Spare Parts", path: "/spare-parts", icon: Package, isNew: true },
      { name: "现场工程师", nameEn: "Field Engineer", path: "/m/field-dashboard", icon: Wrench, isNew: true },
    ],
  },

  // ────────────────────────────────────
  // 七、人力资源  // ────────────────────────────────────
  {
    name: "人力资源",
    nameEn: "Human Resources",
    nameDe: "Personalwesen",
    nameFr: "Ressources humaines",
    icon: Users,
    items: [
      // 员工管理子模块
      { name: "HRM智能台", nameEn: "HRM Intelligent", path: "/hrm-intelligent", icon: Brain,
        allowedRoles: ["admin", "director", "hr_manager", "hr_specialist"] },
      { name: "HR链路", nameEn: "HR Lifecycle", path: "/hr-lifecycle", icon: Users,
        allowedRoles: ["admin", "director", "hr_manager", "hr_specialist"] },
      { name: "培训管理", nameEn: "Training", path: "/training", icon: GraduationCap },
      { name: "招聘管理", nameEn: "Recruitment", path: "/recruitment", icon: UserCheck, isNew: true,
        allowedRoles: ["admin", "director", "hr_manager", "hr_specialist", "dept_manager"] },
      { name: "考勤管理", nameEn: "Attendance", path: "/attendance", icon: Clock, isNew: true,
        allowedRoles: ["admin", "hr_manager", "hr_specialist", "dept_manager", "team_lead"] },
      // 绩效管理 - 分层查看
      { name: "我的绩效", nameEn: "My Performance", path: "/my-performance", icon: Star, isNew: true },
      { name: "团队绩效", nameEn: "Team Performance", path: "/team-performance", icon: Users, isNew: true,
        minLevel: 2 },
      { name: "部门绩效", nameEn: "Dept Performance", path: "/dept-performance", icon: BarChart3, isNew: true,
        minLevel: 3 },
      { name: "BU绩效总览", nameEn: "BU Performance", path: "/bu-performance", icon: Building2, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "hr_manager"] },
      // 薪酬
      { name: "薪酬管理", nameEn: "Compensation", path: "/compensation", icon: DollarSign, isNew: true,
        allowedRoles: ["admin", "director", "hr_manager", "finance_manager"] },
      { name: "代理职能", nameEn: "Delegation", path: "/delegation", icon: UserCog, isNew: true },
      { name: "绩效薪资查询", nameEn: "My Pay & Perf", path: "/perf-salary", icon: Wallet, isNew: true },
      // 主管工作台
      { name: "主管工作台", nameEn: "Supervisor", path: "/supervisor-workbench", icon: UserCog, minLevel: 2 },
      { name: "议程管理", nameEn: "Agenda", path: "/agenda", icon: Calendar },
      { name: "年度规划", nameEn: "Annual Planning", path: "/annual-planning", icon: CalendarRange, minLevel: 3 },
    ],
  },

  // ────────────────────────────────────
  // 八、能力体系  // ────────────────────────────────────
  {
    name: "能力体系",
    nameEn: "Capability System",
    nameDe: "Kompetenzsystem",
    nameFr: "Système de compétences",
    icon: Brain,
    items: [
      { name: "我的能力档案", nameEn: "My Capability", path: "/capability-os", icon: Brain },
      { name: "能力仪表板", nameEn: "Capability Dashboard", path: "/capability-dashboard", icon: BarChart3 },
      { name: "证据提交", nameEn: "Evidence Submit", path: "/evidence-submission", icon: FileCheck },
      { name: "能力证书", nameEn: "Certificates", path: "/capability-certificates", icon: Medal },
      { name: "能力徽章", nameEn: "Badges", path: "/capability-badges", icon: Award },
      { name: "能力路径", nameEn: "Learning Path", path: "/capability-path", icon: Route },
      { name: "红蓝对抗", nameEn: "Red-Blue Board", path: "/red-blue-board", icon: Swords },
      { name: "团队能力分析", nameEn: "Team Analysis", path: "/team-capability-analysis", icon: Users, minLevel: 2 },
      { name: "能力排行榜", nameEn: "Leaderboard", path: "/capability-leaderboard", icon: TrendingUp },
      { name: "证据审核", nameEn: "Evidence Review", path: "/evidence-review", icon: Award, minLevel: 2 },
    ],
  },

  // ────────────────────────────────────
  // 九、财务管理  // ────────────────────────────────────
  {
    name: "财务管理",
    nameEn: "Finance",
    nameDe: "Finanzen",
    nameFr: "Finances",
    icon: Wallet,
    items: [
      // 全员可见 - 费用类
      { name: "费用报销", nameEn: "Expense Report", path: "/expense-report", icon: Receipt },
      { name: "出差申请", nameEn: "Trip Request", path: "/trip-request", icon: Plane },
      { name: "出差大屏", nameEn: "Travel Dashboard", path: "/travel-dashboard", icon: Monitor },
      // 管理类 - 需权限
      { name: "预算管理", nameEn: "Budget Mgmt", path: "/budget-management", icon: Wallet, minLevel: 3 },
      { name: "成本管理", nameEn: "Cost Mgmt", path: "/cost", icon: DollarSign,
        allowedRoles: ["admin", "director", "bu_gm", "finance_manager", "finance_specialist"] },
      { name: "费用对比", nameEn: "Expense Compare", path: "/expense-comparison", icon: GitCompare, minLevel: 2 },
      { name: "超支审批", nameEn: "Overrun Approval", path: "/budget-overrun-approval", icon: AlertTriangle, minLevel: 3 },
      { name: "费用预测", nameEn: "Expense Forecast", path: "/expense-forecast", icon: LineChart, minLevel: 3 },
      { name: "报表定时发送", nameEn: "Report Scheduler", path: "/expense-report-scheduler", icon: Send,
        allowedRoles: ["admin", "finance_manager"] },
      { name: "成本标准配置", nameEn: "Cost Standards", path: "/cost-standards", icon: Calculator, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "finance_manager"] },
    ],
  },

  // ────────────────────────────────────
  // 十、AI助手（统一入口 + 通用工具）  // ────────────────────────────────────
  {
    name: "AI助手",
    nameEn: "AI Intelligence",
    nameDe: "KI-Intelligenz",
    nameFr: "Intelligence IA",
    icon: Bot,
    items: [
      { name: "AI助手中心", nameEn: "AI Hub", path: "/ai-hub", icon: Bot, isNew: true },
      { name: "AI对话助手", nameEn: "AI Chat", path: "/ai-assistant", icon: Bot },
      { name: "AI KPI助手", nameEn: "KPI Assistant", path: "/ai/kpi-assistant", icon: Gauge },
      { name: "数字助理", nameEn: "Digital Assistants", path: "/digital-assistants", icon: Cpu },
      { name: "AI诊断", nameEn: "AI Diagnostic", path: "/ai-diagnostic", icon: Stethoscope },
      { name: "AI效能追踪", nameEn: "AI Effectiveness", path: "/ai-effectiveness", icon: Activity },
      { name: "模型监控", nameEn: "Model Monitor", path: "/model-performance-monitor", icon: Activity, minLevel: 3 },
      { name: "知识图谱", nameEn: "Knowledge Graph", path: "/knowledge-graph-approval", icon: Network, minLevel: 3 },
      { name: "模型训练", nameEn: "Model Training", path: "/model-training-scheduler", icon: Timer,
        allowedRoles: ["admin"] },
      { name: "Agent管理", nameEn: "Agent Units", path: "/agent-unit-management", icon: Cpu,
        allowedRoles: ["admin"] },
      { name: "知识库训练", nameEn: "KB Training", path: "/rag-training", icon: BookOpen, isNew: true },
      { name: "AI预警中心", nameEn: "AI Early Warning", path: "/ai-early-warning", icon: AlertTriangle, isNew: true },
      { name: "历史案例库", nameEn: "Historical Cases", path: "/historical-cases", icon: BookOpen, isNew: true },
      { name: "AI采购助手", nameEn: "AI Purchase", path: "/ai-purchase", icon: ShoppingCart, isNew: true },
      { name: "AI质量助手", nameEn: "AI Quality", path: "/ai-quality", icon: Shield, isNew: true },
      { name: "AI服务助手", nameEn: "AI Service", path: "/ai-service", icon: Headphones, isNew: true },
      { name: "知识库问答", nameEn: "Knowledge Q&A", path: "/knowledge-qa", icon: MessageSquare, isNew: true },
      { name: "变更影响分析", nameEn: "Change Impact", path: "/change-impact", icon: GitBranch, isNew: true },
      { name: "AI风险预测", nameEn: "AI Risk Prediction", path: "/ai-risk-prediction", icon: ShieldAlert, isNew: true },
    ],
  },

  // ────────────────────────────────────
  // 十一、战略规划（总监以上）  // ────────────────────────────────────
  {
    name: "战略规划",
    nameEn: "Strategic Planning",
    nameDe: "Strategische Planung",
    nameFr: "Planification stratégique",
    icon: Target,
    permissionKey: "canAccessStrategicPlanning",
    items: [
      { name: "资质管理", nameEn: "Certification", path: "/certification-management", icon: Award },
      { name: "年度企业日程", nameEn: "Annual Agenda", path: "/annual-agenda", icon: Calendar },
      { name: "全球增长追踪", nameEn: "Global Growth", path: "/global-growth-tracker", icon: Globe },
      { name: "变更治理", nameEn: "Change Governance", path: "/change-management", icon: ClipboardCheck },
    ],
  },

  // ────────────────────────────────────
  // 十二、系统管理（admin可见）  // ────────────────────────────────────
  {
    name: "系统管理",
    nameEn: "System Admin",
    nameDe: "Systemverwaltung",
    nameFr: "Administration système",
    icon: Settings,
    allowedRoles: ["admin"],
    items: [
      { name: "用户与权限", nameEn: "Users & Permissions", path: "/permissions", icon: Lock },
      { name: "菜单管理", nameEn: "Menu Management", path: "/menu-management", icon: Menu },
      { name: "组织架构", nameEn: "Organization", path: "/organization-management", icon: Building2, isNew: true },
      { name: "审计日志", nameEn: "Audit Log", path: "/audit-logs", icon: FileText },
      { name: "系统监控", nameEn: "System Monitor", path: "/grt-operation", icon: Gauge },
      { name: "安全仪表板", nameEn: "Security", path: "/security", icon: Shield },
      { name: "合规仪表板", nameEn: "Compliance", path: "/compliance-dashboard", icon: Shield },
      { name: "通知渠道", nameEn: "Notifications", path: "/admin/notification-settings", icon: Bell },
      { name: "钉钉配置", nameEn: "DingTalk", path: "/admin/dingtalk-settings", icon: Bell },
      { name: "Microsoft Graph", nameEn: "MS Graph", path: "/settings/microsoft-graph", icon: Cloud },
      { name: "命名规则", nameEn: "Naming Rules", path: "/naming-rules", icon: Tags },
      { name: "系统部署", nameEn: "Deployment", path: "/system-deployment", icon: Server },
      { name: "系统指南", nameEn: "System Guide", path: "/system-guide", icon: BookOpen },
      // 系统分析/运维工具
      { name: "简道云分析", nameEn: "Jiandaoyun", path: "/jiandaoyun", icon: Database },
      { name: "Webhook管理", nameEn: "Webhooks", path: "/webhook", icon: Webhook },
      { name: "定时任务", nameEn: "Scheduler", path: "/scheduler", icon: Timer },
      { name: "Cron监控", nameEn: "Cron Monitor", path: "/cron-monitor", icon: Clock },
      { name: "死锁监控", nameEn: "Deadlock Monitor", path: "/deadlock-monitor", icon: ShieldAlert },
      { name: "临时权限", nameEn: "Temp Permissions", path: "/temporary-permissions", icon: Shield, isNew: true },
      { name: "权限黑名单", nameEn: "Perm Blacklist", path: "/permission-blacklist", icon: ShieldAlert, isNew: true },
      { name: "菜单分析", nameEn: "Menu Analytics", path: "/menu-analytics", icon: BarChart3, isNew: true },
      { name: "运营分析", nameEn: "Operations Analytics", path: "/operations-analytics", icon: Activity, isNew: true },
    ],
  },

  // ────────────────────────────────────
  // 社群与文档（合并为辅助模块）
  // ────────────────────────────────────
  {
    name: "协作与文档",
    nameEn: "Collaboration & Docs",
    nameDe: "Zusammenarbeit & Dokumente",
    nameFr: "Collaboration & Documents",
    icon: MessageSquare,
    items: [
      { name: "社群管理", nameEn: "Community", path: "/community", icon: MessageSquare },
      { name: "协作空间", nameEn: "Collaboration", path: "/collaboration", icon: Users },
      { name: "群通知", nameEn: "Group Alerts", path: "/group-notifications", icon: Send },
      { name: "文档管理", nameEn: "Documents", path: "/docs", icon: FileText },
      { name: "帮助中心", nameEn: "Help Center", path: "/help", icon: BookOpen },
    ],
  },

  // ────────────────────────────────────
  // 平台能力扩展
  // ────────────────────────────────────
  {
    name: "平台能力",
    nameEn: "Platform Capabilities",
    icon: Cpu,
    items: [
      { name: "成就系统", nameEn: "Achievements", path: "/gamification", icon: Trophy, isNew: true },
      { name: "IoT数字孪生", nameEn: "IoT Digital Twin", path: "/iot-dashboard", icon: Cpu, isNew: true },
    ],
  },
];

export default menuConfig;
