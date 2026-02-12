/**
 * Gemini Insight Panel
 * Gemini洞察面板 - 实时会议分析流，显示战略目标关联
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  TrendingUp,
  Target,
  Users,
  Sparkles,
  RefreshCw,
  DollarSign,
  Percent,
  Award,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";

interface InsightPanelProps {
  channelId?: string;
  className?: string;
}

export function InsightPanel({ channelId, className }: InsightPanelProps) {
  const [focusArea, setFocusArea] = useState<'revenue' | 'profit' | 'efficiency' | 'quality'>('revenue');

  const { data: insights, isLoading, refetch, isFetching } = trpc.meeting.analytics.geminiInsights.useQuery(
    { channelId, focus: focusArea },
    { refetchInterval: 60000 } // Refresh every minute
  );

  const { data: topPerformers } = trpc.meeting.analytics.topPerformers.useQuery({ limit: 5 });

  return (
    <div className={cn("flex flex-col h-full bg-[#0B1120]", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-emerald-500/20">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Manus AI 洞察</h2>
              <p className="text-xs text-muted-foreground">实时会议分析与战略建议</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Strategic Targets */}
          <Card className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                战略目标追踪
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Revenue Target */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="w-3 h-3" />
                    营收目标
                  </span>
                  <span className="font-bold text-primary">50M</span>
                </div>
                <Progress value={68} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>当前: 34M</span>
                  <span>完成度: 68%</span>
                </div>
              </div>

              {/* Profit Margin Target */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Percent className="w-3 h-3" />
                    利润率目标
                  </span>
                  <span className="font-bold text-emerald-400">14%</span>
                </div>
                <Progress value={85} className="h-2 [&>div]:bg-emerald-500" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>当前: 11.9%</span>
                  <span>完成度: 85%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Focus Area Tabs */}
          <Tabs value={focusArea} onValueChange={(v) => setFocusArea(v as any)}>
            <TabsList className="grid grid-cols-4 bg-background/30">
              <TabsTrigger value="revenue" className="text-xs">营收</TabsTrigger>
              <TabsTrigger value="profit" className="text-xs">利润</TabsTrigger>
              <TabsTrigger value="efficiency" className="text-xs">效率</TabsTrigger>
              <TabsTrigger value="quality" className="text-xs">质量</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* AI Insights */}
          <Card className="bg-[#0F172A] border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                AI 分析洞察
              </CardTitle>
              <CardDescription className="text-xs">
                基于会议数据的智能分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-pulse flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary animate-bounce" />
                    <span className="text-sm text-muted-foreground">AI 正在分析...</span>
                  </div>
                </div>
              ) : insights?.insights ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <Streamdown>{insights.insights}</Streamdown>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  暂无洞察数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meeting Stats */}
          {insights?.stats && (
            <Card className="bg-[#0F172A] border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  会议统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <StatItem
                    label="总会议数"
                    value={insights.stats.total_meetings || 0}
                    icon={<CheckCircle2 className="w-3 h-3" />}
                  />
                  <StatItem
                    label="内容块数"
                    value={insights.stats.total_blocks || 0}
                    icon={<Lightbulb className="w-3 h-3" />}
                  />
                  <StatItem
                    label="评估数量"
                    value={insights.stats.total_assessments || 0}
                    icon={<Users className="w-3 h-3" />}
                  />
                  <StatItem
                    label="平均技术清晰度"
                    value={insights.stats.avg_technical_clarity?.toFixed(1) || 'N/A'}
                    icon={<Award className="w-3 h-3" />}
                    suffix="/5"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Performers */}
          <Card className="bg-[#0F172A] border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                表现优异者
              </CardTitle>
              <CardDescription className="text-xs">
                基于会议表现的排名
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topPerformers && topPerformers.length > 0 ? (
                <div className="space-y-2">
                  {topPerformers.map((performer: any, index: number) => (
                    <div
                      key={performer.employee_id}
                      className="flex items-center justify-between p-2 rounded-lg bg-background/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                          index === 0 && "bg-amber-500 text-black",
                          index === 1 && "bg-gray-400 text-black",
                          index === 2 && "bg-amber-700 text-white",
                          index > 2 && "bg-background text-muted-foreground"
                        )}>
                          {index + 1}
                        </span>
                        <span className="text-sm">{performer.employee_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {performer.meeting_count} 次会议
                        </Badge>
                        <span className="text-sm font-bold text-primary">
                          {performer.overall_score?.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  暂无排名数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts & Recommendations */}
          <Card className="bg-[#0F172A] border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                风险提醒
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <AlertItem
                  type="warning"
                  message="M3阶段技术评审会议参与度下降15%"
                />
                <AlertItem
                  type="info"
                  message="建议增加5000T清洗能力验证的跨部门会议"
                />
                <AlertItem
                  type="success"
                  message="本月会议决策执行率达到92%"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 bg-background/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>上次更新: {new Date().toLocaleTimeString()}</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            实时同步中
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StatItem({ label, value, icon, suffix = "" }: { label: string; value: string | number; icon: React.ReactNode; suffix?: string }) {
  return (
    <div className="p-2 rounded-lg bg-background/30">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold">
        {value}
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

function AlertItem({ type, message }: { type: 'warning' | 'info' | 'success'; message: string }) {
  const styles = {
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  };

  const icons = {
    warning: <AlertTriangle className="w-3 h-3" />,
    info: <Lightbulb className="w-3 h-3" />,
    success: <CheckCircle2 className="w-3 h-3" />,
  };

  return (
    <div className={cn("flex items-start gap-2 p-2 rounded-lg border", styles[type])}>
      <span className="flex-shrink-0 mt-0.5">{icons[type]}</span>
      <span className="text-xs">{message}</span>
    </div>
  );
}

export default InsightPanel;
