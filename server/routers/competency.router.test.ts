/**
 * HR Competency Assessment Router — Unit Tests
 *
 * Tests all 2 tRPC procedures:
 *   1. competency.getAssessments  — list assessments with optional department/search filters
 *   2. competency.getDepartments  — distinct department list
 *
 * Plus: auth guards (anonymous rejection for both procedures).
 *
 * Mock strategy: `db.execute(sql`...`)` returns from a FIFO queue (`executeResults`).
 * Each test pushes the expected `{ rows: [...] }` before calling the procedure.
 *
 * Run: npx vitest run server/routers/competency.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock DB (execute-based) ─────────────────────────────────
const { executeResults } = vi.hoisted(() => ({
  executeResults: [] as any[],
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => ({
    execute: vi.fn(async () => {
      return executeResults.length > 0 ? executeResults.shift()! : { rows: [] };
    }),
  })),
}));

vi.mock("drizzle-orm", () => ({
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

// ── Sample data ─────────────────────────────────────────────
const sampleAssessments = [
  {
    employeeId: 1,
    employeeName: "张三",
    department: "生产部",
    position: "焊工",
    tScore: 85,
    sScore: 80,
    dScore: 75,
    cScore: 90,
    kScore: 70,
    lScore: 88,
    assessedAt: "2026-02-01",
  },
  {
    employeeId: 2,
    employeeName: "李四",
    department: "质检部",
    position: "质检员",
    tScore: 70,
    sScore: 65,
    dScore: 80,
    cScore: 85,
    kScore: 60,
    lScore: 75,
    assessedAt: "2026-02-01",
  },
  {
    employeeId: 3,
    employeeName: "王五",
    department: "生产部",
    position: "组装工",
    tScore: 60,
    sScore: 55,
    dScore: 70,
    cScore: 65,
    kScore: 50,
    lScore: 60,
    assessedAt: "2026-02-01",
  },
];

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  executeResults.length = 0;
});

// ════════════════════════════════════════════════════════════
// getAssessments
// ════════════════════════════════════════════════════════════
describe("competency.getAssessments", () => {
  it("returns all assessments when no filters are provided", async () => {
    executeResults.push({ rows: [...sampleAssessments] });
    const caller = createAuthenticatedCaller();

    const result = await caller.competency.getAssessments();

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.items[0].employeeName).toBe("张三");
    expect(result.items[1].employeeName).toBe("李四");
    expect(result.items[2].employeeName).toBe("王五");
  });

  it("filters by department", async () => {
    executeResults.push({ rows: [...sampleAssessments] });
    const caller = createAuthenticatedCaller();

    const result = await caller.competency.getAssessments({
      department: "生产部",
    });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.items.every((i: any) => i.department === "生产部")).toBe(true);
    expect(result.items[0].employeeName).toBe("张三");
    expect(result.items[1].employeeName).toBe("王五");
  });

  it("filters by search matching employee name", async () => {
    executeResults.push({ rows: [...sampleAssessments] });
    const caller = createAuthenticatedCaller();

    const result = await caller.competency.getAssessments({
      search: "李四",
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].employeeName).toBe("李四");
    expect(result.items[0].department).toBe("质检部");
  });

  it("filters by search matching department name", async () => {
    executeResults.push({ rows: [...sampleAssessments] });
    const caller = createAuthenticatedCaller();

    const result = await caller.competency.getAssessments({
      search: "质检",
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].employeeName).toBe("李四");
    expect(result.items[0].department).toBe("质检部");
  });

  it("returns empty result when database has no data", async () => {
    executeResults.push({ rows: [] });
    const caller = createAuthenticatedCaller();

    const result = await caller.competency.getAssessments();

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("works with no input (undefined)", async () => {
    executeResults.push({ rows: [...sampleAssessments] });
    const caller = createAuthenticatedCaller();

    const result = await caller.competency.getAssessments(undefined);

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it("applies both department and search filters together", async () => {
    executeResults.push({ rows: [...sampleAssessments] });
    const caller = createAuthenticatedCaller();

    const result = await caller.competency.getAssessments({
      department: "生产部",
      search: "王",
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].employeeName).toBe("王五");
  });

  it("search is case-insensitive", async () => {
    const mixedCaseData = [
      { ...sampleAssessments[0], employeeName: "Zhang San" },
      { ...sampleAssessments[1], employeeName: "Li Si" },
    ];
    executeResults.push({ rows: mixedCaseData });
    const caller = createAuthenticatedCaller();

    const result = await caller.competency.getAssessments({
      search: "zhang",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].employeeName).toBe("Zhang San");
  });

  it("preserves score fields in returned items", async () => {
    executeResults.push({ rows: [sampleAssessments[0]] });
    const caller = createAuthenticatedCaller();

    const result = await caller.competency.getAssessments();

    const item = result.items[0];
    expect(item.tScore).toBe(85);
    expect(item.sScore).toBe(80);
    expect(item.dScore).toBe(75);
    expect(item.cScore).toBe(90);
    expect(item.kScore).toBe(70);
    expect(item.lScore).toBe(88);
  });
});

// ════════════════════════════════════════════════════════════
// getDepartments
// ════════════════════════════════════════════════════════════
describe("competency.getDepartments", () => {
  it("returns distinct department strings", async () => {
    executeResults.push({
      rows: [
        { department: "生产部" },
        { department: "质检部" },
        { department: "研发部" },
      ],
    });
    const caller = createAuthenticatedCaller();

    const result = await caller.competency.getDepartments();

    expect(result).toEqual(["生产部", "质检部", "研发部"]);
    expect(result).toHaveLength(3);
  });

  it("returns empty array when no departments exist", async () => {
    executeResults.push({ rows: [] });
    const caller = createAuthenticatedCaller();

    const result = await caller.competency.getDepartments();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════
// Auth guards — anonymous callers must be rejected
// ════════════════════════════════════════════════════════════
describe("competency auth guards", () => {
  it("rejects anonymous caller for getAssessments", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.competency.getAssessments()).rejects.toThrow();
  });

  it("rejects anonymous caller for getDepartments", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.competency.getDepartments()).rejects.toThrow();
  });
});
