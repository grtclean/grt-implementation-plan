/**
 * GRT 5.0 物料管理路由
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {router, adminProcedure, protectedProcedure, requirePermission} from "../_core/trpc";
import { generateMaterialCode, parseMaterialCode, validateMaterialCode } from "./material-coding.config";
import { requireDb } from "../db";
import { eq, desc, and, like, count, sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("material");
import {
  materials,
  materialCategories,
  inventory,
  materialChangeHistory,
  materialImportRecords,
} from "../../drizzle/material-schema";

// 验证Schema
const MaterialCreateSchema = z.object({
  materialName: z.string().min(1),
  categoryCode: z.string().min(1),
  subcategoryCode: z.string().optional(),
  specificationCode: z.string().optional(),
  materialType: z.enum(['equipment', 'component', 'part', 'consumable', 'chemical', 'other']).default('component'),
  manufacturer: z.string().optional(),
  description: z.string().optional(),
  standardCost: z.number().optional(),
  minStockLevel: z.number().optional(),
  maxStockLevel: z.number().optional(),
});

const MaterialUpdateSchema = MaterialCreateSchema.partial().extend({
  id: z.number(),
});

const MaterialCategorySchema = z.object({
  categoryCode: z.string().min(1),
  categoryName: z.string().min(1),
  parentCategoryCode: z.string().optional(),
  level: z.number(),
  description: z.string().optional(),
});

export const materialRouter = router({
  /**
   * 生成物料编码
   */
  generateCode: protectedProcedure
    .input(z.object({
      categoryCode: z.string(),
      subcategoryCode: z.string().optional(),
      specificationCode: z.string().optional(),
    }))
    .query(({ input }) => {
      const code = generateMaterialCode(
        input.categoryCode as Parameters<typeof generateMaterialCode>[0],
        input.subcategoryCode,
        input.specificationCode
      );
      return code;
    }),

  /**
   * 验证物料编码
   */
  validateCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(({ input }) => {
      return validateMaterialCode(input.code);
    }),

  /**
   * 解析物料编码
   */
  parseCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(({ input }) => {
      return parseMaterialCode(input.code);
    }),

  /**
   * 创建物料
   */
  createMaterial: adminProcedure
    .input(MaterialCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // 生成物料编码
      const materialCode = generateMaterialCode(
        input.categoryCode as Parameters<typeof generateMaterialCode>[0],
        input.subcategoryCode,
        input.specificationCode
      );

      const result = await db.insert(materials).values({
        materialCode: materialCode.fullCode,
        materialName: input.materialName,
        categoryCode: input.categoryCode,
        subcategoryCode: input.subcategoryCode ?? null,
        specificationCode: input.specificationCode ?? null,
        materialType: input.materialType,
        manufacturer: input.manufacturer ?? null,
        description: input.description ?? null,
        standardCost: input.standardCost != null ? String(input.standardCost) : null,
        minStockLevel: input.minStockLevel ?? 0,
        maxStockLevel: input.maxStockLevel ?? 0,
        status: 'active',
        isApproved: 'no',
        createdBy: ctx.user?.id ?? 0,
      });

      const insertId = result[0].insertId;
      const rows = await db.select().from(materials).where(eq(materials.id, insertId)).limit(1000);
      return rows[0];
    }),

  /**
   * 获取所有物料
   */
  getAllMaterials: protectedProcedure
    .input(z.object({
      categoryCode: z.string().optional(),
      materialType: z.string().optional(),
      status: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();

        const conditions = [];
        if (input.categoryCode) {
          conditions.push(eq(materials.categoryCode, input.categoryCode));
        }
        if (input.materialType) {
          conditions.push(eq(materials.materialType, input.materialType as "equipment" | "component" | "part" | "consumable" | "chemical" | "other"));
        }
        if (input.status) {
          conditions.push(eq(materials.status, input.status as "active" | "inactive" | "obsolete" | "discontinued"));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const totalResult = await db
          .select({ value: count() })
          .from(materials)
          .where(whereClause);
        const total = totalResult[0].value;

        const offset = (input.page - 1) * input.pageSize;
        const items = await db
          .select()
          .from(materials)
          .where(whereClause)
          .orderBy(desc(materials.id))
          .limit(input.pageSize)
          .offset(offset);

        return {
          items,
          total,
          page: input.page,
          pageSize: input.pageSize,
        };
      } catch (e) {
        log.error({ err: e }, "getAllMaterials DB error");
        return { items: [], total: 0, page: input.page, pageSize: input.pageSize };
      }
    }),

  /**
   * 获取单个物料
   */
  getMaterial: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(materials).where(eq(materials.id, input.id)).limit(1000);
      return rows[0] ?? null;
    }),

  /**
   * 更新物料
   */
  updateMaterial: adminProcedure
    .input(MaterialUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const { id, ...updates } = input;

      const updateValues: Record<string, unknown> = {
        updatedBy: ctx.user?.id,
      };
      if (updates.materialName !== undefined) updateValues.materialName = updates.materialName;
      if (updates.categoryCode !== undefined) updateValues.categoryCode = updates.categoryCode;
      if (updates.subcategoryCode !== undefined) updateValues.subcategoryCode = updates.subcategoryCode;
      if (updates.specificationCode !== undefined) updateValues.specificationCode = updates.specificationCode;
      if (updates.materialType !== undefined) updateValues.materialType = updates.materialType;
      if (updates.manufacturer !== undefined) updateValues.manufacturer = updates.manufacturer;
      if (updates.description !== undefined) updateValues.description = updates.description;
      if (updates.minStockLevel !== undefined) updateValues.minStockLevel = updates.minStockLevel;
      if (updates.maxStockLevel !== undefined) updateValues.maxStockLevel = updates.maxStockLevel;

      await db.update(materials).set(updateValues).where(eq(materials.id, id));

      const rows = await db.select().from(materials).where(eq(materials.id, id)).limit(1000);
      return rows[0];
    }),

  /**
   * 批准物料
   */
  approveMaterial: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      await db.update(materials).set({
        isApproved: 'yes',
        approvedBy: ctx.user?.id,
        approvedAt: new Date().toISOString(),
      }).where(eq(materials.id, input.id));

      // Record change history
      await db.insert(materialChangeHistory).values({
        materialId: input.id,
        changeType: 'approve',
        fieldName: 'isApproved',
        oldValue: 'no',
        newValue: 'yes',
        reason: 'Admin approval',
        changedBy: ctx.user?.id ?? 0,
      });

      const rows = await db.select().from(materials).where(eq(materials.id, input.id)).limit(1000);
      const row = rows[0];
      return {
        id: row.id,
        isApproved: row.isApproved === 'yes',
        approvedBy: row.approvedBy,
        approvedAt: row.approvedAt,
      };
    }),

  /**
   * 删除物料 (soft delete → status='deleted')
   */
  deleteMaterial: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [existing] = await db.select().from(materials).where(eq(materials.id, input.id)).limit(1000);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Material not found" });
      }

      await db.update(materials).set({
        status: 'deleted' as any,
        updatedBy: ctx.user?.id,
      }).where(eq(materials.id, input.id));

      // Record change history
      await db.insert(materialChangeHistory).values({
        materialId: input.id,
        changeType: 'delete',
        fieldName: 'status',
        oldValue: existing.status,
        newValue: 'deleted',
        reason: 'Admin deletion',
        changedBy: ctx.user?.id ?? 0,
      });

      return { success: true, id: input.id };
    }),

  /**
   * 获取物料分类
   */
  getCategories: protectedProcedure.query(async () => {
    try {
      const db = await requireDb();
      const categories = await db
        .select()
        .from(materialCategories)
        .orderBy(materialCategories.level, materialCategories.sortOrder)
        .limit(1000);
      return { categories };
    } catch (e) {
      log.error({ err: e }, "getCategories DB error");
      return { categories: [] };
    }
  }),

  /**
   * 创建物料分类
   */
  createCategory: adminProcedure
    .input(MaterialCategorySchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const result = await db.insert(materialCategories).values({
        categoryCode: input.categoryCode,
        categoryName: input.categoryName,
        parentCategoryCode: input.parentCategoryCode ?? null,
        level: input.level,
        description: input.description ?? null,
      });

      const insertId = result[0].insertId;
      const rows = await db.select().from(materialCategories).where(eq(materialCategories.id, insertId)).limit(1000);
      return rows[0];
    }),

  /**
   * 获取库存统计
   */
  getInventoryStats: protectedProcedure.query(async () => {
    try {
      const db = await requireDb();

      const totalResult = await db.select({ value: count() }).from(materials);
      const totalMaterials = totalResult[0].value;

      const activeResult = await db.select({ value: count() }).from(materials).where(eq(materials.status, 'active'));
      const activeMaterials = activeResult[0].value;

      // Low stock: materials where quantityOnHand is below the material's minStockLevel
      const lowStockResult = await db.execute(
        sql`SELECT COUNT(DISTINCT m.id) as cnt FROM materials m
            INNER JOIN inventory i ON i.material_id = m.id
            WHERE i.quantity_on_hand < m.min_stock_level AND m.min_stock_level > 0`
      );
      const lowStockRows = lowStockResult[0] as Array<{ cnt: number }>;
      const lowStockMaterials = lowStockRows[0]?.cnt ?? 0;

      // Out of stock: materials with no inventory or quantity = 0
      const outOfStockResult = await db.execute(
        sql`SELECT COUNT(DISTINCT m.id) as cnt FROM materials m
            LEFT JOIN inventory i ON i.material_id = m.id
            WHERE i.id IS NULL OR i.quantity_on_hand = 0`
      );
      const outOfStockRows = outOfStockResult[0] as Array<{ cnt: number }>;
      const outOfStockMaterials = outOfStockRows[0]?.cnt ?? 0;

      // Total inventory value
      const valueResult = await db.execute(
        sql`SELECT COALESCE(SUM(i.quantity_on_hand * COALESCE(m.standard_cost, 0)), 0) as total_value
            FROM inventory i
            INNER JOIN materials m ON m.id = i.material_id`
      );
      const valueRows = valueResult[0] as Array<{ total_value: number }>;
      const totalInventoryValue = valueRows[0]?.total_value ?? 0;

      return {
        totalMaterials,
        activeMaterials,
        lowStockMaterials,
        outOfStockMaterials,
        totalInventoryValue: Number(totalInventoryValue),
      };
    } catch (e) {
      log.error({ err: e }, "getInventoryStats DB error");
      return { totalMaterials: 0, activeMaterials: 0, lowStockMaterials: 0, outOfStockMaterials: 0, totalInventoryValue: 0 };
    }
  }),

  /**
   * 获取库存明细
   */
  getInventoryDetails: protectedProcedure
    .input(z.object({
      materialId: z.number().optional(),
      warehouseId: z.number().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const conditions = [];
      if (input.materialId) {
        conditions.push(eq(inventory.materialId, input.materialId));
      }
      if (input.warehouseId) {
        conditions.push(eq(inventory.warehouseId, input.warehouseId));
      }
      if (input.status) {
        conditions.push(eq(inventory.status, input.status as "good" | "damaged" | "expired" | "quarantine"));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select()
        .from(inventory)
        .where(whereClause)
        .limit(1000);

      return {
        items,
        total: items.length,
      };
    }),

  /**
   * 导入物料（从天思ERP）
   */
  importMaterials: adminProcedure
    .input(z.object({
      sourceSystem: z.string(),
      importData: z.array(z.object({
        materialCode: z.string(),
        materialName: z.string(),
        categoryCode: z.string(),
        quantity: z.number().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const batchId = `import-${Date.now()}`;
      let successCount = 0;
      let failedCount = 0;

      for (const item of input.importData) {
        try {
          // Check if material already exists
          const existing = await db
            .select()
            .from(materials)
            .where(eq(materials.materialCode, item.materialCode))
            .limit(1000);

          if (existing.length === 0) {
            await db.insert(materials).values({
              materialCode: item.materialCode,
              materialName: item.materialName,
              categoryCode: item.categoryCode,
              materialType: 'other',
              status: 'active',
              isApproved: 'no',
              createdBy: ctx.user?.id ?? 0,
            });
          }
          successCount++;
        } catch {
          failedCount++;
        }
      }

      // Record the import
      const importStatus = failedCount === 0 ? 'success' : (successCount > 0 ? 'partial_success' : 'failed');
      await db.insert(materialImportRecords).values({
        importBatchId: batchId,
        sourceSystem: input.sourceSystem,
        totalRecords: input.importData.length,
        successRecords: successCount,
        failedRecords: failedCount,
        importData: JSON.stringify(input.importData),
        status: importStatus as "success" | "partial_success" | "failed" | "pending" | "processing",
        importedBy: ctx.user?.id ?? 0,
      });

      return {
        batchId,
        totalRecords: input.importData.length,
        successRecords: successCount,
        failedRecords: failedCount,
        status: importStatus,
        message: `成功导入 ${successCount} 条物料记录`,
        importedAt: new Date(),
      };
    }),

  /**
   * 获取导入历史
   */
  getImportHistory: adminProcedure
    .input(z.object({
      sourceSystem: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const conditions = [];
      if (input.sourceSystem) {
        conditions.push(eq(materialImportRecords.sourceSystem, input.sourceSystem));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db
        .select({ value: count() })
        .from(materialImportRecords)
        .where(whereClause);
      const total = totalResult[0].value;

      const offset = (input.page - 1) * input.pageSize;
      const items = await db
        .select()
        .from(materialImportRecords)
        .where(whereClause)
        .orderBy(desc(materialImportRecords.id))
        .limit(input.pageSize)
        .offset(offset);

      return {
        items,
        total,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  /**
   * 获取物料变更历史
   */
  getMaterialChangeHistory: protectedProcedure
    .input(z.object({ materialId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(materialChangeHistory)
        .where(eq(materialChangeHistory.materialId, input.materialId))
        .orderBy(desc(materialChangeHistory.id))
        .limit(1000);

      return {
        items,
        total: items.length,
      };
    }),

  /**
   * 导出物料清单
   */
  exportMaterials: protectedProcedure
    .input(z.object({
      categoryCode: z.string().optional(),
      format: z.enum(['csv', 'excel', 'json']).default('excel'),
    }))
    .query(async ({ input }) => {
      return {
        downloadUrl: '/api/materials/export',
        fileName: `materials-${new Date().toISOString()}.xlsx`,
        format: input.format,
      };
    }),
});
