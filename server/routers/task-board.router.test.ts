/**
 * Task Board Router — Unit Tests
 * Tests 11 procedures: list, kanban, getById, create, update, moveStatus,
 * delete, batchUpdateStatus, getStats, getMyTasks, getCountsByProjects
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
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
      offset: vi.fn(() => chain),
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
    const db: any = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      transaction: vi.fn(async (cb: any) => cb(db)),
    };
    return db;
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  inArray: vi.fn((...a: any[]) => a),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();

const sampleTask = {
  id: 1, taskCode: "TSK-ABC", projectId: 10, milestoneId: null,
  phaseCode: "M3", parentTaskId: null, name: "Design motor assembly",
  description: "Complete motor asm drawing", type: "task", priority: "high",
  status: "in_progress", assigneeId: 1,
  plannedStartDate: "2026-01-15", plannedEndDate: "2026-02-15",
  actualStartDate: "2026-01-16", actualEndDate: null,
  estimatedHours: 40, actualHours: 25, completionPercent: 60,
  acceptanceCriteria: "Drawing reviewed", taskCategory: null,
  safetyChecklistCompleted: false,
  createdAt: "2026-01-01", updatedAt: "2026-01-16",
};

describe("task-board router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns all tasks", async () => {
      selectResultsQueue.push([sampleTask, { ...sampleTask, id: 2 }]);
      const result = await caller().taskBoard.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([sampleTask, { ...sampleTask, id: 2, projectId: 20 }]);
      const result = await caller().taskBoard.list({ projectId: 10 });
      expect(result.items).toHaveLength(1);
    });

    it("filters by status", async () => {
      selectResultsQueue.push([sampleTask, { ...sampleTask, id: 2, status: "done" }]);
      const result = await caller().taskBoard.list({ status: "in_progress" });
      expect(result.items).toHaveLength(1);
    });

    it("filters by multiple criteria", async () => {
      selectResultsQueue.push([
        sampleTask,
        { ...sampleTask, id: 2, priority: "low" },
        { ...sampleTask, id: 3, assigneeId: 5 },
      ]);
      const result = await caller().taskBoard.list({
        priority: "high", assigneeId: 1,
      });
      expect(result.items).toHaveLength(1);
    });

    it("returns empty when no match", async () => {
      selectResultsQueue.push([]);
      const result = await caller().taskBoard.list();
      expect(result.total).toBe(0);
    });
  });

  // ═══ kanban ═══
  describe("kanban", () => {
    it("groups tasks by status", async () => {
      selectResultsQueue.push([
        { ...sampleTask, status: "backlog" },
        { ...sampleTask, id: 2, status: "todo" },
        { ...sampleTask, id: 3, status: "in_progress" },
        { ...sampleTask, id: 4, status: "review" },
        { ...sampleTask, id: 5, status: "done" },
      ]);
      const result = await caller().taskBoard.kanban();
      expect(result.backlog).toHaveLength(1);
      expect(result.todo).toHaveLength(1);
      expect(result.in_progress).toHaveLength(1);
      expect(result.review).toHaveLength(1);
      expect(result.done).toHaveLength(1);
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([
        { ...sampleTask, status: "todo", projectId: 10 },
        { ...sampleTask, id: 2, status: "todo", projectId: 20 },
      ]);
      const result = await caller().taskBoard.kanban({ projectId: 10 });
      expect(result.todo).toHaveLength(1);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns task with project and subtasks", async () => {
      selectResultsQueue.push([sampleTask]); // task
      selectResultsQueue.push([{ name: "Project A", projectCode: "PRJ-A" }]); // project
      selectResultsQueue.push([{ ...sampleTask, id: 10, parentTaskId: 1 }]); // subtasks
      const result = await caller().taskBoard.getById({ id: 1 });
      expect(result).toBeTruthy();
      expect(result!.name).toBe("Design motor assembly");
      expect(result!.project).toHaveProperty("name", "Project A");
      expect(result!.subtasks).toHaveLength(1);
    });

    it("returns null for missing task", async () => {
      selectResultsQueue.push([]); // not found
      const result = await caller().taskBoard.getById({ id: 999 });
      expect(result).toBeNull();
    });

    it("handles task without projectId", async () => {
      selectResultsQueue.push([{ ...sampleTask, projectId: null }]); // task with no project
      selectResultsQueue.push([]); // subtasks
      const result = await caller().taskBoard.getById({ id: 1 });
      expect(result!.project).toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates a task with generated code", async () => {
      returningQueue.push([{ ...sampleTask, id: 5, taskCode: "TSK-NEW" }]);
      const result = await caller().taskBoard.create({
        projectId: 10, name: "New Task",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("taskCode");
    });

    it("passes all optional fields", async () => {
      returningQueue.push([{ ...sampleTask, id: 6 }]);
      const result = await caller().taskBoard.create({
        projectId: 10, name: "Full Task", milestoneId: 1,
        phaseCode: "M3", parentTaskId: 1, description: "Desc",
        type: "issue", priority: "critical", assigneeId: 2,
        plannedStartDate: "2026-03-01", plannedEndDate: "2026-04-01",
        estimatedHours: 20, acceptanceCriteria: "All tests pass",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", async () => {
      await expect(caller().taskBoard.create({
        projectId: 10, name: "",
      })).rejects.toThrow();
    });

    it("rejects invalid type", async () => {
      await expect(caller().taskBoard.create({
        projectId: 10, name: "X", type: "invalid" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates task fields", async () => {
      returningQueue.push([{ ...sampleTask, priority: "critical" }]);
      const result = await caller().taskBoard.update({
        id: 1, priority: "critical",
      });
      expect(result.success).toBe(true);
    });

    it("auto-sets actualStartDate on in_progress", async () => {
      returningQueue.push([{ ...sampleTask, status: "in_progress", actualStartDate: "2026-03-01" }]);
      const result = await caller().taskBoard.update({
        id: 1, status: "in_progress",
      });
      expect(result.success).toBe(true);
    });

    it("auto-sets actualEndDate and completionPercent on done", async () => {
      returningQueue.push([{ ...sampleTask, status: "done", completionPercent: 100 }]);
      const result = await caller().taskBoard.update({
        id: 1, status: "done",
      });
      expect(result.success).toBe(true);
    });

    it("returns failure when task not found", async () => {
      returningQueue.push([]);
      const result = await caller().taskBoard.update({ id: 999, name: "X" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid status", async () => {
      await expect(caller().taskBoard.update({
        id: 1, status: "invalid" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ moveStatus ═══
  describe("moveStatus", () => {
    it("moves task to new status", async () => {
      selectResultsQueue.push([]); // update chain
      const result = await caller().taskBoard.moveStatus({ id: 1, status: "review" });
      expect(result.success).toBe(true);
    });

    it("blocks field_service task done without safety checklist", async () => {
      selectResultsQueue.push([{ ...sampleTask, taskCategory: "field_service", safetyChecklistCompleted: false }]);
      await expect(caller().taskBoard.moveStatus({ id: 1, status: "done" }))
        .rejects.toThrow(/安全检查清单/);
    });

    it("allows field_service task done with safety checklist completed", async () => {
      selectResultsQueue.push([{ ...sampleTask, taskCategory: "field_service", safetyChecklistCompleted: true }]);
      selectResultsQueue.push([]); // update chain
      const result = await caller().taskBoard.moveStatus({ id: 1, status: "done" });
      expect(result.success).toBe(true);
    });

    it("allows non-field_service task done without checklist", async () => {
      selectResultsQueue.push([{ ...sampleTask, taskCategory: "engineering" }]);
      selectResultsQueue.push([]); // update chain
      const result = await caller().taskBoard.moveStatus({ id: 1, status: "done" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes task and subtasks", async () => {
      selectResultsQueue.push([]); // delete subtasks
      selectResultsQueue.push([]); // delete task
      const result = await caller().taskBoard.delete({ id: 1 });
      expect(result).toEqual({ success: true, message: "任务已删除" });
    });
  });

  // ═══ batchUpdateStatus ═══
  describe("batchUpdateStatus", () => {
    it("updates multiple tasks via single inArray update", async () => {
      // Single update with inArray (no loop)
      selectResultsQueue.push([]);
      const result = await caller().taskBoard.batchUpdateStatus({
        ids: [1, 2, 3], status: "done",
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("3");
    });
  });

  // ═══ getStats ═══
  describe("getStats", () => {
    it("returns aggregated stats", async () => {
      selectResultsQueue.push([
        { ...sampleTask, status: "in_progress", type: "task", priority: "high", estimatedHours: 40, actualHours: 25, completionPercent: 60 },
        { ...sampleTask, id: 2, status: "done", type: "issue", priority: "critical", estimatedHours: 10, actualHours: 12, completionPercent: 100 },
        { ...sampleTask, id: 3, status: "backlog", type: "task", priority: "low", estimatedHours: 20, actualHours: 0, completionPercent: 0 },
      ]);
      const result = await caller().taskBoard.getStats();
      expect(result.total).toBe(3);
      expect(result.byStatus.in_progress).toBe(1);
      expect(result.byStatus.done).toBe(1);
      expect(result.byStatus.backlog).toBe(1);
      expect(result.byType.task).toBe(2);
      expect(result.byType.issue).toBe(1);
      expect(result.byPriority.critical).toBe(1);
      expect(result.totalEstimatedHours).toBe(70);
      expect(result.totalActualHours).toBe(37);
      expect(result.averageCompletion).toBe(53); // round((60+100+0)/3)
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([sampleTask, { ...sampleTask, id: 2, projectId: 20 }]);
      const result = await caller().taskBoard.getStats({ projectId: 10 });
      expect(result.total).toBe(1);
    });

    it("returns zeros when empty", async () => {
      selectResultsQueue.push([]);
      const result = await caller().taskBoard.getStats();
      expect(result.total).toBe(0);
      expect(result.averageCompletion).toBe(0);
    });
  });

  // ═══ getMyTasks ═══
  describe("getMyTasks", () => {
    it("returns tasks for assignee", async () => {
      selectResultsQueue.push([sampleTask, { ...sampleTask, id: 2 }]);
      const result = await caller().taskBoard.getMyTasks({ assigneeId: 1 });
      expect(result).toHaveLength(2);
    });

    it("filters by status", async () => {
      selectResultsQueue.push([sampleTask, { ...sampleTask, id: 2, status: "done" }]);
      const result = await caller().taskBoard.getMyTasks({ assigneeId: 1, status: "in_progress" });
      expect(result).toHaveLength(1);
    });
  });

  // ═══ getCountsByProjects ═══
  describe("getCountsByProjects", () => {
    it("returns counts per project", async () => {
      selectResultsQueue.push([
        { ...sampleTask, projectId: 10, status: "in_progress", plannedEndDate: "2025-01-01" }, // overdue
        { ...sampleTask, id: 2, projectId: 10, status: "done", plannedEndDate: "2025-01-01" }, // done, not overdue
        { ...sampleTask, id: 3, projectId: 20, status: "todo", plannedEndDate: "2099-01-01" }, // future
      ]);
      const result = await caller().taskBoard.getCountsByProjects({ projectIds: [10, 20] });
      expect(result[10].total).toBe(2);
      expect(result[10].overdue).toBe(1);
      expect(result[20].total).toBe(1);
      expect(result[20].overdue).toBe(0);
    });

    it("returns empty for no projectIds", async () => {
      const result = await caller().taskBoard.getCountsByProjects({ projectIds: [] });
      expect(result).toEqual({});
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().taskBoard.list()).rejects.toThrow();
    });
    it("rejects anonymous for kanban", async () => {
      await expect(createAnonymousCaller().taskBoard.kanban()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().taskBoard.getById({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().taskBoard.create({
        projectId: 1, name: "X",
      })).rejects.toThrow();
    });
    it("rejects anonymous for update", async () => {
      await expect(createAnonymousCaller().taskBoard.update({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for moveStatus", async () => {
      await expect(createAnonymousCaller().taskBoard.moveStatus({
        id: 1, status: "done",
      })).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().taskBoard.delete({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for batchUpdateStatus", async () => {
      await expect(createAnonymousCaller().taskBoard.batchUpdateStatus({
        ids: [1], status: "done",
      })).rejects.toThrow();
    });
    it("rejects anonymous for getStats", async () => {
      await expect(createAnonymousCaller().taskBoard.getStats()).rejects.toThrow();
    });
    it("rejects anonymous for getMyTasks", async () => {
      await expect(createAnonymousCaller().taskBoard.getMyTasks({ assigneeId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for getCountsByProjects", async () => {
      await expect(createAnonymousCaller().taskBoard.getCountsByProjects({
        projectIds: [1],
      })).rejects.toThrow();
    });
  });
});
