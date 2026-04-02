/**
 * 在线面试 — 候选人自助答题+AI评估+预约面试
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Video, Send, CheckCircle2, Clock, Star, User,
  ChevronRight, AlertTriangle, Sparkles, Calendar,
} from "lucide-react";

const ROLE_FAMILIES = [
  { id: "sales", labelZh: "销售/市场", labelEn: "Sales/Marketing" },
  { id: "engineer", labelZh: "机械/电气工程师", labelEn: "Engineering" },
  { id: "production", labelZh: "生产/制造", labelEn: "Production" },
  { id: "finance", labelZh: "财务/采购/供应链", labelEn: "Finance/SCM" },
  { id: "service", labelZh: "售后服务", labelEn: "After-Sales" },
  { id: "general", labelZh: "其他岗位", labelEn: "Other" },
];

type Step = "info" | "questions" | "result";

export default function OnlineInterview() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("info");

  // Step 1: 基本信息
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [position, setPosition] = useState("");
  const [prefDate, setPrefDate] = useState("");
  const [prefTime, setPrefTime] = useState("");

  // Step 2: 答题
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Step 3: 结果
  const [result, setResult] = useState<any>(null);

  const questionsQ = trpc.onlineInterview.getQuestions.useQuery(
    { roleFamily: role },
    { enabled: !!role && step === "questions", retry: false },
  );
  const questions = (questionsQ.data as any[]) || [];

  const slotsQ = trpc.onlineInterview.getAvailableSlots.useQuery(undefined, { retry: false });
  const slots = (slotsQ.data as any[]) || [];

  const submitMut = trpc.onlineInterview.submitAnswers.useMutation({
    onSuccess: (data) => { setResult(data); setStep("result"); },
    onError: (err) => toast({ title: "提交失败", description: err.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    const answerList = Object.entries(answers).map(([qId, ans]) => ({ questionId: qId, answer: ans }));
    submitMut.mutate({ candidateName: name, roleFamily: role, targetPosition: position, answers: answerList, preferredDate: prefDate || undefined, preferredTime: prefTime || undefined });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-950 dark:to-slate-900 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
            <Video className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold">{isZh ? "GRT 在线面试" : "GRT Online Interview"}</h1>
          <p className="text-sm text-muted-foreground">{isZh ? "AI辅助评估 · 智能题库 · 自动安排面试" : "AI Assessment · Smart Questions · Auto Scheduling"}</p>
        </div>

        {/* Step 1: 基本信息 */}
        {step === "info" && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" />{isZh ? "基本信息" : "Your Info"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="text-xs font-medium">{isZh ? "姓名 *" : "Name *"}</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isZh ? "请输入真实姓名" : "Full name"} /></div>
              <div>
                <label className="text-xs font-medium">{isZh ? "应聘岗位族 *" : "Role Family *"}</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                  {ROLE_FAMILIES.map(rf => (
                    <button key={rf.id} onClick={() => setRole(rf.id)} className={`p-3 rounded-lg border text-sm text-left transition-colors ${role === rf.id ? "border-primary bg-primary/5 font-semibold" : "hover:border-primary/30"}`}>
                      {isZh ? rf.labelZh : rf.labelEn}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="text-xs font-medium">{isZh ? "目标岗位" : "Target Position"}</label><Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder={isZh ? "如: 机械研发工程师" : "e.g. Mechanical Engineer"} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium">{isZh ? "期望面试日期" : "Preferred Date"}</label><Input type="date" value={prefDate} onChange={(e) => setPrefDate(e.target.value)} /></div>
                <div>
                  <label className="text-xs font-medium">{isZh ? "时间段" : "Time Slot"}</label>
                  <select className="w-full h-10 border rounded px-2 text-sm" value={prefTime} onChange={(e) => setPrefTime(e.target.value)}>
                    <option value="">{isZh ? "请选择" : "Select"}</option>
                    <option value="09:30">09:30</option><option value="10:30">10:30</option>
                    <option value="14:00">14:00</option><option value="15:00">15:00</option><option value="16:00">16:00</option>
                  </select>
                </div>
              </div>
              <Button className="w-full" onClick={() => setStep("questions")} disabled={!name || !role}>
                {isZh ? "开始答题" : "Start Interview"} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: 答题 */}
        {step === "questions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{name} · {ROLE_FAMILIES.find(r => r.id === role)?.[isZh ? "labelZh" : "labelEn"]}</Badge>
              <Badge>{isZh ? `${questions.length}题` : `${questions.length} Q's`}</Badge>
            </div>

            {questions.map((q: any, i: number) => (
              <Card key={q.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-primary">Q{i + 1}</span>
                    <Badge variant="outline" className="text-[10px]">{q.category}</Badge>
                    <Badge className={`text-[10px] ${q.difficulty === "basic" ? "bg-green-100 text-green-700" : q.difficulty === "intermediate" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>{q.difficulty}</Badge>
                  </div>
                  <p className="text-sm font-medium mb-2">{isZh ? q.question : q.questionEn}</p>
                  {q.type === "choice" && q.options ? (
                    <div className="space-y-1">
                      {q.options.map((opt: string, j: number) => (
                        <button key={j} onClick={() => setAnswers({ ...answers, [q.id]: opt })} className={`w-full text-left p-2 rounded border text-sm ${answers[q.id] === opt ? "border-primary bg-primary/5" : "hover:border-primary/30"}`}>
                          {String.fromCharCode(65 + j)}. {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Textarea value={answers[q.id] || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder={isZh ? "请详细作答..." : "Please answer in detail..."} rows={4} />
                  )}
                </CardContent>
              </Card>
            ))}

            <Button className="w-full" onClick={handleSubmit} disabled={submitMut.isPending || Object.keys(answers).length === 0}>
              <Send className="w-4 h-4 mr-1" />{isZh ? "提交答案 · AI评估" : "Submit · AI Evaluate"}
            </Button>
          </div>
        )}

        {/* Step 3: 结果 */}
        {step === "result" && result && (
          <div className="space-y-4">
            <Card className="border-2 border-primary/20">
              <CardContent className="p-6 text-center">
                <Sparkles className="w-10 h-10 mx-auto text-primary mb-3" />
                <p className="text-sm text-muted-foreground">{isZh ? "AI综合评估" : "AI Assessment"}</p>
                <p className={`text-5xl font-bold mt-2 ${result.compositeScore >= 75 ? "text-green-600" : result.compositeScore >= 50 ? "text-amber-600" : "text-red-600"}`}>{result.compositeScore}</p>
                <Badge className="mt-2" variant={result.recommendation === "recommend" ? "default" : result.recommendation === "consider" ? "secondary" : "destructive"}>
                  {result.recommendation === "recommend" ? (isZh ? "建议面试" : "Recommend") : result.recommendation === "consider" ? (isZh ? "待考虑" : "Consider") : (isZh ? "暂不推荐" : "Not Yet")}
                </Badge>
                <p className="text-sm text-muted-foreground mt-3">{result.suggestedAction}</p>
              </CardContent>
            </Card>

            {/* 各题评分 */}
            <h3 className="text-sm font-semibold">{isZh ? "题目评分明细" : "Question Scores"}</h3>
            {(result.questionResults || []).map((qr: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded border">
                <span className={`text-lg font-bold w-10 text-center ${qr.score >= 70 ? "text-green-600" : qr.score >= 40 ? "text-amber-600" : "text-red-600"}`}>{qr.score}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{qr.question || qr.questionId}</p>
                  <p className="text-[10px] text-muted-foreground">{qr.feedback}</p>
                </div>
              </div>
            ))}

            {result.suggestedInterviewDate && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">{isZh ? "面试已安排" : "Interview Scheduled"}</p>
                    <p className="text-xs text-green-600">{result.suggestedInterviewDate} {result.suggestedInterviewTime}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button variant="outline" className="w-full" onClick={() => { setStep("info"); setAnswers({}); setResult(null); }}>
              {isZh ? "重新开始" : "Start Over"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
