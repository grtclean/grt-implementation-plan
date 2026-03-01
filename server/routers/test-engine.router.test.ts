/**
 * Test Engine Router — Unit Tests
 * 18 procedures: listTemplates, getTemplate, createTemplate, updateTemplate,
 * cloneTemplate, listCases, createCase, updateCase, deleteCase,
 * listExecutions, createExecution, updateExecution, getExecution,
 * recordResult, updateResult, getExecutionResults, logAiGeneration, getAiLogs
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
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
    execute: vi.fn(() => Promise.resolve([[]])),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

vi.mock("../../drizzle/schema", () => ({
  testTemplates: {
    id: "id",
    name: "name",
    domain: "domain",
    status: "status",
    version: "version",
    parentTemplateId: "parentTemplateId",
    description: "description",
    scope: "scope",
    applicablePhases: "applicablePhases",
    requiredRoles: "requiredRoles",
    tags: "tags",
    estimatedTotalHours: "estimatedTotalHours",
    passingScorePercent: "passingScorePercent",
    createdBy: "createdBy",
    updatedBy: "updatedBy",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  testCases: {
    id: "id",
    templateId: "templateId",
    sortOrder: "sortOrder",
    code: "code",
    title: "title",
    description: "description",
    phase: "phase",
    category: "category",
    priority: "priority",
    preconditions: "preconditions",
    steps: "steps",
    expectedResult: "expectedResult",
    requiredRole: "requiredRole",
    skillLevel: "skillLevel",
    estimatedHours: "estimatedHours",
    automatable: "automatable",
    isActive: "isActive",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  testExecutions: {
    id: "id",
    templateId: "templateId",
    projectId: "projectId",
    executionName: "executionName",
    status: "status",
    environment: "environment",
    plannedStartDate: "plannedStartDate",
    plannedEndDate: "plannedEndDate",
    actualStartDate: "actualStartDate",
    actualEndDate: "actualEndDate",
    leadUserId: "leadUserId",
    teamUserIds: "teamUserIds",
    totalCases: "totalCases",
    passedCases: "passedCases",
    failedCases: "failedCases",
    blockedCases: "blockedCases",
    overallScore: "overallScore",
    notes: "notes",
    createdBy: "createdBy",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  testResults: {
    id: "id",
    executionId: "executionId",
    testCaseId: "testCaseId",
    status: "status",
    executedBy: "executedBy",
    executedAt: "executedAt",
    actualHours: "actualHours",
    bugSeverity: "bugSeverity",
    bugDescription: "bugDescription",
    bugTicketUrl: "bugTicketUrl",
    evidenceUrls: "evidenceUrls",
    notes: "notes",
    retestOf: "retestOf",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  aiGenerationLogs: {
    id: "id",
    templateId: "templateId",
    source: "source",
    promptInputConditions: "promptInputConditions",
    modelUsed: "modelUsed",
    modelVersion: "modelVersion",
    responseTokens: "responseTokens",
    promptTokens: "promptTokens",
    totalTokens: "totalTokens",
    generatedContent: "generatedContent",
    confidenceScore: "confidenceScore",
    userAccepted: "userAccepted",
    userModifications: "userModifications",
    generatedBy: "generatedBy",
    generatedAt: "generatedAt",
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
describe("testEngine router", () => {
  // ===================================================================
  //  TEMPLATES
  // ===================================================================

  // ─── listTemplates ─────────────────────────────────────────
  describe("listTemplates", () => {
    it("returns items and total with no filters", async () => {
      const caller = createAuthenticatedCaller();
      const templates = [
        { id: 1, name: "FAT Checklist", domain: "fat_checklist", status: "active" },
        { id: 2, name: "PLC Test", domain: "plc_test", status: "draft" },
      ];
      // First call returns items, second returns count
      selectResultsQueue.push(templates);
      selectResultsQueue.push([{ value: 2 }]);
      const result = await caller.testEngine.listTemplates();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("passes domain filter", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, name: "PLC", domain: "plc_test" }]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller.testEngine.listTemplates({ domain: "plc_test" });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("passes status filter", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller.testEngine.listTemplates({ status: "archived" });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("passes search filter", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 3, name: "FAT 验收清单" }]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller.testEngine.listTemplates({ search: "FAT" });
      expect(result.items).toHaveLength(1);
    });

    it("applies pagination via limit and offset", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 5, name: "Page 2 item" }]);
      selectResultsQueue.push([{ value: 15 }]);
      const result = await caller.testEngine.listTemplates({ limit: 5, offset: 5 });
      expect(result.total).toBe(15);
      expect(result.items).toHaveLength(1);
    });

    it("works when called with undefined input", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller.testEngine.listTemplates(undefined);
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ─── getTemplate ───────────────────────────────────────────
  describe("getTemplate", () => {
    it("returns template with cases when found", async () => {
      const caller = createAuthenticatedCaller();
      // First select: template lookup
      selectResultsQueue.push([
        { id: 1, name: "FAT Checklist", domain: "fat_checklist", status: "active", version: 1 },
      ]);
      // Second select: cases lookup
      selectResultsQueue.push([
        { id: 10, templateId: 1, title: "Case A", isActive: true, sortOrder: 1 },
        { id: 11, templateId: 1, title: "Case B", isActive: true, sortOrder: 2 },
      ]);
      const result = await caller.testEngine.getTemplate({ id: 1 });
      expect(result).not.toBeNull();
      expect(result!.name).toBe("FAT Checklist");
      expect(result!.caseCount).toBe(2);
      expect(result!.cases).toHaveLength(2);
    });

    it("returns null when template not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.testEngine.getTemplate({ id: 999 });
      expect(result).toBeNull();
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 5, name: "String ID", domain: "custom" }]);
      selectResultsQueue.push([]);
      const result = await caller.testEngine.getTemplate({ id: "5" });
      expect(result).not.toBeNull();
      expect(result!.caseCount).toBe(0);
    });
  });

  // ─── createTemplate ────────────────────────────────────────
  describe("createTemplate", () => {
    it("creates template with required fields", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [
        { id: 1, name: "New Template", domain: "software_uat", status: "draft", createdBy: 1 },
      ];
      const result = await caller.testEngine.createTemplate({
        name: "New Template",
        domain: "software_uat",
      });
      expect(result.id).toBe(1);
      expect(result.name).toBe("New Template");
      expect(result.domain).toBe("software_uat");
      expect(result.status).toBe("draft");
    });

    it("creates template with all optional fields", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [
        {
          id: 2,
          name: "Full Template",
          domain: "plc_test",
          status: "draft",
          description: "Desc",
          scope: "Scope",
          applicablePhases: ["M3", "M5"],
          requiredRoles: ["engineer"],
          tags: ["plc", "automation"],
          estimatedTotalHours: "40.00",
          passingScorePercent: 90,
        },
      ];
      const result = await caller.testEngine.createTemplate({
        name: "Full Template",
        domain: "plc_test",
        description: "Desc",
        scope: "Scope",
        applicablePhases: ["M3", "M5"],
        requiredRoles: ["engineer"],
        tags: ["plc", "automation"],
        estimatedTotalHours: "40.00",
        passingScorePercent: 90,
      });
      expect(result.name).toBe("Full Template");
      expect(result.applicablePhases).toEqual(["M3", "M5"]);
      expect(result.passingScorePercent).toBe(90);
    });

    it("rejects empty name", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.testEngine.createTemplate({ name: "", domain: "custom" })
      ).rejects.toThrow();
    });

    it("rejects invalid domain enum", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.testEngine.createTemplate({
          name: "Bad Domain",
          domain: "invalid_domain" as any,
        })
      ).rejects.toThrow();
    });

    it("sets createdBy from context user", async () => {
      const caller = createAuthenticatedCaller({ id: 42 });
      mockReturningResult = [{ id: 3, name: "T", domain: "custom", createdBy: 42, updatedBy: 42 }];
      const result = await caller.testEngine.createTemplate({
        name: "T",
        domain: "custom",
      });
      expect(result.createdBy).toBe(42);
      expect(result.updatedBy).toBe(42);
    });
  });

  // ─── updateTemplate ────────────────────────────────────────
  describe("updateTemplate", () => {
    it("updates template name", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 1, name: "Updated Name", status: "draft" }];
      const result = await caller.testEngine.updateTemplate({
        id: 1,
        name: "Updated Name",
      });
      expect(result.name).toBe("Updated Name");
    });

    it("updates template status to active", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 1, name: "T", status: "active" }];
      const result = await caller.testEngine.updateTemplate({
        id: 1,
        status: "active",
      });
      expect(result.status).toBe("active");
    });

    it("updates template status to archived", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 1, name: "T", status: "archived" }];
      const result = await caller.testEngine.updateTemplate({
        id: 1,
        status: "archived",
      });
      expect(result.status).toBe("archived");
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 5, name: "T", status: "draft" }];
      const result = await caller.testEngine.updateTemplate({
        id: "5",
        name: "Updated",
      });
      expect(result.id).toBe(5);
    });

    it("rejects invalid status enum", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.testEngine.updateTemplate({ id: 1, status: "bogus" as any })
      ).rejects.toThrow();
    });
  });

  // ─── cloneTemplate ─────────────────────────────────────────
  describe("cloneTemplate", () => {
    it("clones template with cases and returns cloned count", async () => {
      const caller = createAuthenticatedCaller({ id: 7 });
      // 1st: source template lookup
      selectResultsQueue.push([
        {
          id: 1,
          name: "Source Template",
          domain: "fat_checklist",
          version: 2,
          description: "Desc",
          scope: "scope",
          applicablePhases: ["M3"],
          requiredRoles: ["eng"],
          tags: ["tag1"],
          estimatedTotalHours: "10.00",
          passingScorePercent: 80,
        },
      ]);
      // 2nd: cases for source (after insert of cloned template)
      selectResultsQueue.push([
        { id: 10, sortOrder: 1, code: "TC-001", title: "C1", isActive: true },
        { id: 11, sortOrder: 2, code: "TC-002", title: "C2", isActive: true },
      ]);
      // insert returning for cloned template
      mockReturningResult = [
        { id: 5, name: "Source Template (v3)", domain: "fat_checklist", version: 3, parentTemplateId: 1 },
      ];
      const result = await caller.testEngine.cloneTemplate({ sourceTemplateId: 1 });
      expect(result.id).toBe(5);
      expect(result.clonedCases).toBe(2);
    });

    it("clones template with custom name", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        { id: 1, name: "Source", domain: "custom", version: 1 },
      ]);
      selectResultsQueue.push([]); // no cases
      mockReturningResult = [{ id: 6, name: "My Clone", domain: "custom" }];
      const result = await caller.testEngine.cloneTemplate({
        sourceTemplateId: 1,
        newName: "My Clone",
      });
      expect(result.name).toBe("My Clone");
      expect(result.clonedCases).toBe(0);
    });

    it("throws when source template does not exist", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]); // source not found
      await expect(
        caller.testEngine.cloneTemplate({ sourceTemplateId: 999 })
      ).rejects.toThrow("Source template not found");
    });

    it("accepts string sourceTemplateId", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        { id: 3, name: "S", domain: "plc_test", version: 1 },
      ]);
      selectResultsQueue.push([]);
      mockReturningResult = [{ id: 7, name: "S (v2)", domain: "plc_test" }];
      const result = await caller.testEngine.cloneTemplate({
        sourceTemplateId: "3",
      });
      expect(result.clonedCases).toBe(0);
    });
  });

  // ===================================================================
  //  TEST CASES
  // ===================================================================

  // ─── listCases ─────────────────────────────────────────────
  describe("listCases", () => {
    it("returns active cases for template", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 1, templateId: 10, title: "Case A", isActive: true, sortOrder: 1 },
        { id: 2, templateId: 10, title: "Case B", isActive: true, sortOrder: 2 },
      ];
      const result = await caller.testEngine.listCases({ templateId: 10 });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("includes inactive cases when flag is true", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 1, title: "Active", isActive: true },
        { id: 2, title: "Inactive", isActive: false },
      ];
      const result = await caller.testEngine.listCases({
        templateId: 10,
        includeInactive: true,
      });
      expect(result.items).toHaveLength(2);
    });

    it("returns empty list when no cases exist", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.testEngine.listCases({ templateId: 999 });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("accepts string templateId", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1, title: "C" }];
      const result = await caller.testEngine.listCases({ templateId: "10" });
      expect(result.items).toHaveLength(1);
    });
  });

  // ─── createCase ────────────────────────────────────────────
  describe("createCase", () => {
    it("creates case with minimal fields", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [
        { id: 1, templateId: 10, title: "Login test", sortOrder: 0 },
      ];
      const result = await caller.testEngine.createCase({
        templateId: 10,
        title: "Login test",
      });
      expect(result.id).toBe(1);
      expect(result.title).toBe("Login test");
    });

    it("creates case with all optional fields", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [
        {
          id: 2,
          templateId: 10,
          title: "Full Case",
          code: "TC-001",
          phase: "execution",
          category: "functional",
          priority: "high",
          sortOrder: 5,
          steps: [{ step: 1, action: "Click", expected: "Dialog opens" }],
          automatable: true,
        },
      ];
      const result = await caller.testEngine.createCase({
        templateId: 10,
        title: "Full Case",
        code: "TC-001",
        phase: "execution",
        category: "functional",
        priority: "high",
        sortOrder: 5,
        preconditions: "System logged in",
        steps: [{ step: 1, action: "Click", expected: "Dialog opens" }],
        expectedResult: "All pass",
        requiredRole: "tester",
        skillLevel: "senior",
        estimatedHours: "2.5",
        automatable: true,
      });
      expect(result.code).toBe("TC-001");
      expect(result.steps).toHaveLength(1);
    });

    it("rejects empty title", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.testEngine.createCase({ templateId: 10, title: "" })
      ).rejects.toThrow();
    });

    it("rejects invalid phase enum", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.testEngine.createCase({
          templateId: 10,
          title: "X",
          phase: "invalid" as any,
        })
      ).rejects.toThrow();
    });

    it("rejects invalid category enum", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.testEngine.createCase({
          templateId: 10,
          title: "X",
          category: "invalid" as any,
        })
      ).rejects.toThrow();
    });

    it("rejects invalid priority enum", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.testEngine.createCase({
          templateId: 10,
          title: "X",
          priority: "invalid" as any,
        })
      ).rejects.toThrow();
    });
  });

  // ─── updateCase ────────────────────────────────────────────
  describe("updateCase", () => {
    it("updates case title", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 1, title: "New Title" }];
      const result = await caller.testEngine.updateCase({
        id: 1,
        title: "New Title",
      });
      expect(result.title).toBe("New Title");
    });

    it("updates case priority and category", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 1, priority: "critical", category: "safety" }];
      const result = await caller.testEngine.updateCase({
        id: 1,
        priority: "critical",
        category: "safety",
      });
      expect(result.priority).toBe("critical");
      expect(result.category).toBe("safety");
    });

    it("updates case steps array", async () => {
      const caller = createAuthenticatedCaller();
      const newSteps = [
        { step: 1, action: "Open page", expected: "Page loads" },
        { step: 2, action: "Click save", expected: "Data saved" },
      ];
      mockReturningResult = [{ id: 1, steps: newSteps }];
      const result = await caller.testEngine.updateCase({
        id: 1,
        steps: newSteps,
      });
      expect(result.steps).toHaveLength(2);
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 5, title: "T" }];
      const result = await caller.testEngine.updateCase({
        id: "5",
        title: "T",
      });
      expect(result.id).toBe(5);
    });
  });

  // ─── deleteCase ────────────────────────────────────────────
  describe("deleteCase", () => {
    it("soft-deletes case by setting isActive to false", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 1, isActive: false }];
      const result = await caller.testEngine.deleteCase({ id: 1 });
      expect(result.isActive).toBe(false);
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 5, isActive: false }];
      const result = await caller.testEngine.deleteCase({ id: "5" });
      expect(result.isActive).toBe(false);
    });
  });

  // ===================================================================
  //  EXECUTIONS
  // ===================================================================

  // ─── listExecutions ────────────────────────────────────────
  describe("listExecutions", () => {
    it("returns items and total with no filters", async () => {
      const caller = createAuthenticatedCaller();
      const executions = [
        { id: 1, executionName: "Sprint 1 FAT", status: "in_progress" },
        { id: 2, executionName: "Sprint 2 FAT", status: "planned" },
      ];
      selectResultsQueue.push(executions);
      selectResultsQueue.push([{ value: 2 }]);
      const result = await caller.testEngine.listExecutions();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("filters by templateId", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, templateId: 5, executionName: "E1" }]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller.testEngine.listExecutions({ templateId: 5 });
      expect(result.items).toHaveLength(1);
    });

    it("filters by status", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller.testEngine.listExecutions({ status: "completed" });
      expect(result.items).toHaveLength(0);
    });

    it("filters by environment", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, environment: "prod" }]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller.testEngine.listExecutions({ environment: "prod" });
      expect(result.total).toBe(1);
    });

    it("applies pagination", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 6 }]);
      selectResultsQueue.push([{ value: 20 }]);
      const result = await caller.testEngine.listExecutions({ limit: 5, offset: 5 });
      expect(result.total).toBe(20);
    });

    it("works with undefined input", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller.testEngine.listExecutions(undefined);
      expect(result.items).toHaveLength(0);
    });
  });

  // ─── createExecution ───────────────────────────────────────
  describe("createExecution", () => {
    it("creates execution and pre-creates result entries", async () => {
      const caller = createAuthenticatedCaller({ id: 3 });
      // 1st: cases lookup for the template
      selectResultsQueue.push([
        { id: 10, templateId: 5, isActive: true },
        { id: 11, templateId: 5, isActive: true },
      ]);
      // insert returning for execution
      mockReturningResult = [
        { id: 100, templateId: 5, executionName: "Sprint 1", status: "planned", environment: "dev" },
      ];
      const result = await caller.testEngine.createExecution({
        templateId: 5,
        executionName: "Sprint 1",
        environment: "dev",
      });
      expect(result.id).toBe(100);
      expect(result.totalCases).toBe(2);
    });

    it("creates execution with all optional fields", async () => {
      const caller = createAuthenticatedCaller({ id: 3 });
      selectResultsQueue.push([{ id: 10, isActive: true }]);
      mockReturningResult = [
        {
          id: 101,
          templateId: 5,
          executionName: "Full Exec",
          environment: "staging",
          projectId: 7,
          plannedStartDate: "2026-03-01",
          plannedEndDate: "2026-03-15",
          leadUserId: 3,
          teamUserIds: [3, 4, 5],
          notes: "Note",
        },
      ];
      const result = await caller.testEngine.createExecution({
        templateId: 5,
        executionName: "Full Exec",
        environment: "staging",
        projectId: 7,
        plannedStartDate: "2026-03-01",
        plannedEndDate: "2026-03-15",
        leadUserId: 3,
        teamUserIds: [3, 4, 5],
        notes: "Note",
      });
      expect(result.environment).toBe("staging");
      expect(result.totalCases).toBe(1);
    });

    it("creates execution with zero cases", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]); // no cases for template
      mockReturningResult = [
        { id: 102, templateId: 5, executionName: "Empty", environment: "lab" },
      ];
      const result = await caller.testEngine.createExecution({
        templateId: 5,
        executionName: "Empty",
        environment: "lab",
      });
      expect(result.totalCases).toBe(0);
    });

    it("rejects empty executionName", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.testEngine.createExecution({
          templateId: 5,
          executionName: "",
          environment: "dev",
        })
      ).rejects.toThrow();
    });

    it("rejects invalid environment enum", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.testEngine.createExecution({
          templateId: 5,
          executionName: "X",
          environment: "invalid" as any,
        })
      ).rejects.toThrow();
    });
  });

  // ─── updateExecution ───────────────────────────────────────
  describe("updateExecution", () => {
    it("updates execution status to in_progress", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 100, status: "in_progress" }];
      const result = await caller.testEngine.updateExecution({
        id: 100,
        status: "in_progress",
        actualStartDate: "2026-03-01T08:00:00Z",
      });
      expect(result.status).toBe("in_progress");
    });

    it("updates execution status to completed", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 100, status: "completed" }];
      const result = await caller.testEngine.updateExecution({
        id: 100,
        status: "completed",
        actualEndDate: "2026-03-15T17:00:00Z",
      });
      expect(result.status).toBe("completed");
    });

    it("updates execution notes", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 100, notes: "Updated notes" }];
      const result = await caller.testEngine.updateExecution({
        id: 100,
        notes: "Updated notes",
      });
      expect(result.notes).toBe("Updated notes");
    });

    it("rejects invalid status enum", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.testEngine.updateExecution({ id: 100, status: "bad" as any })
      ).rejects.toThrow();
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 100, status: "paused" }];
      const result = await caller.testEngine.updateExecution({
        id: "100",
        status: "paused",
      });
      expect(result.status).toBe("paused");
    });
  });

  // ─── getExecution ──────────────────────────────────────────
  describe("getExecution", () => {
    it("returns execution with result summary", async () => {
      const caller = createAuthenticatedCaller();
      // 1st: execution lookup
      selectResultsQueue.push([
        { id: 100, executionName: "Sprint 1 FAT", status: "in_progress" },
      ]);
      // 2nd: results for summary
      selectResultsQueue.push([
        { id: 1, executionId: 100, status: "pass" },
        { id: 2, executionId: 100, status: "pass" },
        { id: 3, executionId: 100, status: "fail" },
        { id: 4, executionId: 100, status: "blocked" },
        { id: 5, executionId: 100, status: "not_started" },
      ]);
      const result = await caller.testEngine.getExecution({ id: 100 });
      expect(result).not.toBeNull();
      expect(result!.executionName).toBe("Sprint 1 FAT");
      expect(result!.summary.total).toBe(5);
      expect(result!.summary.passed).toBe(2);
      expect(result!.summary.failed).toBe(1);
      expect(result!.summary.blocked).toBe(1);
      expect(result!.summary.notStarted).toBe(1);
      expect(result!.summary.skipped).toBe(0);
      expect(result!.summary.partial).toBe(0);
      expect(result!.overallScore).toBe("40.00");
    });

    it("returns null when execution not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]); // execution not found
      const result = await caller.testEngine.getExecution({ id: 999 });
      expect(result).toBeNull();
    });

    it("returns 0.00 score when no results exist", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 100, executionName: "Empty" }]);
      selectResultsQueue.push([]); // no results
      const result = await caller.testEngine.getExecution({ id: 100 });
      expect(result!.overallScore).toBe("0.00");
      expect(result!.summary.total).toBe(0);
    });

    it("returns 100.00 score when all results pass", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 100, executionName: "All Pass" }]);
      selectResultsQueue.push([
        { id: 1, status: "pass" },
        { id: 2, status: "pass" },
        { id: 3, status: "pass" },
      ]);
      const result = await caller.testEngine.getExecution({ id: 100 });
      expect(result!.overallScore).toBe("100.00");
      expect(result!.summary.passed).toBe(3);
    });

    it("counts partial and skipped statuses correctly", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 100 }]);
      selectResultsQueue.push([
        { id: 1, status: "partial" },
        { id: 2, status: "skipped" },
        { id: 3, status: "partial" },
      ]);
      const result = await caller.testEngine.getExecution({ id: 100 });
      expect(result!.summary.partial).toBe(2);
      expect(result!.summary.skipped).toBe(1);
      expect(result!.overallScore).toBe("0.00");
    });
  });

  // ===================================================================
  //  RESULTS
  // ===================================================================

  // ─── recordResult ──────────────────────────────────────────
  describe("recordResult", () => {
    it("updates existing result entry", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      // 1st: existing result check
      selectResultsQueue.push([{ id: 50, executionId: 100, testCaseId: 10, status: "not_started" }]);
      // returning from update
      mockReturningResult = [
        { id: 50, executionId: 100, testCaseId: 10, status: "pass", executedBy: 5 },
      ];
      // For updateExecutionCounters: results fetch + update (no returning)
      selectResultsQueue.push([
        { id: 50, status: "pass" },
      ]);
      const result = await caller.testEngine.recordResult({
        executionId: 100,
        testCaseId: 10,
        status: "pass",
      });
      expect(result.status).toBe("pass");
      expect(result.executedBy).toBe(5);
    });

    it("creates new result when none exists", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      // 1st: existing result check — empty
      selectResultsQueue.push([]);
      // returning from insert
      mockReturningResult = [
        { id: 51, executionId: 100, testCaseId: 11, status: "fail", executedBy: 5 },
      ];
      // For updateExecutionCounters
      selectResultsQueue.push([
        { id: 51, status: "fail" },
      ]);
      const result = await caller.testEngine.recordResult({
        executionId: 100,
        testCaseId: 11,
        status: "fail",
      });
      expect(result.status).toBe("fail");
    });

    it("records result with bug information", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      selectResultsQueue.push([]);
      mockReturningResult = [
        {
          id: 52,
          executionId: 100,
          testCaseId: 12,
          status: "fail",
          bugSeverity: "critical",
          bugDescription: "Motor overheating at 80C",
          bugTicketUrl: "https://jira.example.com/BUG-123",
        },
      ];
      selectResultsQueue.push([{ id: 52, status: "fail" }]);
      const result = await caller.testEngine.recordResult({
        executionId: 100,
        testCaseId: 12,
        status: "fail",
        bugSeverity: "critical",
        bugDescription: "Motor overheating at 80C",
        bugTicketUrl: "https://jira.example.com/BUG-123",
      });
      expect(result.bugSeverity).toBe("critical");
      expect(result.bugDescription).toBe("Motor overheating at 80C");
    });

    it("records result with evidence URLs", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      selectResultsQueue.push([]);
      mockReturningResult = [
        {
          id: 53,
          executionId: 100,
          testCaseId: 13,
          status: "pass",
          evidenceUrls: ["https://s3.example.com/screenshot1.png", "https://s3.example.com/log.txt"],
        },
      ];
      selectResultsQueue.push([{ id: 53, status: "pass" }]);
      const result = await caller.testEngine.recordResult({
        executionId: 100,
        testCaseId: 13,
        status: "pass",
        evidenceUrls: ["https://s3.example.com/screenshot1.png", "https://s3.example.com/log.txt"],
      });
      expect(result.evidenceUrls).toHaveLength(2);
    });

    it("records result with retest reference", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      selectResultsQueue.push([]);
      mockReturningResult = [
        { id: 54, executionId: 100, testCaseId: 10, status: "pass", retestOf: 50 },
      ];
      selectResultsQueue.push([{ id: 54, status: "pass" }]);
      const result = await caller.testEngine.recordResult({
        executionId: 100,
        testCaseId: 10,
        status: "pass",
        retestOf: 50,
        notes: "Retest after fix #BUG-123",
      });
      expect(result.retestOf).toBe(50);
    });

    it("accepts string executionId and testCaseId", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      selectResultsQueue.push([]);
      mockReturningResult = [{ id: 55, executionId: 100, testCaseId: 14, status: "skipped" }];
      selectResultsQueue.push([{ id: 55, status: "skipped" }]);
      const result = await caller.testEngine.recordResult({
        executionId: "100",
        testCaseId: "14",
        status: "skipped",
      });
      expect(result.status).toBe("skipped");
    });

    it("rejects invalid status enum", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.testEngine.recordResult({
          executionId: 100,
          testCaseId: 10,
          status: "invalid" as any,
        })
      ).rejects.toThrow();
    });

    it("rejects invalid bugSeverity enum", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.testEngine.recordResult({
          executionId: 100,
          testCaseId: 10,
          status: "fail",
          bugSeverity: "catastrophic" as any,
        })
      ).rejects.toThrow();
    });
  });

  // ─── updateResult ──────────────────────────────────────────
  describe("updateResult", () => {
    it("updates result status", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      mockReturningResult = [{ id: 50, executionId: 100, status: "pass", executedBy: 5 }];
      // For updateExecutionCounters
      selectResultsQueue.push([{ id: 50, status: "pass" }]);
      const result = await caller.testEngine.updateResult({
        id: 50,
        status: "pass",
      });
      expect(result.status).toBe("pass");
    });

    it("updates result notes", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      mockReturningResult = [{ id: 50, executionId: 100, notes: "Updated note" }];
      selectResultsQueue.push([{ id: 50, status: "pass" }]);
      const result = await caller.testEngine.updateResult({
        id: 50,
        notes: "Updated note",
      });
      expect(result.notes).toBe("Updated note");
    });

    it("updates bug details on a result", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      mockReturningResult = [
        { id: 50, executionId: 100, bugSeverity: "major", bugDescription: "New desc" },
      ];
      selectResultsQueue.push([{ id: 50, status: "fail" }]);
      const result = await caller.testEngine.updateResult({
        id: 50,
        bugSeverity: "major",
        bugDescription: "New desc",
      });
      expect(result.bugSeverity).toBe("major");
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      mockReturningResult = [{ id: 50, executionId: 100, status: "blocked" }];
      selectResultsQueue.push([{ id: 50, status: "blocked" }]);
      const result = await caller.testEngine.updateResult({
        id: "50",
        status: "blocked",
      });
      expect(result.status).toBe("blocked");
    });

    it("skips counter update when returning is empty (no row updated)", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      mockReturningResult = [];
      // updateExecutionCounters should NOT be called since updated is undefined
      const result = await caller.testEngine.updateResult({
        id: 999,
        status: "pass",
      });
      expect(result).toBeUndefined();
    });
  });

  // ─── getExecutionResults ───────────────────────────────────
  describe("getExecutionResults", () => {
    it("returns all results for an execution", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 1, executionId: 100, testCaseId: 10, status: "pass" },
        { id: 2, executionId: 100, testCaseId: 11, status: "fail" },
        { id: 3, executionId: 100, testCaseId: 12, status: "not_started" },
      ];
      const result = await caller.testEngine.getExecutionResults({ executionId: 100 });
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("filters results by status", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 1, executionId: 100, status: "fail" },
      ];
      const result = await caller.testEngine.getExecutionResults({
        executionId: 100,
        status: "fail",
      });
      expect(result.items).toHaveLength(1);
    });

    it("returns empty when no results", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.testEngine.getExecutionResults({ executionId: 999 });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("accepts string executionId", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1, status: "pass" }];
      const result = await caller.testEngine.getExecutionResults({ executionId: "100" });
      expect(result.items).toHaveLength(1);
    });
  });

  // ===================================================================
  //  AI GENERATION LOGS
  // ===================================================================

  // ─── logAiGeneration ───────────────────────────────────────
  describe("logAiGeneration", () => {
    it("creates AI generation log entry", async () => {
      const caller = createAuthenticatedCaller({ id: 7 });
      mockReturningResult = [
        {
          id: 1,
          templateId: 5,
          source: "template_generation",
          modelUsed: "gpt-4",
          generatedBy: 7,
          promptInputConditions: { domain: "plc_test" },
        },
      ];
      const result = await caller.testEngine.logAiGeneration({
        templateId: 5,
        source: "template_generation",
        modelUsed: "gpt-4",
        promptInputConditions: { domain: "plc_test" },
      });
      expect(result.id).toBe(1);
      expect(result.source).toBe("template_generation");
      expect(result.generatedBy).toBe(7);
    });

    it("creates log with all optional fields", async () => {
      const caller = createAuthenticatedCaller({ id: 7 });
      mockReturningResult = [
        {
          id: 2,
          templateId: 5,
          source: "risk_analysis",
          modelUsed: "claude-3-opus",
          modelVersion: "2024-02-29",
          responseTokens: 1500,
          promptTokens: 800,
          totalTokens: 2300,
          generatedContent: { risks: ["R1", "R2"] },
          confidenceScore: "0.9200",
          userAccepted: true,
          userModifications: "Added one more risk item",
        },
      ];
      const result = await caller.testEngine.logAiGeneration({
        templateId: 5,
        source: "risk_analysis",
        promptInputConditions: { domain: "plc_test", riskLevel: "high" },
        modelUsed: "claude-3-opus",
        modelVersion: "2024-02-29",
        responseTokens: 1500,
        promptTokens: 800,
        totalTokens: 2300,
        generatedContent: { risks: ["R1", "R2"] },
        confidenceScore: "0.9200",
        userAccepted: true,
        userModifications: "Added one more risk item",
      });
      expect(result.modelVersion).toBe("2024-02-29");
      expect(result.totalTokens).toBe(2300);
      expect(result.userAccepted).toBe(true);
    });

    it("creates log without templateId", async () => {
      const caller = createAuthenticatedCaller({ id: 7 });
      mockReturningResult = [
        { id: 3, templateId: null, source: "test_suggestion", modelUsed: "gpt-4" },
      ];
      const result = await caller.testEngine.logAiGeneration({
        source: "test_suggestion",
        modelUsed: "gpt-4",
        promptInputConditions: {},
      });
      expect(result.templateId).toBeNull();
    });

    it("rejects invalid source enum", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.testEngine.logAiGeneration({
          source: "invalid_source" as any,
          modelUsed: "gpt-4",
          promptInputConditions: {},
        })
      ).rejects.toThrow();
    });
  });

  // ─── getAiLogs ─────────────────────────────────────────────
  describe("getAiLogs", () => {
    it("returns logs with no filters", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 1, source: "template_generation", modelUsed: "gpt-4" },
        { id: 2, source: "risk_analysis", modelUsed: "claude-3-opus" },
      ];
      const result = await caller.testEngine.getAiLogs({});
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("filters by templateId", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1, templateId: 5, source: "template_generation" }];
      const result = await caller.testEngine.getAiLogs({ templateId: 5 });
      expect(result.items).toHaveLength(1);
    });

    it("filters by source", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1, source: "case_optimization" }];
      const result = await caller.testEngine.getAiLogs({ source: "case_optimization" });
      expect(result.items).toHaveLength(1);
    });

    it("accepts custom limit", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.testEngine.getAiLogs({ limit: 10 });
      expect(result.items).toHaveLength(0);
    });

    it("accepts string templateId", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1, templateId: 5 }];
      const result = await caller.testEngine.getAiLogs({ templateId: "5" });
      expect(result.items).toHaveLength(1);
    });
  });

  // ===================================================================
  //  AUTH GUARDS
  // ===================================================================

  describe("authentication", () => {
    it("rejects anonymous for listTemplates", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.testEngine.listTemplates()).rejects.toThrow();
    });

    it("rejects anonymous for getTemplate", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.testEngine.getTemplate({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for createTemplate", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.createTemplate({ name: "T", domain: "custom" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for updateTemplate", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.updateTemplate({ id: 1, name: "X" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for cloneTemplate", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.cloneTemplate({ sourceTemplateId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for listCases", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.listCases({ templateId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for createCase", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.createCase({ templateId: 1, title: "C" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for updateCase", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.updateCase({ id: 1, title: "X" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for deleteCase", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.deleteCase({ id: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for listExecutions", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.testEngine.listExecutions()).rejects.toThrow();
    });

    it("rejects anonymous for createExecution", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.createExecution({
          templateId: 1,
          executionName: "E",
          environment: "dev",
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous for updateExecution", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.updateExecution({ id: 1, status: "paused" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for getExecution", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.getExecution({ id: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for recordResult", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.recordResult({
          executionId: 1,
          testCaseId: 1,
          status: "pass",
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous for updateResult", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.updateResult({ id: 1, status: "pass" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for getExecutionResults", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.getExecutionResults({ executionId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for logAiGeneration", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.logAiGeneration({
          source: "template_generation",
          modelUsed: "gpt-4",
          promptInputConditions: {},
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous for getAiLogs", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.testEngine.getAiLogs({})
      ).rejects.toThrow();
    });
  });
});
