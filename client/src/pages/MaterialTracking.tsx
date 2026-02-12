/**
 * 物料追踪页面
 * 物料入库、出库、追踪、库存预警
 */
import { useState } from "react";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" />物料追踪</h1>
          <p className="text-muted-foreground mt-1">物料全流程追踪与库存管理</p>
        </div>
        <div className="flex gap-2">
          <Button>入库登记</Button>
          <Button variant="outline">领料申请</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">1,842</p><p className="text-sm text-muted-foreground">物料种类</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-primary">¥4.5M</p><p className="text-sm text-muted-foreground">库存价值</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-amber-600">18</p><p className="text-sm text-muted-foreground">低库存预警</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-blue-600">23</p><p className="text-sm text-muted-foreground">在途物料</p></CardContent></Card>
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
  );
}
