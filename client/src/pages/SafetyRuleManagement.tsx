/**
 * 安全规则管理页面
 * 安全规则库 + 安全校验引擎
 * Wired to safety-rule.router.ts
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ShieldCheck, Plus, AlertTriangle, Ban, CheckCircle2,
  Info, Zap, Flame, FlaskConical, Settings, Activity,
  Search, Trash2, ShieldAlert,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, { labelKey: string; color: string; icon: typeof Flame }> = {
  physical:    { labelKey: "quality.safety.categoryPhysical", color: "bg-blue-100 text-blue-700", icon: Activity },
  chemical:    { labelKey: "quality.safety.categoryChemical", color: "bg-purple-100 text-purple-700", icon: FlaskConical },
  electrical:  { labelKey: "quality.safety.categoryElectrical", color: "bg-amber-100 text-amber-700", icon: Zap },
  operational: { labelKey: "quality.safety.categoryOperational", color: "bg-green-100 text-green-700", icon: Settings },
};

const SEVERITY_MAP: Record<string, { labelKey: string; color: string }> = {
  fatal:    { labelKey: "quality.safety.severityFatal", color: "bg-red-100 text-red-700" },
  critical: { labelKey: "quality.safety.severityCritical", color: "bg-orange-100 text-orange-700" },
  warning:  { labelKey: "quality.safety.severityWarning", color: "bg-amber-100 text-amber-700" },
  info:     { labelKey: "quality.safety.severityInfo", color: "bg-blue-100 text-blue-700" },
};

const CATEGORIES = ["physical", "chemical", "electrical", "operational"] as const;
const SEVERITIES = ["fatal", "critical", "warning", "info"] as const;

function LoadingSkeleton() {
  return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
}

/* ───────────────────────── Tab 1: Rules Library ───────────────────────── */
function RulesTab() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "physical" as string, parameterName: "", unit: "", minValue: "", maxValue: "", severity: "warning" as string, materialType: "", equipmentModel: "", description: "" });

  const utils = trpc.useUtils();
  const listQ = trpc.safetyRule.list.useQuery({});
  const statsQ = trpc.safetyRule.getStats.useQuery();
  const createM = trpc.safetyRule.create.useMutation({ onSuccess: () => { utils.safetyRule.list.invalidate(); utils.safetyRule.getStats.invalidate(); toast.success(t("quality.safety.ruleCreated")); setDialogOpen(false); resetForm(); } });
  const updateM = trpc.safetyRule.update.useMutation({ onSuccess: () => { utils.safetyRule.list.invalidate(); utils.safetyRule.getStats.invalidate(); } });
  const seedM = trpc.safetyRule.seedDefaults.useMutation({ onSuccess: (r) => { utils.safetyRule.list.invalidate(); utils.safetyRule.getStats.invalidate(); toast.success(r.message); } });

  const resetForm = () => setForm({ name: "", category: "physical", parameterName: "", unit: "", minValue: "", maxValue: "", severity: "warning", materialType: "", equipmentModel: "", description: "" });

  const items = (listQ.data?.items ?? []).filter((r: any) => !search || r.name?.includes(search) || r.ruleCode?.includes(search) || r.parameterName?.includes(search));
  const stats = statsQ.data;

  const toggleActive = (id: number, current: number) => {
    updateM.mutate({ id, isActive: current === 1 ? false : true });
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={ShieldCheck} label={t("quality.safety.totalRules")} value={stats.total} />
          <StatCard icon={CheckCircle2} label={t("quality.safety.activeRules")} value={stats.active} iconColor="text-green-600" iconBg="bg-green-100" />
          <StatCard icon={AlertTriangle} label={t("quality.safety.criticalSevere")} value={stats.bySeverity.fatal + stats.bySeverity.critical} iconColor="text-red-600" iconBg="bg-red-100" />
          <StatCard icon={Activity} label={t("quality.safety.categoryCount")} value={Object.values(stats.byCategory).filter(v => v > 0).length + "/4"} iconColor="text-blue-600" iconBg="bg-blue-100" />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("quality.safety.searchRules")} className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => seedM.mutate()} disabled={seedM.isPending}>
            <ShieldAlert className="h-4 w-4 mr-1" />{t("quality.safety.initDefault")}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("quality.safety.newRule")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{t("quality.safety.createRule")}</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t("quality.safety.ruleName")} *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><Label>{t("quality.safety.category")} *</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{t(CATEGORY_LABELS[c].labelKey)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t("quality.safety.paramName")} *</Label><Input value={form.parameterName} onChange={e => setForm(f => ({ ...f, parameterName: e.target.value }))} /></div>
                  <div><Label>{t("quality.safety.unit")}</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>{t("quality.safety.minValue")}</Label><Input value={form.minValue} onChange={e => setForm(f => ({ ...f, minValue: e.target.value }))} /></div>
                  <div><Label>{t("quality.safety.maxValue")}</Label><Input value={form.maxValue} onChange={e => setForm(f => ({ ...f, maxValue: e.target.value }))} /></div>
                  <div><Label>{t("quality.safety.severityLevel")} *</Label>
                    <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{t(SEVERITY_MAP[s].labelKey)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t("quality.safety.materialType")}</Label><Input placeholder="e.g. aluminum" value={form.materialType} onChange={e => setForm(f => ({ ...f, materialType: e.target.value }))} /></div>
                  <div><Label>{t("quality.safety.equipmentModel")}</Label><Input placeholder="e.g. GRT-SC-*" value={form.equipmentModel} onChange={e => setForm(f => ({ ...f, equipmentModel: e.target.value }))} /></div>
                </div>
                <div><Label>{t("quality.safety.descField")}</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <Button onClick={() => createM.mutate({ ...form, category: form.category as any, severity: form.severity as any, minValue: form.minValue || undefined, maxValue: form.maxValue || undefined, unit: form.unit || undefined, materialType: form.materialType || undefined, equipmentModel: form.equipmentModel || undefined, description: form.description || undefined })} disabled={!form.name || !form.parameterName || createM.isPending}>
                  {createM.isPending ? t("quality.safety.creatingRule") : t("quality.safety.createRule")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Rule list */}
      {listQ.isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2">
          {items.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">{t("quality.safety.noRules")}</CardContent></Card>}
          {items.map((r: any) => {
            const cat = CATEGORY_LABELS[r.category] || CATEGORY_LABELS.physical;
            const sev = SEVERITY_MAP[r.severity] || SEVERITY_MAP.info;
            return (
              <Card key={r.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{r.ruleCode}</span>
                      <Badge className={cat.color} variant="secondary">{t(cat.labelKey)}</Badge>
                      <Badge className={sev.color} variant="secondary">{t(sev.labelKey)}</Badge>
                      {r.isActive === 0 && <Badge variant="destructive">{t("quality.safety.disabled")}</Badge>}
                    </div>
                    <p className="font-semibold mt-1 truncate">{r.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {t("quality.safety.param")}: {r.parameterName}{r.unit ? ` (${r.unit})` : ""}
                      {r.minValue != null && ` | ${t("quality.safety.min")}: ${r.minValue}`}
                      {r.maxValue != null && ` | ${t("quality.safety.max")}: ${r.maxValue}`}
                      {r.materialType && ` | ${t("quality.safety.material")}: ${r.materialType}`}
                      {r.equipmentModel && ` | ${t("quality.safety.equipment")}: ${r.equipmentModel}`}
                    </p>
                    {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{r.isActive ? t("quality.safety.enabled") : t("quality.safety.disabled")}</span>
                      <Switch checked={r.isActive === 1} onCheckedChange={() => toggleActive(r.id, r.isActive)} />
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

/* ───────────────────────── Tab 2: Validation ───────────────────────── */
function ValidationTab() {
  const { t } = useLanguage();
  const [materialType, setMaterialType] = useState("");
  const [equipmentModel, setEquipmentModel] = useState("");
  const [params, setParams] = useState([{ name: "", value: "", unit: "" }]);
  const [result, setResult] = useState<any>(null);

  const validateQ = trpc.safetyRule.validate.useQuery(
    { materialType, equipmentModel, parameters: params.filter(p => p.name && p.value).map(p => ({ name: p.name, value: Number(p.value), unit: p.unit || undefined })) },
    { enabled: false },
  );

  const doValidate = async () => {
    if (!materialType || !equipmentModel || params.every(p => !p.name || !p.value)) {
      toast.error(t("quality.safety.validationRequired"));
      return;
    }
    const res = await validateQ.refetch();
    if (res.data) setResult(res.data);
  };

  const addParam = () => setParams(ps => [...ps, { name: "", value: "", unit: "" }]);
  const removeParam = (i: number) => setParams(ps => ps.filter((_, idx) => idx !== i));
  const updateParam = (i: number, field: string, val: string) => setParams(ps => ps.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold text-lg">{t("quality.safety.safetyValidation")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("quality.safety.materialType")} *</Label><Input placeholder="e.g. aluminum, stainless_steel, plastic" value={materialType} onChange={e => setMaterialType(e.target.value)} /></div>
            <div><Label>{t("quality.safety.equipmentModel")} *</Label><Input placeholder="e.g. GRT-SC-100, GRT-HP-200" value={equipmentModel} onChange={e => setEquipmentModel(e.target.value)} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>{t("quality.safety.validationParams")}</Label>
              <Button variant="ghost" size="sm" onClick={addParam}><Plus className="h-3 w-3 mr-1" />{t("quality.safety.addParam")}</Button>
            </div>
            <div className="space-y-2">
              {params.map((p, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1"><Input placeholder={t("quality.safety.paramNamePlaceholder")} value={p.name} onChange={e => updateParam(i, "name", e.target.value)} /></div>
                  <div className="w-32"><Input placeholder={t("quality.safety.valuePlaceholder")} type="number" value={p.value} onChange={e => updateParam(i, "value", e.target.value)} /></div>
                  <div className="w-24"><Input placeholder={t("quality.safety.unit")} value={p.unit} onChange={e => updateParam(i, "unit", e.target.value)} /></div>
                  {params.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeParam(i)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={doValidate} disabled={validateQ.isFetching} className="w-full">
            <ShieldCheck className="h-4 w-4 mr-1" />{validateQ.isFetching ? t("quality.safety.validating") : t("quality.safety.executeValidation")}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className={result.passed ? "border-green-300" : result.blocked ? "border-red-400" : "border-amber-300"}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              {result.passed ? (
                <Badge className="bg-green-100 text-green-700 text-base px-3 py-1"><CheckCircle2 className="h-4 w-4 mr-1" />{t("quality.safety.validationPass")}</Badge>
              ) : result.blocked ? (
                <Badge className="bg-red-100 text-red-700 text-base px-3 py-1"><Ban className="h-4 w-4 mr-1" />{t("quality.safety.validationBlock")}</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 text-base px-3 py-1"><AlertTriangle className="h-4 w-4 mr-1" />{t("quality.safety.validationWarn")}</Badge>
              )}
              <span className="text-sm font-medium">{result.summary}</span>
            </div>

            {result.violations.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-1"><Ban className="h-4 w-4" />{t("quality.safety.violations")} ({result.violations.length})</h4>
                <div className="space-y-1.5">
                  {result.violations.map((v: any, i: number) => (
                    <div key={i} className="bg-red-50 border border-red-200 rounded-md p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-red-500">{v.ruleCode}</span>
                        <Badge className={SEVERITY_MAP[v.severity]?.color || ""} variant="secondary">{SEVERITY_MAP[v.severity] ? t(SEVERITY_MAP[v.severity].labelKey) : v.severity}</Badge>
                        <span className="font-medium">{v.ruleName}</span>
                      </div>
                      <p className="text-red-700">{v.message}</p>
                      <p className="text-xs text-red-500 mt-0.5">{v.limit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div>
                <h4 className="font-semibold text-amber-700 mb-2 flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{t("quality.safety.warnings")} ({result.warnings.length})</h4>
                <div className="space-y-1.5">
                  {result.warnings.map((w: any, i: number) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-amber-500">{w.ruleCode}</span>
                        <span className="font-medium">{w.ruleName}</span>
                      </div>
                      <p className="text-amber-700">{w.message}</p>
                      <p className="text-xs text-amber-600 mt-0.5">{w.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.passed && result.warnings.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-green-700 font-medium">{t("quality.safety.allSafe")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ───────────────────────── Main Page ───────────────────────── */
export default function SafetyRuleManagement() {
  const { t } = useLanguage();
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <PageHeader icon={ShieldCheck} title={t("quality.safety.title")} description={t("quality.safety.description")} />
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">{t("quality.safety.tabRules")}</TabsTrigger>
          <TabsTrigger value="validate">{t("quality.safety.tabValidation")}</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-4"><RulesTab /></TabsContent>
        <TabsContent value="validate" className="mt-4"><ValidationTab /></TabsContent>
      </Tabs>
    </div>
  );
}
