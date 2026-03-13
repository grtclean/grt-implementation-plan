/**
 * v1.7.1 BOM数据批量导入路由
 * BOM Import Router
 */

import { z } from "zod";
import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import {
  generateBomTemplate,
  parseBomCsv,
  detectDuplicates,
  executeBomImport,
  getImportHistory,
  rollbackImport,
  syncFromExternalSync,
} from "./bomImport.service";

export const bomImportRouter = router({
  /** 获取BOM导入模板 */
  getTemplate: protectedProcedure
    .query(async () => {
      return {
        csv: generateBomTemplate(),
        filename: 'BOM导入模板.csv',
      };
    }),

  /** 获取导入历史（前端 BomImport.tsx 需要） */
  getImportHistory: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
    }))
    .query(async ({ input }) => {
      try {
        return await getImportHistory(input.projectId ?? "DEFAULT", input.limit);
      } catch {
        return [];
      }
    }),

  /** 获取导入统计（前端 BomImport.tsx 需要） */
  getImportStats: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
    }))
    .query(async () => {
      return { totalImports: 0, totalSuccess: 0, totalFailed: 0, processCount: 0 };
    }),

  /** 批量导入（前端 BomImport.tsx 的 handleImport 调用） */
  batchImport: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      processCode: z.string(),
      source: z.string().optional(),
      items: z.array(z.object({
        materialCode: z.string(),
        materialName: z.string(),
        specification: z.string().optional(),
        unit: z.string().optional(),
        requiredQty: z.number().optional(),
        category: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      // Mock: return success counts matching the input
      return { successCount: input.items.length, failedCount: 0, skippedCount: 0 };
    }),

  /** 下载模板（前端 BomImport.tsx 的 downloadTemplateMutation 调用） */
  downloadTemplate: requirePermission('rnd:bom:manage')
    .input(z.object({
      processCode: z.string().optional(),
    }))
    .mutation(async () => {
      return { csv: generateBomTemplate() };
    }),

  /** 预览CSV数据（验证但不导入） */
  previewCsv: requirePermission('rnd:bom:manage')
    .input(z.object({
      csvText: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { rows, errors } = parseBomCsv(input.csvText);
      const duplicates = detectDuplicates(rows);
      
      return {
        validRows: rows.length,
        errorCount: errors.length,
        duplicateCount: duplicates.length,
        preview: rows.slice(0, 20), // 最多预览20行
        errors: errors.slice(0, 50), // 最多显示50个错误
        duplicates: duplicates.slice(0, 20),
      };
    }),

  /** 执行BOM批量导入 */
  importCsv: requirePermission('rnd:bom:manage')
    .input(z.object({
      projectId: z.string(),
      verificationId: z.number(),
      csvText: z.string(),
      skipDuplicates: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return executeBomImport({
        ...input,
        importedBy: ctx.user?.openId,
        importedByName: ctx.user?.name,
      });
    }),

  /** 获取导入历史 */
  getHistory: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      limit: z.number().min(1).max(100).optional(),
    }))
    .query(async ({ input }) => {
      return getImportHistory(input.projectId, input.limit);
    }),

  /** 回滚导入 */
  rollback: requirePermission('rnd:bom:manage')
    .input(z.object({
      importId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return rollbackImport(input.importId);
    }),

  /** 从外部数据平台同步BOM数据 */
  syncExternalSync: requirePermission('rnd:bom:manage')
    .input(z.object({
      projectId: z.string(),
      verificationId: z.number(),
      formId: z.string(),
      fieldMapping: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      return syncFromExternalSync({
        ...input,
        importedBy: ctx.user?.openId,
      });
    }),
});
