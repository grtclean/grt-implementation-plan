/**
 * FMEA Live Risk Matrix — Dynamic RPN Shop Floor ↔ Engineering Fusion
 * Phase 2.4 — Living Document with real-time defect feed.
 *
 * Features:
 *   - "Living Document" table with live RPN recalculation
 *   - RED highlight for RPN-spiked rows
 *   - "Live Pulse" column showing defect-driven Occurrence changes
 *   - "Initiate CAPA" button for CRITICAL items
 *   - Status cards: CRITICAL / ELEVATED / NOMINAL counts
 *
 * Route: /quality/fmea-live
 */

import React, { useState, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────

type FmeaDynamicStatus = "NOMINAL" | "ELEVATED" | "CRITICAL" | "CAPA_INITIATED";

interface DefectLog {
  id: number;
  fmeaItemId: number;
  defectSource: string;
  quantity: number;
  processStep: string;
  failureMode: string;
  partNumber: string;
  reportedAt: string;
  description: string;
  reportedByName: string;
}

interface DefectSummary {
  totalDefects30d: number;
  defectsBySource: Record<string, number>;
  recentDefects: DefectLog[];
}

interface FmeaLiveItem {
  fmeaItemId: number;
  processStep: string;
  failureMode: string;
  severity: number;
  detection: number;
  previousOccurrence: number;
  previousRpn: number;
  previousStatus: FmeaDynamicStatus;
  newOccurrence: number;
  newRpn: number;
  newStatus: FmeaDynamicStatus;
  rpnDelta: number;
  occurrenceDelta: number;
  rpnSpiked: boolean;
  defectSummary: DefectSummary;
  capaRequired: boolean;
  livePulse: string;
}

// ─── Engine (matches server logic) ───────────────────────────────────

function mapDefectsToOccurrence(count: number): number {
  if (count <= 0) return 2;
  if (count <= 5) return 4;
  if (count <= 20) return 6;
  return 10;
}

function classifyRpnStatus(rpn: number): FmeaDynamicStatus {
  if (rpn > 100) return "CRITICAL";
  if (rpn > 80) return "ELEVATED";
  return "NOMINAL";
}

// ─── Mock Data ───────────────────────────────────────────────────────

interface MockFmeaItem {
  id: number; processStep: string; failureMode: string; failureEffect: string;
  severity: number; occurrence: number; detection: number;
  specialChar: string; preventionCtrl: string; detectionCtrl: string;
}

const MOCK_ITEMS: MockFmeaItem[] = [
  { id: 1, processStep: "T3 — Hydraulic Assembly", failureMode: "Oil Leakage at Manifold Joint", failureEffect: "Pressure loss, emergency stop", severity: 8, occurrence: 3, detection: 4, specialChar: "CC", preventionCtrl: "Torque wrench preset", detectionCtrl: "Pressure hold test 15min" },
  { id: 2, processStep: "T5 — Electrical Wiring", failureMode: "PLC Communication Failure", failureEffect: "Machine lockout, no wash cycle", severity: 7, occurrence: 2, detection: 3, specialChar: "SC", preventionCtrl: "Cable routing SOP", detectionCtrl: "EOL comm test" },
  { id: 3, processStep: "T7 — Nozzle Calibration", failureMode: "Spray Pattern Deviation >15%", failureEffect: "Inconsistent cleaning, rework", severity: 6, occurrence: 4, detection: 5, specialChar: "CC", preventionCtrl: "New nozzle per batch", detectionCtrl: "Pattern visual + flow check" },
  { id: 4, processStep: "T9 — Tank Welding", failureMode: "Weld Porosity / Crack", failureEffect: "Chemical leakage, safety hazard", severity: 9, occurrence: 2, detection: 3, specialChar: "CC", preventionCtrl: "WPS per AWS D1.6", detectionCtrl: "Visual + dye penetrant" },
  { id: 5, processStep: "T12 — Final Integration", failureMode: "Safety Interlock Bypass", failureEffect: "Operator injury risk", severity: 10, occurrence: 1, detection: 2, specialChar: "CC", preventionCtrl: "Dual-channel safety relay", detectionCtrl: "Full safety matrix test" },
  { id: 6, processStep: "T4 — Pump Installation", failureMode: "Pump Cavitation Under Load", failureEffect: "Reduced pressure, pump damage", severity: 7, occurrence: 3, detection: 4, specialChar: "SC", preventionCtrl: "NPSH verification", detectionCtrl: "Load test 100% × 2h" },
];

const NOW = new Date();
function daysAgo(d: number): string {
  return new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
}

const MOCK_DEFECTS: DefectLog[] = [
  // Oil Leakage: 10 defects
  { id: 101, fmeaItemId: 1, defectSource: "SHOP_FLOOR", quantity: 2, processStep: "T3", failureMode: "Oil Leakage", partNumber: "HYD-MAN-200", reportedAt: daysAgo(3), description: "O-ring extruded during pressure hold", reportedByName: "Zhang Wei" },
  { id: 102, fmeaItemId: 1, defectSource: "SHOP_FLOOR", quantity: 1, processStep: "T3", failureMode: "Oil Leakage", partNumber: "HYD-MAN-200", reportedAt: daysAgo(7), description: "Seepage at port B", reportedByName: "Li Ming" },
  { id: 103, fmeaItemId: 1, defectSource: "FINAL_QC", quantity: 3, processStep: "T3", failureMode: "Oil Leakage", partNumber: "HYD-MAN-200", reportedAt: daysAgo(12), description: "3 units failed final pressure test", reportedByName: "Wang Fang" },
  { id: 104, fmeaItemId: 1, defectSource: "CUSTOMER_RETURN", quantity: 1, processStep: "T3", failureMode: "Oil Leakage", partNumber: "HYD-MAN-200", reportedAt: daysAgo(18), description: "Customer: oil puddle after 2 weeks", reportedByName: "Chen Jie" },
  { id: 105, fmeaItemId: 1, defectSource: "SHOP_FLOOR", quantity: 3, processStep: "T3", failureMode: "Oil Leakage", partNumber: "HYD-MAN-200", reportedAt: daysAgo(25), description: "Batch O-ring failure pattern", reportedByName: "Zhang Wei" },
  // PLC Comm: 0 defects
  // Spray Pattern: 22 defects
  { id: 301, fmeaItemId: 3, defectSource: "SHOP_FLOOR", quantity: 5, processStep: "T7", failureMode: "Spray Deviation", partNumber: "NZL-FAN-0.8MM", reportedAt: daysAgo(2), description: "5 nozzles blocked", reportedByName: "Wang Fang" },
  { id: 302, fmeaItemId: 3, defectSource: "FINAL_QC", quantity: 8, processStep: "T7", failureMode: "Spray Deviation", partNumber: "NZL-FAN-0.8MM", reportedAt: daysAgo(10), description: "22% deviation on 8 units", reportedByName: "Li Ming" },
  { id: 303, fmeaItemId: 3, defectSource: "SHOP_FLOOR", quantity: 4, processStep: "T7", failureMode: "Spray Deviation", partNumber: "NZL-FAN-0.8MM", reportedAt: daysAgo(15), description: "Worn nozzle tips", reportedByName: "Zhang Wei" },
  { id: 304, fmeaItemId: 3, defectSource: "CUSTOMER_RETURN", quantity: 3, processStep: "T7", failureMode: "Spray Deviation", partNumber: "NZL-FAN-0.8MM", reportedAt: daysAgo(22), description: "FAT failed at customer site", reportedByName: "Chen Jie" },
  { id: 305, fmeaItemId: 3, defectSource: "SHOP_FLOOR", quantity: 2, processStep: "T7", failureMode: "Spray Deviation", partNumber: "NZL-FAN-0.8MM", reportedAt: daysAgo(28), description: "Pump pressure drift", reportedByName: "Wang Fang" },
  // Weld: 3 defects
  { id: 401, fmeaItemId: 4, defectSource: "SHOP_FLOOR", quantity: 1, processStep: "T9", failureMode: "Weld Porosity", partNumber: "TANK-SS316-500L", reportedAt: daysAgo(5), description: "DPT revealed subsurface porosity", reportedByName: "Li Ming" },
  { id: 402, fmeaItemId: 4, defectSource: "SHOP_FLOOR", quantity: 2, processStep: "T9", failureMode: "Weld Porosity", partNumber: "TANK-SS316-500L", reportedAt: daysAgo(20), description: "2 welds cracked in hydrostatic test", reportedByName: "Zhang Wei" },
  // Safety Interlock: 0 defects
  // Pump Cavitation: 4 defects
  { id: 601, fmeaItemId: 6, defectSource: "SHOP_FLOOR", quantity: 2, processStep: "T4", failureMode: "Pump Cavitation", partNumber: "PMP-CENT-5HP", reportedAt: daysAgo(8), description: "Cavitation noise during load test", reportedByName: "Wang Fang" },
  { id: 602, fmeaItemId: 6, defectSource: "FINAL_QC", quantity: 2, processStep: "T4", failureMode: "Pump Cavitation", partNumber: "PMP-CENT-5HP", reportedAt: daysAgo(19), description: "Insufficient suction head", reportedByName: "Li Ming" },
];

function computeLiveItems(): FmeaLiveItem[] {
  return MOCK_ITEMS.map(item => {
    const itemDefects = MOCK_DEFECTS.filter(d => d.fmeaItemId === item.id);
    const cutoff = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
    const windowDefects = itemDefects.filter(d => new Date(d.reportedAt) >= cutoff);
    const totalDefects30d = windowDefects.reduce((s, d) => s + Math.max(0, d.quantity), 0);
    const defectsBySource: Record<string, number> = {};
    for (const d of windowDefects) {
      defectsBySource[d.defectSource] = (defectsBySource[d.defectSource] ?? 0) + d.quantity;
    }
    const recentDefects = [...windowDefects].sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()).slice(0, 5);

    const newOccurrence = mapDefectsToOccurrence(totalDefects30d);
    const previousRpn = item.severity * item.occurrence * item.detection;
    const newRpn = item.severity * newOccurrence * item.detection;
    const rpnDelta = newRpn - previousRpn;
    const occurrenceDelta = newOccurrence - item.occurrence;
    const newStatus = classifyRpnStatus(newRpn);
    const previousStatus = classifyRpnStatus(previousRpn);

    let livePulse: string;
    if (totalDefects30d === 0) {
      livePulse = "No defects in 30 days — Occurrence stable at 2";
    } else if (occurrenceDelta > 0) {
      livePulse = `Detected ${totalDefects30d} defects → Occurrence jumped from ${item.occurrence} to ${newOccurrence}!`;
    } else if (occurrenceDelta < 0) {
      livePulse = `Defects decreased to ${totalDefects30d} → Occurrence improved from ${item.occurrence} to ${newOccurrence}`;
    } else {
      livePulse = `${totalDefects30d} defects in 30 days — Occurrence unchanged at ${newOccurrence}`;
    }
    if (newStatus === "CRITICAL") livePulse += " ⚠ CAPA REQUIRED";

    return {
      fmeaItemId: item.id, processStep: item.processStep, failureMode: item.failureMode,
      severity: item.severity, detection: item.detection,
      previousOccurrence: item.occurrence, previousRpn, previousStatus,
      newOccurrence, newRpn, newStatus, rpnDelta, occurrenceDelta,
      rpnSpiked: rpnDelta > 0, defectSummary: { totalDefects30d, defectsBySource, recentDefects },
      capaRequired: newStatus === "CRITICAL", livePulse,
    };
  });
}

// ─── Status Badge ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: FmeaDynamicStatus }) {
  const config: Record<FmeaDynamicStatus, { bg: string; text: string }> = {
    CRITICAL: { bg: "#7f1d1d", text: "#fca5a5" },
    CAPA_INITIATED: { bg: "#78350f", text: "#fbbf24" },
    ELEVATED: { bg: "#78350f", text: "#fbbf24" },
    NOMINAL: { bg: "#14532d", text: "#4ade80" },
  };
  const c = config[status];
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 12,
      backgroundColor: c.bg, color: c.text, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
    }}>
      {status}
    </span>
  );
}

// ─── RPN Delta Badge ────────────────────────────────────────────────

function RpnDelta({ delta }: { delta: number }) {
  if (delta === 0) return <span style={{ color: "#64748b", fontSize: 12 }}>—</span>;
  const color = delta > 0 ? "#ef4444" : "#22c55e";
  const arrow = delta > 0 ? "▲" : "▼";
  return (
    <span style={{ color, fontSize: 12, fontWeight: 700 }}>
      {arrow} {delta > 0 ? "+" : ""}{delta}
    </span>
  );
}

// ─── CAPA Modal ─────────────────────────────────────────────────────

function CapaModal({ item, onClose }: { item: FmeaLiveItem; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: "#1e293b", borderRadius: 12, padding: 28, width: 500,
        border: "1px solid #ef444480",
      }}>
        {!submitted ? (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fca5a5", marginBottom: 16 }}>
              Initiate CAPA — {item.failureMode}
            </h3>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>
              Process: {item.processStep}<br/>
              Current RPN: <span style={{ color: "#ef4444", fontWeight: 700 }}>{item.newRpn}</span> (was {item.previousRpn})<br/>
              30-day defects: {item.defectSummary.totalDefects30d}
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the root cause investigation scope..."
              style={{
                width: "100%", height: 80, padding: 12, backgroundColor: "#0f172a",
                color: "#e2e8f0", border: "1px solid #334155", borderRadius: 6,
                fontSize: 13, resize: "none",
              }}
            />
            <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{
                padding: "8px 20px", backgroundColor: "#334155", color: "#94a3b8",
                border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer",
              }}>Cancel</button>
              <button
                onClick={() => setSubmitted(true)}
                disabled={reason.length < 5}
                style={{
                  padding: "8px 20px", backgroundColor: reason.length >= 5 ? "#dc2626" : "#7f1d1d",
                  color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
                  cursor: reason.length >= 5 ? "pointer" : "not-allowed",
                }}>
                Initiate CAPA
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#4ade80", marginBottom: 8 }}>
              CAPA Initiated Successfully
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              CAPA-2026-{String(item.fmeaItemId).padStart(3, "0")} created for "{item.failureMode}"
            </div>
            <button onClick={onClose} style={{
              marginTop: 16, padding: "8px 24px", backgroundColor: "#1e3a5f",
              color: "#60a5fa", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer",
            }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function FmeaLiveRiskMatrix() {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [capaTarget, setCapaTarget] = useState<FmeaLiveItem | null>(null);

  const items = useMemo(() => {
    const computed = computeLiveItems();
    const statusOrder: Record<FmeaDynamicStatus, number> = { CRITICAL: 0, CAPA_INITIATED: 1, ELEVATED: 2, NOMINAL: 3 };
    return computed.sort((a, b) => statusOrder[a.newStatus] - statusOrder[b.newStatus] || b.newRpn - a.newRpn);
  }, []);

  const critical = items.filter(i => i.newStatus === "CRITICAL").length;
  const elevated = items.filter(i => i.newStatus === "ELEVATED").length;
  const nominal = items.filter(i => i.newStatus === "NOMINAL").length;
  const maxRpn = Math.max(...items.map(i => i.newRpn), 0);
  const spiked = items.filter(i => i.rpnSpiked).length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{
        padding: "20px 32px", borderBottom: "1px solid #1e293b",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
            FMEA 动态风险矩阵
          </h1>
          <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>
            FMEA Live Risk Matrix · Phase 2.4 — Shop Floor QC × Engineering FMEA Fusion ·
            PFMEA-GRT-WASH-001 Rev.3
          </p>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 14px", borderRadius: 20, backgroundColor: "#14532d",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#22c55e", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 600 }}>LIVE — Defect Feed Active</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
        gap: 16, padding: "20px 32px",
      }}>
        {[
          { label: "CRITICAL", value: critical, color: "#ef4444", bg: "#7f1d1d" },
          { label: "ELEVATED", value: elevated, color: "#f59e0b", bg: "#78350f" },
          { label: "NOMINAL", value: nominal, color: "#22c55e", bg: "#14532d" },
          { label: "Max RPN", value: maxRpn, color: maxRpn > 100 ? "#ef4444" : "#3b82f6", bg: "#1e293b" },
          { label: "RPN Spiked", value: `${spiked}/${items.length}`, color: spiked > 0 ? "#ef4444" : "#22c55e", bg: "#1e293b" },
        ].map(card => (
          <div key={card.label} style={{
            padding: 16, backgroundColor: card.bg, borderRadius: 8,
            border: `1px solid ${card.color}30`,
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Critical Alert Banner */}
      {critical > 0 && (
        <div style={{
          margin: "0 32px 20px", padding: "14px 20px", borderRadius: 8,
          backgroundColor: "#7f1d1d", border: "2px solid #ef4444",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>🚨</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fca5a5" }}>
              {critical} FMEA Item{critical > 1 ? "s" : ""} CRITICAL — CAPA Required
            </div>
            <div style={{ fontSize: 12, color: "#fca5a5cc", marginTop: 2 }}>
              Dynamic RPN exceeded 100 based on live shop floor defect data. Immediate corrective action required per IATF 16949 §10.2.
            </div>
          </div>
        </div>
      )}

      {/* Living Document Table */}
      <div style={{ padding: "0 32px 32px" }}>
        <div style={{
          backgroundColor: "#1e293b", borderRadius: 12, overflow: "hidden",
          border: "1px solid #334155",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #334155" }}>
                {["#", "Process Step", "Failure Mode", "S", "O (Old→New)", "D", "RPN", "Δ", "Status", "Live Pulse", "Action"].map(h => (
                  <th key={h} style={{
                    padding: "12px 10px", textAlign: "left", color: "#94a3b8",
                    fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isExpanded = expandedRow === item.fmeaItemId;
                const rowBg = item.newStatus === "CRITICAL" ? "#7f1d1d20" :
                              item.rpnSpiked ? "#7f1d1d10" : "transparent";
                const rpnColor = item.newRpn > 100 ? "#ef4444" : item.newRpn > 80 ? "#f59e0b" : "#22c55e";

                return (
                  <React.Fragment key={item.fmeaItemId}>
                    <tr
                      onClick={() => setExpandedRow(isExpanded ? null : item.fmeaItemId)}
                      style={{
                        borderBottom: "1px solid #1e293b", backgroundColor: rowBg,
                        cursor: "pointer", transition: "background-color 0.2s",
                      }}
                    >
                      <td style={{ padding: "12px 10px", fontSize: 13, color: "#64748b" }}>
                        {item.fmeaItemId}
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: 13 }}>
                        {item.processStep}
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: 13, maxWidth: 200 }}>
                        {item.failureMode}
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: 13, textAlign: "center", fontWeight: 700, color: item.severity >= 8 ? "#ef4444" : "#e2e8f0" }}>
                        {item.severity}
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: 12, textAlign: "center" }}>
                        <span style={{ color: "#64748b" }}>{item.previousOccurrence}</span>
                        <span style={{ color: "#475569", margin: "0 4px" }}>→</span>
                        <span style={{
                          fontWeight: 700,
                          color: item.occurrenceDelta > 0 ? "#ef4444" : item.occurrenceDelta < 0 ? "#22c55e" : "#e2e8f0",
                        }}>{item.newOccurrence}</span>
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: 13, textAlign: "center" }}>
                        {item.detection}
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "center" }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: rpnColor }}>
                          {item.newRpn}
                        </span>
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "center" }}>
                        <RpnDelta delta={item.rpnDelta} />
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <StatusBadge status={item.newStatus} />
                      </td>
                      <td style={{
                        padding: "12px 10px", fontSize: 11, maxWidth: 250,
                        color: item.rpnSpiked ? "#fca5a5" : item.occurrenceDelta < 0 ? "#4ade80" : "#94a3b8",
                        fontWeight: item.rpnSpiked ? 600 : 400,
                      }}>
                        {item.livePulse}
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        {item.capaRequired && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setCapaTarget(item); }}
                            style={{
                              padding: "5px 12px", backgroundColor: "#dc2626",
                              color: "#fff", border: "none", borderRadius: 6,
                              fontSize: 11, fontWeight: 700, cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Initiate CAPA
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded row — defect details */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={11} style={{ padding: 0 }}>
                          <div style={{
                            padding: "16px 20px", backgroundColor: "#0f172a",
                            borderBottom: "1px solid #334155",
                          }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                              {/* Defect breakdown */}
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 10 }}>
                                  DEFECT BREAKDOWN (30 DAYS)
                                </div>
                                {Object.entries(item.defectSummary.defectsBySource).length > 0 ? (
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    {Object.entries(item.defectSummary.defectsBySource).map(([source, count]) => (
                                      <span key={source} style={{
                                        padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                                        backgroundColor: source === "CUSTOMER_RETURN" ? "#7f1d1d" : "#1e3a5f",
                                        color: source === "CUSTOMER_RETURN" ? "#fca5a5" : "#60a5fa",
                                      }}>
                                        {source}: {count}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ color: "#4ade80", fontSize: 12 }}>No defects — clean record</div>
                                )}
                              </div>
                              {/* Recent defects */}
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 10 }}>
                                  RECENT DEFECT LOG
                                </div>
                                {item.defectSummary.recentDefects.length > 0 ? (
                                  item.defectSummary.recentDefects.map(d => (
                                    <div key={d.id} style={{
                                      fontSize: 11, color: "#94a3b8", marginBottom: 6,
                                      display: "flex", gap: 8,
                                    }}>
                                      <span style={{ color: "#64748b", minWidth: 80 }}>
                                        {new Date(d.reportedAt).toLocaleDateString()}
                                      </span>
                                      <span style={{ color: "#e2e8f0" }}>
                                        ×{d.quantity} — {d.description}
                                      </span>
                                      <span style={{ color: "#475569", marginLeft: "auto" }}>
                                        {d.reportedByName}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <div style={{ color: "#4ade80", fontSize: 12 }}>No recent defects</div>
                                )}
                              </div>
                            </div>
                            {/* RPN calculation breakdown */}
                            <div style={{
                              marginTop: 16, padding: 12, backgroundColor: "#1e293b",
                              borderRadius: 8, border: "1px solid #334155",
                            }}>
                              <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, marginBottom: 6 }}>
                                RPN CALCULATION
                              </div>
                              <div style={{ fontSize: 13, color: "#e2e8f0" }}>
                                <span style={{ color: "#94a3b8" }}>Original: </span>
                                {item.severity} × {item.previousOccurrence} × {item.detection} = {item.previousRpn}
                                <span style={{ color: "#475569", margin: "0 12px" }}>→</span>
                                <span style={{ color: "#94a3b8" }}>Dynamic: </span>
                                <span style={{ fontWeight: 700, color: item.newRpn > 100 ? "#ef4444" : "#e2e8f0" }}>
                                  {item.severity} × {item.newOccurrence} × {item.detection} = {item.newRpn}
                                </span>
                                {item.rpnDelta !== 0 && (
                                  <span style={{ marginLeft: 12 }}>
                                    (<RpnDelta delta={item.rpnDelta} />)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer legend */}
        <div style={{
          marginTop: 16, display: "flex", gap: 24, fontSize: 11, color: "#475569",
        }}>
          <span>S = Severity (1-10) · O = Occurrence (dynamic, defect-fed) · D = Detection (1-10)</span>
          <span>RPN = S × O × D · CRITICAL &gt; 100 · ELEVATED 81-100 · NOMINAL ≤ 80</span>
        </div>
      </div>

      {/* CAPA Modal */}
      {capaTarget && <CapaModal item={capaTarget} onClose={() => setCapaTarget(null)} />}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
