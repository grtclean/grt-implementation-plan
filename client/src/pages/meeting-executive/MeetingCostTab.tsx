import { useState } from "react";
import {
  DollarSign,
  RefreshCw,
  TrendingUp,
  Clock,
  Users,
  Calculator,
  Play,
  CheckCircle2,
  HelpCircle,
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
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function MeetingCostTab() {
  const [meetingId, setMeetingId] = useState("");
  const [batchIds, setBatchIds] = useState("");

  const computeMutation = trpc.ime.computeMeetingCost.useMutation();
  const batchMutation = trpc.ime.batchComputeCosts.useMutation();
  const { data: dashboard, isLoading } = trpc.ime.costDashboard.useQuery({});

  const stats = dashboard?.stats;
  const topExpensive = (dashboard?.topExpensive ?? []) as any[];
  const monthlyTrend = (dashboard?.monthlyTrend ?? []) as any[];
  const scatterData = (dashboard?.scatterData ?? []) as any[];

  const singleResult = computeMutation.data;
  const breakdown = (singleResult?.breakdown ?? []) as any[];

  const handleCompute = () => {
    if (!meetingId.trim()) return;
    computeMutation.mutate({ meetingId: meetingId.trim() });
  };

  const handleBatch = () => {
    const ids = batchIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;
    batchMutation.mutate({ meetingIds: ids });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-emerald-500" />
            会议成本计算
          </CardTitle>
          <CardDescription>输入会议ID计算成本，或批量输入多个ID（逗号分隔）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="输入会议ID..."
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              className="max-w-sm"
            />
            <Button
              onClick={handleCompute}
              disabled={computeMutation.isPending || !meetingId.trim()}
            >
              {computeMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              计算成本
            </Button>
          </div>
          <div className="flex gap-3">
            <Input
              placeholder="批量ID: id-1, id-2, id-3..."
              value={batchIds}
              onChange={(e) => setBatchIds(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleBatch}
              disabled={batchMutation.isPending || !batchIds.trim()}
            >
              {batchMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              批量计算
            </Button>
          </div>
          {batchMutation.data && (
            <div className="space-y-1">
              {batchMutation.data.map((r: any) => (
                <div key={r.meetingId} className="flex items-center gap-2 text-sm">
                  {r.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <HelpCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-mono text-xs">{r.meetingId}</span>
                  {r.success && <span className="text-muted-foreground">¥{r.totalCost}</span>}
                  {r.error && <span className="text-red-500 text-xs">{r.error}</span>}
                </div>
              ))}
            </div>
          )}
          {computeMutation.isError && (
            <p className="text-sm text-red-500">计算失败: {computeMutation.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Single meeting breakdown */}
      {singleResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">成本明细 — {singleResult.meetingTitle}</CardTitle>
            <CardDescription>
              时长: {singleResult.durationMinutes}分钟 | 参会者: {singleResult.participantCount}人 | 总成本: ¥{singleResult.totalCost}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">总成本</div>
                <div className="text-lg font-semibold text-emerald-600">¥{singleResult.totalCost}</div>
              </div>
              <div className="text-center p-3 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">成本/决策</div>
                <div className="text-lg font-semibold">{singleResult.costPerDecision !== null ? `¥${singleResult.costPerDecision}` : "—"}</div>
              </div>
              <div className="text-center p-3 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">成本/行动项</div>
                <div className="text-lg font-semibold">{singleResult.costPerActionItem !== null ? `¥${singleResult.costPerActionItem}` : "—"}</div>
              </div>
              <div className="text-center p-3 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">ROI评分</div>
                <div className="text-lg font-semibold">{singleResult.roiScore ?? "—"}</div>
              </div>
            </div>
            {breakdown.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>参会者</TableHead>
                    <TableHead className="text-right">时薪 (¥)</TableHead>
                    <TableHead className="text-right">成本 (¥)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.map((b: any) => (
                    <TableRow key={b.name}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell className="text-right">{b.hourlyRate}</TableCell>
                      <TableCell className="text-right">{b.cost}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dashboard Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="总花费"
          value={isLoading ? "..." : `¥${stats?.totalSpend ?? 0}`}
          subtitle="Total Spend"
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          icon={TrendingUp}
          label="平均成本/会议"
          value={isLoading ? "..." : `¥${stats?.avgCost ?? 0}`}
          subtitle="Avg Cost per Meeting"
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={Calculator}
          label="已分析会议"
          value={isLoading ? "..." : stats?.meetingCount ?? 0}
          subtitle="Meetings Analyzed"
        />
        <StatCard
          icon={Clock}
          label="平均时长"
          value={isLoading ? "..." : `${stats?.avgDuration ?? 0}分钟`}
          subtitle="Avg Duration"
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Cost Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">月度成本趋势</CardTitle>
          <CardDescription>Monthly cost trend</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(value: any) => `¥${Math.round(Number(value))}`} />
                <Line type="monotone" dataKey="total_cost" stroke="#10b981" strokeWidth={2} name="总成本" />
                <Line type="monotone" dataKey="avg_cost" stroke="#6366f1" strokeWidth={2} name="平均成本" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mb-3 opacity-30" />
              <p>暂无成本数据</p>
              <p className="text-sm">请先计算会议成本</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Most Expensive Meetings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最高成本会议 Top 5</CardTitle>
        </CardHeader>
        <CardContent>
          {topExpensive.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会议名称</TableHead>
                  <TableHead className="text-center">日期</TableHead>
                  <TableHead className="text-right">成本 (¥)</TableHead>
                  <TableHead className="text-center">参会人数</TableHead>
                  <TableHead className="text-right">成本/决策</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topExpensive.map((m: any) => (
                  <TableRow key={m.meeting_id}>
                    <TableCell className="font-medium">{m.meeting_title}</TableCell>
                    <TableCell className="text-center text-sm">{m.meeting_date?.split("T")[0]}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="default">¥{Math.round(Number(m.total_cost))}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{m.participant_count}</TableCell>
                    <TableCell className="text-right">
                      {m.cost_per_decision ? `¥${Math.round(Number(m.cost_per_decision))}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-6 text-muted-foreground">暂无数据</p>
          )}
        </CardContent>
      </Card>

      {/* Cost vs Effectiveness Scatter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">成本 vs 效能</CardTitle>
          <CardDescription>Cost vs Effectiveness scatter — bubble size = participant count</CardDescription>
        </CardHeader>
        <CardContent>
          {scatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cost" name="成本" unit="¥" tick={{ fontSize: 12 }} />
                <YAxis dataKey="effectiveness" name="效能" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <ZAxis dataKey="participant_count" name="参会人数" range={[40, 400]} />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    if (name === "成本") return `¥${Math.round(Number(value))}`;
                    return value;
                  }}
                />
                <Scatter
                  data={scatterData.map((d: any) => ({
                    ...d,
                    cost: Number(d.cost),
                    effectiveness: Number(d.effectiveness),
                    participant_count: Number(d.participant_count),
                  }))}
                  fill="#6366f1"
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mb-3 opacity-30" />
              <p>暂无散点数据</p>
              <p className="text-sm">需要同时有成本和效能数据</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
