/**
 * VerticalSlicingDataLoop - GRT 系统纵向打穿：调试效能数据闭环演示舱
 *
 * Architecture: useReducer as Event Bus (zero any, full type safety)
 *
 * Three horizontal modules — a data river from left to right:
 *   Module 1 (源头): 图纸解析舱 — AI twin engine extracts debug tasks from SLDPRT
 *   Module 2 (执行): 车间防呆调试终端 — Workers complete tasks with FMEA interlocks
 *   Module 3 (结果): 高管绩效总览中心 — KPI dashboard reacts to every worker punch
 *
 * State Flow: parse → dispatch TASKS_GENERATED → worker punch → dispatch TASK_COMPLETED
 *             → KPI auto-recomputes in reducer → Module 3 animates instantly
 */
import React, {
  useReducer,
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import FloatingNav from '@/components/FloatingNav';
import {
  FileText,
  FolderOpen,
  Folder,
  Cpu,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  BarChart3,
  Activity,
  Clock,
  Shield,
  ArrowRight,
  ChevronRight,
  Wrench,
  Target,
  TrendingUp,
  Users,
  Gauge,
  Sparkles,
  Radio,
  Eye,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════
// §1  TYPE SYSTEM — Zero `any`, Full Type Safety
// ═══════════════════════════════════════════════════════════

/** Engineering asset extracted from CAD file */
interface IEngineeringAsset {
  id: string;
  fileName: string;
  fileType: "sldprt" | "sldasm" | "dxf" | "step";
  features: string[];
  criticalZones: ICriticalZone[];
  parsedAt: string | null;
}

interface ICriticalZone {
  name: string;
  riskLevel: "critical" | "high" | "medium";
  fmeaRpn: number;
  historicalDefectRate: number;
}

/** Debug task generated from engineering asset parsing */
interface IDebugTask {
  id: string;
  title: string;
  titleEn: string;
  sourceAssetId: string;
  category: "pressure_test" | "alignment" | "torque_check" | "seal_inspect" | "vibration";
  fmeaWarning: string;
  mandatoryHoldTime: number; // minutes
  targetValue: number;
  unit: string;
  tolerance: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  actualValue: number | null;
  completedAt: string | null;
  completedBy: string | null;
}

/** KPI metrics for executive dashboard */
interface IKpiMetrics {
  tasksCompletedToday: number;
  totalTasksToday: number;
  completionRate: number; // 0-100
  avgResponseTimeMin: number;
  firstPassYield: number; // 0-100
  departmentScores: IDepartmentScore[];
  dataFlowEvents: IDataFlowEvent[];
}

interface IDepartmentScore {
  id: string;
  name: string;
  score: number;
  rank: number;
  completedTasks: number;
  timestamp: string;
}

interface IDataFlowEvent {
  id: string;
  type: "parse" | "task_gen" | "punch" | "kpi_update";
  message: string;
  timestamp: string;
}

/** Global state — the single source of truth */
interface IGlobalState {
  assets: IEngineeringAsset[];
  taskQueue: IDebugTask[];
  kpi: IKpiMetrics;
  parsePhase: "idle" | "scanning" | "done";
  lastEvent: string | null;
}

// ═══════════════════════════════════════════════════════════
// §2  EVENT BUS — useReducer as deterministic state machine
// ═══════════════════════════════════════════════════════════

type GlobalAction =
  | { type: "PARSE_START" }
  | { type: "PARSE_COMPLETE"; tasks: IDebugTask[]; asset: IEngineeringAsset }
  | { type: "TASK_START"; taskId: string }
  | { type: "TASK_COMPLETED"; taskId: string; actualValue: number; workerName: string }
  | { type: "RESET" };

function createInitialState(): IGlobalState {
  return {
    assets: [
      {
        id: "asset-001",
        fileName: "夹具板_核心泵组.SLDPRT",
        fileType: "sldprt",
        features: ["法兰接口 x4", "伺服安装座 x2", "密封槽 x6", "定位销孔 x12"],
        criticalZones: [
          { name: "主泵法兰密封面", riskLevel: "critical", fmeaRpn: 280, historicalDefectRate: 12.4 },
          { name: "伺服电机安装基准", riskLevel: "high", fmeaRpn: 196, historicalDefectRate: 5.7 },
        ],
        parsedAt: null,
      },
    ],
    taskQueue: [],
    kpi: {
      tasksCompletedToday: 0,
      totalTasksToday: 0,
      completionRate: 0,
      avgResponseTimeMin: 0,
      firstPassYield: 0,
      departmentScores: [],
      dataFlowEvents: [],
    },
    parsePhase: "idle",
    lastEvent: null,
  };
}

function globalReducer(state: IGlobalState, action: GlobalAction): IGlobalState {
  const now = new Date().toISOString();

  switch (action.type) {
    case "PARSE_START":
      return {
        ...state,
        parsePhase: "scanning",
        lastEvent: "AI 孪生引擎启动扫描...",
        kpi: {
          ...state.kpi,
          dataFlowEvents: ([
            {
              id: `evt-${Date.now()}`,
              type: "parse" as const,
              message: "图纸解析引擎已激活，正在提取特征...",
              timestamp: now,
            },
            ...state.kpi.dataFlowEvents,
          ] as IDataFlowEvent[]).slice(0, 20),
        },
      };

    case "PARSE_COMPLETE": {
      const totalTasks = state.kpi.totalTasksToday + action.tasks.length;
      return {
        ...state,
        parsePhase: "done",
        assets: state.assets.map((a) =>
          a.id === action.asset.id ? { ...a, parsedAt: now } : a
        ),
        taskQueue: [...state.taskQueue, ...action.tasks],
        lastEvent: `特征提取成功！${action.tasks.length} 项强制防呆调试任务已下发至车间终端`,
        kpi: {
          ...state.kpi,
          totalTasksToday: totalTasks,
          completionRate:
            totalTasks > 0
              ? Math.round((state.kpi.tasksCompletedToday / totalTasks) * 100)
              : 0,
          dataFlowEvents: ([
            {
              id: `evt-${Date.now()}`,
              type: "task_gen" as const,
              message: `${action.tasks.length} 项调试任务已生成并下发`,
              timestamp: now,
            },
            ...state.kpi.dataFlowEvents,
          ] as IDataFlowEvent[]).slice(0, 20),
        },
      };
    }

    case "TASK_START":
      return {
        ...state,
        taskQueue: state.taskQueue.map((t) =>
          t.id === action.taskId ? { ...t, status: "in_progress" as const } : t
        ),
      };

    case "TASK_COMPLETED": {
      const completed = state.kpi.tasksCompletedToday + 1;
      const total = state.kpi.totalTasksToday;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Build updated department scores
      const existingDept = state.kpi.departmentScores.find(
        (d) => d.id === "dept-assembly-1"
      );
      const deptScore: IDepartmentScore = existingDept
        ? {
            ...existingDept,
            score: Math.min(100, existingDept.score + 8),
            completedTasks: existingDept.completedTasks + 1,
            timestamp: now,
          }
        : {
            id: "dept-assembly-1",
            name: "装配调试一组",
            score: 98,
            rank: 1,
            completedTasks: 1,
            timestamp: now,
          };

      const otherDepts = state.kpi.departmentScores.filter(
        (d) => d.id !== "dept-assembly-1"
      );

      return {
        ...state,
        taskQueue: state.taskQueue.map((t) =>
          t.id === action.taskId
            ? {
                ...t,
                status: "completed" as const,
                actualValue: action.actualValue,
                completedAt: now,
                completedBy: action.workerName,
              }
            : t
        ),
        lastEvent: `任务完工打卡！KPI 已实时更新`,
        kpi: {
          ...state.kpi,
          tasksCompletedToday: completed,
          completionRate: rate,
          avgResponseTimeMin: +(Math.random() * 5 + 2).toFixed(1),
          firstPassYield: Math.min(100, state.kpi.firstPassYield + 50),
          departmentScores: [deptScore, ...otherDepts].sort(
            (a, b) => b.score - a.score
          ),
          dataFlowEvents: ([
            {
              id: `evt-${Date.now()}`,
              type: "punch" as const,
              message: `${action.workerName} 完成 [${state.taskQueue.find((t) => t.id === action.taskId)?.title ?? "任务"}]`,
              timestamp: now,
            },
            {
              id: `evt-${Date.now()}-kpi`,
              type: "kpi_update" as const,
              message: `KPI 已刷新：达成率 ${rate}%，绩效 +8`,
              timestamp: now,
            },
            ...state.kpi.dataFlowEvents,
          ] as IDataFlowEvent[]).slice(0, 20),
        },
      };
    }

    case "RESET":
      return createInitialState();

    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════
// §3  ANIMATIONS — CSS keyframes injected once
// ═══════════════════════════════════════════════════════════

const STYLE_ID = "vertical-slicing-keyframes";
const KEYFRAMES = `
@keyframes vsPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(6,182,212,0.3); }
  50% { box-shadow: 0 0 20px rgba(6,182,212,0.6), 0 0 40px rgba(6,182,212,0.2); }
}
@keyframes vsGlow {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
@keyframes vsScan {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
@keyframes vsCountUp {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); color: #22c55e; }
  100% { transform: scale(1); }
}
@keyframes vsFlowDot {
  0% { left: 0%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}
@keyframes vsRipple {
  0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
  100% { box-shadow: 0 0 0 20px rgba(34,197,94,0); }
}
@keyframes vsSlideIn {
  0% { opacity: 0; transform: translateX(-20px); }
  100% { opacity: 1; transform: translateX(0); }
}
`;

// ═══════════════════════════════════════════════════════════
// §4  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

/** Animated number that "jumps" when value changes */
function AnimatedNumber({
  value,
  suffix = "",
  className = "",
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const prevRef = useRef(value);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (value !== prevRef.current) {
      prevRef.current = value;
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span
      className={cn("inline-block transition-all", className)}
      style={animating ? { animation: "vsCountUp 0.6s ease-out" } : undefined}
    >
      {value}
      {suffix}
    </span>
  );
}

/** Animated progress bar */
function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-300">{label}</span>
        <AnimatedNumber
          value={value}
          suffix="%"
          className="text-xs font-bold font-mono text-cyan-400"
        />
      </div>
      <div className="h-2.5 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${value}%`,
            background:
              value > 80
                ? "linear-gradient(90deg, #22c55e, #4ade80)"
                : value > 40
                  ? "linear-gradient(90deg, #06b6d4, #22d3ee)"
                  : value > 0
                    ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                    : "#374151",
          }}
        />
      </div>
    </div>
  );
}

/** Data flow arrow between modules */
function DataFlowArrow({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center w-10 shrink-0 relative">
      <div
        className={cn(
          "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500",
          active
            ? "border-cyan-500 bg-cyan-500/20"
            : "border-gray-700 bg-gray-800/50"
        )}
      >
        <ArrowRight
          className={cn(
            "h-4 w-4 transition-colors",
            active ? "text-cyan-400" : "text-gray-500"
          )}
        />
      </div>
      {active && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 overflow-hidden">
          <div
            className="absolute h-full w-3 rounded-full bg-cyan-400"
            style={{ animation: "vsFlowDot 1.5s linear infinite" }}
          />
        </div>
      )}
      <span
        className={cn(
          "text-[8px] mt-1 font-mono",
          active ? "text-cyan-500" : "text-gray-700"
        )}
      >
        EVENT
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5  MODULE 1 — 图纸解析舱 (Engineering Parse Chamber)
// ═══════════════════════════════════════════════════════════

interface Module1Props {
  assets: IEngineeringAsset[];
  parsePhase: IGlobalState["parsePhase"];
  lastEvent: string | null;
  onParse: () => void;
}

function Module1ParseChamber({ assets, parsePhase, lastEvent, onParse }: Module1Props) {
  const asset = assets[0];
  const [selectedFile, setSelectedFile] = useState("夹具板_核心泵组.SLDPRT");

  const fileTree: Array<{ name: string; type: "folder" | "file"; depth: number; ext?: string }> = [
    { name: "GRT-RC300-主轴项目", type: "folder", depth: 0 },
    { name: "M3-设计冻结", type: "folder", depth: 1 },
    { name: "3D Models", type: "folder", depth: 2 },
    { name: "夹具板_核心泵组.SLDPRT", type: "file", depth: 3, ext: "sldprt" },
    { name: "底板_支撑框架.SLDPRT", type: "file", depth: 3, ext: "sldprt" },
    { name: "管路_液压回路.SLDASM", type: "file", depth: 3, ext: "sldasm" },
    { name: "2D Drawings", type: "folder", depth: 2 },
    { name: "GRT-RC-ME-001.DXF", type: "file", depth: 3, ext: "dxf" },
    { name: "GRT-RC-ME-002.DXF", type: "file", depth: 3, ext: "dxf" },
  ];

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-gray-700 bg-[#0a0f18] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-700 bg-gradient-to-r from-blue-500/5 to-transparent">
        <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <Cpu className="h-3.5 w-3.5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xs font-bold text-gray-200">
            MODULE 1 | 图纸解析舱
          </h2>
          <p className="text-[9px] text-gray-400">Engineering Parse Chamber</p>
        </div>
        <div
          className={cn(
            "ml-auto px-2 py-0.5 rounded-full text-[9px] font-mono border",
            parsePhase === "done"
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : parsePhase === "scanning"
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                : "bg-gray-800 border-gray-700 text-gray-400"
          )}
        >
          {parsePhase === "done" ? "PARSED" : parsePhase === "scanning" ? "SCANNING..." : "STANDBY"}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* File tree */}
        <div className="w-[180px] shrink-0 border-r border-gray-700 overflow-y-auto py-2">
          {fileTree.map((node, i) => {
            const isSelected = node.type === "file" && node.name === selectedFile;
            const IconComp = node.type === "folder"
              ? (isSelected ? FolderOpen : Folder)
              : FileText;
            return (
              <button
                key={i}
                onClick={() => node.type === "file" && setSelectedFile(node.name)}
                className={cn(
                  "flex items-center gap-1.5 w-full text-left px-2 py-1 text-[10px] transition-colors",
                  isSelected
                    ? "bg-cyan-500/10 text-cyan-300 font-medium"
                    : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
                )}
                style={{ paddingLeft: `${node.depth * 12 + 8}px` }}
              >
                <IconComp
                  className={cn(
                    "h-3 w-3 shrink-0",
                    isSelected ? "text-cyan-400" : node.type === "folder" ? "text-yellow-600" : "text-gray-500"
                  )}
                />
                <span className="truncate">{node.name}</span>
              </button>
            );
          })}
        </div>

        {/* Parse panel */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          {/* Scan animation overlay */}
          {parsePhase === "scanning" && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
              <div
                className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60"
                style={{ animation: "vsScan 1.5s linear infinite" }}
              />
              <div className="absolute inset-0 bg-cyan-500/3" />
            </div>
          )}

          {parsePhase === "idle" && (
            <>
              {/* Sci-fi scan frame */}
              <div
                className="relative w-48 h-32 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center mb-4"
                style={{ animation: "vsPulse 3s ease-in-out infinite" }}
              >
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500 rounded-br" />

                <div className="text-center">
                  <Box className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-[10px] text-gray-400 font-mono">
                    {selectedFile}
                  </p>
                  <p className="text-[9px] text-gray-500 mt-0.5">
                    {asset?.features.length ?? 0} features detected
                  </p>
                </div>
              </div>

              {/* Parse button */}
              <button
                onClick={onParse}
                className="group relative px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                  animation: "vsPulse 2s ease-in-out infinite",
                }}
              >
                <span className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  启动 AI 孪生引擎解析图纸
                </span>
              </button>

              {/* Critical zones preview */}
              {asset && (
                <div className="mt-4 w-full max-w-[240px] space-y-1.5">
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider">
                    Critical Zones Detected
                  </p>
                  {asset.criticalZones.map((zone, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-2 py-1 rounded bg-red-500/5 border border-red-500/15"
                    >
                      <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-red-300 truncate">{zone.name}</p>
                        <p className="text-[9px] text-gray-400">
                          RPN {zone.fmeaRpn} | Defect {zone.historicalDefectRate}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {parsePhase === "scanning" && (
            <div className="text-center z-20">
              <div className="relative w-20 h-20 mx-auto mb-3">
                <div
                  className="absolute inset-0 rounded-full border-2 border-cyan-500/30"
                  style={{ animation: "vsRipple 1.5s ease-out infinite" }}
                />
                <div className="absolute inset-2 rounded-full border border-cyan-500/50 flex items-center justify-center bg-cyan-500/10">
                  <Radio className="h-6 w-6 text-cyan-400" style={{ animation: "vsGlow 1s ease-in-out infinite" }} />
                </div>
              </div>
              <p className="text-xs text-cyan-300 font-medium">AI 孪生引擎扫描中...</p>
              <p className="text-[10px] text-gray-400 mt-1">
                特征提取 | FMEA 关联 | 防呆规则匹配
              </p>
            </div>
          )}

          {parsePhase === "done" && lastEvent && (
            <div
              className="text-center"
              style={{ animation: "vsSlideIn 0.5s ease-out" }}
            >
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <p className="text-sm font-bold text-green-400 mb-1">
                {"✅"} {lastEvent}
              </p>
              <div className="mt-3 flex items-center gap-2 justify-center">
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">
                  <Eye className="h-3 w-3 text-cyan-400" />
                  <span className="text-[10px] text-cyan-300">特征 × {asset?.features.length ?? 0}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
                  <Shield className="h-3 w-3 text-red-400" />
                  <span className="text-[10px] text-red-300">FMEA 拦截 × {asset?.criticalZones.length ?? 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §6  MODULE 2 — 车间防呆调试终端 (Shop-floor Terminal)
// ═══════════════════════════════════════════════════════════

interface Module2Props {
  tasks: IDebugTask[];
  onStartTask: (taskId: string) => void;
  onCompleteTask: (taskId: string, actualValue: number) => void;
}

function Module2ShopFloor({ tasks, onStartTask, onCompleteTask }: Module2Props) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const handleComplete = useCallback(
    (task: IDebugTask) => {
      const raw = inputValues[task.id];
      const parsed = parseFloat(raw || "0");
      if (isNaN(parsed) || parsed <= 0) return;
      onCompleteTask(task.id, parsed);
    },
    [inputValues, onCompleteTask]
  );

  const pendingOrActive = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-gray-700 bg-[#0a0f18] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-700 bg-gradient-to-r from-amber-500/5 to-transparent">
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <Wrench className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xs font-bold text-gray-200">
            MODULE 2 | 车间防呆调试终端
          </h2>
          <p className="text-[9px] text-gray-400">Shop-floor Debugging Terminal</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-gray-400">
            待办 <span className="text-amber-400 font-bold">{pendingOrActive.length}</span>
          </span>
          <span className="text-[10px] text-gray-400">
            完工 <span className="text-green-400 font-bold">{completedTasks.length}</span>
          </span>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-gray-500" />
            </div>
            <p className="text-xs text-gray-400">等待图纸解析下发任务...</p>
            <p className="text-[10px] text-gray-500 mt-1">
              Task queue empty. Parse an asset to begin.
            </p>
          </div>
        )}

        {tasks.map((task) => {
          const isCompleted = task.status === "completed";
          const isActive = task.status === "in_progress";
          const isPending = task.status === "pending";

          return (
            <div
              key={task.id}
              className={cn(
                "rounded-lg border p-3 transition-all",
                isCompleted
                  ? "border-green-500/20 bg-green-500/5"
                  : "border-gray-700 bg-[#0d1321]"
              )}
              style={
                isPending
                  ? { animation: "vsSlideIn 0.4s ease-out" }
                  : undefined
              }
            >
              {/* Task header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  ) : (
                    <Wrench className="h-4 w-4 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <p
                      className={cn(
                        "text-xs font-bold",
                        isCompleted ? "text-green-300" : "text-gray-200"
                      )}
                    >
                      {task.title}
                    </p>
                    <p className="text-[9px] text-gray-400">{task.titleEn}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-[9px] font-mono px-1.5 py-0.5 rounded",
                    isCompleted
                      ? "bg-green-500/15 text-green-400"
                      : isActive
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-gray-800 text-gray-400"
                  )}
                >
                  {isCompleted ? "DONE" : isActive ? "ACTIVE" : "PENDING"}
                </span>
              </div>

              {/* FMEA Warning */}
              <div className="rounded-md bg-red-500/8 border border-red-500/20 px-2.5 py-1.5 mb-2">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-300 leading-relaxed">
                    {task.fmeaWarning}
                  </p>
                </div>
              </div>

              {/* Action area */}
              {!isCompleted && (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-[9px] text-gray-400 block mb-1">
                      录入实测值 ({task.unit})
                      <span className="text-gray-500 ml-1">
                        目标: {task.targetValue} {"±"} {task.tolerance}
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`实测${task.unit === "MPa" ? "压降值" : "偏差值"} ${task.unit}`}
                      value={inputValues[task.id] ?? ""}
                      onChange={(e) =>
                        setInputValues((prev) => ({
                          ...prev,
                          [task.id]: e.target.value,
                        }))
                      }
                      onFocus={() => {
                        if (task.status === "pending") onStartTask(task.id);
                      }}
                      className="w-full h-8 rounded-md border border-gray-700 bg-gray-900 px-2 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                    />
                  </div>
                  <button
                    onClick={() => handleComplete(task)}
                    disabled={!inputValues[task.id] || parseFloat(inputValues[task.id] || "0") <= 0}
                    className={cn(
                      "shrink-0 h-8 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all",
                      inputValues[task.id] && parseFloat(inputValues[task.id] || "0") > 0
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/20"
                        : "bg-gray-800 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    录入实测数据并完工打卡
                  </button>
                </div>
              )}

              {/* Completed info */}
              {isCompleted && task.actualValue !== null && (
                <div className="flex items-center gap-3 mt-1 text-[10px]">
                  <span className="text-green-400">
                    实测: {task.actualValue} {task.unit}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-300">
                    操作员: {task.completedBy}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-300">
                    {task.completedAt
                      ? new Date(task.completedAt).toLocaleTimeString("zh-CN")
                      : "—"}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §7  MODULE 3 — 高管绩效总览中心 (Executive KPI Center)
// ═══════════════════════════════════════════════════════════

interface Module3Props {
  kpi: IKpiMetrics;
  totalTasks: number;
}

function Module3ExecutiveDashboard({ kpi, totalTasks }: Module3Props) {
  const hasData = kpi.tasksCompletedToday > 0 || kpi.totalTasksToday > 0;

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-gray-700 bg-[#0a0f18] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-700 bg-gradient-to-r from-emerald-500/5 to-transparent">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xs font-bold text-gray-200">
            MODULE 3 | 高管绩效总览中心
          </h2>
          <p className="text-[9px] text-gray-400">Executive Performance Center</p>
        </div>
        <div
          className={cn(
            "ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px]",
            hasData
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-gray-800 border-gray-700 text-gray-400"
          )}
        >
          <Activity
            className="h-3 w-3"
            style={hasData ? { animation: "vsGlow 1s ease-in-out infinite" } : undefined}
          />
          {hasData ? "LIVE" : "NO DATA"}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* KPI Cards row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Completed tasks */}
          <div
            className={cn(
              "rounded-lg border p-3 text-center transition-all",
              kpi.tasksCompletedToday > 0
                ? "border-green-500/30 bg-green-500/5"
                : "border-gray-700 bg-[#0d1321]"
            )}
          >
            <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">
              今日完工调试任务
            </p>
            <AnimatedNumber
              value={kpi.tasksCompletedToday}
              className={cn(
                "text-3xl font-black font-mono",
                kpi.tasksCompletedToday > 0 ? "text-green-400" : "text-gray-700"
              )}
            />
            <p className="text-[9px] text-gray-500 mt-0.5">
              / {kpi.totalTasksToday} total
            </p>
          </div>

          {/* First pass yield */}
          <div
            className={cn(
              "rounded-lg border p-3 text-center transition-all",
              kpi.firstPassYield > 0
                ? "border-cyan-500/30 bg-cyan-500/5"
                : "border-gray-700 bg-[#0d1321]"
            )}
          >
            <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">
              一次通过率
            </p>
            <AnimatedNumber
              value={kpi.firstPassYield}
              suffix="%"
              className={cn(
                "text-3xl font-black font-mono",
                kpi.firstPassYield > 0 ? "text-cyan-400" : "text-gray-700"
              )}
            />
            <p className="text-[9px] text-gray-500 mt-0.5">
              First Pass Yield
            </p>
          </div>
        </div>

        {/* Completion rate progress bar */}
        <div className="rounded-lg border border-gray-700 bg-[#0d1321] p-3">
          <ProgressBar value={kpi.completionRate} label="任务达成率 Task Completion" />
        </div>

        {/* Response time */}
        <div className="rounded-lg border border-gray-700 bg-[#0d1321] px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[10px] text-gray-300">平均响应时间</span>
          </div>
          <span
            className={cn(
              "text-sm font-bold font-mono",
              kpi.avgResponseTimeMin > 0 ? "text-emerald-400" : "text-gray-700"
            )}
          >
            {kpi.avgResponseTimeMin > 0 ? `${kpi.avgResponseTimeMin} min` : "— min"}
          </span>
        </div>

        {/* Department scoreboard */}
        <div className="rounded-lg border border-gray-700 bg-[#0d1321] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px] text-gray-300 uppercase tracking-wider">
              部门实时绩效榜
            </span>
          </div>

          {kpi.departmentScores.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <p className="text-[10px] text-gray-500">暂无数据</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {kpi.departmentScores.map((dept, idx) => (
                <div
                  key={dept.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-gradient-to-r from-amber-500/5 to-transparent border border-amber-500/15"
                  style={{ animation: "vsSlideIn 0.5s ease-out" }}
                >
                  <span className="text-sm">
                    {idx === 0 ? "\u{1F947}" : idx === 1 ? "\u{1F948}" : "\u{1F949}"}
                  </span>
                  <span className="text-[11px] text-gray-200 font-medium flex-1">
                    {dept.name}
                  </span>
                  <span className="text-[10px] text-gray-300">
                    {dept.completedTasks} tasks
                  </span>
                  <span className="text-sm font-bold font-mono text-amber-400">
                    {dept.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live event feed */}
        <div className="rounded-lg border border-gray-700 bg-[#0d1321] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[10px] text-gray-300 uppercase tracking-wider">
              数据流实时事件
            </span>
          </div>

          <div className="space-y-1 max-h-[120px] overflow-y-auto">
            {kpi.dataFlowEvents.length === 0 ? (
              <p className="text-[10px] text-gray-500 text-center py-2">
                等待数据流...
              </p>
            ) : (
              kpi.dataFlowEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start gap-2 text-[9px]"
                  style={{ animation: "vsSlideIn 0.3s ease-out" }}
                >
                  <span
                    className={cn(
                      "shrink-0 w-1.5 h-1.5 rounded-full mt-1",
                      evt.type === "parse"
                        ? "bg-blue-400"
                        : evt.type === "task_gen"
                          ? "bg-amber-400"
                          : evt.type === "punch"
                            ? "bg-green-400"
                            : "bg-cyan-400"
                    )}
                  />
                  <span className="text-gray-300 flex-1">{evt.message}</span>
                  <span className="text-gray-500 shrink-0 font-mono">
                    {new Date(evt.timestamp).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §8  MAIN COMPONENT — Orchestrator
// ═══════════════════════════════════════════════════════════

export default function VerticalSlicingDataLoop() {
  const [state, dispatch] = useReducer(globalReducer, undefined, createInitialState);

  // Inject keyframes once
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = KEYFRAMES;
    document.head.appendChild(style);
  }, []);

  // Parse handler: simulate 1s AI scan then generate 2 tasks
  const parseTimerRef = useRef<number>(0);

  useEffect(() => () => clearTimeout(parseTimerRef.current), []);

  const handleParse = useCallback(() => {
    if (state.parsePhase === "scanning") return; // prevent double-click
    clearTimeout(parseTimerRef.current);
    dispatch({ type: "PARSE_START" });

    parseTimerRef.current = window.setTimeout(() => {
      const tasks: IDebugTask[] = [
        {
          id: `task-${Date.now()}-1`,
          title: "主泵法兰耐压测试",
          titleEn: "Main Pump Flange Pressure Test",
          sourceAssetId: "asset-001",
          category: "pressure_test",
          fmeaWarning:
            "历史漏水高发区（RPN 280），系统强制要求保压 30 分钟！法兰密封面缺陷率 12.4%，必须逐台检测。",
          mandatoryHoldTime: 30,
          targetValue: 0.05,
          unit: "MPa",
          tolerance: 0.02,
          status: "pending",
          actualValue: null,
          completedAt: null,
          completedBy: null,
        },
        {
          id: `task-${Date.now()}-2`,
          title: "伺服电机对中校准",
          titleEn: "Servo Motor Alignment Calibration",
          sourceAssetId: "asset-001",
          category: "alignment",
          fmeaWarning:
            "伺服安装基准历史偏移率 5.7%（RPN 196），对中偏差超 0.05mm 将触发振动超标！系统强制激光对中。",
          mandatoryHoldTime: 15,
          targetValue: 0.02,
          unit: "mm",
          tolerance: 0.01,
          status: "pending",
          actualValue: null,
          completedAt: null,
          completedBy: null,
        },
      ];

      dispatch({
        type: "PARSE_COMPLETE",
        tasks,
        asset: state.assets[0],
      });
    }, 1200);
  }, [state.assets, state.parsePhase]);

  const handleStartTask = useCallback(
    (taskId: string) => {
      dispatch({ type: "TASK_START", taskId });
    },
    []
  );

  const handleCompleteTask = useCallback(
    (taskId: string, actualValue: number) => {
      dispatch({
        type: "TASK_COMPLETED",
        taskId,
        actualValue,
        workerName: "张师傅 (工号 W-0042)",
      });
    },
    []
  );

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // Derive flow status for arrows
  const flow1Active = state.parsePhase === "done";
  const flow2Active = state.kpi.tasksCompletedToday > 0;

  return (
    <div className="h-full overflow-y-auto bg-neutral-950 text-gray-200">
      <div className="max-w-[1600px] mx-auto px-4 py-5">
        {/* ── Page Header ── */}
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight">
                  <span className="text-gray-100">GRT 系统纵向打穿</span>
                  <span className="text-gray-500 mx-2">|</span>
                  <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    调试效能数据闭环演示舱
                  </span>
                </h1>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Vertical Slicing Data Loop — 图纸一解析，车间一打卡，高管看板瞬间跳动
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-md text-[10px] text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300 transition-colors"
            >
              重置演示
            </button>
          </div>

          {/* Data pipeline indicator */}
          <div className="mt-3 flex items-center gap-1 text-[9px]">
            {[
              { label: "图纸解析", color: state.parsePhase === "done" ? "bg-blue-400" : "bg-gray-700" },
              { label: "→", color: "" },
              { label: "防呆任务下发", color: state.taskQueue.length > 0 ? "bg-amber-400" : "bg-gray-700" },
              { label: "→", color: "" },
              { label: "车间完工打卡", color: state.kpi.tasksCompletedToday > 0 ? "bg-green-400" : "bg-gray-700" },
              { label: "→", color: "" },
              { label: "高管 KPI 跳动", color: state.kpi.tasksCompletedToday > 0 ? "bg-cyan-400" : "bg-gray-700" },
            ].map((step, i) =>
              step.color === "" ? (
                <span key={i} className="text-gray-500 mx-0.5">
                  {step.label}
                </span>
              ) : (
                <span
                  key={i}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-900 border border-gray-700"
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", step.color)} />
                  <span className="text-gray-300">{step.label}</span>
                </span>
              )
            )}
          </div>
        </div>

        {/* ── Three-Module Data River ── */}
        <div className="flex items-stretch gap-0">
          {/* Module 1: Parse Chamber */}
          <Module1ParseChamber
            assets={state.assets}
            parsePhase={state.parsePhase}
            lastEvent={state.lastEvent}
            onParse={handleParse}
          />

          {/* Flow arrow 1→2 */}
          <DataFlowArrow active={flow1Active} />

          {/* Module 2: Shop Floor */}
          <Module2ShopFloor
            tasks={state.taskQueue}
            onStartTask={handleStartTask}
            onCompleteTask={handleCompleteTask}
          />

          {/* Flow arrow 2→3 */}
          <DataFlowArrow active={flow2Active} />

          {/* Module 3: Executive Dashboard */}
          <Module3ExecutiveDashboard
            kpi={state.kpi}
            totalTasks={state.taskQueue.length}
          />
        </div>

        {/* ── Architecture Legend ── */}
        <div className="mt-4 rounded-xl border border-gray-700 bg-[#0a0d14] px-4 py-3">
          <div className="flex items-center gap-6 flex-wrap text-[9px]">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-gray-300 font-bold">架构原理</span>
            </div>
            <div className="h-3 w-px bg-gray-800" />
            <span className="text-gray-400">
              <span className="text-blue-400 font-mono">useReducer</span> 充当全局 Event Bus
            </span>
            <div className="h-3 w-px bg-gray-800" />
            <span className="text-gray-400">
              <span className="text-amber-400 font-mono">dispatch(PARSE_COMPLETE)</span> {"→"} 车间任务瞬间出现
            </span>
            <div className="h-3 w-px bg-gray-800" />
            <span className="text-gray-400">
              <span className="text-green-400 font-mono">dispatch(TASK_COMPLETED)</span> {"→"} KPI 自动暴涨
            </span>
            <div className="h-3 w-px bg-gray-800" />
            <span className="text-gray-400">
              零 <span className="text-red-400 font-mono">any</span> | 零数据孤岛 | 一次触发全链路响应
            </span>
          </div>
        </div>
      </div>
      <FloatingNav />
    </div>
  );
}
