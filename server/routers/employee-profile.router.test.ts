/**
 * Employee Digital Profile — tRPC Router Unit Tests
 *
 * Tests all 4 tRPC procedures:
 *   1. employeeProfile.getProfile     — single-user 360 profile
 *   2. employeeProfile.listProfiles   — all employees leaderboard
 *   3. employeeProfile.getTeamRadar   — department-level aggregation
 *   4. employeeProfile.getFullProfile — unified profile with TSDCKL + BU context
 *   5. employeeProfile.getTrainingPlan — real TSDCKL gap-based dev path
 *   6. employeeProfile.getWorkTasks — demo work task data
 *   7. employeeProfile.getWorkPlan — demo weekly work plan
 *   8. employeeProfile.getLifecycleProfile — tenure, salary, performance history
 *
 * Plus: auth guards (anonymous rejection), edge cases, data integrity.
 *
 * Run: npx vitest run server/routers/employee-profile.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
} from "../_test/trpc-test-utils";

// No DB mock needed — this router uses in-memory ASSESSED_EMPLOYEES data,
// but we still need to ensure the db module can be imported without errors
// by other routers in the appRouter. The mock below prevents pg connection errors.
vi.mock("../db", () => ({
  requireDb: vi.fn(async () => ({})),
}));

// ── Reset ───────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════════
// getProfile — Single-user 360° Profile
// ════════════════════════════════════════════════════════════════════

describe("employeeProfile.getProfile", () => {
  // ── Happy path ──────────────────────────────────────────────────

  it("returns a complete 360 profile for userId 1 (倪亚东, star performer)", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.dataSource).toBe("real");
    expect(result.profile.userId).toBe(1);
    expect(result.profile.employeeCode).toBe("GRT001");
    expect(result.profile.name).toBe("倪亚东");
    expect(result.profile.department).toBe("总裁办");
    expect(result.profile.position).toBe("董事长");
    expect(result.profile.level).toBe("P10");
    expect(result.profile.hireDate).toBe("2020-01-15");
  });

  it("returns tsdckl and buContext in getProfile response", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.tsdckl).not.toBeNull();
    expect(result.tsdckl!.T).toBe(80);
    expect(result.tsdckl!.S).toBe(100);
    expect(result.buContext).toEqual({ buCode: "HQ", buName: "总部" });
  });

  it("returns 4 dimensions in the profile", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.profile.dimensions).toHaveLength(4);
    const dimensionNames = result.profile.dimensions.map((d) => d.name);
    expect(dimensionNames).toEqual([
      "Execution",
      "Learning",
      "Collaboration",
      "Innovation",
    ]);
  });

  it("produces valid scores in [0, 100] range for all dimensions", async () => {
    const caller = createAdminCaller();

    for (const userId of [1, 101, 6]) {
      const result = await caller.employeeProfile.getProfile({ userId });
      expect(result.found).toBe(true);
      if (!result.found) continue;

      for (const dim of result.profile.dimensions) {
        expect(dim.score).toBeGreaterThanOrEqual(0);
        expect(dim.score).toBeLessThanOrEqual(100);
        expect(dim.dataPoints).toBeGreaterThanOrEqual(0);
        expect(dim.breakdown).toBeTruthy();
      }

      expect(result.profile.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.profile.overallScore).toBeLessThanOrEqual(100);
    }
  });

  it("returns Tier S or A for star performer userId 1 (倪亚东)", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    // userId 1 has TSDCKL: T=80, S=100, D=80, C=100, K=80, L=100
    // High across the board → should be tier S or A
    expect(["S", "A"]).toContain(result.profile.tier);
    expect(result.profile.overallScore).toBeGreaterThanOrEqual(75);
  });

  it("returns lower tier for userId 101 (王汝月, 会计助理)", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 101 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    // userId 101 has TSDCKL: T=20, S=40, D=20, C=40, K=60, L=20
    // Much lower scores across the board
    expect(result.profile.userId).toBe(101);
    expect(result.profile.employeeCode).toBe("GRT101");
    expect(result.profile.name).toBe("王汝月");
    // Not a star performer
    expect(result.profile.overallScore).toBeLessThan(90);
  });

  it("returns profile for userId 6 (洪香龙, 事业二部) with high Innovation", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 6 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.profile.userId).toBe(6);
    expect(result.profile.employeeCode).toBe("GRT006");
    expect(result.profile.name).toBe("洪香龙");
    expect(result.profile.department).toBe("事业二部");

    // userId 6 has TSDCKL: T=100, S=60, D=100, C=60, K=80, L=60
    // AI tasks: D=100 → floor(100/25)=4 tasks, quality=round(100*0.4+100*0.3+60*0.3)=88
    // volumeBonus=min(4*2,20)=8, meetingScore=round(60*0.4+60*0.4+60*0.2)=60 (<80 so no synergy)
    // Innovation=88+8=96
    const innovation = result.profile.dimensions.find(
      (d) => d.name === "Innovation",
    );
    expect(innovation).toBeDefined();
    expect(innovation!.score).toBeGreaterThan(90);
  });

  it("includes career advice with at least STRENGTH and DEVELOPMENT entries", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    const advice = result.profile.careerAdvice;
    expect(advice.length).toBeGreaterThanOrEqual(2);

    const types = advice.map((a) => a.type);
    expect(types).toContain("STRENGTH");
    expect(types).toContain("DEVELOPMENT");

    for (const a of advice) {
      expect(["STRENGTH", "DEVELOPMENT", "OPPORTUNITY"]).toContain(a.type);
      expect([
        "Execution",
        "Learning",
        "Collaboration",
        "Innovation",
      ]).toContain(a.dimension);
      expect(a.message).toBeTruthy();
    }
  });

  it("includes a generatedAt timestamp", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.profile.generatedAt).toBeTruthy();
    expect(new Date(result.profile.generatedAt).getTime()).not.toBeNaN();
  });

  // ── Not Found ───────────────────────────────────────────────────

  it("returns found: false for unknown userId", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 9999 });

    expect(result.found).toBe(false);
    if (result.found) throw new Error("unreachable");
    expect(result.error).toContain("9999");
    expect(result.error).toContain("not found");
  });

  it("returns found: false for userId 0", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 0 });

    expect(result.found).toBe(false);
  });

  it("returns found: false for negative userId", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getProfile({ userId: -1 });

    expect(result.found).toBe(false);
  });

  // ── Input validation ────────────────────────────────────────────

  it("rejects call without userId (missing input)", async () => {
    const caller = createAdminCaller();
    // @ts-expect-error - intentionally testing missing input
    await expect(caller.employeeProfile.getProfile({})).rejects.toThrow();
  });

  it("rejects non-numeric userId", async () => {
    const caller = createAdminCaller();
    await expect(
      // @ts-expect-error - intentionally testing invalid input type
      caller.employeeProfile.getProfile({ userId: "abc" }),
    ).rejects.toThrow();
  });

  // ── Admin caller works too ──────────────────────────────────────

  it("works with admin caller", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1 });
    expect(result.found).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════
// listProfiles — All Employees Leaderboard
// ════════════════════════════════════════════════════════════════════

describe("employeeProfile.listProfiles", () => {
  it("returns all 30 real employee profiles", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.listProfiles();

    expect(result.profiles).toHaveLength(30);
    expect(result.summary.total).toBe(30);
    expect(result.dataSource).toBe("real");
    expect(result.generatedAt).toBeTruthy();
  });

  it("returns profiles sorted by overallScore descending", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.listProfiles();

    for (let i = 1; i < result.profiles.length; i++) {
      expect(result.profiles[i - 1].overallScore).toBeGreaterThanOrEqual(
        result.profiles[i].overallScore,
      );
    }
  });

  it("returns valid summary with tier counts", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.listProfiles();

    const { tierCounts, avgOverall, total } = result.summary;

    // tierCounts should have all 4 keys
    expect(tierCounts).toHaveProperty("S");
    expect(tierCounts).toHaveProperty("A");
    expect(tierCounts).toHaveProperty("B");
    expect(tierCounts).toHaveProperty("C");

    // Total tier counts should add up to total employees
    const sumTiers = tierCounts.S + tierCounts.A + tierCounts.B + tierCounts.C;
    expect(sumTiers).toBe(total);

    // Average should be in valid range
    expect(avgOverall).toBeGreaterThan(0);
    expect(avgOverall).toBeLessThanOrEqual(100);
  });

  it("returns correct average overall score", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.listProfiles();

    const manualAvg =
      result.profiles.reduce((s, p) => s + p.overallScore, 0) /
      result.profiles.length;
    // round2 precision: allow small float difference
    expect(result.summary.avgOverall).toBeCloseTo(manualAvg, 1);
  });

  it("each profile has all required fields", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.listProfiles();

    for (const profile of result.profiles) {
      expect(profile.userId).toBeDefined();
      expect(profile.employeeCode).toBeTruthy();
      expect(profile.name).toBeTruthy();
      expect(profile.department).toBeTruthy();
      expect(profile.position).toBeTruthy();
      expect(profile.level).toBeTruthy();
      expect(profile.hireDate).toBeTruthy();
      expect(profile.dimensions).toHaveLength(4);
      expect(profile.overallScore).toBeGreaterThanOrEqual(0);
      expect(profile.overallScore).toBeLessThanOrEqual(100);
      expect(["S", "A", "B", "C"]).toContain(profile.tier);
      expect(profile.careerAdvice.length).toBeGreaterThanOrEqual(2);
      expect(profile.generatedAt).toBeTruthy();
    }
  });

  it("includes key real employee IDs", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.listProfiles();

    const ids = result.profiles.map((p) => p.userId);
    expect(ids).toContain(1);   // 倪亚东
    expect(ids).toContain(101); // 王汝月
    expect(ids).toContain(6);   // 洪香龙
  });

  it("each profile includes tsdckl and buContext", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.listProfiles();

    for (const profile of result.profiles) {
      // All 30 employees have TSDCKL scores
      expect(profile.tsdckl).not.toBeNull();
      // buContext should be set for known departments
      expect(profile.buContext).not.toBeNull();
    }
  });

  it("works with admin caller", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.listProfiles();
    expect(result.profiles.length).toBe(30);
  });
});

// ════════════════════════════════════════════════════════════════════
// getTeamRadar — Department-Level Aggregation
// ════════════════════════════════════════════════════════════════════

describe("employeeProfile.getTeamRadar", () => {
  // ── No department filter (all employees) ────────────────────────

  it("returns radar for all employees when no department specified", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTeamRadar({});

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.department).toBe("All");
    expect(result.employeeCount).toBe(30);
    expect(result.dataSource).toBe("real");
  });

  it("returns radar for all employees when department is undefined", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTeamRadar({
      department: undefined,
    });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.department).toBe("All");
    expect(result.employeeCount).toBe(30);
  });

  it("returns all 4 dimension averages in valid range", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTeamRadar({});

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    const dims = result.avgDimensions;
    expect(dims).toHaveProperty("Execution");
    expect(dims).toHaveProperty("Learning");
    expect(dims).toHaveProperty("Collaboration");
    expect(dims).toHaveProperty("Innovation");

    for (const key of [
      "Execution",
      "Learning",
      "Collaboration",
      "Innovation",
    ] as const) {
      expect(dims[key]).toBeGreaterThanOrEqual(0);
      expect(dims[key]).toBeLessThanOrEqual(100);
    }
  });

  // ── Department filtering ────────────────────────────────────────

  it("returns radar for 总裁办 department (1 employee: userId 1)", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTeamRadar({
      department: "总裁办",
    });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.department).toBe("总裁办");
    expect(result.employeeCount).toBe(1);
  });

  it("returns radar for 财务部 department (4 employees)", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTeamRadar({
      department: "财务部",
    });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.department).toBe("财务部");
    expect(result.employeeCount).toBe(4);
  });

  it("returns radar for 事业二部 department (4 employees)", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTeamRadar({
      department: "事业二部",
    });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.department).toBe("事业二部");
    expect(result.employeeCount).toBe(4);
  });

  it("总裁办 radar dimensions match userId 1 individual profile", async () => {
    const caller = createAdminCaller();

    const radarResult = await caller.employeeProfile.getTeamRadar({
      department: "总裁办",
    });
    const profileResult = await caller.employeeProfile.getProfile({
      userId: 1,
    });

    expect(radarResult.found).toBe(true);
    expect(profileResult.found).toBe(true);
    if (!radarResult.found || !profileResult.found)
      throw new Error("unreachable");

    // With only 1 employee, team avg should equal individual scores
    for (const dim of profileResult.profile.dimensions) {
      expect(radarResult.avgDimensions[dim.name]).toBeCloseTo(dim.score, 1);
    }
  });

  // ── Not found ───────────────────────────────────────────────────

  it("returns found: false for nonexistent department", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTeamRadar({
      department: "NonexistentDept",
    });

    expect(result.found).toBe(false);
    if (result.found) throw new Error("unreachable");
    expect(result.error).toContain("No employees");
  });

  it("treats empty-string department as 'All' (falsy in JS)", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTeamRadar({
      department: "",
    });

    // Empty string is falsy in JS, so the ternary filter skips (returns all employees).
    // However, `"" ?? "All"` returns "" since "" is not nullish.
    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");
    expect(result.department).toBe("");
    expect(result.employeeCount).toBe(30);
  });

  // ── Admin caller works too ──────────────────────────────────────

  it("works with admin caller", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTeamRadar({});
    expect(result.found).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════
// getFullProfile — Unified Profile with TSDCKL + BU Context
// ════════════════════════════════════════════════════════════════════

describe("employeeProfile.getFullProfile", () => {
  it("returns full profile with TSDCKL for assessed employee", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getFullProfile({ userId: 1 });
    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");
    expect(result.profile.userId).toBe(1);
    expect(result.tsdckl).not.toBeNull();
    expect(result.tsdckl!.T).toBe(80);
    expect(result.tsdcklPillars).toHaveLength(6);
    expect(result.buContext).toEqual({ buCode: "HQ", buName: "总部" });
    expect(result.dataSource).toBe("real");
  });

  it("returns found: false for unknown userId", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getFullProfile({ userId: 9999 });
    expect(result.found).toBe(false);
  });

  it("includes tsdcklAvg", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getFullProfile({ userId: 1 });
    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");
    // (80+100+80+100+80+100)/6 = 90
    expect(result.tsdcklAvg).toBeCloseTo(90, 0);
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.employeeProfile.getFullProfile({ userId: 1 })).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════
// Authentication Guards — Anonymous Rejection
// ════════════════════════════════════════════════════════════════════

describe("employeeProfile — authentication guards", () => {
  it("rejects anonymous caller for getProfile", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.employeeProfile.getProfile({ userId: 1 }),
    ).rejects.toThrow();
  });

  it("rejects anonymous caller for listProfiles", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.employeeProfile.listProfiles()).rejects.toThrow();
  });

  it("rejects anonymous caller for getTeamRadar", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.employeeProfile.getTeamRadar({})).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════
// Cross-Procedure Consistency
// ════════════════════════════════════════════════════════════════════

describe("employeeProfile — cross-procedure consistency", () => {
  it("getProfile and listProfiles return consistent data for each user", async () => {
    const caller = createAdminCaller();
    const listResult = await caller.employeeProfile.listProfiles();

    for (const listProfile of listResult.profiles) {
      const singleResult = await caller.employeeProfile.getProfile({
        userId: listProfile.userId,
      });
      expect(singleResult.found).toBe(true);
      if (!singleResult.found) continue;

      expect(singleResult.profile.employeeCode).toBe(
        listProfile.employeeCode,
      );
      expect(singleResult.profile.name).toBe(listProfile.name);
      expect(singleResult.profile.department).toBe(listProfile.department);
      expect(singleResult.profile.tier).toBe(listProfile.tier);
      // Overall score should match (both computed from same real data)
      expect(singleResult.profile.overallScore).toBeCloseTo(
        listProfile.overallScore,
        2,
      );
    }
  });

  it("team radar averages are consistent with listProfiles dimensions", async () => {
    const caller = createAdminCaller();

    const listResult = await caller.employeeProfile.listProfiles();
    const radarResult = await caller.employeeProfile.getTeamRadar({});

    expect(radarResult.found).toBe(true);
    if (!radarResult.found) throw new Error("unreachable");

    // Manually compute averages from list profiles
    const expectedAvg = {
      Execution: 0,
      Learning: 0,
      Collaboration: 0,
      Innovation: 0,
    } as Record<string, number>;

    for (const profile of listResult.profiles) {
      for (const dim of profile.dimensions) {
        expectedAvg[dim.name] += dim.score;
      }
    }
    const count = listResult.profiles.length;
    for (const key of Object.keys(expectedAvg)) {
      expectedAvg[key] /= count;
    }

    for (const dimName of [
      "Execution",
      "Learning",
      "Collaboration",
      "Innovation",
    ] as const) {
      expect(radarResult.avgDimensions[dimName]).toBeCloseTo(
        expectedAvg[dimName],
        1,
      );
    }
  });
});

// ════════════════════════════════════════════════════════════════════
// getTrainingPlan — Real TSDCKL Gap-Based Development Path
// ════════════════════════════════════════════════════════════════════

describe("employeeProfile.getTrainingPlan", () => {
  it("returns dev path for employee with gaps (userId 2 — 黄晓兰, 财务)", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTrainingPlan({ userId: 2 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.employeeName).toBe("黄晓兰");
    expect(result.position).toBe("会计");
    expect(result.jobFamily).toBe("财务");
    expect(result.dataSource).toBe("actual_analysis");
    expect(result.devPath.length).toBeGreaterThan(0);
    expect(result.totalGapScore).toBeGreaterThan(0);
  });

  it("returns devPath items with correct structure", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTrainingPlan({ userId: 2 });

    if (!result.found) throw new Error("unreachable");

    for (const item of result.devPath) {
      expect(item).toHaveProperty("domainCode");
      expect(item).toHaveProperty("domainName");
      expect(item).toHaveProperty("currentLevel");
      expect(item).toHaveProperty("targetLevel");
      expect(item).toHaveProperty("gap");
      expect(item).toHaveProperty("priority");
      expect(item).toHaveProperty("nextLevelDescription");
      expect(item).toHaveProperty("actionItems");
      expect(item).toHaveProperty("estimatedWeeks");
      expect(["critical", "high", "medium", "low"]).toContain(item.priority);
      expect(item.actionItems.length).toBeGreaterThan(0);
      expect(item.estimatedWeeks).toBeGreaterThan(0);
    }
  });

  it("devPath is sorted by priority (critical first)", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTrainingPlan({ userId: 2 });
    if (!result.found) throw new Error("unreachable");

    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    for (let i = 1; i < result.devPath.length; i++) {
      expect(order[result.devPath[i].priority]).toBeGreaterThanOrEqual(
        order[result.devPath[i - 1].priority],
      );
    }
  });

  it("returns fewer gaps for high-level employee (userId 1 — 倪亚东)", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTrainingPlan({ userId: 1 });

    if (!result.found) throw new Error("unreachable");

    // 倪亚东 has L4-L5 in all domains, targets are L4 for 事业部经理 → very few gaps
    expect(result.devPath.length).toBeLessThanOrEqual(2);
    expect(result.jobFamily).toBe("通用"); // 董事长 doesn't match any specific family except 通用
  });

  it("returns not found for unknown userId", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTrainingPlan({ userId: 9999 });

    expect(result.found).toBe(false);
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.employeeProfile.getTrainingPlan({ userId: 1 }),
    ).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════
// getWorkTasks — Demo Work Task Data
// ════════════════════════════════════════════════════════════════════

describe("employeeProfile.getWorkTasks", () => {
  it("returns 7 tasks for a known employee", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getWorkTasks({ userId: 80 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.employeeName).toBe("刘奥运");
    expect(result.dataSource).toBe("demo");
    expect(result.tasks).toHaveLength(7);
  });

  it("tasks have correct structure", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getWorkTasks({ userId: 80 });
    if (!result.found) throw new Error("unreachable");

    for (const task of result.tasks) {
      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("title");
      expect(task).toHaveProperty("description");
      expect(task).toHaveProperty("priority");
      expect(task).toHaveProperty("status");
      expect(task).toHaveProperty("dueDate");
      expect(task).toHaveProperty("category");
      expect(task).toHaveProperty("estimatedHours");
      expect(task).toHaveProperty("progress");
      expect(["high", "medium", "low"]).toContain(task.priority);
      expect(["completed", "in_progress", "todo", "overdue"]).toContain(task.status);
    }
  });

  it("summary counts match task statuses", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getWorkTasks({ userId: 80 });
    if (!result.found) throw new Error("unreachable");

    const { summary, tasks } = result;
    expect(summary.total).toBe(tasks.length);
    expect(summary.completed).toBe(tasks.filter((t: any) => t.status === "completed").length);
    expect(summary.inProgress).toBe(tasks.filter((t: any) => t.status === "in_progress").length);
    expect(summary.overdue).toBe(tasks.filter((t: any) => t.status === "overdue").length);
    expect(summary.todo).toBe(tasks.filter((t: any) => t.status === "todo").length);
  });

  it("returns different tasks for different departments", async () => {
    const caller = createAdminCaller();
    const itResult = await caller.employeeProfile.getWorkTasks({ userId: 80 }); // AI数智部
    const finResult = await caller.employeeProfile.getWorkTasks({ userId: 2 }); // 财务部

    if (!itResult.found || !finResult.found) throw new Error("unreachable");

    // Different task titles since different departments
    const itTitles = itResult.tasks.map((t: any) => t.title);
    const finTitles = finResult.tasks.map((t: any) => t.title);
    expect(itTitles).not.toEqual(finTitles);
  });

  it("returns not found for unknown userId", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getWorkTasks({ userId: 9999 });
    expect(result.found).toBe(false);
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.employeeProfile.getWorkTasks({ userId: 1 }),
    ).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════
// getWorkPlan — Demo Weekly Work Plan
// ════════════════════════════════════════════════════════════════════

describe("employeeProfile.getWorkPlan", () => {
  it("returns a 5-day weekly plan for a known employee", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getWorkPlan({ userId: 80 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.employeeName).toBe("刘奥运");
    expect(result.dataSource).toBe("demo");
    expect(result.dailyPlans).toHaveLength(5);
    expect(result.weekRationalityScore).toBeGreaterThan(0);
    expect(result.rationalityAnalysis).toBeTruthy();
    expect(result.weekLabel).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("daily plans have correct structure", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getWorkPlan({ userId: 80 });
    if (!result.found) throw new Error("unreachable");

    for (const day of result.dailyPlans) {
      expect(day).toHaveProperty("dayName");
      expect(day).toHaveProperty("date");
      expect(day).toHaveProperty("items");
      expect(day.items.length).toBeGreaterThanOrEqual(3);

      for (const item of day.items) {
        expect(item).toHaveProperty("time");
        expect(item).toHaveProperty("title");
        expect(item).toHaveProperty("type");
        expect(item).toHaveProperty("duration");
        expect(item).toHaveProperty("rationalityScore");
        expect(["meeting", "task", "review", "training"]).toContain(item.type);
        expect(item.rationalityScore).toBeGreaterThanOrEqual(50);
        expect(item.rationalityScore).toBeLessThanOrEqual(100);
      }
    }
  });

  it("weekOffset shifts the week correctly", async () => {
    const caller = createAdminCaller();
    const current = await caller.employeeProfile.getWorkPlan({ userId: 80, weekOffset: 0 });
    const next = await caller.employeeProfile.getWorkPlan({ userId: 80, weekOffset: 1 });

    if (!current.found || !next.found) throw new Error("unreachable");

    expect(current.weekStartDate).not.toBe(next.weekStartDate);
  });

  it("managers get more meetings", async () => {
    const caller = createAdminCaller();
    const mgrResult = await caller.employeeProfile.getWorkPlan({ userId: 4 }); // 戴晓燕 (高级销售经理)
    const empResult = await caller.employeeProfile.getWorkPlan({ userId: 101 }); // 王汝月 (会计助理)

    if (!mgrResult.found || !empResult.found) throw new Error("unreachable");

    const mgrMeetings = mgrResult.dailyPlans.flatMap((d: any) => d.items).filter((i: any) => i.type === "meeting").length;
    const empMeetings = empResult.dailyPlans.flatMap((d: any) => d.items).filter((i: any) => i.type === "meeting").length;

    expect(mgrMeetings).toBeGreaterThanOrEqual(empMeetings);
  });

  it("returns not found for unknown userId", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getWorkPlan({ userId: 9999 });
    expect(result.found).toBe(false);
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.employeeProfile.getWorkPlan({ userId: 1 }),
    ).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════
// getLifecycleProfile — Tenure, Salary, Performance History
// ════════════════════════════════════════════════════════════════════

describe("employeeProfile.getLifecycleProfile", () => {
  it("returns complete lifecycle profile for 倪亚东 (userId 1)", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getLifecycleProfile({ userId: 1 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.employee.name).toBe("倪亚东");
    expect(result.employee.department).toBe("总裁办");
    expect(result.employee.position).toBe("董事长");
  });

  it("includes tenure section with correct categories", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getLifecycleProfile({ userId: 1 });
    if (!result.found) throw new Error("unreachable");

    expect(result.tenure.hireDate).toBe("2008-03-15");
    expect(result.tenure.tenureYears).toBeGreaterThanOrEqual(17);
    expect(result.tenure.tenureCategory).toBe("元老");
    expect(result.tenure.tenureDisplay).toBeTruthy();
  });

  it("includes salary structure with social insurance", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getLifecycleProfile({ userId: 1 });
    if (!result.found) throw new Error("unreachable");

    const { salary } = result;
    expect(salary.baseSalary).toBe(35000);
    expect(salary.grade).toBe("M5");
    expect(salary.socialInsurance.pension).toBeGreaterThan(0);
    expect(salary.socialInsurance.medical).toBeGreaterThan(0);
    expect(salary.socialInsurance.housingFund).toBeGreaterThan(0);
    expect(salary.socialInsurance.total).toBeGreaterThan(0);
    expect(salary.totalFixedIncome).toBeGreaterThan(salary.baseSalary);
    expect(salary.estimatedNetMonthly).toBeGreaterThan(0);
    expect(salary.estimatedNetMonthly).toBeLessThan(salary.totalFixedIncome);
    expect(salary.dataSource).toBe("seeded");
  });

  it("includes 4-year salary growth history", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getLifecycleProfile({ userId: 1 });
    if (!result.found) throw new Error("unreachable");

    expect(result.salaryHistory).toHaveLength(4);
    expect(result.salaryDataSource).toBe("estimated");

    const years = result.salaryHistory.map((h: any) => h.year);
    expect(years).toEqual([2023, 2024, 2025, 2026]);

    // Salary should be increasing over years
    for (let i = 1; i < result.salaryHistory.length; i++) {
      expect(result.salaryHistory[i].baseSalary).toBeGreaterThanOrEqual(result.salaryHistory[i - 1].baseSalary);
    }
  });

  it("includes 9-quarter performance history with trend", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getLifecycleProfile({ userId: 1 });
    if (!result.found) throw new Error("unreachable");

    expect(result.performance.quarterly).toHaveLength(9);
    expect(result.performanceDataSource).toBe("derived_from_tsdckl");

    for (const q of result.performance.quarterly) {
      expect(q).toHaveProperty("period");
      expect(q).toHaveProperty("score");
      expect(q).toHaveProperty("grade");
      expect(q).toHaveProperty("rank");
      expect(q).toHaveProperty("highlights");
      expect(q.score).toBeGreaterThanOrEqual(30);
      expect(q.score).toBeLessThanOrEqual(100);
      expect(["S", "A", "B", "C", "D"]).toContain(q.grade);
    }

    const { summary } = result.performance;
    expect(summary.avgScore).toBeGreaterThan(0);
    expect(["improving", "stable", "declining"]).toContain(summary.trendDirection);
    expect(typeof summary.improvementRate).toBe("number");
  });

  it("includes career milestones sorted by date", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getLifecycleProfile({ userId: 1 });
    if (!result.found) throw new Error("unreachable");

    expect(result.milestones.length).toBeGreaterThanOrEqual(3);

    // First milestone should be hire
    expect(result.milestones[0].event).toBe("入职GRT");

    // Should be sorted chronologically
    for (let i = 1; i < result.milestones.length; i++) {
      expect(result.milestones[i].date >= result.milestones[i - 1].date).toBe(true);
    }

    // Each milestone has required fields
    for (const m of result.milestones) {
      expect(m).toHaveProperty("date");
      expect(m).toHaveProperty("event");
      expect(m).toHaveProperty("type");
      expect(m).toHaveProperty("description");
    }
  });

  it("newer employees get 新员工/成长期 tenure category", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getLifecycleProfile({ userId: 101 }); // 王汝月, hired 2025-08-15
    if (!result.found) throw new Error("unreachable");

    expect(["新员工", "成长期"]).toContain(result.tenure.tenureCategory);
    expect(result.tenure.tenureYears).toBeLessThanOrEqual(1);
  });

  it("returns not found for unknown userId", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getLifecycleProfile({ userId: 9999 });
    expect(result.found).toBe(false);
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.employeeProfile.getLifecycleProfile({ userId: 1 }),
    ).rejects.toThrow();
  });
});
