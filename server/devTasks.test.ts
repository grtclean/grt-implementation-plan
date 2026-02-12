import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

// Mock db functions
vi.mock("./db", () => ({
  getAllDevTasks: vi.fn().mockResolvedValue([
    {
      id: 1,
      taskCode: "TASK-0001",
      title: "Test Task 1",
      description: "Test description",
      version: "v1.1",
      module: "crm",
      type: "feature",
      priority: "medium",
      status: "backlog",
      estimatedHours: 8,
      actualHours: null,
      claudePrompt: "Test prompt",
      acceptanceCriteria: "Test criteria",
      startDate: null,
      completedDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      taskCode: "TASK-0002",
      title: "Test Task 2",
      description: null,
      version: "v1.2",
      module: "project",
      type: "bugfix",
      priority: "high",
      status: "in_progress",
      estimatedHours: 4,
      actualHours: 2,
      claudePrompt: null,
      acceptanceCriteria: null,
      startDate: new Date(),
      completedDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getDevTaskById: vi.fn().mockResolvedValue({
    id: 1,
    taskCode: "TASK-0001",
    title: "Test Task 1",
    status: "backlog",
  }),
  createDevTask: vi.fn().mockResolvedValue({ id: 3, taskCode: "TASK-0003" }),
  updateDevTask: vi.fn().mockResolvedValue({ success: true }),
  deleteDevTask: vi.fn().mockResolvedValue({ success: true }),
  initDefaultDevTasks: vi.fn().mockResolvedValue({ success: true, message: "Tasks initialized" }),
}));

// Create mock contexts
const createAuthContext = () => ({
  user: { id: "test-user", name: "Test User", role: "admin" },
  req: {} as any,
  res: {} as any,
});

const createUnauthContext = () => ({
  user: null,
  req: {} as any,
  res: {} as any,
});

describe("devTasks Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("returns an array of tasks for authenticated users", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      const result = await caller.devTasks.list({});
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].title).toBe("Test Task 1");
    });

    it("returns an array even with filters", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      const result = await caller.devTasks.list({
        version: "v1.1",
        module: "crm",
      });
      
      expect(Array.isArray(result)).toBe(true);
    });

    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.devTasks.list({})).rejects.toThrow();
    });
  });

  describe("getById", () => {
    it("returns a single task for authenticated users", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      const result = await caller.devTasks.getById({ id: 1 });
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
    });

    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.devTasks.getById({ id: 1 })).rejects.toThrow();
    });
  });

  describe("create", () => {
    it("creates a new task for authenticated users", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      const result = await caller.devTasks.create({
        title: "New Task",
        version: "v1.1",
        module: "crm",
        type: "feature",
        priority: "medium",
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBe(3);
    });

    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.devTasks.create({
          title: "New Task",
          version: "v1.1",
          module: "crm",
          type: "feature",
          priority: "medium",
        })
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("updates a task for authenticated users", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      const result = await caller.devTasks.update({
        id: 1,
        status: "in_progress",
      });
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });

    it("handles date fields correctly", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      const result = await caller.devTasks.update({
        id: 1,
        status: "done",
        completedDate: new Date().toISOString(),
      });
      
      expect(result?.success).toBe(true);
    });

    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.devTasks.update({ id: 1, status: "done" })
      ).rejects.toThrow();
    });
  });

  describe("delete", () => {
    it("deletes a task for authenticated users", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      const result = await caller.devTasks.delete({ id: 1 });
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });

    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.devTasks.delete({ id: 1 })).rejects.toThrow();
    });
  });

  describe("init", () => {
    it("initializes default tasks for authenticated users", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      const result = await caller.devTasks.init();
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });

    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.devTasks.init()).rejects.toThrow();
    });
  });
});

describe("devTasks API Response Format", () => {
  it("list endpoint always returns an array, not an object", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.devTasks.list({});
    
    // This is the critical test - ensure we return an array, not { items: [], total: 0, ... }
    expect(Array.isArray(result)).toBe(true);
    expect(result).not.toHaveProperty("items");
    expect(result).not.toHaveProperty("total");
    expect(result).not.toHaveProperty("page");
  });

  it("tasks in the array have expected properties", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.devTasks.list({});
    
    if (result.length > 0) {
      const task = result[0];
      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("title");
      expect(task).toHaveProperty("status");
      expect(task).toHaveProperty("version");
      expect(task).toHaveProperty("module");
    }
  });
});
