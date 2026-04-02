import { useState, useEffect, useCallback, useRef } from "react";
import FloatingNav from '@/components/FloatingNav';
import {
  Camera,
  Factory,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  BarChart3,
  ClipboardList,
  Megaphone,
  Sun,
  ThermometerSun,
  Phone,
  Activity,
  TrendingUp,
  Award,
  XCircle,
} from "lucide-react";

// ── Demo Data ──────────────────────────────────────────────────────────

const STATIONS = [
  { id: "T1", name: "齿轴加工", operator: "李明遂", wo: "WO-2603-0081", progress: 87, oee: 94, status: "running" as const },
  { id: "T2", name: "热处理", operator: "强兵兵", wo: "WO-2603-0082", progress: 62, oee: 88, status: "running" as const },
  { id: "T3", name: "精磨工序", operator: "张飞", wo: "WO-2603-0083", progress: 100, oee: 96, status: "completed" as const },
  { id: "T4", name: "压铸成型", operator: "史龙昌", wo: "WO-2603-0079", progress: 45, oee: 82, status: "running" as const },
  { id: "T5", name: "CNC铣削", operator: "李亚超", wo: "WO-2603-0084", progress: 23, oee: 91, status: "running" as const },
  { id: "T6", name: "装配线A", operator: "吴卫成", wo: "WO-2603-0085", progress: 0, oee: 0, status: "idle" as const },
  { id: "T7", name: "装配线B", operator: "曹庆伟", wo: "WO-2603-0086", progress: 71, oee: 89, status: "running" as const },
  { id: "T8", name: "检测台1", operator: "金晓锋", wo: "WO-2603-0087", progress: 55, oee: 93, status: "running" as const },
  { id: "T9", name: "检测台2", operator: "马柯", wo: "WO-2603-0088", progress: 33, oee: 85, status: "warning" as const },
  { id: "T10", name: "喷涂线", operator: "田坪珍", wo: "WO-2603-0089", progress: 90, oee: 97, status: "running" as const },
  { id: "T11", name: "包装台", operator: "侯德朋", wo: "WO-2603-0090", progress: 78, oee: 92, status: "running" as const },
  { id: "T12", name: "AGV调度", operator: "马林山", wo: "WO-2603-0091", progress: 0, oee: 0, status: "fault" as const },
];

const CAMERAS = [
  { id: "CAM-SF-001", name: "齿轴加工区", status: "online" as const },
  { id: "CAM-SF-002", name: "热处理车间", status: "online" as const },
  { id: "CAM-SF-003", name: "精磨区域", status: "online" as const },
  { id: "CAM-SF-004", name: "压铸成型区", status: "online" as const },
  { id: "CAM-SF-005", name: "CNC加工中心", status: "online" as const },
  { id: "CAM-SF-006", name: "装配线全景", status: "offline" as const },
  { id: "CAM-SF-007", name: "质检通道", status: "online" as const },
  { id: "CAM-SF-008", name: "喷涂线", status: "online" as const },
  { id: "CAM-SF-009", name: "成品仓入口", status: "online" as const },
];

const WORK_ORDERS = [
  { code: "WO-2603-0081", product: "行星齿轮轴 GS-220", progress: 87, status: "in_progress" as const, start: 6, end: 14 },
  { code: "WO-2603-0082", product: "减速机壳体 RC-150", progress: 62, status: "in_progress" as const, start: 7, end: 15 },
  { code: "WO-2603-0083", product: "蜗杆 WG-80", progress: 100, status: "completed" as const, start: 6, end: 12 },
  { code: "WO-2603-0084", product: "同步带轮 SP-45", progress: 23, status: "in_progress" as const, start: 9, end: 17 },
  { code: "WO-2603-0085", product: "联轴器 CL-60", progress: 0, status: "planned" as const, start: 13, end: 18 },
  { code: "WO-2603-0086", product: "锥齿轮 BG-100", progress: 71, status: "in_progress" as const, start: 8, end: 16 },
  { code: "WO-2603-0087", product: "花键轴 SS-35", progress: 55, status: "in_progress" as const, start: 7, end: 13 },
  { code: "WO-2603-0091", product: "减速机总成 GA-500", progress: 0, status: "blocked" as const, start: 10, end: 20 },
];

const FPY_TREND = [
  { day: "03-16", value: 96.2 },
  { day: "03-17", value: 94.8 },
  { day: "03-18", value: 97.1 },
  { day: "03-19", value: 92.3 },
  { day: "03-20", value: 95.5 },
  { day: "03-21", value: 98.0 },
  { day: "03-22", value: 96.7 },
];

const DEFECT_PARETO = [
  { type: "尺寸超差", count: 12, pct: 35 },
  { type: "表面粗糙度", count: 8, pct: 24 },
  { type: "硬度不合格", count: 6, pct: 18 },
  { type: "装配间隙", count: 5, pct: 15 },
  { type: "外观缺陷", count: 3, pct: 8 },
];

const TOP_OPERATORS = [
  { name: "张飞", score: 99.2 },
  { name: "田坪珍", score: 98.5 },
  { name: "金晓锋", score: 97.8 },
];

const BOTTOM_OPERATORS = [
  { name: "马林山", score: 86.1 },
  { name: "史龙昌", score: 88.4 },
  { name: "马柯", score: 89.7 },
];

const ANNOUNCEMENTS = [
  { title: "车间温度预警", content: "热处理区温度偏高，已启动辅助散热，请注意防护。", level: "warning" as const },
  { title: "下周设备保养通知", content: "T4压铸机、T5 CNC将于3月24日进行季度保养，请提前调整排产。", level: "info" as const },
  { title: "新员工安全培训", content: "新入职3名操作员已完成安全培训并取得上岗证，分配至T6/T7。", level: "success" as const },
];

// ── Helper Components ──────────────────────────────────────────────────

function OEERing({ value, size = 56 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 90 ? "#22c55e" : value >= 80 ? "#eab308" : "#ef4444";
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#374151" strokeWidth={4} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={size * 0.24} fontWeight="bold">
        {value}%
      </text>
    </svg>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "running" ? "bg-green-500 shadow-green-500/50" :
    status === "completed" ? "bg-blue-500 shadow-blue-500/50" :
    status === "warning" ? "bg-yellow-500 shadow-yellow-500/50" :
    status === "fault" ? "bg-red-500 shadow-red-500/50 animate-pulse" :
    "bg-gray-600";
  return <span className={`inline-block w-3 h-3 rounded-full ${color} shadow-lg`} />;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("zh-CN", { hour12: false });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });
}

// ── View Components ────────────────────────────────────────────────────

function ViewProductionOverview() {
  const totalOEE = Math.round(STATIONS.reduce((s, st) => s + st.oee, 0) / STATIONS.filter((s) => s.oee > 0).length);
  const todayOutput = 347;
  const fpyRate = 96.7;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="grid grid-cols-4 gap-3 flex-1">
        {STATIONS.map((st) => (
          <div
            key={st.id}
            className={`bg-gray-900/80 border border-gray-800/50 backdrop-blur-sm rounded-xl p-4 flex flex-col gap-2 ${
              st.status === "fault" ? "shadow-lg shadow-red-500/10" : st.status === "running" ? "shadow-lg shadow-green-500/10" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-200">{st.id} {st.name}</span>
              <StatusDot status={st.status} />
            </div>
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-1 space-y-1">
                <div className="text-lg text-gray-300">
                  <Users className="inline w-4 h-4 mr-1" />
                  {st.operator}
                </div>
                <div className="text-lg text-gray-400 truncate">{st.wo}</div>
                <div className="w-full bg-gray-800 rounded-full h-2.5 mt-1">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${st.progress}%`,
                      backgroundColor: st.progress === 100 ? "#22c55e" : st.progress > 0 ? "#3b82f6" : "#4b5563",
                    }}
                  />
                </div>
                <div className="text-lg text-gray-300">{st.progress}%</div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <OEERing value={st.oee || 0} size={52} />
                <div className="w-12 h-8 bg-gray-950 rounded flex items-center justify-center">
                  <Camera className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 h-28">
        <div className="flex-1 bg-gray-900/80 border border-gray-800/50 rounded-xl flex items-center justify-center gap-6 shadow-lg shadow-green-500/10">
          <OEERing value={totalOEE} size={80} />
          <div>
            <div className="text-xl text-gray-300">综合OEE</div>
            <div className="text-3xl font-bold text-green-400">{totalOEE}%</div>
          </div>
        </div>
        <div className="flex-1 bg-gray-900/80 border border-gray-800/50 rounded-xl flex items-center justify-center gap-4">
          <TrendingUp className="w-10 h-10 text-blue-400" />
          <div>
            <div className="text-xl text-gray-300">今日产出</div>
            <div className="text-3xl font-bold text-blue-400">{todayOutput} 件</div>
          </div>
        </div>
        <div className="flex-1 bg-gray-900/80 border border-gray-800/50 rounded-xl flex items-center justify-center gap-4">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
          <div>
            <div className="text-xl text-gray-300">一次合格率</div>
            <div className="text-3xl font-bold text-green-400">{fpyRate}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewCameraMatrix() {
  const now = new Date();
  return (
    <div className="grid grid-cols-3 gap-3 h-full">
      {CAMERAS.map((cam) => (
        <div key={cam.id} className="bg-[#111] rounded-xl relative overflow-hidden flex flex-col items-center justify-center border border-gray-800/50">
          <Camera className="w-16 h-16 text-gray-700 mb-2" />
          <div className="text-xl text-gray-300 font-mono">{cam.id}</div>
          <div className="text-lg text-gray-400">{cam.name}</div>
          <div
            className={`absolute top-3 right-3 px-3 py-1 rounded-full text-lg font-semibold ${
              cam.status === "online" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            }`}
          >
            {cam.status === "online" ? "在线" : "离线"}
          </div>
          <div className="absolute bottom-3 left-3 text-lg text-gray-500 font-mono">
            {formatTime(now)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ViewQualityScoreboard() {
  const todayFPY = FPY_TREND[FPY_TREND.length - 1].value;
  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* Left: FPY Trend */}
      <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-5 flex flex-col">
        <div className="text-xl font-bold text-gray-300 mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" /> 7日 FPY 趋势
        </div>
        <div className="flex-1 flex flex-col justify-center gap-3">
          {FPY_TREND.map((d) => {
            const color = d.value >= 95 ? "#22c55e" : d.value >= 90 ? "#eab308" : "#ef4444";
            return (
              <div key={d.day} className="flex items-center gap-3">
                <span className="text-lg text-gray-300 w-16 font-mono">{d.day}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-5 relative">
                  <div className="h-5 rounded-full transition-all" style={{ width: `${d.value}%`, backgroundColor: color }} />
                </div>
                <span className="text-lg font-bold w-16 text-right" style={{ color }}>{d.value}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center: FPY big number + Defect Pareto */}
      <div className="flex flex-col gap-4">
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-6 flex flex-col items-center justify-center flex-1 shadow-lg shadow-green-500/10">
          <div className="text-xl text-gray-300 mb-2">今日一次合格率</div>
          <div className="text-7xl font-black text-green-400">{todayFPY}%</div>
          <div className="text-xl text-gray-400 mt-2">目标: 95.0%</div>
        </div>
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-5 flex-1 flex flex-col">
          <div className="text-xl font-bold text-gray-300 mb-3">缺陷帕累托 Top 5</div>
          <div className="flex-1 flex flex-col justify-center gap-2">
            {DEFECT_PARETO.map((d) => (
              <div key={d.type} className="flex items-center gap-3">
                <span className="text-lg text-gray-300 w-28 truncate">{d.type}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-4">
                  <div className="h-4 rounded-full bg-red-500/70" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="text-lg text-gray-300 w-8 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Operator rankings */}
      <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-5 flex flex-col">
        <div className="text-xl font-bold text-gray-300 mb-4 flex items-center gap-2">
          <Award className="w-6 h-6 text-yellow-400" /> 质量红黑榜
        </div>
        <div className="flex-1 flex flex-col justify-center gap-3">
          <div className="text-xl text-green-400 font-semibold mb-2">红榜 TOP 3</div>
          {TOP_OPERATORS.map((op, i) => (
            <div key={op.name} className="flex items-center gap-3 bg-green-500/10 rounded-lg px-4 py-3">
              <span className="text-2xl font-bold text-green-400 w-8">{i + 1}</span>
              <span className="text-xl text-gray-200 flex-1">{op.name}</span>
              <span className="text-xl font-bold text-green-400">{op.score}%</span>
            </div>
          ))}
          <div className="border-t border-gray-700 my-3" />
          <div className="text-xl text-red-400 font-semibold mb-2">黑榜 需改善</div>
          {BOTTOM_OPERATORS.map((op, i) => (
            <div key={op.name} className="flex items-center gap-3 bg-red-500/10 rounded-lg px-4 py-3">
              <span className="text-2xl font-bold text-red-400 w-8">{i + 1}</span>
              <span className="text-xl text-gray-200 flex-1">{op.name}</span>
              <span className="text-xl font-bold text-red-400">{op.score}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ViewWorkOrderProgress() {
  const timelineStart = 6;
  const timelineEnd = 22;
  const totalHours = timelineEnd - timelineStart;
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentPct = Math.max(0, Math.min(100, ((currentHour - timelineStart) / totalHours) * 100));

  const statusLabel: Record<string, string> = {
    completed: "已完成",
    in_progress: "进行中",
    planned: "待排产",
    blocked: "已阻塞",
  };
  const statusColor: Record<string, string> = {
    completed: "#22c55e",
    in_progress: "#3b82f6",
    planned: "#6b7280",
    blocked: "#ef4444",
  };

  return (
    <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-6 h-full flex flex-col">
      <div className="text-2xl font-bold text-gray-200 mb-4 flex items-center gap-2">
        <ClipboardList className="w-7 h-7 text-blue-400" /> 今日工单进度
      </div>
      {/* Timeline header */}
      <div className="relative mb-2 ml-60">
        <div className="flex justify-between text-lg text-gray-400">
          {Array.from({ length: totalHours + 1 }, (_, i) => (
            <span key={i} className="font-mono">{String(timelineStart + i).padStart(2, "0")}:00</span>
          ))}
        </div>
      </div>
      {/* Work order rows */}
      <div className="flex-1 flex flex-col gap-3 relative">
        {WORK_ORDERS.map((wo) => {
          const leftPct = ((wo.start - timelineStart) / totalHours) * 100;
          const widthPct = ((wo.end - wo.start) / totalHours) * 100;
          return (
            <div key={wo.code} className="flex items-center gap-4 h-12">
              <div className="w-56 shrink-0 flex items-center gap-2">
                <span className="text-lg font-mono text-gray-300">{wo.code}</span>
                <span className="text-lg text-gray-400 truncate">{wo.product}</span>
              </div>
              <div className="flex-1 relative h-10 bg-gray-800/50 rounded">
                <div
                  className="absolute h-10 rounded flex items-center px-3 gap-2"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: statusColor[wo.status],
                    opacity: 0.85,
                  }}
                >
                  <span className="text-lg font-bold text-white truncate">{wo.progress}%</span>
                  <span className="text-lg text-white/80 truncate">{statusLabel[wo.status]}</span>
                </div>
                {/* Current time marker */}
                <div
                  className="absolute top-0 w-0.5 h-10 bg-red-500 z-10"
                  style={{ left: `${currentPct}%` }}
                />
              </div>
            </div>
          );
        })}
        {/* Floating current time indicator */}
        <div className="absolute bottom-0 ml-60 pointer-events-none" style={{ left: `calc(${currentPct}% - 24px)` }}>
          <div className="text-lg font-mono text-red-400 bg-red-500/20 px-2 rounded">{formatTime(now)}</div>
        </div>
      </div>
    </div>
  );
}

function ViewSafetyAnnouncements() {
  const safetyDays = 327;
  const levelIcon = {
    warning: <AlertTriangle className="w-7 h-7 text-yellow-400" />,
    info: <Megaphone className="w-7 h-7 text-blue-400" />,
    success: <CheckCircle2 className="w-7 h-7 text-green-400" />,
  };
  const levelBorder = {
    warning: "border-yellow-500/30",
    info: "border-blue-500/30",
    success: "border-green-500/30",
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* Left: Safety counter */}
      <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl flex flex-col items-center justify-center shadow-lg shadow-green-500/10">
        <Shield className="w-20 h-20 text-green-400 mb-4" />
        <div className="text-2xl text-gray-300 mb-2">安全运行</div>
        <div className="text-8xl font-black text-green-400">{safetyDays}</div>
        <div className="text-3xl text-green-400 mt-2">天</div>
        <div className="text-xl text-gray-400 mt-4">上次事故: 2025-05-01</div>
      </div>

      {/* Center: Announcements */}
      <div className="flex flex-col gap-4">
        {ANNOUNCEMENTS.map((a, i) => (
          <div key={i} className={`bg-gray-900/80 border ${levelBorder[a.level]} rounded-xl p-6 flex-1 flex flex-col gap-3`}>
            <div className="flex items-center gap-3">
              {levelIcon[a.level]}
              <span className="text-2xl font-bold text-gray-200">{a.title}</span>
            </div>
            <p className="text-xl text-gray-300 leading-relaxed">{a.content}</p>
          </div>
        ))}
      </div>

      {/* Right: Weather + Emergency */}
      <div className="flex flex-col gap-4">
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-6 flex-1 flex flex-col items-center justify-center">
          <Sun className="w-16 h-16 text-yellow-400 mb-3" />
          <div className="text-3xl font-bold text-gray-200">晴</div>
          <div className="flex items-center gap-2 mt-2">
            <ThermometerSun className="w-6 h-6 text-orange-400" />
            <span className="text-4xl font-bold text-orange-400">18°C</span>
          </div>
          <div className="text-xl text-gray-400 mt-2">湿度: 45% | 风速: 3m/s</div>
        </div>
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-6 flex-1 flex flex-col justify-center gap-4">
          <div className="text-2xl font-bold text-gray-300 flex items-center gap-2">
            <Phone className="w-6 h-6 text-red-400" /> 紧急联系
          </div>
          <div className="space-y-3 text-xl">
            <div className="flex justify-between text-gray-300">
              <span>安全主管 金晓锋</span>
              <span className="text-gray-200 font-mono">138-8888-0001</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>车间主任 马林山</span>
              <span className="text-gray-200 font-mono">138-8888-0002</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>急救电话</span>
              <span className="text-red-400 font-mono font-bold">120</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>消防电话</span>
              <span className="text-red-400 font-mono font-bold">119</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── View Definitions ───────────────────────────────────────────────────

const VIEW_LABELS = ["生产总览", "摄像头矩阵", "质量计分板", "工单进度", "安全公告"];
const VIEW_ICONS = [Factory, Camera, BarChart3, ClipboardList, Shield];
const VIEW_COMPONENTS = [ViewProductionOverview, ViewCameraMatrix, ViewQualityScoreboard, ViewWorkOrderProgress, ViewSafetyAnnouncements];

// ── Main Component ─────────────────────────────────────────────────────

export default function ShopfloorTV() {
  const [activeView, setActiveView] = useState(0);
  const [now, setNow] = useState(new Date());
  const [paused, setPaused] = useState(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real-time clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-carousel
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActiveView((v) => (v + 1) % 5);
    }, 30000);
    return () => clearInterval(id);
  }, [paused]);

  const handleDotClick = useCallback((index: number) => {
    setActiveView(index);
    setPaused(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => setPaused(false), 10000);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  const hour = now.getHours();
  const shift = hour >= 8 && hour < 20 ? "白班" : "夜班";
  const onlineCams = CAMERAS.filter((c) => c.status === "online").length;
  const ActiveViewComponent = VIEW_COMPONENTS[activeView];
  const ActiveIcon = VIEW_ICONS[activeView];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="h-16 shrink-0 bg-gray-900/90 border-b border-gray-700/50 flex items-center justify-between px-8 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Factory className="w-8 h-8 text-blue-400" />
          <span className="text-2xl font-bold tracking-wide">GRT 智能制造中枢</span>
        </div>
        <div className="flex items-center gap-8 text-lg">
          <div className="flex items-center gap-2 text-gray-300">
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="font-mono">{formatDate(now)} {formatTime(now)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-yellow-400" />
            <span>班次: <span className="font-bold text-yellow-400">{shift}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-green-400" />
            <span>在线摄像头: <span className="font-bold text-green-400">{onlineCams}</span>/{CAMERAS.length}</span>
          </div>
        </div>
      </header>

      {/* View Title Bar */}
      <div className="h-10 shrink-0 flex items-center px-8 gap-3 bg-gray-900/40">
        <ActiveIcon className="w-5 h-5 text-blue-400" />
        <span className="text-xl font-semibold text-gray-300">{VIEW_LABELS[activeView]}</span>
        {paused && <span className="text-lg text-yellow-500 ml-4">[ 已暂停 ]</span>}
      </div>

      {/* Content Area */}
      <main className="flex-1 p-4 overflow-hidden">
        <ActiveViewComponent />
      </main>

      {/* Bottom Carousel Indicator */}
      <footer className="h-12 shrink-0 flex items-center justify-center gap-6 bg-gray-900/60 border-t border-gray-700/50 relative">
        <div className="flex items-center gap-3">
          {VIEW_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => handleDotClick(i)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
                i === activeView ? "bg-white text-gray-950 font-bold" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <span className="text-lg">{label}</span>
            </button>
          ))}
        </div>
        <div className="absolute right-8 text-lg text-gray-400 font-mono">
          {activeView + 1} / 5
        </div>
      </footer>
      <FloatingNav />
    </div>
  );
}
