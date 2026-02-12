/**
 * 备件管理页面
 * 备件库存、需求预测、供应商管理
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, Plus, Search, AlertTriangle, CheckCircle2, Truck, BarChart3 } from "lucide-react";

const MOCK_PARTS = [
  { id: "SP-001", name: "清洗喷嘴组件", model: "GRT-NZ-320", stock: 45, minStock: 20, status: "正常", price: "¥1,200", supplier: "博世" },
  { id: "SP-002", name: "传送带链条", model: "GRT-CB-500", stock: 8, minStock: 10, status: "低库存", price: "¥3,800", supplier: "蒂森克虏伯" },
  { id: "SP-003", name: "PLC控制模块", model: "S7-1500-CPU", stock: 3, minStock: 5, status: "低库存", price: "¥12,500", supplier: "西门子" },
  { id: "SP-004", name: "温度传感器", model: "PT100-SS316", stock: 120, minStock: 30, status: "正常", price: "¥280", supplier: "恩德斯豪斯" },
  { id: "SP-005", name: "液压缸密封件", model: "HYD-SEAL-80", stock: 65, minStock: 20, status: "正常", price: "¥450", supplier: "派克汉尼汾" },
];

export default function SpareParts() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_PARTS.filter(p => !search || p.name.includes(search) || p.model.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" />备件管理</h1>
          <p className="text-muted-foreground mt-1">备件库存管理与需求预测</p>
        </div>
        <div className="flex gap-2">
          <Button><Plus className="h-4 w-4 mr-2" />入库登记</Button>
          <Button variant="outline"><Truck className="h-4 w-4 mr-2" />采购申请</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold">326</p><p className="text-sm text-muted-foreground">备件种类</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-primary">¥2.8M</p><p className="text-sm text-muted-foreground">库存价值</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-amber-600">12</p><p className="text-sm text-muted-foreground">低库存预警</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-green-600">98%</p><p className="text-sm text-muted-foreground">供应满足率</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>备件库存</CardTitle>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索备件..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{p.id}</span>
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="secondary">{p.model}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">供应商: {p.supplier} · 单价: {p.price}</p>
                </div>
                <div className="text-right">
                  <Badge className={p.status === "正常" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                    {p.status === "低库存" && <AlertTriangle className="h-3 w-3 mr-1" />}{p.status}
                  </Badge>
                  <p className="text-sm mt-1">库存: <span className={p.stock < p.minStock ? "text-red-600 font-bold" : ""}>{p.stock}</span> / 最低: {p.minStock}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
