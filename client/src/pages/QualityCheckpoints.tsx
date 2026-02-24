import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Camera,
  Plus, BarChart3, Eye, Wrench, Trash2, FileWarning
} from "lucide-react";

const PROCESS_CODES = Array.from({ length: 15 }, (_, i) => `T${i + 1}`);
const CHECK_TYPE_KEYS: Record<string, string> = {
  visual_inspection: "quality.checkpoints.checkTypeVisual",
  ccd_detection: "quality.checkpoints.checkTypeCCD",
  dimensional_check: "quality.checkpoints.checkTypeDimension",
  functional_test: "quality.checkpoints.checkTypeFunction",
  pressure_test: "quality.checkpoints.checkTypePressure",
  cleanliness_test: "quality.checkpoints.checkTypeCleanliness",
};
const CHECK_TYPE_ICONS: Record<string, typeof Eye> = {
  visual_inspection: Eye,
  ccd_detection: Camera,
  dimensional_check: BarChart3,
  functional_test: Wrench,
  pressure_test: ShieldCheck,
  cleanliness_test: ShieldCheck,
};
const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500 text-white",
  major: "bg-orange-500 text-white",
  minor: "bg-yellow-500 text-black",
  cosmetic: "bg-blue-500 text-white",
};
const RESULT_COLORS: Record<string, string> = {
  pass: "bg-green-100 text-green-800 border-green-300",
  fail: "bg-red-100 text-red-800 border-red-300",
  conditional_pass: "bg-yellow-100 text-yellow-800 border-yellow-300",
  pending: "bg-gray-100 text-gray-800 border-gray-300",
};

export default function QualityCheckpoints() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedProject] = useState("PRJ-2026-001");
  const [selectedProcess, setSelectedProcess] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showDefectDialog, setShowDefectDialog] = useState(false);

  // Form states
  const [newCheckpoint, setNewCheckpoint] = useState({
    checkpointName: "", checkpointType: "visual_inspection" as any,
    description: "", acceptanceCriteria: "", isMandatory: true, processCode: "T1",
  });
  const [newResult, setNewResult] = useState({
    checkpointId: 0, result: "pending" as any, score: 0,
    remarks: "", processCode: "T1",
  });
  const [newDefect, setNewDefect] = useState({
    checkResultId: 0, defectType: "surface" as any, severity: "minor" as any,
    description: "", rootCause: "", correctiveAction: "",
  });

  // Queries
  const dashboardQuery = trpc.qualityMaterialPerformance.qualityDashboard.useQuery(
    { projectId: selectedProject },
    { enabled: activeTab === "dashboard" }
  );
  const checkpointsQuery = trpc.qualityMaterialPerformance.getCheckpoints.useQuery(
    { projectId: selectedProject, processCode: selectedProcess === "all" ? undefined : selectedProcess },
    { enabled: activeTab === "checkpoints" }
  );
  const resultsQuery = trpc.qualityMaterialPerformance.getResults.useQuery(
    { projectId: selectedProject, processCode: selectedProcess === "all" ? undefined : selectedProcess },
    { enabled: activeTab === "results" }
  );
  const defectsQuery = trpc.qualityMaterialPerformance.getDefects.useQuery(
    { projectId: selectedProject, processCode: selectedProcess === "all" ? undefined : selectedProcess },
    { enabled: activeTab === "defects" }
  );

  // Mutations
  const createCheckpointMut = trpc.qualityMaterialPerformance.createCheckpoint.useMutation({
    onSuccess: () => {
      toast({ title: t("quality.checkpoints.createSuccess") });
      setShowCreateDialog(false);
      checkpointsQuery.refetch();
    },
  });
  const submitResultMut = trpc.qualityMaterialPerformance.submitResult.useMutation({
    onSuccess: () => {
      toast({ title: t("quality.checkpoints.resultSubmitted") });
      setShowResultDialog(false);
      resultsQuery.refetch();
      dashboardQuery.refetch();
    },
  });
  const createDefectMut = trpc.qualityMaterialPerformance.createDefect.useMutation({
    onSuccess: () => {
      toast({ title: t("quality.checkpoints.defectRecorded") });
      setShowDefectDialog(false);
      defectsQuery.refetch();
      dashboardQuery.refetch();
    },
  });
  const analyzeCCDMut = trpc.qualityMaterialPerformance.analyzeCCD.useMutation({
    onSuccess: (data) => {
      toast({ title: t("quality.checkpoints.ccdAnalysisComplete"), description: `${t("quality.checkpoints.result")}: ${data?.overallResult}, ${t("quality.checkpoints.score")}: ${data?.score}` });
    },
  });

  const dashboard = dashboardQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={ShieldCheck}
        title={t("quality.checkpoints.title")}
        description={t("quality.checkpoints.description")}
        actions={
          <Select value={selectedProcess} onValueChange={setSelectedProcess}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t("quality.checkpoints.selectProcess")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("quality.checkpoints.allProcesses")}</SelectItem>
              {PROCESS_CODES.map(code => (
                <SelectItem key={code} value={code}>{code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="dashboard">{t("quality.checkpoints.tabDashboard")}</TabsTrigger>
          <TabsTrigger value="checkpoints">{t("quality.checkpoints.tabCheckpoints")}</TabsTrigger>
          <TabsTrigger value="results">{t("quality.checkpoints.tabResults")}</TabsTrigger>
          <TabsTrigger value="defects">{t("quality.checkpoints.tabDefects")}</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={CheckCircle2} label={t("quality.checkpoints.passed")} value={dashboard?.results?.pass_count || 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
            <StatCard icon={XCircle} label={t("quality.checkpoints.failed")} value={dashboard?.results?.fail_count || 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
            <StatCard icon={AlertTriangle} label={t("quality.checkpoints.pendingDefects")} value={dashboard?.defects?.open_count || 0} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
            <StatCard icon={BarChart3} label={t("quality.checkpoints.avgScore")} value={dashboard?.results?.avg_score ? Math.round(Number(dashboard.results.avg_score)) : 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          </div>

          {/* Pass Rate by Process */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("quality.checkpoints.yieldByProcess")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(dashboard?.processPassRates as any[] || []).map((p: any) => (
                  <div key={p.process_code} className="flex items-center gap-4">
                    <span className="w-10 font-mono font-bold text-sm">{p.process_code}</span>
                    <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${Number(p.pass_rate) >= 90 ? 'bg-green-500' : Number(p.pass_rate) >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${p.pass_rate}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-sm">{p.pass_rate}%</span>
                    <span className="w-20 text-right text-xs text-muted-foreground">{p.passed}/{p.total}</span>
                  </div>
                ))}
                {(!dashboard?.processPassRates || (dashboard.processPassRates as any[]).length === 0) && (
                  <p className="text-center text-muted-foreground py-8">{t("quality.checkpoints.noCheckData")}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Defect Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("quality.checkpoints.defectDistribution")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(dashboard?.defectTypeDistribution as any[] || []).map((d: any) => (
                  <div key={d.defect_type} className="p-3 bg-muted rounded-lg text-center">
                    <div className="text-xl font-bold">{d.count}</div>
                    <div className="text-xs text-muted-foreground capitalize">{d.defect_type}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checkpoints Tab */}
        <TabsContent value="checkpoints" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t("quality.checkpoints.checkpointList")}</h3>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />{t("quality.checkpoints.addCheckpoint")}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t("quality.checkpoints.createCheckpoint")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t("quality.checkpoints.processStep")}</Label>
                      <Select value={newCheckpoint.processCode} onValueChange={v => setNewCheckpoint(p => ({ ...p, processCode: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROCESS_CODES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("quality.checkpoints.checkType")}</Label>
                      <Select value={newCheckpoint.checkpointType} onValueChange={v => setNewCheckpoint(p => ({ ...p, checkpointType: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CHECK_TYPE_KEYS).map(([val, key]) => <SelectItem key={val} value={val}>{t(key)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>{t("quality.checkpoints.checkpointName")}</Label>
                    <Input value={newCheckpoint.checkpointName} onChange={e => setNewCheckpoint(p => ({ ...p, checkpointName: e.target.value }))} placeholder={t("quality.checkpoints.checkpointNamePlaceholder")} />
                  </div>
                  <div>
                    <Label>{t("quality.checkpoints.acceptCriteria")}</Label>
                    <Textarea value={newCheckpoint.acceptanceCriteria} onChange={e => setNewCheckpoint(p => ({ ...p, acceptanceCriteria: e.target.value }))} placeholder={t("quality.checkpoints.acceptCriteriaPlaceholder")} />
                  </div>
                  <div>
                    <Label>{t("quality.checkpoints.descField")}</Label>
                    <Textarea value={newCheckpoint.description} onChange={e => setNewCheckpoint(p => ({ ...p, description: e.target.value }))} placeholder={t("quality.checkpoints.descPlaceholder")} />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createCheckpointMut.mutate({ ...newCheckpoint, projectId: selectedProject })}
                    disabled={createCheckpointMut.isPending || !newCheckpoint.checkpointName}
                  >
                    {createCheckpointMut.isPending ? t("quality.checkpoints.creating") : t("quality.checkpoints.createCheckpoint")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {(checkpointsQuery.data as any[] || []).map((cp: any) => (
              <Card key={cp.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="font-mono">{cp.process_code}</Badge>
                    <div>
                      <div className="font-medium">{cp.checkpoint_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {CHECK_TYPE_KEYS[cp.checkpoint_type] ? t(CHECK_TYPE_KEYS[cp.checkpoint_type]) : cp.checkpoint_type}
                        {cp.is_mandatory && <Badge variant="destructive" className="ml-2 text-xs">{t("quality.checkpoints.mandatory")}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      setNewResult(p => ({ ...p, checkpointId: cp.id, processCode: cp.process_code }));
                      setShowResultDialog(true);
                    }}>
                      <CheckCircle2 className="w-4 h-4 mr-1" />{t("quality.checkpoints.submitResult")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!checkpointsQuery.data || (checkpointsQuery.data as any[]).length === 0) && (
              <p className="text-center text-muted-foreground py-8">{t("quality.checkpoints.noCheckpoints")}</p>
            )}
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <h3 className="text-lg font-semibold">{t("quality.checkpoints.resultList")}</h3>
          <div className="space-y-3">
            {(resultsQuery.data as any[] || []).map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">{r.process_code}</Badge>
                      <span className="font-medium">{r.checkpoint_name}</span>
                      <Badge className={RESULT_COLORS[r.result] || ""}>
                        {r.result === 'pass' ? t("quality.checkpoints.resultPass") : r.result === 'fail' ? t("quality.checkpoints.resultFail") : r.result === 'conditional_pass' ? t("quality.checkpoints.resultConditional") : t("quality.checkpoints.resultPending")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      {r.score && <span className="font-mono text-sm">{t("quality.checkpoints.scoreLabel")} {r.score}</span>}
                      {r.defect_count > 0 && (
                        <Badge variant="destructive">{r.defect_count}{t("quality.checkpoints.defectCount")}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {r.inspector_name || t("quality.checkpoints.unknown")} · {new Date(Number(r.checked_at)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {r.remarks && <p className="text-sm text-muted-foreground mt-2">{r.remarks}</p>}
                </CardContent>
              </Card>
            ))}
            {(!resultsQuery.data || (resultsQuery.data as any[]).length === 0) && (
              <p className="text-center text-muted-foreground py-8">{t("quality.checkpoints.noResults")}</p>
            )}
          </div>
        </TabsContent>

        {/* Defects Tab */}
        <TabsContent value="defects" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t("quality.checkpoints.defectList")}</h3>
            <Button onClick={() => setShowDefectDialog(true)}>
              <FileWarning className="w-4 h-4 mr-2" />{t("quality.checkpoints.recordDefect")}
            </Button>
          </div>
          <div className="space-y-3">
            {(defectsQuery.data as any[] || []).map((d: any) => (
              <Card key={d.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">{d.process_code}</Badge>
                      <Badge className={SEVERITY_COLORS[d.severity] || ""}>
                        {d.severity === 'critical' ? t("quality.checkpoints.severityCritical") : d.severity === 'major' ? t("quality.checkpoints.severityMajor") : d.severity === 'minor' ? t("quality.checkpoints.severityMinor") : t("quality.checkpoints.severityCosmetic")}
                      </Badge>
                      <span className="capitalize text-sm">{d.defect_type}</span>
                    </div>
                    <Badge variant={d.status === 'open' ? 'destructive' : d.status === 'resolved' ? 'default' : 'secondary'}>
                      {d.status === 'open' ? t("quality.checkpoints.defectOpen") : d.status === 'in_progress' ? t("quality.checkpoints.defectProcessing") : d.status === 'resolved' ? t("quality.checkpoints.defectResolved") : t("quality.checkpoints.defectClosed")}
                    </Badge>
                  </div>
                  <p className="text-sm mt-2">{d.description}</p>
                  {d.root_cause && <p className="text-xs text-muted-foreground mt-1">{t("quality.checkpoints.rootCauseLabel")} {d.root_cause}</p>}
                  {d.corrective_action && <p className="text-xs text-muted-foreground">{t("quality.checkpoints.correctiveLabel")} {d.corrective_action}</p>}
                </CardContent>
              </Card>
            ))}
            {(!defectsQuery.data || (defectsQuery.data as any[]).length === 0) && (
              <p className="text-center text-muted-foreground py-8">{t("quality.checkpoints.noDefects")}</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Submit Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("quality.checkpoints.submitResultDialog")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("quality.checkpoints.result")}</Label>
              <Select value={newResult.result} onValueChange={v => setNewResult(p => ({ ...p, result: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">{t("quality.checkpoints.resultPass")}</SelectItem>
                  <SelectItem value="fail">{t("quality.checkpoints.resultFail")}</SelectItem>
                  <SelectItem value="conditional_pass">{t("quality.checkpoints.resultConditional")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("quality.checkpoints.score")} (0-100)</Label>
              <Input type="number" min={0} max={100} value={newResult.score} onChange={e => setNewResult(p => ({ ...p, score: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>{t("quality.checkpoints.remarkField")}</Label>
              <Textarea value={newResult.remarks} onChange={e => setNewResult(p => ({ ...p, remarks: e.target.value }))} />
            </div>
            <Button
              className="w-full"
              onClick={() => submitResultMut.mutate({
                checkpointId: newResult.checkpointId,
                projectId: selectedProject,
                processCode: newResult.processCode,
                result: newResult.result,
                score: newResult.score,
                remarks: newResult.remarks,
              })}
              disabled={submitResultMut.isPending}
            >
              {submitResultMut.isPending ? t("quality.checkpoints.submitting") : t("quality.checkpoints.submitResult")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Defect Dialog */}
      <Dialog open={showDefectDialog} onOpenChange={setShowDefectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("quality.checkpoints.recordDefectDialog")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("quality.checkpoints.defectType")}</Label>
                <Select value={newDefect.defectType} onValueChange={v => setNewDefect(p => ({ ...p, defectType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dimensional">{t("quality.checkpoints.typeDimension")}</SelectItem>
                    <SelectItem value="surface">{t("quality.checkpoints.typeSurface")}</SelectItem>
                    <SelectItem value="functional">{t("quality.checkpoints.typeFunction")}</SelectItem>
                    <SelectItem value="assembly">{t("quality.checkpoints.typeAssembly")}</SelectItem>
                    <SelectItem value="material">{t("quality.checkpoints.typeMaterial")}</SelectItem>
                    <SelectItem value="cleanliness">{t("quality.checkpoints.typeCleanliness")}</SelectItem>
                    <SelectItem value="other">{t("quality.checkpoints.typeOther")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("quality.checkpoints.defectSeverity")}</Label>
                <Select value={newDefect.severity} onValueChange={v => setNewDefect(p => ({ ...p, severity: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">{t("quality.checkpoints.severityCritical")}</SelectItem>
                    <SelectItem value="major">{t("quality.checkpoints.severityMajor")}</SelectItem>
                    <SelectItem value="minor">{t("quality.checkpoints.severityMinor")}</SelectItem>
                    <SelectItem value="cosmetic">{t("quality.checkpoints.severityCosmetic")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("quality.checkpoints.defectDesc")}</Label>
              <Textarea value={newDefect.description} onChange={e => setNewDefect(p => ({ ...p, description: e.target.value }))} placeholder={t("quality.checkpoints.defectDescPlaceholder")} />
            </div>
            <div>
              <Label>{t("quality.checkpoints.defectRootCause")}</Label>
              <Input value={newDefect.rootCause} onChange={e => setNewDefect(p => ({ ...p, rootCause: e.target.value }))} placeholder={t("quality.checkpoints.rootCausePlaceholder")} />
            </div>
            <div>
              <Label>{t("quality.checkpoints.defectCorrectiveAction")}</Label>
              <Textarea value={newDefect.correctiveAction} onChange={e => setNewDefect(p => ({ ...p, correctiveAction: e.target.value }))} placeholder={t("quality.checkpoints.correctiveActionPlaceholder")} />
            </div>
            <Button
              className="w-full"
              onClick={() => createDefectMut.mutate({
                checkResultId: newDefect.checkResultId || 1,
                projectId: selectedProject,
                processCode: selectedProcess === "all" ? "T1" : selectedProcess,
                ...newDefect,
              })}
              disabled={createDefectMut.isPending || !newDefect.description}
            >
              {createDefectMut.isPending ? t("quality.checkpoints.recording") : t("quality.checkpoints.recordDefect")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
