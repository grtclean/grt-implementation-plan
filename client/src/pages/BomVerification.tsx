import { useState, useMemo } from "react";
import { PageHeader } from "@/components/grt";
import { trpc } from "@/lib/trpc";
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
  Package, ClipboardCheck, AlertTriangle, CheckCircle2, XCircle,
  Plus, RefreshCw, ArrowRight, Shield, FileWarning, BarChart3,
  Loader2, Search
} from "lucide-react";

const PROCESS_NAMES: Record<string, string> = {
  T1: '机加工', T2: '冷作', T3: '机械部件装配', T4: '机械装配', T5: '机械总装',
  T6: '电气装配', T7: '设备调试', T8: '跑和', T9: '包装', T10: '发货',
  T11: '卸车', T12: '就位', T13: '水电气连接', T14: '现场调试', T15: '终验收',
};
const PROCESS_CODES = Object.keys(PROCESS_NAMES);

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-gray-500/20", text: "text-gray-400", label: "待校验" },
  passed: { bg: "bg-green-500/20", text: "text-green-400", label: "通过" },
  failed: { bg: "bg-red-500/20", text: "text-red-400", label: "不通过" },
  waived: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "已放行" },
};
const ITEM_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-gray-500/20", text: "text-gray-400", label: "待检" },
  present: { bg: "bg-green-500/20", text: "text-green-400", label: "齐全" },
  missing: { bg: "bg-red-500/20", text: "text-red-400", label: "缺失" },
  excess: { bg: "bg-blue-500/20", text: "text-blue-400", label: "多余" },
  wrong_spec: { bg: "bg-orange-500/20", text: "text-orange-400", label: "规格不符" },
};

export default function BomVerification() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("records");
  const [selectedProject] = useState("PRJ-2026-001");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showWaiveDialog, setShowWaiveDialog] = useState(false);
  const [selectedVerificationId, setSelectedVerificationId] = useState<number | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({ fromProcess: "T1", toProcess: "T2" });
  const [newItem, setNewItem] = useState({
    materialCode: "", materialName: "", materialSpec: "",
    requiredQty: 1, isCritical: false,
  });
  const [waiveReason, setWaiveReason] = useState("");

  // Queries
  const recordsQuery = trpc.bomVerification.list.useQuery({
    projectId: selectedProject,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const statsQuery = trpc.bomVerification.stats.useQuery({ projectId: selectedProject });
  const detailQuery = trpc.bomVerification.detail.useQuery(
    { verificationId: selectedVerificationId! },
    { enabled: !!selectedVerificationId }
  );
  const utils = trpc.useUtils();

  // Mutations
  const createMut = trpc.bomVerification.create.useMutation({
    onSuccess: (data) => {
      toast({ title: "校验记录已创建", description: `ID: ${data.id}` });
      setShowCreateDialog(false);
      utils.bomVerification.list.invalidate();
    },
    onError: (e) => toast({ title: "创建失败", description: e.message, variant: "destructive" }),
  });

  const addItemsMut = trpc.bomVerification.addItems.useMutation({
    onSuccess: () => {
      toast({ title: "物料项已添加" });
      setNewItem({ materialCode: "", materialName: "", materialSpec: "", requiredQty: 1, isCritical: false });
      setShowAddItemDialog(false);
      if (selectedVerificationId) utils.bomVerification.detail.invalidate();
    },
    onError: (e) => toast({ title: "添加失败", description: e.message, variant: "destructive" }),
  });

  const updateItemMut = trpc.bomVerification.updateItemStatus.useMutation({
    onSuccess: () => {
      toast({ title: "状态已更新" });
      if (selectedVerificationId) utils.bomVerification.detail.invalidate();
    },
  });

  const executeMut = trpc.bomVerification.execute.useMutation({
    onSuccess: (result) => {
      toast({
        title: result.status === 'passed' ? "校验通过" : result.status === 'failed' ? "校验不通过" : "校验未完成",
        description: result.message,
        variant: result.status === 'failed' ? "destructive" : "default",
      });
      utils.bomVerification.list.invalidate();
      utils.bomVerification.stats.invalidate();
      if (selectedVerificationId) utils.bomVerification.detail.invalidate();
    },
    onError: (e) => toast({ title: "执行失败", description: e.message, variant: "destructive" }),
  });

  const waiveMut = trpc.bomVerification.waive.useMutation({
    onSuccess: () => {
      toast({ title: "已放行" });
      setShowWaiveDialog(false);
      setWaiveReason("");
      utils.bomVerification.list.invalidate();
      utils.bomVerification.stats.invalidate();
    },
    onError: (e) => toast({ title: "放行失败", description: e.message, variant: "destructive" }),
  });

  const records = (recordsQuery.data || []) as any[];
  const stats = (statsQuery.data || { summary: {}, byProcess: [] }) as any;
  const detail = detailQuery.data as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={ClipboardCheck}
        title="BOM校验管理"
        description="物料流转BOM自动校验 · 校验不通过自动拦截"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => {
              utils.bomVerification.list.invalidate();
              utils.bomVerification.stats.invalidate();
            }}>
              <RefreshCw className="w-4 h-4 mr-1" /> 刷新
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" /> 新建校验
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建BOM校验记录</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>源工序</Label>
                  <Select value={createForm.fromProcess} onValueChange={v => setCreateForm(f => ({ ...f, fromProcess: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROCESS_CODES.map(c => (
                        <SelectItem key={c} value={c}>{c} - {PROCESS_NAMES[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>目标工序</Label>
                  <Select value={createForm.toProcess} onValueChange={v => setCreateForm(f => ({ ...f, toProcess: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROCESS_CODES.map(c => (
                        <SelectItem key={c} value={c}>{c} - {PROCESS_NAMES[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
                <Button
                  disabled={createMut.isPending}
                  onClick={() => createMut.mutate({
                    projectId: selectedProject,
                    fromProcess: createForm.fromProcess,
                    toProcess: createForm.toProcess,
                  })}
                >
                  {createMut.isPending ? "创建中..." : "创建"}
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">总校验数</p>
            <p className="text-2xl font-bold">{stats.summary?.total_verifications || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">通过</p>
            <p className="text-2xl font-bold text-green-400">{stats.summary?.passed || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">不通过</p>
            <p className="text-2xl font-bold text-red-400">{stats.summary?.failed || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">已放行</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.summary?.waived || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">平均通过率</p>
            <p className="text-2xl font-bold text-blue-400">
              {stats.summary?.avg_pass_rate ? `${Number(stats.summary.avg_pass_rate).toFixed(1)}%` : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records">
            <ClipboardCheck className="w-4 h-4 mr-1" /> 校验记录
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="w-4 h-4 mr-1" /> 工序统计
          </TabsTrigger>
        </TabsList>

        {/* Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待校验</SelectItem>
                <SelectItem value="passed">通过</SelectItem>
                <SelectItem value="failed">不通过</SelectItem>
                <SelectItem value="waived">已放行</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recordsQuery.isLoading ? (
            <div className="text-center py-10 text-muted-foreground">加载中...</div>
          ) : records.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无校验记录</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {records.map((rec: any) => {
                const st = STATUS_STYLES[rec.verification_status] || STATUS_STYLES.pending;
                return (
                  <Card key={rec.id} className="hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => { setSelectedVerificationId(rec.id); setShowDetailDialog(true); }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 font-mono">
                            <Badge variant="outline">{rec.from_process}</Badge>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <Badge variant="outline">{rec.to_process}</Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {PROCESS_NAMES[rec.from_process]} → {PROCESS_NAMES[rec.to_process]}
                          </span>
                          <Badge className={`${st.bg} ${st.text} border-0`}>{st.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>共 {rec.total_items || 0} 项</span>
                          <span>已验 {rec.verified_items || 0}</span>
                          {rec.missing_items > 0 && (
                            <span className="text-red-400">缺失 {rec.missing_items}</span>
                          )}
                          <span>通过率 {rec.pass_rate ? `${Number(rec.pass_rate).toFixed(1)}%` : '-'}</span>
                          <span>{rec.created_at ? new Date(Number(rec.created_at)).toLocaleDateString() : '-'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          {(stats.byProcess || []).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无工序统计数据</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(stats.byProcess as any[]).map((ps: any, i: number) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-mono">
                        <Badge variant="outline">{ps.from_process}</Badge>
                        <ArrowRight className="w-3 h-3" />
                        <Badge variant="outline">{ps.to_process}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">共 {ps.total} 次</span>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm">通过 {ps.passed}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-sm">不通过 {ps.failed}</span>
                      </div>
                    </div>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${ps.total > 0 ? (ps.passed / ps.total * 100) : 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={(open) => { setShowDetailDialog(open); if (!open) setSelectedVerificationId(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              BOM校验详情
              {detail && (
                <Badge className={`${(STATUS_STYLES[detail.verification_status] || STATUS_STYLES.pending).bg} ${(STATUS_STYLES[detail.verification_status] || STATUS_STYLES.pending).text} border-0`}>
                  {(STATUS_STYLES[detail.verification_status] || STATUS_STYLES.pending).label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span>源工序: <strong>{detail.from_process} - {PROCESS_NAMES[detail.from_process]}</strong></span>
                <ArrowRight className="w-4 h-4" />
                <span>目标工序: <strong>{detail.to_process} - {PROCESS_NAMES[detail.to_process]}</strong></span>
              </div>

              {/* Items list */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium">校验清单 ({(detail.items || []).length} 项)</h3>
                <Button size="sm" variant="outline" onClick={() => setShowAddItemDialog(true)}>
                  <Plus className="w-3 h-3 mr-1" /> 添加物料
                </Button>
              </div>

              {(detail.items || []).length === 0 ? (
                <div className="py-6 text-center text-muted-foreground border border-dashed rounded-lg">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>暂无校验清单项，请添加物料</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">物料编码</th>
                        <th className="text-left p-2">物料名称</th>
                        <th className="text-center p-2">需求</th>
                        <th className="text-center p-2">实际</th>
                        <th className="text-center p-2">关键</th>
                        <th className="text-center p-2">状态</th>
                        <th className="text-center p-2">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.items as any[]).map((item: any) => {
                        const ist = ITEM_STATUS_STYLES[item.check_status] || ITEM_STATUS_STYLES.pending;
                        return (
                          <tr key={item.id} className="border-t border-border/50 hover:bg-muted/30">
                            <td className="p-2 font-mono text-xs">{item.material_code}</td>
                            <td className="p-2">{item.material_name}</td>
                            <td className="p-2 text-center">{item.required_qty}</td>
                            <td className="p-2 text-center">{item.actual_qty || '-'}</td>
                            <td className="p-2 text-center">
                              {item.is_critical ? <Badge variant="destructive" className="text-xs">关键</Badge> : '-'}
                            </td>
                            <td className="p-2 text-center">
                              <Badge className={`${ist.bg} ${ist.text} border-0 text-xs`}>{ist.label}</Badge>
                            </td>
                            <td className="p-2 text-center">
                              {detail.verification_status === 'pending' && (
                                <Select
                                  value={item.check_status}
                                  onValueChange={(v) => updateItemMut.mutate({
                                    itemId: item.id,
                                    checkStatus: v as any,
                                    actualQty: v === 'present' ? item.required_qty : 0,
                                  })}
                                >
                                  <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">待检</SelectItem>
                                    <SelectItem value="present">齐全</SelectItem>
                                    <SelectItem value="missing">缺失</SelectItem>
                                    <SelectItem value="excess">多余</SelectItem>
                                    <SelectItem value="wrong_spec">规格不符</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action buttons */}
              {detail.verification_status === 'pending' && (detail.items || []).length > 0 && (
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => executeMut.mutate({
                      verificationId: detail.id,
                      projectId: selectedProject,
                      fromProcess: detail.from_process,
                      toProcess: detail.to_process,
                    })}
                    disabled={executeMut.isPending}
                  >
                    {executeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ClipboardCheck className="w-4 h-4 mr-1" />}
                    执行校验
                  </Button>
                </div>
              )}
              {detail.verification_status === 'failed' && (
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowWaiveDialog(true)}>
                    <Shield className="w-4 h-4 mr-1" /> 放行
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加BOM校验物料</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>物料编码</Label>
                <Input value={newItem.materialCode} onChange={e => setNewItem(f => ({ ...f, materialCode: e.target.value }))} placeholder="如 MAT-001" />
              </div>
              <div>
                <Label>物料名称</Label>
                <Input value={newItem.materialName} onChange={e => setNewItem(f => ({ ...f, materialName: e.target.value }))} placeholder="如 不锈钢螺栓" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>规格型号</Label>
                <Input value={newItem.materialSpec} onChange={e => setNewItem(f => ({ ...f, materialSpec: e.target.value }))} placeholder="如 M8x30" />
              </div>
              <div>
                <Label>需求数量</Label>
                <Input type="number" value={newItem.requiredQty} onChange={e => setNewItem(f => ({ ...f, requiredQty: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newItem.isCritical}
                onChange={e => setNewItem(f => ({ ...f, isCritical: e.target.checked }))}
                className="rounded"
              />
              <Label>关键物料（缺失将直接导致校验不通过）</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button
              disabled={!newItem.materialCode || !newItem.materialName || addItemsMut.isPending || !selectedVerificationId}
              onClick={() => selectedVerificationId && addItemsMut.mutate({
                verificationId: selectedVerificationId,
                items: [{
                  projectId: selectedProject,
                  processCode: detail?.to_process || "T1",
                  materialCode: newItem.materialCode,
                  materialName: newItem.materialName,
                  materialSpec: newItem.materialSpec || undefined,
                  requiredQty: newItem.requiredQty,
                  isCritical: newItem.isCritical,
                }],
              })}
            >
              {addItemsMut.isPending ? "添加中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waive Dialog */}
      <Dialog open={showWaiveDialog} onOpenChange={setShowWaiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>放行确认</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                校验不通过的物料将被放行，请确认已知悉风险
              </p>
            </div>
            <div>
              <Label>放行原因</Label>
              <Textarea
                value={waiveReason}
                onChange={e => setWaiveReason(e.target.value)}
                placeholder="说明放行原因..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button
              variant="destructive"
              disabled={!waiveReason || waiveMut.isPending || !selectedVerificationId}
              onClick={() => selectedVerificationId && waiveMut.mutate({
                verificationId: selectedVerificationId,
                waivedReason: waiveReason,
              })}
            >
              {waiveMut.isPending ? "放行中..." : "确认放行"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
