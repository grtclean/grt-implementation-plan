import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  AlertCircle, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronRight,
  Clock, FileText, GitBranch, History, Loader2, MessageSquare, 
  MoreHorizontal, RefreshCw, Shield, User, Users, X, XCircle, Zap
} from "lucide-react";
import { useState } from "react";

// ============================================================================
// 类型定义
// ============================================================================

type ApprovalStatus = "pending" | "approved" | "rejected" | "skipped" | "in_progress";
type ApprovalType = "gate_review" | "quality_check" | "manager_approval" | "customer_sign_off";

interface ApprovalStep {
  id: number;
  name: string;
  type: ApprovalType;
  status: ApprovalStatus;
  approver: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  requiredRole: string;
  plannedDate: Date;
  actualDate?: Date;
  comment?: string;
  attachments?: string[];
  duration?: number; // 审批耗时（分钟）
}

interface ApprovalFlow {
  id: number;
  projectId: number;
  projectName: string;
  stageCode: string;
  stageName: string;
  status: ApprovalStatus;
  steps: ApprovalStep[];
  createdAt: Date;
  updatedAt: Date;
  currentStepIndex: number;
}

interface ApprovalHistory {
  id: number;
  flowId: number;
  stepId: number;
  action: "approve" | "reject" | "comment" | "reassign";
  actor: string;
  actorRole: string;
  comment?: string;
  timestamp: Date;
}

// ============================================================================
// 常量配置
// ============================================================================

const statusLabels: Record<ApprovalStatus, string> = {
  pending: "待审批",
  approved: "已通过",
  rejected: "已拒绝",
  skipped: "已跳过",
  in_progress: "审批中",
};

const statusColors: Record<ApprovalStatus, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  rejected: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  skipped: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

const statusIcons: Record<ApprovalStatus, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  approved: <CheckCircle2 className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
  skipped: <MoreHorizontal className="w-4 h-4" />,
  in_progress: <Loader2 className="w-4 h-4 animate-spin" />,
};

const typeLabels: Record<ApprovalType, string> = {
  gate_review: "Gate评审",
  quality_check: "质量检查",
  manager_approval: "主管审批",
  customer_sign_off: "客户签收",
};

const typeIcons: Record<ApprovalType, React.ReactNode> = {
  gate_review: <Shield className="w-4 h-4" />,
  quality_check: <Check className="w-4 h-4" />,
  manager_approval: <User className="w-4 h-4" />,
  customer_sign_off: <FileText className="w-4 h-4" />,
};

// ============================================================================
// Props 接口
// ============================================================================

interface ApprovalFlowVisualizationProps {
  projectId: number;
  stageCode: string;
  stageName: string;
  onApprove?: (stepId: number, comment: string) => void;
  onReject?: (stepId: number, comment: string) => void;
  currentUserRole?: string;
  className?: string;
}

// ============================================================================
// 主组件
// ============================================================================

export default function ApprovalFlowVisualization({
  projectId,
  stageCode,
  stageName,
  onApprove,
  onReject,
  currentUserRole = "PRODUCTION_MANAGER",
  className = "",
}: ApprovalFlowVisualizationProps) {
  const [selectedStep, setSelectedStep] = useState<ApprovalStep | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [expandedView, setExpandedView] = useState(false);

  // 模拟审批流程数据
  const [approvalFlow] = useState<ApprovalFlow>({
    id: 1,
    projectId,
    projectName: "PRJ-2024-001",
    stageCode,
    stageName,
    status: "in_progress",
    currentStepIndex: 2,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date(),
    steps: [
      {
        id: 1,
        name: "设计评审",
        type: "gate_review",
        status: "approved",
        approver: { id: "U001", name: "张工程师", role: "DESIGN_ENGINEER" },
        requiredRole: "DESIGN_ENGINEER",
        plannedDate: new Date("2024-01-16"),
        actualDate: new Date("2024-01-16"),
        comment: "设计方案符合要求，通过评审",
        duration: 45,
      },
      {
        id: 2,
        name: "质量预检",
        type: "quality_check",
        status: "approved",
        approver: { id: "U002", name: "李质检", role: "QUALITY_INSPECTOR" },
        requiredRole: "QUALITY_INSPECTOR",
        plannedDate: new Date("2024-01-17"),
        actualDate: new Date("2024-01-17"),
        comment: "质量检查通过，无异常",
        duration: 30,
      },
      {
        id: 3,
        name: "生产主管审批",
        type: "manager_approval",
        status: "in_progress",
        approver: { id: "U003", name: "王主管", role: "PRODUCTION_MANAGER" },
        requiredRole: "PRODUCTION_MANAGER",
        plannedDate: new Date("2024-01-18"),
        comment: "",
      },
      {
        id: 4,
        name: "最终Gate评审",
        type: "gate_review",
        status: "pending",
        approver: { id: "U004", name: "赵总监", role: "PROJECT_DIRECTOR" },
        requiredRole: "PROJECT_DIRECTOR",
        plannedDate: new Date("2024-01-19"),
      },
      {
        id: 5,
        name: "客户确认签收",
        type: "customer_sign_off",
        status: "pending",
        approver: { id: "C001", name: "客户代表", role: "CUSTOMER" },
        requiredRole: "CUSTOMER",
        plannedDate: new Date("2024-01-20"),
      },
    ],
  });

  // 模拟审批历史
  const [approvalHistory] = useState<ApprovalHistory[]>([
    {
      id: 1,
      flowId: 1,
      stepId: 1,
      action: "approve",
      actor: "张工程师",
      actorRole: "DESIGN_ENGINEER",
      comment: "设计方案符合要求，通过评审",
      timestamp: new Date("2024-01-16T10:30:00"),
    },
    {
      id: 2,
      flowId: 1,
      stepId: 2,
      action: "comment",
      actor: "李质检",
      actorRole: "QUALITY_INSPECTOR",
      comment: "需要补充尺寸检测报告",
      timestamp: new Date("2024-01-17T09:15:00"),
    },
    {
      id: 3,
      flowId: 1,
      stepId: 2,
      action: "approve",
      actor: "李质检",
      actorRole: "QUALITY_INSPECTOR",
      comment: "质量检查通过，无异常",
      timestamp: new Date("2024-01-17T14:20:00"),
    },
  ]);

  // 计算进度
  const completedSteps = approvalFlow.steps.filter(s => s.status === "approved" || s.status === "skipped").length;
  const totalSteps = approvalFlow.steps.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  // 检查当前用户是否可以审批
  const canApprove = (step: ApprovalStep) => {
    return step.status === "in_progress" && step.requiredRole === currentUserRole;
  };

  // 格式化时间
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 格式化耗时
  const formatDuration = (minutes?: number) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  return (
    <Card className={`bg-[#0B1120]/80 border-border ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <GitBranch className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                审批流程
                <Badge variant="outline" className={statusColors[approvalFlow.status]}>
                  {statusIcons[approvalFlow.status]}
                  <span className="ml-1">{statusLabels[approvalFlow.status]}</span>
                </Badge>
              </CardTitle>
              <CardDescription>
                {stageName} · {completedSteps}/{totalSteps} 步骤完成
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setExpandedView(!expandedView)}
            >
              {expandedView ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {expandedView ? "收起" : "展开"}
            </Button>
            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <History className="w-4 h-4" />
                  历史
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>审批历史记录</DialogTitle>
                  <DialogDescription>
                    查看 {stageName} 阶段的所有审批操作记录
                  </DialogDescription>
                </DialogHeader>
                <ApprovalHistoryList history={approvalHistory} formatDate={formatDate} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>审批进度</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* 流程图可视化 */}
        <div className="relative">
          {/* 水平流程线 */}
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-border" />
          
          {/* 已完成的流程线 */}
          <div 
            className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-primary transition-all duration-500"
            style={{ width: `${(approvalFlow.currentStepIndex / (totalSteps - 1)) * 100}%` }}
          />

          {/* 步骤节点 */}
          <div className="relative flex justify-between">
            {approvalFlow.steps.map((step, index) => (
              <TooltipProvider key={step.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={`
                        relative flex flex-col items-center gap-2 p-2 rounded-lg transition-all
                        ${selectedStep?.id === step.id ? "bg-primary/10" : "hover:bg-muted/50"}
                        ${canApprove(step) ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
                      `}
                      onClick={() => {
                        setSelectedStep(step);
                        setIsDetailOpen(true);
                      }}
                    >
                      {/* 节点圆圈 */}
                      <div className={`
                        relative z-10 w-12 h-12 rounded-full flex items-center justify-center
                        border-2 transition-all
                        ${step.status === "approved" ? "bg-emerald-500 border-emerald-500 text-white" : ""}
                        ${step.status === "rejected" ? "bg-rose-500 border-rose-500 text-white" : ""}
                        ${step.status === "in_progress" ? "bg-primary border-primary text-white animate-pulse" : ""}
                        ${step.status === "pending" ? "bg-background border-border text-muted-foreground" : ""}
                        ${step.status === "skipped" ? "bg-muted border-muted-foreground text-muted-foreground" : ""}
                      `}>
                        {step.status === "approved" && <Check className="w-5 h-5" />}
                        {step.status === "rejected" && <X className="w-5 h-5" />}
                        {step.status === "in_progress" && <Loader2 className="w-5 h-5 animate-spin" />}
                        {step.status === "pending" && <span className="text-sm font-bold">{index + 1}</span>}
                        {step.status === "skipped" && <MoreHorizontal className="w-5 h-5" />}
                      </div>

                      {/* 步骤信息 */}
                      <div className="text-center min-w-[80px]">
                        <p className={`text-xs font-medium ${
                          step.status === "in_progress" ? "text-primary" : 
                          step.status === "approved" ? "text-emerald-500" :
                          step.status === "rejected" ? "text-rose-500" :
                          "text-muted-foreground"
                        }`}>
                          {step.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {step.approver.name}
                        </p>
                      </div>

                      {/* 可审批指示器 */}
                      {canApprove(step) && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <Zap className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">{step.name}</p>
                      <p className="text-xs text-muted-foreground">
                        类型: {typeLabels[step.type]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        审批人: {step.approver.name} ({step.approver.role})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        计划时间: {formatDate(step.plannedDate)}
                      </p>
                      {step.actualDate && (
                        <p className="text-xs text-muted-foreground">
                          实际时间: {formatDate(step.actualDate)}
                        </p>
                      )}
                      {step.comment && (
                        <p className="text-xs mt-2 pt-2 border-t">
                          "{step.comment}"
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* 展开的详细视图 */}
        {expandedView && (
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              审批步骤详情
            </h4>
            <div className="space-y-3">
              {approvalFlow.steps.map((step, index) => (
                <div 
                  key={step.id}
                  className={`
                    p-3 rounded-lg border transition-all
                    ${step.status === "in_progress" ? "border-primary bg-primary/5" : "border-border bg-muted/30"}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${step.status === "approved" ? "bg-emerald-500 text-white" : ""}
                        ${step.status === "rejected" ? "bg-rose-500 text-white" : ""}
                        ${step.status === "in_progress" ? "bg-primary text-white" : ""}
                        ${step.status === "pending" ? "bg-muted text-muted-foreground" : ""}
                        ${step.status === "skipped" ? "bg-muted text-muted-foreground" : ""}
                      `}>
                        {step.status === "approved" ? <Check className="w-4 h-4" /> : index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{step.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeLabels[step.type]} · {step.approver.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={statusColors[step.status]}>
                        {statusLabels[step.status]}
                      </Badge>
                      {step.duration && (
                        <span className="text-xs text-muted-foreground">
                          耗时: {formatDuration(step.duration)}
                        </span>
                      )}
                      {canApprove(step) && (
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-7 text-rose-500 hover:text-rose-600"
                            onClick={() => onReject?.(step.id, "")}
                          >
                            <X className="w-3 h-3 mr-1" />
                            拒绝
                          </Button>
                          <Button 
                            size="sm"
                            className="h-7"
                            onClick={() => onApprove?.(step.id, "")}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            通过
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {step.comment && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground flex items-start gap-1">
                        <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {step.comment}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 步骤详情对话框 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedStep && typeIcons[selectedStep.type]}
                {selectedStep?.name}
              </DialogTitle>
              <DialogDescription>
                查看审批步骤详细信息
              </DialogDescription>
            </DialogHeader>
            {selectedStep && (
              <StepDetailView 
                step={selectedStep} 
                canApprove={canApprove(selectedStep)}
                onApprove={onApprove}
                onReject={onReject}
                formatDate={formatDate}
                formatDuration={formatDuration}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 步骤详情视图组件
// ============================================================================

interface StepDetailViewProps {
  step: ApprovalStep;
  canApprove: boolean;
  onApprove?: (stepId: number, comment: string) => void;
  onReject?: (stepId: number, comment: string) => void;
  formatDate: (date: Date) => string;
  formatDuration: (minutes?: number) => string;
}

function StepDetailView({ 
  step, 
  canApprove, 
  onApprove, 
  onReject,
  formatDate,
  formatDuration 
}: StepDetailViewProps) {
  const [comment, setComment] = useState("");

  return (
    <div className="space-y-4">
      {/* 状态徽章 */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={statusColors[step.status]}>
          {statusIcons[step.status]}
          <span className="ml-1">{statusLabels[step.status]}</span>
        </Badge>
        <Badge variant="outline">
          {typeIcons[step.type]}
          <span className="ml-1">{typeLabels[step.type]}</span>
        </Badge>
      </div>

      {/* 详细信息 */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">审批人</p>
          <p className="font-medium flex items-center gap-1">
            <User className="w-4 h-4" />
            {step.approver.name}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">所需角色</p>
          <p className="font-medium">{step.requiredRole}</p>
        </div>
        <div>
          <p className="text-muted-foreground">计划时间</p>
          <p className="font-medium">{formatDate(step.plannedDate)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">实际时间</p>
          <p className="font-medium">{step.actualDate ? formatDate(step.actualDate) : "-"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">审批耗时</p>
          <p className="font-medium">{formatDuration(step.duration)}</p>
        </div>
      </div>

      {/* 审批意见 */}
      {step.comment && (
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs text-muted-foreground mb-1">审批意见</p>
          <p className="text-sm">{step.comment}</p>
        </div>
      )}

      {/* 审批操作 */}
      {canApprove && (
        <div className="space-y-3 pt-3 border-t">
          <div>
            <label className="text-sm text-muted-foreground">审批意见</label>
            <textarea
              className="w-full mt-1 p-2 rounded-lg border bg-background text-sm resize-none"
              rows={3}
              placeholder="请输入审批意见..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline"
              className="text-rose-500 hover:text-rose-600"
              onClick={() => onReject?.(step.id, comment)}
            >
              <X className="w-4 h-4 mr-1" />
              拒绝
            </Button>
            <Button onClick={() => onApprove?.(step.id, comment)}>
              <Check className="w-4 h-4 mr-1" />
              通过
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 审批历史列表组件
// ============================================================================

interface ApprovalHistoryListProps {
  history: ApprovalHistory[];
  formatDate: (date: Date) => string;
}

function ApprovalHistoryList({ history, formatDate }: ApprovalHistoryListProps) {
  const actionLabels: Record<string, string> = {
    approve: "通过",
    reject: "拒绝",
    comment: "评论",
    reassign: "转交",
  };

  const actionColors: Record<string, string> = {
    approve: "text-emerald-500",
    reject: "text-rose-500",
    comment: "text-blue-500",
    reassign: "text-amber-500",
  };

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {history.map((item, index) => (
          <div key={item.id} className="relative pl-6">
            {/* 时间线 */}
            {index < history.length - 1 && (
              <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-border" />
            )}
            
            {/* 时间点 */}
            <div className={`
              absolute left-0 top-1 w-[18px] h-[18px] rounded-full border-2 bg-background
              ${actionColors[item.action]} border-current
            `}>
              {item.action === "approve" && <Check className="w-3 h-3 m-auto" />}
              {item.action === "reject" && <X className="w-3 h-3 m-auto" />}
              {item.action === "comment" && <MessageSquare className="w-2.5 h-2.5 m-auto" />}
              {item.action === "reassign" && <RefreshCw className="w-2.5 h-2.5 m-auto" />}
            </div>

            {/* 内容 */}
            <div className="pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{item.actor}</span>
                <Badge variant="outline" className="text-[10px] h-5">
                  {item.actorRole}
                </Badge>
                <span className={`text-xs font-medium ${actionColors[item.action]}`}>
                  {actionLabels[item.action]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                {formatDate(item.timestamp)}
              </p>
              {item.comment && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg mt-2">
                  "{item.comment}"
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
