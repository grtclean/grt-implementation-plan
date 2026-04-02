/**
 * AGV 车间物流看板 — Dark-theme STANDALONE large-screen dashboard
 * Real-time AGV fleet tracking, task queue, battery status, alerts, and material flow.
 * STANDALONE page (no Layout wrapper).
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import FloatingNav from '@/components/FloatingNav';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface Zone {
  id: string;
  name: string;
  nameEn: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

interface AGV {
  id: string;
  code: string;
  status: "idle" | "transporting" | "charging" | "fault";
  battery: number;
  x: number;
  y: number;
  heading: number; // degrees
  zoneId: string;
  taskCode: string | null;
  destination: string | null;
  speed: number; // m/min
}

interface AGVRoute {
  id: string;
  fromZone: string;
  toZone: string;
  active: boolean;
  waypoints: Array<{ x: number; y: number }>;
}

interface TaskItem {
  code: string;
  type: "pickup" | "delivery" | "return" | "charging";
  from: string;
  to: string;
  priority: "high" | "medium" | "low";
  status: "queued" | "active" | "completed";
  agvId: string | null;
}

interface AlertItem {
  id: string;
  level: "red" | "yellow" | "blue";
  message: string;
  time: string;
}

interface ChargingStation {
  id: string;
  x: number;
  y: number;
  status: "available" | "occupied" | "maintenance";
}

// ═══════════════════════════════════════════════════════════
// Factory Zones (same as UWBShopfloorDashboard)
// ═══════════════════════════════════════════════════════════

const ZONES: Zone[] = [
  { id: "input",       name: "原料暂存", nameEn: "Input",       x: 100,  y: 200,  w: 800,  h: 900,  color: "#3b82f6" },
  { id: "assembly-a",  name: "装配区A",  nameEn: "Assembly-A",  x: 1050, y: 200,  w: 1100, h: 900,  color: "#8b5cf6" },
  { id: "assembly-b",  name: "装配区B",  nameEn: "Assembly-B",  x: 2300, y: 200,  w: 1100, h: 900,  color: "#a855f7" },
  { id: "calibration", name: "标定区",   nameEn: "Calibration", x: 3550, y: 200,  w: 700,  h: 900,  color: "#ec4899" },
  { id: "cleaning",    name: "清洗区",   nameEn: "Cleaning",    x: 100,  y: 1300, w: 800,  h: 900,  color: "#14b8a6" },
  { id: "testing",     name: "测试区",   nameEn: "Testing",     x: 1050, y: 1300, w: 1100, h: 900,  color: "#f59e0b" },
  { id: "output",      name: "成品暂存", nameEn: "Output",      x: 2300, y: 1300, w: 1100, h: 900,  color: "#10b981" },
  { id: "shipping",    name: "发货区",   nameEn: "Shipping",    x: 3550, y: 1300, w: 700,  h: 900,  color: "#06b6d4" },
];

function zoneCenter(zoneId: string): { x: number; y: number } {
  const z = ZONES.find((z) => z.id === zoneId);
  if (!z) return { x: 0, y: 0 };
  return { x: z.x + z.w / 2, y: z.y + z.h / 2 };
}

function randInZone(zone: Zone): { x: number; y: number } {
  return {
    x: zone.x + 60 + Math.random() * (zone.w - 120),
    y: zone.y + 60 + Math.random() * (zone.h - 120),
  };
}

// ═══════════════════════════════════════════════════════════
// Demo Data Generators
// ═══════════════════════════════════════════════════════════

function generateAGVs(): AGV[] {
  const defs: Array<{ code: string; status: AGV["status"]; zoneId: string; battery: number; taskCode: string | null; destination: string | null }> = [
    { code: "AGV-001", status: "transporting", zoneId: "assembly-a", battery: 78, taskCode: "TASK-043", destination: "装配区B" },
    { code: "AGV-002", status: "transporting", zoneId: "testing",     battery: 62, taskCode: "TASK-045", destination: "成品暂存" },
    { code: "AGV-003", status: "idle",         zoneId: "input",       battery: 15, taskCode: null,        destination: null },
    { code: "AGV-004", status: "idle",         zoneId: "output",      battery: 91, taskCode: null,        destination: null },
    { code: "AGV-005", status: "charging",     zoneId: "cleaning",    battery: 32, taskCode: null,        destination: null },
    { code: "AGV-006", status: "idle",         zoneId: "shipping",    battery: 85, taskCode: null,        destination: null },
  ];
  return defs.map((d, i) => {
    const zone = ZONES.find((z) => z.id === d.zoneId)!;
    const pos = randInZone(zone);
    return {
      id: `agv-${i}`,
      code: d.code,
      status: d.status,
      battery: d.battery,
      x: pos.x,
      y: pos.y,
      heading: Math.floor(Math.random() * 360),
      zoneId: d.zoneId,
      taskCode: d.taskCode,
      destination: d.destination,
      speed: d.status === "transporting" ? 30 + Math.floor(Math.random() * 20) : 0,
    };
  });
}

const DEMO_ROUTES: AGVRoute[] = [
  { id: "R-01", fromZone: "input",      toZone: "assembly-a", active: true,  waypoints: [{ x: 500, y: 650 }, { x: 800, y: 400 }, { x: 1600, y: 650 }] },
  { id: "R-02", fromZone: "assembly-a", toZone: "assembly-b", active: true,  waypoints: [{ x: 1600, y: 650 }, { x: 1900, y: 500 }, { x: 2850, y: 650 }] },
  { id: "R-03", fromZone: "testing",    toZone: "output",     active: true,  waypoints: [{ x: 1600, y: 1750 }, { x: 2000, y: 1600 }, { x: 2850, y: 1750 }] },
  { id: "R-04", fromZone: "assembly-b", toZone: "cleaning",   active: false, waypoints: [{ x: 2850, y: 650 }, { x: 2200, y: 1100 }, { x: 500, y: 1750 }] },
  { id: "R-05", fromZone: "cleaning",   toZone: "testing",    active: false, waypoints: [{ x: 500, y: 1750 }, { x: 800, y: 1600 }, { x: 1600, y: 1750 }] },
  { id: "R-06", fromZone: "output",     toZone: "shipping",   active: false, waypoints: [{ x: 2850, y: 1750 }, { x: 3200, y: 1600 }, { x: 3900, y: 1750 }] },
];

const DEMO_TASKS: TaskItem[] = [
  { code: "TASK-041", type: "delivery",  from: "原料暂存", to: "装配区A", priority: "high",   status: "completed", agvId: null },
  { code: "TASK-042", type: "pickup",    from: "装配区A",  to: "装配区B", priority: "medium", status: "completed", agvId: null },
  { code: "TASK-043", type: "delivery",  from: "装配区A",  to: "装配区B", priority: "high",   status: "active",    agvId: "AGV-001" },
  { code: "TASK-044", type: "return",    from: "测试区",   to: "清洗区",  priority: "low",    status: "queued",    agvId: null },
  { code: "TASK-045", type: "delivery",  from: "测试区",   to: "成品暂存", priority: "high",  status: "active",    agvId: "AGV-002" },
  { code: "TASK-046", type: "charging",  from: "清洗区",   to: "充电站CS-01", priority: "low", status: "queued",   agvId: null },
  { code: "TASK-047", type: "delivery",  from: "成品暂存", to: "发货区",  priority: "medium", status: "queued",    agvId: null },
  { code: "TASK-048", type: "pickup",    from: "原料暂存", to: "装配区A", priority: "medium", status: "queued",    agvId: null },
];

const DEMO_ALERTS: AlertItem[] = [
  { id: "a1", level: "red",    message: "AGV-003 低电量 15%",           time: "14:32" },
  { id: "a2", level: "yellow", message: "路线 R-05 拥堵 (2/1 AGV)",     time: "14:28" },
  { id: "a3", level: "yellow", message: "TASK-047 配送超时 +5min",       time: "14:25" },
  { id: "a4", level: "blue",   message: "充电站 CS-02 维护中",           time: "14:10" },
];

const CHARGING_STATIONS: ChargingStation[] = [
  { id: "CS-01", x: 300,  y: 1500, status: "occupied" },
  { id: "CS-02", x: 3700, y: 1500, status: "maintenance" },
];

const SANKEY_NODES = [
  { name: "原料库", count: 15 },
  { name: "装配区A", count: 8 },
  { name: "装配区B", count: 7 },
  { name: "清洗区", count: 12 },
  { name: "测试区", count: 10 },
  { name: "成品库", count: 9 },
];

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function statusColor(s: AGV["status"]): string {
  switch (s) {
    case "idle":         return "#22c55e";
    case "transporting": return "#3b82f6";
    case "charging":     return "#eab308";
    case "fault":        return "#ef4444";
  }
}

function statusLabel(s: AGV["status"]): string {
  switch (s) {
    case "idle":         return "空闲";
    case "transporting": return "运输中";
    case "charging":     return "充电中";
    case "fault":        return "故障";
  }
}

function taskTypeBadge(t: TaskItem["type"]): { label: string; bg: string; text: string } {
  switch (t) {
    case "pickup":   return { label: "取件", bg: "bg-blue-900/60",   text: "text-blue-300" };
    case "delivery": return { label: "配送", bg: "bg-green-900/60",  text: "text-green-300" };
    case "return":   return { label: "回收", bg: "bg-gray-700/60",   text: "text-gray-300" };
    case "charging": return { label: "充电", bg: "bg-yellow-900/60", text: "text-yellow-300" };
  }
}

function priorityBadge(p: TaskItem["priority"]): { label: string; cls: string } {
  switch (p) {
    case "high":   return { label: "高", cls: "bg-red-900/60 text-red-300" };
    case "medium": return { label: "中", cls: "bg-yellow-900/60 text-yellow-300" };
    case "low":    return { label: "低", cls: "bg-gray-700/60 text-gray-400" };
  }
}

function statusBadge(s: TaskItem["status"]): { label: string; cls: string } {
  switch (s) {
    case "queued":    return { label: "排队", cls: "bg-gray-700/60 text-gray-300" };
    case "active":    return { label: "进行中", cls: "bg-blue-900/60 text-blue-300" };
    case "completed": return { label: "完成", cls: "bg-green-900/60 text-green-300" };
  }
}

function batteryColor(pct: number): string {
  if (pct > 50) return "#22c55e";
  if (pct > 20) return "#eab308";
  return "#ef4444";
}

function alertBorder(level: AlertItem["level"]): string {
  switch (level) {
    case "red":    return "border-red-500";
    case "yellow": return "border-yellow-500";
    case "blue":   return "border-blue-500";
  }
}

function alertBg(level: AlertItem["level"]): string {
  switch (level) {
    case "red":    return "bg-red-950/40";
    case "yellow": return "bg-yellow-950/40";
    case "blue":   return "bg-blue-950/40";
  }
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function AGVLogisticsDashboard() {
  const [clock, setClock] = useState(new Date());
  const [agvs, setAgvs] = useState<AGV[]>(() => generateAGVs());
  const [selectedAgv, setSelectedAgv] = useState<AGV | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // 1-second clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 10-second auto-refresh (simulate movement)
  useEffect(() => {
    const t = setInterval(() => {
      setAgvs((prev) =>
        prev.map((a) => {
          const zone = ZONES.find((z) => z.id === a.zoneId)!;
          const dx = (Math.random() - 0.5) * 60;
          const dy = (Math.random() - 0.5) * 60;
          const nx = Math.max(zone.x + 40, Math.min(zone.x + zone.w - 40, a.x + dx));
          const ny = Math.max(zone.y + 40, Math.min(zone.y + zone.h - 40, a.y + dy));
          const heading = Math.atan2(ny - a.y, nx - a.x) * (180 / Math.PI);
          return {
            ...a,
            x: nx,
            y: ny,
            heading: isNaN(heading) ? a.heading : heading,
            battery: Math.max(0, a.battery + (a.status === "charging" ? 1 : a.status === "transporting" ? -0.2 : 0)),
          };
        })
      );
      setRefreshTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const fleetSummary = useMemo(() => {
    const idle = agvs.filter((a) => a.status === "idle").length;
    const transporting = agvs.filter((a) => a.status === "transporting").length;
    const charging = agvs.filter((a) => a.status === "charging").length;
    const fault = agvs.filter((a) => a.status === "fault").length;
    return { idle, transporting, charging, fault };
  }, [agvs]);

  const completedTasks = DEMO_TASKS.filter((t) => t.status === "completed").length;
  const activeTasks = DEMO_TASKS.filter((t) => t.status === "active").length;

  const handleAgvClick = useCallback((agv: AGV) => {
    setSelectedAgv((prev) => (prev?.id === agv.id ? null : agv));
  }, []);

  const timeStr = clock.toLocaleTimeString("zh-CN", { hour12: false });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* ── Header ── */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <circle cx="7" cy="18" r="1.5" fill="currentColor" />
            <circle cx="17" cy="18" r="1.5" fill="currentColor" />
            <path d="M3 10h18" />
          </svg>
          <span className="text-lg font-bold tracking-wide">GRT AGV 车间物流看板</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span className="font-mono text-green-400">{timeStr}</span>
          <span className="text-gray-500">|</span>
          <span>
            车队:
            <span className="text-green-400 ml-1">空闲{fleetSummary.idle}</span>/
            <span className="text-blue-400">运输{fleetSummary.transporting}</span>/
            <span className="text-yellow-400">充电{fleetSummary.charging}</span>/
            <span className="text-red-400">故障{fleetSummary.fault}</span>
          </span>
          <span className="text-gray-500">|</span>
          <span>
            今日任务:
            <span className="text-green-400 ml-1">{47 + completedTasks}完成</span>/
            <span className="text-blue-400">{activeTasks + 3}进行中</span>
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Factory Floor Map (70%) ── */}
        <div className="w-[70%] p-3 relative">
          <svg
            viewBox="0 0 4500 2500"
            className="w-full h-full"
            style={{ background: "rgba(15, 23, 42, 0.6)" }}
          >
            {/* Grid lines */}
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`gv-${i}`} x1={i * 500} y1={0} x2={i * 500} y2={2500} stroke="#1e293b" strokeWidth={1} />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <line key={`gh-${i}`} x1={0} y1={i * 500} x2={4500} y2={i * 500} stroke="#1e293b" strokeWidth={1} />
            ))}

            {/* Zones */}
            {ZONES.map((z) => (
              <g key={z.id}>
                <rect
                  x={z.x} y={z.y} width={z.w} height={z.h}
                  rx={12}
                  fill={z.color}
                  fillOpacity={0.12}
                  stroke={z.color}
                  strokeWidth={2}
                  strokeOpacity={0.5}
                />
                <text x={z.x + z.w / 2} y={z.y + 40} textAnchor="middle" fill={z.color} fontSize={28} fontWeight="bold">
                  {z.name}
                </text>
                <text x={z.x + z.w / 2} y={z.y + 70} textAnchor="middle" fill="#64748b" fontSize={18}>
                  {z.nameEn}
                </text>
              </g>
            ))}

            {/* Routes */}
            {DEMO_ROUTES.map((r) => {
              const from = zoneCenter(r.fromZone);
              const to = zoneCenter(r.toZone);
              const pts = [from, ...r.waypoints, to];
              const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
              return (
                <path
                  key={r.id}
                  d={d}
                  fill="none"
                  stroke={r.active ? "#3b82f6" : "#374151"}
                  strokeWidth={r.active ? 4 : 2}
                  strokeDasharray={r.active ? "12 6" : "8 8"}
                  opacity={r.active ? 0.8 : 0.4}
                />
              );
            })}

            {/* Charging Stations */}
            {CHARGING_STATIONS.map((cs) => (
              <g key={cs.id}>
                <rect x={cs.x - 25} y={cs.y - 25} width={50} height={50} rx={8} fill="#854d0e" fillOpacity={0.5} stroke="#eab308" strokeWidth={2} />
                <text x={cs.x} y={cs.y + 6} textAnchor="middle" fill="#eab308" fontSize={28} fontWeight="bold">
                  &#9889;
                </text>
                <text x={cs.x} y={cs.y + 40} textAnchor="middle" fill="#94a3b8" fontSize={16}>
                  {cs.id}
                </text>
                {cs.status === "maintenance" && (
                  <text x={cs.x} y={cs.y - 35} textAnchor="middle" fill="#f87171" fontSize={14}>
                    维护中
                  </text>
                )}
              </g>
            ))}

            {/* AGVs */}
            {agvs.map((a) => {
              const sc = statusColor(a.status);
              return (
                <g
                  key={a.id}
                  onClick={() => handleAgvClick(a)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Body */}
                  <rect
                    x={a.x - 18}
                    y={a.y - 18}
                    width={36}
                    height={36}
                    rx={6}
                    fill={sc}
                    fillOpacity={0.85}
                    stroke={selectedAgv?.id === a.id ? "#ffffff" : sc}
                    strokeWidth={selectedAgv?.id === a.id ? 3 : 1}
                  />
                  {/* Direction arrow */}
                  <g transform={`translate(${a.x},${a.y}) rotate(${a.heading})`}>
                    <polygon points="0,-6 8,0 0,6" fill="#ffffff" fillOpacity={0.9} />
                  </g>
                  {/* Label */}
                  <text x={a.x} y={a.y - 26} textAnchor="middle" fill="#e2e8f0" fontSize={14} fontWeight="bold">
                    {a.code}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Selected AGV popup */}
          {selectedAgv && (
            <div className="absolute bottom-6 left-6 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl w-72 z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg">{selectedAgv.code}</span>
                <button onClick={() => setSelectedAgv(null)} className="text-gray-400 hover:text-gray-300 text-lg">&times;</button>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">状态</span>
                  <span style={{ color: statusColor(selectedAgv.status) }}>{statusLabel(selectedAgv.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">电量</span>
                  <span style={{ color: batteryColor(selectedAgv.battery) }}>{Math.round(selectedAgv.battery)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">当前任务</span>
                  <span>{selectedAgv.taskCode || "无"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">目的地</span>
                  <span>{selectedAgv.destination || "无"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">速度</span>
                  <span>{selectedAgv.speed} m/min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">区域</span>
                  <span>{ZONES.find((z) => z.id === selectedAgv.zoneId)?.name ?? selectedAgv.zoneId}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar (30%) ── */}
        <div className="w-[30%] bg-gray-900/60 border-l border-gray-800 flex flex-col overflow-hidden">
          {/* Task Queue (40%) */}
          <div className="h-[40%] border-b border-gray-800 flex flex-col">
            <div className="px-4 py-2 border-b border-gray-800 text-sm font-semibold text-gray-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              任务队列 ({DEMO_TASKS.length})
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {DEMO_TASKS.map((task) => {
                const tb = taskTypeBadge(task.type);
                const pb = priorityBadge(task.priority);
                const sb = statusBadge(task.status);
                return (
                  <div
                    key={task.code}
                    className={`p-2.5 rounded-lg border text-xs ${
                      task.status === "active"
                        ? "border-blue-700 bg-blue-950/30"
                        : "border-gray-800 bg-gray-900/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-gray-200">{task.code}</span>
                      <div className="flex gap-1">
                        <span className={`px-1.5 py-0.5 rounded ${tb.bg} ${tb.text}`}>{tb.label}</span>
                        <span className={`px-1.5 py-0.5 rounded ${pb.cls}`}>{pb.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">
                        {task.from} <span className="text-gray-500 mx-1">&rarr;</span> {task.to}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${sb.cls}`}>{sb.label}</span>
                    </div>
                    {task.agvId && (
                      <div className="mt-1 text-gray-400">AGV: {task.agvId}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Battery Status (30%) */}
          <div className="h-[30%] border-b border-gray-800 flex flex-col">
            <div className="px-4 py-2 border-b border-gray-800 text-sm font-semibold text-gray-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="1" y="6" width="18" height="12" rx="2" /><line x1="23" y1="13" x2="23" y2="11" /></svg>
              电量状态
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5">
              {agvs.map((a) => {
                const pct = Math.round(a.battery);
                const color = batteryColor(pct);
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <span className="text-xs font-mono w-16 text-gray-300">{a.code}</span>
                    <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="text-xs font-mono w-10 text-right" style={{ color }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts (30%) */}
          <div className="h-[30%] flex flex-col">
            <div className="px-4 py-2 border-b border-gray-800 text-sm font-semibold text-gray-300 flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              告警 ({DEMO_ALERTS.length})
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {DEMO_ALERTS.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-2.5 rounded-lg border-l-4 ${alertBorder(alert.level)} ${alertBg(alert.level)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-200">{alert.message}</span>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Strip: Material Flow Sankey ── */}
      <div className="h-24 bg-gray-900/70 border-t border-gray-800 flex items-center px-6 shrink-0">
        <span className="text-sm font-semibold text-gray-300 mr-6 whitespace-nowrap">物料流向</span>
        <div className="flex items-center flex-1 justify-center gap-0">
          {SANKEY_NODES.map((node, i) => {
            const maxCount = Math.max(...SANKEY_NODES.map((n) => n.count));
            const nextNode = SANKEY_NODES[i + 1];
            const arrowCount = nextNode ? Math.min(node.count, nextNode.count) : 0;
            const arrowThickness = arrowCount > 0 ? Math.max(4, (arrowCount / maxCount) * 24) : 0;
            return (
              <div key={node.name} className="flex items-center">
                {/* Node */}
                <div className="flex flex-col items-center">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-center min-w-[80px]">
                    <div className="text-xs text-gray-300 font-medium">{node.name}</div>
                    <div className="text-lg font-bold text-green-400">{node.count}</div>
                  </div>
                </div>
                {/* Arrow */}
                {i < SANKEY_NODES.length - 1 && (
                  <div className="mx-1 flex items-center">
                    <div
                      className="rounded-full"
                      style={{
                        width: 48,
                        height: arrowThickness,
                        background: `linear-gradient(90deg, #3b82f6, #06b6d4)`,
                        opacity: 0.7,
                      }}
                    />
                    <svg className="w-4 h-4 text-cyan-400 -ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 6l6 6-6 6V6z" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <span className="text-xs text-gray-400 ml-6 whitespace-nowrap">今日搬运次数</span>
      </div>
      <FloatingNav />
    </div>
  );
}
