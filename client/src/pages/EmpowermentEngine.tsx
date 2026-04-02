/**
 * 赋能引擎 — 每日必打开的统一工作台
 *
 * 每个员工的"数字战斗力面板"：
 *  ① 今日面板    — 待办/工时/积分/绩效/合规状态 一眼总览
 *  ② 每日计划    — 填写今日任务+重点目标
 *  ③ 工作总结    — 完成量/工时/成就/阻碍/明日计划
 *  ④ 能力雷达    — TSDCKL 6维 + 目标差距 + 成长趋势
 *  ⑤ 改进建议    — AI基于数据的个性化效率提升建议
 *  ⑥ 团队活力    — 积分排行+绩效分布（主管可见）
 */

import { useState } from "react";
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
import { useLocation } from "wouter";
import {
  Zap, Target, Clock, Award, CheckCircle2, FileText,
  Send, TrendingUp, Star, Lightbulb, Users, BarChart3,
  Plus, Trash2, ChevronRight, AlertTriangle, Sparkles,
  Brain, MessageSquare, Crown, Wrench, BookOpen,
} from "lucide-react";

export default function EmpowermentEngine() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [tab, setTab] = useState("today");

  // 今日全景
  const dayQ = trpc.empowermentEngine.daily.getMyDayView.useQuery(undefined, { retry: false, refetchInterval: 60000 });
  const day = dayQ.data as any;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? (isZh ? "早上好" : "Good morning") : hour < 18 ? (isZh ? "下午好" : "Good afternoon") : (isZh ? "晚上好" : "Good evening");

  return (
    <div className="space-y-4 p-4 md:p-6 pb-20">
      {/* 顶部 */}
      <header className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{greeting}，{user?.name || (isZh ? "同事" : "Colleague")}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(isZh ? "zh-CN" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
            {day?.compliance?.planSubmitted && <Badge className="ml-2 bg-green-100 text-green-700 text-[10px]">{isZh ? "已提计划" : "Plan ✓"}</Badge>}
            {day?.compliance?.summarySubmitted && <Badge className="ml-1 bg-blue-100 text-blue-700 text-[10px]">{isZh ? "已提总结" : "Summary ✓"}</Badge>}
          </p>
        </div>
      </header>

      {/* 5维快速仪表 */}
      <div className="grid grid-cols-5 gap-2">
        <MiniGauge icon={<Target className="w-3.5 h-3.5" />} label={isZh ? "待办" : "Tasks"} value={`${day?.todayTasks?.done || 0}/${day?.todayTasks?.total || 0}`} color="blue" />
        <MiniGauge icon={<Clock className="w-3.5 h-3.5" />} label={isZh ? "本周" : "Week"} value={`${(day?.weeklyHours || 0).toFixed(1)}h`} color="green" />
        <MiniGauge icon={<Award className="w-3.5 h-3.5" />} label={isZh ? "积分" : "Points"} value={day?.points?.balance || 0} color="purple" />
        <MiniGauge icon={<Star className="w-3.5 h-3.5" />} label={isZh ? "绩效" : "Perf"} value={day?.perfScore || "—"} color="amber" />
        <MiniGauge icon={<CheckCircle2 className="w-3.5 h-3.5" />} label={isZh ? "质量" : "Quality"} value={`${day?.taskQuality?.avgScore || 0}`} color="cyan" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="today" className="gap-1"><Zap className="w-3.5 h-3.5" />{isZh ? "今日" : "Today"}</TabsTrigger>
          <TabsTrigger value="plan" className="gap-1"><FileText className="w-3.5 h-3.5" />{isZh ? "计划" : "Plan"}</TabsTrigger>
          <TabsTrigger value="summary" className="gap-1"><Send className="w-3.5 h-3.5" />{isZh ? "总结" : "Summary"}</TabsTrigger>
          <TabsTrigger value="radar" className="gap-1"><Brain className="w-3.5 h-3.5" />{isZh ? "能力" : "Capability"}</TabsTrigger>
          <TabsTrigger value="improve" className="gap-1"><Lightbulb className="w-3.5 h-3.5" />{isZh ? "改进" : "Improve"}</TabsTrigger>
          <TabsTrigger value="team" className="gap-1"><Users className="w-3.5 h-3.5" />{isZh ? "团队" : "Team"}</TabsTrigger>
        </TabsList>

        <TabsContent value="today"><TodayPanel day={day} /></TabsContent>
        <TabsContent value="plan"><DailyPlanTab /></TabsContent>
        <TabsContent value="summary"><DailySummaryTab /></TabsContent>
        <TabsContent value="radar"><CapabilityRadar /></TabsContent>
        <TabsContent value="improve"><ImprovementSuggestions /></TabsContent>
        <TabsContent value="team"><TeamVitality /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══ Tab ①: 今日面板 ═══
function TodayPanel({ day }: { day: any }) {
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const isZh = language === "zh";

  const shortcuts = [
    { labelZh: "提交计划", labelEn: "Submit Plan", icon: FileText, color: "#2563eb", bgColor: "#dbeafe", action: () => navigate("/empowerment-engine") },
    { labelZh: "工时录入", labelEn: "Log Hours", icon: Clock, color: "#16a34a", bgColor: "#dcfce7", action: () => navigate("/personal-dashboard") },
    { labelZh: "我的绩效", labelEn: "My Perf", icon: Target, color: "#ea580c", bgColor: "#ffedd5", action: () => navigate("/performance-ops-center") },
    { labelZh: "目标进度", labelEn: "Goals", icon: TrendingUp, color: "#9333ea", bgColor: "#f3e8ff", action: () => navigate("/goal-tracking") },
    { labelZh: "AI顾问", labelEn: "AI Advisor", icon: Sparkles, color: "#0891b2", bgColor: "#cffafe", action: () => navigate("/employee-consultant") },
    { labelZh: "积分中心", labelEn: "Points", icon: Award, color: "#dc2626", bgColor: "#fee2e2", action: () => navigate("/employee-points") },
  ];

  return (
    <div className="mt-4 space-y-4">
      {/* 合规提醒 */}
      {day && !day.compliance?.planSubmitted && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/10">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">{isZh ? "今日计划尚未提交" : "Daily plan not submitted"}</p>
              <p className="text-xs text-amber-600">{isZh ? "9:00前提交可获5积分" : "Submit before 9:00 for 5 points"}</p>
            </div>
            <Button size="sm" variant="outline" className="border-amber-400" onClick={() => navigate("/empowerment-engine")}>
              {isZh ? "去提交" : "Submit"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 快捷入口 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {shortcuts.map((s, i) => (
          <button key={i} onClick={s.action} className="touch-feedback active:scale-[0.96] transition-transform">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex flex-col items-center gap-1.5 min-h-[70px] justify-center">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.bgColor, color: s.color }}>
                  <s.icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-medium">{isZh ? s.labelZh : s.labelEn}</span>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* 任务质量趋势 */}
      {day?.taskQuality?.total > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2">{isZh ? "本月任务质量" : "Monthly Task Quality"}</h3>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{day.taskQuality.total}</p>
                <p className="text-[10px] text-muted-foreground">{isZh ? "完成" : "Done"}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{day.taskQuality.highQuality}</p>
                <p className="text-[10px] text-muted-foreground">{isZh ? "优质" : "Quality"}</p>
              </div>
              <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${day.taskQuality.total > 0 ? (day.taskQuality.highQuality / day.taskQuality.total) * 100 : 0}%` }} />
              </div>
              <span className="font-bold text-sm">{day.taskQuality.avgScore}{isZh ? "分" : ""}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══ Tab ②: 每日计划 ═══
function DailyPlanTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";
  const [tasks, setTasks] = useState([{ title: "", priority: "medium", estimatedHours: 1 }]);
  const [focus, setFocus] = useState("");

  const submitMut = trpc.empowermentEngine.daily.submitDailyPlan.useMutation({
    onSuccess: (d) => { toast({ title: isZh ? `计划已提交 (${d.tasksCount}项)` : `Plan submitted (${d.tasksCount} tasks)` }); },
  });

  return (
    <div className="mt-4 space-y-4 max-w-2xl">
      <div>
        <label className="text-sm font-medium">{isZh ? "今日聚焦目标" : "Today's Focus"}</label>
        <Input className="h-11 mt-1" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder={isZh ? "今天最重要的一件事是..." : "The most important thing today..."} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">{isZh ? "任务清单" : "Task List"}</label>
          <Button size="sm" variant="ghost" onClick={() => setTasks([...tasks, { title: "", priority: "medium", estimatedHours: 1 }])}>
            <Plus className="w-3.5 h-3.5 mr-1" />{isZh ? "添加" : "Add"}
          </Button>
        </div>
        {tasks.map((t, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <Input className="flex-1 h-10" value={t.title} onChange={(e) => { const n = [...tasks]; n[i].title = e.target.value; setTasks(n); }} placeholder={isZh ? `任务 ${i + 1}...` : `Task ${i + 1}...`} />
            <select className="h-10 border rounded px-2 text-sm w-20" value={t.priority} onChange={(e) => { const n = [...tasks]; n[i].priority = e.target.value; setTasks(n); }}>
              <option value="high">{isZh ? "高" : "High"}</option>
              <option value="medium">{isZh ? "中" : "Med"}</option>
              <option value="low">{isZh ? "低" : "Low"}</option>
            </select>
            <Input type="number" className="w-16 h-10" value={t.estimatedHours} onChange={(e) => { const n = [...tasks]; n[i].estimatedHours = Number(e.target.value); setTasks(n); }} min={0.5} step={0.5} />
            {tasks.length > 1 && <Button size="sm" variant="ghost" className="h-10" onClick={() => setTasks(tasks.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>}
          </div>
        ))}
      </div>
      <Button className="w-full" onClick={() => submitMut.mutate({ tasks: tasks.filter(t => t.title), focusGoal: focus || undefined })} disabled={!tasks.some(t => t.title) || submitMut.isPending}>
        <Send className="w-4 h-4 mr-1" />{isZh ? "提交今日计划 (+5积分)" : "Submit Plan (+5pts)"}
      </Button>
    </div>
  );
}

// ═══ Tab ③: 工作总结 ═══
function DailySummaryTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";
  const [completed, setCompleted] = useState("");
  const [hours, setHours] = useState("");
  const [achievement, setAchievement] = useState("");
  const [blockers, setBlockers] = useState("");
  const [tomorrow, setTomorrow] = useState("");
  const [rating, setRating] = useState(3);

  const submitMut = trpc.empowermentEngine.daily.submitDailySummary.useMutation({
    onSuccess: () => { toast({ title: isZh ? "总结已提交 (+5积分)" : "Summary submitted (+5pts)" }); },
  });

  return (
    <div className="mt-4 space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium">{isZh ? "完成任务数" : "Tasks Done"}</label><Input type="number" className="h-10" value={completed} onChange={(e) => setCompleted(e.target.value)} /></div>
        <div><label className="text-xs font-medium">{isZh ? "今日工时(h)" : "Hours"}</label><Input type="number" step="0.5" className="h-10" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
      </div>
      <div><label className="text-xs font-medium">{isZh ? "今日关键成就" : "Key Achievement"}</label><Textarea value={achievement} onChange={(e) => setAchievement(e.target.value)} placeholder={isZh ? "今天最有价值的产出是..." : "Most valuable output today..."} rows={2} /></div>
      <div><label className="text-xs font-medium">{isZh ? "遇到的阻碍" : "Blockers"}</label><Input value={blockers} onChange={(e) => setBlockers(e.target.value)} placeholder={isZh ? "需要什么帮助？（选填）" : "Need help with? (optional)"} /></div>
      <div><label className="text-xs font-medium">{isZh ? "明日计划" : "Tomorrow Plan"}</label><Input value={tomorrow} onChange={(e) => setTomorrow(e.target.value)} placeholder={isZh ? "明天最重要的事..." : "Most important thing tomorrow..."} /></div>
      <div>
        <label className="text-xs font-medium">{isZh ? "今日自评" : "Self Rating"}</label>
        <div className="flex gap-2 mt-1">{[1, 2, 3, 4, 5].map(n => (
          <Button key={n} size="sm" variant={rating === n ? "default" : "outline"} onClick={() => setRating(n)} className="w-10">
            {n === 5 ? "🔥" : n === 4 ? "👍" : n === 3 ? "😐" : n === 2 ? "😓" : "😰"}
          </Button>
        ))}</div>
      </div>
      <Button className="w-full" onClick={() => submitMut.mutate({ completedTasks: Number(completed) || 0, totalHours: Number(hours) || 0, keyAchievement: achievement || undefined, blockers: blockers || undefined, tomorrowPlan: tomorrow || undefined, selfRating: rating })} disabled={submitMut.isPending}>
        <Send className="w-4 h-4 mr-1" />{isZh ? "提交工作总结 (+5积分)" : "Submit Summary (+5pts)"}
      </Button>
    </div>
  );
}

// ═══ Tab ④: 能力雷达 ═══
function CapabilityRadar() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const q = trpc.empowermentEngine.capability.getMyCapability.useQuery(undefined, { retry: false });
  const data = q.data;
  const dims = data?.dimensions || [];

  const ICONS: Record<string, typeof Wrench> = { T: Wrench, S: Brain, D: Sparkles, C: MessageSquare, K: BookOpen, L: Crown };

  return (
    <div className="mt-4 space-y-4">
      <div className="text-center mb-4">
        <p className="text-xs text-muted-foreground">{isZh ? "综合能力分" : "Overall Score"}</p>
        <p className="text-4xl font-bold text-primary">{data?.overallScore || "—"}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {dims.map((d: any) => {
          const Icon = ICONS[d.key] || Star;
          const gap = d.target - d.score;
          const pct = Math.min((d.score / d.target) * 100, 100);
          return (
            <Card key={d.key}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium">{isZh ? d.name : d.nameEn}</span>
                </div>
                <div className="flex items-end gap-1">
                  <span className={`text-2xl font-bold ${d.score >= d.target ? "text-green-600" : d.score >= d.target * 0.8 ? "text-blue-600" : "text-amber-600"}`}>{d.score}</span>
                  <span className="text-xs text-muted-foreground mb-1">/ {d.target}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                  <div className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : pct >= 80 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                </div>
                {gap > 0 && <p className="text-[10px] text-muted-foreground mt-1">{isZh ? `差距 ${gap}` : `Gap ${gap}`}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ═══ Tab ⑤: 改进建议 ═══
function ImprovementSuggestions() {
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const isZh = language === "zh";
  const q = trpc.empowermentEngine.improvement.getSuggestions.useQuery(undefined, { retry: false });
  const suggestions = (q.data as any[]) || [];

  const priorityColors: Record<string, string> = { high: "border-red-200 bg-red-50 dark:bg-red-950/10", medium: "border-amber-200 bg-amber-50 dark:bg-amber-950/10", low: "border-blue-200 bg-blue-50 dark:bg-blue-950/10" };
  const categoryIcons: Record<string, typeof Lightbulb> = { 习惯: Clock, 绩效: Target, 效率: Zap, 协作: Users, 成长: TrendingUp };

  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" />{isZh ? "AI个性化改进建议" : "AI Improvement Suggestions"}</h3>
      {suggestions.map((s: any, i: number) => {
        const Icon = categoryIcons[s.category] || Lightbulb;
        return (
          <button key={i} onClick={() => navigate(s.actionPath)} className="w-full text-left touch-feedback">
            <Card className={`${priorityColors[s.priority] || ""} hover:shadow-md transition-shadow`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                  <Badge variant={s.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">{s.priority}</Badge>
                </div>
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.detail}</p>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}

// ═══ Tab ⑥: 团队活力 ═══
function TeamVitality() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const q = trpc.empowermentEngine.teamVitality.getTeamVitality.useQuery(undefined, { retry: false });
  const data = q.data as any;
  const ranking = (data?.pointsRanking as any[]) || [];
  const dist = data?.perfDist || {};

  return (
    <div className="mt-4 space-y-4">
      {/* 绩效分布 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{isZh ? "团队绩效分布" : "Team Performance"}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {[{ k: "tier_a", l: "A", c: "#16a34a" }, { k: "tier_b", l: "B", c: "#2563eb" }, { k: "tier_c", l: "C", c: "#ea580c" }, { k: "tier_d", l: "D", c: "#dc2626" }].map(t => (
              <div key={t.k} className="text-center p-2 rounded" style={{ backgroundColor: t.c + "10" }}>
                <p className="text-xl font-bold" style={{ color: t.c }}>{dist[t.k] || 0}</p>
                <p className="text-[10px] text-muted-foreground">{t.l}{isZh ? "档" : ""}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* 积分排行 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{isZh ? "积分排行榜 Top10" : "Points Leaderboard"}</CardTitle></CardHeader>
        <CardContent>
          {ranking.map((r: any, i: number) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
              <span className={`text-sm font-bold w-6 ${i < 3 ? "text-amber-500" : "text-muted-foreground"}`}>{i + 1}</span>
              <span className="flex-1 text-sm">{r.name || `#${r.employee_id}`}</span>
              <Badge variant="outline" className="text-[10px]">Lv.{r.level || 1}</Badge>
              <span className="font-mono font-bold text-sm text-primary">{r.pts}</span>
            </div>
          ))}
          {ranking.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">{isZh ? "暂无数据" : "No data"}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══ 通用 ═══
function MiniGauge({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const cm: Record<string, string> = { blue: "border-blue-200 bg-blue-50/50", green: "border-green-200 bg-green-50/50", purple: "border-purple-200 bg-purple-50/50", amber: "border-amber-200 bg-amber-50/50", cyan: "border-cyan-200 bg-cyan-50/50" };
  const tm: Record<string, string> = { blue: "text-blue-700", green: "text-green-700", purple: "text-purple-700", amber: "text-amber-700", cyan: "text-cyan-700" };
  return (
    <div className={`rounded-lg border p-2 text-center ${cm[color]}`}>
      <div className={`flex items-center justify-center gap-1 mb-0.5 ${tm[color]}`}>{icon}</div>
      <p className={`text-lg font-bold tabular-nums ${tm[color]}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
