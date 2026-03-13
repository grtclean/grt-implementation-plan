/**
 * SolutionProposalUI — 清洗工艺方案推演看板
 *
 * 专业级 AI 方案展示界面:
 * - 左侧: AI 推荐的工艺流程与对标历史设备
 * - 右侧: 竞品优劣势分析与报价预测
 *
 * 遵循 GRT 第一定律: Skeleton 轮询等待，零闪退
 */
import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Factory,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Droplets,
  Thermometer,
  Target,
  Award,
  ArrowRight,
  ChevronRight,
  Layers,
  Zap,
  Shield,
  BarChart3,
  Building2,
  Rocket,
  FileDown,
  Printer,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  User,
  Bot,
  Cog,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// ─── 类型定义 ────────────────────────────────────────────

interface ProcessStage {
  stageNo: number;
  stageName: string;
  stageNameEn: string;
  processType: string;
  duration: number;
  temperature?: number;
  description: string;
}

interface BenchmarkProject {
  projectId: number;
  projectNo: string;
  customerName: string;
  workpiece: string;
  similarity: number;
  deliveryYear: number;
  equipmentModel: string;
  highlights: string[];
}

interface Competitor {
  name: string;
  country: string;
  strengths: string[];
  weaknesses: string[];
}

interface BudgetEstimate {
  equipmentCost: { min: number; max: number; currency: string };
  installationCost: { min: number; max: number; currency: string };
  totalProjectCost: { min: number; max: number; currency: string };
  paybackPeriodMonths: number;
  confidence: number;
}

interface ProposalData {
  id: number;
  status: string;
  benchmarkProjects: BenchmarkProject[];
  processFlow: {
    stages: ProcessStage[];
    totalCycleTime: number;
    layoutType: string;
    automationLevel: string;
  };
  competitorAnalysis?: {
    competitors: Competitor[];
    ourAdvantages: string[];
    ourChallenges: string[];
    winStrategy: string;
  };
  budgetEstimate?: BudgetEstimate;
}

// ─── 工艺类型图标映射 ────────────────────────────────────────────

const processTypeIcons: Record<string, React.ReactNode> = {
  ULTRASONIC: <Droplets className="w-4 h-4" />,
  SPRAY: <Zap className="w-4 h-4" />,
  IMMERSION: <Layers className="w-4 h-4" />,
  VACUUM_DRY: <Thermometer className="w-4 h-4" />,
  HOT_AIR_DRY: <Thermometer className="w-4 h-4" />,
  RINSE: <Droplets className="w-4 h-4" />,
  DRY: <Thermometer className="w-4 h-4" />,
  LOADING: <User className="w-4 h-4" />,
  UNLOADING: <User className="w-4 h-4" />,
};

// ─── 上下料方式选项 ────────────────────────────────────────────

const handlingMethodOptions = [
  { value: 'MANUAL', label: '人工', icon: <User className="w-4 h-4" /> },
  { value: 'GANTRY', label: '桁架机械手', icon: <Cog className="w-4 h-4" /> },
  { value: 'ROBOT_6AXIS', label: '六轴机器人', icon: <Bot className="w-4 h-4" /> },
  { value: 'ROBOT_HUMANOID', label: '人型机器人', icon: <Bot className="w-4 h-4" /> },
  { value: 'CONVEYOR', label: '输送线', icon: <Layers className="w-4 h-4" /> },
  { value: 'OTHER', label: '其他', icon: <Cog className="w-4 h-4" /> },
];

// ─── 工艺类型选项（GRT 标准编码） ────────────────────────────────────────────

const processTypeOptions = [
  // 上下料
  { value: 'LOADING', label: '上料', code: 'ST0' },
  { value: 'UNLOADING', label: '下料', code: 'ST-END' },
  // 清洗工艺 P1-P12
  { value: 'PRE_CLEAN', label: '预清洗', code: 'P1' },
  { value: 'ROTARY_TURBULENT', label: '旋转紊流清洗', code: 'P2' },
  { value: 'SPOT_POSITIONING', label: '定点定位清洗', code: 'P3' },
  { value: 'INLINE_ROBOT', label: '在线机器人清洗', code: 'P4' },
  { value: 'ROBOT_STATION', label: '机器人站清洗', code: 'P5' },
  { value: 'ULTRASONIC', label: '超声波清洗', code: 'P6' },
  { value: 'AIR_CUT', label: '切风', code: 'P7' },
  { value: 'VACUUM_DRY', label: '真空干燥', code: 'P8' },
  { value: 'HOT_AIR_DRY', label: '热风干燥', code: 'P9' },
  { value: 'ROTARY_AIR_CUT', label: '旋转切风', code: 'P10' },
  { value: 'OILING', label: '上油', code: 'P11' },
  { value: 'RINSE', label: '漂洗', code: 'P12' },
  // 其他
  { value: 'SPRAY', label: '喷淋清洗', code: 'SP' },
  { value: 'IMMERSION', label: '浸泡清洗', code: 'IM' },
  { value: 'OTHER', label: '其他工艺', code: 'OT' },
];

// ─── 工艺流程卡片（可编辑） ────────────────────────────────────────────

interface EditableStage extends ProcessStage {
  handlingMethod?: string;
}

function ProcessFlowCard({
  processFlow,
  editable = false,
  onStagesChange,
}: {
  processFlow: ProposalData['processFlow'];
  editable?: boolean;
  onStagesChange?: (stages: EditableStage[]) => void;
}) {
  const [stages, setStages] = useState<EditableStage[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addAfterIndex, setAddAfterIndex] = useState<number>(-1);

  // 同步外部数据
  React.useEffect(() => {
    if (processFlow?.stages) {
      setStages(processFlow.stages.map(s => ({ ...s })));
    }
  }, [processFlow]);

  if (!processFlow) return null;

  const handleAddStage = (afterIndex: number) => {
    setAddAfterIndex(afterIndex);
    setShowAddDialog(true);
  };

  const insertNewStage = (processType: string, handlingMethod?: string) => {
    const newStageNo = addAfterIndex + 2;
    const typeName = processTypeOptions.find(o => o.value === processType)?.label || processType;
    const methodName = handlingMethod
      ? handlingMethodOptions.find(o => o.value === handlingMethod)?.label
      : undefined;

    const newStage: EditableStage = {
      stageNo: newStageNo,
      stageName: methodName ? `${typeName}（${methodName}）` : typeName,
      stageNameEn: processType,
      processType,
      duration: 30,
      description: `${typeName}工位`,
      handlingMethod,
    };

    const newStages = [...stages];
    newStages.splice(addAfterIndex + 1, 0, newStage);

    // 重新编号
    newStages.forEach((s, i) => {
      s.stageNo = i + 1;
    });

    setStages(newStages);
    onStagesChange?.(newStages);
    setShowAddDialog(false);
  };

  const handleDeleteStage = (index: number) => {
    const newStages = stages.filter((_, i) => i !== index);
    newStages.forEach((s, i) => {
      s.stageNo = i + 1;
    });
    setStages(newStages);
    onStagesChange?.(newStages);
  };

  const handleUpdateStage = (index: number, updates: Partial<EditableStage>) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], ...updates };
    setStages(newStages);
    onStagesChange?.(newStages);
  };

  const getProcessTypeLabel = (type: string) => {
    return processTypeOptions.find(o => o.value === type)?.label || type;
  };

  const getProcessTypeCode = (type: string) => {
    return processTypeOptions.find(o => o.value === type)?.code || '';
  };

  const getHandlingMethodLabel = (method?: string) => {
    if (!method) return null;
    return handlingMethodOptions.find(o => o.value === method)?.label || method;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600" />
            推荐工艺流程
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {processFlow.layoutType} · {processFlow.automationLevel}
          </Badge>
        </div>
        <CardDescription>
          总节拍: <span className="font-semibold text-blue-600">{processFlow.totalCycleTime}秒</span>
          {editable && <span className="ml-2 text-xs text-blue-500">（可编辑）</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* 首位添加按钮 */}
        {editable && (
          <div className="flex justify-center py-1">
            <button
              onClick={() => handleAddStage(-1)}
              className="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center text-blue-600 transition-colors"
              title="在开头添加工位"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}

        {stages.map((stage, index) => (
          <div key={`${stage.stageNo}-${index}`} className="relative">
            {/* 工位卡片 */}
            <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
              editingIndex === index
                ? 'bg-blue-50 border-blue-300 shadow-sm'
                : 'bg-gradient-to-r from-slate-50 to-white border-slate-100 hover:border-slate-200'
            }`}>
              {/* 拖拽手柄 + 工位号 */}
              <div className="flex flex-col items-center gap-1">
                {editable && (
                  <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                )}
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                  ST{stage.stageNo}
                </div>
              </div>

              {/* 工位信息 */}
              <div className="flex-1 min-w-0">
                {editingIndex === index ? (
                  /* 编辑模式 */
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">工艺类型</label>
                        <Select
                          value={stage.processType}
                          onValueChange={(v) => handleUpdateStage(index, { processType: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {processTypeOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs text-blue-600">{opt.code}</span>
                                  {opt.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {(stage.processType === 'LOADING' || stage.processType === 'UNLOADING') && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">上下料方式</label>
                          <Select
                            value={stage.handlingMethod || ''}
                            onValueChange={(v) => handleUpdateStage(index, { handlingMethod: v })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="选择方式" />
                            </SelectTrigger>
                            <SelectContent>
                              {handlingMethodOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex items-center gap-2">
                                    {opt.icon}
                                    {opt.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">时间（秒）</label>
                        <Input
                          type="number"
                          value={stage.duration}
                          onChange={(e) => handleUpdateStage(index, { duration: parseInt(e.target.value) || 0 })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">温度（°C）</label>
                        <Input
                          type="number"
                          value={stage.temperature || ''}
                          onChange={(e) => handleUpdateStage(index, { temperature: parseInt(e.target.value) || undefined })}
                          className="h-8 text-xs"
                          placeholder="可选"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingIndex(null)}
                        className="h-7 text-xs"
                      >
                        完成
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* 查看模式 */
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-800">{stage.stageName}</span>
                      <Badge variant="secondary" className="text-xs gap-1">
                        {processTypeIcons[stage.processType] || <Layers className="w-3 h-3" />}
                        <span className="font-mono text-blue-600">{getProcessTypeCode(stage.processType)}</span>
                        {getProcessTypeLabel(stage.processType)}
                      </Badge>
                      {stage.handlingMethod && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                          {getHandlingMethodLabel(stage.handlingMethod)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{stage.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {stage.duration}秒
                      </span>
                      {stage.temperature && (
                        <span className="flex items-center gap-1">
                          <Thermometer className="w-3 h-3" />
                          {stage.temperature}°C
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* 操作按钮 */}
              {editable && editingIndex !== index && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setEditingIndex(index)}
                    className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
                    title="编辑"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteStage(index)}
                    className="w-7 h-7 rounded-md hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 添加按钮（工位之间） */}
            {editable && index < stages.length - 1 && (
              <div className="flex justify-center py-1">
                <button
                  onClick={() => handleAddStage(index)}
                  className="w-6 h-6 rounded-full bg-slate-100 hover:bg-blue-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
                  title="在此处添加工位"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 连接线 */}
            {!editable && index < stages.length - 1 && (
              <div className="absolute left-[27px] top-full h-3 w-px bg-blue-200" />
            )}
          </div>
        ))}

        {/* 末尾添加按钮 */}
        {editable && stages.length > 0 && (
          <div className="flex justify-center py-1">
            <button
              onClick={() => handleAddStage(stages.length - 1)}
              className="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center text-blue-600 transition-colors"
              title="在末尾添加工位"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </CardContent>

      {/* 添加工位对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              添加工位
            </DialogTitle>
            <DialogDescription>
              选择要添加的工艺类型
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4 max-h-80 overflow-y-auto">
            {processTypeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  if (opt.value === 'LOADING' || opt.value === 'UNLOADING') {
                    // 需要选择上下料方式
                    insertNewStage(opt.value, 'MANUAL');
                  } else {
                    insertNewStage(opt.value);
                  }
                }}
                className="flex items-center gap-2 p-3 rounded-lg border hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
              >
                <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{opt.code}</span>
                {processTypeIcons[opt.value] || <Layers className="w-4 h-4" />}
                {opt.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── 对标项目卡片 ────────────────────────────────────────────

function BenchmarkProjectsCard({ projects }: { projects: BenchmarkProject[] }) {
  if (!projects?.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          历史对标项目
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {projects.slice(0, 3).map((project) => (
          <div
            key={project.projectId}
            className="p-3 bg-gradient-to-r from-amber-50 to-white rounded-lg border border-amber-100"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-medium text-slate-800">{project.projectNo}</span>
                <p className="text-xs text-slate-500">{project.customerName}</p>
              </div>
              <Badge
                variant={project.similarity >= 80 ? "default" : "secondary"}
                className="text-xs"
              >
                {project.similarity}% 相似
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
              <span className="bg-slate-100 px-2 py-0.5 rounded">{project.workpiece}</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded">{project.equipmentModel}</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded">{project.deliveryYear}年交付</span>
            </div>
            {project.highlights?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {project.highlights.slice(0, 3).map((h, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-white">
                    {h}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── 竞品分析卡片 ────────────────────────────────────────────

function CompetitorAnalysisCard({ analysis }: { analysis: ProposalData['competitorAnalysis'] }) {
  if (!analysis) return null;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" />
          竞品分析 SWOT
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 竞品列表 */}
        <div className="space-y-3">
          {analysis.competitors.slice(0, 2).map((competitor, i) => (
            <div key={i} className="p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-slate-600" />
                <span className="font-medium text-slate-800">{competitor.name}</span>
                <Badge variant="outline" className="text-xs">{competitor.country}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-green-600 font-medium mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> 优势
                  </p>
                  <ul className="space-y-1 text-slate-600">
                    {competitor.strengths.slice(0, 2).map((s, j) => (
                      <li key={j} className="flex items-start gap-1">
                        <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-red-600 font-medium mb-1 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> 劣势
                  </p>
                  <ul className="space-y-1 text-slate-600">
                    {competitor.weaknesses.slice(0, 2).map((w, j) => (
                      <li key={j} className="flex items-start gap-1">
                        <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* GRT 优势 */}
        <div>
          <p className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-1">
            <Shield className="w-4 h-4" /> GRT 核心竞争优势
          </p>
          <div className="flex flex-wrap gap-1">
            {analysis.ourAdvantages.slice(0, 4).map((adv, i) => (
              <Badge key={i} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                {adv}
              </Badge>
            ))}
          </div>
        </div>

        {/* 制胜策略 */}
        {analysis.winStrategy && (
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <p className="text-xs font-medium text-blue-800 mb-1">制胜策略</p>
            <p className="text-sm text-blue-700">{analysis.winStrategy}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 预算预估卡片 ────────────────────────────────────────────

function BudgetEstimateCard({ budget }: { budget: ProposalData['budgetEstimate'] }) {
  if (!budget) return null;

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency === 'CNY' ? 'CNY' : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            预算预估
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            置信度 {budget.confidence}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 成本明细 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
            <span className="text-sm text-slate-600">设备成本</span>
            <span className="font-medium text-slate-800">
              {formatCurrency(budget.equipmentCost.min, budget.equipmentCost.currency)} -
              {formatCurrency(budget.equipmentCost.max, budget.equipmentCost.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
            <span className="text-sm text-slate-600">安装调试</span>
            <span className="font-medium text-slate-800">
              {formatCurrency(budget.installationCost.min, budget.installationCost.currency)} -
              {formatCurrency(budget.installationCost.max, budget.installationCost.currency)}
            </span>
          </div>
        </div>

        <Separator />

        {/* 总预算 */}
        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">项目总预算</span>
            <span className="text-lg font-bold text-green-700">
              {formatCurrency(budget.totalProjectCost.min, budget.totalProjectCost.currency)} -
              {formatCurrency(budget.totalProjectCost.max, budget.totalProjectCost.currency)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-600">
            <BarChart3 className="w-3 h-3" />
            预计投资回收期: <span className="font-semibold">{budget.paybackPeriodMonths}个月</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 加载状态 Skeleton ────────────────────────────────────────────

function ProposalSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* 左侧 */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 右侧 */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
            <Skeleton className="h-16 w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── 主组件 ────────────────────────────────────────────

interface SolutionProposalUIProps {
  requirementId: number;
  onPushToM3?: (proposalId: number) => void;
}

export function SolutionProposalUI({ requirementId, onPushToM3 }: SolutionProposalUIProps) {
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  // 导出选项状态
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'download' | 'print'>('download');
  const [exportOptions, setExportOptions] = useState({
    includeBenchmarkProjects: false,
    includeCompetitorAnalysis: false,
    includeBudgetEstimate: false,
  });

  // 生成方案 Mutation
  const generateMutation = trpc.solutionEngine.generateProposal.useMutation({
    onSuccess: (data) => {
      setMutationError(null);
      setActiveTaskId(data.taskId);
    },
    onError: (err) => {
      setMutationError(err.message || '方案生成请求失败');
    },
  });

  // 轮询任务状态 (Zero Blocking)
  const { data: taskStatus } = trpc.solutionEngine.getProposalStatus.useQuery(
    { taskId: activeTaskId! },
    {
      enabled: !!activeTaskId,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data?.status === 'completed' || data?.status === 'failed') {
          return false;
        }
        return 2000;
      },
      throwOnError: false,
      retry: 3,
    }
  );

  // 确认并推入 M3
  const pushToM3Mutation = trpc.solutionEngine.approveAndPushToM3.useMutation({
    onSuccess: () => {
      if (taskStatus?.proposal?.id && onPushToM3) {
        onPushToM3(taskStatus.proposal.id);
      }
      utils.solutionEngine.getProposalStatus.invalidate();
    },
  });

  // 开始生成
  const handleGenerate = () => {
    generateMutation.mutate({
      requirementId,
      includeCompetitorAnalysis: true,
      includeBudgetEstimate: true,
    });
  };

  // 推入 M3
  const handlePushToM3 = () => {
    if (taskStatus?.proposal?.id) {
      pushToM3Mutation.mutate({ proposalId: taskStatus.proposal.id });
    }
  };

  // 重新生成
  const handleRegenerate = () => {
    setActiveTaskId(null);
    setMutationError(null);
    generateMutation.reset();
  };

  // 导出方案
  const exportMutation = trpc.solutionEngine.exportProposal.useMutation();

  // 打开导出选项对话框
  const openExportDialog = (mode: 'download' | 'print') => {
    setExportMode(mode);
    setExportDialogOpen(true);
  };

  // 执行导出
  const handleExportConfirm = () => {
    if (!taskStatus?.proposal?.id) return;

    exportMutation.mutate({
      proposalId: taskStatus.proposal.id,
      format: 'html',
      includeBenchmarkProjects: exportOptions.includeBenchmarkProjects,
      includeCompetitorAnalysis: exportOptions.includeCompetitorAnalysis,
      includeBudgetEstimate: exportOptions.includeBudgetEstimate,
    }, {
      onSuccess: (data) => {
        setExportDialogOpen(false);

        if (exportMode === 'print') {
          // 打印模式：在新窗口打开并打印
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(data.content);
            printWindow.document.close();
            printWindow.onload = () => {
              printWindow.print();
            };
          }
        } else {
          // 下载模式：下载 HTML 文件
          const blob = new Blob([data.content], { type: data.mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      },
    });
  };

  const proposal = taskStatus?.proposal as ProposalData | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-0">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">AI 工艺方案推演引擎</h2>
                <p className="text-white/80 text-sm">
                  基于历史项目智能匹配 · 竞品分析 · 预算预估
                </p>
              </div>
            </div>
            {!activeTaskId && (
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="bg-white text-indigo-600 hover:bg-white/90"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    启动中...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    生成 AI 方案
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mutation 错误状态 */}
      {mutationError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">请求失败</h3>
                <p className="text-sm text-red-600">{mutationError}</p>
              </div>
              <Button
                onClick={() => { setMutationError(null); handleGenerate(); }}
                variant="outline"
                className="text-red-600 border-red-300"
              >
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 生成中状态 */}
      {activeTaskId && taskStatus?.status !== 'completed' && taskStatus?.status !== 'failed' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-800">AI 正在生成工艺方案...</h3>
                <p className="text-sm text-blue-600 mt-1">
                  正在检索历史项目、分析竞品、计算预算
                </p>
              </div>
              <div className="w-64">
                <Progress value={33} className="h-2" />
              </div>
              <p className="text-xs text-blue-500">
                Task ID: {activeTaskId} · 状态: {taskStatus?.status || '轮询中...'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 生成中骨架屏 */}
      {activeTaskId && taskStatus?.status !== 'completed' && taskStatus?.status !== 'failed' && (
        <ProposalSkeleton />
      )}

      {/* 失败状态 */}
      {taskStatus?.status === 'failed' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">方案生成失败</h3>
                <p className="text-sm text-red-600 mt-1">{taskStatus.errorMessage}</p>
              </div>
              <Button onClick={handleRegenerate} variant="outline" className="text-red-600 border-red-300">
                重新生成
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 方案展示 */}
      {taskStatus?.status === 'completed' && proposal && (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* 左侧: 工艺流程 + 对标项目 */}
            <div className="space-y-6">
              <ProcessFlowCard processFlow={proposal.processFlow} editable={true} />
              <BenchmarkProjectsCard projects={proposal.benchmarkProjects} />
            </div>

            {/* 右侧: 竞品分析 + 预算 */}
            <div className="space-y-6">
              <CompetitorAnalysisCard analysis={proposal.competitorAnalysis} />
              <BudgetEstimateCard budget={proposal.budgetEstimate} />
            </div>
          </div>

          {/* 操作按钮 */}
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-800">方案已生成</h3>
                    <p className="text-sm text-green-600">请审核后确认推入 M3 阶段</p>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Button variant="outline" onClick={handleRegenerate}>
                    重新生成
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openExportDialog('download')}
                    disabled={exportMutation.isPending}
                    className="gap-1"
                  >
                    <FileDown className="w-4 h-4" />
                    导出 HTML
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openExportDialog('print')}
                    disabled={exportMutation.isPending}
                    className="gap-1"
                  >
                    <Printer className="w-4 h-4" />
                    打印 PDF
                  </Button>
                  <Button
                    onClick={handlePushToM3}
                    disabled={pushToM3Mutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {pushToM3Mutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2" />
                    )}
                    确认方案并推入 M3
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 导出选项对话框 */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {exportMode === 'print' ? <Printer className="w-5 h-5" /> : <FileDown className="w-5 h-5" />}
              {exportMode === 'print' ? '打印方案' : '导出方案'}
            </DialogTitle>
            <DialogDescription>
              选择需要包含的内容（默认仅导出核心工艺方案）
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="opt-benchmark"
                checked={exportOptions.includeBenchmarkProjects}
                onCheckedChange={(checked) =>
                  setExportOptions(prev => ({ ...prev, includeBenchmarkProjects: !!checked }))
                }
              />
              <label htmlFor="opt-benchmark" className="text-sm cursor-pointer">
                <span className="font-medium">历史对标项目</span>
                <span className="text-slate-500 ml-2">（相似项目参考）</span>
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="opt-competitor"
                checked={exportOptions.includeCompetitorAnalysis}
                onCheckedChange={(checked) =>
                  setExportOptions(prev => ({ ...prev, includeCompetitorAnalysis: !!checked }))
                }
              />
              <label htmlFor="opt-competitor" className="text-sm cursor-pointer">
                <span className="font-medium">竞品分析</span>
                <span className="text-slate-500 ml-2">（SWOT 分析）</span>
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="opt-budget"
                checked={exportOptions.includeBudgetEstimate}
                onCheckedChange={(checked) =>
                  setExportOptions(prev => ({ ...prev, includeBudgetEstimate: !!checked }))
                }
              />
              <label htmlFor="opt-budget" className="text-sm cursor-pointer">
                <span className="font-medium">预算预估</span>
                <span className="text-slate-500 ml-2">（仅供内部参考）</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleExportConfirm}
              disabled={exportMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {exportMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : exportMode === 'print' ? (
                <Printer className="w-4 h-4 mr-2" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              {exportMode === 'print' ? '打印' : '导出'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SolutionProposalUI;
