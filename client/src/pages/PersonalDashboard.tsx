/**
 * PersonalDashboard — 千人千面智能工作台
 *
 * 3 core components:
 *   1. 6:00 AM 智能早报区 — AI-curated daily briefing
 *   2. 结构化报工台 — Hours + tasks + blockers submission
 *   3. 每月 1 日全景账单弹窗 — Monthly appraisal with password-locked salary
 *
 * Style: 西门子级工业暗黑科技风
 */

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Sun, Moon, Sunrise, Target, Clock, CheckSquare, AlertTriangle,
  FileText, Lock, Eye, EyeOff, Send, Zap, BarChart3, TrendingUp,
  Calendar, Loader2, Shield, Star, BookOpen,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

interface TaskEntry {
  title: string;
  category?: string;
  hours?: number;
}

// ── Time-based greeting ────────────────────────────────

function getGreeting(t: (k: string) => string): { text: string; icon: typeof Sun } {
  const h = new Date().getHours();
  if (h < 6) return { text: t("empowerment.greetingLateNight"), icon: Moon };
  if (h < 12) return { text: t("empowerment.greetingMorning"), icon: Sunrise };
  if (h < 18) return { text: t("empowerment.greetingAfternoon"), icon: Sun };
  return { text: t("empowerment.greetingEvening"), icon: Moon };
}

// ═══════════════════════════════════════════════════════════════
// Component 1: 智能早报区
// ═══════════════════════════════════════════════════════════════

function DailyBriefingSection() {
  const { t } = useLanguage();
  const briefingQuery = trpc.empowerment.briefing.getToday.useQuery();
  const markReadMutation = trpc.empowerment.briefing.markRead.useMutation();
  const briefing = briefingQuery.data;

  const handleMarkRead = useCallback(() => {
    if (briefing && briefing.status !== "read") {
      markReadMutation.mutate({ id: briefing.id });
    }
  }, [briefing, markReadMutation]);

  if (briefingQuery.isLoading) {
    return (
      <Card className="bg-[#0d1117] border-[#21262d]">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48 bg-[#21262d]" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full bg-[#21262d]" />
          <Skeleton className="h-4 w-3/4 bg-[#21262d]" />
          <Skeleton className="h-4 w-5/6 bg-[#21262d]" />
          <Skeleton className="h-20 w-full bg-[#21262d]" />
        </CardContent>
      </Card>
    );
  }

  if (!briefing) {
    return (
      <Card className="bg-[#0d1117] border-[#21262d]">
        <CardContent className="py-8 text-center">
          <Zap className="w-10 h-10 mx-auto text-[#484f58] mb-3" />
          <p className="text-[#8b949e] text-sm">{t("empowerment.briefingNotReady")}</p>
          <p className="text-[#484f58] text-xs mt-1">{t("empowerment.briefingNotReadyHint")}</p>
        </CardContent>
      </Card>
    );
  }

  const priorities = briefing.topPriorities as { title: string; source: string; priority: string }[] | null;
  const schedule = briefing.todaySchedule as { time: string; title: string; type: string }[] | null;

  return (
    <Card className="bg-[#0d1117] border-[#30363d] relative overflow-hidden">
      {/* Accent glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#58a6ff] via-[#bc8cff] to-[#58a6ff]" />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#e6edf3] text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#f0883e]" />
            {t("empowerment.todayBattlePlan")}
            <Badge variant="outline" className="text-[10px] border-[#30363d] text-[#8b949e] ml-1">
              {briefing.briefingDate}
            </Badge>
          </CardTitle>
          {briefing.status !== "read" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-[#58a6ff] hover:bg-[#161b22]"
              onClick={handleMarkRead}
            >
              <Eye className="w-3 h-3 mr-1" /> {t("empowerment.markRead")}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Top priorities */}
        {priorities && priorities.length > 0 && (
          <div>
            <h4 className="text-[#8b949e] text-xs font-medium uppercase tracking-wider mb-2">
              <Target className="w-3 h-3 inline mr-1" />
              {t("empowerment.keyPriorities")}
            </h4>
            <div className="space-y-1.5">
              {priorities.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded bg-[#161b22] border border-[#30363d] flex items-center justify-center text-[10px] text-[#58a6ff] font-mono">
                    {i + 1}
                  </span>
                  <span className="text-[#e6edf3] flex-1">{p.title}</span>
                  <Badge variant="outline" className="text-[9px] border-[#30363d] text-[#484f58]">
                    {p.source}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule */}
        {schedule && schedule.length > 0 && (
          <div>
            <h4 className="text-[#8b949e] text-xs font-medium uppercase tracking-wider mb-2">
              <Calendar className="w-3 h-3 inline mr-1" />
              {t("empowerment.schedule")}
            </h4>
            <div className="space-y-1">
              {schedule.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#8b949e]">
                  <span className="font-mono text-[#58a6ff] w-12">{s.time}</span>
                  <span className="text-[#c9d1d9]">{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OKR Summary */}
        {briefing.okrSummary && (
          <div>
            <h4 className="text-[#8b949e] text-xs font-medium uppercase tracking-wider mb-2">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              {t("empowerment.okrAlignment")}
            </h4>
            <pre className="text-xs text-[#8b949e] whitespace-pre-wrap font-sans bg-[#161b22] rounded p-2 border border-[#21262d]">
              {briefing.okrSummary}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// Component 2: 结构化报工台
// ═══════════════════════════════════════════════════════════════

function DailyLogForm() {
  const { t } = useLanguage();
  const [hours, setHours] = useState("");
  const [tasks, setTasks] = useState<TaskEntry[]>([{ title: "", hours: 0 }]);
  const [blockers, setBlockers] = useState("");
  const [notes, setNotes] = useState("");
  const [energy, setEnergy] = useState(3);

  const submitMutation = trpc.empowerment.dailyLog.submit.useMutation();
  const todayLogs = trpc.empowerment.dailyLog.getByDate.useQuery({
    date: new Date().toISOString().slice(0, 10),
  });

  const handleAddTask = useCallback(() => {
    setTasks(prev => [...prev, { title: "", hours: 0 }]);
  }, []);

  const handleTaskChange = useCallback((index: number, field: keyof TaskEntry, value: string | number) => {
    setTasks(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  }, []);

  const handleSubmit = useCallback(() => {
    const validTasks = tasks.filter(t => t.title.trim());
    submitMutation.mutate({
      logDate: new Date().toISOString().slice(0, 10),
      loggedHours: parseFloat(hours) || 0,
      completedTasks: validTasks,
      blockers: blockers || undefined,
      notes: notes || undefined,
      energyLevel: energy,
    }, {
      onSuccess: () => {
        setHours("");
        setTasks([{ title: "", hours: 0 }]);
        setBlockers("");
        setNotes("");
        todayLogs.refetch();
      },
    });
  }, [hours, tasks, blockers, notes, energy, submitMutation, todayLogs]);

  const existingLogs = todayLogs.data ?? [];
  const totalLoggedToday = existingLogs.reduce((s, l) => s + (l.loggedHours ?? 0), 0);

  return (
    <Card className="bg-[#0d1117] border-[#21262d]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#e6edf3] text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#3fb950]" />
          {t("empowerment.structuredLog")}
          {totalLoggedToday > 0 && (
            <Badge className="bg-[#238636]/20 text-[#3fb950] border-[#238636] text-[10px]">
              {t("empowerment.loggedToday")} {totalLoggedToday.toFixed(1)}h
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Hours input */}
        <div>
          <label className="text-[#8b949e] text-xs block mb-1">{t("empowerment.workHours")}</label>
          <Input
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="8.0"
            className="bg-[#161b22] border-[#30363d] text-[#e6edf3] h-9 text-sm focus:border-[#58a6ff]"
          />
        </div>

        {/* Tasks */}
        <div>
          <label className="text-[#8b949e] text-xs block mb-1">{t("empowerment.completedTasks")}</label>
          <div className="space-y-2">
            {tasks.map((task, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={task.title}
                  onChange={(e) => handleTaskChange(i, "title", e.target.value)}
                  placeholder={`${t("empowerment.taskPlaceholder")} ${i + 1}`}
                  className="bg-[#161b22] border-[#30363d] text-[#e6edf3] h-8 text-xs flex-1 focus:border-[#58a6ff]"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={task.hours ?? ""}
                  onChange={(e) => handleTaskChange(i, "hours", parseFloat(e.target.value) || 0)}
                  placeholder="h"
                  className="bg-[#161b22] border-[#30363d] text-[#e6edf3] h-8 text-xs w-16 focus:border-[#58a6ff]"
                />
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddTask}
              className="h-7 text-xs text-[#58a6ff] hover:bg-[#161b22]"
            >
              {t("empowerment.addTask")}
            </Button>
          </div>
        </div>

        {/* Blockers */}
        <div>
          <label className="text-[#8b949e] text-xs block mb-1">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            {t("empowerment.blockers")}
          </label>
          <Textarea
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            placeholder={t("empowerment.blockersPlaceholder")}
            rows={2}
            className="bg-[#161b22] border-[#30363d] text-[#e6edf3] text-xs resize-none focus:border-[#58a6ff]"
          />
        </div>

        {/* Energy level */}
        <div>
          <label className="text-[#8b949e] text-xs block mb-1">{t("empowerment.energyLevel")}</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                onClick={() => setEnergy(level)}
                className={`w-8 h-8 rounded border text-xs font-mono transition-colors ${
                  level <= energy
                    ? "bg-[#238636]/20 border-[#238636] text-[#3fb950]"
                    : "bg-[#161b22] border-[#30363d] text-[#484f58]"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={submitMutation.isPending || !hours}
          className="w-full h-9 bg-[#238636] hover:bg-[#2ea043] text-white text-sm"
        >
          {submitMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-1" />
          )}
          {t("empowerment.submitLog")}
        </Button>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// Component 3: 每月 1 日全景账单弹窗
// ═══════════════════════════════════════════════════════════════

function MonthlyAppraisalModal() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [salaryUnlocked, setSalaryUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);

  const unreadQuery = trpc.empowerment.appraisal.getLatestUnread.useQuery();
  const markReadMutation = trpc.empowerment.appraisal.markRead.useMutation();
  const report = unreadQuery.data;

  // Auto-open on 1st of month if there's an unread report
  useEffect(() => {
    if (report && new Date().getDate() <= 3) {
      setOpen(true);
    }
  }, [report]);

  const handleUnlockSalary = useCallback(() => {
    // Simplified password check (in production this would be a server-side re-auth)
    if (password.length >= 4) {
      setSalaryUnlocked(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  }, [password]);

  const handleClose = useCallback(() => {
    if (report) {
      markReadMutation.mutate({ id: report.id });
    }
    setOpen(false);
    setSalaryUnlocked(false);
    setPassword("");
  }, [report, markReadMutation]);

  if (!report) return null;

  const strengths = report.strengths as string[] | null;
  const shortcomings = report.shortcomings as string[] | null;
  const training = report.requiredTraining as { title: string; reason: string; urgency: string }[] | null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogContent className="bg-[#0d1117] border-[#30363d] text-[#e6edf3] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-[#bc8cff]" />
            {t("empowerment.monthlyBill")}
            <Badge variant="outline" className="border-[#30363d] text-[#8b949e] text-xs">
              {report.period}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-[#8b949e] text-xs">
            {t("empowerment.billAutoGenHint")}
          </DialogDescription>
        </DialogHeader>

        <Separator className="bg-[#21262d]" />

        {/* Performance Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label={t("empowerment.perfScore")} value={report.performanceScore?.toFixed(0) ?? "—"} icon={Star} color="#f0883e" />
          <MetricCard label={t("empowerment.workHoursShort")} value={`${report.totalHours?.toFixed(0) ?? 0}h`} icon={Clock} color="#58a6ff" />
          <MetricCard label={t("empowerment.tasksCompleted")} value={String(report.tasksCompleted ?? 0)} icon={CheckSquare} color="#3fb950" />
          <MetricCard label={t("empowerment.defectCount")} value={String(report.defectCount ?? 0)} icon={AlertTriangle} color={report.defectCount && report.defectCount > 0 ? "#f85149" : "#3fb950"} />
        </div>

        {/* Strengths */}
        {strengths && strengths.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-[#3fb950] uppercase tracking-wider mb-1.5">
              <TrendingUp className="w-3 h-3 inline mr-1" /> {t("empowerment.strengths")}
            </h4>
            <ul className="space-y-1">
              {strengths.map((s, i) => (
                <li key={i} className="text-xs text-[#8b949e] pl-3 border-l-2 border-[#238636]">{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Shortcomings */}
        {shortcomings && shortcomings.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-[#f0883e] uppercase tracking-wider mb-1.5">
              <AlertTriangle className="w-3 h-3 inline mr-1" /> {t("empowerment.improvements")}
            </h4>
            <ul className="space-y-1">
              {shortcomings.map((s, i) => (
                <li key={i} className="text-xs text-[#8b949e] pl-3 border-l-2 border-[#f0883e]">{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Training recommendations */}
        {training && training.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-[#bc8cff] uppercase tracking-wider mb-1.5">
              <BookOpen className="w-3 h-3 inline mr-1" /> {t("empowerment.trainingAdvice")}
            </h4>
            <div className="space-y-1.5">
              {training.map((t, i) => (
                <div key={i} className="text-xs bg-[#161b22] rounded p-2 border border-[#21262d]">
                  <span className="text-[#c9d1d9] font-medium">{t.title}</span>
                  <span className="text-[#484f58] ml-2">— {t.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator className="bg-[#21262d]" />

        {/* Salary section — password locked */}
        <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[#f0883e]" />
            <h4 className="text-sm font-medium text-[#e6edf3]">{t("empowerment.salaryDetail")}</h4>
            <Badge variant="outline" className="text-[9px] border-[#f0883e] text-[#f0883e]">
              <Lock className="w-2.5 h-2.5 mr-0.5" /> {t("empowerment.encrypted")}
            </Badge>
          </div>

          {!salaryUnlocked ? (
            <div className="space-y-2">
              <p className="text-xs text-[#8b949e]">{t("empowerment.enterPasswordHint")}</p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPwError(false); }}
                  placeholder={t("empowerment.enterPassword")}
                  className={`bg-[#0d1117] border-[#30363d] text-[#e6edf3] h-8 text-xs flex-1 ${
                    pwError ? "border-[#f85149]" : "focus:border-[#58a6ff]"
                  }`}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlockSalary()}
                />
                <Button
                  size="sm"
                  onClick={handleUnlockSalary}
                  className="h-8 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" /> {t("empowerment.unlock")}
                </Button>
              </div>
              {pwError && <p className="text-[10px] text-[#f85149]">{t("empowerment.passwordTooShort")}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <SalaryField label={t("empowerment.baseSalary")} value={report.baseSalary} />
              <SalaryField label={t("empowerment.perfBonus")} value={report.performanceBonus} />
              <SalaryField label={t("empowerment.netPay")} value={report.netPay} highlight />
            </div>
          )}
        </div>

        {/* Close */}
        <div className="flex justify-end">
          <Button onClick={handleClose} className="bg-[#238636] hover:bg-[#2ea043] text-white text-sm h-9">
            {t("empowerment.confirmRead")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Metric Card sub-component ──────────────────────────

function MetricCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string;
  icon: typeof Star;
  color: string;
}) {
  return (
    <div className="bg-[#161b22] rounded border border-[#21262d] p-3 text-center">
      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
      <p className="text-lg font-mono font-bold text-[#e6edf3]">{value}</p>
      <p className="text-[10px] text-[#484f58] uppercase tracking-wider">{label}</p>
    </div>
  );
}

function SalaryField({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-[#484f58] uppercase">{label}</p>
      <p className={`text-sm font-mono font-bold ${highlight ? "text-[#3fb950]" : "text-[#e6edf3]"}`}>
        {value ? `¥${value}` : "—"}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════

export default function PersonalDashboard() {
  const { t } = useLanguage();
  const { roleConfig, currentUserRole } = useUserProfile();
  const profile = { name: roleConfig.label, role: currentUserRole };
  const greeting = getGreeting(t);
  const GreetingIcon = greeting.icon;

  return (
    <div className="min-h-screen bg-[#010409] text-[#e6edf3]">
      {/* Monthly appraisal modal (auto-opens on 1st) */}
      <MonthlyAppraisalModal />

      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <GreetingIcon className="w-6 h-6 text-[#f0883e]" />
          <div>
            <h1 className="text-xl font-semibold text-[#e6edf3]">
              {greeting.text}，{profile?.name || t("empowerment.userFallback")}
            </h1>
            <p className="text-xs text-[#484f58] mt-0.5">
              {profile?.role && <Badge variant="outline" className="text-[9px] border-[#30363d] text-[#8b949e] mr-2">{profile.role}</Badge>}
              {new Date().toLocaleDateString("zh-CN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="px-6 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: AI Briefing */}
        <div className="space-y-4">
          <DailyBriefingSection />

          {/* Quick stats */}
          <Card className="bg-[#0d1117] border-[#21262d]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#e6edf3] text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#bc8cff]" />
                {t("empowerment.monthOverview")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyStatsWidget />
            </CardContent>
          </Card>
        </div>

        {/* Right: Daily Log Form */}
        <div>
          <DailyLogForm />
        </div>
      </div>
    </div>
  );
}

// ── Monthly stats widget ───────────────────────────────

function MonthlyStatsWidget() {
  const { t } = useLanguage();
  const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const summaryQuery = trpc.empowerment.dailyLog.monthlySummary.useQuery({ period });

  if (summaryQuery.isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-[#21262d]" />)}
      </div>
    );
  }

  const data = summaryQuery.data;

  return (
    <div className="grid grid-cols-3 gap-3">
      <MetricCard label={t("empowerment.totalHours")} value={`${(data?.totalHours ?? 0).toFixed(0)}h`} icon={Clock} color="#58a6ff" />
      <MetricCard label={t("empowerment.taskCount")} value={String(data?.totalTasks ?? 0)} icon={CheckSquare} color="#3fb950" />
      <MetricCard label={t("empowerment.daysLogged")} value={String(data?.daysLogged ?? 0)} icon={Calendar} color="#bc8cff" />
    </div>
  );
}
