/**
 * 简道云角色与GRT权限系统映射服务
 * 实现统一权限管理
 */

import { requireDb } from '../db';
import { sql as drizzleSql } from 'drizzle-orm';

/**
 * GRT系统权限定义
 */
export const GRT_PERMISSIONS = {
  // 系统管理
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_CONFIG: 'system:config',
  
  // 用户管理
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',
  
  // 项目管理
  PROJECT_VIEW: 'project:view',
  PROJECT_CREATE: 'project:create',
  PROJECT_EDIT: 'project:edit',
  PROJECT_DELETE: 'project:delete',
  PROJECT_APPROVE: 'project:approve',
  
  // 客户管理
  CUSTOMER_VIEW: 'customer:view',
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_EDIT: 'customer:edit',
  CUSTOMER_DELETE: 'customer:delete',
  
  // 销售管理
  SALES_VIEW: 'sales:view',
  SALES_CREATE: 'sales:create',
  SALES_EDIT: 'sales:edit',
  SALES_APPROVE: 'sales:approve',
  
  // 生产管理
  PRODUCTION_VIEW: 'production:view',
  PRODUCTION_CREATE: 'production:create',
  PRODUCTION_EDIT: 'production:edit',
  PRODUCTION_APPROVE: 'production:approve',
  
  // 成本管理
  COST_VIEW: 'cost:view',
  COST_CREATE: 'cost:create',
  COST_EDIT: 'cost:edit',
  COST_APPROVE: 'cost:approve',
  
  // 报表分析
  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',
  
  // AI助手
  AI_ASSISTANT_USE: 'ai:use',
  AI_ASSISTANT_ADMIN: 'ai:admin',
  
  // 简道云集成
  JIANDAOYUN_VIEW: 'jiandaoyun:view',
  JIANDAOYUN_SYNC: 'jiandaoyun:sync',
  JIANDAOYUN_ADMIN: 'jiandaoyun:admin',
} as const;

/**
 * GRT系统角色定义
 */
export const GRT_ROLES = {
  // 超级管理员 - 所有权限
  SUPER_ADMIN: {
    id: 'super_admin',
    name: '超级管理员',
    description: '拥有系统所有权限',
    permissions: Object.values(GRT_PERMISSIONS),
  },
  
  // 系统管理员 - 系统配置和用户管理
  SYSTEM_ADMIN: {
    id: 'system_admin',
    name: '系统管理员',
    description: '负责系统配置和用户管理',
    permissions: [
      GRT_PERMISSIONS.SYSTEM_CONFIG,
      GRT_PERMISSIONS.USER_VIEW,
      GRT_PERMISSIONS.USER_CREATE,
      GRT_PERMISSIONS.USER_EDIT,
      GRT_PERMISSIONS.USER_DELETE,
      GRT_PERMISSIONS.JIANDAOYUN_VIEW,
      GRT_PERMISSIONS.JIANDAOYUN_SYNC,
      GRT_PERMISSIONS.JIANDAOYUN_ADMIN,
    ],
  },
  
  // 项目经理 - 项目全生命周期管理
  PROJECT_MANAGER: {
    id: 'project_manager',
    name: '项目经理',
    description: '负责项目全生命周期管理',
    permissions: [
      GRT_PERMISSIONS.PROJECT_VIEW,
      GRT_PERMISSIONS.PROJECT_CREATE,
      GRT_PERMISSIONS.PROJECT_EDIT,
      GRT_PERMISSIONS.PROJECT_APPROVE,
      GRT_PERMISSIONS.CUSTOMER_VIEW,
      GRT_PERMISSIONS.PRODUCTION_VIEW,
      GRT_PERMISSIONS.COST_VIEW,
      GRT_PERMISSIONS.REPORT_VIEW,
      GRT_PERMISSIONS.REPORT_EXPORT,
      GRT_PERMISSIONS.AI_ASSISTANT_USE,
    ],
  },
  
  // 销售经理 - 客户和销售管理
  SALES_MANAGER: {
    id: 'sales_manager',
    name: '销售经理',
    description: '负责客户开发和销售管理',
    permissions: [
      GRT_PERMISSIONS.CUSTOMER_VIEW,
      GRT_PERMISSIONS.CUSTOMER_CREATE,
      GRT_PERMISSIONS.CUSTOMER_EDIT,
      GRT_PERMISSIONS.SALES_VIEW,
      GRT_PERMISSIONS.SALES_CREATE,
      GRT_PERMISSIONS.SALES_EDIT,
      GRT_PERMISSIONS.SALES_APPROVE,
      GRT_PERMISSIONS.PROJECT_VIEW,
      GRT_PERMISSIONS.REPORT_VIEW,
      GRT_PERMISSIONS.AI_ASSISTANT_USE,
    ],
  },
  
  // 生产主管 - 生产和工序管理
  PRODUCTION_SUPERVISOR: {
    id: 'production_supervisor',
    name: '生产主管',
    description: '负责生产计划和工序管理',
    permissions: [
      GRT_PERMISSIONS.PRODUCTION_VIEW,
      GRT_PERMISSIONS.PRODUCTION_CREATE,
      GRT_PERMISSIONS.PRODUCTION_EDIT,
      GRT_PERMISSIONS.PRODUCTION_APPROVE,
      GRT_PERMISSIONS.PROJECT_VIEW,
      GRT_PERMISSIONS.COST_VIEW,
      GRT_PERMISSIONS.REPORT_VIEW,
      GRT_PERMISSIONS.AI_ASSISTANT_USE,
    ],
  },
  
  // 财务主管 - 成本和财务管理
  FINANCE_SUPERVISOR: {
    id: 'finance_supervisor',
    name: '财务主管',
    description: '负责成本核算和财务管理',
    permissions: [
      GRT_PERMISSIONS.COST_VIEW,
      GRT_PERMISSIONS.COST_CREATE,
      GRT_PERMISSIONS.COST_EDIT,
      GRT_PERMISSIONS.COST_APPROVE,
      GRT_PERMISSIONS.PROJECT_VIEW,
      GRT_PERMISSIONS.REPORT_VIEW,
      GRT_PERMISSIONS.REPORT_EXPORT,
      GRT_PERMISSIONS.AI_ASSISTANT_USE,
    ],
  },
  
  // 普通员工 - 基础查看权限
  EMPLOYEE: {
    id: 'employee',
    name: '普通员工',
    description: '基础查看和操作权限',
    permissions: [
      GRT_PERMISSIONS.PROJECT_VIEW,
      GRT_PERMISSIONS.CUSTOMER_VIEW,
      GRT_PERMISSIONS.PRODUCTION_VIEW,
      GRT_PERMISSIONS.REPORT_VIEW,
      GRT_PERMISSIONS.AI_ASSISTANT_USE,
    ],
  },
  
  // 访客 - 只读权限
  GUEST: {
    id: 'guest',
    name: '访客',
    description: '只读访问权限',
    permissions: [
      GRT_PERMISSIONS.PROJECT_VIEW,
      GRT_PERMISSIONS.REPORT_VIEW,
    ],
  },
} as const;

/**
 * 简道云角色到GRT角色的默认映射规则
 */
export const DEFAULT_ROLE_MAPPINGS: Record<string, string> = {
  // 管理员类
  '管理员': GRT_ROLES.SUPER_ADMIN.id,
  '超级管理员': GRT_ROLES.SUPER_ADMIN.id,
  '系统管理员': GRT_ROLES.SYSTEM_ADMIN.id,
  
  // 项目类
  '项目经理': GRT_ROLES.PROJECT_MANAGER.id,
  '项目负责人': GRT_ROLES.PROJECT_MANAGER.id,
  '项目主管': GRT_ROLES.PROJECT_MANAGER.id,
  
  // 销售类
  '销售经理': GRT_ROLES.SALES_MANAGER.id,
  '销售主管': GRT_ROLES.SALES_MANAGER.id,
  '销售总监': GRT_ROLES.SALES_MANAGER.id,
  '客户经理': GRT_ROLES.SALES_MANAGER.id,
  
  // 生产类
  '生产经理': GRT_ROLES.PRODUCTION_SUPERVISOR.id,
  '生产主管': GRT_ROLES.PRODUCTION_SUPERVISOR.id,
  '车间主任': GRT_ROLES.PRODUCTION_SUPERVISOR.id,
  '工艺工程师': GRT_ROLES.PRODUCTION_SUPERVISOR.id,
  
  // 财务类
  '财务经理': GRT_ROLES.FINANCE_SUPERVISOR.id,
  '财务主管': GRT_ROLES.FINANCE_SUPERVISOR.id,
  '会计': GRT_ROLES.FINANCE_SUPERVISOR.id,
  
  // 普通员工
  '员工': GRT_ROLES.EMPLOYEE.id,
  '普通员工': GRT_ROLES.EMPLOYEE.id,
  '普通用户': GRT_ROLES.EMPLOYEE.id,
};

/**
 * 权限映射服务
 */
export class PermissionMappingService {
  /**
   * 获取GRT角色列表
   */
  getGrtRoles(): typeof GRT_ROLES {
    return GRT_ROLES;
  }

  /**
   * 获取GRT权限列表
   */
  getGrtPermissions(): typeof GRT_PERMISSIONS {
    return GRT_PERMISSIONS;
  }

  /**
   * 根据简道云角色名称获取建议的GRT角色
   */
  suggestGrtRole(jdyRoleName: string): string {
    // 精确匹配
    if (DEFAULT_ROLE_MAPPINGS[jdyRoleName]) {
      return DEFAULT_ROLE_MAPPINGS[jdyRoleName];
    }
    
    // 模糊匹配
    const lowerName = jdyRoleName.toLowerCase();
    for (const [key, value] of Object.entries(DEFAULT_ROLE_MAPPINGS)) {
      if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
        return value;
      }
    }
    
    // 默认返回普通员工
    return GRT_ROLES.EMPLOYEE.id;
  }

  /**
   * 获取角色的权限列表
   */
  getRolePermissions(roleId: string): string[] {
    const role = Object.values(GRT_ROLES).find(r => r.id === roleId);
    return role ? [...role.permissions] : [];
  }

  /**
   * 检查用户是否有指定权限
   */
  async checkUserPermission(userId: number, permission: string): Promise<boolean> {
    const db = await requireDb();
    
    // 获取用户的角色映射
    const userMapping = await db.execute(
      drizzleSql`SELECT jrm.grt_role_id, jrm.permission_mapping 
        FROM jiandaoyun_user_mappings jum
        LEFT JOIN jiandaoyun_role_mappings jrm ON JSON_CONTAINS(jum.jdy_departments, CAST(jrm.jdy_role_no AS JSON))
        WHERE jum.grt_user_id = ${userId}`
    );
    
    const mappings = (userMapping as any)[0] || [];
    
    for (const mapping of mappings) {
      if (mapping.grt_role_id) {
        const permissions = this.getRolePermissions(mapping.grt_role_id);
        if (permissions.includes(permission)) {
          return true;
        }
      }
      
      // 检查自定义权限映射
      if (mapping.permission_mapping) {
        const customPermissions = JSON.parse(mapping.permission_mapping);
        if (customPermissions[permission]) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 获取用户的所有权限
   */
  async getUserPermissions(userId: number): Promise<string[]> {
    const db = await requireDb();
    const permissions = new Set<string>();
    
    // 获取用户的角色映射
    const userMapping = await db.execute(
      drizzleSql`SELECT jrm.grt_role_id, jrm.permission_mapping 
        FROM jiandaoyun_user_mappings jum
        LEFT JOIN jiandaoyun_role_mappings jrm ON jum.id IS NOT NULL
        WHERE jum.grt_user_id = ${userId}`
    );
    
    const mappings = (userMapping as any)[0] || [];
    
    for (const mapping of mappings) {
      if (mapping.grt_role_id) {
        const rolePermissions = this.getRolePermissions(mapping.grt_role_id);
        rolePermissions.forEach(p => permissions.add(p));
      }
      
      // 添加自定义权限
      if (mapping.permission_mapping) {
        try {
          const customPermissions = JSON.parse(mapping.permission_mapping);
          Object.keys(customPermissions).forEach(p => {
            if (customPermissions[p]) {
              permissions.add(p);
            }
          });
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
    
    return Array.from(permissions);
  }

  /**
   * 自动映射简道云角色到GRT角色
   */
  async autoMapRoles(): Promise<{
    mapped: number;
    skipped: number;
    errors: string[];
  }> {
    const db = await requireDb();
    const result = {
      mapped: 0,
      skipped: 0,
      errors: [] as string[],
    };
    
    // 获取所有未映射的简道云角色
    const unmappedRoles = await db.execute(
      drizzleSql`SELECT * FROM jiandaoyun_role_mappings WHERE grt_role_id IS NULL OR grt_role_id = ''`
    );
    
    const roles = (unmappedRoles as any)[0] || [];
    
    for (const role of roles) {
      try {
        const suggestedRole = this.suggestGrtRole(role.jdy_role_name);
        const grtRole = Object.values(GRT_ROLES).find(r => r.id === suggestedRole);
        
        if (grtRole) {
          await db.execute(
            drizzleSql`UPDATE jiandaoyun_role_mappings 
              SET grt_role_id = ${grtRole.id},
                  grt_role_name = ${grtRole.name},
                  permission_mapping = ${JSON.stringify(Object.fromEntries(grtRole.permissions.map(p => [p, true])))},
                  sync_status = 'synced',
                  updated_at = NOW()
              WHERE id = ${role.id}`
          );
          result.mapped++;
        } else {
          result.skipped++;
        }
      } catch (error: any) {
        result.errors.push(`Failed to map role ${role.jdy_role_name}: ${error.message}`);
      }
    }
    
    return result;
  }

  /**
   * 获取角色映射统计
   */
  async getMappingStats(): Promise<{
    totalRoles: number;
    mappedRoles: number;
    unmappedRoles: number;
    roleDistribution: Record<string, number>;
  }> {
    const db = await requireDb();
    
    const statsResult = await db.execute(
      drizzleSql`SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN grt_role_id IS NOT NULL AND grt_role_id != '' THEN 1 ELSE 0 END) as mapped,
        SUM(CASE WHEN grt_role_id IS NULL OR grt_role_id = '' THEN 1 ELSE 0 END) as unmapped
      FROM jiandaoyun_role_mappings`
    );
    
    const distributionResult = await db.execute(
      drizzleSql`SELECT grt_role_id, grt_role_name, COUNT(*) as count 
        FROM jiandaoyun_role_mappings 
        WHERE grt_role_id IS NOT NULL AND grt_role_id != ''
        GROUP BY grt_role_id, grt_role_name`
    );
    
    const stats = (statsResult as any)[0]?.[0] || {};
    const distribution = (distributionResult as any)[0] || [];
    
    const roleDistribution: Record<string, number> = {};
    for (const item of distribution) {
      roleDistribution[item.grt_role_name || item.grt_role_id] = Number(item.count);
    }
    
    return {
      totalRoles: Number(stats.total) || 0,
      mappedRoles: Number(stats.mapped) || 0,
      unmappedRoles: Number(stats.unmapped) || 0,
      roleDistribution,
    };
  }
}

// 单例实例
let permissionServiceInstance: PermissionMappingService | null = null;

export function getPermissionMappingService(): PermissionMappingService {
  if (!permissionServiceInstance) {
    permissionServiceInstance = new PermissionMappingService();
  }
  return permissionServiceInstance;
}
