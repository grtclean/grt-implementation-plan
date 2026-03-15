/**
 * QuotingBomSandbox — #6 报价 BOM 与 SOP 编排沙盘
 *
 * 三栏交互工作台：
 *   左栏 — SOP 工序可编辑表单（useState 驱动，真实 <input>）
 *   中栏 — BOM 物料选配 + 成本预算
 *   右栏 — RAG 知识注入 + 质量卡控面板
 *
 * 零 unicode escape · 零 any · 零静态写死
 */
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Layers, Package, AlertTriangle, CheckCircle2, Search,
  Plus, Trash2, ChevronRight, Zap, FileText,
  ArrowRight, Clock, DollarSign, Shield, FlaskConical,
  BarChart3, Cpu, CircleDot, ChevronDown, ChevronUp,
  Eye, Download, RefreshCw, X, GripVertical,
  Lightbulb, BookOpen, ArrowDownToLine, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SandboxEventFlowPanel from "@/components/Sandbox/SandboxEventFlowPanel";

// ═══════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════

interface ISopRow {
  id: number;
  step: string;
  material: string;
  qualityNote: string;
  min: number;
  costYuan: number;
  status: "pending" | "editing" | "validated" | "warning";
}

interface IBomItem {
  id: string;
  code: string;
  name: string;
  spec: string;
  category: "机械" | "电气" | "流体" | "密封" | "辅料" | "标准件";
  unitPrice: number;
  unit: string;
  stock: number;
  leadDays: number;
}

interface IRagCard {
  id: string;
  title: string;
  source: string;
  content: string;
  keywords: string[];
  relevance: number;
}

type RagStatus = null | { status: "idle" } | { status: "loading"; rowId: number } | { status: "ready"; rowId: number; cards: IRagCard[] } | { status: "warning"; rowId: number; message: string };

type QcCheckStatus = "unchecked" | "pass" | "fail" | "warning";

interface IQcCheck {
  id: string;
  label: string;
  target: string;
  status: QcCheckStatus;
  note: string;
}

// ═══════════════════════════════════════════════════════════
// 知识库（模拟 RAG 数据源）
// ═══════════════════════════════════════════════════════════

const RAG_KNOWLEDGE: IRagCard[] = [
  {
    id: "k1", title: "柱塞泵装配扭矩标准",
    source: "GRT-ME-STD-001 §4.2",
    content: "63MPa 柱塞泵主轴螺栓需按 M12 12.9级 45±3Nm 对角交叉紧固，分三次递进（30%→70%→100%）。最终扭矩偏差超过 ±5% 必须返工。",
    keywords: ["柱塞泵", "扭矩", "装配", "螺栓", "紧固"],
    relevance: 0,
  },
  {
    id: "k2", title: "KW-40 清洗剂配比规范",
    source: "GRT-CH-SPC-012 §2.1",
    content: "KW-40 水基清洗剂浓度 5%~8%（v/v），温度 45±5°C。浸泡时间 3~8 分钟，超过 10 分钟可能腐蚀铝合金表面。废液按危废处理。",
    keywords: ["清洗剂", "KW-40", "浸泡", "浓度", "预浸泡"],
    relevance: 0,
  },
  {
    id: "k3", title: "H13 定位销热处理要求",
    source: "GRT-ME-MAT-007 §3.4",
    content: "H13 定位销硬度 HRC 48~52，表面粗糙度 Ra0.8。安装前需用异丙醇清洁接触面，压入力控制在 2~5kN，禁止锤击。",
    keywords: ["定位销", "H13", "上料", "定位", "热处理"],
    relevance: 0,
  },
  {
    id: "k4", title: "高压管路密封标准",
    source: "GRT-HY-STD-003 §5.1",
    content: "63MPa 以上管路接头必须使用 JB/T 966 标准 24° 锥密封。O 型圈选用氟橡胶 FKM（耐温 -20~200°C）。试压 1.5 倍工作压力保持 15 分钟无渗漏。",
    keywords: ["密封", "高压", "管路", "O型圈", "试压"],
    relevance: 0,
  },
  {
    id: "k5", title: "伺服电机对中规范",
    source: "GRT-EL-ALG-002 §1.3",
    content: "电机-泵轴对中偏差：径向 ≤0.05mm，轴向 ≤0.08mm。使用激光对中仪校正，联轴器间隙 2~3mm。对中完成后锁紧地脚螺栓并标记。",
    keywords: ["伺服电机", "对中", "联轴器", "装配", "调试"],
    relevance: 0,
  },
  {
    id: "k6", title: "BOM 成本核算指南",
    source: "GRT-FIN-BOM-001 §2.2",
    content: "报价 BOM 成本 = Σ(物料单价×数量) × 1.08(损耗系数) + 工时费(¥180/h) × 总工时 + 管理费(12%) + 利润(15%)。对外报价 = 总成本 × 1.35。",
    keywords: ["成本", "报价", "BOM", "核算", "工时费"],
    relevance: 0,
  },
  {
    id: "k7", title: "FMEA 严重度评分基准",
    source: "GRT-QA-FMEA-001 §3.1",
    content: "严重度 S≥8 时必须增加检测频次或设计改善。S=10（人身安全风险）立即停线。RPN>125 列入优先改善计划。柱塞泵漏油 S=9，泵压不达标 S=8。",
    keywords: ["FMEA", "严重度", "质量", "风险", "RPN"],
    relevance: 0,
  },
];

// ═══════════════════════════════════════════════════════════
// BOM 物料库
// ═══════════════════════════════════════════════════════════

const BOM_LIBRARY: IBomItem[] = [
  { id: "bom-01", code: "P-8821", name: "进口高压柱塞泵", spec: "63MPa / 15L/min", category: "机械", unitPrice: 18500, unit: "台", stock: 3, leadDays: 45 },
  { id: "bom-02", code: "M-102", name: "1.5kW 伺服电机", spec: "1500rpm / IP65", category: "电气", unitPrice: 4200, unit: "台", stock: 8, leadDays: 14 },
  { id: "bom-03", code: "S-445", name: "弹性联轴器", spec: "Φ42 / 扭矩120Nm", category: "机械", unitPrice: 680, unit: "只", stock: 12, leadDays: 7 },
  { id: "bom-04", code: "F-019", name: "M12×80 高强度螺栓", spec: "12.9级 / 达克罗", category: "标准件", unitPrice: 8.5, unit: "只", stock: 200, leadDays: 3 },
  { id: "bom-05", code: "G-301", name: "X-20 厌氧密封胶", spec: "50ml/支", category: "辅料", unitPrice: 45, unit: "支", stock: 30, leadDays: 5 },
  { id: "bom-06", code: "H-112", name: "H13 定位销", spec: "Φ12×60 / HRC50", category: "标准件", unitPrice: 22, unit: "只", stock: 50, leadDays: 3 },
  { id: "bom-07", code: "R-088", name: "FKM 氟橡胶 O 型圈", spec: "Φ28×3.5", category: "密封", unitPrice: 6.5, unit: "只", stock: 100, leadDays: 5 },
  { id: "bom-08", code: "C-401", name: "KW-40 水基清洗剂", spec: "25L/桶", category: "辅料", unitPrice: 380, unit: "桶", stock: 15, leadDays: 7 },
  { id: "bom-09", code: "T-203", name: "高压不锈钢管", spec: "Φ16×2 / 316L", category: "流体", unitPrice: 120, unit: "米", stock: 60, leadDays: 10 },
  { id: "bom-10", code: "V-055", name: "单向阀", spec: "DN15 / 100MPa", category: "流体", unitPrice: 950, unit: "只", stock: 6, leadDays: 21 },
  { id: "bom-11", code: "E-320", name: "压力传感器", spec: "0-100MPa / 4-20mA", category: "电气", unitPrice: 1850, unit: "只", stock: 4, leadDays: 14 },
  { id: "bom-12", code: "D-710", name: "触摸屏 HMI", spec: "10寸 / IP65 / RS485", category: "电气", unitPrice: 3200, unit: "台", stock: 2, leadDays: 21 },
];

// ═══════════════════════════════════════════════════════════
// CSS 注入（全局 keyframes，含单例保护）
// ═══════════════════════════════════════════════════════════

const STYLE_ID = "quoting-bom-sandbox-keyframes";
function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
@keyframes qbsPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
@keyframes qbsGlow { 0%{box-shadow:0 0 4px rgba(6,182,212,.2)} 50%{box-shadow:0 0 16px rgba(6,182,212,.5)} 100%{box-shadow:0 0 4px rgba(6,182,212,.2)} }
@keyframes qbsScanDown { 0%{top:-2px} 100%{top:100%} }
@keyframes qbsFlashGreen { 0%{background:rgba(34,197,94,.25)} 100%{background:transparent} }
@keyframes qbsFlashAmber { 0%{background:rgba(245,158,11,.2)} 100%{background:transparent} }
@keyframes qbsSlideIn { 0%{opacity:0;transform:translateX(20px)} 100%{opacity:1;transform:translateX(0)} }
@keyframes qbsShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes qbsTypewriter { 0%{width:0} 100%{width:100%} }
`;
  document.head.appendChild(el);
}

// ═══════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════

let _uid = 100;
function uid(): number { return ++_uid; }

function fuzzyMatch(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) score += 1;
  }
  return score;
}

// ═══════════════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════════════

export default function QuotingBomSandbox() {
  useEffect(() => { injectKeyframes(); }, []);

  // ─── SOP 工序表单状态 ───
  const [sopRows, setSopRows] = useState<ISopRow[]>([
    { id: 1, step: "T1 上料定位", material: "定位销 H13", qualityNote: "", min: 8, costYuan: 0, status: "pending" },
    { id: 2, step: "T2 预浸泡", material: "清洗剂 KW-40", qualityNote: "", min: 5, costYuan: 0, status: "pending" },
    { id: 3, step: "T3 高压冲洗", material: "高压不锈钢管", qualityNote: "", min: 12, costYuan: 0, status: "pending" },
    { id: 4, step: "T4 柱塞泵装配与调试", material: "", qualityNote: "", min: 20, costYuan: 0, status: "editing" },
    { id: 5, step: "T5 管路密封检测", material: "", qualityNote: "", min: 15, costYuan: 0, status: "pending" },
    { id: 6, step: "T6 系统联调与试压", material: "", qualityNote: "", min: 25, costYuan: 0, status: "pending" },
  ]);

  // ─── BOM 选配状态 ───
  const [selectedBomIds, setSelectedBomIds] = useState<Set<string>>(new Set(["bom-01", "bom-06", "bom-08"]));
  const [bomQty, setBomQty] = useState<Record<string, number>>({ "bom-01": 1, "bom-06": 4, "bom-08": 2 });
  const [bomSearch, setBomSearch] = useState("");
  const [bomCategoryFilter, setBomCategoryFilter] = useState<string>("全部");

  // ─── RAG 知识注入状态 ───
  const [ragStatus, setRagStatus] = useState<RagStatus>(null);
  const [injectedIds, setInjectedIds] = useState<Set<string>>(new Set());
  const [focusedRowId, setFocusedRowId] = useState<number | null>(null);
  const ragTimerRef = useRef<number>(0);

  // ─── QC 质量卡控 ───
  const [qcChecks, setQcChecks] = useState<IQcCheck[]>([
    { id: "qc1", label: "BOM 完整性", target: "所有工序关联物料", status: "unchecked", note: "" },
    { id: "qc2", label: "工时合理性", target: "单工序 ≤ 30分钟", status: "unchecked", note: "" },
    { id: "qc3", label: "质量备注覆盖率", target: "≥ 80% 工序有备注", status: "unchecked", note: "" },
    { id: "qc4", label: "高风险工序标识", target: "≥ 20min 工序需 FMEA", status: "unchecked", note: "" },
    { id: "qc5", label: "成本偏差检查", target: "与历史均值偏差 ≤ 15%", status: "unchecked", note: "" },
  ]);
  const [showQcPanel, setShowQcPanel] = useState(false);

  // ─── 面板折叠状态 ───
  const [ragPanelOpen, setRagPanelOpen] = useState(true);
  const [costPanelOpen, setCostPanelOpen] = useState(true);

  // ═══════════ SOP 行操作 ═══════════

  const updateSopField = useCallback((rowId: number, field: keyof ISopRow, value: string | number) => {
    setSopRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value, status: r.status === "validated" ? "editing" : r.status } as ISopRow : r));
  }, []);

  const addSopRow = useCallback(() => {
    const nextId = uid();
    const nextSeq = sopRows.length + 1;
    setSopRows(prev => [...prev, {
      id: nextId,
      step: `T${nextSeq} 新工序`,
      material: "",
      qualityNote: "",
      min: 10,
      costYuan: 0,
      status: "editing" as const,
    }]);
  }, [sopRows.length]);

  const removeSopRow = useCallback((rowId: number) => {
    setSopRows(prev => prev.filter(r => r.id !== rowId));
  }, []);

  const validateSopRow = useCallback((rowId: number) => {
    setSopRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const warnings: string[] = [];
      if (!r.material.trim()) warnings.push("物料未填写");
      if (r.min > 30) warnings.push("工时超过30分钟上限");
      if (!r.qualityNote.trim() && r.min >= 15) warnings.push("高耗时工序缺少质量备注");
      return { ...r, status: warnings.length > 0 ? "warning" : "validated" };
    }));
  }, []);

  // ═══════════ RAG 知识搜索 ═══════════

  const triggerRagSearch = useCallback((rowId: number, keyword: string) => {
    if (!keyword.trim()) { setRagStatus(null); return; }
    setRagStatus({ status: "loading", rowId });
    setFocusedRowId(rowId);

    clearTimeout(ragTimerRef.current);
    ragTimerRef.current = window.setTimeout(() => {
      const scored = RAG_KNOWLEDGE.map(card => ({
        ...card,
        relevance: fuzzyMatch(keyword, card.keywords) + fuzzyMatch(keyword, [card.title]),
      })).filter(c => c.relevance > 0).sort((a, b) => b.relevance - a.relevance);

      if (scored.length === 0) {
        setRagStatus({ status: "warning", rowId, message: `未找到与「${keyword}」相关的知识条目` });
      } else {
        setRagStatus({ status: "ready", rowId, cards: scored.slice(0, 4) });
      }
    }, 1200);
  }, []);

  useEffect(() => {
    return () => { clearTimeout(ragTimerRef.current); };
  }, []);

  // ─── RAG 注入到 SOP 行 ───
  const injectKnowledge = useCallback((cardId: string, targetRowId: number, snippet: string) => {
    setSopRows(prev => prev.map(r => {
      if (r.id !== targetRowId) return r;
      const existing = r.qualityNote.trim();
      const merged = existing ? `${existing}；${snippet}` : snippet;
      return { ...r, qualityNote: merged, status: "editing" };
    }));
    setInjectedIds(prev => new Set(prev).add(cardId));
  }, []);

  // ═══════════ BOM 操作 ═══════════

  const toggleBom = useCallback((bomId: string) => {
    setSelectedBomIds(prev => {
      const next = new Set(prev);
      if (next.has(bomId)) { next.delete(bomId); } else { next.add(bomId); }
      return next;
    });
    setBomQty(prev => ({ ...prev, [bomId]: prev[bomId] ?? 1 }));
  }, []);

  const updateBomQty = useCallback((bomId: string, qty: number) => {
    setBomQty(prev => ({ ...prev, [bomId]: Math.max(1, qty) }));
  }, []);

  // ═══════════ BOM 过滤 ═══════════

  const filteredBom = useMemo(() => {
    return BOM_LIBRARY.filter(item => {
      if (bomCategoryFilter !== "全部" && item.category !== bomCategoryFilter) return false;
      if (bomSearch.trim()) {
        const q = bomSearch.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || item.spec.toLowerCase().includes(q);
      }
      return true;
    });
  }, [bomSearch, bomCategoryFilter]);

  const bomCategories = ["全部", "机械", "电气", "流体", "密封", "辅料", "标准件"];

  // ═══════════ 成本计算 ═══════════

  const costSummary = useMemo(() => {
    const materialCost = Array.from(selectedBomIds).reduce((sum, id) => {
      const item = BOM_LIBRARY.find(b => b.id === id);
      if (!item) return sum;
      return sum + item.unitPrice * (bomQty[id] ?? 1);
    }, 0);
    const totalMinutes = sopRows.reduce((sum, r) => sum + r.min, 0);
    const laborCost = (totalMinutes / 60) * 180; // ¥180/h
    const wasteFactor = 1.08;
    const managementRate = 0.12;
    const profitRate = 0.15;
    const baseCost = materialCost * wasteFactor + laborCost;
    const management = baseCost * managementRate;
    const profit = (baseCost + management) * profitRate;
    const totalCost = baseCost + management + profit;
    const quotePrice = totalCost * 1.35;
    return { materialCost, laborCost, totalMinutes, baseCost, management, profit, totalCost, quotePrice };
  }, [selectedBomIds, bomQty, sopRows]);

  // ═══════════ QC 卡控自动检查 ═══════════

  const runQcChecks = useCallback(() => {
    setQcChecks(prev => prev.map(check => {
      switch (check.id) {
        case "qc1": {
          const emptyMat = sopRows.filter(r => !r.material.trim());
          return { ...check, status: emptyMat.length === 0 ? "pass" : "fail" as QcCheckStatus, note: emptyMat.length > 0 ? `${emptyMat.length} 道工序缺物料：${emptyMat.map(r => r.step).join("、")}` : "全部工序已关联物料" };
        }
        case "qc2": {
          const overTime = sopRows.filter(r => r.min > 30);
          return { ...check, status: overTime.length === 0 ? "pass" : "warning" as QcCheckStatus, note: overTime.length > 0 ? `${overTime.map(r => `${r.step}(${r.min}min)`).join("、")}超时` : "全部工序在合理范围" };
        }
        case "qc3": {
          const withNote = sopRows.filter(r => r.qualityNote.trim().length > 0).length;
          const ratio = sopRows.length > 0 ? Math.round((withNote / sopRows.length) * 100) : 0;
          return { ...check, status: ratio >= 80 ? "pass" : ratio >= 50 ? "warning" : "fail" as QcCheckStatus, note: `覆盖率 ${ratio}%（${withNote}/${sopRows.length}）` };
        }
        case "qc4": {
          const highRisk = sopRows.filter(r => r.min >= 20 && !r.qualityNote.trim());
          return { ...check, status: highRisk.length === 0 ? "pass" : "fail" as QcCheckStatus, note: highRisk.length > 0 ? `${highRisk.map(r => r.step).join("、")}需补充 FMEA 注记` : "高风险工序均有质量标注" };
        }
        case "qc5": {
          const historicalAvg = 38000;
          const deviation = Math.abs(costSummary.totalCost - historicalAvg) / historicalAvg;
          const pct = Math.round(deviation * 100);
          return { ...check, status: deviation <= 0.15 ? "pass" : "warning" as QcCheckStatus, note: `当前报价偏差 ${pct}%（基准 ¥${historicalAvg.toLocaleString()}）` };
        }
        default: return check;
      }
    }));
    setShowQcPanel(true);
  }, [sopRows, costSummary]);

  // ═══════════ 输入交互 handler ═══════════

  const handleMaterialBlur = useCallback((rowId: number, value: string) => {
    if (value.trim().length >= 2) {
      triggerRagSearch(rowId, value);
    }
  }, [triggerRagSearch]);

  const handleStepBlur = useCallback((rowId: number, value: string) => {
    if (value.trim().length >= 2) {
      triggerRagSearch(rowId, value);
    }
  }, [triggerRagSearch]);

  // ═══════════ 渲染 ═══════════

  const statusColor = (s: ISopRow["status"]): string => {
    switch (s) {
      case "validated": return "border-l-emerald-500";
      case "warning": return "border-l-amber-500";
      case "editing": return "border-l-cyan-500";
      default: return "border-l-neutral-700";
    }
  };

  const statusBadge = (s: ISopRow["status"]): React.ReactNode => {
    switch (s) {
      case "validated": return <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="h-3 w-3" />已校验</span>;
      case "warning": return <span className="inline-flex items-center gap-1 text-xs text-amber-400"><AlertTriangle className="h-3 w-3" />警告</span>;
      case "editing": return <span className="inline-flex items-center gap-1 text-xs text-cyan-400"><Zap className="h-3 w-3" />编辑中</span>;
      default: return <span className="text-xs text-neutral-500">待编辑</span>;
    }
  };

  const qcIcon = (s: QcCheckStatus): React.ReactNode => {
    switch (s) {
      case "pass": return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "fail": return <X className="h-4 w-4 text-red-400" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      default: return <CircleDot className="h-4 w-4 text-neutral-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col overflow-hidden">
      {/* ═══ 顶部标题栏 ═══ */}
      <header className="relative h-14 flex items-center justify-between px-6 bg-neutral-900/80 border-b border-neutral-800 shrink-0">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center" style={{ animation: "qbsPulse 3s ease infinite" }}>
            <FlaskConical className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-white">报价 BOM 与 SOP 编排沙盘</h1>
            <p className="text-[10px] text-neutral-500 tracking-wider">QUOTING · BOM · SOP ORCHESTRATION SANDBOX</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={runQcChecks} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600/20 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-600/30 transition-colors">
            <Shield className="h-3.5 w-3.5" />
            质量卡控
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-600/30 transition-colors">
            <Download className="h-3.5 w-3.5" />
            导出报价单
          </button>
          <div className="text-xs text-neutral-500 font-mono">
            {new Date().toLocaleDateString("zh-CN")} · 美利信新能源清洗岛
          </div>
        </div>
      </header>

      <div className="px-4 py-1">
        <SandboxEventFlowPanel sandboxId="quoting-bom" />
      </div>

      {/* ═══ 三栏工作区 ═══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ─────────── 左栏：SOP 工序表单 ─────────── */}
        <section className="flex-1 min-w-0 flex flex-col border-r border-neutral-800">
          <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/50 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-neutral-300 tracking-wide">SOP 工艺编排表单</span>
              <span className="text-[10px] text-neutral-600 font-mono">{sopRows.length} 道工序 · {costSummary.totalMinutes} 分钟</span>
            </div>
            <button onClick={addSopRow} className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 text-[11px] hover:bg-cyan-600/30 transition-colors">
              <Plus className="h-3 w-3" />
              添加工序
            </button>
          </div>

          {/* SOP 表头 */}
          <div className="grid grid-cols-[40px_1fr_1fr_1.5fr_70px_60px_70px] gap-px px-4 py-1.5 bg-neutral-900 text-[10px] text-neutral-500 font-medium tracking-wider uppercase border-b border-neutral-800">
            <span>#</span>
            <span>工序名称</span>
            <span>关联物料</span>
            <span>质量备注 / FMEA</span>
            <span>工时(min)</span>
            <span>状态</span>
            <span>操作</span>
          </div>

          {/* SOP 行列表（可滚动） */}
          <div className="flex-1 overflow-y-auto">
            {sopRows.map((row, idx) => (
              <div
                key={row.id}
                className={cn(
                  "grid grid-cols-[40px_1fr_1fr_1.5fr_70px_60px_70px] gap-px px-4 py-2 border-b border-neutral-800/50 border-l-2 transition-all",
                  statusColor(row.status),
                  focusedRowId === row.id && "bg-cyan-500/5",
                )}
                style={
                  row.status === "validated"
                    ? { animation: "qbsFlashGreen 1s ease-out" }
                    : row.status === "warning"
                      ? { animation: "qbsFlashAmber 1s ease-out" }
                      : undefined
                }
              >
                {/* 序号 */}
                <div className="flex items-center">
                  <span className="text-xs text-neutral-600 font-mono">{idx + 1}</span>
                </div>

                {/* 工序名称 — 真实 <input> */}
                <div className="flex items-center pr-2">
                  <input
                    type="text"
                    value={row.step}
                    onChange={(e) => updateSopField(row.id, "step", e.target.value)}
                    onBlur={(e) => handleStepBlur(row.id, e.target.value)}
                    className="w-full h-7 px-2 rounded bg-neutral-800/60 border border-neutral-700/50 text-xs text-cyan-200 font-medium focus:outline-none focus:border-cyan-500 focus:bg-neutral-800 transition-colors placeholder:text-neutral-600"
                    placeholder="输入工序名称"
                  />
                </div>

                {/* 关联物料 — 真实 <input> + RAG 触发 */}
                <div className="flex items-center pr-2">
                  <input
                    type="text"
                    value={row.material}
                    onChange={(e) => updateSopField(row.id, "material", e.target.value)}
                    onBlur={(e) => handleMaterialBlur(row.id, e.target.value)}
                    className={cn(
                      "w-full h-7 px-2 rounded border text-xs focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-neutral-600",
                      row.material.trim()
                        ? "bg-neutral-800/60 border-neutral-700/50 text-emerald-300"
                        : "bg-amber-900/10 border-amber-700/30 text-amber-200",
                    )}
                    placeholder="输入物料名称 → 自动搜索知识库"
                  />
                </div>

                {/* 质量备注 — 真实 <input>，可由 RAG 注入 */}
                <div className="flex items-center pr-2">
                  <input
                    type="text"
                    value={row.qualityNote}
                    onChange={(e) => updateSopField(row.id, "qualityNote", e.target.value)}
                    className="w-full h-7 px-2 rounded bg-neutral-800/60 border border-neutral-700/50 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-neutral-600"
                    placeholder="手动填写或由知识库自动注入"
                  />
                </div>

                {/* 工时 — 真实 <input type="number"> */}
                <div className="flex items-center">
                  <input
                    type="number"
                    value={row.min}
                    onChange={(e) => updateSopField(row.id, "min", Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-7 px-2 rounded bg-neutral-800/60 border border-neutral-700/50 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-500 transition-colors"
                    min={0}
                    max={999}
                  />
                </div>

                {/* 状态 */}
                <div className="flex items-center justify-center">
                  {statusBadge(row.status)}
                </div>

                {/* 操作 */}
                <div className="flex items-center gap-1">
                  <button onClick={() => validateSopRow(row.id)} title="校验" className="w-6 h-6 rounded flex items-center justify-center hover:bg-emerald-500/20 transition-colors">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  </button>
                  <button onClick={() => triggerRagSearch(row.id, `${row.step} ${row.material}`)} title="搜索知识" className="w-6 h-6 rounded flex items-center justify-center hover:bg-cyan-500/20 transition-colors">
                    <Search className="h-3.5 w-3.5 text-cyan-500" />
                  </button>
                  <button onClick={() => removeSopRow(row.id)} title="删除" className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/20 transition-colors">
                    <Trash2 className="h-3.5 w-3.5 text-red-500/60" />
                  </button>
                </div>
              </div>
            ))}

            {sopRows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-600">
                <Layers className="h-10 w-10 mb-3" />
                <p className="text-sm">暂无工序，点击上方「添加工序」开始编排</p>
              </div>
            )}
          </div>
        </section>

        {/* ─────────── 中栏：BOM 选配 + 成本 ─────────── */}
        <section className="w-[340px] shrink-0 flex flex-col border-r border-neutral-800 bg-neutral-900/30">
          {/* BOM 选配 */}
          <div className="flex items-center justify-between px-3 py-2 bg-neutral-900/50 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-neutral-300">BOM 物料选配</span>
              <span className="text-[10px] text-neutral-600 font-mono">{selectedBomIds.size} 选中</span>
            </div>
          </div>

          {/* 搜索 + 分类 */}
          <div className="px-3 py-2 space-y-2 border-b border-neutral-800">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
              <input
                type="text"
                value={bomSearch}
                onChange={(e) => setBomSearch(e.target.value)}
                className="w-full h-7 pl-7 pr-2 rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-neutral-600"
                placeholder="搜索物料编码、名称、规格..."
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {bomCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setBomCategoryFilter(cat)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                    bomCategoryFilter === cat
                      ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/40"
                      : "bg-neutral-800 text-neutral-500 border border-neutral-700/50 hover:text-neutral-300",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* BOM 列表 */}
          <div className="flex-1 overflow-y-auto">
            {filteredBom.map(item => {
              const isSelected = selectedBomIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    "px-3 py-2 border-b border-neutral-800/50 transition-colors cursor-pointer",
                    isSelected ? "bg-emerald-500/5 border-l-2 border-l-emerald-500" : "hover:bg-neutral-800/30 border-l-2 border-l-transparent",
                  )}
                  onClick={() => toggleBom(item.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "bg-emerald-500 border-emerald-500" : "border-neutral-600",
                      )}>
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-cyan-400 font-mono">{item.code}</span>
                          <span className="text-xs text-neutral-200 truncate">{item.name}</span>
                        </div>
                        <div className="text-[10px] text-neutral-500">{item.spec}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-xs text-amber-300 font-mono">¥{item.unitPrice.toLocaleString()}/{item.unit}</div>
                      <div className="text-[10px] text-neutral-600">库存 {item.stock} · {item.leadDays}天</div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-1.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-neutral-500">数量：</span>
                      <input
                        type="number"
                        value={bomQty[item.id] ?? 1}
                        onChange={(e) => updateBomQty(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 h-5 px-1.5 rounded bg-neutral-800 border border-neutral-700 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-500"
                        min={1}
                      />
                      <span className="text-[10px] text-neutral-500">{item.unit}</span>
                      <span className="text-[10px] text-emerald-400 font-mono ml-auto">
                        小计 ¥{((bomQty[item.id] ?? 1) * item.unitPrice).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 成本预算面板 */}
          <div className="border-t border-neutral-700">
            <button onClick={() => setCostPanelOpen(!costPanelOpen)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-neutral-800/30 transition-colors">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold text-neutral-300">成本预算</span>
              </div>
              {costPanelOpen ? <ChevronDown className="h-3.5 w-3.5 text-neutral-500" /> : <ChevronUp className="h-3.5 w-3.5 text-neutral-500" />}
            </button>
            {costPanelOpen && (
              <div className="px-3 pb-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-neutral-500">物料成本</span>
                  <span className="text-neutral-300 font-mono">¥{costSummary.materialCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">损耗系数 ×1.08</span>
                  <span className="text-neutral-400 font-mono">+¥{Math.round(costSummary.materialCost * 0.08).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">工时费（{costSummary.totalMinutes}min × ¥3/min）</span>
                  <span className="text-neutral-300 font-mono">¥{Math.round(costSummary.laborCost).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">管理费 12%</span>
                  <span className="text-neutral-400 font-mono">+¥{Math.round(costSummary.management).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">利润 15%</span>
                  <span className="text-neutral-400 font-mono">+¥{Math.round(costSummary.profit).toLocaleString()}</span>
                </div>
                <div className="border-t border-neutral-700 pt-1.5 flex justify-between">
                  <span className="text-neutral-400 font-medium">总成本</span>
                  <span className="text-white font-mono font-bold">¥{Math.round(costSummary.totalCost).toLocaleString()}</span>
                </div>
                <div className="flex justify-between bg-cyan-500/10 rounded px-2 py-1.5 border border-cyan-500/20">
                  <span className="text-cyan-300 font-medium">对外报价 ×1.35</span>
                  <span className="text-cyan-200 font-mono font-bold text-sm">¥{Math.round(costSummary.quotePrice).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─────────── 右栏：RAG + QC ─────────── */}
        <section className="w-[320px] shrink-0 flex flex-col bg-neutral-900/20">
          {/* RAG 知识注入面板 */}
          <div className="flex items-center justify-between px-3 py-2 bg-neutral-900/50 border-b border-neutral-800">
            <button onClick={() => setRagPanelOpen(!ragPanelOpen)} className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-violet-400" />
              <span className="text-xs font-bold text-neutral-300">RAG 知识注入引擎</span>
              {ragPanelOpen ? <ChevronUp className="h-3 w-3 text-neutral-500" /> : <ChevronDown className="h-3 w-3 text-neutral-500" />}
            </button>
            {ragStatus && ragStatus.status === "ready" && (
              <span className="text-[10px] text-violet-400 font-mono">{ragStatus.cards.length} 条匹配</span>
            )}
          </div>

          {ragPanelOpen && (
            <div className="flex-1 overflow-y-auto">
              {/* 手动搜索输入 */}
              <div className="px-3 py-2 border-b border-neutral-800">
                <div className="relative">
                  <BookOpen className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="手动搜索知识库（柱塞泵、密封、FMEA...）"
                    className="w-full h-7 pl-7 pr-2 rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 focus:outline-none focus:border-violet-500 transition-colors placeholder:text-neutral-600"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const target = focusedRowId ?? sopRows[0]?.id;
                        if (target != null) triggerRagSearch(target, (e.target as HTMLInputElement).value);
                      }
                    }}
                  />
                </div>
                <p className="text-[10px] text-neutral-600 mt-1">提示：在左侧表格编辑物料列后，知识库会自动搜索</p>
              </div>

              {/* RAG 状态 */}
              {ragStatus === null && (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-600">
                  <Sparkles className="h-8 w-8 mb-2 text-neutral-700" />
                  <p className="text-xs">编辑工序或物料后</p>
                  <p className="text-xs">知识库将自动检索相关标准</p>
                </div>
              )}

              {ragStatus?.status === "loading" && (
                <div className="px-3 py-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 rounded-lg border border-neutral-800" style={{ background: "linear-gradient(90deg, #262626 25%, #333 50%, #262626 75%)", backgroundSize: "200% 100%", animation: "qbsShimmer 1.5s ease infinite" }} />
                  ))}
                  <p className="text-xs text-neutral-500 text-center">正在检索知识库...</p>
                </div>
              )}

              {ragStatus?.status === "warning" && (
                <div className="mx-3 mt-3 px-3 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-300">{ragStatus.message}</p>
                  </div>
                </div>
              )}

              {ragStatus?.status === "ready" && ragStatus.cards.map((card, idx) => {
                const isInjected = injectedIds.has(card.id);
                const targetRowId = ragStatus.rowId;
                return (
                  <div
                    key={card.id}
                    className="mx-3 mt-2 rounded-lg border border-neutral-800 bg-neutral-900/50 overflow-hidden"
                    style={{ animation: `qbsSlideIn 0.3s ease ${idx * 0.1}s both` }}
                  >
                    <div className="px-3 py-2 border-b border-neutral-800/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-violet-300 font-medium">{card.title}</span>
                        <span className="text-[9px] text-neutral-600 font-mono">相关度 {card.relevance}</span>
                      </div>
                      <span className="text-[10px] text-neutral-500">{card.source}</span>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[11px] text-neutral-300 leading-relaxed">{card.content}</p>
                    </div>
                    <div className="px-3 py-2 border-t border-neutral-800/50 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {card.keywords.slice(0, 3).map(kw => (
                          <span key={kw} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">{kw}</span>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          if (!isInjected) {
                            const snippet = card.content.length > 60 ? card.content.slice(0, 60) + "..." : card.content;
                            injectKnowledge(card.id, targetRowId, snippet);
                          }
                        }}
                        disabled={isInjected}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
                          isInjected
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default"
                            : "bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 cursor-pointer",
                        )}
                      >
                        {isInjected ? (
                          <><CheckCircle2 className="h-3 w-3" />已注入至 SOP</>
                        ) : (
                          <><ArrowDownToLine className="h-3 w-3" />注入质量备注</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* QC 质量卡控面板 */}
          {showQcPanel && (
            <div className="border-t border-neutral-700">
              <div className="flex items-center justify-between px-3 py-2 bg-neutral-900/50 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-neutral-300">质量卡控结果</span>
                </div>
                <button onClick={() => setShowQcPanel(false)} className="text-neutral-500 hover:text-neutral-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="px-3 py-2 space-y-2 max-h-[200px] overflow-y-auto">
                {qcChecks.map(check => (
                  <div key={check.id} className={cn(
                    "flex items-start gap-2 px-2 py-1.5 rounded border",
                    check.status === "pass" ? "bg-emerald-500/5 border-emerald-500/20" :
                      check.status === "fail" ? "bg-red-500/5 border-red-500/20" :
                        check.status === "warning" ? "bg-amber-500/5 border-amber-500/20" :
                          "bg-neutral-800/30 border-neutral-800",
                  )}>
                    <div className="mt-0.5 shrink-0">{qcIcon(check.status)}</div>
                    <div className="min-w-0">
                      <div className="text-xs text-neutral-200 font-medium">{check.label}</div>
                      <div className="text-[10px] text-neutral-500">{check.target}</div>
                      {check.note && <div className="text-[10px] text-neutral-400 mt-0.5">{check.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-3 py-2 border-t border-neutral-800">
                <button onClick={runQcChecks} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-neutral-800 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 transition-colors">
                  <RefreshCw className="h-3 w-3" />
                  重新检查
                </button>
              </div>
            </div>
          )}

          {/* 底部统计 */}
          <div className="mt-auto border-t border-neutral-700 px-3 py-2 bg-neutral-900/50">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg text-cyan-400 font-mono font-bold">{sopRows.length}</div>
                <div className="text-[9px] text-neutral-500">工序数</div>
              </div>
              <div>
                <div className="text-lg text-emerald-400 font-mono font-bold">{selectedBomIds.size}</div>
                <div className="text-[9px] text-neutral-500">BOM 项</div>
              </div>
              <div>
                <div className="text-lg text-amber-400 font-mono font-bold">{sopRows.filter(r => r.status === "validated").length}</div>
                <div className="text-[9px] text-neutral-500">已校验</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ═══ 底部状态栏 ═══ */}
      <footer className="h-7 flex items-center justify-between px-4 bg-neutral-900/80 border-t border-neutral-800 text-[10px] text-neutral-500 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><CircleDot className="h-3 w-3 text-emerald-500" />沙盘模式：报价编排</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />总工时 {costSummary.totalMinutes} 分钟（{(costSummary.totalMinutes / 60).toFixed(1)} 小时）</span>
          <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />RAG 知识库 {RAG_KNOWLEDGE.length} 条标准</span>
        </div>
        <div className="flex items-center gap-3">
          <span>BOM 物料库 {BOM_LIBRARY.length} 项</span>
          <span className="text-neutral-700">|</span>
          <span>GRT 报价 BOM 与 SOP 编排沙盘 v1.0</span>
        </div>
      </footer>
    </div>
  );
}
