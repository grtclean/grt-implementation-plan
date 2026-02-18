/**
 * SPC统计过程控制 (SPC Control Charts)
 * US-008: 控制图分析 · Cp/Cpk计算 · 过程能力评估 · 异常模式识别
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3, Loader2, Sparkles, AlertTriangle, CheckCircle, TrendingUp,
} from "lucide-react";

const CHART_TYPES = [
  { value: "X-bar-R", label: "X-bar-R 控制图" },
  { value: "X-bar-S", label: "X-bar-S 控制图" },
  { value: "Individual-MR", label: "Individual-MR 控制图" },
  { value: "p-chart", label: "p 控制图" },
  { value: "c-chart", label: "c 控制图" },
];

interface SPCResult {
  processName: string;
  parameter: string;
  controlLimits: {
    ucl: number;
    cl: number;
    lcl: number;
    usl: number;
    lsl: number;
  };
  cpk: number;
  cp: number;
  ppk: number;
  processCapability: string;
  outOfControlPoints: Array<{
    point: number;
    value: number;
    rule: string;
    description: string;
  }>;
  patterns: Array<{
    pattern: string;
    description: string;
    startPoint: number;
    endPoint: number;
  }>;
  dataPoints: Array<{
    index: number;
    value: number;
    subgroupMean: number;
    subgroupRange: number;
  }>;
  recommendations: string[];
}

export default function SPCControlCharts() {
  // Form state
  const [processName, setProcessName] = useState("");
  const [measurementParameter, setMeasurementParameter] = useState("");
  const [sampleData, setSampleData] = useState("");
  const [specification, setSpecification] = useState("");
  const [subgroupSize, setSubgroupSize] = useState("");
  const [chartType, setChartType] = useState("X-bar-R");

  // Result state
  const [result, setResult] = useState<SPCResult | null>(null);

  // Mutation
  const mutation = trpc.qualityAdvanced.analyzeSPC.useMutation({
    onSuccess: (data) => setResult(data as unknown as SPCResult),
  });

  const handleSubmit = () => {
    if (!processName.trim() || !measurementParameter.trim() || !sampleData.trim() || !specification.trim() || mutation.isPending) return;
    mutation.mutate({
      processName,
      measurementParameter,
      sampleData,
      specification,
      subgroupSize: subgroupSize ? Number(subgroupSize) : undefined,
      chartType: chartType || undefined,
    });
  };

  const cpkColor = (cpk: number) => {
    if (cpk >= 1.33) return "text-green-400";
    if (cpk >= 1.0) return "text-yellow-400";
    return "text-red-400";
  };

  const cpkBadgeColor = (capability: string) => {
    if (capability.includes("充足") || capability.includes("优")) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (capability.includes("临界") || capability.includes("一般")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={BarChart3}
          title="SPC统计过程控制"
          description="控制图分析 · Cp/Cpk计算 · 过程能力评估 · 异常模式识别"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI质检
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              过程数据输入
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">过程名称 *</label>
                <Input placeholder="如: CNC内径加工" value={processName} onChange={(e) => setProcessName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">测量参数 *</label>
                <Input placeholder="如: 内径尺寸" value={measurementParameter} onChange={(e) => setMeasurementParameter(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">规格要求 *</label>
                <Input placeholder="如: 10.00±0.05" value={specification} onChange={(e) => setSpecification(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">样本数据 *</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder="样本数据，逗号分隔: 10.02, 10.05, 9.98, 10.01..." value={sampleData} onChange={(e) => setSampleData(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">子组大小（默认5）</label>
                <Input type="number" placeholder="5" value={subgroupSize} onChange={(e) => setSubgroupSize(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">控制图类型</label>
                <Select value={chartType} onValueChange={(v) => setChartType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择控制图类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!processName.trim() || !measurementParameter.trim() || !sampleData.trim() || !specification.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                SPC分析
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Cpk Overview */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">过程能力指数 Cpk</p>
                    <p className={`text-5xl font-bold ${cpkColor(result.cpk)}`}>{result.cpk.toFixed(2)}</p>
                  </div>
                  <Badge className={`text-lg px-4 py-2 ${cpkBadgeColor(result.processCapability)}`}>
                    {result.processCapability}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Cp</p>
                    <p className={`text-2xl font-bold ${cpkColor(result.cp)}`}>{result.cp.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Cpk</p>
                    <p className={`text-2xl font-bold ${cpkColor(result.cpk)}`}>{result.cpk.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Ppk</p>
                    <p className={`text-2xl font-bold ${cpkColor(result.ppk)}`}>{result.ppk.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Control Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  控制限与规格限
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-xs text-muted-foreground">UCL (上控制限)</p>
                    <p className="text-lg font-bold text-red-400">{result.controlLimits.ucl.toFixed(4)}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">USL (上规格限)</p>
                    <p className="text-lg font-bold">{result.controlLimits.usl.toFixed(4)}</p>
                  </div>
                  <div className="p-3 rounded bg-green-500/10 border border-green-500/20 text-center">
                    <p className="text-xs text-muted-foreground">CL (中心线)</p>
                    <p className="text-lg font-bold text-green-400">{result.controlLimits.cl.toFixed(4)}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">LSL (下规格限)</p>
                    <p className="text-lg font-bold">{result.controlLimits.lsl.toFixed(4)}</p>
                  </div>
                  <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-xs text-muted-foreground">LCL (下控制限)</p>
                    <p className="text-lg font-bold text-red-400">{result.controlLimits.lcl.toFixed(4)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Points Visualization */}
            {result.dataPoints.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    数据点分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {result.dataPoints.map((dp) => {
                      const range = result.controlLimits.ucl - result.controlLimits.lcl;
                      const pos = range > 0 ? ((dp.value - result.controlLimits.lcl) / range) * 100 : 50;
                      const clamped = Math.max(0, Math.min(100, pos));
                      const isOOC = result.outOfControlPoints.some((o) => o.point === dp.index);
                      return (
                        <div key={dp.index} className="flex items-center gap-2">
                          <span className="text-xs w-8 text-muted-foreground text-right">{dp.index}</span>
                          <div className="flex-1 h-3 bg-muted rounded relative">
                            {/* CL marker */}
                            <div className="absolute top-0 h-full border-r border-dashed border-green-500/50" style={{ left: "50%" }} />
                            {/* Data point */}
                            <div
                              className={`absolute top-0 h-full w-1.5 rounded ${isOOC ? "bg-red-500" : "bg-primary"}`}
                              style={{ left: `${clamped}%` }}
                            />
                          </div>
                          <span className={`text-xs w-16 text-right ${isOOC ? "text-red-400 font-medium" : "text-muted-foreground"}`}>
                            {dp.value.toFixed(3)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Out of Control Points */}
            {result.outOfControlPoints.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    失控点
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium text-muted-foreground">数据点</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">测量值</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">违反规则</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.outOfControlPoints.map((p, idx) => (
                        <tr key={idx} className="border-b border-muted/50">
                          <td className="py-2 font-medium">#{p.point}</td>
                          <td className="py-2 text-red-400 font-medium">{p.value.toFixed(4)}</td>
                          <td className="py-2">
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{p.rule}</Badge>
                          </td>
                          <td className="py-2 text-muted-foreground">{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Patterns Detected */}
            {result.patterns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-yellow-400" />
                    异常模式识别
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {result.patterns.map((p, idx) => (
                      <li key={idx} className="p-3 rounded bg-yellow-500/5 border border-yellow-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{p.pattern}</Badge>
                          <span className="text-xs text-muted-foreground">数据点 {p.startPoint} - {p.endPoint}</span>
                        </div>
                        <p className="text-sm">{p.description}</p>
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
                    <CheckCircle className="h-5 w-5 text-primary" />
                    AI建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium flex-shrink-0">{i + 1}.</span>
                        <span>{r}</span>
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
