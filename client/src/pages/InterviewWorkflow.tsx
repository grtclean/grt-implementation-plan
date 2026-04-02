/**
 * 面试全流程工作台 (Interview Workflow)
 *
 * 5-Tab:
 *  ① 候选人管道 — Kanban式阶段视图 (new→screening→interviewing→offer→hired)
 *  ② 面试安排   — 创建面试·选面试官·选类型(电话/视频/现场)
 *  ③ 面试评分   — 填写评分·推荐·风险·关键词·后续行动
 *  ④ 资料查阅   — 候选人简历·历次面试记录·评分趋势
 *  ⑤ 数据分析   — 面试通过率·平均分·阶段转化漏斗
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Users, UserPlus, ClipboardList, Star, FileText,
  BarChart3, ChevronRight, CheckCircle2, Clock, Phone,
  Video, MapPin, AlertTriangle, ThumbsUp, ThumbsDown,
  Minus, Send, Search, Eye, Calendar, Target,
  TrendingUp, Award, MessageSquare, Brain, Sparkles,
} from "lucide-react";

const STAGE_CONFIG: Record<string, { labelZh: string; labelEn: string; color: string; bgColor: string }> = {
  new: { labelZh: "新简历", labelEn: "New", color: "#6366f1", bgColor: "#e0e7ff" },
  screening: { labelZh: "筛选中", labelEn: "Screening", color: "#0891b2", bgColor: "#cffafe" },
  interviewing: { labelZh: "面试中", labelEn: "Interviewing", color: "#ea580c", bgColor: "#ffedd5" },
  offer: { labelZh: "待Offer", labelEn: "Offer", color: "#16a34a", bgColor: "#dcfce7" },
  hired: { labelZh: "已录用", labelEn: "Hired", color: "#059669", bgColor: "#d1fae5" },
  rejected: { labelZh: "已拒绝", labelEn: "Rejected", color: "#dc2626", bgColor: "#fee2e2" },
  withdrawn: { labelZh: "已撤回", labelEn: "Withdrawn", color: "#6b7280", bgColor: "#f3f4f6" },
};

const INTERVIEW_TYPE_ICONS: Record<string, typeof Phone> = {
  phone: Phone,
  video: Video,
  onsite: MapPin,
};

export default function InterviewWorkflow() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [activeTab, setActiveTab] = useState("pipeline");

  // 面试统计
  const statsQ = trpc.hrLifecycle.interviews.stats.useQuery(undefined, { retry: false });
  const stats = statsQ.data as any;
  const dashQ = trpc.hrLifecycle.dashboard.getHRDashboardStats.useQuery(undefined, { retry: false });
  const dash = dashQ.data as any;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isZh ? "面试工作台" : "Interview Workflow"}</h1>
          <p className="text-sm text-muted-foreground">{isZh ? "候选人管道 · 面试安排 · 评分记录 · 资料查阅 · 数据分析" : "Pipeline · Schedule · Evaluate · Review · Analytics"}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <StatPill icon={<Users className="w-3.5 h-3.5" />} label={isZh ? "候选人" : "Candidates"} value={dash?.totalCandidates ?? "—"} />
          <StatPill icon={<ClipboardList className="w-3.5 h-3.5" />} label={isZh ? "面试" : "Interviews"} value={stats?.total ?? "—"} color="blue" />
          <StatPill icon={<ThumbsUp className="w-3.5 h-3.5" />} label={isZh ? "录用" : "Hired"} value={stats?.hired ?? "—"} color="green" />
          <StatPill icon={<Star className="w-3.5 h-3.5" />} label={isZh ? "均分" : "Avg"} value={stats?.avgScore ? Number(stats.avgScore).toFixed(0) : "—"} color="amber" />
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="pipeline" className="gap-1.5"><Users className="w-4 h-4" />{isZh ? "候选人管道" : "Pipeline"}</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5"><Calendar className="w-4 h-4" />{isZh ? "面试安排" : "Schedule"}</TabsTrigger>
          <TabsTrigger value="evaluate" className="gap-1.5"><Star className="w-4 h-4" />{isZh ? "面试评分" : "Evaluate"}</TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5"><Eye className="w-4 h-4" />{isZh ? "资料查阅" : "Review"}</TabsTrigger>
          <TabsTrigger value="online" className="gap-1.5"><Video className="w-4 h-4" />{isZh ? "在线面试结果" : "Online Results"}</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="w-4 h-4" />{isZh ? "数据分析" : "Analytics"}</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline"><PipelineTab /></TabsContent>
        <TabsContent value="schedule"><ScheduleTab /></TabsContent>
        <TabsContent value="evaluate"><EvaluateTab /></TabsContent>
        <TabsContent value="review"><ReviewTab /></TabsContent>
        <TabsContent value="online"><OnlineResultsTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════
// Tab ①: 候选人管道 (Kanban)
// ═══════════════════════════════════════
function PipelineTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";
  const utils = trpc.useUtils();

  const activeStages = ["new", "screening", "interviewing", "offer", "hired"];
  const queries = Object.fromEntries(
    activeStages.map((s) => [s, trpc.hrLifecycle.candidates.list.useQuery({ status: s, pageSize: 20 }, { retry: false })])
  );

  const advanceMut = trpc.hrLifecycle.candidates.advanceStage.useMutation({
    onSuccess: () => { toast({ title: isZh ? "已推进" : "Advanced" }); utils.hrLifecycle.candidates.list.invalidate(); },
  });

  const nextStage: Record<string, string> = { new: "screening", screening: "interviewing", interviewing: "offer", offer: "hired" };

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="flex gap-3 min-w-[900px]">
        {activeStages.map((stage) => {
          const cfg = STAGE_CONFIG[stage];
          const candidates = (queries[stage]?.data as any[]) || [];
          return (
            <div key={stage} className="flex-1 min-w-[180px]">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold" style={{ color: cfg.color }}>{isZh ? cfg.labelZh : cfg.labelEn}</span>
                <Badge variant="outline" className="text-[10px]">{candidates.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[200px] p-2 rounded-lg" style={{ backgroundColor: cfg.bgColor + "40" }}>
                {candidates.map((c: any) => (
                  <Card key={c.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <p className="font-semibold text-sm truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.positionName || "—"}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        {c.education && <span>{c.education}</span>}
                        {c.workYears && <span>· {c.workYears}{isZh ? "年" : "yr"}</span>}
                      </div>
                      {nextStage[stage] && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full mt-2 text-[10px] h-7"
                          onClick={() => advanceMut.mutate({ id: c.id, newStatus: nextStage[stage] })}
                        >
                          → {isZh ? STAGE_CONFIG[nextStage[stage]].labelZh : STAGE_CONFIG[nextStage[stage]].labelEn}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {candidates.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-4">{isZh ? "空" : "Empty"}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Tab ②: 面试安排
// ═══════════════════════════════════════
function ScheduleTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";
  const utils = trpc.useUtils();

  const [candidateId, setCandidateId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [interviewType, setInterviewType] = useState("video");
  const [round, setRound] = useState("1");
  const [interviewerId, setInterviewerId] = useState("");
  const [questions, setQuestions] = useState("");

  const createMut = trpc.hrLifecycle.interviews.create.useMutation({
    onSuccess: () => {
      toast({ title: isZh ? "面试已安排" : "Interview Scheduled" });
      setCandidateId(""); setQuestions("");
      utils.hrLifecycle.interviews.list.invalidate();
    },
    onError: (err) => toast({ title: isZh ? "安排失败" : "Failed", description: err.message, variant: "destructive" }),
  });

  // 最近面试列表
  const recentQ = trpc.hrLifecycle.interviews.list.useQuery({ limit: 10 }, { retry: false });
  const recent = (recentQ.data as any[]) || [];

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 创建面试 */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4" />{isZh ? "安排面试" : "Schedule Interview"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">{isZh ? "候选人ID *" : "Candidate ID *"}</label>
              <Input type="number" value={candidateId} onChange={(e) => setCandidateId(e.target.value)} placeholder="ID" />
            </div>
            <div>
              <label className="text-xs font-medium">{isZh ? "岗位ID" : "Position ID"}</label>
              <Input type="number" value={positionId} onChange={(e) => setPositionId(e.target.value)} placeholder="ID" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">{isZh ? "面试类型" : "Type"}</label>
              <div className="flex gap-2 mt-1">
                {(["phone", "video", "onsite"] as const).map((t) => {
                  const Icon = INTERVIEW_TYPE_ICONS[t];
                  return (
                    <Button key={t} size="sm" variant={interviewType === t ? "default" : "outline"} onClick={() => setInterviewType(t)} className="gap-1">
                      <Icon className="w-3.5 h-3.5" />{t === "phone" ? (isZh ? "电话" : "Phone") : t === "video" ? (isZh ? "视频" : "Video") : (isZh ? "现场" : "Onsite")}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">{isZh ? "轮次" : "Round"}</label>
              <Input type="number" value={round} onChange={(e) => setRound(e.target.value)} min="1" max="5" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">{isZh ? "面试官ID" : "Interviewer ID"}</label>
            <Input type="number" value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)} placeholder={isZh ? "留空=自己" : "Blank=self"} />
          </div>
          <div>
            <label className="text-xs font-medium">{isZh ? "面试题目/策略" : "Questions/Strategy"}</label>
            <Textarea value={questions} onChange={(e) => setQuestions(e.target.value)} placeholder={isZh ? "面试重点问题..." : "Key questions..."} rows={3} />
          </div>
          <Button
            className="w-full"
            onClick={() => candidateId && createMut.mutate({
              candidateId: Number(candidateId),
              positionId: positionId ? Number(positionId) : undefined,
              interviewType,
              round: Number(round),
              interviewerId: interviewerId ? Number(interviewerId) : undefined,
              interviewQuestions: questions || undefined,
            })}
            disabled={!candidateId || createMut.isPending}
          >
            <Send className="w-4 h-4 mr-1" />{isZh ? "确认安排" : "Confirm Schedule"}
          </Button>
        </CardContent>
      </Card>

      {/* 最近面试 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{isZh ? "最近面试" : "Recent Interviews"}</h3>
        {recent.map((r: any) => {
          const TypeIcon = INTERVIEW_TYPE_ICONS[r.interviewType] || Video;
          return (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <TypeIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">#{r.candidateId} · {isZh ? "第" : "R"}{r.round}{isZh ? "轮" : ""}</p>
                  <p className="text-[10px] text-muted-foreground">{r.interviewedAt ? new Date(r.interviewedAt).toLocaleString() : "—"}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {r.overallScore != null && <span className="font-mono font-bold text-sm">{r.overallScore}</span>}
                  <RecommendationBadge rec={r.recommendation} isZh={language === "zh"} />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {recent.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{isZh ? "暂无面试记录" : "No interviews yet"}</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Tab ③: 面试评分
// ═══════════════════════════════════════
function EvaluateTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";
  const utils = trpc.useUtils();

  const [interviewId, setInterviewId] = useState("");
  const [score, setScore] = useState("");
  const [recommendation, setRecommendation] = useState("pending");
  const [transcript, setTranscript] = useState("");
  const [riskAssessment, setRiskAssessment] = useState("");
  const [followUp, setFollowUp] = useState("");

  const evalMut = trpc.hrLifecycle.interviews.evaluate.useMutation({
    onSuccess: () => {
      toast({ title: isZh ? "评分已保存" : "Evaluation Saved" });
      setInterviewId(""); setScore(""); setTranscript(""); setRiskAssessment(""); setFollowUp("");
      utils.hrLifecycle.interviews.invalidate();
    },
  });

  // 待评分面试
  const pendingQ = trpc.hrLifecycle.interviews.list.useQuery({ recommendation: "pending", limit: 20 }, { retry: false });
  const pending = (pendingQ.data as any[]) || [];

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 待评分列表 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          {isZh ? "待评分面试" : "Pending Evaluation"} ({pending.length})
        </h3>
        {pending.map((r: any) => (
          <button
            key={r.id}
            onClick={() => setInterviewId(String(r.id))}
            className={`w-full text-left p-3 rounded-lg border transition-colors touch-feedback ${interviewId === String(r.id) ? "border-primary bg-primary/5" : "hover:border-primary/30"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{isZh ? "面试" : "Interview"} #{r.id} · {isZh ? "候选人" : "Candidate"} #{r.candidateId}</p>
                <p className="text-[10px] text-muted-foreground">{r.interviewType} · {isZh ? "第" : "R"}{r.round}{isZh ? "轮" : ""}</p>
              </div>
              <Badge variant="outline" className="text-[10px] text-amber-600">{isZh ? "待评" : "Pending"}</Badge>
            </div>
          </button>
        ))}
        {pending.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{isZh ? "全部已评分" : "All evaluated"}</p>}
      </div>

      {/* 评分表单 */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />{isZh ? "填写评分" : "Evaluation Form"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">{isZh ? "面试ID" : "Interview ID"}</label>
              <Input value={interviewId} onChange={(e) => setInterviewId(e.target.value)} placeholder="ID" />
            </div>
            <div>
              <label className="text-xs font-medium">{isZh ? "综合评分 (0-100)" : "Score (0-100)"}</label>
              <Input type="number" min="0" max="100" value={score} onChange={(e) => setScore(e.target.value)} placeholder="85" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">{isZh ? "推荐结果" : "Recommendation"}</label>
            <div className="flex gap-2 mt-1">
              {[
                { v: "hire", labelZh: "录用", labelEn: "Hire", icon: ThumbsUp, color: "text-green-600" },
                { v: "pending", labelZh: "待定", labelEn: "Pending", icon: Minus, color: "text-amber-600" },
                { v: "reject", labelZh: "拒绝", labelEn: "Reject", icon: ThumbsDown, color: "text-red-600" },
              ].map((opt) => (
                <Button key={opt.v} size="sm" variant={recommendation === opt.v ? "default" : "outline"} onClick={() => setRecommendation(opt.v)} className="gap-1">
                  <opt.icon className={`w-3.5 h-3.5 ${recommendation !== opt.v ? opt.color : ""}`} />{isZh ? opt.labelZh : opt.labelEn}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">{isZh ? "面试记录/笔录" : "Transcript/Notes"}</label>
            <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder={isZh ? "关键回答记录..." : "Key responses..."} rows={3} />
          </div>
          <div>
            <label className="text-xs font-medium">{isZh ? "风险评估" : "Risk Assessment"}</label>
            <Textarea value={riskAssessment} onChange={(e) => setRiskAssessment(e.target.value)} placeholder={isZh ? "稳定性/文化适配/技能缺口..." : "Stability/culture fit/skill gaps..."} rows={2} />
          </div>
          <div>
            <label className="text-xs font-medium">{isZh ? "后续行动" : "Follow-up Actions"}</label>
            <Input value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder={isZh ? "如: 安排第二轮技术面" : "e.g. Schedule 2nd tech round"} />
          </div>
          <Button
            className="w-full"
            onClick={() => interviewId && score && evalMut.mutate({
              id: Number(interviewId),
              overallScore: Number(score),
              recommendation,
              transcript: transcript || undefined,
              riskAssessment: riskAssessment || undefined,
              followUpActions: followUp || undefined,
            })}
            disabled={!interviewId || !score || evalMut.isPending}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />{isZh ? "保存评分" : "Save Evaluation"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════
// Tab ④: 资料查阅
// ═══════════════════════════════════════
function ReviewTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [candidateId, setCandidateId] = useState<number | null>(null);

  const candidateQ = trpc.hrLifecycle.candidates.getById.useQuery(
    { id: candidateId! },
    { enabled: !!candidateId, retry: false },
  );
  const candidate = candidateQ.data as any;

  const interviewsQ = trpc.hrLifecycle.interviews.list.useQuery(
    { candidateId: candidateId!, limit: 10 },
    { enabled: !!candidateId, retry: false },
  );
  const interviews = (interviewsQ.data as any[]) || [];

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">{isZh ? "候选人ID" : "Candidate ID"}:</label>
        <Input type="number" className="w-32" placeholder="ID" onChange={(e) => setCandidateId(e.target.value ? Number(e.target.value) : null)} />
      </div>

      {candidate && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 候选人档案 */}
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-base">{isZh ? "候选人档案" : "Candidate Profile"}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ProfileField label={isZh ? "姓名" : "Name"} value={candidate.name} />
              <ProfileField label={isZh ? "应聘岗位" : "Position"} value={candidate.positionName} />
              <ProfileField label={isZh ? "学历" : "Education"} value={candidate.education} />
              <ProfileField label={isZh ? "工作年限" : "Experience"} value={candidate.workYears ? `${candidate.workYears}${isZh ? "年" : " years"}` : "—"} />
              <ProfileField label={isZh ? "期望薪资" : "Expected"} value={candidate.expectedSalary ? `¥${Number(candidate.expectedSalary).toLocaleString()}` : "—"} />
              <ProfileField label={isZh ? "来源" : "Source"} value={candidate.source} />
              <ProfileField label={isZh ? "状态" : "Status"} value={candidate.status} />
              {candidate.resumeUrl && (
                <div className="pt-2">
                  <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs flex items-center gap-1 hover:underline">
                    <FileText className="w-3.5 h-3.5" />{isZh ? "查看简历" : "View Resume"}
                  </a>
                </div>
              )}
              {candidate.resumeAnalysis && (
                <div className="mt-2 p-2 rounded bg-purple-50 dark:bg-purple-950/20 border border-purple-200 text-xs">
                  <Brain className="w-3.5 h-3.5 inline text-purple-600 mr-1" />
                  <strong>{isZh ? "AI简历分析：" : "AI Analysis: "}</strong>{candidate.resumeAnalysis}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 面试历史 */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">{isZh ? "面试记录" : "Interview History"} ({interviews.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {interviews.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">{isZh ? "暂无面试记录" : "No interviews"}</p>}
              {interviews.map((iv: any) => (
                <div key={iv.id} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{isZh ? "第" : "R"}{iv.round}{isZh ? "轮" : ""} · {iv.interviewType}</Badge>
                      <span className="text-xs text-muted-foreground">{iv.interviewedAt ? new Date(iv.interviewedAt).toLocaleString() : "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {iv.overallScore != null && <span className="font-mono font-bold">{iv.overallScore}</span>}
                      <RecommendationBadge rec={iv.recommendation} isZh={isZh} />
                    </div>
                  </div>
                  {iv.transcript && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{iv.transcript}</p>}
                  {iv.riskAssessment && <p className="text-xs text-red-600 mt-1"><AlertTriangle className="w-3 h-3 inline mr-0.5" />{iv.riskAssessment}</p>}
                  {iv.followUpActions && <p className="text-xs text-blue-600 mt-1"><ChevronRight className="w-3 h-3 inline" />{iv.followUpActions}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// Tab ⑤: 数据分析
// ═══════════════════════════════════════
function AnalyticsTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const dashQ = trpc.hrLifecycle.dashboard.getHRDashboardStats.useQuery(undefined, { retry: false });
  const dash = dashQ.data as any;
  const statsQ = trpc.hrLifecycle.interviews.stats.useQuery(undefined, { retry: false });
  const stats = statsQ.data as any;

  const stages = dash?.candidatesByStage || {};
  const total = dash?.totalCandidates || 0;

  return (
    <div className="mt-4 space-y-6">
      {/* 招聘漏斗 */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />{isZh ? "招聘漏斗" : "Recruitment Funnel"}</CardTitle></CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{isZh ? "暂无数据" : "No data"}</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(STAGE_CONFIG).filter(([k]) => stages[k] > 0).map(([stage, cfg]) => {
                const val = stages[stage] || 0;
                const pct = total > 0 ? (val / total) * 100 : 0;
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="text-xs w-20 text-right" style={{ color: cfg.color }}>{isZh ? cfg.labelZh : cfg.labelEn}</span>
                    <div className="flex-1 h-6 rounded bg-muted overflow-hidden">
                      <div className="h-full rounded transition-all" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                    </div>
                    <span className="text-xs font-mono w-12 text-right">{val} ({pct.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 面试统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnalyticCard label={isZh ? "总面试" : "Total"} value={stats?.total ?? 0} icon={<ClipboardList className="w-5 h-5" />} color="blue" />
        <AnalyticCard label={isZh ? "推荐录用" : "Hire"} value={stats?.hired ?? 0} icon={<ThumbsUp className="w-5 h-5" />} color="green" />
        <AnalyticCard label={isZh ? "推荐拒绝" : "Reject"} value={stats?.rejected ?? 0} icon={<ThumbsDown className="w-5 h-5" />} color="red" />
        <AnalyticCard label={isZh ? "平均评分" : "Avg Score"} value={stats?.avgScore ? Number(stats.avgScore).toFixed(0) : "—"} icon={<Star className="w-5 h-5" />} color="amber" />
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{isZh ? "在招岗位" : "Open Positions"}</p>
            <p className="text-2xl font-bold text-blue-600">{dash?.openPositions ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{isZh ? "入职培训中" : "Onboarding"}</p>
            <p className="text-2xl font-bold text-green-600">{dash?.activeOnboardingPlans ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{isZh ? "试用期中" : "Probation"}</p>
            <p className="text-2xl font-bold text-amber-600">{dash?.pendingProbationReviews ?? 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// 通用组件
// ═══════════════════════════════════════
function RecommendationBadge({ rec, isZh }: { rec: string; isZh: boolean }) {
  if (rec === "hire") return <Badge className="bg-green-100 text-green-800 text-[10px]">{isZh ? "录用" : "Hire"}</Badge>;
  if (rec === "reject") return <Badge variant="destructive" className="text-[10px]">{isZh ? "拒绝" : "Reject"}</Badge>;
  return <Badge variant="outline" className="text-[10px] text-amber-600">{isZh ? "待定" : "Pending"}</Badge>;
}

function ProfileField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-xs">{value || "—"}</span>
    </div>
  );
}

function StatPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  const cm: Record<string, string> = { blue: "border-blue-200 bg-blue-50", green: "border-green-200 bg-green-50", amber: "border-amber-200 bg-amber-50" };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${color ? cm[color] || "" : "border-border"}`}>
      {icon}<span className="text-muted-foreground">{label}</span><span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════
// Tab: 在线面试结果
// ═══════════════════════════════════════
function OnlineResultsTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [, navigate] = useLocation();

  // 拉取所有在线面试记录（round=0标识在线面试）
  const recordsQ = trpc.hrLifecycle.interviews.list.useQuery({ limit: 30 }, { retry: false });
  const allRecords = (recordsQ.data as any[]) || [];
  const onlineRecords = allRecords.filter((r: any) => r.round === 0 || r.recordCode?.startsWith?.("ONLINE-"));

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Video className="w-4 h-4 text-blue-600" />
          {isZh ? "在线面试AI评估结果" : "Online Interview AI Results"} ({onlineRecords.length})
        </h3>
        <Button size="sm" variant="outline" onClick={() => window.open("/online-interview", "_blank")}>
          {isZh ? "打开在线面试页" : "Open Interview Page"}
        </Button>
      </div>

      {onlineRecords.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Video className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{isZh ? "暂无在线面试记录" : "No online interview records yet"}</p>
            <p className="text-xs mt-1">{isZh ? "候选人通过 /join 或 /online-interview 提交后会显示在此" : "Records appear after candidates submit via /join or /online-interview"}</p>
          </CardContent>
        </Card>
      )}

      {onlineRecords.map((r: any) => {
        const score = r.overallScore ?? r.overall_score ?? 0;
        const rec = r.recommendation;
        const recLabel = rec === "hire" ? (isZh ? "建议面试" : "Recommend") : rec === "pending" ? (isZh ? "待考虑" : "Consider") : (isZh ? "暂不推荐" : "Not Yet");
        const recColor = rec === "hire" ? "bg-green-100 text-green-700" : rec === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
        const date = r.interviewedAt || r.interviewed_at || r.createdAt || r.created_at;

        // 解析面试详情
        let transcript: any[] = [];
        try { transcript = typeof r.transcript === "string" ? JSON.parse(r.transcript) : r.transcript || []; } catch {}
        const followUp = r.followUpActions || r.follow_up_actions || "";

        return (
          <Card key={r.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{r.recordCode || r.record_code || `#${r.id}`}</span>
                  <Badge className={`text-[10px] ${recColor}`}>{recLabel}</Badge>
                  <span className="text-xs text-muted-foreground">{isZh ? "候选人" : "Candidate"} #{r.candidateId || r.candidate_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-bold ${score >= 75 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600"}`}>{score}</span>
                  <span className="text-xs text-muted-foreground">{date ? new Date(date).toLocaleString() : "—"}</span>
                </div>
              </div>

              {/* AI建议 */}
              {followUp && (
                <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 text-xs mb-2">
                  <Sparkles className="w-3 h-3 inline text-blue-600 mr-1" />
                  <strong>{isZh ? "AI建议：" : "AI: "}</strong>{followUp}
                </div>
              )}

              {/* 各题得分明细 */}
              {Array.isArray(transcript) && transcript.length > 0 && (
                <div className="space-y-1 mt-2">
                  {transcript.slice(0, 5).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`font-mono font-bold w-8 ${(item.score ?? 0) >= 70 ? "text-green-600" : (item.score ?? 0) >= 40 ? "text-amber-600" : "text-red-600"}`}>{item.score ?? "—"}</span>
                      <span className="text-muted-foreground truncate flex-1">{item.question || item.questionId}</span>
                      <span className="text-muted-foreground truncate max-w-[200px]">{item.feedback}</span>
                    </div>
                  ))}
                  {transcript.length > 5 && <span className="text-[10px] text-muted-foreground">+{transcript.length - 5} more</span>}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => navigate("/interview-workflow")}>
                  {isZh ? "安排正式面试" : "Schedule Interview"}
                </Button>
                <Button size="sm" variant="ghost">{isZh ? "生成面试官报告" : "Interviewer Brief"}</Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AnalyticCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  const cm: Record<string, string> = { blue: "text-blue-600", green: "text-green-600", red: "text-red-600", amber: "text-amber-600" };
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className={`mx-auto mb-2 ${cm[color]}`}>{icon}</div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
