/**
 * AI生产效率分析 (Production Efficiency)
 * Phase E: OEE分析 · 瓶颈识别 · 产能优化
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp, Loader2, Sparkles, CheckCircle, AlertTriangle, Zap,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PROCESS_STEPS = [
  "T1-BOM确认/备料", "T2-下料/切割", "T3-折弯/成型", "T4-焊接",
  "T5-机加工", "T6-表面处理/抛光", "T7-预装配", "T8-电气接线",
  "T9-管路安装", "T10-系统调试", "T11-清洁度测试", "T12-FAT验收",
  "T13-包装", "T14-发运", "T15-现场SAT",
];

interface EfficiencyResult {
  oeeScore: number;
  bottleneckIdentified: boolean;
  bottleneckDescription: string;
  efficiencyRating: string;
  improvementAreas: Array<{ area: string; currentValue: string; targetValue: string; impact: string }>;
  recommendations: string[];
  estimatedSavings: string;
}

export default function ProductionEfficiency() {
  const [processStep, setProcessStep] = useState(PROCESS_STEPS[0]);
  const [plannedCycleTime, setPlannedCycleTime] = useState("");
  const [actualCycleTime, setActualCycleTime] = useState("");
  const [throughput, setThroughput] = useState("");
  const [downtime, setDowntime] = useState("");
  const [workerCount, setWorkerCount] = useState("");
  const [defectRate, setDefectRate] = useState("");
  const [result, setResult] = useState<EfficiencyResult | null>(null);

  const mutation = trpc.operationsIntelligence.analyzeEfficiency.useMutation({
    onSuccess: (data) => setResult(data as EfficiencyResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!plannedCycleTime || !actualCycleTime || !throughput || !downtime || mutation.isPending) return;
    mutation.mutate({
      processStep,
      plannedCycleTime: Number(plannedCycleTime),
      actualCycleTime: Number(actualCycleTime),
      throughput: Number(throughput),
      downtime: Number(downtime),
      workerCount: workerCount ? Number(workerCount) : undefined,
      defectRate: defectRate ? Number(defectRate) : undefined,
    });
  };

  const oeeColor = (score: number) => {
    if (score >= 85) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const oeeBg = (score: number) => {
    if (score >= 85) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const ratingConfig: Record<string, { label: string; color: string }> = {
    excellent: { label: "优秀", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    good: { label: "良好", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    average: { label: "一般", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    poor: { label: "较差", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={TrendingUp}
          title="AI生产效率分析"
          description="OEE分析 · 瓶颈识别 · 产能优化"
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
              <TrendingUp className="h-5 w-5 text-primary" />
              生产数据
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">工序步骤</label>
                <Select value={processStep} onValueChange={(v) => setProcessStep(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择工序步骤" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCESS_STEPS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">产量(件/班)</label>
                <Input type="number" placeholder="如: 3" value={throughput} onChange={(e) => setThroughput(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">计划节拍(分钟)</label>
                <Input type="number" placeholder="如: 120" value={plannedCycleTime} onChange={(e) => setPlannedCycleTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">实际节拍(分钟)</label>
                <Input type="number" placeholder="如: 145" value={actualCycleTime} onChange={(e) => setActualCycleTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">停机率(%)</label>
                <Input type="number" placeholder="如: 15" value={downtime} onChange={(e) => setDowntime(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">人员数量（可选）</label>
                <Input type="number" placeholder="如: 3" value={workerCount} onChange={(e) => setWorkerCount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">缺陷率(%)（可选）</label>
                <Input type="number" placeholder="如: 2" value={defectRate} onChange={(e) => setDefectRate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!plannedCycleTime || !actualCycleTime || !throughput || !downtime || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                效率分析
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* OEE + Rating */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">OEE综合效率</p>
                  <p className={`text-5xl font-bold ${oeeColor(result.oeeScore)}`}>{result.oeeScore}%</p>
                  <div className="mt-3 w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${oeeBg(result.oeeScore)}`}
                      style={{ width: `${result.oeeScore}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge className={ratingConfig[result.efficiencyRating]?.color || "bg-muted"}>
                      {ratingConfig[result.efficiencyRating]?.label || result.efficiencyRating}
                    </Badge>
                    <span className="text-xs text-muted-foreground">行业优秀: &gt;85%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Bottleneck + Savings */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {result.bottleneckIdentified && (
                    <div className="flex items-start gap-3 p-3 rounded bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-400">瓶颈识别</p>
                        <p className="text-sm text-muted-foreground">{result.bottleneckDescription}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">预估节省</p>
                      <p className="font-medium">{result.estimatedSavings}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Improvement Areas */}
            {result.improvementAreas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    改善领域
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">领域</th>
                          <th className="text-left py-2 pr-4">当前值</th>
                          <th className="text-left py-2 pr-4">目标值</th>
                          <th className="text-left py-2">影响</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.improvementAreas.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{item.area}</td>
                            <td className="py-2 pr-4 text-muted-foreground">{item.currentValue}</td>
                            <td className="py-2 pr-4 text-primary">{item.targetValue}</td>
                            <td className="py-2">{item.impact}</td>
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
  );
}
