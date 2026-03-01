/**
 * AI质量趋势预测 (Quality Prediction)
 * Phase E: 缺陷预测 · 根因分析 · 预防措施
 */
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Shield, Loader2, Sparkles, CheckCircle, AlertTriangle, TrendingDown, TrendingUp, Minus,
} from "lucide-react";

interface PredictionResult {
  trendDirection: string;
  predictedDefectRate: number;
  confidenceLevel: number;
  rootCauseAnalysis: Array<{ cause: string; probability: number; impact: string }>;
  preventiveActions: string[];
  qualityScore: number;
}

export default function QualityPrediction() {
  const { t } = useLanguage();
  const [processName, setProcessName] = useState("");
  const [recentDefectRate, setRecentDefectRate] = useState("");
  const [inspectionCount, setInspectionCount] = useState("");
  const [defectTypes, setDefectTypes] = useState("");
  const [materialBatch, setMaterialBatch] = useState("");
  const [equipmentAge, setEquipmentAge] = useState("");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);

  const mutation = trpc.operationsIntelligence.predictQuality.useMutation({
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
      setResult(taskQuery.data.result as unknown as PredictionResult);
      setTaskId(null);
    } else if (taskQuery.data?.taskStatus === "failed") {
      setResult(null);
      setTaskId(null);
    }
  }, [taskQuery.data]);

  const handleSubmit = () => {
    if (!processName.trim() || !recentDefectRate || !inspectionCount || mutation.isPending || !!taskId) return;
    mutation.mutate({
      processName,
      recentDefectRate: Number(recentDefectRate),
      inspectionCount: Number(inspectionCount),
      defectTypes: defectTypes || undefined,
      materialBatch: materialBatch || undefined,
      equipmentAge: equipmentAge ? Number(equipmentAge) : undefined,
    });
  };

  const trendConfig: Record<string, { label: string; color: string; icon: typeof TrendingUp }> = {
    improving: { label: t("quality.prediction.trendImproving"), color: "bg-green-500/20 text-green-400 border-green-500/30", icon: TrendingUp },
    stable: { label: t("quality.prediction.trendStable"), color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Minus },
    declining: { label: t("quality.prediction.trendDeclining"), color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: TrendingDown },
    critical: { label: t("quality.prediction.trendAlert"), color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle },
  };

  const scoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 75) return "text-blue-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const scoreBg = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 75) return "bg-blue-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const impactColor = (impact: string) => {
    if (impact.includes("高") || impact.includes("严重")) return "text-red-400";
    if (impact.includes("中")) return "text-yellow-400";
    return "text-green-400";
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Shield}
          title={t("quality.prediction.title")}
          description={t("quality.prediction.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("quality.prediction.aiPrediction")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-primary" />
              {t("quality.prediction.qualityData")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.prediction.processName")}</label>
                <Input placeholder="e.g. T4" value={processName} onChange={(e) => setProcessName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.prediction.recentDefectRate")}</label>
                <Input type="number" placeholder="e.g. 3.5" value={recentDefectRate} onChange={(e) => setRecentDefectRate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.prediction.inspectionCount")}</label>
                <Input type="number" placeholder="e.g. 200" value={inspectionCount} onChange={(e) => setInspectionCount(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.prediction.defectType")}</label>
                <Input placeholder="e.g. porosity,crack,deformation" value={defectTypes} onChange={(e) => setDefectTypes(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.prediction.materialBatch")}</label>
                <Input placeholder="e.g. SS316L-2026-02" value={materialBatch} onChange={(e) => setMaterialBatch(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.prediction.equipmentAge")}</label>
                <Input type="number" placeholder="e.g. 5" value={equipmentAge} onChange={(e) => setEquipmentAge(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!processName.trim() || !recentDefectRate || !inspectionCount || mutation.isPending || !!taskId}>
                {mutation.isPending || !!taskId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("quality.prediction.predictiveAnalysis")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Trend + Quality Score */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("quality.prediction.trendDirection")}</p>
                      {(() => {
                        const cfg = trendConfig[result.trendDirection];
                        const Icon = cfg?.icon || Minus;
                        return (
                          <div className="flex items-center gap-2 mt-1">
                            <Icon className="h-6 w-6" />
                            <Badge className={`text-lg px-3 py-1 ${cfg?.color || "bg-muted"}`}>
                              {cfg?.label || result.trendDirection}
                            </Badge>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{t("quality.prediction.predictedDefectRate")}</p>
                      <p className="text-2xl font-bold">{result.predictedDefectRate}%</p>
                      <p className="text-xs text-muted-foreground">{t("quality.prediction.confidence")} {result.confidenceLevel}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">{t("quality.prediction.qualityScore")}</p>
                  <p className={`text-5xl font-bold ${scoreColor(result.qualityScore)}`}>{result.qualityScore}</p>
                  <div className="mt-3 w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${scoreBg(result.qualityScore)}`}
                      style={{ width: `${result.qualityScore}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Root Cause Analysis */}
            {result.rootCauseAnalysis.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    {t("quality.prediction.rootCauseAnalysis")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.rootCauseAnalysis.map((item, idx) => (
                      <div key={idx} className="p-3 rounded bg-muted/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{item.cause}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{t("quality.prediction.probability")} {item.probability}%</Badge>
                            <span className={`text-sm font-medium ${impactColor(item.impact)}`}>{item.impact}</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${item.probability}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preventive Actions */}
            {result.preventiveActions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    {t("quality.prediction.preventiveMeasures")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.preventiveActions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium flex-shrink-0">{idx + 1}.</span>
                        <span>{action}</span>
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
