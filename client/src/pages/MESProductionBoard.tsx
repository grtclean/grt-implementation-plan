import { useState, useEffect, useCallback } from "react";
import FloatingNav from '@/components/FloatingNav';
import { Badge } from "@/components/ui/badge";
import {
  Factory,
  AlertTriangle,
  Bell,
  Clock,
  Activity,
  CheckCircle,
  Pause,
  XCircle,
  Package,
  Gauge,
} from "lucide-react";

// ---- Types ----

type StationStatus = "running" | "changeover" | "alarm" | "idle";
type AlertSeverity = "critical" | "warning" | "info";
type WOStatus = "completed" | "in_progress" | "planned" | "blocked";

interface Station {
  id: string;
  name: string;
  tStage: string;
  operator: string;
  wo: string;
  progress: number;
  status: StationStatus;
}

interface AndonAlert {
  id: number;
  timestamp: string;
  station: string;
  message: string;
  severity: AlertSeverity;
}

interface WorkOrder {
  code: string;
  product: string;
  progress: number;
  status: WOStatus;
}

interface DefectItem {
  type: string;
  count: number;
}

interface DowntimeItem {
  station: string;
  reason: string;
  minutes: number;
  severity: "warning" | "critical";
}

// ---- Mock data generators ----

function makeStations(): Station[] {
  const operators = [
    "吴卫成", "曹庆伟", "焦斌", "侯德朋", "沈龙翔", "崔聪聪",
    "田坪珍", "强兵兵", "李明遂", "马林山", "杜显文", "吕雪冬",
  ];
  const stages = [
    "T01-下料", "T02-粗车", "T03-精车", "T04-清洗",
    "T05-热处理", "T06-磨削", "T07-超声检测", "T08-组装",
    "T09-包装", "T10-终检", "T11-入库", "T12-发运",
  ];
  const statuses: StationStatus[] = [
    "running", "running", "changeover", "running",
    "running", "running", "alarm", "running",
    "running", "changeover", "idle", "running",
  ];
  return stages.map((stage, i) => ({
    id: `WS-T${String(i + 1).padStart(2, "0")}`,
    name: `工位 ${String(i + 1).padStart(2, "0")}`,
    tStage: stage,
    operator: operators[i],
    wo: `WO-2603-${String(100 + i).slice(0)}`,
    progress: statuses[i] === "idle" ? 0 : Math.floor(Math.random() * 60 + 30),
    status: statuses[i],
  }));
}

function makeAlerts(): AndonAlert[] {
  return [
    { id: 1, timestamp: "14:32:05", station: "WS-T07", message: "超声频率偏移 \u00b13kHz", severity: "critical" },
    { id: 2, timestamp: "14:28:41", station: "WS-T04", message: "清洗液温度低于下限", severity: "warning" },
    { id: 3, timestamp: "14:25:13", station: "WS-T09", message: "包装完成等待转运", severity: "info" },
    { id: 4, timestamp: "14:18:07", station: "WS-T03", message: "换模超时预警 >10min", severity: "warning" },
    { id: 5, timestamp: "14:12:55", station: "WS-T11", message: "物料缺件 等待AGV补料", severity: "critical" },
    { id: 6, timestamp: "14:05:22", station: "WS-T06", message: "磨削砂轮寿命剩余 12%", severity: "warning" },
    { id: 7, timestamp: "13:58:30", station: "WS-T02", message: "粗车完成自动放行", severity: "info" },
    { id: 8, timestamp: "13:45:19", station: "WS-T10", message: "终检合格批次放行", severity: "info" },
  ];
}

function makeWorkOrders(): WorkOrder[] {
  return [
    { code: "WO-2603-101", product: "齿轮轴 GS-A280", progress: 100, status: "completed" },
    { code: "WO-2603-102", product: "压铸壳体 DC-F150", progress: 72, status: "in_progress" },
    { code: "WO-2603-103", product: "半导体阀座 SV-X80", progress: 45, status: "in_progress" },
    { code: "WO-2603-104", product: "涡轮叶片 TB-R60", progress: 18, status: "in_progress" },
    { code: "WO-2603-105", product: "传动齿轮 TG-220", progress: 0, status: "planned" },
    { code: "WO-2603-106", product: "密封环 SR-90", progress: 35, status: "blocked" },
  ];
}

const defects: DefectItem[] = [
  { type: "表面划痕", count: 5 },
  { type: "清洁度不足", count: 3 },
  { type: "尺寸偏差", count: 2 },
  { type: "密封不良", count: 1 },
  { type: "其他", count: 1 },
];

const downtimeItems: DowntimeItem[] = [
  { station: "WS-T03", reason: "换模中", minutes: 12, severity: "warning" },
  { station: "WS-T11", reason: "物料缺件 (等待AGV)", minutes: 8, severity: "critical" },
];

// ---- Helpers ----

const statusColors: Record<StationStatus, string> = {
  running: "border-green-500/70 bg-green-950/40",
  changeover: "border-yellow-500/70 bg-yellow-950/40",
  alarm: "border-red-500/70 bg-red-950/40 animate-pulse",
  idle: "border-gray-600/50 bg-gray-900/40",
};

const statusDotColors: Record<StationStatus, string> = {
  running: "bg-green-400",
  changeover: "bg-yellow-400",
  alarm: "bg-red-400",
  idle: "bg-gray-500",
};

const statusLabels: Record<StationStatus, string> = {
  running: "运行中",
  changeover: "换模",
  alarm: "报警",
  idle: "空闲",
};

const severityStyle: Record<AlertSeverity, { border: string; badge: string; badgeLabel: string }> = {
  critical: { border: "border-red-500/60", badge: "bg-red-600 text-white", badgeLabel: "严重" },
  warning: { border: "border-yellow-500/60", badge: "bg-yellow-600 text-white", badgeLabel: "警告" },
  info: { border: "border-blue-500/40", badge: "bg-blue-600 text-white", badgeLabel: "信息" },
};

const woStatusStyle: Record<WOStatus, { bg: string; label: string }> = {
  completed: { bg: "bg-green-500", label: "完成" },
  in_progress: { bg: "bg-blue-500", label: "进行中" },
  planned: { bg: "bg-gray-500", label: "计划" },
  blocked: { bg: "bg-red-500", label: "阻塞" },
};

// ---- SVG Gauge ----

function OEEGauge({ label, value, color }: { label: string; value: number; color: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={radius} fill="none" stroke="#1f2937" strokeWidth="7" />
        <circle
          cx="45"
          cy="45"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          className="transition-all duration-700"
        />
        <text x="45" y="49" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
          {value}%
        </text>
      </svg>
      <span className="text-xs text-gray-300">{label}</span>
    </div>
  );
}

// ---- Main Component ----

export default function MESProductionBoard() {
  const [clock, setClock] = useState(new Date());
  const [stations, setStations] = useState<Station[]>(makeStations);
  const [alerts] = useState<AndonAlert[]>(makeAlerts);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(makeWorkOrders);
  const [downtimeMinutes, setDowntimeMinutes] = useState<number[]>(
    downtimeItems.map((d) => d.minutes)
  );

  // Real-time clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Data simulation every 15s
  const simulate = useCallback(() => {
    setStations((prev) =>
      prev.map((s) => {
        if (s.status === "running") {
          const next = Math.min(100, s.progress + Math.floor(Math.random() * 5));
          return { ...s, progress: next };
        }
        return s;
      })
    );
    setWorkOrders((prev) =>
      prev.map((wo) => {
        if (wo.status === "in_progress") {
          const next = Math.min(100, wo.progress + Math.floor(Math.random() * 8));
          return { ...wo, progress: next, status: next >= 100 ? "completed" : "in_progress" };
        }
        return wo;
      })
    );
    setDowntimeMinutes((prev) => prev.map((m) => m + 1));
  }, []);

  useEffect(() => {
    const t = setInterval(simulate, 15000);
    return () => clearInterval(t);
  }, [simulate]);

  const todayProduced = 28;
  const todayTarget = 35;
  const fpy = 96.2;

  const timeStr = clock.toLocaleTimeString("zh-CN", { hour12: false });
  const dateStr = clock.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  const totalDefects = defects.reduce((s, d) => s + d.count, 0);
  const maxDefect = Math.max(...defects.map((d) => d.count));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="h-14 flex-shrink-0 bg-gray-900/80 border-b border-gray-800 flex items-center px-5 gap-6">
        <div className="flex items-center gap-2 text-lg font-bold tracking-wide">
          <Factory className="h-5 w-5 text-blue-400" />
          <span>GRT MES 产线实时看板</span>
        </div>
        <div className="h-5 w-px bg-gray-700" />
        <div className="flex items-center gap-1.5 text-sm text-gray-300">
          <Clock className="h-4 w-4" />
          当前班次: <span className="text-yellow-300 font-medium">白班</span>
        </div>
        <div className="text-sm font-mono text-cyan-300">
          {dateStr} {timeStr}
        </div>
        <div className="ml-auto flex items-center gap-5 text-sm">
          <div className="flex items-center gap-1.5">
            <Package className="h-4 w-4 text-green-400" />
            今日产量:
            <span className="text-white font-bold">
              {todayProduced}/{todayTarget}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-green-400" />
            FPY:
            <span className="text-green-300 font-bold">{fpy}%</span>
          </div>
        </div>
      </header>

      {/* Body — 3-column grid */}
      <div className="flex-1 grid grid-cols-[40%_35%_25%] gap-3 p-3 overflow-hidden">
        {/* ======== LEFT: Station Grid ======== */}
        <section className="flex flex-col gap-2 overflow-auto pr-1">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-1.5 mb-1">
            <Activity className="h-4 w-4" /> 工位状态网格
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {stations.map((s) => (
              <div
                key={s.id}
                className={`rounded-lg border p-2.5 flex flex-col gap-1.5 ${statusColors[s.status]}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200">{s.id}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${statusDotColors[s.status]}`} />
                </div>
                <div className="text-[11px] text-gray-300">{s.tStage}</div>
                <div className="text-xs text-gray-300">{s.operator}</div>
                <div className="text-[10px] text-gray-400 font-mono">{s.wo}</div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full mt-auto">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      s.status === "alarm"
                        ? "bg-red-500"
                        : s.status === "changeover"
                          ? "bg-yellow-500"
                          : s.status === "idle"
                            ? "bg-gray-600"
                            : "bg-green-500"
                    }`}
                    style={{ width: `${s.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">{s.progress}%</span>
                  <span className="text-gray-400">{statusLabels[s.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ======== CENTER: Andon + Work Orders ======== */}
        <section className="flex flex-col gap-3 overflow-hidden">
          {/* Andon alerts */}
          <div className="flex-1 min-h-0 flex flex-col gap-1.5">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-red-400" /> Andon 警报
            </h2>
            <div className="flex-1 overflow-auto space-y-1.5 pr-1">
              {alerts.map((a) => {
                const sty = severityStyle[a.severity];
                return (
                  <div
                    key={a.id}
                    className={`rounded-md border bg-gray-900/60 p-2.5 flex items-start gap-2.5 ${sty.border}`}
                  >
                    <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap pt-0.5">
                      {a.timestamp}
                    </span>
                    <span className="text-xs font-bold text-gray-300 whitespace-nowrap">
                      {a.station}
                    </span>
                    <span className="text-xs text-gray-300 flex-1">{a.message}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${sty.badge}`}>
                      {sty.badgeLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Work order progress */}
          <div className="flex-1 min-h-0 flex flex-col gap-1.5">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-blue-400" /> 工单进度
            </h2>
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {workOrders.map((wo) => {
                const style = woStatusStyle[wo.status];
                return (
                  <div key={wo.code} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-300">{wo.code}</span>
                        <span className="text-gray-300">{wo.product}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] border-none ${style.bg} text-white`}
                      >
                        {style.label}
                      </Badge>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${style.bg}`}
                        style={{ width: `${wo.progress}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400 text-right">{wo.progress}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ======== RIGHT: OEE + Quality ======== */}
        <section className="flex flex-col gap-3 overflow-auto pl-1">
          {/* OEE Gauges */}
          <div className="bg-gray-900/60 rounded-lg border border-gray-800 p-3">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">OEE 综合效率</h2>
            <div className="grid grid-cols-2 gap-3 place-items-center">
              <OEEGauge label="可用率" value={92.5} color="#22c55e" />
              <OEEGauge label="性能率" value={88.3} color="#eab308" />
              <OEEGauge label="质量率" value={97.1} color="#22c55e" />
              <OEEGauge label="总 OEE" value={79.5} color="#eab308" />
            </div>
          </div>

          {/* Defect counter */}
          <div className="bg-gray-900/60 rounded-lg border border-gray-800 p-3">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-red-400" /> 缺陷统计
              </span>
              <span className="text-lg font-bold text-red-300">{totalDefects}</span>
            </h2>
            <div className="space-y-1.5">
              {defects.map((d) => (
                <div key={d.type} className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-gray-300 truncate">{d.type}</span>
                  <div className="flex-1 h-2.5 bg-gray-800 rounded-full">
                    <div
                      className="h-full bg-red-500/80 rounded-full transition-all"
                      style={{ width: `${(d.count / maxDefect) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-gray-300">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Downtime */}
          <div className="bg-gray-900/60 rounded-lg border border-gray-800 p-3">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-1.5 mb-2">
              <Pause className="h-4 w-4 text-yellow-400" /> 活跃停机
            </h2>
            <div className="space-y-2">
              {downtimeItems.map((d, i) => (
                <div
                  key={d.station}
                  className={`rounded-md border p-2.5 ${
                    d.severity === "critical"
                      ? "border-red-500/60 bg-red-950/30"
                      : "border-yellow-500/60 bg-yellow-950/30"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-200">{d.station}</span>
                    <span
                      className={`font-mono ${
                        d.severity === "critical" ? "text-red-300" : "text-yellow-300"
                      }`}
                    >
                      {downtimeMinutes[i]} 分钟
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-300 mt-1">{d.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <FloatingNav />
    </div>
  );
}
