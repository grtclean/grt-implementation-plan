/**
 * 工程变更影响分析 (Engineering Change Impact Analysis)
 * Phase D: AI驱动 · 变更链追溯 · 影响范围评估
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
  GitBranch, Loader2, AlertTriangle, CheckCircle, Clock,
  Package, ShoppingCart, Calendar, DollarSign, Shield, Sparkles,
} from "lucide-react";

const CHANGE_TYPES = [
  { value: "design_change", labelKey: "projects.impact.designChange" },
  { value: "bom_change", labelKey: "projects.impact.bomChange" },
  { value: "process_change", labelKey: "projects.impact.processChange" },
  { value: "supplier_change", labelKey: "projects.impact.supplierChange" },
];

interface ImpactArea {
  area: string;
  severity: string;
  description: string;
}

interface AffectedItem {
  type: string;
  name: string;
  impact: string;
}

interface AnalysisResult {
  impactAreas: ImpactArea[];
  affectedItems: AffectedItem[];
  recommendations: string[];
  riskScore: number;
  estimatedEffort: string;
}

const AREA_ICONS: Record<string, typeof Package> = {
  BOM: Package,
  PO: ShoppingCart,
  Schedule: Calendar,
  Cost: DollarSign,
  Quality: Shield,
};

export default function ChangeImpactAnalysis() {
  const { t } = useLanguage();
  const [changeType, setChangeType] = useState("design_change");
  const [changeDescription, setChangeDescription] = useState("");
  const [affectedComponent, setAffectedComponent] = useState("");
  const [projectId, setProjectId] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);

  const analyzeMutation = trpc.projectIntelligence.analyzeChangeImpact.useMutation({
    onSuccess: (data) => setTaskId(data.taskId),
    onError: () => setResult(null),
  });

  const taskQuery = trpc.projectIntelligence.getTaskResult.useQuery(
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
    if (!taskQuery.data || !taskId) return;
    if (taskQuery.data.taskStatus === "completed") {
      setResult(taskQuery.data.result as unknown as AnalysisResult);
      setTaskId(null);
    } else if (taskQuery.data.taskStatus === "failed") {
      setResult(null);
      setTaskId(null);
    }
  }, [taskQuery.data, taskId]);

  const handleAnalyze = () => {
    if (!changeDescription.trim() || analyzeMutation.isPending || !!taskId) return;
    analyzeMutation.mutate({
      changeType,
      changeDescription,
      affectedComponent: affectedComponent || undefined,
      projectId: projectId || undefined,
    });
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const severityLabel = (severity: string) => {
    switch (severity) {
      case "high": return t("projects.impact.severityHigh");
      case "medium": return t("projects.impact.severityMedium");
      case "low": return t("projects.impact.severityLow");
      default: return severity;
    }
  };

  const riskColor = (score: number) => {
    if (score >= 75) return "text-red-400";
    if (score >= 50) return "text-yellow-400";
    if (score >= 25) return "text-blue-400";
    return "text-green-400";
  };

  const riskBg = (score: number) => {
    if (score >= 75) return "bg-red-500";
    if (score >= 50) return "bg-yellow-500";
    if (score >= 25) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={GitBranch}
          title={t("projects.impact.title")}
          description={t("projects.impact.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("projects.impact.aiAnalysis")}
            </Badge>
          }
        />

        {/* Input form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-5 w-5 text-primary" />
              {t("projects.impact.changeInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("projects.impact.changeType")}</label>
                <Select value={changeType} onValueChange={(v) => setChangeType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("projects.impact.selectChangeType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANGE_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>{t(ct.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("projects.impact.affectedComponent")}</label>
                <Input
                  placeholder={t("projects.impact.affectedComponentPlaceholder")}
                  value={affectedComponent}
                  onChange={(e) => setAffectedComponent(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("projects.impact.changeDescription")}</label>
              <Textarea
                placeholder={t("projects.impact.changeDescPlaceholder")}
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("projects.impact.relatedProject")}</label>
              <Input
                placeholder="如: IC-2000"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleAnalyze}
                disabled={!changeDescription.trim() || analyzeMutation.isPending || !!taskId}
              >
                {analyzeMutation.isPending || !!taskId ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {t("projects.impact.analyzeImpact")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Risk score gauge */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("projects.impact.riskScore")}</p>
                    <p className={`text-5xl font-bold ${riskColor(result.riskScore)}`}>
                      {result.riskScore}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("projects.impact.estimatedEffort")}</p>
                      <p className="font-medium">{result.estimatedEffort}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${riskBg(result.riskScore)}`}
                    style={{ width: `${result.riskScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Impact areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.impactAreas.map((area, idx) => {
                const Icon = AREA_ICONS[area.area] || AlertTriangle;
                return (
                  <Card key={idx} className={`border ${severityColor(area.severity).replace("bg-", "border-").split(" ")[0]}/30`}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{area.area}</span>
                        </div>
                        <Badge className={severityColor(area.severity)}>
                          {severityLabel(area.severity)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{area.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Affected items */}
            {result.affectedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("projects.impact.affectedItems")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.affectedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                        <Badge variant="outline">{item.type}</Badge>
                        <span className="font-medium text-sm">{item.name}</span>
                        <span className="text-sm text-muted-foreground ml-auto">{item.impact}</span>
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
                    {t("projects.impact.aiRecommendations")}
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
