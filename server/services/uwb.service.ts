/**
 * UWB工时采集服务
 * 集成UWB定位系统，实现自动工时采集和产能计算
 */

import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { handleWorkReportEvent } from './scheduling-auto-refresh.service';

// ==================== 类型定义 ====================

export interface UwbLocationData {
  tagId: string;
  x: number;
  y: number;
  z?: number;
  accuracy?: number;
  signalStrength?: number;
  timestamp: Date;
}

export interface UwbZone {
  id: string;
  zoneCode: string;
  zoneName: string;
  zoneType: 'production' | 'assembly' | 'testing' | 'warehouse' | 'office' | 'rest';
  buCode?: string;
  bounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin?: number;
    zMax?: number;
  };
  isWorkZone: boolean;
  capacity: number;
}

export interface UwbWorkHoursSummary {
  employeeId: string;
  employeeName?: string;
  workDate: string;
  totalMinutes: number;
  effectiveMinutes: number;
  idleMinutes: number;
  zones: {
    zoneId: string;
    zoneName: string;
    minutes: number;
  }[];
  utilizationRate: number;
}

export interface UwbCapacityData {
  resourceId: string;
  resourceName: string;
  date: string;
  baseCapacityHours: number;
  actualWorkHours: number;
  availableCapacity: number;
  utilizationRate: number;
}

// ==================== 标签-员工映射缓存 ====================

const tagEmployeeMap = new Map<string, { employeeId: string; resourceId?: string }>();

// ==================== 核心功能 ====================

/**
 * 处理UWB定位数据
 */
export async function processLocationData(data: UwbLocationData): Promise<void> {
  const db = await getDb() as any;

  // 确定所在区域
  const zone = await determineZone(data.x, data.y, data.z);

  // 获取标签关联的员工信息
  const employeeInfo = await getEmployeeByTag(data.tagId);

  // 保存定位记录
  await db.execute(
    `INSERT INTO uwb_location_records 
     (id, tag_id, employee_id, resource_id, zone_id, zone_name, 
      x_coordinate, y_coordinate, z_coordinate, accuracy, signal_strength, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      data.tagId,
      employeeInfo?.employeeId || null,
      employeeInfo?.resourceId || null,
      zone?.id || 'unknown',
      zone?.zoneName || '未知区域',
      data.x,
      data.y,
      data.z || null,
      data.accuracy || null,
      data.signalStrength || null,
      data.timestamp,
    ]
  );

  // 如果是工作区域，更新工时统计
  if (zone?.isWorkZone && employeeInfo) {
    await updateWorkHours(employeeInfo.employeeId, employeeInfo.resourceId, zone, data.timestamp);
  }
}

/**
 * 批量处理定位数据
 */
export async function processBatchLocationData(dataList: UwbLocationData[]): Promise<{
  processed: number;
  errors: number;
}> {
  let processed = 0;
  let errors = 0;

  for (const data of dataList) {
    try {
      await processLocationData(data);
      processed++;
    } catch (error) {
      console.error(`[UWB] 处理定位数据失败: ${error}`);
      errors++;
    }
  }

  return { processed, errors };
}

/**
 * 确定坐标所在区域
 */
async function determineZone(x: number, y: number, z?: number): Promise<UwbZone | null> {
  const db = await getDb() as any;
  
  let query = `
    SELECT * FROM uwb_zones 
    WHERE status = 'active' 
      AND x_min <= ? AND x_max >= ?
      AND y_min <= ? AND y_max >= ?
  `;
  const params: any[] = [x, x, y, y];

  if (z !== undefined) {
    query += ' AND (z_min IS NULL OR z_min <= ?) AND (z_max IS NULL OR z_max >= ?)';
    params.push(z, z);
  }

  const [rows] = await db.execute(query, params) as any[];

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    zoneCode: row.zone_code,
    zoneName: row.zone_name,
    zoneType: row.zone_type,
    buCode: row.bu_code,
    bounds: {
      xMin: parseFloat(row.x_min),
      xMax: parseFloat(row.x_max),
      yMin: parseFloat(row.y_min),
      yMax: parseFloat(row.y_max),
      zMin: row.z_min ? parseFloat(row.z_min) : undefined,
      zMax: row.z_max ? parseFloat(row.z_max) : undefined,
    },
    isWorkZone: row.is_work_zone === 1,
    capacity: row.capacity,
  };
}

/**
 * 获取标签关联的员工信息
 */
async function getEmployeeByTag(tagId: string): Promise<{ employeeId: string; resourceId?: string } | null> {
  // 先从缓存获取
  if (tagEmployeeMap.has(tagId)) {
    return tagEmployeeMap.get(tagId)!;
  }

  // 从数据库查询（假设有员工-标签关联表）
  const db = await getDb() as any;
  const [rows] = await db.execute(
    `SELECT e.id as employee_id, r.id as resource_id
     FROM users e
     LEFT JOIN scheduling_resources r ON r.resource_name = e.name
     WHERE e.uwb_tag_id = ?`,
    [tagId]
  ) as any[];

  if (rows.length === 0) {
    return null;
  }

  const result = {
    employeeId: rows[0].employee_id,
    resourceId: rows[0].resource_id,
  };

  // 缓存结果
  tagEmployeeMap.set(tagId, result);

  return result;
}

/**
 * 更新工时统计
 */
async function updateWorkHours(
  employeeId: string,
  resourceId: string | undefined,
  zone: UwbZone,
  timestamp: Date
): Promise<void> {
  const db = await getDb() as any;
  const workDate = timestamp.toISOString().split('T')[0];

  // 查找当天该区域的工时记录
  const [existing] = await db.execute(
    `SELECT * FROM uwb_work_hours 
     WHERE employee_id = ? AND zone_id = ? AND work_date = ? AND status = 'in_progress'`,
    [employeeId, zone.id, workDate]
  ) as any[];

  if (existing.length === 0) {
    // 创建新记录
    await db.execute(
      `INSERT INTO uwb_work_hours 
       (id, employee_id, resource_id, zone_id, zone_name, work_date, start_time, total_minutes, effective_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [uuidv4(), employeeId, resourceId || null, zone.id, zone.zoneName, workDate, timestamp]
    );
  } else {
    // 更新现有记录
    const record = existing[0];
    const lastUpdate = new Date(record.updated_at || record.start_time);
    const minutesSinceLastUpdate = Math.floor((timestamp.getTime() - lastUpdate.getTime()) / 60000);

    // 如果间隔超过30分钟，认为是新的工作段
    if (minutesSinceLastUpdate > 30) {
      // 结束上一段，创建新记录
      await db.execute(
        `UPDATE uwb_work_hours SET status = 'completed', end_time = ? WHERE id = ?`,
        [lastUpdate, record.id]
      );
      await db.execute(
        `INSERT INTO uwb_work_hours 
         (id, employee_id, resource_id, zone_id, zone_name, work_date, start_time, total_minutes, effective_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        [uuidv4(), employeeId, resourceId || null, zone.id, zone.zoneName, workDate, timestamp]
      );
    } else {
      // 更新工时
      const newTotalMinutes = record.total_minutes + minutesSinceLastUpdate;
      const newEffectiveMinutes = zone.isWorkZone 
        ? record.effective_minutes + minutesSinceLastUpdate 
        : record.effective_minutes;

      await db.execute(
        `UPDATE uwb_work_hours 
         SET total_minutes = ?, effective_minutes = ?, end_time = ?
         WHERE id = ?`,
        [newTotalMinutes, newEffectiveMinutes, timestamp, record.id]
      );
    }
  }
}

/**
 * 获取员工工时汇总
 */
export async function getEmployeeWorkHoursSummary(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<UwbWorkHoursSummary[]> {
  const db = await getDb() as any;
  
  const [rows] = await db.execute(
    `SELECT 
       work_date,
       SUM(total_minutes) as total_minutes,
       SUM(effective_minutes) as effective_minutes,
       SUM(idle_minutes) as idle_minutes
     FROM uwb_work_hours
     WHERE employee_id = ? AND work_date BETWEEN ? AND ?
     GROUP BY work_date
     ORDER BY work_date`,
    [employeeId, startDate, endDate]
  ) as any[];

  const summaries: UwbWorkHoursSummary[] = [];

  for (const row of rows) {
    // 获取各区域明细
    const [zoneRows] = await db.execute(
      `SELECT zone_id, zone_name, SUM(effective_minutes) as minutes
       FROM uwb_work_hours
       WHERE employee_id = ? AND work_date = ?
       GROUP BY zone_id, zone_name`,
      [employeeId, row.work_date]
    ) as any[];

    const totalMinutes = parseInt(row.total_minutes) || 0;
    const effectiveMinutes = parseInt(row.effective_minutes) || 0;

    summaries.push({
      employeeId,
      workDate: row.work_date,
      totalMinutes,
      effectiveMinutes,
      idleMinutes: parseInt(row.idle_minutes) || 0,
      zones: zoneRows.map((z: any) => ({
        zoneId: z.zone_id,
        zoneName: z.zone_name,
        minutes: parseInt(z.minutes) || 0,
      })),
      utilizationRate: totalMinutes > 0 ? effectiveMinutes / totalMinutes : 0,
    });
  }

  return summaries;
}

/**
 * 计算资源产能（基于UWB工时数据）
 */
export async function calculateResourceCapacity(
  resourceId: string,
  date: string
): Promise<UwbCapacityData | null> {
  const db = await getDb() as any;

  // 获取资源信息
  const [resourceRows] = await db.execute(
    'SELECT * FROM scheduling_resources WHERE id = ?',
    [resourceId]
  ) as any[];

  if (resourceRows.length === 0) {
    return null;
  }

  const resource = resourceRows[0];
  const baseCapacityHours = parseFloat(resource.capacity_per_day) || 8;

  // 获取UWB工时数据
  const [workRows] = await db.execute(
    `SELECT SUM(effective_minutes) as effective_minutes
     FROM uwb_work_hours
     WHERE resource_id = ? AND work_date = ?`,
    [resourceId, date]
  ) as any[];

  const effectiveMinutes = parseInt(workRows[0]?.effective_minutes) || 0;
  const actualWorkHours = effectiveMinutes / 60;

  return {
    resourceId,
    resourceName: resource.resource_name,
    date,
    baseCapacityHours,
    actualWorkHours,
    availableCapacity: Math.max(0, baseCapacityHours - actualWorkHours),
    utilizationRate: actualWorkHours / baseCapacityHours,
  };
}

/**
 * 获取所有资源的实时产能
 */
export async function getAllResourcesCapacity(date: string): Promise<UwbCapacityData[]> {
  const db = await getDb() as any;

  const [resourceRows] = await db.execute(
    'SELECT id FROM scheduling_resources WHERE status = ?',
    ['available']
  ) as any[];

  const capacities: UwbCapacityData[] = [];

  for (const row of resourceRows) {
    const capacity = await calculateResourceCapacity(row.id, date);
    if (capacity) {
      capacities.push(capacity);
    }
  }

  return capacities;
}

/**
 * 同步UWB工时到排程系统
 * 当UWB检测到员工完成工作时，自动更新排程任务进度
 */
export async function syncWorkHoursToScheduling(
  employeeId: string,
  taskId: string,
  reportedHours: number
): Promise<void> {
  const db = await getDb() as any;

  // 获取资源ID
  const [resourceRows] = await db.execute(
    `SELECT r.id FROM scheduling_resources r
     JOIN users u ON r.resource_name = u.name
     WHERE u.id = ?`,
    [employeeId]
  ) as any[];

  const resourceId = resourceRows[0]?.id;

  if (resourceId) {
    // 触发排程自动刷新
    await handleWorkReportEvent({
      type: 'work_report_submitted',
      taskId,
      resourceId,
      reportedHours,
      reportDate: new Date().toISOString().split('T')[0],
      timestamp: new Date(),
    });
  }
}

/**
 * 结束当天所有进行中的工时记录
 */
export async function closeWorkHoursForDay(date: string): Promise<number> {
  const db = await getDb() as any;

  const [result] = await db.execute(
    `UPDATE uwb_work_hours 
     SET status = 'completed', end_time = CONCAT(?, ' 18:00:00')
     WHERE work_date = ? AND status = 'in_progress'`,
    [date, date]
  ) as any;

  return result.affectedRows || 0;
}

// ==================== 区域管理 ====================

/**
 * 创建UWB区域
 */
export async function createZone(zone: Omit<UwbZone, 'id'>): Promise<string> {
  const db = await getDb() as any;
  const id = uuidv4();

  await db.execute(
    `INSERT INTO uwb_zones 
     (id, zone_code, zone_name, zone_type, bu_code, 
      x_min, x_max, y_min, y_max, z_min, z_max, is_work_zone, capacity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      zone.zoneCode,
      zone.zoneName,
      zone.zoneType,
      zone.buCode || null,
      zone.bounds.xMin,
      zone.bounds.xMax,
      zone.bounds.yMin,
      zone.bounds.yMax,
      zone.bounds.zMin || null,
      zone.bounds.zMax || null,
      zone.isWorkZone,
      zone.capacity,
    ]
  );

  return id;
}

/**
 * 获取所有区域
 */
export async function getAllZones(): Promise<UwbZone[]> {
  const db = await getDb() as any;

  const [rows] = await db.execute(
    'SELECT * FROM uwb_zones WHERE status = ? ORDER BY zone_code',
    ['active']
  ) as any[];

  return rows.map((row: any) => ({
    id: row.id,
    zoneCode: row.zone_code,
    zoneName: row.zone_name,
    zoneType: row.zone_type,
    buCode: row.bu_code,
    bounds: {
      xMin: parseFloat(row.x_min),
      xMax: parseFloat(row.x_max),
      yMin: parseFloat(row.y_min),
      yMax: parseFloat(row.y_max),
      zMin: row.z_min ? parseFloat(row.z_min) : undefined,
      zMax: row.z_max ? parseFloat(row.z_max) : undefined,
    },
    isWorkZone: row.is_work_zone === 1,
    capacity: row.capacity,
  }));
}

/**
 * 获取区域实时人数
 */
export async function getZoneOccupancy(zoneId: string): Promise<{
  zoneId: string;
  zoneName: string;
  currentCount: number;
  capacity: number;
  employees: { id: string; name: string; lastSeen: Date }[];
}> {
  const db = await getDb() as any;

  // 获取区域信息
  const [zoneRows] = await db.execute(
    'SELECT * FROM uwb_zones WHERE id = ?',
    [zoneId]
  ) as any[];

  if (zoneRows.length === 0) {
    throw new Error('区域不存在');
  }

  const zone = zoneRows[0];

  // 获取最近5分钟内在该区域的员工
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [employeeRows] = await db.execute(
    `SELECT DISTINCT l.employee_id, u.name, MAX(l.timestamp) as last_seen
     FROM uwb_location_records l
     JOIN users u ON l.employee_id = u.id
     WHERE l.zone_id = ? AND l.timestamp >= ?
     GROUP BY l.employee_id, u.name`,
    [zoneId, fiveMinutesAgo]
  ) as any[];

  return {
    zoneId,
    zoneName: zone.zone_name,
    currentCount: employeeRows.length,
    capacity: zone.capacity,
    employees: employeeRows.map((row: any) => ({
      id: row.employee_id,
      name: row.name,
      lastSeen: new Date(row.last_seen),
    })),
  };
}

// ==================== 标签管理 ====================

/**
 * 绑定UWB标签到员工
 */
export async function bindTagToEmployee(tagId: string, employeeId: string): Promise<void> {
  const db = await getDb() as any;

  // 更新员工表的UWB标签字段（假设users表有uwb_tag_id字段）
  await db.execute(
    'UPDATE users SET uwb_tag_id = ? WHERE id = ?',
    [tagId, employeeId]
  );

  // 清除缓存
  tagEmployeeMap.delete(tagId);
}

/**
 * 解绑UWB标签
 */
export async function unbindTag(tagId: string): Promise<void> {
  const db = await getDb() as any;

  await db.execute(
    'UPDATE users SET uwb_tag_id = NULL WHERE uwb_tag_id = ?',
    [tagId]
  );

  // 清除缓存
  tagEmployeeMap.delete(tagId);
}
