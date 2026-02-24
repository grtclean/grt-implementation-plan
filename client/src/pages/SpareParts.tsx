/**
 * 备件管理页面
 * Wired to supplyChain.sparePart router
 * 备件库存管理与需求预测
 */
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Plus, Search, AlertTriangle, CheckCircle2, Truck, DollarSign } from "lucide-react";

const stockStatusColorMap = createStatusColorMap({
  "normal": "green",
  "low": "orange",
  "outOfStock": "red",
});

function getStockStatus(current: number, reorder: number): string {
  if (current === 0) return "outOfStock";
  if (current <= reorder) return "low";
  return "normal";
}

export default function SpareParts() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    model: "",
    stock: "",
    minStock: "",
    supplier: "",
    price: "",
  });

  // Wire to backend
  const partsQuery = trpc.supplyChain.sparePart.list.useQuery({});
  const partsData = partsQuery.data?.items ?? [];
  const isLoading = partsQuery.isLoading;
  const refetch = partsQuery.refetch;

  const statsQuery = trpc.supplyChain.sparePart.stats.useQuery();
  const stats = statsQuery.data;

  const createMutation = trpc.supplyChain.sparePart.create.useMutation();

  const parts = partsData.map((p: any) => ({
    id: p.partCode || `SP-${p.id}`,
    dbId: p.id,
    name: p.materialName,
    model: p.specification || p.materialCode,
    stock: p.currentStock || 0,
    minStock: p.reorderPoint || 0,
    status: getStockStatus(p.currentStock || 0, p.reorderPoint || 0),
    price: p.unitPrice ? `¥${Number(p.unitPrice).toLocaleString()}` : "—",
    supplier: p.preferredSupplierName || "—",
  }));

  const filtered = parts.filter((p: any) => !search || p.name?.includes(search) || p.model?.includes(search));

  const statusLabelMap: Record<string, string> = {
    "normal": t("supply.spareParts.statusNormalLabel"),
    "low": t("supply.spareParts.statusLowLabel"),
    "outOfStock": t("supply.spareParts.statusOutOfStockLabel"),
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) { toast.error(t("supply.spareParts.enterPartName")); return; }
    if (!formData.model.trim()) { toast.error(t("supply.spareParts.enterModel")); return; }
    if (!formData.stock || Number(formData.stock) < 0) { toast.error(t("supply.spareParts.enterValidStock")); return; }
    if (!formData.minStock || Number(formData.minStock) < 0) { toast.error(t("supply.spareParts.enterValidMinStock")); return; }

    try {
      await createMutation.mutateAsync({
        materialCode: formData.model.trim(),
        materialName: formData.name.trim(),
        specification: formData.model.trim(),
        currentStock: Number(formData.stock),
        reorderPoint: Number(formData.minStock),
        minStockLevel: Number(formData.minStock),
        preferredSupplierName: formData.supplier.trim() || undefined,
        unitPrice: formData.price.replace(/[¥,]/g, "").trim() || undefined,
      });
      setShowCreateDialog(false);
      setFormData({ name: "", model: "", stock: "", minStock: "", supplier: "", price: "" });
      toast.success(t("supply.spareParts.registerSuccess"));
      refetch();
    } catch (e: any) {
      toast.error(e.message || t("supply.p2p.createFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title={t("supply.spareParts.title")}
        description={t("supply.spareParts.pageDesc")}
        actions={
          <>
            <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />{t("supply.spareParts.registerEntry")}</Button>
            <Button variant="outline"><Truck className="h-4 w-4 mr-2" />{t("supply.spareParts.purchaseRequest")}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package} label={t("supply.spareParts.partTypes")} value={stats?.total ?? parts.length} />
        <StatCard icon={DollarSign} label={t("supply.spareParts.inventoryValue")} value={stats?.totalValue ? `¥${(stats.totalValue / 10000).toFixed(1)}万` : "—"} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={AlertTriangle} label={t("supply.spareParts.lowStockWarning")} value={stats?.lowStock ?? parts.filter((p: any) => p.status === "low").length} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label={t("supply.spareParts.criticalParts")} value={stats?.critical ?? 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("supply.spareParts.partsInventory")}</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("supply.spareParts.searchParts")} className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p: any) => (
                <div key={p.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{p.id}</span>
                      <span className="font-medium">{p.name}</span>
                      <Badge variant="secondary">{p.model}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{t("supply.spareParts.supplierLabel")}: {p.supplier} · {t("supply.spareParts.unitPriceShort")}: {p.price}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge color={stockStatusColorMap[p.status as keyof typeof stockStatusColorMap] ?? "gray"}>
                      {p.status === "low" && <AlertTriangle className="h-3 w-3 mr-1 inline" />}{statusLabelMap[p.status] ?? p.status}
                    </StatusBadge>
                    <p className="text-sm mt-1">{t("supply.spareParts.stockLabel")}: <span className={p.stock < p.minStock ? "text-red-600 font-bold" : ""}>{p.stock}</span> / {t("supply.spareParts.minStockLabel")}: {p.minStock}</p>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mb-3 opacity-50" />
                  <p className="font-medium">{t("supply.spareParts.noPartsData")}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("supply.spareParts.registerEntryDialog")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sp-name">{t("supply.spareParts.partNameLabel")}</Label>
              <Input id="sp-name" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-model">{t("supply.spareParts.modelLabel")}</Label>
              <Input id="sp-model" value={formData.model} onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sp-stock">{t("supply.spareParts.stockQty")}</Label>
                <Input id="sp-stock" type="number" min="0" value={formData.stock} onChange={e => setFormData(prev => ({ ...prev, stock: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-min">{t("supply.spareParts.minStock")}</Label>
                <Input id="sp-min" type="number" min="0" value={formData.minStock} onChange={e => setFormData(prev => ({ ...prev, minStock: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-supplier">{t("supply.spareParts.supplierInputLabel")}</Label>
              <Input id="sp-supplier" value={formData.supplier} onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-price">{t("supply.spareParts.unitPriceInputLabel")}</Label>
              <Input id="sp-price" value={formData.price} onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("supply.common.cancel")}</Button>
            <Button onClick={handleCreate}>{t("supply.spareParts.registerBtn")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
