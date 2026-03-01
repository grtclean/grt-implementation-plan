/**
 * AI设计审查 (AI Design Review)
 * Phase H: 设计评分 · 问题识别 · 合规检查 · 材料兼容性
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
  Shield, Loader2, Sparkles, AlertTriangle, CheckCircle, FileText,
} from "lucide-react";

const DESIGN_PHASES = [
  { value: "概念设计", label: "概念设计" },
  { value: "详细设计", label: "详细设计" },
  { value: "BOM设计", label: "BOM设计" },
  { value: "原型制造", label: "原型制造" },
];

interface ReviewResult {
  overallScore: number;
  grade: string;
  issues: Array<{ issue: string; severity: string; category: string; suggestion: string }>;
  complianceCheck: Array<{ standard: string; status: string; notes: string }>;
  materialCompatibility: string;
  recommendations: string[];
}

export default function AIDesignReview() {
  const { t } = useLanguage();
  const [projectName, setProjectName] = useState("");
  const [designPhase, setDesignPhase] = useState("概念设计");
  const [designDescription, setDesignDescription] = useState("");
  const [keyParameters, setKeyParameters] = useState("");
  const [materialsUsed, setMaterialsUsed] = useState("");
  const [previousIssues, setPreviousIssues] = useState("");
  const [standardsRequired, setStandardsRequired] = useState("");
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);

  const mutation = trpc.rdServiceIntelligence.reviewDesign.useMutation({
    onSuccess: (data) => setTaskId(data.taskId),
    onError: () => setResult(null),
  });

  const taskQuery = trpc.rdServiceIntelligence.getTaskResult.useQuery(
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
      setResult(taskQuery.data.result as unknown as ReviewResult);
      setTaskId(null);
    } else if (taskQuery.data?.taskStatus === "failed") {
      setResult(null);
      setTaskId(null);
    }
  }, [taskQuery.data]);

  const handleSubmit = () => {
    if (!projectName.trim() || !designDescription.trim() || !keyParameters.trim() || mutation.isPending || !!taskId) return;
    mutation.mutate({
      projectName,
      designPhase,
      designDescription,
      keyParameters,
      materialsUsed: materialsUsed || undefined,
      previousIssues: previousIssues || undefined,
      standardsRequired: standardsRequired || undefined,
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
    switch (s) { case "high": return t("ai.designReview.severityHigh"); case "medium": return t("ai.designReview.severityMedium"); case "low": return t("ai.designReview.severityLow"); default: return s; }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "pass": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "fail": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "pending": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const statusLabel = (s: string) => {
    switch (s) { case "pass": return t("ai.designReview.statusPass"); case "fail": return t("ai.designReview.statusFail"); case "pending": return t("ai.designReview.statusPending"); default: return s; }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Shield}
          title={t("ai.designReview.title")}
          description={t("ai.designReview.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("ai.designReview.aiReview")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-primary" />
              {t("ai.designReview.designInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.designReview.projectName")}</label>
                <Input placeholder="如: XX超声波清洗机项目" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.designReview.designPhase")}</label>
                <Select value={designPhase} onValueChange={(v) => setDesignPhase(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.designReview.selectPhase")} />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGN_PHASES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("ai.designReview.designDescription")}</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder="如: 三槽超声波清洗机，含清洗、漂洗、干燥功能，PLC自动控制" value={designDescription} onChange={(e) => setDesignDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("ai.designReview.keyParameters")}</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder="如: 清洗槽尺寸800×600×500mm，超声频率28/40kHz，功率3000W，温度范围20-80℃" value={keyParameters} onChange={(e) => setKeyParameters(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.designReview.materialsUsed")}</label>
                <Input placeholder="如: 304不锈钢，钛合金振板" value={materialsUsed} onChange={(e) => setMaterialsUsed(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.designReview.standardsRequired")}</label>
                <Input placeholder="如: CE, UL" value={standardsRequired} onChange={(e) => setStandardsRequired(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("ai.designReview.previousIssues")}</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder="如: 上一代产品存在密封泄漏问题" value={previousIssues} onChange={(e) => setPreviousIssues(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!projectName.trim() || !designDescription.trim() || !keyParameters.trim() || mutation.isPending || !!taskId}>
                {mutation.isPending || !!taskId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("ai.designReview.aiReview")}
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
                    <p className="text-sm text-muted-foreground">{t("ai.designReview.designScore")}</p>
                    <p className={`text-5xl font-bold ${scoreColor(result.overallScore)}`}>{result.overallScore}</p>
                  </div>
                  <Badge className={`text-2xl px-4 py-2 ${gradeColor(result.grade)}`}>{result.grade}{t("ai.designReview.grade")}</Badge>
                </div>
                <div className="mt-3 w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${result.overallScore >= 90 ? "bg-green-500" : result.overallScore >= 75 ? "bg-blue-500" : result.overallScore >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${result.overallScore}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">{t("ai.designReview.materialCompatibility")}: {result.materialCompatibility}</p>
              </CardContent>
            </Card>

            {/* Issues */}
            {result.issues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    {t("ai.designReview.issuesFound")} ({result.issues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.designReview.issueCol")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.designReview.severityCol")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.designReview.categoryCol")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.designReview.suggestionCol")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.issues.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{item.issue}</td>
                            <td className="py-2"><Badge className={severityColor(item.severity)}>{severityLabel(item.severity)}</Badge></td>
                            <td className="py-2">{item.category}</td>
                            <td className="py-2 text-muted-foreground">{item.suggestion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Compliance Check */}
            {result.complianceCheck.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5 text-primary" />
                    {t("ai.designReview.complianceCheck")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.designReview.standardCol")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.designReview.statusCol")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.designReview.notesCol")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.complianceCheck.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{item.standard}</td>
                            <td className="py-2"><Badge className={statusColor(item.status)}>{statusLabel(item.status)}</Badge></td>
                            <td className="py-2 text-muted-foreground">{item.notes}</td>
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
                    <CheckCircle className="h-5 w-5 text-primary" />
                    {t("ai.designReview.aiSuggestions")}
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
