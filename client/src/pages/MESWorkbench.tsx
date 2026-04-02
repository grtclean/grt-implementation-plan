import { useState, useEffect, useCallback, useRef } from "react";
import {
  Camera,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  Square,
  ImageIcon,
  Crosshair,
  ChevronDown,
  ChevronRight,
  Wrench,
  Package,
  Shield,
  CircleDot,
  Timer,
  BadgeCheck,
  XCircle,
  Eye,
} from "lucide-react";

// ── Demo Data ──────────────────────────────────────────────────────────

interface WorkOrder {
  id: string;
  code: string;
  product: string;
  quantity: number;
  priority: "urgent" | "high" | "normal";
  status: "dispatched" | "in_progress" | "completed";
  estimatedMinutes: number;
}

interface SOPStep {
  id: number;
  name: string;
  standardMinutes: number;
  description: string;
  tools: string[];
  checkpoints: string[];
  status: "pending" | "in_progress" | "completed";
}

interface BOMItem {
  code: string;
  name: string;
  qty: number;
  unit: string;
  checked: boolean;
}

interface Snapshot {
  id: string;
  timestamp: string;
  label: string;
}

const STATIONS = [
  { id: "T1", name: "T1 齿轴加工" },
  { id: "T2", name: "T2 热处理" },
  { id: "T3", name: "T3 精磨工序" },
  { id: "T4", name: "T4 压铸成型" },
  { id: "T5", name: "T5 CNC铣削" },
  { id: "T7", name: "T7 装配线B" },
];

const WORK_ORDERS: WorkOrder[] = [
  { id: "wo1", code: "WO-2603-0081", product: "行星齿轮轴 GS-220", quantity: 50, priority: "urgent", status: "in_progress", estimatedMinutes: 180 },
  { id: "wo2", code: "WO-2603-0082", product: "减速机壳体 RC-150", quantity: 30, priority: "high", status: "dispatched", estimatedMinutes: 240 },
  { id: "wo3", code: "WO-2603-0084", product: "同步带轮 SP-45", quantity: 100, priority: "normal", status: "dispatched", estimatedMinutes: 120 },
  { id: "wo4", code: "WO-2603-0086", product: "锥齿轮 BG-100", quantity: 40, priority: "high", status: "dispatched", estimatedMinutes: 200 },
  { id: "wo5", code: "WO-2603-0087", product: "花键轴 SS-35", quantity: 80, priority: "normal", status: "dispatched", estimatedMinutes: 150 },
  { id: "wo6", code: "WO-2603-0090", product: "联轴器 CL-60", quantity: 60, priority: "normal", status: "completed", estimatedMinutes: 160 },
];

const SOP_STEPS: SOPStep[] = [
  {
    id: 1,
    name: "原材料确认与装夹",
    standardMinutes: 15,
    description: "确认来料批次号与工单一致，按图纸装夹工件至三爪卡盘，拧紧力矩45N·m。",
    tools: ["三爪卡盘", "力矩扳手 45N·m", "游标卡尺"],
    checkpoints: ["批次号一致", "装夹牢固无晃动", "轴向跳动 ≤0.02mm"],
    status: "completed",
  },
  {
    id: 2,
    name: "粗车外圆",
    standardMinutes: 25,
    description: "粗车外圆至留量0.5mm，切削参数: 转速800rpm，进给0.3mm/rev，切深2mm。",
    tools: ["外圆车刀 CNMG120408", "冷却液喷嘴"],
    checkpoints: ["外圆直径偏差 ≤±0.1mm", "表面无振纹", "切屑正常断裂"],
    status: "completed",
  },
  {
    id: 3,
    name: "精车齿轮轴段",
    standardMinutes: 35,
    description: "精车齿轮配合轴段至公差 h6，表面粗糙度 Ra0.8。转速1200rpm，进给0.1mm/rev。",
    tools: ["精车刀 DNMG110404", "表面粗糙度仪", "外径千分尺"],
    checkpoints: ["直径公差 h6 (0/-0.016mm)", "Ra ≤ 0.8μm", "圆柱度 ≤ 0.005mm"],
    status: "in_progress",
  },
  {
    id: 4,
    name: "铣键槽",
    standardMinutes: 20,
    description: "铣削键槽宽8mm×深4mm，使用专用铣刀，注意对称度。",
    tools: ["键槽铣刀 Φ8", "分度头", "塞规 8js9"],
    checkpoints: ["键槽宽度 8js9", "深度 4+0.1/0", "对称度 ≤ 0.03mm"],
    status: "pending",
  },
  {
    id: 5,
    name: "倒角去毛刺 + 终检",
    standardMinutes: 15,
    description: "所有锐边倒角C0.5~C1，去除全部毛刺，全尺寸终检并记录。",
    tools: ["倒角刀", "去毛刺工具", "CMM三坐标"],
    checkpoints: ["无锐边/毛刺", "全尺寸合格", "填写检验记录单"],
    status: "pending",
  },
];

const BOM_ITEMS: BOMItem[] = [
  { code: "MAT-42CrMo-R50", name: "42CrMo圆钢 Φ50×200", qty: 1, unit: "根", checked: true },
  { code: "TOOL-CNMG-08", name: "粗车刀片 CNMG120408", qty: 2, unit: "片", checked: true },
  { code: "TOOL-DNMG-04", name: "精车刀片 DNMG110404", qty: 1, unit: "片", checked: true },
  { code: "TOOL-KEY-8", name: "键槽铣刀 Φ8", qty: 1, unit: "把", checked: false },
  { code: "AUX-COOL-5L", name: "切削液 5L", qty: 1, unit: "桶", checked: false },
];

const SNAPSHOTS: Snapshot[] = [
  { id: "s1", timestamp: "10:23:45", label: "装夹完成" },
  { id: "s2", timestamp: "10:48:12", label: "粗车完成" },
  { id: "s3", timestamp: "11:15:33", label: "精车中" },
  { id: "s4", timestamp: "11:22:07", label: "质检点" },
];

const QC_RESULT = {
  passed: true,
  confidence: 97.3,
  timestamp: "11:22:10",
  details: "外圆直径合格, 表面粗糙度合格",
  defects: [] as string[],
};

// ── Priority / Status helpers ──────────────────────────────────────────

const priorityConfig = {
  urgent: { label: "紧急", bg: "bg-red-100 text-red-700 border-red-200" },
  high: { label: "高", bg: "bg-orange-100 text-orange-700 border-orange-200" },
  normal: { label: "普通", bg: "bg-blue-100 text-blue-700 border-blue-200" },
};

const statusConfig = {
  dispatched: { label: "待执行", color: "text-gray-500" },
  in_progress: { label: "进行中", color: "text-blue-600" },
  completed: { label: "已完成", color: "text-green-600" },
};

const stepStatusConfig = {
  pending: { label: "待开始", dot: "bg-gray-300" },
  in_progress: { label: "进行中", dot: "bg-blue-500 animate-pulse" },
  completed: { label: "已完成", dot: "bg-green-500" },
};

// ── Main Component ─────────────────────────────────────────────────────

export default function MESWorkbench() {
  const [selectedStation, setSelectedStation] = useState("T1");
  const [selectedWO, setSelectedWO] = useState<string>("wo1");
  const [steps, setSteps] = useState<SOPStep[]>(SOP_STEPS);
  const [bomItems, setBomItems] = useState<BOMItem[]>(BOM_ITEMS);
  const [expandedStep, setExpandedStep] = useState<number | null>(3);
  const [taskStarted, setTaskStarted] = useState(true);
  const [taskPaused, setTaskPaused] = useState(false);
  const [stepTimers, setStepTimers] = useState<Record<number, number>>({ 1: 892, 2: 1503, 3: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [qcResult, setQcResult] = useState(QC_RESULT);

  const currentWO = WORK_ORDERS.find((wo) => wo.id === selectedWO);
  const activeStepId = steps.find((s) => s.status === "in_progress")?.id ?? null;

  // Step timer
  useEffect(() => {
    if (taskStarted && !taskPaused && activeStepId !== null) {
      timerRef.current = setInterval(() => {
        setStepTimers((prev) => ({ ...prev, [activeStepId]: (prev[activeStepId] || 0) + 1 }));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [taskStarted, taskPaused, activeStepId]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleStepAction = useCallback((stepId: number, action: "start" | "complete") => {
    setSteps((prev) =>
      prev.map((s) => {
        if (action === "start" && s.id === stepId) return { ...s, status: "in_progress" as const };
        if (action === "complete" && s.id === stepId) return { ...s, status: "completed" as const };
        return s;
      })
    );
    if (action === "start") {
      setExpandedStep(stepId);
      setStepTimers((prev) => ({ ...prev, [stepId]: 0 }));
    }
    if (action === "complete") {
      // Auto-start next step
      setSteps((prev) => {
        const idx = prev.findIndex((s) => s.id === stepId);
        if (idx >= 0 && idx < prev.length - 1) {
          const next = prev.map((s, i) => (i === idx + 1 ? { ...s, status: "in_progress" as const } : s));
          setExpandedStep(prev[idx + 1].id);
          setStepTimers((t) => ({ ...t, [prev[idx + 1].id]: 0 }));
          return next;
        }
        return prev;
      });
    }
  }, []);

  const toggleBOM = useCallback((code: string) => {
    setBomItems((prev) => prev.map((b) => (b.code === code ? { ...b, checked: !b.checked } : b)));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-blue-600" />
          <span className="text-xl font-bold text-gray-800">MES 作业工作台</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date().toLocaleDateString("zh-CN")} 白班</span>
          <span className="flex items-center gap-1"><CircleDot className="w-4 h-4 text-green-500" /> 在线</span>
        </div>
      </header>

      {/* 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── Left Column: Task Queue (25%) ─── */}
        <aside className="w-1/4 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          {/* Operator identity */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="font-bold text-gray-800 text-lg">吴卫成</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">高级技师</span>
                  <span className="text-sm text-gray-500">白班 08:00-20:00</span>
                </div>
              </div>
            </div>
            {/* Station selector */}
            <div className="relative">
              <label className="text-sm text-gray-500 mb-1 block">当前工位</label>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
              >
                {STATIONS.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-9 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Task Queue */}
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">派工队列</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {WORK_ORDERS.map((wo) => {
              const pri = priorityConfig[wo.priority];
              const st = statusConfig[wo.status];
              const isActive = wo.id === selectedWO;
              return (
                <button
                  key={wo.id}
                  onClick={() => setSelectedWO(wo.id)}
                  className={`w-full text-left p-4 border-b border-gray-100 transition-colors cursor-pointer ${
                    isActive ? "bg-blue-50 border-l-4 border-l-blue-500" : "hover:bg-gray-50 border-l-4 border-l-transparent"
                  }`}
                  style={{ minHeight: 80 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-gray-800">{wo.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${pri.bg}`}>{pri.label}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 truncate">{wo.product}</div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className={st.color}>{st.label}</span>
                    <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{wo.estimatedMinutes}分钟</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ─── Center Column: Current Task Detail (45%) ─── */}
        <main className="flex-[1.8] flex flex-col overflow-hidden bg-gray-50">
          {currentWO ? (
            <>
              {/* Task Header */}
              <div className="p-5 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-mono font-bold text-gray-800">{currentWO.code}</span>
                    <span className={`text-sm px-2 py-0.5 rounded-full border font-medium ${priorityConfig[currentWO.priority].bg}`}>
                      {priorityConfig[currentWO.priority].label}
                    </span>
                  </div>
                  <span className={`font-medium ${statusConfig[currentWO.status].color}`}>
                    {statusConfig[currentWO.status].label}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span><Package className="inline w-4 h-4 mr-1" />{currentWO.product}</span>
                  <span>数量: <strong className="text-gray-800">{currentWO.quantity}</strong> 件</span>
                  <span>预计: {currentWO.estimatedMinutes} 分钟</span>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* SOP Steps */}
                <div>
                  <h3 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" /> SOP 作业步骤
                  </h3>
                  <div className="space-y-2">
                    {steps.map((step) => {
                      const sc = stepStatusConfig[step.status];
                      const isExpanded = expandedStep === step.id;
                      const elapsed = stepTimers[step.id] || 0;
                      return (
                        <div key={step.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <button
                            onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-gray-50 transition-colors"
                            style={{ minHeight: 48 }}
                          >
                            <span className={`w-3 h-3 rounded-full shrink-0 ${sc.dot}`} />
                            <span className="font-bold text-gray-700 w-8">#{step.id}</span>
                            <span className="flex-1 font-medium text-gray-800">{step.name}</span>
                            <span className="text-sm text-gray-400">{step.standardMinutes}min</span>
                            {step.status === "in_progress" && (
                              <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                {formatTimer(elapsed)}
                              </span>
                            )}
                            {step.status === "completed" && (
                              <span className="text-sm font-mono text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                {formatTimer(elapsed)}
                              </span>
                            )}
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
                              <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                              <div className="flex gap-6">
                                <div>
                                  <div className="text-xs font-semibold text-gray-400 uppercase mb-1">工具</div>
                                  <ul className="text-sm text-gray-600 space-y-0.5">
                                    {step.tools.map((t) => (
                                      <li key={t} className="flex items-center gap-1">
                                        <Wrench className="w-3 h-3 text-gray-400" /> {t}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-400 uppercase mb-1">质量检查点</div>
                                  <ul className="text-sm text-gray-600 space-y-0.5">
                                    {step.checkpoints.map((cp) => (
                                      <li key={cp} className="flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" /> {cp}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              {/* Step action button */}
                              <div className="flex gap-2 pt-1">
                                {step.status === "pending" && (
                                  <button
                                    onClick={() => handleStepAction(step.id, "start")}
                                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                                    style={{ minHeight: 44 }}
                                  >
                                    <Play className="w-4 h-4" /> 开始
                                  </button>
                                )}
                                {step.status === "in_progress" && (
                                  <button
                                    onClick={() => handleStepAction(step.id, "complete")}
                                    className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors cursor-pointer"
                                    style={{ minHeight: 44 }}
                                  >
                                    <CheckCircle2 className="w-4 h-4" /> 完成此步
                                  </button>
                                )}
                                {step.status === "completed" && (
                                  <span className="flex items-center gap-1 text-sm text-green-600">
                                    <BadgeCheck className="w-4 h-4" /> 已完成
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* BOM Checklist */}
                <div>
                  <h3 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-500" /> BOM 物料确认
                  </h3>
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                          <th className="px-4 py-2 text-left w-10"></th>
                          <th className="px-4 py-2 text-left">物料编码</th>
                          <th className="px-4 py-2 text-left">名称</th>
                          <th className="px-4 py-2 text-center">数量</th>
                          <th className="px-4 py-2 text-center">单位</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bomItems.map((item) => (
                          <tr key={item.code} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <button
                                onClick={() => toggleBOM(item.code)}
                                className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                                  item.checked ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-gray-400"
                                }`}
                                style={{ minWidth: 24, minHeight: 24 }}
                              >
                                {item.checked && <CheckCircle2 className="w-4 h-4 text-white" />}
                              </button>
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-600">{item.code}</td>
                            <td className="px-4 py-3 text-gray-800">{item.name}</td>
                            <td className="px-4 py-3 text-center font-bold text-gray-800">{item.qty}</td>
                            <td className="px-4 py-3 text-center text-gray-500">{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="p-4 bg-white border-t border-gray-200 flex items-center gap-3">
                {!taskStarted ? (
                  <button
                    onClick={() => setTaskStarted(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-base hover:bg-green-700 transition-colors cursor-pointer"
                    style={{ minHeight: 48 }}
                  >
                    <Play className="w-5 h-5" /> 开始作业
                  </button>
                ) : (
                  <>
                    {!taskPaused ? (
                      <button
                        onClick={() => setTaskPaused(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-yellow-500 text-white rounded-lg font-bold text-base hover:bg-yellow-600 transition-colors cursor-pointer"
                        style={{ minHeight: 48 }}
                      >
                        <Pause className="w-5 h-5" /> 暂停
                      </button>
                    ) : (
                      <button
                        onClick={() => setTaskPaused(false)}
                        className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg font-bold text-base hover:bg-blue-700 transition-colors cursor-pointer"
                        style={{ minHeight: 48 }}
                      >
                        <Play className="w-5 h-5" /> 继续
                      </button>
                    )}
                    <button
                      className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-lg font-bold text-base hover:bg-green-700 transition-colors cursor-pointer"
                      style={{ minHeight: 48 }}
                    >
                      <CheckCircle2 className="w-5 h-5" /> 完成
                    </button>
                  </>
                )}
                <button
                  className="flex items-center gap-2 px-5 py-3 bg-red-600 text-white rounded-lg font-bold text-base hover:bg-red-700 transition-colors cursor-pointer ml-auto"
                  style={{ minHeight: 48 }}
                >
                  <AlertTriangle className="w-5 h-5" /> 报异常
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <span className="text-lg">请从左侧选择工单</span>
            </div>
          )}
        </main>

        {/* ─── Right Column: Camera + QC (30%) ─── */}
        <aside className="w-[30%] border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          {/* Camera feed area */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">工位摄像头</h3>
            <div className="h-48 bg-gray-900 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
              <Camera className="w-12 h-12 text-gray-600 mb-2" />
              <span className="text-gray-500">工位摄像头</span>
              <div className="absolute top-2 right-2">
                <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  <CircleDot className="w-3 h-3" /> LIVE
                </span>
              </div>
              <div className="absolute bottom-2 left-2 text-xs text-gray-500 font-mono">
                CAM-SF-001 | {new Date().toLocaleTimeString("zh-CN", { hour12: false })}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 rounded-lg text-gray-700 font-medium hover:bg-gray-200 transition-colors cursor-pointer border border-gray-200"
                style={{ minHeight: 44 }}
              >
                <ImageIcon className="w-4 h-4" /> 抓图
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 rounded-lg text-blue-700 font-medium hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200"
                style={{ minHeight: 44 }}
              >
                <Crosshair className="w-4 h-4" /> 触发质检
              </button>
            </div>
          </div>

          {/* Snapshot Gallery */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">近期抓图</h3>
            <div className="grid grid-cols-2 gap-2">
              {SNAPSHOTS.map((snap) => (
                <div key={snap.id} className="h-24 bg-gray-100 rounded-lg flex flex-col items-center justify-center border border-gray-200 relative cursor-pointer hover:border-blue-300 transition-colors">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">{snap.label}</span>
                  <span className="absolute bottom-1 right-1 text-[10px] font-mono text-gray-400">{snap.timestamp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quality Check Result */}
          <div className="p-4 flex-1">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">质检结果</h3>
            <div className={`p-4 rounded-lg border-2 ${qcResult.passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {qcResult.passed ? (
                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                  ) : (
                    <XCircle className="w-7 h-7 text-red-600" />
                  )}
                  <span className={`text-xl font-bold ${qcResult.passed ? "text-green-700" : "text-red-700"}`}>
                    {qcResult.passed ? "合格" : "不合格"}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800">{qcResult.confidence}%</div>
                  <div className="text-xs text-gray-500">置信度</div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{qcResult.details}</p>
              <div className="text-xs text-gray-400 font-mono">检测时间: {qcResult.timestamp}</div>
              {qcResult.defects.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-sm font-semibold text-red-600">缺陷列表:</div>
                  {qcResult.defects.map((d, i) => (
                    <div key={i} className="text-sm text-red-700 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> {d}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-orange-50 rounded-lg text-orange-700 font-medium hover:bg-orange-100 transition-colors cursor-pointer border border-orange-200"
              style={{ minHeight: 44 }}
            >
              <Eye className="w-4 h-4" /> 人工复检
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
