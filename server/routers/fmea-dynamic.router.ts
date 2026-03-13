/**
 * Dynamic FMEA RPN — Shop Floor ↔ Engineering Fusion Engine + tRPC Router
 * Phase 2.4 — QMS (Defects) ↔ FMEA (Engineering Methodology) Silo Breaker
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                  TWO-DOMAIN FUSION                                  │
 * │                                                                     │
 * │   ① Shop Floor (QMS)              ② Engineering (FMEA)             │
 * │   ┌──────────────────┐           ┌───────────────────┐             │
 * │   │ Defect Logs      │──────────▶│ FMEA Items        │             │
 * │   │ last 30d count   │           │ S × O × D = RPN   │             │
 * │   └──────────────────┘           └───────────────────┘             │
 * │                                          │                          │
 * │               THE LIVE UPDATER           ▼                          │
 * │          defects → Occurrence ── ▶ RPN recalc                      │
 * │                                          │                          │
 * │               THE INTERLOCK              ▼                          │
 * │          RPN > 100 ──▶ CRITICAL ──▶ Auto-trigger CAPA             │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Dynamic Occurrence Mapping (defect count in last 30 days):
 *   0 defects        → Occurrence = 2  (Remote)
 *   1–5 defects      → Occurrence = 4  (Low)
 *   6–20 defects     → Occurrence = 6  (Moderate)
 *   > 20 defects     → Occurrence = 10 (Very High — Max)
 *
 * Interlock:
 *   RPN > 100 → status = 'CRITICAL - CAPA REQUIRED'
 *   RPN 80–100 → status = 'ELEVATED'
 *   RPN ≤ 80 → status = 'NOMINAL'
 *
 * Architecture: Pure calculation functions exported for Vitest.
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

// ─── Types ───────────────────────────────────────────────────────────

export type FmeaDynamicStatus = "NOMINAL" | "ELEVATED" | "CRITICAL" | "CAPA_INITIATED";

export interface FmeaItem {
  id: number;
  fmeaDocumentId: number;
  itemNumber: number;
  processStep: string;
  failureMode: string;
  failureEffect: string;
  failureCause: string;
  severity: number;       // 1–10
  occurrence: number;     // 1–10 (original, from FMEA document)
  detection: number;      // 1–10
  rpn: number;            // S × O × D
  specialCharacteristic: string;  // CC/SC/empty
  currentPreventionControl: string;
  currentDetectionControl: string;
  status: FmeaDynamicStatus;
}

export interface DefectLog {
  id: number;
  fmeaItemId: number;
  defectSource: string;
  quantity: number;
  processStep: string;
  failureMode: string;
  partNumber: string;
  reportedAt: string;     // ISO date
  description: string;
  reportedByName: string;
}

export interface RpnRecalcInput {
  fmeaItem: FmeaItem;
  defectLogs: DefectLog[];       // all defect logs (we filter by 30d window)
  windowDays?: number;           // default 30
  now?: Date;                    // for testability
}

export interface DefectSummary {
  totalDefects30d: number;
  defectsBySource: Record<string, number>;
  recentDefects: DefectLog[];    // last 5 for display
}

export interface RpnRecalcResult {
  fmeaItemId: number;
  processStep: string;
  failureMode: string;
  // Before
  previousOccurrence: number;
  previousRpn: number;
  previousStatus: FmeaDynamicStatus;
  // After
  newOccurrence: number;
  newRpn: number;
  newStatus: FmeaDynamicStatus;
  // Delta
  rpnDelta: number;
  occurrenceDelta: number;
  rpnSpiked: boolean;            // true if rpnDelta > 0
  // Context
  severity: number;
  detection: number;
  defectSummary: DefectSummary;
  capaRequired: boolean;
  livePulse: string;             // human-readable pulse message
}

// ─── Pure Calculation Engine (fully unit-testable) ───────────────────

/**
 * Map 30-day defect count to FMEA Occurrence score (1–10).
 *
 * Based on AIAG-VDA FMEA handbook occurrence criteria:
 *   0 defects     → 2 (Remote: failure unlikely)
 *   1–5 defects   → 4 (Low: relatively few failures)
 *   6–20 defects  → 6 (Moderate: occasional failures)
 *   > 20 defects  → 10 (Very High: persistent failure)
 */
export function mapDefectsToOccurrence(defectCount: number): number {
  if (defectCount <= 0) return 2;
  if (defectCount <= 5) return 4;
  if (defectCount <= 20) return 6;
  return 10;
}

/**
 * Classify RPN-based status.
 *   RPN > 100 → CRITICAL (CAPA REQUIRED)
 *   RPN 81–100 → ELEVATED (increased monitoring)
 *   RPN ≤ 80 → NOMINAL
 */
export function classifyRpnStatus(rpn: number): FmeaDynamicStatus {
  if (rpn > 100) return "CRITICAL";
  if (rpn > 80) return "ELEVATED";
  return "NOMINAL";
}

/**
 * Filter defect logs to those within the time window.
 */
export function filterDefectsInWindow(
  defectLogs: DefectLog[],
  windowDays: number,
  now: Date
): DefectLog[] {
  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  return defectLogs.filter(d => new Date(d.reportedAt) >= cutoff);
}

/**
 * Recalculate RPN for a single FMEA item based on live defect data.
 *
 * This is the CORE FUSION FUNCTION:
 *   Shop Floor Defects → Dynamic Occurrence → RPN Recalculation → Interlock
 */
export function recalculateRPN(input: RpnRecalcInput): RpnRecalcResult {
  const { fmeaItem, defectLogs, windowDays = 30, now = new Date() } = input;

  // 1. Filter defects within window
  const windowDefects = filterDefectsInWindow(defectLogs, windowDays, now);

  // 2. Aggregate defect count (sum quantities)
  const totalDefects30d = windowDefects.reduce((sum, d) => sum + Math.max(0, d.quantity), 0);

  // 3. Build defect summary
  const defectsBySource: Record<string, number> = {};
  for (const d of windowDefects) {
    defectsBySource[d.defectSource] = (defectsBySource[d.defectSource] ?? 0) + d.quantity;
  }
  const recentDefects = [...windowDefects]
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
    .slice(0, 5);

  const defectSummary: DefectSummary = { totalDefects30d, defectsBySource, recentDefects };

  // 4. Map defect count to dynamic Occurrence
  const newOccurrence = mapDefectsToOccurrence(totalDefects30d);

  // 5. Calculate new RPN
  const newRpn = fmeaItem.severity * newOccurrence * fmeaItem.detection;

  // 6. Determine status
  const previousRpn = fmeaItem.severity * fmeaItem.occurrence * fmeaItem.detection;
  const previousStatus = classifyRpnStatus(previousRpn);
  const newStatus = classifyRpnStatus(newRpn);
  const capaRequired = newStatus === "CRITICAL";

  // 7. Build live pulse message
  const rpnDelta = newRpn - previousRpn;
  const occurrenceDelta = newOccurrence - fmeaItem.occurrence;
  let livePulse: string;
  if (totalDefects30d === 0) {
    livePulse = "No defects in 30 days — Occurrence stable at 2";
  } else if (occurrenceDelta > 0) {
    livePulse = `Detected ${totalDefects30d} defect${totalDefects30d !== 1 ? "s" : ""} in 30 days → Occurrence jumped from ${fmeaItem.occurrence} to ${newOccurrence}!`;
  } else if (occurrenceDelta < 0) {
    livePulse = `Defects decreased to ${totalDefects30d} in 30 days → Occurrence improved from ${fmeaItem.occurrence} to ${newOccurrence}`;
  } else {
    livePulse = `${totalDefects30d} defect${totalDefects30d !== 1 ? "s" : ""} in 30 days — Occurrence unchanged at ${newOccurrence}`;
  }

  if (capaRequired) {
    livePulse += " ⚠ CRITICAL — CAPA REQUIRED";
  }

  return {
    fmeaItemId: fmeaItem.id,
    processStep: fmeaItem.processStep,
    failureMode: fmeaItem.failureMode,
    previousOccurrence: fmeaItem.occurrence,
    previousRpn,
    previousStatus,
    newOccurrence,
    newRpn,
    newStatus,
    rpnDelta,
    occurrenceDelta,
    rpnSpiked: rpnDelta > 0,
    severity: fmeaItem.severity,
    detection: fmeaItem.detection,
    defectSummary,
    capaRequired,
    livePulse,
  };
}

// ─── Mock Data (GRT Cleaning Equipment PFMEA) ───────────────────────

const MOCK_FMEA_ITEMS: FmeaItem[] = [
  {
    id: 1, fmeaDocumentId: 1, itemNumber: 1,
    processStep: "T3 — Hydraulic Assembly",
    failureMode: "Oil Leakage at Manifold Joint",
    failureEffect: "System pressure loss, emergency stop, production downtime",
    failureCause: "O-ring degradation, improper torque, material incompatibility",
    severity: 8, occurrence: 3, detection: 4, rpn: 96,
    specialCharacteristic: "CC", currentPreventionControl: "Torque wrench with preset value",
    currentDetectionControl: "Pressure hold test 15min @ 250bar", status: "ELEVATED",
  },
  {
    id: 2, fmeaDocumentId: 1, itemNumber: 2,
    processStep: "T5 — Electrical Wiring",
    failureMode: "PLC Communication Failure",
    failureEffect: "Machine unable to execute wash cycle, operator lockout",
    failureCause: "Loose connector, cable damage during assembly, EMI interference",
    severity: 7, occurrence: 2, detection: 3, rpn: 42,
    specialCharacteristic: "SC", currentPreventionControl: "Cable routing SOP with strain relief",
    currentDetectionControl: "End-of-line communication test protocol", status: "NOMINAL",
  },
  {
    id: 3, fmeaDocumentId: 1, itemNumber: 3,
    processStep: "T7 — Nozzle Calibration",
    failureMode: "Spray Pattern Deviation >15%",
    failureEffect: "Inconsistent cleaning, customer complaint, rework required",
    failureCause: "Nozzle blockage, pump pressure variation, worn nozzle tip",
    severity: 6, occurrence: 4, detection: 5, rpn: 120,
    specialCharacteristic: "CC", currentPreventionControl: "New nozzle per batch, filtered water supply",
    currentDetectionControl: "Spray pattern visual inspection + flow rate check", status: "CRITICAL",
  },
  {
    id: 4, fmeaDocumentId: 1, itemNumber: 4,
    processStep: "T9 — Tank Welding",
    failureMode: "Weld Porosity / Crack",
    failureEffect: "Chemical leakage, safety hazard, equipment scrap",
    failureCause: "Contaminated base metal, improper shielding gas, welder technique",
    severity: 9, occurrence: 2, detection: 3, rpn: 54,
    specialCharacteristic: "CC", currentPreventionControl: "WPS qualified per AWS D1.6, welder certified",
    currentDetectionControl: "100% visual + dye penetrant on critical welds", status: "NOMINAL",
  },
  {
    id: 5, fmeaDocumentId: 1, itemNumber: 5,
    processStep: "T12 — Final Integration Test",
    failureMode: "Safety Interlock Bypass",
    failureEffect: "Operator injury risk, regulatory non-compliance, shipment hold",
    failureCause: "Wiring error, software logic bug, sensor misalignment",
    severity: 10, occurrence: 1, detection: 2, rpn: 20,
    specialCharacteristic: "CC", currentPreventionControl: "Dual-channel safety relay, code review",
    currentDetectionControl: "Full safety matrix test per IEC 62061", status: "NOMINAL",
  },
  {
    id: 6, fmeaDocumentId: 1, itemNumber: 6,
    processStep: "T4 — Pump Installation",
    failureMode: "Pump Cavitation Under Load",
    failureEffect: "Reduced cleaning pressure, pump damage, warranty claim",
    failureCause: "Inlet restriction, air entrainment, undersized suction line",
    severity: 7, occurrence: 3, detection: 4, rpn: 84,
    specialCharacteristic: "SC", currentPreventionControl: "Suction line sizing calculator, NPSH verification",
    currentDetectionControl: "Load test at 100% capacity × 2 hours", status: "ELEVATED",
  },
];

// Defect logs for each FMEA item
const now = new Date();
function daysAgo(d: number): string {
  return new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
}

const MOCK_DEFECT_LOGS: DefectLog[] = [
  // ── Oil Leakage (FMEA #1): 10 defects in last 30 days → Occurrence should jump ──
  { id: 101, fmeaItemId: 1, defectSource: "SHOP_FLOOR", quantity: 2, processStep: "T3", failureMode: "Oil Leakage at Manifold Joint", partNumber: "HYD-MAN-200", reportedAt: daysAgo(3), description: "Leak found during pressure hold test, O-ring extruded", reportedByName: "Zhang Wei" },
  { id: 102, fmeaItemId: 1, defectSource: "SHOP_FLOOR", quantity: 1, processStep: "T3", failureMode: "Oil Leakage at Manifold Joint", partNumber: "HYD-MAN-200", reportedAt: daysAgo(7), description: "Minor seepage at port B connection", reportedByName: "Li Ming" },
  { id: 103, fmeaItemId: 1, defectSource: "FINAL_QC", quantity: 3, processStep: "T3", failureMode: "Oil Leakage at Manifold Joint", partNumber: "HYD-MAN-200", reportedAt: daysAgo(12), description: "3 units failed final pressure test", reportedByName: "Wang Fang" },
  { id: 104, fmeaItemId: 1, defectSource: "CUSTOMER_RETURN", quantity: 1, processStep: "T3", failureMode: "Oil Leakage at Manifold Joint", partNumber: "HYD-MAN-200", reportedAt: daysAgo(18), description: "Customer reported oil puddle after 2 weeks operation", reportedByName: "Chen Jie" },
  { id: 105, fmeaItemId: 1, defectSource: "SHOP_FLOOR", quantity: 3, processStep: "T3", failureMode: "Oil Leakage at Manifold Joint", partNumber: "HYD-MAN-200", reportedAt: daysAgo(25), description: "Batch of 3 with same O-ring failure pattern", reportedByName: "Zhang Wei" },

  // ── PLC Communication (FMEA #2): 0 defects → stays clean ──

  // ── Spray Pattern (FMEA #3): 22 defects → max occurrence ──
  { id: 301, fmeaItemId: 3, defectSource: "SHOP_FLOOR", quantity: 5, processStep: "T7", failureMode: "Spray Pattern Deviation >15%", partNumber: "NZL-FAN-0.8MM", reportedAt: daysAgo(2), description: "5 nozzles blocked with mineral deposits", reportedByName: "Wang Fang" },
  { id: 302, fmeaItemId: 3, defectSource: "FINAL_QC", quantity: 8, processStep: "T7", failureMode: "Spray Pattern Deviation >15%", partNumber: "NZL-FAN-0.8MM", reportedAt: daysAgo(10), description: "Pattern deviation measured at 22% on 8 units", reportedByName: "Li Ming" },
  { id: 303, fmeaItemId: 3, defectSource: "SHOP_FLOOR", quantity: 4, processStep: "T7", failureMode: "Spray Pattern Deviation >15%", partNumber: "NZL-FAN-0.8MM", reportedAt: daysAgo(15), description: "Worn nozzle tips on high-volume line", reportedByName: "Zhang Wei" },
  { id: 304, fmeaItemId: 3, defectSource: "CUSTOMER_RETURN", quantity: 3, processStep: "T7", failureMode: "Spray Pattern Deviation >15%", partNumber: "NZL-FAN-0.8MM", reportedAt: daysAgo(22), description: "Customer acceptance test failed", reportedByName: "Chen Jie" },
  { id: 305, fmeaItemId: 3, defectSource: "SHOP_FLOOR", quantity: 2, processStep: "T7", failureMode: "Spray Pattern Deviation >15%", partNumber: "NZL-FAN-0.8MM", reportedAt: daysAgo(28), description: "Pump pressure fluctuation causing pattern drift", reportedByName: "Wang Fang" },

  // ── Weld Porosity (FMEA #4): 3 defects → moderate ──
  { id: 401, fmeaItemId: 4, defectSource: "SHOP_FLOOR", quantity: 1, processStep: "T9", failureMode: "Weld Porosity / Crack", partNumber: "TANK-SS316-500L", reportedAt: daysAgo(5), description: "Dye penetrant revealed subsurface porosity", reportedByName: "Li Ming" },
  { id: 402, fmeaItemId: 4, defectSource: "SHOP_FLOOR", quantity: 2, processStep: "T9", failureMode: "Weld Porosity / Crack", partNumber: "TANK-SS316-500L", reportedAt: daysAgo(20), description: "2 welds cracked during hydrostatic test", reportedByName: "Zhang Wei" },

  // ── Safety Interlock (FMEA #5): 0 defects → clean ──

  // ── Pump Cavitation (FMEA #6): 4 defects → low/moderate ──
  { id: 601, fmeaItemId: 6, defectSource: "SHOP_FLOOR", quantity: 2, processStep: "T4", failureMode: "Pump Cavitation Under Load", partNumber: "PMP-CENT-5HP", reportedAt: daysAgo(8), description: "Cavitation noise detected during load test", reportedByName: "Wang Fang" },
  { id: 602, fmeaItemId: 6, defectSource: "FINAL_QC", quantity: 2, processStep: "T4", failureMode: "Pump Cavitation Under Load", partNumber: "PMP-CENT-5HP", reportedAt: daysAgo(19), description: "Insufficient suction head causing intermittent cavitation", reportedByName: "Li Ming" },
];

// ─── tRPC Router ─────────────────────────────────────────────────────

export const fmeaDynamicRouter = router({
  /**
   * liveMatrix — returns all FMEA items with dynamic RPN recalculation.
   * The core fusion: Shop Floor QC × FMEA Engineering in one response.
   */
  liveMatrix: protectedProcedure.query(async () => {
    const results = MOCK_FMEA_ITEMS.map(item => {
      const itemDefects = MOCK_DEFECT_LOGS.filter(d => d.fmeaItemId === item.id);
      return recalculateRPN({ fmeaItem: item, defectLogs: itemDefects, now });
    });

    // Sort: CRITICAL first, then by RPN descending
    const statusOrder: Record<FmeaDynamicStatus, number> = { CRITICAL: 0, CAPA_INITIATED: 1, ELEVATED: 2, NOMINAL: 3 };
    results.sort((a, b) => statusOrder[a.newStatus] - statusOrder[b.newStatus] || b.newRpn - a.newRpn);

    const critical = results.filter(r => r.newStatus === "CRITICAL").length;
    const elevated = results.filter(r => r.newStatus === "ELEVATED").length;
    const nominal = results.filter(r => r.newStatus === "NOMINAL").length;
    const maxRpn = Math.max(...results.map(r => r.newRpn), 0);
    const spiked = results.filter(r => r.rpnSpiked).length;

    return {
      items: results,
      summary: {
        total: results.length,
        critical,
        elevated,
        nominal,
        maxRpn,
        spikedCount: spiked,
      },
      fmeaDocument: {
        code: "PFMEA-GRT-WASH-001",
        title: "Process FMEA — GRT Industrial Cleaning Equipment Assembly",
        revision: 3,
        status: "active",
      },
      generatedAt: new Date().toISOString(),
      dataSource: "mock" as const,
    };
  }),

  /**
   * recalculate — recalculate RPN for a specific FMEA item.
   */
  recalculate: protectedProcedure
    .input(z.object({ fmeaItemId: z.number() }))
    .query(async ({ input }) => {
      const item = MOCK_FMEA_ITEMS.find(i => i.id === input.fmeaItemId);
      if (!item) {
        return { found: false as const, error: `FMEA item ${input.fmeaItemId} not found` };
      }
      const itemDefects = MOCK_DEFECT_LOGS.filter(d => d.fmeaItemId === item.id);
      const result = recalculateRPN({ fmeaItem: item, defectLogs: itemDefects, now });
      return { found: true as const, result, dataSource: "mock" as const };
    }),

  /**
   * initiateCapa — trigger CAPA for a CRITICAL FMEA item.
   */
  initiateCapa: requirePermission('mfg:fmea:manage')
    .input(z.object({
      fmeaItemId: z.number(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const item = MOCK_FMEA_ITEMS.find(i => i.id === input.fmeaItemId);
      if (!item) {
        return { success: false, error: `FMEA item ${input.fmeaItemId} not found` };
      }
      return {
        success: true,
        capaCode: `CAPA-2026-${String(input.fmeaItemId).padStart(3, "0")}`,
        fmeaItemId: input.fmeaItemId,
        failureMode: item.failureMode,
        processStep: item.processStep,
        reason: input.reason,
        newStatus: "CAPA_INITIATED" as const,
        timestamp: new Date().toISOString(),
      };
    }),
});
