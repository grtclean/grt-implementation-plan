/**
 * GlobalAppShell — GRT 工业 OS 母座与 SOP 编排沙盘
 *
 * Architecture:
 *   TopBar     — Global project context lock (currentProjectId)
 *   LeftNav    — 12-sandbox icon rail
 *   Center     — Interactive SOP form with real <input> fields
 *   Right      — RAG copilot: listens to Context, injects back into form
 *
 * Communication: ONLY through GlobalShellContext (useReducer).
 * Sandbox never imports AI logic. Copilot never imports sandbox internals.
 */
import React, {
  createContext, useContext, useReducer, useCallback,
  useState, useEffect, useRef, useMemo, memo,
} from "react";
import {
  Globe, ChevronDown, Lock, Search, Brain, Zap, Sparkles,
  AlertTriangle, FileText, CheckCircle2, Package, Wrench,
  Bot, Layers, Activity, Clock, Link2, ArrowRight, Info,
  Radio, X, Settings, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import FloatingNav from '@/components/FloatingNav';

// ═══════════════════════════════════════════════════════════
// §1  TYPE SYSTEM — Zero `any`
// ═══════════════════════════════════════════════════════════

interface IProject {
  id: string;
  code: string;
  name: string;
  customer: string;
  phase: string;
  bu: string;
}

interface IKnowledgeNode {
  id: string;
  type: "fmea" | "bom" | "sop" | "plm" | "defect" | "field_insight";
  sourceTable: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  detail: string;
  linkedSandbox: string;
  actionLabel: string;
  actionPayload: IInjectionPayload;
}

interface IInjectionPayload {
  targetRowId: string;
  targetField: "material" | "specialProcess" | "qualityNote" | "tooling";
  value: string;
  source: string;
  confidence: number;
}

type ShellAction =
  | { type: "SET_PROJECT"; project: IProject | null }
  | { type: "SET_KEYWORD"; keyword: string }
  | { type: "CLEAR_KEYWORD" }
  | { type: "INJECT_DATA"; payload: IInjectionPayload }
  | { type: "CLEAR_INJECTION" }
  | { type: "SET_SANDBOX"; sandboxId: string };

interface IGlobalState {
  currentProject: IProject | null;
  focusedKeyword: string;
  activeSandboxId: string;
  injectedData: IInjectionPayload | null;
}

interface IGlobalContext {
  state: IGlobalState;
  dispatch: React.Dispatch<ShellAction>;
  setFocusedKeyword: (kw: string) => void;
  clearInjection: () => void;
}

// ═══════════════════════════════════════════════════════════
// §2  CONTEXT & REDUCER
// ═══════════════════════════════════════════════════════════

const INITIAL_STATE: IGlobalState = {
  currentProject: null,
  focusedKeyword: "",
  activeSandboxId: "ai-process-twin",
  injectedData: null,
};

function shellReducer(state: IGlobalState, action: ShellAction): IGlobalState {
  switch (action.type) {
    case "SET_PROJECT":
      return { ...state, currentProject: action.project, focusedKeyword: "", injectedData: null };
    case "SET_KEYWORD":
      return { ...state, focusedKeyword: action.keyword };
    case "CLEAR_KEYWORD":
      return { ...state, focusedKeyword: "" };
    case "INJECT_DATA":
      return { ...state, injectedData: action.payload };
    case "CLEAR_INJECTION":
      return { ...state, injectedData: null };
    case "SET_SANDBOX":
      return { ...state, activeSandboxId: action.sandboxId, focusedKeyword: "", injectedData: null };
    default:
      return state;
  }
}

const GlobalShellContext = createContext<IGlobalContext | null>(null);

function useShell(): IGlobalContext {
  const ctx = useContext(GlobalShellContext);
  if (!ctx) throw new Error("useShell must be used within GlobalAppShell");
  return ctx;
}

// ═══════════════════════════════════════════════════════════
// §3  DEMO DATA — native UTF-8 Chinese
// ═══════════════════════════════════════════════════════════

const DEMO_PROJECTS: IProject[] = [
  { id: "PRJ-001", code: "WO-M12-001", name: "美利信 8800T 超大型压铸岛清洗系统", customer: "重庆美利信科技", phase: "M6-联调", bu: "USC" },
  { id: "PRJ-002", code: "WO-M12-002", name: "Chart Industries Cleaning Machine", customer: "Chart Industries (US)", phase: "M4-安装", bu: "USC" },
  { id: "PRJ-003", code: "WO-M12-003", name: "华为南京半导体清洗线", customer: "华为技术", phase: "M2-设计", bu: "SPR" },
];

const SANDBOX_MENU: { id: string; num: number; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; title?: string }> }[] = [
  { id: "annual-planning", num: 1, label: "年度规划", icon: Target },
  { id: "payroll", num: 2, label: "薪酬打卡", icon: Clock },
  { id: "performance", num: 3, label: "绩效积分", icon: Activity },
  { id: "hr-lifecycle", num: 4, label: "HR生命周期", icon: Layers },
  { id: "project-lifecycle", num: 5, label: "项目 M0-M12", icon: FileText },
  { id: "quoting-bom", num: 6, label: "报价 BOM", icon: Package },
  { id: "mech-elec", num: 7, label: "机电标准", icon: Settings },
  { id: "cost-labor", num: 8, label: "成本报工", icon: Activity },
  { id: "customer", num: 9, label: "客户档案", icon: Globe },
  { id: "acceptance", num: 10, label: "验收追踪", icon: CheckCircle2 },
  { id: "production", num: 11, label: "生产排产", icon: Wrench },
  { id: "ai-process-twin", num: 12, label: "AI 工艺孪生", icon: Brain },
];

// ─── RAG Knowledge Base (keyword → IKnowledgeNode[]) ───

const RAG_KNOWLEDGE_BASE: Record<string, IKnowledgeNode[]> = {
  "柱塞泵": [
    {
      id: "KN-001", type: "fmea", sourceTable: "fmeaItems",
      title: "穿透底层图谱发现：美利信襄阳项目曾因【柱塞泵】底座不平导致异响！",
      severity: "critical",
      detail: "fmeaItems #47：柱塞泵键槽加工后毛刺残留，装配后在 2000rpm 以上产生异响。RPN=192 (S=8, O=6, D=4)。根因：转子柱塞泵键槽未做去毛刺工序。建议增加千分表对中打表工序。",
      linkedSandbox: "ai-process-twin",
      actionLabel: "一键将打表要求反写回左侧对应工序的 Quality Note 中",
      actionPayload: {
        targetRowId: "R4",
        targetField: "qualityNote",
        value: "【防呆工序】键槽去毛刺打磨 — 粗糙度 Ra≤0.8μm，打磨后必须100%目视+千分表对中检查，异常即拦截。关联 FMEA #47 RPN=192。",
        source: "fmeaItems #47 + shopFloorDefectLogs",
        confidence: 0.94,
      },
    },
    {
      id: "KN-002", type: "defect", sourceTable: "shopFloorDefectLogs",
      title: "车间缺陷记录：柱塞泵装配后泄漏率 12%",
      severity: "high",
      detail: "shopFloorDefectLogs：近 90 天内柱塞泵装配工序缺陷率 12% (34/283)，主要失效模式：O-Ring 压缩不足 (58%)、键槽定位偏移 (25%)、轴封划伤 (17%)。",
      linkedSandbox: "production",
      actionLabel: "将 O-Ring 质量预警注入 Quality Note",
      actionPayload: {
        targetRowId: "R4",
        targetField: "qualityNote",
        value: "【质量预警】柱塞泵装配缺陷率 12%。必须增加 O-Ring 压缩量检测工序 (Cpk≥1.33)。",
        source: "shopFloorDefectLogs 聚合",
        confidence: 0.91,
      },
    },
    {
      id: "KN-003", type: "bom", sourceTable: "bomItems",
      title: "BOM 关联：柱塞泵总成包含 3 关键件",
      severity: "medium",
      detail: "bomItems：柱塞泵总成 (MTL-PUMP-ASSY-01) 包含柱塞体、转子、密封组件。当前 BOM 版本 V3.2，最后 ECO: ECO-2026-018 (密封材料升级)。",
      linkedSandbox: "quoting-bom",
      actionLabel: "将 BOM 版本信息注入物料列",
      actionPayload: {
        targetRowId: "R4",
        targetField: "material",
        value: "柱塞泵总成 MTL-PUMP-ASSY-01 V3.2 (ECO-2026-018)",
        source: "bomItems + bomVersions",
        confidence: 0.98,
      },
    },
  ],
  "喷淋压力": [
    {
      id: "KN-010", type: "fmea", sourceTable: "fmeaItems",
      title: "FMEA：喷淋压力波动超限 RPN=180",
      severity: "critical",
      detail: "fmeaItems #1：喷淋压力波动超限导致清洁度不达标。S=9, O=5, D=4。根因：泵组密封老化/滤芯堵塞。建议增加压力传感器自动巡检。",
      linkedSandbox: "ai-process-twin",
      actionLabel: "注入压力监控 SOP 至 Quality Note",
      actionPayload: {
        targetRowId: "R3",
        targetField: "qualityNote",
        value: "【防呆工序】每班开机前校准压力传感器，运行中压力波动超±0.2bar即自动停机报警。关联 FMEA #1 RPN=180。",
        source: "fmeaItems #1",
        confidence: 0.92,
      },
    },
  ],
  "清洗剂": [
    {
      id: "KN-020", type: "field_insight", sourceTable: "fieldInsights",
      title: "现场反馈：KW-40 清洗剂在低温环境析出结晶",
      severity: "high",
      detail: "fieldInsights #12：Chart Industries 美国现场反馈，KW-40 清洗剂在 5°C 以下出现结晶，堵塞喷嘴。建议低温项目更换为 KW-50 低温型。",
      linkedSandbox: "customer",
      actionLabel: "将低温预警注入 Quality Note",
      actionPayload: {
        targetRowId: "R2",
        targetField: "qualityNote",
        value: "【现场预警】KW-40 在 5°C 以下析出结晶。若客户现场为低温环境，须更换为 KW-50 低温型清洗剂。",
        source: "fieldInsights #12",
        confidence: 0.88,
      },
    },
  ],
};

// Fuzzy keyword match: find entries containing the keyword
function ragSearch(keyword: string): IKnowledgeNode[] {
  const kw = keyword.trim();
  if (kw.length < 2) return [];
  // Exact match first
  if (RAG_KNOWLEDGE_BASE[kw]) return RAG_KNOWLEDGE_BASE[kw];
  // Fuzzy: check if keyword appears in any key
  for (const [key, nodes] of Object.entries(RAG_KNOWLEDGE_BASE)) {
    if (key.includes(kw) || kw.includes(key)) return nodes;
  }
  return [];
}

// ═══════════════════════════════════════════════════════════
// §4  KEYFRAME INJECTION
// ═══════════════════════════════════════════════════════════

const SHELL_STYLE_ID = "grt-appshell-fx";

function injectShellStyles(): void {
  if (document.getElementById(SHELL_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = SHELL_STYLE_ID;
  el.textContent = `
@keyframes shellPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,211,238,0); }
  50% { box-shadow: 0 0 0 4px rgba(34,211,238,0.15); }
}
@keyframes ragScan {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes injFlashGreen {
  0%, 100% { background-color: transparent; }
  30% { background-color: rgba(34,197,94,0.15); }
}
@keyframes injFlashCyan {
  0%, 100% { background-color: transparent; }
  30% { background-color: rgba(34,211,238,0.12); }
}
@keyframes slideIn {
  0% { opacity:0; transform:translateY(8px); }
  100% { opacity:1; transform:translateY(0); }
}
@keyframes dangerPulse {
  0%,100% { box-shadow:0 0 4px rgba(239,68,68,.3); }
  50% { box-shadow:0 0 16px rgba(239,68,68,.5); }
}
`;
  document.head.appendChild(el);
}

// ═══════════════════════════════════════════════════════════
// §5  SOP ROW TYPE
// ═══════════════════════════════════════════════════════════

interface ISopRow {
  id: string;
  seq: number;
  processName: string;
  material: string;
  specialProcess: string;
  qualityNote: string;
  tooling: string;
  estimatedMin: number;
}

const INITIAL_SOP_ROWS: ISopRow[] = [
  { id: "R1", seq: 1, processName: "T1 上料定位", material: "定位销 H13", specialProcess: "", qualityNote: "", tooling: "三坐标测量仪", estimatedMin: 8 },
  { id: "R2", seq: 2, processName: "T2 预浸泡", material: "清洗剂 KW-40", specialProcess: "", qualityNote: "", tooling: "比重计", estimatedMin: 5 },
  { id: "R3", seq: 3, processName: "T3 高压喷淋清洗", material: "316L 喷嘴 x48", specialProcess: "", qualityNote: "", tooling: "压力表", estimatedMin: 15 },
  { id: "R4", seq: 4, processName: "T4 柱塞泵装配与调试", material: "", specialProcess: "", qualityNote: "", tooling: "扶矩扳手", estimatedMin: 20 },
  { id: "R5", seq: 5, processName: "T5 真空干燥", material: "真空泵油 LVO130", specialProcess: "", qualityNote: "", tooling: "真空计", estimatedMin: 12 },
  { id: "R6", seq: 6, processName: "T6 终检清洁度", material: "ISO 16232 标准样品", specialProcess: "", qualityNote: "", tooling: "颗粒检测仪", estimatedMin: 10 },
];

// ═══════════════════════════════════════════════════════════
// §6  TOP BAR
// ═══════════════════════════════════════════════════════════

const TopBar = memo(function TopBar() {
  const { state, dispatch } = useShell();
  const [open, setOpen] = useState(false);

  return (
    <header className="shrink-0 h-12 px-4 flex items-center justify-between border-b border-slate-600/50 bg-slate-900/95 backdrop-blur-sm z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
          <Globe className="h-4 w-4 text-cyan-400" />
        </div>
        <span className="text-xs font-bold text-slate-300 tracking-wider hidden lg:inline">GRT 工业 OS</span>
        <div className="h-5 w-px bg-slate-700 mx-1" />

        {/* Project selector */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm",
              state.currentProject
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/15"
                : "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse",
            )}
          >
            {state.currentProject ? (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span className="font-mono text-[11px] text-slate-300">{state.currentProject.code}</span>
                <span className="font-medium text-xs">{state.currentProject.name}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-medium text-xs">未锁定项目 — 请先选择</span>
              </>
            )}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </button>

          {open && (
            <div className="absolute top-full left-0 mt-1 w-[460px] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 z-50 overflow-hidden" style={{ animation: "slideIn .2s ease-out" }}>
              <div className="p-3 border-b border-slate-600/50">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">选择全局项目上下文</p>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {DEMO_PROJECTS.map(proj => (
                  <button
                    key={proj.id}
                    onClick={() => { dispatch({ type: "SET_PROJECT", project: proj }); setOpen(false); }}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-slate-800/50 transition-colors border-b border-slate-800/30",
                      state.currentProject?.id === proj.id && "bg-cyan-500/5",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-300">{proj.code}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600">{proj.phase}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600">{proj.bu}</span>
                        </div>
                        <p className="text-xs text-slate-200 mt-1">{proj.name}</p>
                        <p className="text-[10px] text-slate-400">{proj.customer}</p>
                      </div>
                      {state.currentProject?.id === proj.id && <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {state.currentProject && (
        <div className="flex items-center gap-4 text-[10px] text-slate-300">
          <span>12 沙盘</span>
          <span className="h-3 w-px bg-slate-700" />
          <span>26 EventBus</span>
          <span className="h-3 w-px bg-slate-700" />
          <span className="text-cyan-400 font-bold">RAG 在线</span>
        </div>
      )}
    </header>
  );
});

// ═══════════════════════════════════════════════════════════
// §7  LEFT NAV
// ═══════════════════════════════════════════════════════════

const LeftNav = memo(function LeftNav() {
  const { state, dispatch } = useShell();

  return (
    <nav className="w-14 shrink-0 border-r border-slate-600/50 bg-slate-900 flex flex-col items-center py-2 overflow-y-auto">
      {SANDBOX_MENU.map(sb => {
        const Icon = sb.icon;
        const isActive = state.activeSandboxId === sb.id;
        return (
          <button
            key={sb.id}
            onClick={() => dispatch({ type: "SET_SANDBOX", sandboxId: sb.id })}
            title={`#${sb.num} ${sb.label}`}
            className={cn(
              "w-10 h-10 rounded-lg flex flex-col items-center justify-center mb-1 transition-all relative group",
              isActive
                ? "bg-cyan-500/10 text-cyan-400"
                : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50",
            )}
          >
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-cyan-400" />}
            <Icon className="h-4 w-4" />
            <span className="text-[8px] font-mono mt-0.5">{sb.num < 10 ? `0${sb.num}` : sb.num}</span>
            <div className="absolute left-full ml-2 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              #{sb.num} {sb.label}
            </div>
          </button>
        );
      })}
    </nav>
  );
});

// ═══════════════════════════════════════════════════════════
// §8  CENTER — Interactive SOP Form with REAL <input> fields
//     ZERO AI code. Only calls setFocusedKeyword() on blur.
// ═══════════════════════════════════════════════════════════

const SandboxOutlet = memo(function SandboxOutlet() {
  const { state, setFocusedKeyword, clearInjection } = useShell();
  const [rows, setRows] = useState<ISopRow[]>(INITIAL_SOP_ROWS);
  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const [flashField, setFlashField] = useState<string | null>(null);

  // Public row updater — also used by injection
  const updateRow = useCallback((id: string, field: keyof ISopRow, value: string | number) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  // Consume injection from Copilot via Context
  useEffect(() => {
    const inj = state.injectedData;
    if (!inj) return;

    updateRow(inj.targetRowId, inj.targetField, inj.value);
    setFlashRowId(inj.targetRowId);
    setFlashField(inj.targetField);
    clearInjection();

    const timer = setTimeout(() => { setFlashRowId(null); setFlashField(null); }, 2500);
    return () => clearTimeout(timer);
  }, [state.injectedData, clearInjection, updateRow]);

  const handleFieldBlur = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed.length >= 2) {
      setFocusedKeyword(trimmed);
    }
  }, [setFocusedKeyword]);

  const currentSandbox = SANDBOX_MENU.find(s => s.id === state.activeSandboxId);

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-slate-950/50">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
            #{currentSandbox?.num ?? 12}
          </span>
          <h2 className="text-sm font-bold text-slate-200">
            {currentSandbox?.label ?? "AI 工艺孪生"} — SOP 工艺编排表单
          </h2>
        </div>
        <p className="text-[10px] text-slate-400">
          所有列均可编辑。在物料框输入关键词（如"柱塞泵"、"喷淋压力"、"清洗剂"）后点击其他地方 (blur)，右侧 RAG 幕僚将自动响应。
        </p>
      </div>

      {/* SOP Table — REAL <input> fields */}
      <div className="rounded-xl border border-slate-600/50 bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_minmax(120px,1fr)_minmax(140px,1.2fr)_minmax(140px,1.2fr)_minmax(180px,1.5fr)_minmax(100px,0.8fr)_50px] text-[10px] text-slate-300 uppercase tracking-wider bg-slate-800/50 border-b border-slate-700/30">
          <div className="p-2.5 text-center">#</div>
          <div className="p-2.5">工序名称</div>
          <div className="p-2.5">物料 / BOM</div>
          <div className="p-2.5">防呆工序</div>
          <div className="p-2.5">Quality Note</div>
          <div className="p-2.5">工装夹具</div>
          <div className="p-2.5 text-center">分钟</div>
        </div>

        {/* Data rows */}
        {rows.map(row => {
          const isFlashing = flashRowId === row.id;

          return (
            <div
              key={row.id}
              className={cn(
                "grid grid-cols-[40px_minmax(120px,1fr)_minmax(140px,1.2fr)_minmax(140px,1.2fr)_minmax(180px,1.5fr)_minmax(100px,0.8fr)_50px] border-b border-slate-800/30 transition-all group hover:bg-slate-800/20",
              )}
              style={isFlashing ? { animation: "injFlashGreen 0.6s ease-in-out 3" } : undefined}
            >
              {/* Seq */}
              <div className="p-2 text-center text-[10px] font-mono text-slate-400 self-center">{row.seq}</div>

              {/* Process Name — editable */}
              <div className="p-1.5 self-center">
                <input
                  className="w-full bg-transparent text-xs text-slate-200 border-b border-transparent hover:border-slate-600 focus:border-cyan-500 outline-none py-1 px-1 transition-colors"
                  value={row.processName}
                  onChange={e => updateRow(row.id, "processName", e.target.value)}
                />
              </div>

              {/* Material / BOM — editable, triggers RAG on blur */}
              <div className="p-1.5 self-center">
                <input
                  className={cn(
                    "w-full bg-transparent text-xs text-slate-300 border-b border-slate-600/50 hover:border-slate-500 focus:border-blue-500 outline-none py-1 px-1 transition-colors",
                    isFlashing && flashField === "material" && "border-green-400 text-green-300",
                  )}
                  value={row.material}
                  onChange={e => updateRow(row.id, "material", e.target.value)}
                  onBlur={e => handleFieldBlur(e.target.value)}
                  placeholder="输入物料名称..."
                />
              </div>

              {/* Special Process — editable */}
              <div className="p-1.5 self-center">
                <input
                  className={cn(
                    "w-full bg-transparent text-[11px] border-b border-slate-600/50 hover:border-slate-500 focus:border-cyan-500 outline-none py-1 px-1 transition-colors",
                    row.specialProcess ? "text-cyan-300" : "text-slate-600",
                    isFlashing && flashField === "specialProcess" && "border-green-400 text-green-300",
                  )}
                  value={row.specialProcess}
                  onChange={e => updateRow(row.id, "specialProcess", e.target.value)}
                  placeholder="防呆工序..."
                />
              </div>

              {/* Quality Note — editable */}
              <div className="p-1.5 self-center">
                <input
                  className={cn(
                    "w-full bg-transparent text-[11px] border-b border-slate-600/50 hover:border-slate-500 focus:border-amber-500 outline-none py-1 px-1 transition-colors",
                    row.qualityNote ? "text-amber-300" : "text-slate-600",
                    isFlashing && flashField === "qualityNote" && "border-green-400 text-green-300",
                  )}
                  value={row.qualityNote}
                  onChange={e => updateRow(row.id, "qualityNote", e.target.value)}
                  placeholder="质量备注..."
                />
              </div>

              {/* Tooling — editable */}
              <div className="p-1.5 self-center">
                <input
                  className="w-full bg-transparent text-xs text-slate-300 border-b border-transparent hover:border-slate-600 focus:border-slate-500 outline-none py-1 px-1 transition-colors"
                  value={row.tooling}
                  onChange={e => updateRow(row.id, "tooling", e.target.value)}
                />
              </div>

              {/* Estimated minutes */}
              <div className="p-2 text-center text-xs text-slate-300 font-mono self-center">{row.estimatedMin}</div>
            </div>
          );
        })}
      </div>

      {/* Hint */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
        <Info className="h-3 w-3 shrink-0" />
        <span>试试：在第 4 行的物料框中输入"柱塞泵"，然后点击其他位置 (blur)。右侧 RAG 幕僚将自动检索全域知识图谱并提供一键反写。</span>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// §9  RIGHT SIDEBAR — RAG Copilot
//     Listens to Context. Never imports sandbox internals.
// ═══════════════════════════════════════════════════════════

function SkeletonLoader() {
  return (
    <div className="space-y-3 p-1">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-lg bg-slate-800/50 border border-slate-700/30 p-3 space-y-2">
          <div className="h-3 rounded bg-slate-700/50 w-3/4" style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(34,211,238,0.06), transparent)", backgroundSize: "200% 100%", animation: "ragScan 1.5s linear infinite" }} />
          <div className="h-2 rounded bg-slate-700/30 w-full" style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(34,211,238,0.06), transparent)", backgroundSize: "200% 100%", animation: "ragScan 1.5s linear infinite 0.3s" }} />
          <div className="h-2 rounded bg-slate-700/30 w-2/3" style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(34,211,238,0.06), transparent)", backgroundSize: "200% 100%", animation: "ragScan 1.5s linear infinite 0.6s" }} />
        </div>
      ))}
      <p className="text-[10px] text-cyan-400/60 text-center animate-pulse">全域跨沙盘知识图谱检索中...</p>
    </div>
  );
}

const RightCopilot = memo(function RightCopilot() {
  const { state, dispatch } = useShell();
  const [ragResults, setRagResults] = useState<IKnowledgeNode[]>([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [initMessage, setInitMessage] = useState("");
  const [injectedIds, setInjectedIds] = useState<Set<string>>(new Set());
  const prevProject = useRef<string | null>(null);
  const prevKeyword = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // React to project change
  useEffect(() => {
    const pid = state.currentProject?.id ?? null;
    if (pid === prevProject.current) return;
    prevProject.current = pid;
    if (state.currentProject) {
      setInitMessage(`已切入【${state.currentProject.name}】项目。该项目全域知识图谱已挂载就绪，共索引 fmeaItems / bomItems / sopTemplates / plmDocuments / shopFloorDefectLogs 五大数据域。`);
      setRagResults([]);
      setInjectedIds(new Set());
    } else {
      setInitMessage("");
      setRagResults([]);
    }
  }, [state.currentProject]);

  // React to keyword change — trigger RAG search
  useEffect(() => {
    const kw = state.focusedKeyword;
    if (kw === prevKeyword.current || !kw) return;
    prevKeyword.current = kw;

    setRagLoading(true);
    setRagResults([]);
    setInjectedIds(new Set());

    const timer = setTimeout(() => {
      const results = ragSearch(kw);
      setRagResults(results);
      setRagLoading(false);
      // Auto-scroll
      setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }, 1200);

    return () => clearTimeout(timer);
  }, [state.focusedKeyword]);

  const handleInject = useCallback((node: IKnowledgeNode) => {
    dispatch({ type: "INJECT_DATA", payload: node.actionPayload });
    setInjectedIds(prev => new Set([...prev, node.id]));
  }, [dispatch]);

  const SEV_COLORS: Record<string, string> = {
    critical: "border-red-500/40 bg-red-500/5",
    high: "border-orange-500/30 bg-orange-500/5",
    medium: "border-yellow-500/30 bg-yellow-500/5",
    low: "border-slate-600/50 bg-slate-800/30",
  };

  const SEV_BADGE: Record<string, { bg: string; text: string }> = {
    critical: { bg: "bg-red-500/15", text: "text-red-400" },
    high: { bg: "bg-orange-500/15", text: "text-orange-400" },
    medium: { bg: "bg-yellow-500/15", text: "text-yellow-400" },
    low: { bg: "bg-slate-700/50", text: "text-slate-300" },
  };

  return (
    <aside className="w-[340px] shrink-0 border-l border-slate-600/50 bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-700/30 bg-slate-800/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">全局 RAG 战略幕僚</p>
            <p className="text-[9px] text-slate-400">跨 12 沙盘知识图谱 · 实时监听 Context</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* No project */}
        {!state.currentProject && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
            <Lock className="h-8 w-8 text-red-400/50 mx-auto mb-2" />
            <p className="text-xs text-red-300 font-medium">未锁定项目上下文</p>
            <p className="text-[10px] text-slate-400 mt-1">请在顶部选择项目以激活全域知识图谱</p>
          </div>
        )}

        {/* Init message */}
        {initMessage && (
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3" style={{ animation: "slideIn .3s ease-out" }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Bot className="h-3 w-3 text-cyan-400" />
              <span className="text-[9px] text-cyan-400 font-mono uppercase">System</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{initMessage}</p>
          </div>
        )}

        {/* Keyword monitor */}
        {state.focusedKeyword && (
          <div className="rounded-lg border border-slate-600/50 bg-slate-800/30 p-2.5 flex items-center gap-2" style={{ animation: "slideIn .2s ease-out" }}>
            <Search className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-slate-400">Context.focusedKeyword</p>
              <p className="text-xs text-cyan-300 font-mono truncate">"{state.focusedKeyword}"</p>
            </div>
            <button onClick={() => dispatch({ type: "CLEAR_KEYWORD" })} className="text-slate-600 hover:text-slate-300">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {ragLoading && <SkeletonLoader />}

        {/* RAG Results */}
        {ragResults.length > 0 && (
          <div className="space-y-3" style={{ animation: "slideIn .3s ease-out" }}>
            <p className="text-[10px] text-cyan-400 font-bold flex items-center gap-1.5">
              <Radio className="h-3 w-3" />
              [全域跨沙盘检索] 发现 {ragResults.length} 条关联知识
            </p>
            {ragResults.map(node => {
              const isInjected = injectedIds.has(node.id);
              const sev = SEV_BADGE[node.severity];

              return (
                <div key={node.id} className={cn("rounded-xl border p-3.5 transition-all", SEV_COLORS[node.severity])} style={{ animation: "slideIn .3s ease-out" }}>
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold border", sev.bg, sev.text,
                      node.severity === "critical" ? "border-red-500/30" : node.severity === "high" ? "border-orange-500/30" : "border-slate-600"
                    )}>
                      {node.severity.toUpperCase()}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600">{node.type}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{node.sourceTable}</span>
                  </div>

                  {/* Title */}
                  <p className="text-xs font-medium text-slate-200 mb-1.5">{node.title}</p>

                  {/* Detail */}
                  <p className="text-[11px] text-slate-300 leading-relaxed mb-3">{node.detail}</p>

                  {/* Linked sandbox */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-3">
                    <Link2 className="h-3 w-3" />
                    关联沙盘: {SANDBOX_MENU.find(s => s.id === node.linkedSandbox)?.label ?? node.linkedSandbox}
                  </div>

                  {/* Injection button */}
                  {isInjected ? (
                    <div className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 py-2 text-xs font-medium text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      已反写至左侧 SOP 表单
                    </div>
                  ) : (
                    <button
                      onClick={() => handleInject(node)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-2 text-xs font-medium text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer"
                      style={{ animation: "shellPulse 2s ease-in-out infinite" }}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {node.actionLabel}
                    </button>
                  )}

                  {/* Confidence */}
                  <div className="flex items-center justify-between mt-2 text-[9px]">
                    <span className="text-slate-600">{node.actionPayload.source}</span>
                    <span className="text-slate-400">置信度: <span className="text-cyan-400 font-mono">{(node.actionPayload.confidence * 100).toFixed(0)}%</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No results */}
        {state.currentProject && !ragLoading && ragResults.length === 0 && state.focusedKeyword && (
          <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-4 text-center" style={{ animation: "slideIn .3s ease-out" }}>
            <Search className="h-6 w-6 text-slate-600 mx-auto mb-2" />
            <p className="text-[11px] text-slate-300">未在知识图谱中找到与"{state.focusedKeyword}"直接关联的条目</p>
            <p className="text-[10px] text-slate-600 mt-1">尝试输入更精确的物料名称</p>
          </div>
        )}

        {/* Empty state — guide */}
        {state.currentProject && !ragLoading && ragResults.length === 0 && !state.focusedKeyword && initMessage && (
          <div className="text-center py-6">
            <Brain className="h-10 w-10 text-slate-700 mx-auto mb-2" />
            <p className="text-[11px] text-slate-400">在左侧表单中编辑物料字段</p>
            <p className="text-[11px] text-slate-400">幕僚将自动检索全域知识图谱</p>
            <div className="mt-3 space-y-1 text-[10px] text-slate-600">
              <p>可尝试的关键词：</p>
              <div className="flex gap-2 justify-center">
                {["柱塞泵", "喷淋压力", "清洗剂"].map(kw => (
                  <span key={kw} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">{kw}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-slate-700/30 bg-slate-800/20 shrink-0">
        <div className="flex items-center justify-between text-[9px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full", state.currentProject ? "bg-green-500" : "bg-red-500")} />
            {state.currentProject ? "知识图谱在线" : "无上下文"}
          </span>
          <span>5 数据域已索引</span>
        </div>
      </div>
    </aside>
  );
});

// ═══════════════════════════════════════════════════════════
// §10  NO-PROJECT OVERLAY
// ═══════════════════════════════════════════════════════════

function NoProjectOverlay() {
  return (
    <div className="absolute inset-0 z-40 backdrop-blur-md bg-slate-900/70 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-5">
          <Lock className="h-10 w-10 text-slate-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-200 mb-2">
          必须锁定项目上下文
        </h2>
        <p className="text-sm text-slate-300 mb-1">
          必须锁定项目主线后方可作业
        </p>
        <p className="text-xs text-slate-400">
          系统内产生的所有数据必须携带绝对的项目归属。请在顶部选择项目以解锁工作区。
        </p>
        <div className="mt-5 flex items-center justify-center gap-2 text-slate-400">
          <ArrowRight className="h-4 w-4 animate-bounce" style={{ animationDirection: "alternate" }} />
          <span className="text-xs">点击上方项目选择器</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §11  MAIN SHELL EXPORT
// ═══════════════════════════════════════════════════════════

export default function GlobalAppShell() {
  const [state, dispatch] = useReducer(shellReducer, INITIAL_STATE);

  const setFocusedKeyword = useCallback((kw: string) => {
    dispatch({ type: "SET_KEYWORD", keyword: kw });
  }, []);

  const clearInjection = useCallback(() => {
    dispatch({ type: "CLEAR_INJECTION" });
  }, []);

  const ctxValue = useMemo<IGlobalContext>(() => ({
    state,
    dispatch,
    setFocusedKeyword,
    clearInjection,
  }), [state, dispatch, setFocusedKeyword, clearInjection]);

  useEffect(() => { injectShellStyles(); }, []);

  return (
    <GlobalShellContext.Provider value={ctxValue}>
      <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
        <TopBar />
        <div className="flex flex-1 min-h-0 relative">
          <LeftNav />
          <div className="flex-1 flex relative">
            <SandboxOutlet />
            {!state.currentProject && <NoProjectOverlay />}
          </div>
          <RightCopilot />
        </div>
        <FloatingNav />
      </div>
    </GlobalShellContext.Provider>
  );
}
