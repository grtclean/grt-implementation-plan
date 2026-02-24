/**
 * 清洁度智能检测 (Cleanliness Inspection)
 * Phase 21 P0: US-001 检测模板 + US-002 自动判定 + US-003 报告生成
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardCheck, Loader2, Sparkles, AlertTriangle, CheckCircle, Shield,
  FileText, BarChart3,
} from "lucide-react";

type ActiveTab = "inspect" | "judge" | "report";

interface InspectionResult {
  inspectionId: string;
  structuredData: {
    particleCounts: Array<{ sizeRange: string; count: number; limit: number; status: string }>;
    maxParticle: { size: number; limit: number; status: string };
    residualMass: { value: number; limit: number; unit: string; status: string };
    totalParticleArea: { value: number; limit: number; unit: string; status: string };
  };
  standard: string;
  cleanlinessCode: string;
  summary: string;
}

interface JudgmentResult {
  overallVerdict: string;
  verdictConfidence: number;
  itemResults: Array<{ item: string; measuredValue: string; standardLimit: string; verdict: string; margin: string }>;
  criticalFindings: string[];
  borderlineCases: string[];
  recommendations: string[];
}

interface ReportResult {
  reportTitle: string;
  executiveSummary: string;
  inspectionDetails: string;
  chartData: {
    particleDistribution: Array<{ sizeRange: string; count: number; limit: number }>;
    trendComparison: Array<{ batch: string; cleanlinessLevel: number }>;
  };
  conclusion: string;
  signoffItems: Array<{ role: string; requirement: string }>;
  recommendations: string[];
}

export default function CleanlinessInspection() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>("inspect");

  const STANDARDS = [
    { value: "ISO 16232", label: "ISO 16232" },
    { value: "VDA 19", label: "VDA 19" },
    { value: "自定义", label: t("manufacturing.cleanliness.customStandard") },
  ];

  const CLEANING_METHODS = [
    { value: "碳氢真空清洗", label: t("manufacturing.cleanliness.hydroCarbonVacuum") },
    { value: "水基清洗", label: t("manufacturing.cleanliness.waterBased") },
    { value: "超声波清洗", label: t("manufacturing.cleanliness.ultrasonic") },
    { value: "组合清洗", label: t("manufacturing.cleanliness.combined") },
  ];

  const CLEANLINESS_CLASSES = [
    { value: "__none__", label: t("manufacturing.cleanliness.unspecified") },
    { value: "A", label: t("manufacturing.cleanliness.classAHighest") },
    { value: "B", label: t("manufacturing.cleanliness.classB") },
    { value: "C", label: t("manufacturing.cleanliness.classC") },
    { value: "D", label: t("manufacturing.cleanliness.classD") },
    { value: "E", label: t("manufacturing.cleanliness.classE") },
  ];

  const INSPECTION_METHODS = [
    { value: "显微镜计数法", label: t("manufacturing.cleanliness.microscopeCounting") },
    { value: "自动颗粒计数仪", label: t("manufacturing.cleanliness.autoParticleCounter") },
    { value: "重量法", label: t("manufacturing.cleanliness.gravimetric") },
  ];

  // Shared fields
  const [batchNumber, setBatchNumber] = useState("");
  const [workpieceType, setWorkpieceType] = useState("");
  const [cleaningMethod, setCleaningMethod] = useState("碳氢真空清洗");
  const [standard, setStandard] = useState("ISO 16232");
  const [cleanlinessClass, setCleanlinessClass] = useState("__none__");
  const [particleData, setParticleData] = useState("");
  const [residualMass, setResidualMass] = useState("");
  const [maxParticleSize, setMaxParticleSize] = useState("");
  const [inspectionMethod, setInspectionMethod] = useState("自动颗粒计数仪");

  // Results
  const [inspectResult, setInspectResult] = useState<InspectionResult | null>(null);
  const [judgeResult, setJudgeResult] = useState<JudgmentResult | null>(null);
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);

  // Mutations
  const inspectMutation = trpc.cleanlinessQc.inspect.useMutation({
    onSuccess: (data) => setInspectResult(data as InspectionResult),
  });
  const judgeMutation = trpc.cleanlinessQc.judge.useMutation({
    onSuccess: (data) => setJudgeResult(data as JudgmentResult),
  });
  const reportMutation = trpc.cleanlinessQc.generateReport.useMutation({
    onSuccess: (data) => setReportResult(data as ReportResult),
  });

  const handleInspect = () => {
    if (!batchNumber.trim() || !workpieceType.trim() || !particleData.trim() || inspectMutation.isPending) return;
    inspectMutation.mutate({
      batchNumber, workpieceType, cleaningMethod, standard,
      cleanlinessClass: cleanlinessClass === "__none__" ? undefined : cleanlinessClass,
      particleData,
      residualMass: residualMass ? Number(residualMass) : undefined,
      maxParticleSize: maxParticleSize ? Number(maxParticleSize) : undefined,
      inspectionMethod,
    });
  };

  const handleJudge = () => {
    if (!batchNumber.trim() || !particleData.trim() || cleanlinessClass === "__none__" || judgeMutation.isPending) return;
    judgeMutation.mutate({
      batchNumber, standard, cleanlinessClass: cleanlinessClass === "__none__" ? undefined : cleanlinessClass, particleData,
      residualMass: residualMass ? Number(residualMass) : undefined,
      maxParticleSize: maxParticleSize ? Number(maxParticleSize) : undefined,
    });
  };

  const handleReport = () => {
    if (!batchNumber.trim() || !particleData.trim() || reportMutation.isPending) return;
    reportMutation.mutate({
      batchNumber, workpieceType, cleaningMethod, standard,
      inspectionData: particleData,
      judgmentResult: judgeResult ? judgeResult.overallVerdict : t("manufacturing.cleanliness.pendingJudgment"),
    });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "pass": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "fail": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "warning": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };
  const statusLabel = (s: string) => {
    switch (s) { case "pass": return t("manufacturing.cleanliness.pass"); case "fail": return t("manufacturing.cleanliness.exceeded"); case "warning": return t("manufacturing.cleanliness.borderline"); default: return s; }
  };

  const verdictColor = (v: string) => {
    switch (v) {
      case "合格": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "不合格": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "有条件合格": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const tabs: { key: ActiveTab; label: string; icon: typeof ClipboardCheck }[] = [
    { key: "inspect", label: t("manufacturing.cleanliness.tabDataEntry"), icon: ClipboardCheck },
    { key: "judge", label: t("manufacturing.cleanliness.tabAutoJudge"), icon: Shield },
    { key: "report", label: t("manufacturing.cleanliness.tabReportGen"), icon: FileText },
  ];

  const isPending = inspectMutation.isPending || judgeMutation.isPending || reportMutation.isPending;

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={ClipboardCheck}
          title={t("manufacturing.cleanliness.smartInspectionTitle")}
          description={t("manufacturing.cleanliness.smartInspectionDesc")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("manufacturing.common.aiQuality")}
            </Badge>
          }
        />

        {/* Tab Switcher */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
              className="gap-1"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Shared Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              {t("manufacturing.cleanliness.dataInput")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.cleanliness.batchNumber")}</label>
                <Input placeholder={t("manufacturing.cleanliness.batchNumberPlaceholder")} value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.cleanliness.workpieceType")}</label>
                <Input placeholder={t("manufacturing.cleanliness.workpieceTypePlaceholder")} value={workpieceType} onChange={(e) => setWorkpieceType(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.cleanliness.cleaningMethod")}</label>
                <Select value={cleaningMethod} onValueChange={(v) => setCleaningMethod(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("manufacturing.cleanliness.selectCleaningMethod")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CLEANING_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.cleanliness.standard")}</label>
                <Select value={standard} onValueChange={(v) => setStandard(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("manufacturing.cleanliness.selectStandard")} />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARDS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.cleanliness.cleanlinessClassReq")}</label>
                <Select value={cleanlinessClass} onValueChange={(v) => setCleanlinessClass(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("manufacturing.cleanliness.unspecified")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CLEANLINESS_CLASSES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.cleanliness.inspectionMethod")}</label>
                <Select value={inspectionMethod} onValueChange={(v) => setInspectionMethod(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("manufacturing.cleanliness.selectInspectionMethod")} />
                  </SelectTrigger>
                  <SelectContent>
                    {INSPECTION_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("manufacturing.cleanliness.particleData")}</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder={t("manufacturing.cleanliness.particleDataPlaceholder")} value={particleData} onChange={(e) => setParticleData(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.cleanliness.residualMassLabel")}</label>
                <Input type="number" step="0.01" placeholder={t("manufacturing.cleanliness.residualMassPlaceholder")} value={residualMass} onChange={(e) => setResidualMass(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.cleanliness.maxParticleSizeLabel")}</label>
                <Input type="number" placeholder={t("manufacturing.cleanliness.maxParticleSizePlaceholder")} value={maxParticleSize} onChange={(e) => setMaxParticleSize(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {activeTab === "inspect" && (
                <Button onClick={handleInspect} disabled={!batchNumber.trim() || !workpieceType.trim() || !particleData.trim() || isPending}>
                  {inspectMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {t("manufacturing.cleanliness.aiStructurize")}
                </Button>
              )}
              {activeTab === "judge" && (
                <Button onClick={handleJudge} disabled={!batchNumber.trim() || !particleData.trim() || cleanlinessClass === "__none__" || isPending}>
                  {judgeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                  {t("manufacturing.cleanliness.tabAutoJudge")}
                </Button>
              )}
              {activeTab === "report" && (
                <Button onClick={handleReport} disabled={!batchNumber.trim() || !particleData.trim() || isPending}>
                  {reportMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  {t("manufacturing.cleanliness.generateReport")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tab: Inspection Results */}
        {activeTab === "inspect" && inspectResult && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("manufacturing.cleanliness.cleanlinessCode")}</p>
                    <p className="text-3xl font-bold text-primary">{inspectResult.cleanlinessCode}</p>
                  </div>
                  <Badge variant="outline" className="text-sm">{inspectResult.standard}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{inspectResult.summary}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  {t("manufacturing.cleanliness.particleDistribution")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-muted-foreground">{t("manufacturing.cleanliness.sizeRange")}</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">{t("manufacturing.cleanliness.measuredCount")}</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">{t("manufacturing.cleanliness.limitValue")}</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">{t("manufacturing.cleanliness.result")}</th>
                      <th className="py-2 font-medium text-muted-foreground">{t("manufacturing.cleanliness.visualization")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectResult.structuredData.particleCounts.map((p, idx) => (
                      <tr key={idx} className="border-b border-muted/50">
                        <td className="py-2 font-medium">{p.sizeRange}</td>
                        <td className="py-2 text-right">{p.count}</td>
                        <td className="py-2 text-right text-muted-foreground">{p.limit}</td>
                        <td className="py-2 text-center"><Badge className={statusColor(p.status)}>{statusLabel(p.status)}</Badge></td>
                        <td className="py-2">
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${p.status === "pass" ? "bg-green-500" : p.status === "warning" ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min((p.count / Math.max(p.limit, 1)) * 100, 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">{t("manufacturing.cleanliness.maxParticle")}</p>
                    <p className="text-lg font-bold">{inspectResult.structuredData.maxParticle.size}μm</p>
                    <Badge className={statusColor(inspectResult.structuredData.maxParticle.status)}>{statusLabel(inspectResult.structuredData.maxParticle.status)}</Badge>
                  </div>
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">{t("manufacturing.cleanliness.residualMass")}</p>
                    <p className="text-lg font-bold">{inspectResult.structuredData.residualMass.value}{inspectResult.structuredData.residualMass.unit}</p>
                    <Badge className={statusColor(inspectResult.structuredData.residualMass.status)}>{statusLabel(inspectResult.structuredData.residualMass.status)}</Badge>
                  </div>
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">{t("manufacturing.cleanliness.totalParticleArea")}</p>
                    <p className="text-lg font-bold">{inspectResult.structuredData.totalParticleArea.value}{inspectResult.structuredData.totalParticleArea.unit}</p>
                    <Badge className={statusColor(inspectResult.structuredData.totalParticleArea.status)}>{statusLabel(inspectResult.structuredData.totalParticleArea.status)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Tab: Judgment Results */}
        {activeTab === "judge" && judgeResult && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("manufacturing.cleanliness.overallVerdict")}</p>
                    <Badge className={`text-2xl px-4 py-2 ${verdictColor(judgeResult.overallVerdict)}`}>{judgeResult.overallVerdict}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{t("manufacturing.cleanliness.verdictConfidence")}</p>
                    <p className="text-3xl font-bold">{judgeResult.verdictConfidence}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-5 w-5 text-primary" />
                  {t("manufacturing.cleanliness.itemByItemResults")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-muted-foreground">{t("manufacturing.cleanliness.inspectionItem")}</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">{t("manufacturing.cleanliness.measuredValue")}</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">{t("manufacturing.cleanliness.standardLimit")}</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">{t("manufacturing.cleanliness.verdict")}</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">{t("manufacturing.cleanliness.margin")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {judgeResult.itemResults.map((item, idx) => (
                      <tr key={idx} className="border-b border-muted/50">
                        <td className="py-2 font-medium">{item.item}</td>
                        <td className="py-2">{item.measuredValue}</td>
                        <td className="py-2 text-muted-foreground">{item.standardLimit}</td>
                        <td className="py-2 text-center"><Badge className={statusColor(item.verdict)}>{statusLabel(item.verdict)}</Badge></td>
                        <td className="py-2 text-muted-foreground">{item.margin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            {judgeResult.criticalFindings.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-5 w-5 text-red-400" />{t("manufacturing.cleanliness.criticalFindings")}</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">{judgeResult.criticalFindings.map((f, i) => (<li key={i} className="flex items-start gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" /><span>{f}</span></li>))}</ul>
                </CardContent>
              </Card>
            )}
            {judgeResult.recommendations.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle className="h-5 w-5 text-primary" />{t("manufacturing.common.aiSuggestions")}</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">{judgeResult.recommendations.map((r, i) => (<li key={i} className="flex items-start gap-2 text-sm"><span className="text-primary font-medium flex-shrink-0">{i + 1}.</span><span>{r}</span></li>))}</ul>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Tab: Report Results */}
        {activeTab === "report" && reportResult && (
          <>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5 text-primary" />{reportResult.reportTitle}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t("manufacturing.cleanliness.executiveSummary")}</p>
                  <p className="text-sm whitespace-pre-wrap">{reportResult.executiveSummary}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t("manufacturing.cleanliness.inspectionDetails")}</p>
                  <p className="text-sm whitespace-pre-wrap">{reportResult.inspectionDetails}</p>
                </div>
              </CardContent>
            </Card>
            {reportResult.chartData.particleDistribution.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5 text-primary" />{t("manufacturing.cleanliness.particleDistChartData")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {reportResult.chartData.particleDistribution.map((d, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs w-16 text-muted-foreground">{d.sizeRange}</span>
                        <div className="flex-1 h-4 bg-muted rounded relative">
                          <div className="h-full bg-primary/60 rounded" style={{ width: `${Math.min((d.count / Math.max(d.limit, 1)) * 100, 100)}%` }} />
                          <div className="absolute top-0 h-full border-r-2 border-red-400" style={{ left: `100%` }} />
                        </div>
                        <span className="text-xs w-20 text-right">{d.count}/{d.limit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">{t("manufacturing.cleanliness.conclusion")}</p>
                <p className="font-medium">{reportResult.conclusion}</p>
              </CardContent>
            </Card>
            {reportResult.signoffItems.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">{t("manufacturing.cleanliness.signoffRequirements")}</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left py-2 text-muted-foreground">{t("manufacturing.cleanliness.signoffRole")}</th><th className="text-left py-2 text-muted-foreground">{t("manufacturing.cleanliness.signoffReq")}</th></tr></thead>
                    <tbody>{reportResult.signoffItems.map((s, i) => (<tr key={i} className="border-b border-muted/50"><td className="py-2 font-medium">{s.role}</td><td className="py-2">{s.requirement}</td></tr>))}</tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
  );
}
