/**
 * AI建议面板组件（带执行模式选择）
 * 支持系统内AI（轻度）和泛互式AI（广泛）两种执行模式
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  Play,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Zap,
  Globe,
  Database,
  Brain,
  RotateCcw,
  AlertTriangle,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";

// 建议模式类型
export type SuggestionMode = "full_process" | "current_step" | "single_action";

// AI执行模式类型（v2.6.0扩展：增加shadow影子模式）
export type AIExecutionMode = "internal" | "generative" | "shadow";

// 组件属性
export interface AISuggestionPanelWithModeProps {
  processType: string;      // 流程类型
  processId: string;        // 流程ID
  stepCode?: string;        // 当前步骤代码
  assistantType: string;    // AI助手类型
  defaultMode?: SuggestionMode;
  defaultExecutionMode?: AIExecutionMode;
  onApply?: (content: string) => void;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

// 模式配置
const suggestionModeConfig = {
  full_process: {
    label: "全过程建议",
    description: "显示后续所有流程的AI智能助手建议",
    icon: ArrowRight,
  },
  current_step: {
    label: "本过程建议",
    description: "当前流程步骤的AI工作内容建议",
    icon: Lightbulb,
  },
  single_action: {
    label: "单步执行",
    description: "执行到某一步的AI智能助手工作",
    icon: Play,
  },
};

// AI执行模式配置（v2.6.0扩展：增加shadow影子模式）
const executionModeConfig = {
  internal: {
    label: "系统内AI",
    description: "基于现有案例库和AI化成果，快速响应，结果可预测",
    icon: Database,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  generative: {
    label: "泛互式AI",
    description: "泛化式广泛分析，深度推理，适合复杂场景",
    icon: Globe,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  shadow: {
    label: "影子模式",
    description: "后台比对人工操作与AI预测偏差，不干预实际执行",
    icon: Shield,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
};

export default function AISuggestionPanelWithMode({
  processType,
  processId,
  stepCode,
  assistantType,
  defaultMode = "current_step",
  defaultExecutionMode = "internal",
  onApply,
  className,
  collapsible = true,
  defaultExpanded = true,
}: AISuggestionPanelWithModeProps) {
  const [suggestionMode, setSuggestionMode] = useState<SuggestionMode>(defaultMode);
  const [executionMode, setExecutionMode] = useState<AIExecutionMode>(defaultExecutionMode);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [userInput, setUserInput] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copiedContent, setCopiedContent] = useState(false);
  const [appliedHistory, setAppliedHistory] = useState<Array<{
    content: string;
    timestamp: Date;
    mode: AIExecutionMode;
  }>>([]);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);

  // 获取执行模式配置
  const modeConfigQuery = trpc.aiExecutionMode.getModeConfig.useQuery(
    { assistantType },
    { enabled: !!assistantType }
  );

  // 执行AI请求
  const executeAI = trpc.aiExecutionMode.execute.useMutation({
    onSuccess: (data) => {
      setAiResponse(data.content);
      setSessionId(data.sessionId);
      toast.success(`AI建议已生成 (${executionModeConfig[data.mode].label})`);
    },
    onError: (error) => {
      toast.error(`生成失败: ${error.message}`);
    },
  });

  // 记录采纳反馈
  const recordAdoption = trpc.aiExecutionMode.recordAdoption.useMutation({
    onSuccess: () => {
      toast.success("感谢您的反馈");
    },
  });

  // 执行AI建议
  const handleExecute = () => {
    if (!userInput.trim()) {
      toast.error("请输入您的需求或问题");
      return;
    }

    const contextInfo = `
流程类型: ${processType}
流程ID: ${processId}
当前步骤: ${stepCode || "未指定"}
建议模式: ${suggestionModeConfig[suggestionMode].label}
`;

    executeAI.mutate({
      assistantType,
      mode: executionMode,
      content: `${contextInfo}\n\n用户需求:\n${userInput}`,
      context: { processType, processId, stepCode, suggestionMode },
    });
  };

  // 复制内容
  const handleCopy = async () => {
    if (!aiResponse) return;
    try {
      await navigator.clipboard.writeText(aiResponse);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  };

  // 应用建议
  const handleApply = () => {
    if (!aiResponse) return;
    // 保存到应用历史（用于回滚）
    setAppliedHistory(prev => [...prev, {
      content: aiResponse,
      timestamp: new Date(),
      mode: executionMode,
    }]);
    onApply?.(aiResponse);
    if (sessionId) {
      recordAdoption.mutate({ sessionId, isAdopted: true });
    }
    toast.success("建议已应用");
  };

  // 一键回滚功能（v2.6.0新增）
  const handleRollback = () => {
    if (appliedHistory.length === 0) {
      toast.error("没有可回滚的操作");
      return;
    }
    setShowRollbackConfirm(true);
  };

  // 确认回滚
  const confirmRollback = () => {
    const lastApplied = appliedHistory[appliedHistory.length - 1];
    if (!lastApplied) return;
    
    // 移除最后一条应用记录
    setAppliedHistory(prev => prev.slice(0, -1));
    
    // 记录回滚操作
    if (sessionId) {
      recordAdoption.mutate({ 
        sessionId, 
        isAdopted: false,
        feedback: `用户执行回滚操作，撤销了${executionModeConfig[lastApplied.mode].label}建议`,
      });
    }
    
    setShowRollbackConfirm(false);
    toast.success("已回滚到上一状态");
  };

  // 反馈
  const handleFeedback = (isPositive: boolean) => {
    if (!sessionId) return;
    recordAdoption.mutate({
      sessionId,
      isAdopted: isPositive,
      feedback: isPositive ? "用户认为有帮助" : "用户认为需要改进",
    });
  };

  const currentModeConfig = executionModeConfig[executionMode];

  // 面板内容
  const panelContent = (
    <div className="space-y-4">
      {/* 建议模式切换 */}
      <Tabs value={suggestionMode} onValueChange={(v) => setSuggestionMode(v as SuggestionMode)}>
        <TabsList className="grid grid-cols-3 bg-blue-100/50">
          {Object.entries(suggestionModeConfig).map(([key, config]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="text-xs data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <config.icon className="w-3 h-3 mr-1" />
              {config.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <p className="text-xs text-blue-600/70 mt-2">
          {suggestionModeConfig[suggestionMode].description}
        </p>
      </Tabs>

      {/* AI执行模式选择 */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">AI执行模式</span>
        </div>
        <RadioGroup
          value={executionMode}
          onValueChange={(v) => setExecutionMode(v as AIExecutionMode)}
          className="grid grid-cols-3 gap-2"
        >
          {Object.entries(executionModeConfig).map(([key, config]) => (
            <div key={key}>
              <RadioGroupItem
                value={key}
                id={`mode-${key}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`mode-${key}`}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all",
                  "hover:bg-gray-50 peer-data-[state=checked]:border-2",
                  executionMode === key
                    ? `${config.borderColor} ${config.bgColor}`
                    : "border-gray-200 bg-white"
                )}
              >
                <config.icon className={cn("w-5 h-5 mb-1", config.color)} />
                <span className={cn("text-sm font-medium", config.color)}>
                  {config.label}
                </span>
                <span className="text-xs text-gray-500 text-center mt-1">
                  {key === "internal" ? "轻度·快速" : key === "shadow" ? "后台·比对" : "广泛·深度"}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>
        <p className="text-xs text-gray-500 mt-2 text-center">
          {currentModeConfig.description}
        </p>
      </div>

      {/* 输入区域 */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-700">输入您的需求或问题</Label>
        <Textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="请描述您需要AI协助的内容..."
          className="min-h-[80px] resize-none"
        />
        <Button
          onClick={handleExecute}
          disabled={executeAI.isPending || !userInput.trim()}
          className={cn(
            "w-full",
            executionMode === "internal"
              ? "bg-blue-500 hover:bg-blue-600"
              : "bg-purple-500 hover:bg-purple-600"
          )}
        >
          {executeAI.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              AI正在分析...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              获取{currentModeConfig.label}建议
            </>
          )}
        </Button>
      </div>

      {/* AI响应区域 */}
      {aiResponse && (
        <Card className={cn(
          "border-l-4",
          executionMode === "internal"
            ? "border-l-blue-400 bg-blue-50/50"
            : "border-l-purple-400 bg-purple-50/50"
        )}>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <currentModeConfig.icon className={cn("w-4 h-4", currentModeConfig.color)} />
                <CardTitle className="text-sm font-medium">
                  {currentModeConfig.label}建议
                </CardTitle>
              </div>
              <Badge
                variant="outline"
                className={cn("text-xs", currentModeConfig.color, currentModeConfig.borderColor)}
              >
                {executionMode === "internal" ? "案例驱动" : "深度分析"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="prose prose-sm max-w-none text-gray-700">
              <Streamdown>{aiResponse}</Streamdown>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs hover:bg-gray-100"
                  onClick={() => handleFeedback(true)}
                >
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  有帮助
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs hover:bg-gray-100"
                  onClick={() => handleFeedback(false)}
                >
                  <ThumbsDown className="w-3 h-3 mr-1" />
                  需改进
                </Button>
              </div>
              <div className="flex items-center gap-1">
                {/* 一键回滚按钮（v2.6.0新增） */}
                {appliedHistory.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs hover:bg-red-50 text-red-600"
                    onClick={handleRollback}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    回滚
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs hover:bg-gray-100"
                  onClick={handleCopy}
                >
                  {copiedContent ? (
                    <Check className="w-3 h-3 mr-1 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3 mr-1" />
                  )}
                  复制
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "h-7 px-3 text-xs",
                    executionMode === "internal"
                      ? "bg-blue-500 hover:bg-blue-600"
                      : executionMode === "shadow"
                      ? "bg-amber-500 hover:bg-amber-600"
                      : "bg-purple-500 hover:bg-purple-600"
                  )}
                  onClick={handleApply}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  应用建议
                </Button>
              </div>
            </div>

            {/* 回滚确认对话框 */}
            {showRollbackConfirm && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-700">确认回滚操作</p>
                    <p className="text-xs text-red-600 mt-1">
                      将撤销最近一次应用的AI建议，此操作不可恢复。
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-6 px-2 text-xs"
                        onClick={confirmRollback}
                      >
                        确认回滚
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => setShowRollbackConfirm(false)}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  // 可折叠面板
  if (collapsible) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card
          className={cn(
            "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-l-4 border-l-blue-400 border-blue-200/50",
            className
          )}
        >
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 px-4 cursor-pointer hover:bg-blue-100/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium text-blue-700">
                      AI智能建议
                    </CardTitle>
                    <CardDescription className="text-xs text-blue-600/70">
                      支持系统内AI和泛互式AI两种模式
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      currentModeConfig.color,
                      currentModeConfig.borderColor
                    )}
                  >
                    {currentModeConfig.label}
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-blue-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-blue-500" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-4">
              {panelContent}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  // 非折叠面板
  return (
    <Card
      className={cn(
        "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-l-4 border-l-blue-400 border-blue-200/50",
        className
      )}
    >
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10">
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium text-blue-700">
              AI智能建议
            </CardTitle>
            <CardDescription className="text-xs text-blue-600/70">
              支持系统内AI和泛互式AI两种模式
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4">
        {panelContent}
      </CardContent>
    </Card>
  );
}

/**
 * 简化版AI建议徽章组件
 * 用于在表格或列表中快速显示AI建议入口
 */
export function AISuggestionBadgeWithMode({
  assistantType,
  onClick,
  className,
}: {
  assistantType: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "cursor-pointer hover:bg-blue-100 transition-colors",
        "border-blue-200 text-blue-600",
        className
      )}
      onClick={onClick}
    >
      <Sparkles className="w-3 h-3 mr-1" />
      AI建议
    </Badge>
  );
}
