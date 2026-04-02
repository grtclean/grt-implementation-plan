/**
 * AGV 车间物流沙盘 — 4-Tab Sandbox Page
 * Tab 1: 路径规划 (Route Planning)
 * Tab 2: 任务模拟 (Task Simulation)
 * Tab 3: 充电策略 (Charging Strategy)
 * Tab 4: 容量分析 (Capacity Analysis)
 */

import { useState, useMemo, useCallback } from "react";
import {
  Truck, Route, Play, BatteryCharging, BarChart3,
  Plus, Save, Trash2, Zap, Clock, MapPin,
  AlertTriangle, CheckCircle, ArrowRight, Settings,
  Calculator, TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface ZoneOption {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

interface Waypoint {
  id: string;
  x: number;
  y: number;
}

interface DemoRoute {
  id: string;
  from: string;
  to: string;
  distance: number;
  time: number;
  active: boolean;
  waypoints: Waypoint[];
}

interface SimResult {
  avgWait: number;
  bottleneckZone: string;
  bottleneckQueued: number;
  avgDelivery: number;
  collisionRisks: number;
  collisionDetail: string;
}

// ═══════════════════════════════════════════════════════════
// Demo Data
// ═══════════════════════════════════════════════════════════

const ZONES: ZoneOption[] = [
  { id: "input",       name: "原料暂存", x: 20,  y: 40,  w: 140, h: 140, color: "#3b82f6" },
  { id: "assembly-a",  name: "装配区A",  x: 200, y: 40,  w: 160, h: 140, color: "#8b5cf6" },
  { id: "assembly-b",  name: "装配区B",  x: 400, y: 40,  w: 160, h: 140, color: "#a855f7" },
  { id: "calibration", name: "标定区",   x: 600, y: 40,  w: 140, h: 140, color: "#ec4899" },
  { id: "cleaning",    name: "清洗区",   x: 20,  y: 220, w: 140, h: 140, color: "#14b8a6" },
  { id: "testing",     name: "测试区",   x: 200, y: 220, w: 160, h: 140, color: "#f59e0b" },
  { id: "output",      name: "成品暂存", x: 400, y: 220, w: 160, h: 140, color: "#10b981" },
  { id: "shipping",    name: "发货区",   x: 600, y: 220, w: 140, h: 140, color: "#06b6d4" },
];

const INITIAL_ROUTES: DemoRoute[] = [
  { id: "R-01", from: "input",      to: "assembly-a", distance: 32.5, time: 65,  active: true,  waypoints: [{ id: "w1", x: 100, y: 110 }, { id: "w2", x: 160, y: 80 }, { id: "w3", x: 230, y: 110 }] },
  { id: "R-02", from: "assembly-a", to: "assembly-b", distance: 28.0, time: 56,  active: true,  waypoints: [{ id: "w4", x: 310, y: 80 }, { id: "w5", x: 360, y: 60 }, { id: "w6", x: 430, y: 80 }] },
  { id: "R-03", from: "assembly-b", to: "cleaning",   distance: 55.8, time: 112, active: true,  waypoints: [{ id: "w7", x: 480, y: 160 }, { id: "w8", x: 300, y: 200 }, { id: "w9", x: 90, y: 290 }] },
  { id: "R-04", from: "cleaning",   to: "testing",    distance: 25.3, time: 51,  active: true,  waypoints: [{ id: "w10", x: 120, y: 280 }, { id: "w11", x: 160, y: 300 }, { id: "w12", x: 250, y: 290 }] },
  { id: "R-05", from: "testing",    to: "output",     distance: 30.1, time: 60,  active: false, waypoints: [{ id: "w13", x: 320, y: 300 }, { id: "w14", x: 380, y: 280 }, { id: "w15", x: 440, y: 290 }] },
  { id: "R-06", from: "output",     to: "shipping",   distance: 28.7, time: 57,  active: false, waypoints: [{ id: "w16", x: 520, y: 300 }, { id: "w17", x: 580, y: 280 }, { id: "w18", x: 650, y: 290 }] },
];

const SHIFTS = [
  { name: "早班", nameEn: "Morning", start: 6, end: 14, demand: 80 },
  { name: "中班", nameEn: "Afternoon", start: 14, end: 22, demand: 95 },
  { name: "夜班", nameEn: "Night", start: 22, end: 6, demand: 40 },
];

const AGV_CODES = ["AGV-001", "AGV-002", "AGV-003", "AGV-004", "AGV-005", "AGV-006"];

// Pre-built 24h schedule for 6 AGVs: "working" | "charging" | "idle"
function buildSchedule(): Record<string, string[]> {
  const schedule: Record<string, string[]> = {};
  AGV_CODES.forEach((code, i) => {
    const row: string[] = [];
    for (let h = 0; h < 24; h++) {
      if (i < 3) {
        // Group A: charge 12-13
        if (h === 12) row.push("charging");
        else if (h >= 6 && h < 22) row.push("working");
        else row.push("idle");
      } else {
        // Group B: charge 18-19
        if (h === 18) row.push("charging");
        else if (h >= 6 && h < 22) row.push("working");
        else row.push("idle");
      }
    }
    schedule[code] = row;
  });
  return schedule;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function AGVLogisticsSandbox() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: "路径规划", icon: Route },
    { label: "任务模拟", icon: Play },
    { label: "充电策略", icon: BatteryCharging },
    { label: "容量分析", icon: BarChart3 },
  ];

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-7 w-7" /> AGV 车间物流沙盘
        </h1>
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">SB 沙盘</Badge>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          return (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === i
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 0 && <RoutePlanningTab />}
      {activeTab === 1 && <TaskSimulationTab />}
      {activeTab === 2 && <ChargingStrategyTab />}
      {activeTab === 3 && <CapacityAnalysisTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 1: 路径规划
// ═══════════════════════════════════════════════════════════

function RoutePlanningTab() {
  const [routes, setRoutes] = useState<DemoRoute[]>(INITIAL_ROUTES);
  const [fromZone, setFromZone] = useState("input");
  const [toZone, setToZone] = useState("assembly-a");

  const fromZ = ZONES.find((z) => z.id === fromZone)!;
  const toZ = ZONES.find((z) => z.id === toZone)!;
  const dist = Math.sqrt(Math.pow(fromZ.x + fromZ.w / 2 - (toZ.x + toZ.w / 2), 2) + Math.pow(fromZ.y + fromZ.h / 2 - (toZ.y + toZ.h / 2), 2)) * 0.15;
  const estTime = Math.round(dist / 0.5);

  const toggleRoute = useCallback((id: string) => {
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: SVG Map */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> 工厂平面图</CardTitle>
        </CardHeader>
        <CardContent>
          <svg viewBox="0 0 800 400" className="w-full border rounded-lg bg-muted/30">
            {ZONES.map((z) => (
              <g key={z.id}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={6} fill={z.color} fillOpacity={0.15} stroke={z.color} strokeWidth={1.5} />
                <text x={z.x + z.w / 2} y={z.y + z.h / 2 + 4} textAnchor="middle" fill={z.color} fontSize={11} fontWeight="bold">{z.name}</text>
              </g>
            ))}
            {/* Routes */}
            {routes.filter((r) => r.active).map((r) => {
              const fz = ZONES.find((z) => z.id === r.from)!;
              const tz = ZONES.find((z) => z.id === r.to)!;
              const pts = [
                { x: fz.x + fz.w / 2, y: fz.y + fz.h / 2 },
                ...r.waypoints,
                { x: tz.x + tz.w / 2, y: tz.y + tz.h / 2 },
              ];
              const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
              return (
                <path key={r.id} d={d} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3" opacity={0.7} />
              );
            })}
            {/* Highlighted from/to */}
            <circle cx={fromZ.x + fromZ.w / 2} cy={fromZ.y + fromZ.h / 2} r={8} fill="#22c55e" fillOpacity={0.6} stroke="#22c55e" strokeWidth={2} />
            <circle cx={toZ.x + toZ.w / 2} cy={toZ.y + toZ.h / 2} r={8} fill="#ef4444" fillOpacity={0.6} stroke="#ef4444" strokeWidth={2} />
          </svg>
        </CardContent>
      </Card>

      {/* Right: Route Editor + Table */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Route className="h-4 w-4" /> 路径编辑器</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">起点区域</label>
                <select
                  value={fromZone}
                  onChange={(e) => setFromZone(e.target.value)}
                  className="w-full h-9 px-3 border rounded-md text-sm bg-background"
                >
                  {ZONES.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">终点区域</label>
                <select
                  value={toZone}
                  onChange={(e) => setToZone(e.target.value)}
                  className="w-full h-9 px-3 border rounded-md text-sm bg-background"
                >
                  {ZONES.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
            </div>
            {/* Demo waypoints */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">途经点 (Waypoints)</label>
              <div className="space-y-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-2 py-1">
                    <span className="text-muted-foreground">WP-{i}</span>
                    <span>x: {Math.round(dist * i * 2.2 + 50)}</span>
                    <span>y: {Math.round(150 + Math.sin(i) * 40)}</span>
                    <button className="ml-auto text-destructive hover:text-destructive/80"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full">
                <Plus className="h-3 w-3 mr-1" /> Add Waypoint
              </Button>
            </div>
            <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
              <span className="text-muted-foreground">距离: <strong className="text-foreground">{dist.toFixed(1)}m</strong></span>
              <span className="text-muted-foreground">预计: <strong className="text-foreground">{estTime}秒</strong></span>
            </div>
            <Button className="w-full">
              <Save className="h-4 w-4 mr-2" /> Save Route
            </Button>
          </CardContent>
        </Card>

        {/* Route list table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">路线列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-2">路线</th>
                    <th className="py-2 pr-2">起点</th>
                    <th className="py-2 pr-2">终点</th>
                    <th className="py-2 pr-2 text-right">距离(m)</th>
                    <th className="py-2 pr-2 text-right">时间(s)</th>
                    <th className="py-2 text-center">启用</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r) => {
                    const fz = ZONES.find((z) => z.id === r.from);
                    const tz = ZONES.find((z) => z.id === r.to);
                    return (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pr-2 font-mono font-medium">{r.id}</td>
                        <td className="py-2 pr-2">{fz?.name}</td>
                        <td className="py-2 pr-2">{tz?.name}</td>
                        <td className="py-2 pr-2 text-right">{r.distance.toFixed(1)}</td>
                        <td className="py-2 pr-2 text-right">{r.time}</td>
                        <td className="py-2 text-center">
                          <button
                            onClick={() => toggleRoute(r.id)}
                            className={`w-10 h-5 rounded-full transition-colors ${r.active ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${r.active ? "translate-x-5" : "translate-x-0.5"}`} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 2: 任务模拟
// ═══════════════════════════════════════════════════════════

function TaskSimulationTab() {
  const [concurrent, setConcurrent] = useState(5);
  const [speed, setSpeed] = useState<"1x" | "2x" | "5x">("1x");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);

  const runSim = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      setResult({
        avgWait: 2.3,
        bottleneckZone: "清洗区",
        bottleneckQueued: 3,
        avgDelivery: 12.5,
        collisionRisks: 1,
        collisionDetail: "路线 R-03 <-> R-05",
      });
      setRunning(false);
    }, 1500);
  }, []);

  // Simulated AGV dots for mini map
  const simDots = useMemo(() => {
    if (!result) return [];
    return [
      { id: 1, x: 90, y: 110, color: "#22c55e" },
      { id: 2, x: 280, y: 110, color: "#3b82f6" },
      { id: 3, x: 480, y: 110, color: "#3b82f6" },
      { id: 4, x: 90, y: 290, color: "#eab308" },
      { id: 5, x: 280, y: 290, color: "#22c55e" },
    ];
  }, [result]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Config */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> 模拟配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">并发任务数: <strong>{concurrent}</strong></label>
            <input
              type="range" min={1} max={20} value={concurrent}
              onChange={(e) => setConcurrent(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1</span><span>10</span><span>20</span></div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">仿真速度</label>
            <div className="flex gap-2">
              {(["1x", "2x", "5x"] as const).map((s) => (
                <Button
                  key={s}
                  variant={speed === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSpeed(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={runSim} disabled={running}>
            {running ? (
              <><Clock className="h-4 w-4 mr-2 animate-spin" /> 仿真中...</>
            ) : (
              <><Play className="h-4 w-4 mr-2" /> Start Simulation</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> 仿真结果</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="text-center text-muted-foreground py-12">点击 Start Simulation 开始仿真</div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="text-xs text-muted-foreground">平均等待时间</div>
                  <div className="text-xl font-bold text-green-600">{result.avgWait} min</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="text-xs text-muted-foreground">平均配送时间</div>
                  <div className="text-xl font-bold text-blue-600">{result.avgDelivery} min</div>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <div className="text-xs text-muted-foreground">瓶颈区域</div>
                  <div className="text-lg font-bold text-red-600">{result.bottleneckZone}</div>
                  <div className="text-xs text-muted-foreground">{result.bottleneckQueued} AGVs queued</div>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                  <div className="text-xs text-muted-foreground">碰撞风险</div>
                  <div className="text-lg font-bold text-yellow-600">{result.collisionRisks}</div>
                  <div className="text-xs text-muted-foreground">{result.collisionDetail}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mini factory map */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">仿真地图</CardTitle>
        </CardHeader>
        <CardContent>
          <svg viewBox="0 0 800 400" className="w-full border rounded-lg bg-muted/30" style={{ maxHeight: 250 }}>
            {ZONES.map((z) => (
              <g key={z.id}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={6} fill={z.color} fillOpacity={0.1} stroke={z.color} strokeWidth={1} />
                <text x={z.x + z.w / 2} y={z.y + z.h / 2 + 4} textAnchor="middle" fill={z.color} fontSize={10}>{z.name}</text>
              </g>
            ))}
            {simDots.map((d) => (
              <circle key={d.id} cx={d.x} cy={d.y} r={8} fill={d.color} fillOpacity={0.8}>
                <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
              </circle>
            ))}
          </svg>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 3: 充电策略
// ═══════════════════════════════════════════════════════════

function ChargingStrategyTab() {
  const [optimized, setOptimized] = useState(false);
  const schedule = useMemo(() => buildSchedule(), []);

  const cellColor = (val: string): string => {
    switch (val) {
      case "working":  return "bg-green-500";
      case "charging": return "bg-yellow-400";
      default:         return "bg-gray-300 dark:bg-gray-700";
    }
  };

  return (
    <div className="space-y-4">
      {/* Shift schedule */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> 班次安排 & 任务需求</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {SHIFTS.map((s) => (
              <div key={s.name} className="flex items-center gap-4">
                <div className="w-28 text-sm font-medium">
                  {s.name} <span className="text-muted-foreground text-xs">({s.start}:00-{s.end}:00)</span>
                </div>
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${s.demand}%` }}
                  />
                </div>
                <span className="text-sm font-mono w-12 text-right">{s.demand}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charging grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><BatteryCharging className="h-4 w-4" /> 充电排程 (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="py-1 pr-2 text-left text-muted-foreground">AGV</th>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <th key={h} className="py-1 text-center text-muted-foreground w-8">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AGV_CODES.map((code) => (
                  <tr key={code}>
                    <td className="py-1 pr-2 font-mono font-medium">{code}</td>
                    {schedule[code].map((val, h) => (
                      <td key={h} className="py-1 px-0.5">
                        <div className={`h-5 rounded-sm ${cellColor(val)}`} title={`${code} ${h}:00 - ${val}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-500" /> 工作</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-yellow-400" /> 充电</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-gray-300 dark:bg-gray-700" /> 空闲</span>
          </div>
        </CardContent>
      </Card>

      {/* Optimization */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> 优化建议</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {optimized ? (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="font-medium text-green-700 dark:text-green-300 mb-1">建议方案</div>
                <p className="text-sm">AGV-001/003/005 在 12:00-13:00 充电, AGV-002/004/006 在 18:00-19:00 充电</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">覆盖率</div>
                <p className="text-sm">预计零停机: <strong>100%</strong> 任务覆盖</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-6">点击优化按钮生成充电策略建议</div>
          )}
          <Button className="w-full" onClick={() => setOptimized(true)}>
            <Zap className="h-4 w-4 mr-2" /> Optimize
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 4: 容量分析
// ═══════════════════════════════════════════════════════════

function CapacityAnalysisTab() {
  const [tasksPerHour, setTasksPerHour] = useState(20);
  const [avgDistance, setAvgDistance] = useState(100);
  const [agvSpeed, setAgvSpeed] = useState(30);
  const [calculated, setCalculated] = useState(false);

  // Capacity calculation
  const timePerTask = avgDistance / agvSpeed; // minutes
  const minAgvs = Math.ceil((tasksPerHour * timePerTask) / 60);
  const utilAtMin = Math.min(100, Math.round(((tasksPerHour * timePerTask) / (minAgvs * 60)) * 100));
  const recommended = Math.ceil(minAgvs / 0.75);

  const fleetSizes = [3, 4, 5, 6, 7, 8];
  const utilizations = fleetSizes.map((n) => ({
    count: n,
    util: Math.min(100, Math.round(((tasksPerHour * timePerTask) / (n * 60)) * 100)),
  }));

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" /> 参数设定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">目标任务量: <strong>{tasksPerHour} 次/小时</strong></label>
            <input
              type="range" min={5} max={50} value={tasksPerHour}
              onChange={(e) => setTasksPerHour(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>5</span><span>25</span><span>50</span></div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">平均搬运距离: <strong>{avgDistance}m</strong></label>
            <input
              type="range" min={50} max={200} value={avgDistance}
              onChange={(e) => setAvgDistance(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>50m</span><span>125m</span><span>200m</span></div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">AGV 行驶速度: <strong>{agvSpeed} m/min</strong></label>
            <input
              type="range" min={20} max={60} value={agvSpeed}
              onChange={(e) => setAgvSpeed(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>20</span><span>40</span><span>60</span></div>
          </div>
          <Button className="w-full" onClick={() => setCalculated(true)}>
            <Calculator className="h-4 w-4 mr-2" /> 计算
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {calculated && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-xs text-muted-foreground">最少 AGV 数量</div>
                <div className="text-3xl font-bold text-blue-600 my-1">{minAgvs}</div>
                <div className="text-xs text-muted-foreground">利用率 {utilAtMin}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-xs text-muted-foreground">推荐车队规模</div>
                <div className="text-3xl font-bold text-green-600 my-1">{recommended}</div>
                <div className="text-xs text-muted-foreground">目标利用率 75%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-xs text-muted-foreground">单次搬运耗时</div>
                <div className="text-3xl font-bold text-orange-600 my-1">{timePerTask.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">分钟/次</div>
              </CardContent>
            </Card>
          </div>

          {/* Utilization curve */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> 利用率曲线 (AGV 数量 vs 利用率)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {utilizations.map((u) => {
                  const isRecommended = u.count === recommended;
                  const isMin = u.count === minAgvs;
                  const barColor = u.util > 90 ? "bg-red-500" : u.util > 75 ? "bg-yellow-500" : "bg-green-500";
                  return (
                    <div key={u.count} className="flex items-center gap-3">
                      <span className={`text-sm font-mono w-16 ${isRecommended ? "font-bold text-green-600" : isMin ? "font-bold text-blue-600" : "text-muted-foreground"}`}>
                        {u.count} AGV
                      </span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${u.util}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono w-12 text-right">{u.util}%</span>
                      {isRecommended && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">推荐</Badge>}
                      {isMin && !isRecommended && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">最少</Badge>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
