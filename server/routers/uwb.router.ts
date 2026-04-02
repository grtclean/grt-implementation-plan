/**
 * UWB工时采集 tRPC 路由
 */

import { z } from 'zod';
import {router, protectedProcedure, requirePermission} from '../_core/trpc';
import {
  processLocationData,
  processBatchLocationData,
  getEmployeeWorkHoursSummary,
  calculateResourceCapacity,
  getAllResourcesCapacity,
  syncWorkHoursToScheduling,
  closeWorkHoursForDay,
  createZone,
  getAllZones,
  getZoneOccupancy,
  bindTagToEmployee,
  unbindTag,
} from '../services/uwb.service';
import { getDb } from '../db';

// ==================== DB Raw Query Types ====================

interface DbExecutable {
  execute(query: string, params?: unknown[]): Promise<[Record<string, unknown>[], unknown]>;
}

/** Wrap Drizzle PG db to support MySQL-style execute(query, [params]) */
function asMysqlCompat(db: any): DbExecutable {
  return {
    async execute(query: string, params?: unknown[]): Promise<[Record<string, unknown>[], unknown]> {
      // Inline replace ? with literal values for PG sql.raw compatibility
      let finalQuery = query;
      if (params && params.length) {
        let idx = 0;
        finalQuery = query.replace(/\?/g, () => {
          const val = params[idx++];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return String(val);
          return `'${String(val).replace(/'/g, "''")}'`;
        });
      }
      // Use pg pool directly via drizzle's execute
      const { sql: drizzleSql } = require("drizzle-orm");
      const result = await db.execute(drizzleSql.raw(finalQuery));
      const rows = (result as any).rows ?? result ?? [];
      return [rows as Record<string, unknown>[], null];
    }
  };
}

interface WorkHoursOverviewRow {
  employee_id: string;
  employee_name: string;
  effective_minutes: string;
  total_minutes: string;
}

interface WorkHoursReportRow {
  group_id: string;
  group_name: string;
  effective_minutes: string;
  total_minutes: string;
  employee_count?: string;
  work_days?: string;
}

interface TagBindingRow {
  tag_id: string;
  employee_id: string;
  employee_name: string | null;
  department: string | null;
  bound_at: string | null;
  status: string | null;
  battery_level: number | null;
  last_seen: string | null;
  email?: string;
}

interface UserRow {
  id: string;
  name: string;
  department: string | null;
  position: string | null;
}

interface LocationRow {
  tag_id: string;
  employee_id: string;
  employee_name: string | null;
  zone_id: string;
  zone_name: string;
  x_coordinate: string;
  y_coordinate: string;
  z_coordinate: string | null;
  timestamp: string;
}

interface HistoryDateRow {
  date: string;
  point_count: string;
}

// ==================== 输入验证Schema ====================

const locationDataSchema = z.object({
  tagId: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
  accuracy: z.number().optional(),
  signalStrength: z.number().optional(),
  timestamp: z.string().or(z.date()),
});

const zoneInputSchema = z.object({
  zoneCode: z.string(),
  zoneName: z.string(),
  zoneType: z.enum(['production', 'assembly', 'testing', 'warehouse', 'office', 'rest']),
  buCode: z.string().optional(),
  bounds: z.object({
    xMin: z.number(),
    xMax: z.number(),
    yMin: z.number(),
    yMax: z.number(),
    zMin: z.number().optional(),
    zMax: z.number().optional(),
  }),
  isWorkZone: z.boolean(),
  capacity: z.number().int().positive(),
});

// ==================== 路由定义 ====================

export const uwbRouter = router({
  // ==================== 定位数据处理 ====================

  /**
   * 接收单条定位数据
   */
  reportLocation: requirePermission('mfg:uwb:manage')
    .input(locationDataSchema)
    .mutation(async ({ input }) => {
      await processLocationData({
        ...input,
        timestamp: new Date(input.timestamp),
      });
      return { success: true };
    }),

  /**
   * 批量接收定位数据
   */
  reportBatchLocations: requirePermission('mfg:uwb:manage')
    .input(z.array(locationDataSchema))
    .mutation(async ({ input }) => {
      const result = await processBatchLocationData(
        input.map(d => ({
          ...d,
          timestamp: new Date(d.timestamp),
        }))
      );
      return result;
    }),

  // ==================== 工时查询 ====================

  /**
   * 获取员工工时汇总
   */
  getEmployeeWorkHours: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      return await getEmployeeWorkHoursSummary(
        input.employeeId,
        input.startDate,
        input.endDate
      );
    }),

  /**
   * 获取当前用户的工时汇总
   */
  getMyWorkHours: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return await getEmployeeWorkHoursSummary(
        String(ctx.user!.id),
        input.startDate,
        input.endDate
      );
    }),

  /**
   * 获取今日工时概览
   */
  getTodayWorkHoursOverview: protectedProcedure
    .query(async () => {
      try {
        const { requireDb } = await import("../db");
        const db = await requireDb();
        const today = new Date().toISOString().split('T')[0];
        const result = await asMysqlCompat(db).execute(
          `SELECT u.id as employee_id, u.name as employee_name,
                  COALESCE(SUM(w.effective_minutes),0) as effective_minutes,
                  COALESCE(SUM(w.total_minutes),0) as total_minutes
           FROM uwb_work_hours w JOIN users u ON w.employee_id = u.id
           WHERE w.work_date = ? GROUP BY u.id, u.name
           ORDER BY effective_minutes DESC LIMIT 100`,
          [today]
        );
        const rows = result[0] ?? [];
        return (rows as any[]).map((row: any) => ({
          employeeId: row.employee_id,
          employeeName: row.employee_name,
          effectiveMinutes: parseInt(row.effective_minutes) || 0,
          totalMinutes: parseInt(row.total_minutes) || 0,
          effectiveHours: (parseInt(row.effective_minutes) || 0) / 60,
        }));
      } catch {
        return [];
      }
    }),

  // ==================== 产能计算 ====================

  /**
   * 获取资源产能
   */
  getResourceCapacity: protectedProcedure
    .input(z.object({
      resourceId: z.string(),
      date: z.string(),
    }))
    .query(async ({ input }) => {
      return await calculateResourceCapacity(input.resourceId, input.date);
    }),

  /**
   * 获取所有资源的实时产能
   */
  getAllResourcesCapacity: protectedProcedure
    .input(z.object({
      date: z.string(),
    }))
    .query(async ({ input }) => {
      return await getAllResourcesCapacity(input.date);
    }),

  // ==================== 区域管理 ====================

  /**
   * 创建区域
   */
  createZone: requirePermission('mfg:uwb:manage')
    .input(zoneInputSchema)
    .mutation(async ({ input }) => {
      const id = await createZone(input);
      return { id, success: true };
    }),

  /**
   * 获取所有区域
   */
  getAllZones: protectedProcedure
    .query(async () => {
      return await getAllZones();
    }),

  /**
   * 获取区域实时人数
   */
  getZoneOccupancy: protectedProcedure
    .input(z.object({
      zoneId: z.string(),
    }))
    .query(async ({ input }) => {
      return await getZoneOccupancy(input.zoneId);
    }),

  /**
   * 获取所有区域的实时人数
   */
  getAllZonesOccupancy: protectedProcedure
    .query(async () => {
      const zones = await getAllZones();
      const occupancies = await Promise.all(
        zones.map(zone => getZoneOccupancy(zone.id).catch(() => ({
          zoneId: zone.id,
          zoneName: zone.zoneName,
          currentCount: 0,
          capacity: zone.capacity,
          employees: [],
        })))
      );
      return occupancies;
    }),

  // ==================== 标签管理 ====================

  /**
   * 绑定标签到员工
   */
  bindTag: requirePermission('mfg:uwb:manage')
    .input(z.object({
      tagId: z.string(),
      employeeId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await bindTagToEmployee(input.tagId, input.employeeId);
      return { success: true };
    }),

  /**
   * 解绑标签
   */
  unbindTag: requirePermission('mfg:uwb:manage')
    .input(z.object({
      tagId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await unbindTag(input.tagId);
      return { success: true };
    }),

  // ==================== 工时同步 ====================

  /**
   * 同步工时到排程系统
   */
  syncToScheduling: requirePermission('mfg:uwb:manage')
    .input(z.object({
      employeeId: z.string(),
      taskId: z.string(),
      reportedHours: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      await syncWorkHoursToScheduling(
        input.employeeId,
        input.taskId,
        input.reportedHours
      );
      return { success: true, message: '工时已同步到排程系统' };
    }),

  /**
   * 结束当天工时记录
   */
  closeDayWorkHours: requirePermission('mfg:uwb:manage')
    .input(z.object({
      date: z.string(),
    }))
    .mutation(async ({ input }) => {
      const count = await closeWorkHoursForDay(input.date);
      return { success: true, closedRecords: count };
    }),

  // ==================== 统计分析 ====================

  /**
   * 获取工时统计报表
   */
  getWorkHoursReport: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      groupBy: z.enum(['employee', 'zone', 'date']).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const { startDate, endDate, groupBy = 'employee' } = input;

      let query: string;
      let groupByClause: string;

      switch (groupBy) {
        case 'zone':
          groupByClause = 'zone_id, zone_name';
          query = `
            SELECT 
              zone_id as group_id,
              zone_name as group_name,
              SUM(effective_minutes) as effective_minutes,
              SUM(total_minutes) as total_minutes,
              COUNT(DISTINCT employee_id) as employee_count
            FROM uwb_work_hours
            WHERE work_date BETWEEN ? AND ?
            GROUP BY ${groupByClause}
            ORDER BY effective_minutes DESC
          `;
          break;
        case 'date':
          groupByClause = 'work_date';
          query = `
            SELECT 
              work_date as group_id,
              work_date as group_name,
              SUM(effective_minutes) as effective_minutes,
              SUM(total_minutes) as total_minutes,
              COUNT(DISTINCT employee_id) as employee_count
            FROM uwb_work_hours
            WHERE work_date BETWEEN ? AND ?
            GROUP BY ${groupByClause}
            ORDER BY work_date
          `;
          break;
        default:
          groupByClause = 'employee_id';
          query = `
            SELECT 
              w.employee_id as group_id,
              u.name as group_name,
              SUM(w.effective_minutes) as effective_minutes,
              SUM(w.total_minutes) as total_minutes,
              COUNT(DISTINCT w.work_date) as work_days
            FROM uwb_work_hours w
            JOIN users u ON w.employee_id = u.id
            WHERE w.work_date BETWEEN ? AND ?
            GROUP BY w.employee_id, u.name
            ORDER BY effective_minutes DESC
          `;
      }

      const [rows] = await asMysqlCompat(db).execute(query, [startDate, endDate]);

      return (rows as unknown as WorkHoursReportRow[]).map((row) => ({
        groupId: row.group_id,
        groupName: row.group_name,
        effectiveMinutes: parseInt(row.effective_minutes) || 0,
        totalMinutes: parseInt(row.total_minutes) || 0,
        effectiveHours: (parseInt(row.effective_minutes) || 0) / 60,
        totalHours: (parseInt(row.total_minutes) || 0) / 60,
// @ts-ignore operator type mismatch
        utilizationRate: row.total_minutes > 0 
// @ts-ignore arithmetic operand type
// @ts-ignore arithmetic operand type
          ? (row.effective_minutes / row.total_minutes) 
          : 0,
        additionalInfo: row.employee_count || row.work_days || null,
      }));
    }),

  /**
   * 获取所有标签绑定
   */
  getAllTagBindings: protectedProcedure
    .query(async () => {
      const db = await getDb();
      const [rows] = await asMysqlCompat(db).execute(
        `SELECT
           t.tag_id,
           t.employee_id,
           u.name as employee_name,
           u.department,
           t.bound_at,
           t.status,
           t.battery_level,
           t.last_seen
         FROM uwb_tag_bindings t
         LEFT JOIN users u ON t.employee_id = u.id
         ORDER BY t.bound_at DESC`
      );

      return (rows as unknown as TagBindingRow[]).map((row) => ({
        tagId: row.tag_id,
        employeeId: row.employee_id,
        employeeName: row.employee_name || '未绑定',
        department: row.department || '',
        boundAt: row.bound_at ? new Date(row.bound_at) : null,
        status: row.status || 'inactive',
        batteryLevel: row.battery_level || 0,
        lastSeen: row.last_seen ? new Date(row.last_seen) : null,
      }));
    }),

  /**
   * 获取未绑定标签的工人列表
   */
  getUnboundWorkers: protectedProcedure
    .query(async () => {
      const db = await getDb();
      const [rows] = await asMysqlCompat(db).execute(
        `SELECT u.id, u.name, u.department, u.position
         FROM users u
         WHERE u.id NOT IN (
           SELECT employee_id FROM uwb_tag_bindings WHERE status = 'active'
         )
         ORDER BY u.name`
      );

      return (rows as unknown as UserRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        department: row.department || '',
        position: row.position || '',
      }));
    }),

  /**
   * 获取实时定位数据（最近5分钟）
   */
  getRealtimeLocations: protectedProcedure
    .query(async () => {
      const db = await getDb();
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const [rows] = await asMysqlCompat(db).execute(
        `SELECT
           l.tag_id,
           l.employee_id,
           u.name as employee_name,
           l.zone_id,
           l.zone_name,
           l.x_coordinate,
           l.y_coordinate,
           l.z_coordinate,
           l.timestamp
         FROM uwb_location_records l
         LEFT JOIN users u ON l.employee_id = u.id
         WHERE l.timestamp >= ?
         ORDER BY l.timestamp DESC`,
        [fiveMinutesAgo]
      );

      // 去重，只保留每个标签的最新位置
      const latestByTag = new Map<string, Record<string, unknown>>();
      for (const row of rows as unknown as LocationRow[]) {
        if (!latestByTag.has(row.tag_id)) {
          latestByTag.set(row.tag_id, {
            tagId: row.tag_id,
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            zoneId: row.zone_id,
            zoneName: row.zone_name,
            x: parseFloat(row.x_coordinate),
            y: parseFloat(row.y_coordinate),
            z: row.z_coordinate ? parseFloat(row.z_coordinate) : null,
            timestamp: new Date(row.timestamp),
          });
        }
      }

      return Array.from(latestByTag.values());
    }),

  /**
   * 获取历史轨迹数据（用于回放）
   */
  getHistoryTrack: protectedProcedure
    .input(z.object({
      tagId: z.string(),
      date: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const { tagId, date, startTime, endTime } = input;
      
      let query = `
        SELECT 
          l.tag_id,
          l.employee_id,
          u.name as employee_name,
          l.zone_id,
          l.zone_name,
          l.x_coordinate,
          l.y_coordinate,
          l.z_coordinate,
          l.timestamp
        FROM uwb_location_records l
        LEFT JOIN users u ON l.employee_id = u.id
        WHERE l.tag_id = ? AND DATE(l.timestamp) = ?
      `;
      const params: unknown[] = [tagId, date];
      
      if (startTime) {
        query += ` AND TIME(l.timestamp) >= ?`;
        params.push(startTime);
      }
      if (endTime) {
        query += ` AND TIME(l.timestamp) <= ?`;
        params.push(endTime);
      }
      
      query += ` ORDER BY l.timestamp ASC`;
      
      const [rows] = await asMysqlCompat(db).execute(query, params);

      return (rows as unknown as LocationRow[]).map((row) => ({
        tagId: row.tag_id,
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        zoneId: row.zone_id,
        zoneName: row.zone_name,
        x: parseFloat(row.x_coordinate),
        y: parseFloat(row.y_coordinate),
        z: row.z_coordinate ? parseFloat(row.z_coordinate) : null,
        timestamp: new Date(row.timestamp),
      }));
    }),

  /**
   * 获取可回放的历史日期列表
   */
  getAvailableHistoryDates: protectedProcedure
    .input(z.object({
      tagId: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [rows] = await asMysqlCompat(db).execute(
        `SELECT DISTINCT DATE(timestamp) as date, COUNT(*) as point_count
         FROM uwb_location_records
         WHERE tag_id = ?
         GROUP BY DATE(timestamp)
         ORDER BY date DESC
         LIMIT 30`,
        [input.tagId]
      );

      return (rows as unknown as HistoryDateRow[]).map((row) => ({
        date: row.date,
        pointCount: parseInt(row.point_count),
      }));
    }),

  /**
   * 获取低电量标签告警
   */
  getLowBatteryAlerts: protectedProcedure
    .input(z.object({
      threshold: z.number().min(0).max(100).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const threshold = input.threshold || 20;
      
      const [rows] = await asMysqlCompat(db).execute(
        `SELECT
           t.tag_id,
           t.employee_id,
           u.name as employee_name,
           u.department,
           t.battery_level,
           t.last_seen,
           t.status
         FROM uwb_tag_bindings t
         LEFT JOIN users u ON t.employee_id = u.id
         WHERE t.battery_level <= ? AND t.battery_level > 0
         ORDER BY t.battery_level ASC`,
        [threshold]
      );

      return (rows as unknown as TagBindingRow[]).map((row) => ({
        tagId: row.tag_id,
        employeeId: row.employee_id,
        employeeName: row.employee_name || '未绑定',
        department: row.department || '',
        batteryLevel: row.battery_level,
        lastSeen: row.last_seen ? new Date(row.last_seen) : null,
        status: row.status,
        severity: row.battery_level! <= 10 ? 'critical' : 'warning',
      }));
    }),

  /**
   * 获取丢失标签告警
   */
  getLostTagAlerts: protectedProcedure
    .input(z.object({
      offlineMinutes: z.number().min(1).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const offlineMinutes = input.offlineMinutes || 30;
      const cutoffTime = new Date(Date.now() - offlineMinutes * 60 * 1000);
      
      const [rows] = await asMysqlCompat(db).execute(
        `SELECT
           t.tag_id,
           t.employee_id,
           u.name as employee_name,
           u.department,
           t.battery_level,
           t.last_seen,
           t.status
         FROM uwb_tag_bindings t
         LEFT JOIN users u ON t.employee_id = u.id
         WHERE (t.last_seen < ? OR t.last_seen IS NULL) AND t.status != 'unbound'
         ORDER BY t.last_seen ASC`,
        [cutoffTime]
      );

      return (rows as unknown as TagBindingRow[]).map((row) => {
        const lastSeen = row.last_seen ? new Date(row.last_seen) : null;
        const offlineDuration = lastSeen 
          ? Math.floor((Date.now() - lastSeen.getTime()) / 60000)
          : null;
        
        return {
          tagId: row.tag_id,
          employeeId: row.employee_id,
          employeeName: row.employee_name || '未绑定',
          department: row.department || '',
          batteryLevel: row.battery_level,
          lastSeen,
          offlineDuration,
          status: row.status,
        };
      });
    }),

  /**
   * 更新标签电量（供硬件上报）
   */
  updateTagBattery: requirePermission('mfg:uwb:manage')
    .input(z.object({
      tagId: z.string(),
      batteryLevel: z.number().min(0).max(100),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await asMysqlCompat(db).execute(
        `UPDATE uwb_tag_bindings
         SET battery_level = ?, last_seen = NOW(), status = 'active'
         WHERE tag_id = ?`,
        [input.batteryLevel, input.tagId]
      );
      return { success: true };
    }),

  /**
   * 发送低电量通知（手动触发）
   */
  sendLowBatteryNotification: requirePermission('mfg:uwb:manage')
    .input(z.object({
      tagId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // 获取标签信息
      const [rows] = await asMysqlCompat(db).execute(
        `SELECT t.*, u.name as employee_name, u.email
         FROM uwb_tag_bindings t
         LEFT JOIN users u ON t.employee_id = u.id
         WHERE t.tag_id = ?`,
        [input.tagId]
      );
      
      const typedRows = rows as unknown as TagBindingRow[];
      if (typedRows.length === 0) {
        throw new Error('标签不存在');
      }

      const tag = typedRows[0];

      // 记录通知日志
      await asMysqlCompat(db).execute(
        `INSERT INTO system_notifications (type, title, content, target_user_id, created_by, created_at)
         VALUES ('uwb_low_battery', '低电量告警', ?, ?, ?, NOW())`,
        [
          `UWB标签 ${tag.tag_id} 电量低 (${tag.battery_level}%)，绑定工人: ${tag.employee_name || '未绑定'}`,
          tag.employee_id,
          ctx.user!.id
        ]
      );
      
      return { success: true, message: '通知已发送' };
    }),

  // ==================== 车间看板 Phase A ====================

  /**
   * 获取区域热力图数据
   */
  getZoneHeatmapData: protectedProcedure
    .query(async () => {
      const db = await getDb();

      // Auto-DDL: zone-camera link table + tag_type column
      await asMysqlCompat(db).execute(`
        CREATE TABLE IF NOT EXISTS uwb_zone_camera_links (
          id SERIAL PRIMARY KEY,
          zone_id VARCHAR(50) NOT NULL,
          camera_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await asMysqlCompat(db).execute(`
        CREATE INDEX IF NOT EXISTS idx_uwb_zone_camera_zone ON uwb_zone_camera_links(zone_id)
      `).catch(() => { /* index may already exist */ });
      await asMysqlCompat(db).execute(`
        ALTER TABLE uwb_tag_bindings ADD COLUMN IF NOT EXISTS tag_type VARCHAR(20) DEFAULT 'worker'
      `).catch(() => { /* column may already exist */ });

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const [rows] = await asMysqlCompat(db).execute(
        `SELECT
           z.zone_code as zone_id,
           z.zone_name,
           z.capacity as max_capacity,
           COUNT(DISTINCT l.tag_id) as current_count
         FROM uwb_zones z
         LEFT JOIN uwb_location_records l
           ON l.zone_id = z.zone_code AND l.timestamp >= ?
         GROUP BY z.zone_code, z.zone_name, z.capacity
         ORDER BY z.zone_name`,
        [fiveMinutesAgo]
      );

      return (rows as unknown as Array<Record<string, unknown>>).map((row: Record<string, unknown>) => {
        const currentCount = parseInt(String(row.current_count)) || 0;
        const maxCapacity = parseInt(String(row.max_capacity)) || 1;
        return {
          zoneId: String(row.zone_id),
          zoneName: String(row.zone_name),
          currentCount,
          maxCapacity,
          density: Math.round((currentCount / maxCapacity) * 100) / 100,
        };
      });
    }),

  /**
   * 获取物料流转追踪
   */
  getMaterialFlowTracking: protectedProcedure
    .input(z.object({
      timeWindowMinutes: z.number().min(1).max(1440).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const windowMinutes = input.timeWindowMinutes || 30;
      const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);

      const [rows] = await asMysqlCompat(db).execute(
        `SELECT
           a.zone_id as from_zone,
           b.zone_id as to_zone,
           COUNT(*) as transition_count
         FROM uwb_location_records a
         JOIN uwb_location_records b
           ON a.tag_id = b.tag_id
           AND b.timestamp > a.timestamp
           AND TIMESTAMPDIFF(SECOND, a.timestamp, b.timestamp) BETWEEN 1 AND 600
           AND a.zone_id != b.zone_id
         JOIN uwb_tag_bindings t ON a.tag_id = t.tag_id
         WHERE a.timestamp >= ?
           AND (t.tag_type = 'material' OR t.tag_type = 'agv')
         GROUP BY a.zone_id, b.zone_id
         ORDER BY transition_count DESC
         LIMIT 50`,
        [cutoff]
      );

      return (rows as unknown as Array<Record<string, unknown>>).map((row: Record<string, unknown>) => ({
        fromZone: String(row.from_zone),
        toZone: String(row.to_zone),
        count: parseInt(String(row.transition_count)) || 0,
      }));
    }),

  /**
   * 获取摄像头-UWB区域联动
   */
  getCameraUwbLinkage: protectedProcedure
    .query(async () => {
      const db = await getDb();

      const [rows] = await asMysqlCompat(db).execute(
        `SELECT
           cl.zone_id,
           z.zone_name,
           cl.camera_id,
           c.camera_code,
           c.camera_name,
           c.status as camera_status
         FROM uwb_zone_camera_links cl
         JOIN uwb_zones z ON cl.zone_id = z.zone_code
         LEFT JOIN cameras c ON cl.camera_id = c.id
         ORDER BY cl.zone_id`
      );

      return (rows as unknown as Array<Record<string, unknown>>).map((row: Record<string, unknown>) => ({
        zoneId: String(row.zone_id),
        zoneName: String(row.zone_name || ''),
        cameraId: parseInt(String(row.camera_id)) || 0,
        cameraCode: String(row.camera_code || ''),
        cameraName: String(row.camera_name || ''),
        cameraStatus: String(row.camera_status || 'offline'),
      }));
    }),

  /**
   * 关联摄像头到区域
   */
  linkCameraToZone: requirePermission('mfg:uwb:manage')
    .input(z.object({
      zoneId: z.string(),
      cameraId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await asMysqlCompat(db).execute(
        `INSERT INTO uwb_zone_camera_links (zone_id, camera_id, created_at)
         VALUES (?, ?, NOW())`,
        [input.zoneId, input.cameraId]
      );
      return { success: true, message: '摄像头已关联到区域' };
    }),

  /**
   * 告警看板汇总（低电量+丢失标签+区域超员）
   */
  getAlertDashboard: protectedProcedure
    .query(async () => {
      const db = await getDb();
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Low battery (<20%)
      const [lowBattery] = await asMysqlCompat(db).execute(
        `SELECT t.tag_id, u.name as employee_name, t.battery_level
         FROM uwb_tag_bindings t
         LEFT JOIN users u ON t.employee_id = u.id
         WHERE t.battery_level <= 20 AND t.battery_level > 0
         ORDER BY t.battery_level ASC
         LIMIT 20`
      );

      // Lost tags (>30min offline)
      const [lostTags] = await asMysqlCompat(db).execute(
        `SELECT t.tag_id, u.name as employee_name, t.last_seen
         FROM uwb_tag_bindings t
         LEFT JOIN users u ON t.employee_id = u.id
         WHERE (t.last_seen < ? OR t.last_seen IS NULL) AND t.status != 'unbound'
         ORDER BY t.last_seen ASC
         LIMIT 20`,
        [thirtyMinutesAgo]
      );

      // Zone capacity violations
      const [zoneViolations] = await asMysqlCompat(db).execute(
        `SELECT
           z.zone_code as zone_id,
           z.zone_name,
           z.capacity as max_capacity,
           COUNT(DISTINCT l.tag_id) as current_count
         FROM uwb_zones z
         JOIN uwb_location_records l ON l.zone_id = z.zone_code AND l.timestamp >= ?
         GROUP BY z.zone_code, z.zone_name, z.capacity
         HAVING COUNT(DISTINCT l.tag_id) > z.capacity
         LIMIT 20`,
        [fiveMinutesAgo]
      );

      return {
        lowBattery: (lowBattery as unknown as Array<Record<string, unknown>>).map((r: Record<string, unknown>) => ({
          tagId: String(r.tag_id),
          employeeName: String(r.employee_name || '未绑定'),
          batteryLevel: parseInt(String(r.battery_level)) || 0,
          severity: (parseInt(String(r.battery_level)) || 0) <= 10 ? 'critical' as const : 'warning' as const,
        })),
        lostTags: (lostTags as unknown as Array<Record<string, unknown>>).map((r: Record<string, unknown>) => ({
          tagId: String(r.tag_id),
          employeeName: String(r.employee_name || '未绑定'),
          lastSeen: r.last_seen ? new Date(String(r.last_seen)) : null,
        })),
        zoneViolations: (zoneViolations as unknown as Array<Record<string, unknown>>).map((r: Record<string, unknown>) => ({
          zoneId: String(r.zone_id),
          zoneName: String(r.zone_name),
          currentCount: parseInt(String(r.current_count)) || 0,
          maxCapacity: parseInt(String(r.max_capacity)) || 0,
        })),
        totalAlerts:
          (lowBattery as unknown[]).length +
          (lostTags as unknown[]).length +
          (zoneViolations as unknown[]).length,
      };
    }),

  /**
   * 获取车间地图配置（区域坐标+锚点位置）
   */
  getFloorMapConfig: protectedProcedure
    .query(async () => {
      const db = await getDb();

      const [zones] = await asMysqlCompat(db).execute(
        `SELECT
           zone_code, zone_name, zone_type, capacity,
           bounds_x_min, bounds_x_max, bounds_y_min, bounds_y_max,
           is_work_zone
         FROM uwb_zones
         ORDER BY zone_code`
      );

      const [anchors] = await asMysqlCompat(db).execute(
        `SELECT anchor_id, anchor_name, x_coordinate, y_coordinate, z_coordinate, status
         FROM uwb_anchors
         ORDER BY anchor_id
         LIMIT 50`
      );

      return {
        zones: (zones as unknown as Array<Record<string, unknown>>).map((z: Record<string, unknown>) => ({
          zoneCode: String(z.zone_code),
          zoneName: String(z.zone_name),
          zoneType: String(z.zone_type),
          capacity: parseInt(String(z.capacity)) || 0,
          bounds: {
            xMin: parseFloat(String(z.bounds_x_min)) || 0,
            xMax: parseFloat(String(z.bounds_x_max)) || 0,
            yMin: parseFloat(String(z.bounds_y_min)) || 0,
            yMax: parseFloat(String(z.bounds_y_max)) || 0,
          },
          isWorkZone: Boolean(z.is_work_zone),
        })),
        anchors: (anchors as unknown as Array<Record<string, unknown>>).map((a: Record<string, unknown>) => ({
          anchorId: String(a.anchor_id),
          anchorName: String(a.anchor_name || ''),
          x: parseFloat(String(a.x_coordinate)) || 0,
          y: parseFloat(String(a.y_coordinate)) || 0,
          z: a.z_coordinate ? parseFloat(String(a.z_coordinate)) : null,
          status: String(a.status || 'offline'),
        })),
      };
    }),

  /**
   * 获取AGV/物料标签实时位置
   */
  getAGVPositions: protectedProcedure
    .query(async () => {
      const db = await getDb();
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const [rows] = await asMysqlCompat(db).execute(
        `SELECT
           l.tag_id,
           t.tag_type,
           l.zone_id,
           l.zone_name,
           l.x_coordinate,
           l.y_coordinate,
           l.z_coordinate,
           l.timestamp
         FROM uwb_location_records l
         JOIN uwb_tag_bindings t ON l.tag_id = t.tag_id
         WHERE l.timestamp >= ?
           AND (t.tag_type = 'agv' OR t.tag_type = 'material')
         ORDER BY l.timestamp DESC`,
        [fiveMinutesAgo]
      );

      // Deduplicate: keep latest position per tag
      const latestByTag = new Map<string, Record<string, unknown>>();
      for (const row of rows as unknown as Array<Record<string, unknown>>) {
        const tagId = String(row.tag_id);
        if (!latestByTag.has(tagId)) {
          latestByTag.set(tagId, {
            tagId,
            tagType: String(row.tag_type),
            zoneId: String(row.zone_id),
            zoneName: String(row.zone_name),
            x: parseFloat(String(row.x_coordinate)),
            y: parseFloat(String(row.y_coordinate)),
            z: row.z_coordinate ? parseFloat(String(row.z_coordinate)) : null,
            timestamp: new Date(String(row.timestamp)),
          });
        }
      }

      return Array.from(latestByTag.values());
    }),
});
