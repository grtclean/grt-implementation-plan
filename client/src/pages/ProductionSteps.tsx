/**
 * 生产工序步骤管理页面 (Production Process Steps)
 * 
 * 核心功能：
 * 1. T1-T15工序列表，嵌入M0-M12项目阶段
 * 2. 双列工序编辑界面（左列：工程师手动输入 / 右列：AI智慧预设）
 * 3. 产线员工工时打卡（开始/结束按钮）
 * 4. AI历史项目参照与借鉴
 * 5. 附件/照片上传
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import {
  Factory, Plus, Play, Square, Clock, CheckCircle2, XCircle,
  Upload, Paperclip, Trash2, ArrowRight, Brain, History,
  ChevronRight, ChevronDown, GripVertical, Edit, Save,
  Copy, Check, AlertCircle, Loader2, FileText, Image,
  Sparkles, RefreshCw, ArrowDown, ArrowUp, Zap, ListChecks
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";

// T1-T15 工序定义
const PROCESS_CODES = [
  { code: "T1", name: "机加工", milestones: ["M3", "M4"] },
  { code: "T2", name: "冷作", milestones: ["M3", "M4"] },
  { code: "T3", name: "机械部件装配", milestones: ["M5", "M6"] },
  { code: "T4", name: "机械装配", milestones: ["M5", "M6"] },
  { code: "T5", name: "机械总装", milestones: ["M6", "M7"] },
  { code: "T6", name: "电气装配", milestones: ["M6", "M7"] },
  { code: "T7", name: "设备调试", milestones: ["M7", "M8"] },
  { code: "T8", name: "跑和", milestones: ["M7", "M8"] },
  { code: "T9", name: "包装", milestones: ["M8", "M9"] },
  { code: "T10", name: "发货", milestones: ["M9"] },
  { code: "T11", name: "卸车", milestones: ["M9", "M10"] },
  { code: "T12", name: "就位", milestones: ["M10"] },
  { code: "T13", name: "水电气连接", milestones: ["M10", "M11"] },
  { code: "T14", name: "现场调试", milestones: ["M11"] },
  { code: "T15", name: "终验收", milestones: ["M12"] },
];

// M0-M12 里程碑定义
const MILESTONES: Record<string, string> = {
  M0: "项目启动", M1: "需求确认", M2: "方案设计", M3: "设计确认",
  M4: "采购阶段", M5: "生产准备", M6: "生产阶段", M7: "调试阶段",
  M8: "FAT验收", M9: "发货阶段", M10: "安装阶段", M11: "SAT验收",
  M12: "终验收"
};

// 状态颜色映射
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

const CONFIRM_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  confirmed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  modified: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "待开始", in_progress: "进行中", completed: "已完成",
};

const CONFIRM_STATUS_LABELS: Record<string, string> = {
  pending: "待确认", confirmed: "已确认", modified: "已修改", rejected: "已拒绝",
};

export default function ProductionSteps() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedProcessCode, setSelectedProcessCode] = useState<string | null>(null);
  const [selectedProcessInstanceId, setSelectedProcessInstanceId] = useState<number | null>(null);
  const [showAddStepDialog, setShowAddStepDialog] = useState(false);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [editingStep, setEditingStep] = useState<any>(null);
  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set());

  // 新步骤表单
  const [newStep, setNewStep] = useState({
    stepName: "",
    processRequirements: "",
    processDescription: "",
    bomItemReference: "",
    theoreticalHours: "",
    plannedWorkerName: "",
  });

  // AI参照设置
  const [aiSourceProjectId, setAiSourceProjectId] = useState<string>("");
  const [aiRangeMode, setAiRangeMode] = useState<"single" | "range" | "all">("single");
  const [aiRangeStart, setAiRangeStart] = useState("T1");
  const [aiRangeEnd, setAiRangeEnd] = useState("T15");

  // 数据查询
  const bomStepsQuery = trpc.processSteps.getBomStepsByProject.useQuery(
    { projectId: selectedProjectId!, processCode: selectedProcessCode || undefined },
    { enabled: !!selectedProjectId }
  );

  const aiPresetsQuery = trpc.processSteps.getAiPresetStepsByProject.useQuery(
    { projectId: selectedProjectId!, processCode: selectedProcessCode || undefined },
    { enabled: !!selectedProjectId }
  );

  const statsQuery = trpc.processSteps.getProcessStepStats.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const activeTimeLogsQuery = trpc.processSteps.getMyActiveTimeLogs.useQuery();

  const similarProjectsQuery = trpc.processSteps.findSimilarProjects.useQuery(
    { projectId: selectedProjectId!, limit: 10 },
    { enabled: !!selectedProjectId && showAiDialog }
  );

  // Mutations
  const createBomStepMutation = trpc.processSteps.createBomStep.useMutation({
    onSuccess: () => {
      toast({ title: t("manufacturing.steps.stepAdded"), description: t("manufacturing.steps.bomStepCreated") });
      bomStepsQuery.refetch();
      statsQuery.refetch();
      setShowAddStepDialog(false);
      resetNewStep();
    },
    onError: (err) => toast({ title: t("manufacturing.steps.createFailed"), description: err.message, variant: "destructive" }),
  });

  const updateBomStepMutation = trpc.processSteps.updateBomStep.useMutation({
    onSuccess: () => {
      toast({ title: t("manufacturing.steps.stepUpdated") });
      bomStepsQuery.refetch();
      setEditingStep(null);
    },
  });

  const deleteBomStepMutation = trpc.processSteps.deleteBomStep.useMutation({
    onSuccess: () => {
      toast({ title: t("manufacturing.steps.stepDeleted") });
      bomStepsQuery.refetch();
      statsQuery.refetch();
    },
  });

  const startTimeLogMutation = trpc.processSteps.startTimeLogForWorker.useMutation({
    onSuccess: () => {
      toast({ title: t("manufacturing.steps.timeStarted"), description: t("manufacturing.steps.timerStarted") });
      activeTimeLogsQuery.refetch();
      bomStepsQuery.refetch();
    },
    onError: (err) => toast({ title: t("manufacturing.steps.startFailed"), description: err.message, variant: "destructive" }),
  });

  const endTimeLogMutation = trpc.processSteps.endTimeLog.useMutation({
    onSuccess: (data: any) => {
      toast({ title: t("manufacturing.steps.timeEnded"), description: `${t("manufacturing.steps.actualHours")}: ${data.actualHours}h` });
      activeTimeLogsQuery.refetch();
      bomStepsQuery.refetch();
    },
  });

  const adoptAiPresetMutation = trpc.processSteps.adoptAiPresetAsBomStep.useMutation({
    onSuccess: () => {
      toast({ title: t("manufacturing.steps.aiAdopted"), description: t("manufacturing.steps.copiedAsBomStep") });
      bomStepsQuery.refetch();
      aiPresetsQuery.refetch();
      statsQuery.refetch();
    },
  });

  const batchAdoptMutation = trpc.processSteps.batchAdoptAiPresets.useMutation({
    onSuccess: () => {
      toast({ title: t("manufacturing.steps.batchAdoptSuccess") });
      bomStepsQuery.refetch();
      aiPresetsQuery.refetch();
      statsQuery.refetch();
    },
  });

  const confirmAiPresetMutation = trpc.processSteps.confirmAiPresetStep.useMutation({
    onSuccess: () => {
      toast({ title: t("manufacturing.steps.confirmStatusUpdated") });
      aiPresetsQuery.refetch();
    },
  });

  const generateAiPresetMutation = trpc.processSteps.generateAiPresetSteps.useMutation({
    onSuccess: (data: any) => {
      toast({ title: t("manufacturing.steps.aiPresetGenerated"), description: `${data.steps?.length || 0} ${t("manufacturing.steps.stepSuggestions")}` });
      aiPresetsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err) => toast({ title: t("manufacturing.steps.aiGenerateFailed"), description: err.message, variant: "destructive" }),
  });

  const generateRangeMutation = trpc.processSteps.generateAiPresetsForRange.useMutation({
    onSuccess: () => {
      toast({ title: t("manufacturing.steps.batchAiPresetGenerated") });
      aiPresetsQuery.refetch();
      statsQuery.refetch();
      setShowAiDialog(false);
    },
    onError: (err) => toast({ title: t("manufacturing.steps.batchGenerateFailed"), description: err.message, variant: "destructive" }),
  });

  const resetNewStep = () => {
    setNewStep({
      stepName: "", processRequirements: "", processDescription: "",
      bomItemReference: "", theoreticalHours: "", plannedWorkerName: "",
    });
  };

  const toggleProcess = (code: string) => {
    setExpandedProcesses(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleCreateBomStep = () => {
    if (!selectedProjectId || !selectedProcessCode || !selectedProcessInstanceId) {
      toast({ title: t("manufacturing.steps.selectProjectAndProcess"), variant: "destructive" });
      return;
    }
    const maxStep = (bomStepsQuery.data as any[])?.filter((s: any) => s.process_code === selectedProcessCode)?.length || 0;
    createBomStepMutation.mutate({
      processInstanceId: selectedProcessInstanceId,
      projectId: selectedProjectId,
      processCode: selectedProcessCode,
      stepNumber: maxStep + 1,
      stepName: newStep.stepName,
      processRequirements: newStep.processRequirements || undefined,
      processDescription: newStep.processDescription || undefined,
      bomItemReference: newStep.bomItemReference || undefined,
      theoreticalHours: newStep.theoreticalHours ? parseFloat(newStep.theoreticalHours) : undefined,
      plannedWorkerName: newStep.plannedWorkerName || undefined,
    });
  };

  const handleGenerateAiPreset = () => {
    if (!selectedProjectId || !selectedProcessCode || !selectedProcessInstanceId || !aiSourceProjectId) {
      toast({ title: t("manufacturing.steps.selectSourceProject"), variant: "destructive" });
      return;
    }

    if (aiRangeMode === "single") {
      generateAiPresetMutation.mutate({
        targetProjectId: selectedProjectId,
        processInstanceId: selectedProcessInstanceId,
        processCode: selectedProcessCode,
        sourceProjectId: parseInt(aiSourceProjectId),
      });
    } else {
      generateRangeMutation.mutate({
        targetProjectId: selectedProjectId,
        sourceProjectId: parseInt(aiSourceProjectId),
        processCodeStart: aiRangeMode === "all" ? "T1" : aiRangeStart,
        processCodeEnd: aiRangeMode === "all" ? "T15" : aiRangeEnd,
      });
    }
  };

  // 按工序分组BOM步骤
  const bomStepsByProcess = useMemo(() => {
    const map = new Map<string, any[]>();
    ((bomStepsQuery.data as any[]) || []).forEach((step: any) => {
      const list = map.get(step.process_code) || [];
      list.push(step);
      map.set(step.process_code, list);
    });
    return map;
  }, [bomStepsQuery.data]);

  // 按工序分组AI预设步骤
  const aiPresetsByProcess = useMemo(() => {
    const map = new Map<string, any[]>();
    ((aiPresetsQuery.data as any[]) || []).forEach((step: any) => {
      const list = map.get(step.process_code) || [];
      list.push(step);
      map.set(step.process_code, list);
    });
    return map;
  }, [aiPresetsQuery.data]);

  // 活跃工时记录
  const activeTimeLogs = (activeTimeLogsQuery.data as any[]) || [];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Factory}
        title={t("manufacturing.steps.title")}
        description={t("manufacturing.steps.description")}
        actions={
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">{t("manufacturing.steps.projectId")}:</Label>
            <Input
              type="number"
              placeholder={t("manufacturing.steps.enterProjectId")}
              className="w-32"
              value={selectedProjectId || ""}
              onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>
        }
      />

      {/* 活跃工时提醒 */}
      {activeTimeLogs.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
              <span className="font-semibold text-blue-700 dark:text-blue-300">{t("manufacturing.steps.activeTimers")}</span>
            </div>
            <div className="space-y-2">
              {activeTimeLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-md p-3 border">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">{log.process_code}</Badge>
                    <span className="font-medium">{log.step_name}</span>
                    <span className="text-sm text-muted-foreground">
                      {t("manufacturing.steps.startedAt")} {new Date(Number(log.start_time)).toLocaleTimeString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => endTimeLogMutation.mutate({ timeLogId: log.id })}
                    disabled={endTimeLogMutation.isPending}
                  >
                    <Square className="w-4 h-4 mr-1" />
                    {t("manufacturing.steps.end")}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 统计概览 */}
      {selectedProjectId && statsQuery.data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={ListChecks} label={t("manufacturing.steps.totalBomSteps")} value={(statsQuery.data as any).bomSteps.total} />
          <StatCard icon={CheckCircle2} label={t("manufacturing.steps.statusCompleted")} value={(statsQuery.data as any).bomSteps.completed} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={Play} label={t("manufacturing.steps.statusInProgress")} value={(statsQuery.data as any).bomSteps.inProgress} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={Sparkles} label={t("manufacturing.steps.aiPresetSteps")} value={(statsQuery.data as any).aiPresets.total} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
          <StatCard icon={Clock} label={t("manufacturing.steps.cumulativeHours")} value={`${(statsQuery.data as any).timeLogs.totalActualHours.toFixed(1)}h`} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
        </div>
      )}

      {/* 主内容区：T1-T15工序列表 */}
      {selectedProjectId ? (
        <div className="space-y-3">
          {PROCESS_CODES.map((proc) => {
            const isExpanded = expandedProcesses.has(proc.code);
            const bomSteps = bomStepsByProcess.get(proc.code) || [];
            const aiPresets = aiPresetsByProcess.get(proc.code) || [];
            const isSelected = selectedProcessCode === proc.code;

            return (
              <Card key={proc.code} className={`transition-all ${isSelected ? "ring-2 ring-primary" : ""}`}>
                {/* 工序标题行 */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    toggleProcess(proc.code);
                    setSelectedProcessCode(proc.code);
                    // 模拟设置processInstanceId (实际应从API获取)
                    setSelectedProcessInstanceId(parseInt(proc.code.replace("T", "")) * 100 + (selectedProjectId || 0));
                  }}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <Badge variant="outline" className="font-mono text-base px-3 py-1">{proc.code}</Badge>
                    <span className="font-semibold text-lg">{proc.name}</span>
                    <div className="flex gap-1 ml-2">
                      {proc.milestones.map(m => (
                        <Badge key={m} variant="secondary" className="text-xs">
                          {m}: {MILESTONES[m]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {bomSteps.length} {t("manufacturing.steps.steps")} · {aiPresets.length} {t("manufacturing.steps.aiPreset")}
                    </span>
                    {bomSteps.some((s: any) => s.status === "in_progress") && (
                      <Badge className="bg-blue-100 text-blue-700">{t("manufacturing.steps.statusInProgress")}</Badge>
                    )}
                  </div>
                </div>

                {/* 展开内容：双列布局 */}
                {isExpanded && (
                  <CardContent className="pt-0 pb-4">
                    <Separator className="mb-4" />
                    
                    {/* 操作按钮栏 */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setShowAddStepDialog(true)}>
                          <Plus className="w-4 h-4 mr-1" /> {t("manufacturing.steps.addStep")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAiDialog(true)}>
                          <Brain className="w-4 h-4 mr-1" /> {t("manufacturing.steps.aiSmartPreset")}
                        </Button>
                      </div>
                      {aiPresets.filter((p: any) => p.confirm_status === "pending").length > 0 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const pendingIds = aiPresets
                              .filter((p: any) => p.confirm_status === "pending")
                              .map((p: any) => p.id);
                            batchAdoptMutation.mutate({ aiPresetIds: pendingIds });
                          }}
                          disabled={batchAdoptMutation.isPending}
                        >
                          <Sparkles className="w-4 h-4 mr-1" /> {t("manufacturing.steps.adoptAll")} ({aiPresets.filter((p: any) => p.confirm_status === "pending").length})
                        </Button>
                      )}
                    </div>

                    {/* 双列布局 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* 左列：工程师手动输入 */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Edit className="w-4 h-4 text-primary" />
                          <h3 className="font-semibold text-sm uppercase tracking-wider text-primary">{t("manufacturing.steps.engineerInput")}</h3>
                          <Badge variant="outline" className="text-xs">{bomSteps.length} {t("manufacturing.steps.steps")}</Badge>
                        </div>

                        {bomSteps.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{t("manufacturing.steps.noBomSteps")}</p>
                            <p className="text-xs mt-1">{t("manufacturing.steps.clickAddToStart")}</p>
                          </div>
                        ) : (
                          <ScrollArea className="max-h-[600px]">
                            <div className="space-y-2 pr-2">
                              {bomSteps.map((step: any, idx: number) => (
                                <BomStepCard
                                  key={step.id}
                                  step={step}
                                  index={idx}
                                  user={user}
                                  onEdit={(s: any) => setEditingStep(s)}
                                  onDelete={(id: number) => deleteBomStepMutation.mutate({ id })}
                                  onStartTime={(bomStepId: number) => {
                                    startTimeLogMutation.mutate({
                                      bomStepId,
                                      workerId: user?.id || 0,
                                      workerName: user?.name || t("manufacturing.steps.unknown"),
                                    });
                                  }}
                                  onEndTime={(timeLogId: number) => {
                                    endTimeLogMutation.mutate({ timeLogId });
                                  }}
                                  activeTimeLogs={activeTimeLogs}
                                  isStarting={startTimeLogMutation.isPending}
                                  isEnding={endTimeLogMutation.isPending}
                                />
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>

                      {/* 右列：AI智慧预设 */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-purple-600" />
                          <h3 className="font-semibold text-sm uppercase tracking-wider text-purple-600">{t("manufacturing.steps.aiSmartPreset")}</h3>
                          <Badge variant="outline" className="text-xs">{aiPresets.length} {t("manufacturing.steps.suggestions")}</Badge>
                        </div>

                        {aiPresets.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg border-purple-200 dark:border-purple-800">
                            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50 text-purple-400" />
                            <p className="text-sm">{t("manufacturing.steps.noAiPresets")}</p>
                            <p className="text-xs mt-1">{t("manufacturing.steps.clickAiPresetToGenerate")}</p>
                          </div>
                        ) : (
                          <ScrollArea className="max-h-[600px]">
                            <div className="space-y-2 pr-2">
                              {aiPresets.map((preset: any, idx: number) => (
                                <AiPresetCard
                                  key={preset.id}
                                  preset={preset}
                                  index={idx}
                                  onAdopt={(id: number) => adoptAiPresetMutation.mutate({ aiPresetId: id })}
                                  onConfirm={(id: number, status: string) => {
                                    confirmAiPresetMutation.mutate({ id, status: status as any });
                                  }}
                                  isAdopting={adoptAiPresetMutation.isPending}
                                />
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Factory className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h2 className="text-xl font-semibold mb-2">{t("manufacturing.steps.selectProject")}</h2>
          <p className="text-muted-foreground">{t("manufacturing.steps.enterProjectIdHint")}</p>
        </Card>
      )}

      {/* 添加步骤对话框 */}
      <Dialog open={showAddStepDialog} onOpenChange={setShowAddStepDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {t("manufacturing.steps.addBomStep")} - {selectedProcessCode}
            </DialogTitle>
            <DialogDescription>
              {t("manufacturing.steps.addBomStepDesc")} {selectedProcessCode}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("manufacturing.steps.stepName")} *</Label>
              <Input
                value={newStep.stepName}
                onChange={(e) => setNewStep(prev => ({ ...prev, stepName: e.target.value }))}
                placeholder={t("manufacturing.steps.stepNamePlaceholder")}
              />
            </div>
            <div>
              <Label>{t("manufacturing.steps.processRequirements")}</Label>
              <Textarea
                value={newStep.processRequirements}
                onChange={(e) => setNewStep(prev => ({ ...prev, processRequirements: e.target.value }))}
                placeholder={t("manufacturing.steps.processRequirementsPlaceholder")}
                rows={2}
              />
            </div>
            <div>
              <Label>{t("manufacturing.steps.processDescription")}</Label>
              <Textarea
                value={newStep.processDescription}
                onChange={(e) => setNewStep(prev => ({ ...prev, processDescription: e.target.value }))}
                placeholder={t("manufacturing.steps.processDescriptionPlaceholder")}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("manufacturing.steps.bomItemReference")}</Label>
                <Input
                  value={newStep.bomItemReference}
                  onChange={(e) => setNewStep(prev => ({ ...prev, bomItemReference: e.target.value }))}
                  placeholder={t("manufacturing.steps.partNumber")}
                />
              </div>
              <div>
                <Label>{t("manufacturing.steps.theoreticalHours")}</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={newStep.theoreticalHours}
                  onChange={(e) => setNewStep(prev => ({ ...prev, theoreticalHours: e.target.value }))}
                  placeholder="2.5"
                />
              </div>
            </div>
            <div>
              <Label>{t("manufacturing.steps.plannedWorker")}</Label>
              <Input
                value={newStep.plannedWorkerName}
                onChange={(e) => setNewStep(prev => ({ ...prev, plannedWorkerName: e.target.value }))}
                placeholder={t("manufacturing.steps.workerName")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStepDialog(false)}>{t("manufacturing.common.cancel")}</Button>
            <Button
              onClick={handleCreateBomStep}
              disabled={!newStep.stepName || createBomStepMutation.isPending}
            >
              {createBomStepMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              {t("manufacturing.steps.addStep")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI智慧预设对话框 */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              {t("manufacturing.steps.aiPresetTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("manufacturing.steps.aiPresetDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 相似项目列表 */}
            <div>
              <Label>{t("manufacturing.steps.selectReferenceProject")}</Label>
              {similarProjectsQuery.isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">{t("manufacturing.steps.findingSimilarProjects")}</span>
                </div>
              ) : (
                <Select value={aiSourceProjectId} onValueChange={setAiSourceProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("manufacturing.steps.selectHistoricalProject")} />
                  </SelectTrigger>
                  <SelectContent>
                    {((similarProjectsQuery.data as any[]) || []).map((proj: any) => (
                      <SelectItem key={proj.id} value={String(proj.id)}>
                        {proj.project_name} ({proj.step_count} {t("manufacturing.steps.steps")}, {proj.process_codes})
                      </SelectItem>
                    ))}
                    {((similarProjectsQuery.data as any[]) || []).length === 0 && (
                      <SelectItem value="none" disabled>{t("manufacturing.steps.noHistoricalProjects")}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 参照范围 */}
            <div>
              <Label>{t("manufacturing.steps.referenceScope")}</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  size="sm"
                  variant={aiRangeMode === "single" ? "default" : "outline"}
                  onClick={() => setAiRangeMode("single")}
                >
                  {t("manufacturing.steps.currentProcess")} ({selectedProcessCode})
                </Button>
                <Button
                  size="sm"
                  variant={aiRangeMode === "range" ? "default" : "outline"}
                  onClick={() => setAiRangeMode("range")}
                >
                  {t("manufacturing.steps.specifiedRange")}
                </Button>
                <Button
                  size="sm"
                  variant={aiRangeMode === "all" ? "default" : "outline"}
                  onClick={() => setAiRangeMode("all")}
                >
                  {t("manufacturing.steps.allTSteps")} (T1-T15)
                </Button>
              </div>
            </div>

            {aiRangeMode === "range" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("manufacturing.steps.startProcess")}</Label>
                  <Select value={aiRangeStart} onValueChange={setAiRangeStart}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROCESS_CODES.map(p => (
                        <SelectItem key={p.code} value={p.code}>{p.code}: {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("manufacturing.steps.endProcess")}</Label>
                  <Select value={aiRangeEnd} onValueChange={setAiRangeEnd}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROCESS_CODES.map(p => (
                        <SelectItem key={p.code} value={p.code}>{p.code}: {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="font-medium">{t("manufacturing.steps.aiWillPerform")}:</span>
              </div>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-6">
                <li>{t("manufacturing.steps.aiAction1")}</li>
                <li>{t("manufacturing.steps.aiAction2")}</li>
                <li>{t("manufacturing.steps.aiAction3")}</li>
                <li>{t("manufacturing.steps.aiAction4")}</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAiDialog(false)}>{t("manufacturing.common.cancel")}</Button>
            <Button
              onClick={handleGenerateAiPreset}
              disabled={!aiSourceProjectId || generateAiPresetMutation.isPending || generateRangeMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {(generateAiPresetMutation.isPending || generateRangeMutation.isPending)
                ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                : <Brain className="w-4 h-4 mr-1" />
              }
              {t("manufacturing.steps.generateAiPreset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑步骤对话框 */}
      {editingStep && (
        <Dialog open={!!editingStep} onOpenChange={() => setEditingStep(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("manufacturing.steps.editStep")} - {editingStep.step_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("manufacturing.steps.stepName")}</Label>
                <Input
                  value={editingStep.step_name}
                  onChange={(e) => setEditingStep({ ...editingStep, step_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("manufacturing.steps.processRequirements")}</Label>
                <Textarea
                  value={editingStep.process_requirements || ""}
                  onChange={(e) => setEditingStep({ ...editingStep, process_requirements: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>{t("manufacturing.steps.processDescription")}</Label>
                <Textarea
                  value={editingStep.process_description || ""}
                  onChange={(e) => setEditingStep({ ...editingStep, process_description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("manufacturing.steps.bomItemReference")}</Label>
                  <Input
                    value={editingStep.bom_item_reference || ""}
                    onChange={(e) => setEditingStep({ ...editingStep, bom_item_reference: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("manufacturing.steps.theoreticalHours")}</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editingStep.theoretical_hours || ""}
                    onChange={(e) => setEditingStep({ ...editingStep, theoretical_hours: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>{t("manufacturing.steps.plannedWorker")}</Label>
                <Input
                  value={editingStep.planned_worker_name || ""}
                  onChange={(e) => setEditingStep({ ...editingStep, planned_worker_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("manufacturing.production.status")}</Label>
                <Select
                  value={editingStep.status || "pending"}
                  onValueChange={(v) => setEditingStep({ ...editingStep, status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t("manufacturing.steps.statusNotStarted")}</SelectItem>
                    <SelectItem value="in_progress">{t("manufacturing.steps.statusInProgress")}</SelectItem>
                    <SelectItem value="completed">{t("manufacturing.steps.statusCompleted")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStep(null)}>{t("manufacturing.common.cancel")}</Button>
              <Button onClick={() => {
                updateBomStepMutation.mutate({
                  id: editingStep.id,
                  stepName: editingStep.step_name,
                  processRequirements: editingStep.process_requirements,
                  processDescription: editingStep.process_description,
                  bomItemReference: editingStep.bom_item_reference,
                  theoreticalHours: editingStep.theoretical_hours ? parseFloat(editingStep.theoretical_hours) : undefined,
                  plannedWorkerName: editingStep.planned_worker_name,
                  status: editingStep.status,
                });
              }}>
                <Save className="w-4 h-4 mr-1" /> {t("manufacturing.common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ============================================================
// 子组件：BOM步骤卡片
// ============================================================

function BomStepCard({
  step, index, user, onEdit, onDelete, onStartTime, onEndTime,
  activeTimeLogs, isStarting, isEnding
}: {
  step: any; index: number; user: any;
  onEdit: (s: any) => void; onDelete: (id: number) => void;
  onStartTime: (bomStepId: number) => void;
  onEndTime: (timeLogId: number) => void;
  activeTimeLogs: any[]; isStarting: boolean; isEnding: boolean;
}) {
  const { t } = useLanguage();
  const activeLog = activeTimeLogs.find((l: any) => l.bom_step_id === step.id);

  const statusLabels: Record<string, string> = {
    pending: t("manufacturing.steps.statusNotStarted"),
    in_progress: t("manufacturing.steps.statusInProgress"),
    completed: t("manufacturing.steps.statusCompleted"),
  };

  return (
    <div className="border rounded-lg p-3 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
            #{step.step_number}
          </span>
          <span className="font-medium text-sm">{step.step_name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge className={`text-xs ${STATUS_COLORS[step.status] || STATUS_COLORS.pending}`}>
            {statusLabels[step.status] || t("manufacturing.steps.statusNotStarted")}
          </Badge>
        </div>
      </div>

      {step.process_requirements && (
        <div className="text-xs text-muted-foreground mb-1">
          <span className="font-medium">{t("manufacturing.steps.processRequirements")}:</span> {step.process_requirements}
        </div>
      )}
      {step.process_description && (
        <div className="text-xs text-muted-foreground mb-1">
          <span className="font-medium">{t("manufacturing.steps.processDescription")}:</span> {step.process_description}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
        {step.bom_item_reference && (
          <span>BOM: {step.bom_item_reference}</span>
        )}
        {step.theoretical_hours && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {step.theoretical_hours}h
          </span>
        )}
        {step.planned_worker_name && (
          <span>{t("manufacturing.steps.worker")}: {step.planned_worker_name}</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t">
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onEdit(step)}>
            <Edit className="w-3 h-3 mr-1" /> {t("manufacturing.common.edit")}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={() => onDelete(step.id)}>
            <Trash2 className="w-3 h-3 mr-1" /> {t("manufacturing.common.delete")}
          </Button>
        </div>
        <div>
          {activeLog ? (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-3 text-xs"
              onClick={() => onEndTime(activeLog.id)}
              disabled={isEnding}
            >
              <Square className="w-3 h-3 mr-1" /> {t("manufacturing.steps.endTime")}
            </Button>
          ) : step.status !== "completed" ? (
            <Button
              size="sm"
              variant="default"
              className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700"
              onClick={() => onStartTime(step.id)}
              disabled={isStarting}
            >
              <Play className="w-3 h-3 mr-1" /> {t("manufacturing.steps.startTime")}
            </Button>
          ) : (
            <Badge className="bg-green-100 text-green-700 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" /> {t("manufacturing.steps.statusCompleted")}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 子组件：AI预设步骤卡片
// ============================================================

function AiPresetCard({
  preset, index, onAdopt, onConfirm, isAdopting
}: {
  preset: any; index: number;
  onAdopt: (id: number) => void;
  onConfirm: (id: number, status: string) => void;
  isAdopting: boolean;
}) {
  const { t } = useLanguage();

  const confirmLabels: Record<string, string> = {
    pending: t("manufacturing.steps.confirmPending"),
    confirmed: t("manufacturing.steps.confirmApproved"),
    modified: t("manufacturing.steps.confirmModified"),
    rejected: t("manufacturing.steps.confirmRejected"),
  };

  return (
    <div className="border rounded-lg p-3 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-mono text-muted-foreground bg-purple-100 dark:bg-purple-900 px-2 py-0.5 rounded">
            #{preset.step_number}
          </span>
          <span className="font-medium text-sm">{preset.step_name}</span>
        </div>
        <Badge className={`text-xs ${CONFIRM_STATUS_COLORS[preset.confirm_status] || CONFIRM_STATUS_COLORS.pending}`}>
          {confirmLabels[preset.confirm_status] || t("manufacturing.steps.confirmPending")}
        </Badge>
      </div>

      {preset.process_requirements && (
        <div className="text-xs text-muted-foreground mb-1">
          <span className="font-medium">{t("manufacturing.steps.processRequirements")}:</span> {preset.process_requirements}
        </div>
      )}
      {preset.process_description && (
        <div className="text-xs text-muted-foreground mb-1">
          <span className="font-medium">{t("manufacturing.steps.processDescription")}:</span> {preset.process_description}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
        {preset.source_project_name && (
          <span className="flex items-center gap-1">
            <History className="w-3 h-3" /> {t("manufacturing.steps.reference")}: {preset.source_project_name}
          </span>
        )}
        {preset.match_score && (
          <span>{t("manufacturing.steps.matchScore")}: {preset.match_score}%</span>
        )}
        {preset.theoretical_hours && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {preset.theoretical_hours}h
          </span>
        )}
      </div>

      {/* Action buttons */}
      {preset.confirm_status === "pending" && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-purple-200 dark:border-purple-800">
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 flex-1"
            onClick={() => onAdopt(preset.id)}
            disabled={isAdopting}
          >
            <Check className="w-3 h-3 mr-1" /> {t("manufacturing.steps.adopt")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs flex-1"
            onClick={() => onConfirm(preset.id, "modified")}
          >
            <Edit className="w-3 h-3 mr-1" /> {t("manufacturing.steps.modifyAndAdopt")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-3 text-xs text-destructive"
            onClick={() => onConfirm(preset.id, "rejected")}
          >
            <XCircle className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
