/**
 * Carbon Footprint & CBAM Compliance Engine — Comprehensive Unit Test Suite
 * Tests ALL exported pure functions + ALL 4 tRPC procedures + auth guards.
 *
 * Pure functions tested:
 *   1. calculateMaterialLineCo2
 *   2. calculateMaterialCarbon (Scope 3)
 *   3. calculateEnergyStepCo2
 *   4. calculateEnergyCarbon (Scope 2)
 *   5. classifyCbamStatus
 *   6. calculateProductFootprint (full engine)
 *   7. simulateEcoSwap
 *   8. generateCbamDeclaration
 *
 * tRPC procedures tested:
 *   9. carbonFootprint.dashboard
 *  10. carbonFootprint.productDetail
 *  11. carbonFootprint.simulateSwap
 *  12. carbonFootprint.generateDeclaration
 *  13. Auth guards (anonymous rejection for all 4 procedures)
 *
 * Run: npx vitest run server/routers/carbon-footprint.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminCaller, createAnonymousCaller } from "../_test/trpc-test-utils";
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
  type CbamStatus,
  type CbamDeclaration,
  type EcoSwapResult,
} from "./carbon-footprint.router";

// No DB mock needed -- this router uses only in-memory mock data (no requireDb)

beforeEach(() => {
  vi.clearAllMocks();
});

// ---- Test Data -----------------------------------------------------------

const NOW = new Date("2026-03-01T10:00:00Z");

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
  { machineCode: "CNC-001",       machineName: "CNC Machining Center",  kwPerHour: 25.0, gridCo2Factor: 0.581 },
  { machineCode: "WLD-TIG-001",   machineName: "TIG Welding Station",   kwPerHour: 18.0, gridCo2Factor: 0.581 },
  { machineCode: "LASER-001",     machineName: "Fiber Laser Cutter",    kwPerHour: 40.0, gridCo2Factor: 0.581 },
  { machineCode: "HYD-BENCH-001", machineName: "Hydraulic Press",       kwPerHour: 30.0, gridCo2Factor: 0.581 },
  { machineCode: "PAINT-001",     machineName: "Powder Coating Line",   kwPerHour: 15.0, gridCo2Factor: 0.581 },
];

const TEST_MACHINING_STEPS: MachiningStep[] = [
  { machineCode: "LASER-001",     machineName: "Fiber Laser Cutter",   durationHours: 6.0 },
  { machineCode: "CNC-001",       machineName: "CNC Machining Center", durationHours: 8.0 },
  { machineCode: "HYD-BENCH-001", machineName: "Hydraulic Press",      durationHours: 3.0 },
  { machineCode: "WLD-TIG-001",   machineName: "TIG Welding Station",  durationHours: 12.0 },
  { machineCode: "PAINT-001",     machineName: "Powder Coating Line",  durationHours: 4.0 },
];

const EU_THRESHOLD = 2000;

// ==========================================================================
// 1. calculateMaterialLineCo2
// ==========================================================================

describe("calculateMaterialLineCo2", () => {
  it("should calculate CO2 for a single BOM line (8 x 25kg x 6.15 = 1230)", () => {
    expect(calculateMaterialLineCo2(8, 25.0, 6.15)).toBe(1230.0);
  });

  it("should handle fractional weights (12 x 0.8kg x 5.50 = 52.80)", () => {
    expect(calculateMaterialLineCo2(12, 0.8, 5.50)).toBe(52.8);
  });

  it("should return 0 for zero quantity", () => {
    expect(calculateMaterialLineCo2(0, 25.0, 6.15)).toBe(0);
  });

  it("should return 0 for zero weight", () => {
    expect(calculateMaterialLineCo2(8, 0, 6.15)).toBe(0);
  });

  it("should return 0 for zero carbon factor", () => {
    expect(calculateMaterialLineCo2(8, 25.0, 0)).toBe(0);
  });

  it("should handle high-emission electronics (1 x 1.2kg x 20.0 = 24.0)", () => {
    expect(calculateMaterialLineCo2(1, 1.2, 20.0)).toBe(24.0);
  });

  it("should round to 2 decimal places", () => {
    // 3 x 7.33 x 1.11 = 24.4089 -> 24.41
    expect(calculateMaterialLineCo2(3, 7.33, 1.11)).toBe(24.41);
  });
});

// ==========================================================================
// 2. calculateMaterialCarbon (Scope 3)
// ==========================================================================

describe("calculateMaterialCarbon", () => {
  it("should calculate total Scope 3 emissions from full BOM", () => {
    const result = calculateMaterialCarbon(TEST_BOM, TEST_CARBON_FACTORS);
    expect(result.total).toBeGreaterThan(0);
    expect(result.breakdown.length).toBe(6);
  });

  it("should identify SS316-PLATE as the largest contributor (>50%)", () => {
    const result = calculateMaterialCarbon(TEST_BOM, TEST_CARBON_FACTORS);
    const ss316 = result.breakdown.find(b => b.partNumber === "SS316-PLATE");
    expect(ss316).toBeDefined();
    expect(ss316!.totalCo2).toBe(1230.0); // 8 x 25 x 6.15
    expect(ss316!.percentOfTotal).toBeGreaterThan(50);
  });

  it("should have breakdown summing to total", () => {
    const result = calculateMaterialCarbon(TEST_BOM, TEST_CARBON_FACTORS);
    const summed = result.breakdown.reduce((s, b) => s + b.totalCo2, 0);
    expect(Math.round(summed * 100) / 100).toBe(result.total);
  });

  it("should handle partial carbon factors (missing some)", () => {
    const partialFactors = TEST_CARBON_FACTORS.filter(f => f.partNumber === "SS316-PLATE");
    const result = calculateMaterialCarbon(TEST_BOM, partialFactors);
    expect(result.breakdown.length).toBe(1);
    expect(result.total).toBe(1230.0);
  });

  it("should return empty breakdown for empty BOM", () => {
    const result = calculateMaterialCarbon([], TEST_CARBON_FACTORS);
    expect(result.total).toBe(0);
    expect(result.breakdown.length).toBe(0);
  });

  it("should calculate weighted kg correctly (qty x weight)", () => {
    const result = calculateMaterialCarbon(TEST_BOM, TEST_CARBON_FACTORS);
    const ss316 = result.breakdown.find(b => b.partNumber === "SS316-PLATE")!;
    expect(ss316.weightKg).toBe(200); // 8 x 25
  });

  it("should have percentages summing close to 100%", () => {
    const result = calculateMaterialCarbon(TEST_BOM, TEST_CARBON_FACTORS);
    const totalPercent = result.breakdown.reduce((s, b) => s + b.percentOfTotal, 0);
    expect(totalPercent).toBeGreaterThan(99.9);
    expect(totalPercent).toBeLessThanOrEqual(100.05);
  });

  it("should skip BOM items with no matching factor", () => {
    const unknownBom: BomMaterial[] = [
      { partNumber: "UNKNOWN-001", partName: "Mystery Part", qtyPerUnit: 5, weightKg: 10 },
    ];
    const result = calculateMaterialCarbon(unknownBom, TEST_CARBON_FACTORS);
    expect(result.total).toBe(0);
    expect(result.breakdown.length).toBe(0);
  });

  it("should handle single-material BOM with 100% allocation", () => {
    const singleBom: BomMaterial[] = [
      { partNumber: "SS316-PLATE", partName: "Steel", qtyPerUnit: 1, weightKg: 100 },
    ];
    const result = calculateMaterialCarbon(singleBom, TEST_CARBON_FACTORS);
    expect(result.total).toBe(615); // 1 x 100 x 6.15
    expect(result.breakdown[0].percentOfTotal).toBe(100);
  });
});

// ==========================================================================
// 3. calculateEnergyStepCo2
// ==========================================================================

describe("calculateEnergyStepCo2", () => {
  it("should calculate CO2 for one machining step (8h x 25kW x 0.581 = 116.2)", () => {
    expect(calculateEnergyStepCo2(8.0, 25.0, 0.581)).toBe(116.2);
  });

  it("should handle high-power machines (6h x 40kW x 0.581 = 139.44)", () => {
    expect(calculateEnergyStepCo2(6.0, 40.0, 0.581)).toBe(139.44);
  });

  it("should return 0 for zero duration", () => {
    expect(calculateEnergyStepCo2(0, 25.0, 0.581)).toBe(0);
  });

  it("should return 0 for zero kW", () => {
    expect(calculateEnergyStepCo2(8.0, 0, 0.581)).toBe(0);
  });

  it("should return 0 for zero grid factor", () => {
    expect(calculateEnergyStepCo2(8.0, 25.0, 0)).toBe(0);
  });

  it("should handle green energy grid (low factor)", () => {
    // Wind-heavy grid: 0.15 CO2/kWh -> 8 x 25 x 0.15 = 30.0
    expect(calculateEnergyStepCo2(8.0, 25.0, 0.15)).toBe(30.0);
  });

  it("should round to 2 decimal places", () => {
    // 4h x 15kW x 0.581 = 34.86
    expect(calculateEnergyStepCo2(4.0, 15.0, 0.581)).toBe(34.86);
  });
});

// ==========================================================================
// 4. calculateEnergyCarbon (Scope 2)
// ==========================================================================

describe("calculateEnergyCarbon", () => {
  it("should calculate total Scope 2 emissions from routing", () => {
    const result = calculateEnergyCarbon(TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES);
    expect(result.total).toBeGreaterThan(0);
    expect(result.breakdown.length).toBe(5);
  });

  it("should record energyKwh correctly (hours x kW)", () => {
    const result = calculateEnergyCarbon(TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES);
    const laser = result.breakdown.find(b => b.machineCode === "LASER-001")!;
    expect(laser.energyKwh).toBe(240); // 6h x 40kW
  });

  it("should handle empty machining steps", () => {
    const result = calculateEnergyCarbon([], TEST_ENERGY_PROFILES);
    expect(result.total).toBe(0);
    expect(result.breakdown.length).toBe(0);
  });

  it("should handle missing energy profiles gracefully", () => {
    const partialProfiles = TEST_ENERGY_PROFILES.filter(p => p.machineCode === "CNC-001");
    const result = calculateEnergyCarbon(TEST_MACHINING_STEPS, partialProfiles);
    expect(result.breakdown.length).toBe(1);
    expect(result.breakdown[0].machineCode).toBe("CNC-001");
  });

  it("should have percentages summing close to 100%", () => {
    const result = calculateEnergyCarbon(TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES);
    const totalPercent = result.breakdown.reduce((s, b) => s + b.percentOfTotal, 0);
    expect(totalPercent).toBeGreaterThan(99.9);
    expect(totalPercent).toBeLessThanOrEqual(100.05);
  });

  it("should skip steps with no matching profile", () => {
    const unknownSteps: MachiningStep[] = [
      { machineCode: "GHOST-001", machineName: "Ghost Machine", durationHours: 10 },
    ];
    const result = calculateEnergyCarbon(unknownSteps, TEST_ENERGY_PROFILES);
    expect(result.total).toBe(0);
    expect(result.breakdown.length).toBe(0);
  });

  it("should preserve gridCo2Factor and kwPerHour in breakdown", () => {
    const result = calculateEnergyCarbon(TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES);
    const cnc = result.breakdown.find(b => b.machineCode === "CNC-001")!;
    expect(cnc.kwPerHour).toBe(25.0);
    expect(cnc.gridCo2Factor).toBe(0.581);
    expect(cnc.durationHours).toBe(8.0);
  });
});

// ==========================================================================
// 5. classifyCbamStatus
// ==========================================================================

describe("classifyCbamStatus", () => {
  it("should be COMPLIANT when well below threshold", () => {
    expect(classifyCbamStatus(1000, 2000)).toBe("COMPLIANT");
  });

  it("should be COMPLIANT at exactly 90% of threshold", () => {
    expect(classifyCbamStatus(1800, 2000)).toBe("COMPLIANT");
  });

  it("should be AT_RISK just above 90% of threshold", () => {
    expect(classifyCbamStatus(1800.01, 2000)).toBe("AT_RISK");
  });

  it("should be AT_RISK at exactly the threshold", () => {
    expect(classifyCbamStatus(2000, 2000)).toBe("AT_RISK");
  });

  it("should be NON_COMPLIANT above the threshold", () => {
    expect(classifyCbamStatus(2001, 2000)).toBe("NON_COMPLIANT");
  });

  it("should be NON_COMPLIANT just above threshold", () => {
    expect(classifyCbamStatus(2000.01, 2000)).toBe("NON_COMPLIANT");
  });

  it("should be COMPLIANT at zero emissions", () => {
    expect(classifyCbamStatus(0, 2000)).toBe("COMPLIANT");
  });

  it("should handle large thresholds", () => {
    expect(classifyCbamStatus(4000, 5000)).toBe("COMPLIANT");   // 80% < 90%
    expect(classifyCbamStatus(4600, 5000)).toBe("AT_RISK");     // 92% > 90%
    expect(classifyCbamStatus(5100, 5000)).toBe("NON_COMPLIANT");
  });

  it("should handle zero threshold", () => {
    expect(classifyCbamStatus(1, 0)).toBe("NON_COMPLIANT");
  });

  it("should be COMPLIANT for zero total and zero threshold", () => {
    // 0 > 0 is false so not NON_COMPLIANT, 0 > 0*0.9 = 0 is false so not AT_RISK
    expect(classifyCbamStatus(0, 0)).toBe("COMPLIANT");
  });
});

// ==========================================================================
// 6. calculateProductFootprint (full engine)
// ==========================================================================

describe("calculateProductFootprint", () => {
  let footprint: ProductFootprint;

  beforeEach(() => {
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

  it("should have totalCo2 = materialCo2 + energyCo2", () => {
    expect(footprint.totalCo2).toBe(
      Math.round((footprint.materialCo2 + footprint.energyCo2) * 100) / 100
    );
  });

  it("should have materialPercent + energyPercent summing to ~100%", () => {
    expect(footprint.materialPercent + footprint.energyPercent).toBeCloseTo(100, 0);
  });

  it("should have materials dominating (>60% for heavy steel equipment)", () => {
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

  it("should assign a valid CBAM status", () => {
    expect(["COMPLIANT", "AT_RISK", "NON_COMPLIANT"]).toContain(footprint.status);
  });

  it("should be deterministic on repeated calls", () => {
    const run1 = calculateProductFootprint("X", "X", TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD);
    const run2 = calculateProductFootprint("X", "X", TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD);
    expect(run1.totalCo2).toBe(run2.totalCo2);
    expect(run1.materialCo2).toBe(run2.materialCo2);
    expect(run1.energyCo2).toBe(run2.energyCo2);
    expect(run1.status).toBe(run2.status);
  });

  it("should handle empty BOM + empty routing (zero footprint, COMPLIANT)", () => {
    const fp = calculateProductFootprint("EMPTY", "Empty", [], TEST_CARBON_FACTORS, [], TEST_ENERGY_PROFILES, 2000);
    expect(fp.totalCo2).toBe(0);
    expect(fp.materialCo2).toBe(0);
    expect(fp.energyCo2).toBe(0);
    expect(fp.status).toBe("COMPLIANT");
    expect(fp.materialBreakdown.length).toBe(0);
    expect(fp.energyBreakdown.length).toBe(0);
  });

  it("should have 100% material and 0% energy for material-only product", () => {
    const fp = calculateProductFootprint("MAT-ONLY", "Mat Only", TEST_BOM, TEST_CARBON_FACTORS, [], TEST_ENERGY_PROFILES, 5000);
    expect(fp.energyCo2).toBe(0);
    expect(fp.materialPercent).toBe(100);
    expect(fp.energyPercent).toBe(0);
  });

  it("should have 0% material and 100% energy for energy-only product", () => {
    const fp = calculateProductFootprint("ENG-ONLY", "Eng Only", [], TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, 5000);
    expect(fp.materialCo2).toBe(0);
    expect(fp.materialPercent).toBe(0);
    expect(fp.energyPercent).toBe(100);
  });

  it("should handle zero threshold correctly (NON_COMPLIANT for any nonzero CO2)", () => {
    const fp = calculateProductFootprint("TIGHT", "Tight", TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, 0);
    expect(fp.status).toBe("NON_COMPLIANT");
  });
});

// ==========================================================================
// 7. simulateEcoSwap
// ==========================================================================

describe("simulateEcoSwap", () => {
  it("should reduce CO2 when switching to Green Steel", () => {
    const original = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    const result = simulateEcoSwap(
      original, "SS316-PLATE", "SS316-GREEN", "Green Steel (H2-DRI)", 2.5,
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    expect(result.co2Reduction).toBeGreaterThan(0);
    expect(result.afterTotalCo2).toBeLessThan(result.beforeTotalCo2);
    expect(result.reductionPercent).toBeGreaterThan(0);
  });

  it("should correctly identify swapped material type", () => {
    const original = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    const result = simulateEcoSwap(
      original, "SS316-PLATE", "SS316-GREEN", "Green Steel", 2.5,
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    expect(result.swappedPart).toBe("SS316-PLATE");
    expect(result.oldMaterial).toBe("Stainless Steel 316L");
    expect(result.newMaterial).toBe("Green Steel");
  });

  it("should show exact 730 kg CO2 reduction for SS316 swap (8x25x(6.15-2.5))", () => {
    const original = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    const result = simulateEcoSwap(
      original, "SS316-PLATE", "SS316-GREEN", "Green Steel", 2.5,
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    expect(result.co2Reduction).toBe(730);
  });

  it("should not change total when factor is the same", () => {
    const original = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    const result = simulateEcoSwap(
      original, "SS316-PLATE", "SS316-SAME", "Same Steel", 6.15,
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    expect(result.co2Reduction).toBe(0);
    expect(result.beforeTotalCo2).toBe(result.afterTotalCo2);
  });

  it("should show reductionPercent > 30% for SS316 swap (biggest contributor)", () => {
    const original = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    const result = simulateEcoSwap(
      original, "SS316-PLATE", "SS316-GREEN", "Green Steel", 2.5,
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    expect(result.reductionPercent).toBeGreaterThan(30);
  });

  it("should preserve productCode", () => {
    const original = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    const result = simulateEcoSwap(
      original, "SS316-PLATE", "SS316-GREEN", "Green Steel", 2.5,
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    expect(result.productCode).toBe("GWM-3000");
  });

  it("should return Unknown for swapped part not in factors", () => {
    const original = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    const result = simulateEcoSwap(
      original, "NONEXISTENT", "NEW-001", "New Part", 1.0,
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    expect(result.oldMaterial).toBe("Unknown");
  });

  it("should handle higher CO2 swap (negative reduction)", () => {
    const original = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    // Swap to even worse material: 6.15 -> 10.0
    const result = simulateEcoSwap(
      original, "SS316-PLATE", "SS316-BAD", "Bad Steel", 10.0,
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    expect(result.co2Reduction).toBeLessThan(0);
    expect(result.afterTotalCo2).toBeGreaterThan(result.beforeTotalCo2);
  });
});

// ==========================================================================
// 8. generateCbamDeclaration
// ==========================================================================

describe("generateCbamDeclaration", () => {
  it("should create a valid declaration record", () => {
    const footprint = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
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
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    const decl = generateCbamDeclaration(footprint, "CBAM-002", "ESG Officer", NOW);
    expect(decl.materialBreakdown.length).toBe(6);
    expect(decl.energyBreakdown.length).toBe(5);
  });

  it("should set declarationDate from provided timestamp", () => {
    const footprint = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    const decl = generateCbamDeclaration(footprint, "CBAM-003", "Auditor", NOW);
    expect(decl.declarationDate).toBe("2026-03-01T10:00:00.000Z");
  });

  it("should use current date when timestamp not provided", () => {
    const footprint = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    const before = new Date().toISOString();
    const decl = generateCbamDeclaration(footprint, "CBAM-004", "Auto");
    const after = new Date().toISOString();
    expect(decl.declarationDate >= before).toBe(true);
    expect(decl.declarationDate <= after).toBe(true);
  });

  it("should preserve EU threshold from footprint", () => {
    const footprint = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    const decl = generateCbamDeclaration(footprint, "CBAM-005", "Checker", NOW);
    expect(decl.euThreshold).toBe(EU_THRESHOLD);
  });
});

// ==========================================================================
// 9. tRPC Procedure: carbonFootprint.dashboard
// ==========================================================================

describe("carbonFootprint.dashboard", () => {
  it("should return products array with summary", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.dashboard();
    expect(result).toHaveProperty("products");
    expect(result).toHaveProperty("summary");
    expect(Array.isArray(result.products)).toBe(true);
  });

  it("should return exactly 3 products (GWM-3000, GUC-500, GSC-200)", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.dashboard();
    expect(result.products.length).toBe(3);
    const codes = result.products.map((p: any) => p.productCode);
    expect(codes).toContain("GWM-3000");
    expect(codes).toContain("GUC-500");
    expect(codes).toContain("GSC-200");
  });

  it("should have summary with correct totalProducts count", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.dashboard();
    expect(result.summary.totalProducts).toBe(3);
  });

  it("should have summary with totalCo2 > 0", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.dashboard();
    expect(result.summary.totalCo2).toBeGreaterThan(0);
  });

  it("should have compliant + atRisk + nonCompliant = totalProducts", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.dashboard();
    const { compliant, atRisk, nonCompliant, totalProducts } = result.summary;
    expect(compliant + atRisk + nonCompliant).toBe(totalProducts);
  });

  it("each product should have material and energy breakdowns", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.dashboard();
    for (const product of result.products) {
      expect(product).toHaveProperty("materialBreakdown");
      expect(product).toHaveProperty("energyBreakdown");
      expect(product).toHaveProperty("totalCo2");
      expect(product).toHaveProperty("status");
      expect(product).toHaveProperty("materialPercent");
      expect(product).toHaveProperty("energyPercent");
    }
  });

  it("each product should have a valid CBAM status", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.dashboard();
    for (const product of result.products) {
      expect(["COMPLIANT", "AT_RISK", "NON_COMPLIANT"]).toContain(product.status);
    }
  });
});

// ==========================================================================
// 10. tRPC Procedure: carbonFootprint.productDetail
// ==========================================================================

describe("carbonFootprint.productDetail", () => {
  it("should return footprint for existing product GWM-3000", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.productDetail({ productCode: "GWM-3000" });
    expect(result).not.toBeNull();
    expect(result!.productCode).toBe("GWM-3000");
    expect(result!.productName).toBe("GRT Spray Wash Machine 3000");
    expect(result!.totalCo2).toBeGreaterThan(0);
  });

  it("should return footprint for GUC-500", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.productDetail({ productCode: "GUC-500" });
    expect(result).not.toBeNull();
    expect(result!.productCode).toBe("GUC-500");
    expect(result!.euThreshold).toBe(2000);
  });

  it("should return footprint for GSC-200 (custom, higher threshold)", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.productDetail({ productCode: "GSC-200" });
    expect(result).not.toBeNull();
    expect(result!.productCode).toBe("GSC-200");
    expect(result!.euThreshold).toBe(5000);
  });

  it("should return null for nonexistent product", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.productDetail({ productCode: "NONEXISTENT-999" });
    expect(result).toBeNull();
  });

  it("should include material and energy breakdowns", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.productDetail({ productCode: "GWM-3000" });
    expect(result!.materialBreakdown.length).toBeGreaterThan(0);
    expect(result!.energyBreakdown.length).toBeGreaterThan(0);
  });

  it("should have materialPercent + energyPercent = ~100%", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.productDetail({ productCode: "GWM-3000" });
    expect(result!.materialPercent + result!.energyPercent).toBeCloseTo(100, 0);
  });
});

// ==========================================================================
// 11. tRPC Procedure: carbonFootprint.simulateSwap
// ==========================================================================

describe("carbonFootprint.simulateSwap", () => {
  it("should return swap result for valid product + part", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.simulateSwap({
      productCode: "GWM-3000",
      oldPartNumber: "SS316-PLATE",
      newPartNumber: "SS316-GREEN",
      newPartName: "Green Steel (H2-DRI)",
      newCo2PerKg: 2.5,
    });
    expect(result).not.toBeNull();
    expect(result!.productCode).toBe("GWM-3000");
    expect(result!.co2Reduction).toBeGreaterThan(0);
    expect(result!.afterTotalCo2).toBeLessThan(result!.beforeTotalCo2);
  });

  it("should return null for nonexistent product", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.simulateSwap({
      productCode: "NONEXISTENT-999",
      oldPartNumber: "SS316-PLATE",
      newPartNumber: "SS316-GREEN",
      newPartName: "Green Steel",
      newCo2PerKg: 2.5,
    });
    expect(result).toBeNull();
  });

  it("should show zero reduction when swapping to same factor", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.simulateSwap({
      productCode: "GWM-3000",
      oldPartNumber: "SS316-PLATE",
      newPartNumber: "SS316-SAME",
      newPartName: "Same Steel",
      newCo2PerKg: 6.15,
    });
    expect(result).not.toBeNull();
    expect(result!.co2Reduction).toBe(0);
    expect(result!.beforeTotalCo2).toBe(result!.afterTotalCo2);
  });

  it("should preserve before and after status fields", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.simulateSwap({
      productCode: "GWM-3000",
      oldPartNumber: "SS316-PLATE",
      newPartNumber: "SS316-GREEN",
      newPartName: "Green Steel",
      newCo2PerKg: 2.5,
    });
    expect(result).not.toBeNull();
    expect(["COMPLIANT", "AT_RISK", "NON_COMPLIANT"]).toContain(result!.beforeStatus);
    expect(["COMPLIANT", "AT_RISK", "NON_COMPLIANT"]).toContain(result!.afterStatus);
  });

  it("should work for GUC-500 product", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.simulateSwap({
      productCode: "GUC-500",
      oldPartNumber: "SS316-PLATE",
      newPartNumber: "SS316-GREEN",
      newPartName: "Green Steel",
      newCo2PerKg: 2.5,
    });
    expect(result).not.toBeNull();
    expect(result!.productCode).toBe("GUC-500");
  });
});

// ==========================================================================
// 12. tRPC Procedure: carbonFootprint.generateDeclaration
// ==========================================================================

describe("carbonFootprint.generateDeclaration", () => {
  it("should generate a declaration for existing product", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.generateDeclaration({
      productCode: "GWM-3000",
    });
    expect(result).not.toBeNull();
    expect(result!.productCode).toBe("GWM-3000");
    expect(result!.productName).toBe("GRT Spray Wash Machine 3000");
    expect(result!.declarationId).toContain("CBAM-GWM-3000-");
    expect(result!.totalCo2).toBeGreaterThan(0);
  });

  it("should return null for nonexistent product", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.generateDeclaration({
      productCode: "NONEXISTENT-999",
    });
    expect(result).toBeNull();
  });

  it("should include material and energy breakdowns", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.generateDeclaration({
      productCode: "GWM-3000",
    });
    expect(result!.materialBreakdown.length).toBeGreaterThan(0);
    expect(result!.energyBreakdown.length).toBeGreaterThan(0);
  });

  it("should set declarationDate as ISO string", async () => {
    const caller = createAdminCaller();
    const before = new Date().toISOString();
    const result = await caller.carbonFootprint.generateDeclaration({
      productCode: "GWM-3000",
    });
    const after = new Date().toISOString();
    expect(result!.declarationDate >= before).toBe(true);
    expect(result!.declarationDate <= after).toBe(true);
  });

  it("should set certifiedBy from context user or fallback", async () => {
    const caller = createAdminCaller({ name: "Li Ming" });
    const result = await caller.carbonFootprint.generateDeclaration({
      productCode: "GWM-3000",
    });
    expect(result).not.toBeNull();
    // The router uses ctx.user?.username which may be undefined; falls back to "ESG Officer"
    expect(typeof result!.certifiedBy).toBe("string");
    expect(result!.certifiedBy.length).toBeGreaterThan(0);
  });

  it("should have a valid CBAM status in the declaration", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.generateDeclaration({
      productCode: "GWM-3000",
    });
    expect(["COMPLIANT", "AT_RISK", "NON_COMPLIANT"]).toContain(result!.status);
  });

  it("should include euThreshold in declaration", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.generateDeclaration({
      productCode: "GSC-200",
    });
    expect(result).not.toBeNull();
    expect(result!.euThreshold).toBe(5000);
  });

  it("should generate declarationId containing CBAM prefix and product code", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.generateDeclaration({
      productCode: "GWM-3000",
    });
    expect(result!.declarationId).toMatch(/^CBAM-GWM-3000-\d+$/);
  });

  it("should generate different declarationIds when calls are spaced apart", async () => {
    const caller = createAdminCaller();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T10:00:00Z"));
    const result1 = await caller.carbonFootprint.generateDeclaration({
      productCode: "GWM-3000",
    });
    vi.setSystemTime(new Date("2026-03-01T10:00:01Z")); // 1 second later
    const result2 = await caller.carbonFootprint.generateDeclaration({
      productCode: "GWM-3000",
    });
    vi.useRealTimers();
    expect(result1!.declarationId).not.toBe(result2!.declarationId);
  });
});

// ==========================================================================
// 13. Auth Guards -- anonymous callers should be rejected
// ==========================================================================

describe("carbonFootprint authentication guards", () => {
  it("rejects anonymous for dashboard", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.carbonFootprint.dashboard()).rejects.toThrow();
  });

  it("rejects anonymous for productDetail", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.carbonFootprint.productDetail({ productCode: "GWM-3000" })
    ).rejects.toThrow();
  });

  it("rejects anonymous for simulateSwap", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.carbonFootprint.simulateSwap({
        productCode: "GWM-3000",
        oldPartNumber: "SS316-PLATE",
        newPartNumber: "SS316-GREEN",
        newPartName: "Green Steel",
        newCo2PerKg: 2.5,
      })
    ).rejects.toThrow();
  });

  it("rejects anonymous for generateDeclaration", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.carbonFootprint.generateDeclaration({ productCode: "GWM-3000" })
    ).rejects.toThrow();
  });
});

// ==========================================================================
// HARDENING: Stress tests and edge cases
// ==========================================================================

describe("HARDENING: carbon footprint stress tests", () => {
  it("extremely high carbon factor (999 CO2/kg) should not produce NaN or Infinity", () => {
    const extremeBom: BomMaterial[] = [
      { partNumber: "EXTREME-001", partName: "Plutonium Widget", qtyPerUnit: 10, weightKg: 50 },
    ];
    const extremeFactors: MaterialCarbonFactor[] = [
      { partNumber: "EXTREME-001", partName: "Plutonium Widget", materialType: "Exotic", co2PerKg: 999, region: "XX" },
    ];
    const result = calculateMaterialCarbon(extremeBom, extremeFactors);
    expect(Number.isFinite(result.total)).toBe(true);
    expect(result.total).toBe(499500); // 10 x 50 x 999
  });

  it("very small weight (0.001 kg) should maintain precision", () => {
    const tinyBom: BomMaterial[] = [
      { partNumber: "TINY-001", partName: "Micro Sensor", qtyPerUnit: 1, weightKg: 0.001 },
    ];
    const tinyFactors: MaterialCarbonFactor[] = [
      { partNumber: "TINY-001", partName: "Micro Sensor", materialType: "Electronics", co2PerKg: 20, region: "CN" },
    ];
    const result = calculateMaterialCarbon(tinyBom, tinyFactors);
    expect(result.total).toBe(0.02); // 1 x 0.001 x 20
  });

  it("material + energy breakdown percentages sum correctly under rounding", () => {
    const fp = calculateProductFootprint(
      "TEST", "Test", TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    const matPctSum = fp.materialBreakdown.reduce((s, b) => s + b.percentOfTotal, 0);
    const engPctSum = fp.energyBreakdown.reduce((s, b) => s + b.percentOfTotal, 0);
    expect(matPctSum).toBeGreaterThan(99.9);
    expect(matPctSum).toBeLessThanOrEqual(100.05);
    expect(engPctSum).toBeGreaterThan(99.9);
    expect(engPctSum).toBeLessThanOrEqual(100.05);
  });

  it("eco swap with part not in BOM should produce zero change", () => {
    const original = calculateProductFootprint(
      "GWM-3000", "GRT Spray Wash Machine 3000",
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    const result = simulateEcoSwap(
      original, "NONEXISTENT-PART", "NEW-PART", "New", 1.0,
      TEST_BOM, TEST_CARBON_FACTORS, TEST_MACHINING_STEPS, TEST_ENERGY_PROFILES, EU_THRESHOLD,
    );
    // Part not in BOM or factors -> no material mapping changes -> same total
    expect(result.co2Reduction).toBe(0);
    expect(result.beforeTotalCo2).toBe(result.afterTotalCo2);
  });

  it("dashboard products totalCo2 matches sum of individual product details", async () => {
    const caller = createAdminCaller();
    const dashboard = await caller.carbonFootprint.dashboard();
    const total = dashboard.products.reduce((s: number, p: any) => s + p.totalCo2, 0);
    expect(Math.round(total * 100) / 100).toBe(dashboard.summary.totalCo2);
  });

  it("product detail matches corresponding dashboard product", async () => {
    const caller = createAdminCaller();
    const dashboard = await caller.carbonFootprint.dashboard();
    const detail = await caller.carbonFootprint.productDetail({ productCode: "GWM-3000" });
    const dashboardProduct = dashboard.products.find((p: any) => p.productCode === "GWM-3000");
    expect(detail!.totalCo2).toBe(dashboardProduct.totalCo2);
    expect(detail!.status).toBe(dashboardProduct.status);
    expect(detail!.materialCo2).toBe(dashboardProduct.materialCo2);
    expect(detail!.energyCo2).toBe(dashboardProduct.energyCo2);
  });
});

// ==========================================================================
// ESG Proof: Green Steel scenario (end-to-end via tRPC)
// ==========================================================================

describe("ESG Proof via tRPC: Green Steel swap moves toward compliance", () => {
  it("simulateSwap should show significant CO2 reduction for SS316 swap", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.simulateSwap({
      productCode: "GWM-3000",
      oldPartNumber: "SS316-PLATE",
      newPartNumber: "SS316-GREEN",
      newPartName: "Green Stainless Steel 316L (H2-DRI)",
      newCo2PerKg: 2.5,
    });
    expect(result).not.toBeNull();
    expect(result!.co2Reduction).toBeGreaterThan(700);
    expect(result!.reductionPercent).toBeGreaterThan(30);
    expect(result!.swappedPart).toBe("SS316-PLATE");
    expect(result!.oldMaterial).toBe("Stainless Steel 316L");
  });

  it("GSC-200 custom system swap should also reduce CO2", async () => {
    const caller = createAdminCaller();
    const result = await caller.carbonFootprint.simulateSwap({
      productCode: "GSC-200",
      oldPartNumber: "SS316-PLATE",
      newPartNumber: "SS316-GREEN",
      newPartName: "Green Steel",
      newCo2PerKg: 2.5,
    });
    expect(result).not.toBeNull();
    // GSC-200 has 20 x 25kg = 500kg of SS316, so savings = 500 x (6.15-2.5) = 1825
    expect(result!.co2Reduction).toBeGreaterThan(1800);
  });
});
