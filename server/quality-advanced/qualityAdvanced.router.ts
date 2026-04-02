/**
 * 质量高级智能路由 (Quality Advanced Router)
 * Phase 21 P1: US-007 合格证 · US-008 SPC · US-009 NCR
 */
import { z } from "zod";
import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import { generateCertificate, analyzeSPC, analyzeNCR } from "./qualityAdvanced.service";

export const qualityAdvancedRouter = router({
  generateCertificate: requirePermission('mfg:qc:manage')
    .input(z.object({
      productName: z.string().min(1), batchNumber: z.string().min(1), customerName: z.string().min(1),
      inspectionData: z.string().min(1), cleanlinessResult: z.string().min(1), standard: z.string().min(1),
      inspectorName: z.string().optional(),
    }))
    .mutation(async ({ input }) => await generateCertificate(input)),

  analyzeSPC: requirePermission('mfg:qc:manage')
    .input(z.object({
      processName: z.string().min(1), measurementParameter: z.string().min(1),
      sampleData: z.string().min(1), specification: z.string().min(1),
      subgroupSize: z.number().optional(), chartType: z.string().optional(),
    }))
    .mutation(async ({ input }) => await analyzeSPC(input)),

  analyzeNCR: requirePermission('mfg:qc:manage')
    .input(z.object({
      productName: z.string().min(1), batchNumber: z.string().min(1),
      defectDescription: z.string().min(1), defectCategory: z.string().min(1),
      detectionStage: z.string().min(1), quantity: z.number().min(1),
      severity: z.string().optional(), previousOccurrences: z.string().optional(),
    }))
    .mutation(async ({ input }) => await analyzeNCR(input)),

  /** Phase 5: 保存 NCR 分析结果到数据库 */
  saveNCR: protectedProcedure
    .input(z.object({
      ncrNumber: z.string(),
      productName: z.string(),
      batchNumber: z.string(),
      defectCategory: z.string().optional(),
      defectDescription: z.string().optional(),
      detectionStage: z.string().optional(),
      severity: z.string().optional(),
      projectId: z.number().optional(),
      processCode: z.string().optional(),
      analysisResult: z.record(z.string(), z.any()).optional(),
      rootCauseAnalysis: z.any().optional(),
      correctiveActions: z.any().optional(),
      preventiveActions: z.any().optional(),
      disposition: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { requireDb } = await import("../db");
      const { sql } = await import("drizzle-orm");
      const db = await requireDb();

      await db.execute(sql`
        INSERT INTO quality_ncr_records
          (ncr_number, product_name, batch_number, defect_category, defect_description,
           detection_stage, severity, project_id, process_code,
           analysis_result, root_cause_analysis, corrective_actions, preventive_actions,
           disposition, status, created_by, created_by_name)
        VALUES (
          ${input.ncrNumber}, ${input.productName}, ${input.batchNumber},
          ${input.defectCategory || null}, ${input.defectDescription || null},
          ${input.detectionStage || null}, ${input.severity || 'minor'},
          ${input.projectId || null}, ${input.processCode || null},
          ${JSON.stringify(input.analysisResult || {})},
          ${JSON.stringify(input.rootCauseAnalysis || [])},
          ${JSON.stringify(input.correctiveActions || [])},
          ${JSON.stringify(input.preventiveActions || [])},
          ${input.disposition || null}, 'open',
          ${ctx.user?.id ?? 0}, ${ctx.user?.name || ''}
        )
      `);

      return { success: true, ncrNumber: input.ncrNumber, message: "NCR 已保存" };
    }),

  /** Phase 5: 查询 NCR 记录列表 */
  listNCR: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().default(50),
    }).optional())
    .query(async () => {
      const { requireDb } = await import("../db");
      const { sql } = await import("drizzle-orm");
      const db = await requireDb();
      try {
        const result: any = await db.execute(sql`
          SELECT * FROM quality_ncr_records ORDER BY created_at DESC LIMIT 50
        `);
        return { items: result?.rows ?? result ?? [] };
      } catch {
        return { items: [] };
      }
    }),
});
