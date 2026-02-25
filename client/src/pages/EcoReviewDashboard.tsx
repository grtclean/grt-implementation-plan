/**
 * ECO Cost Impact Review Dashboard — Phase 2.1
 * High-stakes approval dashboard for Division Manager / CEO.
 *
 * Layout:
 *   Left Panel: ECO Details (description, requester, target machine)
 *   Right Panel: Financial Impact Radar (scrap in red, procurement in orange)
 *   Bottom: Change lines table + Approve/Reject
 *
 * Route: /engineering/eco-review/:id
 */

import React, { useState, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────

type EcoChangeType = "SUBSTITUTE" | "ADD" | "REMOVE" | "QUANTITY";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface BomChangeInput {
  id: number;
  changeType: EcoChangeType;
  oldPartNumber: string | null;
  oldPartName: string | null;
  newPartNumber: string | null;
  newPartName: string | null;
  oldQuantity: number;
  newQuantity: number;
  oldUnitCost: number;
  newUnitCost: number;
  reason: string;
}

interface InventoryLookup {
  partNumber: string;
  stockQuantity: number;
  warehouseLocation: string;
}

interface PartImpactDetail {
  changeId: number;
  changeType: EcoChangeType;
  oldPartNumber: string | null;
  oldPartName: string | null;
  newPartNumber: string | null;
  newPartName: string | null;
  stockQuantity: number;
  oldUnitCost: number;
  newUnitCost: number;
  scrapCost: number;
  procurementCost: number;
  reason: string;
}

interface EcoData {
  ecoId: string;
  title: string;
  description: string;
  status: string;
  requestedBy: string;
  requestDate: string;
  targetMachine: string;
  changes: BomChangeInput[];
  inventory: InventoryLookup[];
}

// ─── Impact Engine (matches server logic) ────────────────────────────

function calculateImpact(eco: EcoData) {
  const invMap = new Map<string, InventoryLookup>();
  eco.inventory.forEach(i => invMap.set(i.partNumber, i));

  let totalScrap = 0;
  let totalProc = 0;
  let affectedCount = 0;
  const details: PartImpactDetail[] = [];

  for (const c of eco.changes) {
    let scrap = 0, proc = 0, stock = 0;
    if (c.changeType === "SUBSTITUTE" || c.changeType === "REMOVE") {
      if (c.oldPartNumber) {
        const inv = invMap.get(c.oldPartNumber);
        stock = inv ? Math.max(0, inv.stockQuantity) : 0;
        scrap = stock * c.oldUnitCost;
        if (stock > 0) affectedCount += stock;
      }
    }
    if (c.changeType === "SUBSTITUTE" || c.changeType === "ADD") {
      proc = Math.max(0, c.newQuantity) * c.newUnitCost;
    }
    if (c.changeType === "QUANTITY") {
      const delta = c.newQuantity - c.oldQuantity;
      if (delta > 0) proc = delta * c.newUnitCost;
    }
    totalScrap += scrap;
    totalProc += proc;
    details.push({
      changeId: c.id, changeType: c.changeType,
      oldPartNumber: c.oldPartNumber, oldPartName: c.oldPartName,
      newPartNumber: c.newPartNumber, newPartName: c.newPartName,
      stockQuantity: stock, oldUnitCost: c.oldUnitCost, newUnitCost: c.newUnitCost,
      scrapCost: Math.round(scrap * 100) / 100,
      procurementCost: Math.round(proc * 100) / 100,
      reason: c.reason,
    });
  }

  const total = totalScrap + totalProc;
  const risk: RiskLevel = total >= 200000 ? "CRITICAL" : total >= 50000 ? "HIGH" : total >= 10000 ? "MEDIUM" : "LOW";

  return {
    scrapRiskValue: Math.round(totalScrap * 100) / 100,
    newProcurementCost: Math.round(totalProc * 100) / 100,
    totalFinancialImpact: Math.round(total * 100) / 100,
    affectedInventoryCount: affectedCount,
    riskLevel: risk,
    partDetails: details,
  };
}

// ─── Mock ECO Data ───────────────────────────────────────────────────

const MOCK_ECOS: Record<string, EcoData> = {
  "ECO-2026-001": {
    ecoId: "ECO-2026-001",
    title: "Upgrade bearing to high-temp variant for WASH-003",
    description: "Production line WASH-003 experiences bearing failures at 180°C alkaline wash cycles. Replace SKF 6205-2Z with SKF 6205-2Z/VA208 (high-temp rated to 250°C). This ECO also requires a new thermal gasket kit and removal of the incompatible NBR gasket.",
    status: "pending_review",
    requestedBy: "Wang Jun (工程部)",
    requestDate: "2026-02-20",
    targetMachine: "WASH-003 (Industrial Parts Washer)",
    changes: [
      { id: 1, changeType: "SUBSTITUTE", oldPartNumber: "BRG-SKF-6205-2Z", oldPartName: "SKF 6205-2Z Standard Bearing", newPartNumber: "BRG-SKF-6205-HT", newPartName: "SKF 6205-2Z/VA208 High-Temp Bearing", oldQuantity: 4, newQuantity: 4, oldUnitCost: 85, newUnitCost: 220, reason: "Standard bearings fail at 180°C alkaline wash. High-temp variant rated to 250°C." },
      { id: 2, changeType: "ADD", oldPartNumber: null, oldPartName: null, newPartNumber: "GSK-VITON-003", newPartName: "Viton Thermal Gasket Kit (WASH-003)", oldQuantity: 0, newQuantity: 2, oldUnitCost: 0, newUnitCost: 340, reason: "New thermal gasket required for high-temp bearing housing seal." },
      { id: 3, changeType: "REMOVE", oldPartNumber: "GSK-NBR-003", oldPartName: "NBR Standard Gasket Kit", newPartNumber: null, newPartName: null, oldQuantity: 2, newQuantity: 0, oldUnitCost: 45, newUnitCost: 0, reason: "NBR gaskets not compatible with new high-temp configuration." },
    ],
    inventory: [
      { partNumber: "BRG-SKF-6205-2Z", stockQuantity: 24, warehouseLocation: "WH01-A-02-03" },
      { partNumber: "GSK-NBR-003", stockQuantity: 8, warehouseLocation: "WH01-B-01-05" },
      { partNumber: "BRG-SKF-6205-HT", stockQuantity: 0, warehouseLocation: "N/A" },
      { partNumber: "GSK-VITON-003", stockQuantity: 0, warehouseLocation: "N/A" },
    ],
  },
  "ECO-2026-002": {
    ecoId: "ECO-2026-002",
    title: "Replace PLC controller for CNC-001 spray nozzle system",
    description: "Siemens S7-300 PLC is end-of-life (EOL 2027). Upgrade to S7-1500 for CNC-001 spray nozzle control. Requires new I/O module and PROFINET cabling.",
    status: "pending_review",
    requestedBy: "Li Ming (自动化部)",
    requestDate: "2026-02-18",
    targetMachine: "CNC-001 (5-Axis CNC Mill)",
    changes: [
      { id: 1, changeType: "SUBSTITUTE", oldPartNumber: "PLC-S7-300-CPU", oldPartName: "Siemens S7-300 CPU 315-2DP", newPartNumber: "PLC-S7-1500-CPU", newPartName: "Siemens S7-1500 CPU 1515-2PN", oldQuantity: 1, newQuantity: 1, oldUnitCost: 12800, newUnitCost: 18500, reason: "S7-300 series end-of-life 2027. Proactive upgrade." },
      { id: 2, changeType: "SUBSTITUTE", oldPartNumber: "IO-S7-300-DI16", oldPartName: "S7-300 Digital Input Module (16ch)", newPartNumber: "IO-S7-1500-DI32", newPartName: "S7-1500 Digital Input Module (32ch)", oldQuantity: 2, newQuantity: 1, oldUnitCost: 2200, newUnitCost: 3800, reason: "New 32ch module replaces two 16ch. Halves slot count." },
      { id: 3, changeType: "ADD", oldPartNumber: null, oldPartName: null, newPartNumber: "CBL-PROFINET-10M", newPartName: "PROFINET Cable Assembly (10m, shielded)", oldQuantity: 0, newQuantity: 3, oldUnitCost: 0, newUnitCost: 185, reason: "S7-1500 uses PROFINET instead of MPI." },
    ],
    inventory: [
      { partNumber: "PLC-S7-300-CPU", stockQuantity: 2, warehouseLocation: "WH02-C-01-01" },
      { partNumber: "IO-S7-300-DI16", stockQuantity: 6, warehouseLocation: "WH02-C-01-03" },
      { partNumber: "PLC-S7-1500-CPU", stockQuantity: 0, warehouseLocation: "N/A" },
      { partNumber: "IO-S7-1500-DI32", stockQuantity: 0, warehouseLocation: "N/A" },
      { partNumber: "CBL-PROFINET-10M", stockQuantity: 0, warehouseLocation: "N/A" },
    ],
  },
};

// ─── Style Helpers ───────────────────────────────────────────────────

const RISK_COLORS: Record<RiskLevel, { color: string; bg: string; border: string }> = {
  LOW:      { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)" },
  MEDIUM:   { color: "#eab308", bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.3)" },
  HIGH:     { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" },
  CRITICAL: { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)" },
};

const CHANGE_TYPE_LABELS: Record<EcoChangeType, { label: string; color: string }> = {
  SUBSTITUTE: { label: "Substitute", color: "#f97316" },
  ADD:        { label: "Add",        color: "#3b82f6" },
  REMOVE:     { label: "Remove",     color: "#ef4444" },
  QUANTITY:   { label: "Qty Change", color: "#8b5cf6" },
};

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── SVG Impact Gauge ────────────────────────────────────────────────

function ImpactGauge({ scrap, procurement, total }: { scrap: number; procurement: number; total: number }) {
  const maxVal = Math.max(total, 1);
  const scrapPct = (scrap / maxVal) * 100;
  const procPct = (procurement / maxVal) * 100;
  const size = 200;
  const r = 75;
  const circ = 2 * Math.PI * r;

  // Two-arc donut: scrap (red) + procurement (orange)
  const scrapArc = (scrapPct / 100) * circ;
  const procArc = (procPct / 100) * circ;
  const gap = circ - scrapArc - procArc;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background ring */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={20} />

      {/* Scrap arc (red) */}
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="#ef4444" strokeWidth={20}
        strokeDasharray={`${scrapArc} ${circ - scrapArc}`}
        strokeLinecap="butt"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ filter: "drop-shadow(0 0 6px rgba(239,68,68,0.5))" }}
      />

      {/* Procurement arc (orange) */}
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="#f97316" strokeWidth={20}
        strokeDasharray={`${procArc} ${circ - procArc}`}
        strokeDashoffset={-scrapArc}
        strokeLinecap="butt"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ filter: "drop-shadow(0 0 6px rgba(249,115,22,0.5))" }}
      />

      {/* Center text */}
      <text x={size/2} y={size/2 - 8} textAnchor="middle" fill="#f1f5f9" fontSize={14} fontWeight={700}>
        TOTAL
      </text>
      <text x={size/2} y={size/2 + 14} textAnchor="middle" fill="#f1f5f9" fontSize={18} fontWeight={800}>
        {formatCurrency(total)}
      </text>
    </svg>
  );
}

// ─── Components ──────────────────────────────────────────────────────

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ color: "#94a3b8", fontSize: 13 }}>{label}</span>
      <span style={{ color: color || "#e2e8f0", fontSize: 13, fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );
}

function ChangeTypeBadge({ type }: { type: EcoChangeType }) {
  const cfg = CHANGE_TYPE_LABELS[type];
  return (
    <span style={{
      padding: "2px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
      color: cfg.color, background: `${cfg.color}20`,
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function EcoReviewDashboard() {
  // Extract ECO ID from URL path
  const pathParts = window.location.pathname.split("/");
  const ecoIdFromUrl = pathParts[pathParts.length - 1] || "ECO-2026-001";

  const [selectedEcoId, setSelectedEcoId] = useState(ecoIdFromUrl);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);

  const eco = MOCK_ECOS[selectedEcoId] || MOCK_ECOS["ECO-2026-001"];
  const impact = useMemo(() => calculateImpact(eco), [eco]);
  const riskCfg = RISK_COLORS[impact.riskLevel];

  const handleApprove = () => {
    setDecision("approved");
    setShowConfirmApprove(false);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    setDecision("rejected");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        borderBottom: "1px solid #1e293b", padding: "20px 32px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>PHASE 2.1 — CROSS-DOMAIN FUSION</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 26 }}>🔗</span>
              ECO Cost Impact Review
            </h1>
            <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>
              PLM (Engineering) × WMS (Warehouse) × ERP (Finance) — Three-Domain Data Fusion
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* ECO selector */}
            <select
              value={selectedEcoId}
              onChange={(e) => { setSelectedEcoId(e.target.value); setDecision(null); setShowConfirmApprove(false); }}
              style={{
                padding: "6px 12px", borderRadius: 6, border: "1px solid #334155",
                background: "#1e293b", color: "#e2e8f0", fontSize: 13,
              }}
            >
              {Object.keys(MOCK_ECOS).map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            <span style={{
              padding: "4px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 500,
              background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)",
            }}>
              DEMO Data
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1500, margin: "0 auto" }}>
        {/* Decision banner */}
        {decision && (
          <div style={{
            padding: "16px 24px", borderRadius: 12, marginBottom: 24,
            background: decision === "approved" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${decision === "approved" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 28 }}>{decision === "approved" ? "✅" : "❌"}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: decision === "approved" ? "#22c55e" : "#ef4444" }}>
                ECO {decision === "approved" ? "APPROVED" : "REJECTED"}
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                {decision === "approved"
                  ? `Financial impact of ${formatCurrency(impact.totalFinancialImpact)} acknowledged. Procurement workflow initiated.`
                  : `Reason: ${rejectReason || "Cost impact too high"}`}
              </div>
            </div>
          </div>
        )}

        {/* Two-Panel Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          {/* Left Panel: ECO Details */}
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b",
            borderRadius: 12, padding: 24,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: "#e2e8f0" }}>
              ECO Details
            </h2>
            <div style={{
              background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 16, marginBottom: 16,
              borderLeft: "4px solid #3b82f6",
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{eco.ecoId}</div>
              <div style={{ fontSize: 14, color: "#94a3b8" }}>{eco.title}</div>
            </div>

            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 16 }}>
              {eco.description}
            </p>

            <InfoRow label="Status" value={eco.status.replace(/_/g, " ").toUpperCase()} color="#eab308" />
            <InfoRow label="Requested By" value={eco.requestedBy} />
            <InfoRow label="Request Date" value={eco.requestDate} />
            <InfoRow label="Target Machine" value={eco.targetMachine} />
            <InfoRow label="Change Lines" value={`${eco.changes.length} parts affected`} />

            {/* Inventory lookup */}
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "20px 0 10px", color: "#e2e8f0" }}>
              Warehouse Inventory (WMS)
            </h3>
            <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #1e293b" }}>
              {eco.inventory.map((inv, i) => (
                <div key={inv.partNumber} style={{
                  display: "flex", justifyContent: "space-between", padding: "8px 12px",
                  background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                  fontSize: 12,
                }}>
                  <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{inv.partNumber}</span>
                  <span style={{ display: "flex", gap: 16 }}>
                    <span style={{ color: inv.stockQuantity > 0 ? "#eab308" : "#475569" }}>
                      {inv.stockQuantity} units
                    </span>
                    <span style={{ color: "#475569", width: 100, textAlign: "right" }}>{inv.warehouseLocation}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Financial Impact Radar */}
          <div style={{
            background: "rgba(255,255,255,0.03)", border: `1px solid ${riskCfg.border}`,
            borderRadius: 12, padding: 24,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#e2e8f0" }}>
                Financial Impact Radar
              </h2>
              <span style={{
                padding: "4px 14px", borderRadius: 9999, fontSize: 12, fontWeight: 700,
                color: riskCfg.color, background: riskCfg.bg, border: `1px solid ${riskCfg.border}`,
              }}>
                {impact.riskLevel} RISK
              </span>
            </div>

            {/* Gauge + Numbers */}
            <div style={{ display: "flex", alignItems: "center", gap: 32, marginBottom: 24 }}>
              <ImpactGauge scrap={impact.scrapRiskValue} procurement={impact.newProcurementCost} total={impact.totalFinancialImpact} />

              <div style={{ flex: 1 }}>
                {/* Scrap Cost */}
                <div style={{
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 10, padding: 16, marginBottom: 12,
                }}>
                  <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 500, marginBottom: 4 }}>
                    SUNK COST (报废成本)
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#ef4444" }}>
                    {formatCurrency(impact.scrapRiskValue)}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    {impact.affectedInventoryCount} units of existing inventory at risk
                  </div>
                </div>

                {/* New Procurement */}
                <div style={{
                  background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)",
                  borderRadius: 10, padding: 16,
                }}>
                  <div style={{ fontSize: 12, color: "#f97316", fontWeight: 500, marginBottom: 4 }}>
                    NEW PROCUREMENT (新增采购)
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#f97316" }}>
                    {formatCurrency(impact.newProcurementCost)}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    Budget required for replacement parts
                  </div>
                </div>
              </div>
            </div>

            {/* Warning Banner */}
            <div style={{
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 8, padding: "14px 16px",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fca5a5", marginBottom: 2 }}>
                  Inventory Obsolescence Warning
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                  Approving this ECO will instantly render <strong style={{ color: "#ef4444" }}>{formatCurrency(impact.scrapRiskValue)}</strong> of
                  existing inventory obsolete across <strong style={{ color: "#eab308" }}>{impact.affectedInventoryCount} units</strong> in
                  warehouse. Finance and warehouse teams will be notified automatically.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Lines Table */}
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b",
          borderRadius: 12, padding: 24, marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: "#e2e8f0" }}>
            BOM Change Lines — Part-Level Impact Breakdown
          </h2>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #1e293b" }}>
                  {["#", "Type", "Old Part", "New Part", "Stock", "Scrap Cost", "Procurement", "Reason"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 500, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {impact.partDetails.map((d, i) => (
                  <tr key={d.changeId} style={{ borderBottom: "1px solid #1e293b", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{d.changeId}</td>
                    <td style={{ padding: "10px 12px" }}><ChangeTypeBadge type={d.changeType} /></td>
                    <td style={{ padding: "10px 12px" }}>
                      {d.oldPartNumber ? (
                        <div>
                          <div style={{ fontFamily: "monospace", color: "#f1f5f9" }}>{d.oldPartNumber}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{d.oldPartName}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>@ {formatCurrency(d.oldUnitCost)}/unit</div>
                        </div>
                      ) : <span style={{ color: "#334155" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {d.newPartNumber ? (
                        <div>
                          <div style={{ fontFamily: "monospace", color: "#f1f5f9" }}>{d.newPartNumber}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{d.newPartName}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>@ {formatCurrency(d.newUnitCost)}/unit</div>
                        </div>
                      ) : <span style={{ color: "#334155" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <span style={{ color: d.stockQuantity > 0 ? "#eab308" : "#334155", fontWeight: 600 }}>
                        {d.stockQuantity}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ color: d.scrapCost > 0 ? "#ef4444" : "#334155", fontWeight: 600 }}>
                        {d.scrapCost > 0 ? formatCurrency(d.scrapCost) : "—"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ color: d.procurementCost > 0 ? "#f97316" : "#334155", fontWeight: 600 }}>
                        {d.procurementCost > 0 ? formatCurrency(d.procurementCost) : "—"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#94a3b8", maxWidth: 250 }}>
                      {d.reason}
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr style={{ borderTop: "2px solid #334155", background: "rgba(255,255,255,0.03)" }}>
                  <td colSpan={5} style={{ padding: "12px", fontWeight: 700, color: "#e2e8f0", textAlign: "right" }}>
                    TOTAL FINANCIAL IMPACT
                  </td>
                  <td style={{ padding: "12px", fontWeight: 700, color: "#ef4444", fontSize: 15 }}>
                    {formatCurrency(impact.scrapRiskValue)}
                  </td>
                  <td style={{ padding: "12px", fontWeight: 700, color: "#f97316", fontSize: 15 }}>
                    {formatCurrency(impact.newProcurementCost)}
                  </td>
                  <td style={{ padding: "12px", fontWeight: 800, color: riskCfg.color, fontSize: 15 }}>
                    = {formatCurrency(impact.totalFinancialImpact)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        {!decision && (
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b",
            borderRadius: 12, padding: 24,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>Executive Decision Required</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                This ECO affects {impact.partDetails.length} BOM lines across Engineering, Warehouse, and Finance.
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {/* Reject flow */}
              <input
                type="text"
                placeholder="Rejection reason..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                style={{
                  padding: "10px 14px", borderRadius: 8, border: "1px solid #334155",
                  background: "#1e293b", color: "#e2e8f0", fontSize: 13, width: 220,
                }}
              />
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                style={{
                  padding: "10px 24px", borderRadius: 8,
                  border: "1px solid rgba(239,68,68,0.4)",
                  background: "rgba(239,68,68,0.1)", color: "#ef4444",
                  fontSize: 14, fontWeight: 700, cursor: rejectReason.trim() ? "pointer" : "not-allowed",
                  opacity: rejectReason.trim() ? 1 : 0.5,
                }}
              >
                Reject ECO
              </button>

              {/* Approve flow */}
              {!showConfirmApprove ? (
                <button
                  onClick={() => setShowConfirmApprove(true)}
                  style={{
                    padding: "10px 24px", borderRadius: 8,
                    border: "1px solid rgba(34,197,94,0.4)",
                    background: "rgba(34,197,94,0.15)", color: "#22c55e",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Approve ECO
                </button>
              ) : (
                <button
                  onClick={handleApprove}
                  style={{
                    padding: "10px 24px", borderRadius: 8,
                    border: "2px solid #22c55e",
                    background: "rgba(34,197,94,0.25)", color: "#22c55e",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    animation: "pulse 1.5s infinite",
                  }}
                >
                  CONFIRM — Accept ¥{impact.totalFinancialImpact.toLocaleString()} Impact
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 24, padding: "12px 20px", borderRadius: 8,
          background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b",
          display: "flex", justifyContent: "space-between",
          fontSize: 12, color: "#64748b",
        }}>
          <div>
            <strong style={{ color: "#94a3b8" }}>Data Sources:</strong>{" "}
            PLM (engineering_change_orders) × WMS (inventory + warehouse_locations) × ERP (bom_items + materials)
          </div>
          <div>Phase 2.1 — Cross-Domain Fusion · GRT System v4.5</div>
        </div>
      </div>
    </div>
  );
}
