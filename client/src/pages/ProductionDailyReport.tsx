/**
 * AI生产日报 (Production Daily Report) — US-018
 * 自动汇总当日生产数据 · 格式化输出 · 重点提示
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
  FileText, Loader2, Sparkles, CheckCircle, AlertTriangle, BarChart3, Settings, Calendar,
} from "lucide-react";

interface DailyReportResult {
  reportDate: string;
  summary: string;
  productionMetrics: Array<{
    metric: string;
    planned: string;
    actual: string;
    achievement: string;
    status: string;
  }>;
  qualitySummary: {
    totalInspected: number;
    passRate: string;
    mainDefects: string[];
  };
  equipmentStatus: Array<{
    equipment: string;
    status: string;
    utilizationRate: string;
    issues: string;
  }>;
  abnormalEvents: Array<{
    time: string;
    event: string;
    status: string;
    impact: string;
  }>;
  tomorrowPlan: string[];
  keyHighlights: string[];
  recommendations: string[];
}

export default function ProductionDailyReport() {
  const [date, setDate] = useState("");
  const [productionData, setProductionData] = useState("");
  const [qualityData, setQualityData] = useState("");
  const [equipmentData, setEquipmentData] = useState("");
  const [abnormalEvents, setAbnormalEvents] = useState("");
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  const [result, setResult] = useState<DailyReportResult | null>(null);

  const mutation = trpc.productionAdvanced.generateDailyReport.useMutation({
    onSuccess: (data) => setResult(data as DailyReportResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!date || !productionData.trim() || !qualityData.trim() || mutation.isPending) return;
    mutation.mutate({
      date,
      productionData,
      qualityData,
      equipmentData: equipmentData || undefined,
      abnormalEvents: abnormalEvents || undefined,
      tomorrowPlan: tomorrowPlan || undefined,
    });
  };

  const metricStatusColor = (status: string) => {
    switch (status) {
      case "above": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "on_target": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "below": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const metricStatusLabel = (status: string) => {
    switch (status) {
      case "above": return "超额";
      case "on_target": return "达标";
      case "below": return "未达标";
      default: return status;
    }
  };

  const equipmentStatusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "idle": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "maintenance": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "fault": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const equipmentStatusLabel = (status: string) => {
    switch (status) {
      case "running": return "运行中";
      case "idle": return "空闲";
      case "maintenance": return "维护";
      case "fault": return "故障";
      default: return status;
    }
  };

  const eventStatusColor = (status: string) => {
    switch (status) {
      case "resolved": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "in_progress": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "pending": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const eventStatusLabel = (status: string) => {
    switch (status) {
      case "resolved": return "已解决";
      case "in_progress": return "处理中";
      case "pending": return "待处理";
      default: return status;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={FileText}
          title="AI生产日报"
          description="自动汇总当日生产数据 · 格式化输出 · 重点提示"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI日报
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-primary" />
              日报数据
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">日期 *</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">生产完成数据 *</label>
                <textarea
                  className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]"
                  placeholder="生产完成数据"
                  value={productionData}
                  onChange={(e) => setProductionData(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">质量检测数据 *</label>
                <textarea
                  className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]"
                  placeholder="质量检测数据"
                  value={qualityData}
                  onChange={(e) => setQualityData(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">设备运行数据（可选）</label>
                <textarea
                  className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                  placeholder="设备运行数据"
                  value={equipmentData}
                  onChange={(e) => setEquipmentData(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">异常事件记录（可选）</label>
                <textarea
                  className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                  placeholder="异常事件记录"
                  value={abnormalEvents}
                  onChange={(e) => setAbnormalEvents(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">明日计划（可选）</label>
                <textarea
                  className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                  placeholder="明日计划"
                  value={tomorrowPlan}
                  onChange={(e) => setTomorrowPlan(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!date || !productionData.trim() || !qualityData.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                生成日报
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Report Date + Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <p className="text-lg font-bold">生产日报 - {result.reportDate}</p>
                </div>
                <p className="text-sm text-muted-foreground">{result.summary}</p>
              </CardContent>
            </Card>

            {/* Production Metrics Table */}
            {result.productionMetrics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    生产指标
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">指标</th>
                          <th className="text-right py-2 pr-4">计划</th>
                          <th className="text-right py-2 pr-4">实际</th>
                          <th className="text-right py-2 pr-4">达成率</th>
                          <th className="text-left py-2">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.productionMetrics.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{item.metric}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.planned}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.actual}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.achievement}</td>
                            <td className="py-2">
                              <Badge className={metricStatusColor(item.status)}>{metricStatusLabel(item.status)}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quality Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  质量汇总
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">检验总数</p>
                    <p className="text-3xl font-bold text-primary">{result.qualitySummary.totalInspected}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">合格率</p>
                    <p className="text-3xl font-bold text-green-400">{result.qualitySummary.passRate}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">主要缺陷</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.qualitySummary.mainDefects.map((defect, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{defect}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Equipment Status Table */}
            {result.equipmentStatus.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="h-5 w-5 text-primary" />
                    设备状态
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">设备</th>
                          <th className="text-left py-2 pr-4">状态</th>
                          <th className="text-right py-2 pr-4">利用率</th>
                          <th className="text-left py-2">问题</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.equipmentStatus.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{item.equipment}</td>
                            <td className="py-2 pr-4">
                              <Badge className={equipmentStatusColor(item.status)}>{equipmentStatusLabel(item.status)}</Badge>
                            </td>
                            <td className="py-2 pr-4 text-right font-mono">{item.utilizationRate}</td>
                            <td className="py-2 text-muted-foreground">{item.issues || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Abnormal Events Table */}
            {result.abnormalEvents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    异常事件 ({result.abnormalEvents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">时间</th>
                          <th className="text-left py-2 pr-4">事件</th>
                          <th className="text-left py-2 pr-4">状态</th>
                          <th className="text-left py-2">影响</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.abnormalEvents.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-mono text-xs">{item.time}</td>
                            <td className="py-2 pr-4 font-medium">{item.event}</td>
                            <td className="py-2 pr-4">
                              <Badge className={eventStatusColor(item.status)}>{eventStatusLabel(item.status)}</Badge>
                            </td>
                            <td className="py-2 text-muted-foreground">{item.impact}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tomorrow Plan */}
            {result.tomorrowPlan.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-5 w-5 text-primary" />
                    明日计划
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.tomorrowPlan.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium flex-shrink-0">{idx + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Key Highlights */}
            {result.keyHighlights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-5 w-5 text-yellow-400" />
                    重点提示
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.keyHighlights.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
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
