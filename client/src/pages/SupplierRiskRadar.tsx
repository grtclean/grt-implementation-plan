/**
 * Supplier Risk Radar — Real-time IQC x Procurement Fusion Dashboard
 * Phase 2.2 — SCM Director high-alert dashboard.
 *
 * Data source: trpc.supplierRisk.dashboard (DB-backed)
 *              trpc.supplierRisk.override (mutation)
 *
 * Route: /supply-chain/risk-radar
 */

import React, { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

type SupplierRiskStatus = "ACTIVE" | "WARNING" | "RESTRICTED";

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

// ─── Loading Skeleton ────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9" }}>
      <div style={{ padding: "20px 32px", borderBottom: "1px solid #1e293b" }}>
        <div style={{ width: 400, height: 24, backgroundColor: "#1e293b", borderRadius: 6, marginBottom: 8 }} />
        <div style={{ width: 500, height: 14, backgroundColor: "#1e293b", borderRadius: 4 }} />
      </div>
      <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 90, backgroundColor: "#1e293b", borderRadius: 12 }} />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ height: 72, backgroundColor: "#1e293b", borderRadius: 10, marginBottom: 10 }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function SupplierRiskRadar() {
  const dashboardQuery = trpc.supplierRisk.dashboard.useQuery(undefined, QUERY_OPTS);
  const suppliers = (dashboardQuery.data?.suppliers ?? []) as any[];
  const summary = dashboardQuery.data?.summary;

  const [expanded, setExpanded] = useState<number | null>(null);
  const [overrideModal, setOverrideModal] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overridden, setOverridden] = useState<Set<number>>(new Set());

  const overrideMut = trpc.supplierRisk.override.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setOverridden(prev => new Set(prev).add(data.supplierId!));
        setOverrideModal(null);
        setPin("");
        setOverrideReason("");
        toast.success(`Supplier ${data.supplierId} override applied`);
      } else {
        toast.error((data as any).error || "Override failed");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  if (dashboardQuery.isLoading) return <LoadingSkeleton />;

  const restricted = suppliers.filter((s: any) => s.status === "RESTRICTED" && !overridden.has(s.supplierId));
  const warningCount = summary?.warning ?? 0;
  const activeCount = summary?.active ?? 0;
  const avgScore = summary?.avgScore ?? 0;

  const handleOverride = (supplierId: number) => {
    overrideMut.mutate({ supplierId, ceoPin: pin, reason: overrideReason || "CEO override" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", borderBottom: "1px solid #1e293b", padding: "20px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>PHASE 2.2 — CROSS-DOMAIN FUSION</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              Supplier Risk Radar — Live Health Index
            </h1>
            <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>
              IQC (Quality) x SCM (Procurement) — Real-time defect-to-procurement interlock
            </p>
          </div>
          <span style={{ padding: "4px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 500, background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
            DB-backed
          </span>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
        {/* Metric Cards */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <MetricCard label="Average Health Score" value={avgScore} color={avgScore >= 85 ? "#22c55e" : avgScore >= 60 ? "#eab308" : "#ef4444"} sub={`Across ${suppliers.length} active suppliers`} />
          <MetricCard label="RESTRICTED" value={restricted.length} color="#ef4444" sub="PO creation blocked" />
          <MetricCard label="WARNING" value={warningCount} color="#eab308" sub="Increased monitoring" />
          <MetricCard label="ACTIVE" value={activeCount + overridden.size} color="#22c55e" sub="Normal operations" />
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
            {restricted.map((s: any) => {
              const latestFail = (s.inspectionWindow ?? []).find((i: any) => i.result === "FAIL");
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
                      Defect rate: <strong style={{ color: "#ef4444" }}>{s.movingDefectRatePct?.toFixed(1) ?? 0}%</strong> over last {(s.inspectionWindow ?? []).length} inspections
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
                  fontSize: 14, marginBottom: 12, boxSizing: "border-box",
                }}
              />
              <input
                type="text"
                placeholder="Override reason..."
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8,
                  border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0",
                  fontSize: 14, marginBottom: 16, boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setOverrideModal(null); setPin(""); setOverrideReason(""); }}
                  style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleOverride(overrideModal)}
                  disabled={overrideMut.isPending}
                  style={{
                    padding: "8px 20px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.4)",
                    background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 13,
                    fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {overrideMut.isPending ? "Confirming..." : "Confirm Override"}
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

        {suppliers.map((s: any) => {
          const isOverridden = overridden.has(s.supplierId);
          const effectiveStatus: SupplierRiskStatus = isOverridden ? "WARNING" : s.status;
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
                    <span>Defect Rate: <strong style={{ color: (s.movingDefectRatePct ?? 0) > 5 ? "#ef4444" : "#22c55e" }}>{(s.movingDefectRatePct ?? 0).toFixed(1)}%</strong></span>
                    <span>Inspections: {(s.inspectionWindow ?? []).length}</span>
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
                  {(s.triggeredPenalties ?? []).length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fca5a5", marginBottom: 8 }}>Triggered Penalties</div>
                      {(s.triggeredPenalties as string[]).map((p: string, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: "#94a3b8", padding: "4px 0", display: "flex", gap: 6 }}>
                          <span style={{ color: "#ef4444" }}>•</span> {p}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inspection window table */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>IQC Inspection Window (Last {(s.inspectionWindow ?? []).length})</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1e293b" }}>
                        {["Code", "Part", "Date", "Qty", "Defects", "Rate", "Result", "Penalty"].map(h => (
                          <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "#64748b", fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(s.inspectionWindow ?? []).map((insp: any, i: number) => (
                        <tr key={insp.inspectionId} style={{ borderBottom: "1px solid #1e293b10", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                          <td style={{ padding: "6px 10px", fontFamily: "monospace", color: "#94a3b8" }}>{insp.inspectionCode}</td>
                          <td style={{ padding: "6px 10px" }}>
                            <div style={{ color: "#e2e8f0" }}>{insp.partNumber}</div>
                            <div style={{ color: "#64748b", fontSize: 11 }}>{insp.partName}</div>
                          </td>
                          <td style={{ padding: "6px 10px", color: "#94a3b8" }}>{insp.date}</td>
                          <td style={{ padding: "6px 10px", color: "#94a3b8", textAlign: "center" }}>{insp.totalQty}</td>
                          <td style={{ padding: "6px 10px", textAlign: "center", color: insp.defectQty > 0 ? "#ef4444" : "#22c55e", fontWeight: 600 }}>{insp.defectQty}</td>
                          <td style={{ padding: "6px 10px", textAlign: "center", color: (insp.defectRate ?? 0) > 0.05 ? "#ef4444" : "#94a3b8" }}>{((insp.defectRate ?? 0) * 100).toFixed(1)}%</td>
                          <td style={{ padding: "6px 10px" }}>
                            <span style={{
                              padding: "1px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                              color: insp.result === "PASS" ? "#22c55e" : insp.result === "FAIL" ? "#ef4444" : "#eab308",
                              background: insp.result === "PASS" ? "rgba(34,197,94,0.15)" : insp.result === "FAIL" ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.15)",
                            }}>
                              {insp.result}
                            </span>
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "center", color: (insp.scorePenalty ?? 0) > 0 ? "#ef4444" : "#334155", fontWeight: 600 }}>
                            {(insp.scorePenalty ?? 0) > 0 ? `-${insp.scorePenalty}` : "—"}
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

        {suppliers.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
            No supplier data available
          </div>
        )}

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
          <div>Phase 2.2 — IQC x SCM Fusion · GRT System</div>
        </div>
      </div>
    </div>
  );
}
