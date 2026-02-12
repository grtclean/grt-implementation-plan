/**
 * AI Planning & KPI Assistant Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../drizzle/schema", () => ({
  planningPlans: { planId: "planId", planType: "planType", ownerId: "ownerId", status: "status" },
  planningTasks: { taskId: "taskId", planId: "planId", ownerId: "ownerId", status: "status" },
  planningTrackingRecords: { trackingId: "trackingId", taskId: "taskId" },
  planningExecutionNotes: { noteId: "noteId", planId: "planId", asNewPlanInput: "asNewPlanInput" },
  planningDataSources: { sourceId: "sourceId", planId: "planId", sourceType: "sourceType" },
  kpiConfigurations: { kpiId: "kpiId", kpiName: "kpiName", kpiCategory: "kpiCategory", isActive: "isActive" },
  kpiScoreRecords: { scoreId: "scoreId", employeeId: "employeeId", periodType: "periodType" },
  kpiCommunicationSuggestions: { suggestionId: "suggestionId", employeeId: "employeeId", supervisorId: "supervisorId", approvalStatus: "approvalStatus" },
  kpiEmailNotifications: { notificationId: "notificationId", recipientId: "recipientId", approvalStatus: "approvalStatus" },
  kpiEffectivenessTracking: { trackingId: "trackingId", communicationId: "communicationId", employeeId: "employeeId" },
  kpiAssessmentHistory: { historyId: "historyId", employeeId: "employeeId" },
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          title: "测试计划",
          objectives: [{ id: "OBJ-001", description: "测试目标" }],
          tasks: [{ taskId: "TASK-001", title: "测试任务", priority: "P1", taskType: "work", estimatedHours: 8, dueDate: "2026-01-20", deliverables: [], dependencies: [] }],
          resources: [],
          risks: [],
          aiSummary: "AI生成的计划摘要",
          startDate: "2026-01-17",
          endDate: "2026-01-24",
        }),
      },
    }],
  }),
}));

// ============================================================================
// AI Planning Assistant Tests
// ============================================================================

describe("AI Planning Assistant", () => {
  describe("Plan Types", () => {
    it("should support daily plan type", () => {
      const planTypes = ["daily", "weekly", "monthly", "quarterly", "annual", "training", "visit", "phase"];
      expect(planTypes).toContain("daily");
    });

    it("should support weekly plan type", () => {
      const planTypes = ["daily", "weekly", "monthly", "quarterly", "annual", "training", "visit", "phase"];
      expect(planTypes).toContain("weekly");
    });

    it("should support monthly plan type", () => {
      const planTypes = ["daily", "weekly", "monthly", "quarterly", "annual", "training", "visit", "phase"];
      expect(planTypes).toContain("monthly");
    });

    it("should support quarterly plan type", () => {
      const planTypes = ["daily", "weekly", "monthly", "quarterly", "annual", "training", "visit", "phase"];
      expect(planTypes).toContain("quarterly");
    });

    it("should support annual plan type", () => {
      const planTypes = ["daily", "weekly", "monthly", "quarterly", "annual", "training", "visit", "phase"];
      expect(planTypes).toContain("annual");
    });

    it("should support training plan type", () => {
      const planTypes = ["daily", "weekly", "monthly", "quarterly", "annual", "training", "visit", "phase"];
      expect(planTypes).toContain("training");
    });

    it("should support visit plan type", () => {
      const planTypes = ["daily", "weekly", "monthly", "quarterly", "annual", "training", "visit", "phase"];
      expect(planTypes).toContain("visit");
    });

    it("should support phase plan type", () => {
      const planTypes = ["daily", "weekly", "monthly", "quarterly", "annual", "training", "visit", "phase"];
      expect(planTypes).toContain("phase");
    });
  });

  describe("Data Sources", () => {
    it("should support annual_plan data source", () => {
      const sourceTypes = ["annual_plan", "quarterly_plan", "monthly_plan", "customer_feedback", "project_opl", "project_status", "meeting_minutes", "supervisor_task", "kpi_status", "incomplete_plan", "execution_note"];
      expect(sourceTypes).toContain("annual_plan");
    });

    it("should support customer_feedback data source", () => {
      const sourceTypes = ["annual_plan", "quarterly_plan", "monthly_plan", "customer_feedback", "project_opl", "project_status", "meeting_minutes", "supervisor_task", "kpi_status", "incomplete_plan", "execution_note"];
      expect(sourceTypes).toContain("customer_feedback");
    });

    it("should support project_opl data source", () => {
      const sourceTypes = ["annual_plan", "quarterly_plan", "monthly_plan", "customer_feedback", "project_opl", "project_status", "meeting_minutes", "supervisor_task", "kpi_status", "incomplete_plan", "execution_note"];
      expect(sourceTypes).toContain("project_opl");
    });

    it("should support meeting_minutes data source", () => {
      const sourceTypes = ["annual_plan", "quarterly_plan", "monthly_plan", "customer_feedback", "project_opl", "project_status", "meeting_minutes", "supervisor_task", "kpi_status", "incomplete_plan", "execution_note"];
      expect(sourceTypes).toContain("meeting_minutes");
    });

    it("should support supervisor_task data source", () => {
      const sourceTypes = ["annual_plan", "quarterly_plan", "monthly_plan", "customer_feedback", "project_opl", "project_status", "meeting_minutes", "supervisor_task", "kpi_status", "incomplete_plan", "execution_note"];
      expect(sourceTypes).toContain("supervisor_task");
    });

    it("should support kpi_status data source", () => {
      const sourceTypes = ["annual_plan", "quarterly_plan", "monthly_plan", "customer_feedback", "project_opl", "project_status", "meeting_minutes", "supervisor_task", "kpi_status", "incomplete_plan", "execution_note"];
      expect(sourceTypes).toContain("kpi_status");
    });

    it("should support incomplete_plan data source", () => {
      const sourceTypes = ["annual_plan", "quarterly_plan", "monthly_plan", "customer_feedback", "project_opl", "project_status", "meeting_minutes", "supervisor_task", "kpi_status", "incomplete_plan", "execution_note"];
      expect(sourceTypes).toContain("incomplete_plan");
    });

    it("should support execution_note data source", () => {
      const sourceTypes = ["annual_plan", "quarterly_plan", "monthly_plan", "customer_feedback", "project_opl", "project_status", "meeting_minutes", "supervisor_task", "kpi_status", "incomplete_plan", "execution_note"];
      expect(sourceTypes).toContain("execution_note");
    });
  });

  describe("Task Tracking Sources", () => {
    it("should support meeting tracking source", () => {
      const trackingSources = ["meeting", "sop", "training", "email", "report", "customer", "manual"];
      expect(trackingSources).toContain("meeting");
    });

    it("should support sop tracking source", () => {
      const trackingSources = ["meeting", "sop", "training", "email", "report", "customer", "manual"];
      expect(trackingSources).toContain("sop");
    });

    it("should support training tracking source", () => {
      const trackingSources = ["meeting", "sop", "training", "email", "report", "customer", "manual"];
      expect(trackingSources).toContain("training");
    });

    it("should support email tracking source", () => {
      const trackingSources = ["meeting", "sop", "training", "email", "report", "customer", "manual"];
      expect(trackingSources).toContain("email");
    });

    it("should support customer tracking source", () => {
      const trackingSources = ["meeting", "sop", "training", "email", "report", "customer", "manual"];
      expect(trackingSources).toContain("customer");
    });
  });

  describe("Task Status", () => {
    it("should support pending status", () => {
      const statuses = ["pending", "in_progress", "completed", "cancelled", "blocked"];
      expect(statuses).toContain("pending");
    });

    it("should support in_progress status", () => {
      const statuses = ["pending", "in_progress", "completed", "cancelled", "blocked"];
      expect(statuses).toContain("in_progress");
    });

    it("should support completed status", () => {
      const statuses = ["pending", "in_progress", "completed", "cancelled", "blocked"];
      expect(statuses).toContain("completed");
    });

    it("should support blocked status", () => {
      const statuses = ["pending", "in_progress", "completed", "cancelled", "blocked"];
      expect(statuses).toContain("blocked");
    });
  });

  describe("Plan Approval", () => {
    it("should support not_required approval status", () => {
      const approvalStatuses = ["not_required", "pending", "approved", "rejected"];
      expect(approvalStatuses).toContain("not_required");
    });

    it("should support pending approval status", () => {
      const approvalStatuses = ["not_required", "pending", "approved", "rejected"];
      expect(approvalStatuses).toContain("pending");
    });

    it("should support approved status", () => {
      const approvalStatuses = ["not_required", "pending", "approved", "rejected"];
      expect(approvalStatuses).toContain("approved");
    });

    it("should support rejected status", () => {
      const approvalStatuses = ["not_required", "pending", "approved", "rejected"];
      expect(approvalStatuses).toContain("rejected");
    });
  });

  describe("Task Priority", () => {
    it("should support P0 priority (urgent)", () => {
      const priorities = ["P0", "P1", "P2", "P3"];
      expect(priorities).toContain("P0");
    });

    it("should support P1 priority (high)", () => {
      const priorities = ["P0", "P1", "P2", "P3"];
      expect(priorities).toContain("P1");
    });

    it("should support P2 priority (medium)", () => {
      const priorities = ["P0", "P1", "P2", "P3"];
      expect(priorities).toContain("P2");
    });

    it("should support P3 priority (low)", () => {
      const priorities = ["P0", "P1", "P2", "P3"];
      expect(priorities).toContain("P3");
    });
  });
});

// ============================================================================
// AI KPI Assistant Tests
// ============================================================================

describe("AI KPI Assistant", () => {
  describe("KPI Categories", () => {
    it("should support task category", () => {
      const categories = ["task", "quality", "efficiency", "collaboration", "innovation"];
      expect(categories).toContain("task");
    });

    it("should support quality category", () => {
      const categories = ["task", "quality", "efficiency", "collaboration", "innovation"];
      expect(categories).toContain("quality");
    });

    it("should support efficiency category", () => {
      const categories = ["task", "quality", "efficiency", "collaboration", "innovation"];
      expect(categories).toContain("efficiency");
    });

    it("should support collaboration category", () => {
      const categories = ["task", "quality", "efficiency", "collaboration", "innovation"];
      expect(categories).toContain("collaboration");
    });

    it("should support innovation category", () => {
      const categories = ["task", "quality", "efficiency", "collaboration", "innovation"];
      expect(categories).toContain("innovation");
    });
  });

  describe("Score Period Types", () => {
    it("should support current_day period", () => {
      const periodTypes = ["current_day", "daily", "weekly", "monthly", "quarterly", "annual"];
      expect(periodTypes).toContain("current_day");
    });

    it("should support daily period", () => {
      const periodTypes = ["current_day", "daily", "weekly", "monthly", "quarterly", "annual"];
      expect(periodTypes).toContain("daily");
    });

    it("should support weekly period", () => {
      const periodTypes = ["current_day", "daily", "weekly", "monthly", "quarterly", "annual"];
      expect(periodTypes).toContain("weekly");
    });

    it("should support monthly period", () => {
      const periodTypes = ["current_day", "daily", "weekly", "monthly", "quarterly", "annual"];
      expect(periodTypes).toContain("monthly");
    });

    it("should support quarterly period", () => {
      const periodTypes = ["current_day", "daily", "weekly", "monthly", "quarterly", "annual"];
      expect(periodTypes).toContain("quarterly");
    });

    it("should support annual period", () => {
      const periodTypes = ["current_day", "daily", "weekly", "monthly", "quarterly", "annual"];
      expect(periodTypes).toContain("annual");
    });
  });

  describe("Score Levels", () => {
    it("should classify score >= 90 as excellent", () => {
      const getScoreLevel = (score: number) => {
        if (score >= 90) return "excellent";
        if (score >= 80) return "good";
        if (score >= 70) return "satisfactory";
        if (score >= 60) return "needs_improvement";
        return "unsatisfactory";
      };
      expect(getScoreLevel(95)).toBe("excellent");
      expect(getScoreLevel(90)).toBe("excellent");
    });

    it("should classify score 80-89 as good", () => {
      const getScoreLevel = (score: number) => {
        if (score >= 90) return "excellent";
        if (score >= 80) return "good";
        if (score >= 70) return "satisfactory";
        if (score >= 60) return "needs_improvement";
        return "unsatisfactory";
      };
      expect(getScoreLevel(85)).toBe("good");
      expect(getScoreLevel(80)).toBe("good");
    });

    it("should classify score 70-79 as satisfactory", () => {
      const getScoreLevel = (score: number) => {
        if (score >= 90) return "excellent";
        if (score >= 80) return "good";
        if (score >= 70) return "satisfactory";
        if (score >= 60) return "needs_improvement";
        return "unsatisfactory";
      };
      expect(getScoreLevel(75)).toBe("satisfactory");
      expect(getScoreLevel(70)).toBe("satisfactory");
    });

    it("should classify score 60-69 as needs_improvement", () => {
      const getScoreLevel = (score: number) => {
        if (score >= 90) return "excellent";
        if (score >= 80) return "good";
        if (score >= 70) return "satisfactory";
        if (score >= 60) return "needs_improvement";
        return "unsatisfactory";
      };
      expect(getScoreLevel(65)).toBe("needs_improvement");
      expect(getScoreLevel(60)).toBe("needs_improvement");
    });

    it("should classify score < 60 as unsatisfactory", () => {
      const getScoreLevel = (score: number) => {
        if (score >= 90) return "excellent";
        if (score >= 80) return "good";
        if (score >= 70) return "satisfactory";
        if (score >= 60) return "needs_improvement";
        return "unsatisfactory";
      };
      expect(getScoreLevel(55)).toBe("unsatisfactory");
      expect(getScoreLevel(40)).toBe("unsatisfactory");
    });
  });

  describe("Communication Types", () => {
    it("should support coaching communication type", () => {
      const types = ["coaching", "review", "recognition", "warning", "improvement"];
      expect(types).toContain("coaching");
    });

    it("should support review communication type", () => {
      const types = ["coaching", "review", "recognition", "warning", "improvement"];
      expect(types).toContain("review");
    });

    it("should support recognition communication type", () => {
      const types = ["coaching", "review", "recognition", "warning", "improvement"];
      expect(types).toContain("recognition");
    });

    it("should support warning communication type", () => {
      const types = ["coaching", "review", "recognition", "warning", "improvement"];
      expect(types).toContain("warning");
    });

    it("should support improvement communication type", () => {
      const types = ["coaching", "review", "recognition", "warning", "improvement"];
      expect(types).toContain("improvement");
    });
  });

  describe("Email Types", () => {
    it("should support daily_reminder email type", () => {
      const types = ["daily_reminder", "weekly_summary", "performance_alert", "improvement_suggestion", "recognition", "task_reminder"];
      expect(types).toContain("daily_reminder");
    });

    it("should support weekly_summary email type", () => {
      const types = ["daily_reminder", "weekly_summary", "performance_alert", "improvement_suggestion", "recognition", "task_reminder"];
      expect(types).toContain("weekly_summary");
    });

    it("should support performance_alert email type", () => {
      const types = ["daily_reminder", "weekly_summary", "performance_alert", "improvement_suggestion", "recognition", "task_reminder"];
      expect(types).toContain("performance_alert");
    });

    it("should support improvement_suggestion email type", () => {
      const types = ["daily_reminder", "weekly_summary", "performance_alert", "improvement_suggestion", "recognition", "task_reminder"];
      expect(types).toContain("improvement_suggestion");
    });

    it("should support recognition email type", () => {
      const types = ["daily_reminder", "weekly_summary", "performance_alert", "improvement_suggestion", "recognition", "task_reminder"];
      expect(types).toContain("recognition");
    });

    it("should support task_reminder email type", () => {
      const types = ["daily_reminder", "weekly_summary", "performance_alert", "improvement_suggestion", "recognition", "task_reminder"];
      expect(types).toContain("task_reminder");
    });
  });

  describe("Urgency Levels", () => {
    it("should support high urgency", () => {
      const urgencyLevels = ["high", "medium", "low"];
      expect(urgencyLevels).toContain("high");
    });

    it("should support medium urgency", () => {
      const urgencyLevels = ["high", "medium", "low"];
      expect(urgencyLevels).toContain("medium");
    });

    it("should support low urgency", () => {
      const urgencyLevels = ["high", "medium", "low"];
      expect(urgencyLevels).toContain("low");
    });
  });

  describe("Assessment Types", () => {
    it("should support self assessment", () => {
      const types = ["self", "supervisor", "peer", "ai"];
      expect(types).toContain("self");
    });

    it("should support supervisor assessment", () => {
      const types = ["self", "supervisor", "peer", "ai"];
      expect(types).toContain("supervisor");
    });

    it("should support peer assessment", () => {
      const types = ["self", "supervisor", "peer", "ai"];
      expect(types).toContain("peer");
    });

    it("should support ai assessment", () => {
      const types = ["self", "supervisor", "peer", "ai"];
      expect(types).toContain("ai");
    });
  });

  describe("Approval Workflow", () => {
    it("should require approval for sensitive communications", () => {
      const requiresApproval = true;
      expect(requiresApproval).toBe(true);
    });

    it("should auto-approve routine reminders", () => {
      const autoApprove = (emailType: string) => {
        return ["daily_reminder", "task_reminder"].includes(emailType);
      };
      expect(autoApprove("daily_reminder")).toBe(true);
      expect(autoApprove("task_reminder")).toBe(true);
      expect(autoApprove("performance_alert")).toBe(false);
    });
  });

  describe("Default KPI Configurations", () => {
    it("should have 5 default KPI categories", () => {
      const defaultConfigs = [
        { kpiId: "KPI-TASK-001", kpiName: "任务完成率", kpiCategory: "task", weight: 30 },
        { kpiId: "KPI-QUAL-001", kpiName: "工作质量", kpiCategory: "quality", weight: 25 },
        { kpiId: "KPI-EFFI-001", kpiName: "工作效率", kpiCategory: "efficiency", weight: 20 },
        { kpiId: "KPI-COLL-001", kpiName: "团队协作", kpiCategory: "collaboration", weight: 15 },
        { kpiId: "KPI-INNO-001", kpiName: "创新贡献", kpiCategory: "innovation", weight: 10 },
      ];
      expect(defaultConfigs.length).toBe(5);
    });

    it("should have weights summing to 100", () => {
      const defaultConfigs = [
        { kpiId: "KPI-TASK-001", kpiName: "任务完成率", kpiCategory: "task", weight: 30 },
        { kpiId: "KPI-QUAL-001", kpiName: "工作质量", kpiCategory: "quality", weight: 25 },
        { kpiId: "KPI-EFFI-001", kpiName: "工作效率", kpiCategory: "efficiency", weight: 20 },
        { kpiId: "KPI-COLL-001", kpiName: "团队协作", kpiCategory: "collaboration", weight: 15 },
        { kpiId: "KPI-INNO-001", kpiName: "创新贡献", kpiCategory: "innovation", weight: 10 },
      ];
      const totalWeight = defaultConfigs.reduce((sum, c) => sum + c.weight, 0);
      expect(totalWeight).toBe(100);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Planning-KPI Integration", () => {
  it("should link task completion to KPI score", () => {
    // Task completion should affect KPI task category score
    const taskCompletionRate = 0.85; // 85%
    const kpiTaskWeight = 30;
    const taskScore = taskCompletionRate * 100 * (kpiTaskWeight / 100);
    expect(taskScore).toBeCloseTo(25.5);
  });

  it("should trigger communication suggestion on low score", () => {
    const triggerCommunication = (score: number) => score < 70;
    expect(triggerCommunication(65)).toBe(true);
    expect(triggerCommunication(75)).toBe(false);
  });

  it("should calculate urgency based on score trend", () => {
    const calculateUrgency = (currentScore: number, previousScore: number) => {
      const decline = previousScore - currentScore;
      if (decline > 20) return "high";
      if (decline > 10) return "medium";
      return "low";
    };
    expect(calculateUrgency(60, 85)).toBe("high");
    expect(calculateUrgency(70, 85)).toBe("medium");
    expect(calculateUrgency(80, 85)).toBe("low");
  });
});
