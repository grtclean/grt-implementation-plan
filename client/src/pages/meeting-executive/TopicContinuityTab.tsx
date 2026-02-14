import { useState } from "react";
import {
  GitBranch,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronUp,
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  introduced: "bg-blue-100 text-blue-700",
  debated: "bg-amber-100 text-amber-700",
  decided: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
  stalled: "bg-red-100 text-red-700",
};

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#22c55e", "#9ca3af", "#ef4444"];

const STATUS_LABELS: Record<string, string> = {
  introduced: "已提出",
  debated: "讨论中",
  decided: "已决议",
  closed: "已关闭",
  stalled: "停滞",
};

export function TopicContinuityTab() {
  const [meetingId, setMeetingId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);

  const extractMutation = trpc.ime.extractTopics.useMutation();
  const updateMutation = trpc.ime.updateTopicStatus.useMutation();
  const { data: dashboard, isLoading, refetch } = trpc.ime.topicContinuityDashboard.useQuery(
    statusFilter === "all" ? {} : { status: statusFilter }
  );

  const statusCounts = dashboard?.statusCounts ?? {};
  const stalledTopics = (dashboard?.stalledTopics ?? []) as any[];
  const resolutionStats = dashboard?.resolutionStats ?? { resolvedCount: 0, avgResolutionDays: 0 };
  const topics = (dashboard?.topics ?? []) as any[];

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
  }));

  // Build lifecycle bar data from topics
  const lifecycleData = (() => {
    const statusOrder = ["introduced", "debated", "decided", "closed", "stalled"];
    const counts: Record<string, number> = {};
    for (const s of statusOrder) counts[s] = statusCounts[s] || 0;
    return statusOrder.map((s) => ({
      status: STATUS_LABELS[s] || s,
      count: counts[s],
    }));
  })();

  const totalTopics = Object.values(statusCounts).reduce((a: number, b: number) => a + b, 0);

  const handleExtract = () => {
    if (!meetingId.trim()) return;
    extractMutation.mutate({ meetingId: meetingId.trim() }, {
      onSuccess: () => refetch(),
    });
  };

  const handleStatusUpdate = (topicId: number, status: string) => {
    updateMutation.mutate(
      { topicId, status: status as any },
      { onSuccess: () => refetch() }
    );
  };

  const parseAppearances = (raw: string | null): any[] => {
    try { return JSON.parse(raw || "[]"); } catch { return []; }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-purple-500" />
            跨会议议题追踪
          </CardTitle>
          <CardDescription>从会议中提取议题并追踪其跨会议演变</CardDescription>
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
                <GitBranch className="h-4 w-4 mr-2" />
              )}
              提取议题
            </Button>
          </div>
          {extractMutation.data && (
            <p className="text-sm text-muted-foreground">
              匹配已有议题: {extractMutation.data.matched} | 新增议题: {extractMutation.data.created}
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
          icon={GitBranch}
          label="总议题"
          value={isLoading ? "..." : totalTopics}
          subtitle="Total Topics"
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatCard
          icon={CheckCircle2}
          label="已决议"
          value={isLoading ? "..." : (statusCounts["decided"] ?? 0) + (statusCounts["closed"] ?? 0)}
          subtitle="Decided / Closed"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={AlertTriangle}
          label="停滞议题"
          value={isLoading ? "..." : statusCounts["stalled"] ?? 0}
          subtitle="Stalled Topics"
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <StatCard
          icon={Clock}
          label="平均解决天数"
          value={isLoading ? "..." : resolutionStats.avgResolutionDays}
          subtitle="Avg Resolution Days"
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Stalled Topics Alert */}
      {stalledTopics.length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              停滞议题 ({stalledTopics.length})
            </CardTitle>
            <CardDescription>这些议题在多次会议中被讨论但未达成决议</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stalledTopics.slice(0, 10).map((topic: any) => (
                <div key={topic.id} className="flex items-center justify-between gap-2 p-2 rounded bg-white">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{topic.topic_name}</p>
                    <p className="text-xs text-muted-foreground">
                      出现 {topic.appearance_count} 次 | 首次: {topic.first_seen_date?.split("T")[0] ?? "—"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(topic.id, "debated")}
                      disabled={updateMutation.isPending}
                    >
                      标记讨论中
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(topic.id, "decided")}
                      disabled={updateMutation.isPending}
                    >
                      标记已决议
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lifecycle Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              议题生命周期分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lifecycleData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={lifecycleData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="status" type="category" width={60} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="议题数">
                    {lifecycleData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-12 text-muted-foreground">暂无数据</p>
            )}
          </CardContent>
        </Card>

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
      </div>

      {/* Topics Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">议题列表</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="筛选状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="introduced">已提出</SelectItem>
                <SelectItem value="debated">讨论中</SelectItem>
                <SelectItem value="decided">已决议</SelectItem>
                <SelectItem value="closed">已关闭</SelectItem>
                <SelectItem value="stalled">停滞</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {topics.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>议题名称</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-center">出现次数</TableHead>
                  <TableHead className="text-center">首次发现</TableHead>
                  <TableHead className="text-center">最后讨论</TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map((topic: any) => (
                  <>
                    <TableRow
                      key={topic.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                    >
                      <TableCell className="font-medium max-w-[250px] truncate">{topic.topic_name}</TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[topic.status] || "bg-gray-100"}`}>
                          {STATUS_LABELS[topic.status] || topic.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{topic.appearance_count}</TableCell>
                      <TableCell className="text-center text-sm">
                        {topic.first_seen_date?.split("T")[0] ?? "—"}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {topic.last_seen_date?.split("T")[0] ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {topic.status !== "decided" && topic.status !== "closed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => handleStatusUpdate(topic.id, "decided")}
                              disabled={updateMutation.isPending}
                            >
                              决议
                            </Button>
                          )}
                          {topic.status !== "closed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => handleStatusUpdate(topic.id, "closed")}
                              disabled={updateMutation.isPending}
                            >
                              关闭
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {expandedTopic === topic.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedTopic === topic.id && (
                      <TableRow key={`${topic.id}-detail`}>
                        <TableCell colSpan={7} className="bg-muted/30">
                          <div className="p-4 space-y-3">
                            {topic.topic_description && (
                              <div>
                                <h4 className="text-sm font-medium mb-1">描述</h4>
                                <p className="text-sm text-muted-foreground">{topic.topic_description}</p>
                              </div>
                            )}
                            <div>
                              <h4 className="text-sm font-medium mb-2">会议出现记录</h4>
                              <div className="space-y-2">
                                {parseAppearances(topic.meeting_appearances).map((app: any, i: number) => (
                                  <div key={i} className="flex items-start gap-3 p-2 rounded bg-white text-sm">
                                    <Badge variant="outline" className="shrink-0">{app.date?.split("T")[0] ?? "—"}</Badge>
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[app.statusAtMeeting] || "bg-gray-100"}`}>
                                      {STATUS_LABELS[app.statusAtMeeting] || app.statusAtMeeting}
                                    </span>
                                    <span className="text-muted-foreground">{app.summary}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <GitBranch className="h-12 w-12 mb-3 opacity-30" />
              <p>暂无议题数据</p>
              <p className="text-sm">请先从会议中提取议题</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
