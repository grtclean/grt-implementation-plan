import { useState } from "react";
import {
  ListChecks,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  stale: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#22c55e", "#ef4444", "#9ca3af"];

const STATUS_LABELS: Record<string, string> = {
  open: "待处理",
  in_progress: "进行中",
  completed: "已完成",
  stale: "停滞",
  cancelled: "已取消",
};

export function ActionItemTrackerTab() {
  const [meetingId, setMeetingId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const extractMutation = trpc.ime.extractActionItems.useMutation();
  const updateMutation = trpc.ime.updateActionItemStatus.useMutation();
  const { data: dashboard, isLoading, refetch } = trpc.ime.actionItemDashboard.useQuery(
    statusFilter === "all" ? {} : { status: statusFilter }
  );

  const statusCounts = dashboard?.statusCounts ?? {};
  const staleItems = (dashboard?.staleItems ?? []) as any[];
  const ownerRankings = (dashboard?.ownerRankings ?? []) as any[];
  const items = (dashboard?.items ?? []) as any[];

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
  }));

  const handleExtract = () => {
    if (!meetingId.trim()) return;
    extractMutation.mutate({ meetingId: meetingId.trim() }, {
      onSuccess: () => refetch(),
    });
  };

  const handleStatusUpdate = (itemId: number, status: string) => {
    updateMutation.mutate(
      { itemId, status: status as any },
      { onSuccess: () => refetch() }
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-blue-500" />
            行动项追踪
          </CardTitle>
          <CardDescription>从会议中提取行动项并追踪其生命周期</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="输入会议ID..."
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              className="max-w-sm"
            />
            <Button
              onClick={handleExtract}
              disabled={extractMutation.isPending || !meetingId.trim()}
            >
              {extractMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ListChecks className="h-4 w-4 mr-2" />
              )}
              提取行动项
            </Button>
          </div>
          {extractMutation.data && (
            <p className="text-sm text-muted-foreground">
              匹配已有项: {extractMutation.data.matched} | 新增项: {extractMutation.data.created}
              {extractMutation.data.message && ` | ${extractMutation.data.message}`}
            </p>
          )}
          {extractMutation.isError && (
            <p className="text-sm text-red-500">提取失败: {extractMutation.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ListChecks}
          label="总行动项"
          value={isLoading ? "..." : dashboard?.total ?? 0}
          subtitle="Total Action Items"
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={CheckCircle2}
          label="完成率"
          value={isLoading ? "..." : `${dashboard?.completionRate ?? 0}%`}
          subtitle="Completion Rate"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={AlertTriangle}
          label="停滞项"
          value={isLoading ? "..." : statusCounts["stale"] ?? 0}
          subtitle="Stale Items"
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <StatCard
          icon={Clock}
          label="平均解决天数"
          value={isLoading ? "..." : dashboard?.avgResolutionDays ?? 0}
          subtitle="Avg Resolution Days"
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Stale Items Alert */}
      {staleItems.length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              停滞行动项 ({staleItems.length})
            </CardTitle>
            <CardDescription>这些行动项在多次会议中被提及但未完成</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {staleItems.slice(0, 10).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded bg-white">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.content}</p>
                    <p className="text-xs text-muted-foreground">
                      负责人: {item.owner || "未指定"} | 出现 {item.appearance_count} 次
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(item.id, "in_progress")}
                      disabled={updateMutation.isPending}
                    >
                      开始处理
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(item.id, "completed")}
                      disabled={updateMutation.isPending}
                    >
                      标记完成
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_: any, idx: number) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-12 text-muted-foreground">暂无数据</p>
            )}
          </CardContent>
        </Card>

        {/* Owner Rankings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              负责人排名
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ownerRankings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>负责人</TableHead>
                    <TableHead className="text-center">总计</TableHead>
                    <TableHead className="text-center">已完成</TableHead>
                    <TableHead className="text-center">停滞</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownerRankings.map((o: any) => (
                    <TableRow key={o.owner}>
                      <TableCell className="font-medium">{o.owner}</TableCell>
                      <TableCell className="text-center">{o.total}</TableCell>
                      <TableCell className="text-center text-green-600">{o.completed}</TableCell>
                      <TableCell className="text-center text-red-600">{o.stale}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-12 text-muted-foreground">暂无数据</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Items Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">行动项列表</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="筛选状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="open">待处理</SelectItem>
                <SelectItem value="in_progress">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="stale">停滞</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>内容</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-center">出现次数</TableHead>
                  <TableHead className="text-center">首次发现</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[300px] truncate text-sm">{item.content}</TableCell>
                    <TableCell className="text-sm">{item.owner || "—"}</TableCell>
                    <TableCell className="text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] || "bg-gray-100"}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{item.appearance_count}</TableCell>
                    <TableCell className="text-center text-sm">
                      {item.first_seen_date?.split("T")[0] ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {item.status !== "completed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => handleStatusUpdate(item.id, "completed")}
                            disabled={updateMutation.isPending}
                          >
                            完成
                          </Button>
                        )}
                        {item.status === "open" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => handleStatusUpdate(item.id, "in_progress")}
                            disabled={updateMutation.isPending}
                          >
                            开始
                          </Button>
                        )}
                        {item.status !== "cancelled" && item.status !== "completed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-500"
                            onClick={() => handleStatusUpdate(item.id, "cancelled")}
                            disabled={updateMutation.isPending}
                          >
                            取消
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ListChecks className="h-12 w-12 mb-3 opacity-30" />
              <p>暂无行动项数据</p>
              <p className="text-sm">请先从会议中提取行动项</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
