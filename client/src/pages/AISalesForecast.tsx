/**
 * AI销售预测 (AI Sales Forecast)
 * Phase G: 营收预测 · 季度拆分 · 增长驱动 · 风险评估
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
  TrendingUp, Loader2, Sparkles, AlertTriangle, ArrowUpRight, ArrowDownRight,
  BarChart3, Target,
} from "lucide-react";

const BUS = ["海外", "商用车", "乘用车", "半导体", "工业通用"];
const PRODUCTS = ["碳氢真空清洗机", "水基清洗线", "超声波清洗机", "定制设备"];
const SEASONS = [
  { value: "Q1淡季", label: "Q1淡季" },
  { value: "Q2平季", label: "Q2平季" },
  { value: "Q3平季", label: "Q3平季" },
  { value: "Q4旺季", label: "Q4旺季" },
];
const MARKET_CONDITIONS = ["增长", "平稳", "收缩"];
const TIME_HORIZONS = ["Q1", "Q2", "H1", "全年"];

interface ForecastResult {
  forecastRevenue: number;
  confidenceLevel: number;
  quarterlyBreakdown: Array<{ quarter: string; revenue: number; probability: number }>;
  growthRate: number;
  keyDrivers: string[];
  risks: Array<{ risk: string; impact: string; probability: number }>;
  recommendations: string[];
}

export default function AISalesForecast() {
  const [businessUnit, setBusinessUnit] = useState(BUS[0]);
  const [productLine, setProductLine] = useState(PRODUCTS[0]);
  const [historicalRevenue, setHistoricalRevenue] = useState("");
  const [currentPipeline, setCurrentPipeline] = useState("");
  const [seasonality, setSeasonality] = useState("");
  const [marketCondition, setMarketCondition] = useState("");
  const [timeHorizon, setTimeHorizon] = useState("");
  const [result, setResult] = useState<ForecastResult | null>(null);

  const mutation = trpc.salesFinanceIntelligence.forecastSales.useMutation({
    onSuccess: (data) => setResult(data as ForecastResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!historicalRevenue || !currentPipeline || mutation.isPending) return;
    mutation.mutate({
      businessUnit,
      productLine,
      historicalRevenue: Number(historicalRevenue),
      currentPipeline: Number(currentPipeline),
      seasonality: seasonality || undefined,
      marketCondition: marketCondition || undefined,
      timeHorizon: timeHorizon || undefined,
    });
  };

  const confidenceColor = (level: number) => {
    if (level >= 80) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (level >= 60) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (level >= 40) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const impactColor = (impact: string) => {
    if (impact.includes("高") || impact === "high") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (impact.includes("中") || impact === "medium") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-green-500/20 text-green-400 border-green-500/30";
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={TrendingUp}
          title="AI销售预测"
          description="营收预测 · 季度拆分 · 增长驱动 · 风险评估"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI预测
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              销售预测参数
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">事业部</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={businessUnit} onChange={(e) => setBusinessUnit(e.target.value)}>
                  {BUS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">产品线</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={productLine} onChange={(e) => setProductLine(e.target.value)}>
                  {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">历史营收 (万元)</label>
                <Input type="number" placeholder="如: 5000" value={historicalRevenue} onChange={(e) => setHistoricalRevenue(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">当前在谈商机 (万元)</label>
                <Input type="number" placeholder="如: 3000" value={currentPipeline} onChange={(e) => setCurrentPipeline(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">季节性（可选）</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={seasonality} onChange={(e) => setSeasonality(e.target.value)}>
                  <option value="">不指定</option>
                  {SEASONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">市场状况（可选）</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={marketCondition} onChange={(e) => setMarketCondition(e.target.value)}>
                  <option value="">不指定</option>
                  {MARKET_CONDITIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">预测周期（可选）</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={timeHorizon} onChange={(e) => setTimeHorizon(e.target.value)}>
                  <option value="">不指定</option>
                  {TIME_HORIZONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!historicalRevenue || !currentPipeline || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI预测
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Forecast Revenue + Confidence */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">预测营收</p>
                    <p className="text-5xl font-bold text-primary">{result.forecastRevenue.toLocaleString()}<span className="text-lg text-muted-foreground ml-1">万元</span></p>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge className={confidenceColor(result.confidenceLevel)}>置信度 {result.confidenceLevel}%</Badge>
                    <div className="flex items-center gap-1 text-sm">
                      {result.growthRate >= 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-green-400" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-400" />
                      )}
                      <span className={result.growthRate >= 0 ? "text-green-400" : "text-red-400"}>
                        {result.growthRate > 0 ? "+" : ""}{result.growthRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quarterly Breakdown */}
            {result.quarterlyBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    季度预测拆分
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-muted-foreground font-medium">季度</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">预测营收 (万元)</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">达成概率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.quarterlyBreakdown.map((q, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{q.quarter}</td>
                            <td className="py-2 text-right">{q.revenue.toLocaleString()}</td>
                            <td className="py-2 text-right">
                              <Badge className={confidenceColor(q.probability)}>{q.probability}%</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Drivers */}
            {result.keyDrivers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-5 w-5 text-green-400" />
                    增长驱动因素
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.keyDrivers.map((driver, idx) => (
                      <Badge key={idx} variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">{driver}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risks */}
            {result.risks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    风险评估
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-muted-foreground font-medium">风险项</th>
                          <th className="text-center py-2 text-muted-foreground font-medium">影响程度</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">发生概率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.risks.map((r, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2">{r.risk}</td>
                            <td className="py-2 text-center">
                              <Badge className={impactColor(r.impact)}>{r.impact}</Badge>
                            </td>
                            <td className="py-2 text-right">{r.probability}%</td>
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
                    <Sparkles className="h-5 w-5 text-primary" />
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
