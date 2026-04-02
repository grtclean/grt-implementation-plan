import React, { useReducer, useRef, useCallback, useEffect, useState } from "react";
import FloatingNav from '@/components/FloatingNav';

// ═══════════════════════════════════════════════════════════════
// §1  Type Contracts — zero `any`, strict enums
// ═══════════════════════════════════════════════════════════════

type ScenarioId = "NPI" | "QUALITY" | "DELIVERY" | "IDLE";

type SandboxId =
  | "project-m0m12" | "drawing-bom" | "ai-process-twin"
  | "scheduling" | "shop-tv" | "supply-chain"
  | "customer-vip" | "approval" | "training"
  | "cost" | "payroll-perf" | "executive-kpi" | "gamification";

type DomainId = "strategy" | "manufacturing" | "commercial" | "finance";

type SandboxStatus = "dormant" | "blue" | "red" | "green" | "amber" | "purple" | "cyan" | "settled";

interface ISandboxNode {
  readonly id: SandboxId;
  readonly index: string;
  readonly title: string;
  readonly icon: string;
  readonly domain: DomainId;
  readonly status: SandboxStatus;
  readonly message: string;
  readonly kpiDelta: string;
}

interface IEventLog {
  readonly phase: "capture" | "route" | "settle" | "complete";
  readonly text: string;
  readonly delay: number;
}

interface IMetrics {
  readonly fpy: number;
  readonly prevFpy: number;
  readonly latency: number;
  readonly eventsDispatched: number;
  readonly sandboxesHit: number;
}

interface IGlobalState {
  readonly scenario: ScenarioId;
  readonly phase: "idle" | "propagating" | "complete";
  readonly sandboxes: readonly ISandboxNode[];
  readonly logs: readonly IEventLog[];
  readonly metrics: IMetrics;
}

// ═══════════════════════════════════════════════════════════════
// §2  Domain & Sandbox Registry
// ═══════════════════════════════════════════════════════════════

interface IDomainMeta {
  readonly id: DomainId;
  readonly label: string;
  readonly icon: string;
  readonly color: string;
  readonly borderColor: string;
}

const DOMAINS: readonly IDomainMeta[] = [
  { id: "strategy", label: "战略与工程域", icon: "💡", color: "text-blue-400", borderColor: "border-blue-900/40" },
  { id: "manufacturing", label: "制造与履约域", icon: "⚙️", color: "text-amber-400", borderColor: "border-amber-900/40" },
  { id: "commercial", label: "商业与协同域", icon: "🏢", color: "text-emerald-400", borderColor: "border-emerald-900/40" },
  { id: "finance", label: "组织与财务域", icon: "💰", color: "text-cyan-400", borderColor: "border-cyan-900/40" },
] as const;

const INITIAL_SANDBOXES: readonly ISandboxNode[] = [
  // Strategy & Engineering
  { id: "project-m0m12", index: "①", title: "M0-M12 项目生命周期", icon: "📐", domain: "strategy", status: "dormant", message: "待机", kpiDelta: "" },
  { id: "drawing-bom", index: "②", title: "图纸与 BOM 管理", icon: "📄", domain: "strategy", status: "dormant", message: "待机", kpiDelta: "" },
  { id: "ai-process-twin", index: "③", title: "AI 工艺数字孪生", icon: "🤖", domain: "strategy", status: "dormant", message: "待机", kpiDelta: "" },
  // Manufacturing & Fulfillment
  { id: "scheduling", index: "④", title: "生产智慧排产", icon: "🗓️", domain: "manufacturing", status: "dormant", message: "待机", kpiDelta: "" },
  { id: "shop-tv", index: "⑤", title: "车间工位 TV 大屏", icon: "🖥️", domain: "manufacturing", status: "dormant", message: "待机", kpiDelta: "" },
  { id: "supply-chain", index: "⑬", title: "供应链与仓储", icon: "🚚", domain: "manufacturing", status: "dormant", message: "待机", kpiDelta: "" },
  // Commercial & Collaboration
  { id: "customer-vip", index: "⑥", title: "客户 VIP 交互门户", icon: "👤", domain: "commercial", status: "dormant", message: "待机", kpiDelta: "" },
  { id: "approval", index: "⑫", title: "审批与协同中心", icon: "📋", domain: "commercial", status: "dormant", message: "待机", kpiDelta: "" },
  { id: "training", index: "⑪", title: "培训与认证沙盘", icon: "🎓", domain: "commercial", status: "dormant", message: "待机", kpiDelta: "" },
  // Organization & Finance
  { id: "cost", index: "⑦", title: "成本核算中心", icon: "💰", domain: "finance", status: "dormant", message: "待机", kpiDelta: "" },
  { id: "payroll-perf", index: "⑧", title: "薪酬与绩效引擎", icon: "💵", domain: "finance", status: "dormant", message: "待机", kpiDelta: "" },
  { id: "executive-kpi", index: "⑨", title: "高管 KPI 大屏", icon: "📊", domain: "finance", status: "dormant", message: "待机", kpiDelta: "" },
  { id: "gamification", index: "⑩", title: "游戏化积分中心", icon: "🎮", domain: "finance", status: "dormant", message: "待机", kpiDelta: "" },
] as const;

const INITIAL_METRICS: IMetrics = { fpy: 99.8, prevFpy: 99.8, latency: 0, eventsDispatched: 0, sandboxesHit: 0 };

const initialState: IGlobalState = {
  scenario: "IDLE",
  phase: "idle",
  sandboxes: INITIAL_SANDBOXES,
  logs: [],
  metrics: INITIAL_METRICS,
};

// ═══════════════════════════════════════════════════════════════
// §3  Reducer — deterministic EventBus
// ═══════════════════════════════════════════════════════════════

type Action =
  | { type: "START_SCENARIO"; scenario: ScenarioId }
  | { type: "ACTIVATE"; id: SandboxId; status: SandboxStatus; message: string; kpiDelta: string }
  | { type: "LOG"; entry: IEventLog }
  | { type: "METRICS"; patch: Partial<IMetrics> }
  | { type: "COMPLETE" }
  | { type: "RESET" };

function reducer(state: IGlobalState, action: Action): IGlobalState {
  switch (action.type) {
    case "START_SCENARIO":
      return { ...initialState, scenario: action.scenario, phase: "propagating" };
    case "ACTIVATE": {
      const hit = state.sandboxes.filter((s) => s.status !== "dormant").length;
      return {
        ...state,
        sandboxes: state.sandboxes.map((s) => s.id === action.id
          ? { ...s, status: action.status, message: action.message, kpiDelta: action.kpiDelta } : s),
        metrics: { ...state.metrics, eventsDispatched: state.metrics.eventsDispatched + 1, sandboxesHit: hit + 1 },
      };
    }
    case "LOG":
      return { ...state, logs: [...state.logs, action.entry] };
    case "METRICS":
      return { ...state, metrics: { ...state.metrics, ...action.patch } };
    case "COMPLETE":
      return { ...state, phase: "complete" };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════
// §4  Scenario Choreography Scripts
// ═══════════════════════════════════════════════════════════════

interface IWave {
  readonly delayMs: number;
  readonly actions: readonly Action[];
}

function buildNpiScript(): readonly IWave[] {
  return [
    { delayMs: 100, actions: [
      { type: "ACTIVATE", id: "drawing-bom", status: "blue", message: "接收核心泵组图纸 DWG-RC-ME-047，BOM 解析中...", kpiDelta: "3D模型 → 2D工程图 自动拆解" },
      { type: "LOG", entry: { phase: "capture", text: "[事件捕获] 销售合同 CT-2026-0319 签署完毕。图纸包已自动入库，启动 NPI 流程。", delay: 0 } },
    ]},
    { delayMs: 800, actions: [
      { type: "ACTIVATE", id: "ai-process-twin", status: "purple", message: "Agent 自动抽取 FMEA，生成防呆 SOP 与关键工序检查表", kpiDelta: "识别 3 项高风险工序 · 注入防呆指令" },
      { type: "ACTIVATE", id: "supply-chain", status: "amber", message: "触发缺件采购：液压密封圈×200 + 法兰盘×80", kpiDelta: "供应商 A 交期 5 天 · 已发出 PO" },
      { type: "ACTIVATE", id: "project-m0m12", status: "blue", message: "项目 P-2026-019 已创建，M0 Gate 自动通过", kpiDelta: "里程碑 M0→M3 排程已生成" },
      { type: "LOG", entry: { phase: "route", text: "[中枢路由] AI 工艺孪生已完成 FMEA 风险识别。供应链触发缺件采购 PO-2026-1547。", delay: 0 } },
    ]},
    { delayMs: 1500, actions: [
      { type: "ACTIVATE", id: "scheduling", status: "green", message: "M3 排产计划已锁定，3 条产线分配完毕", kpiDelta: "预计产能利用率 87% · 无冲突" },
      { type: "ACTIVATE", id: "shop-tv", status: "green", message: "TV 防呆预警下发完毕，A3/B1/C2 工位已就绪", kpiDelta: "3 工位 · 12 道防呆检查点已激活" },
      { type: "LOG", entry: { phase: "route", text: "[中枢路由] 工单已锁定排产，TV 终端防呆指令下发至 3 个工位。NPI 流击穿研发→制造域。", delay: 0 } },
    ]},
    { delayMs: 2200, actions: [
      { type: "ACTIVATE", id: "cost", status: "cyan", message: "NPI 项目预算 ¥380,000 已自动拆解至各工序", kpiDelta: "材料 62% · 人工 28% · 管理 10%" },
      { type: "ACTIVATE", id: "executive-kpi", status: "cyan", message: "CEO 日报新增：项目 P-2026-019 NPI 启动", kpiDelta: "本月 NPI 接单量 +1 · 累计 7 单" },
      { type: "LOG", entry: { phase: "settle", text: "[后端结算] 成本预算拆解完毕，CEO 日报已更新。NPI 全链路 7 沙盘联动完成。", delay: 0 } },
    ]},
  ];
}

function buildQualityScript(): readonly IWave[] {
  return [
    { delayMs: 100, actions: [
      { type: "ACTIVATE", id: "shop-tv", status: "red", message: "🔒 拦截！相机识别操作违规，工单 WO-0314-077 已物理锁死", kpiDelta: "A3 工位 · 法兰漏打密封胶 · 紧急" },
      { type: "LOG", entry: { phase: "capture", text: "[事件捕获] A3 工位 TV 相机触发异常。工单已物理锁死，切断作业流。", delay: 0 } },
    ]},
    { delayMs: 800, actions: [
      { type: "ACTIVATE", id: "approval", status: "amber", message: "生成《质量异常审理单 QA-2026-0887》，等待主管定夺", kpiDelta: "审批链：班组长→质量部→生产总监" },
      { type: "ACTIVATE", id: "training", status: "amber", message: "向王师傅强推《打胶规范》3D 微课与闭卷考题", kpiDelta: "微课 TC-SEAL-3D · 考试须≥85 分解锁工位" },
      { type: "ACTIVATE", id: "ai-process-twin", status: "red", message: "AI 回溯该工序历史缺陷率，更新 FMEA 风险等级", kpiDelta: "RPN 值 120→180 · 升级为 Critical" },
      { type: "LOG", entry: { phase: "route", text: "[中枢路由] 人员权限已冻结。审批单已推送主管队列。强制培训微课已派发。FMEA 风险等级已升级。", delay: 0 } },
    ]},
    { delayMs: 1500, actions: [
      { type: "ACTIVATE", id: "gamification", status: "red", message: "王师傅当期质量积分 -10 分 (86→76)", kpiDelta: "排名下降 2 位 · 触发黄色预警线" },
      { type: "ACTIVATE", id: "executive-kpi", status: "red", message: "全厂一次交验合格率 99.8% ⬇️ 98.5%", kpiDelta: "▼ 1.3pp · CEO 日报已标红预警" },
      { type: "ACTIVATE", id: "cost", status: "red", message: "返工成本 ¥2,400 + 报废 ¥800 已计入项目", kpiDelta: "项目 P-2026-019 成本偏差 +0.12%" },
      { type: "ACTIVATE", id: "payroll-perf", status: "red", message: "绩效工资系数联动核减：王师傅 1.0→0.85", kpiDelta: "触发三档绩效工资重算 · 影响当月薪资" },
      { type: "METRICS", patch: { fpy: 98.5, prevFpy: 99.8 } },
      { type: "LOG", entry: { phase: "settle", text: "[后端结算] 积分扣除、KPI 核减、成本归集、薪酬联动四路结算完毕。零人工干预。", delay: 0 } },
    ]},
  ];
}

function buildDeliveryScript(): readonly IWave[] {
  return [
    { delayMs: 100, actions: [
      { type: "ACTIVATE", id: "customer-vip", status: "green", message: "Chart 客户登录 VIP 门户，确认 FAT 验收通过", kpiDelta: "项目 P-2026-012 · 验收评分 96/100" },
      { type: "LOG", entry: { phase: "capture", text: "[事件捕获] 海外客户 Chart Industries 在 VIP 门户签署 FAT 验收报告。评分 96 分。", delay: 0 } },
    ]},
    { delayMs: 800, actions: [
      { type: "ACTIVATE", id: "project-m0m12", status: "green", message: "项目 P-2026-012 通过 M10 验收门禁，进入交付阶段", kpiDelta: "M10→M11 · 剩余尾款 30% 触发回款流程" },
      { type: "ACTIVATE", id: "approval", status: "green", message: "自动生成《出口发票与报关单》，财务总监审批中", kpiDelta: "发票金额 $185,000 · 信用证 LC 匹配" },
      { type: "ACTIVATE", id: "supply-chain", status: "green", message: "发货指令下达，木箱包装 + 海运集装箱预订", kpiDelta: "物流单 LG-2026-0447 · 预计 21 天到港" },
      { type: "LOG", entry: { phase: "route", text: "[中枢路由] M10 验收门禁自动放行。出口发票生成。物流发货指令已下达。", delay: 0 } },
    ]},
    { delayMs: 1500, actions: [
      { type: "ACTIVATE", id: "cost", status: "green", message: "项目利润核算完毕：毛利率 34.2%，超目标 2.2pp", kpiDelta: "总收入 $185K · 总成本 $121.7K · 净利 $63.3K" },
      { type: "ACTIVATE", id: "gamification", status: "green", message: "项目团队 5 人各获 +15 积分 (交付奖励)", kpiDelta: "张工 → 银牌晋级！累计 320 分" },
      { type: "ACTIVATE", id: "payroll-perf", status: "green", message: "项目奖金池 ¥28,000 已按贡献度分配至 5 人", kpiDelta: "PM 40% · 机械 25% · 电气 20% · 调试 15%" },
      { type: "LOG", entry: { phase: "route", text: "[中枢路由] 利润核算完毕。项目奖金按贡献度分配。团队积分已发放。", delay: 0 } },
    ]},
    { delayMs: 2200, actions: [
      { type: "ACTIVATE", id: "executive-kpi", status: "green", message: "季度海外交付完成率 92% → 96%", kpiDelta: "▲ 4pp · CEO 战略看板已刷新为绿色" },
      { type: "ACTIVATE", id: "training", status: "green", message: "Chart 项目最佳实践已归档为《案例微课》", kpiDelta: "自动推送至全厂相关岗位学习清单" },
      { type: "METRICS", patch: { fpy: 99.8, prevFpy: 99.8 } },
      { type: "LOG", entry: { phase: "settle", text: "[后端结算] 交付到变现全链路 9 沙盘联动完成。回款、奖金、积分、KPI 同步刷新。", delay: 0 } },
    ]},
  ];
}

function getScript(scenario: ScenarioId): readonly IWave[] {
  switch (scenario) {
    case "NPI": return buildNpiScript();
    case "QUALITY": return buildQualityScript();
    case "DELIVERY": return buildDeliveryScript();
    case "IDLE": return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// §5  CSS Keyframes (singleton injection)
// ═══════════════════════════════════════════════════════════════

const STYLE_ID = "geo2-keyframes";

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
@keyframes g2Pulse{0%,100%{box-shadow:0 0 6px var(--pulse-c,rgba(59,130,246,.4))}50%{box-shadow:0 0 24px var(--pulse-c,rgba(59,130,246,.7)),0 0 48px var(--pulse-c,rgba(59,130,246,.2))}}
@keyframes g2Glow{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes g2Scan{0%{transform:translateY(-100%)}100%{transform:translateY(500%)}}
@keyframes g2Shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-3px)}40%{transform:translateX(3px)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}
@keyframes g2Ripple{0%{transform:scale(1);opacity:.5}100%{transform:scale(2.8);opacity:0}}
@keyframes g2SlideUp{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
@keyframes g2CountUp{0%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}
@keyframes g2Border{0%,100%{border-color:var(--border-c,rgba(59,130,246,.3))}50%{border-color:var(--border-c2,rgba(59,130,246,.9))}}
@keyframes g2Breathe{0%,100%{box-shadow:inset 0 0 12px var(--breathe-c,rgba(34,197,94,.06))}50%{box-shadow:inset 0 0 28px var(--breathe-c,rgba(34,197,94,.15))}}
`;
  document.head.appendChild(el);
}

// ═══════════════════════════════════════════════════════════════
// §6  Sub-components
// ═══════════════════════════════════════════════════════════════

/* ── Animated Number ── */
function ANum({ value, d = 1, suffix = "" }: { value: number; d?: number; suffix?: string }) {
  const [cur, setCur] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 500, 1);
      setCur(from + (value - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{cur.toFixed(d)}{suffix}</>;
}

/* ── Typewriter ── */
function Typewriter({ text, delayMs }: { text: string; delayMs: number }) {
  const [show, setShow] = useState(false);
  const [n, setN] = useState(0);
  useEffect(() => { const t = setTimeout(() => setShow(true), delayMs); return () => clearTimeout(t); }, [delayMs]);
  useEffect(() => {
    if (!show || n >= text.length) return;
    const t = setTimeout(() => setN((c) => c + 1), 10);
    return () => clearTimeout(t);
  }, [show, n, text.length]);
  if (!show) return null;
  return (
    <div className="font-mono text-[11px] leading-relaxed" style={{ animation: "g2SlideUp .25s ease-out" }}>
      <span className="text-emerald-400/90">{text.slice(0, n)}</span>
      {n < text.length && <span className="inline-block w-1 h-3 bg-emerald-400 ml-px align-middle" style={{ animation: "g2Glow .5s infinite" }} />}
    </div>
  );
}

/* ── Scenario Button ── */
interface IScenarioBtn {
  readonly scenario: ScenarioId;
  readonly label: string;
  readonly icon: string;
  readonly color: string;           // tailwind ring/bg
  readonly pulseVar: string;        // CSS var for glow
}

const SCENARIO_BTNS: readonly IScenarioBtn[] = [
  { scenario: "NPI", label: "触发主线 A：图纸到炮火 (敏捷接单与排产下发流)", icon: "🚀", color: "blue", pulseVar: "rgba(59,130,246,.6)" },
  { scenario: "QUALITY", label: "触发主线 B：异常到进化 (车间 TV 识别打胶违规与拦截)", icon: "🚨", color: "red", pulseVar: "rgba(239,68,68,.6)" },
  { scenario: "DELIVERY", label: "触发主线 C：交付到变现 (Chart 客户海外验收与回款)", icon: "💵", color: "green", pulseVar: "rgba(34,197,94,.6)" },
] as const;

function ScenarioButton({ btn, active, disabled, onClick }: {
  btn: IScenarioBtn; active: boolean; disabled: boolean; onClick: () => void;
}) {
  const ringMap: Record<string, string> = {
    blue: "border-blue-500/50 hover:border-blue-400 from-blue-950 via-blue-900/60 to-blue-950",
    red: "border-red-500/50 hover:border-red-400 from-red-950 via-red-900/60 to-red-950",
    green: "border-green-500/50 hover:border-green-400 from-green-950 via-green-900/60 to-green-950",
  };
  const activeRing: Record<string, string> = {
    blue: "border-blue-400 shadow-blue-500/30",
    red: "border-red-400 shadow-red-500/30",
    green: "border-green-400 shadow-green-500/30",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-full text-left px-3.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all duration-300 overflow-hidden
        ${disabled ? "opacity-30 cursor-not-allowed border-neutral-800 bg-neutral-900"
          : active ? `bg-gradient-to-r ${ringMap[btn.color]} ${activeRing[btn.color]} shadow-lg cursor-default`
          : `bg-gradient-to-r ${ringMap[btn.color]} cursor-pointer`}
      `}
      style={!disabled && !active ? { "--pulse-c": btn.pulseVar, animation: "g2Pulse 2.5s infinite" } as React.CSSProperties : undefined}
    >
      {!disabled && !active && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[.04] to-transparent" style={{ animation: "g2Scan 2.5s linear infinite" }} />
      )}
      <span className="relative z-10 flex items-center gap-2">
        <span className="text-base">{btn.icon}</span>
        <span className={disabled ? "text-neutral-600" : "text-neutral-200"}>{btn.label}</span>
      </span>
    </button>
  );
}

/* ── Sandbox Card ── */

const STATUS_THEME: Record<SandboxStatus, {
  border: string; bg: string; text: string; dot: string; badge: string; badgeLabel: string;
  pulseVar: string; borderVar: string; breatheVar: string;
}> = {
  dormant:  { border: "border-neutral-800/50", bg: "bg-neutral-900/40", text: "text-neutral-600", dot: "bg-neutral-700", badge: "bg-neutral-800 text-neutral-500", badgeLabel: "休眠", pulseVar: "", borderVar: "", breatheVar: "" },
  blue:     { border: "border-blue-500/60", bg: "bg-blue-950/30", text: "text-blue-200", dot: "bg-blue-400", badge: "bg-blue-600 text-white", badgeLabel: "激活", pulseVar: "rgba(59,130,246,.5)", borderVar: "rgba(59,130,246,.3)", breatheVar: "rgba(59,130,246,.1)" },
  red:      { border: "border-red-500/60", bg: "bg-red-950/30", text: "text-red-200", dot: "bg-red-400", badge: "bg-red-600 text-white", badgeLabel: "警报", pulseVar: "rgba(239,68,68,.5)", borderVar: "rgba(239,68,68,.3)", breatheVar: "rgba(239,68,68,.1)" },
  green:    { border: "border-green-500/60", bg: "bg-green-950/30", text: "text-green-200", dot: "bg-green-400", badge: "bg-green-600 text-white", badgeLabel: "联动", pulseVar: "rgba(34,197,94,.5)", borderVar: "rgba(34,197,94,.3)", breatheVar: "rgba(34,197,94,.1)" },
  amber:    { border: "border-amber-500/60", bg: "bg-amber-950/30", text: "text-amber-200", dot: "bg-amber-400", badge: "bg-amber-600 text-white", badgeLabel: "响应", pulseVar: "rgba(245,158,11,.5)", borderVar: "rgba(245,158,11,.3)", breatheVar: "rgba(245,158,11,.1)" },
  purple:   { border: "border-purple-500/60", bg: "bg-purple-950/30", text: "text-purple-200", dot: "bg-purple-400", badge: "bg-purple-600 text-white", badgeLabel: "推演", pulseVar: "rgba(168,85,247,.5)", borderVar: "rgba(168,85,247,.3)", breatheVar: "rgba(168,85,247,.1)" },
  cyan:     { border: "border-cyan-500/60", bg: "bg-cyan-950/30", text: "text-cyan-200", dot: "bg-cyan-400", badge: "bg-cyan-600 text-white", badgeLabel: "结算", pulseVar: "rgba(6,182,212,.5)", borderVar: "rgba(6,182,212,.3)", breatheVar: "rgba(6,182,212,.1)" },
  settled:  { border: "border-emerald-500/60", bg: "bg-emerald-950/30", text: "text-emerald-200", dot: "bg-emerald-400", badge: "bg-emerald-600 text-white", badgeLabel: "完成", pulseVar: "rgba(16,185,129,.5)", borderVar: "rgba(16,185,129,.3)", breatheVar: "rgba(16,185,129,.1)" },
};

function SandboxCard({ node }: { node: ISandboxNode }) {
  const t = STATUS_THEME[node.status];
  const awake = node.status !== "dormant";

  return (
    <div
      className={`relative rounded-lg border ${t.border} ${t.bg} p-3 transition-all duration-500 overflow-hidden ${awake ? "opacity-100" : "opacity-40"}`}
      style={{
        ...(awake ? {
          "--pulse-c": t.pulseVar, "--border-c": t.borderVar, "--border-c2": t.pulseVar, "--breathe-c": t.breatheVar,
          animation: `${node.status === "red" ? "g2Shake .45s ease-in-out," : ""}g2Breathe 2s ease-in-out infinite`,
        } as React.CSSProperties : {}),
      }}
    >
      {/* Scanline for alert */}
      {node.status === "red" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-x-0 h-6 bg-gradient-to-b from-red-500/8 to-transparent" style={{ animation: "g2Scan 1.8s linear infinite" }} />
        </div>
      )}

      {/* Live dot */}
      {awake && (
        <span className="absolute top-2 right-2 flex items-center justify-center w-3 h-3">
          <span className={`absolute w-3 h-3 rounded-full ${t.dot}`} style={{ animation: "g2Ripple 1.8s ease-out infinite" }} />
          <span className={`relative w-2 h-2 rounded-full ${t.dot}`} />
        </span>
      )}

      {/* Header row */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm">{node.icon}</span>
        <span className="text-[9px] font-mono text-neutral-500">{node.index}</span>
        <span className={`text-[11px] font-bold truncate ${awake ? "text-neutral-100" : "text-neutral-600"}`}>{node.title}</span>
      </div>

      {/* Badge */}
      <span className={`inline-block px-1.5 py-px rounded text-[8px] font-bold tracking-wider mb-1.5 ${t.badge}`}>{t.badgeLabel}</span>

      {/* Message */}
      <div className={`text-[10px] leading-snug min-h-[28px] ${t.text}`}
        style={awake ? { animation: "g2CountUp .4s ease-out" } : undefined}
      >
        {node.message}
      </div>

      {/* KPI delta */}
      {node.kpiDelta && (
        <div className="mt-1.5 pt-1.5 border-t border-neutral-800/60 text-[9px] font-mono text-neutral-400"
          style={{ animation: "g2SlideUp .4s ease-out" }}>
          {node.kpiDelta}
        </div>
      )}
    </div>
  );
}

/* ── Domain Lane ── */
function DomainLane({ meta, sandboxes }: { meta: IDomainMeta; sandboxes: readonly ISandboxNode[] }) {
  return (
    <div className={`rounded-xl border ${meta.borderColor} bg-neutral-950/50 p-3`}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-sm">{meta.icon}</span>
        <span className={`text-[10px] font-bold tracking-wide ${meta.color}`}>{meta.label}</span>
        <span className="text-[9px] text-neutral-600 font-mono ml-auto">{sandboxes.filter((s) => s.status !== "dormant").length}/{sandboxes.length} active</span>
      </div>
      <div className={`grid gap-2.5 ${sandboxes.length <= 3 ? "grid-cols-3" : "grid-cols-4"}`}>
        {sandboxes.map((s) => <SandboxCard key={s.id} node={s} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §7  Main Component
// ═══════════════════════════════════════════════════════════════

export default function GlobalEventOrchestratorV2(): React.ReactElement {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timers = useRef<number[]>([]);
  const t0 = useRef(0);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => { injectStyles(); return () => timers.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [state.logs.length]);

  const sched = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const fire = useCallback((scenario: ScenarioId) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    t0.current = Date.now();

    dispatch({ type: "RESET" });

    sched(() => {
      dispatch({ type: "START_SCENARIO", scenario });
      const script = getScript(scenario);
      let maxDelay = 0;

      for (const wave of script) {
        maxDelay = Math.max(maxDelay, wave.delayMs);
        sched(() => {
          for (const action of wave.actions) dispatch(action);
        }, wave.delayMs);
      }

      sched(() => {
        const elapsed = Date.now() - t0.current;
        dispatch({ type: "METRICS", patch: { latency: elapsed } });
        dispatch({ type: "LOG", entry: { phase: "complete", text: `[链路闭合] 全域多米诺骨牌效应完成。${state.sandboxes.length} 沙盘可达，耗时 ${elapsed} ms，零人工干预。`, delay: 0 } });
        dispatch({ type: "COMPLETE" });
      }, maxDelay + 700);
    }, 40);
  }, [sched, state.sandboxes.length]);

  const scenarioLabel: Record<ScenarioId, string> = { NPI: "图纸到炮火", QUALITY: "异常到进化", DELIVERY: "交付到变现", IDLE: "" };
  const scenarioColor: Record<ScenarioId, string> = { NPI: "text-blue-400", QUALITY: "text-red-400", DELIVERY: "text-green-400", IDLE: "text-neutral-500" };
  const hitCount = state.sandboxes.filter((s) => s.status !== "dormant").length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-neutral-800/60 bg-neutral-950/90 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-base shadow-lg shadow-blue-900/30">{"🧠"}</div>
          <div>
            <h1 className="text-sm font-bold tracking-tight bg-gradient-to-r from-blue-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
              GRT 全域事件流转与 Agent 协同中枢 V2.0
            </h1>
            <p className="text-[10px] text-neutral-500 font-mono">Global Event-Driven Orchestrator · 13 Sandboxes · 4 Domains · State-Machine Architecture</p>
          </div>
        </div>

        <div className="flex items-center gap-5 text-[11px] font-mono">
          <div className="text-center">
            <div className="text-neutral-500">FPY</div>
            <div className={state.metrics.fpy < state.metrics.prevFpy ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
              {state.metrics.fpy < state.metrics.prevFpy && "▼ "}<ANum value={state.metrics.fpy} suffix="%" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-neutral-500">延迟</div>
            <div className="text-cyan-400 font-bold"><ANum value={state.metrics.latency} d={0} suffix=" ms" /></div>
          </div>
          <div className="text-center">
            <div className="text-neutral-500">事件</div>
            <div className="text-amber-400 font-bold"><ANum value={state.metrics.eventsDispatched} d={0} /></div>
          </div>
          <div className="text-center">
            <div className="text-neutral-500">沙盘</div>
            <div className="text-blue-400 font-bold">{hitCount}/13</div>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <span className={`w-2 h-2 rounded-full ${state.phase === "propagating" ? "bg-amber-400" : state.phase === "complete" ? "bg-emerald-400" : "bg-neutral-700"}`}
              style={state.phase === "propagating" ? { animation: "g2Glow .5s infinite" } : undefined} />
            <span className="text-neutral-400">{state.phase === "idle" ? "待机" : state.phase === "propagating" ? "传播中" : "完成"}</span>
          </div>
          {state.phase !== "idle" && (
            <button onClick={() => { timers.current.forEach(clearTimeout); timers.current = []; dispatch({ type: "RESET" }); }}
              className="px-2.5 py-1 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 transition-colors text-[10px]">
              重置
            </button>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 flex min-h-0">

        {/* ── LEFT: 30% — Scenario Silo ── */}
        <aside className="flex-shrink-0 flex flex-col border-r border-neutral-800/60 bg-neutral-950" style={{ width: "30%" }}>
          {/* Scenario matrix */}
          <div className="p-4 space-y-3 border-b border-neutral-800/40">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">Scenario Matrix</span>
              {state.scenario !== "IDLE" && (
                <span className={`text-[10px] font-bold ${scenarioColor[state.scenario]}`}>
                  {"· "}{scenarioLabel[state.scenario]}
                </span>
              )}
            </div>
            {SCENARIO_BTNS.map((btn) => (
              <ScenarioButton
                key={btn.scenario}
                btn={btn}
                active={state.scenario === btn.scenario}
                disabled={state.phase === "propagating" && state.scenario !== btn.scenario}
                onClick={() => fire(btn.scenario)}
              />
            ))}
          </div>

          {/* Architecture note */}
          <div className="px-4 py-2.5 border-b border-neutral-800/40">
            <div className="text-[9px] font-mono text-neutral-600 space-y-1">
              <div>{"// 架构原则"}</div>
              <div className="text-neutral-500">{"沙盘组件间零直接调用。"}</div>
              <div className="text-neutral-500">{"一切联动由 useReducer EventBus 驱动。"}</div>
              <div className="text-neutral-500">{"dispatch(Action) → Reducer → newState → UI"}</div>
            </div>
          </div>

          {/* Agent console */}
          <div className="flex-1 flex flex-col min-h-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">Agent Dispatch Console</span>
              <span className="text-[9px] font-mono text-emerald-700">{state.logs.length > 0 ? `${state.logs.length} entries` : ""}</span>
            </div>
            <div ref={consoleRef} className="flex-1 overflow-y-auto rounded-lg border border-neutral-800/50 bg-black/40 p-3 space-y-0.5" style={{ minHeight: 0 }}>
              {state.logs.length === 0 ? (
                <div className="text-neutral-700 text-[10px] font-mono text-center py-10">
                  {"// 选择一个战略场景以启动 Agent 编排引擎..."}
                </div>
              ) : (
                state.logs.map((log, i) => (
                  <Typewriter key={`${state.scenario}-${i}`} text={log.text} delayMs={log.delay} />
                ))
              )}
              {state.phase === "propagating" && (
                <div className="flex items-center gap-1.5 pt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "g2Glow .8s infinite" }} />
                  <span className="text-emerald-600/60 text-[9px] font-mono">NEURAL-CORE DISPATCHING...</span>
                </div>
              )}
              {state.phase === "complete" && (
                <div className="flex items-center gap-1.5 pt-2 mt-1 border-t border-neutral-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400/80 text-[9px] font-mono">CHAIN COMPLETE — ALL SANDBOXES SETTLED</span>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── RIGHT: 70% — 13 sandbox matrix ── */}
        <main className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">13-Sandbox Response Matrix</span>
            {state.phase === "complete" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40" style={{ animation: "g2CountUp .5s ease-out" }}>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-mono text-emerald-400">全链路已闭合 · {hitCount} 沙盘联动 · {state.metrics.latency}ms</span>
              </div>
            )}
          </div>

          {DOMAINS.map((dm) => (
            <DomainLane
              key={dm.id}
              meta={dm}
              sandboxes={state.sandboxes.filter((s) => s.domain === dm.id)}
            />
          ))}

          {/* Architecture explanation footer */}
          <div className="rounded-xl border border-neutral-800/30 bg-neutral-950/60 p-4 mt-2">
            <div className="text-[9px] font-mono text-neutral-600 tracking-widest uppercase mb-2">Event-Driven Architecture Principle</div>
            <div className="grid grid-cols-4 gap-4 text-[10px]">
              <div>
                <div className="text-blue-400 font-bold mb-1">{"起端 → 事件发射"}</div>
                <div className="text-neutral-500">业务事件封装为 IWorkflowEvent，通过 dispatch 广播至全局 Reducer。沙盘间零耦合。</div>
              </div>
              <div>
                <div className="text-amber-400 font-bold mb-1">{"中端 → Agent 路由"}</div>
                <div className="text-neutral-500">神经核心解析事件语义，自动派发审批、培训、采购、排产等跨域指令。</div>
              </div>
              <div>
                <div className="text-cyan-400 font-bold mb-1">{"后端 → 指标结算"}</div>
                <div className="text-neutral-500">积分、KPI、成本、薪酬四大沙盘自动结算。异常归集与奖惩实时生效。</div>
              </div>
              <div>
                <div className="text-emerald-400 font-bold mb-1">{"闭环 → 知识沉淀"}</div>
                <div className="text-neutral-500">每一次事件流转形成案例微课，自动归档至培训沙盘，驱动组织持续进化。</div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <FloatingNav />
    </div>
  );
}
