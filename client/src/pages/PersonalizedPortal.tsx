/**
 * Personalized Portal — 个人门户 (/my-workspace)
 *
 * Time-based greeting, cross-department feed, action item stats,
 * and AI performance widget.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sun,
  Moon,
  Sunset,
  Loader2,
  CheckSquare,
  FileText,
  Bell,
  TrendingUp,
  BarChart3,
  Clock,
  Users,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Time-based greeting
// ---------------------------------------------------------------------------
function getGreeting(isZh: boolean) {
  const h = new Date().getHours();
  if (h < 12) return isZh ? "早上好" : "Good morning";
  if (h < 18) return isZh ? "下午好" : "Good afternoon";
  return isZh ? "晚上好" : "Good evening";
}

function GreetingIcon() {
  const h = new Date().getHours();
  if (h < 12) return <Sun className="w-5 h-5 text-amber-500" />;
  if (h < 18) return <Sunset className="w-5 h-5 text-orange-500" />;
  return <Moon className="w-5 h-5 text-indigo-500" />;
}

// ---------------------------------------------------------------------------
// Mock feed data
// ---------------------------------------------------------------------------
type FeedTab = "all" | "tasks" | "docs" | "approvals";

const MOCK_FEED = [
  { id: 1, type: "task",     dept: "项目管理", deptEn: "PM",      text: "M3 Gate Review — CX200项目待审核", textEn: "M3 Gate Review — CX200 pending", time: "10min", priority: "high" },
  { id: 2, type: "doc",      dept: "研发",     deptEn: "R&D",     text: "FMEA文档 v2.3 已更新",          textEn: "FMEA doc v2.3 updated",          time: "25min", priority: "medium" },
  { id: 3, type: "approval", dept: "HR",       deptEn: "HR",      text: "出差申请待审批 — 张三",           textEn: "Travel request pending — Zhang",  time: "1h",    priority: "medium" },
  { id: 4, type: "task",     dept: "客服",     deptEn: "CS",      text: "客户投诉 #892 待跟进",           textEn: "Complaint #892 follow-up",        time: "2h",    priority: "high" },
  { id: 5, type: "doc",      dept: "质量",     deptEn: "Quality", text: "8D报告已提交 — 供应商B",          textEn: "8D report submitted — Vendor B",  time: "3h",    priority: "low" },
  { id: 6, type: "approval", dept: "财务",     deptEn: "Finance", text: "费用报销 ¥12,500 待审批",        textEn: "Expense ¥12,500 pending",         time: "4h",    priority: "low" },
  { id: 7, type: "task",     dept: "采购",     deptEn: "Procure", text: "供应商评审截止明日",              textEn: "Supplier audit due tomorrow",     time: "5h",    priority: "medium" },
  { id: 8, type: "doc",      dept: "制造",     deptEn: "Mfg",     text: "SOP-MF-021 版本更新通知",        textEn: "SOP-MF-021 version update",       time: "6h",    priority: "low" },
];

const DEPT_COLORS: Record<string, string> = {
  "项目管理": "bg-blue-100 text-blue-700",
  "研发": "bg-purple-100 text-purple-700",
  "HR": "bg-pink-100 text-pink-700",
  "客服": "bg-green-100 text-green-700",
  "质量": "bg-amber-100 text-amber-700",
  "财务": "bg-emerald-100 text-emerald-700",
  "采购": "bg-cyan-100 text-cyan-700",
  "制造": "bg-orange-100 text-orange-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-gray-100 text-gray-500",
};

const FEED_TABS: { key: FeedTab; labelZh: string; labelEn: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all",       labelZh: "全部",   labelEn: "All",       icon: Bell },
  { key: "tasks",     labelZh: "任务",   labelEn: "Tasks",     icon: CheckSquare },
  { key: "docs",      labelZh: "文档",   labelEn: "Docs",      icon: FileText },
  { key: "approvals", labelZh: "审批",   labelEn: "Approvals", icon: AlertCircle },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PersonalizedPortal() {
  const { currentUserRole } = useUserProfile();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [feedTab, setFeedTab] = useState<FeedTab>("all");

  // tRPC queries
  const perfQuery = trpc.aiPerformance.dashboard.useQuery();
  const statsQuery = trpc.aiPerformance.actionItemStats.useQuery({ months: 6 });

  const perf = perfQuery.data;
  const stats = statsQuery.data ?? [];

  const filteredFeed = feedTab === "all"
    ? MOCK_FEED
    : MOCK_FEED.filter((f) =>
        feedTab === "tasks" ? f.type === "task"
          : feedTab === "docs" ? f.type === "doc"
          : f.type === "approval"
      );

  // Aggregate from actionItemStats
  const latestStats = stats.length > 0 ? stats[stats.length - 1] : null;

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Greeting Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <GreetingIcon />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {getGreeting(isZh)}，{currentUserRole}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isZh ? "这是您的个人工作门户" : "Your personalized workspace portal"}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex-1 p-6 space-y-6">
        {/* Section A: Cross-Department Feed */}
        <div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border mb-4">
            {FEED_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFeedTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    feedTab === tab.key
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
          <div className="space-y-2">
            {filteredFeed.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                <Badge className={`text-[10px] px-1.5 py-0.5 ${DEPT_COLORS[item.dept] ?? "bg-gray-100 text-gray-700"}`}>
                  {isZh ? item.dept : item.deptEn}
                </Badge>
                <p className="flex-1 text-sm text-foreground truncate">{isZh ? item.text : item.textEn}</p>
                <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[item.priority]}`}>
                  {item.priority}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section B: Action Item Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              {isZh ? "行动项趋势" : "Action Item Trend"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsQuery.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : stats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{isZh ? "暂无数据" : "No data yet"}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-blue-50">
                  <p className="text-2xl font-bold text-blue-600">{latestStats?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{isZh ? "总计" : "Total"}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-50">
                  <p className="text-2xl font-bold text-green-600">{latestStats?.completed ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{isZh ? "已完成" : "Completed"}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50">
                  <p className="text-2xl font-bold text-red-600">{latestStats?.overdue ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{isZh ? "逾期" : "Overdue"}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-50">
                  <p className="text-2xl font-bold text-amber-600">{latestStats?.rate ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">{isZh ? "完成率" : "Rate"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section C: Performance Widget */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              {isZh ? "AI 绩效摘要" : "AI Performance Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {perfQuery.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !perf ? (
              <p className="text-sm text-muted-foreground py-4">{isZh ? "暂无绩效数据" : "No performance data"}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-indigo-50">
                  <p className="text-2xl font-bold text-indigo-600">{perf.avgMeetingScore ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{isZh ? "综合评分" : "Avg Score"}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-emerald-50">
                  <p className="text-2xl font-bold text-emerald-600">{perf.actionItemCompletionRate ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">{isZh ? "完成率" : "Completion"}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-orange-50">
                  <p className="text-2xl font-bold text-orange-600">{perf.employeesEvaluated ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{isZh ? "评估人数" : "Evaluated"}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-purple-50">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-bold text-purple-600">{perf.topPerformer?.name ?? "-"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{isZh ? "最佳员工" : "Top Performer"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
