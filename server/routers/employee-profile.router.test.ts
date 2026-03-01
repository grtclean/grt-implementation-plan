/**
 * Employee Digital Profile — tRPC Router Unit Tests
 *
 * Tests all 3 tRPC procedures:
 *   1. employeeProfile.getProfile   — single-user 360 profile
 *   2. employeeProfile.listProfiles — all employees leaderboard
 *   3. employeeProfile.getTeamRadar — department-level aggregation
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

// No DB mock needed — this router uses in-memory MOCK_EMPLOYEES data,
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

  it("returns a complete 360 profile for userId 1001 (star performer)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1001 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.dataSource).toBe("mock");
    expect(result.profile.userId).toBe(1001);
    expect(result.profile.employeeCode).toBe("GRT-E001");
    expect(result.profile.name).toBe("张伟 (Zhang Wei)");
    expect(result.profile.department).toBe("Engineering");
    expect(result.profile.position).toBe("Senior Mechanical Engineer");
    expect(result.profile.level).toBe("P6");
    expect(result.profile.hireDate).toBe("2020-03-15");
  });

  it("returns 4 dimensions in the profile", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1001 });

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
    const caller = createAuthenticatedCaller();

    for (const userId of [1001, 1002, 1003]) {
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

  it("returns Tier S or A for star performer userId 1001", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1001 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    // userId 1001 has high KPI (avg ~91.67), 3 certs (35+50+25=110→100),
    // high meetings (avg 90, high attendance), 10 AI tasks (avg ~89.5 + vol 20 + synergy 5)
    expect(["S", "A"]).toContain(result.profile.tier);
    expect(result.profile.overallScore).toBeGreaterThanOrEqual(75);
  });

  it("returns lower tier for new hire userId 1002", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1002 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    // userId 1002 is a new hire with lower scores across the board
    expect(result.profile.userId).toBe(1002);
    expect(result.profile.employeeCode).toBe("GRT-E042");
    expect(result.profile.name).toBe("李明 (Li Ming)");
    // Not a star performer
    expect(result.profile.overallScore).toBeLessThan(90);
  });

  it("returns profile for AI power user userId 1003", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1003 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.profile.userId).toBe(1003);
    expect(result.profile.employeeCode).toBe("GRT-E018");
    expect(result.profile.name).toBe("王芳 (Wang Fang)");
    expect(result.profile.department).toBe("R&D");

    // Wang Fang has 12 high-quality AI tasks + high meeting scores → Innovation should be high
    const innovation = result.profile.dimensions.find(
      (d) => d.name === "Innovation",
    );
    expect(innovation).toBeDefined();
    expect(innovation!.score).toBeGreaterThan(90);
  });

  it("includes career advice with at least STRENGTH and DEVELOPMENT entries", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1001 });

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
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1001 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.profile.generatedAt).toBeTruthy();
    expect(new Date(result.profile.generatedAt).getTime()).not.toBeNaN();
  });

  // ── Not Found ───────────────────────────────────────────────────

  it("returns found: false for unknown userId", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 9999 });

    expect(result.found).toBe(false);
    if (result.found) throw new Error("unreachable");
    expect(result.error).toContain("9999");
    expect(result.error).toContain("not found");
  });

  it("returns found: false for userId 0", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 0 });

    expect(result.found).toBe(false);
  });

  it("returns found: false for negative userId", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getProfile({ userId: -1 });

    expect(result.found).toBe(false);
  });

  // ── Input validation ────────────────────────────────────────────

  it("rejects call without userId (missing input)", async () => {
    const caller = createAuthenticatedCaller();
    // @ts-expect-error - intentionally testing missing input
    await expect(caller.employeeProfile.getProfile({})).rejects.toThrow();
  });

  it("rejects non-numeric userId", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      // @ts-expect-error - intentionally testing invalid input type
      caller.employeeProfile.getProfile({ userId: "abc" }),
    ).rejects.toThrow();
  });

  // ── Admin caller works too ──────────────────────────────────────

  it("works with admin caller", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getProfile({ userId: 1001 });
    expect(result.found).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════
// listProfiles — All Employees Leaderboard
// ════════════════════════════════════════════════════════════════════

describe("employeeProfile.listProfiles", () => {
  it("returns all 3 mock employee profiles", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.listProfiles();

    expect(result.profiles).toHaveLength(3);
    expect(result.summary.total).toBe(3);
    expect(result.dataSource).toBe("mock");
    expect(result.generatedAt).toBeTruthy();
  });

  it("returns profiles sorted by overallScore descending", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.listProfiles();

    for (let i = 1; i < result.profiles.length; i++) {
      expect(result.profiles[i - 1].overallScore).toBeGreaterThanOrEqual(
        result.profiles[i].overallScore,
      );
    }
  });

  it("returns valid summary with tier counts", async () => {
    const caller = createAuthenticatedCaller();
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
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.listProfiles();

    const manualAvg =
      result.profiles.reduce((s, p) => s + p.overallScore, 0) /
      result.profiles.length;
    // round2 precision: allow small float difference
    expect(result.summary.avgOverall).toBeCloseTo(manualAvg, 1);
  });

  it("each profile has all required fields", async () => {
    const caller = createAuthenticatedCaller();
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

  it("includes all 3 known employee IDs", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.listProfiles();

    const ids = result.profiles.map((p) => p.userId);
    expect(ids).toContain(1001);
    expect(ids).toContain(1002);
    expect(ids).toContain(1003);
  });

  it("works with admin caller", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.listProfiles();
    expect(result.profiles.length).toBe(3);
  });
});

// ════════════════════════════════════════════════════════════════════
// getTeamRadar — Department-Level Aggregation
// ════════════════════════════════════════════════════════════════════

describe("employeeProfile.getTeamRadar", () => {
  // ── No department filter (all employees) ────────────────────────

  it("returns radar for all employees when no department specified", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getTeamRadar({});

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.department).toBe("All");
    expect(result.employeeCount).toBe(3);
    expect(result.dataSource).toBe("mock");
  });

  it("returns radar for all employees when department is undefined", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getTeamRadar({
      department: undefined,
    });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.department).toBe("All");
    expect(result.employeeCount).toBe(3);
  });

  it("returns all 4 dimension averages in valid range", async () => {
    const caller = createAuthenticatedCaller();
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

  it("returns radar for Engineering department (1 employee: userId 1001)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getTeamRadar({
      department: "Engineering",
    });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.department).toBe("Engineering");
    expect(result.employeeCount).toBe(1);
  });

  it("returns radar for Quality department (1 employee: userId 1002)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getTeamRadar({
      department: "Quality",
    });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.department).toBe("Quality");
    expect(result.employeeCount).toBe(1);
  });

  it("returns radar for R&D department (1 employee: userId 1003)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getTeamRadar({
      department: "R&D",
    });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.department).toBe("R&D");
    expect(result.employeeCount).toBe(1);
  });

  it("Engineering radar dimensions match userId 1001 individual profile", async () => {
    const caller = createAuthenticatedCaller();

    const radarResult = await caller.employeeProfile.getTeamRadar({
      department: "Engineering",
    });
    const profileResult = await caller.employeeProfile.getProfile({
      userId: 1001,
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
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getTeamRadar({
      department: "NonexistentDept",
    });

    expect(result.found).toBe(false);
    if (result.found) throw new Error("unreachable");
    expect(result.error).toContain("No employees");
  });

  it("treats empty-string department as 'All' (falsy in JS)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeProfile.getTeamRadar({
      department: "",
    });

    // Empty string is falsy in JS, so the ternary filter skips (returns all employees).
    // However, `"" ?? "All"` returns "" since "" is not nullish.
    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");
    expect(result.department).toBe("");
    expect(result.employeeCount).toBe(3);
  });

  // ── Admin caller works too ──────────────────────────────────────

  it("works with admin caller", async () => {
    const caller = createAdminCaller();
    const result = await caller.employeeProfile.getTeamRadar({});
    expect(result.found).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════
// Authentication Guards — Anonymous Rejection
// ════════════════════════════════════════════════════════════════════

describe("employeeProfile — authentication guards", () => {
  it("rejects anonymous caller for getProfile", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.employeeProfile.getProfile({ userId: 1001 }),
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
    const caller = createAuthenticatedCaller();
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
      // Overall score should match (both computed from same mock data)
      expect(singleResult.profile.overallScore).toBeCloseTo(
        listProfile.overallScore,
        2,
      );
    }
  });

  it("team radar averages are consistent with listProfiles dimensions", async () => {
    const caller = createAuthenticatedCaller();

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
