/**
 * 工单→知识库转化 (US-020)
 * 一键将已解决工单转化为知识库文章 · 自动提取关键字和标签
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
  BookOpen, Loader2, Sparkles, CheckCircle, Shield, AlertTriangle, Lightbulb, Wrench,
} from "lucide-react";

const EQUIPMENT_MODELS = [
  { value: "碳氢真空清洗机", label: "碳氢真空清洗机" },
  { value: "水基清洗线", label: "水基清洗线" },
  { value: "超声波清洗机", label: "超声波清洗机" },
  { value: "定制设备", label: "定制设备" },
];

interface KBResult {
  articleTitle: string;
  summary: string;
  symptoms: string[];
  rootCause: string;
  solutionSteps: Array<{ step: number; description: string; notes: string }>;
  preventionTips: string[];
  tags: string[];
  applicableModels: string[];
  difficulty: string;
  estimatedTime: string;
  recommendations: string[];
}

export default function TicketToKnowledgeBase() {
  const [ticketId, setTicketId] = useState("");
  const [ticketTitle, setTicketTitle] = useState("");
  const [faultDescription, setFaultDescription] = useState("");
  const [resolution, setResolution] = useState("");
  const [equipmentModel, setEquipmentModel] = useState("碳氢真空清洗机");
  const [resolvedBy, setResolvedBy] = useState("");
  const [result, setResult] = useState<KBResult | null>(null);

  const mutation = trpc.p2Automation.convertTicketToKB.useMutation({
    onSuccess: (data) => setResult(data as KBResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!ticketId.trim() || !ticketTitle.trim() || !faultDescription.trim() || !resolution.trim() || mutation.isPending) return;
    mutation.mutate({
      ticketId,
      ticketTitle,
      faultDescription,
      resolution,
      equipmentModel,
      resolvedBy: resolvedBy || undefined,
    });
  };

  const difficultyColor = (d: string) => {
    switch (d) {
      case "高级": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "中级": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "初级": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={BookOpen}
          title="工单→知识库转化"
          description="一键将已解决工单转化为知识库文章 · 自动提取关键字和标签"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI转化
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-primary" />
              工单信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">工单编号 *</label>
                <Input placeholder="如: TK-2026-0123" value={ticketId} onChange={(e) => setTicketId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">工单标题 *</label>
                <Input placeholder="如: 碳氢清洗机真空度不达标" value={ticketTitle} onChange={(e) => setTicketTitle(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">故障描述 *</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder="如: 设备启动后真空泵运转正常，但真空度始终无法达到-0.095MPa的设定值，最高只能达到-0.06MPa" value={faultDescription} onChange={(e) => setFaultDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">解决方案 *</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder="如: 检查发现真空管路密封圈老化，更换密封圈后真空度恢复正常" value={resolution} onChange={(e) => setResolution(e.target.value)} />
            </div>
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
                <label className="text-sm text-muted-foreground">处理人（可选）</label>
                <Input placeholder="如: 张工" value={resolvedBy} onChange={(e) => setResolvedBy(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!ticketId.trim() || !ticketTitle.trim() || !faultDescription.trim() || !resolution.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI转化
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Article Title + Summary */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold mb-2">{result.articleTitle}</h2>
                <p className="text-sm text-muted-foreground mb-4">{result.summary}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className={difficultyColor(result.difficulty)}>难度: {result.difficulty}</Badge>
                  <Badge variant="outline">预计耗时: {result.estimatedTime}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Symptoms */}
            {result.symptoms.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    故障症状
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.symptoms.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Root Cause */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-5 w-5 text-orange-400" />
                  根本原因
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded bg-orange-500/10 border border-orange-500/20">
                  <p className="font-medium text-sm">{result.rootCause}</p>
                </div>
              </CardContent>
            </Card>

            {/* Solution Steps */}
            {result.solutionSteps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wrench className="h-5 w-5 text-primary" />
                    解决步骤
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.solutionSteps.map((step) => (
                      <div key={step.step} className="flex gap-4 p-3 rounded bg-muted/50">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                          {step.step}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm">{step.description}</p>
                          {step.notes && (
                            <p className="text-xs text-muted-foreground">备注: {step.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prevention Tips */}
            {result.preventionTips.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-5 w-5 text-blue-400" />
                    预防建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.preventionTips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Shield className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tags + Applicable Models */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">标签</p>
                    <div className="flex flex-wrap gap-2">
                      {result.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">适用设备</p>
                    <div className="flex flex-wrap gap-2">
                      {result.applicableModels.map((model, idx) => (
                        <Badge key={idx} variant="outline">{model}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
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
