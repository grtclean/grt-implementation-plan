/**
 * GRT 5.0 BOM (Bill of Materials) 管理路由
 *
 * 功能:
 * - BOM主表CRUD (bomMasters)
 * - BOM明细行管理 (bomItems - 父子层级)
 * - 版本管理 / ECN工程变更 (bomVersions)
 * - 成本卷积计算 (bomCostRollups)
 * - BOM树查询 (多层级展开)
 * - 天思ERP同步支持
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";

// ============================================
// Zod验证Schema
// ============================================

const BomMasterCreateSchema = z.object({
  productCode: z.string().min(1),
  productName: z.string().min(1),
  bomType: z.enum(['manufacturing', 'engineering', 'sales', 'template']).default('manufacturing'),
  currentVersion: z.string().default('1.0'),
  buCode: z.enum(['BU1', 'BU2', 'BU3', 'BU4', 'BU5']).optional(),
  productCategory: z.string().optional(),
  standardQty: z.number().default(1),
  standardUnit: z.string().default('台'),
  description: z.string().optional(),
  notes: z.string().optional(),
});

const BomMasterUpdateSchema = BomMasterCreateSchema.partial().extend({
  id: z.number(),
});

const BomItemCreateSchema = z.object({
  bomMasterId: z.number(),
  parentItemId: z.number().optional(),
  level: z.number().default(1),
  sequence: z.number().default(10),
  materialCode: z.string().min(1),
  materialName: z.string().min(1),
  materialSpec: z.string().optional(),
  quantity: z.number().min(0),
  unit: z.string().default('个'),
  scrapRate: z.number().default(0),
  isCritical: z.boolean().default(false),
  sourceType: z.enum(['purchase', 'manufacture', 'outsource', 'phantom']).default('purchase'),
  processCode: z.string().optional(),
  leadTimeDays: z.number().default(0),
  substituteCode: z.string().optional(),
  substituteRatio: z.number().optional(),
  unitCost: z.number().default(0),
  preferredSupplierId: z.number().optional(),
  remarks: z.string().optional(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
});

const BomItemUpdateSchema = BomItemCreateSchema.partial().extend({
  id: z.number(),
});

const BomVersionCreateSchema = z.object({
  bomMasterId: z.number(),
  version: z.string().min(1),
  changeType: z.enum(['new', 'revision', 'ecn', 'cost_update', 'obsolete']),
  ecnNumber: z.string().optional(),
  changeReason: z.string().optional(),
  changeDescription: z.string().optional(),
  effectiveDate: z.string().optional(),
});

// ============================================
// 模拟数据存储 (替代DB层)
// ============================================

let bomMasterIdSeq = 1;
const bomMasters: any[] = [];
let bomItemIdSeq = 1;
const bomItemsStore: any[] = [];
let bomVersionIdSeq = 1;
const bomVersionsStore: any[] = [];
let bomCostIdSeq = 1;
const bomCostRollupsStore: any[] = [];

// ============================================
// Router
// ============================================

export const bomRouter = router({
  // ---- BOM Master CRUD ----

  /**
   * 创建BOM主记录
   */
  createBomMaster: adminProcedure
    .input(BomMasterCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const bom = {
        id: bomMasterIdSeq++,
        ...input,
        status: 'draft' as const,
        maxLevel: 1,
        totalMaterialCost: 0,
        totalLaborCost: 0,
        totalOverheadCost: 0,
        erpBomId: null,
        erpSyncStatus: 'not_synced' as const,
        createdBy: ctx.user?.id,
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      bomMasters.push(bom);
      return bom;
    }),

  /**
   * 获取BOM列表（分页+筛选）
   */
  getBomMasters: protectedProcedure
    .input(z.object({
      bomType: z.string().optional(),
      status: z.string().optional(),
      buCode: z.string().optional(),
      productCategory: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      let filtered = [...bomMasters];
      if (input.bomType) filtered = filtered.filter(b => b.bomType === input.bomType);
      if (input.status) filtered = filtered.filter(b => b.status === input.status);
      if (input.buCode) filtered = filtered.filter(b => b.buCode === input.buCode);
      if (input.productCategory) filtered = filtered.filter(b => b.productCategory === input.productCategory);
      if (input.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter(b =>
          b.productCode.toLowerCase().includes(s) ||
          b.productName.toLowerCase().includes(s)
        );
      }
      const total = filtered.length;
      const start = (input.page - 1) * input.pageSize;
      const items = filtered.slice(start, start + input.pageSize);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /**
   * 获取单个BOM（含明细行、版本列表）
   */
  getBomMaster: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const master = bomMasters.find(b => b.id === input.id) || null;
      if (!master) return null;
      const items = bomItemsStore.filter(i => i.bomMasterId === input.id);
      const versions = bomVersionsStore.filter(v => v.bomMasterId === input.id);
      const costRollups = bomCostRollupsStore.filter(c => c.bomMasterId === input.id);
      return { ...master, items, versions, costRollups };
    }),

  /**
   * 更新BOM主记录
   */
  updateBomMaster: adminProcedure
    .input(BomMasterUpdateSchema)
    .mutation(async ({ input }) => {
      const idx = bomMasters.findIndex(b => b.id === input.id);
      if (idx === -1) throw new Error('BOM not found');
      const { id, ...updates } = input;
      bomMasters[idx] = { ...bomMasters[idx], ...updates, updatedAt: new Date().toISOString() };
      return bomMasters[idx];
    }),

  /**
   * 更新BOM状态（审批流: draft→pending_review→approved→active）
   */
  updateBomStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['draft', 'pending_review', 'approved', 'active', 'superseded', 'obsolete']),
    }))
    .mutation(async ({ input, ctx }) => {
      const idx = bomMasters.findIndex(b => b.id === input.id);
      if (idx === -1) throw new Error('BOM not found');
      bomMasters[idx].status = input.status;
      if (input.status === 'approved') {
        bomMasters[idx].approvedBy = ctx.user?.id;
        bomMasters[idx].approvedAt = new Date().toISOString();
      }
      bomMasters[idx].updatedAt = new Date().toISOString();
      return bomMasters[idx];
    }),

  /**
   * 删除BOM (仅draft状态)
   */
  deleteBomMaster: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const idx = bomMasters.findIndex(b => b.id === input.id);
      if (idx === -1) throw new Error('BOM not found');
      if (bomMasters[idx].status !== 'draft') throw new Error('只能删除草稿状态的BOM');
      bomMasters.splice(idx, 1);
      // 同时删除子记录
      const removeItems = bomItemsStore.filter(i => i.bomMasterId === input.id).map(i => i.id);
      removeItems.forEach(itemId => {
        const iIdx = bomItemsStore.findIndex(i => i.id === itemId);
        if (iIdx !== -1) bomItemsStore.splice(iIdx, 1);
      });
      return { success: true, message: 'BOM已删除' };
    }),

  // ---- BOM Item (明细行) CRUD ----

  /**
   * 添加BOM明细行
   */
  addBomItem: adminProcedure
    .input(BomItemCreateSchema)
    .mutation(async ({ input }) => {
      const extendedCost = input.quantity * input.unitCost * (1 + (input.scrapRate || 0) / 100);
      const item = {
        id: bomItemIdSeq++,
        ...input,
        extendedCost: Math.round(extendedCost * 100) / 100,
        erpItemId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      bomItemsStore.push(item);

      // 更新BOM主表的maxLevel
      const masterIdx = bomMasters.findIndex(b => b.id === input.bomMasterId);
      if (masterIdx !== -1 && input.level > (bomMasters[masterIdx].maxLevel || 0)) {
        bomMasters[masterIdx].maxLevel = input.level;
      }

      return item;
    }),

  /**
   * 更新BOM明细行
   */
  updateBomItem: adminProcedure
    .input(BomItemUpdateSchema)
    .mutation(async ({ input }) => {
      const idx = bomItemsStore.findIndex(i => i.id === input.id);
      if (idx === -1) throw new Error('BOM Item not found');
      const { id, ...updates } = input;
      bomItemsStore[idx] = { ...bomItemsStore[idx], ...updates, updatedAt: new Date().toISOString() };

      // 重算extendedCost
      const item = bomItemsStore[idx];
      item.extendedCost = Math.round(
        (item.quantity || 0) * (item.unitCost || 0) * (1 + (item.scrapRate || 0) / 100) * 100
      ) / 100;

      return bomItemsStore[idx];
    }),

  /**
   * 删除BOM明细行
   */
  deleteBomItem: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const idx = bomItemsStore.findIndex(i => i.id === input.id);
      if (idx === -1) throw new Error('BOM Item not found');
      bomItemsStore.splice(idx, 1);
      return { success: true };
    }),

  /**
   * 获取BOM树 (多层级展开)
   */
  getBomTree: protectedProcedure
    .input(z.object({ bomMasterId: z.number() }))
    .query(async ({ input }) => {
      const allItems = bomItemsStore.filter(i => i.bomMasterId === input.bomMasterId);

      // 构建树结构
      function buildTree(parentId: number | null): any[] {
        return allItems
          .filter(i => (i.parentItemId || null) === parentId)
          .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
          .map(item => ({
            ...item,
            children: buildTree(item.id),
          }));
      }

      return buildTree(null);
    }),

  /**
   * 批量添加BOM明细行
   */
  batchAddBomItems: adminProcedure
    .input(z.object({
      bomMasterId: z.number(),
      items: z.array(BomItemCreateSchema.omit({ bomMasterId: true })),
    }))
    .mutation(async ({ input }) => {
      const created: any[] = [];
      let maxLevel = 0;

      for (const itemInput of input.items) {
        const extendedCost = itemInput.quantity * (itemInput.unitCost || 0) * (1 + (itemInput.scrapRate || 0) / 100);
        const item = {
          id: bomItemIdSeq++,
          bomMasterId: input.bomMasterId,
          ...itemInput,
          extendedCost: Math.round(extendedCost * 100) / 100,
          erpItemId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        bomItemsStore.push(item);
        created.push(item);
        if ((itemInput.level || 1) > maxLevel) maxLevel = itemInput.level || 1;
      }

      // 更新maxLevel
      const masterIdx = bomMasters.findIndex(b => b.id === input.bomMasterId);
      if (masterIdx !== -1 && maxLevel > (bomMasters[masterIdx].maxLevel || 0)) {
        bomMasters[masterIdx].maxLevel = maxLevel;
      }

      return { created: created.length, items: created };
    }),

  // ---- BOM版本管理 ----

  /**
   * 创建新版本 / ECN变更
   */
  createVersion: adminProcedure
    .input(BomVersionCreateSchema)
    .mutation(async ({ input, ctx }) => {
      // 对当前BOM做快照
      const currentItems = bomItemsStore.filter(i => i.bomMasterId === input.bomMasterId);
      const master = bomMasters.find(b => b.id === input.bomMasterId);

      const version = {
        id: bomVersionIdSeq++,
        ...input,
        status: 'draft' as const,
        expiryDate: null,
        requestedBy: ctx.user?.id,
        reviewedBy: null,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        bomSnapshot: { master, items: currentItems },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      bomVersionsStore.push(version);
      return version;
    }),

  /**
   * 获取版本列表
   */
  getVersions: protectedProcedure
    .input(z.object({ bomMasterId: z.number() }))
    .query(async ({ input }) => {
      return bomVersionsStore
        .filter(v => v.bomMasterId === input.bomMasterId)
        .sort((a, b) => b.id - a.id);
    }),

  /**
   * 审批版本
   */
  approveVersion: adminProcedure
    .input(z.object({
      id: z.number(),
      action: z.enum(['approve', 'reject']),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const idx = bomVersionsStore.findIndex(v => v.id === input.id);
      if (idx === -1) throw new Error('Version not found');

      if (input.action === 'approve') {
        bomVersionsStore[idx].status = 'approved';
        bomVersionsStore[idx].approvedBy = ctx.user?.id;
        bomVersionsStore[idx].approvedAt = new Date().toISOString();

        // 将BOM主表版本号更新为此版本
        const masterIdx = bomMasters.findIndex(b => b.id === bomVersionsStore[idx].bomMasterId);
        if (masterIdx !== -1) {
          bomMasters[masterIdx].currentVersion = bomVersionsStore[idx].version;
          bomMasters[masterIdx].updatedAt = new Date().toISOString();
        }
      } else {
        bomVersionsStore[idx].status = 'rejected';
        bomVersionsStore[idx].rejectionReason = input.reason || '';
      }

      bomVersionsStore[idx].updatedAt = new Date().toISOString();
      return bomVersionsStore[idx];
    }),

  // ---- 成本卷积 ----

  /**
   * 触发成本卷积计算
   */
  calculateCostRollup: protectedProcedure
    .input(z.object({
      bomMasterId: z.number(),
      costType: z.enum(['standard', 'actual', 'estimated', 'budget']).default('standard'),
    }))
    .mutation(async ({ input }) => {
      const items = bomItemsStore.filter(i => i.bomMasterId === input.bomMasterId);
      const master = bomMasters.find(b => b.id === input.bomMasterId);
      if (!master) throw new Error('BOM not found');

      // 分类汇总
      let materialCost = 0;
      let purchaseCost = 0;
      let laborCost = 0;
      let outsourceCost = 0;

      for (const item of items) {
        const cost = (item.quantity || 0) * (item.unitCost || 0) * (1 + (item.scrapRate || 0) / 100);
        switch (item.sourceType) {
          case 'purchase': purchaseCost += cost; break;
          case 'manufacture': laborCost += cost; break;
          case 'outsource': outsourceCost += cost; break;
          default: materialCost += cost;
        }
      }

      const overheadCost = laborCost * 0.15; // 15%间接费用
      const totalCost = materialCost + purchaseCost + laborCost + outsourceCost + overheadCost;

      const rollup = {
        id: bomCostIdSeq++,
        bomMasterId: input.bomMasterId,
        version: master.currentVersion,
        costType: input.costType,
        calculatedAt: new Date().toISOString(),
        materialCost: Math.round(materialCost * 100) / 100,
        purchaseCost: Math.round(purchaseCost * 100) / 100,
        laborCost: Math.round(laborCost * 100) / 100,
        overheadCost: Math.round(overheadCost * 100) / 100,
        outsourceCost: Math.round(outsourceCost * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        costBreakdown: items.map(i => ({
          materialCode: i.materialCode,
          materialName: i.materialName,
          qty: i.quantity,
          unitCost: i.unitCost,
          scrapRate: i.scrapRate,
          extendedCost: i.extendedCost,
          sourceType: i.sourceType,
        })),
        currency: 'CNY',
        createdAt: new Date().toISOString(),
      };

      bomCostRollupsStore.push(rollup);

      // 更新主表成本
      const masterIdx = bomMasters.findIndex(b => b.id === input.bomMasterId);
      if (masterIdx !== -1) {
        bomMasters[masterIdx].totalMaterialCost = rollup.materialCost + rollup.purchaseCost;
        bomMasters[masterIdx].totalLaborCost = rollup.laborCost;
        bomMasters[masterIdx].totalOverheadCost = rollup.overheadCost + rollup.outsourceCost;
        bomMasters[masterIdx].updatedAt = new Date().toISOString();
      }

      return rollup;
    }),

  /**
   * 获取成本卷积历史
   */
  getCostRollups: protectedProcedure
    .input(z.object({
      bomMasterId: z.number(),
      costType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      let results = bomCostRollupsStore.filter(c => c.bomMasterId === input.bomMasterId);
      if (input.costType) results = results.filter(c => c.costType === input.costType);
      return results.sort((a, b) => b.id - a.id);
    }),

  // ---- 统计与搜索 ----

  /**
   * BOM统计概览
   */
  getStats: protectedProcedure.query(async () => {
    const total = bomMasters.length;
    const active = bomMasters.filter(b => b.status === 'active').length;
    const draft = bomMasters.filter(b => b.status === 'draft').length;
    const pendingReview = bomMasters.filter(b => b.status === 'pending_review').length;
    const totalItems = bomItemsStore.length;
    const criticalItems = bomItemsStore.filter(i => i.isCritical).length;
    return { total, active, draft, pendingReview, totalItems, criticalItems };
  }),

  /**
   * 查询物料被哪些BOM使用（反向追溯: Where-Used）
   */
  whereUsed: protectedProcedure
    .input(z.object({ materialCode: z.string() }))
    .query(async ({ input }) => {
      const usages = bomItemsStore
        .filter(i => i.materialCode === input.materialCode)
        .map(i => {
          const master = bomMasters.find(b => b.id === i.bomMasterId);
          return {
            bomMasterId: i.bomMasterId,
            productCode: master?.productCode,
            productName: master?.productName,
            bomType: master?.bomType,
            bomStatus: master?.status,
            level: i.level,
            quantity: i.quantity,
            unit: i.unit,
          };
        });
      return usages;
    }),

  /**
   * 天思ERP同步标记
   */
  markErpSynced: adminProcedure
    .input(z.object({
      id: z.number(),
      erpBomId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const idx = bomMasters.findIndex(b => b.id === input.id);
      if (idx === -1) throw new Error('BOM not found');
      bomMasters[idx].erpBomId = input.erpBomId;
      bomMasters[idx].erpSyncStatus = 'synced';
      bomMasters[idx].erpLastSyncAt = new Date().toISOString();
      bomMasters[idx].updatedAt = new Date().toISOString();
      return bomMasters[idx];
    }),
});
