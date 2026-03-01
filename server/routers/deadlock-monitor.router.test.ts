/**
 * Deadlock Monitor Router — Unit Tests
 * Tests 9 procedures: list, getById, create, update, delete,
 *   getStatus, getDeadlocks, resolveDeadlock, getHistory
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

describe("deadlock-monitor router", () => {

  describe("list", () => {
    it("returns empty list", async () => {
      const result = await caller().deadlockMonitor.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getById", () => {
    it("returns null", async () => {
      const result = await caller().deadlockMonitor.getById({ id: "1" });
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("returns success with fields", async () => {
      const result = await caller().deadlockMonitor.create({
        name: "DB Lock Monitor",
        resourceType: "database",
        threshold: 30,
      });
      expect(result.success).toBe(true);
    });

    it("returns success with no input", async () => {
      const result = await caller().deadlockMonitor.create({});
      expect(result.success).toBe(true);
    });
  });

  describe("update", () => {
    it("returns success", async () => {
      const result = await caller().deadlockMonitor.update({
        id: "1",
        name: "Updated",
        threshold: 60,
        isActive: false,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("delete", () => {
    it("returns success", async () => {
      const result = await caller().deadlockMonitor.delete({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  describe("getStatus", () => {
    it("returns ok status", async () => {
      const result = await caller().deadlockMonitor.getStatus();
      expect(result.status).toBe("ok");
    });
  });

  describe("getDeadlocks", () => {
    it("returns empty array", async () => {
      const result = await caller().deadlockMonitor.getDeadlocks();
      expect(result).toEqual([]);
    });
  });

  describe("resolveDeadlock", () => {
    it("returns success with string id", async () => {
      const result = await caller().deadlockMonitor.resolveDeadlock({ id: "1", resolution: "Force killed" });
      expect(result.success).toBe(true);
    });

    it("returns success with numeric id", async () => {
      const result = await caller().deadlockMonitor.resolveDeadlock({ id: 1 });
      expect(result.success).toBe(true);
    });
  });

  describe("getHistory", () => {
    it("returns empty array", async () => {
      const result = await caller().deadlockMonitor.getHistory();
      expect(result).toEqual([]);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().deadlockMonitor.list()).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().deadlockMonitor.create({})).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().deadlockMonitor.delete({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for getStatus", async () => {
      await expect(createAnonymousCaller().deadlockMonitor.getStatus()).rejects.toThrow();
    });
    it("rejects anonymous for resolveDeadlock", async () => {
      await expect(createAnonymousCaller().deadlockMonitor.resolveDeadlock({ id: "1" })).rejects.toThrow();
    });
  });
});
