/**
 * Capability System Router — Unit Tests
 *
 * Tests all 11 procedures:
 *   - getDictionary (query): returns 6 TSDCKL pillars
 *   - getRoleCriteria (query): returns target scores for a specific role
 *   - getAllRoleCriteria (query): returns all 15 role criteria entries
 *   - getMyAssessment (query): returns individual employee assessment
 *   - getTeamAssessments (query): returns team data with RBAC filtering
 *   - getDepartments (query): returns unique sorted department list
 *   - aiCompensationAnalysis (mutation): AI-driven salary adjustment recommendations
 *   - aiImprovementTips (mutation): AI-generated improvement tips per pillar
 *   - getEmployeeProfile (query): returns full profile with gap analysis and training plan
 *   - getTrainingPlan (query): returns detailed training plan with courses
 *   - getTeamTrainingOverview (query): returns team-wide training needs aggregation
 *
 * This router uses in-memory data (no DB), so no DB mocking is needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
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
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getDictionary();
      expect(result).toHaveLength(6);
    });

    it("each pillar has the correct structure", async () => {
      const caller = createAdminCaller();
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
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getDictionary();
      const codes = result.map((p) => p.code);
      expect(codes).toEqual(["T", "S", "D", "C", "K", "L"]);
    });

    it("each pillar has a valid hex color", async () => {
      const caller = createAdminCaller();
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
      const caller = createAdminCaller();
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
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getRoleCriteria({
        role: "bu_mech",
      });
      expect(result.role).toBe("bu_mech");
      expect(result.roleName).toBe("机械工程师");
      expect(result.targets.T).toBe(88);
    });

    it("returns criteria for it_engineer role", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getRoleCriteria({
        role: "it_engineer",
      });
      expect(result.role).toBe("it_engineer");
      expect(result.roleName).toBe("IT工程师");
      expect(result.targets.T).toBe(85);
      expect(result.targets.S).toBe(65);
      expect(result.targets.D).toBe(75);
      expect(result.targets.C).toBe(65);
      expect(result.targets.K).toBe(70);
      expect(result.targets.L).toBe(40);
    });

    it("falls back to employee criteria for unknown role", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getRoleCriteria({
        role: "nonexistent_role",
      });
      expect(result).toHaveProperty("role", "employee");
      expect(result).toHaveProperty("roleName", "普通员工");
    });

    it("targets have all 6 pillar codes", async () => {
      const caller = createAdminCaller();
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

    it("returns criteria for all 15 known roles individually", async () => {
      const caller = createAdminCaller();
      const knownRoles = [
        "bu_gm", "director", "dept_manager", "bu_pm", "bu_sales",
        "bu_mech", "bu_elec", "cs_engineer", "team_lead",
        "hr_manager", "hr_specialist", "finance_manager", "employee",
        "procurement_eng", "it_engineer",
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
    it("returns all 15 role criteria", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getAllRoleCriteria();
      expect(result).toHaveLength(15);
    });

    it("each entry has role, roleName, and targets", async () => {
      const caller = createAdminCaller();
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
      const caller = createAdminCaller();
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
    it("returns 刘奥运 (80) by default when no employeeId provided", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getMyAssessment({});
      expect(result).toHaveProperty("employeeId", 80);
      expect(result).toHaveProperty("name", "刘奥运");
    });

    it("returns specific employee by employeeId", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 1,
      });
      expect(result).toHaveProperty("employeeId", 1);
      expect(result).toHaveProperty("name", "倪亚东");
      expect(result).toHaveProperty("nameEn", "Ni Yadong");
    });

    it("returns first assessment when employeeId is not found", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 9999,
      });
      // Falls back to EMPLOYEE_ASSESSMENTS[0] which is employeeId 1
      expect(result).toHaveProperty("employeeId", 1);
    });

    it("assessment has correct structure for 朱宇浩", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 62,
      });
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("employeeId", 62);
      expect(result).toHaveProperty("name", "朱宇浩");
      expect(result).toHaveProperty("nameEn", "Zhu Yuhao");
      expect(result).toHaveProperty("department", "事业二部");
      expect(result).toHaveProperty("role", "bu_pm");
      expect(result).toHaveProperty("roleName", "生产工程师兼项目及IT工程师");
      expect(result).toHaveProperty("scores");
      expect(result).toHaveProperty("assessedAt", "2026-02-15");
      expect(result).toHaveProperty("assessedBy", "360评估系统");
      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("overallGrade");
    });

    it("scores contain all 6 pillar codes", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 6,
      });
      const scoreKeys = Object.keys(result.scores);
      expect(scoreKeys).toContain("T");
      expect(scoreKeys).toContain("S");
      expect(scoreKeys).toContain("D");
      expect(scoreKeys).toContain("C");
      expect(scoreKeys).toContain("K");
      expect(scoreKeys).toContain("L");
    });

    it("overallScore is the average of 6 pillar scores for 洪香龙", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 6,
      });
      // 洪香龙: T=92, S=68, D=90, C=65, K=82, L=72
      const expected = Math.round((92 + 68 + 90 + 65 + 82 + 72) / 6);
      expect(result.overallScore).toBe(expected); // 78
    });

    it("overallGrade corresponds to overallScore correctly for 倪亚东", async () => {
      const caller = createAdminCaller();
      // 倪亚东: T=85, S=92, D=80, C=95, K=88, L=96 → avg = 536/6 = 89.33 → round to 89 → A
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 1,
      });
      expect(result.overallScore).toBe(89);
      expect(result.overallGrade).toBe("A");
    });

    it("胡杨 has role it_engineer and roleName IT工程师", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 49,
      });
      expect(result.name).toBe("胡杨");
      expect(result.role).toBe("it_engineer");
      expect(result.roleName).toBe("IT工程师");
      // T=88, S=65, D=72, C=68, K=70, L=42 → avg = 405/6 = 67.5 → 68 → B-
      expect(result.overallScore).toBe(68);
      expect(result.overallGrade).toBe("B-");
    });

    it("戴晓燕 has role bu_sales and roleName 高级销售经理", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 4,
      });
      expect(result.name).toBe("戴晓燕");
      expect(result.role).toBe("bu_sales");
      expect(result.roleName).toBe("高级销售经理");
      // T=65, S=82, D=48, C=90, K=72, L=78 → avg = 435/6 = 72.5 → 73 → B
      expect(result.overallScore).toBe(73);
      expect(result.overallGrade).toBe("B");
    });

    it("沈迎凤 has roleName 商务经理 and role dept_manager", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 55,
      });
      expect(result.name).toBe("沈迎凤");
      expect(result.role).toBe("dept_manager");
      expect(result.roleName).toBe("商务经理");
      // T=48, S=80, D=45, C=82, K=68, L=65 → avg = 388/6 = 64.67 → 65 → B-
      expect(result.overallScore).toBe(65);
      expect(result.overallGrade).toBe("B-");
    });

    it("洪香龙 has correct scores and grade B+", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 6,
      });
      expect(result.name).toBe("洪香龙");
      expect(result.role).toBe("dept_manager");
      expect(result.roleName).toBe("机械设计经理");
      expect(result.scores).toEqual({ T: 92, S: 68, D: 90, C: 65, K: 82, L: 72 });
      // avg = 469/6 = 78.17 → 78 → B+
      expect(result.overallScore).toBe(78);
      expect(result.overallGrade).toBe("B+");
    });

    it("刘奥运 has correct scores and grade B+", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 80,
      });
      expect(result.name).toBe("刘奥运");
      expect(result.role).toBe("director");
      expect(result.roleName).toBe("董事长助理");
      expect(result.scores).toEqual({ T: 82, S: 78, D: 72, C: 85, K: 80, L: 75 });
      // avg = 472/6 = 78.67 → 79 → B+
      expect(result.overallScore).toBe(79);
      expect(result.overallGrade).toBe("B+");
    });
  });

  // ═══════════════════════════════════════════════════════
  // getTeamAssessments
  // ═══════════════════════════════════════════════════════
  describe("getTeamAssessments", () => {
    it("returns accessDenied for low-level roles (employee, level < 3)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "employee",
      });
      expect(result).toHaveProperty("accessDenied", true);
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("returns accessDenied for team_lead (level 2)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "team_lead",
      });
      expect(result.accessDenied).toBe(true);
    });

    it("returns accessDenied for bu_sales (level 2)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "bu_sales",
      });
      expect(result.accessDenied).toBe(true);
    });

    it("returns all assessments for dept_manager (level 3)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "dept_manager",
      });
      expect(result.accessDenied).toBe(false);
      expect(result.items.length).toBe(30);
      expect(result.total).toBe(30);
    });

    it("returns all assessments for admin (level 10)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
      });
      expect(result.accessDenied).toBe(false);
      expect(result.total).toBe(30);
    });

    it("returns all assessments for hr_manager (level 4)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "hr_manager",
      });
      expect(result.accessDenied).toBe(false);
      expect(result.total).toBe(30);
    });

    it("filters by department (事业一部 = 4 people)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "director",
        department: "事业一部",
      });
      expect(result.accessDenied).toBe(false);
      // 戴晓燕, 金晓锋, 李大鹏, 刘健康 = 4 people in 事业一部
      expect(result.items.length).toBe(4);
      for (const item of result.items) {
        expect(item.department).toBe("事业一部");
      }
    });

    it("filters by department (事业四部 = 2 people)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        department: "事业四部",
      });
      expect(result.items.length).toBe(2);
      const names = result.items.map((i: any) => i.name);
      expect(names).toContain("孙国祥");
      expect(names).toContain("张腾飞");
    });

    it("filters by department (AI数智部 = 5 people)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        department: "AI数智部",
      });
      expect(result.items.length).toBe(5);
      const names = result.items.map((i: any) => i.name);
      expect(names).toContain("刘奥运");
      expect(names).toContain("胡杨");

      expect(names).toContain("刘坤");
      expect(names).toContain("朱文韬");
    });

    it("filters by search (Chinese name)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "bu_gm",
        search: "倪亚东",
      });
      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe("倪亚东");
    });

    it("filters by search (English name, case-insensitive)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "dept_manager",
        search: "Ni Yadong",
      });
      expect(result.items.length).toBe(1);
      expect(result.items[0].nameEn).toBe("Ni Yadong");
    });

    it("filters by search matching department name", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        search: "事业四部",
      });
      // 孙国祥 + 张腾飞 in 事业四部
      expect(result.items.length).toBe(2);
    });

    it("filters by search matching roleName (电气工程师 = 3 matches)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        search: "电气工程师",
      });
      // 李大鹏, 钱佳奇, 孙国祥 = 3 electrical engineers (胡杨 is now IT工程师)
      expect(result.items.length).toBe(3);
      const names = result.items.map((i: any) => i.name);
      expect(names).toContain("李大鹏");
      expect(names).toContain("钱佳奇");
      expect(names).toContain("孙国祥");
    });

    it("combines department and search filters (销售 in 事业一部 = 2 matches)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        department: "事业一部",
        search: "销售",
      });
      // 戴晓燕(高级销售经理) + 刘健康(销售经理) = 2 matches in 事业一部
      expect(result.items.length).toBe(2);
      const names = result.items.map((i: any) => i.name);
      expect(names).toContain("戴晓燕");
      expect(names).toContain("刘健康");
    });

    it("returns empty when search matches nothing", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        search: "no_match_xyz",
      });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("defaults to employee role when no input provided", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments();
      // employee level = 1, which is < 3 → accessDenied
      expect(result.accessDenied).toBe(true);
    });

    it("defaults to employee role when userRole is undefined", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({});
      expect(result.accessDenied).toBe(true);
    });

    it("treats unknown userRole as level 1 (access denied)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "unknown_role",
      });
      expect(result.accessDenied).toBe(true);
    });

    it("search for IT工程师 finds 胡杨 and 朱宇浩 (roleName contains IT工程师)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        search: "IT工程师",
      });
      // 胡杨 roleName="IT工程师", 朱宇浩 roleName="生产工程师兼项目及IT工程师"
      expect(result.items.length).toBe(2);
      const names = result.items.map((i: any) => i.name);
      expect(names).toContain("胡杨");
      expect(names).toContain("朱宇浩");
    });
  });

  // ═══════════════════════════════════════════════════════
  // getDepartments
  // ═══════════════════════════════════════════════════════
  describe("getDepartments", () => {
    it("returns a sorted list of unique departments", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getDepartments();
      expect(Array.isArray(result)).toBe(true);
      // Departments: 总裁办, AI数智部, 财务部, 人事行政部, 事业一部, 事业二部, 事业三部, 事业四部, 事业十部
      expect(result.length).toBe(9);
    });

    it("list is sorted alphabetically", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getDepartments();
      const sorted = [...result].sort();
      expect(result).toEqual(sorted);
    });

    it("has no duplicates", async () => {
      const caller = createAdminCaller();
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
      const caller = createAdminCaller();
      await expect(
        caller.capabilitySystem.aiCompensationAnalysis({
          userRole: "employee",
        })
      ).rejects.toThrow(
        "Only managers and above can access AI Compensation Analysis"
      );
    });

    it("throws for team_lead role (level 2)", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.capabilitySystem.aiCompensationAnalysis({
          userRole: "team_lead",
        })
      ).rejects.toThrow();
    });

    it("throws for bu_sales role (level 2)", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.capabilitySystem.aiCompensationAnalysis({
          userRole: "bu_sales",
        })
      ).rejects.toThrow();
    });

    it("throws when no userRole provided (defaults to employee)", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.capabilitySystem.aiCompensationAnalysis({})
      ).rejects.toThrow();
    });

    it("throws for unknown userRole (defaults to level 1)", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.capabilitySystem.aiCompensationAnalysis({
          userRole: "intern_xyz",
        })
      ).rejects.toThrow();
    });

    it("returns analysis for dept_manager (level 3)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "dept_manager",
      });
      expect(result).toHaveProperty("generatedAt");
      expect(result).toHaveProperty("aiModel");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("analyses");
    });

    it("returns analysis for admin (level 10)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "admin",
      });
      expect(result.analyses).toHaveLength(30);
    });

    it("summary has correct totalEmployees count", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "director",
      });
      expect(result.summary.totalEmployees).toBe(30);
    });

    it("summary exceeds + meets + below = totalEmployees", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "hr_manager",
      });
      const { exceeds, meets, below, totalEmployees } = result.summary;
      expect(exceeds + meets + below).toBe(totalEmployees);
    });

    it("each analysis has the correct fields", async () => {
      const caller = createAdminCaller();
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
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "admin",
      });
      const allPillarNames = result.analyses.flatMap((a) =>
        a.topGaps.map((g) => g.pillar)
      );
      const chineseNamePattern = /[\u4e00-\u9fa5]/;
      const hasChinese = allPillarNames.some((name) =>
        chineseNamePattern.test(name)
      );
      expect(hasChinese).toBe(true);
    });

    it("generatedAt is a valid ISO date string", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "admin",
      });
      expect(() => new Date(result.generatedAt)).not.toThrow();
      expect(new Date(result.generatedAt).toISOString()).toBe(
        result.generatedAt
      );
    });

    it("summary.avgTeamScore is reasonable (between 0 and 100)", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "admin",
      });
      expect(result.summary.avgTeamScore).toBeGreaterThan(0);
      expect(result.summary.avgTeamScore).toBeLessThanOrEqual(100);
    });

    it("summary.recommendation includes team score", async () => {
      const caller = createAdminCaller();
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
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1,
        role: "bu_gm",
      });
      expect(result).toHaveProperty("employeeId", 1);
      expect(result).toHaveProperty("name", "倪亚东");
      expect(result).toHaveProperty("generatedAt");
      expect(result).toHaveProperty("tips");
      expect(result.tips).toHaveLength(6);
    });

    it("throws for non-existent employee", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.capabilitySystem.aiImprovementTips({
          employeeId: 9999,
          role: "employee",
        })
      ).rejects.toThrow("Employee not found");
    });

    it("each tip has all required fields", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 44,
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
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 103,
        role: "bu_sales",
      });
      for (let i = 1; i < result.tips.length; i++) {
        expect(result.tips[i - 1].gap).toBeGreaterThanOrEqual(
          result.tips[i].gap
        );
      }
    });

    it("gap = target - actual for each pillar", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 62,
        role: "bu_pm",
      });
      for (const tip of result.tips) {
        expect(tip.gap).toBe(tip.target - tip.actual);
      }
    });

    it("high priority when gap > 15", async () => {
      const caller = createAdminCaller();
      // 王汝月 (101) with role "employee":
      // T=32(target 60→gap 28), S=52(target 65→gap 13), D=25(target 55→gap 30),
      // C=55(target 60→gap 5), K=68(target 60→gap -8), L=18(target 35→gap 17)
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 101,
        role: "employee",
      });
      const highPriorityTips = result.tips.filter(
        (t) => t.priority === "high"
      );
      // T=28, D=30, L=17 → 3 high priority (gap > 15)
      expect(highPriorityTips.length).toBeGreaterThan(0);
      for (const tip of highPriorityTips) {
        expect(tip.gap).toBeGreaterThan(15);
      }
    });

    it("medium priority when gap is 6-15", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 62,
        role: "bu_pm",
      });
      const mediumTips = result.tips.filter((t) => t.priority === "medium");
      for (const tip of mediumTips) {
        expect(tip.gap).toBeGreaterThan(5);
        expect(tip.gap).toBeLessThanOrEqual(15);
      }
    });

    it("low priority for gap <= 5 or negative gap", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1,
        role: "bu_gm",
      });
      const lowTips = result.tips.filter((t) => t.priority === "low");
      for (const tip of lowTips) {
        expect(tip.gap).toBeLessThanOrEqual(5);
      }
    });

    it("falls back to employee criteria when role is unknown", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1,
        role: "nonexistent_role",
      });
      // Should use employee targets: T=60, S=65, D=55, C=60, K=60, L=35
      // 倪亚东: T=85 → gap=-25, exceeds target
      const tTip = result.tips.find((t) => t.code === "T");
      expect(tTip).toBeDefined();
      expect(tTip!.target).toBe(60); // employee target for T
    });

    it("tip text mentions pillar name", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 44,
        role: "bu_mech",
      });
      for (const tip of result.tips) {
        expect(tip.tip).toContain(tip.name);
      }
    });

    it("generatedAt is a valid ISO date string", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 1,
        role: "bu_gm",
      });
      expect(() => new Date(result.generatedAt)).not.toThrow();
      expect(new Date(result.generatedAt).toISOString()).toBe(
        result.generatedAt
      );
    });

    it("王汝月 specific gaps with employee targets", async () => {
      const caller = createAdminCaller();
      // 王汝月 (101): T=32, S=52, D=25, C=55, K=68, L=18
      // Employee targets: T=60, S=65, D=55, C=60, K=60, L=35
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 101,
        role: "employee",
      });
      const tTip = result.tips.find((t) => t.code === "T");
      expect(tTip!.actual).toBe(32);
      expect(tTip!.target).toBe(60);
      expect(tTip!.gap).toBe(28);

      const kTip = result.tips.find((t) => t.code === "K");
      expect(kTip!.actual).toBe(68);
      expect(kTip!.target).toBe(60);
      expect(kTip!.gap).toBe(-8);
      expect(kTip!.priority).toBe("low"); // negative gap = low
    });

    it("朱宇浩 improvement tips with bu_pm targets reflect real scores", async () => {
      const caller = createAdminCaller();
      // 朱宇浩 (62): T=85, S=62, D=70, C=65, K=68, L=40
      // bu_pm targets: T=70, S=78, D=80, C=82, K=75, L=72
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 62,
        role: "bu_pm",
      });
      const tTip = result.tips.find((t) => t.code === "T");
      expect(tTip!.actual).toBe(85);
      expect(tTip!.target).toBe(70);
      expect(tTip!.gap).toBe(-15); // exceeds

      const lTip = result.tips.find((t) => t.code === "L");
      expect(lTip!.actual).toBe(40);
      expect(lTip!.target).toBe(72);
      expect(lTip!.gap).toBe(32); // significant gap
    });
  });

  // ═══════════════════════════════════════════════════════
  // getEmployeeProfile
  // ═══════════════════════════════════════════════════════
  describe("getEmployeeProfile", () => {
    it("returns full profile for 倪亚东", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getEmployeeProfile({
        employeeId: 1,
      });
      expect(result.name).toBe("倪亚东");
      expect(result.profile).not.toBeNull();
      expect(result.profile!.grtId).toBe("GRT001");
      expect(result.profile!.grade).toBe("CEO");
      expect(result.profile!.comprehensiveSalary).toBe(35000);
      expect(result.gapAnalysis).toHaveLength(6);
      expect(Array.isArray(result.trainingPlan)).toBe(true);
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.improvementAreas)).toBe(true);
    });

    it("throws for non-existent employee", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.capabilitySystem.getEmployeeProfile({ employeeId: 9999 })
      ).rejects.toThrow("Employee not found");
    });

    it("gap analysis has correct structure", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getEmployeeProfile({
        employeeId: 80,
      });
      for (const gap of result.gapAnalysis) {
        expect(gap).toHaveProperty("code");
        expect(gap).toHaveProperty("name");
        expect(gap).toHaveProperty("actual");
        expect(gap).toHaveProperty("target");
        expect(gap).toHaveProperty("gap");
        expect(gap).toHaveProperty("level");
        expect(["critical", "significant", "minor", "exceeds"]).toContain(gap.level);
      }
    });

    it("training plan items have correct structure", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getEmployeeProfile({
        employeeId: 101,
      });
      // 王汝月 should have training needs
      expect(result.trainingPlan.length).toBeGreaterThan(0);
      for (const plan of result.trainingPlan) {
        expect(plan).toHaveProperty("code");
        expect(plan).toHaveProperty("name");
        expect(plan).toHaveProperty("priority");
        expect(plan).toHaveProperty("courses");
        expect(plan).toHaveProperty("timeline");
        expect(plan).toHaveProperty("expectedImprovement");
        expect(["critical", "important", "recommended", "optional"]).toContain(plan.priority);
        expect(Array.isArray(plan.courses)).toBe(true);
        expect(plan.courses.length).toBeGreaterThan(0);
      }
    });

    it("profile data matches for 胡杨", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getEmployeeProfile({
        employeeId: 49,
      });
      expect(result.profile!.grtId).toBe("GRT049");
      expect(result.profile!.grade).toBe("8");
      expect(result.profile!.performanceJan2026).toBe(81);
      expect(result.profile!.avg2024).toBe(78);
      expect(result.profile!.comprehensiveSalary).toBe(11430);
    });

    it("includes assessment fields in response", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getEmployeeProfile({
        employeeId: 45,
      });
      expect(result.employeeId).toBe(45);
      expect(result.name).toBe("杨勇");
      expect(result.department).toBe("事业三部");
      expect(result.scores).toBeDefined();
      expect(result.overallScore).toBeDefined();
      expect(result.overallGrade).toBeDefined();
    });

    it("strengths lists pillars where score exceeds target", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getEmployeeProfile({
        employeeId: 1,
      });
      // 倪亚东 (bu_gm targets: T=80, S=90, D=85, C=90, K=85, L=95)
      // Scores: T=85, S=92, D=80, C=95, K=88, L=96
      // Exceeds: T(85>80), S(92>90), C(95>90), K(88>85), L(96>95)
      expect(result.strengths.length).toBeGreaterThan(0);
    });

    it("improvementAreas lists pillars where gap > 5", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getEmployeeProfile({
        employeeId: 101,
      });
      // 王汝月 has significant gaps in T, S, D, L
      expect(result.improvementAreas.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════
  // getTrainingPlan
  // ═══════════════════════════════════════════════════════
  describe("getTrainingPlan", () => {
    it("returns training plan for valid employee", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTrainingPlan({
        employeeId: 101,
      });
      expect(result.employeeId).toBe(101);
      expect(result.name).toBe("王汝月");
      expect(result.trainingPlan.length).toBeGreaterThan(0);
      expect(result.totalHoursEstimate).toBeGreaterThan(0);
      expect(result).toHaveProperty("generatedAt");
    });

    it("throws for non-existent employee", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.capabilitySystem.getTrainingPlan({ employeeId: 9999 })
      ).rejects.toThrow("Employee not found");
    });

    it("includes grtId and grade from profile", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTrainingPlan({
        employeeId: 5,
      });
      expect(result.grtId).toBe("GRT005");
      expect(result.grade).toBe("9B");
    });

    it("training plan items have correct structure", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTrainingPlan({
        employeeId: 44,
      });
      for (const plan of result.trainingPlan) {
        expect(plan).toHaveProperty("code");
        expect(plan).toHaveProperty("name");
        expect(plan).toHaveProperty("priority");
        expect(plan).toHaveProperty("courses");
        expect(plan).toHaveProperty("timeline");
        expect(plan).toHaveProperty("expectedImprovement");
        expect(["critical", "important", "recommended", "optional"]).toContain(plan.priority);
        expect(Array.isArray(plan.courses)).toBe(true);
        expect(plan.courses.length).toBeGreaterThan(0);
      }
    });

    it("critical plans have more courses than optional ones", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTrainingPlan({
        employeeId: 101,
      });
      const critical = result.trainingPlan.filter((p: any) => p.priority === "critical");
      const optional = result.trainingPlan.filter((p: any) => p.priority === "optional");
      if (critical.length > 0 && optional.length > 0) {
        expect(critical[0].courses.length).toBeGreaterThanOrEqual(optional[0].courses.length);
      }
    });

    it("gap analysis is included", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTrainingPlan({
        employeeId: 62,
      });
      expect(result.gapAnalysis).toHaveLength(6);
      for (const gap of result.gapAnalysis) {
        expect(gap).toHaveProperty("code");
        expect(gap).toHaveProperty("actual");
        expect(gap).toHaveProperty("target");
        expect(gap).toHaveProperty("gap");
      }
    });
  });

  // ═══════════════════════════════════════════════════════
  // getTeamTrainingOverview
  // ═══════════════════════════════════════════════════════
  describe("getTeamTrainingOverview", () => {
    it("returns overview with correct structure", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamTrainingOverview();
      expect(result).toHaveProperty("totalEmployees", 30);
      expect(result).toHaveProperty("criticalGaps");
      expect(result).toHaveProperty("topTrainingNeeds");
      expect(result).toHaveProperty("departmentSummary");
      expect(Array.isArray(result.criticalGaps)).toBe(true);
      expect(Array.isArray(result.topTrainingNeeds)).toBe(true);
      expect(Array.isArray(result.departmentSummary)).toBe(true);
    });

    it("criticalGaps have correct fields", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamTrainingOverview();
      for (const gap of result.criticalGaps) {
        expect(gap).toHaveProperty("code");
        expect(gap).toHaveProperty("name");
        expect(gap).toHaveProperty("count");
        expect(gap).toHaveProperty("avgGap");
        expect(typeof gap.count).toBe("number");
        expect(typeof gap.avgGap).toBe("number");
      }
    });

    it("topTrainingNeeds are sorted by targetEmployees descending", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamTrainingOverview();
      for (let i = 1; i < result.topTrainingNeeds.length; i++) {
        expect(result.topTrainingNeeds[i - 1].targetEmployees).toBeGreaterThanOrEqual(
          result.topTrainingNeeds[i].targetEmployees
        );
      }
    });

    it("departmentSummary covers all 9 departments", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamTrainingOverview();
      expect(result.departmentSummary.length).toBe(9);
    });

    it("departmentSummary has correct fields", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamTrainingOverview();
      for (const dept of result.departmentSummary) {
        expect(dept).toHaveProperty("dept");
        expect(dept).toHaveProperty("avgScore");
        expect(dept).toHaveProperty("weakestPillar");
        expect(dept).toHaveProperty("count");
        expect(typeof dept.avgScore).toBe("number");
        expect(dept.avgScore).toBeGreaterThan(0);
        expect(dept.avgScore).toBeLessThanOrEqual(100);
      }
    });

    it("topTrainingNeeds limited to 15 entries max", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamTrainingOverview();
      expect(result.topTrainingNeeds.length).toBeLessThanOrEqual(15);
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
          employeeId: 1,
          role: "bu_gm",
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous for getEmployeeProfile", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.capabilitySystem.getEmployeeProfile({ employeeId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for getTrainingPlan", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.capabilitySystem.getTrainingPlan({ employeeId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for getTeamTrainingOverview", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.capabilitySystem.getTeamTrainingOverview()
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════
  // Edge cases
  // ═══════════════════════════════════════════════════════
  describe("edge cases", () => {
    it("getMyAssessment with employeeId = 0 falls back to default (刘奥运)", async () => {
      const caller = createAdminCaller();
      // 0 is falsy so `input.employeeId || 80` → 80
      const result = await caller.capabilitySystem.getMyAssessment({
        employeeId: 0,
      });
      expect(result.employeeId).toBe(80);
    });

    it("getTeamAssessments with empty string department returns all", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        department: "",
      });
      // Empty string is falsy, so the department filter is skipped
      expect(result.total).toBe(30);
    });

    it("getTeamAssessments with empty string search returns all", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.getTeamAssessments({
        userRole: "admin",
        search: "",
      });
      // Empty string is falsy, so the search filter is skipped
      expect(result.total).toBe(30);
    });

    it("aiCompensationAnalysis returns numeric avgGap", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiCompensationAnalysis({
        userRole: "admin",
      });
      for (const analysis of result.analyses) {
        expect(typeof analysis.avgGap).toBe("number");
        expect(Number.isFinite(analysis.avgGap)).toBe(true);
      }
    });

    it("aiImprovementTips action text is non-empty for all tips", async () => {
      const caller = createAdminCaller();
      const result = await caller.capabilitySystem.aiImprovementTips({
        employeeId: 45,
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
      const caller = createAdminCaller();
      const validGrades = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "D"];

      // Check all 30 employees
      const allIds = [1, 80, 2, 54, 101, 66, 67, 53, 100, 49, 62, 96, 83, 103, 4, 5, 22, 63, 6, 44, 97, 3, 7, 55, 19, 18, 24, 8, 9, 45];
      for (const id of allIds) {
        const result = await caller.capabilitySystem.getMyAssessment({
          employeeId: id,
        });
        expect(validGrades).toContain(result.overallGrade);
      }
    });
  });
});
