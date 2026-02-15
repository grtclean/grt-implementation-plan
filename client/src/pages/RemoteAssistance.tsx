/**
 * AI远程技术支持 (US-014)
 * 智能诊断引导 · 逐步排故指令 · 升级判断
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
  Headphones, Loader2, Sparkles, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, Eye, Wrench, ListChecks,
} from "lucide-react";

const EQUIPMENT_MODELS = [
  { value: "碳氢真空清洗机", label: "碳氢真空清洗机" },
  { value: "水基清洗线", label: "水基清洗线" },
  { value: "超声波清洗机", label: "超声波清洗机" },
  { value: "定制设备", label: "定制设备" },
];

const SKILL_LEVELS = [
  { value: "初级-需详细指导", label: "初级-需详细指导" },
  { value: "中级-有基本操作经验", label: "中级-有基本操作经验" },
  { value: "高级-有维修经验", label: "高级-有维修经验" },
];

interface RemoteAssistanceResult {
  sessionSummary: string;
  diagnosticSteps: Array<{
    step: number;
    instruction: string;
    expectedResult: string;
    ifFail: string;
  }>;
  visualGuides: Array<{
    component: string;
    location: string;
    action: string;
    caution: string;
  }>;
  escalationNeeded: boolean;
  escalationReason: string;
  partsToInspect: string[];
  recommendations: string[];
}

export default function RemoteAssistance() {
  const [equipmentModel, setEquipmentModel] = useState("碳氢真空清洗机");
  const [faultDescription, setFaultDescription] = useState("");
  const [customerSkillLevel, setCustomerSkillLevel] = useState("初级-需详细指导");
  const [availableTools, setAvailableTools] = useState("");
  const [previousAttempts, setPreviousAttempts] = useState("");
  const [result, setResult] = useState<RemoteAssistanceResult | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const mutation = trpc.serviceSalesAdvanced.guideRemoteAssistance.useMutation({
    onSuccess: (data) => setResult(data as RemoteAssistanceResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!faultDescription.trim() || mutation.isPending) return;
    mutation.mutate({
      equipmentModel,
      faultDescription,
      customerSkillLevel,
      availableTools: availableTools || undefined,
      previousAttempts: previousAttempts || undefined,
    });
  };

  const toggleStep = (step: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Headphones}
          title="AI远程技术支持"
          description="智能诊断引导 · 逐步排故指令 · 升级判断"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI远程支持
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Headphones className="h-5 w-5 text-primary" />
              远程支持信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">设备型号 *</label>
                <select
                  className="w-full bg-background border rounded px-3 py-2 text-sm"
                  value={equipmentModel}
                  onChange={(e) => setEquipmentModel(e.target.value)}
                >
                  {EQUIPMENT_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">客户技能水平 *</label>
                <select
                  className="w-full bg-background border rounded px-3 py-2 text-sm"
                  value={customerSkillLevel}
                  onChange={(e) => setCustomerSkillLevel(e.target.value)}
                >
                  {SKILL_LEVELS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">故障描述 *</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]"
                placeholder="描述设备故障现象"
                value={faultDescription}
                onChange={(e) => setFaultDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">客户现场可用工具（可选）</label>
              <Input
                placeholder="客户现场可用工具"
                value={availableTools}
                onChange={(e) => setAvailableTools(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">已尝试的排故方法（可选）</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                placeholder="已尝试的排故方法"
                value={previousAttempts}
                onChange={(e) => setPreviousAttempts(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!faultDescription.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI远程诊断
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Session Summary + Escalation Status */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {result.escalationNeeded ? (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        需现场派人
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        远程可解决
                      </Badge>
                    )}
                  </div>
                  <div className="p-4 rounded bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">会话摘要</p>
                    <p className="font-medium">{result.sessionSummary}</p>
                  </div>
                  {result.escalationNeeded && result.escalationReason && (
                    <div className="p-4 rounded bg-red-500/10 border border-red-500/20">
                      <p className="text-sm text-red-400 mb-1">升级原因</p>
                      <p className="text-sm">{result.escalationReason}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Diagnostic Steps */}
            {result.diagnosticSteps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="h-5 w-5 text-primary" />
                    诊断步骤
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.diagnosticSteps.map((ds) => (
                      <div key={ds.step} className="rounded border bg-muted/30">
                        <button
                          className="w-full flex items-center justify-between p-3 text-left"
                          onClick={() => toggleStep(ds.step)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                              {ds.step}
                            </div>
                            <span className="font-medium text-sm">{ds.instruction}</span>
                          </div>
                          {expandedSteps.has(ds.step) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                        </button>
                        {expandedSteps.has(ds.step) && (
                          <div className="px-3 pb-3 space-y-2 ml-11">
                            <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                              <p className="text-xs text-green-400 mb-0.5">预期结果</p>
                              <p className="text-sm">{ds.expectedResult}</p>
                            </div>
                            <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                              <p className="text-xs text-yellow-400 mb-0.5">若失败则</p>
                              <p className="text-sm">{ds.ifFail}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Visual Guides */}
            {result.visualGuides.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Eye className="h-5 w-5 text-blue-400" />
                    可视化指引
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">部件</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">位置</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">操作</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">注意事项</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.visualGuides.map((vg, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{vg.component}</td>
                            <td className="py-2">{vg.location}</td>
                            <td className="py-2">{vg.action}</td>
                            <td className="py-2 text-red-400">{vg.caution}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Parts to Inspect */}
            {result.partsToInspect.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wrench className="h-5 w-5 text-yellow-400" />
                    需检查部件
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.partsToInspect.map((part, idx) => (
                      <Badge key={idx} variant="outline">{part}</Badge>
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
    </Layout>
  );
}
