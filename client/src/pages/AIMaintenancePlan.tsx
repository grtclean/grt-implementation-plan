/**
 * AI预防性维护 (AI Preventive Maintenance)
 * Phase H: 健康评分 · 维护计划 · 备件管理 · 成本预估
 */
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wrench, Loader2, Sparkles, AlertTriangle, CheckCircle, Package, Calendar,
} from "lucide-react";

const EQUIPMENT_MODELS = [
  { value: "碳氢真空清洗机", label: "碳氢真空清洗机" },
  { value: "水基清洗线", label: "水基清洗线" },
  { value: "超声波清洗机", label: "超声波清洗机" },
  { value: "定制设备", label: "定制设备" },
];

const ENVIRONMENT_CONDITIONS = [
  { value: "标准", label: "标准" },
  { value: "恶劣", label: "恶劣" },
  { value: "洁净室", label: "洁净室" },
];

const USAGE_INTENSITIES = [
  { value: "轻度", label: "轻度" },
  { value: "正常", label: "正常" },
  { value: "高强度", label: "高强度" },
];

interface MaintenanceResult {
  healthScore: number;
  nextMaintenanceDate: string;
  maintenancePlan: Array<{ item: string; interval: string; nextDue: string; priority: string; estimatedCost: number }>;
  sparePartsNeeded: Array<{ part: string; quantity: number; leadTime: string }>;
  riskAssessment: string;
  costForecast: number;
  recommendations: string[];
}

export default function AIMaintenancePlan() {
  const { t } = useLanguage();
  const [equipmentModel, setEquipmentModel] = useState("碳氢真空清洗机");
  const [installDate, setInstallDate] = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [lastMaintenanceDate, setLastMaintenanceDate] = useState("");
  const [maintenanceHistory, setMaintenanceHistory] = useState("");
  const [environmentCondition, setEnvironmentCondition] = useState("标准");
  const [usageIntensity, setUsageIntensity] = useState("正常");
  const [result, setResult] = useState<MaintenanceResult | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);

  const mutation = trpc.rdServiceIntelligence.planMaintenance.useMutation({
    onSuccess: (data) => setTaskId(data.taskId),
    onError: () => setResult(null),
  });

  const taskQuery = trpc.rdServiceIntelligence.getTaskResult.useQuery(
    { taskId: taskId! },
    {
      enabled: !!taskId,
      refetchInterval: (query) =>
        query.state.data?.taskStatus === "completed" || query.state.data?.taskStatus === "failed"
          ? false
          : 2000,
    },
  );

  useEffect(() => {
    if (taskQuery.data?.taskStatus === "completed" && taskQuery.data.result) {
      setResult(taskQuery.data.result as unknown as MaintenanceResult);
      setTaskId(null);
    } else if (taskQuery.data?.taskStatus === "failed") {
      setResult(null);
      setTaskId(null);
    }
  }, [taskQuery.data]);

  const handleSubmit = () => {
    if (!installDate || !operatingHours || !lastMaintenanceDate || mutation.isPending || !!taskId) return;
    mutation.mutate({
      equipmentModel,
      installDate,
      operatingHours: Number(operatingHours),
      lastMaintenanceDate,
      maintenanceHistory: maintenanceHistory || undefined,
      environmentCondition: environmentCondition || undefined,
      usageIntensity: usageIntensity || undefined,
    });
  };

  const healthColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 70) return "text-blue-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const healthBg = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 70) return "bg-blue-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const healthLabel = (score: number) => {
    if (score >= 90) return "健康";
    if (score >= 70) return "良好";
    if (score >= 50) return "注意";
    return "警告";
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const priorityLabel = (p: string) => {
    switch (p) { case "high": return "高"; case "medium": return "中"; case "low": return "低"; default: return p; }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Wrench}
          title="AI预防性维护"
          description="健康评分 · 维护计划 · 备件管理 · 成本预估"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI规划
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-5 w-5 text-primary" />
              设备信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">设备型号</label>
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
                <label className="text-sm text-muted-foreground">环境条件</label>
                <Select value={environmentCondition} onValueChange={(v) => setEnvironmentCondition(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择环境条件" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENT_CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">使用强度</label>
                <Select value={usageIntensity} onValueChange={(v) => setUsageIntensity(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择使用强度" />
                  </SelectTrigger>
                  <SelectContent>
                    {USAGE_INTENSITIES.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">安装日期</label>
                <Input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">运行工时（小时）</label>
                <Input type="number" placeholder="如: 5000" value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">上次维护日期</label>
                <Input type="date" value={lastMaintenanceDate} onChange={(e) => setLastMaintenanceDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">维护历史（可选）</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder="如: 2025-06更换真空泵油，2025-09更换密封件" value={maintenanceHistory} onChange={(e) => setMaintenanceHistory(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!installDate || !operatingHours || !lastMaintenanceDate || mutation.isPending || !!taskId}>
                {mutation.isPending || !!taskId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI规划
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Health Score */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">设备健康度</p>
                    <div className="flex items-baseline gap-2">
                      <p className={`text-5xl font-bold ${healthColor(result.healthScore)}`}>{result.healthScore}</p>
                      <Badge className={`${result.healthScore >= 90 ? "bg-green-500/20 text-green-400" : result.healthScore >= 70 ? "bg-blue-500/20 text-blue-400" : result.healthScore >= 50 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                        {healthLabel(result.healthScore)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">下次维护</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium">{result.nextMaintenanceDate}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">年度维护预算: <span className="font-medium text-foreground">{result.costForecast}万元</span></p>
                  </div>
                </div>
                <div className="mt-3 w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${healthBg(result.healthScore)}`} style={{ width: `${result.healthScore}%` }} />
                </div>
              </CardContent>
            </Card>

            {/* Maintenance Plan */}
            {result.maintenancePlan.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wrench className="h-5 w-5 text-primary" />
                    维护计划
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">维护项目</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">周期</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">下次到期</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">优先级</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">预估费用(万)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.maintenancePlan.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{item.item}</td>
                            <td className="py-2">{item.interval}</td>
                            <td className="py-2">{item.nextDue}</td>
                            <td className="py-2"><Badge className={priorityColor(item.priority)}>{priorityLabel(item.priority)}</Badge></td>
                            <td className="py-2 text-right">{item.estimatedCost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Spare Parts */}
            {result.sparePartsNeeded.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-5 w-5 text-blue-400" />
                    备件需求
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">备件名称</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">数量</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">采购周期</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.sparePartsNeeded.map((part, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{part.part}</td>
                            <td className="py-2">{part.quantity}</td>
                            <td className="py-2">{part.leadTime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  风险评估
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{result.riskAssessment}</p>
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
