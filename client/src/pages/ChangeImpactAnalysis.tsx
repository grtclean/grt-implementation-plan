/**
 * 工程变更影响分析 (Engineering Change Impact Analysis)
 * Phase D: AI驱动 · 变更链追溯 · 影响范围评估
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  GitBranch, Loader2, AlertTriangle, CheckCircle, Clock,
  Package, ShoppingCart, Calendar, DollarSign, Shield, Sparkles,
} from "lucide-react";

const CHANGE_TYPES = [
  { value: "design_change", label: "设计变更" },
  { value: "bom_change", label: "BOM变更" },
  { value: "process_change", label: "工艺变更" },
  { value: "supplier_change", label: "供应商变更" },
];

interface ImpactArea {
  area: string;
  severity: string;
  description: string;
}

interface AffectedItem {
  type: string;
  name: string;
  impact: string;
}

interface AnalysisResult {
  impactAreas: ImpactArea[];
  affectedItems: AffectedItem[];
  recommendations: string[];
  riskScore: number;
  estimatedEffort: string;
}

const AREA_ICONS: Record<string, typeof Package> = {
  BOM: Package,
  PO: ShoppingCart,
  Schedule: Calendar,
  Cost: DollarSign,
  Quality: Shield,
};

export default function ChangeImpactAnalysis() {
  const [changeType, setChangeType] = useState("design_change");
  const [changeDescription, setChangeDescription] = useState("");
  const [affectedComponent, setAffectedComponent] = useState("");
  const [projectId, setProjectId] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzeMutation = trpc.projectIntelligence.analyzeChangeImpact.useMutation({
    onSuccess: (data) => setResult(data as AnalysisResult),
    onError: () => setResult(null),
  });

  const handleAnalyze = () => {
    if (!changeDescription.trim() || analyzeMutation.isPending) return;
    analyzeMutation.mutate({
      changeType,
      changeDescription,
      affectedComponent: affectedComponent || undefined,
      projectId: projectId || undefined,
    });
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const severityLabel = (severity: string) => {
    switch (severity) {
      case "high": return "高";
      case "medium": return "中";
      case "low": return "低";
      default: return severity;
    }
  };

  const riskColor = (score: number) => {
    if (score >= 75) return "text-red-400";
    if (score >= 50) return "text-yellow-400";
    if (score >= 25) return "text-blue-400";
    return "text-green-400";
  };

  const riskBg = (score: number) => {
    if (score >= 75) return "bg-red-500";
    if (score >= 50) return "bg-yellow-500";
    if (score >= 25) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={GitBranch}
          title="工程变更影响分析"
          description="AI驱动 · 变更链追溯 · 影响范围评估"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI分析
            </Badge>
          }
        />

        {/* Input form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-5 w-5 text-primary" />
              变更信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">变更类型</label>
                <select
                  className="w-full bg-background border rounded px-3 py-2 text-sm"
                  value={changeType}
                  onChange={(e) => setChangeType(e.target.value)}
                >
                  {CHANGE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">影响组件（可选）</label>
                <Input
                  placeholder="如: 清洗泵、超声波振板..."
                  value={affectedComponent}
                  onChange={(e) => setAffectedComponent(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">变更描述</label>
              <Textarea
                placeholder="描述变更内容，例如：将清洗腔体材质从304不锈钢变更为316L不锈钢，以满足客户耐腐蚀要求..."
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">关联项目（可选）</label>
              <Input
                placeholder="如: IC-2000"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleAnalyze}
                disabled={!changeDescription.trim() || analyzeMutation.isPending}
              >
                {analyzeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                分析影响
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Risk score gauge */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">风险评分</p>
                    <p className={`text-5xl font-bold ${riskColor(result.riskScore)}`}>
                      {result.riskScore}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">预估工作量</p>
                      <p className="font-medium">{result.estimatedEffort}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${riskBg(result.riskScore)}`}
                    style={{ width: `${result.riskScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Impact areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.impactAreas.map((area, idx) => {
                const Icon = AREA_ICONS[area.area] || AlertTriangle;
                return (
                  <Card key={idx} className={`border ${severityColor(area.severity).replace("bg-", "border-").split(" ")[0]}/30`}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{area.area}</span>
                        </div>
                        <Badge className={severityColor(area.severity)}>
                          {severityLabel(area.severity)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{area.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Affected items */}
            {result.affectedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">受影响项目</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.affectedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                        <Badge variant="outline">{item.type}</Badge>
                        <span className="font-medium text-sm">{item.name}</span>
                        <span className="text-sm text-muted-foreground ml-auto">{item.impact}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-green-400" />
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
    </Layout>
  );
}
