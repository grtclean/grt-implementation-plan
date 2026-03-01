/**
 * GRT 5.0 生产看板路由
 * 实现工单管理、设备状态、生产进度等功能
 *
 * Uses real database queries via Drizzle ORM.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { requireDb } from "../db";
import { eq, desc, and, or, count, sql } from "drizzle-orm";
import { productionWorkOrders, qcInspectionRecords } from "../../drizzle/schema";
import { productionEquipments, productionEquipmentStatusHistory } from "../../drizzle/production-equipment-schema";

// ===== Schema定义 =====

const WorkOrderSchema = z.object({
  orderCode: z.string().optional(),
  projectId: z.number().optional(),
  projectCode: z.string().optional(),
  projectName: z.string().optional(),
  productId: z.number().optional(),
  productCode: z.string().optional(),
  productName: z.string(),
  productModel: z.string().optional(),
  quantity: z.number().min(1),
  unit: z.string().default('台'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  assignedTeam: z.string().optional(),
  assignedLeaderId: z.number().optional(),
  assignedLeaderName: z.string().optional(),
  notes: z.string().optional(),
  customerId: z.number().optional(),
  customerName: z.string().optional(),
});

const QCRecordSchema = z.object({
  workOrderId: z.number(),
  checkType: z.enum(['incoming', 'process', 'final', 'patrol']),
  checkPoint: z.string(),
  totalItems: z.number(),
  passItems: z.number(),
  failItems: z.number(),
  result: z.enum(['pass', 'fail', 'conditional']),
  inspector: z.string(),
  notes: z.string().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string().optional(),
  })).optional(),
});

// 生成唯一编码
function generateCode(prefix: string): string {
  const year = new Date().getFullYear();
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix}-${year}-${ts}${rand}`;
}

/** Map DB work order row → API response shape */
function mapWorkOrder(row: any) {
  return {
    id: row.id,
    orderCode: row.workOrderCode,
    projectId: row.projectId,
    productName: row.productName,
    productModel: row.productModel,
    quantity: row.quantity,
    priority: row.priority,
    status: row.status,
    progress: row.completionRate ? Number(row.completionRate) : 0,
    plannedStartDate: row.plannedStartDate,
    plannedEndDate: row.plannedEndDate,
    actualStartDate: row.actualStartDate,
    actualEndDate: row.actualEndDate,
    estimatedHours: row.estimatedHours ? Number(row.estimatedHours) : 0,
    actualHours: row.actualHours ? Number(row.actualHours) : 0,
    assignedTeam: row.assignedTeam,
    assignedLeaderId: row.supervisorId,
    assignedLeaderName: null,
    notes: row.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ?? null,
  };
}

/** Map DB QC row → API response shape. Counts stored in checklistItems JSON. */
function mapQCRecord(row: any) {
  let checklist: any = {};
  if (row.checklistItems) {
    try { checklist = typeof row.checklistItems === 'string' ? JSON.parse(row.checklistItems) : row.checklistItems; } catch {}
  }
  return {
    id: row.id,
    workOrderId: row.workOrderId,
    workOrderCode: null,
    checkType: row.inspectionType,
    checkPoint: checklist.checkPoint || row.defectType || '',
    totalItems: checklist.totalItems ?? 0,
    passItems: checklist.passItems ?? 0,
    failItems: checklist.failItems ?? 0,
    result: row.result,
    inspector: row.inspectorName || '',
    inspectorId: row.inspectorId,
    notes: row.notes,
    checkedAt: row.inspectionTime ? new Date(row.inspectionTime).toISOString() : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
  };
}

/** Map equipment row → API response shape */
function mapEquipment(row: any) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    status: row.status,
    location: row.location,
    currentWorkOrderId: row.currentWorkOrderId,
    utilization: row.utilization ? Number(row.utilization) : 0,
  };
}

export const productionRouter = router({
  // ===== 工单管理 =====

  list: protectedProcedure
    .input(z.object({
      status: z.enum(['draft', 'planned', 'in_progress', 'quality_check', 'completed', 'on_hold', 'cancelled']).optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      projectId: z.number().optional(),
      assignedTeam: z.string().optional(),
      customerId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const page = input?.page || 1;
      const pageSize = input?.pageSize || 20;

      const conditions = [];
      if (input?.status) conditions.push(eq(productionWorkOrders.status, input.status));
      if (input?.priority) conditions.push(eq(productionWorkOrders.priority, input.priority));
      if (input?.projectId) conditions.push(eq(productionWorkOrders.projectId, input.projectId));
      if (input?.assignedTeam) conditions.push(eq(productionWorkOrders.assignedTeam, input.assignedTeam));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult, rows] = await Promise.all([
        db.select({ value: count() }).from(productionWorkOrders).where(where),
        db.select().from(productionWorkOrders).where(where)
          .orderBy(desc(productionWorkOrders.updatedAt))
          .limit(pageSize).offset((page - 1) * pageSize),
      ]);

      return { items: rows.map(mapWorkOrder), total: totalResult[0].value, page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      orderCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.id) conditions.push(eq(productionWorkOrders.id, input.id));
      if (input.orderCode) conditions.push(eq(productionWorkOrders.workOrderCode, input.orderCode));
      if (conditions.length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: '请提供id或orderCode' });

      const rows = await db.select().from(productionWorkOrders)
        .where(conditions.length > 1 ? or(...conditions) : conditions[0]);
      if (rows.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: '工单不存在' });
      return mapWorkOrder(rows[0]);
    }),

  create: protectedProcedure
    .input(WorkOrderSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const result = await db.insert(productionWorkOrders).values({
        workOrderCode: input.orderCode || generateCode('WO'),
        projectId: input.projectId ?? null,
        productName: input.productName,
        productModel: input.productModel ?? null,
        quantity: input.quantity,
        priority: input.priority,
        status: 'draft',
        plannedStartDate: input.plannedStartDate ?? null,
        plannedEndDate: input.plannedEndDate ?? null,
        estimatedHours: input.estimatedHours != null ? String(input.estimatedHours) : null,
        actualHours: '0',
        completionRate: '0.00',
        assignedTeam: input.assignedTeam ?? null,
        supervisorId: input.assignedLeaderId ?? null,
        notes: input.notes ?? null,
        createdBy: ctx.user?.id ?? null,
      }).returning();
      return mapWorkOrder(result[0]);
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number() }).merge(WorkOrderSchema.partial()))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const existing = await db.select().from(productionWorkOrders).where(eq(productionWorkOrders.id, input.id));
      if (existing.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: '工单不存在' });

      const u: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (input.orderCode !== undefined) u.workOrderCode = input.orderCode;
      if (input.projectId !== undefined) u.projectId = input.projectId;
      if (input.productName !== undefined) u.productName = input.productName;
      if (input.productModel !== undefined) u.productModel = input.productModel;
      if (input.quantity !== undefined) u.quantity = input.quantity;
      if (input.priority !== undefined) u.priority = input.priority;
      if (input.plannedStartDate !== undefined) u.plannedStartDate = input.plannedStartDate;
      if (input.plannedEndDate !== undefined) u.plannedEndDate = input.plannedEndDate;
      if (input.estimatedHours !== undefined) u.estimatedHours = String(input.estimatedHours);
      if (input.assignedTeam !== undefined) u.assignedTeam = input.assignedTeam;
      if (input.assignedLeaderId !== undefined) u.supervisorId = input.assignedLeaderId;
      if (input.notes !== undefined) u.notes = input.notes;

      const result = await db.update(productionWorkOrders).set(u).where(eq(productionWorkOrders.id, input.id)).returning();
      return mapWorkOrder(result[0]);
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['draft', 'planned', 'in_progress', 'quality_check', 'completed', 'on_hold', 'cancelled']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const existing = await db.select().from(productionWorkOrders).where(eq(productionWorkOrders.id, input.id));
      if (existing.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: '工单不存在' });

      const wo = existing[0];
      const u: Record<string, unknown> = { status: input.status, updatedAt: new Date().toISOString() };
      if (input.status === 'in_progress' && !wo.actualStartDate) u.actualStartDate = new Date().toISOString().split('T')[0];
      if (input.status === 'completed') { u.actualEndDate = new Date().toISOString().split('T')[0]; u.completionRate = '100.00'; }
      if (input.notes !== undefined) u.notes = input.notes;

      const result = await db.update(productionWorkOrders).set(u).where(eq(productionWorkOrders.id, input.id)).returning();
      return mapWorkOrder(result[0]);
    }),

  updateProgress: protectedProcedure
    .input(z.object({
      id: z.number(),
      progress: z.number().min(0).max(100),
      actualHours: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const existing = await db.select().from(productionWorkOrders).where(eq(productionWorkOrders.id, input.id));
      if (existing.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: '工单不存在' });

      const wo = existing[0];
      const u: Record<string, unknown> = { completionRate: String(input.progress.toFixed(2)), updatedAt: new Date().toISOString() };
      if (input.actualHours !== undefined) u.actualHours = String(input.actualHours);

      if (input.progress === 100 && wo.status !== 'completed') u.status = 'quality_check';
      else if (input.progress > 0 && wo.status === 'planned') {
        u.status = 'in_progress';
        if (!wo.actualStartDate) u.actualStartDate = new Date().toISOString().split('T')[0];
      }

      const result = await db.update(productionWorkOrders).set(u).where(eq(productionWorkOrders.id, input.id)).returning();
      return mapWorkOrder(result[0]);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const existing = await db.select().from(productionWorkOrders).where(eq(productionWorkOrders.id, input.id));
      if (existing.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: '工单不存在' });
      if (!['draft', 'cancelled'].includes(existing[0].status ?? ''))
        throw new TRPCError({ code: 'BAD_REQUEST', message: '只能删除草稿或已取消的工单' });
      await db.delete(productionWorkOrders).where(eq(productionWorkOrders.id, input.id));
      return { success: true };
    }),

  // ===== QC质检 =====

  getQCRecords: protectedProcedure
    .input(z.object({
      workOrderId: z.number().optional(),
      checkType: z.enum(['incoming', 'process', 'final', 'patrol']).optional(),
      result: z.enum(['pass', 'fail', 'conditional']).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input?.workOrderId) conditions.push(eq(qcInspectionRecords.workOrderId, input.workOrderId));
      if (input?.checkType) conditions.push(eq(qcInspectionRecords.inspectionType, input.checkType));
      if (input?.result) conditions.push(eq(qcInspectionRecords.result, input.result));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await db.select().from(qcInspectionRecords).where(where).orderBy(desc(qcInspectionRecords.createdAt));
      return rows.map(mapQCRecord);
    }),

  createQCRecord: protectedProcedure
    .input(QCRecordSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const woRows = await db.select().from(productionWorkOrders).where(eq(productionWorkOrders.id, input.workOrderId));
      if (woRows.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: '工单不存在' });

      // Store count data in checklistItems JSON since DB doesn't have separate columns
      const checklistData = JSON.stringify({
        checkPoint: input.checkPoint,
        totalItems: input.totalItems,
        passItems: input.passItems,
        failItems: input.failItems,
      });

      const result = await db.insert(qcInspectionRecords).values({
        inspectionCode: generateCode('QC'),
        taskId: 0,
        workOrderId: input.workOrderId,
        inspectionType: input.checkType,
        inspectorId: ctx.user.id,
        inspectorName: input.inspector,
        inspectionTime: new Date(),
        result: input.result,
        defectType: input.checkPoint,
        checklistItems: checklistData,
        qualityScore: input.totalItems > 0 ? Math.round((input.passItems / input.totalItems) * 100) : 0,
        notes: input.notes ?? null,
      }).returning();

      return mapQCRecord(result[0]);
    }),

  getQCStats: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input?.startDate) conditions.push(sql`${qcInspectionRecords.inspectionTime} >= ${input.startDate}`);
      if (input?.endDate) conditions.push(sql`${qcInspectionRecords.inspectionTime} <= ${`${input.endDate}T23:59:59.999Z`}`);
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalR, passR, failR, conditionalR] = await Promise.all([
        db.select({ value: count() }).from(qcInspectionRecords).where(where),
        db.select({ value: count() }).from(qcInspectionRecords).where(where ? and(where, eq(qcInspectionRecords.result, 'pass')) : eq(qcInspectionRecords.result, 'pass')),
        db.select({ value: count() }).from(qcInspectionRecords).where(where ? and(where, eq(qcInspectionRecords.result, 'fail')) : eq(qcInspectionRecords.result, 'fail')),
        db.select({ value: count() }).from(qcInspectionRecords).where(where ? and(where, eq(qcInspectionRecords.result, 'conditional')) : eq(qcInspectionRecords.result, 'conditional')),
      ]);

      const totalRecords = totalR[0].value;
      const passCount = passR[0].value;
      const failCount = failR[0].value;
      const conditionalCount = conditionalR[0].value;

      // Aggregate item counts from checklistItems JSON
      const allRows = await db.select({ checklistItems: qcInspectionRecords.checklistItems }).from(qcInspectionRecords).where(where);
      let totalItems = 0, totalPass = 0, totalFail = 0;
      for (const row of allRows) {
        try {
          const data = typeof row.checklistItems === 'string' ? JSON.parse(row.checklistItems) : row.checklistItems;
          if (data) { totalItems += data.totalItems || 0; totalPass += data.passItems || 0; totalFail += data.failItems || 0; }
        } catch {}
      }

      return {
        stats: {
          totalRecords, passCount, failCount, conditionalCount,
          passRate: totalRecords > 0 ? ((passCount / totalRecords) * 100).toFixed(1) + '%' : '0%',
          totalItems, totalPass, totalFail,
          itemPassRate: totalItems > 0 ? ((totalPass / totalItems) * 100).toFixed(1) + '%' : '0%',
        }
      };
    }),

  // ===== 设备管理 =====

  getEquipments: protectedProcedure
    .input(z.object({
      status: z.enum(['idle', 'running', 'maintenance', 'fault', 'offline']).optional(),
      type: z.string().optional(),
      location: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input?.status) conditions.push(eq(productionEquipments.status, input.status));
      if (input?.type) conditions.push(eq(productionEquipments.type, input.type));
      if (input?.location) conditions.push(eq(productionEquipments.location, input.location));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await db.select().from(productionEquipments).where(where).orderBy(productionEquipments.id);
      return rows.map(mapEquipment);
    }),

  updateEquipmentStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['idle', 'running', 'maintenance', 'fault', 'offline']),
      currentWorkOrderId: z.number().nullable().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const eqRows = await db.select().from(productionEquipments).where(eq(productionEquipments.id, input.id));
      if (eqRows.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: '设备不存在' });

      const equipment = eqRows[0];
      const previousStatus = equipment.status;
      const previousWorkOrderId = equipment.currentWorkOrderId;

      const u: Record<string, unknown> = { status: input.status, updatedAt: new Date().toISOString() };
      if (input.currentWorkOrderId !== undefined) u.currentWorkOrderId = input.currentWorkOrderId;
      if (['maintenance', 'fault', 'offline'].includes(input.status)) u.utilization = '0.00';

      const updatedRows = await db.update(productionEquipments).set(u).where(eq(productionEquipments.id, input.id)).returning();
      const updated = updatedRows[0];

      // Record status change in audit trail
      const historyRows = await db.insert(productionEquipmentStatusHistory).values({
        equipmentId: equipment.id,
        equipmentCode: equipment.code,
        equipmentName: equipment.name,
        previousStatus,
        newStatus: input.status,
        previousWorkOrderId,
        newWorkOrderId: updated.currentWorkOrderId,
        notes: input.notes ?? null,
        changedBy: ctx.user?.id ?? null,
        changedByName: ctx.user?.name ?? null,
        changedAt: new Date().toISOString(),
      }).returning();

      // Sync scheduling resource availability (best-effort)
      const isAvailable = input.status === 'idle' || input.status === 'running';
      const wasAvailable = previousStatus === 'idle' || previousStatus === 'running';
      let schedulingUpdateResult: any = null;

      if (isAvailable !== wasAvailable) {
        try {
          const { getDb } = await import('../db');
          const rawDb: any = await getDb();
          if (rawDb) {
            const today = new Date().toISOString().split('T')[0];
            const [resourceRows] = await rawDb.execute(
              'SELECT id, availability_calendar FROM scheduling_resources WHERE resource_name = ? AND resource_type = ?',
              [equipment.name, 'equipment']
            ) as any[];
            if (resourceRows?.length > 0) {
              const resource = resourceRows[0];
              let calendar = resource.availability_calendar || [];
              if (typeof calendar === 'string') try { calendar = JSON.parse(calendar); } catch { calendar = []; }
              const idx = calendar.findIndex((c: any) => c.date === today);
              const entry = { date: today, available: isAvailable, availableHours: isAvailable ? 8 : 0, reason: input.notes || `Equipment status changed to ${input.status}` };
              if (idx >= 0) calendar[idx] = entry; else calendar.push(entry);
              await rawDb.execute('UPDATE scheduling_resources SET availability_calendar = ?, status = ? WHERE id = ?', [JSON.stringify(calendar), isAvailable ? 'available' : 'unavailable', resource.id]);
              schedulingUpdateResult = { resourceId: resource.id, updatedAvailability: isAvailable, date: today };
            }
          }
        } catch (error) {
          console.warn('[Production] Failed to update scheduling resource availability:', error);
        }
      }

      return {
        equipment: mapEquipment(updated),
        statusChange: { from: previousStatus, to: input.status, availabilityChanged: isAvailable !== wasAvailable },
        schedulingUpdate: schedulingUpdateResult,
        historyEntryId: historyRows[0]?.id,
      };
    }),

  getEquipmentStatusHistory: protectedProcedure
    .input(z.object({
      equipmentId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const page = input?.page || 1;
      const pageSize = input?.pageSize || 20;

      const conditions = [];
      if (input?.equipmentId) conditions.push(eq(productionEquipmentStatusHistory.equipmentId, input.equipmentId));
      if (input?.startDate) conditions.push(sql`${productionEquipmentStatusHistory.changedAt} >= ${input.startDate}`);
      if (input?.endDate) conditions.push(sql`${productionEquipmentStatusHistory.changedAt} <= ${input.endDate + 'T23:59:59.999Z'}`);
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult, rows] = await Promise.all([
        db.select({ value: count() }).from(productionEquipmentStatusHistory).where(where),
        db.select().from(productionEquipmentStatusHistory).where(where)
          .orderBy(desc(productionEquipmentStatusHistory.changedAt))
          .limit(pageSize).offset((page - 1) * pageSize),
      ]);

      return { items: rows, total: totalResult[0].value, page, pageSize };
    }),

  // ===== 生产统计 =====

  getDashboardStats: protectedProcedure.query(async () => {
    const db = await requireDb();

    const [statusCounts, priorityCounts, teamCounts, quantityResult, equipStatusCounts, utilizationResult, recentRows] = await Promise.all([
      db.select({ status: productionWorkOrders.status, cnt: count() }).from(productionWorkOrders).groupBy(productionWorkOrders.status),
      db.select({ priority: productionWorkOrders.priority, cnt: count() }).from(productionWorkOrders).groupBy(productionWorkOrders.priority),
      db.select({ team: productionWorkOrders.assignedTeam, cnt: count() }).from(productionWorkOrders).groupBy(productionWorkOrders.assignedTeam),
      db.select({
        totalQuantity: sql<number>`COALESCE(SUM(${productionWorkOrders.quantity}), 0)`,
        completedQuantity: sql<number>`COALESCE(SUM(CASE WHEN ${productionWorkOrders.status} = 'completed' THEN ${productionWorkOrders.quantity} ELSE 0 END), 0)`,
        avgProgress: sql<number>`COALESCE(AVG(${productionWorkOrders.completionRate}::numeric), 0)`,
      }).from(productionWorkOrders),
      db.select({ status: productionEquipments.status, cnt: count() }).from(productionEquipments).groupBy(productionEquipments.status),
      db.select({ avgUtil: sql<number>`COALESCE(AVG(${productionEquipments.utilization}::numeric), 0)` }).from(productionEquipments),
      db.select().from(productionWorkOrders).orderBy(desc(productionWorkOrders.updatedAt)).limit(5),
    ]);

    const ordersByStatus: Record<string, number> = { draft: 0, planned: 0, in_progress: 0, quality_check: 0, completed: 0, on_hold: 0, cancelled: 0 };
    let totalOrders = 0;
    for (const r of statusCounts) { const s = r.status ?? 'draft'; ordersByStatus[s] = r.cnt; totalOrders += r.cnt; }

    const ordersByPriority: Record<string, number> = { urgent: 0, high: 0, normal: 0, low: 0 };
    for (const r of priorityCounts) { ordersByPriority[r.priority ?? 'normal'] = r.cnt; }

    const ordersByTeam: Record<string, number> = {};
    for (const r of teamCounts) { ordersByTeam[r.team || '未分配'] = r.cnt; }

    const equipStats: Record<string, number> = { running: 0, idle: 0, maintenance: 0, fault: 0, offline: 0 };
    let totalEquipments = 0;
    for (const r of equipStatusCounts) { equipStats[r.status] = r.cnt; totalEquipments += r.cnt; }

    return {
      summary: {
        totalOrders, inProgressOrders: ordersByStatus.in_progress, completedOrders: ordersByStatus.completed,
        qualityCheckOrders: ordersByStatus.quality_check, plannedOrders: ordersByStatus.planned,
        totalQuantity: Number(quantityResult[0].totalQuantity), completedQuantity: Number(quantityResult[0].completedQuantity),
        avgProgress: Math.round(Number(quantityResult[0].avgProgress)),
      },
      equipment: { total: totalEquipments, running: equipStats.running, idle: equipStats.idle, maintenance: equipStats.maintenance, fault: equipStats.fault, avgUtilization: Math.round(Number(utilizationResult[0].avgUtil)) },
      ordersByStatus, ordersByPriority, ordersByTeam,
      recentOrders: recentRows.map(mapWorkOrder),
    };
  }),

  getProgressTrend: protectedProcedure
    .input(z.object({ days: z.number().default(7) }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const days = input?.days || 7;

      try {
        const rows = await db.execute(sql`
          SELECT
            TO_CHAR(COALESCE(updated_at, created_at)::date, 'YYYY-MM-DD') as date,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int as completed,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)::int as in_progress,
            SUM(CASE WHEN status IN ('planned', 'pending', 'draft') THEN 1 ELSE 0 END)::int as planned
          FROM production_work_orders
          WHERE COALESCE(updated_at, created_at)::date >= CURRENT_DATE - ${days}
          GROUP BY COALESCE(updated_at, created_at)::date
          ORDER BY date
        `);

        const trend = [];
        const today = new Date();
        const rowArr = (rows as any).rows ?? [];
        const dataMap = new Map(rowArr.map((r: any) => [r.date, r]));

        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const row = dataMap.get(dateStr) as any;
          trend.push({
            date: dateStr,
            completed: Number(row?.completed ?? 0),
            inProgress: Number(row?.in_progress ?? 0),
            planned: Number(row?.planned ?? 0),
          });
        }

        return trend;
      } catch {
        // Fallback: zero-filled trend if table doesn't exist yet
        const trend = [];
        const today = new Date();
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          trend.push({
            date: date.toISOString().split('T')[0],
            completed: 0,
            inProgress: 0,
            planned: 0,
          });
        }
        return trend;
      }
    }),

  getTeamCapacity: protectedProcedure.query(async () => {
    const db = await requireDb();
    const teamData = await db.select({
      team: productionWorkOrders.assignedTeam,
      totalOrders: count(),
      completedOrders: sql<number>`SUM(CASE WHEN ${productionWorkOrders.status} = 'completed' THEN 1 ELSE 0 END)`,
      inProgressOrders: sql<number>`SUM(CASE WHEN ${productionWorkOrders.status} = 'in_progress' THEN 1 ELSE 0 END)`,
      totalHours: sql<number>`COALESCE(SUM(${productionWorkOrders.estimatedHours}::numeric), 0)`,
      actualHours: sql<number>`COALESCE(SUM(${productionWorkOrders.actualHours}::numeric), 0)`,
    }).from(productionWorkOrders).groupBy(productionWorkOrders.assignedTeam);

    return teamData.map(row => {
      const totalHours = Number(row.totalHours);
      const actualHours = Number(row.actualHours);
      return {
        team: row.team || '未分配',
        totalOrders: row.totalOrders,
        completedOrders: Number(row.completedOrders),
        inProgressOrders: Number(row.inProgressOrders),
        totalHours, actualHours,
        efficiency: totalHours > 0 ? Math.round((actualHours / totalHours) * 100) : 0,
      };
    });
  }),
});
