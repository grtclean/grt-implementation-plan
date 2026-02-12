/**
 * v1.7.1 BOM数据批量导入路由
 * BOM Import Router
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  generateBomTemplate,
  parseBomCsv,
  detectDuplicates,
  executeBomImport,
  getImportHistory,
  rollbackImport,
  syncFromJiandaoyun,
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

  /** 预览CSV数据（验证但不导入） */
  previewCsv: protectedProcedure
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
  importCsv: protectedProcedure
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
  rollback: protectedProcedure
    .input(z.object({
      importId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return rollbackImport(input.importId);
    }),

  /** 从简道云同步BOM数据 */
  syncJiandaoyun: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      verificationId: z.number(),
      formId: z.string(),
      fieldMapping: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      return syncFromJiandaoyun({
        ...input,
        importedBy: ctx.user?.openId,
      });
    }),
});
