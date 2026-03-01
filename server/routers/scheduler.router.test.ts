/**
 * Scheduler Router — Comprehensive Vitest Test Suite
 *
 * Covers all 5 procedures (service-delegated):
 *   - getStatus    (query)    — returns all scheduled tasks with their status
 *   - setEnabled   (mutation) — enable/disable a named task
 *   - trigger      (mutation) — manually trigger a named task
 *   - updateCron   (mutation) — change the cron expression for a task
 *   - checkAndRun  (mutation) — check and execute all due tasks
 *
 * Mock strategy: vi.mock("../services/scheduler.service") with hoisted fns.
 *
 * Run: npx vitest run server/routers/scheduler.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock functions (must come before any import that resolves the module)
// ---------------------------------------------------------------------------

const {
  mockGetScheduledTasksStatus,
  mockSetTaskEnabled,
  mockTriggerTask,
  mockUpdateTaskCron,
  mockCheckAndRunScheduledTasks,
} = vi.hoisted(() => ({
  mockGetScheduledTasksStatus: vi.fn(() => [
    { name: "delayPrediction", cron: "0 */6 * * *", enabled: true, lastRun: "2026-03-01T00:00:00Z" },
    { name: "reportGeneration", cron: "0 8 * * 1", enabled: false, lastRun: null },
  ]),
  mockSetTaskEnabled: vi.fn(() => true),
  mockTriggerTask: vi.fn(async () => ({ success: true, message: "任务已执行" })),
  mockUpdateTaskCron: vi.fn(() => true),
  mockCheckAndRunScheduledTasks: vi.fn(async () => ({ executed: 2, skipped: 1 })),
}));

vi.mock("../services/scheduler.service", () => ({
  getScheduledTasksStatus: mockGetScheduledTasksStatus,
  setTaskEnabled: mockSetTaskEnabled,
  triggerTask: mockTriggerTask,
  updateTaskCron: mockUpdateTaskCron,
  checkAndRunScheduledTasks: mockCheckAndRunScheduledTasks,
}));

// ---------------------------------------------------------------------------
// Import test utilities AFTER mocks are registered
// ---------------------------------------------------------------------------

import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// =========================================================================
// Reset mocks before each test
// =========================================================================

beforeEach(() => {
  vi.clearAllMocks();
});

// =========================================================================
// 1. getStatus — query: returns all scheduled task statuses
// =========================================================================

describe("scheduler.getStatus", () => {
  it("returns the tasks status array from the service", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.scheduler.getStatus();

    expect(mockGetScheduledTasksStatus).toHaveBeenCalledOnce();
    expect(result).toEqual([
      { name: "delayPrediction", cron: "0 */6 * * *", enabled: true, lastRun: "2026-03-01T00:00:00Z" },
      { name: "reportGeneration", cron: "0 8 * * 1", enabled: false, lastRun: null },
    ]);
  });

  it("returns an empty array when no tasks are registered", async () => {
    mockGetScheduledTasksStatus.mockReturnValueOnce([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.scheduler.getStatus();

    expect(result).toEqual([]);
    expect(mockGetScheduledTasksStatus).toHaveBeenCalledOnce();
  });
});

// =========================================================================
// 2. setEnabled — mutation: enable or disable a named task
// =========================================================================

describe("scheduler.setEnabled", () => {
  it("returns success=true with enable message when task exists", async () => {
    mockSetTaskEnabled.mockReturnValueOnce(true);

    const caller = createAuthenticatedCaller();
    const result = await caller.scheduler.setEnabled({
      taskName: "delayPrediction",
      enabled: true,
    });

    expect(mockSetTaskEnabled).toHaveBeenCalledWith("delayPrediction", true);
    expect(result).toEqual({
      success: true,
      message: "任务 delayPrediction 已启用",
    });
  });

  it("returns success=true with disable message when task exists", async () => {
    mockSetTaskEnabled.mockReturnValueOnce(true);

    const caller = createAuthenticatedCaller();
    const result = await caller.scheduler.setEnabled({
      taskName: "reportGeneration",
      enabled: false,
    });

    expect(mockSetTaskEnabled).toHaveBeenCalledWith("reportGeneration", false);
    expect(result).toEqual({
      success: true,
      message: "任务 reportGeneration 已禁用",
    });
  });

  it("returns success=false with '不存在' message when task does not exist", async () => {
    mockSetTaskEnabled.mockReturnValueOnce(false);

    const caller = createAuthenticatedCaller();
    const result = await caller.scheduler.setEnabled({
      taskName: "nonExistentTask",
      enabled: true,
    });

    expect(mockSetTaskEnabled).toHaveBeenCalledWith("nonExistentTask", true);
    expect(result).toEqual({
      success: false,
      message: "任务 nonExistentTask 不存在",
    });
  });
});

// =========================================================================
// 3. trigger — mutation: manually trigger a task
// =========================================================================

describe("scheduler.trigger", () => {
  it("returns the trigger result from the service", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.scheduler.trigger({ taskName: "delayPrediction" });

    expect(mockTriggerTask).toHaveBeenCalledWith("delayPrediction");
    expect(result).toEqual({ success: true, message: "任务已执行" });
  });

  it("handles trigger failure gracefully", async () => {
    mockTriggerTask.mockResolvedValueOnce({ success: false, message: "任务执行失败" });

    const caller = createAuthenticatedCaller();
    const result = await caller.scheduler.trigger({ taskName: "brokenTask" });

    expect(mockTriggerTask).toHaveBeenCalledWith("brokenTask");
    expect(result).toEqual({ success: false, message: "任务执行失败" });
  });
});

// =========================================================================
// 4. updateCron — mutation: update a task's cron expression
// =========================================================================

describe("scheduler.updateCron", () => {
  it("returns success with update message when task exists", async () => {
    mockUpdateTaskCron.mockReturnValueOnce(true);

    const caller = createAuthenticatedCaller();
    const result = await caller.scheduler.updateCron({
      taskName: "delayPrediction",
      cronExpression: "0 */12 * * *",
    });

    expect(mockUpdateTaskCron).toHaveBeenCalledWith("delayPrediction", "0 */12 * * *");
    expect(result).toEqual({
      success: true,
      message: "任务 delayPrediction 的执行时间已更新",
    });
  });

  it("returns failure when task does not exist", async () => {
    mockUpdateTaskCron.mockReturnValueOnce(false);

    const caller = createAuthenticatedCaller();
    const result = await caller.scheduler.updateCron({
      taskName: "ghostTask",
      cronExpression: "0 0 * * *",
    });

    expect(mockUpdateTaskCron).toHaveBeenCalledWith("ghostTask", "0 0 * * *");
    expect(result).toEqual({
      success: false,
      message: "任务 ghostTask 不存在",
    });
  });
});

// =========================================================================
// 5. checkAndRun — mutation: check and run all due tasks
// =========================================================================

describe("scheduler.checkAndRun", () => {
  it("returns the execution summary from the service", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.scheduler.checkAndRun();

    expect(mockCheckAndRunScheduledTasks).toHaveBeenCalledOnce();
    expect(result).toEqual({ executed: 2, skipped: 1 });
  });
});

// =========================================================================
// 6. Auth guards — all procedures reject anonymous callers
// =========================================================================

describe("scheduler auth guards", () => {
  it("rejects anonymous caller for getStatus", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduler.getStatus()).rejects.toThrow();
  });

  it("rejects anonymous caller for setEnabled", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.scheduler.setEnabled({ taskName: "x", enabled: true }),
    ).rejects.toThrow();
  });

  it("rejects anonymous caller for trigger", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.scheduler.trigger({ taskName: "x" }),
    ).rejects.toThrow();
  });

  it("rejects anonymous caller for updateCron", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.scheduler.updateCron({ taskName: "x", cronExpression: "* * * * *" }),
    ).rejects.toThrow();
  });

  it("rejects anonymous caller for checkAndRun", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduler.checkAndRun()).rejects.toThrow();
  });
});
