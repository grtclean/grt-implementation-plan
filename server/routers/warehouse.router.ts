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
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";

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

// ============================================
// 模拟数据存储
// ============================================

let warehouseIdSeq = 1;
const warehousesStore: any[] = [];
let locationIdSeq = 1;
const locationsStore: any[] = [];
let receiptIdSeq = 1;
const receiptsStore: any[] = [];
let receiptItemIdSeq = 1;
const receiptItemsStore: any[] = [];
let issueIdSeq = 1;
const issuesStore: any[] = [];
let issueItemIdSeq = 1;
const issueItemsStore: any[] = [];
let stockCountIdSeq = 1;
const stockCountsStore: any[] = [];
let lotIdSeq = 1;
const lotsStore: any[] = [];
let serialIdSeq = 1;
const serialsStore: any[] = [];

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
    .mutation(async ({ input }) => {
      const wh = {
        id: warehouseIdSeq++,
        ...input,
        erpWarehouseCode: null,
        erpSyncStatus: 'not_synced' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      warehousesStore.push(wh);
      return wh;
    }),

  getWarehouses: protectedProcedure
    .input(z.object({
      warehouseType: z.string().optional(),
      buCode: z.string().optional(),
      isActive: z.boolean().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      let filtered = [...warehousesStore];
      if (input.warehouseType) filtered = filtered.filter(w => w.warehouseType === input.warehouseType);
      if (input.buCode) filtered = filtered.filter(w => w.buCode === input.buCode);
      if (input.isActive !== undefined) filtered = filtered.filter(w => w.isActive === input.isActive);
      if (input.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter(w =>
          w.warehouseCode.toLowerCase().includes(s) ||
          w.warehouseName.toLowerCase().includes(s)
        );
      }
      return filtered;
    }),

  getWarehouse: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const wh = warehousesStore.find(w => w.id === input.id);
      if (!wh) return null;
      const locations = locationsStore.filter(l => l.warehouseId === input.id);
      return { ...wh, locations };
    }),

  updateWarehouse: adminProcedure
    .input(WarehouseCreateSchema.partial().extend({ id: z.number() }))
    .mutation(async ({ input }) => {
      const idx = warehousesStore.findIndex(w => w.id === input.id);
      if (idx === -1) throw new Error('Warehouse not found');
      const { id, ...updates } = input;
      warehousesStore[idx] = { ...warehousesStore[idx], ...updates, updatedAt: new Date().toISOString() };
      return warehousesStore[idx];
    }),

  toggleWarehouseActive: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const idx = warehousesStore.findIndex(w => w.id === input.id);
      if (idx === -1) throw new Error('Warehouse not found');
      warehousesStore[idx].isActive = input.isActive;
      warehousesStore[idx].updatedAt = new Date().toISOString();
      return warehousesStore[idx];
    }),

  // ==========================================
  // 库位管理
  // ==========================================

  createLocation: adminProcedure
    .input(LocationCreateSchema)
    .mutation(async ({ input }) => {
      const loc = {
        id: locationIdSeq++,
        ...input,
        isOccupied: false,
        currentMaterialCode: null,
        currentQty: 0,
        isActive: true,
        isLocked: false,
        lockReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      locationsStore.push(loc);
      return loc;
    }),

  getLocations: protectedProcedure
    .input(z.object({
      warehouseId: z.number(),
      zone: z.string().optional(),
      locationType: z.string().optional(),
      isOccupied: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      let filtered = locationsStore.filter(l => l.warehouseId === input.warehouseId);
      if (input.zone) filtered = filtered.filter(l => l.zone === input.zone);
      if (input.locationType) filtered = filtered.filter(l => l.locationType === input.locationType);
      if (input.isOccupied !== undefined) filtered = filtered.filter(l => l.isOccupied === input.isOccupied);
      return filtered;
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
      const wh = warehousesStore.find(w => w.id === input.warehouseId);
      if (!wh) throw new Error('Warehouse not found');
      const created: any[] = [];
      for (let a = 1; a <= input.aisleCount; a++) {
        for (let s = 1; s <= input.shelfCount; s++) {
          for (let b = 1; b <= input.binCount; b++) {
            const aisleStr = String(a).padStart(2, '0');
            const shelfStr = String(s).padStart(2, '0');
            const binStr = String(b).padStart(2, '0');
            const locationCode = `${wh.warehouseCode}-${input.zone}-${aisleStr}-${shelfStr}-${binStr}`;
            const loc = {
              id: locationIdSeq++,
              warehouseId: input.warehouseId,
              locationCode,
              zone: input.zone,
              aisle: aisleStr,
              shelf: shelfStr,
              bin: binStr,
              locationType: input.locationType,
              maxWeight: null,
              maxVolume: null,
              maxItems: null,
              tempRequirement: 'normal' as const,
              isOccupied: false,
              currentMaterialCode: null,
              currentQty: 0,
              isActive: true,
              isLocked: false,
              lockReason: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            locationsStore.push(loc);
            created.push(loc);
          }
        }
      }
      return { created: created.length, message: `已创建 ${created.length} 个库位` };
    }),

  lockLocation: adminProcedure
    .input(z.object({ id: z.number(), isLocked: z.boolean(), lockReason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const idx = locationsStore.findIndex(l => l.id === input.id);
      if (idx === -1) throw new Error('Location not found');
      locationsStore[idx].isLocked = input.isLocked;
      locationsStore[idx].lockReason = input.isLocked ? (input.lockReason || '手动锁定') : null;
      locationsStore[idx].updatedAt = new Date().toISOString();
      return locationsStore[idx];
    }),

  // ==========================================
  // 入库单
  // ==========================================

  createReceipt: protectedProcedure
    .input(ReceiptCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const { items, ...receiptData } = input;
      const receipt = {
        id: receiptIdSeq++,
        receiptCode: generateCode('RCV'),
        ...receiptData,
        status: 'draft' as const,
        receivedBy: ctx.user?.id,
        receivedByName: ctx.user?.name || '',
        receivedAt: null,
        qcResult: 'pending' as const,
        qcBy: null,
        qcAt: null,
        qcNotes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      receiptsStore.push(receipt);

      const createdItems: any[] = [];
      for (const item of items) {
        const ri = {
          id: receiptItemIdSeq++,
          receiptId: receipt.id,
          ...item,
          createdAt: new Date().toISOString(),
        };
        receiptItemsStore.push(ri);
        createdItems.push(ri);
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
      let filtered = [...receiptsStore];
      if (input.warehouseId) filtered = filtered.filter(r => r.warehouseId === input.warehouseId);
      if (input.receiptType) filtered = filtered.filter(r => r.receiptType === input.receiptType);
      if (input.status) filtered = filtered.filter(r => r.status === input.status);
      const total = filtered.length;
      const start = (input.page - 1) * input.pageSize;
      const items = filtered.slice(start, start + input.pageSize);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  getReceipt: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const receipt = receiptsStore.find(r => r.id === input.id);
      if (!receipt) return null;
      const items = receiptItemsStore.filter(ri => ri.receiptId === input.id);
      return { ...receipt, items };
    }),

  updateReceiptStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['draft', 'pending_qc', 'qc_passed', 'qc_failed', 'shelved', 'cancelled']),
      qcNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const idx = receiptsStore.findIndex(r => r.id === input.id);
      if (idx === -1) throw new Error('Receipt not found');
      receiptsStore[idx].status = input.status;

      if (input.status === 'shelved') {
        receiptsStore[idx].receivedAt = new Date().toISOString();
      }
      if (input.status === 'qc_passed' || input.status === 'qc_failed') {
        receiptsStore[idx].qcResult = input.status === 'qc_passed' ? 'passed' : 'failed';
        receiptsStore[idx].qcBy = ctx.user?.id;
        receiptsStore[idx].qcAt = new Date().toISOString();
        if (input.qcNotes) receiptsStore[idx].qcNotes = input.qcNotes;
      }

      receiptsStore[idx].updatedAt = new Date().toISOString();
      return receiptsStore[idx];
    }),

  // ==========================================
  // 出库单
  // ==========================================

  createIssue: protectedProcedure
    .input(IssueCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const { items, ...issueData } = input;
      const issue = {
        id: issueIdSeq++,
        issueCode: generateCode('ISS'),
        ...issueData,
        status: 'draft' as const,
        issuedBy: ctx.user?.id,
        issuedByName: ctx.user?.name || '',
        issuedAt: null,
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      issuesStore.push(issue);

      const createdItems: any[] = [];
      for (const item of items) {
        const ii = {
          id: issueItemIdSeq++,
          issueId: issue.id,
          ...item,
          issuedQty: 0,
          createdAt: new Date().toISOString(),
        };
        issueItemsStore.push(ii);
        createdItems.push(ii);
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
      let filtered = [...issuesStore];
      if (input.warehouseId) filtered = filtered.filter(i => i.warehouseId === input.warehouseId);
      if (input.issueType) filtered = filtered.filter(i => i.issueType === input.issueType);
      if (input.status) filtered = filtered.filter(i => i.status === input.status);
      if (input.projectCode) filtered = filtered.filter(i => i.projectCode === input.projectCode);
      const total = filtered.length;
      const start = (input.page - 1) * input.pageSize;
      const items = filtered.slice(start, start + input.pageSize);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  getIssue: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const issue = issuesStore.find(i => i.id === input.id);
      if (!issue) return null;
      const items = issueItemsStore.filter(ii => ii.issueId === input.id);
      return { ...issue, items };
    }),

  updateIssueStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['draft', 'approved', 'picking', 'issued', 'partial', 'cancelled']),
    }))
    .mutation(async ({ input, ctx }) => {
      const idx = issuesStore.findIndex(i => i.id === input.id);
      if (idx === -1) throw new Error('Issue not found');
      issuesStore[idx].status = input.status;
      if (input.status === 'approved') {
        issuesStore[idx].approvedBy = ctx.user?.id;
        issuesStore[idx].approvedAt = new Date().toISOString();
      }
      if (input.status === 'issued') {
        issuesStore[idx].issuedAt = new Date().toISOString();
      }
      issuesStore[idx].updatedAt = new Date().toISOString();
      return issuesStore[idx];
    }),

  // ==========================================
  // 库存盘点
  // ==========================================

  createStockCount: adminProcedure
    .input(StockCountCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const count = {
        id: stockCountIdSeq++,
        countCode: generateCode('CNT'),
        ...input,
        status: 'planned' as const,
        startedAt: null,
        completedAt: null,
        countedBy: ctx.user?.id,
        verifiedBy: null,
        approvedBy: null,
        totalItems: 0,
        matchedItems: 0,
        discrepancyItems: 0,
        totalDiscrepancyValue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      stockCountsStore.push(count);
      return count;
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
      let filtered = [...stockCountsStore];
      if (input.warehouseId) filtered = filtered.filter(c => c.warehouseId === input.warehouseId);
      if (input.status) filtered = filtered.filter(c => c.status === input.status);
      if (input.countType) filtered = filtered.filter(c => c.countType === input.countType);
      const total = filtered.length;
      const start = (input.page - 1) * input.pageSize;
      const items = filtered.slice(start, start + input.pageSize);
      return { items, total, page: input.page, pageSize: input.pageSize };
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
      const idx = stockCountsStore.findIndex(c => c.id === input.id);
      if (idx === -1) throw new Error('Stock count not found');
      const { id, ...updates } = input;
      Object.assign(stockCountsStore[idx], updates);
      if (input.status === 'in_progress') stockCountsStore[idx].startedAt = new Date().toISOString();
      if (input.status === 'completed') stockCountsStore[idx].completedAt = new Date().toISOString();
      if (input.status === 'approved') stockCountsStore[idx].approvedBy = ctx.user?.id;
      stockCountsStore[idx].updatedAt = new Date().toISOString();
      return stockCountsStore[idx];
    }),

  // ==========================================
  // 批次(Lot)追踪
  // ==========================================

  createLot: protectedProcedure
    .input(LotCreateSchema)
    .mutation(async ({ input }) => {
      const lot = {
        id: lotIdSeq++,
        ...input,
        currentQty: input.initialQty,
        reservedQty: 0,
        receivedDate: new Date().toISOString(),
        qcStatus: 'pending' as const,
        qcReportId: null,
        qcCertificateNumber: null,
        status: 'available' as const,
        totalCost: (input.unitCost || 0) * input.initialQty,
        erpLotId: null,
        erpSyncStatus: 'not_synced' as const,
        traceAttributes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      lotsStore.push(lot);
      return lot;
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
      let filtered = [...lotsStore];
      if (input.materialCode) filtered = filtered.filter(l => l.materialCode === input.materialCode);
      if (input.warehouseId) filtered = filtered.filter(l => l.warehouseId === input.warehouseId);
      if (input.status) filtered = filtered.filter(l => l.status === input.status);
      if (input.qcStatus) filtered = filtered.filter(l => l.qcStatus === input.qcStatus);
      if (input.expiringWithinDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + input.expiringWithinDays);
        filtered = filtered.filter(l =>
          l.expiryDate && new Date(l.expiryDate) <= cutoff && new Date(l.expiryDate) >= new Date()
        );
      }
      const total = filtered.length;
      const start = (input.page - 1) * input.pageSize;
      const items = filtered.slice(start, start + input.pageSize);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  getLot: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return lotsStore.find(l => l.id === input.id) || null;
    }),

  updateLotStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['available', 'reserved', 'quarantine', 'expired', 'consumed', 'scrapped']),
    }))
    .mutation(async ({ input }) => {
      const idx = lotsStore.findIndex(l => l.id === input.id);
      if (idx === -1) throw new Error('Lot not found');
      lotsStore[idx].status = input.status;
      lotsStore[idx].updatedAt = new Date().toISOString();
      return lotsStore[idx];
    }),

  updateLotQC: protectedProcedure
    .input(z.object({
      id: z.number(),
      qcStatus: z.enum(['pending', 'passed', 'failed', 'conditional']),
      qcCertificateNumber: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const idx = lotsStore.findIndex(l => l.id === input.id);
      if (idx === -1) throw new Error('Lot not found');
      lotsStore[idx].qcStatus = input.qcStatus;
      if (input.qcCertificateNumber) lotsStore[idx].qcCertificateNumber = input.qcCertificateNumber;
      if (input.qcStatus === 'failed') lotsStore[idx].status = 'quarantine';
      lotsStore[idx].updatedAt = new Date().toISOString();
      return lotsStore[idx];
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
      const sn = {
        id: serialIdSeq++,
        ...input,
        status: 'in_stock' as const,
        currentProjectCode: null,
        currentProcessCode: null,
        currentHolderId: null,
        receivedDate: new Date().toISOString(),
        lifecycleEvents: [{ date: new Date().toISOString(), event: 'created', notes: '入库登记' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serialsStore.push(sn);
      return sn;
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
      let filtered = [...serialsStore];
      if (input.materialCode) filtered = filtered.filter(s => s.materialCode === input.materialCode);
      if (input.lotId) filtered = filtered.filter(s => s.lotId === input.lotId);
      if (input.status) filtered = filtered.filter(s => s.status === input.status);
      if (input.search) {
        const q = input.search.toLowerCase();
        filtered = filtered.filter(s => s.serialNumber.toLowerCase().includes(q));
      }
      const total = filtered.length;
      const start = (input.page - 1) * input.pageSize;
      const items = filtered.slice(start, start + input.pageSize);
      return { items, total, page: input.page, pageSize: input.pageSize };
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
      const idx = serialsStore.findIndex(s => s.id === input.id);
      if (idx === -1) throw new Error('Serial number not found');
      serialsStore[idx].status = input.status;
      if (input.projectCode !== undefined) serialsStore[idx].currentProjectCode = input.projectCode;
      if (input.processCode !== undefined) serialsStore[idx].currentProcessCode = input.processCode;
      if (input.holderId !== undefined) serialsStore[idx].currentHolderId = input.holderId;
      // 追加生命周期事件
      const events = serialsStore[idx].lifecycleEvents || [];
      events.push({
        date: new Date().toISOString(),
        event: input.status,
        notes: input.notes || '',
      });
      serialsStore[idx].lifecycleEvents = events;
      serialsStore[idx].updatedAt = new Date().toISOString();
      return serialsStore[idx];
    }),

  // ==========================================
  // 库存统计 & 仪表板
  // ==========================================

  getWarehouseStats: protectedProcedure.query(async () => {
    const totalWarehouses = warehousesStore.filter(w => w.isActive).length;
    const totalLocations = locationsStore.filter(l => l.isActive).length;
    const occupiedLocations = locationsStore.filter(l => l.isOccupied).length;
    const totalLots = lotsStore.filter(l => l.status === 'available').length;
    const pendingReceipts = receiptsStore.filter(r => r.status === 'draft' || r.status === 'pending_qc').length;
    const pendingIssues = issuesStore.filter(i => i.status === 'draft' || i.status === 'approved').length;
    const expiringLots = lotsStore.filter(l => {
      if (!l.expiryDate) return false;
      const daysLeft = (new Date(l.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft > 0 && daysLeft <= 30;
    }).length;
    const quarantineLots = lotsStore.filter(l => l.status === 'quarantine').length;

    return {
      totalWarehouses,
      totalLocations,
      occupiedLocations,
      locationUtilization: totalLocations > 0 ? Math.round(occupiedLocations / totalLocations * 100) : 0,
      totalLots,
      pendingReceipts,
      pendingIssues,
      expiringLots,
      quarantineLots,
    };
  }),

  /**
   * 物料正向追溯：从批次查去向（被分配到哪些项目/工单）
   */
  traceForward: protectedProcedure
    .input(z.object({ lotNumber: z.string() }))
    .query(async ({ input }) => {
      const lot = lotsStore.find(l => l.lotNumber === input.lotNumber);
      if (!lot) return { lot: null, allocations: [], serialNumbers: [] };
      const relatedSerials = serialsStore.filter(s => s.lotNumber === input.lotNumber);
      // 从出库单中找相关记录
      const relatedIssueItems = issueItemsStore.filter(ii => ii.lotNumber === input.lotNumber);
      const allocations = relatedIssueItems.map(ii => {
        const issue = issuesStore.find(i => i.id === ii.issueId);
        return {
          issueCode: issue?.issueCode,
          issueType: issue?.issueType,
          projectCode: issue?.projectCode,
          materialCode: ii.materialCode,
          requestedQty: ii.requestedQty,
          issuedQty: ii.issuedQty,
          issuedAt: issue?.issuedAt,
        };
      });
      return { lot, allocations, serialNumbers: relatedSerials };
    }),

  /**
   * 物料反向追溯：从项目/工单查来源批次
   */
  traceBackward: protectedProcedure
    .input(z.object({
      projectCode: z.string().optional(),
      sourceDocCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      let relatedIssues = [...issuesStore];
      if (input.projectCode) relatedIssues = relatedIssues.filter(i => i.projectCode === input.projectCode);
      if (input.sourceDocCode) relatedIssues = relatedIssues.filter(i => i.sourceDocCode === input.sourceDocCode);

      const results = relatedIssues.map(issue => {
        const items = issueItemsStore.filter(ii => ii.issueId === issue.id);
        const lotNumbers = Array.from(new Set(items.map(ii => ii.lotNumber).filter(Boolean)));
        const lots = lotsStore.filter(l => lotNumbers.includes(l.lotNumber));
        return {
          issueCode: issue.issueCode,
          issueType: issue.issueType,
          projectCode: issue.projectCode,
          items: items.map(ii => ({
            materialCode: ii.materialCode,
            materialName: ii.materialName,
            lotNumber: ii.lotNumber,
            requestedQty: ii.requestedQty,
          })),
          sourceLots: lots.map(l => ({
            lotNumber: l.lotNumber,
            materialCode: l.materialCode,
            supplierName: l.supplierName,
            productionDate: l.productionDate,
            expiryDate: l.expiryDate,
          })),
        };
      });
      return results;
    }),
});
