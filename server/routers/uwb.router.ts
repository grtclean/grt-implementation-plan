/**
 * UWB工时采集 tRPC 路由
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
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
  reportLocation: protectedProcedure
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
  reportBatchLocations: protectedProcedure
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
        String(ctx.user.id),
        input.startDate,
        input.endDate
      );
    }),

  /**
   * 获取今日工时概览
   */
  getTodayWorkHoursOverview: protectedProcedure
    .query(async () => {
      const db = await getDb();
      const today = new Date().toISOString().split('T')[0];

      const [rows] = await (db as any).execute(
        `SELECT 
           u.id as employee_id,
           u.name as employee_name,
           SUM(w.effective_minutes) as effective_minutes,
           SUM(w.total_minutes) as total_minutes
         FROM uwb_work_hours w
         JOIN users u ON w.employee_id = u.id
         WHERE w.work_date = ?
         GROUP BY u.id, u.name
         ORDER BY effective_minutes DESC`,
        [today]
      ) as any[];

      return rows.map((row: any) => ({
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        effectiveMinutes: parseInt(row.effective_minutes) || 0,
        totalMinutes: parseInt(row.total_minutes) || 0,
        effectiveHours: (parseInt(row.effective_minutes) || 0) / 60,
      }));
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
  createZone: protectedProcedure
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
  bindTag: protectedProcedure
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
  unbindTag: protectedProcedure
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
  syncToScheduling: protectedProcedure
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
  closeDayWorkHours: protectedProcedure
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

      const [rows] = await (db as any).execute(query, [startDate, endDate]) as any[];

      return rows.map((row: any) => ({
        groupId: row.group_id,
        groupName: row.group_name,
        effectiveMinutes: parseInt(row.effective_minutes) || 0,
        totalMinutes: parseInt(row.total_minutes) || 0,
        effectiveHours: (parseInt(row.effective_minutes) || 0) / 60,
        totalHours: (parseInt(row.total_minutes) || 0) / 60,
        utilizationRate: row.total_minutes > 0 
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
      const [rows] = await (db as any).execute(
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
      ) as any[];

      return rows.map((row: any) => ({
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
      const [rows] = await (db as any).execute(
        `SELECT u.id, u.name, u.department, u.position
         FROM users u
         WHERE u.id NOT IN (
           SELECT employee_id FROM uwb_tag_bindings WHERE status = 'active'
         )
         ORDER BY u.name`
      ) as any[];

      return rows.map((row: any) => ({
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

      const [rows] = await (db as any).execute(
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
      ) as any[];

      // 去重，只保留每个标签的最新位置
      const latestByTag = new Map();
      for (const row of rows) {
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
      
      const [rows] = await (db as any).execute(query, params) as any[];
      
      return rows.map((row: any) => ({
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
      const [rows] = await (db as any).execute(
        `SELECT DISTINCT DATE(timestamp) as date, COUNT(*) as point_count
         FROM uwb_location_records
         WHERE tag_id = ?
         GROUP BY DATE(timestamp)
         ORDER BY date DESC
         LIMIT 30`,
        [input.tagId]
      ) as any[];
      
      return rows.map((row: any) => ({
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
      
      const [rows] = await (db as any).execute(
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
      ) as any[];
      
      return rows.map((row: any) => ({
        tagId: row.tag_id,
        employeeId: row.employee_id,
        employeeName: row.employee_name || '未绑定',
        department: row.department || '',
        batteryLevel: row.battery_level,
        lastSeen: row.last_seen ? new Date(row.last_seen) : null,
        status: row.status,
        severity: row.battery_level <= 10 ? 'critical' : 'warning',
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
      
      const [rows] = await (db as any).execute(
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
      ) as any[];
      
      return rows.map((row: any) => {
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
  updateTagBattery: protectedProcedure
    .input(z.object({
      tagId: z.string(),
      batteryLevel: z.number().min(0).max(100),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await (db as any).execute(
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
  sendLowBatteryNotification: protectedProcedure
    .input(z.object({
      tagId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // 获取标签信息
      const [rows] = await (db as any).execute(
        `SELECT t.*, u.name as employee_name, u.email
         FROM uwb_tag_bindings t
         LEFT JOIN users u ON t.employee_id = u.id
         WHERE t.tag_id = ?`,
        [input.tagId]
      ) as any[];
      
      if (rows.length === 0) {
        throw new Error('标签不存在');
      }
      
      const tag = rows[0];
      
      // 记录通知日志
      await (db as any).execute(
        `INSERT INTO system_notifications (type, title, content, target_user_id, created_by, created_at)
         VALUES ('uwb_low_battery', '低电量告警', ?, ?, ?, NOW())`,
        [
          `UWB标签 ${tag.tag_id} 电量低 (${tag.battery_level}%)，绑定工人: ${tag.employee_name || '未绑定'}`,
          tag.employee_id,
          ctx.user.id
        ]
      );
      
      return { success: true, message: '通知已发送' };
    }),
});
