/**
 * Governance Router — Unit Tests
 * 20 procedures across 4 groups: Dictionaries(6), Workflows(7), DataPolicies(4), AuditLogs(3)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminCaller, createAnonymousCaller } from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of ["from","where","orderBy","limit","offset","values","set","onConflictDoUpdate","onConflictDoNothing","groupBy","having","innerJoin","leftJoin","rightJoin","fullJoin"]) {
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
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

vi.mock("../../drizzle/governance-schema", () => ({
  SYS_WORKFLOW_NODE_TYPES: ["START", "APPROVAL", "CONDITION", "NOTIFICATION", "TASK", "END"] as const,
  SYS_AUDIT_ACTIONS: ["CREATE", "UPDATE", "DELETE", "READ", "LOGIN", "LOGOUT", "APPROVE", "REJECT", "IMPORT", "EXPORT", "ARCHIVE", "RESTORE"] as const,
  sysDictionaries: {
    id: "id", category: "category", code: "code", label: "label", labelZh: "labelZh",
    value: "value", sortOrder: "sortOrder", parentId: "parentId", isActive: "isActive",
    metadata: "metadata", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  sysWorkflowDefinitions: {
    id: "id", code: "code", name: "name", nameZh: "nameZh", description: "description",
    entityType: "entityType", triggerConditions: "triggerConditions", isActive: "isActive",
    version: "version", createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  sysWorkflowNodes: {
    id: "id", workflowDefinitionId: "workflowDefinitionId", nodeType: "nodeType",
    name: "name", config: "config", nextNodeIds: "nextNodeIds", sortOrder: "sortOrder",
  },
  sysDataPolicies: {
    id: "id", name: "name", description: "description", entityTable: "entityTable",
    conditionExpression: "conditionExpression", allowedRoles: "allowedRoles",
    allowedBus: "allowedBus", priority: "priority", isActive: "isActive",
    createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  sysAuditLogs: {
    id: "id", entityType: "entityType", entityId: "entityId", action: "action",
    actorId: "actorId", actorName: "actorName", previousData: "previousData",
    newData: "newData", ipAddress: "ipAddress", userAgent: "userAgent",
    sessionId: "sessionId", metadata: "metadata", createdAt: "createdAt",
  },
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Tests ───────────────────────────────────────────────
describe("governance router", () => {

  // ═══ Dictionaries ═══════════════════════════════════
  describe("listDictionaries", () => {
    it("returns paginated dictionaries", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 1, category: "status", code: "active", label: "Active" }]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller.governance.listDictionaries({});
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("filters by category", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller.governance.listDictionaries({ category: "type" });
      expect(result.items).toHaveLength(0);
    });

    it("works with no input", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller.governance.listDictionaries();
      expect(result.total).toBe(0);
    });
  });

  describe("getDictionary", () => {
    it("returns dictionary by id", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 1, code: "active" }]);
      const result = await caller.governance.getDictionary({ id: 1 });
      expect(result).not.toBeNull();
      expect(result!.code).toBe("active");
    });

    it("returns null when not found", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [];
      const result = await caller.governance.getDictionary({ id: 999 });
      expect(result).toBeNull();
    });

    it("accepts string id", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 5, code: "test" }]);
      const result = await caller.governance.getDictionary({ id: "5" });
      expect(result).not.toBeNull();
    });
  });

  describe("createDictionary", () => {
    it("creates a dictionary entry", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 1, category: "status", code: "draft", label: "Draft", labelZh: "草稿" }];
      const result = await caller.governance.createDictionary({
        category: "status", code: "draft", label: "Draft", labelZh: "草稿",
      });
      expect(result).toHaveProperty("id", 1);
    });

    it("rejects empty category", async () => {
      const caller = createAdminCaller();
      await expect(caller.governance.createDictionary({
        category: "", code: "x", label: "X", labelZh: "X",
      })).rejects.toThrow();
    });
  });

  describe("updateDictionary", () => {
    it("updates dictionary fields", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 1, label: "Updated" }];
      const result = await caller.governance.updateDictionary({ id: 1, label: "Updated" });
      expect(result.label).toBe("Updated");
    });

    it("throws when not found", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [];
      await expect(caller.governance.updateDictionary({ id: 999, label: "X" }))
        .rejects.toThrow("not found");
    });
  });

  describe("deleteDictionary", () => {
    it("soft-deletes a dictionary", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 1, isActive: false }];
      const result = await caller.governance.deleteDictionary({ id: 1 });
      expect(result.isActive).toBe(false);
    });

    it("throws when not found", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [];
      await expect(caller.governance.deleteDictionary({ id: 999 }))
        .rejects.toThrow("not found");
    });
  });

  describe("getDictionaryByCategory", () => {
    it("returns active items for a category", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [{ id: 1, code: "a" }, { id: 2, code: "b" }];
      const result = await caller.governance.getDictionaryByCategory({ category: "status" });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("rejects empty category", async () => {
      const caller = createAdminCaller();
      await expect(caller.governance.getDictionaryByCategory({ category: "" }))
        .rejects.toThrow();
    });
  });

  // ═══ Workflow Definitions ═══════════════════════════
  describe("listWorkflowDefinitions", () => {
    it("returns paginated workflow definitions", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 1, code: "WF-001", name: "Approval Flow" }]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller.governance.listWorkflowDefinitions({});
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("filters by entityType", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller.governance.listWorkflowDefinitions({ entityType: "expense" });
      expect(result.total).toBe(0);
    });
  });

  describe("getWorkflowDefinition", () => {
    it("returns definition with nodes", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 1, code: "WF-001", name: "Approval" }]);
      selectResultsQueue.push([
        { id: 10, workflowDefinitionId: 1, nodeType: "START", name: "Start" },
        { id: 11, workflowDefinitionId: 1, nodeType: "APPROVAL", name: "Manager" },
      ]);
      const result = await caller.governance.getWorkflowDefinition({ id: 1 });
      expect(result).not.toBeNull();
      expect(result!.nodes).toHaveLength(2);
      expect(result!.code).toBe("WF-001");
    });

    it("returns null when definition not found", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]);
      const result = await caller.governance.getWorkflowDefinition({ id: 999 });
      expect(result).toBeNull();
    });
  });

  describe("createWorkflowDefinition", () => {
    it("creates a workflow definition", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 1, code: "WF-NEW", name: "New Flow", createdBy: 1 }];
      const result = await caller.governance.createWorkflowDefinition({
        code: "WF-NEW", name: "New Flow", nameZh: "新流程",
      });
      expect(result).toHaveProperty("id", 1);
      expect(result.createdBy).toBe(1);
    });

    it("rejects empty code", async () => {
      const caller = createAdminCaller();
      await expect(caller.governance.createWorkflowDefinition({
        code: "", name: "X", nameZh: "X",
      })).rejects.toThrow();
    });
  });

  describe("updateWorkflowDefinition", () => {
    it("updates workflow fields", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 1, name: "Updated" }];
      const result = await caller.governance.updateWorkflowDefinition({ id: 1, name: "Updated" });
      expect(result.name).toBe("Updated");
    });

    it("throws when not found", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [];
      await expect(caller.governance.updateWorkflowDefinition({ id: 999, name: "X" }))
        .rejects.toThrow("not found");
    });
  });

  describe("addWorkflowNode", () => {
    it("adds a node to existing definition", async () => {
      const caller = createAdminCaller();
      // First query: verify definition exists
      selectResultsQueue.push([{ id: 1, code: "WF-001" }]);
      mockReturningResult = [{ id: 10, workflowDefinitionId: 1, nodeType: "APPROVAL", name: "Manager Approval" }];
      const result = await caller.governance.addWorkflowNode({
        workflowDefinitionId: 1, nodeType: "APPROVAL", name: "Manager Approval",
      });
      expect(result).toHaveProperty("id", 10);
    });

    it("throws when definition not found", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]);
      await expect(caller.governance.addWorkflowNode({
        workflowDefinitionId: 999, nodeType: "START", name: "Start",
      })).rejects.toThrow("not found");
    });

    it("rejects invalid node type", async () => {
      const caller = createAdminCaller();
      await expect(caller.governance.addWorkflowNode({
        workflowDefinitionId: 1, nodeType: "INVALID" as any, name: "Bad",
      })).rejects.toThrow();
    });
  });

  describe("updateWorkflowNode", () => {
    it("updates node fields", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 10, name: "Updated Node" }];
      const result = await caller.governance.updateWorkflowNode({ id: 10, name: "Updated Node" });
      expect(result.name).toBe("Updated Node");
    });

    it("throws when no fields to update", async () => {
      const caller = createAdminCaller();
      await expect(caller.governance.updateWorkflowNode({ id: 10 }))
        .rejects.toThrow("No fields to update");
    });

    it("throws when not found", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [];
      await expect(caller.governance.updateWorkflowNode({ id: 999, name: "X" }))
        .rejects.toThrow("not found");
    });
  });

  describe("deleteWorkflowNode", () => {
    it("deletes a workflow node", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 10 }];
      const result = await caller.governance.deleteWorkflowNode({ id: 10 });
      expect(result.deleted).toBe(true);
      expect(result.id).toBe(10);
    });

    it("throws when not found", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [];
      await expect(caller.governance.deleteWorkflowNode({ id: 999 }))
        .rejects.toThrow("not found");
    });
  });

  // ═══ Data Policies ═════════════════════════════════
  describe("listDataPolicies", () => {
    it("returns paginated data policies", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 1, name: "BU Isolation", entityTable: "projects" }]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller.governance.listDataPolicies({});
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("filters by entityTable", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller.governance.listDataPolicies({ entityTable: "employees" });
      expect(result.total).toBe(0);
    });
  });

  describe("createDataPolicy", () => {
    it("creates a data policy", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 1, name: "BU Filter", entityTable: "projects", createdBy: 1 }];
      const result = await caller.governance.createDataPolicy({
        name: "BU Filter", entityTable: "projects", conditionExpression: "bu_id = :bu_id",
      });
      expect(result).toHaveProperty("id", 1);
      expect(result.createdBy).toBe(1);
    });

    it("rejects empty name", async () => {
      const caller = createAdminCaller();
      await expect(caller.governance.createDataPolicy({
        name: "", entityTable: "x", conditionExpression: "1=1",
      })).rejects.toThrow();
    });
  });

  describe("updateDataPolicy", () => {
    it("updates policy fields", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 1, name: "Updated Policy" }];
      const result = await caller.governance.updateDataPolicy({ id: 1, name: "Updated Policy" });
      expect(result.name).toBe("Updated Policy");
    });

    it("throws when not found", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [];
      await expect(caller.governance.updateDataPolicy({ id: 999, name: "X" }))
        .rejects.toThrow("not found");
    });
  });

  describe("deleteDataPolicy", () => {
    it("soft-deletes a data policy", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 1, isActive: false }];
      const result = await caller.governance.deleteDataPolicy({ id: 1 });
      expect(result.isActive).toBe(false);
    });

    it("throws when not found", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [];
      await expect(caller.governance.deleteDataPolicy({ id: 999 }))
        .rejects.toThrow("not found");
    });
  });

  // ═══ Audit Logs ════════════════════════════════════
  describe("listAuditLogs", () => {
    it("returns paginated audit logs", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([
        { id: 1, entityType: "project", action: "CREATE", actorId: 1 },
        { id: 2, entityType: "project", action: "UPDATE", actorId: 1 },
      ]);
      selectResultsQueue.push([{ value: 2 }]);
      const result = await caller.governance.listAuditLogs({});
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("filters by entityType and action", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller.governance.listAuditLogs({
        entityType: "employee", action: "DELETE",
      });
      expect(result.total).toBe(0);
    });
  });

  describe("createAuditLog", () => {
    it("creates an audit log entry", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 1, entityType: "project", action: "CREATE", actorId: 1 }];
      const result = await caller.governance.createAuditLog({
        entityType: "project", action: "CREATE",
        newData: { name: "Test Project" },
      });
      expect(result).toHaveProperty("id", 1);
      expect(result.actorId).toBe(1);
    });

    it("rejects invalid action", async () => {
      const caller = createAdminCaller();
      await expect(caller.governance.createAuditLog({
        entityType: "project", action: "INVALID" as any,
      })).rejects.toThrow();
    });

    it("rejects empty entityType", async () => {
      const caller = createAdminCaller();
      await expect(caller.governance.createAuditLog({
        entityType: "", action: "CREATE",
      })).rejects.toThrow();
    });
  });

  describe("getAuditLogStats", () => {
    it("returns aggregated stats by action", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [
        { action: "CREATE", count: 5 },
        { action: "UPDATE", count: 10 },
        { action: "DELETE", count: 2 },
      ];
      const result = await caller.governance.getAuditLogStats({
        startDate: "2026-01-01", endDate: "2026-02-28",
      });
      expect(result.byAction.CREATE).toBe(5);
      expect(result.byAction.UPDATE).toBe(10);
      expect(result.totalCount).toBe(17);
      expect(result.startDate).toBe("2026-01-01");
    });

    it("returns zero when no logs in range", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [];
      const result = await caller.governance.getAuditLogStats({
        startDate: "2099-01-01", endDate: "2099-12-31",
      });
      expect(result.totalCount).toBe(0);
      expect(Object.keys(result.byAction)).toHaveLength(0);
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════
  describe("authentication", () => {
    it("rejects anonymous for listDictionaries", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.governance.listDictionaries()).rejects.toThrow();
    });

    it("rejects anonymous for createDictionary", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.governance.createDictionary({
        category: "x", code: "x", label: "x", labelZh: "x",
      })).rejects.toThrow();
    });

    it("rejects anonymous for createAuditLog", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.governance.createAuditLog({
        entityType: "test", action: "CREATE",
      })).rejects.toThrow();
    });

    it("rejects anonymous for createDataPolicy", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.governance.createDataPolicy({
        name: "x", entityTable: "x", conditionExpression: "1=1",
      })).rejects.toThrow();
    });
  });
});
