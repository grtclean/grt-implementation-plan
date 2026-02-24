/**
 * 售后→研发设计反馈 (US-017)
 * 售后故障模式识别 · 设计改进建议 · 不改进成本评估
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  GitBranch, Loader2, Sparkles, CheckCircle, AlertTriangle, Wrench,
  Hash, BarChart3,
} from "lucide-react";

interface DesignFeedbackResult {
  patternId: string;
  faultPattern: string;
  frequency: number;
  affectedModels: string[];
  rootCauseHypothesis: string;
  designImprovements: Array<{
    area: string;
    currentDesign: string;
    suggestedChange: string;
    expectedBenefit: string;
    priority: string;
  }>;
  costOfInaction: string;
  recommendations: string[];
}

export default function AfterSalesDesignFeedback() {
  const { t, tpl } = useLanguage();
  const [period, setPeriod] = useState("");
  const [faultRecords, setFaultRecords] = useState("");
  const [equipmentModels, setEquipmentModels] = useState("");
  const [recurringThreshold, setRecurringThreshold] = useState("");
  const [result, setResult] = useState<DesignFeedbackResult | null>(null);

  const mutation = trpc.serviceSalesAdvanced.analyzeFieldFeedback.useMutation({
    onSuccess: (data) => setResult(data as DesignFeedbackResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!period.trim() || !faultRecords.trim() || !equipmentModels.trim() || mutation.isPending) return;
    mutation.mutate({
      period,
      faultRecords,
      equipmentModels,
      recurringThreshold: recurringThreshold ? Number(recurringThreshold) : undefined,
    });
  };

  const priorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{t("afterSales.designFeedback.priorityHigh")}</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{t("afterSales.designFeedback.priorityMedium")}</Badge>;
      case "low":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{t("afterSales.designFeedback.priorityLow")}</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={GitBranch}
          title={t("afterSales.designFeedback.title")}
          description={t("afterSales.designFeedback.desc")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("afterSales.designFeedback.aiBadge")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-5 w-5 text-primary" />
              {t("afterSales.designFeedback.paramsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">分析周期 *</label>
                <Input
                  placeholder="如: 2025年全年"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">涉及设备型号 *</label>
                <Input
                  placeholder="涉及设备型号"
                  value={equipmentModels}
                  onChange={(e) => setEquipmentModels(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">售后故障记录汇总 *</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[100px]"
                placeholder="售后故障记录汇总"
                value={faultRecords}
                onChange={(e) => setFaultRecords(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">重复故障阈值（次，可选）</label>
              <Input
                type="number"
                placeholder="重复故障阈值(次)"
                value={recurringThreshold}
                onChange={(e) => setRecurringThreshold(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!period.trim() || !faultRecords.trim() || !equipmentModels.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI故障模式分析
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Pattern Overview */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      <Hash className="h-3 w-3 mr-1" />
                      {result.patternId}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <BarChart3 className="h-3 w-3" />
                      发生频次: {result.frequency}
                    </Badge>
                  </div>
                  <div className="p-4 rounded bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">故障模式</p>
                    <p className="font-medium">{result.faultPattern}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground mr-1">影响型号:</span>
                    {result.affectedModels.map((model, idx) => (
                      <Badge key={idx} variant="outline">{model}</Badge>
                    ))}
                  </div>
                  <div className="p-4 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm text-yellow-400 mb-1">根因假设</p>
                    <p className="text-sm font-medium">{result.rootCauseHypothesis}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Design Improvements */}
            {result.designImprovements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wrench className="h-5 w-5 text-primary" />
                    设计改进建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">改进领域</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">当前设计</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">建议变更</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">预期收益</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">优先级</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.designImprovements.map((imp, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{imp.area}</td>
                            <td className="py-2 text-muted-foreground">{imp.currentDesign}</td>
                            <td className="py-2">{imp.suggestedChange}</td>
                            <td className="py-2 text-muted-foreground">{imp.expectedBenefit}</td>
                            <td className="py-2">{priorityBadge(imp.priority)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cost of Inaction */}
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-400 font-medium mb-1">不改进成本评估</p>
                    <p className="text-sm">{result.costOfInaction}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
