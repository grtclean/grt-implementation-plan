/**
 * 年度企业日程 tRPC路由
 * 支持Microsoft Graph日历同步
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import {
  createCalendarEvent,
  getCalendarEvents,
  validateCredentials,
} from "../services/microsoft-graph";

/**
 * 同步事件到Microsoft Graph日历
 */
async function syncEventToGraph(eventId: any, input: any): Promise<{ success: boolean; graphEventId?: string }> {
  try {
    const result = await createCalendarEvent('me', {
      subject: input.title,
      start: input.startTime,
      end: input.endTime,
      body: input.description,
    } as any);
    return { success: true, graphEventId: (result as any)?.id };
  } catch (error) {
    console.error('Failed to sync event to Graph:', error);
    return { success: false };
  }
}

// 日程类型枚举
const eventTypeEnum = z.enum([
  'Q4_Strategy',
  'Q1_Kickoff',
  'Monthly_Review',
  'Weekly_Check',
  'Department_Meeting',
  'Training',
  'Holiday',
  'Custom'
]);

const eventStatusEnum = z.enum(['pending', 'completed', 'cancelled', 'shifted']);
const recurrenceTypeEnum = z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']);

export const annualAgendaRouter = router({
  // 获取年度日程列表
  list: protectedProcedure
    .input(z.object({
      year: z.number().default(2026),
      month: z.number().optional(),
      eventType: eventTypeEnum.optional(),
      department: z.string().optional(),
      status: eventStatusEnum.optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { year = 2026, month, eventType, department, status, page = 1, pageSize = 50 } = input || {};
      
      let whereClause = `WHERE YEAR(scheduled_date) = ${year}`;
      if (month) whereClause += ` AND MONTH(scheduled_date) = ${month}`;
      if (eventType) whereClause += ` AND event_type = '${eventType}'`;
      if (department) whereClause += ` AND (department = '${department}' OR department = 'All')`;
      if (status) whereClause += ` AND status = '${status}'`;
      
      const offset = (page - 1) * pageSize;
      
      const [events, countResult] = await Promise.all([
        db.execute(sql.raw(`SELECT * FROM annual_agenda_events ${whereClause} ORDER BY scheduled_date ASC LIMIT ${pageSize} OFFSET ${offset}`)),
        db.execute(sql.raw(`SELECT COUNT(*) as total FROM annual_agenda_events ${whereClause}`))
      ]);
      
      return {
        items: events[0] as any[],
        total: (countResult[0] as any[])[0]?.total || 0,
        page,
        pageSize,
      };
    }),

  // 获取单个日程详情
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql.raw(`SELECT * FROM annual_agenda_events WHERE id = ${input.id}`));
      return (result[0] as any[])[0] || null;
    }),

  // 创建日程
  create: protectedProcedure
    .input(z.object({
      eventCode: z.string(),
      name: z.string(),
      nameEn: z.string().optional(),
      eventType: eventTypeEnum,
      scheduledDate: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      department: z.string().default('All'),
      attendeeLevel: z.string().optional(),
      location: z.string().optional(),
      description: z.string().optional(),
      recurrenceType: recurrenceTypeEnum.default('none'),
      recurrenceEndDate: z.string().optional(),
      syncToGraph: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      
      const result = await db.execute(sql.raw(`
        INSERT INTO annual_agenda_events (
          event_code, name, name_en, event_type, scheduled_date, start_time, end_time,
          department, attendee_level, location, description, recurrence_type, recurrence_end_date, created_by
        ) VALUES (
          '${input.eventCode}', '${input.name}', ${input.nameEn ? `'${input.nameEn}'` : 'NULL'},
          '${input.eventType}', '${input.scheduledDate}', ${input.startTime ? `'${input.startTime}'` : 'NULL'},
          ${input.endTime ? `'${input.endTime}'` : 'NULL'}, '${input.department}',
          ${input.attendeeLevel ? `'${input.attendeeLevel}'` : 'NULL'},
          ${input.location ? `'${input.location}'` : 'NULL'},
          ${input.description ? `'${input.description}'` : 'NULL'},
          '${input.recurrenceType}', ${input.recurrenceEndDate ? `'${input.recurrenceEndDate}'` : 'NULL'},
          ${ctx.user?.id || 'NULL'}
        )
      `));
      
      const insertId = (result[0] as any).insertId;
      
      // 如果需要同步到Microsoft Graph
      if (input.syncToGraph) {
        const graphResult = await syncEventToGraph(insertId, input);
        if (graphResult.success && graphResult.graphEventId) {
          await db.execute(sql.raw(`
            UPDATE annual_agenda_events 
            SET graph_event_id = '${graphResult.graphEventId}', graph_sync_status = 'synced', graph_synced_at = NOW()
            WHERE id = ${insertId}
          `));
        }
      }
      
      return { success: true, id: insertId };
    }),

  // 更新日程
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      scheduledDate: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      status: eventStatusEnum.optional(),
      location: z.string().optional(),
      description: z.string().optional(),
      shiftReason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const updates: string[] = [];
      
      if (input.name) updates.push(`name = '${input.name}'`);
      if (input.scheduledDate) updates.push(`scheduled_date = '${input.scheduledDate}'`);
      if (input.startTime) updates.push(`start_time = '${input.startTime}'`);
      if (input.endTime) updates.push(`end_time = '${input.endTime}'`);
      if (input.status) updates.push(`status = '${input.status}'`);
      if (input.location) updates.push(`location = '${input.location}'`);
      if (input.description !== undefined) updates.push(`description = ${input.description ? `'${input.description}'` : 'NULL'}`);
      if (input.shiftReason) {
        updates.push(`is_shifted = 1`);
        updates.push(`shift_reason = '${input.shiftReason}'`);
      }
      
      if (updates.length === 0) return { success: false, message: "No fields to update" };
      
      await db.execute(sql.raw(`UPDATE annual_agenda_events SET ${updates.join(', ')} WHERE id = ${input.id}`));
      return { success: true };
    }),

  // 删除日程
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql.raw(`DELETE FROM annual_agenda_events WHERE id = ${input.id}`));
      return { success: true };
    }),

  // 同步单个日程到Microsoft Graph
  syncToGraph: protectedProcedure
    .input(z.object({ id: z.number(), userId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      
      // 获取日程详情
      const eventResult = await db.execute(sql.raw(`SELECT * FROM annual_agenda_events WHERE id = ${input.id}`));
      const event = (eventResult[0] as any[])[0];
      if (!event) return { success: false, error: "Event not found" };
      
      // 检查Graph API配置
      const credentials = await validateCredentials();
      if (!credentials.valid) {
        return { success: false, error: "Microsoft Graph API not configured" };
      }
      
      try {
        // 构建Graph事件数据
        const startDateTime = event.start_time 
          ? `${event.scheduled_date}T${event.start_time}` 
          : `${event.scheduled_date}T09:00:00`;
        const endDateTime = event.end_time 
          ? `${event.scheduled_date}T${event.end_time}` 
          : `${event.scheduled_date}T10:00:00`;
        
        const graphEvent = await createCalendarEvent(input.userId, {
          subject: event.name,
          start: { dateTime: startDateTime, timeZone: "Asia/Shanghai" },
          end: { dateTime: endDateTime, timeZone: "Asia/Shanghai" },
          location: event.location ? { displayName: event.location } : undefined,
          bodyPreview: event.description,
        });
        
        if (graphEvent && graphEvent.id) {
          await db.execute(sql.raw(`
            UPDATE annual_agenda_events 
            SET graph_event_id = '${graphEvent.id}', graph_sync_status = 'synced', graph_synced_at = NOW()
            WHERE id = ${input.id}
          `));
          return { success: true, graphEventId: graphEvent.id };
        }
        
        return { success: false, error: "Failed to create Graph event" };
      } catch (error) {
        await db.execute(sql.raw(`
          UPDATE annual_agenda_events 
          SET graph_sync_status = 'failed'
          WHERE id = ${input.id}
        `));
        return { success: false, error: String(error) };
      }
    }),

  // 批量同步到Microsoft Graph
  batchSyncToGraph: protectedProcedure
    .input(z.object({
      eventIds: z.array(z.number()),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const results: { id: number; success: boolean; error?: string }[] = [];
      
      // 检查Graph API配置
      const credentials = await validateCredentials();
      if (!credentials.valid) {
        return { success: false, error: "Microsoft Graph API not configured", results: [] };
      }
      
      for (const eventId of input.eventIds) {
        const eventResult = await db.execute(sql.raw(`SELECT * FROM annual_agenda_events WHERE id = ${eventId}`));
        const event = (eventResult[0] as any[])[0];
        
        if (!event) {
          results.push({ id: eventId, success: false, error: "Event not found" });
          continue;
        }
        
        try {
          const startDateTime = event.start_time 
            ? `${event.scheduled_date}T${event.start_time}` 
            : `${event.scheduled_date}T09:00:00`;
          const endDateTime = event.end_time 
            ? `${event.scheduled_date}T${event.end_time}` 
            : `${event.scheduled_date}T10:00:00`;
          
          const graphEvent = await createCalendarEvent(input.userId, {
            subject: event.name,
            start: { dateTime: startDateTime, timeZone: "Asia/Shanghai" },
            end: { dateTime: endDateTime, timeZone: "Asia/Shanghai" },
            location: event.location ? { displayName: event.location } : undefined,
            bodyPreview: event.description,
          });
          
          if (graphEvent && graphEvent.id) {
            await db.execute(sql.raw(`
              UPDATE annual_agenda_events 
              SET graph_event_id = '${graphEvent.id}', graph_sync_status = 'synced', graph_synced_at = NOW()
              WHERE id = ${eventId}
            `));
            results.push({ id: eventId, success: true });
          } else {
            results.push({ id: eventId, success: false, error: "Failed to create Graph event" });
          }
        } catch (error) {
          await db.execute(sql.raw(`
            UPDATE annual_agenda_events 
            SET graph_sync_status = 'failed'
            WHERE id = ${eventId}
          `));
          results.push({ id: eventId, success: false, error: String(error) });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      return { 
        success: successCount > 0, 
        message: `成功同步 ${successCount}/${results.length} 个日程`,
        results 
      };
    }),

  // 从Microsoft Graph拉取日程
  pullFromGraph: protectedProcedure
    .input(z.object({
      userId: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      
      // 检查Graph API配置
      const credentials = await validateCredentials();
      if (!credentials.valid) {
        return { success: false, error: "Microsoft Graph API not configured", imported: 0 };
      }
      
      try {
        const graphEvents = await getCalendarEvents(input.userId, input.startDate, input.endDate);
        let importedCount = 0;
        
        for (const graphEvent of graphEvents || []) {
          // 检查是否已存在
          const existingResult = await db.execute(sql.raw(`
            SELECT id FROM annual_agenda_events WHERE graph_event_id = '${graphEvent.id}'
          `));
          
          if ((existingResult[0] as any[]).length > 0) continue;
          
          // 提取日期和时间
          const startDate = graphEvent.start?.dateTime?.split('T')[0] || '';
          const startTime = graphEvent.start?.dateTime?.split('T')[1]?.substring(0, 8) || null;
          const endTime = graphEvent.end?.dateTime?.split('T')[1]?.substring(0, 8) || null;
          
          // 创建新日程
          await db.execute(sql.raw(`
            INSERT INTO annual_agenda_events (
              event_code, name, event_type, scheduled_date, start_time, end_time,
              location, description, graph_event_id, graph_sync_status, graph_synced_at, created_by
            ) VALUES (
              'GRAPH-${Date.now()}-${importedCount}', '${graphEvent.subject?.replace(/'/g, "''")}',
              'Custom', '${startDate}', ${startTime ? `'${startTime}'` : 'NULL'},
              ${endTime ? `'${endTime}'` : 'NULL'},
              ${graphEvent.location?.displayName ? `'${graphEvent.location.displayName.replace(/'/g, "''")}'` : 'NULL'},
              ${graphEvent.bodyPreview ? `'${graphEvent.bodyPreview.substring(0, 500).replace(/'/g, "''")}'` : 'NULL'},
              '${graphEvent.id}', 'synced', NOW(), ${ctx.user?.id || 'NULL'}
            )
          `));
          
          importedCount++;
        }
        
        return { success: true, imported: importedCount };
      } catch (error) {
        return { success: false, error: String(error), imported: 0 };
      }
    }),

  // 获取Graph API配置状态
  getGraphStatus: protectedProcedure.query(async () => {
    const credentials = await validateCredentials();
    return {
      configured: credentials.valid,
      message: credentials.valid 
        ? "Microsoft Graph API 已配置" 
        : "Microsoft Graph API 未配置，请在设置中配置Azure AD凭据",
    };
  }),

  // 获取Graph同步状态（前端使用）
  getGraphSyncStatus: protectedProcedure.query(async () => {
    const credentials = await validateCredentials();
    return {
      isConfigured: credentials.valid,
      message: credentials.valid 
        ? "Microsoft Graph API 已配置" 
        : "Microsoft Graph API 未配置",
    };
  }),

  // 更新日程状态
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: eventStatusEnum,
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql.raw(`UPDATE annual_agenda_events SET status = '${input.status}' WHERE id = ${input.id}`));
      return { success: true };
    }),

  // 批量同步年度日程到Graph（简化版，不需要userId）
  syncAllToGraph: protectedProcedure
    .input(z.object({
      year: z.number().default(2026),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      
      // 检查Graph API配置
      const credentials = await validateCredentials();
      if (!credentials.valid) {
        return { success: false, error: "Microsoft Graph API not configured", synced: 0 };
      }
      
      // 获取未同步的日程
      const eventsResult = await db.execute(sql.raw(`
        SELECT * FROM annual_agenda_events 
        WHERE YEAR(scheduled_date) = ${input.year} 
        AND (graph_sync_status IS NULL OR graph_sync_status = 'pending' OR graph_sync_status = 'failed')
      `));
      
      const events = eventsResult[0] as any[];
      let syncedCount = 0;
      
      for (const event of events) {
        try {
          const startDateTime = event.start_time 
            ? `${event.scheduled_date.toISOString().split('T')[0]}T${event.start_time}` 
            : `${event.scheduled_date.toISOString().split('T')[0]}T09:00:00`;
          const endDateTime = event.end_time 
            ? `${event.scheduled_date.toISOString().split('T')[0]}T${event.end_time}` 
            : `${event.scheduled_date.toISOString().split('T')[0]}T10:00:00`;
          
          const graphEvent = await createCalendarEvent("me", {
            subject: event.name,
            start: { dateTime: startDateTime, timeZone: "Asia/Shanghai" },
            end: { dateTime: endDateTime, timeZone: "Asia/Shanghai" },
            location: event.location ? { displayName: event.location } : undefined,
            bodyPreview: event.description,
          });
          
          if (graphEvent && graphEvent.id) {
            await db.execute(sql.raw(`
              UPDATE annual_agenda_events 
              SET graph_event_id = '${graphEvent.id}', graph_sync_status = 'synced', graph_synced_at = NOW()
              WHERE id = ${event.id}
            `));
            syncedCount++;
          }
        } catch (error) {
          await db.execute(sql.raw(`
            UPDATE annual_agenda_events 
            SET graph_sync_status = 'failed'
            WHERE id = ${event.id}
          `));
        }
      }
      
      return { success: true, synced: syncedCount, total: events.length };
    }),

  // 从 Graph 拉取日程（简化版）
  pullAllFromGraph: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      
      // 检查Graph API配置
      const credentials = await validateCredentials();
      if (!credentials.valid) {
        return { success: false, error: "Microsoft Graph API not configured", imported: 0 };
      }
      
      try {
        const graphEvents = await getCalendarEvents("me", input.startDate, input.endDate);
        let importedCount = 0;
        
        for (const graphEvent of graphEvents || []) {
          // 检查是否已存在
          const existingResult = await db.execute(sql.raw(`
            SELECT id FROM annual_agenda_events WHERE graph_event_id = '${graphEvent.id}'
          `));
          
          if ((existingResult[0] as any[]).length > 0) continue;
          
          // 提取日期和时间
          const startDate = graphEvent.start?.dateTime?.split('T')[0] || '';
          const startTime = graphEvent.start?.dateTime?.split('T')[1]?.substring(0, 8) || null;
          const endTime = graphEvent.end?.dateTime?.split('T')[1]?.substring(0, 8) || null;
          
          // 创建新日程
          await db.execute(sql.raw(`
            INSERT INTO annual_agenda_events (
              event_code, name, event_type, scheduled_date, start_time, end_time,
              location, description, graph_event_id, graph_sync_status, graph_synced_at, created_by
            ) VALUES (
              'GRAPH-${Date.now()}-${importedCount}', '${graphEvent.subject?.replace(/'/g, "''") || 'Untitled'}',
              'Custom', '${startDate}', ${startTime ? `'${startTime}'` : 'NULL'},
              ${endTime ? `'${endTime}'` : 'NULL'},
              ${graphEvent.location?.displayName ? `'${graphEvent.location.displayName.replace(/'/g, "''")}'` : 'NULL'},
              ${graphEvent.bodyPreview ? `'${graphEvent.bodyPreview.substring(0, 500).replace(/'/g, "''")}'` : 'NULL'},
              '${graphEvent.id}', 'synced', NOW(), ${ctx.user?.id || 'NULL'}
            )
          `));
          
          importedCount++;
        }
        
        return { success: true, imported: importedCount };
      } catch (error) {
        return { success: false, error: String(error), imported: 0 };
      }
    }),

  // 拖拽调整日程日期
  reschedule: protectedProcedure
    .input(z.object({
      id: z.number(),
      newDate: z.string(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      
      // 获取原日程信息
      const eventResult = await db.execute(sql.raw(`SELECT * FROM annual_agenda_events WHERE id = ${input.id}`));
      const event = (eventResult[0] as any[])[0];
      if (!event) return { success: false, error: "日程不存在" };
      
      const originalDate = event.scheduled_date?.toISOString?.()?.split('T')[0] || event.scheduled_date;
      
      // 记录调整历史
      const historyEntry = JSON.stringify({
        originalDate,
        newDate: input.newDate,
        reason: input.reason,
        adjustedAt: new Date().toISOString(),
        adjustedBy: ctx.user?.id || null,
      });
      
      // 更新日程
      await db.execute(sql.raw(`
        UPDATE annual_agenda_events 
        SET scheduled_date = '${input.newDate}',
            is_shifted = 1,
            shift_reason = '${input.reason.replace(/'/g, "''")}',
            status = 'shifted'
        WHERE id = ${input.id}
      `));
      
      return { 
        success: true, 
        originalDate,
        newDate: input.newDate,
        reason: input.reason,
      };
    }),

  // 检测日程冲突
  checkConflicts: protectedProcedure
    .input(z.object({
      date: z.string(),
      excludeId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      
      let whereClause = `WHERE DATE(scheduled_date) = '${input.date}'`;
      if (input.excludeId) {
        whereClause += ` AND id != ${input.excludeId}`;
      }
      
      const result = await db.execute(sql.raw(`
        SELECT * FROM annual_agenda_events ${whereClause} ORDER BY start_time ASC
      `));
      
      const events = result[0] as any[];
      const conflicts: any[] = [];
      
      // 检查重要会议冲突（同一天有多个重要会议）
      const importantTypes = ['Q4_Strategy', 'Q1_Kickoff', 'Monthly_Review'];
      const importantEvents = events.filter(e => importantTypes.includes(e.event_type));
      
      if (importantEvents.length > 1) {
        conflicts.push({
          type: 'multiple_important',
          message: `同一天有 ${importantEvents.length} 个重要会议`,
          events: importantEvents.map(e => ({ id: e.id, name: e.name, type: e.event_type })),
        });
      }
      
      // 检查时间重叠
      for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
          const e1 = events[i];
          const e2 = events[j];
          
          if (e1.start_time && e1.end_time && e2.start_time && e2.end_time) {
            const start1 = e1.start_time;
            const end1 = e1.end_time;
            const start2 = e2.start_time;
            const end2 = e2.end_time;
            
            // 检查时间重叠
            if (start1 < end2 && start2 < end1) {
              conflicts.push({
                type: 'time_overlap',
                message: `时间冲突: ${e1.name} 与 ${e2.name}`,
                events: [
                  { id: e1.id, name: e1.name, time: `${start1}-${end1}` },
                  { id: e2.id, name: e2.name, time: `${start2}-${end2}` },
                ],
              });
            }
          }
        }
      }
      
      // 检查部门人员冲突（同一部门同一时间多个会议）
      const deptGroups: Record<string, any[]> = {};
      events.forEach(e => {
        if (e.department && e.department !== 'All') {
          if (!deptGroups[e.department]) deptGroups[e.department] = [];
          deptGroups[e.department].push(e);
        }
      });
      
      Object.entries(deptGroups).forEach(([dept, deptEvents]) => {
        if (deptEvents.length > 1) {
          conflicts.push({
            type: 'department_conflict',
            message: `${dept}部门同一天有 ${deptEvents.length} 个会议`,
            events: deptEvents.map(e => ({ id: e.id, name: e.name })),
          });
        }
      });
      
      return {
        date: input.date,
        totalEvents: events.length,
        hasConflicts: conflicts.length > 0,
        conflicts,
        events: events.map(e => ({
          id: e.id,
          name: e.name,
          type: e.event_type,
          startTime: e.start_time,
          endTime: e.end_time,
          department: e.department,
        })),
      };
    }),

  // 导出年度日程
  exportAgenda: protectedProcedure
    .input(z.object({
      year: z.number().default(2026),
      format: z.enum(['json', 'csv']),
      department: z.string().optional(),
      eventType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      
      let whereClause = `WHERE YEAR(scheduled_date) = ${input.year}`;
      if (input.department) whereClause += ` AND (department = '${input.department}' OR department = 'All')`;
      if (input.eventType) whereClause += ` AND event_type = '${input.eventType}'`;
      
      const result = await db.execute(sql.raw(`
        SELECT * FROM annual_agenda_events ${whereClause} ORDER BY scheduled_date ASC
      `));
      
      const events = (result[0] as any[]).map(e => ({
        eventCode: e.event_code,
        name: e.name,
        nameEn: e.name_en,
        eventType: e.event_type,
        scheduledDate: e.scheduled_date?.toISOString?.()?.split('T')[0] || e.scheduled_date,
        startTime: e.start_time,
        endTime: e.end_time,
        department: e.department,
        attendeeLevel: e.attendee_level,
        location: e.location,
        description: e.description,
        status: e.status,
        isShifted: e.is_shifted,
        shiftReason: e.shift_reason,
        graphSyncStatus: e.graph_sync_status,
      }));
      
      if (input.format === 'csv') {
        const headers = [
          '日程编码', '名称', '英文名称', '类型', '日期', '开始时间', '结束时间',
          '部门', '参与级别', '地点', '描述', '状态', '是否调整', '调整原因', '同步状态'
        ];
        
        const rows = events.map(e => [
          e.eventCode, e.name, e.nameEn || '', e.eventType, e.scheduledDate,
          e.startTime || '', e.endTime || '', e.department, e.attendeeLevel || '',
          e.location || '', e.description || '', e.status, e.isShifted ? '是' : '否',
          e.shiftReason || '', e.graphSyncStatus || ''
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
        
        return {
          format: 'csv',
          filename: `annual-agenda-${input.year}.csv`,
          content: csvContent,
          totalEvents: events.length,
        };
      }
      
      return {
        format: 'json',
        filename: `annual-agenda-${input.year}.json`,
        content: JSON.stringify(events, null, 2),
        totalEvents: events.length,
        events,
      };
    }),

  // 获取统计数据
  getStats: protectedProcedure
    .input(z.object({ year: z.number().default(2026) }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const year = input?.year || 2026;
      
      const result = await db.execute(sql.raw(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN is_shifted = 1 THEN 1 ELSE 0 END) as shifted,
          SUM(CASE WHEN graph_sync_status = 'synced' THEN 1 ELSE 0 END) as synced
        FROM annual_agenda_events
        WHERE YEAR(scheduled_date) = ${year}
      `));
      
      const stats = (result[0] as any[])[0];
      
      // 按类型统计
      const byTypeResult = await db.execute(sql.raw(`
        SELECT event_type, COUNT(*) as count
        FROM annual_agenda_events
        WHERE YEAR(scheduled_date) = ${year}
        GROUP BY event_type
      `));
      
      // 按部门统计
      const byDeptResult = await db.execute(sql.raw(`
        SELECT department, COUNT(*) as count
        FROM annual_agenda_events
        WHERE YEAR(scheduled_date) = ${year}
        GROUP BY department
      `));
      
      return {
        ...stats,
        byType: byTypeResult[0] as any[],
        byDepartment: byDeptResult[0] as any[],
      };
    }),

  // 生成年度日程（基于模板）
  generateYearAgenda: protectedProcedure
    .input(z.object({ 
      year: z.number(),
      includeHolidays: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const year = input.year;
      let createdCount = 0;
      
      // Q4战略会议
      await db.execute(sql.raw(`
        INSERT INTO annual_agenda_events (event_code, name, name_en, event_type, scheduled_date, start_time, end_time, department, attendee_level, description, created_by)
        VALUES ('Q4-STRATEGY-${year}', 'Q4战略规划会议', 'Q4 Strategy Planning', 'Q4_Strategy', '${year}-12-04', '09:00:00', '17:00:00', 'All', 'Director+', '制定下一年度战略目标和预算', ${ctx.user?.id || 'NULL'})
      `));
      createdCount++;
      
      // Q1启动会议
      await db.execute(sql.raw(`
        INSERT INTO annual_agenda_events (event_code, name, name_en, event_type, scheduled_date, start_time, end_time, department, attendee_level, description, created_by)
        VALUES ('Q1-KICKOFF-${year}', 'Q1启动会议', 'Q1 Kickoff Meeting', 'Q1_Kickoff', '${year}-01-05', '09:00:00', '12:00:00', 'All', 'Director+', '启动新年度工作，分解目标到各部门', ${ctx.user?.id || 'NULL'})
      `));
      createdCount++;
      
      // 月度评审（每月最后一个周五）
      for (let month = 1; month <= 12; month++) {
        const lastDay = new Date(year, month, 0);
        const dayOfWeek = lastDay.getDay();
        const diff = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2;
        const friday = new Date(year, month - 1, lastDay.getDate() - diff);
        const dateStr = friday.toISOString().split('T')[0];
        
        await db.execute(sql.raw(`
          INSERT INTO annual_agenda_events (event_code, name, name_en, event_type, scheduled_date, start_time, end_time, department, attendee_level, description, created_by)
          VALUES ('MONTHLY-REVIEW-${year}-${month.toString().padStart(2, '0')}', '${month}月经营评审', '${month} Monthly Business Review', 'Monthly_Review', '${dateStr}', '14:00:00', '17:00:00', 'All', 'Manager+', '回顾月度业绩，调整执行策略', ${ctx.user?.id || 'NULL'})
        `));
        createdCount++;
      }
      
      return { success: true, created: createdCount };
    }),

  // ==================== 模板管理接口 ====================
  
  // 获取模板列表
  listTemplates: protectedProcedure
    .input(z.object({
      frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let whereClause = 'WHERE 1=1';
      if (input?.frequency) whereClause += ` AND frequency = '${input.frequency}'`;
      if (input?.isActive !== undefined) whereClause += ` AND is_active = ${input.isActive ? 1 : 0}`;
      
      const result = await db.execute(sql.raw(`SELECT * FROM agenda_templates ${whereClause} ORDER BY frequency, name`));
      return (result[0] as any[]);
    }),

  // 创建模板
  createTemplate: protectedProcedure
    .input(z.object({
      templateCode: z.string(),
      name: z.string(),
      nameEn: z.string().optional(),
      eventType: eventTypeEnum.default('Custom'),
      frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
      dayOfWeek: z.number().optional(),
      dayOfMonth: z.number().optional(),
      monthOfYear: z.number().optional(),
      startTime: z.string().default('09:00'),
      endTime: z.string().default('10:00'),
      durationMinutes: z.number().default(60),
      department: z.string().default('All'),
      attendeeLevel: z.string().optional(),
      location: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      
      await db.execute(sql.raw(`
        INSERT INTO agenda_templates (
          template_code, name, name_en, event_type, frequency, day_of_week, day_of_month, month_of_year,
          start_time, end_time, duration_minutes, department, attendee_level, location, description, created_by
        ) VALUES (
          '${input.templateCode}', '${input.name}', ${input.nameEn ? `'${input.nameEn}'` : 'NULL'},
          '${input.eventType}', '${input.frequency}', ${input.dayOfWeek ?? 'NULL'}, ${input.dayOfMonth ?? 'NULL'},
          ${input.monthOfYear ?? 'NULL'}, '${input.startTime}', '${input.endTime}', ${input.durationMinutes},
          '${input.department}', ${input.attendeeLevel ? `'${input.attendeeLevel}'` : 'NULL'},
          ${input.location ? `'${input.location}'` : 'NULL'}, ${input.description ? `'${input.description}'` : 'NULL'},
          ${ctx.user?.id || 'NULL'}
        )
      `));
      
      return { success: true };
    }),

  // 更新模板
  updateTemplate: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nameEn: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      department: z.string().optional(),
      location: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const updates: string[] = [];
      
      if (input.name) updates.push(`name = '${input.name}'`);
      if (input.nameEn !== undefined) updates.push(`name_en = ${input.nameEn ? `'${input.nameEn}'` : 'NULL'}`);
      if (input.startTime) updates.push(`start_time = '${input.startTime}'`);
      if (input.endTime) updates.push(`end_time = '${input.endTime}'`);
      if (input.department) updates.push(`department = '${input.department}'`);
      if (input.location !== undefined) updates.push(`location = ${input.location ? `'${input.location}'` : 'NULL'}`);
      if (input.description !== undefined) updates.push(`description = ${input.description ? `'${input.description}'` : 'NULL'}`);
      if (input.isActive !== undefined) updates.push(`is_active = ${input.isActive ? 1 : 0}`);
      
      if (updates.length === 0) return { success: false, message: "No fields to update" };
      
      await db.execute(sql.raw(`UPDATE agenda_templates SET ${updates.join(', ')} WHERE id = ${input.id}`));
      return { success: true };
    }),

  // 删除模板
  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql.raw(`DELETE FROM agenda_templates WHERE id = ${input.id}`));
      return { success: true };
    }),

  // 从模板生成日程
  generateFromTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      year: z.number(),
      startMonth: z.number().default(1),
      endMonth: z.number().default(12),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      
      // 获取模板
      const templateResult = await db.execute(sql.raw(`SELECT * FROM agenda_templates WHERE id = ${input.templateId}`));
      const template = (templateResult[0] as any[])[0];
      if (!template) return { success: false, error: "Template not found", created: 0 };
      
      let createdCount = 0;
      const year = input.year;
      
      // 根据频率生成日程
      switch (template.frequency) {
        case 'weekly':
          // 每周生成
          for (let month = input.startMonth; month <= input.endMonth; month++) {
            const daysInMonth = new Date(year, month, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
              const date = new Date(year, month - 1, day);
              if (date.getDay() === (template.day_of_week || 1)) {
                const dateStr = date.toISOString().split('T')[0];
                const eventCode = `${template.template_code}-${year}-W${Math.ceil((day + new Date(year, month - 1, 1).getDay()) / 7)}-M${month}`;
                
                await db.execute(sql.raw(`
                  INSERT INTO annual_agenda_events (event_code, name, name_en, event_type, scheduled_date, start_time, end_time, department, attendee_level, description, created_by)
                  VALUES ('${eventCode}', '${template.name}', ${template.name_en ? `'${template.name_en}'` : 'NULL'}, '${template.event_type}', '${dateStr}', '${template.start_time}', '${template.end_time}', '${template.department}', ${template.attendee_level ? `'${template.attendee_level}'` : 'NULL'}, ${template.description ? `'${template.description}'` : 'NULL'}, ${ctx.user?.id || 'NULL'})
                `));
                createdCount++;
              }
            }
          }
          break;
          
        case 'monthly':
          // 每月生成
          for (let month = input.startMonth; month <= input.endMonth; month++) {
            const lastDay = new Date(year, month, 0);
            let targetDay = template.day_of_month || lastDay.getDate();
            if (targetDay > lastDay.getDate()) targetDay = lastDay.getDate();
            
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
            const eventCode = `${template.template_code}-${year}-${String(month).padStart(2, '0')}`;
            
            await db.execute(sql.raw(`
              INSERT INTO annual_agenda_events (event_code, name, name_en, event_type, scheduled_date, start_time, end_time, department, attendee_level, description, created_by)
              VALUES ('${eventCode}', '${template.name}', ${template.name_en ? `'${template.name_en}'` : 'NULL'}, '${template.event_type}', '${dateStr}', '${template.start_time}', '${template.end_time}', '${template.department}', ${template.attendee_level ? `'${template.attendee_level}'` : 'NULL'}, ${template.description ? `'${template.description}'` : 'NULL'}, ${ctx.user?.id || 'NULL'})
            `));
            createdCount++;
          }
          break;
          
        case 'quarterly':
          // 每季度生成
          const quarters = [1, 4, 7, 10];
          for (const qMonth of quarters) {
            if (qMonth >= input.startMonth && qMonth <= input.endMonth) {
              const dateStr = `${year}-${String(qMonth).padStart(2, '0')}-15`;
              const eventCode = `${template.template_code}-${year}-Q${Math.ceil(qMonth / 3)}`;
              
              await db.execute(sql.raw(`
                INSERT INTO annual_agenda_events (event_code, name, name_en, event_type, scheduled_date, start_time, end_time, department, attendee_level, description, created_by)
                VALUES ('${eventCode}', '${template.name}', ${template.name_en ? `'${template.name_en}'` : 'NULL'}, '${template.event_type}', '${dateStr}', '${template.start_time}', '${template.end_time}', '${template.department}', ${template.attendee_level ? `'${template.attendee_level}'` : 'NULL'}, ${template.description ? `'${template.description}'` : 'NULL'}, ${ctx.user?.id || 'NULL'})
              `));
              createdCount++;
            }
          }
          break;
          
        case 'yearly':
          // 每年生成一次
          const monthForYearly = template.month_of_year || 12;
          const dateStr = `${year}-${String(monthForYearly).padStart(2, '0')}-01`;
          const eventCode = `${template.template_code}-${year}`;
          
          await db.execute(sql.raw(`
            INSERT INTO annual_agenda_events (event_code, name, name_en, event_type, scheduled_date, start_time, end_time, department, attendee_level, description, created_by)
            VALUES ('${eventCode}', '${template.name}', ${template.name_en ? `'${template.name_en}'` : 'NULL'}, '${template.event_type}', '${dateStr}', '${template.start_time}', '${template.end_time}', '${template.department}', ${template.attendee_level ? `'${template.attendee_level}'` : 'NULL'}, ${template.description ? `'${template.description}'` : 'NULL'}, ${ctx.user?.id || 'NULL'})
          `));
          createdCount++;
          break;
      }
      
      return { success: true, created: createdCount };
    }),

  // ==================== 参与人员管理接口 ====================
  
  // 获取日程参与人员
  listAttendees: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql.raw(`SELECT * FROM event_attendees WHERE event_id = ${input.eventId} ORDER BY role, name`));
      return (result[0] as any[]);
    }),

  // 添加参与人员
  addAttendee: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      userId: z.number().optional(),
      name: z.string(),
      email: z.string().optional(),
      role: z.enum(['organizer', 'required', 'optional']).default('required'),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      
      await db.execute(sql.raw(`
        INSERT INTO event_attendees (event_id, user_id, name, email, role, notes)
        VALUES (${input.eventId}, ${input.userId ?? 'NULL'}, '${input.name}', ${input.email ? `'${input.email}'` : 'NULL'}, '${input.role}', ${input.notes ? `'${input.notes}'` : 'NULL'})
      `));
      
      return { success: true };
    }),

  // 更新参与人员状态
  updateAttendeeStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      responseStatus: z.enum(['pending', 'accepted', 'declined', 'tentative']),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      
      await db.execute(sql.raw(`
        UPDATE event_attendees 
        SET response_status = '${input.responseStatus}', responded_at = NOW()
        WHERE id = ${input.id}
      `));
      
      return { success: true };
    }),

  // 删除参与人员
  removeAttendee: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql.raw(`DELETE FROM event_attendees WHERE id = ${input.id}`));
      return { success: true };
    }),

  // 批量添加参与人员
  batchAddAttendees: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      attendees: z.array(z.object({
        userId: z.number().optional(),
        name: z.string(),
        email: z.string().optional(),
        role: z.enum(['organizer', 'required', 'optional']).default('required'),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      
      for (const attendee of input.attendees) {
        await db.execute(sql.raw(`
          INSERT INTO event_attendees (event_id, user_id, name, email, role)
          VALUES (${input.eventId}, ${attendee.userId ?? 'NULL'}, '${attendee.name}', ${attendee.email ? `'${attendee.email}'` : 'NULL'}, '${attendee.role}')
        `));
      }
      
      return { success: true, added: input.attendees.length };
    }),

  // 发送会议邀请
  sendInvitations: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      attendeeIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      
      // 获取日程信息
      const eventResult = await db.execute(sql.raw(`SELECT * FROM annual_agenda_events WHERE id = ${input.eventId}`));
      const event = (eventResult[0] as any[])[0];
      if (!event) return { success: false, error: "Event not found", sent: 0 };
      
      // 获取参与人员
      let attendeeQuery = `SELECT * FROM event_attendees WHERE event_id = ${input.eventId}`;
      if (input.attendeeIds && input.attendeeIds.length > 0) {
        attendeeQuery += ` AND id IN (${input.attendeeIds.join(',')})`;
      }
      const attendeesResult = await db.execute(sql.raw(attendeeQuery));
      const attendees = attendeesResult[0] as any[];
      
      // TODO: 集成邮件/钉钉发送邀请
      // 这里只记录邀请已发送
      for (const attendee of attendees) {
        await db.execute(sql.raw(`
          UPDATE event_attendees 
          SET notes = CONCAT(IFNULL(notes, ''), ' [邀请已发送: ${new Date().toISOString()}]')
          WHERE id = ${attendee.id}
        `));
      }
      
      return { success: true, sent: attendees.length };
    }),

  // 获取即将到期的日程（用于提醒）
  getUpcomingReminders: protectedProcedure
    .input(z.object({
      daysAhead: z.number().default(7),
      includeToday: z.boolean().default(true),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { daysAhead = 7, includeToday = true } = input || {};
      
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const whereClause = includeToday 
        ? `WHERE scheduled_date >= '${today}' AND scheduled_date <= '${futureDate}' AND status = 'pending'`
        : `WHERE scheduled_date > '${today}' AND scheduled_date <= '${futureDate}' AND status = 'pending'`;
      
      const result = await db.execute(sql.raw(`
        SELECT e.*, 
          DATEDIFF(e.scheduled_date, CURDATE()) as days_until,
          (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id) as attendee_count
        FROM annual_agenda_events e
        ${whereClause}
        ORDER BY e.scheduled_date ASC
      `));
      
      return (result[0] as any[]).map(event => ({
        ...event,
        reminderType: event.days_until === 0 ? 'today' 
          : event.days_until === 1 ? 'tomorrow'
          : event.days_until <= 3 ? 'soon'
          : 'upcoming'
      }));
    }),

  // 发送日程提醒通知
  sendReminder: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      channels: z.array(z.enum(['email', 'dingtalk', 'wechat', 'system'])).default(['system']),
      reminderType: z.enum(['1day', '1hour', '30min', 'custom']).default('1day'),
      customMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { sendNotification } = await import('../notification-service');
      
      // 获取日程详情
      const eventResult = await db.execute(sql.raw(`SELECT * FROM annual_agenda_events WHERE id = ${input.eventId}`));
      const event = (eventResult[0] as any[])[0];
      if (!event) return { success: false, error: 'Event not found' };
      
      // 获取参与人员
      const attendeesResult = await db.execute(sql.raw(`
        SELECT ea.*, u.name as user_name, u.email as user_email
        FROM event_attendees ea
        LEFT JOIN users u ON ea.user_id = u.id
        WHERE ea.event_id = ${input.eventId}
      `));
      const attendees = attendeesResult[0] as any[];
      
      const reminderTypeText: Record<string, string> = {
        '1day': '明天',
        '1hour': '1小时后',
        '30min': '30分钟后',
        'custom': ''
      };
      
      const message = {
        title: `日程提醒: ${event.name}`,
        content: input.customMessage || `
## 日程提醒

**日程名称**: ${event.name}
**时间**: ${event.scheduled_date} ${event.start_time || '09:00'} - ${event.end_time || '10:00'}
**地点**: ${event.location || '待定'}
**部门**: ${event.department}
**参与人数**: ${attendees.length}人

${reminderTypeText[input.reminderType] ? `此日程将于**${reminderTypeText[input.reminderType]}**开始，请做好准备。` : ''}

---
*此通知由GRT智能系统自动发送*
        `.trim(),
        severity: 'info' as const,
        timestamp: new Date().toISOString(),
      };
      
      const results = await sendNotification(message, input.channels as any);
      
      return { 
        success: results.some(r => r.success), 
        results,
        attendeesNotified: attendees.length
      };
    }),

  // 日程统计数据
  getStatistics: protectedProcedure
    .input(z.object({
      year: z.number().default(2026),
      groupBy: z.enum(['month', 'quarter', 'department', 'type', 'status']).default('month'),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { year = 2026, groupBy = 'month' } = input || {};
      
      // 基础统计
      const baseStatsResult = await db.execute(sql.raw(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN is_shifted = 1 THEN 1 ELSE 0 END) as shifted
        FROM annual_agenda_events
        WHERE YEAR(scheduled_date) = ${year}
      `));
      const baseStats = (baseStatsResult[0] as any[])[0];
      
      // 分组统计
      let groupQuery = '';
      switch (groupBy) {
        case 'month':
          groupQuery = `
            SELECT 
              MONTH(scheduled_date) as period,
              COUNT(*) as total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN is_shifted = 1 THEN 1 ELSE 0 END) as shifted
            FROM annual_agenda_events
            WHERE YEAR(scheduled_date) = ${year}
            GROUP BY MONTH(scheduled_date)
            ORDER BY period
          `;
          break;
        case 'quarter':
          groupQuery = `
            SELECT 
              QUARTER(scheduled_date) as period,
              COUNT(*) as total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN is_shifted = 1 THEN 1 ELSE 0 END) as shifted
            FROM annual_agenda_events
            WHERE YEAR(scheduled_date) = ${year}
            GROUP BY QUARTER(scheduled_date)
            ORDER BY period
          `;
          break;
        case 'department':
          groupQuery = `
            SELECT 
              department as period,
              COUNT(*) as total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN is_shifted = 1 THEN 1 ELSE 0 END) as shifted
            FROM annual_agenda_events
            WHERE YEAR(scheduled_date) = ${year}
            GROUP BY department
            ORDER BY total DESC
          `;
          break;
        case 'type':
          groupQuery = `
            SELECT 
              event_type as period,
              COUNT(*) as total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN is_shifted = 1 THEN 1 ELSE 0 END) as shifted
            FROM annual_agenda_events
            WHERE YEAR(scheduled_date) = ${year}
            GROUP BY event_type
            ORDER BY total DESC
          `;
          break;
        case 'status':
          groupQuery = `
            SELECT 
              status as period,
              COUNT(*) as total
            FROM annual_agenda_events
            WHERE YEAR(scheduled_date) = ${year}
            GROUP BY status
          `;
          break;
      }
      
      const groupStatsResult = await db.execute(sql.raw(groupQuery));
      
      // 参与度统计
      const participationResult = await db.execute(sql.raw(`
        SELECT 
          e.department,
          COUNT(DISTINCT ea.user_id) as unique_participants,
          COUNT(ea.id) as total_participations,
          AVG(CASE WHEN ea.response_status = 'accepted' THEN 1 ELSE 0 END) * 100 as acceptance_rate
        FROM annual_agenda_events e
        LEFT JOIN event_attendees ea ON e.id = ea.event_id
        WHERE YEAR(e.scheduled_date) = ${year}
        GROUP BY e.department
      `));
      
      return {
        year,
        summary: {
          total: baseStats.total || 0,
          completed: baseStats.completed || 0,
          pending: baseStats.pending || 0,
          cancelled: baseStats.cancelled || 0,
          shifted: baseStats.shifted || 0,
          completionRate: baseStats.total > 0 ? Math.round((baseStats.completed / baseStats.total) * 100) : 0,
          shiftRate: baseStats.total > 0 ? Math.round((baseStats.shifted / baseStats.total) * 100) : 0,
        },
        breakdown: groupStatsResult[0] as any[],
        participation: participationResult[0] as any[],
      };
    }),

  // 获取年度对比数据
  getYearComparison: protectedProcedure
    .input(z.object({
      years: z.array(z.number()).default([2025, 2026]),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { years = [2025, 2026] } = input || {};
      
      const comparisons = [];
      for (const year of years) {
        const result = await db.execute(sql.raw(`
          SELECT 
            ${year} as year,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN is_shifted = 1 THEN 1 ELSE 0 END) as shifted,
            COUNT(DISTINCT department) as departments_involved
          FROM annual_agenda_events
          WHERE YEAR(scheduled_date) = ${year}
        `));
        comparisons.push((result[0] as any[])[0]);
      }
      
      return comparisons;
    }),
});

