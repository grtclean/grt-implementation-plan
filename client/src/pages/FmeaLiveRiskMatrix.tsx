/**
 * FMEA Live Risk Matrix — Dynamic RPN Shop Floor x Engineering Fusion
 * Phase 2.4 — Living Document with real-time defect feed.
 *
 * Data source: trpc.fmeaDynamic.liveMatrix (DB-backed)
 *              trpc.fmeaDynamic.initiateCapa (mutation)
 *
 * Route: /quality/fmea-live
 */

import React, { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

type FmeaDynamicStatus = "NOMINAL" | "ELEVATED" | "CRITICAL" | "CAPA_INITIATED";

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

function CapaModal({ item, onClose }: { item: any; onClose: () => void }) {
  const [reason, setReason] = useState("");

  const capaMut = trpc.fmeaDynamic.initiateCapa.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`CAPA ${data.capaCode} initiated for "${data.failureMode}"`);
        onClose();
      } else {
        toast.error((data as any).error || "Failed to initiate CAPA");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    capaMut.mutate({ fmeaItemId: item.fmeaItemId, reason });
  };

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
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fca5a5", marginBottom: 16 }}>
          Initiate CAPA — {item.failureMode}
        </h3>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>
          Process: {item.processStep}<br/>
          Current RPN: <span style={{ color: "#ef4444", fontWeight: 700 }}>{item.newRpn}</span> (was {item.previousRpn})<br/>
          30-day defects: {item.defectSummary?.totalDefects30d ?? 0}
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
            onClick={handleSubmit}
            disabled={reason.length < 5 || capaMut.isPending}
            style={{
              padding: "8px 20px", backgroundColor: reason.length >= 5 ? "#dc2626" : "#7f1d1d",
              color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
              cursor: reason.length >= 5 ? "pointer" : "not-allowed",
            }}>
            {capaMut.isPending ? "Submitting..." : "Initiate CAPA"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#e2e8f0" }}>
      <div style={{ padding: "20px 32px", borderBottom: "1px solid #1e293b" }}>
        <div style={{ width: 300, height: 24, backgroundColor: "#1e293b", borderRadius: 6, marginBottom: 8 }} />
        <div style={{ width: 500, height: 14, backgroundColor: "#1e293b", borderRadius: 4 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, padding: "20px 32px" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ height: 80, backgroundColor: "#1e293b", borderRadius: 8 }} />
        ))}
      </div>
      <div style={{ padding: "0 32px" }}>
        <div style={{ height: 400, backgroundColor: "#1e293b", borderRadius: 12 }} />
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function FmeaLiveRiskMatrix() {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [capaTarget, setCapaTarget] = useState<any | null>(null);

  const matrixQuery = trpc.fmeaDynamic.liveMatrix.useQuery(undefined, QUERY_OPTS);
  const items = (matrixQuery.data?.items ?? []) as any[];
  const summary = matrixQuery.data?.summary;
  const fmeaDoc = matrixQuery.data?.fmeaDocument;

  if (matrixQuery.isLoading) return <LoadingSkeleton />;

  const critical = summary?.critical ?? 0;
  const elevated = summary?.elevated ?? 0;
  const nominal = summary?.nominal ?? 0;
  const maxRpn = summary?.maxRpn ?? 0;
  const spiked = summary?.spikedCount ?? 0;

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
            FMEA Live Risk Matrix · Phase 2.4 — Shop Floor QC x Engineering FMEA Fusion ·
            {fmeaDoc ? ` ${fmeaDoc.code} Rev.${fmeaDoc.revision}` : ""}
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
              {items.map((item: any) => {
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
                                {item.defectSummary && Object.entries(item.defectSummary.defectsBySource || {}).length > 0 ? (
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    {Object.entries(item.defectSummary.defectsBySource).map(([source, count]) => (
                                      <span key={source} style={{
                                        padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                                        backgroundColor: source === "CUSTOMER_RETURN" ? "#7f1d1d" : "#1e3a5f",
                                        color: source === "CUSTOMER_RETURN" ? "#fca5a5" : "#60a5fa",
                                      }}>
                                        {source}: {count as number}
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
                                {(item.defectSummary?.recentDefects ?? []).length > 0 ? (
                                  (item.defectSummary.recentDefects as any[]).map((d: any) => (
                                    <div key={d.id} style={{
                                      fontSize: 11, color: "#94a3b8", marginBottom: 6,
                                      display: "flex", gap: 8,
                                    }}>
                                      <span style={{ color: "#64748b", minWidth: 80 }}>
                                        {new Date(d.reportedAt).toLocaleDateString()}
                                      </span>
                                      <span style={{ color: "#e2e8f0" }}>
                                        x{d.quantity} — {d.description}
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
                                {item.severity} x {item.previousOccurrence} x {item.detection} = {item.previousRpn}
                                <span style={{ color: "#475569", margin: "0 12px" }}>→</span>
                                <span style={{ color: "#94a3b8" }}>Dynamic: </span>
                                <span style={{ fontWeight: 700, color: item.newRpn > 100 ? "#ef4444" : "#e2e8f0" }}>
                                  {item.severity} x {item.newOccurrence} x {item.detection} = {item.newRpn}
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
          <span>RPN = S x O x D · CRITICAL &gt; 100 · ELEVATED 81-100 · NOMINAL ≤ 80</span>
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
