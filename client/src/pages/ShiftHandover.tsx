/**
 * 数字化交接班 (Digital Shift Handover)
 * Phase 21 P0: US-004 — 结构化表单 · AI风险分析 · 任务接续
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RefreshCw, Loader2, Sparkles, AlertTriangle, CheckCircle, Shield, Clock,
} from "lucide-react";

interface HandoverResult {
  riskLevel: string;
  riskItems: Array<{ item: string; severity: string; description: string; suggestedAction: string }>;
  keyAttentionPoints: string[];
  continuityCheck: Array<{ task: string; status: string; handoverNote: string }>;
  safetyReminders: string[];
  equipmentStatusSummary: string;
  recommendations: string[];
}

export default function ShiftHandover() {
  const { t } = useLanguage();

  const SHIFTS = [
    { value: "白班 (8:00-17:00)", label: t("manufacturing.shift.dayShift") + " (8:00-17:00)" },
    { value: "夜班 (17:00-次日8:00)", label: t("manufacturing.shift.nightShiftFull") + " (17:00-8:00)" },
    { value: "早班 (6:00-14:00)", label: t("manufacturing.shift.morningShift") + " (6:00-14:00)" },
    { value: "中班 (14:00-22:00)", label: t("manufacturing.shift.afternoonShift") + " (14:00-22:00)" },
    { value: "晚班 (22:00-次日6:00)", label: t("manufacturing.shift.nightShift") + " (22:00-6:00)" },
  ];

  const [currentShift, setCurrentShift] = useState("白班 (8:00-17:00)");
  const [nextShift, setNextShift] = useState("夜班 (17:00-次日8:00)");
  const [handoverPerson, setHandoverPerson] = useState("");
  const [productionOutput, setProductionOutput] = useState("");
  const [equipmentStatus, setEquipmentStatus] = useState("");
  const [qualityIssues, setQualityIssues] = useState("");
  const [abnormalEvents, setAbnormalEvents] = useState("");
  const [pendingTasks, setPendingTasks] = useState("");
  const [safetyNotes, setSafetyNotes] = useState("");
  const [materialStatus, setMaterialStatus] = useState("");
  const [result, setResult] = useState<HandoverResult | null>(null);

  const mutation = trpc.shiftHandover.analyze.useMutation({
    onSuccess: (data) => setResult(data as HandoverResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!handoverPerson.trim() || !productionOutput.trim() || !equipmentStatus.trim() || !pendingTasks.trim() || mutation.isPending) return;
    mutation.mutate({
      currentShift, nextShift, handoverPerson, productionOutput, equipmentStatus,
      qualityIssues: qualityIssues || undefined,
      abnormalEvents: abnormalEvents || undefined,
      pendingTasks,
      safetyNotes: safetyNotes || undefined,
      materialStatus: materialStatus || undefined,
    });
  };

  const riskLevelColor = (level: string) => {
    switch (level) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };
  const riskLevelLabel = (l: string) => {
    switch (l) { case "high": return t("manufacturing.shift.riskHigh"); case "medium": return t("manufacturing.shift.riskMedium"); case "low": return t("manufacturing.shift.riskLow"); default: return l; }
  };
  const severityColor = (s: string) => {
    switch (s) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };
  const severityLabel = (s: string) => {
    switch (s) { case "high": return t("manufacturing.shift.severityHigh"); case "medium": return t("manufacturing.shift.severityMedium"); case "low": return t("manufacturing.shift.severityLow"); default: return s; }
  };
  const taskStatusColor = (s: string) => {
    switch (s) {
      case "completed": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "in_progress": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "pending": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "blocked": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };
  const taskStatusLabel = (s: string) => {
    switch (s) { case "completed": return t("manufacturing.shift.taskCompleted"); case "in_progress": return t("manufacturing.shift.taskInProgress"); case "pending": return t("manufacturing.shift.taskPending"); case "blocked": return t("manufacturing.shift.taskBlocked"); default: return s; }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={RefreshCw}
          title={t("manufacturing.shift.digitalHandoverTitle")}
          description={t("manufacturing.shift.digitalHandoverDesc")}
          actions={<Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />{t("manufacturing.common.aiAnalysis")}</Badge>}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><RefreshCw className="h-5 w-5 text-primary" />{t("manufacturing.shift.handoverInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.shift.currentShift")}</label>
                <Select value={currentShift} onValueChange={(v) => setCurrentShift(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("manufacturing.shift.selectShift")} />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.shift.nextShift")}</label>
                <Select value={nextShift} onValueChange={(v) => setNextShift(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("manufacturing.shift.selectShift")} />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.shift.handoverPerson")}</label>
                <Input placeholder={t("manufacturing.shift.handoverPersonPlaceholder")} value={handoverPerson} onChange={(e) => setHandoverPerson(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.shift.productionOutput")}</label>
                <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder={t("manufacturing.shift.productionOutputPlaceholder")} value={productionOutput} onChange={(e) => setProductionOutput(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.shift.equipmentStatus")}</label>
                <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder={t("manufacturing.shift.equipmentStatusPlaceholder")} value={equipmentStatus} onChange={(e) => setEquipmentStatus(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("manufacturing.shift.pendingUnfinishedTasks")}</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder={t("manufacturing.shift.pendingTasksPlaceholder")} value={pendingTasks} onChange={(e) => setPendingTasks(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.shift.qualityIssuesOptional")}</label>
                <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder={t("manufacturing.shift.qualityIssuesPlaceholder")} value={qualityIssues} onChange={(e) => setQualityIssues(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.shift.abnormalEventsOptional")}</label>
                <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder={t("manufacturing.shift.abnormalEventsPlaceholder")} value={abnormalEvents} onChange={(e) => setAbnormalEvents(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.shift.safetyNotesOptional")}</label>
                <Input placeholder={t("manufacturing.shift.safetyNotesPlaceholder")} value={safetyNotes} onChange={(e) => setSafetyNotes(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.shift.materialStatusOptional")}</label>
                <Input placeholder={t("manufacturing.shift.materialStatusPlaceholder")} value={materialStatus} onChange={(e) => setMaterialStatus(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!handoverPerson.trim() || !productionOutput.trim() || !equipmentStatus.trim() || !pendingTasks.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("manufacturing.shift.aiAnalyzeHandover")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("manufacturing.shift.handoverRiskLevel")}</p>
                    <Badge className={`text-xl px-4 py-2 mt-1 ${riskLevelColor(result.riskLevel)}`}>{riskLevelLabel(result.riskLevel)}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{t("manufacturing.shift.equipmentStatusSummary")}</p>
                    <p className="text-sm mt-1">{result.equipmentStatusSummary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {result.riskItems.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-5 w-5 text-yellow-400" />{t("manufacturing.shift.riskItems")} ({result.riskItems.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.riskItems.map((r, i) => (
                      <div key={i} className="p-3 rounded bg-muted/50 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{r.item}</span>
                          <Badge className={severityColor(r.severity)}>{severityLabel(r.severity)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{r.description}</p>
                        <p className="text-sm text-primary">{t("manufacturing.shift.suggestion")}: {r.suggestedAction}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {result.continuityCheck.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="h-5 w-5 text-blue-400" />{t("manufacturing.shift.taskContinuityCheck")}</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left py-2 text-muted-foreground">{t("manufacturing.shift.task")}</th><th className="text-center py-2 text-muted-foreground">{t("manufacturing.production.status")}</th><th className="text-left py-2 text-muted-foreground">{t("manufacturing.shift.handoverNote")}</th></tr></thead>
                    <tbody>
                      {result.continuityCheck.map((item, i) => (
                        <tr key={i} className="border-b border-muted/50">
                          <td className="py-2 font-medium">{item.task}</td>
                          <td className="py-2 text-center"><Badge className={taskStatusColor(item.status)}>{taskStatusLabel(item.status)}</Badge></td>
                          <td className="py-2 text-muted-foreground">{item.handoverNote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {result.safetyReminders.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Shield className="h-5 w-5 text-red-400" />{t("manufacturing.shift.safetyReminders")}</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">{result.safetyReminders.map((s, i) => (<li key={i} className="flex items-start gap-2 text-sm"><Shield className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" /><span>{s}</span></li>))}</ul>
                </CardContent>
              </Card>
            )}

            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle className="h-5 w-5 text-primary" />{t("manufacturing.common.aiSuggestions")}</CardTitle></CardHeader>
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
