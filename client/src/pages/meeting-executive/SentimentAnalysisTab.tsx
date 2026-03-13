import { useState } from "react";
import {
  Heart,
  RefreshCw,
  AlertTriangle,
  Smile,
  Frown,
  Meh,
  Play,
  CheckCircle2,
  HelpCircle,
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
import { useLanguage } from "@/contexts/LanguageContext";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#22c55e",
  neutral: "#6366f1",
  negative: "#ef4444",
  mixed: "#f59e0b",
};

const SENTIMENT_LABEL_KEYS: Record<string, string> = {
  positive: "meeting.sentiment.positive",
  neutral: "meeting.sentiment.neutral",
  negative: "meeting.sentiment.negative",
  mixed: "meeting.sentiment.mixed",
};

export function SentimentAnalysisTab() {
  const { t } = useLanguage();
  const [meetingId, setMeetingId] = useState("");
  const [batchIds, setBatchIds] = useState("");

  const analyzeMutation = trpc.ime.analyzeSentiment.useMutation();
  const batchMutation = trpc.ime.batchAnalyzeSentiment.useMutation();
  const { data: dashboard, isLoading } = trpc.ime.sentimentDashboard.useQuery({});

  const stats = dashboard?.stats;
  const distribution = dashboard?.distribution ?? {};
  const tensionTrend = (dashboard?.tensionTrend ?? []) as any[];
  const highTensionMeetings = (dashboard?.highTensionMeetings ?? []) as any[];
  const speakerRankings = (dashboard?.speakerRankings ?? []) as any[];

  const sentimentResult = analyzeMutation.data as any;

  const handleAnalyze = () => {
    if (!meetingId.trim()) return;
    analyzeMutation.mutate({ meetingId: meetingId.trim() });
  };

  const handleBatchAnalyze = () => {
    const ids = batchIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;
    batchMutation.mutate({ meetingIds: ids });
  };

  const getSentimentLabel = (key: string) => t(SENTIMENT_LABEL_KEYS[key] || "meeting.sentiment.neutral");

  const pieData = Object.entries(distribution).map(([key, value]) => ({
    name: getSentimentLabel(key),
    value: Number(value),
    color: SENTIMENT_COLORS[key] || "#94a3b8",
  }));

  const sentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return <Smile className="h-4 w-4 text-green-500" />;
      case "negative": return <Frown className="h-4 w-4 text-red-500" />;
      case "mixed": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <Meh className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            {t("meeting.sentiment.title")}
          </CardTitle>
          <CardDescription>{t("meeting.sentiment.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder={t("meeting.sentiment.meetingIdPlaceholder")}
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              className="max-w-sm"
            />
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending || !meetingId.trim()}
            >
              {analyzeMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Heart className="h-4 w-4 mr-2" />
              )}
              {t("meeting.sentiment.analyze")}
            </Button>
          </div>
          <div className="flex gap-3">
            <Input
              placeholder={t("meeting.sentiment.batchPlaceholder")}
              value={batchIds}
              onChange={(e) => setBatchIds(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleBatchAnalyze}
              disabled={batchMutation.isPending || !batchIds.trim()}
            >
              {batchMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {t("meeting.sentiment.batchAnalyze")}
            </Button>
          </div>
          {batchMutation.data && (
            <div className="space-y-1">
              {batchMutation.data.map((r: any) => (
                <div key={r.meetingId} className="flex items-center gap-2 text-sm">
                  {r.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <HelpCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-mono text-xs">{r.meetingId}</span>
                  {r.error && <span className="text-red-500 text-xs">{r.error}</span>}
                </div>
              ))}
            </div>
          )}
          {analyzeMutation.isError && (
            <p className="text-sm text-red-500">{t("meeting.sentiment.analyzeFailed")}: {analyzeMutation.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Single meeting result */}
      {sentimentResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="mb-2">{sentimentIcon(sentimentResult.overallSentiment)}</div>
                <div className="text-2xl font-bold">{getSentimentLabel(sentimentResult.overallSentiment)}</div>
                <div className="text-xs text-muted-foreground">{t("meeting.sentiment.sentimentScore")}: {Number(sentimentResult.sentimentScore).toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{Number(sentimentResult.tensionLevel).toFixed(1)}/10</div>
                <div className="text-xs text-muted-foreground">{t("meeting.sentiment.tension")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{Number(sentimentResult.collaborationTone).toFixed(1)}/10</div>
                <div className="text-xs text-muted-foreground">{t("meeting.sentiment.collaboration")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{sentimentResult.consensusReached ? t("meeting.sentiment.yes") : t("meeting.sentiment.no")}</div>
                <div className="text-xs text-muted-foreground">{t("meeting.sentiment.consensusReached")}</div>
              </CardContent>
            </Card>
          </div>

          {/* Emotional arc */}
          {sentimentResult.emotionalArc?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("meeting.sentiment.emotionalArc")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {sentimentResult.emotionalArc.map((arc: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                      {sentimentIcon(arc.sentiment)}
                      <div>
                        <div className="font-medium">{arc.phase}</div>
                        <div className="text-xs text-muted-foreground">{arc.description}</div>
                      </div>
                      {i < sentimentResult.emotionalArc.length - 1 && (
                        <span className="text-muted-foreground ml-2">&rarr;</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Speaker sentiments */}
          {sentimentResult.speakerSentiments?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("meeting.sentiment.participantSentiment")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("meeting.sentiment.speaker")}</TableHead>
                      <TableHead className="text-center">{t("meeting.sentiment.sentimentLabel")}</TableHead>
                      <TableHead className="text-center">{t("meeting.sentiment.tension")}</TableHead>
                      <TableHead>{t("meeting.sentiment.keyEmotionalMoments")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentimentResult.speakerSentiments.map((s: any) => (
                      <TableRow key={s.speaker}>
                        <TableCell className="font-medium">{s.speaker}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {sentimentIcon(s.sentiment)}
                            <span className="text-xs">{getSentimentLabel(s.sentiment)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{Number(s.tensionLevel).toFixed(1)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[300px]">{s.keyEmotionalMoments}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Conflict topics + narrative */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sentimentResult.conflictTopics?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("meeting.sentiment.conflictTopics")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {sentimentResult.conflictTopics.map((topic: string, i: number) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {sentimentResult.narrative && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("meeting.sentiment.aiNarrative")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{sentimentResult.narrative}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Dashboard stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Heart}
          label={t("meeting.sentiment.avgSentimentScore")}
          value={isLoading ? "..." : stats?.avgSentiment ?? 0}
          subtitle="Avg Sentiment Score (-1~+1)"
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("meeting.sentiment.avgTension")}
          value={isLoading ? "..." : stats?.avgTension ?? 0}
          subtitle="Avg Tension Level (0-10)"
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          icon={Smile}
          label={t("meeting.sentiment.avgCollaboration")}
          value={isLoading ? "..." : stats?.avgCollaboration ?? 0}
          subtitle="Avg Collaboration Tone (0-10)"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={Meh}
          label={t("meeting.sentiment.analyzedMeetings")}
          value={isLoading ? "..." : stats?.totalAnalyzed ?? 0}
          subtitle="Total Meetings Analyzed"
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Sentiment distribution + Tension trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.sentiment.distribution")}</CardTitle>
            <CardDescription>Sentiment Distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground">{t("meeting.sentiment.noData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.sentiment.tensionTrend")}</CardTitle>
            <CardDescription>Tension Trend (last 30 meetings)</CardDescription>
          </CardHeader>
          <CardContent>
            {tensionTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={tensionTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="tension_level" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name={t("meeting.sentiment.tension")} />
                  <Line type="monotone" dataKey="sentiment_score" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name={t("meeting.sentiment.sentimentScore")} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground">{t("meeting.sentiment.noData")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* High tension meetings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.sentiment.highTensionTop5")}</CardTitle>
        </CardHeader>
        <CardContent>
          {highTensionMeetings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.sentiment.meetingName")}</TableHead>
                  <TableHead className="text-center">{t("meeting.sentiment.date")}</TableHead>
                  <TableHead className="text-center">{t("meeting.sentiment.tension")}</TableHead>
                  <TableHead className="text-center">{t("meeting.sentiment.sentimentLabel")}</TableHead>
                  <TableHead>{t("meeting.sentiment.conflictTopics")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highTensionMeetings.map((m: any) => {
                  let conflicts: string[] = [];
                  try { conflicts = JSON.parse(m.conflict_topics || "[]"); } catch { /* skip */ }
                  return (
                    <TableRow key={m.meeting_id}>
                      <TableCell className="font-medium">{m.title}</TableCell>
                      <TableCell className="text-center text-sm">{m.meeting_date?.split("T")[0]}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={Number(m.tension_level) >= 7 ? "destructive" : "secondary"}>
                          {Number(m.tension_level).toFixed(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {sentimentIcon(m.overall_sentiment)}
                          <span className="text-xs">{getSentimentLabel(m.overall_sentiment)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {conflicts.slice(0, 3).join(", ") || "\u2014"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-6 text-muted-foreground">{t("meeting.sentiment.noHighTensionData")}</p>
          )}
        </CardContent>
      </Card>

      {/* Speaker sentiment rankings */}
      {speakerRankings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.sentiment.speakerRanking")}</CardTitle>
            <CardDescription>{t("meeting.sentiment.speakerRankingDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.sentiment.speaker")}</TableHead>
                  <TableHead className="text-center">{t("meeting.sentiment.meetingCount")}</TableHead>
                  <TableHead className="text-center">{t("meeting.sentiment.avgSentiment")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {speakerRankings.map((s: any) => (
                  <TableRow key={s.speaker}>
                    <TableCell className="font-medium">{s.speaker}</TableCell>
                    <TableCell className="text-center">{s.meetings}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {s.avgSentiment > 0.3 ? <Smile className="h-4 w-4 text-green-500" /> :
                         s.avgSentiment < -0.3 ? <Frown className="h-4 w-4 text-red-500" /> :
                         <Meh className="h-4 w-4 text-blue-500" />}
                        <span className="text-sm">{Number(s.avgSentiment).toFixed(2)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
