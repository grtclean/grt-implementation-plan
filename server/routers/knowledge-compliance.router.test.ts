import { describe, it, expect, vi, beforeEach } from "vitest";

const { selectResultsQueue, returningQueue, chainMethods } = vi.hoisted(() => {
  const selectResultsQueue: any[] = [];
  const returningQueue: any[] = [];
  const chainMethods = {
    where: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(function (this: any) { return this; }),
    groupBy: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => {
      const r = returningQueue.shift();
      return r !== undefined ? Promise.resolve(r) : Promise.resolve([{ id: 1 }]);
    }),
    then: vi.fn().mockImplementation((cb: any) => {
      const r = selectResultsQueue.shift();
      return Promise.resolve(cb(r !== undefined ? r : []));
    }),
  };
  return { selectResultsQueue, returningQueue, chainMethods };
});

vi.mock("../../drizzle/knowledge-compliance-schema", () => ({
  knowledgeCategories: { id: "id", code: "code", isActive: "is_active", sortOrder: "sort_order" },
  knowledgeRoleRequirements: { id: "id", role: "role", isActive: "is_active", categoryCode: "category_code", skillLevelRequired: "skill_level_required", sortOrder: "sort_order", docSourceType: "doc_source_type", docSourceId: "doc_source_id" },
  knowledgeSkillLevelStandards: { id: "id", role: "role", department: "department", skillLevel: "skill_level", isActive: "is_active" },
  knowledgeAccessAuthorizations: { id: "id", userId: "user_id", status: "status", createdAt: "created_at", currentAccessCount: "current_access_count", maxAccessCount: "max_access_count", validUntil: "valid_until" },
  knowledgeLearningProgress: { id: "id", userId: "user_id", status: "status", categoryCode: "category_code", docSourceType: "doc_source_type", docSourceId: "doc_source_id", updatedAt: "updated_at", totalStudyMinutes: "total_study_minutes" },
  knowledgeTheoryTests: { id: "id", isActive: "is_active", categoryCode: "category_code", targetRole: "target_role", skillLevelRequired: "skill_level_required" },
  knowledgeTestAttempts: { id: "id", userId: "user_id", testId: "test_id", createdAt: "created_at", passed: "passed" },
}));

vi.mock("../../drizzle/schema", () => ({ users: { id: "id" } }));

vi.mock("../db", () => ({
  db: {
    select: vi.fn().mockReturnValue(chainMethods),
    insert: vi.fn().mockReturnValue(chainMethods),
    update: vi.fn().mockReturnValue(chainMethods),
    delete: vi.fn().mockReturnValue(chainMethods),
  },
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  sql: vi.fn(),
  desc: vi.fn((c: any) => c),
  asc: vi.fn((c: any) => c),
  count: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  like: vi.fn(),
}));

import { knowledgeComplianceRouter } from "./knowledge-compliance.router";
import { router } from "../_core/trpc";

const appRouter = router({ knowledgeCompliance: knowledgeComplianceRouter });

function createCaller() {
  return appRouter.createCaller({
    user: { id: 1, name: "Test User", role: "production_engineer", email: "test@grt.com" },
  } as any);
}

beforeEach(() => {
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  vi.clearAllMocks();
});

describe("knowledgeCompliance.category", () => {
  it("list returns categories", async () => {
    selectResultsQueue.push([{ id: 1, code: "TRAIN", name: "培训资料" }]);
    const result = await createCaller().knowledgeCompliance.category.list();
    expect(result[0].code).toBe("TRAIN");
  });

  it("getById returns category", async () => {
    selectResultsQueue.push([{ id: 1, code: "SOP" }]);
    const result = await createCaller().knowledgeCompliance.category.getById({ id: 1 });
    expect(result?.code).toBe("SOP");
  });

  it("create inserts category", async () => {
    returningQueue.push([{ id: 10 }]);
    const result = await createCaller().knowledgeCompliance.category.create({ code: "NEW", name: "新分类" });
    expect(result?.id).toBe(10);
  });

  it("update modifies category", async () => {
    const result = await createCaller().knowledgeCompliance.category.update({ id: 1, name: "更新" });
    expect(result.success).toBe(true);
  });
});

describe("knowledgeCompliance.requirement", () => {
  it("getByRole returns role requirements", async () => {
    selectResultsQueue.push([{ id: 1, role: "production_engineer", docTitle: "安全手册" }]);
    const result = await createCaller().knowledgeCompliance.requirement.getByRole({ role: "production_engineer" });
    expect(result[0].docTitle).toBe("安全手册");
  });

  it("getByRole filters by skill level", async () => {
    selectResultsQueue.push([{ id: 1, skillLevelRequired: 1 }]);
    const result = await createCaller().knowledgeCompliance.requirement.getByRole({ role: "production_engineer", skillLevel: 2 });
    expect(result).toHaveLength(1);
  });

  it("getMyRequirements uses user role", async () => {
    selectResultsQueue.push([{ id: 1, role: "production_engineer" }]);
    const result = await createCaller().knowledgeCompliance.requirement.getMyRequirements({});
    expect(result).toHaveLength(1);
  });

  it("create inserts requirement", async () => {
    returningQueue.push([{ id: 5 }]);
    const result = await createCaller().knowledgeCompliance.requirement.create({
      role: "production_engineer", docSourceType: "sop", docTitle: "新SOP",
    });
    expect(result?.id).toBe(5);
  });

  it("listRoles returns unique roles", async () => {
    selectResultsQueue.push([{ role: "production_engineer" }, { role: "ALL" }]);
    const result = await createCaller().knowledgeCompliance.requirement.listRoles();
    expect(result).toHaveLength(2);
  });

  it("getStats returns category counts", async () => {
    selectResultsQueue.push([{ categoryCode: "SAFETY", count: 3 }]);
    const result = await createCaller().knowledgeCompliance.requirement.getStats({ role: "production_engineer" });
    expect(result[0].count).toBe(3);
  });
});

describe("knowledgeCompliance.skillLevel", () => {
  it("getByRole returns skill levels", async () => {
    selectResultsQueue.push([
      { id: 1, skillLevel: 1, levelName: "初级" },
      { id: 2, skillLevel: 2, levelName: "中级" },
    ]);
    const result = await createCaller().knowledgeCompliance.skillLevel.getByRole({ role: "production_engineer" });
    expect(result).toHaveLength(2);
    expect(result[0].levelName).toBe("初级");
  });

  it("getLevel returns specific level", async () => {
    selectResultsQueue.push([{ id: 1, skillLevel: 3, levelName: "高级" }]);
    const result = await createCaller().knowledgeCompliance.skillLevel.getLevel({ role: "production_engineer", skillLevel: 3 });
    expect(result?.levelName).toBe("高级");
  });

  it("create inserts skill level", async () => {
    returningQueue.push([{ id: 8 }]);
    const result = await createCaller().knowledgeCompliance.skillLevel.create({
      role: "quality_inspector", skillLevel: 4, levelName: "专家",
    });
    expect(result?.id).toBe(8);
  });

  it("listRoles returns roles with levels", async () => {
    selectResultsQueue.push([{ role: "production_engineer" }]);
    const result = await createCaller().knowledgeCompliance.skillLevel.listRoles();
    expect(result[0].role).toBe("production_engineer");
  });
});

describe("knowledgeCompliance.access", () => {
  it("requestAccess creates pending authorization", async () => {
    returningQueue.push([{ id: 20 }]);
    const result = await createCaller().knowledgeCompliance.access.requestAccess({
      docSourceType: "org_doc", docTitle: "客户图纸", requestReason: "项目需要",
    });
    expect(result?.id).toBe(20);
  });

  it("listMy returns user authorizations", async () => {
    selectResultsQueue.push([{ id: 1, status: "active", docTitle: "图纸" }]);
    const result = await createCaller().knowledgeCompliance.access.listMy({});
    expect(result[0].status).toBe("active");
  });

  it("listPending returns pending requests", async () => {
    selectResultsQueue.push([{ id: 1, status: "pending" }]);
    const result = await createCaller().knowledgeCompliance.access.listPending();
    expect(result).toHaveLength(1);
  });

  it("approve activates authorization", async () => {
    const result = await createCaller().knowledgeCompliance.access.approve({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("reject revokes authorization", async () => {
    const result = await createCaller().knowledgeCompliance.access.reject({ id: 1, reason: "不符合条件" });
    expect(result.success).toBe(true);
  });

  it("recordAccess increments count", async () => {
    selectResultsQueue.push([{ id: 1, status: "active", currentAccessCount: 2, maxAccessCount: 5, validUntil: null }]);
    const result = await createCaller().knowledgeCompliance.access.recordAccess({ id: 1 });
    expect(result.accessCount).toBe(3);
    expect(result.remaining).toBe(2);
  });

  it("recordAccess rejects invalid auth", async () => {
    selectResultsQueue.push([{ id: 1, status: "expired" }]);
    await expect(createCaller().knowledgeCompliance.access.recordAccess({ id: 1 }))
      .rejects.toThrow("授权无效或已过期");
  });

  it("recordAccess rejects exhausted count", async () => {
    selectResultsQueue.push([{ id: 1, status: "active", currentAccessCount: 5, maxAccessCount: 5, validUntil: null }]);
    await expect(createCaller().knowledgeCompliance.access.recordAccess({ id: 1 }))
      .rejects.toThrow("授权次数已用尽");
  });

  it("revoke sets status to revoked", async () => {
    const result = await createCaller().knowledgeCompliance.access.revoke({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("knowledgeCompliance.progress", () => {
  it("getMyProgress returns user progress", async () => {
    selectResultsQueue.push([{ id: 1, status: "in_progress", docTitle: "SOP" }]);
    const result = await createCaller().knowledgeCompliance.progress.getMyProgress({});
    expect(result[0].status).toBe("in_progress");
  });

  it("getByUser returns specific user's progress", async () => {
    selectResultsQueue.push([{ id: 1, userId: 2, status: "completed" }]);
    const result = await createCaller().knowledgeCompliance.progress.getByUser({ userId: 2 });
    expect(result[0].status).toBe("completed");
  });

  it("upsertProgress creates new progress", async () => {
    selectResultsQueue.push([]); // no existing
    returningQueue.push([{ id: 15 }]);
    const result = await createCaller().knowledgeCompliance.progress.upsertProgress({
      docSourceType: "sop", docTitle: "新SOP", status: "in_progress",
    });
    expect(result.action).toBe("created");
  });

  it("upsertProgress updates existing progress", async () => {
    selectResultsQueue.push([{ id: 5, totalStudyMinutes: 30 }]); // existing
    const result = await createCaller().knowledgeCompliance.progress.upsertProgress({
      docSourceType: "sop", docTitle: "新SOP", studyMinutesAdded: 15,
    });
    expect(result.action).toBe("updated");
  });

  it("getMyStats returns aggregated counts", async () => {
    selectResultsQueue.push([{ status: "completed", count: 5 }, { status: "in_progress", count: 3 }]);
    const result = await createCaller().knowledgeCompliance.progress.getMyStats();
    expect(result).toHaveLength(2);
  });
});

describe("knowledgeCompliance.test", () => {
  it("list returns available tests", async () => {
    selectResultsQueue.push([{ id: 1, title: "安全测试", totalPoints: 100 }]);
    const result = await createCaller().knowledgeCompliance.test.list({});
    expect(result[0].title).toBe("安全测试");
  });

  it("getForTaking returns test without answers", async () => {
    selectResultsQueue.push([{
      id: 1, title: "安全测试", totalPoints: 100, passingScore: 60, timeLimitMinutes: 20,
      maxAttempts: 3,
      questions: [{ id: 1, type: "single", question: "Q1", options: ["A", "B"], correctAnswer: "A", points: 10 }],
    }]);
    selectResultsQueue.push([{ count: 0 }]); // prev attempts
    const result = await createCaller().knowledgeCompliance.test.getForTaking({ testId: 1 });
    expect(result.questions[0]).not.toHaveProperty("correctAnswer");
    expect(result.attemptNumber).toBe(1);
  });

  it("getForTaking rejects when max attempts reached", async () => {
    selectResultsQueue.push([{ id: 1, maxAttempts: 3, questions: [] }]);
    selectResultsQueue.push([{ count: 3 }]); // 3 attempts already
    await expect(createCaller().knowledgeCompliance.test.getForTaking({ testId: 1 }))
      .rejects.toThrow("已达到最大尝试次数");
  });

  it("submitTest grades correctly", async () => {
    selectResultsQueue.push([{
      id: 1, totalPoints: 20, passingScore: 10,
      questions: [
        { id: 1, type: "single", question: "Q1", correctAnswer: "A", points: 10 },
        { id: 2, type: "truefalse", question: "Q2", correctAnswer: "true", points: 10 },
      ],
    }]);
    selectResultsQueue.push([{ count: 0 }]); // prev attempts
    returningQueue.push([{ id: 50 }]);
    const result = await createCaller().knowledgeCompliance.test.submitTest({
      testId: 1,
      answers: { "1": "A", "2": "false" },
      startedAt: new Date(Date.now() - 600000).toISOString(),
    });
    expect(result.score).toBe(10); // Q1 correct, Q2 wrong
    expect(result.passed).toBe(true); // 10 >= 10
    expect(result.questionResults).toHaveLength(2);
    expect(result.questionResults![0].correct).toBe(true);
    expect(result.questionResults![1].correct).toBe(false);
  });

  it("submitTest handles multiple-choice grading", async () => {
    selectResultsQueue.push([{
      id: 2, totalPoints: 15, passingScore: 15,
      questions: [
        { id: 1, type: "multiple", question: "Q1", correctAnswer: ["A", "B"], points: 15 },
      ],
    }]);
    selectResultsQueue.push([{ count: 0 }]);
    returningQueue.push([{ id: 51 }]);
    const result = await createCaller().knowledgeCompliance.test.submitTest({
      testId: 2, answers: { "1": ["A", "B"] }, startedAt: new Date().toISOString(),
    });
    expect(result.score).toBe(15);
    expect(result.passed).toBe(true);
  });

  it("getMyAttempts returns attempt history", async () => {
    selectResultsQueue.push([{ id: 1, testId: 1, score: 80, passed: true }]);
    const result = await createCaller().knowledgeCompliance.test.getMyAttempts({});
    expect(result[0].passed).toBe(true);
  });

  it("create inserts new test", async () => {
    returningQueue.push([{ id: 30 }]);
    const result = await createCaller().knowledgeCompliance.test.create({
      title: "新测试", questions: [
        { id: 1, type: "single", question: "Q", options: ["A"], correctAnswer: "A", points: 10 },
      ],
      totalPoints: 10, passingScore: 6,
    });
    expect(result?.id).toBe(30);
  });
});

describe("knowledgeCompliance.dashboard", () => {
  it("getMyOverview returns all data sources", async () => {
    selectResultsQueue.push([{ id: 1, role: "production_engineer" }]); // requirements
    selectResultsQueue.push([{ id: 1, status: "completed" }]); // progress
    selectResultsQueue.push([{ id: 1, passed: true }]); // testAttempts
    selectResultsQueue.push([{ id: 1, code: "TRAIN" }]); // categories
    const result = await createCaller().knowledgeCompliance.dashboard.getMyOverview();
    expect(result.requirements).toHaveLength(1);
    expect(result.progress).toHaveLength(1);
    expect(result.testAttempts).toHaveLength(1);
    expect(result.categories).toHaveLength(1);
  });

  it("getTeamProgress returns aggregated stats", async () => {
    selectResultsQueue.push([{ status: "completed", count: 10 }]);
    const result = await createCaller().knowledgeCompliance.dashboard.getTeamProgress({});
    expect(result[0].count).toBe(10);
  });
});
