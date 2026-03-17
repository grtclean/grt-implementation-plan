/**
 * AI产品合格证 (Product Certificate)
 * US-007: 自动生成结构化产品合格证 · 数据校验 · 一键输出
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { FileCheck, Loader2, Sparkles, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

const STANDARDS = [
  { value: "ISO 16232", label: "ISO 16232" },
  { value: "VDA 19", label: "VDA 19" },
  { value: "GB/T 16743", label: "GB/T 16743" },
  { value: "自定义", label: "自定义" },
];

interface CertificateResult {
  certificateNumber: string;
  productName: string;
  batchNumber: string;
  inspectionSummary: string;
  qualityMetrics: Array<{
    metric: string;
    specification: string;
    measured: string;
    unit: string;
    verdict: string;
  }>;
  cleanlinessVerdict: string;
  overallVerdict: string;
  validUntil: string;
  recommendations: string[];
}

export default function ProductCertificate() {
  const { t } = useLanguage();
  // Form state
  const [productName, setProductName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [inspectionData, setInspectionData] = useState("");
  const [cleanlinessResult, setCleanlinessResult] = useState("");
  const [standard, setStandard] = useState("ISO 16232");
  const [inspectorName, setInspectorName] = useState("");

  // Result state
  const [result, setResult] = useState<CertificateResult | null>(null);

  // Mutation
  const mutation = trpc.qualityAdvanced.generateCertificate.useMutation({
    onSuccess: (data) => setResult(data as any),
  });

  const handleSubmit = () => {
    if (!productName.trim() || !batchNumber.trim() || !customerName.trim() || !inspectionData.trim() || !cleanlinessResult.trim() || mutation.isPending) return;
    mutation.mutate({
      productName,
      batchNumber,
      customerName,
      inspectionData,
      cleanlinessResult,
      standard,
      inspectorName: inspectorName.trim() || undefined,
    });
  };

  const verdictColor = (v: string) => {
    switch (v) {
      case "合格": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "不合格": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "有条件合格": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const metricVerdictColor = (v: string) => {
    if (v === "合格" || v === "pass" || v === "PASS") return "bg-green-500/20 text-green-400 border-green-500/30";
    if (v === "不合格" || v === "fail" || v === "FAIL") return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={FileCheck}
          title={t("quality.certificate.title")}
          description={t("quality.certificate.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("quality.certificate.aiBadge")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck className="h-5 w-5 text-primary" />
              {t("quality.certificate.sectionInput")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.certificate.productName")} *</label>
                <Input placeholder={t("quality.certificate.productNamePlaceholder")} value={productName} onChange={(e) => setProductName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.certificate.batchNo")} *</label>
                <Input placeholder="e.g. BATCH-2026-0215-001" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.certificate.customerName")} *</label>
                <Input placeholder={t("quality.certificate.customerNamePlaceholder")} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.certificate.standard")} *</label>
                <Select value={standard} onValueChange={(v) => setStandard(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("quality.certificate.standard")} />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARDS.map((s) => <SelectItem key={s.value} value={s.value}>{s.value === "自定义" ? t("quality.certificate.standardCustom") : s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("quality.certificate.inspector")}</label>
                <Input placeholder={t("quality.certificate.inspector")} value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("quality.certificate.testData")} *</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder={t("quality.certificate.testDataPlaceholder")} value={inspectionData} onChange={(e) => setInspectionData(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("quality.certificate.cleanlinessResult")} *</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder={t("quality.certificate.cleanlinessResult")} value={cleanlinessResult} onChange={(e) => setCleanlinessResult(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!productName.trim() || !batchNumber.trim() || !customerName.trim() || !inspectionData.trim() || !cleanlinessResult.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("quality.certificate.generateBtn")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Certificate Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("quality.certificate.certNumber")}</p>
                    <p className="text-3xl font-bold text-primary">{result.certificateNumber}</p>
                  </div>
                  <Badge className={`text-2xl px-4 py-2 ${verdictColor(result.overallVerdict)}`}>
                    {result.overallVerdict}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("quality.certificate.certProductName")}</p>
                    <p className="text-sm font-medium">{result.productName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("quality.certificate.certBatchNo")}</p>
                    <p className="text-sm font-medium">{result.batchNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("quality.certificate.validUntil")}</p>
                    <p className="text-sm font-medium">{result.validUntil}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">{t("quality.certificate.testSummary")}</p>
                  <p className="text-sm whitespace-pre-wrap">{result.inspectionSummary}</p>
                </div>
              </CardContent>
            </Card>

            {/* Quality Metrics Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileCheck className="h-5 w-5 text-primary" />
                  {t("quality.certificate.sectionMetrics")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-muted-foreground">{t("quality.certificate.headerItem")}</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">{t("quality.certificate.headerSpec")}</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">{t("quality.certificate.headerActual")}</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">{t("quality.certificate.headerUnit")}</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">{t("quality.certificate.headerVerdict")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.qualityMetrics.map((m, idx) => (
                      <tr key={idx} className="border-b border-muted/50">
                        <td className="py-2 font-medium">{m.metric}</td>
                        <td className="py-2">{m.specification}</td>
                        <td className="py-2">{m.measured}</td>
                        <td className="py-2 text-muted-foreground">{m.unit}</td>
                        <td className="py-2 text-center">
                          <Badge className={metricVerdictColor(m.verdict)}>{m.verdict}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Cleanliness Verdict */}
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">{t("quality.certificate.cleanlinessVerdict")}</p>
                <p className="text-sm whitespace-pre-wrap">{result.cleanlinessVerdict}</p>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    {t("quality.certificate.sectionAiSuggestions")}
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
