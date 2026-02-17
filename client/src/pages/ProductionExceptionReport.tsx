/**
 * 生产异常上报 (Production Exception Report) — US-012
 * 异常智能分类 · 自动升级 · 根因假设 · 即时措施
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
  AlertTriangle, Loader2, Sparkles, CheckCircle, Users, Zap, Clock,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EXCEPTION_TYPES = [
  { value: "设备故障", label: "设备故障" },
  { value: "质量异常", label: "质量异常" },
  { value: "物料问题", label: "物料问题" },
  { value: "安全事件", label: "安全事件" },
  { value: "工艺偏差", label: "工艺偏差" },
  { value: "人员问题", label: "人员问题" },
];

interface ExceptionResult {
  exceptionId: string;
  classification: string;
  severity: string;
  escalationLevel: string;
  escalationTargets: Array<{
    role: string;
    name: string;
    reason: string;
  }>;
  immediateActions: string[];
  rootCauseHypothesis: Array<{
    cause: string;
    probability: number;
  }>;
  impactScope: string;
  estimatedDowntime: string;
  recommendations: string[];
}

export default function ProductionExceptionReport() {
  const [exceptionType, setExceptionType] = useState("设备故障");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [affectedOrders, setAffectedOrders] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [result, setResult] = useState<ExceptionResult | null>(null);

  const mutation = trpc.productionAdvanced.analyzeException.useMutation({
    onSuccess: (data) => setResult(data as ExceptionResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!description.trim() || !location.trim() || !reporterName.trim() || mutation.isPending) return;
    mutation.mutate({
      exceptionType,
      description,
      location,
      affectedOrders: affectedOrders || undefined,
      equipmentId: equipmentId || undefined,
      reporterName,
    });
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "major": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "minor": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const severityLabel = (s: string) => {
    switch (s) {
      case "critical": return "严重";
      case "major": return "重要";
      case "minor": return "轻微";
      default: return s;
    }
  };

  const escalationColor = (level: string) => {
    switch (level) {
      case "L3": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "L2": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "L1": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={AlertTriangle}
          title="生产异常上报"
          description="异常智能分类 · 自动升级 · 根因假设 · 即时措施"
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
              <AlertTriangle className="h-5 w-5 text-primary" />
              异常信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">异常类型 *</label>
                <Select value={exceptionType} onValueChange={(v) => setExceptionType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择异常类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXCEPTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">发生位置 *</label>
                <Input
                  placeholder="如: 2号车间-A3工位"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">异常描述 *</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]"
                placeholder="描述异常情况"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">影响的生产工单（可选）</label>
                <Input
                  placeholder="影响的生产工单"
                  value={affectedOrders}
                  onChange={(e) => setAffectedOrders(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">设备编号（可选）</label>
                <Input
                  placeholder="设备编号"
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">报告人姓名 *</label>
                <Input
                  placeholder="报告人姓名"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!description.trim() || !location.trim() || !reporterName.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                智能分析
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Exception ID + Classification + Severity + Escalation */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">异常编号</p>
                    <Badge className="text-lg px-3 py-1 mt-1 bg-primary/20 text-primary border-primary/30">
                      {result.exceptionId}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">分类</p>
                    <Badge className="text-lg px-3 py-1 mt-1 bg-muted">
                      {result.classification}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">严重性</p>
                    <Badge className={`text-lg px-3 py-1 mt-1 ${severityColor(result.severity)}`}>
                      {severityLabel(result.severity)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">升级级别</p>
                    <Badge className={`text-lg px-3 py-1 mt-1 ${escalationColor(result.escalationLevel)}`}>
                      {result.escalationLevel}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Escalation Targets */}
            {result.escalationTargets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-primary" />
                    升级通知对象
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">角色</th>
                          <th className="text-left py-2 pr-4">姓名</th>
                          <th className="text-left py-2">通知原因</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.escalationTargets.map((target, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{target.role}</td>
                            <td className="py-2 pr-4">{target.name}</td>
                            <td className="py-2 text-muted-foreground">{target.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Immediate Actions */}
            {result.immediateActions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    即时措施
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {result.immediateActions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="pt-0.5">{action}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Root Cause Hypotheses */}
            {result.rootCauseHypothesis.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                    根因假设
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.rootCauseHypothesis.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.cause}</span>
                        <span className="text-muted-foreground">{item.probability}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${item.probability >= 70 ? "bg-red-500" : item.probability >= 40 ? "bg-yellow-500" : "bg-blue-500"}`}
                          style={{ width: `${item.probability}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Impact Scope + Estimated Downtime */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">影响范围</p>
                      <p className="font-medium mt-1">{result.impactScope}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">预计停机时间</p>
                      <p className="text-2xl font-bold text-red-400 mt-1">{result.estimatedDowntime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

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
