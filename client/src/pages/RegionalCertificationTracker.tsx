/**
 * 区域认证管理 (Regional Certification Tracker)
 * CE/UL/CCC 区域认证追踪 · 差距分析 · 时间线规划 · 文档清单
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Award, Loader2, Sparkles, CheckCircle, FileText, Clock, AlertTriangle,
  ListChecks, FlaskConical,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EQUIPMENT_MODELS = [
  { value: "碳氢真空清洗机", label: "碳氢真空清洗机" },
  { value: "水基清洗线", label: "水基清洗线" },
  { value: "超声波清洗机", label: "超声波清洗机" },
  { value: "定制设备", label: "定制设备" },
];

const DESIGN_PHASES = [
  { value: "概念", label: "概念" },
  { value: "详细设计", label: "详细设计" },
  { value: "BOM确认", label: "BOM确认" },
  { value: "原型", label: "原型" },
  { value: "量产", label: "量产" },
];

interface CertificationResult {
  requiredCerts: Array<{ certName: string; region: string; standard: string; status: string }>;
  certificationGaps: Array<{ cert: string; gap: string; action: string }>;
  timeline: { totalWeeks: number; phases: Array<{ phase: string; weeks: number; description: string }> };
  estimatedCost: string;
  documentChecklist: Array<{ document: string; required: boolean; status: string }>;
  testingRequirements: Array<{ test: string; lab: string; duration: string }>;
  recommendations: string[];
}

export default function RegionalCertificationTracker() {
  // Form state
  const [equipmentModel, setEquipmentModel] = useState("碳氢真空清洗机");
  const [targetMarkets, setTargetMarkets] = useState("");
  const [currentCerts, setCurrentCerts] = useState("");
  const [designPhase, setDesignPhase] = useState("概念");

  // Result state
  const [result, setResult] = useState<CertificationResult | null>(null);

  // Mutation
  const mutation = trpc.regionalCompliance.assessRegionalCertification.useMutation({
    onSuccess: (data) => setResult(data as CertificationResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!targetMarkets.trim() || mutation.isPending) return;
    mutation.mutate({
      equipmentModel,
      targetMarkets,
      currentCerts: currentCerts || undefined,
      designPhase,
    });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "已获得": case "pass": case "通过": case "已完成": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "进行中": case "pending": case "待验证": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "缺失": case "fail": case "不通过": case "未开始": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "即将过期": case "warning": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const docStatusColor = (status: string) => {
    switch (status) {
      case "已准备": case "完成": return "text-green-400";
      case "进行中": case "部分完成": return "text-blue-400";
      case "未准备": case "缺失": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Award}
          title="区域认证管理"
          description="CE/UL/CCC 区域认证追踪 · 差距分析 · 时间线规划 · 文档清单"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI认证
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-5 w-5 text-primary" />
              认证评估信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">设备型号 *</label>
                <Select value={equipmentModel} onValueChange={(v) => setEquipmentModel(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择设备型号" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">设计阶段 *</label>
                <Select value={designPhase} onValueChange={(v) => setDesignPhase(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择设计阶段" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGN_PHASES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">目标市场 *</label>
              <Input placeholder="目标市场, 如: CN, EU, US" value={targetMarkets} onChange={(e) => setTargetMarkets(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">已有认证</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder="已有认证, 如: CE-2024, CCC..." value={currentCerts} onChange={(e) => setCurrentCerts(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!targetMarkets.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI认证评估
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Required Certifications Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-5 w-5 text-primary" />
                  所需认证 ({result.requiredCerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium text-muted-foreground">认证名称</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">适用区域</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">标准</th>
                        <th className="text-center py-2 font-medium text-muted-foreground">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.requiredCerts.map((cert, idx) => (
                        <tr key={idx} className="border-b border-muted/50">
                          <td className="py-2 font-medium">{cert.certName}</td>
                          <td className="py-2">{cert.region}</td>
                          <td className="py-2 text-muted-foreground">{cert.standard}</td>
                          <td className="py-2 text-center">
                            <Badge className={statusColor(cert.status)}>{cert.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Certification Gaps */}
            {result.certificationGaps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    认证差距分析 ({result.certificationGaps.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">认证</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">差距</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">行动计划</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.certificationGaps.map((gap, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{gap.cert}</td>
                            <td className="py-2 text-muted-foreground">{gap.gap}</td>
                            <td className="py-2">{gap.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5 text-primary" />
                  认证时间线
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">预计总周期</p>
                  <p className="text-3xl font-bold text-primary">{result.timeline.totalWeeks} 周</p>
                </div>
                <div className="space-y-3">
                  {result.timeline.phases.map((phase, idx) => {
                    const percentage = result.timeline.totalWeeks > 0
                      ? Math.round((phase.weeks / result.timeline.totalWeeks) * 100)
                      : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{phase.phase}</span>
                          <span className="text-muted-foreground">{phase.weeks} 周</span>
                        </div>
                        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/70 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{phase.description}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Estimated Cost */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">预估认证费用</p>
                  <p className="text-4xl font-bold text-primary">{result.estimatedCost}</p>
                </div>
              </CardContent>
            </Card>

            {/* Document Checklist */}
            {result.documentChecklist.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="h-5 w-5 text-primary" />
                    文档清单
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.documentChecklist.map((doc, idx) => (
                      <li key={idx} className="flex items-center justify-between text-sm py-1 border-b border-muted/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`h-4 w-4 flex-shrink-0 ${docStatusColor(doc.status)}`} />
                          <span className="font-medium">{doc.document}</span>
                          {doc.required && (
                            <Badge variant="outline" className="text-xs">必需</Badge>
                          )}
                        </div>
                        <span className={`text-xs ${docStatusColor(doc.status)}`}>{doc.status}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Testing Requirements */}
            {result.testingRequirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FlaskConical className="h-5 w-5 text-primary" />
                    测试要求
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">测试项目</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">测试机构</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">预计周期</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.testingRequirements.map((test, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{test.test}</td>
                            <td className="py-2">{test.lab}</td>
                            <td className="py-2 text-muted-foreground">{test.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5 text-primary" />
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
