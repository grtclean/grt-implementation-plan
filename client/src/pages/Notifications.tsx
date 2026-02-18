/**
 * 通知中心页面
 * 集中展示所有系统通知和提醒
 */

import { useState } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
  Filter,
  Check,
  Trash2,
  Settings,
  Archive,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// 类型定义
// ============================================================================

interface Notification {
  id: string;
  title: string;
  description: string;
  type: "info" | "warning" | "error" | "success" | "ai_suggestion";
  category: "hr" | "procurement" | "delivery" | "meeting" | "performance" | "system";
  isRead: boolean;
  isImportant: boolean;
  createdAt: string;
  actionUrl?: string;
}

// ============================================================================
// 模拟数据
// ============================================================================

const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "AI 优化建议：招聘流程可提升40%",
    description: "基于历史数据分析，建议优化招聘流程，减少面试轮次，预期可缩短招聘周期40%。",
    type: "ai_suggestion",
    category: "hr",
    isRead: false,
    isImportant: true,
    createdAt: "2024-02-11T09:30:00",
    actionUrl: "/ai/process-optimization",
  },
  {
    id: "2",
    title: "待审批：李四的离职申请",
    description: "销售部员工李四提交了离职申请，最后工作日为2024-03-10。",
    type: "warning",
    category: "hr",
    isRead: false,
    isImportant: true,
    createdAt: "2024-02-11T08:45:00",
    actionUrl: "/offboarding",
  },
  {
    id: "3",
    title: "采购订单 PO-2024-045 已发货",
    description: "供应商A已发货，预计3天内到达。",
    type: "info",
    category: "procurement",
    isRead: false,
    isImportant: false,
    createdAt: "2024-02-11T08:00:00",
    actionUrl: "/pos/procurement",
  },
  {
    id: "4",
    title: "交付任务 DEL-2024-003 进入 M9 阶段",
    description: "比亚迪项目已进入终验收阶段，请准备验收资料。",
    type: "success",
    category: "delivery",
    isRead: true,
    isImportant: true,
    createdAt: "2024-02-10T16:30:00",
    actionUrl: "/delivery-management",
  },
  {
    id: "5",
    title: "会议提醒：项目周会",
    description: "今天14:00在会议室A进行项目周会，请准时参加。",
    type: "info",
    category: "meeting",
    isRead: false,
    isImportant: false,
    createdAt: "2024-02-11T07:00:00",
    actionUrl: "/meeting-intelligence",
  },
  {
    id: "6",
    title: "转正评估提醒：张三的90天评估",
    description: "张三的90天试用期评估将在5天后到期，请及时完成评估。",
    type: "warning",
    category: "hr",
    isRead: true,
    isImportant: false,
    createdAt: "2024-02-10T14:20:00",
    actionUrl: "/employee-management",
  },
  {
    id: "7",
    title: "库存预警：超声波换能器库存不足",
    description: "超声波换能器当前库存20个，低于最低库存50个，请及时补货。",
    type: "error",
    category: "procurement",
    isRead: true,
    isImportant: true,
    createdAt: "2024-02-10T10:15:00",
    actionUrl: "/material-shortage-alert",
  },
  {
    id: "8",
    title: "绩效更新：1月度个人绩效已发布",
    description: "您1月度的个人绩效已发布，请查看详细报告。",
    type: "success",
    category: "performance",
    isRead: true,
    isImportant: false,
    createdAt: "2024-02-10T09:00:00",
    actionUrl: "/my-performance",
  },
];

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

function NotificationCard({ notification, onRead, onArchive }: {
  notification: Notification;
  onRead: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const TypeIcon = typeIcons[notification.type];
  const CategoryIcon = categoryIcons[notification.category];

  return (
    <Card className={`bg-card/50 border-border hover:border-primary/50 transition-colors ${!notification.isRead ? "border-primary/50" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* 图标 */}
          <div className="flex-shrink-0">
            <div className={`p-2 rounded-lg ${typeColors[notification.type]}`}>
              <TypeIcon className="w-5 h-5" />
            </div>
          </div>

          {/* 内容 */}
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
                    <span>{categoryLabels[notification.category]}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(notification.createdAt)}</span>
                  </div>
                </div>
              </div>
              {/* 操作按钮 */}
              <div className="flex gap-1 ml-2">
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRead(notification.id)}
                    title="标记为已读"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onArchive(notification.id)}
                  title="归档"
                >
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

export default function Notifications() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  // 根据标签筛选通知
  const getFilteredNotifications = () => {
    switch (activeTab) {
      case "unread":
        return mockNotifications.filter(n => !n.isRead);
      case "important":
        return mockNotifications.filter(n => n.isImportant);
      case "ai":
        return mockNotifications.filter(n => n.type === "ai_suggestion");
      default:
        return mockNotifications;
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = mockNotifications.filter(n => !n.isRead).length;
  const aiSuggestionCount = mockNotifications.filter(n => n.type === "ai_suggestion").length;
  const importantCount = mockNotifications.filter(n => n.isImportant && !n.isRead).length;

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleMarkAllAsRead = () => {
    toast.success("已将所有通知标记为已读");
  };

  const handleDeleteSelected = () => {
    toast.success(`已删除 ${selectedNotifications.size} 条通知`);
    setSelectedNotifications(new Set());
  };

  const handleRead = (id: string) => {
    toast.success("已标记为已读");
  };

  const handleArchive = (id: string) => {
    toast.success("已归档通知");
  };

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Bell}
          title="通知中心"
          description={unreadCount > 0 ? `您有 ${unreadCount} 条未读通知` : "所有通知已读"}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                <Check className="w-4 h-4 mr-2" />
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
          <StatCard icon={Bell} label="未读通知" value={unreadCount} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
          <StatCard icon={AlertTriangle} label="重要通知" value={importantCount} iconColor="text-yellow-400" iconBg="bg-yellow-500/10" />
          <StatCard icon={Zap} label="AI 建议" value={aiSuggestionCount} iconColor="text-purple-400" iconBg="bg-purple-500/10" />
          <StatCard icon={Clock} label="今日通知" value={mockNotifications.filter(n => {
            const today = new Date().toDateString();
            return new Date(n.createdAt).toDateString() === today;
          }).length} iconColor="text-green-400" iconBg="bg-green-500/10" />
        </div>

        {/* Main Content */}
        <div className="flex gap-4">
          {/* Left: Notification List */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList className="bg-card/50 border border-border">
                  <TabsTrigger value="all" className="data-[state=active]:bg-primary/20">
                    全部
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="data-[state=active]:bg-primary/20">
                    未读 {unreadCount > 0 && <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>}
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
                    <Button variant="outline" size="sm" onClick={handleDeleteSelected}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除选中 ({selectedNotifications.size})
                    </Button>
                  </div>
                )}
              </div>

              {/* Select All Checkbox */}
              {filteredNotifications.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Checkbox
                    id="select-all"
                    checked={selectedNotifications.size === filteredNotifications.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm cursor-pointer">
                    全选 ({filteredNotifications.length} 条通知)
                  </label>
                </div>
              )}

              {/* Notification List */}
              <TabsContent value={activeTab} className="space-y-3 mt-0">
                {filteredNotifications.length > 0 ? (
                  <div className="space-y-3">
                    {filteredNotifications.map((notification) => (
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
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/material-shortage-alert"}>
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
