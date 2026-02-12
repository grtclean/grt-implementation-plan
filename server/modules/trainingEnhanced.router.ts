/**
 * 培训管理增强功能 - tRPC路由
 * 功能：证书生成、效果评估报表
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { CertificateService, TrainingEffectivenessService } from "../services/training-enhanced.service";

export const trainingEnhancedRouter = router({
  // ==================== 证书模板管理 ====================

  saveCertificateTemplate: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string(),
      type: z.enum(["completion", "achievement", "skill", "custom"]),
      htmlTemplate: z.string(),
      cssStyles: z.string(),
      variables: z.array(z.string()).default([]),
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      return CertificateService.saveTemplate(input, ctx.user!.id);
    }),

  getCertificateTemplates: protectedProcedure
    .input(z.object({ type: z.string().optional() }))
    .query(async ({ input }) => {
      return CertificateService.getTemplates(input.type);
    }),

  // ==================== 证书生成 ====================

  generateCertificate: protectedProcedure
    .input(z.object({
      userId: z.number(),
      courseId: z.number(),
      templateId: z.number(),
      data: z.object({
        recipientName: z.string(),
        courseName: z.string(),
        completionDate: z.string(),
        score: z.number().optional(),
        instructorName: z.string().optional(),
        validUntil: z.string().optional(),
        customFields: z.record(z.string(), z.string()).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      return CertificateService.generateCertificate(
        input.userId, input.courseId, input.templateId, input.data
      );
    }),

  verifyCertificate: protectedProcedure
    .input(z.object({ certificateNumber: z.string() }))
    .query(async ({ input }) => {
      return CertificateService.verifyCertificate(input.certificateNumber);
    }),

  getUserCertificates: protectedProcedure
    .input(z.object({ userId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = input.userId || ctx.user!.id;
      return CertificateService.getUserCertificates(userId);
    }),

  // ==================== 效果评估报表 ====================

  generateEffectivenessReport: adminProcedure
    .input(z.object({
      dateFrom: z.string(),
      dateTo: z.string(),
    }))
    .mutation(async ({ input }) => {
      return TrainingEffectivenessService.generateReport(input.dateFrom, input.dateTo);
    }),

  getEffectivenessReportHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      return TrainingEffectivenessService.getReportHistory(input.limit);
    }),

  getEffectivenessReport: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .query(async ({ input }) => {
      return TrainingEffectivenessService.getReport(input.reportId);
    }),
});
