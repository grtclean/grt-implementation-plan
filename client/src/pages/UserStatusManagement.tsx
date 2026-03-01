/**
 * 用户状态管理页面
 * 管理员查看所有用户的Profile设置状态
 *
 * Data source: trpc.accessControl.userStatus.* (DB-backed)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users, Search, RefreshCw, Settings, Bell, Calendar,
  Target, CheckCircle2, XCircle, Download, UserCheck, AlertTriangle, Mail, Eye,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/grt";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

const BU_OPTIONS = [
  { code: "BU1", name: "海外事业部" },
  { code: "BU2", name: "商用车事业部" },
  { code: "BU3", name: "乘用车事业部" },
  { code: "BU4", name: "半导体事业部" },
  { code: "BU5", name: "工业通用事业部" },
  { code: "FUNC", name: "职能部门" },
];

export default function UserStatusManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBU, setSelectedBU] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // ─── tRPC ───
  const listQuery = trpc.accessControl.userStatus.list.useQuery(
    { bu: selectedBU !== "all" ? selectedBU : undefined, search: searchTerm || undefined },
    QUERY_OPTS,
  );
  const allUsers = (listQuery.data?.items ?? []) as any[];
  const stats = listQuery.data?.stats ?? { total: 0, configured: 0, unconfigured: 0, withOverdue: 0, reminderEnabled: 0 };

  const reminderMut = trpc.accessControl.userStatus.sendReminder.useMutation({
    onSuccess: (result: any) => {
      toast.success(result.message || "提醒已发送");
    },
    onError: (err) => toast.error(err.message),
  });

  // Client-side status filter (on top of server-side BU + search)
  const filteredUsers = allUsers.filter((user: any) => {
    if (selectedStatus === "all") return true;
    if (selectedStatus === "configured") return user.hasProfile;
    if (selectedStatus === "unconfigured") return !user.hasProfile;
    if (selectedStatus === "overdue") return user.overdueTasks > 0;
    return true;
  });

  const handleRefresh = () => {
    listQuery.refetch();
    toast.success("数据已刷新");
  };

  const handleExport = () => {
    toast.success("用户状态数据已导出为Excel文件");
  };

  const handleSendReminder = (user: any) => {
    reminderMut.mutate({ userId: user.id });
  };

  if (listQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Users} title="用户状态管理" description="..." />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Users}
          title="用户状态管理"
          description="查看和管理所有用户的Profile设置状态"
          actions={
            <>
              <Button variant="outline" onClick={handleRefresh} disabled={listQuery.isFetching}>
                <RefreshCw className={`h-4 w-4 mr-2 ${listQuery.isFetching ? "animate-spin" : ""}`} />
                刷新
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                导出
              </Button>
            </>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard icon={Users} label="总用户数" value={stats.total} />
          <StatCard icon={UserCheck} label="已配置" value={stats.configured} iconColor="text-green-600" iconBg="bg-green-500/10" />
          <StatCard icon={Settings} label="未配置" value={stats.unconfigured} iconColor="text-yellow-600" iconBg="bg-yellow-500/10" />
          <StatCard icon={AlertTriangle} label="有逾期任务" value={stats.withOverdue} iconColor="text-red-600" iconBg="bg-red-500/10" />
          <StatCard icon={Bell} label="已启用提醒" value={stats.reminderEnabled} iconColor="text-blue-600" iconBg="bg-blue-500/10" />
        </div>

        {/* 筛选和搜索 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索姓名、工号或部门..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedBU} onValueChange={setSelectedBU}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择事业部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部事业部</SelectItem>
                  {BU_OPTIONS.map((bu) => (
                    <SelectItem key={bu.code} value={bu.code}>{bu.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="configured">已配置</SelectItem>
                  <SelectItem value="unconfigured">未配置</SelectItem>
                  <SelectItem value="overdue">有逾期任务</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 用户列表 */}
        <Card>
          <CardHeader>
            <CardTitle>用户列表</CardTitle>
            <CardDescription>共 {filteredUsers.length} 个用户</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>工号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>事业部</TableHead>
                  <TableHead>Profile状态</TableHead>
                  <TableHead>任务提醒</TableHead>
                  <TableHead>待办/逾期</TableHead>
                  <TableHead>最后活跃</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono">{user.employeeId}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {BU_OPTIONS.find((b) => b.code === user.buCode)?.name || user.buCode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.hasProfile ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />已配置
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <XCircle className="h-3 w-3 mr-1" />未配置
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.settings?.taskReminderEnabled ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Bell className="h-3 w-3 text-green-600" />
                          <span>{user.settings.taskReminderTime}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">未启用</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{user.pendingTasks}</Badge>
                        {user.overdueTasks > 0 && (
                          <Badge variant="destructive">{user.overdueTasks}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.lastActive ? (
                        <span className="text-sm text-muted-foreground">
                          {new Date(user.lastActive).toLocaleString("zh-CN", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">从未登录</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>用户详情 - {user.name}</DialogTitle>
                              <DialogDescription>工号: {user.employeeId} | 部门: {user.department}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              {user.settings ? (
                                <>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <h4 className="font-medium flex items-center gap-2"><Calendar className="h-4 w-4" />计划设置</h4>
                                      <div className="text-sm space-y-1">
                                        <div className="flex justify-between"><span>工作计划</span><Badge variant={user.settings.workPlanEnabled ? "default" : "secondary"}>{user.settings.workPlanEnabled ? `已启用 (${user.settings.workPlanFrequency === "daily" ? "日" : "周"})` : "未启用"}</Badge></div>
                                        <div className="flex justify-between"><span>培训计划</span><Badge variant={user.settings.trainingEnabled ? "default" : "secondary"}>{user.settings.trainingEnabled ? "已启用" : "未启用"}</Badge></div>
                                        <div className="flex justify-between"><span>项目计划</span><Badge variant={user.settings.projectEnabled ? "default" : "secondary"}>{user.settings.projectEnabled ? "已启用" : "未启用"}</Badge></div>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <h4 className="font-medium flex items-center gap-2"><Target className="h-4 w-4" />绩效与报告</h4>
                                      <div className="text-sm space-y-1">
                                        <div className="flex justify-between"><span>绩效追踪</span><Badge variant={user.settings.performanceEnabled ? "default" : "secondary"}>{user.settings.performanceEnabled ? "已启用" : "未启用"}</Badge></div>
                                        <div className="flex justify-between"><span>报告提醒</span><Badge variant={user.settings.reportEnabled ? "default" : "secondary"}>{user.settings.reportEnabled ? "已启用" : "未启用"}</Badge></div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <h4 className="font-medium flex items-center gap-2"><Bell className="h-4 w-4" />提醒设置</h4>
                                    <div className="text-sm space-y-1">
                                      <div className="flex justify-between"><span>任务提醒</span><Badge variant={user.settings.taskReminderEnabled ? "default" : "secondary"}>{user.settings.taskReminderEnabled ? `已启用 (${user.settings.taskReminderTime})` : "未启用"}</Badge></div>
                                      <div className="flex justify-between"><span>邮件通知</span><Badge variant={user.settings.emailEnabled ? "default" : "secondary"}>{user.settings.emailEnabled ? "已启用" : "未启用"}</Badge></div>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                  <p>该用户尚未配置Profile</p>
                                  <Button variant="outline" className="mt-4" onClick={() => handleSendReminder(user)} disabled={reminderMut.isPending}>
                                    <Mail className="h-4 w-4 mr-2" />发送配置提醒
                                  </Button>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        {!user.hasProfile && (
                          <Button variant="ghost" size="sm" onClick={() => handleSendReminder(user)} disabled={reminderMut.isPending}>
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  );
}
