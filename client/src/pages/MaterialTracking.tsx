/**
 * 物料追踪页面
 * 物料入库、出库、追踪、库存预警
 * Data source: operationsDashboard.getMaterials (DB-backed)
 */
import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Search, Truck, AlertTriangle, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

export default function MaterialTracking() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const materialsQuery = trpc.operationsDashboard.getMaterials.useQuery(undefined, QUERY_OPTS);
  const materials = (materialsQuery.data ?? []) as any[];

  const filtered = useMemo(() => {
    if (!search) return materials;
    return materials.filter((m: any) => (m.name ?? "").includes(search) || (m.id ?? "").includes(search));
  }, [materials, search]);

  const statusLabels: Record<string, string> = {
    "在库": t("supply.materialTracking.statusInStockLabel"),
    "已领料": t("supply.materialTracking.statusIssuedLabel"),
    "在途": t("supply.materialTracking.statusInTransitLabel"),
    "低库存": t("supply.materialTracking.statusLowStockLabel"),
  };

  if (materialsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title={t("supply.materialTracking.title")}
        description={t("supply.materialTracking.pageDesc")}
        actions={
          <>
            <Button>{t("supply.materialTracking.receiptEntry")}</Button>
            <Button variant="outline">{t("supply.materialTracking.materialRequest")}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package} label={t("supply.materialTracking.materialTypes")} value="1,842" iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={BarChart3} label={t("supply.materialTracking.inventoryValue")} value="¥4.5M" iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={AlertTriangle} label={t("supply.materialTracking.lowStockAlert")} value={18} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={Truck} label={t("supply.materialTracking.inTransitMaterials")} value={23} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("supply.materialTracking.materialListTitle")}</CardTitle>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t("supply.materialTracking.searchMaterial")} className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map((m: any) => (
              <div key={m.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{m.id}</span>
                    <Badge variant="outline">{m.batch}</Badge>
                  </div>
                  <p className="font-medium mt-1">{m.name}</p>
                  <p className="text-sm text-muted-foreground">{t("supply.materialTracking.location")}: {m.location} · {t("supply.materialTracking.qty")}: {m.qty}{m.unit} · {t("supply.materialTracking.project")}: {m.project}</p>
                </div>
                <Badge className={m.status === "在库" ? "bg-green-100 text-green-700" : m.status === "在途" ? "bg-blue-100 text-blue-700" : m.status === "已领料" ? "bg-gray-100 text-gray-700" : "bg-amber-100 text-amber-700"}>
                  {m.status === "低库存" && <AlertTriangle className="h-3 w-3 mr-1" />}{statusLabels[m.status] ?? m.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
