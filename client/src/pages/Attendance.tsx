/**
 * 考勤管理页面
 * 打卡记录、考勤统计、异常处理、请假管理
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, CheckCircle2, AlertTriangle, Calendar, UserX } from "lucide-react";

const TODAY_STATS = { total: 140, present: 128, late: 5, absent: 3, leave: 4 };

const MOCK_RECORDS = [
  { name: "王工", dept: "研发设计部", clockIn: "08:28", clockOut: "17:35", status: "正常", hours: "9.1h" },
  { name: "李工", dept: "销售部", clockIn: "09:15", clockOut: "-", status: "迟到", hours: "-" },
  { name: "张工", dept: "技术服务部", clockIn: "-", clockOut: "-", status: "请假", hours: "-" },
  { name: "赵工", dept: "生产部", clockIn: "07:55", clockOut: "17:00", status: "正常", hours: "9.1h" },
  { name: "陈工", dept: "研发设计部", clockIn: "08:30", clockOut: "18:20", status: "正常", hours: "9.8h" },
];

export default function Attendance() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-6 w-6 text-primary" />考勤管理</h1>
          <p className="text-muted-foreground mt-1">考勤统计 · 异常处理 · 请假审批</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Calendar className="h-4 w-4 mr-2" />月度报表</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{TODAY_STATS.total}</p><p className="text-xs text-muted-foreground">总人数</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-600">{TODAY_STATS.present}</p><p className="text-xs text-muted-foreground">已到岗</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-amber-600">{TODAY_STATS.late}</p><p className="text-xs text-muted-foreground">迟到</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-red-600">{TODAY_STATS.absent}</p><p className="text-xs text-muted-foreground">缺勤</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-blue-600">{TODAY_STATS.leave}</p><p className="text-xs text-muted-foreground">请假</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>今日考勤记录</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {MOCK_RECORDS.map((r, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{r.name.charAt(0)}</div>
                <div className="flex-1">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">{r.dept}</span>
                </div>
                <span className="text-sm text-muted-foreground">签到: {r.clockIn}</span>
                <span className="text-sm text-muted-foreground">签退: {r.clockOut}</span>
                <span className="text-sm">{r.hours}</span>
                <Badge className={r.status === "正常" ? "bg-green-100 text-green-700" : r.status === "迟到" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>{r.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
