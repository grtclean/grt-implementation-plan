/**
 * 机械设计页面 (TX-003)
 * 机械结构设计、图纸管理、设计变更
 */
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useToast } from "@/hooks/use-toast";
import { Cog, Plus, Upload, Building2, CheckCircle2, Clock, AlertTriangle, FileText } from "lucide-react";

const statusColorMap = createStatusColorMap({
  "设计中": "blue",
  "已审核": "green",
  "审核中": "orange",
});

// TODO: 接入 tRPC 后端接口替换
const MOCK_DESIGNS = [
  { id: "MD-001", name: "清洗槽体结构设计", project: "缸体清洗线", status: "设计中", bu: "BU3", rev: "R3", engineer: "王工", progress: 75 },
  { id: "MD-002", name: "传送机构总装图", project: "变速箱清洗", status: "已审核", bu: "BU1", rev: "R1", engineer: "李工", progress: 100 },
  { id: "MD-003", name: "干燥室结构设计", project: "晶圆清洗", status: "审核中", bu: "BU4", rev: "R2", engineer: "张工", progress: 90 },
  { id: "MD-004", name: "框架结构优化", project: "柴油机清洗", status: "设计中", bu: "BU2", rev: "R1", engineer: "赵工", progress: 40 },
];

export default function MechanicalDesign() {
  const { currentBU } = useUserProfile();
  const { toast } = useToast();
  const handleComingSoon = () => {
    toast({ title: "功能开发中", description: "该功能正在开发中，敬请期待" });
  };
  const filtered = MOCK_DESIGNS.filter(d => !currentBU || d.bu === currentBU);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Cog}
        title="机械设计"
        description="TX-003 · 机械结构设计与图纸管理"
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={handleComingSoon}><Plus className="h-4 w-4 mr-2" />新建设计</Button>
            <Button variant="outline" onClick={handleComingSoon}><Upload className="h-4 w-4 mr-2" />上传图纸</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="总设计任务" value={18} />
        <StatCard icon={Clock} label="设计中" value={7} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label="审核中" value={3} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label="已完成" value={8} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>设计任务列表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(d => (
              <div key={d.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{d.id}</span>
                    <Badge variant="outline">{d.bu}</Badge>
                    <Badge variant="secondary">{d.rev}</Badge>
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
                <Cog className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无设计任务</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
