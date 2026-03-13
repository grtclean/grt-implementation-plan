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
import QueryErrorBanner from "@/components/QueryErrorBanner";

// ---------------------------------------------------------------------------
// Time-based greeting
// ---------------------------------------------------------------------------
function getGreeting(t: (key: string) => string) {
  const h = new Date().getHours();
  if (h < 12) return t("portal.greetingMorning");
  if (h < 18) return t("portal.greetingAfternoon");
  return t("portal.greetingEvening");
}

function GreetingIcon() {
  const h = new Date().getHours();
  if (h < 12) return <Sun className="w-5 h-5 text-amber-500" />;
  if (h < 18) return <Sunset className="w-5 h-5 text-orange-500" />;
  return <Moon className="w-5 h-5 text-indigo-500" />;
}

// ---------------------------------------------------------------------------
// Feed types (backed by notification.list)
// ---------------------------------------------------------------------------
type FeedTab = "all" | "tasks" | "docs" | "approvals";

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

const FEED_TABS: { key: FeedTab; i18nKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all",       i18nKey: "portal.feed.all",       icon: Bell },
  { key: "tasks",     i18nKey: "portal.feed.tasks",     icon: CheckSquare },
  { key: "docs",      i18nKey: "portal.feed.docs",      icon: FileText },
  { key: "approvals", i18nKey: "portal.feed.approvals", icon: AlertCircle },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTimeAgo(dateString: string): string {
  if (!dateString) return "-";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PersonalizedPortal() {
  const { currentUserRole } = useUserProfile();
  const { language, t } = useLanguage();
  const isZh = language === "zh";
  const [feedTab, setFeedTab] = useState<FeedTab>("all");

  // tRPC queries
  const perfQuery = trpc.aiPerformance.dashboard.useQuery();
  const statsQuery = trpc.aiPerformance.actionItemStats.useQuery({ months: 6 });
  const notifQuery = trpc.notification.list.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });

  const portalQueryError = perfQuery.error || statsQuery.error;
  const perf = perfQuery.data;
  const stats = statsQuery.data ?? [];

  // Map notifications to feed items
  const CATEGORY_DEPT: Record<string, { zh: string; en: string }> = {
    hr: { zh: "HR", en: "HR" },
    procurement: { zh: "采购", en: "Procure" },
    delivery: { zh: "项目管理", en: "PM" },
    meeting: { zh: "协作", en: "Collab" },
    performance: { zh: "绩效", en: "Perf" },
    system: { zh: "系统", en: "System" },
  };
  const TYPE_TO_FEED: Record<string, string> = {
    warning: "task", error: "task", ai_suggestion: "task",
    info: "doc", success: "approval",
  };
  const TYPE_PRIORITY: Record<string, string> = {
    error: "high", warning: "medium", ai_suggestion: "medium",
    info: "low", success: "low",
  };

  const notifItems = (notifQuery.data?.items ?? []) as any[];
  const feedItems = notifItems.map((n: any) => ({
    id: n.id,
    type: TYPE_TO_FEED[n.type] ?? "doc",
    dept: CATEGORY_DEPT[n.category]?.zh ?? n.category,
    deptEn: CATEGORY_DEPT[n.category]?.en ?? n.category,
    text: n.title,
    textEn: n.title,
    time: formatTimeAgo(n.createdAt),
    priority: n.isImportant ? "high" : (TYPE_PRIORITY[n.type] ?? "low"),
  }));

  const filteredFeed = feedTab === "all"
    ? feedItems
    : feedItems.filter((f: any) =>
        feedTab === "tasks" ? f.type === "task"
          : feedTab === "docs" ? f.type === "doc"
          : f.type === "approval"
      );

  // Aggregate from actionItemStats
  const latestStats = stats.length > 0 ? stats[stats.length - 1] : null;

  return (
    <div className="flex flex-col h-full overflow-auto">
      {portalQueryError && <div className="px-6 pt-4"><QueryErrorBanner error={portalQueryError} onRetry={() => { perfQuery.refetch(); statsQuery.refetch(); }} /></div>}
      {/* Greeting Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <GreetingIcon />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {getGreeting(t)}, {currentUserRole}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("portal.subtitle")}
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
                  <span>{t(tab.i18nKey)}</span>
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
              {t("portal.actionItemTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsQuery.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : stats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t("portal.noData")}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-blue-50">
                  <p className="text-2xl font-bold text-blue-600">{latestStats?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{t("portal.total")}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-50">
                  <p className="text-2xl font-bold text-green-600">{latestStats?.completed ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{t("portal.completed")}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50">
                  <p className="text-2xl font-bold text-red-600">{latestStats?.overdue ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{t("portal.overdue")}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-50">
                  <p className="text-2xl font-bold text-amber-600">{latestStats?.rate ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">{t("portal.completionRate")}</p>
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
              {t("portal.aiPerfSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {perfQuery.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !perf ? (
              <p className="text-sm text-muted-foreground py-4">{t("portal.noPerfData")}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-indigo-50">
                  <p className="text-2xl font-bold text-indigo-600">{perf.avgMeetingScore ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{t("portal.avgScore")}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-emerald-50">
                  <p className="text-2xl font-bold text-emerald-600">{perf.actionItemCompletionRate ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">{t("portal.completion")}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-orange-50">
                  <p className="text-2xl font-bold text-orange-600">{perf.employeesEvaluated ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{t("portal.evaluated")}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-purple-50">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-bold text-purple-600">{perf.topPerformer?.name ?? "-"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("portal.topPerformer")}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
