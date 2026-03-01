/**
 * Capability System Router — Unit Tests
 *
 * Tests all 7 procedures:
 *   - getDictionary (query): returns 6 TSDCKL pillars
 *   - getRoleCriteria (query): returns target scores for a specific role
 *   - getAllRoleCriteria (query): returns all 14 role criteria entries
 *   - getMyAssessment (query): returns individual employee assessment
 *   - getTeamAssessments (query): returns team data with RBAC filtering
 *   - getDepartments (query): returns unique sorted department list
 *   - aiCompensationAnalysis (mutation): AI-driven salary adjustment recommendations
 *   - aiImprovementTips (mutation): AI-generated improvement tips per pillar
 *
 * This router uses in-memory data (no DB), so no DB mocking is needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// Reset any random seeds between tests for determinism where possible
beforeEach(() => {
  vi.clearAllMocks();
});

describe("capabilitySystem router", () => {
  // ═══════════════════════════════════════════════════════
  // getDictionary
  // ═══════════════════════════════════════════════════════
  describe("getDictionary", () => {
    it("returns exactly 6 TSDCKL pillars", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getDictionary();
      expect(result).toHaveLength(6);
    });

    it("each pillar has the correct structure", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getDictionary();
      for (const pillar of result) {
        expect(pillar).toHaveProperty("code");
        expect(pillar).toHaveProperty("name");
        expect(pillar).toHaveProperty("nameEn");
        expect(pillar).toHaveProperty("description");
        expect(pillar).toHaveProperty("color");
        expect(pillar).toHaveProperty("icon");
        expect(pillar).toHaveProperty("maxScore", 100);
        expect(pillar).toHaveProperty("scoringRules");
        expect(Array.isArray(pillar.scoringRules)).toBe(true);
        expect(pillar.scoringRules.length).toBe(5);
      }
    });

    it("contains codes T, S, D, C, K, L in order", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getDictionary();
      const codes = result.map((p) => p.code);
      expect(codes).toEqual(["T", "S", "D", "C", "K", "L"]);
    });

    it("each pillar has a valid hex color", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getDictionary();
      for (const pillar of result) {
        expect(pillar.color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });

  // ═══════════════════════════════════════════════════════
  // getRoleCriteria
  // ═══════════════════════════════════════════════════════
  describe("getRoleCriteria", () => {
    it("returns criteria for a known role (bu_gm)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getRoleCriteria({
        role: "bu_gm",
      });
      expect(result).toHaveProperty("role", "bu_gm");
      expect(result).toHaveProperty("roleName", "BU总经理");
      expect(result).toHaveProperty("targets");
      expect(result.targets).toHaveProperty("T", 80);
      expect(result.targets).toHaveProperty("L", 95);
    });

    it("returns criteria for bu_mech role", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getRoleCriteria({
        role: "bu_mech",
      });
      expect(result.role).toBe("bu_mech");
      expect(result.roleName).toBe("机械工程师");
      expect(result.targets.T).toBe(88);
    });

    it("falls back to employee criteria for unknown role", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getRoleCriteria({
        role: "nonexistent_role",
      });
      expect(result).toHaveProperty("role", "employee");
      expect(result).toHaveProperty("roleName", "普通员工");
    });

    it("targets have all 6 pillar codes", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getRoleCriteria({
        role: "director",
      });
      const keys = Object.keys(result.targets);
      expect(keys).toContain("T");
      expect(keys).toContain("S");
      expect(keys).toContain("D");
      expect(keys).toContain("C");
      expect(keys).toContain("K");
      expect(keys).toContain("L");
    });

    it("returns criteria for all 14 known roles individually", async () => {
      const caller = createAuthenticatedCaller();
      const knownRoles = [
        "bu_gm", "director", "dept_manager", "bu_pm", "bu_sales",
        "bu_mech", "bu_elec", "cs_engineer", "team_lead",
        "hr_manager", "hr_specialist", "finance_manager", "employee",
        "procurement_eng",
      ];
      for (const role of knownRoles) {
        const result = await caller.capabilitySystem.getRoleCriteria({ role });
        expect(result.role).toBe(role);
      }
    });
  });

  // ═══════════════════════════════════════════════════════
  // getAllRoleCriteria
  // ═══════════════════════════════════════════════════════
  describe("getAllRoleCriteria", () => {
    it("returns all 14 role criteria", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getAllRoleCriteria();
      expect(result).toHaveLength(14);
    });

    it("each entry has role, roleName, and targets", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getAllRoleCriteria();
      for (const criteria of result) {
        expect(criteria).toHaveProperty("role");
        expect(criteria).toHaveProperty("roleName");
        expect(criteria).toHaveProperty("targets");
        expect(typeof criteria.role).toBe("string");
        expect(typeof criteria.roleName).toBe("string");
        expect(typeof criteria.targets).toBe("object");
      }
    });

    it("no duplicate roles", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getAllRoleCriteria();
      const roles = result.map((r) => r.role);
      const uniqueRoles = new Set(roles);
      expect(uniqueRoles.size).toBe(roles.length);
    });
  });

  // ═══════════════════════════════════════════════════════
  // getMyAssessment
  // ═══════════════════════════════════════════════════════
  describe("getMyAssessment", () => {
    it("returns Donnie (1017) by default when no employeeId provided", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getMyAssessment({});
      expect(result).toHaveProperty("employeeId", 1017);
      expect(result).toHaveProperty("name", "Donnie");
    });

    it("returns specific employee by employeeId", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 1001,
      });
      expect(result).toHaveProperty("employeeId", 1001);
      expect(result).toHaveProperty("name", "王磊");
      expect(result).toHaveProperty("nameEn", "Wang Lei");
    });

    it("returns first assessment when employeeId is not found", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 9999,
      });
      // Falls back to EMPLOYEE_ASSESSMENTS[0] which is employeeId 1001
      expect(result).toHaveProperty("employeeId", 1001);
    });

    it("assessment has correct structure", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 1004,
      });
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("employeeId", 1004);
      expect(result).toHaveProperty("name", "陈明");
      expect(result).toHaveProperty("nameEn", "Chen Ming");
      expect(result).toHaveProperty("department", "商用车BU");
      expect(result).toHaveProperty("role", "bu_pm");
      expect(result).toHaveProperty("roleName", "项目经理");
      expect(result).toHaveProperty("scores");
      expect(result).toHaveProperty("assessedAt", "2026-02-15");
      expect(result).toHaveProperty("assessedBy", "360评估系统");
      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("overallGrade");
    });

    it("scores contain all 6 pillar codes", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 1002,
      });
      const scoreKeys = Object.keys(result.scores);
      expect(scoreKeys).toContain("T");
      expect(scoreKeys).toContain("S");
      expect(scoreKeys).toContain("D");
      expect(scoreKeys).toContain("C");
      expect(scoreKeys).toContain("K");
      expect(scoreKeys).toContain("L");
    });

    it("overallScore is the average of 6 pillar scores", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 1002,
      });
      // Zhang Wei: T=91, S=62, D=85, C=58, K=80, L=42
      const expected = Math.round((91 + 62 + 85 + 58 + 80 + 42) / 6);
      expect(result.overallScore).toBe(expected);
    });

    it("overallGrade corresponds to overallScore correctly", async () => {
      const caller = createAuthenticatedCaller();

      // Test an A+ score range (>= 90)
      // Find an employee with overallScore >= 90 — none in default data
      // Test grade computation via known scores
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 1001,
      });
      // Wang Lei: T=82, S=88, D=85, C=91, K=83, L=92 → avg ~86.8 → 87 → A
      expect(result.overallScore).toBe(87);
      expect(result.overallGrade).toBe("A");
    });
  });

  // ═══════════════════════════════════════════════════════
  // getTeamAssessments
  // ═══════════════════════════════════════════════════════
  describe("getTeamAssessments", () => {
    it("returns accessDenied for low-level roles (employee, level < 3)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "employee",
      });
      expect(result).toHaveProperty("accessDenied", true);
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("returns accessDenied for team_lead (level 2)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "team_lead",
      });
      expect(result.accessDenied).toBe(true);
    });

    it("returns accessDenied for bu_sales (level 2)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "bu_sales",
      });
      expect(result.accessDenied).toBe(true);
    });

    it("returns all assessments for dept_manager (level 3)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "dept_manager",
      });
      expect(result.accessDenied).toBe(false);
      expect(result.items.length).toBe(18);
      expect(result.total).toBe(18);
    });

    it("returns all assessments for admin (level 10)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
      });
      expect(result.accessDenied).toBe(false);
      expect(result.total).toBe(18);
    });

    it("returns all assessments for hr_manager (level 4)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "hr_manager",
      });
      expect(result.accessDenied).toBe(false);
      expect(result.total).toBe(18);
    });

    it("filters by department", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "director",
        department: "海外BU",
      });
      expect(result.accessDenied).toBe(false);
      // Wang Lei, Zhang Wei, Li Na, Lin Feng = 4 people in 海外BU
      expect(result.items.length).toBe(4);
      for (const item of result.items) {
        expect(item.department).toBe("海外BU");
      }
    });

    it("filters by search (Chinese name)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "bu_gm",
        search: "王磊",
      });
      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe("王磊");
    });

    it("filters by search (English name, case-insensitive)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "dept_manager",
        search: "donnie",
      });
      expect(result.items.length).toBe(1);
      expect(result.items[0].nameEn).toBe("Donnie");
    });

    it("filters by search matching department name", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        search: "半导体",
      });
      // Zhou Yong + Wu Jing in 半导体BU
      expect(result.items.length).toBe(2);
    });

    it("filters by search matching roleName", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        search: "机械工程师",
      });
      // Zhang Wei, Liu Yang, Zhou Yong = 3 mechanical engineers
      expect(result.items.length).toBe(3);
    });

    it("combines department and search filters", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        department: "海外BU",
        search: "销售",
      });
      // Lin Feng is 销售工程师 in 海外BU
      expect(result.items.length).toBe(1);
      expect(result.items[0].nameEn).toBe("Lin Feng");
    });

    it("returns empty when search matches nothing", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        search: "no_match_xyz",
      });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("defaults to employee role when no input provided", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments();
      // employee level = 1, which is < 3 → accessDenied
      expect(result.accessDenied).toBe(true);
    });

    it("defaults to employee role when userRole is undefined", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({});
      expect(result.accessDenied).toBe(true);
    });

    it("treats unknown userRole as level 1 (access denied)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "unknown_role",
      });
      expect(result.accessDenied).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════
  // getDepartments
  // ═══════════════════════════════════════════════════════
  describe("getDepartments", () => {
    it("returns a sorted list of unique departments", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getDepartments();
      expect(Array.isArray(result)).toBe(true);
      // Departments in the data: 海外BU, 商用车BU, 乘用车BU, 半导体BU, 工业通用BU, 人力资源部, 财务部, 总经办
      expect(result.length).toBe(8);
    });

    it("list is sorted alphabetically", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getDepartments();
      const sorted = [...result].sort();
      expect(result).toEqual(sorted);
    });

    it("has no duplicates", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getDepartments();
      const unique = new Set(result);
      expect(unique.size).toBe(result.length);
    });
  });

  // ═══════════════════════════════════════════════════════
  // aiCompensationAnalysis
  // ═══════════════════════════════════════════════════════
  describe("aiCompensationAnalysis", () => {
    it("throws for employee role (level < 3)", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.capabilitySystem.aiCompensationAnalysis({
          userRole: "employee",
        })
      ).rejects.toThrow(
        "Only managers and above can access AI Compensation Analysis"
      );
    });

    it("throws for team_lead role (level 2)", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.capabilitySystem.aiCompensationAnalysis({
          userRole: "team_lead",
        })
      ).rejects.toThrow();
    });

    it("throws for bu_sales role (level 2)", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.capabilitySystem.aiCompensationAnalysis({
          userRole: "bu_sales",
        })
      ).rejects.toThrow();
    });

    it("throws when no userRole provided (defaults to employee)", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.capabilitySystem.aiCompensationAnalysis({})
      ).rejects.toThrow();
    });

    it("throws for unknown userRole (defaults to level 1)", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.capabilitySystem.aiCompensationAnalysis({
          userRole: "intern_xyz",
        })
      ).rejects.toThrow();
    });

    it("returns analysis for dept_manager (level 3)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "dept_manager",
      });
      expect(result).toHaveProperty("generatedAt");
      expect(result).toHaveProperty("aiModel");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("analyses");
    });

    it("returns analysis for admin (level 10)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "admin",
      });
      expect(result.analyses).toHaveLength(18);
    });

    it("summary has correct totalEmployees count", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "director",
      });
      expect(result.summary.totalEmployees).toBe(18);
    });

    it("summary exceeds + meets + below = totalEmployees", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "hr_manager",
      });
      const { exceeds, meets, below, totalEmployees } = result.summary;
      expect(exceeds + meets + below).toBe(totalEmployees);
    });

    it("each analysis has the correct fields", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "bu_gm",
      });
      for (const analysis of result.analyses) {
        expect(analysis).toHaveProperty("employeeId");
        expect(analysis).toHaveProperty("name");
        expect(analysis).toHaveProperty("department");
        expect(analysis).toHaveProperty("role");
        expect(analysis).toHaveProperty("overallScore");
        expect(analysis).toHaveProperty("overallGrade");
        expect(analysis).toHaveProperty("avgGap");
        expect(analysis).toHaveProperty("salaryAdjustment");
        expect(analysis).toHaveProperty("adjustmentPercent");
        expect(analysis).toHaveProperty("topGaps");
        expect(analysis.topGaps.length).toBeLessThanOrEqual(2);
      }
    });

    it("topGaps contain pillar name (not just code)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "admin",
      });
      // At least one analysis should have topGaps with Chinese pillar names
      const allPillarNames = result.analyses.flatMap((a) =>
        a.topGaps.map((g) => g.pillar)
      );
      // These should be Chinese names, not single-letter codes
      const chineseNamePattern = /[\u4e00-\u9fa5]/;
      const hasChinese = allPillarNames.some((name) =>
        chineseNamePattern.test(name)
      );
      expect(hasChinese).toBe(true);
    });

    it("generatedAt is a valid ISO date string", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "admin",
      });
      expect(() => new Date(result.generatedAt)).not.toThrow();
      expect(new Date(result.generatedAt).toISOString()).toBe(
        result.generatedAt
      );
    });

    it("summary.avgTeamScore is reasonable (between 0 and 100)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "admin",
      });
      expect(result.summary.avgTeamScore).toBeGreaterThan(0);
      expect(result.summary.avgTeamScore).toBeLessThanOrEqual(100);
    });

    it("summary.recommendation includes team score", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "admin",
      });
      expect(result.summary.recommendation).toContain(
        String(result.summary.avgTeamScore)
      );
    });
  });

  // ═══════════════════════════════════════════════════════
  // aiImprovementTips
  // ═══════════════════════════════════════════════════════
  describe("aiImprovementTips", () => {
    it("returns tips for a valid employee", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1001,
        role: "bu_gm",
      });
      expect(result).toHaveProperty("employeeId", 1001);
      expect(result).toHaveProperty("name", "王磊");
      expect(result).toHaveProperty("generatedAt");
      expect(result).toHaveProperty("tips");
      expect(result.tips).toHaveLength(6);
    });

    it("throws for non-existent employee", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.capabilitySystem.aiImprovementTips({
          employeeId: 9999,
          role: "employee",
        })
      ).rejects.toThrow("Employee not found");
    });

    it("each tip has all required fields", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1002,
        role: "bu_mech",
      });
      for (const tip of result.tips) {
        expect(tip).toHaveProperty("code");
        expect(tip).toHaveProperty("name");
        expect(tip).toHaveProperty("actual");
        expect(tip).toHaveProperty("target");
        expect(tip).toHaveProperty("gap");
        expect(tip).toHaveProperty("priority");
        expect(tip).toHaveProperty("tip");
        expect(tip).toHaveProperty("action");
        expect(["high", "medium", "low"]).toContain(tip.priority);
      }
    });

    it("tips are sorted by gap descending (highest gap first)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1005,
        role: "bu_sales",
      });
      for (let i = 1; i < result.tips.length; i++) {
        expect(result.tips[i - 1].gap).toBeGreaterThanOrEqual(
          result.tips[i].gap
        );
      }
    });

    it("gap = target - actual for each pillar", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1004,
        role: "bu_pm",
      });
      for (const tip of result.tips) {
        expect(tip.gap).toBe(tip.target - tip.actual);
      }
    });

    it("high priority when gap > 15", async () => {
      const caller = createAuthenticatedCaller();
      // Zhou Yong (1008) is bu_mech with L=35, target L=45 → gap=10 (medium)
      // But S=58, target S=65 → gap=7 (medium)
      // Try employee 1005 (Zhao Min, bu_sales): D=52, target D=55 → gap=3 (low)
      // Actually need an employee with a large gap. Let's use 1015 (Yang Jie, hr_specialist)
      // T=32, target T=35 → gap=3, but if we use role employee, target T=60 → gap=28 (high!)
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1015,
        role: "employee",
      });
      const highPriorityTips = result.tips.filter(
        (t) => t.priority === "high"
      );
      // Yang Jie: T=32(target 60→gap 28), D=38(target 55→gap 17) → 2 high
      expect(highPriorityTips.length).toBeGreaterThan(0);
      for (const tip of highPriorityTips) {
        expect(tip.gap).toBeGreaterThan(15);
      }
    });

    it("medium priority when gap is 6-15", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1004,
        role: "bu_pm",
      });
      const mediumTips = result.tips.filter((t) => t.priority === "medium");
      for (const tip of mediumTips) {
        expect(tip.gap).toBeGreaterThan(5);
        expect(tip.gap).toBeLessThanOrEqual(15);
      }
    });

    it("low priority for gap <= 5 or negative gap", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1001,
        role: "bu_gm",
      });
      const lowTips = result.tips.filter((t) => t.priority === "low");
      for (const tip of lowTips) {
        expect(tip.gap).toBeLessThanOrEqual(5);
      }
    });

    it("falls back to employee criteria when role is unknown", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1001,
        role: "nonexistent_role",
      });
      // Should use employee targets: T=60, S=65, D=55, C=60, K=60, L=35
      // Wang Lei: T=82 → gap=-22, exceeds target
      const tTip = result.tips.find((t) => t.code === "T");
      expect(tTip).toBeDefined();
      expect(tTip!.target).toBe(60); // employee target for T
    });

    it("tip text mentions pillar name", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1002,
        role: "bu_mech",
      });
      for (const tip of result.tips) {
        expect(tip.tip).toContain(tip.name);
      }
    });

    it("generatedAt is a valid ISO date string", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1001,
        role: "bu_gm",
      });
      expect(() => new Date(result.generatedAt)).not.toThrow();
      expect(new Date(result.generatedAt).toISOString()).toBe(
        result.generatedAt
      );
    });
  });

  // ═══════════════════════════════════════════════════════
  // Authentication guards
  // ═══════════════════════════════════════════════════════
  describe("authentication", () => {
    it("rejects anonymous for getDictionary", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.capabilitySystem.getDictionary()
      ).rejects.toThrow();
    });

    it("rejects anonymous for getRoleCriteria", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.capabilitySystem.getRoleCriteria({ role: "employee" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for getAllRoleCriteria", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.capabilitySystem.getAllRoleCriteria()
      ).rejects.toThrow();
    });

    it("rejects anonymous for getMyAssessment", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.capabilitySystem.getMyAssessment({})
      ).rejects.toThrow();
    });

    it("rejects anonymous for getTeamAssessments", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.capabilitySystem.getTeamAssessments({})
      ).rejects.toThrow();
    });

    it("rejects anonymous for getDepartments", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.capabilitySystem.getDepartments()
      ).rejects.toThrow();
    });

    it("rejects anonymous for aiCompensationAnalysis", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.capabilitySystem.aiCompensationAnalysis({
          userRole: "admin",
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous for aiImprovementTips", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.capabilitySystem.aiImprovementTips({
          employeeId: 1001,
          role: "bu_gm",
        })
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════
  // Edge cases
  // ═══════════════════════════════════════════════════════
  describe("edge cases", () => {
    it("getMyAssessment with employeeId = 0 falls back to default (Donnie)", async () => {
      const caller = createAuthenticatedCaller();
      // 0 is falsy so `input.employeeId || 1017` → 1017
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 0,
      });
      expect(result.employeeId).toBe(1017);
    });

    it("getTeamAssessments with empty string department returns all", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        department: "",
      });
      // Empty string is falsy, so the department filter is skipped
      expect(result.total).toBe(18);
    });

    it("getTeamAssessments with empty string search returns all", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        search: "",
      });
      // Empty string is falsy, so the search filter is skipped
      expect(result.total).toBe(18);
    });

    it("aiCompensationAnalysis returns numeric avgGap", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "admin",
      });
      for (const analysis of result.analyses) {
        expect(typeof analysis.avgGap).toBe("number");
        expect(Number.isFinite(analysis.avgGap)).toBe(true);
      }
    });

    it("aiImprovementTips action text is non-empty for all tips", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1010,
        role: "bu_pm",
      });
      for (const tip of result.tips) {
        expect(tip.action.length).toBeGreaterThan(0);
        expect(tip.tip.length).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════
  // computeGrade validation
  // ═══════════════════════════════════════════════════════
  describe("grade computation (via getMyAssessment)", () => {
    it("grades are from valid set", async () => {
      const caller = createAuthenticatedCaller();
      const validGrades = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "D"];

      // Check all 18 employees
      for (let id = 1001; id <= 1018; id++) {
        const result = await caller.capabilitySystem.getMyAssessment({
          employeeId: id,
        });
        expect(validGrades).toContain(result.overallGrade);
      }
    });
  });
});
