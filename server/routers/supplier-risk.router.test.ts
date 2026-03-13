/**
 * Supplier Risk Rating Router — Comprehensive Unit Tests
 *
 * Tests:
 *   1. Pure functions: classifyStatus, evaluateSupplierRisk
 *   2. tRPC procedures: dashboard, evaluateOne, override
 *   3. Auth guards: all procedures reject anonymous callers
 *   4. Edge cases: boundary values, bad data, extreme inputs
 *
 * Run: npx vitest run server/routers/supplier-risk.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
} from "../_test/trpc-test-utils";
import {
  evaluateSupplierRisk,
  classifyStatus,
  type RiskEvalInput,
  type SupplierProfile,
  type IqcInspection,
  type SupplierRiskStatus,
} from "./supplier-risk.router";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Test Helpers ────────────────────────────────────────────────────

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

function makeInspection(
  overrides: Partial<IqcInspection> & { id: number }
): IqcInspection {
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

// ════════════════════════════════════════════════════════════════════
// PURE FUNCTION TESTS
// ════════════════════════════════════════════════════════════════════

describe("classifyStatus — threshold classification", () => {
  it("classifies scores >= 85 as ACTIVE", () => {
    expect(classifyStatus(85)).toBe("ACTIVE");
    expect(classifyStatus(100)).toBe("ACTIVE");
    expect(classifyStatus(95)).toBe("ACTIVE");
    expect(classifyStatus(85.01)).toBe("ACTIVE");
  });

  it("classifies scores 60-84 as WARNING", () => {
    expect(classifyStatus(84)).toBe("WARNING");
    expect(classifyStatus(84.99)).toBe("WARNING");
    expect(classifyStatus(60)).toBe("WARNING");
    expect(classifyStatus(72)).toBe("WARNING");
  });

  it("classifies scores < 60 as RESTRICTED", () => {
    expect(classifyStatus(59)).toBe("RESTRICTED");
    expect(classifyStatus(59.99)).toBe("RESTRICTED");
    expect(classifyStatus(0)).toBe("RESTRICTED");
    expect(classifyStatus(30)).toBe("RESTRICTED");
  });

  it("handles exact boundary at 85 (ACTIVE side)", () => {
    expect(classifyStatus(85)).toBe("ACTIVE");
  });

  it("handles exact boundary at 60 (WARNING side)", () => {
    expect(classifyStatus(60)).toBe("WARNING");
  });

  it("handles negative scores as RESTRICTED", () => {
    expect(classifyStatus(-10)).toBe("RESTRICTED");
  });

  it("handles very large scores as ACTIVE", () => {
    expect(classifyStatus(9999)).toBe("ACTIVE");
  });
});

// ─── evaluateSupplierRisk — No Inspections ──────────────────────────

describe("evaluateSupplierRisk — no inspections", () => {
  it("returns base score when no inspections exist", () => {
    const result = evaluateSupplierRisk(makeInput());

    expect(result.currentScore).toBe(100);
    expect(result.previousScore).toBe(100);
    expect(result.status).toBe("ACTIVE");
    expect(result.movingDefectRate).toBe(0);
    expect(result.movingDefectRatePct).toBe(0);
    expect(result.totalInspected).toBe(0);
    expect(result.totalDefects).toBe(0);
    expect(result.interlockTriggered).toBe(false);
    expect(result.triggeredPenalties).toHaveLength(0);
    expect(result.inspectionWindow).toHaveLength(0);
  });

  it("preserves supplier identity fields", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        supplier: makeSupplier({
          id: 42,
          supplierCode: "SUP-042",
          supplierName: "Acme Corp",
        }),
      })
    );

    expect(result.supplierId).toBe(42);
    expect(result.supplierCode).toBe("SUP-042");
    expect(result.supplierName).toBe("Acme Corp");
  });

  it("respects non-100 base score with no inspections", () => {
    const result = evaluateSupplierRisk(
      makeInput({ supplier: makeSupplier({ baseScore: 70 }) })
    );

    expect(result.currentScore).toBe(70);
    expect(result.status).toBe("WARNING");
  });
});

// ─── evaluateSupplierRisk — Clean Supplier (ACTIVE) ─────────────────

describe("evaluateSupplierRisk — clean supplier stays ACTIVE", () => {
  it("keeps score at 100 with perfect inspections", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 0 }),
          makeInspection({ id: 2, totalQty: 200, defectQty: 0 }),
          makeInspection({ id: 3, totalQty: 50, defectQty: 0 }),
        ],
      })
    );

    expect(result.currentScore).toBe(100);
    expect(result.status).toBe("ACTIVE");
    expect(result.movingDefectRate).toBe(0);
    expect(result.movingDefectRatePct).toBe(0);
    expect(result.triggeredPenalties).toHaveLength(0);
  });

  it("stays ACTIVE with defect rate below 5%", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 2 }),
          makeInspection({ id: 2, totalQty: 100, defectQty: 2 }),
          makeInspection({ id: 3, totalQty: 100, defectQty: 2 }),
          makeInspection({ id: 4, totalQty: 100, defectQty: 2 }),
          makeInspection({ id: 5, totalQty: 100, defectQty: 2 }),
        ],
      })
    );

    expect(result.movingDefectRatePct).toBe(2);
    expect(result.currentScore).toBe(100);
    expect(result.status).toBe("ACTIVE");
    expect(result.triggeredPenalties).toHaveLength(0);
  });
});

// ─── Defect Rate Threshold Tests ────────────────────────────────────

describe("evaluateSupplierRisk — defect rate thresholds", () => {
  it("applies NO rate penalty at exactly 5.0%", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 5 }),
          makeInspection({ id: 2, totalQty: 100, defectQty: 5 }),
          makeInspection({ id: 3, totalQty: 100, defectQty: 5 }),
          makeInspection({ id: 4, totalQty: 100, defectQty: 5 }),
          makeInspection({ id: 5, totalQty: 100, defectQty: 5 }),
        ],
      })
    );

    expect(result.movingDefectRatePct).toBe(5);
    expect(result.currentScore).toBe(100);
    expect(result.triggeredPenalties).toHaveLength(0);
  });

  it("applies rate penalty just above 5% threshold", () => {
    // 51/1000 = 5.1% → penalty = (0.051 - 0.05) * 500 = 0.5
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 200, defectQty: 10 }),
          makeInspection({ id: 2, totalQty: 200, defectQty: 11 }),
          makeInspection({ id: 3, totalQty: 200, defectQty: 10 }),
          makeInspection({ id: 4, totalQty: 200, defectQty: 10 }),
          makeInspection({ id: 5, totalQty: 200, defectQty: 10 }),
        ],
      })
    );

    expect(result.movingDefectRatePct).toBeCloseTo(5.1, 0);
    expect(result.currentScore).toBeLessThan(100);
    expect(result.currentScore).toBeGreaterThan(98);
    expect(result.triggeredPenalties.length).toBeGreaterThan(0);
    expect(result.triggeredPenalties[0]).toContain("exceeds 5% threshold");
  });

  it("applies severe penalty for defect rate > 10%", () => {
    // 60/500 = 12% → rate penalty + severe penalty
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 12 }),
          makeInspection({ id: 2, totalQty: 100, defectQty: 12 }),
          makeInspection({ id: 3, totalQty: 100, defectQty: 12 }),
          makeInspection({ id: 4, totalQty: 100, defectQty: 12 }),
          makeInspection({ id: 5, totalQty: 100, defectQty: 12 }),
        ],
      })
    );

    const severePenalty = result.triggeredPenalties.find((p) =>
      p.includes("Severe")
    );
    expect(severePenalty).toBeTruthy();
    expect(severePenalty).toContain("exceeds 10%");
    expect(result.triggeredPenalties.length).toBeGreaterThanOrEqual(2);
  });

  it("does NOT apply severe penalty at exactly 10%", () => {
    // 50/500 = 10% exactly → rate penalty but no severe
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 10 }),
          makeInspection({ id: 2, totalQty: 100, defectQty: 10 }),
          makeInspection({ id: 3, totalQty: 100, defectQty: 10 }),
          makeInspection({ id: 4, totalQty: 100, defectQty: 10 }),
          makeInspection({ id: 5, totalQty: 100, defectQty: 10 }),
        ],
      })
    );

    expect(result.movingDefectRatePct).toBe(10);
    const severePenalty = result.triggeredPenalties.find((p) =>
      p.includes("Severe")
    );
    expect(severePenalty).toBeUndefined();
    // Rate penalty should still exist: (0.10 - 0.05) * 500 = 25
    const ratePenalty = result.triggeredPenalties.find((p) =>
      p.includes("exceeds 5% threshold")
    );
    expect(ratePenalty).toBeTruthy();
  });
});

// ─── FAIL Disposition Penalty ───────────────────────────────────────

describe("evaluateSupplierRisk — FAIL disposition penalty", () => {
  it("deducts 5 points per FAIL disposition (default failDeduction)", () => {
    // 0% defect rate so no rate penalty, but 2 FAILs
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 0, result: "FAIL" }),
          makeInspection({ id: 2, totalQty: 100, defectQty: 0, result: "FAIL" }),
          makeInspection({ id: 3, totalQty: 100, defectQty: 0, result: "PASS" }),
        ],
      })
    );

    // 2 FAILs * 5 = 10 point deduction
    expect(result.currentScore).toBe(90);
    expect(result.status).toBe("ACTIVE");
    expect(result.triggeredPenalties).toHaveLength(2);
    expect(result.triggeredPenalties[0]).toContain("FAIL");
  });

  it("uses custom failDeduction value", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 0, result: "FAIL" }),
        ],
        failDeduction: 20,
      })
    );

    expect(result.currentScore).toBe(80);
    expect(result.status).toBe("WARNING");
  });

  it("records scorePenalty in inspectionWindow for each FAIL", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 0, result: "FAIL" }),
          makeInspection({ id: 2, totalQty: 100, defectQty: 0, result: "PASS" }),
        ],
      })
    );

    expect(result.inspectionWindow[0].scorePenalty).toBe(5);
    expect(result.inspectionWindow[1].scorePenalty).toBe(0);
  });

  it("does NOT deduct for CONDITIONAL or PENDING results", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({
            id: 1,
            totalQty: 100,
            defectQty: 0,
            result: "CONDITIONAL",
          }),
          makeInspection({
            id: 2,
            totalQty: 100,
            defectQty: 0,
            result: "PENDING",
          }),
          makeInspection({ id: 3, totalQty: 100, defectQty: 0, result: "PASS" }),
        ],
      })
    );

    expect(result.currentScore).toBe(100);
    expect(result.triggeredPenalties).toHaveLength(0);
  });
});

// ─── Interlock Trigger ──────────────────────────────────────────────

describe("evaluateSupplierRisk — RESTRICTED interlock", () => {
  it("triggers interlock when score drops below 60 from ACTIVE base", () => {
    // 12% defect + 5 FAILs → score < 60
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({
            id: 1,
            totalQty: 100,
            defectQty: 15,
            result: "FAIL",
          }),
          makeInspection({
            id: 2,
            totalQty: 100,
            defectQty: 14,
            result: "FAIL",
          }),
          makeInspection({
            id: 3,
            totalQty: 100,
            defectQty: 13,
            result: "FAIL",
          }),
          makeInspection({
            id: 4,
            totalQty: 100,
            defectQty: 10,
            result: "FAIL",
          }),
          makeInspection({
            id: 5,
            totalQty: 100,
            defectQty: 8,
            result: "FAIL",
          }),
        ],
      })
    );

    expect(result.currentScore).toBeLessThan(60);
    expect(result.status).toBe("RESTRICTED");
    expect(result.interlockTriggered).toBe(true);
    const interlockMsg = result.triggeredPenalties.find((p) =>
      p.includes("INTERLOCK")
    );
    expect(interlockMsg).toBeTruthy();
    expect(interlockMsg).toContain("RESTRICTED");
    expect(interlockMsg).toContain("BLOCKED");
  });

  it("does NOT trigger interlock if supplier was already RESTRICTED (base < 60)", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        supplier: makeSupplier({ baseScore: 50 }),
        inspections: [
          makeInspection({
            id: 1,
            totalQty: 100,
            defectQty: 20,
            result: "FAIL",
          }),
        ],
      })
    );

    expect(result.status).toBe("RESTRICTED");
    expect(result.interlockTriggered).toBe(false);
  });

  it("does NOT trigger interlock when score stays in WARNING range", () => {
    // Small penalty, score stays above 60
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({
            id: 1,
            totalQty: 100,
            defectQty: 8,
            result: "FAIL",
          }),
          makeInspection({ id: 2, totalQty: 100, defectQty: 8 }),
          makeInspection({ id: 3, totalQty: 100, defectQty: 8 }),
          makeInspection({ id: 4, totalQty: 100, defectQty: 8 }),
          makeInspection({ id: 5, totalQty: 100, defectQty: 8 }),
        ],
      })
    );

    // 40/500 = 8%, penalty = (0.08-0.05)*500 = 15, + 1 FAIL = 5 => score = 80 => WARNING
    expect(result.status).toBe("WARNING");
    expect(result.interlockTriggered).toBe(false);
  });
});

// ─── Window Size ────────────────────────────────────────────────────

describe("evaluateSupplierRisk — window size behavior", () => {
  it("only considers last N inspections (default 5)", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 0 }),
          makeInspection({ id: 2, totalQty: 100, defectQty: 0 }),
          makeInspection({ id: 3, totalQty: 100, defectQty: 0 }),
          makeInspection({ id: 4, totalQty: 100, defectQty: 0 }),
          makeInspection({ id: 5, totalQty: 100, defectQty: 0 }),
          // Outside default window of 5
          makeInspection({
            id: 6,
            totalQty: 100,
            defectQty: 50,
            result: "FAIL",
          }),
          makeInspection({
            id: 7,
            totalQty: 100,
            defectQty: 50,
            result: "FAIL",
          }),
        ],
      })
    );

    expect(result.inspectionWindow).toHaveLength(5);
    expect(result.movingDefectRate).toBe(0);
    expect(result.currentScore).toBe(100);
  });

  it("uses custom window size", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 0 }),
          makeInspection({ id: 2, totalQty: 100, defectQty: 0 }),
          makeInspection({
            id: 3,
            totalQty: 100,
            defectQty: 50,
            result: "FAIL",
          }),
        ],
        windowSize: 2,
      })
    );

    expect(result.inspectionWindow).toHaveLength(2);
    expect(result.movingDefectRate).toBe(0);
    expect(result.currentScore).toBe(100);
  });

  it("handles fewer inspections than window size", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 1 }),
        ],
        windowSize: 10,
      })
    );

    expect(result.inspectionWindow).toHaveLength(1);
    expect(result.totalInspected).toBe(100);
    expect(result.totalDefects).toBe(1);
  });

  it("window size of 1 only considers the first inspection", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({
            id: 1,
            totalQty: 100,
            defectQty: 20,
            result: "FAIL",
          }),
          makeInspection({ id: 2, totalQty: 100, defectQty: 0 }),
        ],
        windowSize: 1,
      })
    );

    expect(result.inspectionWindow).toHaveLength(1);
    expect(result.totalDefects).toBe(20);
    expect(result.movingDefectRatePct).toBe(20);
  });
});

// ─── Custom Penalty Multiplier ──────────────────────────────────────

describe("evaluateSupplierRisk — custom penaltyMultiplier", () => {
  it("uses custom penaltyMultiplier for rate penalty calculation", () => {
    // 10% defect rate, threshold 5%, excess = 5%
    // With default multiplier 500: penalty = 0.05 * 500 = 25
    // With multiplier 1000: penalty = 0.05 * 1000 = 50
    const resultDefault = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 10 }),
          makeInspection({ id: 2, totalQty: 100, defectQty: 10 }),
          makeInspection({ id: 3, totalQty: 100, defectQty: 10 }),
          makeInspection({ id: 4, totalQty: 100, defectQty: 10 }),
          makeInspection({ id: 5, totalQty: 100, defectQty: 10 }),
        ],
      })
    );

    const resultCustom = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 10 }),
          makeInspection({ id: 2, totalQty: 100, defectQty: 10 }),
          makeInspection({ id: 3, totalQty: 100, defectQty: 10 }),
          makeInspection({ id: 4, totalQty: 100, defectQty: 10 }),
          makeInspection({ id: 5, totalQty: 100, defectQty: 10 }),
        ],
        penaltyMultiplier: 1000,
      })
    );

    expect(resultCustom.currentScore).toBeLessThan(resultDefault.currentScore);
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────

describe("evaluateSupplierRisk — edge cases", () => {
  it("handles inspection with zero totalQty (no division by zero)", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [makeInspection({ id: 1, totalQty: 0, defectQty: 0 })],
      })
    );

    expect(result.movingDefectRate).toBe(0);
    expect(result.currentScore).toBe(100);
  });

  it("clamps defectQty to totalQty when defectQty > totalQty", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 150 }),
        ],
      })
    );

    expect(result.movingDefectRate).toBe(1);
    expect(result.inspectionWindow[0].defectQty).toBe(100);
    expect(result.status).toBe("RESTRICTED");
  });

  it("handles negative totalQty by treating as 0", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: -50, defectQty: 10 }),
        ],
      })
    );

    // totalQty clamped to 0 via Math.max(0, ...)
    expect(result.inspectionWindow[0].totalQty).toBe(0);
    expect(result.movingDefectRate).toBe(0);
  });

  it("never produces a score below 0", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({
            id: 1,
            totalQty: 10,
            defectQty: 10,
            result: "FAIL",
          }),
          makeInspection({
            id: 2,
            totalQty: 10,
            defectQty: 10,
            result: "FAIL",
          }),
          makeInspection({
            id: 3,
            totalQty: 10,
            defectQty: 10,
            result: "FAIL",
          }),
          makeInspection({
            id: 4,
            totalQty: 10,
            defectQty: 10,
            result: "FAIL",
          }),
          makeInspection({
            id: 5,
            totalQty: 10,
            defectQty: 10,
            result: "FAIL",
          }),
        ],
      })
    );

    expect(result.currentScore).toBeGreaterThanOrEqual(0);
    expect(result.currentScore).toBe(0);
    expect(result.status).toBe("RESTRICTED");
  });

  it("never produces a score above 100", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        supplier: makeSupplier({ baseScore: 100 }),
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 0 }),
        ],
      })
    );

    expect(result.currentScore).toBeLessThanOrEqual(100);
  });

  it("tracks totalInspected and totalDefects across multiple inspections", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({ id: 1, totalQty: 100, defectQty: 3 }),
          makeInspection({ id: 2, totalQty: 200, defectQty: 5 }),
          makeInspection({ id: 3, totalQty: 150, defectQty: 2 }),
        ],
      })
    );

    expect(result.totalInspected).toBe(450);
    expect(result.totalDefects).toBe(10);
  });

  it("includes detailed inspectionWindow with correct fields", () => {
    const result = evaluateSupplierRisk(
      makeInput({
        inspections: [
          makeInspection({
            id: 99,
            inspectionCode: "IQC-2026-0208",
            partNumber: "GSK-NBR-003",
            partName: "NBR Standard Gasket Kit",
            totalQty: 100,
            defectQty: 12,
            result: "FAIL",
            inspectionDate: "2026-02-24",
          }),
        ],
      })
    );

    expect(result.inspectionWindow).toHaveLength(1);
    const detail = result.inspectionWindow[0];
    expect(detail.inspectionId).toBe(99);
    expect(detail.inspectionCode).toBe("IQC-2026-0208");
    expect(detail.partNumber).toBe("GSK-NBR-003");
    expect(detail.partName).toBe("NBR Standard Gasket Kit");
    expect(detail.totalQty).toBe(100);
    expect(detail.defectQty).toBe(12);
    expect(detail.defectRate).toBe(0.12);
    expect(detail.result).toBe("FAIL");
    expect(detail.date).toBe("2026-02-24");
    expect(detail.scorePenalty).toBe(5);
  });
});

// ─── GRT Real-World Scenario ────────────────────────────────────────

describe("evaluateSupplierRisk — GRT real-world scenario", () => {
  it("correctly evaluates the failing Dongguan HuaTai gasket supplier", () => {
    const result = evaluateSupplierRisk({
      supplier: {
        id: 3,
        supplierCode: "SUP-015",
        supplierName: "Dongguan HuaTai Gaskets",
        category: "Gaskets",
        baseScore: 100,
        currentScore: 100,
        qualityRating: "C",
      },
      inspections: [
        makeInspection({
          id: 301,
          totalQty: 100,
          defectQty: 18,
          result: "FAIL",
        }),
        makeInspection({
          id: 302,
          totalQty: 300,
          defectQty: 45,
          result: "FAIL",
        }),
        makeInspection({
          id: 303,
          totalQty: 200,
          defectQty: 25,
          result: "FAIL",
        }),
        makeInspection({
          id: 304,
          totalQty: 100,
          defectQty: 12,
          result: "CONDITIONAL",
        }),
        makeInspection({
          id: 305,
          totalQty: 300,
          defectQty: 20,
          result: "CONDITIONAL",
        }),
      ],
    });

    // 120 defects / 1000 inspected = 12%
    expect(result.movingDefectRatePct).toBeCloseTo(12, 0);
    expect(result.status).toBe("RESTRICTED");
    expect(result.interlockTriggered).toBe(true);
    expect(result.currentScore).toBeLessThan(60);
    expect(result.inspectionWindow).toHaveLength(5);
    // Rate penalty + severe penalty + 3 FAIL deductions + interlock message
    expect(result.triggeredPenalties.length).toBeGreaterThanOrEqual(3);
  });

  it("correctly evaluates a clean Bosch supplier as ACTIVE", () => {
    const result = evaluateSupplierRisk({
      supplier: {
        id: 1,
        supplierCode: "SUP-001",
        supplierName: "Bosch Rexroth",
        category: "Hydraulic Components",
        baseScore: 100,
        currentScore: 100,
        qualityRating: "A",
      },
      inspections: [
        makeInspection({ id: 101, totalQty: 50, defectQty: 0 }),
        makeInspection({ id: 102, totalQty: 100, defectQty: 1 }),
        makeInspection({ id: 103, totalQty: 50, defectQty: 0 }),
        makeInspection({ id: 104, totalQty: 200, defectQty: 2 }),
        makeInspection({ id: 105, totalQty: 100, defectQty: 1 }),
      ],
    });

    // 4/500 = 0.8% → well below threshold
    expect(result.movingDefectRatePct).toBeLessThan(5);
    expect(result.currentScore).toBe(100);
    expect(result.status).toBe("ACTIVE");
    expect(result.triggeredPenalties).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════════
// tRPC PROCEDURE TESTS
// ════════════════════════════════════════════════════════════════════

describe("supplierRisk.dashboard", () => {
  it("returns all suppliers with risk evaluations", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.dashboard();

    expect(result).toHaveProperty("suppliers");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("generatedAt");
    expect(result).toHaveProperty("dataSource", "mock");
    expect(result.suppliers.length).toBeGreaterThanOrEqual(5);
  });

  it("includes correct summary counts", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.dashboard();
    const { summary } = result;

    expect(summary.total).toBe(result.suppliers.length);
    expect(summary.active + summary.warning + summary.restricted).toBe(
      summary.total
    );
    expect(summary.avgScore).toBeGreaterThan(0);
    expect(summary.avgScore).toBeLessThanOrEqual(100);
  });

  it("sorts suppliers: RESTRICTED first, then WARNING, then ACTIVE", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.dashboard();

    const statusOrder: Record<SupplierRiskStatus, number> = {
      RESTRICTED: 0,
      WARNING: 1,
      ACTIVE: 2,
    };

    for (let i = 1; i < result.suppliers.length; i++) {
      const prev = result.suppliers[i - 1];
      const curr = result.suppliers[i];
      const prevOrder = statusOrder[prev.status];
      const currOrder = statusOrder[curr.status];
      // Each supplier should have same or higher status order than previous
      expect(currOrder).toBeGreaterThanOrEqual(prevOrder);
    }
  });

  it("each supplier has required risk evaluation fields", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.dashboard();

    for (const s of result.suppliers) {
      expect(s).toHaveProperty("supplierId");
      expect(s).toHaveProperty("supplierCode");
      expect(s).toHaveProperty("supplierName");
      expect(s).toHaveProperty("previousScore");
      expect(s).toHaveProperty("currentScore");
      expect(s).toHaveProperty("movingDefectRate");
      expect(s).toHaveProperty("movingDefectRatePct");
      expect(s).toHaveProperty("status");
      expect(s).toHaveProperty("inspectionWindow");
      expect(s).toHaveProperty("triggeredPenalties");
      expect(s).toHaveProperty("interlockTriggered");
      expect(s).toHaveProperty("category");
      expect(s).toHaveProperty("qualityRating");
    }
  });

  it("includes at least one RESTRICTED supplier (Dongguan HuaTai)", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.dashboard();

    const restricted = result.suppliers.filter(
      (s) => s.status === "RESTRICTED"
    );
    expect(restricted.length).toBeGreaterThanOrEqual(1);
    expect(result.summary.restricted).toBeGreaterThanOrEqual(1);
  });

  it("includes at least one ACTIVE supplier (Bosch/Siemens)", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.dashboard();

    const active = result.suppliers.filter((s) => s.status === "ACTIVE");
    expect(active.length).toBeGreaterThanOrEqual(1);
    expect(result.summary.active).toBeGreaterThanOrEqual(1);
  });

  it("generatedAt is a valid ISO date string", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.dashboard();

    expect(new Date(result.generatedAt).toISOString()).toBe(
      result.generatedAt
    );
  });

  it("works with admin caller", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.dashboard();

    expect(result.suppliers.length).toBeGreaterThanOrEqual(5);
  });
});

describe("supplierRisk.evaluateOne", () => {
  it("returns found=true with evaluation for known supplier ID", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.evaluateOne({ supplierId: 1 });

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.result).toHaveProperty("supplierId", 1);
      expect(result.result).toHaveProperty("supplierCode");
      expect(result.result).toHaveProperty("currentScore");
      expect(result.result).toHaveProperty("status");
      expect(result.dataSource).toBe("mock");
    }
  });

  it("returns found=false for unknown supplier ID", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.evaluateOne({ supplierId: 9999 });

    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.error).toContain("9999");
      expect(result.error).toContain("not found");
    }
  });

  it("evaluates Bosch (ID 1) as ACTIVE with high score", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.evaluateOne({ supplierId: 1 });

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.result.status).toBe("ACTIVE");
      expect(result.result.currentScore).toBeGreaterThanOrEqual(85);
      expect(result.result.supplierCode).toBe("SUP-001");
    }
  });

  it("evaluates Dongguan HuaTai (ID 3) as RESTRICTED", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.evaluateOne({ supplierId: 3 });

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.result.status).toBe("RESTRICTED");
      expect(result.result.currentScore).toBeLessThan(60);
      expect(result.result.interlockTriggered).toBe(true);
    }
  });

  it("evaluates Siemens (ID 4) as ACTIVE (new supplier, limited data)", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.evaluateOne({ supplierId: 4 });

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.result.status).toBe("ACTIVE");
      expect(result.result.currentScore).toBe(100);
      expect(result.result.inspectionWindow).toHaveLength(2);
    }
  });

  it("returns full inspection window in result for known supplier", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.evaluateOne({ supplierId: 2 });

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.result.inspectionWindow.length).toBeGreaterThan(0);
      for (const insp of result.result.inspectionWindow) {
        expect(insp).toHaveProperty("inspectionId");
        expect(insp).toHaveProperty("inspectionCode");
        expect(insp).toHaveProperty("defectRate");
        expect(insp).toHaveProperty("date");
      }
    }
  });

  it("works with admin caller", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.evaluateOne({ supplierId: 1 });
    expect(result.found).toBe(true);
  });
});

describe("supplierRisk.override", () => {
  it("succeeds with correct CEO PIN", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.override({
      supplierId: 3,
      ceoPin: "888888",
      reason: "Strategic supplier, corrective action plan accepted",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.supplierId).toBe(3);
      expect(result.newStatus).toBe("WARNING");
      expect(result.overrideNote).toContain(
        "Strategic supplier, corrective action plan accepted"
      );
      expect(result.overrideNote).toContain("CEO override");
      expect(result.timestamp).toBeTruthy();
    }
  });

  it("fails with wrong CEO PIN", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.override({
      supplierId: 3,
      ceoPin: "000000",
      reason: "Attempt override",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid");
      expect(result.error).toContain("PIN");
    }
  });

  it("fails with short PIN (validation error)", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.supplierRisk.override({
        supplierId: 3,
        ceoPin: "12",
        reason: "Too short pin",
      })
    ).rejects.toThrow();
  });

  it("fails with empty reason (validation error)", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.supplierRisk.override({
        supplierId: 3,
        ceoPin: "888888",
        reason: "",
      })
    ).rejects.toThrow();
  });

  it("override timestamp is a valid ISO date string", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.override({
      supplierId: 3,
      ceoPin: "888888",
      reason: "Business continuity",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    }
  });

  it("works for any supplierId (not just mock data IDs)", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.override({
      supplierId: 99999,
      ceoPin: "888888",
      reason: "Override for non-existent supplier",
    });

    // Override is a mock operation, doesn't check supplier existence
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.supplierId).toBe(99999);
    }
  });

  it("works with admin caller", async () => {
    const caller = createAdminCaller();
    const result = await caller.supplierRisk.override({
      supplierId: 3,
      ceoPin: "888888",
      reason: "Admin override",
    });

    expect(result.success).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════
// AUTH GUARD TESTS
// ════════════════════════════════════════════════════════════════════

describe("supplierRisk — authentication guards", () => {
  it("rejects anonymous caller for dashboard", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.supplierRisk.dashboard()).rejects.toThrow();
  });

  it("rejects anonymous caller for evaluateOne", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.supplierRisk.evaluateOne({ supplierId: 1 })
    ).rejects.toThrow();
  });

  it("rejects anonymous caller for override", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.supplierRisk.override({
        supplierId: 3,
        ceoPin: "888888",
        reason: "Unauthorized attempt",
      })
    ).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════
// INPUT VALIDATION TESTS
// ════════════════════════════════════════════════════════════════════

describe("supplierRisk — input validation", () => {
  it("evaluateOne rejects non-numeric supplierId", async () => {
    const caller = createAdminCaller();
    await expect(
      // @ts-expect-error — testing runtime validation
      caller.supplierRisk.evaluateOne({ supplierId: "abc" })
    ).rejects.toThrow();
  });

  it("override rejects missing fields", async () => {
    const caller = createAdminCaller();
    await expect(
      // @ts-expect-error — testing runtime validation
      caller.supplierRisk.override({ supplierId: 1 })
    ).rejects.toThrow();
  });

  it("override rejects missing reason", async () => {
    const caller = createAdminCaller();
    await expect(
      // @ts-expect-error — testing runtime validation
      caller.supplierRisk.override({ supplierId: 1, ceoPin: "888888" })
    ).rejects.toThrow();
  });
});
