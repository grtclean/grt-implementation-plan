import { useState } from "react";
import {
  Activity,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-amber-500",
  D: "bg-orange-500",
  F: "bg-red-500",
};

const GRADE_TEXT_COLORS: Record<string, string> = {
  A: "text-green-600",
  B: "text-blue-600",
  C: "text-amber-600",
  D: "text-orange-600",
  F: "text-red-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "border-red-200 bg-red-50",
  medium: "border-amber-200 bg-amber-50",
  low: "border-blue-200 bg-blue-50",
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const DIMENSION_LABEL_KEYS: Record<string, string> = {
  effectiveness: "meeting.health.dimEffectiveness",
  costEfficiency: "meeting.health.dimCostEfficiency",
  sentiment: "meeting.health.dimSentiment",
  actionCompletion: "meeting.health.dimActionCompletion",
  topicResolution: "meeting.health.dimTopicResolution",
  participationBalance: "meeting.health.dimParticipationBalance",
};

const SCOPE_OPTION_KEYS: Record<string, string> = {
  meeting: "meeting.health.scopeMeeting",
  department: "meeting.health.scopeDepartment",
  organization: "meeting.health.scopeOrganization",
};

export function MeetingHealthTab() {
  const { t } = useLanguage();
  const [scope, setScope] = useState("organization");
  const [scopeId, setScopeId] = useState("");
  const [period, setPeriod] = useState("");

  const computeMutation = trpc.ime.computeHealth.useMutation();
  const { data: dashboard, isLoading } = trpc.ime.healthDashboard.useQuery({ scope });
  const optimizationQuery = trpc.ime.optimizationRecommendations.useQuery(
    { scope, scopeId: scopeId || undefined },
    { enabled: false }
  );

  const current = dashboard?.current;
  const trend = (dashboard?.trend ?? []) as any[];
  const deptComparison = (dashboard?.departmentComparison ?? []) as any[];

  const handleCompute = () => {
    computeMutation.mutate({
      scope,
      scopeId: scopeId || undefined,
      period: period || undefined,
    });
  };

  const handleOptimize = () => {
    optimizationQuery.refetch();
  };

  const computeResult = computeMutation.data as any;
  const displayData = computeResult || current;

  const radarData = displayData?.dimensions
    ? Object.entries(displayData.dimensions).map(([key, value]) => ({
        dimension: t(DIMENSION_LABEL_KEYS[key] || `meeting.health.dim.${key}`),
        value: Math.round(Number(value)),
      }))
    : [];

  const recommendations = computeResult?.recommendations || current?.recommendations || [];
  const optimizationRecs = (optimizationQuery.data as any)?.recommendations || [];

  const priorityLabel = (p: string) =>
    p === "high" ? t("meeting.health.priorityHigh") : p === "medium" ? t("meeting.health.priorityMedium") : t("meeting.health.priorityLow");

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            {t("meeting.health.title")}
          </CardTitle>
          <CardDescription>{t("meeting.health.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex gap-1">
              {(["meeting", "department", "organization"] as const).map((opt) => (
                <Button
                  key={opt}
                  variant={scope === opt ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScope(opt)}
                >
                  {t(SCOPE_OPTION_KEYS[opt])}
                </Button>
              ))}
            </div>
            {scope !== "organization" && (
              <Input
                placeholder={scope === "meeting" ? t("meeting.health.meetingIdPlaceholder") : t("meeting.health.deptIdPlaceholder")}
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                className="max-w-[200px]"
              />
            )}
            <Input
              placeholder={t("meeting.health.periodPlaceholder")}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="max-w-[200px]"
            />
            <Button
              onClick={handleCompute}
              disabled={computeMutation.isPending}
            >
              {computeMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Activity className="h-4 w-4 mr-2" />
              )}
              {t("meeting.health.computeHealth")}
            </Button>
            <Button
              variant="outline"
              onClick={handleOptimize}
              disabled={optimizationQuery.isFetching}
            >
              {optimizationQuery.isFetching ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4 mr-2" />
              )}
              {t("meeting.health.getOptimization")}
            </Button>
          </div>
          {computeMutation.isError && (
            <p className="text-sm text-red-500">{t("meeting.health.computeFailed")}: {computeMutation.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Health score display */}
      {displayData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Score circle */}
          <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center">
              <div className="relative w-40 h-40 mb-4">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                  <circle
                    cx="50" cy="50" r="42"
                    stroke={displayData.grade === "A" ? "#22c55e" : displayData.grade === "B" ? "#3b82f6" : displayData.grade === "C" ? "#f59e0b" : displayData.grade === "D" ? "#f97316" : "#ef4444"}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(Number(displayData.healthScore) / 100) * 264} 264`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{Math.round(Number(displayData.healthScore))}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className={`text-4xl font-bold ${GRADE_TEXT_COLORS[displayData.grade] || ""}`}>
                {displayData.grade}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{t("meeting.health.healthGrade")}</div>
            </CardContent>
          </Card>

          {/* Radar chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t("meeting.health.sixDimensions")}</CardTitle>
            </CardHeader>
            <CardContent>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar
                      dataKey="value"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.3}
                      name={t("meeting.health.score")}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8 text-muted-foreground">{t("meeting.health.noDimensionData")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Health trend */}
      {trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.health.healthTrend")}</CardTitle>
            <CardDescription>{t("meeting.health.healthTrendDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="computedAt"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString()}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip labelFormatter={(v) => new Date(v).toLocaleString()} />
                <Line type="monotone" dataKey="healthScore" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name={t("meeting.health.healthScore")} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              {t("meeting.health.improvements")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec: any, i: number) => (
              <div key={i} className={`p-4 rounded-lg border ${PRIORITY_COLORS[rec.priority] || "border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={PRIORITY_BADGE[rec.priority] as any || "outline"}>
                    {priorityLabel(rec.priority)}
                  </Badge>
                  <Badge variant="outline">{rec.type}</Badge>
                  <span className="font-medium text-sm">{rec.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{rec.description}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <ArrowRight className="h-3 w-3" />
                  {t("meeting.health.expectedImpact")}: {rec.expectedImpact}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Optimization recommendations */}
      {optimizationRecs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              {t("meeting.health.optimizationTitle")}
            </CardTitle>
            <CardDescription>{t("meeting.health.optimizationDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {optimizationRecs.map((rec: any, i: number) => (
              <div key={i} className={`p-4 rounded-lg border ${PRIORITY_COLORS[rec.priority] || "border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={PRIORITY_BADGE[rec.priority] as any || "outline"}>
                    {priorityLabel(rec.priority)}
                  </Badge>
                  <Badge variant="outline">{rec.type}</Badge>
                  <span className="font-medium text-sm">{rec.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{rec.description}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <ArrowRight className="h-3 w-3" />
                  {t("meeting.health.expectedImpact")}: {rec.expectedImpact}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Department comparison */}
      {deptComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.health.deptComparison")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {deptComparison.map((dept: any) => (
                <div key={dept.department} className="p-4 rounded-lg border text-center">
                  <div className="text-xs text-muted-foreground mb-1">{dept.department}</div>
                  <div className="text-2xl font-bold">{Math.round(Number(dept.healthScore))}</div>
                  <Badge className={`${GRADE_COLORS[dept.grade] || "bg-gray-500"} text-white mt-1`}>
                    {dept.grade}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!displayData && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t("meeting.health.noHealthData")}</p>
            <p className="text-sm">{t("meeting.health.pleaseCompute")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
