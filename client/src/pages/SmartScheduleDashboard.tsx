/**
 * Smart APS Dashboard — Self-Healing Factory Visualization
 * Phase 3.2 — Equipment Health & Auto-Scheduling
 *
 * Split-view layout:
 *   TOP:    "Live Fleet Health" — color-coded health bars, flashes RED for CRITICAL
 *   BOTTOM: "Dynamic Gantt Chart" — job timeline with auto-rescheduled highlights
 *   SIDE:   "AI Decision Log" — real-time engine decision trail
 *
 * Data source: trpc.smartScheduler.fleetHealth / ganttView / decisionLog (DB-backed)
 * Route: /production/smart-schedule
 */

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";

// ─── Types (mirrors server) ──────────────────────────────────────

type HealthStatus = "HEALTHY" | "WARNING" | "CRITICAL" | "OFFLINE";
type ScheduleStatus = "SCHEDULED" | "IN_PROGRESS" | "MOVED_AUTO" | "MOVED_MANUAL" | "COMPLETED" | "CANCELLED";

// ─── Helpers ──────────────────────────────────────────────────────

function healthColor(status: HealthStatus): string {
  return { HEALTHY: "#22c55e", WARNING: "#f59e0b", CRITICAL: "#ef4444", OFFLINE: "#6b7280" }[status];
}

function statusColor(status: ScheduleStatus): string {
  return {
    SCHEDULED: "#3b82f6", IN_PROGRESS: "#8b5cf6", MOVED_AUTO: "#f59e0b",
    MOVED_MANUAL: "#06b6d4", COMPLETED: "#22c55e", CANCELLED: "#6b7280",
  }[status];
}

function fmt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

// ─── Component ────────────────────────────────────────────────────

export default function SmartScheduleDashboard() {
  const [showLog, setShowLog] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);

  // ─── tRPC Queries ───
  const fleetQuery = trpc.smartScheduler.fleetHealth.useQuery(undefined, QUERY_OPTS);
  const ganttQuery = trpc.smartScheduler.ganttView.useQuery(undefined, QUERY_OPTS);
  const logQuery = trpc.smartScheduler.decisionLog.useQuery(undefined, QUERY_OPTS);

  const fleet = fleetQuery.data?.machines ?? [];
  const summary = fleetQuery.data?.summary;
  const ganttData = ganttQuery.data;
  const schedule = ganttData?.jobs ?? [];
  const maintenance = ganttData?.maintenanceOrder ?? null;
  const decisionLog = logQuery.data?.log ?? [];
  const dataSource = fleetQuery.data?.dataSource ?? "seed";

  const isLoading = fleetQuery.isLoading || ganttQuery.isLoading;

  const movedJobs = useMemo(() => schedule.filter((j: any) => j.status === "MOVED_AUTO"), [schedule]);
  const criticalCount = summary?.critical ?? 0;
  const warningCount = summary?.warning ?? 0;
  const avgHealth = summary?.avgHealth ?? 0;

  // Filter Gantt by machine
  const ganttJobs = useMemo(() => {
    if (!selectedMachine) return schedule.filter((j: any) => j.status !== "COMPLETED");
    return schedule.filter((j: any) => j.machineCode === selectedMachine && j.status !== "COMPLETED");
  }, [schedule, selectedMachine]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div style={{ padding: 24, maxWidth: 1500, margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", margin: "0 0 20px" }}>Smart APS Dashboard</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: 60, background: "#f1f5f9", borderRadius: 10, animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} style={{ height: 400, background: "#f1f5f9", borderRadius: 12, animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1500, margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Smart APS Dashboard
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 14 }}>
            Phase 3.2 — Self-Healing Factory: Predictive Health + Auto-Scheduling
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowLog(!showLog)} style={{
            padding: "8px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600,
            background: showLog ? "#1e293b" : "white", color: showLog ? "white" : "#475569",
            border: "1px solid #cbd5e1", borderRadius: 8,
          }}>
            AI Decision Log
          </button>
          <span style={{
            background: dataSource === "database" ? "#f0fdf4" : "#eff6ff",
            border: `1px solid ${dataSource === "database" ? "#86efac" : "#bfdbfe"}`,
            borderRadius: 20, padding: "6px 14px", fontSize: 12,
            color: dataSource === "database" ? "#16a34a" : "#2563eb",
          }}>
            {dataSource === "database" ? "LIVE DATA" : "SEED DATA"}
          </span>
        </div>
      </div>

      {/* ── Critical Alert ── */}
      {criticalCount > 0 && maintenance && (
        <div style={{
          background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
          borderRadius: 12, padding: "14px 20px", marginBottom: 16, color: "white",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 20, animation: "pulse 1s infinite" }}>!</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              SELF-HEALING ACTIVATED — {movedJobs.length} Jobs Auto-Rescheduled
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {maintenance.machineCode} health dropped to {maintenance.healthScoreAtCreation}%. Maintenance Order {maintenance.orderCode} created.
            </div>
          </div>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Fleet Average", value: `${avgHealth}%`, color: avgHealth >= 70 ? "#22c55e" : "#f59e0b", bg: avgHealth >= 70 ? "#f0fdf4" : "#fffbeb" },
          { label: "CRITICAL", value: criticalCount, color: "#ef4444", bg: "#fef2f2" },
          { label: "WARNING", value: warningCount, color: "#f59e0b", bg: "#fffbeb" },
          { label: "Auto-Moved Jobs", value: movedJobs.length, color: "#f59e0b", bg: "#fff7ed" },
          { label: "Active MWO", value: maintenance ? 1 : 0, color: "#3b82f6", bg: "#eff6ff" },
        ].map((c, i) => (
          <div key={i} style={{
            background: c.bg, borderRadius: 10, padding: "14px 16px", textAlign: "center",
            border: `1px solid ${c.color}30`,
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Main Grid: Fleet + Gantt + Log ── */}
      <div style={{ display: "grid", gridTemplateColumns: showLog ? "1fr 1fr 320px" : "1fr 1fr", gap: 16 }}>
        {/* ─── LIVE FLEET HEALTH ─── */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>
            Live Fleet Health
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {fleet.map((m: any) => {
              const isCritical = m.healthStatus === "CRITICAL";
              return (
                <div key={m.machineId}
                  onClick={() => setSelectedMachine(selectedMachine === m.machineCode ? null : m.machineCode)}
                  style={{
                    padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                    background: isCritical ? "#fef2f2" : selectedMachine === m.machineCode ? "#eff6ff" : "#f8fafc",
                    border: `2px solid ${isCritical ? "#fca5a5" : selectedMachine === m.machineCode ? "#93c5fd" : "#e2e8f0"}`,
                    animation: isCritical ? "criticalFlash 1.5s infinite" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: healthColor(m.healthStatus),
                        animation: isCritical ? "pulse 1s infinite" : "none",
                      }} />
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{m.machineCode}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{m.machineName}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                        background: healthColor(m.healthStatus) + "20",
                        color: healthColor(m.healthStatus),
                      }}>
                        {m.healthStatus}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: healthColor(m.healthStatus), minWidth: 36, textAlign: "right" }}>
                        {m.healthScore}%
                      </span>
                    </div>
                  </div>
                  {/* Health bar */}
                  <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      width: `${m.healthScore}%`, height: "100%",
                      background: `linear-gradient(90deg, ${healthColor(m.healthStatus)}, ${healthColor(m.healthStatus)}cc)`,
                      borderRadius: 3, transition: "width 0.5s",
                    }} />
                  </div>
                  {/* Sensor details for CRITICAL/WARNING */}
                  {(m.healthStatus === "CRITICAL" || m.healthStatus === "WARNING") && (
                    <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11, color: "#64748b" }}>
                      <span>Vib: <strong style={{ color: m.vibrationLevel > 5 ? "#ef4444" : "#475569" }}>{m.vibrationLevel}mm/s</strong></span>
                      <span>Temp: <strong style={{ color: m.temperature > 70 ? "#ef4444" : "#475569" }}>{m.temperature}°C</strong></span>
                      <span>Spindle: <strong style={{ color: m.spindleLoad > 90 ? "#ef4444" : "#475569" }}>{m.spindleLoad}%</strong></span>
                      <span>Trend: <strong style={{ color: m.healthTrend === "DEGRADING" ? "#ef4444" : "#22c55e" }}>{m.healthTrend}</strong></span>
                    </div>
                  )}
                </div>
              );
            })}
            {fleet.length === 0 && (
              <div style={{ textAlign: "center", padding: 30, color: "#94a3b8", fontSize: 13 }}>
                No fleet data available.
              </div>
            )}
          </div>
        </div>

        {/* ─── DYNAMIC GANTT CHART ─── */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Dynamic Gantt Chart
              {selectedMachine && <span style={{ color: "#3b82f6", fontSize: 13 }}> — {selectedMachine}</span>}
            </h2>
            {selectedMachine && (
              <button onClick={() => setSelectedMachine(null)} style={{
                padding: "4px 12px", fontSize: 11, cursor: "pointer",
                background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6, color: "#475569",
              }}>
                Show All
              </button>
            )}
          </div>

          {/* Gantt rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ganttJobs.map((job: any) => {
              const isMoved = job.status === "MOVED_AUTO";
              const start = new Date(job.startTime);
              const end = new Date(job.endTime);
              const durationH = (end.getTime() - start.getTime()) / 3600000;

              return (
                <div key={job.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 8,
                  background: isMoved ? "#fff7ed" : "#f8fafc",
                  border: `1px solid ${isMoved ? "#fdba74" : "#e2e8f0"}`,
                }}>
                  {/* Job ID */}
                  <div style={{ minWidth: 110 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                      {isMoved && <span title="Auto-Rescheduled" style={{ marginRight: 4 }}>*</span>}
                      {job.jobId}
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{job.projectCode}</div>
                  </div>
                  {/* Job Name */}
                  <div style={{ flex: 1, fontSize: 12, color: "#334155" }}>
                    {job.jobName}
                  </div>
                  {/* Gantt bar */}
                  <div style={{ width: 160, height: 20, background: "#e2e8f0", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                    <div style={{
                      width: `${Math.min(100, (durationH / 10) * 100)}%`,
                      height: "100%",
                      background: isMoved
                        ? "repeating-linear-gradient(45deg, #f59e0b, #f59e0b 5px, #fbbf24 5px, #fbbf24 10px)"
                        : statusColor(job.status),
                      borderRadius: 4,
                    }} />
                    {isMoved && (
                      <span style={{
                        position: "absolute", top: 1, right: 4, fontSize: 9, fontWeight: 700, color: "#92400e",
                      }}>
                        MOVED
                      </span>
                    )}
                  </div>
                  {/* Machine */}
                  <div style={{ minWidth: 80, textAlign: "center" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: isMoved ? "#fef3c7" : "#f1f5f9",
                      color: isMoved ? "#92400e" : "#475569",
                    }}>
                      {job.machineCode}
                    </span>
                    {isMoved && job.originalMachineCode && (
                      <div style={{ fontSize: 9, color: "#dc2626", marginTop: 2 }}>
                        was {job.originalMachineCode}
                      </div>
                    )}
                  </div>
                  {/* Time */}
                  <div style={{ minWidth: 100, fontSize: 10, color: "#64748b", textAlign: "right" }}>
                    {fmt(job.startTime)}
                    <br />
                    {fmt(job.endTime)}
                  </div>
                  {/* Status badge */}
                  <span style={{
                    padding: "3px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                    background: statusColor(job.status) + "20",
                    color: statusColor(job.status),
                    minWidth: 60, textAlign: "center",
                  }}>
                    {job.status === "MOVED_AUTO" ? "AUTO-MOVED" : job.status}
                  </span>
                </div>
              );
            })}
            {ganttJobs.length === 0 && (
              <div style={{ textAlign: "center", padding: 30, color: "#94a3b8", fontSize: 13 }}>
                No scheduled jobs for {selectedMachine ?? "any machine"}.
              </div>
            )}
          </div>

          {/* Maintenance Order Card */}
          {maintenance && (
            <div style={{
              marginTop: 16, background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 10, padding: 14,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>
                    Maintenance Order: {maintenance.orderCode}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {maintenance.machineName} — {maintenance.type} ({maintenance.priority})
                  </div>
                </div>
                <span style={{
                  padding: "4px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5",
                }}>
                  {maintenance.status}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
                {maintenance.triggerReason}
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                Est. duration: {maintenance.estimatedDurationMinutes} min | Created: {fmt(maintenance.createdAt)}
              </div>
            </div>
          )}
        </div>

        {/* ─── AI DECISION LOG ─── */}
        {showLog && (
          <div style={{
            background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: 16,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            maxHeight: 680, overflow: "auto",
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#22d3ee", margin: "0 0 12px" }}>
              AI Decision Log
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {decisionLog.map((line: string, i: number) => {
                let color = "#94a3b8";
                if (line.includes("CRITICAL")) color = "#ef4444";
                else if (line.includes("AUTO-ACTION")) color = "#fbbf24";
                else if (line.includes("RESULT")) color = "#22c55e";
                else if (line.includes("Backup found")) color = "#38bdf8";
                else if (line.includes("WARNING")) color = "#f59e0b";

                return (
                  <div key={i} style={{ fontSize: 11, lineHeight: 1.5, color }}>
                    <span style={{ color: "#475569", marginRight: 6 }}>{String(i + 1).padStart(2, "0")}</span>
                    {line}
                  </div>
                );
              })}
              {decisionLog.length === 0 && (
                <div style={{ color: "#475569", fontSize: 11 }}>No decisions recorded yet.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Self-Healing Architecture Diagram ── */}
      <div style={{
        marginTop: 24, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12,
        padding: 24, textAlign: "center",
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
          Self-Healing Factory Architecture
        </h3>
        <svg viewBox="0 0 800 140" style={{ maxWidth: 700, width: "100%" }}>
          {[
            { x: 10, label1: "MONITOR", label2: "IoT Sensors", color: "#3b82f6" },
            { x: 210, label1: "PREDICT", label2: "Health < 40%", color: "#f59e0b" },
            { x: 410, label1: "ACT", label2: "Reschedule + MWO", color: "#ef4444" },
            { x: 610, label1: "HEAL", label2: "Maintenance Done", color: "#22c55e" },
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

      {/* ── CSS Animations ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes criticalFlash {
          0%, 100% { background-color: #fef2f2; }
          50% { background-color: #fee2e2; }
        }
      `}</style>
    </div>
  );
}
