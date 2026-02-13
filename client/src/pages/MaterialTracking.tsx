/**
 * 物料追踪页面
 * 物料入库、出库、追踪、库存预警
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, Search, Truck, AlertTriangle, CheckCircle2, ArrowRight, BarChart3 } from "lucide-react";

const MOCK_MATERIALS = [
  { id: "MAT-001", name: "304不锈钢板 3mm", batch: "B2026-001", location: "A区-01-03", qty: 120, unit: "张", status: "在库", project: "缸体清洗线" },
  { id: "MAT-002", name: "西门子S7-1500 CPU", batch: "B2026-015", location: "B区-02-01", qty: 5, unit: "个", status: "已领料", project: "变速箱清洗" },
  { id: "MAT-003", name: "耐酸泵 50L/min", batch: "B2026-008", location: "C区-01-02", qty: 8, unit: "台", status: "在途", project: "晶圆清洗" },
  { id: "MAT-004", name: "PTFE密封圈 DN80", batch: "B2026-022", location: "A区-03-05", qty: 3, unit: "包", status: "低库存", project: "通用" },
];

export default function MaterialTracking() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_MATERIALS.filter(m => !search || m.name.includes(search) || m.id.includes(search));

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title="物料追踪"
        description="物料全流程追踪与库存管理"
        actions={
          <>
            <Button>入库登记</Button>
            <Button variant="outline">领料申请</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package} label="物料种类" value="1,842" iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={BarChart3} label="库存价值" value="¥4.5M" iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={AlertTriangle} label="低库存预警" value={18} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={Truck} label="在途物料" value={23} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>物料列表</CardTitle>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索物料..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map(m => (
              <div key={m.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{m.id}</span>
                    <Badge variant="outline">{m.batch}</Badge>
                  </div>
                  <p className="font-medium mt-1">{m.name}</p>
                  <p className="text-sm text-muted-foreground">库位: {m.location} · 数量: {m.qty}{m.unit} · 项目: {m.project}</p>
                </div>
                <Badge className={m.status === "在库" ? "bg-green-100 text-green-700" : m.status === "在途" ? "bg-blue-100 text-blue-700" : m.status === "已领料" ? "bg-gray-100 text-gray-700" : "bg-amber-100 text-amber-700"}>
                  {m.status === "低库存" && <AlertTriangle className="h-3 w-3 mr-1" />}{m.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}
