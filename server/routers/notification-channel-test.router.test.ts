/**
 * Notification Channel Test Router — Unit Tests
 * Tests 7 procedures: list, getById, create, update, delete,
 *   testChannel, getTestHistory
 *
 * Uses in-memory store — state accumulates across tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

beforeEach(() => { vi.clearAllMocks(); });
const caller = () => createAdminCaller();

describe("notification-channel-test router", () => {
  describe("list", () => {
    it("returns list with items array and total", async () => {
      const result = await caller().notificationChannelTest.list();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe("getById", () => {
    it("returns null for non-existent id", async () => {
      const result = await caller().notificationChannelTest.getById({ id: "99999" });
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("returns success with required fields", async () => {
      const result = await caller().notificationChannelTest.create({ channelType: "email", name: "Test Email", config: { smtp: "localhost" } });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe("Test Email");
    });
    it("works with name and channelType only", async () => {
      const result = await caller().notificationChannelTest.create({ name: "Minimal", channelType: "webhook" });
      expect(result.success).toBe(true);
    });
    it("rejects empty input", async () => {
      await expect(caller().notificationChannelTest.create({} as any)).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("returns success for existing channel", async () => {
      const created = await caller().notificationChannelTest.create({ name: "ToUpdate", channelType: "dingtalk" });
      const result = await caller().notificationChannelTest.update({ id: created.data.id, name: "Updated" });
      expect(result.success).toBe(true);
      expect(result.data.name).toBe("Updated");
    });
    it("throws for non-existent channel", async () => {
      await expect(caller().notificationChannelTest.update({ id: "99999", name: "X" })).rejects.toThrow();
    });
  });

  describe("delete", () => {
    it("returns success for existing channel", async () => {
      const created = await caller().notificationChannelTest.create({ name: "ToDelete", channelType: "email" });
      const result = await caller().notificationChannelTest.delete({ id: created.data.id });
      expect(result.success).toBe(true);
    });
    it("throws for non-existent channel", async () => {
      await expect(caller().notificationChannelTest.delete({ id: "99999" })).rejects.toThrow();
    });
  });

  describe("testChannel", () => {
    it("returns success for channel with webhookUrl", async () => {
      const created = await caller().notificationChannelTest.create({ name: "WebhookCh", channelType: "webhook", webhookUrl: "https://example.com/hook" });
      const result = await caller().notificationChannelTest.testChannel({ channelId: created.data.id, message: "Test msg" });
      expect(result.success).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
    });
    it("returns failure for channel without webhookUrl", async () => {
      const created = await caller().notificationChannelTest.create({ name: "NoUrl", channelType: "email" });
      const result = await caller().notificationChannelTest.testChannel({ channelId: created.data.id });
      expect(result.success).toBe(false);
    });
    it("throws for non-existent channel", async () => {
      await expect(caller().notificationChannelTest.testChannel({ channelId: "99999" })).rejects.toThrow();
    });
  });

  describe("getTestHistory", () => {
    it("returns array", async () => {
      const result = await caller().notificationChannelTest.getTestHistory();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().notificationChannelTest.list()).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().notificationChannelTest.create({ name: "X", channelType: "email" })).rejects.toThrow();
    });
    it("rejects anonymous for testChannel", async () => {
      await expect(createAnonymousCaller().notificationChannelTest.testChannel({ channelId: "1" })).rejects.toThrow();
    });
  });
});
