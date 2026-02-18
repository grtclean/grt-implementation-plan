/**
 * BOM管理页面 (TX-005)
 * 物料清单管理、BOM版本、成本估算
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Search, Upload, Download, Building2, DollarSign, Layers } from "lucide-react";

const statusColorMap = createStatusColorMap({
  "已发布": "green",
  "审核中": "orange",
  "编制中": "blue",
});

// TODO: 接入 tRPC 后端接口替换
const MOCK_BOMS = [
  { id: "BOM-001", name: "缸体清洗线BOM", project: "VW-2026-003", bu: "BU3", version: "V2.0", parts: 342, cost: "¥1,280,000", status: "已发布" },
  { id: "BOM-002", name: "变速箱清洗系统BOM", project: "BMW-2026-001", bu: "BU1", version: "V1.2", parts: 215, cost: "€890,000", status: "审核中" },
  { id: "BOM-003", name: "晶圆清洗设备BOM", project: "INF-2026-002", bu: "BU4", version: "V3.0", parts: 186, cost: "¥2,150,000", status: "编制中" },
];

export default function BomManagement() {
  const { currentBU } = useUserProfile();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const handleComingSoon = () => {
    toast({ title: "功能开发中", description: "该功能正在开发中，敬请期待" });
  };
  const filtered = MOCK_BOMS.filter(b => (!currentBU || b.bu === currentBU) && (!search || b.name.includes(search)));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title="BOM管理"
        description="TX-005 · 物料清单管理与成本估算"
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={handleComingSoon}><Plus className="h-4 w-4 mr-2" />新建BOM</Button>
            <Button variant="outline" onClick={handleComingSoon}><Upload className="h-4 w-4 mr-2" />导入</Button>
            <Button variant="outline" onClick={handleComingSoon}><Download className="h-4 w-4 mr-2" />导出</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Layers} label="BOM总数" value={26} />
        <StatCard icon={Package} label="物料种类" value={743} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={DollarSign} label="总成本估算" value="¥12.8M" iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>BOM列表</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索BOM..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(b => (
              <div key={b.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <Layers className="h-10 w-10 text-primary/20" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{b.id}</span>
                    <Badge variant="outline">{b.bu}</Badge>
                    <Badge variant="secondary">{b.version}</Badge>
                  </div>
                  <p className="font-medium mt-1">{b.name}</p>
                  <p className="text-sm text-muted-foreground">项目: {b.project} · 零件数: {b.parts}</p>
                </div>
                <div className="text-right">
                  <StatusBadge color={statusColorMap[b.status as keyof typeof statusColorMap] ?? 'gray'}>{b.status}</StatusBadge>
                  <p className="text-sm font-medium mt-1">{b.cost}</p>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无BOM数据</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
