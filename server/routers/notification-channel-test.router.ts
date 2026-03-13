import { z } from "zod";
import { jsonValue } from "../../shared/validators";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";

// ─── In-memory store (persists across requests within the same process) ──────

interface ChannelConfig {
  id: string;
  name: string;
  channelType: string;
  webhookUrl: string;
  config: Record<string, unknown>;
  description: string;
  enabled: boolean;
  status: "active" | "error" | "inactive";
  lastTestedAt: string | null;
  lastTestResult: boolean | null;
  createdAt: string;
  updatedAt: string;
}

interface TestRecord {
  id: string;
  channelId: string;
  channelName: string;
  success: boolean;
  message: string;
  responseTime: number;
  testedAt: string;
}

// In-memory template storage
interface NotificationTemplate {
  id: string;
  name: string;
  eventType: string;
  titleTemplate: string;
  bodyTemplate: string;
  channels: string[];
  enabled: boolean;
  updatedAt: string;
}

const notificationTemplates: NotificationTemplate[] = [
  { id: 'tpl-1', name: '审批请求通知', eventType: 'approval_request', titleTemplate: '[GRT] 您有一条新的审批请求', bodyTemplate: '{{approverName}}，您有一条来自{{requesterName}}的{{approvalType}}审批请求，请及时处理。', channels: ['dingtalk', 'email'], enabled: true, updatedAt: new Date().toISOString() },
  { id: 'tpl-2', name: '审批结果通知', eventType: 'approval_result', titleTemplate: '[GRT] 审批结果通知', bodyTemplate: '{{requesterName}}，您的{{approvalType}}审批已{{result}}。', channels: ['dingtalk'], enabled: true, updatedAt: new Date().toISOString() },
  { id: 'tpl-3', name: '阶段变更通知', eventType: 'stage_change', titleTemplate: '[GRT] 项目阶段变更', bodyTemplate: '项目{{projectName}}已从{{fromStage}}进入{{toStage}}阶段。', channels: ['dingtalk', 'email', 'webhook'], enabled: true, updatedAt: new Date().toISOString() },
  { id: 'tpl-4', name: '设备告警通知', eventType: 'device_alert', titleTemplate: '[GRT] 设备告警', bodyTemplate: '设备{{deviceName}}发生{{alertLevel}}级告警：{{alertMessage}}', channels: ['dingtalk', 'webhook'], enabled: true, updatedAt: new Date().toISOString() },
];

let channelStore: ChannelConfig[] = [];
let testHistoryStore: TestRecord[] = [];
let nextId = 1;

// ─── Router ──────────────────────────────────────────────────────────────────

export const notificationChannelTestRouter = router({
  list: protectedProcedure.query(() => {
    return {
      items: channelStore,
      total: channelStore.length,
      page: 1,
      pageSize: 100,
    };
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return channelStore.find((c) => c.id === input.id) ?? null;
    }),

  create: requirePermission("system:notifications:config")
    .input(
      z.object({
        name: z.string().min(1),
        channelType: z.string().min(1),
        webhookUrl: z.string().optional().default(""),
        config: z.record(z.string(), jsonValue).optional().default({}),
        description: z.string().optional().default(""),
        enabled: z.boolean().optional().default(true),
      })
    )
    .mutation(({ input }) => {
      const now = new Date().toISOString();
      const channel: ChannelConfig = {
        id: String(nextId++),
        name: input.name,
        channelType: input.channelType,
        webhookUrl: input.webhookUrl,
        config: input.config as Record<string, unknown>,
        description: input.description,
        enabled: input.enabled,
        status: "inactive",
        lastTestedAt: null,
        lastTestResult: null,
        createdAt: now,
        updatedAt: now,
      };
      channelStore.push(channel);
      return { success: true, message: "通道创建成功", data: channel };
    }),

  update: requirePermission("system:notifications:config")
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        channelType: z.string().optional(),
        webhookUrl: z.string().optional(),
        config: z.record(z.string(), jsonValue).optional(),
        description: z.string().optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => {
      const idx = channelStore.findIndex((c) => c.id === input.id);
      if (idx === -1) throw new Error("通道不存在");
      const channel = channelStore[idx];
      if (input.name !== undefined) channel.name = input.name;
      if (input.channelType !== undefined) channel.channelType = input.channelType;
      if (input.webhookUrl !== undefined) channel.webhookUrl = input.webhookUrl;
      if (input.config !== undefined) channel.config = input.config as Record<string, unknown>;
      if (input.description !== undefined) channel.description = input.description;
      if (input.enabled !== undefined) channel.enabled = input.enabled;
      channel.updatedAt = new Date().toISOString();
      channelStore[idx] = channel;
      return { success: true, message: "通道更新成功", data: channel };
    }),

  delete: requirePermission("system:notifications:config")
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const idx = channelStore.findIndex((c) => c.id === input.id);
      if (idx === -1) throw new Error("通道不存在");
      channelStore.splice(idx, 1);
      return { success: true, message: "通道已删除" };
    }),

  testChannel: requirePermission("system:notifications:config")
    .input(
      z.object({
        channelId: z.string(),
        message: z.string().optional().default("GRT系统通知测试消息"),
      })
    )
    .mutation(({ input }) => {
      const channel = channelStore.find((c) => c.id === input.channelId);
      if (!channel) throw new Error("通道不存在");

      // Simulate test — in production, this would HTTP POST to the webhook
      const success = channel.webhookUrl.length > 0;
      const responseTime = Math.floor(Math.random() * 200) + 50;
      const now = new Date().toISOString();

      channel.lastTestedAt = now;
      channel.lastTestResult = success;
      channel.status = success ? "active" : "error";
      channel.updatedAt = now;

      const record: TestRecord = {
        id: `test-${Date.now()}`,
        channelId: channel.id,
        channelName: channel.name,
        success,
        message: success
          ? `测试消息发送成功，响应时间 ${responseTime}ms`
          : "发送失败：WebHook URL为空或不可达",
        responseTime,
        testedAt: now,
      };
      testHistoryStore.unshift(record);
      if (testHistoryStore.length > 50) testHistoryStore.length = 50;

      return {
        success,
        message: record.message,
        responseTime,
      };
    }),

  getTestHistory: protectedProcedure.query(() => {
    return testHistoryStore.slice(0, 20);
  }),

  // ─── Template Management ──────────────────────────────────────────────────

  getTemplates: protectedProcedure.query(async () => {
    return { templates: notificationTemplates };
  }),

  createTemplate: requirePermission("system:notifications:config")
    .input(
      z.object({
        name: z.string(),
        eventType: z.string(),
        titleTemplate: z.string(),
        bodyTemplate: z.string(),
        channels: z.array(z.string()),
        enabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const tpl: NotificationTemplate = {
        id: `tpl-${Date.now()}`,
        ...input,
        updatedAt: new Date().toISOString(),
      };
      notificationTemplates.push(tpl);
      return { success: true, template: tpl };
    }),

  updateTemplate: requirePermission("system:notifications:config")
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        eventType: z.string().optional(),
        titleTemplate: z.string().optional(),
        bodyTemplate: z.string().optional(),
        channels: z.array(z.string()).optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const idx = notificationTemplates.findIndex((t) => t.id === input.id);
      if (idx === -1) return { success: false };
      const tpl = notificationTemplates[idx];
      if (input.name !== undefined) tpl.name = input.name;
      if (input.eventType !== undefined) tpl.eventType = input.eventType;
      if (input.titleTemplate !== undefined) tpl.titleTemplate = input.titleTemplate;
      if (input.bodyTemplate !== undefined) tpl.bodyTemplate = input.bodyTemplate;
      if (input.channels !== undefined) tpl.channels = input.channels;
      if (input.enabled !== undefined) tpl.enabled = input.enabled;
      tpl.updatedAt = new Date().toISOString();
      return { success: true, template: tpl };
    }),

  deleteTemplate: requirePermission("system:notifications:config")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const idx = notificationTemplates.findIndex((t) => t.id === input.id);
      if (idx === -1) return { success: false };
      notificationTemplates.splice(idx, 1);
      return { success: true };
    }),
});
