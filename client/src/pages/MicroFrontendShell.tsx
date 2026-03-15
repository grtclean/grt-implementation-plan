/**
 * MicroFrontendShell — 微前端协同母座 V2
 *
 * V2 升级重点：
 *   1. 强类型业务 Payload — BOM 事件携带完整物料清单
 *   2. 九宫格动态路由 — useState(activeSandbox) 真路由切换
 *   3. 跨域数据水合 — 下游沙盘从 EventBus 提取 Payload 并渲染可操作表单
 *   4. 闭环消费 — 派工单生成后清空红点
 *
 * 零 unicode escape · 零 any · 零 cross-module import · 全原生 UTF-8
 */
import React, { createContext, useContext, useCallback, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// §1  Type Contracts — 强类型业务包裹
// ═══════════════════════════════════════════════════════════════

interface IBomItem {
  readonly id: string;
  readonly name: string;
  readonly spec: string;
  readonly qty: number;
  readonly unitPrice: number;
}

type GrtEvent = "RND_BOM_RELEASED" | "MFG_QA_FAILED" | "OA_PENALTY_CREATED" | "MFG_DISPATCH_COMPLETED";

interface IEventPayload {
  readonly RND_BOM_RELEASED: {
    projectId: string;
    projectName: string;
    bomCode: string;
    engineer: string;
    bomItems: IBomItem[];
    priority: "normal" | "urgent" | "critical";
    deadline: string;
  };
  readonly MFG_QA_FAILED: {
    worker: string;
    reason: string;
    station: string;
    orderId: string;
    severity: number;
  };
  readonly OA_PENALTY_CREATED: {
    targetWorker: string;
    points: number;
    formId: string;
    reason: string;
  };
  readonly MFG_DISPATCH_COMPLETED: {
    dispatchId: string;
    projectId: string;
    itemCount: number;
    workshops: string[];
  };
}

interface IEventRecord {
  readonly id: number;
  readonly event: GrtEvent;
  readonly payload: IEventPayload[GrtEvent];
  readonly timestamp: number;
  readonly source: string;
  readonly consumed: boolean;
}

type EventCallback<E extends GrtEvent> = (payload: IEventPayload[E], record: IEventRecord) => void;

interface IGRTEventBus {
  publish<E extends GrtEvent>(event: E, payload: IEventPayload[E], source: string): void;
  subscribe<E extends GrtEvent>(event: E, callback: EventCallback<E>): () => void;
  consume(eventId: number): void;
  getUnconsumed<E extends GrtEvent>(event: E): IEventRecord[];
  readonly history: readonly IEventRecord[];
}

interface IWaffleApp {
  readonly id: SandboxId;
  readonly label: string;
  readonly icon: string;
  badge: number;
  pulse: boolean;
}

interface IAgentLogEntry {
  readonly id: number;
  readonly text: string;
  readonly level: "info" | "warn" | "error" | "success";
  readonly timestamp: number;
}

interface IOaPenaltyItem {
  readonly id: string;
  readonly title: string;
  readonly worker: string;
  readonly points: number;
  readonly reason: string;
  readonly timestamp: number;
  readonly auto: boolean;
}

type SandboxId = "RND" | "MFG" | "OA" | "HR" | "FIN" | "SCM" | "PRJ" | "STR" | "SYS";

// ═══════════════════════════════════════════════════════════════
// §2  EventBus Context — Pub/Sub + Consume 机制
// ═══════════════════════════════════════════════════════════════

const EventBusContext = createContext<IGRTEventBus | null>(null);

function useEventBus(): IGRTEventBus {
  const ctx = useContext(EventBusContext);
  if (!ctx) throw new Error("useEventBus must be used within EventBusProvider");
  return ctx;
}

function EventBusProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const seqRef = useRef(0);
  const listenersRef = useRef<Map<GrtEvent, Set<EventCallback<GrtEvent>>>>(new Map());
  const [history, setHistory] = useState<IEventRecord[]>([]);

  const subscribe = useCallback(<E extends GrtEvent>(event: E, cb: EventCallback<E>) => {
    const map = listenersRef.current;
    if (!map.has(event)) map.set(event, new Set());
    const set = map.get(event)!;
    const wrapped = cb as EventCallback<GrtEvent>;
    set.add(wrapped);
    return () => { set.delete(wrapped); };
  }, []);

  const publish = useCallback(<E extends GrtEvent>(event: E, payload: IEventPayload[E], source: string) => {
    const record: IEventRecord = { id: ++seqRef.current, event, payload, timestamp: Date.now(), source, consumed: false };
    setHistory(h => [...h, record]);
    const set = listenersRef.current.get(event);
    if (set) set.forEach(cb => cb(payload, record));
  }, []);

  const consume = useCallback((eventId: number) => {
    setHistory(h => h.map(r => r.id === eventId ? { ...r, consumed: true } : r));
  }, []);

  const getUnconsumed = useCallback(<E extends GrtEvent>(event: E): IEventRecord[] => {
    return history.filter(r => r.event === event && !r.consumed);
  }, [history]);

  const bus: IGRTEventBus = { publish, subscribe, consume, getUnconsumed, history };
  return <EventBusContext.Provider value={bus}>{children}</EventBusContext.Provider>;
}

// ═══════════════════════════════════════════════════════════════
// §3  CSS keyframes (singleton)
// ═══════════════════════════════════════════════════════════════

const MFS_STYLE_ID = "mfs-keyframes";

function injectStyles(): void {
  if (document.getElementById(MFS_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = MFS_STYLE_ID;
  el.textContent = `
@keyframes mfsPulse{0%,100%{box-shadow:0 0 4px var(--pc,rgba(59,130,246,.3))}50%{box-shadow:0 0 20px var(--pc,rgba(59,130,246,.6)),0 0 40px var(--pc,rgba(59,130,246,.15))}}
@keyframes mfsGlow{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes mfsBadgePop{0%{transform:scale(0)}60%{transform:scale(1.3)}100%{transform:scale(1)}}
@keyframes mfsShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}
@keyframes mfsSlideUp{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
@keyframes mfsScan{0%{transform:translateY(-100%)}100%{transform:translateY(500%)}}
@keyframes mfsBreathe{0%,100%{box-shadow:inset 0 0 8px var(--bc,rgba(34,197,94,.05))}50%{box-shadow:inset 0 0 24px var(--bc,rgba(34,197,94,.12))}}
@keyframes mfsDotPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
@keyframes mfsFlashGreen{0%{background:rgba(34,197,94,.2)}100%{background:transparent}}
@keyframes mfsRipple{0%{transform:scale(.95);opacity:.5}100%{transform:scale(1.05);opacity:0}}
`;
  document.head.appendChild(el);
}

// ═══════════════════════════════════════════════════════════════
// §4  Typewriter log line
// ═══════════════════════════════════════════════════════════════

function TypewriterLog({ entry }: { entry: IAgentLogEntry }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= entry.text.length) return;
    const t = setTimeout(() => setN(c => c + 1), 8);
    return () => clearTimeout(t);
  }, [n, entry.text.length]);

  const colorMap: Record<string, string> = { info: "text-cyan-400", warn: "text-amber-400", error: "text-red-400", success: "text-emerald-400" };
  return (
    <div className="font-mono text-[11px] leading-relaxed py-0.5" style={{ animation: "mfsSlideUp .25s ease-out" }}>
      <span className={colorMap[entry.level]}>{entry.text.slice(0, n)}</span>
      {n < entry.text.length && <span className="inline-block w-1 h-3 bg-current ml-px align-middle" style={{ animation: "mfsGlow .4s infinite" }} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §5  Module A — 研发设计 (Publisher) · ZERO imports from B/C
// ═══════════════════════════════════════════════════════════════

/** 真实 BOM 物料清单 — 作为 Payload 发射至全局事件总线 */
const M12_BOM_ITEMS: IBomItem[] = [
  { id: "P-8821", name: "进口高压柱塞泵", spec: "63MPa / 15L/min", qty: 1, unitPrice: 18500 },
  { id: "M-102", name: "1.5kW 伺服电机", spec: "1500rpm / IP65", qty: 1, unitPrice: 4200 },
  { id: "S-445", name: "弹性联轴器", spec: "Φ42 / 扭矩120Nm", qty: 1, unitPrice: 680 },
  { id: "F-019", name: "M12×80 高强度螺栓", spec: "12.9级 / 达克罗", qty: 8, unitPrice: 8.5 },
  { id: "G-301", name: "X-20 厌氧密封胶", spec: "50ml/支", qty: 2, unitPrice: 45 },
  { id: "R-088", name: "FKM 氟橡胶 O 型圈", spec: "Φ28×3.5", qty: 4, unitPrice: 6.5 },
];

function SandboxRND(): React.ReactElement {
  const bus = useEventBus();
  const [released, setReleased] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const timerRef = useRef<number>(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleRelease = useCallback(() => {
    if (released || releasing) return;
    setReleasing(true);
    timerRef.current = window.setTimeout(() => {
      setReleased(true);
      setReleasing(false);
      bus.publish("RND_BOM_RELEASED", {
        projectId: "WO-M12",
        projectName: "美利信新能源清洗岛 — 核心高压泵组总装",
        bomCode: "BOM-RC-ME-047",
        engineer: "李建国（高级工艺工程师）",
        bomItems: M12_BOM_ITEMS,
        priority: "urgent",
        deadline: "2026-03-28",
      }, "sandbox-rnd");
    }, 800);
  }, [bus, released, releasing]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800/50">
        <span className="text-lg">{"📐"}</span>
        <div>
          <h2 className="text-sm font-bold text-neutral-100">沙盘 A · 研发设计中心</h2>
          <p className="text-[10px] text-neutral-500 font-mono">Publisher Only · 发布 BOM 至全局事件总线 · 不知道下游是谁</p>
        </div>
      </div>

      {/* Project card */}
      <div className="rounded-lg border border-blue-900/40 bg-blue-950/20 p-4 mb-4">
        <div className="text-[10px] text-neutral-500 font-mono mb-1">当前项目</div>
        <div className="text-base font-bold text-blue-300 mb-1">WO-M12 美利信新能源清洗岛</div>
        <div className="grid grid-cols-3 gap-3 mt-3 text-[10px]">
          <div><span className="text-neutral-500">项目编码</span><br /><span className="text-neutral-300 font-mono">WO-M12</span></div>
          <div><span className="text-neutral-500">BOM 版本</span><br /><span className="text-neutral-300 font-mono">BOM-RC-ME-047 R3</span></div>
          <div><span className="text-neutral-500">负责工程师</span><br /><span className="text-neutral-300 font-mono">李建国 (PE)</span></div>
        </div>
      </div>

      {/* BOM 预览表 — 展示即将发射的 Payload */}
      <div className="rounded-lg border border-neutral-800/40 bg-neutral-900/40 p-3 mb-4 flex-1">
        <div className="text-[9px] text-neutral-600 font-mono mb-2 tracking-widest uppercase">BOM Payload Preview — 即将通过 EventBus 发射的业务数据包</div>
        <div className="overflow-hidden rounded border border-neutral-800/50">
          <div className="grid grid-cols-[60px_1fr_1fr_40px_70px] gap-px bg-neutral-800 text-[9px] text-neutral-500 font-mono">
            <div className="bg-neutral-900 px-2 py-1">编码</div>
            <div className="bg-neutral-900 px-2 py-1">名称</div>
            <div className="bg-neutral-900 px-2 py-1">规格</div>
            <div className="bg-neutral-900 px-2 py-1 text-center">数量</div>
            <div className="bg-neutral-900 px-2 py-1 text-right">单价</div>
          </div>
          {M12_BOM_ITEMS.map(item => (
            <div key={item.id} className="grid grid-cols-[60px_1fr_1fr_40px_70px] gap-px bg-neutral-800/30 text-[10px]">
              <div className="bg-neutral-950 px-2 py-1 text-cyan-400 font-mono">{item.id}</div>
              <div className="bg-neutral-950 px-2 py-1 text-neutral-200">{item.name}</div>
              <div className="bg-neutral-950 px-2 py-1 text-neutral-400">{item.spec}</div>
              <div className="bg-neutral-950 px-2 py-1 text-center text-neutral-300 font-mono">{item.qty}</div>
              <div className="bg-neutral-950 px-2 py-1 text-right text-amber-300 font-mono">¥{item.unitPrice.toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[9px] text-neutral-600 font-mono">
          共 {M12_BOM_ITEMS.length} 项物料 · 物料总价 ¥{M12_BOM_ITEMS.reduce((s, i) => s + i.qty * i.unitPrice, 0).toLocaleString()} · 优先级 urgent · 交期 2026-03-28
        </div>
      </div>

      {/* Release button */}
      <button
        onClick={handleRelease}
        disabled={released || releasing}
        className={cn(
          "relative w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-300 overflow-hidden",
          released ? "bg-emerald-950/40 border-2 border-emerald-600/50 text-emerald-300 cursor-default"
            : releasing ? "bg-blue-950/40 border-2 border-blue-600/40 text-blue-300 cursor-wait"
              : "bg-gradient-to-r from-blue-950 via-blue-900/80 to-blue-950 border-2 border-blue-500/50 text-blue-100 cursor-pointer hover:border-blue-400",
        )}
        style={!released && !releasing ? { "--pc": "rgba(59,130,246,.5)", animation: "mfsPulse 2.5s infinite" } as React.CSSProperties : undefined}
      >
        {!released && !releasing && (
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/5 to-transparent" style={{ animation: "mfsScan 2.5s linear infinite" }} />
        )}
        <span className="relative z-10">
          {released ? "BOM 已签发至全局事件总线（含 6 项物料 Payload）" : releasing ? "正在封装 Payload 并签发..." : "签发核心泵组 BOM → 携带完整物料清单发射至 EventBus"}
        </span>
      </button>
      {released && (
        <div className="mt-2 text-[10px] text-emerald-500/60 font-mono text-center" style={{ animation: "mfsSlideUp .3s ease-out" }}>
          {"publish(RND_BOM_RELEASED, { bomItems: [...6项], priority: 'urgent' }) → EventBus"}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §6  Module B — 生产制造 (Subscriber + Publisher)
//     数据水合：从 EventBus 提取 Payload → 渲染可操作表单
//     ZERO imports from Module A or C
// ═══════════════════════════════════════════════════════════════

interface IDispatchRow {
  bomItemId: string;
  name: string;
  spec: string;
  qty: number;
  unitPrice: number;
  workshop: string;
  estimatedHours: number;
}

function SandboxMFG(): React.ReactElement {
  const bus = useEventBus();

  // 来自上游的 Payload 水合数据
  const [hydratedPayload, setHydratedPayload] = useState<IEventPayload["RND_BOM_RELEASED"] | null>(null);
  const [sourceEventId, setSourceEventId] = useState<number | null>(null);

  // 可编辑的派工行（从 Payload 生成）
  const [dispatchRows, setDispatchRows] = useState<IDispatchRow[]>([]);

  // 派工完成
  const [dispatched, setDispatched] = useState(false);

  // QA 异常
  const [qaFailed, setQaFailed] = useState(false);

  // 监听 BOM 发布事件 — 实时水合
  useEffect(() => {
    const unsub = bus.subscribe("RND_BOM_RELEASED", (payload, record) => {
      setHydratedPayload(payload);
      setSourceEventId(record.id);
      // 从 Payload 生成可编辑的派工行 — 数据完全来自上游，零 mock
      setDispatchRows(payload.bomItems.map(item => ({
        bomItemId: item.id,
        name: item.name,
        spec: item.spec,
        qty: item.qty,
        unitPrice: item.unitPrice,
        workshop: "",
        estimatedHours: 0,
      })));
      setDispatched(false);
    });
    return unsub;
  }, [bus]);

  // 同时检查历史中未消费的事件（页面切换后仍可提取）
  useEffect(() => {
    if (hydratedPayload) return; // 已水合则跳过
    const unconsumed = bus.getUnconsumed("RND_BOM_RELEASED");
    if (unconsumed.length > 0) {
      const latest = unconsumed[unconsumed.length - 1];
      const payload = latest.payload as IEventPayload["RND_BOM_RELEASED"];
      setHydratedPayload(payload);
      setSourceEventId(latest.id);
      setDispatchRows(payload.bomItems.map(item => ({
        bomItemId: item.id,
        name: item.name,
        spec: item.spec,
        qty: item.qty,
        unitPrice: item.unitPrice,
        workshop: "",
        estimatedHours: 0,
      })));
    }
  }, [bus, hydratedPayload]);

  const updateRow = useCallback((bomItemId: string, field: "workshop" | "estimatedHours", value: string | number) => {
    setDispatchRows(prev => prev.map(r => r.bomItemId === bomItemId ? { ...r, [field]: value } : r));
  }, []);

  const handleDispatch = useCallback(() => {
    if (!hydratedPayload || dispatched) return;
    // 消费事件 → 清红点
    if (sourceEventId !== null) bus.consume(sourceEventId);
    setDispatched(true);

    // 通知下游：派工完成
    bus.publish("MFG_DISPATCH_COMPLETED", {
      dispatchId: `DSP-${Date.now()}`,
      projectId: hydratedPayload.projectId,
      itemCount: dispatchRows.length,
      workshops: [...new Set(dispatchRows.map(r => r.workshop).filter(Boolean))],
    }, "sandbox-mfg");
  }, [bus, hydratedPayload, sourceEventId, dispatched, dispatchRows]);

  const handleQaFail = useCallback(() => {
    if (qaFailed) return;
    setQaFailed(true);
    bus.publish("MFG_QA_FAILED", {
      worker: "王铁柱（A3 工位 T3 钳工）",
      reason: "柱塞泵法兰漏打密封胶",
      station: "A3",
      orderId: hydratedPayload?.projectId ?? "WO-M12",
      severity: 9,
    }, "sandbox-mfg");
  }, [bus, qaFailed, hydratedPayload]);

  const allAssigned = dispatchRows.length > 0 && dispatchRows.every(r => r.workshop && r.estimatedHours > 0);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800/50">
        <span className="text-lg">{"🏭"}</span>
        <div>
          <h2 className="text-sm font-bold text-neutral-100">沙盘 B · 生产制造排产中心</h2>
          <p className="text-[10px] text-neutral-500 font-mono">Subscriber + Publisher · 从 EventBus 提取 Payload 水合数据 · 零 import 上游代码</p>
        </div>
      </div>

      {/* 无事件空状态 */}
      {!hydratedPayload && (
        <div className="flex-1 flex flex-col items-center justify-center text-neutral-600">
          <span className="text-4xl mb-3">{"☕"}</span>
          <p className="text-sm font-medium text-neutral-500">当前暂无上游派发任务</p>
          <p className="text-[10px] text-neutral-700 font-mono mt-2">subscribe(RND_BOM_RELEASED) 监听中... 等待研发沙盘签发 BOM</p>
          <p className="text-[10px] text-neutral-700 font-mono">请先进入「研发设计」沙盘，点击签发按钮</p>
        </div>
      )}

      {/* 已水合 — 渲染待排产工单 */}
      {hydratedPayload && (
        <>
          {/* 指令卡片头 */}
          <div
            className={cn(
              "rounded-lg border-2 p-4 mb-4 transition-all",
              dispatched
                ? "border-emerald-600/40 bg-emerald-950/20"
                : "border-amber-500/40 bg-amber-950/10",
            )}
            style={!dispatched ? { animation: "mfsShake .4s ease-out" } : { animation: "mfsFlashGreen 1s ease-out" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("text-sm font-bold", dispatched ? "text-emerald-300" : "text-amber-300")}>
                {dispatched ? "派工单已生成并下发至 TV 大屏" : "来自研发的待办指令 — 待排产工单"}
              </span>
              {hydratedPayload.priority === "urgent" && !dispatched && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">紧急</span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3 text-[10px]">
              <div><span className="text-neutral-500">项目编号</span><br /><span className="text-neutral-300 font-mono">{hydratedPayload.projectId}</span></div>
              <div><span className="text-neutral-500">BOM 编码</span><br /><span className="text-neutral-300 font-mono">{hydratedPayload.bomCode}</span></div>
              <div><span className="text-neutral-500">签发工程师</span><br /><span className="text-neutral-300 font-mono">{hydratedPayload.engineer}</span></div>
              <div><span className="text-neutral-500">交付期限</span><br /><span className="text-red-400 font-mono font-bold">{hydratedPayload.deadline}</span></div>
            </div>
            <div className="text-[10px] text-neutral-500 mt-2">{hydratedPayload.projectName}</div>
            <div className="text-[9px] text-cyan-500/50 font-mono mt-1">
              {"← Payload 数据完全来自 EventBus.subscribe(RND_BOM_RELEASED)，未 import 任何研发模块"}
            </div>
          </div>

          {/* BOM 物料排产网格 — 带 <select> 和 <input> */}
          <div className="flex-1 rounded-lg border border-neutral-800/50 bg-neutral-900/30 overflow-hidden flex flex-col mb-4">
            <div className="grid grid-cols-[55px_1fr_0.8fr_40px_65px_100px_80px] gap-px bg-neutral-800 text-[9px] text-neutral-500 font-mono shrink-0">
              <div className="bg-neutral-900 px-2 py-1.5">编码</div>
              <div className="bg-neutral-900 px-2 py-1.5">物料名称</div>
              <div className="bg-neutral-900 px-2 py-1.5">规格</div>
              <div className="bg-neutral-900 px-2 py-1.5 text-center">数量</div>
              <div className="bg-neutral-900 px-2 py-1.5 text-right">单价</div>
              <div className="bg-neutral-900 px-2 py-1.5 text-center text-cyan-400">分配车间</div>
              <div className="bg-neutral-900 px-2 py-1.5 text-center text-cyan-400">预估工时</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {dispatchRows.map((row, idx) => (
                <div
                  key={row.bomItemId}
                  className={cn(
                    "grid grid-cols-[55px_1fr_0.8fr_40px_65px_100px_80px] gap-px text-[10px] border-b border-neutral-800/30",
                    dispatched && "opacity-70",
                  )}
                  style={{ animation: `mfsSlideUp .3s ease ${idx * 0.05}s both` }}
                >
                  <div className="bg-neutral-950 px-2 py-2 text-cyan-400 font-mono flex items-center">{row.bomItemId}</div>
                  <div className="bg-neutral-950 px-2 py-2 text-neutral-200 font-medium flex items-center">{row.name}</div>
                  <div className="bg-neutral-950 px-2 py-2 text-neutral-400 flex items-center">{row.spec}</div>
                  <div className="bg-neutral-950 px-2 py-2 text-center text-neutral-300 font-mono flex items-center justify-center">{row.qty}</div>
                  <div className="bg-neutral-950 px-2 py-2 text-right text-amber-300 font-mono flex items-center justify-end">¥{row.unitPrice.toLocaleString()}</div>
                  {/* 分配车间 — 真实 <select> */}
                  <div className="bg-neutral-950 px-1 py-1 flex items-center">
                    <select
                      value={row.workshop}
                      onChange={e => updateRow(row.bomItemId, "workshop", e.target.value)}
                      disabled={dispatched}
                      className="w-full h-6 px-1 rounded bg-neutral-800 border border-neutral-700 text-[10px] text-white focus:outline-none focus:border-cyan-500 disabled:opacity-40 transition-colors"
                    >
                      <option value="">选择...</option>
                      <option value="A1">A1 精密装配</option>
                      <option value="A3">A3 泵组总装</option>
                      <option value="B2">B2 管路焊接</option>
                      <option value="C1">C1 电控柜</option>
                    </select>
                  </div>
                  {/* 预估工时 — 真实 <input> */}
                  <div className="bg-neutral-950 px-1 py-1 flex items-center">
                    <input
                      type="number"
                      value={row.estimatedHours || ""}
                      onChange={e => updateRow(row.bomItemId, "estimatedHours", Math.max(0, parseFloat(e.target.value) || 0))}
                      disabled={dispatched}
                      placeholder="小时"
                      min={0}
                      className="w-full h-6 px-1 rounded bg-neutral-800 border border-neutral-700 text-[10px] text-white font-mono text-center focus:outline-none focus:border-cyan-500 disabled:opacity-40 transition-colors placeholder:text-neutral-600"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 py-1.5 bg-neutral-900/50 border-t border-neutral-800/40 flex items-center justify-between text-[9px] text-neutral-500 font-mono shrink-0">
              <span>共 {dispatchRows.length} 项物料 · 来源 Payload</span>
              <span>
                总工时 {dispatchRows.reduce((s, r) => s + r.estimatedHours, 0).toFixed(1)}h ·
                总成本 ¥{dispatchRows.reduce((s, r) => s + r.qty * r.unitPrice, 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* 派工按钮 */}
          {!dispatched && (
            <button
              onClick={handleDispatch}
              disabled={!allAssigned}
              className={cn(
                "relative w-full py-4 rounded-xl text-sm font-bold transition-all duration-300 overflow-hidden mb-3",
                allAssigned
                  ? "bg-gradient-to-r from-emerald-950 via-emerald-900/80 to-emerald-950 border-2 border-emerald-500/50 text-emerald-100 cursor-pointer hover:border-emerald-400"
                  : "bg-neutral-900 border-2 border-neutral-800 text-neutral-600 cursor-not-allowed",
              )}
              style={allAssigned ? { "--pc": "rgba(34,197,94,.5)", animation: "mfsPulse 2s infinite" } as React.CSSProperties : undefined}
            >
              {allAssigned && (
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/5 to-transparent" style={{ animation: "mfsScan 2s linear infinite" }} />
              )}
              <span className="relative z-10">
                {allAssigned ? "提取以上 BOM，一键生成正式派工单并下发 TV 大屏" : "请先为每项物料分配车间并填写预估工时"}
              </span>
            </button>
          )}

          {dispatched && (
            <div className="text-center mb-3" style={{ animation: "mfsSlideUp .3s ease-out" }}>
              <div className="text-emerald-400 text-sm font-bold mb-1">派工单已生成 · 红点已清除</div>
              <div className="text-[10px] text-emerald-500/50 font-mono">
                {"publish(MFG_DISPATCH_COMPLETED) + consume(eventId) → EventBus 红点归零"}
              </div>
            </div>
          )}

          {/* QA 异常模拟按钮 */}
          <button
            onClick={handleQaFail}
            disabled={!hydratedPayload || qaFailed}
            className={cn(
              "relative w-full py-3 rounded-xl text-xs font-bold transition-all overflow-hidden",
              qaFailed ? "bg-red-950/40 border-2 border-red-600/40 text-red-300 cursor-default"
                : "bg-gradient-to-r from-red-950 via-red-900/80 to-red-950 border-2 border-red-500/40 text-red-200 cursor-pointer hover:border-red-400",
            )}
            style={!qaFailed && hydratedPayload ? { "--pc": "rgba(239,68,68,.4)", animation: "mfsPulse 2.5s infinite" } as React.CSSProperties : undefined}
          >
            <span className="relative z-10">
              {qaFailed ? "质检异常已上报（王铁柱 A3 工位 · 法兰漏打密封胶）" : "模拟车间质检异常 → 触发跨域追责"}
            </span>
          </button>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §7  Module C — Smart OA (Subscriber only)
//     ZERO imports from Module A or B
// ═══════════════════════════════════════════════════════════════

function SandboxOA(): React.ReactElement {
  const bus = useEventBus();
  const [penalties, setPenalties] = useState<IOaPenaltyItem[]>([]);

  useEffect(() => {
    const unsub = bus.subscribe("MFG_QA_FAILED", (payload) => {
      const item: IOaPenaltyItem = {
        id: `PEN-${Date.now()}`,
        title: `${payload.worker} 质量事故处理单 — ${payload.reason}（${payload.station} 工位）`,
        worker: payload.worker,
        points: payload.severity >= 8 ? 5 : 3,
        reason: payload.reason,
        timestamp: Date.now(),
        auto: true,
      };
      setPenalties(prev => [item, ...prev]);
    });
    return unsub;
  }, [bus]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800/50">
        <span className="text-lg">{"📋"}</span>
        <div>
          <h2 className="text-sm font-bold text-neutral-100">沙盘 C · Smart OA 协同</h2>
          <p className="text-[10px] text-neutral-500 font-mono">Subscriber Only · 自动从 EventBus 生成追责工单 · 零 import 上下游</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">待办工单队列</span>
        {penalties.length > 0 && (
          <span className="px-1.5 py-px rounded bg-red-600 text-white text-[9px] font-bold" style={{ animation: "mfsBadgePop .3s ease-out" }}>
            {penalties.length} 新增
          </span>
        )}
      </div>

      <div className="flex-1 rounded-lg border border-neutral-800/40 bg-neutral-900/30 overflow-y-auto">
        {penalties.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-600">
            <span className="text-3xl mb-2">{"☕"}</span>
            <p className="text-xs font-mono">监听 MFG_QA_FAILED 事件中... 暂无待办工单</p>
            <p className="text-[10px] font-mono text-neutral-700 mt-1">需先在「生产制造」沙盘触发质检异常</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/40">
            {penalties.map(p => (
              <div key={p.id} className="p-3 hover:bg-neutral-800/20 transition-colors" style={{ animation: "mfsSlideUp .3s ease-out" }}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded bg-red-600/20 flex items-center justify-center text-red-400 text-[10px]">{"!"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {p.auto && <span className="px-1 py-px rounded bg-amber-600/20 text-amber-400 text-[8px] font-bold tracking-wider">系统自动生成</span>}
                      <span className="text-[9px] text-neutral-600 font-mono">{p.id}</span>
                    </div>
                    <div className="text-xs text-red-300 font-semibold">{p.title}</div>
                    <div className="text-[10px] text-neutral-500 mt-1">
                      扣除 <span className="text-red-400 font-bold">-{p.points} 分</span> · {new Date(p.timestamp).toLocaleTimeString("zh-CN")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 text-[10px] text-neutral-600 font-mono text-center">
        {"subscribe(MFG_QA_FAILED) → 自动创建追责工单 // Payload.severity ≥ 8 → 扣5分, 否则扣3分"}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §8  占位沙盘 — 其余 6 个九宫格 Tile
// ═══════════════════════════════════════════════════════════════

const PLACEHOLDER_INFO: Record<string, { name: string; desc: string }> = {
  HR: { name: "人力资源", desc: "员工全生命周期 · 薪酬打卡 · 绩效积分" },
  FIN: { name: "财务管理", desc: "项目成本核算 · 海外补贴释放 · 利润燃烧率" },
  SCM: { name: "供应链", desc: "来料检验 · 装配追溯 · 供应商评级" },
  PRJ: { name: "项目管理", desc: "M0-M12 全生命周期 · 里程碑评审 · 资源调度" },
  STR: { name: "战略规划", desc: "年度规划与预算 · OKR 分解 · 跨域仪表板" },
  SYS: { name: "系统管理", desc: "权限矩阵 · Agent 控制塔 · 沙盘编排引擎" },
};

function SandboxPlaceholder({ sandboxId }: { sandboxId: SandboxId }) {
  const info = PLACEHOLDER_INFO[sandboxId];
  if (!info) return null;
  return (
    <div className="h-full flex flex-col items-center justify-center text-neutral-600">
      <span className="text-5xl mb-4">{"🔧"}</span>
      <h2 className="text-lg font-bold text-neutral-400 mb-1">{info.name}沙盘</h2>
      <p className="text-xs text-neutral-600 mb-4">{info.desc}</p>
      <div className="px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900/50 text-[10px] text-neutral-500 font-mono">
        沙盘 {sandboxId} · EventBus 已接入 · 等待业务模块实装
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §9  九宫格菜单 — 真实路由切换
// ═══════════════════════════════════════════════════════════════

function WaffleMenu({ apps, activeSandbox, onNavigate, open, onToggle }: {
  apps: readonly IWaffleApp[];
  activeSandbox: SandboxId;
  onNavigate: (id: SandboxId) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const totalBadges = apps.reduce((a, b) => a + b.badge, 0);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="relative w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors flex items-center justify-center"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          {[0, 6, 12].map(y => [0, 6, 12].map(x => (
            <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="0.5" fill="currentColor" className="text-neutral-400" />
          )))}
        </svg>
        {totalBadges > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center"
            style={{ animation: "mfsBadgePop .3s ease-out" }}>
            {totalBadges}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 rounded-xl border border-neutral-700/60 bg-neutral-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-3 z-50"
          style={{ animation: "mfsSlideUp .2s ease-out" }}>
          <div className="text-[9px] text-neutral-500 font-mono tracking-widest uppercase mb-2 px-1">GRT 应用九宫格 — 点击切换沙盘视图</div>
          <div className="grid grid-cols-3 gap-2">
            {apps.map(app => {
              const isActive = app.id === activeSandbox;
              return (
                <button
                  key={app.id}
                  onClick={() => { onNavigate(app.id); onToggle(); }}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all duration-200",
                    isActive ? "bg-blue-600/15 border border-blue-500/30 ring-1 ring-blue-500/20" : "hover:bg-neutral-800/60 border border-transparent",
                  )}
                  style={app.pulse ? { animation: "mfsShake .4s ease-in-out" } : undefined}
                >
                  <span className="text-xl">{app.icon}</span>
                  <span className={cn("text-[10px]", isActive ? "text-blue-300 font-bold" : "text-neutral-400")}>{app.label}</span>
                  {app.badge > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1"
                      style={{ animation: "mfsBadgePop .3s ease-out, mfsGlow 1.5s infinite" }}>
                      {app.badge}
                    </span>
                  )}
                  {app.pulse && !app.badge && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500"
                      style={{ animation: "mfsDotPulse 1s infinite" }} />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-800/40 text-[9px] text-neutral-600 font-mono text-center">
            点击任意 Tile → setActiveSandbox() → 主视窗切换对应沙盘组件
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §10  Agent Copilot Panel
// ═══════════════════════════════════════════════════════════════

function AgentPanel({ logs }: { logs: readonly IAgentLogEntry[] }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (panelRef.current) panelRef.current.scrollTop = panelRef.current.scrollHeight; }, [logs.length]);

  return (
    <aside className="shrink-0 border-l border-neutral-800/60 bg-neutral-950 flex flex-col" style={{ width: 300 }}>
      <div className="p-3 border-b border-neutral-800/40">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-xs">{"🤖"}</span>
          <div>
            <div className="text-xs font-bold text-neutral-200">GRT Agent 赋能中枢</div>
            <div className="text-[9px] text-neutral-500 font-mono">Global Interceptor · Payload Inspector</div>
          </div>
        </div>
      </div>

      <div ref={panelRef} className="flex-1 overflow-y-auto p-3 space-y-1">
        {logs.length === 0 ? (
          <div className="text-neutral-700 text-[10px] font-mono text-center py-10">
            {"// Agent 正在监听全局 EventBus..."}<br />
            {"// 等待事件触发自动化编排"}
          </div>
        ) : (
          logs.map(entry => <TypewriterLog key={entry.id} entry={entry} />)
        )}
      </div>

      <div className="p-3 border-t border-neutral-800/40">
        <div className="text-[8px] font-mono text-neutral-600 space-y-0.5">
          <div className="text-neutral-500 font-bold mb-1">{"跨域数据水合拓扑"}</div>
          <div>{"研发(A) ──publish(BOM+Payload)──→  EventBus"}</div>
          <div>{"生产(B) ←subscribe──提取Payload──→  水合排产表"}</div>
          <div>{"生产(B) ──publish(QA_FAILED)───→  EventBus"}</div>
          <div>{"OA(C)   ←subscribe──自动派工单──→  追责队列"}</div>
          <div className="text-emerald-600 mt-1">{"✓ A↔B↔C 零 import · Payload 驱动数据流"}</div>
        </div>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════
// §11  App Shell — 顶层编排器
// ═══════════════════════════════════════════════════════════════

const SANDBOX_LABELS: Record<SandboxId, string> = {
  RND: "研发设计中心", MFG: "生产制造排产中心", OA: "Smart OA 协同",
  HR: "人力资源", FIN: "财务管理", SCM: "供应链",
  PRJ: "项目管理", STR: "战略规划", SYS: "系统管理",
};

const SIDEBAR_ITEMS: { id: SandboxId; label: string; icon: string }[] = [
  { id: "RND", label: "研发设计", icon: "📐" },
  { id: "MFG", label: "生产制造", icon: "🏭" },
  { id: "OA", label: "Smart OA", icon: "📋" },
  { id: "HR", label: "人力资源", icon: "👥" },
  { id: "FIN", label: "财务管理", icon: "💰" },
  { id: "SCM", label: "供应链", icon: "🚚" },
  { id: "PRJ", label: "项目管理", icon: "📊" },
  { id: "STR", label: "战略规划", icon: "🎯" },
  { id: "SYS", label: "系统管理", icon: "⚙️" },
];

function ShellInner(): React.ReactElement {
  const bus = useEventBus();
  const [activeSandbox, setActiveSandbox] = useState<SandboxId>("RND");
  const [waffleOpen, setWaffleOpen] = useState(false);
  const [agentLogs, setAgentLogs] = useState<IAgentLogEntry[]>([]);
  const logSeq = useRef(0);
  const agentTimers = useRef<number[]>([]);

  useEffect(() => () => agentTimers.current.forEach(t => clearTimeout(t)), []);

  // Waffle app badges — 由 EventBus 驱动
  const [waffleApps, setWaffleApps] = useState<IWaffleApp[]>(
    SIDEBAR_ITEMS.map(s => ({ id: s.id, label: s.label, icon: s.icon, badge: 0, pulse: false }))
  );

  const addLog = useCallback((text: string, level: IAgentLogEntry["level"]) => {
    setAgentLogs(prev => [...prev, { id: ++logSeq.current, text, level, timestamp: Date.now() }]);
  }, []);

  const delayLog = useCallback((text: string, level: IAgentLogEntry["level"], delayMs: number) => {
    const t = window.setTimeout(() => addLog(text, level), delayMs);
    agentTimers.current.push(t);
  }, [addLog]);

  // Shell-level EventBus 订阅：角标 + Agent 日志
  useEffect(() => {
    const unsub1 = bus.subscribe("RND_BOM_RELEASED", (payload) => {
      // 生产制造 Tile 亮红点
      setWaffleApps(prev => prev.map(a => a.id === "MFG" ? { ...a, badge: a.badge + 1, pulse: true } : a));
      addLog(`[EventBus] 捕获事件 RND_BOM_RELEASED · 来源: 研发设计沙盘`, "info");
      addLog(`[Payload 解析] 项目 ${payload.projectId} · BOM ${payload.bomCode} · 优先级 ${payload.priority}`, "info");
      addLog(`[Payload 物料] 共 ${payload.bomItems.length} 项: ${payload.bomItems.map(b => b.name).join("、")}`, "info");
      addLog(`[Payload 成本] 物料总价 ¥${payload.bomItems.reduce((s, b) => s + b.qty * b.unitPrice, 0).toLocaleString()} · 交期 ${payload.deadline}`, "info");
      delayLog(`[Agent 路由] 数据包已暂存至 EventBus · 九宫格【生产制造】红点 +1 · 等待生产主管提取`, "warn", 300);
    });

    const unsub2 = bus.subscribe("MFG_QA_FAILED", (payload) => {
      setWaffleApps(prev => prev.map(a => a.id === "OA" ? { ...a, badge: a.badge + 1, pulse: true } : a));
      addLog(`[EventBus] 捕获事件 MFG_QA_FAILED · 来源: 生产车间`, "error");
      addLog(`[Agent 拦截] 重大质量违规！${payload.worker} · ${payload.reason} · 严重度 S=${payload.severity}`, "error");
      delayLog(`[Agent RAG] 检索知识图谱《密封胶操作规范 SOP-SEAL-003》命中`, "warn", 500);
      delayLog(`[Agent 跨域] 自动向 Smart OA 派发追责工单 · 九宫格【OA】红点 +1`, "error", 900);
      const t = window.setTimeout(() => {
        bus.publish("OA_PENALTY_CREATED", {
          targetWorker: payload.worker,
          points: payload.severity >= 8 ? 5 : 3,
          formId: `PEN-${Date.now()}`,
          reason: payload.reason,
        }, "agent-interceptor");
      }, 1000);
      agentTimers.current.push(t);
    });

    const unsub3 = bus.subscribe("OA_PENALTY_CREATED", (payload) => {
      addLog(`[OA 结算] 追责工单 ${payload.formId} · ${payload.targetWorker} 扣除 ${payload.points} 分 · 原因: ${payload.reason}`, "info");
    });

    const unsub4 = bus.subscribe("MFG_DISPATCH_COMPLETED", (payload) => {
      // 清除生产制造红点
      setWaffleApps(prev => prev.map(a => a.id === "MFG" ? { ...a, badge: 0, pulse: false } : a));
      addLog(`[EventBus] 捕获事件 MFG_DISPATCH_COMPLETED · 派工单 ${payload.dispatchId}`, "success");
      addLog(`[Agent 确认] 项目 ${payload.projectId} · ${payload.itemCount} 项物料 · 分配至车间 ${payload.workshops.join("/")} · 红点已清除`, "success");
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [bus, addLog, delayLog]);

  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* ── Top Navbar ── */}
      <nav className="shrink-0 h-11 flex items-center justify-between px-4 border-b border-neutral-800/60 bg-neutral-950/95 backdrop-blur z-40">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-900/20">G</div>
          <span className="text-sm font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">GRT System</span>
          <span className="text-[10px] text-neutral-500 font-mono hidden lg:inline">Micro-Frontend Shell · 跨域数据水合引擎 V2</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] text-neutral-500 font-mono">
            <span className="text-neutral-600">App Shell</span>
            <span className="mx-1.5 text-neutral-700">/</span>
            <span className="text-neutral-300">{SANDBOX_LABELS[activeSandbox]}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-800/60 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "mfsGlow 1.5s infinite" }} />
            <span className="text-neutral-400">{bus.history.length} events</span>
          </div>
          <WaffleMenu
            apps={waffleApps}
            activeSandbox={activeSandbox}
            onNavigate={setActiveSandbox}
            open={waffleOpen}
            onToggle={() => setWaffleOpen(o => !o)}
          />
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar — 全部 9 个沙盘导航 */}
        <aside className="shrink-0 w-48 border-r border-neutral-800/60 bg-neutral-950 flex flex-col">
          <div className="p-3 border-b border-neutral-800/30">
            <div className="text-[9px] font-mono text-neutral-600 tracking-widest uppercase">沙盘导航 · 点击切换</div>
          </div>
          <div className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {SIDEBAR_ITEMS.map(item => {
              const isActive = item.id === activeSandbox;
              const app = waffleApps.find(a => a.id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSandbox(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200",
                    isActive ? "bg-blue-600/15 text-blue-300 font-semibold" : "text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200",
                  )}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {app && app.badge > 0 && (
                    <span className="min-w-[18px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1"
                      style={{ animation: "mfsBadgePop .3s ease-out" }}>
                      {app.badge}
                    </span>
                  )}
                  {app && app.pulse && !app?.badge && (
                    <span className="w-2 h-2 rounded-full bg-red-500" style={{ animation: "mfsDotPulse 1s infinite" }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Event Trace */}
          <div className="p-3 border-t border-neutral-800/30">
            <div className="text-[8px] font-mono text-neutral-600 tracking-widest uppercase mb-1.5">Event Trace</div>
            <div className="space-y-0.5 max-h-36 overflow-y-auto">
              {bus.history.slice(-10).map(r => (
                <div key={r.id} className="text-[9px] font-mono flex items-center gap-1" style={{ animation: "mfsSlideUp .2s ease-out" }}>
                  <span className="text-neutral-700">#{r.id}</span>
                  <span className={cn(
                    r.event === "RND_BOM_RELEASED" ? "text-blue-500" :
                      r.event === "MFG_QA_FAILED" ? "text-red-500" :
                        r.event === "MFG_DISPATCH_COMPLETED" ? "text-emerald-500" : "text-amber-500",
                  )}>
                    {r.event.replace(/_/g, " ").slice(0, 18)}
                  </span>
                  {r.consumed && <span className="text-neutral-700 text-[8px]">✓</span>}
                </div>
              ))}
              {bus.history.length === 0 && <div className="text-neutral-700 text-[9px] font-mono">{"—"}</div>}
            </div>
          </div>
        </aside>

        {/* Main content — 动态路由出口 */}
        <main className="flex-1 p-5 overflow-y-auto">
          <div className="max-w-3xl mx-auto h-full">
            {activeSandbox === "RND" && <SandboxRND />}
            {activeSandbox === "MFG" && <SandboxMFG />}
            {activeSandbox === "OA" && <SandboxOA />}
            {activeSandbox !== "RND" && activeSandbox !== "MFG" && activeSandbox !== "OA" && (
              <SandboxPlaceholder sandboxId={activeSandbox} />
            )}
          </div>
        </main>

        {/* Agent panel */}
        <AgentPanel logs={agentLogs} />
      </div>

      {/* ── Bottom status bar ── */}
      <footer className="shrink-0 h-7 flex items-center justify-between px-4 border-t border-neutral-800/40 bg-neutral-950/90 text-[9px] font-mono text-neutral-600">
        <div className="flex items-center gap-4">
          <span>EventBus: <span className="text-emerald-500">Context Pub/Sub + Consume</span></span>
          <span>九宫格路由: <span className="text-cyan-500">useState(activeSandbox) 真路由</span></span>
          <span>数据水合: <span className="text-amber-500">Payload → 下游表单渲染</span></span>
        </div>
        <div>GRT System V5.0 · 跨域数据水合引擎</div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §12  Top-level export
// ═══════════════════════════════════════════════════════════════

export default function MicroFrontendShell(): React.ReactElement {
  useEffect(() => { injectStyles(); }, []);

  return (
    <EventBusProvider>
      <ShellInner />
    </EventBusProvider>
  );
}
