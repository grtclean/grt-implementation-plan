/**
 * Dynamic FMEA RPN — tRPC Router Unit Tests
 * Phase 2.4 — Shop Floor QC x Engineering FMEA Cross-Domain Fusion
 *
 * Tests all 3 tRPC procedures:
 *   1. fmeaDynamic.liveMatrix      — full FMEA matrix with dynamic RPN recalculation
 *   2. fmeaDynamic.recalculate     — single-item RPN recalculation
 *   3. fmeaDynamic.initiateCapa    — CAPA trigger mutation for CRITICAL items
 *
 * Plus: auth guards (anonymous rejection), edge cases, input validation,
 *       cross-procedure consistency, and data integrity checks.
 *
 * Run: npx vitest run server/routers/fmea-dynamic.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
} from "../_test/trpc-test-utils";

// No DB access in this router — it uses in-memory MOCK data.
// But we still mock ../db so that other routers in appRouter don't try
// to open real DB connections during import.
vi.mock("../db", () => ({
  requireDb: vi.fn(async () => ({})),
}));

// ── Reset ───────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════════
// liveMatrix — Full FMEA Matrix with Dynamic RPN
// ════════════════════════════════════════════════════════════════════

describe("fmeaDynamic.liveMatrix", () => {
  // ── Happy path ──────────────────────────────────────────────────

  it("returns the full FMEA matrix with all 6 items", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    expect(result.items).toHaveLength(6);
    expect(result.summary.total).toBe(6);
    expect(result.dataSource).toBe("mock");
  });

  it("returns FMEA document metadata", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    expect(result.fmeaDocument.code).toBe("PFMEA-GRT-WASH-001");
    expect(result.fmeaDocument.title).toBe(
      "Process FMEA — GRT Industrial Cleaning Equipment Assembly",
    );
    expect(result.fmeaDocument.revision).toBe(3);
    expect(result.fmeaDocument.status).toBe("active");
  });

  it("includes a valid generatedAt ISO timestamp", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    expect(result.generatedAt).toBeTruthy();
    expect(new Date(result.generatedAt).getTime()).not.toBeNaN();
  });

  // ── Sorting ────────────────────────────────────────────────────

  it("sorts items CRITICAL first, then by RPN descending", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const statusOrder: Record<string, number> = {
      CRITICAL: 0,
      CAPA_INITIATED: 1,
      ELEVATED: 2,
      NOMINAL: 3,
    };

    for (let i = 1; i < result.items.length; i++) {
      const prev = result.items[i - 1];
      const curr = result.items[i];
      const prevOrder = statusOrder[prev.newStatus] ?? 99;
      const currOrder = statusOrder[curr.newStatus] ?? 99;

      if (prevOrder === currOrder) {
        // Same status group: higher RPN comes first
        expect(prev.newRpn).toBeGreaterThanOrEqual(curr.newRpn);
      } else {
        // More critical status comes first (lower order number)
        expect(prevOrder).toBeLessThanOrEqual(currOrder);
      }
    }
  });

  // ── Summary counts ─────────────────────────────────────────────

  it("summary counts add up to total items", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();
    const { critical, elevated, nominal, total } = result.summary;

    expect(critical + elevated + nominal).toBe(total);
  });

  it("summary.spikedCount counts items with positive rpnDelta", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const actualSpiked = result.items.filter((r) => r.rpnSpiked).length;
    expect(result.summary.spikedCount).toBe(actualSpiked);
  });

  it("summary.maxRpn equals the maximum newRpn across all items", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const maxFromItems = Math.max(...result.items.map((r) => r.newRpn));
    expect(result.summary.maxRpn).toBe(maxFromItems);
  });

  // ── Each item has complete recalculation fields ─────────────────

  it("every item has all required RpnRecalcResult fields", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    for (const item of result.items) {
      // Identity
      expect(item.fmeaItemId).toBeGreaterThan(0);
      expect(item.processStep).toBeTruthy();
      expect(item.failureMode).toBeTruthy();

      // Before/After
      expect(item.previousOccurrence).toBeGreaterThanOrEqual(1);
      expect(item.previousOccurrence).toBeLessThanOrEqual(10);
      expect(item.newOccurrence).toBeGreaterThanOrEqual(1);
      expect(item.newOccurrence).toBeLessThanOrEqual(10);
      expect(item.previousRpn).toBeGreaterThanOrEqual(0);
      expect(item.newRpn).toBeGreaterThanOrEqual(0);
      expect(typeof item.rpnDelta).toBe("number");
      expect(typeof item.occurrenceDelta).toBe("number");
      expect(typeof item.rpnSpiked).toBe("boolean");

      // Status
      expect(["NOMINAL", "ELEVATED", "CRITICAL", "CAPA_INITIATED"]).toContain(
        item.newStatus,
      );
      expect(["NOMINAL", "ELEVATED", "CRITICAL", "CAPA_INITIATED"]).toContain(
        item.previousStatus,
      );
      expect(typeof item.capaRequired).toBe("boolean");

      // Context
      expect(item.severity).toBeGreaterThanOrEqual(1);
      expect(item.severity).toBeLessThanOrEqual(10);
      expect(item.detection).toBeGreaterThanOrEqual(1);
      expect(item.detection).toBeLessThanOrEqual(10);

      // Defect summary
      expect(item.defectSummary.totalDefects30d).toBeGreaterThanOrEqual(0);
      expect(typeof item.defectSummary.defectsBySource).toBe("object");
      expect(Array.isArray(item.defectSummary.recentDefects)).toBe(true);

      // Live pulse
      expect(item.livePulse).toBeTruthy();
    }
  });

  // ── Specific mock scenarios from MOCK_DEFECT_LOGS ──────────────

  it("Oil Leakage (#1) spikes with 10 defects (Occurrence 3 -> 6)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const oilLeakage = result.items.find((i) => i.fmeaItemId === 1);
    expect(oilLeakage).toBeDefined();
    if (!oilLeakage) return;

    // 10 defects in 30 days -> O=6, S=8, D=4 -> RPN=192
    expect(oilLeakage.defectSummary.totalDefects30d).toBe(10);
    expect(oilLeakage.newOccurrence).toBe(6);
    expect(oilLeakage.newRpn).toBe(192); // 8 * 6 * 4
    expect(oilLeakage.newStatus).toBe("CRITICAL");
    expect(oilLeakage.capaRequired).toBe(true);
    expect(oilLeakage.rpnSpiked).toBe(true);
  });

  it("PLC Communication (#2) stays clean with 0 defects (Occurrence -> 2)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const plcComm = result.items.find((i) => i.fmeaItemId === 2);
    expect(plcComm).toBeDefined();
    if (!plcComm) return;

    expect(plcComm.defectSummary.totalDefects30d).toBe(0);
    expect(plcComm.newOccurrence).toBe(2);
    expect(plcComm.newRpn).toBe(42); // 7 * 2 * 3
    expect(plcComm.newStatus).toBe("NOMINAL");
    expect(plcComm.capaRequired).toBe(false);
  });

  it("Spray Pattern (#3) hits max occurrence with 22 defects", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const sprayPattern = result.items.find((i) => i.fmeaItemId === 3);
    expect(sprayPattern).toBeDefined();
    if (!sprayPattern) return;

    // 22 defects -> O=10, S=6, D=5 -> RPN=300
    expect(sprayPattern.defectSummary.totalDefects30d).toBe(22);
    expect(sprayPattern.newOccurrence).toBe(10);
    expect(sprayPattern.newRpn).toBe(300); // 6 * 10 * 5
    expect(sprayPattern.newStatus).toBe("CRITICAL");
    expect(sprayPattern.capaRequired).toBe(true);
  });

  it("Weld Porosity (#4) with 3 defects (Occurrence -> 4)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const weldPorosity = result.items.find((i) => i.fmeaItemId === 4);
    expect(weldPorosity).toBeDefined();
    if (!weldPorosity) return;

    // 3 defects -> O=4, S=9, D=3 -> RPN=108
    expect(weldPorosity.defectSummary.totalDefects30d).toBe(3);
    expect(weldPorosity.newOccurrence).toBe(4);
    expect(weldPorosity.newRpn).toBe(108); // 9 * 4 * 3
    expect(weldPorosity.newStatus).toBe("CRITICAL");
    expect(weldPorosity.capaRequired).toBe(true);
  });

  it("Safety Interlock (#5) stays clean with 0 defects", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const safetyInterlock = result.items.find((i) => i.fmeaItemId === 5);
    expect(safetyInterlock).toBeDefined();
    if (!safetyInterlock) return;

    expect(safetyInterlock.defectSummary.totalDefects30d).toBe(0);
    expect(safetyInterlock.newOccurrence).toBe(2);
    expect(safetyInterlock.newRpn).toBe(40); // 10 * 2 * 2
    expect(safetyInterlock.newStatus).toBe("NOMINAL");
    expect(safetyInterlock.capaRequired).toBe(false);
  });

  it("Pump Cavitation (#6) with 4 defects (Occurrence -> 4)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const pumpCavitation = result.items.find((i) => i.fmeaItemId === 6);
    expect(pumpCavitation).toBeDefined();
    if (!pumpCavitation) return;

    // 4 defects -> O=4, S=7, D=4 -> RPN=112
    expect(pumpCavitation.defectSummary.totalDefects30d).toBe(4);
    expect(pumpCavitation.newOccurrence).toBe(4);
    expect(pumpCavitation.newRpn).toBe(112); // 7 * 4 * 4
    expect(pumpCavitation.newStatus).toBe("CRITICAL");
    expect(pumpCavitation.capaRequired).toBe(true);
  });

  // ── Works with admin caller ────────────────────────────────────

  it("works with admin caller", async () => {
    const caller = createAdminCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    expect(result.items).toHaveLength(6);
    expect(result.summary.total).toBe(6);
  });
});

// ════════════════════════════════════════════════════════════════════
// recalculate — Single-Item RPN Recalculation
// ════════════════════════════════════════════════════════════════════

describe("fmeaDynamic.recalculate", () => {
  // ── Happy path ──────────────────────────────────────────────────

  it("returns recalculation result for known fmeaItemId 1", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.recalculate({ fmeaItemId: 1 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");
    expect(result.dataSource).toBe("mock");
    expect(result.result.fmeaItemId).toBe(1);
    expect(result.result.processStep).toBe("T3 — Hydraulic Assembly");
    expect(result.result.failureMode).toBe("Oil Leakage at Manifold Joint");
  });

  it("returns correct RPN recalculation for Oil Leakage (#1)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.recalculate({ fmeaItemId: 1 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    // 10 defects -> O=6, S=8, D=4 -> RPN=192 -> CRITICAL
    expect(result.result.previousOccurrence).toBe(3);
    expect(result.result.newOccurrence).toBe(6);
    expect(result.result.previousRpn).toBe(96); // 8*3*4
    expect(result.result.newRpn).toBe(192);      // 8*6*4
    expect(result.result.rpnDelta).toBe(96);
    expect(result.result.rpnSpiked).toBe(true);
    expect(result.result.newStatus).toBe("CRITICAL");
    expect(result.result.capaRequired).toBe(true);
  });

  it("returns correct result for PLC Communication (#2, 0 defects)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.recalculate({ fmeaItemId: 2 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.result.fmeaItemId).toBe(2);
    expect(result.result.defectSummary.totalDefects30d).toBe(0);
    expect(result.result.newOccurrence).toBe(2);
    expect(result.result.newRpn).toBe(42); // 7*2*3
    expect(result.result.newStatus).toBe("NOMINAL");
    expect(result.result.capaRequired).toBe(false);
    expect(result.result.rpnSpiked).toBe(false);
  });

  it("returns correct result for Spray Pattern (#3, 22 defects)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.recalculate({ fmeaItemId: 3 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.result.defectSummary.totalDefects30d).toBe(22);
    expect(result.result.newOccurrence).toBe(10);
    expect(result.result.newRpn).toBe(300); // 6*10*5
    expect(result.result.newStatus).toBe("CRITICAL");
    expect(result.result.capaRequired).toBe(true);
  });

  it("returns correct result for Weld Porosity (#4, 3 defects)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.recalculate({ fmeaItemId: 4 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.result.defectSummary.totalDefects30d).toBe(3);
    expect(result.result.newOccurrence).toBe(4);
    expect(result.result.newRpn).toBe(108); // 9*4*3
  });

  it("returns correct result for Safety Interlock (#5, 0 defects)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.recalculate({ fmeaItemId: 5 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.result.defectSummary.totalDefects30d).toBe(0);
    expect(result.result.newOccurrence).toBe(2);
    expect(result.result.newRpn).toBe(40); // 10*2*2
    expect(result.result.newStatus).toBe("NOMINAL");
  });

  it("returns correct result for Pump Cavitation (#6, 4 defects)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.recalculate({ fmeaItemId: 6 });

    expect(result.found).toBe(true);
    if (!result.found) throw new Error("unreachable");

    expect(result.result.defectSummary.totalDefects30d).toBe(4);
    expect(result.result.newOccurrence).toBe(4);
    expect(result.result.newRpn).toBe(112); // 7*4*4
  });

  // ── Not found ──────────────────────────────────────────────────

  it("returns found: false for unknown fmeaItemId", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.recalculate({ fmeaItemId: 9999 });

    expect(result.found).toBe(false);
    if (result.found) throw new Error("unreachable");
    expect(result.error).toContain("9999");
    expect(result.error).toContain("not found");
  });

  it("returns found: false for fmeaItemId 0", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.recalculate({ fmeaItemId: 0 });

    expect(result.found).toBe(false);
  });

  it("returns found: false for negative fmeaItemId", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.recalculate({ fmeaItemId: -1 });

    expect(result.found).toBe(false);
  });

  // ── Input validation ──────────────────────────────────────────

  it("rejects call without fmeaItemId (missing input)", async () => {
    const caller = createAuthenticatedCaller();
    // @ts-expect-error - intentionally testing missing input
    await expect(caller.fmeaDynamic.recalculate({})).rejects.toThrow();
  });

  it("rejects non-numeric fmeaItemId", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      // @ts-expect-error - intentionally testing invalid input type
      caller.fmeaDynamic.recalculate({ fmeaItemId: "abc" }),
    ).rejects.toThrow();
  });

  it("rejects call with no input at all", async () => {
    const caller = createAuthenticatedCaller();
    // @ts-expect-error - intentionally testing no input
    await expect(caller.fmeaDynamic.recalculate()).rejects.toThrow();
  });

  // ── Admin caller works ─────────────────────────────────────────

  it("works with admin caller", async () => {
    const caller = createAdminCaller();
    const result = await caller.fmeaDynamic.recalculate({ fmeaItemId: 1 });
    expect(result.found).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════
// initiateCapa — CAPA Trigger Mutation
// ════════════════════════════════════════════════════════════════════

describe("fmeaDynamic.initiateCapa", () => {
  // ── Happy path ──────────────────────────────────────────────────

  it("initiates CAPA for a known FMEA item", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.initiateCapa({
      fmeaItemId: 1,
      reason: "Oil leakage rate exceeds acceptable threshold",
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("unreachable");
    expect(result.capaCode).toBe("CAPA-2026-001");
    expect(result.fmeaItemId).toBe(1);
    expect(result.failureMode).toBe("Oil Leakage at Manifold Joint");
    expect(result.processStep).toBe("T3 — Hydraulic Assembly");
    expect(result.reason).toBe("Oil leakage rate exceeds acceptable threshold");
    expect(result.newStatus).toBe("CAPA_INITIATED");
  });

  it("generates correct CAPA code with zero-padded item ID", async () => {
    const caller = createAuthenticatedCaller();

    const result1 = await caller.fmeaDynamic.initiateCapa({
      fmeaItemId: 1,
      reason: "Test",
    });
    expect(result1.success).toBe(true);
    if (result1.success) expect(result1.capaCode).toBe("CAPA-2026-001");

    const result3 = await caller.fmeaDynamic.initiateCapa({
      fmeaItemId: 3,
      reason: "Test",
    });
    expect(result3.success).toBe(true);
    if (result3.success) expect(result3.capaCode).toBe("CAPA-2026-003");

    const result6 = await caller.fmeaDynamic.initiateCapa({
      fmeaItemId: 6,
      reason: "Test",
    });
    expect(result6.success).toBe(true);
    if (result6.success) expect(result6.capaCode).toBe("CAPA-2026-006");
  });

  it("includes a valid timestamp in the response", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.initiateCapa({
      fmeaItemId: 1,
      reason: "Critical RPN detected",
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("unreachable");
    expect(result.timestamp).toBeTruthy();
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });

  it("returns correct failure mode and process step for each item", async () => {
    const caller = createAuthenticatedCaller();

    const items = [
      { id: 1, failureMode: "Oil Leakage at Manifold Joint", processStep: "T3 — Hydraulic Assembly" },
      { id: 2, failureMode: "PLC Communication Failure", processStep: "T5 — Electrical Wiring" },
      { id: 3, failureMode: "Spray Pattern Deviation >15%", processStep: "T7 — Nozzle Calibration" },
      { id: 4, failureMode: "Weld Porosity / Crack", processStep: "T9 — Tank Welding" },
      { id: 5, failureMode: "Safety Interlock Bypass", processStep: "T12 — Final Integration Test" },
      { id: 6, failureMode: "Pump Cavitation Under Load", processStep: "T4 — Pump Installation" },
    ];

    for (const item of items) {
      const result = await caller.fmeaDynamic.initiateCapa({
        fmeaItemId: item.id,
        reason: "Test CAPA",
      });
      expect(result.success).toBe(true);
      if (!result.success) continue;
      expect(result.failureMode).toBe(item.failureMode);
      expect(result.processStep).toBe(item.processStep);
    }
  });

  // ── Not found ──────────────────────────────────────────────────

  it("returns success: false for unknown fmeaItemId", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.initiateCapa({
      fmeaItemId: 9999,
      reason: "Testing not-found path",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("9999");
    expect(result.error).toContain("not found");
  });

  it("returns success: false for fmeaItemId 0", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.initiateCapa({
      fmeaItemId: 0,
      reason: "Zero ID test",
    });

    expect(result.success).toBe(false);
  });

  it("returns success: false for negative fmeaItemId", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.initiateCapa({
      fmeaItemId: -1,
      reason: "Negative ID test",
    });

    expect(result.success).toBe(false);
  });

  // ── Input validation ──────────────────────────────────────────

  it("rejects call with empty reason string", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.fmeaDynamic.initiateCapa({ fmeaItemId: 1, reason: "" }),
    ).rejects.toThrow();
  });

  it("rejects call without reason field", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      // @ts-expect-error - intentionally testing missing required field
      caller.fmeaDynamic.initiateCapa({ fmeaItemId: 1 }),
    ).rejects.toThrow();
  });

  it("rejects call without fmeaItemId field", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      // @ts-expect-error - intentionally testing missing required field
      caller.fmeaDynamic.initiateCapa({ reason: "test" }),
    ).rejects.toThrow();
  });

  it("rejects call with no input at all", async () => {
    const caller = createAuthenticatedCaller();
    // @ts-expect-error - intentionally testing no input
    await expect(caller.fmeaDynamic.initiateCapa()).rejects.toThrow();
  });

  it("rejects non-numeric fmeaItemId", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      // @ts-expect-error - intentionally testing invalid type
      caller.fmeaDynamic.initiateCapa({ fmeaItemId: "abc", reason: "test" }),
    ).rejects.toThrow();
  });

  // ── Admin caller works ─────────────────────────────────────────

  it("works with admin caller", async () => {
    const caller = createAdminCaller();
    const result = await caller.fmeaDynamic.initiateCapa({
      fmeaItemId: 1,
      reason: "Admin-initiated CAPA",
    });

    expect(result.success).toBe(true);
  });

  // ── Reason is echoed back ──────────────────────────────────────

  it("echoes back the reason provided", async () => {
    const caller = createAuthenticatedCaller();
    const reason = "RPN exceeded 100 for 3 consecutive days — immediate action needed";
    const result = await caller.fmeaDynamic.initiateCapa({
      fmeaItemId: 1,
      reason,
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("unreachable");
    expect(result.reason).toBe(reason);
  });
});

// ════════════════════════════════════════════════════════════════════
// Authentication Guards — Anonymous Rejection
// ════════════════════════════════════════════════════════════════════

describe("fmeaDynamic — authentication guards", () => {
  it("rejects anonymous caller for liveMatrix", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.fmeaDynamic.liveMatrix()).rejects.toThrow();
  });

  it("rejects anonymous caller for recalculate", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.fmeaDynamic.recalculate({ fmeaItemId: 1 }),
    ).rejects.toThrow();
  });

  it("rejects anonymous caller for initiateCapa", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.fmeaDynamic.initiateCapa({ fmeaItemId: 1, reason: "test" }),
    ).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════
// Cross-Procedure Consistency
// ════════════════════════════════════════════════════════════════════

describe("fmeaDynamic — cross-procedure consistency", () => {
  it("liveMatrix and recalculate return the same data for each FMEA item", async () => {
    const caller = createAuthenticatedCaller();
    const matrixResult = await caller.fmeaDynamic.liveMatrix();

    for (const matrixItem of matrixResult.items) {
      const singleResult = await caller.fmeaDynamic.recalculate({
        fmeaItemId: matrixItem.fmeaItemId,
      });
      expect(singleResult.found).toBe(true);
      if (!singleResult.found) continue;

      expect(singleResult.result.fmeaItemId).toBe(matrixItem.fmeaItemId);
      expect(singleResult.result.processStep).toBe(matrixItem.processStep);
      expect(singleResult.result.failureMode).toBe(matrixItem.failureMode);
      expect(singleResult.result.newOccurrence).toBe(matrixItem.newOccurrence);
      expect(singleResult.result.newRpn).toBe(matrixItem.newRpn);
      expect(singleResult.result.newStatus).toBe(matrixItem.newStatus);
      expect(singleResult.result.capaRequired).toBe(matrixItem.capaRequired);
      expect(singleResult.result.severity).toBe(matrixItem.severity);
      expect(singleResult.result.detection).toBe(matrixItem.detection);
      expect(singleResult.result.defectSummary.totalDefects30d).toBe(
        matrixItem.defectSummary.totalDefects30d,
      );
    }
  });

  it("initiateCapa failure mode matches recalculate failure mode", async () => {
    const caller = createAuthenticatedCaller();

    for (const fmeaItemId of [1, 2, 3, 4, 5, 6]) {
      const recalcResult = await caller.fmeaDynamic.recalculate({ fmeaItemId });
      const capaResult = await caller.fmeaDynamic.initiateCapa({
        fmeaItemId,
        reason: "Consistency test",
      });

      expect(recalcResult.found).toBe(true);
      expect(capaResult.success).toBe(true);
      if (!recalcResult.found || !capaResult.success) continue;

      expect(capaResult.failureMode).toBe(recalcResult.result.failureMode);
      expect(capaResult.processStep).toBe(recalcResult.result.processStep);
    }
  });

  it("all CRITICAL items in liveMatrix have capaRequired=true", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const criticalItems = result.items.filter(
      (i) => i.newStatus === "CRITICAL",
    );
    for (const item of criticalItems) {
      expect(item.capaRequired).toBe(true);
    }
  });

  it("no NOMINAL items have capaRequired=true", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const nominalItems = result.items.filter(
      (i) => i.newStatus === "NOMINAL",
    );
    for (const item of nominalItems) {
      expect(item.capaRequired).toBe(false);
    }
  });

  it("rpnSpiked is true iff rpnDelta > 0", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    for (const item of result.items) {
      expect(item.rpnSpiked).toBe(item.rpnDelta > 0);
    }
  });

  it("newRpn equals severity * newOccurrence * detection for all items", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    for (const item of result.items) {
      expect(item.newRpn).toBe(item.severity * item.newOccurrence * item.detection);
    }
  });

  it("previousRpn equals severity * previousOccurrence * detection for all items", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    for (const item of result.items) {
      expect(item.previousRpn).toBe(
        item.severity * item.previousOccurrence * item.detection,
      );
    }
  });
});

// ════════════════════════════════════════════════════════════════════
// Defect Summary Integrity
// ════════════════════════════════════════════════════════════════════

describe("fmeaDynamic — defect summary integrity", () => {
  it("recentDefects has at most 5 entries per item", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    for (const item of result.items) {
      expect(item.defectSummary.recentDefects.length).toBeLessThanOrEqual(5);
    }
  });

  it("defectsBySource values sum to totalDefects30d", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    for (const item of result.items) {
      const sourceTotal = Object.values(item.defectSummary.defectsBySource).reduce(
        (sum, count) => sum + count,
        0,
      );
      expect(sourceTotal).toBe(item.defectSummary.totalDefects30d);
    }
  });

  it("items with 0 defects have empty defectsBySource and recentDefects", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const zeroDefectItems = result.items.filter(
      (i) => i.defectSummary.totalDefects30d === 0,
    );
    // We know items #2 and #5 have 0 defects
    expect(zeroDefectItems.length).toBeGreaterThanOrEqual(2);

    for (const item of zeroDefectItems) {
      expect(Object.keys(item.defectSummary.defectsBySource)).toHaveLength(0);
      expect(item.defectSummary.recentDefects).toHaveLength(0);
    }
  });
});

// ════════════════════════════════════════════════════════════════════
// Live Pulse Message Integrity (via tRPC)
// ════════════════════════════════════════════════════════════════════

describe("fmeaDynamic — live pulse messages via tRPC", () => {
  it("items with 0 defects have 'No defects' in livePulse", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const zeroDefectItems = result.items.filter(
      (i) => i.defectSummary.totalDefects30d === 0,
    );
    for (const item of zeroDefectItems) {
      expect(item.livePulse).toContain("No defects");
    }
  });

  it("CRITICAL items have CAPA REQUIRED in livePulse", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const criticalItems = result.items.filter(
      (i) => i.newStatus === "CRITICAL",
    );
    for (const item of criticalItems) {
      expect(item.livePulse).toContain("CAPA REQUIRED");
    }
  });

  it("NOMINAL items do NOT have CAPA REQUIRED in livePulse", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    const nominalItems = result.items.filter(
      (i) => i.newStatus === "NOMINAL",
    );
    for (const item of nominalItems) {
      expect(item.livePulse).not.toContain("CAPA REQUIRED");
    }
  });

  it("spiked items with defects and increased occurrence mention 'jumped' in livePulse", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.fmeaDynamic.liveMatrix();

    // Only items with actual defects AND occurrence increase produce the "jumped" message.
    // Items with 0 defects can still have rpnSpiked=true (e.g., original occurrence=1
    // maps to newOccurrence=2 with 0 defects), but those get the "No defects" message.
    const spikedWithDefects = result.items.filter(
      (i) =>
        i.occurrenceDelta > 0 && i.defectSummary.totalDefects30d > 0,
    );
    expect(spikedWithDefects.length).toBeGreaterThan(0);
    for (const item of spikedWithDefects) {
      expect(item.livePulse).toContain("jumped");
    }
  });
});
