/**
 * Channels Router
 * tRPC路由器 - 频道模块
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { requireDb } from '../utils/db-helpers';
import { v4 as uuidv4 } from "uuid";
import { channels, channelMembers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const channelsRouter = router({
  // 获取频道列表
  list: protectedProcedure.query(async ({ ctx }) => {
    const database = await requireDb();

    // 获取用户所在的所有频道
    const userChannels = await database
      .select({
        id: channels.id,
        name: channels.name,
        description: channels.description,
        visibility: channels.visibility,
        createdBy: channels.createdBy,
        createdAt: channels.createdAt,
      })
      .from(channels)
      .innerJoin(
        channelMembers,
        eq(channels.id, channelMembers.channelId)
      )
      .where(eq(channelMembers.userId, ctx.user.id));

    return userChannels;
  }),

  // 获取单个频道
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const database = await requireDb();

      // 验证用户是否有权访问
      const member = await database
        .select()
        .from(channelMembers)
        .where(
          eq(channelMembers.channelId, input.id) &&
          eq(channelMembers.userId, ctx.user.id)
        )
        .then((results) => results[0]);

      if (!member) {
        throw new Error("You don't have access to this channel");
      }

      const channel = await database
        .select()
        .from(channels)
        .where(eq(channels.id, input.id))
        .then((results) => results[0]);

      return channel;
    }),

  // 创建频道
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        visibility: z.enum(["public", "private", "confidential"]).default("private"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await requireDb();
      const channelId = uuidv4();

      // 创建频道
      await database.insert(channels).values({
        id: channelId,
        name: input.name,
        description: input.description,
        organizationId: (ctx.user as any).organizationId || 1, // 默认组织ID
        visibility: input.visibility,
        createdBy: ctx.user.id,
      });

      // 添加创建者为所有者
      const memberId = uuidv4();
      await database.insert(channelMembers).values({
        id: memberId,
        channelId,
        userId: ctx.user.id,
        role: "owner",
      });

      return { id: channelId, ...input };
    }),

  // 更新频道
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        visibility: z.enum(["public", "private", "confidential"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await requireDb();
      const { id, ...updateData } = input;

      // 验证用户是否是所有者
      const member = await database
        .select()
        .from(channelMembers)
        .where(
          eq(channelMembers.channelId, id) &&
          eq(channelMembers.userId, ctx.user.id)
        )
        .then((results) => results[0]);

      if (!member || member.role !== "owner") {
        throw new Error("Only channel owner can update channel");
      }

      // 更新频道
      await database
        .update(channels)
        .set(updateData)
        .where(eq(channels.id, id));

      return { id, ...updateData };
    }),

  // 删除频道
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const database = await requireDb();

      // 验证用户是否是所有者
      const member = await database
        .select()
        .from(channelMembers)
        .where(
          eq(channelMembers.channelId, input.id) &&
          eq(channelMembers.userId, ctx.user.id)
        )
        .then((results) => results[0]);

      if (!member || member.role !== "owner") {
        throw new Error("Only channel owner can delete channel");
      }

      // 删除频道
      await database
        .delete(channels)
        .where(eq(channels.id, input.id));

      return { success: true };
    }),

  // 获取频道成员
  getMembers: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .query(async ({ input, ctx }) => {
      const database = await requireDb();

      // 验证用户是否有权访问
      const member = await database
        .select()
        .from(channelMembers)
        .where(
          eq(channelMembers.channelId, input.channelId) &&
          eq(channelMembers.userId, ctx.user.id)
        )
        .then((results) => results[0]);

      if (!member) {
        throw new Error("You don't have access to this channel");
      }

      // 获取所有成员
      const members = await database
        .select()
        .from(channelMembers)
        .where(eq(channelMembers.channelId, input.channelId));

      return members;
    }),

  // 添加成员到频道
  addMember: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        userId: z.number(),
        role: z.enum(["owner", "manager", "member", "viewer"]).default("member"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await requireDb();

      // 验证用户是否是管理员
      const member = await database
        .select()
        .from(channelMembers)
        .where(
          eq(channelMembers.channelId, input.channelId) &&
          eq(channelMembers.userId, ctx.user.id)
        )
        .then((results) => results[0]);

      if (!member || (member.role !== "owner" && member.role !== "manager")) {
        throw new Error("You don't have permission to add members");
      }

      // 检查成员是否已存在
      const existingMember = await database
        .select()
        .from(channelMembers)
        .where(
          eq(channelMembers.channelId, input.channelId) &&
          eq(channelMembers.userId, input.userId)
        )
        .then((results) => results[0]);

      if (existingMember) {
        throw new Error("User is already a member of this channel");
      }

      // 添加成员
      const memberId = uuidv4();
      await database.insert(channelMembers).values({
        id: memberId,
        channelId: input.channelId,
        userId: input.userId,
        role: input.role,
      });

      return { id: memberId, ...input };
    }),

  // 更新成员角色
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        userId: z.number(),
        role: z.enum(["owner", "manager", "member", "viewer"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await requireDb();

      // 验证用户是否是管理员
      const member = await database
        .select()
        .from(channelMembers)
        .where(
          eq(channelMembers.channelId, input.channelId) &&
          eq(channelMembers.userId, ctx.user.id)
        )
        .then((results) => results[0]);

      if (!member || (member.role !== "owner" && member.role !== "manager")) {
        throw new Error("You don't have permission to update member roles");
      }

      // 更新角色
      await database
        .update(channelMembers)
        .set({ role: input.role })
        .where(
          eq(channelMembers.channelId, input.channelId) &&
          eq(channelMembers.userId, input.userId)
        );

      return { ...input };
    }),

  // 移除成员
  removeMember: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await requireDb();

      // 验证用户是否是管理员
      const member = await database
        .select()
        .from(channelMembers)
        .where(
          eq(channelMembers.channelId, input.channelId) &&
          eq(channelMembers.userId, ctx.user.id)
        )
        .then((results) => results[0]);

      if (!member || (member.role !== "owner" && member.role !== "manager")) {
        throw new Error("You don't have permission to remove members");
      }

      // 移除成员
      await database
        .delete(channelMembers)
        .where(
          eq(channelMembers.channelId, input.channelId) &&
          eq(channelMembers.userId, input.userId)
        );

      return { success: true };
    }),
});
