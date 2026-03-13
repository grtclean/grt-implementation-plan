/**
 * Microsoft Graph Router - Microsoft 365集成tRPC路由
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
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
import { outlookService } from "./microsoft-graph/outlook.service";
import { plannerService } from "./microsoft-graph/planner.service";
import { onenoteService } from "./microsoft-graph/onenote.service";
import { oneDriveSyncService, folderMappingService, departmentMappingService, showroomSyncService } from "./microsoft-graph/onedrive-sync.service";
import { isGraphConfigured } from "./microsoft-graph/config";
import { sharepointSiteService } from "./microsoft-graph/sharepoint-site.service";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("ms-graph-router");

export const microsoftGraphRouter = router({
  // 验证凭据
  validateCredentials: protectedProcedure.query(async () => {
    return validateCredentials();
  }),

  // 清除token缓存
  clearCache: requirePermission('system:microsoft:config').mutation(async () => {
    clearTokenCache();
    return { success: true };
  }),

  // 保存配置
  saveConfig: requirePermission('system:microsoft:config')
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
  testConnection: requirePermission('system:microsoft:config')
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
    sendMessage: requirePermission('system:microsoft:config')
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
    syncProjectFiles: requirePermission('system:microsoft:config')
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

  // ============================
  // Outlook 邮件
  // ============================
  mail: router({
    // 获取收件箱邮件
    getInbox: protectedProcedure
      .input(z.object({
        top: z.number().min(1).max(50).default(25),
        skip: z.number().min(0).default(0),
      }).optional())
      .query(async ({ ctx, input }) => {
        const userId = (ctx as any).user?.email ?? (ctx as any).user?.id ?? "me";
        const messages = await outlookService.getInboxMessages(userId, input?.top ?? 25, input?.skip ?? 0);
        return { messages };
      }),

    // 获取未读邮件数
    getUnreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        const userId = (ctx as any).user?.email ?? (ctx as any).user?.id ?? "me";
        const count = await outlookService.getUnreadCount(userId);
        return { count };
      }),

    // 获取邮件文件夹列表
    getFolders: protectedProcedure
      .query(async ({ ctx }) => {
        const userId = (ctx as any).user?.email ?? (ctx as any).user?.id ?? "me";
        const folders = await outlookService.getMailFolders(userId);
        return { folders };
      }),

    // 获取邮件详情
    getMessageDetail: protectedProcedure
      .input(z.object({ messageId: z.string() }))
      .query(async ({ ctx, input }) => {
        const userId = (ctx as any).user?.email ?? (ctx as any).user?.id ?? "me";
        const message = await outlookService.getMessageDetail(userId, input.messageId);
        return { message };
      }),

    // 发送邮件
    sendMail: requirePermission('system:microsoft:config')
      .input(z.object({
        to: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).min(1),
        cc: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).optional(),
        subject: z.string().min(1),
        body: z.string().min(1),
        bodyType: z.enum(["Text", "HTML"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = (ctx as any).user?.email ?? (ctx as any).user?.id ?? "me";
        const success = await outlookService.sendMail(userId, input);
        return { success };
      }),

    // 回复邮件
    replyMail: requirePermission('system:microsoft:config')
      .input(z.object({
        messageId: z.string(),
        comment: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = (ctx as any).user?.email ?? (ctx as any).user?.id ?? "me";
        const success = await outlookService.replyMail(userId, input.messageId, input.comment);
        return { success };
      }),

    // 转发邮件
    forwardMail: requirePermission('system:microsoft:config')
      .input(z.object({
        messageId: z.string(),
        to: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).min(1),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = (ctx as any).user?.email ?? (ctx as any).user?.id ?? "me";
        const success = await outlookService.forwardMail(userId, input.messageId, input.to, input.comment);
        return { success };
      }),

    // 标记已读
    markAsRead: requirePermission('system:microsoft:config')
      .input(z.object({ messageId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const userId = (ctx as any).user?.email ?? (ctx as any).user?.id ?? "me";
        const success = await outlookService.markAsRead(userId, input.messageId);
        return { success };
      }),

    // 删除邮件
    deleteMail: requirePermission('system:microsoft:config')
      .input(z.object({ messageId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const userId = (ctx as any).user?.email ?? (ctx as any).user?.id ?? "me";
        const success = await outlookService.deleteMail(userId, input.messageId);
        return { success };
      }),

    // 搜索邮件
    searchMail: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const userId = (ctx as any).user?.email ?? (ctx as any).user?.id ?? "me";
        const messages = await outlookService.searchMail(userId, input.query);
        return { messages };
      }),
  }),

  // ═══════ Planner ═══════
  planner: router({
    getPlans: protectedProcedure
      .input(z.object({ groupId: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const plans = await plannerService.getPlans(input?.groupId);
        return { plans };
      }),

    getBuckets: protectedProcedure
      .input(z.object({ planId: z.string() }))
      .query(async ({ input }) => {
        const buckets = await plannerService.getBuckets(input.planId);
        return { buckets };
      }),

    getTasks: protectedProcedure
      .input(z.object({ planId: z.string() }))
      .query(async ({ input }) => {
        const tasks = await plannerService.getTasks(input.planId);
        return { tasks };
      }),

    createTask: requirePermission('system:microsoft:config')
      .input(z.object({
        planId: z.string(),
        bucketId: z.string(),
        title: z.string().min(1).max(500),
        dueDateTime: z.string().optional(),
        priority: z.number().min(0).max(9).optional(),
        assignedTo: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const task = await plannerService.createTask(input);
        return { task };
      }),

    updateProgress: requirePermission('system:microsoft:config')
      .input(z.object({
        taskId: z.string(),
        percentComplete: z.number().min(0).max(100),
        etag: z.string().default("*"),
      }))
      .mutation(async ({ input }) => {
        const success = await plannerService.updateTaskProgress(input.taskId, input.percentComplete, input.etag);
        return { success };
      }),
  }),

  // ═══════ OneNote ═══════
  onenote: router({
    getNotebooks: protectedProcedure
      .input(z.object({ userId: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const notebooks = await onenoteService.getNotebooks(input?.userId);
        return { notebooks };
      }),

    getSections: protectedProcedure
      .input(z.object({ notebookId: z.string() }))
      .query(async ({ input }) => {
        const sections = await onenoteService.getSections(input.notebookId);
        return { sections };
      }),

    getPages: protectedProcedure
      .input(z.object({ sectionId: z.string(), top: z.number().min(1).max(100).optional() }))
      .query(async ({ input }) => {
        const pages = await onenoteService.getPages(input.sectionId, input.top);
        return { pages };
      }),

    getPageContent: protectedProcedure
      .input(z.object({ pageId: z.string() }))
      .query(async ({ input }) => {
        const content = await onenoteService.getPageContent(input.pageId);
        return { content };
      }),

    createPage: requirePermission('system:microsoft:config')
      .input(z.object({
        sectionId: z.string(),
        title: z.string().min(1).max(500),
        htmlContent: z.string().max(100000),
      }))
      .mutation(async ({ input }) => {
        const page = await onenoteService.createPage(input.sectionId, input.title, input.htmlContent);
        return { page };
      }),

    updatePage: requirePermission('system:microsoft:config')
      .input(z.object({
        pageId: z.string(),
        htmlContent: z.string().max(100000),
      }))
      .mutation(async ({ input }) => {
        const success = await onenoteService.updatePage(input.pageId, input.htmlContent);
        return { success };
      }),
  }),

  // ═══════ OneDrive Sync ═══════
  onedrive: router({
    listFiles: protectedProcedure
      .input(z.object({ folderPath: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const items = await oneDriveSyncService.listFiles(input?.folderPath);
        return { items };
      }),

    syncToOneDrive: requirePermission('system:microsoft:config')
      .input(z.object({
        grtFileId: z.number(),
        fileName: z.string(),
        fileBase64: z.string(),
        contentType: z.string().default("application/octet-stream"),
        folderPath: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const result = await oneDriveSyncService.uploadToOneDrive({
          fileName: input.fileName,
          fileBuffer: buffer,
          contentType: input.contentType,
          folderPath: input.folderPath,
          grtFileId: input.grtFileId,
        });
        return result;
      }),

    getOneDriveLink: protectedProcedure
      .input(z.object({ grtFileId: z.number() }))
      .query(({ input }) => {
        return oneDriveSyncService.getOneDriveLink(input.grtFileId);
      }),

    getSyncStatus: protectedProcedure.query(() => {
      return oneDriveSyncService.getSyncStatus();
    }),

    pullChanges: requirePermission('system:microsoft:config')
      .input(z.object({ deltaToken: z.string().optional() }).optional())
      .mutation(async ({ input }) => {
        return oneDriveSyncService.pullChanges(input?.deltaToken);
      }),
  }),

  // ═══════ SharePoint Folder Mapping ═══════
  folderMapping: router({
    /** Check Microsoft Graph configuration status */
    checkConfig: protectedProcedure.query(async () => {
      const mappings = await folderMappingService.listMappings();
      return { configured: isGraphConfigured(), hasMappings: mappings.length > 0 };
    }),

    /** List all GRT ↔ SharePoint folder mappings */
    list: protectedProcedure.query(async () => {
      return folderMappingService.listMappings();
    }),

    /** Create or update a folder mapping */
    upsert: requirePermission('system:microsoft:config')
      .input(z.object({
        grtFolderId: z.number(),
        grtFolderName: z.string(),
        sharepointPath: z.string(),
        sharepointSiteId: z.string().optional(),
        sharepointFolderId: z.string().nullish(),
        syncDirection: z.enum(["bidirectional", "grt_to_sp", "sp_to_grt"]).optional(),
        autoSync: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return folderMappingService.upsertMapping(input);
      }),

    /** Delete a folder mapping */
    delete: requirePermission('system:microsoft:config')
      .input(z.object({ grtFolderId: z.number() }))
      .mutation(async ({ input }) => {
        await folderMappingService.deleteMapping(input.grtFolderId);
        return { success: true };
      }),

    /** Seed default mappings (10 top-level folders → SharePoint paths) */
    seedDefaults: requirePermission('system:microsoft:config')
      .mutation(async () => {
        const count = await folderMappingService.seedDefaultMappings();
        return { inserted: count };
      }),

    /** Toggle auto-sync for a specific mapping */
    toggleAutoSync: requirePermission('system:microsoft:config')
      .input(z.object({ grtFolderId: z.number(), autoSync: z.boolean() }))
      .mutation(async ({ input }) => {
        await folderMappingService.toggleAutoSync(input.grtFolderId, input.autoSync);
        return { success: true };
      }),
  }),

  // ═══════ Department → SharePoint Mapping ═══════
  departmentMapping: router({
    /** List all department→SP mappings */
    list: protectedProcedure.query(async () => {
      return departmentMappingService.listDeptMappings();
    }),

    /** Upsert a department→SP mapping */
    upsert: requirePermission('system:microsoft:config')
      .input(z.object({
        deptCode: z.string(),
        spSiteId: z.string(),
        spRootPath: z.string(),
        syncDirection: z.enum(["bidirectional", "grt_to_sp", "sp_to_grt"]).optional(),
        autoSync: z.boolean().optional(),
        autoMirror: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return departmentMappingService.upsertDeptMapping(input);
      }),

    /** Resolve department SP path for a role+BU */
    resolve: protectedProcedure
      .input(z.object({ role: z.string(), buCode: z.string().nullish() }))
      .query(async ({ input }) => {
        const deptCode = departmentMappingService.resolveDeptFromRole(input.role, input.buCode ?? null);
        const spPath = await departmentMappingService.resolveSPPath(deptCode);
        return { deptCode, spPath };
      }),

    /** Get recent sync logs */
    syncLogs: protectedProcedure
      .input(z.object({
        limit: z.number().max(500).default(50),
        deptCode: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return departmentMappingService.getSyncLogs(input.limit, input.deptCode);
      }),
  }),

  // ═══════ Organization Nodes ═══════
  orgNodes: router({
    /** List all organization nodes */
    list: protectedProcedure.query(async () => {
      return departmentMappingService.listOrgNodes();
    }),

    /** List org nodes grouped by cluster (A/B/C/D) */
    listByCluster: protectedProcedure.query(async () => {
      return departmentMappingService.listOrgNodesByCluster();
    }),

    /** Seed default org nodes (20 nodes, 4 clusters) */
    seed: requirePermission('system:microsoft:config')
      .mutation(async () => {
        const count = await departmentMappingService.seedOrgNodes();
        return { inserted: count };
      }),
  }),

  // ═══════ Digital Showroom Sync ═══════
  showroom: router({
    /** Trigger showroom file sync to SharePoint */
    sync: requirePermission('system:microsoft:config')
      .mutation(async () => {
        return showroomSyncService.syncShowroomFiles();
      }),

    /** Get showroom sync status */
    status: protectedProcedure.query(async () => {
      return showroomSyncService.getShowroomSyncStatus();
    }),
  }),

  // ═══════ SharePoint Site Architecture (4-Cluster) ═══════
  sites: router({
    /** List all sites, optionally filtered by cluster */
    list: protectedProcedure
      .input(z.object({ cluster: z.enum(["A", "B", "C", "D"]).optional() }).optional())
      .query(async ({ input }) => {
        return sharepointSiteService.listSites(input?.cluster);
      }),

    /** Get single site detail */
    get: protectedProcedure
      .input(z.object({ siteCode: z.string() }))
      .query(async ({ input }) => {
        return sharepointSiteService.getSite(input.siteCode);
      }),

    /** Upsert a site configuration */
    upsert: requirePermission('system:microsoft:config')
      .input(z.object({
        siteCode: z.string().max(50),
        cluster: z.enum(["A", "B", "C", "D"]),
        name: z.string().max(200),
        nameEn: z.string().max(200).optional(),
        description: z.string().optional(),
        spSiteId: z.string().optional(),
        spSiteUrl: z.string().optional(),
        ownerDeptCode: z.string().optional(),
        folderTemplate: z.string().optional(),
        syncPolicy: z.enum(["auto", "manual", "scheduled", "disabled"]).optional(),
        syncCronExpr: z.string().optional(),
        accessLevel: z.enum(["public", "internal", "restricted", "confidential"]).optional(),
        allowedRoles: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return sharepointSiteService.upsertSite(input);
      }),

    /** Seed all default sites + folder templates */
    seedDefaults: requirePermission('system:microsoft:config')
      .mutation(async () => {
        const sites = await sharepointSiteService.seedDefaultSites();
        const templates = await sharepointSiteService.seedProjectFolderTemplates();
        return { sites, templates };
      }),

    /** Get cluster summary statistics (A/B/C/D) */
    clusterSummary: protectedProcedure.query(async () => {
      return sharepointSiteService.getClusterSummary();
    }),

    /** List folder templates for a site */
    folderTemplates: protectedProcedure
      .input(z.object({ siteCode: z.string() }))
      .query(async ({ input }) => {
        return sharepointSiteService.listFolderTemplates(input.siteCode);
      }),

    /** Create project folders (P-{year}-{seq}) with 12 standard sub-folders */
    createProjectFolders: requirePermission('project:create')
      .input(z.object({
        projectCode: z.string().regex(/^P-\d{4}-\d{3,4}$/),
        buCode: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return sharepointSiteService.createProjectFolders(input.projectCode, input.buCode);
      }),

    /** Get next available project code */
    nextProjectCode: protectedProcedure
      .input(z.object({ year: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return { code: await sharepointSiteService.getNextProjectCode(input?.year) };
      }),
  }),
});
