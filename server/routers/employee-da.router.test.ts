/**
 * Employee DA Router — Unit Tests
 * Tests 10 procedures: list, listFunctional, getById, create, update,
 *   delete, toggleStatus, getMyDA, chat, getHistory
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

describe("employee-da router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns empty array", async () => {
      const result = await caller().employeeDA.list();
      expect(result).toEqual([]);
    });
  });

  // ═══ listFunctional ═══
  describe("listFunctional", () => {
    it("returns empty array", async () => {
      const result = await caller().employeeDA.listFunctional();
      expect(result).toEqual([]);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns null", async () => {
      const result = await caller().employeeDA.getById({ id: "1" });
      expect(result).toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("returns success with all fields", async () => {
      const result = await caller().employeeDA.create({
        name: "我的DA",
        type: "personal",
        employeeId: "emp-1",
        displayName: "测试助手",
        workHabits: "早起",
        preferences: "简洁",
        expertise: "技术",
        communicationStyle: "正式",
        canTaskAssist: true,
        canScheduleManage: true,
        canDocumentDraft: false,
        canDataAnalysis: true,
        canCommunicationProxy: false,
      });
      expect(result.success).toBe(true);
    });

    it("returns success with minimal input", async () => {
      const result = await caller().employeeDA.create({});
      expect(result.success).toBe(true);
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("returns success", async () => {
      const result = await caller().employeeDA.update({
        id: "1",
        name: "已更新",
        canTaskAssist: true,
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("returns success", async () => {
      const result = await caller().employeeDA.delete({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ toggleStatus ═══
  describe("toggleStatus", () => {
    it("returns success with string id", async () => {
      const result = await caller().employeeDA.toggleStatus({ id: "1" });
      expect(result.success).toBe(true);
    });

    it("returns success with numeric id", async () => {
      const result = await caller().employeeDA.toggleStatus({ id: 1 });
      expect(result.success).toBe(true);
    });
  });

  // ═══ getMyDA ═══
  describe("getMyDA", () => {
    it("returns null da", async () => {
      const result = await caller().employeeDA.getMyDA();
      expect(result.da).toBeNull();
    });
  });

  // ═══ chat ═══
  describe("chat", () => {
    it("returns empty response", async () => {
      const result = await caller().employeeDA.chat({
        message: "你好",
        sessionId: "s-1",
      });
      expect(result.response).toBe("");
    });

    it("works with no message", async () => {
      const result = await caller().employeeDA.chat({});
      expect(result.response).toBe("");
    });
  });

  // ═══ getHistory ═══
  describe("getHistory", () => {
    it("returns empty array", async () => {
      const result = await caller().employeeDA.getHistory();
      expect(result).toEqual([]);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().employeeDA.list()).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().employeeDA.create({})).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().employeeDA.delete({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for toggleStatus", async () => {
      await expect(createAnonymousCaller().employeeDA.toggleStatus({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for getMyDA", async () => {
      await expect(createAnonymousCaller().employeeDA.getMyDA()).rejects.toThrow();
    });
    it("rejects anonymous for chat", async () => {
      await expect(createAnonymousCaller().employeeDA.chat({})).rejects.toThrow();
    });
  });
});
