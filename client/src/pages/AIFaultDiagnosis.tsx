/**
 * AI故障诊断 (AI Fault Diagnosis)
 * Phase H: 故障诊断 · 根因分析 · 维修步骤 · 预防措施
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
  Stethoscope, Loader2, Sparkles, AlertTriangle, CheckCircle, Wrench, Shield,
} from "lucide-react";

const EQUIPMENT_MODELS = [
  { value: "碳氢真空清洗机", label: "碳氢真空清洗机" },
  { value: "水基清洗线", label: "水基清洗线" },
  { value: "超声波清洗机", label: "超声波清洗机" },
  { value: "定制设备", label: "定制设备" },
];

interface DiagnosisResult {
  diagnosis: string;
  confidence: number;
  rootCauses: Array<{ cause: string; probability: number; description: string }>;
  repairSteps: Array<{ step: number; description: string; estimatedTime: string; partsNeeded: string }>;
  urgency: string;
  preventiveMeasures: string[];
  recommendations: string[];
}

export default function AIFaultDiagnosis() {
  const { t } = useLanguage();
  const [equipmentModel, setEquipmentModel] = useState("碳氢真空清洗机");
  const [symptomDescription, setSymptomDescription] = useState("");
  const [errorCodes, setErrorCodes] = useState("");
  const [operatingConditions, setOperatingConditions] = useState("");
  const [lastMaintenanceDate, setLastMaintenanceDate] = useState("");
  const [equipmentAge, setEquipmentAge] = useState("");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);

  const mutation = trpc.rdServiceIntelligence.diagnoseFault.useMutation({
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
      setResult(taskQuery.data.result as unknown as DiagnosisResult);
      setTaskId(null);
    } else if (taskQuery.data?.taskStatus === "failed") {
      setResult(null);
      setTaskId(null);
    }
  }, [taskQuery.data]);

  const handleSubmit = () => {
    if (!symptomDescription.trim() || mutation.isPending || !!taskId) return;
    mutation.mutate({
      equipmentModel,
      symptomDescription,
      errorCodes: errorCodes || undefined,
      operatingConditions: operatingConditions || undefined,
      lastMaintenanceDate: lastMaintenanceDate || undefined,
      equipmentAge: equipmentAge ? Number(equipmentAge) : undefined,
    });
  };

  const urgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const urgencyLabel = (u: string) => {
    switch (u) { case "critical": return t("ai.faultDiag.urgencyCritical"); case "high": return t("ai.faultDiag.urgencyHigh"); case "medium": return t("ai.faultDiag.urgencyMedium"); case "low": return t("ai.faultDiag.urgencyLow"); default: return u; }
  };

  const confidenceColor = (c: number) => {
    if (c >= 80) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (c >= 60) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (c >= 40) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Stethoscope}
          title={t("ai.faultDiag.title")}
          description={t("ai.faultDiag.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("ai.faultDiag.aiDiagnose")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-5 w-5 text-primary" />
              {t("ai.faultDiag.faultInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.faultDiag.equipmentModel")}</label>
                <Select value={equipmentModel} onValueChange={(v) => setEquipmentModel(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.faultDiag.selectModel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.faultDiag.errorCodes")}</label>
                <Input placeholder="如: E-0012, ALM-VacuumLow" value={errorCodes} onChange={(e) => setErrorCodes(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("ai.faultDiag.symptomDescription")}</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder="如: 设备运行时真空度无法达到设定值，真空泵运行声音异常，偶尔伴有高温报警" value={symptomDescription} onChange={(e) => setSymptomDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("ai.faultDiag.operatingConditions")}</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder="如: 每天运行16小时，环境温度35℃，清洗介质为碳氢溶剂" value={operatingConditions} onChange={(e) => setOperatingConditions(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.faultDiag.lastMaintenanceDate")}</label>
                <Input type="date" value={lastMaintenanceDate} onChange={(e) => setLastMaintenanceDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.faultDiag.equipmentAge")}</label>
                <Input type="number" placeholder="如: 3" value={equipmentAge} onChange={(e) => setEquipmentAge(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!symptomDescription.trim() || mutation.isPending || !!taskId}>
                {mutation.isPending || !!taskId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("ai.faultDiag.aiDiagnose")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Diagnosis + Confidence + Urgency */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={urgencyColor(result.urgency)}>{urgencyLabel(result.urgency)}</Badge>
                      <Badge className={confidenceColor(result.confidence)}>{t("ai.faultDiag.confidence")} {result.confidence}%</Badge>
                    </div>
                  </div>
                  <div className="p-4 rounded bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">{t("ai.faultDiag.diagnosisConclusion")}</p>
                    <p className="font-medium">{result.diagnosis}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Root Causes */}
            {result.rootCauses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    {t("ai.faultDiag.rootCauseAnalysis")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.faultDiag.possibleCause")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.faultDiag.probability")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.faultDiag.explanation")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rootCauses.map((rc, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{rc.cause}</td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${rc.probability >= 60 ? "bg-red-500" : rc.probability >= 30 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${rc.probability}%` }} />
                                </div>
                                <span>{rc.probability}%</span>
                              </div>
                            </td>
                            <td className="py-2 text-muted-foreground">{rc.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Repair Steps */}
            {result.repairSteps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wrench className="h-5 w-5 text-primary" />
                    {t("ai.faultDiag.repairSteps")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.repairSteps.map((step) => (
                      <div key={step.step} className="flex gap-4 p-3 rounded bg-muted/50">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                          {step.step}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm">{step.description}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>{t("ai.faultDiag.estimatedTime")}: {step.estimatedTime}</span>
                            <span>{t("ai.faultDiag.partsNeeded")}: {step.partsNeeded}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preventive Measures */}
            {result.preventiveMeasures.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-5 w-5 text-blue-400" />
                    {t("ai.faultDiag.preventiveMeasures")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.preventiveMeasures.map((m, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>{m}</span>
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
                    {t("ai.faultDiag.aiSuggestions")}
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
