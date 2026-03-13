import { useState, useMemo } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Cpu, Camera, AlertTriangle, CheckCircle2, XCircle, Clock,
  RefreshCw, Play, Pause, Settings, Activity, Eye, Zap,
  ArrowRight, Shield, BarChart3
} from "lucide-react";

const PROCESS_NAMES: Record<string, string> = {
  T1: '机加工', T2: '冷作', T3: '机械部件装配', T4: '机械装配', T5: '机械总装',
  T6: '电气装配', T7: '设备调试', T8: '跑和', T9: '包装', T10: '发货',
  T11: '卸车', T12: '就位', T13: '水电气连接', T14: '现场调试', T15: '终验收',
};

const STATUS_STYLE_KEYS: Record<string, { bg: string; text: string; key: string }> = {
  active: { bg: "bg-green-500/20", text: "text-green-400", key: "manufacturing.ccd.statusActive" },
  paused: { bg: "bg-yellow-500/20", text: "text-yellow-400", key: "manufacturing.ccd.statusPaused" },
  error: { bg: "bg-red-500/20", text: "text-red-400", key: "manufacturing.ccd.statusError" },
  offline: { bg: "bg-gray-500/20", text: "text-gray-400", key: "manufacturing.ccd.statusOffline" },
};

export default function CcdIntegration() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("bridge");
  const [selectedProject] = useState("PRJ-2026-001");
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Form states
  const [configForm, setConfigForm] = useState({
    processCode: "T4",
    ccdDeviceId: "",
    autoTriggerEnabled: true,
    defectThresholdCritical: 1,
    defectThresholdMajor: 3,
    defectThresholdMinor: 10,
  });
  const [submitForm, setSubmitForm] = useState({
    processCode: "T4",
    ccdDeviceId: "CCD-001",
    defectsFound: 0,
    criticalDefects: 0,
    majorDefects: 0,
    minorDefects: 0,
    imageUrl: "",
    notes: "",
  });

  // Queries
  const bridgeConfigsQuery = (trpc.ccdIntegration as any).getBridgeConfigs.useQuery({
    projectId: selectedProject,
  });
  const inspectionLogsQuery = (trpc.ccdIntegration as any).getInspectionLogs.useQuery({
    projectId: selectedProject,
    limit: 50,
  });
  const statsQuery = trpc.ccdIntegration.getStats.useQuery({
    projectId: selectedProject,
  });

  // Mutations
  const createConfigMutation = (trpc.ccdIntegration as any).createBridgeConfig.useMutation({
    onSuccess: () => {
      toast({ title: t("manufacturing.ccd.success"), description: t("manufacturing.ccd.configCreated") });
      bridgeConfigsQuery.refetch();
      setShowConfigDialog(false);
    },
    onError: (err) => toast({ title: t("manufacturing.ccd.error"), description: err.message, variant: "destructive" }),
  });
  const submitResultMutation = (trpc.ccdIntegration as any).submitInspectionResult.useMutation({
    onSuccess: (data) => {
      const msg = data.interlockTriggered
        ? `${t("manufacturing.ccd.interlockMsg")}${data.lockedProcesses?.join(', ')}`
        : t("manufacturing.ccd.noInterlockMsg");
      toast({ title: data.interlockTriggered ? t("manufacturing.ccd.interlockAlert") : t("manufacturing.ccd.success"), description: msg });
      inspectionLogsQuery.refetch();
      statsQuery.refetch();
      setShowSubmitDialog(false);
    },
    onError: (err) => toast({ title: t("manufacturing.ccd.error"), description: err.message, variant: "destructive" }),
  });
  const toggleConfigMutation = (trpc.ccdIntegration as any).toggleBridgeConfig.useMutation({
    onSuccess: () => {
      toast({ title: t("manufacturing.ccd.success"), description: t("manufacturing.ccd.configUpdated") });
      bridgeConfigsQuery.refetch();
    },
    onError: (err) => toast({ title: t("manufacturing.ccd.error"), description: err.message, variant: "destructive" }),
  });

  const configs = (bridgeConfigsQuery.data ?? []) as any[];
  const logs = (inspectionLogsQuery.data ?? []) as any[];
  const stats = (statsQuery.data ?? {}) as any;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Cpu}
        title={t("manufacturing.ccd.title")}
        description={t("manufacturing.ccd.description")}
        actions={
          <>
            <Button variant="outline" onClick={() => { bridgeConfigsQuery.refetch(); inspectionLogsQuery.refetch(); statsQuery.refetch(); }}>
              <RefreshCw className="w-4 h-4 mr-2" /> {t("manufacturing.ccd.refresh")}
            </Button>
            <Button onClick={() => setShowSubmitDialog(true)} className="bg-cyan-600 hover:bg-cyan-700">
              <Camera className="w-4 h-4 mr-2" /> {t("manufacturing.ccd.submitResult")}
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Activity} label={t("manufacturing.ccd.activeBridges")} value={stats.activeConfigs ?? 0} iconColor="text-cyan-400" iconBg="bg-cyan-500/20" />
        <StatCard icon={CheckCircle2} label={t("manufacturing.ccd.totalInspections")} value={stats.totalInspections ?? 0} iconColor="text-green-400" iconBg="bg-green-500/20" />
        <StatCard icon={AlertTriangle} label={t("manufacturing.ccd.interlockTriggered")} value={stats.interlockTriggered ?? 0} iconColor="text-red-400" iconBg="bg-red-500/20" />
        <StatCard icon={BarChart3} label={t("manufacturing.ccd.passRate")} value={stats.passRate ? `${Number(stats.passRate).toFixed(1)}%` : 'N/A'} iconColor="text-primary" iconBg="bg-primary/20" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="bridge"><Settings className="w-4 h-4 mr-1" /> {t("manufacturing.ccd.tabBridge")}</TabsTrigger>
          <TabsTrigger value="logs"><Eye className="w-4 h-4 mr-1" /> {t("manufacturing.ccd.tabLogs")}</TabsTrigger>
        </TabsList>

        {/* Bridge Configs Tab */}
        <TabsContent value="bridge" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t("manufacturing.ccd.bridgeConfigs")}</h3>
            <Button onClick={() => setShowConfigDialog(true)} size="sm">
              <Zap className="w-4 h-4 mr-1" /> {t("manufacturing.ccd.newBridge")}
            </Button>
          </div>

          {configs.length === 0 ? (
            <Card className="bg-card/30 border-dashed border-border">
              <CardContent className="p-8 text-center">
                <Cpu className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{t("manufacturing.ccd.emptyBridge")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configs.map((cfg: any) => {
                const status = cfg.is_active ? STATUS_STYLE_KEYS.active : STATUS_STYLE_KEYS.paused;
                return (
                  <Card key={cfg.id} className="bg-card/50 border-border hover:border-cyan-500/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-cyan-400" />
                          {cfg.ccd_device_id || t("manufacturing.ccd.unnamedDevice")}
                        </CardTitle>
                        <Badge className={`${status.bg} ${status.text} border-0`}>{t(status.key)}</Badge>
                      </div>
                      <CardDescription>
                        {t("manufacturing.ccd.process")}: {cfg.process_code} ({PROCESS_NAMES[cfg.process_code] || cfg.process_code})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-red-500/10 rounded p-2 text-center">
                          <p className="text-muted-foreground">{t("manufacturing.ccd.criticalThreshold")}</p>
                          <p className="font-bold text-red-400">{cfg.defect_threshold_critical}</p>
                        </div>
                        <div className="bg-orange-500/10 rounded p-2 text-center">
                          <p className="text-muted-foreground">{t("manufacturing.ccd.majorThreshold")}</p>
                          <p className="font-bold text-orange-400">{cfg.defect_threshold_major}</p>
                        </div>
                        <div className="bg-yellow-500/10 rounded p-2 text-center">
                          <p className="text-muted-foreground">{t("manufacturing.ccd.minorThreshold")}</p>
                          <p className="font-bold text-yellow-400">{cfg.defect_threshold_minor}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => toggleConfigMutation.mutate({
                            configId: cfg.id,
                            isActive: !cfg.is_active,
                          })}
                        >
                          {cfg.is_active ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                          {cfg.is_active ? t("manufacturing.ccd.pause") : t("manufacturing.ccd.enable")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Inspection Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <h3 className="text-lg font-semibold">{t("manufacturing.ccd.inspectionLogs")}</h3>
          {logs.length === 0 ? (
            <Card className="bg-card/30 border-dashed border-border">
              <CardContent className="p-8 text-center">
                <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{t("manufacturing.ccd.emptyLogs")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {logs.map((log: any) => (
                <Card key={log.id} className="bg-card/50 border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${log.interlock_triggered ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                          {log.interlock_triggered
                            ? <AlertTriangle className="w-4 h-4 text-red-400" />
                            : <CheckCircle2 className="w-4 h-4 text-green-400" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {log.process_code} ({PROCESS_NAMES[log.process_code] || ''}) · {log.ccd_device_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("manufacturing.ccd.defects")}: {log.defects_found} ({t("manufacturing.ccd.critical")}:{log.critical_defects} / {t("manufacturing.ccd.major")}:{log.major_defects} / {t("manufacturing.ccd.minor")}:{log.minor_defects})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {log.interlock_triggered ? (
                          <Badge className="bg-red-500/20 text-red-400 border-0">{t("manufacturing.ccd.interlockTriggeredBadge")}</Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-400 border-0">{t("manufacturing.ccd.normalPass")}</Badge>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.created_at ? new Date(Number(log.created_at)).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                    {log.interlock_action && (
                      <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-300">
                        <Shield className="w-3 h-3 inline mr-1" />
                        {t("manufacturing.ccd.interlockAction")}: {log.interlock_action}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("manufacturing.ccd.createConfigDialog")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("manufacturing.ccd.processLabel")}</Label>
              <Select value={configForm.processCode} onValueChange={(v) => setConfigForm(p => ({ ...p, processCode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROCESS_NAMES).map(([code, name]) => (
                    <SelectItem key={code} value={code}>{code} - {name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("manufacturing.ccd.ccdDeviceId")}</Label>
              <Input value={configForm.ccdDeviceId} onChange={(e) => setConfigForm(p => ({ ...p, ccdDeviceId: e.target.value }))} placeholder={t("manufacturing.ccd.ccdDevicePlaceholder")} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">{t("manufacturing.ccd.criticalThreshold")}</Label>
                <Input type="number" value={configForm.defectThresholdCritical} onChange={(e) => setConfigForm(p => ({ ...p, defectThresholdCritical: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs">{t("manufacturing.ccd.majorThreshold")}</Label>
                <Input type="number" value={configForm.defectThresholdMajor} onChange={(e) => setConfigForm(p => ({ ...p, defectThresholdMajor: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs">{t("manufacturing.ccd.minorThreshold")}</Label>
                <Input type="number" value={configForm.defectThresholdMinor} onChange={(e) => setConfigForm(p => ({ ...p, defectThresholdMinor: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("manufacturing.ccd.cancel")}</Button></DialogClose>
            <Button
              onClick={() => createConfigMutation.mutate({
                projectId: selectedProject,
                processCode: configForm.processCode,
                ccdDeviceId: configForm.ccdDeviceId,
                autoTriggerEnabled: configForm.autoTriggerEnabled,
                defectThresholdCritical: configForm.defectThresholdCritical,
                defectThresholdMajor: configForm.defectThresholdMajor,
                defectThresholdMinor: configForm.defectThresholdMinor,
              })}
              disabled={createConfigMutation.isPending || !configForm.ccdDeviceId}
            >
              {createConfigMutation.isPending ? t("manufacturing.ccd.creating") : t("manufacturing.ccd.createConfig")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Inspection Result Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("manufacturing.ccd.submitDialog")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("manufacturing.ccd.processLabel")}</Label>
                <Select value={submitForm.processCode} onValueChange={(v) => setSubmitForm(p => ({ ...p, processCode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROCESS_NAMES).map(([code, name]) => (
                      <SelectItem key={code} value={code}>{code} - {name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("manufacturing.ccd.ccdDevice")}</Label>
                <Input value={submitForm.ccdDeviceId} onChange={(e) => setSubmitForm(p => ({ ...p, ccdDeviceId: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-red-400">{t("manufacturing.ccd.criticalDefects")}</Label>
                <Input type="number" min={0} value={submitForm.criticalDefects} onChange={(e) => setSubmitForm(p => ({ ...p, criticalDefects: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs text-orange-400">{t("manufacturing.ccd.majorDefects")}</Label>
                <Input type="number" min={0} value={submitForm.majorDefects} onChange={(e) => setSubmitForm(p => ({ ...p, majorDefects: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs text-yellow-400">{t("manufacturing.ccd.minorDefects")}</Label>
                <Input type="number" min={0} value={submitForm.minorDefects} onChange={(e) => setSubmitForm(p => ({ ...p, minorDefects: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>{t("manufacturing.ccd.imageUrl")}</Label>
              <Input value={submitForm.imageUrl} onChange={(e) => setSubmitForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>{t("manufacturing.ccd.notes")}</Label>
              <Textarea value={submitForm.notes} onChange={(e) => setSubmitForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("manufacturing.ccd.cancel")}</Button></DialogClose>
            <Button
              onClick={() => submitResultMutation.mutate({
                projectId: selectedProject,
                processCode: submitForm.processCode,
                ccdDeviceId: submitForm.ccdDeviceId,
                defectsFound: submitForm.criticalDefects + submitForm.majorDefects + submitForm.minorDefects,
                criticalDefects: submitForm.criticalDefects,
                majorDefects: submitForm.majorDefects,
                minorDefects: submitForm.minorDefects,
                imageUrl: submitForm.imageUrl || undefined,
                notes: submitForm.notes || undefined,
              })}
              disabled={submitResultMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {submitResultMutation.isPending ? t("manufacturing.ccd.submitting") : t("manufacturing.ccd.submitInspection")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
