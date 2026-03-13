/**
 * AI人力规划 (AI Workforce Planning)
 * Phase F: 人力需求 · 招聘计划 · 预算分配 · 风险评估
 */
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Users, Loader2, Sparkles, UserPlus, AlertTriangle,
  TrendingUp, Shield, Target,
} from "lucide-react";

const DEPARTMENT_KEYS = [
  "ai.workforce.deptRnD",
  "ai.workforce.deptManufacturing",
  "ai.workforce.deptSales",
  "ai.workforce.deptAfterSales",
  "ai.workforce.deptQuality",
  "ai.workforce.deptFinance",
  "ai.workforce.deptHR",
];

const TIME_HORIZON_KEYS = [
  { value: "Q1", labelKey: "ai.workforce.timeQ1" },
  { value: "Q2", labelKey: "ai.workforce.timeQ2" },
  { value: "H1", labelKey: "ai.workforce.timeH1" },
  { value: "全年", labelKey: "ai.workforce.timeFullYear" },
];

interface WorkforceResult {
  optimalHeadcount: number;
  hiringNeeds: Array<{ role: string; count: number; priority: string; timeline: string }>;
  skillRequirements: string[];
  budgetAllocation: { hiring: number; training: number; retention: number };
  riskFactors: Array<{ factor: string; impact: string; mitigation: string }>;
  recommendations: string[];
}

export default function AIWorkforcePlanning() {
  const { t } = useLanguage();
  const [department, setDepartment] = useState(t(DEPARTMENT_KEYS[0]));
  const [currentHeadcount, setCurrentHeadcount] = useState("");
  const [plannedProjects, setPlannedProjects] = useState("");
  const [attritionRate, setAttritionRate] = useState("");
  const [budgetConstraint, setBudgetConstraint] = useState("");
  const [growthTarget, setGrowthTarget] = useState("");
  const [timeHorizon, setTimeHorizon] = useState("__none__");
  const [result, setResult] = useState<WorkforceResult | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);

  const mutation = trpc.hrIntelligence.planWorkforce.useMutation({
    onSuccess: (data) => setTaskId(data.taskId),
    onError: () => setResult(null),
  });

  const taskQuery = trpc.hrIntelligence.getTaskResult.useQuery(
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
      setResult(taskQuery.data.result as unknown as WorkforceResult);
      setTaskId(null);
    } else if (taskQuery.data?.taskStatus === "failed") {
      setResult(null);
      setTaskId(null);
    }
  }, [taskQuery.data]);

  const handleSubmit = () => {
    if (!currentHeadcount || !plannedProjects.trim() || !attritionRate || mutation.isPending || !!taskId) return;
    mutation.mutate({
      department,
      currentHeadcount: Number(currentHeadcount),
      plannedProjects,
      attritionRate: Number(attritionRate),
      budgetConstraint: budgetConstraint || undefined,
      growthTarget: growthTarget || undefined,
      timeHorizon: timeHorizon === "__none__" ? undefined : timeHorizon,
    });
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const priorityLabel = (p: string) => {
    switch (p) {
      case "high": return t("ai.workforce.priorityHigh");
      case "medium": return t("ai.workforce.priorityMedium");
      case "low": return t("ai.workforce.priorityLow");
      default: return p;
    }
  };

  const impactColor = (i: string) => {
    switch (i) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const impactLabel = (i: string) => {
    switch (i) {
      case "high": return t("ai.workforce.impactHigh");
      case "medium": return t("ai.workforce.impactMedium");
      case "low": return t("ai.workforce.impactLow");
      default: return i;
    }
  };

  const budgetTotal = result
    ? result.budgetAllocation.hiring + result.budgetAllocation.training + result.budgetAllocation.retention
    : 0;

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Users}
          title={t("ai.workforce.title")}
          description={t("ai.workforce.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("ai.workforce.aiPlanning")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" />
              {t("ai.workforce.departmentInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.workforce.departmentName")}</label>
                <Select value={department} onValueChange={(v) => setDepartment(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.workforce.selectDepartment")} />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_KEYS.map((key) => <SelectItem key={key} value={t(key)}>{t(key)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.workforce.currentHeadcount")}</label>
                <Input type="number" placeholder={t("ai.workforce.headcountPlaceholder")} value={currentHeadcount} onChange={(e) => setCurrentHeadcount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("ai.workforce.plannedProjects")}</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px] resize-y"
                placeholder={t("ai.workforce.projectsPlaceholder")}
                value={plannedProjects}
                onChange={(e) => setPlannedProjects(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.workforce.attritionRate")}</label>
                <Input type="number" placeholder={t("ai.workforce.attritionPlaceholder")} value={attritionRate} onChange={(e) => setAttritionRate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.workforce.budgetConstraint")}</label>
                <Input placeholder={t("ai.workforce.budgetPlaceholder")} value={budgetConstraint} onChange={(e) => setBudgetConstraint(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.workforce.growthTarget")}</label>
                <Input placeholder={t("ai.workforce.growthPlaceholder")} value={growthTarget} onChange={(e) => setGrowthTarget(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("ai.workforce.planningCycle")}</label>
              <Select value={timeHorizon} onValueChange={(v) => setTimeHorizon(v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("ai.workforce.unspecified")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("ai.workforce.unspecified")}</SelectItem>
                  {TIME_HORIZON_KEYS.map((h) => <SelectItem key={h.value} value={h.value}>{t(h.labelKey)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!currentHeadcount || !plannedProjects.trim() || !attritionRate || mutation.isPending || !!taskId}>
                {mutation.isPending || !!taskId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("ai.workforce.aiPlan")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Optimal Headcount */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("ai.workforce.optimalHeadcount")}</p>
                    <p className="text-5xl font-bold text-primary">{result.optimalHeadcount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{t("ai.workforce.currentHeadcount")}</p>
                    <p className="text-3xl font-bold text-muted-foreground">{currentHeadcount}</p>
                  </div>
                </div>
                {result.optimalHeadcount > Number(currentHeadcount) && (
                  <p className="text-sm text-green-400 mt-2">
                    {t("ai.workforce.needToHire")} {result.optimalHeadcount - Number(currentHeadcount)} {t("ai.workforce.people")}
                  </p>
                )}
                {result.optimalHeadcount < Number(currentHeadcount) && (
                  <p className="text-sm text-yellow-400 mt-2">
                    {t("ai.workforce.suggestOptimize")} {Number(currentHeadcount) - result.optimalHeadcount} {t("ai.workforce.people")}
                  </p>
                )}
                {result.optimalHeadcount === Number(currentHeadcount) && (
                  <p className="text-sm text-blue-400 mt-2">{t("ai.workforce.headcountReasonable")}</p>
                )}
              </CardContent>
            </Card>

            {/* Hiring Needs */}
            {result.hiringNeeds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserPlus className="h-5 w-5 text-primary" />
                    {t("ai.workforce.hiringNeeds")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t("ai.workforce.role")}</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t("ai.workforce.headcount")}</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t("ai.workforce.priority")}</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t("ai.workforce.timeline")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.hiringNeeds.map((need, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 px-3 font-medium">{need.role}</td>
                            <td className="py-2 px-3">{need.count}{t("ai.workforce.people")}</td>
                            <td className="py-2 px-3">
                              <Badge className={priorityColor(need.priority)}>{priorityLabel(need.priority)}</Badge>
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">{need.timeline}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skill Requirements */}
            {result.skillRequirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-5 w-5 text-primary" />
                    {t("ai.workforce.skillRequirements")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.skillRequirements.map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="text-sm">{skill}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Budget Allocation */}
            {budgetTotal > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    {t("ai.workforce.budgetAllocation")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex h-6 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 flex items-center justify-center text-xs text-white font-medium"
                      style={{ width: `${(result.budgetAllocation.hiring / budgetTotal) * 100}%` }}
                    >
                      {Math.round((result.budgetAllocation.hiring / budgetTotal) * 100)}%
                    </div>
                    <div
                      className="bg-green-500 flex items-center justify-center text-xs text-white font-medium"
                      style={{ width: `${(result.budgetAllocation.training / budgetTotal) * 100}%` }}
                    >
                      {Math.round((result.budgetAllocation.training / budgetTotal) * 100)}%
                    </div>
                    <div
                      className="bg-orange-500 flex items-center justify-center text-xs text-white font-medium"
                      style={{ width: `${(result.budgetAllocation.retention / budgetTotal) * 100}%` }}
                    >
                      {Math.round((result.budgetAllocation.retention / budgetTotal) * 100)}%
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-blue-500" />
                      <span>{t("ai.workforce.hiring")} ({result.budgetAllocation.hiring}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-green-500" />
                      <span>{t("ai.workforce.training")} ({result.budgetAllocation.training}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-orange-500" />
                      <span>{t("ai.workforce.retention")} ({result.budgetAllocation.retention}%)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Factors */}
            {result.riskFactors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    {t("ai.workforce.riskFactors")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.riskFactors.map((risk, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded bg-muted/50">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{risk.factor}</span>
                            <Badge className={impactColor(risk.impact)}>{impactLabel(risk.impact)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{risk.mitigation}</p>
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
                    {t("ai.workforce.aiRecommendations")}
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
