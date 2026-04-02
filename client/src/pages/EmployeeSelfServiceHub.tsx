/**
 * 员工自助中心 (Employee Self-Service Hub)
 *
 * 一站式入口：我的绩效·目标进度·工作顾问·360画像·成长积分·报销进度
 * 所有员工可见，触控友好
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  Target, BarChart3, Bot, Star, GraduationCap, Receipt,
  Clock, Calendar, ChevronRight, CheckCircle2, TrendingUp,
  Award, MessageSquare, User, Sparkles, FileText,
} from "lucide-react";

interface HubCard {
  id: string;
  labelZh: string;
  labelEn: string;
  icon: typeof Target;
  path: string;
  color: string;
  bgColor: string;
  descZh: string;
  descEn: string;
}

const CARDS: HubCard[] = [
  { id: "performance", labelZh: "我的绩效", labelEn: "My Performance", icon: BarChart3, path: "/my-performance", color: "#2563eb", bgColor: "#dbeafe", descZh: "岗位看板·标准vs实际", descEn: "Position board" },
  { id: "goals", labelZh: "目标进度", labelEn: "Goal Tracking", icon: Target, path: "/goal-tracking", color: "#16a34a", bgColor: "#dcfce7", descZh: "年度目标完成率·检查点", descEn: "Annual goal progress" },
  { id: "consultant", labelZh: "工作顾问", labelEn: "Work Consultant", icon: Bot, path: "/employee-consultant", color: "#9333ea", bgColor: "#f3e8ff", descZh: "AI对话·日报·方法建议", descEn: "AI chat & daily digest" },
  { id: "360", labelZh: "360画像", labelEn: "360 Profile", icon: Star, path: "/my-360-profile", color: "#ea580c", bgColor: "#ffedd5", descZh: "能力雷达·差距分析", descEn: "Capability radar" },
  { id: "growth", labelZh: "成长平台", labelEn: "Growth", icon: GraduationCap, path: "/employee-growth", color: "#0891b2", bgColor: "#cffafe", descZh: "学习路径·等级晋升", descEn: "Learning & leveling" },
  { id: "points", labelZh: "我的积分", labelEn: "My Points", icon: Award, path: "/employee-points", color: "#7c3aed", bgColor: "#ede9fe", descZh: "积分中心·兑换奖励", descEn: "Points & rewards" },
  { id: "feedback", labelZh: "360反馈", labelEn: "360 Feedback", icon: MessageSquare, path: "/360-feedback", color: "#dc2626", bgColor: "#fee2e2", descZh: "给同事/上级打分·收反馈", descEn: "Rate peers & get feedback" },
  { id: "expense", labelZh: "我的报销", labelEn: "My Expense", icon: Receipt, path: "/expense-report", color: "#b45309", bgColor: "#fef3c7", descZh: "提交报销·进度查询", descEn: "Submit & track claims" },
  { id: "incentive", labelZh: "激励试算", labelEn: "Incentive Calc", icon: TrendingUp, path: "/incentive-projection", color: "#059669", bgColor: "#d1fae5", descZh: "奖金预估·What-If模拟", descEn: "Bonus projection" },
  { id: "attendance", labelZh: "考勤打卡", labelEn: "Attendance", icon: Clock, path: "/attendance-clock", color: "#6366f1", bgColor: "#e0e7ff", descZh: "GPS打卡·考勤记录", descEn: "GPS clock-in" },
  { id: "profile", labelZh: "个人设置", labelEn: "Profile", icon: User, path: "/user-profile", color: "#64748b", bgColor: "#f1f5f9", descZh: "头像·密码·偏好设置", descEn: "Avatar & preferences" },
  { id: "onboarding", labelZh: "入职填报", labelEn: "Onboarding", icon: FileText, path: "/new-hire-onboarding", color: "#f97316", bgColor: "#fff7ed", descZh: "新员工资料提交", descEn: "New hire form" },
];

export default function EmployeeSelfServiceHub() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const isZh = language === "zh";

  // 简单统计
  const goalQ = trpc.annualGoalIncentive.dashboard.employeeSummary.useQuery(
    { employeeId: user?.id ?? 0, year: new Date().getFullYear() },
    { enabled: !!user?.id, retry: false },
  );
  const goal = goalQ.data as any;
  const agreement = goal?.agreement;

  return (
    <div className="space-y-6 p-4 md:p-6 pb-20">
      {/* 顶部 */}
      <header className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{isZh ? "员工自助中心" : "Self-Service Hub"}</h1>
          <p className="text-sm text-muted-foreground">
            {user?.name || (isZh ? "员工" : "Employee")} · {new Date().toLocaleDateString(isZh ? "zh-CN" : "en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
      </header>

      {/* 目标进度概览（如有） */}
      {agreement && (
        <button onClick={() => navigate("/goal-tracking")} className="w-full text-left touch-feedback">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold">{new Date().getFullYear()} {isZh ? "年度目标" : "Annual Goal"}</span>
                  <Badge variant="outline" className="text-[10px]">{agreement.status === "active" ? (isZh ? "执行中" : "Active") : agreement.status}</Badge>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              {goal?.dimensions && (
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  {(goal.dimensions as any[]).slice(0, 3).map((d: any) => (
                    <span key={d.id} className="flex items-center gap-1">
                      <span className="font-medium">{d.dimensionName}</span>
                      <span className="font-mono font-bold text-foreground">{parseFloat(d.currentScore || "0").toFixed(0)}</span>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </button>
      )}

      {/* 功能卡片网格 */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 tracking-wider uppercase">
          {isZh ? "我的服务" : "My Services"}
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => navigate(card.path)}
                className="touch-feedback active:scale-[0.96] transition-transform"
              >
                <Card className="h-full border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-3 flex flex-col items-center gap-2 min-h-[85px] justify-center text-center">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: card.bgColor, color: card.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold leading-tight">{isZh ? card.labelZh : card.labelEn}</p>
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
