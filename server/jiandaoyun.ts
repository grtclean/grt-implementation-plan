/**
 * 简道云 API 集成服务
 * 
 * 简道云 API 文档: https://hc.jiandaoyun.com/open/
 * 
 * V5 API认证方式:
 * - URL: https://api.jiandaoyun.com/api/v5/...
 * - Header: Authorization: Bearer {api_key}
 * - Body: { app_id, entry_id, ... }
 * 
 * 注意: V5版本API将app_id和entry_id放入body中，不再使用URL路径参数
 * 响应格式: { apps: [...] } 或 { entries: [...] } 或 { data: [...] }
 * 
 * 主要功能:
 * 1. 获取应用列表
 * 2. 获取表单结构
 * 3. 获取表单数据
 * 4. 数据同步
 */

import { ENV } from './_core/env';

// 简道云 API 配置
interface JiandaoyunConfig {
  apiKey: string;
  baseUrl: string;
  corpId?: string;
  appId?: string;
}

// 应用信息
export interface JiandaoyunApp {
  app_id: string;
  name: string;
  createTime?: string;
  updateTime?: string;
}

// 表单信息
export interface JiandaoyunForm {
  entry_id: string;
  name: string;
  createTime?: string;
  updateTime?: string;
}

// 字段信息
export interface JiandaoyunField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

// 表单数据
export interface JiandaoyunRecord {
  _id: string;
  [key: string]: unknown;
}

// 部门信息
export interface JiandaoyunDepartment {
  dept_no: number;
  name: string;
  parent_no?: number;
  type?: number; // 0: 常规部门, 2: 企业互联外部部门
  status?: number; // 1: 使用中, -1: 已删除
  seq?: number;
  integrate_id?: string;
}

// 成员信息
export interface JiandaoyunMember {
  username: string;
  name: string;
  departments: number[];
  type?: number; // 0: 常规成员, 2: 企业互联外部对接人
  status?: number; // 0: 未确认, 1: 已加入
  integrate_id?: string;
}

// 角色信息
export interface JiandaoyunRole {
  role_no: number;
  group_no: number;
  name: string;
  type?: number;
  status?: number;
  integrate_id?: string;
}

// 角色成员信息
export interface JiandaoyunRoleMember {
  username: string;
  name: string;
  departments_range?: number[];
  has_child?: boolean;
}

// 数据统计
export interface JiandaoyunStats {
  totalApps: number;
  totalForms: number;
  totalRecords: number;
  lastSyncTime: Date | null;
}

/**
 * 简道云 API 客户端
 */
export class JiandaoyunClient {
  private config: JiandaoyunConfig;
  private lastRequestTime = 0;
  private minIntervalMs = 100; // ~10 requests/sec to stay under 简道云 rate limit

  constructor(config: JiandaoyunConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.jiandaoyun.com/api/v5',
    };
  }

  /**
   * 限流：确保请求间隔不小于 minIntervalMs
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      await new Promise(resolve => setTimeout(resolve, this.minIntervalMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * 获取企业ID
   */
  getCorpId(): string | undefined {
    return this.config.corpId;
  }

  /**
   * 构建API URL
   * V5版本使用统一的端点路径，不再在URL中包含corp_id
   */
  private buildUrl(endpoint: string): string {
    return `${this.config.baseUrl}${endpoint}`;
  }

  /**
   * 发送 API 请求
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: Record<string, unknown>
  ): Promise<T> {
    await this.throttle();
    const url = this.buildUrl(endpoint);

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };

    console.log(`[Jiandaoyun API] ${method} ${url}`);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      // 获取响应文本用于调试
      const responseText = await response.text();
      
      // 检查响应状态
      if (!response.ok) {
        console.error(`[Jiandaoyun API] Response: ${response.status} - ${responseText.substring(0, 500)}`);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      // 尝试解析JSON
      let result: T;
      try {
        result = JSON.parse(responseText) as T;
      } catch (parseError) {
        console.error(`[Jiandaoyun API] Failed to parse JSON: ${responseText.substring(0, 200)}`);
        throw new Error(`API returned invalid JSON response`);
      }

      return result;
    } catch (error) {
      console.error('[Jiandaoyun API] Request failed:', error);
      throw error;
    }
  }

  /**
   * 获取应用列表
   * V5 API: POST /app/list
   * Response: { apps: [...] }
   */
  async getApps(): Promise<JiandaoyunApp[]> {
    const result = await this.request<{ apps: JiandaoyunApp[] }>('/app/list', 'POST', { limit: 100 });
    return result.apps || [];
  }

  /**
   * 获取表单列表
   * V5 API: POST /app/entry/list
   * Body: { app_id }
   * Response: { entries: [...] }
   */
  async getForms(appId: string): Promise<JiandaoyunForm[]> {
    const result = await this.request<{ entries: JiandaoyunForm[] }>('/app/entry/list', 'POST', { app_id: appId });
    return result.entries || [];
  }

  /**
   * 获取表单字段结构
   * V5 API: POST /app/entry/widget
   * Body: { app_id, entry_id }
   * Response: { widgets: [...] }
   */
  async getFormFields(appId: string, formId: string): Promise<JiandaoyunField[]> {
    const result = await this.request<{ widgets: JiandaoyunField[] }>('/app/entry/widget', 'POST', { 
      app_id: appId, 
      entry_id: formId 
    });
    return result.widgets || [];
  }

  /**
   * 获取表单数据（查询多条）
   * V5 API: POST /app/entry/data/list
   * Body: { app_id, entry_id, limit, data_id, filter, fields }
   * Response: { data: [...] }
   */
  async getFormData(
    appId: string,
    formId: string,
    options?: {
      limit?: number;
      dataId?: string;  // 上一次查询的最后一条数据ID，用于分页
      filter?: Record<string, unknown>;
      fields?: string[];
    }
  ): Promise<{ data: JiandaoyunRecord[] }> {
    const body: Record<string, unknown> = {
      app_id: appId,
      entry_id: formId,
      limit: options?.limit || 100,
    };
    
    if (options?.dataId) {
      body.data_id = options.dataId;
    }
    if (options?.filter) {
      body.filter = options.filter;
    }
    if (options?.fields) {
      body.fields = options.fields;
    }
    
    const result = await this.request<{ data: JiandaoyunRecord[] }>(
      '/app/entry/data/list',
      'POST',
      body
    );
    
    return { data: result.data || [] };
  }

  /**
   * 获取表单数据总数
   * V5 API: POST /app/entry/data/count
   * Body: { app_id, entry_id }
   * Response: { count: number }
   */
  async getFormDataCount(appId: string, formId: string): Promise<number> {
    const result = await this.request<{ count: number }>(
      '/app/entry/data/count',
      'POST',
      { app_id: appId, entry_id: formId }
    );
    return result.count || 0;
  }

  /**
   * 获取部门列表（递归）
   * V6 API: POST /corp/department/list
   * Body: { dept_no, has_child }
   */
  async getDepartments(deptNo: number = 1, hasChild: boolean = true): Promise<JiandaoyunDepartment[]> {
    // 使用v6版本API
    const url = 'https://api.jiandaoyun.com/api/v6/corp/department/list';
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
    console.log(`[Jiandaoyun API] POST ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ dept_no: deptNo, has_child: hasChild }),
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    const result = await response.json() as { departments: JiandaoyunDepartment[] };
    return result.departments || [];
  }

  /**
   * 获取部门列表（递归）- 旧版本保留
   * V5 API: POST /corp/department/list
   * Body: { dept_no, has_child }
   */
  async getDepartmentsV5(deptNo: number = 1, hasChild: boolean = true): Promise<JiandaoyunDepartment[]> {
    const result = await this.request<{ departments: JiandaoyunDepartment[] }>(
      '/corp/department/list',
      'POST',
      { dept_no: deptNo, has_child: hasChild }
    );
    return result.departments || [];
  }

  /**
   * 获取部门成员列表（递归）
   * V5 API: POST /corp/department/user/list
   * Body: { dept_no, has_child }
   */
  async getMembers(deptNo: number = 1, hasChild: boolean = true): Promise<JiandaoyunMember[]> {
    const result = await this.request<{ users: JiandaoyunMember[] }>(
      '/corp/department/user/list',
      'POST',
      { dept_no: deptNo, has_child: hasChild }
    );
    return result.users || [];
  }

  /**
   * 获取角色列表（带分页）
   * V5 API: POST /corp/role/list
   */
  async getRoles(): Promise<JiandaoyunRole[]> {
    const allRoles: JiandaoyunRole[] = [];
    let skip = 0;
    const limit = 100;

    while (true) {
      const result = await this.request<{ roles: JiandaoyunRole[] }>(
        '/corp/role/list',
        'POST',
        { skip, limit }
      );
      const roles = result.roles || [];
      allRoles.push(...roles);
      if (roles.length < limit) break;
      skip += limit;
    }

    return allRoles;
  }

  /**
   * 获取角色成员列表（单页）
   * V5 API: POST /corp/role/user/list
   */
  async getRoleMembers(roleNo: number, skip = 0, limit = 100): Promise<JiandaoyunRoleMember[]> {
    const result = await this.request<{ users: JiandaoyunRoleMember[] }>(
      '/corp/role/user/list',
      'POST',
      { role_no: roleNo, skip, limit }
    );
    return result.users || [];
  }

  /**
   * 获取角色的所有成员（自动分页）
   */
  async getAllRoleMembers(roleNo: number): Promise<JiandaoyunRoleMember[]> {
    const allMembers: JiandaoyunRoleMember[] = [];
    let skip = 0;
    const limit = 100;

    while (true) {
      const members = await this.getRoleMembers(roleNo, skip, limit);
      allMembers.push(...members);
      if (members.length < limit) break;
      skip += limit;
    }

    return allMembers;
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<{ success: boolean; message: string; apps?: number; appList?: JiandaoyunApp[] }> {
    try {
      const apps = await this.getApps();
      return {
        success: true,
        message: `Successfully connected! Found ${apps.length} apps.`,
        apps: apps.length,
        appList: apps,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection failed',
      };
    }
  }
}

/**
 * 简道云数据同步服务
 */
export class JiandaoyunSyncService {
  private client: JiandaoyunClient | null = null;
  private stats: JiandaoyunStats = {
    totalApps: 0,
    totalForms: 0,
    totalRecords: 0,
    lastSyncTime: null,
  };

  constructor() {
    // 从环境变量获取配置
    const apiKey = process.env.JIANDAOYUN_API_KEY;
    const corpId = process.env.JIANDAOYUN_CORP_ID;
    
    if (apiKey) {
      this.client = new JiandaoyunClient({
        apiKey,
        corpId,
        baseUrl: process.env.JIANDAOYUN_API_URL || 'https://api.jiandaoyun.com/api/v5',
      });
    }
  }

  /**
   * 获取企业ID
   */
  getCorpId(): string | undefined {
    return this.client?.getCorpId();
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * 获取同步状态
   */
  getStats(): JiandaoyunStats {
    return this.stats;
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; message: string; apps?: number; appList?: JiandaoyunApp[] }> {
    if (!this.client) {
      return { success: false, message: 'Jiandaoyun API not configured' };
    }
    return this.client.testConnection();
  }

  /**
   * 获取部门列表
   */
  async getDepartments(deptNo: number = 1): Promise<JiandaoyunDepartment[]> {
    if (!this.client) {
      throw new Error('Jiandaoyun API not configured');
    }
    return this.client.getDepartments(deptNo, true);
  }

  /**
   * 获取成员列表
   */
  async getMembers(deptNo: number = 1): Promise<JiandaoyunMember[]> {
    if (!this.client) {
      throw new Error('Jiandaoyun API not configured');
    }
    return this.client.getMembers(deptNo, true);
  }

  /**
   * 获取角色列表
   */
  async getRoles(): Promise<JiandaoyunRole[]> {
    if (!this.client) {
      throw new Error('Jiandaoyun API not configured');
    }
    return this.client.getRoles();
  }

  /**
   * 获取角色成员列表
   */
  async getRoleMembers(roleNo: number): Promise<JiandaoyunRoleMember[]> {
    if (!this.client) {
      throw new Error('Jiandaoyun API not configured');
    }
    return this.client.getAllRoleMembers(roleNo);
  }

  /**
   * 同步应用列表
   */
  async syncApps(): Promise<JiandaoyunApp[]> {
    if (!this.client) {
      throw new Error('Jiandaoyun API not configured');
    }

    const apps = await this.client.getApps();
    this.stats.totalApps = apps.length;
    this.stats.lastSyncTime = new Date();
    
    return apps;
  }

  /**
   * 同步表单结构
   */
  async syncForms(appId: string): Promise<JiandaoyunForm[]> {
    if (!this.client) {
      throw new Error('Jiandaoyun API not configured');
    }

    const forms = await this.client.getForms(appId);
    this.stats.totalForms += forms.length;
    this.stats.lastSyncTime = new Date();
    
    return forms;
  }

  /**
   * 获取表单字段
   */
  async getFormFields(appId: string, formId: string): Promise<JiandaoyunField[]> {
    if (!this.client) {
      throw new Error('Jiandaoyun API not configured');
    }

    return this.client.getFormFields(appId, formId);
  }

  /**
   * 获取表单数据统计
   */
  async getFormStats(appId: string, formId: string): Promise<{ count: number }> {
    if (!this.client) {
      throw new Error('Jiandaoyun API not configured');
    }

    const count = await this.client.getFormDataCount(appId, formId);
    return { count };
  }

  /**
   * 获取表单数据
   */
  async getFormData(appId: string, formId: string, options?: {
    limit?: number;
    dataId?: string;
    filter?: Record<string, unknown>;
    fields?: string[];
  }): Promise<{ data: JiandaoyunRecord[] }> {
    if (!this.client) {
      throw new Error('Jiandaoyun API not configured');
    }

    return this.client.getFormData(appId, formId, options);
  }

  /**
   * 全量同步（获取所有应用和表单的统计信息）
   */
  async fullSync(): Promise<{
    apps: JiandaoyunApp[];
    formCounts: Record<string, number>;
    totalRecords: number;
  }> {
    if (!this.client) {
      throw new Error('Jiandaoyun API not configured');
    }

    const apps = await this.client.getApps();
    const formCounts: Record<string, number> = {};
    let totalRecords = 0;

    for (const app of apps) {
      try {
        const forms = await this.client.getForms(app.app_id);
        for (const form of forms) {
          try {
            const count = await this.client.getFormDataCount(app.app_id, form.entry_id);
            formCounts[`${app.name}/${form.name}`] = count;
            totalRecords += count;
          } catch (error) {
            console.warn(`[Jiandaoyun] Failed to get count for form ${form.name}:`, error);
          }
        }
      } catch (error) {
        console.warn(`[Jiandaoyun] Failed to get forms for app ${app.name}:`, error);
      }
    }

    this.stats = {
      totalApps: apps.length,
      totalForms: Object.keys(formCounts).length,
      totalRecords,
      lastSyncTime: new Date(),
    };

    return { apps, formCounts, totalRecords };
  }
}

// 单例实例
let syncServiceInstance: JiandaoyunSyncService | null = null;

export function getJiandaoyunSyncService(): JiandaoyunSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new JiandaoyunSyncService();
  }
  return syncServiceInstance;
}

// 重置单例（用于测试）
export function resetJiandaoyunSyncService(): void {
  syncServiceInstance = null;
}

// 模拟数据（当API未配置时使用）
export const mockJiandaoyunData = {
  apps: [
    { app_id: 'app1', name: '项目管理' },
    { app_id: 'app2', name: '人事及OA管理系统' },
    { app_id: 'app3', name: 'ERP模板' },
  ],
  stats: {
    totalApps: 47,
    totalForms: 120,
    totalRecords: 15680,
    lastSyncTime: new Date('2026-01-16T00:00:00Z'),
  },
  formCounts: {
    '项目管理/M0-1_客户管理': 350,
    '项目管理/M0-2_商机管理': 280,
    '项目管理/M3-1_合同管理': 420,
    '项目管理/M5-1_采购订单': 380,
    '人事及OA管理系统/员工档案': 320,
    '人事及OA管理系统/考勤记录': 8500,
    'ERP模板/销售订单': 1200,
    'ERP模板/采购订单': 890,
    'ERP模板/库存记录': 3340,
  },
};


// ===== 用户同步服务 =====

import { requireDb } from './db';
import { sql as drizzleSql } from 'drizzle-orm';

/**
 * 用户同步结果
 */
export interface UserSyncResult {
  totalMembers: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

/**
 * 部门同步结果
 */
export interface DeptSyncResult {
  totalDepts: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

/**
 * 角色同步结果
 */
export interface RoleSyncResult {
  totalRoles: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

/**
 * 角色成员同步结果
 */
export interface RoleMemberSyncResult {
  totalRoleMembers: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

/**
 * 简道云用户同步服务
 * 将简道云成员同步到GRT系统
 */
export class JiandaoyunUserSyncService {
  private syncService: JiandaoyunSyncService;

  constructor() {
    this.syncService = getJiandaoyunSyncService();
  }

  /**
   * 同步所有简道云成员到用户映射表
   */
  async syncMembers(): Promise<UserSyncResult> {
    const result: UserSyncResult = {
      totalMembers: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    try {
      // 获取简道云所有成员
      const members = await this.syncService.getMembers(1);
      result.totalMembers = members.length;

      for (const member of members) {
        try {
          // 检查是否已存在映射
          const existing = await (await requireDb()).execute(
            drizzleSql`SELECT id FROM jiandaoyun_user_mappings WHERE jdy_username = ${member.username} LIMIT 1`
          );

          if (existing && (existing as any)[0]?.length > 0) {
            // 更新现有记录
            await (await requireDb()).execute(
              drizzleSql`UPDATE jiandaoyun_user_mappings 
                SET jdy_name = ${member.name},
                    jdy_departments = ${JSON.stringify(member.departments)},
                    jdy_status = ${member.status || 1},
                    jdy_integrate_id = ${member.integrate_id || null},
                    last_sync_at = NOW(),
                    sync_status = 'synced'
                WHERE jdy_username = ${member.username}`
            );
            result.updated++;
          } else {
            // 创建新记录
            await (await requireDb()).execute(
              drizzleSql`INSERT INTO jiandaoyun_user_mappings 
                (jdy_username, jdy_name, jdy_departments, jdy_status, jdy_integrate_id, sync_status, last_sync_at)
                VALUES (${member.username}, ${member.name}, ${JSON.stringify(member.departments)}, ${member.status || 1}, ${member.integrate_id || null}, 'synced', NOW())`
            );
            result.created++;
          }
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Failed to sync member ${member.name}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.errors.push(`Failed to fetch members: ${error.message}`);
    }

    return result;
  }

  /**
   * 同步所有简道云部门到部门映射表
   */
  async syncDepartments(): Promise<DeptSyncResult> {
    const result: DeptSyncResult = {
      totalDepts: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    try {
      // 获取简道云所有部门
      const departments = await this.syncService.getDepartments(1);
      result.totalDepts = departments.length;

      for (const dept of departments) {
        try {
          // 检查是否已存在映射
          const existing = await (await requireDb()).execute(
            drizzleSql`SELECT id FROM jiandaoyun_dept_mappings WHERE jdy_dept_no = ${dept.dept_no} LIMIT 1`
          );

          if (existing && (existing as any)[0]?.length > 0) {
            // 更新现有记录
            await (await requireDb()).execute(
              drizzleSql`UPDATE jiandaoyun_dept_mappings 
                SET jdy_dept_name = ${dept.name},
                    jdy_parent_no = ${dept.parent_no || null},
                    jdy_dept_type = ${dept.type || 0},
                    jdy_dept_status = ${dept.status || 1},
                    last_sync_at = NOW(),
                    sync_status = 'synced'
                WHERE jdy_dept_no = ${dept.dept_no}`
            );
            result.updated++;
          } else {
            // 创建新记录
            await (await requireDb()).execute(
              drizzleSql`INSERT INTO jiandaoyun_dept_mappings 
                (jdy_dept_no, jdy_dept_name, jdy_parent_no, jdy_dept_type, jdy_dept_status, sync_status, last_sync_at)
                VALUES (${dept.dept_no}, ${dept.name}, ${dept.parent_no || null}, ${dept.type || 0}, ${dept.status || 1}, 'synced', NOW())`
            );
            result.created++;
          }
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Failed to sync department ${dept.name}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.errors.push(`Failed to fetch departments: ${error.message}`);
    }

    return result;
  }

  /**
   * 同步所有简道云角色到角色映射表
   */
  async syncRoles(): Promise<RoleSyncResult> {
    const result: RoleSyncResult = {
      totalRoles: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    try {
      // 获取简道云所有角色
      const roles = await this.syncService.getRoles();
      result.totalRoles = roles.length;

      for (const role of roles) {
        try {
          // 检查是否已存在映射
          const existing = await (await requireDb()).execute(
            drizzleSql`SELECT id FROM jiandaoyun_role_mappings WHERE jdy_role_no = ${role.role_no} LIMIT 1`
          );

          if (existing && (existing as any)[0]?.length > 0) {
            // 更新现有记录
            await (await requireDb()).execute(
              drizzleSql`UPDATE jiandaoyun_role_mappings 
                SET jdy_role_name = ${role.name},
                    jdy_group_no = ${role.group_no},
                    jdy_role_type = ${role.type || 0},
                    jdy_role_status = ${role.status || 1},
                    last_sync_at = NOW(),
                    sync_status = 'synced'
                WHERE jdy_role_no = ${role.role_no}`
            );
            result.updated++;
          } else {
            // 创建新记录
            await (await requireDb()).execute(
              drizzleSql`INSERT INTO jiandaoyun_role_mappings 
                (jdy_role_no, jdy_group_no, jdy_role_name, jdy_role_type, jdy_role_status, sync_status, last_sync_at)
                VALUES (${role.role_no}, ${role.group_no}, ${role.name}, ${role.type || 0}, ${role.status || 1}, 'synced', NOW())`
            );
            result.created++;
          }
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Failed to sync role ${role.name}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.errors.push(`Failed to fetch roles: ${error.message}`);
    }

    return result;
  }

  /**
   * 同步所有角色的成员到角色成员表
   */
  async syncRoleMembers(): Promise<RoleMemberSyncResult> {
    const result: RoleMemberSyncResult = {
      totalRoleMembers: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    try {
      // 获取所有角色
      const roles = await this.syncService.getRoles();

      for (const role of roles) {
        try {
          // 获取该角色的所有成员
          const members = await this.syncService.getRoleMembers(role.role_no);

          for (const member of members) {
            result.totalRoleMembers++;
            try {
              const existing = await (await requireDb()).execute(
                drizzleSql`SELECT id FROM jiandaoyun_role_members WHERE jdy_role_no = ${role.role_no} AND jdy_username = ${member.username} LIMIT 1`
              );

              if (existing && (existing as any)[0]?.length > 0) {
                await (await requireDb()).execute(
                  drizzleSql`UPDATE jiandaoyun_role_members
                    SET jdy_name = ${member.name},
                        jdy_departments_range = ${JSON.stringify(member.departments_range || [])},
                        jdy_has_child = ${member.has_child || false},
                        last_sync_at = NOW(),
                        sync_status = 'synced',
                        updated_at = NOW()
                    WHERE jdy_role_no = ${role.role_no} AND jdy_username = ${member.username}`
                );
                result.updated++;
              } else {
                await (await requireDb()).execute(
                  drizzleSql`INSERT INTO jiandaoyun_role_members
                    (jdy_role_no, jdy_username, jdy_name, jdy_departments_range, jdy_has_child, sync_status, last_sync_at)
                    VALUES (${role.role_no}, ${member.username}, ${member.name}, ${JSON.stringify(member.departments_range || [])}, ${member.has_child || false}, 'synced', NOW())`
                );
                result.created++;
              }
            } catch (error: any) {
              result.failed++;
              result.errors.push(`Failed to sync role member ${member.name} in role ${role.name}: ${error.message}`);
            }
          }
        } catch (error: any) {
          result.errors.push(`Failed to get members for role ${role.name}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.errors.push(`Failed to fetch roles: ${error.message}`);
    }

    return result;
  }

  /**
   * 获取角色成员映射列表
   */
  async getRoleMemberMappings(roleNo?: number): Promise<any[]> {
    if (roleNo) {
      const result = await (await requireDb()).execute(
        drizzleSql`SELECT * FROM jiandaoyun_role_members WHERE jdy_role_no = ${roleNo} ORDER BY jdy_name`
      );
      return (result as any)[0] || [];
    }
    const result = await (await requireDb()).execute(
      drizzleSql`SELECT * FROM jiandaoyun_role_members ORDER BY jdy_role_no, jdy_name`
    );
    return (result as any)[0] || [];
  }

  /**
   * 获取用户映射列表
   */
  async getUserMappings(): Promise<any[]> {
    const result = await (await requireDb()).execute(
      drizzleSql`SELECT * FROM jiandaoyun_user_mappings ORDER BY jdy_name`
    );
    return (result as any)[0] || [];
  }

  /**
   * 获取部门映射列表
   */
  async getDeptMappings(): Promise<any[]> {
    const result = await (await requireDb()).execute(
      drizzleSql`SELECT * FROM jiandaoyun_dept_mappings ORDER BY jdy_dept_name`
    );
    return (result as any)[0] || [];
  }

  /**
   * 获取角色映射列表
   */
  async getRoleMappings(): Promise<any[]> {
    const result = await (await requireDb()).execute(
      drizzleSql`SELECT * FROM jiandaoyun_role_mappings ORDER BY jdy_role_name`
    );
    return (result as any)[0] || [];
  }

  /**
   * 关联简道云用户与GRT用户
   */
  async linkUserToGrt(jdyUsername: string, grtUserId: number, grtOpenId?: string): Promise<boolean> {
    try {
      await (await requireDb()).execute(
        drizzleSql`UPDATE jiandaoyun_user_mappings 
          SET grt_user_id = ${grtUserId},
              grt_open_id = ${grtOpenId || null},
              sync_status = 'synced',
              updated_at = NOW()
          WHERE jdy_username = ${jdyUsername}`
      );
      return true;
    } catch (error) {
      console.error('Failed to link user:', error);
      return false;
    }
  }

  /**
   * 关联简道云角色与GRT权限角色
   */
  async linkRoleToGrt(jdyRoleNo: number, grtRoleId: string, grtRoleName: string, permissionMapping?: Record<string, any>): Promise<boolean> {
    try {
      await (await requireDb()).execute(
        drizzleSql`UPDATE jiandaoyun_role_mappings 
          SET grt_role_id = ${grtRoleId},
              grt_role_name = ${grtRoleName},
              permission_mapping = ${permissionMapping ? JSON.stringify(permissionMapping) : null},
              sync_status = 'synced',
              updated_at = NOW()
          WHERE jdy_role_no = ${jdyRoleNo}`
      );
      return true;
    } catch (error) {
      console.error('Failed to link role:', error);
      return false;
    }
  }
}

// 单例实例
let userSyncServiceInstance: JiandaoyunUserSyncService | null = null;

export function getJiandaoyunUserSyncService(): JiandaoyunUserSyncService {
  if (!userSyncServiceInstance) {
    userSyncServiceInstance = new JiandaoyunUserSyncService();
  }
  return userSyncServiceInstance;
}
