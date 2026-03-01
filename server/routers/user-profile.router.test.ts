/**
 * User Profile Router — Unit Tests
 * 11 procedures:
 *   Queries    (5): getMyProfile, getMyTasks, getTodayTasks, getOverdueTasks, checkReminderTime, getReminderStats
 *   Mutations  (5): updateMyProfile, createTask, updateTaskStatus, sendTaskReminders, sendDailyReminders
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mock references ─────────────────────────────────
const {
  mockGetUserProfile,
  mockUpsertUserProfile,
  mockGetUserTasks,
  mockGetTodayTasks,
  mockCreateUserTask,
  mockUpdateTaskStatus,
  mockGetOverdueTasks,
  mockGetTasksNeedingReminder,
  mockMarkReminderSent,
  mockLogReminder,
  mockSendTaskReminderEmails,
  mockGetReminderStats,
  mockIsReminderTime,
} = vi.hoisted(() => ({
  mockGetUserProfile: vi.fn(),
  mockUpsertUserProfile: vi.fn(),
  mockGetUserTasks: vi.fn(),
  mockGetTodayTasks: vi.fn(),
  mockCreateUserTask: vi.fn(),
  mockUpdateTaskStatus: vi.fn(),
  mockGetOverdueTasks: vi.fn(),
  mockGetTasksNeedingReminder: vi.fn(),
  mockMarkReminderSent: vi.fn(),
  mockLogReminder: vi.fn(),
  mockSendTaskReminderEmails: vi.fn(),
  mockGetReminderStats: vi.fn(),
  mockIsReminderTime: vi.fn(),
}));

// ── Mock service modules ────────────────────────────────────
vi.mock("../services/user-profile.service", () => ({
  getUserProfile: mockGetUserProfile,
  upsertUserProfile: mockUpsertUserProfile,
  getUserTasks: mockGetUserTasks,
  getTodayTasks: mockGetTodayTasks,
  createUserTask: mockCreateUserTask,
  updateTaskStatus: mockUpdateTaskStatus,
  getOverdueTasks: mockGetOverdueTasks,
  getTasksNeedingReminder: mockGetTasksNeedingReminder,
  markReminderSent: mockMarkReminderSent,
  logReminder: mockLogReminder,
}));

vi.mock("../services/email-reminder.service", () => ({
  sendTaskReminderEmails: mockSendTaskReminderEmails,
  getReminderStats: mockGetReminderStats,
  isReminderTime: mockIsReminderTime,
}));

// ── Helpers ─────────────────────────────────────────────────
function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: "test-user-001",
    employeeId: "EMP-001",
    workPlanFrequency: "weekly",
    workPlanReminderEnabled: true,
    workPlanReminderTime: "09:00:00",
    trainingPlanEnabled: true,
    trainingReminderDaysBefore: 3,
    projectPlanEnabled: true,
    projectMilestoneReminder: true,
    performanceReportEnabled: true,
    performanceReportFrequency: "monthly",
    taskReminderEnabled: true,
    taskReminderTime: "15:00:00",
    taskReminderEmail: true,
    taskReminderSystem: true,
    emailNotificationsEnabled: true,
    emailDigestFrequency: "daily",
    ...overrides,
  };
}

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: "test-user-001",
    employeeId: "EMP-001",
    taskType: "work_plan",
    title: "Complete daily report",
    description: "Fill in the daily work report",
    dueDate: "2026-03-01",
    dueTime: "17:00:00",
    priority: "medium",
    status: "pending",
    relatedProjectId: null,
    relatedTrainingId: null,
    reminderSent: false,
    reminderSentAt: null,
    createdAt: "2026-03-01T08:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════
// QUERIES
// ══════════════════════════════════════════════════════════════

describe("userProfile.getMyProfile", () => {
  it("returns the current user profile", async () => {
    const profile = makeProfile();
    mockGetUserProfile.mockResolvedValue(profile);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.getMyProfile();

    expect(result).toEqual(profile);
    expect(mockGetUserProfile).toHaveBeenCalledWith("test-user-001");
  });

  it("returns null when no profile exists", async () => {
    mockGetUserProfile.mockResolvedValue(null);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.getMyProfile();

    expect(result).toBeNull();
  });

  it("passes the correct openId from context", async () => {
    mockGetUserProfile.mockResolvedValue(null);

    const caller = createAuthenticatedCaller({ openId: "custom-user-42" });
    await caller.userProfile.getMyProfile();

    expect(mockGetUserProfile).toHaveBeenCalledWith("custom-user-42");
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.userProfile.getMyProfile()).rejects.toThrow();
  });
});

describe("userProfile.getMyTasks", () => {
  it("returns tasks with no filters", async () => {
    const tasks = [makeTask(), makeTask({ id: 2, title: "Review code" })];
    mockGetUserTasks.mockResolvedValue(tasks);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.getMyTasks();

    expect(result).toEqual(tasks);
    expect(mockGetUserTasks).toHaveBeenCalledWith("test-user-001", undefined);
  });

  it("passes filter options to the service", async () => {
    mockGetUserTasks.mockResolvedValue([]);

    const caller = createAuthenticatedCaller();
    const input = { status: "pending", taskType: "work_plan", startDate: "2026-03-01", endDate: "2026-03-31" };
    await caller.userProfile.getMyTasks(input);

    expect(mockGetUserTasks).toHaveBeenCalledWith("test-user-001", input);
  });

  it("returns empty array when no tasks", async () => {
    mockGetUserTasks.mockResolvedValue([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.getMyTasks();

    expect(result).toEqual([]);
  });

  it("accepts undefined input", async () => {
    mockGetUserTasks.mockResolvedValue([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.getMyTasks(undefined);

    expect(result).toEqual([]);
    expect(mockGetUserTasks).toHaveBeenCalledWith("test-user-001", undefined);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.userProfile.getMyTasks()).rejects.toThrow();
  });
});

describe("userProfile.getTodayTasks", () => {
  it("returns today's tasks", async () => {
    const tasks = [makeTask({ dueDate: "2026-03-01" })];
    mockGetTodayTasks.mockResolvedValue(tasks);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.getTodayTasks();

    expect(result).toEqual(tasks);
    expect(mockGetTodayTasks).toHaveBeenCalledWith("test-user-001");
  });

  it("returns empty array when no tasks today", async () => {
    mockGetTodayTasks.mockResolvedValue([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.getTodayTasks();

    expect(result).toEqual([]);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.userProfile.getTodayTasks()).rejects.toThrow();
  });
});

describe("userProfile.getOverdueTasks", () => {
  it("returns overdue tasks for the current user", async () => {
    const tasks = [makeTask({ status: "pending", dueDate: "2026-02-28" })];
    mockGetOverdueTasks.mockResolvedValue(tasks);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.getOverdueTasks();

    expect(result).toEqual(tasks);
    expect(mockGetOverdueTasks).toHaveBeenCalledWith("test-user-001");
  });

  it("returns empty when no overdue tasks", async () => {
    mockGetOverdueTasks.mockResolvedValue([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.getOverdueTasks();

    expect(result).toEqual([]);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.userProfile.getOverdueTasks()).rejects.toThrow();
  });
});

describe("userProfile.checkReminderTime", () => {
  it("returns isReminderTime=true when service says so", async () => {
    mockIsReminderTime.mockReturnValue(true);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.checkReminderTime();

    expect(result.isReminderTime).toBe(true);
    expect(result.targetTime).toBe("15:00");
    expect(typeof result.currentTime).toBe("string");
    expect(mockIsReminderTime).toHaveBeenCalledWith("15:00");
  });

  it("returns isReminderTime=false when not reminder time", async () => {
    mockIsReminderTime.mockReturnValue(false);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.checkReminderTime();

    expect(result.isReminderTime).toBe(false);
  });

  it("accepts custom targetTime", async () => {
    mockIsReminderTime.mockReturnValue(false);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.checkReminderTime({ targetTime: "09:30" });

    expect(result.targetTime).toBe("09:30");
    expect(mockIsReminderTime).toHaveBeenCalledWith("09:30");
  });

  it("accepts undefined input (uses default 15:00)", async () => {
    mockIsReminderTime.mockReturnValue(false);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.checkReminderTime(undefined);

    expect(result.targetTime).toBe("15:00");
    expect(mockIsReminderTime).toHaveBeenCalledWith("15:00");
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.userProfile.checkReminderTime()).rejects.toThrow();
  });
});

describe("userProfile.getReminderStats", () => {
  it("returns reminder statistics", async () => {
    const stats = { todayReminders: 10, pendingReminders: 5, failedReminders: 2 };
    mockGetReminderStats.mockResolvedValue(stats);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.getReminderStats();

    expect(result).toEqual(stats);
    expect(mockGetReminderStats).toHaveBeenCalledTimes(1);
  });

  it("returns zeroes when no stats", async () => {
    const stats = { todayReminders: 0, pendingReminders: 0, failedReminders: 0 };
    mockGetReminderStats.mockResolvedValue(stats);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.getReminderStats();

    expect(result).toEqual(stats);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.userProfile.getReminderStats()).rejects.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════
// MUTATIONS
// ══════════════════════════════════════════════════════════════

describe("userProfile.updateMyProfile", () => {
  it("updates profile with all optional fields", async () => {
    const updatedProfile = makeProfile({
      workPlanFrequency: "daily",
      emailDigestFrequency: "realtime",
    });
    mockUpsertUserProfile.mockResolvedValue(updatedProfile);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.updateMyProfile({
      workPlanFrequency: "daily",
      workPlanReminderEnabled: true,
      workPlanReminderTime: "08:00:00",
      trainingPlanEnabled: false,
      trainingReminderDaysBefore: 5,
      projectPlanEnabled: true,
      projectMilestoneReminder: false,
      performanceReportEnabled: true,
      performanceReportFrequency: "quarterly",
      taskReminderEnabled: true,
      taskReminderTime: "14:00:00",
      taskReminderEmail: true,
      taskReminderSystem: false,
      emailNotificationsEnabled: true,
      emailDigestFrequency: "realtime",
      employeeId: "EMP-999",
    });

    expect(result).toEqual(updatedProfile);
    expect(mockUpsertUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "test-user-001",
        workPlanFrequency: "daily",
        emailDigestFrequency: "realtime",
        employeeId: "EMP-999",
      })
    );
  });

  it("updates profile with minimal fields", async () => {
    const updatedProfile = makeProfile({ taskReminderEnabled: false });
    mockUpsertUserProfile.mockResolvedValue(updatedProfile);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.updateMyProfile({
      taskReminderEnabled: false,
    });

    expect(result).toEqual(updatedProfile);
    expect(mockUpsertUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "test-user-001", taskReminderEnabled: false })
    );
  });

  it("rejects invalid workPlanFrequency enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.userProfile.updateMyProfile({
        workPlanFrequency: "yearly" as any,
      })
    ).rejects.toThrow();
  });

  it("rejects invalid emailDigestFrequency enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.userProfile.updateMyProfile({
        emailDigestFrequency: "hourly" as any,
      })
    ).rejects.toThrow();
  });

  it("rejects invalid performanceReportFrequency enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.userProfile.updateMyProfile({
        performanceReportFrequency: "yearly" as any,
      })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.userProfile.updateMyProfile({ taskReminderEnabled: true })
    ).rejects.toThrow();
  });
});

describe("userProfile.createTask", () => {
  it("creates a task with required fields", async () => {
    const newTask = makeTask({ id: 10 });
    mockCreateUserTask.mockResolvedValue(newTask);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.createTask({
      taskType: "work_plan",
      title: "Complete daily report",
      dueDate: "2026-03-01",
    });

    expect(result).toEqual(newTask);
    expect(mockCreateUserTask).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "test-user-001",
        taskType: "work_plan",
        title: "Complete daily report",
        dueDate: "2026-03-01",
        priority: "medium",
        status: "pending",
      })
    );
  });

  it("creates a task with all optional fields", async () => {
    const newTask = makeTask({ id: 11, priority: "urgent", taskType: "project" });
    mockCreateUserTask.mockResolvedValue(newTask);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.createTask({
      taskType: "project",
      title: "Milestone review",
      description: "Review M3 deliverables",
      dueDate: "2026-03-15",
      dueTime: "10:00:00",
      priority: "urgent",
      relatedProjectId: "proj-001",
      relatedTrainingId: "train-001",
    });

    expect(result).toEqual(newTask);
    expect(mockCreateUserTask).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "test-user-001",
        priority: "urgent",
        status: "pending",
        relatedProjectId: "proj-001",
        relatedTrainingId: "train-001",
      })
    );
  });

  it("defaults priority to 'medium' when not provided", async () => {
    mockCreateUserTask.mockResolvedValue(makeTask());

    const caller = createAuthenticatedCaller();
    await caller.userProfile.createTask({
      taskType: "training",
      title: "Attend safety training",
      dueDate: "2026-03-10",
    });

    expect(mockCreateUserTask).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "medium" })
    );
  });

  it("always sets status to 'pending'", async () => {
    mockCreateUserTask.mockResolvedValue(makeTask());

    const caller = createAuthenticatedCaller();
    await caller.userProfile.createTask({
      taskType: "report",
      title: "Monthly report",
      dueDate: "2026-03-31",
      priority: "high",
    });

    expect(mockCreateUserTask).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" })
    );
  });

  it("rejects invalid taskType enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.userProfile.createTask({
        taskType: "invalid_type" as any,
        title: "Test",
        dueDate: "2026-03-01",
      })
    ).rejects.toThrow();
  });

  it("rejects invalid priority enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.userProfile.createTask({
        taskType: "work_plan",
        title: "Test",
        dueDate: "2026-03-01",
        priority: "critical" as any,
      })
    ).rejects.toThrow();
  });

  it("rejects missing required title", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.userProfile.createTask as any)({
        taskType: "work_plan",
        dueDate: "2026-03-01",
      })
    ).rejects.toThrow();
  });

  it("rejects missing required dueDate", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.userProfile.createTask as any)({
        taskType: "work_plan",
        title: "Test",
      })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.userProfile.createTask({
        taskType: "work_plan",
        title: "Test",
        dueDate: "2026-03-01",
      })
    ).rejects.toThrow();
  });

  it("accepts all six taskType enum values", async () => {
    const taskTypes = ["work_plan", "training", "project", "performance", "report", "other"] as const;
    for (const taskType of taskTypes) {
      mockCreateUserTask.mockResolvedValue(makeTask({ taskType }));

      const caller = createAuthenticatedCaller();
      const result = await caller.userProfile.createTask({
        taskType,
        title: `Task of type ${taskType}`,
        dueDate: "2026-03-01",
      });

      expect(result.taskType).toBe(taskType);
    }
  });
});

describe("userProfile.updateTaskStatus", () => {
  it("updates task status and returns success", async () => {
    mockUpdateTaskStatus.mockResolvedValue(undefined);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.updateTaskStatus({
      taskId: 1,
      status: "completed",
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdateTaskStatus).toHaveBeenCalledWith(1, "completed");
  });

  it("accepts all five status enum values", async () => {
    const statuses = ["pending", "in_progress", "completed", "overdue", "cancelled"] as const;
    for (const status of statuses) {
      mockUpdateTaskStatus.mockResolvedValue(undefined);

      const caller = createAuthenticatedCaller();
      const result = await caller.userProfile.updateTaskStatus({
        taskId: 42,
        status,
      });

      expect(result).toEqual({ success: true });
      expect(mockUpdateTaskStatus).toHaveBeenCalledWith(42, status);
    }
  });

  it("rejects invalid status enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.userProfile.updateTaskStatus({
        taskId: 1,
        status: "invalid" as any,
      })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.userProfile.updateTaskStatus({ taskId: 1, status: "completed" })
    ).rejects.toThrow();
  });
});

describe("userProfile.sendTaskReminders", () => {
  it("sends reminders for all tasks successfully", async () => {
    const tasks = [
      makeTask({ id: 1, userId: "user-1", title: "Task 1" }),
      makeTask({ id: 2, userId: "user-2", title: "Task 2" }),
    ];
    mockGetTasksNeedingReminder.mockResolvedValue(tasks);
    mockMarkReminderSent.mockResolvedValue(undefined);
    mockLogReminder.mockResolvedValue(undefined);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.sendTaskReminders();

    expect(result).toEqual({ totalTasks: 2, sent: 2, failed: 0 });
    expect(mockGetTasksNeedingReminder).toHaveBeenCalledWith("15:00:00");
    expect(mockMarkReminderSent).toHaveBeenCalledTimes(2);
    expect(mockMarkReminderSent).toHaveBeenCalledWith(1);
    expect(mockMarkReminderSent).toHaveBeenCalledWith(2);
    expect(mockLogReminder).toHaveBeenCalledTimes(2);
    expect(mockLogReminder).toHaveBeenCalledWith("user-1", 1, "email", "sent");
    expect(mockLogReminder).toHaveBeenCalledWith("user-2", 2, "email", "sent");
  });

  it("handles mixed success and failure (1 succeeds, 1 fails)", async () => {
    const tasks = [
      makeTask({ id: 10, userId: "user-a", title: "Succeeds" }),
      makeTask({ id: 20, userId: "user-b", title: "Fails" }),
    ];
    mockGetTasksNeedingReminder.mockResolvedValue(tasks);

    // First task: markReminderSent succeeds
    mockMarkReminderSent
      .mockResolvedValueOnce(undefined)
      // Second task: markReminderSent fails
      .mockRejectedValueOnce(new Error("DB write failure"));

    mockLogReminder.mockResolvedValue(undefined);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.sendTaskReminders();

    expect(result).toEqual({ totalTasks: 2, sent: 1, failed: 1 });
    // First task: success log
    expect(mockLogReminder).toHaveBeenCalledWith("user-a", 10, "email", "sent");
    // Second task: failure log
    expect(mockLogReminder).toHaveBeenCalledWith("user-b", 20, "email", "failed", "Error: DB write failure");
  });

  it("returns all failed when every task throws", async () => {
    const tasks = [
      makeTask({ id: 1, userId: "user-1" }),
      makeTask({ id: 2, userId: "user-2" }),
    ];
    mockGetTasksNeedingReminder.mockResolvedValue(tasks);
    mockMarkReminderSent.mockRejectedValue(new Error("total failure"));
    mockLogReminder.mockResolvedValue(undefined);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.sendTaskReminders();

    expect(result).toEqual({ totalTasks: 2, sent: 0, failed: 2 });
  });

  it("returns zero totals when no tasks need reminders", async () => {
    mockGetTasksNeedingReminder.mockResolvedValue([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.sendTaskReminders();

    expect(result).toEqual({ totalTasks: 0, sent: 0, failed: 0 });
    expect(mockMarkReminderSent).not.toHaveBeenCalled();
    expect(mockLogReminder).not.toHaveBeenCalled();
  });

  it("uses custom reminderTime when provided", async () => {
    mockGetTasksNeedingReminder.mockResolvedValue([]);

    const caller = createAuthenticatedCaller();
    await caller.userProfile.sendTaskReminders({ reminderTime: "09:00:00" });

    expect(mockGetTasksNeedingReminder).toHaveBeenCalledWith("09:00:00");
  });

  it("defaults reminderTime to 15:00:00 when not provided", async () => {
    mockGetTasksNeedingReminder.mockResolvedValue([]);

    const caller = createAuthenticatedCaller();
    await caller.userProfile.sendTaskReminders();

    expect(mockGetTasksNeedingReminder).toHaveBeenCalledWith("15:00:00");
  });

  it("accepts undefined input (uses default reminderTime)", async () => {
    mockGetTasksNeedingReminder.mockResolvedValue([]);

    const caller = createAuthenticatedCaller();
    await caller.userProfile.sendTaskReminders(undefined);

    expect(mockGetTasksNeedingReminder).toHaveBeenCalledWith("15:00:00");
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.userProfile.sendTaskReminders()).rejects.toThrow();
  });
});

describe("userProfile.sendDailyReminders", () => {
  it("delegates to emailReminderService.sendTaskReminderEmails", async () => {
    const sendResult = { total: 5, sent: 4, failed: 1, details: [] };
    mockSendTaskReminderEmails.mockResolvedValue(sendResult);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.sendDailyReminders();

    expect(result).toEqual(sendResult);
    expect(mockSendTaskReminderEmails).toHaveBeenCalledTimes(1);
  });

  it("returns zero counts when no users to remind", async () => {
    const sendResult = { total: 0, sent: 0, failed: 0, details: [] };
    mockSendTaskReminderEmails.mockResolvedValue(sendResult);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.sendDailyReminders();

    expect(result).toEqual(sendResult);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.userProfile.sendDailyReminders()).rejects.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════
// INPUT VALIDATION EDGE CASES
// ══════════════════════════════════════════════════════════════

describe("userProfile - input validation edge cases", () => {
  it("getMyTasks accepts partial filters", async () => {
    mockGetUserTasks.mockResolvedValue([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.getMyTasks({ status: "completed" });

    expect(result).toEqual([]);
    expect(mockGetUserTasks).toHaveBeenCalledWith("test-user-001", { status: "completed" });
  });

  it("createTask with all six task types passes validation", async () => {
    const types = ["work_plan", "training", "project", "performance", "report", "other"] as const;
    for (const t of types) {
      mockCreateUserTask.mockResolvedValue(makeTask({ taskType: t }));
      const caller = createAuthenticatedCaller();
      await expect(
        caller.userProfile.createTask({ taskType: t, title: "Test", dueDate: "2026-03-01" })
      ).resolves.toBeDefined();
    }
  });

  it("updateMyProfile with empty object is valid", async () => {
    mockUpsertUserProfile.mockResolvedValue(makeProfile());

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.updateMyProfile({});

    expect(result).toBeDefined();
    expect(mockUpsertUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "test-user-001" })
    );
  });

  it("updateTaskStatus rejects non-numeric taskId", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.userProfile.updateTaskStatus as any)({
        taskId: "not-a-number",
        status: "completed",
      })
    ).rejects.toThrow();
  });

  it("sendTaskReminders accepts empty object input", async () => {
    mockGetTasksNeedingReminder.mockResolvedValue([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.sendTaskReminders({});

    expect(result).toEqual({ totalTasks: 0, sent: 0, failed: 0 });
    expect(mockGetTasksNeedingReminder).toHaveBeenCalledWith("15:00:00");
  });

  it("checkReminderTime accepts empty object input", async () => {
    mockIsReminderTime.mockReturnValue(false);

    const caller = createAuthenticatedCaller();
    const result = await caller.userProfile.checkReminderTime({});

    expect(result.targetTime).toBe("15:00");
  });
});
