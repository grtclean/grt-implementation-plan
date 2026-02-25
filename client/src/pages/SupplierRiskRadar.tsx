/**
 * Supplier Risk Radar — Real-time IQC→Procurement Fusion Dashboard
 * Phase 2.2 — SCM Director high-alert dashboard.
 *
 * Top: Live Supplier Health Index
 * Middle: Color-coded supplier list (Green >85, Yellow 60-85, Red <60)
 * Red banner for RESTRICTED suppliers with IQC failure details
 * Override & Unblock button (requires CEO PIN)
 *
 * Route: /supply-chain/risk-radar
 */

import React, { useState, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────

type SupplierRiskStatus = "ACTIVE" | "WARNING" | "RESTRICTED";

interface InspectionImpact {
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

interface SupplierRiskData {
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  category: string;
  qualityRating: string;
  previousScore: number;
  currentScore: number;
  movingDefectRate: number;
  movingDefectRatePct: number;
  status: SupplierRiskStatus;
  totalInspected: number;
  totalDefects: number;
  inspectionWindow: InspectionImpact[];
  triggeredPenalties: string[];
  interlockTriggered: boolean;
}

// ─── Risk Engine (matches server logic) ──────────────────────────────

function classifyStatus(score: number): SupplierRiskStatus {
  if (score >= 85) return "ACTIVE";
  if (score >= 60) return "WARNING";
  return "RESTRICTED";
}

function evaluateRisk(supplier: any, inspections: any[]): SupplierRiskData {
  const window = inspections.slice(0, 5);
  let totalInspected = 0, totalDefects = 0;
  const details: InspectionImpact[] = [];
  const penalties: string[] = [];

  for (const insp of window) {
    const qty = Math.max(0, insp.totalQty);
    const defects = Math.max(0, Math.min(insp.defectQty, qty));
    totalInspected += qty;
    totalDefects += defects;
    details.push({
      inspectionId: insp.id, inspectionCode: insp.inspectionCode,
      partNumber: insp.partNumber, partName: insp.partName,
      totalQty: qty, defectQty: defects, defectRate: qty > 0 ? defects / qty : 0,
      result: insp.result, date: insp.inspectionDate, scorePenalty: 0,
    });
  }

  const movingDefectRate = totalInspected > 0 ? totalDefects / totalInspected : 0;
  let score = supplier.baseScore;

  if (movingDefectRate > 0.05) {
    const p = Math.round((movingDefectRate - 0.05) * 500 * 100) / 100;
    score -= p;
    penalties.push(`Defect rate ${(movingDefectRate * 100).toFixed(1)}% exceeds 5% → -${p} pts`);
  }
  for (let i = 0; i < details.length; i++) {
    if (window[i]?.result === "FAIL") {
      score -= 5;
      details[i].scorePenalty = 5;
      penalties.push(`FAIL on ${window[i].inspectionCode} (${window[i].partNumber}) → -5 pts`);
    }
  }
  if (movingDefectRate > 0.10) {
    score -= 10;
    penalties.push(`Severe: rate ${(movingDefectRate * 100).toFixed(1)}% > 10% → -10 emergency`);
  }
  score = Math.max(0, Math.min(100, Math.round(score * 100) / 100));

  const prevStatus = classifyStatus(supplier.baseScore);
  const newStatus = classifyStatus(score);
  const interlockTriggered = newStatus === "RESTRICTED" && prevStatus !== "RESTRICTED";
  if (interlockTriggered) penalties.push("⚠ INTERLOCK: Supplier RESTRICTED. New POs BLOCKED.");

  return {
    supplierId: supplier.id, supplierCode: supplier.supplierCode,
    supplierName: supplier.supplierName, category: supplier.category,
    qualityRating: supplier.qualityRating,
    previousScore: supplier.baseScore, currentScore: score,
    movingDefectRate: Math.round(movingDefectRate * 10000) / 10000,
    movingDefectRatePct: Math.round(movingDefectRate * 10000) / 100,
    status: newStatus, totalInspected, totalDefects,
    inspectionWindow: details, triggeredPenalties: penalties, interlockTriggered,
  };
}

// ─── Mock Data ───────────────────────────────────────────────────────

const MOCK_RAW = [
  { supplier: { id: 1, supplierCode: "SUP-001", supplierName: "Bosch Rexroth (博世力士乐)", category: "Hydraulic Components", baseScore: 100, currentScore: 100, qualityRating: "A" },
    inspections: [
      { id: 101, inspectionCode: "IQC-2026-0201", partNumber: "HYD-PUMP-A10V", partName: "Axial Piston Pump A10VSO", totalQty: 50, defectQty: 0, inspectionDate: "2026-02-20", result: "PASS" },
      { id: 102, inspectionCode: "IQC-2026-0187", partNumber: "HYD-VALVE-4WE", partName: "Directional Control Valve 4WE6", totalQty: 100, defectQty: 1, inspectionDate: "2026-02-15", result: "PASS" },
      { id: 103, inspectionCode: "IQC-2026-0165", partNumber: "HYD-PUMP-A10V", partName: "Axial Piston Pump A10VSO", totalQty: 50, defectQty: 0, inspectionDate: "2026-02-08", result: "PASS" },
      { id: 104, inspectionCode: "IQC-2026-0140", partNumber: "HYD-FILTER-RE", partName: "Return Line Filter Element", totalQty: 200, defectQty: 2, inspectionDate: "2026-02-01", result: "PASS" },
      { id: 105, inspectionCode: "IQC-2026-0120", partNumber: "HYD-VALVE-4WE", partName: "Directional Control Valve 4WE6", totalQty: 100, defectQty: 1, inspectionDate: "2026-01-25", result: "PASS" },
    ] },
  { supplier: { id: 2, supplierCode: "SUP-008", supplierName: "Wuxi Precision Bearings (无锡精密轴承)", category: "Bearings & Seals", baseScore: 100, currentScore: 100, qualityRating: "B" },
    inspections: [
      { id: 201, inspectionCode: "IQC-2026-0205", partNumber: "BRG-SKF-6205-2Z", partName: "SKF 6205-2Z Standard Bearing", totalQty: 200, defectQty: 14, inspectionDate: "2026-02-22", result: "CONDITIONAL" },
      { id: 202, inspectionCode: "IQC-2026-0190", partNumber: "BRG-NTN-6308", partName: "NTN 6308 Deep Groove Bearing", totalQty: 150, defectQty: 9, inspectionDate: "2026-02-16", result: "CONDITIONAL" },
      { id: 203, inspectionCode: "IQC-2026-0170", partNumber: "SEAL-VITON-50", partName: "Viton O-Ring Kit (50mm)", totalQty: 500, defectQty: 28, inspectionDate: "2026-02-10", result: "PASS" },
      { id: 204, inspectionCode: "IQC-2026-0148", partNumber: "BRG-SKF-6205-2Z", partName: "SKF 6205-2Z Standard Bearing", totalQty: 200, defectQty: 8, inspectionDate: "2026-02-03", result: "PASS" },
      { id: 205, inspectionCode: "IQC-2026-0128", partNumber: "BRG-NTN-6308", partName: "NTN 6308 Deep Groove Bearing", totalQty: 150, defectQty: 6, inspectionDate: "2026-01-27", result: "PASS" },
    ] },
  { supplier: { id: 3, supplierCode: "SUP-015", supplierName: "Dongguan HuaTai Gaskets (东莞华泰密封)", category: "Gaskets & Seals", baseScore: 100, currentScore: 100, qualityRating: "C" },
    inspections: [
      { id: 301, inspectionCode: "IQC-2026-0208", partNumber: "GSK-NBR-003", partName: "NBR Standard Gasket Kit", totalQty: 100, defectQty: 18, inspectionDate: "2026-02-24", result: "FAIL" },
      { id: 302, inspectionCode: "IQC-2026-0195", partNumber: "SEAL-EPDM-80", partName: "EPDM Seal Ring (80mm ID)", totalQty: 300, defectQty: 45, inspectionDate: "2026-02-18", result: "FAIL" },
      { id: 303, inspectionCode: "IQC-2026-0175", partNumber: "GSK-PTFE-010", partName: "PTFE Gasket Sheet (1.0mm)", totalQty: 200, defectQty: 25, inspectionDate: "2026-02-12", result: "FAIL" },
      { id: 304, inspectionCode: "IQC-2026-0155", partNumber: "GSK-NBR-003", partName: "NBR Standard Gasket Kit", totalQty: 100, defectQty: 12, inspectionDate: "2026-02-05", result: "CONDITIONAL" },
      { id: 305, inspectionCode: "IQC-2026-0135", partNumber: "SEAL-EPDM-80", partName: "EPDM Seal Ring (80mm ID)", totalQty: 300, defectQty: 20, inspectionDate: "2026-01-28", result: "CONDITIONAL" },
    ] },
  { supplier: { id: 4, supplierCode: "SUP-022", supplierName: "Siemens AG (西门子)", category: "PLC & Automation", baseScore: 100, currentScore: 100, qualityRating: "A" },
    inspections: [
      { id: 401, inspectionCode: "IQC-2026-0210", partNumber: "PLC-S7-1500-CPU", partName: "Siemens S7-1500 CPU 1515-2PN", totalQty: 5, defectQty: 0, inspectionDate: "2026-02-23", result: "PASS" },
      { id: 402, inspectionCode: "IQC-2026-0180", partNumber: "IO-S7-1500-DI32", partName: "S7-1500 Digital Input Module (32ch)", totalQty: 10, defectQty: 0, inspectionDate: "2026-02-11", result: "PASS" },
    ] },
  { supplier: { id: 5, supplierCode: "SUP-031", supplierName: "Shanghai Fluid Tech (上海流体科技)", category: "Pumps & Nozzles", baseScore: 100, currentScore: 100, qualityRating: "B" },
    inspections: [
      { id: 501, inspectionCode: "IQC-2026-0212", partNumber: "NZL-FAN-0.8MM", partName: "Fan-pattern Spray Nozzle (0.8mm)", totalQty: 100, defectQty: 6, inspectionDate: "2026-02-24", result: "CONDITIONAL" },
      { id: 502, inspectionCode: "IQC-2026-0192", partNumber: "PMP-CENT-5HP", partName: "Centrifugal Pump (5HP, SS316)", totalQty: 10, defectQty: 1, inspectionDate: "2026-02-17", result: "FAIL" },
      { id: 503, inspectionCode: "IQC-2026-0172", partNumber: "NZL-FAN-0.8MM", partName: "Fan-pattern Spray Nozzle (0.8mm)", totalQty: 100, defectQty: 5, inspectionDate: "2026-02-10", result: "PASS" },
      { id: 504, inspectionCode: "IQC-2026-0150", partNumber: "PMP-CENT-5HP", partName: "Centrifugal Pump (5HP, SS316)", totalQty: 10, defectQty: 0, inspectionDate: "2026-02-03", result: "PASS" },
      { id: 505, inspectionCode: "IQC-2026-0130", partNumber: "NZL-FAN-0.8MM", partName: "Fan-pattern Spray Nozzle (0.8mm)", totalQty: 100, defectQty: 4, inspectionDate: "2026-01-26", result: "PASS" },
    ] },
];

// ─── Styling ─────────────────────────────────────────────────────────

const STATUS_CFG: Record<SupplierRiskStatus, { color: string; bg: string; border: string; label: string }> = {
  ACTIVE:     { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)",  label: "ACTIVE" },
  WARNING:    { color: "#eab308", bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.3)",  label: "WARNING" },
  RESTRICTED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)",  label: "RESTRICTED" },
};

function ScoreGauge({ score, size = 64 }: { score: number; size?: number }) {
  const cfg = score >= 85 ? STATUS_CFG.ACTIVE : score >= 60 ? STATUS_CFG.WARNING : STATUS_CFG.RESTRICTED;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={cfg.color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 0.6s" }} />
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fill={cfg.color} fontSize={size > 60 ? 16 : 13} fontWeight={700}>
        {Math.round(score)}
      </text>
    </svg>
  );
}

function MetricCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}30`, borderRadius: 12, padding: "18px 22px", flex: 1, minWidth: 160 }}>
      <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function SupplierRiskRadar() {
  const suppliers = useMemo(() => {
    const results = MOCK_RAW.map(({ supplier, inspections }) => evaluateRisk(supplier, inspections));
    const order: Record<SupplierRiskStatus, number> = { RESTRICTED: 0, WARNING: 1, ACTIVE: 2 };
    results.sort((a, b) => order[a.status] - order[b.status] || a.currentScore - b.currentScore);
    return results;
  }, []);

  const [expanded, setExpanded] = useState<number | null>(null);
  const [overrideModal, setOverrideModal] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [overridden, setOverridden] = useState<Set<number>>(new Set());

  const restricted = suppliers.filter(s => s.status === "RESTRICTED" && !overridden.has(s.supplierId));
  const warning = suppliers.filter(s => s.status === "WARNING");
  const active = suppliers.filter(s => s.status === "ACTIVE" || overridden.has(s.supplierId));
  const avgScore = suppliers.length > 0 ? Math.round(suppliers.reduce((s, r) => s + r.currentScore, 0) / suppliers.length) : 0;

  const handleOverride = (supplierId: number) => {
    if (pin === "888888") {
      setOverridden(prev => new Set(prev).add(supplierId));
      setOverrideModal(null);
      setPin("");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", borderBottom: "1px solid #1e293b", padding: "20px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>PHASE 2.2 — CROSS-DOMAIN FUSION</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 26 }}>📡</span>
              Supplier Risk Radar — Live Health Index
            </h1>
            <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>
              IQC (Quality) × SCM (Procurement) — Real-time defect-to-procurement interlock
            </p>
          </div>
          <span style={{ padding: "4px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 500, background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}>
            DEMO Data
          </span>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
        {/* Metric Cards */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <MetricCard label="Average Health Score" value={avgScore} color={avgScore >= 85 ? "#22c55e" : avgScore >= 60 ? "#eab308" : "#ef4444"} sub={`Across ${suppliers.length} active suppliers`} />
          <MetricCard label="RESTRICTED" value={restricted.length} color="#ef4444" sub="PO creation blocked" />
          <MetricCard label="WARNING" value={warning.length} color="#eab308" sub="Increased monitoring" />
          <MetricCard label="ACTIVE" value={active.length} color="#22c55e" sub="Normal operations" />
        </div>

        {/* RESTRICTED Banner */}
        {restricted.length > 0 && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "2px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>🚨</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#ef4444" }}>
                SUPPLIER INTERLOCK ACTIVE — {restricted.length} Supplier{restricted.length > 1 ? "s" : ""} RESTRICTED
              </span>
            </div>
            {restricted.map(s => {
              const latestFail = s.inspectionWindow.find(i => i.result === "FAIL");
              return (
                <div key={s.supplierId} style={{
                  background: "rgba(239,68,68,0.06)", borderRadius: 8, padding: "12px 16px", marginBottom: 8,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  border: "1px solid rgba(239,68,68,0.15)",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#fca5a5", fontSize: 14 }}>
                      {s.supplierName} — Score: {s.currentScore}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                      Defect rate: <strong style={{ color: "#ef4444" }}>{s.movingDefectRatePct.toFixed(1)}%</strong> over last {s.inspectionWindow.length} inspections
                      {latestFail && (
                        <> | Latest FAIL: <strong style={{ color: "#fca5a5" }}>{latestFail.partNumber}</strong> ({latestFail.defectQty}/{latestFail.totalQty} defects on {latestFail.date})</>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setOverrideModal(s.supplierId)}
                    style={{
                      padding: "8px 16px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.4)",
                      background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    Override & Unblock (CEO PIN)
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Override Modal */}
        {overrideModal !== null && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}>
            <div style={{
              background: "#1e293b", borderRadius: 16, padding: 32, width: 400,
              border: "1px solid #334155",
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#ef4444" }}>
                CEO Override Required
              </h3>
              <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16, lineHeight: 1.5 }}>
                Unblocking a RESTRICTED supplier bypasses quality controls.
                This action is logged for IATF 16949 audit compliance.
              </p>
              <input
                type="password"
                placeholder="Enter CEO PIN (demo: 888888)"
                value={pin}
                onChange={e => setPin(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8,
                  border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0",
                  fontSize: 14, marginBottom: 16, boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setOverrideModal(null); setPin(""); }}
                  style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleOverride(overrideModal)}
                  style={{
                    padding: "8px 20px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.4)",
                    background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 13,
                    fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Confirm Override
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Supplier List */}
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: "#e2e8f0" }}>
          Supplier Risk Register
          <span style={{ color: "#64748b", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
            ({suppliers.length} suppliers evaluated)
          </span>
        </h2>

        {suppliers.map(s => {
          const isOverridden = overridden.has(s.supplierId);
          const effectiveStatus = isOverridden ? "WARNING" : s.status;
          const cfg = STATUS_CFG[effectiveStatus];
          const isExpanded = expanded === s.supplierId;

          return (
            <div key={s.supplierId} style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${cfg.border}`,
              borderLeft: `4px solid ${cfg.color}`,
              borderRadius: 10, marginBottom: 10,
              transition: "all 0.2s",
            }}>
              {/* Summary row */}
              <div
                onClick={() => setExpanded(isExpanded ? null : s.supplierId)}
                style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
                  cursor: "pointer",
                }}
              >
                <ScoreGauge score={s.currentScore} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>{s.supplierName}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>{s.supplierCode}</span>
                    <span style={{
                      padding: "2px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600,
                      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
                    }}>
                      {isOverridden ? "OVERRIDE → WARNING" : effectiveStatus}
                    </span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{s.category}</span>
                  </div>
                  <div style={{ display: "flex", gap: 20, marginTop: 4, fontSize: 12, color: "#94a3b8" }}>
                    <span>Defect Rate: <strong style={{ color: s.movingDefectRatePct > 5 ? "#ef4444" : "#22c55e" }}>{s.movingDefectRatePct.toFixed(1)}%</strong></span>
                    <span>Inspections: {s.inspectionWindow.length}</span>
                    <span>Defects: {s.totalDefects}/{s.totalInspected}</span>
                    <span>Rating: {s.qualityRating}</span>
                  </div>
                </div>
                <span style={{ color: "#475569", fontSize: 18, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "" }}>▼</span>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #1e293b", padding: "16px 20px" }}>
                  {/* Penalties */}
                  {s.triggeredPenalties.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fca5a5", marginBottom: 8 }}>Triggered Penalties</div>
                      {s.triggeredPenalties.map((p, i) => (
                        <div key={i} style={{ fontSize: 12, color: "#94a3b8", padding: "4px 0", display: "flex", gap: 6 }}>
                          <span style={{ color: "#ef4444" }}>•</span> {p}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inspection window table */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>IQC Inspection Window (Last {s.inspectionWindow.length})</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1e293b" }}>
                        {["Code", "Part", "Date", "Qty", "Defects", "Rate", "Result", "Penalty"].map(h => (
                          <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "#64748b", fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.inspectionWindow.map((insp, i) => (
                        <tr key={insp.inspectionId} style={{ borderBottom: "1px solid #1e293b10", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                          <td style={{ padding: "6px 10px", fontFamily: "monospace", color: "#94a3b8" }}>{insp.inspectionCode}</td>
                          <td style={{ padding: "6px 10px" }}>
                            <div style={{ color: "#e2e8f0" }}>{insp.partNumber}</div>
                            <div style={{ color: "#64748b", fontSize: 11 }}>{insp.partName}</div>
                          </td>
                          <td style={{ padding: "6px 10px", color: "#94a3b8" }}>{insp.date}</td>
                          <td style={{ padding: "6px 10px", color: "#94a3b8", textAlign: "center" }}>{insp.totalQty}</td>
                          <td style={{ padding: "6px 10px", textAlign: "center", color: insp.defectQty > 0 ? "#ef4444" : "#22c55e", fontWeight: 600 }}>{insp.defectQty}</td>
                          <td style={{ padding: "6px 10px", textAlign: "center", color: insp.defectRate > 0.05 ? "#ef4444" : "#94a3b8" }}>{(insp.defectRate * 100).toFixed(1)}%</td>
                          <td style={{ padding: "6px 10px" }}>
                            <span style={{
                              padding: "1px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                              color: insp.result === "PASS" ? "#22c55e" : insp.result === "FAIL" ? "#ef4444" : "#eab308",
                              background: insp.result === "PASS" ? "rgba(34,197,94,0.15)" : insp.result === "FAIL" ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.15)",
                            }}>
                              {insp.result}
                            </span>
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "center", color: insp.scorePenalty > 0 ? "#ef4444" : "#334155", fontWeight: 600 }}>
                            {insp.scorePenalty > 0 ? `-${insp.scorePenalty}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* Footer */}
        <div style={{
          marginTop: 24, padding: "12px 20px", borderRadius: 8,
          background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b",
          display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b",
        }}>
          <div>
            <strong style={{ color: "#94a3b8" }}>Scoring:</strong>{" "}
            Base 100 | Rate &gt;5% penalized | Each FAIL -5 | Rate &gt;10% emergency -10 |{" "}
            <strong style={{ color: "#22c55e" }}>ACTIVE ≥85</strong> ·{" "}
            <strong style={{ color: "#eab308" }}>WARNING 60-84</strong> ·{" "}
            <strong style={{ color: "#ef4444" }}>RESTRICTED &lt;60</strong>
          </div>
          <div>Phase 2.2 — IQC↔SCM Fusion · GRT System v4.5</div>
        </div>
      </div>
    </div>
  );
}
