import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
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

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-500/20", text: "text-green-400", label: "运行中" },
  paused: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "已暂停" },
  error: { bg: "bg-red-500/20", text: "text-red-400", label: "异常" },
  offline: { bg: "bg-gray-500/20", text: "text-gray-400", label: "离线" },
};

const SEVERITY_MAP: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-500/20", text: "text-red-400", label: "严重" },
  major: { bg: "bg-orange-500/20", text: "text-orange-400", label: "重大" },
  minor: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "轻微" },
};

export default function CcdIntegration() {
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
      toast({ title: "成功", description: "CCD桥接配置已创建" });
      bridgeConfigsQuery.refetch();
      setShowConfigDialog(false);
    },
    onError: (err) => toast({ title: "错误", description: err.message, variant: "destructive" }),
  });
  const submitResultMutation = (trpc.ccdIntegration as any).submitInspectionResult.useMutation({
    onSuccess: (data) => {
      const msg = data.interlockTriggered
        ? `检测结果已提交，已触发工序联动锁定！锁定工序：${data.lockedProcesses?.join(', ')}`
        : "检测结果已提交，未触发联动";
      toast({ title: data.interlockTriggered ? "⚠️ 联动触发" : "成功", description: msg });
      inspectionLogsQuery.refetch();
      statsQuery.refetch();
      setShowSubmitDialog(false);
    },
    onError: (err) => toast({ title: "错误", description: err.message, variant: "destructive" }),
  });
  const toggleConfigMutation = (trpc.ccdIntegration as any).toggleBridgeConfig.useMutation({
    onSuccess: () => {
      toast({ title: "成功", description: "配置状态已更新" });
      bridgeConfigsQuery.refetch();
    },
    onError: (err) => toast({ title: "错误", description: err.message, variant: "destructive" }),
  });

  const configs = (bridgeConfigsQuery.data ?? []) as any[];
  const logs = (inspectionLogsQuery.data ?? []) as any[];
  const stats = (statsQuery.data ?? {}) as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Cpu className="w-6 h-6 text-cyan-400" />
            </div>
            CCD视觉检测集成
          </h1>
          <p className="text-muted-foreground mt-1">
            CCD检测设备与质量联动系统的桥接集成 · 自动化缺陷检测闭环
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { bridgeConfigsQuery.refetch(); inspectionLogsQuery.refetch(); statsQuery.refetch(); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> 刷新
          </Button>
          <Button onClick={() => setShowSubmitDialog(true)} className="bg-cyan-600 hover:bg-cyan-700">
            <Camera className="w-4 h-4 mr-2" /> 提交检测结果
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono">活跃桥接</p>
                <p className="text-xl font-bold">{stats.activeConfigs ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono">检测总次数</p>
                <p className="text-xl font-bold">{stats.totalInspections ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono">联动触发次数</p>
                <p className="text-xl font-bold">{stats.interlockTriggered ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono">合格率</p>
                <p className="text-xl font-bold">{stats.passRate ? `${Number(stats.passRate).toFixed(1)}%` : 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="bridge"><Settings className="w-4 h-4 mr-1" /> 桥接配置</TabsTrigger>
          <TabsTrigger value="logs"><Eye className="w-4 h-4 mr-1" /> 检测日志</TabsTrigger>
        </TabsList>

        {/* Bridge Configs Tab */}
        <TabsContent value="bridge" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">CCD设备桥接配置</h3>
            <Button onClick={() => setShowConfigDialog(true)} size="sm">
              <Zap className="w-4 h-4 mr-1" /> 新建桥接
            </Button>
          </div>

          {configs.length === 0 ? (
            <Card className="bg-card/30 border-dashed border-border">
              <CardContent className="p-8 text-center">
                <Cpu className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">暂无桥接配置，点击"新建桥接"开始配置CCD设备</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configs.map((cfg: any) => {
                const status = cfg.is_active ? STATUS_STYLES.active : STATUS_STYLES.paused;
                return (
                  <Card key={cfg.id} className="bg-card/50 border-border hover:border-cyan-500/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-cyan-400" />
                          {cfg.ccd_device_id || '未命名设备'}
                        </CardTitle>
                        <Badge className={`${status.bg} ${status.text} border-0`}>{status.label}</Badge>
                      </div>
                      <CardDescription>
                        工序: {cfg.process_code} ({PROCESS_NAMES[cfg.process_code] || cfg.process_code})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-red-500/10 rounded p-2 text-center">
                          <p className="text-muted-foreground">严重阈值</p>
                          <p className="font-bold text-red-400">{cfg.defect_threshold_critical}</p>
                        </div>
                        <div className="bg-orange-500/10 rounded p-2 text-center">
                          <p className="text-muted-foreground">重大阈值</p>
                          <p className="font-bold text-orange-400">{cfg.defect_threshold_major}</p>
                        </div>
                        <div className="bg-yellow-500/10 rounded p-2 text-center">
                          <p className="text-muted-foreground">轻微阈值</p>
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
                          {cfg.is_active ? '暂停' : '启用'}
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
          <h3 className="text-lg font-semibold">CCD检测日志</h3>
          {logs.length === 0 ? (
            <Card className="bg-card/30 border-dashed border-border">
              <CardContent className="p-8 text-center">
                <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">暂无检测记录</p>
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
                            缺陷: {log.defects_found} (严重:{log.critical_defects} / 重大:{log.major_defects} / 轻微:{log.minor_defects})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {log.interlock_triggered ? (
                          <Badge className="bg-red-500/20 text-red-400 border-0">已触发联动</Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-400 border-0">正常通过</Badge>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.created_at ? new Date(Number(log.created_at)).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                    {log.interlock_action && (
                      <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-300">
                        <Shield className="w-3 h-3 inline mr-1" />
                        联动动作: {log.interlock_action}
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
            <DialogTitle>新建CCD桥接配置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>工序</Label>
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
              <Label>CCD设备ID</Label>
              <Input value={configForm.ccdDeviceId} onChange={(e) => setConfigForm(p => ({ ...p, ccdDeviceId: e.target.value }))} placeholder="如: CCD-001" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">严重阈值</Label>
                <Input type="number" value={configForm.defectThresholdCritical} onChange={(e) => setConfigForm(p => ({ ...p, defectThresholdCritical: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs">重大阈值</Label>
                <Input type="number" value={configForm.defectThresholdMajor} onChange={(e) => setConfigForm(p => ({ ...p, defectThresholdMajor: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs">轻微阈值</Label>
                <Input type="number" value={configForm.defectThresholdMinor} onChange={(e) => setConfigForm(p => ({ ...p, defectThresholdMinor: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
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
              {createConfigMutation.isPending ? "创建中..." : "创建配置"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Inspection Result Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>提交CCD检测结果</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>工序</Label>
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
                <Label>CCD设备</Label>
                <Input value={submitForm.ccdDeviceId} onChange={(e) => setSubmitForm(p => ({ ...p, ccdDeviceId: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-red-400">严重缺陷</Label>
                <Input type="number" min={0} value={submitForm.criticalDefects} onChange={(e) => setSubmitForm(p => ({ ...p, criticalDefects: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs text-orange-400">重大缺陷</Label>
                <Input type="number" min={0} value={submitForm.majorDefects} onChange={(e) => setSubmitForm(p => ({ ...p, majorDefects: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs text-yellow-400">轻微缺陷</Label>
                <Input type="number" min={0} value={submitForm.minorDefects} onChange={(e) => setSubmitForm(p => ({ ...p, minorDefects: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>检测图片URL（可选）</Label>
              <Input value={submitForm.imageUrl} onChange={(e) => setSubmitForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>备注</Label>
              <Textarea value={submitForm.notes} onChange={(e) => setSubmitForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
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
              {submitResultMutation.isPending ? "提交中..." : "提交检测结果"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
