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
});
