/**
 * UWB 车间实时定位看板 — Phase A
 * Dark-theme large-screen dashboard for factory floor UWB tracking.
 * STANDALONE page (no Layout wrapper).
 */

import { useState, useEffect, useMemo } from "react";
import FloatingNav from '@/components/FloatingNav';
import { CameraFeedView } from "@/components/camera/CameraFeedView";

// ==================== Demo Data ====================

interface Zone {
  id: string;
  name: string;
  nameEn: string;
  x: number;
  y: number;
  w: number;
  h: number;
  maxCapacity: number;
  color: string;
}

interface WorkerDot {
  id: string;
  name: string;
  zoneId: string;
  x: number;
  y: number;
  battery: number;
}

interface AGVDot {
  id: string;
  zoneId: string;
  x: number;
  y: number;
}

interface MaterialDot {
  id: string;
  zoneId: string;
  x: number;
  y: number;
  label: string;
}

interface AlertItem {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  time: string;
}

interface FlowArrow {
  from: string;
  to: string;
  count: number;
}

const ZONES: Zone[] = [
  { id: "input",       name: "原料暂存", nameEn: "Input",       x: 100,  y: 200,  w: 800,  h: 900,  maxCapacity: 10, color: "#3b82f6" },
  { id: "assembly-a",  name: "装配区A",  nameEn: "Assembly-A",  x: 1050, y: 200,  w: 1100, h: 900,  maxCapacity: 15, color: "#8b5cf6" },
  { id: "assembly-b",  name: "装配区B",  nameEn: "Assembly-B",  x: 2300, y: 200,  w: 1100, h: 900,  maxCapacity: 15, color: "#a855f7" },
  { id: "calibration", name: "标定区",   nameEn: "Calibration", x: 3550, y: 200,  w: 700,  h: 900,  maxCapacity: 6,  color: "#ec4899" },
  { id: "cleaning",    name: "清洗区",   nameEn: "Cleaning",    x: 100,  y: 1300, w: 800,  h: 900,  maxCapacity: 8,  color: "#14b8a6" },
  { id: "testing",     name: "测试区",   nameEn: "Testing",     x: 1050, y: 1300, w: 1100, h: 900,  maxCapacity: 12, color: "#f59e0b" },
  { id: "output",      name: "成品暂存", nameEn: "Output",      x: 2300, y: 1300, w: 1100, h: 900,  maxCapacity: 10, color: "#10b981" },
  { id: "shipping",    name: "发货区",   nameEn: "Shipping",    x: 3550, y: 1300, w: 700,  h: 900,  maxCapacity: 8,  color: "#06b6d4" },
];

function randInZone(zone: Zone): { x: number; y: number } {
  return {
    x: zone.x + 40 + Math.random() * (zone.w - 80),
    y: zone.y + 40 + Math.random() * (zone.h - 80),
  };
}

function generateWorkers(): WorkerDot[] {
  const names = [
    "吴卫成", "曹庆伟", "侯德朋", "张良", "赵强", "焦斌", "阎建华", "沈龙翔",
    "韩品来", "崔聪聪", "田坪珍", "沈富高", "强兵兵", "李明遂", "嵇国华", "王金涛",
    "孙淼", "张松松", "王犇", "王勇", "杨之雲", "殷小勇", "陈成成", "张超", "李兴伟",
  ];
  const zoneAssignment = [
    "input", "input", "input",
    "assembly-a", "assembly-a", "assembly-a", "assembly-a", "assembly-a",
    "assembly-b", "assembly-b", "assembly-b", "assembly-b",
    "calibration", "calibration",
    "cleaning", "cleaning", "cleaning",
    "testing", "testing", "testing", "testing",
    "output", "output",
    "shipping", "shipping",
  ];
  return names.map((name, i) => {
    const zoneId = zoneAssignment[i] || "input";
    const zone = ZONES.find((z) => z.id === zoneId)!;
    const pos = randInZone(zone);
    return {
      id: `W-${String(i + 1).padStart(3, "0")}`,
      name,
      zoneId,
      x: pos.x,
      y: pos.y,
      battery: 15 + Math.floor(Math.random() * 85),
    };
  });
}

function generateAGVs(): AGVDot[] {
  const agvZones = ["assembly-a", "testing", "shipping"];
  return agvZones.map((zoneId, i) => {
    const zone = ZONES.find((z) => z.id === zoneId)!;
    const pos = randInZone(zone);
    return { id: `AGV-${i + 1}`, zoneId, x: pos.x, y: pos.y };
  });
}

function generateMaterials(): MaterialDot[] {
  const matEntries: Array<{ zoneId: string; label: string }> = [
    { zoneId: "input", label: "铝锭-A01" },
    { zoneId: "input", label: "铝锭-A02" },
    { zoneId: "assembly-a", label: "半成品-B01" },
    { zoneId: "assembly-b", label: "半成品-B02" },
    { zoneId: "cleaning", label: "待清洗-C01" },
    { zoneId: "testing", label: "待测-D01" },
    { zoneId: "output", label: "成品-E01" },
    { zoneId: "shipping", label: "待发-F01" },
  ];
  return matEntries.map((m, i) => {
    const zone = ZONES.find((z) => z.id === m.zoneId)!;
    const pos = randInZone(zone);
    return { id: `MAT-${i + 1}`, zoneId: m.zoneId, x: pos.x, y: pos.y, label: m.label };
  });
}

const DEMO_ALERTS: AlertItem[] = [
  { id: "a1", severity: "critical", message: "标签 W-007 电量严重不足 (5%)", time: "14:32:10" },
  { id: "a2", severity: "warning",  message: "标签 W-018 电量低 (15%)", time: "14:28:45" },
  { id: "a3", severity: "critical", message: "标签 W-012 信号丢失超过30分钟", time: "14:25:03" },
  { id: "a4", severity: "warning",  message: "装配区A 人数接近上限 (14/15)", time: "14:20:17" },
  { id: "a5", severity: "info",     message: "AGV-2 完成测试区→发货区转运", time: "14:15:50" },
];

const DEMO_FLOWS: FlowArrow[] = [
  { from: "原料暂存", to: "装配区", count: 12 },
  { from: "装配区",   to: "清洗区", count: 9 },
  { from: "清洗区",   to: "测试区", count: 7 },
  { from: "测试区",   to: "成品暂存", count: 6 },
  { from: "成品暂存", to: "发货区", count: 4 },
];

const CAMERA_ZONES = [
  { zoneId: "assembly-a", label: "装配区A", cameraId: 1 },
  { zoneId: "assembly-b", label: "装配区B", cameraId: 2 },
  { zoneId: "testing",    label: "测试区",  cameraId: 3 },
  { zoneId: "shipping",   label: "发货区",  cameraId: 4 },
];

// ==================== Severity helpers ====================

const SEVERITY_ICON: Record<AlertItem["severity"], string> = {
  critical: "\uD83D\uDD34",
  warning:  "\uD83D\uDFE1",
  info:     "\uD83D\uDD35",
};

function statusBadge(current: number, max: number) {
  const ratio = current / max;
  if (ratio >= 1) return { text: "CRITICAL", cls: "bg-red-600 text-white" };
  if (ratio >= 0.8) return { text: "WARNING", cls: "bg-yellow-600 text-black" };
  return { text: "OK", cls: "bg-emerald-600 text-white" };
}

// ==================== Main Component ====================

export default function UWBShopfloorDashboard() {
  const [clock, setClock] = useState(new Date());
  const [alertScroll, setAlertScroll] = useState(0);

  // Refresh clock every second
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Alert ticker scroll
  useEffect(() => {
    const t = setInterval(() => setAlertScroll((s) => s + 1), 80);
    return () => clearInterval(t);
  }, []);

  // Generate demo data once (stable across re-renders via useMemo with empty deps)
  const workers = useMemo(() => generateWorkers(), []);
  const agvs = useMemo(() => generateAGVs(), []);
  const materials = useMemo(() => generateMaterials(), []);

  // Compute zone occupancy from demo data
  const zoneOccupancy = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of workers) counts[w.zoneId] = (counts[w.zoneId] || 0) + 1;
    return ZONES.map((z) => ({
      ...z,
      current: counts[z.id] || 0,
    }));
  }, [workers]);

  const onlineTagCount = workers.length + agvs.length + materials.length;
  const totalTagCount = onlineTagCount + 5; // 5 offline
  const totalAlerts = DEMO_ALERTS.filter((a) => a.severity !== "info").length;

  const clockStr = clock.toLocaleTimeString("zh-CN", { hour12: false });
  const dateStr = clock.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
      {/* ==================== Header ==================== */}
      <header className="h-16 flex items-center justify-between px-6 bg-slate-900/80 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-xl font-bold tracking-wide">GRT UWB 车间实时定位看板</h1>
        </div>
        <div className="flex items-center gap-8 text-lg">
          <span className="text-slate-300">{dateStr}</span>
          <span className="font-mono text-emerald-400 text-xl tabular-nums">{clockStr}</span>
          <span>
            在线标签:{" "}
            <span className="text-emerald-400 font-bold">{onlineTagCount}</span>
            <span className="text-slate-400">/{totalTagCount}</span>
          </span>
          <span>
            告警:{" "}
            <span className={totalAlerts > 0 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
              {totalAlerts}
            </span>
          </span>
        </div>
      </header>

      {/* ==================== Main Content ==================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left 70%: SVG Floor Map + Bottom Alert Ticker */}
        <div className="w-[70%] flex flex-col">
          {/* SVG Map */}
          <div className="flex-1 p-2 overflow-hidden">
            <svg
              viewBox="0 0 4500 2500"
              className="w-full h-full"
              style={{ background: "radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)" }}
            >
              {/* Grid lines */}
              {Array.from({ length: 46 }, (_, i) => (
                <line
                  key={`vg-${i}`}
                  x1={i * 100}
                  y1={0}
                  x2={i * 100}
                  y2={2500}
                  stroke="#1e293b"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: 26 }, (_, i) => (
                <line
                  key={`hg-${i}`}
                  x1={0}
                  y1={i * 100}
                  x2={4500}
                  y2={i * 100}
                  stroke="#1e293b"
                  strokeWidth={1}
                />
              ))}

              {/* Zones */}
              {ZONES.map((zone) => {
                const occ = zoneOccupancy.find((z) => z.id === zone.id);
                const density = occ ? occ.current / zone.maxCapacity : 0;
                const opacity = 0.15 + Math.min(density, 1) * 0.45;
                return (
                  <g key={zone.id}>
                    <rect
                      x={zone.x}
                      y={zone.y}
                      width={zone.w}
                      height={zone.h}
                      rx={16}
                      ry={16}
                      fill={zone.color}
                      fillOpacity={opacity}
                      stroke={zone.color}
                      strokeWidth={2}
                      strokeOpacity={0.6}
                    />
                    {/* Zone label */}
                    <text
                      x={zone.x + zone.w / 2}
                      y={zone.y + zone.h / 2 - 20}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize={42}
                      fontWeight="bold"
                    >
                      {zone.name}
                    </text>
                    <text
                      x={zone.x + zone.w / 2}
                      y={zone.y + zone.h / 2 + 25}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize={30}
                    >
                      {zone.nameEn}
                    </text>
                    {/* Occupancy badge */}
                    <text
                      x={zone.x + zone.w - 20}
                      y={zone.y + 40}
                      textAnchor="end"
                      fill={density >= 1 ? "#ef4444" : density >= 0.8 ? "#f59e0b" : "#22c55e"}
                      fontSize={28}
                      fontWeight="bold"
                    >
                      {occ?.current || 0}/{zone.maxCapacity}
                    </text>
                  </g>
                );
              })}

              {/* Worker dots — blue circles */}
              {workers.map((w) => (
                <g key={w.id}>
                  <circle cx={w.x} cy={w.y} r={14} fill="#3b82f6" fillOpacity={0.85} />
                  <circle cx={w.x} cy={w.y} r={14} fill="none" stroke="#60a5fa" strokeWidth={2} />
                </g>
              ))}

              {/* AGV dots — green triangles */}
              {agvs.map((a) => {
                const s = 18;
                const points = `${a.x},${a.y - s} ${a.x - s},${a.y + s} ${a.x + s},${a.y + s}`;
                return (
                  <g key={a.id}>
                    <polygon points={points} fill="#22c55e" fillOpacity={0.9} />
                    <polygon points={points} fill="none" stroke="#4ade80" strokeWidth={2} />
                    <text x={a.x} y={a.y + s + 22} textAnchor="middle" fill="#4ade80" fontSize={20}>
                      {a.id}
                    </text>
                  </g>
                );
              })}

              {/* Material dots — orange squares */}
              {materials.map((m) => (
                <g key={m.id}>
                  <rect
                    x={m.x - 12}
                    y={m.y - 12}
                    width={24}
                    height={24}
                    rx={4}
                    fill="#f97316"
                    fillOpacity={0.85}
                  />
                  <rect
                    x={m.x - 12}
                    y={m.y - 12}
                    width={24}
                    height={24}
                    rx={4}
                    fill="none"
                    stroke="#fb923c"
                    strokeWidth={2}
                  />
                </g>
              ))}

              {/* Legend */}
              <g transform="translate(100, 2380)">
                <circle cx={0} cy={0} r={10} fill="#3b82f6" />
                <text x={18} y={6} fill="#94a3b8" fontSize={22}>工人</text>
                <polygon points="80,0 68,14 92,14" fill="#22c55e" />
                <text x={100} y={6} fill="#94a3b8" fontSize={22}>AGV</text>
                <rect x={165} y={-8} width={16} height={16} rx={3} fill="#f97316" />
                <text x={188} y={6} fill="#94a3b8" fontSize={22}>物料</text>
              </g>
            </svg>
          </div>

          {/* Bottom Alert Ticker */}
          <div className="h-14 bg-slate-900/60 border-t border-slate-800 flex items-center overflow-hidden px-4 shrink-0">
            <span className="text-red-400 font-bold text-lg mr-4 shrink-0">ALERTS</span>
            <div className="overflow-hidden flex-1 relative">
              <div
                className="flex gap-12 whitespace-nowrap transition-none"
                style={{ transform: `translateX(-${alertScroll % 2000}px)` }}
              >
                {/* Repeat alerts for seamless scroll */}
                {[...DEMO_ALERTS, ...DEMO_ALERTS, ...DEMO_ALERTS].map((alert, i) => (
                  <span key={`${alert.id}-${i}`} className="text-lg inline-flex items-center gap-2">
                    <span>{SEVERITY_ICON[alert.severity]}</span>
                    <span className="text-slate-300">[{alert.time}]</span>
                    <span className={
                      alert.severity === "critical" ? "text-red-400" :
                      alert.severity === "warning" ? "text-yellow-400" :
                      "text-blue-400"
                    }>
                      {alert.message}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 30% */}
        <div className="w-[30%] flex flex-col border-l border-slate-800">
          {/* Top: Zone Occupancy Table */}
          <div className="h-1/3 p-4 overflow-auto border-b border-slate-800">
            <h2 className="text-lg font-bold mb-3 text-slate-300">区域占用状态</h2>
            <table className="w-full text-lg">
              <thead>
                <tr className="text-slate-400 text-sm border-b border-slate-800">
                  <th className="text-left py-1 font-medium">区域</th>
                  <th className="text-center py-1 font-medium">人数</th>
                  <th className="text-center py-1 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {zoneOccupancy.map((z) => {
                  const badge = statusBadge(z.current, z.maxCapacity);
                  return (
                    <tr key={z.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-1.5 text-slate-200">{z.name}</td>
                      <td className="py-1.5 text-center font-mono">
                        <span className="text-slate-100">{z.current}</span>
                        <span className="text-slate-400">/{z.maxCapacity}</span>
                      </td>
                      <td className="py-1.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${badge.cls}`}>
                          {badge.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Middle: Material Flow */}
          <div className="h-1/3 p-4 overflow-auto border-b border-slate-800">
            <h2 className="text-lg font-bold mb-3 text-slate-300">物料流转</h2>
            <div className="space-y-3">
              {DEMO_FLOWS.map((flow, i) => (
                <div key={i} className="flex items-center gap-2 text-lg">
                  <span className="text-slate-200 min-w-[80px] text-right">{flow.from}</span>
                  <div className="flex-1 flex items-center">
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500" />
                    <svg width="16" height="12" className="shrink-0 text-emerald-400">
                      <polygon points="0,0 16,6 0,12" fill="currentColor" />
                    </svg>
                  </div>
                  <span className="text-slate-200 min-w-[80px]">{flow.to}</span>
                  <span className="text-emerald-400 font-bold min-w-[36px] text-right">{flow.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Camera Quick View */}
          <div className="h-1/3 p-4 overflow-auto">
            <h2 className="text-lg font-bold mb-3 text-slate-300">摄像头快览</h2>
            <div className="grid grid-cols-2 gap-2 h-[calc(100%-36px)]">
              {CAMERA_ZONES.map((cam) => (
                <div
                  key={cam.cameraId}
                  className="bg-slate-900 rounded border border-slate-700 flex flex-col overflow-hidden"
                >
                  <div className="flex-1 min-h-0">
                    <CameraFeedView
                      cameraId={cam.cameraId}
                      showControls={false}
                    />
                  </div>
                  <div className="px-2 py-1 text-xs text-slate-300 bg-slate-900/80 border-t border-slate-800 truncate">
                    {cam.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <FloatingNav />
    </div>
  );
}
