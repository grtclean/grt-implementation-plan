/**
 * 成本标准与产品配置页面
 * 人工成本、制造费用、物料加价、产品配置 — 连接真实 tRPC 后端
 */
import { useState } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign, Users, Factory, Package, Settings, Plus, Pencil,
  Calculator, Percent, Link2, Save, Loader2, DatabaseZap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Types inferred from backend ──
type CostStandard = {
  id: number;
  category: string;
  code: string;
  name: string;
  nameEn?: string | null;
  hourlyRate?: string | null;
  dailyRate?: string | null;
  overtimeMultiplier?: string | null;
  monthlyAmount?: string | null;
  allocationBase?: string | null;
  allocationRate?: string | null;
  allocationUnit?: string | null;
  markupPercent?: string | null;
  minMarkup?: string | null;
  applyTo?: string | null;
  description?: string | null;
  effectiveFrom?: string | null;
  isActive?: boolean | null;
};

type ProductConfig = {
  id: number;
  modelCode: string;
  productName: string;
  bomCode?: string | null;
  materialCost?: string | null;
  laborCost?: string | null;
  overheadCost?: string | null;
  otherCost?: string | null;
  basePrice?: string | null;
  marginPercent?: string | null;
};

// ── Helper to format allocationBase ──
const ALLOCATION_LABELS: Record<string, string> = {
  direct_labor_hours: "按工时分摊",
  machine_hours: "按机时分摊",
  production_units: "按产量分摊",
  project_count: "按项目分摊",
  floor_area: "按面积分摊",
  revenue: "按收入分摊",
};

const APPLY_TO_LABELS: Record<string, string> = {
  all: "所有",
  imported: "进口",
  domestic: "国产",
};

// ── Labor Cost Tab ──
function LaborCostTab({ items, onEdit }: { items: CostStandard[]; onEdit: (item: CostStandard) => void }) {
  const { t } = useLanguage();
  const labor = items.filter(i => i.category === "labor");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("finance.costStd.laborDesc")}</p>
      </div>
      {labor.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t("finance.costStd.noLaborData")}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="p-2">{t("finance.costStd.thRole")}</th><th className="p-2">{t("finance.costStd.thEnName")}</th><th className="p-2 text-right">{t("finance.costStd.thHourlyRate")}</th><th className="p-2 text-right">{t("finance.costStd.thDailyRate")}</th><th className="p-2 text-right">{t("finance.costStd.thOvertimeRate")}</th><th className="p-2">{t("finance.costStd.thEffectiveDate")}</th><th className="p-2">{t("finance.costStd.thStatus")}</th><th className="p-2">{t("finance.costStd.thActions")}</th>
            </tr></thead>
            <tbody>{labor.map(lr => (
              <tr key={lr.id} className="border-b hover:bg-accent/30">
                <td className="p-2 font-medium">{lr.name}</td>
                <td className="p-2 text-muted-foreground">{lr.nameEn || "-"}</td>
                <td className="p-2 text-right font-mono">{lr.hourlyRate || "-"}</td>
                <td className="p-2 text-right font-mono">{lr.dailyRate || "-"}</td>
                <td className="p-2 text-right">{lr.overtimeMultiplier || "1.5"}x</td>
                <td className="p-2 text-muted-foreground">{lr.effectiveFrom || "-"}</td>
                <td className="p-2"><Badge className={lr.isActive !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>{lr.isActive !== false ? t("finance.costStd.statusActive") : t("finance.costStd.statusInactive")}</Badge></td>
                <td className="p-2"><Button variant="ghost" size="icon" onClick={() => onEdit(lr)}><Pencil className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Overhead Tab ──
function OverheadTab({ items, onEdit }: { items: CostStandard[]; onEdit: (item: CostStandard) => void }) {
  const { t } = useLanguage();
  const ALLOCATION_LABELS_L: Record<string, string> = {
    direct_labor_hours: t("finance.costStd.allocationByLaborHours"),
    machine_hours: t("finance.costStd.allocationByMachineHours"),
    production_units: t("finance.costStd.allocationByUnits"),
    project_count: t("finance.costStd.allocationByProject"),
    floor_area: t("finance.costStd.allocationByArea"),
    revenue: t("finance.costStd.allocationByRevenue"),
  };
  const overhead = items.filter(i => i.category === "overhead");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("finance.costStd.overheadDesc")}</p>
      </div>
      {overhead.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t("finance.costStd.noOverheadData")}</div>
      ) : (
        <div className="grid gap-4">
          {overhead.map(oc => (
            <Card key={oc.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{oc.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t("finance.costStd.allocationMethod")}: {ALLOCATION_LABELS_L[oc.allocationBase || ""] || oc.allocationBase || "-"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-mono font-bold">{oc.monthlyAmount ? `${(Number(oc.monthlyAmount) / 10000).toFixed(1)}${t("finance.costStd.perMonth")}` : "-"}</p>
                    <p className="text-sm text-muted-foreground">{t("finance.costStd.rateLabel")}: {oc.allocationRate || "-"} {oc.allocationUnit || ""}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(oc)}><Pencil className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Material Markup Tab ──
function MaterialMarkupTab({ items, onEdit }: { items: CostStandard[]; onEdit: (item: CostStandard) => void }) {
  const { t } = useLanguage();
  const APPLY_TO_LABELS_L: Record<string, string> = {
    all: t("finance.costStd.scopeAll"),
    imported: t("finance.costStd.scopeImported"),
    domestic: t("finance.costStd.scopeDomestic"),
  };
  const markups = items.filter(i => i.category === "material_markup");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("finance.costStd.markupDesc")}</p>
      </div>
      {markups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t("finance.costStd.noMarkupData")}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="p-2">{t("finance.costStd.thMaterialType")}</th><th className="p-2 text-right">{t("finance.costStd.thMarkupRate")}</th><th className="p-2 text-right">{t("finance.costStd.thMinMarkup")}</th><th className="p-2">{t("finance.costStd.thScope")}</th><th className="p-2">{t("finance.costStd.thNotes")}</th><th className="p-2">{t("finance.costStd.thActions")}</th>
            </tr></thead>
            <tbody>{markups.map(mm => (
              <tr key={mm.id} className="border-b hover:bg-accent/30">
                <td className="p-2 font-medium">{mm.name}</td>
                <td className="p-2 text-right font-mono"><span className="flex items-center justify-end gap-1"><Percent className="h-3 w-3" />{mm.markupPercent || "-"}</span></td>
                <td className="p-2 text-right font-mono">{mm.minMarkup || "-"}</td>
                <td className="p-2"><Badge variant="outline">{APPLY_TO_LABELS_L[mm.applyTo || "all"] || mm.applyTo}</Badge></td>
                <td className="p-2 text-muted-foreground">{mm.description || "-"}</td>
                <td className="p-2"><Button variant="ghost" size="icon" onClick={() => onEdit(mm)}><Pencil className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Product Config Tab ──
function ProductConfigTab({ items, onAdd, onEdit }: { items: ProductConfig[]; onAdd: () => void; onEdit: (item: ProductConfig) => void }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("finance.costStd.productDesc")}</p>
        <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4 mr-1" />{t("finance.costStd.newProductConfig")}</Button>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t("finance.costStd.noProductData")}</div>
      ) : (
        <div className="grid gap-4">
          {items.map(pc => {
            const matCost = Number(pc.materialCost) || 0;
            const labCost = Number(pc.laborCost) || 0;
            const ovhCost = Number(pc.overheadCost) || 0;
            const price = Number(pc.basePrice) || 0;
            const totalCost = matCost + labCost + ovhCost + Number(pc.otherCost || 0);
            const margin = price > 0 ? ((price - totalCost) / price) * 100 : 0;
            return (
              <Card key={pc.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onEdit(pc)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold">{pc.modelCode}</span>
                        {pc.bomCode && <Badge variant="outline" className="flex items-center gap-1"><Link2 className="h-3 w-3" />{pc.bomCode}</Badge>}
                      </div>
                      <p className="font-medium mt-1">{pc.productName}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{t("finance.costStd.material")}: {(matCost / 10000).toFixed(1)}万</span>
                        <span>{t("finance.costStd.laborCost")}: {(labCost / 10000).toFixed(1)}万</span>
                        <span>{t("finance.costStd.overheadCost")}: {(ovhCost / 10000).toFixed(1)}万</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{(price / 10000).toFixed(1)}万</p>
                      <Badge className={margin >= 22 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>{t("finance.costStd.grossMargin")} {margin.toFixed(1)}%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Cost Standard Create/Edit Dialog ──
function CostStandardDialog({
  open, onOpenChange, editItem, category,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editItem: CostStandard | null;
  category: "labor" | "overhead" | "material_markup";
}) {
  const utils = trpc.useUtils();
  const isEdit = !!editItem;

  const [form, setForm] = useState(() => getFormDefaults(editItem, category));

  // Reset form when dialog opens with new item
  const [prevEditId, setPrevEditId] = useState<number | null>(null);
  if ((editItem?.id ?? null) !== prevEditId) {
    setPrevEditId(editItem?.id ?? null);
    setForm(getFormDefaults(editItem, category));
  }

  const { t } = useLanguage();
  const createMut = trpc.costStandards.create.useMutation({
    onSuccess: () => { toast.success(t("finance.costStd.createOk")); utils.costStandards.list.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`${t("finance.costStd.createFail")}: ${e.message}`),
  });
  const updateMut = trpc.costStandards.update.useMutation({
    onSuccess: () => { toast.success(t("finance.costStd.updateOk")); utils.costStandards.list.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`${t("finance.costStd.updateFail")}: ${e.message}`),
  });

  const saving = createMut.isPending || updateMut.isPending;

  const handleSave = () => {
    if (!form.name.trim()) { toast.error(t("finance.costStd.nameRequired")); return; }
    if (!isEdit && !form.code.trim()) { toast.error(t("finance.costStd.codeRequired")); return; }

    if (isEdit) {
      const payload: Record<string, unknown> = { id: editItem!.id };
      if (form.name !== editItem!.name) payload.name = form.name;
      if (form.nameEn !== (editItem!.nameEn || "")) payload.nameEn = form.nameEn;
      if (category === "labor") {
        if (form.hourlyRate) payload.hourlyRate = form.hourlyRate;
        if (form.dailyRate) payload.dailyRate = form.dailyRate;
        if (form.overtimeMultiplier) payload.overtimeMultiplier = form.overtimeMultiplier;
        if (form.effectiveFrom) payload.effectiveFrom = form.effectiveFrom;
      }
      if (category === "overhead") {
        if (form.monthlyAmount) payload.monthlyAmount = form.monthlyAmount;
        if (form.allocationBase) payload.allocationBase = form.allocationBase;
        if (form.allocationRate) payload.allocationRate = form.allocationRate;
        if (form.allocationUnit) payload.allocationUnit = form.allocationUnit;
      }
      if (category === "material_markup") {
        if (form.markupPercent) payload.markupPercent = form.markupPercent;
        if (form.minMarkup) payload.minMarkup = form.minMarkup;
        if (form.applyTo) payload.applyTo = form.applyTo;
        if (form.description) payload.description = form.description;
      }
      updateMut.mutate(payload as any);
    } else {
      createMut.mutate({
        category,
        code: form.code,
        name: form.name,
        nameEn: form.nameEn || undefined,
        hourlyRate: form.hourlyRate || undefined,
        dailyRate: form.dailyRate || undefined,
        overtimeMultiplier: form.overtimeMultiplier || undefined,
        monthlyAmount: form.monthlyAmount || undefined,
        allocationBase: form.allocationBase || undefined,
        allocationRate: form.allocationRate || undefined,
        allocationUnit: form.allocationUnit || undefined,
        markupPercent: form.markupPercent || undefined,
        minMarkup: form.minMarkup || undefined,
        applyTo: form.applyTo || undefined,
        description: form.description || undefined,
        effectiveFrom: form.effectiveFrom || undefined,
      });
    }
  };

  const categoryLabels: Record<string, string> = { labor: t("finance.costStd.laborStd"), overhead: t("finance.costStd.overheadStd"), material_markup: t("finance.costStd.markupStd") };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("finance.costStd.editLabel") : t("finance.costStd.addLabel")}{categoryLabels[category]}{t("finance.costStd.standard")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("finance.costStd.codeLabel")} *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="如 LBR-001" /></div>
              <div><Label>{t("finance.costStd.nameLabel")} *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            </div>
          )}
          {isEdit && (
            <div><Label>{t("finance.costStd.nameLabel")} *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          )}
          <div><Label>{t("finance.costStd.enNameLabel")}</Label><Input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} /></div>

          {category === "labor" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>{t("finance.costStd.hourlyRateLabel")}</Label><Input type="number" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })} /></div>
                <div><Label>{t("finance.costStd.dailyRateLabel")}</Label><Input type="number" value={form.dailyRate} onChange={e => setForm({ ...form, dailyRate: e.target.value })} /></div>
                <div><Label>{t("finance.costStd.overtimeLabel")}</Label><Input type="number" step="0.1" value={form.overtimeMultiplier} onChange={e => setForm({ ...form, overtimeMultiplier: e.target.value })} /></div>
              </div>
              <div><Label>{t("finance.costStd.effectiveDateLabel")}</Label><Input type="date" value={form.effectiveFrom} onChange={e => setForm({ ...form, effectiveFrom: e.target.value })} /></div>
            </>
          )}

          {category === "overhead" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("finance.costStd.monthlyAmountLabel")}</Label><Input type="number" value={form.monthlyAmount} onChange={e => setForm({ ...form, monthlyAmount: e.target.value })} /></div>
                <div>
                  <Label>{t("finance.costStd.allocationBasis")}</Label>
                  <Select value={form.allocationBase} onValueChange={v => setForm({ ...form, allocationBase: v })}>
                    <SelectTrigger><SelectValue placeholder={t("finance.costStd.selectAllocation")} /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ALLOCATION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("finance.costStd.rateAmountLabel")}</Label><Input type="number" value={form.allocationRate} onChange={e => setForm({ ...form, allocationRate: e.target.value })} /></div>
                <div><Label>{t("finance.costStd.unitLabel")}</Label><Input value={form.allocationUnit} onChange={e => setForm({ ...form, allocationUnit: e.target.value })} placeholder="元/工时" /></div>
              </div>
            </>
          )}

          {category === "material_markup" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("finance.costStd.markupPercentLabel")}</Label><Input type="number" value={form.markupPercent} onChange={e => setForm({ ...form, markupPercent: e.target.value })} /></div>
                <div><Label>{t("finance.costStd.minMarkupLabel")}</Label><Input type="number" value={form.minMarkup} onChange={e => setForm({ ...form, minMarkup: e.target.value })} /></div>
              </div>
              <div>
                <Label>{t("finance.costStd.scopeLabel")}</Label>
                <Select value={form.applyTo} onValueChange={v => setForm({ ...form, applyTo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("finance.costStd.scopeAll")}</SelectItem>
                    <SelectItem value="imported">{t("finance.costStd.scopeImported")}</SelectItem>
                    <SelectItem value="domestic">{t("finance.costStd.scopeDomestic")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t("finance.costStd.notesLabel")}</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("finance.costStd.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? t("finance.costStd.saveBtn") : t("finance.costStd.createBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getFormDefaults(item: CostStandard | null, category: string) {
  return {
    code: item?.code || "",
    name: item?.name || "",
    nameEn: item?.nameEn || "",
    hourlyRate: item?.hourlyRate || "",
    dailyRate: item?.dailyRate || "",
    overtimeMultiplier: item?.overtimeMultiplier || "1.50",
    effectiveFrom: item?.effectiveFrom || "",
    monthlyAmount: item?.monthlyAmount || "",
    allocationBase: item?.allocationBase || "",
    allocationRate: item?.allocationRate || "",
    allocationUnit: item?.allocationUnit || "",
    markupPercent: item?.markupPercent || "",
    minMarkup: item?.minMarkup || "",
    applyTo: item?.applyTo || "all",
    description: item?.description || "",
  };
}

// ── Product Config Dialog ──
function ProductConfigDialog({
  open, onOpenChange, editItem,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editItem: ProductConfig | null;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!editItem;

  const [form, setForm] = useState(() => getPCFormDefaults(editItem));
  const [prevEditId, setPrevEditId] = useState<number | null>(null);
  if ((editItem?.id ?? null) !== prevEditId) {
    setPrevEditId(editItem?.id ?? null);
    setForm(getPCFormDefaults(editItem));
  }

  const { t } = useLanguage();
  const createMut = trpc.costStandards.createProductConfig.useMutation({
    onSuccess: () => { toast.success(t("finance.costStd.productCreated")); utils.costStandards.listProductConfigs.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`${t("finance.costStd.createFail")}: ${e.message}`),
  });
  const updateMut = trpc.costStandards.updateProductConfig.useMutation({
    onSuccess: () => { toast.success(t("finance.costStd.productUpdated")); utils.costStandards.listProductConfigs.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`${t("finance.costStd.updateFail")}: ${e.message}`),
  });

  const saving = createMut.isPending || updateMut.isPending;

  const handleSave = () => {
    if (!form.modelCode.trim()) { toast.error(t("finance.costStd.modelRequired")); return; }
    if (!form.productName.trim()) { toast.error(t("finance.costStd.productNameRequired")); return; }

    if (isEdit) {
      updateMut.mutate({
        id: editItem!.id,
        modelCode: form.modelCode,
        productName: form.productName,
        bomCode: form.bomCode || undefined,
        materialCost: form.materialCost || undefined,
        laborCost: form.laborCost || undefined,
        overheadCost: form.overheadCost || undefined,
        basePrice: form.basePrice || undefined,
        marginPercent: form.marginPercent || undefined,
      });
    } else {
      createMut.mutate({
        modelCode: form.modelCode,
        productName: form.productName,
        bomCode: form.bomCode || undefined,
        materialCost: form.materialCost || undefined,
        laborCost: form.laborCost || undefined,
        overheadCost: form.overheadCost || undefined,
        basePrice: form.basePrice || undefined,
        marginPercent: form.marginPercent || undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader><DialogTitle>{isEdit ? t("finance.costStd.editProductConfig") : t("finance.costStd.newProductConfigTitle")}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("finance.costStd.modelCode")} *</Label><Input value={form.modelCode} onChange={e => setForm({ ...form, modelCode: e.target.value })} placeholder="GRT-XX-XXXX" /></div>
            <div><Label>{t("finance.costStd.productName")} *</Label><Input value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} /></div>
          </div>
          <div><Label>{t("finance.costStd.bomCode")}</Label><Input value={form.bomCode} onChange={e => setForm({ ...form, bomCode: e.target.value })} placeholder="BOM-2026-XXX" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("finance.costStd.materialCostLabel")}</Label><Input type="number" value={form.materialCost} onChange={e => setForm({ ...form, materialCost: e.target.value })} /></div>
            <div><Label>{t("finance.costStd.laborCostLabel")}</Label><Input type="number" value={form.laborCost} onChange={e => setForm({ ...form, laborCost: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("finance.costStd.overheadCostLabel")}</Label><Input type="number" value={form.overheadCost} onChange={e => setForm({ ...form, overheadCost: e.target.value })} /></div>
            <div><Label>{t("finance.costStd.basePriceLabel")}</Label><Input type="number" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("finance.costStd.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            <Save className="h-4 w-4 mr-1" />{t("finance.costStd.saveConfig")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getPCFormDefaults(item: ProductConfig | null) {
  return {
    modelCode: item?.modelCode || "",
    productName: item?.productName || "",
    bomCode: item?.bomCode || "",
    materialCost: item?.materialCost || "",
    laborCost: item?.laborCost || "",
    overheadCost: item?.overheadCost || "",
    basePrice: item?.basePrice || "",
    marginPercent: item?.marginPercent || "",
  };
}

// ── Default seed data ──
const SEED_LABOR = [
  { code: "LBR-001", name: "高级工程师", nameEn: "Senior Engineer", hourlyRate: "350", dailyRate: "2800", overtimeMultiplier: "1.50", effectiveFrom: "2026-01-01" },
  { code: "LBR-002", name: "工程师", nameEn: "Engineer", hourlyRate: "250", dailyRate: "2000", overtimeMultiplier: "1.50", effectiveFrom: "2026-01-01" },
  { code: "LBR-003", name: "技术员", nameEn: "Technician", hourlyRate: "180", dailyRate: "1440", overtimeMultiplier: "1.50", effectiveFrom: "2026-01-01" },
  { code: "LBR-004", name: "项目经理", nameEn: "Project Manager", hourlyRate: "400", dailyRate: "3200", overtimeMultiplier: "1.50", effectiveFrom: "2026-01-01" },
  { code: "LBR-005", name: "质检员", nameEn: "QC Inspector", hourlyRate: "200", dailyRate: "1600", overtimeMultiplier: "1.50", effectiveFrom: "2026-01-01" },
  { code: "LBR-006", name: "装配工", nameEn: "Assembler", hourlyRate: "150", dailyRate: "1200", overtimeMultiplier: "2.00", effectiveFrom: "2026-01-01" },
];
const SEED_OVERHEAD = [
  { code: "OVH-001", name: "厂房租赁", monthlyAmount: "180000", allocationBase: "direct_labor_hours", allocationRate: "45", allocationUnit: "元/工时" },
  { code: "OVH-002", name: "水电气", monthlyAmount: "85000", allocationBase: "production_units", allocationRate: "120", allocationUnit: "元/台" },
  { code: "OVH-003", name: "设备折旧", monthlyAmount: "250000", allocationBase: "machine_hours", allocationRate: "80", allocationUnit: "元/机时" },
  { code: "OVH-004", name: "质量管理费", monthlyAmount: "60000", allocationBase: "project_count", allocationRate: "5000", allocationUnit: "元/项目" },
  { code: "OVH-005", name: "安全环保", monthlyAmount: "35000", allocationBase: "floor_area", allocationRate: "15", allocationUnit: "元/m2" },
];
const SEED_MARKUP = [
  { code: "MKP-001", name: "钢材类", markupPercent: "8", minMarkup: "500", applyTo: "all", description: "含运输、仓储" },
  { code: "MKP-002", name: "电气元件", markupPercent: "12", minMarkup: "200", applyTo: "imported", description: "含关税、质检" },
  { code: "MKP-003", name: "泵阀类", markupPercent: "10", minMarkup: "300", applyTo: "all", description: "含安装调试" },
  { code: "MKP-004", name: "传感器", markupPercent: "15", minMarkup: "100", applyTo: "imported", description: "含校准" },
  { code: "MKP-005", name: "标准件", markupPercent: "5", minMarkup: "50", applyTo: "domestic", description: "批量采购折扣" },
];
const SEED_PRODUCTS = [
  { modelCode: "GRT-CL-3000", productName: "缸体清洗线", bomCode: "BOM-2026-001", materialCost: "820000", laborCost: "350000", overheadCost: "280000", basePrice: "1850000" },
  { modelCode: "GRT-UT-2000", productName: "超声波清洗机", bomCode: "BOM-2026-005", materialCost: "310000", laborCost: "120000", overheadCost: "95000", basePrice: "680000" },
  { modelCode: "GRT-SP-5000", productName: "喷淋清洗系统", bomCode: "BOM-2026-008", materialCost: "980000", laborCost: "420000", overheadCost: "350000", basePrice: "2200000" },
  { modelCode: "GRT-VD-1500", productName: "真空干燥机", bomCode: "BOM-2026-012", materialCost: "240000", laborCost: "95000", overheadCost: "72000", basePrice: "520000" },
];

// ── Main Page ──
export default function CostStandards() {
  const { t, tpl } = useLanguage();
  const [activeTab, setActiveTab] = useState("labor");
  const [seeding, setSeeding] = useState(false);

  // Dialogs
  const [csDialogOpen, setCsDialogOpen] = useState(false);
  const [csEditItem, setCsEditItem] = useState<CostStandard | null>(null);
  const [csDialogCategory, setCsDialogCategory] = useState<"labor" | "overhead" | "material_markup">("labor");
  const [pcDialogOpen, setPcDialogOpen] = useState(false);
  const [pcEditItem, setPcEditItem] = useState<ProductConfig | null>(null);

  // Data queries
  const { data: csData, isLoading: csLoading } = trpc.costStandards.list.useQuery({});
  const { data: pcData, isLoading: pcLoading } = trpc.costStandards.listProductConfigs.useQuery({});

  const standards = (csData?.items ?? []) as CostStandard[];
  const products = (pcData?.items ?? []) as ProductConfig[];

  const laborCount = standards.filter(s => s.category === "labor").length;
  const overheadCount = standards.filter(s => s.category === "overhead").length;
  const markupCount = standards.filter(s => s.category === "material_markup").length;

  const openAdd = (cat: "labor" | "overhead" | "material_markup") => {
    setCsEditItem(null);
    setCsDialogCategory(cat);
    setCsDialogOpen(true);
  };

  const openEdit = (item: CostStandard) => {
    setCsEditItem(item);
    setCsDialogCategory(item.category as any);
    setCsDialogOpen(true);
  };

  const openPCAdd = () => { setPcEditItem(null); setPcDialogOpen(true); };
  const openPCEdit = (item: ProductConfig) => { setPcEditItem(item); setPcDialogOpen(true); };

  const isLoading = csLoading || pcLoading;
  const isEmpty = standards.length === 0 && products.length === 0 && !isLoading;

  const utils = trpc.useUtils();
  const createCsMut = trpc.costStandards.create.useMutation();
  const createPcMut = trpc.costStandards.createProductConfig.useMutation();

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      for (const item of SEED_LABOR) {
        await createCsMut.mutateAsync({ category: "labor", ...item });
      }
      for (const item of SEED_OVERHEAD) {
        await createCsMut.mutateAsync({ category: "overhead", ...item });
      }
      for (const item of SEED_MARKUP) {
        await createCsMut.mutateAsync({ category: "material_markup", ...item });
      }
      for (const item of SEED_PRODUCTS) {
        await createPcMut.mutateAsync(item);
      }
      utils.costStandards.list.invalidate();
      utils.costStandards.listProductConfigs.invalidate();
      toast.success(tpl("finance.costStd.seedSuccess", { standards: SEED_LABOR.length + SEED_OVERHEAD.length + SEED_MARKUP.length, products: SEED_PRODUCTS.length }));
    } catch (e: any) {
      toast.error(`${t("finance.costStd.seedFailed")}: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
      <>
      <div className="space-y-6">
        <PageHeader
          icon={Calculator}
          title={t("finance.costStd.titleFull")}
          description={t("finance.costStd.descFull")}
          actions={
            <div className="flex items-center gap-2">
              {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              {isEmpty && (
                <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={seeding}>
                  {seeding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <DatabaseZap className="h-4 w-4 mr-1" />}
                  {t("finance.costStd.initDefaults")}
                </Button>
              )}
            </div>
          }
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label={t("finance.costStd.laborRoles")} value={laborCount} />
          <StatCard icon={Factory} label={t("finance.costStd.expenseCategories")} value={overheadCount} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={Package} label={t("finance.costStd.markupRules")} value={markupCount} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
          <StatCard icon={Settings} label={t("finance.costStd.productConfigs")} value={products.length} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="labor">{t("finance.costStd.laborTab")}</TabsTrigger>
              <TabsTrigger value="overhead">{t("finance.costStd.overheadTab")}</TabsTrigger>
              <TabsTrigger value="markup">{t("finance.costStd.markupTab")}</TabsTrigger>
              <TabsTrigger value="products">{t("finance.costStd.productsTab")}</TabsTrigger>
            </TabsList>
            {activeTab !== "products" && (
              <Button size="sm" onClick={() => openAdd(activeTab === "labor" ? "labor" : activeTab === "overhead" ? "overhead" : "material_markup")}>
                <Plus className="h-4 w-4 mr-1" />{t("finance.costStd.add")}
              </Button>
            )}
          </div>
          <TabsContent value="labor"><LaborCostTab items={standards} onEdit={openEdit} /></TabsContent>
          <TabsContent value="overhead"><OverheadTab items={standards} onEdit={openEdit} /></TabsContent>
          <TabsContent value="markup"><MaterialMarkupTab items={standards} onEdit={openEdit} /></TabsContent>
          <TabsContent value="products"><ProductConfigTab items={products} onAdd={openPCAdd} onEdit={openPCEdit} /></TabsContent>
        </Tabs>
      </div>

      {/* Cost Standard Create/Edit Dialog */}
      <CostStandardDialog
        open={csDialogOpen}
        onOpenChange={setCsDialogOpen}
        editItem={csEditItem}
        category={csDialogCategory}
      />

      {/* Product Config Create/Edit Dialog */}
      <ProductConfigDialog
        open={pcDialogOpen}
        onOpenChange={setPcDialogOpen}
        editItem={pcEditItem}
      />
      </>
  );
}
