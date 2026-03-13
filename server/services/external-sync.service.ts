/**
 * 外部平台API服务模块
 * 用于与外部平台开放平台API交互
 *
 * API文档: https://hc.jiandaoyun.com/open/
 */

import { env } from "../_core/env";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("external-sync-svc");

// 外部平台API基础URL
const EXTERNAL_SYNC_API_BASE = "https://api.jiandaoyun.com/api/v5";

// API请求头
function getHeaders() {
  return {
    "Authorization": `Bearer ${env.EXT_SYNC_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// ── Rate limiter (token bucket: max 10 req/s) ──
let lastRequestTs = 0;
const MIN_INTERVAL_MS = 100; // 10 req/s

async function rateLimitWait(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTs;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTs = Date.now();
}

// 通用API请求函数 (with exponential backoff + rate limiting)
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

async function apiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${EXTERNAL_SYNC_API_BASE}${endpoint}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await rateLimitWait();

    const options: RequestInit = {
      method,
      headers: getHeaders(),
    };

    if (body && method === "POST") {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (response.status === 429 || response.status >= 500) {
        // Retryable — rate limit or server error
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          log.warn({ endpoint, status: response.status, attempt, delayMs: delay }, "External sync API retrying");
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`外部平台API错误 (${response.status}): ${errorText}`);
      }

      return response.json();
    } catch (err: any) {
      if (attempt < MAX_RETRIES && (err.code === "ECONNRESET" || err.code === "ETIMEDOUT" || err.code === "ENOTFOUND")) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        log.warn({ endpoint, err: err.message, attempt, delayMs: delay }, "External sync API network error, retrying");
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw new Error(`外部平台API请求失败: ${endpoint} (${MAX_RETRIES} retries exhausted)`);
}

// ============ 组织架构相关接口 ============

/**
 * 部门信息
 */
export interface ExtSyncDepartment {
  dept_no: string;
  name: string;
  parent_no: string;
  order: number;
  integration_id?: string;
}

/**
 * 成员信息
 */
export interface ExtSyncMember {
  _id: string;
  username: string;
  name: string;
  status: number;
  type: number;
  departments: string[];
  integrate_id?: string;
  email?: string;
  phone?: string;
}

/**
 * 获取部门列表
 */
export async function getDepartments(): Promise<ExtSyncDepartment[]> {
  const corpId = env.EXT_SYNC_CORP_ID;
  const response = await apiRequest<{ departments: ExtSyncDepartment[] }>(
    `/corp/${corpId}/departments`
  );
  return response.departments || [];
}

/**
 * 获取成员列表
 * @param deptNo 部门编号，不传则获取所有成员
 */
export async function getMembers(deptNo?: string): Promise<ExtSyncMember[]> {
  const corpId = env.EXT_SYNC_CORP_ID;
  let endpoint = `/corp/${corpId}/members`;
  if (deptNo) {
    endpoint += `?dept_no=${deptNo}`;
  }
  const response = await apiRequest<{ members: ExtSyncMember[] }>(endpoint);
  return response.members || [];
}

/**
 * 获取单个成员信息
 */
export async function getMember(memberId: string): Promise<ExtSyncMember | null> {
  const corpId = env.EXT_SYNC_CORP_ID;
  try {
    const response = await apiRequest<{ member: ExtSyncMember }>(
      `/corp/${corpId}/member/${memberId}`
    );
    return response.member;
  } catch (error) {
    log.error({ err: error, memberId }, "Failed to get member");
    return null;
  }
}

// ============ 表单相关接口 ============

/**
 * 应用信息
 */
export interface ExtSyncApp {
  _id: string;
  name: string;
  description?: string;
  is_archived: boolean;
}

/**
 * 表单信息
 */
export interface ExtSyncForm {
  _id: string;
  name: string;
  app_id: string;
  status: string;
  create_time: string;
  update_time: string;
}

/**
 * 表单字段
 */
export interface ExtSyncFormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

/**
 * 获取应用列表
 */
export async function getApps(): Promise<ExtSyncApp[]> {
  const corpId = env.EXT_SYNC_CORP_ID;
  const response = await apiRequest<{ apps: ExtSyncApp[] }>(
    `/corp/${corpId}/apps`
  );
  return response.apps || [];
}

/**
 * 获取应用下的表单列表
 */
export async function getForms(appId: string): Promise<ExtSyncForm[]> {
  const response = await apiRequest<{ forms: ExtSyncForm[] }>(
    `/app/${appId}/entry/forms`
  );
  return response.forms || [];
}

/**
 * 获取表单字段定义
 */
export async function getFormFields(appId: string, formId: string): Promise<ExtSyncFormField[]> {
  const response = await apiRequest<{ fields: ExtSyncFormField[] }>(
    `/app/${appId}/entry/${formId}/widgets`
  );
  return response.fields || [];
}

/**
 * 表单数据记录
 */
export interface ExtSyncFormData {
  _id: string;
  creator: string;
  createTime: string;
  updateTime: string;
  [key: string]: unknown;
}

/**
 * 查询表单数据
 * @param appId 应用ID
 * @param formId 表单ID
 * @param filter 过滤条件
 * @param limit 返回数量限制
 */
export async function queryFormData(
  appId: string,
  formId: string,
  filter?: Record<string, unknown>,
  limit: number = 100
): Promise<ExtSyncFormData[]> {
  const body: Record<string, unknown> = {
    limit,
  };
  
  if (filter) {
    body.filter = filter;
  }
  
  const response = await apiRequest<{ data: ExtSyncFormData[] }>(
    `/app/${appId}/entry/${formId}/data`,
    "POST",
    body
  );
  
  return response.data || [];
}

// ============ 连接测试 ============

/**
 * 测试API连接
 * 返回企业基本信息以验证凭证有效性
 */
export async function testConnection(): Promise<{
  success: boolean;
  message: string;
  corpInfo?: {
    corpId: string;
    departmentCount?: number;
    memberCount?: number;
  };
}> {
  try {
    const corpId = env.EXT_SYNC_CORP_ID;
    
    // 尝试获取部门列表来验证连接
    const departments = await getDepartments();
    
    return {
      success: true,
      message: "外部平台API连接成功",
      corpInfo: {
        corpId,
        departmentCount: departments.length,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `外部平台API连接失败: ${errorMessage}`,
    };
  }
}

// ============ 数据同步 ============

/**
 * 同步组织架构到本地数据库
 */
export async function syncOrganization(): Promise<{
  departments: ExtSyncDepartment[];
  members: ExtSyncMember[];
  syncedAt: Date;
}> {
  const departments = await getDepartments();
  const members = await getMembers();
  
  return {
    departments,
    members,
    syncedAt: new Date(),
  };
}

/**
 * 导出服务
 */
export const externalSyncService = {
  testConnection,
  getDepartments,
  getMembers,
  getMember,
  getApps,
  getForms,
  getFormFields,
  queryFormData,
  syncOrganization,
};
