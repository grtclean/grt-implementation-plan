/**
 * GRT系统权限检查中间件
 * 用于tRPC路由的权限验证
 */

import { TRPCError } from "@trpc/server";
import { requireDb } from './utils/db-helpers';
import {
  userRoles,
  sensitiveDataAccessLog,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  PermissionLevel,
  ROLE_PERMISSIONS,
  FUNCTION_MODULES,
  SENSITIVE_DATA_RULES,
  getPermission,
  hasPermission,
  getModule,
} from "../shared/permissions";

// ============================================
// 1. 权限检查核心函数
// ============================================

/**
 * 获取用户的角色ID
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const userIdNum = parseInt(userId) || 0;
  const result = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, userIdNum))
    .limit(1);

  return result.length > 0 ? result[0].roleId : null;
}

/**
 * 获取用户的部门ID
 */
export async function getUserDepartment(userId: string): Promise<string | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const userIdNum = parseInt(userId) || 0;
  const result = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, userIdNum))
    .limit(1);

  return result.length > 0 ? result[0].departmentId || null : null;
}

/**
 * 检查用户是否有指定模块的权限
 */
export async function checkModulePermission(
  userId: string,
  moduleId: string,
  requiredLevel: PermissionLevel
): Promise<{
  allowed: boolean;
  userRole: string | null;
  currentPermission: PermissionLevel;
  reason?: string;
}> {
  // 获取用户角色
  const userRole = await getUserRole(userId);

  if (!userRole) {
    return {
      allowed: false,
      userRole: null,
      currentPermission: "none",
      reason: "用户未分配角色",
    };
  }

  // 检查权限
  const currentPermission = getPermission(userRole, moduleId);
  const allowed = hasPermission(userRole, moduleId, requiredLevel);

  return {
    allowed,
    userRole,
    currentPermission,
    reason: allowed ? undefined : `权限不足：需要 ${requiredLevel}，当前 ${currentPermission}`,
  };
}

/**
 * 检查是否为敏感数据模块
 */
export function isSensitiveModule(moduleId: string): boolean {
  const module = getModule(moduleId);
  return module?.sensitivityLevel === "high" || module?.sensitivityLevel === "critical";
}

/**
 * 检查是否需要审计日志
 */
export function requiresAuditLog(moduleId: string): boolean {
  return SENSITIVE_DATA_RULES.some((rule) => rule.moduleId === moduleId && rule.auditRequired);
}

// ============================================
// 2. 审计日志记录
// ============================================

export interface AuditLogEntry {
  userId: string;
  userName?: string;
  userRole?: string;
  userDepartment?: string;
  moduleId: string;
  dataType: string;
  accessType: "view" | "export" | "edit" | "delete";
  dataId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}

/**
 * 记录敏感数据访问日志
 */
export async function logSensitiveDataAccess(entry: AuditLogEntry): Promise<void> {
  const db = await requireDb();
  if (!db) return;

  // 将accessType映射到schema定义的operation类型
  const operationMap: Record<string, "read" | "write" | "delete"> = {
    view: "read",
    export: "read",
    edit: "write",
    delete: "delete",
  };

  await db.insert(sensitiveDataAccessLog).values({
    userId: parseInt(entry.userId) || 0,
    userName: entry.userName || "",
    dataType: entry.dataType,
    action: operationMap[entry.accessType] || "read",
    dataId: entry.dataId || "",
    ipAddress: entry.ipAddress || null,
    accessResult: "allowed",
  });
}

// ============================================
// 3. tRPC中间件工厂函数
// ============================================

/**
 * 创建权限检查中间件配置
 */
export interface PermissionMiddlewareConfig {
  moduleId: string;
  requiredLevel: PermissionLevel;
  auditDataType?: string;
  auditAccessType?: "view" | "export" | "edit" | "delete";
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  userId: string;
  userRole: string;
  userDepartment: string | null;
  moduleId: string;
  permission: PermissionLevel;
}

/**
 * 执行权限检查（用于tRPC procedure中）
 */
export async function executePermissionCheck(
  userId: string,
  config: PermissionMiddlewareConfig,
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<PermissionCheckResult> {
  // 检查权限
  const checkResult = await checkModulePermission(
    userId,
    config.moduleId,
    config.requiredLevel
  );

  if (!checkResult.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: checkResult.reason || "权限不足",
    });
  }

  // 获取用户部门
  const userDepartment = await getUserDepartment(userId);

  // 如果是敏感模块，记录审计日志
  if (requiresAuditLog(config.moduleId) && config.auditDataType) {
    await logSensitiveDataAccess({
      userId,
      userRole: checkResult.userRole || undefined,
      userDepartment: userDepartment || undefined,
      moduleId: config.moduleId,
      dataType: config.auditDataType,
      accessType: config.auditAccessType || "view",
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });
  }

  return {
    userId,
    userRole: checkResult.userRole!,
    userDepartment,
    moduleId: config.moduleId,
    permission: checkResult.currentPermission,
  };
}

// ============================================
// 4. 预定义权限检查配置
// ============================================

/**
 * HRM模块权限检查配置
 */
export const HRM_PERMISSION_CONFIGS = {
  // 员工信息
  viewEmployeeBasic: {
    moduleId: "hrm_employee_basic",
    requiredLevel: "read" as PermissionLevel,
  },
  editEmployeeBasic: {
    moduleId: "hrm_employee_basic",
    requiredLevel: "write" as PermissionLevel,
  },
  viewEmployeeId: {
    moduleId: "hrm_employee_id",
    requiredLevel: "read" as PermissionLevel,
    auditDataType: "身份证号",
    auditAccessType: "view" as const,
  },

  // 薪酬管理
  viewSalaryStructure: {
    moduleId: "hrm_salary_structure",
    requiredLevel: "read" as PermissionLevel,
  },
  editSalaryStructure: {
    moduleId: "hrm_salary_structure",
    requiredLevel: "write" as PermissionLevel,
    auditDataType: "薪酬结构",
    auditAccessType: "edit" as const,
  },
  viewSalaryDetail: {
    moduleId: "hrm_salary_detail",
    requiredLevel: "read" as PermissionLevel,
    auditDataType: "个人薪资",
    auditAccessType: "view" as const,
  },
  editSalaryDetail: {
    moduleId: "hrm_salary_detail",
    requiredLevel: "write" as PermissionLevel,
    auditDataType: "个人薪资",
    auditAccessType: "edit" as const,
  },
  useSalaryCalculator: {
    moduleId: "hrm_salary_calculation",
    requiredLevel: "read" as PermissionLevel,
  },

  // 招聘面试
  viewRecruitment: {
    moduleId: "hrm_recruitment",
    requiredLevel: "read" as PermissionLevel,
  },
  editRecruitment: {
    moduleId: "hrm_recruitment",
    requiredLevel: "write" as PermissionLevel,
  },
  viewInterview: {
    moduleId: "hrm_interview",
    requiredLevel: "read" as PermissionLevel,
  },
  editInterview: {
    moduleId: "hrm_interview",
    requiredLevel: "write" as PermissionLevel,
  },
  viewAiInterview: {
    moduleId: "hrm_ai_interview",
    requiredLevel: "read" as PermissionLevel,
    auditDataType: "AI面试评估",
    auditAccessType: "view" as const,
  },
  editAiInterview: {
    moduleId: "hrm_ai_interview",
    requiredLevel: "write" as PermissionLevel,
    auditDataType: "AI面试评估",
    auditAccessType: "edit" as const,
  },

  // 绩效管理
  viewPerformance: {
    moduleId: "hrm_performance",
    requiredLevel: "read" as PermissionLevel,
  },
  editPerformance: {
    moduleId: "hrm_performance",
    requiredLevel: "write" as PermissionLevel,
  },

  // 培训管理
  viewTraining: {
    moduleId: "hrm_training",
    requiredLevel: "read" as PermissionLevel,
  },
  editTraining: {
    moduleId: "hrm_training",
    requiredLevel: "write" as PermissionLevel,
  },
};

/**
 * 项目管理模块权限检查配置
 */
export const PM_PERMISSION_CONFIGS = {
  viewProjectList: {
    moduleId: "pm_project_list",
    requiredLevel: "read" as PermissionLevel,
  },
  editProjectList: {
    moduleId: "pm_project_list",
    requiredLevel: "write" as PermissionLevel,
  },
  viewProjectCost: {
    moduleId: "pm_project_cost",
    requiredLevel: "read" as PermissionLevel,
    auditDataType: "项目成本",
    auditAccessType: "view" as const,
  },
  editProjectCost: {
    moduleId: "pm_project_cost",
    requiredLevel: "write" as PermissionLevel,
    auditDataType: "项目成本",
    auditAccessType: "edit" as const,
  },
};

/**
 * 系统管理模块权限检查配置
 */
export const SYS_PERMISSION_CONFIGS = {
  viewUserManagement: {
    moduleId: "sys_user_management",
    requiredLevel: "read" as PermissionLevel,
  },
  editUserManagement: {
    moduleId: "sys_user_management",
    requiredLevel: "write" as PermissionLevel,
  },
  viewRoleManagement: {
    moduleId: "sys_role_management",
    requiredLevel: "read" as PermissionLevel,
  },
  editRoleManagement: {
    moduleId: "sys_role_management",
    requiredLevel: "write" as PermissionLevel,
  },
  viewAuditLog: {
    moduleId: "sys_audit_log",
    requiredLevel: "read" as PermissionLevel,
  },
};

// ============================================
// 5. 辅助函数
// ============================================

/**
 * 获取用户可访问的模块列表
 */
export async function getUserAccessibleModules(userId: string): Promise<string[]> {
  const userRole = await getUserRole(userId);
  if (!userRole) return [];

  return FUNCTION_MODULES.filter((module) => {
    const permission = getPermission(userRole, module.id);
    return permission !== "none";
  }).map((module) => module.id);
}

/**
 * 获取用户的权限摘要
 */
export async function getUserPermissionSummary(userId: string): Promise<{
  role: string | null;
  department: string | null;
  accessibleModules: number;
  sensitiveModules: number;
}> {
  const userRole = await getUserRole(userId);
  const userDepartment = await getUserDepartment(userId);
  const accessibleModules = userRole
    ? FUNCTION_MODULES.filter((m) => getPermission(userRole, m.id) !== "none").length
    : 0;
  const sensitiveModules = userRole
    ? FUNCTION_MODULES.filter(
        (m) =>
          (m.sensitivityLevel === "high" || m.sensitivityLevel === "critical") &&
          getPermission(userRole, m.id) !== "none"
      ).length
    : 0;

  return {
    role: userRole,
    department: userDepartment,
    accessibleModules,
    sensitiveModules,
  };
}

/**
 * 批量检查权限
 */
export async function batchCheckPermissions(
  userId: string,
  moduleIds: string[],
  requiredLevel: PermissionLevel
): Promise<Record<string, boolean>> {
  const userRole = await getUserRole(userId);
  if (!userRole) {
    return moduleIds.reduce((acc, id) => ({ ...acc, [id]: false }), {});
  }

  return moduleIds.reduce((acc, moduleId) => {
    acc[moduleId] = hasPermission(userRole, moduleId, requiredLevel);
    return acc;
  }, {} as Record<string, boolean>);
}
