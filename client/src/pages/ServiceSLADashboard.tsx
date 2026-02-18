/**
 * 服务SLA分析仪表板 (US-015)
 * SLA达标率分析 · 工程师效能 · 改进建议
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Gauge, Loader2, Sparkles, CheckCircle, ArrowUp, ArrowRight, ArrowDown,
  Clock, Users, AlertTriangle, BarChart3, Star,
} from "lucide-react";

interface SLAResult {
  overallSLARate: number;
  periodSummary: string;
  metrics: Array<{
    metric: string;
    target: string;
    actual: string;
    status: string;
    trend: string;
  }>;
  ticketAnalysis: {
    total: number;
    resolved: number;
    pending: number;
    overdue: number;
    avgResponseHours: number;
    avgResolutionHours: number;
  };
  topIssues: Array<{
    category: string;
    count: number;
    avgResolutionTime: string;
  }>;
  engineerPerformance: Array<{
    engineer: string;
    ticketsHandled: number;
    avgRating: number;
    slaCompliance: string;
  }>;
  recommendations: string[];
}

export default function ServiceSLADashboard() {
  const [period, setPeriod] = useState("");
  const [ticketData, setTicketData] = useState("");
  const [slaTargets, setSlaTargets] = useState("");
  const [engineerData, setEngineerData] = useState("");
  const [result, setResult] = useState<SLAResult | null>(null);

  const mutation = trpc.serviceSalesAdvanced.analyzeSLA.useMutation({
    onSuccess: (data) => setResult(data as SLAResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!period.trim() || !ticketData.trim() || !slaTargets.trim() || mutation.isPending) return;
    mutation.mutate({
      period,
      ticketData,
      slaTargets,
      engineerData: engineerData || undefined,
    });
  };

  const slaRateColor = (rate: number) => {
    if (rate >= 95) return "text-green-400";
    if (rate >= 85) return "text-yellow-400";
    return "text-red-400";
  };

  const slaRateBg = (rate: number) => {
    if (rate >= 95) return "bg-green-500/20 border-green-500/30";
    if (rate >= 85) return "bg-yellow-500/20 border-yellow-500/30";
    return "bg-red-500/20 border-red-500/30";
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "met":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">达标</Badge>;
      case "at_risk":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">风险</Badge>;
      case "missed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">未达标</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const trendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <ArrowUp className="h-4 w-4 text-green-400" />;
      case "stable":
        return <ArrowRight className="h-4 w-4 text-blue-400" />;
      case "declining":
        return <ArrowDown className="h-4 w-4 text-red-400" />;
      default:
        return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<Star key={i} className="h-3 w-3 fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="h-3 w-3 text-muted-foreground" />);
      }
    }
    return <div className="flex items-center gap-0.5">{stars}<span className="ml-1 text-xs">{rating.toFixed(1)}</span></div>;
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Gauge}
          title="服务SLA分析仪表板"
          description="SLA达标率分析 · 工程师效能 · 改进建议"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI分析
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-5 w-5 text-primary" />
              SLA分析参数
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">分析周期 *</label>
                <Input
                  placeholder="如: 2026年Q1"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">SLA目标 *</label>
                <textarea
                  className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                  placeholder="SLA目标: P1响应2h/解决24h, P2响应4h/解决48h..."
                  value={slaTargets}
                  onChange={(e) => setSlaTargets(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">工单数据汇总 *</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]"
                placeholder="工单数据汇总"
                value={ticketData}
                onChange={(e) => setTicketData(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">工程师数据（可选）</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                placeholder="工程师数据"
                value={engineerData}
                onChange={(e) => setEngineerData(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!period.trim() || !ticketData.trim() || !slaTargets.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI分析SLA
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Overall SLA Rate */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-3">
                  <p className="text-sm text-muted-foreground">整体SLA达标率</p>
                  <div className={`text-6xl font-bold ${slaRateColor(result.overallSLARate)}`}>
                    {result.overallSLARate}%
                  </div>
                  <Badge className={slaRateBg(result.overallSLARate)}>
                    {result.overallSLARate >= 95 ? "优秀" : result.overallSLARate >= 85 ? "需改进" : "不达标"}
                  </Badge>
                  <div className="p-4 rounded bg-muted/50 w-full mt-4">
                    <p className="text-sm text-muted-foreground mb-1">周期摘要</p>
                    <p className="text-sm">{result.periodSummary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metrics Table */}
            {result.metrics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    SLA指标明细
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">指标</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">目标</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">实际</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">状态</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">趋势</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.metrics.map((m, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{m.metric}</td>
                            <td className="py-2">{m.target}</td>
                            <td className="py-2">{m.actual}</td>
                            <td className="py-2">{statusBadge(m.status)}</td>
                            <td className="py-2">{trendIcon(m.trend)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ticket Analysis Stats Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5 text-blue-400" />
                  工单统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <p className="text-2xl font-bold">{result.ticketAnalysis.total}</p>
                    <p className="text-xs text-muted-foreground">总工单</p>
                  </div>
                  <div className="p-3 rounded bg-green-500/10 text-center">
                    <p className="text-2xl font-bold text-green-400">{result.ticketAnalysis.resolved}</p>
                    <p className="text-xs text-muted-foreground">已解决</p>
                  </div>
                  <div className="p-3 rounded bg-blue-500/10 text-center">
                    <p className="text-2xl font-bold text-blue-400">{result.ticketAnalysis.pending}</p>
                    <p className="text-xs text-muted-foreground">处理中</p>
                  </div>
                  <div className="p-3 rounded bg-red-500/10 text-center">
                    <p className="text-2xl font-bold text-red-400">{result.ticketAnalysis.overdue}</p>
                    <p className="text-xs text-muted-foreground">超时</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <p className="text-2xl font-bold">{result.ticketAnalysis.avgResponseHours}h</p>
                    <p className="text-xs text-muted-foreground">平均响应</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <p className="text-2xl font-bold">{result.ticketAnalysis.avgResolutionHours}h</p>
                    <p className="text-xs text-muted-foreground">平均解决</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Issues */}
            {result.topIssues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    高频问题
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">问题类别</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">工单数</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">平均解决时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.topIssues.map((issue, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{issue.category}</td>
                            <td className="py-2">{issue.count}</td>
                            <td className="py-2">{issue.avgResolutionTime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Engineer Performance */}
            {result.engineerPerformance.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-primary" />
                    工程师效能
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">工程师</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">处理工单</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">评分</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">SLA合规</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.engineerPerformance.map((eng, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{eng.engineer}</td>
                            <td className="py-2">{eng.ticketsHandled}</td>
                            <td className="py-2">{renderStars(eng.avgRating)}</td>
                            <td className="py-2">{eng.slaCompliance}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    AI建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium flex-shrink-0">{idx + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
  );
}
