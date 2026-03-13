/**
 * Real-time Supplier Risk Rating — Fusion Engine + tRPC Router
 * Phase 2.2 — IQC (QMS) ↔ Procurement (SCM) Silo Breaker
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                  TWO-DOMAIN FUSION                                  │
 * │                                                                     │
 * │   ① QMS (Quality)              ② SCM (Procurement)                 │
 * │   ┌──────────────────┐         ┌───────────────────┐               │
 * │   │ IQC Inspections  │────────▶│ Supplier Risk     │               │
 * │   │ defect_qty/total │         │ Score + Status    │               │
 * │   └──────────────────┘         └───────────────────┘               │
 * │                                        │                            │
 * │                    THE INTERLOCK        ▼                            │
 * │              score < 60 ──▶ RESTRICTED ──▶ Block new POs           │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Scoring:
 *   Base score: 100
 *   Moving defect rate from last N inspections (default: 5)
 *   Penalty: rate > 5% → subtract (rate - 5%) × penalty_multiplier
 *   Additional: each FAIL disposition in window → extra deduction
 *
 * Status thresholds:
 *   ACTIVE      ≥ 85
 *   WARNING     60–84
 *   RESTRICTED  < 60
 *
 * Architecture: Pure calculation function exported for Vitest.
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

// ─── Types ───────────────────────────────────────────────────────────

export type SupplierRiskStatus = "ACTIVE" | "WARNING" | "RESTRICTED";

export interface IqcInspection {
  id: number;
  inspectionCode: string;
  supplierId: number;
  partNumber: string;
  partName: string;
  totalQty: number;
  defectQty: number;
  inspectionDate: string;       // ISO date string
  result: "PASS" | "FAIL" | "CONDITIONAL" | "PENDING";
  disposition: string;
}

export interface SupplierProfile {
  id: number;
  supplierCode: string;
  supplierName: string;
  category: string;
  baseScore: number;            // starting score (typically 100)
  currentScore: number;
  qualityRating: string;
}

export interface RiskEvalInput {
  supplier: SupplierProfile;
  inspections: IqcInspection[];  // most recent first
  windowSize?: number;           // default 5
  penaltyMultiplier?: number;    // default 500 (rate-points × multiplier = score deduction)
  failDeduction?: number;        // default 5 per FAIL disposition
}

export interface InspectionImpact {
  inspectionId: number;
  inspectionCode: string;
  partNumber: string;
  partName: string;
  totalQty: number;
  defectQty: number;
  defectRate: number;
  result: string;
  date: string;
  scorePenalty: number;
}

export interface RiskEvalResult {
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  previousScore: number;
  currentScore: number;
  movingDefectRate: number;         // 0–1
  movingDefectRatePct: number;      // 0–100
  status: SupplierRiskStatus;
  totalInspected: number;
  totalDefects: number;
  inspectionWindow: InspectionImpact[];
  triggeredPenalties: string[];     // human-readable penalty descriptions
  interlockTriggered: boolean;      // true if status changed to RESTRICTED
}

// ─── Pure Calculation Engine (fully unit-testable) ───────────────────

/**
 * Classify supplier status from risk score.
 */
export function classifyStatus(score: number): SupplierRiskStatus {
  if (score >= 85) return "ACTIVE";
  if (score >= 60) return "WARNING";
  return "RESTRICTED";
}

/**
 * Evaluate supplier risk from IQC inspection history.
 *
 * Algorithm:
 * 1. Take last `windowSize` inspections (default 5)
 * 2. Calculate moving defect rate = totalDefects / totalInspected
 * 3. If rate > 5%, penalty = (rate - 0.05) × penaltyMultiplier
 * 4. Each FAIL disposition in window → additional deduction
 * 5. Clamp score to [0, 100]
 * 6. Classify: ACTIVE ≥ 85, WARNING 60–84, RESTRICTED < 60
 *
 * THE INTERLOCK: If score drops below 60, status = RESTRICTED
 * (hypothetically blocks new PO creation in procurement module)
 */
export function evaluateSupplierRisk(input: RiskEvalInput): RiskEvalResult {
  const {
    supplier,
    inspections,
    windowSize = 5,
    penaltyMultiplier = 500,
    failDeduction = 5,
  } = input;

  // Take last N inspections (already sorted most recent first)
  const window = inspections.slice(0, windowSize);

  if (window.length === 0) {
    // No inspections — supplier keeps base score
    return {
      supplierId: supplier.id,
      supplierCode: supplier.supplierCode,
      supplierName: supplier.supplierName,
      previousScore: supplier.baseScore,
      currentScore: supplier.baseScore,
      movingDefectRate: 0,
      movingDefectRatePct: 0,
      status: classifyStatus(supplier.baseScore),
      totalInspected: 0,
      totalDefects: 0,
      inspectionWindow: [],
      triggeredPenalties: [],
      interlockTriggered: false,
    };
  }

  // Aggregate defect data across window
  let totalInspected = 0;
  let totalDefects = 0;
  const penalties: string[] = [];
  const impactDetails: InspectionImpact[] = [];

  for (const insp of window) {
    const qty = Math.max(0, insp.totalQty);
    const defects = Math.max(0, Math.min(insp.defectQty, qty));
    totalInspected += qty;
    totalDefects += defects;

    const rate = qty > 0 ? defects / qty : 0;

    impactDetails.push({
      inspectionId: insp.id,
      inspectionCode: insp.inspectionCode,
      partNumber: insp.partNumber,
      partName: insp.partName,
      totalQty: qty,
      defectQty: defects,
      defectRate: round4(rate),
      result: insp.result,
      date: insp.inspectionDate,
      scorePenalty: 0,  // filled below
    });
  }

  // Moving defect rate
  const movingDefectRate = totalInspected > 0 ? totalDefects / totalInspected : 0;

  // Calculate score deductions
  let score = supplier.baseScore;

  // Penalty 1: Defect rate exceeds 5% threshold
  if (movingDefectRate > 0.05) {
    const excessRate = movingDefectRate - 0.05;
    const ratePenalty = round2(excessRate * penaltyMultiplier);
    score -= ratePenalty;
    penalties.push(
      `Defect rate ${(movingDefectRate * 100).toFixed(1)}% exceeds 5% threshold → -${ratePenalty} points`
    );
  }

  // Penalty 2: Each FAIL disposition in window
  let failCount = 0;
  for (let i = 0; i < impactDetails.length; i++) {
    if (window[i].result === "FAIL") {
      failCount++;
      const deduction = failDeduction;
      score -= deduction;
      impactDetails[i].scorePenalty = deduction;
      penalties.push(
        `FAIL on ${window[i].inspectionCode} (${window[i].partNumber}) → -${deduction} points`
      );
    }
  }

  // Penalty 3: Rate > 10% → additional severe penalty
  if (movingDefectRate > 0.10) {
    const severePenalty = 10;
    score -= severePenalty;
    penalties.push(
      `Severe: Defect rate ${(movingDefectRate * 100).toFixed(1)}% exceeds 10% → -${severePenalty} emergency penalty`
    );
  }

  // Clamp score
  score = clamp(round2(score), 0, 100);

  const previousStatus = classifyStatus(supplier.baseScore);
  const newStatus = classifyStatus(score);
  const interlockTriggered = newStatus === "RESTRICTED" && previousStatus !== "RESTRICTED";

  if (interlockTriggered) {
    penalties.push(
      `⚠ INTERLOCK: Score dropped to ${score} (< 60). Supplier status changed to RESTRICTED. New POs BLOCKED.`
    );
  }

  return {
    supplierId: supplier.id,
    supplierCode: supplier.supplierCode,
    supplierName: supplier.supplierName,
    previousScore: supplier.baseScore,
    currentScore: score,
    movingDefectRate: round4(movingDefectRate),
    movingDefectRatePct: round2(movingDefectRate * 100),
    status: newStatus,
    totalInspected,
    totalDefects,
    inspectionWindow: impactDetails,
    triggeredPenalties: penalties,
    interlockTriggered,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Mock Data (GRT cleaning equipment supply chain) ─────────────────

interface MockSupplier {
  supplier: SupplierProfile;
  inspections: IqcInspection[];
}

const MOCK_SUPPLIERS: MockSupplier[] = [
  // ── Excellent supplier (ACTIVE) ──
  {
    supplier: {
      id: 1, supplierCode: "SUP-001", supplierName: "Bosch Rexroth (博世力士乐)",
      category: "Hydraulic Components", baseScore: 100, currentScore: 100, qualityRating: "A",
    },
    inspections: [
      { id: 101, inspectionCode: "IQC-2026-0201", supplierId: 1, partNumber: "HYD-PUMP-A10V", partName: "Axial Piston Pump A10VSO", totalQty: 50, defectQty: 0, inspectionDate: "2026-02-20", result: "PASS", disposition: "accept" },
      { id: 102, inspectionCode: "IQC-2026-0187", supplierId: 1, partNumber: "HYD-VALVE-4WE", partName: "Directional Control Valve 4WE6", totalQty: 100, defectQty: 1, inspectionDate: "2026-02-15", result: "PASS", disposition: "accept" },
      { id: 103, inspectionCode: "IQC-2026-0165", supplierId: 1, partNumber: "HYD-PUMP-A10V", partName: "Axial Piston Pump A10VSO", totalQty: 50, defectQty: 0, inspectionDate: "2026-02-08", result: "PASS", disposition: "accept" },
      { id: 104, inspectionCode: "IQC-2026-0140", supplierId: 1, partNumber: "HYD-FILTER-RE", partName: "Return Line Filter Element", totalQty: 200, defectQty: 2, inspectionDate: "2026-02-01", result: "PASS", disposition: "accept" },
      { id: 105, inspectionCode: "IQC-2026-0120", supplierId: 1, partNumber: "HYD-VALVE-4WE", partName: "Directional Control Valve 4WE6", totalQty: 100, defectQty: 1, inspectionDate: "2026-01-25", result: "PASS", disposition: "accept" },
    ],
  },
  // ── Declining supplier (WARNING) ──
  {
    supplier: {
      id: 2, supplierCode: "SUP-008", supplierName: "Wuxi Precision Bearings (无锡精密轴承)",
      category: "Bearings & Seals", baseScore: 100, currentScore: 100, qualityRating: "B",
    },
    inspections: [
      { id: 201, inspectionCode: "IQC-2026-0205", supplierId: 2, partNumber: "BRG-SKF-6205-2Z", partName: "SKF 6205-2Z Standard Bearing", totalQty: 200, defectQty: 14, inspectionDate: "2026-02-22", result: "CONDITIONAL", disposition: "accept" },
      { id: 202, inspectionCode: "IQC-2026-0190", supplierId: 2, partNumber: "BRG-NTN-6308", partName: "NTN 6308 Deep Groove Bearing", totalQty: 150, defectQty: 9, inspectionDate: "2026-02-16", result: "CONDITIONAL", disposition: "accept" },
      { id: 203, inspectionCode: "IQC-2026-0170", supplierId: 2, partNumber: "SEAL-VITON-50", partName: "Viton O-Ring Kit (50mm)", totalQty: 500, defectQty: 28, inspectionDate: "2026-02-10", result: "PASS", disposition: "accept" },
      { id: 204, inspectionCode: "IQC-2026-0148", supplierId: 2, partNumber: "BRG-SKF-6205-2Z", partName: "SKF 6205-2Z Standard Bearing", totalQty: 200, defectQty: 8, inspectionDate: "2026-02-03", result: "PASS", disposition: "accept" },
      { id: 205, inspectionCode: "IQC-2026-0128", supplierId: 2, partNumber: "BRG-NTN-6308", partName: "NTN 6308 Deep Groove Bearing", totalQty: 150, defectQty: 6, inspectionDate: "2026-01-27", result: "PASS", disposition: "accept" },
    ],
  },
  // ── Failing supplier (RESTRICTED — defect rate hit critical) ──
  {
    supplier: {
      id: 3, supplierCode: "SUP-015", supplierName: "Dongguan HuaTai Gaskets (东莞华泰密封)",
      category: "Gaskets & Seals", baseScore: 100, currentScore: 100, qualityRating: "C",
    },
    inspections: [
      { id: 301, inspectionCode: "IQC-2026-0208", supplierId: 3, partNumber: "GSK-NBR-003", partName: "NBR Standard Gasket Kit", totalQty: 100, defectQty: 18, inspectionDate: "2026-02-24", result: "FAIL", disposition: "reject" },
      { id: 302, inspectionCode: "IQC-2026-0195", supplierId: 3, partNumber: "SEAL-EPDM-80", partName: "EPDM Seal Ring (80mm ID)", totalQty: 300, defectQty: 45, inspectionDate: "2026-02-18", result: "FAIL", disposition: "return_to_supplier" },
      { id: 303, inspectionCode: "IQC-2026-0175", supplierId: 3, partNumber: "GSK-PTFE-010", partName: "PTFE Gasket Sheet (1.0mm)", totalQty: 200, defectQty: 25, inspectionDate: "2026-02-12", result: "FAIL", disposition: "reject" },
      { id: 304, inspectionCode: "IQC-2026-0155", supplierId: 3, partNumber: "GSK-NBR-003", partName: "NBR Standard Gasket Kit", totalQty: 100, defectQty: 12, inspectionDate: "2026-02-05", result: "CONDITIONAL", disposition: "rework" },
      { id: 305, inspectionCode: "IQC-2026-0135", supplierId: 3, partNumber: "SEAL-EPDM-80", partName: "EPDM Seal Ring (80mm ID)", totalQty: 300, defectQty: 20, inspectionDate: "2026-01-28", result: "CONDITIONAL", disposition: "accept" },
    ],
  },
  // ── New supplier (limited data, ACTIVE) ──
  {
    supplier: {
      id: 4, supplierCode: "SUP-022", supplierName: "Siemens AG (西门子)",
      category: "PLC & Automation", baseScore: 100, currentScore: 100, qualityRating: "A",
    },
    inspections: [
      { id: 401, inspectionCode: "IQC-2026-0210", supplierId: 4, partNumber: "PLC-S7-1500-CPU", partName: "Siemens S7-1500 CPU 1515-2PN", totalQty: 5, defectQty: 0, inspectionDate: "2026-02-23", result: "PASS", disposition: "accept" },
      { id: 402, inspectionCode: "IQC-2026-0180", supplierId: 4, partNumber: "IO-S7-1500-DI32", partName: "S7-1500 Digital Input Module (32ch)", totalQty: 10, defectQty: 0, inspectionDate: "2026-02-11", result: "PASS", disposition: "accept" },
    ],
  },
  // ── Borderline supplier (right at WARNING edge) ──
  {
    supplier: {
      id: 5, supplierCode: "SUP-031", supplierName: "Shanghai Fluid Tech (上海流体科技)",
      category: "Pumps & Nozzles", baseScore: 100, currentScore: 100, qualityRating: "B",
    },
    inspections: [
      { id: 501, inspectionCode: "IQC-2026-0212", supplierId: 5, partNumber: "NZL-FAN-0.8MM", partName: "Fan-pattern Spray Nozzle (0.8mm)", totalQty: 100, defectQty: 6, inspectionDate: "2026-02-24", result: "CONDITIONAL", disposition: "accept" },
      { id: 502, inspectionCode: "IQC-2026-0192", supplierId: 5, partNumber: "PMP-CENT-5HP", partName: "Centrifugal Pump (5HP, SS316)", totalQty: 10, defectQty: 1, inspectionDate: "2026-02-17", result: "FAIL", disposition: "rework" },
      { id: 503, inspectionCode: "IQC-2026-0172", supplierId: 5, partNumber: "NZL-FAN-0.8MM", partName: "Fan-pattern Spray Nozzle (0.8mm)", totalQty: 100, defectQty: 5, inspectionDate: "2026-02-10", result: "PASS", disposition: "accept" },
      { id: 504, inspectionCode: "IQC-2026-0150", supplierId: 5, partNumber: "PMP-CENT-5HP", partName: "Centrifugal Pump (5HP, SS316)", totalQty: 10, defectQty: 0, inspectionDate: "2026-02-03", result: "PASS", disposition: "accept" },
      { id: 505, inspectionCode: "IQC-2026-0130", supplierId: 5, partNumber: "NZL-FAN-0.8MM", partName: "Fan-pattern Spray Nozzle (0.8mm)", totalQty: 100, defectQty: 4, inspectionDate: "2026-01-26", result: "PASS", disposition: "accept" },
    ],
  },
];

// ─── tRPC Router ─────────────────────────────────────────────────────

export const supplierRiskRouter = router({
  /**
   * dashboard — returns all suppliers with risk evaluation.
   * The core fusion: QMS (IQC) × SCM (Procurement) in one response.
   */
  dashboard: protectedProcedure.query(async () => {
    const results = MOCK_SUPPLIERS.map(({ supplier, inspections }) => {
      const eval_ = evaluateSupplierRisk({ supplier, inspections });
      return {
        ...eval_,
        category: supplier.category,
        qualityRating: supplier.qualityRating,
      };
    });

    // Sort: RESTRICTED first, then WARNING, then ACTIVE
    const statusOrder: Record<SupplierRiskStatus, number> = { RESTRICTED: 0, WARNING: 1, ACTIVE: 2 };
    results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.currentScore - b.currentScore);

    const restricted = results.filter(r => r.status === "RESTRICTED").length;
    const warning = results.filter(r => r.status === "WARNING").length;
    const active = results.filter(r => r.status === "ACTIVE").length;
    const avgScore = results.length > 0
      ? round2(results.reduce((s, r) => s + r.currentScore, 0) / results.length)
      : 0;

    return {
      suppliers: results,
      summary: { total: results.length, active, warning, restricted, avgScore },
      generatedAt: new Date().toISOString(),
      dataSource: "mock" as const,
    };
  }),

  /**
   * evaluateOne — evaluate a single supplier by ID.
   */
  evaluateOne: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input }) => {
      const mock = MOCK_SUPPLIERS.find(s => s.supplier.id === input.supplierId);
      if (!mock) {
        return { found: false as const, error: `Supplier ${input.supplierId} not found` };
      }
      const eval_ = evaluateSupplierRisk(mock);
      return { found: true as const, result: eval_, dataSource: "mock" as const };
    }),

  /**
   * override — CEO/Director force-unblock a RESTRICTED supplier.
   * Requires authorization PIN (mock: always "888888").
   */
  override: requirePermission('supply:supplier:assess')
    .input(z.object({
      supplierId: z.number(),
      ceoPin: z.string().min(4),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      // Mock PIN check
      if (input.ceoPin !== "888888") {
        return { success: false, error: "Invalid CEO authorization PIN" };
      }
      return {
        success: true,
        supplierId: input.supplierId,
        newStatus: "WARNING" as const,
        overrideNote: `CEO override: ${input.reason}`,
        timestamp: new Date().toISOString(),
      };
    }),
});
