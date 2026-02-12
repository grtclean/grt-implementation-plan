/**
 * AI 流程优化建议中心
 * 提供人员、采购、交付流程的 AI 驱动优化建议
 */

import { useState } from "react";
import Layout from "@/components/Layout";
import FeatureGuide from "@/components/FeatureGuide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Truck,
  Bot,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  BarChart3,
  Target,
  FileText,
  Settings,
  Zap,
  Lightbulb,
  ThumbsUp,
  Eye,
  Play,
  PauseCircle,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// 类型定义
// ============================================================================

interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  category: "process" | "efficiency" | "cost" | "quality";
  severity: "high" | "medium" | "low";
  impact: number; // 预期提升百分比
  status: "pending" | "in_progress" | "completed" | "rejected";
  estimatedHours: number;
  suggestedBy: string; // AI 模型名称
  createdAt: string;
  metrics: {
    before: number;
    after: number;
    unit: string;
  };
}

// ============================================================================
// 模拟数据
// ============================================================================

const hrOptimizationSuggestions: OptimizationSuggestion[] = [
  {
    id: "hr-001",
    title: "优化招聘流程 - 减少面试轮次",
    description: "基于历史数据分析，当前招聘流程平均需要5轮面试。建议将面试轮次优化为3轮，预期可缩短招聘周期40%。",
    category: "efficiency",
    severity: "high",
    impact: 40,
    status: "pending",
    estimatedHours: 8,
    suggestedBy: "AI 面试助手",
    createdAt: "2024-02-10",
    metrics: {
      before: 45,
      after: 27,
      unit: "天",
    },
  },
  {
    id: "hr-002",
    title: "入职培训数字化",
    description: "建议将线下入职培训材料数字化，使用在线学习平台。预期可降低培训成本35%，提高培训完成率。",
    category: "cost",
    severity: "medium",
    impact: 35,
    status: "in_progress",
    estimatedHours: 40,
    suggestedBy: "AI 培训顾问",
    createdAt: "2024-02-08",
    metrics: {
      before: 5000,
      after: 3250,
      unit: "元/人",
    },
  },
  {
    id: "hr-003",
    title: "绩效评估周期优化",
    description: "建议将年度绩效评估改为季度评估，提高反馈频率。预期可提升员工满意度25%。",
    category: "quality",
    severity: "low",
    impact: 25,
    status: "pending",
    estimatedHours: 16,
    suggestedBy: "AI 绩效助手",
    createdAt: "2024-02-05",
    metrics: {
      before: 65,
      after: 81,
      unit: "满意度分",
    },
  },
];

const procurementOptimizationSuggestions: OptimizationSuggestion[] = [
  {
    id: "pur-001",
    title: "供应商集中采购",
    description: "分析显示，同类物料分散从8家供应商采购。建议集中采购，预期可降低采购成本15%。",
    category: "cost",
    severity: "high",
    impact: 15,
    status: "pending",
    estimatedHours: 24,
    suggestedBy: "AI 采购助手",
    createdAt: "2024-02-10",
    metrics: {
      before: 100,
      after: 85,
      unit: "成本指数",
    },
  },
  {
    id: "pur-002",
    title: "采购申请审批流程优化",
    description: "建议简化小额采购审批流程，将5000元以下的采购审批层级从3级减少到2级。预期可缩短审批时间50%。",
    category: "efficiency",
    severity: "medium",
    impact: 50,
    status: "completed",
    estimatedHours: 4,
    suggestedBy: "AI 流程分析师",
    createdAt: "2024-02-01",
    metrics: {
      before: 5,
      after: 2.5,
      unit: "工作日",
    },
  },
  {
    id: "pur-003",
    title: "供应商绩效考核体系优化",
    description: "建议增加交付准时率和质量合格率在供应商评分中的权重。预期可提升供应商整体表现20%。",
    category: "quality",
    severity: "medium",
    impact: 20,
    status: "pending",
    estimatedHours: 16,
    suggestedBy: "AI 采购助手",
    createdAt: "2024-02-09",
    metrics: {
      before: 85,
      after: 102,
      unit: "综合评分",
    },
  },
];

const deliveryOptimizationSuggestions: OptimizationSuggestion[] = [
  {
    id: "del-001",
    title: "M7 预验收流程自动化",
    description: "建议引入 AI 自动验证系统，自动检查文档完整性和测试结果。预期可减少人工检查时间60%。",
    category: "efficiency",
    severity: "high",
    impact: 60,
    status: "in_progress",
    estimatedHours: 80,
    suggestedBy: "Gatekeeper Agent",
    createdAt: "2024-02-08",
    metrics: {
      before: 8,
      after: 3.2,
      unit: "小时",
    },
  },
  {
    id: "del-002",
    title: "现场问题预防机制",
    description: "基于历史现场问题数据，建议在发货前增加关键部件的二次检查。预期可减少现场问题发生率45%。",
    category: "quality",
    severity: "high",
    impact: 45,
    status: "pending",
    estimatedHours: 32,
    suggestedBy: "Site Copilot Agent",
    createdAt: "2024-02-10",
    metrics: {
      before: 15,
      after: 8,
      unit: "问题数/项目",
    },
  },
  {
    id: "del-003",
    title: "客户验收标准前置沟通",
    description: "建议在 M7 阶段与客户确认验收标准。预期可减少验收返工率30%。",
    category: "process",
    severity: "medium",
    impact: 30,
    status: "completed",
    estimatedHours: 8,
    suggestedBy: "Risk Radar Agent",
    createdAt: "2024-01-25",
    metrics: {
      before: 25,
      after: 17.5,
      unit: "返工率%",
    },
  },
];

// ============================================================================
// 辅助函数和组件
// ============================================================================

const categoryColors: Record<string, string> = {
  process: "bg-blue-500/20 text-blue-400",
  efficiency: "bg-green-500/20 text-green-400",
  cost: "bg-purple-500/20 text-purple-400",
  quality: "bg-orange-500/20 text-orange-400",
};

const categoryLabels: Record<string, string> = {
  process: "流程优化",
  efficiency: "效率提升",
  cost: "成本优化",
  quality: "质量改进",
};

const severityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-green-500/20 text-green-400",
};

const severityLabels: Record<string, string> = {
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级",
};

const statusColors: Record<string, string> = {
  pending: "bg-slate-500/20 text-slate-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
};

const statusLabels: Record<string, string> = {
  pending: "待处理",
  in_progress: "执行中",
  completed: "已完成",
  rejected: "已拒绝",
};

function SuggestionCard({ suggestion }: { suggestion: OptimizationSuggestion }) {
  const [expanded, setExpanded] = useState(false);

  const handleStart = () => {
    toast.success(`已开始执行: ${suggestion.title}`);
  };

  const handleComplete = () => {
    toast.success(`已标记为完成: ${suggestion.title}`);
  };

  return (
    <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">{suggestion.title}</h3>
              <Badge className={categoryColors[suggestion.category]}>
                {categoryLabels[suggestion.category]}
              </Badge>
              <Badge className={severityColors[suggestion.severity]}>
                {severityLabels[suggestion.severity]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {suggestion.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Bot className="w-3 h-3" />
                <span>{suggestion.suggestedBy}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{suggestion.estimatedHours} 小时</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>预期提升 {suggestion.impact}%</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ArrowRight className="w-4 h-4 rotate-90" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </Button>
        </div>

        {expanded && (
          <div className="border-t pt-4 mt-3 space-y-3">
            {/* 预期效果 */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">预期效果</span>
                <span className="text-green-400 font-medium">
                  +{suggestion.impact}% 提升
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">优化前</span>
                    <span>{suggestion.metrics.before} {suggestion.metrics.unit}</span>
                  </div>
                  <Progress value={suggestion.metrics.before / 2} className="h-1" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">优化后</span>
                    <span className="text-green-400">
                      {suggestion.metrics.after} {suggestion.metrics.unit}
                    </span>
                  </div>
                  <Progress value={suggestion.metrics.after / 2} className="h-1" />
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              {suggestion.status === "pending" && (
                <>
                  <Button size="sm" onClick={handleStart}>
                    <Play className="w-3 h-3 mr-1" />
                    开始执行
                  </Button>
                  <Button size="sm" variant="outline">
                    <Eye className="w-3 h-3 mr-1" />
                    查看详情
                  </Button>
                </>
              )}
              {suggestion.status === "in_progress" && (
                <>
                  <Button size="sm">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    标记完成
                  </Button>
                  <Button size="sm" variant="outline">
                    <PauseCircle className="w-3 h-3 mr-1" />
                    暂停
                  </Button>
                </>
              )}
              {suggestion.status === "completed" && (
                <>
                  <Button size="sm" variant="outline">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    查看效果
                  </Button>
                  <Button size="sm" variant="ghost">
                    <FileText className="w-3 h-3 mr-1" />
                    执行报告
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export default function AIProcessOptimization() {
  const [activeTab, setActiveTab] = useState("overview");

  // 统计数据
  const stats = {
    total: hrOptimizationSuggestions.length +
             procurementOptimizationSuggestions.length +
             deliveryOptimizationSuggestions.length,
    pending: [...hrOptimizationSuggestions, ...procurementOptimizationSuggestions, ...deliveryOptimizationSuggestions]
      .filter(s => s.status === "pending").length,
    inProgress: [...hrOptimizationSuggestions, ...procurementOptimizationSuggestions, ...deliveryOptimizationSuggestions]
      .filter(s => s.status === "in_progress").length,
    completed: [...hrOptimizationSuggestions, ...procurementOptimizationSuggestions, ...deliveryOptimizationSuggestions]
      .filter(s => s.status === "completed").length,
    avgImpact: Math.round(
      (hrOptimizationSuggestions.reduce((sum, s) => sum + s.impact, 0) +
       procurementOptimizationSuggestions.reduce((sum, s) => sum + s.impact, 0) +
       deliveryOptimizationSuggestions.reduce((sum, s) => sum + s.impact, 0)) /
      (hrOptimizationSuggestions.length +
       procurementOptimizationSuggestions.length +
       deliveryOptimizationSuggestions.length)
    ),
  };

  return (
    <Layout>
      <FeatureGuide
        featureId="ai-process-optimization"
        title="AI 流程优化建议中心"
        description="基于 AI 分析，提供业务流程优化建议，持续提升运营效率"
        steps={[
          { title: "查看建议", description: "浏览 AI 生成的流程优化建议" },
          { title: "评估影响", description: "分析优化建议的预期效果" },
          { title: "执行优化", description: "开始实施优化措施" },
          { title: "跟踪效果", description: "监控优化实施后的效果" },
        ]}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              AI 流程优化建议中心
            </h1>
            <p className="text-muted-foreground mt-1">
              基于 AI 分析的智能流程优化建议，持续提升运营效率
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              优化设置
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              <Zap className="w-4 h-4 mr-2" />
              生成新建议
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总建议数</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Lightbulb className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">待处理</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">执行中</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Play className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已完成</p>
                  <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">平均提升</p>
                  <p className="text-2xl font-bold text-purple-400">+{stats.avgImpact}%</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-card/50 border border-border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20">
              <BarChart3 className="w-4 h-4 mr-2" />
              总览
            </TabsTrigger>
            <TabsTrigger value="hr" className="data-[state=active]:bg-primary/20">
              <Users className="w-4 h-4 mr-2" />
              人员流程
              {hrOptimizationSuggestions.filter(s => s.status === "pending").length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {hrOptimizationSuggestions.filter(s => s.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="procurement" className="data-[state=active]:bg-primary/20">
              <ShoppingCart className="w-4 h-4 mr-2" />
              采购流程
              {procurementOptimizationSuggestions.filter(s => s.status === "pending").length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {procurementOptimizationSuggestions.filter(s => s.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="delivery" className="data-[state=active]:bg-primary/20">
              <Truck className="w-4 h-4 mr-2" />
              交付流程
              {deliveryOptimizationSuggestions.filter(s => s.status === "pending").length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {deliveryOptimizationSuggestions.filter(s => s.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-blue-400" />
                    人员流程优化
                  </CardTitle>
                  <CardDescription>
                    {hrOptimizationSuggestions.length} 条建议
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>待处理</span>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400">
                        {hrOptimizationSuggestions.filter(s => s.status === "pending").length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>执行中</span>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400">
                        {hrOptimizationSuggestions.filter(s => s.status === "in_progress").length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>已完成</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-400">
                        {hrOptimizationSuggestions.filter(s => s.status === "completed").length}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    查看详情
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShoppingCart className="w-5 h-5 text-purple-400" />
                    采购流程优化
                  </CardTitle>
                  <CardDescription>
                    {procurementOptimizationSuggestions.length} 条建议
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>待处理</span>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400">
                        {procurementOptimizationSuggestions.filter(s => s.status === "pending").length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>执行中</span>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400">
                        {procurementOptimizationSuggestions.filter(s => s.status === "in_progress").length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>已完成</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-400">
                        {procurementOptimizationSuggestions.filter(s => s.status === "completed").length}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    查看详情
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Truck className="w-5 h-5 text-orange-400" />
                    交付流程优化
                  </CardTitle>
                  <CardDescription>
                    {deliveryOptimizationSuggestions.length} 条建议
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>待处理</span>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400">
                        {deliveryOptimizationSuggestions.filter(s => s.status === "pending").length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>执行中</span>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400">
                        {deliveryOptimizationSuggestions.filter(s => s.status === "in_progress").length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>已完成</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-400">
                        {deliveryOptimizationSuggestions.filter(s => s.status === "completed").length}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    查看详情
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Suggestions */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle>最新建议</CardTitle>
                <CardDescription>最近生成的 AI 优化建议</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...hrOptimizationSuggestions, ...procurementOptimizationSuggestions, ...deliveryOptimizationSuggestions]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((suggestion) => (
                      <div key={suggestion.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{suggestion.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {suggestion.suggestedBy} · {suggestion.createdAt}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={severityColors[suggestion.severity]}>
                            {severityLabels[suggestion.severity]}
                          </Badge>
                          <Badge className={statusColors[suggestion.status]}>
                            {statusLabels[suggestion.status]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HR Process Tab */}
          <TabsContent value="hr" className="space-y-4">
            <div className="space-y-4">
              {hrOptimizationSuggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          </TabsContent>

          {/* Procurement Process Tab */}
          <TabsContent value="procurement" className="space-y-4">
            <div className="space-y-4">
              {procurementOptimizationSuggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          </TabsContent>

          {/* Delivery Process Tab */}
          <TabsContent value="delivery" className="space-y-4">
            <div className="space-y-4">
              {deliveryOptimizationSuggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
