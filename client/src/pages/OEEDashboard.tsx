/**
 * OEE (Overall Equipment Effectiveness) Industrial Dashboard
 * Phase 1.3 — IATF 16949 Compliance
 *
 * Dark-themed, high-contrast display for factory floor monitors.
 * Shows 4 machines with circular OEE gauges.
 * Color coding: ≥85% Green, 70-85% Yellow, <70% Red.
 *
 * Mock-first: renders immediately with realistic data.
 * Live overlay via trpc.oeeDashboard.dashboard when available.
 */

import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Factory,
  Activity,
  Gauge,
  Zap,
  ShieldCheck,
  Clock,
  WifiOff,
  Wifi,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// ─── Types (mirrors server types) ───────────────────────────────────

interface OEEResult {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  availabilityPct: number;
  performancePct: number;
  qualityPct: number;
  oeePct: number;
  grade: "world-class" | "acceptable" | "critical";
}

interface MachineEntry {
  machineId: number;
  machineCode: string;
  machineName: string;
  location: string;
  status: string;
  oee: OEEResult;
  shiftsToday: number;
  lastUpdated: string;
}

// Server provides mock fallback data — no frontend MOCK needed

// ─── Helpers ────────────────────────────────────────────────────────

function gradeColor(grade: string): string {
  if (grade === "world-class") return "#22c55e";
  if (grade === "acceptable") return "#eab308";
  return "#ef4444";
}

function gradeLabelKey(grade: string): string {
  if (grade === "world-class") return "manufacturing.oee.gradeWorldClass";
  if (grade === "acceptable") return "manufacturing.oee.gradeAcceptable";
  return "manufacturing.oee.gradeCritical";
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    running: "bg-green-500/20 text-green-400 border-green-500/30",
    idle: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    maintenance: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return colors[status] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

// ─── SVG Circular Gauge ─────────────────────────────────────────────

function CircularGauge({
  value,
  label,
  size = 120,
  strokeWidth = 10,
  color,
}: {
  value: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(100, Math.max(0, value));
  const offset = circumference - (filled / 100) * circumference;
  const autoColor = color ?? (value >= 85 ? "#22c55e" : value >= 70 ? "#eab308" : "#ef4444");

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Value arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={autoColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      {/* Center value */}
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-black" style={{ color: autoColor }}>{value.toFixed(1)}%</span>
      </div>
      <span className="text-xs text-gray-400 uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}

// ─── Large OEE Gauge (center piece per machine) ─────────────────────

function LargeOEEGauge({ oee }: { oee: OEEResult }) {
  const color = gradeColor(oee.grade);
  const size = 160;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, oee.oeePct) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s ease-out", filter: `drop-shadow(0 0 8px ${color}40)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-black tracking-tight" style={{ color }}>{oee.oeePct.toFixed(1)}</span>
        <span className="text-xs text-gray-400 uppercase tracking-widest">OEE %</span>
      </div>
    </div>
  );
}

// ─── Machine Card ───────────────────────────────────────────────────

function MachineCard({ machine, t }: { machine: MachineEntry; t: (key: string) => string }) {
  const { oee } = machine;
  const borderColor = gradeColor(oee.grade);

  return (
    <div
      className="bg-gray-900/80 rounded-2xl border overflow-hidden backdrop-blur-sm"
      style={{ borderColor: `${borderColor}30` }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800/50 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">{machine.machineCode}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-bold ${statusBadge(machine.status)}`}>
              {machine.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{machine.machineName}</p>
          <p className="text-xs text-gray-600">{machine.location}</p>
        </div>
        <div className="text-right">
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ backgroundColor: `${borderColor}15`, color: borderColor, border: `1px solid ${borderColor}30` }}
          >
            {t(gradeLabelKey(oee.grade))}
          </span>
        </div>
      </div>

      {/* OEE Gauge — center piece */}
      <div className="flex justify-center py-6">
        <LargeOEEGauge oee={oee} />
      </div>

      {/* 3 Component Gauges */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        <div className="relative flex flex-col items-center">
          <CircularGauge value={oee.availabilityPct} label={t("manufacturing.oee.availability")} size={90} strokeWidth={7} />
        </div>
        <div className="relative flex flex-col items-center">
          <CircularGauge value={oee.performancePct} label={t("manufacturing.oee.performance")} size={90} strokeWidth={7} />
        </div>
        <div className="relative flex flex-col items-center">
          <CircularGauge value={oee.qualityPct} label={t("manufacturing.oee.quality")} size={90} strokeWidth={7} />
        </div>
      </div>

      {/* Footer stats */}
      <div className="px-5 py-3 bg-gray-950/50 border-t border-gray-800/30 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {machine.shiftsToday} {t("manufacturing.oee.shiftsToday")}
        </span>
        <span>
          {t("manufacturing.oee.updated")}: {new Date(machine.lastUpdated).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ─── Summary Bar ────────────────────────────────────────────────────

function SummaryBar({ machines, t }: { machines: MachineEntry[]; t: (key: string) => string }) {
  const running = machines.filter((m) => m.status === "running").length;
  const avgOEE = machines.length > 0
    ? machines.reduce((s, m) => s + m.oee.oeePct, 0) / machines.length
    : 0;
  const worldClass = machines.filter((m) => m.oee.grade === "world-class").length;
  const critical = machines.filter((m) => m.oee.grade === "critical").length;

  return (
    <div className="grid grid-cols-4 gap-4">
      {[
        { icon: Factory, label: t("manufacturing.oee.machinesRunning"), value: `${running} / ${machines.length}`, color: "text-blue-400" },
        { icon: Gauge, label: t("manufacturing.oee.averageOee"), value: `${avgOEE.toFixed(1)}%`, color: avgOEE >= 85 ? "text-green-400" : avgOEE >= 70 ? "text-yellow-400" : "text-red-400" },
        { icon: TrendingUp, label: t("manufacturing.oee.gradeWorldClass"), value: String(worldClass), color: "text-green-400" },
        { icon: TrendingDown, label: t("manufacturing.oee.gradeCritical"), value: String(critical), color: critical > 0 ? "text-red-400" : "text-green-400" },
      ].map((stat, i) => (
        <div key={i} className="bg-gray-900/60 rounded-xl border border-gray-800/50 px-4 py-3 flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gray-800/50 ${stat.color}`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function OEEDashboard() {
  const { t } = useLanguage();
  const dashQuery = trpc.oeeDashboard.dashboard.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30s for live factory data
  });

  const machines = ((dashQuery.data as any)?.machines ?? []) as MachineEntry[];
  const isLive = (dashQuery.data as any)?.isLive ?? false;

  if (dashQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 space-y-6">
        <div className="bg-gray-900/80 rounded-lg h-16 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="bg-gray-900/60 rounded-xl h-20 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {[1,2,3,4].map(i => <div key={i} className="bg-gray-900/80 rounded-2xl h-80 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900/80 border-b border-gray-800/50 px-6 py-4 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {t("manufacturing.oee.title")}
              <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded">IATF 16949</span>
            </h1>
            <p className="text-sm text-gray-500">{t("manufacturing.oee.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
            isLive
              ? "border-green-500/30 text-green-400 bg-green-500/10"
              : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
          }`}>
            {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isLive ? t("manufacturing.oee.live") : t("manufacturing.oee.demoData")}
          </span>
          <div className="text-right text-sm">
            <div className="text-gray-400">{new Date().toLocaleDateString()}</div>
            <div className="text-gray-500 text-xs">{new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary row */}
        <SummaryBar machines={machines} t={t} />

        {/* OEE Legend */}
        <div className="flex items-center gap-6 text-xs text-gray-500 px-1">
          <span>{t("manufacturing.oee.gradeLabel")}:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            {t("manufacturing.oee.gradeWorldClass")} ({"\u2265"}85%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            {t("manufacturing.oee.gradeAcceptable")} (70–85%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            {t("manufacturing.oee.gradeCritical")} (&lt;70%)
          </span>
        </div>

        {/* Machine Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {machines.map((m) => (
            <MachineCard key={m.machineId} machine={m} t={t} />
          ))}
        </div>

        {/* Formula Reference */}
        <div className="mt-4 bg-gray-900/40 rounded-xl border border-gray-800/30 px-6 py-4">
          <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-3">{t("manufacturing.oee.formulaReference")}</h4>
          <div className="grid grid-cols-4 gap-4 text-sm text-gray-400">
            <div>
              <span className="text-blue-400 font-mono font-bold">{t("manufacturing.oee.availability")}</span>
              <p className="text-xs text-gray-600 mt-1">{t("manufacturing.oee.formulaAvailability")}</p>
            </div>
            <div>
              <span className="text-purple-400 font-mono font-bold">{t("manufacturing.oee.performance")}</span>
              <p className="text-xs text-gray-600 mt-1">{t("manufacturing.oee.formulaPerformance")}</p>
            </div>
            <div>
              <span className="text-cyan-400 font-mono font-bold">{t("manufacturing.oee.quality")}</span>
              <p className="text-xs text-gray-600 mt-1">{t("manufacturing.oee.formulaQuality")}</p>
            </div>
            <div>
              <span className="text-white font-mono font-bold">OEE</span>
              <p className="text-xs text-gray-600 mt-1">{t("manufacturing.oee.formulaOee")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
