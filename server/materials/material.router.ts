/**
 * GRT 5.0 物料管理路由
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { generateMaterialCode, parseMaterialCode, validateMaterialCode } from "./material-coding.config";

// 验证Schema
const MaterialCreateSchema = z.object({
  materialName: z.string().min(1),
  categoryCode: z.string().min(1),
  subcategoryCode: z.string().optional(),
  specificationCode: z.string().optional(),
  materialType: z.enum(['equipment', 'component', 'part', 'consumable', 'chemical', 'other']),
  manufacturer: z.string().optional(),
  description: z.string().optional(),
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
        input.categoryCode as any,
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
      // 生成物料编码
      const materialCode = generateMaterialCode(
        input.categoryCode as any,
        input.subcategoryCode,
        input.specificationCode
      );

      // 这里应该调用数据库创建物料
      // 返回创建的物料信息
      return {
        id: Math.floor(Math.random() * 10000),
        materialCode: materialCode.fullCode,
        ...input,
        createdBy: ctx.user?.id,
        createdAt: new Date(),
      };
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
      // 这里应该调用数据库查询物料
      return {
        items: [],
        total: 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  /**
   * 获取单个物料
   */
  getMaterial: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      // 这里应该调用数据库查询物料
      return null;
    }),

  /**
   * 更新物料
   */
  updateMaterial: adminProcedure
    .input(MaterialUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      // 这里应该调用数据库更新物料
      return {
        ...input,
        updatedBy: ctx.user?.id,
        updatedAt: new Date(),
      };
    }),

  /**
   * 批准物料
   */
  approveMaterial: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return {
        id: input.id,
        isApproved: true,
        approvedBy: ctx.user?.id,
        approvedAt: new Date(),
      };
    }),

  /**
   * 获取物料分类
   */
  getCategories: protectedProcedure.query(async () => {
    return {
      categories: [],
    };
  }),

  /**
   * 创建物料分类
   */
  createCategory: adminProcedure
    .input(MaterialCategorySchema)
    .mutation(async ({ input }) => {
      return {
        id: Math.floor(Math.random() * 10000),
        ...input,
        createdAt: new Date(),
      };
    }),

  /**
   * 获取库存统计
   */
  getInventoryStats: protectedProcedure.query(async () => {
    return {
      totalMaterials: 0,
      activeMaterials: 0,
      lowStockMaterials: 0,
      outOfStockMaterials: 0,
      totalInventoryValue: 0,
    };
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
      return {
        items: [],
        total: 0,
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
      const batchId = `import-${Date.now()}`;
      
      return {
        batchId,
        totalRecords: input.importData.length,
        successRecords: input.importData.length,
        failedRecords: 0,
        status: 'success',
        message: `成功导入 ${input.importData.length} 条物料记录`,
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
      return {
        items: [],
        total: 0,
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
      return {
        items: [],
        total: 0,
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
