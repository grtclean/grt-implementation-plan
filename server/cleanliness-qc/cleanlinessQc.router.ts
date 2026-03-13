/**
 * 清洁度质检智能路由 (Cleanliness QC Intelligence Router)
 * Phase 21 P0: 检测模板 · 自动判定 · 报告生成
 * + Report Archive (persistent report storage)
 */

import { z } from "zod";
import { protectedProcedure, router, requirePermission } from "../_core/trpc";
import {
  inspectCleanliness,
  judgeCompliance,
  generateQCReport,
} from "./cleanlinessQc.service";
import { requireDb } from "../db";
import { cleanlinessReports } from "../../drizzle/cleaning-machine-schema";
import { eq, and, desc, type SQL } from "drizzle-orm";

export const cleanlinessQcRouter = router({
  // US-001: 清洁度检测数据结构化 (mutation — invokes LLM)
  inspect: requirePermission('mfg:cleanliness:manage')
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
  judge: requirePermission('mfg:cleanliness:manage')
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
  generateReport: requirePermission('mfg:cleanliness:manage')
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

  // ── Report Archive (persistent storage) ──

  saveReport: requirePermission('mfg:cleanliness:manage')
    .input(z.object({
      projectId: z.number().optional(),
      projectPhase: z.string(),
      batchNumber: z.string().min(1),
      standard: z.string().optional(),
      cleanlinessClass: z.string().optional(),
      inspectionData: z.string().optional(),
      judgmentData: z.string().optional(),
      reportContent: z.string().optional(),
      overallVerdict: z.string().optional(),
      inspectorName: z.string().optional(),
      inspectionDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        if (!db) return { success: false, error: "DB not available" };
        const rows = await db.insert(cleanlinessReports).values({
          projectId: input.projectId,
          projectPhase: input.projectPhase,
          batchNumber: input.batchNumber,
          standard: input.standard,
          cleanlinessClass: input.cleanlinessClass,
          inspectionData: input.inspectionData,
          judgmentData: input.judgmentData,
          reportContent: input.reportContent,
          overallVerdict: input.overallVerdict,
          inspectorName: input.inspectorName,
          inspectionDate: input.inspectionDate || new Date().toISOString().slice(0, 10),
        }).returning();
        return { success: true, report: rows[0] };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }),

  listReports: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      projectPhase: z.string().optional(),
      verdict: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        if (!db) return [];
        const conditions: SQL[] = [];
        if (input.projectId) conditions.push(eq(cleanlinessReports.projectId, input.projectId));
        if (input.projectPhase) conditions.push(eq(cleanlinessReports.projectPhase, input.projectPhase));
        if (input.verdict) conditions.push(eq(cleanlinessReports.overallVerdict, input.verdict));

        const rows = conditions.length > 0
          ? await db.select().from(cleanlinessReports).where(and(...conditions)).orderBy(desc(cleanlinessReports.createdAt)).limit(1000)
          : await db.select().from(cleanlinessReports).orderBy(desc(cleanlinessReports.createdAt)).limit(1000);
        return rows;
      } catch {
        return [];
      }
    }),

  getReport: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        if (!db) return null;
        const rows = await db.select().from(cleanlinessReports).where(eq(cleanlinessReports.id, input.id)).limit(1000);
        return rows[0] ?? null;
      } catch {
        return null;
      }
    }),

  deleteReport: requirePermission('mfg:cleanliness:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        if (!db) return { success: false, error: "DB not available" };
        await db.delete(cleanlinessReports).where(eq(cleanlinessReports.id, input.id));
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }),

  getReportsByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        if (!db) return [];
        const rows = await db.select().from(cleanlinessReports)
          .where(eq(cleanlinessReports.projectId, input.projectId))
          .orderBy(desc(cleanlinessReports.createdAt)).limit(1000);
        return rows;
      } catch {
        return [];
      }
    }),
});
