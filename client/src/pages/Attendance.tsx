/**
 * 考勤管理页面
 * 打卡记录、考勤统计、异常处理、请假管理
 */
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Users, CheckCircle2, AlertTriangle, Calendar, UserX } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const attendanceStatusColorMap = createStatusColorMap({
  "正常": "green",
  "迟到": "orange",
  "请假": "blue",
  "缺勤": "red",
});

const TODAY_STATS = { total: 140, present: 128, late: 5, absent: 3, leave: 4 };

// TODO: 接入 tRPC 后端接口替换
const MOCK_RECORDS = [
  { name: "王工", dept: "研发设计部", clockIn: "08:28", clockOut: "17:35", status: "正常", hours: "9.1h" },
  { name: "李工", dept: "销售部", clockIn: "09:15", clockOut: "-", status: "迟到", hours: "-" },
  { name: "张工", dept: "技术服务部", clockIn: "-", clockOut: "-", status: "请假", hours: "-" },
  { name: "赵工", dept: "生产部", clockIn: "07:55", clockOut: "17:00", status: "正常", hours: "9.1h" },
  { name: "陈工", dept: "研发设计部", clockIn: "08:30", clockOut: "18:20", status: "正常", hours: "9.8h" },
];

export default function Attendance() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Clock}
        title={t("hr.attendance.title")}
        description={t("hr.attendance.desc")}
        actions={<Button variant="outline"><Calendar className="h-4 w-4 mr-2" />{t("hr.attendance.monthlyReport")}</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Users} label={t("hr.attendance.totalStaff")} value={TODAY_STATS.total} />
        <StatCard icon={CheckCircle2} label={t("hr.attendance.present")} value={TODAY_STATS.present} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={AlertTriangle} label={t("hr.attendance.late")} value={TODAY_STATS.late} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={UserX} label={t("hr.attendance.absent")} value={TODAY_STATS.absent} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Calendar} label={t("hr.attendance.leave")} value={TODAY_STATS.leave} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>{t("hr.attendance.todayRecords")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {MOCK_RECORDS.map((r, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg border transition-colors">
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
            {MOCK_RECORDS.length === 0 && (
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
