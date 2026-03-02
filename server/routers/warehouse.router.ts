/**
 * GRT 5.0 仓库管理 tRPC 路由
 *
 * 功能:
 * - 仓库CRUD (warehouses)
 * - 库位管理 (warehouseLocations)
 * - 入库单管理 (warehouseReceipts + items)
 * - 出库单管理 (warehouseIssues + items)
 * - 库存盘点 (stockCounts)
 * - 批次追踪 (inventoryLots)
 * - 序列号追踪 (serialNumbers)
 * - 库存查询 & 统计
 *
 * All data persisted via Drizzle ORM (no in-memory stores).
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { buScopeCondition } from "../_core/gateway-bu-context.middleware";
import { requireDb } from "../db";
import { eq, desc, and, or, like, count, sql } from "drizzle-orm";
import {
  warehouses, warehouseLocations, warehouseReceipts, warehouseReceiptItems,
  warehouseIssues, warehouseIssueItems, stockCounts,
} from "../../drizzle/warehouse-schema";
import { inventoryLots, serialNumbers } from "../../drizzle/inventory-lot-schema";

// ============================================
// Zod 验证 Schema
// ============================================

const WarehouseCreateSchema = z.object({
  warehouseCode: z.string().min(1),
  warehouseName: z.string().min(1),
  warehouseType: z.enum(['raw_material', 'semi_finished', 'finished_goods', 'spare_parts', 'tools', 'quarantine', 'returns']),
  buCode: z.enum(['BU1', 'BU2', 'BU3', 'BU4', 'BU5']).optional(),
  address: z.string().optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
  totalArea: z.number().optional(),
  totalCapacity: z.number().optional(),
  managerId: z.number().optional(),
  managerName: z.string().optional(),
  contactPhone: z.string().optional(),
  description: z.string().optional(),
});

const LocationCreateSchema = z.object({
  warehouseId: z.number(),
  locationCode: z.string().min(1),
  zone: z.string().min(1),
  aisle: z.string().optional(),
  shelf: z.string().optional(),
  bin: z.string().optional(),
  locationType: z.enum(['storage', 'picking', 'staging', 'receiving', 'shipping', 'quality_hold']).default('storage'),
  maxWeight: z.number().optional(),
  maxVolume: z.number().optional(),
  maxItems: z.number().optional(),
  tempRequirement: z.enum(['normal', 'cold', 'frozen', 'heated']).default('normal'),
});

const ReceiptCreateSchema = z.object({
  receiptType: z.enum(['purchase', 'production', 'return', 'transfer_in', 'adjustment', 'initial']),
  sourceDocType: z.string().optional(),
  sourceDocId: z.number().optional(),
  sourceDocCode: z.string().optional(),
  warehouseId: z.number(),
  locationId: z.number().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    materialCode: z.string().min(1),
    materialName: z.string().optional(),
    expectedQty: z.number().min(0),
    receivedQty: z.number().default(0),
    unit: z.string().default('个'),
    lotNumber: z.string().optional(),
    locationId: z.number().optional(),
    locationCode: z.string().optional(),
  })),
});

const IssueCreateSchema = z.object({
  issueType: z.enum(['production', 'sales', 'transfer_out', 'scrap', 'sample', 'adjustment']),
  sourceDocType: z.string().optional(),
  sourceDocId: z.number().optional(),
  sourceDocCode: z.string().optional(),
  processCode: z.string().optional(),
  warehouseId: z.number(),
  requestDept: z.string().optional(),
  projectCode: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    materialCode: z.string().min(1),
    materialName: z.string().optional(),
    requestedQty: z.number().min(0),
    unit: z.string().default('个'),
    locationId: z.number().optional(),
    locationCode: z.string().optional(),
    lotNumber: z.string().optional(),
  })),
});

const StockCountCreateSchema = z.object({
  countType: z.enum(['full', 'cycle', 'spot', 'annual']),
  warehouseId: z.number(),
  zone: z.string().optional(),
  plannedDate: z.string().optional(),
  notes: z.string().optional(),
});

const LotCreateSchema = z.object({
  lotNumber: z.string().min(1),
  materialCode: z.string().min(1),
  materialName: z.string().optional(),
  initialQty: z.number().min(0),
  unit: z.string().default('个'),
  sourceType: z.enum(['purchase', 'production', 'transfer', 'return', 'initial']),
  sourcePOCode: z.string().optional(),
  sourceWorkOrder: z.string().optional(),
  supplierLotNumber: z.string().optional(),
  supplierId: z.number().optional(),
  supplierName: z.string().optional(),
  warehouseId: z.number().optional(),
  locationId: z.number().optional(),
  locationCode: z.string().optional(),
  productionDate: z.string().optional(),
  expiryDate: z.string().optional(),
  warrantyDate: z.string().optional(),
  unitCost: z.number().optional(),
  notes: z.string().optional(),
});

function generateCode(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
}

// ============================================
// Router
// ============================================

export const warehouseRouter = router({
  // ==========================================
  // 仓库 CRUD
  // ==========================================

  createWarehouse: adminProcedure
    .input(WarehouseCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const result = await db.insert(warehouses).values({
        warehouseCode: input.warehouseCode,
        warehouseName: input.warehouseName,
        warehouseType: input.warehouseType,
        buCode: input.buCode ?? ctx.bu?.buCode ?? null,
        address: input.address ?? null,
        building: input.building ?? null,
        floor: input.floor ?? null,
        totalArea: input.totalArea != null ? String(input.totalArea) : null,
        totalCapacity: input.totalCapacity ?? null,
        managerId: input.managerId ?? null,
        managerName: input.managerName ?? null,
        contactPhone: input.contactPhone ?? null,
        description: input.description ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }).returning();
      return result[0];
    }),

  getWarehouses: protectedProcedure
    .input(z.object({
      warehouseType: z.string().optional(),
      buCode: z.string().optional(),
      isActive: z.boolean().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const conditions = [];
      // Auto-inject BU scope
      const buFilter = buScopeCondition(warehouses.buCode, ctx);
      if (buFilter) conditions.push(buFilter);
      if (input.warehouseType) conditions.push(eq(warehouses.warehouseType, input.warehouseType));
      if (input.buCode && !buFilter) conditions.push(eq(warehouses.buCode, input.buCode));
      if (input.isActive !== undefined) conditions.push(eq(warehouses.isActive, input.isActive));
      if (input.search) {
        const pattern = `%${input.search}%`;
        conditions.push(or(like(warehouses.warehouseCode, pattern), like(warehouses.warehouseName, pattern)));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(warehouses).where(where).orderBy(warehouses.id).limit(1000);
    }),

  getWarehouse: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const buFilter = buScopeCondition(warehouses.buCode, ctx);
      const conditions = [eq(warehouses.id, input.id)];
      if (buFilter) conditions.push(buFilter);
      const whRows = await db.select().from(warehouses).where(and(...conditions)).limit(1000);
      if (!whRows[0]) return null;
      const locations = await db.select().from(warehouseLocations).where(eq(warehouseLocations.warehouseId, input.id)).limit(1000);
      return { ...whRows[0], locations };
    }),

  updateWarehouse: adminProcedure
    .input(WarehouseCreateSchema.partial().extend({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const u: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (updates.warehouseCode !== undefined) u.warehouseCode = updates.warehouseCode;
      if (updates.warehouseName !== undefined) u.warehouseName = updates.warehouseName;
      if (updates.warehouseType !== undefined) u.warehouseType = updates.warehouseType;
      if (updates.buCode !== undefined) u.buCode = updates.buCode;
      if (updates.address !== undefined) u.address = updates.address;
      if (updates.building !== undefined) u.building = updates.building;
      if (updates.floor !== undefined) u.floor = updates.floor;
      if (updates.totalArea !== undefined) u.totalArea = updates.totalArea != null ? String(updates.totalArea) : null;
      if (updates.totalCapacity !== undefined) u.totalCapacity = updates.totalCapacity;
      if (updates.managerId !== undefined) u.managerId = updates.managerId;
      if (updates.managerName !== undefined) u.managerName = updates.managerName;
      if (updates.contactPhone !== undefined) u.contactPhone = updates.contactPhone;
      if (updates.description !== undefined) u.description = updates.description;

      await db.update(warehouses).set(u).where(eq(warehouses.id, id));
      const rows = await db.select().from(warehouses).where(eq(warehouses.id, id)).limit(1000);
      if (!rows[0]) throw new Error('Warehouse not found');
      return rows[0];
    }),

  toggleWarehouseActive: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(warehouses).set({ isActive: input.isActive, updatedAt: new Date().toISOString() }).where(eq(warehouses.id, input.id));
      const rows = await db.select().from(warehouses).where(eq(warehouses.id, input.id)).limit(1000);
      if (!rows[0]) throw new Error('Warehouse not found');
      return rows[0];
    }),

  // ==========================================
  // 库位管理
  // ==========================================

  createLocation: adminProcedure
    .input(LocationCreateSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const result = await db.insert(warehouseLocations).values({
        warehouseId: input.warehouseId,
        locationCode: input.locationCode,
        zone: input.zone,
        aisle: input.aisle ?? null,
        shelf: input.shelf ?? null,
        bin: input.bin ?? null,
        locationType: input.locationType,
        maxWeight: input.maxWeight != null ? String(input.maxWeight) : null,
        maxVolume: input.maxVolume != null ? String(input.maxVolume) : null,
        maxItems: input.maxItems ?? null,
        tempRequirement: input.tempRequirement,
        isOccupied: false,
        currentMaterialCode: null,
        currentQty: '0.00',
        isActive: true,
        isLocked: false,
        lockReason: null,
        createdAt: now,
        updatedAt: now,
      }).returning();
      return result[0];
    }),

  getLocations: protectedProcedure
    .input(z.object({
      warehouseId: z.number(),
      zone: z.string().optional(),
      locationType: z.string().optional(),
      isOccupied: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [eq(warehouseLocations.warehouseId, input.warehouseId)];
      if (input.zone) conditions.push(eq(warehouseLocations.zone, input.zone));
      if (input.locationType) conditions.push(eq(warehouseLocations.locationType, input.locationType));
      if (input.isOccupied !== undefined) conditions.push(eq(warehouseLocations.isOccupied, input.isOccupied));
      return db.select().from(warehouseLocations).where(and(...conditions)).limit(1000);
    }),

  batchCreateLocations: adminProcedure
    .input(z.object({
      warehouseId: z.number(),
      zone: z.string(),
      aisleCount: z.number().min(1).max(99),
      shelfCount: z.number().min(1).max(20),
      binCount: z.number().min(1).max(20),
      locationType: z.enum(['storage', 'picking', 'staging', 'receiving', 'shipping', 'quality_hold']).default('storage'),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      // Get warehouse code for location naming
      const whRows = await db.select().from(warehouses).where(eq(warehouses.id, input.warehouseId)).limit(1000);
      if (!whRows[0]) throw new Error('Warehouse not found');
      const whCode = whRows[0].warehouseCode;
      const now = new Date().toISOString();

      const valuesToInsert: any[] = [];
      for (let a = 1; a <= input.aisleCount; a++) {
        for (let s = 1; s <= input.shelfCount; s++) {
          for (let b = 1; b <= input.binCount; b++) {
            const aisleStr = String(a).padStart(2, '0');
            const shelfStr = String(s).padStart(2, '0');
            const binStr = String(b).padStart(2, '0');
            valuesToInsert.push({
              warehouseId: input.warehouseId,
              locationCode: `${whCode}-${input.zone}-${aisleStr}-${shelfStr}-${binStr}`,
              zone: input.zone,
              aisle: aisleStr,
              shelf: shelfStr,
              bin: binStr,
              locationType: input.locationType,
              tempRequirement: 'normal',
              isOccupied: false,
              currentQty: '0.00',
              isActive: true,
              isLocked: false,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      }

      // Batch insert (Drizzle supports arrays)
      if (valuesToInsert.length > 0) {
        await db.insert(warehouseLocations).values(valuesToInsert);
      }

      return { created: valuesToInsert.length, message: `已创建 ${valuesToInsert.length} 个库位` };
    }),

  lockLocation: adminProcedure
    .input(z.object({ id: z.number(), isLocked: z.boolean(), lockReason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(warehouseLocations).set({
        isLocked: input.isLocked,
        lockReason: input.isLocked ? (input.lockReason || '手动锁定') : null,
        updatedAt: new Date().toISOString(),
      }).where(eq(warehouseLocations.id, input.id));
      const rows = await db.select().from(warehouseLocations).where(eq(warehouseLocations.id, input.id)).limit(1000);
      if (!rows[0]) throw new Error('Location not found');
      return rows[0];
    }),

  // ==========================================
  // 入库单
  // ==========================================

  createReceipt: protectedProcedure
    .input(ReceiptCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const { items, ...receiptData } = input;
      const now = new Date().toISOString();

      const receiptResult = await db.insert(warehouseReceipts).values({
        receiptCode: generateCode('RCV'),
        receiptType: receiptData.receiptType,
        sourceDocType: receiptData.sourceDocType ?? null,
        sourceDocId: receiptData.sourceDocId ?? null,
        sourceDocCode: receiptData.sourceDocCode ?? null,
        warehouseId: receiptData.warehouseId,
        locationId: receiptData.locationId ?? null,
        status: 'draft',
        receivedBy: ctx.user?.id,
        receivedByName: ctx.user?.name || '',
        receivedAt: null,
        qcResult: null,
        qcBy: null,
        qcAt: null,
        qcNotes: null,
        notes: receiptData.notes ?? null,
        createdAt: now,
        updatedAt: now,
      }).returning();
      const receipt = receiptResult[0];

      const createdItems: any[] = [];
      for (const item of items) {
        const itemResult = await db.insert(warehouseReceiptItems).values({
          receiptId: receipt.id,
          materialCode: item.materialCode,
          materialName: item.materialName ?? null,
          expectedQty: String(item.expectedQty),
          receivedQty: String(item.receivedQty),
          unit: item.unit,
          lotNumber: item.lotNumber ?? null,
          locationId: item.locationId ?? null,
          locationCode: item.locationCode ?? null,
          createdAt: now,
        }).returning();
        createdItems.push(itemResult[0]);
      }

      return { ...receipt, items: createdItems };
    }),

  getReceipts: protectedProcedure
    .input(z.object({
      warehouseId: z.number().optional(),
      receiptType: z.string().optional(),
      status: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.warehouseId) conditions.push(eq(warehouseReceipts.warehouseId, input.warehouseId));
      if (input.receiptType) conditions.push(eq(warehouseReceipts.receiptType, input.receiptType));
      if (input.status) conditions.push(eq(warehouseReceipts.status, input.status));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult, items] = await Promise.all([
        db.select({ value: count() }).from(warehouseReceipts).where(where),
        db.select().from(warehouseReceipts).where(where)
          .orderBy(desc(warehouseReceipts.id))
          .limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      ]);
      return { items, total: totalResult[0].value, page: input.page, pageSize: input.pageSize };
    }),

  getReceipt: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const receiptRows = await db.select().from(warehouseReceipts).where(eq(warehouseReceipts.id, input.id)).limit(1000);
      if (!receiptRows[0]) return null;
      const items = await db.select().from(warehouseReceiptItems).where(eq(warehouseReceiptItems.receiptId, input.id)).limit(1000);
      return { ...receiptRows[0], items };
    }),

  updateReceiptStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['draft', 'pending_qc', 'qc_passed', 'qc_failed', 'shelved', 'cancelled']),
      qcNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const u: Record<string, unknown> = { status: input.status, updatedAt: now };
      if (input.status === 'shelved') u.receivedAt = now;
      if (input.status === 'qc_passed' || input.status === 'qc_failed') {
        u.qcResult = input.status === 'qc_passed' ? 'passed' : 'failed';
        u.qcBy = ctx.user?.id;
        u.qcAt = now;
        if (input.qcNotes) u.qcNotes = input.qcNotes;
      }
      await db.update(warehouseReceipts).set(u).where(eq(warehouseReceipts.id, input.id));
      const rows = await db.select().from(warehouseReceipts).where(eq(warehouseReceipts.id, input.id)).limit(1000);
      if (!rows[0]) throw new Error('Receipt not found');
      return rows[0];
    }),

  // ==========================================
  // 出库单
  // ==========================================

  createIssue: protectedProcedure
    .input(IssueCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const { items, ...issueData } = input;
      const now = new Date().toISOString();

      const issueResult = await db.insert(warehouseIssues).values({
        issueCode: generateCode('ISS'),
        issueType: issueData.issueType,
        sourceDocType: issueData.sourceDocType ?? null,
        sourceDocId: issueData.sourceDocId ?? null,
        sourceDocCode: issueData.sourceDocCode ?? null,
        processCode: issueData.processCode ?? null,
        warehouseId: issueData.warehouseId,
        requestDept: issueData.requestDept ?? null,
        projectCode: issueData.projectCode ?? null,
        status: 'draft',
        issuedBy: ctx.user?.id,
        issuedByName: ctx.user?.name || '',
        issuedAt: null,
        approvedBy: null,
        approvedAt: null,
        notes: issueData.notes ?? null,
        createdAt: now,
        updatedAt: now,
      }).returning();
      const issue = issueResult[0];

      const createdItems: any[] = [];
      for (const item of items) {
        const itemResult = await db.insert(warehouseIssueItems).values({
          issueId: issue.id,
          materialCode: item.materialCode,
          materialName: item.materialName ?? null,
          requestedQty: String(item.requestedQty),
          issuedQty: '0.00',
          unit: item.unit,
          locationId: item.locationId ?? null,
          locationCode: item.locationCode ?? null,
          lotNumber: item.lotNumber ?? null,
          createdAt: now,
        }).returning();
        createdItems.push(itemResult[0]);
      }

      return { ...issue, items: createdItems };
    }),

  getIssues: protectedProcedure
    .input(z.object({
      warehouseId: z.number().optional(),
      issueType: z.string().optional(),
      status: z.string().optional(),
      projectCode: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.warehouseId) conditions.push(eq(warehouseIssues.warehouseId, input.warehouseId));
      if (input.issueType) conditions.push(eq(warehouseIssues.issueType, input.issueType));
      if (input.status) conditions.push(eq(warehouseIssues.status, input.status));
      if (input.projectCode) conditions.push(eq(warehouseIssues.projectCode, input.projectCode));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult, items] = await Promise.all([
        db.select({ value: count() }).from(warehouseIssues).where(where),
        db.select().from(warehouseIssues).where(where)
          .orderBy(desc(warehouseIssues.id))
          .limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      ]);
      return { items, total: totalResult[0].value, page: input.page, pageSize: input.pageSize };
    }),

  getIssue: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const issueRows = await db.select().from(warehouseIssues).where(eq(warehouseIssues.id, input.id)).limit(1000);
      if (!issueRows[0]) return null;
      const items = await db.select().from(warehouseIssueItems).where(eq(warehouseIssueItems.issueId, input.id)).limit(1000);
      return { ...issueRows[0], items };
    }),

  updateIssueStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['draft', 'approved', 'picking', 'issued', 'partial', 'cancelled']),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const u: Record<string, unknown> = { status: input.status, updatedAt: now };
      if (input.status === 'approved') { u.approvedBy = ctx.user?.id; u.approvedAt = now; }
      if (input.status === 'issued') u.issuedAt = now;
      await db.update(warehouseIssues).set(u).where(eq(warehouseIssues.id, input.id));
      const rows = await db.select().from(warehouseIssues).where(eq(warehouseIssues.id, input.id)).limit(1000);
      if (!rows[0]) throw new Error('Issue not found');
      return rows[0];
    }),

  // ==========================================
  // 库存盘点
  // ==========================================

  createStockCount: adminProcedure
    .input(StockCountCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const result = await db.insert(stockCounts).values({
        countCode: generateCode('CNT'),
        countType: input.countType,
        warehouseId: input.warehouseId,
        zone: input.zone ?? null,
        status: 'planned',
        plannedDate: input.plannedDate ?? null,
        countedBy: ctx.user?.id,
        totalItems: 0,
        matchedItems: 0,
        discrepancyItems: 0,
        totalDiscrepancyValue: '0.00',
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      }).returning();
      return result[0];
    }),

  getStockCounts: protectedProcedure
    .input(z.object({
      warehouseId: z.number().optional(),
      status: z.string().optional(),
      countType: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.warehouseId) conditions.push(eq(stockCounts.warehouseId, input.warehouseId));
      if (input.status) conditions.push(eq(stockCounts.status, input.status));
      if (input.countType) conditions.push(eq(stockCounts.countType, input.countType));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult, items] = await Promise.all([
        db.select({ value: count() }).from(stockCounts).where(where),
        db.select().from(stockCounts).where(where)
          .orderBy(desc(stockCounts.id))
          .limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      ]);
      return { items, total: totalResult[0].value, page: input.page, pageSize: input.pageSize };
    }),

  updateStockCountStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['planned', 'in_progress', 'counting', 'reconciling', 'approved', 'completed']),
      totalItems: z.number().optional(),
      matchedItems: z.number().optional(),
      discrepancyItems: z.number().optional(),
      totalDiscrepancyValue: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const { id, ...updates } = input;
      const u: Record<string, unknown> = { status: updates.status, updatedAt: now };
      if (updates.totalItems !== undefined) u.totalItems = updates.totalItems;
      if (updates.matchedItems !== undefined) u.matchedItems = updates.matchedItems;
      if (updates.discrepancyItems !== undefined) u.discrepancyItems = updates.discrepancyItems;
      if (updates.totalDiscrepancyValue !== undefined) u.totalDiscrepancyValue = String(updates.totalDiscrepancyValue);
      if (updates.status === 'in_progress') u.startedAt = now;
      if (updates.status === 'completed') u.completedAt = now;
      if (updates.status === 'approved') u.approvedBy = ctx.user?.id;

      await db.update(stockCounts).set(u).where(eq(stockCounts.id, id));
      const rows = await db.select().from(stockCounts).where(eq(stockCounts.id, id)).limit(1000);
      if (!rows[0]) throw new Error('Stock count not found');
      return rows[0];
    }),

  // ==========================================
  // 批次(Lot)追踪
  // ==========================================

  createLot: protectedProcedure
    .input(LotCreateSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const totalCost = (input.unitCost || 0) * input.initialQty;
      const result = await db.insert(inventoryLots).values({
        lotNumber: input.lotNumber,
        materialCode: input.materialCode,
        materialName: input.materialName ?? null,
        initialQty: String(input.initialQty),
        currentQty: String(input.initialQty),
        reservedQty: '0.00',
        unit: input.unit,
        sourceType: input.sourceType,
        sourcePOCode: input.sourcePOCode ?? null,
        sourceWorkOrder: input.sourceWorkOrder ?? null,
        supplierLotNumber: input.supplierLotNumber ?? null,
        supplierId: input.supplierId ?? null,
        supplierName: input.supplierName ?? null,
        warehouseId: input.warehouseId ?? null,
        locationId: input.locationId ?? null,
        locationCode: input.locationCode ?? null,
        productionDate: input.productionDate ?? null,
        receivedDate: now,
        expiryDate: input.expiryDate ?? null,
        warrantyDate: input.warrantyDate ?? null,
        qcStatus: 'pending',
        status: 'available',
        unitCost: input.unitCost != null ? String(input.unitCost) : null,
        totalCost: String(totalCost),
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      }).returning();
      return result[0];
    }),

  getLots: protectedProcedure
    .input(z.object({
      materialCode: z.string().optional(),
      warehouseId: z.number().optional(),
      status: z.string().optional(),
      qcStatus: z.string().optional(),
      expiringWithinDays: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.materialCode) conditions.push(eq(inventoryLots.materialCode, input.materialCode));
      if (input.warehouseId) conditions.push(eq(inventoryLots.warehouseId, input.warehouseId));
      if (input.status) conditions.push(eq(inventoryLots.status, input.status));
      if (input.qcStatus) conditions.push(eq(inventoryLots.qcStatus, input.qcStatus));
      if (input.expiringWithinDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + input.expiringWithinDays);
        conditions.push(sql`${inventoryLots.expiryDate} IS NOT NULL AND ${inventoryLots.expiryDate} <= ${cutoff.toISOString()} AND ${inventoryLots.expiryDate} >= ${new Date().toISOString()}`);
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult, items] = await Promise.all([
        db.select({ value: count() }).from(inventoryLots).where(where),
        db.select().from(inventoryLots).where(where)
          .orderBy(desc(inventoryLots.id))
          .limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      ]);
      return { items, total: totalResult[0].value, page: input.page, pageSize: input.pageSize };
    }),

  getLot: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(inventoryLots).where(eq(inventoryLots.id, input.id)).limit(1000);
      return rows[0] ?? null;
    }),

  updateLotStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['available', 'reserved', 'quarantine', 'expired', 'consumed', 'scrapped']),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(inventoryLots).set({ status: input.status, updatedAt: new Date().toISOString() }).where(eq(inventoryLots.id, input.id));
      const rows = await db.select().from(inventoryLots).where(eq(inventoryLots.id, input.id)).limit(1000);
      if (!rows[0]) throw new Error('Lot not found');
      return rows[0];
    }),

  updateLotQC: protectedProcedure
    .input(z.object({
      id: z.number(),
      qcStatus: z.enum(['pending', 'passed', 'failed', 'conditional']),
      qcCertificateNumber: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const u: Record<string, unknown> = { qcStatus: input.qcStatus, updatedAt: new Date().toISOString() };
      if (input.qcCertificateNumber) u.qcCertificateNumber = input.qcCertificateNumber;
      if (input.qcStatus === 'failed') u.status = 'quarantine';
      await db.update(inventoryLots).set(u).where(eq(inventoryLots.id, input.id));
      const rows = await db.select().from(inventoryLots).where(eq(inventoryLots.id, input.id)).limit(1000);
      if (!rows[0]) throw new Error('Lot not found');
      return rows[0];
    }),

  // ==========================================
  // 序列号追踪
  // ==========================================

  createSerialNumber: protectedProcedure
    .input(z.object({
      serialNumber: z.string().min(1),
      materialCode: z.string().min(1),
      materialName: z.string().optional(),
      lotId: z.number().optional(),
      lotNumber: z.string().optional(),
      warehouseId: z.number().optional(),
      locationId: z.number().optional(),
      purchaseOrderCode: z.string().optional(),
      supplierId: z.number().optional(),
      warrantyExpiry: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const result = await db.insert(serialNumbers).values({
        serialNumber: input.serialNumber,
        materialCode: input.materialCode,
        materialName: input.materialName ?? null,
        lotId: input.lotId ?? null,
        lotNumber: input.lotNumber ?? null,
        warehouseId: input.warehouseId ?? null,
        locationId: input.locationId ?? null,
        status: 'in_stock',
        purchaseOrderCode: input.purchaseOrderCode ?? null,
        supplierId: input.supplierId ?? null,
        receivedDate: now,
        warrantyExpiry: input.warrantyExpiry ?? null,
        lifecycleEvents: [{ date: now, event: 'created', notes: '入库登记' }],
        createdAt: now,
        updatedAt: now,
      }).returning();
      return result[0];
    }),

  getSerialNumbers: protectedProcedure
    .input(z.object({
      materialCode: z.string().optional(),
      lotId: z.number().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.materialCode) conditions.push(eq(serialNumbers.materialCode, input.materialCode));
      if (input.lotId) conditions.push(eq(serialNumbers.lotId, input.lotId));
      if (input.status) conditions.push(eq(serialNumbers.status, input.status));
      if (input.search) conditions.push(like(serialNumbers.serialNumber, `%${input.search}%`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult, items] = await Promise.all([
        db.select({ value: count() }).from(serialNumbers).where(where),
        db.select().from(serialNumbers).where(where)
          .orderBy(desc(serialNumbers.id))
          .limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      ]);
      return { items, total: totalResult[0].value, page: input.page, pageSize: input.pageSize };
    }),

  updateSerialStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['in_stock', 'allocated', 'in_production', 'installed', 'shipped', 'returned', 'scrapped']),
      projectCode: z.string().optional(),
      processCode: z.string().optional(),
      holderId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const currentRows = await db.select().from(serialNumbers).where(eq(serialNumbers.id, input.id)).limit(1000);
      if (!currentRows[0]) throw new Error('Serial number not found');

      const u: Record<string, unknown> = { status: input.status, updatedAt: now };
      if (input.projectCode !== undefined) u.currentProjectCode = input.projectCode;
      if (input.processCode !== undefined) u.currentProcessCode = input.processCode;
      if (input.holderId !== undefined) u.currentHolderId = input.holderId;

      const events = Array.isArray(currentRows[0].lifecycleEvents) ? [...(currentRows[0].lifecycleEvents as any[])] : [];
      events.push({ date: now, event: input.status, notes: input.notes || '' });
      u.lifecycleEvents = events;

      await db.update(serialNumbers).set(u).where(eq(serialNumbers.id, input.id));
      const rows = await db.select().from(serialNumbers).where(eq(serialNumbers.id, input.id)).limit(1000);
      return rows[0];
    }),

  // ==========================================
  // 库存统计 & 仪表板
  // ==========================================

  getWarehouseStats: protectedProcedure.query(async () => {
    const db = await requireDb();
    const nowStr = new Date().toISOString();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 30);
    const cutoffStr = cutoff.toISOString();

    const [whR, locR, occR, lotR, pendRcvR, pendIssR, quarR, expR] = await Promise.all([
      db.select({ value: count() }).from(warehouses).where(eq(warehouses.isActive, true)),
      db.select({ value: count() }).from(warehouseLocations).where(eq(warehouseLocations.isActive, true)),
      db.select({ value: count() }).from(warehouseLocations).where(eq(warehouseLocations.isOccupied, true)),
      db.select({ value: count() }).from(inventoryLots).where(eq(inventoryLots.status, 'available')),
      db.select({ value: count() }).from(warehouseReceipts).where(or(eq(warehouseReceipts.status, 'draft'), eq(warehouseReceipts.status, 'pending_qc'))),
      db.select({ value: count() }).from(warehouseIssues).where(or(eq(warehouseIssues.status, 'draft'), eq(warehouseIssues.status, 'approved'))),
      db.select({ value: count() }).from(inventoryLots).where(eq(inventoryLots.status, 'quarantine')),
      db.select({ value: count() }).from(inventoryLots).where(sql`${inventoryLots.expiryDate} IS NOT NULL AND ${inventoryLots.expiryDate} <= ${cutoffStr} AND ${inventoryLots.expiryDate} >= ${nowStr}`),
    ]);

    const totalLocations = locR[0].value;
    const occupiedLocations = occR[0].value;
    return {
      totalWarehouses: whR[0].value,
      totalLocations,
      occupiedLocations,
      locationUtilization: totalLocations > 0 ? Math.round(occupiedLocations / totalLocations * 100) : 0,
      totalLots: lotR[0].value,
      pendingReceipts: pendRcvR[0].value,
      pendingIssues: pendIssR[0].value,
      expiringLots: expR[0].value,
      quarantineLots: quarR[0].value,
    };
  }),

  traceForward: protectedProcedure
    .input(z.object({ lotNumber: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const lotRows = await db.select().from(inventoryLots).where(eq(inventoryLots.lotNumber, input.lotNumber)).limit(1000);
      if (!lotRows[0]) return { lot: null, allocations: [], serialNumbers: [] };

      const [relatedSerials, relatedIssueItems] = await Promise.all([
        db.select().from(serialNumbers).where(eq(serialNumbers.lotNumber, input.lotNumber)).limit(1000),
        db.select().from(warehouseIssueItems).where(eq(warehouseIssueItems.lotNumber, input.lotNumber)).limit(1000),
      ]);

      const allocations = [];
      for (const ii of relatedIssueItems) {
        const issueRows = await db.select().from(warehouseIssues).where(eq(warehouseIssues.id, ii.issueId)).limit(1000);
        const issue = issueRows[0];
        allocations.push({
          issueCode: issue?.issueCode ?? null,
          issueType: issue?.issueType ?? null,
          projectCode: issue?.projectCode ?? null,
          materialCode: ii.materialCode,
          requestedQty: ii.requestedQty,
          issuedQty: ii.issuedQty,
          issuedAt: issue?.issuedAt ?? null,
        });
      }

      return { lot: lotRows[0], allocations, serialNumbers: relatedSerials };
    }),

  traceBackward: protectedProcedure
    .input(z.object({
      projectCode: z.string().optional(),
      sourceDocCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.projectCode) conditions.push(eq(warehouseIssues.projectCode, input.projectCode));
      if (input.sourceDocCode) conditions.push(eq(warehouseIssues.sourceDocCode, input.sourceDocCode));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const relatedIssues = await db.select().from(warehouseIssues).where(where).limit(1000);

      const results = [];
      for (const issue of relatedIssues) {
        const items = await db.select().from(warehouseIssueItems).where(eq(warehouseIssueItems.issueId, issue.id)).limit(1000);
        const lotNumbers = Array.from(new Set(items.map(ii => ii.lotNumber).filter((ln): ln is string => ln != null)));
        const lots = lotNumbers.length > 0
          ? await db.select().from(inventoryLots).where(or(...lotNumbers.map(ln => eq(inventoryLots.lotNumber, ln)))).limit(1000)
          : [];
        results.push({
          issueCode: issue.issueCode,
          issueType: issue.issueType,
          projectCode: issue.projectCode,
          items: items.map(ii => ({ materialCode: ii.materialCode, materialName: ii.materialName, lotNumber: ii.lotNumber, requestedQty: ii.requestedQty })),
          sourceLots: lots.map(l => ({ lotNumber: l.lotNumber, materialCode: l.materialCode, supplierName: l.supplierName, productionDate: l.productionDate, expiryDate: l.expiryDate })),
        });
      }
      return results;
    }),
});
