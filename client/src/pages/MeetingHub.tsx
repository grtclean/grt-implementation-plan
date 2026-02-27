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
import { useState, useEffect, useRef, useCallback } from "react";
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

// ── Mock data (used when no tRPC server available) ─────────
const DEMO_MEETING: Meeting = {
  id: 1,
  title: "GRT 2026 年度启动大会 — CEO 战略宣讲",
  type: "MAJOR",
  status: "LIVE",
  description:
    "2026年度全体大会：CEO分享新年战略规划，涵盖AI智能制造转型、海外市场拓展、组织架构升级三大核心议题。",
  transcript: `各位同事，大家好！今天我们召开2026年度启动大会。
过去一年，GRT在智能制造领域取得了突破性进展。我们的自动化产线覆盖率从65%提升至89%。
展望2026年，我提出三个核心战略方向：
第一，AI驱动的智能制造转型——我们将在所有产线部署AI质检和预测性维护系统。
第二，海外市场加速拓展——聚焦东南亚和欧洲市场，目标海外营收占比达到35%。
第三，组织架构全面升级——推行项目型组织（POS），提升跨部门协作效率。
全员需在Q1完成个人KPI目标制定，与部门负责人对齐。
让我们一起开创GRT的新篇章！`,
  organizerName: "CEO",
  expectedAttendees: 500,
  actualStart: new Date().toISOString(),
  aiQuizQuestions: [
    {
      id: 1,
      question:
        "根据CEO的战略宣讲，2025年GRT的自动化产线覆盖率达到了多少？",
      type: "MULTIPLE_CHOICE",
      options: ["75%", "89%", "92%", "65%"],
      correctAnswer: "89%",
    },
    {
      id: 2,
      question: "2026年海外营收占比的目标是多少？",
      type: "MULTIPLE_CHOICE",
      options: ["20%", "25%", "30%", "35%"],
      correctAnswer: "35%",
    },
    {
      id: 3,
      question:
        "CEO要求全员在Q1完成个人KPI目标制定并与部门负责人对齐。",
      type: "TRUE_FALSE",
      options: ["True", "False"],
      correctAnswer: "True",
    },
  ],
};

const DEMO_CHAT: ChatMessage[] = [
  { userId: 101, userName: "张工", message: "CEO的战略规划非常振奋人心！💪", time: new Date(Date.now() - 300000).toISOString() },
  { userId: 102, userName: "李经理", message: "海外市场35%的目标很有挑战性，期待更多支持资源", time: new Date(Date.now() - 240000).toISOString() },
  { userId: 103, userName: "王主管", message: "POS组织架构升级是我最关注的，希望能提升协作效率", time: new Date(Date.now() - 180000).toISOString() },
  { userId: 104, userName: "陈博士", message: "AI质检系统的技术路线已经准备就绪，随时可以部署", time: new Date(Date.now() - 120000).toISOString() },
  { userId: 105, userName: "赵总监", message: "建议增加东南亚市场本地化团队的预算", time: new Date(Date.now() - 60000).toISOString() },
];

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
  const [meeting, setMeeting] = useState<Meeting>(DEMO_MEETING);
  const [activeTab, setActiveTab] = useState<"notes" | "quiz" | "chat" | "speaker">("notes");
  const [checkInStatus, setCheckInStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Notes state
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(DEMO_CHAT);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Current user (simulated)
  const currentUser = { id: 12, name: "系统管理员" };

  // ── Load live meeting from backend ─────────────────────
  const loadMeeting = useCallback(async () => {
    try {
      // Try to fetch the live meeting from the backend via tRPC
      const res = await fetch(
        `/api/trpc/smartMeeting.meeting.list?input=${encodeURIComponent(
          JSON.stringify({ json: { status: "LIVE", limit: 1 } })
        )}`
      );
      const data = await res.json();
      const meetings = data?.result?.data?.json;
      if (meetings && meetings.length > 0) {
        setMeeting(meetings[0]);
        // Also load chat messages
        loadChat(meetings[0].id);
      }
    } catch {
      // Backend not available — use demo data
      console.log("[MeetingHub] Using demo data (backend not available)");
    }
  }, []);

  const loadChat = async (meetingId: number) => {
    try {
      const res = await fetch(
        `/api/trpc/smartMeeting.chat.getMessages?input=${encodeURIComponent(
          JSON.stringify({ json: { id: meetingId } })
        )}`
      );
      const data = await res.json();
      const msgs = data?.result?.data?.json;
      if (msgs && msgs.length > 0) {
        setChatMessages(msgs);
      }
    } catch {
      // use demo chat
    }
  };

  useEffect(() => {
    loadMeeting();
  }, [loadMeeting]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Seed demo data ─────────────────────────────────────
  const seedDemo = async () => {
    setSeedLoading(true);
    try {
      const res = await fetch("/api/trpc/smartMeeting.seed.seedDemo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: {} }),
      });
      const data = await res.json();
      if (data?.result?.data?.json?.meeting) {
        setMeeting(data.result.data.json.meeting);
        loadChat(data.result.data.json.meeting.id);
      }
    } catch {
      console.log("[MeetingHub] Seed failed, using demo data");
    }
    setSeedLoading(false);
  };

  // ── Create/Launch Teams meeting ───────────────────────
  const handleLaunchTeams = async () => {
    if (meeting.teamsUrl) {
      window.open(meeting.teamsUrl, "_blank", "noopener");
      return;
    }
    setTeamsLoading(true);
    try {
      const res = await fetch("/api/trpc/smartMeeting.meeting.createTeamsLink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { meetingId: meeting.id } }),
      });
      const data = await res.json();
      const teamsUrl = data?.result?.data?.json?.teamsUrl;
      if (teamsUrl) {
        setMeeting((prev) => ({ ...prev, teamsUrl }));
        window.open(teamsUrl, "_blank", "noopener");
      }
    } catch {
      console.log("[MeetingHub] Teams link creation failed");
    }
    setTeamsLoading(false);
  };

  // ── Check-in handler ───────────────────────────────────
  const handleCheckIn = async (
    status: "PRESENT_PHYSICAL" | "PRESENT_ONLINE" | "LEAVED"
  ) => {
    setLoading(true);
    try {
      if (status === "LEAVED") {
        await fetch("/api/trpc/smartMeeting.attendance.requestLeave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            json: {
              meetingId: meeting.id,
              userId: currentUser.id,
              reason: "临时有紧急事务需要处理",
            },
          }),
        });
      } else {
        await fetch("/api/trpc/smartMeeting.attendance.checkIn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            json: {
              meetingId: meeting.id,
              userId: currentUser.id,
              userName: currentUser.name,
              status,
              checkInMethod: status === "PRESENT_PHYSICAL" ? "NFC Badge" : "Browser",
            },
          }),
        });
      }
    } catch {
      // Backend unavailable — local-only
    }
    setCheckInStatus(status);
    setLoading(false);
  };

  // ── Save notes handler ─────────────────────────────────
  const handleSaveNotes = async () => {
    try {
      await fetch("/api/trpc/smartMeeting.interaction.saveNotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: {
            meetingId: meeting.id,
            userId: currentUser.id,
            userName: currentUser.name,
            personalNotes: notes,
          },
        }),
      });
    } catch {
      // local-only save
    }
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  // ── Quiz submission ────────────────────────────────────
  const handleSubmitQuiz = async () => {
    const questions = meeting.aiQuizQuestions ?? [];
    let correct = 0;
    const answers = questions.map((q) => {
      const selected = quizAnswers[q.id] ?? "";
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) correct++;
      return { questionId: q.id, selectedAnswer: selected, isCorrect };
    });
    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    setQuizScore(score);
    setQuizSubmitted(true);

    try {
      await fetch("/api/trpc/smartMeeting.interaction.submitQuiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: {
            meetingId: meeting.id,
            userId: currentUser.id,
            userName: currentUser.name,
            answers,
            score,
          },
        }),
      });
    } catch {
      // local-only
    }
  };

  // ── Chat send ──────────────────────────────────────────
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const msg: ChatMessage = {
      userId: currentUser.id,
      userName: currentUser.name,
      message: chatInput.trim(),
      time: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, msg]);
    setChatInput("");

    try {
      await fetch("/api/trpc/smartMeeting.chat.sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: {
            meetingId: meeting.id,
            userId: currentUser.id,
            userName: currentUser.name,
            message: msg.message,
          },
        }),
      });
    } catch {
      // local-only
    }
  };

  // ── Elapsed time ───────────────────────────────────────
  const [elapsed, setElapsed] = useState("00:00:00");
  useEffect(() => {
    if (meeting.status !== "LIVE") return;
    const start = meeting.actualStart
      ? new Date(meeting.actualStart).getTime()
      : Date.now();
    const interval = setInterval(() => {
      const diff = Date.now() - start;
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [meeting.status, meeting.actualStart]);

  // ── Render ─────────────────────────────────────────────
  const questions = meeting.aiQuizQuestions ?? [];

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
            disabled={teamsLoading}
            style={{
              background: meeting.teamsUrl ? "#6264a7" : "#6264a7",
              color: "#fff",
            }}
          >
            {teamsLoading ? (
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
            onClick={seedDemo}
            disabled={seedLoading}
            className="text-xs"
          >
            {seedLoading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
            )}
            初始化
          </Button>

          {/* Physical check-in */}
          <Button
            size="sm"
            disabled={loading || checkInStatus === "PRESENT_PHYSICAL"}
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
            disabled={loading || checkInStatus === "PRESENT_ONLINE"}
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
            disabled={loading || checkInStatus === "LEAVED"}
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
                      {chatMessages.length} 条消息
                    </span>
                  </div>

                  {/* Messages area */}
                  <div
                    className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1"
                    style={{ minHeight: 0 }}
                  >
                    {chatMessages.map((msg, i) => {
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
