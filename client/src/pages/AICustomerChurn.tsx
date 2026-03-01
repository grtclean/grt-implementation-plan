/**
 * AI客户流失预测 (AI Customer Churn Prediction)
 * Phase G: 流失概率 · 健康评分 · 风险因子 · 挽留策略
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
  UserCheck, Loader2, Sparkles, AlertTriangle, Shield, Heart,
} from "lucide-react";

const INDUSTRIES = ["汽车制造", "半导体", "工业通用", "食品医药", "航空航天"];
const ORDER_FREQUENCIES = [
  { value: "季度", label: "季度" },
  { value: "半年", label: "半年" },
  { value: "年度", label: "年度" },
  { value: "不定期", label: "不定期" },
];

interface ChurnResult {
  churnProbability: number;
  riskLevel: string;
  churnFactors: Array<{ factor: string; weight: number; description: string }>;
  retentionActions: Array<{ action: string; priority: string; expectedImpact: string; timeline: string }>;
  customerHealthScore: number;
  recommendations: string[];
}

export default function AICustomerChurn() {
  const { t } = useLanguage();
  const [customerName, setCustomerName] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [contractValue, setContractValue] = useState("");
  const [lastOrderDate, setLastOrderDate] = useState("");
  const [orderFrequency, setOrderFrequency] = useState("年度");
  const [satisfactionScore, setSatisfactionScore] = useState("");
  const [complaintCount, setComplaintCount] = useState("");
  const [competitorActivity, setCompetitorActivity] = useState("");
  const [result, setResult] = useState<ChurnResult | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);

  const mutation = trpc.salesFinanceIntelligence.predictChurn.useMutation({
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
      setResult(taskQuery.data.result as unknown as ChurnResult);
      setTaskId(null);
    } else if (taskQuery.data?.taskStatus === "failed") {
      setResult(null);
      setTaskId(null);
    }
  }, [taskQuery.data]);

  const handleSubmit = () => {
    if (!customerName.trim() || !contractValue || !lastOrderDate || mutation.isPending || !!taskId) return;
    mutation.mutate({
      customerName,
      industry,
      contractValue: Number(contractValue),
      lastOrderDate,
      orderFrequency,
      satisfactionScore: satisfactionScore ? Number(satisfactionScore) : undefined,
      complaintCount: complaintCount ? Number(complaintCount) : undefined,
      competitorActivity: competitorActivity || undefined,
    });
  };

  const riskLevelConfig = (level: string) => {
    switch (level) {
      case "high": return { label: t("ai.churn.riskHigh"), color: "bg-red-500/20 text-red-400 border-red-500/30" };
      case "medium": return { label: t("ai.churn.riskMedium"), color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
      case "low": return { label: t("ai.churn.riskLow"), color: "bg-green-500/20 text-green-400 border-green-500/30" };
      default: return { label: level, color: "bg-muted text-muted-foreground" };
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const priorityLabel = (p: string) => {
    switch (p) { case "high": return t("ai.churn.priorityUrgent"); case "medium": return t("ai.churn.priorityImportant"); case "low": return t("ai.churn.priorityNormal"); default: return p; }
  };

  const churnColor = (prob: number) => {
    if (prob >= 70) return "text-red-400";
    if (prob >= 40) return "text-yellow-400";
    return "text-green-400";
  };

  const healthColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-blue-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={UserCheck}
          title={t("ai.churn.title")}
          description={t("ai.churn.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("ai.churn.aiPredict")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-5 w-5 text-primary" />
              {t("ai.churn.customerInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.churn.customerName")}</label>
                <Input placeholder="如: 上海大众汽车有限公司" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.churn.industry")}</label>
                <Select value={industry} onValueChange={(v) => setIndustry(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.churn.selectIndustry")} />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.churn.contractValue")}</label>
                <Input type="number" placeholder="如: 200" value={contractValue} onChange={(e) => setContractValue(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.churn.lastOrderDate")}</label>
                <Input type="date" value={lastOrderDate} onChange={(e) => setLastOrderDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.churn.orderFrequency")}</label>
                <Select value={orderFrequency} onValueChange={(v) => setOrderFrequency(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.churn.selectFrequency")} />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.churn.satisfactionScore")}</label>
                <Input type="number" min={1} max={10} placeholder="如: 8" value={satisfactionScore} onChange={(e) => setSatisfactionScore(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.churn.complaintCount")}</label>
                <Input type="number" min={0} placeholder="如: 2" value={complaintCount} onChange={(e) => setComplaintCount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("ai.churn.competitorActivity")}</label>
              <Textarea placeholder="如: 某竞争对手近期在该客户所在区域推出低价促销活动..." value={competitorActivity} onChange={(e) => setCompetitorActivity(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!customerName.trim() || !contractValue || !lastOrderDate || mutation.isPending || !!taskId}>
                {mutation.isPending || !!taskId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("ai.churn.aiPredict")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Churn Probability + Health Score */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">{t("ai.churn.churnProbability")}</p>
                  <p className={`text-5xl font-bold ${churnColor(result.churnProbability)}`}>{result.churnProbability}%</p>
                  <div className="mt-2 w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${result.churnProbability >= 70 ? "bg-red-500" : result.churnProbability >= 40 ? "bg-yellow-500" : "bg-green-500"}`}
                      style={{ width: `${result.churnProbability}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">{t("ai.churn.riskLevel")}</p>
                  <Badge className={`text-2xl px-4 py-2 mt-2 ${riskLevelConfig(result.riskLevel).color}`}>
                    {riskLevelConfig(result.riskLevel).label}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">{t("ai.churn.customerHealthScore")}</p>
                  <p className={`text-5xl font-bold ${healthColor(result.customerHealthScore)}`}>{result.customerHealthScore}</p>
                  <div className="mt-2 w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${result.customerHealthScore >= 80 ? "bg-green-500" : result.customerHealthScore >= 60 ? "bg-blue-500" : result.customerHealthScore >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${result.customerHealthScore}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Churn Factors */}
            {result.churnFactors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    {t("ai.churn.churnFactors")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.churnFactors.map((f, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{f.factor}</span>
                          <span className="text-sm text-muted-foreground">{f.weight}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${f.weight}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground">{f.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Retention Actions */}
            {result.retentionActions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Heart className="h-5 w-5 text-pink-400" />
                    {t("ai.churn.retentionActions")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-muted-foreground font-medium">{t("ai.churn.actionCol")}</th>
                          <th className="text-center py-2 text-muted-foreground font-medium">{t("ai.churn.priorityCol")}</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">{t("ai.churn.expectedImpactCol")}</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">{t("ai.churn.timelineCol")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.retentionActions.map((a, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2">{a.action}</td>
                            <td className="py-2 text-center">
                              <Badge className={priorityColor(a.priority)}>{priorityLabel(a.priority)}</Badge>
                            </td>
                            <td className="py-2">{a.expectedImpact}</td>
                            <td className="py-2 text-right text-muted-foreground">{a.timeline}</td>
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
                    <Shield className="h-5 w-5 text-primary" />
                    {t("ai.churn.aiSuggestions")}
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
