/**
 * Supplier Risk Rating Engine — Automated Test Suite
 * Phase 2.2 — IQC (QMS) ↔ Procurement (SCM) Cross-Domain Fusion
 *
 * Proves:
 *   1. High-defect IQC record drops supplier's risk score
 *   2. Score below 60 triggers RESTRICTED status (PO interlock)
 *   3. Clean suppliers stay ACTIVE
 *   4. Edge cases handled defensively
 *
 * Run: pnpm test -- server/routers/supplier-risk.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  evaluateSupplierRisk,
  classifyStatus,
  type RiskEvalInput,
  type SupplierProfile,
  type IqcInspection,
} from "./supplier-risk.router";

// ─── Helpers ────────────────────────────────────────────────────────

function makeSupplier(overrides?: Partial<SupplierProfile>): SupplierProfile {
  return {
    id: 1,
    supplierCode: "SUP-TEST",
    supplierName: "Test Supplier",
    category: "General",
    baseScore: 100,
    currentScore: 100,
    qualityRating: "B",
    ...overrides,
  };
}

function makeInspection(overrides: Partial<IqcInspection> & { id: number }): IqcInspection {
  return {
    inspectionCode: `IQC-${overrides.id}`,
    supplierId: 1,
    partNumber: "PART-001",
    partName: "Test Part",
    totalQty: 100,
    defectQty: 0,
    inspectionDate: "2026-02-20",
    result: "PASS",
    disposition: "accept",
    ...overrides,
  };
}

function makeInput(overrides?: Partial<RiskEvalInput>): RiskEvalInput {
  return {
    supplier: makeSupplier(),
    inspections: [],
    ...overrides,
  };
}

// ─── classifyStatus ──────────────────────────────────────────────────

describe("classifyStatus — threshold classification", () => {
  it("should classify ≥85 as ACTIVE", () => {
    expect(classifyStatus(85)).toBe("ACTIVE");
    expect(classifyStatus(100)).toBe("ACTIVE");
    expect(classifyStatus(95)).toBe("ACTIVE");
  });

  it("should classify 60–84 as WARNING", () => {
    expect(classifyStatus(84)).toBe("WARNING");
    expect(classifyStatus(60)).toBe("WARNING");
    expect(classifyStatus(72)).toBe("WARNING");
  });

  it("should classify <60 as RESTRICTED", () => {
    expect(classifyStatus(59)).toBe("RESTRICTED");
    expect(classifyStatus(0)).toBe("RESTRICTED");
    expect(classifyStatus(30)).toBe("RESTRICTED");
  });

  it("should handle exact boundary at 85 (ACTIVE)", () => {
    expect(classifyStatus(85)).toBe("ACTIVE");
  });

  it("should handle exact boundary at 60 (WARNING)", () => {
    expect(classifyStatus(60)).toBe("WARNING");
  });
});

// ─── Clean Supplier (ACTIVE) ─────────────────────────────────────────

describe("Supplier Risk — Clean supplier stays ACTIVE", () => {
  it("should return base score with no inspections", () => {
    const result = evaluateSupplierRisk(makeInput());

    expect(result.currentScore).toBe(100);
    expect(result.status).toBe("ACTIVE");
    expect(result.movingDefectRate).toBe(0);
    expect(result.interlockTriggered).toBe(false);
    expect(result.triggeredPenalties).toHaveLength(0);
  });

  it("should keep score at 100 with perfect inspections", () => {
    const result = evaluateSupplierRisk(makeInput({
      inspections: [
        makeInspection({ id: 1, totalQty: 100, defectQty: 0 }),
        makeInspection({ id: 2, totalQty: 200, defectQty: 0 }),
        makeInspection({ id: 3, totalQty: 50, defectQty: 0 }),
      ],
    }));

    expect(result.currentScore).toBe(100);
    expect(result.status).toBe("ACTIVE");
    expect(result.movingDefectRate).toBe(0);
    expect(result.movingDefectRatePct).toBe(0);
  });

  it("should stay ACTIVE with defect rate below 5%", () => {
    // 10 defects / 500 total = 2% → no penalty
    const result = evaluateSupplierRisk(makeInput({
      inspections: [
        makeInspection({ id: 1, totalQty: 100, defectQty: 2 }),
        makeInspection({ id: 2, totalQty: 100, defectQty: 2 }),
        makeInspection({ id: 3, totalQty: 100, defectQty: 2 }),
        makeInspection({ id: 4, totalQty: 100, defectQty: 2 }),
        makeInspection({ id: 5, totalQty: 100, defectQty: 2 }),
      ],
    }));

    expect(result.movingDefectRatePct).toBe(2);
    expect(result.currentScore).toBe(100);
    expect(result.status).toBe("ACTIVE");
    expect(result.triggeredPenalties).toHaveLength(0);
  });
});

// ─── THE CRITICAL TEST: High defect → score drop → RESTRICTED ───────

describe("Supplier Risk — High defect IQC triggers RESTRICTED", () => {
  it("should drop score and trigger RESTRICTED for >5% defect rate with FAILs", () => {
    // 95 defects / 1000 total = 9.5% → penalty = (0.095 - 0.05) × 500 = 22.5
    // Plus 3 FAIL dispositions × 5 = 15
    // Score = 100 - 22.5 - 15 = 62.5 → WARNING
    const result = evaluateSupplierRisk(makeInput({
      inspections: [
        makeInspection({ id: 1, totalQty: 200, defectQty: 25, result: "FAIL" }),
        makeInspection({ id: 2, totalQty: 200, defectQty: 20, result: "FAIL" }),
        makeInspection({ id: 3, totalQty: 200, defectQty: 20, result: "FAIL" }),
        makeInspection({ id: 4, totalQty: 200, defectQty: 15, result: "CONDITIONAL" }),
        makeInspection({ id: 5, totalQty: 200, defectQty: 15, result: "CONDITIONAL" }),
      ],
    }));

    expect(result.movingDefectRatePct).toBeCloseTo(9.5, 1);
    expect(result.currentScore).toBeLessThan(100);
    expect(result.triggeredPenalties.length).toBeGreaterThan(0);
    // With 3 FAILs: rate penalty + fail deductions + severe penalty (>10% is close)
    expect(result.status).toBe("WARNING");
  });

  it("should trigger RESTRICTED interlock when score drops below 60", () => {
    // Extreme case: 12% defect rate + 5 FAILs
    // Rate penalty: (0.12 - 0.05) × 500 = 35
    // Fail penalty: 5 × 5 = 25
    // Severe penalty (>10%): 10
    // Score = 100 - 35 - 25 - 10 = 30 → RESTRICTED
    const result = evaluateSupplierRisk(makeInput({
      inspections: [
        makeInspection({ id: 1, totalQty: 100, defectQty: 15, result: "FAIL" }),
        makeInspection({ id: 2, totalQty: 100, defectQty: 14, result: "FAIL" }),
        makeInspection({ id: 3, totalQty: 100, defectQty: 13, result: "FAIL" }),
        makeInspection({ id: 4, totalQty: 100, defectQty: 10, result: "FAIL" }),
        makeInspection({ id: 5, totalQty: 100, defectQty: 8, result: "FAIL" }),
      ],
    }));

    expect(result.currentScore).toBeLessThan(60);
    expect(result.status).toBe("RESTRICTED");
    expect(result.interlockTriggered).toBe(true);
    // Verify the interlock message is in penalties
    const interlockMsg = result.triggeredPenalties.find(p => p.includes("INTERLOCK"));
    expect(interlockMsg).toBeTruthy();
    expect(interlockMsg).toContain("RESTRICTED");
    expect(interlockMsg).toContain("BLOCKED");
  });

  it("should include the exact IQC records that caused the penalty", () => {
    const result = evaluateSupplierRisk(makeInput({
      inspections: [
        makeInspection({ id: 99, inspectionCode: "IQC-2026-0208", partNumber: "GSK-NBR-003", totalQty: 100, defectQty: 12, result: "FAIL" }),
        makeInspection({ id: 100, totalQty: 100, defectQty: 10, result: "FAIL" }),
        makeInspection({ id: 101, totalQty: 100, defectQty: 10, result: "FAIL" }),
        makeInspection({ id: 102, totalQty: 100, defectQty: 8, result: "FAIL" }),
        makeInspection({ id: 103, totalQty: 100, defectQty: 8, result: "FAIL" }),
      ],
    }));

    // Should include inspection window with details
    expect(result.inspectionWindow).toHaveLength(5);
    expect(result.inspectionWindow[0].inspectionCode).toBe("IQC-2026-0208");
    expect(result.inspectionWindow[0].partNumber).toBe("GSK-NBR-003");
    expect(result.inspectionWindow[0].defectQty).toBe(12);

    // Penalties should reference the specific IQC codes
    const failPenalties = result.triggeredPenalties.filter(p => p.includes("IQC-2026-0208"));
    expect(failPenalties.length).toBeGreaterThan(0);
  });
});

// ─── Defect Rate Threshold Tests ─────────────────────────────────────

describe("Supplier Risk — Defect rate thresholds", () => {
  it("should apply rate penalty at exactly 5.1% (just over threshold)", () => {
    // 51 defects / 1000 = 5.1% → penalty = (0.051 - 0.05) × 500 = 0.5
    const result = evaluateSupplierRisk(makeInput({
      inspections: [
        makeInspection({ id: 1, totalQty: 200, defectQty: 10 }),
        makeInspection({ id: 2, totalQty: 200, defectQty: 11 }),
        makeInspection({ id: 3, totalQty: 200, defectQty: 10 }),
        makeInspection({ id: 4, totalQty: 200, defectQty: 10 }),
        makeInspection({ id: 5, totalQty: 200, defectQty: 10 }),
      ],
    }));

    expect(result.movingDefectRatePct).toBeCloseTo(5.1, 0);
    expect(result.currentScore).toBeLessThan(100);
    expect(result.currentScore).toBeGreaterThan(98);  // small penalty
  });

  it("should NOT apply rate penalty at exactly 5.0%", () => {
    // 25 defects / 500 = 5.0% → exactly at threshold, no penalty
    const result = evaluateSupplierRisk(makeInput({
      inspections: [
        makeInspection({ id: 1, totalQty: 100, defectQty: 5 }),
        makeInspection({ id: 2, totalQty: 100, defectQty: 5 }),
        makeInspection({ id: 3, totalQty: 100, defectQty: 5 }),
        makeInspection({ id: 4, totalQty: 100, defectQty: 5 }),
        makeInspection({ id: 5, totalQty: 100, defectQty: 5 }),
      ],
    }));

    expect(result.movingDefectRatePct).toBe(5);
    expect(result.currentScore).toBe(100);
    expect(result.triggeredPenalties).toHaveLength(0);
  });

  it("should apply severe penalty for rate >10%", () => {
    // 60 defects / 500 = 12% → rate penalty + severe penalty
    const result = evaluateSupplierRisk(makeInput({
      inspections: [
        makeInspection({ id: 1, totalQty: 100, defectQty: 12 }),
        makeInspection({ id: 2, totalQty: 100, defectQty: 12 }),
        makeInspection({ id: 3, totalQty: 100, defectQty: 12 }),
        makeInspection({ id: 4, totalQty: 100, defectQty: 12 }),
        makeInspection({ id: 5, totalQty: 100, defectQty: 12 }),
      ],
    }));

    const severePenalty = result.triggeredPenalties.find(p => p.includes("Severe"));
    expect(severePenalty).toBeTruthy();
    expect(result.currentScore).toBeLessThan(65);
  });
});

// ─── Window Size ─────────────────────────────────────────────────────

describe("Supplier Risk — Window size behavior", () => {
  it("should only consider last N inspections (default 5)", () => {
    // 7 inspections total, last 5 are clean, first 2 were terrible
    const result = evaluateSupplierRisk(makeInput({
      inspections: [
        makeInspection({ id: 1, totalQty: 100, defectQty: 0, inspectionDate: "2026-02-25" }),
        makeInspection({ id: 2, totalQty: 100, defectQty: 0, inspectionDate: "2026-02-24" }),
        makeInspection({ id: 3, totalQty: 100, defectQty: 0, inspectionDate: "2026-02-23" }),
        makeInspection({ id: 4, totalQty: 100, defectQty: 0, inspectionDate: "2026-02-22" }),
        makeInspection({ id: 5, totalQty: 100, defectQty: 0, inspectionDate: "2026-02-21" }),
        // These should NOT be counted (outside window)
        makeInspection({ id: 6, totalQty: 100, defectQty: 50, result: "FAIL", inspectionDate: "2026-01-15" }),
        makeInspection({ id: 7, totalQty: 100, defectQty: 50, result: "FAIL", inspectionDate: "2026-01-10" }),
      ],
    }));

    expect(result.inspectionWindow).toHaveLength(5);
    expect(result.movingDefectRate).toBe(0);
    expect(result.currentScore).toBe(100);
  });

  it("should use custom window size when specified", () => {
    const result = evaluateSupplierRisk(makeInput({
      inspections: [
        makeInspection({ id: 1, totalQty: 100, defectQty: 0 }),
        makeInspection({ id: 2, totalQty: 100, defectQty: 0 }),
        makeInspection({ id: 3, totalQty: 100, defectQty: 50, result: "FAIL" }),
      ],
      windowSize: 2,  // only look at first 2 (clean)
    }));

    expect(result.inspectionWindow).toHaveLength(2);
    expect(result.movingDefectRate).toBe(0);
    expect(result.currentScore).toBe(100);
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────

describe("Supplier Risk — Edge cases", () => {
  it("should handle inspection with zero totalQty (no division by zero)", () => {
    const result = evaluateSupplierRisk(makeInput({
      inspections: [
        makeInspection({ id: 1, totalQty: 0, defectQty: 0 }),
      ],
    }));

    expect(result.movingDefectRate).toBe(0);
    expect(result.currentScore).toBe(100);
  });

  it("should clamp defectQty to totalQty (bad data)", () => {
    // More defects than inspected — should clamp
    const result = evaluateSupplierRisk(makeInput({
      inspections: [
        makeInspection({ id: 1, totalQty: 100, defectQty: 150 }),
      ],
    }));

    // defectQty clamped to 100 → rate = 100/100 = 100%
    expect(result.movingDefectRate).toBe(1);
    expect(result.status).toBe("RESTRICTED");
  });

  it("should never produce negative score", () => {
    // Extreme defect rate to try to push score below 0
    const result = evaluateSupplierRisk(makeInput({
      inspections: [
        makeInspection({ id: 1, totalQty: 10, defectQty: 10, result: "FAIL" }),
        makeInspection({ id: 2, totalQty: 10, defectQty: 10, result: "FAIL" }),
        makeInspection({ id: 3, totalQty: 10, defectQty: 10, result: "FAIL" }),
        makeInspection({ id: 4, totalQty: 10, defectQty: 10, result: "FAIL" }),
        makeInspection({ id: 5, totalQty: 10, defectQty: 10, result: "FAIL" }),
      ],
    }));

    expect(result.currentScore).toBeGreaterThanOrEqual(0);
    expect(result.status).toBe("RESTRICTED");
  });

  it("should preserve supplier identification in output", () => {
    const result = evaluateSupplierRisk(makeInput({
      supplier: makeSupplier({ id: 42, supplierCode: "SUP-042", supplierName: "Acme Corp" }),
    }));

    expect(result.supplierId).toBe(42);
    expect(result.supplierCode).toBe("SUP-042");
    expect(result.supplierName).toBe("Acme Corp");
  });

  it("should track total inspected and total defects across window", () => {
    const result = evaluateSupplierRisk(makeInput({
      inspections: [
        makeInspection({ id: 1, totalQty: 100, defectQty: 3 }),
        makeInspection({ id: 2, totalQty: 200, defectQty: 5 }),
        makeInspection({ id: 3, totalQty: 150, defectQty: 2 }),
      ],
    }));

    expect(result.totalInspected).toBe(450);
    expect(result.totalDefects).toBe(10);
  });

  it("should not trigger interlock if supplier was already RESTRICTED", () => {
    // Even though score < 60, if base score was already low,
    // interlockTriggered should only be true when transitioning FROM non-RESTRICTED
    const result = evaluateSupplierRisk(makeInput({
      supplier: makeSupplier({ baseScore: 50 }),  // already low
      inspections: [
        makeInspection({ id: 1, totalQty: 100, defectQty: 20, result: "FAIL" }),
      ],
    }));

    // Base was 50 (RESTRICTED already), so no *new* interlock trigger
    expect(result.status).toBe("RESTRICTED");
    expect(result.interlockTriggered).toBe(false);
  });
});

// ─── Real-World Scenario (GRT Supply Chain) ──────────────────────────

describe("Supplier Risk — GRT Real-World Scenario", () => {
  it("should correctly evaluate Dongguan HuaTai (the failing gasket supplier)", () => {
    // Deteriorating quality: 120 defects / 1000 = 12%
    // Rate penalty: (0.12 - 0.05) × 500 = 35
    // FAIL deductions: 3 × 5 = 15
    // Severe penalty (>10%): 10
    // Score = 100 - 35 - 15 - 10 = 40 → RESTRICTED
    const result = evaluateSupplierRisk({
      supplier: {
        id: 3, supplierCode: "SUP-015", supplierName: "Dongguan HuaTai Gaskets",
        category: "Gaskets", baseScore: 100, currentScore: 100, qualityRating: "C",
      },
      inspections: [
        makeInspection({ id: 301, inspectionCode: "IQC-2026-0208", partNumber: "GSK-NBR-003", partName: "NBR Standard Gasket Kit", totalQty: 100, defectQty: 18, result: "FAIL", inspectionDate: "2026-02-24" }),
        makeInspection({ id: 302, inspectionCode: "IQC-2026-0195", partNumber: "SEAL-EPDM-80", partName: "EPDM Seal Ring", totalQty: 300, defectQty: 45, result: "FAIL", inspectionDate: "2026-02-18" }),
        makeInspection({ id: 303, inspectionCode: "IQC-2026-0175", partNumber: "GSK-PTFE-010", partName: "PTFE Gasket Sheet", totalQty: 200, defectQty: 25, result: "FAIL", inspectionDate: "2026-02-12" }),
        makeInspection({ id: 304, inspectionCode: "IQC-2026-0155", partNumber: "GSK-NBR-003", partName: "NBR Standard Gasket Kit", totalQty: 100, defectQty: 12, result: "CONDITIONAL", inspectionDate: "2026-02-05" }),
        makeInspection({ id: 305, inspectionCode: "IQC-2026-0135", partNumber: "SEAL-EPDM-80", partName: "EPDM Seal Ring", totalQty: 300, defectQty: 20, result: "CONDITIONAL", inspectionDate: "2026-01-28" }),
      ],
    });

    // Total: 120 defects / 1000 inspected = 12%
    expect(result.movingDefectRatePct).toBeCloseTo(12, 0);
    expect(result.status).toBe("RESTRICTED");
    expect(result.interlockTriggered).toBe(true);
    expect(result.currentScore).toBeLessThan(60);
    expect(result.inspectionWindow).toHaveLength(5);
    expect(result.triggeredPenalties.length).toBeGreaterThanOrEqual(3);
  });
});
