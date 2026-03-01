/**
 * HR Lifecycle Router — Unit Tests
 * Tests 8 procedures: list, getById, create, update, delete,
 *   getStages, getEmployeeLifecycle, updateStage
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

describe("hr-lifecycle router", () => {
  describe("list", () => {
    it("returns empty list", async () => {
      const result = await caller().hrLifecycle.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getById", () => {
    it("returns null", async () => {
      const result = await caller().hrLifecycle.getById({ id: "1" });
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("returns success", async () => {
      const result = await caller().hrLifecycle.create({ employeeId: 1, stage: "onboarding", notes: "New hire" });
      expect(result.success).toBe(true);
    });
    it("accepts string employeeId", async () => {
      const result = await caller().hrLifecycle.create({ employeeId: "emp-1" });
      expect(result.success).toBe(true);
    });
  });

  describe("update", () => {
    it("returns success", async () => {
      const result = await caller().hrLifecycle.update({ id: "1", stage: "probation" });
      expect(result.success).toBe(true);
    });
  });

  describe("delete", () => {
    it("returns success", async () => {
      const result = await caller().hrLifecycle.delete({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  describe("getStages", () => {
    it("returns empty array", async () => {
      const result = await caller().hrLifecycle.getStages();
      expect(result).toEqual([]);
    });
  });

  describe("getEmployeeLifecycle", () => {
    it("returns null lifecycle", async () => {
      const result = await caller().hrLifecycle.getEmployeeLifecycle({ employeeId: 1 });
      expect(result.lifecycle).toBeNull();
    });
    it("accepts string employeeId", async () => {
      const result = await caller().hrLifecycle.getEmployeeLifecycle({ employeeId: "emp-1" });
      expect(result.lifecycle).toBeNull();
    });
  });

  describe("updateStage", () => {
    it("returns success", async () => {
      const result = await caller().hrLifecycle.updateStage({ lifecycleId: 1, stage: "confirmed" });
      expect(result.success).toBe(true);
    });
    it("accepts string lifecycleId", async () => {
      const result = await caller().hrLifecycle.updateStage({ lifecycleId: "1", stage: "confirmed" });
      expect(result.success).toBe(true);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().hrLifecycle.list()).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().hrLifecycle.create({ employeeId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().hrLifecycle.delete({ id: "1" })).rejects.toThrow();
    });
  });
});
