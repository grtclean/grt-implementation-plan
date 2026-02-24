/**
 * BOM冻结→生产联动 (BOM Freeze Automation) — US-024
 * BOM冻结自动通知生产部门 · 排程任务创建 · 物料就绪检查
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Lock, Loader2, Sparkles, CheckCircle, AlertTriangle, Calendar, Users, Package, Mail,
} from "lucide-react";

interface BOMFreezeResult {
  notificationId: string;
  bomId: string;
  projectName: string;
  schedulingTask: {
    priority: string;
    suggestedStartDate: string;
    estimatedDuration: string;
    prerequisites: string[];
  };
  materialReadiness: Array<{
    material: string;
    status: string;
    leadTime: string;
    action: string;
  }>;
  longLeadItems: string[];
  notificationContent: string;
  recipients: Array<{
    role: string;
    name: string;
  }>;
  recommendations: string[];
}

export default function BOMFreezeAutomation() {
  const { t } = useLanguage();
  const [bomId, setBomId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [bomVersion, setBomVersion] = useState("");
  const [frozenBy, setFrozenBy] = useState("");
  const [materialCount, setMaterialCount] = useState("");
  const [criticalParts, setCriticalParts] = useState("");
  const [result, setResult] = useState<BOMFreezeResult | null>(null);

  const mutation = trpc.p2Automation.triggerBOMFreezeNotification.useMutation({
    onSuccess: (data) => setResult(data as BOMFreezeResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!bomId.trim() || !projectName.trim() || !bomVersion.trim() || !frozenBy.trim() || !materialCount || mutation.isPending) return;
    mutation.mutate({
      bomId,
      projectName,
      bomVersion,
      frozenBy,
      materialCount: Number(materialCount),
      criticalParts: criticalParts || undefined,
    });
  };

  const priorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
      case "高": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
      case "中": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low":
      case "低": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const materialStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "ready":
      case "就绪": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "ordering":
      case "订购中": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "critical":
      case "紧急": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const materialStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "ready": return t("manufacturing.bomFreeze.statusReady");
      case "ordering": return t("manufacturing.bomFreeze.statusOrdering");
      case "critical": return t("manufacturing.materialShortage.urgentLabel");
      default: return status;
    }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Lock}
          title={t("manufacturing.bomFreeze.productionLinkTitle")}
          description={t("manufacturing.bomFreeze.productionLinkDesc")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("manufacturing.bomFreeze.aiLinkage")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-5 w-5 text-primary" />
              {t("manufacturing.bomFreeze.freezeInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.bomFreeze.bomId")} *</label>
                <Input placeholder={t("manufacturing.bomFreeze.bomId")} value={bomId} onChange={(e) => setBomId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.bomFreeze.projectName")} *</label>
                <Input placeholder={t("manufacturing.bomFreeze.projectName")} value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.bomFreeze.bomVersion")} *</label>
                <Input placeholder={t("manufacturing.bomFreeze.bomVersionPlaceholder")} value={bomVersion} onChange={(e) => setBomVersion(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.bomFreeze.frozenBy")} *</label>
                <Input placeholder={t("manufacturing.bomFreeze.frozenBy")} value={frozenBy} onChange={(e) => setFrozenBy(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.bomFreeze.materialLineCount")} *</label>
                <Input type="number" placeholder={t("manufacturing.bomFreeze.materialLineCount")} value={materialCount} onChange={(e) => setMaterialCount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("manufacturing.bomFreeze.criticalLongLeadParts")}</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                placeholder={t("manufacturing.bomFreeze.criticalLongLeadParts")}
                value={criticalParts}
                onChange={(e) => setCriticalParts(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!bomId.trim() || !projectName.trim() || !bomVersion.trim() || !frozenBy.trim() || !materialCount || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("manufacturing.bomFreeze.triggerFreezeLinkage")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Notification ID + BOM Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("manufacturing.bomFreeze.notificationId")}</p>
                    <p className="text-3xl font-bold text-primary">{result.notificationId}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-sm">BOM: {result.bomId}</Badge>
                    <Badge variant="outline" className="text-sm">{result.projectName}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scheduling Task */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5 text-primary" />
                  {t("manufacturing.bomFreeze.schedulingTask")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">{t("manufacturing.bomFreeze.priority")}</p>
                    <Badge className={priorityColor(result.schedulingTask.priority)}>
                      {result.schedulingTask.priority}
                    </Badge>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">{t("manufacturing.bomFreeze.suggestedStartDate")}</p>
                    <p className="text-lg font-bold">{result.schedulingTask.suggestedStartDate}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">{t("manufacturing.bomFreeze.estimatedDuration")}</p>
                    <p className="text-lg font-bold">{result.schedulingTask.estimatedDuration}</p>
                  </div>
                </div>
                {result.schedulingTask.prerequisites.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t("manufacturing.bomFreeze.prerequisites")}</p>
                    <ul className="space-y-2">
                      {result.schedulingTask.prerequisites.map((prereq, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{prereq}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Material Readiness Table */}
            {result.materialReadiness.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-5 w-5 text-primary" />
                    {t("manufacturing.bomFreeze.materialReadiness")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">{t("manufacturing.bomFreeze.material")}</th>
                          <th className="text-left py-2 pr-4">{t("manufacturing.production.status")}</th>
                          <th className="text-left py-2 pr-4">{t("manufacturing.bomFreeze.deliveryTime")}</th>
                          <th className="text-left py-2">{t("manufacturing.bomFreeze.requiredAction")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.materialReadiness.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{item.material}</td>
                            <td className="py-2 pr-4">
                              <Badge className={materialStatusColor(item.status)}>{materialStatusLabel(item.status)}</Badge>
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">{item.leadTime}</td>
                            <td className="py-2">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Long Lead Items Warning */}
            {result.longLeadItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    {t("manufacturing.bomFreeze.longLeadWarning")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.longLeadItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm p-2 rounded border border-red-500/30 bg-red-500/5">
                        <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Notification Content Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-5 w-5 text-primary" />
                  {t("manufacturing.bomFreeze.notificationPreview")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded border bg-muted/10">
                  <div className="border-b pb-3 mb-3">
                    <p className="text-xs text-muted-foreground">{t("manufacturing.bomFreeze.sendNotification")}</p>
                    <p className="text-sm font-medium">{t("manufacturing.bomFreeze.freezeNotificationSubject")} - {result.projectName}</p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{result.notificationContent}</p>
                </div>
              </CardContent>
            </Card>

            {/* Recipients Table */}
            {result.recipients.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-primary" />
                    {t("manufacturing.bomFreeze.recipients")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">{t("manufacturing.bomFreeze.role")}</th>
                          <th className="text-left py-2">{t("manufacturing.bomFreeze.name")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.recipients.map((recipient, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{recipient.role}</td>
                            <td className="py-2">{recipient.name}</td>
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
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    {t("manufacturing.common.aiSuggestions")}
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
