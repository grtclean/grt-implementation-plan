/**
 * 备件管理页面
 * 备件库存、需求预测、供应商管理
 */
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, Plus, Search, AlertTriangle, CheckCircle2, Truck, DollarSign } from "lucide-react";

const stockStatusColorMap = createStatusColorMap({
  "正常": "green",
  "低库存": "orange",
  "缺货": "red",
});

// TODO: 接入 tRPC 后端接口替换
const MOCK_PARTS = [
  { id: "SP-001", name: "清洗喷嘴组件", model: "GRT-NZ-320", stock: 45, minStock: 20, status: "正常", price: "¥1,200", supplier: "博世" },
  { id: "SP-002", name: "传送带链条", model: "GRT-CB-500", stock: 8, minStock: 10, status: "低库存", price: "¥3,800", supplier: "蒂森克虏伯" },
  { id: "SP-003", name: "PLC控制模块", model: "S7-1500-CPU", stock: 3, minStock: 5, status: "低库存", price: "¥12,500", supplier: "西门子" },
  { id: "SP-004", name: "温度传感器", model: "PT100-SS316", stock: 120, minStock: 30, status: "正常", price: "¥280", supplier: "恩德斯豪斯" },
  { id: "SP-005", name: "液压缸密封件", model: "HYD-SEAL-80", stock: 65, minStock: 20, status: "正常", price: "¥450", supplier: "派克汉尼汾" },
];

export default function SpareParts() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const handleComingSoon = () => {
    toast({ title: "功能开发中", description: "该功能正在开发中，敬请期待" });
  };
  const filtered = MOCK_PARTS.filter(p => !search || p.name.includes(search) || p.model.includes(search));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title="备件管理"
        description="备件库存管理与需求预测"
        actions={
          <>
            <Button onClick={handleComingSoon}><Plus className="h-4 w-4 mr-2" />入库登记</Button>
            <Button variant="outline" onClick={handleComingSoon}><Truck className="h-4 w-4 mr-2" />采购申请</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package} label="备件种类" value={326} />
        <StatCard icon={DollarSign} label="库存价值" value="¥2.8M" iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={AlertTriangle} label="低库存预警" value={12} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label="供应满足率" value="98%" iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>备件库存</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索备件..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{p.id}</span>
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="secondary">{p.model}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">供应商: {p.supplier} · 单价: {p.price}</p>
                </div>
                <div className="text-right">
                  <StatusBadge color={stockStatusColorMap[p.status as keyof typeof stockStatusColorMap] ?? "gray"}>
                    {p.status === "低库存" && <AlertTriangle className="h-3 w-3 mr-1 inline" />}{p.status}
                  </StatusBadge>
                  <p className="text-sm mt-1">库存: <span className={p.stock < p.minStock ? "text-red-600 font-bold" : ""}>{p.stock}</span> / 最低: {p.minStock}</p>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无备件数据</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
