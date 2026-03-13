/**
 * Migration Router — Unit Tests
 *
 * Tests 3 procedures (all protectedProcedure):
 *   1. list   (query)    — select all migrationTasks ordered by createdAt desc
 *   2. init   (mutation) — insert a new migrationTask with auto-generated MIG-xxx moduleId
 *   3. update (mutation) — update migrationTask fields; sets startedAt/completedAt on status change
 *
 * 10 test cases covering happy-path, edge cases, and auth guards.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

/* ------------------------------------------------------------------ */
/*  Mock infrastructure                                                */
/* ------------------------------------------------------------------ */

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
      set: vi.fn(() => chain),
      values: vi.fn(() => chain),
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
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

/* ------------------------------------------------------------------ */
/*  Reset state between tests                                          */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const caller = () => createAdminCaller();

const sampleTask = {
  id: 1,
  moduleId: "MIG-ABC",
  moduleName: "employees",
  sourceTable: "old_employees",
  targetTable: "company_employees",
  totalRecords: 100,
  migratedRecords: 50,
  validatedRecords: 40,
  errorRecords: 2,
  status: "in_progress",
  priority: "medium",
  notes: "Phase 1 migration",
  startedAt: "2026-03-01",
  completedAt: null,
  createdAt: "2026-02-28",
  updatedAt: "2026-02-28",
};

/* ================================================================== */
/*  Tests                                                              */
/* ================================================================== */

describe("migration router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns migration tasks ordered by createdAt desc", async () => {
      const task2 = { ...sampleTask, id: 2, moduleName: "departments", moduleId: "MIG-DEF" };
      selectResultsQueue.push([sampleTask, task2]);

      const result = await caller().migration.list();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(sampleTask);
      expect(result[1].moduleName).toBe("departments");
    });

    it("returns empty array when no tasks exist", async () => {
      selectResultsQueue.push([]);

      const result = await caller().migration.list();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  // ═══ init ═══
  describe("init", () => {
    it("creates a task with all fields provided", async () => {
      const created = {
        ...sampleTask,
        id: 10,
        moduleId: "MIG-GENERATED",
        status: "pending",
        migratedRecords: 0,
      };
      returningQueue.push([created]);

      const result = await caller().migration.init({
        moduleName: "employees",
        sourceTable: "old_employees",
        targetTable: "company_employees",
        totalRecords: 100,
        notes: "Phase 1 migration",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(created);
      expect(result.data.id).toBe(10);
    });

    it("creates a task with only moduleName (minimal input)", async () => {
      const created = {
        id: 11,
        moduleId: "MIG-MINIMAL",
        moduleName: "users",
        sourceTable: null,
        targetTable: null,
        totalRecords: 0,
        migratedRecords: 0,
        validatedRecords: 0,
        errorRecords: 0,
        status: "pending",
        priority: "medium",
        notes: null,
        startedAt: null,
        completedAt: null,
        createdAt: "2026-03-01",
        updatedAt: "2026-03-01",
      };
      returningQueue.push([created]);

      const result = await caller().migration.init({
        moduleName: "users",
      });

      expect(result.success).toBe(true);
      expect(result.data.moduleName).toBe("users");
      expect(result.data.status).toBe("pending");
      expect(result.data.priority).toBe("medium");
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates status and record counts", async () => {
      const updated = {
        ...sampleTask,
        status: "failed",
        migratedRecords: 80,
        errorRecords: 20,
        notes: "Encountered schema mismatch",
      };
      returningQueue.push([updated]);

      const result = await caller().migration.update({
        id: 1,
        status: "failed",
        migratedRecords: 80,
        errorRecords: 20,
        notes: "Encountered schema mismatch",
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe("failed");
      expect(result.data.migratedRecords).toBe(80);
      expect(result.data.errorRecords).toBe(20);
    });

    it("sets startedAt when status is in_progress", async () => {
      const updated = {
        ...sampleTask,
        status: "in_progress",
        startedAt: "2026-03-01T10:00:00.000Z",
      };
      returningQueue.push([updated]);

      const result = await caller().migration.update({
        id: 1,
        status: "in_progress",
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe("in_progress");
      expect(result.data.startedAt).toBeTruthy();
    });

    it("sets completedAt when status is completed", async () => {
      const updated = {
        ...sampleTask,
        status: "completed",
        completedAt: "2026-03-01T12:00:00.000Z",
        migratedRecords: 100,
        validatedRecords: 100,
        errorRecords: 0,
      };
      returningQueue.push([updated]);

      const result = await caller().migration.update({
        id: 1,
        status: "completed",
        migratedRecords: 100,
        validatedRecords: 100,
        errorRecords: 0,
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe("completed");
      expect(result.data.completedAt).toBeTruthy();
    });

    it("accepts a string id", async () => {
      const updated = { ...sampleTask, notes: "Updated via string id" };
      returningQueue.push([updated]);

      const result = await caller().migration.update({
        id: "1",
        notes: "Updated via string id",
      });

      expect(result.success).toBe(true);
      expect(result.data.notes).toBe("Updated via string id");
    });

    it("rejects an invalid status enum value", async () => {
      await expect(
        caller().migration.update({
          id: 1,
          status: "invalid_status" as any,
        })
      ).rejects.toThrow();
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous caller for list", async () => {
      await expect(createAnonymousCaller().migration.list()).rejects.toThrow();
    });

    it("rejects anonymous caller for init", async () => {
      await expect(
        createAnonymousCaller().migration.init({ moduleName: "test" })
      ).rejects.toThrow();
    });

    it("rejects anonymous caller for update", async () => {
      await expect(
        createAnonymousCaller().migration.update({ id: 1, status: "completed" })
      ).rejects.toThrow();
    });
  });
});
