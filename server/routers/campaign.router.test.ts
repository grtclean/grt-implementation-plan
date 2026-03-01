/**
 * Campaign Router — Unit Tests
 * 17 procedures across 4 groups:
 *   Campaigns          (5): listCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign
 *   Payloads           (5): listPayloads, addPayload, updatePayload, deletePayload, reorderPayloads
 *   Campaign Lifecycle (4): simulateCampaign, approveCampaign, executeCampaign, rollbackCampaign
 *   Inventory Freeze   (3): listFreezeLogs, freezeInventory, unfreezeInventory
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

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

// ── Mock campaign schema ────────────────────────────────
vi.mock("../../drizzle/campaign-schema", () => ({
  globalCampaigns: {
    id: "id",
    code: "code",
    name: "name",
    description: "description",
    campaignType: "campaignType",
    status: "status",
    simulationResult: "simulationResult",
    approvedBy: "approvedBy",
    approvedAt: "approvedAt",
    executedBy: "executedBy",
    executedAt: "executedAt",
    completedAt: "completedAt",
    rollbackReason: "rollbackReason",
    affectedEntityCount: "affectedEntityCount",
    metadata: "metadata",
    createdBy: "createdBy",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  campaignPayloads: {
    id: "id",
    campaignId: "campaignId",
    entityType: "entityType",
    entityId: "entityId",
    operation: "operation",
    payloadBefore: "payloadBefore",
    payloadAfter: "payloadAfter",
    executionOrder: "executionOrder",
    status: "status",
    errorMessage: "errorMessage",
    executedAt: "executedAt",
    createdAt: "createdAt",
  },
  inventoryFreezeLogs: {
    id: "id",
    campaignId: "campaignId",
    warehouseId: "warehouseId",
    freezeType: "freezeType",
    freezeScope: "freezeScope",
    frozenBy: "frozenBy",
    frozenAt: "frozenAt",
    unfrozenAt: "unfrozenAt",
    reason: "reason",
    createdAt: "createdAt",
  },
}));

// ── Mock strategic-rollover service ─────────────────────
const mockSimulateOrgShift = vi.fn();
const mockExecuteCampaign = vi.fn();
const mockRollbackCampaign = vi.fn();
const mockFreezeInventory = vi.fn();
const mockUnfreezeInventory = vi.fn();

vi.mock("../services/strategic-rollover.service", () => ({
  simulateOrgShift: (...args: any[]) => mockSimulateOrgShift(...args),
  executeCampaign: (...args: any[]) => mockExecuteCampaign(...args),
  rollbackCampaign: (...args: any[]) => mockRollbackCampaign(...args),
  freezeInventory: (...args: any[]) => mockFreezeInventory(...args),
  unfreezeInventory: (...args: any[]) => mockUnfreezeInventory(...args),
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Tests ───────────────────────────────────────────────
describe("campaign router", () => {
  // ═══════════════════════════════════════════════════════
  // Global Campaigns
  // ═══════════════════════════════════════════════════════

  describe("listCampaigns", () => {
    it("returns paginated campaigns with total count", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        { id: 1, code: "ROLL-2026-Q1", name: "Q1 Rollover", status: "DRAFT" },
        { id: 2, code: "ROLL-2026-Q2", name: "Q2 Rollover", status: "SIMULATED" },
      ]);
      selectResultsQueue.push([{ value: 2 }]);
      const result = await caller.campaign.listCampaigns({});
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns empty list when no campaigns exist", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller.campaign.listCampaigns({});
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("filters by campaignType", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        { id: 1, code: "INV-001", campaignType: "INVENTORY_ROLLOVER" },
      ]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller.campaign.listCampaigns({
        campaignType: "INVENTORY_ROLLOVER",
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("filters by status", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller.campaign.listCampaigns({
        status: "COMPLETED",
      });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("filters by both campaignType and status", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        { id: 1, campaignType: "PRICE_UPDATE", status: "DRAFT" },
      ]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller.campaign.listCampaigns({
        campaignType: "PRICE_UPDATE",
        status: "DRAFT",
      });
      expect(result.items).toHaveLength(1);
    });

    it("applies pagination with limit and offset", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 3, code: "CAM-003" }]);
      selectResultsQueue.push([{ value: 10 }]);
      const result = await caller.campaign.listCampaigns({
        limit: 1,
        offset: 2,
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(10);
    });

    it("works with no input (defaults)", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller.campaign.listCampaigns();
      expect(result.total).toBe(0);
    });

    it("rejects invalid campaignType", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.campaign.listCampaigns({
          campaignType: "NONEXISTENT" as any,
        })
      ).rejects.toThrow();
    });

    it("rejects invalid status", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.campaign.listCampaigns({ status: "BOGUS" as any })
      ).rejects.toThrow();
    });
  });

  describe("getCampaign", () => {
    it("returns campaign with payload count", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        {
          id: 1,
          code: "ROLL-001",
          name: "Rollover",
          status: "DRAFT",
          campaignType: "ORG_RESTRUCTURE",
        },
      ]);
      selectResultsQueue.push([{ value: 5 }]);
      const result = await caller.campaign.getCampaign({ id: 1 });
      expect(result).not.toBeNull();
      expect(result!.code).toBe("ROLL-001");
      expect(result!.payloadCount).toBe(5);
    });

    it("returns null when campaign not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.campaign.getCampaign({ id: 999 });
      expect(result).toBeNull();
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 5, code: "STR-005", status: "DRAFT" }]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller.campaign.getCampaign({ id: "5" });
      expect(result).not.toBeNull();
      expect(result!.id).toBe(5);
    });
  });

  describe("createCampaign", () => {
    it("creates a campaign in DRAFT status", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [
        {
          id: 1,
          code: "NEW-001",
          name: "New Campaign",
          status: "DRAFT",
          campaignType: "ORG_RESTRUCTURE",
          createdBy: 1,
        },
      ];
      const result = await caller.campaign.createCampaign({
        code: "NEW-001",
        name: "New Campaign",
        campaignType: "ORG_RESTRUCTURE",
      });
      expect(result).toHaveProperty("id", 1);
      expect(result.status).toBe("DRAFT");
      expect(result.createdBy).toBe(1);
    });

    it("creates a campaign with optional fields", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [
        {
          id: 2,
          code: "PRICE-001",
          name: "Price Update",
          description: "Annual price update",
          campaignType: "PRICE_UPDATE",
          metadata: { region: "APAC" },
        },
      ];
      const result = await caller.campaign.createCampaign({
        code: "PRICE-001",
        name: "Price Update",
        description: "Annual price update",
        campaignType: "PRICE_UPDATE",
        metadata: { region: "APAC" },
      });
      expect(result.description).toBe("Annual price update");
      expect(result.metadata).toEqual({ region: "APAC" });
    });

    it("rejects empty code", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.campaign.createCampaign({
          code: "",
          name: "Test",
          campaignType: "DATA_CLEANUP",
        })
      ).rejects.toThrow();
    });

    it("rejects empty name", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.campaign.createCampaign({
          code: "TEST-001",
          name: "",
          campaignType: "DATA_CLEANUP",
        })
      ).rejects.toThrow();
    });

    it("rejects invalid campaignType", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.campaign.createCampaign({
          code: "TEST-001",
          name: "Test",
          campaignType: "INVALID_TYPE" as any,
        })
      ).rejects.toThrow();
    });
  });

  describe("updateCampaign", () => {
    it("updates a DRAFT campaign", async () => {
      const caller = createAuthenticatedCaller();
      // First select: verify existing campaign is DRAFT
      selectResultsQueue.push([{ id: 1, status: "DRAFT" }]);
      mockReturningResult = [
        { id: 1, name: "Updated Name", status: "DRAFT" },
      ];
      const result = await caller.campaign.updateCampaign({
        id: 1,
        name: "Updated Name",
      });
      expect(result.name).toBe("Updated Name");
    });

    it("throws when campaign not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(
        caller.campaign.updateCampaign({ id: 999, name: "X" })
      ).rejects.toThrow("not found");
    });

    it("throws when campaign is not DRAFT", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, status: "APPROVED" }]);
      await expect(
        caller.campaign.updateCampaign({ id: 1, name: "X" })
      ).rejects.toThrow("only DRAFT campaigns can be updated");
    });

    it("throws when campaign is COMPLETED", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, status: "COMPLETED" }]);
      await expect(
        caller.campaign.updateCampaign({ id: 1, name: "X" })
      ).rejects.toThrow("COMPLETED");
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 3, status: "DRAFT" }]);
      mockReturningResult = [{ id: 3, code: "UPD-003" }];
      const result = await caller.campaign.updateCampaign({
        id: "3",
        code: "UPD-003",
      });
      expect(result.code).toBe("UPD-003");
    });
  });

  describe("deleteCampaign", () => {
    it("deletes a DRAFT campaign and its payloads", async () => {
      const caller = createAuthenticatedCaller();
      // First select: verify existing campaign is DRAFT
      selectResultsQueue.push([{ id: 1, status: "DRAFT" }]);
      mockReturningResult = [{ id: 1 }];
      const result = await caller.campaign.deleteCampaign({ id: 1 });
      expect(result.deleted).toBe(true);
      expect(result.id).toBe(1);
    });

    it("throws when campaign not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(
        caller.campaign.deleteCampaign({ id: 999 })
      ).rejects.toThrow("not found");
    });

    it("throws when campaign is not DRAFT", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, status: "EXECUTING" }]);
      await expect(
        caller.campaign.deleteCampaign({ id: 1 })
      ).rejects.toThrow("only DRAFT campaigns can be deleted");
    });

    it("throws when campaign is ROLLED_BACK", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, status: "ROLLED_BACK" }]);
      await expect(
        caller.campaign.deleteCampaign({ id: 1 })
      ).rejects.toThrow("ROLLED_BACK");
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 7, status: "DRAFT" }]);
      mockReturningResult = [{ id: 7 }];
      const result = await caller.campaign.deleteCampaign({ id: "7" });
      expect(result.deleted).toBe(true);
      expect(result.id).toBe(7);
    });
  });

  // ═══════════════════════════════════════════════════════
  // Campaign Payloads
  // ═══════════════════════════════════════════════════════

  describe("listPayloads", () => {
    it("returns payloads for a campaign", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 1, campaignId: 1, entityType: "users", operation: "UPDATE", executionOrder: 0 },
        { id: 2, campaignId: 1, entityType: "projects", operation: "CREATE", executionOrder: 1 },
      ];
      const result = await caller.campaign.listPayloads({ campaignId: 1 });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns empty list when no payloads", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.campaign.listPayloads({ campaignId: 99 });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("accepts string campaignId", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 10, campaignId: 5 }];
      const result = await caller.campaign.listPayloads({ campaignId: "5" });
      expect(result.items).toHaveLength(1);
    });
  });

  describe("addPayload", () => {
    it("adds a payload to a DRAFT campaign", async () => {
      const caller = createAuthenticatedCaller();
      // First select: verify campaign exists and is DRAFT
      selectResultsQueue.push([{ id: 1, status: "DRAFT" }]);
      mockReturningResult = [
        {
          id: 10,
          campaignId: 1,
          entityType: "users",
          operation: "UPDATE",
          executionOrder: 0,
        },
      ];
      const result = await caller.campaign.addPayload({
        campaignId: 1,
        entityType: "users",
        operation: "UPDATE",
        payloadBefore: { name: "Old" },
        payloadAfter: { name: "New" },
      });
      expect(result).toHaveProperty("id", 10);
      expect(result.entityType).toBe("users");
    });

    it("adds a payload with entityId and executionOrder", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, status: "DRAFT" }]);
      mockReturningResult = [
        {
          id: 11,
          campaignId: 1,
          entityType: "products",
          entityId: 42,
          operation: "DELETE",
          executionOrder: 5,
        },
      ];
      const result = await caller.campaign.addPayload({
        campaignId: 1,
        entityType: "products",
        entityId: 42,
        operation: "DELETE",
        executionOrder: 5,
      });
      expect(result.entityId).toBe(42);
      expect(result.executionOrder).toBe(5);
    });

    it("throws when campaign not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(
        caller.campaign.addPayload({
          campaignId: 999,
          entityType: "users",
          operation: "CREATE",
        })
      ).rejects.toThrow("not found");
    });

    it("throws when campaign is not DRAFT", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, status: "COMPLETED" }]);
      await expect(
        caller.campaign.addPayload({
          campaignId: 1,
          entityType: "users",
          operation: "CREATE",
        })
      ).rejects.toThrow("payloads can only be added to DRAFT campaigns");
    });

    it("rejects invalid operation", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.campaign.addPayload({
          campaignId: 1,
          entityType: "users",
          operation: "INVALID" as any,
        })
      ).rejects.toThrow();
    });

    it("rejects empty entityType", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.campaign.addPayload({
          campaignId: 1,
          entityType: "",
          operation: "CREATE",
        })
      ).rejects.toThrow();
    });
  });

  describe("updatePayload", () => {
    it("updates payload fields when campaign is DRAFT", async () => {
      const caller = createAuthenticatedCaller();
      // First select: fetch existing payload
      selectResultsQueue.push([{ id: 10, campaignId: 1 }]);
      // Second select: verify parent campaign is DRAFT
      selectResultsQueue.push([{ id: 1, status: "DRAFT" }]);
      mockReturningResult = [
        { id: 10, entityType: "users", operation: "ARCHIVE", executionOrder: 3 },
      ];
      const result = await caller.campaign.updatePayload({
        id: 10,
        operation: "ARCHIVE",
        executionOrder: 3,
      });
      expect(result.operation).toBe("ARCHIVE");
      expect(result.executionOrder).toBe(3);
    });

    it("throws when payload not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(
        caller.campaign.updatePayload({ id: 999, entityType: "users" })
      ).rejects.toThrow("not found");
    });

    it("throws when parent campaign is not DRAFT", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 10, campaignId: 1 }]);
      selectResultsQueue.push([{ id: 1, status: "APPROVED" }]);
      await expect(
        caller.campaign.updatePayload({ id: 10, entityType: "users" })
      ).rejects.toThrow(
        "payloads can only be updated when campaign is DRAFT"
      );
    });

    it("throws when no fields to update", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 10, campaignId: 1 }]);
      selectResultsQueue.push([{ id: 1, status: "DRAFT" }]);
      await expect(
        caller.campaign.updatePayload({ id: 10 })
      ).rejects.toThrow("No fields to update");
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 10, campaignId: 1 }]);
      selectResultsQueue.push([{ id: 1, status: "DRAFT" }]);
      mockReturningResult = [{ id: 10, entityType: "warehouses" }];
      const result = await caller.campaign.updatePayload({
        id: "10",
        entityType: "warehouses",
      });
      expect(result.entityType).toBe("warehouses");
    });
  });

  describe("deletePayload", () => {
    it("deletes a payload when campaign is DRAFT", async () => {
      const caller = createAuthenticatedCaller();
      // First select: fetch existing payload
      selectResultsQueue.push([{ id: 10, campaignId: 1 }]);
      // Second select: verify parent campaign is DRAFT
      selectResultsQueue.push([{ id: 1, status: "DRAFT" }]);
      mockReturningResult = [{ id: 10 }];
      const result = await caller.campaign.deletePayload({ id: 10 });
      expect(result.deleted).toBe(true);
      expect(result.id).toBe(10);
    });

    it("throws when payload not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(
        caller.campaign.deletePayload({ id: 999 })
      ).rejects.toThrow("not found");
    });

    it("throws when parent campaign is not DRAFT", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 10, campaignId: 1 }]);
      selectResultsQueue.push([{ id: 1, status: "SIMULATED" }]);
      await expect(
        caller.campaign.deletePayload({ id: 10 })
      ).rejects.toThrow(
        "payloads can only be deleted when campaign is DRAFT"
      );
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 5, campaignId: 2 }]);
      selectResultsQueue.push([{ id: 2, status: "DRAFT" }]);
      mockReturningResult = [{ id: 5 }];
      const result = await caller.campaign.deletePayload({ id: "5" });
      expect(result.deleted).toBe(true);
    });
  });

  describe("reorderPayloads", () => {
    it("reorders payloads for a DRAFT campaign", async () => {
      const caller = createAuthenticatedCaller();
      // First select: verify campaign is DRAFT
      selectResultsQueue.push([{ id: 1, status: "DRAFT" }]);
      const result = await caller.campaign.reorderPayloads({
        campaignId: 1,
        items: [
          { id: 10, executionOrder: 2 },
          { id: 11, executionOrder: 0 },
          { id: 12, executionOrder: 1 },
        ],
      });
      expect(result.updatedCount).toBe(3);
    });

    it("returns zero for empty items array", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, status: "DRAFT" }]);
      const result = await caller.campaign.reorderPayloads({
        campaignId: 1,
        items: [],
      });
      expect(result.updatedCount).toBe(0);
    });

    it("throws when campaign not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(
        caller.campaign.reorderPayloads({
          campaignId: 999,
          items: [{ id: 1, executionOrder: 0 }],
        })
      ).rejects.toThrow("not found");
    });

    it("throws when campaign is not DRAFT", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, status: "EXECUTING" }]);
      await expect(
        caller.campaign.reorderPayloads({
          campaignId: 1,
          items: [{ id: 1, executionOrder: 0 }],
        })
      ).rejects.toThrow(
        "payloads can only be reordered when campaign is DRAFT"
      );
    });

    it("accepts string campaignId and item ids", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 2, status: "DRAFT" }]);
      const result = await caller.campaign.reorderPayloads({
        campaignId: "2",
        items: [{ id: "10", executionOrder: 0 }],
      });
      expect(result.updatedCount).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════
  // Campaign Lifecycle
  // ═══════════════════════════════════════════════════════

  describe("simulateCampaign", () => {
    it("calls simulateOrgShift service and returns result", async () => {
      const caller = createAuthenticatedCaller();
      const simResult = {
        campaignId: 1,
        warnings: [],
        riskScore: 0,
        affectedEntities: { users: 5 },
        payloadCount: 5,
        simulatedAt: "2026-03-01T00:00:00.000Z",
      };
      mockSimulateOrgShift.mockResolvedValue(simResult);
      const result = await caller.campaign.simulateCampaign({ campaignId: 1 });
      expect(result).toEqual(simResult);
      expect(mockSimulateOrgShift).toHaveBeenCalledWith(1);
    });

    it("converts string campaignId to number", async () => {
      const caller = createAuthenticatedCaller();
      mockSimulateOrgShift.mockResolvedValue({ campaignId: 5 });
      await caller.campaign.simulateCampaign({ campaignId: "5" });
      expect(mockSimulateOrgShift).toHaveBeenCalledWith(5);
    });

    it("propagates service errors", async () => {
      const caller = createAuthenticatedCaller();
      mockSimulateOrgShift.mockRejectedValue(
        new Error("Campaign #1 not found")
      );
      await expect(
        caller.campaign.simulateCampaign({ campaignId: 1 })
      ).rejects.toThrow("Campaign #1 not found");
    });
  });

  describe("approveCampaign", () => {
    it("approves a SIMULATED campaign", async () => {
      const caller = createAuthenticatedCaller();
      // First select: verify existing campaign is SIMULATED
      selectResultsQueue.push([{ id: 1, status: "SIMULATED" }]);
      mockReturningResult = [
        {
          id: 1,
          status: "APPROVED",
          approvedBy: 1,
          approvedAt: "2026-03-01T00:00:00.000Z",
        },
      ];
      const result = await caller.campaign.approveCampaign({ campaignId: 1 });
      expect(result.status).toBe("APPROVED");
      expect(result.approvedBy).toBe(1);
    });

    it("throws when campaign not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(
        caller.campaign.approveCampaign({ campaignId: 999 })
      ).rejects.toThrow("not found");
    });

    it("throws when campaign is DRAFT (not SIMULATED)", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, status: "DRAFT" }]);
      await expect(
        caller.campaign.approveCampaign({ campaignId: 1 })
      ).rejects.toThrow("only SIMULATED campaigns can be approved");
    });

    it("throws when campaign is already APPROVED", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, status: "APPROVED" }]);
      await expect(
        caller.campaign.approveCampaign({ campaignId: 1 })
      ).rejects.toThrow("APPROVED");
    });

    it("accepts string campaignId", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 3, status: "SIMULATED" }]);
      mockReturningResult = [{ id: 3, status: "APPROVED" }];
      const result = await caller.campaign.approveCampaign({
        campaignId: "3",
      });
      expect(result.status).toBe("APPROVED");
    });
  });

  describe("executeCampaign", () => {
    it("calls executeCampaign service with correct args", async () => {
      const caller = createAuthenticatedCaller();
      const execResult = {
        campaignId: 1,
        status: "COMPLETED",
        appliedCount: 10,
        executedAt: "2026-03-01T00:00:00.000Z",
      };
      mockExecuteCampaign.mockResolvedValue(execResult);
      const result = await caller.campaign.executeCampaign({ campaignId: 1 });
      expect(result).toEqual(execResult);
      // user id from createAuthenticatedCaller is 1
      expect(mockExecuteCampaign).toHaveBeenCalledWith(1, 1);
    });

    it("converts string campaignId to number", async () => {
      const caller = createAuthenticatedCaller();
      mockExecuteCampaign.mockResolvedValue({ campaignId: 7, status: "COMPLETED" });
      await caller.campaign.executeCampaign({ campaignId: "7" });
      expect(mockExecuteCampaign).toHaveBeenCalledWith(7, 1);
    });

    it("propagates service errors", async () => {
      const caller = createAuthenticatedCaller();
      mockExecuteCampaign.mockRejectedValue(
        new Error("Campaign #1 is DRAFT; expected one of [APPROVED]")
      );
      await expect(
        caller.campaign.executeCampaign({ campaignId: 1 })
      ).rejects.toThrow("expected one of [APPROVED]");
    });

    it("passes different user id from context", async () => {
      const caller = createAuthenticatedCaller({ id: 42 });
      mockExecuteCampaign.mockResolvedValue({ campaignId: 1, status: "COMPLETED" });
      await caller.campaign.executeCampaign({ campaignId: 1 });
      expect(mockExecuteCampaign).toHaveBeenCalledWith(1, 42);
    });
  });

  describe("rollbackCampaign", () => {
    it("calls rollbackCampaign service and returns structured result", async () => {
      const caller = createAuthenticatedCaller();
      mockRollbackCampaign.mockResolvedValue(undefined);
      const result = await caller.campaign.rollbackCampaign({
        campaignId: 1,
        reason: "Data integrity issue found",
        actorId: 5,
      });
      expect(result.campaignId).toBe(1);
      expect(result.status).toBe("ROLLED_BACK");
      expect(result.reason).toBe("Data integrity issue found");
      expect(mockRollbackCampaign).toHaveBeenCalledWith(
        1,
        "Data integrity issue found",
        5
      );
    });

    it("converts string campaignId to number", async () => {
      const caller = createAuthenticatedCaller();
      mockRollbackCampaign.mockResolvedValue(undefined);
      const result = await caller.campaign.rollbackCampaign({
        campaignId: "3",
        reason: "Test rollback",
        actorId: 1,
      });
      expect(result.campaignId).toBe(3);
      expect(mockRollbackCampaign).toHaveBeenCalledWith(3, "Test rollback", 1);
    });

    it("propagates service errors", async () => {
      const caller = createAuthenticatedCaller();
      mockRollbackCampaign.mockRejectedValue(
        new Error("Campaign #1 is DRAFT; expected one of [COMPLETED]")
      );
      await expect(
        caller.campaign.rollbackCampaign({
          campaignId: 1,
          reason: "Reason",
          actorId: 1,
        })
      ).rejects.toThrow("expected one of [COMPLETED]");
    });

    it("rejects empty reason", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.campaign.rollbackCampaign({
          campaignId: 1,
          reason: "",
          actorId: 1,
        })
      ).rejects.toThrow();
    });

    it("rejects reason exceeding 1000 chars", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.campaign.rollbackCampaign({
          campaignId: 1,
          reason: "x".repeat(1001),
          actorId: 1,
        })
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════
  // Inventory Freeze Logs
  // ═══════════════════════════════════════════════════════

  describe("listFreezeLogs", () => {
    it("returns freeze logs for a campaign", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        {
          id: 1,
          campaignId: 1,
          warehouseId: 10,
          freezeType: "FULL",
          frozenAt: "2026-03-01T00:00:00.000Z",
        },
        {
          id: 2,
          campaignId: 1,
          warehouseId: 20,
          freezeType: "PARTIAL",
          frozenAt: "2026-03-01T01:00:00.000Z",
        },
      ];
      const result = await caller.campaign.listFreezeLogs({ campaignId: 1 });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns empty list when no freeze logs", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.campaign.listFreezeLogs({ campaignId: 99 });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("accepts string campaignId", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1, campaignId: 5 }];
      const result = await caller.campaign.listFreezeLogs({
        campaignId: "5",
      });
      expect(result.items).toHaveLength(1);
    });
  });

  describe("freezeInventory", () => {
    it("calls freezeInventory service and returns result", async () => {
      const caller = createAuthenticatedCaller();
      mockFreezeInventory.mockResolvedValue(42);
      const result = await caller.campaign.freezeInventory({
        campaignId: 1,
        warehouseId: 10,
        freezeType: "FULL",
        frozenBy: 5,
      });
      expect(result.freezeLogId).toBe(42);
      expect(result.campaignId).toBe(1);
      expect(mockFreezeInventory).toHaveBeenCalledWith(1, 10, "FULL", {}, 5);
    });

    it("passes freezeScope to service", async () => {
      const caller = createAuthenticatedCaller();
      mockFreezeInventory.mockResolvedValue(43);
      const scope = {
        skus: ["SKU-001", "SKU-002"],
        categories: ["electronics"],
        zones: ["A1"],
      };
      const result = await caller.campaign.freezeInventory({
        campaignId: 2,
        warehouseId: 15,
        freezeType: "PARTIAL",
        freezeScope: scope,
        frozenBy: 3,
        reason: "Inventory audit",
      });
      expect(result.freezeLogId).toBe(43);
      expect(mockFreezeInventory).toHaveBeenCalledWith(
        2,
        15,
        "PARTIAL",
        scope,
        3
      );
    });

    it("converts string campaignId to number", async () => {
      const caller = createAuthenticatedCaller();
      mockFreezeInventory.mockResolvedValue(44);
      const result = await caller.campaign.freezeInventory({
        campaignId: "7",
        warehouseId: 1,
        freezeType: "CATEGORY",
        frozenBy: 1,
      });
      expect(result.campaignId).toBe(7);
    });

    it("rejects invalid freezeType", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.campaign.freezeInventory({
          campaignId: 1,
          warehouseId: 1,
          freezeType: "INVALID" as any,
          frozenBy: 1,
        })
      ).rejects.toThrow();
    });

    it("propagates service errors", async () => {
      const caller = createAuthenticatedCaller();
      mockFreezeInventory.mockRejectedValue(
        new Error("Campaign #999 not found")
      );
      await expect(
        caller.campaign.freezeInventory({
          campaignId: 999,
          warehouseId: 1,
          freezeType: "FULL",
          frozenBy: 1,
        })
      ).rejects.toThrow("Campaign #999 not found");
    });
  });

  describe("unfreezeInventory", () => {
    it("calls unfreezeInventory service and returns result", async () => {
      const caller = createAuthenticatedCaller();
      mockUnfreezeInventory.mockResolvedValue(undefined);
      const result = await caller.campaign.unfreezeInventory({
        freezeLogId: 42,
      });
      expect(result.freezeLogId).toBe(42);
      expect(result.unfrozen).toBe(true);
      expect(mockUnfreezeInventory).toHaveBeenCalledWith(42);
    });

    it("converts string freezeLogId to number", async () => {
      const caller = createAuthenticatedCaller();
      mockUnfreezeInventory.mockResolvedValue(undefined);
      const result = await caller.campaign.unfreezeInventory({
        freezeLogId: "7",
      });
      expect(result.freezeLogId).toBe(7);
      expect(mockUnfreezeInventory).toHaveBeenCalledWith(7);
    });

    it("propagates service errors (not found)", async () => {
      const caller = createAuthenticatedCaller();
      mockUnfreezeInventory.mockRejectedValue(
        new Error("Inventory freeze log #999 not found")
      );
      await expect(
        caller.campaign.unfreezeInventory({ freezeLogId: 999 })
      ).rejects.toThrow("not found");
    });

    it("propagates service errors (already unfrozen)", async () => {
      const caller = createAuthenticatedCaller();
      mockUnfreezeInventory.mockRejectedValue(
        new Error("Inventory freeze log #42 is already unfrozen")
      );
      await expect(
        caller.campaign.unfreezeInventory({ freezeLogId: 42 })
      ).rejects.toThrow("already unfrozen");
    });
  });

  // ═══════════════════════════════════════════════════════
  // Auth Guards
  // ═══════════════════════════════════════════════════════

  describe("authentication", () => {
    it("rejects anonymous for listCampaigns", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.campaign.listCampaigns()).rejects.toThrow();
    });

    it("rejects anonymous for getCampaign", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.campaign.getCampaign({ id: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for createCampaign", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.campaign.createCampaign({
          code: "TEST",
          name: "Test",
          campaignType: "DATA_CLEANUP",
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous for updateCampaign", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.campaign.updateCampaign({ id: 1, name: "X" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for deleteCampaign", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.campaign.deleteCampaign({ id: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for listPayloads", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.campaign.listPayloads({ campaignId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for addPayload", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.campaign.addPayload({
          campaignId: 1,
          entityType: "users",
          operation: "CREATE",
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous for simulateCampaign", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.campaign.simulateCampaign({ campaignId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for approveCampaign", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.campaign.approveCampaign({ campaignId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for executeCampaign", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.campaign.executeCampaign({ campaignId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for rollbackCampaign", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.campaign.rollbackCampaign({
          campaignId: 1,
          reason: "Test",
          actorId: 1,
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous for freezeInventory", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.campaign.freezeInventory({
          campaignId: 1,
          warehouseId: 1,
          freezeType: "FULL",
          frozenBy: 1,
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous for unfreezeInventory", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.campaign.unfreezeInventory({ freezeLogId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for listFreezeLogs", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.campaign.listFreezeLogs({ campaignId: 1 })
      ).rejects.toThrow();
    });
  });
});
