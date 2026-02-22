/**
 * 备件管理页面
 * Wired to supplyChain.sparePart router
 * 备件库存管理与需求预测
 */
import { useState } from "react";
import { toast } from "sonner";
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
  "正常": "green",
  "低库存": "orange",
  "缺货": "red",
});

function getStockStatus(current: number, reorder: number) {
  if (current === 0) return "缺货";
  if (current <= reorder) return "低库存";
  return "正常";
}

export default function SpareParts() {
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

  const handleCreate = async () => {
    if (!formData.name.trim()) { toast.error("请输入备件名称"); return; }
    if (!formData.model.trim()) { toast.error("请输入型号"); return; }
    if (!formData.stock || Number(formData.stock) < 0) { toast.error("请输入有效的库存数量"); return; }
    if (!formData.minStock || Number(formData.minStock) < 0) { toast.error("请输入有效的最低库存"); return; }

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
      toast.success("备件入库登记成功");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "创建失败");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title="备件管理"
        description="备件库存管理与需求预测"
        actions={
          <>
            <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />入库登记</Button>
            <Button variant="outline"><Truck className="h-4 w-4 mr-2" />采购申请</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package} label="备件种类" value={stats?.total ?? parts.length} />
        <StatCard icon={DollarSign} label="库存价值" value={stats?.totalValue ? `¥${(stats.totalValue / 10000).toFixed(1)}万` : "—"} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={AlertTriangle} label="低库存预警" value={stats?.lowStock ?? parts.filter((p: any) => p.status === "低库存").length} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label="关键备件" value={stats?.critical ?? 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
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
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>入库登记</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sp-name">备件名称 *</Label>
              <Input id="sp-name" placeholder="例如：清洗喷嘴组件" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-model">型号 *</Label>
              <Input id="sp-model" placeholder="例如：GRT-NZ-320" value={formData.model} onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sp-stock">库存数量 *</Label>
                <Input id="sp-stock" type="number" min="0" placeholder="例如：45" value={formData.stock} onChange={e => setFormData(prev => ({ ...prev, stock: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-min">最低库存 *</Label>
                <Input id="sp-min" type="number" min="0" placeholder="例如：20" value={formData.minStock} onChange={e => setFormData(prev => ({ ...prev, minStock: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-supplier">供应商</Label>
              <Input id="sp-supplier" placeholder="例如：博世" value={formData.supplier} onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-price">单价</Label>
              <Input id="sp-price" placeholder="例如：1200" value={formData.price} onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleCreate}>登记入库</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
