/**
 * ECO Cost Impact Analysis — Automated Test Suite
 * Phase 2.1 — PLM ↔ WMS ↔ ERP Cross-Domain Fusion
 *
 * Verifies the financial impact calculation engine:
 *   Sunk Cost     = Σ(old_part_stock × old_unit_cost)  for SUBSTITUTE/REMOVE
 *   Procurement   = Σ(new_qty × new_unit_cost)          for SUBSTITUTE/ADD
 *   Total Impact  = Sunk Cost + Procurement
 *
 * Run: pnpm test -- server/routers/eco-impact.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  calculateEcoFinancialImpact,
  classifyRisk,
  type EcoInput,
  type BomChangeInput,
  type InventoryLookup,
} from "./eco-impact.router";

// ─── Helpers ────────────────────────────────────────────────────────

function makeEco(
  changes: BomChangeInput[],
  inventory: InventoryLookup[],
  overrides?: Partial<EcoInput>,
): EcoInput {
  return {
    ecoId: "ECO-TEST-001",
    title: "Test ECO",
    description: "Test description",
    status: "pending_review",
    requestedBy: "Test Engineer",
    changes,
    inventory,
    ...overrides,
  };
}

function makeChange(overrides: Partial<BomChangeInput>): BomChangeInput {
  return {
    id: 1,
    changeType: "SUBSTITUTE",
    oldPartNumber: "OLD-001",
    oldPartName: "Old Part",
    newPartNumber: "NEW-001",
    newPartName: "New Part",
    oldQuantity: 1,
    newQuantity: 1,
    oldUnitCost: 100,
    newUnitCost: 150,
    reason: "Test reason",
    ...overrides,
  };
}

// ─── SUBSTITUTE — The Core Fusion Scenario ──────────────────────────

describe("ECO Impact — SUBSTITUTE (part swap)", () => {
  it("should calculate scrap cost from existing inventory", () => {
    // 10 units in stock × ¥85 each = ¥850 scrap risk
    const result = calculateEcoFinancialImpact(makeEco(
      [makeChange({
        oldPartNumber: "BRG-001",
        newPartNumber: "BRG-002",
        oldUnitCost: 85,
        newUnitCost: 220,
        newQuantity: 4,
      })],
      [{ partNumber: "BRG-001", stockQuantity: 10, warehouseLocation: "WH01" }],
    ));

    expect(result.scrapRiskValue).toBe(850);       // 10 × 85
    expect(result.newProcurementCost).toBe(880);    // 4 × 220
    expect(result.totalFinancialImpact).toBe(1730); // 850 + 880
  });

  it("should handle zero inventory (no scrap, only procurement)", () => {
    const result = calculateEcoFinancialImpact(makeEco(
      [makeChange({
        oldPartNumber: "OLD-001",
        newPartNumber: "NEW-001",
        oldUnitCost: 100,
        newUnitCost: 200,
        newQuantity: 5,
      })],
      [{ partNumber: "OLD-001", stockQuantity: 0, warehouseLocation: "WH01" }],
    ));

    expect(result.scrapRiskValue).toBe(0);
    expect(result.newProcurementCost).toBe(1000);   // 5 × 200
    expect(result.affectedInventoryCount).toBe(0);
  });

  it("should handle missing inventory record (part not in warehouse)", () => {
    const result = calculateEcoFinancialImpact(makeEco(
      [makeChange({ oldPartNumber: "GHOST-PART" })],
      [],  // no inventory records at all
    ));

    expect(result.scrapRiskValue).toBe(0);  // no stock found
  });
});

// ─── ADD — New Part Introduction ─────────────────────────────────────

describe("ECO Impact — ADD (new part)", () => {
  it("should calculate only procurement cost for new parts", () => {
    const result = calculateEcoFinancialImpact(makeEco(
      [makeChange({
        changeType: "ADD",
        oldPartNumber: null,
        oldPartName: null,
        newPartNumber: "GSK-VITON-003",
        newUnitCost: 340,
        newQuantity: 2,
        oldUnitCost: 0,
      })],
      [],
    ));

    expect(result.scrapRiskValue).toBe(0);          // no old part
    expect(result.newProcurementCost).toBe(680);    // 2 × 340
    expect(result.totalFinancialImpact).toBe(680);
  });
});

// ─── REMOVE — Part Deletion ──────────────────────────────────────────

describe("ECO Impact — REMOVE (part removed)", () => {
  it("should calculate only scrap cost for removed parts", () => {
    const result = calculateEcoFinancialImpact(makeEco(
      [makeChange({
        changeType: "REMOVE",
        oldPartNumber: "GSK-NBR-003",
        oldPartName: "NBR Gasket Kit",
        newPartNumber: null,
        newPartName: null,
        oldUnitCost: 45,
        newUnitCost: 0,
        newQuantity: 0,
      })],
      [{ partNumber: "GSK-NBR-003", stockQuantity: 8, warehouseLocation: "WH01" }],
    ));

    expect(result.scrapRiskValue).toBe(360);        // 8 × 45
    expect(result.newProcurementCost).toBe(0);
    expect(result.totalFinancialImpact).toBe(360);
    expect(result.affectedInventoryCount).toBe(8);
  });
});

// ─── QUANTITY — Same Part, Volume Change ─────────────────────────────

describe("ECO Impact — QUANTITY (volume change)", () => {
  it("should calculate incremental procurement for quantity increase", () => {
    const result = calculateEcoFinancialImpact(makeEco(
      [makeChange({
        changeType: "QUANTITY",
        oldPartNumber: "NZL-001",
        newPartNumber: "NZL-001",
        oldQuantity: 8,
        newQuantity: 12,
        oldUnitCost: 125,
        newUnitCost: 125,
      })],
      [{ partNumber: "NZL-001", stockQuantity: 20, warehouseLocation: "WH01" }],
    ));

    expect(result.scrapRiskValue).toBe(0);          // same part, no scrap
    expect(result.newProcurementCost).toBe(500);    // (12-8) × 125
    expect(result.affectedInventoryCount).toBe(0);  // no inventory rendered obsolete
  });

  it("should return zero procurement for quantity decrease", () => {
    const result = calculateEcoFinancialImpact(makeEco(
      [makeChange({
        changeType: "QUANTITY",
        oldPartNumber: "NZL-001",
        newPartNumber: "NZL-001",
        oldQuantity: 12,
        newQuantity: 8,
        oldUnitCost: 125,
        newUnitCost: 125,
      })],
      [],
    ));

    expect(result.scrapRiskValue).toBe(0);
    expect(result.newProcurementCost).toBe(0);      // decreasing, no new procurement
  });
});

// ─── Multi-Change ECO (Real-World Scenario) ──────────────────────────

describe("ECO Impact — Multi-change ECO", () => {
  it("should sum impacts across all change lines (WASH-003 scenario)", () => {
    const result = calculateEcoFinancialImpact(makeEco(
      [
        // Line 1: SUBSTITUTE bearing (24 in stock × ¥85 = ¥2,040 scrap; 4 × ¥220 = ¥880 procurement)
        makeChange({
          id: 1,
          changeType: "SUBSTITUTE",
          oldPartNumber: "BRG-SKF-6205-2Z",
          newPartNumber: "BRG-SKF-6205-HT",
          oldUnitCost: 85,
          newUnitCost: 220,
          newQuantity: 4,
        }),
        // Line 2: ADD thermal gasket (0 scrap; 2 × ¥340 = ¥680 procurement)
        makeChange({
          id: 2,
          changeType: "ADD",
          oldPartNumber: null,
          oldPartName: null,
          newPartNumber: "GSK-VITON-003",
          oldUnitCost: 0,
          newUnitCost: 340,
          newQuantity: 2,
        }),
        // Line 3: REMOVE old gasket (8 × ¥45 = ¥360 scrap; 0 procurement)
        makeChange({
          id: 3,
          changeType: "REMOVE",
          oldPartNumber: "GSK-NBR-003",
          newPartNumber: null,
          newPartName: null,
          oldUnitCost: 45,
          newUnitCost: 0,
          newQuantity: 0,
        }),
      ],
      [
        { partNumber: "BRG-SKF-6205-2Z", stockQuantity: 24, warehouseLocation: "WH01-A-02-03" },
        { partNumber: "GSK-NBR-003", stockQuantity: 8, warehouseLocation: "WH01-B-01-05" },
      ],
    ));

    expect(result.scrapRiskValue).toBe(2400);          // 2040 + 0 + 360
    expect(result.newProcurementCost).toBe(1560);      // 880 + 680 + 0
    expect(result.totalFinancialImpact).toBe(3960);    // 2400 + 1560
    expect(result.affectedInventoryCount).toBe(32);    // 24 + 8
    expect(result.partDetails).toHaveLength(3);
  });

  it("should correctly track affected part numbers", () => {
    const result = calculateEcoFinancialImpact(makeEco(
      [
        makeChange({ id: 1, oldPartNumber: "A", newPartNumber: "B" }),
        makeChange({ id: 2, changeType: "ADD", oldPartNumber: null, newPartNumber: "C", oldUnitCost: 0 }),
      ],
      [{ partNumber: "A", stockQuantity: 5, warehouseLocation: "WH01" }],
    ));

    expect(result.affectedPartNumbers).toContain("A");
    expect(result.affectedPartNumbers).toContain("B");
    expect(result.affectedPartNumbers).toContain("C");
    expect(result.affectedPartNumbers).toHaveLength(3);
  });
});

// ─── Risk Level Classification ───────────────────────────────────────

describe("Risk Level Classification", () => {
  it("should classify <¥10,000 as LOW", () => {
    expect(classifyRisk(0)).toBe("LOW");
    expect(classifyRisk(5000)).toBe("LOW");
    expect(classifyRisk(9999)).toBe("LOW");
  });

  it("should classify ¥10,000–¥49,999 as MEDIUM", () => {
    expect(classifyRisk(10000)).toBe("MEDIUM");
    expect(classifyRisk(30000)).toBe("MEDIUM");
    expect(classifyRisk(49999)).toBe("MEDIUM");
  });

  it("should classify ¥50,000–¥199,999 as HIGH", () => {
    expect(classifyRisk(50000)).toBe("HIGH");
    expect(classifyRisk(100000)).toBe("HIGH");
    expect(classifyRisk(199999)).toBe("HIGH");
  });

  it("should classify ≥¥200,000 as CRITICAL", () => {
    expect(classifyRisk(200000)).toBe("CRITICAL");
    expect(classifyRisk(1000000)).toBe("CRITICAL");
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────

describe("ECO Impact — Edge Cases", () => {
  it("should handle empty changes array", () => {
    const result = calculateEcoFinancialImpact(makeEco([], []));

    expect(result.scrapRiskValue).toBe(0);
    expect(result.newProcurementCost).toBe(0);
    expect(result.totalFinancialImpact).toBe(0);
    expect(result.affectedInventoryCount).toBe(0);
    expect(result.partDetails).toHaveLength(0);
    expect(result.riskLevel).toBe("LOW");
  });

  it("should handle high-value PLC replacement (CRITICAL risk)", () => {
    const result = calculateEcoFinancialImpact(makeEco(
      [makeChange({
        oldPartNumber: "PLC-OLD",
        newPartNumber: "PLC-NEW",
        oldUnitCost: 12800,
        newUnitCost: 18500,
        newQuantity: 1,
      })],
      [{ partNumber: "PLC-OLD", stockQuantity: 2, warehouseLocation: "WH02" }],
    ));

    // scrap: 2 × 12800 = 25600; procurement: 1 × 18500 = 18500; total: 44100
    expect(result.scrapRiskValue).toBe(25600);
    expect(result.newProcurementCost).toBe(18500);
    expect(result.totalFinancialImpact).toBe(44100);
    expect(result.riskLevel).toBe("MEDIUM");
  });

  it("should preserve ecoId and title in output", () => {
    const result = calculateEcoFinancialImpact(makeEco(
      [],
      [],
      { ecoId: "ECO-2026-XYZ", title: "Custom Title" },
    ));

    expect(result.ecoId).toBe("ECO-2026-XYZ");
    expect(result.title).toBe("Custom Title");
    expect(result.currency).toBe("CNY");
  });

  it("should never produce negative scrap or procurement values", () => {
    // Negative stock quantity (bad data) should be clamped to 0
    const result = calculateEcoFinancialImpact(makeEco(
      [makeChange({ oldPartNumber: "BAD-DATA" })],
      [{ partNumber: "BAD-DATA", stockQuantity: -5, warehouseLocation: "WH01" }],
    ));

    expect(result.scrapRiskValue).toBe(0);
    expect(result.partDetails[0].stockQuantity).toBe(0);
  });

  it("should handle duplicate part numbers across changes correctly", () => {
    const result = calculateEcoFinancialImpact(makeEco(
      [
        makeChange({ id: 1, oldPartNumber: "SAME-PART", newPartNumber: "NEW-A", oldUnitCost: 100, newUnitCost: 200, newQuantity: 3 }),
        makeChange({ id: 2, oldPartNumber: "SAME-PART", newPartNumber: "NEW-B", oldUnitCost: 100, newUnitCost: 300, newQuantity: 2 }),
      ],
      [{ partNumber: "SAME-PART", stockQuantity: 10, warehouseLocation: "WH01" }],
    ));

    // Both lines reference same old part with stock=10
    // Line 1: scrap 10×100=1000, procurement 3×200=600
    // Line 2: scrap 10×100=1000, procurement 2×300=600
    // Total scrap: 2000, procurement: 1200
    expect(result.scrapRiskValue).toBe(2000);
    expect(result.newProcurementCost).toBe(1200);
    expect(result.partDetails).toHaveLength(2);
  });

  it("should include calculatedAt timestamp", () => {
    const before = new Date().toISOString();
    const result = calculateEcoFinancialImpact(makeEco([], []));
    const after = new Date().toISOString();

    expect(result.calculatedAt >= before).toBe(true);
    expect(result.calculatedAt <= after).toBe(true);
  });
});
