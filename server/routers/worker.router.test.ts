/**
 * Worker Router — Unit Tests
 * Tests 8 procedures: getWorkers, getWorkerRanking, getWorkHourAlerts,
 *   createWorker, updateWorker, deleteWorker, acknowledgeAlert
 *
 * Standard DB-backed CRUD with client-side filtering.
 * getWorkerRanking sorts active workers by skill level and computes derived metrics.
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
      delete: vi.fn(() => chain),
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAuthenticatedCaller();

const sampleWorkers = [
  { id: 1, name: "张三", employeeCode: "W-001", department: "生产部", position: "焊工", skillLevel: "L4", status: "Active", phone: "13800001111", email: "z3@test.com" },
  { id: 2, name: "李四", employeeCode: "W-002", department: "质检部", position: "质检员", skillLevel: "L2", status: "Active", phone: "13800002222", email: "l4@test.com" },
  { id: 3, name: "王五", employeeCode: "W-003", department: "生产部", position: "操作工", skillLevel: "L3", status: "Inactive", phone: null, email: null },
];

describe("worker router", () => {

  // ═══ getWorkers ═══
  describe("getWorkers", () => {
    it("returns all workers", async () => {
      selectResultsQueue.push(sampleWorkers);
      const result = await caller().worker.getWorkers();
      expect(result.workers).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("filters by department", async () => {
      selectResultsQueue.push(sampleWorkers);
      const result = await caller().worker.getWorkers({ department: "生产部" });
      expect(result.workers).toHaveLength(2);
    });

    it("filters by status", async () => {
      selectResultsQueue.push(sampleWorkers);
      const result = await caller().worker.getWorkers({ status: "Active" });
      expect(result.workers).toHaveLength(2);
    });

    it("filters by skillLevel", async () => {
      selectResultsQueue.push(sampleWorkers);
      const result = await caller().worker.getWorkers({ skillLevel: "L4" });
      expect(result.workers).toHaveLength(1);
      expect(result.workers[0].name).toBe("张三");
    });

    it("filters by search term (name)", async () => {
      selectResultsQueue.push(sampleWorkers);
      const result = await caller().worker.getWorkers({ search: "张三" });
      expect(result.workers).toHaveLength(1);
    });

    it("filters by search term (employeeCode)", async () => {
      selectResultsQueue.push(sampleWorkers);
      const result = await caller().worker.getWorkers({ search: "W-002" });
      expect(result.workers).toHaveLength(1);
      expect(result.workers[0].name).toBe("李四");
    });

    it("returns empty when no matches", async () => {
      selectResultsQueue.push(sampleWorkers);
      const result = await caller().worker.getWorkers({ department: "不存在" });
      expect(result.workers).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("works with no input", async () => {
      selectResultsQueue.push([]);
      const result = await caller().worker.getWorkers();
      expect(result.workers).toEqual([]);
    });

    it("combines filters", async () => {
      selectResultsQueue.push(sampleWorkers);
      const result = await caller().worker.getWorkers({
        department: "生产部",
        status: "Active",
      });
      expect(result.workers).toHaveLength(1);
      expect(result.workers[0].name).toBe("张三");
    });
  });

  // ═══ getWorkerRanking ═══
  describe("getWorkerRanking", () => {
    it("returns active workers sorted by skill level", async () => {
      selectResultsQueue.push([sampleWorkers[0], sampleWorkers[1]]); // Active only
      const result = await caller().worker.getWorkerRanking();
      expect(result).toHaveLength(2);
      expect(result[0].rank).toBe(1);
      expect(result[0].skillLevel).toBe("L4"); // Higher skill first
      expect(result[1].rank).toBe(2);
    });

    it("computes derived metrics", async () => {
      selectResultsQueue.push([sampleWorkers[0]]); // L4 → index 3
      const result = await caller().worker.getWorkerRanking();
      expect(result[0].workerId).toBe(1);
      expect(result[0].workerName).toBe("张三");
      expect(result[0].avgEfficiency).toBe(100); // 85 + 3*5
      expect(result[0].totalTasks).toBe(34); // 10 + 3*8
      expect(result[0].avgQualityPassRate).toBe(96); // 90 + 3*2
      expect(result[0].totalReworkCount).toBe(2); // max(0, 5-3)
    });

    it("returns empty when no active workers", async () => {
      selectResultsQueue.push([]);
      const result = await caller().worker.getWorkerRanking();
      expect(result).toEqual([]);
    });
  });

  // ═══ getWorkHourAlerts ═══
  describe("getWorkHourAlerts", () => {
    it("returns empty array", async () => {
      const result = await caller().worker.getWorkHourAlerts();
      expect(result).toEqual([]);
    });
  });

  // ═══ createWorker ═══
  describe("createWorker", () => {
    it("creates worker with all fields", async () => {
      returningQueue.push([{ ...sampleWorkers[0], id: 10 }]);
      const result = await caller().worker.createWorker({
        employeeCode: "W-010",
        name: "新员工",
        department: "生产部",
        position: "操作工",
        skillLevel: "L3",
        phone: "13800009999",
        email: "new@test.com",
      });
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
    });

    it("creates worker with minimal fields", async () => {
      returningQueue.push([{ id: 11, name: "测试" }]);
      const result = await caller().worker.createWorker({ name: "测试" });
      expect(result.success).toBe(true);
    });

    it("rejects when name is empty", async () => {
      await expect(caller().worker.createWorker({ name: "" })).rejects.toThrow();
    });

    it("validates skillLevel enum", async () => {
      await expect(caller().worker.createWorker({
        name: "test",
        skillLevel: "L9" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ updateWorker ═══
  describe("updateWorker", () => {
    it("updates worker fields", async () => {
      returningQueue.push([{ ...sampleWorkers[0], name: "已更新" }]);
      const result = await caller().worker.updateWorker({
        id: 1,
        name: "已更新",
        skillLevel: "L5",
      });
      expect(result.success).toBe(true);
    });

    it("accepts string id", async () => {
      returningQueue.push([sampleWorkers[0]]);
      const result = await caller().worker.updateWorker({ id: "1", name: "test" });
      expect(result.success).toBe(true);
    });

    it("updates status", async () => {
      returningQueue.push([{ ...sampleWorkers[0], status: "Inactive" }]);
      const result = await caller().worker.updateWorker({ id: 1, status: "Inactive" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", async () => {
      await expect(caller().worker.updateWorker({
        id: 1,
        status: "Fired" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ deleteWorker ═══
  describe("deleteWorker", () => {
    it("deletes worker", async () => {
      const result = await caller().worker.deleteWorker({ id: "1" });
      expect(result.success).toBe(true);
      expect(result.message).toContain("已删除");
    });

    it("accepts numeric id", async () => {
      const result = await caller().worker.deleteWorker({ id: 1 });
      expect(result.success).toBe(true);
    });
  });

  // ═══ acknowledgeAlert ═══
  describe("acknowledgeAlert", () => {
    it("acknowledges alert", async () => {
      const result = await caller().worker.acknowledgeAlert({ id: 1 });
      expect(result.success).toBe(true);
      expect(result.message).toContain("已确认");
    });

    it("accepts string id", async () => {
      const result = await caller().worker.acknowledgeAlert({ id: "5" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for getWorkers", async () => {
      await expect(createAnonymousCaller().worker.getWorkers()).rejects.toThrow();
    });
    it("rejects anonymous for getWorkerRanking", async () => {
      await expect(createAnonymousCaller().worker.getWorkerRanking()).rejects.toThrow();
    });
    it("rejects anonymous for createWorker", async () => {
      await expect(createAnonymousCaller().worker.createWorker({ name: "x" })).rejects.toThrow();
    });
    it("rejects anonymous for deleteWorker", async () => {
      await expect(createAnonymousCaller().worker.deleteWorker({ id: 1 })).rejects.toThrow();
    });
  });
});
