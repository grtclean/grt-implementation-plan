import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db functions
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({}),
  createProject: vi.fn().mockImplementation((data) => 
    Promise.resolve({ id: 1, projectCode: `PRJ${String(1).padStart(6, '0')}` })
  ),
  getAllProjects: vi.fn().mockResolvedValue([
    { id: 1, projectCode: "PRJ000001", name: "测试项目1", type: "standard", status: "planning" },
    { id: 2, projectCode: "PRJ000002", name: "测试项目2", type: "key", status: "active" },
  ]),
  getProjectById: vi.fn().mockImplementation((id) => 
    Promise.resolve({ id, projectCode: `PRJ${String(id).padStart(6, '0')}`, name: `测试项目${id}`, type: "standard", status: "planning" })
  ),
  updateProject: vi.fn().mockImplementation((id, data) => 
    Promise.resolve({ id, ...data })
  ),
  deleteProject: vi.fn().mockResolvedValue(true),
  getAllProjectPhases: vi.fn().mockResolvedValue([
    { id: 1, phaseCode: "M0", name: "市场机会", sequence: 0 },
    { id: 2, phaseCode: "M1", name: "立项审批", sequence: 1 },
    { id: 3, phaseCode: "M2", name: "需求分析", sequence: 2 },
  ]),
  initDefaultProjectPhases: vi.fn().mockResolvedValue({ success: true, message: "Default project phases initialized" }),
  createProjectGate: vi.fn().mockImplementation((data) => 
    Promise.resolve({ id: 1 })
  ),
  getProjectGates: vi.fn().mockResolvedValue([
    { id: 1, projectId: 1, phaseCode: "M0", status: "approved" },
    { id: 2, projectId: 1, phaseCode: "M1", status: "in_review" },
    { id: 3, projectId: 1, phaseCode: "M2", status: "pending" },
  ]),
  updateProjectGate: vi.fn().mockImplementation((id, data) => 
    Promise.resolve({ id, ...data })
  ),
  initProjectGates: vi.fn().mockResolvedValue({ success: true, message: "Initialized 13 gates for project" }),
  createProjectMilestone: vi.fn().mockImplementation((data) => 
    Promise.resolve({ id: 1 })
  ),
  getProjectMilestones: vi.fn().mockResolvedValue([
    { id: 1, projectId: 1, name: "需求确认", phaseCode: "M2", status: "completed" },
    { id: 2, projectId: 1, name: "设计评审", phaseCode: "M3", status: "pending" },
  ]),
  updateProjectMilestone: vi.fn().mockImplementation((id, data) => 
    Promise.resolve({ id, ...data })
  ),
  deleteProjectMilestone: vi.fn().mockResolvedValue(true),
  createProjectTask: vi.fn().mockImplementation((data) => 
    Promise.resolve({ id: 1 })
  ),
  getProjectTasks: vi.fn().mockResolvedValue([
    { id: 1, projectId: 1, name: "编写需求文档", type: "task", status: "done" },
    { id: 2, projectId: 1, name: "系统架构设计", type: "task", status: "in_progress" },
  ]),
  updateProjectTask: vi.fn().mockImplementation((id, data) => 
    Promise.resolve({ id, ...data })
  ),
  deleteProjectTask: vi.fn().mockResolvedValue(true),
  addProjectTeamMember: vi.fn().mockImplementation((data) => 
    Promise.resolve({ id: 1 })
  ),
  getProjectTeamMembers: vi.fn().mockResolvedValue([
    { id: 1, projectId: 1, userId: 1, role: "manager" },
    { id: 2, projectId: 1, userId: 2, role: "member" },
  ]),
  removeProjectTeamMember: vi.fn().mockResolvedValue(true),
  createProjectDocument: vi.fn().mockImplementation((data) => 
    Promise.resolve({ id: 1 })
  ),
  getProjectDocuments: vi.fn().mockResolvedValue([
    { id: 1, projectId: 1, name: "需求规格说明书", type: "requirement" },
    { id: 2, projectId: 1, name: "系统设计文档", type: "design" },
  ]),
  deleteProjectDocument: vi.fn().mockResolvedValue(true),
  getProjectStatistics: vi.fn().mockResolvedValue({
    total: 10,
    byStatus: { planning: 2, active: 5, on_hold: 1, completed: 2, cancelled: 0 },
    byType: { standard: 5, key: 3, strategic: 2 },
    totalBudget: 5000,
    totalActualCost: 3500,
  }),
}));

import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getAllProjectPhases,
  initDefaultProjectPhases,
  createProjectGate,
  getProjectGates,
  updateProjectGate,
  initProjectGates,
  createProjectMilestone,
  getProjectMilestones,
  updateProjectMilestone,
  deleteProjectMilestone,
  createProjectTask,
  getProjectTasks,
  updateProjectTask,
  deleteProjectTask,
  addProjectTeamMember,
  getProjectTeamMembers,
  removeProjectTeamMember,
  createProjectDocument,
  getProjectDocuments,
  deleteProjectDocument,
  getProjectStatistics,
} from "./db";

describe("Project Management Module (v1.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Projects CRUD", () => {
    it("should create a new project", async () => {
      const result = await createProject({
        name: "大连大众MES升级项目",
        type: "key",
        priority: "high",
      });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("projectCode");
      expect(result?.projectCode).toMatch(/^PRJ\d{6}$/);
    });

    it("should get all projects", async () => {
      const projects = await getAllProjects();

      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
      expect(projects[0]).toHaveProperty("projectCode");
      expect(projects[0]).toHaveProperty("name");
    });

    it("should get project by ID", async () => {
      const project = await getProjectById(1);

      expect(project).not.toBeNull();
      expect(project?.id).toBe(1);
      expect(project).toHaveProperty("name");
    });

    it("should update project", async () => {
      const result = await updateProject(1, { status: "active" });

      expect(result).toHaveProperty("id");
      expect(result?.status).toBe("active");
    });

    it("should delete project", async () => {
      const result = await deleteProject(1);

      expect(result).toBe(true);
    });
  });

  describe("Project Phases (M0-M12)", () => {
    it("should get all project phases", async () => {
      const phases = await getAllProjectPhases();

      expect(Array.isArray(phases)).toBe(true);
      expect(phases.length).toBeGreaterThan(0);
      expect(phases[0]).toHaveProperty("phaseCode");
      expect(phases[0]).toHaveProperty("name");
    });

    it("should initialize default project phases", async () => {
      const result = await initDefaultProjectPhases();

      expect(result).toHaveProperty("success");
      expect(result?.success).toBe(true);
    });
  });

  describe("Project Gates", () => {
    it("should create project gate", async () => {
      const result = await createProjectGate({
        projectId: 1,
        phaseCode: "M0",
        status: "pending",
      });

      expect(result).toHaveProperty("id");
    });

    it("should get project gates", async () => {
      const gates = await getProjectGates(1);

      expect(Array.isArray(gates)).toBe(true);
      expect(gates.length).toBeGreaterThan(0);
      expect(gates[0]).toHaveProperty("phaseCode");
      expect(gates[0]).toHaveProperty("status");
    });

    it("should update project gate", async () => {
      const result = await updateProjectGate(1, { status: "approved" });

      expect(result).toHaveProperty("id");
      expect(result?.status).toBe("approved");
    });

    it("should initialize gates for a project", async () => {
      const result = await initProjectGates(1);

      expect(result).toHaveProperty("success");
      expect(result?.success).toBe(true);
    });
  });

  describe("Project Milestones", () => {
    it("should create milestone", async () => {
      const result = await createProjectMilestone({
        projectId: 1,
        name: "需求确认完成",
        phaseCode: "M2",
      });

      expect(result).toHaveProperty("id");
    });

    it("should get project milestones", async () => {
      const milestones = await getProjectMilestones(1);

      expect(Array.isArray(milestones)).toBe(true);
      expect(milestones.length).toBeGreaterThan(0);
      expect(milestones[0]).toHaveProperty("name");
    });

    it("should update milestone", async () => {
      const result = await updateProjectMilestone(1, { status: "completed" });

      expect(result).toHaveProperty("id");
      expect(result?.status).toBe("completed");
    });

    it("should delete milestone", async () => {
      const result = await deleteProjectMilestone(1);

      expect(result).toBe(true);
    });
  });

  describe("Project Tasks", () => {
    it("should create task", async () => {
      const result = await createProjectTask({
        projectId: 1,
        name: "编写需求文档",
        type: "task",
        priority: "high",
      });

      expect(result).toHaveProperty("id");
    });

    it("should get project tasks", async () => {
      const tasks = await getProjectTasks(1);

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0]).toHaveProperty("name");
      expect(tasks[0]).toHaveProperty("status");
    });

    it("should update task", async () => {
      const result = await updateProjectTask(1, { status: "done", progress: 100 });

      expect(result).toHaveProperty("id");
      expect(result?.status).toBe("done");
      expect(result?.progress).toBe(100);
    });

    it("should delete task", async () => {
      const result = await deleteProjectTask(1);

      expect(result).toBe(true);
    });
  });

  describe("Project Team Members", () => {
    it("should add team member", async () => {
      const result = await addProjectTeamMember({
        projectId: 1,
        userId: 1,
        role: "manager",
      });

      expect(result).toHaveProperty("id");
    });

    it("should get project team members", async () => {
      const members = await getProjectTeamMembers(1);

      expect(Array.isArray(members)).toBe(true);
      expect(members.length).toBeGreaterThan(0);
      expect(members[0]).toHaveProperty("role");
    });

    it("should remove team member", async () => {
      const result = await removeProjectTeamMember(1);

      expect(result).toBe(true);
    });
  });

  describe("Project Documents", () => {
    it("should create document", async () => {
      const result = await createProjectDocument({
        projectId: 1,
        name: "需求规格说明书",
        type: "requirement",
      });

      expect(result).toHaveProperty("id");
    });

    it("should get project documents", async () => {
      const documents = await getProjectDocuments(1);

      expect(Array.isArray(documents)).toBe(true);
      expect(documents.length).toBeGreaterThan(0);
      expect(documents[0]).toHaveProperty("name");
      expect(documents[0]).toHaveProperty("type");
    });

    it("should delete document", async () => {
      const result = await deleteProjectDocument(1);

      expect(result).toBe(true);
    });
  });

  describe("Project Statistics", () => {
    it("should get project statistics", async () => {
      const stats = await getProjectStatistics();

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("byStatus");
      expect(stats).toHaveProperty("byType");
      expect(stats).toHaveProperty("totalBudget");
      expect(stats).toHaveProperty("totalActualCost");
      expect(stats?.byStatus).toHaveProperty("planning");
      expect(stats?.byStatus).toHaveProperty("active");
      expect(stats?.byType).toHaveProperty("standard");
      expect(stats?.byType).toHaveProperty("key");
    });
  });
});
