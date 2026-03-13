import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Users,
  RefreshCw,
  UserMinus,
  UserPlus,
  Search,
  Target,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function AttendeeOptimizationTab() {
  const { t } = useLanguage();
  const [meetingId, setMeetingId] = useState("");
  const [topic, setTopic] = useState("");

  const optimizeMutation = trpc.ime.optimizeAttendees.useMutation();
  const { data: dashboard, isLoading } = trpc.ime.optimizationDashboard.useQuery({});
  const { data: topicSuggestions, refetch: refetchSuggestions, isFetching: suggestionsLoading } = trpc.ime.suggestParticipants.useQuery(
    { topic },
    { enabled: false }
  );

  const stats = dashboard?.stats;
  const overInvitedRankings = (dashboard?.overInvitedRankings ?? []) as any[];
  const recentOptimizations = (dashboard?.recentOptimizations ?? []) as any[];

  const optResult = optimizeMutation.data as any;
  const suggestions = (topicSuggestions as any)?.suggestions ?? [];

  const handleOptimize = () => {
    if (!meetingId.trim()) return;
    optimizeMutation.mutate({ meetingId: meetingId.trim() });
  };

  const handleSuggest = () => {
    if (!topic.trim()) return;
    refetchSuggestions();
  };

  // Build radar data from composition advice if available
  const radarData = optResult?.currentParticipants
    ? optResult.currentParticipants.slice(0, 8).map((p: any) => ({
        name: p.name?.substring(0, 6) || p.employeeId,
        score: p.avgScore,
        engagement: p.avgEngagement,
      }))
    : [];

  // Build size comparison data from recent optimizations
  const sizeComparisonData = recentOptimizations.slice(0, 10).map((opt: any) => ({
    meeting: (opt.meeting_title || "").substring(0, 10),
    current: opt.current_size,
    optimal: opt.optimal_size,
  }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("meeting.attendee.title")}
          </CardTitle>
          <CardDescription>{t("meeting.attendee.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={t("meeting.attendee.inputMeetingId")}
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleOptimize} disabled={optimizeMutation.isPending}>
              {optimizeMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Target className="h-4 w-4 mr-2" />}
              {t("meeting.attendee.optimizeBtn")}
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={t("meeting.attendee.topicPlaceholder")}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="max-w-md"
            />
            <Button variant="outline" onClick={handleSuggest} disabled={suggestionsLoading}>
              {suggestionsLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              {t("meeting.attendee.suggestBtn")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Single meeting optimization result */}
      {optResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{optResult.currentSize}</div>
                <div className="text-sm text-muted-foreground">{t("meeting.attendee.currentSize")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-green-600">{optResult.optimalSize}</div>
                <div className="text-sm text-muted-foreground">{t("meeting.attendee.optimalSize")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-red-600">{optResult.overInvited?.length ?? 0}</div>
                <div className="text-sm text-muted-foreground">{t("meeting.attendee.overInvitedCount")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{optResult.estimatedCostSaving}</div>
                <div className="text-sm text-muted-foreground">{t("meeting.attendee.estimatedSaving")}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Over-invited */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                  <UserMinus className="h-4 w-4" />
                  {t("meeting.attendee.overInvited")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {optResult.overInvited?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("meeting.attendee.thName")}</TableHead>
                        <TableHead className="text-center">{t("meeting.attendee.thAvgScore")}</TableHead>
                        <TableHead className="text-right">{t("meeting.attendee.thCostWaste")}</TableHead>
                        <TableHead>{t("meeting.attendee.thReason")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optResult.overInvited.map((p: any, i: number) => (
                        <TableRow key={i} className="bg-red-50/50">
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">{p.avgScore}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-red-600">{p.costWaste}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">{t("meeting.attendee.noOverInvited")}</p>
                )}
              </CardContent>
            </Card>

            {/* Recommended additions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-green-600">
                  <UserPlus className="h-4 w-4" />
                  {t("meeting.attendee.recommended")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {optResult.recommended?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("meeting.attendee.thName")}</TableHead>
                        <TableHead className="text-center">{t("meeting.attendee.thPredictedContribution")}</TableHead>
                        <TableHead>{t("meeting.attendee.thRecommendReason")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optResult.recommended.map((p: any, i: number) => (
                        <TableRow key={i} className="bg-green-50/50">
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge>{p.predictedContribution}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">{t("meeting.attendee.noRecommended")}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Radar chart for participants */}
          {radarData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("meeting.attendee.radarTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name={t("meeting.attendee.radarContribution")} dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                    <Radar name={t("meeting.attendee.radarEngagement")} dataKey="engagement" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* AI narrative */}
          {optResult.aiNarrative && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">{optResult.aiNarrative}</div>
          )}
        </div>
      )}

      {/* Topic-based suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.attendee.topicSuggestions")}</CardTitle>
            <CardDescription>{(topicSuggestions as any)?.topic}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.attendee.thName")}</TableHead>
                  <TableHead className="text-center">{t("meeting.attendee.thRelevance")}</TableHead>
                  <TableHead className="text-center">{t("meeting.attendee.thTopicMeetings")}</TableHead>
                  <TableHead className="text-center">{t("meeting.attendee.thDecisionContribution")}</TableHead>
                  <TableHead>{t("meeting.attendee.thRecommendReason")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((s: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-center"><Badge>{s.avgScore}</Badge></TableCell>
                    <TableCell className="text-center">{s.topicMeetingCount}</TableCell>
                    <TableCell className="text-center">{s.totalDecisions}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dashboard stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label={t("meeting.attendee.totalOptimized")} value={stats?.totalOptimized ?? 0} loading={isLoading} />
        <StatCard icon={DollarSign} label={t("meeting.attendee.avgSaving")} value={`¥${stats?.avgSaving ?? 0}`} loading={isLoading} />
        <StatCard icon={UserMinus} label={t("meeting.attendee.avgSizeGap")} value={stats?.avgSizeGap ?? 0} loading={isLoading} />
      </div>

      {/* Over-invited frequency rankings */}
      {overInvitedRankings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.attendee.overInvitedRanking")}</CardTitle>
            <CardDescription>{t("meeting.attendee.overInvitedRankingDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.attendee.thRank")}</TableHead>
                  <TableHead>{t("meeting.attendee.thName")}</TableHead>
                  <TableHead className="text-center">{t("meeting.attendee.thCount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overInvitedRankings.map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={r.count >= 5 ? "destructive" : "secondary"}>{r.count}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Size optimization chart */}
      {sizeComparisonData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.attendee.sizeComparison")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sizeComparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="meeting" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="current" name={t("meeting.attendee.chartCurrent")} fill="#ef4444" />
                <Bar dataKey="optimal" name={t("meeting.attendee.chartOptimal")} fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
