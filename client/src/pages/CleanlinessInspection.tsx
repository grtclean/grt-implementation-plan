/**
 * 清洁度智能检测 (Cleanliness Inspection)
 * Phase 21 P0: US-001 检测模板 + US-002 自动判定 + US-003 报告生成
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  ClipboardCheck, Loader2, Sparkles, AlertTriangle, CheckCircle, Shield,
  FileText, BarChart3,
} from "lucide-react";

const STANDARDS = [
  { value: "ISO 16232", label: "ISO 16232" },
  { value: "VDA 19", label: "VDA 19" },
  { value: "自定义", label: "客户自定义标准" },
];

const CLEANING_METHODS = [
  { value: "碳氢真空清洗", label: "碳氢真空清洗" },
  { value: "水基清洗", label: "水基清洗" },
  { value: "超声波清洗", label: "超声波清洗" },
  { value: "组合清洗", label: "组合清洗" },
];

const CLEANLINESS_CLASSES = [
  { value: "", label: "不指定" },
  { value: "A", label: "A级(最高)" },
  { value: "B", label: "B级" },
  { value: "C", label: "C级" },
  { value: "D", label: "D级" },
  { value: "E", label: "E级" },
];

const INSPECTION_METHODS = [
  { value: "显微镜计数法", label: "显微镜计数法" },
  { value: "自动颗粒计数仪", label: "自动颗粒计数仪" },
  { value: "重量法", label: "重量法(滤膜称重)" },
];

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("inspect");

  // Shared fields
  const [batchNumber, setBatchNumber] = useState("");
  const [workpieceType, setWorkpieceType] = useState("");
  const [cleaningMethod, setCleaningMethod] = useState("碳氢真空清洗");
  const [standard, setStandard] = useState("ISO 16232");
  const [cleanlinessClass, setCleanlinessClass] = useState("");
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
      cleanlinessClass: cleanlinessClass || undefined,
      particleData,
      residualMass: residualMass ? Number(residualMass) : undefined,
      maxParticleSize: maxParticleSize ? Number(maxParticleSize) : undefined,
      inspectionMethod,
    });
  };

  const handleJudge = () => {
    if (!batchNumber.trim() || !particleData.trim() || !cleanlinessClass || judgeMutation.isPending) return;
    judgeMutation.mutate({
      batchNumber, standard, cleanlinessClass, particleData,
      residualMass: residualMass ? Number(residualMass) : undefined,
      maxParticleSize: maxParticleSize ? Number(maxParticleSize) : undefined,
    });
  };

  const handleReport = () => {
    if (!batchNumber.trim() || !particleData.trim() || reportMutation.isPending) return;
    reportMutation.mutate({
      batchNumber, workpieceType, cleaningMethod, standard,
      inspectionData: particleData,
      judgmentResult: judgeResult ? judgeResult.overallVerdict : "待判定",
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
    switch (s) { case "pass": return "合格"; case "fail": return "超标"; case "warning": return "边界"; default: return s; }
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
    { key: "inspect", label: "数据录入", icon: ClipboardCheck },
    { key: "judge", label: "自动判定", icon: Shield },
    { key: "report", label: "报告生成", icon: FileText },
  ];

  const isPending = inspectMutation.isPending || judgeMutation.isPending || reportMutation.isPending;

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={ClipboardCheck}
          title="清洁度智能检测"
          description="ISO 16232 / VDA 19 · 数据结构化 · 自动判定 · 报告生成"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI质检
            </Badge>
          }
        />

        {/* Tab Switcher */}
        <div className="flex gap-2">
          {tabs.map((t) => (
            <Button
              key={t.key}
              variant={activeTab === t.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(t.key)}
              className="gap-1"
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Button>
          ))}
        </div>

        {/* Shared Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              检测数据输入
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">批次号</label>
                <Input placeholder="如: BATCH-2026-0215-001" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">工件类型</label>
                <Input placeholder="如: 铝合金发动机缸体" value={workpieceType} onChange={(e) => setWorkpieceType(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">清洗方式</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={cleaningMethod} onChange={(e) => setCleaningMethod(e.target.value)}>
                  {CLEANING_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">执行标准</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={standard} onChange={(e) => setStandard(e.target.value)}>
                  {STANDARDS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">清洁度等级要求</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={cleanlinessClass} onChange={(e) => setCleanlinessClass(e.target.value)}>
                  {CLEANLINESS_CLASSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">检测方法</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={inspectionMethod} onChange={(e) => setInspectionMethod(e.target.value)}>
                  {INSPECTION_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">颗粒数据（各粒径档位计数）</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder="如: >5μm: 850颗, >15μm: 320颗, >25μm: 85颗, >50μm: 18颗, >100μm: 3颗, >150μm: 1颗, >200μm: 0颗" value={particleData} onChange={(e) => setParticleData(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">残余质量(mg，可选)</label>
                <Input type="number" step="0.01" placeholder="如: 1.25" value={residualMass} onChange={(e) => setResidualMass(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">最大颗粒尺寸(μm，可选)</label>
                <Input type="number" placeholder="如: 180" value={maxParticleSize} onChange={(e) => setMaxParticleSize(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {activeTab === "inspect" && (
                <Button onClick={handleInspect} disabled={!batchNumber.trim() || !workpieceType.trim() || !particleData.trim() || isPending}>
                  {inspectMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  AI结构化
                </Button>
              )}
              {activeTab === "judge" && (
                <Button onClick={handleJudge} disabled={!batchNumber.trim() || !particleData.trim() || !cleanlinessClass || isPending}>
                  {judgeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                  自动判定
                </Button>
              )}
              {activeTab === "report" && (
                <Button onClick={handleReport} disabled={!batchNumber.trim() || !particleData.trim() || isPending}>
                  {reportMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  生成报告
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
                    <p className="text-sm text-muted-foreground">清洁度编码</p>
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
                  颗粒度分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-muted-foreground">粒径范围</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">实测数量</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">限值</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">结果</th>
                      <th className="py-2 font-medium text-muted-foreground">可视化</th>
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
                    <p className="text-xs text-muted-foreground">最大颗粒</p>
                    <p className="text-lg font-bold">{inspectResult.structuredData.maxParticle.size}μm</p>
                    <Badge className={statusColor(inspectResult.structuredData.maxParticle.status)}>{statusLabel(inspectResult.structuredData.maxParticle.status)}</Badge>
                  </div>
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">残余质量</p>
                    <p className="text-lg font-bold">{inspectResult.structuredData.residualMass.value}{inspectResult.structuredData.residualMass.unit}</p>
                    <Badge className={statusColor(inspectResult.structuredData.residualMass.status)}>{statusLabel(inspectResult.structuredData.residualMass.status)}</Badge>
                  </div>
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">颗粒总面积</p>
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
                    <p className="text-sm text-muted-foreground">综合判定</p>
                    <Badge className={`text-2xl px-4 py-2 ${verdictColor(judgeResult.overallVerdict)}`}>{judgeResult.overallVerdict}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">判定置信度</p>
                    <p className="text-3xl font-bold">{judgeResult.verdictConfidence}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-5 w-5 text-primary" />
                  逐项判定结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-muted-foreground">检测项</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">实测值</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">标准限值</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">判定</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">余量</th>
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
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-5 w-5 text-red-400" />关键发现</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">{judgeResult.criticalFindings.map((f, i) => (<li key={i} className="flex items-start gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" /><span>{f}</span></li>))}</ul>
                </CardContent>
              </Card>
            )}
            {judgeResult.recommendations.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle className="h-5 w-5 text-primary" />AI建议</CardTitle></CardHeader>
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
                  <p className="text-sm font-medium text-muted-foreground mb-1">执行摘要</p>
                  <p className="text-sm whitespace-pre-wrap">{reportResult.executiveSummary}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">检测详情</p>
                  <p className="text-sm whitespace-pre-wrap">{reportResult.inspectionDetails}</p>
                </div>
              </CardContent>
            </Card>
            {reportResult.chartData.particleDistribution.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5 text-primary" />颗粒分布图表数据</CardTitle></CardHeader>
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
                <p className="text-sm font-medium text-muted-foreground mb-1">结论</p>
                <p className="font-medium">{reportResult.conclusion}</p>
              </CardContent>
            </Card>
            {reportResult.signoffItems.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">签审要求</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left py-2 text-muted-foreground">角色</th><th className="text-left py-2 text-muted-foreground">要求</th></tr></thead>
                    <tbody>{reportResult.signoffItems.map((s, i) => (<tr key={i} className="border-b border-muted/50"><td className="py-2 font-medium">{s.role}</td><td className="py-2">{s.requirement}</td></tr>))}</tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
