/**
 * 合同管理页面
 * 合同创建、审批、履行追踪、到期提醒
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileCheck, Plus, Search, DollarSign, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

const MOCK_CONTRACTS = [
  { id: "CT-2026-001", customer: "上海大众", title: "缸体清洗线采购合同", amount: "¥2,850,000", status: "履行中", signDate: "2026-01-15", endDate: "2027-01-15", progress: 35 },
  { id: "CT-2026-002", customer: "英飞凌", title: "晶圆清洗设备合同", amount: "€1,500,000", status: "已签署", signDate: "2026-02-01", endDate: "2027-06-01", progress: 10 },
  { id: "CT-2025-015", customer: "潍柴动力", title: "年度维保合同", amount: "¥480,000", status: "即将到期", signDate: "2025-03-01", endDate: "2026-03-01", progress: 95 },
];

export default function ContractManagement() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_CONTRACTS.filter(c => !search || c.customer.includes(search) || c.title.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileCheck className="h-6 w-6 text-primary" />合同管理</h1>
          <p className="text-muted-foreground mt-1">合同全生命周期管理</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />新建合同</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">42</p><p className="text-sm text-muted-foreground">合同总数</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-primary">¥58M</p><p className="text-sm text-muted-foreground">合同总额</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-blue-600">18</p><p className="text-sm text-muted-foreground">履行中</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-amber-600">3</p><p className="text-sm text-muted-foreground">即将到期</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>合同列表</CardTitle>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索合同..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(c => (
              <div key={c.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{c.id}</span>
                    {c.status === "即将到期" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  </div>
                  <p className="font-medium mt-1">{c.title}</p>
                  <p className="text-sm text-muted-foreground">客户: {c.customer} · {c.signDate} ~ {c.endDate}</p>
                </div>
                <div className="text-right">
                  <Badge className={c.status === "履行中" ? "bg-blue-100 text-blue-700" : c.status === "已签署" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>{c.status}</Badge>
                  <p className="text-lg font-bold mt-1">{c.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
