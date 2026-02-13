/**
 * 合同管理页面
 * 合同创建、审批、履行追踪、到期提醒
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileCheck, Plus, Search, DollarSign, Clock, AlertTriangle } from "lucide-react";

const contractStatusColorMap = createStatusColorMap({
  "履行中": "blue",
  "已签署": "green",
  "即将到期": "orange",
  "已完成": "slate",
});

// TODO: 接入 tRPC 后端接口替换
const MOCK_CONTRACTS = [
  { id: "CT-2026-001", customer: "上海大众", title: "缸体清洗线采购合同", amount: "¥2,850,000", status: "履行中", signDate: "2026-01-15", endDate: "2027-01-15", progress: 35 },
  { id: "CT-2026-002", customer: "英飞凌", title: "晶圆清洗设备合同", amount: "€1,500,000", status: "已签署", signDate: "2026-02-01", endDate: "2027-06-01", progress: 10 },
  { id: "CT-2025-015", customer: "潍柴动力", title: "年度维保合同", amount: "¥480,000", status: "即将到期", signDate: "2025-03-01", endDate: "2026-03-01", progress: 95 },
];

export default function ContractManagement() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_CONTRACTS.filter(c => !search || c.customer.includes(search) || c.title.includes(search));

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={FileCheck}
        title="合同管理"
        description="合同全生命周期管理"
        actions={<Button><Plus className="h-4 w-4 mr-2" />新建合同</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileCheck} label="合同总数" value={42} />
        <StatCard icon={DollarSign} label="合同总额" value="¥58M" iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Clock} label="履行中" value={18} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label="即将到期" value={3} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>合同列表</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索合同..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(c => (
              <div key={c.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{c.id}</span>
                    {c.status === "即将到期" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  </div>
                  <p className="font-medium mt-1">{c.title}</p>
                  <p className="text-sm text-muted-foreground">客户: {c.customer} · {c.signDate} ~ {c.endDate}</p>
                </div>
                <div className="text-right">
                  <StatusBadge color={contractStatusColorMap[c.status as keyof typeof contractStatusColorMap] ?? "gray"}>{c.status}</StatusBadge>
                  <p className="text-lg font-bold mt-1">{c.amount}</p>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileCheck className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无合同数据</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}
