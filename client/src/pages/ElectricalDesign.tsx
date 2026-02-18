/**
 * 电气设计页面 (TX-004)
 * 电气控制系统设计、PLC程序、电气图纸管理
 */
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useToast } from "@/hooks/use-toast";
import { Zap, Plus, Building2, Cpu, CheckCircle2, Clock, AlertTriangle, FileText } from "lucide-react";

const statusColorMap = createStatusColorMap({
  "编程中": "blue",
  "已完成": "green",
  "审核中": "orange",
});

// TODO: 接入 tRPC 后端接口替换
const MOCK_DESIGNS = [
  { id: "ED-001", name: "主控PLC程序设计", project: "缸体清洗线", status: "编程中", bu: "BU3", engineer: "陈工", progress: 60 },
  { id: "ED-002", name: "HMI界面开发", project: "变速箱清洗", status: "已完成", bu: "BU1", engineer: "周工", progress: 100 },
  { id: "ED-003", name: "电气原理图设计", project: "晶圆清洗", status: "审核中", bu: "BU4", engineer: "吴工", progress: 85 },
  { id: "ED-004", name: "IO分配表", project: "柴油机清洗", status: "编程中", bu: "BU2", engineer: "郑工", progress: 30 },
];

export default function ElectricalDesign() {
  const { currentBU } = useUserProfile();
  const { toast } = useToast();
  const handleComingSoon = () => {
    toast({ title: "功能开发中", description: "该功能正在开发中，敬请期待" });
  };
  const filtered = MOCK_DESIGNS.filter(d => !currentBU || d.bu === currentBU);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Zap}
        title="电气设计"
        description="TX-004 · 电气控制系统设计与PLC编程"
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={handleComingSoon}><Plus className="h-4 w-4 mr-2" />新建设计</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="总设计任务" value={15} />
        <StatCard icon={Clock} label="编程中" value={5} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label="审核中" value={2} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label="已完成" value={8} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>电气设计任务</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(d => (
              <div key={d.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <Cpu className="h-10 w-10 text-primary/20" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{d.id}</span>
                    <Badge variant="outline">{d.bu}</Badge>
                  </div>
                  <p className="font-medium mt-1">{d.name}</p>
                  <p className="text-sm text-muted-foreground">项目: {d.project} · 工程师: {d.engineer}</p>
                </div>
                <div className="text-right space-y-1">
                  <StatusBadge color={statusColorMap[d.status as keyof typeof statusColorMap] ?? 'gray'}>{d.status}</StatusBadge>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${d.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{d.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Zap className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无设计任务</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
