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
    onSuccess: (data) => setResult(data as CertificateResult),
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
          title="AI产品合格证"
          description="自动生成结构化产品合格证 · 数据校验 · 一键输出"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI质检
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck className="h-5 w-5 text-primary" />
              合格证信息录入
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">产品名称 *</label>
                <Input placeholder="如: 铝合金发动机缸体" value={productName} onChange={(e) => setProductName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">批次号 *</label>
                <Input placeholder="如: BATCH-2026-0215-001" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">客户名称 *</label>
                <Input placeholder="如: XX汽车有限公司" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">执行标准 *</label>
                <Select value={standard} onValueChange={(v) => setStandard(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择执行标准" />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARDS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">检验员</label>
                <Input placeholder="检验员姓名（可选）" value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">检测数据 *</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder="检测数据如: 尺寸公差±0.05mm, 表面粗糙度Ra0.8" value={inspectionData} onChange={(e) => setInspectionData(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">清洁度检测结果 *</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder="清洁度检测结果" value={cleanlinessResult} onChange={(e) => setCleanlinessResult(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!productName.trim() || !batchNumber.trim() || !customerName.trim() || !inspectionData.trim() || !cleanlinessResult.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                生成合格证
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
                    <p className="text-sm text-muted-foreground">合格证编号</p>
                    <p className="text-3xl font-bold text-primary">{result.certificateNumber}</p>
                  </div>
                  <Badge className={`text-2xl px-4 py-2 ${verdictColor(result.overallVerdict)}`}>
                    {result.overallVerdict}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">产品名称</p>
                    <p className="text-sm font-medium">{result.productName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">批次号</p>
                    <p className="text-sm font-medium">{result.batchNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">有效期至</p>
                    <p className="text-sm font-medium">{result.validUntil}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">检测摘要</p>
                  <p className="text-sm whitespace-pre-wrap">{result.inspectionSummary}</p>
                </div>
              </CardContent>
            </Card>

            {/* Quality Metrics Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileCheck className="h-5 w-5 text-primary" />
                  质量指标明细
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-muted-foreground">检测项</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">规格要求</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">实测值</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">单位</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">判定</th>
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
                <p className="text-sm font-medium text-muted-foreground mb-1">清洁度判定</p>
                <p className="text-sm whitespace-pre-wrap">{result.cleanlinessVerdict}</p>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    AI建议
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
