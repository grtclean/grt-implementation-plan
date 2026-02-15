/**
 * AI质量月报 (Quality Monthly Report) — US-023
 * 自动汇总月度质量指标 · 缺陷Pareto · NCR趋势 · 管理层报告
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  BarChart3, Loader2, Sparkles, CheckCircle, AlertTriangle, TrendingUp, TrendingDown,
  Minus, FileText, ClipboardList, ArrowUpDown,
} from "lucide-react";

interface QualityMonthlyReportResult {
  reportMonth: string;
  executiveSummary: string;
  overallPassRate: number;
  metrics: Array<{
    metric: string;
    value: string;
    target: string;
    status: string;
    trend: string;
  }>;
  defectPareto: Array<{
    defectType: string;
    count: number;
    percentage: string;
    cumulativePercent: string;
  }>;
  ncrSummary: {
    total: number;
    open: number;
    closed: number;
    avgClosureTime: string;
  };
  customerComplaintSummary: string;
  monthOverMonth: Array<{
    metric: string;
    thisMonth: string;
    lastMonth: string;
    change: string;
  }>;
  actionItems: Array<{
    item: string;
    owner: string;
    deadline: string;
  }>;
  recommendations: string[];
}

export default function QualityMonthlyReport() {
  const [month, setMonth] = useState("");
  const [inspectionData, setInspectionData] = useState("");
  const [defectData, setDefectData] = useState("");
  const [ncrData, setNcrData] = useState("");
  const [customerComplaints, setCustomerComplaints] = useState("");
  const [previousMonthData, setPreviousMonthData] = useState("");
  const [result, setResult] = useState<QualityMonthlyReportResult | null>(null);

  const mutation = trpc.p2Automation.generateQualityMonthlyReport.useMutation({
    onSuccess: (data) => setResult(data as QualityMonthlyReportResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!month.trim() || !inspectionData.trim() || !defectData.trim() || mutation.isPending) return;
    mutation.mutate({
      month,
      inspectionData,
      defectData,
      ncrData: ncrData || undefined,
      customerComplaints: customerComplaints || undefined,
      previousMonthData: previousMonthData || undefined,
    });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "met": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "at_risk": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "missed": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "met": return "达标";
      case "at_risk": return "风险";
      case "missed": return "未达标";
      default: return status;
    }
  };

  const trendIcon = (trend: string) => {
    if (trend === "up" || trend.includes("↑")) return <TrendingUp className="h-4 w-4 text-green-400" />;
    if (trend === "down" || trend.includes("↓")) return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const passRateColor = (rate: number) => {
    if (rate >= 98) return "text-green-400";
    if (rate >= 95) return "text-yellow-400";
    return "text-red-400";
  };

  const changeColor = (change: string) => {
    if (change.startsWith("+") || change.includes("改善") || change.includes("提升") || change.includes("↑")) return "text-green-400";
    if (change.startsWith("-") || change.includes("下降") || change.includes("恶化") || change.includes("↓")) return "text-red-400";
    return "text-muted-foreground";
  };

  const maxDefectCount = result?.defectPareto?.length
    ? Math.max(...result.defectPareto.map((d) => d.count))
    : 1;

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={BarChart3}
          title="AI质量月报"
          description="自动汇总月度质量指标 · 缺陷Pareto · NCR趋势 · 管理层报告"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI月报
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              月报数据
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">月份 *</label>
              <Input
                placeholder="如: 2026年2月"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">检验数据汇总 *</label>
                <textarea
                  className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]"
                  placeholder="检验数据汇总"
                  value={inspectionData}
                  onChange={(e) => setInspectionData(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">缺陷数据 *</label>
                <textarea
                  className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]"
                  placeholder="缺陷数据"
                  value={defectData}
                  onChange={(e) => setDefectData(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">NCR数据（可选）</label>
                <textarea
                  className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                  placeholder="NCR数据"
                  value={ncrData}
                  onChange={(e) => setNcrData(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">客户投诉数据（可选）</label>
                <textarea
                  className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                  placeholder="客户投诉数据"
                  value={customerComplaints}
                  onChange={(e) => setCustomerComplaints(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">上月数据（可选，用于环比）</label>
                <textarea
                  className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                  placeholder="上月数据(用于环比)"
                  value={previousMonthData}
                  onChange={(e) => setPreviousMonthData(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!month.trim() || !inspectionData.trim() || !defectData.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                生成月报
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Report Header + Executive Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <p className="text-lg font-bold">质量月报 - {result.reportMonth}</p>
                </div>
                <p className="text-sm text-muted-foreground">{result.executiveSummary}</p>
              </CardContent>
            </Card>

            {/* Overall Pass Rate */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center flex-col py-4">
                  <p className="text-sm text-muted-foreground mb-2">整体合格率</p>
                  <p className={`text-6xl font-bold ${passRateColor(result.overallPassRate)}`}>
                    {result.overallPassRate}%
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Metrics Table */}
            {result.metrics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    质量指标
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">指标</th>
                          <th className="text-right py-2 pr-4">实际值</th>
                          <th className="text-right py-2 pr-4">目标值</th>
                          <th className="text-left py-2 pr-4">状态</th>
                          <th className="text-center py-2">趋势</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.metrics.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{item.metric}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.value}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.target}</td>
                            <td className="py-2 pr-4">
                              <Badge className={statusColor(item.status)}>{statusLabel(item.status)}</Badge>
                            </td>
                            <td className="py-2 text-center">{trendIcon(item.trend)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Defect Pareto Table */}
            {result.defectPareto.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    缺陷Pareto分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">缺陷类型</th>
                          <th className="text-right py-2 pr-4">数量</th>
                          <th className="text-left py-2 pr-4 w-1/3">占比</th>
                          <th className="text-right py-2">累计占比</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.defectPareto.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{item.defectType}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.count}</td>
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-5 bg-muted/30 rounded overflow-hidden">
                                  <div
                                    className="h-full bg-primary/60 rounded"
                                    style={{ width: `${(item.count / maxDefectCount) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-12 text-right">{item.percentage}</span>
                              </div>
                            </td>
                            <td className="py-2 text-right font-mono">{item.cumulativePercent}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* NCR Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  NCR汇总
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">NCR总数</p>
                    <p className="text-3xl font-bold text-primary">{result.ncrSummary.total}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">开放中</p>
                    <p className="text-3xl font-bold text-yellow-400">{result.ncrSummary.open}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">已关闭</p>
                    <p className="text-3xl font-bold text-green-400">{result.ncrSummary.closed}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">平均关闭时间</p>
                    <p className="text-2xl font-bold text-blue-400">{result.ncrSummary.avgClosureTime}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Complaint Summary */}
            {result.customerComplaintSummary && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-muted-foreground mb-2">客户投诉汇总</p>
                  <p className="text-sm">{result.customerComplaintSummary}</p>
                </CardContent>
              </Card>
            )}

            {/* Month-over-Month Comparison */}
            {result.monthOverMonth.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ArrowUpDown className="h-5 w-5 text-primary" />
                    环比对比
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">指标</th>
                          <th className="text-right py-2 pr-4">本月</th>
                          <th className="text-right py-2 pr-4">上月</th>
                          <th className="text-right py-2">变化</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.monthOverMonth.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{item.metric}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.thisMonth}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.lastMonth}</td>
                            <td className={`py-2 text-right font-mono font-medium ${changeColor(item.change)}`}>
                              {item.change}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Items */}
            {result.actionItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    行动项
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">事项</th>
                          <th className="text-left py-2 pr-4">负责人</th>
                          <th className="text-left py-2">截止日期</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.actionItems.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{item.item}</td>
                            <td className="py-2 pr-4">{item.owner}</td>
                            <td className="py-2 text-muted-foreground">{item.deadline}</td>
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
                    <CheckCircle className="h-5 w-5 text-green-400" />
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
    </Layout>
  );
}
