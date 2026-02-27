/**
 * Me Engine — 千人千面 (Thousand People, Thousand Faces)
 *
 * Role-based personalized portal with quick actions, AI performance widget,
 * temporal task tabs (Daily/Weekly/Monthly), and context suggestions.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUserProfile, ROLE_HIERARCHY } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import EngineNavBar from "@/components/Layout/EngineNavBar";
import {
  User,
  Sparkles,
  Loader2,
  Lightbulb,
  Calendar,
  CalendarDays,
  CalendarRange,
  BarChart3,
  Zap,
} from "lucide-react";

// Role scaffold lazy mapping
import SalesDailyTasks from "@/components/roles/sales/DailyTasks";
import SalesWeekly from "@/components/roles/sales/WeeklyPipeline";
import SalesMonthly from "@/components/roles/sales/MonthlyReport";
import RndDailyTasks from "@/components/roles/rnd/DailyTasks";
import RndWeekly from "@/components/roles/rnd/WeeklyReview";
import RndMonthly from "@/components/roles/rnd/MonthlyReport";
import ManagerDailyTasks from "@/components/roles/manager/DailyTasks";
import ManagerWeekly from "@/components/roles/manager/WeeklyReview";
import ManagerMonthly from "@/components/roles/manager/MonthlyReport";
import LeaderDailyTasks from "@/components/roles/team-leader/DailyTasks";
import LeaderWeekly from "@/components/roles/team-leader/WeeklyStandup";
import LeaderMonthly from "@/components/roles/team-leader/MonthlyReport";

type TemporalTab = "daily" | "weekly" | "monthly";

const ROLE_SCAFFOLD: Record<string, Record<TemporalTab, React.ComponentType>> = {
  bu_sales:    { daily: SalesDailyTasks,   weekly: SalesWeekly,   monthly: SalesMonthly },
  bu_mech:     { daily: RndDailyTasks,     weekly: RndWeekly,     monthly: RndMonthly },
  bu_elec:     { daily: RndDailyTasks,     weekly: RndWeekly,     monthly: RndMonthly },
  bu_pm:       { daily: ManagerDailyTasks, weekly: ManagerWeekly, monthly: ManagerMonthly },
  dept_manager:{ daily: ManagerDailyTasks, weekly: ManagerWeekly, monthly: ManagerMonthly },
  team_lead:   { daily: LeaderDailyTasks,  weekly: LeaderWeekly,  monthly: LeaderMonthly },
  director:    { daily: ManagerDailyTasks, weekly: ManagerWeekly, monthly: ManagerMonthly },
  bu_gm:       { daily: ManagerDailyTasks, weekly: ManagerWeekly, monthly: ManagerMonthly },
  cs_engineer: { daily: SalesDailyTasks,   weekly: SalesWeekly,   monthly: SalesMonthly },
  hr_manager:  { daily: ManagerDailyTasks, weekly: ManagerWeekly, monthly: ManagerMonthly },
  finance_manager: { daily: ManagerDailyTasks, weekly: ManagerWeekly, monthly: ManagerMonthly },
};

const TEMPORAL_TABS: { key: TemporalTab; labelZh: string; labelEn: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "daily",   labelZh: "每日",  labelEn: "Daily",   icon: Calendar },
  { key: "weekly",  labelZh: "每周",  labelEn: "Weekly",  icon: CalendarDays },
  { key: "monthly", labelZh: "每月",  labelEn: "Monthly", icon: CalendarRange },
];

export default function MeEngine() {
  const [, setLocation] = useLocation();
  const { currentUserRole } = useUserProfile();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [temporalTab, setTemporalTab] = useState<TemporalTab>("daily");

  const roleLevel = ROLE_HIERARCHY[currentUserRole] ?? 0;

  // tRPC queries
  const actionsQuery = trpc.roleAgent.getQuickActions.useQuery({ role: currentUserRole });
  const suggestionsQuery = trpc.roleAgent.getSuggestions.useQuery({ role: currentUserRole });
  const perfQuery = trpc.aiPerformance.dashboard.useQuery();

  const actions = actionsQuery.data ?? [];
  const suggestions = suggestionsQuery.data ?? [];
  const perf = perfQuery.data;

  // Role scaffold component
  const scaffolds = ROLE_SCAFFOLD[currentUserRole] ?? ROLE_SCAFFOLD["bu_sales"]!;
  const ScaffoldComponent = scaffolds[temporalTab];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 pt-6 pb-4">
        <EngineNavBar />

        {/* Role Identity Card */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isZh ? "千人千面" : "My Portal"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentUserRole} · Level {roleLevel}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex-1 p-6 space-y-6">
        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            {isZh ? "快捷操作" : "Quick Actions"}
          </h2>
          {actionsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : actions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{isZh ? "暂无快捷操作" : "No quick actions available"}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {actions.map((a: any) => (
                <Card
                  key={a.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setLocation(a.route)}
                >
                  <CardContent className="p-4">
                    <p className="text-sm font-medium">{isZh ? a.label : a.labelEn}</p>
                    <p className="text-xs text-muted-foreground mt-1">{isZh ? a.description : a.descriptionEn}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* AI Performance Mini-Widget */}
        {perf && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                {isZh ? "AI 绩效概览" : "AI Performance"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-blue-600">{perf.avgMeetingScore ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{isZh ? "综合评分" : "Avg Score"}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-green-600">{perf.actionItemCompletionRate ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">{isZh ? "任务完成率" : "Completion Rate"}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-orange-600">{perf.employeesEvaluated ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{isZh ? "已评估人数" : "Evaluated"}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-purple-600">
                    {perf.topPerformer?.name ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">{isZh ? "最佳员工" : "Top Performer"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Temporal Tabs + Role Scaffold */}
        <div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border mb-4">
            {TEMPORAL_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setTemporalTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    temporalTab === tab.key
                      ? "bg-white shadow-sm text-foreground border border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{isZh ? tab.labelZh : tab.labelEn}</span>
                </button>
              );
            })}
          </div>
          {ScaffoldComponent && <ScaffoldComponent />}
        </div>

        {/* Context Suggestions */}
        {suggestions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                {isZh ? "智能建议" : "Suggestions"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {suggestions.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-foreground">{isZh ? s.text : s.textEn}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
