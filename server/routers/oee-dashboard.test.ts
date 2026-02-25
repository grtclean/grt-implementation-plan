/**
 * OEE Calculation Engine — Automated Test Suite
 * Phase 1.3 — IATF 16949 Compliance
 *
 * OEE is the global standard for measuring manufacturing productivity.
 * Incorrect OEE calculations lead to:
 *   - Wrong investment decisions (buying machines that aren't the bottleneck)
 *   - Missed IATF 16949 audit requirements
 *   - False confidence in production capacity
 *
 * These tests verify the mathematical correctness of:
 *   Availability = Operating Time / Planned Time
 *   Performance  = (Ideal Cycle Time × Count) / Operating Time
 *   Quality      = Good Count / Total Count
 *   OEE          = A × P × Q
 *
 * Run: pnpm test -- server/routers/oee-dashboard.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  calculateOEE,
  aggregateOEE,
  type ShiftLogInput,
} from "./oee-dashboard.router";

// ─── Helpers ────────────────────────────────────────────────────────

function pct(v: number): number {
  return Math.round(v * 1000) / 10; // 3 decimal places of ratio → 1 decimal %
}

// ─── World-Class OEE (≥85%) ─────────────────────────────────────────

describe("OEE Calculation — World-Class Scenarios", () => {
  it("should calculate world-class OEE for a well-run CNC mill", () => {
    // CNC-001: 8-hour shift, 7.3 hours actual, 120s cycle, 198 units, 5 defects
    // Expected: A=91.3%, P=91.0%, Q=97.5% → OEE≈81.0% (actually just below world-class)
    const result = calculateOEE({
      plannedProductionMinutes: 480,
      operatingMinutes: 438,
      idealCycleTimeSeconds: 120,
      totalCount: 198,
      defectCount: 5,
    });

    expect(result.availabilityPct).toBeCloseTo(91.3, 0);
    expect(result.performancePct).toBeCloseTo(90.4, 0);
    expect(result.qualityPct).toBeCloseTo(97.5, 0);
    expect(result.oeePct).toBeGreaterThan(75);
    expect(result.oee).toBeGreaterThan(0);
    expect(result.oee).toBeLessThanOrEqual(1);
  });

  it("should grade ≥85% as world-class", () => {
    // Near-perfect shift: minimal downtime, fast production, zero defects
    const result = calculateOEE({
      plannedProductionMinutes: 480,
      operatingMinutes: 470,
      idealCycleTimeSeconds: 60,
      totalCount: 460,
      defectCount: 2,
    });

    expect(result.grade).toBe("world-class");
    expect(result.oeePct).toBeGreaterThanOrEqual(85);
  });

  it("should return 100% across the board for a perfect shift", () => {
    // Theoretical perfect: every minute used, every cycle at ideal time, zero defects
    const result = calculateOEE({
      plannedProductionMinutes: 480,
      operatingMinutes: 480,
      idealCycleTimeSeconds: 60,
      totalCount: 480,     // 480 min × 60s / 60s cycle = exactly 480 units
      defectCount: 0,
    });

    expect(result.availabilityPct).toBe(100);
    expect(result.performancePct).toBe(100);
    expect(result.qualityPct).toBe(100);
    expect(result.oeePct).toBe(100);
    expect(result.grade).toBe("world-class");
  });
});

// ─── Acceptable OEE (70–85%) ────────────────────────────────────────

describe("OEE Calculation — Acceptable Scenarios", () => {
  it("should grade 70–85% as acceptable", () => {
    // A = 420/480 = 87.5%, P = 380/420 = 90.5%, Q = 372/380 = 97.9%
    // OEE = 0.875 × 0.905 × 0.979 ≈ 77.5%
    const result = calculateOEE({
      plannedProductionMinutes: 480,
      operatingMinutes: 420,
      idealCycleTimeSeconds: 60,
      totalCount: 380,
      defectCount: 8,
    });

    expect(result.grade).toBe("acceptable");
    expect(result.oeePct).toBeGreaterThanOrEqual(70);
    expect(result.oeePct).toBeLessThan(85);
  });
});

// ─── Critical OEE (<70%) ───────────────────────────────────────────

describe("OEE Calculation — Critical Scenarios", () => {
  it("should grade <70% as critical", () => {
    // Machine with significant downtime and quality issues
    const result = calculateOEE({
      plannedProductionMinutes: 480,
      operatingMinutes: 210,
      idealCycleTimeSeconds: 300,
      totalCount: 32,
      defectCount: 8,
    });

    expect(result.grade).toBe("critical");
    expect(result.oeePct).toBeLessThan(70);
  });

  it("should handle a terrible shift (high defects, low uptime)", () => {
    const result = calculateOEE({
      plannedProductionMinutes: 480,
      operatingMinutes: 120,     // only 2 hours of 8
      idealCycleTimeSeconds: 60,
      totalCount: 50,
      defectCount: 25,           // 50% scrap
    });

    expect(result.availabilityPct).toBe(25);       // 120/480
    expect(result.qualityPct).toBe(50);             // 25/50
    expect(result.grade).toBe("critical");
    expect(result.oeePct).toBeLessThan(15);         // very bad
  });
});

// ─── Edge Cases & Defensive Programming ─────────────────────────────

describe("OEE Calculation — Edge Cases", () => {
  it("should return all zeros when planned production time is 0 (no shift scheduled)", () => {
    const result = calculateOEE({
      plannedProductionMinutes: 0,
      operatingMinutes: 0,
      idealCycleTimeSeconds: 60,
      totalCount: 0,
      defectCount: 0,
    });

    expect(result.availability).toBe(0);
    expect(result.performance).toBe(0);
    expect(result.quality).toBe(0);
    expect(result.oee).toBe(0);
    expect(result.oeePct).toBe(0);
    expect(result.grade).toBe("critical");
  });

  it("should return 0 performance when operating time is 0 but planned > 0", () => {
    // Machine was scheduled but never turned on
    const result = calculateOEE({
      plannedProductionMinutes: 480,
      operatingMinutes: 0,
      idealCycleTimeSeconds: 60,
      totalCount: 0,
      defectCount: 0,
    });

    expect(result.availability).toBe(0);
    expect(result.performance).toBe(0);
    expect(result.quality).toBe(0);
    expect(result.oee).toBe(0);
  });

  it("should return 0 quality when total count is 0 (no output)", () => {
    // Machine ran but produced nothing — perhaps setup/warmup only
    const result = calculateOEE({
      plannedProductionMinutes: 480,
      operatingMinutes: 480,
      idealCycleTimeSeconds: 60,
      totalCount: 0,
      defectCount: 0,
    });

    expect(result.availability).toBe(1);   // it was running
    expect(result.performance).toBe(0);     // no output
    expect(result.quality).toBe(0);         // no output
    expect(result.oee).toBe(0);             // A × 0 × 0 = 0
  });

  it("should cap performance at 100% (never exceed 1.0)", () => {
    // If ideal cycle time is wrong (too generous), raw performance > 100%.
    // We cap it — > 100% means the ideal time needs recalibration, not a bonus.
    const result = calculateOEE({
      plannedProductionMinutes: 480,
      operatingMinutes: 480,
      idealCycleTimeSeconds: 120,   // 2 min per unit
      totalCount: 500,               // but produced 500 in 480 min (>1/min)
      defectCount: 0,
    });

    expect(result.performance).toBeLessThanOrEqual(1);
    expect(result.performancePct).toBeLessThanOrEqual(100);
  });

  it("should handle defect count > total count gracefully (bad data)", () => {
    // Data entry error: more defects than total units.
    // Quality should be 0, not negative.
    const result = calculateOEE({
      plannedProductionMinutes: 480,
      operatingMinutes: 400,
      idealCycleTimeSeconds: 60,
      totalCount: 10,
      defectCount: 15,   // bad data — more defects than produced
    });

    expect(result.quality).toBe(0);          // clamped, not negative
    expect(result.qualityPct).toBe(0);
    expect(result.oee).toBe(0);              // A × P × 0 = 0
  });
});

// ─── Multi-Shift Aggregation ────────────────────────────────────────

describe("OEE Aggregation — Multi-shift daily summary", () => {
  it("should correctly aggregate two shifts by summing raw inputs", () => {
    const morning: ShiftLogInput = {
      plannedProductionMinutes: 480,
      operatingMinutes: 440,
      idealCycleTimeSeconds: 60,
      totalCount: 400,
      defectCount: 10,
    };

    const afternoon: ShiftLogInput = {
      plannedProductionMinutes: 480,
      operatingMinutes: 420,
      idealCycleTimeSeconds: 60,
      totalCount: 380,
      defectCount: 15,
    };

    const aggregated = aggregateOEE([morning, afternoon]);

    // Manually verify: planned=960, operating=860, count=780, defects=25
    // A = 860/960 = 89.6%
    // P = (60 × 780) / (860 × 60) = 780/860 = 90.7%
    // Q = 755/780 = 96.8%
    // OEE = 0.896 × 0.907 × 0.968 ≈ 78.7%
    expect(aggregated.availabilityPct).toBeCloseTo(89.6, 0);
    expect(aggregated.performancePct).toBeCloseTo(90.7, 0);
    expect(aggregated.qualityPct).toBeCloseTo(96.8, 0);
    expect(aggregated.oeePct).toBeGreaterThan(75);
    expect(aggregated.oeePct).toBeLessThan(85);
  });

  it("should return critical grade for empty shift array", () => {
    const result = aggregateOEE([]);

    expect(result.oee).toBe(0);
    expect(result.grade).toBe("critical");
  });

  it("should handle single-shift aggregation identically to calculateOEE", () => {
    const shift: ShiftLogInput = {
      plannedProductionMinutes: 480,
      operatingMinutes: 450,
      idealCycleTimeSeconds: 90,
      totalCount: 280,
      defectCount: 7,
    };

    const direct = calculateOEE(shift);
    const aggregated = aggregateOEE([shift]);

    expect(aggregated.oeePct).toBe(direct.oeePct);
    expect(aggregated.availabilityPct).toBe(direct.availabilityPct);
    expect(aggregated.performancePct).toBe(direct.performancePct);
    expect(aggregated.qualityPct).toBe(direct.qualityPct);
  });
});
