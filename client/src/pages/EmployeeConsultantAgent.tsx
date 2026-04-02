/**
 * EmployeeConsultantAgent — 员工顾问智能体
 *
 * 基于"人设×组织设"理论的个性化工作管家
 * Tab1: 我的顾问 (对话) | Tab2: 每日简报 | Tab3: 人物画像 (管理)
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Bot, MessageSquare, FileText, User2, Send, Loader2,
  Star, Heart, Target, Users, TrendingUp, Brain,
  Sparkles, Calendar, ThumbsUp, ThumbsDown, Sun,
  Shield, Zap, Award, RefreshCw,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const TIER_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof Star; desc: string }> = {
  high: { label: "高人设", color: "text-green-600", bgColor: "bg-green-50 border-green-200", icon: Star, desc: "团队标杆 · 正向输入20-30%" },
  mid: { label: "中人设", color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200", icon: TrendingUp, desc: "稳步成长 · 需要引导" },
  low: { label: "低人设", color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200", icon: Shield, desc: "重点关注 · 温暖守护" },
};

export default function EmployeeConsultantAgent() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [activeTab, setActiveTab] = useState("chat");
  const employeeId = user?.id ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{isZh ? "我的工作顾问" : "My Work Consultant"}</h1>
          <p className="text-sm text-muted-foreground">{isZh ? "个性化工作管家 — 目标追踪 · 情感支持 · 方法建议 · 任务帮助" : "Personal work butler — Goals · Support · Methods · Tasks"}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="chat" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" />{isZh ? "我的顾问" : "My Consultant"}</TabsTrigger>
          <TabsTrigger value="digests" className="gap-1.5"><Sun className="h-3.5 w-3.5" />{isZh ? "每日简报" : "Daily Digest"}</TabsTrigger>
          <TabsTrigger value="persona" className="gap-1.5"><User2 className="h-3.5 w-3.5" />{isZh ? "人物画像" : "Persona Profile"}</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <ConsultantChat employeeId={employeeId} isZh={isZh} user={user} />
        </TabsContent>

        <TabsContent value="digests" className="mt-4">
          <DailyDigests employeeId={employeeId} isZh={isZh} />
        </TabsContent>

        <TabsContent value="persona" className="mt-4">
          <PersonaProfile employeeId={employeeId} isZh={isZh} user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Tab 1: Consultant Chat
// ══════════════════════════════════════════════════════
function ConsultantChat({ employeeId, isZh, user }: { employeeId: number; isZh: boolean; user: any }) {
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sessionsQ = trpc.consultantAgent.sessions.list.useQuery({ employeeId, limit: 10 });
  const createSession = trpc.consultantAgent.sessions.create.useMutation();
  const sendMsg = trpc.consultantAgent.sessions.sendMessage.useMutation();
  const messagesQ = trpc.consultantAgent.sessions.getMessages.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId, refetchInterval: false }
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQ.data]);

  const handleNewSession = async (topic?: string) => {
    const s = await createSession.mutateAsync({ employeeId, topic });
    setSessionId(s.sessionId);
    sessionsQ.refetch();
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!sessionId) {
      const s = await createSession.mutateAsync({ employeeId, topic: "general" });
      setSessionId(s.sessionId);
      await sendMsg.mutateAsync({ sessionId: s.sessionId, employeeId, content: message.trim() });
    } else {
      await sendMsg.mutateAsync({ sessionId, employeeId, content: message.trim() });
    }
    setMessage("");
    messagesQ.refetch();
  };

  const messages = messagesQ.data || [];
  const sessions = sessionsQ.data || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Session List */}
      <Card className="lg:col-span-1">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{isZh ? "对话列表" : "Sessions"}</CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleNewSession()}>
              + {isZh ? "新对话" : "New"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="py-0 space-y-1">
          {/* Quick topic buttons */}
          <div className="grid grid-cols-2 gap-1 pb-2">
            {[
              { topic: "goal_planning", icon: "🎯", label: isZh ? "目标" : "Goals" },
              { topic: "emotional_support", icon: "💬", label: isZh ? "倾诉" : "Talk" },
              { topic: "task_help", icon: "📋", label: isZh ? "任务" : "Tasks" },
              { topic: "skill_development", icon: "📚", label: isZh ? "技能" : "Skills" },
            ].map(t => (
              <Button key={t.topic} size="sm" variant="ghost" className="h-8 text-xs justify-start"
                onClick={() => handleNewSession(t.topic)}>
                <span className="mr-1">{t.icon}</span>{t.label}
              </Button>
            ))}
          </div>
          {sessions.map((s: any) => (
            <div key={s.id}
              className={`p-2 rounded-lg text-xs cursor-pointer hover:bg-muted ${sessionId === s.sessionId ? "bg-muted border" : ""}`}
              onClick={() => setSessionId(s.sessionId)}>
              <div className="font-medium truncate">{s.topic === "general" ? (isZh ? "自由对话" : "General") : s.topic}</div>
              <div className="text-muted-foreground">{s.messageCount || 0} {isZh ? "条消息" : "msgs"}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-3">
        <CardContent className="p-0">
          {/* Messages */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-3">
            {!sessionId && (
              <div className="text-center py-20 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-3 text-violet-300" />
                <div className="text-sm font-medium">{isZh ? "你好！我是你的专属工作顾问" : "Hi! I'm your personal work consultant"}</div>
                <div className="text-xs mt-1">{isZh ? "选择一个话题开始对话，或直接输入你的问题" : "Pick a topic or type your question"}</div>
              </div>
            )}
            {messages.map((msg: any) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] p-3 rounded-2xl ${isUser ? "bg-violet-500 text-white rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                    {!isUser && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Bot className="h-3.5 w-3.5 text-violet-500" />
                        <span className="text-xs font-medium text-violet-600">{isZh ? "工作顾问" : "Consultant"}</span>
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    <div className={`text-[10px] mt-1 ${isUser ? "text-violet-200" : "text-muted-foreground"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })}
            {sendMsg.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-2xl rounded-bl-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                    <span className="text-xs text-muted-foreground">{isZh ? "思考中..." : "Thinking..."}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <Input value={message} onChange={e => setMessage(e.target.value)}
              placeholder={isZh ? "输入你的问题、想法或需要帮助的事..." : "Type your question, thoughts, or ask for help..."}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              disabled={sendMsg.isPending} />
            <Button onClick={handleSend} disabled={!message.trim() || sendMsg.isPending} className="bg-violet-600 hover:bg-violet-700">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Tab 2: Daily Digests
// ══════════════════════════════════════════════════════
function DailyDigests({ employeeId, isZh }: { employeeId: number; isZh: boolean }) {
  const digestsQ = trpc.consultantAgent.outputs.list.useQuery({ employeeId, outputType: "daily_digest", limit: 14 });
  const markRead = trpc.consultantAgent.outputs.markRead.useMutation();
  const feedback = trpc.consultantAgent.outputs.submitFeedback.useMutation();

  const digests = digestsQ.data || [];

  return (
    <div className="space-y-3">
      {digests.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Sun className="h-10 w-10 mx-auto mb-3 text-amber-300" />
          <div className="text-sm">{isZh ? "暂无每日简报。顾问会在每个工作日为你生成个性化简报。" : "No digests yet. Your consultant will generate personalized daily briefings."}</div>
        </CardContent></Card>
      ) : (
        digests.map((d: any) => {
          const tierCfg = TIER_CONFIG[d.personaTierAtTime || "mid"];
          return (
            <Card key={d.id} className={`${!d.isRead ? "border-l-4 border-l-violet-500" : ""}`}
              onClick={() => { if (!d.isRead) { markRead.mutate({ outputId: d.id }); } }}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">{d.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${tierCfg?.color}`}>{tierCfg?.label}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-sm whitespace-pre-wrap text-foreground/80">{d.content}</div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{isZh ? "这条建议有帮助吗？" : "Was this helpful?"}</span>
                  {[1, 2, 3, 4, 5].map(r => (
                    <button key={r} onClick={(e) => { e.stopPropagation(); feedback.mutate({ outputId: d.id, rating: r }); }}
                      className={`text-xs ${d.feedbackRating === r ? "text-amber-500" : "text-muted-foreground hover:text-amber-400"}`}>
                      ★
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Tab 3: Persona Profile (管理员视角)
// ══════════════════════════════════════════════════════
function PersonaProfile({ employeeId, isZh, user }: { employeeId: number; isZh: boolean; user: any }) {
  const year = new Date().getFullYear();
  const profileQ = trpc.consultantAgent.persona.get.useQuery({ employeeId, year });
  const upsert = trpc.consultantAgent.persona.upsert.useMutation();
  const tierDist = trpc.consultantAgent.persona.tierDistribution.useQuery({ year });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  const profile = profileQ.data;

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const handleSave = async () => {
    await upsert.mutateAsync({
      employeeId,
      employeeName: form.employeeName || user?.name || "",
      department: form.department,
      position: form.position,
      personaScore: form.personaScore,
      motivationScore: form.motivationScore,
      teamInteractionScore: form.teamInteractionScore,
      clientRecognitionScore: form.clientRecognitionScore,
      peerApprovalScore: form.peerApprovalScore,
      managerConfidenceScore: form.managerConfidenceScore,
      communicationStyle: form.communicationStyle,
      preferredFeedbackMode: form.preferredFeedbackMode,
      emotionalResilience: form.emotionalResilience,
      careerAspirations: form.careerAspirations,
      interviewNotes: form.interviewNotes,
    });
    setEditing(false);
    profileQ.refetch();
  };

  const tierCfg = TIER_CONFIG[profile?.personaTier || "mid"];
  const score = parseFloat(profile?.personaScore || "50");

  // 5-dimension radar data
  const dims = [
    { key: "motivation", label: isZh ? "内驱力" : "Motivation", value: parseFloat(profile?.motivationScore || "50"), icon: Zap },
    { key: "teamInteraction", label: isZh ? "团队互动" : "Team", value: parseFloat(profile?.teamInteractionScore || "50"), icon: Users },
    { key: "clientRecognition", label: isZh ? "客户认同" : "Client", value: parseFloat(profile?.clientRecognitionScore || "50"), icon: Heart },
    { key: "peerApproval", label: isZh ? "同事肯定" : "Peers", value: parseFloat(profile?.peerApprovalScore || "50"), icon: ThumbsUp },
    { key: "managerConfidence", label: isZh ? "主管信心" : "Manager", value: parseFloat(profile?.managerConfidenceScore || "50"), icon: Award },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Persona Score Card */}
      <Card className={`border ${tierCfg?.bgColor}`}>
        <CardContent className="py-6 text-center">
          <div className={`text-5xl font-bold ${tierCfg?.color}`}>{score.toFixed(0)}</div>
          <div className="text-sm font-medium mt-1">{tierCfg?.label}</div>
          <div className="text-xs text-muted-foreground mt-1">{tierCfg?.desc}</div>
          <div className="mt-4 text-xs text-muted-foreground">
            {isZh ? "人设评分决定顾问Agent的交互策略" : "Persona score determines consultant strategy"}
          </div>
        </CardContent>
      </Card>

      {/* 5-Dimension Radar */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Brain className="h-4 w-4" />{isZh ? "五维人设画像" : "5-Dimension Persona"}</span>
            <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
              {editing ? (isZh ? "取消" : "Cancel") : (isZh ? "编辑" : "Edit")}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dims.map(d => {
              const Icon = d.icon;
              return (
                <div key={d.key} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground w-4" />
                  <div className="w-20 text-sm">{d.label}</div>
                  <div className="flex-1">
                    {editing ? (
                      <Input type="number" min={0} max={100} className="h-7 w-20 text-sm"
                        value={form[`${d.key}Score`] ?? d.value}
                        onChange={e => setForm({ ...form, [`${d.key}Score`]: e.target.value })} />
                    ) : (
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${d.value >= 70 ? "bg-green-500" : d.value >= 40 ? "bg-blue-500" : "bg-amber-500"}`}
                          style={{ width: `${d.value}%` }} />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-mono w-10 text-right">{d.value}</span>
                </div>
              );
            })}
          </div>

          {editing && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{isZh ? "沟通风格" : "Comm Style"}</Label>
                  <select className="w-full rounded-md border bg-background text-sm h-8 px-2"
                    value={form.communicationStyle || "balanced"}
                    onChange={e => setForm({ ...form, communicationStyle: e.target.value })}>
                    <option value="direct">{isZh ? "直接高效" : "Direct"}</option>
                    <option value="supportive">{isZh ? "温暖支持" : "Supportive"}</option>
                    <option value="analytical">{isZh ? "数据驱动" : "Analytical"}</option>
                    <option value="balanced">{isZh ? "平衡兼顾" : "Balanced"}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{isZh ? "情绪韧性" : "Resilience"}</Label>
                  <select className="w-full rounded-md border bg-background text-sm h-8 px-2"
                    value={form.emotionalResilience || "moderate"}
                    onChange={e => setForm({ ...form, emotionalResilience: e.target.value })}>
                    <option value="high">{isZh ? "强" : "High"}</option>
                    <option value="moderate">{isZh ? "中" : "Moderate"}</option>
                    <option value="low">{isZh ? "弱" : "Low"}</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{isZh ? "职业愿望" : "Career Aspirations"}</Label>
                <textarea className="w-full rounded-md border bg-background text-sm p-2 min-h-[50px] resize-none"
                  value={form.careerAspirations || ""}
                  onChange={e => setForm({ ...form, careerAspirations: e.target.value })} />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
                  {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  {isZh ? "保存画像" : "Save Profile"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier Distribution */}
      {tierDist.data && tierDist.data.length > 0 && (
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">{isZh ? "全员人设分布" : "Org Persona Distribution"}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 justify-center">
              {tierDist.data.map((t: any) => {
                const cfg = TIER_CONFIG[t.tier] || TIER_CONFIG.mid;
                const count = Number(t.count);
                return (
                  <div key={t.tier} className="text-center">
                    <div className={`w-20 rounded-t-lg ${cfg.bgColor} border flex items-end justify-center`}
                      style={{ height: `${Math.max(count * 15, 30)}px` }}>
                      <span className="text-lg font-bold pb-1">{count}</span>
                    </div>
                    <div className={`text-xs font-medium mt-1 ${cfg.color}`}>{cfg.label}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
