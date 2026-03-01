/**
 * Notification Channel Test Router — Unit Tests
 * Tests 7 procedures: list, getById, create, update, delete,
 *   testChannel, getTestHistory
 *
 * All stubs returning static responses. No DB access.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

beforeEach(() => { vi.clearAllMocks(); });
const caller = () => createAuthenticatedCaller();

describe("notification-channel-test router", () => {
  describe("list", () => {
    it("returns empty list", async () => {
      const result = await caller().notificationChannelTest.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getById", () => {
    it("returns null", async () => {
      const result = await caller().notificationChannelTest.getById({ id: "1" });
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("returns success", async () => {
      const result = await caller().notificationChannelTest.create({ channelType: "email", name: "Test Email", config: { smtp: "localhost" } });
      expect(result.success).toBe(true);
    });
    it("works with minimal input", async () => {
      const result = await caller().notificationChannelTest.create({});
      expect(result.success).toBe(true);
    });
  });

  describe("update", () => {
    it("returns success", async () => {
      const result = await caller().notificationChannelTest.update({ id: "1", name: "Updated" });
      expect(result.success).toBe(true);
    });
  });

  describe("delete", () => {
    it("returns success", async () => {
      const result = await caller().notificationChannelTest.delete({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  describe("testChannel", () => {
    it("returns success with channel id and message", async () => {
      const result = await caller().notificationChannelTest.testChannel({ channelId: 1, message: "Test msg" });
      expect(result.success).toBe(true);
    });
    it("accepts string channelId", async () => {
      const result = await caller().notificationChannelTest.testChannel({ channelId: "1" });
      expect(result.success).toBe(true);
    });
    it("works with no input", async () => {
      const result = await caller().notificationChannelTest.testChannel({});
      expect(result.success).toBe(true);
    });
  });

  describe("getTestHistory", () => {
    it("returns empty array", async () => {
      const result = await caller().notificationChannelTest.getTestHistory();
      expect(result).toEqual([]);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().notificationChannelTest.list()).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().notificationChannelTest.create({})).rejects.toThrow();
    });
    it("rejects anonymous for testChannel", async () => {
      await expect(createAnonymousCaller().notificationChannelTest.testChannel({})).rejects.toThrow();
    });
  });
});
