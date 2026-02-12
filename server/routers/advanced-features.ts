/**
 * Advanced Features Router
 * tRPC路由器 - 高级功能（实时协作、转录、导出）
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  initializeCollaborationSession,
  getCollaborationState,
  getActiveUsers,
  removeUserFromSession,
  getCollaborationStats,
  saveCollaborationState,
} from "../services/collaboration.service";
import {
  transcribeMeetingAudio,
  transcribeAndGenerateNotes,
  getTranscriptionStats,
  SUPPORTED_LANGUAGES,
} from "../services/transcription.service";
import {
  exportMeetingReport,
  generateShareableLink,
} from "../services/export.service";

export const advancedFeaturesRouter = router({
  // ============================================================================
  // 实时协作功能
  // ============================================================================

  // 初始化协作会话
  collaboration: router({
    init: protectedProcedure
      .input(
        z.object({
          meetingId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const session = await initializeCollaborationSession(
          input.meetingId,
          ctx.user.id,
          ctx.user.name || "Unknown"
        );

        return {
          documentId: session.documentId,
          state: getCollaborationState(input.meetingId),
          activeUsers: getActiveUsers(input.meetingId),
        };
      }),

    // 获取活跃用户
    getActiveUsers: protectedProcedure
      .input(z.object({ meetingId: z.string() }))
      .query(async ({ input }) => {
        return getActiveUsers(input.meetingId);
      }),

    // 获取协作统计
    getStats: protectedProcedure.query(async () => {
      return getCollaborationStats();
    }),

    // 保存协作状态
    save: protectedProcedure
      .input(z.object({ meetingId: z.string() }))
      .mutation(async ({ input }) => {
        await saveCollaborationState(input.meetingId);
        return { success: true };
      }),

    // 用户离开会话
    leave: protectedProcedure
      .input(z.object({ meetingId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        removeUserFromSession(input.meetingId, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============================================================================
  // 音频转录功能
  // ============================================================================

  transcription: router({
    // 转录音频
    transcribe: protectedProcedure
      .input(
        z.object({
          meetingId: z.string(),
          audioUrl: z.string().url(),
          language: z.string().optional(),
          prompt: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await transcribeMeetingAudio(input.meetingId, input.audioUrl, {
          language: input.language,
          prompt: input.prompt,
        });
      }),

    // 转录并生成笔记
    transcribeAndGenerateNotes: protectedProcedure
      .input(
        z.object({
          meetingId: z.string(),
          audioUrl: z.string().url(),
          language: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await transcribeAndGenerateNotes(
          input.meetingId,
          input.audioUrl,
          ctx.user.id,
          { language: input.language }
        );
      }),

    // 获取转录统计
    getStats: protectedProcedure
      .input(z.object({ meetingId: z.string() }))
      .query(async ({ input }) => {
        return await getTranscriptionStats(input.meetingId);
      }),

    // 获取支持的语言列表
    getSupportedLanguages: protectedProcedure.query(async () => {
      return SUPPORTED_LANGUAGES;
    }),
  }),

  // ============================================================================
  // 导出和分享功能
  // ============================================================================

  export: router({
    // 导出会议报告
    report: protectedProcedure
      .input(
        z.object({
          meetingId: z.string(),
          format: z.enum(["markdown", "html", "pdf", "docx"]).default("markdown"),
          includeInsights: z.boolean().default(true),
          includeParticipants: z.boolean().default(true),
          includeTimestamp: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        const content = await exportMeetingReport(input.meetingId, input.format, {
          includeInsights: input.includeInsights,
          includeParticipants: input.includeParticipants,
          includeTimestamp: input.includeTimestamp,
        });

        return {
          format: input.format,
          content:
            typeof content === "string"
              ? content
              : content.toString("base64"),
        };
      }),

    // 生成可分享的链接
    generateShareLink: protectedProcedure
      .input(
        z.object({
          meetingId: z.string(),
          expiresIn: z.number().optional(), // 毫秒
        })
      )
      .mutation(async ({ input }) => {
        const link = await generateShareableLink(
          input.meetingId,
          input.expiresIn
        );
        return { link };
      }),
  }),
});
