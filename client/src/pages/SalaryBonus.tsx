import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, Calculator, TrendingUp, Award, Settings,
  RefreshCw, Download, Plus, CheckCircle2, XCircle,
  BarChart3, Users, Loader2, FileText, Eye
} from "lucide-react";

const PERIOD_TYPES: Record<string, string> = {
  weekly: "周", monthly: "月", quarterly: "季", annual: "年",
};
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  calculated: { bg: "bg-blue-500/20", text: "text-blue-400", label: "已计算" },
  reviewed: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "已审核" },
  approved: { bg: "bg-green-500/20", text: "text-green-400", label: "已批准" },
  paid: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "已发放" },
  rejected: { bg: "bg-red-500/20", text: "text-red-400", label: "已驳回" },
};

export default function SalaryBonus() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("records");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showBatchCalcDialog, setShowBatchCalcDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);

  // Batch calc form
  const [batchForm, setBatchForm] = useState({
    periodType: "monthly" as string,
    periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
  });

  // Rule form
  const [ruleForm, setRuleForm] = useState({
    ruleName: "", ruleCode: "", description: "",
    efficiencyBaseAmount: 500, efficiencyThreshold: 100, efficiencyMaxMultiplier: 2.0, efficiencyWeight: 0.40,
    qualityBaseAmount: 400, qualityThreshold: 95, qualityMaxMultiplier: 1.5, qualityWeight: 0.35,
    attendanceBaseAmount: 300, attendanceThreshold: 90, attendanceWeight: 0.25,
    rankTop1Bonus: 1000, rankTop3Bonus: 500, rankTop5Bonus: 200,
    defectPenaltyPerCount: 50, criticalDefectPenalty: 500,
  });

  // Queries
  const recordsQuery = trpc.salaryBonus.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 50,
  });
  const statsQuery = trpc.salaryBonus.stats.useQuery({});
  const rulesQuery = trpc.salaryBonus.getRules.useQuery({});
  const detailQuery = trpc.salaryBonus.detail.useQuery(
    { recordId: selectedRecordId! },
    { enabled: !!selectedRecordId }
  );
  const utils = trpc.useUtils();

  // Mutations
  const batchCalcMut = trpc.salaryBonus.batchCalculate.useMutation({
    onSuccess: (result) => {
      toast({
        title: "批量计算完成",
        description: `共 ${result.total} 人，成功 ${result.calculated} 人，失败 ${result.errors} 人`,
      });
      setShowBatchCalcDialog(false);
      utils.salaryBonus.list.invalidate();
      utils.salaryBonus.stats.invalidate();
    },
    onError: (e) => toast({ title: "计算失败", description: e.message, variant: "destructive" }),
  });

  const createRuleMut = trpc.salaryBonus.createRule.useMutation({
    onSuccess: () => {
      toast({ title: "规则已创建" });
      setShowRuleDialog(false);
      utils.salaryBonus.getRules.invalidate();
    },
    onError: (e) => toast({ title: "创建失败", description: e.message, variant: "destructive" }),
  });

  const updateStatusMut = trpc.salaryBonus.updateStatus.useMutation({
    onSuccess: () => {
      toast({ title: "状态已更新" });
      utils.salaryBonus.list.invalidate();
      utils.salaryBonus.stats.invalidate();
      if (selectedRecordId) utils.salaryBonus.detail.invalidate();
    },
    onError: (e) => toast({ title: "更新失败", description: e.message, variant: "destructive" }),
  });

  const exportMut = trpc.salaryBonus.exportCSV.useMutation({
    onSuccess: (data) => {
      // Download CSV
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salary_bonus_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "导出成功", description: `共 ${data.count} 条记录` });
    },
    onError: (e) => toast({ title: "导出失败", description: e.message, variant: "destructive" }),
  });

  const records = (recordsQuery.data || []) as any[];
  const stats = (statsQuery.data || {}) as any;
  const rules = (rulesQuery.data || []) as any[];
  const detail = detailQuery.data as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={DollarSign}
        title="薪酬奖金管理"
        description="绩效数据自动计算奖金 · 审批发放流程"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              utils.salaryBonus.list.invalidate();
              utils.salaryBonus.stats.invalidate();
            }}>
              <RefreshCw className="w-4 h-4 mr-1" /> 刷新
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportMut.mutate({})}>
              <Download className="w-4 h-4 mr-1" /> 导出CSV
            </Button>
            <Dialog open={showBatchCalcDialog} onOpenChange={setShowBatchCalcDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Calculator className="w-4 h-4 mr-1" /> 批量计算
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>批量计算绩效奖金</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>计算周期</Label>
                  <Select value={batchForm.periodType} onValueChange={v => setBatchForm(f => ({ ...f, periodType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">周</SelectItem>
                      <SelectItem value="monthly">月</SelectItem>
                      <SelectItem value="quarterly">季</SelectItem>
                      <SelectItem value="annual">年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>开始日期</Label>
                    <Input type="date" value={batchForm.periodStart}
                      onChange={e => setBatchForm(f => ({ ...f, periodStart: e.target.value }))} />
                  </div>
                  <div>
                    <Label>结束日期</Label>
                    <Input type="date" value={batchForm.periodEnd}
                      onChange={e => setBatchForm(f => ({ ...f, periodEnd: e.target.value }))} />
                  </div>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-400">
                  将自动获取该期间内所有有绩效记录的员工，使用当前激活的计算规则进行奖金计算。
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
                <Button
                  disabled={batchCalcMut.isPending}
                  onClick={() => batchCalcMut.mutate({
                    periodType: batchForm.periodType as any,
                    periodStart: new Date(batchForm.periodStart).getTime(),
                    periodEnd: new Date(batchForm.periodEnd).getTime(),
                  })}
                >
                  {batchCalcMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> 计算中...</> : "开始计算"}
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">总记录数</p>
            <p className="text-2xl font-bold">{stats.total_records || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">奖金总额</p>
            <p className="text-2xl font-bold text-emerald-400">
              ¥{stats.total_bonus_amount ? Number(stats.total_bonus_amount).toLocaleString() : '0'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">平均奖金</p>
            <p className="text-2xl font-bold text-blue-400">
              ¥{stats.avg_bonus ? Number(stats.avg_bonus).toFixed(0) : '0'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">平均效率</p>
            <p className="text-2xl font-bold text-yellow-400">
              {stats.avg_efficiency ? `${Number(stats.avg_efficiency).toFixed(1)}%` : '-'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">平均评分</p>
            <p className="text-2xl font-bold text-purple-400">
              {stats.avg_score ? Number(stats.avg_score).toFixed(1) : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records">
            <FileText className="w-4 h-4 mr-1" /> 奖金记录
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Settings className="w-4 h-4 mr-1" /> 计算规则
          </TabsTrigger>
        </TabsList>

        {/* Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="calculated">已计算</SelectItem>
                <SelectItem value="reviewed">已审核</SelectItem>
                <SelectItem value="approved">已批准</SelectItem>
                <SelectItem value="paid">已发放</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recordsQuery.isLoading ? (
            <div className="text-center py-10 text-muted-foreground">加载中...</div>
          ) : records.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无奖金记录，请先执行批量计算</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">员工</th>
                    <th className="text-center p-3">周期</th>
                    <th className="text-right p-3">效率奖金</th>
                    <th className="text-right p-3">质量奖金</th>
                    <th className="text-right p-3">特别奖金</th>
                    <th className="text-right p-3">扣款</th>
                    <th className="text-right p-3 font-bold">奖金合计</th>
                    <th className="text-center p-3">评分</th>
                    <th className="text-center p-3">排名</th>
                    <th className="text-center p-3">状态</th>
                    <th className="text-center p-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec: any) => {
                    const st = STATUS_STYLES[rec.status] || STATUS_STYLES.calculated;
                    return (
                      <tr key={rec.id} className="border-t border-border/50 hover:bg-muted/30">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{rec.worker_name}</p>
                            <p className="text-xs text-muted-foreground">{rec.worker_id}</p>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline">{PERIOD_TYPES[rec.period_type] || rec.period_type}</Badge>
                        </td>
                        <td className="p-3 text-right font-mono">¥{Number(rec.efficiency_bonus || 0).toFixed(0)}</td>
                        <td className="p-3 text-right font-mono">¥{Number(rec.quality_bonus || 0).toFixed(0)}</td>
                        <td className="p-3 text-right font-mono text-emerald-400">
                          {Number(rec.special_bonus || 0) > 0 ? `¥${Number(rec.special_bonus).toFixed(0)}` : '-'}
                        </td>
                        <td className="p-3 text-right font-mono text-red-400">
                          {Number(rec.penalty_deduction || 0) > 0 ? `-¥${Number(rec.penalty_deduction).toFixed(0)}` : '-'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-lg">
                          ¥{Number(rec.total_bonus || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-bold ${Number(rec.overall_score) >= 80 ? 'text-green-400' : Number(rec.overall_score) >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {Number(rec.overall_score || 0).toFixed(1)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {rec.performance_rank <= 3 ? (
                            <Badge className="bg-amber-500/20 text-amber-400 border-0">
                              <Award className="w-3 h-3 mr-0.5" /> #{rec.performance_rank}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">#{rec.performance_rank || '-'}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`${st.bg} ${st.text} border-0 text-xs`}>{st.label}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedRecordId(rec.id); setShowDetailDialog(true); }}>
                              <Eye className="w-3 h-3" />
                            </Button>
                            {rec.status === 'calculated' && (
                              <Button variant="outline" size="sm" onClick={() => updateStatusMut.mutate({ recordId: rec.id, status: 'reviewed' })}>
                                审核
                              </Button>
                            )}
                            {rec.status === 'reviewed' && (
                              <Button variant="default" size="sm" onClick={() => updateStatusMut.mutate({ recordId: rec.id, status: 'approved' })}>
                                批准
                              </Button>
                            )}
                            {rec.status === 'approved' && (
                              <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => updateStatusMut.mutate({ recordId: rec.id, status: 'paid' })}>
                                发放
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> 新建规则</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>新建薪酬计算规则</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>规则名称</Label>
                      <Input value={ruleForm.ruleName} onChange={e => setRuleForm(f => ({ ...f, ruleName: e.target.value }))} placeholder="如 标准月度奖金" />
                    </div>
                    <div>
                      <Label>规则编码</Label>
                      <Input value={ruleForm.ruleCode} onChange={e => setRuleForm(f => ({ ...f, ruleCode: e.target.value }))} placeholder="如 MONTHLY_STD" />
                    </div>
                  </div>
                  <div>
                    <Label>描述</Label>
                    <Textarea value={ruleForm.description} onChange={e => setRuleForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> 效率奖金参数</h4>
                    <div className="grid grid-cols-4 gap-3">
                      <div><Label className="text-xs">基准金额</Label><Input type="number" value={ruleForm.efficiencyBaseAmount} onChange={e => setRuleForm(f => ({ ...f, efficiencyBaseAmount: Number(e.target.value) }))} /></div>
                      <div><Label className="text-xs">达标线(%)</Label><Input type="number" value={ruleForm.efficiencyThreshold} onChange={e => setRuleForm(f => ({ ...f, efficiencyThreshold: Number(e.target.value) }))} /></div>
                      <div><Label className="text-xs">最大倍数</Label><Input type="number" step="0.1" value={ruleForm.efficiencyMaxMultiplier} onChange={e => setRuleForm(f => ({ ...f, efficiencyMaxMultiplier: Number(e.target.value) }))} /></div>
                      <div><Label className="text-xs">权重</Label><Input type="number" step="0.05" value={ruleForm.efficiencyWeight} onChange={e => setRuleForm(f => ({ ...f, efficiencyWeight: Number(e.target.value) }))} /></div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> 质量奖金参数</h4>
                    <div className="grid grid-cols-4 gap-3">
                      <div><Label className="text-xs">基准金额</Label><Input type="number" value={ruleForm.qualityBaseAmount} onChange={e => setRuleForm(f => ({ ...f, qualityBaseAmount: Number(e.target.value) }))} /></div>
                      <div><Label className="text-xs">达标线(%)</Label><Input type="number" value={ruleForm.qualityThreshold} onChange={e => setRuleForm(f => ({ ...f, qualityThreshold: Number(e.target.value) }))} /></div>
                      <div><Label className="text-xs">最大倍数</Label><Input type="number" step="0.1" value={ruleForm.qualityMaxMultiplier} onChange={e => setRuleForm(f => ({ ...f, qualityMaxMultiplier: Number(e.target.value) }))} /></div>
                      <div><Label className="text-xs">权重</Label><Input type="number" step="0.05" value={ruleForm.qualityWeight} onChange={e => setRuleForm(f => ({ ...f, qualityWeight: Number(e.target.value) }))} /></div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2"><Award className="w-4 h-4" /> 排名奖金 & 处罚</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label className="text-xs">Top 1 奖金</Label><Input type="number" value={ruleForm.rankTop1Bonus} onChange={e => setRuleForm(f => ({ ...f, rankTop1Bonus: Number(e.target.value) }))} /></div>
                      <div><Label className="text-xs">Top 3 奖金</Label><Input type="number" value={ruleForm.rankTop3Bonus} onChange={e => setRuleForm(f => ({ ...f, rankTop3Bonus: Number(e.target.value) }))} /></div>
                      <div><Label className="text-xs">Top 5 奖金</Label><Input type="number" value={ruleForm.rankTop5Bonus} onChange={e => setRuleForm(f => ({ ...f, rankTop5Bonus: Number(e.target.value) }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div><Label className="text-xs">缺陷扣款/个</Label><Input type="number" value={ruleForm.defectPenaltyPerCount} onChange={e => setRuleForm(f => ({ ...f, defectPenaltyPerCount: Number(e.target.value) }))} /></div>
                      <div><Label className="text-xs">严重缺陷扣款</Label><Input type="number" value={ruleForm.criticalDefectPenalty} onChange={e => setRuleForm(f => ({ ...f, criticalDefectPenalty: Number(e.target.value) }))} /></div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
                  <Button
                    disabled={!ruleForm.ruleName || !ruleForm.ruleCode || createRuleMut.isPending}
                    onClick={() => createRuleMut.mutate(ruleForm)}
                  >
                    {createRuleMut.isPending ? "创建中..." : "创建规则"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {rulesQuery.isLoading ? (
            <div className="text-center py-10 text-muted-foreground">加载中...</div>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无计算规则，请先创建</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule: any) => (
                <Card key={rule.id} className={`${rule.is_active ? 'border-emerald-500/30' : 'opacity-60'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{rule.rule_name}</CardTitle>
                      <Badge className={rule.is_active ? 'bg-emerald-500/20 text-emerald-400 border-0' : 'bg-gray-500/20 text-gray-400 border-0'}>
                        {rule.is_active ? '激活' : '停用'}
                      </Badge>
                    </div>
                    <CardDescription>{rule.rule_code} · {rule.description || '无描述'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">效率基准</p>
                        <p className="font-bold">¥{rule.efficiency_base_amount}</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">质量基准</p>
                        <p className="font-bold">¥{rule.quality_base_amount}</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">出勤基准</p>
                        <p className="font-bold">¥{rule.attendance_base_amount}</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">Top1奖金</p>
                        <p className="font-bold text-amber-400">¥{rule.rank_top1_bonus}</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">缺陷扣款/个</p>
                        <p className="font-bold text-red-400">-¥{rule.defect_penalty_per_count}</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">严重缺陷</p>
                        <p className="font-bold text-red-400">-¥{rule.critical_defect_penalty}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={(open) => { setShowDetailDialog(open); if (!open) setSelectedRecordId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>奖金详情</DialogTitle>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">{detail.worker_name}</p>
                  <p className="text-sm text-muted-foreground">{detail.worker_id}</p>
                </div>
                <Badge className={`${(STATUS_STYLES[detail.status] || STATUS_STYLES.calculated).bg} ${(STATUS_STYLES[detail.status] || STATUS_STYLES.calculated).text} border-0`}>
                  {(STATUS_STYLES[detail.status] || STATUS_STYLES.calculated).label}
                </Badge>
              </div>
              <div className="border rounded-lg divide-y divide-border/50">
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">效率奖金</span>
                  <span className="font-mono">¥{Number(detail.efficiency_bonus || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">质量奖金</span>
                  <span className="font-mono">¥{Number(detail.quality_bonus || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">出勤奖金</span>
                  <span className="font-mono">¥{Number(detail.attendance_bonus || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">特别奖金</span>
                  <span className="font-mono text-emerald-400">¥{Number(detail.special_bonus || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">处罚扣款</span>
                  <span className="font-mono text-red-400">-¥{Number(detail.penalty_deduction || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 font-bold">
                  <span>奖金合计</span>
                  <span className="text-xl font-mono">¥{Number(detail.total_bonus || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground">效率系数</p>
                  <p className="font-bold">{Number(detail.efficiency_rate || 0).toFixed(1)}%</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground">质量合格率</p>
                  <p className="font-bold">{Number(detail.quality_pass_rate || 0).toFixed(1)}%</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground">综合评分</p>
                  <p className="font-bold">{Number(detail.overall_score || 0).toFixed(1)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
