/**
 * 库存看板页面
 * 总览卡片、库存水平表、最近出入库动态、批次追溯、临期预警
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package, AlertTriangle, TrendingUp, ArrowDownToLine, ArrowUpFromLine,
  Search, Clock, CalendarClock, ShieldAlert, ChevronRight, Boxes,
} from "lucide-react";

// ── Mock Data ──
const OVERVIEW = { totalSKUs: 1842, totalValue: 4520000, lowStockAlerts: 18, pendingReceipts: 7 };

const STOCK_LEVELS = [
  { material: "304不锈钢板 3mm", code: "MAT-001", currentQty: 120, minQty: 50, maxQty: 500, unit: "张", status: "normal" },
  { material: "西门子S7-1500 CPU", code: "MAT-002", currentQty: 3, minQty: 5, maxQty: 20, unit: "个", status: "low" },
  { material: "耐酸泵 50L/min", code: "MAT-003", currentQty: 28, minQty: 10, maxQty: 30, unit: "台", status: "normal" },
  { material: "PTFE密封圈 DN80", code: "MAT-004", currentQty: 3, minQty: 20, maxQty: 200, unit: "包", status: "low" },
  { material: "304不锈钢管 DN50", code: "MAT-005", currentQty: 580, minQty: 100, maxQty: 500, unit: "米", status: "overstock" },
  { material: "ABB变频器 ACS580", code: "MAT-006", currentQty: 12, minQty: 5, maxQty: 25, unit: "台", status: "normal" },
  { material: "液位传感器 FMP51", code: "MAT-007", currentQty: 2, minQty: 8, maxQty: 30, unit: "个", status: "low" },
];

const MOVEMENTS = [
  { id: 1, type: "in", material: "304不锈钢板 3mm", qty: 100, unit: "张", warehouse: "原材料主仓", time: "2026-02-13 09:30", operator: "王建国" },
  { id: 2, type: "out", material: "西门子S7-1500 CPU", qty: 2, unit: "个", warehouse: "原材料主仓", time: "2026-02-13 08:45", operator: "张伟" },
  { id: 3, type: "in", material: "耐酸泵 50L/min", qty: 5, unit: "台", warehouse: "备件仓", time: "2026-02-12 16:20", operator: "赵敏" },
  { id: 4, type: "out", material: "PTFE密封圈 DN80", qty: 10, unit: "包", warehouse: "原材料主仓", time: "2026-02-12 14:30", operator: "王建国" },
  { id: 5, type: "in", material: "ABB变频器 ACS580", qty: 8, unit: "台", warehouse: "原材料主仓", time: "2026-02-12 10:00", operator: "李晓明" },
  { id: 6, type: "out", material: "304不锈钢管 DN50", qty: 50, unit: "米", warehouse: "原材料主仓", time: "2026-02-11 15:40", operator: "张伟" },
  { id: 7, type: "in", material: "液位传感器 FMP51", qty: 10, unit: "个", warehouse: "备件仓", time: "2026-02-11 11:20", operator: "赵敏" },
  { id: 8, type: "out", material: "耐酸泵 50L/min", qty: 3, unit: "台", warehouse: "原材料主仓", time: "2026-02-10 16:00", operator: "王建国" },
];

const EXPIRY_ALERTS = [
  { material: "环氧树脂AB胶", code: "MAT-021", lotNumber: "LOT-2025-088", expiryDate: "2026-03-01", daysLeft: 16, qty: 50, unit: "kg" },
  { material: "硅胶密封条", code: "MAT-035", lotNumber: "LOT-2025-102", expiryDate: "2026-02-28", daysLeft: 15, qty: 200, unit: "米" },
  { material: "防锈切削液", code: "MAT-042", lotNumber: "LOT-2025-115", expiryDate: "2026-03-15", daysLeft: 30, qty: 120, unit: "L" },
];

const MOCK_TRACE_FORWARD = {
  lot: { lotNumber: "LOT-2026-001", materialCode: "MAT-001", materialName: "304不锈钢板 3mm", supplierName: "上海宝钢", productionDate: "2026-01-15" },
  allocations: [
    { issueCode: "ISS-20260205-0001", projectCode: "PRJ-2026-001", requestedQty: 30, issuedAt: "2026-02-05" },
    { issueCode: "ISS-20260208-0003", projectCode: "PRJ-2026-003", requestedQty: 20, issuedAt: "2026-02-08" },
  ],
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  normal: { label: "正常", color: "bg-green-100 text-green-700" },
  low: { label: "低库存", color: "bg-red-100 text-red-700" },
  overstock: { label: "超储", color: "bg-amber-100 text-amber-700" },
};

function StockLevelsSection() {
  const [search, setSearch] = useState("");
  const filtered = STOCK_LEVELS.filter(s => !search || s.material.includes(search) || s.code.includes(search));
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5" />库存水平</CardTitle>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索物料..." className="pl-9 w-56" value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="p-2">物料编码</th><th className="p-2">物料名称</th><th className="p-2 text-right">当前数量</th><th className="p-2 text-right">最低库存</th><th className="p-2 text-right">最高库存</th><th className="p-2">状态</th>
            </tr></thead>
            <tbody>{filtered.map(s => {
              const st = STATUS_CONFIG[s.status] || { label: s.status, color: "" };
              return (
                <tr key={s.code} className="border-b hover:bg-accent/30">
                  <td className="p-2 font-mono text-xs">{s.code}</td>
                  <td className="p-2">{s.material}</td>
                  <td className="p-2 text-right font-medium">{s.currentQty} {s.unit}</td>
                  <td className="p-2 text-right text-muted-foreground">{s.minQty}</td>
                  <td className="p-2 text-right text-muted-foreground">{s.maxQty}</td>
                  <td className="p-2"><Badge className={st.color}>{s.status === "low" && <AlertTriangle className="h-3 w-3 mr-1" />}{st.label}</Badge></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function MovementsTimeline() {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />最近出入库动态</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {MOVEMENTS.map(m => (
            <div key={m.id} className="flex items-start gap-3">
              <div className={`mt-1 rounded-full p-1.5 ${m.type === "in" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"}`}>
                {m.type === "in" ? <ArrowDownToLine className="h-3.5 w-3.5" /> : <ArrowUpFromLine className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{m.type === "in" ? "入库" : "出库"}: {m.material} x{m.qty}{m.unit}</p>
                <p className="text-xs text-muted-foreground">{m.warehouse} | {m.operator} | {m.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LotTraceSection() {
  const [lotSearch, setLotSearch] = useState("");
  const [showResult, setShowResult] = useState(false);
  const handleSearch = () => { if (lotSearch.trim()) setShowResult(true); };
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />批次追溯</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input placeholder="输入批次号 (LOT-2026-001)..." value={lotSearch} onChange={e => setLotSearch(e.target.value)} />
          <Button onClick={handleSearch}>追溯</Button>
        </div>
        {showResult && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg border bg-accent/30">
              <p className="font-medium">批次: {MOCK_TRACE_FORWARD.lot.lotNumber}</p>
              <p className="text-sm text-muted-foreground">{MOCK_TRACE_FORWARD.lot.materialName} | 供应商: {MOCK_TRACE_FORWARD.lot.supplierName} | 生产日期: {MOCK_TRACE_FORWARD.lot.productionDate}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">正向追溯 (批次 → 项目/工单)</p>
              {MOCK_TRACE_FORWARD.allocations.map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded border mb-1">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs">{a.issueCode}</span>
                  <span className="text-sm">→ 项目 {a.projectCode}</span>
                  <span className="text-sm text-muted-foreground ml-auto">数量: {a.requestedQty} | {a.issuedAt}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExpiryAlerts() {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-amber-500" />临期预警</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {EXPIRY_ALERTS.map((e, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-amber-200/50 bg-amber-50/30">
              <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{e.material} <span className="font-mono text-xs text-muted-foreground">({e.code})</span></p>
                <p className="text-xs text-muted-foreground">批次: {e.lotNumber} | 库存: {e.qty}{e.unit} | 到期: {e.expiryDate}</p>
              </div>
              <Badge className={e.daysLeft <= 15 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                {e.daysLeft}天后到期
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InventoryDashboard() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Package} title="库存看板" description="实时库存总览、出入库动态、批次追溯与预警" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Boxes} label="物料SKU总数" value={OVERVIEW.totalSKUs.toLocaleString()} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={TrendingUp} label="库存总价值" value={`${(OVERVIEW.totalValue / 10000).toFixed(0)}万`} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" />
          <StatCard icon={AlertTriangle} label="低库存预警" value={OVERVIEW.lowStockAlerts} iconColor="text-red-500" iconBg="bg-red-500/10" />
          <StatCard icon={ArrowDownToLine} label="待入库单据" value={OVERVIEW.pendingReceipts} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
        </div>
        <StockLevelsSection />
        <div className="grid gap-6 lg:grid-cols-2">
          <MovementsTimeline />
          <ExpiryAlerts />
        </div>
        <LotTraceSection />
      </div>
    </Layout>
  );
}
