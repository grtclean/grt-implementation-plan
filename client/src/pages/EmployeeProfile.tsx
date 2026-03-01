/**
 * Employee 360° Digital Profile — "Me" Dashboard
 * Phase 2.3 — HR × AI × Meeting × Certification Fusion
 *
 * Layout:
 *   Left: Player Card (avatar, role, Overall Combat Power score)
 *   Center: Interactive SVG Radar Chart (4 dimensions)
 *   Right: AI Career Advice panel
 *   Bottom: Dimension detail tabs
 *
 * Data source: trpc.employeeProfile.* (DB-backed)
 * Route: /my-workspace/profile/:userId
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

// ─── Types ───────────────────────────────────────────────────────────

type ProfileTier = "S" | "A" | "B" | "C";
type DimensionName = "Execution" | "Learning" | "Collaboration" | "Innovation";

interface DimensionResult {
  name: DimensionName;
  score: number;
  breakdown: string;
  dataPoints: number;
}

interface CareerAdvice {
  type: "STRENGTH" | "DEVELOPMENT" | "OPPORTUNITY";
  dimension: DimensionName;
  message: string;
}

interface Profile360 {
  userId: number;
  employeeCode: string;
  name: string;
  department: string;
  position: string;
  level: string;
  hireDate: string;
  dimensions: DimensionResult[];
  overallScore: number;
  tier: ProfileTier;
  careerAdvice: CareerAdvice[];
  generatedAt: string;
}

const CERT_WEIGHTS: Record<string, number> = { basic: 15, intermediate: 25, advanced: 35, expert: 50 };

// ─── SVG Radar Chart ────────────────────────────────────────────────

const RADAR_SIZE = 280;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_LEVELS = 4;

function polarToCartesian(angle: number, radius: number): [number, number] {
  const rad = (angle - 90) * (Math.PI / 180);
  return [RADAR_CENTER + radius * Math.cos(rad), RADAR_CENTER + radius * Math.sin(rad)];
}

function RadarChart({ dimensions }: { dimensions: DimensionResult[] }) {
  const maxRadius = RADAR_CENTER - 30;
  const angles = dimensions.map((_, i) => (360 / dimensions.length) * i);

  // Grid lines
  const gridLevels = Array.from({ length: RADAR_LEVELS }, (_, i) => ((i + 1) / RADAR_LEVELS) * maxRadius);

  // Data polygon
  const dataPoints = dimensions.map((d, i) => {
    const r = (d.score / 100) * maxRadius;
    return polarToCartesian(angles[i], r);
  });
  const dataPath = dataPoints.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";

  return (
    <svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
      {/* Grid circles */}
      {gridLevels.map((r, i) => (
        <circle key={i} cx={RADAR_CENTER} cy={RADAR_CENTER} r={r}
          fill="none" stroke="#334155" strokeWidth="1" strokeDasharray={i < RADAR_LEVELS - 1 ? "4,4" : "none"} />
      ))}
      {/* Axis lines */}
      {angles.map((a, i) => {
        const [x, y] = polarToCartesian(a, maxRadius);
        return <line key={i} x1={RADAR_CENTER} y1={RADAR_CENTER} x2={x} y2={y} stroke="#475569" strokeWidth="1" />;
      })}
      {/* Data polygon */}
      <path d={dataPath} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" />
      {/* Data points */}
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="#3b82f6" stroke="#1e293b" strokeWidth="2" />
      ))}
      {/* Labels */}
      {dimensions.map((d, i) => {
        const [x, y] = polarToCartesian(angles[i], maxRadius + 22);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fill="#94a3b8" fontSize="11" fontWeight="600">
            {d.name}
          </text>
        );
      })}
      {/* Score labels */}
      {dimensions.map((d, i) => {
        const [x, y] = polarToCartesian(angles[i], (d.score / 100) * maxRadius + 14);
        return (
          <text key={`s-${i}`} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fill="#60a5fa" fontSize="10" fontWeight="bold">
            {d.score}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Combat Power Gauge ─────────────────────────────────────────────

function CombatPowerGauge({ score, tier }: { score: number; tier: ProfileTier }) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const tierColors: Record<ProfileTier, string> = {
    S: "#f59e0b", A: "#22c55e", B: "#3b82f6", C: "#6b7280",
  };
  const tierGlow: Record<ProfileTier, string> = {
    S: "0 0 20px rgba(245, 158, 11, 0.5)", A: "0 0 15px rgba(34, 197, 94, 0.3)",
    B: "0 0 10px rgba(59, 130, 246, 0.3)", C: "none",
  };
  const color = tierColors[tier];

  return (
    <div style={{ position: "relative", width: 150, height: 150 }}>
      <svg width="150" height="150" viewBox="0 0 150 150" style={{ filter: `drop-shadow(${tierGlow[tier]})` }}>
        <circle cx="75" cy="75" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle cx="75" cy="75" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          strokeLinecap="round" transform="rotate(-90 75 75)" />
      </svg>
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>COMBAT POWER</div>
      </div>
    </div>
  );
}

// ─── Tier Badge ─────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: ProfileTier }) {
  const config: Record<ProfileTier, { bg: string; text: string; label: string }> = {
    S: { bg: "#78350f", text: "#fbbf24", label: "S · Star Performer" },
    A: { bg: "#14532d", text: "#4ade80", label: "A · High Performer" },
    B: { bg: "#1e3a5f", text: "#60a5fa", label: "B · Solid Contributor" },
    C: { bg: "#374151", text: "#9ca3af", label: "C · Needs Development" },
  };
  const c = config[tier];
  return (
    <span style={{
      display: "inline-block", padding: "4px 12px", borderRadius: 20,
      backgroundColor: c.bg, color: c.text, fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
    }}>
      {c.label}
    </span>
  );
}

// ─── Dimension Bar ──────────────────────────────────────────────────

function DimensionBar({ dim }: { dim: DimensionResult }) {
  const getColor = (score: number) => {
    if (score >= 85) return "#22c55e";
    if (score >= 60) return "#3b82f6";
    if (score >= 40) return "#f59e0b";
    return "#ef4444";
  };
  const color = getColor(dim.score);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>{dim.name}</span>
        <span style={{ color, fontSize: 14, fontWeight: 700 }}>{dim.score}</span>
      </div>
      <div style={{ height: 8, backgroundColor: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${dim.score}%`, backgroundColor: color,
          borderRadius: 4, transition: "width 0.6s ease",
        }} />
      </div>
      <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
        {dim.breakdown} · {dim.dataPoints} data point{dim.dataPoints !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

// ─── Career Advice Card ─────────────────────────────────────────────

function AdviceCard({ advice }: { advice: CareerAdvice }) {
  const config: Record<string, { icon: string; bg: string; border: string }> = {
    STRENGTH: { icon: "💪", bg: "#14532d20", border: "#22c55e40" },
    DEVELOPMENT: { icon: "📈", bg: "#7f1d1d20", border: "#ef444440" },
    OPPORTUNITY: { icon: "🌟", bg: "#78350f20", border: "#f59e0b40" },
  };
  const c = config[advice.type];
  return (
    <div style={{
      padding: "12px 16px", backgroundColor: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 8, marginBottom: 10,
    }}>
      <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>
        {c.icon} {advice.type} — {advice.dimension}
      </div>
      <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>{advice.message}</div>
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────

export default function EmployeeProfile() {
  const [selectedUserId, setSelectedUserId] = useState(1001);
  const [activeTab, setActiveTab] = useState<"dimensions" | "kpi" | "certs" | "meetings" | "ai">("dimensions");

  // ─── tRPC queries ───
  const profileQuery = trpc.employeeProfile.getProfile.useQuery(
    { userId: selectedUserId },
    QUERY_OPTS,
  );
  const listQuery = trpc.employeeProfile.listProfiles.useQuery(undefined, QUERY_OPTS);

  const profileData = profileQuery.data;
  const profile = (profileData as any)?.found ? (profileData as any).profile as Profile360 : null;
  const employees = (listQuery.data?.profiles ?? []) as Profile360[];

  if (profileQuery.isLoading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 14 }}>Loading 360° profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: 40, color: "#ef4444", textAlign: "center", backgroundColor: "#0f172a", minHeight: "100vh" }}>
        Employee not found (userId: {selectedUserId})
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#e2e8f0" }}>
      {/* ─── Page Header ─── */}
      <div style={{
        padding: "20px 32px", borderBottom: "1px solid #1e293b",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
            全息员工数字画像
          </h1>
          <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>
            Employee 360° Digital Profile · Phase 2.3 — HR × AI × Meeting × Cert Fusion
          </p>
        </div>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(Number(e.target.value))}
          style={{
            padding: "8px 16px", backgroundColor: "#1e293b", color: "#e2e8f0",
            border: "1px solid #334155", borderRadius: 6, fontSize: 14,
          }}
        >
          {employees.map(e => (
            <option key={e.userId} value={e.userId}>
              {e.employeeCode} — {e.name}
            </option>
          ))}
        </select>
      </div>

      {/* ─── Main Grid: Player Card | Radar | AI Advice ─── */}
      <div style={{
        display: "grid", gridTemplateColumns: "280px 1fr 300px",
        gap: 24, padding: "24px 32px",
      }}>
        {/* ─── LEFT: Player Card ─── */}
        <div style={{
          backgroundColor: "#1e293b", borderRadius: 12, padding: 24,
          border: "1px solid #334155", textAlign: "center",
        }}>
          {/* Avatar placeholder */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%", margin: "0 auto 16px",
            background: `linear-gradient(135deg, ${profile.tier === "S" ? "#f59e0b" : profile.tier === "A" ? "#22c55e" : "#3b82f6"}, #1e293b)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 800, color: "#fff",
            border: `3px solid ${profile.tier === "S" ? "#f59e0b" : profile.tier === "A" ? "#22c55e" : "#3b82f6"}`,
          }}>
            {profile.name.charAt(0)}
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: "#f1f5f9" }}>
            {profile.name}
          </h2>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
            {profile.employeeCode} · {profile.level}
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
            {profile.position}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 16 }}>
            {profile.department} · Since {profile.hireDate}
          </div>

          <TierBadge tier={profile.tier} />

          <div style={{ marginTop: 20 }}>
            <CombatPowerGauge score={profile.overallScore} tier={profile.tier} />
          </div>

          {/* Dimension weights legend */}
          <div style={{ marginTop: 16, textAlign: "left" }}>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, marginBottom: 6 }}>WEIGHT FORMULA</div>
            {(["Execution 30%", "Learning 20%", "Collaboration 25%", "Innovation 25%"]).map(w => (
              <div key={w} style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>• {w}</div>
            ))}
          </div>
        </div>

        {/* ─── CENTER: Radar Chart + Dimension Bars ─── */}
        <div style={{
          backgroundColor: "#1e293b", borderRadius: 12, padding: 24,
          border: "1px solid #334155",
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <RadarChart dimensions={profile.dimensions} />
          </div>

          <div style={{ borderTop: "1px solid #334155", paddingTop: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", marginBottom: 16 }}>
              DIMENSION BREAKDOWN
            </h3>
            {profile.dimensions.map(d => (
              <DimensionBar key={d.name} dim={d} />
            ))}
          </div>
        </div>

        {/* ─── RIGHT: AI Career Advice ─── */}
        <div style={{
          backgroundColor: "#1e293b", borderRadius: 12, padding: 24,
          border: "1px solid #334155",
        }}>
          <h3 style={{
            fontSize: 14, fontWeight: 600, color: "#94a3b8", marginBottom: 16,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>🤖</span> AI Career Advice
          </h3>

          {profile.careerAdvice.map((advice, i) => (
            <AdviceCard key={i} advice={advice} />
          ))}

          {/* Quick stats */}
          <div style={{
            marginTop: 20, padding: 16, backgroundColor: "#0f172a",
            borderRadius: 8, border: "1px solid #1e293b",
          }}>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, marginBottom: 10 }}>
              DATA SOURCES ANALYZED
            </div>
            {profile.dimensions.map(d => (
              <div key={d.name} style={{
                display: "flex", justifyContent: "space-between", marginBottom: 4,
                fontSize: 12,
              }}>
                <span style={{ color: "#64748b" }}>{d.name}</span>
                <span style={{ color: "#94a3b8", fontWeight: 600 }}>
                  {d.dataPoints} record{d.dataPoints !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, fontSize: 10, color: "#475569", textAlign: "center" }}>
            Generated: {new Date(profile.generatedAt).toLocaleString()}
          </div>
        </div>
      </div>

      {/* ─── Bottom: Detail Tabs ─── */}
      <div style={{ padding: "0 32px 32px" }}>
        <div style={{
          backgroundColor: "#1e293b", borderRadius: 12,
          border: "1px solid #334155", overflow: "hidden",
        }}>
          {/* Tab bar */}
          <div style={{
            display: "flex", borderBottom: "1px solid #334155", padding: "0 16px",
          }}>
            {(["dimensions", "kpi", "certs", "meetings", "ai"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "12px 20px", fontSize: 13, fontWeight: 600,
                  color: activeTab === tab ? "#3b82f6" : "#64748b",
                  backgroundColor: "transparent", border: "none", cursor: "pointer",
                  borderBottom: activeTab === tab ? "2px solid #3b82f6" : "2px solid transparent",
                }}
              >
                {tab === "dimensions" ? "Overview" : tab === "kpi" ? "KPI History" :
                 tab === "certs" ? "Certificates" : tab === "meetings" ? "Meetings" : "AI Tasks"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: 24 }}>
            {activeTab === "dimensions" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {profile.dimensions.map(d => {
                  const color = d.score >= 85 ? "#22c55e" : d.score >= 60 ? "#3b82f6" : d.score >= 40 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={d.name} style={{
                      padding: 20, backgroundColor: "#0f172a", borderRadius: 8,
                      border: `1px solid ${color}30`, textAlign: "center",
                    }}>
                      <div style={{ fontSize: 36, fontWeight: 800, color }}>{d.score}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginTop: 4 }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>{d.breakdown}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {(activeTab === "kpi" || activeTab === "certs" || activeTab === "meetings" || activeTab === "ai") && (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 14, color: "#64748b", marginBottom: 8 }}>
                  {activeTab === "kpi" && "KPI History"}
                  {activeTab === "certs" && "Certificates"}
                  {activeTab === "meetings" && "Meeting Records"}
                  {activeTab === "ai" && "AI Task History"}
                </div>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  Detailed {activeTab} records are aggregated into the dimension scores above.
                </div>
                <div style={{ marginTop: 16 }}>
                  {profile.dimensions.map(d => (
                    <div key={d.name} style={{ display: "inline-block", margin: "0 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: d.score >= 85 ? "#22c55e" : d.score >= 60 ? "#3b82f6" : "#f59e0b" }}>{d.score}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{d.name}</div>
                      <div style={{ fontSize: 10, color: "#475569" }}>{d.dataPoints} records</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
