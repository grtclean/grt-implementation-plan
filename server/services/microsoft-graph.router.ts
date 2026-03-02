/**
 * Microsoft Graph Router - Microsoft 365集成tRPC路由
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getTodayEvents,
  getWeekEvents,
  getCalendarEvents,
  createCalendarEvent,
  getTeamsChats,
  getTeamsChatMessages,
  getRecentTeamsMessages,
  sendTeamsMessage,
  getUserInfo,
  validateCredentials,
  clearTokenCache,
  getDriveItems,
  getFileDownloadUrl,
  searchFiles,
} from "./microsoft-graph";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("ms-graph-router");

export const microsoftGraphRouter = router({
  // 验证凭据
  validateCredentials: protectedProcedure.query(async () => {
    return validateCredentials();
  }),

  // 清除token缓存
  clearCache: protectedProcedure.mutation(async () => {
    clearTokenCache();
    return { success: true };
  }),

  // 保存配置
  saveConfig: protectedProcedure
    .input(z.object({
      tenantId: z.string(),
      clientId: z.string(),
      clientSecret: z.string(),
      calendarEnabled: z.boolean(),
      teamsEnabled: z.boolean()
    }))
    .mutation(async ({ input }) => {
      // TODO: 保存配置到数据库或环境变量
      // 目前返回成功，实际生产环境需要实现持久化
      log.info({ tenantId: input.tenantId, clientId: input.clientId }, "Saving Microsoft Graph config");
      return { success: true };
    }),

  // 测试连接
  testConnection: protectedProcedure
    .input(z.object({
      tenantId: z.string(),
      clientId: z.string(),
      clientSecret: z.string()
    }))
    .mutation(async ({ input }) => {
      try {
        // 尝试获取access token来验证凭据
        const tokenUrl = `https://login.microsoftonline.com/${input.tenantId}/oauth2/v2.0/token`;
        const params = new URLSearchParams({
          client_id: input.clientId,
          client_secret: input.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials'
        });

        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });

        if (response.ok) {
          return { success: true };
        } else {
          const error = await response.json();
          return { success: false, error: error.error_description || 'Authentication failed' };
        }
      } catch (error: any) {
        return { success: false, error: error.message || 'Connection failed' };
      }
    }),

  // 日历相关
  calendar: router({
    // 获取今日事件
    getTodayEvents: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        const events = await getTodayEvents(input.userId);
        return { events };
      }),

    // 获取本周事件
    getWeekEvents: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        const events = await getWeekEvents(input.userId);
        return { events };
      }),

    // 获取指定日期范围的事件
    getEvents: protectedProcedure
      .input(z.object({
        userId: z.string(),
        startDateTime: z.string(),
        endDateTime: z.string(),
      }))
      .query(async ({ input }) => {
        const events = await getCalendarEvents(
          input.userId,
          input.startDateTime,
          input.endDateTime
        );
        return { events };
      }),

    // 创建事件
    createEvent: protectedProcedure
      .input(z.object({
        userId: z.string(),
        subject: z.string(),
        start: z.object({
          dateTime: z.string(),
          timeZone: z.string().default("Asia/Shanghai"),
        }),
        end: z.object({
          dateTime: z.string(),
          timeZone: z.string().default("Asia/Shanghai"),
        }),
        location: z.string().optional(),
        attendees: z.array(z.object({
          email: z.string(),
          name: z.string().optional(),
        })).optional(),
        isOnlineMeeting: z.boolean().optional(),
        body: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const event = await createCalendarEvent(input.userId, {
          subject: input.subject,
          start: input.start,
          end: input.end,
          location: input.location ? { displayName: input.location } : undefined,
          attendees: input.attendees?.map(a => ({
            emailAddress: {
              address: a.email,
              name: a.name || a.email,
            },
            status: { response: "none" },
          })),
          isOnlineMeeting: input.isOnlineMeeting,
          bodyPreview: input.body,
        });
        return { event };
      }),
  }),

  // Teams相关
  teams: router({
    // 获取聊天列表
    getChats: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        const chats = await getTeamsChats(input.userId);
        return { chats };
      }),

    // 获取聊天消息
    getChatMessages: protectedProcedure
      .input(z.object({
        chatId: z.string(),
        top: z.number().default(20),
      }))
      .query(async ({ input }) => {
        const messages = await getTeamsChatMessages(input.chatId, input.top);
        return { messages };
      }),

    // 获取最近消息
    getRecentMessages: protectedProcedure
      .input(z.object({
        userId: z.string(),
        limit: z.number().default(10),
      }))
      .query(async ({ input }) => {
        const messages = await getRecentTeamsMessages(input.userId, input.limit);
        return { messages };
      }),

    // 发送消息
    sendMessage: protectedProcedure
      .input(z.object({
        chatId: z.string(),
        content: z.string(),
      }))
      .mutation(async ({ input }) => {
        const message = await sendTeamsMessage(input.chatId, input.content);
        return { message };
      }),
  }),

  // 用户信息
  user: router({
    // 获取用户信息
    getInfo: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        const user = await getUserInfo(input.userId);
        return { user };
      }),
  }),

  // SharePoint文件集成
  sharepoint: router({
    // 列出文件
    listFiles: protectedProcedure
      .input(z.object({
        siteId: z.string(),
        folderId: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const items = await getDriveItems(input.siteId, input.folderId);
        return { items };
      }),

    // 获取文件下载/查看URL
    getFileUrl: protectedProcedure
      .input(z.object({
        siteId: z.string(),
        itemId: z.string(),
      }))
      .query(async ({ input }) => {
        const result = await getFileDownloadUrl(input.siteId, input.itemId);
        return result;
      }),

    // 搜索文件
    searchFiles: protectedProcedure
      .input(z.object({
        siteId: z.string(),
        query: z.string(),
      }))
      .query(async ({ input }) => {
        const items = await searchFiles(input.siteId, input.query);
        return { items };
      }),

    // 同步项目文件 - 扫描SharePoint文件夹并返回文件元数据列表
    syncProjectFiles: protectedProcedure
      .input(z.object({
        siteId: z.string(),
        folderId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const items = await getDriveItems(input.siteId, input.folderId);

        // 筛选文件（排除文件夹），提取元数据用于批量关联到GRT任务
        const files = items
          .filter(item => item.file != null)
          .map(item => ({
            id: item.id,
            name: item.name,
            url: item.webUrl,
            modifiedDate: item.lastModifiedDateTime,
            size: item.size,
            mimeType: item.file?.mimeType ?? "unknown",
            modifiedBy: item.lastModifiedBy?.user?.displayName ?? "unknown",
          }));

        return {
          files,
          total: files.length,
          syncedAt: new Date().toISOString(),
        };
      }),
  }),
});
