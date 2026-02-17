/**
 * SOP工艺卡片编辑器 (SOP Process Card Editor)
 * Phase 21 P0: US-005 — AI工序生成 · 参数表 · 质检点 · BOM关联
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Loader2, Sparkles, CheckCircle, Shield, Clock, Wrench, Package,
  AlertTriangle,
} from "lucide-react";

const CLEANING_METHODS = [
  { value: "碳氢真空清洗", label: "碳氢真空清洗" },
  { value: "水基清洗", label: "水基清洗" },
  { value: "超声波清洗", label: "超声波清洗" },
  { value: "组合清洗", label: "组合清洗" },
];

const PRODUCT_TYPES = [
  { value: "碳氢真空清洗机", label: "碳氢真空清洗机" },
  { value: "水基清洗线", label: "水基清洗线" },
  { value: "超声波清洗机", label: "超声波清洗机" },
  { value: "定制清洗设备", label: "定制清洗设备" },
];

interface ProcessCardResult {
  processName: string;
  totalSteps: number;
  estimatedCycleTime: string;
  steps: Array<{
    stepNumber: number;
    stepName: string;
    description: string;
    equipmentRequired: string;
    parameters: Array<{ name: string; value: string; unit: string; tolerance: string }>;
    qualityCheckpoint: { required: boolean; method: string; standard: string; acceptCriteria: string };
    safetyNotes: string;
    estimatedTime: string;
    bomMaterials: string[];
  }>;
  toolsRequired: string[];
  safetyWarnings: string[];
  recommendations: string[];
}

export default function SOPProcessCardEditor() {
  const [productType, setProductType] = useState("碳氢真空清洗机");
  const [workpieceDescription, setWorkpieceDescription] = useState("");
  const [cleaningMethod, setCleaningMethod] = useState("碳氢真空清洗");
  const [cleanlinessTarget, setCleanlinessTarget] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [batchSize, setBatchSize] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [result, setResult] = useState<ProcessCardResult | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const mutation = trpc.sopEditor.generateCard.useMutation({
    onSuccess: (data) => setResult(data as ProcessCardResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!workpieceDescription.trim() || !cleanlinessTarget.trim() || mutation.isPending) return;
    mutation.mutate({
      productType, workpieceDescription, cleaningMethod, cleanlinessTarget,
      materialType: materialType || undefined,
      batchSize: batchSize ? Number(batchSize) : undefined,
      specialRequirements: specialRequirements || undefined,
    });
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={FileText}
          title="SOP工艺卡片编辑器"
          description="AI工序生成 · 参数推荐 · 质检点绑定 · BOM物料关联"
          actions={<Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />AI生成</Badge>}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5 text-primary" />工艺需求输入</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">产品类型</label>
                <Select value={productType} onValueChange={(v) => setProductType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择产品类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">清洗方式</label>
                <Select value={cleaningMethod} onValueChange={(v) => setCleaningMethod(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择清洗方式" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLEANING_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">工件描述</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder="如: 铝合金发动机缸体，尺寸400×300×250mm，含油道和水道内腔" value={workpieceDescription} onChange={(e) => setWorkpieceDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">清洁度目标</label>
                <Input placeholder="如: ISO 16232 C级" value={cleanlinessTarget} onChange={(e) => setCleanlinessTarget(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">工件材料（可选）</label>
                <Input placeholder="如: ADC12铝合金" value={materialType} onChange={(e) => setMaterialType(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">批次数量（可选）</label>
                <Input type="number" placeholder="如: 50" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">特殊要求（可选）</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[40px]" placeholder="如: 需要防锈处理，内腔清洗需特别关注" value={specialRequirements} onChange={(e) => setSpecialRequirements(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!workpieceDescription.trim() || !cleanlinessTarget.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI生成工艺卡片
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <>
            {/* Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">工艺名称</p>
                    <p className="text-2xl font-bold">{result.processName}</p>
                  </div>
                  <div className="flex gap-3 text-center">
                    <div className="px-4 py-2 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground">工序数</p>
                      <p className="text-xl font-bold text-primary">{result.totalSteps}</p>
                    </div>
                    <div className="px-4 py-2 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground">总周期</p>
                      <p className="text-xl font-bold">{result.estimatedCycleTime}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Process Steps */}
            <div className="space-y-3">
              {result.steps.map((step) => (
                <Card key={step.stepNumber} className="cursor-pointer" onClick={() => setExpandedStep(expandedStep === step.stepNumber ? null : step.stepNumber)}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{step.stepName}</span>
                          {step.qualityCheckpoint.required && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">质检点</Badge>}
                          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1"><Clock className="h-3 w-3" />{step.estimatedTime}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>

                    {expandedStep === step.stepNumber && (
                      <div className="mt-4 pl-13 space-y-4 border-t pt-4">
                        {/* Equipment */}
                        <div className="flex items-start gap-2">
                          <Wrench className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div><p className="text-xs text-muted-foreground">设备要求</p><p className="text-sm">{step.equipmentRequired}</p></div>
                        </div>

                        {/* Parameters Table */}
                        {step.parameters.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">工艺参数</p>
                            <table className="w-full text-sm">
                              <thead><tr className="border-b text-xs"><th className="text-left py-1 text-muted-foreground">参数</th><th className="text-left py-1 text-muted-foreground">设定值</th><th className="text-left py-1 text-muted-foreground">单位</th><th className="text-left py-1 text-muted-foreground">公差</th></tr></thead>
                              <tbody>
                                {step.parameters.map((p, pi) => (
                                  <tr key={pi} className="border-b border-muted/30">
                                    <td className="py-1 font-medium">{p.name}</td>
                                    <td className="py-1">{p.value}</td>
                                    <td className="py-1 text-muted-foreground">{p.unit}</td>
                                    <td className="py-1 text-muted-foreground">{p.tolerance}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Quality Checkpoint */}
                        {step.qualityCheckpoint.required && (
                          <div className="p-3 rounded bg-blue-500/10 border border-blue-500/20">
                            <div className="flex items-center gap-1 text-xs text-blue-400 mb-1"><Shield className="h-3 w-3" />质检点</div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div><p className="text-muted-foreground">检测方法</p><p>{step.qualityCheckpoint.method}</p></div>
                              <div><p className="text-muted-foreground">标准</p><p>{step.qualityCheckpoint.standard}</p></div>
                              <div><p className="text-muted-foreground">合格标准</p><p>{step.qualityCheckpoint.acceptCriteria}</p></div>
                            </div>
                          </div>
                        )}

                        {/* BOM Materials */}
                        {step.bomMaterials.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div><p className="text-xs text-muted-foreground">关联物料</p>
                              <div className="flex flex-wrap gap-1 mt-1">{step.bomMaterials.map((m, mi) => (<Badge key={mi} variant="outline" className="text-xs">{m}</Badge>))}</div>
                            </div>
                          </div>
                        )}

                        {/* Safety */}
                        {step.safetyNotes && (
                          <div className="flex items-start gap-2 text-xs">
                            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5" />
                            <div><p className="text-muted-foreground">安全注意</p><p>{step.safetyNotes}</p></div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tools + Safety + Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.toolsRequired.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-5 w-5 text-primary" />所需工具</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">{result.toolsRequired.map((t, i) => (<Badge key={i} variant="outline">{t}</Badge>))}</div>
                  </CardContent>
                </Card>
              )}
              {result.safetyWarnings.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-5 w-5 text-red-400" />安全警告</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1">{result.safetyWarnings.map((w, i) => (<li key={i} className="flex items-start gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" /><span>{w}</span></li>))}</ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle className="h-5 w-5 text-primary" />AI建议</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">{result.recommendations.map((r, i) => (<li key={i} className="flex items-start gap-2 text-sm"><span className="text-primary font-medium flex-shrink-0">{i + 1}.</span><span>{r}</span></li>))}</ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
