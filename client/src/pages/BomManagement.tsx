/**
 * BOM管理页面 (TX-005)
 * 物料清单管理、BOM版本、成本估算
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Package, Plus, Search, Upload, Download, Building2, DollarSign, Layers } from "lucide-react";

const MOCK_BOMS = [
  { id: "BOM-001", name: "缸体清洗线BOM", project: "VW-2026-003", bu: "BU3", version: "V2.0", parts: 342, cost: "¥1,280,000", status: "已发布" },
  { id: "BOM-002", name: "变速箱清洗系统BOM", project: "BMW-2026-001", bu: "BU1", version: "V1.2", parts: 215, cost: "€890,000", status: "审核中" },
  { id: "BOM-003", name: "晶圆清洗设备BOM", project: "INF-2026-002", bu: "BU4", version: "V3.0", parts: 186, cost: "¥2,150,000", status: "编制中" },
];

export default function BomManagement() {
  const { currentBU } = useUserProfile();
  const [search, setSearch] = useState("");
  const filtered = MOCK_BOMS.filter(b => (!currentBU || b.bu === currentBU) && (!search || b.name.includes(search)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" />BOM管理</h1>
          <p className="text-muted-foreground mt-1">TX-005 · 物料清单管理与成本估算</p>
        </div>
        <div className="flex gap-2">
          {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
          <Button><Plus className="h-4 w-4 mr-2" />新建BOM</Button>
          <Button variant="outline"><Upload className="h-4 w-4 mr-2" />导入</Button>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />导出</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">26</p><p className="text-sm text-muted-foreground">BOM总数</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-primary">743</p><p className="text-sm text-muted-foreground">物料种类</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-green-600">¥12.8M</p><p className="text-sm text-muted-foreground">总成本估算</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>BOM列表</CardTitle>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索BOM..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(b => (
              <div key={b.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer">
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
                  <Badge className={b.status === "已发布" ? "bg-green-100 text-green-700" : b.status === "审核中" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>{b.status}</Badge>
                  <p className="text-sm font-medium mt-1">{b.cost}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
