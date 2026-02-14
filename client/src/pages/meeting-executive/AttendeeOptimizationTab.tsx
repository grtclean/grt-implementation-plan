import { useState } from "react";
import {
  Users,
  RefreshCw,
  UserMinus,
  UserPlus,
  Search,
  Target,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function AttendeeOptimizationTab() {
  const [meetingId, setMeetingId] = useState("");
  const [topic, setTopic] = useState("");

  const optimizeMutation = trpc.ime.optimizeAttendees.useMutation();
  const { data: dashboard, isLoading } = trpc.ime.optimizationDashboard.useQuery({});
  const { data: topicSuggestions, refetch: refetchSuggestions, isFetching: suggestionsLoading } = trpc.ime.suggestParticipants.useQuery(
    { topic },
    { enabled: false }
  );

  const stats = dashboard?.stats;
  const overInvitedRankings = (dashboard?.overInvitedRankings ?? []) as any[];
  const recentOptimizations = (dashboard?.recentOptimizations ?? []) as any[];

  const optResult = optimizeMutation.data as any;
  const suggestions = (topicSuggestions as any)?.suggestions ?? [];

  const handleOptimize = () => {
    if (!meetingId.trim()) return;
    optimizeMutation.mutate({ meetingId: meetingId.trim() });
  };

  const handleSuggest = () => {
    if (!topic.trim()) return;
    refetchSuggestions();
  };

  // Build radar data from composition advice if available
  const radarData = optResult?.currentParticipants
    ? optResult.currentParticipants.slice(0, 8).map((p: any) => ({
        name: p.name?.substring(0, 6) || p.employeeId,
        score: p.avgScore,
        engagement: p.avgEngagement,
      }))
    : [];

  // Build size comparison data from recent optimizations
  const sizeComparisonData = recentOptimizations.slice(0, 10).map((opt: any) => ({
    meeting: (opt.meeting_title || "").substring(0, 10),
    current: opt.current_size,
    optimal: opt.optimal_size,
  }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            参会优化
          </CardTitle>
          <CardDescription>分析会议参会者构成，优化参会人员名单</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="输入会议ID"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleOptimize} disabled={optimizeMutation.isPending}>
              {optimizeMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Target className="h-4 w-4 mr-2" />}
              优化分析
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="输入议题关键词，推荐参会者"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="max-w-md"
            />
            <Button variant="outline" onClick={handleSuggest} disabled={suggestionsLoading}>
              {suggestionsLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              推荐参会者
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Single meeting optimization result */}
      {optResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{optResult.currentSize}</div>
                <div className="text-sm text-muted-foreground">当前人数</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-green-600">{optResult.optimalSize}</div>
                <div className="text-sm text-muted-foreground">最佳人数</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-red-600">{optResult.overInvited?.length ?? 0}</div>
                <div className="text-sm text-muted-foreground">超邀人数</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-amber-600">¥{optResult.estimatedCostSaving}</div>
                <div className="text-sm text-muted-foreground">预计节省</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Over-invited */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                  <UserMinus className="h-4 w-4" />
                  超邀人员
                </CardTitle>
              </CardHeader>
              <CardContent>
                {optResult.overInvited?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>姓名</TableHead>
                        <TableHead className="text-center">平均分</TableHead>
                        <TableHead className="text-right">浪费成本</TableHead>
                        <TableHead>原因</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optResult.overInvited.map((p: any, i: number) => (
                        <TableRow key={i} className="bg-red-50/50">
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">{p.avgScore}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-red-600">¥{p.costWaste}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">无超邀人员</p>
                )}
              </CardContent>
            </Card>

            {/* Recommended additions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-green-600">
                  <UserPlus className="h-4 w-4" />
                  推荐新增
                </CardTitle>
              </CardHeader>
              <CardContent>
                {optResult.recommended?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>姓名</TableHead>
                        <TableHead className="text-center">预测贡献</TableHead>
                        <TableHead>推荐原因</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optResult.recommended.map((p: any, i: number) => (
                        <TableRow key={i} className="bg-green-50/50">
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge>{p.predictedContribution}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">暂无推荐新增人员</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Radar chart for participants */}
          {radarData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">参会者能力雷达</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="贡献分" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                    <Radar name="参与度" dataKey="engagement" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* AI narrative */}
          {optResult.aiNarrative && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">{optResult.aiNarrative}</div>
          )}
        </div>
      )}

      {/* Topic-based suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">议题推荐参会者</CardTitle>
            <CardDescription>基于「{(topicSuggestions as any)?.topic}」的历史会议数据</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead className="text-center">相关度</TableHead>
                  <TableHead className="text-center">相关会议数</TableHead>
                  <TableHead className="text-center">决策贡献</TableHead>
                  <TableHead>推荐原因</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((s: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-center"><Badge>{s.avgScore}</Badge></TableCell>
                    <TableCell className="text-center">{s.topicMeetingCount}</TableCell>
                    <TableCell className="text-center">{s.totalDecisions}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dashboard stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label="已优化会议" value={stats?.totalOptimized ?? 0} loading={isLoading} />
        <StatCard icon={DollarSign} label="平均节省潜力" value={`¥${stats?.avgSaving ?? 0}`} loading={isLoading} />
        <StatCard icon={UserMinus} label="平均超邀人数" value={stats?.avgSizeGap ?? 0} loading={isLoading} />
      </div>

      {/* Over-invited frequency rankings */}
      {overInvitedRankings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">超邀频率排名</CardTitle>
            <CardDescription>在多次会议中被标记为超邀的人员</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>排名</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead className="text-center">被标记次数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overInvitedRankings.map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={r.count >= 5 ? "destructive" : "secondary"}>{r.count}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Size optimization chart */}
      {sizeComparisonData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">人数优化对比（当前 vs 最佳）</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sizeComparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="meeting" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="current" name="当前人数" fill="#ef4444" />
                <Bar dataKey="optimal" name="最佳人数" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
