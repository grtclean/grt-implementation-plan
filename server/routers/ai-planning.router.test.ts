/**
 * AI Planning Router (AI计划助手) — Unit Tests
 *
 * Covers all 3 procedures:
 *   Mutations (2): generatePlan, updateTaskStatus
 *   Queries  (1): getExecutionReport
 *
 * Mock strategy: service-level mocks via vi.mock on ../services/ai-planning.service.
 *
 * Run: npx vitest run server/routers/ai-planning.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted service mocks ──────────────────────────────────────
const { mockGenerateWorkPlan, mockUpdatePlanStatus, mockGetPlanExecutionReport } =
  vi.hoisted(() => ({
    mockGenerateWorkPlan: vi.fn(async () => ({
      id: "plan-1",
      type: "daily",
      tasks: [
        { id: "t1", title: "Review meeting notes", priority: "high", status: "pending" },
      ],
      createdAt: "2026-03-01",
    })),
    mockUpdatePlanStatus: vi.fn(() => true),
    mockGetPlanExecutionReport: vi.fn(async () => ({
      planId: "plan-1",
      completionRate: 75,
      totalTasks: 4,
      completedTasks: 3,
    })),
  }));

vi.mock("../services/ai-planning.service", () => ({
  generateWorkPlan: mockGenerateWorkPlan,
  updatePlanStatus: mockUpdatePlanStatus,
  getPlanExecutionReport: mockGetPlanExecutionReport,
}));

// ── Reset mocks between tests ──────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();

  // Restore default implementations
  mockGenerateWorkPlan.mockResolvedValue({
    id: "plan-1",
    type: "daily",
    tasks: [
      { id: "t1", title: "Review meeting notes", priority: "high", status: "pending" },
    ],
    createdAt: "2026-03-01",
  });
  mockUpdatePlanStatus.mockReturnValue(true);
  mockGetPlanExecutionReport.mockResolvedValue({
    planId: "plan-1",
    completionRate: 75,
    totalTasks: 4,
    completedTasks: 3,
  });
});

// ══════════════════════════════════════════════════════════════════
// generatePlan
// ══════════════════════════════════════════════════════════════════

describe("aiPlanning.generatePlan", () => {
  it("succeeds with minimal input (planType only)", async () => {
    const caller = createAdminCaller();
    const result = await caller.aiPlanning.generatePlan({
      planType: "daily",
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.id).toBe("plan-1");
    expect(result.data.type).toBe("daily");
    expect(result.data.tasks).toHaveLength(1);
  });

  it("succeeds with all optional arrays populated", async () => {
    const caller = createAdminCaller();
    const result = await caller.aiPlanning.generatePlan({
      planType: "weekly",
      companyPlans: [
        {
          id: "cp-1",
          type: "quarterly",
          title: "Q1 Revenue Target",
          objectives: ["Increase revenue by 10%", "Expand into new markets"],
          deadline: "2026-03-31",
        },
      ],
      customerFeedback: [
        {
          id: "cf-1",
          customerId: "cust-001",
          customerName: "Acme Corp",
          content: "Delivery was delayed by 2 days",
          priority: "high",
          date: "2026-02-28",
        },
      ],
      projectOPLs: [
        {
          id: "opl-1",
          projectId: "proj-001",
          projectName: "Project Alpha",
          stage: "M3",
          items: ["Complete DFMEA", "Finalize BOM"],
          deadline: "2026-03-15",
        },
      ],
      meetingMinutes: [
        {
          id: "mm-1",
          meetingType: "Weekly standup",
          date: "2026-02-27",
          actionItems: [
            {
              description: "Prepare test report",
              assignee: "Zhang San",
              deadline: "2026-03-01",
              status: "pending",
            },
          ],
        },
      ],
      supervisorAssignments: [
        {
          id: "sa-1",
          from: "Manager Li",
          description: "Review supplier audit results",
          priority: "medium",
          deadline: "2026-03-05",
        },
      ],
      kpiStatus: {
        currentScore: 72,
        targetScore: 90,
        gaps: ["Customer response time", "Quality audit completion"],
      },
      unfinishedPlans: [
        {
          id: "uf-1",
          title: "Update control plan for Line B",
          originalDeadline: "2026-02-25",
          reason: "Waiting for supplier data",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("passes correct args to generateWorkPlan service", async () => {
    const caller = createAdminCaller();
    await caller.aiPlanning.generatePlan({
      planType: "monthly",
      companyPlans: [
        {
          id: "cp-2",
          type: "annual",
          title: "Annual Plan",
          objectives: ["Grow 20%"],
          deadline: "2026-12-31",
        },
      ],
      kpiStatus: {
        currentScore: 60,
        targetScore: 85,
        gaps: ["On-time delivery"],
      },
    });

    expect(mockGenerateWorkPlan).toHaveBeenCalledTimes(1);

    const [planInput, planType] = mockGenerateWorkPlan.mock.calls[0];
    expect(planType).toBe("monthly");

    // The router destructures planType out and passes the rest as PlanInput
    expect(planInput.companyPlans).toHaveLength(1);
    expect(planInput.companyPlans[0].id).toBe("cp-2");
    expect(planInput.kpiStatus).toEqual({
      currentScore: 60,
      targetScore: 85,
      gaps: ["On-time delivery"],
    });

    // Optional arrays not provided should be undefined
    expect(planInput.customerFeedback).toBeUndefined();
    expect(planInput.projectOPLs).toBeUndefined();
    expect(planInput.meetingMinutes).toBeUndefined();
    expect(planInput.supervisorAssignments).toBeUndefined();
    expect(planInput.unfinishedPlans).toBeUndefined();
  });

  it("handles service error by propagating it", async () => {
    mockGenerateWorkPlan.mockRejectedValueOnce(new Error("LLM service unavailable"));

    const caller = createAdminCaller();
    await expect(
      caller.aiPlanning.generatePlan({ planType: "daily" }),
    ).rejects.toThrow("LLM service unavailable");
  });

  it("rejects invalid planType enum value", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.aiPlanning.generatePlan({ planType: "yearly" as any }),
    ).rejects.toThrow();
  });

  it("returns the exact shape { success: true, data: plan }", async () => {
    const mockPlan = {
      id: "plan-weekly-1",
      type: "weekly",
      period: "2026-02-24 ~ 2026-03-01",
      tasks: [],
      generatedAt: "2026-03-01T00:00:00Z",
      aiNotes: ["Focus on delivery this week"],
    };
    mockGenerateWorkPlan.mockResolvedValueOnce(mockPlan);

    const caller = createAdminCaller();
    const result = await caller.aiPlanning.generatePlan({ planType: "weekly" });

    expect(result).toEqual({ success: true, data: mockPlan });
  });
});

// ══════════════════════════════════════════════════════════════════
// updateTaskStatus
// ══════════════════════════════════════════════════════════════════

describe("aiPlanning.updateTaskStatus", () => {
  it("returns success message when service returns true", async () => {
    mockUpdatePlanStatus.mockReturnValueOnce(true);

    const caller = createAdminCaller();
    const result = await caller.aiPlanning.updateTaskStatus({
      planId: "plan-1",
      taskId: "t1",
      status: "completed",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("状态更新成功");
    expect(mockUpdatePlanStatus).toHaveBeenCalledWith("plan-1", "t1", "completed");
  });

  it("returns failure message when service returns false", async () => {
    mockUpdatePlanStatus.mockReturnValueOnce(false);

    const caller = createAdminCaller();
    const result = await caller.aiPlanning.updateTaskStatus({
      planId: "plan-nonexistent",
      taskId: "t-unknown",
      status: "in_progress",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("更新失败");
  });

  it("validates status enum — rejects invalid status", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.aiPlanning.updateTaskStatus({
        planId: "plan-1",
        taskId: "t1",
        status: "cancelled" as any,
      }),
    ).rejects.toThrow();
  });

  it("passes all three arguments to updatePlanStatus", async () => {
    const caller = createAdminCaller();
    await caller.aiPlanning.updateTaskStatus({
      planId: "PLAN-DAILY-123",
      taskId: "TASK-456",
      status: "pending",
    });

    expect(mockUpdatePlanStatus).toHaveBeenCalledTimes(1);
    expect(mockUpdatePlanStatus).toHaveBeenCalledWith("PLAN-DAILY-123", "TASK-456", "pending");
  });

  it("accepts all valid status values", async () => {
    const caller = createAdminCaller();
    const statuses = ["pending", "in_progress", "completed"] as const;

    for (const status of statuses) {
      vi.clearAllMocks();
      mockUpdatePlanStatus.mockReturnValueOnce(true);
      const result = await caller.aiPlanning.updateTaskStatus({
        planId: "plan-1",
        taskId: "t1",
        status,
      });
      expect(result.success).toBe(true);
      expect(mockUpdatePlanStatus).toHaveBeenCalledWith("plan-1", "t1", status);
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// getExecutionReport
// ══════════════════════════════════════════════════════════════════

describe("aiPlanning.getExecutionReport", () => {
  it("returns report for a valid planId", async () => {
    const caller = createAdminCaller();
    const result = await caller.aiPlanning.getExecutionReport({
      planId: "plan-1",
    });

    expect(result.report).toBeDefined();
    expect(result.report).toEqual({
      planId: "plan-1",
      completionRate: 75,
      totalTasks: 4,
      completedTasks: 3,
    });
    expect(mockGetPlanExecutionReport).toHaveBeenCalledWith("plan-1");
  });

  it("returns null report when plan not found", async () => {
    mockGetPlanExecutionReport.mockResolvedValueOnce(null);

    const caller = createAdminCaller();
    const result = await caller.aiPlanning.getExecutionReport({
      planId: "nonexistent-plan",
    });

    expect(result.report).toBeNull();
  });

  it("returns wrapped report shape { report: ... }", async () => {
    const mockReport = "计划 plan-42 执行报告：执行中...";
    mockGetPlanExecutionReport.mockResolvedValueOnce(mockReport);

    const caller = createAdminCaller();
    const result = await caller.aiPlanning.getExecutionReport({
      planId: "plan-42",
    });

    expect(result).toEqual({ report: mockReport });
  });

  it("handles service error by propagating it", async () => {
    mockGetPlanExecutionReport.mockRejectedValueOnce(new Error("DB connection lost"));

    const caller = createAdminCaller();
    await expect(
      caller.aiPlanning.getExecutionReport({ planId: "plan-1" }),
    ).rejects.toThrow("DB connection lost");
  });
});

// ══════════════════════════════════════════════════════════════════
// Auth guards — all 3 procedures require authentication
// ══════════════════════════════════════════════════════════════════

describe("aiPlanning — auth guards", () => {
  it("rejects anonymous caller for generatePlan", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiPlanning.generatePlan({ planType: "daily" }),
    ).rejects.toThrow();
  });

  it("rejects anonymous caller for updateTaskStatus", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiPlanning.updateTaskStatus({
        planId: "plan-1",
        taskId: "t1",
        status: "completed",
      }),
    ).rejects.toThrow();
  });

  it("rejects anonymous caller for getExecutionReport", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiPlanning.getExecutionReport({ planId: "plan-1" }),
    ).rejects.toThrow();
  });
});
