/**
 * 简道云API服务模块
 * 用于与简道云开放平台API交互
 * 
 * API文档: https://hc.jiandaoyun.com/open/
 */

import { env } from "../_core/env";

// 简道云API基础URL
const JIANDAOYUN_API_BASE = "https://api.jiandaoyun.com/api/v5";

// API请求头
function getHeaders() {
  return {
    "Authorization": `Bearer ${env.JIANDAOYUN_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// 通用API请求函数
async function apiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${JIANDAOYUN_API_BASE}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: getHeaders(),
  };
  
  if (body && method === "POST") {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`简道云API错误 (${response.status}): ${errorText}`);
  }
  
  return response.json();
}

// ============ 组织架构相关接口 ============

/**
 * 部门信息
 */
export interface JDYDepartment {
  dept_no: string;
  name: string;
  parent_no: string;
  order: number;
  integration_id?: string;
}

/**
 * 成员信息
 */
export interface JDYMember {
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
export async function getDepartments(): Promise<JDYDepartment[]> {
  const corpId = env.JIANDAOYUN_CORP_ID;
  const response = await apiRequest<{ departments: JDYDepartment[] }>(
    `/corp/${corpId}/departments`
  );
  return response.departments || [];
}

/**
 * 获取成员列表
 * @param deptNo 部门编号，不传则获取所有成员
 */
export async function getMembers(deptNo?: string): Promise<JDYMember[]> {
  const corpId = env.JIANDAOYUN_CORP_ID;
  let endpoint = `/corp/${corpId}/members`;
  if (deptNo) {
    endpoint += `?dept_no=${deptNo}`;
  }
  const response = await apiRequest<{ members: JDYMember[] }>(endpoint);
  return response.members || [];
}

/**
 * 获取单个成员信息
 */
export async function getMember(memberId: string): Promise<JDYMember | null> {
  const corpId = env.JIANDAOYUN_CORP_ID;
  try {
    const response = await apiRequest<{ member: JDYMember }>(
      `/corp/${corpId}/member/${memberId}`
    );
    return response.member;
  } catch (error) {
    console.error(`获取成员 ${memberId} 失败:`, error);
    return null;
  }
}

// ============ 表单相关接口 ============

/**
 * 应用信息
 */
export interface JDYApp {
  _id: string;
  name: string;
  description?: string;
  is_archived: boolean;
}

/**
 * 表单信息
 */
export interface JDYForm {
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
export interface JDYFormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

/**
 * 获取应用列表
 */
export async function getApps(): Promise<JDYApp[]> {
  const corpId = env.JIANDAOYUN_CORP_ID;
  const response = await apiRequest<{ apps: JDYApp[] }>(
    `/corp/${corpId}/apps`
  );
  return response.apps || [];
}

/**
 * 获取应用下的表单列表
 */
export async function getForms(appId: string): Promise<JDYForm[]> {
  const response = await apiRequest<{ forms: JDYForm[] }>(
    `/app/${appId}/entry/forms`
  );
  return response.forms || [];
}

/**
 * 获取表单字段定义
 */
export async function getFormFields(appId: string, formId: string): Promise<JDYFormField[]> {
  const response = await apiRequest<{ fields: JDYFormField[] }>(
    `/app/${appId}/entry/${formId}/widgets`
  );
  return response.fields || [];
}

/**
 * 表单数据记录
 */
export interface JDYFormData {
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
): Promise<JDYFormData[]> {
  const body: Record<string, unknown> = {
    limit,
  };
  
  if (filter) {
    body.filter = filter;
  }
  
  const response = await apiRequest<{ data: JDYFormData[] }>(
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
    const corpId = env.JIANDAOYUN_CORP_ID;
    
    // 尝试获取部门列表来验证连接
    const departments = await getDepartments();
    
    return {
      success: true,
      message: "简道云API连接成功",
      corpInfo: {
        corpId,
        departmentCount: departments.length,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `简道云API连接失败: ${errorMessage}`,
    };
  }
}

// ============ 数据同步 ============

/**
 * 同步组织架构到本地数据库
 */
export async function syncOrganization(): Promise<{
  departments: JDYDepartment[];
  members: JDYMember[];
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
export const jiandaoyunService = {
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
