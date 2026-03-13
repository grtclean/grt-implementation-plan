/**
 * Seed script for help_articles — contextual help content
 * Run: npx tsx server/seed-help-articles.ts
 */
import pg from "pg";
import { createChildLogger } from "./lib/logger";
const log = createChildLogger("seed-help");
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgresql://postgres:Gerry123456@localhost:5432/grt_system",
});

interface HelpArticleSeed {
  route_path: string;
  feature_key: string;
  title: string;
  title_zh: string;
  content: string;
  content_zh: string;
  category: string;
  tags: string[];
  related_routes: string[];
  sort_order: number;
}

const articles: HelpArticleSeed[] = [
  // Dashboard
  {
    route_path: "/",
    feature_key: "dashboard.overview",
    title: "Dashboard Overview",
    title_zh: "仪表板概览",
    content: "The dashboard shows key metrics across all business units. Use the BU selector to filter data by business unit. KPI cards display real-time performance indicators.",
    content_zh: "仪表板展示所有事业部的关键指标。使用BU选择器按事业部筛选数据。KPI卡片显示实时绩效指标。",
    category: "GETTING_STARTED",
    tags: ["dashboard", "overview", "KPI"],
    related_routes: ["/role-dashboard", "/analytics"],
    sort_order: 1,
  },
  // Quick Start
  {
    route_path: "/",
    feature_key: "general.quickstart",
    title: "Quick Start Guide",
    title_zh: "快速入门指南",
    content: "Welcome to GRT Enterprise OS! Start by: 1) Setting your BU context in the profile switcher (top-right), 2) Exploring the sidebar menu organized by department, 3) Using Ctrl+K for global search, 4) Checking your role dashboard for personalized tasks.",
    content_zh: "欢迎使用GRT企业操作系统！首先：1) 在个人设置(右上角)中设置BU上下文，2) 浏览按部门组织的侧边栏菜单，3) 使用Ctrl+K全局搜索，4) 查看角色仪表板获取个性化任务。",
    category: "GETTING_STARTED",
    tags: ["quickstart", "onboarding", "BU"],
    related_routes: ["/role-dashboard", "/projects", "/oa-dashboard", "/ai-hub"],
    sort_order: 0,
  },
  // Projects
  {
    route_path: "/projects",
    feature_key: "project.management",
    title: "Project Management Guide",
    title_zh: "项目管理指南",
    content: "Create and manage projects through the M0-M12 lifecycle. Each project follows stage-gate methodology with approval checkpoints. Use the Kanban view for visual tracking.",
    content_zh: "通过M0-M12生命周期创建和管理项目。每个项目遵循阶段门方法论,带有审批检查点。使用看板视图进行可视化跟踪。",
    category: "FEATURE_GUIDE",
    tags: ["project", "lifecycle", "M0-M12", "gate"],
    related_routes: ["/project-gates", "/project-vault"],
    sort_order: 1,
  },
  {
    route_path: "/projects",
    feature_key: "project.gates",
    title: "How to pass stage gates?",
    title_zh: "如何通过阶段门审批？",
    content: "Each gate requires: 1) All checklist items completed, 2) Required documents uploaded, 3) Gate review meeting held, 4) Approver sign-off. Navigate to Project Gates to see detailed requirements per stage.",
    content_zh: "每个阶段门要求：1) 所有检查项完成，2) 必需文档已上传，3) 门审会议已召开，4) 审批人签字。导航至项目门查看各阶段详细要求。",
    category: "FAQ",
    tags: ["gate", "approval", "checklist"],
    related_routes: ["/project-gates"],
    sort_order: 2,
  },
  // OA
  {
    route_path: "/oa-dashboard",
    feature_key: "oa.workflows",
    title: "OA Workflow System",
    title_zh: "OA工作流系统",
    content: "Submit leave requests, vehicle requests, stationery orders, and gift approvals through the unified OA dashboard. All workflows support multi-level approval chains.",
    content_zh: "通过统一OA仪表板提交请假、用车、文具和礼品审批申请。所有工作流支持多级审批链。",
    category: "FEATURE_GUIDE",
    tags: ["OA", "leave", "approval", "workflow"],
    related_routes: ["/pre-sales-questionnaire"],
    sort_order: 1,
  },
  // HR
  {
    route_path: "/hrm-intelligent",
    feature_key: "hrm.overview",
    title: "HR Management Overview",
    title_zh: "HR管理概览",
    content: "Manage the complete employee lifecycle: recruitment, onboarding, training, performance reviews, and offboarding. Integrates with the competency matrix for skills tracking.",
    content_zh: "管理完整员工生命周期：招聘、入职、培训、绩效评估和离职。与能力矩阵集成进行技能跟踪。",
    category: "GETTING_STARTED",
    tags: ["HR", "employee", "lifecycle"],
    related_routes: ["/recruitment", "/training-management", "/capability-matrix-board"],
    sort_order: 1,
  },
  // Capability Matrix
  {
    route_path: "/capability-matrix-board",
    feature_key: "capability.tsdckl",
    title: "TSDCKL Capability Model",
    title_zh: "TSDCKL六大能力模型",
    content: "The GRT capability assessment uses 6 domains: T(Technical), S(Soft Skills), D(Design), C(Communication), K(Knowledge), L(Leadership). Each employee is rated L1-L5 per domain based on job-role-specific rubrics.",
    content_zh: "GRT能力评估使用6个维度：T(技术力)、S(软通力)、D(设计力)、C(协作力)、K(标准力)、L(领导力)。每位员工按岗位评分标准获得L1-L5等级。",
    category: "FEATURE_GUIDE",
    tags: ["TSDCKL", "capability", "assessment", "L1-L5"],
    related_routes: ["/capability-dashboard", "/capability-management"],
    sort_order: 1,
  },
  // AI Genesis
  {
    route_path: "/ai-genesis",
    feature_key: "genesis.upload",
    title: "AI Knowledge Genesis Workspace",
    title_zh: "AI知识引擎工作台",
    content: "Upload company documents (policies, SOPs, specifications) for AI analysis. The system extracts key entities, detects topics, and generates configuration proposals. Review and approve proposals before committing changes.",
    content_zh: "上传公司文档（政策、SOP、规范说明）进行AI分析。系统提取关键实体、检测主题并生成配置提案。审核并批准提案后提交变更。",
    category: "FEATURE_GUIDE",
    tags: ["AI", "genesis", "document", "proposal"],
    related_routes: ["/ai-hub", "/ai-assistant"],
    sort_order: 1,
  },
  {
    route_path: "/ai-genesis",
    feature_key: "genesis.lifecycle",
    title: "How does the proposal lifecycle work?",
    title_zh: "提案生命周期如何运作？",
    content: "Proposals follow: DRAFT → PENDING_REVIEW → APPROVED → COMMITTED. Each transition requires explicit action. Approved proposals can be committed to the System Control Tower, writing changes to governance tables.",
    content_zh: "提案流程：草稿 → 待审核 → 已批准 → 已提交。每次状态转换需要明确操作。已批准的提案可以提交到系统控制塔，将变更写入治理表。",
    category: "FAQ",
    tags: ["proposal", "lifecycle", "status"],
    related_routes: ["/ai-genesis"],
    sort_order: 2,
  },
  // Warehouse
  {
    route_path: "/warehouse",
    feature_key: "warehouse.overview",
    title: "Warehouse Management",
    title_zh: "仓库管理",
    content: "Manage warehouses, locations, receipts, issues, and stock counts. Supports barcode scanning, lot tracking, and serial number management. Integrates with BOM for material verification.",
    content_zh: "管理仓库、库位、入库、出库和盘点。支持条码扫描、批次追踪和序列号管理。与BOM集成进行物料验证。",
    category: "FEATURE_GUIDE",
    tags: ["warehouse", "inventory", "barcode"],
    related_routes: ["/bom-management", "/material-management"],
    sort_order: 1,
  },
  // Quality / FMEA
  {
    route_path: "/fmea-management",
    feature_key: "quality.fmea",
    title: "FMEA Best Practices",
    title_zh: "FMEA最佳实践",
    content: "Follow AIAG VDA FMEA methodology: 1) Structure analysis, 2) Function analysis, 3) Failure analysis, 4) Risk analysis (AP priority), 5) Optimization. Always link FMEA items to control plans.",
    content_zh: "遵循AIAG VDA FMEA方法论：1) 结构分析，2) 功能分析，3) 失效分析，4) 风险分析(AP优先级)，5) 优化。始终将FMEA项目关联到控制计划。",
    category: "BEST_PRACTICE",
    tags: ["FMEA", "quality", "VDA", "AIAG"],
    related_routes: ["/control-plan", "/ppap-management"],
    sort_order: 1,
  },
  // Production
  {
    route_path: "/production-dashboard",
    feature_key: "production.overview",
    title: "Production Dashboard Guide",
    title_zh: "生产仪表板指南",
    content: "Monitor real-time production status across all work orders. Track T1-T15 process steps, equipment utilization, and operator performance. Use filters to focus on specific BU or product line.",
    content_zh: "实时监控所有工单的生产状态。跟踪T1-T15工艺步骤、设备利用率和操作员绩效。使用筛选器聚焦特定事业部或产品线。",
    category: "FEATURE_GUIDE",
    tags: ["production", "T1-T15", "work order"],
    related_routes: ["/process-management", "/kiosk-station"],
    sort_order: 1,
  },
  // CRM
  {
    route_path: "/crm-customers",
    feature_key: "crm.customers",
    title: "CRM Customer Management",
    title_zh: "CRM客户管理",
    content: "Track customers through the full sales pipeline. Manage contacts, opportunities, and follow-up tasks. AI scoring helps prioritize leads based on engagement signals.",
    content_zh: "通过完整销售管道跟踪客户。管理联系人、商机和跟进任务。AI评分基于互动信号帮助优先排序线索。",
    category: "FEATURE_GUIDE",
    tags: ["CRM", "customer", "sales", "pipeline"],
    related_routes: ["/crm-contacts", "/leads"],
    sort_order: 1,
  },
  // ═══════════════ CHANGELOG entries ═══════════════
  {
    route_path: "/",
    feature_key: "changelog.v1.0",
    title: "v1.0 — Initial M0-M12 Modules",
    title_zh: "v1.0 — 初始M0-M12模块",
    content: "**v1.0** (2026-02-11)\n\n- 18-role RBAC system with BU context\n- M0-M12 project lifecycle management\n- 28 new page components (R&D, Manufacturing, HR, Sales, Customer Service)\n- Menu favorites, global search (Ctrl+K), AI assistant menu integration\n- Temporary permissions and permission blacklist",
    content_zh: "**v1.0** (2026-02-11)\n\n- 18角色RBAC系统与BU上下文\n- M0-M12项目生命周期管理\n- 28个新页面组件（研发、制造、HR、销售、客服）\n- 菜单收藏、全局搜索(Ctrl+K)、AI助手菜单集成\n- 临时权限和权限黑名单",
    category: "CHANGELOG",
    tags: ["changelog", "v1.0", "release"],
    related_routes: ["/projects", "/ai-hub"],
    sort_order: 100,
  },
  {
    route_path: "/",
    feature_key: "changelog.v1.1",
    title: "v1.1 — Environment Isolation & Zero-Trust Architecture",
    title_zh: "v1.1 — 环境隔离与零信任架构",
    content: "**v1.1** (2026-02-20)\n\n- 3-tier environment isolation (dev/staging/prod)\n- Zero-Trust architecture with API key rotation\n- 86 standalone router files (all placeholders eliminated)\n- Supply chain traceability system with 11 DB tables\n- OA Dynamic Form Engine with 17 procedures",
    content_zh: "**v1.1** (2026-02-20)\n\n- 三级环境隔离（开发/预发/生产）\n- 零信任架构与API密钥轮换\n- 86个独立路由文件（所有占位符已消除）\n- 供应链追溯系统，11个数据库表\n- OA动态表单引擎，17个存储过程",
    category: "CHANGELOG",
    tags: ["changelog", "v1.1", "security", "supply-chain"],
    related_routes: ["/supply-chain", "/oa-dashboard"],
    sort_order: 101,
  },
  {
    route_path: "/",
    feature_key: "changelog.v1.2",
    title: "v1.2 — Quality Phase 2: MSA, FMEA→CP, 8D→CAPA",
    title_zh: "v1.2 — 质量阶段2：MSA、FMEA→CP、8D→CAPA",
    content: "**v1.2** (2026-02-22)\n\n- MSA frontend (Gage R&R, bias, linearity, stability studies)\n- FMEA→Control Plan auto-generation\n- 8D→CAPA triggers with automated escalation\n- Quality Workbench with 4-tab 8D/CAPA management\n- Sales CRM Workbench with 5-tab lead management\n- After-Sales Workbench for warranty and complaints",
    content_zh: "**v1.2** (2026-02-22)\n\n- MSA前端（Gage R&R、偏倚、线性、稳定性研究）\n- FMEA→控制计划自动生成\n- 8D→CAPA触发器与自动升级\n- 质量工作台，4标签页8D/CAPA管理\n- 销售CRM工作台，5标签页线索管理\n- 售后工作台，保修与投诉管理",
    category: "CHANGELOG",
    tags: ["changelog", "v1.2", "quality", "MSA", "FMEA"],
    related_routes: ["/fmea-management", "/control-plan", "/quality-workbench"],
    sort_order: 102,
  },
  {
    route_path: "/",
    feature_key: "changelog.v2.0",
    title: "v2.0 — GRT Copilot: AI Help System",
    title_zh: "v2.0 — GRT Copilot：AI帮助系统",
    content: "**v2.0** (2026-02-23)\n\n- CopilotBar: Office-style \"Tell me what you want to do\" AI assistant\n- 3-tier search: instant menu match → help articles → LLM-powered Q&A\n- Employee AI Assistant with conversation memory and page-aware suggestions\n- Self-learning feedback loop (positive Q&A → few-shot examples)\n- Guided walkthroughs for new users\n- Version changelog viewer",
    content_zh: "**v2.0** (2026-02-23)\n\n- CopilotBar：Office风格\"告诉我你想做什么\"AI助手\n- 三级搜索：即时菜单匹配 → 帮助文章 → LLM问答\n- 员工AI助手支持对话记忆和页面感知建议\n- 自学习反馈循环（正向问答 → 少样本示例）\n- 新用户引导式操作指南\n- 版本更新日志查看器",
    category: "CHANGELOG",
    tags: ["changelog", "v2.0", "copilot", "AI", "help"],
    related_routes: ["/ai-hub", "/ai-assistant"],
    sort_order: 103,
  },
  // Troubleshooting
  {
    route_path: "/",
    feature_key: "general.troubleshooting",
    title: "Common Troubleshooting Steps",
    title_zh: "常见故障排除步骤",
    content: "If data is not loading: 1) Check your network connection, 2) Try refreshing the page, 3) Clear browser cache, 4) Check if your BU context is set correctly in the profile switcher. If issues persist, contact IT support.",
    content_zh: "如果数据未加载：1) 检查网络连接，2) 尝试刷新页面，3) 清除浏览器缓存，4) 检查个人设置中BU上下文是否正确。如问题持续，请联系IT支持。",
    category: "TROUBLESHOOTING",
    tags: ["troubleshooting", "error", "network"],
    related_routes: ["/projects", "/production-dashboard", "/crm-customers"],
    sort_order: 1,
  },
  // Morning Meeting
  {
    route_path: "/morning-meeting",
    feature_key: "meeting.morning",
    title: "Morning Meeting Board",
    title_zh: "晨会看板",
    content: "The morning meeting board displays yesterday's key metrics, today's priorities, and pending escalations. Department leads update their sections before 9:00 AM. Use the timeline view for historical comparison.",
    content_zh: "晨会看板显示昨日关键指标、今日优先事项和待处理升级。部门负责人在上午9:00前更新各自板块。使用时间线视图进行历史对比。",
    category: "FEATURE_GUIDE",
    tags: ["meeting", "morning", "board"],
    related_routes: ["/oa-dashboard"],
    sort_order: 1,
  },
  // Governance
  {
    route_path: "/ai-genesis",
    feature_key: "governance.dictionaries",
    title: "System Governance & Dictionaries",
    title_zh: "系统治理与数据字典",
    content: "The System Control Tower manages master data dictionaries, workflow definitions, data access policies, and audit logs. Use the AI Genesis workspace to propose changes that are automatically routed for approval.",
    content_zh: "系统控制塔管理主数据字典、工作流定义、数据访问策略和审计日志。使用AI知识引擎工作台提出变更提案，自动路由审批。",
    category: "BEST_PRACTICE",
    tags: ["governance", "dictionary", "MDM", "audit"],
    related_routes: ["/ai-genesis"],
    sort_order: 3,
  },
  // Digital Twin
  {
    route_path: "/digital-twin-hub",
    feature_key: "dt.overview",
    title: "Digital Twin Hub",
    title_zh: "数字孪生中心",
    content: "Manage 3D asset models for IATF 16949 compliance. Upload CAD files, define assembly structures, and track robot node configurations. Supports SolidWorks, STEP, and IGES formats.",
    content_zh: "管理符合IATF 16949的3D资产模型。上传CAD文件、定义装配结构、跟踪机器人节点配置。支持SolidWorks、STEP和IGES格式。",
    category: "FEATURE_GUIDE",
    tags: ["digital twin", "3D", "CAD", "IATF"],
    related_routes: ["/plm-documents", "/mechanical-design"],
    sort_order: 1,
  },
  // Testing
  {
    route_path: "/test-execution",
    feature_key: "test.engine",
    title: "Test Execution Dashboard",
    title_zh: "测试执行仪表板",
    content: "Create and execute test plans for Software UAT, PLC testing, FAT, and SAT. Define test templates with pass/fail criteria, then run test sessions tracking results per test case.",
    content_zh: "创建和执行软件UAT、PLC测试、FAT和SAT测试计划。定义包含通过/失败标准的测试模板，然后运行测试会话跟踪每个测试用例结果。",
    category: "FEATURE_GUIDE",
    tags: ["testing", "UAT", "FAT", "SAT"],
    related_routes: ["/sat-testing", "/final-acceptance"],
    sort_order: 1,
  },
  // Cost
  {
    route_path: "/cost-management",
    feature_key: "cost.overview",
    title: "Cost Management & Alerts",
    title_zh: "成本管理与预警",
    content: "Track project costs, set budget thresholds, and receive AI-powered alerts when spending patterns deviate from forecasts. Compare actual vs. budgeted expenses across projects and departments.",
    content_zh: "跟踪项目成本、设置预算阈值，当支出模式偏离预测时接收AI驱动的预警。跨项目和部门比较实际与预算支出。",
    category: "FEATURE_GUIDE",
    tags: ["cost", "budget", "alert", "forecast"],
    related_routes: ["/expense-comparison", "/expense-reports"],
    sort_order: 1,
  },

  // ═══════ Workspace Data Architecture & Role-Based Access ═══════
  {
    route_path: "/workspace",
    feature_key: "workspace.architecture",
    title: "Workspace Data Architecture — File Storage & Access Guide",
    title_zh: "万能工作台 — 数据架构与文件存取指南",
    content: `# Workspace Data Architecture

## Storage Model
GRT Workspace uses **dual storage**: files are stored in GRT's internal Object Store AND optionally synced to SharePoint/OneDrive via Microsoft Graph API.

- **Structured data** (spreadsheets, metadata) → parsed_content JSONB column
- **Binary files** (CAD, images, PDFs) → Object Store with file_path reference
- **Text-based files** (.md, .py, .tp, .src, .mod) → auto-decoded to parsed_content + Object Store

## Supported File Types
| Category | Extensions | Viewer | Edit |
|----------|-----------|--------|------|
| SolidWorks | .sldprt, .sldasm, .slddrw | CAD 3D viewer | Download |
| EPLAN | .elc, .zw1, .epl | CAD viewer | Download |
| Robot (FANUC) | .tp, .ls | Monaco editor | Online |
| Robot (KUKA) | .src, .dat, .krl | Monaco editor | Online |
| Robot (ABB) | .mod, .prg | Monaco editor | Online |
| G-code | .nc, .gcode, .tap | Monaco editor | Online |
| Office | .xlsx, .docx, .pptx | Inline editors | Online |
| Documents | .pdf, .md | Preview/render | Online (md) |
| Images | .png, .jpg, .svg | Image viewer | View only |

## SharePoint Sync
Folders can be mapped to SharePoint paths with 3 sync modes: Bidirectional, GRT→SP push, SP→GRT pull. Engineering folders auto-sync by default.`,
    content_zh: `# 万能工作台数据架构

## 存储模式
GRT工作台采用**双存储**模式：文件同时存储在GRT内部对象存储中，并可通过Microsoft Graph API自动同步到SharePoint/OneDrive。

- **结构化数据**（表格、元数据）→ parsed_content JSONB列
- **二进制文件**（CAD、图片、PDF）→ 对象存储，通过file_path引用
- **文本类文件**（.md, .py, .tp, .src, .mod）→ 自动解码存入parsed_content + 对象存储

## 支持的文件类型
| 类别 | 扩展名 | 查看方式 | 编辑方式 |
|------|--------|---------|---------|
| SolidWorks | .sldprt, .sldasm, .slddrw | CAD 3D查看器 | 下载编辑 |
| EPLAN | .elc, .zw1, .epl | CAD查看器 | 下载编辑 |
| 机器人(FANUC) | .tp, .ls | Monaco编辑器 | 在线编辑 |
| 机器人(KUKA) | .src, .dat, .krl | Monaco编辑器 | 在线编辑 |
| 机器人(ABB) | .mod, .prg | Monaco编辑器 | 在线编辑 |
| G-code | .nc, .gcode, .tap | Monaco编辑器 | 在线编辑 |
| Office | .xlsx, .docx, .pptx | 内联编辑器 | 在线编辑 |
| 文档 | .pdf, .md | 预览/渲染 | 在线编辑(md) |
| 图片 | .png, .jpg, .svg | 图片查看器 | 仅查看 |

## SharePoint同步
文件夹可映射到SharePoint路径，支持3种同步模式：双向同步、GRT→SP推送、SP→GRT拉取。工程类文件夹默认开启自动同步。`,
    category: "FEATURE_GUIDE",
    tags: ["workspace", "file", "storage", "architecture", "CAD", "SolidWorks", "EPLAN", "robot"],
    related_routes: ["/workspace"],
    sort_order: 0,
  },
  {
    route_path: "/workspace",
    feature_key: "workspace.role_access",
    title: "Role-Based File Access Guide",
    title_zh: "各角色文件存取指南",
    content: `# Who Can Access What — Role-Based File Access

## BU Mechanical Engineer (bu_mech)
- **Primary folders**: 机械设计/ (3D Models, Engineering Drawings, Standard Parts)
- **Actions**: Upload .sldprt/.sldasm/.slddrw/.step files, view/edit BOM spreadsheets
- **SharePoint sync**: /Engineering/Mechanical (auto-sync enabled)

## BU Electrical Engineer (bu_elec)
- **Primary folders**: 电气设计/ (Schematics, Layouts, Component Lists)
- **Actions**: Upload .elc/.zw1 EPLAN files, manage component BOM (.xlsx)
- **SharePoint sync**: /Engineering/Electrical (auto-sync enabled)

## BU Project Manager (bu_pm)
- **Primary folders**: 项目文件/ (Active Projects, Completed Projects)
- **Also access**: 客户资料/, 质量管理/, 会议纪要/
- **Actions**: Create project sub-folders, upload specs/contracts/reports, manage review docs

## BU Sales Engineer (bu_sales)
- **Primary folders**: 客户资料/ (Mercedes-Benz, Stellantis, GM, Others)
- **Also access**: 数字展厅/, 项目文件/
- **Actions**: Upload customer specs, quotation spreadsheets, RFQ documents

## Quality Engineer (quality_eng)
- **Primary folders**: 质量管理/ (IATF 16949, Inspection Reports, PPAP)
- **Actions**: Upload audit checklists, inspection reports, PPAP packages, 8D reports

## Procurement Engineer (procurement_eng)
- **Primary folders**: (shared access) 质量管理/检验报告/, 项目文件/
- **Actions**: View supplier evaluation matrices, upload procurement specs

## Customer Service Engineer (cs_engineer)
- **Primary folders**: 客户资料/, 质量管理/检验报告/
- **Actions**: View customer specs, upload field service reports

## Director / BU GM (director, bu_gm)
- **Full access**: All folders (read/write)
- **Primary focus**: 运营管理/, 项目文件/, 会议纪要/

## Employee (employee)
- **Access**: 运营管理/规章制度/, 运营管理/培训资料/, 会议纪要/, 模板库/
- **Actions**: View company policies, download templates

## Admin (admin)
- **Full access**: All folders, all operations
- **Special**: SharePoint folder mapping configuration, sync management`,
    content_zh: `# 各角色文件存取权限指南

## BU机械工程师 (bu_mech)
- **主要文件夹**: 机械设计/（3D模型、工程图纸、标准件库）
- **可执行操作**: 上传 .sldprt/.sldasm/.slddrw/.step 文件，查看/编辑BOM表格
- **SharePoint同步**: /Engineering/Mechanical（自动同步已开启）

## BU电气工程师 (bu_elec)
- **主要文件夹**: 电气设计/（原理图、布局图、元器件清单）
- **可执行操作**: 上传 .elc/.zw1 EPLAN文件，管理元器件BOM表（.xlsx）
- **SharePoint同步**: /Engineering/Electrical（自动同步已开启）

## BU项目经理 (bu_pm)
- **主要文件夹**: 项目文件/（在建项目、已完成项目）
- **同时可访问**: 客户资料/、质量管理/、会议纪要/
- **可执行操作**: 创建项目子文件夹，上传规范书/合同/报告，管理评审文档

## BU销售工程师 (bu_sales)
- **主要文件夹**: 客户资料/（Mercedes-Benz、Stellantis、GM、其他客户）
- **同时可访问**: 数字展厅/、项目文件/
- **可执行操作**: 上传客户技术规范、报价单、RFQ文档

## 质量工程师 (quality_eng)
- **主要文件夹**: 质量管理/（IATF 16949、检验报告、PPAP文件）
- **可执行操作**: 上传审核检查表、检验报告、PPAP文件包、8D报告

## 采购工程师 (procurement_eng)
- **主要文件夹**: （共享访问）质量管理/检验报告/、项目文件/
- **可执行操作**: 查看供应商评估矩阵，上传采购规范

## 客服工程师 (cs_engineer)
- **主要文件夹**: 客户资料/、质量管理/检验报告/
- **可执行操作**: 查看客户技术规范，上传现场服务报告

## 总监 / BU总经理 (director, bu_gm)
- **全部访问**: 所有文件夹（读/写）
- **主要关注**: 运营管理/、项目文件/、会议纪要/

## 普通员工 (employee)
- **可访问**: 运营管理/规章制度/、运营管理/培训资料/、会议纪要/、模板库/
- **可执行操作**: 查看公司制度文件，下载模板

## 系统管理员 (admin)
- **全部访问**: 所有文件夹，所有操作
- **专属功能**: SharePoint文件夹映射配置、同步管理`,
    category: "FEATURE_GUIDE",
    tags: ["workspace", "role", "permission", "access", "RBAC"],
    related_routes: ["/workspace"],
    sort_order: 1,
  },
];

async function main() {
  const client = await pool.connect();
  try {
    let count = 0;
    for (const a of articles) {
      await client.query(
        `INSERT INTO help_articles (route_path, feature_key, title, title_zh, content, content_zh, category, tags, related_routes, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
         ON CONFLICT DO NOTHING`,
        [
          a.route_path,
          a.feature_key,
          a.title,
          a.title_zh,
          a.content,
          a.content_zh,
          a.category,
          JSON.stringify(a.tags),
          JSON.stringify(a.related_routes),
          a.sort_order,
        ]
      );
      count++;
    }
    log.info({ count }, "Seeded help articles");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => log.error({ err }, "Seed help articles failed"));
