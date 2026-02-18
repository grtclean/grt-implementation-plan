import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
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
const CHECK_TYPES = [
  { value: "visual_inspection", label: "目视检查", icon: Eye },
  { value: "ccd_detection", label: "CCD视觉检测", icon: Camera },
  { value: "dimensional_check", label: "尺寸检测", icon: BarChart3 },
  { value: "functional_test", label: "功能测试", icon: Wrench },
  { value: "pressure_test", label: "压力测试", icon: ShieldCheck },
  { value: "cleanliness_test", label: "清洁度测试", icon: ShieldCheck },
];
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
      toast({ title: "检查点已创建" });
      setShowCreateDialog(false);
      checkpointsQuery.refetch();
    },
  });
  const submitResultMut = trpc.qualityMaterialPerformance.submitResult.useMutation({
    onSuccess: () => {
      toast({ title: "检查结果已提交" });
      setShowResultDialog(false);
      resultsQuery.refetch();
      dashboardQuery.refetch();
    },
  });
  const createDefectMut = trpc.qualityMaterialPerformance.createDefect.useMutation({
    onSuccess: () => {
      toast({ title: "缺陷已记录" });
      setShowDefectDialog(false);
      defectsQuery.refetch();
      dashboardQuery.refetch();
    },
  });
  const analyzeCCDMut = trpc.qualityMaterialPerformance.analyzeCCD.useMutation({
    onSuccess: (data) => {
      toast({ title: "CCD分析完成", description: `结果: ${data?.overallResult}, 评分: ${data?.score}` });
    },
  });

  const dashboard = dashboardQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={ShieldCheck}
        title="质量检查点管理"
        description="T1-T15工序质量检查、CCD视觉检测、缺陷追踪"
        actions={
          <Select value={selectedProcess} onValueChange={setSelectedProcess}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="选择工序" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部工序</SelectItem>
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
          <TabsTrigger value="dashboard">质量仪表盘</TabsTrigger>
          <TabsTrigger value="checkpoints">检查点</TabsTrigger>
          <TabsTrigger value="results">检查结果</TabsTrigger>
          <TabsTrigger value="defects">缺陷管理</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={CheckCircle2} label="合格" value={dashboard?.results?.pass_count || 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
            <StatCard icon={XCircle} label="不合格" value={dashboard?.results?.fail_count || 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
            <StatCard icon={AlertTriangle} label="待处理缺陷" value={dashboard?.defects?.open_count || 0} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
            <StatCard icon={BarChart3} label="平均评分" value={dashboard?.results?.avg_score ? Math.round(Number(dashboard.results.avg_score)) : 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          </div>

          {/* Pass Rate by Process */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">各工序合格率</CardTitle>
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
                  <p className="text-center text-muted-foreground py-8">暂无检查数据</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Defect Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">缺陷类型分布</CardTitle>
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
            <h3 className="text-lg font-semibold">质量检查点列表</h3>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />添加检查点</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>创建质量检查点</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>工序</Label>
                      <Select value={newCheckpoint.processCode} onValueChange={v => setNewCheckpoint(p => ({ ...p, processCode: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROCESS_CODES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>检查类型</Label>
                      <Select value={newCheckpoint.checkpointType} onValueChange={v => setNewCheckpoint(p => ({ ...p, checkpointType: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CHECK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>检查点名称</Label>
                    <Input value={newCheckpoint.checkpointName} onChange={e => setNewCheckpoint(p => ({ ...p, checkpointName: e.target.value }))} placeholder="例：T5组装外观检查" />
                  </div>
                  <div>
                    <Label>验收标准</Label>
                    <Textarea value={newCheckpoint.acceptanceCriteria} onChange={e => setNewCheckpoint(p => ({ ...p, acceptanceCriteria: e.target.value }))} placeholder="描述合格/不合格判定标准..." />
                  </div>
                  <div>
                    <Label>描述</Label>
                    <Textarea value={newCheckpoint.description} onChange={e => setNewCheckpoint(p => ({ ...p, description: e.target.value }))} placeholder="检查点详细说明..." />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createCheckpointMut.mutate({ ...newCheckpoint, projectId: selectedProject })}
                    disabled={createCheckpointMut.isPending || !newCheckpoint.checkpointName}
                  >
                    {createCheckpointMut.isPending ? "创建中..." : "创建检查点"}
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
                        {CHECK_TYPES.find(t => t.value === cp.checkpoint_type)?.label || cp.checkpoint_type}
                        {cp.is_mandatory && <Badge variant="destructive" className="ml-2 text-xs">必检</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      setNewResult(p => ({ ...p, checkpointId: cp.id, processCode: cp.process_code }));
                      setShowResultDialog(true);
                    }}>
                      <CheckCircle2 className="w-4 h-4 mr-1" />提交结果
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!checkpointsQuery.data || (checkpointsQuery.data as any[]).length === 0) && (
              <p className="text-center text-muted-foreground py-8">暂无检查点，点击"添加检查点"创建</p>
            )}
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <h3 className="text-lg font-semibold">检查结果记录</h3>
          <div className="space-y-3">
            {(resultsQuery.data as any[] || []).map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">{r.process_code}</Badge>
                      <span className="font-medium">{r.checkpoint_name}</span>
                      <Badge className={RESULT_COLORS[r.result] || ""}>
                        {r.result === 'pass' ? '合格' : r.result === 'fail' ? '不合格' : r.result === 'conditional_pass' ? '有条件通过' : '待检'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      {r.score && <span className="font-mono text-sm">评分: {r.score}</span>}
                      {r.defect_count > 0 && (
                        <Badge variant="destructive">{r.defect_count}个缺陷</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {r.inspector_name || '未知'} · {new Date(Number(r.checked_at)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {r.remarks && <p className="text-sm text-muted-foreground mt-2">{r.remarks}</p>}
                </CardContent>
              </Card>
            ))}
            {(!resultsQuery.data || (resultsQuery.data as any[]).length === 0) && (
              <p className="text-center text-muted-foreground py-8">暂无检查结果</p>
            )}
          </div>
        </TabsContent>

        {/* Defects Tab */}
        <TabsContent value="defects" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">质量缺陷管理</h3>
            <Button onClick={() => setShowDefectDialog(true)}>
              <FileWarning className="w-4 h-4 mr-2" />记录缺陷
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
                        {d.severity === 'critical' ? '严重' : d.severity === 'major' ? '主要' : d.severity === 'minor' ? '次要' : '外观'}
                      </Badge>
                      <span className="capitalize text-sm">{d.defect_type}</span>
                    </div>
                    <Badge variant={d.status === 'open' ? 'destructive' : d.status === 'resolved' ? 'default' : 'secondary'}>
                      {d.status === 'open' ? '待处理' : d.status === 'in_progress' ? '处理中' : d.status === 'resolved' ? '已解决' : '已关闭'}
                    </Badge>
                  </div>
                  <p className="text-sm mt-2">{d.description}</p>
                  {d.root_cause && <p className="text-xs text-muted-foreground mt-1">根因: {d.root_cause}</p>}
                  {d.corrective_action && <p className="text-xs text-muted-foreground">纠正措施: {d.corrective_action}</p>}
                </CardContent>
              </Card>
            ))}
            {(!defectsQuery.data || (defectsQuery.data as any[]).length === 0) && (
              <p className="text-center text-muted-foreground py-8">暂无缺陷记录</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Submit Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>提交检查结果</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>检查结果</Label>
              <Select value={newResult.result} onValueChange={v => setNewResult(p => ({ ...p, result: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">合格</SelectItem>
                  <SelectItem value="fail">不合格</SelectItem>
                  <SelectItem value="conditional_pass">有条件通过</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>评分 (0-100)</Label>
              <Input type="number" min={0} max={100} value={newResult.score} onChange={e => setNewResult(p => ({ ...p, score: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>备注</Label>
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
              {submitResultMut.isPending ? "提交中..." : "提交结果"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Defect Dialog */}
      <Dialog open={showDefectDialog} onOpenChange={setShowDefectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>记录质量缺陷</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>缺陷类型</Label>
                <Select value={newDefect.defectType} onValueChange={v => setNewDefect(p => ({ ...p, defectType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dimensional">尺寸</SelectItem>
                    <SelectItem value="surface">表面</SelectItem>
                    <SelectItem value="functional">功能</SelectItem>
                    <SelectItem value="assembly">装配</SelectItem>
                    <SelectItem value="material">材料</SelectItem>
                    <SelectItem value="cleanliness">清洁度</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>严重程度</Label>
                <Select value={newDefect.severity} onValueChange={v => setNewDefect(p => ({ ...p, severity: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">严重 (Critical)</SelectItem>
                    <SelectItem value="major">主要 (Major)</SelectItem>
                    <SelectItem value="minor">次要 (Minor)</SelectItem>
                    <SelectItem value="cosmetic">外观 (Cosmetic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>缺陷描述</Label>
              <Textarea value={newDefect.description} onChange={e => setNewDefect(p => ({ ...p, description: e.target.value }))} placeholder="详细描述缺陷现象..." />
            </div>
            <div>
              <Label>根本原因</Label>
              <Input value={newDefect.rootCause} onChange={e => setNewDefect(p => ({ ...p, rootCause: e.target.value }))} placeholder="分析根本原因..." />
            </div>
            <div>
              <Label>纠正措施</Label>
              <Textarea value={newDefect.correctiveAction} onChange={e => setNewDefect(p => ({ ...p, correctiveAction: e.target.value }))} placeholder="描述纠正措施..." />
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
              {createDefectMut.isPending ? "记录中..." : "记录缺陷"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
