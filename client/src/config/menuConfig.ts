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
  ShieldCheck,
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
  User,
  UserCog,
  Star,
  LayoutDashboard,
  LayoutGrid,
  BellRing,
  Crown,
  Trophy,
  Cable,
  RefreshCw,
  Warehouse,
  Box,
  Boxes,
  CheckSquare,
  Scale,
  CalendarDays,
  ClipboardList,
  Briefcase,
  Grid3X3,
  Landmark,
  Presentation,
  Leaf,
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

/** 三级菜单子分组 — 用于大型模块（如生产制造54项）的逻辑归类 */
export interface MenuSubgroup {
  name: string;
  nameEn: string;
  nameDe?: string;
  nameFr?: string;
  icon?: LucideIcon;
  items: MenuItem[];
  /** 可见角色列表 */
  allowedRoles?: UserRole[];
  /** 最低角色等级 */
  minLevel?: number;
}

export interface MenuGroup {
  name: string;
  nameEn: string;
  nameDe?: string;
  nameFr?: string;
  icon: LucideIcon;
  items: MenuItem[];
  /** 三级子分组 — 渲染时优先展示 subgroups，再展示未分组的 items */
  subgroups?: MenuSubgroup[];
  defaultOpen?: boolean;
  // 可见角色列表
  allowedRoles?: UserRole[];
  // 最低角色等级
  minLevel?: number;
  // 权限key（用于canAccessRoute检查）
  permissionKey?: string;
  // Enterprise OS super-category grouping
  superCategory?: "portal" | "strategy" | "operations" | "resources";
}

// ============================================
// Enterprise OS Super-Categories (千人千面)
// ============================================

export interface SuperCategory {
  id: "portal" | "strategy" | "operations" | "resources";
  name: string;
  nameEn: string;
  nameDe: string;
  nameFr: string;
  icon: LucideIcon;
}

export const SUPER_CATEGORIES: SuperCategory[] = [
  { id: "portal", name: "个人门户", nameEn: "My Workspace", nameDe: "Mein Bereich", nameFr: "Mon espace", icon: Home },
  { id: "strategy", name: "战略目标", nameEn: "Strategic Goals", nameDe: "Strategische Ziele", nameFr: "Objectifs stratégiques", icon: Target },
  { id: "operations", name: "业务集成", nameEn: "Core Operations", nameDe: "Kerngeschäft", nameFr: "Opérations principales", icon: Briefcase },
  { id: "resources", name: "资源管理", nameEn: "Resources", nameDe: "Ressourcen", nameFr: "Ressources", icon: Building2 },
];

// ============================================
// Waffle App Launcher (O365-style)
// ============================================

export interface WaffleApp {
  id: string;
  name: string;
  nameEn: string;
  nameDe?: string;
  nameFr?: string;
  icon: LucideIcon;
  color: string;
  menuGroupNames: string[];
  defaultPath: string;
  /** Which super-category engine this app belongs to */
  engine?: "portal" | "strategy" | "operations" | "resources";
}

export const WAFFLE_APPS: WaffleApp[] = [
  // Engine 1: Portal — "Me" 千人千面
  { id: "workspace",     name: "工作台",     nameEn: "Workspace",     icon: LayoutDashboard, color: "#0078D4", menuGroupNames: ["工作台"],                    defaultPath: "/me",                      engine: "portal" },
  // Engine 3: Strategy & OKR
  { id: "strategy",      name: "战略规划",    nameEn: "Strategy",      icon: Target,          color: "#4F6BED", menuGroupNames: ["战略规划"],                  defaultPath: "/strategy",                engine: "strategy" },
  { id: "ai",            name: "AI助手",      nameEn: "AI Hub",        icon: Bot,             color: "#0063B1", menuGroupNames: ["AI助手"],                   defaultPath: "/ai-hub",                  engine: "strategy" },
  { id: "knowledge",     name: "知识大脑",    nameEn: "Knowledge Brain",   nameDe: "Wissenszentrale",   nameFr: "Cerveau de connaissances", icon: Brain,  color: "#744DA9", menuGroupNames: ["知识大脑"],  defaultPath: "/rag-training",   engine: "strategy" },
  { id: "devops",        name: "AI DevOps",   nameEn: "AI DevOps Matrix",  nameDe: "KI-DevOps-Matrix",  nameFr: "Matrice IA DevOps",        icon: Code2,  color: "#C239B3", menuGroupNames: ["AI DevOps"],  defaultPath: "/dual-ai-matrix", engine: "strategy" },
  // Engine 4: Core Operations
  { id: "sales",         name: "市场与销售",  nameEn: "Sales & CRM",   icon: TrendingUp,      color: "#107C10", menuGroupNames: ["市场与销售"],                defaultPath: "/sales-crm",               engine: "operations" },
  { id: "rnd",           name: "研发设计",    nameEn: "R&D Design",    icon: Cog,             color: "#5C2D91", menuGroupNames: ["研发设计"],                  defaultPath: "/requirements-analysis",   engine: "operations" },
  { id: "project",       name: "项目管理",    nameEn: "Projects",      icon: FolderKanban,    color: "#008272", menuGroupNames: ["项目管理"],                  defaultPath: "/projects",                engine: "operations" },
  { id: "manufacturing", name: "生产制造",    nameEn: "Manufacturing", icon: Factory,         color: "#E3008C", menuGroupNames: ["生产制造"],                  defaultPath: "/production-command-center",engine: "operations" },
  { id: "supply-chain",  name: "供应链",      nameEn: "Supply Chain",  icon: Truck,           color: "#B4009E", menuGroupNames: ["供应链管理"],                defaultPath: "/supply-chain",            engine: "operations" },
  { id: "service",       name: "客户服务",    nameEn: "Service",       icon: Headphones,      color: "#D13438", menuGroupNames: ["客户服务"],                  defaultPath: "/after-sales-workbench",   engine: "operations" },
  // Engine 5: Resources
  { id: "hr",            name: "人力资源",    nameEn: "HR",            icon: Users,           color: "#CA5010", menuGroupNames: ["人力资源", "能力体系"],       defaultPath: "/hrm-intelligent",         engine: "resources" },
  { id: "finance",       name: "财务管理",    nameEn: "Finance",       icon: Wallet,          color: "#498205", menuGroupNames: ["财务管理"],                  defaultPath: "/expense-report",          engine: "resources" },
  { id: "oa",            name: "Smart OA",    nameEn: "Smart OA",      icon: ClipboardList,   color: "#881798", menuGroupNames: ["Smart OA", "协作与文档"],    defaultPath: "/oa-dashboard",            engine: "resources" },
  { id: "admin",         name: "系统管理",    nameEn: "Admin",         icon: Settings,        color: "#69797E", menuGroupNames: ["系统管理", "平台能力"],       defaultPath: "/system-control-tower",    engine: "resources" },
];

// ============================================
// 菜单配置 - 按业务流程重构 // 12个一级模块，面向事业部微分工
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
    superCategory: "portal",
    items: [
      { name: "千人千面", nameEn: "Me Engine", nameDe: "Mein Portal", nameFr: "Mon moteur", path: "/me", icon: User, isNew: true },
      { name: "个人门户", nameEn: "My Workspace", nameDe: "Mein Portal", nameFr: "Mon portail", path: "/my-workspace", icon: Star, isNew: true },
      { name: "我的看板", nameEn: "My Dashboard", nameDe: "Mein Dashboard", nameFr: "Mon tableau de bord", path: "/", icon: Home },
      { name: "通知中心", nameEn: "Notifications", nameDe: "Benachrichtigungen", nameFr: "Notifications", path: "/notifications", icon: BellRing },
      { name: "智慧会议", nameEn: "Smart Meeting", nameDe: "Intelligente Besprechung", nameFr: "Réunion intelligente", path: "/smart-meeting", icon: Video },
      { name: "会议效能分析", nameEn: "Meeting Executive", nameDe: "Besprechungsanalyse", nameFr: "Analyse des réunions", path: "/meeting-executive", icon: BarChart3, isNew: true },
      { name: "实施路线图", nameEn: "Roadmap", nameDe: "Fahrplan", nameFr: "Feuille de route", path: "/roadmap", icon: Calendar },
      { name: "工具箱", nameEn: "Tools", nameDe: "Werkzeuge", nameFr: "Outils", path: "/tools", icon: Layers },
      { name: "角色工作台", nameEn: "Role Dashboard", nameDe: "Rollen-Dashboard", nameFr: "Tableau de bord rôle", path: "/dashboard", icon: LayoutDashboard },
      { name: "任务驾驶舱", nameEn: "Task Cockpit", nameDe: "Aufgaben-Cockpit", nameFr: "Cockpit des tâches", path: "/task-cockpit", icon: LayoutDashboard, isNew: true },
      { name: "项目360驾驶舱", nameEn: "Project 360 Cockpit", nameDe: "Projekt-360-Cockpit", nameFr: "Cockpit Projet 360", path: "/project-360-cockpit", icon: LayoutDashboard, isNew: true },
      { name: "CEO数字驾驶舱", nameEn: "CEO Executive Cockpit", nameDe: "CEO-Leitstand", nameFr: "Cockpit Exécutif CEO", path: "/ceo/executive-cockpit", icon: Crown, isNew: true },
      { name: "会议智能", nameEn: "Meeting Intelligence", nameDe: "Besprechungsintelligenz", nameFr: "Intelligence réunion", path: "/meeting-intelligence", icon: Video },
      { name: "个人设置", nameEn: "User Profile", nameDe: "Benutzerprofil", nameFr: "Profil utilisateur", path: "/user-profile", icon: UserCog },
      { name: "我的360画像", nameEn: "My 360 Profile", nameDe: "Mein 360-Profil", nameFr: "Mon profil 360", path: "/my-360-profile", icon: Sparkles, isNew: true },
      { name: "万能工作台", nameEn: "Universal Workspace", nameDe: "Universal-Arbeitsbereich", nameFr: "Espace universel", path: "/workspace", icon: LayoutDashboard, isNew: true },
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
    superCategory: "operations",
    items: [
      { name: "销售CRM工作台", nameEn: "Sales CRM", nameDe: "Vertriebs-CRM", nameFr: "CRM Ventes", path: "/sales-crm", icon: TrendingUp, isNew: true },
      { name: "客户管理", nameEn: "Customers", nameDe: "Kunden", nameFr: "Clients", path: "/crm/customers", icon: Users, requiresBU: true },
      { name: "商机管理", nameEn: "Opportunities", nameDe: "Geschäftschancen", nameFr: "Opportunités", path: "/crm/opportunities", icon: Target, requiresBU: true },
      { name: "联系人", nameEn: "Contacts", nameDe: "Kontakte", nameFr: "Contacts", path: "/crm/contacts", icon: Contact },
      { name: "线索管理", nameEn: "Leads", nameDe: "Leads", nameFr: "Prospects", path: "/leads", icon: TrendingUp },
      { name: "报价管理", nameEn: "Quotation Mgmt", nameDe: "Angebotsverwaltung", nameFr: "Gestion devis", path: "/quotation-management", icon: Calculator, isNew: true, requiresBU: true },
      { name: "合同管理", nameEn: "Contracts", nameDe: "Verträge", nameFr: "Contrats", path: "/contract-management", icon: FileCheck, isNew: true },
      { name: "NDA/NPA管理", nameEn: "NDA Management", nameDe: "NDA-Verwaltung", nameFr: "Gestion NDA", path: "/nda-management", icon: Lock, isNew: true },
      { name: "销售资料库", nameEn: "Sales Materials", nameDe: "Vertriebsmaterialien", nameFr: "Matériaux de vente", path: "/sales-materials", icon: BookOpen, isNew: true },
      { name: "AI报价助手", nameEn: "AI Quotation", nameDe: "KI-Angebot", nameFr: "IA Devis", path: "/ai/quotation-assistant", icon: Bot },
      { name: "客户门户", nameEn: "Customer Portal", nameDe: "Kundenportal", nameFr: "Portail client", path: "/customer-portal", icon: UserCheck },
      { name: "销售分析", nameEn: "Sales Analytics", nameDe: "Vertriebsanalyse", nameFr: "Analyse des ventes", path: "/sales-analytics", icon: BarChart3, isNew: true, requiresBU: true },
      { name: "客户价值视图", nameEn: "Customer Value", nameDe: "Kundenwert", nameFr: "Valeur client", path: "/customer-value-view", icon: Crown },
      { name: "报价生成", nameEn: "Quotation Create", nameDe: "Angebot erstellen", nameFr: "Créer un devis", path: "/quotation-create", icon: Calculator, isNew: true, requiresBU: true },
      { name: "AI销售预测", nameEn: "AI Sales Forecast", nameDe: "KI-Vertriebsprognose", nameFr: "IA Prévision ventes", path: "/ai-sales-forecast", icon: TrendingUp, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "bu_sales", "dept_manager"] },
      { name: "AI客户流失", nameEn: "AI Churn", nameDe: "KI-Abwanderung", nameFr: "IA Attrition", path: "/ai-customer-churn", icon: UserCheck, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "bu_sales", "dept_manager"] },
      { name: "商机→需求转化", nameEn: "Opp Conversion", nameDe: "Chancen-Konvertierung", nameFr: "Conversion opportunité", path: "/opportunity-conversion", icon: Target, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "bu_sales", "bu_pm", "dept_manager"] },
      { name: "评审→报价联动", nameEn: "Review→Quote", nameDe: "Prüfung→Angebot", nameFr: "Revue→Devis", path: "/review-to-quotation", icon: FileCheck, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "bu_sales", "bu_pm", "dept_manager"] },
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
    superCategory: "operations",
    items: [
      { name: "需求分析", nameEn: "Requirements", nameDe: "Anforderungen", nameFr: "Exigences", path: "/requirements-analysis", icon: ClipboardCheck, requiresBU: true, isNew: true },
      { name: "方案设计", nameEn: "Solution Design", nameDe: "Lösungsdesign", nameFr: "Conception solution", path: "/solution-design", icon: Lightbulb, requiresBU: true, isNew: true },
      { name: "机械设计", nameEn: "Mechanical Design", nameDe: "Mechanikkonstruktion", nameFr: "Conception mécanique", path: "/mechanical-design", icon: Cog, requiresBU: true, isNew: true },
      { name: "电气设计", nameEn: "Electrical Design", nameDe: "Elektrokonstruktion", nameFr: "Conception électrique", path: "/electrical-design", icon: Zap, requiresBU: true, isNew: true },
      { name: "BOM管理", nameEn: "BOM Management", nameDe: "BOM-Verwaltung", nameFr: "Gestion BOM", path: "/bom-management", icon: Package, requiresBU: true, isNew: true },
      { name: "PLM工作台", nameEn: "PLM Workbench", nameDe: "PLM-Arbeitsplatz", nameFr: "Poste PLM", path: "/plm", icon: FileText, isNew: true },
      { name: "技术文档", nameEn: "Tech Documents", nameDe: "Techn. Dokumente", nameFr: "Documents techniques", path: "/tech-documents", icon: FileText, isNew: true },
      { name: "项目文件库", nameEn: "Project Vault", nameDe: "Projektarchiv", nameFr: "Coffre-fort projet", path: "/project-vault", icon: Database, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "bu_elec", "dept_manager"] },
      { name: "数字孪生中心", nameEn: "Digital Twin Hub", nameDe: "Digitaler Zwilling", nameFr: "Jumeau numérique", path: "/digital-twin", icon: Box, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "bu_elec", "dept_manager"] },
      { name: "AI方案助手", nameEn: "AI Solution", nameDe: "KI-Lösung", nameFr: "IA Solution", path: "/ai/solution-assistant", icon: Bot },
      { name: "AI需求分析", nameEn: "AI Requirements", nameDe: "KI-Anforderungen", nameFr: "IA Exigences", path: "/ai-requirements-analysis", icon: ClipboardCheck, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "bu_elec", "dept_manager"] },
      { name: "AI设计审查", nameEn: "AI Design Review", nameDe: "KI-Designprüfung", nameFr: "IA Revue conception", path: "/ai-design-review", icon: Shield, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "bu_elec", "dept_manager"] },
      { name: "3D模型预览", nameEn: "3D Model Viewer", nameDe: "3D-Modellansicht", nameFr: "Visionneuse 3D", path: "/model-viewer-3d", icon: Box, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "bu_elec", "dept_manager"] },
      { name: "BOM校验", nameEn: "BOM Verification", nameDe: "BOM-Prüfung", nameFr: "Vérification BOM", path: "/bom-verification", icon: CheckCircle, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "bu_elec"] },
      { name: "BOM导入", nameEn: "BOM Import", nameDe: "BOM-Import", nameFr: "Import BOM", path: "/bom-import", icon: Upload, isNew: true,
        allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec"] },
      { name: "BOM Excel导入", nameEn: "BOM Excel Import", nameDe: "BOM Excel-Import", nameFr: "Import BOM Excel", path: "/bom-excel-import", icon: Upload, isNew: true,
        allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec"] },
      { name: "BDO图纸管理", nameEn: "Drawing Library", nameDe: "Zeichnungsbibliothek", nameFr: "Bibliothèque dessins", path: "/drawing-library", icon: FileText, isNew: true },
      { name: "ECO成本影响", nameEn: "ECO Cost Impact", nameDe: "ECO-Kostenauswirkung", nameFr: "Impact coût ECO", path: "/engineering/eco-review", icon: GitCompare, isNew: true },
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
    superCategory: "operations",
    items: [
      { name: "运营中枢", nameEn: "Operations Hub", nameDe: "Betriebszentrale", nameFr: "Centre opérations", path: "/operations", icon: Layers, isNew: true },
      { name: "新项目向导", nameEn: "New Project Wizard", nameDe: "Neues Projekt-Assistent", nameFr: "Assistant nouveau projet", path: "/operations/new-project", icon: Sparkles, isNew: true },
      { name: "AI项目Agent", nameEn: "Project Agent", nameDe: "Projekt-Agent", nameFr: "Agent de Projet", path: "/project-agent", icon: Bot, isNew: true, allowedRoles: ["admin", "director", "bu_gm", "dept_manager", "bu_pm", "team_lead"] },
      { name: "项目列表", nameEn: "Projects", nameDe: "Projekte", nameFr: "Projets", path: "/projects", icon: FolderKanban, requiresBU: true },
    ],
    subgroups: [
      // ── 项目执行 ──
      {
        name: "项目执行",
        nameEn: "Project Execution",
        nameDe: "Projektausführung",
        nameFr: "Exécution de projet",
        icon: Kanban,
        items: [
          { name: "门径管理", nameEn: "Stage Gate", nameDe: "Stage-Gate", nameFr: "Jalons projet", path: "/stage-gate", icon: CheckSquare, isNew: true },
          { name: "M1启动会", nameEn: "M1 Kickoff", nameDe: "M1 Kickoff", nameFr: "M1 Lancement", path: "/m1-kickoff", icon: Sparkles },
          { name: "M7-M9交付", nameEn: "M7-M9 Delivery", nameDe: "M7-M9 Lieferung", nameFr: "M7-M9 Livraison", path: "/m7-m9-delivery", icon: Clock },
          { name: "项目看板", nameEn: "Kanban Board", nameDe: "Kanban-Board", nameFr: "Tableau Kanban", path: "/tasks", icon: Kanban },
          { name: "甘特图", nameEn: "Gantt Chart", nameDe: "Gantt-Diagramm", nameFr: "Diagramme de Gantt", path: "/gantt", icon: BarChart3, isNew: true },
          { name: "交付管理", nameEn: "Delivery Mgmt", nameDe: "Lieferverwaltung", nameFr: "Gestion livraisons", path: "/delivery-management", icon: Truck },
        ],
      },
      // ── 项目工具 ──
      {
        name: "项目工具",
        nameEn: "Project Tools",
        nameDe: "Projektwerkzeuge",
        nameFr: "Outils de projet",
        icon: FileText,
        items: [
          { name: "研发验证中心", nameEn: "R&D Verification", nameDe: "F&E-Verifizierung", nameFr: "Vérification R&D", path: "/rd-verification", icon: Shield, isNew: true },
          { name: "AI计划助手", nameEn: "AI Planning", nameDe: "KI-Planung", nameFr: "IA Planification", path: "/ai/planning-assistant", icon: Bot },
          { name: "风险管理", nameEn: "Risk Mgmt", nameDe: "Risikomanagement", nameFr: "Gestion des risques", path: "/risks", icon: AlertTriangle },
          { name: "SOP模板库", nameEn: "SOP Library", nameDe: "SOP-Bibliothek", nameFr: "Bibliothèque SOP", path: "/sop-library", icon: BookOpen, isNew: true },
          { name: "阶段文档管理", nameEn: "Phase Documents", nameDe: "Phasendokumente", nameFr: "Documents de phase", path: "/project-phase-documents", icon: FileText, isNew: true },
          { name: "项目数字孪生", nameEn: "Project Digital Twin", nameDe: "Projekt-Digitaler Zwilling", nameFr: "Jumeau numérique projet", path: "/project-digital-twin", icon: Cpu, isNew: true },
          { name: "区域认证管理", nameEn: "Regional Cert", nameDe: "Regionale Zertifizierung", nameFr: "Certification régionale", path: "/regional-certification", icon: Award, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "dept_manager"], requiresBU: true },
          { name: "工作日计算器", nameEn: "Working Days", nameDe: "Arbeitstagerechner", nameFr: "Calculateur jours ouvrés", path: "/working-days-calculator", icon: CalendarDays, isNew: true },
          { name: "设备合规追踪", nameEn: "Equipment Compliance", nameDe: "Geräte-Compliance", nameFr: "Conformité équipement", path: "/equipment-compliance", icon: Shield, isNew: true },
        ],
      },
      // ── POS系统 ──
      {
        name: "POS系统",
        nameEn: "POS System",
        nameDe: "POS-System",
        nameFr: "Système POS",
        icon: Landmark,
        items: [
          { name: "POS总览", nameEn: "POS Dashboard", nameDe: "POS-Dashboard", nameFr: "Tableau de bord POS", path: "/pos/dashboard", icon: LayoutDashboard, isNew: true,
            allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "bu_sales"] },
          { name: "POS项目", nameEn: "POS Projects", nameDe: "POS-Projekte", nameFr: "Projets POS", path: "/pos/projects", icon: FolderKanban, isNew: true,
            allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "bu_sales"] },
          { name: "POS客户", nameEn: "POS Customers", nameDe: "POS-Kunden", nameFr: "Clients POS", path: "/pos/customers", icon: Users, isNew: true,
            allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "bu_sales"] },
          { name: "POS采购", nameEn: "POS Procurement", nameDe: "POS-Beschaffung", nameFr: "Achats POS", path: "/pos/procurement", icon: ShoppingCart, isNew: true,
            allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "bu_sales"] },
          { name: "POS-MES同步", nameEn: "POS MES Sync", nameDe: "POS-MES-Sync", nameFr: "Sync POS-MES", path: "/pos/mes", icon: RefreshCw, isNew: true,
            allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "bu_sales"] },
          { name: "POS连接器配置", nameEn: "POS Connectors", nameDe: "POS-Konnektoren", nameFr: "Connecteurs POS", path: "/pos/connectors", icon: Cable, isNew: true,
            allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "bu_sales"] },
        ],
      },
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
    superCategory: "operations",
    items: [
      { name: "生产指挥中心", nameEn: "Command Center", nameDe: "Leitstand", nameFr: "Centre de commande", path: "/production-command-center", icon: Monitor, isNew: true },
      { name: "生产看板", nameEn: "Production Board", nameDe: "Produktions-Board", nameFr: "Tableau production", path: "/production-dashboard", icon: Factory },
    ],
    subgroups: [
      // ── 生产计划与排程 ──
      {
        name: "生产计划与排程",
        nameEn: "Production Planning & Scheduling",
        nameDe: "Produktionsplanung & Terminierung",
        nameFr: "Planification & ordonnancement",
        icon: CalendarClock,
        items: [
          { name: "工序管理", nameEn: "Process Mgmt", nameDe: "Prozessverwaltung", nameFr: "Gestion des processus", path: "/process-management", icon: Wrench, isNew: true },
          { name: "智能排程", nameEn: "Smart Scheduling", nameDe: "Intelligente Planung", nameFr: "Planification intelligente", path: "/intelligent-scheduling", icon: Cpu },
          { name: "工序进度", nameEn: "Production Steps", nameDe: "Fertigungsschritte", nameFr: "Étapes production", path: "/production-steps", icon: Wrench, isNew: true },
          { name: "工序进度大屏", nameEn: "Process Progress", nameDe: "Prozessfortschritt", nameFr: "Avancement processus", path: "/process-progress", icon: Monitor, isNew: true },
          { name: "生产执行视图", nameEn: "Production Execution", nameDe: "Produktionsausführung", nameFr: "Exécution production", path: "/production-execution", icon: Factory, isNew: true },
          { name: "BOM冻结→排产", nameEn: "BOM Freeze", nameDe: "BOM-Einfrierung", nameFr: "Gel BOM", path: "/bom-freeze-automation", icon: Package, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "dept_manager"] },
          { name: "设备健康排产", nameEn: "Smart APS", nameDe: "Intelligente APS", nameFr: "APS Intelligent", path: "/production/smart-schedule", icon: Activity, isNew: true },
        ],
      },
      // ── 质量管理 (IATF Core) ──
      {
        name: "质量管理 (IATF Core)",
        nameEn: "Quality Management",
        nameDe: "Qualitätsmanagement",
        nameFr: "Gestion de la qualité",
        icon: Shield,
        items: [
          { name: "质检管理", nameEn: "QC Management", nameDe: "QS-Verwaltung", nameFr: "Gestion contrôle qualité", path: "/qc-management", icon: ClipboardCheck },
          { name: "SPC控制图", nameEn: "SPC Charts", nameDe: "SPC-Regelkarten", nameFr: "Cartes SPC", path: "/spc-charts", icon: BarChart3, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "dept_manager"] },
          { name: "NCR不合格品", nameEn: "NCR Workflow", nameDe: "NCR-Workflow", nameFr: "Workflow NCR", path: "/ncr-workflow", icon: AlertTriangle, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "dept_manager"] },
          { name: "质量门禁", nameEn: "Quality Interlock", nameDe: "Qualitätsschranke", nameFr: "Verrouillage qualité", path: "/quality-interlock", icon: Shield, isNew: true },
          { name: "质检关卡", nameEn: "Quality Checkpoints", nameDe: "Qualitätsprüfpunkte", nameFr: "Points de contrôle qualité", path: "/quality-checkpoints", icon: CheckCircle, isNew: true },
          { name: "质量预测", nameEn: "Quality Prediction", nameDe: "Qualitätsprognose", nameFr: "Prédiction qualité", path: "/quality-prediction", icon: Shield, isNew: true },
          { name: "清洁度检测", nameEn: "Cleanliness QC", nameDe: "Sauberkeitsprüfung", nameFr: "Contrôle propreté", path: "/cleanliness-inspection", icon: ClipboardCheck, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "dept_manager"] },
          { name: "AI产品合格证", nameEn: "Product Certificate", nameDe: "Produktzertifikat", nameFr: "Certificat produit", path: "/product-certificate", icon: FileCheck, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "dept_manager"] },
          { name: "AI质量月报", nameEn: "Quality Monthly", nameDe: "Qualitätsmonatsbericht", nameFr: "Rapport qualité mensuel", path: "/quality-monthly-report", icon: BarChart3, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "dept_manager"] },
          { name: "PPAP管理", nameEn: "PPAP Management", nameDe: "PPAP-Verwaltung", nameFr: "Gestion PPAP", path: "/ppap", icon: FileCheck, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "dept_manager"] },
          { name: "FMEA分析", nameEn: "FMEA Analysis", nameDe: "FMEA-Analyse", nameFr: "Analyse FMEA", path: "/fmea", icon: Shield, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "dept_manager"] },
          { name: "FMEA动态风险", nameEn: "FMEA Live RPN", nameDe: "FMEA Live-RPN", nameFr: "FMEA RPN Dynamique", path: "/quality/fmea-live", icon: Activity, isNew: true },
          { name: "控制计划", nameEn: "Control Plan", nameDe: "Kontrollplan", nameFr: "Plan de contrôle", path: "/control-plan", icon: ClipboardCheck, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "dept_manager"] },
          { name: "8D/CAPA", nameEn: "8D/CAPA", nameDe: "8D/CAPA", nameFr: "8D/CAPA", path: "/8d-capa", icon: AlertTriangle, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "dept_manager"] },
          { name: "MSA分析", nameEn: "MSA Analysis", nameDe: "MSA-Analyse", nameFr: "Analyse MSA", path: "/msa", icon: Target, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "dept_manager"] },
          { name: "安全规则", nameEn: "Safety Rules", nameDe: "Sicherheitsregeln", nameFr: "Règles de sécurité", path: "/safety-rules", icon: ShieldAlert, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "dept_manager"] },
        ],
      },
      // ── 物料与库存 ──
      {
        name: "物料与库存",
        nameEn: "Materials & Inventory",
        nameDe: "Material & Bestand",
        nameFr: "Matériaux & inventaire",
        icon: Package,
        items: [
          { name: "物料追踪", nameEn: "Material Tracking", nameDe: "Materialverfolgung", nameFr: "Suivi matières", path: "/material-tracking", icon: Package, isNew: true },
          { name: "物料流转追踪", nameEn: "Material Flow", nameDe: "Materialfluss", nameFr: "Flux matières", path: "/material-flow", icon: Truck, isNew: true },
          { name: "库存看板", nameEn: "Inventory Dashboard", nameDe: "Bestands-Dashboard", nameFr: "Tableau des stocks", path: "/inventory-dashboard", icon: Boxes, isNew: true },
          { name: "库存优化", nameEn: "Inventory Optimization", nameDe: "Bestandsoptimierung", nameFr: "Optimisation stocks", path: "/inventory-optimization", icon: Package, isNew: true },
          { name: "智能安全库存", nameEn: "Smart Safety Stock", nameDe: "Intelligenter Sicherheitsbestand", nameFr: "Stock de sécurité intelligent", path: "/supply-chain/smart-inventory", icon: TrendingUp, isNew: true },
          { name: "AI缺料预警", nameEn: "Shortage Alert", nameDe: "Fehlmengenwarnung", nameFr: "Alerte pénurie", path: "/material-shortage-alert", icon: AlertTriangle, isNew: true },
          { name: "智能工位领料", nameEn: "Requisition", nameDe: "Materialanforderung", nameFr: "Réquisition matériel", path: "/workstation-requisition", icon: Package, isNew: true },
        ],
      },
      // ── 工人与工序 ──
      {
        name: "工人与工序",
        nameEn: "Workers & Processes",
        nameDe: "Mitarbeiter & Prozesse",
        nameFr: "Opérateurs & processus",
        icon: HardHat,
        items: [
          { name: "工人管理", nameEn: "Worker Mgmt", nameDe: "Mitarbeiterverwaltung", nameFr: "Gestion opérateurs", path: "/worker-management", icon: HardHat },
          { name: "工人导入", nameEn: "Worker Import", nameDe: "Mitarbeiter-Import", nameFr: "Import opérateurs", path: "/worker-import", icon: Users },
          { name: "工人绩效排行", nameEn: "Worker Leaderboard", nameDe: "Mitarbeiter-Rangliste", nameFr: "Classement opérateurs", path: "/worker-performance", icon: Trophy, isNew: true, minLevel: 2 },
          { name: "工人移动端", nameEn: "Worker Mobile", nameDe: "Mitarbeiter-Mobil", nameFr: "Mobile opérateur", path: "/worker-mobile", icon: HardHat, isNew: true },
          { name: "SOP工艺卡片", nameEn: "SOP Process Card", nameDe: "SOP-Prozesskarte", nameFr: "Fiche processus SOP", path: "/sop-process-card", icon: FileText, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "bu_mech", "bu_elec", "dept_manager"] },
          { name: "交接班记录", nameEn: "Shift Handover", nameDe: "Schichtübergabe", nameFr: "Passation de quart", path: "/shift-handover", icon: RefreshCw, isNew: true },
        ],
      },
      // ── 报表与分析 ──
      {
        name: "报表与分析",
        nameEn: "Reports & Analytics",
        nameDe: "Berichte & Analysen",
        nameFr: "Rapports & analyses",
        icon: BarChart3,
        items: [
          { name: "生产效率分析", nameEn: "Production Efficiency", nameDe: "Produktionseffizienz", nameFr: "Efficacité production", path: "/production-efficiency", icon: TrendingUp, isNew: true },
          { name: "AI生产日报", nameEn: "Daily Report", nameDe: "Tagesbericht", nameFr: "Rapport journalier", path: "/production-daily-report", icon: FileText, isNew: true },
          { name: "三套工时对账", nameEn: "Time Reconciliation", nameDe: "Zeitabgleich", nameFr: "Rapprochement heures", path: "/time-reconciliation", icon: Clock, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "bu_pm", "dept_manager"] },
          { name: "生产异常上报", nameEn: "Exception Report", nameDe: "Störungsmeldung", nameFr: "Rapport d'anomalie", path: "/production-exception-report", icon: AlertTriangle, isNew: true },
        ],
      },
      // ── 测试与集成 ──
      {
        name: "测试与集成",
        nameEn: "Testing & Integration",
        nameDe: "Tests & Integration",
        nameFr: "Tests & intégration",
        icon: Cpu,
        items: [
          { name: "供应商评估", nameEn: "Supplier Assessment", nameDe: "Lieferantenbewertung", nameFr: "Évaluation fournisseurs", path: "/supplier-assessment", icon: Truck, isNew: true },
          { name: "M8 FAT协调", nameEn: "M8 FAT Coordination", nameDe: "M8 FAT-Koordination", nameFr: "Coordination M8 FAT", path: "/fat-coordination", icon: ClipboardCheck, isNew: true,
            allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "cs_engineer"] },
          { name: "FAT/SAT执行", nameEn: "FAT/SAT Execution", nameDe: "FAT/SAT-Durchführung", nameFr: "Exécution FAT/SAT", path: "/fat-sat-execution", icon: ClipboardCheck, isNew: true,
            allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "cs_engineer"] },
          { name: "CCD集成", nameEn: "CCD Integration", nameDe: "CCD-Integration", nameFr: "Intégration CCD", path: "/ccd-integration", icon: Cpu, isNew: true,
            allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec"] },
          { name: "CCD实时看板", nameEn: "CCD Realtime", nameDe: "CCD-Echtzeit", nameFr: "CCD temps réel", path: "/ccd-realtime", icon: Monitor, isNew: true,
            allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec"] },
          { name: "UWB定位", nameEn: "UWB Tracking", nameDe: "UWB-Ortung", nameFr: "Localisation UWB", path: "/uwb-management", icon: MapPin },
          { name: "UWB设备管理", nameEn: "UWB Devices", nameDe: "UWB-Geräte", nameFr: "Appareils UWB", path: "/production/uwb-devices", icon: MapPin, isNew: true,
            allowedRoles: ["admin"] },
          { name: "通知渠道配置", nameEn: "Notification Channels", nameDe: "Benachrichtigungskanäle", nameFr: "Canaux de notification", path: "/production/notification-channels", icon: Bell, isNew: true,
            allowedRoles: ["admin"] },
          { name: "车间终端", nameEn: "Workshop Kiosk", nameDe: "Werkstatt-Terminal", nameFr: "Borne atelier", path: "/kiosk", icon: Monitor, isNew: true,
            allowedRoles: ["admin"] },
          { name: "设备登录门禁", nameEn: "Machine Access Login", nameDe: "Maschinen-Zugang", nameFr: "Accès machine", path: "/shop-floor/machine-login", icon: ShieldCheck, isNew: true },
          { name: "OEE设备效率", nameEn: "OEE Dashboard", nameDe: "OEE-Dashboard", nameFr: "Tableau OEE", path: "/shop-floor/oee-dashboard", icon: Gauge, isNew: true },
          { name: "测试执行矩阵", nameEn: "Test Execution Matrix", nameDe: "Testausführungsmatrix", nameFr: "Matrice d'exécution tests", path: "/test-execution-dashboard", icon: TestTube, isNew: true,
            allowedRoles: ["admin", "bu_pm", "bu_mech", "bu_elec", "dept_manager", "cs_engineer"] },
          { name: "工艺试验", nameEn: "Process Trials", nameDe: "Prozesstests", nameFr: "Essais de procédé", path: "/process-trials", icon: TestTube, isNew: true },
        ],
      },
    ],
  },

  // ────────────────────────────────────
  // 5.5、供应链管理（IATF 16949 全链追溯）  // ────────────────────────────────────
  {
    name: "供应链管理",
    nameEn: "Supply Chain",
    nameDe: "Lieferkette",
    nameFr: "Chaîne d'approvisionnement",
    icon: Truck,
    permissionKey: "canAccessSupplyChain",
    superCategory: "operations",
    items: [
      { name: "供应链工作台", nameEn: "Supply Chain Workbench", nameDe: "Lieferketten-Arbeitsplatz", nameFr: "Poste chaîne d'appro.", path: "/supply-chain", icon: LayoutDashboard, isNew: true },
      { name: "物料管理", nameEn: "Material Management", nameDe: "Materialwirtschaft", nameFr: "Gestion matières", path: "/material-management", icon: Package, isNew: true },
      { name: "采购管理", nameEn: "Procurement", nameDe: "Beschaffung", nameFr: "Approvisionnement", path: "/procurement-management", icon: ShoppingCart, isNew: true },
      { name: "仓库管理", nameEn: "Warehouse Mgmt", nameDe: "Lagerverwaltung", nameFr: "Gestion entrepôt", path: "/warehouse-management", icon: Warehouse, isNew: true },
      { name: "采购工作台", nameEn: "Procurement Workbench", nameDe: "Beschaffungs-Arbeitsplatz", nameFr: "Poste achats", path: "/procurement-workbench", icon: ShoppingCart, isNew: true },
      { name: "供应链计划", nameEn: "Supply Chain Planning", nameDe: "Lieferkettenplanung", nameFr: "Planification chaîne d'appro.", path: "/supply-chain-planning", icon: CalendarClock, isNew: true },
      { name: "备件管理", nameEn: "Spare Parts", nameDe: "Ersatzteile", nameFr: "Pièces détachées", path: "/spare-parts", icon: Wrench, isNew: true },
      { name: "AI询价Bot", nameEn: "AI RFQ Bot", nameDe: "AI-Angebotsbot", nameFr: "Bot RFQ IA", path: "/supply-chain-rfq", icon: Bot, isNew: true },
      { name: "供应商风险雷达", nameEn: "Supplier Risk Radar", nameDe: "Lieferanten-Risikoradar", nameFr: "Radar risque fournisseur", path: "/supply-chain/risk-radar", icon: AlertTriangle, isNew: true },
      { name: "天思ERP集成", nameEn: "Tiansi ERP", nameDe: "Tiansi ERP", nameFr: "Tiansi ERP", path: "/erp-integration", icon: RefreshCw, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "dept_manager"] },
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
    superCategory: "operations",
    items: [
      { name: "售后保修工作台", nameEn: "After-Sales Workbench", nameDe: "Kundendienst-Arbeitsplatz", nameFr: "Poste après-vente", path: "/after-sales-workbench", icon: Wrench, isNew: true },
      { name: "现场安装", nameEn: "Field Installation", nameDe: "Vor-Ort-Installation", nameFr: "Installation sur site", path: "/field-installation", icon: Wrench, isNew: true, requiresBU: true },
      { name: "SAT测试", nameEn: "SAT Testing", nameDe: "SAT-Test", nameFr: "Test SAT", path: "/sat-testing", icon: TestTube, isNew: true, requiresBU: true },
      { name: "终验收", nameEn: "Final Acceptance", nameDe: "Endabnahme", nameFr: "Réception finale", path: "/final-acceptance", icon: CheckCircle, isNew: true, requiresBU: true },
      { name: "售后工单", nameEn: "Service Tickets", nameDe: "Service-Tickets", nameFr: "Tickets service", path: "/service-tickets", icon: Ticket, isNew: true },
      { name: "客户反馈", nameEn: "Customer Feedback", nameDe: "Kundenfeedback", nameFr: "Retours clients", path: "/customer-feedback", icon: MessageCircle, isNew: true },
      { name: "现场工程师", nameEn: "Field Engineer", nameDe: "Außendiensttechniker", nameFr: "Ingénieur terrain", path: "/m/field-dashboard", icon: Wrench, isNew: true },
      { name: "AI故障诊断", nameEn: "AI Fault Diagnosis", nameDe: "KI-Fehlerdiagnose", nameFr: "IA Diagnostic pannes", path: "/ai-fault-diagnosis", icon: Stethoscope, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "cs_engineer", "dept_manager"] },
      { name: "AI预防维护", nameEn: "AI Maintenance", nameDe: "KI-Wartungsplanung", nameFr: "IA Maintenance préventive", path: "/ai-maintenance-plan", icon: Wrench, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "cs_engineer", "dept_manager"] },
      { name: "客户自助报修", nameEn: "Customer Repair", nameDe: "Selbstservice-Reparatur", nameFr: "Auto-réparation client", path: "/customer-repair", icon: Ticket, isNew: true },
      // Phase 21 P1: 服务高级
      { name: "AI远程支持", nameEn: "Remote Assist", nameDe: "Fernunterstützung", nameFr: "Assistance à distance", path: "/remote-assistance", icon: Headphones, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "cs_engineer", "dept_manager"] },
      { name: "SLA分析仪表板", nameEn: "SLA Dashboard", nameDe: "SLA-Dashboard", nameFr: "Tableau de bord SLA", path: "/service-sla", icon: Gauge, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "cs_engineer", "dept_manager"] },
      { name: "售后→设计反馈", nameEn: "Design Feedback", nameDe: "Design-Rückmeldung", nameFr: "Retour conception", path: "/aftersales-design-feedback", icon: GitBranch, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "cs_engineer", "bu_pm", "bu_mech", "dept_manager"] },
      { name: "工单→知识库", nameEn: "Ticket→KB", nameDe: "Ticket→Wissensbasis", nameFr: "Ticket→Base de connaissances", path: "/ticket-to-kb", icon: BookOpen, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "cs_engineer", "dept_manager"] },
      { name: "NPS满意度调查", nameEn: "NPS Survey", nameDe: "NPS-Umfrage", nameFr: "Enquête NPS", path: "/nps-survey", icon: Star, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "cs_engineer", "dept_manager"] },
      { name: "QC终检→验收通知", nameEn: "QC→Acceptance", nameDe: "QS→Abnahme", nameFr: "CQ→Réception", path: "/qc-pass-notification", icon: CheckCircle, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "cs_engineer", "bu_pm", "dept_manager"] },
      { name: "客户数字孪生门户", nameEn: "Customer Digital Twin", nameDe: "Kunden-Digitaler-Zwilling", nameFr: "Portail jumeau numérique", path: "/customer-digital-twin", icon: Box, isNew: true },
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
    superCategory: "resources",
    items: [
      { name: "资源中枢", nameEn: "Resources Hub", nameDe: "Ressourcen-Zentrale", nameFr: "Centre ressources", path: "/resources", icon: Building2, isNew: true },
      { name: "HRM智能台", nameEn: "HRM Intelligent", nameDe: "HRM Intelligent", nameFr: "HRM Intelligent", path: "/hrm-intelligent", icon: Brain,
        allowedRoles: ["admin", "director", "hr_manager", "hr_specialist"] },
    ],
    subgroups: [
      // ── 员工管理 ──
      {
        name: "员工管理",
        nameEn: "Employee Management",
        nameDe: "Mitarbeiterverwaltung",
        nameFr: "Gestion des employés",
        icon: Users,
        items: [
          { name: "HR链路", nameEn: "HR Lifecycle", nameDe: "HR-Lebenszyklus", nameFr: "Cycle de vie RH", path: "/hr-lifecycle", icon: Users,
            allowedRoles: ["admin", "director", "hr_manager", "hr_specialist"] },
          { name: "员工管理", nameEn: "Employee Mgmt", nameDe: "Mitarbeiterverwaltung", nameFr: "Gestion employés", path: "/employee-management", icon: Users, isNew: true,
            allowedRoles: ["admin", "director", "hr_manager", "hr_specialist", "dept_manager"] },
          { name: "招聘管理", nameEn: "Recruitment", nameDe: "Personalgewinnung", nameFr: "Recrutement", path: "/recruitment", icon: UserCheck, isNew: true,
            allowedRoles: ["admin", "director", "hr_manager", "hr_specialist", "dept_manager"] },
          { name: "考勤管理", nameEn: "Attendance", nameDe: "Anwesenheit", nameFr: "Présence", path: "/attendance", icon: Clock, isNew: true,
            allowedRoles: ["admin", "hr_manager", "hr_specialist", "dept_manager", "team_lead"] },
          { name: "离职管理", nameEn: "Offboarding", nameDe: "Offboarding", nameFr: "Départ employé", path: "/offboarding", icon: UserCheck, isNew: true,
            allowedRoles: ["admin", "director", "hr_manager", "hr_specialist"] },
          { name: "来访申请", nameEn: "Visitor Request", nameDe: "Besucheranfrage", nameFr: "Demande de visite", path: "/visitor-request", icon: Users, isNew: true },
          { name: "用户状态管理", nameEn: "User Status", nameDe: "Benutzerstatus", nameFr: "Statut utilisateur", path: "/user-status-management", icon: UserCog, isNew: true,
            allowedRoles: ["admin", "hr_manager"] },
          { name: "BU团队管理", nameEn: "BU Team Mgmt", nameDe: "BU-Teamverwaltung", nameFr: "Gestion équipe BU", path: "/bu-team-management", icon: Building2, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "dept_manager"] },
        ],
      },
      // ── 绩效管理 ──
      {
        name: "绩效管理",
        nameEn: "Performance Management",
        nameDe: "Leistungsmanagement",
        nameFr: "Gestion de la performance",
        icon: Target,
        items: [
          { name: "我的岗位看板", nameEn: "My Position Dashboard", nameDe: "Mein Stellen-Dashboard", nameFr: "Mon tableau de poste", path: "/my-performance", icon: Star, isNew: true },
          { name: "团队绩效", nameEn: "Team Performance", nameDe: "Teamleistung", nameFr: "Performance équipe", path: "/team-performance", icon: Users, isNew: true,
            minLevel: 2 },
          { name: "部门绩效", nameEn: "Dept Performance", nameDe: "Abteilungsleistung", nameFr: "Performance service", path: "/dept-performance", icon: BarChart3, isNew: true,
            minLevel: 3 },
          { name: "BU绩效总览", nameEn: "BU Performance", nameDe: "BU-Leistung", nameFr: "Performance BU", path: "/bu-performance", icon: Building2, isNew: true,
            allowedRoles: ["admin", "director", "bu_gm", "hr_manager"] },
          { name: "智能绩效", nameEn: "Smart Performance", nameDe: "Intelligente Leistung", nameFr: "Performance intelligente", path: "/employee-performance", icon: Star, isNew: true,
            allowedRoles: ["admin", "director", "hr_manager", "hr_specialist", "dept_manager"] },
          { name: "KPI绩效管理", nameEn: "KPI Management", nameDe: "KPI-Verwaltung", nameFr: "Gestion KPI", path: "/kpi-management", icon: Target, isNew: true,
            allowedRoles: ["admin", "director", "hr_manager", "hr_specialist", "dept_manager"] },
        ],
      },
      // ── 薪酬福利 ──
      {
        name: "薪酬福利",
        nameEn: "Compensation & Benefits",
        nameDe: "Vergütung & Leistungen",
        nameFr: "Rémunération & avantages",
        icon: DollarSign,
        items: [
          { name: "薪酬管理", nameEn: "Compensation", nameDe: "Vergütung", nameFr: "Rémunération", path: "/compensation", icon: DollarSign, isNew: true,
            allowedRoles: ["admin", "director", "hr_manager", "finance_manager"] },
          { name: "绩效薪资查询", nameEn: "My Pay & Perf", nameDe: "Mein Gehalt & Leistung", nameFr: "Ma paie & performance", path: "/perf-salary", icon: Wallet, isNew: true },
          { name: "薪资奖金", nameEn: "Salary Bonus", nameDe: "Gehalt & Bonus", nameFr: "Salaire & prime", path: "/salary-bonus", icon: DollarSign, isNew: true,
            allowedRoles: ["admin", "director", "hr_manager", "finance_manager"] },
          { name: "薪资报表", nameEn: "Salary Report", nameDe: "Gehaltsbericht", nameFr: "Rapport salarial", path: "/salary-report", icon: FileText, isNew: true,
            allowedRoles: ["admin", "director", "hr_manager", "finance_manager"] },
          { name: "薪资审批", nameEn: "Salary Approval", nameDe: "Gehaltsfreigabe", nameFr: "Approbation salaire", path: "/salary-approval", icon: CheckCircle, isNew: true,
            allowedRoles: ["admin", "director", "hr_manager", "finance_manager"] },
          { name: "五险一金计算", nameEn: "Social Insurance", nameDe: "Sozialversicherung", nameFr: "Assurance sociale", path: "/ai-social-insurance", icon: Calculator, isNew: true,
            allowedRoles: ["admin", "director", "dept_manager", "hr_manager", "hr_specialist"] },
        ],
      },
      // ── 组织与规划 ──
      {
        name: "组织与规划",
        nameEn: "Organization & Planning",
        nameDe: "Organisation & Planung",
        nameFr: "Organisation & planification",
        icon: Calendar,
        items: [
          { name: "代理职能", nameEn: "Delegation", nameDe: "Stellvertretung", nameFr: "Délégation", path: "/delegation", icon: UserCog, isNew: true },
          { name: "主管工作台", nameEn: "Supervisor", nameDe: "Vorgesetzter", nameFr: "Superviseur", path: "/supervisor-workbench", icon: UserCog, minLevel: 2 },
          { name: "议程管理", nameEn: "Agenda", nameDe: "Terminplanung", nameFr: "Agenda", path: "/agenda", icon: Calendar },
          { name: "年度规划", nameEn: "Annual Planning", nameDe: "Jahresplanung", nameFr: "Planification annuelle", path: "/annual-planning", icon: CalendarRange, minLevel: 3 },
          { name: "培训管理", nameEn: "Training", nameDe: "Schulung", nameFr: "Formation", path: "/training", icon: GraduationCap },
          { name: "中国劳动法合规", nameEn: "CN Labor Law", nameDe: "CN Arbeitsrecht", nameFr: "Droit du travail CN", path: "/cn-labor-compliance", icon: Scale, isNew: true,
            allowedRoles: ["admin", "director", "dept_manager", "hr_manager", "hr_specialist"] },
        ],
      },
      // ── AI人力智能 ──
      {
        name: "AI人力智能",
        nameEn: "AI HR Intelligence",
        nameDe: "KI-Personalintelligenz",
        nameFr: "IA Intelligence RH",
        icon: Bot,
        items: [
          { name: "AI人才评估", nameEn: "AI Talent", nameDe: "KI-Talentbewertung", nameFr: "IA Évaluation talents", path: "/ai-talent-assessment", icon: UserCheck, isNew: true,
            allowedRoles: ["admin", "director", "hr_manager", "hr_specialist", "dept_manager"] },
          { name: "AI培训推荐", nameEn: "AI Training", nameDe: "KI-Schulungsempfehlung", nameFr: "IA Recommandation formation", path: "/ai-training-recommender", icon: GraduationCap, isNew: true,
            allowedRoles: ["admin", "director", "hr_manager", "hr_specialist", "dept_manager", "team_lead"] },
          { name: "AI薪酬分析", nameEn: "AI Compensation", nameDe: "KI-Vergütungsanalyse", nameFr: "IA Analyse rémunération", path: "/ai-compensation-analysis", icon: DollarSign, isNew: true,
            allowedRoles: ["admin", "director", "hr_manager", "finance_manager"] },
          { name: "AI人力规划", nameEn: "AI Workforce", nameDe: "KI-Personalplanung", nameFr: "IA Planification effectifs", path: "/ai-workforce-planning", icon: Users, isNew: true,
            allowedRoles: ["admin", "director", "hr_manager", "bu_gm"] },
          { name: "AI培训闭环", nameEn: "AI Interventions", nameDe: "KI-Schulungsschleife", nameFr: "IA Boucle formation", path: "/hr/ai-interventions", icon: ShieldCheck, isNew: true,
            allowedRoles: ["admin", "director", "hr_manager", "dept_manager"] },
        ],
      },
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
    superCategory: "resources",
    items: [
      { name: "我的能力档案", nameEn: "My Capability", nameDe: "Meine Kompetenzen", nameFr: "Mes compétences", path: "/capability-os", icon: Brain },
      { name: "能力仪表板", nameEn: "Capability Dashboard", nameDe: "Kompetenz-Dashboard", nameFr: "Tableau compétences", path: "/capability-dashboard", icon: BarChart3 },
      { name: "能力矩阵看板", nameEn: "Capability Matrix", nameDe: "Kompetenzmatrix", nameFr: "Matrice compétences", path: "/capability-matrix-board", icon: Grid3X3, isNew: true, minLevel: 2 },
      { name: "证据提交", nameEn: "Evidence Submit", nameDe: "Nachweis einreichen", nameFr: "Soumettre une preuve", path: "/evidence-submission", icon: FileCheck },
      { name: "能力证书", nameEn: "Certificates", nameDe: "Zertifikate", nameFr: "Certificats", path: "/capability-certificates", icon: Medal },
      { name: "能力徽章", nameEn: "Badges", nameDe: "Abzeichen", nameFr: "Badges", path: "/capability-badges", icon: Award },
      { name: "能力路径", nameEn: "Learning Path", nameDe: "Lernpfad", nameFr: "Parcours d'apprentissage", path: "/capability-path", icon: Route },
      { name: "红蓝对抗", nameEn: "Red-Blue Board", nameDe: "Rot-Blau-Board", nameFr: "Tableau rouge-bleu", path: "/red-blue-board", icon: Swords },
      { name: "团队能力分析", nameEn: "Team Analysis", nameDe: "Teamanalyse", nameFr: "Analyse d'équipe", path: "/team-capability-analysis", icon: Users, minLevel: 2 },
      { name: "能力排行榜", nameEn: "Leaderboard", nameDe: "Rangliste", nameFr: "Classement", path: "/capability-leaderboard", icon: TrendingUp },
      { name: "证据审核", nameEn: "Evidence Review", nameDe: "Nachweisprüfung", nameFr: "Revue des preuves", path: "/evidence-review", icon: Award, minLevel: 2 },
      { name: "能力评估矩阵", nameEn: "Assessment Matrix", nameDe: "Bewertungsmatrix", nameFr: "Matrice d'évaluation", path: "/capability-system", icon: LayoutGrid, isNew: true,
        allowedRoles: ["admin", "director", "hr_manager", "hr_specialist", "dept_manager", "bu_gm"] },
      { name: "HR沙盘解析", nameEn: "HR Sandbox", nameDe: "HR-Sandbox", nameFr: "Sandbox RH", path: "/hr-sandbox-capability", icon: Brain, isNew: true, minLevel: 3 },
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
    superCategory: "resources",
    items: [
      // 全员可见 - 费用类
      { name: "费用报销", nameEn: "Expense Report", nameDe: "Spesenabrechnung", nameFr: "Note de frais", path: "/expense-report", icon: Receipt },
      { name: "出差申请", nameEn: "Trip Request", nameDe: "Dienstreiseantrag", nameFr: "Demande de déplacement", path: "/trip-request", icon: Plane },
      { name: "出差大屏", nameEn: "Travel Dashboard", nameDe: "Reise-Dashboard", nameFr: "Tableau déplacements", path: "/travel-dashboard", icon: Monitor },
      // 管理类 - 需权限
      { name: "预算管理", nameEn: "Budget Mgmt", nameDe: "Budgetverwaltung", nameFr: "Gestion budget", path: "/budget-management", icon: Wallet, minLevel: 3 },
      { name: "成本管理", nameEn: "Cost Mgmt", nameDe: "Kostenverwaltung", nameFr: "Gestion des coûts", path: "/cost", icon: DollarSign,
        allowedRoles: ["admin", "director", "bu_gm", "finance_manager", "finance_specialist"] },
      { name: "费用对比", nameEn: "Expense Compare", nameDe: "Kostenvergleich", nameFr: "Comparaison des frais", path: "/expense-comparison", icon: GitCompare, minLevel: 2 },
      { name: "超支审批", nameEn: "Overrun Approval", nameDe: "Überziehungsfreigabe", nameFr: "Approbation dépassement", path: "/budget-overrun-approval", icon: AlertTriangle, minLevel: 3 },
      { name: "费用预测", nameEn: "Expense Forecast", nameDe: "Kostenprognose", nameFr: "Prévision des frais", path: "/expense-forecast", icon: LineChart, minLevel: 3 },
      { name: "报表定时发送", nameEn: "Report Scheduler", nameDe: "Berichtsplaner", nameFr: "Planificateur rapports", path: "/expense-report-scheduler", icon: Send,
        allowedRoles: ["admin", "finance_manager"] },
      { name: "成本标准配置", nameEn: "Cost Standards", nameDe: "Kostenstandards", nameFr: "Standards de coûts", path: "/cost-standards", icon: Calculator, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "finance_manager"] },
      { name: "AI预算分析", nameEn: "AI Budget", nameDe: "KI-Budgetanalyse", nameFr: "IA Analyse budget", path: "/ai-budget-analysis", icon: Wallet, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "finance_manager", "dept_manager"] },
      { name: "AI成本优化", nameEn: "AI Cost Opt", nameDe: "KI-Kostenoptimierung", nameFr: "IA Optimisation coûts", path: "/ai-cost-optimization", icon: Calculator, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "finance_manager"] },
      { name: "AI税费计算", nameEn: "AI VAT Calc", nameDe: "KI-MwSt-Rechner", nameFr: "IA Calcul TVA", path: "/ai-vat-calculator", icon: Receipt, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "finance_manager", "finance_specialist"] },
      { name: "Finance Agent", nameEn: "Finance Agent", nameDe: "Finanz-Agent", nameFr: "Agent financier", path: "/finance-agent", icon: Brain, isNew: true,
        allowedRoles: ["admin", "director", "bu_gm", "finance_manager", "dept_manager"] },
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
    superCategory: "strategy",
    items: [
      { name: "AI助手中心", nameEn: "AI Hub", nameDe: "KI-Zentrum", nameFr: "Centre IA", path: "/ai-hub", icon: Bot, isNew: true },
      { name: "AI对话助手", nameEn: "AI Chat", nameDe: "KI-Chat", nameFr: "Chat IA", path: "/ai-assistant", icon: Bot },
    ],
    subgroups: [
      // ── 业务AI助手 ──
      {
        name: "业务AI助手",
        nameEn: "Business AI Assistants",
        nameDe: "Geschäfts-KI-Assistenten",
        nameFr: "Assistants IA métier",
        icon: Sparkles,
        items: [
          { name: "AI KPI助手", nameEn: "KPI Assistant", nameDe: "KPI-Assistent", nameFr: "Assistant KPI", path: "/ai/kpi-assistant", icon: Gauge },
          { name: "数字助理", nameEn: "Digital Assistants", nameDe: "Digitale Assistenten", nameFr: "Assistants numériques", path: "/digital-assistants", icon: Cpu },
          { name: "AI采购助手", nameEn: "AI Purchase", nameDe: "KI-Einkauf", nameFr: "IA Achats", path: "/ai-purchase", icon: ShoppingCart, isNew: true },
          { name: "AI质量助手", nameEn: "AI Quality", nameDe: "KI-Qualität", nameFr: "IA Qualité", path: "/ai-quality", icon: Shield, isNew: true },
          { name: "AI服务助手", nameEn: "AI Service", nameDe: "KI-Service", nameFr: "IA Service", path: "/ai-service", icon: Headphones, isNew: true },
          { name: "AI预警中心", nameEn: "AI Early Warning", nameDe: "KI-Frühwarnung", nameFr: "IA Alerte précoce", path: "/ai-early-warning", icon: AlertTriangle, isNew: true },
          { name: "AI风险预测", nameEn: "AI Risk Prediction", nameDe: "KI-Risikovorhersage", nameFr: "IA Prédiction risques", path: "/ai-risk-prediction", icon: ShieldAlert, isNew: true },
          { name: "AI内容本地化", nameEn: "AI Localization", nameDe: "KI-Lokalisierung", nameFr: "IA Localisation", path: "/ai-content-localizer", icon: Globe, isNew: true },
        ],
      },
      // ── 知识与诊断 ──
      {
        name: "知识与诊断",
        nameEn: "Knowledge & Diagnostics",
        nameDe: "Wissen & Diagnose",
        nameFr: "Connaissances & diagnostics",
        icon: BookOpen,
        items: [
          { name: "知识库训练", nameEn: "KB Training", nameDe: "Wissensbasis-Training", nameFr: "Entraînement base de connaissances", path: "/rag-training", icon: BookOpen, isNew: true },
          { name: "知识库问答", nameEn: "Knowledge Q&A", nameDe: "Wissensbasis-Q&A", nameFr: "Q&R base de connaissances", path: "/knowledge-qa", icon: MessageSquare, isNew: true },
          { name: "历史案例库", nameEn: "Historical Cases", nameDe: "Historische Fälle", nameFr: "Cas historiques", path: "/historical-cases", icon: BookOpen, isNew: true },
          { name: "变更影响分析", nameEn: "Change Impact", nameDe: "Änderungsauswirkung", nameFr: "Impact du changement", path: "/change-impact", icon: GitBranch, isNew: true },
          { name: "AI诊断", nameEn: "AI Diagnostic", nameDe: "KI-Diagnose", nameFr: "Diagnostic IA", path: "/ai-diagnostic", icon: Stethoscope },
          { name: "AI效能追踪", nameEn: "AI Effectiveness", nameDe: "KI-Effizienz", nameFr: "Efficacité IA", path: "/ai-effectiveness", icon: Activity },
          { name: "AI准确度看板", nameEn: "AI Accuracy", nameDe: "KI-Genauigkeit", nameFr: "Précision IA", path: "/ai-accuracy", icon: Gauge, isNew: true,
            allowedRoles: ["admin", "director"] },
        ],
      },
      // ── 模型与平台 ──
      {
        name: "模型与平台",
        nameEn: "Models & Platform",
        nameDe: "Modelle & Plattform",
        nameFr: "Modèles & plateforme",
        icon: Cpu,
        items: [
          { name: "模型监控", nameEn: "Model Monitor", nameDe: "Modellüberwachung", nameFr: "Surveillance modèle", path: "/model-performance-monitor", icon: Activity, minLevel: 3 },
          { name: "知识图谱", nameEn: "Knowledge Graph", nameDe: "Wissensgraph", nameFr: "Graphe de connaissances", path: "/knowledge-graph-approval", icon: Network, minLevel: 3 },
          { name: "模型训练", nameEn: "Model Training", nameDe: "Modelltraining", nameFr: "Entraînement modèle", path: "/model-training-scheduler", icon: Timer,
            allowedRoles: ["admin"] },
          { name: "Agent管理", nameEn: "Agent Units", nameDe: "Agent-Einheiten", nameFr: "Unités agents", path: "/agent-unit-management", icon: Cpu,
            allowedRoles: ["admin"] },
          { name: "AI知识引擎", nameEn: "AI Genesis", nameDe: "KI-Wissensmotor", nameFr: "Moteur IA Genesis", path: "/ai-genesis", icon: Sparkles, isNew: true, minLevel: 3 },
          { name: "AI助理配置中心", nameEn: "AI Assistant Provisioning", nameDe: "KI-Assistenten-Bereitstellung", nameFr: "Provisionnement assistant IA", path: "/ai-assistant-provisioning", icon: UserCog,
            isNew: true, allowedRoles: ["admin", "hr_manager"], minLevel: 4 },
          { name: "AI军团管理", nameEn: "AI Agent Fleet", nameDe: "KI-Agentenflotte", nameFr: "Flotte d'agents IA", path: "/ai-agent-fleet", icon: Cpu, isNew: true },
        ],
      },
    ],
  },

  // ────────────────────────────────────
  // 知识大脑 — Knowledge Brain
  // ────────────────────────────────────
  {
    name: "知识大脑",
    nameEn: "Knowledge Brain",
    nameDe: "Wissenszentrale",
    nameFr: "Cerveau de connaissances",
    icon: Brain,
    superCategory: "strategy",
    items: [
      { name: "知识库训练", nameEn: "KB Training", nameDe: "Wissensbasis-Training", nameFr: "Formation base de connaissances", path: "/rag-training", icon: BookOpen, isNew: true },
      { name: "知识库问答", nameEn: "Knowledge Q&A", nameDe: "Wissensbasis-Q&A", nameFr: "Q&R base de connaissances", path: "/knowledge-qa", icon: MessageSquare, isNew: true },
      { name: "知识图谱", nameEn: "Knowledge Graph", nameDe: "Wissensgraph", nameFr: "Graphe de connaissances", path: "/knowledge-graph-approval", icon: Network, minLevel: 3 },
      { name: "AI知识引擎", nameEn: "AI Genesis", nameDe: "KI-Wissensmotor", nameFr: "Moteur IA Genesis", path: "/ai-genesis", icon: Sparkles, isNew: true, minLevel: 3 },
      { name: "简道云知识库", nameEn: "JDY Knowledge", nameDe: "JDY-Wissensbasis", nameFr: "Base JDY", path: "/jiandaoyun-knowledge", icon: Database, isNew: true },
      { name: "历史案例库", nameEn: "Historical Cases", nameDe: "Historische Fälle", nameFr: "Cas historiques", path: "/historical-cases", icon: BookOpen, isNew: true },
      { name: "变更影响分析", nameEn: "Change Impact", nameDe: "Änderungsauswirkung", nameFr: "Impact du changement", path: "/change-impact", icon: GitBranch, isNew: true },
    ],
  },

  // ────────────────────────────────────
  // AI DevOps — Dual-Engine Pipeline Console
  // ────────────────────────────────────
  {
    name: "AI DevOps",
    nameEn: "AI DevOps Matrix",
    nameDe: "KI-DevOps-Matrix",
    nameFr: "Matrice IA DevOps",
    icon: Code2,
    superCategory: "strategy",
    items: [
      { name: "双AI协作矩阵", nameEn: "Dual-AI Matrix", nameDe: "Dual-KI-Matrix", nameFr: "Matrice Double IA", path: "/dual-ai-matrix", icon: Zap, isNew: true },
      { name: "并行指挥中心", nameEn: "Concurrent Command", nameDe: "Parallele Kommandozentrale", nameFr: "Centre de commande concurrent", path: "/concurrent-command-center", icon: Monitor, isNew: true },
      { name: "Gemini技术规格", nameEn: "Gemini Spec", nameDe: "Gemini-Spezifikation", nameFr: "Spécification Gemini", path: "/gemini-spec", icon: FileText, isNew: true },
      { name: "仿真指挥中心", nameEn: "Simulator", nameDe: "Simulator", nameFr: "Simulateur", path: "/simulator", icon: Zap, isNew: true },
      { name: "系统部署", nameEn: "Deployment", nameDe: "Bereitstellung", nameFr: "Déploiement", path: "/system-deployment", icon: Server },
      { name: "AI效能追踪", nameEn: "AI Effectiveness", nameDe: "KI-Effizienz", nameFr: "Efficacité IA", path: "/ai-effectiveness", icon: Activity },
      { name: "模型监控", nameEn: "Model Monitor", nameDe: "Modellüberwachung", nameFr: "Surveillance modèle", path: "/model-performance-monitor", icon: Activity, minLevel: 3 },
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
    superCategory: "strategy",
    items: [
      { name: "战略中枢", nameEn: "Strategy Hub", nameDe: "Strategie-Zentrale", nameFr: "Centre stratégie", path: "/strategy", icon: Target, isNew: true },
      { name: "卓越文化", nameEn: "Excellence Culture", nameDe: "Exzellenzkultur", nameFr: "Culture d'excellence", path: "/strategy/excellence", icon: Award, isNew: true },
      { name: "OKR矩阵", nameEn: "OKR Matrix", nameDe: "OKR-Matrix", nameFr: "Matrice OKR", path: "/strategy/okr-matrix", icon: Target, isNew: true },
      { name: "目标分解", nameEn: "Target Breakdown", nameDe: "Zielaufschlüsselung", nameFr: "Décomposition des objectifs", path: "/bu-sales-target", icon: BarChart3, isNew: true, minLevel: 3 },
      { name: "资质管理", nameEn: "Certification", nameDe: "Zertifizierung", nameFr: "Certification", path: "/certification-management", icon: Award },
      { name: "年度企业日程", nameEn: "Annual Agenda", nameDe: "Jahreskalender", nameFr: "Agenda annuel", path: "/annual-agenda", icon: Calendar },
      { name: "全球增长追踪", nameEn: "Global Growth", nameDe: "Globales Wachstum", nameFr: "Croissance mondiale", path: "/global-growth-tracker", icon: Globe },
      { name: "变更治理", nameEn: "Change Governance", nameDe: "Änderungssteuerung", nameFr: "Gouvernance changement", path: "/change-management", icon: ClipboardCheck },
      { name: "2026战略指挥", nameEn: "2026 Strategy Command", nameDe: "2026 Strategiekommando", nameFr: "Commandement stratégique 2026", path: "/ceo/strategy-2026", icon: Crown, isNew: true },
    ],
  },

  // ────────────────────────────────────
  // Smart OA 指挥中心
  // ────────────────────────────────────
  {
    name: "Smart OA",
    nameEn: "Smart OA",
    nameDe: "Smart OA",
    nameFr: "Smart OA",
    icon: ClipboardList,
    superCategory: "resources",
    items: [
      { name: "M0-M12表单目录", nameEn: "Form Directory", nameDe: "Formularverzeichnis", nameFr: "Répertoire formulaires", path: "/form-directory", icon: Layers, isNew: true },
      { name: "动态表单引擎", nameEn: "Dynamic Forms", nameDe: "Dynamische Formulare", nameFr: "Formulaires dynamiques", path: "/oa-forms", icon: FileText, isNew: true },
      { name: "OA指挥中心", nameEn: "OA Command Center", nameDe: "OA-Leitstand", nameFr: "Centre de commande OA", path: "/oa-dashboard", icon: ClipboardCheck, isNew: true },
      { name: "晨会看板", nameEn: "Morning Meeting", nameDe: "Morgenbesprechung", nameFr: "Réunion matinale", path: "/oa-dashboard?tab=meeting", icon: Calendar, isNew: true },
      { name: "出差报告", nameEn: "Trip Reports", nameDe: "Reiseberichte", nameFr: "Rapports de déplacement", path: "/oa-dashboard?tab=trips", icon: Briefcase, isNew: true },
      { name: "售前技术问卷", nameEn: "Pre-Sales Questionnaire", nameDe: "Vorverkauf-Fragebogen", nameFr: "Questionnaire avant-vente", path: "/pre-sales-questionnaire", icon: ClipboardCheck, isNew: true },
      { name: "晨会看板(全屏)", nameEn: "Morning Meeting Board", nameDe: "Morgenbesprechung (Vollbild)", nameFr: "Réunion matinale (plein écran)", path: "/morning-meeting-board", icon: LayoutDashboard, isNew: true },
      { name: "汇报中枢", nameEn: "Briefing Center", nameDe: "Berichtszentrale", nameFr: "Centre de briefing", path: "/report-center", icon: Presentation, isNew: true },
      { name: "大厅全球主屏", nameEn: "Lobby Global Screen", nameDe: "Lobby-Globalbildschirm", nameFr: "Écran global hall", path: "/vision/lobby", icon: Globe, isNew: true },
      { name: "车间生产总屏", nameEn: "Shopfloor Master Board", nameDe: "Werkstatt-Hauptbildschirm", nameFr: "Écran principal atelier", path: "/vision/shopfloor", icon: Factory, isNew: true },
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
    superCategory: "resources",
    items: [
      { name: "系统控制塔", nameEn: "Control Tower", nameDe: "Kontrollturm", nameFr: "Tour de contrôle", path: "/system-control-tower", icon: Landmark, isNew: true },
    ],
    subgroups: [
      // ── 用户与权限 ──
      {
        name: "用户与权限",
        nameEn: "Users & Permissions",
        nameDe: "Benutzer & Rechte",
        nameFr: "Utilisateurs & droits",
        icon: Lock,
        items: [
          { name: "用户与权限", nameEn: "Users & Permissions", nameDe: "Benutzer & Rechte", nameFr: "Utilisateurs & droits", path: "/permissions", icon: Lock },
          { name: "菜单管理", nameEn: "Menu Management", nameDe: "Menüverwaltung", nameFr: "Gestion des menus", path: "/menu-management", icon: Menu },
          { name: "组织架构", nameEn: "Organization", nameDe: "Organisation", nameFr: "Organisation", path: "/organization-management", icon: Building2, isNew: true },
          { name: "临时权限", nameEn: "Temp Permissions", nameDe: "Temporäre Rechte", nameFr: "Droits temporaires", path: "/temporary-permissions", icon: Shield, isNew: true },
          { name: "权限黑名单", nameEn: "Perm Blacklist", nameDe: "Rechte-Sperrliste", nameFr: "Liste noire droits", path: "/permission-blacklist", icon: ShieldAlert, isNew: true },
        ],
      },
      // ── 安全与合规 ──
      {
        name: "安全与合规",
        nameEn: "Security & Compliance",
        nameDe: "Sicherheit & Compliance",
        nameFr: "Sécurité & conformité",
        icon: Shield,
        items: [
          { name: "审计日志", nameEn: "Audit Log", nameDe: "Prüfprotokoll", nameFr: "Journal d'audit", path: "/audit-logs", icon: FileText },
          { name: "系统监控", nameEn: "System Monitor", nameDe: "Systemüberwachung", nameFr: "Surveillance système", path: "/grt-operation", icon: Gauge },
          { name: "安全仪表板", nameEn: "Security", nameDe: "Sicherheit", nameFr: "Sécurité", path: "/security", icon: Shield },
          { name: "AI安全治理", nameEn: "AI Security & Governance", nameDe: "KI-Sicherheit", nameFr: "Sécurité IA", path: "/ai-security-governance", icon: ShieldCheck, isNew: true },
          { name: "合规仪表板", nameEn: "Compliance", nameDe: "Compliance", nameFr: "Conformité", path: "/compliance-dashboard", icon: Shield },
          { name: "合规日历", nameEn: "Compliance Calendar", nameDe: "Compliance-Kalender", nameFr: "Calendrier de conformité", path: "/admin/compliance-calendar", icon: CalendarClock, isNew: true },
          { name: "错误日志", nameEn: "Error Logs", nameDe: "Fehlerprotokolle", nameFr: "Journaux d'erreurs", path: "/error-logs", icon: AlertTriangle, isNew: true },
        ],
      },
      // ── ESG & 碳合规 ──
      {
        name: "ESG & 碳合规",
        nameEn: "ESG & Carbon",
        nameDe: "ESG & CO₂",
        nameFr: "ESG & Carbone",
        icon: Leaf,
        items: [
          { name: "CBAM碳足迹", nameEn: "CBAM Dashboard", nameDe: "CBAM-Dashboard", nameFr: "Tableau CBAM", path: "/esg/cbam-dashboard", icon: Leaf, isNew: true },
        ],
      },
      // ── 集成配置 ──
      {
        name: "集成配置",
        nameEn: "Integration Config",
        nameDe: "Integrationskonfiguration",
        nameFr: "Configuration intégration",
        icon: Cable,
        items: [
          { name: "通知渠道", nameEn: "Notifications", nameDe: "Benachrichtigungen", nameFr: "Notifications", path: "/admin/notification-settings", icon: Bell },
          { name: "钉钉配置", nameEn: "DingTalk", nameDe: "DingTalk", nameFr: "DingTalk", path: "/admin/dingtalk-settings", icon: Bell },
          { name: "Microsoft Graph", nameEn: "MS Graph", nameDe: "MS Graph", nameFr: "MS Graph", path: "/settings/microsoft-graph", icon: Cloud },
          { name: "Webhook管理", nameEn: "Webhooks", nameDe: "Webhooks", nameFr: "Webhooks", path: "/webhook", icon: Webhook },
          { name: "ERP集成配置", nameEn: "ERP Config", nameDe: "ERP-Konfiguration", nameFr: "Configuration ERP", path: "/admin/erp-configuration", icon: Database, isNew: true },
          { name: "ERP连接管理", nameEn: "ERP Connection", nameDe: "ERP-Verbindung", nameFr: "Connexion ERP", path: "/admin/erp-connection", icon: Cable, isNew: true },
          { name: "命名规则", nameEn: "Naming Rules", nameDe: "Namensregeln", nameFr: "Règles de nommage", path: "/naming-rules", icon: Tags },
          { name: "证书模板", nameEn: "Certificates", nameDe: "Zertifikatvorlagen", nameFr: "Modèles certificats", path: "/admin/certificates", icon: Award, isNew: true },
        ],
      },
      // ── 数据与运维 ──
      {
        name: "数据与运维",
        nameEn: "Data & Operations",
        nameDe: "Daten & Betrieb",
        nameFr: "Données & opérations",
        icon: Database,
        items: [
          { name: "简道云分析", nameEn: "Jiandaoyun", nameDe: "Jiandaoyun", nameFr: "Jiandaoyun", path: "/jiandaoyun", icon: Database },
          { name: "简道云导入", nameEn: "JDY Import", nameDe: "JDY-Import", nameFr: "Import JDY", path: "/jiandaoyun-import", icon: Upload, isNew: true, allowedRoles: ["admin", "director"] },
          { name: "表单浏览器", nameEn: "Form Browser", nameDe: "Formularbrowser", nameFr: "Navigateur formulaires", path: "/jiandaoyun-forms", icon: Database, isNew: true },
          { name: "审批流程", nameEn: "Workflows", nameDe: "Workflows", nameFr: "Workflows", path: "/jiandaoyun-workflows", icon: GitBranch, isNew: true },
          { name: "知识库", nameEn: "Knowledge", nameDe: "Wissensbasis", nameFr: "Base de connaissances", path: "/jiandaoyun-knowledge", icon: BookOpen, isNew: true },
          { name: "数据迁移中心", nameEn: "Data Migration Hub", nameDe: "Datenmigration", nameFr: "Centre de migration", path: "/data-migration", icon: Database, isNew: true },
          { name: "运营分析", nameEn: "Operations Analytics", nameDe: "Betriebsanalyse", nameFr: "Analyse opérations", path: "/operations-analytics", icon: Activity, isNew: true },
          { name: "菜单分析", nameEn: "Menu Analytics", nameDe: "Menüanalyse", nameFr: "Analyse menus", path: "/menu-analytics", icon: BarChart3, isNew: true },
        ],
      },
      // ── 任务与调度 ──
      {
        name: "任务与调度",
        nameEn: "Tasks & Scheduling",
        nameDe: "Aufgaben & Planung",
        nameFr: "Tâches & ordonnancement",
        icon: Timer,
        items: [
          { name: "定时任务", nameEn: "Scheduler", nameDe: "Zeitplaner", nameFr: "Planificateur", path: "/scheduler", icon: Timer },
          { name: "Cron监控", nameEn: "Cron Monitor", nameDe: "Cron-Überwachung", nameFr: "Surveillance Cron", path: "/cron-monitor", icon: Clock },
          { name: "死锁监控", nameEn: "Deadlock Monitor", nameDe: "Deadlock-Überwachung", nameFr: "Surveillance deadlock", path: "/deadlock-monitor", icon: ShieldAlert },
          { name: "系统部署", nameEn: "Deployment", nameDe: "Bereitstellung", nameFr: "Déploiement", path: "/system-deployment", icon: Server },
          { name: "系统指南", nameEn: "System Guide", nameDe: "Systemanleitung", nameFr: "Guide système", path: "/system-guide", icon: BookOpen },
          { name: "仿真指挥中心", nameEn: "Simulator", nameDe: "Simulator", nameFr: "Simulateur", path: "/simulator", icon: Zap, isNew: true },
          { name: "双AI协作矩阵", nameEn: "Dual-AI Matrix", nameDe: "Dual-KI-Matrix", nameFr: "Matrice Double IA", path: "/dual-ai-matrix", icon: Zap, isNew: true },
          { name: "会议负责人", nameEn: "Meeting Owner", nameDe: "Besprechungsleiter", nameFr: "Responsable réunion", path: "/meeting-owner-management", icon: Video, isNew: true },
        ],
      },
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
    superCategory: "resources",
    items: [
      { name: "协同云盘", nameEn: "Collaboration Drive", nameDe: "Zusammenarbeitslaufwerk", nameFr: "Drive collaboratif", path: "/collaboration-docs", icon: FolderKanban, isNew: true },
      { name: "社群管理", nameEn: "Community", nameDe: "Community", nameFr: "Communauté", path: "/community", icon: MessageSquare },
      { name: "协作空间", nameEn: "Collaboration", nameDe: "Zusammenarbeit", nameFr: "Collaboration", path: "/collaboration", icon: Users },
      { name: "智能会议中枢", nameEn: "Meeting Hub", nameDe: "Meeting-Hub", nameFr: "Hub de réunion", path: "/meeting-hub", icon: Presentation, isNew: true },
      { name: "述职报告", nameEn: "Review Meeting", nameDe: "Leistungsbericht", nameFr: "Rapport de performance", path: "/performance-review", icon: Presentation, isNew: true },
      { name: "跨境数据同步", nameEn: "Cross-Border Sync", nameDe: "Grenzüberschreitende Synchronisierung", nameFr: "Sync transfrontalière", path: "/cross-border-sync", icon: Globe, isNew: true },
      { name: "群通知", nameEn: "Group Alerts", nameDe: "Gruppenbenachrichtigungen", nameFr: "Alertes de groupe", path: "/group-notifications", icon: Send },
      { name: "文档管理", nameEn: "Documents", nameDe: "Dokumente", nameFr: "Documents", path: "/docs", icon: FileText },
      { name: "帮助中心", nameEn: "Help Center", nameDe: "Hilfecenter", nameFr: "Centre d'aide", path: "/help", icon: BookOpen },
    ],
  },

  // ────────────────────────────────────
  // 平台能力扩展
  // ────────────────────────────────────
  {
    name: "平台能力",
    nameEn: "Platform Capabilities",
    nameDe: "Plattformfähigkeiten",
    nameFr: "Capacités plateforme",
    icon: Cpu,
    superCategory: "resources",
    items: [
      { name: "成就系统", nameEn: "Achievements", nameDe: "Erfolge", nameFr: "Réalisations", path: "/gamification", icon: Trophy, isNew: true },
      { name: "IoT数字孪生", nameEn: "IoT Digital Twin", nameDe: "IoT Digitaler Zwilling", nameFr: "IoT Jumeau numérique", path: "/iot-dashboard", icon: Cpu, isNew: true },
      { name: "IoT设备舰队", nameEn: "IoT Fleet Command", nameDe: "IoT-Flottensteuerung", nameFr: "Commande flotte IoT", path: "/iot-fleet", icon: Activity, isNew: true },
      { name: "数字云厅", nameEn: "Digital Cloud Hall", nameDe: "Digitale Cloud-Halle", nameFr: "Hall Cloud Numérique", path: "/digital-cloud-hall", icon: Video, isNew: true, allowedRoles: ["admin", "director", "bu_gm", "bu_sales", "bu_pm", "cs_engineer", "dept_manager"], minLevel: 2 },
      { name: "全球客服系统", nameEn: "Global Service Dashboard", nameDe: "Globales Service-Dashboard", nameFr: "Tableau de bord service global", path: "/digital-cloud-hall?module=service", icon: Globe, isNew: true, allowedRoles: ["admin", "director", "bu_gm", "bu_sales", "bu_pm", "cs_engineer", "dept_manager"], minLevel: 2 },
      { name: "客服系统管理", nameEn: "Service Admin", nameDe: "Service-Verwaltung", nameFr: "Admin service", path: "/service-dashboard-admin", icon: Settings, allowedRoles: ["admin", "director"], minLevel: 5 },
    ],
  },
];

export default menuConfig;
