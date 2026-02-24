/**
 * 客户自助报修门户 (Customer Self-Service Repair Portal)
 * Phase 21 P0: US-006 — 在线报修 · AI智能分诊 · 自助排查
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Ticket, Loader2, Sparkles, AlertTriangle, CheckCircle, Clock, Wrench,
  Package, BookOpen,
} from "lucide-react";

interface TriageResult {
  ticketCategory: string;
  priority: string;
  urgencyScore: number;
  possibleCauses: Array<{ cause: string; probability: number; description: string }>;
  selfHelpSteps: string[];
  knowledgeBaseMatches: Array<{ title: string; relevance: number; summary: string }>;
  estimatedResponseTime: string;
  recommendedAction: string;
  spareParts: Array<{ part: string; likelihood: string }>;
  recommendations: string[];
}

export default function CustomerRepairPortal() {
  const { t } = useLanguage();
  const [customerName, setCustomerName] = useState("");
  const [equipmentModel, setEquipmentModel] = useState("碳氢真空清洗机");
  const [serialNumber, setSerialNumber] = useState("");
  const [faultDescription, setFaultDescription] = useState("");
  const [errorCodes, setErrorCodes] = useState("");
  const [operatingEnvironment, setOperatingEnvironment] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("普通-功能受限");
  const [result, setResult] = useState<TriageResult | null>(null);

  const EQUIPMENT_MODELS = [
    { value: "碳氢真空清洗机", label: t("crm.repair.modelHydrocarbon") },
    { value: "水基清洗线", label: t("crm.repair.modelWaterBased") },
    { value: "超声波清洗机", label: t("crm.repair.modelUltrasonic") },
    { value: "定制设备", label: t("crm.repair.modelCustom") },
  ];

  const URGENCY_LEVELS = [
    { value: "紧急-停机", label: t("crm.repair.urgencyEmergency") },
    { value: "高-性能下降", label: t("crm.repair.urgencyHigh") },
    { value: "普通-功能受限", label: t("crm.repair.urgencyNormal") },
    { value: "低-咨询", label: t("crm.repair.urgencyLow") },
  ];

  const mutation = trpc.customerRepair.triage.useMutation({
    onSuccess: (data) => setResult(data as TriageResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!customerName.trim() || !faultDescription.trim() || mutation.isPending) return;
    mutation.mutate({
      customerName, equipmentModel,
      serialNumber: serialNumber || undefined,
      faultDescription,
      errorCodes: errorCodes || undefined,
      operatingEnvironment: operatingEnvironment || undefined,
      urgencyLevel: urgencyLevel || undefined,
    });
  };

  const priorityColor = (p: string) => {
    if (p.startsWith("P1")) return "bg-red-500/20 text-red-400 border-red-500/30";
    if (p.startsWith("P2")) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    if (p.startsWith("P3")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-green-500/20 text-green-400 border-green-500/30";
  };

  const likelihoodColor = (l: string) => {
    switch (l) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Ticket}
          title={t("crm.repair.title")}
          description={t("crm.repair.description")}
          actions={<Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />{t("crm.repair.aiTriage")}</Badge>}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Ticket className="h-5 w-5 text-primary" />{t("crm.repair.repairInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("crm.repair.customerName")}</label>
                <Input placeholder={t("crm.repair.customerPlaceholder")} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("crm.repair.equipmentModel")}</label>
                <Select value={equipmentModel} onValueChange={(v) => setEquipmentModel(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("crm.repair.selectModel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("crm.repair.serialNumber")}</label>
                <Input placeholder={t("crm.repair.serialPlaceholder")} value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("crm.repair.urgencyLevel")}</label>
                <Select value={urgencyLevel} onValueChange={(v) => setUrgencyLevel(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("crm.repair.selectUrgency")} />
                  </SelectTrigger>
                  <SelectContent>
                    {URGENCY_LEVELS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("crm.repair.faultDescription")}</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[100px]" placeholder={t("crm.repair.faultPlaceholder")} value={faultDescription} onChange={(e) => setFaultDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("crm.repair.errorCodes")}</label>
                <Input placeholder={t("crm.repair.errorCodesPlaceholder")} value={errorCodes} onChange={(e) => setErrorCodes(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("crm.repair.operatingEnv")}</label>
                <Input placeholder={t("crm.repair.operatingEnvPlaceholder")} value={operatingEnvironment} onChange={(e) => setOperatingEnvironment(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!customerName.trim() || !faultDescription.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("crm.repair.submitAndTriage")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <>
            {/* Triage Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={`text-lg px-3 py-1 ${priorityColor(result.priority)}`}>{result.priority}</Badge>
                    <Badge variant="outline">{result.ticketCategory}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end"><Clock className="h-3 w-3" />{t("crm.repair.estimatedResponse")}</p>
                    <p className="font-medium">{result.estimatedResponseTime}</p>
                  </div>
                </div>
                <div className="mt-3 p-3 rounded bg-muted/50">
                  <p className="text-sm"><span className="text-muted-foreground">{t("crm.repair.recommendedAction")}: </span>{result.recommendedAction}</p>
                </div>
              </CardContent>
            </Card>

            {/* Possible Causes */}
            {result.possibleCauses.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-5 w-5 text-yellow-400" />{t("crm.repair.possibleCauses")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.possibleCauses.map((c, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded bg-muted/50">
                        <div className="flex-shrink-0 w-12 text-center">
                          <p className="text-lg font-bold">{c.probability}%</p>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{c.cause}</p>
                          <p className="text-sm text-muted-foreground">{c.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Self-Help Steps */}
            {result.selfHelpSteps.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-5 w-5 text-blue-400" />{t("crm.repair.selfHelpSteps")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.selfHelpSteps.map((s, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">{i + 1}</div>
                        <p className="text-sm pt-1">{s}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Knowledge Base Matches */}
            {result.knowledgeBaseMatches.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-5 w-5 text-primary" />{t("crm.repair.knowledgeBase")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.knowledgeBaseMatches.map((kb, i) => (
                      <div key={i} className="p-3 rounded bg-muted/50">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{kb.title}</p>
                          <Badge variant="outline" className="text-xs">{t("crm.repair.matchRate")} {kb.relevance}%</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{kb.summary}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Spare Parts */}
            {result.spareParts.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Package className="h-5 w-5 text-orange-400" />{t("crm.repair.spareParts")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.spareParts.map((sp, i) => (
                      <Badge key={i} className={likelihoodColor(sp.likelihood)}>{sp.part}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle className="h-5 w-5 text-primary" />{t("crm.repair.aiRecommendations")}</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">{result.recommendations.map((r, i) => (<li key={i} className="flex items-start gap-2 text-sm"><span className="text-primary font-medium flex-shrink-0">{i + 1}.</span><span>{r}</span></li>))}</ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
  );
}
