import { useState, useRef, useEffect } from "react";
import {
  Bot,
  FileText,
  ListChecks,
  Send,
  Loader2,
  ClipboardList,
  CalendarCheck,
  MessageCircle,
  User,
  Sparkles,
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
import { trpc } from "@/lib/trpc";

export function MeetingAssistantTab() {
  // --- Meeting Brief ---
  const [briefMeetingId, setBriefMeetingId] = useState("");
  const briefMutation = trpc.ime.generateBrief.useMutation();

  // --- Agenda Generator ---
  const [agendaTopic, setAgendaTopic] = useState("");
  const [agendaParticipants, setAgendaParticipants] = useState("");
  const [agendaDuration, setAgendaDuration] = useState("60");
  const agendaMutation = trpc.ime.generateAgenda.useMutation();

  // --- Meeting Minutes ---
  const [minutesMeetingId, setMinutesMeetingId] = useState("");
  const minutesMutation = trpc.ime.generateMinutes.useMutation();

  // --- Follow-Up Plan ---
  const [followUpMeetingId, setFollowUpMeetingId] = useState("");
  const followUpMutation = trpc.ime.generateFollowUp.useMutation();

  // --- Chat Q&A ---
  const [chatSessionId] = useState(() => `chat-${Date.now()}`);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const askMutation = trpc.ime.askAssistant.useMutation({
    onSuccess(data) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendChat = () => {
    if (!chatInput.trim() || askMutation.isPending) return;
    const q = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", content: q }]);
    setChatInput("");
    askMutation.mutate({ sessionId: chatSessionId, question: q });
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Meeting Brief */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            会前准备简报
          </CardTitle>
          <CardDescription>AI基于历史数据生成会前准备材料，包括参与者分析、待办事项、相关决策和建议问题</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end mb-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">会议ID</label>
              <Input placeholder="输入会议ID..." value={briefMeetingId} onChange={(e) => setBriefMeetingId(e.target.value)} />
            </div>
            <Button onClick={() => briefMutation.mutate({ meetingId: briefMeetingId })} disabled={!briefMeetingId.trim() || briefMutation.isPending}>
              {briefMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardList className="h-4 w-4 mr-2" />}
              生成简报
            </Button>
          </div>
          {briefMutation.isError && <p className="text-sm text-destructive">{briefMutation.error.message}</p>}
          {briefMutation.isSuccess && (
            <div className="space-y-3 border rounded-lg p-4">
              <p className="text-sm">{briefMutation.data.narrative}</p>
              {briefMutation.data.suggestedQuestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">建议提问:</p>
                  <ul className="text-sm space-y-1">
                    {briefMutation.data.suggestedQuestions.map((q: string, i: number) => (
                      <li key={i} className="flex items-start gap-1"><Sparkles className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              {briefMutation.data.riskAlerts.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-700 mb-1">风险提醒:</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    {briefMutation.data.riskAlerts.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {briefMutation.data.pendingItems.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">待处理事项:</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    {briefMutation.data.pendingItems.map((item: string, i: number) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Agenda Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-green-600" />
            智能议程生成
          </CardTitle>
          <CardDescription>基于主题、参与者和时长自动设计最佳会议议程</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end flex-wrap mb-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-1 block">会议主题</label>
              <Input placeholder="例：Q1产品路线图评审" value={agendaTopic} onChange={(e) => setAgendaTopic(e.target.value)} />
            </div>
            <div className="w-48">
              <label className="text-sm text-muted-foreground mb-1 block">参与者 (逗号分隔)</label>
              <Input placeholder="张三, 李四" value={agendaParticipants} onChange={(e) => setAgendaParticipants(e.target.value)} />
            </div>
            <div className="w-24">
              <label className="text-sm text-muted-foreground mb-1 block">时长(分)</label>
              <Input type="number" value={agendaDuration} onChange={(e) => setAgendaDuration(e.target.value)} />
            </div>
            <Button
              onClick={() => agendaMutation.mutate({
                topic: agendaTopic,
                participants: agendaParticipants ? agendaParticipants.split(",").map(s => s.trim()) : undefined,
                durationMinutes: Number(agendaDuration) || 60,
              })}
              disabled={!agendaTopic.trim() || agendaMutation.isPending}
            >
              {agendaMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ListChecks className="h-4 w-4 mr-2" />}
              生成议程
            </Button>
          </div>
          {agendaMutation.isError && <p className="text-sm text-destructive">{agendaMutation.error.message}</p>}
          {agendaMutation.isSuccess && (
            <div className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>议题</TableHead>
                    <TableHead className="w-20">时长</TableHead>
                    <TableHead>说明</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agendaMutation.data.agendaItems.map((item: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>{item.duration_minutes}分</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.description || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {agendaMutation.data.tips && (
                <p className="text-sm text-muted-foreground italic">{agendaMutation.data.tips}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Meeting Minutes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            智能会议纪要
          </CardTitle>
          <CardDescription>基于会议内容自动生成结构化会议纪要，含议程、决策、行动项和后续步骤</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end mb-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">会议ID</label>
              <Input placeholder="输入会议ID..." value={minutesMeetingId} onChange={(e) => setMinutesMeetingId(e.target.value)} />
            </div>
            <Button onClick={() => minutesMutation.mutate({ meetingId: minutesMeetingId })} disabled={!minutesMeetingId.trim() || minutesMutation.isPending}>
              {minutesMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              生成纪要
            </Button>
          </div>
          {minutesMutation.isError && <p className="text-sm text-destructive">{minutesMutation.error.message}</p>}
          {minutesMutation.isSuccess && (
            <div className="space-y-4 border rounded-lg p-4">
              {minutesMutation.data.agendaItems.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">议程讨论:</p>
                  {minutesMutation.data.agendaItems.map((item: any, i: number) => (
                    <div key={i} className="mb-2 pl-3 border-l-2 border-purple-300">
                      <p className="text-sm font-medium">{item.topic}</p>
                      {item.discussion && <p className="text-sm text-muted-foreground">{item.discussion}</p>}
                      {item.outcome && <p className="text-sm"><Badge variant="outline" className="mr-1">结论</Badge>{item.outcome}</p>}
                    </div>
                  ))}
                </div>
              )}
              {minutesMutation.data.decisions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">决策记录:</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    {minutesMutation.data.decisions.map((d: string, i: number) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              )}
              {minutesMutation.data.actionItems.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">行动项:</p>
                  <Table>
                    <TableHeader><TableRow><TableHead>事项</TableHead><TableHead>负责人</TableHead><TableHead>截止</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {minutesMutation.data.actionItems.map((a: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{a.item}</TableCell>
                          <TableCell className="text-sm">{a.owner || "—"}</TableCell>
                          <TableCell className="text-sm">{a.due || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {minutesMutation.data.nextSteps.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">后续步骤:</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    {minutesMutation.data.nextSteps.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Follow-Up Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-orange-600" />
            会后跟进计划
          </CardTitle>
          <CardDescription>基于会议结果生成详细的后续行动计划，包括即时行动、后续会议和沟通方案</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end mb-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">会议ID</label>
              <Input placeholder="输入会议ID..." value={followUpMeetingId} onChange={(e) => setFollowUpMeetingId(e.target.value)} />
            </div>
            <Button onClick={() => followUpMutation.mutate({ meetingId: followUpMeetingId })} disabled={!followUpMeetingId.trim() || followUpMutation.isPending}>
              {followUpMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarCheck className="h-4 w-4 mr-2" />}
              生成跟进计划
            </Button>
          </div>
          {followUpMutation.isError && <p className="text-sm text-destructive">{followUpMutation.error.message}</p>}
          {followUpMutation.isSuccess && (
            <div className="space-y-3 border rounded-lg p-4">
              {followUpMutation.data.immediateActions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-700 mb-1">即时行动:</p>
                  <Table>
                    <TableHeader><TableRow><TableHead>行动</TableHead><TableHead>负责人</TableHead><TableHead>截止</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {followUpMutation.data.immediateActions.map((a: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{a.action}</TableCell>
                          <TableCell className="text-sm">{a.owner || "—"}</TableCell>
                          <TableCell className="text-sm">{a.deadline || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {followUpMutation.data.followUpMeetings.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">建议后续会议:</p>
                  <ul className="text-sm space-y-1">
                    {followUpMutation.data.followUpMeetings.map((m: any, i: number) => (
                      <li key={i}>
                        <Badge variant="outline" className="mr-1">{m.suggested_date || "待定"}</Badge>
                        {m.topic} {m.participants ? `(${m.participants})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {followUpMutation.data.communicationPlan.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">沟通方案:</p>
                  <ul className="text-sm space-y-1">
                    {followUpMutation.data.communicationPlan.map((c: any, i: number) => (
                      <li key={i}><span className="font-medium">{c.audience}:</span> {c.message} {c.channel ? `(${c.channel})` : ""}</li>
                    ))}
                  </ul>
                </div>
              )}
              {followUpMutation.data.narrative && (
                <p className="text-sm text-muted-foreground italic">{followUpMutation.data.narrative}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Chat Q&A */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-teal-600" />
            会议智能问答
          </CardTitle>
          <CardDescription>与AI助手对话，查询会议数据、决策历史、行动项状态等</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg h-80 flex flex-col">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <Bot className="h-8 w-8 mx-auto mb-2 text-teal-400" />
                  <p>你好！我是GRT会议智能助手。</p>
                  <p className="text-xs mt-1">你可以问我关于会议数据、决策历史、行动项等问题。</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && <Bot className="h-5 w-5 text-teal-500 mt-1 shrink-0" />}
                  <div className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}>
                    {msg.content}
                  </div>
                  {msg.role === "user" && <User className="h-5 w-5 text-gray-400 mt-1 shrink-0" />}
                </div>
              ))}
              {askMutation.isPending && (
                <div className="flex gap-2 justify-start">
                  <Bot className="h-5 w-5 text-teal-500 mt-1" />
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-1" />思考中...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t p-2 flex gap-2">
              <Input
                placeholder="输入你的问题..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                className="flex-1"
              />
              <Button size="sm" onClick={handleSendChat} disabled={!chatInput.trim() || askMutation.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
