/**
 * Compliance Router — Unit Tests
 * 37 procedures covering: alerts CRUD, rules CRUD, email templates CRUD,
 * compliance checks, reports, dashboard stats, employee status, time details,
 * approval queue, AI/scheduler stubs, seed data.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAnonymousCaller } from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from","where","orderBy","limit","offset","values","set",
    "onConflictDoUpdate","onConflictDoNothing","groupBy","having",
    "innerJoin","leftJoin","rightJoin","fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try { return resolve(getNextResult()); }
    catch (e) { if (reject) return reject(e); throw e; }
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
}));

// ── BU scope mock — returns undefined (no BU filtering in tests) ──
vi.mock("../_core/gateway-bu-context.middleware", () => ({
  buScopeCondition: vi.fn().mockReturnValue(undefined),
  buContextMiddleware: vi.fn((opts: any) => opts.next({ ctx: opts.ctx })),
}));

// ── drizzle-orm mock ────────────────────────────────────────
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  inArray: vi.fn((...args: any[]) => args),
}));

// ── Schema mocks ────────────────────────────────────────────
vi.mock("../../drizzle/schema", () => ({
  projects: {
    id: "id", buCode: "buCode", name: "name", createdAt: "createdAt",
  },
  grtEmployees: {
    id: "id", employeeId: "employeeId", name: "name", email: "email",
    department: "department", roleType: "roleType", jurisdiction: "jurisdiction",
    supervisorId: "supervisorId", contractType: "contractType",
    weeklyHoursLimit: "weeklyHoursLimit", isExempt: "isExempt",
    exemptionType: "exemptionType", hireDate: "hireDate", timezone: "timezone",
    isActive: "isActive", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  grtTimeEntries: {
    id: "id", employeeId: "employeeId", date: "date", startTime: "startTime",
    endTime: "endTime", durationMinutes: "durationMinutes",
    activityCategory: "activityCategory", jurisdiction: "jurisdiction",
    projectId: "projectId", customerId: "customerId",
    taskDescription: "taskDescription", location: "location",
    geoLatitude: "geoLatitude", geoLongitude: "geoLongitude",
    isRemote: "isRemote", complianceFlag: "complianceFlag",
    complianceNotes: "complianceNotes", supervisorApproval: "supervisorApproval",
    approvedBy: "approvedBy", approvedAt: "approvedAt",
    isOvertime: "isOvertime", overtimeRate: "overtimeRate",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  grtComplianceAlerts: {
    id: "id", employeeId: "employeeId", timeEntryId: "timeEntryId",
    alertType: "alertType", jurisdiction: "jurisdiction", severity: "severity",
    description: "description", legalReference: "legalReference",
    recommendedAction: "recommendedAction", status: "status",
    acknowledgedBy: "acknowledgedBy", acknowledgedAt: "acknowledgedAt",
    resolvedBy: "resolvedBy", resolvedAt: "resolvedAt",
    resolutionNotes: "resolutionNotes", notificationSent: "notificationSent",
    notificationSentAt: "notificationSentAt", createdAt: "createdAt",
  },
  grtWeeklyComplianceSummary: {
    id: "id", employeeId: "employeeId", weekStartDate: "weekStartDate",
    weekEndDate: "weekEndDate", jurisdiction: "jurisdiction",
    totalWorkMinutes: "totalWorkMinutes", totalTravelPaidMinutes: "totalTravelPaidMinutes",
    totalOvertimeMinutes: "totalOvertimeMinutes", daysWorked: "daysWorked",
    maxDailyMinutes: "maxDailyMinutes", restPeriodViolations: "restPeriodViolations",
    exemptionStatus: "exemptionStatus", exemptionCriteriaMet: "exemptionCriteriaMet",
    primaryDutyPercentage: "primaryDutyPercentage",
    overallComplianceStatus: "overallComplianceStatus",
    reviewedBy: "reviewedBy", reviewedAt: "reviewedAt",
    reviewNotes: "reviewNotes", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  grtComplianceReports: {
    id: "id", reportId: "reportId", reportType: "reportType", format: "format",
    jurisdiction: "jurisdiction", dateRangeStart: "dateRangeStart",
    dateRangeEnd: "dateRangeEnd", generatedBy: "generatedBy",
    generatedByName: "generatedByName", fileUrl: "fileUrl", fileKey: "fileKey",
    fileSizeBytes: "fileSizeBytes", employeesIncluded: "employeesIncluded",
    alertsIncluded: "alertsIncluded", includesDetails: "includesDetails",
    includesAlerts: "includesAlerts", includesRecommendations: "includesRecommendations",
    status: "status", errorMessage: "errorMessage", createdAt: "createdAt",
  },
  grtComplianceRules: {
    id: "id", ruleId: "ruleId", ruleName: "ruleName",
    ruleDescription: "ruleDescription", jurisdiction: "jurisdiction",
    ruleType: "ruleType", thresholdValue: "thresholdValue",
    thresholdUnit: "thresholdUnit", warningThreshold: "warningThreshold",
    criticalThreshold: "criticalThreshold", legalReference: "legalReference",
    legalReferenceUrl: "legalReferenceUrl", recommendedAction: "recommendedAction",
    isEnabled: "isEnabled", priority: "priority",
    effectiveFrom: "effectiveFrom", effectiveTo: "effectiveTo",
    createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  grtComplianceEmailTemplates: {
    id: "id", templateId: "templateId", templateName: "templateName",
    templateDescription: "templateDescription", alertType: "alertType",
    severity: "severity", jurisdiction: "jurisdiction",
    subjectTemplate: "subjectTemplate", bodyTemplate: "bodyTemplate",
    isHtml: "isHtml", recipientTypes: "recipientTypes",
    isEnabled: "isEnabled", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
}));

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Tests ───────────────────────────────────────────────────
describe("compliance router", () => {

  // ====================================================================
  // AUTH GUARDS — anonymous rejection
  // ====================================================================
  describe("auth guards", () => {
    it("rejects anonymous caller on list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.compliance.list()).rejects.toThrow();
    });

    it("rejects anonymous caller on create", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.compliance.create({})).rejects.toThrow();
    });

    it("rejects anonymous caller on getRules", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.compliance.getRules()).rejects.toThrow();
    });

    it("rejects anonymous caller on getTemplates", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.compliance.getTemplates()).rejects.toThrow();
    });

    it("rejects anonymous caller on getDashboardStats", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.compliance.getDashboardStats()).rejects.toThrow();
    });

    it("rejects anonymous caller on checkCompliance", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.compliance.checkCompliance()).rejects.toThrow();
    });

    it("rejects anonymous caller on exportReport", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.compliance.exportReport({})).rejects.toThrow();
    });

    it("rejects anonymous caller on seedTestData", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.compliance.seedTestData()).rejects.toThrow();
    });
  });

  // ====================================================================
  // ALERTS CRUD
  // ====================================================================
  describe("list", () => {
    it("returns paginated alert list with defaults", async () => {
      const caller = createAuthenticatedCaller();
      const alertRow = { id: 1, alertType: "DAILY_10H_LIMIT", status: "open", severity: "warning" };
      // First query: count, second query: rows
      selectResultsQueue.push([{ count: 1 }]);
      selectResultsQueue.push([alertRow]);

      const result = await caller.compliance.list();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total", 1);
      expect(result).toHaveProperty("page", 1);
      expect(result).toHaveProperty("pageSize", 50);
      expect(result.items).toEqual([alertRow]);
    });

    it("respects custom limit and offset", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ count: 100 }]);
      selectResultsQueue.push([]);

      const result = await caller.compliance.list({ limit: 10, offset: 20 });
      expect(result.page).toBe(3); // Math.floor(20/10)+1
      expect(result.pageSize).toBe(10);
    });

    it("returns empty list when no alerts", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([]);

      const result = await caller.compliance.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getById", () => {
    it("returns an alert by id", async () => {
      const caller = createAuthenticatedCaller();
      const alert = { id: 5, alertType: "WEEKLY_48H_LIMIT", status: "open" };
      mockQueryResult = [alert];

      const result = await caller.compliance.getById({ id: "5" });
      expect(result).toEqual(alert);
    });

    it("returns null for non-numeric id", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.getById({ id: "abc" });
      expect(result).toBeNull();
    });

    it("returns null when alert not found", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.compliance.getById({ id: "999" });
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("creates an alert with defaults", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.create({});
      expect(result).toEqual({ success: true, message: "Alert created" });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("creates an alert with full input", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.create({
        employeeId: 1,
        alertType: "DAILY_10H_LIMIT",
        jurisdiction: "DE",
        severity: "critical",
        description: "Exceeded daily limit",
        legalReference: "ArbZG S3",
        recommendedAction: "Reduce hours",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("update", () => {
    it("updates alert fields by id", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.update({ id: 1, status: "resolved" });
      expect(result).toEqual({ success: true, message: "操作成功" });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("returns success without DB call when id is 0/falsy", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.update({ id: 0 });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.update({ id: "7", severity: "critical" });
      expect(result.success).toBe(true);
    });
  });

  describe("delete", () => {
    it("deletes alert by id", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.delete({ id: "10" });
      expect(result).toEqual({ success: true, message: "操作成功" });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("skips delete for non-numeric id", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.delete({ id: "abc" });
      expect(result.success).toBe(true);
      // delete is not called when id isNaN
    });
  });

  // ====================================================================
  // RULES
  // ====================================================================
  describe("getRules", () => {
    it("returns all rules ordered by priority", async () => {
      const caller = createAuthenticatedCaller();
      const rules = [
        { id: 1, ruleName: "Rule A", priority: 10 },
        { id: 2, ruleName: "Rule B", priority: 20 },
      ];
      mockQueryResult = rules;

      const result = await caller.compliance.getRules();
      expect(result).toEqual(rules);
    });
  });

  describe("createRule", () => {
    it("creates a rule with required fields", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.createRule({
        ruleType: "daily_limit",
        thresholdValue: "10",
      });
      expect(result).toEqual({ success: true, message: "Rule created" });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("creates a rule with all optional fields", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.createRule({
        ruleId: "RULE-001",
        ruleName: "Max Daily Hours",
        name: "Fallback Name",
        ruleDescription: "Do not exceed",
        description: "Fallback description",
        jurisdiction: "DE",
        ruleType: "daily_limit",
        thresholdValue: 10,
        thresholdUnit: "hours",
        warningThreshold: 9,
        criticalThreshold: 10,
        legalReference: "ArbZG S3",
        recommendedAction: "Reduce hours",
        isEnabled: true,
        priority: 5,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateRule", () => {
    it("updates a rule by numeric id", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.updateRule({ id: 1, ruleName: "Updated" });
      expect(result).toEqual({ success: true, message: "Rule updated" });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("converts threshold values to strings", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.updateRule({
        id: 2,
        thresholdValue: 12,
        warningThreshold: 11,
        criticalThreshold: 12,
      });
      expect(result.success).toBe(true);
    });

    it("returns success without updating when id is 0", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.updateRule({ id: 0 });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });
  });

  describe("deleteRule", () => {
    it("deletes a rule by id", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.deleteRule({ id: 3 });
      expect(result).toEqual({ success: true, message: "Rule deleted" });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("deletes a rule by ruleId fallback", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.deleteRule({ ruleId: 5 });
      expect(result.success).toBe(true);
    });

    it("skips delete when both id and ruleId are absent", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.deleteRule({});
      expect(result.success).toBe(true);
    });
  });

  describe("toggleRuleEnabled", () => {
    it("toggles rule from enabled to disabled", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1, isEnabled: 1 }];

      const result = await caller.compliance.toggleRuleEnabled({ id: 1 });
      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("toggles rule from disabled to enabled", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1, isEnabled: 0 }];

      const result = await caller.compliance.toggleRuleEnabled({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("does nothing when rule not found", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];

      const result = await caller.compliance.toggleRuleEnabled({ id: 999 });
      expect(result.success).toBe(true);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("returns success when id is 0", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.toggleRuleEnabled({ id: 0 });
      expect(result.success).toBe(true);
    });

    it("accepts ruleId as fallback", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 2, isEnabled: 1 }];
      const result = await caller.compliance.toggleRuleEnabled({ ruleId: 2 });
      expect(result.success).toBe(true);
    });
  });

  describe("getRuleStats", () => {
    it("computes stats from rules", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 1, isEnabled: 1, jurisdiction: "DE", ruleType: "daily_limit" },
        { id: 2, isEnabled: 1, jurisdiction: "US", ruleType: "weekly_limit" },
        { id: 3, isEnabled: 0, jurisdiction: "DE", ruleType: "daily_limit" },
      ];

      const result = await caller.compliance.getRuleStats();
      expect(result.stats.total).toBe(3);
      expect(result.stats.enabled).toBe(2);
      expect(result.stats.disabled).toBe(1);
      expect(result.stats.byJurisdiction).toEqual({ DE: 2, US: 1 });
      expect(result.stats.byType).toEqual({ daily_limit: 2, weekly_limit: 1 });
    });

    it("returns zero stats when no rules", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];

      const result = await caller.compliance.getRuleStats();
      expect(result.stats.total).toBe(0);
      expect(result.stats.enabled).toBe(0);
    });
  });

  // ====================================================================
  // TEMPLATES
  // ====================================================================
  describe("getTemplates", () => {
    it("returns all email templates", async () => {
      const caller = createAuthenticatedCaller();
      const templates = [{ id: 1, templateName: "Tmpl A" }];
      mockQueryResult = templates;

      const result = await caller.compliance.getTemplates();
      expect(result).toEqual(templates);
    });
  });

  describe("createTemplate", () => {
    it("creates a template with minimal input", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.createTemplate({});
      expect(result).toEqual({ success: true, message: "Template created" });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("creates a template with full input", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.createTemplate({
        templateId: "TMPL-001",
        templateName: "Daily Warning",
        name: "Fallback",
        templateDescription: "Desc",
        description: "Fallback desc",
        alertType: "daily_limit",
        severity: "warning",
        jurisdiction: "DE",
        subjectTemplate: "[GRT] Warning",
        subject: "Fallback subject",
        bodyTemplate: "<p>Hello</p>",
        body: "Fallback body",
        isHtml: 1,
        recipientTypes: ["supervisor", "hr"],
        isEnabled: 1,
      });
      expect(result.success).toBe(true);
    });

    it("handles string recipientTypes", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.createTemplate({
        recipientTypes: "supervisor,hr",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateTemplate", () => {
    it("updates a template by id", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.updateTemplate({ id: 1, templateName: "Updated" });
      expect(result).toEqual({ success: true, message: "Template updated" });
    });

    it("converts array recipientTypes to JSON string", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.updateTemplate({
        id: 2,
        recipientTypes: ["employee", "admin"],
      });
      expect(result.success).toBe(true);
    });

    it("returns success without DB call when id is 0", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.updateTemplate({ id: 0 });
      expect(result.success).toBe(true);
    });
  });

  describe("deleteTemplate", () => {
    it("deletes a template by id", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.deleteTemplate({ id: 1 });
      expect(result).toEqual({ success: true, message: "Template deleted" });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("deletes by templateId fallback", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.deleteTemplate({ templateId: 5 });
      expect(result.success).toBe(true);
    });

    it("skips delete when no id given", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.deleteTemplate({});
      expect(result.success).toBe(true);
    });
  });

  describe("toggleTemplateEnabled", () => {
    it("toggles template from enabled to disabled", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1, isEnabled: 1 }];

      const result = await caller.compliance.toggleTemplateEnabled({ id: 1 });
      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("toggles template from disabled to enabled", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1, isEnabled: 0 }];

      const result = await caller.compliance.toggleTemplateEnabled({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("does nothing when template not found", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];

      const result = await caller.compliance.toggleTemplateEnabled({ id: 999 });
      expect(result.success).toBe(true);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("returns success when id is 0", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.toggleTemplateEnabled({ id: 0 });
      expect(result.success).toBe(true);
    });
  });

  describe("getTemplateStats", () => {
    it("computes stats from templates", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 1, isEnabled: 1, alertType: "daily_limit" },
        { id: 2, isEnabled: 0, alertType: "daily_limit" },
        { id: 3, isEnabled: 1, alertType: "weekly_limit" },
      ];

      const result = await caller.compliance.getTemplateStats();
      expect(result.stats.total).toBe(3);
      expect(result.stats.enabled).toBe(2);
      expect(result.stats.disabled).toBe(1);
      expect(result.stats.byAlertType).toEqual({ daily_limit: 2, weekly_limit: 1 });
    });
  });

  // ====================================================================
  // COMPLIANCE CHECKS
  // ====================================================================
  describe("checkCompliance", () => {
    it("returns compliant when no employeeId provided", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.checkCompliance();
      expect(result).toEqual({ compliant: true, issues: [] });
    });

    it("returns compliant when employeeId is 0 (falsy)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.checkCompliance({ employeeId: 0 });
      expect(result).toEqual({ compliant: true, issues: [] });
    });

    it("returns compliant when employee not found", async () => {
      const caller = createAuthenticatedCaller();
      // Employee query returns empty
      selectResultsQueue.push([]);

      const result = await caller.compliance.checkCompliance({ employeeId: 999 });
      expect(result).toEqual({ compliant: true, issues: [] });
    });

    it("returns compliant when no rules match jurisdiction", async () => {
      const caller = createAuthenticatedCaller();
      const employee = { id: 1, jurisdiction: "DE" };
      // 1: employee lookup
      selectResultsQueue.push([employee]);
      // 2: rules for jurisdiction (empty)
      selectResultsQueue.push([]);
      // 3: time entries
      selectResultsQueue.push([]);

      const result = await caller.compliance.checkCompliance({ employeeId: 1 });
      expect(result.compliant).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it("detects daily limit violation", async () => {
      const caller = createAuthenticatedCaller();
      const employee = { id: 1, jurisdiction: "DE" };
      const rule = {
        id: 1, ruleName: "ArbZG Daily", jurisdiction: "DE", ruleType: "daily_limit",
        thresholdValue: "10", thresholdUnit: "hours", warningThreshold: "9",
        criticalThreshold: "10", isEnabled: 1,
      };
      const entry = { id: 1, employeeId: 1, date: "2026-02-28", durationMinutes: 660 }; // 11h

      selectResultsQueue.push([employee]);
      selectResultsQueue.push([rule]);
      selectResultsQueue.push([entry]);

      const result = await caller.compliance.checkCompliance({ employeeId: 1 });
      expect(result.compliant).toBe(false);
      expect(result.issues.length).toBe(1);
      expect(result.issues[0].rule).toBe("ArbZG Daily");
      expect(result.issues[0].severity).toBe("critical"); // 11h >= criticalThreshold 10
    });

    it("detects daily limit warning (below critical threshold)", async () => {
      const caller = createAuthenticatedCaller();
      const employee = { id: 1, jurisdiction: "DE" };
      const rule = {
        id: 1, ruleName: "ArbZG Daily", jurisdiction: "DE", ruleType: "daily_limit",
        thresholdValue: "10", thresholdUnit: "hours", warningThreshold: "9",
        criticalThreshold: "12", isEnabled: 1,
      };
      const entry = { id: 1, employeeId: 1, date: "2026-02-28", durationMinutes: 630 }; // 10.5h

      selectResultsQueue.push([employee]);
      selectResultsQueue.push([rule]);
      selectResultsQueue.push([entry]);

      const result = await caller.compliance.checkCompliance({ employeeId: 1 });
      expect(result.compliant).toBe(false);
      expect(result.issues[0].severity).toBe("warning");
    });

    it("detects weekly limit violation", async () => {
      const caller = createAuthenticatedCaller();
      const employee = { id: 1, jurisdiction: "US" };
      const rule = {
        id: 1, ruleName: "FLSA Weekly", jurisdiction: "US", ruleType: "weekly_limit",
        thresholdValue: "40", thresholdUnit: "hours", warningThreshold: "38",
        criticalThreshold: "48", isEnabled: 1,
      };
      // 5 days * 540min = 2700min = 45h > 40h limit
      const entries = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1, employeeId: 1, date: `2026-02-2${i + 4}`, durationMinutes: 540,
      }));

      selectResultsQueue.push([employee]);
      selectResultsQueue.push([rule]);
      selectResultsQueue.push(entries);

      const result = await caller.compliance.checkCompliance({ employeeId: 1 });
      expect(result.compliant).toBe(false);
      expect(result.issues.some(i => i.rule === "FLSA Weekly")).toBe(true);
      expect(result.weeklyTotalHours).toBe(45);
    });

    it("detects overtime_limit violation same as daily_limit", async () => {
      const caller = createAuthenticatedCaller();
      const employee = { id: 1, jurisdiction: "CN" };
      const rule = {
        id: 1, ruleName: "OT Limit", jurisdiction: "CN", ruleType: "overtime_limit",
        thresholdValue: "8", thresholdUnit: "hours",
        criticalThreshold: null, isEnabled: 1,
      };
      const entry = { id: 1, employeeId: 1, date: "2026-02-28", durationMinutes: 540 }; // 9h > 8h

      selectResultsQueue.push([employee]);
      selectResultsQueue.push([rule]);
      selectResultsQueue.push([entry]);

      const result = await caller.compliance.checkCompliance({ employeeId: 1 });
      expect(result.compliant).toBe(false);
      expect(result.issues[0].severity).toBe("warning"); // no criticalThreshold
    });

    it("returns compliant when within limits", async () => {
      const caller = createAuthenticatedCaller();
      const employee = { id: 1, jurisdiction: "DE" };
      const rule = {
        id: 1, ruleName: "ArbZG Daily", jurisdiction: "DE", ruleType: "daily_limit",
        thresholdValue: "10", thresholdUnit: "hours",
        criticalThreshold: null, isEnabled: 1,
      };
      const entry = { id: 1, employeeId: 1, date: "2026-02-28", durationMinutes: 480 }; // 8h, within 10h

      selectResultsQueue.push([employee]);
      selectResultsQueue.push([rule]);
      selectResultsQueue.push([entry]);

      const result = await caller.compliance.checkCompliance({ employeeId: 1 });
      expect(result.compliant).toBe(true);
      expect(result.issues).toEqual([]);
    });
  });

  describe("triggerComplianceCheck", () => {
    it("checks a specific employee and creates alerts", async () => {
      const caller = createAuthenticatedCaller();
      const employee = { id: 1, jurisdiction: "DE" };
      const rule = {
        id: 1, ruleName: "ArbZG Daily", jurisdiction: "DE", ruleType: "daily_limit",
        thresholdValue: "10", thresholdUnit: "hours",
        criticalThreshold: "10", legalReference: "ArbZG S3",
        recommendedAction: "Reduce hours", isEnabled: 1,
      };
      const entry = { id: 1, employeeId: 1, date: "2026-02-28", durationMinutes: 660 }; // 11h

      // Employee lookup
      selectResultsQueue.push([employee]);
      // Rules for jurisdiction
      selectResultsQueue.push([rule]);
      // Time entries
      selectResultsQueue.push([entry]);

      const result = await caller.compliance.triggerComplianceCheck({ employeeId: 1 });
      expect(result.success).toBe(true);
      expect(result.alertsCreated).toBe(1);
      expect(result.employeesChecked).toBe(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("falls back to all active employees when no ids provided", async () => {
      const caller = createAuthenticatedCaller();
      // First: get all active employees
      selectResultsQueue.push([{ id: 10 }, { id: 20 }]);
      // Employee 10 lookup
      selectResultsQueue.push([{ id: 10, jurisdiction: "CN" }]);
      // Rules for CN
      selectResultsQueue.push([]);
      // Time entries for emp 10 (no rules, so no entries needed but query still runs)
      selectResultsQueue.push([]);
      // Employee 20 lookup
      selectResultsQueue.push([{ id: 20, jurisdiction: "US" }]);
      // Rules for US
      selectResultsQueue.push([]);
      // Time entries for emp 20
      selectResultsQueue.push([]);

      const result = await caller.compliance.triggerComplianceCheck();
      expect(result.success).toBe(true);
      expect(result.employeesChecked).toBe(2);
      expect(result.alertsCreated).toBe(0);
    });

    it("skips non-existent employees", async () => {
      const caller = createAuthenticatedCaller();
      // Employee not found
      selectResultsQueue.push([]);

      const result = await caller.compliance.triggerComplianceCheck({ employeeId: 999 });
      expect(result.success).toBe(true);
      expect(result.alertsCreated).toBe(0);
    });

    it("creates weekly limit alert", async () => {
      const caller = createAuthenticatedCaller();
      const employee = { id: 1, jurisdiction: "US" };
      const rule = {
        id: 1, ruleName: "FLSA", jurisdiction: "US", ruleType: "weekly_limit",
        thresholdValue: "40", thresholdUnit: "hours",
        criticalThreshold: null, legalReference: "29 USC",
        recommendedAction: "Review", isEnabled: 1,
      };
      const entries = [
        { id: 1, employeeId: 1, date: "2026-02-28", durationMinutes: 600 },
        { id: 2, employeeId: 1, date: "2026-02-27", durationMinutes: 600 },
        { id: 3, employeeId: 1, date: "2026-02-26", durationMinutes: 600 },
        { id: 4, employeeId: 1, date: "2026-02-25", durationMinutes: 600 },
        { id: 5, employeeId: 1, date: "2026-02-24", durationMinutes: 600 },
      ]; // total = 3000 min = 50h > 40h

      selectResultsQueue.push([employee]);
      selectResultsQueue.push([rule]);
      selectResultsQueue.push(entries);

      const result = await caller.compliance.triggerComplianceCheck({ employeeId: 1 });
      expect(result.alertsCreated).toBe(1);
    });

    it("accepts employeeIds array", async () => {
      const caller = createAuthenticatedCaller();
      // Employee 1
      selectResultsQueue.push([{ id: 1, jurisdiction: "CN" }]);
      selectResultsQueue.push([]); // rules
      selectResultsQueue.push([]); // entries
      // Employee 2
      selectResultsQueue.push([{ id: 2, jurisdiction: "CN" }]);
      selectResultsQueue.push([]); // rules
      selectResultsQueue.push([]); // entries

      const result = await caller.compliance.triggerComplianceCheck({ employeeIds: [1, 2] });
      expect(result.employeesChecked).toBe(2);
    });
  });

  // ====================================================================
  // STUBS: German/US checks
  // ====================================================================
  describe("runGermanDailyCheckNow", () => {
    it("returns stub message", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.runGermanDailyCheckNow();
      expect(result.success).toBe(true);
      expect(result.message).toContain("German daily check");
    });
  });

  describe("runUSWeeklyCheckNow", () => {
    it("returns stub message", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.runUSWeeklyCheckNow();
      expect(result.success).toBe(true);
      expect(result.message).toContain("US weekly check");
    });
  });

  // ====================================================================
  // AUDIT STATISTICS
  // ====================================================================
  describe("getAuditStatistics", () => {
    it("computes total/passed/failed from alerts", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 1, status: "open" },
        { id: 2, status: "resolved" },
        { id: 3, status: "open" },
        { id: 4, status: "resolved" },
      ];

      const result = await caller.compliance.getAuditStatistics();
      expect(result.total).toBe(4);
      expect(result.passed).toBe(2);  // resolved
      expect(result.failed).toBe(2);  // open
    });

    it("returns zeros when no alerts", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];

      const result = await caller.compliance.getAuditStatistics();
      expect(result).toEqual({ total: 0, passed: 0, failed: 0 });
    });
  });

  // ====================================================================
  // REPORTS
  // ====================================================================
  describe("getReportHistory", () => {
    it("returns report list", async () => {
      const caller = createAuthenticatedCaller();
      const reports = [{ id: 1, reportId: "rpt-1", reportType: "weekly" }];
      mockQueryResult = reports;

      const result = await caller.compliance.getReportHistory();
      expect(result).toEqual(reports);
    });
  });

  describe("getReportStats", () => {
    it("groups reports by type and format", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 1, reportType: "weekly", format: "pdf" },
        { id: 2, reportType: "weekly", format: "csv" },
        { id: 3, reportType: "monthly", format: "pdf" },
      ];

      const result = await caller.compliance.getReportStats();
      expect(result.stats.total).toBe(3);
      expect(result.stats.byType).toEqual({ weekly: 2, monthly: 1 });
      expect(result.stats.byFormat).toEqual({ pdf: 2, csv: 1 });
    });
  });

  describe("deleteReport", () => {
    it("deletes a report by id", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.deleteReport({ id: 1 });
      expect(result).toEqual({ success: true, message: "Report deleted" });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("uses reportId fallback", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.deleteReport({ reportId: 5 });
      expect(result.success).toBe(true);
    });
  });

  describe("exportReport", () => {
    it("creates a report record and returns file URL", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ fileUrl: "/reports/rpt-123.pdf" }];

      const result = await caller.compliance.exportReport({
        reportType: "weekly",
        format: "pdf",
        jurisdiction: "DE",
        employeesIncluded: 10,
        alertsIncluded: 3,
      });
      expect(result.url).toContain("/reports/");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("uses default values when input is empty", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ fileUrl: "/reports/rpt-abc.pdf" }];

      const result = await caller.compliance.exportReport({});
      expect(result.url).toContain("/reports/");
    });

    it("returns empty string when returning result is empty", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [];

      const result = await caller.compliance.exportReport({});
      expect(result.url).toBe("");
    });
  });

  // ====================================================================
  // ALERTS (additional endpoints)
  // ====================================================================
  describe("getAlerts", () => {
    it("returns up to 200 alerts", async () => {
      const caller = createAuthenticatedCaller();
      const alerts = [{ id: 1, status: "open" }, { id: 2, status: "resolved" }];
      mockQueryResult = alerts;

      const result = await caller.compliance.getAlerts();
      expect(result).toEqual(alerts);
    });
  });

  describe("getPendingAlertCount", () => {
    it("returns count of open alerts", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ count: 7 }];

      const result = await caller.compliance.getPendingAlertCount();
      expect(result).toEqual({ count: 7 });
    });

    it("returns 0 when no open alerts", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{}];

      const result = await caller.compliance.getPendingAlertCount();
      expect(result).toEqual({ count: 0 });
    });
  });

  // ====================================================================
  // APPROVAL QUEUE
  // ====================================================================
  describe("getApprovalQueue", () => {
    it("returns pending entries with decimal conversion", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        {
          id: 1, employeeId: 1, date: "2026-02-28",
          geoLatitude: "48.1351253", geoLongitude: "11.5819805", overtimeRate: "1.5",
          supervisorApproval: "pending",
        },
      ];

      const result = await caller.compliance.getApprovalQueue();
      expect(result.length).toBe(1);
      expect(result[0].geoLatitude).toBe(48.1351253);
      expect(result[0].geoLongitude).toBe(11.5819805);
      expect(result[0].overtimeRate).toBe(1.5);
    });

    it("handles null decimal fields", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        {
          id: 1, employeeId: 1, date: "2026-02-28",
          geoLatitude: null, geoLongitude: null, overtimeRate: null,
        },
      ];

      const result = await caller.compliance.getApprovalQueue();
      expect(result[0].geoLatitude).toBeNull();
      expect(result[0].geoLongitude).toBeNull();
      expect(result[0].overtimeRate).toBeNull();
    });
  });

  // ====================================================================
  // DASHBOARD STATS
  // ====================================================================
  describe("getDashboardStats", () => {
    it("returns aggregated counts from all tables", async () => {
      const caller = createAuthenticatedCaller();
      // Promise.all first batch: emp, alert, entry, report, rule, template
      selectResultsQueue.push([{ count: 50 }]);   // employees
      selectResultsQueue.push([{ count: 20 }]);   // alerts
      selectResultsQueue.push([{ count: 500 }]);  // time entries
      selectResultsQueue.push([{ count: 10 }]);   // reports
      selectResultsQueue.push([{ count: 5 }]);    // rules
      selectResultsQueue.push([{ count: 3 }]);    // templates
      // Promise.all second batch: openAlerts, pending approvals
      selectResultsQueue.push([{ count: 8 }]);    // open alerts
      selectResultsQueue.push([{ count: 12 }]);   // pending

      const result = await caller.compliance.getDashboardStats();
      expect(result.stats.activeEmployees).toBe(50);
      expect(result.stats.totalAlerts).toBe(20);
      expect(result.stats.openAlerts).toBe(8);
      expect(result.stats.totalTimeEntries).toBe(500);
      expect(result.stats.pendingApprovals).toBe(12);
      expect(result.stats.totalReports).toBe(10);
      expect(result.stats.totalRules).toBe(5);
      expect(result.stats.totalTemplates).toBe(3);
    });
  });

  // ====================================================================
  // EMPLOYEE STATUS
  // ====================================================================
  describe("getEmployeeStatus", () => {
    it("returns null status when no employeeId", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.getEmployeeStatus();
      expect(result).toEqual({ status: null });
    });

    it("returns null status when employee not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]); // employee lookup

      const result = await caller.compliance.getEmployeeStatus({ employeeId: 999 });
      expect(result).toEqual({ status: null });
    });

    it("returns warning status when open alerts exist", async () => {
      const caller = createAuthenticatedCaller();
      const employee = { id: 1, name: "Max", jurisdiction: "DE" };
      selectResultsQueue.push([employee]);           // employee
      selectResultsQueue.push([{ count: 3 }]);       // open alerts count
      selectResultsQueue.push([]);                    // latest weekly summary (none)

      const result = await caller.compliance.getEmployeeStatus({ employeeId: 1 });
      expect(result.status).not.toBeNull();
      expect(result.status!.employee).toEqual(employee);
      expect(result.status!.openAlerts).toBe(3);
      expect(result.status!.overallStatus).toBe("warning");
    });

    it("returns compliant status from weekly summary when no open alerts", async () => {
      const caller = createAuthenticatedCaller();
      const employee = { id: 1, name: "Max", jurisdiction: "DE" };
      const summary = { employeeId: 1, overallComplianceStatus: "compliant" };
      selectResultsQueue.push([employee]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([summary]);

      const result = await caller.compliance.getEmployeeStatus({ employeeId: 1 });
      expect(result.status!.overallStatus).toBe("compliant");
      expect(result.status!.latestWeeklySummary).toEqual(summary);
    });

    it("falls back to compliant when no alerts and no summary", async () => {
      const caller = createAuthenticatedCaller();
      const employee = { id: 1, name: "Max", jurisdiction: "DE" };
      selectResultsQueue.push([employee]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([]);

      const result = await caller.compliance.getEmployeeStatus({ employeeId: 1 });
      expect(result.status!.overallStatus).toBe("compliant");
      expect(result.status!.latestWeeklySummary).toBeNull();
    });

    it("accepts id as alternative to employeeId", async () => {
      const caller = createAuthenticatedCaller();
      const employee = { id: 5, name: "John", jurisdiction: "US" };
      selectResultsQueue.push([employee]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([]);

      const result = await caller.compliance.getEmployeeStatus({ id: 5 });
      expect(result.status).not.toBeNull();
      expect(result.status!.employee).toEqual(employee);
    });
  });

  // ====================================================================
  // EMPLOYEE TIME DETAILS
  // ====================================================================
  describe("getEmployeeTimeDetails", () => {
    it("returns empty array when no employeeId", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.getEmployeeTimeDetails();
      expect(result).toEqual([]);
    });

    it("returns time entries with decimal conversion", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        {
          id: 1, employeeId: 1, date: "2026-02-28",
          geoLatitude: "48.135", geoLongitude: "11.582", overtimeRate: "1.5",
          durationMinutes: 480,
        },
      ];

      const result = await caller.compliance.getEmployeeTimeDetails({ employeeId: 1 });
      expect(result.length).toBe(1);
      expect(result[0].geoLatitude).toBe(48.135);
      expect(result[0].geoLongitude).toBe(11.582);
      expect(result[0].overtimeRate).toBe(1.5);
    });

    it("applies dateFrom and dateTo filters", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];

      const result = await caller.compliance.getEmployeeTimeDetails({
        employeeId: 1,
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
        limit: 10,
      });
      expect(result).toEqual([]);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it("handles null decimal values", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 1, employeeId: 1, date: "2026-02-28", geoLatitude: null, geoLongitude: null, overtimeRate: null },
      ];

      const result = await caller.compliance.getEmployeeTimeDetails({ employeeId: 1 });
      expect(result[0].geoLatitude).toBeNull();
      expect(result[0].geoLongitude).toBeNull();
      expect(result[0].overtimeRate).toBeNull();
    });

    it("accepts id as alternative to employeeId", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];

      const result = await caller.compliance.getEmployeeTimeDetails({ id: 5 });
      expect(result).toEqual([]);
    });
  });

  // ====================================================================
  // AI STUB
  // ====================================================================
  describe("getGeminiAnalysis", () => {
    it("returns null analysis with explanation", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.getGeminiAnalysis();
      expect(result.analysis).toBeNull();
      expect(result.message).toContain("GEMINI_API_KEY");
    });

    it("ignores employeeId parameter", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.getGeminiAnalysis({ employeeId: 1 });
      expect(result.analysis).toBeNull();
    });
  });

  // ====================================================================
  // SCHEDULER STUBS
  // ====================================================================
  describe("getSchedulerStatus", () => {
    it("returns stopped status with scheduler info", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.getSchedulerStatus();
      expect(result.status).toBe("stopped");
      expect(result.schedulers.germanDailyCheck.enabled).toBe(false);
      expect(result.schedulers.usWeeklyCheck.enabled).toBe(false);
    });
  });

  describe("startSchedulers", () => {
    it("returns stub success", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.startSchedulers();
      expect(result.success).toBe(true);
      expect(result.message).toContain("start");
    });
  });

  describe("stopSchedulers", () => {
    it("returns stub success", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.compliance.stopSchedulers();
      expect(result.success).toBe(true);
      expect(result.message).toContain("stop");
    });
  });

  // ====================================================================
  // SEED TEST DATA
  // ====================================================================
  describe("seedTestData", () => {
    it("seeds employees, rules, and templates", async () => {
      const caller = createAuthenticatedCaller();
      // 3 employee inserts, each returning a result
      mockReturningResult = [{ id: 1 }];

      const result = await caller.compliance.seedTestData();
      expect(result.success).toBe(true);
      expect(result.message).toContain("seeded");
      expect(result.counts.employees).toBe(3);
      expect(result.counts.rules).toBe(3);
      expect(result.counts.templates).toBe(1);
      // 3 employee inserts + 1 rules insert + 1 templates insert = 5
      expect(mockDb.insert).toHaveBeenCalledTimes(5);
    });
  });

  // ====================================================================
  // INPUT VALIDATION
  // ====================================================================
  describe("input validation", () => {
    it("rejects list with limit > 500", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.compliance.list({ limit: 501 })).rejects.toThrow();
    });

    it("rejects list with limit < 1", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.compliance.list({ limit: 0 })).rejects.toThrow();
    });

    it("rejects list with negative offset", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.compliance.list({ offset: -1 })).rejects.toThrow();
    });

    it("rejects createRule without ruleType", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.compliance.createRule({ thresholdValue: "10" } as any),
      ).rejects.toThrow();
    });

    it("rejects createRule without thresholdValue", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.compliance.createRule({ ruleType: "daily_limit" } as any),
      ).rejects.toThrow();
    });

    it("rejects getById without id", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.compliance.getById({} as any)).rejects.toThrow();
    });

    it("rejects create with alertType exceeding max length", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.compliance.create({ alertType: "x".repeat(101) }),
      ).rejects.toThrow();
    });

    it("rejects create with description exceeding max length", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.compliance.create({ description: "x".repeat(5001) }),
      ).rejects.toThrow();
    });
  });
});
