/**
 * BU事业部与简道云部门映射服务
 * 管理BU与简道云部门的对应关系，支持按BU获取人员名单
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// BU代码类型
export type BUCode = 'BU1' | 'BU2' | 'BU3' | 'BU4' | 'BU5';

// 角色类型
export type RoleType = 'Sales' | 'Mech' | 'Elec' | 'Procurement' | 'Assembly' | 'Debug' | 'Delivery' | 'CS';

// BU部门映射记录
export interface BUDepartmentMapping {
  id: number;
  buCode: BUCode;
  jdyDeptNo: number;
  jdyDeptName: string | null;
  roleType: RoleType | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// BU信息
export interface BUInfo {
  code: BUCode;
  name: string;
  description: string;
}

// 默认BU定义
export const DEFAULT_BUS: BUInfo[] = [
  { code: 'BU1', name: 'BU1 - 海外事业部', description: '负责海外市场的清洗设备业务' },
  { code: 'BU2', name: 'BU2 - 商用车事业部', description: '专注于商用车行业的清洗设备业务' },
  { code: 'BU3', name: 'BU3 - 乘用车事业部', description: '专注于乘用车行业的清洗设备业务' },
  { code: 'BU4', name: 'BU4 - 半导体事业部', description: '专注于半导体行业的清洗设备业务' },
  { code: 'BU5', name: 'BU5 - 工业通用事业部', description: '通用工业清洗设备业务' },
];

// 默认BU部门关键词映射（用于自动匹配）
export const BU_KEYWORDS: Record<BUCode, string[]> = {
  'BU1': ['海外', 'overseas', 'international', '出口', 'export'],
  'BU2': ['商用车', '商用', 'commercial', '卡车', 'truck'],
  'BU3': ['乘用车', '乘用', 'passenger', '轿车', 'car'],
  'BU4': ['半导体', 'semiconductor', '芯片', 'chip', '晶圆', 'wafer'],
  'BU5': ['工业通用', '通用', 'general', 'industrial', '工业'],
};

/**
 * 获取所有BU部门映射
 */
export async function getAllMappings(): Promise<BUDepartmentMapping[]> {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT 
      id,
      bu_code as buCode,
      jdy_dept_no as jdyDeptNo,
      jdy_dept_name as jdyDeptName,
      role_type as roleType,
      is_active as isActive,
      created_at as createdAt,
      updated_at as updatedAt
    FROM bu_department_mappings
    ORDER BY bu_code, role_type
  `);
  return (result[0] as any[]).map(row => ({
    ...row,
    isActive: Boolean(row.isActive),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }));
}

/**
 * 获取指定BU的部门映射
 */
export async function getMappingsByBU(buCode: BUCode): Promise<BUDepartmentMapping[]> {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT 
      id,
      bu_code as buCode,
      jdy_dept_no as jdyDeptNo,
      jdy_dept_name as jdyDeptName,
      role_type as roleType,
      is_active as isActive,
      created_at as createdAt,
      updated_at as updatedAt
    FROM bu_department_mappings
    WHERE bu_code = ${buCode} AND is_active = 1
    ORDER BY role_type
  `);
  return (result[0] as any[]).map(row => ({
    ...row,
    isActive: Boolean(row.isActive),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }));
}

/**
 * 创建BU部门映射
 */
export async function createMapping(data: {
  buCode: BUCode;
  jdyDeptNo: number;
  jdyDeptName?: string;
  roleType?: RoleType;
}): Promise<number> {
  const db = await requireDb();
  const result = await db.execute(sql`
    INSERT INTO bu_department_mappings (bu_code, jdy_dept_no, jdy_dept_name, role_type)
    VALUES (${data.buCode}, ${data.jdyDeptNo}, ${data.jdyDeptName || null}, ${data.roleType || null})
    ON DUPLICATE KEY UPDATE
      jdy_dept_name = VALUES(jdy_dept_name),
      role_type = VALUES(role_type),
      is_active = 1
  `);
  return (result[0] as any).insertId || 0;
}

/**
 * 批量创建BU部门映射
 */
export async function batchCreateMappings(mappings: Array<{
  buCode: BUCode;
  jdyDeptNo: number;
  jdyDeptName?: string;
  roleType?: RoleType;
}>): Promise<{ created: number; updated: number }> {
  const db = await requireDb();
  let created = 0;
  let updated = 0;
  
  for (const mapping of mappings) {
    const result = await db.execute(sql`
      INSERT INTO bu_department_mappings (bu_code, jdy_dept_no, jdy_dept_name, role_type)
      VALUES (${mapping.buCode}, ${mapping.jdyDeptNo}, ${mapping.jdyDeptName || null}, ${mapping.roleType || null})
      ON DUPLICATE KEY UPDATE
        jdy_dept_name = VALUES(jdy_dept_name),
        role_type = VALUES(role_type),
        is_active = 1
    `);
    const affectedRows = (result[0] as any).affectedRows || 0;
    if (affectedRows === 1) {
      created++;
    } else if (affectedRows === 2) {
      updated++;
    }
  }
  
  return { created, updated };
}

/**
 * 更新BU部门映射
 */
export async function updateMapping(id: number, data: {
  buCode?: BUCode;
  jdyDeptNo?: number;
  jdyDeptName?: string;
  roleType?: RoleType;
  isActive?: boolean;
}): Promise<boolean> {
  const db = await requireDb();
  const updates: string[] = [];
  
  if (data.buCode !== undefined) {
    updates.push(`bu_code = '${data.buCode}'`);
  }
  if (data.jdyDeptNo !== undefined) {
    updates.push(`jdy_dept_no = ${data.jdyDeptNo}`);
  }
  if (data.jdyDeptName !== undefined) {
    updates.push(`jdy_dept_name = '${data.jdyDeptName}'`);
  }
  if (data.roleType !== undefined) {
    updates.push(`role_type = '${data.roleType}'`);
  }
  if (data.isActive !== undefined) {
    updates.push(`is_active = ${data.isActive ? 1 : 0}`);
  }
  
  if (updates.length === 0) return false;
  
  const result = await db.execute(sql.raw(`
    UPDATE bu_department_mappings 
    SET ${updates.join(', ')}
    WHERE id = ${id}
  `));
  
  return (result[0] as any).affectedRows > 0;
}

/**
 * 删除BU部门映射
 */
export async function deleteMapping(id: number): Promise<boolean> {
  const db = await requireDb();
  const result = await db.execute(sql`
    DELETE FROM bu_department_mappings WHERE id = ${id}
  `);
  return (result[0] as any).affectedRows > 0;
}

/**
 * 根据简道云部门名称自动匹配BU
 */
export function matchBUByDeptName(deptName: string): BUCode | null {
  const lowerName = deptName.toLowerCase();
  
  for (const [buCode, keywords] of Object.entries(BU_KEYWORDS)) {
    if (keywords.some(kw => lowerName.includes(kw.toLowerCase()))) {
      return buCode as BUCode;
    }
  }
  
  return null;
}

/**
 * 获取BU统计信息
 */
export async function getBUStats(): Promise<Array<{
  buCode: BUCode;
  buName: string;
  deptCount: number;
  roleCount: number;
}>> {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT 
      bu_code as buCode,
      COUNT(DISTINCT jdy_dept_no) as deptCount,
      COUNT(DISTINCT role_type) as roleCount
    FROM bu_department_mappings
    WHERE is_active = 1
    GROUP BY bu_code
    ORDER BY bu_code
  `);
  
  const stats = (result[0] as any[]);
  
  return DEFAULT_BUS.map(bu => {
    const stat = stats.find(s => s.buCode === bu.code);
    return {
      buCode: bu.code,
      buName: bu.name,
      deptCount: stat?.deptCount || 0,
      roleCount: stat?.roleCount || 0,
    };
  });
}

/**
 * 导出服务
 */
export const buMappingService = {
  getAllMappings,
  getMappingsByBU,
  createMapping,
  batchCreateMappings,
  updateMapping,
  deleteMapping,
  matchBUByDeptName,
  getBUStats,
  DEFAULT_BUS,
  BU_KEYWORDS,
};


// ==================== BU负责人管理 ====================

export interface BULeader {
  id: number;
  buCode: BUCode;
  roleType: RoleType;
  leaderName: string;
  leaderUserId: string | null;
  leaderEmail: string | null;
  leaderPhone: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 获取所有BU负责人
 */
export async function getAllLeaders(): Promise<BULeader[]> {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM bu_leaders WHERE is_active = 1 ORDER BY bu_code, role_type
  `);
  
  const rows = result[0] as any[];
  return rows.map(row => ({
    id: row.id,
    buCode: row.bu_code,
    roleType: row.role_type,
    leaderName: row.leader_name,
    leaderUserId: row.leader_user_id,
    leaderEmail: row.leader_email,
    leaderPhone: row.leader_phone,
    isPrimary: row.is_primary === 1,
    isActive: row.is_active === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

/**
 * 获取指定BU的负责人
 */
export async function getLeadersByBU(buCode: BUCode): Promise<BULeader[]> {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM bu_leaders WHERE bu_code = ${buCode} AND is_active = 1 ORDER BY role_type
  `);
  
  const rows = result[0] as any[];
  return rows.map(row => ({
    id: row.id,
    buCode: row.bu_code,
    roleType: row.role_type,
    leaderName: row.leader_name,
    leaderUserId: row.leader_user_id,
    leaderEmail: row.leader_email,
    leaderPhone: row.leader_phone,
    isPrimary: row.is_primary === 1,
    isActive: row.is_active === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

/**
 * 设置BU负责人
 */
export async function setLeader(data: {
  buCode: BUCode;
  roleType: RoleType;
  leaderName: string;
  leaderUserId?: string;
  leaderEmail?: string;
  leaderPhone?: string;
  isPrimary?: boolean;
}): Promise<number> {
  const db = await requireDb();
  const isPrimary = data.isPrimary !== false;
  
  // 如果是主负责人，先将现有的主负责人设为非主
  if (isPrimary) {
    await db.execute(sql`
      UPDATE bu_leaders SET is_primary = 0 
      WHERE bu_code = ${data.buCode} AND role_type = ${data.roleType} AND is_primary = 1
    `);
  }
  
  const result = await db.execute(sql`
    INSERT INTO bu_leaders (bu_code, role_type, leader_name, leader_user_id, leader_email, leader_phone, is_primary)
    VALUES (${data.buCode}, ${data.roleType}, ${data.leaderName}, ${data.leaderUserId || null}, ${data.leaderEmail || null}, ${data.leaderPhone || null}, ${isPrimary ? 1 : 0})
    ON DUPLICATE KEY UPDATE
      leader_name = VALUES(leader_name),
      leader_user_id = VALUES(leader_user_id),
      leader_email = VALUES(leader_email),
      leader_phone = VALUES(leader_phone),
      is_active = 1
  `);
  
  return (result[0] as any).insertId || 0;
}

/**
 * 删除BU负责人
 */
export async function deleteLeader(id: number): Promise<boolean> {
  const db = await requireDb();
  const result = await db.execute(sql`
    UPDATE bu_leaders SET is_active = 0 WHERE id = ${id}
  `);
  return (result[0] as any).affectedRows > 0;
}

// ==================== BU绩效统计 ====================

export interface BUPerformanceStats {
  id: number;
  buCode: BUCode;
  statPeriod: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  projectCount: number;
  activeProjectCount: number;
  completedProjectCount: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossMargin: number;
  teamSize: number;
  utilizationRate: number;
  onTimeDeliveryRate: number;
  customerSatisfaction: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 获取BU绩效统计
 */
export async function getPerformanceStats(params: {
  buCode?: BUCode;
  periodType?: 'monthly' | 'quarterly' | 'yearly';
  period?: string;
}): Promise<BUPerformanceStats[]> {
  const db = await requireDb();
  
  let whereClause = '1=1';
  if (params.buCode) {
    whereClause += ` AND bu_code = '${params.buCode}'`;
  }
  if (params.periodType) {
    whereClause += ` AND period_type = '${params.periodType}'`;
  }
  if (params.period) {
    whereClause += ` AND stat_period = '${params.period}'`;
  }
  
  const result = await db.execute(sql.raw(`
    SELECT * FROM bu_performance_stats WHERE ${whereClause} ORDER BY stat_period DESC, bu_code
  `));
  
  const rows = result[0] as any[];
  return rows.map(row => ({
    id: row.id,
    buCode: row.bu_code,
    statPeriod: row.stat_period,
    periodType: row.period_type,
    projectCount: row.project_count,
    activeProjectCount: row.active_project_count,
    completedProjectCount: row.completed_project_count,
    totalRevenue: parseFloat(row.total_revenue) || 0,
    totalCost: parseFloat(row.total_cost) || 0,
    grossProfit: parseFloat(row.gross_profit) || 0,
    grossMargin: parseFloat(row.gross_margin) || 0,
    teamSize: row.team_size,
    utilizationRate: parseFloat(row.utilization_rate) || 0,
    onTimeDeliveryRate: parseFloat(row.on_time_delivery_rate) || 0,
    customerSatisfaction: parseFloat(row.customer_satisfaction) || 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

/**
 * 更新BU绩效统计
 */
export async function updatePerformanceStats(data: {
  buCode: BUCode;
  statPeriod: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  projectCount?: number;
  activeProjectCount?: number;
  completedProjectCount?: number;
  totalRevenue?: number;
  totalCost?: number;
  grossProfit?: number;
  grossMargin?: number;
  teamSize?: number;
  utilizationRate?: number;
  onTimeDeliveryRate?: number;
  customerSatisfaction?: number;
}): Promise<number> {
  const db = await requireDb();
  
  const result = await db.execute(sql`
    INSERT INTO bu_performance_stats (
      bu_code, stat_period, period_type, 
      project_count, active_project_count, completed_project_count,
      total_revenue, total_cost, gross_profit, gross_margin,
      team_size, utilization_rate, on_time_delivery_rate, customer_satisfaction
    ) VALUES (
      ${data.buCode}, ${data.statPeriod}, ${data.periodType},
      ${data.projectCount || 0}, ${data.activeProjectCount || 0}, ${data.completedProjectCount || 0},
      ${data.totalRevenue || 0}, ${data.totalCost || 0}, ${data.grossProfit || 0}, ${data.grossMargin || 0},
      ${data.teamSize || 0}, ${data.utilizationRate || 0}, ${data.onTimeDeliveryRate || 0}, ${data.customerSatisfaction || 0}
    )
    ON DUPLICATE KEY UPDATE
      project_count = VALUES(project_count),
      active_project_count = VALUES(active_project_count),
      completed_project_count = VALUES(completed_project_count),
      total_revenue = VALUES(total_revenue),
      total_cost = VALUES(total_cost),
      gross_profit = VALUES(gross_profit),
      gross_margin = VALUES(gross_margin),
      team_size = VALUES(team_size),
      utilization_rate = VALUES(utilization_rate),
      on_time_delivery_rate = VALUES(on_time_delivery_rate),
      customer_satisfaction = VALUES(customer_satisfaction)
  `);
  
  return (result[0] as any).insertId || 0;
}

/**
 * 初始化示例绩效数据
 */
export async function initSamplePerformanceData(): Promise<{ created: number }> {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const period = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  
  const sampleData = [
    { buCode: 'BU1' as BUCode, projectCount: 8, activeProjectCount: 5, completedProjectCount: 3, totalRevenue: 1250, totalCost: 875, teamSize: 12, utilizationRate: 78, onTimeDeliveryRate: 92, customerSatisfaction: 4.5 },
    { buCode: 'BU2' as BUCode, projectCount: 12, activeProjectCount: 8, completedProjectCount: 4, totalRevenue: 1850, totalCost: 1295, teamSize: 18, utilizationRate: 82, onTimeDeliveryRate: 88, customerSatisfaction: 4.3 },
    { buCode: 'BU3' as BUCode, projectCount: 15, activeProjectCount: 10, completedProjectCount: 5, totalRevenue: 2200, totalCost: 1540, teamSize: 22, utilizationRate: 85, onTimeDeliveryRate: 90, customerSatisfaction: 4.6 },
    { buCode: 'BU4' as BUCode, projectCount: 6, activeProjectCount: 4, completedProjectCount: 2, totalRevenue: 980, totalCost: 686, teamSize: 10, utilizationRate: 75, onTimeDeliveryRate: 95, customerSatisfaction: 4.8 },
    { buCode: 'BU5' as BUCode, projectCount: 10, activeProjectCount: 6, completedProjectCount: 4, totalRevenue: 1500, totalCost: 1050, teamSize: 15, utilizationRate: 80, onTimeDeliveryRate: 85, customerSatisfaction: 4.2 },
  ];
  
  let created = 0;
  for (const data of sampleData) {
    const grossProfit = data.totalRevenue - data.totalCost;
    const grossMargin = (grossProfit / data.totalRevenue) * 100;
    
    await updatePerformanceStats({
      ...data,
      statPeriod: period,
      periodType: 'monthly',
      grossProfit,
      grossMargin,
    });
    created++;
  }
  
  return { created };
}
