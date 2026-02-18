/**
 * AI需求智能分析 (AI Requirements Analysis)
 * Phase H: 可行性评估 · 产品线推荐 · 技术参数 · 风险识别
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardCheck, Loader2, Sparkles, AlertTriangle, CheckCircle, Target,
} from "lucide-react";

const INDUSTRIES = [
  { value: "汽车制造", label: "汽车制造" },
  { value: "半导体", label: "半导体" },
  { value: "工业通用", label: "工业通用" },
  { value: "食品医药", label: "食品医药" },
  { value: "航空航天", label: "航空航天" },
];

const STANDARDS = [
  { value: "", label: "不指定" },
  { value: "ISO 16232", label: "ISO 16232" },
  { value: "VDA 19", label: "VDA 19" },
  { value: "自定义", label: "自定义" },
];

interface AnalysisResult {
  feasibilityScore: number;
  technicalSpecs: Array<{ parameter: string; recommendedValue: string; rationale: string }>;
  recommendedProductLine: string;
  riskFlags: Array<{ flag: string; severity: string; description: string }>;
  clarificationNeeded: string[];
  costEstimate: { min: number; max: number };
  recommendations: string[];
}

export default function AIRequirementsAnalysis() {
  const [projectName, setProjectName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [industry, setIndustry] = useState("汽车制造");
  const [cleaningTarget, setCleaningTarget] = useState("");
  const [cleanlinessStandard, setCleanlinessStandard] = useState("");
  const [throughput, setThroughput] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [budget, setBudget] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const mutation = trpc.rdServiceIntelligence.analyzeRequirements.useMutation({
    onSuccess: (data) => setResult(data as AnalysisResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!projectName.trim() || !customerName.trim() || !cleaningTarget.trim() || mutation.isPending) return;
    mutation.mutate({
      projectName,
      customerName,
      industry,
      cleaningTarget,
      cleanlinessStandard: cleanlinessStandard || undefined,
      throughput: throughput || undefined,
      specialRequirements: specialRequirements || undefined,
      budget: budget ? Number(budget) : undefined,
    });
  };

  const scoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 70) return "text-blue-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const scoreBg = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 70) return "bg-blue-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const severityLabel = (s: string) => {
    switch (s) { case "high": return "高"; case "medium": return "中"; case "low": return "低"; default: return s; }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={ClipboardCheck}
          title="AI需求智能分析"
          description="可行性评估 · 产品线推荐 · 技术参数 · 风险识别"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI分析
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              需求信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">项目名称</label>
                <Input placeholder="如: XX汽车零部件清洗线项目" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">客户名称</label>
                <Input placeholder="如: 某某汽车零部件有限公司" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">所属行业</label>
                <Select value={industry} onValueChange={(v) => setIndustry(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择行业" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">清洁度标准（可选）</label>
                <Select value={cleanlinessStandard || "__unspecified__"} onValueChange={(v) => setCleanlinessStandard(v === "__unspecified__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="不指定" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unspecified__">不指定</SelectItem>
                    {STANDARDS.filter((s) => s.value !== "").map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">清洗对象</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder="如: 铝合金压铸件，尺寸约200×150×80mm，含内孔和盲孔" value={cleaningTarget} onChange={(e) => setCleaningTarget(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">产能要求（可选）</label>
                <Input placeholder="如: 500件/天" value={throughput} onChange={(e) => setThroughput(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">预算（万元，可选）</label>
                <Input type="number" placeholder="如: 200" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">特殊需求（可选）</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder="如: 需要防爆设计、需兼容多种工件" value={specialRequirements} onChange={(e) => setSpecialRequirements(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!projectName.trim() || !customerName.trim() || !cleaningTarget.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI分析
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Feasibility Score + Product Line */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">可行性评分</p>
                    <p className={`text-5xl font-bold ${scoreColor(result.feasibilityScore)}`}>{result.feasibilityScore}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">推荐产品线</p>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-lg px-3 py-1">{result.recommendedProductLine}</Badge>
                  </div>
                </div>
                <div className="mt-3 w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${scoreBg(result.feasibilityScore)}`} style={{ width: `${result.feasibilityScore}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                  <span>预估成本: {result.costEstimate.min}~{result.costEstimate.max} 万元</span>
                </div>
              </CardContent>
            </Card>

            {/* Technical Specs */}
            {result.technicalSpecs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-5 w-5 text-primary" />
                    技术参数建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">参数</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">建议值</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">依据</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.technicalSpecs.map((spec, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{spec.parameter}</td>
                            <td className="py-2">{spec.recommendedValue}</td>
                            <td className="py-2 text-muted-foreground">{spec.rationale}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Flags */}
            {result.riskFlags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    风险标识
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.riskFlags.map((r, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded bg-muted/50">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{r.flag}</span>
                            <Badge className={severityColor(r.severity)}>{severityLabel(r.severity)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{r.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Clarification Needed */}
            {result.clarificationNeeded.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardCheck className="h-5 w-5 text-orange-400" />
                    需补充确认项
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.clarificationNeeded.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-orange-400 font-medium flex-shrink-0">{idx + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

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
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium flex-shrink-0">{idx + 1}.</span>
                        <span>{rec}</span>
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
