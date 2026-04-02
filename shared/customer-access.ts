/**
 * 客户访问控制常量
 *
 * 定义客户用户可见的应用模块白名单。
 * 前端菜单过滤 + 后端路由守卫共同引用此文件。
 */

/** 用户类别常量 */
export const USER_TYPE = {
  EMPLOYEE: "employee",
  CUSTOMER: "customer",
  SUPPLIER: "supplier",
  GUEST: "guest",
} as const;

/** 客户可见的 WAFFLE_APP id 白名单 (对应 menuConfig.ts 中的 WaffleApp.id) */
export const CUSTOMER_ALLOWED_APP_IDS = new Set([
  "workspace",       // 工作台
  "strategy",        // 战略规划
  "ai",              // AI助手
  "knowledge",       // 知识大脑
  "rnd",             // 研发设计
  "project",         // 项目管理
  "manufacturing",   // 生产制造
  "service",         // 客户服务
  "oa",              // Smart OA
]);

/** 客户可见的菜单组名称白名单 (对应 menuConfig.ts 中的 MenuGroup.name) */
export const CUSTOMER_ALLOWED_MENU_GROUPS = new Set([
  "工作台",
  "战略规划",
  "AI助手",
  "AI DevOps",       // 知识大脑归属此组
  "研发设计",
  "项目管理",
  "生产制造",
  "客户服务",
  "Smart OA",
  "协作与文档",      // Smart OA 子组
]);

/** 客户禁止访问的 tRPC router 前缀 (后端接口拦截) */
export const CUSTOMER_BLOCKED_ROUTERS = new Set([
  "payroll",
  "hrm",
  "employee",
  "competency",
  "accessControl",
  "budgetOverrunApproval",
  "expenseComparison",
  "expenseForecast",
  "financeAdvanced",
  "financeWorkflow",
  "glAccounting",
  "ceoMotivation",
  "ceoDashboard",
  "strategyGoals",
]);

/** 客户可访问的公开路由前缀 (Quick Launch，不含 GRTS3.0) */
export const CUSTOMER_ALLOWED_PUBLIC_PATHS = [
  "/showcase/company-intro",
  "/showcase/die-casting",
  "/showcase/new-energy",
  "/showcase/fuel-injection",
  "/showcase/ice",
  "/showroom",
  "/conference/",
  "/client-portal/",
  "/customer/auth",
  "/customer/forum",
  // 注意: /grts3-demo 不在此列表 — 客户不可见
];

/** 判断是否为客户用户 */
export function isCustomerUser(user: { userType?: string; effectiveRole?: string } | null | undefined): boolean {
  if (!user) return false;
  return user.userType === USER_TYPE.CUSTOMER || user.effectiveRole === "customer";
}

/**
 * 客户数据可移植性说明 (Linux 迁移准备)
 *
 * 客户数据存储位置:
 *   - users 表 (user_type='customer') — PostgreSQL, 标准 pg_dump 即可迁移
 *   - grt_user_roles 表 — RBAC 角色映射
 *   - conference_assets 表 — 大会资料元数据
 *   - 文件: client/public/conference-assets/ — 静态文件, rsync 即可
 *
 * 迁移步骤:
 *   1. pg_dump -Fc grt_system > grt_backup.dump
 *   2. rsync -avz client/public/conference-assets/ target:/app/client/public/conference-assets/
 *   3. pg_restore -d grt_system grt_backup.dump  (Linux 端)
 *   4. NODE_ENV=production node dist/index.js    (Linux 端)
 *
 * 无 Windows 特定依赖, 全部 Node.js + PostgreSQL, 零平台锁定。
 */
