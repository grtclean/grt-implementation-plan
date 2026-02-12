/**
 * 现场安装页面 (TX-013)
 * 设备安装进度、安装团队调度、现场问题记录
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Wrench, Plus, MapPin, Users, Clock, CheckCircle2, AlertTriangle, Building2, Truck } from "lucide-react";

const MOCK_INSTALLATIONS = [
  { id: "INS-001", project: "缸体清洗线", customer: "上海大众", location: "上海安亭工厂", status: "安装中", bu: "BU3", team: "安装A组", progress: 65, startDate: "2026-02-01", endDate: "2026-02-28" },
  { id: "INS-002", project: "变速箱清洗", customer: "宝马慕尼黑", location: "慕尼黑工厂", status: "待出发", bu: "BU1", team: "安装B组", progress: 0, startDate: "2026-03-01", endDate: "2026-03-20" },
  { id: "INS-003", project: "半导体清洗", customer: "英飞凌", location: "德累斯顿工厂", status: "已完成", bu: "BU4", team: "安装C组", progress: 100, startDate: "2026-01-10", endDate: "2026-01-25" },
];

export default function FieldInstallation() {
  const { currentBU } = useUserProfile();
  const filtered = MOCK_INSTALLATIONS.filter(i => !currentBU || i.bu === currentBU);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6 text-primary" />现场安装</h1>
          <p className="text-muted-foreground mt-1">TX-013 · 设备安装进度管理与团队调度</p>
        </div>
        <div className="flex gap-2">
          {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
          <Button><Plus className="h-4 w-4 mr-2" />新建安装任务</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="flex justify-between"><div><p className="text-sm text-muted-foreground">总安装任务</p><p className="text-2xl font-bold">12</p></div><Wrench className="h-8 w-8 text-muted-foreground/20" /></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex justify-between"><div><p className="text-sm text-muted-foreground">进行中</p><p className="text-2xl font-bold text-blue-600">4</p></div><Truck className="h-8 w-8 text-blue-200" /></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex justify-between"><div><p className="text-sm text-muted-foreground">待出发</p><p className="text-2xl font-bold text-amber-600">3</p></div><Clock className="h-8 w-8 text-amber-200" /></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex justify-between"><div><p className="text-sm text-muted-foreground">已完成</p><p className="text-2xl font-bold text-green-600">5</p></div><CheckCircle2 className="h-8 w-8 text-green-200" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>安装任务列表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(ins => (
              <div key={ins.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{ins.id}</span>
                    <Badge variant="outline">{ins.bu}</Badge>
                    <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />{ins.team}</Badge>
                  </div>
                  <p className="font-medium mt-1">{ins.project} - {ins.customer}</p>
                  <p className="text-sm text-muted-foreground"><MapPin className="inline h-3 w-3 mr-1" />{ins.location} · {ins.startDate} ~ {ins.endDate}</p>
                </div>
                <div className="text-right space-y-1">
                  <Badge className={ins.status === "已完成" ? "bg-green-100 text-green-700" : ins.status === "安装中" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>{ins.status}</Badge>
                  <div className="flex items-center gap-2"><div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${ins.progress}%` }} /></div><span className="text-xs">{ins.progress}%</span></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
