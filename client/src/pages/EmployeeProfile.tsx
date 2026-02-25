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
 * Route: /my-workspace/profile/:userId
 */

import React, { useState, useMemo } from "react";

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

// ─── Fusion Engine (matches server logic) ────────────────────────────

const CERT_WEIGHTS: Record<string, number> = { basic: 15, intermediate: 25, advanced: 35, expert: 50 };

function classifyTier(score: number): ProfileTier {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  return "C";
}

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function round2(n: number): number { return Math.round(n * 100) / 100; }

function generateMockProfile(userId: number): Profile360 | null {
  const employee = MOCK_EMPLOYEES.find(e => e.userId === userId);
  if (!employee) return null;

  // Execution
  const execAvg = employee.kpiScores.length > 0
    ? employee.kpiScores.reduce((s, k) => s + k.score, 0) / employee.kpiScores.length
    : 50;
  const execution: DimensionResult = {
    name: "Execution", score: clamp(round2(execAvg), 0, 100),
    breakdown: employee.kpiScores.length > 0
      ? `Average of ${employee.kpiScores.length} monthly KPI scores: ${round2(execAvg)}`
      : "No KPI records — baseline 50",
    dataPoints: employee.kpiScores.length,
  };

  // Learning
  const validCerts = employee.certificates.filter(c => c.isValid);
  const certScore = validCerts.length > 0
    ? validCerts.reduce((s, c) => s + (CERT_WEIGHTS[c.level] ?? 15), 0)
    : 20;
  const learning: DimensionResult = {
    name: "Learning", score: clamp(certScore, 0, 100),
    breakdown: validCerts.length > 0
      ? `${validCerts.length} valid certificates → ${clamp(certScore, 0, 100)}`
      : "No valid certificates — baseline 20",
    dataPoints: validCerts.length,
  };

  // Collaboration
  const meetingAvg = employee.meetingScores.length > 0
    ? employee.meetingScores.reduce((s, m) => s + m.meetingScore, 0) / employee.meetingScores.length
    : 50;
  const totalAtt = employee.meetingScores.reduce((s, m) => s + m.attended, 0);
  const totalMeet = employee.meetingScores.reduce((s, m) => s + m.total, 0);
  const attRate = totalMeet > 0 ? totalAtt / totalMeet : 0;
  const attBonus = round2(attRate * 10);
  const collaboration: DimensionResult = {
    name: "Collaboration", score: clamp(round2(meetingAvg + attBonus), 0, 100),
    breakdown: `Meeting avg ${round2(meetingAvg)} + attendance bonus ${attBonus} (${round2(attRate * 100)}%)`,
    dataPoints: employee.meetingScores.length,
  };

  // Innovation
  const completedTasks = employee.aiTasks.filter(t => t.status === "completed");
  let innovScore = 30;
  let innovBreakdown = "No completed AI tasks — baseline 30";
  if (completedTasks.length > 0) {
    const avgQ = completedTasks.reduce((s, t) => s + t.quality, 0) / completedTasks.length;
    const volBonus = Math.min(completedTasks.length * 2, 20);
    let synergy = 0;
    if (meetingAvg >= 80) synergy = 5;
    innovScore = clamp(round2(avgQ + volBonus + synergy), 0, 100);
    innovBreakdown = `Avg quality ${round2(avgQ)} + volume ${volBonus}${synergy > 0 ? ` + synergy ${synergy}` : ""} = ${innovScore}`;
  }
  const innovation: DimensionResult = {
    name: "Innovation", score: innovScore, breakdown: innovBreakdown, dataPoints: completedTasks.length,
  };

  const dimensions = [execution, learning, collaboration, innovation];
  const overall = clamp(round2(
    execution.score * 0.30 + learning.score * 0.20 + collaboration.score * 0.25 + innovation.score * 0.25
  ), 0, 100);

  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const careerAdvice: CareerAdvice[] = [
    { type: "STRENGTH", dimension: strongest.name, message: `Your ${strongest.name} (${strongest.score}) is your strongest area. Leverage this for team leadership.` },
    { type: "DEVELOPMENT", dimension: weakest.name, message: `${weakest.name} (${weakest.score}) is your growth opportunity. Focus on improving this dimension.` },
  ];
  if (dimensions.some(d => d.score >= 80 && d.name !== strongest.name)) {
    const opp = dimensions.find(d => d.score >= 80 && d.name !== strongest.name)!;
    careerAdvice.push({ type: "OPPORTUNITY", dimension: opp.name, message: `${opp.name} (${opp.score}) shows emerging excellence!` });
  }

  return {
    userId: employee.userId, employeeCode: employee.code, name: employee.name,
    department: employee.department, position: employee.position, level: employee.level,
    hireDate: employee.hireDate, dimensions, overallScore: overall, tier: classifyTier(overall),
    careerAdvice, generatedAt: new Date().toISOString(),
  };
}

// ─── Mock Employees ──────────────────────────────────────────────────

interface MockEmployeeData {
  userId: number; code: string; name: string; department: string; position: string; level: string; hireDate: string;
  kpiScores: { month: string; score: number }[];
  certificates: { name: string; level: string; isValid: boolean }[];
  meetingScores: { month: string; meetingScore: number; attended: number; total: number }[];
  aiTasks: { type: string; quality: number; status: string }[];
}

const MOCK_EMPLOYEES: MockEmployeeData[] = [
  {
    userId: 1001, code: "GRT-E001", name: "张伟 (Zhang Wei)", department: "Engineering",
    position: "Senior Mechanical Engineer", level: "P6", hireDate: "2020-03-15",
    kpiScores: [{ month: "2025-12", score: 92 }, { month: "2026-01", score: 88 }, { month: "2026-02", score: 95 }],
    certificates: [
      { name: "ISO 9001 Internal Auditor", level: "advanced", isValid: true },
      { name: "PLC Programming (Siemens S7)", level: "expert", isValid: true },
      { name: "Lean Six Sigma Green Belt", level: "intermediate", isValid: true },
    ],
    meetingScores: [
      { month: "2025-12", meetingScore: 88, attended: 12, total: 14 },
      { month: "2026-01", meetingScore: 92, attended: 10, total: 11 },
      { month: "2026-02", meetingScore: 90, attended: 8, total: 9 },
    ],
    aiTasks: [
      { type: "document_draft", quality: 88, status: "completed" },
      { type: "data_analysis", quality: 92, status: "completed" },
      { type: "report_generation", quality: 85, status: "completed" },
      { type: "code_review", quality: 90, status: "completed" },
      { type: "risk_assessment", quality: 87, status: "completed" },
      { type: "meeting_summary", quality: 91, status: "completed" },
      { type: "email_draft", quality: 86, status: "completed" },
      { type: "data_analysis", quality: 93, status: "completed" },
      { type: "document_draft", quality: 89, status: "completed" },
      { type: "quality_inspection", quality: 94, status: "completed" },
    ],
  },
  {
    userId: 1002, code: "GRT-E042", name: "李明 (Li Ming)", department: "Quality",
    position: "Junior QC Inspector", level: "P2", hireDate: "2025-11-01",
    kpiScores: [{ month: "2026-01", score: 68 }, { month: "2026-02", score: 72 }],
    certificates: [{ name: "IPC-A-610 Acceptability", level: "basic", isValid: true }],
    meetingScores: [
      { month: "2026-01", meetingScore: 55, attended: 4, total: 8 },
      { month: "2026-02", meetingScore: 62, attended: 6, total: 9 },
    ],
    aiTasks: [{ type: "document_draft", quality: 65, status: "completed" }],
  },
  {
    userId: 1003, code: "GRT-E018", name: "王芳 (Wang Fang)", department: "R&D",
    position: "Product Innovation Lead", level: "P7", hireDate: "2019-07-20",
    kpiScores: [{ month: "2025-12", score: 82 }, { month: "2026-01", score: 78 }, { month: "2026-02", score: 85 }],
    certificates: [
      { name: "AWS Solutions Architect", level: "expert", isValid: true },
      { name: "Certified ScrumMaster", level: "intermediate", isValid: true },
    ],
    meetingScores: [
      { month: "2025-12", meetingScore: 85, attended: 15, total: 16 },
      { month: "2026-01", meetingScore: 88, attended: 14, total: 15 },
      { month: "2026-02", meetingScore: 92, attended: 12, total: 12 },
    ],
    aiTasks: [
      { type: "data_analysis", quality: 92, status: "completed" },
      { type: "report_generation", quality: 88, status: "completed" },
      { type: "risk_assessment", quality: 90, status: "completed" },
      { type: "code_review", quality: 95, status: "completed" },
      { type: "meeting_summary", quality: 91, status: "completed" },
      { type: "document_draft", quality: 87, status: "completed" },
      { type: "data_analysis", quality: 93, status: "completed" },
      { type: "quality_inspection", quality: 89, status: "completed" },
      { type: "email_draft", quality: 85, status: "completed" },
      { type: "report_generation", quality: 94, status: "completed" },
      { type: "data_analysis", quality: 91, status: "completed" },
      { type: "risk_assessment", quality: 96, status: "completed" },
    ],
  },
];

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

  const profile = useMemo(() => generateMockProfile(selectedUserId), [selectedUserId]);
  const employeeData = useMemo(() => MOCK_EMPLOYEES.find(e => e.userId === selectedUserId), [selectedUserId]);

  if (!profile) {
    return (
      <div style={{ padding: 40, color: "#ef4444", textAlign: "center" }}>
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
          {MOCK_EMPLOYEES.map(e => (
            <option key={e.userId} value={e.userId}>
              {e.code} — {e.name}
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

            {activeTab === "kpi" && employeeData && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155" }}>
                    {["Month", "KPI Score", "Grade"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employeeData.kpiScores.map((k, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "10px 12px", fontSize: 13 }}>{k.month}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: k.score >= 85 ? "#22c55e" : k.score >= 60 ? "#3b82f6" : "#f59e0b" }}>
                        {k.score}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13 }}>
                        {k.score >= 90 ? "Excellent" : k.score >= 80 ? "Good" : k.score >= 70 ? "Average" : "Below"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "certs" && employeeData && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155" }}>
                    {["Certificate", "Level", "Status", "Points"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employeeData.certificates.map((c, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "10px 12px", fontSize: 13 }}>{c.name}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                          backgroundColor: c.level === "expert" ? "#78350f" : c.level === "advanced" ? "#14532d" : "#1e3a5f",
                          color: c.level === "expert" ? "#fbbf24" : c.level === "advanced" ? "#4ade80" : "#60a5fa",
                        }}>
                          {c.level}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: c.isValid ? "#22c55e" : "#ef4444" }}>
                        {c.isValid ? "Valid" : "Expired"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>
                        +{CERT_WEIGHTS[c.level] ?? 15}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "meetings" && employeeData && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155" }}>
                    {["Month", "Meeting Score", "Attended", "Attendance %"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employeeData.meetingScores.map((m, i) => {
                    const pct = m.total > 0 ? round2((m.attended / m.total) * 100) : 0;
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "10px 12px", fontSize: 13 }}>{m.month}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: m.meetingScore >= 80 ? "#22c55e" : "#3b82f6" }}>
                          {m.meetingScore}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13 }}>{m.attended} / {m.total}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: pct >= 80 ? "#22c55e" : "#f59e0b" }}>
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeTab === "ai" && employeeData && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155" }}>
                    {["Task Type", "Quality Score", "Status"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employeeData.aiTasks.map((t, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "10px 12px", fontSize: 13, textTransform: "capitalize" }}>
                        {t.type.replace(/_/g, " ")}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: t.quality >= 85 ? "#22c55e" : t.quality >= 70 ? "#3b82f6" : "#f59e0b" }}>
                        {t.quality}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                          backgroundColor: t.status === "completed" ? "#14532d" : t.status === "failed" ? "#7f1d1d" : "#78350f",
                          color: t.status === "completed" ? "#4ade80" : t.status === "failed" ? "#fca5a5" : "#fbbf24",
                        }}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
