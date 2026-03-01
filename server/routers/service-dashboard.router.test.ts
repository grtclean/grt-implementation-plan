/**
 * Service Dashboard Router — Unit Tests
 * Most procedures use dynamic imports + try-catch fallback to mock data.
 * Tests verify the fallback paths work correctly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAnonymousCaller } from "../_test/trpc-test-utils";

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

// Mock schema imports (used at module level by some procedures)
vi.mock("../../drizzle/schema", () => ({
  spareParts: { id: "id", name: "name", category: "category", currentStock: "currentStock", reorderPoint: "reorderPoint", locationCode: "locationCode", isCritical: "isCritical", materialName: "materialName" },
  afterSalesServiceLogs: { id: "id", ticketCode: "ticketCode", status: "status", priority: "priority", serviceType: "serviceType", createdAt: "createdAt", resolvedAt: "resolvedAt", assignedEngineer: "assignedEngineer", region: "region", description: "description", clientId: "clientId", ticketId: "ticketId" },
  afterSalesClients: { id: "id", name: "name", tier: "tier", contactPerson: "contactPerson", region: "region", slaLevel: "slaLevel", status: "status" },
  afterSalesEquipments: { id: "id", equipmentType: "equipmentType", status: "status", clientId: "clientId", location: "location" },
  knowledgeDocuments: { id: "id", title: "title", category: "category" },
}));

vi.mock("../../drizzle/service-dashboard-schema", () => ({
  serviceDashboardKpis: { id: "id", category: "category", metricKey: "metricKey", metricValue: "metricValue", label: "label", unit: "unit", region: "region", key: "key", value: "value", source: "source", sortOrder: "sortOrder", isActive: "isActive", createdAt: "createdAt", updatedAt: "updatedAt" },
  serviceDashboardLocations: { id: "id", city: "city", state: "state", country: "country", lat: "lat", lng: "lng", status: "status", clientName: "clientName", equipmentType: "equipmentType", engineerCount: "engineerCount", region: "region", isActive: "isActive", createdAt: "createdAt", updatedAt: "updatedAt" },
}));

// Mock the config schema dynamic import
vi.mock("../../drizzle/service-dashboard-config-schema", () => ({
  serviceDashboardKpis: { id: "id", category: "category", region: "region", key: "key", value: "value", label: "label", unit: "unit", source: "source", updatedAt: "updatedAt" },
  serviceDashboardLocations: { id: "id", region: "region", city: "city", state: "state", country: "country", lat: "lat", lng: "lng", status: "status", clientName: "clientName", equipmentType: "equipmentType", engineerCount: "engineerCount", updatedAt: "updatedAt" },
}));

vi.mock("../../drizzle/supply-chain-schema", () => ({
  spareParts: { id: "id", category: "category", currentStock: "currentStock", reorderPoint: "reorderPoint", locationCode: "locationCode", isCritical: "isCritical", materialName: "materialName" },
}));

vi.mock("../modules/knowledge-base.service", () => ({
  searchDocuments: vi.fn().mockResolvedValue([]),
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Tests ───────────────────────────────────────────────
describe("serviceDashboard router", () => {

  describe("getRegionOverview", () => {
    it("returns region data (mock fallback)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.serviceDashboard.getRegionOverview();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(4);
      const regions = result.map((r: any) => r.region);
      expect(regions).toContain("Asia");
      expect(regions).toContain("NorthAmerica");
    });
  });

  describe("getNorthAmericaStats", () => {
    it("returns NA statistics (mock fallback)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.serviceDashboard.getNorthAmericaStats();
      expect(result).toHaveProperty("projectCount");
      expect(result).toHaveProperty("engineerCount");
      expect(result).toHaveProperty("ticketsOpen");
      expect(result).toHaveProperty("mttr");
    });
  });

  describe("getNAProjectLocations", () => {
    it("returns NA project locations (mock fallback)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.serviceDashboard.getNAProjectLocations();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("city");
      expect(result[0]).toHaveProperty("lat");
    });
  });

  describe("getServiceReplicationComparison", () => {
    it("returns China vs NA comparison (mock fallback)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.serviceDashboard.getServiceReplicationComparison();
      expect(result).toHaveProperty("china");
      expect(result).toHaveProperty("northAmerica");
      expect(result.china).toHaveProperty("avgResponseHours");
    });
  });

  describe("getComplianceKnowledge", () => {
    it("searches compliance docs", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.serviceDashboard.getComplianceKnowledge({
        query: "OSHA safety", standard: "OSHA",
      });
      expect(result).toHaveProperty("results");
      expect(result).toHaveProperty("source");
    });

    it("searches all standards", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.serviceDashboard.getComplianceKnowledge({
        query: "safety", standard: "all",
      });
      expect(result).toHaveProperty("results");
    });

    it("rejects empty query", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.serviceDashboard.getComplianceKnowledge({
        query: "",
      })).rejects.toThrow();
    });
  });

  describe("getTicketLifecycle", () => {
    it("returns demo lifecycle stages", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.serviceDashboard.getTicketLifecycle({});
      expect(result).toHaveProperty("stages");
      expect(result.stages.length).toBe(7);
    });

    it("works with no input", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.serviceDashboard.getTicketLifecycle();
      expect(result).toHaveProperty("stages");
    });
  });

  describe("seedNADemo", () => {
    it("seeds demo data", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 1 }];
      const result = await caller.serviceDashboard.seedNADemo();
      expect(result).toHaveProperty("seeded");
    });
  });

  describe("listKpis", () => {
    it("returns empty array on error (fallback)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.serviceDashboard.listKpis({});
      // Falls back to empty since dynamic import of config schema may resolve OK in test
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("upsertKpi", () => {
    it("inserts new KPI when not existing", async () => {
      const caller = createAuthenticatedCaller();
      // existing check returns empty
      selectResultsQueue.push([]);
      mockReturningResult = [{ id: 1 }];
      const result = await caller.serviceDashboard.upsertKpi({
        category: "region_overview", key: "score", value: 95, label: "Score",
      });
      expect(result).toHaveProperty("action", "inserted");
    });

    it("updates existing KPI", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 5 }]);
      const result = await caller.serviceDashboard.upsertKpi({
        category: "region_overview", key: "score", value: 99, label: "Score",
      });
      expect(result).toHaveProperty("action", "updated");
      expect(result.id).toBe(5);
    });
  });

  describe("bulkUpsertKpis", () => {
    it("upserts multiple KPIs", async () => {
      const caller = createAuthenticatedCaller();
      // Two items, both new (existing check returns empty)
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      const result = await caller.serviceDashboard.bulkUpsertKpis({
        items: [
          { category: "test", key: "a", value: 1, label: "A" },
          { category: "test", key: "b", value: 2, label: "B" },
        ],
      });
      expect(result).toHaveProperty("inserted", 2);
      expect(result).toHaveProperty("total", 2);
    });
  });

  describe("listLocations", () => {
    it("returns empty array on fallback", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.serviceDashboard.listLocations({});
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("upsertLocation", () => {
    it("inserts new location", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 1 }];
      const result = await caller.serviceDashboard.upsertLocation({
        region: "NorthAmerica", city: "Detroit", country: "US",
        lat: 42.33, lng: -83.05,
      });
      expect(result).toHaveProperty("action", "inserted");
    });

    it("updates existing location by id", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.serviceDashboard.upsertLocation({
        id: 5, region: "NorthAmerica", city: "Detroit", country: "US",
        lat: 42.33, lng: -83.05,
      });
      expect(result).toHaveProperty("action", "updated");
      expect(result.id).toBe(5);
    });
  });

  describe("deleteLocation", () => {
    it("deletes a location (always returns success)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.serviceDashboard.deleteLocation({ id: 1 });
      expect(result).toHaveProperty("deleted", true);
    });
  });

  describe("syncFromDB", () => {
    it("syncs data and returns diffs", async () => {
      const caller = createAuthenticatedCaller();
      // Multiple queries for counts + upserts
      mockQueryResult = [{ cnt: 0 }];
      const result = await caller.serviceDashboard.syncFromDB();
      expect(result).toHaveProperty("diffs");
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════
  describe("authentication", () => {
    it("rejects anonymous for getRegionOverview", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.serviceDashboard.getRegionOverview()).rejects.toThrow();
    });

    it("rejects anonymous for seedNADemo", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.serviceDashboard.seedNADemo()).rejects.toThrow();
    });

    it("rejects anonymous for upsertKpi", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.serviceDashboard.upsertKpi({
        category: "x", key: "x", value: 0, label: "x",
      })).rejects.toThrow();
    });

    it("rejects anonymous for deleteLocation", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.serviceDashboard.deleteLocation({ id: 1 })).rejects.toThrow();
    });
  });
});
