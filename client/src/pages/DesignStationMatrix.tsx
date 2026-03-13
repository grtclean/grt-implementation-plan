/**
 * M3 Design Automation Engine — Station Matrix Workbench
 *
 * Immersive engineer UI:
 * - Left: Station tree navigation (ST01–ST15)
 * - Center: Mechanical / Electrical parameter forms (AI-recommended + manual override)
 * - Right: SolidWorks VBA / EPLAN XML export buttons + project summary
 */

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Cog, Zap, Plus, Trash2, Save, Download, RefreshCw,
  ChevronRight, GripVertical, Cpu, Bot, FileCode, FileText,
  Activity, Gauge, ArrowUpDown, AlertTriangle, Ruler, Package,
  ChevronDown, ChevronUp, Sparkles, BookOpen, Check, X, Info,
  History, ArrowRight, Lightbulb, ClipboardCheck, ShieldCheck,
  CircleAlert, CircleCheck, Timer, Cable, FileDown,
} from "lucide-react";

// ── Lazy-loaded PLC tab components ──────────────────────────────────────
const PlcArchitectureTab = lazy(() => import("@/components/plc/PlcArchitectureTab"));
const PlcIoMappingTab = lazy(() => import("@/components/plc/PlcIoMappingTab"));
const PlcEplanTab = lazy(() => import("@/components/plc/PlcEplanTab"));
const PlcAlarmTab = lazy(() => import("@/components/plc/PlcAlarmTab"));
const PlcUserAccessTab = lazy(() => import("@/components/plc/PlcUserAccessTab"));
const PlcVersionTab = lazy(() => import("@/components/plc/PlcVersionTab"));
const PlcStepDebugTab = lazy(() => import("@/components/plc/PlcStepDebugTab"));

// ── Station type → icon/color mapping ───────────────────────────────────
const CATEGORY_STYLE: Record<string, { color: string; bg: string }> = {
  cleaning:   { color: "text-blue-600",   bg: "bg-blue-50" },
  drying:     { color: "text-orange-600", bg: "bg-orange-50" },
  handling:   { color: "text-green-600",  bg: "bg-green-50" },
  inspection: { color: "text-purple-600", bg: "bg-purple-50" },
};

// ── Mechanical parameter field definitions ──────────────────────────────
const MECH_FIELDS: Array<{ key: string; label: string; unit: string; group: string }> = [
  { key: "tankLength",    label: "槽体长度",     unit: "mm",    group: "tank" },
  { key: "tankWidth",     label: "槽体宽度",     unit: "mm",    group: "tank" },
  { key: "tankHeight",    label: "槽体高度",     unit: "mm",    group: "tank" },
  { key: "tankVolume",    label: "槽体容积",     unit: "L",     group: "tank" },
  { key: "tankMaterial",  label: "槽体材质",     unit: "",      group: "tank" },
  { key: "pumpType",      label: "泵类型",       unit: "",      group: "pump" },
  { key: "pumpFlowRate",  label: "泵流量",       unit: "L/min", group: "pump" },
  { key: "pumpHead",      label: "扬程",         unit: "m",     group: "pump" },
  { key: "heaterPower",   label: "加热功率",     unit: "kW",    group: "heating" },
  { key: "ultrasonicFrequency", label: "超声频率", unit: "kHz", group: "ultrasonic" },
  { key: "ultrasonicPower",     label: "超声功率", unit: "W",   group: "ultrasonic" },
  { key: "transducerCount",     label: "振子数量", unit: "个",  group: "ultrasonic" },
  { key: "filtrationMicron",    label: "过滤精度", unit: "μm",  group: "filtration" },
  { key: "nozzleType",    label: "喷嘴类型",     unit: "",      group: "spray" },
  { key: "nozzleCount",   label: "喷嘴数量",     unit: "个",    group: "spray" },
  { key: "sprayPressure", label: "喷淋压力",     unit: "bar",   group: "spray" },
  { key: "conveyorType",  label: "输送类型",     unit: "",      group: "conveyor" },
  { key: "conveyorSpeed", label: "输送速度",     unit: "m/min", group: "conveyor" },
  { key: "dryingTemp",    label: "干燥温度",     unit: "°C",    group: "drying" },
  { key: "dryingAirflow", label: "风量",         unit: "m³/h",  group: "drying" },
  { key: "vacuumLevel",   label: "真空度",       unit: "mbar",  group: "drying" },
  { key: "weightCapacity",label: "承重",         unit: "kg",    group: "conveyor" },
];

const ELEC_FIELDS: Array<{ key: string; label: string; unit: string; group: string }> = [
  { key: "plcDI",               label: "DI 数字输入",    unit: "点", group: "io" },
  { key: "plcDO",               label: "DO 数字输出",    unit: "点", group: "io" },
  { key: "plcAI",               label: "AI 模拟输入",    unit: "点", group: "io" },
  { key: "plcAO",               label: "AO 模拟输出",    unit: "点", group: "io" },
  { key: "motorCount",          label: "电机数量",       unit: "台", group: "motor" },
  { key: "motorTotalPower",     label: "电机总功率",     unit: "kW", group: "motor" },
  { key: "sensorCount",         label: "传感器数量",     unit: "个", group: "sensor" },
  { key: "heaterCircuits",      label: "加热回路",       unit: "路", group: "heater" },
  { key: "heaterTotalPower",    label: "加热总功率",     unit: "kW", group: "heater" },
  { key: "communicationProtocol", label: "通讯协议",     unit: "",   group: "comm" },
  { key: "hmiScreens",          label: "HMI屏数",       unit: "台", group: "comm" },
  { key: "emergencyStopCount",  label: "急停数量",       unit: "个", group: "safety" },
  { key: "voltageSystem",       label: "电压系统",       unit: "",   group: "power" },
  { key: "wiringStandard",      label: "接线标准",       unit: "",   group: "power" },
  { key: "controlCabinetSize",  label: "控制柜尺寸",     unit: "",   group: "power" },
];

export default function DesignStationMatrix() {
  const { t } = useLanguage();
  // ── M2→M3 handoff: read proposalId from URL ──────────────────────────
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const proposalIdParam = urlParams.get("proposalId");
  const proposalId = proposalIdParam ? Number(proposalIdParam) : null;

  const [projectId, setProjectId] = useState(1);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [activeParamTab, setActiveParamTab] = useState("mechanical");
  const [editMech, setEditMech] = useState<Record<string, any>>({});
  const [editElec, setEditElec] = useState<Record<string, any>>({});
  const [editNotes, setEditNotes] = useState("");
  const [editCycleTime, setEditCycleTime] = useState<number | null>(null);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [pollInterval, setPollInterval] = useState<number | null>(null);

  // Engineering sizing state
  const [sizingOpen, setSizingOpen] = useState(false);
  const [wpLength, setWpLength] = useState(200);
  const [wpWidth, setWpWidth] = useState(100);
  const [wpHeight, setWpHeight] = useState(50);
  const [wpWeight, setWpWeight] = useState(2);
  const [wpMaterial, setWpMaterial] = useState<string>("aluminum_alloy");
  const [cleanGrade, setCleanGrade] = useState<string>("fine");
  const [maxParticle, setMaxParticle] = useState(200);
  const [chemistry, setChemistry] = useState<string>("alkaline");
  const [targetCycle, setTargetCycle] = useState(90);
  const [tempTarget, setTempTarget] = useState(55);

  // BOM state
  const [showBom, setShowBom] = useState(false);

  // AI suggestion state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [enableLlm, setEnableLlm] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Record<string, number | string>>({});
  const [showStandards, setShowStandards] = useState(false);

  // Design review state
  const [showReview, setShowReview] = useState(false);
  const [reviewComments, setReviewComments] = useState("");

  // PLC top-level tab state
  const [topTab, setTopTab] = useState("station-design");

  // PLC project lookup (for passing plcProjectId to sub-tabs)
  const plcProject = trpc.designEngine.plcGetProject.useQuery({ projectId });

  // ── Fetch M2 proposal if handoff ──────────────────────────────────────
  const proposalQuery = trpc.solutionEngine.getProposal.useQuery(
    { proposalId: proposalId! },
    { enabled: !!proposalId },
  );

  // ── Data queries ──────────────────────────────────────────────────────
  const stationTypes = trpc.designEngine.getStationTypes.useQuery();
  const stationList = trpc.designEngine.listStations.useQuery({ projectId });
  const summary = trpc.designEngine.getProjectSummary.useQuery({ projectId });
  const exportHistory = trpc.designEngine.getExportHistory.useQuery({ projectId });

  // ── Mutations ─────────────────────────────────────────────────────────
  const updateStation = trpc.designEngine.updateStation.useMutation({
    onSuccess: () => { toast.success("工位参数已保存"); stationList.refetch(); summary.refetch(); },
    onError: (e) => toast.error("保存失败:" + e.message),
  });
  const deleteStation = trpc.designEngine.deleteStation.useMutation({
    onSuccess: () => { toast.success("工位已删除"); setSelectedStationId(null); stationList.refetch(); summary.refetch(); },
    onError: (e) => toast.error("删除失败:" + e.message),
  });
  const createStation = trpc.designEngine.createStation.useMutation({
    onSuccess: (data) => { toast.success("新工位已创建"); stationList.refetch(); summary.refetch(); setSelectedStationId(data.id); },
    onError: (e) => toast.error("创建失败:" + e.message),
  });
  const decompose = trpc.designEngine.decomposeProposal.useMutation({
    onSuccess: (data) => { setTaskId(data.taskId); setPollInterval(2000); setIsDecomposing(true); toast.info("AI 工位分解任务已提交..."); },
    onError: (e) => toast.error("AI 分解失败: " + e.message),
  });
  const exportSW = trpc.designEngine.exportToSolidWorks.useMutation({
    onSuccess: (data) => { downloadFile(data.content, data.fileName, "text/plain"); toast.success(`SolidWorks VBA 已生成 (${data.stationCount} 工位)`); exportHistory.refetch(); },
    onError: (e) => toast.error("导出失败:" + e.message),
  });
  const exportEplan = trpc.designEngine.exportToEplan.useMutation({
    onSuccess: (data) => { downloadFile(data.content, data.fileName, "application/xml"); toast.success(`EPLAN XML 已生成 (${data.stationCount} 工位)`); exportHistory.refetch(); },
    onError: (e) => toast.error("导出失败:" + e.message),
  });
  const applySizing = trpc.designEngine.applyEngineeringSizing.useMutation({
    onSuccess: (data) => { toast.success(`工程选型完成 — ${data.updatedCount} 个工位参数已更新`); stationList.refetch(); summary.refetch(); },
    onError: (e) => toast.error("工程选型失败:" + e.message),
  });
  const generateBom = trpc.designEngine.generateProjectBom.useMutation({
    onSuccess: (data) => { toast.success(`BOM已生成 — ${data.itemCount} 个组件, 预估 ¥${data.totalCost.toLocaleString()}`); },
    onError: (e) => toast.error("BOM生成失败: " + e.message),
  });
  const bomPreview = trpc.designEngine.getBomPreview.useQuery(
    { projectId },
    { enabled: showBom && (stationList.data?.stations?.length ?? 0) > 0 },
  );
  const aiSuggestions = trpc.designEngine.getAiSuggestions.useQuery(
    {
      projectId,
      stationId: selectedStationId!,
      workpiece: { length: wpLength, width: wpWidth, height: wpHeight, weight: wpWeight, material: wpMaterial },
      enableLlm,
    },
    { enabled: showAiPanel && !!selectedStationId },
  );
  const selectedStationType = stationList.data?.stations?.find(s => s.id === selectedStationId)?.stationType || "";
  const stationStandards = trpc.designEngine.getStationStandards.useQuery(
    { stationType: selectedStationType },
    { enabled: showStandards && !!selectedStationId && selectedStationType !== "" },
  );
  const applyAiSuggestions = trpc.designEngine.applyAiSuggestions.useMutation({
    onSuccess: (data) => {
      toast.success(`AI建议已应用 — ${data.appliedKeys.length} 个参数更新`);
      stationList.refetch(); summary.refetch(); setSelectedSuggestions({});
    },
    onError: (e) => toast.error("应用失败:" + e.message),
  });
  const designReview = trpc.designEngine.getDesignReview.useQuery(
    { projectId },
    { enabled: showReview && (stationList.data?.stations?.length ?? 0) > 0 },
  );
  const genCommGuide = trpc.designEngine.generateCommissioningGuide.useMutation({
    onSuccess: (data) => {
      downloadFile(data.markdown, `${data.stationCount}-station-commissioning-guide.md`, "text/markdown");
      toast.success(`调试指导书已生成 (评审分数: ${data.reviewScore})`);
      exportHistory.refetch();
    },
    onError: (e) => toast.error("生成失败:" + e.message),
  });
  const submitReview = trpc.designEngine.submitReviewApproval.useMutation({
    onSuccess: (data) => {
      toast.success(`评审决定已提交: ${data.verdict === "approved" ? "通过" : data.verdict === "conditional" ? "有条件通过" : "不通过"}`);
      setReviewComments(""); exportHistory.refetch();
    },
    onError: (e) => toast.error("提交失败:" + e.message),
  });
  const plcCreate = trpc.designEngine.plcCreateProject.useMutation({
    onSuccess: (data) => {
      plcProject.refetch();
      plcGenArch.mutate({ plcProjectId: data.id });
    },
    onError: (e) => toast.error("PLC项目创建失败: " + e.message),
  });
  const plcGenArch = trpc.designEngine.plcGenerateArchitecture.useMutation({
    onSuccess: (data) => {
      toast.success(`PLC程序已生成: ${data.moduleCount}个模块, ${data.ioCount}个I/O, ${data.alarmCount}个报警`);
      plcProject.refetch();
    },
    onError: (e) => toast.error("PLC程序生成失败: " + e.message),
  });

  const handleGeneratePlc = () => {
    if (plcProject.data) {
      plcGenArch.mutate({ plcProjectId: plcProject.data.id });
    } else {
      plcCreate.mutate({
        projectId,
        projectName: `PLC-Project-${projectId}`,
        plcBrand: "SIEMENS_S7_1500",
      });
    }
  };

  // ── Poll AI task status ───────────────────────────────────────────────
  const taskStatus = trpc.designEngine.getTaskStatus.useQuery(
    { taskId: taskId! },
    { enabled: !!taskId && isDecomposing, refetchInterval: pollInterval ?? false },
  );

  useEffect(() => {
    if (!taskStatus.data) return;
    const st = taskStatus.data;
    if (st.status === "completed" || st.status === "failed") {
      setIsDecomposing(false);
      setPollInterval(null);
      if (st.status === "completed") {
        toast.success("AI 工位分解完成！");
        stationList.refetch();
        summary.refetch();
      } else {
        toast.error("AI 分解失败: " + (st.errorMessage || "未知错误"));
      }
    }
  }, [taskStatus.data]);

  // ── Selected station data ─────────────────────────────────────────────
  const stations = useMemo(() => stationList.data?.stations || [], [stationList.data]);
  const selectedStation = useMemo(() => stations.find(s => s.id === selectedStationId), [stations, selectedStationId]);

  useEffect(() => {
    if (selectedStation) {
      setEditMech((selectedStation.mechanicalParams as Record<string, any>) || {});
      setEditElec((selectedStation.electricalParams as Record<string, any>) || {});
      setEditNotes(selectedStation.notes || "");
      setEditCycleTime(selectedStation.cycleTime);
    }
  }, [selectedStation]);

  // Auto-select first station
  useEffect(() => {
    if (stations.length > 0 && !selectedStationId) {
      setSelectedStationId(stations[0].id);
    }
  }, [stations]);

  // ── Type metadata lookup ──────────────────────────────────────────────
  const typeMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const t of stationTypes.data || []) m[t.type] = t;
    return m;
  }, [stationTypes.data]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const downloadFile = useCallback((content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleSave = () => {
    if (!selectedStationId) return;
    updateStation.mutate({
      id: selectedStationId,
      cycleTime: editCycleTime,
      mechanicalParams: editMech,
      electricalParams: editElec,
      notes: editNotes,
    });
  };

  const handleAddStation = () => {
    const nextIndex = stations.length + 1;
    const code = `ST${String(nextIndex).padStart(2, "0")}`;
    createStation.mutate({
      projectId,
      stationCode: code,
      stationIndex: nextIndex,
      stationName: `新工位 ${code}`,
      stationNameEn: `New Station ${code}`,
      stationType: "RINSE",
    });
  };

  const handleDecompose = () => {
    const proposal = proposalQuery.data;
    const processFlow = proposal?.processFlow as any;
    const requirement = proposal?.requirement as any;

    decompose.mutate({
      projectId,
      proposalId: proposalId ?? undefined,
      proposalSummary: processFlow?.stages
        ? processFlow.stages.map((s: any) => s.stageName).join(" → ")
        : "标准超声波+高压喷淋清洗线",
      workpieceInfo: requirement?.workpieceMaterial
        ? `${requirement.workpieceMaterial} ${requirement.workpieceDescription || ""}`
        : "铝合金壳体",
      cleanlinessRequirement: requirement?.cleanlinessStandard
        || "ISO 16232 等级A",
      cycleTimeTarget: processFlow?.totalCycleTime
        ? Math.round(processFlow.totalCycleTime)
        : 90,
      preferredCleaningType: processFlow?.stages
        ? [...new Set((processFlow.stages as any[]).map((s: any) => s.processType))].join("+")
        : "超声波+喷淋",
    });
  };

  const handleApplySizing = () => {
    applySizing.mutate({
      projectId,
      workpiece: { length: wpLength, width: wpWidth, height: wpHeight, weight: wpWeight, material: wpMaterial as any },
      cleanliness: { cleanlinessGrade: cleanGrade as any, maxParticleSize: maxParticle },
      process: { targetCycleTime: targetCycle, cleaningChemistry: chemistry as any, temperatureTarget: tempTarget },
    });
  };

  const handleToggleSuggestion = (paramKey: string, value: number | string) => {
    setSelectedSuggestions(prev => {
      const next = { ...prev };
      if (next[paramKey] !== undefined) {
        delete next[paramKey];
      } else {
        next[paramKey] = value;
      }
      return next;
    });
  };

  const handleApplySelected = () => {
    if (!selectedStationId || Object.keys(selectedSuggestions).length === 0) return;
    applyAiSuggestions.mutate({
      stationId: selectedStationId,
      selectedParams: selectedSuggestions,
    });
  };

  const setMechField = (key: string, value: string) => {
    const num = Number(value);
    setEditMech(prev => ({ ...prev, [key]: isNaN(num) || value === "" ? value : num }));
  };
  const setElecField = (key: string, value: string) => {
    const num = Number(value);
    setEditElec(prev => ({ ...prev, [key]: isNaN(num) || value === "" ? value : num }));
  };

  // ── Relevant mech fields for selected station type ────────────────────
  const relevantMechFields = useMemo(() => {
    if (!selectedStation) return MECH_FIELDS;
    const meta = typeMap[selectedStation.stationType];
    if (!meta) return MECH_FIELDS;
    const defKeys = new Set(Object.keys(meta.defaultMechParams || {}));
    // Show fields that have defaults OR have values set
    return MECH_FIELDS.filter(f => defKeys.has(f.key) || editMech[f.key] !== undefined && editMech[f.key] !== null && editMech[f.key] !== "");
  }, [selectedStation, typeMap, editMech]);

  const relevantElecFields = useMemo(() => {
    if (!selectedStation) return ELEC_FIELDS;
    const meta = typeMap[selectedStation.stationType];
    if (!meta) return ELEC_FIELDS;
    const defKeys = new Set(Object.keys(meta.defaultElecParams || {}));
    return ELEC_FIELDS.filter(f => defKeys.has(f.key) || editElec[f.key] !== undefined && editElec[f.key] !== null && editElec[f.key] !== "");
  }, [selectedStation, typeMap, editElec]);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="h-full flex flex-col gap-2 p-2 md:p-4 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Cpu className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-lg font-bold">M3 设计自动化工作台</h1>
            <p className="text-xs text-muted-foreground">Design Automation Engine — Station Matrix</p>
          </div>
          {proposalId && (
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
              M2方案 #{proposalId} 已导入
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">项目ID:</Label>
          <Input type="number" value={projectId} onChange={e => setProjectId(Number(e.target.value) || 1)}
            className="w-20 h-8 text-sm" />
          <Button size="sm" variant="outline" onClick={() => { stationList.refetch(); summary.refetch(); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> 刷新
          </Button>
        </div>
      </div>

      {/* ── Top-Level Tab Bar: Station Design vs PLC tabs ── */}
      <Tabs value={topTab} onValueChange={setTopTab} className="flex-shrink-0">
        <TabsList className="h-9 gap-0.5">
          <TabsTrigger value="station-design" className="text-xs gap-1"><Cog className="h-3.5 w-3.5" />工位设计</TabsTrigger>
          <div className="w-px h-5 bg-border mx-1" />
          <TabsTrigger value="plc-architecture" className="text-xs gap-1"><Cpu className="h-3.5 w-3.5" />PLC程序架构</TabsTrigger>
          <TabsTrigger value="plc-io" className="text-xs gap-1"><Cable className="h-3.5 w-3.5" />I/O分配</TabsTrigger>
          <TabsTrigger value="plc-eplan" className="text-xs gap-1"><FileCode className="h-3.5 w-3.5" />电气原理图</TabsTrigger>
          <TabsTrigger value="plc-alarm" className="text-xs gap-1"><AlertTriangle className="h-3.5 w-3.5" />报警管理</TabsTrigger>
          <TabsTrigger value="plc-access" className="text-xs gap-1"><ShieldCheck className="h-3.5 w-3.5" />用户授权</TabsTrigger>
          <TabsTrigger value="plc-version" className="text-xs gap-1"><History className="h-3.5 w-3.5" />版本管理</TabsTrigger>
          <div className="w-px h-5 bg-border mx-1" />
          <TabsTrigger value="plc-step-debug" className="text-xs gap-1"><Activity className="h-3.5 w-3.5" />步骤调试</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── PLC Tabs (lazy-loaded) ── */}
      {topTab !== "station-design" && (
        <Suspense fallback={<Skeleton className="h-96" />}>
          <div className="flex-1 overflow-y-auto">
            {topTab === "plc-architecture" && <PlcArchitectureTab projectId={projectId} />}
            {topTab === "plc-io" && <PlcIoMappingTab projectId={projectId} plcProjectId={plcProject.data?.id || null} />}
            {topTab === "plc-eplan" && <PlcEplanTab projectId={projectId} plcProjectId={plcProject.data?.id || null} />}
            {topTab === "plc-alarm" && <PlcAlarmTab projectId={projectId} plcProjectId={plcProject.data?.id || null} />}
            {topTab === "plc-access" && <PlcUserAccessTab projectId={projectId} plcProjectId={plcProject.data?.id || null} />}
            {topTab === "plc-version" && <PlcVersionTab projectId={projectId} plcProjectId={plcProject.data?.id || null} />}
            {topTab === "plc-step-debug" && <PlcStepDebugTab projectId={projectId} />}
          </div>
        </Suspense>
      )}

      {/* ── Station Design content (existing) — only visible on station-design tab ── */}
      {topTab === "station-design" && <>

      {/* ── Engineering Sizing Bar (collapsible) ── */}
      <Card className="flex-shrink-0">
        <CardHeader className="py-1.5 px-3 cursor-pointer" onClick={() => setSizingOpen(!sizingOpen)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5 text-indigo-500" /> 工程选型 — 工件参数化设计
            </CardTitle>
            {sizingOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {sizingOpen && (
          <CardContent className="px-3 pb-3 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-2 text-xs">
              {/* Workpiece */}
              <div className="space-y-0.5">
                <Label className="text-[11px]">工件长 (mm)</Label>
                <Input type="number" value={wpLength} onChange={e => setWpLength(Number(e.target.value))} className="h-7 text-xs" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[11px]">工件宽 (mm)</Label>
                <Input type="number" value={wpWidth} onChange={e => setWpWidth(Number(e.target.value))} className="h-7 text-xs" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[11px]">工件高 (mm)</Label>
                <Input type="number" value={wpHeight} onChange={e => setWpHeight(Number(e.target.value))} className="h-7 text-xs" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[11px]">重量 (kg)</Label>
                <Input type="number" value={wpWeight} onChange={e => setWpWeight(Number(e.target.value))} className="h-7 text-xs" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[11px]">材质</Label>
                <Select value={wpMaterial} onValueChange={setWpMaterial}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aluminum_alloy">铝合金</SelectItem>
                    <SelectItem value="cast_iron">铸铁</SelectItem>
                    <SelectItem value="steel">钢</SelectItem>
                    <SelectItem value="brass">黄铜</SelectItem>
                    <SelectItem value="plastic">塑料</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[11px]">清洁度等级</Label>
                <Select value={cleanGrade} onValueChange={setCleanGrade}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">标准</SelectItem>
                    <SelectItem value="fine">精密</SelectItem>
                    <SelectItem value="precision">超精密</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[11px]">最大颗粒 (μm)</Label>
                <Input type="number" value={maxParticle} onChange={e => setMaxParticle(Number(e.target.value))} className="h-7 text-xs" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[11px]">清洗化学品</Label>
                <Select value={chemistry} onValueChange={setChemistry}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alkaline">碱性</SelectItem>
                    <SelectItem value="neutral">中性</SelectItem>
                    <SelectItem value="acid">酸性</SelectItem>
                    <SelectItem value="solvent">溶剂</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[11px]">目标节拍 (s)</Label>
                <Input type="number" value={targetCycle} onChange={e => setTargetCycle(Number(e.target.value))} className="h-7 text-xs" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[11px]">温度目标 (°C)</Label>
                <Input type="number" value={tempTarget} onChange={e => setTempTarget(Number(e.target.value))} className="h-7 text-xs" />
              </div>
              <div className="flex items-end">
                <Button size="sm" className="h-7 text-xs w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleApplySizing}
                  disabled={applySizing.isPending || stations.length === 0}>
                  <Ruler className="h-3 w-3 mr-1" />
                  {applySizing.isPending ? "选型中..." : "工程选型"}
                </Button>
              </div>
              <div className="flex items-end">
                <Button size="sm" variant="outline" className="h-7 text-xs w-full"
                  onClick={() => setShowBom(!showBom)}>
                  <Package className="h-3 w-3 mr-1" />
                  {showBom ? "隐藏BOM" : "BOM预览"}
                </Button>
              </div>
            </div>
            {stations.length === 0 && (
              <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> 需先创建或AI分解工位，然后再执行工程选型
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── BOM Preview Panel ── */}
      {showBom && bomPreview.data && bomPreview.data.stations.length > 0 && (
        <Card className="flex-shrink-0 max-h-48 overflow-y-auto">
          <CardHeader className="py-1.5 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-emerald-600" /> BOM预览 — {bomPreview.data.totalComponents} 个组件
              </CardTitle>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">预估成本:</span>
                <Badge variant="outline" className="text-emerald-700 font-mono">
                  ¥{bomPreview.data.totalCost.toLocaleString()}
                </Badge>
                <Button size="sm" className="h-6 text-[11px] bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => generateBom.mutate({ projectId, projectName: `Project-${projectId}` })}
                  disabled={generateBom.isPending}>
                  <Package className="h-3 w-3 mr-1" />
                  {generateBom.isPending ? "生成中..." : "生成项目BOM"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
              {Object.entries(bomPreview.data.costByCategory).map(([cat, cost]) => (
                <div key={cat} className="flex justify-between bg-muted/30 rounded px-2 py-1">
                  <span className="text-muted-foreground">{cat}</span>
                  <span className="font-mono">¥{(cost as number).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 space-y-0.5">
              {bomPreview.data.stations.map(st => (
                <div key={st.stationCode} className="flex items-center justify-between text-[10px] px-1 py-0.5 hover:bg-muted/30 rounded">
                  <span><Badge variant="outline" className="text-[9px] mr-1">{st.stationCode}</Badge> {st.stationType} — {st.components.length} 组件</span>
                  <span className="font-mono text-muted-foreground">¥{st.subtotal.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Main 3-column layout ── */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 overflow-hidden">

        {/* ══ LEFT: Station Tree ══ */}
        <div className="col-span-3 flex flex-col gap-2 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-2 px-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">工位列表 ({stations.length})</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleAddStation}
                    disabled={createStation.isPending}>
                    <Plus className="h-3 w-3 mr-1" /> 添加
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleDecompose}
                    disabled={isDecomposing || decompose.isPending}>
                    <Bot className="h-3 w-3 mr-1" /> {isDecomposing ? "分解中..." : "AI分解"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-1 flex-1 overflow-y-auto">
              {stationList.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 mb-1 mx-1" />)
              ) : stations.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <Bot className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>暂无工位</p>
                  <p className="text-xs mt-1">{"点击 \"AI分解\" 自动生成工位"}</p>
                </div>
              ) : (
                stations.map(st => {
                  const meta = typeMap[st.stationType];
                  const cat = meta?.category || "cleaning";
                  const style = CATEGORY_STYLE[cat] || CATEGORY_STYLE.cleaning;
                  const isSelected = st.id === selectedStationId;
                  return (
                    <div key={st.id}
                      className={`flex items-center gap-2 px-2 py-2 mx-1 rounded-md cursor-pointer transition-colors text-sm ${isSelected ? "bg-indigo-50 border border-indigo-200" : "hover:bg-muted/50"}`}
                      onClick={() => setSelectedStationId(st.id)}>
                      <GripVertical className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                      <Badge variant="outline" className={`text-[10px] px-1 font-mono flex-shrink-0 ${style.color} ${style.bg}`}>
                        {st.stationCode}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{st.stationName}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {meta?.nameEn || st.stationNameEn || st.stationType}
                          {st.cycleTime ? ` · ${st.cycleTime}s` : ""}
                        </div>
                      </div>
                      {st.aiGenerated && <Bot className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                      {st.manualOverride && <Cog className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                      {isSelected && <ChevronRight className="h-3 w-3 text-indigo-500 flex-shrink-0" />}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* ══ CENTER: Parameter Forms ══ */}
        <div className="col-span-6 flex flex-col gap-2 overflow-hidden">
          {!selectedStation ? (
            <Card className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Cog className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">选择左侧工位查看/编辑参数</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Station header */}
              <Card className="flex-shrink-0">
                <CardContent className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="font-mono">{selectedStation.stationCode}</Badge>
                      <span className="font-bold">{selectedStation.stationName}</span>
                      <span className="text-xs text-muted-foreground">({selectedStation.stationNameEn || selectedStation.stationType})</span>
                      {selectedStation.aiGenerated && <Badge variant="secondary" className="text-[10px]"><Bot className="h-2.5 w-2.5 mr-0.5" />AI</Badge>}
                      {selectedStation.aiConfidence && (
                        <Badge variant="outline" className="text-[10px]">
                          置信度 {(Number(selectedStation.aiConfidence) * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="default" className="h-7" onClick={handleSave}
                        disabled={updateStation.isPending}>
                        <Save className="h-3 w-3 mr-1" /> 保存
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7" onClick={() => {
                        if (confirm("确定删除此工位？")) deleteStation.mutate({ id: selectedStation.id });
                      }} disabled={deleteStation.isPending}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" /> 节拍:
                      <Input type="number" value={editCycleTime ?? ""} onChange={e => setEditCycleTime(e.target.value ? Number(e.target.value) : null)}
                        className="w-16 h-5 text-xs px-1 inline" /> 秒
                    </span>
                    <span>类型: {typeMap[selectedStation.stationType]?.nameZh || selectedStation.stationType}</span>
                    <span>分类: {typeMap[selectedStation.stationType]?.category || "-"}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Parameter tabs */}
              <Card className="flex-1 flex flex-col overflow-hidden">
                <Tabs value={activeParamTab} onValueChange={setActiveParamTab} className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="mx-3 mt-2 flex-shrink-0 flex-wrap h-auto gap-0.5">
                    <TabsTrigger value="mechanical" className="text-xs"><Cog className="h-3 w-3 mr-1" /> 机械参数</TabsTrigger>
                    <TabsTrigger value="electrical" className="text-xs"><Zap className="h-3 w-3 mr-1" /> 电气参数</TabsTrigger>
                    <TabsTrigger value="ai-suggest" className="text-xs" onClick={() => setShowAiPanel(true)}>
                      <Sparkles className="h-3 w-3 mr-1" /> AI建议
                    </TabsTrigger>
                    <TabsTrigger value="standards" className="text-xs" onClick={() => setShowStandards(true)}>
                      <BookOpen className="h-3 w-3 mr-1" /> 标准参考
                    </TabsTrigger>
                    <TabsTrigger value="review" className="text-xs" onClick={() => setShowReview(true)}>
                      <ClipboardCheck className="h-3 w-3 mr-1" /> 设计评审
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs"><FileText className="h-3 w-3 mr-1" /> 备注</TabsTrigger>
                  </TabsList>

                  <TabsContent value="mechanical" className="flex-1 overflow-y-auto px-3 pb-3 mt-0">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 pt-2">
                      {relevantMechFields.map(f => (
                        <div key={f.key} className="space-y-0.5">
                          <Label className="text-[11px] text-muted-foreground">{f.label} {f.unit && <span className="opacity-60">({f.unit})</span>}</Label>
                          <Input value={editMech[f.key] ?? ""} onChange={e => setMechField(f.key, e.target.value)}
                            className="h-7 text-xs" placeholder={f.unit || "-"} />
                        </div>
                      ))}
                    </div>
                    {relevantMechFields.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">该工位类型无默认机械参数</p>
                    )}
                    <div className="mt-3">
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                        setEditMech(prev => {
                          const merged = { ...prev };
                          for (const f of MECH_FIELDS) if (merged[f.key] === undefined || merged[f.key] === "") merged[f.key] = "";
                          return merged;
                        });
                      }}>
                        <Plus className="h-3 w-3 mr-1" /> 显示所有字段
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="electrical" className="flex-1 overflow-y-auto px-3 pb-3 mt-0">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 pt-2">
                      {relevantElecFields.map(f => (
                        <div key={f.key} className="space-y-0.5">
                          <Label className="text-[11px] text-muted-foreground">{f.label} {f.unit && <span className="opacity-60">({f.unit})</span>}</Label>
                          <Input value={editElec[f.key] ?? ""} onChange={e => setElecField(f.key, e.target.value)}
                            className="h-7 text-xs" placeholder={f.unit || "-"} />
                        </div>
                      ))}
                    </div>
                    {relevantElecFields.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">该工位类型无默认电气参数</p>
                    )}
                    <div className="mt-3">
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                        setEditElec(prev => {
                          const merged = { ...prev };
                          for (const f of ELEC_FIELDS) if (merged[f.key] === undefined || merged[f.key] === "") merged[f.key] = "";
                          return merged;
                        });
                      }}>
                        <Plus className="h-3 w-3 mr-1" /> 显示所有字段
                      </Button>
                    </div>
                  </TabsContent>

                  {/* ── AI Suggestion Tab ── */}
                  <TabsContent value="ai-suggest" className="flex-1 overflow-y-auto px-3 pb-3 mt-0">
                    <div className="pt-2 space-y-3">
                      {/* Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                          <span className="font-medium">AI参数建议</span>
                          <span className="text-muted-foreground">— 基于历史案例 + 工程公式</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                            <input type="checkbox" checked={enableLlm} onChange={e => setEnableLlm(e.target.checked)}
                              className="h-3 w-3 rounded" />
                            <Lightbulb className="h-3 w-3" /> 启用AI分析
                          </label>
                          <Button size="sm" variant="outline" className="h-6 text-[10px]"
                            onClick={() => aiSuggestions.refetch()}>
                            <RefreshCw className="h-2.5 w-2.5 mr-0.5" /> 刷新
                          </Button>
                        </div>
                      </div>

                      {/* AI Reasoning */}
                      {aiSuggestions.data?.aiReasoning && (
                        <div className="bg-violet-50 border border-violet-200 rounded-md p-2 text-xs">
                          <div className="flex items-center gap-1 font-medium text-violet-700 mb-1">
                            <Lightbulb className="h-3 w-3" /> AI分析
                          </div>
                          <p className="text-violet-600">{aiSuggestions.data.aiReasoning}</p>
                        </div>
                      )}

                      {/* Historical Cases */}
                      {aiSuggestions.data?.historicalCases && aiSuggestions.data.historicalCases.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 text-[11px] font-medium mb-1">
                            <History className="h-3 w-3 text-blue-500" /> 相似历史案例 ({aiSuggestions.data.historicalCases.length})
                          </div>
                          <div className="space-y-1">
                            {aiSuggestions.data.historicalCases.slice(0, 3).map((c: any, i: number) => (
                              <div key={i} className="flex items-center justify-between bg-blue-50/50 rounded px-2 py-1 text-[10px]">
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[9px]">项目#{c.projectId}</Badge>
                                  <span>{c.stationCode} {c.stationName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">{c.matchReasons.slice(0, 2).join(", ")}</span>
                                  <Badge variant={c.similarity > 0.7 ? "default" : "secondary"} className="text-[9px]">
                                    {Math.round(c.similarity * 100)}%
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Parameter Comparison Table */}
                      {aiSuggestions.data?.suggestions && aiSuggestions.data.suggestions.length > 0 ? (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium">参数对比 — 选择要应用的建议值</span>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-[9px]">
                                已选 {Object.keys(selectedSuggestions).length}
                              </Badge>
                              <Button size="sm" className="h-6 text-[10px] bg-violet-600 hover:bg-violet-700"
                                onClick={handleApplySelected}
                                disabled={Object.keys(selectedSuggestions).length === 0 || applyAiSuggestions.isPending}>
                                <Check className="h-2.5 w-2.5 mr-0.5" />
                                {applyAiSuggestions.isPending ? "应用中..." : "确认应用"}
                              </Button>
                            </div>
                          </div>

                          {/* Table Header */}
                          <div className="grid grid-cols-12 gap-1 text-[9px] font-medium text-muted-foreground bg-muted/30 rounded-t px-2 py-1">
                            <div className="col-span-3">参数</div>
                            <div className="col-span-2 text-center">当前值</div>
                            <div className="col-span-2 text-center">公式值</div>
                            <div className="col-span-2 text-center">AI建议</div>
                            <div className="col-span-2 text-center">置信度</div>
                            <div className="col-span-1 text-center">选用</div>
                          </div>

                          {/* Table Rows */}
                          <div className="border rounded-b divide-y">
                            {aiSuggestions.data.suggestions.map((s: any) => {
                              const isSelected = selectedSuggestions[s.paramKey] !== undefined;
                              const hasWarning = s.warnings && s.warnings.length > 0;
                              const sugVal = s.suggestedValue ?? s.formulaValue;
                              return (
                                <div key={s.paramKey}
                                  className={`grid grid-cols-12 gap-1 px-2 py-1.5 text-[10px] items-center transition-colors ${isSelected ? "bg-violet-50" : "hover:bg-muted/20"}`}>
                                  <div className="col-span-3 flex items-center gap-1">
                                    <span className="truncate font-medium">{s.paramLabel}</span>
                                    {hasWarning && (
                                      <span title={s.warnings.join("; ")}>
                                        <AlertTriangle className="h-2.5 w-2.5 text-amber-500 flex-shrink-0" />
                                      </span>
                                    )}
                                  </div>
                                  <div className="col-span-2 text-center font-mono text-muted-foreground">
                                    {s.currentValue ?? "—"}
                                  </div>
                                  <div className="col-span-2 text-center font-mono text-blue-600">
                                    {s.formulaValue ?? "—"}
                                  </div>
                                  <div className="col-span-2 text-center font-mono font-medium">
                                    {sugVal != null ? (
                                      <span className={s.source === "ai" ? "text-violet-600" : s.source === "historical" ? "text-emerald-600" : "text-blue-600"}>
                                        {sugVal}
                                      </span>
                                    ) : "—"}
                                  </div>
                                  <div className="col-span-2 text-center">
                                    {s.confidence != null && (
                                      <div className="flex items-center justify-center gap-0.5">
                                        <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                                          <div className="h-full rounded-full"
                                            style={{
                                              width: `${Math.round(s.confidence * 100)}%`,
                                              backgroundColor: s.confidence > 0.7 ? "#22c55e" : s.confidence > 0.4 ? "#f59e0b" : "#ef4444",
                                            }} />
                                        </div>
                                        <span className="text-[9px] w-6 text-right">{Math.round(s.confidence * 100)}%</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="col-span-1 flex justify-center">
                                    {sugVal != null && (
                                      <button
                                        className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-violet-600 border-violet-600 text-white" : "border-muted-foreground/30 hover:border-violet-400"}`}
                                        onClick={() => handleToggleSuggestion(s.paramKey, sugVal)}>
                                        {isSelected && <Check className="h-2.5 w-2.5" />}
                                      </button>
                                    )}
                                  </div>
                                  {/* Explanation row */}
                                  {s.explanation && (
                                    <div className="col-span-12 text-[9px] text-muted-foreground pl-1 -mt-0.5 pb-0.5">
                                      {s.source === "historical" && <History className="h-2 w-2 inline mr-0.5 text-emerald-400" />}
                                      {s.source === "ai" && <Sparkles className="h-2 w-2 inline mr-0.5 text-violet-400" />}
                                      {s.source === "formula" && <Ruler className="h-2 w-2 inline mr-0.5 text-blue-400" />}
                                      {s.explanation}
                                      {s.standardRefs?.length > 0 && (
                                        <span className="ml-1 text-blue-500">[{s.standardRefs.join(", ")}]</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Legend */}
                          <div className="flex items-center gap-3 mt-2 text-[9px] text-muted-foreground">
                            <span className="flex items-center gap-0.5"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> 工程公式</span>
                            <span className="flex items-center gap-0.5"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> 历史案例</span>
                            <span className="flex items-center gap-0.5"><span className="h-2 w-2 rounded-full bg-violet-500 inline-block" /> AI分析</span>
                          </div>
                        </div>
                      ) : aiSuggestions.isLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>暂无历史案例数据</p>
                          <p className="text-xs mt-1">完成更多项目后，AI将自动参考历史参数</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── Standards Reference Tab ── */}
                  <TabsContent value="standards" className="flex-1 overflow-y-auto px-3 pb-3 mt-0">
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center gap-2 text-xs">
                        <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                        <span className="font-medium">适用标准参考</span>
                        <span className="text-muted-foreground">
                          — {selectedStation?.stationType} ({typeMap[selectedStation?.stationType || ""]?.nameZh || ""})
                        </span>
                      </div>

                      {stationStandards.data?.applicableStandards ? (
                        <div className="space-y-2">
                          {stationStandards.data.applicableStandards.map((std: any, i: number) => (
                            <div key={i} className="border rounded-md p-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="text-[10px] font-mono bg-amber-50 text-amber-700 border-amber-200">
                                      {std.code}
                                    </Badge>
                                    <span className="text-xs font-medium">{std.titleZh}</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{std.titleEn}</p>
                                </div>
                              </div>
                              {std.clause && (
                                <p className="text-[10px] text-blue-600 mt-1">{std.clause}</p>
                              )}
                              <p className="text-[10px] mt-1 bg-muted/30 rounded p-1.5">{std.requirement}</p>
                              {std.parameterKeys.length > 0 && (
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                  <span className="text-[9px] text-muted-foreground">适用参数:</span>
                                  {std.parameterKeys.map((pk: string) => (
                                    <Badge key={pk} variant="secondary" className="text-[8px] px-1 py-0">{pk}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : stationStandards.isLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">选择工位后查看适用标准</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── Design Review Tab ── */}
                  <TabsContent value="review" className="flex-1 overflow-y-auto px-3 pb-3 mt-0">
                    <div className="pt-2 space-y-3">
                      {/* Header & Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          <ClipboardCheck className="h-3.5 w-3.5 text-indigo-600" />
                          <span className="font-medium">设计方案评审</span>
                          <span className="text-muted-foreground">— 机械/电气/工艺/安全</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 text-[10px]"
                            onClick={() => designReview.refetch()}>
                            <RefreshCw className="h-2.5 w-2.5 mr-0.5" /> 重新评审
                          </Button>
                          <Button size="sm" className="h-6 text-[10px] bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => genCommGuide.mutate({ projectId, projectName: `Project-${projectId}` })}
                            disabled={genCommGuide.isPending}>
                            <FileDown className="h-2.5 w-2.5 mr-0.5" />
                            {genCommGuide.isPending ? "生成中..." : "导出调试指导书"}
                          </Button>
                        </div>
                      </div>

                      {designReview.isLoading ? (
                        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                      ) : designReview.data ? (
                        <>
                          {/* Overall Score Banner */}
                          <div className={`rounded-lg p-3 border ${
                            designReview.data.overallVerdict === "approved" ? "bg-green-50 border-green-200" :
                            designReview.data.overallVerdict === "conditional" ? "bg-amber-50 border-amber-200" :
                            "bg-red-50 border-red-200"
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {designReview.data.overallVerdict === "approved" ? (
                                  <ShieldCheck className="h-5 w-5 text-green-600" />
                                ) : designReview.data.overallVerdict === "conditional" ? (
                                  <CircleAlert className="h-5 w-5 text-amber-600" />
                                ) : (
                                  <X className="h-5 w-5 text-red-600" />
                                )}
                                <div>
                                  <div className="text-sm font-bold">
                                    {designReview.data.overallVerdict === "approved" ? "评审通过" :
                                     designReview.data.overallVerdict === "conditional" ? "有条件通过" : "评审不通过"}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {designReview.data.reviewDate.slice(0, 16).replace("T", " ")}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold">{designReview.data.overallScore}</div>
                                <div className="text-[10px] text-muted-foreground">综合评分</div>
                              </div>
                            </div>
                            {/* Summary counts */}
                            <div className="flex gap-3 mt-2 text-[10px]">
                              <span className="flex items-center gap-0.5"><CircleCheck className="h-3 w-3 text-green-500" /> 通过 {designReview.data.summary.pass}</span>
                              <span className="flex items-center gap-0.5"><Info className="h-3 w-3 text-blue-500" /> 提示 {designReview.data.summary.info}</span>
                              <span className="flex items-center gap-0.5"><AlertTriangle className="h-3 w-3 text-amber-500" /> 警告 {designReview.data.summary.warning}</span>
                              <span className="flex items-center gap-0.5"><X className="h-3 w-3 text-red-500" /> 严重 {designReview.data.summary.critical}</span>
                              <span className="text-muted-foreground ml-auto">共 {designReview.data.summary.totalChecks} 项</span>
                            </div>
                          </div>

                          {/* Power / IO / Cycle Time Budget Cards */}
                          <div className="grid grid-cols-3 gap-2">
                            {/* Power Budget */}
                            <div className="border rounded-md p-2">
                              <div className="flex items-center gap-1 text-[11px] font-medium mb-1">
                                <Zap className="h-3 w-3 text-red-500" /> 功率预算
                              </div>
                              <div className="space-y-0.5 text-[10px]">
                                <div className="flex justify-between"><span className="text-muted-foreground">电机</span><span>{designReview.data.powerBudget.motorKW.toFixed(1)}kW</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">加热</span><span>{designReview.data.powerBudget.heaterKW.toFixed(1)}kW</span></div>
                                <div className="flex justify-between font-bold border-t pt-0.5"><span>总功率</span><span>{designReview.data.powerBudget.totalKW.toFixed(1)}kW</span></div>
                                <div className="flex justify-between text-blue-600"><span>变压器</span><span>{designReview.data.powerBudget.recommendedTransformerKVA}KVA</span></div>
                                <div className="text-[9px] text-muted-foreground mt-0.5">进线: {designReview.data.powerBudget.recommendedCableEntry}</div>
                              </div>
                              {designReview.data.powerBudget.warnings.map((w: string, i: number) => (
                                <div key={i} className="text-[9px] text-amber-600 mt-1 flex items-start gap-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0 mt-0.5" /> {w}
                                </div>
                              ))}
                            </div>

                            {/* IO Budget */}
                            <div className="border rounded-md p-2">
                              <div className="flex items-center gap-1 text-[11px] font-medium mb-1">
                                <Cable className="h-3 w-3 text-blue-500" /> IO预算
                              </div>
                              <div className="space-y-0.5 text-[10px]">
                                <div className="flex justify-between"><span className="text-muted-foreground">DI/DO</span><span>{designReview.data.ioBudget.totalDI}/{designReview.data.ioBudget.totalDO}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">AI/AO</span><span>{designReview.data.ioBudget.totalAI}/{designReview.data.ioBudget.totalAO}</span></div>
                                <div className="flex justify-between font-bold border-t pt-0.5"><span>总IO</span><span>{designReview.data.ioBudget.totalPoints}点</span></div>
                                <div className="flex justify-between text-blue-600"><span>CPU</span><span className="text-[9px]">{designReview.data.ioBudget.recommendedCPU}</span></div>
                                <div className="text-[9px] text-muted-foreground mt-0.5">
                                  模块: DI×{designReview.data.ioBudget.diModules} DO×{designReview.data.ioBudget.doModules} AI×{designReview.data.ioBudget.aiModules} AO×{designReview.data.ioBudget.aoModules}
                                </div>
                              </div>
                              {designReview.data.ioBudget.warnings.map((w: string, i: number) => (
                                <div key={i} className="text-[9px] text-amber-600 mt-1 flex items-start gap-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0 mt-0.5" /> {w}
                                </div>
                              ))}
                            </div>

                            {/* Cycle Time */}
                            <div className="border rounded-md p-2">
                              <div className="flex items-center gap-1 text-[11px] font-medium mb-1">
                                <Timer className="h-3 w-3 text-green-500" /> 节拍分析
                              </div>
                              <div className="space-y-0.5 text-[10px]">
                                <div className="flex justify-between"><span className="text-muted-foreground">瓶颈</span><span className="font-bold text-red-600">{designReview.data.cycleTimeAnalysis.bottleneck.code} {designReview.data.cycleTimeAnalysis.bottleneck.time}s</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">总顺序时间</span><span>{designReview.data.cycleTimeAnalysis.totalSequentialTime}s</span></div>
                                <div className="flex justify-between font-bold border-t pt-0.5"><span>预估产量</span><span className="text-green-600">{designReview.data.cycleTimeAnalysis.estimatedThroughput}件/h</span></div>
                              </div>
                              {designReview.data.cycleTimeAnalysis.warnings.map((w: string, i: number) => (
                                <div key={i} className="text-[9px] text-amber-600 mt-1 flex items-start gap-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0 mt-0.5" /> {w}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Per-Station Review Items */}
                          <div>
                            <div className="text-[11px] font-medium mb-1">工位评审明细</div>
                            <div className="space-y-1.5">
                              {designReview.data.stations.map((sr: any) => (
                                <div key={sr.stationCode} className="border rounded-md p-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                      <Badge variant="outline" className="text-[10px] font-mono">{sr.stationCode}</Badge>
                                      <span className="text-xs font-medium">{sr.stationName}</span>
                                      <span className="text-[10px] text-muted-foreground">({sr.stationType})</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold">{sr.score}分</span>
                                      <Badge className={`text-[9px] ${
                                        sr.verdict === "approved" ? "bg-green-100 text-green-700" :
                                        sr.verdict === "conditional" ? "bg-amber-100 text-amber-700" :
                                        "bg-red-100 text-red-700"
                                      }`}>
                                        {sr.verdict === "approved" ? "通过" : sr.verdict === "conditional" ? "有条件" : "不通过"}
                                      </Badge>
                                    </div>
                                  </div>
                                  {sr.items.filter((it: any) => it.severity !== "pass").length > 0 && (
                                    <div className="space-y-0.5">
                                      {sr.items.filter((it: any) => it.severity !== "pass").slice(0, 5).map((item: any) => (
                                        <div key={item.id} className={`flex items-start gap-1.5 text-[10px] rounded px-1.5 py-0.5 ${
                                          item.severity === "critical" ? "bg-red-50 text-red-700" :
                                          item.severity === "warning" ? "bg-amber-50 text-amber-700" :
                                          "bg-blue-50 text-blue-700"
                                        }`}>
                                          {item.severity === "critical" ? <X className="h-3 w-3 flex-shrink-0 mt-0.5" /> :
                                           item.severity === "warning" ? <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" /> :
                                           <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />}
                                          <div className="flex-1 min-w-0">
                                            <span className="font-medium">{item.title}</span>
                                            <span className="text-[9px] ml-1 opacity-80">{item.detail}</span>
                                            {item.suggestion && (
                                              <div className="text-[9px] mt-0.5 opacity-70">
                                                <ArrowRight className="h-2 w-2 inline mr-0.5" />{item.suggestion}
                                              </div>
                                            )}
                                            {item.standardRef && (
                                              <span className="text-[8px] ml-1 text-blue-500">[{item.standardRef}]</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      {sr.items.filter((it: any) => it.severity !== "pass").length > 5 && (
                                        <div className="text-[9px] text-muted-foreground text-center">
                                          还有 {sr.items.filter((it: any) => it.severity !== "pass").length - 5} 项...
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {sr.items.filter((it: any) => it.severity === "pass").length > 0 && sr.items.filter((it: any) => it.severity !== "pass").length === 0 && (
                                    <div className="text-[10px] text-green-600 flex items-center gap-1">
                                      <CircleCheck className="h-3 w-3" /> 所有检查项通过
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Review Approval Form */}
                          <div className="border rounded-md p-3 bg-muted/20">
                            <div className="text-[11px] font-medium mb-2">评审决定</div>
                            <Textarea value={reviewComments} onChange={e => setReviewComments(e.target.value)}
                              className="text-xs min-h-[50px] mb-2" placeholder="评审意见（可选）..." />
                            <div className="flex gap-2">
                              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => submitReview.mutate({ projectId, verdict: "approved", reviewerComments: reviewComments })}
                                disabled={submitReview.isPending}>
                                <ShieldCheck className="h-3 w-3 mr-1" /> 通过
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                                onClick={() => submitReview.mutate({ projectId, verdict: "conditional", reviewerComments: reviewComments })}
                                disabled={submitReview.isPending}>
                                <CircleAlert className="h-3 w-3 mr-1" /> 有条件通过
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                                onClick={() => submitReview.mutate({ projectId, verdict: "rejected", reviewerComments: reviewComments })}
                                disabled={submitReview.isPending}>
                                <X className="h-3 w-3 mr-1" /> 不通过
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>暂无评审数据</p>
                          <p className="text-xs mt-1">需先创建工位并配置参数后才能进行评审</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="flex-1 overflow-y-auto px-3 pb-3 mt-0">
                    <div className="pt-2 space-y-2">
                      <div>
                        <Label className="text-xs">工位描述</Label>
                        <p className="text-sm bg-muted/30 p-2 rounded">{selectedStation.description || "—"}</p>
                      </div>
                      <div>
                        <Label className="text-xs">工程师备注</Label>
                        <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                          className="text-xs min-h-[100px]" placeholder="补充设计说明、特殊要求..." />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </>
          )}
        </div>

        {/* ══ RIGHT: Export & Summary ══ */}
        <div className="col-span-3 flex flex-col gap-2 overflow-hidden">
          {/* Project Summary */}
          <Card className="flex-shrink-0">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> 项目汇总</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {summary.isLoading ? (
                <Skeleton className="h-24" />
              ) : summary.data ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">工位数</span><span className="font-bold">{summary.data.stationCount}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">总IO点数</span><span className="font-bold">{summary.data.io.total}</span></div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>DI:{summary.data.io.DI} DO:{summary.data.io.DO}</span>
                    <span>AI:{summary.data.io.AI} AO:{summary.data.io.AO}</span>
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">电机总功率</span><span className="font-bold">{summary.data.power.motorKW.toFixed(1)} kW</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">加热总功率</span><span className="font-bold">{summary.data.power.heaterKW.toFixed(1)} kW</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">总装机功率</span><span className="font-bold text-red-600">{summary.data.power.totalKW.toFixed(1)} kW</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">瓶颈节拍</span><span className="font-bold">{summary.data.bottleneckCycleTime}s</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">推荐PLC</span><span className="font-mono text-[10px]">{summary.data.recommendedPLC}</span></div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">无数据</p>
              )}
            </CardContent>
          </Card>

          {/* Export buttons */}
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-1"><Download className="h-3.5 w-3.5" /> 导出 & 生成</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0 space-y-2">
              <Button className="w-full justify-start h-10 text-sm bg-blue-600 hover:bg-blue-700"
                onClick={() => exportSW.mutate({ projectId, projectName: `Project-${projectId}` })}
                disabled={exportSW.isPending || stations.length === 0}>
                <FileCode className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div>生成 SolidWorks 参数包</div>
                  <div className="text-[10px] opacity-80">VBA Macro (.bas)</div>
                </div>
              </Button>
              <Button className="w-full justify-start h-10 text-sm bg-emerald-600 hover:bg-emerald-700"
                onClick={() => exportEplan.mutate({ projectId, projectName: `Project-${projectId}` })}
                disabled={exportEplan.isPending || stations.length === 0}>
                <Cpu className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div>生成 EPLAN 配置文件</div>
                  <div className="text-[10px] opacity-80">XML Import (.xml)</div>
                </div>
              </Button>
              <Button className="w-full justify-start h-10 text-sm bg-violet-600 hover:bg-violet-700"
                onClick={handleGeneratePlc}
                disabled={plcCreate.isPending || plcGenArch.isPending || stations.length === 0}>
                <Cpu className="h-4 w-4 mr-2" />
                <div className="text-left flex-1">
                  <div>{plcCreate.isPending || plcGenArch.isPending ? "生成中..." : "生成PLC程序"}</div>
                  <div className="text-[10px] opacity-80">S7-1500 SCL ({plcProject.data ? "重新生成" : "首次生成"})</div>
                </div>
                {plcProject.data && (
                  <Badge variant="secondary" className="text-[9px] ml-1 bg-violet-500/20 text-violet-200">
                    已生成
                  </Badge>
                )}
              </Button>
              <Button className="w-full justify-start h-10 text-sm bg-amber-600 hover:bg-amber-700"
                onClick={() => { setShowBom(true); setSizingOpen(true); }}
                disabled={stations.length === 0}>
                <Package className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div>生成项目BOM</div>
                  <div className="text-[10px] opacity-80">Bill of Materials</div>
                </div>
              </Button>
              <Button className="w-full justify-start h-10 text-sm bg-indigo-600 hover:bg-indigo-700"
                onClick={() => genCommGuide.mutate({ projectId, projectName: `Project-${projectId}` })}
                disabled={genCommGuide.isPending || stations.length === 0}>
                <ClipboardCheck className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div>{genCommGuide.isPending ? "生成中..." : "生成调试指导书"}</div>
                  <div className="text-[10px] opacity-80">Commissioning Guide (.md)</div>
                </div>
              </Button>
              {stations.length === 0 && (
                <p className="text-[10px] text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> 需先创建工位才能导出</p>
              )}
            </CardContent>
          </Card>

          {/* Export history */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-2 px-3 flex-shrink-0">
              <CardTitle className="text-sm flex items-center gap-1"><ArrowUpDown className="h-3.5 w-3.5" /> 导出历史</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2 pt-0 flex-1 overflow-y-auto">
              {exportHistory.isLoading ? (
                <Skeleton className="h-20" />
              ) : (exportHistory.data?.exports || []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">暂无导出记录</p>
              ) : (
                <div className="space-y-1">
                  {(exportHistory.data?.exports || []).slice(0, 10).map(exp => (
                    <div key={exp.id} className="flex items-center justify-between p-1.5 rounded hover:bg-muted/50 text-[10px]">
                      <div>
                        <Badge variant="outline" className="text-[9px] mr-1">
                          {exp.exportFormat === "SOLIDWORKS_VBA" ? "SW" : exp.exportFormat === "EPLAN_XML" ? "EP" : exp.exportFormat}
                        </Badge>
                        <span className="text-muted-foreground">{exp.exportedBy}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">{exp.generationTimeMs}ms</span>
                        <Badge variant={exp.exportStatus === "COMPLETED" || exp.exportStatus === "DOWNLOADED" ? "default" : "destructive"} className="text-[9px]">
                          {exp.downloadCount || 0}次
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </>}
    </div>
  );
}
