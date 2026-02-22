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
import { router, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, desc, and, or, like, count, sql } from "drizzle-orm";
import { bomMasters, bomItems, bomVersions, bomCostRollups } from "../../drizzle/bom-schema";

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
// Router
// ============================================

export const bomRouter = router({
  // ---- BOM Master CRUD ----

  /**
   * 创建BOM主记录
   */
  createBomMaster: publicProcedure
    .input(BomMasterCreateSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const rows = await db.insert(bomMasters).values({
        productCode: input.productCode,
        productName: input.productName,
        bomType: input.bomType,
        currentVersion: input.currentVersion,
        status: 'draft',
        buCode: input.buCode,
        productCategory: input.productCategory,
        maxLevel: 1,
        standardQty: String(input.standardQty),
        standardUnit: input.standardUnit,
        totalMaterialCost: '0.00',
        totalLaborCost: '0.00',
        totalOverheadCost: '0.00',
        erpBomId: null,
        erpSyncStatus: 'not_synced',
        createdBy: null,
        approvedBy: null,
        approvedAt: null,
        description: input.description ?? null,
        notes: input.notes ?? null,
        createdAt: now,
      }).returning();

      return rows[0] ?? null;
    }),

  /**
   * 获取BOM列表（分页+筛选）
   */
  getBomMasters: publicProcedure
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
      const db = await requireDb();

      const conditions = [];
      if (input.bomType) {
        conditions.push(eq(bomMasters.bomType, input.bomType as "manufacturing" | "engineering" | "sales" | "template"));
      }
      if (input.status) {
        conditions.push(eq(bomMasters.status, input.status as "draft" | "pending_review" | "approved" | "active" | "superseded" | "obsolete"));
      }
      if (input.buCode) {
        conditions.push(eq(bomMasters.buCode, input.buCode as "BU1" | "BU2" | "BU3" | "BU4" | "BU5"));
      }
      if (input.productCategory) {
        conditions.push(eq(bomMasters.productCategory, input.productCategory));
      }
      if (input.search) {
        const pattern = `%${input.search}%`;
        conditions.push(
          or(
            like(bomMasters.productCode, pattern),
            like(bomMasters.productName, pattern)
          )!
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db
        .select({ value: count() })
        .from(bomMasters)
        .where(whereClause);
      const total = totalResult[0].value;

      const offset = (input.page - 1) * input.pageSize;
      const items = await db
        .select()
        .from(bomMasters)
        .where(whereClause)
        .orderBy(desc(bomMasters.id))
        .limit(input.pageSize)
        .offset(offset);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /**
   * 获取单个BOM（含明细行、版本列表）
   */
  getBomMaster: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const masterRows = await db.select().from(bomMasters).where(eq(bomMasters.id, input.id));
      const master = masterRows[0] ?? null;
      if (!master) return null;

      const items = await db.select().from(bomItems).where(eq(bomItems.bomMasterId, input.id));
      const versions = await db.select().from(bomVersions).where(eq(bomVersions.bomMasterId, input.id));
      const costRollups = await db.select().from(bomCostRollups).where(eq(bomCostRollups.bomMasterId, input.id));

      return { ...master, items, versions, costRollups };
    }),

  /**
   * 更新BOM主记录
   */
  updateBomMaster: publicProcedure
    .input(BomMasterUpdateSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;

      // Build the update values, converting numbers to strings for decimal fields
      const updateValues: Record<string, unknown> = {};
      if (updates.productCode !== undefined) updateValues.productCode = updates.productCode;
      if (updates.productName !== undefined) updateValues.productName = updates.productName;
      if (updates.bomType !== undefined) updateValues.bomType = updates.bomType;
      if (updates.currentVersion !== undefined) updateValues.currentVersion = updates.currentVersion;
      if (updates.buCode !== undefined) updateValues.buCode = updates.buCode;
      if (updates.productCategory !== undefined) updateValues.productCategory = updates.productCategory;
      if (updates.standardQty !== undefined) updateValues.standardQty = String(updates.standardQty);
      if (updates.standardUnit !== undefined) updateValues.standardUnit = updates.standardUnit;
      if (updates.description !== undefined) updateValues.description = updates.description;
      if (updates.notes !== undefined) updateValues.notes = updates.notes;

      await db.update(bomMasters).set(updateValues).where(eq(bomMasters.id, id));

      const rows = await db.select().from(bomMasters).where(eq(bomMasters.id, id));
      if (!rows[0]) throw new Error('BOM not found');
      return rows[0];
    }),

  /**
   * 更新BOM状态（审批流: draft→pending_review→approved→active）
   */
  updateBomStatus: publicProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['draft', 'pending_review', 'approved', 'active', 'superseded', 'obsolete']),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const existingRows = await db.select().from(bomMasters).where(eq(bomMasters.id, input.id));
      if (!existingRows[0]) throw new Error('BOM not found');

      const updateValues: Record<string, unknown> = {
        status: input.status,
      };
      if (input.status === 'approved') {
        updateValues.approvedBy = null;
        updateValues.approvedAt = new Date().toISOString();
      }

      await db.update(bomMasters).set(updateValues).where(eq(bomMasters.id, input.id));

      const rows = await db.select().from(bomMasters).where(eq(bomMasters.id, input.id));
      return rows[0];
    }),

  /**
   * 删除BOM (仅draft状态)
   */
  deleteBomMaster: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const existingRows = await db.select().from(bomMasters).where(eq(bomMasters.id, input.id));
      if (!existingRows[0]) throw new Error('BOM not found');
      if (existingRows[0].status !== 'draft') throw new Error('只能删除草稿状态的BOM');

      // 同时删除子记录
      await db.delete(bomItems).where(eq(bomItems.bomMasterId, input.id));
      await db.delete(bomVersions).where(eq(bomVersions.bomMasterId, input.id));
      await db.delete(bomCostRollups).where(eq(bomCostRollups.bomMasterId, input.id));
      await db.delete(bomMasters).where(eq(bomMasters.id, input.id));

      return { success: true, message: 'BOM已删除' };
    }),

  // ---- BOM Item (明细行) CRUD ----

  /**
   * 添加BOM明细行
   */
  addBomItem: publicProcedure
    .input(BomItemCreateSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const extendedCost = input.quantity * input.unitCost * (1 + (input.scrapRate || 0) / 100);
      const roundedExtendedCost = Math.round(extendedCost * 100) / 100;

      const rows = await db.insert(bomItems).values({
        bomMasterId: input.bomMasterId,
        parentItemId: input.parentItemId ?? null,
        level: input.level,
        sequence: input.sequence,
        materialCode: input.materialCode,
        materialName: input.materialName,
        materialSpec: input.materialSpec ?? null,
        quantity: String(input.quantity),
        unit: input.unit,
        scrapRate: String(input.scrapRate),
        isCritical: input.isCritical,
        sourceType: input.sourceType,
        processCode: input.processCode ?? null,
        leadTimeDays: input.leadTimeDays,
        substituteCode: input.substituteCode ?? null,
        substituteRatio: input.substituteRatio != null ? String(input.substituteRatio) : null,
        unitCost: String(input.unitCost),
        extendedCost: String(roundedExtendedCost),
        preferredSupplierId: input.preferredSupplierId ?? null,
        erpItemId: null,
        remarks: input.remarks ?? null,
        effectiveFrom: input.effectiveFrom ?? null,
        effectiveTo: input.effectiveTo ?? null,
      }).returning();

      // 更新BOM主表的maxLevel
      const masterRows = await db.select().from(bomMasters).where(eq(bomMasters.id, input.bomMasterId));
      if (masterRows[0] && input.level > (masterRows[0].maxLevel || 0)) {
        await db.update(bomMasters).set({ maxLevel: input.level }).where(eq(bomMasters.id, input.bomMasterId));
      }

      return rows[0] ?? null;
    }),

  /**
   * 更新BOM明细行
   */
  updateBomItem: publicProcedure
    .input(BomItemUpdateSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;

      const existingRows = await db.select().from(bomItems).where(eq(bomItems.id, id));
      if (!existingRows[0]) throw new Error('BOM Item not found');

      const updateValues: Record<string, unknown> = {};
      if (updates.bomMasterId !== undefined) updateValues.bomMasterId = updates.bomMasterId;
      if (updates.parentItemId !== undefined) updateValues.parentItemId = updates.parentItemId;
      if (updates.level !== undefined) updateValues.level = updates.level;
      if (updates.sequence !== undefined) updateValues.sequence = updates.sequence;
      if (updates.materialCode !== undefined) updateValues.materialCode = updates.materialCode;
      if (updates.materialName !== undefined) updateValues.materialName = updates.materialName;
      if (updates.materialSpec !== undefined) updateValues.materialSpec = updates.materialSpec;
      if (updates.quantity !== undefined) updateValues.quantity = String(updates.quantity);
      if (updates.unit !== undefined) updateValues.unit = updates.unit;
      if (updates.scrapRate !== undefined) updateValues.scrapRate = String(updates.scrapRate);
      if (updates.isCritical !== undefined) updateValues.isCritical = updates.isCritical;
      if (updates.sourceType !== undefined) updateValues.sourceType = updates.sourceType;
      if (updates.processCode !== undefined) updateValues.processCode = updates.processCode;
      if (updates.leadTimeDays !== undefined) updateValues.leadTimeDays = updates.leadTimeDays;
      if (updates.substituteCode !== undefined) updateValues.substituteCode = updates.substituteCode;
      if (updates.substituteRatio !== undefined) updateValues.substituteRatio = String(updates.substituteRatio);
      if (updates.unitCost !== undefined) updateValues.unitCost = String(updates.unitCost);
      if (updates.preferredSupplierId !== undefined) updateValues.preferredSupplierId = updates.preferredSupplierId;
      if (updates.remarks !== undefined) updateValues.remarks = updates.remarks;
      if (updates.effectiveFrom !== undefined) updateValues.effectiveFrom = updates.effectiveFrom;
      if (updates.effectiveTo !== undefined) updateValues.effectiveTo = updates.effectiveTo;

      await db.update(bomItems).set(updateValues).where(eq(bomItems.id, id));

      // 重算extendedCost
      const updatedRows = await db.select().from(bomItems).where(eq(bomItems.id, id));
      const item = updatedRows[0];
      const qty = parseFloat(String(item.quantity)) || 0;
      const cost = parseFloat(String(item.unitCost)) || 0;
      const scrap = parseFloat(String(item.scrapRate)) || 0;
      const extendedCost = Math.round(qty * cost * (1 + scrap / 100) * 100) / 100;

      await db.update(bomItems).set({ extendedCost: String(extendedCost) }).where(eq(bomItems.id, id));

      const finalRows = await db.select().from(bomItems).where(eq(bomItems.id, id));
      return finalRows[0];
    }),

  /**
   * 删除BOM明细行
   */
  deleteBomItem: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const existingRows = await db.select().from(bomItems).where(eq(bomItems.id, input.id));
      if (!existingRows[0]) throw new Error('BOM Item not found');

      await db.delete(bomItems).where(eq(bomItems.id, input.id));
      return { success: true };
    }),

  /**
   * 获取BOM树 (多层级展开)
   */
  getBomTree: publicProcedure
    .input(z.object({ bomMasterId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const allItems = await db
        .select()
        .from(bomItems)
        .where(eq(bomItems.bomMasterId, input.bomMasterId));

      // 构建树结构
      type BomItemRow = typeof allItems[number];
      interface BomTreeNode extends BomItemRow {
        children: BomTreeNode[];
      }

      function buildTree(parentId: number | null): BomTreeNode[] {
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
  batchAddBomItems: publicProcedure
    .input(z.object({
      bomMasterId: z.number(),
      items: z.array(BomItemCreateSchema.omit({ bomMasterId: true })),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const createdItems: Array<typeof bomItems.$inferSelect> = [];
      let maxLevel = 0;

      for (const itemInput of input.items) {
        const extendedCost = itemInput.quantity * (itemInput.unitCost || 0) * (1 + (itemInput.scrapRate || 0) / 100);
        const roundedExtendedCost = Math.round(extendedCost * 100) / 100;

        const rows = await db.insert(bomItems).values({
          bomMasterId: input.bomMasterId,
          parentItemId: itemInput.parentItemId ?? null,
          level: itemInput.level,
          sequence: itemInput.sequence,
          materialCode: itemInput.materialCode,
          materialName: itemInput.materialName,
          materialSpec: itemInput.materialSpec ?? null,
          quantity: String(itemInput.quantity),
          unit: itemInput.unit,
          scrapRate: String(itemInput.scrapRate),
          isCritical: itemInput.isCritical,
          sourceType: itemInput.sourceType,
          processCode: itemInput.processCode ?? null,
          leadTimeDays: itemInput.leadTimeDays,
          substituteCode: itemInput.substituteCode ?? null,
          substituteRatio: itemInput.substituteRatio != null ? String(itemInput.substituteRatio) : null,
          unitCost: String(itemInput.unitCost),
          extendedCost: String(roundedExtendedCost),
          preferredSupplierId: itemInput.preferredSupplierId ?? null,
          erpItemId: null,
          remarks: itemInput.remarks ?? null,
          effectiveFrom: itemInput.effectiveFrom ?? null,
          effectiveTo: itemInput.effectiveTo ?? null,
        }).returning();

        if (rows[0]) createdItems.push(rows[0]);

        if ((itemInput.level || 1) > maxLevel) maxLevel = itemInput.level || 1;
      }

      // 更新maxLevel
      const masterRows = await db.select().from(bomMasters).where(eq(bomMasters.id, input.bomMasterId));
      if (masterRows[0] && maxLevel > (masterRows[0].maxLevel || 0)) {
        await db.update(bomMasters).set({ maxLevel }).where(eq(bomMasters.id, input.bomMasterId));
      }

      return { created: createdItems.length, items: createdItems };
    }),

  // ---- BOM版本管理 ----

  /**
   * 创建新版本 / ECN变更
   */
  createVersion: publicProcedure
    .input(BomVersionCreateSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // 对当前BOM做快照
      const currentItems = await db.select().from(bomItems).where(eq(bomItems.bomMasterId, input.bomMasterId));
      const masterRows = await db.select().from(bomMasters).where(eq(bomMasters.id, input.bomMasterId));
      const master = masterRows[0] ?? null;

      const rows = await db.insert(bomVersions).values({
        bomMasterId: input.bomMasterId,
        version: input.version,
        changeType: input.changeType,
        ecnNumber: input.ecnNumber ?? null,
        changeReason: input.changeReason ?? null,
        changeDescription: input.changeDescription ?? null,
        changeDetails: null,
        status: 'draft',
        effectiveDate: input.effectiveDate ?? null,
        expiryDate: null,
        requestedBy: null,
        reviewedBy: null,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        bomSnapshot: { master, items: currentItems },
      }).returning();

      return rows[0] ?? null;
    }),

  /**
   * 获取版本列表
   */
  getVersions: publicProcedure
    .input(z.object({ bomMasterId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(bomVersions)
        .where(eq(bomVersions.bomMasterId, input.bomMasterId))
        .orderBy(desc(bomVersions.id));
    }),

  /**
   * 审批版本
   */
  approveVersion: publicProcedure
    .input(z.object({
      id: z.number(),
      action: z.enum(['approve', 'reject']),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const versionRows = await db.select().from(bomVersions).where(eq(bomVersions.id, input.id));
      if (!versionRows[0]) throw new Error('Version not found');

      const version = versionRows[0];

      if (input.action === 'approve') {
        await db.update(bomVersions).set({
          status: 'approved',
          approvedBy: null,
          approvedAt: new Date().toISOString(),
        }).where(eq(bomVersions.id, input.id));

        // 将BOM主表版本号更新为此版本
        await db.update(bomMasters).set({
          currentVersion: version.version,
        }).where(eq(bomMasters.id, version.bomMasterId));
      } else {
        await db.update(bomVersions).set({
          status: 'rejected',
          rejectionReason: input.reason || '',
        }).where(eq(bomVersions.id, input.id));
      }

      const updatedRows = await db.select().from(bomVersions).where(eq(bomVersions.id, input.id));
      return updatedRows[0];
    }),

  // ---- 成本卷积 ----

  /**
   * 触发成本卷积计算
   */
  calculateCostRollup: publicProcedure
    .input(z.object({
      bomMasterId: z.number(),
      costType: z.enum(['standard', 'actual', 'estimated', 'budget']).default('standard'),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(bomItems).where(eq(bomItems.bomMasterId, input.bomMasterId));
      const masterRows = await db.select().from(bomMasters).where(eq(bomMasters.id, input.bomMasterId));
      const master = masterRows[0];
      if (!master) throw new Error('BOM not found');

      // 分类汇总
      let materialCost = 0;
      let purchaseCost = 0;
      let laborCost = 0;
      let outsourceCost = 0;

      for (const item of items) {
        const qty = parseFloat(String(item.quantity)) || 0;
        const unitCostVal = parseFloat(String(item.unitCost)) || 0;
        const scrapVal = parseFloat(String(item.scrapRate)) || 0;
        const cost = qty * unitCostVal * (1 + scrapVal / 100);
        switch (item.sourceType) {
          case 'purchase': purchaseCost += cost; break;
          case 'manufacture': laborCost += cost; break;
          case 'outsource': outsourceCost += cost; break;
          default: materialCost += cost;
        }
      }

      const overheadCost = laborCost * 0.15; // 15%间接费用
      const totalCost = materialCost + purchaseCost + laborCost + outsourceCost + overheadCost;

      const costBreakdown = items.map(i => ({
        materialCode: i.materialCode,
        materialName: i.materialName,
        qty: parseFloat(String(i.quantity)) || 0,
        unitCost: parseFloat(String(i.unitCost)) || 0,
        scrapRate: parseFloat(String(i.scrapRate)) || 0,
        extendedCost: parseFloat(String(i.extendedCost)) || 0,
        sourceType: i.sourceType,
      }));

      const now = new Date().toISOString();
      const costRows = await db.insert(bomCostRollups).values({
        bomMasterId: input.bomMasterId,
        version: master.currentVersion,
        costType: input.costType,
        calculatedAt: now,
        materialCost: String(Math.round(materialCost * 100) / 100),
        purchaseCost: String(Math.round(purchaseCost * 100) / 100),
        laborCost: String(Math.round(laborCost * 100) / 100),
        overheadCost: String(Math.round(overheadCost * 100) / 100),
        outsourceCost: String(Math.round(outsourceCost * 100) / 100),
        totalCost: String(Math.round(totalCost * 100) / 100),
        costBreakdown,
        currency: 'CNY',
      }).returning();

      // 更新主表成本
      const roundedMaterialCost = Math.round((materialCost + purchaseCost) * 100) / 100;
      const roundedLaborCost = Math.round(laborCost * 100) / 100;
      const roundedOverheadTotal = Math.round((overheadCost + outsourceCost) * 100) / 100;

      await db.update(bomMasters).set({
        totalMaterialCost: String(roundedMaterialCost),
        totalLaborCost: String(roundedLaborCost),
        totalOverheadCost: String(roundedOverheadTotal),
      }).where(eq(bomMasters.id, input.bomMasterId));

      return costRows[0] ?? null;
    }),

  /**
   * 获取成本卷积历史
   */
  getCostRollups: publicProcedure
    .input(z.object({
      bomMasterId: z.number(),
      costType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const conditions = [eq(bomCostRollups.bomMasterId, input.bomMasterId)];
      if (input.costType) {
        conditions.push(eq(bomCostRollups.costType, input.costType as "standard" | "actual" | "estimated" | "budget"));
      }

      return db
        .select()
        .from(bomCostRollups)
        .where(and(...conditions))
        .orderBy(desc(bomCostRollups.id));
    }),

  // ---- 统计与搜索 ----

  /**
   * BOM统计概览
   */
  getStats: publicProcedure.query(async () => {
    const db = await requireDb();

    const totalResult = await db.select({ value: count() }).from(bomMasters);
    const total = totalResult[0].value;

    const activeResult = await db.select({ value: count() }).from(bomMasters).where(eq(bomMasters.status, 'active'));
    const active = activeResult[0].value;

    const draftResult = await db.select({ value: count() }).from(bomMasters).where(eq(bomMasters.status, 'draft'));
    const draft = draftResult[0].value;

    const pendingResult = await db.select({ value: count() }).from(bomMasters).where(eq(bomMasters.status, 'pending_review'));
    const pendingReview = pendingResult[0].value;

    const totalItemsResult = await db.select({ value: count() }).from(bomItems);
    const totalItems = totalItemsResult[0].value;

    const criticalResult = await db.select({ value: count() }).from(bomItems).where(eq(bomItems.isCritical, true));
    const criticalItems = criticalResult[0].value;

    return { total, active, draft, pendingReview, totalItems, criticalItems };
  }),

  /**
   * 查询物料被哪些BOM使用（反向追溯: Where-Used）
   */
  whereUsed: publicProcedure
    .input(z.object({ materialCode: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const matchingItems = await db
        .select()
        .from(bomItems)
        .where(eq(bomItems.materialCode, input.materialCode));

      // Collect unique bomMasterIds
      const bomMasterIds = Array.from(new Set(matchingItems.map(i => i.bomMasterId)));

      // Fetch corresponding masters
      const masters: Array<typeof bomMasters.$inferSelect> = [];
      for (const masterId of bomMasterIds) {
        const rows = await db.select().from(bomMasters).where(eq(bomMasters.id, masterId));
        if (rows[0]) masters.push(rows[0]);
      }

      const masterMap = new Map(masters.map(m => [m.id, m]));

      const usages = matchingItems.map(i => {
        const master = masterMap.get(i.bomMasterId);
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
  markErpSynced: publicProcedure
    .input(z.object({
      id: z.number(),
      erpBomId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const existingRows = await db.select().from(bomMasters).where(eq(bomMasters.id, input.id));
      if (!existingRows[0]) throw new Error('BOM not found');

      await db.update(bomMasters).set({
        erpBomId: input.erpBomId,
        erpSyncStatus: 'synced',
        erpLastSyncAt: new Date().toISOString(),
      }).where(eq(bomMasters.id, input.id));

      const rows = await db.select().from(bomMasters).where(eq(bomMasters.id, input.id));
      return rows[0];
    }),
});
