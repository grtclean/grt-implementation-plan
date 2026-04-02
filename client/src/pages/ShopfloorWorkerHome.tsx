/**
 * 产线员工专属首页 (Shopfloor Worker Home)
 *
 * 设计原则：
 * - 大按钮、高对比度 — 适合车间光线环境
 * - 触控友好 — 最小 80px 高度，戴手套可操作
 * - 信息精简 — 只显示今日核心任务数据
 * - 零学习成本 — 图标 + 中文大字
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import {
  ClipboardList,
  Play,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  User,
  ChevronRight,
} from "lucide-react";

interface QuickAction {
  id: string;
  labelZh: string;
  labelEn: string;
  icon: typeof ClipboardList;
  path: string;
  color: string;
  bgColor: string;
  descZh: string;
  descEn: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "work-order",
    labelZh: "我的工单",
    labelEn: "My Orders",
    icon: ClipboardList,
    path: "/worker-mobile",
    color: "#2563eb",
    bgColor: "#dbeafe",
    descZh: "查看分配的工单任务",
    descEn: "View assigned work orders",
  },
  {
    id: "clock-in",
    labelZh: "扫码报工",
    labelEn: "Clock In",
    icon: Play,
    path: "/kiosk",
    color: "#16a34a",
    bgColor: "#dcfce7",
    descZh: "开始/结束工序计时",
    descEn: "Start/stop time tracking",
  },
  {
    id: "sop",
    labelZh: "SOP查看",
    labelEn: "SOP Guide",
    icon: FileText,
    path: "/sop-process-card",
    color: "#9333ea",
    bgColor: "#f3e8ff",
    descZh: "工艺卡片与操作指南",
    descEn: "Process cards & guides",
  },
  {
    id: "exception",
    labelZh: "异常上报",
    labelEn: "Report Issue",
    icon: AlertTriangle,
    path: "/production-exception-report",
    color: "#dc2626",
    bgColor: "#fee2e2",
    descZh: "设备故障·物料缺失·质量异常",
    descEn: "Equipment · Material · Quality",
  },
  {
    id: "performance",
    labelZh: "我的绩效",
    labelEn: "My Stats",
    icon: TrendingUp,
    path: "/worker-performance",
    color: "#ea580c",
    bgColor: "#ffedd5",
    descZh: "工时统计与效率排名",
    descEn: "Hours & efficiency ranking",
  },
  {
    id: "shift",
    labelZh: "交接班",
    labelEn: "Shift Handover",
    icon: Clock,
    path: "/shift-handover",
    color: "#0891b2",
    bgColor: "#cffafe",
    descZh: "查看交接班记录",
    descEn: "View handover log",
  },
];

export default function ShopfloorWorkerHome() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const isZh = language === "zh";

  // 今日工时摘要
  const summaryQ = trpc.processSteps.getWorkerDailySummary.useQuery(undefined, {
    retry: false,
    refetchInterval: 60_000,
  });
  const assignmentsQ = trpc.processSteps.getWorkerAssignments.useQuery(undefined, {
    retry: false,
  });

  const summary = summaryQ.data as any;
  const assignments = (assignmentsQ.data as any[]) || [];
  const activeTask = assignments.find((a: any) => a.status === "in_progress");
  const pendingCount = assignments.filter((a: any) => a.status === "pending" || a.status === "assigned").length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-4 pb-20 md:pb-4">
      {/* 顶部：欢迎 + 状态 */}
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">
              {isZh ? `${user?.name || "员工"}，你好` : `Hi, ${user?.name || "Worker"}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString(isZh ? "zh-CN" : "en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* 今日概览条 */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            label={isZh ? "待处理" : "Pending"}
            value={pendingCount}
            color="#2563eb"
            icon={<ClipboardList className="w-4 h-4" />}
          />
          <StatCard
            label={isZh ? "今日工时" : "Today Hrs"}
            value={summary?.todayHours?.toFixed(1) || "0"}
            suffix="h"
            color="#16a34a"
            icon={<Clock className="w-4 h-4" />}
          />
          <StatCard
            label={isZh ? "已完成" : "Done"}
            value={summary?.completedToday || 0}
            color="#9333ea"
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
        </div>
      </header>

      {/* 正在进行的任务 — 醒目提示 */}
      {activeTask && (
        <button
          onClick={() => navigate("/worker-mobile")}
          className="w-full mb-4 p-4 rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-950/30 text-left touch-feedback active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <Play className="w-6 h-6 text-green-600" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-green-800 dark:text-green-200 truncate">
                  {isZh ? "正在计时" : "Timer Running"}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 truncate">
                  {activeTask.processName || activeTask.stepName || "—"}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-green-400 flex-shrink-0" />
          </div>
        </button>
      )}

      {/* 六宫格快捷入口 */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 tracking-wider uppercase">
          {isZh ? "快捷操作" : "Quick Actions"}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => navigate(action.path)}
                className="touch-feedback active:scale-[0.97] transition-transform"
              >
                <Card className="h-full border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col items-start gap-3 min-h-[100px]">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: action.bgColor, color: action.color }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-base font-bold leading-tight">
                        {isZh ? action.labelZh : action.labelEn}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {isZh ? action.descZh : action.descEn}
                      </p>
                    </div>
                    {action.id === "work-order" && pendingCount > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 absolute top-2 right-2">
                        {pendingCount}
                      </Badge>
                    )}
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

/** 顶部统计小卡片 */
function StatCard({
  label,
  value,
  suffix,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 border p-3 text-center shadow-sm">
      <div className="flex items-center justify-center gap-1 mb-1" style={{ color }}>
        {icon}
        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold tabular-nums" style={{ color }}>
        {value}
        {suffix && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}
