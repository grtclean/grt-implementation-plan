import React, { useReducer, useRef, useCallback, useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────
// §1  Strict TypeScript Contracts — zero `any`
// ─────────────────────────────────────────────────────────────

interface IWorkflowEvent {
  readonly id: string;
  readonly type: EventType;
  readonly source: string;
  readonly target: string;
  readonly payload: Record<string, string | number>;
  readonly timestamp: number;
}

interface IAgentAction {
  readonly phase: "capture" | "midRoute" | "settlement";
  readonly label: string;
  readonly detail: string;
  readonly delayMs: number;
}

type SandboxStatus = "dormant" | "alert" | "active" | "settled";

interface ISandboxNode {
  readonly id: string;
  readonly index: string;
  readonly title: string;
  readonly icon: string;
  readonly status: SandboxStatus;
  readonly message: string;
  readonly kpiDelta: string;
}

interface IKpiMetrics {
  readonly qualityScore: number;
  readonly prevQualityScore: number;
  readonly workerPoints: number;
  readonly prevWorkerPoints: number;
  readonly chainLatency: number;
  readonly eventsDispatched: number;
}

type EventType =
  | "ANOMALY_DETECTED"
  | "WORKSTATION_LOCKED"
  | "APPROVAL_CREATED"
  | "TRAINING_PUSHED"
  | "POINTS_DEDUCTED"
  | "KPI_RECALCULATED"
  | "COST_ADJUSTED"
  | "CHAIN_COMPLETE";

// ─────────────────────────────────────────────────────────────
// §2  Global State & Reducer (deterministic EventBus)
// ─────────────────────────────────────────────────────────────

interface IGlobalState {
  readonly phase: "idle" | "propagating" | "complete";
  readonly sandboxes: readonly ISandboxNode[];
  readonly agentLogs: readonly IAgentAction[];
  readonly events: readonly IWorkflowEvent[];
  readonly metrics: IKpiMetrics;
}

type Action =
  | { type: "TRIGGER_ANOMALY" }
  | { type: "ACTIVATE_SANDBOX"; sandboxId: string; message: string; status: SandboxStatus; kpiDelta: string }
  | { type: "APPEND_LOG"; log: IAgentAction }
  | { type: "RECORD_EVENT"; event: IWorkflowEvent }
  | { type: "UPDATE_METRICS"; patch: Partial<IKpiMetrics> }
  | { type: "CHAIN_COMPLETE" }
  | { type: "RESET" };

const INITIAL_SANDBOXES: readonly ISandboxNode[] = [
  { id: "shop-tv", index: "⑤", title: "车间工位TV大屏", icon: "🖥️", status: "dormant", message: "运行中 · 无异常", kpiDelta: "" },
  { id: "approval", index: "⑫", title: "审批与协同沙盘", icon: "📋", status: "dormant", message: "待审批队列: 0", kpiDelta: "" },
  { id: "training", index: "⑪", title: "培训认证沙盘", icon: "🎓", status: "dormant", message: "今日课程: 已完成", kpiDelta: "" },
  { id: "gamification", index: "⑩", title: "游戏化积分沙盘", icon: "🎮", status: "dormant", message: "积分系统正常", kpiDelta: "" },
  { id: "executive-kpi", index: "⑨", title: "高管 KPI 大屏", icon: "📊", status: "dormant", message: "一次交验合格率 99.8%", kpiDelta: "" },
  { id: "cost", index: "⑦", title: "成本核算沙盘", icon: "💰", status: "dormant", message: "项目成本: 在预算内", kpiDelta: "" },
] as const;

const INITIAL_METRICS: IKpiMetrics = {
  qualityScore: 99.8,
  prevQualityScore: 99.8,
  workerPoints: 86,
  prevWorkerPoints: 86,
  chainLatency: 0,
  eventsDispatched: 0,
};

const initialState: IGlobalState = {
  phase: "idle",
  sandboxes: INITIAL_SANDBOXES,
  agentLogs: [],
  events: [],
  metrics: INITIAL_METRICS,
};

function globalReducer(state: IGlobalState, action: Action): IGlobalState {
  switch (action.type) {
    case "TRIGGER_ANOMALY":
      return { ...state, phase: "propagating", agentLogs: [], events: [], metrics: { ...INITIAL_METRICS, eventsDispatched: 0 } };

    case "ACTIVATE_SANDBOX":
      return {
        ...state,
        sandboxes: state.sandboxes.map((s) =>
          s.id === action.sandboxId ? { ...s, status: action.status, message: action.message, kpiDelta: action.kpiDelta } : s,
        ),
      };

    case "APPEND_LOG":
      return { ...state, agentLogs: [...state.agentLogs, action.log] };

    case "RECORD_EVENT":
      return {
        ...state,
        events: [...state.events, action.event],
        metrics: { ...state.metrics, eventsDispatched: state.metrics.eventsDispatched + 1 },
      };

    case "UPDATE_METRICS":
      return { ...state, metrics: { ...state.metrics, ...action.patch } };

    case "CHAIN_COMPLETE":
      return { ...state, phase: "complete" };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────
// §3  Event factory
// ─────────────────────────────────────────────────────────────

let eventSeq = 0;
function mkEvent(type: EventType, source: string, target: string, payload: Record<string, string | number>): IWorkflowEvent {
  return { id: `evt-${++eventSeq}`, type, source, target, payload, timestamp: Date.now() };
}

// ─────────────────────────────────────────────────────────────
// §4  CSS keyframe injection (singleton)
// ─────────────────────────────────────────────────────────────

const GEO_STYLE_ID = "geo-keyframes";

function injectStyles(): void {
  if (document.getElementById(GEO_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = GEO_STYLE_ID;
  el.textContent = `
    @keyframes geoPulse {
      0%,100% { box-shadow: 0 0 8px rgba(239,68,68,.3); }
      50%     { box-shadow: 0 0 28px rgba(239,68,68,.8), 0 0 60px rgba(239,68,68,.3); }
    }
    @keyframes geoGlow {
      0%,100% { opacity:.6; }
      50%     { opacity:1; }
    }
    @keyframes geoScanline {
      0%   { transform: translateY(-100%); }
      100% { transform: translateY(400%); }
    }
    @keyframes geoTypewriter {
      from { width: 0; }
      to   { width: 100%; }
    }
    @keyframes geoShake {
      0%,100% { transform: translateX(0); }
      20%     { transform: translateX(-3px); }
      40%     { transform: translateX(3px); }
      60%     { transform: translateX(-2px); }
      80%     { transform: translateX(2px); }
    }
    @keyframes geoRipple {
      0%   { transform: scale(1); opacity:.6; }
      100% { transform: scale(2.5); opacity:0; }
    }
    @keyframes geoDotFlow {
      0%   { left: 0%; opacity:0; }
      10%  { opacity:1; }
      90%  { opacity:1; }
      100% { left: 100%; opacity:0; }
    }
    @keyframes geoCountUp {
      0%   { opacity:0; transform:translateY(8px); }
      100% { opacity:1; transform:translateY(0); }
    }
    @keyframes geoFlashBorder {
      0%,100% { border-color: rgba(239,68,68,.3); }
      50%     { border-color: rgba(239,68,68,1); }
    }
    @keyframes geoSlideUp {
      0%   { opacity:0; transform:translateY(16px); }
      100% { opacity:1; transform:translateY(0); }
    }
  `;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────────────────────
// §5  Sub-components
// ─────────────────────────────────────────────────────────────

/* ── Animated number counter ── */
function AnimatedNumber({ value, decimals = 1, prefix = "", suffix = "" }: {
  value: number; decimals?: number; prefix?: string; suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = performance.now();
    const dur = 600;
    const animate = (now: number) => {
      const t = Math.min((now - startRef.current) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>;
}

/* ── Typewriter text line ── */
function TypewriterLine({ text, delayMs }: { text: string; delayMs: number }) {
  const [visible, setVisible] = useState(false);
  const [chars, setChars] = useState(0);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(showTimer);
  }, [delayMs]);

  useEffect(() => {
    if (!visible) return;
    if (chars >= text.length) return;
    const t = window.setTimeout(() => setChars((c) => c + 1), 12);
    return () => clearTimeout(t);
  }, [visible, chars, text.length]);

  if (!visible) return null;
  return (
    <div className="font-mono text-xs leading-relaxed" style={{ animation: "geoSlideUp .3s ease-out" }}>
      <span className="text-emerald-400">{text.slice(0, chars)}</span>
      {chars < text.length && <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-0.5" style={{ animation: "geoGlow 0.5s infinite" }} />}
    </div>
  );
}

/* ── Agent console panel ── */
function AgentConsole({ logs }: { logs: readonly IAgentAction[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto border border-slate-700/60 rounded-lg bg-slate-950/80 p-3 space-y-1"
      style={{ minHeight: 180 }}
    >
      {logs.length === 0 && (
        <div className="text-slate-600 text-xs font-mono text-center py-8">
          {"// 等待异常事件触发..."}
        </div>
      )}
      {logs.map((log, i) => {
        const phaseColors: Record<string, string> = {
          capture: "text-red-400",
          midRoute: "text-amber-400",
          settlement: "text-cyan-400",
        };
        const phaseLabels: Record<string, string> = {
          capture: "事件捕获",
          midRoute: "中端路由",
          settlement: "后端结算",
        };
        return (
          <TypewriterLine
            key={`${log.phase}-${i}`}
            text={`> [${phaseLabels[log.phase] ?? log.phase}] ${log.detail}`}
            delayMs={log.delayMs}
          />
        );
      })}
      {logs.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "geoGlow 1s infinite" }} />
          <span className="text-emerald-500/60 text-[10px] font-mono">AGENT NEURAL-CORE ACTIVE</span>
        </div>
      )}
    </div>
  );
}

/* ── Danger trigger button ── */
function DangerTriggerButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-full py-4 px-5 rounded-xl font-bold text-sm tracking-wide
        transition-all duration-300 overflow-hidden group
        ${disabled
          ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
          : "bg-gradient-to-r from-red-950 via-red-900 to-red-950 text-red-100 border-2 border-red-600/60 hover:border-red-400 cursor-pointer"
        }
      `}
      style={disabled ? undefined : { animation: "geoPulse 2s infinite, geoFlashBorder 2s infinite" }}
    >
      {!disabled && (
        <>
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent"
            style={{ animation: "geoScanline 2s linear infinite" }} />
          <span className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ boxShadow: "0 0 40px rgba(239,68,68,.4)" }} />
        </>
      )}
      <div className="relative z-10 flex items-center gap-2 justify-center">
        <span className="text-lg">{disabled ? "⏳" : "🚨"}</span>
        <span>{disabled ? "事件传播中..." : "触发主线二：车间 TV 终端相机识别到「法兰漏打密封胶」异常"}</span>
      </div>
    </button>
  );
}

/* ── Sandbox card ── */
function SandboxCard({ node }: { node: ISandboxNode }) {
  const statusStyles: Record<SandboxStatus, string> = {
    dormant: "border-slate-700/40 bg-slate-900/60",
    alert: "border-red-500/80 bg-red-950/40",
    active: "border-amber-500/70 bg-amber-950/30",
    settled: "border-cyan-500/60 bg-cyan-950/30",
  };

  const statusGlows: Record<SandboxStatus, string> = {
    dormant: "",
    alert: "0 0 20px rgba(239,68,68,.25), inset 0 0 30px rgba(239,68,68,.08)",
    active: "0 0 20px rgba(245,158,11,.2), inset 0 0 20px rgba(245,158,11,.06)",
    settled: "0 0 20px rgba(6,182,212,.2), inset 0 0 20px rgba(6,182,212,.06)",
  };

  const statusBadge: Record<SandboxStatus, { text: string; color: string }> = {
    dormant: { text: "休眠", color: "bg-slate-700 text-slate-400" },
    alert: { text: "警报", color: "bg-red-600 text-white" },
    active: { text: "激活", color: "bg-amber-600 text-white" },
    settled: { text: "结算", color: "bg-cyan-600 text-white" },
  };

  const isAwake = node.status !== "dormant";

  return (
    <div
      className={`
        relative rounded-xl border-2 p-4 transition-all duration-500 overflow-hidden
        ${statusStyles[node.status]}
        ${isAwake ? "" : "opacity-40"}
      `}
      style={{
        boxShadow: statusGlows[node.status],
        animation: node.status === "alert" ? "geoShake .4s ease-in-out" : undefined,
      }}
    >
      {/* Scanline overlay for alert */}
      {node.status === "alert" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-red-500/10 to-transparent"
            style={{ animation: "geoScanline 1.5s linear infinite" }} />
        </div>
      )}

      {/* Ripple on activation */}
      {isAwake && (
        <div className="absolute top-3 right-3">
          <span className="absolute inline-block w-3 h-3 rounded-full bg-current"
            style={{
              color: node.status === "alert" ? "rgb(239,68,68)" : node.status === "active" ? "rgb(245,158,11)" : "rgb(6,182,212)",
              animation: "geoRipple 1.5s ease-out infinite",
            }} />
          <span className="relative inline-block w-3 h-3 rounded-full"
            style={{
              backgroundColor: node.status === "alert" ? "rgb(239,68,68)" : node.status === "active" ? "rgb(245,158,11)" : "rgb(6,182,212)",
            }} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{node.icon}</span>
        <div>
          <div className="text-[10px] font-mono text-slate-500">{node.index}</div>
          <div className={`text-sm font-semibold ${isAwake ? "text-slate-100" : "text-slate-500"}`}>{node.title}</div>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-2">
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${statusBadge[node.status].color}`}>
          {statusBadge[node.status].text}
        </span>
      </div>

      {/* Message */}
      <div className={`text-xs leading-relaxed min-h-[32px] ${
        node.status === "alert" ? "text-red-300 font-bold" :
        node.status === "active" ? "text-amber-200" :
        node.status === "settled" ? "text-cyan-200" :
        "text-slate-500"
      }`}
        style={isAwake ? { animation: "geoCountUp .5s ease-out" } : undefined}
      >
        {node.message}
      </div>

      {/* KPI delta */}
      {node.kpiDelta && (
        <div className="mt-2 pt-2 border-t border-slate-700/50 text-[11px] font-mono text-red-400"
          style={{ animation: "geoCountUp .4s ease-out" }}
        >
          {node.kpiDelta}
        </div>
      )}
    </div>
  );
}

/* ── Metrics bar ── */
function MetricsBar({ metrics, phase }: { metrics: IKpiMetrics; phase: IGlobalState["phase"] }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {([
        { label: "一次交验合格率", value: metrics.qualityScore, suffix: "%", decimals: 1,
          delta: metrics.qualityScore < metrics.prevQualityScore,
          color: metrics.qualityScore < metrics.prevQualityScore ? "text-red-400" : "text-emerald-400" },
        { label: "王师傅质量积分", value: metrics.workerPoints, suffix: " 分", decimals: 0,
          delta: metrics.workerPoints < metrics.prevWorkerPoints,
          color: metrics.workerPoints < metrics.prevWorkerPoints ? "text-red-400" : "text-emerald-400" },
        { label: "全链路耗时", value: metrics.chainLatency, suffix: " ms", decimals: 0,
          delta: false, color: phase === "complete" ? "text-cyan-400" : "text-slate-400" },
        { label: "事件已分发", value: metrics.eventsDispatched, suffix: "", decimals: 0,
          delta: false, color: metrics.eventsDispatched > 0 ? "text-amber-400" : "text-slate-400" },
      ] as const).map((m) => (
        <div key={m.label} className="bg-slate-900/60 border border-slate-700/40 rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-500 font-mono mb-1">{m.label}</div>
          <div className={`text-lg font-bold tabular-nums ${m.color}`}>
            {m.delta && <span className="text-red-500 mr-1">▼</span>}
            <AnimatedNumber value={m.value} decimals={m.decimals} suffix={m.suffix} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// §6  Main orchestrator component
// ─────────────────────────────────────────────────────────────

export default function GlobalEventOrchestrator(): React.ReactElement {
  const [state, dispatch] = useReducer(globalReducer, initialState);
  const timersRef = useRef<number[]>([]);
  const startTimeRef = useRef(0);

  useEffect(() => {
    injectStyles();
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  const handleTrigger = useCallback(() => {
    clearTimers();
    eventSeq = 0;
    startTimeRef.current = Date.now();

    // Phase 0: Reset & trigger
    dispatch({ type: "RESET" });

    // Use a micro-delay so RESET renders first
    schedule(() => {
      dispatch({ type: "TRIGGER_ANOMALY" });

      // ── Wave 1: 0ms — Shop floor TV lockdown ──
      schedule(() => {
        dispatch({
          type: "RECORD_EVENT",
          event: mkEvent("ANOMALY_DETECTED", "camera-A3", "shop-tv", { station: "A3", defect: "法兰漏打密封胶" }),
        });
        dispatch({
          type: "ACTIVATE_SANDBOX",
          sandboxId: "shop-tv",
          status: "alert",
          message: "🔒 拦截！相机识别操作违规，当前工单已物理锁死",
          kpiDelta: "工位 A3 · 工单 WO-20260314-077 已冻结",
        });
        dispatch({
          type: "RECORD_EVENT",
          event: mkEvent("WORKSTATION_LOCKED", "shop-tv", "event-bus", { stationId: "A3", orderId: "WO-20260314-077" }),
        });
        dispatch({
          type: "APPEND_LOG",
          log: { phase: "capture", label: "异常捕获", detail: "A3 工位异常。已切断生产作业流。工单 WO-20260314-077 进入物理锁死状态。", delayMs: 0 },
        });
      }, 100);

      // ── Wave 2: 800ms — Approval + Training ──
      schedule(() => {
        dispatch({
          type: "RECORD_EVENT",
          event: mkEvent("APPROVAL_CREATED", "event-bus", "approval", { formType: "质量异常审理单", priority: "urgent" }),
        });
        dispatch({
          type: "ACTIVATE_SANDBOX",
          sandboxId: "approval",
          status: "active",
          message: "生成《质量异常审理单》，等待主管定夺",
          kpiDelta: "审批单号 QA-2026-0887 · 紧急",
        });
        dispatch({
          type: "RECORD_EVENT",
          event: mkEvent("TRAINING_PUSHED", "event-bus", "training", { courseId: "TC-SEAL-3D", worker: "王师傅" }),
        });
        dispatch({
          type: "ACTIVATE_SANDBOX",
          sandboxId: "training",
          status: "active",
          message: "向王师傅强推《打胶规范》3D微课与闭卷考题",
          kpiDelta: "微课 TC-SEAL-3D · 考试须≥85分方可解锁工位",
        });
        dispatch({
          type: "APPEND_LOG",
          log: { phase: "midRoute", label: "中端路由", detail: "正在冻结人员权限，派发强制赋能考核任务...", delayMs: 0 },
        });
        dispatch({
          type: "APPEND_LOG",
          log: { phase: "midRoute", label: "中端路由", detail: "《质量异常审理单 QA-2026-0887》已推送至生产主管审批队列。", delayMs: 200 },
        });
      }, 800);

      // ── Wave 3: 1500ms — Gamification + KPI + Cost ──
      schedule(() => {
        dispatch({
          type: "RECORD_EVENT",
          event: mkEvent("POINTS_DEDUCTED", "event-bus", "gamification", { worker: "王师傅", delta: -10 }),
        });
        dispatch({
          type: "ACTIVATE_SANDBOX",
          sandboxId: "gamification",
          status: "settled",
          message: "王师傅当期质量积分 -10 分",
          kpiDelta: "86 → 76 · 排名下降 2 位 · 触发黄色预警",
        });
        dispatch({
          type: "RECORD_EVENT",
          event: mkEvent("KPI_RECALCULATED", "event-bus", "executive-kpi", { metric: "FPY", from: 99.8, to: 98.5 }),
        });
        dispatch({
          type: "ACTIVATE_SANDBOX",
          sandboxId: "executive-kpi",
          status: "settled",
          message: "全厂今日一次交验合格率 99.8% ⬇️ 98.5%",
          kpiDelta: "▼ 1.3pp · CEO 日报已标红",
        });
        dispatch({
          type: "RECORD_EVENT",
          event: mkEvent("COST_ADJUSTED", "event-bus", "cost", { reworkCost: 2400, scrapCost: 800 }),
        });
        dispatch({
          type: "ACTIVATE_SANDBOX",
          sandboxId: "cost",
          status: "settled",
          message: "返工成本 ¥2,400 + 报废 ¥800 已计入项目",
          kpiDelta: "项目 P-2026-019 成本偏差 +0.12%",
        });
        dispatch({
          type: "UPDATE_METRICS",
          patch: {
            qualityScore: 98.5,
            prevQualityScore: 99.8,
            workerPoints: 76,
            prevWorkerPoints: 86,
          },
        });
        dispatch({
          type: "APPEND_LOG",
          log: { phase: "settlement", label: "后端结算", detail: "KPI 与薪酬考核参数已自动核减。返工成本 ¥3,200 已归集至项目成本中心。", delayMs: 0 },
        });
      }, 1500);

      // ── Wave 4: 2200ms — Chain complete ──
      schedule(() => {
        const elapsed = Date.now() - startTimeRef.current;
        dispatch({ type: "UPDATE_METRICS", patch: { chainLatency: elapsed } });
        dispatch({
          type: "APPEND_LOG",
          log: { phase: "settlement", label: "后端结算", detail: `本次全链路协同耗时 ${elapsed} ms。6 大沙盘完成多米诺骨牌联动，零人工干预。`, delayMs: 0 },
        });
        dispatch({
          type: "RECORD_EVENT",
          event: mkEvent("CHAIN_COMPLETE", "event-bus", "orchestrator", { latencyMs: elapsed, sandboxesActivated: 6 }),
        });
        dispatch({ type: "CHAIN_COMPLETE" });
      }, 2200);
    }, 50);
  }, [clearTimers, schedule]);

  const handleReset = useCallback(() => {
    clearTimers();
    dispatch({ type: "RESET" });
  }, [clearTimers]);

  const activeSandboxCount = state.sandboxes.filter((s) => s.status !== "dormant").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-950 to-slate-900 text-slate-100 p-4 lg:p-6 overflow-auto">
      {/* ── Top Header ── */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-cyan-700 flex items-center justify-center text-lg shadow-lg shadow-emerald-900/30">
            {"🧠"}
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              GRT 全域事件流转引擎与 Agent 协同中枢
            </h1>
            <p className="text-[11px] text-slate-500 font-mono">
              Global Event-Driven Orchestrator · 13 Sandboxes · Zero Manual Intervention
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${state.phase === "propagating" ? "bg-amber-400" : state.phase === "complete" ? "bg-emerald-400" : "bg-slate-600"}`}
              style={state.phase === "propagating" ? { animation: "geoGlow .6s infinite" } : undefined} />
            <span className="text-slate-400">
              {state.phase === "idle" ? "待机" : state.phase === "propagating" ? "传播中" : "完成"}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500">{activeSandboxCount}/6 沙盘已激活</span>
          {state.phase !== "idle" && (
            <button onClick={handleReset} className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors">
              重置
            </button>
          )}
        </div>
      </div>

      {/* ── Metrics bar ── */}
      <div className="mb-5">
        <MetricsBar metrics={state.metrics} phase={state.phase} />
      </div>

      {/* ── Two-column battle zones ── */}
      <div className="flex gap-5" style={{ minHeight: "calc(100vh - 220px)" }}>

        {/* ── LEFT: Agent Command (35%) ── */}
        <div className="flex flex-col gap-4" style={{ width: "35%", minWidth: 340 }}>
          {/* Identity card */}
          <div className="rounded-xl border border-emerald-800/40 bg-gradient-to-b from-emerald-950/40 to-slate-950 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{"🧠"}</span>
              <span className="text-xs font-bold text-emerald-300 tracking-wide">GRT 神经网络编排中枢</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 leading-relaxed">
              监控全厂 13 大沙盘流转 · EventBus 驱动 · Agent 自治调度
            </div>
            <div className="mt-2 flex gap-2">
              {(["capture", "midRoute", "settlement"] as const).map((p) => {
                const phaseInfo: Record<string, { label: string; color: string }> = {
                  capture: { label: "起端捕获", color: "text-red-400 border-red-800/40" },
                  midRoute: { label: "中端路由", color: "text-amber-400 border-amber-800/40" },
                  settlement: { label: "后端结算", color: "text-cyan-400 border-cyan-800/40" },
                };
                const info = phaseInfo[p];
                const isActive = state.agentLogs.some((l) => l.phase === p);
                return (
                  <span key={p} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-mono ${info.color} ${isActive ? "opacity-100" : "opacity-30"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-current" : "bg-slate-700"}`}
                      style={isActive ? { animation: "geoGlow 1s infinite" } : undefined} />
                    {info.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Trigger button */}
          <DangerTriggerButton onClick={handleTrigger} disabled={state.phase === "propagating"} />

          {/* Agent console */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Agent Dispatch Console</span>
              {state.agentLogs.length > 0 && (
                <span className="text-[9px] font-mono text-emerald-600">{state.agentLogs.length} entries</span>
              )}
            </div>
            <AgentConsole logs={state.agentLogs} />
          </div>

          {/* Event trace */}
          {state.events.length > 0 && (
            <div className="rounded-lg border border-slate-800/60 bg-slate-950/60 p-3 max-h-36 overflow-y-auto">
              <div className="text-[9px] font-mono text-slate-600 mb-2 tracking-widest uppercase">Event Trace</div>
              {state.events.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-[10px] font-mono py-0.5" style={{ animation: "geoSlideUp .3s ease-out" }}>
                  <span className="text-slate-600">{e.id}</span>
                  <span className="text-emerald-500">{e.source}</span>
                  <span className="text-slate-700">{"→"}</span>
                  <span className="text-amber-500">{e.target}</span>
                  <span className="text-slate-700 ml-auto">{e.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Flow arrow ── */}
        <div className="flex flex-col items-center justify-center" style={{ width: 40 }}>
          <div className="relative h-full w-px bg-gradient-to-b from-transparent via-slate-700 to-transparent">
            {state.phase === "propagating" && (
              <>
                <div className="absolute w-2.5 h-2.5 rounded-full bg-red-500 -left-1"
                  style={{ animation: "geoDotFlow 1.2s linear infinite", top: "20%" }} />
                <div className="absolute w-2.5 h-2.5 rounded-full bg-amber-500 -left-1"
                  style={{ animation: "geoDotFlow 1.2s linear infinite .4s", top: "50%" }} />
                <div className="absolute w-2.5 h-2.5 rounded-full bg-cyan-500 -left-1"
                  style={{ animation: "geoDotFlow 1.2s linear infinite .8s", top: "80%" }} />
              </>
            )}
          </div>
          <div className="my-2 text-slate-700 text-lg" style={state.phase === "propagating" ? { animation: "geoGlow 1s infinite" } : undefined}>
            {"⚡"}
          </div>
        </div>

        {/* ── RIGHT: Sandbox response matrix (65%) ── */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Sandbox Response Matrix</span>
              <span className="text-[10px] font-mono text-slate-600">· 全景微缩沙盘</span>
            </div>
            {state.phase === "complete" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40"
                style={{ animation: "geoCountUp .5s ease-out" }}>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-mono text-emerald-400">全链路已闭合 · 多米诺骨牌效应完成</span>
              </div>
            )}
          </div>

          {/* 2×3 grid */}
          <div className="grid grid-cols-3 gap-4 flex-1 auto-rows-fr">
            {state.sandboxes.map((node) => (
              <SandboxCard key={node.id} node={node} />
            ))}
          </div>

          {/* Architecture explanation */}
          <div className="rounded-xl border border-slate-800/40 bg-slate-950/50 p-4">
            <div className="text-[10px] font-mono text-slate-600 mb-2 tracking-widest uppercase">Architecture Principle</div>
            <div className="grid grid-cols-3 gap-4 text-[11px]">
              <div>
                <div className="text-red-400 font-bold mb-1">{"起端 → 事件发射"}</div>
                <div className="text-slate-500">车间 IoT 相机捕获异常，封装为 IWorkflowEvent，通过 EventBus dispatch 广播。沙盘之间零直接依赖。</div>
              </div>
              <div>
                <div className="text-amber-400 font-bold mb-1">{"中端 → Agent 路由"}</div>
                <div className="text-slate-500">Agent 神经核心解析事件语义，自动派发审批单、推送培训微课、冻结工位权限。无需人工干预。</div>
              </div>
              <div>
                <div className="text-cyan-400 font-bold mb-1">{"后端 → 指标结算"}</div>
                <div className="text-slate-500">积分、KPI、成本三大沙盘自动响应。异常成本归集至项目，绩效考核参数实时核减。</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
