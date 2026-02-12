/**
 * v1.7.2 BOM Excel导入路由
 * BOM Excel Import Router
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  generateBomExcelTemplate,
  parseExcelBom,
  executeExcelBomImport,
  detectFileType,
} from "./bomExcelImport.service";

export const bomExcelImportRouter = router({
  /** 获取Excel模板（返回base64编码的xlsx文件） */
  getTemplate: protectedProcedure
    .query(async () => {
      const buffer = generateBomExcelTemplate();
      return {
        fileName: 'BOM导入模板.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        data: Buffer.from(buffer).toString('base64'),
        size: buffer.length,
      };
    }),

  /** 预览Excel文件内容（解析但不导入） */
  preview: protectedProcedure
    .input(z.object({
      fileData: z.string(), // base64编码的文件内容
      fileName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const fileType = detectFileType(input.fileName);
      if (fileType !== 'xlsx') {
        return {
          success: false,
          message: `不支持的文件格式: ${input.fileName}，请使用.xlsx格式`,
          rows: [],
          errors: [],
        };
      }

      const buffer = Buffer.from(input.fileData, 'base64');
      const { rows, errors, sheetName } = parseExcelBom(buffer);

      return {
        success: true,
        sheetName,
        totalRows: rows.length,
        errorCount: errors.length,
        rows: rows.slice(0, 50), // 预览最多50行
        errors,
        message: rows.length > 0
          ? `成功解析 ${rows.length} 条数据（工作表: ${sheetName}）`
          : '没有解析到有效数据',
      };
    }),

  /** 执行Excel导入 */
  import: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      verificationId: z.number(),
      fileData: z.string(), // base64编码的文件内容
      fileName: z.string(),
      skipDuplicates: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const fileType = detectFileType(input.fileName);
      if (fileType !== 'xlsx') {
        return {
          success: false,
          imported: 0,
          message: `不支持的文件格式: ${input.fileName}，请使用.xlsx格式`,
        };
      }

      const buffer = Buffer.from(input.fileData, 'base64');
      return executeExcelBomImport({
        projectId: input.projectId,
        verificationId: input.verificationId,
        fileBuffer: buffer,
        fileName: input.fileName,
        importedBy: ctx.user?.openId,
        importedByName: ctx.user?.name,
        skipDuplicates: input.skipDuplicates,
      });
    }),

  /** 检测文件类型 */
  detectType: protectedProcedure
    .input(z.object({ fileName: z.string() }))
    .query(async ({ input }) => {
      const fileType = detectFileType(input.fileName);
      return {
        fileName: input.fileName,
        fileType,
        supported: fileType !== 'unknown',
        suggestedAction: fileType === 'csv' ? '使用CSV导入' : fileType === 'xlsx' ? '使用Excel导入' : '不支持的格式',
      };
    }),
});
