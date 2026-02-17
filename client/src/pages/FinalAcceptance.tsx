/**
 * 终验收页面 (TX-015)
 * 最终验收管理、签收确认、验收报告
 */
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Plus, Building2, Award, Clock, CheckCircle2 } from "lucide-react";

const statusColorMap = createStatusColorMap({
  "已验收": "green",
  "验收中": "blue",
  "待验收": "orange",
});

// TODO: 接入 tRPC 后端接口替换
const MOCK_ACCEPTANCES = [
  { id: "ACC-001", project: "半导体清洗设备", customer: "英飞凌", bu: "BU4", status: "已验收", date: "2026-01-25", signedBy: "Dr. Mueller", score: 98 },
  { id: "ACC-002", project: "缸体清洗线", customer: "上海大众", bu: "BU3", status: "验收中", date: "2026-02-15", signedBy: "-", score: 0 },
  { id: "ACC-003", project: "商用车清洗线", customer: "潍柴动力", bu: "BU2", status: "待验收", date: "2026-03-10", signedBy: "-", score: 0 },
];

export default function FinalAcceptance() {
  const { currentBU } = useUserProfile();
  const { toast } = useToast();
  const handleComingSoon = () => {
    toast({ title: "功能开发中", description: "该功能正在开发中，敬请期待" });
  };
  const filtered = MOCK_ACCEPTANCES.filter(a => !currentBU || a.bu === currentBU);

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={CheckCircle}
        title="终验收"
        description="TX-015 · 设备最终验收与签收管理"
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={handleComingSoon}><Plus className="h-4 w-4 mr-2" />创建验收单</Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={CheckCircle2} label="已验收" value={15} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Clock} label="验收中" value={3} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={Award} label="待验收" value={2} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>验收列表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(a => (
              <div key={a.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <Award className="h-10 w-10 text-primary/20" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{a.id}</span>
                    <Badge variant="outline">{a.bu}</Badge>
                  </div>
                  <p className="font-medium mt-1">{a.project} - {a.customer}</p>
                  <p className="text-sm text-muted-foreground">计划日期: {a.date} · 签收人: {a.signedBy}</p>
                </div>
                <div className="text-right">
                  <StatusBadge color={statusColorMap[a.status as keyof typeof statusColorMap] ?? "gray"}>{a.status}</StatusBadge>
                  {a.score > 0 && <p className="text-lg font-bold mt-1">{a.score}分</p>}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无验收记录</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}
