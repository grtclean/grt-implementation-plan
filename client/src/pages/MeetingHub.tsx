/**
 * GRT Smart Meeting & AI Engagement Hub (智能会议与互动中枢)
 *
 * Unified In-Meeting Workspace with Microsoft Fluent Design.
 *
 * Layout:
 *   Top Bar     — Meeting title, LIVE badge, Teams launch, timer, check-in buttons
 *   Split View  — Left (60%): Collaboration Canvas | Right (40%): tabbed panel
 *     Tab 1: My Private Notes (rich textarea, auto-saves)
 *     Tab 2: Speaker Radar (声纹雷达 — diarization + voice-print matching)
 *     Tab 3: AI Engagement Quiz (3 questions from transcript)
 *     Tab 4: Group Chat (company-wide synced discussion)
 *
 * Backend: tRPC smartMeeting.* procedures
 * Integration: Microsoft Teams via Graph API mock
 */
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Radio,
  MonitorSmartphone,
  DoorOpen,
  Send,
  CheckCircle2,
  XCircle,
  Trophy,
  FileText,
  Brain,
  MessageSquare,
  Users,
  Clock,
  Zap,
  Loader2,
  AlertTriangle,
  Tv,
  RefreshCw,
  Fingerprint,
  Video,
  ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import SpeakerRadarTab from "@/components/meeting/SpeakerRadarTab";

// ── Fluent Design tokens ───────────────────────────────────
const FLUENT_BG = "#faf9f8";
const FLUENT_CARD = "#ffffff";
const FLUENT_BORDER = "#e1dfdd";
const FLUENT_ACCENT = "#0078d4";
const FLUENT_DANGER = "#d13438";
const FLUENT_SUCCESS = "#107c10";
const FLUENT_WARN = "#ffaa44";
const FLUENT_SUBTLE = "#605e5c";

// ── Types ──────────────────────────────────────────────────
interface QuizQuestion {
  id: number;
  question: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE";
  options?: string[];
  correctAnswer: string;
}

interface ChatMessage {
  userId: number;
  userName: string;
  message: string;
  time: string;
}

interface Meeting {
  id: number;
  title: string;
  type: string;
  status: string;
  description?: string | null;
  transcript?: string | null;
  organizerName?: string | null;
  expectedAttendees?: number | null;
  aiQuizQuestions?: QuizQuestion[] | null;
  actualStart?: string | null;
  teamsUrl?: string | null;
}

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

// ── Collaboration Canvas (inline — imported from SmartMeeting concepts) ──
function CollaborationCanvas() {
  const [canvasContent, setCanvasContent] = useState(`# Meeting Notes

## Attendees
-

## Discussion Points

### 1. Review

### 2. Key Tasks

### 3. Issues & Solutions

## Action Items
- TODO:
- Action:

## Next Meeting
`);
  const [extractedActions, setExtractedActions] = useState<
    Array<{ id: string; content: string; completed: boolean }>
  >([]);

  const extractActions = () => {
    const lines = canvasContent.split("\n");
    const actions: typeof extractedActions = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("TODO:") || trimmed.startsWith("- TODO:")) {
        const c = trimmed.replace(/^-?\s*TODO:\s*/i, "").trim();
        if (c) actions.push({ id: Math.random().toString(36), content: c, completed: false });
      } else if (trimmed.startsWith("Action:") || trimmed.startsWith("- Action:")) {
        const c = trimmed.replace(/^-?\s*Action:\s*/i, "").trim();
        if (c) actions.push({ id: Math.random().toString(36), content: c, completed: false });
      }
    }
    setExtractedActions(actions.length > 0 ? actions : extractedActions);
  };

  return (
    <div className="flex gap-4 h-full" style={{ minHeight: 400 }}>
      {/* Canvas editor */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: FLUENT_ACCENT }} />
            Live Canvas (Markdown)
          </h3>
          <Button
            size="sm"
            onClick={extractActions}
            style={{ background: FLUENT_ACCENT, color: "#fff" }}
          >
            <Zap className="w-3.5 h-3.5 mr-1" />
            Extract Actions
          </Button>
        </div>
        <Textarea
          value={canvasContent}
          onChange={(e) => setCanvasContent(e.target.value)}
          className="flex-1 resize-none text-sm font-mono"
          style={{ minHeight: 320, border: `1px solid ${FLUENT_BORDER}` }}
          placeholder="Use TODO: or Action: to mark tasks..."
        />
      </div>

      {/* Action items sidebar */}
      <div className="w-56 flex flex-col gap-2">
        <h4 className="text-xs font-medium" style={{ color: FLUENT_SUBTLE }}>
          Action Items ({extractedActions.filter((a) => !a.completed).length})
        </h4>
        {extractedActions.length === 0 ? (
          <p className="text-xs" style={{ color: FLUENT_BORDER }}>
            Click "Extract Actions" to find TODO/Action items
          </p>
        ) : (
          <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 300 }}>
            {extractedActions.map((a) => (
              <button
                key={a.id}
                onClick={() =>
                  setExtractedActions((prev) =>
                    prev.map((x) => (x.id === a.id ? { ...x, completed: !x.completed } : x))
                  )
                }
                className="w-full text-left flex items-start gap-2 p-2 rounded text-xs"
                style={{
                  background: a.completed ? `${FLUENT_SUCCESS}10` : "#f9f8f7",
                  border: `1px solid ${a.completed ? FLUENT_SUCCESS : FLUENT_BORDER}`,
                  textDecoration: a.completed ? "line-through" : "none",
                  opacity: a.completed ? 0.6 : 1,
                }}
              >
                {a.completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: FLUENT_SUCCESS }} />
                ) : (
                  <span
                    className="w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-0.5"
                    style={{ borderColor: FLUENT_BORDER }}
                  />
                )}
                {a.content}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────
export default function MeetingHub() {
  const { t } = useLanguage();

  // ── State ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"notes" | "quiz" | "chat" | "speaker">("notes");
  const [checkInStatus, setCheckInStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [localChatMessages, setLocalChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const currentUser = { id: 12, name: "系统管理员" };

  // ─── tRPC Queries ───
  const meetingListQuery = trpc.smartMeeting.meeting.list.useQuery(
    { status: "LIVE", limit: 1 },
    QUERY_OPTS,
  );
  const meeting = meetingListQuery.data?.[0] ?? null;

  const chatQuery = trpc.smartMeeting.chat.getMessages.useQuery(
    { id: meeting?.id ?? 0 },
    { ...QUERY_OPTS, enabled: meeting != null },
  );

  // Sync server chat to local state
  useEffect(() => {
    if (chatQuery.data && chatQuery.data.length > 0) {
      setLocalChatMessages(chatQuery.data as ChatMessage[]);
    }
  }, [chatQuery.data]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localChatMessages]);

  // ─── tRPC Mutations ───
  const seedMut = trpc.smartMeeting.seed.seedDemo.useMutation({
    onSuccess: () => { meetingListQuery.refetch(); toast.success("已初始化示例会议"); },
  });
  const teamsLinkMut = trpc.smartMeeting.meeting.createTeamsLink.useMutation({
    onSuccess: (data: any) => {
      if (data.teamsUrl) window.open(data.teamsUrl, "_blank", "noopener");
      meetingListQuery.refetch();
    },
  });
  const checkInMut = trpc.smartMeeting.attendance.checkIn.useMutation();
  const requestLeaveMut = trpc.smartMeeting.attendance.requestLeave.useMutation();
  const saveNotesMut = trpc.smartMeeting.interaction.saveNotes.useMutation({
    onSuccess: () => { setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000); },
  });
  const submitQuizMut = trpc.smartMeeting.interaction.submitQuiz.useMutation();
  const sendMessageMut = trpc.smartMeeting.chat.sendMessage.useMutation();

  const mutLoading = checkInMut.isPending || requestLeaveMut.isPending;

  // ── Handlers ─────────────────────────────────────────────
  const handleLaunchTeams = () => {
    if (!meeting) return;
    if (meeting.teamsUrl) {
      window.open(meeting.teamsUrl, "_blank", "noopener");
      return;
    }
    teamsLinkMut.mutate({ meetingId: meeting.id });
  };

  const handleCheckIn = (status: "PRESENT_PHYSICAL" | "PRESENT_ONLINE" | "LEAVED") => {
    if (!meeting) return;
    if (status === "LEAVED") {
      requestLeaveMut.mutate({ meetingId: meeting.id, reason: "临时有紧急事务需要处理" });
    } else {
      checkInMut.mutate({
        meetingId: meeting.id,
        status,
        checkInMethod: status === "PRESENT_PHYSICAL" ? "NFC Badge" : "Browser",
      });
    }
    setCheckInStatus(status);
  };

  const handleSaveNotes = () => {
    if (!meeting) return;
    saveNotesMut.mutate({ meetingId: meeting.id, personalNotes: notes });
  };

  const handleSubmitQuiz = () => {
    if (!meeting) return;
    const qs = ((meeting as any).aiQuizQuestions ?? []) as QuizQuestion[];
    let correct = 0;
    const answers = qs.map((q) => {
      const selected = quizAnswers[q.id] ?? "";
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) correct++;
      return { questionId: q.id, selectedAnswer: selected, isCorrect };
    });
    const score = qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0;
    setQuizScore(score);
    setQuizSubmitted(true);
    submitQuizMut.mutate({ meetingId: meeting.id, answers, score });
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || !meeting) return;
    const msg: ChatMessage = {
      userId: currentUser.id,
      userName: currentUser.name,
      message: chatInput.trim(),
      time: new Date().toISOString(),
    };
    setLocalChatMessages((prev) => [...prev, msg]);
    setChatInput("");
    sendMessageMut.mutate({ meetingId: meeting.id, message: msg.message });
  };

  // ── Elapsed time ───────────────────────────────────────
  const [elapsed, setElapsed] = useState("00:00:00");
  useEffect(() => {
    if (!meeting || meeting.status !== "LIVE") return;
    const start = meeting.actualStart
      ? new Date(meeting.actualStart as any).getTime()
      : Date.now();
    const interval = setInterval(() => {
      const diff = Date.now() - start;
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [meeting?.status, meeting?.actualStart]);

  // ── Loading State ───
  if (meetingListQuery.isLoading) {
    return (
      <div className="min-h-screen p-6 space-y-6" style={{ background: FLUENT_BG }}>
        <Skeleton className="h-16 rounded-lg" />
        <div className="flex gap-4">
          <Skeleton className="flex-1 h-[500px] rounded-lg" />
          <Skeleton className="w-[40%] h-[500px] rounded-lg" />
        </div>
      </div>
    );
  }

  // ── No Meeting State ──
  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: FLUENT_BG }}>
        <Card style={{ background: FLUENT_CARD, border: `1px solid ${FLUENT_BORDER}` }}>
          <CardContent className="p-8 text-center">
            <Tv className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: FLUENT_ACCENT }} />
            <h2 className="text-lg font-semibold mb-2">暂无进行中的会议</h2>
            <p className="text-sm mb-6" style={{ color: FLUENT_SUBTLE }}>点击下方按钮初始化示例会议数据</p>
            <Button
              onClick={() => seedMut.mutate()}
              disabled={seedMut.isPending}
              style={{ background: FLUENT_ACCENT, color: "#fff" }}
            >
              {seedMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              初始化示例会议
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────
  const questions = ((meeting as any).aiQuizQuestions ?? []) as QuizQuestion[];

  return (
    <div
      className="min-h-screen"
      style={{ background: FLUENT_BG, fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      {/* ═══════════ TOP BAR ═══════════ */}
      <div
        className="sticky top-0 z-20 px-6 py-3 flex items-center justify-between gap-4 shadow-sm"
        style={{ background: FLUENT_CARD, borderBottom: `1px solid ${FLUENT_BORDER}` }}
      >
        {/* Left: Meeting info */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${FLUENT_ACCENT}15` }}
          >
            <Tv className="w-5 h-5" style={{ color: FLUENT_ACCENT }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold truncate">{meeting.title}</h1>
              {meeting.status === "LIVE" && (
                <span
                  className="px-2 py-0.5 text-xs font-bold rounded-full animate-pulse text-white shrink-0"
                  style={{ background: FLUENT_DANGER }}
                >
                  LIVE
                </span>
              )}
              {meeting.type === "MAJOR" && (
                <Badge variant="outline" className="shrink-0 border-amber-400 text-amber-600 text-xs">
                  全体大会
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: FLUENT_SUBTLE }}>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {meeting.expectedAttendees ?? 0} 人
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {elapsed}
              </span>
              {meeting.organizerName && (
                <span>主讲: {meeting.organizerName}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Check-in buttons + seed */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Launch MS Teams Video */}
          <Button
            size="sm"
            onClick={handleLaunchTeams}
            disabled={teamsLinkMut.isPending}
            style={{
              background: meeting.teamsUrl ? "#6264a7" : "#6264a7",
              color: "#fff",
            }}
          >
            {teamsLinkMut.isPending ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Video className="w-4 h-4 mr-1" />
            )}
            {meeting.teamsUrl ? "加入 Teams 会议" : "创建 Teams 会议"}
            {meeting.teamsUrl && <ExternalLink className="w-3 h-3 ml-1" />}
          </Button>

          {/* Seed demo data button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => seedMut.mutate()}
            disabled={seedMut.isPending}
            className="text-xs"
          >
            {seedMut.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
            )}
            初始化
          </Button>

          {/* Physical check-in */}
          <Button
            size="sm"
            disabled={mutLoading || checkInStatus === "PRESENT_PHYSICAL"}
            onClick={() => handleCheckIn("PRESENT_PHYSICAL")}
            style={{
              background:
                checkInStatus === "PRESENT_PHYSICAL" ? FLUENT_SUCCESS : FLUENT_ACCENT,
              color: "#fff",
            }}
          >
            {checkInStatus === "PRESENT_PHYSICAL" ? (
              <CheckCircle2 className="w-4 h-4 mr-1" />
            ) : (
              <Radio className="w-4 h-4 mr-1" />
            )}
            现场签到
          </Button>

          {/* Online join */}
          <Button
            size="sm"
            variant="outline"
            disabled={mutLoading || checkInStatus === "PRESENT_ONLINE"}
            onClick={() => handleCheckIn("PRESENT_ONLINE")}
            style={
              checkInStatus === "PRESENT_ONLINE"
                ? { background: FLUENT_SUCCESS, color: "#fff", borderColor: FLUENT_SUCCESS }
                : {}
            }
          >
            {checkInStatus === "PRESENT_ONLINE" ? (
              <CheckCircle2 className="w-4 h-4 mr-1" />
            ) : (
              <MonitorSmartphone className="w-4 h-4 mr-1" />
            )}
            线上参会
          </Button>

          {/* Request leave */}
          <Button
            size="sm"
            variant="outline"
            disabled={mutLoading || checkInStatus === "LEAVED"}
            onClick={() => handleCheckIn("LEAVED")}
            style={
              checkInStatus === "LEAVED"
                ? { background: FLUENT_WARN, color: "#fff", borderColor: FLUENT_WARN }
                : { borderColor: FLUENT_WARN, color: FLUENT_WARN }
            }
          >
            {checkInStatus === "LEAVED" ? (
              <CheckCircle2 className="w-4 h-4 mr-1" />
            ) : (
              <DoorOpen className="w-4 h-4 mr-1" />
            )}
            请假
          </Button>
        </div>
      </div>

      {/* ═══════════ SPLIT VIEW ═══════════ */}
      <div className="flex gap-4 p-4" style={{ height: "calc(100vh - 72px)" }}>
        {/* ── LEFT PANEL (60%): Collaboration Canvas ── */}
        <div className="w-[60%] flex flex-col gap-4">
          <Card
            className="flex-1 overflow-hidden"
            style={{ background: FLUENT_CARD, border: `1px solid ${FLUENT_BORDER}` }}
          >
            <CardContent className="h-full flex flex-col p-4">
              <CollaborationCanvas />
            </CardContent>
          </Card>

          {/* Transcript excerpt (collapsible) */}
          {meeting.transcript && (
            <Card style={{ background: FLUENT_CARD, border: `1px solid ${FLUENT_BORDER}` }}>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2" style={{ color: FLUENT_SUBTLE }}>
                  <FileText className="w-4 h-4" />
                  AI 实时转录摘要
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-xs leading-relaxed line-clamp-4" style={{ color: FLUENT_SUBTLE }}>
                  {meeting.transcript}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── RIGHT PANEL (40%): Tabbed interface ── */}
        <div className="w-[40%] flex flex-col">
          {/* Tab bar */}
          <div
            className="flex rounded-t-lg overflow-hidden"
            style={{ border: `1px solid ${FLUENT_BORDER}`, borderBottom: "none" }}
          >
            {[
              { key: "notes" as const, label: "我的笔记", icon: FileText },
              { key: "speaker" as const, label: "声纹雷达", icon: Fingerprint },
              { key: "quiz" as const, label: "AI 互动测验", icon: Brain },
              { key: "chat" as const, label: "群聊讨论", icon: MessageSquare },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 py-2.5 px-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                style={{
                  background: activeTab === tab.key ? FLUENT_CARD : "#f3f2f1",
                  color: activeTab === tab.key ? FLUENT_ACCENT : FLUENT_SUBTLE,
                  borderBottom:
                    activeTab === tab.key
                      ? `2px solid ${FLUENT_ACCENT}`
                      : `2px solid transparent`,
                }}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <Card
            className="flex-1 rounded-t-none overflow-hidden flex flex-col"
            style={{ background: FLUENT_CARD, border: `1px solid ${FLUENT_BORDER}` }}
          >
            <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
              {/* ── Tab 1: My Private Notes ── */}
              {activeTab === "notes" && (
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" style={{ color: FLUENT_ACCENT }} />
                      个人会议笔记
                    </h3>
                    <div className="flex items-center gap-2">
                      {notesSaved && (
                        <span className="text-xs flex items-center gap-1" style={{ color: FLUENT_SUCCESS }}>
                          <CheckCircle2 className="w-3 h-3" />
                          已保存
                        </span>
                      )}
                      <Button
                        size="sm"
                        onClick={handleSaveNotes}
                        style={{ background: FLUENT_ACCENT, color: "#fff" }}
                      >
                        保存笔记
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={`在此记录您在「${meeting.title}」中的关键要点、想法和行动项...\n\n• 要点1:\n• 要点2:\n• 行动项:`}
                    className="flex-1 resize-none text-sm"
                    style={{
                      minHeight: 300,
                      border: `1px solid ${FLUENT_BORDER}`,
                      fontFamily: "'Segoe UI', system-ui, sans-serif",
                    }}
                  />
                  <p className="text-xs" style={{ color: FLUENT_SUBTLE }}>
                    笔记仅您自己可见，不会与他人共享
                  </p>
                </div>
              )}

              {/* ── Tab 2: AI Engagement Quiz ── */}
              {activeTab === "quiz" && (
                <div className="flex-1 overflow-y-auto space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Brain className="w-4 h-4" style={{ color: FLUENT_ACCENT }} />
                      AI 互动测验
                    </h3>
                    {quizSubmitted && (
                      <div className="flex items-center gap-2">
                        <Trophy
                          className="w-4 h-4"
                          style={{ color: quizScore >= 67 ? FLUENT_SUCCESS : FLUENT_DANGER }}
                        />
                        <span
                          className="text-sm font-bold"
                          style={{ color: quizScore >= 67 ? FLUENT_SUCCESS : FLUENT_DANGER }}
                        >
                          {quizScore}分
                        </span>
                      </div>
                    )}
                  </div>

                  {questions.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center py-12 gap-3"
                      style={{ color: FLUENT_SUBTLE }}
                    >
                      <Brain className="w-12 h-12 opacity-30" />
                      <p className="text-sm">等待AI根据会议内容生成测验题目...</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs" style={{ color: FLUENT_SUBTLE }}>
                        根据会议内容自动生成，测试您对关键内容的掌握程度
                      </p>

                      {questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="p-4 rounded-lg space-y-3"
                          style={{
                            background: "#f9f8f7",
                            border: `1px solid ${FLUENT_BORDER}`,
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                              style={{ background: FLUENT_ACCENT }}
                            >
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-sm font-medium">{q.question}</p>
                              <span
                                className="text-xs px-1.5 py-0.5 rounded mt-1 inline-block"
                                style={{
                                  background: `${FLUENT_ACCENT}15`,
                                  color: FLUENT_ACCENT,
                                }}
                              >
                                {q.type === "MULTIPLE_CHOICE" ? "多选题" : "判断题"}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2 ml-8">
                            {(q.options ?? []).map((opt) => {
                              const isSelected = quizAnswers[q.id] === opt;
                              const isCorrect = quizSubmitted && opt === q.correctAnswer;
                              const isWrong =
                                quizSubmitted && isSelected && opt !== q.correctAnswer;

                              return (
                                <button
                                  key={opt}
                                  onClick={() => {
                                    if (quizSubmitted) return;
                                    setQuizAnswers((prev) => ({
                                      ...prev,
                                      [q.id]: opt,
                                    }));
                                  }}
                                  disabled={quizSubmitted}
                                  className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-all"
                                  style={{
                                    background: isCorrect
                                      ? `${FLUENT_SUCCESS}15`
                                      : isWrong
                                      ? `${FLUENT_DANGER}15`
                                      : isSelected
                                      ? `${FLUENT_ACCENT}10`
                                      : FLUENT_CARD,
                                    border: `1px solid ${
                                      isCorrect
                                        ? FLUENT_SUCCESS
                                        : isWrong
                                        ? FLUENT_DANGER
                                        : isSelected
                                        ? FLUENT_ACCENT
                                        : FLUENT_BORDER
                                    }`,
                                    cursor: quizSubmitted ? "default" : "pointer",
                                  }}
                                >
                                  {quizSubmitted && isCorrect && (
                                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: FLUENT_SUCCESS }} />
                                  )}
                                  {quizSubmitted && isWrong && (
                                    <XCircle className="w-4 h-4 shrink-0" style={{ color: FLUENT_DANGER }} />
                                  )}
                                  {!quizSubmitted && (
                                    <span
                                      className="w-4 h-4 rounded-full border-2 shrink-0"
                                      style={{
                                        borderColor: isSelected
                                          ? FLUENT_ACCENT
                                          : FLUENT_BORDER,
                                        background: isSelected ? FLUENT_ACCENT : "transparent",
                                      }}
                                    />
                                  )}
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {!quizSubmitted ? (
                        <Button
                          className="w-full"
                          onClick={handleSubmitQuiz}
                          disabled={Object.keys(quizAnswers).length < questions.length}
                          style={{ background: FLUENT_ACCENT, color: "#fff" }}
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          提交测验（{Object.keys(quizAnswers).length}/{questions.length}）
                        </Button>
                      ) : (
                        <div
                          className="p-4 rounded-lg text-center"
                          style={{
                            background:
                              quizScore >= 67
                                ? `${FLUENT_SUCCESS}10`
                                : `${FLUENT_WARN}10`,
                            border: `1px solid ${
                              quizScore >= 67 ? FLUENT_SUCCESS : FLUENT_WARN
                            }`,
                          }}
                        >
                          <Trophy
                            className="w-8 h-8 mx-auto mb-2"
                            style={{
                              color:
                                quizScore >= 67 ? FLUENT_SUCCESS : FLUENT_WARN,
                            }}
                          />
                          <p className="font-semibold text-lg">
                            得分: {quizScore}/100
                          </p>
                          <p
                            className="text-sm mt-1"
                            style={{ color: FLUENT_SUBTLE }}
                          >
                            {quizScore === 100
                              ? "满分！完美掌握会议核心内容"
                              : quizScore >= 67
                              ? "良好！您对会议内容有较好的理解"
                              : "建议回顾会议录像和笔记"}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Tab: Speaker Radar ── */}
              {activeTab === "speaker" && (
                <SpeakerRadarTab meetingId={meeting.id} />
              )}

              {/* ── Tab: Group Chat ── */}
              {activeTab === "chat" && (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" style={{ color: FLUENT_ACCENT }} />
                      全体讨论区
                    </h3>
                    <span className="text-xs" style={{ color: FLUENT_SUBTLE }}>
                      {localChatMessages.length} 条消息
                    </span>
                  </div>

                  {/* Messages area */}
                  <div
                    className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1"
                    style={{ minHeight: 0 }}
                  >
                    {localChatMessages.map((msg, i) => {
                      const isMe = msg.userId === currentUser.id;
                      return (
                        <div
                          key={i}
                          className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{
                              background: isMe
                                ? FLUENT_ACCENT
                                : `hsl(${(msg.userId * 47) % 360}, 50%, 55%)`,
                            }}
                          >
                            {msg.userName.charAt(0)}
                          </div>
                          <div
                            className={`max-w-[75%] ${isMe ? "text-right" : ""}`}
                          >
                            <div
                              className="flex items-center gap-2 mb-0.5"
                              style={{
                                flexDirection: isMe ? "row-reverse" : "row",
                              }}
                            >
                              <span className="text-xs font-medium">
                                {msg.userName}
                              </span>
                              <span className="text-xs" style={{ color: FLUENT_SUBTLE }}>
                                {new Date(msg.time).toLocaleTimeString("zh-CN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <div
                              className="inline-block px-3 py-2 rounded-lg text-sm"
                              style={{
                                background: isMe ? FLUENT_ACCENT : "#f3f2f1",
                                color: isMe ? "#fff" : "#323130",
                              }}
                            >
                              {msg.message}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat input */}
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="输入讨论内容..."
                      className="flex-1 text-sm"
                      style={{ border: `1px solid ${FLUENT_BORDER}` }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChat();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendChat}
                      disabled={!chatInput.trim()}
                      size="icon"
                      style={{ background: FLUENT_ACCENT, color: "#fff" }}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
