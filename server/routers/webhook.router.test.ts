/**
 * Webhook Router — Unit Tests
 * 18 procedures: list, getById, create, update, delete, test, getLogs, toggle,
 * getAll, getStats, sendAlert, sendMeetingReminder, getTemplates, createTemplate,
 * updateTemplate, deleteTemplate, previewTemplate, initTemplates, seedDefaultWebhooks
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { selectResultsQueue, returningQueue };
});

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
      set: vi.fn(() => chain),
      values: vi.fn(() => chain),
      groupBy: vi.fn(() => chain),
      $dynamic: vi.fn(() => chain),
      returning: vi.fn(() => {
        const r = returningQueue.length > 0 ? returningQueue.shift()! : [{ id: 1 }];
        return Object.assign(Promise.resolve(r), {
          then: (resolve: any) => Promise.resolve(r).then(resolve),
          catch: () => Promise.resolve(r),
        });
      }),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();

// ── Sample data ──────────────────────────────────────────────
const sampleWebhook = {
  id: 1,
  name: "企业微信通知",
  type: "wecom",
  webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test",
  enabled: 1,
  description: "Test webhook",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const sampleLog = {
  id: 1,
  webhookId: 1,
  eventType: "alert",
  payload: '{"title":"test"}',
  success: 1,
  statusCode: 200,
  sentAt: "2026-01-01T00:00:00Z",
};

const sampleTemplate = {
  id: 1,
  name: "告警通知",
  eventType: "alert",
  webhookType: "wecom",
  titleTemplate: "⚠️ {{level}} 告警: {{title}}",
  contentTemplate: "来源: {{source}}",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

// ── Tests ────────────────────────────────────────────────────
describe("webhook router", () => {

  // ─── list ──────────────────────────────────────────────────
  describe("list", () => {
    it("returns paginated webhooks with defaults", async () => {
      selectResultsQueue.push([{ count: 2 }]); // count query
      selectResultsQueue.push([sampleWebhook, { ...sampleWebhook, id: 2 }]); // items query
      const result = await caller().webhook.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });

    it("respects limit and offset parameters", async () => {
      selectResultsQueue.push([{ count: 10 }]);
      selectResultsQueue.push([sampleWebhook]);
      const result = await caller().webhook.list({ limit: 5, offset: 5 });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(5);
    });

    it("handles empty results", async () => {
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([]);
      const result = await caller().webhook.list();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("works with undefined input", async () => {
      selectResultsQueue.push([{ count: 1 }]);
      selectResultsQueue.push([sampleWebhook]);
      const result = await caller().webhook.list(undefined);
      expect(result.items).toHaveLength(1);
    });
  });

  // ─── getById ───────────────────────────────────────────────
  describe("getById", () => {
    it("returns a webhook by ID", async () => {
      selectResultsQueue.push([sampleWebhook]);
      const result = await caller().webhook.getById({ id: "1" });
      expect(result).toHaveProperty("name", "企业微信通知");
      expect(result).toHaveProperty("type", "wecom");
    });

    it("returns null when webhook not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().webhook.getById({ id: "999" });
      expect(result).toBeNull();
    });
  });

  // ─── create ────────────────────────────────────────────────
  describe("create", () => {
    it("creates a webhook and returns success", async () => {
      returningQueue.push([{ id: 5, name: "New Webhook", type: "dingtalk" }]);
      const result = await caller().webhook.create({
        name: "New Webhook",
        type: "dingtalk",
        url: "https://oapi.dingtalk.com/robot/send?access_token=test",
        enabled: true,
        description: "A test webhook",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("创建成功");
      expect(result.data).toHaveProperty("id", 5);
    });

    it("creates with enabled defaulting to false", async () => {
      returningQueue.push([{ id: 6, name: "Disabled Hook" }]);
      const result = await caller().webhook.create({
        name: "Disabled Hook",
        type: "wecom",
        url: "https://example.com/webhook",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid URL", async () => {
      await expect(caller().webhook.create({
        name: "Bad URL",
        type: "wecom",
        url: "not-a-url",
      })).rejects.toThrow();
    });

    it("rejects invalid type", async () => {
      await expect(caller().webhook.create({
        name: "Bad Type",
        type: "slack" as any,
        url: "https://example.com/webhook",
      })).rejects.toThrow();
    });
  });

  // ─── update ────────────────────────────────────────────────
  describe("update", () => {
    it("updates a webhook and returns success", async () => {
      returningQueue.push([{ id: 1, name: "Updated Name", webhookUrl: "https://example.com/new" }]);
      const result = await caller().webhook.update({
        id: "1",
        name: "Updated Name",
        url: "https://example.com/new",
        enabled: true,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("更新成功");
      expect(result.data).toHaveProperty("name", "Updated Name");
    });

    it("returns failure when webhook not found", async () => {
      returningQueue.push([]);
      const result = await caller().webhook.update({ id: "999", name: "Ghost" });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Webhook不存在");
    });

    it("supports partial update (name only)", async () => {
      returningQueue.push([{ id: 1, name: "Just Name" }]);
      const result = await caller().webhook.update({ id: "1", name: "Just Name" });
      expect(result.success).toBe(true);
    });

    it("supports partial update (enabled only)", async () => {
      returningQueue.push([{ id: 1, enabled: 0 }]);
      const result = await caller().webhook.update({ id: "1", enabled: false });
      expect(result.success).toBe(true);
    });
  });

  // ─── delete ────────────────────────────────────────────────
  describe("delete", () => {
    it("deletes a webhook and returns success", async () => {
      returningQueue.push([{ id: 1 }]);
      const result = await caller().webhook.delete({ id: "1" });
      expect(result.success).toBe(true);
      expect(result.message).toBe("删除成功");
    });

    it("returns failure when webhook not found", async () => {
      returningQueue.push([]);
      const result = await caller().webhook.delete({ id: "999" });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Webhook不存在");
    });
  });

  // ─── test ──────────────────────────────────────────────────
  describe("test", () => {
    it("tests a webhook connection and logs result", async () => {
      selectResultsQueue.push([sampleWebhook]); // lookup webhook
      // insert log is fire-and-forget via chain.then
      selectResultsQueue.push([]);
      const result = await caller().webhook.test({ id: "1" });
      expect(result.success).toBe(true);
      expect(result.response.success).toBe(true);
      expect(result.response.statusCode).toBe(200);
      expect(result.response.message).toBe("测试成功");
    });

    it("returns failure when webhook not found", async () => {
      selectResultsQueue.push([]); // webhook not found
      const result = await caller().webhook.test({ id: "999" });
      expect(result.success).toBe(false);
      expect(result.response.message).toBe("Webhook不存在");
    });
  });

  // ─── getLogs ───────────────────────────────────────────────
  describe("getLogs", () => {
    it("returns all logs when no webhookId", async () => {
      selectResultsQueue.push([sampleLog, { ...sampleLog, id: 2 }]);
      const result = await caller().webhook.getLogs();
      expect(result).toHaveLength(2);
    });

    it("filters logs by webhookId (string)", async () => {
      selectResultsQueue.push([sampleLog]);
      const result = await caller().webhook.getLogs({ webhookId: "1" });
      expect(result).toHaveLength(1);
    });

    it("filters logs by webhookId (number)", async () => {
      selectResultsQueue.push([sampleLog]);
      const result = await caller().webhook.getLogs({ webhookId: 1 });
      expect(result).toHaveLength(1);
    });

    it("respects limit parameter", async () => {
      selectResultsQueue.push([sampleLog]);
      const result = await caller().webhook.getLogs({ limit: 10 });
      expect(result).toHaveLength(1);
    });

    it("returns empty array when no logs", async () => {
      selectResultsQueue.push([]);
      const result = await caller().webhook.getLogs();
      expect(result).toEqual([]);
    });

    it("works with undefined input", async () => {
      selectResultsQueue.push([]);
      const result = await caller().webhook.getLogs(undefined);
      expect(result).toEqual([]);
    });
  });

  // ─── toggle ────────────────────────────────────────────────
  describe("toggle", () => {
    it("toggles enabled webhook to disabled", async () => {
      selectResultsQueue.push([{ ...sampleWebhook, enabled: 1 }]); // lookup
      selectResultsQueue.push([]); // update
      const result = await caller().webhook.toggle({ id: "1" });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已禁用");
    });

    it("toggles disabled webhook to enabled", async () => {
      selectResultsQueue.push([{ ...sampleWebhook, enabled: 0 }]); // lookup
      selectResultsQueue.push([]); // update
      const result = await caller().webhook.toggle({ id: "1" });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已启用");
    });

    it("returns failure when webhook not found", async () => {
      selectResultsQueue.push([]); // webhook not found
      const result = await caller().webhook.toggle({ id: "999" });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Webhook不存在");
    });
  });

  // ─── getAll ────────────────────────────────────────────────
  describe("getAll", () => {
    it("returns all webhooks", async () => {
      selectResultsQueue.push([sampleWebhook, { ...sampleWebhook, id: 2 }]);
      const result = await caller().webhook.getAll();
      expect(result.webhooks).toHaveLength(2);
    });

    it("returns empty array when no webhooks exist", async () => {
      selectResultsQueue.push([]);
      const result = await caller().webhook.getAll();
      expect(result.webhooks).toEqual([]);
    });
  });

  // ─── getStats ──────────────────────────────────────────────
  describe("getStats", () => {
    it("returns webhook statistics", async () => {
      selectResultsQueue.push([{ count: 5 }]);  // total
      selectResultsQueue.push([{ count: 3 }]);  // enabled
      selectResultsQueue.push([{ count: 20 }]); // totalLogs
      selectResultsQueue.push([{ count: 18 }]); // successLogs
      const result = await caller().webhook.getStats();
      expect(result.total).toBe(5);
      expect(result.enabled).toBe(3);
      expect(result.totalLogs).toBe(20);
      expect(result.successLogs).toBe(18);
    });
  });

  // ─── sendAlert ─────────────────────────────────────────────
  describe("sendAlert", () => {
    it("sends alert to all enabled webhooks", async () => {
      selectResultsQueue.push([
        { id: 1, enabled: 1 },
        { id: 2, enabled: 1 },
      ]); // enabled webhooks
      // 2 insert log calls — each goes through chain.then
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      const result = await caller().webhook.sendAlert({
        level: "critical",
        title: "设备故障",
        description: "生产线A停机",
        source: "IoT系统",
      });
      expect(result.success).toBe(true);
      expect(result.sent).toBe(2);
      expect(result.message).toContain("2");
    });

    it("sends to zero webhooks when none enabled", async () => {
      selectResultsQueue.push([]); // no enabled webhooks
      const result = await caller().webhook.sendAlert({
        level: "info",
        title: "Test",
        description: "Test alert",
        source: "test",
      });
      expect(result.success).toBe(true);
      expect(result.sent).toBe(0);
    });

    it("accepts optional projectId and projectName", async () => {
      selectResultsQueue.push([{ id: 1, enabled: 1 }]);
      selectResultsQueue.push([]);
      const result = await caller().webhook.sendAlert({
        level: "warning",
        title: "项目延期",
        description: "M3阶段超时",
        source: "项目管理",
        projectId: "P001",
        projectName: "清洗线A",
      });
      expect(result.success).toBe(true);
      expect(result.sent).toBe(1);
    });

    it("rejects invalid alert level", async () => {
      await expect(caller().webhook.sendAlert({
        level: "debug" as any,
        title: "Test",
        description: "Test",
        source: "test",
      })).rejects.toThrow();
    });
  });

  // ─── sendMeetingReminder ───────────────────────────────────
  describe("sendMeetingReminder", () => {
    it("sends meeting reminder to all enabled webhooks", async () => {
      selectResultsQueue.push([
        { id: 1, enabled: 1 },
        { id: 2, enabled: 1 },
        { id: 3, enabled: 1 },
      ]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      const result = await caller().webhook.sendMeetingReminder({
        id: "mtg-001",
        title: "项目评审会",
        startTime: "2026-03-01T10:00:00Z",
        location: "会议室A",
        organizer: "张三",
        participants: ["李四", "王五"],
        agenda: "评审M3门禁",
        reminderMinutes: 15,
      });
      expect(result.success).toBe(true);
      expect(result.sent).toBe(3);
    });

    it("sends to zero webhooks when none enabled", async () => {
      selectResultsQueue.push([]);
      const result = await caller().webhook.sendMeetingReminder({
        id: "mtg-002",
        title: "Daily Standup",
        startTime: "2026-03-01T09:00:00Z",
        location: "线上",
        organizer: "Team Lead",
        participants: [],
      });
      expect(result.success).toBe(true);
      expect(result.sent).toBe(0);
    });
  });

  // ─── getTemplates ──────────────────────────────────────────
  describe("getTemplates", () => {
    it("returns all templates ordered by createdAt", async () => {
      selectResultsQueue.push([sampleTemplate, { ...sampleTemplate, id: 2, name: "会议提醒" }]);
      const result = await caller().webhook.getTemplates();
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no templates", async () => {
      selectResultsQueue.push([]);
      const result = await caller().webhook.getTemplates();
      expect(result).toEqual([]);
    });
  });

  // ─── createTemplate ───────────────────────────────────────
  describe("createTemplate", () => {
    it("creates a template and returns success", async () => {
      returningQueue.push([{ id: 10, name: "Custom Template" }]);
      const result = await caller().webhook.createTemplate({
        name: "Custom Template",
        eventType: "custom_event",
        webhookType: "feishu",
        titleTemplate: "{{title}}",
        contentTemplate: "{{content}}",
        availableVariables: "title,content",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("模板创建成功");
      expect(result.data).toHaveProperty("id", 10);
    });

    it("creates template without optional availableVariables", async () => {
      returningQueue.push([{ id: 11, name: "Simple Template" }]);
      const result = await caller().webhook.createTemplate({
        name: "Simple Template",
        eventType: "alert",
        webhookType: "wecom",
        titleTemplate: "Alert",
        contentTemplate: "Details",
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── updateTemplate ────────────────────────────────────────
  describe("updateTemplate", () => {
    it("updates a template with string ID", async () => {
      returningQueue.push([{ id: 1, name: "Updated Template" }]);
      const result = await caller().webhook.updateTemplate({
        id: "1",
        name: "Updated Template",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("模板更新成功");
    });

    it("updates a template with number ID", async () => {
      returningQueue.push([{ id: 2, name: "Numeric ID" }]);
      const result = await caller().webhook.updateTemplate({
        id: 2,
        name: "Numeric ID",
      });
      expect(result.success).toBe(true);
    });

    it("handles isDefault boolean conversion", async () => {
      returningQueue.push([{ id: 1, isDefault: 1 }]);
      const result = await caller().webhook.updateTemplate({
        id: "1",
        isDefault: true,
      });
      expect(result.success).toBe(true);
    });

    it("handles isDefault as number", async () => {
      returningQueue.push([{ id: 1, isDefault: 0 }]);
      const result = await caller().webhook.updateTemplate({
        id: "1",
        isDefault: 0,
      });
      expect(result.success).toBe(true);
    });

    it("supports updating all fields", async () => {
      returningQueue.push([{ id: 1 }]);
      const result = await caller().webhook.updateTemplate({
        id: 1,
        name: "Full Update",
        eventType: "task_update",
        webhookType: "dingtalk",
        titleTemplate: "{{title}}",
        contentTemplate: "{{body}}",
        availableVariables: "title,body",
        isDefault: false,
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── deleteTemplate ────────────────────────────────────────
  describe("deleteTemplate", () => {
    it("deletes a template with string ID", async () => {
      selectResultsQueue.push([]); // delete chain resolves
      const result = await caller().webhook.deleteTemplate({ id: "1" });
      expect(result.success).toBe(true);
      expect(result.message).toBe("模板删除成功");
    });

    it("deletes a template with number ID", async () => {
      selectResultsQueue.push([]);
      const result = await caller().webhook.deleteTemplate({ id: 5 });
      expect(result.success).toBe(true);
    });
  });

  // ─── previewTemplate ──────────────────────────────────────
  describe("previewTemplate", () => {
    it("returns empty preview (stub)", async () => {
      const result = await caller().webhook.previewTemplate({
        template: "Hello {{name}}",
        variables: { name: "World" },
      });
      expect(result).toEqual({ preview: "" });
    });

    it("returns empty preview with no input", async () => {
      const result = await caller().webhook.previewTemplate();
      expect(result).toEqual({ preview: "" });
    });

    it("returns empty preview with undefined input", async () => {
      const result = await caller().webhook.previewTemplate(undefined);
      expect(result).toEqual({ preview: "" });
    });
  });

  // ─── initTemplates ────────────────────────────────────────
  describe("initTemplates", () => {
    it("initializes default templates when none exist", async () => {
      selectResultsQueue.push([{ count: 0 }]); // existing count
      // 3 default template inserts
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      const result = await caller().webhook.initTemplates();
      expect(result.success).toBe(true);
      expect(result.message).toBe("默认模板已初始化");
    });

    it("skips initialization when templates already exist", async () => {
      selectResultsQueue.push([{ count: 3 }]); // already has templates
      const result = await caller().webhook.initTemplates();
      expect(result.success).toBe(true);
      expect(result.message).toBe("模板已存在");
    });
  });

  // ─── seedDefaultWebhooks ──────────────────────────────────
  describe("seedDefaultWebhooks", () => {
    it("seeds default webhook when none exist", async () => {
      selectResultsQueue.push([{ count: 0 }]); // existing count
      selectResultsQueue.push([]); // insert webhook
      const result = await caller().webhook.seedDefaultWebhooks();
      expect(result.success).toBe(true);
      expect(result.message).toBe("默认Webhook已初始化");
    });

    it("skips seeding when webhooks already exist", async () => {
      selectResultsQueue.push([{ count: 1 }]); // already has webhooks
      const result = await caller().webhook.seedDefaultWebhooks();
      expect(result.success).toBe(true);
      expect(result.message).toBe("Webhook已存在");
    });
  });

  // ─── Authentication guards ────────────────────────────────
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().webhook.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().webhook.getById({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().webhook.create({
        name: "test", type: "wecom", url: "https://example.com/hook",
      })).rejects.toThrow();
    });
    it("rejects anonymous for update", async () => {
      await expect(createAnonymousCaller().webhook.update({ id: "1", name: "test" })).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().webhook.delete({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for test", async () => {
      await expect(createAnonymousCaller().webhook.test({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for getLogs", async () => {
      await expect(createAnonymousCaller().webhook.getLogs()).rejects.toThrow();
    });
    it("rejects anonymous for toggle", async () => {
      await expect(createAnonymousCaller().webhook.toggle({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for getAll", async () => {
      await expect(createAnonymousCaller().webhook.getAll()).rejects.toThrow();
    });
    it("rejects anonymous for getStats", async () => {
      await expect(createAnonymousCaller().webhook.getStats()).rejects.toThrow();
    });
    it("rejects anonymous for sendAlert", async () => {
      await expect(createAnonymousCaller().webhook.sendAlert({
        level: "info", title: "t", description: "d", source: "s",
      })).rejects.toThrow();
    });
    it("rejects anonymous for sendMeetingReminder", async () => {
      await expect(createAnonymousCaller().webhook.sendMeetingReminder({
        id: "1", title: "t", startTime: "s", location: "l", organizer: "o", participants: [],
      })).rejects.toThrow();
    });
    it("rejects anonymous for getTemplates", async () => {
      await expect(createAnonymousCaller().webhook.getTemplates()).rejects.toThrow();
    });
    it("rejects anonymous for createTemplate", async () => {
      await expect(createAnonymousCaller().webhook.createTemplate({
        name: "t", eventType: "e", webhookType: "wecom", titleTemplate: "t", contentTemplate: "c",
      })).rejects.toThrow();
    });
    it("rejects anonymous for updateTemplate", async () => {
      await expect(createAnonymousCaller().webhook.updateTemplate({ id: "1", name: "t" })).rejects.toThrow();
    });
    it("rejects anonymous for deleteTemplate", async () => {
      await expect(createAnonymousCaller().webhook.deleteTemplate({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for previewTemplate", async () => {
      await expect(createAnonymousCaller().webhook.previewTemplate()).rejects.toThrow();
    });
    it("rejects anonymous for initTemplates", async () => {
      await expect(createAnonymousCaller().webhook.initTemplates()).rejects.toThrow();
    });
    it("rejects anonymous for seedDefaultWebhooks", async () => {
      await expect(createAnonymousCaller().webhook.seedDefaultWebhooks()).rejects.toThrow();
    });
  });
});
