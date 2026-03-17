/**
 * AI建议面板组件
 * 在业务流程中显示AI智能建议，支持三种建议模式
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc";
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  Play,
  CheckCircle2,
  Clock,
  Lightbulb,
  ArrowRight,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// 建议模式类型
export type SuggestionMode = "full_process" | "current_step" | "single_action";

// 组件属性
export interface AISuggestionPanelProps {
  processType: string;      // 流程类型，如 "project", "quotation", "interview"
  processId: string;        // 流程ID
  stepCode?: string;        // 当前步骤代码
  defaultMode?: SuggestionMode;
  onApply?: (suggestionId: number, content: string) => void;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

// 建议数据类型
interface Suggestion {
  id: number;
  stepCode: string;
  stepName: string;
  suggestionContent: string;
  priority: number;
  confidence: number;
  suggestionMode: SuggestionMode;
  status: string;
  createdAt: string;
}

// 模式配置
const modeConfig = {
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

// 优先级配色
const priorityColors: Record<number, string> = {
  1: "bg-red-100 text-red-700 border-red-200",
  2: "bg-orange-100 text-orange-700 border-orange-200",
  3: "bg-yellow-100 text-yellow-700 border-yellow-200",
  4: "bg-blue-100 text-blue-700 border-blue-200",
  5: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function AISuggestionPanel({
  processType,
  processId,
  stepCode,
  defaultMode = "current_step",
  onApply,
  className,
  collapsible = true,
  defaultExpanded = true,
}: AISuggestionPanelProps) {
  const [mode, setMode] = useState<SuggestionMode>(defaultMode);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // 获取建议数据
  const suggestionsQuery = (trpc.aiSuggestion.getSuggestions as any).useQuery(
    { processType, processId, stepCode, mode },
    { enabled: !!processType && !!processId }
  );

  // 应用建议
  const applySuggestion = trpc.aiSuggestion.applySuggestion.useMutation({
    onSuccess: (data) => {
      toast.success("建议已应用");
      suggestionsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`应用失败: ${error.message}`);
    },
  });

  // 记录反馈
  const recordFeedback = trpc.aiSuggestion.recordFeedback.useMutation({
    onSuccess: () => {
      toast.success("感谢您的反馈");
    },
  });

  // 复制建议内容
  const handleCopy = async (id: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  };

  // 应用建议
  const handleApply = (suggestion: Suggestion) => {
    applySuggestion.mutate(suggestion.id);
    onApply?.(suggestion.id, suggestion.suggestionContent);
  };

  // 反馈
  const handleFeedback = (suggestionId: number, isPositive: boolean) => {
    recordFeedback.mutate({ suggestionId, isPositive });
  };

  const suggestions = suggestionsQuery.data || [];
  const isLoading = suggestionsQuery.isLoading;

  // 面板内容
  const panelContent = (
    <div className="space-y-4">
      {/* 模式切换 */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as SuggestionMode)}>
        <TabsList className="grid grid-cols-3 bg-blue-100/50">
          {Object.entries(modeConfig).map(([key, config]) => (
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

        {/* 模式说明 */}
        <p className="text-xs text-blue-600/70 mt-2">
          {modeConfig[mode].description}
        </p>
      </Tabs>

      {/* 建议列表 */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-blue-600">正在获取AI建议...</span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-6 text-blue-600/60">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无AI建议</p>
            <p className="text-xs mt-1">AI正在学习中，稍后再试</p>
          </div>
        ) : (
          suggestions.map((suggestion: any) => (
            <Card
              key={suggestion.id}
              className={cn(
                "bg-white/80 border-blue-200/50 shadow-sm",
                suggestion.status === "applied" && "opacity-60"
              )}
            >
              <CardHeader className="py-3 px-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        priorityColors[suggestion.priority] || priorityColors[5]
                      )}
                    >
                      P{suggestion.priority}
                    </Badge>
                    <CardTitle className="text-sm font-medium">
                      {suggestion.stepName || suggestion.stepCode}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {suggestion.confidence && (
                      <Badge variant="secondary" className="text-xs">
                        置信度 {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                    )}
                    {suggestion.status === "applied" && (
                      <Badge variant="default" className="text-xs bg-green-500">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        已应用
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {suggestion.suggestionContent}
                </p>

                {/* 操作按钮 */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-100">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs hover:bg-blue-100"
                      onClick={() => handleFeedback(suggestion.id, true)}
                    >
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      有帮助
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs hover:bg-blue-100"
                      onClick={() => handleFeedback(suggestion.id, false)}
                    >
                      <ThumbsDown className="w-3 h-3 mr-1" />
                      需改进
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs hover:bg-blue-100"
                      onClick={() => handleCopy(suggestion.id, suggestion.suggestionContent)}
                    >
                      {copiedId === suggestion.id ? (
                        <Check className="w-3 h-3 mr-1 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3 mr-1" />
                      )}
                      复制
                    </Button>
                    {suggestion.status !== "applied" && (
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs bg-blue-500 hover:bg-blue-600"
                        onClick={() => handleApply(suggestion)}
                        disabled={applySuggestion.isPending}
                      >
                        {applySuggestion.isPending ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 mr-1" />
                        )}
                        应用建议
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
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
                      {suggestions.length > 0
                        ? `${suggestions.length} 条建议可用`
                        : "点击展开查看AI建议"}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {suggestions.length > 0 && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {suggestions.filter((s: any) => s.status !== "applied").length} 待处理
                    </Badge>
                  )}
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
            <CardContent className="pt-0 px-4 pb-4">{panelContent}</CardContent>
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
              {modeConfig[mode].description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4">{panelContent}</CardContent>
    </Card>
  );
}

// 导出简化版组件用于快速集成
export function AISuggestionBadge({
  processType,
  processId,
  onClick,
}: {
  processType: string;
  processId: string;
  onClick?: () => void;
}) {
  const suggestionsQuery = (trpc.aiSuggestion.getSuggestions as any).useQuery(
    { processType, processId, mode: "current_step" },
    { enabled: !!processType && !!processId }
  );

  const count = suggestionsQuery.data?.filter((s: any) => s.status !== "applied").length || 0;

  if (count === 0) return null;

  return (
    <Badge
      variant="secondary"
      className="bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200 transition-colors"
      onClick={onClick}
    >
      <Sparkles className="w-3 h-3 mr-1" />
      {count} AI建议
    </Badge>
  );
}
