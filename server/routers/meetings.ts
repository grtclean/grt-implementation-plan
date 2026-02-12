/**
 * Meetings Router
 * tRPC路由器 - 会议模块
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createMeeting,
  getMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  updateMeetingNotes,
  getChannelMembers,
  addChannelMember,
  updateChannelMemberRole,
} from "../services/meeting.service";
import {
  generateMeetingInsights,
  getMeetingInsights,
  streamMeetingInsights,
} from "../services/ai-insights.service";

export const meetingsRouter = router({
  // 创建会议
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        channelId: z.string(),
        startTime: z.date(),
        meetingType: z.enum([
          "standup",
          "review",
          "planning",
          "retrospective",
          "other",
        ]),
        projectPhase: z.string().optional(),
        revenueTarget: z.number().optional(),
        profitMargin: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return createMeeting(input, ctx.user.id);
    }),

  // 获取会议列表
  list: protectedProcedure
    .input(
      z.object({
        channelId: z.string().optional(),
        status: z.string().optional(),
        meetingType: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return getMeetings(ctx.user.id, input);
    }),

  // 获取单个会议
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      return getMeeting(input.id, ctx.user.id);
    }),

  // 更新会议
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
        endTime: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      return updateMeeting(id, updateData, ctx.user.id);
    }),

  // 删除会议
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return deleteMeeting(input.id, ctx.user.id);
    }),

  // 更新会议笔记
  updateNotes: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
        content: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return updateMeetingNotes(input.meetingId, input.content, ctx.user.id);
    }),

  // 生成AI洞察
  generateInsights: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
        insightTypes: z.array(
          z.enum(["summary", "action_items", "decisions", "risks", "opportunities"])
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return generateMeetingInsights(input, ctx.user.id);
    }),

  // 获取AI洞察
  getInsights: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input, ctx }) => {
      return getMeetingInsights(input.meetingId);
    }),

  // 流式获取AI洞察
  streamInsights: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
        insightTypes: z.array(
          z.enum(["summary", "action_items", "decisions", "risks", "opportunities"])
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return new Promise((resolve, reject) => {
        const chunks: string[] = [];

        streamMeetingInsights(input, (chunk) => {
          chunks.push(chunk);
        })
          .then(() => {
            resolve({ content: chunks.join("") });
          })
          .catch(reject);
      });
    }),

  // 频道管理 - 获取成员
  getChannelMembers: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .query(async ({ input, ctx }) => {
      return getChannelMembers(input.channelId);
    }),

  // 频道管理 - 添加成员
  addChannelMember: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        userId: z.number(),
        role: z.enum(["owner", "manager", "member", "viewer"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return addChannelMember(
        input.channelId,
        input.userId,
        input.role,
        ctx.user.id
      );
    }),

  // 频道管理 - 更新成员角色
  updateChannelMemberRole: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        userId: z.number(),
        role: z.enum(["owner", "manager", "member", "viewer"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return updateChannelMemberRole(
        input.channelId,
        input.userId,
        input.role,
        ctx.user.id
      );
    }),
});
