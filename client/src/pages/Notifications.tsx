/**
 * 通知中心页面
 * 集中展示所有系统通知和提醒
 *
 * Data source: trpc.notification.list / stats (DB-backed)
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Zap,
  UserPlus,
  ShoppingCart,
  Truck,
  Award,
  Calendar,
  XCircle,
  Check,
  Trash2,
  Settings,
  Archive,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// 辅助组件和函数
// ============================================================================

const typeIcons: Record<string, any> = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle2,
  ai_suggestion: Zap,
};

const typeColors: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  error: "bg-red-500/20 text-red-400",
  success: "bg-green-500/20 text-green-400",
  ai_suggestion: "bg-purple-500/20 text-purple-400",
};

const categoryIcons: Record<string, any> = {
  hr: UserPlus,
  procurement: ShoppingCart,
  delivery: Truck,
  meeting: Calendar,
  performance: Award,
  system: Settings,
};

const categoryLabelKeys: Record<string, string> = {
  hr: "common.notifications.catHr",
  procurement: "common.notifications.catProcurement",
  delivery: "common.notifications.catDelivery",
  meeting: "common.notifications.catMeeting",
  performance: "common.notifications.catPerformance",
  system: "common.notifications.catSystem",
};

function formatTimeAgo(dateString: string, t: (k: string) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return t("common.notifications.justNow");
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  isRead: boolean;
  isImportant: boolean;
  actionUrl?: string;
  createdAt: string;
}

function NotificationCard({ notification, onRead, onArchive }: {
  notification: NotificationItem;
  onRead: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const { t } = useLanguage();
  const TypeIcon = typeIcons[notification.type] ?? Info;
  const CategoryIcon = categoryIcons[notification.category] ?? Settings;

  return (
    <Card className={`bg-card/50 border-border hover:border-primary/50 transition-colors ${!notification.isRead ? "border-primary/50" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className={`p-2 rounded-lg ${typeColors[notification.type] ?? "bg-gray-500/20 text-gray-400"}`}>
              <TypeIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-medium ${!notification.isRead ? "font-semibold" : ""}`}>
                    {notification.title}
                  </h3>
                  {notification.isImportant && (
                    <Badge variant="destructive" className="text-xs">{t("common.notifications.important")}</Badge>
                  )}
                  {notification.type === "ai_suggestion" && (
                    <Badge className="bg-purple-500/20 text-purple-400 text-xs flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {t("common.notifications.tabAi")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{notification.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CategoryIcon className="w-3 h-3" />
                    <span>{categoryLabelKeys[notification.category] ? t(categoryLabelKeys[notification.category]) : notification.category}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(notification.createdAt, t)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                {!notification.isRead && (
                  <Button variant="ghost" size="sm" onClick={() => onRead(notification.id)} title={t("common.notifications.markAsRead")}>
                    <Check className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => onArchive(notification.id)} title={t("common.notifications.archive")}>
                  <Archive className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 主组件
// ============================================================================

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

export default function Notifications() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "important" | "ai">("all");
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  // ─── tRPC Queries ───
  const listQuery = trpc.notification.list.useQuery(
    { filter: activeTab },
    QUERY_OPTS,
  );
  const statsQuery = trpc.notification.stats.useQuery(undefined, QUERY_OPTS);

  const markReadMut = trpc.notification.markRead.useMutation({
    onSuccess: () => { listQuery.refetch(); statsQuery.refetch(); },
  });
  const markAllReadMut = trpc.notification.markAllRead.useMutation({
    onSuccess: () => { listQuery.refetch(); statsQuery.refetch(); toast.success(t("common.notifications.markedAllRead")); },
  });
  const archiveMut = trpc.notification.archive.useMutation({
    onSuccess: () => { listQuery.refetch(); statsQuery.refetch(); toast.success(t("common.notifications.archived")); },
  });
  const deleteBatchMut = trpc.notification.deleteBatch.useMutation({
    onSuccess: () => { listQuery.refetch(); statsQuery.refetch(); setSelectedNotifications(new Set()); toast.success(t("common.notifications.deleted")); },
  });

  const notifications = (listQuery.data?.items ?? []) as NotificationItem[];
  const stats = statsQuery.data;
  const isLoading = listQuery.isLoading;

  const handleSelectAll = () => {
    if (selectedNotifications.size === notifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(notifications.map(n => n.id)));
    }
  };

  const handleRead = (id: string) => {
    markReadMut.mutate({ id });
  };

  const handleArchive = (id: string) => {
    archiveMut.mutate({ id });
  };

  // ─── Loading State ───
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Bell} title={t("common.notifications.title")} description={t("common.notifications.loading")} />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Bell}
          title={t("common.notifications.title")}
          description={stats?.unread ? `${stats.unread} ${t("common.notifications.unread")}` : t("common.notifications.allRead")}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => markAllReadMut.mutate()} disabled={markAllReadMut.isPending}>
                {markAllReadMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                {t("common.notifications.markAllRead")}
              </Button>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                {t("common.notifications.notifSettings")}
              </Button>
            </div>
          }
        />

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Bell} label={t("common.notifications.unread")} value={stats?.unread ?? 0} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
          <StatCard icon={AlertTriangle} label={t("common.notifications.importantUnread")} value={stats?.importantUnread ?? 0} iconColor="text-yellow-400" iconBg="bg-yellow-500/10" />
          <StatCard icon={Zap} label={t("common.notifications.aiSuggestions")} value={stats?.aiSuggestions ?? 0} iconColor="text-purple-400" iconBg="bg-purple-500/10" />
          <StatCard icon={Clock} label={t("common.notifications.today")} value={stats?.today ?? 0} iconColor="text-green-400" iconBg="bg-green-500/10" />
        </div>

        {/* Main Content */}
        <div className="flex gap-4">
          {/* Left: Notification List */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList className="bg-card/50 border border-border">
                  <TabsTrigger value="all" className="data-[state=active]:bg-primary/20">
                    {t("common.notifications.tabAll")}
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="data-[state=active]:bg-primary/20">
                    {t("common.notifications.tabUnread")} {(stats?.unread ?? 0) > 0 && <Badge variant="destructive" className="ml-2">{stats?.unread}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="important" className="data-[state=active]:bg-primary/20">
                    {t("common.notifications.tabImportant")}
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="data-[state=active]:bg-primary/20">
                    {t("common.notifications.tabAi")}
                  </TabsTrigger>
                </TabsList>

                {selectedNotifications.size > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => deleteBatchMut.mutate({ ids: Array.from(selectedNotifications) })}
                      disabled={deleteBatchMut.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t("common.notifications.deleteSelected")} ({selectedNotifications.size})
                    </Button>
                  </div>
                )}
              </div>

              {/* Select All Checkbox */}
              {notifications.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Checkbox
                    id="select-all"
                    checked={selectedNotifications.size === notifications.length && notifications.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm cursor-pointer">
                    {t("common.notifications.selectAll")} ({notifications.length})
                  </label>
                </div>
              )}

              {/* Notification List */}
              <TabsContent value={activeTab} className="space-y-3 mt-0">
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onRead={handleRead}
                        onArchive={handleArchive}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-card/50 border-border">
                    <CardContent className="p-8 text-center">
                      <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                      <h3 className="text-lg font-medium mb-2">{t("common.notifications.noNotifications")}</h3>
                      <p className="text-muted-foreground">
                        {activeTab === "unread" ? t("common.notifications.allReadMsg") : t("common.notifications.noMatch")}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Quick Actions */}
          <div className="w-64 hidden lg:block">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg">{t("common.notifications.quickActions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/ai/process-optimization"}>
                  <Zap className="w-4 h-4 mr-2" />
                  {t("common.notifications.viewAiSuggestions")}
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/offboarding"}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t("common.notifications.pendingOffboarding")}
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/supply-chain/smart-inventory"}>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {t("common.notifications.inventoryAlert")}
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/delivery-management"}>
                  <Truck className="w-4 h-4 mr-2" />
                  {t("common.notifications.pendingDelivery")}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border mt-4">
              <CardHeader>
                <CardTitle className="text-lg">{t("common.notifications.preferences")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("common.notifications.aiNotif")}</span>
                  <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("common.notifications.systemMsg")}</span>
                  <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("common.notifications.taskReminder")}</span>
                  <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("common.notifications.meetingReminder")}</span>
                  <Checkbox defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
