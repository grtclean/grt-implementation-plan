/**
 * AI供应商智能评估 (Supplier Assessment)
 * Phase E: 供应商绩效评分 · 风险识别 · 优化建议
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Truck, Loader2, CheckCircle, AlertTriangle, Sparkles, Shield,
} from "lucide-react";

const CATEGORIES = [
  { value: "泵阀", label: "泵阀" },
  { value: "电气", label: "电气元件" },
  { value: "结构件", label: "结构件" },
  { value: "标准件", label: "标准件" },
  { value: "密封件", label: "密封件" },
];

const PRICE_OPTIONS = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

const RESPONSE_OPTIONS = [
  { value: "fast", label: "快" },
  { value: "normal", label: "一般" },
  { value: "slow", label: "慢" },
];

interface AssessmentResult {
  overallScore: number;
  grade: string;
  strengths: string[];
  risks: Array<{ risk: string; severity: string; mitigation: string }>;
  recommendations: string[];
  comparisonBenchmark: string;
}

export default function SupplierAssessment() {
  const [supplierName, setSupplierName] = useState("");
  const [category, setCategory] = useState("泵阀");
  const [deliveryOnTime, setDeliveryOnTime] = useState("");
  const [qualityPassRate, setQualityPassRate] = useState("");
  const [avgLeadDays, setAvgLeadDays] = useState("");
  const [priceCompetitiveness, setPriceCompetitiveness] = useState("");
  const [responseTime, setResponseTime] = useState("");
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const mutation = trpc.operationsIntelligence.assessSupplier.useMutation({
    onSuccess: (data) => setResult(data as AssessmentResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!supplierName.trim() || !deliveryOnTime || !qualityPassRate || !avgLeadDays || mutation.isPending) return;
    mutation.mutate({
      supplierName,
      category,
      deliveryOnTime: Number(deliveryOnTime),
      qualityPassRate: Number(qualityPassRate),
      avgLeadDays: Number(avgLeadDays),
      priceCompetitiveness: priceCompetitiveness || undefined,
      responseTime: responseTime || undefined,
    });
  };

  const gradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "B": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "C": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "D": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 75) return "text-blue-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const severityLabel = (s: string) => {
    switch (s) {
      case "high": return "高";
      case "medium": return "中";
      case "low": return "低";
      default: return s;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Truck}
          title="AI供应商智能评估"
          description="供应商绩效评分 · 风险识别 · 优化建议"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI评估
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-5 w-5 text-primary" />
              供应商信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">供应商名称</label>
                <Input placeholder="如: 上海某泵业有限公司" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">供应类别</label>
                <Select value={category} onValueChange={(v) => setCategory(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择供应类别" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">准时交付率(%)</label>
                <Input type="number" placeholder="如: 95" value={deliveryOnTime} onChange={(e) => setDeliveryOnTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">质量合格率(%)</label>
                <Input type="number" placeholder="如: 98" value={qualityPassRate} onChange={(e) => setQualityPassRate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">平均交期(天)</label>
                <Input type="number" placeholder="如: 14" value={avgLeadDays} onChange={(e) => setAvgLeadDays(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">价格竞争力（可选）</label>
                <Select value={priceCompetitiveness || "__unspecified__"} onValueChange={(v) => setPriceCompetitiveness(v === "__unspecified__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="不指定" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unspecified__">不指定</SelectItem>
                    {PRICE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">响应速度（可选）</label>
                <Select value={responseTime || "__unspecified__"} onValueChange={(v) => setResponseTime(v === "__unspecified__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="不指定" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unspecified__">不指定</SelectItem>
                    {RESPONSE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!supplierName.trim() || !deliveryOnTime || !qualityPassRate || !avgLeadDays || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI评估
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Score + Grade */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">综合评分</p>
                    <p className={`text-5xl font-bold ${scoreColor(result.overallScore)}`}>{result.overallScore}</p>
                  </div>
                  <Badge className={`text-2xl px-4 py-2 ${gradeColor(result.grade)}`}>{result.grade}级</Badge>
                </div>
                <div className="mt-3 w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${result.overallScore >= 90 ? "bg-green-500" : result.overallScore >= 75 ? "bg-blue-500" : result.overallScore >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${result.overallScore}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">{result.comparisonBenchmark}</p>
              </CardContent>
            </Card>

            {/* Strengths */}
            {result.strengths.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    优势亮点
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Risks */}
            {result.risks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    风险识别
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.risks.map((r, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded bg-muted/50">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{r.risk}</span>
                            <Badge className={severityColor(r.severity)}>{severityLabel(r.severity)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{r.mitigation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-5 w-5 text-primary" />
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
