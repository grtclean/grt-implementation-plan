import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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

const STATUS_LABEL_KEYS: Record<string, string> = {
  open: "meeting.actionTracker.statusOpen",
  in_progress: "meeting.actionTracker.statusInProgress",
  completed: "meeting.actionTracker.statusCompleted",
  stale: "meeting.actionTracker.statusStale",
  cancelled: "meeting.actionTracker.statusCancelled",
};

export function ActionItemTrackerTab() {
  const { t } = useLanguage();
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
    name: t(STATUS_LABEL_KEYS[status] || "meeting.actionTracker.statusOpen"),
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
            {t("meeting.actionTracker.title")}
          </CardTitle>
          <CardDescription>{t("meeting.actionTracker.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder={t("meeting.actionTracker.inputPlaceholder")}
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
              {t("meeting.actionTracker.extractBtn")}
            </Button>
          </div>
          {extractMutation.data && (
            <p className="text-sm text-muted-foreground">
              {t("meeting.actionTracker.matchedExisting")}: {extractMutation.data.matched} | {t("meeting.actionTracker.newItems")}: {extractMutation.data.created}
              {extractMutation.data.message && ` | ${extractMutation.data.message}`}
            </p>
          )}
          {extractMutation.isError && (
            <p className="text-sm text-red-500">{t("meeting.actionTracker.extractFailed")}: {extractMutation.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ListChecks}
          label={t("meeting.actionTracker.totalItems")}
          value={isLoading ? "..." : dashboard?.total ?? 0}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={CheckCircle2}
          label={t("meeting.actionTracker.completionRate")}
          value={isLoading ? "..." : `${dashboard?.completionRate ?? 0}%`}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("meeting.actionTracker.staleItems")}
          value={isLoading ? "..." : statusCounts["stale"] ?? 0}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <StatCard
          icon={Clock}
          label={t("meeting.actionTracker.avgResolutionDays")}
          value={isLoading ? "..." : dashboard?.avgResolutionDays ?? 0}
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
              {t("meeting.actionTracker.staleAlert")} ({staleItems.length})
            </CardTitle>
            <CardDescription>{t("meeting.actionTracker.staleAlertDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {staleItems.slice(0, 10).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded bg-white">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("meeting.actionTracker.owner")}: {item.owner || t("meeting.actionTracker.unassigned")} | {t("meeting.actionTracker.appearances")} {item.appearance_count} {t("meeting.actionTracker.timesUnit")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(item.id, "in_progress")}
                      disabled={updateMutation.isPending}
                    >
                      {t("meeting.actionTracker.startProcessing")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(item.id, "completed")}
                      disabled={updateMutation.isPending}
                    >
                      {t("meeting.actionTracker.markComplete")}
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
            <CardTitle className="text-base">{t("meeting.actionTracker.statusDistribution")}</CardTitle>
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
              <p className="text-center py-12 text-muted-foreground">{t("meeting.actionTracker.noData")}</p>
            )}
          </CardContent>
        </Card>

        {/* Owner Rankings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("meeting.actionTracker.ownerRanking")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ownerRankings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("meeting.actionTracker.thOwner")}</TableHead>
                    <TableHead className="text-center">{t("meeting.actionTracker.thTotal")}</TableHead>
                    <TableHead className="text-center">{t("meeting.actionTracker.thCompleted")}</TableHead>
                    <TableHead className="text-center">{t("meeting.actionTracker.thStale")}</TableHead>
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
              <p className="text-center py-12 text-muted-foreground">{t("meeting.actionTracker.noData")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Items Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("meeting.actionTracker.itemList")}</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("meeting.actionTracker.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("meeting.actionTracker.statusAll")}</SelectItem>
                <SelectItem value="open">{t("meeting.actionTracker.statusOpen")}</SelectItem>
                <SelectItem value="in_progress">{t("meeting.actionTracker.statusInProgress")}</SelectItem>
                <SelectItem value="completed">{t("meeting.actionTracker.statusCompleted")}</SelectItem>
                <SelectItem value="stale">{t("meeting.actionTracker.statusStale")}</SelectItem>
                <SelectItem value="cancelled">{t("meeting.actionTracker.statusCancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.actionTracker.thContent")}</TableHead>
                  <TableHead>{t("meeting.actionTracker.thOwner")}</TableHead>
                  <TableHead className="text-center">{t("meeting.actionTracker.thStatus")}</TableHead>
                  <TableHead className="text-center">{t("meeting.actionTracker.thAppearances")}</TableHead>
                  <TableHead className="text-center">{t("meeting.actionTracker.thFirstSeen")}</TableHead>
                  <TableHead>{t("meeting.actionTracker.thActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[300px] truncate text-sm">{item.content}</TableCell>
                    <TableCell className="text-sm">{item.owner || "—"}</TableCell>
                    <TableCell className="text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] || "bg-gray-100"}`}>
                        {t(STATUS_LABEL_KEYS[item.status] || "meeting.actionTracker.statusOpen")}
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
                            {t("meeting.actionTracker.actionComplete")}
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
                            {t("meeting.actionTracker.actionStart")}
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
                            {t("meeting.actionTracker.actionCancel")}
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
              <p>{t("meeting.actionTracker.noItemData")}</p>
              <p className="text-sm">{t("meeting.actionTracker.noItemDataHint")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
