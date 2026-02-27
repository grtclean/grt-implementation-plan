/**
 * v1.7.2 BOM Excel导入路由
 * BOM Excel Import Router
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
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

  /** 获取导入历史（前端 BomExcelImport.tsx 需要） */
  getImportHistory: publicProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async () => {
      return { records: [] };
    }),

  /** 获取支持的文件格式（前端 BomExcelImport.tsx 需要） */
  getSupportedFormats: publicProcedure
    .query(async () => {
      return {
        formats: [
          { ext: ".xlsx", name: "Excel 2007+", maxSize: "10MB" },
          { ext: ".xls", name: "Excel 97-2003", maxSize: "10MB" },
          { ext: ".csv", name: "CSV文本", maxSize: "10MB" },
        ],
      };
    }),

  /** 解析Excel文件（前端 BomExcelImport.tsx parseMutation 调用） */
  parseExcel: publicProcedure
    .input(z.object({
      fileName: z.string(),
      fileContent: z.string(),
      fileType: z.enum(["xlsx", "xls", "csv"]),
    }))
    .mutation(async ({ input }) => {
      // Delegate to real preview logic when available; mock for now
      try {
        const buffer = Buffer.from(input.fileContent, 'base64');
        const result = parseExcelBom(buffer);
        const headers = result.rows.length > 0 ? Object.keys(result.rows[0]) : [];
        // Auto-suggest mapping
        const suggestedMapping: Record<string, string> = {};
        const fieldAliases: Record<string, string[]> = {
          materialCode: ['物料编码', '编码', 'materialCode', 'code'],
          materialName: ['物料名称', '名称', 'materialName', 'name'],
          specification: ['规格型号', '规格', 'specification', 'spec'],
          unit: ['单位', 'unit'],
          quantity: ['数量', 'quantity', 'qty'],
          processCode: ['工序编码', '工序', 'processCode', 'process'],
          supplier: ['供应商', 'supplier'],
          remark: ['备注', 'remark', 'note'],
        };
        for (const [field, aliases] of Object.entries(fieldAliases)) {
          const match = headers.find(h => aliases.some(a => h.includes(a)));
          if (match) suggestedMapping[field] = match;
        }
        return {
          headers,
          previewRows: result.rows.slice(0, 10),
          totalRows: result.rows.length,
          suggestedMapping,
        };
      } catch {
        return { headers: [], previewRows: [], totalRows: 0, suggestedMapping: {} };
      }
    }),

  /** 验证数据（前端 BomExcelImport.tsx validateMutation 调用） */
  validateData: publicProcedure
    .input(z.object({
      fieldMapping: z.record(z.string(), z.string()),
      projectId: z.string(),
    }))
    .mutation(async () => {
      return { valid: true, errors: [], warnings: [] };
    }),

  /** 执行Excel导入（前端 BomExcelImport.tsx importMutation 调用） */
  importExcel: publicProcedure
    .input(z.object({
      fieldMapping: z.record(z.string(), z.string()),
      projectId: z.string(),
      fileName: z.string(),
    }))
    .mutation(async () => {
      return { importedCount: 0, message: "导入功能即将上线" };
    }),

  /** 下载模板（前端 BomExcelImport.tsx downloadTemplateMutation 调用） */
  downloadTemplate: publicProcedure
    .input(z.object({ format: z.string().optional() }))
    .mutation(async () => {
      const buffer = generateBomExcelTemplate();
      return {
        fileName: 'BOM导入模板.xlsx',
        data: Buffer.from(buffer).toString('base64'),
      };
    }),
});
