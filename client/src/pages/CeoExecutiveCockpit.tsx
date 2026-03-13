/**
 * CEO Executive Cockpit — THE FINAL UI
 * Phase 4 — Ultimate Digital Thread & Executive Cockpit
 *
 * Bloomberg Terminal meets Fighter Jet HUD.
 * Single screen that runs the entire company.
 *
 * Layout:
 *   Top Bar: Company Health Score ring + Financial Burn Rate + CEO name
 *   Row 1: 8 KPI cards (Production, Quality, Cost, Supply Chain, ESG, People)
 *   Row 2: Digital Thread Timeline (20 most recent events, color-coded)
 *   Row 3: SVG Radar Chart (7 axes: Production/Quality/Cost/SC/ESG/People/Schedule)
 *   Row 4: 4 Business Quadrants (Manufacturing, Quality, Supply Chain, People)
 *   Row 5: Impact Chain Visualization + CEO Weekly Brief
 *   Row 6: Quick Action Links to all 11 module dashboards
 *
 * Route: /ceo/executive-cockpit
 */

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Types ───────────────────────────────────────────────────────────

type Severity = "INFO" | "WARNING" | "CRITICAL";
type SourceModule = "SOP" | "OEE" | "COMPLIANCE" | "ECO" | "SUPPLIER" | "EMPLOYEE" | "FMEA" | "HR_AI" | "SCHEDULER" | "INVENTORY" | "CBAM";

interface ThreadEvent {
  eventId: string;
  timestamp: string;
  sourceModule: SourceModule;
  severity: Severity;
  summaryZh: string;
  summaryEn: string;
}

interface ModuleHealth {
  production: number;
  quality: number;
  cost: number;
  supplyChain: number;
  esg: number;
  people: number;
  schedule: number;
}

// ─── Mock Data (mirrors server engine) ───────────────────────────────

const HEALTH: ModuleHealth = { production: 82, quality: 74, cost: 79, supplyChain: 64, esg: 86, people: 76, schedule: 67 };
const OVERALL = Math.round(HEALTH.production * 0.25 + HEALTH.quality * 0.20 + HEALTH.cost * 0.15 + HEALTH.supplyChain * 0.15 + HEALTH.esg * 0.10 + HEALTH.people * 0.10 + HEALTH.schedule * 0.05);
const GRADE = OVERALL >= 90 ? "A" : OVERALL >= 75 ? "B" : OVERALL >= 60 ? "C" : OVERALL >= 40 ? "D" : "F";

const KPI = {
  projectsOnTrack: "8/12", oee: "82.5%", costVariance: "+4.2%", open8Ds: 2,
  supplierScore: 78, cbamStatus: "2 ✅ / 1 ⚠", operatorBlocks: 1, criticalMachines: 1,
};

const BURN = { budget: 2800000, spent: 1950000, percent: 69.6 };

const EVENTS: ThreadEvent[] = [
  { eventId: "E1", timestamp: "2026-02-25T16:00", sourceModule: "SOP", severity: "INFO", summaryZh: "新增CNC开机SOP（含视频指导）", summaryEn: "New CNC startup SOP with video guide" },
  { eventId: "E2", timestamp: "2026-02-25T15:30", sourceModule: "EMPLOYEE", severity: "INFO", summaryZh: "曹庆伟战斗力提升至94（TIG焊接认证）", summaryEn: "Cao Qingwei combat power up to 94 (TIG cert)" },
  { eventId: "E3", timestamp: "2026-02-25T15:00", sourceModule: "HR_AI", severity: "INFO", summaryZh: "吴卫成完成培训（85/80分），权限恢复", summaryEn: "Wu Weicheng unblocked — training complete 85/80" },
  { eventId: "E4", timestamp: "2026-02-25T14:00", sourceModule: "COMPLIANCE", severity: "WARNING", summaryZh: "ISO 9001审核15天后到期", summaryEn: "ISO 9001 audit due in 15 days" },
  { eventId: "E5", timestamp: "2026-02-25T13:00", sourceModule: "OEE", severity: "WARNING", summaryZh: "CNC-003 OEE降至62%", summaryEn: "CNC-003 OEE dropped to 62%" },
  { eventId: "E6", timestamp: "2026-02-25T12:00", sourceModule: "CBAM", severity: "INFO", summaryZh: "GWM-3000 CBAM声明通过合规审核", summaryEn: "GWM-3000 CBAM declaration passed compliance" },
  { eventId: "E7", timestamp: "2026-02-25T11:30", sourceModule: "INVENTORY", severity: "INFO", summaryZh: "SS316动态安全库存上调至30", summaryEn: "SS316 dynamic safety stock raised to 30" },
  { eventId: "E8", timestamp: "2026-02-25T11:00", sourceModule: "SUPPLIER", severity: "WARNING", summaryZh: "Siemens S7-1500交期延至8周", summaryEn: "Siemens S7-1500 lead time extended to 8 weeks" },
  { eventId: "E9", timestamp: "2026-02-25T10:30", sourceModule: "FMEA", severity: "WARNING", summaryZh: "WASH-003 RPN从320降至180", summaryEn: "WASH-003 RPN dropped 320→180" },
  { eventId: "E10", timestamp: "2026-02-25T10:00", sourceModule: "ECO", severity: "INFO", summaryZh: "ECO-2026-015批准：PLC升级", summaryEn: "ECO-2026-015 approved: PLC upgrade" },
  { eventId: "E11", timestamp: "2026-02-25T09:30", sourceModule: "HR_AI", severity: "WARNING", summaryZh: "吴卫成被AI系统暂停操作权限", summaryEn: "Wu Weicheng blocked by AI training system" },
  { eventId: "E12", timestamp: "2026-02-25T08:15", sourceModule: "SCHEDULER", severity: "CRITICAL", summaryZh: "CNC-001健康35%，3工单自动转移至CNC-002", summaryEn: "CNC-001 health 35% — 3 jobs moved to CNC-002" },
];

const MACHINES = [
  { code: "CNC-001", health: 35, status: "CRITICAL" },
  { code: "CNC-002", health: 88, status: "HEALTHY" },
  { code: "CNC-003", health: 62, status: "WARNING" },
  { code: "WLD-TIG-001", health: 55, status: "WARNING" },
  { code: "LASER-001", health: 91, status: "HEALTHY" },
  { code: "HYD-BENCH-001", health: 85, status: "HEALTHY" },
];

const TOP_EMPLOYEES = [
  { name: "曹庆伟 (Cao Qingwei)", score: 94 },
  { name: "吴卫成 (Wu Weicheng)", score: 88 },
  { name: "张超 (Zhang Chao)", score: 85 },
];

// ─── Helpers ─────────────────────────────────────────────────────────

const severityColor = (s: Severity) => s === "CRITICAL" ? "#ef4444" : s === "WARNING" ? "#f59e0b" : "#22c55e";
const moduleIcon = (m: SourceModule) => {
  const map: Record<SourceModule, string> = {
    SOP: "📋", OEE: "⚙️", COMPLIANCE: "📅", ECO: "🔧", SUPPLIER: "🚚",
    EMPLOYEE: "👤", FMEA: "🔬", HR_AI: "🤖", SCHEDULER: "📊", INVENTORY: "📦", CBAM: "🌱",
  };
  return map[m] ?? "●";
};

const healthRingColor = (score: number) => score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

// ─── Component ───────────────────────────────────────────────────────

export default function CeoExecutiveCockpit() {
  const { t, language } = useLanguage();
  const lang = language === "zh" ? "zh" : "en";

  // Real backend data — overlay onto mock KPIs where available
  const okrQuery = trpc.okr.dashboard.useQuery(undefined, { retry: false });
  const perfQuery = trpc.aiPerformance.dashboard.useQuery(undefined, { retry: false });

  // Override KPIs with real data when available
  const okr = okrQuery.data;
  if (okr && okr.totalObjectives > 0) {
    KPI.projectsOnTrack = `${okr.onTrack}/${okr.totalObjectives}`;
  }
  const perf = perfQuery.data;
  if (perf && perf.employeesEvaluated > 0) {
    KPI.supplierScore = perf.avgMeetingScore;
  }

  // SVG Radar chart coordinates
  const radarAxes = useMemo(() => {
    const labels = [
      { key: "production", label: t("admin.ceo.production"), value: HEALTH.production },
      { key: "quality", label: t("admin.ceo.quality"), value: HEALTH.quality },
      { key: "cost", label: t("admin.ceo.cost"), value: HEALTH.cost },
      { key: "supplyChain", label: t("admin.ceo.supplyChain"), value: HEALTH.supplyChain },
      { key: "esg", label: "ESG", value: HEALTH.esg },
      { key: "people", label: t("admin.ceo.people"), value: HEALTH.people },
      { key: "schedule", label: t("admin.ceo.schedule"), value: HEALTH.schedule },
    ];
    const cx = 150, cy = 150, r = 110;
    return labels.map((l, i) => {
      const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      const vx = cx + (r * l.value / 100) * Math.cos(angle);
      const vy = cy + (r * l.value / 100) * Math.sin(angle);
      const lx = cx + (r + 25) * Math.cos(angle);
      const ly = cy + (r + 25) * Math.sin(angle);
      return { ...l, px, py, vx, vy, lx, ly };
    });
  }, [language, t]);

  const radarPath = radarAxes.map((a, i) => `${i === 0 ? "M" : "L"} ${a.vx} ${a.vy}`).join(" ") + " Z";

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#e2e8f0", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", padding: "20px" }}>
      {/* ═══ TOP BAR ═══ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "1px solid #1e293b", paddingBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          {/* Health Score Ring */}
          <div style={{ position: "relative", width: "80px", height: "80px" }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#1e293b" strokeWidth="6" />
              <circle cx="40" cy="40" r="32" fill="none" stroke={healthRingColor(OVERALL)} strokeWidth="6"
                strokeDasharray={`${OVERALL * 2.01} 201`} strokeDashoffset="50" strokeLinecap="round"
                style={{ transition: "stroke-dasharray 1s ease" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "22px", fontWeight: 900, color: healthRingColor(OVERALL) }}>{OVERALL}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "2px" }}>{t("admin.ceo.title")}</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>{t("admin.ceo.subtitle")}</div>
          </div>
          <span style={{
            padding: "4px 16px", borderRadius: "4px", fontWeight: 900, fontSize: "18px",
            background: GRADE === "A" ? "#166534" : GRADE === "B" ? "#1e40af" : GRADE === "C" ? "#92400e" : "#991b1b",
            color: "#fff",
          }}>
            {GRADE}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          {/* Financial Burn Rate */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Burn Rate</div>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>
              <span style={{ color: "#f59e0b" }}>¥{(BURN.spent / 10000).toFixed(0)}万</span>
              <span style={{ color: "#475569" }}> / ¥{(BURN.budget / 10000).toFixed(0)}万</span>
            </div>
            <div style={{ width: "120px", height: "4px", background: "#1e293b", borderRadius: "2px", marginTop: "4px" }}>
              <div style={{ height: "100%", width: `${BURN.percent}%`, background: BURN.percent > 80 ? "#ef4444" : "#f59e0b", borderRadius: "2px" }} />
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            <div>2026-02-25 22:00 CST</div>
            <div style={{ color: "#94a3b8" }}>{t("admin.ceo.ceoDashboard")}</div>
          </div>
        </div>
      </div>

      {/* ═══ ROW 1: KPI CARDS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: t("admin.ceo.projects"), value: KPI.projectsOnTrack, sub: "on track", color: "#22c55e" },
          { label: "OEE", value: KPI.oee, sub: "fleet avg", color: "#3b82f6" },
          { label: t("admin.ceo.costVar"), value: KPI.costVariance, sub: "over budget", color: "#f59e0b" },
          { label: t("admin.ceo.open8Ds"), value: KPI.open8Ds, sub: "open", color: KPI.open8Ds > 0 ? "#ef4444" : "#22c55e" },
          { label: t("admin.ceo.suppliers"), value: KPI.supplierScore, sub: "avg score", color: "#8b5cf6" },
          { label: "CBAM", value: KPI.cbamStatus, sub: "products", color: "#22c55e" },
          { label: t("admin.ceo.blocks"), value: KPI.operatorBlocks, sub: "active", color: KPI.operatorBlocks > 0 ? "#f59e0b" : "#22c55e" },
          { label: t("admin.ceo.critical"), value: KPI.criticalMachines, sub: "machines", color: KPI.criticalMachines > 0 ? "#ef4444" : "#22c55e" },
        ].map((kpi, i) => (
          <div key={i} style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "8px", padding: "12px", borderLeft: `3px solid ${kpi.color}` }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>{kpi.label}</div>
            <div style={{ fontSize: "20px", fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: "10px", color: "#475569" }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ═══ ROW 2: DIGITAL THREAD TIMELINE ═══ */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>
          ◆ Digital Thread — Live Event Stream
        </div>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px" }}>
          {EVENTS.map(evt => (
            <div key={evt.eventId} style={{
              minWidth: "220px", background: "#111827", border: `1px solid ${severityColor(evt.severity)}33`,
              borderRadius: "8px", padding: "12px", borderTop: `2px solid ${severityColor(evt.severity)}`,
              ...(evt.severity === "CRITICAL" ? { animation: "critPulse 2s infinite" } : {}),
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "16px" }}>{moduleIcon(evt.sourceModule)}</span>
                <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: `${severityColor(evt.severity)}22`, color: severityColor(evt.severity), fontWeight: 700 }}>
                  {evt.severity}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#e2e8f0", marginBottom: "4px", lineHeight: "1.3" }}>
                {lang === "zh" ? evt.summaryZh : evt.summaryEn}
              </div>
              <div style={{ fontSize: "9px", color: "#475569" }}>{evt.timestamp.replace("T", " ")}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ROW 3: RADAR CHART + 4 QUADRANTS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Radar Chart */}
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>
            ◆ Module Health Radar
          </div>
          <svg width="300" height="300" viewBox="0 0 300 300">
            {/* Grid rings */}
            {[25, 50, 75, 100].map(pct => (
              <polygon key={pct} fill="none" stroke="#1e293b" strokeWidth="1"
                points={radarAxes.map((_, i) => {
                  const angle = (Math.PI * 2 * i) / radarAxes.length - Math.PI / 2;
                  return `${150 + 110 * (pct / 100) * Math.cos(angle)},${150 + 110 * (pct / 100) * Math.sin(angle)}`;
                }).join(" ")} />
            ))}
            {/* Axis lines */}
            {radarAxes.map((a, i) => (
              <line key={i} x1="150" y1="150" x2={a.px} y2={a.py} stroke="#1e293b" strokeWidth="1" />
            ))}
            {/* Value polygon */}
            <polygon fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" strokeWidth="2" points={radarAxes.map(a => `${a.vx},${a.vy}`).join(" ")} />
            {/* Value dots */}
            {radarAxes.map((a, i) => (
              <circle key={i} cx={a.vx} cy={a.vy} r="4" fill={a.value >= 75 ? "#22c55e" : a.value >= 50 ? "#f59e0b" : "#ef4444"} />
            ))}
            {/* Labels */}
            {radarAxes.map((a, i) => (
              <text key={i} x={a.lx} y={a.ly} textAnchor="middle" fontSize="10" fill="#94a3b8" dominantBaseline="central">
                {a.label} ({a.value})
              </text>
            ))}
          </svg>
        </div>

        {/* 4 Quadrants */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "12px" }}>
          {/* Q1: Manufacturing & Delivery */}
          <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "12px", padding: "16px" }}>
            <div style={{ fontSize: "11px", color: "#3b82f6", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px", fontWeight: 700 }}>
              ⚙️ {t("admin.ceo.mfgDelivery")}
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#3b82f6", marginBottom: "8px" }}>OEE {KPI.oee}</div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>
              {t("admin.ceo.autoRescheduled")}: <span style={{ color: "#f59e0b", fontWeight: 700 }}>3 jobs</span>
            </div>
            <div style={{ fontSize: "11px" }}>
              {MACHINES.map(m => (
                <div key={m.code} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #1e293b" }}>
                  <span style={{ color: m.status === "CRITICAL" ? "#ef4444" : m.status === "WARNING" ? "#f59e0b" : "#22c55e" }}>
                    {m.status === "CRITICAL" ? "🔴" : m.status === "WARNING" ? "🟡" : "🟢"} {m.code}
                  </span>
                  <span style={{ color: "#64748b" }}>{m.health}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Q2: Quality & Risk */}
          <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "12px", padding: "16px" }}>
            <div style={{ fontSize: "11px", color: "#ef4444", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px", fontWeight: 700 }}>
              🔬 {t("admin.ceo.qualityRisk")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <div style={{ background: "#1e293b", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#ef4444" }}>{KPI.open8Ds}</div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Open 8Ds</div>
              </div>
              <div style={{ background: "#1e293b", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#f59e0b" }}>1</div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Overdue CAPA</div>
              </div>
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              Max FMEA RPN: <span style={{ color: "#f59e0b", fontWeight: 700 }}>320</span>
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
              ⚠ ISO 9001 audit in <span style={{ color: "#f59e0b", fontWeight: 700 }}>15 days</span>
            </div>
          </div>

          {/* Q3: Supply Chain & Cash Flow */}
          <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "12px", padding: "16px" }}>
            <div style={{ fontSize: "11px", color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px", fontWeight: 700 }}>
              🚚 {t("admin.ceo.scCashFlow")}
            </div>
            <div style={{ fontSize: "14px", color: "#e2e8f0", marginBottom: "8px" }}>
              {t("admin.ceo.restrictedSuppliers")}: <span style={{ color: "#ef4444", fontWeight: 700 }}>2</span>
            </div>
            <div style={{ fontSize: "14px", color: "#e2e8f0", marginBottom: "8px" }}>
              {t("admin.ceo.cashRelease")}: <span style={{ color: "#22c55e", fontWeight: 700 }}>¥185,000</span>
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              Shortage risks: <span style={{ color: "#f59e0b" }}>3 items</span>
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              Avg lead time: <span style={{ color: "#94a3b8" }}>18 days</span>
            </div>
          </div>

          {/* Q4: Team Readiness */}
          <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "12px", padding: "16px" }}>
            <div style={{ fontSize: "11px", color: "#22c55e", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px", fontWeight: 700 }}>
              👤 {t("admin.ceo.teamReadiness")}
            </div>
            <div style={{ fontSize: "14px", color: "#e2e8f0", marginBottom: "8px" }}>
              {t("admin.ceo.aiBlocks")}: <span style={{ color: KPI.operatorBlocks > 0 ? "#f59e0b" : "#22c55e", fontWeight: 700 }}>{KPI.operatorBlocks}</span>
            </div>
            <div style={{ fontSize: "14px", color: "#e2e8f0", marginBottom: "8px" }}>
              {t("admin.ceo.avgCombatPower")}: <span style={{ color: "#3b82f6", fontWeight: 700 }}>76</span>
            </div>
            <div style={{ fontSize: "11px" }}>
              {TOP_EMPLOYEES.map((e, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #1e293b" }}>
                  <span style={{ color: "#e2e8f0" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {e.name}</span>
                  <span style={{ color: "#22c55e", fontWeight: 700 }}>{e.score}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>Training in progress: 3</div>
          </div>
        </div>
      </div>

      {/* ═══ ROW 4: IMPACT CHAIN + CEO BRIEF ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Impact Chain */}
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "12px", padding: "20px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>
            ◆ {t("admin.ceo.changeImpactChain")} — ECO-2026-015
          </div>
          <svg viewBox="0 0 500 200" style={{ width: "100%" }}>
            {/* Root node */}
            <rect x="10" y="70" width="90" height="50" rx="6" fill="#1e40af" opacity="0.3" stroke="#3b82f6" strokeWidth="2" />
            <text x="55" y="92" textAnchor="middle" fontSize="10" fill="#93c5fd" fontWeight="700">🔧 ECO</text>
            <text x="55" y="107" textAnchor="middle" fontSize="8" fill="#64748b">PLC Upgrade</text>

            {/* Lines */}
            <line x1="100" y1="95" x2="140" y2="50" stroke="#334155" strokeWidth="1.5" />
            <line x1="100" y1="95" x2="140" y2="95" stroke="#334155" strokeWidth="1.5" />
            <line x1="100" y1="95" x2="140" y2="140" stroke="#334155" strokeWidth="1.5" />

            {/* FMEA */}
            <rect x="140" y="25" width="90" height="50" rx="6" fill="#7c2d12" opacity="0.3" stroke="#f59e0b" strokeWidth="2" />
            <text x="185" y="47" textAnchor="middle" fontSize="10" fill="#fcd34d" fontWeight="700">🔬 FMEA</text>
            <text x="185" y="62" textAnchor="middle" fontSize="8" fill="#64748b">RPN 320→180</text>

            {/* SOP under FMEA */}
            <line x1="230" y1="50" x2="270" y2="30" stroke="#334155" strokeWidth="1" />
            <rect x="270" y="10" width="80" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <text x="310" y="30" textAnchor="middle" fontSize="9" fill="#94a3b8">📋 SOP Update</text>

            {/* Supplier */}
            <rect x="140" y="70" width="90" height="50" rx="6" fill="#4c1d95" opacity="0.3" stroke="#8b5cf6" strokeWidth="2" />
            <text x="185" y="92" textAnchor="middle" fontSize="10" fill="#c4b5fd" fontWeight="700">🚚 Supplier</text>
            <text x="185" y="107" textAnchor="middle" fontSize="8" fill="#64748b">Lead +4 weeks</text>

            {/* Inventory under Supplier */}
            <line x1="230" y1="95" x2="270" y2="95" stroke="#334155" strokeWidth="1" />
            <rect x="270" y="75" width="80" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <text x="310" y="95" textAnchor="middle" fontSize="9" fill="#94a3b8">📦 Stock +10</text>

            {/* CBAM */}
            <rect x="140" y="115" width="90" height="50" rx="6" fill="#14532d" opacity="0.3" stroke="#22c55e" strokeWidth="2" />
            <text x="185" y="137" textAnchor="middle" fontSize="10" fill="#86efac" fontWeight="700">🌱 CBAM</text>
            <text x="185" y="152" textAnchor="middle" fontSize="8" fill="#64748b">CO₂ -15kg</text>

            {/* Result */}
            <line x1="230" y1="140" x2="400" y2="100" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4" />
            <line x1="350" y1="95" x2="400" y2="100" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4" />
            <line x1="350" y1="30" x2="400" y2="100" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4" />
            <rect x="400" y="75" width="90" height="50" rx="6" fill="#166534" opacity="0.3" stroke="#22c55e" strokeWidth="2" />
            <text x="445" y="97" textAnchor="middle" fontSize="10" fill="#86efac" fontWeight="700">✅ Updated</text>
            <text x="445" y="112" textAnchor="middle" fontSize="8" fill="#64748b">Thread synced</text>
          </svg>
        </div>

        {/* CEO Weekly Brief */}
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "12px", padding: "20px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>
            ◆ {t("admin.ceo.ceoWeeklyBrief")} — AI Generated
          </div>
          <div style={{ fontFamily: "system-ui", lineHeight: "1.6", fontSize: "13px" }}>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ color: "#3b82f6", fontWeight: 700, marginBottom: "4px" }}>Headlines</div>
              <div style={{ color: "#e2e8f0" }}>• Company Health: {OVERALL}/100 (Grade {GRADE})</div>
              <div style={{ color: "#e2e8f0" }}>• CNC-001 auto-rescheduled — 3 jobs moved, zero production delay</div>
              <div style={{ color: "#e2e8f0" }}>• ¥185,000 potential cash release from inventory optimization</div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ color: "#ef4444", fontWeight: 700, marginBottom: "4px" }}>Risks</div>
              <div style={{ color: "#fca5a5" }}>• 2 open 8D reports, 1 overdue CAPA</div>
              <div style={{ color: "#fca5a5" }}>• 1 product at CBAM risk (5,840 kg CO₂)</div>
              <div style={{ color: "#fca5a5" }}>• Siemens S7-1500 lead time doubled to 8 weeks</div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ color: "#22c55e", fontWeight: 700, marginBottom: "4px" }}>Wins</div>
              <div style={{ color: "#86efac" }}>• Wu Weicheng completed AI training — access restored</div>
              <div style={{ color: "#86efac" }}>• GWM-3000 EU CBAM declaration approved</div>
              <div style={{ color: "#86efac" }}>• Cao Qingwei combat power 94 — new TIG cert</div>
            </div>
            <div style={{ background: "#1e293b", borderRadius: "8px", padding: "12px", borderLeft: "3px solid #f59e0b" }}>
              <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: "11px", marginBottom: "4px" }}>TOP PRIORITY</div>
              <div style={{ color: "#e2e8f0" }}>Improve Supply Chain health (64/100) — weakest link in digital thread. Address restricted suppliers and S7-1500 lead time risk.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ROW 5: QUICK ACTIONS ═══ */}
      <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "12px", padding: "16px" }}>
        <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>
          ◆ {t("admin.ceo.quickActions")} — All 11 Domains Connected
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {[
            { label: "📋 SOP Interlock", path: "/sop-interlock" },
            { label: "⚙️ OEE Dashboard", path: "/production/oee-dashboard" },
            { label: "📅 Compliance Calendar", path: "/admin/compliance-calendar" },
            { label: "🔧 ECO Cost Impact", path: "/quality/eco-cost-impact" },
            { label: "🚚 Supplier Risk", path: "/supply-chain/supplier-risk" },
            { label: "👤 Employee Profile", path: "/hr/employee-360" },
            { label: "🔬 FMEA Dynamic RPN", path: "/quality/fmea-live-risk" },
            { label: "🤖 AI Training Loop", path: "/hr/ai-interventions" },
            { label: "📊 Smart Scheduler", path: "/production/smart-schedule" },
            { label: "📦 Smart Inventory", path: "/supply-chain/smart-inventory" },
            { label: "🌱 CBAM Dashboard", path: "/esg/cbam-dashboard" },
          ].map((link, i) => (
            <a key={i} href={link.path} style={{
              padding: "8px 16px", borderRadius: "6px", background: "#1e293b", color: "#94a3b8",
              textDecoration: "none", fontSize: "12px", border: "1px solid #334155",
              transition: "all 0.2s",
            }}
              onMouseOver={(e) => { e.currentTarget.style.background = "#334155"; e.currentTarget.style.color = "#e2e8f0"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#94a3b8"; }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div style={{ textAlign: "center", marginTop: "24px", padding: "16px", color: "#334155", fontSize: "11px" }}>
        GRT 5.0 Digital Thread — 11 Modules • 12 Test Suites • {t("admin.ceo.footer")}
        <br />Phase 1 (Infrastructure) → Phase 2 (Fusion) → Phase 3 (AI Prediction) → Phase 4 (Executive Cockpit)
      </div>

      <style>{`
        @keyframes critPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 0 12px 4px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}
