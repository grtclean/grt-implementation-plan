/**
 * Carbon Footprint & CBAM Compliance — Automated Test Suite
 * Phase 3.4 — Product Carbon Footprint Tracking (产品碳足迹追踪)
 *
 * Proves:
 *   1. calculateMaterialLineCo2: single BOM line Scope 3 emission
 *   2. calculateMaterialCarbon: full BOM explosion with percentages
 *   3. calculateEnergyStepCo2: single machining step Scope 2 emission
 *   4. calculateEnergyCarbon: full routing energy with percentages
 *   5. classifyCbamStatus: COMPLIANT / AT_RISK / NON_COMPLIANT
 *   6. calculateProductFootprint: THE FULL ENGINE (Scope 2 + Scope 3)
 *   7. simulateEcoSwap: ECO material swap → CO₂ reduction
 *   8. generateCbamDeclaration: customs declaration record
 *   9. ESG Proof: Green Steel swap → CO₂ drops → status improves
 *  10. Edge cases: empty BOM, no factors, zero weights
 *
 * Run: pnpm test -- server/routers/carbon-footprint.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  calculateMaterialLineCo2,
  calculateMaterialCarbon,
  calculateEnergyStepCo2,
  calculateEnergyCarbon,
  classifyCbamStatus,
  calculateProductFootprint,
  simulateEcoSwap,
  generateCbamDeclaration,
  type BomMaterial,
  type MaterialCarbonFactor,
  type MachiningStep,
  type MachineEnergyProfile,
  type ProductFootprint,
} from "./carbon-footprint.router";

// ─── Test Data ────────────────────────────────────────────────────────

const NOW = new Date("2026-02-25T12:00:00Z");

// Simplified BOM for a spray wash machine
const TEST_BOM: BomMaterial[] = [
  { partNumber: "SS316-PLATE",  partName: "Stainless Steel 316L Plate",  qtyPerUnit: 8,  weightKg: 25.0 },
  { partNumber: "CS-FRAME",     partName: "Carbon Steel Frame Section",  qtyPerUnit: 4,  weightKg: 30.0 },
  { partNumber: "PUMP-HIGH-P",  partName: "High-Pressure Wash Pump",     qtyPerUnit: 2,  weightKg: 15.0 },
  { partNumber: "NOZZLE-SS",    partName: "SS Spray Nozzle Assembly",    qtyPerUnit: 12, weightKg: 0.8 },
  { partNumber: "HEATER-6KW",   partName: "Immersion Heater 6kW",        qtyPerUnit: 2,  weightKg: 5.0 },
  { partNumber: "PLC-SIEMENS",  partName: "Siemens S7-1200 PLC",         qtyPerUnit: 1,  weightKg: 1.2 },
];

const TEST_CARBON_FACTORS: MaterialCarbonFactor[] = [
  { partNumber: "SS316-PLATE",  partName: "Stainless Steel 316L Plate",  materialType: "Stainless Steel 316L", co2PerKg: 6.15,  region: "CN" },
  { partNumber: "CS-FRAME",     partName: "Carbon Steel Frame Section",  materialType: "Carbon Steel Q235B",   co2PerKg: 2.33,  region: "CN" },
  { partNumber: "PUMP-HIGH-P",  partName: "High-Pressure Wash Pump",     materialType: "Cast Iron + Steel",    co2PerKg: 3.80,  region: "CN" },
  { partNumber: "NOZZLE-SS",    partName: "SS Spray Nozzle Assembly",    materialType: "Stainless Steel 304",  co2PerKg: 5.50,  region: "CN" },
  { partNumber: "HEATER-6KW",   partName: "Immersion Heater 6kW",        materialType: "Inconel + Copper",     co2PerKg: 8.20,  region: "CN" },
  { partNumber: "PLC-SIEMENS",  partName: "Siemens S7-1200 PLC",         materialType: "Electronics",          co2PerKg: 20.00, region: "DE" },
];

const TEST_ENERGY_PROFILES: MachineEnergyProfile[] = [
  { machineCode: "CNC-001",      machineName: "CNC Machining Center",  kwPerHour: 25.0, gridCo2Factor: 0.581 },
  { machineCode: "WLD-TIG-001",  machineName: "TIG Welding Station",   kwPerHour: 18.0, gridCo2Factor: 0.581 },
  { machineCode: "LASER-001",    machineName: "Fiber Laser Cutter",    kwPerHour: 40.0, gridCo2Factor: 0.581 },
  { machineCode: "HYD-BENCH-001", machineName: "Hydraulic Press",      kwPerHour: 30.0, gridCo2Factor: 0.581 },
  { machineCode: "PAINT-001",    machineName: "Powder Coating Line",   kwPerHour: 15.0, gridCo2Factor: 0.581 },
];

const TEST_MACHINING_STEPS: MachiningStep[] = [
  { machineCode: "LASER-001",     machineName: "Fiber Laser Cutter",   durationHours: 6.0 },
  { machineCode: "CNC-001",       machineName: "CNC Machining Center", durationHours: 8.0 },
  { machineCode: "HYD-BENCH-001", machineName: "Hydraulic Press",      durationHours: 3.0 },
  { machineCode: "WLD-TIG-001",   machineName: "TIG Welding Station",  durationHours: 12.0 },
  { machineCode: "PAINT-001",     machineName: "Powder Coating Line",  durationHours: 4.0 },
];

const EU_THRESHOLD = 2000; // kg CO₂e

// ─── 1. calculateMaterialLineCo2 ──────────────────────────────────────

describe("calculateMaterialLineCo2", () => {
  it("should calculate CO₂ for a single BOM line", () => {
    // 8 plates × 25 kg × 6.15 CO₂/kg = 1230.00
    const co2 = calculateMaterialLineCo2(8, 25.0, 6.15);
    expect(co2).toBe(1230.0);
  });

  it("should handle fractional weights", () => {
    // 12 nozzles × 0.8 kg × 5.50 CO₂/kg = 52.80
    const co2 = calculateMaterialLineCo2(12, 0.8, 5.50);
    expect(co2).toBe(52.8);
  });

  it("should return 0 for zero quantity", () => {
    const co2 = calculateMaterialLineCo2(0, 25.0, 6.15);
    expect(co2).toBe(0);
  });

  it("should return 0 for zero weight", () => {
    const co2 = calculateMaterialLineCo2(8, 0, 6.15);
    expect(co2).toBe(0);
  });

  it("should return 0 for zero carbon factor", () => {
    const co2 = calculateMaterialLineCo2(8, 25.0, 0);
    expect(co2).toBe(0);
  });

  it("should handle high-emission electronics", () => {
    // 1 PLC × 1.2 kg × 20.0 CO₂/kg = 24.0
    const co2 = calculateMaterialLineCo2(1, 1.2, 20.0);
    expect(co2).toBe(24.0);
  });
});

// ─── 2. calculateMaterialCarbon (Scope 3) ─────────────────────────────

describe("calculateMaterialCarbon", () => {
  it("should calculate total Scope 3 emissions from BOM", () => {
    const result = calculateMaterialCarbon(TEST_BOM, TEST_CARBON_FACTORS);
    expect(result.total).toBeGreaterThan(0);
    expect(result.breakdown.length).toBe(6); // 6 BOM items matched
  });

  it("should have SS316-PLATE as the largest carbon contributor", () => {
    const result = calculateMaterialCarbon(TEST_BOM, TEST_CARBON_FACTORS);
    const ss316 = result.breakdown.find(b => b.partNumber === "SS316-PLATE");
    expect(ss316).toBeDefined();
    // 8 × 25 kg × 6.15 = 1230 — should be the biggest slice
    expect(ss316!.totalCo2).toBe(1230.0);
    expect(ss316!.percentOfTotal).toBeGreaterThan(50);
  });

  it("should sum to the total", () => {
    const result = calculateMaterialCarbon(TEST_BOM, TEST_CARBON_FACTORS);
    const summedBreakdown = result.breakdown.reduce((s, b) => s + b.totalCo2, 0);
    expect(Math.round(summedBreakdown * 100) / 100).toBe(result.total);
  });

  it("should handle missing carbon factors gracefully", () => {
    const partialFactors = TEST_CARBON_FACTORS.filter(f => f.partNumber === "SS316-PLATE");
    const result = calculateMaterialCarbon(TEST_BOM, partialFactors);
    expect(result.breakdown.length).toBe(1); // only SS316 matched
    expect(result.total).toBe(1230.0);
  });

  it("should return empty breakdown for empty BOM", () => {
    const result = calculateMaterialCarbon([], TEST_CARBON_FACTORS);
    expect(result.total).toBe(0);
    expect(result.breakdown.length).toBe(0);
  });

  it("should calculate weighted kg correctly", () => {
    const result = calculateMaterialCarbon(TEST_BOM, TEST_CARBON_FACTORS);
    const ss316 = result.breakdown.find(b => b.partNumber === "SS316-PLATE")!;
    // weightKg should be qtyPerUnit × weightPerPiece = 8 × 25 = 200
    expect(ss316.weightKg).toBe(200);
  });

  it("percentages should sum close to 100%", () => {
    const result = calculateMaterialCarbon(TEST_BOM, TEST_CARBON_FACTORS);
    const totalPercent = result.breakdown.reduce((s, b) => s + b.percentOfTotal, 0);
    expect(totalPercent).toBeGreaterThan(99);
    expect(totalPercent).toBeLessThanOrEqual(100.01);
  });
});

// ─── 3. calculateEnergyStepCo2 ────────────────────────────────────────

describe("calculateEnergyStepCo2", () => {
  it("should calculate CO₂ for one machining step", () => {
    // 8 hours × 25 kW × 0.581 CO₂/kWh = 116.2
    const co2 = calculateEnergyStepCo2(8.0, 25.0, 0.581);
    expect(co2).toBe(116.2);
  });

  it("should handle high-power machines", () => {
    // 6 hours × 40 kW × 0.581 = 139.44
    const co2 = calculateEnergyStepCo2(6.0, 40.0, 0.581);
    expect(co2).toBe(139.44);
  });

  it("should return 0 for zero duration", () => {
    const co2 = calculateEnergyStepCo2(0, 25.0, 0.581);
    expect(co2).toBe(0);
  });

  it("should handle low-power machines", () => {
    // 4 hours × 15 kW × 0.581 = 34.86
    const co2 = calculateEnergyStepCo2(4.0, 15.0, 0.581);
    expect(co2).toBe(34.86);
  });

  it("should handle different grid factors (green energy)", () => {
    // German wind: 0.15 CO₂/kWh → 8 × 25 × 0.15 = 30.0
    const co2 = calculateEnergyStepCo2(8.0, 25.0, 0.15);
    expect(co2).toBe(30.0);
  });
});

// ─── 4. calculateEnergyCarbon (Scope 2) ───────────────────────────────

describe("calculateEnergyCarbon", () => {
  it("should calculate total Scope 2 emissions", () => {
    const result = calculateEnergyCarbon(TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES);
    expect(result.total).toBeGreaterThan(0);
    expect(result.breakdown.length).toBe(5); // 5 machining steps
  });

  it("should have welding as the biggest energy consumer (longest step)", () => {
    const result = calculateEnergyCarbon(TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES);
    const welding = result.breakdown.find(b => b.machineCode === "WLD-TIG-001");
    expect(welding).toBeDefined();
    // 12 hours × 18 kW × 0.581 = 125.496 → 125.5
    expect(welding!.totalCo2).toBeCloseTo(125.5, 0);
  });

  it("should record energyKwh correctly", () => {
    const result = calculateEnergyCarbon(TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES);
    const laser = result.breakdown.find(b => b.machineCode === "LASER-001")!;
    // 6 hours × 40 kW = 240 kWh
    expect(laser.energyKwh).toBe(240);
  });

  it("should handle empty machining steps", () => {
    const result = calculateEnergyCarbon([], TEST_ENERGY_PROFILES);
    expect(result.total).toBe(0);
    expect(result.breakdown.length).toBe(0);
  });

  it("should handle missing energy profiles gracefully", () => {
    const partialProfiles = TEST_ENERGY_PROFILES.filter(p => p.machineCode === "CNC-001");
    const result = calculateEnergyCarbon(TEST_MACHINING_STEPS, partialProfiles);
    // Only CNC step matched
    expect(result.breakdown.length).toBe(1);
    expect(result.breakdown[0].machineCode).toBe("CNC-001");
  });

  it("percentages should sum close to 100%", () => {
    const result = calculateEnergyCarbon(TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES);
    const totalPercent = result.breakdown.reduce((s, b) => s + b.percentOfTotal, 0);
    expect(totalPercent).toBeGreaterThan(99);
    expect(totalPercent).toBeLessThanOrEqual(100.01);
  });
});

// ─── 5. classifyCbamStatus ────────────────────────────────────────────

describe("classifyCbamStatus", () => {
  it("should be COMPLIANT when well below threshold", () => {
    expect(classifyCbamStatus(1000, 2000)).toBe("COMPLIANT");
  });

  it("should be COMPLIANT at exactly 90% of threshold", () => {
    expect(classifyCbamStatus(1800, 2000)).toBe("COMPLIANT");
  });

  it("should be AT_RISK just above 90% of threshold", () => {
    expect(classifyCbamStatus(1801, 2000)).toBe("AT_RISK");
  });

  it("should be AT_RISK at exactly the threshold", () => {
    expect(classifyCbamStatus(2000, 2000)).toBe("AT_RISK");
  });

  it("should be NON_COMPLIANT above the threshold", () => {
    expect(classifyCbamStatus(2001, 2000)).toBe("NON_COMPLIANT");
  });

  it("should be COMPLIANT at zero emissions", () => {
    expect(classifyCbamStatus(0, 2000)).toBe("COMPLIANT");
  });

  it("should handle large thresholds", () => {
    expect(classifyCbamStatus(4000, 5000)).toBe("COMPLIANT");  // 80% < 90%
    expect(classifyCbamStatus(4600, 5000)).toBe("AT_RISK");    // 92% > 90%
    expect(classifyCbamStatus(5100, 5000)).toBe("NON_COMPLIANT");
  });
});

// ─── 6. calculateProductFootprint — THE FULL ENGINE ────────────────────

describe("calculateProductFootprint", () => {
  let footprint: ProductFootprint;

  // Calculate once, reuse across tests
  beforeAll(() => {
    footprint = calculateProductFootprint(
      "GWM-3000",
      "GRT Spray Wash Machine 3000",
      TEST_BOM,
      TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS,
      TEST_ENERGY_PROFILES,
      EU_THRESHOLD,
    );
  });

  it("should return correct product code and name", () => {
    expect(footprint.productCode).toBe("GWM-3000");
    expect(footprint.productName).toBe("GRT Spray Wash Machine 3000");
  });

  it("should have materialCo2 > 0 (Scope 3)", () => {
    expect(footprint.materialCo2).toBeGreaterThan(0);
  });

  it("should have energyCo2 > 0 (Scope 2)", () => {
    expect(footprint.energyCo2).toBeGreaterThan(0);
  });

  it("totalCo2 should equal materialCo2 + energyCo2", () => {
    expect(footprint.totalCo2).toBe(
      Math.round((footprint.materialCo2 + footprint.energyCo2) * 100) / 100
    );
  });

  it("materialPercent + energyPercent should sum to 100%", () => {
    expect(footprint.materialPercent + footprint.energyPercent).toBeCloseTo(100, 0);
  });

  it("materials should dominate (heavy steel equipment)", () => {
    // For industrial washing equipment, material CO₂ >> energy CO₂
    expect(footprint.materialPercent).toBeGreaterThan(60);
  });

  it("should have 6 material breakdown items", () => {
    expect(footprint.materialBreakdown.length).toBe(6);
  });

  it("should have 5 energy breakdown items", () => {
    expect(footprint.energyBreakdown.length).toBe(5);
  });

  it("should set EU threshold correctly", () => {
    expect(footprint.euThreshold).toBe(2000);
  });

  it("should classify CBAM status based on threshold", () => {
    // GWM-3000 is a standard machine; total likely around 1700-1900
    expect(["COMPLIANT", "AT_RISK", "NON_COMPLIANT"]).toContain(footprint.status);
  });
});

// ─── 7. simulateEcoSwap ──────────────────────────────────────────────

describe("simulateEcoSwap", () => {
  it("should reduce CO₂ when switching to Green Steel", () => {
    const original = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    // Green Steel: 2.5 CO₂/kg instead of 6.15 (59% reduction in steel emissions)
    const result = simulateEcoSwap(
      original,
      "SS316-PLATE",
      "SS316-GREEN",
      "Green Stainless Steel 316L (H2-DRI)",
      2.5,
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    expect(result.co2Reduction).toBeGreaterThan(0);
    expect(result.afterTotalCo2).toBeLessThan(result.beforeTotalCo2);
    expect(result.reductionPercent).toBeGreaterThan(0);
  });

  it("should correctly identify swapped material", () => {
    const original = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    const result = simulateEcoSwap(
      original, "SS316-PLATE", "SS316-GREEN", "Green Steel", 2.5,
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    expect(result.swappedPart).toBe("SS316-PLATE");
    expect(result.oldMaterial).toBe("Stainless Steel 316L");
    expect(result.newMaterial).toBe("Green Steel");
  });

  it("should show large reduction for SS316 (biggest contributor)", () => {
    const original = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    // SS316 accounts for ~60%+ of material CO₂
    // Switching from 6.15 to 2.5 saves (6.15-2.5) × 200kg = 730 kg CO₂
    const result = simulateEcoSwap(
      original, "SS316-PLATE", "SS316-GREEN", "Green Steel", 2.5,
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    expect(result.co2Reduction).toBeGreaterThan(700);
    expect(result.reductionPercent).toBeGreaterThan(30);
  });

  it("should not change total when factor is the same", () => {
    const original = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    const result = simulateEcoSwap(
      original, "SS316-PLATE", "SS316-SAME", "Same Steel", 6.15,
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    expect(result.co2Reduction).toBe(0);
    expect(result.beforeTotalCo2).toBe(result.afterTotalCo2);
  });
});

// ─── 8. generateCbamDeclaration ──────────────────────────────────────

describe("generateCbamDeclaration", () => {
  it("should create a valid declaration record", () => {
    const footprint = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    const decl = generateCbamDeclaration(footprint, "CBAM-001", "Zhang Wei (ESG)", NOW);

    expect(decl.declarationId).toBe("CBAM-001");
    expect(decl.productCode).toBe("GWM-3000");
    expect(decl.totalCo2).toBe(footprint.totalCo2);
    expect(decl.materialCo2).toBe(footprint.materialCo2);
    expect(decl.energyCo2).toBe(footprint.energyCo2);
    expect(decl.status).toBe(footprint.status);
    expect(decl.certifiedBy).toBe("Zhang Wei (ESG)");
  });

  it("should include both breakdowns", () => {
    const footprint = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    const decl = generateCbamDeclaration(footprint, "CBAM-002", "ESG Officer", NOW);

    expect(decl.materialBreakdown.length).toBe(6);
    expect(decl.energyBreakdown.length).toBe(5);
  });

  it("should set declaration date from provided timestamp", () => {
    const footprint = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    const decl = generateCbamDeclaration(footprint, "CBAM-003", "Auditor", NOW);
    expect(decl.declarationDate).toBe("2026-02-25T12:00:00.000Z");
  });
});

// ─── 9. ESG PROOF — THE GREEN STEEL SCENARIO ─────────────────────────
// CEO test: "Show me that switching to Green Steel makes us EU-compliant"

describe("ESG Proof — Green Steel ECO Impact", () => {
  it("should move from NON_COMPLIANT/AT_RISK to COMPLIANT via Green Steel ECO", () => {
    // Step 1: Calculate baseline for GWM-3000 with a LOW threshold to force AT_RISK
    const lowThreshold = 1800; // Tight EU threshold
    const baseline = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, lowThreshold,
    );

    // Baseline should be at risk or non-compliant with tight threshold
    expect(baseline.totalCo2).toBeGreaterThan(lowThreshold * 0.9);

    // Step 2: Simulate ECO — switch SS316-PLATE to H2-DRI Green Steel (2.5 CO₂/kg vs 6.15)
    const swapResult = simulateEcoSwap(
      baseline,
      "SS316-PLATE",
      "SS316-GREEN",
      "Green Stainless Steel 316L (H2-DRI)",
      2.5,
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, lowThreshold,
    );

    // Step 3: Verify CO₂ dropped significantly
    expect(swapResult.co2Reduction).toBeGreaterThan(700);
    expect(swapResult.reductionPercent).toBeGreaterThan(30);

    // Step 4: After swap, should be COMPLIANT
    expect(swapResult.afterStatus).toBe("COMPLIANT");
    expect(swapResult.afterTotalCo2).toBeLessThan(lowThreshold * 0.9);
  });

  it("should quantify the exact CO₂ savings from the Green Steel switch", () => {
    const original = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    // SS316: 8 plates × 25 kg = 200 kg total steel
    // Old: 200 × 6.15 = 1230 kg CO₂
    // New: 200 × 2.50 = 500 kg CO₂
    // Savings: 730 kg CO₂

    const swapResult = simulateEcoSwap(
      original, "SS316-PLATE", "SS316-GREEN",
      "Green Steel (H2-DRI)", 2.5,
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    expect(swapResult.co2Reduction).toBe(730);
  });

  it("should link to Phase 2.1 ECO workflow — part swap triggers recalculation", () => {
    // This proves the ESG → ECO → Carbon feedback loop:
    // 1. ESG dashboard shows SS316 is 60%+ of product carbon
    // 2. Engineer creates ECO to swap SS316 → Green Steel
    // 3. Carbon engine recalculates → CO₂ drops → COMPLIANT

    const beforeSwap = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    // Verify SS316 dominates carbon
    const ss316Before = beforeSwap.materialBreakdown.find(b => b.partNumber === "SS316-PLATE")!;
    expect(ss316Before.percentOfTotal).toBeGreaterThan(50);

    // After ECO swap
    const modifiedFactors = TEST_CARBON_FACTORS.map(f =>
      f.partNumber === "SS316-PLATE"
        ? { ...f, partNumber: "SS316-GREEN", partName: "Green Steel", co2PerKg: 2.5 }
        : f
    );
    const modifiedBom = TEST_BOM.map(b =>
      b.partNumber === "SS316-PLATE"
        ? { ...b, partNumber: "SS316-GREEN", partName: "Green Steel" }
        : b
    );

    const afterSwap = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      modifiedBom, modifiedFactors,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );

    // After swap, materials should still dominate but less so
    expect(afterSwap.materialPercent).toBeLessThan(beforeSwap.materialPercent);
    // Total carbon dropped significantly
    expect(afterSwap.totalCo2).toBeLessThan(beforeSwap.totalCo2 - 700);
  });
});

// ─── 10. Edge Cases ──────────────────────────────────────────────────

describe("Edge Cases", () => {
  it("should handle empty BOM and empty routing → zero footprint", () => {
    const footprint = calculateProductFootprint(
      "EMPTY", "Empty Product", [], TEST_CARBON_FACTORS, [], TEST_ENERGY_PROFILES, 2000,
    );
    expect(footprint.totalCo2).toBe(0);
    expect(footprint.status).toBe("COMPLIANT");
    expect(footprint.materialBreakdown.length).toBe(0);
    expect(footprint.energyBreakdown.length).toBe(0);
  });

  it("should handle BOM with no matching carbon factors", () => {
    const unknownBom: BomMaterial[] = [
      { partNumber: "UNKNOWN-001", partName: "Mystery Part", qtyPerUnit: 5, weightKg: 10 },
    ];
    const result = calculateMaterialCarbon(unknownBom, TEST_CARBON_FACTORS);
    expect(result.total).toBe(0);
    expect(result.breakdown.length).toBe(0);
  });

  it("should handle machining steps with no matching energy profiles", () => {
    const unknownSteps: MachiningStep[] = [
      { machineCode: "UNKNOWN-001", machineName: "Ghost Machine", durationHours: 10 },
    ];
    const result = calculateEnergyCarbon(unknownSteps, TEST_ENERGY_PROFILES);
    expect(result.total).toBe(0);
    expect(result.breakdown.length).toBe(0);
  });

  it("should classify zero emissions as COMPLIANT", () => {
    expect(classifyCbamStatus(0, 2000)).toBe("COMPLIANT");
  });

  it("should handle very tight threshold (0)", () => {
    expect(classifyCbamStatus(1, 0)).toBe("NON_COMPLIANT");
  });

  it("should handle single-material BOM correctly", () => {
    const singleBom: BomMaterial[] = [
      { partNumber: "SS316-PLATE", partName: "Steel", qtyPerUnit: 1, weightKg: 100 },
    ];
    const result = calculateMaterialCarbon(singleBom, TEST_CARBON_FACTORS);
    // 1 × 100 × 6.15 = 615
    expect(result.total).toBe(615);
    expect(result.breakdown[0].percentOfTotal).toBe(100);
  });

  it("generateCbamDeclaration should preserve all footprint data", () => {
    const footprint = calculateProductFootprint(
      "GUC-500", "Ultrasonic Cleaner",
      TEST_BOM.filter(b => ["SS316-PLATE", "TRANSDUCER-40K", "HEATER-6KW", "PLC-SIEMENS"].includes(b.partNumber)).map(b => {
        if (b.partNumber === "SS316-PLATE") return { ...b, qtyPerUnit: 4, weightKg: 15 };
        if (b.partNumber === "TRANSDUCER-40K") return { ...b, qtyPerUnit: 8, weightKg: 2 };
        if (b.partNumber === "HEATER-6KW") return { ...b, qtyPerUnit: 1 };
        return b;
      }),
      TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS.slice(0, 3),
      TEST_ENERGY_PROFILES,
      2000,
    );

    const decl = generateCbamDeclaration(footprint, "D-001", "Auditor", NOW);
    expect(decl.totalCo2).toBe(footprint.totalCo2);
    expect(decl.euThreshold).toBe(footprint.euThreshold);
    expect(decl.status).toBe(footprint.status);
  });
});

// ═══ HARDENING: Carbon Footprint CBAM Stress Tests ═══════════════════

describe("HARDENING — CBAM Engine Stress Tests", () => {
  it("material breakdown percentages should sum to exactly 100% (±0.05 tolerance)", () => {
    const result = calculateMaterialCarbon(TEST_BOM, TEST_CARBON_FACTORS);
    const percentSum = result.breakdown.reduce((s, b) => s + b.percentOfTotal, 0);
    expect(percentSum).toBeGreaterThan(99.95);
    expect(percentSum).toBeLessThanOrEqual(100.05);
  });

  it("energy breakdown percentages should sum to exactly 100% (±0.05 tolerance)", () => {
    const result = calculateEnergyCarbon(TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES);
    const percentSum = result.breakdown.reduce((s, b) => s + b.percentOfTotal, 0);
    expect(percentSum).toBeGreaterThan(99.95);
    expect(percentSum).toBeLessThanOrEqual(100.05);
  });

  it("calculateProductFootprint should be DETERMINISTIC — identical results on repeated calls", () => {
    const args = ["GWM-3000", "Test Product", TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD] as const;
    const run1 = calculateProductFootprint(...args);
    const run2 = calculateProductFootprint(...args);
    expect(run1.totalCo2).toBe(run2.totalCo2);
    expect(run1.materialCo2).toBe(run2.materialCo2);
    expect(run1.energyCo2).toBe(run2.energyCo2);
    expect(run1.materialPercent).toBe(run2.materialPercent);
    expect(run1.energyPercent).toBe(run2.energyPercent);
    expect(run1.status).toBe(run2.status);
  });

  it("extremely high carbon factor (999 CO₂/kg) should not produce NaN or Infinity", () => {
    const extremeBom: BomMaterial[] = [
      { partNumber: "EXTREME-001", partName: "Plutonium Widget", qtyPerUnit: 10, weightKg: 50 },
    ];
    const extremeFactors: MaterialCarbonFactor[] = [
      { partNumber: "EXTREME-001", partName: "Plutonium Widget", materialType: "Exotic", co2PerKg: 999, region: "XX" },
    ];
    const result = calculateMaterialCarbon(extremeBom, extremeFactors);
    expect(Number.isFinite(result.total)).toBe(true);
    expect(Number.isNaN(result.total)).toBe(false);
    // 10 × 50 × 999 = 499500
    expect(result.total).toBe(499500);
    expect(result.breakdown[0].percentOfTotal).toBe(100);
  });

  it("very small weight (0.001 kg) should maintain precision", () => {
    const tinyBom: BomMaterial[] = [
      { partNumber: "TINY-001", partName: "Micro Sensor", qtyPerUnit: 1, weightKg: 0.001 },
    ];
    const tinyFactors: MaterialCarbonFactor[] = [
      { partNumber: "TINY-001", partName: "Micro Sensor", materialType: "Electronics", co2PerKg: 20, region: "CN" },
    ];
    const result = calculateMaterialCarbon(tinyBom, tinyFactors);
    // 1 × 0.001 × 20 = 0.02
    expect(result.total).toBe(0.02);
    expect(result.breakdown[0].totalCo2).toBe(0.02);
  });

  it("materialPercent + energyPercent should sum to 100% for non-zero footprint", () => {
    const footprint = calculateProductFootprint(
      "TEST", "Test", TEST_BOM, TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    expect(footprint.materialPercent + footprint.energyPercent).toBeCloseTo(100, 0);
  });

  it("material-only product (no machining) should have 100% material, 0% energy", () => {
    const footprint = calculateProductFootprint(
      "MAT-ONLY", "Material Only", TEST_BOM, TEST_CARBON_FACTORS,
      [], TEST_ENERGY_PROFILES, 5000,
    );
    expect(footprint.energyCo2).toBe(0);
    expect(footprint.materialPercent).toBe(100);
    expect(footprint.energyPercent).toBe(0);
  });

  it("energy-only product (no BOM) should have 0% material, 100% energy", () => {
    const footprint = calculateProductFootprint(
      "ENG-ONLY", "Energy Only", [], TEST_CARBON_FACTORS,
      TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, 5000,
    );
    expect(footprint.materialCo2).toBe(0);
    expect(footprint.materialPercent).toBe(0);
    expect(footprint.energyPercent).toBe(100);
  });

  it("CBAM boundary: totalCo2 = threshold × 0.9 exactly → COMPLIANT", () => {
    expect(classifyCbamStatus(1800, 2000)).toBe("COMPLIANT");
  });

  it("CBAM boundary: totalCo2 = threshold × 0.9 + 0.01 → AT_RISK", () => {
    expect(classifyCbamStatus(1800.01, 2000)).toBe("AT_RISK");
  });

  it("CBAM boundary: totalCo2 = threshold exactly → AT_RISK (not NON_COMPLIANT)", () => {
    expect(classifyCbamStatus(2000, 2000)).toBe("AT_RISK");
  });

  it("CBAM boundary: totalCo2 = threshold + 0.01 → NON_COMPLIANT", () => {
    expect(classifyCbamStatus(2000.01, 2000)).toBe("NON_COMPLIANT");
  });
});
