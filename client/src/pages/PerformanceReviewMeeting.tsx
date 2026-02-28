/**
 * PerformanceReviewMeeting.tsx — 述职报告智能会议系统
 *
 * Features:
 *   - Speaker queue with per-speaker timer
 *   - 5-dimension evaluation panel (performance/execution/innovation/teamwork/strategy)
 *   - Live radar chart (Recharts)
 *   - Teams integration link
 *   - Auto-polling for real-time score updates
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Video,
  Clock,
  CheckCircle,
  Circle,
  Timer,
  Users,
  Send,
  Download,
  ExternalLink,
  User,
  Star,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────
interface Speaker {
  id: number;
  name: string;
  department: string;
  title: string;
  status: "completed" | "active" | "pending";
}

interface DimensionScore {
  dimension: string;
  score: number;
  comment: string;
}

const DIMENSIONS = [
  { key: "performance", label: "工作业绩", labelEn: "Performance", color: "#3b82f6" },
  { key: "execution", label: "执行力", labelEn: "Execution", color: "#10b981" },
  { key: "innovation", label: "创新能力", labelEn: "Innovation", color: "#f59e0b" },
  { key: "teamwork", label: "团队管理", labelEn: "Teamwork", color: "#8b5cf6" },
  { key: "strategy", label: "战略理解", labelEn: "Strategy", color: "#ef4444" },
] as const;

const EVALUATORS = [
  { id: 301, name: "总经理" },
  { id: 302, name: "HR总监" },
  { id: 303, name: "技术总监" },
  { id: 304, name: "财务总监" },
  { id: 305, name: "运营总监" },
];

// ── Demo data defaults ───────────────────────────────────────
const DEFAULT_SPEAKERS: Speaker[] = [
  { id: 201, name: "徐树奎", department: "事业二部", title: "部门经理", status: "active" },
  { id: 202, name: "李柯瑶", department: "事业三部", title: "主管", status: "pending" },
];

const DEFAULT_MEETING_ID = 1;

// ── Component ────────────────────────────────────────────────
export default function PerformanceReviewMeeting() {
  const { language } = useLanguage();
  const isEn = language === "en";

  // State
  const [meetingId, setMeetingId] = useState<number | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>(DEFAULT_SPEAKERS);
  const [currentEvaluatorId] = useState(301); // Mock: current user is 总经理
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [scores, setScores] = useState<Record<string, DimensionScore>>(
    Object.fromEntries(
      DIMENSIONS.map((d) => [d.key, { dimension: d.key, score: 5, comment: "" }])
    )
  );
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // ── Seed demo on mount ──────────────────────────────────
  const seedMutation = trpc.smartMeeting.review.seedDemo.useMutation();

  useEffect(() => {
    seedMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (data.meetingId) setMeetingId(data.meetingId);
      },
      onError: () => {
        // Fallback: use mock meeting ID
        setMeetingId(DEFAULT_MEETING_ID);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Queries ─────────────────────────────────────────────
  const evaluationsQuery = trpc.smartMeeting.review.getEvaluations.useQuery(
    { meetingId: meetingId ?? 0 },
    { enabled: !!meetingId, refetchInterval: 15000 }
  );
  const analysisQuery = trpc.smartMeeting.review.getAnalysis.useQuery(
    { meetingId: meetingId ?? 0 },
    { enabled: !!meetingId, refetchInterval: 15000 }
  );

  const submitMutation = trpc.smartMeeting.review.submitEvaluation.useMutation();

  // ── Timer ───────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Active speaker ──────────────────────────────────────
  const activeSpeaker = useMemo(
    () => speakers.find((s) => s.status === "active") ?? speakers[0],
    [speakers]
  );

  // ── Submit evaluation ───────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!meetingId || !activeSpeaker) return;
    const currentEvaluator = EVALUATORS.find((e) => e.id === currentEvaluatorId);
    try {
      for (const dim of DIMENSIONS) {
        const s = scores[dim.key];
        await submitMutation.mutateAsync({
          meetingId,
          speakerId: activeSpeaker.id,
          speakerName: activeSpeaker.name,
          dimension: dim.key as any,
          score: s.score,
          comment: s.comment || undefined,
        });
      }
      setSubmitted(true);
      evaluationsQuery.refetch();
      analysisQuery.refetch();
    } catch {
      // silently handle
    }
  }, [meetingId, activeSpeaker, scores, currentEvaluatorId, submitMutation, evaluationsQuery, analysisQuery]);

  // ── Next speaker ────────────────────────────────────────
  const handleNextSpeaker = useCallback(() => {
    setSpeakers((prev) => {
      const idx = prev.findIndex((s) => s.status === "active");
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], status: "completed" };
      if (idx + 1 < next.length) {
        next[idx + 1] = { ...next[idx + 1], status: "active" };
      }
      return next;
    });
    setElapsedSeconds(0);
    setSubmitted(false);
    setScores(
      Object.fromEntries(
        DIMENSIONS.map((d) => [d.key, { dimension: d.key, score: 5, comment: "" }])
      )
    );
  }, []);

  // ── Radar chart data ────────────────────────────────────
  const radarData = useMemo(() => {
    const analysisData = analysisQuery.data?.speakers ?? [];
    if (analysisData.length === 0) {
      // Fallback mock data
      return DIMENSIONS.map((d) => ({
        dimension: isEn ? d.labelEn : d.label,
        徐树奎: d.key === "performance" ? 8.2 : d.key === "execution" ? 7.5 : d.key === "innovation" ? 6.8 : d.key === "teamwork" ? 8.0 : 7.3,
        李柯瑶: d.key === "performance" ? 7.0 : d.key === "execution" ? 8.3 : d.key === "innovation" ? 8.0 : d.key === "teamwork" ? 7.2 : 6.5,
      }));
    }
    return DIMENSIONS.map((d) => {
      const entry: Record<string, string | number> = { dimension: isEn ? d.labelEn : d.label };
      for (const sp of analysisData) {
        const rd = sp.radarData.find((r) => r.dimension === d.key);
        entry[sp.speakerName] = rd?.average ?? 0;
      }
      return entry;
    });
  }, [analysisQuery.data, isEn]);

  // ── Evaluator submission status ─────────────────────────
  const evaluatorStatus = useMemo(() => {
    if (!activeSpeaker || !evaluationsQuery.data) return EVALUATORS.map((e) => ({ ...e, submitted: false }));
    const speakerEvals = evaluationsQuery.data[activeSpeaker.id]?.evaluations ?? [];
    return EVALUATORS.map((e) => ({
      ...e,
      submitted: speakerEvals.some((ev) => ev.evaluatorId === e.id),
    }));
  }, [activeSpeaker, evaluationsQuery.data]);

  // ── Teams link ──────────────────────────────────────────
  const teamsUrl = `https://teams.microsoft.com/l/meetup-join/grt-review-demo`;

  // ── Export report ───────────────────────────────────────
  const handleExport = () => {
    const data = analysisQuery.data;
    if (!data) return;
    const lines = [
      "述职报告评分汇总",
      "==================",
      `会议: 2026年度述职报告 — 事业二部 & 事业三部`,
      `总评分数: ${data.totalEvaluations}`,
      "",
    ];
    for (const sp of data.speakers) {
      lines.push(`\n${sp.speakerName} (综合: ${sp.overall})`);
      for (const rd of sp.radarData) {
        const dimLabel = DIMENSIONS.find((d) => d.key === rd.dimension)?.label ?? rd.dimension;
        lines.push(`  ${dimLabel}: ${rd.average} (${rd.count}人评分)`);
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "述职报告评分.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ─── Top Bar ─── */}
      <div className="bg-white dark:bg-gray-800 border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">
            {isEn ? "Performance Review Meeting" : "述职报告智能会议"}
          </h1>
          <Badge variant="destructive" className="animate-pulse flex items-center gap-1">
            <Circle className="w-2 h-2 fill-current" /> LIVE
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Timer className="w-4 h-4" />
            {isEn ? "Current Speaker" : "当前发言"}: {activeSpeaker?.name}
            <span className="font-mono font-bold text-lg text-blue-600">{formatTime(elapsedSeconds)}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => window.open(teamsUrl, "_blank")}
          >
            <Video className="w-4 h-4" /> Teams
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6 pt-4">
        <TabsList>
          <TabsTrigger value="dashboard">{isEn ? "Dashboard" : "执行分析看板"}</TabsTrigger>
          <TabsTrigger value="evaluate">{isEn ? "Evaluate" : "评委打分"}</TabsTrigger>
          <TabsTrigger value="summary">{isEn ? "Summary" : "会议纪要"}</TabsTrigger>
        </TabsList>

        {/* ═══ Tab 1: Dashboard ═══ */}
        <TabsContent value="dashboard" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: 60% — Analysis */}
            <div className="lg:col-span-3 space-y-6">
              {/* Current Speaker Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <User className="w-10 h-10 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold">{activeSpeaker?.name}</h2>
                      <p className="text-gray-500">
                        {activeSpeaker?.department} · {activeSpeaker?.title}
                      </p>
                      <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (elapsedSeconds / 900) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {isEn ? "Time limit: 15 min" : "限时 15 分钟"} · {formatTime(elapsedSeconds)} / 15:00
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleNextSpeaker}>
                      {isEn ? "Next Speaker" : "下一位发言人"} →
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Speaker Queue */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {isEn ? "Speaker Queue" : "发言队列"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {speakers.map((s) => (
                      <div
                        key={s.id}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                          s.status === "active"
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                            : s.status === "completed"
                            ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        {s.status === "completed" ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : s.status === "active" ? (
                          <Circle className="w-5 h-5 text-blue-500 fill-blue-500 animate-pulse" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.department}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Radar Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    {isEn ? "Score Radar" : "实时评分雷达图"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10 }} />
                      {speakers.map((s, i) => (
                        <Radar
                          key={s.id}
                          name={s.name}
                          dataKey={s.name}
                          stroke={i === 0 ? "#3b82f6" : "#f59e0b"}
                          fill={i === 0 ? "#3b82f6" : "#f59e0b"}
                          fillOpacity={0.15}
                        />
                      ))}
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Right: 40% — Score Stats + Evaluator Status */}
            <div className="lg:col-span-2 space-y-6">
              {/* Dimension Averages */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {isEn ? "Score Summary" : "评分统计"} — {activeSpeaker?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {DIMENSIONS.map((d) => {
                    const spData = analysisQuery.data?.speakers?.find(
                      (s) => s.speakerId === activeSpeaker?.id
                    );
                    const rd = spData?.radarData?.find((r) => r.dimension === d.key);
                    const avg = rd?.average ?? 0;
                    const cnt = rd?.count ?? 0;
                    return (
                      <div key={d.key} className="flex items-center gap-3">
                        <span className="w-20 text-xs text-gray-600">{isEn ? d.labelEn : d.label}</span>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div
                            className="h-3 rounded-full transition-all"
                            style={{ width: `${(avg / 10) * 100}%`, backgroundColor: d.color }}
                          />
                        </div>
                        <span className="text-sm font-mono font-bold w-10 text-right">{avg || "—"}</span>
                        <span className="text-xs text-gray-400 w-12">({cnt}{isEn ? " votes" : "人"})</span>
                      </div>
                    );
                  })}
                  {(() => {
                    const spData = analysisQuery.data?.speakers?.find(
                      (s) => s.speakerId === activeSpeaker?.id
                    );
                    return (
                      <div className="pt-2 border-t mt-2 flex justify-between">
                        <span className="text-sm font-medium">{isEn ? "Overall" : "综合评分"}</span>
                        <span className="text-lg font-bold text-blue-600">{spData?.overall ?? "—"}</span>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Evaluator Status */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {isEn ? "Evaluator Status" : "评委提交状态"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {evaluatorStatus.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <span className="text-sm">{e.name}</span>
                        {e.submitted ? (
                          <Badge variant="default" className="bg-green-500 text-xs">
                            {isEn ? "Submitted" : "已提交"} ✓
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {isEn ? "Pending" : "未提交"}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Ranking */}
              {(analysisQuery.data?.speakers?.length ?? 0) > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {isEn ? "Ranking" : "排名"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysisQuery.data?.speakers?.map((sp, idx) => (
                        <div
                          key={sp.speakerId}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              idx === 0
                                ? "bg-yellow-400 text-yellow-900"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-600"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="flex-1 text-sm font-medium">{sp.speakerName}</span>
                          <span className="font-mono font-bold text-blue-600">{sp.overall}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═══ Tab 2: Evaluate ═══ */}
        <TabsContent value="evaluate" className="mt-4">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isEn ? "Evaluate" : "评价"}: {activeSpeaker?.name}
                  <Badge variant="outline">{activeSpeaker?.department}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {submitted ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-700 dark:text-green-400">
                      {isEn ? "Evaluation Submitted!" : "评分已提交!"}
                    </h3>
                    <p className="text-gray-500 mt-2">
                      {isEn
                        ? "You can modify and resubmit anytime."
                        : "您可以随时修改并重新提交。"}
                    </p>
                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={() => setSubmitted(false)}
                    >
                      {isEn ? "Modify" : "修改评分"}
                    </Button>
                  </div>
                ) : (
                  <>
                    {DIMENSIONS.map((d) => (
                      <div key={d.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: d.color }}
                            />
                            {isEn ? d.labelEn : d.label}
                          </label>
                          <span
                            className="text-lg font-bold font-mono"
                            style={{ color: d.color }}
                          >
                            {scores[d.key]?.score ?? 5}
                          </span>
                        </div>
                        <Slider
                          value={[scores[d.key]?.score ?? 5]}
                          min={1}
                          max={10}
                          step={1}
                          onValueChange={([val]) =>
                            setScores((prev) => ({
                              ...prev,
                              [d.key]: { ...prev[d.key], score: val },
                            }))
                          }
                        />
                        <Textarea
                          placeholder={isEn ? `Comment on ${d.labelEn}...` : `${d.label}评语...`}
                          rows={2}
                          value={scores[d.key]?.comment ?? ""}
                          onChange={(e) =>
                            setScores((prev) => ({
                              ...prev,
                              [d.key]: { ...prev[d.key], comment: e.target.value },
                            }))
                          }
                        />
                      </div>
                    ))}
                    <Button
                      className="w-full gap-2"
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending}
                    >
                      <Send className="w-4 h-4" />
                      {submitMutation.isPending
                        ? isEn ? "Submitting..." : "提交中..."
                        : isEn ? "Submit Evaluation" : "提交评分"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ Tab 3: Summary ═══ */}
        <TabsContent value="summary" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Teams Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  {isEn ? "Teams Meeting" : "Teams 会议状态"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{isEn ? "Participants" : "参会人数"}</span>
                    <span className="font-medium">7 / 7</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{isEn ? "Duration" : "持续时间"}</span>
                    <span className="font-medium">{formatTime(elapsedSeconds)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{isEn ? "Status" : "状态"}</span>
                    <Badge variant="destructive" className="text-xs">LIVE</Badge>
                  </div>
                  <Button
                    className="w-full gap-2 mt-2"
                    variant="outline"
                    onClick={() => window.open(teamsUrl, "_blank")}
                  >
                    <Video className="w-4 h-4" />
                    {isEn ? "Join Teams Meeting" : "加入 Teams 会议"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Export */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  {isEn ? "Export Report" : "导出评分报告"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  {isEn
                    ? "Download all evaluation scores as a report file."
                    : "下载所有评分数据为报告文件，包含各维度平均分和评委评语。"}
                </p>
                <Button className="w-full gap-2" variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4" />
                  {isEn ? "Export Scores (.txt)" : "导出评分报告 (.txt)"}
                </Button>
              </CardContent>
            </Card>

            {/* Auto Summary */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {isEn ? "Meeting Summary" : "会议纪要自动摘要"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm space-y-2">
                  <p>
                    <strong>{isEn ? "Meeting" : "会议"}</strong>: 2026年度述职报告 — 事业二部 & 事业三部
                  </p>
                  <p>
                    <strong>{isEn ? "Speakers" : "述职人"}</strong>: {speakers.map((s) => `${s.name} (${s.department})`).join(", ")}
                  </p>
                  <p>
                    <strong>{isEn ? "Evaluators" : "评委"}</strong>: {EVALUATORS.map((e) => e.name).join(", ")}
                  </p>
                  <p>
                    <strong>{isEn ? "Status" : "进度"}</strong>:{" "}
                    {speakers.filter((s) => s.status === "completed").length}/{speakers.length}{" "}
                    {isEn ? "completed" : "人已完成述职"}
                  </p>
                  {analysisQuery.data && (
                    <p>
                      <strong>{isEn ? "Total Evaluations" : "总评分数"}</strong>: {analysisQuery.data.totalEvaluations}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
