/**
 * AI建议效果追踪页面
 * 记录AI建议的采纳率和执行效果，用于持续优化AI助手表现
 */

import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  BarChart3,
  Target,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Brain,
  Database,
  Globe,
  RefreshCw,
  Download,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 助手类型配置
const assistantTypeConfig: Record<string, { label: string; color: string }> = {
  solution: { label: "方案助手", color: "bg-blue-500" },
  quotation: { label: "报价助手", color: "bg-green-500" },
  planning: { label: "规划助手", color: "bg-purple-500" },
  kpi: { label: "绩效助手", color: "bg-orange-500" },
  interview: { label: "面试助手", color: "bg-pink-500" },
  purchase: { label: "采购助手", color: "bg-cyan-500" },
  engineering: { label: "工程助手", color: "bg-indigo-500" },
  quality: { label: "质量助手", color: "bg-red-500" },
};

export default function AIEffectivenessTracking() {
  const [selectedAssistant, setSelectedAssistant] = useState<string>("all");
  const [selectedMode, setSelectedMode] = useState<string>("all");

  // 获取效果统计数据
  const statsQuery = trpc.aiExecutionMode.getEffectivenessStats.useQuery({
    assistantType: selectedAssistant === "all" ? undefined : selectedAssistant,
    mode: selectedMode === "all" ? undefined : (selectedMode as "internal" | "generative"),
  });

  // 获取最近执行日志
  const logsQuery = trpc.aiExecutionMode.getRecentLogs.useQuery({
    assistantType: selectedAssistant === "all" ? undefined : selectedAssistant,
    limit: 50,
  });

  // 获取DA联动统计
  const integrationStatsQuery = trpc.daIntegration.getIntegrationStats.useQuery({});

  const stats = statsQuery.data || [];
  const logs = logsQuery.data || [];
  const integrationStats = integrationStatsQuery.data;

  // 计算汇总数据
  const totalCalls = stats.reduce((sum, s) => sum + (s.totalCount || 0), 0);
  const totalAdopted = stats.reduce((sum, s) => sum + (s.adoptedCount || 0), 0);
  const overallAdoptionRate = totalCalls > 0 ? totalAdopted / totalCalls : 0;
  const avgResponseTime = stats.length > 0
    ? stats.reduce((sum, s) => sum + (s.avgResponseTime || 0), 0) / stats.length
    : 0;

  // 按模式分组统计
  const internalStats = stats.filter(s => s.executionMode === "internal");
  const generativeStats = stats.filter(s => s.executionMode === "generative");

  const internalTotal = internalStats.reduce((sum, s) => sum + (s.totalCount || 0), 0);
  const generativeTotal = generativeStats.reduce((sum, s) => sum + (s.totalCount || 0), 0);

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={BarChart3}
          title="AI建议效果追踪"
          description="监控AI助手的采纳率和执行效果，持续优化AI表现"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  statsQuery.refetch();
                  logsQuery.refetch();
                  integrationStatsQuery.refetch();
                }}
                disabled={statsQuery.isLoading}
              >
                {statsQuery.isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                刷新数据
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                导出报告
              </Button>
            </div>
          }
        />

        {/* 筛选器 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">AI助手:</span>
            <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部助手</SelectItem>
                {Object.entries(assistantTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">执行模式:</span>
            <Select value={selectedMode} onValueChange={setSelectedMode}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模式</SelectItem>
                <SelectItem value="internal">系统内AI</SelectItem>
                <SelectItem value="generative">泛互式AI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={Brain}
            label="总调用次数"
            value={totalCalls}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10"
          />
          <StatCard
            icon={ThumbsUp}
            label="整体采纳率"
            value={`${(overallAdoptionRate * 100).toFixed(1)}%`}
            iconColor="text-green-500"
            iconBg="bg-green-500/10"
            subtitle={overallAdoptionRate >= 0.7 ? "表现良好" : "需要优化"}
          />
          <StatCard
            icon={Clock}
            label="平均响应时间"
            value={`${(avgResponseTime / 1000).toFixed(1)}s`}
            iconColor="text-purple-500"
            iconBg="bg-purple-500/10"
          />
          <StatCard
            icon={Target}
            label="活跃员工DA"
            value={(integrationStats as any)?.totalEmployeeDAs || 0}
            iconColor="text-orange-500"
            iconBg="bg-orange-500/10"
          />
        </div>

        {/* 执行模式对比 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 border-blue-200/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg text-blue-700">系统内AI</CardTitle>
              </div>
              <CardDescription className="text-blue-600/70">
                基于案例库，快速响应
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-blue-600/70">调用次数</p>
                  <p className="text-2xl font-bold text-blue-700">{internalTotal}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-600/70">采纳率</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {internalStats.length > 0
                      ? (
                          (internalStats.reduce((sum, s) => sum + (s.adoptedCount || 0), 0) /
                            internalTotal) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-600/70">占比</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {totalCalls > 0 ? ((internalTotal / totalCalls) * 100).toFixed(0) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50/50 to-purple-100/30 border-purple-200/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-lg text-purple-700">泛互式AI</CardTitle>
              </div>
              <CardDescription className="text-purple-600/70">
                深度分析，创新建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-purple-600/70">调用次数</p>
                  <p className="text-2xl font-bold text-purple-700">{generativeTotal}</p>
                </div>
                <div>
                  <p className="text-sm text-purple-600/70">采纳率</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {generativeStats.length > 0
                      ? (
                          (generativeStats.reduce((sum, s) => sum + (s.adoptedCount || 0), 0) /
                            generativeTotal) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
                <div>
                  <p className="text-sm text-purple-600/70">占比</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {totalCalls > 0 ? ((generativeTotal / totalCalls) * 100).toFixed(0) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 详细数据 */}
        <Tabs defaultValue="by-assistant">
          <TabsList>
            <TabsTrigger value="by-assistant">按助手类型</TabsTrigger>
            <TabsTrigger value="recent-logs">最近执行日志</TabsTrigger>
          </TabsList>

          <TabsContent value="by-assistant" className="mt-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg">各AI助手效果统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(assistantTypeConfig).map(([type, config]) => {
                    const typeStats = stats.filter(s => s.assistantType === type);
                    const typeTotalCalls = typeStats.reduce((sum, s) => sum + (s.totalCount || 0), 0);
                    const typeAdopted = typeStats.reduce((sum, s) => sum + (s.adoptedCount || 0), 0);
                    const typeAdoptionRate = typeTotalCalls > 0 ? typeAdopted / typeTotalCalls : 0;

                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("w-3 h-3 rounded-full", config.color)} />
                          <span className="font-medium">{config.label}</span>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">调用次数</p>
                            <p className="font-semibold">{typeTotalCalls}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">采纳率</p>
                            <p className="font-semibold">{(typeAdoptionRate * 100).toFixed(1)}%</p>
                          </div>
                          <div className="w-32">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", config.color)}
                                style={{ width: `${typeAdoptionRate * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent-logs" className="mt-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg">最近执行日志</CardTitle>
              </CardHeader>
              <CardContent>
                {logsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无执行日志
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.slice(0, 20).map((log, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              (log as any).executionMode === "internal"
                                ? "border-blue-200 text-blue-600"
                                : "border-purple-200 text-purple-600"
                            )}
                          >
                            {(log as any).executionMode === "internal" ? "系统内" : "泛互式"}
                          </Badge>
                          <span className="text-sm">
                            {assistantTypeConfig[(log as any).assistantType]?.label || (log as any).assistantType}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">
                            {(log as any).responseTimeMs}ms
                          </span>
                          {(log as any).isAdopted === 1 ? (
                            <ThumbsUp className="w-4 h-4 text-green-500" />
                          ) : (log as any).isAdopted === 0 ? (
                            <ThumbsDown className="w-4 h-4 text-red-500" />
                          ) : (
                            <span className="text-xs text-muted-foreground">待反馈</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date((log as any).createdAt).toLocaleString("zh-CN")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
