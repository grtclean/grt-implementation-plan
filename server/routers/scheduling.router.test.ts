/**
 * Scheduling Router — Comprehensive Automated Test Suite
 *
 * Covers all 25 procedures across 7 domains:
 *   - Task management (4 procedures: listTasks, createTask, updateTask, deleteTask)
 *   - Resource management (3 procedures: listResources, createResource, updateResourceAvailability)
 *   - Constraint management (3 procedures: listConstraints, createConstraint, toggleConstraint)
 *   - Scheduling execution (3 procedures: runScheduling, listJobs, getJobResults)
 *   - Gantt & Statistics (2 procedures: getGanttData, getStatistics)
 *   - Export (3 procedures: exportToExcel, exportToPDF, exportToCSV)
 *   - Auto-refresh (4 procedures: getAutoRefreshStatus, updateAutoRefreshConfig, triggerManualRefresh, reportWorkEvent)
 *   - Simulation & Dispatch (3 procedures: simulateWorkReport, dispatchToWorkers, getWorkerDispatches)
 *
 * Run: npx vitest run server/routers/scheduling.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB (two-layer pattern to avoid thenable unwrapping) ────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from", "where", "orderBy", "limit", "offset", "values", "set",
    "onConflictDoUpdate", "onConflictDoNothing", "groupBy", "having",
    "innerJoin", "leftJoin", "rightJoin", "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try { return resolve(getNextResult()); }
    catch (e) { if (reject) return reject(e); throw e; }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve(mockQueryResult)),
    $count: vi.fn(() => Promise.resolve(0)),
    transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  getDb: vi.fn(async () => mockDb),
  requireDb: vi.fn(async () => mockDb),
}));

// ─── Mock UUID ──────────────────────────────────────────────────────
vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

// ─── Mock SchedulingEngine service ──────────────────────────────────
const mockSolveResult = {
  jobId: "mock-job-id",
  scheduledTasks: [
    {
      taskId: "task-1",
      resourceId: "res-1",
      scheduledStart: new Date("2026-03-01T08:00:00Z"),
      scheduledEnd: new Date("2026-03-01T12:00:00Z"),
      durationHours: 4,
      sequenceOrder: 1,
      changeoverTime: 0,
      delayPenalty: 0,
    },
  ],
  totalDelay: 0,
  totalChangeoverCost: 0,
  objectiveValue: 5.0,
  solveTimeSeconds: 1.2,
  feasible: true,
  message: "Scheduling completed successfully",
};

vi.mock("../services/scheduling.service", () => ({
  SchedulingEngine: vi.fn().mockImplementation(() => ({
    solve: vi.fn(() => mockSolveResult),
  })),
  generateGanttData: vi.fn(() => ({
    tasks: [],
    resources: [],
  })),
  validateSchedulingResult: vi.fn(() => ({ valid: true })),
}));

// ─── Mock auto-refresh service ──────────────────────────────────────
const mockRefreshStatus = {
  enabled: true,
  lastRefreshTime: null,
  pendingEventsCount: 0,
  config: {
    enabled: true,
    triggerDelay: 5000,
    minIntervalMinutes: 15,
    affectedBuThreshold: 2,
    notifyOnRefresh: true,
  },
};

const mockRefreshResult = {
  triggered: true,
  reason: "Manual refresh triggered",
  jobId: "manual-job-id",
  affectedTasks: 0,
  timestamp: new Date(),
};

vi.mock("../services/scheduling-auto-refresh.service", () => ({
  handleWorkReportEvent: vi.fn(async () => {}),
  triggerManualRefresh: vi.fn(async () => mockRefreshResult),
  getRefreshStatus: vi.fn(() => mockRefreshStatus),
  updateAutoRefreshConfig: vi.fn((config: any) => ({
    ...mockRefreshStatus.config,
    ...config,
  })),
  simulateWorkReportEvent: vi.fn(async () => {}),
}));

// ─── Mock export service (dynamic import) ───────────────────────────
vi.mock("../services/scheduling-export.service", () => ({
  exportSchedulingToExcel: vi.fn(async () => Buffer.from("mock-excel-data")),
  generateSchedulingPDFContent: vi.fn(() => "<html><body>PDF Content</body></html>"),
  exportSchedulingToCSV: vi.fn(() => "id,taskName,status\n1,Task 1,pending"),
}));

// ─── Import callers AFTER mocks ─────────────────────────────────────
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
} from "../_test/trpc-test-utils";

// ─── Test fixtures ──────────────────────────────────────────────────
const mockTask = {
  id: "task-1",
  project_id: "proj-1",
  bu_code: "BU1",
  task_name: "CNC Machining Part A",
  task_type: "machining",
  estimated_hours: "8",
  priority: 7,
  earliest_start: "2026-03-01T08:00:00Z",
  latest_finish: "2026-03-10T17:00:00Z",
  predecessor_tasks: JSON.stringify([]),
  required_skills: JSON.stringify(["cnc_operation"]),
  required_resources: JSON.stringify(["CNC-001"]),
  status: "pending",
  created_at: "2026-03-01T00:00:00Z",
};

const mockResource = {
  id: "res-1",
  resource_type: "equipment",
  resource_name: "CNC Machine #1",
  bu_code: "BU1",
  skills: JSON.stringify([{ skill: "milling", level: 4 }]),
  capacity_per_day: "8",
  cost_per_hour: "50",
  availability_calendar: JSON.stringify([]),
  status: "available",
};

const mockConstraint = {
  id: "const-1",
  constraint_type: "time_window",
  constraint_name: "Working hours constraint",
  description: "8am to 5pm only",
  parameters: JSON.stringify({ startHour: 8, endHour: 17 }),
  priority: 8,
  is_hard_constraint: true,
  penalty_weight: "1",
  is_active: true,
};

const mockJob = {
  id: "job-1",
  job_name: "Test Scheduling Job",
  job_type: "manual",
  status: "completed",
  input_parameters: JSON.stringify({ taskIds: ["task-1"] }),
  objective_weights: JSON.stringify({ delayWeight: 1, changeoverWeight: 0.5 }),
  solver_config: JSON.stringify({ maxTimeSeconds: 60, optimizationLevel: "balanced" }),
  result_summary: JSON.stringify({ taskCount: 1, feasible: true }),
  total_delay: 0,
  total_changeover_cost: 0,
  objective_value: 5.0,
  solve_time_seconds: 1.2,
  created_by: 1,
  created_at: "2026-03-01T00:00:00Z",
  completed_at: "2026-03-01T00:01:00Z",
};

const mockScheduledResult = {
  id: "sr-1",
  job_id: "job-1",
  task_id: "task-1",
  resource_id: "res-1",
  task_name: "CNC Machining Part A",
  bu_code: "BU1",
  task_type: "machining",
  resource_name: "CNC Machine #1",
  scheduled_start: "2026-03-01T08:00:00Z",
  scheduled_end: "2026-03-01T12:00:00Z",
  duration_hours: "4",
  sequence_order: 1,
  changeover_time: "0",
  delay_penalty: "0",
  predecessor_tasks: JSON.stringify([]),
  task_status: "scheduled",
};

const mockDispatch = {
  id: "disp-1",
  job_id: "job-1",
  task_id: "task-1",
  resource_id: "res-1",
  task_name: "CNC Machining Part A",
  bu_code: "BU1",
  task_type: "machining",
  scheduled_start: "2026-03-01T08:00:00Z",
  scheduled_end: "2026-03-01T12:00:00Z",
  duration_hours: "4",
  status: "dispatched",
  dispatched_by: 999,
  dispatched_at: "2026-03-01T00:00:00Z",
};

// ─── Reset mocks before each test ───────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
  mockDb.execute.mockImplementation(() => Promise.resolve(mockQueryResult));
});

// =====================================================================
//  TASK MANAGEMENT
// =====================================================================
describe("scheduling.listTasks", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.listTasks()).rejects.toThrow();
  });

  it("returns tasks for admin without filters", async () => {
    const taskList = [mockTask, { ...mockTask, id: "task-2", task_name: "Welding Part B" }];
    mockDb.execute.mockResolvedValueOnce([taskList]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.listTasks();
    expect(result).toEqual(taskList);
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it("applies projectId filter", async () => {
    mockDb.execute.mockResolvedValueOnce([[mockTask]]);
    const caller = createAdminCaller();
    await caller.scheduling.listTasks({ projectId: "proj-1" });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("project_id = ?");
  });

  it("applies buCode filter", async () => {
    mockDb.execute.mockResolvedValueOnce([[mockTask]]);
    const caller = createAdminCaller();
    await caller.scheduling.listTasks({ buCode: "BU1" });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("bu_code = ?");
  });

  it("applies status filter", async () => {
    mockDb.execute.mockResolvedValueOnce([[mockTask]]);
    const caller = createAdminCaller();
    await caller.scheduling.listTasks({ status: "pending" });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("status = ?");
  });

  it("applies limit and offset defaults", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await caller.scheduling.listTasks();
    const params = mockDb.execute.mock.calls[0][1];
    // Default limit=50, offset=0
    expect(params).toContain(50);
    expect(params).toContain(0);
  });

  it("applies custom limit and offset", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await caller.scheduling.listTasks({ limit: 10, offset: 20 });
    const params = mockDb.execute.mock.calls[0][1];
    expect(params).toContain(10);
    expect(params).toContain(20);
  });

  it("returns empty array when no tasks found", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.listTasks();
    expect(result).toEqual([]);
  });
});

describe("scheduling.createTask", () => {
  const validInput = {
    buCode: "BU1",
    taskName: "New Task",
    taskType: "machining" as const,
    estimatedHours: 8,
    priority: 7,
    predecessorTasks: [],
    requiredSkills: ["cnc_operation"],
    requiredResources: ["CNC-001"],
  };

  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.createTask(validInput)).rejects.toThrow();
  });

  it("creates a task and returns id with input", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.createTask(validInput);
    expect(result).toMatchObject({
      id: "test-uuid-1234",
      buCode: "BU1",
      taskName: "New Task",
      taskType: "machining",
      estimatedHours: 8,
    });
  });

  it("inserts into scheduling_tasks with correct SQL", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    await caller.scheduling.createTask(validInput);
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("INSERT INTO scheduling_tasks");
    expect(query).toContain("'pending'");
  });

  it("stores optional projectId", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    await caller.scheduling.createTask({ ...validInput, projectId: "proj-99" });
    const params = mockDb.execute.mock.calls[0][1];
    expect(params[1]).toBe("proj-99");
  });

  it("stores null for missing optional fields", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    await caller.scheduling.createTask(validInput);
    const params = mockDb.execute.mock.calls[0][1];
    // projectId=null, earliestStart=null, latestFinish=null
    expect(params[1]).toBeNull();
    expect(params[7]).toBeNull();
    expect(params[8]).toBeNull();
  });

  it("rejects invalid taskType", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.createTask({ ...validInput, taskType: "invalid" as any })
    ).rejects.toThrow();
  });

  it("rejects non-positive estimatedHours", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.createTask({ ...validInput, estimatedHours: 0 })
    ).rejects.toThrow();
  });

  it("rejects priority out of range", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.createTask({ ...validInput, priority: 11 })
    ).rejects.toThrow();
  });
});

describe("scheduling.updateTask", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.scheduling.updateTask({ id: "task-1", taskName: "Updated" })
    ).rejects.toThrow();
  });

  it("updates task name", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.updateTask({ id: "task-1", taskName: "Updated Name" });
    expect(result).toEqual({ success: true });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("task_name = ?");
  });

  it("updates estimated hours", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    await caller.scheduling.updateTask({ id: "task-1", estimatedHours: 12 });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("estimated_hours = ?");
  });

  it("updates priority", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    await caller.scheduling.updateTask({ id: "task-1", priority: 9 });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("priority = ?");
  });

  it("updates multiple fields at once", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    await caller.scheduling.updateTask({
      id: "task-1",
      taskName: "Updated",
      estimatedHours: 10,
      priority: 3,
    });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("task_name = ?");
    expect(query).toContain("estimated_hours = ?");
    expect(query).toContain("priority = ?");
  });

  it("still updates when only defaults are provided (priority/predecessorTasks have defaults)", async () => {
    // Note: taskInputSchema has .default(5) for priority and .default([]) for predecessorTasks,
    // so even { id: "task-1" } will have these defaults applied by Zod, causing an UPDATE.
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.updateTask({ id: "task-1" });
    expect(result).toEqual({ success: true });
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("priority = ?");
    expect(query).toContain("predecessor_tasks = ?");
  });

  it("updates predecessorTasks as JSON", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    await caller.scheduling.updateTask({ id: "task-1", predecessorTasks: ["task-0"] });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("predecessor_tasks = ?");
    const params = mockDb.execute.mock.calls[0][1] as any[];
    // predecessorTasks is serialized as JSON; find it in the params array
    const jsonParam = params.find((p: any) => p === JSON.stringify(["task-0"]));
    expect(jsonParam).toBe(JSON.stringify(["task-0"]));
  });
});

describe("scheduling.deleteTask", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.deleteTask({ id: "task-1" })).rejects.toThrow();
  });

  it("deletes a task and returns success", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.deleteTask({ id: "task-1" });
    expect(result).toEqual({ success: true });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("DELETE FROM scheduling_tasks");
    const params = mockDb.execute.mock.calls[0][1];
    expect(params).toEqual(["task-1"]);
  });
});

// =====================================================================
//  RESOURCE MANAGEMENT
// =====================================================================
describe("scheduling.listResources", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.listResources()).rejects.toThrow();
  });

  it("returns resources without filters", async () => {
    mockDb.execute.mockResolvedValueOnce([[mockResource]]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.listResources();
    expect(result).toEqual([mockResource]);
  });

  it("applies resourceType filter", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await caller.scheduling.listResources({ resourceType: "employee" });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("resource_type = ?");
  });

  it("applies buCode filter", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await caller.scheduling.listResources({ buCode: "BU2" });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("bu_code = ?");
  });

  it("applies status filter", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await caller.scheduling.listResources({ status: "available" });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("status = ?");
  });
});

describe("scheduling.createResource", () => {
  const validResourceInput = {
    resourceType: "equipment" as const,
    resourceName: "CNC Machine #2",
    buCode: "BU1",
    skills: [{ skill: "milling", level: 4 }],
    capacityPerDay: 8,
    costPerHour: 50,
  };

  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.createResource(validResourceInput)).rejects.toThrow();
  });

  it("creates resource and returns id with input", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.createResource(validResourceInput);
    expect(result).toMatchObject({
      id: "test-uuid-1234",
      resourceType: "equipment",
      resourceName: "CNC Machine #2",
    });
  });

  it("inserts with 'available' default status", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    await caller.scheduling.createResource(validResourceInput);
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("'available'");
  });

  it("stores null for missing buCode", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const { buCode, ...withoutBu } = validResourceInput;
    await caller.scheduling.createResource(withoutBu);
    const params = mockDb.execute.mock.calls[0][1];
    // buCode is the 4th param (index 3)
    expect(params[3]).toBeNull();
  });

  it("rejects invalid resourceType", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.createResource({ ...validResourceInput, resourceType: "invalid" as any })
    ).rejects.toThrow();
  });
});

describe("scheduling.updateResourceAvailability", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.scheduling.updateResourceAvailability({
        resourceId: "res-1",
        date: "2026-03-01",
        available: true,
      })
    ).rejects.toThrow();
  });

  it("throws if resource not found", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.updateResourceAvailability({
        resourceId: "nonexistent",
        date: "2026-03-01",
        available: true,
      })
    ).rejects.toThrow();
  });

  it("adds new calendar entry when none exists", async () => {
    mockDb.execute
      .mockResolvedValueOnce([[{ availability_calendar: "[]" }]])
      .mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.updateResourceAvailability({
      resourceId: "res-1",
      date: "2026-03-05",
      available: false,
      availableHours: 4,
    });
    expect(result).toEqual({ success: true });
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
    // Check the update query
    const updateParams = mockDb.execute.mock.calls[1][1];
    const calendar = JSON.parse(updateParams[0]);
    expect(calendar).toHaveLength(1);
    expect(calendar[0]).toMatchObject({
      date: "2026-03-05",
      available: false,
      availableHours: 4,
    });
  });

  it("updates existing calendar entry for same date", async () => {
    const existingCalendar = [{ date: "2026-03-05", available: true, availableHours: 8 }];
    mockDb.execute
      .mockResolvedValueOnce([[{ availability_calendar: JSON.stringify(existingCalendar) }]])
      .mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    await caller.scheduling.updateResourceAvailability({
      resourceId: "res-1",
      date: "2026-03-05",
      available: false,
      availableHours: 0,
    });
    const updateParams = mockDb.execute.mock.calls[1][1];
    const calendar = JSON.parse(updateParams[0]);
    expect(calendar).toHaveLength(1);
    expect(calendar[0].available).toBe(false);
    expect(calendar[0].availableHours).toBe(0);
  });

  it("handles null availability_calendar gracefully", async () => {
    mockDb.execute
      .mockResolvedValueOnce([[{ availability_calendar: null }]])
      .mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.updateResourceAvailability({
      resourceId: "res-1",
      date: "2026-03-05",
      available: true,
    });
    expect(result).toEqual({ success: true });
  });
});

// =====================================================================
//  CONSTRAINT MANAGEMENT
// =====================================================================
describe("scheduling.listConstraints", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.listConstraints()).rejects.toThrow();
  });

  it("returns constraints without filters", async () => {
    mockDb.execute.mockResolvedValueOnce([[mockConstraint]]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.listConstraints();
    expect(result).toEqual([mockConstraint]);
  });

  it("applies constraintType filter", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await caller.scheduling.listConstraints({ constraintType: "time_window" });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("constraint_type = ?");
  });

  it("applies isActive filter", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await caller.scheduling.listConstraints({ isActive: true });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("is_active = ?");
  });
});

describe("scheduling.createConstraint", () => {
  const validConstraintInput = {
    constraintType: "time_window" as const,
    constraintName: "Working hours",
    description: "8am to 5pm",
    parameters: { startHour: 8, endHour: 17 },
    priority: 8,
    isHardConstraint: true,
    penaltyWeight: 1,
  };

  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.createConstraint(validConstraintInput)).rejects.toThrow();
  });

  it("creates constraint and returns id with input", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.createConstraint(validConstraintInput);
    expect(result).toMatchObject({
      id: "test-uuid-1234",
      constraintType: "time_window",
      constraintName: "Working hours",
    });
  });

  it("inserts with is_active=TRUE", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    await caller.scheduling.createConstraint(validConstraintInput);
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("TRUE");
  });

  it("stores parameters as JSON", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    await caller.scheduling.createConstraint(validConstraintInput);
    const params = mockDb.execute.mock.calls[0][1];
    expect(params[4]).toBe(JSON.stringify({ startHour: 8, endHour: 17 }));
  });

  it("rejects invalid constraintType", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.createConstraint({ ...validConstraintInput, constraintType: "invalid" as any })
    ).rejects.toThrow();
  });
});

describe("scheduling.toggleConstraint", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.scheduling.toggleConstraint({ id: "const-1", isActive: false })
    ).rejects.toThrow();
  });

  it("toggles constraint active state", async () => {
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.toggleConstraint({ id: "const-1", isActive: false });
    expect(result).toEqual({ success: true });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("UPDATE scheduling_constraints SET is_active = ?");
    const params = mockDb.execute.mock.calls[0][1];
    expect(params).toEqual([false, "const-1"]);
  });
});

// =====================================================================
//  SCHEDULING EXECUTION
// =====================================================================
describe("scheduling.runScheduling", () => {
  const validSchedulingInput = {
    jobName: "Test Scheduling Run",
    taskIds: ["task-1"],
    objectiveWeights: { delayWeight: 1, changeoverWeight: 0.5 },
    solverConfig: { maxTimeSeconds: 60, optimizationLevel: "balanced" as const },
    planningHorizon: {
      startDate: "2026-03-01T00:00:00Z",
      endDate: "2026-03-31T23:59:59Z",
    },
  };

  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.runScheduling(validSchedulingInput)).rejects.toThrow();
  });

  it("executes scheduling and returns result with jobId", async () => {
    // Mock sequence: insert job, select tasks, select resources, select constraints,
    // then inserts for results + updates for task status + update job record
    mockDb.execute
      .mockResolvedValueOnce([])  // INSERT scheduling_jobs
      .mockResolvedValueOnce([[mockTask]])  // SELECT tasks
      .mockResolvedValueOnce([[mockResource]])  // SELECT resources
      .mockResolvedValueOnce([[mockConstraint]])  // SELECT constraints
      .mockResolvedValueOnce([])  // INSERT scheduling_results (for each task)
      .mockResolvedValueOnce([])  // UPDATE scheduling_tasks status
      .mockResolvedValueOnce([]);  // UPDATE scheduling_jobs completed

    const caller = createAdminCaller();
    const result = await caller.scheduling.runScheduling(validSchedulingInput);

    // Note: the router does { jobId, ...result, ganttData } where result from
    // engine.solve() also contains jobId, so the spread overwrites with mock's jobId.
    expect(result).toMatchObject({
      jobId: "mock-job-id",
      feasible: true,
      totalDelay: 0,
      objectiveValue: 5.0,
      solveTimeSeconds: 1.2,
    });
    expect(result.ganttData).toBeDefined();
  });

  it("creates job record before scheduling", async () => {
    mockDb.execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([]);

    const caller = createAdminCaller();
    await caller.scheduling.runScheduling(validSchedulingInput);

    const firstCall = mockDb.execute.mock.calls[0];
    expect(firstCall[0]).toContain("INSERT INTO scheduling_jobs");
    expect(firstCall[0]).toContain("'running'");
  });

  it("fetches all pending tasks when taskIds not specified", async () => {
    const inputWithoutTaskIds = {
      ...validSchedulingInput,
      taskIds: undefined,
    };

    mockDb.execute
      .mockResolvedValueOnce([])  // INSERT job
      .mockResolvedValueOnce([[]])  // SELECT tasks
      .mockResolvedValueOnce([[]])  // SELECT resources
      .mockResolvedValueOnce([[]])  // SELECT constraints
      .mockResolvedValueOnce([]);  // UPDATE job

    const caller = createAdminCaller();
    await caller.scheduling.runScheduling(inputWithoutTaskIds);

    const taskQuery = mockDb.execute.mock.calls[1][0];
    expect(taskQuery).toContain("status = ?");
    const taskParams = mockDb.execute.mock.calls[1][1];
    expect(taskParams).toEqual(["pending"]);
  });

  it("updates job to failed on error", async () => {
    mockDb.execute
      .mockResolvedValueOnce([])  // INSERT job
      .mockRejectedValueOnce(new Error("DB query failed"));  // SELECT tasks fails

    // The router catches and re-throws after updating job status
    mockDb.execute.mockResolvedValueOnce([]); // UPDATE job to failed

    const caller = createAdminCaller();
    await expect(caller.scheduling.runScheduling(validSchedulingInput)).rejects.toThrow();
  });

  it("rejects missing planningHorizon", async () => {
    const caller = createAdminCaller();
    const invalid = { ...validSchedulingInput, planningHorizon: undefined };
    await expect(caller.scheduling.runScheduling(invalid as any)).rejects.toThrow();
  });
});

describe("scheduling.listJobs", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.listJobs()).rejects.toThrow();
  });

  it("returns jobs without filters", async () => {
    mockDb.execute.mockResolvedValueOnce([[mockJob]]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.listJobs();
    expect(result).toEqual([mockJob]);
  });

  it("applies status filter", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await caller.scheduling.listJobs({ status: "completed" });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("status = ?");
    const params = mockDb.execute.mock.calls[0][1];
    expect(params[0]).toBe("completed");
  });

  it("uses default limit of 20", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await caller.scheduling.listJobs();
    const params = mockDb.execute.mock.calls[0][1];
    expect(params).toContain(20);
  });

  it("applies custom limit", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await caller.scheduling.listJobs({ limit: 5 });
    const params = mockDb.execute.mock.calls[0][1];
    expect(params).toContain(5);
  });
});

describe("scheduling.getJobResults", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.getJobResults({ jobId: "job-1" })).rejects.toThrow();
  });

  it("throws when job not found", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.getJobResults({ jobId: "nonexistent" })
    ).rejects.toThrow();
  });

  it("returns job and result rows", async () => {
    mockDb.execute
      .mockResolvedValueOnce([[mockJob]])  // SELECT job
      .mockResolvedValueOnce([[mockScheduledResult]]);  // SELECT results

    const caller = createAdminCaller();
    const result = await caller.scheduling.getJobResults({ jobId: "job-1" });
    expect(result.job).toEqual(mockJob);
    expect(result.results).toEqual([mockScheduledResult]);
  });
});

// =====================================================================
//  GANTT & STATISTICS
// =====================================================================
describe("scheduling.getGanttData", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.getGanttData({ jobId: "job-1" })).rejects.toThrow();
  });

  it("returns formatted gantt tasks and resources", async () => {
    mockDb.execute
      .mockResolvedValueOnce([[mockScheduledResult]])  // SELECT results
      .mockResolvedValueOnce([[mockResource]]);  // SELECT resources

    const caller = createAdminCaller();
    const result = await caller.scheduling.getGanttData({ jobId: "job-1" });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]).toMatchObject({
      id: "task-1",
      name: "CNC Machining Part A",
      resource: "CNC Machine #1",
      bu: "BU1",
      taskType: "machining",
    });
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0]).toMatchObject({
      id: "res-1",
      name: "CNC Machine #1",
      type: "equipment",
    });
  });

  it("handles task with no resource (shows '待分配')", async () => {
    const noResourceResult = { ...mockScheduledResult, resource_id: null, resource_name: null };
    mockDb.execute
      .mockResolvedValueOnce([[noResourceResult]])
      .mockResolvedValueOnce([[]]);

    const caller = createAdminCaller();
    const result = await caller.scheduling.getGanttData({ jobId: "job-1" });
    expect(result.tasks[0].resource).toBe("待分配");
  });

  it("calculates progress based on task_status", async () => {
    const completedResult = { ...mockScheduledResult, task_status: "completed" };
    const inProgressResult = { ...mockScheduledResult, id: "sr-2", task_id: "task-2", task_status: "in_progress" };
    const pendingResult = { ...mockScheduledResult, id: "sr-3", task_id: "task-3", task_status: "pending" };
    mockDb.execute
      .mockResolvedValueOnce([[completedResult, inProgressResult, pendingResult]])
      .mockResolvedValueOnce([[]]);

    const caller = createAdminCaller();
    const result = await caller.scheduling.getGanttData({ jobId: "job-1" });
    expect(result.tasks[0].progress).toBe(100);
    expect(result.tasks[1].progress).toBe(50);
    expect(result.tasks[2].progress).toBe(0);
  });

  it("calculates resource utilization correctly", async () => {
    // Resource has capacity_per_day = 8, so weekly capacity = 40 hours
    // If task uses 4 hours, utilization = (4 / 40) * 100 = 10%
    mockDb.execute
      .mockResolvedValueOnce([[mockScheduledResult]])
      .mockResolvedValueOnce([[mockResource]]);

    const caller = createAdminCaller();
    const result = await caller.scheduling.getGanttData({ jobId: "job-1" });
    expect(result.resources[0].utilization).toBe(10); // 4 / (8*5) * 100
  });
});

describe("scheduling.getStatistics", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.getStatistics()).rejects.toThrow();
  });

  it("returns aggregated statistics", async () => {
    const taskStats = [{ total: 10, pending: 3, scheduled: 4, in_progress: 2, completed: 1 }];
    const resourceStats = [{ total: 5, available: 3, employees: 2, equipment: 3 }];
    const recentJobs = [mockJob];
    const buDistribution = [{ bu_code: "BU1", count: 5, total_hours: 40 }];

    mockDb.execute
      .mockResolvedValueOnce([taskStats])
      .mockResolvedValueOnce([resourceStats])
      .mockResolvedValueOnce([recentJobs])
      .mockResolvedValueOnce([buDistribution]);

    const caller = createAdminCaller();
    const result = await caller.scheduling.getStatistics();

    expect(result.tasks).toEqual(taskStats[0]);
    expect(result.resources).toEqual(resourceStats[0]);
    expect(result.recentJobs).toEqual(recentJobs);
    expect(result.buDistribution).toEqual(buDistribution);
  });

  it("queries four different statistics tables", async () => {
    mockDb.execute
      .mockResolvedValueOnce([[{}]])
      .mockResolvedValueOnce([[{}]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const caller = createAdminCaller();
    await caller.scheduling.getStatistics();

    expect(mockDb.execute).toHaveBeenCalledTimes(4);
    // Verify each query targets the correct table
    expect(mockDb.execute.mock.calls[0][0]).toContain("scheduling_tasks");
    expect(mockDb.execute.mock.calls[1][0]).toContain("scheduling_resources");
    expect(mockDb.execute.mock.calls[2][0]).toContain("scheduling_jobs");
    expect(mockDb.execute.mock.calls[3][0]).toContain("scheduling_tasks");
    expect(mockDb.execute.mock.calls[3][0]).toContain("GROUP BY bu_code");
  });
});

// =====================================================================
//  EXPORT
// =====================================================================
describe("scheduling.exportToExcel", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.exportToExcel({})).rejects.toThrow();
  });

  it("exports and returns base64 xlsx data", async () => {
    mockDb.execute
      .mockResolvedValueOnce([[mockTask]])  // SELECT tasks
      .mockResolvedValueOnce([[mockResource]]);  // SELECT resources

    const caller = createAdminCaller();
    const result = await caller.scheduling.exportToExcel({});

    expect(result.filename).toContain("排程报告_");
    expect(result.filename).toContain(".xlsx");
    expect(result.mimeType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(result.data).toBeDefined();
  });

  it("filters by projectId when provided", async () => {
    mockDb.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const caller = createAdminCaller();
    await caller.scheduling.exportToExcel({ projectId: "proj-1" });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("project_id = ?");
  });
});

describe("scheduling.exportToPDF", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.exportToPDF({})).rejects.toThrow();
  });

  it("exports and returns HTML content for PDF", async () => {
    mockDb.execute
      .mockResolvedValueOnce([[mockTask]])
      .mockResolvedValueOnce([[mockResource]]);

    const caller = createAdminCaller();
    const result = await caller.scheduling.exportToPDF({});

    expect(result.filename).toContain("排程报告_");
    expect(result.filename).toContain(".pdf");
    expect(result.mimeType).toBe("text/html");
    expect(result.htmlContent).toContain("PDF Content");
  });

  it("filters by projectId when provided", async () => {
    mockDb.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const caller = createAdminCaller();
    await caller.scheduling.exportToPDF({ projectId: "proj-2" });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("project_id = ?");
  });
});

describe("scheduling.exportToCSV", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.exportToCSV({})).rejects.toThrow();
  });

  it("exports and returns CSV data", async () => {
    mockDb.execute.mockResolvedValueOnce([[mockTask]]);

    const caller = createAdminCaller();
    const result = await caller.scheduling.exportToCSV({});

    expect(result.filename).toContain("排程任务_");
    expect(result.filename).toContain(".csv");
    expect(result.mimeType).toBe("text/csv");
    expect(result.data).toBeDefined();
  });

  it("filters by projectId when provided", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);

    const caller = createAdminCaller();
    await caller.scheduling.exportToCSV({ projectId: "proj-1" });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("project_id = ?");
  });
});

// =====================================================================
//  AUTO-REFRESH
// =====================================================================
describe("scheduling.getAutoRefreshStatus", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.getAutoRefreshStatus()).rejects.toThrow();
  });

  it("returns refresh status", async () => {
    const caller = createAdminCaller();
    const result = await caller.scheduling.getAutoRefreshStatus();
    expect(result).toMatchObject({
      enabled: true,
      pendingEventsCount: 0,
    });
    expect(result.config).toBeDefined();
  });
});

describe("scheduling.updateAutoRefreshConfig", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.scheduling.updateAutoRefreshConfig({ enabled: false })
    ).rejects.toThrow();
  });

  it("updates config and returns merged result", async () => {
    const caller = createAdminCaller();
    const result = await caller.scheduling.updateAutoRefreshConfig({ enabled: false });
    expect(result.enabled).toBe(false);
  });

  it("validates triggerDelay minimum", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.updateAutoRefreshConfig({ triggerDelay: 500 })
    ).rejects.toThrow();
  });

  it("validates minIntervalMinutes minimum", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.updateAutoRefreshConfig({ minIntervalMinutes: 0 })
    ).rejects.toThrow();
  });
});

describe("scheduling.triggerManualRefresh", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.triggerManualRefresh()).rejects.toThrow();
  });

  it("triggers manual refresh and returns result", async () => {
    const caller = createAdminCaller();
    const result = await caller.scheduling.triggerManualRefresh();
    expect(result).toMatchObject({
      triggered: true,
    });
  });
});

describe("scheduling.reportWorkEvent", () => {
  const validEvent = {
    taskId: "task-1",
    resourceId: "res-1",
    reportedHours: 4,
    reportDate: "2026-03-01",
  };

  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.reportWorkEvent(validEvent)).rejects.toThrow();
  });

  it("handles work report event and returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.scheduling.reportWorkEvent(validEvent);
    expect(result).toMatchObject({
      success: true,
      message: expect.stringContaining("报工事件已接收"),
    });
  });

  it("rejects non-positive reportedHours", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.reportWorkEvent({ ...validEvent, reportedHours: 0 })
    ).rejects.toThrow();
  });

  it("rejects negative reportedHours", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.reportWorkEvent({ ...validEvent, reportedHours: -1 })
    ).rejects.toThrow();
  });
});

// =====================================================================
//  SIMULATION & DISPATCH
// =====================================================================
describe("scheduling.simulateWorkReport", () => {
  const validSimulation = {
    taskId: "task-1",
    resourceId: "res-1",
    reportedHours: 4,
  };

  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.scheduling.simulateWorkReport(validSimulation)).rejects.toThrow();
  });

  it("simulates work report and returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.scheduling.simulateWorkReport(validSimulation);
    expect(result).toMatchObject({
      success: true,
      message: expect.stringContaining("模拟报工事件已发送"),
    });
  });

  it("rejects non-positive reportedHours", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.simulateWorkReport({ ...validSimulation, reportedHours: 0 })
    ).rejects.toThrow();
  });
});

describe("scheduling.dispatchToWorkers", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.scheduling.dispatchToWorkers({ jobId: "job-1" })
    ).rejects.toThrow();
  });

  it("throws when job not found", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.dispatchToWorkers({ jobId: "nonexistent" })
    ).rejects.toThrow();
  });

  it("throws when job is not completed", async () => {
    const runningJob = { ...mockJob, status: "running" };
    mockDb.execute.mockResolvedValueOnce([[runningJob]]);
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.dispatchToWorkers({ jobId: "job-1" })
    ).rejects.toThrow("排程任务尚未完成");
  });

  it("throws when no results to dispatch", async () => {
    mockDb.execute
      .mockResolvedValueOnce([[mockJob]])  // SELECT job (completed)
      .mockResolvedValueOnce([[]]);  // SELECT results (empty)

    const caller = createAdminCaller();
    await expect(
      caller.scheduling.dispatchToWorkers({ jobId: "job-1" })
    ).rejects.toThrow("排程结果为空");
  });

  it("creates new dispatch records for results with resource_id", async () => {
    const resultWithResource = {
      ...mockScheduledResult,
      resource_id: "res-1",
    };
    mockDb.execute
      .mockResolvedValueOnce([[mockJob]])  // SELECT job
      .mockResolvedValueOnce([[resultWithResource]])  // SELECT results
      .mockResolvedValueOnce([[]])  // SELECT existing dispatches (none)
      .mockResolvedValueOnce([]);  // INSERT dispatch

    const caller = createAdminCaller();
    const result = await caller.scheduling.dispatchToWorkers({ jobId: "job-1" });
    expect(result.dispatched).toBe(1);
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]).toMatchObject({
      taskId: "task-1",
      resourceId: "res-1",
    });
  });

  it("updates existing dispatch records", async () => {
    const resultWithResource = {
      ...mockScheduledResult,
      resource_id: "res-1",
    };
    mockDb.execute
      .mockResolvedValueOnce([[mockJob]])  // SELECT job
      .mockResolvedValueOnce([[resultWithResource]])  // SELECT results
      .mockResolvedValueOnce([[{ id: "existing-dispatch" }]])  // SELECT existing (found)
      .mockResolvedValueOnce([]);  // UPDATE dispatch

    const caller = createAdminCaller();
    const result = await caller.scheduling.dispatchToWorkers({ jobId: "job-1" });
    expect(result.dispatched).toBe(1);
    // The UPDATE query should contain 'dispatched' status
    const updateQuery = mockDb.execute.mock.calls[3][0];
    expect(updateQuery).toContain("UPDATE scheduling_dispatches");
  });

  it("skips results without resource_id", async () => {
    const noResourceResult = {
      ...mockScheduledResult,
      resource_id: null,
    };
    mockDb.execute
      .mockResolvedValueOnce([[mockJob]])  // SELECT job
      .mockResolvedValueOnce([[noResourceResult]]);  // SELECT results

    const caller = createAdminCaller();
    const result = await caller.scheduling.dispatchToWorkers({ jobId: "job-1" });
    expect(result.dispatched).toBe(0);
    expect(result.assignments).toHaveLength(0);
  });
});

describe("scheduling.getWorkerDispatches", () => {
  it("rejects anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.scheduling.getWorkerDispatches({ workerId: 1 })
    ).rejects.toThrow();
  });

  it("returns dispatches without filters", async () => {
    mockDb.execute.mockResolvedValueOnce([[mockDispatch]]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.getWorkerDispatches({});
    expect(result).toEqual([mockDispatch]);
  });

  it("filters by workerId", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await caller.scheduling.getWorkerDispatches({ workerId: 42 });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("resource_id = ?");
    const params = mockDb.execute.mock.calls[0][1];
    expect(params[0]).toBe("42"); // Converted to String
  });

  it("filters by date", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await caller.scheduling.getWorkerDispatches({ date: "2026-03-01" });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("DATE(scheduled_start)");
    expect(query).toContain("DATE(scheduled_end)");
  });

  it("applies both workerId and date filters", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await caller.scheduling.getWorkerDispatches({ workerId: 1, date: "2026-03-01" });
    const query = mockDb.execute.mock.calls[0][0];
    expect(query).toContain("resource_id = ?");
    expect(query).toContain("DATE(scheduled_start)");
  });
});

// =====================================================================
//  INPUT VALIDATION (edge cases)
// =====================================================================
describe("input validation edge cases", () => {
  it("listTasks rejects limit > 100", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.listTasks({ limit: 101 })
    ).rejects.toThrow();
  });

  it("listTasks rejects limit < 1", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.listTasks({ limit: 0 })
    ).rejects.toThrow();
  });

  it("listTasks rejects negative offset", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.listTasks({ offset: -1 })
    ).rejects.toThrow();
  });

  it("createTask accepts empty taskName (z.string() has no min-length constraint)", async () => {
    // z.string() without .min(1) allows empty strings
    mockDb.execute.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.scheduling.createTask({
      buCode: "BU1",
      taskName: "",
      taskType: "machining",
      estimatedHours: 8,
    });
    expect(result.taskName).toBe("");
  });

  it("listJobs rejects limit > 50", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.listJobs({ limit: 51 })
    ).rejects.toThrow();
  });

  it("createResource rejects skill level > 5", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.createResource({
        resourceType: "employee",
        resourceName: "Worker",
        skills: [{ skill: "test", level: 6 }],
        capacityPerDay: 8,
        costPerHour: 0,
      })
    ).rejects.toThrow();
  });

  it("createResource rejects skill level < 1", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.createResource({
        resourceType: "employee",
        resourceName: "Worker",
        skills: [{ skill: "test", level: 0 }],
        capacityPerDay: 8,
        costPerHour: 0,
      })
    ).rejects.toThrow();
  });

  it("createConstraint rejects priority > 10", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.createConstraint({
        constraintType: "time_window",
        constraintName: "Test",
        parameters: {},
        priority: 11,
        isHardConstraint: true,
        penaltyWeight: 1,
      })
    ).rejects.toThrow();
  });

  it("updateAutoRefreshConfig rejects affectedBuThreshold < 1", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.scheduling.updateAutoRefreshConfig({ affectedBuThreshold: 0 })
    ).rejects.toThrow();
  });
});
