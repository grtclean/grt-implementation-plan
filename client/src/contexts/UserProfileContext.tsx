import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

// ============================================
// 扩展角色类型定义 - 与 shared/permissions.ts 对齐
// 包含事业部(BU)角色和职能角色
// ============================================

export type UserRole =
  // 系统级角色
  | "admin"              // 系统管理员 (level 10)
  | "director"           // 总监 (level 5)
  // 事业部角色
  | "bu_gm"              // BU事业部总经理 (level 6)
  | "bu_pm"              // BU项目经理 (level 3)
  | "bu_sales"           // BU销售工程师 (level 2)
  | "bu_mech"            // BU机械设计工程师 (level 2)
  | "bu_elec"            // BU电气设计工程师 (level 2)
  | "procurement_eng"    // 采购工程师 (level 2)
  | "cs_engineer"        // 客服/现场服务工程师 (level 2)
  // 部门管理角色
  | "dept_manager"       // 部门经理 (level 3)
  | "team_lead"          // 组长/主管 (level 2)
  // 职能角色
  | "hr_manager"         // HR经理 (level 4)
  | "hr_specialist"      // HR专员 (level 3)
  | "finance_manager"    // 财务经理 (level 4)
  | "finance_specialist" // 财务专员 (level 3)
  // 基础角色
  | "employee"           // 普通员工 (level 1)
  | "production_worker"  // 产线员工 (level 1)
  // 外部角色
  | "customer"           // 客户代表 (level 0)
  | "guest";             // 访客 (level 0)

// 角色层级映射 - 数字越大权限越高
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest: 0,
  customer: 0,
  employee: 1,
  production_worker: 1,
  team_lead: 2,
  bu_sales: 2,
  bu_mech: 2,
  bu_elec: 2,
  procurement_eng: 2,
  cs_engineer: 2,
  dept_manager: 3,
  bu_pm: 3,
  hr_specialist: 3,
  finance_specialist: 3,
  hr_manager: 4,
  finance_manager: 4,
  director: 5,
  bu_gm: 6,
  admin: 10,
};

// 向后兼容：将旧角色映射到新角色
export type LegacyUserRole = "admin" | "manager" | "staff";
export function mapLegacyRole(legacy: string): UserRole {
  switch (legacy) {
    case "admin": return "admin";
    case "manager": return "dept_manager";
    case "staff": return "employee";
    default: return "employee";
  }
}

// 视图模式
export type ViewMode = "normal" | "preview";

// 数据可见范围
export type DataScope = "self" | "team" | "department" | "bu" | "global";

// 角色配置
export interface RoleConfig {
  label: string;
  labelEn: string;
  description: string;
  color: string;
  icon: string;
  level: number;
  category: "system" | "bu" | "department" | "function" | "basic";
}

// 角色配置映射
export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  admin: {
    label: "系统管理员",
    labelEn: "System Admin",
    description: "拥有系统所有权限，包括系统设置、用户管理等",
    color: "bg-red-600",
    icon: "Shield",
    level: 10,
    category: "system",
  },
  director: {
    label: "总监",
    labelEn: "Director",
    description: "高管权限，可查看全公司数据",
    color: "bg-purple-600",
    icon: "Crown",
    level: 5,
    category: "system",
  },
  bu_gm: {
    label: "事业部总经理",
    labelEn: "BU General Manager",
    description: "事业部全面管理，可查看本BU所有数据",
    color: "bg-indigo-600",
    icon: "Building2",
    level: 6,
    category: "bu",
  },
  bu_pm: {
    label: "项目经理",
    labelEn: "Project Manager",
    description: "负责项目全生命周期管理",
    color: "bg-blue-600",
    icon: "FolderKanban",
    level: 3,
    category: "bu",
  },
  bu_sales: {
    label: "销售工程师",
    labelEn: "Sales Engineer",
    description: "负责客户开发、商机管理、报价",
    color: "bg-emerald-600",
    icon: "TrendingUp",
    level: 2,
    category: "bu",
  },
  bu_mech: {
    label: "机械设计工程师",
    labelEn: "Mechanical Engineer",
    description: "负责机械部分的设计和技术支持",
    color: "bg-sky-600",
    icon: "Cog",
    level: 2,
    category: "bu",
  },
  bu_elec: {
    label: "电气设计工程师",
    labelEn: "Electrical Engineer",
    description: "负责电气控制系统的设计和技术支持",
    color: "bg-cyan-600",
    icon: "Zap",
    level: 2,
    category: "bu",
  },
  procurement_eng: {
    label: "采购工程师",
    labelEn: "Procurement Engineer",
    description: "负责物料采购和供应商管理",
    color: "bg-amber-600",
    icon: "ShoppingCart",
    level: 2,
    category: "bu",
  },
  cs_engineer: {
    label: "客服工程师",
    labelEn: "Customer Service Engineer",
    description: "负责现场安装、调试和售后服务",
    color: "bg-orange-600",
    icon: "Headphones",
    level: 2,
    category: "bu",
  },
  dept_manager: {
    label: "部门经理",
    labelEn: "Department Manager",
    description: "部门管理权限，包括预算审批、团队管理等",
    color: "bg-blue-500",
    icon: "Users",
    level: 3,
    category: "department",
  },
  team_lead: {
    label: "组长/主管",
    labelEn: "Team Lead",
    description: "团队管理权限，可评估下属绩效",
    color: "bg-teal-500",
    icon: "UserCheck",
    level: 2,
    category: "department",
  },
  hr_manager: {
    label: "HR经理",
    labelEn: "HR Manager",
    description: "人力资源管理权限，全员数据访问",
    color: "bg-pink-600",
    icon: "UserCog",
    level: 4,
    category: "function",
  },
  hr_specialist: {
    label: "HR专员",
    labelEn: "HR Specialist",
    description: "人力资源专员，员工信息管理",
    color: "bg-pink-400",
    icon: "UserPlus",
    level: 3,
    category: "function",
  },
  finance_manager: {
    label: "财务经理",
    labelEn: "Finance Manager",
    description: "财务管理权限，薪酬和预算审批",
    color: "bg-yellow-600",
    icon: "Landmark",
    level: 4,
    category: "function",
  },
  finance_specialist: {
    label: "财务专员",
    labelEn: "Finance Specialist",
    description: "财务专员，费用报销和发票管理",
    color: "bg-yellow-400",
    icon: "Calculator",
    level: 3,
    category: "function",
  },
  employee: {
    label: "员工",
    labelEn: "Employee",
    description: "基础操作权限，可访问个人工作相关功能",
    color: "bg-green-500",
    icon: "User",
    level: 1,
    category: "basic",
  },
  production_worker: {
    label: "产线员工",
    labelEn: "Production Worker",
    description: "产线操作权限，工时打卡和工序执行",
    color: "bg-slate-500",
    icon: "HardHat",
    level: 1,
    category: "basic",
  },
  customer: {
    label: "客户代表",
    labelEn: "Customer Representative",
    description: "外部客户在GRT客户门户中的受控访问角色",
    color: "bg-teal-500",
    icon: "UserCheck",
    level: 0,
    category: "basic",
  },
  guest: {
    label: "访客",
    labelEn: "Guest",
    description: "未登录或外部访客",
    color: "bg-gray-400",
    icon: "Eye",
    level: 0,
    category: "basic",
  },
};

// 权限定义 - 扩展为细粒度权限
export interface Permissions {
  // 系统管理
  canAccessSettings: boolean;
  canAccessUserManagement: boolean;
  canAccessAuditLogs: boolean;
  canAccessMenuManagement: boolean;
  // 业务模块
  canAccessSales: boolean;
  canAccessRnD: boolean;
  canAccessProjects: boolean;
  canAccessManufacturing: boolean;
  canAccessCustomerService: boolean;
  // 人力/财务
  canAccessHR: boolean;
  canAccessFinance: boolean;
  canAccessBudget: boolean;
  canAccessSalary: boolean;
  // 绩效
  canViewOwnPerformance: boolean;
  canViewTeamPerformance: boolean;
  canViewDeptPerformance: boolean;
  canViewBUPerformance: boolean;
  canViewAllPerformance: boolean;
  // 通用
  canAccessReports: boolean;
  canApproveRequests: boolean;
  canManageTeam: boolean;
  canAccessSmartMeeting: boolean;
  canAccessAI: boolean;
  canAccessCRM: boolean;
  canAccessStrategicPlanning: boolean;
  canAccessCapability: boolean;
  canAccessPOS: boolean;
}

// 根据角色获取数据可见范围
export function getDataScopeByRole(role: UserRole): DataScope {
  switch (role) {
    case "admin":
    case "director":
      return "global";
    case "bu_gm":
      return "bu";
    case "dept_manager":
    case "hr_manager":
    case "finance_manager":
      return "department";
    case "team_lead":
    case "bu_pm":
      return "team";
    default:
      return "self";
  }
}

// 根据角色获取权限
export function getPermissionsByRole(role: UserRole): Permissions {
  const level = ROLE_HIERARCHY[role] || 0;
  const isAdmin = role === "admin";
  const isDirector = role === "director" || isAdmin;
  const isBUGM = role === "bu_gm" || isDirector;
  const isDeptManager = role === "dept_manager" || isBUGM;
  const isTeamLead = role === "team_lead" || isDeptManager;
  const isHR = role === "hr_manager" || role === "hr_specialist";
  const isFinance = role === "finance_manager" || role === "finance_specialist";
  const isSales = role === "bu_sales" || isBUGM;
  const isEngineer = role === "bu_mech" || role === "bu_elec" || role === "procurement_eng";
  const isCS = role === "cs_engineer";
  const isPM = role === "bu_pm" || isBUGM;

  return {
    // 系统管理
    canAccessSettings: isAdmin,
    canAccessUserManagement: isAdmin || role === "hr_manager",
    canAccessAuditLogs: isAdmin || isDirector || role === "hr_manager" || role === "finance_manager",
    canAccessMenuManagement: isAdmin,
    // 业务模块
    canAccessSales: isSales || isPM || isDirector,
    canAccessRnD: isEngineer || isPM || isBUGM || isDirector,
    canAccessProjects: level >= 1, // 所有员工
    canAccessManufacturing: role === "production_worker" || isPM || isBUGM || isDirector,
    canAccessCustomerService: isCS || isPM || isBUGM || isDirector,
    // 人力/财务
    canAccessHR: isHR || isDirector,
    canAccessFinance: isFinance || isDirector,
    canAccessBudget: isFinance || isDeptManager || isDirector,
    canAccessSalary: role === "hr_manager" || role === "finance_manager" || isDirector,
    // 绩效
    canViewOwnPerformance: level >= 1,
    canViewTeamPerformance: isTeamLead || isHR,
    canViewDeptPerformance: isDeptManager || isHR,
    canViewBUPerformance: isBUGM || isHR || isDirector,
    canViewAllPerformance: isAdmin || isDirector || role === "hr_manager",
    // 通用
    canAccessReports: level >= 2,
    canApproveRequests: isDeptManager || isHR || isFinance,
    canManageTeam: isTeamLead,
    canAccessSmartMeeting: level >= 1,
    canAccessAI: level >= 1,
    canAccessCRM: isSales || isPM || isDirector,
    canAccessStrategicPlanning: isBUGM || isDirector,
    canAccessCapability: level >= 1,
    canAccessPOS: level >= 1,
  };
}

// Context 状态接口
interface UserProfileContextState {
  currentUserRole: UserRole;
  currentBU: string | null;        // 当前选中的BU代码 (BU1-BU5)
  currentDepartment: string | null; // 当前所属部门
  viewMode: ViewMode;
  permissions: Permissions;
  roleConfig: RoleConfig;
  dataScope: DataScope;
  isRoleSwitching: boolean;
}

// Context 方法接口
interface UserProfileContextActions {
  switchRole: (newRole: UserRole) => void;
  switchBU: (buCode: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  hasPermission: (permission: keyof Permissions) => boolean;
  canAccessRoute: (route: string) => boolean;
  isRoleAtLeast: (minRole: UserRole) => boolean;
}

// 完整 Context 类型
type UserProfileContextType = UserProfileContextState & UserProfileContextActions;

// 创建 Context
const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

// 本地存储键
const STORAGE_KEY = "grt_user_profile_role";
const BU_STORAGE_KEY = "grt_user_current_bu";
const DEPT_STORAGE_KEY = "grt_user_current_dept";

// 合法角色列表
const VALID_ROLES: UserRole[] = [
  "admin", "director", "bu_gm", "bu_pm", "bu_sales", "bu_mech", "bu_elec",
  "procurement_eng", "cs_engineer", "dept_manager", "team_lead",
  "hr_manager", "hr_specialist", "finance_manager", "finance_specialist",
  "employee", "production_worker", "guest",
];

// Provider Props
interface UserProfileProviderProps {
  children: ReactNode;
  defaultRole?: UserRole;
}

// Provider 组件
export function UserProfileProvider({ children, defaultRole = "employee" }: UserProfileProviderProps) {
  const { user } = useAuth();

  // 从本地存储读取角色（支持旧格式兼容）
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // 兼容旧的3角色格式
        if (stored === "staff" || stored === "manager") {
          return mapLegacyRole(stored);
        }
        if (VALID_ROLES.includes(stored as UserRole)) {
          return stored as UserRole;
        }
      }
    }
    return defaultRole;
  });

  // Sync server-provided effectiveRole from RBAC into default role.
  // Only applies once (on first auth load) and only if user hasn't
  // explicitly chosen a role via ProfileSwitcher (localStorage).
  const serverRoleSynced = useRef(false);
  useEffect(() => {
    if (serverRoleSynced.current || !user?.effectiveRole) return;
    const serverRole = user.effectiveRole as string;
    if (!VALID_ROLES.includes(serverRole as UserRole)) return;
    serverRoleSynced.current = true;

    // Only override if no explicit ProfileSwitcher choice exists
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored || stored === "employee" || stored === "staff") {
      setCurrentUserRole(serverRole as UserRole);
      localStorage.setItem(STORAGE_KEY, serverRole);
    }
  }, [user?.effectiveRole]);

  // BU选择状态
  const [currentBU, setCurrentBU] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(BU_STORAGE_KEY) || null;
    }
    return null;
  });

  // 部门状态
  const [currentDepartment, setCurrentDepartment] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(DEPT_STORAGE_KEY) || null;
    }
    return null;
  });

  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [isRoleSwitching, setIsRoleSwitching] = useState(false);

  // 计算权限和配置 — memoize to prevent new object references on every render
  const permissions = useMemo(() => getPermissionsByRole(currentUserRole), [currentUserRole]);
  const roleConfig = useMemo(() => ROLE_CONFIGS[currentUserRole], [currentUserRole]);
  const dataScope = useMemo(() => getDataScopeByRole(currentUserRole), [currentUserRole]);

  // 切换角色
  const switchRole = useCallback((newRole: UserRole) => {
    setIsRoleSwitching(true);
    setTimeout(() => {
      setCurrentUserRole(newRole);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, newRole);
      }
      setIsRoleSwitching(false);
    }, 300);
  }, []);

  // 切换BU
  const switchBU = useCallback((buCode: string | null) => {
    setCurrentBU(buCode);
    if (typeof window !== "undefined") {
      if (buCode) {
        localStorage.setItem(BU_STORAGE_KEY, buCode);
      } else {
        localStorage.removeItem(BU_STORAGE_KEY);
      }
    }
  }, []);

  // 检查角色层级
  const isRoleAtLeast = useCallback(
    (minRole: UserRole): boolean => {
      return (ROLE_HIERARCHY[currentUserRole] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
    },
    [currentUserRole]
  );

  // 检查单个权限
  const hasPermission = useCallback(
    (permission: keyof Permissions): boolean => {
      return permissions[permission];
    },
    [permissions]
  );

  // 检查路由访问权限
  const canAccessRoute = useCallback(
    (route: string): boolean => {
      // 路由权限映射 - 扩展版
      const routePermissions: Record<string, keyof Permissions> = {
        // 系统管理
        "/settings": "canAccessSettings",
        "/system-settings": "canAccessSettings",
        "/permission-management": "canAccessSettings",
        "/menu-management": "canAccessMenuManagement",
        "/user-management": "canAccessUserManagement",
        "/audit-log": "canAccessAuditLogs",
        // 业务模块
        "/crm": "canAccessCRM",
        "/crm/customers": "canAccessCRM",
        "/crm/opportunities": "canAccessCRM",
        "/crm/contacts": "canAccessCRM",
        "/leads": "canAccessSales",
        "/customer-portal": "canAccessSales",
        // 研发
        "/solution-design": "canAccessRnD",
        "/mechanical-design": "canAccessRnD",
        "/electrical-design": "canAccessRnD",
        "/bom-management": "canAccessRnD",
        // 项目
        "/projects": "canAccessProjects",
        "/project-gate": "canAccessProjects",
        // 生产制造
        "/production-dashboard": "canAccessManufacturing",
        "/worker-management": "canAccessManufacturing",
        "/intelligent-scheduling": "canAccessManufacturing",
        // 客户服务
        "/field-installation": "canAccessCustomerService",
        "/sat-testing": "canAccessCustomerService",
        "/final-acceptance": "canAccessCustomerService",
        "/after-sales": "canAccessCustomerService",
        // 人力资源
        "/hrm-intelligent": "canAccessHR",
        "/hr-lifecycle": "canAccessHR",
        "/training": "canAccessHR",
        "/supervisor-workbench": "canManageTeam",
        // 财务
        "/budget-management": "canAccessBudget",
        "/cost": "canAccessFinance",
        "/expense-report": "canAccessPOS", // 全员可见
        "/trip-request": "canAccessPOS",   // 全员可见
        // 绩效
        "/my-performance": "canViewOwnPerformance",
        "/team-performance": "canViewTeamPerformance",
        "/dept-performance": "canViewDeptPerformance",
        "/bu-performance": "canViewBUPerformance",
        // 战略
        "/annual-planning": "canAccessStrategicPlanning",
        "/certification-management": "canAccessStrategicPlanning",
        "/global-growth-tracker": "canAccessStrategicPlanning",
        // 通用
        "/reports": "canAccessReports",
        "/smart-meeting": "canAccessSmartMeeting",
        "/pos": "canAccessPOS",
      };

      const requiredPermission = routePermissions[route];
      if (!requiredPermission) {
        return true; // 未定义权限的路由默认允许
      }
      return permissions[requiredPermission];
    },
    [permissions]
  );

  // 同步到本地存储
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, currentUserRole);
    }
  }, [currentUserRole]);

  const value = useMemo<UserProfileContextType>(() => ({
    currentUserRole,
    currentBU,
    currentDepartment,
    viewMode,
    permissions,
    roleConfig,
    dataScope,
    isRoleSwitching,
    switchRole,
    switchBU,
    setViewMode,
    hasPermission,
    canAccessRoute,
    isRoleAtLeast,
  }), [
    currentUserRole, currentBU, currentDepartment, viewMode,
    permissions, roleConfig, dataScope, isRoleSwitching,
    switchRole, switchBU, setViewMode, hasPermission, canAccessRoute, isRoleAtLeast,
  ]);

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

// Hook
export function useUserProfile(): UserProfileContextType {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return context;
}

// 导出默认 Context
export default UserProfileContext;
