/**
 * Worker management, work hour alerts, user favorites
 * Auto-decomposed from server/db.ts
 */
import { sql, type SQL } from "drizzle-orm";
import { requireDb } from "./connection";

// ==================== 工人管理数据库函数 ====================

export interface Worker {
  id: number;
  employeeCode: string | null;
  name: string;
  department: string;
  position: string;
  skillLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  status: 'Active' | 'Inactive' | 'OnLeave';
  phone: string | null;
  email: string | null;
  joinDate: string | null;
  leaveDate: string | null;
  uwbTagId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerEfficiencyRecord {
  id: number;
  workerId: number;
  recordDate: string;
  tasksAssigned: number;
  tasksCompleted: number;
  standardHours: string;
  actualHours: string;
  efficiency: string;
  qualityScore: string;
  defectCount: number;
  reworkCount: number;
  notes: string | null;
  createdAt: string;
}

export interface WorkHourAlert {
  id: number;
  workerId: number;
  alertType: 'overtime' | 'undertime' | 'continuous_work' | 'low_efficiency' | 'quality_issue';
  alertLevel: 'info' | 'warning' | 'critical';
  message: string;
  details: string | null;
  status: 'Pending' | 'Acknowledged' | 'Resolved' | 'Ignored';
  acknowledgedBy: number | null;
  acknowledgedAt: string | null;
  resolvedBy: number | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
}

export interface UserFavorite {
  id: number;
  userId: number;
  menuPath: string;
  menuName: string;
  menuNameEn: string | null;
  sortOrder: number;
  createdAt: string;
}

/**
 * 获取工人列表
 */
export async function getWorkers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  department?: string;
  status?: string;
  skillLevel?: string;
}): Promise<{ workers: Worker[]; total: number }> {
  const db = await requireDb();
  if (!db) return { workers: [], total: 0 };
  const { page = 1, pageSize = 20, search, department, status, skillLevel } = params;
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [sql`1=1`];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(sql`(name LIKE ${pattern} OR employee_code LIKE ${pattern} OR phone LIKE ${pattern})`);
  }
  if (department) {
    conditions.push(sql`department = ${department}`);
  }
  if (status) {
    conditions.push(sql`status = ${status}`);
  }
  if (skillLevel) {
    conditions.push(sql`skill_level = ${skillLevel}`);
  }

  const where = sql.join(conditions, sql` AND `);

  // 获取总数
  const countResult = await db.execute(
    sql`SELECT COUNT(*) as total FROM workers WHERE ${where}`
  );
  const total = (countResult as any)[0]?.[0]?.total || 0;

  // 获取列表
  const result = await db.execute(
    sql`SELECT * FROM workers WHERE ${where} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`
  );
  
  const workers = (result[0] as any[]).map(row => ({
    id: row.id,
    employeeCode: row.employee_code,
    name: row.name,
    department: row.department,
    position: row.position,
    skillLevel: row.skill_level,
    status: row.status,
    phone: row.phone,
    email: row.email,
    joinDate: row.join_date,
    leaveDate: row.leave_date,
    uwbTagId: row.uwb_tag_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  
  return { workers, total };
}

/**
 * 获取单个工人
 */
export async function getWorkerById(id: number): Promise<Worker | null> {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.execute(
    sql`SELECT * FROM workers WHERE id = ${id}`
  );
  const rows = result[0] as any[];
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    employeeCode: row.employee_code,
    name: row.name,
    department: row.department,
    position: row.position,
    skillLevel: row.skill_level,
    status: row.status,
    phone: row.phone,
    email: row.email,
    joinDate: row.join_date,
    leaveDate: row.leave_date,
    uwbTagId: row.uwb_tag_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 创建工人
 */
export async function createWorker(data: {
  employeeCode?: string;
  name: string;
  department: string;
  position: string;
  skillLevel?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  status?: 'Active' | 'Inactive' | 'OnLeave';
  phone?: string;
  email?: string;
  joinDate?: string;
  uwbTagId?: string;
}): Promise<Worker> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  const result = await db.execute(
    sql`INSERT INTO workers (employee_code, name, department, position, skill_level, status, phone, email, join_date, uwb_tag_id)
        VALUES (${data.employeeCode || null}, ${data.name}, ${data.department}, ${data.position}, 
                ${data.skillLevel || 'L2'}, ${data.status || 'Active'}, ${data.phone || null}, 
                ${data.email || null}, ${data.joinDate || null}, ${data.uwbTagId || null})`
  );
  
  const insertId = (result[0] as any).insertId;
  return (await getWorkerById(insertId))!;
}

/**
 * 更新工人
 */
export async function updateWorker(id: number, data: Partial<{
  employeeCode: string;
  name: string;
  department: string;
  position: string;
  skillLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  status: 'Active' | 'Inactive' | 'OnLeave';
  phone: string;
  email: string;
  joinDate: string;
  leaveDate: string;
  uwbTagId: string;
}>): Promise<Worker | null> {
  const setParts: SQL[] = [];

  if (data.employeeCode !== undefined) { setParts.push(sql`employee_code = ${data.employeeCode}`); }
  if (data.name !== undefined) { setParts.push(sql`name = ${data.name}`); }
  if (data.department !== undefined) { setParts.push(sql`department = ${data.department}`); }
  if (data.position !== undefined) { setParts.push(sql`position = ${data.position}`); }
  if (data.skillLevel !== undefined) { setParts.push(sql`skill_level = ${data.skillLevel}`); }
  if (data.status !== undefined) { setParts.push(sql`status = ${data.status}`); }
  if (data.phone !== undefined) { setParts.push(sql`phone = ${data.phone}`); }
  if (data.email !== undefined) { setParts.push(sql`email = ${data.email}`); }
  if (data.joinDate !== undefined) { setParts.push(sql`join_date = ${data.joinDate}`); }
  if (data.leaveDate !== undefined) { setParts.push(sql`leave_date = ${data.leaveDate}`); }
  if (data.uwbTagId !== undefined) { setParts.push(sql`uwb_tag_id = ${data.uwbTagId}`); }

  if (setParts.length === 0) return await getWorkerById(id);

  const db = await requireDb();
  if (!db) return null;
  await db.execute(
    sql`UPDATE workers SET ${sql.join(setParts, sql`, `)} WHERE id = ${id}`
  );
  
  return await getWorkerById(id);
}

/**
 * 删除工人
 */
export async function deleteWorker(id: number): Promise<boolean> {
  const db = await requireDb();
  if (!db) return false;
  const result = await db.execute(
    sql`DELETE FROM workers WHERE id = ${id}`
  );
  return (result[0] as any).affectedRows > 0;
}

/**
 * 获取工人效率排名
 */
export async function getWorkerRanking(params: {
  page?: number;
  pageSize?: number;
  department?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ rankings: any[]; total: number }> {
  const { page = 1, pageSize = 20, department, startDate, endDate } = params;
  const offset = (page - 1) * pageSize;
  
  const conditions: SQL[] = [sql`1=1`];

  if (department) {
    conditions.push(sql`w.department = ${department}`);
  }
  if (startDate) {
    conditions.push(sql`e.record_date >= ${startDate}`);
  }
  if (endDate) {
    conditions.push(sql`e.record_date <= ${endDate}`);
  }

  const where = sql.join(conditions, sql` AND `);

  const db = await requireDb();
  if (!db) return { rankings: [], total: 0 };

  const countResult = await db.execute(sql`
    SELECT COUNT(DISTINCT w.id) as total
    FROM workers w
    LEFT JOIN worker_efficiency_records e ON w.id = e.worker_id
    WHERE ${where}
  `);
  const total = (countResult[0] as any[])[0]?.total || 0;

  const result = await db.execute(sql`
    SELECT
      w.id,
      w.name,
      w.department,
      w.position,
      w.skill_level as skillLevel,
      COALESCE(AVG(e.efficiency), 100) as avgEfficiency,
      COALESCE(AVG(e.quality_score), 100) as avgQualityScore,
      COALESCE(SUM(e.tasks_completed), 0) as totalTasksCompleted,
      COALESCE(SUM(e.actual_hours), 0) as totalHours
    FROM workers w
    LEFT JOIN worker_efficiency_records e ON w.id = e.worker_id
    WHERE ${where}
    GROUP BY w.id, w.name, w.department, w.position, w.skill_level
    ORDER BY avgEfficiency DESC, avgQualityScore DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `);
  const rankings = (result[0] as any[]).map((row, index) => ({
    rank: offset + index + 1,
    id: row.id,
    name: row.name,
    department: row.department,
    position: row.position,
    skillLevel: row.skillLevel,
    avgEfficiency: parseFloat(row.avgEfficiency) || 100,
    avgQualityScore: parseFloat(row.avgQualityScore) || 100,
    totalTasksCompleted: parseInt(row.totalTasksCompleted) || 0,
    totalHours: parseFloat(row.totalHours) || 0,
  }));
  
  return { rankings, total };
}

/**
 * 获取工时预警列表
 */
export async function getWorkHourAlerts(params: {
  page?: number;
  pageSize?: number;
  workerId?: number;
  alertType?: string;
  alertLevel?: string;
  status?: string;
}): Promise<{ alerts: (WorkHourAlert & { workerName?: string })[]; total: number }> {
  const { page = 1, pageSize = 20, workerId, alertType, alertLevel, status } = params;
  const offset = (page - 1) * pageSize;
  
  const conditions: SQL[] = [sql`1=1`];

  if (workerId) {
    conditions.push(sql`a.worker_id = ${workerId}`);
  }
  if (alertType) {
    conditions.push(sql`a.alert_type = ${alertType}`);
  }
  if (alertLevel) {
    conditions.push(sql`a.alert_level = ${alertLevel}`);
  }
  if (status) {
    conditions.push(sql`a.status = ${status}`);
  }

  const where = sql.join(conditions, sql` AND `);

  const db = await requireDb();
  if (!db) return { alerts: [], total: 0 };

  const countResult = await db.execute(
    sql`SELECT COUNT(*) as total FROM work_hour_alerts a WHERE ${where}`
  );
  const total = (countResult[0] as any[])[0]?.total || 0;

  const result = await db.execute(
    sql`
      SELECT a.*, w.name as worker_name
      FROM work_hour_alerts a
      LEFT JOIN workers w ON a.worker_id = w.id
      WHERE ${where}
      ORDER BY a.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `
  );
  
  const alerts = (result[0] as any[]).map(row => ({
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name,
    alertType: row.alert_type,
    alertLevel: row.alert_level,
    message: row.message,
    details: row.details,
    status: row.status,
    acknowledgedBy: row.acknowledged_by,
    acknowledgedAt: row.acknowledged_at,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    resolution: row.resolution,
    createdAt: row.created_at,
  }));
  
  return { alerts, total };
}

/**
 * 更新预警状态
 */
export async function updateAlertStatus(id: number, data: {
  status: 'Acknowledged' | 'Resolved' | 'Ignored';
  userId: number;
  resolution?: string;
}): Promise<WorkHourAlert | null> {
  const db = await requireDb();
  if (!db) return null;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  if (data.status === 'Acknowledged') {
    await db.execute(
      sql`UPDATE work_hour_alerts SET status = ${data.status}, acknowledged_by = ${data.userId}, acknowledged_at = ${now} WHERE id = ${id}`
    );
  } else if (data.status === 'Resolved') {
    await db.execute(
      sql`UPDATE work_hour_alerts SET status = ${data.status}, resolved_by = ${data.userId}, resolved_at = ${now}, resolution = ${data.resolution || null} WHERE id = ${id}`
    );
  } else {
    await db.execute(
      sql`UPDATE work_hour_alerts SET status = ${data.status} WHERE id = ${id}`
    );
  }
  
  const result = await db.execute(sql`SELECT * FROM work_hour_alerts WHERE id = ${id}`);
  const rows = result[0] as any[];
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    workerId: row.worker_id,
    alertType: row.alert_type,
    alertLevel: row.alert_level,
    message: row.message,
    details: row.details,
    status: row.status,
    acknowledgedBy: row.acknowledged_by,
    acknowledgedAt: row.acknowledged_at,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    resolution: row.resolution,
    createdAt: row.created_at,
  };
}

// ==================== 用户收藏菜单函数 ====================

/**
 * 获取用户收藏菜单
 */
export async function getUserFavorites(userId: number): Promise<UserFavorite[]> {
  const db = await requireDb();
  if (!db) return [];
  
  const result = await db.execute(
    sql`SELECT * FROM user_favorites WHERE user_id = ${userId} ORDER BY sort_order ASC, created_at ASC`
  );
  
  return (result[0] as any[]).map(row => ({
    id: row.id,
    userId: row.user_id,
    menuPath: row.menu_path,
    menuName: row.menu_name,
    menuNameEn: row.menu_name_en,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }));
}

/**
 * 添加收藏菜单
 */
export async function addUserFavorite(data: {
  userId: number;
  menuPath: string;
  menuName: string;
  menuNameEn?: string;
}): Promise<UserFavorite | null> {
  const db = await requireDb();
  if (!db) return null;
  
  // 检查是否已存在
  const existing = await db.execute(
    sql`SELECT id FROM user_favorites WHERE user_id = ${data.userId} AND menu_path = ${data.menuPath}`
  );
  
  if ((existing[0] as any[]).length > 0) {
    throw new Error('已收藏该菜单');
  }
  
  // 获取最大排序值
  const maxOrder = await db.execute(
    sql`SELECT MAX(sort_order) as max_order FROM user_favorites WHERE user_id = ${data.userId}`
  );
  const nextOrder = ((maxOrder[0] as any[])[0]?.max_order || 0) + 1;
  
  const result = await db.execute(
    sql`INSERT INTO user_favorites (user_id, menu_path, menu_name, menu_name_en, sort_order)
        VALUES (${data.userId}, ${data.menuPath}, ${data.menuName}, ${data.menuNameEn || null}, ${nextOrder})`
  );
  
  const insertId = (result[0] as any).insertId;
  
  const newFavorite = await db.execute(sql`SELECT * FROM user_favorites WHERE id = ${insertId}`);
  const row = (newFavorite[0] as any[])[0];
  
  return {
    id: row.id,
    userId: row.user_id,
    menuPath: row.menu_path,
    menuName: row.menu_name,
    menuNameEn: row.menu_name_en,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/**
 * 移除收藏菜单
 */
export async function removeUserFavorite(userId: number, menuPath: string): Promise<boolean> {
  const db = await requireDb();
  if (!db) return false;
  
  const result = await db.execute(
    sql`DELETE FROM user_favorites WHERE user_id = ${userId} AND menu_path = ${menuPath}`
  );
  return (result[0] as any).affectedRows > 0;
}

/**
 * 更新收藏菜单排序
 */
export async function updateFavoriteOrder(userId: number, menuPath: string, newOrder: number): Promise<boolean> {
  const db = await requireDb();
  if (!db) return false;
  
  const result = await db.execute(
    sql`UPDATE user_favorites SET sort_order = ${newOrder} WHERE user_id = ${userId} AND menu_path = ${menuPath}`
  );
  return (result[0] as any).affectedRows > 0;
}

/**
 * 检查是否已收藏
 */
export async function isFavorite(userId: number, menuPath: string): Promise<boolean> {
  const db = await requireDb();
  if (!db) return false;
  
  const result = await db.execute(
    sql`SELECT id FROM user_favorites WHERE user_id = ${userId} AND menu_path = ${menuPath}`
  );
  return (result[0] as any[]).length > 0;
}
