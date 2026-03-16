import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock setup via vi.hoisted ──
const { selectResultsQueue, returningQueue, chainMethods } = vi.hoisted(() => {
  const selectResultsQueue: any[] = [];
  const returningQueue: any[] = [];
  const chainMethods: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(() => {
      const result = returningQueue.shift() ?? [{ id: 1 }];
      return Promise.resolve(result);
    }),
    then: vi.fn((resolve: any) => {
      const result = selectResultsQueue.shift() ?? [];
      return Promise.resolve(resolve(result));
    }),
  };
  return { selectResultsQueue, returningQueue, chainMethods };
});

vi.mock("../db", () => ({
  db: {
    select: vi.fn(() => chainMethods),
    insert: vi.fn(() => chainMethods),
    update: vi.fn(() => chainMethods),
    delete: vi.fn(() => chainMethods),
  },
}));

vi.mock("../../drizzle/lifecycle-ecosystem-schema", () => ({
  lifecycleJourneys: { id: "id", userId: "user_id", department: "department", currentStage: "current_stage", status: "status", employeeName: "employee_name", updatedAt: "updated_at", currentStageName: "current_stage_name" },
  lifecycleMilestones: { id: "id", journeyId: "journey_id", userId: "user_id", stageCode: "stage_code", status: "status" },
  lifecycleActivities: { id: "id", journeyId: "journey_id", userId: "user_id", stageCode: "stage_code", activityType: "activity_type", occurredAt: "occurred_at", isPinned: "is_pinned" },
  lifecycleStageTemplates: { stageCode: "stage_code", isActive: "is_active", sortOrder: "sort_order" },
}));

vi.mock("../../drizzle/knowledge-compliance-schema", () => ({
  knowledgeRoleRequirements: { role: "role", skillLevel: "skill_level" },
  knowledgeLearningProgress: { userId: "user_id", updatedAt: "updated_at" },
}));

vi.mock("../../drizzle/executive-review-schema", () => ({
  executiveReviewSnapshots: { scopeType: "scope_type", scopeId: "scope_id", period: "period" },
}));

vi.mock("../../drizzle/schema", () => ({
  users: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...args: any[]) => ({ type: "eq", args })),
  and: vi.fn((...args: any[]) => ({ type: "and", args })),
  sql: vi.fn(),
  desc: vi.fn((col: any) => ({ type: "desc", col })),
  asc: vi.fn((col: any) => ({ type: "asc", col })),
  gte: vi.fn((...args: any[]) => ({ type: "gte", args })),
  lte: vi.fn((...args: any[]) => ({ type: "lte", args })),
  like: vi.fn((...args: any[]) => ({ type: "like", args })),
  count: vi.fn(() => "count"),
  inArray: vi.fn((...args: any[]) => ({ type: "inArray", args })),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { lifecycleEcosystemRouter } from "./lifecycle-ecosystem.router";
import { router } from "../_core/trpc";

const appRouter = router({ lifecycleEcosystem: lifecycleEcosystemRouter });
type AppRouter = typeof appRouter;

function createAuthenticatedCaller(role = "employee") {
  return appRouter.createCaller({
    user: { id: 1, name: "Test User", role },
  } as any);
}

function createManagerCaller(role = "dept_manager") {
  return appRouter.createCaller({
    user: { id: 2, name: "Manager", role },
  } as any);
}

function createAnonymousCaller() {
  return appRouter.createCaller({ user: null } as any);
}

beforeEach(() => {
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  vi.clearAllMocks();
});

// ── Journey Sub-router ──
describe("lifecycleEcosystem.journey", () => {
  it("getMy returns user journey", async () => {
    const caller = createAuthenticatedCaller();
    const mockJourney = { id: 1, userId: 1, currentStage: "G5", employeeName: "张三" };
    selectResultsQueue.push([mockJourney]);
    const result = await caller.lifecycleEcosystem.journey.getMy();
    expect(result).toEqual(mockJourney);
  });

  it("getMy returns null when no journey exists", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    const result = await caller.lifecycleEcosystem.journey.getMy();
    expect(result).toBeNull();
  });

  it("getByUser requires manager role", async () => {
    const caller = createAuthenticatedCaller("employee");
    await expect(caller.lifecycleEcosystem.journey.getByUser({ userId: 2 }))
      .rejects.toThrow("需要主管及以上权限");
  });

  it("getByUser works for dept_manager", async () => {
    const caller = createManagerCaller();
    const mockJourney = { id: 2, userId: 5, currentStage: "G3" };
    selectResultsQueue.push([mockJourney]);
    const result = await caller.lifecycleEcosystem.journey.getByUser({ userId: 5 });
    expect(result).toEqual(mockJourney);
  });

  it("list requires manager role", async () => {
    const caller = createAuthenticatedCaller("staff");
    await expect(caller.lifecycleEcosystem.journey.list({ limit: 10, offset: 0 }))
      .rejects.toThrow("需要主管及以上权限");
  });

  it("list returns journeys for managers", async () => {
    const caller = createManagerCaller("hr_director");
    const mockRows = [{ id: 1 }, { id: 2 }];
    selectResultsQueue.push(mockRows);
    selectResultsQueue.push([{ count: 2 }]);
    const result = await caller.lifecycleEcosystem.journey.list({ limit: 50, offset: 0 });
    expect(result.rows).toEqual(mockRows);
    expect(result.total).toBe(2);
  });

  it("create initializes a new journey", async () => {
    const caller = createManagerCaller();
    returningQueue.push([{ id: 10 }]);
    const result = await caller.lifecycleEcosystem.journey.create({
      userId: 5,
      employeeName: "李四",
      department: "技术部",
    });
    expect(result).toEqual({ id: 10 });
  });

  it("create rejects non-managers", async () => {
    const caller = createAuthenticatedCaller("employee");
    await expect(caller.lifecycleEcosystem.journey.create({
      userId: 5,
      employeeName: "李四",
    })).rejects.toThrow("需要主管及以上权限");
  });

  it("updatePortal updates personal customization", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.lifecycleEcosystem.journey.updatePortal({
      portalTheme: "dark",
      personalMotto: "不断学习",
    });
    expect(result.success).toBe(true);
  });

  it("updatePersona for self works", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.lifecycleEcosystem.journey.updatePersona({
      personaTraits: {
        driveType: "growth",
        learningStyle: "visual",
        workStyle: "collaborative",
        strengthTags: ["problem_solving"],
        growthAreas: ["leadership"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("updatePersona for others requires manager", async () => {
    const caller = createAuthenticatedCaller("employee");
    await expect(caller.lifecycleEcosystem.journey.updatePersona({
      userId: 99,
      personaTraits: {
        driveType: "achievement",
        learningStyle: "reading",
        workStyle: "independent",
        strengthTags: [],
        growthAreas: [],
      },
    })).rejects.toThrow("需要主管及以上权限");
  });

  it("advanceStage updates journey stage", async () => {
    const caller = createManagerCaller();
    const result = await caller.lifecycleEcosystem.journey.advanceStage({
      journeyId: 1,
      newStageCode: "G6",
      newStageName: "试用成长",
    });
    expect(result.success).toBe(true);
  });

  it("getStageDistribution returns grouped counts", async () => {
    const caller = createManagerCaller();
    const mockDist = [{ stage: "G2", stageName: "入职启航", count: 5 }];
    selectResultsQueue.push(mockDist);
    const result = await caller.lifecycleEcosystem.journey.getStageDistribution();
    expect(result).toEqual(mockDist);
  });
});

// ── Milestone Sub-router ──
describe("lifecycleEcosystem.milestone", () => {
  it("getByJourney returns milestones", async () => {
    const caller = createAuthenticatedCaller();
    const mockMs = [{ id: 1, stageCode: "G1" }, { id: 2, stageCode: "G2" }];
    selectResultsQueue.push(mockMs);
    const result = await caller.lifecycleEcosystem.milestone.getByJourney({ journeyId: 1 });
    expect(result).toEqual(mockMs);
  });

  it("getMy returns own milestones", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, stageCode: "G4", status: "active" }]);
    const result = await caller.lifecycleEcosystem.milestone.getMy();
    expect(result).toHaveLength(1);
  });

  it("getById returns single milestone", async () => {
    const caller = createAuthenticatedCaller();
    const mock = { id: 5, stageCode: "G7", status: "completed" };
    selectResultsQueue.push([mock]);
    const result = await caller.lifecycleEcosystem.milestone.getById({ id: 5 });
    expect(result).toEqual(mock);
  });

  it("createFromTemplate uses template data", async () => {
    const caller = createManagerCaller();
    const mockTemplate = {
      stageCode: "G3",
      stageName: "文化融入",
      stageNameEn: "Culture Immersion",
      description: "第一到第二周",
      stageIcon: "heart",
      stageColor: "pink",
      defaultObjectives: [],
      defaultDailyTools: [],
      defaultReporting: [],
      defaultMessage: "Welcome!",
      defaultMediaUrl: null,
      defaultMediaType: null,
      achievementBadge: "文化达人",
      achievementTitle: "Cultural Explorer",
    };
    selectResultsQueue.push([mockTemplate]);
    returningQueue.push([{ id: 3 }]);
    const result = await caller.lifecycleEcosystem.milestone.createFromTemplate({
      journeyId: 1,
      userId: 5,
      stageCode: "G3",
    });
    expect(result).toEqual({ id: 3 });
  });

  it("createFromTemplate rejects non-managers", async () => {
    const caller = createAuthenticatedCaller("employee");
    await expect(caller.lifecycleEcosystem.milestone.createFromTemplate({
      journeyId: 1, userId: 5, stageCode: "G3",
    })).rejects.toThrow("需要主管及以上权限");
  });

  it("update modifies milestone fields", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.lifecycleEcosystem.milestone.update({
      id: 1,
      status: "completed",
      stageKpiScore: "85.5",
    });
    expect(result.success).toBe(true);
  });

  it("managerReview requires manager role", async () => {
    const caller = createAuthenticatedCaller("employee");
    await expect(caller.lifecycleEcosystem.milestone.managerReview({
      milestoneId: 1, review: "Good progress", rating: 4,
    })).rejects.toThrow("需要主管及以上权限");
  });

  it("managerReview writes review", async () => {
    const caller = createManagerCaller();
    const result = await caller.lifecycleEcosystem.milestone.managerReview({
      milestoneId: 1,
      review: "表现优秀，建议尽快进入G8",
      rating: 5,
    });
    expect(result.success).toBe(true);
  });

  it("hrbpReview writes notes", async () => {
    const caller = createManagerCaller("hr_director");
    const result = await caller.lifecycleEcosystem.milestone.hrbpReview({
      milestoneId: 1,
      notes: "需加强跨部门协作能力",
    });
    expect(result.success).toBe(true);
  });
});

// ── Activity Sub-router ──
describe("lifecycleEcosystem.activity", () => {
  it("getByJourney returns activities", async () => {
    const caller = createAuthenticatedCaller();
    const mockActs = [{ id: 1, title: "完成培训", activityType: "learning_completed" }];
    selectResultsQueue.push(mockActs);
    const result = await caller.lifecycleEcosystem.activity.getByJourney({ journeyId: 1 });
    expect(result).toEqual(mockActs);
  });

  it("getMyFeed returns own activities", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1 }, { id: 2 }]);
    const result = await caller.lifecycleEcosystem.activity.getMyFeed({ limit: 10 });
    expect(result).toHaveLength(2);
  });

  it("create logs new activity", async () => {
    const caller = createAuthenticatedCaller();
    returningQueue.push([{ id: 7 }]);
    const result = await caller.lifecycleEcosystem.activity.create({
      journeyId: 1,
      userId: 1,
      activityType: "milestone_achieved",
      title: "完成G5首月里程碑",
      stageCode: "G5",
    });
    expect(result).toEqual({ id: 7 });
  });

  it("togglePin updates pin status", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.lifecycleEcosystem.activity.togglePin({ id: 1, isPinned: true });
    expect(result.success).toBe(true);
  });
});

// ── Template Sub-router ──
describe("lifecycleEcosystem.template", () => {
  it("list returns all active templates", async () => {
    const caller = createAuthenticatedCaller();
    const mockTmpls = [
      { stageCode: "G1", stageName: "招募吸引" },
      { stageCode: "G2", stageName: "入职启航" },
    ];
    selectResultsQueue.push(mockTmpls);
    const result = await caller.lifecycleEcosystem.template.list();
    expect(result).toHaveLength(2);
  });

  it("getByCode returns single template", async () => {
    const caller = createAuthenticatedCaller();
    const mock = { stageCode: "G10", stageName: "年度复盘" };
    selectResultsQueue.push([mock]);
    const result = await caller.lifecycleEcosystem.template.getByCode({ stageCode: "G10" });
    expect(result).toEqual(mock);
  });

  it("update requires manager role", async () => {
    const caller = createAuthenticatedCaller("employee");
    await expect(caller.lifecycleEcosystem.template.update({
      stageCode: "G5",
      stageName: "首月里程碑（修改版）",
    })).rejects.toThrow("需要主管及以上权限");
  });

  it("update modifies template", async () => {
    const caller = createManagerCaller();
    const result = await caller.lifecycleEcosystem.template.update({
      stageCode: "G5",
      defaultMessage: "Updated message",
    });
    expect(result.success).toBe(true);
  });
});

// ── Integration Sub-router ──
describe("lifecycleEcosystem.integration", () => {
  it("getStageKnowledgeRequirements maps stage to skill level", async () => {
    const caller = createAuthenticatedCaller();
    const mockReqs = [{ id: 1, role: "production_engineer", skillLevel: 1 }];
    selectResultsQueue.push(mockReqs);
    const result = await caller.lifecycleEcosystem.integration.getStageKnowledgeRequirements({
      role: "production_engineer",
      stageCode: "G4",
    });
    expect(result).toEqual(mockReqs);
  });

  it("getLearningProgressSummary returns progress records", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, progressPercent: 75 }]);
    const result = await caller.lifecycleEcosystem.integration.getLearningProgressSummary({ userId: 1 });
    expect(result).toHaveLength(1);
  });

  it("getEmployeePerformanceContext requires manager", async () => {
    const caller = createAuthenticatedCaller("employee");
    await expect(caller.lifecycleEcosystem.integration.getEmployeePerformanceContext({}))
      .rejects.toThrow("需要主管及以上权限");
  });

  it("getEmployeePerformanceContext returns snapshots for managers", async () => {
    const caller = createManagerCaller();
    selectResultsQueue.push([{ scopeType: "department", period: "2026-02" }]);
    const result = await caller.lifecycleEcosystem.integration.getEmployeePerformanceContext({
      department: "技术部",
    });
    expect(result).toHaveLength(1);
  });
});

// ── Dashboard Sub-router ──
describe("lifecycleEcosystem.dashboard", () => {
  it("getMySummary returns aggregated data", async () => {
    const caller = createAuthenticatedCaller();
    // 4 parallel queries: journey, milestones, activities, learningProgress
    selectResultsQueue.push([{ id: 1, currentStage: "G5" }]); // journey
    selectResultsQueue.push([{ status: "completed" }, { status: "active" }]); // milestones
    selectResultsQueue.push([{ id: 1, title: "Activity" }]); // activities
    selectResultsQueue.push([{ totalStudyMinutes: 120 }, { totalStudyMinutes: 60 }]); // learning
    const result = await caller.lifecycleEcosystem.dashboard.getMySummary();
    expect(result.journey).toBeTruthy();
    expect(result.milestones).toHaveLength(2);
    expect(result.stats.completedStages).toBe(1);
    expect(result.stats.totalLearningMinutes).toBe(180);
  });

  it("getCompanyHealth requires manager role", async () => {
    const caller = createAuthenticatedCaller("employee");
    await expect(caller.lifecycleEcosystem.dashboard.getCompanyHealth())
      .rejects.toThrow("需要主管及以上权限");
  });

  it("getCompanyHealth returns distribution for managers", async () => {
    const caller = createManagerCaller();
    selectResultsQueue.push([{ stage: "G2", count: 5 }]); // stageDistribution
    selectResultsQueue.push([{ status: "active", count: 20 }]); // statusDistribution
    selectResultsQueue.push([{ count: 25 }]); // total
    const result = await caller.lifecycleEcosystem.dashboard.getCompanyHealth();
    expect(result.stageDistribution).toHaveLength(1);
    expect(result.totalJourneys).toBe(25);
  });
});

// ── Access Control Tests ──
describe("access control", () => {
  const restrictedRoles = ["employee", "staff"];
  const allowedRoles = ["dept_manager", "bu_gm", "hr_director", "admin", "ceo", "team_leader"];

  for (const role of restrictedRoles) {
    it(`rejects ${role} from journey.list`, async () => {
      const caller = createAuthenticatedCaller(role);
      await expect(caller.lifecycleEcosystem.journey.list({ limit: 10, offset: 0 }))
        .rejects.toThrow();
    });
  }

  for (const role of allowedRoles) {
    it(`allows ${role} to journey.list`, async () => {
      const caller = appRouter.createCaller({ user: { id: 1, name: "Test", role } } as any);
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ count: 0 }]);
      const result = await caller.lifecycleEcosystem.journey.list({ limit: 10, offset: 0 });
      expect(result.total).toBe(0);
    });
  }
});
