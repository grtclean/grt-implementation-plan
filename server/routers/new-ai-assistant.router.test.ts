/**
 * New AI Assistant Router — Unit Tests
 * Tests 10 procedures: list, getById, create, update, delete,
 *   chat, getConfig, getStats, getActiveFunctionalAssistants, getEmployeeDA
 *
 * All stubs returning static responses. No DB access.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

beforeEach(() => {
  vi.clearAllMocks();
});

const caller = () => createAuthenticatedCaller();

describe("new-ai-assistant router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns empty list", async () => {
      const result = await caller().newAiAssistant.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns null", async () => {
      const result = await caller().newAiAssistant.getById({ id: "1" });
      expect(result).toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("returns success with all fields", async () => {
      const result = await caller().newAiAssistant.create({
        name: "测试助手",
        type: "functional",
        config: { key: "value" },
        displayName: "Test",
      });
      expect(result.success).toBe(true);
    });

    it("returns success with minimal input", async () => {
      const result = await caller().newAiAssistant.create({});
      expect(result.success).toBe(true);
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("returns success", async () => {
      const result = await caller().newAiAssistant.update({
        id: "1",
        name: "已更新",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("returns success", async () => {
      const result = await caller().newAiAssistant.delete({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ chat ═══
  describe("chat", () => {
    it("returns empty response", async () => {
      const result = await caller().newAiAssistant.chat({
        message: "你好",
        sessionId: "s-1",
      });
      expect(result.response).toBe("");
    });

    it("works with no input", async () => {
      const result = await caller().newAiAssistant.chat({});
      expect(result.response).toBe("");
    });
  });

  // ═══ getConfig ═══
  describe("getConfig", () => {
    it("returns null config", async () => {
      const result = await caller().newAiAssistant.getConfig();
      expect(result.config).toBeNull();
    });
  });

  // ═══ getStats ═══
  describe("getStats", () => {
    it("returns zero stats", async () => {
      const result = await caller().newAiAssistant.getStats();
      expect(result.employeeDigitalAssistants).toBe(0);
      expect(result.functionalAssistants).toBe(0);
      expect(result.totalSuggestions).toBe(0);
    });
  });

  // ═══ getActiveFunctionalAssistants ═══
  describe("getActiveFunctionalAssistants", () => {
    it("returns empty array", async () => {
      const result = await caller().newAiAssistant.getActiveFunctionalAssistants();
      expect(result).toEqual([]);
    });
  });

  // ═══ getEmployeeDA ═══
  describe("getEmployeeDA", () => {
    it("returns null", async () => {
      const result = await caller().newAiAssistant.getEmployeeDA({ employeeId: "emp-1" });
      expect(result).toBeNull();
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().newAiAssistant.list()).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().newAiAssistant.create({})).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().newAiAssistant.delete({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for chat", async () => {
      await expect(createAnonymousCaller().newAiAssistant.chat({})).rejects.toThrow();
    });
    it("rejects anonymous for getStats", async () => {
      await expect(createAnonymousCaller().newAiAssistant.getStats()).rejects.toThrow();
    });
  });
});
