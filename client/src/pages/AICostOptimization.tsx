/**
 * AI成本优化 (AI Cost Allocation Optimization)
 * Phase G: 成本优化 · 节省建议 · 毛利分析 · 风险评估
 */
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Calculator, Loader2, Sparkles, TrendingUp, AlertTriangle, ArrowRight,
  PiggyBank,
} from "lucide-react";

interface CostResult {
  optimizedTotal: number;
  savingsPercent: number;
  optimizations: Array<{ area: string; currentCost: number; optimizedCost: number; savingsPercent: number; suggestion: string }>;
  marginAnalysis: { currentMargin: number; targetMargin: number; achievable: number };
  riskAssessment: string;
  recommendations: string[];
}

export default function AICostOptimization() {
  const { t } = useLanguage();
  const [projectName, setProjectName] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [costBreakdown, setCostBreakdown] = useState("");
  const [targetMargin, setTargetMargin] = useState("");
  const [materialCosts, setMaterialCosts] = useState("");
  const [laborHours, setLaborHours] = useState("");
  const [overheadRate, setOverheadRate] = useState("");
  const [result, setResult] = useState<CostResult | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);

  const mutation = trpc.salesFinanceIntelligence.optimizeCost.useMutation({
    onSuccess: (data) => setTaskId(data.taskId),
    onError: () => setResult(null),
  });

  const taskQuery = trpc.salesFinanceIntelligence.getTaskResult.useQuery(
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
      setResult(taskQuery.data.result as unknown as CostResult);
      setTaskId(null);
    } else if (taskQuery.data?.taskStatus === "failed") {
      setResult(null);
      setTaskId(null);
    }
  }, [taskQuery.data]);

  const handleSubmit = () => {
    if (!projectName.trim() || !totalBudget || !costBreakdown.trim() || !targetMargin || mutation.isPending || !!taskId) return;
    mutation.mutate({
      projectName,
      totalBudget: Number(totalBudget),
      costBreakdown,
      targetMargin: Number(targetMargin),
      materialCosts: materialCosts || undefined,
      laborHours: laborHours ? Number(laborHours) : undefined,
      overheadRate: overheadRate ? Number(overheadRate) : undefined,
    });
  };

  const savingsColor = (pct: number) => {
    if (pct >= 10) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (pct >= 5) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  };

  const marginColor = (margin: number) => {
    if (margin >= 20) return "text-green-400";
    if (margin >= 15) return "text-blue-400";
    if (margin >= 10) return "text-yellow-400";
    return "text-red-400";
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Calculator}
          title={t("ai.costOpt.title")}
          description={t("ai.costOpt.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("ai.costOpt.aiOptimize")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-5 w-5 text-primary" />
              {t("ai.costOpt.projectCostData")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.costOpt.projectName")}</label>
                <Input placeholder="如: XX汽车碳氢清洗线项目" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.costOpt.totalBudget")}</label>
                <Input type="number" placeholder="如: 280" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("ai.costOpt.costBreakdown")}</label>
              <Textarea placeholder="如: 材料120万, 人工60万, 外协30万, 管理费25万" value={costBreakdown} onChange={(e) => setCostBreakdown(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.costOpt.targetMargin")}</label>
                <Input type="number" placeholder="如: 20" value={targetMargin} onChange={(e) => setTargetMargin(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.costOpt.laborHours")}</label>
                <Input type="number" placeholder="如: 2000" value={laborHours} onChange={(e) => setLaborHours(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.costOpt.overheadRate")}</label>
                <Input type="number" placeholder="如: 10" value={overheadRate} onChange={(e) => setOverheadRate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("ai.costOpt.materialDetails")}</label>
              <Textarea placeholder="如: 真空泵15万, 不锈钢板20万, PLC控制系统12万, 超声波换能器8万" value={materialCosts} onChange={(e) => setMaterialCosts(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!projectName.trim() || !totalBudget || !costBreakdown.trim() || !targetMargin || mutation.isPending || !!taskId}>
                {mutation.isPending || !!taskId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("ai.costOpt.aiOptimize")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Optimized Total + Savings */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t("ai.costOpt.originalCost")}</p>
                    <p className="text-3xl font-bold text-muted-foreground">{Number(totalBudget).toLocaleString()} {t("ai.costOpt.tenThousandYuan")}</p>
                  </div>
                  <ArrowRight className="h-8 w-8 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t("ai.costOpt.optimizedCost")}</p>
                    <p className="text-3xl font-bold text-primary">{result.optimizedTotal.toLocaleString()} {t("ai.costOpt.tenThousandYuan")}</p>
                  </div>
                  <Badge className={`text-lg px-4 py-2 ${savingsColor(result.savingsPercent)}`}>
                    <PiggyBank className="h-4 w-4 mr-1" />
                    {t("ai.costOpt.saved")} {result.savingsPercent.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Margin Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  {t("ai.costOpt.marginAnalysis")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-center p-4 rounded bg-muted/50 flex-1 min-w-[120px]">
                    <p className="text-xs text-muted-foreground">{t("ai.costOpt.currentMargin")}</p>
                    <p className={`text-3xl font-bold ${marginColor(result.marginAnalysis.currentMargin)}`}>{result.marginAnalysis.currentMargin}%</p>
                  </div>
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  <div className="text-center p-4 rounded bg-muted/50 flex-1 min-w-[120px]">
                    <p className="text-xs text-muted-foreground">{t("ai.costOpt.targetMarginLabel")}</p>
                    <p className="text-3xl font-bold text-primary">{result.marginAnalysis.targetMargin}%</p>
                  </div>
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  <div className="text-center p-4 rounded bg-muted/50 flex-1 min-w-[120px]">
                    <p className="text-xs text-muted-foreground">{t("ai.costOpt.achievableMargin")}</p>
                    <p className={`text-3xl font-bold ${marginColor(result.marginAnalysis.achievable)}`}>{result.marginAnalysis.achievable}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Optimizations Table */}
            {result.optimizations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PiggyBank className="h-5 w-5 text-green-400" />
                    {t("ai.costOpt.optimizationDetails")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-muted-foreground font-medium">{t("ai.costOpt.optimizationArea")}</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">{t("ai.costOpt.currentCol")}</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">{t("ai.costOpt.optimizedCol")}</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">{t("ai.costOpt.savingsCol")}</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">{t("ai.costOpt.suggestionCol")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.optimizations.map((o, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{o.area}</td>
                            <td className="py-2 text-right">{o.currentCost.toLocaleString()}</td>
                            <td className="py-2 text-right text-green-400">{o.optimizedCost.toLocaleString()}</td>
                            <td className="py-2 text-right">
                              <Badge className={savingsColor(o.savingsPercent)}>{o.savingsPercent.toFixed(1)}%</Badge>
                            </td>
                            <td className="py-2 text-muted-foreground">{o.suggestion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  {t("ai.costOpt.riskAssessment")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{result.riskAssessment}</p>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {t("ai.costOpt.aiSuggestions")}
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
