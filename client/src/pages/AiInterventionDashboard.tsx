/**
 * AI HR Intervention Dashboard — "AI HR Command Center"
 * Phase 3.1 — AI-Driven Performance → Training → Unlock Pipeline
 *
 * Features:
 *   - Active Interventions list with blocking status
 *   - Blocked operator warnings (RED pulse)
 *   - Training progress bars
 *   - "Override (Manager Only)" button with reason modal
 *   - Summary stats: Active Blocking / Completed / Overridden
 *   - Training Module catalog
 *
 * Data source: trpc.aiIntervention.dashboard + trpc.aiIntervention.override
 */

import React, { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

// ─── Types (mirrors server) ──────────────────────────────────────

type InterventionStatus = "PENDING_TRAINING" | "IN_PROGRESS" | "COMPLETED" | "OVERRIDDEN" | "EXPIRED";
type InterventionTrigger = "QUALITY_DEFECT" | "COLLABORATION_LOW" | "SAFETY_INCIDENT" | "CERT_EXPIRING" | "MANUAL";

// ─── Helpers ──────────────────────────────────────────────────────

function statusLabel(s: InterventionStatus): string {
  const map: Record<InterventionStatus, string> = {
    PENDING_TRAINING: "Pending Training",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    OVERRIDDEN: "Manager Override",
    EXPIRED: "Expired",
  };
  return map[s] ?? s;
}

function statusColor(s: InterventionStatus): string {
  const map: Record<InterventionStatus, string> = {
    PENDING_TRAINING: "#ef4444",
    IN_PROGRESS: "#f59e0b",
    COMPLETED: "#22c55e",
    OVERRIDDEN: "#8b5cf6",
    EXPIRED: "#6b7280",
  };
  return map[s] ?? "#6b7280";
}

function triggerIcon(t: InterventionTrigger): string {
  const map: Record<InterventionTrigger, string> = {
    QUALITY_DEFECT: "Q",
    COLLABORATION_LOW: "C",
    SAFETY_INCIDENT: "S",
    CERT_EXPIRING: "E",
    MANUAL: "M",
  };
  return map[t] ?? "?";
}

function triggerLabel(t: InterventionTrigger): string {
  const map: Record<InterventionTrigger, string> = {
    QUALITY_DEFECT: "Quality Defect",
    COLLABORATION_LOW: "Low Collaboration",
    SAFETY_INCIDENT: "Safety Incident",
    CERT_EXPIRING: "Cert Expiring",
    MANUAL: "Manual",
  };
  return map[t] ?? t;
}

function categoryBadgeColor(cat: string): string {
  const map: Record<string, string> = {
    PROCESS_QUALITY: "#3b82f6",
    MACHINE_SAFETY: "#ef4444",
    EFFECTIVE_COMMUNICATION: "#8b5cf6",
    TECHNICAL_SKILLS: "#f59e0b",
    COMPLIANCE: "#06b6d4",
  };
  return map[cat] ?? "#6b7280";
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function isBlocking(s: InterventionStatus): boolean {
  return s === "PENDING_TRAINING" || s === "IN_PROGRESS";
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      <Skeleton className="h-10 w-80 mb-2" />
      <Skeleton className="h-4 w-64 mb-6" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────

export default function AiInterventionDashboard() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<"all" | "blocking" | "resolved">("all");
  const [overrideModal, setOverrideModal] = useState<any | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [tab, setTab] = useState<"interventions" | "modules">("interventions");

  // ─── tRPC query ───
  const dashboardQuery = trpc.aiIntervention.dashboard.useQuery(undefined, QUERY_OPTS);
  const data = dashboardQuery.data as any;
  const interventions = (data?.interventions ?? []) as any[];
  const modules = (data?.modules ?? []) as any[];
  const summary = data?.summary;

  // ─── tRPC mutation ───
  const overrideMut = trpc.aiIntervention.override.useMutation({
    onSuccess: (result: any) => {
      toast.success(`Override applied for intervention #${result.interventionId}`);
      setOverrideModal(null);
      setOverrideReason("");
      dashboardQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Derived stats (from server summary or fallback) ──
  const activeBlocking = useMemo(() => interventions.filter((i: any) => isBlocking(i.status)), [interventions]);
  const completedCount = summary?.completed ?? 0;
  const overriddenCount = summary?.overridden ?? 0;
  const qualityCount = summary?.qualityTriggers ?? 0;
  const collabCount = summary?.collaborationTriggers ?? 0;

  const filtered = useMemo(() => {
    if (filter === "blocking") return activeBlocking;
    if (filter === "resolved") return interventions.filter((i: any) => i.status === "COMPLETED" || i.status === "OVERRIDDEN");
    return interventions;
  }, [filter, interventions, activeBlocking]);

  // ── Override handler ──
  const handleOverride = () => {
    if (!overrideModal || !overrideReason.trim()) return;
    overrideMut.mutate({ interventionId: overrideModal.id, reason: overrideReason.trim() });
  };

  if (dashboardQuery.isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", margin: 0 }}>
            {t("ai.intervention.title")}
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 14 }}>
            {t("ai.intervention.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: activeBlocking.length > 0 ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${activeBlocking.length > 0 ? "#fca5a5" : "#86efac"}`,
            borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 600,
            color: activeBlocking.length > 0 ? "#dc2626" : "#16a34a",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: activeBlocking.length > 0 ? "#ef4444" : "#22c55e",
              animation: activeBlocking.length > 0 ? "pulse 2s infinite" : "none",
            }} />
            {activeBlocking.length > 0
              ? `${activeBlocking.length} OPERATOR${activeBlocking.length > 1 ? "S" : ""} BLOCKED`
              : "ALL CLEAR"}
          </span>
          <span style={{
            background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 20,
            padding: "6px 14px", fontSize: 12, color: "#2563eb",
          }}>
            DB-backed
          </span>
        </div>
      </div>

      {/* ── Critical Alert Banner ── */}
      {activeBlocking.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
          borderRadius: 12, padding: "16px 20px", marginBottom: 20, color: "white",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>!</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              AI INTERLOCK ACTIVE — {activeBlocking.length} Operator{activeBlocking.length > 1 ? "s" : ""} Blocked from Machines
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
              {activeBlocking.map((i: any) => `${i.userName} [${i.blockedMachineCode ?? "ALL"}]`).join(" | ")}
            </div>
          </div>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Active Blocking", value: activeBlocking.length, color: "#ef4444", bg: "#fef2f2", border: "#fca5a5" },
          { label: "Completed", value: completedCount, color: "#22c55e", bg: "#f0fdf4", border: "#86efac" },
          { label: "Overridden", value: overriddenCount, color: "#8b5cf6", bg: "#f5f3ff", border: "#c4b5fd" },
          { label: "Quality Triggers", value: qualityCount, color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d" },
          { label: "Collab Triggers", value: collabCount, color: "#06b6d4", bg: "#ecfeff", border: "#67e8f9" },
        ].map((card, i) => (
          <div key={i} style={{
            background: card.bg, border: `1px solid ${card.border}`, borderRadius: 12,
            padding: "16px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginTop: 2 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tab Switcher ── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
        {(["interventions", "modules"] as const).map(tabKey => (
          <button key={tabKey} onClick={() => setTab(tabKey)} style={{
            padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            background: tab === tabKey ? "#1e40af" : "#f1f5f9",
            color: tab === tabKey ? "white" : "#475569",
            border: "1px solid #cbd5e1",
            borderRadius: tabKey === "interventions" ? "8px 0 0 8px" : "0 8px 8px 0",
          }}>
            {tabKey === "interventions" ? t("ai.intervention.activeInterventions") : t("ai.intervention.trainingModules")}
          </button>
        ))}
      </div>

      {/* ── INTERVENTIONS TAB ── */}
      {tab === "interventions" && (
        <>
          {/* Filter bar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["all", "blocking", "resolved"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "6px 16px", fontSize: 13, cursor: "pointer",
                background: filter === f ? "#1e293b" : "white",
                color: filter === f ? "white" : "#475569",
                border: "1px solid #cbd5e1", borderRadius: 6, fontWeight: 500,
              }}>
                {f === "all" ? `All (${interventions.length})` : f === "blocking" ? `Blocking (${activeBlocking.length})` : `Resolved (${completedCount + overriddenCount})`}
              </button>
            ))}
          </div>

          {/* Intervention Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((intv: any) => {
              const blocking = isBlocking(intv.status);
              const days = daysUntil(intv.dueDate);
              const overdue = days !== null && days < 0;

              return (
                <div key={intv.id} style={{
                  background: blocking ? "#fef2f2" : "white",
                  border: `2px solid ${blocking ? "#fca5a5" : "#e2e8f0"}`,
                  borderRadius: 12, padding: 20, position: "relative",
                  borderLeft: `6px solid ${statusColor(intv.status)}`,
                }}>
                  {blocking && (
                    <div style={{
                      position: "absolute", top: 12, right: 12,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: "#ef4444",
                        animation: "pulse 1.5s infinite",
                      }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>
                        BLOCKED
                      </span>
                    </div>
                  )}

                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: "50%", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      background: intv.triggerType === "QUALITY_DEFECT" ? "#fef3c7" : "#ede9fe",
                      color: intv.triggerType === "QUALITY_DEFECT" ? "#92400e" : "#5b21b6",
                      fontSize: 14, fontWeight: 800,
                    }}>
                      {triggerIcon(intv.triggerType)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
                        {intv.userName}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {triggerLabel(intv.triggerType)} — ID #{intv.id}
                      </div>
                    </div>
                    <span style={{
                      padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: statusColor(intv.status) + "20",
                      color: statusColor(intv.status),
                      border: `1px solid ${statusColor(intv.status)}40`,
                    }}>
                      {statusLabel(intv.status)}
                    </span>
                  </div>

                  {/* Trigger reason */}
                  <div style={{
                    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
                    padding: "10px 14px", fontSize: 13, color: "#334155", marginBottom: 12, lineHeight: 1.5,
                  }}>
                    <strong>AI Analysis:</strong> {intv.triggerReason}
                  </div>

                  {/* Details row */}
                  <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#475569", flexWrap: "wrap", marginBottom: 12 }}>
                    <div>
                      <span style={{ color: "#94a3b8" }}>Training:</span>{" "}
                      <strong>{intv.assignedModuleTitle}</strong>
                    </div>
                    {intv.blockedMachineCode && (
                      <div>
                        <span style={{ color: "#94a3b8" }}>Blocked Machine:</span>{" "}
                        <span style={{ color: "#dc2626", fontWeight: 700 }}>{intv.blockedMachineCode}</span>
                      </div>
                    )}
                    {!intv.blockedMachineCode && blocking && (
                      <div>
                        <span style={{ color: "#94a3b8" }}>Blocked:</span>{" "}
                        <span style={{ color: "#dc2626", fontWeight: 700 }}>ALL MACHINES</span>
                      </div>
                    )}
                    {days !== null && (
                      <div>
                        <span style={{ color: "#94a3b8" }}>Due:</span>{" "}
                        <span style={{ color: overdue ? "#dc2626" : "#475569", fontWeight: overdue ? 700 : 400 }}>
                          {overdue ? `OVERDUE by ${Math.abs(days)}d` : `${days}d remaining`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        width: `${intv.progressPercent}%`, height: "100%",
                        background: intv.status === "COMPLETED"
                          ? "linear-gradient(90deg, #22c55e, #16a34a)"
                          : blocking
                          ? "linear-gradient(90deg, #f59e0b, #d97706)"
                          : "#8b5cf6",
                        borderRadius: 4,
                        transition: "width 0.3s ease",
                      }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", minWidth: 40, textAlign: "right" }}>
                      {intv.progressPercent}%
                    </span>
                    {blocking && (
                      <button
                        onClick={() => { setOverrideModal(intv); setOverrideReason(""); }}
                        style={{
                          padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                          background: "#7c3aed", color: "white", border: "none", borderRadius: 6,
                        }}
                      >
                        Override (Manager)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 14 }}>
                {t("ai.intervention.noInterventions")}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MODULES TAB ── */}
      {tab === "modules" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
          {modules.map((m: any) => (
            <div key={m.id} style={{
              background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20,
              borderTop: `4px solid ${categoryBadgeColor(m.category)}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{
                  padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                  background: categoryBadgeColor(m.category) + "20",
                  color: categoryBadgeColor(m.category),
                }}>
                  {m.category.replace(/_/g, " ")}
                </span>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{m.moduleCode}</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "8px 0 4px" }}>{m.title}</h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px" }}>{m.titleZh}</p>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#475569" }}>
                <span>Duration: <strong>{m.durationMinutes}min</strong></span>
                <span>Pass: <strong>{m.passingScore}%</strong></span>
              </div>
              {(m.relatedMachineTypes ?? []).length > 0 && (
                <div style={{ marginTop: 10, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(m.relatedMachineTypes ?? []).map((mt: string) => (
                    <span key={mt} style={{
                      padding: "2px 8px", background: "#f1f5f9", borderRadius: 4,
                      fontSize: 11, color: "#475569", border: "1px solid #e2e8f0",
                    }}>
                      {mt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Closed-Loop Diagram ── */}
      <div style={{
        marginTop: 32, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12,
        padding: 24, textAlign: "center",
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
          {t("ai.intervention.closedLoopArch")}
        </h3>
        <svg viewBox="0 0 800 140" style={{ maxWidth: 700, width: "100%" }}>
          {[
            { x: 10, label1: "DETECT", label2: "Defects / Scores", color: "#f59e0b" },
            { x: 210, label1: "INTERVENE", label2: "Auto-Assign Module", color: "#ef4444" },
            { x: 410, label1: "BLOCK", label2: "Machine Interlock", color: "#dc2626" },
            { x: 610, label1: "COMPLETE", label2: "Training + Unlock", color: "#22c55e" },
          ].map((box, i) => (
            <g key={i}>
              <rect x={box.x} y={20} width={170} height={80} rx={12} fill={box.color + "15"} stroke={box.color} strokeWidth={2} />
              <text x={box.x + 85} y={52} textAnchor="middle" fontSize={14} fontWeight={700} fill={box.color}>{box.label1}</text>
              <text x={box.x + 85} y={72} textAnchor="middle" fontSize={11} fill="#475569">{box.label2}</text>
              <text x={box.x + 85} y={115} textAnchor="middle" fontSize={20} fill={box.color}>
                {["1", "2", "3", "4"][i]}
              </text>
            </g>
          ))}
          {[190, 390, 590].map((x, i) => (
            <polygon key={i} points={`${x},55 ${x + 15},60 ${x},65`} fill="#94a3b8" />
          ))}
        </svg>
      </div>

      {/* ── Override Modal ── */}
      {overrideModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}
          onClick={() => setOverrideModal(null)}
        >
          <div style={{
            background: "white", borderRadius: 16, padding: 32, maxWidth: 500, width: "90%",
            boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
          }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#0f172a" }}>
              Manager Override
            </h3>
            <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 20px" }}>
              Override intervention for <strong>{overrideModal.userName}</strong>.
              This will UNBLOCK their machine access immediately.
            </p>
            <div style={{
              background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8,
              padding: "10px 14px", fontSize: 13, color: "#92400e", marginBottom: 16,
            }}>
              Warning: Overriding bypasses AI safety training. This action is audited.
            </div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
              Override Reason (required)
            </label>
            <textarea
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              placeholder="Enter justification for override..."
              rows={3}
              style={{
                width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1",
                borderRadius: 8, fontSize: 14, resize: "vertical", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setOverrideModal(null)} style={{
                padding: "8px 20px", fontSize: 14, cursor: "pointer",
                background: "white", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 8,
              }}>
                Cancel
              </button>
              <button onClick={handleOverride} disabled={!overrideReason.trim() || overrideMut.isPending} style={{
                padding: "8px 20px", fontSize: 14, cursor: "pointer", fontWeight: 600,
                background: overrideReason.trim() && !overrideMut.isPending ? "#7c3aed" : "#d4d4d8",
                color: "white", border: "none", borderRadius: 8,
              }}>
                {overrideMut.isPending ? "Overriding..." : "Confirm Override"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pulse animation ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
