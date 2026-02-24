/**
 * 项目风险预测 (Project Risk Prediction)
 * Phase D: AI智能分析 · 历史数据驱动 · 早期预警
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  ShieldAlert, Loader2, AlertTriangle, CheckCircle, TrendingUp,
  Sparkles, Target,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

const STAGES = [
  "M0", "M1", "M2", "M3", "M4", "M5", "M6",
  "M7", "M8", "M9", "M10", "M11", "M12",
];

interface RiskFactor {
  factor: string;
  probability: string;
  impact: string;
  score: number;
  mitigation: string;
}

interface Prediction {
  metric: string;
  prediction: string;
  confidence: number;
}

interface RiskResult {
  overallRisk: string;
  riskScore: number;
  riskFactors: RiskFactor[];
  predictions: Prediction[];
  recommendations: string[];
}

export default function ProjectRiskPrediction() {
  const { t } = useLanguage();
  const [projectName, setProjectName] = useState("");
  const [currentStage, setCurrentStage] = useState("M3");
  const [totalBudget, setTotalBudget] = useState("");
  const [daysElapsed, setDaysElapsed] = useState("");
  const [daysPlanned, setDaysPlanned] = useState("");
  const [gatePassRate, setGatePassRate] = useState("");
  const [openIssues, setOpenIssues] = useState("");
  const [result, setResult] = useState<RiskResult | null>(null);

  const predictMutation = trpc.projectIntelligence.predictRisk.useMutation({
    onSuccess: (data) => setResult(data as RiskResult),
    onError: () => setResult(null),
  });

  const handlePredict = () => {
    if (!projectName.trim() || predictMutation.isPending) return;
    predictMutation.mutate({
      projectName,
      currentStage,
      totalBudget: totalBudget ? Number(totalBudget) : undefined,
      daysElapsed: daysElapsed ? Number(daysElapsed) : undefined,
      daysPlanned: daysPlanned ? Number(daysPlanned) : undefined,
      gatePassRate: gatePassRate ? Number(gatePassRate) : undefined,
      openIssues: openIssues ? Number(openIssues) : undefined,
    });
  };

  const riskColor = (risk: string) => {
    switch (risk) {
      case "critical": return "bg-red-600/20 text-red-400 border-red-600/30";
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const riskLabel = (risk: string) => {
    switch (risk) {
      case "critical": return t("quality.riskPred.riskCritical");
      case "high": return t("quality.riskPred.riskHigh");
      case "medium": return t("quality.riskPred.riskMedium");
      case "low": return t("quality.riskPred.riskLow");
      default: return risk;
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 75) return "text-red-400";
    if (score >= 50) return "text-yellow-400";
    if (score >= 25) return "text-blue-400";
    return "text-green-400";
  };

  const scoreBg = (score: number) => {
    if (score >= 75) return "bg-red-500";
    if (score >= 50) return "bg-yellow-500";
    if (score >= 25) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={ShieldAlert}
          title={t("quality.riskPred.title")}
          description={t("quality.riskPred.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("quality.riskPred.aiBadge")}
            </Badge>
          }
        />

        {/* Input form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-primary" />
              {t("quality.riskPred.projectParams")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.riskPred.projectName")} *</label>
                <Input
                  placeholder={t("quality.riskPred.projectNamePlaceholder")}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.riskPred.currentStage")} *</label>
                <Select value={currentStage} onValueChange={(v) => setCurrentStage(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("quality.riskPred.currentStage")} />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.riskPred.totalBudget")}</label>
                <Input
                  type="number"
                  placeholder="e.g. 200"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.riskPred.daysElapsed")}</label>
                <Input
                  type="number"
                  placeholder="e.g. 90"
                  value={daysElapsed}
                  onChange={(e) => setDaysElapsed(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.riskPred.daysPlanned")}</label>
                <Input
                  type="number"
                  placeholder="e.g. 180"
                  value={daysPlanned}
                  onChange={(e) => setDaysPlanned(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.riskPred.gatePassRate")}</label>
                <Input
                  type="number"
                  placeholder="e.g. 85"
                  value={gatePassRate}
                  onChange={(e) => setGatePassRate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.riskPred.openIssues")}</label>
                <Input
                  type="number"
                  placeholder="e.g. 5"
                  value={openIssues}
                  onChange={(e) => setOpenIssues(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handlePredict}
                disabled={!projectName.trim() || predictMutation.isPending}
              >
                {predictMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {t("quality.riskPred.predictBtn")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Overall risk + score */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">{t("quality.riskPred.overallRiskLevel")}</p>
                  <Badge className={`text-lg px-4 py-2 ${riskColor(result.overallRisk)}`}>
                    {riskLabel(result.overallRisk)}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">{t("quality.riskPred.riskScore")}</p>
                  <p className={`text-5xl font-bold ${scoreColor(result.riskScore)}`}>
                    {result.riskScore}
                  </p>
                  <div className="mt-2 w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${scoreBg(result.riskScore)}`}
                      style={{ width: `${result.riskScore}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk factors table */}
            {result.riskFactors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    {t("quality.riskPred.riskFactorAnalysis")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 px-3">{t("quality.riskPred.riskFactor")}</th>
                          <th className="text-left py-2 px-3">{t("quality.riskPred.probability")}</th>
                          <th className="text-left py-2 px-3">{t("quality.riskPred.impact")}</th>
                          <th className="text-left py-2 px-3">{t("quality.riskPred.score")}</th>
                          <th className="text-left py-2 px-3">{t("quality.riskPred.mitigation")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.riskFactors.map((rf, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 px-3 font-medium">{rf.factor}</td>
                            <td className="py-2 px-3">
                              <Badge variant="outline">{rf.probability}</Badge>
                            </td>
                            <td className="py-2 px-3">
                              <Badge variant="outline">{rf.impact}</Badge>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`font-bold ${scoreColor(rf.score)}`}>
                                {rf.score}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">{rf.mitigation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Predictions */}
            {result.predictions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    {t("quality.riskPred.predictions")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.predictions.map((pred, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/50 space-y-1">
                        <p className="text-xs text-muted-foreground">{pred.metric}</p>
                        <p className="font-medium">{pred.prediction}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${pred.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{pred.confidence}%</span>
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
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    {t("quality.riskPred.aiSuggestions")}
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
