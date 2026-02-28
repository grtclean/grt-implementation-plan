/**
 * ECO Cost Impact Analysis — Cross-Domain Fusion Engine + tRPC Router
 * Phase 2.1 — PLM ↔ WMS ↔ ERP Silo Breaker
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                  THREE-DOMAIN FUSION                                │
 * │                                                                     │
 * │   ① PLM (Engineering)     ② WMS (Warehouse)    ③ ERP (Finance)     │
 * │   ┌──────────────┐        ┌───────────────┐    ┌──────────────┐    │
 * │   │ ECO Request  │───────▶│ Inventory     │───▶│ Cost Impact  │    │
 * │   │ Old Part→New │        │ Stock Check   │    │ Scrap + New  │    │
 * │   └──────────────┘        └───────────────┘    └──────────────┘    │
 * │                                                                     │
 * │   Sunk Cost = Σ(old_part_stock × old_unit_cost)                    │
 * │   New Procurement = Σ(new_part_qty × new_unit_cost)                │
 * │   Total Impact = Sunk Cost + New Procurement                       │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Architecture: Pure calculation function exported for Vitest.
 * Router provides mock-first data (Phase 0 pattern).
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

// ─── Types ───────────────────────────────────────────────────────────

export type EcoChangeType = "SUBSTITUTE" | "ADD" | "REMOVE" | "QUANTITY";
export type EcoStatus = "draft" | "pending_review" | "approved" | "rejected" | "implemented";

export interface BomChangeInput {
  id: number;
  changeType: EcoChangeType;
  oldPartNumber: string | null;
  oldPartName: string | null;
  newPartNumber: string | null;
  newPartName: string | null;
  oldQuantity: number;
  newQuantity: number;
  oldUnitCost: number;    // ¥ per unit
  newUnitCost: number;    // ¥ per unit
  reason: string;
}

export interface InventoryLookup {
  partNumber: string;
  stockQuantity: number;
  warehouseLocation: string;
}

export interface EcoInput {
  ecoId: string;
  title: string;
  description: string;
  status: EcoStatus;
  requestedBy: string;
  changes: BomChangeInput[];
  inventory: InventoryLookup[];
}

export interface PartImpactDetail {
  changeId: number;
  changeType: EcoChangeType;
  oldPartNumber: string | null;
  oldPartName: string | null;
  newPartNumber: string | null;
  newPartName: string | null;
  stockQuantity: number;
  oldUnitCost: number;
  newUnitCost: number;
  scrapCost: number;         // stock × old unit cost (only for SUBSTITUTE/REMOVE)
  procurementCost: number;   // new qty × new unit cost (only for SUBSTITUTE/ADD)
  reason: string;
}

export interface EcoFinancialImpact {
  ecoId: string;
  title: string;
  scrapRiskValue: number;       // Total sunk cost from obsolete inventory
  newProcurementCost: number;   // Total budget needed for new parts
  totalFinancialImpact: number; // scrap + procurement
  affectedInventoryCount: number;
  affectedPartNumbers: string[];
  partDetails: PartImpactDetail[];
  currency: string;
  calculatedAt: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

// ─── Pure Calculation Engine (fully unit-testable) ───────────────────

/**
 * Calculate the full financial impact of an Engineering Change Order.
 *
 * For each BOM change line:
 *   SUBSTITUTE: scrap = stock_of_old × old_cost, procurement = new_qty × new_cost
 *   REMOVE:     scrap = stock_of_old × old_cost, procurement = 0
 *   ADD:        scrap = 0, procurement = new_qty × new_cost
 *   QUANTITY:   scrap = 0 (same part), procurement = delta_qty × unit_cost (if increasing)
 *
 * Risk levels:
 *   LOW      < ¥10,000
 *   MEDIUM   ¥10,000 – ¥49,999
 *   HIGH     ¥50,000 – ¥199,999
 *   CRITICAL ≥ ¥200,000
 */
export function calculateEcoFinancialImpact(input: EcoInput): EcoFinancialImpact {
  const { ecoId, title, changes, inventory } = input;

  // Build inventory lookup map: partNumber → stockQuantity
  const inventoryMap = new Map<string, InventoryLookup>();
  for (const inv of inventory) {
    inventoryMap.set(inv.partNumber, inv);
  }

  let totalScrap = 0;
  let totalProcurement = 0;
  const affectedParts = new Set<string>();
  let affectedInventoryCount = 0;
  const partDetails: PartImpactDetail[] = [];

  for (const change of changes) {
    let scrapCost = 0;
    let procurementCost = 0;
    let stockQty = 0;

    switch (change.changeType) {
      case "SUBSTITUTE": {
        // Old part becomes obsolete — existing inventory is potential scrap
        if (change.oldPartNumber) {
          const inv = inventoryMap.get(change.oldPartNumber);
          stockQty = inv ? Math.max(0, inv.stockQuantity) : 0;
          scrapCost = stockQty * change.oldUnitCost;
          if (stockQty > 0) {
            affectedParts.add(change.oldPartNumber);
            affectedInventoryCount += stockQty;
          }
        }
        // New part needs procurement
        if (change.newPartNumber) {
          procurementCost = Math.max(0, change.newQuantity) * change.newUnitCost;
          affectedParts.add(change.newPartNumber);
        }
        break;
      }

      case "REMOVE": {
        // Part removed — existing inventory is scrap, no new procurement
        if (change.oldPartNumber) {
          const inv = inventoryMap.get(change.oldPartNumber);
          stockQty = inv ? Math.max(0, inv.stockQuantity) : 0;
          scrapCost = stockQty * change.oldUnitCost;
          if (stockQty > 0) {
            affectedParts.add(change.oldPartNumber);
            affectedInventoryCount += stockQty;
          }
        }
        break;
      }

      case "ADD": {
        // New part added — no scrap, only procurement
        if (change.newPartNumber) {
          procurementCost = Math.max(0, change.newQuantity) * change.newUnitCost;
          affectedParts.add(change.newPartNumber);
        }
        break;
      }

      case "QUANTITY": {
        // Same part, quantity change — procurement only if increasing
        const delta = change.newQuantity - change.oldQuantity;
        if (delta > 0 && change.newPartNumber) {
          procurementCost = delta * change.newUnitCost;
          affectedParts.add(change.newPartNumber);
        }
        break;
      }
    }

    totalScrap += scrapCost;
    totalProcurement += procurementCost;

    partDetails.push({
      changeId: change.id,
      changeType: change.changeType,
      oldPartNumber: change.oldPartNumber,
      oldPartName: change.oldPartName,
      newPartNumber: change.newPartNumber,
      newPartName: change.newPartName,
      stockQuantity: stockQty,
      oldUnitCost: change.oldUnitCost,
      newUnitCost: change.newUnitCost,
      scrapCost: round2(scrapCost),
      procurementCost: round2(procurementCost),
      reason: change.reason,
    });
  }

  const totalImpact = totalScrap + totalProcurement;

  return {
    ecoId,
    title,
    scrapRiskValue: round2(totalScrap),
    newProcurementCost: round2(totalProcurement),
    totalFinancialImpact: round2(totalImpact),
    affectedInventoryCount,
    affectedPartNumbers: Array.from(affectedParts),
    partDetails,
    currency: "CNY",
    calculatedAt: new Date().toISOString(),
    riskLevel: classifyRisk(totalImpact),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function classifyRisk(amount: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (amount >= 200000) return "CRITICAL";
  if (amount >= 50000) return "HIGH";
  if (amount >= 10000) return "MEDIUM";
  return "LOW";
}

// ─── Mock Data (CEO demo — GRT cleaning equipment parts) ─────────────

interface MockEco {
  ecoId: string;
  title: string;
  description: string;
  status: EcoStatus;
  requestedBy: string;
  requestDate: string;
  targetMachine: string;
  changes: BomChangeInput[];
  inventory: InventoryLookup[];
}

const MOCK_ECOS: MockEco[] = [
  {
    ecoId: "ECO-2026-001",
    title: "Upgrade bearing to high-temp variant for WASH-003",
    description: "Production line WASH-003 experiences bearing failures at 180°C alkaline wash cycles. Replace SKF 6205-2Z with SKF 6205-2Z/VA208 (high-temp rated to 250°C). This ECO also requires a new thermal gasket kit.",
    status: "pending_review",
    requestedBy: "Wang Jun (工程部)",
    requestDate: "2026-02-20",
    targetMachine: "WASH-003 (Industrial Parts Washer)",
    changes: [
      {
        id: 1,
        changeType: "SUBSTITUTE",
        oldPartNumber: "BRG-SKF-6205-2Z",
        oldPartName: "SKF 6205-2Z Standard Bearing",
        newPartNumber: "BRG-SKF-6205-HT",
        newPartName: "SKF 6205-2Z/VA208 High-Temp Bearing",
        oldQuantity: 4,
        newQuantity: 4,
        oldUnitCost: 85.00,
        newUnitCost: 220.00,
        reason: "Standard bearings fail at 180°C alkaline wash. High-temp variant rated to 250°C.",
      },
      {
        id: 2,
        changeType: "ADD",
        oldPartNumber: null,
        oldPartName: null,
        newPartNumber: "GSK-VITON-003",
        newPartName: "Viton Thermal Gasket Kit (WASH-003)",
        oldQuantity: 0,
        newQuantity: 2,
        oldUnitCost: 0,
        newUnitCost: 340.00,
        reason: "New thermal gasket required for high-temp bearing housing seal.",
      },
      {
        id: 3,
        changeType: "REMOVE",
        oldPartNumber: "GSK-NBR-003",
        oldPartName: "NBR Standard Gasket Kit",
        newPartNumber: null,
        newPartName: null,
        oldQuantity: 2,
        newQuantity: 0,
        oldUnitCost: 45.00,
        newUnitCost: 0,
        reason: "NBR gaskets not compatible with new high-temp configuration.",
      },
    ],
    inventory: [
      { partNumber: "BRG-SKF-6205-2Z", stockQuantity: 24, warehouseLocation: "WH01-A-02-03" },
      { partNumber: "GSK-NBR-003", stockQuantity: 8, warehouseLocation: "WH01-B-01-05" },
      { partNumber: "BRG-SKF-6205-HT", stockQuantity: 0, warehouseLocation: "N/A" },
      { partNumber: "GSK-VITON-003", stockQuantity: 0, warehouseLocation: "N/A" },
    ],
  },
  {
    ecoId: "ECO-2026-002",
    title: "Replace PLC controller for CNC-001 spray nozzle system",
    description: "Siemens S7-300 PLC is end-of-life. Upgrade to S7-1500 for CNC-001 spray nozzle control. Requires new I/O module and updated wiring harness.",
    status: "pending_review",
    requestedBy: "Li Ming (自动化部)",
    requestDate: "2026-02-18",
    targetMachine: "CNC-001 (5-Axis CNC Mill)",
    changes: [
      {
        id: 1,
        changeType: "SUBSTITUTE",
        oldPartNumber: "PLC-S7-300-CPU",
        oldPartName: "Siemens S7-300 CPU 315-2DP",
        newPartNumber: "PLC-S7-1500-CPU",
        newPartName: "Siemens S7-1500 CPU 1515-2PN",
        oldQuantity: 1,
        newQuantity: 1,
        oldUnitCost: 12800.00,
        newUnitCost: 18500.00,
        reason: "S7-300 series end-of-life 2027. Proactive upgrade to S7-1500.",
      },
      {
        id: 2,
        changeType: "SUBSTITUTE",
        oldPartNumber: "IO-S7-300-DI16",
        oldPartName: "S7-300 Digital Input Module (16ch)",
        newPartNumber: "IO-S7-1500-DI32",
        newPartName: "S7-1500 Digital Input Module (32ch)",
        oldQuantity: 2,
        newQuantity: 1,
        oldUnitCost: 2200.00,
        newUnitCost: 3800.00,
        reason: "New 32ch module replaces two 16ch modules. Halves slot count.",
      },
      {
        id: 3,
        changeType: "ADD",
        oldPartNumber: null,
        oldPartName: null,
        newPartNumber: "CBL-PROFINET-10M",
        newPartName: "PROFINET Cable Assembly (10m, shielded)",
        oldQuantity: 0,
        newQuantity: 3,
        oldUnitCost: 0,
        newUnitCost: 185.00,
        reason: "S7-1500 uses PROFINET instead of MPI. New cabling required.",
      },
    ],
    inventory: [
      { partNumber: "PLC-S7-300-CPU", stockQuantity: 2, warehouseLocation: "WH02-C-01-01" },
      { partNumber: "IO-S7-300-DI16", stockQuantity: 6, warehouseLocation: "WH02-C-01-03" },
      { partNumber: "PLC-S7-1500-CPU", stockQuantity: 0, warehouseLocation: "N/A" },
      { partNumber: "IO-S7-1500-DI32", stockQuantity: 0, warehouseLocation: "N/A" },
      { partNumber: "CBL-PROFINET-10M", stockQuantity: 0, warehouseLocation: "N/A" },
    ],
  },
  {
    ecoId: "ECO-2026-003",
    title: "Increase nozzle quantity on PAINT-002 spray bar",
    description: "Customer BMW requires finer coating distribution. Increase spray nozzles from 8 to 12 per bar. Same nozzle part, quantity change only.",
    status: "draft",
    requestedBy: "Chen Li (销售部)",
    requestDate: "2026-02-22",
    targetMachine: "PAINT-002 (Automated Paint Booth)",
    changes: [
      {
        id: 1,
        changeType: "QUANTITY",
        oldPartNumber: "NZL-FAN-0.8MM",
        oldPartName: "Fan-pattern Spray Nozzle (0.8mm orifice)",
        newPartNumber: "NZL-FAN-0.8MM",
        newPartName: "Fan-pattern Spray Nozzle (0.8mm orifice)",
        oldQuantity: 8,
        newQuantity: 12,
        oldUnitCost: 125.00,
        newUnitCost: 125.00,
        reason: "BMW specification requires finer coating distribution — 12 nozzles per bar.",
      },
    ],
    inventory: [
      { partNumber: "NZL-FAN-0.8MM", stockQuantity: 20, warehouseLocation: "WH01-D-02-01" },
    ],
  },
];

// ─── tRPC Router ─────────────────────────────────────────────────────

export const ecoImpactRouter = router({
  /**
   * listEcos — returns all ECOs with summary impact data.
   */
  listEcos: protectedProcedure.query(async () => {
    const results = MOCK_ECOS.map((eco) => {
      const impact = calculateEcoFinancialImpact(eco);
      return {
        ecoId: eco.ecoId,
        title: eco.title,
        status: eco.status,
        requestedBy: eco.requestedBy,
        requestDate: eco.requestDate,
        targetMachine: eco.targetMachine,
        totalImpact: impact.totalFinancialImpact,
        riskLevel: impact.riskLevel,
        changeCount: eco.changes.length,
      };
    });
    return { ecos: results, dataSource: "mock" as const };
  }),

  /**
   * getEcoImpact — full financial impact analysis for a single ECO.
   * The core fusion query: PLM × WMS × ERP in one response.
   */
  getEcoImpact: protectedProcedure
    .input(z.object({ ecoId: z.string() }))
    .query(async ({ input }) => {
      const eco = MOCK_ECOS.find((e) => e.ecoId === input.ecoId);
      if (!eco) {
        return {
          found: false as const,
          error: `ECO ${input.ecoId} not found`,
        };
      }

      const impact = calculateEcoFinancialImpact(eco);

      return {
        found: true as const,
        eco: {
          ecoId: eco.ecoId,
          title: eco.title,
          description: eco.description,
          status: eco.status,
          requestedBy: eco.requestedBy,
          requestDate: eco.requestDate,
          targetMachine: eco.targetMachine,
        },
        impact,
        dataSource: "mock" as const,
      };
    }),

  /**
   * approveEco — approve ECO with financial impact acknowledgment.
   */
  approveEco: protectedProcedure
    .input(z.object({
      ecoId: z.string(),
      approverNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Phase 4: update engineering_change_orders status + create ecoImpactSnapshots record
      return {
        success: true,
        ecoId: input.ecoId,
        newStatus: "approved" as const,
        approvedAt: new Date().toISOString(),
      };
    }),

  /**
   * rejectEco — reject ECO with reason.
   */
  rejectEco: protectedProcedure
    .input(z.object({
      ecoId: z.string(),
      rejectReason: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      return {
        success: true,
        ecoId: input.ecoId,
        newStatus: "rejected" as const,
        rejectedAt: new Date().toISOString(),
        reason: input.rejectReason,
      };
    }),
});
