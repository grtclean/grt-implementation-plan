/**
 * 个人中心 — Enhanced Personal Center
 *
 * Tab 1: 人物画像 (Portrait) — TSDCKL radar + 4D combat power + BU context [实际分析]
 * Tab 2: 工作任务 (Tasks)    — Task kanban [Demo]
 * Tab 3: 工作计划 (Plan)     — Weekly plan + rationality analysis [Demo]
 * Tab 4: 培训计划 (Training) — Real dev path from TSDCKL gap analysis [实际分析]
 * Tab 5: 能力雷达 (Radar)    — TSDCKL 6-pillar breakdown [实际分析]
 *
 * Route: /my-workspace/profile/:userId
 */

import { useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  User,
  Target,
  Briefcase,
  Calendar,
  GraduationCap,
  Radar as RadarIcon,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  BookOpen,
  Wrench,
  Users,
  Lightbulb,
  MessageSquare,
  Crown,
  TrendingUp,
  TrendingDown,
  Building2,
  MapPin,
  Zap,
  Award,
  BarChart3,
  FlaskConical,
  History,
  DollarSign,
  Star,
  Milestone,
  ArrowUp,
  Minus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const Q = { retry: false, refetchOnWindowFocus: false } as const;

// ─── Demo Badge ─────────────────────────────────────────────────────

function DemoBadge() {
  return (
    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-[10px] px-1.5 py-0 font-bold tracking-wider">
      DEMO
    </Badge>
  );
}

function RealBadge() {
  return (
    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[10px] px-1.5 py-0 font-bold tracking-wider">
      实际分析
    </Badge>
  );
}

// ─── Pillar Icons ───────────────────────────────────────────────────

const PILLAR_ICONS: Record<string, LucideIcon> = {
  T: Wrench, S: Users, D: Lightbulb, C: MessageSquare, K: BookOpen, L: Crown,
};

// ─── Status Config ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  completed: { label: "已完成", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  in_progress: { label: "进行中", color: "bg-blue-100 text-blue-700", icon: Clock },
  todo: { label: "待开始", color: "bg-gray-100 text-gray-600", icon: Circle },
  overdue: { label: "已逾期", color: "bg-red-100 text-red-700", icon: AlertTriangle },
} as const;

const PRIORITY_CONFIG = {
  high: { label: "高", color: "bg-red-50 text-red-700 border-red-200" },
  medium: { label: "中", color: "bg-amber-50 text-amber-700 border-amber-200" },
  low: { label: "低", color: "bg-green-50 text-green-700 border-green-200" },
} as const;

const CATEGORY_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  project: { label: "项目", icon: Briefcase, color: "text-blue-600" },
  daily: { label: "日常", icon: BarChart3, color: "text-gray-600" },
  meeting: { label: "会议", icon: Users, color: "text-violet-600" },
  training: { label: "培训", icon: GraduationCap, color: "text-emerald-600" },
};

const PLAN_TYPE_CONFIG: Record<string, { color: string; bg: string }> = {
  meeting: { color: "border-l-violet-500", bg: "bg-violet-50" },
  task: { color: "border-l-blue-500", bg: "bg-blue-50" },
  review: { color: "border-l-amber-500", bg: "bg-amber-50" },
  training: { color: "border-l-emerald-500", bg: "bg-emerald-50" },
};

// ─── Tab Type ───────────────────────────────────────────────────────

type TabKey = "portrait" | "tasks" | "plan" | "training" | "lifecycle" | "radar";

const TABS: { key: TabKey; label: string; icon: LucideIcon; isDemo: boolean }[] = [
  { key: "portrait", label: "人物画像", icon: User, isDemo: false },
  { key: "tasks", label: "工作任务", icon: Briefcase, isDemo: true },
  { key: "plan", label: "工作计划", icon: Calendar, isDemo: true },
  { key: "training", label: "培训计划", icon: GraduationCap, isDemo: false },
  { key: "lifecycle", label: "生命周期", icon: History, isDemo: false },
  { key: "radar", label: "能力雷达", icon: RadarIcon, isDemo: false },
];

// ─── Main Component ─────────────────────────────────────────────────

export default function EmployeeProfile() {
  const { t } = useLanguage();
  const [selectedUserId, setSelectedUserId] = useState(80); // default: 刘奥运
  const [activeTab, setActiveTab] = useState<TabKey>("portrait");
  const [weekOffset, setWeekOffset] = useState(0);

  // ─── Data queries ─────────────────────────────────────────────────
  const fullProfileQ = trpc.employeeProfile.getFullProfile.useQuery({ userId: selectedUserId }, Q);
  const listQ = trpc.employeeProfile.listProfiles.useQuery(undefined, Q);
  const trainingQ = trpc.employeeProfile.getTrainingPlan.useQuery({ userId: selectedUserId }, Q);
  const tasksQ = trpc.employeeProfile.getWorkTasks.useQuery({ userId: selectedUserId }, Q);
  const planQ = trpc.employeeProfile.getWorkPlan.useQuery({ userId: selectedUserId, weekOffset }, Q);
  const lifecycleQ = trpc.employeeProfile.getLifecycleProfile.useQuery({ userId: selectedUserId }, Q);

  const fp = fullProfileQ.data;
  const profile = fp && "found" in fp && fp.found ? fp : null;
  const employees = listQ.data?.profiles ?? [];

  if (fullProfileQ.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ═══ Header ═══ */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-blue-600 rounded-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">个人中心</h1>
              <p className="text-sm text-gray-500">人物画像 · 工作管理 · 能力发展</p>
            </div>
          </div>
          <select
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(Number(e.target.value));
              setWeekOffset(0);
            }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          >
            {employees.map((e: any) => (
              <option key={e.userId} value={e.userId}>
                {e.employeeCode} — {e.name} ({e.department})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ═══ Tab Bar ═══ */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? "border-violet-600 text-violet-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.isDemo && <DemoBadge />}
                {!tab.isDemo && <RealBadge />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Tab Content ═══ */}
      <div className="p-6">
        {activeTab === "portrait" && profile && <PortraitTab profile={profile} />}
        {activeTab === "tasks" && <TasksTab data={tasksQ.data} loading={tasksQ.isLoading} />}
        {activeTab === "plan" && (
          <PlanTab
            data={planQ.data}
            loading={planQ.isLoading}
            weekOffset={weekOffset}
            onWeekChange={setWeekOffset}
          />
        )}
        {activeTab === "training" && <TrainingTab data={trainingQ.data} loading={trainingQ.isLoading} />}
        {activeTab === "lifecycle" && <LifecycleTab data={lifecycleQ.data} loading={lifecycleQ.isLoading} />}
        {activeTab === "radar" && profile && <RadarTab profile={profile} />}
        {!profile && activeTab !== "tasks" && activeTab !== "plan" && activeTab !== "training" && (
          <Card className="p-8 text-center text-gray-500">
            未找到员工数据 (userId: {selectedUserId})
          </Card>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 1: 人物画像 (Portrait)
// ═══════════════════════════════════════════════════════════════════════

function PortraitTab({ profile }: { profile: any }) {
  const p = profile.profile;
  const tsdckl = profile.tsdckl;
  const bu = profile.buContext;
  const pillars = profile.tsdcklPillars;

  const tierConfig: Record<string, { bg: string; text: string; label: string; border: string }> = {
    S: { bg: "bg-amber-50", text: "text-amber-700", label: "S · Star Performer", border: "border-amber-300" },
    A: { bg: "bg-emerald-50", text: "text-emerald-700", label: "A · High Performer", border: "border-emerald-300" },
    B: { bg: "bg-blue-50", text: "text-blue-700", label: "B · Solid Contributor", border: "border-blue-300" },
    C: { bg: "bg-gray-50", text: "text-gray-600", label: "C · Needs Development", border: "border-gray-300" },
  };
  const tc = tierConfig[p.tier] || tierConfig.B;

  // Radar chart data
  const radarData = pillars
    ? pillars.map((pl: any) => ({
        name: pl.code,
        fullName: pl.name,
        score: pl.score,
        fullMark: 100,
      }))
    : [];

  // 4D dimension bar data
  const dimColors = ["#6366f1", "#06b6d4", "#f59e0b", "#22c55e"];

  return (
    <div className="space-y-6">
      {/* ─── Employee Info Card ─── */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 via-blue-600 to-indigo-600 px-6 py-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-3xl font-bold border-2 border-white/30">
              {p.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">{p.name}</h2>
              <div className="flex items-center gap-3 mt-2 text-white/80 text-sm">
                <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{p.position}</span>
                <span className="text-white/40">|</span>
                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{p.department}</span>
                {bu && (
                  <>
                    <span className="text-white/40">|</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{bu.buName} ({bu.buCode})</span>
                  </>
                )}
                <span className="text-white/40">|</span>
                <span>{p.employeeCode} · {p.level}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-white">{p.overallScore}</div>
              <div className="text-xs text-white/60 mt-1">COMBAT POWER</div>
              <Badge className={`mt-2 ${tc.bg} ${tc.text} border ${tc.border} font-bold`}>{tc.label}</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── TSDCKL Radar + 4D Breakdown ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TSDCKL Radar */}
        <Card>
          <CardHeader className="pb-2 border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-violet-600" />
              TSDCKL六维能力模型
              <RealBadge />
              {profile.tsdcklAvg != null && (
                <span className="ml-auto text-sm font-normal text-gray-500">均分: {profile.tsdcklAvg}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="name"
                    tick={({ x, y, payload }: any) => {
                      const item = radarData.find((d: any) => d.name === payload.value);
                      return (
                        <g>
                          <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                            className="fill-gray-700 text-xs font-bold">{payload.value}</text>
                          <text x={x} y={y + 14} textAnchor="middle" dominantBaseline="central"
                            className="fill-gray-400 text-[10px]">{item?.fullName || ""}</text>
                        </g>
                      );
                    }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} tickCount={6} />
                  <Radar dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={2}
                    dot={{ r: 4, fill: "#7c3aed", stroke: "#fff", strokeWidth: 2 }} />
                  <Tooltip formatter={(v: any) => [`${v}分`, "得分"]} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">暂无TSDCKL评估数据</div>
            )}
          </CardContent>
        </Card>

        {/* 4D Combat Power Breakdown */}
        <Card>
          <CardHeader className="pb-2 border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-blue-600" />
              四维战力分解
              <RealBadge />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            {p.dimensions.map((dim: any, i: number) => {
              const color = dimColors[i];
              const labelMap: Record<string, string> = {
                Execution: "执行力 (30%)",
                Learning: "学习力 (20%)",
                Collaboration: "协作力 (25%)",
                Innovation: "创新力 (25%)",
              };
              return (
                <div key={dim.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-gray-700">{labelMap[dim.name] || dim.name}</span>
                    <span className="text-sm font-bold" style={{ color }}>{dim.score}</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${dim.score}%`, backgroundColor: color }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{dim.breakdown}</p>
                </div>
              );
            })}
            {/* Weight formula */}
            <div className="pt-3 border-t">
              <p className="text-xs text-gray-400">
                综合战力 = 执行力×0.30 + 学习力×0.20 + 协作力×0.25 + 创新力×0.25
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── AI Career Advice ─── */}
      <Card>
        <CardHeader className="pb-2 border-b bg-gray-50/50">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="w-5 h-5 text-indigo-600" />
            AI职业发展建议
            <RealBadge />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {p.careerAdvice.map((adv: any, i: number) => {
            const typeMap: Record<string, { icon: string; bg: string; label: string }> = {
              STRENGTH: { icon: "💪", bg: "bg-emerald-50", label: "优势" },
              DEVELOPMENT: { icon: "📈", bg: "bg-amber-50", label: "待提升" },
              OPPORTUNITY: { icon: "🌟", bg: "bg-blue-50", label: "机会" },
            };
            const tc2 = typeMap[adv.type] || typeMap.STRENGTH;
            return (
              <div key={i} className={`px-5 py-3.5 ${tc2.bg}`}>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-1">
                  <span>{tc2.icon}</span>
                  <span>{tc2.label} — {adv.dimension}</span>
                </div>
                <p className="text-sm text-gray-700">{adv.message}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ─── TSDCKL Pillar Cards ─── */}
      {pillars && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {pillars.map((pl: any) => {
            const PIcon = PILLAR_ICONS[pl.code] || Award;
            const pct = pl.score;
            const color = pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-blue-600" : pct >= 40 ? "text-amber-600" : "text-red-600";
            return (
              <Card key={pl.code} className="text-center p-4">
                <PIcon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                <div className={`text-2xl font-black ${color}`}>{pct}</div>
                <div className="text-[10px] text-gray-400 font-bold">{pl.level}</div>
                <div className="text-xs font-semibold text-gray-600 mt-1">{pl.code} · {pl.name}</div>
                <Progress value={pct} className="h-1.5 mt-2" />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 2: 工作任务 (Tasks) [Demo]
// ═══════════════════════════════════════════════════════════════════════

function TasksTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <LoadingSkeleton />;
  if (!data?.found) return <EmptyState message="未找到任务数据" />;

  const { tasks, summary } = data;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "已完成", value: summary.completed, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "进行中", value: summary.inProgress, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "待开始", value: summary.todo, color: "text-gray-600", bg: "bg-gray-50" },
          { label: "已逾期", value: summary.overdue, color: "text-red-600", bg: "bg-red-50" },
        ].map(item => (
          <Card key={item.label} className={`${item.bg} border-0`}>
            <CardContent className="py-4 text-center">
              <div className={`text-3xl font-black ${item.color}`}>{item.value}</div>
              <div className="text-xs text-gray-500 mt-1">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Task list */}
      <Card>
        <CardHeader className="pb-2 border-b bg-gray-50/50">
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="w-5 h-5 text-blue-600" />
            {data.employeeName} 的工作任务
            <DemoBadge />
            <span className="ml-auto text-xs font-normal text-gray-400">共 {summary.total} 项</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {tasks.map((task: any) => {
            const st = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.todo;
            const pr = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
            const cat = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.daily;
            const CatIcon = cat.icon;
            const StIcon = st.icon;

            return (
              <div key={task.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <StIcon className={`w-5 h-5 mt-0.5 ${task.status === "completed" ? "text-emerald-500" : task.status === "overdue" ? "text-red-500" : "text-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{task.title}</span>
                      <Badge variant="outline" className={`text-[10px] ${pr.color}`}>{pr.label}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                      <span className={`flex items-center gap-1 text-[10px] ${cat.color}`}>
                        <CatIcon className="w-3 h-3" />{cat.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>截止: {task.dueDate}</span>
                      <span>预估: {task.estimatedHours}h</span>
                      {task.progress > 0 && task.status !== "completed" && (
                        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                          <Progress value={task.progress} className="h-1.5" />
                          <span>{task.progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 3: 工作计划 (Plan) [Demo]
// ═══════════════════════════════════════════════════════════════════════

function PlanTab({ data, loading, weekOffset, onWeekChange }: {
  data: any; loading: boolean; weekOffset: number; onWeekChange: (v: number) => void;
}) {
  if (loading) return <LoadingSkeleton />;
  if (!data?.found) return <EmptyState message="未找到工作计划数据" />;

  const scoreColor = (s: number) => s >= 85 ? "text-emerald-600" : s >= 70 ? "text-blue-600" : s >= 55 ? "text-amber-600" : "text-red-600";
  const scoreBg = (s: number) => s >= 85 ? "bg-emerald-50" : s >= 70 ? "bg-blue-50" : s >= 55 ? "bg-amber-50" : "bg-red-50";

  return (
    <div className="space-y-6">
      {/* Week navigation + rationality score */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => onWeekChange(weekOffset - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center min-w-[160px]">
                <div className="text-sm font-semibold text-gray-900">{data.weekLabel}</div>
                <div className="text-xs text-gray-500">{data.weekStartDate} 起</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => onWeekChange(weekOffset + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              {weekOffset !== 0 && (
                <Button variant="ghost" size="sm" onClick={() => onWeekChange(0)} className="text-xs">
                  回到本周
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <DemoBadge />
              <div className="text-center">
                <div className={`text-3xl font-black ${scoreColor(data.weekRationalityScore)}`}>
                  {data.weekRationalityScore}
                </div>
                <div className="text-[10px] text-gray-500">计划合理性</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rationality analysis */}
      <Card className="bg-gradient-to-r from-violet-50 to-blue-50 border-violet-200">
        <CardContent className="py-3 px-5">
          <div className="flex items-start gap-2">
            <FlaskConical className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-violet-700">AI合理性分析</span>
              <p className="text-sm text-gray-700 mt-1">{data.rationalityAnalysis}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily plans */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {data.dailyPlans.map((day: any) => (
          <Card key={day.dayName} className="overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-900">{day.dayName}</span>
                <span className="text-xs text-gray-400 ml-2">{day.date}</span>
              </div>
              <span className="text-xs text-gray-500">{day.items.length}项</span>
            </div>
            <CardContent className="p-0">
              {day.items.map((item: any, idx: number) => {
                const cfg = PLAN_TYPE_CONFIG[item.type] || PLAN_TYPE_CONFIG.task;
                return (
                  <div key={idx} className={`px-3 py-2.5 border-b last:border-b-0 border-l-4 ${cfg.color} ${cfg.bg}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-500">{item.time}</span>
                      <span className={`text-[10px] font-bold ${scoreColor(item.rationalityScore)}`}>
                        {item.rationalityScore}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-800 mt-0.5">{item.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {item.type === "meeting" ? "会议" : item.type === "task" ? "任务" : item.type === "review" ? "评审" : "培训"}
                      </Badge>
                      <span className="text-[10px] text-gray-400">{item.duration}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 4: 培训计划 (Training) [实际分析]
// ═══════════════════════════════════════════════════════════════════════

function TrainingTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <LoadingSkeleton />;
  if (!data?.found) return <EmptyState message="该员工各项能力已达标或暂无评估数据" />;

  const priorityConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    critical: { label: "紧急", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
    high: { label: "高优", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
    medium: { label: "中等", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    low: { label: "一般", color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
  };

  // Bar chart data
  const chartData = data.devPath.map((item: any) => ({
    name: item.domainCode,
    current: parseInt(item.currentLevel.replace("L", "")),
    target: parseInt(item.targetLevel.replace("L", "")),
    gap: item.gap,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-700" />
                <span className="text-base font-semibold text-emerald-800">
                  {data.employeeName} · {data.position}
                </span>
                <RealBadge />
              </div>
              <p className="text-sm text-emerald-600 mt-1">
                岗位族: {data.jobFamily} · 待提升领域: {data.devPath.length}项 · 总差距分: {data.totalGapScore}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-emerald-700">{data.devPath.length}</div>
              <div className="text-[10px] text-emerald-500">发展维度</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gap chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2 border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              能力差距可视化
              <RealBadge />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} />
                <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `L${v}`} />
                <Tooltip formatter={(v: any, name: any) => [`L${v}`, name === "current" ? "当前" : "目标"]} />
                <Legend formatter={(v) => v === "current" ? "当前等级" : "目标等级"} />
                <Bar dataKey="current" fill="#7c3aed" radius={[4, 4, 0, 0]} name="current" />
                <Bar dataKey="target" fill="#d4d4d8" radius={[4, 4, 0, 0]} name="target">
                  {chartData.map((_: any, i: number) => (
                    <Cell key={i} fill="#e2e8f0" stroke="#7c3aed" strokeWidth={1} strokeDasharray="4 2" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Dev path items */}
      <div className="space-y-4">
        {data.devPath.map((item: any, idx: number) => {
          const pc = priorityConfig[item.priority] || priorityConfig.medium;
          const PIcon = PILLAR_ICONS[item.domainCode] || Award;

          return (
            <Card key={idx} className={`${pc.bg} border ${pc.border} overflow-hidden`}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl ${pc.bg} border ${pc.border}`}>
                    <PIcon className={`w-5 h-5 ${pc.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-gray-900">{item.domainCode} · {item.domainName}</span>
                      <Badge className={`${pc.bg} ${pc.color} border ${pc.border} text-[10px]`}>{pc.label}</Badge>
                      <span className="text-xs text-gray-500">
                        {item.currentLevel} → {item.targetLevel} (差距 {item.gap} 级)
                      </span>
                    </div>

                    {/* Next level description */}
                    <div className="mt-2 px-3 py-2 bg-white/80 rounded-lg border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 mb-0.5">下一等级要求</div>
                      <p className="text-sm text-gray-700">{item.nextLevelDescription}</p>
                    </div>

                    {/* Action items */}
                    <div className="mt-3">
                      <div className="text-[10px] font-bold text-gray-400 mb-1.5">培训行动计划</div>
                      <div className="space-y-1.5">
                        {item.actionItems.map((action: string, ai: number) => (
                          <div key={ai} className="flex items-start gap-2">
                            <ArrowRight className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
                            <span className="text-sm text-gray-700">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Estimated time */}
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      预计达成周期: {item.estimatedWeeks} 周
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {data.devPath.length === 0 && (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-gray-600">恭喜! 各项能力均已达到岗位要求</p>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 5: 能力雷达 (Radar) [实际分析]
// ═══════════════════════════════════════════════════════════════════════

function RadarTab({ profile }: { profile: any }) {
  const pillars = profile.tsdcklPillars;
  if (!pillars) return <EmptyState message="暂无TSDCKL评估数据" />;

  const fullData = pillars.map((pl: any) => ({
    code: pl.code,
    name: pl.name,
    nameEn: pl.nameEn,
    score: pl.score,
    level: pl.level,
  }));

  // Detailed per-pillar analysis
  const LEVEL_DESC: Record<string, string> = {
    L1: "基础入门 — 在指导下完成基础任务",
    L2: "独立执行 — 能独立完成标准化工作",
    L3: "骨干精通 — 能指导他人并处理复杂问题",
    L4: "专家主导 — 能主导方案设计与团队管理",
    L5: "战略引领 — 能制定战略并引领行业发展",
  };

  return (
    <div className="space-y-6">
      {/* Full radar */}
      <Card>
        <CardHeader className="pb-2 border-b bg-gray-50/50">
          <CardTitle className="flex items-center gap-2 text-base">
            <RadarIcon className="w-5 h-5 text-violet-600" />
            TSDCKL 能力全景
            <RealBadge />
            <span className="ml-auto text-xs font-normal text-gray-500">
              {profile.profile.name} · {profile.profile.department} · 2026年2月评估
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={fullData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="code"
                tick={({ x, y, payload }: any) => {
                  const item = fullData.find((d: any) => d.code === payload.value);
                  return (
                    <g>
                      <text x={x} y={y - 6} textAnchor="middle" className="fill-gray-800 text-sm font-bold">{payload.value}</text>
                      <text x={x} y={y + 10} textAnchor="middle" className="fill-gray-400 text-[10px]">{item?.name || ""}</text>
                    </g>
                  );
                }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} tickCount={6} />
              <Radar dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} strokeWidth={2.5}
                dot={{ r: 5, fill: "#7c3aed", stroke: "#fff", strokeWidth: 2 }} />
              <Tooltip formatter={(v: any) => [`${v}分`, "得分"]} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pillar detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fullData.map((pl: any) => {
          const PIcon = PILLAR_ICONS[pl.code] || Award;
          const pct = pl.score;
          const color = pct >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
            : pct >= 60 ? "text-blue-600 bg-blue-50 border-blue-200"
            : pct >= 40 ? "text-amber-600 bg-amber-50 border-amber-200"
            : "text-red-600 bg-red-50 border-red-200";
          const [textColor] = color.split(" ");

          return (
            <Card key={pl.code}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl border ${color}`}>
                    <PIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">{pl.code} · {pl.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{pl.level}</Badge>
                        <span className={`text-xl font-black ${textColor}`}>{pl.score}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{pl.nameEn}</p>
                    <Progress value={pct} className="h-2 mt-2" />
                    <p className="text-xs text-gray-500 mt-2">{LEVEL_DESC[pl.level] || "评估中"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 6: 生命周期 (Lifecycle) [实际分析]
// ═══════════════════════════════════════════════════════════════════════

const TENURE_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  新员工: { color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", icon: "🌱" },
  成长期: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: "🌿" },
  骨干期: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: "🌳" },
  资深: { color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", icon: "🏔️" },
  元老: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: "👑" },
};

const MILESTONE_CONFIG: Record<string, { color: string; bg: string; icon: LucideIcon }> = {
  onboard: { color: "text-sky-600", bg: "bg-sky-100", icon: User },
  evaluation: { color: "text-violet-600", bg: "bg-violet-100", icon: Target },
  promotion: { color: "text-emerald-600", bg: "bg-emerald-100", icon: ArrowUp },
  award: { color: "text-amber-600", bg: "bg-amber-100", icon: Star },
};

function LifecycleTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <LoadingSkeleton />;
  if (!data?.found) return <EmptyState message="未找到员工生命周期数据" />;

  const { employee, tenure, salary, salaryHistory, performance, milestones } = data;
  const tc = TENURE_CONFIG[tenure.tenureCategory] || TENURE_CONFIG["成长期"];
  const trendIcon = performance.summary.trendDirection === "improving" ? TrendingUp
    : performance.summary.trendDirection === "declining" ? TrendingDown : Minus;
  const trendColor = performance.summary.trendDirection === "improving" ? "text-emerald-600"
    : performance.summary.trendDirection === "declining" ? "text-red-600" : "text-gray-500";

  return (
    <div className="space-y-6">
      {/* ─── Header: Employee + Tenure ─── */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-6 py-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-2 border-white/30">
              {employee.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{employee.name}</h2>
              <div className="flex items-center gap-3 mt-1.5 text-white/80 text-sm">
                <span>{employee.position}</span>
                <span className="text-white/40">|</span>
                <span>{employee.department}</span>
                <span className="text-white/40">|</span>
                <span>{employee.grtId}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-white/60">入职年限</div>
              <div className="text-3xl font-black text-white">{tenure.tenureDisplay}</div>
              <Badge className={`mt-1 ${tc.bg} ${tc.color} border ${tc.border} font-bold`}>
                {tc.icon} {tenure.tenureCategory}
              </Badge>
            </div>
          </div>
        </div>
        <CardContent className="py-3 px-6 bg-gray-50/50">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>入职日期: <strong>{tenure.hireDate}</strong></span>
            <span>薪资等级: <strong>{salary.grade}</strong></span>
            <span>事业部: <strong>{employee.buContext?.buName || "—"}</strong></span>
            <RealBadge />
          </div>
        </CardContent>
      </Card>

      {/* ─── Salary Structure ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2 border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              薪资结构
              <Badge variant="outline" className="text-[10px]">seeded</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {[
                { label: "基本工资", value: salary.baseSalary },
                { label: "岗位津贴", value: salary.positionAllowance },
                { label: "技术津贴", value: salary.technicalAllowance },
                { label: "保密津贴", value: salary.confidentialityAllowance },
                { label: "工龄津贴", value: salary.seniorityAllowance },
                { label: "餐补", value: salary.mealAllowance },
                { label: "交通补贴", value: salary.transportAllowance },
                { label: "通讯补贴", value: salary.communicationAllowance },
              ].filter(item => item.value > 0).map(item => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-semibold text-gray-900">¥{item.value.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="text-gray-800">固定收入合计</span>
                  <span className="text-emerald-700">¥{salary.totalFixedIncome.toLocaleString()}</span>
                </div>
              </div>
              <div className="border-t pt-2 mt-1 space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>养老 {salary.socialInsurance.pension} + 医疗 {salary.socialInsurance.medical} + 失业 {salary.socialInsurance.unemployment} + 公积金 {salary.socialInsurance.housingFund}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">五险一金(个人)</span>
                  <span className="font-semibold text-red-600">−¥{salary.socialInsurance.total.toLocaleString()}</span>
                </div>
              </div>
              <div className="border-t pt-2 mt-2 bg-emerald-50 -mx-6 px-6 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-800">预估到手月薪</span>
                  <span className="text-xl font-black text-emerald-700">¥{salary.estimatedNetMonthly.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Salary Growth Chart ─── */}
        <Card>
          <CardHeader className="pb-2 border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              薪资增长趋势
              <Badge variant="outline" className="text-[10px]">estimated</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={salaryHistory}>
                <defs>
                  <linearGradient id="salaryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any, name: any) => [
                  `¥${Number(v).toLocaleString()}`,
                  name === "baseSalary" ? "基本工资" : "总薪酬(估)"
                ]} />
                <Area type="monotone" dataKey="totalCompensation" stroke="#7c3aed" fill="url(#salaryGrad)" strokeWidth={2} name="totalCompensation" />
                <Area type="monotone" dataKey="baseSalary" stroke="#06b6d4" fill="transparent" strokeWidth={2} strokeDasharray="5 5" name="baseSalary" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {salaryHistory.map((h: any) => (
                <div key={h.year} className="text-center">
                  <div className="text-xs text-gray-500">{h.year}</div>
                  <div className="text-sm font-bold text-gray-900">¥{(h.baseSalary / 1000).toFixed(1)}k</div>
                  {h.growthRate > 0 && (
                    <div className="text-[10px] text-emerald-600 font-semibold">+{h.growthRate}%</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Performance History ─── */}
      <Card>
        <CardHeader className="pb-2 border-b bg-gray-50/50">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5 text-violet-600" />
            绩效水平与提高趋势
            <Badge variant="outline" className="text-[10px]">derived_from_tsdckl</Badge>
            <div className="ml-auto flex items-center gap-3 text-sm font-normal">
              <span className="text-gray-500">均分: <strong className="text-gray-900">{performance.summary.avgScore}</strong></span>
              <span className={`flex items-center gap-1 ${trendColor}`}>
                {(() => { const TIcon = trendIcon; return <TIcon className="w-4 h-4" />; })()}
                {performance.summary.trendDirection === "improving" ? "上升" :
                 performance.summary.trendDirection === "declining" ? "下降" : "稳定"}
                {performance.summary.improvementRate !== 0 && (
                  <span className="text-xs">({performance.summary.improvementRate > 0 ? "+" : ""}{performance.summary.improvementRate}%)</span>
                )}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={performance.quarterly} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [`${v}分`, "绩效得分"]}
                labelFormatter={(l: string) => `${l} 季度`} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {performance.quarterly.map((q: any, i: number) => (
                  <Cell key={i} fill={
                    q.grade === "S" ? "#f59e0b" :
                    q.grade === "A" ? "#22c55e" :
                    q.grade === "B" ? "#6366f1" :
                    q.grade === "C" ? "#94a3b8" : "#ef4444"
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Quarter detail grid */}
          <div className="mt-4 grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {performance.quarterly.map((q: any) => {
              const gradeColor = q.grade === "S" ? "text-amber-600 bg-amber-50 border-amber-200" :
                q.grade === "A" ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
                q.grade === "B" ? "text-blue-600 bg-blue-50 border-blue-200" :
                q.grade === "C" ? "text-gray-600 bg-gray-50 border-gray-200" :
                "text-red-600 bg-red-50 border-red-200";
              return (
                <div key={q.period} className={`text-center p-2 rounded-lg border ${gradeColor}`}>
                  <div className="text-[10px] font-medium opacity-70">{q.period}</div>
                  <div className="text-lg font-black">{q.score}</div>
                  <Badge variant="outline" className={`text-[10px] ${gradeColor} mt-0.5`}>{q.grade}</Badge>
                  <div className="text-[9px] opacity-60 mt-0.5">#{q.rank}/30</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Career Milestones ─── */}
      <Card>
        <CardHeader className="pb-2 border-b bg-gray-50/50">
          <CardTitle className="flex items-center gap-2 text-base">
            <Milestone className="w-5 h-5 text-indigo-600" />
            职业里程碑
            <RealBadge />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              {milestones.map((m: any, idx: number) => {
                const mc = MILESTONE_CONFIG[m.type] || MILESTONE_CONFIG.evaluation;
                const MIcon = mc.icon;
                return (
                  <div key={idx} className="relative flex items-start gap-4 pl-1">
                    <div className={`relative z-10 w-10 h-10 rounded-full ${mc.bg} flex items-center justify-center border-2 border-white shadow-sm`}>
                      <MIcon className={`w-4 h-4 ${mc.color}`} />
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{m.event}</span>
                        <span className="text-xs text-gray-400">{m.date}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{m.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Shared UI Components
// ═══════════════════════════════════════════════════════════════════════

function LoadingSkeleton() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="py-12 text-center">
      <p className="text-gray-500">{message}</p>
    </Card>
  );
}
