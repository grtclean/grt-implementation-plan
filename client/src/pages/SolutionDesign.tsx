/**
 * 方案设计页面 (TX-002)
 * 清洗方案配置、3D布局、技术参数计算
 */
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Lightbulb, Plus, CheckCircle2, Clock, Building2, Layers, AlertTriangle } from "lucide-react";

const statusColorMap = createStatusColorMap({
  "设计中": "blue",
  "已评审": "green",
  "修改中": "orange",
});

// TODO: 接入 tRPC 后端接口替换
const MOCK_SOLUTIONS = [
  { id: "SOL-001", project: "缸体清洗线", customer: "上海大众", status: "设计中", bu: "BU3", version: "V2.1", engineer: "王工" },
  { id: "SOL-002", project: "变速箱清洗方案", customer: "宝马慕尼黑", status: "已评审", bu: "BU1", version: "V1.0", engineer: "李工" },
  { id: "SOL-003", project: "晶圆清洗设备", customer: "英飞凌", status: "修改中", bu: "BU4", version: "V3.2", engineer: "张工" },
];

export default function SolutionDesign() {
  const { toast } = useToast();
  const { currentBU } = useUserProfile();
  const filtered = MOCK_SOLUTIONS.filter(s => !currentBU || s.bu === currentBU);

  const handleComingSoon = () => {
    toast({ title: "功能开发中", description: "该功能正在开发中，敬请期待" });
  };

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={Lightbulb}
        title="方案设计"
        description="TX-002 · 清洗方案配置与技术评审"
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={handleComingSoon}><Plus className="h-4 w-4 mr-2" />新建方案</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Clock} label="进行中方案" value={12} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={CheckCircle2} label="已通过评审" value={8} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={AlertTriangle} label="待修改" value={3} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>方案列表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(sol => (
              <div key={sol.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <Layers className="h-10 w-10 text-primary/20" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{sol.id}</span>
                    <Badge variant="outline">{sol.bu}</Badge>
                    <Badge variant="secondary">{sol.version}</Badge>
                  </div>
                  <p className="font-medium mt-1">{sol.project}</p>
                  <p className="text-sm text-muted-foreground">客户: {sol.customer} · 工程师: {sol.engineer}</p>
                </div>
                <StatusBadge color={statusColorMap[sol.status as keyof typeof statusColorMap] ?? 'gray'}>
                  {sol.status}
                </StatusBadge>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Lightbulb className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无方案数据</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}
