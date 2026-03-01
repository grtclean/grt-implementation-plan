/**
 * 通知中心页面
 * 集中展示所有系统通知和提醒
 *
 * Data source: trpc.notification.list / stats (DB-backed)
 */

import { useState } from "react";
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

const categoryLabels: Record<string, string> = {
  hr: "人力资源",
  procurement: "采购",
  delivery: "交付",
  meeting: "会议",
  performance: "绩效",
  system: "系统",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  return `${diffDays}天前`;
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
                    <Badge variant="destructive" className="text-xs">重要</Badge>
                  )}
                  {notification.type === "ai_suggestion" && (
                    <Badge className="bg-purple-500/20 text-purple-400 text-xs flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      AI建议
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{notification.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CategoryIcon className="w-3 h-3" />
                    <span>{categoryLabels[notification.category] ?? notification.category}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(notification.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                {!notification.isRead && (
                  <Button variant="ghost" size="sm" onClick={() => onRead(notification.id)} title="标记为已读">
                    <Check className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => onArchive(notification.id)} title="归档">
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
    onSuccess: () => { listQuery.refetch(); statsQuery.refetch(); toast.success("已将所有通知标记为已读"); },
  });
  const archiveMut = trpc.notification.archive.useMutation({
    onSuccess: () => { listQuery.refetch(); statsQuery.refetch(); toast.success("已归档通知"); },
  });
  const deleteBatchMut = trpc.notification.deleteBatch.useMutation({
    onSuccess: () => { listQuery.refetch(); statsQuery.refetch(); setSelectedNotifications(new Set()); toast.success("已删除选中通知"); },
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
        <PageHeader icon={Bell} title="通知中心" description="加载中..." />
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
          title="通知中心"
          description={stats?.unread ? `您有 ${stats.unread} 条未读通知` : "所有通知已读"}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => markAllReadMut.mutate()} disabled={markAllReadMut.isPending}>
                {markAllReadMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                全部已读
              </Button>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                通知设置
              </Button>
            </div>
          }
        />

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Bell} label="未读通知" value={stats?.unread ?? 0} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
          <StatCard icon={AlertTriangle} label="重要未读" value={stats?.importantUnread ?? 0} iconColor="text-yellow-400" iconBg="bg-yellow-500/10" />
          <StatCard icon={Zap} label="AI 建议" value={stats?.aiSuggestions ?? 0} iconColor="text-purple-400" iconBg="bg-purple-500/10" />
          <StatCard icon={Clock} label="今日通知" value={stats?.today ?? 0} iconColor="text-green-400" iconBg="bg-green-500/10" />
        </div>

        {/* Main Content */}
        <div className="flex gap-4">
          {/* Left: Notification List */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList className="bg-card/50 border border-border">
                  <TabsTrigger value="all" className="data-[state=active]:bg-primary/20">
                    全部
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="data-[state=active]:bg-primary/20">
                    未读 {(stats?.unread ?? 0) > 0 && <Badge variant="destructive" className="ml-2">{stats?.unread}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="important" className="data-[state=active]:bg-primary/20">
                    重要
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="data-[state=active]:bg-primary/20">
                    AI建议
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
                      删除选中 ({selectedNotifications.size})
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
                    全选 ({notifications.length} 条通知)
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
                      <h3 className="text-lg font-medium mb-2">暂无通知</h3>
                      <p className="text-muted-foreground">
                        {activeTab === "unread" ? "所有通知已读" : "没有符合条件的通知"}
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
                <CardTitle className="text-lg">快捷操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/ai/process-optimization"}>
                  <Zap className="w-4 h-4 mr-2" />
                  查看 AI 建议
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/offboarding"}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  待审批离职申请
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/supply-chain/smart-inventory"}>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  库存预警
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/delivery-management"}>
                  <Truck className="w-4 h-4 mr-2" />
                  待处理交付任务
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border mt-4">
              <CardHeader>
                <CardTitle className="text-lg">通知偏好</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI 建议通知</span>
                  <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">系统消息</span>
                  <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">任务提醒</span>
                  <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">会议提醒</span>
                  <Checkbox defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
