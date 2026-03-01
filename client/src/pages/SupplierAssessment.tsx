/**
 * AI供应商智能评估 (Supplier Assessment)
 * Phase E: 供应商绩效评分 · 风险识别 · 优化建议
 */
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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

interface AssessmentResult {
  overallScore: number;
  grade: string;
  strengths: string[];
  risks: Array<{ risk: string; severity: string; mitigation: string }>;
  recommendations: string[];
  comparisonBenchmark: string;
}

export default function SupplierAssessment() {
  const { t } = useLanguage();

  const CATEGORIES = [
    { value: "泵阀", label: t("supply.supplier.catPumpValve") },
    { value: "电气", label: t("supply.supplier.catElectrical") },
    { value: "结构件", label: t("supply.supplier.catStructural") },
    { value: "标准件", label: t("supply.supplier.catStandard") },
    { value: "密封件", label: t("supply.supplier.catSeal") },
  ];

  const PRICE_OPTIONS = [
    { value: "high", label: t("supply.supplier.high") },
    { value: "medium", label: t("supply.supplier.medium") },
    { value: "low", label: t("supply.supplier.low") },
  ];

  const RESPONSE_OPTIONS = [
    { value: "fast", label: t("supply.supplier.fast") },
    { value: "normal", label: t("supply.supplier.normal") },
    { value: "slow", label: t("supply.supplier.slow") },
  ];

  const [supplierName, setSupplierName] = useState("");
  const [category, setCategory] = useState("泵阀");
  const [deliveryOnTime, setDeliveryOnTime] = useState("");
  const [qualityPassRate, setQualityPassRate] = useState("");
  const [avgLeadDays, setAvgLeadDays] = useState("");
  const [priceCompetitiveness, setPriceCompetitiveness] = useState("");
  const [responseTime, setResponseTime] = useState("");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);

  const mutation = trpc.operationsIntelligence.assessSupplier.useMutation({
    onSuccess: (data) => setTaskId(data.taskId),
    onError: () => setResult(null),
  });

  const taskQuery = trpc.operationsIntelligence.getTaskResult.useQuery(
    { taskId: taskId! },
    {
      enabled: !!taskId,
      refetchInterval: (query) =>
        query.state.data?.taskStatus === "completed" || query.state.data?.taskStatus === "failed"
          ? false
          : 2000,
    },
  );

  useEffect(() => {
    if (taskQuery.data?.taskStatus === "completed" && taskQuery.data.result) {
      setResult(taskQuery.data.result as unknown as AssessmentResult);
      setTaskId(null);
    } else if (taskQuery.data?.taskStatus === "failed") {
      setResult(null);
      setTaskId(null);
    }
  }, [taskQuery.data]);

  const handleSubmit = () => {
    if (!supplierName.trim() || !deliveryOnTime || !qualityPassRate || !avgLeadDays || mutation.isPending || !!taskId) return;
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
      case "high": return t("supply.supplier.high");
      case "medium": return t("supply.supplier.medium");
      case "low": return t("supply.supplier.low");
      default: return s;
    }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Truck}
          title={t("supply.supplier.pageTitle")}
          description={t("supply.supplier.pageDesc")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("supply.supplier.aiBadge")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-5 w-5 text-primary" />
              {t("supply.supplier.supplierInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("supply.supplier.supplierName")}</label>
                <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("supply.supplier.supplyCategory")}</label>
                <Select value={category} onValueChange={(v) => setCategory(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("supply.supplier.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("supply.supplier.onTimeRate")}</label>
                <Input type="number" value={deliveryOnTime} onChange={(e) => setDeliveryOnTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("supply.supplier.qualityPassRate")}</label>
                <Input type="number" value={qualityPassRate} onChange={(e) => setQualityPassRate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("supply.supplier.avgLeadDays")}</label>
                <Input type="number" value={avgLeadDays} onChange={(e) => setAvgLeadDays(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("supply.supplier.priceCompetitiveness")}</label>
                <Select value={priceCompetitiveness || "__unspecified__"} onValueChange={(v) => setPriceCompetitiveness(v === "__unspecified__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("supply.supplier.unspecified")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unspecified__">{t("supply.supplier.unspecified")}</SelectItem>
                    {PRICE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("supply.supplier.responseSpeed")}</label>
                <Select value={responseTime || "__unspecified__"} onValueChange={(v) => setResponseTime(v === "__unspecified__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("supply.supplier.unspecified")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unspecified__">{t("supply.supplier.unspecified")}</SelectItem>
                    {RESPONSE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!supplierName.trim() || !deliveryOnTime || !qualityPassRate || !avgLeadDays || mutation.isPending || !!taskId}>
                {mutation.isPending || !!taskId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("supply.supplier.aiAssess")}
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
                    <p className="text-sm text-muted-foreground">{t("supply.supplier.overallScore")}</p>
                    <p className={`text-5xl font-bold ${scoreColor(result.overallScore)}`}>{result.overallScore}</p>
                  </div>
                  <Badge className={`text-2xl px-4 py-2 ${gradeColor(result.grade)}`}>{result.grade}{t("supply.supplier.grade")}</Badge>
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
                    {t("supply.supplier.strengths")}
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
                    {t("supply.supplier.riskIdentification")}
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
                    {t("supply.supplier.aiSuggestions")}
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
