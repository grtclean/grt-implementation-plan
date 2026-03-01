/**
 * AI预算分析 (AI Budget Anomaly Analysis)
 * Phase G: 偏差检测 · 异常评分 · 趋势分析 · 年度预测
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wallet, Loader2, Sparkles, AlertTriangle, TrendingUp, BarChart3,
} from "lucide-react";

const DEPARTMENTS = ["研发部", "生产部", "销售部", "客服部", "财务部", "人力资源部", "行政管理部"];
const BUDGET_PERIODS = ["月度", "季度", "半年", "年度"];

interface BudgetResult {
  variancePercent: number;
  anomalyScore: number;
  anomalies: Array<{ category: string; allocated: number; actual: number; variance: number; severity: string; explanation: string }>;
  trendAnalysis: string;
  forecastToYearEnd: number;
  recommendations: string[];
}

export default function AIBudgetAnalysis() {
  const { t } = useLanguage();
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [budgetPeriod, setBudgetPeriod] = useState("季度");
  const [allocatedBudget, setAllocatedBudget] = useState("");
  const [actualSpend, setActualSpend] = useState("");
  const [categories, setCategories] = useState("");
  const [overrunItems, setOverrunItems] = useState("");
  const [comparisonPeriod, setComparisonPeriod] = useState("");
  const [result, setResult] = useState<BudgetResult | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);

  const mutation = trpc.salesFinanceIntelligence.analyzeBudget.useMutation({
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
      setResult(taskQuery.data.result as unknown as BudgetResult);
      setTaskId(null);
    } else if (taskQuery.data?.taskStatus === "failed") {
      setResult(null);
      setTaskId(null);
    }
  }, [taskQuery.data]);

  const handleSubmit = () => {
    if (!allocatedBudget || !actualSpend || !categories.trim() || mutation.isPending || !!taskId) return;
    mutation.mutate({
      department,
      budgetPeriod,
      allocatedBudget: Number(allocatedBudget),
      actualSpend: Number(actualSpend),
      categories,
      overrunItems: overrunItems || undefined,
      comparisonPeriod: comparisonPeriod || undefined,
    });
  };

  const varianceColor = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 20) return "text-red-400";
    if (abs >= 10) return "text-yellow-400";
    return "text-green-400";
  };

  const severityConfig = (severity: string) => {
    switch (severity) {
      case "critical": return { label: t("ai.budget.severityCritical"), color: "bg-red-500/20 text-red-400 border-red-500/30" };
      case "warning": return { label: t("ai.budget.severityWarning"), color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
      case "normal": return { label: t("ai.budget.severityNormal"), color: "bg-green-500/20 text-green-400 border-green-500/30" };
      default: return { label: severity, color: "bg-muted text-muted-foreground" };
    }
  };

  const anomalyScoreColor = (score: number) => {
    if (score >= 70) return "text-red-400";
    if (score >= 40) return "text-yellow-400";
    return "text-green-400";
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Wallet}
          title={t("ai.budget.title")}
          description={t("ai.budget.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("ai.budget.aiAnalysis")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-5 w-5 text-primary" />
              {t("ai.budget.budgetData")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.budget.department")}</label>
                <Select value={department} onValueChange={(v) => setDepartment(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.budget.selectDept")} />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.budget.budgetPeriod")}</label>
                <Select value={budgetPeriod} onValueChange={(v) => setBudgetPeriod(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.budget.selectPeriod")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.budget.allocatedBudget")}</label>
                <Input type="number" placeholder="如: 500" value={allocatedBudget} onChange={(e) => setAllocatedBudget(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.budget.actualSpend")}</label>
                <Input type="number" placeholder="如: 580" value={actualSpend} onChange={(e) => setActualSpend(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("ai.budget.costDetails")}</label>
              <Textarea placeholder="如: 人力500万, 物料300万, 差旅80万, 设备50万" value={categories} onChange={(e) => setCategories(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.budget.overrunItems")}</label>
                <Textarea placeholder="如: 物料采购超支30万（原材料涨价）" value={overrunItems} onChange={(e) => setOverrunItems(e.target.value)} rows={2} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.budget.comparisonPeriod")}</label>
                <Input placeholder="如: 2025年同期" value={comparisonPeriod} onChange={(e) => setComparisonPeriod(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!allocatedBudget || !actualSpend || !categories.trim() || mutation.isPending || !!taskId}>
                {mutation.isPending || !!taskId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("ai.budget.aiAnalysis")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Variance + Anomaly Score */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">{t("ai.budget.budgetVariance")}</p>
                  <p className={`text-5xl font-bold ${varianceColor(result.variancePercent)}`}>
                    {result.variancePercent > 0 ? "+" : ""}{result.variancePercent.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">{t("ai.budget.anomalyScore")}</p>
                  <p className={`text-5xl font-bold ${anomalyScoreColor(result.anomalyScore)}`}>{result.anomalyScore}</p>
                  <div className="mt-2 w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${result.anomalyScore >= 70 ? "bg-red-500" : result.anomalyScore >= 40 ? "bg-yellow-500" : "bg-green-500"}`}
                      style={{ width: `${result.anomalyScore}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">{t("ai.budget.yearEndForecast")}</p>
                  <p className="text-4xl font-bold text-primary">{result.forecastToYearEnd.toLocaleString()}<span className="text-lg text-muted-foreground ml-1">万元</span></p>
                </CardContent>
              </Card>
            </div>

            {/* Anomalies Table */}
            {result.anomalies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    {t("ai.budget.anomalyDetails")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-muted-foreground font-medium">{t("ai.budget.category")}</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">{t("ai.budget.budgetCol")}</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">{t("ai.budget.actualCol")}</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">{t("ai.budget.varianceCol")}</th>
                          <th className="text-center py-2 text-muted-foreground font-medium">{t("ai.budget.levelCol")}</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">{t("ai.budget.causeAnalysis")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.anomalies.map((a, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{a.category}</td>
                            <td className="py-2 text-right">{a.allocated.toLocaleString()}</td>
                            <td className="py-2 text-right">{a.actual.toLocaleString()}</td>
                            <td className={`py-2 text-right ${varianceColor(a.variance)}`}>
                              {a.variance > 0 ? "+" : ""}{a.variance.toFixed(1)}%
                            </td>
                            <td className="py-2 text-center">
                              <Badge className={severityConfig(a.severity).color}>{severityConfig(a.severity).label}</Badge>
                            </td>
                            <td className="py-2 text-muted-foreground">{a.explanation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trend Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  {t("ai.budget.trendAnalysis")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{result.trendAnalysis}</p>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    {t("ai.budget.aiSuggestions")}
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
