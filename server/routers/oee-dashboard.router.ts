/**
 * OEE Dashboard — Calculation Engine + tRPC Router
 * Phase 1.3 — IATF 16949 Compliance
 *
 * OEE = Availability x Performance x Quality
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Availability = Operating Time / Planned Production Time        │
 * │  Performance  = (Ideal Cycle Time x Total Count) / Op. Time     │
 * │  Quality      = Good Count / Total Count                        │
 * │  OEE          = A x P x Q                                      │
 * │                                                                 │
 * │  World-class OEE: ≥85% (Green)                                  │
 * │  Acceptable:      70–85% (Yellow)                               │
 * │  Critical:        <70% (Red)                                    │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Architecture: Pure calculation functions exported for Vitest.
 * Router provides mock-first dashboard data (Phase 0 pattern).
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { buScopeCondition } from "../_core/gateway-bu-context.middleware";
import { requireDb } from "../db";
import { eq, desc, and, sql } from "drizzle-orm";
import { productionEquipments } from "../../drizzle/production-equipment-schema";
import { productionShiftLogs, oeeSnapshots } from "../../drizzle/oee-schema";

// ─── Pure Calculation Engine (fully unit-testable) ──────────────────

export interface ShiftLogInput {
  plannedProductionMinutes: number;
  operatingMinutes: number;
  idealCycleTimeSeconds: number;
  totalCount: number;
  defectCount: number;
}

export interface OEEResult {
  availability: number;   // 0–1
  performance: number;    // 0–1
  quality: number;        // 0–1
  oee: number;            // 0–1
  availabilityPct: number; // 0–100
  performancePct: number;
  qualityPct: number;
  oeePct: number;
  grade: "world-class" | "acceptable" | "critical";
}

/**
 * Calculate OEE from a single shift's raw data.
 *
 * Defensive rules:
 * - Division by zero → 0 (not NaN, not Infinity)
 * - Performance capped at 1.0 (>100% means ideal cycle time is wrong, not a bonus)
 * - All values clamped to [0, 1]
 */
export function calculateOEE(input: ShiftLogInput): OEEResult {
  const {
    plannedProductionMinutes,
    operatingMinutes,
    idealCycleTimeSeconds,
    totalCount,
    defectCount,
  } = input;

  // Availability = Operating Time / Planned Production Time
  const availability = plannedProductionMinutes > 0
    ? clamp(operatingMinutes / plannedProductionMinutes)
    : 0;

  // Performance = (Ideal Cycle Time × Total Count) / Operating Time
  // Convert operating time to seconds for unit consistency
  const operatingSeconds = operatingMinutes * 60;
  const performance = operatingSeconds > 0
    ? clamp((idealCycleTimeSeconds * totalCount) / operatingSeconds)
    : 0;

  // Quality = Good Count / Total Count
  const goodCount = Math.max(0, totalCount - defectCount);
  const quality = totalCount > 0
    ? clamp(goodCount / totalCount)
    : 0;

  // OEE = A × P × Q
  const oee = availability * performance * quality;

  const oeePct = round(oee * 100);

  return {
    availability,
    performance,
    quality,
    oee,
    availabilityPct: round(availability * 100),
    performancePct: round(performance * 100),
    qualityPct: round(quality * 100),
    oeePct,
    grade: oeePct >= 85 ? "world-class" : oeePct >= 70 ? "acceptable" : "critical",
  };
}

/**
 * Aggregate multiple shift logs into a single OEE (e.g., daily summary).
 * Sums raw inputs then calculates once — mathematically correct aggregation.
 */
export function aggregateOEE(shifts: ShiftLogInput[]): OEEResult {
  if (shifts.length === 0) {
    return {
      availability: 0, performance: 0, quality: 0, oee: 0,
      availabilityPct: 0, performancePct: 0, qualityPct: 0, oeePct: 0,
      grade: "critical",
    };
  }

  // Sum raw inputs — the ONLY correct way to aggregate OEE.
  // Averaging percentages would be mathematically wrong.
  const totals = shifts.reduce(
    (acc, s) => ({
      plannedProductionMinutes: acc.plannedProductionMinutes + s.plannedProductionMinutes,
      operatingMinutes: acc.operatingMinutes + s.operatingMinutes,
      idealCycleTimeSeconds: s.idealCycleTimeSeconds, // same for all shifts of same machine
      totalCount: acc.totalCount + s.totalCount,
      defectCount: acc.defectCount + s.defectCount,
    }),
    { plannedProductionMinutes: 0, operatingMinutes: 0, idealCycleTimeSeconds: shifts[0].idealCycleTimeSeconds, totalCount: 0, defectCount: 0 },
  );

  return calculateOEE(totals);
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ─── Mock Data (realistic GRT cleaning equipment factory) ───────────

export interface MachineDashboardEntry {
  machineId: number;
  machineCode: string;
  machineName: string;
  location: string;
  status: string;
  oee: OEEResult;
  shiftsToday: number;
  lastUpdated: string;
}

const MOCK_DASHBOARD: MachineDashboardEntry[] = [
  {
    machineId: 1,
    machineCode: "CNC-001",
    machineName: "5-Axis CNC Mill",
    location: "Workshop A, Bay 3",
    status: "running",
    oee: calculateOEE({
      plannedProductionMinutes: 480,
      operatingMinutes: 438,
      idealCycleTimeSeconds: 120,
      totalCount: 198,
      defectCount: 5,
    }),
    shiftsToday: 2,
    lastUpdated: new Date().toISOString(),
  },
  {
    machineId: 2,
    machineCode: "WASH-003",
    machineName: "Ultrasonic Cleaning Station",
    location: "Cleanroom B",
    status: "running",
    oee: calculateOEE({
      plannedProductionMinutes: 480,
      operatingMinutes: 462,
      idealCycleTimeSeconds: 90,
      totalCount: 285,
      defectCount: 3,
    }),
    shiftsToday: 2,
    lastUpdated: new Date().toISOString(),
  },
  {
    machineId: 3,
    machineCode: "WELD-007",
    machineName: "Robotic Welder Cell",
    location: "Workshop C, Bay 1",
    status: "idle",
    oee: calculateOEE({
      plannedProductionMinutes: 480,
      operatingMinutes: 360,
      idealCycleTimeSeconds: 180,
      totalCount: 95,
      defectCount: 12,
    }),
    shiftsToday: 1,
    lastUpdated: new Date().toISOString(),
  },
  {
    machineId: 4,
    machineCode: "PAINT-002",
    machineName: "Automated Paint Booth",
    location: "Workshop D",
    status: "maintenance",
    oee: calculateOEE({
      plannedProductionMinutes: 480,
      operatingMinutes: 210,
      idealCycleTimeSeconds: 300,
      totalCount: 32,
      defectCount: 8,
    }),
    shiftsToday: 1,
    lastUpdated: new Date().toISOString(),
  },
];

// ─── Router ─────────────────────────────────────────────────────────

async function safeQuery<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch { return null; }
}

export const oeeDashboardRouter = router({
  /**
   * Global equipment dashboard for LobbyGlobalScreen.
   * Returns real equipment list grouped by region, with OEE from latest snapshots.
   */
  getGlobalEquipmentDashboard: protectedProcedure.query(async () => {
    const db = await requireDb();
    try {
      const eqResult = await db.execute(sql`
        SELECT id, code, name, type, location, status
        FROM production_equipments
        WHERE status != 'decommissioned'
        ORDER BY location, code
        LIMIT 100
      `);

      let oeeMap: Record<number, number> = {};
      try {
        const oeeResult = await db.execute(sql`
          SELECT machine_id, oee
          FROM oee_snapshots
          WHERE (machine_id, snapshot_date) IN (
            SELECT machine_id, MAX(snapshot_date)
            FROM oee_snapshots
            GROUP BY machine_id
          )
          LIMIT 200
        `);
        for (const r of ((oeeResult as any).rows ?? [])) {
          oeeMap[Number(r.machine_id)] = Number(r.oee ?? 0) * 100;
        }
      } catch { /* oee_snapshots table may not exist yet */ }

      const rows = ((eqResult as any).rows ?? []).map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        type: r.type,
        location: r.location || '中国',
        status: r.status,
        oee: oeeMap[Number(r.id)] ?? 0,
      }));

      const regionMap: Record<string, any[]> = {};
      for (const eq of rows) {
        const region = eq.location.includes('美') || eq.location.includes('US') ? '美洲'
          : eq.location.includes('欧') || eq.location.includes('EU') || eq.location.includes('德') ? '欧洲'
          : '中国';
        if (!regionMap[region]) regionMap[region] = [];
        regionMap[region].push(eq);
      }

      return {
        equipment: rows,
        regions: Object.entries(regionMap).map(([name, eqs]) => ({
          name,
          count: eqs.length,
          avgOee: eqs.length > 0 ? Number((eqs.reduce((s: number, e: any) => s + e.oee, 0) / eqs.length).toFixed(1)) : 0,
        })),
        totalCount: rows.length,
        avgOee: rows.length > 0 ? Number((rows.reduce((s: number, e: any) => s + e.oee, 0) / rows.length).toFixed(1)) : 0,
      };
    } catch {
      return { equipment: [], regions: [], totalCount: 0, avgOee: 0 };
    }
  }),

  /**
   * Dashboard overview: all machines with current OEE.
   * Mock-first: returns realistic data immediately.
   * When backend has real shift logs, overlays live calculations.
   */
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    // Try live data
    const live = await safeQuery(async () => {
      const db = await requireDb();
      // BU isolation: filter machines by user's BU
      const buFilter = buScopeCondition(productionEquipments.buCode, ctx);
      const machines = await db.select().from(productionEquipments).where(buFilter ?? undefined).limit(1000);
      if (!machines.length) return null;

      const entries: MachineDashboardEntry[] = [];
      const today = new Date().toISOString().split("T")[0];

      for (const machine of machines) {
        const logs = await db
          .select()
          .from(productionShiftLogs)
          .where(eq(productionShiftLogs.machineId, machine.id));

        const todayLogs = logs.filter((l) => l.shiftDate === today);

        const shifts: ShiftLogInput[] = todayLogs.map((l) => ({
          plannedProductionMinutes: l.plannedProductionMinutes,
          operatingMinutes: l.operatingMinutes,
          idealCycleTimeSeconds: Number(l.idealCycleTimeSeconds),
          totalCount: l.totalCount,
          defectCount: l.defectCount,
        }));

        const oee = shifts.length > 0
          ? aggregateOEE(shifts)
          : calculateOEE({ plannedProductionMinutes: 0, operatingMinutes: 0, idealCycleTimeSeconds: 1, totalCount: 0, defectCount: 0 });

        entries.push({
          machineId: machine.id,
          machineCode: machine.code,
          machineName: machine.name,
          location: machine.location ?? "",
          status: machine.status,
          oee,
          shiftsToday: todayLogs.length,
          lastUpdated: new Date().toISOString(),
        });
      }

      return entries.length > 0 ? entries : null;
    });

    return { machines: live ?? MOCK_DASHBOARD, isLive: !!live };
  }),

  /** Single machine OEE history (last 30 days) */
  machineHistory: protectedProcedure
    .input(z.object({ machineId: z.number(), days: z.number().default(30) }))
    .query(async ({ input, ctx }) => {
      const history = await safeQuery(async () => {
        const db = await requireDb();
        // BU isolation: verify machine belongs to user's BU before returning history
        const buFilter = buScopeCondition(productionEquipments.buCode, ctx);
        const machineConditions = [eq(productionEquipments.id, input.machineId)];
        if (buFilter) machineConditions.push(buFilter);
        const [machine] = await db.select({ id: productionEquipments.id })
          .from(productionEquipments)
          .where(and(...machineConditions));
        if (!machine) return null;

        return db
          .select()
          .from(oeeSnapshots)
          .where(eq(oeeSnapshots.machineId, input.machineId))
          .orderBy(desc(oeeSnapshots.snapshotDate))
          .limit(input.days);
      });

      // No snapshots yet — return empty history instead of random data
      if (!history || history.length === 0) {
        return { history: [], isLive: false };
      }

      return {
        history: history.map((h) => ({
          date: h.snapshotDate,
          oee: Number(h.oee) * 100,
          availability: Number(h.availability) * 100,
          performance: Number(h.performance) * 100,
          quality: Number(h.quality) * 100,
        })),
        isLive: true,
      };
    }),
});
