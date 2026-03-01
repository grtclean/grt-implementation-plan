/**
 * 考勤管理页面
 * 打卡记录、考勤统计、异常处理、请假管理
 *
 * Data source: trpc.hrm.getAttendance / getAttendanceStats (DB-backed)
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Users, CheckCircle2, AlertTriangle, Calendar, UserX, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

const attendanceStatusColorMap = createStatusColorMap({
  "正常": "green",
  "迟到": "orange",
  "请假": "blue",
  "缺勤": "red",
});

export default function Attendance() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  // ─── tRPC ───
  const statsQuery = trpc.hrm.getAttendanceStats.useQuery(undefined, QUERY_OPTS);
  const stats = statsQuery.data ?? { total: 0, present: 0, late: 0, absent: 0, leave: 0 };

  const listQuery = trpc.hrm.getAttendance.useQuery(
    { search: search || undefined },
    QUERY_OPTS,
  );
  const records = (listQuery.data ?? []) as any[];

  if (statsQuery.isLoading || listQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Clock} title={t("hr.attendance.title")} description="..." />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Clock}
        title={t("hr.attendance.title")}
        description={t("hr.attendance.desc")}
        actions={<Button variant="outline"><Calendar className="h-4 w-4 mr-2" />{t("hr.attendance.monthlyReport")}</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Users} label={t("hr.attendance.totalStaff")} value={stats.total} />
        <StatCard icon={CheckCircle2} label={t("hr.attendance.present")} value={stats.present} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={AlertTriangle} label={t("hr.attendance.late")} value={stats.late} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={UserX} label={t("hr.attendance.absent")} value={stats.absent} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Calendar} label={t("hr.attendance.leave")} value={stats.leave} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("hr.attendance.todayRecords")}</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索姓名或部门..."
                className="pl-9 w-64"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {records.map((r: any) => (
              <div key={r.id} className="flex items-center gap-4 p-3 rounded-lg border transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{r.name.charAt(0)}</div>
                <div className="flex-1">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">{r.dept}</span>
                </div>
                <span className="text-sm text-muted-foreground">{t("hr.attendance.clockIn")}: {r.clockIn}</span>
                <span className="text-sm text-muted-foreground">{t("hr.attendance.clockOut")}: {r.clockOut}</span>
                <span className="text-sm">{r.hours}</span>
                <StatusBadge color={attendanceStatusColorMap[r.status as keyof typeof attendanceStatusColorMap] ?? "gray"}>{r.status}</StatusBadge>
              </div>
            ))}
            {records.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">{t("hr.attendance.noRecords")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
