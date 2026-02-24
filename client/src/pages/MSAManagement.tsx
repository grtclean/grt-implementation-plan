/**
 * MSA管理页面 — 测量系统分析
 * GR&R, Bias, Linearity, Stability, Attribute Agreement
 */
import { useState } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Ruler, Plus, Search, BarChart3, CheckCircle2, AlertTriangle,
  XCircle, Calculator, Loader2, ArrowLeft, Activity,
} from "lucide-react";

const STUDY_TYPE_KEYS: Record<string, string> = {
  gage_rr: "GR&R",
  bias: "quality.msa.studyTypeBias",
  linearity: "quality.msa.studyTypeLinearity",
  stability: "quality.msa.studyTypeStability",
  attribute_agreement: "quality.msa.studyTypeAttribute",
};

const STATUS_KEYS: Record<string, string> = {
  planned: "quality.msa.statusPlanned",
  in_progress: "quality.msa.statusInProgress",
  completed: "quality.msa.statusCompleted",
  failed: "quality.msa.statusFailed",
  archived: "quality.msa.statusArchived",
};

const CONCLUSION_KEYS: Record<string, { key: string; color: string; icon: typeof CheckCircle2 }> = {
  acceptable: { key: "quality.msa.conclusionAcceptable", color: "text-green-500 bg-green-500/10 border-green-500/30", icon: CheckCircle2 },
  marginal: { key: "quality.msa.conclusionMarginal", color: "text-amber-500 bg-amber-500/10 border-amber-500/30", icon: AlertTriangle },
  unacceptable: { key: "quality.msa.conclusionUnacceptable", color: "text-red-500 bg-red-500/10 border-red-500/30", icon: XCircle },
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/10 text-green-400 border-green-500/30",
  failed: "bg-red-500/10 text-red-400 border-red-500/30",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

function ConclusionBadge({ conclusion }: { conclusion: string | null }) {
  const { t } = useLanguage();
  if (!conclusion) return <Badge variant="outline" className="text-xs">{t("quality.msa.pendingAnalysis")}</Badge>;
  const cfg = CONCLUSION_KEYS[conclusion];
  if (!cfg) return <Badge variant="outline" className="text-xs">{conclusion}</Badge>;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`text-xs ${cfg.color}`}>
      <Icon className="w-3 h-3 mr-1" />{t(cfg.key)}
    </Badge>
  );
}

function GrrDisplay({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground text-sm">--</span>;
  const num = parseFloat(value);
  const color = num < 10 ? "text-green-500" : num < 30 ? "text-amber-500" : "text-red-500";
  return <span className={`font-mono font-bold ${color}`}>{num.toFixed(1)}%</span>;
}

export default function MSAManagement() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [formType, setFormType] = useState<string>("gage_rr");
  const [formGaugeName, setFormGaugeName] = useState("");
  const [formGaugeId, setFormGaugeId] = useState("");
  const [formPartName, setFormPartName] = useState("");
  const [formCharacteristic, setFormCharacteristic] = useState("");
  const [formSpec, setFormSpec] = useState("");
  const [formTolerance, setFormTolerance] = useState("");
  const [formOperators, setFormOperators] = useState("3");
  const [formParts, setFormParts] = useState("10");
  const [formTrials, setFormTrials] = useState("3");

  const { data: stats } = trpc.msa.getStats.useQuery({});
  const { data: listData, isLoading } = trpc.msa.list.useQuery({});
  const { data: detail } = trpc.msa.getById.useQuery(
    { id: selectedId! },
    { enabled: selectedId !== null },
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.msa.create.useMutation({
    onSuccess: () => {
      toast.success(t("quality.msa.createSuccess"));
      setCreateOpen(false);
      resetForm();
      utils.msa.list.invalidate();
      utils.msa.getStats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const calcMutation = trpc.msa.calculateGRR.useMutation({
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message);
        utils.msa.list.invalidate();
        utils.msa.getStats.invalidate();
        utils.msa.getById.invalidate({ id: selectedId! });
      } else {
        toast.error(res.message);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setFormType("gage_rr");
    setFormGaugeName("");
    setFormGaugeId("");
    setFormPartName("");
    setFormCharacteristic("");
    setFormSpec("");
    setFormTolerance("");
    setFormOperators("3");
    setFormParts("10");
    setFormTrials("3");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGaugeName.trim()) {
      toast.error(t("quality.msa.gageNameRequired"));
      return;
    }
    createMutation.mutate({
      studyType: formType as "gage_rr" | "bias" | "linearity" | "stability" | "attribute_agreement",
      gaugeName: formGaugeName.trim(),
      gaugeId: formGaugeId.trim() || undefined,
      partName: formPartName.trim() || undefined,
      characteristicName: formCharacteristic.trim() || undefined,
      specification: formSpec.trim() || undefined,
      tolerance: formTolerance.trim() || undefined,
      numOperators: parseInt(formOperators) || 3,
      numParts: parseInt(formParts) || 10,
      numTrials: parseInt(formTrials) || 3,
    });
  };

  const studyTypeLabel = (key: string) => {
    const k = STUDY_TYPE_KEYS[key];
    return k?.startsWith("quality.") ? t(k) : k ?? key;
  };

  const items = (listData?.items ?? []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.studyCode?.toLowerCase().includes(q) ||
      s.gaugeName?.toLowerCase().includes(q) ||
      s.partName?.toLowerCase().includes(q) ||
      s.characteristicName?.toLowerCase().includes(q)
    );
  });

  if (selectedId !== null && detail) {
    const grr = detail.grrPercent ? parseFloat(detail.grrPercent) : null;
    return (
      <div className="space-y-6">
        <PageHeader
          icon={BarChart3}
          title={t("quality.msa.grrResults")}
          description={`${detail.studyCode} · ${studyTypeLabel(detail.studyType)}`}
          actions={
            <Button variant="outline" onClick={() => setSelectedId(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />{t("quality.msa.backToList")}
            </Button>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">%GR&R</p>
              <p className="text-3xl font-bold">
                <GrrDisplay value={detail.grrPercent} />
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">NDC</p>
              <p className={`text-3xl font-bold font-mono ${(detail.ndc ?? 0) >= 5 ? "text-green-500" : "text-red-500"}`}>
                {detail.ndc ?? "--"}
              </p>
              <p className="text-xs text-muted-foreground">{t("quality.msa.ndcAcceptable")}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">{t("quality.msa.repeatability")}</p>
              <p className="text-2xl font-mono font-semibold">
                {detail.repeatability ? parseFloat(detail.repeatability).toFixed(4) : "--"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">{t("quality.msa.reproducibility")}</p>
              <p className="text-2xl font-mono font-semibold">
                {detail.reproducibility ? parseFloat(detail.reproducibility).toFixed(4) : "--"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("quality.msa.studyInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">{t("quality.msa.gage")}:</span> {detail.gaugeName}</div>
              {detail.gaugeId && <div><span className="text-muted-foreground">{t("quality.msa.gageId")}:</span> {detail.gaugeId}</div>}
              {detail.partName && <div><span className="text-muted-foreground">{t("quality.msa.part")}:</span> {detail.partName}</div>}
              {detail.characteristicName && <div><span className="text-muted-foreground">{t("quality.msa.characteristic")}:</span> {detail.characteristicName}</div>}
              {detail.specification && <div><span className="text-muted-foreground">{t("quality.msa.specification")}:</span> {detail.specification}</div>}
              {detail.tolerance && <div><span className="text-muted-foreground">{t("quality.msa.tolerance")}:</span> {detail.tolerance}</div>}
              <div><span className="text-muted-foreground">{t("quality.msa.operators")}:</span> {detail.numOperators}</div>
              <div><span className="text-muted-foreground">{t("quality.msa.parts")}:</span> {detail.numParts}</div>
              <div><span className="text-muted-foreground">{t("quality.msa.trials")}:</span> {detail.numTrials}</div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t">
              <span className="text-sm text-muted-foreground">{t("quality.msa.conclusion")}:</span>
              <ConclusionBadge conclusion={detail.conclusion} />
              {grr !== null && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {t("quality.msa.grrCriteria")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={() => calcMutation.mutate({ studyId: selectedId! })}
                disabled={calcMutation.isPending}
              >
                {calcMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4 mr-2" />
                )}
                {t("quality.msa.calculateGRR")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {t("quality.msa.measurementCount")}: {detail.measurements?.length ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Ruler}
        title={t("quality.msa.title")}
        description={t("quality.msa.description")}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />{t("quality.msa.newStudy")}
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Ruler} label={t("quality.msa.totalStudies")} value={stats?.total ?? 0} />
        <StatCard icon={BarChart3} label={t("quality.msa.grrStudies")} value={stats?.byType?.gage_rr ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={CheckCircle2} label={t("quality.msa.acceptable")} value={stats?.byConclusion?.acceptable ?? 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={AlertTriangle} label={t("quality.msa.unacceptable")} value={stats?.byConclusion?.unacceptable ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {t("quality.msa.studyList")}
              {listData && <span className="text-sm font-normal text-muted-foreground ml-2">{listData.total}</span>}
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("quality.msa.searchStudies")}
                className="pl-9 w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ruler className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t("quality.msa.noStudies")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedId(s.id)}
                >
                  <Activity className="h-9 w-9 text-primary/20 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-muted-foreground">{s.studyCode}</span>
                      <Badge variant="secondary">{studyTypeLabel(s.studyType)}</Badge>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[s.status] ?? ""}`}>
                        {t(STATUS_KEYS[s.status] ?? s.status)}
                      </Badge>
                      <ConclusionBadge conclusion={s.conclusion} />
                    </div>
                    <p className="font-medium mt-1 truncate">{s.gaugeName}{s.gaugeId ? ` (${s.gaugeId})` : ""}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {[s.partName, s.characteristicName, s.specification].filter(Boolean).join(" · ") || t("quality.msa.noPartInfo")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground mb-1">%GR&R</p>
                    <GrrDisplay value={s.grrPercent} />
                    {s.ndc !== null && s.ndc !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">NDC: {s.ndc}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("quality.msa.newStudy")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("quality.msa.studyType")}</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STUDY_TYPE_KEYS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.startsWith("quality.") ? t(v) : v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("quality.msa.gageName")} *</Label>
                <Input value={formGaugeName} onChange={(e) => setFormGaugeName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("quality.msa.gageId")}</Label>
                <Input value={formGaugeId} onChange={(e) => setFormGaugeId(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("quality.msa.partName")}</Label>
                <Input value={formPartName} onChange={(e) => setFormPartName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("quality.msa.characteristicName")}</Label>
                <Input value={formCharacteristic} onChange={(e) => setFormCharacteristic(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("quality.msa.specification")}</Label>
                <Input value={formSpec} onChange={(e) => setFormSpec(e.target.value)} placeholder="10.00 +/- 0.05" />
              </div>
              <div className="space-y-2">
                <Label>{t("quality.msa.tolerance")}</Label>
                <Input value={formTolerance} onChange={(e) => setFormTolerance(e.target.value)} placeholder="0.10" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("quality.msa.operatorCount")}</Label>
                <Input type="number" min={1} value={formOperators} onChange={(e) => setFormOperators(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("quality.msa.partCount")}</Label>
                <Input type="number" min={1} value={formParts} onChange={(e) => setFormParts(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("quality.msa.trialCount")}</Label>
                <Input type="number" min={1} value={formTrials} onChange={(e) => setFormTrials(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("quality.common.cancel")}</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("quality.common.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
