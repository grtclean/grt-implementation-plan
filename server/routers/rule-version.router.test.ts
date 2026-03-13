/**
 * Rule Version Router — Unit Tests
 * Tests 8 procedures: list, getById, create, update, delete,
 *   getAll, compare, rollback
 *
 * All stubs returning static responses. No DB access.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

beforeEach(() => { vi.clearAllMocks(); });

const caller = () => createAdminCaller();

describe("rule-version router", () => {

  describe("list", () => {
    it("returns empty list", async () => {
      const result = await caller().ruleVersion.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getById", () => {
    it("returns null", async () => {
      const result = await caller().ruleVersion.getById({ id: "1" });
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("returns success with fields", async () => {
      const result = await caller().ruleVersion.create({
        ruleId: 1,
        versionNumber: 2,
        description: "Updated threshold",
      });
      expect(result.success).toBe(true);
    });

    it("returns success with minimal input", async () => {
      const result = await caller().ruleVersion.create({});
      expect(result.success).toBe(true);
    });

    it("accepts string ruleId", async () => {
      const result = await caller().ruleVersion.create({ ruleId: "5" });
      expect(result.success).toBe(true);
    });
  });

  describe("update", () => {
    it("returns success", async () => {
      const result = await caller().ruleVersion.update({
        id: 1,
        description: "Changed",
        status: "active",
      });
      expect(result.success).toBe(true);
    });

    it("accepts string id", async () => {
      const result = await caller().ruleVersion.update({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  describe("delete", () => {
    it("returns success", async () => {
      const result = await caller().ruleVersion.delete({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  describe("getAll", () => {
    it("returns empty array", async () => {
      const result = await caller().ruleVersion.getAll();
      expect(result).toEqual([]);
    });
  });

  describe("compare", () => {
    it("returns null comparison", async () => {
      const result = await caller().ruleVersion.compare({ versionA: 1, versionB: 2 });
      expect(result.comparison).toBeNull();
    });

    it("accepts string version ids", async () => {
      const result = await caller().ruleVersion.compare({ versionA: "1", versionB: "2" });
      expect(result.comparison).toBeNull();
    });
  });

  describe("rollback", () => {
    it("returns success", async () => {
      const result = await caller().ruleVersion.rollback({ ruleId: 1, versionNumber: 1 });
      expect(result.success).toBe(true);
    });

    it("accepts string ruleId", async () => {
      const result = await caller().ruleVersion.rollback({ ruleId: "5", versionNumber: 2 });
      expect(result.success).toBe(true);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().ruleVersion.list()).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().ruleVersion.create({})).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().ruleVersion.delete({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for compare", async () => {
      await expect(createAnonymousCaller().ruleVersion.compare({ versionA: 1, versionB: 2 })).rejects.toThrow();
    });
    it("rejects anonymous for rollback", async () => {
      await expect(createAnonymousCaller().ruleVersion.rollback({ ruleId: 1, versionNumber: 1 })).rejects.toThrow();
    });
  });
});
