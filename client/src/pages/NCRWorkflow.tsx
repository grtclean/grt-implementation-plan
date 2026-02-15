/**
 * NCR不合格品处理 (NCR Workflow)
 * US-009: 不合格品报告生成 · 根因分析 · 处置建议 · 8D追踪
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
  AlertTriangle, Loader2, Sparkles, CheckCircle, Shield, Target, ListChecks,
} from "lucide-react";

const DEFECT_CATEGORIES = [
  { value: "尺寸超差", label: "尺寸超差" },
  { value: "表面缺陷", label: "表面缺陷" },
  { value: "清洁度不达标", label: "清洁度不达标" },
  { value: "功能异常", label: "功能异常" },
  { value: "材料问题", label: "材料问题" },
  { value: "装配偏差", label: "装配偏差" },
];

const DETECTION_STAGES = [
  { value: "来料检验", label: "来料检验" },
  { value: "过程检验", label: "过程检验" },
  { value: "终检", label: "终检" },
  { value: "FAT", label: "FAT" },
  { value: "SAT", label: "SAT" },
  { value: "售后", label: "售后" },
];

const SEVERITIES = [
  { value: "critical", label: "严重 (Critical)" },
  { value: "major", label: "主要 (Major)" },
  { value: "minor", label: "次要 (Minor)" },
];

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
  // Form state
  const [productName, setProductName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [defectDescription, setDefectDescription] = useState("");
  const [defectCategory, setDefectCategory] = useState("尺寸超差");
  const [detectionStage, setDetectionStage] = useState("来料检验");
  const [quantity, setQuantity] = useState("");
  const [severity, setSeverity] = useState("");
  const [previousOccurrences, setPreviousOccurrences] = useState("");

  // Result state
  const [result, setResult] = useState<NCRResult | null>(null);

  // Mutation
  const mutation = trpc.qualityAdvanced.analyzeNCR.useMutation({
    onSuccess: (data) => setResult(data as unknown as NCRResult),
  });

  const handleSubmit = () => {
    if (!productName.trim() || !batchNumber.trim() || !defectDescription.trim() || !quantity || mutation.isPending) return;
    mutation.mutate({
      productName,
      batchNumber,
      defectDescription,
      defectCategory,
      detectionStage,
      quantity: Number(quantity),
      severity: severity || undefined,
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
      case "critical": return "严重";
      case "major": return "主要";
      case "minor": return "次要";
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
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={AlertTriangle}
          title="NCR不合格品处理"
          description="不合格品报告生成 · 根因分析 · 处置建议 · 8D追踪"
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
              <AlertTriangle className="h-5 w-5 text-primary" />
              不合格品信息
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
                <label className="text-sm text-muted-foreground">不合格数量 *</label>
                <Input type="number" placeholder="如: 15" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">缺陷类别 *</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={defectCategory} onChange={(e) => setDefectCategory(e.target.value)}>
                  {DEFECT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">检出环节 *</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={detectionStage} onChange={(e) => setDetectionStage(e.target.value)}>
                  {DETECTION_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">严重程度</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="">不指定</option>
                  {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">缺陷描述 *</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder="详细描述缺陷现象、位置、数量等" value={defectDescription} onChange={(e) => setDefectDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">历史发生情况</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder="历史发生情况" value={previousOccurrences} onChange={(e) => setPreviousOccurrences(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!productName.trim() || !batchNumber.trim() || !defectDescription.trim() || !quantity || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI分析
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
                    <p className="text-sm text-muted-foreground">NCR编号</p>
                    <p className="text-3xl font-bold text-primary">{result.ncrNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-sm">{result.classification}</Badge>
                    <Badge className={`text-sm ${severityColor(result.severity)}`}>
                      {severityLabel(result.severity)}
                    </Badge>
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
                    遏制措施
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
                  根因分析（鱼骨图）
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
                      <p className="text-xs text-muted-foreground mb-1">最可能根因</p>
                      <p className="text-sm font-medium">{result.rootCauseAnalysis.mostLikelyCause}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">置信度</p>
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
                    纠正措施
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium text-muted-foreground">措施</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">负责人</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">截止日期</th>
                        <th className="text-center py-2 font-medium text-muted-foreground">优先级</th>
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
                <p className="text-sm font-medium text-muted-foreground mb-2">处置建议</p>
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
                    预防措施
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
                <p className="text-sm font-medium text-muted-foreground mb-1">成本影响</p>
                <p className="text-sm">{result.costImpact}</p>
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
    </Layout>
  );
}
