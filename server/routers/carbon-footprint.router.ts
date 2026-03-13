/**
 * Carbon Footprint & CBAM Compliance Engine + tRPC Router
 * Phase 3.4 — Product Carbon Footprint Tracking (产品碳足迹追踪)
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │               THE CARBON CALCULATION ENGINE                             │
 * │                                                                         │
 * │  ① SCOPE 3 (Materials)        ② SCOPE 2 (Energy)                       │
 * │  ┌───────────────────┐       ┌────────────────────┐                     │
 * │  │ BOM Explosion     │       │ Machine Routing    │                     │
 * │  │ × Material Mass   │       │ × kW per hour      │                     │
 * │  │ × CO₂/kg factor   │       │ × Grid CO₂ factor  │                     │
 * │  │ = Material CO₂    │       │ = Energy CO₂       │                     │
 * │  └────────┬──────────┘       └────────┬───────────┘                     │
 * │           │                            │                                │
 * │           └────────────┬───────────────┘                                │
 * │                        ▼                                                │
 * │  ③ AGGREGATE          ④ CLASSIFY          ⑤ DECLARE                    │
 * │  ┌──────────────┐   ┌──────────────┐    ┌──────────────────────┐       │
 * │  │ Total CO₂e = │   │ vs EU CBAM   │    │ COMPLIANT → ✅ Ship  │       │
 * │  │ Scope2+Scope3│   │ Threshold    │    │ AT_RISK   → ⚠ Alert │       │
 * │  └──────────────┘   └──────────────┘    │ NON_COMP  → 🛑 Block │       │
 * │                                          └──────────────────────┘       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * EU CBAM Thresholds (simplified for GRT industrial washing equipment):
 *   Standard machine:  2000 kg CO₂e
 *   Large machine:     5000 kg CO₂e
 *   Custom/complex:    8000 kg CO₂e
 *
 * Architecture: Pure calculation functions exported for Vitest.
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

// ─── Types ───────────────────────────────────────────────────────────

export type CbamStatus = "COMPLIANT" | "AT_RISK" | "NON_COMPLIANT";
export type CarbonScope = "SCOPE_2" | "SCOPE_3";

export interface MaterialCarbonFactor {
  partNumber: string;
  partName: string;
  materialType: string;
  co2PerKg: number;     // kg CO₂e per kg of raw material
  region: string;
}

export interface BomMaterial {
  partNumber: string;
  partName: string;
  qtyPerUnit: number;   // pieces per finished product
  weightKg: number;     // weight of each piece in kg
}

export interface MachineEnergyProfile {
  machineCode: string;
  machineName: string;
  kwPerHour: number;        // average kW draw
  gridCo2Factor: number;    // kg CO₂e per kWh (grid electricity mix)
}

export interface MachiningStep {
  machineCode: string;
  machineName: string;
  durationHours: number;    // standard machining time for this step
}

export interface MaterialCarbonResult {
  partNumber: string;
  partName: string;
  weightKg: number;
  co2PerKg: number;
  totalCo2: number;         // weightKg × co2PerKg × qtyPerUnit
  percentOfTotal: number;
}

export interface EnergyCarbonResult {
  machineCode: string;
  machineName: string;
  durationHours: number;
  kwPerHour: number;
  gridCo2Factor: number;
  energyKwh: number;        // durationHours × kwPerHour
  totalCo2: number;         // energyKwh × gridCo2Factor
  percentOfTotal: number;
}

export interface ProductFootprint {
  productCode: string;
  productName: string;
  materialCo2: number;      // Scope 3 total
  energyCo2: number;        // Scope 2 total
  totalCo2: number;         // materialCo2 + energyCo2
  euThreshold: number;
  status: CbamStatus;
  materialBreakdown: MaterialCarbonResult[];
  energyBreakdown: EnergyCarbonResult[];
  materialPercent: number;  // % of total from materials
  energyPercent: number;    // % of total from energy
}

export interface EcoSwapResult {
  productCode: string;
  beforeTotalCo2: number;
  afterTotalCo2: number;
  co2Reduction: number;
  reductionPercent: number;
  beforeStatus: CbamStatus;
  afterStatus: CbamStatus;
  swappedPart: string;
  oldMaterial: string;
  newMaterial: string;
}

export interface CbamDeclaration {
  declarationId: string;
  productCode: string;
  productName: string;
  declarationDate: string;
  totalCo2: number;
  materialCo2: number;
  energyCo2: number;
  euThreshold: number;
  status: CbamStatus;
  materialBreakdown: MaterialCarbonResult[];
  energyBreakdown: EnergyCarbonResult[];
  certifiedBy: string;
}

// ─── Pure Functions (exported for testing) ────────────────────────────

/**
 * Calculate Scope 3 material carbon for one BOM line item.
 * CO₂ = quantity × weight_per_piece × co2_per_kg_factor
 */
export function calculateMaterialLineCo2(
  qtyPerUnit: number,
  weightKg: number,
  co2PerKg: number,
): number {
  return Math.round(qtyPerUnit * weightKg * co2PerKg * 100) / 100;
}

/**
 * Calculate Scope 3 (Materials) — explode BOM and sum all material CO₂.
 * Returns per-part breakdown + total.
 */
export function calculateMaterialCarbon(
  bomMaterials: BomMaterial[],
  carbonFactors: MaterialCarbonFactor[],
): { total: number; breakdown: MaterialCarbonResult[] } {
  const factorMap = new Map(carbonFactors.map(f => [f.partNumber, f]));

  let total = 0;
  const breakdown: MaterialCarbonResult[] = [];

  for (const bom of bomMaterials) {
    const factor = factorMap.get(bom.partNumber);
    if (!factor) continue;

    const co2 = calculateMaterialLineCo2(bom.qtyPerUnit, bom.weightKg, factor.co2PerKg);
    total += co2;

    breakdown.push({
      partNumber: bom.partNumber,
      partName: bom.partName,
      weightKg: bom.weightKg * bom.qtyPerUnit,
      co2PerKg: factor.co2PerKg,
      totalCo2: co2,
      percentOfTotal: 0, // filled after total is known
    });
  }

  // Fill percentages
  for (const item of breakdown) {
    item.percentOfTotal = total > 0 ? Math.round((item.totalCo2 / total) * 10000) / 100 : 0;
  }

  return { total: Math.round(total * 100) / 100, breakdown };
}

/**
 * Calculate Scope 2 energy carbon for one machining step.
 * CO₂ = duration_hours × kW × grid_co2_factor
 */
export function calculateEnergyStepCo2(
  durationHours: number,
  kwPerHour: number,
  gridCo2Factor: number,
): number {
  return Math.round(durationHours * kwPerHour * gridCo2Factor * 100) / 100;
}

/**
 * Calculate Scope 2 (Energy) — sum machining energy across all steps.
 * Returns per-machine breakdown + total.
 */
export function calculateEnergyCarbon(
  machiningSteps: MachiningStep[],
  energyProfiles: MachineEnergyProfile[],
): { total: number; breakdown: EnergyCarbonResult[] } {
  const profileMap = new Map(energyProfiles.map(p => [p.machineCode, p]));

  let total = 0;
  const breakdown: EnergyCarbonResult[] = [];

  for (const step of machiningSteps) {
    const profile = profileMap.get(step.machineCode);
    if (!profile) continue;

    const energyKwh = step.durationHours * profile.kwPerHour;
    const co2 = calculateEnergyStepCo2(step.durationHours, profile.kwPerHour, profile.gridCo2Factor);
    total += co2;

    breakdown.push({
      machineCode: step.machineCode,
      machineName: step.machineName,
      durationHours: step.durationHours,
      kwPerHour: profile.kwPerHour,
      gridCo2Factor: profile.gridCo2Factor,
      energyKwh: Math.round(energyKwh * 100) / 100,
      totalCo2: co2,
      percentOfTotal: 0,
    });
  }

  for (const item of breakdown) {
    item.percentOfTotal = total > 0 ? Math.round((item.totalCo2 / total) * 10000) / 100 : 0;
  }

  return { total: Math.round(total * 100) / 100, breakdown };
}

/**
 * Classify CBAM status by comparing total CO₂ against EU threshold.
 *   - COMPLIANT:     total ≤ threshold × 0.9 (10% buffer)
 *   - AT_RISK:       threshold × 0.9 < total ≤ threshold
 *   - NON_COMPLIANT: total > threshold
 */
export function classifyCbamStatus(totalCo2: number, euThreshold: number): CbamStatus {
  if (totalCo2 > euThreshold) return "NON_COMPLIANT";
  if (totalCo2 > euThreshold * 0.9) return "AT_RISK";
  return "COMPLIANT";
}

/**
 * Calculate the full product carbon footprint.
 * Combines Scope 2 (energy) + Scope 3 (materials) and classifies.
 */
export function calculateProductFootprint(
  productCode: string,
  productName: string,
  bomMaterials: BomMaterial[],
  carbonFactors: MaterialCarbonFactor[],
  machiningSteps: MachiningStep[],
  energyProfiles: MachineEnergyProfile[],
  euThreshold: number,
): ProductFootprint {
  const material = calculateMaterialCarbon(bomMaterials, carbonFactors);
  const energy = calculateEnergyCarbon(machiningSteps, energyProfiles);
  const totalCo2 = Math.round((material.total + energy.total) * 100) / 100;
  const status = classifyCbamStatus(totalCo2, euThreshold);

  return {
    productCode,
    productName,
    materialCo2: material.total,
    energyCo2: energy.total,
    totalCo2,
    euThreshold,
    status,
    materialBreakdown: material.breakdown,
    energyBreakdown: energy.breakdown,
    materialPercent: totalCo2 > 0 ? Math.round((material.total / totalCo2) * 10000) / 100 : 0,
    energyPercent: totalCo2 > 0 ? Math.round((energy.total / totalCo2) * 10000) / 100 : 0,
  };
}

/**
 * Simulate an ECO material swap — recalculate footprint with a greener alternative.
 * Returns before/after comparison for ESG decision-making.
 */
export function simulateEcoSwap(
  originalFootprint: ProductFootprint,
  oldPartNumber: string,
  newPartNumber: string,
  newPartName: string,
  newCo2PerKg: number,
  bomMaterials: BomMaterial[],
  carbonFactors: MaterialCarbonFactor[],
  machiningSteps: MachiningStep[],
  energyProfiles: MachineEnergyProfile[],
  euThreshold: number,
): EcoSwapResult {
  // Create modified carbon factors with the swap
  const modifiedFactors = carbonFactors.map(f => {
    if (f.partNumber === oldPartNumber) {
      return { ...f, partNumber: newPartNumber, partName: newPartName, co2PerKg: newCo2PerKg };
    }
    return f;
  });

  // Create modified BOM with the swap
  const modifiedBom = bomMaterials.map(b => {
    if (b.partNumber === oldPartNumber) {
      return { ...b, partNumber: newPartNumber, partName: newPartName };
    }
    return b;
  });

  const afterFootprint = calculateProductFootprint(
    originalFootprint.productCode,
    originalFootprint.productName,
    modifiedBom,
    modifiedFactors,
    machiningSteps,
    energyProfiles,
    euThreshold,
  );

  const co2Reduction = Math.round((originalFootprint.totalCo2 - afterFootprint.totalCo2) * 100) / 100;
  const reductionPercent = originalFootprint.totalCo2 > 0
    ? Math.round((co2Reduction / originalFootprint.totalCo2) * 10000) / 100
    : 0;

  const oldFactor = carbonFactors.find(f => f.partNumber === oldPartNumber);

  return {
    productCode: originalFootprint.productCode,
    beforeTotalCo2: originalFootprint.totalCo2,
    afterTotalCo2: afterFootprint.totalCo2,
    co2Reduction,
    reductionPercent,
    beforeStatus: originalFootprint.status,
    afterStatus: afterFootprint.status,
    swappedPart: oldPartNumber,
    oldMaterial: oldFactor?.materialType ?? "Unknown",
    newMaterial: newPartName,
  };
}

/**
 * Generate a CBAM customs declaration record.
 */
export function generateCbamDeclaration(
  footprint: ProductFootprint,
  declId: string,
  certifiedBy: string,
  now: Date = new Date(),
): CbamDeclaration {
  return {
    declarationId: declId,
    productCode: footprint.productCode,
    productName: footprint.productName,
    declarationDate: now.toISOString(),
    totalCo2: footprint.totalCo2,
    materialCo2: footprint.materialCo2,
    energyCo2: footprint.energyCo2,
    euThreshold: footprint.euThreshold,
    status: footprint.status,
    materialBreakdown: footprint.materialBreakdown,
    energyBreakdown: footprint.energyBreakdown,
    certifiedBy,
  };
}

// ─── Mock Data — GRT Industrial Washing Equipment ─────────────────────

// 3 products: standard washer, ultrasonic cleaner, large custom system
const DEMO_PRODUCTS = [
  { code: "GWM-3000", name: "GRT Spray Wash Machine 3000", euThreshold: 2000 },
  { code: "GUC-500",  name: "GRT Ultrasonic Cleaner 500",  euThreshold: 2000 },
  { code: "GSC-200",  name: "GRT Custom Wash System 200",  euThreshold: 5000 },
];

// BOM materials with weights (per unit of finished product)
const DEMO_BOM_MATERIALS: BomMaterial[] = [
  // GWM-3000 BOM (Spray Wash Machine)
  { partNumber: "SS316-PLATE",    partName: "Stainless Steel 316L Plate",    qtyPerUnit: 8,  weightKg: 25.0 },
  { partNumber: "CS-FRAME",       partName: "Carbon Steel Frame Section",    qtyPerUnit: 4,  weightKg: 30.0 },
  { partNumber: "PUMP-HIGH-P",    partName: "High-Pressure Wash Pump",       qtyPerUnit: 2,  weightKg: 15.0 },
  { partNumber: "NOZZLE-SS",      partName: "SS Spray Nozzle Assembly",      qtyPerUnit: 12, weightKg: 0.8 },
  { partNumber: "HEATER-6KW",     partName: "Immersion Heater 6kW",          qtyPerUnit: 2,  weightKg: 5.0 },
  { partNumber: "PLC-SIEMENS",    partName: "Siemens S7-1200 PLC",           qtyPerUnit: 1,  weightKg: 1.2 },
  // GUC-500 BOM (Ultrasonic Cleaner)
  { partNumber: "SS316-PLATE",    partName: "Stainless Steel 316L Plate",    qtyPerUnit: 4,  weightKg: 15.0 },
  { partNumber: "TRANSDUCER-40K", partName: "40kHz Ultrasonic Transducer",   qtyPerUnit: 8,  weightKg: 2.0 },
  { partNumber: "HEATER-6KW",     partName: "Immersion Heater 6kW",          qtyPerUnit: 1,  weightKg: 5.0 },
  { partNumber: "PLC-SIEMENS",    partName: "Siemens S7-1200 PLC",           qtyPerUnit: 1,  weightKg: 1.2 },
  // GSC-200 BOM (Custom Large System)
  { partNumber: "SS316-PLATE",    partName: "Stainless Steel 316L Plate",    qtyPerUnit: 20, weightKg: 25.0 },
  { partNumber: "CS-FRAME",       partName: "Carbon Steel Frame Section",    qtyPerUnit: 12, weightKg: 30.0 },
  { partNumber: "PUMP-HIGH-P",    partName: "High-Pressure Wash Pump",       qtyPerUnit: 6,  weightKg: 15.0 },
  { partNumber: "NOZZLE-SS",      partName: "SS Spray Nozzle Assembly",      qtyPerUnit: 40, weightKg: 0.8 },
  { partNumber: "TRANSDUCER-40K", partName: "40kHz Ultrasonic Transducer",   qtyPerUnit: 20, weightKg: 2.0 },
  { partNumber: "HEATER-6KW",     partName: "Immersion Heater 6kW",          qtyPerUnit: 6,  weightKg: 5.0 },
  { partNumber: "PLC-SIEMENS",    partName: "Siemens S7-1200 PLC",           qtyPerUnit: 2,  weightKg: 1.2 },
];

// Carbon factors (kg CO₂e per kg of material)
const DEMO_CARBON_FACTORS: MaterialCarbonFactor[] = [
  { partNumber: "SS316-PLATE",    partName: "Stainless Steel 316L Plate",    materialType: "Stainless Steel 316L", co2PerKg: 6.15,  region: "CN" },
  { partNumber: "CS-FRAME",       partName: "Carbon Steel Frame Section",    materialType: "Carbon Steel Q235B",   co2PerKg: 2.33,  region: "CN" },
  { partNumber: "PUMP-HIGH-P",    partName: "High-Pressure Wash Pump",       materialType: "Cast Iron + Steel",    co2PerKg: 3.80,  region: "CN" },
  { partNumber: "NOZZLE-SS",      partName: "SS Spray Nozzle Assembly",      materialType: "Stainless Steel 304",  co2PerKg: 5.50,  region: "CN" },
  { partNumber: "HEATER-6KW",     partName: "Immersion Heater 6kW",          materialType: "Inconel + Copper",     co2PerKg: 8.20,  region: "CN" },
  { partNumber: "PLC-SIEMENS",    partName: "Siemens S7-1200 PLC",           materialType: "Electronics",          co2PerKg: 20.00, region: "DE" },
  { partNumber: "TRANSDUCER-40K", partName: "40kHz Ultrasonic Transducer",   materialType: "Piezo Ceramic + SS",   co2PerKg: 12.50, region: "CN" },
];

// Machine energy profiles
const DEMO_ENERGY_PROFILES: MachineEnergyProfile[] = [
  { machineCode: "CNC-001", machineName: "CNC Machining Center #1",  kwPerHour: 25.0, gridCo2Factor: 0.5810 }, // CN East Grid
  { machineCode: "CNC-002", machineName: "CNC Machining Center #2",  kwPerHour: 25.0, gridCo2Factor: 0.5810 },
  { machineCode: "WLD-TIG-001", machineName: "TIG Welding Station",  kwPerHour: 18.0, gridCo2Factor: 0.5810 },
  { machineCode: "LASER-001",  machineName: "Fiber Laser Cutter",    kwPerHour: 40.0, gridCo2Factor: 0.5810 },
  { machineCode: "HYD-BENCH-001", machineName: "Hydraulic Press",    kwPerHour: 30.0, gridCo2Factor: 0.5810 },
  { machineCode: "PAINT-001",  machineName: "Powder Coating Line",   kwPerHour: 15.0, gridCo2Factor: 0.5810 },
];

// Standard machining steps per product (routing)
const DEMO_MACHINING_STEPS: Record<string, MachiningStep[]> = {
  "GWM-3000": [
    { machineCode: "LASER-001",    machineName: "Fiber Laser Cutter",    durationHours: 6.0 },
    { machineCode: "CNC-001",      machineName: "CNC Machining Center",  durationHours: 8.0 },
    { machineCode: "HYD-BENCH-001", machineName: "Hydraulic Press",      durationHours: 3.0 },
    { machineCode: "WLD-TIG-001",  machineName: "TIG Welding Station",   durationHours: 12.0 },
    { machineCode: "PAINT-001",    machineName: "Powder Coating Line",   durationHours: 4.0 },
  ],
  "GUC-500": [
    { machineCode: "LASER-001",    machineName: "Fiber Laser Cutter",    durationHours: 3.0 },
    { machineCode: "CNC-001",      machineName: "CNC Machining Center",  durationHours: 4.0 },
    { machineCode: "WLD-TIG-001",  machineName: "TIG Welding Station",   durationHours: 6.0 },
    { machineCode: "PAINT-001",    machineName: "Powder Coating Line",   durationHours: 2.0 },
  ],
  "GSC-200": [
    { machineCode: "LASER-001",    machineName: "Fiber Laser Cutter",    durationHours: 16.0 },
    { machineCode: "CNC-001",      machineName: "CNC Machining Center",  durationHours: 20.0 },
    { machineCode: "CNC-002",      machineName: "CNC Machining Center",  durationHours: 12.0 },
    { machineCode: "HYD-BENCH-001", machineName: "Hydraulic Press",      durationHours: 8.0 },
    { machineCode: "WLD-TIG-001",  machineName: "TIG Welding Station",   durationHours: 24.0 },
    { machineCode: "PAINT-001",    machineName: "Powder Coating Line",   durationHours: 8.0 },
  ],
};

// Helper to get BOM for a specific product
function getBomForProduct(productCode: string): BomMaterial[] {
  const productBomMap: Record<string, string[]> = {
    "GWM-3000": ["SS316-PLATE:8:25", "CS-FRAME:4:30", "PUMP-HIGH-P:2:15", "NOZZLE-SS:12:0.8", "HEATER-6KW:2:5", "PLC-SIEMENS:1:1.2"],
    "GUC-500":  ["SS316-PLATE:4:15", "TRANSDUCER-40K:8:2", "HEATER-6KW:1:5", "PLC-SIEMENS:1:1.2"],
    "GSC-200":  ["SS316-PLATE:20:25", "CS-FRAME:12:30", "PUMP-HIGH-P:6:15", "NOZZLE-SS:40:0.8", "TRANSDUCER-40K:20:2", "HEATER-6KW:6:5", "PLC-SIEMENS:2:1.2"],
  };

  const items = productBomMap[productCode] ?? [];
  return items.map(spec => {
    const [partNumber, qty, weight] = spec.split(":");
    const fullPart = DEMO_BOM_MATERIALS.find(b => b.partNumber === partNumber);
    return {
      partNumber,
      partName: fullPart?.partName ?? partNumber,
      qtyPerUnit: Number(qty),
      weightKg: Number(weight),
    };
  });
}

// ─── tRPC Router ─────────────────────────────────────────────────────

export const carbonFootprintRouter = router({
  /**
   * Dashboard — all products with their carbon footprints
   */
  dashboard: protectedProcedure.query(async () => {
    const products = DEMO_PRODUCTS.map(p => {
      const bom = getBomForProduct(p.code);
      const steps = DEMO_MACHINING_STEPS[p.code] ?? [];
      return calculateProductFootprint(p.code, p.name, bom, DEMO_CARBON_FACTORS, steps, DEMO_ENERGY_PROFILES, p.euThreshold);
    });

    const totalCo2 = products.reduce((s, p) => s + p.totalCo2, 0);
    const compliant = products.filter(p => p.status === "COMPLIANT").length;
    const atRisk = products.filter(p => p.status === "AT_RISK").length;
    const nonCompliant = products.filter(p => p.status === "NON_COMPLIANT").length;

    return {
      products,
      summary: {
        totalProducts: products.length,
        totalCo2: Math.round(totalCo2 * 100) / 100,
        compliant,
        atRisk,
        nonCompliant,
      },
    };
  }),

  /**
   * Single product detail with full breakdown
   */
  productDetail: protectedProcedure
    .input(z.object({ productCode: z.string() }))
    .query(async ({ input }) => {
      const product = DEMO_PRODUCTS.find(p => p.code === input.productCode);
      if (!product) return null;

      const bom = getBomForProduct(product.code);
      const steps = DEMO_MACHINING_STEPS[product.code] ?? [];
      return calculateProductFootprint(product.code, product.name, bom, DEMO_CARBON_FACTORS, steps, DEMO_ENERGY_PROFILES, product.euThreshold);
    }),

  /**
   * Simulate ECO material swap — what-if analysis
   */
  simulateSwap: requirePermission('system:compliance:manage')
    .input(z.object({
      productCode: z.string(),
      oldPartNumber: z.string(),
      newPartNumber: z.string(),
      newPartName: z.string(),
      newCo2PerKg: z.number(),
    }))
    .mutation(async ({ input }) => {
      const product = DEMO_PRODUCTS.find(p => p.code === input.productCode);
      if (!product) return null;

      const bom = getBomForProduct(product.code);
      const steps = DEMO_MACHINING_STEPS[product.code] ?? [];
      const original = calculateProductFootprint(product.code, product.name, bom, DEMO_CARBON_FACTORS, steps, DEMO_ENERGY_PROFILES, product.euThreshold);

      return simulateEcoSwap(
        original,
        input.oldPartNumber,
        input.newPartNumber,
        input.newPartName,
        input.newCo2PerKg,
        bom,
        DEMO_CARBON_FACTORS,
        steps,
        DEMO_ENERGY_PROFILES,
        product.euThreshold,
      );
    }),

  /**
   * Generate CBAM customs declaration
   */
  generateDeclaration: requirePermission('system:compliance:manage')
    .input(z.object({ productCode: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const product = DEMO_PRODUCTS.find(p => p.code === input.productCode);
      if (!product) return null;

      const bom = getBomForProduct(product.code);
      const steps = DEMO_MACHINING_STEPS[product.code] ?? [];
      const footprint = calculateProductFootprint(product.code, product.name, bom, DEMO_CARBON_FACTORS, steps, DEMO_ENERGY_PROFILES, product.euThreshold);

      const declId = `CBAM-${product.code}-${Date.now()}`;
      const certifiedBy = (ctx as any).user?.username ?? "ESG Officer";

      return generateCbamDeclaration(footprint, declId, certifiedBy);
    }),
});
