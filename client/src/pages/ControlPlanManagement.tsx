/**
 * 控制计划管理 — IATF 16949 Core Tool
 * 控制计划列表 + 控制项明细
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ClipboardList, Plus, Search, Loader2, ArrowLeft,
  FileText, Layers, Star, Eye, Gauge,
} from "lucide-react";
import { useZodForm, schemas, z } from "@/lib/form-validation";

// ─── Zod Schemas ─────────────────────────────────────────────────
const createPlanSchema = z.object({
  title: schemas.requiredString("Title is required / 标题必填"),
  partName: schemas.optionalString(),
  partNumber: schemas.optionalString(),
  phase: schemas.controlPlanPhase(),
  fmeaDocumentId: z.string().optional().transform(s => (s ? parseInt(s) : undefined)),
});
type CreatePlanValues = z.infer<typeof createPlanSchema>;

const addItemSchema = z.object({
  processStep: schemas.optionalString(),
  characteristicName: schemas.requiredString("Characteristic name is required / 特性名称必填"),
  characteristicType: schemas.characteristicType(),
  specialCharacteristic: schemas.optionalString(),
  specification: schemas.optionalString(),
  tolerance: schemas.optionalString(),
  controlMethod: schemas.controlMethod(),
  sampleSize: schemas.optionalString(),
  sampleFrequency: schemas.optionalString(),
  reactionPlan: schemas.optionalString(),
});
type AddItemValues = z.infer<typeof addItemSchema>;

// ─── Labels ────────────────────────────────────────────────────
const PHASE_KEY: Record<string, string> = {
  prototype: "quality.controlPlan.phaseTrial",
  pre_launch: "quality.controlPlan.phasePreProduction",
  production: "quality.controlPlan.phaseProduction",
};
const PHASE_VARIANT: Record<string, string> = {
  prototype: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  pre_launch: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  production: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};
const STATUS_KEY: Record<string, string> = {
  draft: "quality.controlPlan.statusDraft",
  active: "quality.controlPlan.statusEffective",
  superseded: "quality.controlPlan.statusSuperseded",
  archived: "quality.controlPlan.statusArchived",
};
const STATUS_VARIANT: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  superseded: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  archived: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};
const CHAR_TYPE_KEY: Record<string, string> = {
  product: "quality.controlPlan.charTypeProduct",
  process: "quality.controlPlan.charTypeProcess",
};
const METHOD_KEY: Record<string, string> = {
  visual: "quality.controlPlan.methodVisual",
  gauge: "quality.controlPlan.methodGage",
  spc: "quality.controlPlan.methodSPC",
  cmm: "quality.controlPlan.methodCMM",
  test: "quality.controlPlan.methodTest",
  audit: "quality.controlPlan.methodAudit",
  other: "quality.controlPlan.methodOther",
};

// ─── Main Component ────────────────────────────────────────────
export default function ControlPlanManagement() {
  const { t } = useLanguage();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);

  // Create plan form — Zod + react-hook-form
  const createForm = useZodForm({
    schema: createPlanSchema,
    defaultValues: { title: "", partName: "", partNumber: "", phase: "prototype", fmeaDocumentId: "" },
  });

  // Add item form — Zod + react-hook-form
  const itemForm = useZodForm({
    schema: addItemSchema,
    defaultValues: {
      processStep: "", characteristicName: "", characteristicType: "product",
      specialCharacteristic: "", specification: "", tolerance: "",
      controlMethod: "visual", sampleSize: "", sampleFrequency: "", reactionPlan: "",
    },
  });

  // Queries
  const { data: stats } = trpc.controlPlan.getStats.useQuery({});
  const { data: listData, isLoading: listLoading } = trpc.controlPlan.list.useQuery({});
  const { data: detail, isLoading: detailLoading } = trpc.controlPlan.getById.useQuery(
    { id: selectedPlanId! },
    { enabled: selectedPlanId !== null },
  );

  const utils = trpc.useUtils();

  // Mutations
  const createMut = trpc.controlPlan.create.useMutation({
    onSuccess: () => {
      toast.success(t("quality.controlPlan.createSuccess"));
      setCreateOpen(false);
      createForm.reset();
      utils.controlPlan.list.invalidate();
      utils.controlPlan.getStats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const addItemMut = trpc.controlPlan.addItem.useMutation({
    onSuccess: () => {
      toast.success(t("quality.controlPlan.addItemSuccess"));
      setAddItemOpen(false);
      itemForm.reset();
      utils.controlPlan.getById.invalidate({ id: selectedPlanId! });
      utils.controlPlan.getStats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = createForm.handleSubmit((data) => {
    createMut.mutate({
      title: data.title,
      partName: data.partName || undefined,
      partNumber: data.partNumber || undefined,
      phase: data.phase as "prototype" | "pre_launch" | "production",
      fmeaDocumentId: data.fmeaDocumentId ? parseInt(data.fmeaDocumentId) : undefined,
    });
  });

  const handleAddItem = itemForm.handleSubmit((data) => {
    addItemMut.mutate({
      controlPlanId: selectedPlanId!,
      processStep: data.processStep || undefined,
      characteristicName: data.characteristicName,
      characteristicType: data.characteristicType as "product" | "process",
      specialCharacteristic: data.specialCharacteristic || undefined,
      specification: data.specification || undefined,
      tolerance: data.tolerance || undefined,
      controlMethod: data.controlMethod as any,
      sampleSize: data.sampleSize || undefined,
      sampleFrequency: data.sampleFrequency || undefined,
      reactionPlan: data.reactionPlan || undefined,
    });
  });

  // Filter
  const plans = (listData?.items ?? []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.planCode?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q) ||
      p.partName?.toLowerCase().includes(q) ||
      p.partNumber?.toLowerCase().includes(q)
    );
  });

  // ─── Detail View ─────────────────────────────────────────────
  if (selectedPlanId !== null) {
    const items = detail?.items ?? [];
    return (
      <div className="space-y-6">
        <PageHeader
          icon={ClipboardList}
          title={detail?.title ?? t("quality.controlPlan.detailTitle")}
          description={[detail?.planCode, detail?.partName, detail?.partNumber].filter(Boolean).join(" | ")}
          actions={
            <>
              <Button variant="outline" onClick={() => setSelectedPlanId(null)}>
                <ArrowLeft className="h-4 w-4 mr-2" />{t("quality.common.back")}
              </Button>
              <Button onClick={() => setAddItemOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />{t("quality.controlPlan.addItem")}
              </Button>
            </>
          }
        />

        {detail && (
          <div className="flex gap-2 flex-wrap">
            <Badge className={PHASE_VARIANT[detail.phase] ?? ""}>{t(PHASE_KEY[detail.phase] ?? detail.phase)}</Badge>
            <Badge className={STATUS_VARIANT[detail.status] ?? ""}>{t(STATUS_KEY[detail.status] ?? detail.status)}</Badge>
            {detail.fmeaDocumentId && <Badge variant="outline">FMEA #{detail.fmeaDocumentId}</Badge>}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("quality.controlPlan.itemDetail")} <span className="text-sm font-normal text-muted-foreground ml-2">{items.length}</span></CardTitle>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">{t("quality.controlPlan.noItems")}</p>
                <p className="text-sm mt-1">{t("quality.controlPlan.addItemHint")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      {["#", t("quality.controlPlan.processStep"), t("quality.controlPlan.charName"), t("quality.controlPlan.charType"), t("quality.controlPlan.specialChar"), t("quality.controlPlan.specification") + "/" + t("quality.controlPlan.toleranceField"), t("quality.controlPlan.controlMethod"), t("quality.controlPlan.sampleSize") + "/" + t("quality.controlPlan.sampleFreq"), t("quality.controlPlan.reactionPlan")].map((h) => (
                        <th key={h} className="py-2 pr-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const spec = it.specification || it.tolerance
                        ? `${it.specification ?? ""}${it.tolerance ? ` ${it.tolerance}` : ""}` : "-";
                      return (
                        <tr key={it.id} className="border-b last:border-0 hover:bg-accent/50">
                          <td className="py-2 pr-3 text-muted-foreground">{idx + 1}</td>
                          <td className="py-2 pr-3">{it.processStep || "-"}</td>
                          <td className="py-2 pr-3 font-medium">{it.characteristicName}</td>
                          <td className="py-2 pr-3"><Badge variant="outline">{t(CHAR_TYPE_KEY[it.characteristicType ?? ""] ?? "-")}</Badge></td>
                          <td className="py-2 pr-3">
                            {it.specialCharacteristic
                              ? <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">{it.specialCharacteristic}</Badge>
                              : "-"}
                          </td>
                          <td className="py-2 pr-3">{spec}</td>
                          <td className="py-2 pr-3"><Badge variant="secondary">{t(METHOD_KEY[it.controlMethod ?? ""] ?? it.controlMethod)}</Badge></td>
                          <td className="py-2 pr-3">{[it.sampleSize, it.sampleFrequency].filter(Boolean).join(" / ") || "-"}</td>
                          <td className="py-2 pr-3 max-w-[200px] truncate">{it.reactionPlan || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Item Dialog */}
        <Dialog open={addItemOpen} onOpenChange={(o) => { setAddItemOpen(o); if (!o) itemForm.reset(); }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{t("quality.controlPlan.addItem")}</DialogTitle>
              <DialogDescription>{t("quality.controlPlan.addItemDesc")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t("quality.controlPlan.processStep")}</Label><Input {...itemForm.register("processStep")} /></div>
                <div className="space-y-1">
                  <Label>{t("quality.controlPlan.charName")} <span className="text-red-500">*</span></Label>
                  <Input {...itemForm.register("characteristicName")} />
                  {itemForm.formState.errors.characteristicName && <p className="text-destructive text-sm">{itemForm.formState.errors.characteristicName.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>{t("quality.controlPlan.charType")}</Label>
                  <Select value={itemForm.watch("characteristicType")} onValueChange={(v) => itemForm.setValue("characteristicType", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="product">{t("quality.controlPlan.productChar")}</SelectItem><SelectItem value="process">{t("quality.controlPlan.processChar")}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>{t("quality.controlPlan.specialChar")}</Label><Input placeholder="CC / SC" {...itemForm.register("specialCharacteristic")} /></div>
                <div className="space-y-1">
                  <Label>{t("quality.controlPlan.controlMethod")}</Label>
                  <Select value={itemForm.watch("controlMethod")} onValueChange={(v) => itemForm.setValue("controlMethod", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(METHOD_KEY).map(([k, v]) => <SelectItem key={k} value={k}>{t(v)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t("quality.controlPlan.specification")}</Label><Input {...itemForm.register("specification")} /></div>
                <div className="space-y-1"><Label>{t("quality.controlPlan.toleranceField")}</Label><Input {...itemForm.register("tolerance")} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t("quality.controlPlan.sampleSize")}</Label><Input {...itemForm.register("sampleSize")} /></div>
                <div className="space-y-1"><Label>{t("quality.controlPlan.sampleFreq")}</Label><Input {...itemForm.register("sampleFrequency")} /></div>
              </div>
              <div className="space-y-1"><Label>{t("quality.controlPlan.reactionPlan")}</Label><Input {...itemForm.register("reactionPlan")} /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddItemOpen(false)}>{t("quality.common.cancel")}</Button>
                <Button type="submit" disabled={addItemMut.isPending}>
                  {addItemMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{t("quality.controlPlan.addItem")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── List View ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title={t("quality.controlPlan.title")}
        description={t("quality.controlPlan.description")}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />{t("quality.controlPlan.newPlan")}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Layers} label={t("quality.controlPlan.totalPlans")} value={stats?.totalPlans ?? 0} />
        <StatCard icon={FileText} label={t("quality.controlPlan.totalItems")} value={stats?.totalItems ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={Star} label={t("quality.controlPlan.specialChars")} value={stats?.specialCharacteristics ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Gauge} label={t("quality.controlPlan.spcControl")} value={stats?.byControlMethod?.spc ?? 0} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      {/* Phase / Status breakdown */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">{t("quality.controlPlan.byPhase")}:</span>
          {(["prototype", "pre_launch", "production"] as const).map((ph) => (
            <Badge key={ph} className={PHASE_VARIANT[ph]}>{t(PHASE_KEY[ph])} {stats?.byPhase?.[ph] ?? 0}</Badge>
          ))}
          <span className="mx-2 text-border">|</span>
          <span className="text-sm font-medium text-muted-foreground">{t("quality.controlPlan.byStatus")}:</span>
          {(["draft", "active", "superseded", "archived"] as const).map((st) => (
            <Badge key={st} className={STATUS_VARIANT[st]}>{t(STATUS_KEY[st])} {stats?.byStatus?.[st] ?? 0}</Badge>
          ))}
        </CardContent>
      </Card>

      {/* Plan List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("quality.controlPlan.listTitle")} {listData && <span className="text-sm font-normal text-muted-foreground ml-2">{listData.total}</span>}</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("quality.controlPlan.searchPlans")}
                className="pl-9 w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mb-3 opacity-50" />
              <p className="font-medium">{t("quality.controlPlan.noPlans")}</p>
              <p className="text-sm mt-1">{t("quality.controlPlan.createFirstHint")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedPlanId(p.id)}
                >
                  <ClipboardList className="h-10 w-10 text-primary/20 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-muted-foreground">{p.planCode}</span>
                      <Badge className={PHASE_VARIANT[p.phase] ?? ""}>{t(PHASE_KEY[p.phase] ?? p.phase)}</Badge>
                      <Badge className={STATUS_VARIANT[p.status] ?? ""}>{t(STATUS_KEY[p.status] ?? p.status)}</Badge>
                    </div>
                    <p className="font-medium mt-1 truncate">{p.title}</p>
                    {(p.partName || p.partNumber) && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {[p.partName, p.partNumber].filter(Boolean).join(" | ")}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedPlanId(p.id); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) createForm.reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("quality.controlPlan.newPlan")}</DialogTitle>
            <DialogDescription>{t("quality.controlPlan.newPlanDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("quality.controlPlan.planTitle")} <span className="text-red-500">*</span></Label>
              <Input {...createForm.register("title")} />
              {createForm.formState.errors.title && <p className="text-destructive text-sm mt-1">{createForm.formState.errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("quality.controlPlan.partName")}</Label>
                <Input {...createForm.register("partName")} />
              </div>
              <div className="space-y-2">
                <Label>{t("quality.controlPlan.partNumber")}</Label>
                <Input {...createForm.register("partNumber")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("quality.controlPlan.phase")}</Label>
                <Select value={createForm.watch("phase")} onValueChange={(v) => createForm.setValue("phase", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prototype">{t("quality.controlPlan.phaseTrial")}</SelectItem>
                    <SelectItem value="pre_launch">{t("quality.controlPlan.phasePreProduction")}</SelectItem>
                    <SelectItem value="production">{t("quality.controlPlan.phaseProduction")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("quality.controlPlan.relatedFmeaId")}</Label>
                <Input {...createForm.register("fmeaDocumentId")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("quality.common.cancel")}</Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{t("quality.common.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
