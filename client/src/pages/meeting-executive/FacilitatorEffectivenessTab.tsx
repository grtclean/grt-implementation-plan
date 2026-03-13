import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RefreshCw, Play, ChevronDown, ChevronUp, Target, CheckCircle2,
  Users, Award, BarChart3, Zap, TrendingUp, TrendingDown,
  Minus, Building2, UserCheck, Lightbulb, Star, Shield,
} from "lucide-react";
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-800", B: "bg-blue-100 text-blue-800", C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800", F: "bg-red-100 text-red-800",
};

const STYLE_LABEL_KEYS: Record<string, string> = {
  directive: "meeting.facilitator.styleDirective", collaborative: "meeting.facilitator.styleCollaborative", laissez_faire: "meeting.facilitator.styleLaissezFaire",
  structured: "meeting.facilitator.styleStructured", coaching: "meeting.facilitator.styleCoaching", democratic: "meeting.facilitator.styleDemocratic", unknown: "meeting.facilitator.styleUnknown",
};

const TREND_COLORS: Record<string, string> = {
  improving: "bg-green-100 text-green-800", stable: "bg-gray-100 text-gray-800", declining: "bg-red-100 text-red-800",
};
const TREND_LABEL_KEYS: Record<string, string> = { improving: "meeting.facilitator.trendImproving", stable: "meeting.facilitator.trendStable", declining: "meeting.facilitator.trendDeclining" };

export function FacilitatorEffectivenessTab() {
  const { t } = useLanguage();
  // Section 1: Analyze form
  const [analyzeId, setAnalyzeId] = useState("");
  const [batchIds, setBatchIds] = useState("");

  // Section 3: Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Section 4: Facilitator profile
  const [profileId, setProfileId] = useState("");

  // Section 6: Pattern filters
  const [patternDateFrom, setPatternDateFrom] = useState("");
  const [patternDateTo, setPatternDateTo] = useState("");

  // Section 7: AI coaching
  const [coachingId, setCoachingId] = useState("");

  // Section 9: Manual update
  const [updateId, setUpdateId] = useState("");
  const [updateName, setUpdateName] = useState("");
  const [updateStyle, setUpdateStyle] = useState("");
  const [updateEng, setUpdateEng] = useState("");
  const [updateDec, setUpdateDec] = useState("");
  const [updateTime, setUpdateTime] = useState("");
  const [updateInc, setUpdateInc] = useState("");
  const [updateCla, setUpdateCla] = useState("");
  const [updateCon, setUpdateCon] = useState("");

  // Section 10: Organization snapshot
  const [snapshotScope, setSnapshotScope] = useState("org");
  const [snapshotScopeId, setSnapshotScopeId] = useState("");
  const [snapshotDateFrom, setSnapshotDateFrom] = useState("");
  const [snapshotDateTo, setSnapshotDateTo] = useState("");

  // Queries
  const dashboardQuery = trpc.ime.facilitatorDashboard.useQuery({});
  const analysisListQuery = trpc.ime.facilitatorAnalysisList.useQuery({});
  const profileQuery = trpc.ime.facilitatorProfile.useQuery(
    { facilitatorId: profileId },
    { enabled: !!profileId }
  );
  const comparisonQuery = trpc.ime.facilitatorComparison.useQuery({});
  const patternsQuery = trpc.ime.facilitationPatterns.useQuery({
    dateFrom: patternDateFrom || undefined,
    dateTo: patternDateTo || undefined,
  });
  const stylesQuery = trpc.ime.facilitatorStyles.useQuery({
    dateFrom: patternDateFrom || undefined,
    dateTo: patternDateTo || undefined,
  });
  const trendQuery = trpc.ime.facilitatorTrendData.useQuery({});

  // Mutations
  const analyzeMut = trpc.ime.analyzeMeetingFacilitator.useMutation({
    onSuccess: () => {
      dashboardQuery.refetch();
      analysisListQuery.refetch();
    },
  });
  const batchAnalyzeMut = trpc.ime.batchAnalyzeFacilitators.useMutation({
    onSuccess: () => {
      dashboardQuery.refetch();
      analysisListQuery.refetch();
    },
  });
  const coachingMut = trpc.ime.generateFacilitatorCoaching.useMutation();
  const updateMut = trpc.ime.updateFacilitatorAnalysis.useMutation({
    onSuccess: () => {
      analysisListQuery.refetch();
      dashboardQuery.refetch();
      setUpdateId("");
      setUpdateName("");
      setUpdateStyle("");
      setUpdateEng("");
      setUpdateDec("");
      setUpdateTime("");
      setUpdateInc("");
      setUpdateCla("");
      setUpdateCon("");
    },
  });
  const snapshotMut = trpc.ime.computeFacilitatorSnapshot.useMutation();

  const dashboard = (dashboardQuery.data ?? {}) as any;
  const analysisList = ((analysisListQuery.data as any)?.rows || []) as any[];
  const profileData = (profileQuery.data ?? null) as any;
  const comparisonData = (comparisonQuery.data ?? {}) as any;
  const facilitators = (comparisonData?.facilitators || []) as any[];
  const patternsData = (patternsQuery.data ?? {}) as any;
  const patterns = (patternsData?.patterns || []) as any[];
  const correlations = (patternsData?.correlations || []) as any[];
  const recommendations = (patternsData?.recommendations || []) as any[];
  const stylesData = (stylesQuery.data ?? {}) as any;
  const styles = (stylesData?.styles || []) as any[];
  const trendData = (trendQuery.data || []) as any[];

  const toggleExpand = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Analyze Facilitator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-indigo-500" />
            {t("meeting.facilitator.analyzeTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.facilitator.analyzeDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single analysis */}
          <div className="flex gap-3">
            <Input
              placeholder={t("meeting.facilitator.enterMeetingId")}
              value={analyzeId}
              onChange={(e) => setAnalyzeId(e.target.value)}
              className="w-60"
            />
            <Button
              onClick={() => analyzeMut.mutate({ meetingId: analyzeId })}
              disabled={analyzeMut.isPending || !analyzeId.trim()}
            >
              {analyzeMut.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {t("meeting.facilitator.analyzeFacilitator")}
            </Button>
          </div>
          {analyzeMut.data && (
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
              <p>
                <span className="font-medium">{t("meeting.facilitator.facilitator")}: </span>
                <span className="text-muted-foreground">{(analyzeMut.data as any).facilitatorName ?? "—"}</span>
              </p>
              <p>
                <span className="font-medium">{t("meeting.facilitator.facilitationStyle")}: </span>
                <span className="text-muted-foreground">
                  {STYLE_LABEL_KEYS[(analyzeMut.data as any).facilitationStyle] ? t(STYLE_LABEL_KEYS[(analyzeMut.data as any).facilitationStyle]) : (analyzeMut.data as any).facilitationStyle || "—"}
                </span>
              </p>
              <p>
                <span className="font-medium">{t("meeting.facilitator.effectivenessScore")}: </span>
                <span className="font-semibold">{(analyzeMut.data as any).overallEffectivenessScore ?? "—"}</span>
              </p>
              <p>
                <span className="font-medium">{t("meeting.facilitator.grade")}: </span>
                {(analyzeMut.data as any).grade ? (
                  <Badge className={GRADE_COLORS[(analyzeMut.data as any).grade] || ""}>
                    {(analyzeMut.data as any).grade}
                  </Badge>
                ) : "—"}
              </p>
              <p>
                <span className="font-medium">{t("meeting.facilitator.speakerCount")}: </span>
                <span className="text-muted-foreground">{(analyzeMut.data as any).totalSpeakers ?? 0}</span>
              </p>
            </div>
          )}
          {analyzeMut.isError && (
            <p className="text-sm text-red-500">{t("meeting.facilitator.error")}: {analyzeMut.error.message}</p>
          )}

          {/* Batch analysis */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">{t("meeting.facilitator.batchAnalysis")}</p>
            <div className="flex gap-3">
              <Input
                placeholder={t("meeting.facilitator.batchPlaceholder")}
                value={batchIds}
                onChange={(e) => setBatchIds(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  const ids = batchIds.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
                  if (ids.length > 0) batchAnalyzeMut.mutate({ meetingIds: ids });
                }}
                disabled={batchAnalyzeMut.isPending || !batchIds.trim()}
              >
                {batchAnalyzeMut.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {t("meeting.facilitator.batchAnalysis")}
              </Button>
            </div>
            {batchAnalyzeMut.data && (() => {
              const results = ((batchAnalyzeMut.data as any)?.results ?? []) as any[];
              return (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-green-600">
                    {t("meeting.facilitator.batchSuccessCount")} {results.filter((r: any) => r.success).length} {t("meeting.facilitator.unit")}, {t("meeting.facilitator.batchFailCount")} {results.filter((r: any) => !r.success).length} {t("meeting.facilitator.unit")}
                  </p>
                  {results.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("meeting.facilitator.meetingId")}</TableHead>
                          <TableHead>{t("meeting.facilitator.facilitator")}</TableHead>
                          <TableHead className="text-center">{t("meeting.facilitator.effectivenessScore")}</TableHead>
                          <TableHead className="text-center">{t("meeting.facilitator.grade")}</TableHead>
                          <TableHead className="text-center">{t("meeting.facilitator.status")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((r: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{r.meetingId ?? "—"}</TableCell>
                            <TableCell>{r.facilitatorName ?? "—"}</TableCell>
                            <TableCell className="text-center font-semibold">{r.overallEffectivenessScore ?? "—"}</TableCell>
                            <TableCell className="text-center">
                              {r.grade ? (
                                <Badge className={GRADE_COLORS[r.grade] || ""}>{r.grade}</Badge>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              {r.success ? (
                                <Badge className="bg-green-100 text-green-800" variant="secondary">{t("meeting.facilitator.success")}</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800" variant="secondary">{t("meeting.facilitator.fail")}</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              );
            })()}
            {batchAnalyzeMut.isError && (
              <p className="text-sm text-red-500 mt-2">{t("meeting.facilitator.error")}: {batchAnalyzeMut.error.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3}
          label={t("meeting.facilitator.analyzedMeetings")}
          value={dashboard?.totalMeetingsAnalyzed ?? "..."}
          subtitle="Total Meetings Analyzed"
        />
        <StatCard
          icon={Target}
          label={t("meeting.facilitator.avgEffectivenessScore")}
          value={dashboard?.avgEffectivenessScore ?? "..."}
          subtitle="Avg Effectiveness Score"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={Users}
          label={t("meeting.facilitator.totalFacilitators")}
          value={dashboard?.totalFacilitators ?? "..."}
          subtitle="Total Facilitators"
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={Award}
          label={t("meeting.facilitator.dominantStyle")}
          value={dashboard?.dominantStyle ? (STYLE_LABEL_KEYS[dashboard.dominantStyle] ? t(STYLE_LABEL_KEYS[dashboard.dominantStyle]) : dashboard.dominantStyle) : "..."}
          subtitle="Dominant Style"
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Section 3: Facilitator Analysis List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.facilitator.analysisList")}</CardTitle>
          <CardDescription>{t("meeting.facilitator.analysisListDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {analysisList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.facilitator.meetingId")}</TableHead>
                  <TableHead>{t("meeting.facilitator.facilitator")}</TableHead>
                  <TableHead className="text-center">{t("meeting.facilitator.style")}</TableHead>
                  <TableHead className="text-center">{t("meeting.facilitator.effectivenessScore")}</TableHead>
                  <TableHead className="text-center">{t("meeting.facilitator.engagementImpact")}</TableHead>
                  <TableHead className="text-center">{t("meeting.facilitator.decisionFacilitation")}</TableHead>
                  <TableHead className="text-center">{t("meeting.facilitator.timeManagement")}</TableHead>
                  <TableHead className="text-center">{t("meeting.facilitator.grade")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisList.map((row: any) => {
                  const isExpanded = expandedRows.has(row.id);
                  return (
                    <>
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(row.id)}
                      >
                        <TableCell className="font-mono text-xs" title={row.meeting_id}>
                          {(row.meeting_id || "").length > 8 ? (row.meeting_id || "").slice(0, 8) + "..." : row.meeting_id || "—"}
                        </TableCell>
                        <TableCell>{row.facilitator_name || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {STYLE_LABEL_KEYS[row.facilitation_style] ? t(STYLE_LABEL_KEYS[row.facilitation_style]) : row.facilitation_style || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {row.overall_effectiveness_score ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.engagement_impact_score ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.decision_facilitation_score ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.time_management_score ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.grade ? (
                            <Badge className={GRADE_COLORS[row.grade] || ""}>{row.grade}</Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${row.id}-detail`}>
                          <TableCell colSpan={9} className="bg-muted/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 text-sm">
                              <div className="space-y-2">
                                <div>
                                  <span className="font-medium">{t("meeting.facilitator.inclusivityScore")}: </span>
                                  <span className="text-muted-foreground">{row.inclusivity_score ?? "—"}</span>
                                </div>
                                <div>
                                  <span className="font-medium">{t("meeting.facilitator.clarityScore")}: </span>
                                  <span className="text-muted-foreground">{row.clarity_score ?? "—"}</span>
                                </div>
                                <div>
                                  <span className="font-medium">{t("meeting.facilitator.conflictResolutionScore")}: </span>
                                  <span className="text-muted-foreground">{row.conflict_resolution_score ?? "—"}</span>
                                </div>
                                <div>
                                  <span className="font-medium">{t("meeting.facilitator.speakerBalanceScore")}: </span>
                                  <span className="text-muted-foreground">{row.speaker_balance_score ?? "—"}</span>
                                </div>
                                <div>
                                  <span className="font-medium">{t("meeting.facilitator.speakerCountLabel")}: </span>
                                  <span className="text-muted-foreground">{row.total_speakers ?? "—"}</span>
                                </div>
                                <div>
                                  <span className="font-medium">{t("meeting.facilitator.strengths")}: </span>
                                  {(() => {
                                    try {
                                      const items = JSON.parse(row.strengths || "[]");
                                      if (Array.isArray(items) && items.length > 0) {
                                        return (
                                          <ul className="mt-1 space-y-1">
                                            {items.map((s: string, i: number) => (
                                              <li key={i} className="text-muted-foreground">• {s}</li>
                                            ))}
                                          </ul>
                                        );
                                      }
                                      return <span className="text-muted-foreground">—</span>;
                                    } catch {
                                      return <span className="text-muted-foreground">{row.strengths || "—"}</span>;
                                    }
                                  })()}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <span className="font-medium">{t("meeting.facilitator.weaknesses")}: </span>
                                  {(() => {
                                    try {
                                      const items = JSON.parse(row.weaknesses || "[]");
                                      if (Array.isArray(items) && items.length > 0) {
                                        return (
                                          <ul className="mt-1 space-y-1">
                                            {items.map((w: string, i: number) => (
                                              <li key={i} className="text-muted-foreground">• {w}</li>
                                            ))}
                                          </ul>
                                        );
                                      }
                                      return <span className="text-muted-foreground">—</span>;
                                    } catch {
                                      return <span className="text-muted-foreground">{row.weaknesses || "—"}</span>;
                                    }
                                  })()}
                                </div>
                                <div>
                                  <span className="font-medium">{t("meeting.facilitator.coachingPoints")}: </span>
                                  {(() => {
                                    try {
                                      const items = JSON.parse(row.coaching_points || "[]");
                                      if (Array.isArray(items) && items.length > 0) {
                                        return (
                                          <ul className="mt-1 space-y-1">
                                            {items.map((c: string, i: number) => (
                                              <li key={i} className="text-muted-foreground">• {c}</li>
                                            ))}
                                          </ul>
                                        );
                                      }
                                      return <span className="text-muted-foreground">—</span>;
                                    } catch {
                                      return <span className="text-muted-foreground">{row.coaching_points || "—"}</span>;
                                    }
                                  })()}
                                </div>
                                {row.ai_narrative && (
                                  <div>
                                    <span className="font-medium">{t("meeting.facilitator.aiAnalysis")}: </span>
                                    <p className="text-muted-foreground mt-1">{row.ai_narrative}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
              <p>{t("meeting.facilitator.noAnalysisData")}</p>
              <p className="text-sm">{t("meeting.facilitator.noAnalysisDataDesc")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Facilitator Profile (Radar Chart) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            {t("meeting.facilitator.profile")}
          </CardTitle>
          <CardDescription>{t("meeting.facilitator.profileDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder={t("meeting.facilitator.enterFacilitatorId")}
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="w-60"
            />
            <Button
              onClick={() => profileQuery.refetch()}
              disabled={profileQuery.isFetching || !profileId.trim()}
            >
              {profileQuery.isFetching ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {t("meeting.facilitator.viewProfile")}
            </Button>
          </div>

          {profileData && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
                <p>
                  <span className="font-medium">{t("meeting.facilitator.facilitator")}: </span>
                  <span className="text-muted-foreground">{profileData.facilitatorName ?? "—"}</span>
                </p>
                <p>
                  <span className="font-medium">{t("meeting.facilitator.meetingsFacilitated")}: </span>
                  <span className="text-muted-foreground">{profileData.meetingsFacilitated ?? 0}</span>
                </p>
                <p>
                  <span className="font-medium">{t("meeting.facilitator.avgEffectiveness")}: </span>
                  <span className="font-semibold">{profileData.avgEffectiveness ?? "—"}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Radar chart */}
                <div>
                  <h4 className="text-sm font-medium mb-2">{t("meeting.facilitator.radarChart")}</h4>
                  {(profileData.radarData || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={profileData.radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar
                          name={t("meeting.facilitator.score")}
                          dataKey="score"
                          stroke="#6366f1"
                          fill="#6366f1"
                          fillOpacity={0.3}
                        />
                        <Tooltip />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">{t("meeting.facilitator.noRadarData")}</p>
                  )}
                </div>

                {/* Style distribution pie */}
                <div>
                  <h4 className="text-sm font-medium mb-2">{t("meeting.facilitator.styleDistribution")}</h4>
                  {(profileData.styleDistribution || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={(profileData.styleDistribution as any[]).map((s: any) => ({
                            name: STYLE_LABEL_KEYS[s.style] ? t(STYLE_LABEL_KEYS[s.style]) : s.style,
                            value: s.count,
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {(profileData.styleDistribution as any[]).map((_: any, idx: number) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">{t("meeting.facilitator.noStyleDistribution")}</p>
                  )}
                </div>
              </div>

              {/* Trend */}
              {profileData.trend && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t("meeting.facilitator.effectivenessTrend")}:</span>
                  <Badge className={TREND_COLORS[profileData.trend] || ""} variant="secondary">
                    {(() => {
                      const Icon = profileData.trend === "improving" ? TrendingUp : profileData.trend === "declining" ? TrendingDown : Minus;
                      return (
                        <>
                          <Icon className="h-3 w-3 mr-1" />
                          {TREND_LABEL_KEYS[profileData.trend] ? t(TREND_LABEL_KEYS[profileData.trend]) : profileData.trend}
                        </>
                      );
                    })()}
                  </Badge>
                </div>
              )}
            </div>
          )}
          {profileQuery.isError && (
            <p className="text-sm text-red-500">{t("meeting.facilitator.error")}: {profileQuery.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Facilitator Comparison (Bar Chart) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            {t("meeting.facilitator.comparison")}
          </CardTitle>
          <CardDescription>{t("meeting.facilitator.comparisonDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {facilitators.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={facilitators}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="facilitatorName"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v?.length > 8 ? v.slice(0, 8) + "..." : v}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgEffectiveness" name={t("meeting.facilitator.avgEffectivenessBar")} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-muted-foreground">{t("meeting.facilitator.noComparisonData")}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Average */}
            <Card>
              <CardContent className="pt-4 text-center">
                <Target className="h-5 w-5 mx-auto text-indigo-500 mb-1" />
                <div className="text-xl font-bold">{comparisonData.avgEffectiveness ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{t("meeting.facilitator.overallAvgEffectiveness")}</div>
              </CardContent>
            </Card>

            {/* Best facilitator */}
            {comparisonData.bestFacilitator && (
              <Card className="border-green-200">
                <CardContent className="pt-4 text-center">
                  <Award className="h-5 w-5 mx-auto text-green-500 mb-1" />
                  <div className="text-lg font-bold text-green-700">
                    {comparisonData.bestFacilitator.facilitatorName ?? "—"}
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    {comparisonData.bestFacilitator.avgEffectiveness ?? "—"}{t("meeting.facilitator.points")}
                  </div>
                  <div className="text-xs text-muted-foreground">{t("meeting.facilitator.bestFacilitator")}</div>
                </CardContent>
              </Card>
            )}

            {/* Worst facilitator */}
            {comparisonData.worstFacilitator && (
              <Card className="border-red-200">
                <CardContent className="pt-4 text-center">
                  <TrendingDown className="h-5 w-5 mx-auto text-red-500 mb-1" />
                  <div className="text-lg font-bold text-red-700">
                    {comparisonData.worstFacilitator.facilitatorName ?? "—"}
                  </div>
                  <div className="text-sm font-semibold text-red-600">
                    {comparisonData.worstFacilitator.avgEffectiveness ?? "—"}{t("meeting.facilitator.points")}
                  </div>
                  <div className="text-xs text-muted-foreground">{t("meeting.facilitator.needsImprovement")}</div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Facilitation Patterns & Style Classification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-500" />
            {t("meeting.facilitator.patternsTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.facilitator.patternsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              type="date"
              value={patternDateFrom}
              onChange={(e) => setPatternDateFrom(e.target.value)}
              className="w-44"
              placeholder={t("meeting.facilitator.startDate")}
            />
            <Input
              type="date"
              value={patternDateTo}
              onChange={(e) => setPatternDateTo(e.target.value)}
              className="w-44"
              placeholder={t("meeting.facilitator.endDate")}
            />
            <Button
              onClick={() => {
                patternsQuery.refetch();
                stylesQuery.refetch();
              }}
              disabled={patternsQuery.isFetching || stylesQuery.isFetching}
            >
              {patternsQuery.isFetching || stylesQuery.isFetching ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {t("meeting.facilitator.analyzePatterns")}
            </Button>
          </div>

          {/* Patterns table */}
          {patterns.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">{t("meeting.facilitator.patterns")}</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("meeting.facilitator.pattern")}</TableHead>
                    <TableHead className="text-center">{t("meeting.facilitator.frequency")}</TableHead>
                    <TableHead className="text-center">{t("meeting.facilitator.impact")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patterns.map((p: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="max-w-[250px] truncate">{p.pattern ?? p.name ?? "—"}</TableCell>
                      <TableCell className="text-center">{p.frequency ?? p.count ?? 0}</TableCell>
                      <TableCell className="text-center">{p.impact ?? p.avgImpact ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Correlations table */}
          {correlations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">{t("meeting.facilitator.correlationAnalysis")}</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("meeting.facilitator.factor1")}</TableHead>
                    <TableHead>{t("meeting.facilitator.factor2")}</TableHead>
                    <TableHead className="text-center">{t("meeting.facilitator.relationship")}</TableHead>
                    <TableHead className="text-center">{t("meeting.facilitator.strengthLevel")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {correlations.map((c: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{c.factor1 ?? "—"}</TableCell>
                      <TableCell>{c.factor2 ?? "—"}</TableCell>
                      <TableCell className="text-center">{c.relationship ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className={
                          c.strength === "strong" ? "bg-green-100 text-green-800" :
                          c.strength === "moderate" ? "bg-amber-100 text-amber-800" :
                          "bg-gray-100 text-gray-800"
                        }>
                          {c.strength === "strong" ? t("meeting.facilitator.strong") : c.strength === "moderate" ? t("meeting.facilitator.moderate") : c.strength === "weak" ? t("meeting.facilitator.weak") : c.strength ?? "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">{t("meeting.facilitator.recommendations")}</h4>
              <ul className="space-y-1 text-sm">
                {recommendations.map((r: any, i: number) => (
                  <li key={i} className="text-muted-foreground">• {typeof r === "string" ? r : r.recommendation ?? r.text ?? ""}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Style classification */}
          {styles.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">{t("meeting.facilitator.styleClassification")}</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Pie chart of style distribution */}
                <div>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={styles.map((s: any) => ({
                          name: STYLE_LABEL_KEYS[s.style] ? t(STYLE_LABEL_KEYS[s.style]) : s.style,
                          value: s.count,
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {styles.map((_: any, idx: number) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Style effectiveness list */}
                <div className="space-y-2">
                  {styles.map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                      <div>
                        <span className="font-medium">{STYLE_LABEL_KEYS[s.style] ? t(STYLE_LABEL_KEYS[s.style]) : s.style}</span>
                        <span className="text-muted-foreground text-sm ml-2">({s.count}{t("meeting.facilitator.times")})</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">{t("meeting.facilitator.effectiveness")}: </span>
                          <span className="font-semibold">{s.avgEffectiveness ?? "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("meeting.facilitator.outcome")}: </span>
                          <span className="font-semibold">{s.avgMeetingOutcome ?? "—"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 7: AI Coaching Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            {t("meeting.facilitator.aiCoaching")}
          </CardTitle>
          <CardDescription>{t("meeting.facilitator.aiCoachingDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder={t("meeting.facilitator.enterFacilitatorId")}
              value={coachingId}
              onChange={(e) => setCoachingId(e.target.value)}
              className="w-60"
            />
            <Button
              onClick={() => coachingMut.mutate({ facilitatorId: coachingId })}
              disabled={coachingMut.isPending || !coachingId.trim()}
            >
              {coachingMut.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {t("meeting.facilitator.generateCoaching")}
            </Button>
          </div>

          {coachingMut.data && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
                <p>
                  <span className="font-medium">{t("meeting.facilitator.facilitator")}: </span>
                  <span className="text-muted-foreground">{(coachingMut.data as any).facilitatorName ?? "—"}</span>
                </p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {(coachingMut.data as any).topStrength && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{t("meeting.facilitator.topStrength")}:</span>
                      <Badge className="bg-green-100 text-green-800" variant="secondary">
                        <Star className="h-3 w-3 mr-1" />
                        {(coachingMut.data as any).topStrength}
                      </Badge>
                    </div>
                  )}
                  {(coachingMut.data as any).topWeakness && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{t("meeting.facilitator.topWeakness")}:</span>
                      <Badge className="bg-red-100 text-red-800" variant="secondary">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        {(coachingMut.data as any).topWeakness}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Personalized plan table */}
              {((coachingMut.data as any).personalizedPlan || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">{t("meeting.facilitator.personalizedPlan")}</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("meeting.facilitator.area")}</TableHead>
                        <TableHead className="text-center">{t("meeting.facilitator.currentScore")}</TableHead>
                        <TableHead className="text-center">{t("meeting.facilitator.targetScore")}</TableHead>
                        <TableHead>{t("meeting.facilitator.actionPlan")}</TableHead>
                        <TableHead className="text-center">{t("meeting.facilitator.timeline")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {((coachingMut.data as any).personalizedPlan as any[]).map((p: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{p.area ?? "—"}</TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold">{p.currentScore ?? "—"}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold text-green-600">{p.targetScore ?? "—"}</span>
                          </TableCell>
                          <TableCell className="max-w-[250px]">
                            {(() => {
                              const actions = Array.isArray(p.actions) ? p.actions : [];
                              if (actions.length > 0) {
                                return (
                                  <ul className="space-y-1 text-sm text-muted-foreground">
                                    {actions.map((a: string, j: number) => (
                                      <li key={j}>• {a}</li>
                                    ))}
                                  </ul>
                                );
                              }
                              return <span className="text-muted-foreground">{typeof p.actions === "string" ? p.actions : "—"}</span>;
                            })()}
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {p.timeline ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Quick wins */}
              {((coachingMut.data as any).quickWins || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">{t("meeting.facilitator.quickWins")}</h4>
                  <ul className="space-y-1 text-sm">
                    {((coachingMut.data as any).quickWins as string[]).map((w: string, i: number) => (
                      <li key={i} className="text-muted-foreground flex items-start gap-1">
                        <Zap className="h-3 w-3 mt-1 text-amber-500 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI narrative */}
              {(coachingMut.data as any).aiNarrative && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-1">{t("meeting.facilitator.aiAnalysis")}</h4>
                  <p className="text-sm text-muted-foreground">{(coachingMut.data as any).aiNarrative}</p>
                </div>
              )}
            </div>
          )}
          {coachingMut.isError && (
            <p className="text-sm text-red-500">{t("meeting.facilitator.error")}: {coachingMut.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 8: Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            {t("meeting.facilitator.trendTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.facilitator.trendDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="periodEnd"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v?.split("T")[0] || v}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip labelFormatter={(v: string) => v?.split("T")[0] || v} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgEffectivenessScore"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name={t("meeting.facilitator.avgEffectivenessLine")}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgSpeakerBalance"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name={t("meeting.facilitator.speakerBalanceLine")}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-muted-foreground">{t("meeting.facilitator.noTrendData")}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 9: Manual Update */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            {t("meeting.facilitator.manualUpdate")}
          </CardTitle>
          <CardDescription>{t("meeting.facilitator.manualUpdateDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder={t("meeting.facilitator.analysisRecordId")}
              type="number"
              value={updateId}
              onChange={(e) => setUpdateId(e.target.value)}
            />
            <Input
              placeholder={t("meeting.facilitator.facilitatorName")}
              value={updateName}
              onChange={(e) => setUpdateName(e.target.value)}
            />
            <Select value={updateStyle} onValueChange={setUpdateStyle}>
              <SelectTrigger>
                <SelectValue placeholder={t("meeting.facilitator.selectStyle")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="directive">{t("meeting.facilitator.styleDirective")}</SelectItem>
                <SelectItem value="collaborative">{t("meeting.facilitator.styleCollaborative")}</SelectItem>
                <SelectItem value="laissez_faire">{t("meeting.facilitator.styleLaissezFaire")}</SelectItem>
                <SelectItem value="structured">{t("meeting.facilitator.styleStructured")}</SelectItem>
                <SelectItem value="coaching">{t("meeting.facilitator.styleCoaching")}</SelectItem>
                <SelectItem value="democratic">{t("meeting.facilitator.styleDemocratic")}</SelectItem>
                <SelectItem value="unknown">{t("meeting.facilitator.styleUnknown")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.facilitator.engagementScore")}</label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder={t("meeting.facilitator.engagementImpact")}
                value={updateEng}
                onChange={(e) => setUpdateEng(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.facilitator.decisionScore")}</label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder={t("meeting.facilitator.decisionFacilitation")}
                value={updateDec}
                onChange={(e) => setUpdateDec(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.facilitator.timeScore")}</label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder={t("meeting.facilitator.timeManagement")}
                value={updateTime}
                onChange={(e) => setUpdateTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.facilitator.inclusivityScoreLabel")}</label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder={t("meeting.facilitator.inclusivityScore")}
                value={updateInc}
                onChange={(e) => setUpdateInc(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.facilitator.clarityScoreLabel")}</label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder={t("meeting.facilitator.clarityScore")}
                value={updateCla}
                onChange={(e) => setUpdateCla(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.facilitator.conflictScoreLabel")}</label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder={t("meeting.facilitator.conflictResolutionScore")}
                value={updateCon}
                onChange={(e) => setUpdateCon(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={() =>
              updateMut.mutate({
                id: Number(updateId),
                facilitatorName: updateName || undefined,
                facilitationStyle: updateStyle || undefined,
                engagementImpactScore: updateEng ? Number(updateEng) : undefined,
                decisionFacilitationScore: updateDec ? Number(updateDec) : undefined,
                timeManagementScore: updateTime ? Number(updateTime) : undefined,
                inclusivityScore: updateInc ? Number(updateInc) : undefined,
                clarityScore: updateCla ? Number(updateCla) : undefined,
                conflictResolutionScore: updateCon ? Number(updateCon) : undefined,
              })
            }
            disabled={updateMut.isPending || !updateId}
          >
            {updateMut.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Target className="h-4 w-4 mr-2" />
            )}
            {t("meeting.facilitator.updateAnalysis")}
          </Button>
          {updateMut.data && (
            <p className="text-sm text-green-600">{t("meeting.facilitator.analysisUpdated")}</p>
          )}
          {updateMut.isError && (
            <p className="text-sm text-red-500">{t("meeting.facilitator.error")}: {updateMut.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 10: Organization Facilitator Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-500" />
            {t("meeting.facilitator.orgIntelligence")}
          </CardTitle>
          <CardDescription>{t("meeting.facilitator.orgIntelligenceDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={snapshotScope} onValueChange={setSnapshotScope}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("meeting.facilitator.selectScope")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org">{t("meeting.facilitator.scopeOrg")}</SelectItem>
                <SelectItem value="department">{t("meeting.facilitator.scopeDepartment")}</SelectItem>
                <SelectItem value="team">{t("meeting.facilitator.scopeTeam")}</SelectItem>
                <SelectItem value="individual">{t("meeting.facilitator.scopeIndividual")}</SelectItem>
              </SelectContent>
            </Select>
            {snapshotScope !== "org" && (
              <Input
                placeholder={snapshotScope === "department" ? t("meeting.facilitator.enterDeptId") : snapshotScope === "team" ? t("meeting.facilitator.enterTeamId") : t("meeting.facilitator.enterPersonId")}
                value={snapshotScopeId}
                onChange={(e) => setSnapshotScopeId(e.target.value)}
                className="w-48"
              />
            )}
            <Input
              type="date"
              value={snapshotDateFrom}
              onChange={(e) => setSnapshotDateFrom(e.target.value)}
              className="w-44"
            />
            <Input
              type="date"
              value={snapshotDateTo}
              onChange={(e) => setSnapshotDateTo(e.target.value)}
              className="w-44"
            />
            <Button
              onClick={() =>
                snapshotMut.mutate({
                  scope: snapshotScope,
                  scopeId: snapshotScopeId || undefined,
                  dateFrom: snapshotDateFrom || undefined,
                  dateTo: snapshotDateTo || undefined,
                })
              }
              disabled={snapshotMut.isPending}
            >
              {snapshotMut.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {t("meeting.facilitator.generateSnapshot")}
            </Button>
          </div>
          {snapshotMut.data && (() => {
            const snap = (snapshotMut.data as any)?.snapshot ?? snapshotMut.data;
            return (
              <div className="space-y-4">
                {/* Metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Target className="h-5 w-5 mx-auto text-indigo-500 mb-1" />
                      <div className="text-xl font-bold">{snap.avgEffectivenessScore ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{t("meeting.facilitator.avgEffectivenessScore")}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <BarChart3 className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                      <div className="text-xl font-bold">{snap.totalMeetingsAnalyzed ?? 0}</div>
                      <div className="text-xs text-muted-foreground">{t("meeting.facilitator.analyzedMeetings")}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Users className="h-5 w-5 mx-auto text-green-500 mb-1" />
                      <div className="text-xl font-bold">{snap.totalFacilitators ?? 0}</div>
                      <div className="text-xs text-muted-foreground">{t("meeting.facilitator.totalFacilitators")}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Award className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                      <div className="text-xl font-bold">
                        {snap.overallGrade ? (
                          <Badge className={GRADE_COLORS[snap.overallGrade] || ""}>{snap.overallGrade}</Badge>
                        ) : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">{t("meeting.facilitator.overallGrade")}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Grade distribution */}
                {(() => {
                  try {
                    const gradeDist = typeof snap.gradeDistribution === "string"
                      ? JSON.parse(snap.gradeDistribution)
                      : snap.gradeDistribution;
                    if (gradeDist && typeof gradeDist === "object") {
                      const entries = Array.isArray(gradeDist)
                        ? gradeDist
                        : Object.entries(gradeDist).map(([grade, count]) => ({ grade, count }));
                      if (entries.length > 0) {
                        return (
                          <div>
                            <h4 className="text-sm font-medium mb-2">{t("meeting.facilitator.gradeDistribution")}</h4>
                            <div className="flex gap-2 flex-wrap">
                              {entries.map((item: any, i: number) => {
                                const grade = item.grade || item.name || "";
                                const count = item.count || item.value || 0;
                                return (
                                  <div key={i} className="flex items-center gap-1">
                                    <Badge className={GRADE_COLORS[grade] || ""}>{grade}</Badge>
                                    <div className="bg-gray-200 rounded h-4 w-20 relative">
                                      <div
                                        className="bg-indigo-500 h-4 rounded"
                                        style={{ width: `${Math.min(count * 10, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium">{count}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })()}

                {/* Top facilitators */}
                {(() => {
                  try {
                    const topList = typeof snap.topFacilitators === "string"
                      ? JSON.parse(snap.topFacilitators)
                      : snap.topFacilitators;
                    if (Array.isArray(topList) && topList.length > 0) {
                      return (
                        <div>
                          <h4 className="text-sm font-medium mb-1">{t("meeting.facilitator.topFacilitators")}</h4>
                          <ul className="space-y-1 text-sm">
                            {topList.map((f: any, i: number) => (
                              <li key={i} className="flex items-center gap-2">
                                <Star className="h-3 w-3 text-green-500" />
                                <span className="font-medium">{typeof f === "string" ? f : f.name ?? f.facilitatorName ?? "—"}</span>
                                {typeof f !== "string" && f.score != null && (
                                  <span className="text-muted-foreground">({f.score}{t("meeting.facilitator.points")})</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })()}

                {/* Bottom facilitators */}
                {(() => {
                  try {
                    const bottomList = typeof snap.bottomFacilitators === "string"
                      ? JSON.parse(snap.bottomFacilitators)
                      : snap.bottomFacilitators;
                    if (Array.isArray(bottomList) && bottomList.length > 0) {
                      return (
                        <div>
                          <h4 className="text-sm font-medium mb-1">{t("meeting.facilitator.bottomFacilitators")}</h4>
                          <ul className="space-y-1 text-sm">
                            {bottomList.map((f: any, i: number) => (
                              <li key={i} className="flex items-center gap-2">
                                <TrendingDown className="h-3 w-3 text-red-500" />
                                <span className="font-medium">{typeof f === "string" ? f : f.name ?? f.facilitatorName ?? "—"}</span>
                                {typeof f !== "string" && f.score != null && (
                                  <span className="text-muted-foreground">({f.score}{t("meeting.facilitator.points")})</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })()}

                {/* Style distribution */}
                {(() => {
                  try {
                    const styleDist = typeof snap.styleDistribution === "string"
                      ? JSON.parse(snap.styleDistribution)
                      : snap.styleDistribution;
                    if (Array.isArray(styleDist) && styleDist.length > 0) {
                      return (
                        <div>
                          <h4 className="text-sm font-medium mb-2">{t("meeting.facilitator.styleDistribution")}</h4>
                          <div className="flex gap-3 flex-wrap">
                            {styleDist.map((s: any, i: number) => (
                              <div key={i} className="flex items-center gap-1">
                                <Badge variant="secondary">
                                  {STYLE_LABEL_KEYS[s.style] ? t(STYLE_LABEL_KEYS[s.style]) : s.style || s.name || "—"}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {s.count ?? s.value ?? 0}{t("meeting.facilitator.times")}
                                  {s.percent != null && ` (${s.percent}%)`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })()}

                {/* AI narrative */}
                {snap.aiNarrative && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-1">{t("meeting.facilitator.aiAnalysis")}</h4>
                    <p className="text-sm text-muted-foreground">{snap.aiNarrative}</p>
                  </div>
                )}

                {/* Best practices */}
                {(() => {
                  try {
                    const practices = typeof snap.bestPractices === "string"
                      ? JSON.parse(snap.bestPractices)
                      : snap.bestPractices;
                    if (Array.isArray(practices) && practices.length > 0) {
                      return (
                        <div>
                          <h4 className="text-sm font-medium mb-1">{t("meeting.facilitator.bestPractices")}</h4>
                          <ul className="space-y-1 text-sm">
                            {practices.map((p: string, i: number) => (
                              <li key={i} className="text-muted-foreground flex items-start gap-1">
                                <CheckCircle2 className="h-3 w-3 mt-1 text-green-500 shrink-0" />
                                {typeof p === "string" ? p : (p as any).text ?? (p as any).practice ?? ""}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })()}

                {/* Recommendations */}
                {(() => {
                  try {
                    const recs = typeof snap.recommendations === "string"
                      ? JSON.parse(snap.recommendations)
                      : snap.recommendations;
                    if (Array.isArray(recs) && recs.length > 0) {
                      return (
                        <div>
                          <h4 className="text-sm font-medium mb-1">{t("meeting.facilitator.optimizationSuggestions")}</h4>
                          <ul className="space-y-1 text-sm">
                            {recs.map((r: string, i: number) => (
                              <li key={i} className="text-muted-foreground">• {typeof r === "string" ? r : (r as any).text ?? ""}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })()}
              </div>
            );
          })()}
          {snapshotMut.isError && (
            <p className="text-sm text-red-500">{t("meeting.facilitator.error")}: {snapshotMut.error.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
