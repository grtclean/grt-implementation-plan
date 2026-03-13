import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Network, Users, Building2, AlertTriangle, FileQuestion, ChevronDown, ChevronUp, Play, Loader2 } from "lucide-react";
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  F: "bg-red-100 text-red-800",
};
const RISK_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

export function CollaborationNetworkTab() {
  const { t } = useLanguage();
  // Build network form
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Collaborator pairs filter
  const [pairsRelType, setPairsRelType] = useState("all");
  const [pairsDept, setPairsDept] = useState("");

  // Necessity analysis
  const [singleMeetingId, setSingleMeetingId] = useState("");
  const [batchIds, setBatchIds] = useState("");

  // Expanded rows
  const [expandedSilo, setExpandedSilo] = useState<number | null>(null);
  const [expandedNecessity, setExpandedNecessity] = useState<number | null>(null);

  // Queries
  const statsQuery = trpc.ime.collaborationNetworkStats.useQuery({});
  const pairsQuery = trpc.ime.topCollaboratorPairs.useQuery({
    limit: 20,
    relationshipType: pairsRelType === "all" ? undefined : pairsRelType,
    department: pairsDept || undefined,
  });
  const crossDeptQuery = trpc.ime.crossDepartmentMetrics.useQuery({});
  const silosQuery = trpc.ime.detectSilos.useQuery({});
  const necessityQuery = trpc.ime.meetingNecessityScores.useQuery({});

  // Mutations
  const buildMut = trpc.ime.buildCollaborationNetwork.useMutation({
    onSuccess: () => {
      statsQuery.refetch();
      pairsQuery.refetch();
      crossDeptQuery.refetch();
      silosQuery.refetch();
    },
  });
  const analyzeMut = trpc.ime.analyzeMeetingNecessity.useMutation({
    onSuccess: () => { necessityQuery.refetch(); setSingleMeetingId(""); },
  });
  const batchMut = trpc.ime.batchAnalyzeNecessity.useMutation({
    onSuccess: () => { necessityQuery.refetch(); setBatchIds(""); },
  });

  const stats = statsQuery.data as any;
  const pairs = (pairsQuery.data || []) as any[];
  const crossDeptData = (crossDeptQuery.data || []) as any[];
  const silos = (silosQuery.data || []) as any[];
  const necessityScores = (necessityQuery.data || []) as any[];

  // Silo risk distribution for pie chart
  const siloRiskDist = (() => {
    const counts = { high: 0, medium: 0, low: 0 };
    silos.forEach((s: any) => { counts[s.riskLevel as keyof typeof counts]++; });
    return [
      { name: t("meeting.collab.riskHigh"), value: counts.high, color: "#ef4444" },
      { name: t("meeting.collab.riskMedium"), value: counts.medium, color: "#f59e0b" },
      { name: t("meeting.collab.riskLow"), value: counts.low, color: "#22c55e" },
    ].filter(d => d.value > 0);
  })();

  // Necessity grade distribution for pie chart
  const gradeDist = (() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    necessityScores.forEach((s: any) => { counts[s.necessity_grade]++; });
    return [
      { name: t("meeting.collab.gradeA"), value: counts.A, color: "#22c55e" },
      { name: t("meeting.collab.gradeB"), value: counts.B, color: "#6366f1" },
      { name: t("meeting.collab.gradeC"), value: counts.C, color: "#f59e0b" },
      { name: t("meeting.collab.gradeD"), value: counts.D, color: "#f97316" },
      { name: t("meeting.collab.gradeF"), value: counts.F, color: "#ef4444" },
    ].filter(d => d.value > 0);
  })();

  // Cross-dept chart data
  const chartData = crossDeptData.map((d: any) => ({
    department: d.dept || t("meeting.collab.unknown"),
    internal: Number(d.internal_edges || 0),
    crossDept: Number(d.cross_dept_edges || 0),
  }));

  return (
    <div className="space-y-6">
      {/* Section 1: Header & Build Network */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="h-5 w-5" /> {t("meeting.collab.buildTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.collab.buildDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div>
              <label className="text-sm text-muted-foreground">{t("meeting.collab.dateFrom")}</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("meeting.collab.dateTo")}</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
            </div>
            <Button
              onClick={() => buildMut.mutate({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })}
              disabled={buildMut.isPending}
            >
              {buildMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              {t("meeting.collab.buildBtn")}
            </Button>
          </div>
          {buildMut.data && (
            <p className="mt-3 text-sm text-green-600">
              {t("meeting.collab.buildComplete")} {(buildMut.data as any).meetingsScanned} {t("meeting.collab.meetingsScanned")} {(buildMut.data as any).edgesCreated} {t("meeting.collab.edgesCreated")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Network}
          label={t("meeting.collab.totalEdges")}
          value={statsQuery.isLoading ? "..." : stats?.totalEdges ?? 0}
        />
        <StatCard
          icon={Users}
          label={t("meeting.collab.activeCollaborators")}
          value={statsQuery.isLoading ? "..." : stats?.uniqueParticipants ?? 0}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={Building2}
          label={t("meeting.collab.crossDeptPercent")}
          value={statsQuery.isLoading ? "..." : `${stats?.crossDeptPercentage ?? 0}%`}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={Network}
          label={t("meeting.collab.avgScore")}
          value={statsQuery.isLoading ? "..." : stats?.avgScore ?? 0}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Section 3: Top Collaborator Pairs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.collab.pairsTitle")}</CardTitle>
          <CardDescription>{t("meeting.collab.pairsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Select value={pairsRelType} onValueChange={setPairsRelType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("meeting.collab.relTypePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("meeting.collab.relAll")}</SelectItem>
                <SelectItem value="same_dept">{t("meeting.collab.relSameDept")}</SelectItem>
                <SelectItem value="cross_dept">{t("meeting.collab.relCrossDept")}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={t("meeting.collab.filterDeptPlaceholder")}
              value={pairsDept}
              onChange={e => setPairsDept(e.target.value)}
              className="w-48"
            />
          </div>
          {pairs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">{t("meeting.collab.thRank")}</TableHead>
                  <TableHead>{t("meeting.collab.thCollabA")}</TableHead>
                  <TableHead>{t("meeting.collab.thCollabB")}</TableHead>
                  <TableHead>{t("meeting.collab.thRelation")}</TableHead>
                  <TableHead className="text-right">{t("meeting.collab.thMeetingCount")}</TableHead>
                  <TableHead className="text-right">{t("meeting.collab.thTotalMinutes")}</TableHead>
                  <TableHead className="text-right">{t("meeting.collab.thCollabScore")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairs.map((p: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell>
                      <div>{p.participant_a}</div>
                      <div className="text-xs text-muted-foreground">{p.department_a || "—"}</div>
                    </TableCell>
                    <TableCell>
                      <div>{p.participant_b}</div>
                      <div className="text-xs text-muted-foreground">{p.department_b || "—"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={p.relationship_type === "cross_dept" ? "border-green-500 text-green-700" : ""}>
                        {p.relationship_type === "cross_dept" ? t("meeting.collab.crossDept") : t("meeting.collab.sameDept")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{p.meeting_count}</TableCell>
                    <TableCell className="text-right">{p.total_co_meeting_minutes}</TableCell>
                    <TableCell className="text-right font-bold">{p.collaboration_score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-30" />
              <p>{t("meeting.collab.noCollabData")}</p>
              <p className="text-sm">{t("meeting.collab.noCollabHint")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Cross-Department Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.collab.crossDeptDistTitle")}</CardTitle>
          <CardDescription>{t("meeting.collab.crossDeptDistDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="internal" stackId="a" fill="#6366f1" name={t("meeting.collab.internalCollab")} />
                <Bar dataKey="crossDept" stackId="a" fill="#22c55e" name={t("meeting.collab.crossDeptCollab")} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-3 opacity-30" />
              <p>{t("meeting.collab.noCrossDeptData")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Silo Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> {t("meeting.collab.siloTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.collab.siloDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie chart */}
            {siloRiskDist.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">{t("meeting.collab.riskDistribution")}</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={siloRiskDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {siloRiskDist.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Table */}
            <div>
              {silos.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("meeting.collab.thDept")}</TableHead>
                      <TableHead className="text-right">{t("meeting.collab.thCrossDeptPct")}</TableHead>
                      <TableHead className="text-right">{t("meeting.collab.thInternal")}</TableHead>
                      <TableHead className="text-right">{t("meeting.collab.thExternal")}</TableHead>
                      <TableHead>{t("meeting.collab.thRisk")}</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {silos.map((s: any, i: number) => (
                      <>
                        <TableRow key={i} className="cursor-pointer" onClick={() => setExpandedSilo(expandedSilo === i ? null : i)}>
                          <TableCell className="font-medium">{s.department}</TableCell>
                          <TableCell className="text-right">{s.crossCollabPercent}%</TableCell>
                          <TableCell className="text-right">{s.internalEdges}</TableCell>
                          <TableCell className="text-right">{s.crossDeptEdges}</TableCell>
                          <TableCell>
                            <Badge className={RISK_COLORS[s.riskLevel] || ""}>
                              {s.riskLevel === "high" ? t("meeting.collab.riskLevelHigh") : s.riskLevel === "medium" ? t("meeting.collab.riskLevelMedium") : t("meeting.collab.riskLevelLow")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {expandedSilo === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </TableCell>
                        </TableRow>
                        {expandedSilo === i && (
                          <TableRow key={`exp-${i}`}>
                            <TableCell colSpan={6} className="bg-muted/50">
                              <div className="p-3 text-sm space-y-1">
                                <p><strong>{t("meeting.collab.totalCollabEdges")}</strong> {s.totalEdges}</p>
                                <p><strong>{t("meeting.collab.crossCollabRatio")}</strong> {s.crossCollabPercent}%</p>
                                <p><strong>{t("meeting.collab.suggestion")}</strong> {s.riskLevel === "high"
                                  ? t("meeting.collab.siloHighAdvice")
                                  : s.riskLevel === "medium"
                                  ? t("meeting.collab.siloMediumAdvice")
                                  : t("meeting.collab.siloLowAdvice")}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">{t("meeting.collab.noSiloData")}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Meeting Necessity Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileQuestion className="h-5 w-5" /> {t("meeting.collab.necessityTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.collab.necessityDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Single analysis */}
            <div>
              <label className="text-sm text-muted-foreground">{t("meeting.collab.singleAnalysis")}</label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder={t("meeting.collab.inputMeetingId")}
                  value={singleMeetingId}
                  onChange={e => setSingleMeetingId(e.target.value)}
                />
                <Button
                  onClick={() => analyzeMut.mutate({ meetingId: singleMeetingId })}
                  disabled={!singleMeetingId || analyzeMut.isPending}
                  size="sm"
                >
                  {analyzeMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("meeting.collab.analyzeBtn")}
                </Button>
              </div>
              {analyzeMut.data && (
                <p className="mt-2 text-sm text-green-600">
                  {t("meeting.collab.analysisComplete")} {(analyzeMut.data as any).title} {t("meeting.collab.gradeLabel")} {(analyzeMut.data as any).necessityGrade}
                </p>
              )}
            </div>
            {/* Batch analysis */}
            <div>
              <label className="text-sm text-muted-foreground">{t("meeting.collab.batchAnalysis")}</label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder={t("meeting.collab.batchPlaceholder")}
                  value={batchIds}
                  onChange={e => setBatchIds(e.target.value)}
                />
                <Button
                  onClick={() => {
                    const ids = batchIds.split(",").map(s => s.trim()).filter(Boolean);
                    if (ids.length > 0) batchMut.mutate({ meetingIds: ids });
                  }}
                  disabled={!batchIds || batchMut.isPending}
                  size="sm"
                >
                  {batchMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("meeting.collab.batchBtn")}
                </Button>
              </div>
              {batchMut.data && (
                <p className="mt-2 text-sm text-green-600">
                  {t("meeting.collab.batchComplete")} {(batchMut.data as any).analyzed} {t("meeting.collab.batchSuccess")} {(batchMut.data as any).errors} {t("meeting.collab.batchFailed")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 7: Necessity Scores Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.collab.necessityScoresTitle")}</CardTitle>
          <CardDescription>{t("meeting.collab.necessityScoresDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Grade distribution pie chart */}
          {gradeDist.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-2">{t("meeting.collab.gradeDistribution")}</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={gradeDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {gradeDist.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {necessityScores.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.collab.thMeetingTitle")}</TableHead>
                  <TableHead>{t("meeting.collab.thDate")}</TableHead>
                  <TableHead className="text-right">{t("meeting.collab.thScore")}</TableHead>
                  <TableHead>{t("meeting.collab.thGrade")}</TableHead>
                  <TableHead>{t("meeting.collab.thAlternative")}</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {necessityScores.map((s: any, i: number) => {
                  const recs = (() => { try { return JSON.parse(s.recommendations || "[]"); } catch { return []; } })();
                  return (
                    <>
                      <TableRow key={i} className="cursor-pointer" onClick={() => setExpandedNecessity(expandedNecessity === i ? null : i)}>
                        <TableCell className="font-medium max-w-[200px] truncate">{s.meeting_title || s.meeting_id}</TableCell>
                        <TableCell className="text-sm">{s.meeting_date ? new Date(s.meeting_date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-right font-bold">{s.necessity_score}</TableCell>
                        <TableCell>
                          <Badge className={GRADE_COLORS[s.necessity_grade] || ""}>{s.necessity_grade}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {s.alternative_viability === "email" ? t("meeting.collab.altEmail") :
                             s.alternative_viability === "slack" ? t("meeting.collab.altSlack") :
                             s.alternative_viability === "doc" ? t("meeting.collab.altDoc") : t("meeting.collab.altNone")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {expandedNecessity === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </TableCell>
                      </TableRow>
                      {expandedNecessity === i && (
                        <TableRow key={`nexp-${i}`}>
                          <TableCell colSpan={6} className="bg-muted/50">
                            <div className="p-4 space-y-3">
                              {/* 6 dimension scores */}
                              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                <div className="text-center p-2 bg-background rounded">
                                  <div className="text-lg font-bold">{s.decision_complexity}</div>
                                  <div className="text-xs text-muted-foreground">{t("meeting.collab.decisionComplexity")}</div>
                                </div>
                                <div className="text-center p-2 bg-background rounded">
                                  <div className="text-lg font-bold">{s.collaboration_requirement}</div>
                                  <div className="text-xs text-muted-foreground">{t("meeting.collab.collaborationRequirement")}</div>
                                </div>
                                <div className="text-center p-2 bg-background rounded">
                                  <div className="text-lg font-bold">{s.information_richness}</div>
                                  <div className="text-xs text-muted-foreground">{t("meeting.collab.informationRichness")}</div>
                                </div>
                                <div className="text-center p-2 bg-background rounded">
                                  <div className="text-lg font-bold">{s.outcome_impact}</div>
                                  <div className="text-xs text-muted-foreground">{t("meeting.collab.outcomeImpact")}</div>
                                </div>
                                <div className="text-center p-2 bg-background rounded">
                                  <div className="text-lg font-bold">{s.participant_alignment}</div>
                                  <div className="text-xs text-muted-foreground">{t("meeting.collab.participantAlignment")}</div>
                                </div>
                                <div className="text-center p-2 bg-background rounded">
                                  <div className="text-lg font-bold">{s.time_efficiency}</div>
                                  <div className="text-xs text-muted-foreground">{t("meeting.collab.timeEfficiency")}</div>
                                </div>
                              </div>

                              {/* AI Narrative */}
                              {s.ai_narrative && (
                                <div>
                                  <h5 className="text-sm font-medium mb-1">{t("meeting.collab.aiAnalysis")}</h5>
                                  <p className="text-sm text-muted-foreground">{s.ai_narrative}</p>
                                </div>
                              )}

                              {/* Alternative rationale */}
                              {s.alternative_rationale && (
                                <div>
                                  <h5 className="text-sm font-medium mb-1">{t("meeting.collab.alternativeRationale")}</h5>
                                  <p className="text-sm text-muted-foreground">{s.alternative_rationale}</p>
                                </div>
                              )}

                              {/* Recommendations */}
                              {recs.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-medium mb-1">{t("meeting.collab.recommendations")}</h5>
                                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    {recs.map((r: string, ri: number) => (
                                      <li key={ri}>{r}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
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
              <FileQuestion className="h-12 w-12 mb-3 opacity-30" />
              <p>{t("meeting.collab.noNecessityData")}</p>
              <p className="text-sm">{t("meeting.collab.noNecessityHint")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
