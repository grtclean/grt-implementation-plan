/**
 * 现场安装页面 (TX-013)
 * 设备安装进度、安装团队调度、现场问题记录
 */
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Wrench, Plus, MapPin, Users, Clock, CheckCircle2, Building2, Truck } from "lucide-react";

const statusColorMap = createStatusColorMap({
  "安装中": "blue",
  "待出发": "orange",
  "已完成": "green",
});

// TODO: 接入 tRPC 后端接口替换
const MOCK_INSTALLATIONS = [
  { id: "INS-001", project: "缸体清洗线", customer: "上海大众", location: "上海安亭工厂", status: "安装中", bu: "BU3", team: "安装A组", progress: 65, startDate: "2026-02-01", endDate: "2026-02-28" },
  { id: "INS-002", project: "变速箱清洗", customer: "宝马慕尼黑", location: "慕尼黑工厂", status: "待出发", bu: "BU1", team: "安装B组", progress: 0, startDate: "2026-03-01", endDate: "2026-03-20" },
  { id: "INS-003", project: "半导体清洗", customer: "英飞凌", location: "德累斯顿工厂", status: "已完成", bu: "BU4", team: "安装C组", progress: 100, startDate: "2026-01-10", endDate: "2026-01-25" },
];

export default function FieldInstallation() {
  const { currentBU } = useUserProfile();
  const filtered = MOCK_INSTALLATIONS.filter(i => !currentBU || i.bu === currentBU);

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={Wrench}
        title="现场安装"
        description="TX-013 · 设备安装进度管理与团队调度"
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button><Plus className="h-4 w-4 mr-2" />新建安装任务</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Wrench} label="总安装任务" value={12} />
        <StatCard icon={Truck} label="进行中" value={4} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={Clock} label="待出发" value={3} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label="已完成" value={5} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>安装任务列表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(ins => (
              <div key={ins.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
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
                  <StatusBadge color={statusColorMap[ins.status as keyof typeof statusColorMap] ?? "gray"}>{ins.status}</StatusBadge>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${ins.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{ins.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Wrench className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无安装任务</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}
