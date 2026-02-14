/**
 * 工序进度看板 (Process Progress Dashboard)
 * 
 * 功能：
 * 1. T1-T15工序完成进度可视化
 * 2. 每个工序的BOM步骤完成率
 * 3. 实际工时 vs 理论工时对比
 * 4. 项目整体进度概览
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import {
  Factory, BarChart3, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Target, Loader2,
  ChevronRight, Activity, Timer, Zap
} from "lucide-react";
import { PageHeader } from "@/components/grt";
import Layout from "@/components/Layout";
import { useState, useMemo } from "react";

export default function ProcessProgressDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projectId, setProjectId] = useState<number | null>(null);

  const progressQuery = trpc.processSteps.getProjectProgressDashboard.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  const data = progressQuery.data as any;

  return (
    <Layout>
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={BarChart3}
        title="工序进度看板"
        description="T1-T15工序完成进度 · 工时对比分析 · 项目整体概览"
        actions={
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">项目ID:</Label>
            <Input
              type="number"
              placeholder="输入项目ID"
              className="w-32"
              value={projectId || ""}
              onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>
        }
      />

      {!projectId ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Factory className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">请输入项目ID查看进度</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">选择一个项目以查看T1-T15工序的完成进度</p>
          </CardContent>
        </Card>
      ) : progressQuery.isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">加载进度数据...</span>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          {/* 项目整体概览 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-4 text-center">
                <Target className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-3xl font-bold text-primary">{data.overallCompletionRate.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground mt-1">整体完成率</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{data.completedSteps}/{data.totalSteps}</div>
                <div className="text-xs text-muted-foreground mt-1">步骤完成</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{data.completedProcesses}/{data.totalProcesses}</div>
                <div className="text-xs text-muted-foreground mt-1">工序完成</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{data.totalActualHours.toFixed(1)}h</div>
                <div className="text-xs text-muted-foreground mt-1">实际工时</div>
                <div className="text-[10px] text-muted-foreground">理论: {data.totalTheoreticalHours.toFixed(1)}h</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <HoursVarianceDisplay
                  variance={data.overallHoursVariance}
                  theoretical={data.totalTheoreticalHours}
                />
                <div className="text-xs text-muted-foreground mt-1">工时偏差</div>
              </CardContent>
            </Card>
          </div>

          {/* 整体进度条 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">项目整体进度</span>
                <span className="text-sm font-bold text-primary">{data.overallCompletionRate.toFixed(1)}%</span>
              </div>
              <Progress value={data.overallCompletionRate} className="h-3" />
            </CardContent>
          </Card>

          {/* T1-T15工序进度详情 */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              T1-T15 工序进度详情
            </h2>

            {data.processDetails.map((proc: any) => (
              <ProcessProgressCard key={proc.processCode} process={proc} />
            ))}
          </div>
        </>
      ) : (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardContent className="flex items-center justify-center py-8">
            <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
            <span className="text-amber-700 dark:text-amber-300">未找到该项目的工序数据</span>
          </CardContent>
        </Card>
      )}
    </div>
    </Layout>
  );
}

// ============================================================
// 子组件：工序进度卡片
// ============================================================

function ProcessProgressCard({ process }: { process: any }) {
  const hasSteps = process.totalSteps > 0;
  const isComplete = process.completionRate === 100;
  const isOvertime = process.hoursVariance > 0 && process.totalTheoreticalHours > 0;

  return (
    <Card className={`transition-all ${isComplete ? "border-green-200 dark:border-green-800" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`font-mono text-sm px-3 py-1 ${
                isComplete
                  ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300"
                  : hasSteps
                  ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300"
                  : ""
              }`}
            >
              {process.processCode}
            </Badge>
            <div>
              <span className="font-semibold">{process.processName}</span>
              <div className="flex gap-1 mt-0.5">
                {process.milestones.map((m: string) => (
                  <Badge key={m} variant="secondary" className="text-[10px] h-4 px-1.5">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            {hasSteps && (
              <>
                <div className="text-right">
                  <div className="font-bold">{process.completionRate.toFixed(0)}%</div>
                  <div className="text-[10px] text-muted-foreground">
                    {process.completedSteps}/{process.totalSteps} 步骤
                  </div>
                </div>
                {isComplete && <CheckCircle2 className="w-5 h-5 text-green-600" />}
              </>
            )}
          </div>
        </div>

        {hasSteps ? (
          <>
            {/* 进度条 */}
            <div className="mb-3">
              <Progress
                value={process.completionRate}
                className={`h-2 ${isComplete ? "[&>div]:bg-green-500" : ""}`}
              />
            </div>

            {/* 步骤状态分布 */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">已完成</span>
                <span className="font-medium">{process.completedSteps}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">进行中</span>
                <span className="font-medium">{process.inProgressSteps}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-slate-300" />
                <span className="text-muted-foreground">待开始</span>
                <span className="font-medium">{process.pendingSteps}</span>
              </div>
            </div>

            {/* 工时对比 */}
            {process.totalTheoreticalHours > 0 && (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2.5 text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-muted-foreground">理论工时:</span>
                    <span className="font-medium ml-1">{process.totalTheoreticalHours.toFixed(1)}h</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">实际工时:</span>
                    <span className="font-medium ml-1">{process.totalActualHours.toFixed(1)}h</span>
                  </div>
                </div>
                <HoursVarianceDisplay
                  variance={process.hoursVariance}
                  theoretical={process.totalTheoreticalHours}
                  small
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-2 text-xs text-muted-foreground">
            暂无BOM步骤
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// 子组件：工时偏差显示
// ============================================================

function HoursVarianceDisplay({
  variance,
  theoretical,
  small = false,
}: {
  variance: number;
  theoretical: number;
  small?: boolean;
}) {
  if (theoretical === 0) {
    return <span className={`text-muted-foreground ${small ? "text-xs" : "text-2xl font-bold"}`}>-</span>;
  }

  const percent = ((variance / theoretical) * 100).toFixed(0);
  const isOver = variance > 0;
  const isUnder = variance < 0;

  if (small) {
    return (
      <span className={`flex items-center gap-1 font-medium ${
        isOver ? "text-red-600" : isUnder ? "text-green-600" : "text-muted-foreground"
      }`}>
        {isOver ? <TrendingUp className="w-3 h-3" /> : isUnder ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
        {isOver ? "+" : ""}{variance.toFixed(1)}h ({isOver ? "+" : ""}{percent}%)
      </span>
    );
  }

  return (
    <div className={`${isOver ? "text-red-600" : isUnder ? "text-green-600" : "text-muted-foreground"}`}>
      <div className="text-2xl font-bold flex items-center justify-center gap-1">
        {isOver ? <TrendingUp className="w-5 h-5" /> : isUnder ? <TrendingDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
        {isOver ? "+" : ""}{variance.toFixed(1)}h
      </div>
      <div className="text-[10px]">({isOver ? "+" : ""}{percent}%)</div>
    </div>
  );
}
