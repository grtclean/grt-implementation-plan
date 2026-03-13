/**
 * DevTasks Router — Unit Tests
 * Tests 7 procedures: list, getById, create, update, delete, init, deleteTestTasks
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

/* ── hoisted mock references ── */
const {
  mockCreateDevTask,
  mockGetAllDevTasks,
  mockGetDevTaskById,
  mockUpdateDevTask,
  mockDeleteDevTask,
  mockInitDefaultDevTasks,
} = vi.hoisted(() => ({
  mockCreateDevTask: vi.fn(),
  mockGetAllDevTasks: vi.fn(),
  mockGetDevTaskById: vi.fn(),
  mockUpdateDevTask: vi.fn(),
  mockDeleteDevTask: vi.fn(),
  mockInitDefaultDevTasks: vi.fn(),
}));

vi.mock("../db", () => ({
  createDevTask: mockCreateDevTask,
  getAllDevTasks: mockGetAllDevTasks,
  getDevTaskById: mockGetDevTaskById,
  updateDevTask: mockUpdateDevTask,
  deleteDevTask: mockDeleteDevTask,
  initDefaultDevTasks: mockInitDefaultDevTasks,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const caller = () => createAdminCaller();

const sampleTask = {
  id: 1,
  taskCode: "DEV-001",
  title: "Implement login page",
  description: "Build the login page with OAuth",
  version: "v1.0",
  module: "auth",
  type: "feature",
  priority: "high",
  status: "backlog",
  estimatedHours: 8,
  actualHours: null,
  claudePrompt: "Create a login page with OAuth support",
  acceptanceCriteria: "User can log in via OAuth",
  assignee: "dev-01",
  dueDate: "2026-03-15",
  startDate: null,
  completedDate: null,
  createdAt: "2026-03-01",
  updatedAt: "2026-03-01",
};

describe("devTasks router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns all tasks as an array", async () => {
      mockGetAllDevTasks.mockResolvedValue([sampleTask, { ...sampleTask, id: 2 }]);
      const result = await caller().devTasks.list();
      expect(result).toHaveLength(2);
      expect(mockGetAllDevTasks).toHaveBeenCalledWith({});
    });

    it("passes filters to getAllDevTasks", async () => {
      mockGetAllDevTasks.mockResolvedValue([sampleTask]);
      const filters = { version: "v1.0", module: "auth", status: "backlog", priority: "high", search: "login" };
      const result = await caller().devTasks.list(filters);
      expect(result).toHaveLength(1);
      expect(mockGetAllDevTasks).toHaveBeenCalledWith(filters);
    });

    it("returns empty array when no input provided", async () => {
      mockGetAllDevTasks.mockResolvedValue([]);
      const result = await caller().devTasks.list();
      expect(result).toEqual([]);
      expect(mockGetAllDevTasks).toHaveBeenCalledWith({});
    });

    it("returns empty array on error", async () => {
      mockGetAllDevTasks.mockRejectedValue(new Error("DB error"));
      const result = await caller().devTasks.list();
      expect(result).toEqual([]);
    });

    it("returns empty array when getAllDevTasks returns non-array", async () => {
      mockGetAllDevTasks.mockResolvedValue("not-an-array");
      const result = await caller().devTasks.list();
      expect(result).toEqual([]);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns task by id", async () => {
      mockGetDevTaskById.mockResolvedValue(sampleTask);
      const result = await caller().devTasks.getById({ id: 1 });
      expect(result).toEqual(sampleTask);
      expect(mockGetDevTaskById).toHaveBeenCalledWith(1);
    });

    it("returns null when task not found", async () => {
      mockGetDevTaskById.mockResolvedValue(null);
      const result = await caller().devTasks.getById({ id: 999 });
      expect(result).toBeNull();
    });

    it("returns null on error", async () => {
      mockGetDevTaskById.mockRejectedValue(new Error("DB error"));
      const result = await caller().devTasks.getById({ id: 1 });
      expect(result).toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates a task with required fields", async () => {
      const created = { ...sampleTask, id: 10 };
      mockCreateDevTask.mockResolvedValue(created);

      const result = await caller().devTasks.create({
        title: "Implement login page",
        version: "v1.0",
        module: "auth",
      });
      expect(result).toEqual(created);
      expect(mockCreateDevTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Implement login page",
          version: "v1.0",
          module: "auth",
          type: "feature",
          priority: "medium",
          status: "backlog",
          description: null,
          estimatedHours: null,
          claudePrompt: null,
          acceptanceCriteria: null,
          dueDate: null,
        }),
      );
    });

    it("creates a task with all optional fields", async () => {
      const created = { ...sampleTask, id: 11 };
      mockCreateDevTask.mockResolvedValue(created);

      const result = await caller().devTasks.create({
        title: "Fix bug",
        version: "v1.1",
        module: "core",
        type: "bugfix",
        priority: "critical",
        description: "Critical bug in core",
        estimatedHours: 4,
        claudePrompt: "Fix the core bug",
        acceptanceCriteria: "Bug is fixed",
        assignee: "dev-02",
        dueDate: "2026-04-01",
      });
      expect(result).toEqual(created);
      expect(mockCreateDevTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Fix bug",
          type: "bugfix",
          priority: "critical",
          description: "Critical bug in core",
          estimatedHours: 4,
          claudePrompt: "Fix the core bug",
          acceptanceCriteria: "Bug is fixed",
          dueDate: "2026-04-01",
          status: "backlog",
        }),
      );
    });

    it("defaults type to 'feature' and priority to 'medium'", async () => {
      mockCreateDevTask.mockResolvedValue({ ...sampleTask, id: 12 });

      await caller().devTasks.create({
        title: "New feature",
        version: "v1.0",
        module: "ui",
      });
      expect(mockCreateDevTask).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "feature",
          priority: "medium",
        }),
      );
    });

    it("rejects empty title", async () => {
      await expect(
        caller().devTasks.create({
          title: "",
          version: "v1.0",
          module: "auth",
        }),
      ).rejects.toThrow();
    });

    it("rejects invalid type enum value", async () => {
      await expect(
        caller().devTasks.create({
          title: "Bad type",
          version: "v1.0",
          module: "auth",
          type: "invalid" as any,
        }),
      ).rejects.toThrow();
    });

    it("rejects invalid priority enum value", async () => {
      await expect(
        caller().devTasks.create({
          title: "Bad priority",
          version: "v1.0",
          module: "auth",
          priority: "urgent" as any,
        }),
      ).rejects.toThrow();
    });

    it("re-throws on DB error", async () => {
      mockCreateDevTask.mockRejectedValue(new Error("Insert failed"));
      await expect(
        caller().devTasks.create({
          title: "Will fail",
          version: "v1.0",
          module: "auth",
        }),
      ).rejects.toThrow("Insert failed");
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates basic fields", async () => {
      const updated = { ...sampleTask, title: "Updated title" };
      mockUpdateDevTask.mockResolvedValue(updated);

      const result = await caller().devTasks.update({
        id: 1,
        title: "Updated title",
      });
      expect(result).toEqual(updated);
      expect(mockUpdateDevTask).toHaveBeenCalledWith(1, { title: "Updated title" });
    });

    it("converts date strings to Date objects", async () => {
      mockUpdateDevTask.mockResolvedValue({ ...sampleTask, status: "done" });

      await caller().devTasks.update({
        id: 1,
        status: "done",
        startDate: "2026-03-01",
        completedDate: "2026-03-10",
        dueDate: "2026-03-15",
      });

      expect(mockUpdateDevTask).toHaveBeenCalledWith(1, {
        status: "done",
        startDate: new Date("2026-03-01"),
        completedDate: new Date("2026-03-10"),
        dueDate: new Date("2026-03-15"),
      });
    });

    it("does not include date fields when not provided", async () => {
      mockUpdateDevTask.mockResolvedValue({ ...sampleTask, priority: "low" });

      await caller().devTasks.update({ id: 1, priority: "low" });

      expect(mockUpdateDevTask).toHaveBeenCalledWith(1, { priority: "low" });
    });

    it("rejects invalid status enum", async () => {
      await expect(
        caller().devTasks.update({ id: 1, status: "invalid" as any }),
      ).rejects.toThrow();
    });

    it("rejects invalid type enum", async () => {
      await expect(
        caller().devTasks.update({ id: 1, type: "invalid" as any }),
      ).rejects.toThrow();
    });

    it("rejects invalid priority enum", async () => {
      await expect(
        caller().devTasks.update({ id: 1, priority: "urgent" as any }),
      ).rejects.toThrow();
    });

    it("re-throws on DB error", async () => {
      mockUpdateDevTask.mockRejectedValue(new Error("Update failed"));
      await expect(
        caller().devTasks.update({ id: 1, title: "X" }),
      ).rejects.toThrow("Update failed");
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes a task by id", async () => {
      mockDeleteDevTask.mockResolvedValue({ success: true });
      const result = await caller().devTasks.delete({ id: 1 });
      expect(result).toEqual({ success: true });
      expect(mockDeleteDevTask).toHaveBeenCalledWith(1);
    });

    it("re-throws on DB error", async () => {
      mockDeleteDevTask.mockRejectedValue(new Error("Delete failed"));
      await expect(
        caller().devTasks.delete({ id: 1 }),
      ).rejects.toThrow("Delete failed");
    });
  });

  // ═══ init ═══
  describe("init", () => {
    it("initializes default dev tasks", async () => {
      const initResult = { created: 10 };
      mockInitDefaultDevTasks.mockResolvedValue(initResult);
      const result = await caller().devTasks.init();
      expect(result).toEqual(initResult);
      expect(mockInitDefaultDevTasks).toHaveBeenCalledOnce();
    });

    it("re-throws on DB error", async () => {
      mockInitDefaultDevTasks.mockRejectedValue(new Error("Init failed"));
      await expect(caller().devTasks.init()).rejects.toThrow("Init failed");
    });
  });

  // ═══ deleteTestTasks ═══
  describe("deleteTestTasks", () => {
    it("deletes tasks matching 'test task' in title", async () => {
      mockGetAllDevTasks.mockResolvedValue([
        { ...sampleTask, id: 1, title: "Implement login page" },
        { ...sampleTask, id: 2, title: "Test Task: verify auth" },
        { ...sampleTask, id: 3, title: "Another test task here" },
      ]);
      mockDeleteDevTask.mockResolvedValue({ success: true });

      const result = await caller().devTasks.deleteTestTasks();
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(mockDeleteDevTask).toHaveBeenCalledTimes(2);
      expect(mockDeleteDevTask).toHaveBeenCalledWith(2);
      expect(mockDeleteDevTask).toHaveBeenCalledWith(3);
    });

    it("deletes tasks matching 'task to update' in title", async () => {
      mockGetAllDevTasks.mockResolvedValue([
        { ...sampleTask, id: 1, title: "Task to update something" },
        { ...sampleTask, id: 2, title: "Normal task" },
      ]);
      mockDeleteDevTask.mockResolvedValue({ success: true });

      const result = await caller().devTasks.deleteTestTasks();
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(mockDeleteDevTask).toHaveBeenCalledWith(1);
    });

    it("returns 0 deletedCount when no test tasks exist", async () => {
      mockGetAllDevTasks.mockResolvedValue([
        { ...sampleTask, id: 1, title: "Real feature" },
        { ...sampleTask, id: 2, title: "Another real task" },
      ]);

      const result = await caller().devTasks.deleteTestTasks();
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(0);
      expect(mockDeleteDevTask).not.toHaveBeenCalled();
    });

    it("returns 0 deletedCount when task list is empty", async () => {
      mockGetAllDevTasks.mockResolvedValue([]);

      const result = await caller().devTasks.deleteTestTasks();
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(0);
    });

    it("includes message with count in result", async () => {
      mockGetAllDevTasks.mockResolvedValue([
        { ...sampleTask, id: 5, title: "test task 1" },
      ]);
      mockDeleteDevTask.mockResolvedValue({ success: true });

      const result = await caller().devTasks.deleteTestTasks();
      expect(result.message).toContain("1");
    });

    it("re-throws on DB error from getAllDevTasks", async () => {
      mockGetAllDevTasks.mockRejectedValue(new Error("Fetch failed"));
      await expect(caller().devTasks.deleteTestTasks()).rejects.toThrow("Fetch failed");
    });

    it("re-throws on DB error from deleteDevTask", async () => {
      mockGetAllDevTasks.mockResolvedValue([
        { ...sampleTask, id: 1, title: "test task" },
      ]);
      mockDeleteDevTask.mockRejectedValue(new Error("Delete failed"));
      await expect(caller().devTasks.deleteTestTasks()).rejects.toThrow("Delete failed");
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().devTasks.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().devTasks.getById({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(
        createAnonymousCaller().devTasks.create({
          title: "X",
          version: "v1.0",
          module: "auth",
        }),
      ).rejects.toThrow();
    });
    it("rejects anonymous for update", async () => {
      await expect(
        createAnonymousCaller().devTasks.update({ id: 1, title: "X" }),
      ).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().devTasks.delete({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for init", async () => {
      await expect(createAnonymousCaller().devTasks.init()).rejects.toThrow();
    });
    it("rejects anonymous for deleteTestTasks", async () => {
      await expect(createAnonymousCaller().devTasks.deleteTestTasks()).rejects.toThrow();
    });
  });
});
