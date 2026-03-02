/**
 * 客户方案沟通确认会议路由
 * Customer Solution Meeting Router
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { jsonValue } from '../../shared/validators';
import {
  createCustomerSolutionMeeting,
  getCustomerSolutionMeeting,
  listCustomerSolutionMeetings,
  uploadCustomerFile,
  getCustomerUploads,
  analyzeUploadedFile,
  matchCases,
  generateSolutionSuggestion,
  searchTechnicalDocs,
  getProjectPhaseDocs,
  getProcessStepDocs,
  transcribeMeetingRecording,
  aiDocRetrieval,
  createSolutionVersion,
  getSolutionVersions,
  compareSolutionVersions,
  reviewSolutionVersion
} from './customer-solution-meeting.service';

export const customerSolutionMeetingRouter = router({
  // ========== 会议管理 ==========
  
  /**
   * 创建客户方案会议
   */
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      meetingType: z.enum(['internal', 'external']),
      meetingMode: z.enum(['online', 'offline', 'hybrid']).optional(),
      customerId: z.string().optional(),
      customerName: z.string().optional(),
      customerContact: z.string().optional(),
      customerRequirements: z.string().optional(),
      cleanlinessLevel: z.string().optional(),
      cleanlinessStandard: z.string().optional(),
      cleanlinessDetails: z.record(z.string(), jsonValue).optional(),
      productType: z.string().optional(),
      partName: z.string().optional(),
      partMaterial: z.string().optional(),
      partDimensions: z.record(z.string(), jsonValue).optional(),
      cycleTime: z.number().optional(),
      loadingForm: z.string().optional(),
      scheduledStart: z.string().optional(),
      scheduledEnd: z.string().optional(),
      internalParticipants: z.array(z.record(z.string(), jsonValue)).optional(),
      externalParticipants: z.array(z.record(z.string(), jsonValue)).optional(),
      aiCaseMatchingEnabled: z.boolean().optional(),
      aiSolutionSuggestionEnabled: z.boolean().optional(),
      aiVoiceRecognitionEnabled: z.boolean().optional(),
      relatedProjectId: z.string().optional(),
      relatedOpportunityId: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { scheduledStart, scheduledEnd, meetingMode, ...rest } = input;
      return createCustomerSolutionMeeting({
        ...rest,
        meetingMode: meetingMode || 'online',
        status: 'scheduled',
        organizerId: String(ctx.user.id),
        organizerName: ctx.user.name || String(ctx.user.id),
        scheduledStart: scheduledStart ? new Date(scheduledStart) : undefined,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : undefined,
        aiCaseMatchingEnabled: input.aiCaseMatchingEnabled ?? true,
        aiSolutionSuggestionEnabled: input.aiSolutionSuggestionEnabled ?? true,
        aiVoiceRecognitionEnabled: input.aiVoiceRecognitionEnabled ?? true,
        createdBy: String(ctx.user.id)
      });
    }),
  
  /**
   * 获取会议详情
   */
  get: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      return getCustomerSolutionMeeting(input.meetingId);
    }),
  
  /**
   * 获取会议列表
   */
  list: protectedProcedure
    .input(z.object({
      meetingType: z.enum(['internal', 'external']).optional(),
      status: z.string().optional(),
      customerId: z.string().optional(),
      organizerId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.number().optional(),
      pageSize: z.number().optional()
    }))
    .query(async ({ input }) => {
      return listCustomerSolutionMeetings({
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined
      });
    }),
  
  // ========== 客户资料上传 ==========
  
  /**
   * 上传客户资料（图纸、清洁度要求、零件照片等）
   */
  uploadFile: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      fileName: z.string(),
      fileType: z.enum(['drawing', 'cleanliness_spec', 'part_photo', 'document', 'video', 'audio', 'other']),
      fileCategory: z.string().optional(),
      fileBase64: z.string(),
      mimeType: z.string(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const fileBuffer = Buffer.from(input.fileBase64, 'base64');
      return uploadCustomerFile({
        meetingId: input.meetingId,
        fileName: input.fileName,
        fileType: input.fileType,
        fileCategory: input.fileCategory,
        fileBuffer,
        mimeType: input.mimeType,
        description: input.description,
        tags: input.tags,
        uploadedBy: String(ctx.user.id)
      });
    }),
  
  /**
   * 获取会议上传的文件列表
   */
  getUploads: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      return getCustomerUploads(input.meetingId);
    }),
  
  /**
   * AI分析上传的文件
   */
  analyzeFile: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ input }) => {
      return analyzeUploadedFile(input.fileId);
    }),
  
  // ========== AI案例匹配 ==========
  
  /**
   * 执行AI案例匹配
   */
  matchCases: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      productType: z.string().optional(),
      partMaterial: z.string().optional(),
      cleanlinessLevel: z.string().optional(),
      cleanlinessStandard: z.string().optional(),
      cycleTime: z.number().optional(),
      customerIndustry: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      uploadedFileIds: z.array(z.string()).optional()
    }))
    .mutation(async ({ input }) => {
      return matchCases(input);
    }),
  
  // ========== 智能方案建议 ==========
  
  /**
   * 生成智能方案建议
   */
  generateSuggestion: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      customerRequirements: z.string(),
      productType: z.string().optional(),
      partMaterial: z.string().optional(),
      cleanlinessLevel: z.string().optional(),
      cleanlinessStandard: z.string().optional(),
      cycleTime: z.number().optional(),
      loadingForm: z.string().optional(),
      referenceCaseIds: z.array(z.string()).optional()
    }))
    .mutation(async ({ input }) => {
      return generateSolutionSuggestion(input);
    }),
  
  // ========== 技术资料调用 ==========
  
  /**
   * 搜索技术资料
   */
  searchDocs: protectedProcedure
    .input(z.object({
      query: z.string(),
      projectPhase: z.string().optional(),
      processStep: z.string().optional(),
      docType: z.string().optional(),
      limit: z.number().optional()
    }))
    .query(async ({ input }) => {
      return searchTechnicalDocs(input);
    }),
  
  /**
   * 获取M0-M12阶段资料
   */
  getPhaseDocs: protectedProcedure
    .input(z.object({ phase: z.string() }))
    .query(async ({ input }) => {
      return getProjectPhaseDocs(input.phase);
    }),
  
  /**
   * 获取T1-T15工序资料
   */
  getProcessDocs: protectedProcedure
    .input(z.object({ step: z.string() }))
    .query(async ({ input }) => {
      return getProcessStepDocs(input.step);
    }),
  
  // ========== AI语音识别 ==========
  
  /**
   * 上传并转写会议录音
   */
  transcribeRecording: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      audioBase64: z.string(),
      audioFormat: z.string(),
      language: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const audioBuffer = Buffer.from(input.audioBase64, 'base64');
      return transcribeMeetingRecording({
        meetingId: input.meetingId,
        audioBuffer,
        audioFormat: input.audioFormat,
        language: input.language,
        createdBy: String(ctx.user.id)
      });
    }),

  // ========== AI资料检索 ==========
  
  /**
   * AI智能资料检索
   */
  aiRetrieveDocs: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      query: z.string(),
      queryType: z.enum(['keyword', 'semantic', 'hybrid']).optional(),
      filters: z.object({
        projectPhase: z.string().optional(),
        processStep: z.string().optional(),
        docType: z.string().optional()
      }).optional(),
      triggeredBy: z.enum(['manual', 'voice', 'auto']).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      return aiDocRetrieval({
        ...input,
        createdBy: String(ctx.user.id)
      });
    }),

  // ========== 方案版本管理 ==========
  
  /**
   * 创建方案版本
   */
  createVersion: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      solutionTitle: z.string(),
      solutionSummary: z.string().optional(),
      solutionContent: jsonValue,
      equipmentConfig: jsonValue.optional(),
      processFlow: z.array(z.record(z.string(), jsonValue)).optional(),
      processSteps: z.array(z.record(z.string(), jsonValue)).optional(),
      projectPhases: z.array(z.record(z.string(), jsonValue)).optional(),
      estimatedCost: z.number().optional(),
      quotedPrice: z.number().optional(),
      deliveryTime: z.number().optional(),
      aiGenerated: z.boolean().optional(),
      aiModel: z.string().optional(),
      aiPrompt: z.string().optional(),
      aiConfidence: z.number().optional(),
      referenceCases: z.array(z.string()).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      return createSolutionVersion({
        meetingId: input.meetingId,
        solutionTitle: input.solutionTitle,
        solutionSummary: input.solutionSummary,
        solutionContent: input.solutionContent,
        equipmentConfig: input.equipmentConfig,
        processFlow: input.processFlow,
        processSteps: input.processSteps,
        projectPhases: input.projectPhases,
        estimatedCost: input.estimatedCost,
        quotedPrice: input.quotedPrice,
        deliveryTime: input.deliveryTime,
        aiGenerated: input.aiGenerated,
        aiModel: input.aiModel,
        aiPrompt: input.aiPrompt,
        aiConfidence: input.aiConfidence,
        referenceCases: input.referenceCases,
        createdBy: String(ctx.user.id)
      });
    }),
  
  /**
   * 获取方案版本列表
   */
  getVersions: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      return getSolutionVersions(input.meetingId);
    }),
  
  /**
   * 比较两个方案版本
   */
  compareVersions: protectedProcedure
    .input(z.object({
      versionId1: z.string(),
      versionId2: z.string()
    }))
    .query(async ({ input }) => {
      return compareSolutionVersions(input.versionId1, input.versionId2);
    }),
  
  /**
   * 审批方案版本
   */
  reviewVersion: protectedProcedure
    .input(z.object({
      versionId: z.string(),
      status: z.enum(['approved', 'rejected']),
      reviewComments: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      await reviewSolutionVersion({
        versionId: input.versionId,
        status: input.status,
        reviewerId: String(ctx.user.id),
        reviewerName: ctx.user.name || String(ctx.user.id),
        reviewComments: input.reviewComments
      });

      // P1: When a solution version is approved, auto-update the linked opportunity's expectedAmount
      if (input.status === 'approved') {
        try {
          const { requireDb } = await import('../db');
          const db = await requireDb();

          // Fetch the approved version to get meetingId and quotedPrice
          const versionResult = await (db as any).execute({
            sql: `SELECT meeting_id, quoted_price FROM solution_versions WHERE id = ?`,
            args: [input.versionId]
          });

          if (versionResult.rows.length > 0) {
            const { meeting_id, quoted_price } = versionResult.rows[0] as any;

            if (quoted_price != null) {
              // Fetch the meeting to check for relatedOpportunityId
              const meeting = await getCustomerSolutionMeeting(meeting_id);

              if (meeting?.relatedOpportunityId) {
                const { crmOpportunitiesV2 } = await import('../../drizzle/schema');
                const { eq } = await import('drizzle-orm');

                const opportunityId = Number(meeting.relatedOpportunityId);
                if (!isNaN(opportunityId)) {
                  await db
                    .update(crmOpportunitiesV2)
                    .set({ expectedAmount: String(quoted_price) })
                    .where(eq(crmOpportunitiesV2.id, opportunityId));

                  console.log(
                    `[reviewVersion] Auto-updated opportunity #${opportunityId} expectedAmount to ${quoted_price} from approved solution version ${input.versionId}`
                  );
                }
              }
            }
          }
        } catch (error) {
          // Log but do not fail the review operation
          console.error('[reviewVersion] Failed to auto-update opportunity amount:', error);
        }
      }
    })
});
