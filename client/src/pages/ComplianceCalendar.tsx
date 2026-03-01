/**
 * Compliance Calendar & Risk Radar — Phase 1.4
 * Executive dashboard for certification expiry management.
 *
 * 3 metric cards (top) → chronological timeline (center) → action buttons.
 * Dark industrial theme matching OEE Dashboard (Phase 1.3).
 *
 * Data source: trpc.complianceCalendar.* (DB-backed)
 * Route: /admin/compliance-calendar
 */

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────

type ComplianceTier = "SAFE" | "WARNING" | "CRITICAL" | "DANGER";
type ComplianceCategory = "ISO" | "CE" | "CUSTOMER_AUDIT" | "SAFETY";

interface ComplianceAlert {
  id: number;
  certName: string;
  category: ComplianceCategory;
  expiryDate: string;
  daysRemaining: number;
  tier: ComplianceTier;
  ownerId: number;
  ownerName: string;
  status: string;
  isAcknowledged: boolean;
}

// ─── Tier Configuration ──────────────────────────────────────────────

const TIER_CONFIG: Record<ComplianceTier, { label: string; color: string; bg: string; border: string; icon: string }> = {
  SAFE:     { label: "Safe",     color: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)",  icon: "✓" },
  WARNING:  { label: "Warning",  color: "#eab308", bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.3)",  icon: "⚠" },
  CRITICAL: { label: "Critical", color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)", icon: "⚡" },
  DANGER:   { label: "Danger",   color: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)",  icon: "🔴" },
};

const CATEGORY_LABELS: Record<ComplianceCategory, string> = {
  ISO: "ISO",
  CE: "CE",
  CUSTOMER_AUDIT: "Customer Audit",
  SAFETY: "Safety",
};

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

// ─── Components ──────────────────────────────────────────────────────

function MetricCard({ label, value, color, subtext }: { label: string; value: number; color: string; subtext?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${color}40`,
      borderRadius: 12,
      padding: "20px 24px",
      minWidth: 180,
      flex: 1,
    }}>
      <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: 36, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
      {subtext && <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{subtext}</div>}
    </div>
  );
}

function TierBadge({ tier }: { tier: ComplianceTier }) {
  const cfg = TIER_CONFIG[tier];
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 10px",
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: ComplianceCategory }) {
  const colors: Record<ComplianceCategory, string> = {
    ISO: "#3b82f6",
    CE: "#8b5cf6",
    CUSTOMER_AUDIT: "#f59e0b",
    SAFETY: "#10b981",
  };
  const c = colors[category];
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 500,
      color: c,
      background: `${c}20`,
    }}>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function AlertRow({ alert, onAcknowledge, isPending }: { alert: ComplianceAlert; onAcknowledge: (id: number, action: string) => void; isPending: boolean }) {
  const cfg = TIER_CONFIG[alert.tier];
  const isExpired = alert.status === "expired";
  const daysText = isExpired
    ? `Expired ${Math.abs(alert.daysRemaining)}d ago`
    : alert.daysRemaining === 0
      ? "Expires today"
      : `${alert.daysRemaining} days remaining`;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "14px 20px",
      background: alert.isAcknowledged ? "rgba(255,255,255,0.02)" : cfg.bg,
      borderLeft: `4px solid ${cfg.color}`,
      borderRadius: 8,
      marginBottom: 8,
      opacity: alert.isAcknowledged ? 0.6 : 1,
      transition: "all 0.2s",
    }}>
      {/* Timeline dot */}
      <div style={{
        width: 12, height: 12, borderRadius: "50%",
        background: cfg.color,
        boxShadow: `0 0 8px ${cfg.color}60`,
        flexShrink: 0,
      }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{alert.certName}</span>
          <CategoryBadge category={alert.category} />
          <TierBadge tier={alert.tier} />
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 12, color: "#94a3b8" }}>
          <span>Expiry: {alert.expiryDate}</span>
          <span style={{ color: cfg.color, fontWeight: 600 }}>{daysText}</span>
          <span>Owner: {alert.ownerName}</span>
        </div>
      </div>

      {/* Actions */}
      {!alert.isAcknowledged && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => onAcknowledge(alert.id, "ACKNOWLEDGED")}
            disabled={isPending}
            style={{
              padding: "6px 12px", borderRadius: 6, border: "1px solid #334155",
              background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 12,
              cursor: isPending ? "not-allowed" : "pointer", fontWeight: 500,
              opacity: isPending ? 0.5 : 1,
            }}
          >
            Acknowledge
          </button>
          <button
            onClick={() => onAcknowledge(alert.id, "DELEGATED")}
            disabled={isPending}
            style={{
              padding: "6px 12px", borderRadius: 6, border: `1px solid ${cfg.color}40`,
              background: cfg.bg, color: cfg.color, fontSize: 12,
              cursor: isPending ? "not-allowed" : "pointer", fontWeight: 500,
              opacity: isPending ? 0.5 : 1,
            }}
          >
            Delegate
          </button>
        </div>
      )}

      {alert.isAcknowledged && (
        <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 500 }}>✓ Acknowledged</span>
      )}
    </div>
  );
}

// ─── Progress Ring (mini SVG gauge) ──────────────────────────────────

function ProgressRing({ value, max, color, label, size = 80 }: { value: number; max: number; color: string; label: string; size?: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
        <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
          fill="#f1f5f9" fontSize={size > 60 ? 16 : 12} fontWeight={700}>
          {Math.round(pct)}%
        </text>
      </svg>
      <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function ComplianceCalendar() {
  const [acknowledged, setAcknowledged] = useState<Set<number>>(new Set());
  const [filterTier, setFilterTier] = useState<ComplianceTier | "ALL">("ALL");
  const [filterCategory, setFilterCategory] = useState<ComplianceCategory | "ALL">("ALL");

  // ─── tRPC ───
  const dashboardQuery = trpc.complianceCalendar.dashboard.useQuery(undefined, QUERY_OPTS);
  const data = dashboardQuery.data ?? { total: 0, safe: 0, warning: 0, critical: 0, danger: 0, expired: 0, alerts: [] as ComplianceAlert[], generatedAt: new Date().toISOString(), dataSource: "mock" as string };

  const acknowledgeMut = trpc.complianceCalendar.acknowledge.useMutation({
    onSuccess: (res: any) => {
      setAcknowledged(prev => new Set(prev).add(res.alertId));
      toast.success(res.action === "DELEGATED" ? "Alert delegated" : "Alert acknowledged");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAcknowledge = (id: number, action: string) => {
    acknowledgeMut.mutate({ alertId: id, action: action as any });
  };

  const filteredAlerts = useMemo(() => {
    return (data.alerts as ComplianceAlert[])
      .map(a => ({ ...a, isAcknowledged: acknowledged.has(a.id) }))
      .filter(a => filterTier === "ALL" || a.tier === filterTier)
      .filter(a => filterCategory === "ALL" || a.category === filterCategory);
  }, [data.alerts, acknowledged, filterTier, filterCategory]);

  const actionRequired = data.danger + data.critical;
  const healthPct = data.total > 0 ? Math.round(((data.safe + data.warning) / data.total) * 100) : 100;

  // ─── Loading ───
  if (dashboardQuery.isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "4px solid #3b82f6", borderTop: "4px solid transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
          <p style={{ color: "#64748b", marginTop: 16, fontSize: 14 }}>Loading compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        borderBottom: "1px solid #1e293b",
        padding: "24px 32px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              Compliance Calendar & Risk Radar
            </h1>
            <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 14 }}>
              IATF 16949 / ISO / CE — Certification Expiry Tracking & Auto-Reminder
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              padding: "4px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 500,
              background: data.dataSource === "live" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)",
              color: data.dataSource === "live" ? "#22c55e" : "#eab308",
              border: `1px solid ${data.dataSource === "live" ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`,
            }}>
              {data.dataSource === "live" ? "LIVE" : "DB-backed"} Data
            </span>
            <span style={{ color: "#64748b", fontSize: 12 }}>
              Updated: {new Date(data.generatedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
        {/* Metric Cards Row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <MetricCard
            label="Action Required"
            value={actionRequired}
            color={actionRequired > 0 ? "#ef4444" : "#22c55e"}
            subtext={`${data.danger} danger + ${data.critical} critical`}
          />
          <MetricCard
            label="Upcoming Warnings"
            value={data.warning}
            color="#eab308"
            subtext="60–89 days to expiry"
          />
          <MetricCard
            label="Compliance Health"
            value={healthPct}
            color={healthPct >= 80 ? "#22c55e" : healthPct >= 60 ? "#eab308" : "#ef4444"}
            subtext={`${healthPct}% of certs in safe/warning zone`}
          />
        </div>

        {/* Summary Rings + Stats */}
        <div style={{
          display: "flex", gap: 24, marginBottom: 24,
          background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 20,
          border: "1px solid #1e293b",
        }}>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <ProgressRing value={data.safe} max={data.total} color="#22c55e" label="Safe" size={90} />
            <ProgressRing value={data.warning} max={data.total} color="#eab308" label="Warning" size={90} />
            <ProgressRing value={data.critical} max={data.total} color="#f97316" label="Critical" size={90} />
            <ProgressRing value={data.danger} max={data.total} color="#ef4444" label="Danger" size={90} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 24, borderLeft: "1px solid #1e293b" }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Tier Distribution</div>
            {(["SAFE", "WARNING", "CRITICAL", "DANGER"] as ComplianceTier[]).map(tier => {
              const count = (data as any)[tier.toLowerCase()] as number ?? 0;
              const pct = data.total > 0 ? (count / data.total) * 100 : 0;
              const cfg = TIER_CONFIG[tier];
              return (
                <div key={tier} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 70, fontSize: 12, color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
                  <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: cfg.color, borderRadius: 3, transition: "width 0.5s" }} />
                  </div>
                  <span style={{ width: 30, textAlign: "right", fontSize: 12, color: "#94a3b8" }}>{count}</span>
                </div>
              );
            })}
            {data.expired > 0 && (
              <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4, fontWeight: 500 }}>
                {data.expired} certification{data.expired > 1 ? "s" : ""} already expired
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ color: "#64748b", fontSize: 13, lineHeight: "32px", marginRight: 8 }}>Filter:</span>
          {(["ALL", "DANGER", "CRITICAL", "WARNING", "SAFE"] as const).map(tier => (
            <button
              key={tier}
              onClick={() => setFilterTier(tier)}
              style={{
                padding: "4px 14px", borderRadius: 6, border: "1px solid",
                borderColor: filterTier === tier ? (tier === "ALL" ? "#3b82f6" : TIER_CONFIG[tier as ComplianceTier].color) : "#334155",
                background: filterTier === tier ? (tier === "ALL" ? "rgba(59,130,246,0.15)" : TIER_CONFIG[tier as ComplianceTier].bg) : "transparent",
                color: filterTier === tier ? (tier === "ALL" ? "#3b82f6" : TIER_CONFIG[tier as ComplianceTier].color) : "#94a3b8",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}
            >
              {tier === "ALL" ? "All" : TIER_CONFIG[tier as ComplianceTier].label}
            </button>
          ))}
          <span style={{ color: "#334155", margin: "0 4px" }}>|</span>
          {(["ALL", "ISO", "CE", "CUSTOMER_AUDIT", "SAFETY"] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                padding: "4px 14px", borderRadius: 6, border: "1px solid",
                borderColor: filterCategory === cat ? "#3b82f6" : "#334155",
                background: filterCategory === cat ? "rgba(59,130,246,0.15)" : "transparent",
                color: filterCategory === cat ? "#3b82f6" : "#94a3b8",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}
            >
              {cat === "ALL" ? "All Categories" : CATEGORY_LABELS[cat as ComplianceCategory]}
            </button>
          ))}
        </div>

        {/* Timeline Section Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#e2e8f0" }}>
            Certification Timeline
            <span style={{ color: "#64748b", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
              ({filteredAlerts.length} of {data.total})
            </span>
          </h2>
        </div>

        {/* Alert Timeline */}
        <div style={{ position: "relative" }}>
          {/* Vertical timeline line */}
          <div style={{
            position: "absolute", left: 25, top: 0, bottom: 0, width: 2,
            background: "linear-gradient(to bottom, #334155, transparent)",
          }} />

          {filteredAlerts.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "48px 0", color: "#64748b",
              background: "rgba(255,255,255,0.02)", borderRadius: 12,
            }}>
              No certifications match the current filter.
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <AlertRow key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} isPending={acknowledgeMut.isPending} />
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 32, padding: "16px 20px", borderRadius: 8,
          background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 12, color: "#64748b",
        }}>
          <div>
            <strong style={{ color: "#94a3b8" }}>Tier Thresholds:</strong>{" "}
            SAFE ≥90d · WARNING 60–89d · CRITICAL 30–59d · DANGER &lt;30d
          </div>
          <div>
            IATF 16949 Compliance Calendar · GRT System v4.5
          </div>
        </div>
      </div>
    </div>
  );
}
