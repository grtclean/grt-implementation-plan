import { useState } from "react";
import {
  Brain,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Activity,
  Target,
  Zap,
  Shield,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

const RISK_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  high: { color: "text-red-600", bg: "bg-red-100", label: "高风险" },
  medium: { color: "text-amber-600", bg: "bg-amber-100", label: "中风险" },
  low: { color: "text-green-600", bg: "bg-green-100", label: "低风险" },
  none: { color: "text-blue-600", bg: "bg-blue-100", label: "无风险" },
};

const FATIGUE_COLOR = (index: number) =>
  index >= 60 ? "#ef4444" : index >= 30 ? "#f59e0b" : "#22c55e";

export function PredictiveAnalyticsTab() {
  const [meetingId, setMeetingId] = useState("");
  const [fatigueScope, setFatigueScope] = useState("organization");
  const [fatigueScopeId, setFatigueScopeId] = useState("");
  const [fatiguePeriod, setFatiguePeriod] = useState("monthly");

  const predictMutation = trpc.ime.predictEffectiveness.useMutation();
  const fatigueMutation = trpc.ime.detectFatigue.useMutation();
  const { data: dashboard, isLoading } = trpc.ime.predictionDashboard.useQuery({});

  const typeStats = (dashboard?.typeStats ?? []) as any[];
  const atRiskMeetings = (dashboard?.atRiskMeetings ?? []) as any[];
  const accuracy = (dashboard?.accuracy as any) ?? {};
  const fatigueData = (dashboard?.fatigueData ?? []) as any[];
  const riskFactorRankings = (dashboard?.riskFactorRankings ?? []) as any[];

  const prediction = predictMutation.data as any;
  const fatigueResult = fatigueMutation.data as any;

  const handlePredict = () => {
    if (!meetingId.trim()) return;
    predictMutation.mutate({ meetingId: meetingId.trim() });
  };

  const handleDetectFatigue = () => {
    fatigueMutation.mutate({
      scope: fatigueScope,
      scopeId: fatigueScopeId || undefined,
      period: fatiguePeriod || undefined,
    });
  };

  // Stat cards from typeStats
  const effectivenessStats = typeStats.find((t: any) => t.type === "effectiveness");
  const fatigueStats = typeStats.find((t: any) => t.type === "fatigue");
  const highRiskCount = atRiskMeetings.filter((m: any) => m.risk_level === "high").length;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            预测分析
          </CardTitle>
          <CardDescription>预测会议效能，检测会议疲劳信号</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="输入会议ID"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handlePredict} disabled={predictMutation.isPending}>
              {predictMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              预测效能
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={fatigueScope} onValueChange={(v) => setFatigueScope(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="选择范围" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="organization">全组织</SelectItem>
                <SelectItem value="department">部门</SelectItem>
                <SelectItem value="channel">频道</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="范围ID（可选）"
              value={fatigueScopeId}
              onChange={(e) => setFatigueScopeId(e.target.value)}
              className="max-w-xs"
            />
            <Select value={fatiguePeriod} onValueChange={(v) => setFatiguePeriod(v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="选择周期" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">月度</SelectItem>
                <SelectItem value="quarterly">季度</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleDetectFatigue} disabled={fatigueMutation.isPending}>
              {fatigueMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
              检测疲劳
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Single meeting prediction result */}
      {prediction && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              预测结果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Score gauge */}
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                    <circle
                      cx="48" cy="48" r="40"
                      stroke={prediction.predictedScore >= 70 ? "#22c55e" : prediction.predictedScore >= 40 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(prediction.predictedScore / 100) * 251.2} 251.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xl font-bold">{Math.round(prediction.predictedScore)}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">预测评分</div>
              </div>
              <div className="text-center flex flex-col justify-center">
                <Badge className={`text-base px-3 py-1 ${RISK_CONFIG[prediction.riskLevel]?.bg || ""}`}>
                  {RISK_CONFIG[prediction.riskLevel]?.label || prediction.riskLevel}
                </Badge>
                <div className="text-sm text-muted-foreground mt-1">风险等级</div>
              </div>
              <div className="text-center flex flex-col justify-center">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-indigo-500 h-3 rounded-full"
                    style={{ width: `${(prediction.confidenceLevel * 100)}%` }}
                  />
                </div>
                <div className="text-sm font-medium mt-1">{(prediction.confidenceLevel * 100).toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">置信度</div>
              </div>
              <div className="text-center flex flex-col justify-center">
                <div className="text-2xl font-bold">{prediction.riskFactors?.length ?? 0}</div>
                <div className="text-sm text-muted-foreground">风险因素</div>
              </div>
            </div>

            {/* Risk factors table */}
            {prediction.riskFactors?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">风险因素</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>因素</TableHead>
                      <TableHead className="text-center">权重</TableHead>
                      <TableHead>描述</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prediction.riskFactors.map((f: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{f.factor}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={f.weight >= 0.7 ? "destructive" : "secondary"}>{(f.weight * 100).toFixed(0)}%</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{f.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Recommendations */}
            {prediction.recommendations?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">改善建议</h4>
                <div className="space-y-2">
                  {prediction.recommendations.map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                      <Badge variant={r.priority === "high" ? "default" : "outline"} className="text-xs shrink-0">
                        {r.priority === "high" ? "高优" : r.priority === "medium" ? "中优" : "低优"}
                      </Badge>
                      <span>{r.action}</span>
                      <span className="ml-auto text-muted-foreground text-xs shrink-0">{r.expectedImpact}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {prediction.aiNarrative && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">{prediction.aiNarrative}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fatigue detection result */}
      {fatigueResult && !fatigueResult.message && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              疲劳检测结果
              <Badge className={fatigueResult.fatigueIndex >= 60 ? "bg-red-500" : fatigueResult.fatigueIndex >= 30 ? "bg-amber-500" : "bg-green-500"}>
                疲劳指数: {fatigueResult.fatigueIndex}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold" style={{ color: FATIGUE_COLOR(fatigueResult.fatigueIndex) }}>
                  {fatigueResult.fatigueIndex}
                </div>
                <div className="text-sm text-muted-foreground">疲劳指数</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{fatigueResult.trendDirection === "declining" ? "下降" : fatigueResult.trendDirection === "improving" ? "改善" : "稳定"}</div>
                <div className="text-sm text-muted-foreground">趋势方向</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{fatigueResult.stats?.totalMeetings ?? 0}</div>
                <div className="text-sm text-muted-foreground">分析会议数</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{fatigueResult.stats?.meetingsPerWeek?.toFixed(1) ?? 0}</div>
                <div className="text-sm text-muted-foreground">每周会议数</div>
              </div>
            </div>

            {/* Trend forecast chart */}
            {fatigueResult.trendForecast?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">趋势预测</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={fatigueResult.trendForecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="predictedScore" name="预测分数" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {fatigueResult.recommendations?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">缓解建议</h4>
                <div className="space-y-1">
                  {fatigueResult.recommendations.map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                      <Badge variant="outline" className="text-xs shrink-0">{r.priority}</Badge>
                      <span>{r.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fatigueResult.aiNarrative && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">{fatigueResult.aiNarrative}</div>
            )}
          </CardContent>
        </Card>
      )}

      {fatigueResult?.message && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">{fatigueResult.message}</CardContent>
        </Card>
      )}

      {/* Dashboard stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} label="高风险会议" value={highRiskCount} loading={isLoading} />
        <StatCard icon={Target} label="平均预测准确度" value={accuracy.avgAccuracy ? `${accuracy.avgAccuracy}%` : "N/A"} loading={isLoading} />
        <StatCard
          icon={Activity}
          label="平均疲劳指数"
          value={fatigueStats?.avgPredicted ?? "N/A"}
          loading={isLoading}
        />
        <StatCard icon={Brain} label="已预测会议" value={effectivenessStats?.count ?? 0} loading={isLoading} />
      </div>

      {/* At-risk meetings table */}
      {atRiskMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              风险会议列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会议名称</TableHead>
                  <TableHead className="text-center">预测评分</TableHead>
                  <TableHead className="text-center">风险等级</TableHead>
                  <TableHead className="text-center">置信度</TableHead>
                  <TableHead>主要风险因素</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRiskMeetings.map((m: any, i: number) => {
                  const riskConfig = RISK_CONFIG[m.risk_level] || RISK_CONFIG.medium;
                  let topFactor = "";
                  try {
                    const factors = JSON.parse(m.risk_factors || "[]");
                    topFactor = factors[0]?.factor || "";
                  } catch { /* skip */ }
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium max-w-[200px] truncate">{m.meeting_title || m.meeting_id}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={Number(m.predicted_score) < 40 ? "destructive" : "secondary"}>
                          {Math.round(Number(m.predicted_score))}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={riskConfig.bg}>{riskConfig.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{(Number(m.confidence_level) * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{topFactor}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Fatigue heatmap */}
      {fatigueData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">疲劳指数分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={fatigueData.map((d: any) => ({
                scope: d.scope_id || "全局",
                fatigue: Number(d.fatigue_index) || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="scope" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="fatigue" name="疲劳指数">
                  {fatigueData.map((_: any, i: number) => (
                    <rect key={i} fill={FATIGUE_COLOR(Number(fatigueData[i]?.fatigue_index) || 0)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Risk factor frequency */}
      {riskFactorRankings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">风险因素频率</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, riskFactorRankings.length * 35)}>
              <BarChart data={riskFactorRankings} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="factor" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="count" name="出现次数" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
