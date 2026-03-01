/**
 * Project Agent Router — Unit Tests
 * Tests 7 procedures: triggerBomReview, triggerDrawingReview, getByProject,
 * getById, stats, dashboard, seedDemo
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { mockSubmitTask, selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const mockSubmitTask = vi.fn();
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { mockSubmitTask, selectResultsQueue, returningQueue };
});

vi.mock("../services/task-worker.service", () => ({
  submitTask: mockSubmitTask,
}));

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
      groupBy: vi.fn(() => chain),
      $dynamic: vi.fn(() => chain),
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
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAuthenticatedCaller();

const sampleProject = { id: 10, name: "清洗线A", currentPhase: "M3", status: "active" };
const sampleReview = {
  id: 1, projectId: 10, reviewType: "bom_review", triggerPhase: "M2",
  inputSummary: "BOM评审: 5项物料", status: "pending", aiTaskId: "task-1",
  verdict: null, confidence: null, findings: null, narrative: null,
  riskScore: null, predictedDelay: null, reviewedBy: "Test User",
  createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

describe("project-agent router", () => {

  describe("triggerBomReview", () => {
    it("creates review and submits AI task", async () => {
      selectResultsQueue.push([sampleProject]); // project lookup
      returningQueue.push([{ id: 5 }]); // insert review
      mockSubmitTask.mockResolvedValueOnce({ taskId: "task-abc" });
      // update review with aiTaskId → chain.then
      selectResultsQueue.push([]);

      const result = await caller().projectAgent.triggerBomReview({ projectId: 10 });
      expect(result.success).toBe(true);
      expect(result.reviewId).toBe(5);
      expect(result.aiTaskId).toBe("task-abc");
      expect(mockSubmitTask).toHaveBeenCalledWith(
        "PROJECT_BOM_REVIEW",
        expect.objectContaining({ reviewId: 5, projectId: 10, projectName: "清洗线A" }),
        "Test User",
      );
    });

    it("throws when project not found", async () => {
      selectResultsQueue.push([]); // no project
      await expect(caller().projectAgent.triggerBomReview({ projectId: 999 }))
        .rejects.toThrow("项目不存在");
    });

    it("passes bomItems and budget", async () => {
      selectResultsQueue.push([sampleProject]);
      returningQueue.push([{ id: 6 }]);
      mockSubmitTask.mockResolvedValueOnce({ taskId: "task-def" });
      selectResultsQueue.push([]);

      await caller().projectAgent.triggerBomReview({
        projectId: 10,
        bomItems: [{ partName: "Motor", spec: "12V", qty: 2, unitCost: 500 }],
        budget: 100000,
      });
      expect(mockSubmitTask).toHaveBeenCalledWith(
        "PROJECT_BOM_REVIEW",
        expect.objectContaining({
          bomItems: [{ partName: "Motor", spec: "12V", qty: 2, unitCost: 500 }],
          budget: 100000,
        }),
        "Test User",
      );
    });
  });

  describe("triggerDrawingReview", () => {
    it("creates drawing review and submits AI task", async () => {
      selectResultsQueue.push([sampleProject]);
      returningQueue.push([{ id: 7 }]);
      mockSubmitTask.mockResolvedValueOnce({ taskId: "task-drw" });
      selectResultsQueue.push([]);

      const result = await caller().projectAgent.triggerDrawingReview({ projectId: 10 });
      expect(result.success).toBe(true);
      expect(result.reviewId).toBe(7);
      expect(mockSubmitTask).toHaveBeenCalledWith(
        "PROJECT_DRAWING_REVIEW",
        expect.objectContaining({ projectName: "清洗线A" }),
        "Test User",
      );
    });

    it("throws when project not found", async () => {
      selectResultsQueue.push([]);
      await expect(caller().projectAgent.triggerDrawingReview({ projectId: 999 }))
        .rejects.toThrow("项目不存在");
    });
  });

  describe("getByProject", () => {
    it("returns reviews for a project", async () => {
      selectResultsQueue.push([sampleReview, { ...sampleReview, id: 2 }]);
      const result = await caller().projectAgent.getByProject({ projectId: 10 });
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no reviews", async () => {
      selectResultsQueue.push([]);
      const result = await caller().projectAgent.getByProject({ projectId: 999 });
      expect(result).toEqual([]);
    });
  });

  describe("getById", () => {
    it("returns a review by ID", async () => {
      selectResultsQueue.push([sampleReview]);
      const result = await caller().projectAgent.getById({ id: 1 });
      expect(result).toHaveProperty("reviewType", "bom_review");
    });

    it("returns null for missing review", async () => {
      selectResultsQueue.push([]);
      const result = await caller().projectAgent.getById({ id: 999 });
      expect(result).toBeNull();
    });
  });

  describe("stats", () => {
    it("returns aggregated stats", async () => {
      selectResultsQueue.push([{ reviewType: "bom_review", count: 5 }]); // byType
      selectResultsQueue.push([{ status: "completed", count: 3 }]); // byStatus
      selectResultsQueue.push([{ verdict: "pass", count: 2 }]); // byVerdict
      const result = await caller().projectAgent.stats();
      expect(result).toHaveProperty("byType");
      expect(result).toHaveProperty("byStatus");
      expect(result).toHaveProperty("byVerdict");
    });
  });

  describe("dashboard", () => {
    it("returns dashboard data", async () => {
      selectResultsQueue.push([{ count: 10 }]); // activeProjects
      selectResultsQueue.push([{ count: 3 }]);  // pendingReviews
      selectResultsQueue.push([{ count: 2 }]);  // processingReviews
      selectResultsQueue.push([{ projectId: 1, riskScore: 75, predictedDelay: 14 }]); // highRisk
      const result = await caller().projectAgent.dashboard();
      expect(result.activeProjects).toBe(10);
      expect(result.pendingReviews).toBe(5); // 3 + 2
      expect(result.highRiskProjects).toHaveLength(1);
    });
  });

  describe("seedDemo", () => {
    it("seeds demo projects and reviews", async () => {
      // Find projA
      selectResultsQueue.push([]); // not found
      returningQueue.push([{ id: 100 }]); // create projA
      // Find projB
      selectResultsQueue.push([]); // not found
      returningQueue.push([{ id: 101 }]); // create projB
      // 4 review inserts (fire-and-forget)
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);

      const result = await caller().projectAgent.seedDemo();
      expect(result.success).toBe(true);
      expect(result.projectIds).toEqual([100, 101]);
    });

    it("reuses existing projects", async () => {
      selectResultsQueue.push([{ id: 50 }]); // projA exists
      selectResultsQueue.push([{ id: 51 }]); // projB exists
      // 4 review inserts
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);

      const result = await caller().projectAgent.seedDemo();
      expect(result.projectIds).toEqual([50, 51]);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for triggerBomReview", async () => {
      await expect(createAnonymousCaller().projectAgent.triggerBomReview({ projectId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for triggerDrawingReview", async () => {
      await expect(createAnonymousCaller().projectAgent.triggerDrawingReview({ projectId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for getByProject", async () => {
      await expect(createAnonymousCaller().projectAgent.getByProject({ projectId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().projectAgent.getById({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for stats", async () => {
      await expect(createAnonymousCaller().projectAgent.stats()).rejects.toThrow();
    });
    it("rejects anonymous for dashboard", async () => {
      await expect(createAnonymousCaller().projectAgent.dashboard()).rejects.toThrow();
    });
    it("rejects anonymous for seedDemo", async () => {
      await expect(createAnonymousCaller().projectAgent.seedDemo()).rejects.toThrow();
    });
  });
});
