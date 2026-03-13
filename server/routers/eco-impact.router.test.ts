/**
 * ECO Cost Impact Analysis Router — Unit Tests
 * Tests pure functions (calculateEcoFinancialImpact, classifyRisk)
 * + 4 tRPC procedures (listEcos, getEcoImpact, approveEco, rejectEco)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminCaller, createAnonymousCaller } from "../_test/trpc-test-utils";
import {
  calculateEcoFinancialImpact,
  classifyRisk,
  type EcoInput,
  type BomChangeInput,
} from "./eco-impact.router";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Helper ───────────────────────────────────────────────
function makeChange(overrides: Partial<BomChangeInput> = {}): BomChangeInput {
  return {
    id: 1, changeType: "SUBSTITUTE",
    oldPartNumber: "OLD-001", oldPartName: "Old Part",
    newPartNumber: "NEW-001", newPartName: "New Part",
    oldQuantity: 4, newQuantity: 4,
    oldUnitCost: 100, newUnitCost: 200,
    reason: "Upgrade", ...overrides,
  };
}

function makeEco(overrides: Partial<EcoInput> = {}): EcoInput {
  return {
    ecoId: "ECO-TEST-001", title: "Test ECO", description: "Test",
    status: "pending_review", requestedBy: "Test User",
    changes: [makeChange()], inventory: [{ partNumber: "OLD-001", stockQuantity: 10, warehouseLocation: "WH01" }],
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════
// PURE FUNCTION TESTS
// ════════════════════════════════════════════════════════

describe("classifyRisk", () => {
  it("returns LOW for < 10000", () => {
    expect(classifyRisk(0)).toBe("LOW");
    expect(classifyRisk(9999)).toBe("LOW");
  });
  it("returns MEDIUM for 10000-49999", () => {
    expect(classifyRisk(10000)).toBe("MEDIUM");
    expect(classifyRisk(49999)).toBe("MEDIUM");
  });
  it("returns HIGH for 50000-199999", () => {
    expect(classifyRisk(50000)).toBe("HIGH");
    expect(classifyRisk(199999)).toBe("HIGH");
  });
  it("returns CRITICAL for >= 200000", () => {
    expect(classifyRisk(200000)).toBe("CRITICAL");
    expect(classifyRisk(1000000)).toBe("CRITICAL");
  });
});

describe("calculateEcoFinancialImpact", () => {
  describe("SUBSTITUTE changes", () => {
    it("calculates scrap cost from inventory stock × old unit cost", () => {
      const eco = makeEco();
      const result = calculateEcoFinancialImpact(eco);
      expect(result.scrapRiskValue).toBe(1000); // 10 stock × 100 old cost
    });

    it("calculates procurement cost from new qty × new unit cost", () => {
      const eco = makeEco();
      const result = calculateEcoFinancialImpact(eco);
      expect(result.newProcurementCost).toBe(800); // 4 qty × 200 new cost
    });

    it("total impact = scrap + procurement", () => {
      const eco = makeEco();
      const result = calculateEcoFinancialImpact(eco);
      expect(result.totalFinancialImpact).toBe(1800);
    });

    it("tracks affected parts", () => {
      const eco = makeEco();
      const result = calculateEcoFinancialImpact(eco);
      expect(result.affectedPartNumbers).toContain("OLD-001");
      expect(result.affectedPartNumbers).toContain("NEW-001");
    });

    it("handles zero stock (no scrap)", () => {
      const eco = makeEco({
        inventory: [{ partNumber: "OLD-001", stockQuantity: 0, warehouseLocation: "WH01" }],
      });
      const result = calculateEcoFinancialImpact(eco);
      expect(result.scrapRiskValue).toBe(0);
      expect(result.affectedInventoryCount).toBe(0);
    });
  });

  describe("REMOVE changes", () => {
    it("scrap only, no procurement", () => {
      const eco = makeEco({
        changes: [makeChange({ changeType: "REMOVE", newPartNumber: null, newPartName: null, newQuantity: 0, newUnitCost: 0 })],
      });
      const result = calculateEcoFinancialImpact(eco);
      expect(result.scrapRiskValue).toBe(1000);
      expect(result.newProcurementCost).toBe(0);
    });
  });

  describe("ADD changes", () => {
    it("procurement only, no scrap", () => {
      const eco = makeEco({
        changes: [makeChange({ changeType: "ADD", oldPartNumber: null, oldPartName: null, oldQuantity: 0, oldUnitCost: 0 })],
        inventory: [],
      });
      const result = calculateEcoFinancialImpact(eco);
      expect(result.scrapRiskValue).toBe(0);
      expect(result.newProcurementCost).toBe(800);
    });
  });

  describe("QUANTITY changes", () => {
    it("procurement for increased quantity", () => {
      const eco = makeEco({
        changes: [makeChange({
          changeType: "QUANTITY", oldQuantity: 8, newQuantity: 12,
          oldPartNumber: "NZL-001", newPartNumber: "NZL-001",
          oldUnitCost: 125, newUnitCost: 125,
        })],
        inventory: [{ partNumber: "NZL-001", stockQuantity: 20, warehouseLocation: "WH01" }],
      });
      const result = calculateEcoFinancialImpact(eco);
      expect(result.scrapRiskValue).toBe(0);
      expect(result.newProcurementCost).toBe(500); // (12-8) × 125
    });

    it("no cost for decreased quantity", () => {
      const eco = makeEco({
        changes: [makeChange({ changeType: "QUANTITY", oldQuantity: 12, newQuantity: 8, newPartNumber: "P" })],
        inventory: [],
      });
      const result = calculateEcoFinancialImpact(eco);
      expect(result.totalFinancialImpact).toBe(0);
    });
  });

  describe("multi-change ECOs", () => {
    it("sums impacts across multiple changes", () => {
      const eco = makeEco({
        changes: [
          makeChange({ id: 1, changeType: "SUBSTITUTE", oldPartNumber: "A", newPartNumber: "B", oldUnitCost: 100, newUnitCost: 200, newQuantity: 2 }),
          makeChange({ id: 2, changeType: "ADD", oldPartNumber: null, newPartNumber: "C", oldUnitCost: 0, newUnitCost: 50, newQuantity: 10 }),
        ],
        inventory: [{ partNumber: "A", stockQuantity: 5, warehouseLocation: "WH01" }],
      });
      const result = calculateEcoFinancialImpact(eco);
      expect(result.scrapRiskValue).toBe(500); // 5 × 100
      expect(result.newProcurementCost).toBe(900); // 2×200 + 10×50
      expect(result.partDetails).toHaveLength(2);
    });
  });

  it("includes currency CNY", () => {
    const result = calculateEcoFinancialImpact(makeEco());
    expect(result.currency).toBe("CNY");
  });

  it("includes calculatedAt timestamp", () => {
    const result = calculateEcoFinancialImpact(makeEco());
    expect(result.calculatedAt).toBeTruthy();
  });

  it("handles empty changes", () => {
    const eco = makeEco({ changes: [], inventory: [] });
    const result = calculateEcoFinancialImpact(eco);
    expect(result.totalFinancialImpact).toBe(0);
    expect(result.riskLevel).toBe("LOW");
  });
});

// ════════════════════════════════════════════════════════
// tRPC PROCEDURE TESTS
// ════════════════════════════════════════════════════════

describe("eco-impact router", () => {

  describe("listEcos", () => {
    it("returns list of ECOs with impact summaries", async () => {
      const caller = createAdminCaller();
      const result = await caller.ecoImpact.listEcos();
      expect(result).toHaveProperty("ecos");
      expect(result).toHaveProperty("dataSource", "mock");
      expect(result.ecos.length).toBeGreaterThanOrEqual(3);
      for (const eco of result.ecos) {
        expect(eco).toHaveProperty("ecoId");
        expect(eco).toHaveProperty("totalImpact");
        expect(eco).toHaveProperty("riskLevel");
      }
    });
  });

  describe("getEcoImpact", () => {
    it("returns full impact analysis for known ECO", async () => {
      const caller = createAdminCaller();
      const result = await caller.ecoImpact.getEcoImpact({ ecoId: "ECO-2026-001" });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.impact).toHaveProperty("totalFinancialImpact");
        expect(result.impact).toHaveProperty("partDetails");
        expect(result.impact.partDetails.length).toBeGreaterThan(0);
        expect(result.eco.ecoId).toBe("ECO-2026-001");
      }
    });

    it("returns found=false for unknown ECO", async () => {
      const caller = createAdminCaller();
      const result = await caller.ecoImpact.getEcoImpact({ ecoId: "ECO-UNKNOWN" });
      expect(result.found).toBe(false);
    });

    it("ECO-001 has bearing substitution scrap cost", async () => {
      const caller = createAdminCaller();
      const result = await caller.ecoImpact.getEcoImpact({ ecoId: "ECO-2026-001" });
      if (result.found) {
        expect(result.impact.scrapRiskValue).toBeGreaterThan(0);
        expect(result.impact.affectedPartNumbers).toContain("BRG-SKF-6205-2Z");
      }
    });

    it("ECO-003 is QUANTITY change with nozzles", async () => {
      const caller = createAdminCaller();
      const result = await caller.ecoImpact.getEcoImpact({ ecoId: "ECO-2026-003" });
      if (result.found) {
        expect(result.impact.scrapRiskValue).toBe(0);
        expect(result.impact.newProcurementCost).toBe(500); // (12-8) × 125
      }
    });
  });

  describe("approveEco", () => {
    it("approves ECO", async () => {
      const caller = createAdminCaller();
      const result = await caller.ecoImpact.approveEco({ ecoId: "ECO-2026-001" });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("newStatus", "approved");
      expect(result).toHaveProperty("approvedAt");
    });

    it("approves with notes", async () => {
      const caller = createAdminCaller();
      const result = await caller.ecoImpact.approveEco({
        ecoId: "ECO-2026-002", approverNotes: "Approved by engineering review board",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("rejectEco", () => {
    it("rejects ECO with reason", async () => {
      const caller = createAdminCaller();
      const result = await caller.ecoImpact.rejectEco({
        ecoId: "ECO-2026-001", rejectReason: "Cost too high",
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("newStatus", "rejected");
      expect(result).toHaveProperty("reason", "Cost too high");
    });

    it("rejects empty reason", async () => {
      const caller = createAdminCaller();
      await expect(caller.ecoImpact.rejectEco({
        ecoId: "ECO-2026-001", rejectReason: "",
      })).rejects.toThrow();
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════
  describe("authentication", () => {
    it("rejects anonymous for listEcos", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.ecoImpact.listEcos()).rejects.toThrow();
    });
    it("rejects anonymous for getEcoImpact", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.ecoImpact.getEcoImpact({ ecoId: "X" })).rejects.toThrow();
    });
    it("rejects anonymous for approveEco", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.ecoImpact.approveEco({ ecoId: "X" })).rejects.toThrow();
    });
    it("rejects anonymous for rejectEco", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.ecoImpact.rejectEco({ ecoId: "X", rejectReason: "no" })).rejects.toThrow();
    });
  });
});
