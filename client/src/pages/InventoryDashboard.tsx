/**
 * 库存看板页面
 * Wired to warehouse.router.ts + materials.router.ts
 * 总览卡片、库存水平表、最近出入库动态、批次追溯、临期预警
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSkeleton } from "@/components/PageSkeleton";
import {
  Package, AlertTriangle, TrendingUp, ArrowDownToLine, ArrowUpFromLine,
  Search, Clock, CalendarClock, ShieldAlert, ChevronRight, Boxes,
} from "lucide-react";

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );
}

function StockLevelsSection() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  const statusConfig: Record<string, { label: string; color: string }> = {
    normal: { label: t("supply.inventory.normal"), color: "bg-green-100 text-green-700" },
    low: { label: t("supply.inventory.lowStock"), color: "bg-red-100 text-red-700" },
    overstock: { label: t("supply.inventory.overstock"), color: "bg-amber-100 text-amber-700" },
  };

  const query = trpc.warehouse.getLots.useQuery({});
  const lots: any[] = (query.data as any)?.items ?? [];
  const isLoading = query.isLoading;

  // Derive stock levels from lots grouped by materialCode
  const stockMap = new Map<string, { material: string; code: string; currentQty: number; unit: string; minQty: number; maxQty: number; status: string }>();
  lots.forEach((lot: any) => {
    const existing = stockMap.get(lot.materialCode);
    const qty = Number(lot.currentQty) || 0;
    if (existing) {
      existing.currentQty += qty;
    } else {
      stockMap.set(lot.materialCode, {
        material: lot.materialName || lot.materialCode,
        code: lot.materialCode,
        currentQty: qty,
        unit: lot.unit || "",
        minQty: 0,
        maxQty: 0,
        status: qty <= 5 ? "low" : "normal",
      });
    }
  });
  const stockLevels = Array.from(stockMap.values());
  const filtered = stockLevels.filter(s => !search || s.material.includes(search) || s.code.includes(search));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5" />{t("supply.inventory.stockLevelsTitle")}</CardTitle>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t("supply.inventory.searchMaterial")} className="pl-9 w-56" value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <LoadingSkeleton rows={5} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="p-2">{t("supply.inventory.materialCode")}</th><th className="p-2">{t("supply.inventory.materialName")}</th><th className="p-2 text-right">{t("supply.inventory.currentQuantity")}</th><th className="p-2">{t("supply.inventory.statusLabel")}</th>
              </tr></thead>
              <tbody>{filtered.map(s => {
                const st = statusConfig[s.status] || { label: s.status, color: "" };
                return (
                  <tr key={s.code} className="border-b hover:bg-accent/30">
                    <td className="p-2 font-mono text-xs">{s.code}</td>
                    <td className="p-2">{s.material}</td>
                    <td className="p-2 text-right font-medium">{s.currentQty} {s.unit}</td>
                    <td className="p-2"><Badge className={st.color}>{s.status === "low" && <AlertTriangle className="h-3 w-3 mr-1" />}{st.label}</Badge></td>
                  </tr>
                );
              })}</tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground">{t("supply.inventory.noStockData")}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MovementsTimeline() {
  const { t } = useLanguage();
  // Combine receipts and issues as movement timeline
  const rq = trpc.warehouse.getReceipts.useQuery({});
  const receipts = ((rq.data as any)?.items ?? []).map((r: any) => ({ ...r, _type: "in" }));

  const iq = trpc.warehouse.getIssues.useQuery({});
  const issues = ((iq.data as any)?.items ?? []).map((i: any) => ({ ...i, _type: "out" }));

  const movements = [...receipts, ...issues]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 8);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />{t("supply.inventory.recentMovements")}</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {movements.length === 0 && <div className="text-center py-4 text-muted-foreground">{t("supply.inventory.noMovements")}</div>}
          {movements.map((m: any, idx: number) => (
            <div key={`${m._type}-${m.id || idx}`} className="flex items-start gap-3">
              <div className={`mt-1 rounded-full p-1.5 ${m._type === "in" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"}`}>
                {m._type === "in" ? <ArrowDownToLine className="h-3.5 w-3.5" /> : <ArrowUpFromLine className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{m._type === "in" ? t("supply.inventory.receipt") : t("supply.inventory.issue")}: {m.receiptCode || m.issueCode}</p>
                <p className="text-xs text-muted-foreground">{m.receivedByName || m.issuedByName || "—"} | {m.createdAt}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ExpiryAlerts() {
  const { t, tpl } = useLanguage();
  // Use lots to find those nearing expiry
  const query = trpc.warehouse.getLots.useQuery({});
  const lots: any[] = (query.data as any)?.items ?? [];

  const now = Date.now();
  const expiryAlerts = lots
    .filter((l: any) => l.expiryDate)
    .map((l: any) => {
      const daysLeft = Math.ceil((new Date(l.expiryDate).getTime() - now) / 86400000);
      return { ...l, daysLeft };
    })
    .filter((l: any) => l.daysLeft > 0 && l.daysLeft <= 60)
    .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-amber-500" />{t("supply.inventory.expiryWarning")}</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {expiryAlerts.length === 0 && <div className="text-center py-4 text-muted-foreground">{t("supply.inventory.noExpiringMaterials")}</div>}
          {expiryAlerts.map((e: any, i: number) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-amber-200/50 bg-amber-50/30">
              <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{e.materialName} <span className="font-mono text-xs text-muted-foreground">({e.materialCode})</span></p>
                <p className="text-xs text-muted-foreground">{t("supply.inventory.lotBatch")}: {e.lotNumber} | {t("supply.inventory.stockLevels")}: {e.currentQty}{e.unit || ""} | {e.expiryDate}</p>
              </div>
              <Badge className={e.daysLeft <= 15 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                {tpl("supply.inventory.expiresInDays", { days: e.daysLeft })}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LotTraceSection() {
  const { t } = useLanguage();
  const [lotSearch, setLotSearch] = useState("");
  const [traceResult, setTraceResult] = useState<any>(null);
  const trpcUtils = trpc.useUtils();

  const handleSearch = async () => {
    if (!lotSearch.trim()) return;
    try {
      const res = await trpcUtils.warehouse.traceForward.fetch({ lotNumber: lotSearch });
      setTraceResult(res);
    } catch { /* fallback */ }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />{t("supply.inventory.lotTrace")}</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input placeholder={t("supply.inventory.enterLotNumber")} value={lotSearch} onChange={e => setLotSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} />
          <Button onClick={handleSearch}>{t("supply.inventory.trace")}</Button>
        </div>
        {traceResult && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg border bg-accent/30">
              <p className="font-medium">{t("supply.inventory.lotBatch")}: {traceResult.lot?.lotNumber}</p>
              <p className="text-sm text-muted-foreground">{traceResult.lot?.materialName} | {t("supply.inventory.supplierLabel")}: {traceResult.lot?.supplierName || "—"} | {t("supply.inventory.receiptDate")}: {traceResult.lot?.receivedDate || "—"}</p>
            </div>
            {traceResult.allocations?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">{t("supply.inventory.forwardTrace")}</p>
                {traceResult.allocations.map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded border mb-1">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs">{a.issueCode || a.allocationCode}</span>
                    <span className="text-sm">→ {t("supply.inventory.projectLabel")} {a.projectCode || "—"}</span>
                    <span className="text-sm text-muted-foreground ml-auto">{t("supply.inventory.quantityLabel")}: {a.allocatedQty || a.requestedQty} | {a.issuedAt || a.createdAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function InventoryDashboard() {
  const { t } = useLanguage();
  const query = trpc.warehouse.getWarehouseStats.useQuery();
  const stats = query.data;

  if (query.isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader icon={Package} title={t("supply.inventory.title")} description={t("supply.inventory.pageDesc")} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Boxes} label={t("supply.inventory.activeBatches")} value={stats?.totalLots ?? "—"} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={TrendingUp} label={t("supply.inventory.warehouseCount")} value={stats?.totalWarehouses ?? "—"} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" />
        <StatCard icon={AlertTriangle} label={t("supply.inventory.expiringBatches")} value={stats?.expiringLots ?? "—"} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={ArrowDownToLine} label={t("supply.inventory.pendingReceiptDocs")} value={stats?.pendingReceipts ?? "—"} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
      </div>
      <StockLevelsSection />
      <div className="grid gap-6 lg:grid-cols-2">
        <MovementsTimeline />
        <ExpiryAlerts />
      </div>
      <LotTraceSection />
    </div>
  );
}
