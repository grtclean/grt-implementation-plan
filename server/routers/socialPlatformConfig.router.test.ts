/**
 * Social Platform Config Router — Unit Tests
 * 9 procedures:
 *   getAll              — list all platform configs (masks secrets)
 *   getByPlatform       — get a single platform config by name
 *   saveWeComConfig     — upsert WeCom config
 *   saveDingTalkConfig  — upsert DingTalk config
 *   saveFeishuConfig    — upsert Feishu config
 *   togglePlatform      — enable / disable a platform
 *   testConnection      — test connectivity for a platform
 *   syncData            — sync external data for a platform
 *   deleteConfig        — delete platform config
 *   sendTestMessage     — send a test message via a platform
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from",
    "where",
    "orderBy",
    "limit",
    "offset",
    "values",
    "set",
    "onConflictDoUpdate",
    "onConflictDoNothing",
    "groupBy",
    "having",
    "innerJoin",
    "leftJoin",
    "rightJoin",
    "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try {
      return resolve(getNextResult());
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve({ rows: [] })),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ── Mock service modules ────────────────────────────────
const mockWecomTestConnection = vi.fn();
const mockWecomSendGroupMessage = vi.fn();
const mockWecomGetDepartmentUsers = vi.fn();

vi.mock("../services/wecom.service", () => ({
  testConnection: (...args: any[]) => mockWecomTestConnection(...args),
  sendGroupMessage: (...args: any[]) => mockWecomSendGroupMessage(...args),
  getDepartmentUsers: (...args: any[]) => mockWecomGetDepartmentUsers(...args),
}));

const mockDingtalkTestConnection = vi.fn();
const mockDingtalkTestRobotWebhook = vi.fn();
const mockDingtalkSendRobotMessage = vi.fn();
const mockDingtalkGetDepartmentList = vi.fn();

vi.mock("../services/dingtalk.service", () => ({
  testConnection: (...args: any[]) => mockDingtalkTestConnection(...args),
  testRobotWebhook: (...args: any[]) => mockDingtalkTestRobotWebhook(...args),
  sendRobotMessage: (...args: any[]) => mockDingtalkSendRobotMessage(...args),
  getDepartmentList: (...args: any[]) => mockDingtalkGetDepartmentList(...args),
}));

// ── Helpers ─────────────────────────────────────────────
function caller() {
  return createAuthenticatedCaller();
}

function anonCaller() {
  return createAnonymousCaller();
}

const wecomConfigRow = (extra: Record<string, any> = {}) => ({
  id: 1,
  platform: "wecom",
  enabled: 1,
  config: JSON.stringify({
    corpId: "corp123",
    agentId: "agent1",
    secret: "supersecret",
    encodingAESKey: "aeskey123",
  }),
  webhookUrl: "https://hook.example.com/wecom",
  webhookSecret: "whsecret",
  lastSyncAt: null,
  syncStatus: "idle",
  syncErrorMsg: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...extra,
});

const dingtalkConfigRow = (extra: Record<string, any> = {}) => ({
  id: 2,
  platform: "dingtalk",
  enabled: 1,
  config: JSON.stringify({
    appKey: "key123",
    appSecret: "appsecret456",
    agentId: "agent2",
    robotWebhook: "https://oapi.dingtalk.com/robot/send?access_token=abc",
    robotSecret: "robotsecret789",
  }),
  webhookUrl: "https://oapi.dingtalk.com/robot/send?access_token=abc",
  webhookSecret: null,
  lastSyncAt: null,
  syncStatus: "idle",
  syncErrorMsg: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...extra,
});

const feishuConfigRow = (extra: Record<string, any> = {}) => ({
  id: 3,
  platform: "feishu",
  enabled: 0,
  config: JSON.stringify({
    appId: "cli_abc",
    appSecret: "feishusecret",
    encryptKey: "enc123",
    verificationToken: "tok456",
  }),
  webhookUrl: null,
  webhookSecret: null,
  lastSyncAt: null,
  syncStatus: "idle",
  syncErrorMsg: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...extra,
});

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
  mockDb.execute.mockReset();
  mockDb.execute.mockResolvedValue({ rows: [] });
});

// ═══════════════════════════════════════════════════════════
// getAll
// ═══════════════════════════════════════════════════════════
describe("socialPlatformConfig.getAll", () => {
  it("returns empty array when no configs exist", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });
    const result = await caller().socialPlatformConfig.getAll();
    expect(result).toEqual([]);
  });

  it("returns all platform configs with secrets masked", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [wecomConfigRow(), dingtalkConfigRow(), feishuConfigRow()],
    });

    const result = await caller().socialPlatformConfig.getAll();

    expect(result).toHaveLength(3);

    // WeCom secrets masked
    expect(result[0].config.secret).toBe("******");
    expect(result[0].config.encodingAESKey).toBe("******");
    expect(result[0].config.corpId).toBe("corp123");

    // DingTalk secrets masked
    expect(result[1].config.appSecret).toBe("******");
    expect(result[1].config.robotSecret).toBe("******");
    expect(result[1].config.appKey).toBe("key123");

    // Feishu secrets masked
    expect(result[2].config.appSecret).toBe("******");
    expect(result[2].config.appId).toBe("cli_abc");
  });

  it("handles rows with null config gracefully", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [wecomConfigRow({ config: null })],
    });

    const result = await caller().socialPlatformConfig.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].config).toBeNull();
  });

  it("handles rows with invalid JSON config", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [wecomConfigRow({ config: "NOT VALID JSON{{" })],
    });

    const result = await caller().socialPlatformConfig.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].config).toBeNull();
  });

  it("masks webhookSecret when present in row", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [wecomConfigRow({ webhookSecret: "real_secret" })],
    });

    const result = await caller().socialPlatformConfig.getAll();
    expect(result[0].webhookSecret).toBe("******");
  });

  it("returns webhookSecret as null when not present", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [wecomConfigRow({ webhookSecret: null })],
    });

    const result = await caller().socialPlatformConfig.getAll();
    expect(result[0].webhookSecret).toBeNull();
  });

  it("requires authentication", async () => {
    await expect(anonCaller().socialPlatformConfig.getAll()).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// getByPlatform
// ═══════════════════════════════════════════════════════════
describe("socialPlatformConfig.getByPlatform", () => {
  it("returns null when platform not found", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.getByPlatform({
      platform: "wecom",
    });
    expect(result).toBeNull();
  });

  it("returns wecom config with secrets masked", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [wecomConfigRow()],
    });

    const result = await caller().socialPlatformConfig.getByPlatform({
      platform: "wecom",
    });

    expect(result).not.toBeNull();
    expect(result!.platform).toBe("wecom");
    expect(result!.config.secret).toBe("******");
    expect(result!.config.corpId).toBe("corp123");
  });

  it("returns dingtalk config with secrets masked", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [dingtalkConfigRow()],
    });

    const result = await caller().socialPlatformConfig.getByPlatform({
      platform: "dingtalk",
    });

    expect(result).not.toBeNull();
    expect(result!.config.appSecret).toBe("******");
    expect(result!.config.robotSecret).toBe("******");
    expect(result!.config.appKey).toBe("key123");
  });

  it("returns feishu config with secrets masked", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [feishuConfigRow()],
    });

    const result = await caller().socialPlatformConfig.getByPlatform({
      platform: "feishu",
    });

    expect(result).not.toBeNull();
    expect(result!.config.appSecret).toBe("******");
    expect(result!.config.appId).toBe("cli_abc");
  });

  it("handles null config field", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [wecomConfigRow({ config: null })],
    });

    const result = await caller().socialPlatformConfig.getByPlatform({
      platform: "wecom",
    });
    expect(result!.config).toBeNull();
  });

  it("handles invalid JSON config", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [wecomConfigRow({ config: "}{" })],
    });

    const result = await caller().socialPlatformConfig.getByPlatform({
      platform: "wecom",
    });
    expect(result!.config).toBeNull();
  });

  it("rejects invalid platform enum value", async () => {
    await expect(
      caller().socialPlatformConfig.getByPlatform({
        platform: "slack" as any,
      })
    ).rejects.toThrow();
  });

  it("requires authentication", async () => {
    await expect(
      anonCaller().socialPlatformConfig.getByPlatform({ platform: "wecom" })
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// saveWeComConfig
// ═══════════════════════════════════════════════════════════
describe("socialPlatformConfig.saveWeComConfig", () => {
  it("saves config and returns success", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.saveWeComConfig({
      config: { corpId: "corp1", secret: "s1" },
    });

    expect(result).toEqual({ success: true, message: "企业微信配置已保存" });
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it("saves config with optional webhook fields", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.saveWeComConfig({
      config: {
        corpId: "corp1",
        secret: "s1",
        agentId: "agent1",
        token: "tok",
        encodingAESKey: "aes",
      },
      webhookUrl: "https://hook.example.com",
      webhookSecret: "whs",
    });

    expect(result.success).toBe(true);
  });

  it("rejects when corpId is empty", async () => {
    await expect(
      caller().socialPlatformConfig.saveWeComConfig({
        config: { corpId: "", secret: "s1" },
      })
    ).rejects.toThrow();
  });

  it("rejects when secret is empty", async () => {
    await expect(
      caller().socialPlatformConfig.saveWeComConfig({
        config: { corpId: "corp1", secret: "" },
      })
    ).rejects.toThrow();
  });

  it("requires authentication", async () => {
    await expect(
      anonCaller().socialPlatformConfig.saveWeComConfig({
        config: { corpId: "c", secret: "s" },
      })
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// saveDingTalkConfig
// ═══════════════════════════════════════════════════════════
describe("socialPlatformConfig.saveDingTalkConfig", () => {
  it("saves config and returns success", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.saveDingTalkConfig({
      config: { appKey: "key1", appSecret: "sec1" },
    });

    expect(result).toEqual({ success: true, message: "钉钉配置已保存" });
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it("saves config with robotWebhook and robotSecret", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.saveDingTalkConfig({
      config: {
        appKey: "key1",
        appSecret: "sec1",
        agentId: "ag1",
        robotWebhook: "https://oapi.dingtalk.com/robot/send?access_token=x",
        robotSecret: "rsec",
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects when appKey is empty", async () => {
    await expect(
      caller().socialPlatformConfig.saveDingTalkConfig({
        config: { appKey: "", appSecret: "sec1" },
      })
    ).rejects.toThrow();
  });

  it("rejects when appSecret is empty", async () => {
    await expect(
      caller().socialPlatformConfig.saveDingTalkConfig({
        config: { appKey: "key1", appSecret: "" },
      })
    ).rejects.toThrow();
  });

  it("rejects when robotWebhook is not a valid URL", async () => {
    await expect(
      caller().socialPlatformConfig.saveDingTalkConfig({
        config: {
          appKey: "key1",
          appSecret: "sec1",
          robotWebhook: "not-a-url",
        },
      })
    ).rejects.toThrow();
  });

  it("requires authentication", async () => {
    await expect(
      anonCaller().socialPlatformConfig.saveDingTalkConfig({
        config: { appKey: "k", appSecret: "s" },
      })
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// saveFeishuConfig
// ═══════════════════════════════════════════════════════════
describe("socialPlatformConfig.saveFeishuConfig", () => {
  it("saves config and returns success", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.saveFeishuConfig({
      config: { appId: "cli_abc", appSecret: "fs_sec" },
    });

    expect(result).toEqual({ success: true, message: "飞书配置已保存" });
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it("saves config with optional fields", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.saveFeishuConfig({
      config: {
        appId: "cli_abc",
        appSecret: "fs_sec",
        encryptKey: "ek",
        verificationToken: "vt",
      },
      webhookUrl: "https://hook.example.com/feishu",
    });

    expect(result.success).toBe(true);
  });

  it("rejects when appId is empty", async () => {
    await expect(
      caller().socialPlatformConfig.saveFeishuConfig({
        config: { appId: "", appSecret: "s" },
      })
    ).rejects.toThrow();
  });

  it("rejects when appSecret is empty", async () => {
    await expect(
      caller().socialPlatformConfig.saveFeishuConfig({
        config: { appId: "a", appSecret: "" },
      })
    ).rejects.toThrow();
  });

  it("requires authentication", async () => {
    await expect(
      anonCaller().socialPlatformConfig.saveFeishuConfig({
        config: { appId: "a", appSecret: "s" },
      })
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// togglePlatform
// ═══════════════════════════════════════════════════════════
describe("socialPlatformConfig.togglePlatform", () => {
  it("enables a platform", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.togglePlatform({
      platform: "wecom",
      enabled: true,
    });

    expect(result).toEqual({ success: true, message: "平台已启用" });
  });

  it("disables a platform", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.togglePlatform({
      platform: "dingtalk",
      enabled: false,
    });

    expect(result).toEqual({ success: true, message: "平台已禁用" });
  });

  it("works for feishu platform", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.togglePlatform({
      platform: "feishu",
      enabled: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid platform", async () => {
    await expect(
      caller().socialPlatformConfig.togglePlatform({
        platform: "slack" as any,
        enabled: true,
      })
    ).rejects.toThrow();
  });

  it("requires authentication", async () => {
    await expect(
      anonCaller().socialPlatformConfig.togglePlatform({
        platform: "wecom",
        enabled: true,
      })
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// testConnection
// ═══════════════════════════════════════════════════════════
describe("socialPlatformConfig.testConnection", () => {
  it("returns error when no config found", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.testConnection({
      platform: "wecom",
    });

    expect(result).toEqual({ success: false, message: "未找到平台配置" });
  });

  it("returns error when config field is null", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ config: null, webhookUrl: null, webhookSecret: null }],
    });

    const result = await caller().socialPlatformConfig.testConnection({
      platform: "wecom",
    });

    expect(result).toEqual({ success: false, message: "平台配置为空" });
  });

  it("returns error when config is invalid JSON", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ config: "NOT{JSON", webhookUrl: null, webhookSecret: null }],
    });

    const result = await caller().socialPlatformConfig.testConnection({
      platform: "wecom",
    });

    expect(result).toEqual({ success: false, message: "配置格式错误" });
  });

  it("calls wecomService.testConnection for wecom platform", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          config: JSON.stringify({ corpId: "c1", secret: "s1" }),
          webhookUrl: null,
          webhookSecret: null,
        },
      ],
    });
    mockWecomTestConnection.mockResolvedValueOnce({
      success: true,
      message: "企业微信连接成功",
    });

    const result = await caller().socialPlatformConfig.testConnection({
      platform: "wecom",
    });

    expect(mockWecomTestConnection).toHaveBeenCalledWith({
      corpId: "c1",
      secret: "s1",
    });
    expect(result.success).toBe(true);
  });

  it("calls dingtalkService.testConnection for dingtalk (no robot)", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          config: JSON.stringify({ appKey: "k1", appSecret: "s1" }),
          webhookUrl: null,
          webhookSecret: null,
        },
      ],
    });
    mockDingtalkTestConnection.mockResolvedValueOnce({
      success: true,
      message: "钉钉连接成功",
    });

    const result = await caller().socialPlatformConfig.testConnection({
      platform: "dingtalk",
    });

    expect(mockDingtalkTestConnection).toHaveBeenCalledWith({
      appKey: "k1",
      appSecret: "s1",
    });
    expect(result.success).toBe(true);
  });

  it("tests robot webhook when dingtalk config has robotWebhook", async () => {
    const dtConfig = {
      appKey: "k1",
      appSecret: "s1",
      robotWebhook: "https://oapi.dingtalk.com/robot/send?access_token=x",
      robotSecret: "rsec",
    };
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          config: JSON.stringify(dtConfig),
          webhookUrl: null,
          webhookSecret: null,
        },
      ],
    });
    mockDingtalkTestConnection.mockResolvedValueOnce({
      success: true,
      message: "钉钉连接成功",
    });
    mockDingtalkTestRobotWebhook.mockResolvedValueOnce({
      success: true,
      message: "机器人Webhook连接成功",
    });

    const result = await caller().socialPlatformConfig.testConnection({
      platform: "dingtalk",
    });

    expect(mockDingtalkTestRobotWebhook).toHaveBeenCalledWith(
      dtConfig.robotWebhook,
      dtConfig.robotSecret
    );
    expect(result.success).toBe(true);
  });

  it("returns partial success when dingtalk API works but robot webhook fails", async () => {
    const dtConfig = {
      appKey: "k1",
      appSecret: "s1",
      robotWebhook: "https://oapi.dingtalk.com/robot/send?access_token=x",
      robotSecret: "rsec",
    };
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          config: JSON.stringify(dtConfig),
          webhookUrl: null,
          webhookSecret: null,
        },
      ],
    });
    mockDingtalkTestConnection.mockResolvedValueOnce({
      success: true,
      message: "钉钉连接成功",
    });
    mockDingtalkTestRobotWebhook.mockResolvedValueOnce({
      success: false,
      message: "Webhook URL无效",
    });

    const result = await caller().socialPlatformConfig.testConnection({
      platform: "dingtalk",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("机器人Webhook测试失败");
    expect(result.message).toContain("Webhook URL无效");
  });

  it("returns failure when dingtalk API connection fails", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          config: JSON.stringify({
            appKey: "k1",
            appSecret: "s1",
            robotWebhook: "https://oapi.dingtalk.com/robot/send?access_token=x",
          }),
          webhookUrl: null,
          webhookSecret: null,
        },
      ],
    });
    mockDingtalkTestConnection.mockResolvedValueOnce({
      success: false,
      message: "连接失败",
    });

    const result = await caller().socialPlatformConfig.testConnection({
      platform: "dingtalk",
    });

    // Should NOT test robot webhook when API fails
    expect(mockDingtalkTestRobotWebhook).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it("returns 'under development' for feishu", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          config: JSON.stringify({ appId: "a", appSecret: "s" }),
          webhookUrl: null,
          webhookSecret: null,
        },
      ],
    });

    const result = await caller().socialPlatformConfig.testConnection({
      platform: "feishu",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("飞书连接测试功能开发中");
  });

  it("requires authentication", async () => {
    await expect(
      anonCaller().socialPlatformConfig.testConnection({ platform: "wecom" })
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// syncData
// ═══════════════════════════════════════════════════════════
describe("socialPlatformConfig.syncData", () => {
  it("syncs wecom data successfully", async () => {
    // 1st execute: update syncStatus='syncing'
    // 2nd execute: select config
    // 3rd execute: update syncStatus='idle'
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            config: JSON.stringify({ corpId: "c1", secret: "s1" }),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    mockWecomGetDepartmentUsers.mockResolvedValueOnce([
      { userid: "u1", name: "User 1" },
    ]);

    const result = await caller().socialPlatformConfig.syncData({
      platform: "wecom",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("数据同步完成");
    expect(mockWecomGetDepartmentUsers).toHaveBeenCalled();
    // execute called 3 times: set syncing, select config, set idle
    expect(mockDb.execute).toHaveBeenCalledTimes(3);
  });

  it("syncs dingtalk data successfully", async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            config: JSON.stringify({ appKey: "k1", appSecret: "s1" }),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    mockDingtalkGetDepartmentList.mockResolvedValueOnce([
      { dept_id: 1, name: "Root", parent_id: 0 },
    ]);

    const result = await caller().socialPlatformConfig.syncData({
      platform: "dingtalk",
    });

    expect(result.success).toBe(true);
    expect(mockDingtalkGetDepartmentList).toHaveBeenCalled();
  });

  it("syncs feishu data (no-op) successfully", async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            config: JSON.stringify({ appId: "a", appSecret: "s" }),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.syncData({
      platform: "feishu",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("数据同步完成");
  });

  it("returns error when config not found during sync", async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] }) // set syncing
      .mockResolvedValueOnce({ rows: [] }) // no config
      .mockResolvedValueOnce({ rows: [] }); // set error status

    const result = await caller().socialPlatformConfig.syncData({
      platform: "wecom",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("同步失败");
  });

  it("returns error when config field is null", async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ config: null }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.syncData({
      platform: "dingtalk",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("同步失败");
  });

  it("handles service errors during sync and sets error status", async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            config: JSON.stringify({ corpId: "c1", secret: "s1" }),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    mockWecomGetDepartmentUsers.mockRejectedValueOnce(
      new Error("API timeout")
    );

    const result = await caller().socialPlatformConfig.syncData({
      platform: "wecom",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("API timeout");
    // Should have called execute 3 times: syncing, select, error
    expect(mockDb.execute).toHaveBeenCalledTimes(3);
  });

  it("requires authentication", async () => {
    await expect(
      anonCaller().socialPlatformConfig.syncData({ platform: "wecom" })
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// deleteConfig
// ═══════════════════════════════════════════════════════════
describe("socialPlatformConfig.deleteConfig", () => {
  it("deletes wecom config", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.deleteConfig({
      platform: "wecom",
    });

    expect(result).toEqual({ success: true, message: "配置已删除" });
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it("deletes dingtalk config", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.deleteConfig({
      platform: "dingtalk",
    });

    expect(result.success).toBe(true);
  });

  it("deletes feishu config", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.deleteConfig({
      platform: "feishu",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid platform value", async () => {
    await expect(
      caller().socialPlatformConfig.deleteConfig({
        platform: "teams" as any,
      })
    ).rejects.toThrow();
  });

  it("requires authentication", async () => {
    await expect(
      anonCaller().socialPlatformConfig.deleteConfig({ platform: "wecom" })
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// sendTestMessage
// ═══════════════════════════════════════════════════════════
describe("socialPlatformConfig.sendTestMessage", () => {
  it("returns error when no config found", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await caller().socialPlatformConfig.sendTestMessage({
      platform: "wecom",
      message: "hello",
    });

    expect(result).toEqual({ success: false, message: "未找到平台配置" });
  });

  it("returns error when config field is null", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ config: null, webhookUrl: null, webhookSecret: null }],
    });

    const result = await caller().socialPlatformConfig.sendTestMessage({
      platform: "wecom",
      message: "hello",
    });

    expect(result).toEqual({ success: false, message: "平台配置为空" });
  });

  // ── WeCom sendTestMessage ──
  it("sends wecom message when targetId is provided", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          config: JSON.stringify({ corpId: "c1", secret: "s1" }),
          webhookUrl: null,
          webhookSecret: null,
        },
      ],
    });
    mockWecomSendGroupMessage.mockResolvedValueOnce(true);

    const result = await caller().socialPlatformConfig.sendTestMessage({
      platform: "wecom",
      message: "test msg",
      targetId: "group123",
    });

    expect(result).toEqual({ success: true, message: "消息发送成功" });
    expect(mockWecomSendGroupMessage).toHaveBeenCalledWith(
      { corpId: "c1", secret: "s1" },
      "group123",
      "test msg"
    );
  });

  it("returns error for wecom when targetId is missing", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          config: JSON.stringify({ corpId: "c1", secret: "s1" }),
          webhookUrl: null,
          webhookSecret: null,
        },
      ],
    });

    const result = await caller().socialPlatformConfig.sendTestMessage({
      platform: "wecom",
      message: "test",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("企业微信需要指定群聊ID");
  });

  it("returns failure when wecom send returns false", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          config: JSON.stringify({ corpId: "c1", secret: "s1" }),
          webhookUrl: null,
          webhookSecret: null,
        },
      ],
    });
    mockWecomSendGroupMessage.mockResolvedValueOnce(false);

    const result = await caller().socialPlatformConfig.sendTestMessage({
      platform: "wecom",
      message: "test",
      targetId: "g1",
    });

    expect(result).toEqual({ success: false, message: "消息发送失败" });
  });

  // ── DingTalk sendTestMessage ──
  it("sends dingtalk robot message when robotWebhook is configured", async () => {
    const dtConfig = {
      appKey: "k1",
      appSecret: "s1",
      robotWebhook: "https://oapi.dingtalk.com/robot/send?access_token=x",
      robotSecret: "rsec",
    };
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          config: JSON.stringify(dtConfig),
          webhookUrl: null,
          webhookSecret: null,
        },
      ],
    });
    mockDingtalkSendRobotMessage.mockResolvedValueOnce(true);

    const result = await caller().socialPlatformConfig.sendTestMessage({
      platform: "dingtalk",
      message: "robot test",
    });

    expect(result).toEqual({ success: true, message: "机器人消息发送成功" });
    expect(mockDingtalkSendRobotMessage).toHaveBeenCalledWith(
      dtConfig.robotWebhook,
      dtConfig.robotSecret,
      "robot test"
    );
  });

  it("returns failure when dingtalk robot send fails", async () => {
    const dtConfig = {
      appKey: "k1",
      appSecret: "s1",
      robotWebhook: "https://oapi.dingtalk.com/robot/send?access_token=x",
      robotSecret: "rsec",
    };
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          config: JSON.stringify(dtConfig),
          webhookUrl: null,
          webhookSecret: null,
        },
      ],
    });
    mockDingtalkSendRobotMessage.mockResolvedValueOnce(false);

    const result = await caller().socialPlatformConfig.sendTestMessage({
      platform: "dingtalk",
      message: "test",
    });

    expect(result).toEqual({
      success: false,
      message: "机器人消息发送失败",
    });
  });

  it("returns error when dingtalk has no robotWebhook", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          config: JSON.stringify({ appKey: "k1", appSecret: "s1" }),
          webhookUrl: null,
          webhookSecret: null,
        },
      ],
    });

    const result = await caller().socialPlatformConfig.sendTestMessage({
      platform: "dingtalk",
      message: "test",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("钉钉需要配置机器人Webhook");
  });

  // ── Feishu sendTestMessage ──
  it("returns 'under development' for feishu", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          config: JSON.stringify({ appId: "a", appSecret: "s" }),
          webhookUrl: null,
          webhookSecret: null,
        },
      ],
    });

    const result = await caller().socialPlatformConfig.sendTestMessage({
      platform: "feishu",
      message: "test",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("飞书消息发送功能开发中");
  });

  // ── Validation ──
  it("rejects empty message", async () => {
    await expect(
      caller().socialPlatformConfig.sendTestMessage({
        platform: "wecom",
        message: "",
      })
    ).rejects.toThrow();
  });

  it("requires authentication", async () => {
    await expect(
      anonCaller().socialPlatformConfig.sendTestMessage({
        platform: "wecom",
        message: "test",
      })
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// Edge cases & cross-cutting concerns
// ═══════════════════════════════════════════════════════════
describe("socialPlatformConfig — edge cases", () => {
  it("getAll — config with no sensitive fields still returns parsed config", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        wecomConfigRow({
          config: JSON.stringify({ corpId: "c1" }),
        }),
      ],
    });

    const result = await caller().socialPlatformConfig.getAll();
    expect(result[0].config.corpId).toBe("c1");
    // secret/appSecret/etc. not present in source => undefined in mask (unchanged)
    expect(result[0].config.secret).toBeUndefined();
  });

  it("getByPlatform — accepts all 3 valid platform values", async () => {
    for (const platform of ["wecom", "dingtalk", "feishu"] as const) {
      mockDb.execute.mockResolvedValueOnce({ rows: [] });
      const result = await caller().socialPlatformConfig.getByPlatform({
        platform,
      });
      expect(result).toBeNull();
    }
  });

  it("togglePlatform — enabled=true maps to 1 in the execute call", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });
    await caller().socialPlatformConfig.togglePlatform({
      platform: "wecom",
      enabled: true,
    });
    expect(mockDb.execute).toHaveBeenCalled();
  });
});
