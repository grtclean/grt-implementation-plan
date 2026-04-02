/**
 * HR快捷中枢 (HR Quick Hub)
 *
 * HR专员/经理角色化首页：
 *  - 待办看板: 待面试·待入职·试用期到期·绩效评审
 *  - 快捷操作: 发布岗位·录入候选人·发起面试·办理入职
 *  - KPI概览: 招聘漏斗·员工人数·离职率·培训完成率
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Users, UserPlus, ClipboardList, GraduationCap, Star,
  TrendingUp, Calendar, FileText, ChevronRight, CheckCircle2,
  Clock, AlertTriangle, Briefcase, Target, MessageSquare,
  Shield, Award, BarChart3, Search,
} from "lucide-react";

interface QuickCard {
  id: string;
  labelZh: string;
  labelEn: string;
  icon: typeof Users;
  path: string;
  color: string;
  bgColor: string;
  descZh: string;
  descEn: string;
}

const HR_CARDS: QuickCard[] = [
  { id: "recruit", labelZh: "招聘管理", labelEn: "Recruitment", icon: UserPlus, path: "/recruitment", color: "#2563eb", bgColor: "#dbeafe", descZh: "岗位发布·候选人管理", descEn: "Job posting & candidates" },
  { id: "lifecycle", labelZh: "HR链路", labelEn: "HR Lifecycle", icon: ClipboardList, path: "/hr-lifecycle", color: "#9333ea", bgColor: "#f3e8ff", descZh: "面试→Offer→入职全流程", descEn: "Interview→Offer→Onboard" },
  { id: "onboarding", labelZh: "入职办理", labelEn: "Onboarding", icon: FileText, path: "/new-hire-onboarding", color: "#16a34a", bgColor: "#dcfce7", descZh: "新员工资料填报·签署", descEn: "New hire forms & signing" },
  { id: "performance", labelZh: "绩效管理", labelEn: "Performance", icon: Target, path: "/employee-performance", color: "#ea580c", bgColor: "#ffedd5", descZh: "考核·校准·360反馈", descEn: "Review & calibration" },
  { id: "employee", labelZh: "员工管理", labelEn: "Employees", icon: Users, path: "/employee-management", color: "#0891b2", bgColor: "#cffafe", descZh: "花名册·调岗·状态管理", descEn: "Roster & status" },
  { id: "training", labelZh: "培训管理", labelEn: "Training", icon: GraduationCap, path: "/training", color: "#dc2626", bgColor: "#fee2e2", descZh: "培训计划·学习路径", descEn: "Plans & learning paths" },
  { id: "assessment", labelZh: "能力测评", labelEn: "Assessment", icon: Star, path: "/assessment-lifecycle", color: "#7c3aed", bgColor: "#ede9fe", descZh: "TSDCKL六维评估", descEn: "TSDCKL 6-dimension" },
  { id: "goals", labelZh: "年度目标", labelEn: "Annual Goals", icon: Award, path: "/annual-goal-agreement", color: "#b45309", bgColor: "#fef3c7", descZh: "目标协定·签署·跟踪", descEn: "Goal agreements" },
];

export default function HRQuickHub() {
  const { user } = useAuth();
  const { currentUserRole } = useUserProfile();
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const isZh = language === "zh";

  // 拉统计
  const statsQ = trpc.employee.getStats.useQuery(undefined, { retry: false });
  const stats = statsQ.data as any;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* 顶部 */}
      <header>
        <h1 className="text-2xl font-bold">{isZh ? "人事中枢" : "HR Hub"}</h1>
        <p className="text-sm text-muted-foreground">
          {user?.name || (isZh ? "HR" : "HR")} · <Badge variant="outline" className="text-[10px]">{currentUserRole}</Badge>
        </p>
      </header>

      {/* KPI统计条 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat icon={<Users className="w-4 h-4" />} label={isZh ? "在职员工" : "Active"} value={stats?.totalActive ?? stats?.total ?? "—"} color="blue" />
        <MiniStat icon={<UserPlus className="w-4 h-4" />} label={isZh ? "本月入职" : "New Hires"} value={stats?.newHiresThisMonth ?? "—"} color="green" />
        <MiniStat icon={<Clock className="w-4 h-4" />} label={isZh ? "试用期中" : "Probation"} value={stats?.onProbation ?? "—"} color="amber" />
        <MiniStat icon={<AlertTriangle className="w-4 h-4" />} label={isZh ? "待处理" : "Pending"} value={stats?.pendingActions ?? "—"} color="red" />
      </div>

      {/* 待办提醒 */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            {isZh ? "今日待办" : "Today's Tasks"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <TodoItem icon={<Briefcase className="w-3.5 h-3.5" />} label={isZh ? "待安排面试" : "Schedule Interview"} count={stats?.pendingInterviews ?? 0} path="/hr-lifecycle" onClick={() => navigate("/hr-lifecycle")} />
            <TodoItem icon={<FileText className="w-3.5 h-3.5" />} label={isZh ? "待办理入职" : "Pending Onboard"} count={stats?.pendingOnboarding ?? 0} path="/new-hire-onboarding" onClick={() => navigate("/new-hire-onboarding")} />
            <TodoItem icon={<Target className="w-3.5 h-3.5" />} label={isZh ? "绩效待评审" : "Performance Due"} count={stats?.pendingReviews ?? 0} path="/employee-performance" onClick={() => navigate("/employee-performance")} />
          </div>
        </CardContent>
      </Card>

      {/* 快捷操作 */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 tracking-wider uppercase">
          {isZh ? "快捷操作" : "Quick Actions"}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {HR_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button key={card.id} onClick={() => navigate(card.path)} className="touch-feedback active:scale-[0.97] transition-transform text-left">
                <Card className="h-full border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col gap-2.5 min-h-[90px]">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: card.bgColor, color: card.color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight">{isZh ? card.labelZh : card.labelEn}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{isZh ? card.descZh : card.descEn}</p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TodoItem({ icon, label, count, path, onClick }: { icon: React.ReactNode; label: string; count: number; path: string; onClick: () => void }) {
  if (count <= 0) return null;
  return (
    <button onClick={onClick} className="flex items-center gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-800 border hover:border-amber-400 transition-colors touch-feedback text-left w-full">
      <div className="text-amber-600">{icon}</div>
      <span className="text-sm flex-1">{label}</span>
      <Badge variant="destructive" className="text-[10px]">{count}</Badge>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
    </button>
  );
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const cm: Record<string, string> = {
    red: "border-red-200 bg-red-50 dark:bg-red-950/20", green: "border-green-200 bg-green-50 dark:bg-green-950/20",
    amber: "border-amber-200 bg-amber-50 dark:bg-amber-950/20", blue: "border-blue-200 bg-blue-50 dark:bg-blue-950/20",
  };
  const tm: Record<string, string> = { red: "text-red-700", green: "text-green-700", amber: "text-amber-700", blue: "text-blue-700" };
  return (
    <div className={`rounded-xl border p-3 ${cm[color]}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${tm[color]}`}>{icon}<span className="text-[10px] font-medium text-muted-foreground">{label}</span></div>
      <p className={`text-lg font-bold tabular-nums ${tm[color]}`}>{value}</p>
    </div>
  );
}
