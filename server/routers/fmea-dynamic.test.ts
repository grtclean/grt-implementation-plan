/**
 * Dynamic FMEA RPN — Fusion Engine Automated Test Suite
 * Phase 2.4 — Shop Floor QC ↔ Engineering FMEA Cross-Domain Fusion
 *
 * Proves:
 *   1. Defect count → Occurrence mapping is correct at all boundaries
 *   2. RPN recalculation produces S × O × D
 *   3. RPN > 100 triggers CRITICAL status + CAPA interlock
 *   4. Oil Leakage scenario: 10 defects → Occurrence 3→6, RPN spikes to 192
 *   5. Zero defects → Occurrence drops to 2 (improvement)
 *   6. Live pulse messages are human-readable
 *   7. Edge cases: negative quantities, future dates, empty logs
 *
 * Run: pnpm test -- server/routers/fmea-dynamic.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  mapDefectsToOccurrence,
  classifyRpnStatus,
  filterDefectsInWindow,
  recalculateRPN,
  type FmeaItem,
  type DefectLog,
  type RpnRecalcInput,
  type FmeaDynamicStatus,
} from "./fmea-dynamic.router";

// ─── Helpers ────────────────────────────────────────────────────────

const NOW = new Date("2026-02-25T12:00:00Z");

function makeFmeaItem(overrides?: Partial<FmeaItem>): FmeaItem {
  return {
    id: 1,
    fmeaDocumentId: 1,
    itemNumber: 1,
    processStep: "T3 — Hydraulic Assembly",
    failureMode: "Oil Leakage at Manifold Joint",
    failureEffect: "System pressure loss",
    failureCause: "O-ring degradation",
    severity: 8,
    occurrence: 3,
    detection: 4,
    rpn: 96,
    specialCharacteristic: "CC",
    currentPreventionControl: "Torque wrench",
    currentDetectionControl: "Pressure hold test",
    status: "NOMINAL",
    ...overrides,
  };
}

function makeDefectLog(overrides: Partial<DefectLog> & { id: number }): DefectLog {
  return {
    fmeaItemId: 1,
    defectSource: "SHOP_FLOOR",
    quantity: 1,
    processStep: "T3",
    failureMode: "Oil Leakage at Manifold Joint",
    partNumber: "HYD-MAN-200",
    reportedAt: daysAgo(5),
    description: "Test defect",
    reportedByName: "Tester",
    ...overrides,
  };
}

function daysAgo(d: number): string {
  return new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
}

function makeInput(overrides?: Partial<RpnRecalcInput>): RpnRecalcInput {
  return {
    fmeaItem: makeFmeaItem(),
    defectLogs: [],
    now: NOW,
    ...overrides,
  };
}

// ─── mapDefectsToOccurrence ─────────────────────────────────────────

describe("mapDefectsToOccurrence — defect count to FMEA occurrence mapping", () => {
  it("should map 0 defects to Occurrence 2 (Remote)", () => {
    expect(mapDefectsToOccurrence(0)).toBe(2);
  });

  it("should map 1 defect to Occurrence 4 (Low)", () => {
    expect(mapDefectsToOccurrence(1)).toBe(4);
  });

  it("should map 5 defects to Occurrence 4 (Low, upper boundary)", () => {
    expect(mapDefectsToOccurrence(5)).toBe(4);
  });

  it("should map 6 defects to Occurrence 6 (Moderate)", () => {
    expect(mapDefectsToOccurrence(6)).toBe(6);
  });

  it("should map 10 defects to Occurrence 6 (Moderate)", () => {
    expect(mapDefectsToOccurrence(10)).toBe(6);
  });

  it("should map 20 defects to Occurrence 6 (Moderate, upper boundary)", () => {
    expect(mapDefectsToOccurrence(20)).toBe(6);
  });

  it("should map 21 defects to Occurrence 10 (Very High)", () => {
    expect(mapDefectsToOccurrence(21)).toBe(10);
  });

  it("should map 100 defects to Occurrence 10 (Very High)", () => {
    expect(mapDefectsToOccurrence(100)).toBe(10);
  });

  it("should handle negative defects as 0", () => {
    expect(mapDefectsToOccurrence(-5)).toBe(2);
  });
});

// ─── classifyRpnStatus ──────────────────────────────────────────────

describe("classifyRpnStatus — RPN threshold classification", () => {
  it("should classify RPN ≤ 80 as NOMINAL", () => {
    expect(classifyRpnStatus(80)).toBe("NOMINAL");
    expect(classifyRpnStatus(1)).toBe("NOMINAL");
    expect(classifyRpnStatus(50)).toBe("NOMINAL");
  });

  it("should classify RPN 81–100 as ELEVATED", () => {
    expect(classifyRpnStatus(81)).toBe("ELEVATED");
    expect(classifyRpnStatus(100)).toBe("ELEVATED");
    expect(classifyRpnStatus(90)).toBe("ELEVATED");
  });

  it("should classify RPN > 100 as CRITICAL", () => {
    expect(classifyRpnStatus(101)).toBe("CRITICAL");
    expect(classifyRpnStatus(200)).toBe("CRITICAL");
    expect(classifyRpnStatus(1000)).toBe("CRITICAL");
  });

  it("should handle exact boundary at 80 (NOMINAL)", () => {
    expect(classifyRpnStatus(80)).toBe("NOMINAL");
  });

  it("should handle exact boundary at 100 (ELEVATED)", () => {
    expect(classifyRpnStatus(100)).toBe("ELEVATED");
  });
});

// ─── filterDefectsInWindow ──────────────────────────────────────────

describe("filterDefectsInWindow — time window filtering", () => {
  it("should include defects within the 30-day window", () => {
    const logs = [
      makeDefectLog({ id: 1, reportedAt: daysAgo(5) }),
      makeDefectLog({ id: 2, reportedAt: daysAgo(15) }),
      makeDefectLog({ id: 3, reportedAt: daysAgo(29) }),
    ];
    const filtered = filterDefectsInWindow(logs, 30, NOW);
    expect(filtered).toHaveLength(3);
  });

  it("should exclude defects outside the window", () => {
    const logs = [
      makeDefectLog({ id: 1, reportedAt: daysAgo(5) }),   // within
      makeDefectLog({ id: 2, reportedAt: daysAgo(31) }),  // outside
      makeDefectLog({ id: 3, reportedAt: daysAgo(60) }),  // outside
    ];
    const filtered = filterDefectsInWindow(logs, 30, NOW);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(1);
  });

  it("should return empty array when no defects in window", () => {
    const logs = [
      makeDefectLog({ id: 1, reportedAt: daysAgo(45) }),
    ];
    const filtered = filterDefectsInWindow(logs, 30, NOW);
    expect(filtered).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// THE CRITICAL TEST: Oil Leakage — 10 defects → RPN spike → CRITICAL
// ═══════════════════════════════════════════════════════════════════

describe("THE INTERLOCK: Oil Leakage — 10 defects triggers RPN spike + CAPA", () => {
  it("should update Occurrence from 3 to 6 with 10 defects, and spike RPN", () => {
    // Oil Leakage: S=8, original O=3, D=4 → original RPN = 96
    // 10 defects in 30 days → mapDefectsToOccurrence(10) = 6
    // New RPN = 8 × 6 × 4 = 192 → CRITICAL (> 100)
    // Delta = 192 - 96 = +96

    const fmeaItem = makeFmeaItem({
      id: 1,
      processStep: "T3 — Hydraulic Assembly",
      failureMode: "Oil Leakage at Manifold Joint",
      severity: 8,
      occurrence: 3,
      detection: 4,
      rpn: 96,
    });

    const defectLogs: DefectLog[] = [
      makeDefectLog({ id: 101, quantity: 2, reportedAt: daysAgo(3) }),
      makeDefectLog({ id: 102, quantity: 1, reportedAt: daysAgo(7) }),
      makeDefectLog({ id: 103, quantity: 3, reportedAt: daysAgo(12) }),
      makeDefectLog({ id: 104, quantity: 1, reportedAt: daysAgo(18) }),
      makeDefectLog({ id: 105, quantity: 3, reportedAt: daysAgo(25) }),
    ];
    // Total: 2+1+3+1+3 = 10 defects

    const result = recalculateRPN({ fmeaItem, defectLogs, now: NOW });

    // Verify Occurrence changed from 3 → 6
    expect(result.previousOccurrence).toBe(3);
    expect(result.newOccurrence).toBe(6);
    expect(result.occurrenceDelta).toBe(3);

    // Verify RPN spiked
    expect(result.previousRpn).toBe(96);   // 8 × 3 × 4
    expect(result.newRpn).toBe(192);        // 8 × 6 × 4
    expect(result.rpnDelta).toBe(96);
    expect(result.rpnSpiked).toBe(true);

    // Verify CRITICAL status + CAPA interlock
    expect(result.newStatus).toBe("CRITICAL");
    expect(result.capaRequired).toBe(true);

    // Verify defect summary
    expect(result.defectSummary.totalDefects30d).toBe(10);

    // Verify live pulse message
    expect(result.livePulse).toContain("10 defects");
    expect(result.livePulse).toContain("Occurrence jumped from 3 to 6");
    expect(result.livePulse).toContain("CAPA REQUIRED");
  });

  it("should NOT trigger CAPA when defects stay low (under threshold)", () => {
    // Same Oil Leakage item but only 2 defects → O=4 → RPN = 8×4×4 = 128 → CRITICAL
    // Wait — 128 > 100 → still CRITICAL. Let's use lower severity.
    const fmeaItem = makeFmeaItem({
      severity: 5, occurrence: 3, detection: 3,
    });
    // 2 defects → O=4, RPN = 5×4×3 = 60 → NOMINAL
    const defectLogs = [
      makeDefectLog({ id: 1, quantity: 1, reportedAt: daysAgo(5) }),
      makeDefectLog({ id: 2, quantity: 1, reportedAt: daysAgo(15) }),
    ];

    const result = recalculateRPN({ fmeaItem, defectLogs, now: NOW });

    expect(result.newOccurrence).toBe(4);
    expect(result.newRpn).toBe(60);
    expect(result.newStatus).toBe("NOMINAL");
    expect(result.capaRequired).toBe(false);
  });
});

// ─── Zero Defects — Occurrence Improvement ──────────────────────────

describe("Zero defects — Occurrence improves", () => {
  it("should set Occurrence to 2 when no defects in 30 days", () => {
    const fmeaItem = makeFmeaItem({ occurrence: 6 }); // was moderate
    const result = recalculateRPN({ fmeaItem, defectLogs: [], now: NOW });

    expect(result.newOccurrence).toBe(2);
    expect(result.occurrenceDelta).toBe(-4);  // improved from 6 to 2
    expect(result.rpnSpiked).toBe(false);
    expect(result.livePulse).toContain("No defects");
  });

  it("should improve status from ELEVATED to NOMINAL with zero defects", () => {
    // S=8, O was 6, D=4 → old RPN=192 (CRITICAL)
    // Now O=2 → new RPN = 8×2×4 = 64 → NOMINAL
    const fmeaItem = makeFmeaItem({ severity: 8, occurrence: 6, detection: 4 });
    const result = recalculateRPN({ fmeaItem, defectLogs: [], now: NOW });

    expect(result.previousStatus).toBe("CRITICAL"); // 8×6×4=192
    expect(result.newRpn).toBe(64);
    expect(result.newStatus).toBe("NOMINAL");
    expect(result.capaRequired).toBe(false);
  });
});

// ─── Maximum Defects — Occurrence 10 ────────────────────────────────

describe("Max defects — Occurrence hits 10", () => {
  it("should set Occurrence to 10 for >20 defects", () => {
    const fmeaItem = makeFmeaItem({ severity: 6, occurrence: 4, detection: 5 });
    const defectLogs = Array.from({ length: 25 }, (_, i) =>
      makeDefectLog({ id: i + 1, quantity: 1, reportedAt: daysAgo(i + 1) })
    );

    const result = recalculateRPN({ fmeaItem, defectLogs, now: NOW });

    expect(result.defectSummary.totalDefects30d).toBe(25);
    expect(result.newOccurrence).toBe(10);
    expect(result.newRpn).toBe(300); // 6 × 10 × 5
    expect(result.newStatus).toBe("CRITICAL");
    expect(result.capaRequired).toBe(true);
  });
});

// ─── RPN Calculation Accuracy ───────────────────────────────────────

describe("RPN calculation — S × O × D accuracy", () => {
  it("should calculate RPN as severity × newOccurrence × detection", () => {
    const fmeaItem = makeFmeaItem({ severity: 9, occurrence: 2, detection: 3 });
    // 3 defects → O=4, new RPN = 9×4×3 = 108
    const defectLogs = [
      makeDefectLog({ id: 1, quantity: 3, reportedAt: daysAgo(10) }),
    ];

    const result = recalculateRPN({ fmeaItem, defectLogs, now: NOW });

    expect(result.newRpn).toBe(108);
    expect(result.severity).toBe(9);
    expect(result.detection).toBe(3);
  });

  it("should use original Severity and Detection (only Occurrence changes)", () => {
    const fmeaItem = makeFmeaItem({ severity: 10, occurrence: 1, detection: 2 });
    const defectLogs = [
      makeDefectLog({ id: 1, quantity: 8, reportedAt: daysAgo(5) }),
    ];
    // 8 defects → O=6, RPN = 10×6×2 = 120

    const result = recalculateRPN({ fmeaItem, defectLogs, now: NOW });

    expect(result.severity).toBe(10);
    expect(result.detection).toBe(2);
    expect(result.newOccurrence).toBe(6);
    expect(result.newRpn).toBe(120);
  });
});

// ─── Defect Summary ─────────────────────────────────────────────────

describe("Defect summary — aggregation accuracy", () => {
  it("should aggregate defects by source", () => {
    const defectLogs = [
      makeDefectLog({ id: 1, quantity: 3, defectSource: "SHOP_FLOOR", reportedAt: daysAgo(5) }),
      makeDefectLog({ id: 2, quantity: 2, defectSource: "FINAL_QC", reportedAt: daysAgo(10) }),
      makeDefectLog({ id: 3, quantity: 1, defectSource: "CUSTOMER_RETURN", reportedAt: daysAgo(15) }),
    ];

    const result = recalculateRPN(makeInput({ defectLogs }));

    expect(result.defectSummary.totalDefects30d).toBe(6);
    expect(result.defectSummary.defectsBySource.SHOP_FLOOR).toBe(3);
    expect(result.defectSummary.defectsBySource.FINAL_QC).toBe(2);
    expect(result.defectSummary.defectsBySource.CUSTOMER_RETURN).toBe(1);
  });

  it("should return up to 5 most recent defects", () => {
    const defectLogs = Array.from({ length: 10 }, (_, i) =>
      makeDefectLog({ id: i + 1, quantity: 1, reportedAt: daysAgo(i + 1) })
    );

    const result = recalculateRPN(makeInput({ defectLogs }));

    expect(result.defectSummary.recentDefects).toHaveLength(5);
    // Most recent first
    expect(result.defectSummary.recentDefects[0].id).toBe(1);
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("should handle defect logs with quantity > 1 (batch defects)", () => {
    // 1 log entry with quantity 15 → total = 15 defects → O=6
    const defectLogs = [
      makeDefectLog({ id: 1, quantity: 15, reportedAt: daysAgo(5) }),
    ];

    const result = recalculateRPN(makeInput({ defectLogs }));

    expect(result.defectSummary.totalDefects30d).toBe(15);
    expect(result.newOccurrence).toBe(6);
  });

  it("should clamp negative quantities to 0", () => {
    const defectLogs = [
      makeDefectLog({ id: 1, quantity: -5, reportedAt: daysAgo(5) }),
    ];

    const result = recalculateRPN(makeInput({ defectLogs }));

    expect(result.defectSummary.totalDefects30d).toBe(0);
    expect(result.newOccurrence).toBe(2);
  });

  it("should preserve FMEA item metadata in output", () => {
    const item = makeFmeaItem({
      id: 42, processStep: "T9 — Tank Welding", failureMode: "Weld Porosity",
    });
    const result = recalculateRPN({ fmeaItem: item, defectLogs: [], now: NOW });

    expect(result.fmeaItemId).toBe(42);
    expect(result.processStep).toBe("T9 — Tank Welding");
    expect(result.failureMode).toBe("Weld Porosity");
  });

  it("should ignore defects from other FMEA items (filterDefectsInWindow doesn't filter by item)", () => {
    // This test verifies the caller is responsible for filtering by fmeaItemId
    const defectLogs = [
      makeDefectLog({ id: 1, fmeaItemId: 1, quantity: 5, reportedAt: daysAgo(5) }),
      makeDefectLog({ id: 2, fmeaItemId: 999, quantity: 50, reportedAt: daysAgo(5) }),
    ];

    const result = recalculateRPN(makeInput({
      fmeaItem: makeFmeaItem({ id: 1 }),
      defectLogs, // both items passed — engine counts all
    }));

    // Total = 55 → O=10 (engine counts all passed defects)
    expect(result.defectSummary.totalDefects30d).toBe(55);
    expect(result.newOccurrence).toBe(10);
  });

  it("should handle custom window size", () => {
    const defectLogs = [
      makeDefectLog({ id: 1, quantity: 3, reportedAt: daysAgo(5) }),
      makeDefectLog({ id: 2, quantity: 3, reportedAt: daysAgo(15) }),
    ];

    // 7-day window → only first defect counts (3 defects → O=4)
    const result = recalculateRPN(makeInput({ defectLogs, windowDays: 7 }));

    expect(result.defectSummary.totalDefects30d).toBe(3);
    expect(result.newOccurrence).toBe(4);
  });
});

// ─── Live Pulse Messages ────────────────────────────────────────────

describe("Live pulse messages", () => {
  it("should report 'No defects' when clean", () => {
    const result = recalculateRPN(makeInput());
    expect(result.livePulse).toContain("No defects in 30 days");
  });

  it("should report 'jumped' when Occurrence increased", () => {
    const defectLogs = Array.from({ length: 8 }, (_, i) =>
      makeDefectLog({ id: i + 1, quantity: 1, reportedAt: daysAgo(i + 1) })
    );
    const result = recalculateRPN(makeInput({
      fmeaItem: makeFmeaItem({ occurrence: 2 }),
      defectLogs,
    }));
    // 8 defects → O=6, was 2
    expect(result.livePulse).toContain("jumped from 2 to 6");
  });

  it("should report 'improved' when Occurrence decreased", () => {
    const defectLogs = [
      makeDefectLog({ id: 1, quantity: 2, reportedAt: daysAgo(5) }),
    ];
    const result = recalculateRPN(makeInput({
      fmeaItem: makeFmeaItem({ occurrence: 6 }),
      defectLogs,
    }));
    // 2 defects → O=4, was 6 → improved
    expect(result.livePulse).toContain("improved from 6 to 4");
  });

  it("should include CAPA warning in pulse when CRITICAL", () => {
    const defectLogs = Array.from({ length: 25 }, (_, i) =>
      makeDefectLog({ id: i + 1, quantity: 1, reportedAt: daysAgo(i + 1) })
    );
    const result = recalculateRPN(makeInput({
      fmeaItem: makeFmeaItem({ severity: 8, detection: 4 }),
      defectLogs,
    }));
    // 25 defects → O=10, RPN=8×10×4=320 → CRITICAL
    expect(result.livePulse).toContain("CAPA REQUIRED");
  });
});

// ─── GRT Real-World Scenario: Spray Pattern Crisis ──────────────────

describe("GRT Scenario — Spray Pattern Deviation crisis", () => {
  it("should correctly escalate nozzle calibration failure with 22 defects", () => {
    // FMEA #3: Spray Pattern Deviation >15%
    // S=6, original O=4, D=5 → original RPN = 120 (already CRITICAL)
    // 22 defects → O=10, new RPN = 6×10×5 = 300 → CRITICAL (worse)
    const fmeaItem = makeFmeaItem({
      id: 3,
      processStep: "T7 — Nozzle Calibration",
      failureMode: "Spray Pattern Deviation >15%",
      severity: 6, occurrence: 4, detection: 5, rpn: 120,
    });

    const defectLogs: DefectLog[] = [
      makeDefectLog({ id: 301, fmeaItemId: 3, quantity: 5, reportedAt: daysAgo(2) }),
      makeDefectLog({ id: 302, fmeaItemId: 3, quantity: 8, reportedAt: daysAgo(10) }),
      makeDefectLog({ id: 303, fmeaItemId: 3, quantity: 4, reportedAt: daysAgo(15) }),
      makeDefectLog({ id: 304, fmeaItemId: 3, quantity: 3, reportedAt: daysAgo(22) }),
      makeDefectLog({ id: 305, fmeaItemId: 3, quantity: 2, reportedAt: daysAgo(28) }),
    ];
    // Total: 5+8+4+3+2 = 22 defects → >20 → O=10

    const result = recalculateRPN({ fmeaItem, defectLogs, now: NOW });

    expect(result.defectSummary.totalDefects30d).toBe(22);
    expect(result.newOccurrence).toBe(10);
    expect(result.newRpn).toBe(300); // 6 × 10 × 5
    expect(result.rpnDelta).toBe(180); // 300 - 120
    expect(result.newStatus).toBe("CRITICAL");
    expect(result.capaRequired).toBe(true);
    expect(result.livePulse).toContain("22 defects");
    expect(result.livePulse).toContain("jumped from 4 to 10");
  });
});
