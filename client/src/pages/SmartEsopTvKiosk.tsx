/**
 * SmartEsopTvKiosk — 75寸 4K 工位智慧指导电视大屏
 * Smart E-SOP TV Kiosk for industrial cleaning equipment assembly.
 *
 * V2: Full edit mode — configurable work orders, SOP steps, BOM import,
 *     FMEA history, tool assignments, QC checkpoints. localStorage persistence.
 *
 * Layout (TV mode): Top Bar | Left 25% SOP | Center 45% 3D+BOM | Right 30% Vision+Timer
 * Layout (Edit mode): Full-screen tabbed editor overlay
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import FloatingNav from '@/components/FloatingNav';
import {
  Shield, CheckCircle2, AlertTriangle, Clock, User,
  Wrench, Eye, Camera, Zap, BarChart3,
  ChevronRight, Lock, Unlock, Package,
  MapPin, Cpu, Radio, ScanLine, CircleDot,
  AlertCircle, Flag, Timer, Play, ArrowRight,
  Layers, Crosshair, FileText, CircleCheck, Ban, LogIn,
  Settings, Plus, Trash2, GripVertical, Save,
  Upload, Download, ChevronDown, ChevronUp, Copy,
  RotateCcw, X, Pencil, FolderOpen, FileUp,
  ClipboardPaste, List, Database, History,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════
// Data Model
// ═══════════════════════════════════════════════════════════

interface Worker {
  id: string;
  name: string;
  code: string;
  skillLevel: string;
  avatar: string;
}

interface FmeaEntry {
  id: string;
  severity: "high" | "medium" | "low";
  description: string;
  rootCause: string;
  lostHours: number;
}

interface ToolItem {
  name: string;
  note: string;
}

interface BomItem {
  id: string;
  code: string;
  name: string;
  spec: string;
  location: string;
  zone: string;
  qty: number;
}

interface SopStep {
  id: string;
  seq: number;
  title: string;
  status: "completed" | "active" | "pending";
  fmea: FmeaEntry[];
  tools: ToolItem[];
  qcCheckpoint: string;
  requiredSkill: string;
  estimatedMinutes: number;
  bomIds: string[]; // references to BomItem.id
  notes: string;
}

interface WorkOrderConfig {
  woNumber: string;
  projectName: string;
  station: string;
  requiredSkill: string;
  productType: string;
}

interface KioskConfig {
  name: string;
  workOrder: WorkOrderConfig;
  steps: SopStep[];
  bom: BomItem[];
  workers: Worker[];
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════
// Default Config — Industrial Cleaning Equipment
// ═══════════════════════════════════════════════════════════

const DEFAULT_CONFIG: KioskConfig = {
  name: "美利信新能源清洗岛 — 高压泵组总装",
  workOrder: {
    woNumber: "WO-M12-001",
    projectName: "美利信新能源清洗岛 — 核心高压泵组总装",
    station: "总装岛 A3",
    requiredSkill: "T3",
    productType: "工业清洗设备",
  },
  steps: [
    {
      id: "s1", seq: 1, title: "底座水平找平与除尘", status: "completed",
      fmea: [], tools: [{ name: "水平仪", note: "精度 0.02mm/m" }],
      qcCheckpoint: "水平度 ≤ 0.05mm/m", requiredSkill: "T2",
      estimatedMinutes: 30, bomIds: [], notes: "",
    },
    {
      id: "s2", seq: 2, title: "柱塞泵与主伺服电机高精度对中安装", status: "active",
      fmea: [
        { id: "f1", severity: "high", description: "键槽毛刺导致异响返工，损失 4 工时", rootCause: "轴颈未二次打磨", lostHours: 4 },
        { id: "f2", severity: "medium", description: "密封胶涂抹不均导致微渗漏", rootCause: "未使用刮板均匀涂布", lostHours: 2 },
      ],
      tools: [
        { name: "M12 扭力扳手", note: "已从智能柜借出，完工归还" },
        { name: "X-20 密封胶", note: "涂抹" },
        { name: "2000目砂纸", note: "轴颈二次打磨" },
        { name: "百分表+磁力座", note: "对中测量" },
      ],
      qcCheckpoint: "径向跳动值 ≤ 0.02mm", requiredSkill: "T3",
      estimatedMinutes: 45, bomIds: ["b1", "b2", "b3", "b4", "b5"],
      notes: "务必用 2000目砂纸二次打磨轴颈！",
    },
    {
      id: "s3", seq: 3, title: "主进水管路法兰耐压驳接", status: "pending",
      fmea: [{ id: "f3", severity: "medium", description: "法兰密封面划伤导致试压泄漏", rootCause: "搬运磕碰", lostHours: 3 }],
      tools: [{ name: "液压扳手", note: "法兰螺栓对角紧固" }, { name: "PTFE 密封带", note: "管路螺纹" }],
      qcCheckpoint: "1.5 倍额定压力保压 30min 无泄漏", requiredSkill: "T2",
      estimatedMinutes: 35, bomIds: [], notes: "",
    },
    {
      id: "s4", seq: 4, title: "液压站总成联调试压", status: "pending",
      fmea: [],
      tools: [{ name: "压力表", note: "量程 0-25MPa" }, { name: "液压油 HM46", note: "注油" }],
      qcCheckpoint: "系统压力稳定 ±0.3MPa，无异响", requiredSkill: "T3",
      estimatedMinutes: 60, bomIds: [], notes: "",
    },
    {
      id: "s5", seq: 5, title: "电气线缆排布与 IO 点检", status: "pending",
      fmea: [],
      tools: [{ name: "万用表", note: "绝缘测试" }, { name: "线号标签机", note: "" }],
      qcCheckpoint: "全部 IO 点动作正确，绝缘电阻 ≥ 500MΩ", requiredSkill: "T2",
      estimatedMinutes: 40, bomIds: [], notes: "",
    },
    {
      id: "s6", seq: 6, title: "整机空载运行与噪声振动测试", status: "pending",
      fmea: [],
      tools: [{ name: "振动测试仪", note: "" }, { name: "噪声计", note: "" }],
      qcCheckpoint: "振动 ≤ 4.5mm/s，噪声 ≤ 75dB(A)", requiredSkill: "T3",
      estimatedMinutes: 50, bomIds: [], notes: "",
    },
    {
      id: "s7", seq: 7, title: "带料联调与清洁度检测", status: "pending",
      fmea: [],
      tools: [{ name: "清洁度检测仪", note: "颗粒物 ≤ 50μm" }],
      qcCheckpoint: "清洁度 ISO 16232 Level-6, Cpk ≥ 1.67", requiredSkill: "T3",
      estimatedMinutes: 90, bomIds: [], notes: "使用客户提供的试产毛坯件",
    },
    {
      id: "s8", seq: 8, title: "最终验收与交付签字", status: "pending",
      fmea: [],
      tools: [],
      qcCheckpoint: "全部检查项合格，客户签字确认", requiredSkill: "T3",
      estimatedMinutes: 30, bomIds: [], notes: "",
    },
  ],
  bom: [
    { id: "b1", code: "P-8821", name: "进口高压柱塞泵", spec: "63MPa/15L/min", location: "货架 B区-第3层", zone: "B3", qty: 1 },
    { id: "b2", code: "M-102", name: "1.5kW 伺服电机", spec: "1500rpm/IP65", location: "货架 A区-第1层", zone: "A1", qty: 1 },
    { id: "b3", code: "S-445", name: "弹性联轴器", spec: "Φ42/扭矩 120Nm", location: "线边仓 C区-第2层", zone: "C2", qty: 1 },
    { id: "b4", code: "F-019", name: "M12×80 高强度螺栓", spec: "12.9级/达克罗", location: "货架 A区-第4层", zone: "A4", qty: 8 },
    { id: "b5", code: "G-301", name: "X-20 厌氧密封胶", spec: "50ml/支", location: "化学品柜 D区", zone: "D", qty: 1 },
  ],
  workers: [
    { id: "8013", name: "王师傅", code: "JRD-09527", skillLevel: "T3", avatar: "王" },
    { id: "8001", name: "李师傅", code: "JRD-08001", skillLevel: "T1", avatar: "李" },
    { id: "8025", name: "赵师傅", code: "JRD-08025", skillLevel: "T4", avatar: "赵" },
  ],
  updatedAt: new Date().toISOString(),
};

const STORAGE_KEY = "grt-esop-kiosk-configs";
const ACTIVE_KEY = "grt-esop-kiosk-active";

function loadConfigs(): Record<string, KioskConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { default: DEFAULT_CONFIG };
  } catch { return { default: DEFAULT_CONFIG }; }
}
function saveConfigs(configs: Record<string, KioskConfig>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}
function loadActiveKey(): string {
  return localStorage.getItem(ACTIVE_KEY) || "default";
}
function saveActiveKey(key: string) {
  localStorage.setItem(ACTIVE_KEY, key);
}

let _idCounter = Date.now();
function uid() { return `_${++_idCounter}`; }

// ═══════════════════════════════════════════════════════════
// Editor Overlay
// ═══════════════════════════════════════════════════════════

type EditorTab = "workorder" | "sop" | "bom" | "fmea" | "presets";

function EditorOverlay({
  config,
  onChange,
  onClose,
  onSave,
  configs,
  activeKey,
  onSwitchPreset,
  onDeletePreset,
  onDuplicatePreset,
}: {
  config: KioskConfig;
  onChange: (c: KioskConfig) => void;
  onClose: () => void;
  onSave: () => void;
  configs: Record<string, KioskConfig>;
  activeKey: string;
  onSwitchPreset: (key: string) => void;
  onDeletePreset: (key: string) => void;
  onDuplicatePreset: (key: string, newName: string) => void;
}) {
  const [tab, setTab] = useState<EditorTab>("sop");
  const [editStepId, setEditStepId] = useState<string | null>(null);
  const [bomPasteMode, setBomPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const tabs: { key: EditorTab; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; title?: string }> }[] = [
    { key: "workorder", label: "派工单", icon: FileText },
    { key: "sop", label: "SOP 工序", icon: List },
    { key: "bom", label: "BOM 物料", icon: Package },
    { key: "fmea", label: "FMEA 失效库", icon: History },
    { key: "presets", label: "方案管理", icon: FolderOpen },
  ];

  // Helpers
  const updateWo = (patch: Partial<WorkOrderConfig>) => onChange({ ...config, workOrder: { ...config.workOrder, ...patch } });

  const updateStep = (stepId: string, patch: Partial<SopStep>) => {
    onChange({ ...config, steps: config.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) });
  };

  const addStep = () => {
    const newStep: SopStep = {
      id: uid(), seq: config.steps.length + 1, title: "新工序", status: "pending",
      fmea: [], tools: [], qcCheckpoint: "", requiredSkill: "T2",
      estimatedMinutes: 30, bomIds: [], notes: "",
    };
    onChange({ ...config, steps: [...config.steps, newStep] });
    setEditStepId(newStep.id);
  };

  const removeStep = (stepId: string) => {
    const next = config.steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, seq: i + 1 }));
    onChange({ ...config, steps: next });
    if (editStepId === stepId) setEditStepId(null);
  };

  const moveStep = (stepId: string, dir: -1 | 1) => {
    const idx = config.steps.findIndex((s) => s.id === stepId);
    if (idx < 0 || idx + dir < 0 || idx + dir >= config.steps.length) return;
    const arr = [...config.steps];
    [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
    onChange({ ...config, steps: arr.map((s, i) => ({ ...s, seq: i + 1 })) });
  };

  const addBomItem = () => {
    const item: BomItem = { id: uid(), code: "", name: "", spec: "", location: "", zone: "", qty: 1 };
    onChange({ ...config, bom: [...config.bom, item] });
  };

  const updateBom = (bomId: string, patch: Partial<BomItem>) => {
    onChange({ ...config, bom: config.bom.map((b) => (b.id === bomId ? { ...b, ...patch } : b)) });
  };

  const removeBom = (bomId: string) => {
    onChange({ ...config, bom: config.bom.filter((b) => b.id !== bomId) });
  };

  const handleBomPaste = () => {
    // Parse tab-separated or comma-separated: code, name, spec, location, zone, qty
    const lines = pasteText.trim().split("\n").filter(Boolean);
    const newItems: BomItem[] = lines.map((line) => {
      const cols = line.includes("\t") ? line.split("\t") : line.split(",");
      return {
        id: uid(),
        code: (cols[0] || "").trim(),
        name: (cols[1] || "").trim(),
        spec: (cols[2] || "").trim(),
        location: (cols[3] || "").trim(),
        zone: (cols[4] || "").trim(),
        qty: parseInt(cols[5] || "1", 10) || 1,
      };
    });
    onChange({ ...config, bom: [...config.bom, ...newItems] });
    setPasteText("");
    setBomPasteMode(false);
  };

  // Currently editing step
  const editStep = editStepId ? config.steps.find((s) => s.id === editStepId) : null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/98 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 h-14 bg-neutral-900 border-b border-neutral-700 flex items-center px-5 gap-4">
        <Settings className="h-5 w-5 text-amber-400" />
        <h1 className="text-base font-bold text-white">E-SOP 工艺编辑器</h1>
        <span className="text-xs text-neutral-500">工业清洗设备装配调试全过程配置</span>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
          >
            <Save className="h-4 w-4" />
            保存方案
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-bold border border-neutral-700 transition-colors"
          >
            <X className="h-4 w-4" />
            返回大屏
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 h-12 bg-neutral-900/50 border-b border-neutral-800 flex items-center px-5 gap-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === key
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* ── Tab: Work Order ── */}
          {tab === "workorder" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white">派工单与工位配置</h2>
              <div className="grid grid-cols-2 gap-4">
                {([
                  ["woNumber", "派工单号", config.workOrder.woNumber],
                  ["projectName", "项目名称", config.workOrder.projectName],
                  ["station", "工位", config.workOrder.station],
                  ["requiredSkill", "所需技能等级", config.workOrder.requiredSkill],
                  ["productType", "产品类型", config.workOrder.productType],
                ] as [keyof WorkOrderConfig, string, string][]).map(([field, label, val]) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-xs text-neutral-400 font-bold uppercase tracking-wider">{label}</label>
                    <input
                      value={val}
                      onChange={(e) => updateWo({ [field]: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-400 font-bold uppercase tracking-wider">方案名称</label>
                <input
                  value={config.name}
                  onChange={(e) => onChange({ ...config, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* ── Tab: SOP Steps ── */}
          {tab === "sop" && (
            <div className="flex gap-6">
              {/* Step list */}
              <div className="w-[360px] shrink-0 space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">SOP 工序列表</h2>
                  <button onClick={addStep} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors">
                    <Plus className="h-3.5 w-3.5" /> 新增工序
                  </button>
                </div>
                {config.steps.map((step) => (
                  <div
                    key={step.id}
                    onClick={() => setEditStepId(step.id)}
                    className={cn(
                      "rounded-xl border p-3 cursor-pointer transition-all group",
                      editStepId === step.id
                        ? "border-cyan-500/50 bg-cyan-500/10"
                        : "border-neutral-700 bg-neutral-800/50 hover:border-neutral-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-neutral-700 flex items-center justify-center text-sm font-bold text-neutral-300 shrink-0">
                        {String(step.seq).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{step.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-neutral-500">{step.estimatedMinutes}min</span>
                          <span className="text-[10px] text-neutral-500">·</span>
                          <span className="text-[10px] text-neutral-500">{step.requiredSkill}</span>
                          {step.fmea.length > 0 && (
                            <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" />{step.fmea.length}
                            </span>
                          )}
                          {step.tools.length > 0 && (
                            <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                              <Wrench className="h-2.5 w-2.5" />{step.tools.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); moveStep(step.id, -1); }} className="p-1 rounded hover:bg-neutral-700 text-neutral-500"><ChevronUp className="h-3.5 w-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveStep(step.id, 1); }} className="p-1 rounded hover:bg-neutral-700 text-neutral-500"><ChevronDown className="h-3.5 w-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); removeStep(step.id); }} className="p-1 rounded hover:bg-red-500/20 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Step detail editor */}
              <div className="flex-1 min-w-0">
                {editStep ? (
                  <StepEditor step={editStep} config={config} onUpdate={(patch) => updateStep(editStep.id, patch)} />
                ) : (
                  <div className="flex items-center justify-center h-64 text-neutral-600 text-sm">
                    点击左侧工序卡片进行编辑
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: BOM ── */}
          {tab === "bom" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">BOM 物料清单 ({config.bom.length} 项)</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBomPasteMode(!bomPasteMode)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                      bomPasteMode ? "bg-amber-600 text-white" : "bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white"
                    )}
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" />
                    {bomPasteMode ? "取消粘贴" : "从 Excel 粘贴导入"}
                  </button>
                  <button onClick={addBomItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors">
                    <Plus className="h-3.5 w-3.5" /> 新增物料
                  </button>
                </div>
              </div>

              {bomPasteMode && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                  <p className="text-xs text-amber-300">
                    粘贴 Excel 数据（每行一项，列顺序: <span className="font-mono text-amber-400">编码 | 名称 | 规格 | 库位 | 区域 | 数量</span>，Tab 或逗号分隔）
                  </p>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={"P-8821\t进口高压柱塞泵\t63MPa\t货架 B区-第3层\tB3\t1\nM-102\t1.5kW 伺服电机\t1500rpm\t货架 A区-第1层\tA1\t1"}
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white font-mono focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  />
                  <button onClick={handleBomPaste} disabled={!pasteText.trim()} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-700 text-white text-xs font-bold transition-colors">
                    导入 {pasteText.trim().split("\n").filter(Boolean).length} 行
                  </button>
                </div>
              )}

              {/* BOM table */}
              <div className="rounded-xl border border-neutral-800 overflow-hidden">
                <div className="grid grid-cols-[80px_120px_1fr_120px_1fr_80px_60px_50px] gap-2 px-4 py-2.5 bg-neutral-800/50 text-[10px] text-neutral-500 font-bold uppercase">
                  <span>#</span><span>编码</span><span>名称</span><span>规格</span><span>库位</span><span>区域</span><span>数量</span><span></span>
                </div>
                {config.bom.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-[80px_120px_1fr_120px_1fr_80px_60px_50px] gap-2 px-4 py-1.5 border-t border-neutral-800/50 items-center">
                    <span className="text-xs text-neutral-500 font-mono">{idx + 1}</span>
                    <input value={item.code} onChange={(e) => updateBom(item.id, { code: e.target.value })} className="h-8 px-2 rounded bg-neutral-800 border border-neutral-700 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500" />
                    <input value={item.name} onChange={(e) => updateBom(item.id, { name: e.target.value })} className="h-8 px-2 rounded bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-cyan-500" />
                    <input value={item.spec} onChange={(e) => updateBom(item.id, { spec: e.target.value })} className="h-8 px-2 rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 focus:outline-none focus:border-cyan-500" />
                    <input value={item.location} onChange={(e) => updateBom(item.id, { location: e.target.value })} className="h-8 px-2 rounded bg-neutral-800 border border-neutral-700 text-xs text-blue-300 focus:outline-none focus:border-cyan-500" />
                    <input value={item.zone} onChange={(e) => updateBom(item.id, { zone: e.target.value })} className="h-8 px-2 rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 font-mono focus:outline-none focus:border-cyan-500" />
                    <input value={item.qty} onChange={(e) => updateBom(item.id, { qty: parseInt(e.target.value, 10) || 0 })} type="number" className="h-8 px-2 rounded bg-neutral-800 border border-neutral-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button onClick={() => removeBom(item.id)} className="h-8 w-8 flex items-center justify-center rounded hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: FMEA ── */}
          {tab === "fmea" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">历史失效库 (FMEA)</h2>
              <p className="text-xs text-neutral-500">汇总所有工序的历史失效记录 — 点击工序可跳转编辑</p>
              {config.steps.filter((s) => s.fmea.length > 0).length === 0 ? (
                <div className="text-center py-12 text-neutral-600 text-sm">暂无失效记录 — 在 SOP 工序编辑中添加</div>
              ) : (
                config.steps.filter((s) => s.fmea.length > 0).map((step) => (
                  <div key={step.id} className="rounded-xl border border-neutral-800 overflow-hidden">
                    <div
                      className="px-4 py-3 bg-neutral-800/50 flex items-center gap-3 cursor-pointer hover:bg-neutral-800 transition-colors"
                      onClick={() => { setTab("sop"); setEditStepId(step.id); }}
                    >
                      <span className="text-sm font-mono font-bold text-neutral-400">[{String(step.seq).padStart(2, "0")}]</span>
                      <span className="text-sm text-white font-bold">{step.title}</span>
                      <span className="ml-auto text-xs text-red-400">{step.fmea.length} 条失效</span>
                    </div>
                    {step.fmea.map((f) => (
                      <div key={f.id} className="px-4 py-3 border-t border-neutral-800/50 flex items-start gap-3">
                        <span className={cn(
                          "mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold shrink-0",
                          f.severity === "high" ? "bg-red-500/20 text-red-400" : f.severity === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-neutral-700 text-neutral-400"
                        )}>
                          {f.severity === "high" ? "高" : f.severity === "medium" ? "中" : "低"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">{f.description}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">根因: {f.rootCause} · 损失 {f.lostHours}h</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Tab: Presets ── */}
          {tab === "presets" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">方案管理</h2>
              <p className="text-xs text-neutral-500">保存多套工艺方案，快速切换不同产品/工单的 SOP 配置</p>
              <div className="space-y-2">
                {Object.entries(configs).map(([key, cfg]) => (
                  <div
                    key={key}
                    className={cn(
                      "rounded-xl border p-4 flex items-center gap-4 transition-all",
                      key === activeKey ? "border-cyan-500/50 bg-cyan-500/10" : "border-neutral-700 bg-neutral-800/50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{cfg.name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {cfg.workOrder.woNumber} · {cfg.steps.length} 工序 · {cfg.bom.length} 物料 · 更新于 {new Date(cfg.updatedAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {key !== activeKey && (
                        <button onClick={() => onSwitchPreset(key)} className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors">切换</button>
                      )}
                      <button
                        onClick={() => onDuplicatePreset(key, cfg.name + " (副本)")}
                        className="px-3 py-1.5 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-300 text-xs font-bold transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {key !== "default" && (
                        <button onClick={() => onDeletePreset(key)} className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => onDuplicatePreset(activeKey, "新方案 " + new Date().toLocaleDateString("zh-CN"))}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-neutral-700 hover:border-cyan-500/30 text-neutral-500 hover:text-cyan-400 text-sm transition-all w-full justify-center"
              >
                <Plus className="h-4 w-4" /> 基于当前方案创建新方案
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step Editor (detail panel)
// ═══════════════════════════════════════════════════════════

function StepEditor({
  step, config, onUpdate,
}: {
  step: SopStep;
  config: KioskConfig;
  onUpdate: (patch: Partial<SopStep>) => void;
}) {
  const addFmea = () => {
    onUpdate({ fmea: [...step.fmea, { id: uid(), severity: "medium", description: "", rootCause: "", lostHours: 0 }] });
  };
  const updateFmea = (fid: string, patch: Partial<FmeaEntry>) => {
    onUpdate({ fmea: step.fmea.map((f) => (f.id === fid ? { ...f, ...patch } : f)) });
  };
  const removeFmea = (fid: string) => {
    onUpdate({ fmea: step.fmea.filter((f) => f.id !== fid) });
  };
  const addTool = () => {
    onUpdate({ tools: [...step.tools, { name: "", note: "" }] });
  };
  const updateTool = (idx: number, patch: Partial<ToolItem>) => {
    onUpdate({ tools: step.tools.map((t, i) => (i === idx ? { ...t, ...patch } : t)) });
  };
  const removeTool = (idx: number) => {
    onUpdate({ tools: step.tools.filter((_, i) => i !== idx) });
  };

  const toggleBom = (bomId: string) => {
    const has = step.bomIds.includes(bomId);
    onUpdate({ bomIds: has ? step.bomIds.filter((b) => b !== bomId) : [...step.bomIds, bomId] });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-sm font-black text-white">{String(step.seq).padStart(2, "0")}</span>
        编辑工序
      </h2>

      {/* Basic info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs text-neutral-400 font-bold">工序名称</label>
          <input value={step.title} onChange={(e) => onUpdate({ title: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white focus:outline-none focus:border-cyan-500" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-400 font-bold">预估工时 (分钟)</label>
          <input type="number" value={step.estimatedMinutes} onChange={(e) => onUpdate({ estimatedMinutes: parseInt(e.target.value, 10) || 0 })} className="w-full h-10 px-3 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white focus:outline-none focus:border-cyan-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-400 font-bold">所需技能等级</label>
          <select value={step.requiredSkill} onChange={(e) => onUpdate({ requiredSkill: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white focus:outline-none focus:border-cyan-500">
            {["T1", "T2", "T3", "T4", "T5"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs text-neutral-400 font-bold">质检卡点 (QC Checkpoint)</label>
          <input value={step.qcCheckpoint} onChange={(e) => onUpdate({ qcCheckpoint: e.target.value })} placeholder="例如：径向跳动值 ≤ 0.02mm" className="w-full h-10 px-3 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-cyan-500" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs text-neutral-400 font-bold">备注</label>
          <textarea value={step.notes} onChange={(e) => onUpdate({ notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none" />
        </div>
      </div>

      {/* FMEA */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-red-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> 历史失效 (FMEA) — {step.fmea.length} 条</p>
          <button onClick={addFmea} className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors"><Plus className="h-3 w-3" /> 添加</button>
        </div>
        {step.fmea.map((f) => (
          <div key={f.id} className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <select value={f.severity} onChange={(e) => updateFmea(f.id, { severity: e.target.value as FmeaEntry["severity"] })} className="h-7 px-2 rounded bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none">
                <option value="high">高</option><option value="medium">中</option><option value="low">低</option>
              </select>
              <input value={f.description} onChange={(e) => updateFmea(f.id, { description: e.target.value })} placeholder="失效描述" className="flex-1 h-7 px-2 rounded bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-cyan-500" />
              <button onClick={() => removeFmea(f.id)} className="p-1 rounded hover:bg-red-500/20 text-red-400"><Trash2 className="h-3 w-3" /></button>
            </div>
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <input value={f.rootCause} onChange={(e) => updateFmea(f.id, { rootCause: e.target.value })} placeholder="根因" className="h-7 px-2 rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 focus:outline-none focus:border-cyan-500" />
              <div className="flex items-center gap-1">
                <input type="number" value={f.lostHours} onChange={(e) => updateFmea(f.id, { lostHours: parseFloat(e.target.value) || 0 })} className="flex-1 h-7 px-2 rounded bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <span className="text-[10px] text-neutral-500">h</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tools */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-amber-400 flex items-center gap-2"><Wrench className="h-4 w-4" /> 工具与辅料 — {step.tools.length} 项</p>
          <button onClick={addTool} className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/30 transition-colors"><Plus className="h-3 w-3" /> 添加</button>
        </div>
        {step.tools.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={t.name} onChange={(e) => updateTool(i, { name: e.target.value })} placeholder="工具名称" className="flex-1 h-8 px-2 rounded bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-cyan-500" />
            <input value={t.note} onChange={(e) => updateTool(i, { note: e.target.value })} placeholder="备注" className="flex-1 h-8 px-2 rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 focus:outline-none focus:border-cyan-500" />
            <button onClick={() => removeTool(i)} className="p-1 rounded hover:bg-red-500/20 text-red-400"><Trash2 className="h-3 w-3" /></button>
          </div>
        ))}
      </div>

      {/* BOM binding */}
      <div className="space-y-3">
        <p className="text-sm font-bold text-cyan-400 flex items-center gap-2"><Package className="h-4 w-4" /> 关联 BOM 物料（勾选本工序需要的物料）</p>
        <div className="rounded-lg border border-neutral-700 divide-y divide-neutral-800">
          {config.bom.map((b) => {
            const checked = step.bomIds.includes(b.id);
            return (
              <label key={b.id} className={cn("flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors", checked ? "bg-cyan-500/5" : "hover:bg-neutral-800/50")}>
                <input type="checkbox" checked={checked} onChange={() => toggleBom(b.id)} className="w-4 h-4 rounded border-neutral-600 accent-cyan-500" />
                <span className="text-xs font-mono text-cyan-300 w-16">{b.code}</span>
                <span className="text-xs text-white flex-1">{b.name}</span>
                <span className="text-[10px] text-neutral-500">{b.spec}</span>
                <span className="text-[10px] text-blue-400">{b.location}</span>
              </label>
            );
          })}
          {config.bom.length === 0 && <div className="p-4 text-center text-neutral-600 text-xs">请先在 BOM 物料 Tab 中添加物料</div>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Login Overlay (unchanged)
// ═══════════════════════════════════════════════════════════

function LoginOverlay({ config, onLogin }: { config: KioskConfig; onLogin: (worker: Worker) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = useCallback(() => {
    if (!code.trim()) return;
    setChecking(true);
    setError("");
    setTimeout(() => {
      const worker = config.workers.find((w) => w.id === code.trim());
      if (!worker) { setError("未找到该工号，请重新输入或联系班组长"); setChecking(false); return; }
      const skillNum = parseInt(worker.skillLevel.replace("T", ""), 10);
      const reqNum = parseInt(config.workOrder.requiredSkill.replace("T", ""), 10);
      if (skillNum < reqNum) {
        setError(`技能等级不匹配！当前工单要求 ${config.workOrder.requiredSkill} 以上，您的评级为 ${worker.skillLevel}。请联系主管授权。`);
        setChecking(false);
        return;
      }
      onLogin(worker);
    }, 800);
  }, [code, config, onLogin]);

  return (
    <div className="fixed inset-0 z-40 bg-neutral-950 flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute inset-x-0 h-px bg-cyan-500/20 animate-scan-down" /></div>
      <div className="text-center space-y-8 max-w-2xl px-8">
        <div className="flex justify-center">
          <div className="w-32 h-32 rounded-3xl bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center animate-pulse">
            <Radio className="h-16 w-16 text-cyan-400" />
          </div>
        </div>
        <div>
          <h1 className="text-5xl font-black text-white tracking-wider">工位身份鉴权</h1>
          <p className="text-2xl text-neutral-500 mt-4 tracking-wide">请刷入员工卡或输入工号</p>
        </div>
        <div className="flex items-center justify-center gap-4">
          <input ref={inputRef} value={code} onChange={(e) => { setCode(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} placeholder="输入工号 (如 8013)" className="w-80 h-20 px-8 rounded-2xl bg-neutral-900 border-2 border-neutral-700 text-4xl text-center text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-cyan-500 transition-colors tracking-[0.3em]" autoFocus />
          <button onClick={handleSubmit} disabled={checking} className="h-20 w-20 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-700 flex items-center justify-center transition-colors">
            {checking ? <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn className="h-10 w-10 text-white" />}
          </button>
        </div>
        {error && (
          <div className="flex items-center justify-center gap-4 px-8 py-5 rounded-2xl bg-red-500/10 border-2 border-red-500/40 max-w-xl mx-auto">
            <Ban className="h-10 w-10 text-red-400 shrink-0" />
            <p className="text-xl text-red-300 text-left leading-relaxed">{error}</p>
          </div>
        )}
        <div className="text-neutral-600 text-lg space-y-1">
          <p>当前工单要求技能等级: <span className="text-amber-500 font-bold">{config.workOrder.requiredSkill}</span></p>
          <p className="text-base">{config.workOrder.woNumber} · {config.workOrder.station}</p>
        </div>
      </div>
      <style>{`
        @keyframes scan-down { 0% { top: -2px; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .animate-scan-down { animation: scan-down 4s linear infinite; }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Top Bar
// ═══════════════════════════════════════════════════════════

function TopBar({ config, worker, onEdit }: { config: KioskConfig; worker: Worker; onEdit: () => void }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(iv); }, []);
  const timeStr = time.toLocaleTimeString("zh-CN", { hour12: false });
  const dateStr = time.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });

  return (
    <div className="h-20 bg-neutral-900/80 border-b-2 border-cyan-500/20 flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30">
            <span className="text-cyan-400 font-mono text-sm font-bold tracking-wider">{config.workOrder.woNumber}</span>
          </div>
          <p className="text-xl font-black text-white truncate tracking-wide">{config.workOrder.projectName}</p>
        </div>
      </div>
      <div className="text-center px-6">
        <p className="text-sm text-neutral-500 tracking-wider">{config.workOrder.station}</p>
        <p className="text-3xl font-black text-white font-mono tracking-[0.15em] tabular-nums">{timeStr}</p>
        <p className="text-xs text-neutral-600">{dateStr}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-lg font-bold text-white">{worker.name}</p>
          <p className="text-sm text-neutral-400 font-mono">工号 {worker.code}</p>
        </div>
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600/30 to-blue-600/30 border-2 border-cyan-500/40 flex items-center justify-center text-2xl font-black text-cyan-300">{worker.avatar}</div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <Shield className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-xs text-emerald-400 font-bold">技能评级</p>
            <p className="text-lg font-black text-emerald-300">{worker.skillLevel} ✅</p>
          </div>
        </div>
        {/* Edit button — subtle */}
        <button onClick={onEdit} className="p-2 rounded-lg bg-neutral-800/60 border border-neutral-700/50 text-neutral-500 hover:text-amber-400 hover:border-amber-500/30 transition-all" title="进入编辑模式">
          <Pencil className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SOP Timeline — data-driven
// ═══════════════════════════════════════════════════════════

function SopTimeline({ steps }: { steps: SopStep[] }) {
  return (
    <div className="flex flex-col h-full bg-neutral-900/50 border-r-2 border-neutral-800 overflow-hidden">
      <div className="shrink-0 px-5 py-4 border-b border-neutral-800">
        <p className="text-xs text-neutral-500 uppercase tracking-[0.2em]">工艺流程 SOP</p>
        <p className="text-sm text-cyan-400 font-bold mt-0.5">{steps.filter((s) => s.status === "completed").length} / {steps.length} 工序完成</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {steps.map((step) => {
          if (step.status === "completed") {
            return (
              <div key={step.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-neutral-800/30 opacity-50">
                <CircleCheck className="h-6 w-6 text-emerald-500 shrink-0" />
                <span className="text-sm text-neutral-500 line-through">[{String(step.seq).padStart(2, "0")}] {step.title}</span>
              </div>
            );
          }
          if (step.status === "active") {
            return (
              <div key={step.id} className="rounded-2xl border-2 border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 via-neutral-900 to-neutral-900 p-5 space-y-4 shadow-lg shadow-cyan-500/10">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center text-lg font-black text-white shrink-0">{String(step.seq).padStart(2, "0")}</div>
                  <div>
                    <p className="text-xs text-cyan-400 uppercase tracking-wider">当前工序 · 执行中</p>
                    <p className="text-lg font-black text-white leading-snug mt-1">{step.title}</p>
                  </div>
                </div>
                {step.fmea.filter(f => f.severity === "high").map((f) => (
                  <div key={f.id} className="rounded-xl bg-red-500/15 border-2 border-red-500/40 p-4 animate-pulse-slow">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-7 w-7 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">⚠️ 历史失效血泪史 (FMEA)</p>
                        <p className="text-sm text-red-200 leading-relaxed font-medium">警报！{f.description}。根因: {f.rootCause}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {step.fmea.filter(f => f.severity !== "high").length > 0 && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <p className="text-xs text-amber-400 font-bold mb-1">⚡ 其他注意事项</p>
                    {step.fmea.filter(f => f.severity !== "high").map((f) => (
                      <p key={f.id} className="text-xs text-amber-200/80 mt-0.5">· {f.description}</p>
                    ))}
                  </div>
                )}
                {step.tools.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-400 font-bold flex items-center gap-2"><Wrench className="h-4 w-4" /> 🛠️ 工具与辅料</p>
                    {step.tools.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200">
                        <ChevronRight className="h-4 w-4 text-amber-500 shrink-0" />
                        {t.name}{t.note && <span className="text-amber-400/60 ml-1">({t.note})</span>}
                      </div>
                    ))}
                  </div>
                )}
                {step.qcCheckpoint && (
                  <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-3">
                    <p className="text-xs text-purple-400 font-bold flex items-center gap-2 mb-1"><FileText className="h-4 w-4" /> 📋 质检卡点</p>
                    <p className="text-base text-purple-200 font-bold">{step.qcCheckpoint}</p>
                    <p className="text-xs text-neutral-500 mt-1">要求技能等级 {step.requiredSkill} 以上</p>
                  </div>
                )}
                {step.notes && <p className="text-xs text-neutral-400 italic px-1">💡 {step.notes}</p>}
              </div>
            );
          }
          return (
            <div key={step.id} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-neutral-800/20 opacity-40">
              <CircleDot className="h-6 w-6 text-neutral-600 shrink-0" />
              <span className="text-sm text-neutral-500">[{String(step.seq).padStart(2, "0")}] {step.title}</span>
              <Lock className="h-4 w-4 text-neutral-700 ml-auto" />
            </div>
          );
        })}
      </div>
      <style>{`@keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } } .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Center Panel — 3D + BOM (data-driven)
// ═══════════════════════════════════════════════════════════

function CenterPanel({ config, activeStep }: { config: KioskConfig; activeStep: SopStep | undefined }) {
  const bomForStep = useMemo(() => {
    if (!activeStep) return config.bom;
    if (activeStep.bomIds.length === 0) return config.bom;
    return config.bom.filter((b) => activeStep.bomIds.includes(b.id));
  }, [config.bom, activeStep]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 3D view placeholders */}
      <div className="grid grid-cols-2 gap-3 p-4 shrink-0">
        <div className="aspect-[16/10] rounded-2xl border-2 border-neutral-700 bg-neutral-900 overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[85%] h-[80%] relative">
              <div className="absolute inset-y-[15%] inset-x-[10%] border-2 border-cyan-500/40 rounded-lg bg-cyan-500/5">
                <div className="absolute top-1/2 inset-x-0 h-px border-t-2 border-dashed border-cyan-500/30" />
                <div className="absolute left-[15%] top-[25%] bottom-[25%] w-[12%] border-2 border-amber-500/50 bg-amber-500/10 rounded" />
                <div className="absolute right-[15%] top-[25%] bottom-[25%] w-[12%] border-2 border-amber-500/50 bg-amber-500/10 rounded" />
                <div className="absolute left-[35%] top-[20%] right-[35%] bottom-[20%] border-2 border-emerald-500/50 bg-emerald-500/10 rounded-lg flex items-center justify-center"><span className="text-emerald-400 text-[10px] font-bold">泵芯</span></div>
                <div className="absolute right-0 top-[42%] bottom-[42%] w-[20%] border-2 border-purple-500/40 bg-purple-500/10 rounded-r-lg flex items-center justify-center"><span className="text-purple-400 text-[9px]">电机轴</span></div>
              </div>
              <div className="absolute top-[8%] left-[10%] right-[10%] flex items-center">
                <div className="h-px flex-1 bg-neutral-500" /><span className="px-2 text-[10px] text-neutral-400 font-mono">{activeStep?.qcCheckpoint || "—"}</span><div className="h-px flex-1 bg-neutral-500" />
              </div>
            </div>
          </div>
          <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-neutral-950/80 border border-neutral-700"><p className="text-xs text-cyan-400 font-bold">正视剖面图</p></div>
        </div>
        <div className="aspect-[16/10] rounded-2xl border-2 border-neutral-700 bg-neutral-900 overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-48 h-48">
              <div className="absolute inset-4 rounded-full border-2 border-neutral-600 bg-neutral-800/50" />
              <div className="absolute inset-12 rounded-full border-2 border-cyan-500/30 bg-cyan-500/5" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-cyan-500/40 border border-cyan-500" />
              {[
                { top: "8%", left: "46%", num: "\u2460", color: "text-emerald-400 border-emerald-500 bg-emerald-500/20" },
                { top: "46%", left: "84%", num: "\u2461", color: "text-amber-400 border-amber-500 bg-amber-500/20" },
                { top: "84%", left: "46%", num: "\u2462", color: "text-cyan-400 border-cyan-500 bg-cyan-500/20" },
                { top: "46%", left: "8%", num: "\u2463", color: "text-purple-400 border-purple-500 bg-purple-500/20" },
              ].map((bolt) => (
                <div key={bolt.num} className={cn("absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center text-sm font-black", bolt.color)} style={{ top: bolt.top, left: bolt.left }}>{bolt.num}</div>
              ))}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
                <defs><marker id="ah" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><polygon points="0 0, 6 2, 0 4" fill="#22d3ee" fillOpacity="0.5" /></marker></defs>
                <line x1="100" y1="36" x2="100" y2="164" stroke="#22d3ee" strokeWidth="1" strokeDasharray="4" markerEnd="url(#ah)" opacity="0.3" />
                <line x1="164" y1="100" x2="36" y2="100" stroke="#22d3ee" strokeWidth="1" strokeDasharray="4" markerEnd="url(#ah)" opacity="0.3" />
              </svg>
            </div>
          </div>
          <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-neutral-950/80 border border-neutral-700"><p className="text-xs text-cyan-400 font-bold">俯视螺栓对角打紧</p></div>
          <div className="absolute bottom-3 left-3 text-[10px] text-amber-400 font-bold">1\u21923\u21922\u21924 交叉</div>
        </div>
      </div>

      {/* BOM table — data-driven */}
      <div className="flex-1 px-4 pb-4 overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <Package className="h-5 w-5 text-cyan-400" />
          <p className="text-base font-black text-white tracking-wide">
            {activeStep ? `步骤 ${String(activeStep.seq).padStart(2, "0")} BOM 清单` : "全部 BOM 清单"}
          </p>
          <span className="text-xs text-neutral-500">{bomForStep.length} 项</span>
          <div className="h-px flex-1 bg-neutral-800" />
        </div>
        <div className="flex-1 overflow-y-auto rounded-xl border-2 border-neutral-800 bg-neutral-900/60">
          <div className="grid grid-cols-[80px_1fr_120px_1fr_80px] gap-4 px-5 py-3 border-b border-neutral-800 bg-neutral-800/50 sticky top-0">
            <span className="text-xs text-neutral-500 font-bold uppercase">编码</span>
            <span className="text-xs text-neutral-500 font-bold uppercase">名称</span>
            <span className="text-xs text-neutral-500 font-bold uppercase">规格</span>
            <span className="text-xs text-neutral-500 font-bold uppercase">📍 库位导航</span>
            <span className="text-xs text-neutral-500 font-bold uppercase">数量</span>
          </div>
          {bomForStep.map((item) => (
            <div key={item.id} className="grid grid-cols-[80px_1fr_120px_1fr_80px] gap-4 px-5 py-4 border-b border-neutral-800/50 hover:bg-cyan-500/5 transition-colors">
              <span className="text-base font-mono font-bold text-cyan-300">{item.code}</span>
              <span className="text-base text-white font-medium">{item.name}</span>
              <span className="text-sm text-neutral-400">{item.spec}</span>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="text-base text-blue-300 font-bold">{item.location}</span>
                <span className="ml-auto px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-xs text-blue-400 font-mono font-bold animate-pulse">{item.zone}</span>
              </div>
              <span className="text-base text-white font-mono text-center">×{item.qty}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Right Panel — Vision + Timer (data-driven)
// ═══════════════════════════════════════════════════════════

function RightPanel({ activeStep, elapsed, onComplete }: { activeStep: SopStep | undefined; elapsed: number; onComplete: () => void }) {
  const [visionState, setVisionState] = useState<"idle" | "scanning" | "matched">("idle");
  const handleSimulatePick = useCallback(() => { setVisionState("scanning"); setTimeout(() => setVisionState("matched"), 1500); }, []);

  // Reset vision on step change
  const stepId = activeStep?.id;
  useEffect(() => { setVisionState("idle"); }, [stepId]);

  const estMinutes = activeStep?.estimatedMinutes ?? 45;
  const aiTotalSecs = estMinutes * 60;
  const formatTime = (secs: number) => `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const actualProgress = Math.min((elapsed / aiTotalSecs) * 100, 100);
  const ahead = elapsed < aiTotalSecs;

  return (
    <div className="flex flex-col h-full bg-neutral-900/50 border-l-2 border-neutral-800">
      <div className="p-4 space-y-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-cyan-400" />
          <p className="text-sm font-bold text-white tracking-wide">BOM 视觉防呆</p>
          <span className={cn("ml-auto w-2.5 h-2.5 rounded-full", visionState === "matched" ? "bg-emerald-400" : visionState === "scanning" ? "bg-amber-400 animate-pulse" : "bg-neutral-600")} />
        </div>
        <div className="relative aspect-[16/10] rounded-2xl border-2 border-neutral-700 bg-black overflow-hidden">
          <div className="absolute inset-0">
            {visionState === "scanning" && <div className="absolute inset-x-0 h-0.5 bg-cyan-400/60 animate-scan-down" />}
            <div className="absolute inset-0 opacity-10">
              {[...Array(6)].map((_, i) => <div key={`h${i}`} className="absolute inset-x-0 h-px bg-cyan-500" style={{ top: `${(i + 1) * (100 / 7)}%` }} />)}
              {[...Array(8)].map((_, i) => <div key={`v${i}`} className="absolute inset-y-0 w-px bg-cyan-500" style={{ left: `${(i + 1) * (100 / 9)}%` }} />)}
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            {visionState === "idle" && <div className="text-center space-y-3"><ScanLine className="h-12 w-12 text-neutral-600 mx-auto" /><p className="text-lg text-neutral-500 font-mono animate-pulse">等待工人拾取零件...</p></div>}
            {visionState === "scanning" && <div className="text-center space-y-3"><Crosshair className="h-16 w-16 text-cyan-400 mx-auto animate-spin" style={{ animationDuration: "3s" }} /><p className="text-lg text-cyan-400 font-mono">云端比对中...</p></div>}
            {visionState === "matched" && (
              <div className="text-center space-y-3">
                <div className="w-40 h-28 border-2 border-emerald-400 rounded-xl mx-auto flex items-center justify-center bg-emerald-500/10 relative">
                  <Package className="h-12 w-12 text-emerald-400" />
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                </div>
                <p className="text-lg text-emerald-300 font-black">零件轮廓 99.8% 匹配</p>
                <p className="text-base text-emerald-400 font-bold">✅ BOM 特征比对合规</p>
              </div>
            )}
          </div>
          <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-neutral-950/80 flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 font-mono">CAM-{(activeStep?.seq ?? 0).toString().padStart(2, "0")}</span>
            <span className={cn("text-[10px] font-bold", visionState === "matched" ? "text-emerald-400" : visionState === "scanning" ? "text-amber-400" : "text-neutral-600")}>{visionState === "idle" ? "待触发" : visionState === "scanning" ? "扫描中" : "已锁定"}</span>
          </div>
        </div>
        <button onClick={handleSimulatePick} disabled={visionState === "scanning"} className={cn("w-full py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-3", visionState === "matched" ? "bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-400" : visionState === "scanning" ? "bg-neutral-800 border-2 border-neutral-700 text-neutral-500 cursor-wait" : "bg-cyan-500/15 border-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25")}>
          <Camera className="h-5 w-5" />
          {visionState === "matched" ? "✅ 物料已确认" : visionState === "scanning" ? "识别中..." : "📷 模拟拿取 BOM 物料"}
        </button>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2"><Timer className="h-5 w-5 text-amber-400" /><p className="text-sm font-bold text-white">工时对决</p></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-400 font-bold flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5" />AI 推演</span>
              <span className="text-lg font-black text-blue-300 font-mono">{estMinutes} min</span>
            </div>
            <div className="h-5 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: "100%" }} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />实际耗时</span>
              <span className={cn("text-2xl font-black font-mono tabular-nums", ahead ? "text-emerald-300" : "text-red-400")}>{formatTime(elapsed)}</span>
            </div>
            <div className="h-5 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700">
              <div className={cn("h-full rounded-full transition-all duration-1000", ahead ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : "bg-gradient-to-r from-red-600 to-red-400")} style={{ width: `${Math.min(actualProgress, 100)}%` }} />
            </div>
          </div>
          <div className={cn("rounded-xl p-3 text-center border", ahead ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20")}>
            <p className={cn("text-xs", ahead ? "text-emerald-400" : "text-red-400")}>{ahead ? `⚡ 领先 ${formatTime(aiTotalSecs - elapsed)}` : `⏰ 超时 ${formatTime(elapsed - aiTotalSecs)}`}</p>
          </div>
        </div>
        <div className="mt-4">
          <button onClick={onComplete} className="relative group w-full">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/30 via-cyan-400/20 to-emerald-500/30 blur-md group-hover:blur-lg transition-all animate-pulse" />
            <div className="relative flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-cyan-600 text-white font-black text-base shadow-lg"><Flag className="h-6 w-6" /> 🏁 合格 · 自动结算并进入下一步</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Completion Overlay
// ═══════════════════════════════════════════════════════════

function CompletionOverlay({ step, elapsed }: { step: SopStep; elapsed: number }) {
  const m = Math.floor(elapsed / 60); const s = elapsed % 60;
  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/95 flex items-center justify-center">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="w-32 h-32 rounded-full bg-emerald-500/20 border-4 border-emerald-500 flex items-center justify-center mx-auto"><CheckCircle2 className="h-20 w-20 text-emerald-400" /></div>
        <h1 className="text-5xl font-black text-emerald-300">工序完成 ✅</h1>
        <p className="text-2xl text-neutral-300">{step.title}</p>
        <div className="flex items-center justify-center gap-8">
          <div className="text-center"><p className="text-4xl font-black text-white font-mono">{m}:{String(s).padStart(2, "0")}</p><p className="text-sm text-neutral-500 mt-1">实际用时</p></div>
          <div className="h-12 w-px bg-neutral-700" />
          <div className="text-center"><p className="text-4xl font-black text-blue-400 font-mono">{step.estimatedMinutes}:00</p><p className="text-sm text-neutral-500 mt-1">AI 预估</p></div>
        </div>
        <p className="text-lg text-neutral-400">工时已自动上报 · 正在加载下一道工序...</p>
        <div className="flex justify-center"><div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function SmartEsopTvKiosk() {
  const [configs, setConfigs] = useState<Record<string, KioskConfig>>(loadConfigs);
  const [activeKey, setActiveKey] = useState(loadActiveKey);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [steps, setSteps] = useState<SopStep[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = configs[activeKey] ?? configs.default ?? DEFAULT_CONFIG;

  // Initialize steps from config on config change
  useEffect(() => {
    setSteps(config.steps.map((s, i) => ({
      ...s,
      status: i === 0 ? (s.status === "completed" ? "completed" : "active") : s.status,
    })));
  }, [config]);

  // Ensure first non-completed step is active on init
  useEffect(() => {
    setSteps((prev) => {
      const hasActive = prev.some((s) => s.status === "active");
      if (hasActive) return prev;
      const firstPending = prev.findIndex((s) => s.status === "pending");
      if (firstPending >= 0) {
        return prev.map((s, i) => (i === firstPending ? { ...s, status: "active" as const } : s));
      }
      return prev;
    });
  }, []);

  // Timer
  useEffect(() => {
    if (worker && !completed && !editMode) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [worker, completed, editMode]);

  const activeStep = steps.find((s) => s.status === "active");

  const handleLogin = useCallback((w: Worker) => setWorker(w), []);

  const handleComplete = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCompleted(true);
    setTimeout(() => {
      setSteps((prev) => {
        const next = [...prev];
        const activeIdx = next.findIndex((s) => s.status === "active");
        if (activeIdx >= 0) {
          next[activeIdx] = { ...next[activeIdx], status: "completed" };
          if (activeIdx + 1 < next.length) next[activeIdx + 1] = { ...next[activeIdx + 1], status: "active" };
        }
        return next;
      });
      setElapsed(0);
      setCompleted(false);
    }, 4000);
  }, []);

  const handleConfigChange = useCallback((newConfig: KioskConfig) => {
    setConfigs((prev) => {
      const next = { ...prev, [activeKey]: { ...newConfig, updatedAt: new Date().toISOString() } };
      saveConfigs(next);
      return next;
    });
  }, [activeKey]);

  const handleSave = useCallback(() => {
    saveConfigs(configs);
    saveActiveKey(activeKey);
  }, [configs, activeKey]);

  const handleSwitchPreset = useCallback((key: string) => {
    setActiveKey(key);
    saveActiveKey(key);
    setWorker(null);
    setElapsed(0);
    setCompleted(false);
  }, []);

  const handleDeletePreset = useCallback((key: string) => {
    setConfigs((prev) => {
      const next = { ...prev };
      delete next[key];
      saveConfigs(next);
      return next;
    });
    if (activeKey === key) handleSwitchPreset("default");
  }, [activeKey, handleSwitchPreset]);

  const handleDuplicatePreset = useCallback((fromKey: string, newName: string) => {
    const source = configs[fromKey];
    if (!source) return;
    const newKey = `preset_${Date.now()}`;
    setConfigs((prev) => {
      const next = { ...prev, [newKey]: { ...JSON.parse(JSON.stringify(source)), name: newName, updatedAt: new Date().toISOString() } };
      saveConfigs(next);
      return next;
    });
  }, [configs]);

  // Editor overlay
  if (editMode) {
    return (
      <EditorOverlay
        config={config}
        onChange={handleConfigChange}
        onClose={() => { setEditMode(false); setWorker(null); setElapsed(0); }}
        onSave={handleSave}
        configs={configs}
        activeKey={activeKey}
        onSwitchPreset={handleSwitchPreset}
        onDeletePreset={handleDeletePreset}
        onDuplicatePreset={handleDuplicatePreset}
      />
    );
  }

  // Login gate
  if (!worker) {
    return (
      <div className="relative">
        <LoginOverlay config={config} onLogin={handleLogin} />
        {/* Subtle edit button on login screen */}
        <button
          onClick={() => setEditMode(true)}
          className="fixed top-4 right-4 z-[60] p-2.5 rounded-lg bg-neutral-800/60 border border-neutral-700/50 text-neutral-600 hover:text-amber-400 hover:border-amber-500/30 transition-all"
          title="进入编辑模式"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-neutral-950 text-white flex flex-col overflow-hidden select-none">
      {completed && activeStep && <CompletionOverlay step={activeStep} elapsed={elapsed} />}
      <TopBar config={config} worker={worker} onEdit={() => setEditMode(true)} />
      <div className="flex-1 flex min-h-0">
        <div className="w-[25%] shrink-0"><SopTimeline steps={steps} /></div>
        <div className="w-[45%] shrink-0 border-l-2 border-neutral-800"><CenterPanel config={config} activeStep={activeStep} /></div>
        <div className="w-[30%] shrink-0"><RightPanel activeStep={activeStep} elapsed={elapsed} onComplete={handleComplete} /></div>
      </div>
      <FloatingNav />
    </div>
  );
}
