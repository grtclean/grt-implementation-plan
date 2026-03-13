/**
 * Help Router — Unit Tests
 * 14 procedures across 2 groups:
 *   Queries    (8): listArticles, getArticle, getContextualHelp, searchHelp,
 *                   getCategories, getPopularArticles, getChangelog, getWalkthroughs
 *   Mutations  (6): createArticle, updateArticle, deleteArticle, reorderArticles,
 *                   askCopilot, recordCopilotFeedback
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

/**
 * Two-layer mock: `db` (no .then) -> `chain` (thenable).
 * This avoids the JS thenable-unwrapping issue where Promise.resolve(obj)
 * calls obj.then() if it exists, destroying the mock.
 */
function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from",
    "where",
    "orderBy",
    "limit",
    "offset",
    "values",
    "set",
    "onConflictDoUpdate",
    "onConflictDoNothing",
    "groupBy",
    "having",
    "innerJoin",
    "leftJoin",
    "rightJoin",
    "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try {
      return resolve(getNextResult());
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
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

vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
  getDb: vi.fn(async () => mockDb),
}));

// ── Mock schema imports (column-name string objects) ────────
vi.mock("../../drizzle/help-schema", () => ({
  helpArticles: {
    id: "id",
    routePath: "routePath",
    featureKey: "featureKey",
    title: "title",
    titleZh: "titleZh",
    content: "content",
    contentZh: "contentZh",
    category: "category",
    tags: "tags",
    relatedRoutes: "relatedRoutes",
    videoUrl: "videoUrl",
    sortOrder: "sortOrder",
    isActive: "isActive",
    createdBy: "createdBy",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  HELP_CATEGORIES: [
    "GETTING_STARTED",
    "FEATURE_GUIDE",
    "FAQ",
    "TROUBLESHOOTING",
    "BEST_PRACTICE",
    "CHANGELOG",
    "WALKTHROUGH",
  ],
}));

vi.mock("../../drizzle/schema", () => ({
  aiLearningRecords: {
    id: "id",
    assistantId: "assistantId",
    employeeId: "employeeId",
    learningSource: "learningSource",
    sourceReference: "sourceReference",
    learnedContent: "learnedContent",
    contentCategory: "contentCategory",
    confidenceScore: "confidenceScore",
    appliedCount: "appliedCount",
    effectivenessScore: "effectivenessScore",
    createdAt: "createdAt",
  },
  feedback: {
    id: "id",
    userId: "userId",
    type: "type",
    content: "content",
    status: "status",
    createdAt: "createdAt",
  },
}));

// ── Mock LLM ────────────────────────────────────────────────
const mockInvokeLLM = vi.fn();
vi.mock("../_core/llm", () => ({
  invokeLLM: (...args: any[]) => mockInvokeLLM(...args),
}));

// ── Mock task-worker service (GRT开发第一定律) ─────────────────
const mockSubmitTask = vi.fn().mockResolvedValue({ taskId: 42 });
const mockGetTaskStatus = vi.fn();
vi.mock("../services/task-worker.service", () => ({
  submitTask: (...args: any[]) => mockSubmitTask(...args),
  getTaskStatus: (...args: any[]) => mockGetTaskStatus(...args),
  registerTaskHandler: vi.fn(),
}));

// ── Mock knowledge-base service ─────────────────────────────
const mockSearchDocuments = vi.fn();
const mockIncrementRelevance = vi.fn();
vi.mock("../modules/knowledge-base.service", () => ({
  searchDocuments: (...args: any[]) => mockSearchDocuments(...args),
  incrementRelevance: (...args: any[]) => mockIncrementRelevance(...args),
}));

// ── Mock drizzle-orm operators (pass-through) ───────────────
vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  or: vi.fn((...a: any[]) => a),
  desc: vi.fn((a: any) => a),
  asc: vi.fn((a: any) => a),
  sql: Object.assign(vi.fn((...a: any[]) => a), {
    raw: vi.fn((a: any) => a),
  }),
  ilike: vi.fn((...a: any[]) => a),
  count: vi.fn(() => "count"),
  gte: vi.fn((...a: any[]) => a),
}));

// ── Helpers ─────────────────────────────────────────────────
function makeArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    routePath: "/projects",
    featureKey: "project.gates",
    title: "Project Gates",
    titleZh: "项目门径",
    content: "Guide to using project gates.",
    contentZh: "项目门径使用指南。",
    category: "FEATURE_GUIDE",
    tags: ["project", "gates"],
    relatedRoutes: ["/projects/detail"],
    videoUrl: null,
    sortOrder: 0,
    isActive: true,
    createdBy: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
  vi.clearAllMocks();
  mockInvokeLLM.mockReset();
  mockSearchDocuments.mockReset();
  mockIncrementRelevance.mockReset();
  mockSubmitTask.mockReset().mockResolvedValue({ taskId: 42 });
  mockGetTaskStatus.mockReset();
});

// ══════════════════════════════════════════════════════════════
// QUERIES
// ══════════════════════════════════════════════════════════════

describe("help.listArticles", () => {
  it("returns items and total with no input", async () => {
    const articles = [makeArticle(), makeArticle({ id: 2, title: "FAQ" })];
    selectResultsQueue.push(articles); // items
    selectResultsQueue.push([{ value: 2 }]); // count
    const caller = createAnonymousCaller();
    const result = await caller.help.listArticles();
    expect(result).toEqual({ items: articles, total: 2 });
  });

  it("returns items filtered by category", async () => {
    const article = makeArticle({ category: "FAQ" });
    selectResultsQueue.push([article]);
    selectResultsQueue.push([{ value: 1 }]);
    const caller = createAnonymousCaller();
    const result = await caller.help.listArticles({ category: "FAQ" });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("returns items filtered by routePath", async () => {
    selectResultsQueue.push([makeArticle()]);
    selectResultsQueue.push([{ value: 1 }]);
    const caller = createAnonymousCaller();
    const result = await caller.help.listArticles({ routePath: "/projects" });
    expect(result.items).toHaveLength(1);
  });

  it("returns items filtered by isActive=false", async () => {
    selectResultsQueue.push([]);
    selectResultsQueue.push([{ value: 0 }]);
    const caller = createAnonymousCaller();
    const result = await caller.help.listArticles({ isActive: false });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("respects limit and offset parameters", async () => {
    selectResultsQueue.push([makeArticle()]);
    selectResultsQueue.push([{ value: 10 }]);
    const caller = createAnonymousCaller();
    const result = await caller.help.listArticles({ limit: 5, offset: 3 });
    expect(result.total).toBe(10);
  });

  it("returns empty when no articles exist", async () => {
    selectResultsQueue.push([]);
    selectResultsQueue.push([{ value: 0 }]);
    const caller = createAnonymousCaller();
    const result = await caller.help.listArticles();
    expect(result).toEqual({ items: [], total: 0 });
  });

  it("handles combined filters (category + routePath + isActive)", async () => {
    selectResultsQueue.push([]);
    selectResultsQueue.push([{ value: 0 }]);
    const caller = createAnonymousCaller();
    const result = await caller.help.listArticles({
      category: "GETTING_STARTED",
      routePath: "/nonexistent",
      isActive: true,
    });
    expect(result.items).toHaveLength(0);
  });
});

describe("help.getArticle", () => {
  it("returns an article by numeric id", async () => {
    const article = makeArticle();
    mockQueryResult = [article];
    const caller = createAnonymousCaller();
    const result = await caller.help.getArticle({ id: 1 });
    expect(result).toEqual(article);
  });

  it("returns an article by string id", async () => {
    const article = makeArticle({ id: 42 });
    mockQueryResult = [article];
    const caller = createAnonymousCaller();
    const result = await caller.help.getArticle({ id: "42" });
    expect(result).toEqual(article);
  });

  it("returns null when article not found", async () => {
    mockQueryResult = [];
    const caller = createAnonymousCaller();
    const result = await caller.help.getArticle({ id: 9999 });
    expect(result).toBeNull();
  });
});

describe("help.getContextualHelp", () => {
  it("returns articles for a given routePath", async () => {
    const articles = [makeArticle()];
    mockQueryResult = articles;
    const caller = createAnonymousCaller();
    const result = await caller.help.getContextualHelp({ routePath: "/projects" });
    expect(result.articles).toEqual(articles);
    expect(result.route).toBe("/projects");
  });

  it("returns articles with featureKey filter", async () => {
    const articles = [makeArticle({ featureKey: "project.gates" })];
    mockQueryResult = articles;
    const caller = createAnonymousCaller();
    const result = await caller.help.getContextualHelp({
      routePath: "/projects",
      featureKey: "project.gates",
    });
    expect(result.articles).toEqual(articles);
  });

  it("returns empty array when no contextual help found", async () => {
    mockQueryResult = [];
    const caller = createAnonymousCaller();
    const result = await caller.help.getContextualHelp({ routePath: "/unknown-page" });
    expect(result.articles).toEqual([]);
    expect(result.route).toBe("/unknown-page");
  });

  it("requires routePath (min length 1)", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.help.getContextualHelp({ routePath: "" })
    ).rejects.toThrow();
  });
});

describe("help.searchHelp", () => {
  it("returns matching articles by query", async () => {
    const articles = [makeArticle({ title: "Project" })];
    mockQueryResult = articles;
    const caller = createAnonymousCaller();
    const result = await caller.help.searchHelp({ query: "Project" });
    expect(result).toEqual(articles);
  });

  it("returns empty when no match", async () => {
    mockQueryResult = [];
    const caller = createAnonymousCaller();
    const result = await caller.help.searchHelp({ query: "zzzzzzzzz" });
    expect(result).toEqual([]);
  });

  it("respects limit parameter", async () => {
    mockQueryResult = [makeArticle()];
    const caller = createAnonymousCaller();
    const result = await caller.help.searchHelp({ query: "test", limit: 5 });
    expect(result).toHaveLength(1);
  });

  it("rejects empty query", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.help.searchHelp({ query: "" })
    ).rejects.toThrow();
  });
});

describe("help.getCategories", () => {
  it("returns category counts", async () => {
    mockQueryResult = [
      { category: "FAQ", count: 5 },
      { category: "FEATURE_GUIDE", count: 3 },
    ];
    const caller = createAnonymousCaller();
    const result = await caller.help.getCategories();
    expect(result).toEqual([
      { category: "FAQ", count: 5 },
      { category: "FEATURE_GUIDE", count: 3 },
    ]);
  });

  it("returns empty array when no categories", async () => {
    mockQueryResult = [];
    const caller = createAnonymousCaller();
    const result = await caller.help.getCategories();
    expect(result).toEqual([]);
  });

  it("converts count to number", async () => {
    mockQueryResult = [{ category: "FAQ", count: "7" }];
    const caller = createAnonymousCaller();
    const result = await caller.help.getCategories();
    expect(result[0].count).toBe(7);
    expect(typeof result[0].count).toBe("number");
  });
});

describe("help.getPopularArticles", () => {
  it("returns popular articles with default limit", async () => {
    const articles = [makeArticle(), makeArticle({ id: 2 })];
    mockQueryResult = articles;
    const caller = createAnonymousCaller();
    const result = await caller.help.getPopularArticles();
    expect(result).toEqual(articles);
  });

  it("returns popular articles with custom limit", async () => {
    mockQueryResult = [makeArticle()];
    const caller = createAnonymousCaller();
    const result = await caller.help.getPopularArticles({ limit: 3 });
    expect(result).toHaveLength(1);
  });

  it("returns empty when no active articles", async () => {
    mockQueryResult = [];
    const caller = createAnonymousCaller();
    const result = await caller.help.getPopularArticles();
    expect(result).toEqual([]);
  });
});

describe("help.getChangelog", () => {
  it("returns changelog articles", async () => {
    const logs = [
      makeArticle({ id: 1, category: "CHANGELOG", title: "v2.0" }),
      makeArticle({ id: 2, category: "CHANGELOG", title: "v1.0" }),
    ];
    mockQueryResult = logs;
    const caller = createAnonymousCaller();
    const result = await caller.help.getChangelog();
    expect(result).toEqual(logs);
  });

  it("respects custom limit", async () => {
    mockQueryResult = [makeArticle({ category: "CHANGELOG" })];
    const caller = createAnonymousCaller();
    const result = await caller.help.getChangelog({ limit: 5 });
    expect(result).toHaveLength(1);
  });

  it("returns empty when no changelog entries", async () => {
    mockQueryResult = [];
    const caller = createAnonymousCaller();
    const result = await caller.help.getChangelog();
    expect(result).toEqual([]);
  });
});

describe("help.getWalkthroughs", () => {
  it("returns walkthroughs with no filter", async () => {
    const walkthroughs = [makeArticle({ category: "WALKTHROUGH" })];
    mockQueryResult = walkthroughs;
    const caller = createAnonymousCaller();
    const result = await caller.help.getWalkthroughs();
    expect(result).toEqual(walkthroughs);
  });

  it("returns walkthroughs filtered by routePath", async () => {
    const wt = makeArticle({ category: "WALKTHROUGH", routePath: "/projects" });
    mockQueryResult = [wt];
    const caller = createAnonymousCaller();
    const result = await caller.help.getWalkthroughs({ routePath: "/projects" });
    expect(result).toEqual([wt]);
  });

  it("respects custom limit", async () => {
    mockQueryResult = [];
    const caller = createAnonymousCaller();
    const result = await caller.help.getWalkthroughs({ limit: 3 });
    expect(result).toEqual([]);
  });

  it("returns empty when no walkthroughs for route", async () => {
    mockQueryResult = [];
    const caller = createAnonymousCaller();
    const result = await caller.help.getWalkthroughs({ routePath: "/nonexistent" });
    expect(result).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
// MUTATIONS
// ══════════════════════════════════════════════════════════════

describe("help.createArticle", () => {
  it("creates an article with all fields", async () => {
    const newArticle = makeArticle({ id: 10, createdBy: 1 });
    mockReturningResult = [newArticle];
    const caller = createAdminCaller();
    const result = await caller.help.createArticle({
      routePath: "/projects",
      featureKey: "project.gates",
      title: "Project Gates",
      titleZh: "项目门径",
      content: "Guide to using project gates.",
      contentZh: "项目门径使用指南。",
      category: "FEATURE_GUIDE",
      tags: ["project", "gates"],
      relatedRoutes: ["/projects/detail"],
      videoUrl: "https://example.com/video.mp4",
      sortOrder: 0,
      isActive: true,
    });
    expect(result).toEqual(newArticle);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("creates an article with minimal required fields", async () => {
    const newArticle = makeArticle({ id: 11 });
    mockReturningResult = [newArticle];
    const caller = createAdminCaller();
    const result = await caller.help.createArticle({
      title: "Min Title",
      titleZh: "最小标题",
      content: "Content here.",
      contentZh: "内容在这里。",
    });
    expect(result).toEqual(newArticle);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.help.createArticle({
        title: "Test",
        titleZh: "测试",
        content: "Content",
        contentZh: "内容",
      })
    ).rejects.toThrow();
  });

  it("rejects when title is empty", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.help.createArticle({
        title: "",
        titleZh: "测试",
        content: "Content",
        contentZh: "内容",
      })
    ).rejects.toThrow();
  });

  it("rejects when content is empty", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.help.createArticle({
        title: "Title",
        titleZh: "标题",
        content: "",
        contentZh: "内容",
      })
    ).rejects.toThrow();
  });

  it("rejects invalid category", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.help.createArticle({
        title: "Title",
        titleZh: "标题",
        content: "Content",
        contentZh: "内容",
        category: "INVALID" as any,
      })
    ).rejects.toThrow();
  });
});

describe("help.updateArticle", () => {
  it("updates article fields", async () => {
    const updated = makeArticle({ title: "Updated Title" });
    mockReturningResult = [updated];
    const caller = createAdminCaller();
    const result = await caller.help.updateArticle({
      id: 1,
      title: "Updated Title",
    });
    expect(result).toEqual(updated);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("updates article with string id", async () => {
    const updated = makeArticle({ id: 5, titleZh: "新标题" });
    mockReturningResult = [updated];
    const caller = createAdminCaller();
    const result = await caller.help.updateArticle({
      id: "5",
      titleZh: "新标题",
    });
    expect(result).toEqual(updated);
  });

  it("updates multiple fields at once", async () => {
    const updated = makeArticle({
      title: "New",
      titleZh: "新",
      category: "FAQ",
      isActive: false,
      sortOrder: 5,
    });
    mockReturningResult = [updated];
    const caller = createAdminCaller();
    const result = await caller.help.updateArticle({
      id: 1,
      title: "New",
      titleZh: "新",
      category: "FAQ",
      isActive: false,
      sortOrder: 5,
    });
    expect(result).toEqual(updated);
  });

  it("throws when article not found", async () => {
    mockReturningResult = [];
    const caller = createAdminCaller();
    await expect(
      caller.help.updateArticle({ id: 9999, title: "Nope" })
    ).rejects.toThrow("Help article #9999 not found");
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.help.updateArticle({ id: 1, title: "Updated" })
    ).rejects.toThrow();
  });

  it("allows setting videoUrl to null", async () => {
    const updated = makeArticle({ videoUrl: null });
    mockReturningResult = [updated];
    const caller = createAdminCaller();
    const result = await caller.help.updateArticle({
      id: 1,
      videoUrl: null,
    });
    expect(result.videoUrl).toBeNull();
  });

  it("allows updating relatedRoutes", async () => {
    const updated = makeArticle({ relatedRoutes: ["/a", "/b"] });
    mockReturningResult = [updated];
    const caller = createAdminCaller();
    const result = await caller.help.updateArticle({
      id: 1,
      relatedRoutes: ["/a", "/b"],
    });
    expect(result.relatedRoutes).toEqual(["/a", "/b"]);
  });

  it("allows updating tags", async () => {
    const updated = makeArticle({ tags: ["new-tag"] });
    mockReturningResult = [updated];
    const caller = createAdminCaller();
    const result = await caller.help.updateArticle({
      id: 1,
      tags: ["new-tag"],
    });
    expect(result.tags).toEqual(["new-tag"]);
  });
});

describe("help.deleteArticle", () => {
  it("soft-deletes an article (sets isActive=false)", async () => {
    const deleted = makeArticle({ isActive: false });
    mockReturningResult = [deleted];
    const caller = createAdminCaller();
    const result = await caller.help.deleteArticle({ id: 1 });
    expect(result.isActive).toBe(false);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("soft-deletes with string id", async () => {
    const deleted = makeArticle({ id: 7, isActive: false });
    mockReturningResult = [deleted];
    const caller = createAdminCaller();
    const result = await caller.help.deleteArticle({ id: "7" });
    expect(result.isActive).toBe(false);
  });

  it("throws when article not found", async () => {
    mockReturningResult = [];
    const caller = createAdminCaller();
    await expect(
      caller.help.deleteArticle({ id: 9999 })
    ).rejects.toThrow("Help article #9999 not found");
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.help.deleteArticle({ id: 1 })
    ).rejects.toThrow();
  });
});

describe("help.reorderArticles", () => {
  it("reorders multiple articles", async () => {
    const item1 = makeArticle({ id: 1, sortOrder: 0 });
    const item2 = makeArticle({ id: 2, sortOrder: 1 });
    // Each update returns one item via .returning()
    mockReturningResult = [item1];
    const caller = createAdminCaller();
    const result = await caller.help.reorderArticles({
      items: [
        { id: 1, sortOrder: 0 },
        { id: 2, sortOrder: 1 },
      ],
    });
    // Both iterations use the same mockReturningResult [item1]
    expect(result.updated).toBe(2);
    expect(result.items).toHaveLength(2);
  });

  it("handles empty items array", async () => {
    const caller = createAdminCaller();
    const result = await caller.help.reorderArticles({ items: [] });
    expect(result.updated).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it("handles string ids in items", async () => {
    mockReturningResult = [makeArticle({ id: 3, sortOrder: 10 })];
    const caller = createAdminCaller();
    const result = await caller.help.reorderArticles({
      items: [{ id: "3", sortOrder: 10 }],
    });
    expect(result.updated).toBe(1);
  });

  it("skips items not found (no returning result)", async () => {
    mockReturningResult = [];
    const caller = createAdminCaller();
    const result = await caller.help.reorderArticles({
      items: [{ id: 999, sortOrder: 0 }],
    });
    // returning() gives [] so destructuring gives undefined, which won't be pushed
    expect(result.updated).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.help.reorderArticles({ items: [{ id: 1, sortOrder: 0 }] })
    ).rejects.toThrow();
  });
});

describe("help.askCopilot (async task pattern)", () => {
  it("enqueues task and returns taskId with sources", async () => {
    const helpArticle = makeArticle({ id: 1, titleZh: "帮助1", contentZh: "内容1" });
    selectResultsQueue.push([helpArticle]); // helpResults
    selectResultsQueue.push([makeArticle({ id: 2, titleZh: "页面帮助", contentZh: "页面内容", routePath: "/projects" })]); // pageHelp
    selectResultsQueue.push([{ learnedContent: "Q: test\nA: test answer" }]); // fewShotExamples

    mockSearchDocuments.mockResolvedValue([
      { id: 10, title: "KB Doc", content: "Knowledge base content here.", category: "technical" },
    ]);

    const caller = createAdminCaller();
    const result = await caller.help.askCopilot({
      query: "如何使用项目门径?",
      routePath: "/projects",
    });

    // GRT开发第一定律: answer is null (async), taskId returned for polling
    expect(result.taskId).toBe(42);
    expect(result.answer).toBeNull();
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0].type).toBe("help");
    expect(result.sources[1].type).toBe("kb");
    expect(result.suggestedActions).toHaveLength(1);
    expect(mockSubmitTask).toHaveBeenCalledWith(
      "COPILOT_ASK",
      expect.objectContaining({ messages: expect.any(Array) }),
      expect.any(String),
      expect.objectContaining({ submittedById: expect.any(Number) }),
    );
  });

  it("handles knowledge base search failure gracefully", async () => {
    selectResultsQueue.push([]); // helpResults
    selectResultsQueue.push([]); // fewShotExamples
    mockSearchDocuments.mockRejectedValue(new Error("KB connection failed"));

    const caller = createAdminCaller();
    const result = await caller.help.askCopilot({ query: "query" });
    expect(result.taskId).toBe(42);
    expect(result.sources).toEqual([]);
  });

  it("passes conversation history to task input", async () => {
    selectResultsQueue.push([]); // helpResults
    selectResultsQueue.push([]); // fewShotExamples
    mockSearchDocuments.mockResolvedValue([]);

    const caller = createAdminCaller();
    await caller.help.askCopilot({
      query: "follow up",
      conversationHistory: [
        { role: "user", content: "initial question" },
        { role: "assistant", content: "initial answer" },
      ],
    });

    // The messages are passed to submitTask input
    const submitCall = mockSubmitTask.mock.calls[0];
    const messages = submitCall[1].messages;
    expect(messages).toHaveLength(4); // system + 2 history + user query
    expect(messages[1].role).toBe("user");
    expect(messages[3].content).toBe("follow up");
  });

  it("truncates conversation history to last 10", async () => {
    selectResultsQueue.push([]); // helpResults
    selectResultsQueue.push([]); // fewShotExamples
    mockSearchDocuments.mockResolvedValue([]);

    const history = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `message ${i}`,
    }));

    const caller = createAdminCaller();
    await caller.help.askCopilot({
      query: "latest question",
      conversationHistory: history,
    });

    const submitCall = mockSubmitTask.mock.calls[0];
    const messages = submitCall[1].messages;
    // system + last 10 history + user query = 12
    expect(messages).toHaveLength(12);
  });

  it("works without routePath", async () => {
    selectResultsQueue.push([]); // helpResults
    selectResultsQueue.push([]); // fewShotExamples
    mockSearchDocuments.mockResolvedValue([]);

    const caller = createAdminCaller();
    const result = await caller.help.askCopilot({ query: "general question" });
    expect(result.taskId).toBe(42);
    expect(result.suggestedActions).toEqual([]);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.help.askCopilot({ query: "test" })).rejects.toThrow();
  });

  it("rejects empty query", async () => {
    const caller = createAdminCaller();
    await expect(caller.help.askCopilot({ query: "" })).rejects.toThrow();
  });
});

describe("help.getCopilotResult (polling)", () => {
  it("returns completed task result", async () => {
    mockGetTaskStatus.mockResolvedValueOnce({
      id: 42, taskType: "COPILOT_ASK", status: "completed",
      resultData: { answer: "这是AI的回答。", sources: [], suggestedActions: [] },
      errorMessage: null, createdAt: "2026-03-12", completedAt: "2026-03-12", version: 2,
    });

    const caller = createAdminCaller();
    const result = await caller.help.getCopilotResult({ taskId: 42 });
    expect(result.status).toBe("completed");
    expect(result.answer).toBe("这是AI的回答。");
  });

  it("returns pending status", async () => {
    mockGetTaskStatus.mockResolvedValueOnce({
      id: 42, taskType: "COPILOT_ASK", status: "pending",
      resultData: null, errorMessage: null, createdAt: "2026-03-12", completedAt: null, version: 1,
    });

    const caller = createAdminCaller();
    const result = await caller.help.getCopilotResult({ taskId: 42 });
    expect(result.status).toBe("pending");
    expect(result.answer).toBeNull();
  });

  it("returns error for failed task", async () => {
    mockGetTaskStatus.mockResolvedValueOnce({
      id: 42, taskType: "COPILOT_ASK", status: "failed",
      resultData: null, errorMessage: "LLM timeout", createdAt: "2026-03-12", completedAt: "2026-03-12", version: 3,
    });

    const caller = createAdminCaller();
    const result = await caller.help.getCopilotResult({ taskId: 42 });
    expect(result.status).toBe("failed");
    expect(result.error).toBe("LLM timeout");
  });

  it("throws NOT_FOUND for missing task", async () => {
    mockGetTaskStatus.mockResolvedValueOnce(null);
    const caller = createAdminCaller();
    await expect(caller.help.getCopilotResult({ taskId: 999 })).rejects.toThrow("Task not found");
  });
});

describe("help.recordCopilotFeedback", () => {
  it("records positive feedback successfully", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.help.recordCopilotFeedback({
      query: "How to use gates?",
      answer: "Navigate to /projects.",
      routePath: "/projects",
      isPositive: true,
    });
    expect(result).toEqual({ success: true });
    // Insert called twice: aiLearningRecords + feedback
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it("records negative feedback successfully", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.help.recordCopilotFeedback({
      query: "Wrong answer question",
      answer: "Bad answer",
      isPositive: false,
      comment: "This was unhelpful.",
    });
    expect(result).toEqual({ success: true });
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it("records feedback without routePath", async () => {
    const caller = createAdminCaller();
    const result = await caller.help.recordCopilotFeedback({
      query: "general",
      answer: "general answer",
      isPositive: true,
    });
    expect(result).toEqual({ success: true });
  });

  it("records feedback without comment", async () => {
    const caller = createAdminCaller();
    const result = await caller.help.recordCopilotFeedback({
      query: "q",
      answer: "a",
      isPositive: false,
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.help.recordCopilotFeedback({
        query: "test",
        answer: "test",
        isPositive: true,
      })
    ).rejects.toThrow();
  });

  it("still returns success even if learning record insert fails", async () => {
    // The router catches errors from both inserts with try/catch
    // We need the insert mock to throw, but since both inserts use the same mock,
    // we verify the function still returns { success: true }
    const originalInsert = mockDb.insert;
    let callCount = 0;
    mockDb.insert = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        // First insert (aiLearningRecords) throws
        const chainThatThrows: any = {};
        chainThatThrows.values = vi.fn(() => {
          throw new Error("insert failed");
        });
        return chainThatThrows;
      }
      // Second insert (feedback) succeeds
      const chain: any = {};
      chain.values = vi.fn(() => chain);
      chain.then = (resolve: any) => resolve();
      return chain;
    });

    const caller = createAdminCaller();
    const result = await caller.help.recordCopilotFeedback({
      query: "q",
      answer: "a",
      isPositive: true,
    });
    expect(result).toEqual({ success: true });

    // Restore
    mockDb.insert = originalInsert;
  });
});

// ══════════════════════════════════════════════════════════════
// INPUT VALIDATION EDGE CASES
// ══════════════════════════════════════════════════════════════

describe("help - input validation edge cases", () => {
  it("listArticles accepts undefined input", async () => {
    selectResultsQueue.push([]);
    selectResultsQueue.push([{ value: 0 }]);
    const caller = createAnonymousCaller();
    const result = await caller.help.listArticles(undefined);
    expect(result).toEqual({ items: [], total: 0 });
  });

  it("getArticle rejects missing id", async () => {
    const caller = createAnonymousCaller();
    await expect(
      (caller.help.getArticle as any)({})
    ).rejects.toThrow();
  });

  it("createArticle rejects titleZh empty", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.help.createArticle({
        title: "Title",
        titleZh: "",
        content: "Content",
        contentZh: "内容",
      })
    ).rejects.toThrow();
  });

  it("createArticle rejects contentZh empty", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.help.createArticle({
        title: "Title",
        titleZh: "标题",
        content: "Content",
        contentZh: "",
      })
    ).rejects.toThrow();
  });

  it("searchHelp default limit applies", async () => {
    mockQueryResult = [];
    const caller = createAnonymousCaller();
    const result = await caller.help.searchHelp({ query: "x" });
    expect(result).toEqual([]);
  });

  it("reorderArticles rejects non-array items", async () => {
    const caller = createAdminCaller();
    await expect(
      (caller.help.reorderArticles as any)({ items: "not-array" })
    ).rejects.toThrow();
  });

  it("getPopularArticles accepts undefined input", async () => {
    mockQueryResult = [];
    const caller = createAnonymousCaller();
    const result = await caller.help.getPopularArticles(undefined);
    expect(result).toEqual([]);
  });

  it("getChangelog accepts undefined input", async () => {
    mockQueryResult = [];
    const caller = createAnonymousCaller();
    const result = await caller.help.getChangelog(undefined);
    expect(result).toEqual([]);
  });

  it("getWalkthroughs accepts undefined input", async () => {
    mockQueryResult = [];
    const caller = createAnonymousCaller();
    const result = await caller.help.getWalkthroughs(undefined);
    expect(result).toEqual([]);
  });
});
