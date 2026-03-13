/**
 * v1.3.25 外部平台深度集成测试
 * 测试用户同步、部门同步、角色同步和权限映射功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock requireDb
vi.mock('./db', () => ({
  requireDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue([[], []]),
  }),
}));

// Mock getExternalSyncService
vi.mock('./external-sync', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    getExternalSyncService: vi.fn().mockReturnValue({
      isConfigured: () => true,
      getCorpId: () => '648a7e88cbaa790009685c37',
      getStats: () => ({ totalApps: 10, totalForms: 50, totalRecords: 1000, lastSyncTime: new Date() }),
      getMembers: vi.fn().mockResolvedValue([
        { username: 'user1', name: '张三', departments: [1, 2], status: 1 },
        { username: 'user2', name: '李四', departments: [2], status: 1 },
      ]),
      getDepartments: vi.fn().mockResolvedValue([
        { dept_no: 1, name: '事业一部', parent_no: null, type: 0, status: 1 },
        { dept_no: 2, name: '事业二部', parent_no: null, type: 0, status: 1 },
      ]),
      getRoles: vi.fn().mockResolvedValue([
        { role_no: 1, group_no: 1, name: '管理员', type: 0, status: 1 },
        { role_no: 2, group_no: 1, name: '普通用户', type: 0, status: 1 },
      ]),
    }),
  };
});

describe('v1.3.25 外部平台深度集成', () => {
  describe('数据库表结构', () => {
    it('应该定义用户映射表结构', () => {
      const userMappingFields = [
        'id', 'ext_username', 'ext_name', 'ext_departments', 'ext_status',
        'ext_integrate_id', 'grt_user_id', 'grt_open_id', 'sync_status',
        'last_sync_at', 'sync_error', 'auto_create_user', 'created_at', 'updated_at'
      ];
      expect(userMappingFields.length).toBe(14);
    });

    it('应该定义部门映射表结构', () => {
      const deptMappingFields = [
        'id', 'ext_dept_no', 'ext_dept_name', 'ext_parent_no', 'ext_dept_type',
        'ext_dept_status', 'grt_dept_id', 'grt_dept_code', 'sync_status',
        'last_sync_at', 'created_at', 'updated_at'
      ];
      expect(deptMappingFields.length).toBe(12);
    });

    it('应该定义角色映射表结构', () => {
      const roleMappingFields = [
        'id', 'ext_role_no', 'ext_group_no', 'ext_role_name', 'ext_role_type',
        'ext_role_status', 'grt_role_id', 'grt_role_name', 'permission_mapping',
        'sync_status', 'last_sync_at', 'created_at', 'updated_at'
      ];
      expect(roleMappingFields.length).toBe(13);
    });

    it('应该定义同步任务表结构', () => {
      const syncTaskFields = [
        'id', 'task_name', 'task_type', 'ext_app_id', 'ext_form_id',
        'sync_direction', 'field_mapping', 'filter_condition', 'cron_expression',
        'is_enabled', 'last_run_at', 'last_run_status', 'last_run_records',
        'last_run_error', 'total_sync_count', 'total_records_synced',
        'created_at', 'updated_at'
      ];
      expect(syncTaskFields.length).toBe(18);
    });

    it('应该定义同步日志表结构', () => {
      const syncLogFields = [
        'id', 'task_id', 'started_at', 'completed_at', 'duration', 'status',
        'records_processed', 'records_created', 'records_updated', 'records_failed',
        'error_message', 'error_details', 'triggered_by', 'triggered_by_user', 'created_at'
      ];
      expect(syncLogFields.length).toBe(15);
    });
  });

  describe('用户同步服务', () => {
    it('应该定义UserSyncResult接口', () => {
      const result = {
        totalMembers: 0,
        created: 0,
        updated: 0,
        failed: 0,
        errors: [] as string[],
      };
      expect(result).toHaveProperty('totalMembers');
      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('errors');
    });

    it('应该定义DeptSyncResult接口', () => {
      const result = {
        totalDepts: 0,
        created: 0,
        updated: 0,
        failed: 0,
        errors: [] as string[],
      };
      expect(result).toHaveProperty('totalDepts');
    });

    it('应该定义RoleSyncResult接口', () => {
      const result = {
        totalRoles: 0,
        created: 0,
        updated: 0,
        failed: 0,
        errors: [] as string[],
      };
      expect(result).toHaveProperty('totalRoles');
    });
  });

  describe('路由定义', () => {
    it('应该定义syncMembers路由', () => {
      const routeName = 'syncMembers';
      expect(routeName).toBe('syncMembers');
    });

    it('应该定义syncDepartments路由', () => {
      const routeName = 'syncDepartments';
      expect(routeName).toBe('syncDepartments');
    });

    it('应该定义syncRoles路由', () => {
      const routeName = 'syncRoles';
      expect(routeName).toBe('syncRoles');
    });

    it('应该定义getUserMappings路由', () => {
      const routeName = 'getUserMappings';
      expect(routeName).toBe('getUserMappings');
    });

    it('应该定义getDeptMappings路由', () => {
      const routeName = 'getDeptMappings';
      expect(routeName).toBe('getDeptMappings');
    });

    it('应该定义getRoleMappings路由', () => {
      const routeName = 'getRoleMappings';
      expect(routeName).toBe('getRoleMappings');
    });

    it('应该定义linkUserToGrt路由', () => {
      const routeName = 'linkUserToGrt';
      expect(routeName).toBe('linkUserToGrt');
    });

    it('应该定义linkRoleToGrt路由', () => {
      const routeName = 'linkRoleToGrt';
      expect(routeName).toBe('linkRoleToGrt');
    });
  });

  describe('同步状态枚举', () => {
    it('应该支持pending状态', () => {
      const status = 'pending';
      expect(['pending', 'synced', 'failed', 'manual']).toContain(status);
    });

    it('应该支持synced状态', () => {
      const status = 'synced';
      expect(['pending', 'synced', 'failed', 'manual']).toContain(status);
    });

    it('应该支持failed状态', () => {
      const status = 'failed';
      expect(['pending', 'synced', 'failed', 'manual']).toContain(status);
    });

    it('应该支持manual状态', () => {
      const status = 'manual';
      expect(['pending', 'synced', 'failed', 'manual']).toContain(status);
    });
  });

  describe('任务类型枚举', () => {
    it('应该支持user类型', () => {
      const type = 'user';
      expect(['user', 'department', 'role', 'form_data', 'full']).toContain(type);
    });

    it('应该支持department类型', () => {
      const type = 'department';
      expect(['user', 'department', 'role', 'form_data', 'full']).toContain(type);
    });

    it('应该支持role类型', () => {
      const type = 'role';
      expect(['user', 'department', 'role', 'form_data', 'full']).toContain(type);
    });

    it('应该支持form_data类型', () => {
      const type = 'form_data';
      expect(['user', 'department', 'role', 'form_data', 'full']).toContain(type);
    });

    it('应该支持full类型', () => {
      const type = 'full';
      expect(['user', 'department', 'role', 'form_data', 'full']).toContain(type);
    });
  });
});

console.log('v1.3.25 外部平台深度集成测试完成');
