/**
 * Task Cockpit Router — Unit Tests
 * Tests 8 procedures: getTasksForCockpit, startTimer, stopTimer,
 * getActiveSession, checkPrerequisites, completeTask, seedPrerequisites,
 * setSafetyChecklistComplete
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
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();

const sampleTask = {
  id: 1, projectId: 10, title: "Install sensors", taskCategory: "milestone",
  phaseCode: "M5", status: "in_progress", assigneeId: 1,
  safetyChecklistCompleted: false, actualHours: 0,
  updatedAt: "2026-01-01",
};

const sampleSession = {
  id: 1, taskId: 1, projectId: 10, userId: 1,
  startedAt: "2026-02-28T10:00:00Z", isActive: true,
  endedAt: null, durationMin: null,
};

describe("task-cockpit router", () => {

  // ═══ getTasksForCockpit ═══
  describe("getTasksForCockpit", () => {
    it("groups tasks by category", async () => {
      selectResultsQueue.push([
        { ...sampleTask, taskCategory: "milestone" },
        { ...sampleTask, id: 2, taskCategory: "approval" },
        { ...sampleTask, id: 3, taskCategory: "field_service" },
        { ...sampleTask, id: 4, taskCategory: "hr_training" },
        { ...sampleTask, id: 5, taskCategory: null },
      ]);
      const result = await caller().taskCockpit.getTasksForCockpit({ projectId: 10 });
      expect(result.milestone).toHaveLength(1);
      expect(result.approval).toHaveLength(1);
      expect(result.field_service).toHaveLength(1);
      expect(result.hr_training).toHaveLength(1);
      expect(result.other).toHaveLength(1);
    });

    it("filters by assigneeId", async () => {
      selectResultsQueue.push([
        { ...sampleTask, assigneeId: 1 },
        { ...sampleTask, id: 2, assigneeId: 2 },
      ]);
      const result = await caller().taskCockpit.getTasksForCockpit({ projectId: 10, assigneeId: 1 });
      expect(result.milestone).toHaveLength(1);
    });

    it("returns empty groups when no tasks", async () => {
      selectResultsQueue.push([]);
      const result = await caller().taskCockpit.getTasksForCockpit({ projectId: 10 });
      expect(result.milestone).toEqual([]);
      expect(result.other).toEqual([]);
    });
  });

  // ═══ startTimer ═══
  describe("startTimer", () => {
    it("starts a new timer session", async () => {
      selectResultsQueue.push([]); // no active sessions
      returningQueue.push([{ ...sampleSession, id: 5 }]);
      const result = await caller().taskCockpit.startTimer({ taskId: 1, projectId: 10 });
      expect(result.success).toBe(true);
      expect(result.session).toHaveProperty("id", 5);
    });

    it("closes active sessions before starting new", async () => {
      selectResultsQueue.push([sampleSession]); // active session exists
      selectResultsQueue.push([]); // update close
      returningQueue.push([{ ...sampleSession, id: 6 }]);
      const result = await caller().taskCockpit.startTimer({ taskId: 2, projectId: 10 });
      expect(result.success).toBe(true);
    });

    it("handles string taskId", async () => {
      selectResultsQueue.push([]);
      returningQueue.push([{ ...sampleSession, id: 7 }]);
      const result = await caller().taskCockpit.startTimer({ taskId: "3", projectId: 10 });
      expect(result.success).toBe(true);
    });
  });

  // ═══ stopTimer ═══
  describe("stopTimer", () => {
    it("stops active timer and updates task hours", async () => {
      selectResultsQueue.push([sampleSession]); // session lookup
      selectResultsQueue.push([]); // update session
      selectResultsQueue.push([sampleTask]); // task lookup
      selectResultsQueue.push([]); // update task hours
      const result = await caller().taskCockpit.stopTimer({ sessionId: 1 });
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("durationMin");
    });

    it("returns failure for non-existent session", async () => {
      selectResultsQueue.push([]); // not found
      const result = await caller().taskCockpit.stopTimer({ sessionId: 999 });
      expect(result.success).toBe(false);
      expect(result.message).toContain("不存在");
    });

    it("returns failure for already stopped session", async () => {
      selectResultsQueue.push([{ ...sampleSession, isActive: false }]);
      const result = await caller().taskCockpit.stopTimer({ sessionId: 1 });
      expect(result.success).toBe(false);
      expect(result.message).toContain("已停止");
    });
  });

  // ═══ getActiveSession ═══
  describe("getActiveSession", () => {
    it("returns active session", async () => {
      selectResultsQueue.push([sampleSession]);
      const result = await caller().taskCockpit.getActiveSession();
      expect(result).toHaveProperty("isActive", true);
    });

    it("returns null when no active session", async () => {
      selectResultsQueue.push([]);
      const result = await caller().taskCockpit.getActiveSession();
      expect(result).toBeNull();
    });
  });

  // ═══ checkPrerequisites ═══
  describe("checkPrerequisites", () => {
    it("returns canComplete=false for missing task", async () => {
      selectResultsQueue.push([]); // task not found
      const result = await caller().taskCockpit.checkPrerequisites({ taskId: 999 });
      expect(result.canComplete).toBe(false);
      expect(result.blockers).toHaveLength(1);
    });

    it("returns canComplete=true for task with no prerequisites", async () => {
      selectResultsQueue.push([{ ...sampleTask, taskCategory: null, phaseCode: null }]);
      const result = await caller().taskCockpit.checkPrerequisites({ taskId: 1 });
      expect(result.canComplete).toBe(true);
      expect(result.blockers).toEqual([]);
    });

    it("blocks field_service without safety checklist", async () => {
      selectResultsQueue.push([{ ...sampleTask, taskCategory: "field_service", safetyChecklistCompleted: false }]);
      // no rules (taskCategory+phaseCode won't match anything since no queue entry for rules)
      selectResultsQueue.push([]); // rules query
      const result = await caller().taskCockpit.checkPrerequisites({ taskId: 1 });
      expect(result.canComplete).toBe(false);
      expect(result.blockers.some((b: any) => b.message.includes("安全检查"))).toBe(true);
    });

    it("passes field_service with safety checklist completed", async () => {
      selectResultsQueue.push([{ ...sampleTask, taskCategory: "field_service", safetyChecklistCompleted: true }]);
      selectResultsQueue.push([]); // no rules
      const result = await caller().taskCockpit.checkPrerequisites({ taskId: 1 });
      expect(result.canComplete).toBe(true);
    });

    it("checks field_value prerequisite rule", async () => {
      selectResultsQueue.push([{ ...sampleTask, taskCategory: "field_service", phaseCode: "M10", safetyChecklistCompleted: false }]);
      selectResultsQueue.push([{
        checkType: "field_value", requiredColumnName: "safety_checklist_completed",
        severity: "hard", errorMessage: "安全检查未完成", taskType: "field_service",
        phaseCode: "M10", isActive: true,
      }]); // rules
      const result = await caller().taskCockpit.checkPrerequisites({ taskId: 1 });
      expect(result.canComplete).toBe(false);
    });

    it("checks task_status prerequisite rule", async () => {
      selectResultsQueue.push([{ ...sampleTask, taskCategory: "production", phaseCode: "M5", projectId: 10 }]);
      selectResultsQueue.push([{
        checkType: "task_status", requiredTaskType: "milestone", requiredTaskStatus: "done",
        severity: "hard", errorMessage: "设计评审未完成", taskType: "production",
        phaseCode: "M5", isActive: true,
      }]); // rules
      selectResultsQueue.push([]); // related tasks — none found → not all done
      const result = await caller().taskCockpit.checkPrerequisites({ taskId: 1 });
      expect(result.canComplete).toBe(false);
    });

    it("adds gate_checklist as warning", async () => {
      selectResultsQueue.push([{ ...sampleTask, taskCategory: "shipping", phaseCode: "M8" }]);
      selectResultsQueue.push([{
        checkType: "gate_checklist", requiredGateStage: "M7",
        severity: "soft", errorMessage: "FAT验收门禁",
        taskType: "shipping", phaseCode: "M8", isActive: true,
      }]);
      const result = await caller().taskCockpit.checkPrerequisites({ taskId: 1 });
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain("待门径集成");
    });
  });

  // ═══ completeTask ═══
  describe("completeTask", () => {
    it("completes a normal task", async () => {
      selectResultsQueue.push([{ ...sampleTask, taskCategory: "milestone" }]);
      selectResultsQueue.push([]); // update
      const result = await caller().taskCockpit.completeTask({ taskId: 1 });
      expect(result.success).toBe(true);
    });

    it("returns failure for non-existent task", async () => {
      selectResultsQueue.push([]);
      const result = await caller().taskCockpit.completeTask({ taskId: 999 });
      expect(result.success).toBe(false);
    });

    it("throws for field_service without safety checklist", async () => {
      selectResultsQueue.push([{ ...sampleTask, taskCategory: "field_service", safetyChecklistCompleted: false }]);
      await expect(caller().taskCockpit.completeTask({ taskId: 1 })).rejects.toThrow("安全检查");
    });

    it("allows field_service with completed safety checklist", async () => {
      selectResultsQueue.push([{ ...sampleTask, taskCategory: "field_service", safetyChecklistCompleted: true }]);
      selectResultsQueue.push([]); // update
      const result = await caller().taskCockpit.completeTask({ taskId: 1 });
      expect(result.success).toBe(true);
    });
  });

  // ═══ seedPrerequisites ═══
  describe("seedPrerequisites", () => {
    it("skips when rules exist", async () => {
      selectResultsQueue.push([{ id: 1 }]); // existing rules
      const result = await caller().taskCockpit.seedPrerequisites();
      expect(result.success).toBe(true);
      expect(result.message).toContain("跳过");
    });

    it("seeds rules when empty", async () => {
      selectResultsQueue.push([]); // no existing
      selectResultsQueue.push([]); // insert
      const result = await caller().taskCockpit.seedPrerequisites();
      expect(result.success).toBe(true);
      expect(result.count).toBe(5);
    });
  });

  // ═══ setSafetyChecklistComplete ═══
  describe("setSafetyChecklistComplete", () => {
    it("sets safety checklist to completed", async () => {
      const result = await caller().taskCockpit.setSafetyChecklistComplete({
        taskId: 1, completed: true,
      });
      expect(result.success).toBe(true);
    });

    it("handles string taskId", async () => {
      const result = await caller().taskCockpit.setSafetyChecklistComplete({
        taskId: "5", completed: false,
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for getTasksForCockpit", async () => {
      await expect(createAnonymousCaller().taskCockpit.getTasksForCockpit({ projectId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for startTimer", async () => {
      await expect(createAnonymousCaller().taskCockpit.startTimer({ taskId: 1, projectId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for stopTimer", async () => {
      await expect(createAnonymousCaller().taskCockpit.stopTimer({ sessionId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for getActiveSession", async () => {
      await expect(createAnonymousCaller().taskCockpit.getActiveSession()).rejects.toThrow();
    });
    it("rejects anonymous for checkPrerequisites", async () => {
      await expect(createAnonymousCaller().taskCockpit.checkPrerequisites({ taskId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for completeTask", async () => {
      await expect(createAnonymousCaller().taskCockpit.completeTask({ taskId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for seedPrerequisites", async () => {
      await expect(createAnonymousCaller().taskCockpit.seedPrerequisites()).rejects.toThrow();
    });
    it("rejects anonymous for setSafetyChecklistComplete", async () => {
      await expect(createAnonymousCaller().taskCockpit.setSafetyChecklistComplete({ taskId: 1, completed: true })).rejects.toThrow();
    });
  });
});
