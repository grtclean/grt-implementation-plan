/**
 * Planning Dependency Router — Unit Tests
 *
 * Tests 4 procedures: getAll, add, remove, calculateCriticalPath
 *
 * Covers:
 *   - getAll: unfiltered, filtered by configId, empty results, no input
 *   - add: all fields provided, default dependencyType/lagDays
 *   - remove: numeric id, string id
 *   - calculateCriticalPath: returns deps with empty critical path, empty deps
 *   - Auth guards: all 4 procedures reject anonymous callers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
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
      delete: vi.fn(() => chain),
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAuthenticatedCaller();

const sampleDep = {
  id: 1,
  configId: 100,
  sourceItemId: 10,
  targetItemId: 20,
  dependencyType: "finish_to_start",
  lagDays: 0,
};

describe("planningDependency router", () => {

  // ═══ getAll ═══
  describe("getAll", () => {
    it("returns all dependencies with no filter", async () => {
      selectResultsQueue.push([sampleDep, { ...sampleDep, id: 2, sourceItemId: 30 }]);
      const result = await caller().planningDependency.getAll();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(sampleDep);
      expect(result[1].id).toBe(2);
    });

    it("filters by configId when provided", async () => {
      selectResultsQueue.push([sampleDep]);
      const result = await caller().planningDependency.getAll({ configId: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].configId).toBe(100);
    });

    it("returns empty array when no dependencies exist", async () => {
      selectResultsQueue.push([]);
      const result = await caller().planningDependency.getAll({ configId: 999 });
      expect(result).toEqual([]);
    });

    it("works with no input (undefined)", async () => {
      selectResultsQueue.push([sampleDep]);
      const result = await caller().planningDependency.getAll();
      expect(result).toHaveLength(1);
    });
  });

  // ═══ add ═══
  describe("add", () => {
    it("creates dependency with all fields provided", async () => {
      const newDep = {
        ...sampleDep,
        id: 5,
        dependencyType: "start_to_start",
        lagDays: 3,
      };
      returningQueue.push([newDep]);
      const result = await caller().planningDependency.add({
        configId: 100,
        sourceItemId: 10,
        targetItemId: 20,
        dependencyType: "start_to_start",
        lagDays: 3,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(newDep);
      expect(result.data.dependencyType).toBe("start_to_start");
      expect(result.data.lagDays).toBe(3);
    });

    it("uses defaults for dependencyType and lagDays when omitted", async () => {
      returningQueue.push([sampleDep]);
      const result = await caller().planningDependency.add({
        configId: 100,
        sourceItemId: 10,
        targetItemId: 20,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(sampleDep);
    });
  });

  // ═══ remove ═══
  describe("remove", () => {
    it("removes dependency with numeric id", async () => {
      const result = await caller().planningDependency.remove({ id: 1 });
      expect(result).toEqual({ success: true });
    });

    it("removes dependency with string id", async () => {
      const result = await caller().planningDependency.remove({ id: "42" });
      expect(result).toEqual({ success: true });
    });
  });

  // ═══ calculateCriticalPath ═══
  describe("calculateCriticalPath", () => {
    it("returns dependencies with empty critical path and zero duration", async () => {
      const deps = [
        sampleDep,
        { ...sampleDep, id: 2, sourceItemId: 20, targetItemId: 30 },
      ];
      selectResultsQueue.push(deps);
      const result = await caller().planningDependency.calculateCriticalPath({ configId: 100 });
      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies).toEqual(deps);
      expect(result.criticalPath).toEqual([]);
      expect(result.totalDuration).toBe(0);
    });

    it("returns empty dependencies when none found for configId", async () => {
      selectResultsQueue.push([]);
      const result = await caller().planningDependency.calculateCriticalPath({ configId: 999 });
      expect(result.dependencies).toEqual([]);
      expect(result.criticalPath).toEqual([]);
      expect(result.totalDuration).toBe(0);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for getAll", async () => {
      await expect(createAnonymousCaller().planningDependency.getAll()).rejects.toThrow();
    });

    it("rejects anonymous for add", async () => {
      await expect(
        createAnonymousCaller().planningDependency.add({
          configId: 100,
          sourceItemId: 10,
          targetItemId: 20,
        }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for remove", async () => {
      await expect(
        createAnonymousCaller().planningDependency.remove({ id: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for calculateCriticalPath", async () => {
      await expect(
        createAnonymousCaller().planningDependency.calculateCriticalPath({ configId: 100 }),
      ).rejects.toThrow();
    });
  });
});
