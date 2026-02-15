/**
 * 清洁度质检智能路由 (Cleanliness QC Intelligence Router)
 * Phase 21 P0: 检测模板 · 自动判定 · 报告生成
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  inspectCleanliness,
  judgeCompliance,
  generateQCReport,
} from "./cleanlinessQc.service";

export const cleanlinessQcRouter = router({
  // US-001: 清洁度检测数据结构化 (mutation — invokes LLM)
  inspect: protectedProcedure
    .input(
      z.object({
        batchNumber: z.string().min(1),
        workpieceType: z.string().min(1),
        cleaningMethod: z.string().min(1),
        standard: z.string().min(1),
        cleanlinessClass: z.string().optional(),
        particleData: z.string().min(1),
        residualMass: z.number().optional(),
        maxParticleSize: z.number().optional(),
        inspectionMethod: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await inspectCleanliness(input);
    }),

  // US-002: 合规自动判定 (mutation — invokes LLM)
  judge: protectedProcedure
    .input(
      z.object({
        batchNumber: z.string().min(1),
        standard: z.string().min(1),
        cleanlinessClass: z.string().min(1),
        particleData: z.string().min(1),
        residualMass: z.number().optional(),
        maxParticleSize: z.number().optional(),
        customerSpecialLimits: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await judgeCompliance(input);
    }),

  // US-003: 检测报告生成 (mutation — invokes LLM)
  generateReport: protectedProcedure
    .input(
      z.object({
        batchNumber: z.string().min(1),
        workpieceType: z.string().min(1),
        cleaningMethod: z.string().min(1),
        standard: z.string().min(1),
        inspectionData: z.string().min(1),
        judgmentResult: z.string().min(1),
        inspectorName: z.string().optional(),
        historicalBatches: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await generateQCReport(input);
    }),
});
