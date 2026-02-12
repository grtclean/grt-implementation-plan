import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Trophy, Medal, Star, TrendingUp, Clock, Target,
  Award, Users, ChevronUp, ChevronDown, Minus, Crown
} from "lucide-react";

const PERIOD_OPTIONS = [
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
  { value: "quarter", label: "本季度" },
  { value: "year", label: "本年度" },
];

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-700" />;
  return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">{rank}</span>;
}

function getTrendIcon(trend: string) {
  if (trend === "up") return <ChevronUp className="w-4 h-4 text-green-500" />;
  if (trend === "down") return <ChevronDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function getEfficiencyColor(efficiency: number) {
  if (efficiency >= 120) return "text-green-600 bg-green-50";
  if (efficiency >= 100) return "text-blue-600 bg-blue-50";
  if (efficiency >= 80) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

export default function WorkerPerformanceLeaderboard() {
  const [activeTab, setActiveTab] = useState("leaderboard");
  const [period, setPeriod] = useState("month");
  const [selectedProject] = useState("PRJ-2026-001");

  // Queries
  const leaderboardQuery = (trpc.qualityMaterialPerformance as any).workerLeaderboard.useQuery(
    { projectId: selectedProject, period },
    { enabled: activeTab === "leaderboard" }
  );
  const performanceSummaryQuery = (trpc.qualityMaterialPerformance as any).workerPerformanceSummary.useQuery(
    { projectId: selectedProject, period },
    { enabled: activeTab === "summary" }
  );

  const leaderboard = (leaderboardQuery.data as any[] || []);
  const summary = performanceSummaryQuery.data;

  // Calculate top performers
  const topPerformers = useMemo(() => {
    return leaderboard.slice(0, 3);
  }, [leaderboard]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-7 h-7 text-primary" />
            产线员工绩效排行榜
          </h1>
          <p className="text-muted-foreground mt-1">基于工时记录和完成质量的员工绩效排名与效率对比</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="leaderboard">排行榜</TabsTrigger>
          <TabsTrigger value="summary">团队概览</TabsTrigger>
          <TabsTrigger value="details">详细分析</TabsTrigger>
        </TabsList>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          {/* Top 3 Podium */}
          {topPerformers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPerformers.map((worker: any, i: number) => (
                <Card key={worker.worker_id || i} className={`${i === 0 ? 'border-yellow-300 bg-yellow-50/30 md:order-2' : i === 1 ? 'border-gray-300 bg-gray-50/30 md:order-1' : 'border-amber-300 bg-amber-50/30 md:order-3'}`}>
                  <CardContent className="p-6 text-center">
                    <div className="mb-3">{getRankIcon(i + 1)}</div>
                    <div className="text-lg font-bold">{worker.worker_name || `员工${worker.worker_id}`}</div>
                    <div className="text-sm text-muted-foreground mb-3">{worker.department || '生产部'}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-background rounded">
                        <div className="font-bold text-primary">{worker.total_tasks || 0}</div>
                        <div className="text-xs text-muted-foreground">完成任务</div>
                      </div>
                      <div className="p-2 bg-background rounded">
                        <div className={`font-bold ${getEfficiencyColor(worker.efficiency || 0).split(' ')[0]}`}>
                          {worker.efficiency || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">效率</div>
                      </div>
                      <div className="p-2 bg-background rounded">
                        <div className="font-bold">{worker.total_hours ? Number(worker.total_hours).toFixed(1) : '0'}h</div>
                        <div className="text-xs text-muted-foreground">总工时</div>
                      </div>
                      <div className="p-2 bg-background rounded">
                        <div className="font-bold">{worker.quality_score || 0}</div>
                        <div className="text-xs text-muted-foreground">质量分</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Full Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                完整排行榜
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-3 w-12">排名</th>
                      <th className="p-3">员工</th>
                      <th className="p-3 text-center">完成任务</th>
                      <th className="p-3 text-center">总工时</th>
                      <th className="p-3 text-center">效率</th>
                      <th className="p-3 text-center">质量分</th>
                      <th className="p-3 text-center">综合评分</th>
                      <th className="p-3 text-center">趋势</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((worker: any, i: number) => (
                      <tr key={worker.worker_id || i} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3">{getRankIcon(i + 1)}</td>
                        <td className="p-3">
                          <div className="font-medium">{worker.worker_name || `员工${worker.worker_id}`}</div>
                          <div className="text-xs text-muted-foreground">{worker.department || '生产部'}</div>
                        </td>
                        <td className="p-3 text-center font-mono">{worker.total_tasks || 0}</td>
                        <td className="p-3 text-center font-mono">{worker.total_hours ? Number(worker.total_hours).toFixed(1) : '0'}h</td>
                        <td className="p-3 text-center">
                          <Badge className={getEfficiencyColor(worker.efficiency || 0)}>
                            {worker.efficiency || 0}%
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="font-mono">{worker.quality_score || 0}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-primary">{worker.composite_score || 0}</span>
                        </td>
                        <td className="p-3 text-center">
                          {getTrendIcon(worker.trend || "stable")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {leaderboard.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">暂无绩效数据</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <div className="text-3xl font-bold">{summary?.totalWorkers || 0}</div>
                <p className="text-sm text-muted-foreground">参与员工</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <div className="text-3xl font-bold">{summary?.totalHours ? Number(summary.totalHours).toFixed(0) : 0}h</div>
                <p className="text-sm text-muted-foreground">总工时</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <div className="text-3xl font-bold">{summary?.avgEfficiency || 0}%</div>
                <p className="text-sm text-muted-foreground">平均效率</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                <div className="text-3xl font-bold">{summary?.totalTasks || 0}</div>
                <p className="text-sm text-muted-foreground">完成任务</p>
              </CardContent>
            </Card>
          </div>

          {/* Efficiency Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">效率分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "高效 (≥120%)", range: "120+", color: "bg-green-500", count: summary?.efficiencyDistribution?.high || 0 },
                  { label: "达标 (100-119%)", range: "100-119", color: "bg-blue-500", count: summary?.efficiencyDistribution?.standard || 0 },
                  { label: "待提升 (80-99%)", range: "80-99", color: "bg-yellow-500", count: summary?.efficiencyDistribution?.below || 0 },
                  { label: "需关注 (<80%)", range: "<80", color: "bg-red-500", count: summary?.efficiencyDistribution?.low || 0 },
                ].map((item) => (
                  <div key={item.range} className="text-center p-4 rounded-lg bg-muted">
                    <div className={`w-4 h-4 rounded-full ${item.color} mx-auto mb-2`} />
                    <div className="text-2xl font-bold">{item.count}</div>
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Process Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">各工序人均效率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(summary?.processPerformance as any[] || []).map((p: any) => (
                  <div key={p.process_code} className="flex items-center gap-4">
                    <span className="w-10 font-mono font-bold text-sm">{p.process_code}</span>
                    <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${Number(p.avg_efficiency) >= 100 ? 'bg-green-500' : Number(p.avg_efficiency) >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(Number(p.avg_efficiency), 150)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-sm">{p.avg_efficiency}%</span>
                    <span className="w-20 text-right text-xs text-muted-foreground">{p.worker_count}人</span>
                  </div>
                ))}
                {(!summary?.processPerformance || (summary.processPerformance as any[]).length === 0) && (
                  <p className="text-center text-muted-foreground py-4">暂无数据</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5" />
                绩效激励建议
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">优秀员工表彰</h4>
                <p className="text-sm text-green-700">
                  {topPerformers.length > 0
                    ? `本${period === 'week' ? '周' : period === 'month' ? '月' : period === 'quarter' ? '季度' : '年度'}表现最优秀的员工是 ${topPerformers[0]?.worker_name || '未知'}，完成了 ${topPerformers[0]?.total_tasks || 0} 项任务，效率达到 ${topPerformers[0]?.efficiency || 0}%。建议给予表彰和激励。`
                    : '暂无足够数据生成激励建议。'}
                </p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">团队协作亮点</h4>
                <p className="text-sm text-blue-700">
                  团队平均效率 {summary?.avgEfficiency || 0}%，共 {summary?.totalWorkers || 0} 名员工参与生产，
                  累计完成 {summary?.totalTasks || 0} 项任务。
                  {(summary?.avgEfficiency || 0) >= 100 ? '团队整体表现优秀，保持当前节奏。' : '建议关注低效率工序，优化工作流程。'}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">改进建议</h4>
                <p className="text-sm text-yellow-700">
                  {(summary?.efficiencyDistribution?.low || 0) > 0
                    ? `有 ${summary?.efficiencyDistribution?.low} 名员工效率低于80%，建议安排技能培训或调整工序分配。`
                    : '所有员工效率均在可接受范围内，建议继续保持并寻找进一步优化空间。'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
