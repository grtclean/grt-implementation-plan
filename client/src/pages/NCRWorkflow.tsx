/**
 * NCR Nonconforming Product (NCR Workflow)
 * US-009: NCR report generation, root cause analysis, disposition recommendation, 8D tracking
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, Loader2, Sparkles, CheckCircle, Shield, Target, ListChecks,
} from "lucide-react";

const DEFECT_CATEGORY_KEYS = [
  { value: "尺寸超差", key: "quality.ncr.catDimension" },
  { value: "表面缺陷", key: "quality.ncr.catSurface" },
  { value: "清洁度不达标", key: "quality.ncr.catCleanliness" },
  { value: "功能异常", key: "quality.ncr.catFunction" },
  { value: "材料问题", key: "quality.ncr.catMaterial" },
  { value: "装配偏差", key: "quality.ncr.catAssembly" },
];

const DETECTION_STAGE_KEYS = [
  { value: "来料检验", key: "quality.ncr.stageIncoming" },
  { value: "过程检验", key: "quality.ncr.stageInProcess" },
  { value: "终检", key: "quality.ncr.stageFinal" },
  { value: "FAT", key: "FAT" },
  { value: "SAT", key: "SAT" },
  { value: "售后", key: "quality.ncr.stageAfterSales" },
];

const SEVERITY_KEYS = [
  { value: "critical", key: "quality.ncr.severityCritical" },
  { value: "major", key: "quality.ncr.severityMajor" },
  { value: "minor", key: "quality.ncr.severityMinor" },
];

function detectionStageLabel(t: (k: string) => string, key: string): string {
  return key.startsWith("quality.") ? t(key) : key;
}

interface NCRResult {
  ncrNumber: string;
  classification: string;
  severity: string;
  containmentActions: string[];
  rootCauseAnalysis: {
    fishbone: Array<{ category: string; causes: string[] }>;
    mostLikelyCause: string;
    confidence: number;
  };
  correctiveActions: Array<{
    action: string;
    owner: string;
    deadline: string;
    priority: string;
  }>;
  dispositionRecommendation: string;
  preventiveActions: string[];
  costImpact: string;
  recommendations: string[];
}

export default function NCRWorkflow() {
  const { t } = useLanguage();
  // Form state
  const [productName, setProductName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [defectDescription, setDefectDescription] = useState("");
  const [defectCategory, setDefectCategory] = useState("尺寸超差");
  const [detectionStage, setDetectionStage] = useState("来料检验");
  const [quantity, setQuantity] = useState("");
  const [severity, setSeverity] = useState("__none__");
  const [previousOccurrences, setPreviousOccurrences] = useState("");

  // Result state
  const [result, setResult] = useState<NCRResult | null>(null);

  // Mutation
  const mutation = trpc.qualityAdvanced.analyzeNCR.useMutation({
    onSuccess: (data) => setResult(data as unknown as NCRResult),
  });

  // Phase 5: 保存 NCR 到数据库
  const saveMutation = (trpc.qualityAdvanced as any).saveNCR?.useMutation?.({
    onSuccess: () => toast.success("NCR 已保存到数据库"),
    onError: (err: any) => toast.error(`保存失败: ${err.message}`),
  }) ?? null;

  const handleSaveNCR = () => {
    if (!result || !saveMutation) return;
    saveMutation.mutate({
      ncrNumber: (result as any).ncrNumber || `NCR-${Date.now()}`,
      productName,
      batchNumber,
      defectCategory,
      defectDescription,
      detectionStage,
      severity: (result as any).severity || severity,
      analysisResult: result as any,
      rootCauseAnalysis: (result as any).rootCauseAnalysis || [],
      correctiveActions: (result as any).correctiveActions || [],
      preventiveActions: (result as any).preventiveActions || [],
      disposition: (result as any).dispositionRecommendation || null,
    });
  };

  const handleSubmit = () => {
    if (!productName.trim() || !batchNumber.trim() || !defectDescription.trim() || !quantity || mutation.isPending) return;
    mutation.mutate({
      productName,
      batchNumber,
      defectDescription,
      defectCategory,
      detectionStage,
      quantity: Number(quantity),
      severity: severity === "__none__" ? undefined : severity,
      previousOccurrences: previousOccurrences.trim() || undefined,
    });
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "major": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "minor": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const severityLabel = (s: string) => {
    switch (s) {
      case "critical": return t("quality.ncr.severityCritical");
      case "major": return t("quality.ncr.severityMajor");
      case "minor": return t("quality.ncr.severityMinor");
      default: return s;
    }
  };

  const priorityColor = (p: string) => {
    if (p === "高" || p === "high" || p === "P1") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (p === "中" || p === "medium" || p === "P2") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  // Fishbone category colors for visual distinction
  const fishboneColors = [
    "border-red-500/30 bg-red-500/5",
    "border-yellow-500/30 bg-yellow-500/5",
    "border-blue-500/30 bg-blue-500/5",
    "border-green-500/30 bg-green-500/5",
    "border-purple-500/30 bg-purple-500/5",
    "border-orange-500/30 bg-orange-500/5",
  ];

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={AlertTriangle}
          title={t("quality.ncr.title")}
          description={t("quality.ncr.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("quality.ncr.aiBadge")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-primary" />
              {t("quality.ncr.sectionInput")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.ncr.productName")} *</label>
                <Input placeholder={t("quality.ncr.productPlaceholder")} value={productName} onChange={(e) => setProductName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.ncr.batchNo")} *</label>
                <Input placeholder={t("quality.ncr.batchPlaceholder")} value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.ncr.defectQty")} *</label>
                <Input type="number" placeholder={t("quality.ncr.qtyPlaceholder")} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.ncr.defectCategory")} *</label>
                <Select value={defectCategory} onValueChange={(v) => setDefectCategory(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("quality.ncr.selectDefectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFECT_CATEGORY_KEYS.map((c) => <SelectItem key={c.value} value={c.value}>{t(c.key)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.ncr.detectionStage")} *</label>
                <Select value={detectionStage} onValueChange={(v) => setDetectionStage(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("quality.ncr.selectDetectionStage")} />
                  </SelectTrigger>
                  <SelectContent>
                    {DETECTION_STAGE_KEYS.map((s) => <SelectItem key={s.value} value={s.value}>{detectionStageLabel(t, s.key)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.ncr.severityLevel")}</label>
                <Select value={severity} onValueChange={(v) => setSeverity(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("quality.ncr.unspecified")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("quality.ncr.unspecified")}</SelectItem>
                    {SEVERITY_KEYS.map((s) => <SelectItem key={s.value} value={s.value}>{t(s.key)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("quality.ncr.defectDesc")} *</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder={t("quality.ncr.defectDescPlaceholder")} value={defectDescription} onChange={(e) => setDefectDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("quality.ncr.historyInfo")}</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder={t("quality.ncr.historyInfo")} value={previousOccurrences} onChange={(e) => setPreviousOccurrences(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!productName.trim() || !batchNumber.trim() || !defectDescription.trim() || !quantity || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("quality.ncr.analyzeBtn")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* NCR Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("quality.ncr.sectionNumber")}</p>
                    <p className="text-3xl font-bold text-primary">{result.ncrNumber}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline" className="text-sm">{result.classification}</Badge>
                    <Badge className={`text-sm ${severityColor(result.severity)}`}>
                      {severityLabel(result.severity)}
                    </Badge>
                    {saveMutation && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSaveNCR}
                        disabled={saveMutation.isPending}
                        className="ml-2"
                      >
                        {saveMutation.isPending ? "保存中..." : "保存到数据库"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Containment Actions */}
            {result.containmentActions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-5 w-5 text-red-400" />
                    {t("quality.ncr.sectionContainment")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {result.containmentActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm p-2 rounded bg-red-500/5 border border-red-500/10">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Root Cause Analysis - Fishbone */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-5 w-5 text-primary" />
                  {t("quality.ncr.sectionRootCause")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.rootCauseAnalysis.fishbone.map((bone, idx) => (
                    <div key={idx} className={`p-3 rounded border ${fishboneColors[idx % fishboneColors.length]}`}>
                      <p className="text-sm font-bold mb-2">{bone.category}</p>
                      <ul className="space-y-1">
                        {bone.causes.map((cause, ci) => (
                          <li key={ci} className="flex items-start gap-2 text-sm">
                            <span className="text-muted-foreground flex-shrink-0 mt-0.5">-</span>
                            <span>{cause}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("quality.ncr.mostLikelyCause")}</p>
                      <p className="text-sm font-medium">{result.rootCauseAnalysis.mostLikelyCause}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">{t("quality.ncr.confidenceLevel")}</p>
                      <p className="text-2xl font-bold text-primary">{result.rootCauseAnalysis.confidence}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Corrective Actions */}
            {result.correctiveActions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="h-5 w-5 text-primary" />
                    {t("quality.ncr.sectionCorrective")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium text-muted-foreground">{t("quality.ncr.headerAction")}</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">{t("quality.ncr.headerResponsible")}</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">{t("quality.ncr.headerDeadline")}</th>
                        <th className="text-center py-2 font-medium text-muted-foreground">{t("quality.ncr.headerPriority")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.correctiveActions.map((ca, idx) => (
                        <tr key={idx} className="border-b border-muted/50">
                          <td className="py-2 font-medium">{ca.action}</td>
                          <td className="py-2">{ca.owner}</td>
                          <td className="py-2 text-muted-foreground">{ca.deadline}</td>
                          <td className="py-2 text-center">
                            <Badge className={priorityColor(ca.priority)}>{ca.priority}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Disposition Recommendation */}
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">{t("quality.ncr.sectionDisposition")}</p>
                <div className="p-4 rounded bg-yellow-500/5 border border-yellow-500/20">
                  <p className="text-sm font-medium">{result.dispositionRecommendation}</p>
                </div>
              </CardContent>
            </Card>

            {/* Preventive Actions */}
            {result.preventiveActions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-5 w-5 text-green-400" />
                    {t("quality.ncr.sectionPreventive")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.preventiveActions.map((pa, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{pa}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Cost Impact */}
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">{t("quality.ncr.sectionCostImpact")}</p>
                <p className="text-sm">{result.costImpact}</p>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    {t("quality.ncr.sectionAiSuggestions")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium flex-shrink-0">{i + 1}.</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
  );
}
