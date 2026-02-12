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
  Sparkles, RefreshCw, ArrowDown, ArrowUp, Zap
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
      toast({ title: "步骤已添加", description: "BOM步骤创建成功" });
      bomStepsQuery.refetch();
      statsQuery.refetch();
      setShowAddStepDialog(false);
      resetNewStep();
    },
    onError: (err) => toast({ title: "创建失败", description: err.message, variant: "destructive" }),
  });

  const updateBomStepMutation = trpc.processSteps.updateBomStep.useMutation({
    onSuccess: () => {
      toast({ title: "步骤已更新" });
      bomStepsQuery.refetch();
      setEditingStep(null);
    },
  });

  const deleteBomStepMutation = trpc.processSteps.deleteBomStep.useMutation({
    onSuccess: () => {
      toast({ title: "步骤已删除" });
      bomStepsQuery.refetch();
      statsQuery.refetch();
    },
  });

  const startTimeLogMutation = trpc.processSteps.startTimeLogForWorker.useMutation({
    onSuccess: () => {
      toast({ title: "工时已开始", description: "计时已启动" });
      activeTimeLogsQuery.refetch();
      bomStepsQuery.refetch();
    },
    onError: (err) => toast({ title: "开始失败", description: err.message, variant: "destructive" }),
  });

  const endTimeLogMutation = trpc.processSteps.endTimeLog.useMutation({
    onSuccess: (data: any) => {
      toast({ title: "工时已结束", description: `实际工时: ${data.actualHours}小时` });
      activeTimeLogsQuery.refetch();
      bomStepsQuery.refetch();
    },
  });

  const adoptAiPresetMutation = trpc.processSteps.adoptAiPresetAsBomStep.useMutation({
    onSuccess: () => {
      toast({ title: "AI步骤已采纳", description: "已复制为BOM步骤" });
      bomStepsQuery.refetch();
      aiPresetsQuery.refetch();
      statsQuery.refetch();
    },
  });

  const batchAdoptMutation = trpc.processSteps.batchAdoptAiPresets.useMutation({
    onSuccess: () => {
      toast({ title: "批量采纳成功" });
      bomStepsQuery.refetch();
      aiPresetsQuery.refetch();
      statsQuery.refetch();
    },
  });

  const confirmAiPresetMutation = trpc.processSteps.confirmAiPresetStep.useMutation({
    onSuccess: () => {
      toast({ title: "确认状态已更新" });
      aiPresetsQuery.refetch();
    },
  });

  const generateAiPresetMutation = trpc.processSteps.generateAiPresetSteps.useMutation({
    onSuccess: (data: any) => {
      toast({ title: "AI预设已生成", description: `生成了 ${data.steps?.length || 0} 个步骤建议` });
      aiPresetsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err) => toast({ title: "AI生成失败", description: err.message, variant: "destructive" }),
  });

  const generateRangeMutation = trpc.processSteps.generateAiPresetsForRange.useMutation({
    onSuccess: () => {
      toast({ title: "批量AI预设已生成" });
      aiPresetsQuery.refetch();
      statsQuery.refetch();
      setShowAiDialog(false);
    },
    onError: (err) => toast({ title: "批量生成失败", description: err.message, variant: "destructive" }),
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
      toast({ title: "请先选择项目和工序", variant: "destructive" });
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
      toast({ title: "请选择源项目", variant: "destructive" });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Factory className="w-7 h-7 text-primary" />
            生产工序步骤管理
          </h1>
          <p className="text-muted-foreground mt-1">
            T1-T15工序管理 · 双列编辑 · AI智慧预设 · 工时打卡
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 项目选择 - 使用简单输入框模拟 */}
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">项目ID:</Label>
            <Input
              type="number"
              placeholder="输入项目ID"
              className="w-32"
              value={selectedProjectId || ""}
              onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>
        </div>
      </div>

      {/* 活跃工时提醒 */}
      {activeTimeLogs.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
              <span className="font-semibold text-blue-700 dark:text-blue-300">正在计时的工序</span>
            </div>
            <div className="space-y-2">
              {activeTimeLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-md p-3 border">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">{log.process_code}</Badge>
                    <span className="font-medium">{log.step_name}</span>
                    <span className="text-sm text-muted-foreground">
                      开始于 {new Date(Number(log.start_time)).toLocaleTimeString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => endTimeLogMutation.mutate({ timeLogId: log.id })}
                    disabled={endTimeLogMutation.isPending}
                  >
                    <Square className="w-4 h-4 mr-1" />
                    结束
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
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{(statsQuery.data as any).bomSteps.total}</div>
              <div className="text-xs text-muted-foreground">BOM步骤总数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{(statsQuery.data as any).bomSteps.completed}</div>
              <div className="text-xs text-muted-foreground">已完成</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{(statsQuery.data as any).bomSteps.inProgress}</div>
              <div className="text-xs text-muted-foreground">进行中</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{(statsQuery.data as any).aiPresets.total}</div>
              <div className="text-xs text-muted-foreground">AI预设步骤</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">
                {(statsQuery.data as any).timeLogs.totalActualHours.toFixed(1)}h
              </div>
              <div className="text-xs text-muted-foreground">累计工时</div>
            </CardContent>
          </Card>
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
                      {bomSteps.length} 步骤 · {aiPresets.length} AI预设
                    </span>
                    {bomSteps.some((s: any) => s.status === "in_progress") && (
                      <Badge className="bg-blue-100 text-blue-700">进行中</Badge>
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
                          <Plus className="w-4 h-4 mr-1" /> 添加步骤
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAiDialog(true)}>
                          <Brain className="w-4 h-4 mr-1" /> AI智慧预设
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
                          <Sparkles className="w-4 h-4 mr-1" /> 全部借鉴采纳 ({aiPresets.filter((p: any) => p.confirm_status === "pending").length})
                        </Button>
                      )}
                    </div>

                    {/* 双列布局 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* 左列：工程师手动输入 */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Edit className="w-4 h-4 text-primary" />
                          <h3 className="font-semibold text-sm uppercase tracking-wider text-primary">工程师输入</h3>
                          <Badge variant="outline" className="text-xs">{bomSteps.length} 步骤</Badge>
                        </div>

                        {bomSteps.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">暂无BOM步骤</p>
                            <p className="text-xs mt-1">点击"添加步骤"开始录入</p>
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
                                      workerName: user?.name || "未知",
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
                          <h3 className="font-semibold text-sm uppercase tracking-wider text-purple-600">AI智慧预设</h3>
                          <Badge variant="outline" className="text-xs">{aiPresets.length} 建议</Badge>
                        </div>

                        {aiPresets.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg border-purple-200 dark:border-purple-800">
                            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50 text-purple-400" />
                            <p className="text-sm">暂无AI预设步骤</p>
                            <p className="text-xs mt-1">点击"AI智慧预设"从历史项目生成</p>
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
          <h2 className="text-xl font-semibold mb-2">请选择项目</h2>
          <p className="text-muted-foreground">在右上角输入项目ID以查看和管理工序步骤</p>
        </Card>
      )}

      {/* 添加步骤对话框 */}
      <Dialog open={showAddStepDialog} onOpenChange={setShowAddStepDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              添加BOM步骤 - {selectedProcessCode}
            </DialogTitle>
            <DialogDescription>
              为工序 {selectedProcessCode} 添加新的生产步骤
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>步骤名称 *</Label>
              <Input
                value={newStep.stepName}
                onChange={(e) => setNewStep(prev => ({ ...prev, stepName: e.target.value }))}
                placeholder="例如：底座机加工"
              />
            </div>
            <div>
              <Label>工艺要求</Label>
              <Textarea
                value={newStep.processRequirements}
                onChange={(e) => setNewStep(prev => ({ ...prev, processRequirements: e.target.value }))}
                placeholder="例如：表面粗糙度Ra1.6，公差±0.05mm"
                rows={2}
              />
            </div>
            <div>
              <Label>工艺步骤描述</Label>
              <Textarea
                value={newStep.processDescription}
                onChange={(e) => setNewStep(prev => ({ ...prev, processDescription: e.target.value }))}
                placeholder="详细描述该步骤的操作流程"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>BOM零件参照</Label>
                <Input
                  value={newStep.bomItemReference}
                  onChange={(e) => setNewStep(prev => ({ ...prev, bomItemReference: e.target.value }))}
                  placeholder="零件编号"
                />
              </div>
              <div>
                <Label>理论工时 (小时)</Label>
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
              <Label>计划产线员工</Label>
              <Input
                value={newStep.plannedWorkerName}
                onChange={(e) => setNewStep(prev => ({ ...prev, plannedWorkerName: e.target.value }))}
                placeholder="员工姓名"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStepDialog(false)}>取消</Button>
            <Button
              onClick={handleCreateBomStep}
              disabled={!newStep.stepName || createBomStepMutation.isPending}
            >
              {createBomStepMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              添加步骤
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
              AI智慧预设 - 历史项目参照
            </DialogTitle>
            <DialogDescription>
              选择相似的历史项目，AI将根据其BOM步骤和工艺数据生成预设建议
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 相似项目列表 */}
            <div>
              <Label>选择参照项目</Label>
              {similarProjectsQuery.isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">正在查找相似项目...</span>
                </div>
              ) : (
                <Select value={aiSourceProjectId} onValueChange={setAiSourceProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择历史项目" />
                  </SelectTrigger>
                  <SelectContent>
                    {((similarProjectsQuery.data as any[]) || []).map((proj: any) => (
                      <SelectItem key={proj.id} value={String(proj.id)}>
                        {proj.project_name} ({proj.step_count}步骤, {proj.process_codes})
                      </SelectItem>
                    ))}
                    {((similarProjectsQuery.data as any[]) || []).length === 0 && (
                      <SelectItem value="none" disabled>暂无可参照的历史项目</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 参照范围 */}
            <div>
              <Label>参照范围</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  size="sm"
                  variant={aiRangeMode === "single" ? "default" : "outline"}
                  onClick={() => setAiRangeMode("single")}
                >
                  当前工序 ({selectedProcessCode})
                </Button>
                <Button
                  size="sm"
                  variant={aiRangeMode === "range" ? "default" : "outline"}
                  onClick={() => setAiRangeMode("range")}
                >
                  指定范围
                </Button>
                <Button
                  size="sm"
                  variant={aiRangeMode === "all" ? "default" : "outline"}
                  onClick={() => setAiRangeMode("all")}
                >
                  全部T步骤 (T1-T15)
                </Button>
              </div>
            </div>

            {aiRangeMode === "range" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>起始工序</Label>
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
                  <Label>结束工序</Label>
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
                <span className="font-medium">AI将执行以下操作：</span>
              </div>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-6">
                <li>分析历史项目的BOM步骤和工艺数据</li>
                <li>结合当前项目的BOM清单进行匹配</li>
                <li>生成预设步骤建议（显示在右列）</li>
                <li>工程师可逐个确认、修改或批量采纳</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAiDialog(false)}>取消</Button>
            <Button
              onClick={handleGenerateAiPreset}
              disabled={!aiSourceProjectId || generateAiPresetMutation.isPending || generateRangeMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {(generateAiPresetMutation.isPending || generateRangeMutation.isPending)
                ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                : <Brain className="w-4 h-4 mr-1" />
              }
              生成AI预设
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑步骤对话框 */}
      {editingStep && (
        <Dialog open={!!editingStep} onOpenChange={() => setEditingStep(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>编辑步骤 - {editingStep.step_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>步骤名称</Label>
                <Input
                  value={editingStep.step_name}
                  onChange={(e) => setEditingStep({ ...editingStep, step_name: e.target.value })}
                />
              </div>
              <div>
                <Label>工艺要求</Label>
                <Textarea
                  value={editingStep.process_requirements || ""}
                  onChange={(e) => setEditingStep({ ...editingStep, process_requirements: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>工艺步骤描述</Label>
                <Textarea
                  value={editingStep.process_description || ""}
                  onChange={(e) => setEditingStep({ ...editingStep, process_description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>BOM零件参照</Label>
                  <Input
                    value={editingStep.bom_item_reference || ""}
                    onChange={(e) => setEditingStep({ ...editingStep, bom_item_reference: e.target.value })}
                  />
                </div>
                <div>
                  <Label>理论工时</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editingStep.theoretical_hours || ""}
                    onChange={(e) => setEditingStep({ ...editingStep, theoretical_hours: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>计划产线员工</Label>
                <Input
                  value={editingStep.planned_worker_name || ""}
                  onChange={(e) => setEditingStep({ ...editingStep, planned_worker_name: e.target.value })}
                />
              </div>
              <div>
                <Label>状态</Label>
                <Select
                  value={editingStep.status || "pending"}
                  onValueChange={(v) => setEditingStep({ ...editingStep, status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待开始</SelectItem>
                    <SelectItem value="in_progress">进行中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStep(null)}>取消</Button>
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
                <Save className="w-4 h-4 mr-1" /> 保存
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
  const activeLog = activeTimeLogs.find((l: any) => l.bom_step_id === step.id);

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
            {STATUS_LABELS[step.status] || "待开始"}
          </Badge>
        </div>
      </div>

      {step.process_requirements && (
        <div className="text-xs text-muted-foreground mb-1">
          <span className="font-medium">工艺要求:</span> {step.process_requirements}
        </div>
      )}
      {step.process_description && (
        <div className="text-xs text-muted-foreground mb-1">
          <span className="font-medium">步骤描述:</span> {step.process_description}
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
          <span>员工: {step.planned_worker_name}</span>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t">
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onEdit(step)}>
            <Edit className="w-3 h-3 mr-1" /> 编辑
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={() => onDelete(step.id)}>
            <Trash2 className="w-3 h-3 mr-1" /> 删除
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
              <Square className="w-3 h-3 mr-1" /> 结束工时
            </Button>
          ) : step.status !== "completed" ? (
            <Button
              size="sm"
              variant="default"
              className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700"
              onClick={() => onStartTime(step.id)}
              disabled={isStarting}
            >
              <Play className="w-3 h-3 mr-1" /> 开始工时
            </Button>
          ) : (
            <Badge className="bg-green-100 text-green-700 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" /> 已完成
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
          {CONFIRM_STATUS_LABELS[preset.confirm_status] || "待确认"}
        </Badge>
      </div>

      {preset.process_requirements && (
        <div className="text-xs text-muted-foreground mb-1">
          <span className="font-medium">工艺要求:</span> {preset.process_requirements}
        </div>
      )}
      {preset.process_description && (
        <div className="text-xs text-muted-foreground mb-1">
          <span className="font-medium">步骤描述:</span> {preset.process_description}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
        {preset.source_project_name && (
          <span className="flex items-center gap-1">
            <History className="w-3 h-3" /> 参照: {preset.source_project_name}
          </span>
        )}
        {preset.match_score && (
          <span>匹配度: {preset.match_score}%</span>
        )}
        {preset.theoretical_hours && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {preset.theoretical_hours}h
          </span>
        )}
      </div>

      {/* 操作按钮 */}
      {preset.confirm_status === "pending" && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-purple-200 dark:border-purple-800">
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 flex-1"
            onClick={() => onAdopt(preset.id)}
            disabled={isAdopting}
          >
            <Check className="w-3 h-3 mr-1" /> 采纳
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs flex-1"
            onClick={() => onConfirm(preset.id, "modified")}
          >
            <Edit className="w-3 h-3 mr-1" /> 修改后采纳
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
