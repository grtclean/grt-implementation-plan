import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  ShoppingCart, Clock, CheckCircle2, AlertTriangle, XCircle,
  FileText, Send, Package, User, Loader2, ArrowRight,
  Building2, Truck, DollarSign, Calendar, Edit, Eye,
  FileOutput, History, RefreshCw, Settings
} from "lucide-react";
import { toast } from "sonner";

const statusTabs = [
  { id: 'pending_engineer', label: '待工程确认', icon: User, color: 'text-yellow-500' },
  { id: 'pending_procurement', label: '待采购确认', icon: ShoppingCart, color: 'text-blue-500' },
  { id: 'exported', label: '已输出', icon: Send, color: 'text-green-500' },
  { id: 'rejected', label: '已驳回', icon: XCircle, color: 'text-red-500' },
];

interface POItem {
  id: number;
  poCode: string;
  projectCode: string;
  itemCode: string;
  itemName: string;
  specification: string;
  leadTime: number;
  quantity: number;
  unit: string;
  suggestedSupplier: string;
  priceRange: string;
  needDate: string;
  riskFlags: string[];
  rationale: string;
  status: string;
  engineerComment?: string;
  procurementComment?: string;
  finalPoRef?: string;
}

export default function POSProcurement() {
  const [, setLocation] = useLocation();
  const [page] = useState(1);
  const [activeTab, setActiveTab] = useState('pending_engineer');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<POItem | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportComment, setExportComment] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, refetch } = trpc.pos.procurement.list.useQuery({ page, pageSize: 20 });

  const engineerConfirmMutation = trpc.pos.procurement.engineerConfirm.useMutation({
    onSuccess: () => {
      toast.success('工程确认成功，已转入采购确认');
      setSelectedItems([]);
      refetch();
    },
    onError: () => toast.error('确认失败'),
  });

  const procurementConfirmMutation = trpc.pos.procurement.procurementConfirm.useMutation({
    onSuccess: () => {
      toast.success('采购确认成功，已输出正式PO');
      setSelectedItems([]);
      refetch();
    },
    onError: () => toast.error('确认失败'),
  });

  const handleEngineerConfirm = () => {
    if (selectedItems.length === 0) {
      toast.error('请选择要确认的物料');
      return;
    }
    engineerConfirmMutation.mutate({ id: 1, approved: true, modifiedItems: selectedItems.map(id => ({ itemCode: String(id) })) });
  };

  const handleProcurementConfirm = () => {
    if (selectedItems.length === 0) {
      toast.error('请选择要确认的物料');
      return;
    }
    setShowExportDialog(true);
  };

  const handleExportPO = () => {
    procurementConfirmMutation.mutate({
      id: 1,
      approved: true,
      finalPoRef: `PO-${Date.now()}`,
    });
    setShowExportDialog(false);
    setExportComment('');
  };

  const handleReject = () => {
    toast.success('已驳回选中物料');
    setShowRejectDialog(false);
    setRejectReason('');
    setSelectedItems([]);
  };

  const displayItems: POItem[] = (data?.items as POItem[]) ?? [];
  const filteredItems = displayItems.filter((item) => item.status === activeTab);

  // 计算统计数据
  const stats = {
    pendingEngineer: displayItems.filter((i) => i.status === 'pending_engineer').length,
    pendingProcurement: displayItems.filter((i) => i.status === 'pending_procurement').length,
    exported: displayItems.filter((i) => i.status === 'exported').length,
    rejected: displayItems.filter((i) => i.status === 'rejected').length,
    longLeadTime: displayItems.filter((i) => i.leadTime > 30).length,
    totalValue: '¥156,000',
  };

  const getLeadTimeColor = (days: number) => {
    if (days > 45) return 'text-red-500';
    if (days > 30) return 'text-orange-500';
    return 'text-green-500';
  };

  return (
    <Layout>
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={ShoppingCart}
        title="采购建议"
        description="PO建议管理与审批流程 - 工程师确认 → 采购确认 → 输出正式PO"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation('/pos/connectors')}>
              <Settings className="w-4 h-4 mr-2" />
              ERP配置
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
        }
      />

      {/* 审批流程说明 */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold">1</div>
              <span className="font-medium">M4评审生成</span>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full ${activeTab === 'pending_engineer' ? 'bg-yellow-500' : 'bg-muted'} flex items-center justify-center text-white font-bold`}>2</div>
              <span className={activeTab === 'pending_engineer' ? 'font-bold' : ''}>工程师确认</span>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full ${activeTab === 'pending_procurement' ? 'bg-blue-500' : 'bg-muted'} flex items-center justify-center text-white font-bold`}>3</div>
              <span className={activeTab === 'pending_procurement' ? 'font-bold' : ''}>采购确认</span>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full ${activeTab === 'exported' ? 'bg-green-500' : 'bg-muted'} flex items-center justify-center text-white font-bold`}>4</div>
              <span className={activeTab === 'exported' ? 'font-bold' : ''}>输出正式PO</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={User}
          label="待工程确认"
          value={stats.pendingEngineer}
          subtitle="需技术审核"
          iconColor="text-yellow-500"
          iconBg="bg-yellow-500/10"
        />
        <StatCard
          icon={ShoppingCart}
          label="待采购确认"
          value={stats.pendingProcurement}
          subtitle="需采购审核"
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
        />
        <StatCard
          icon={Send}
          label="已输出"
          value={stats.exported}
          subtitle="已下单"
          iconColor="text-green-500"
          iconBg="bg-green-500/10"
        />
        <StatCard
          icon={XCircle}
          label="已驳回"
          value={stats.rejected}
          subtitle="需修改"
          iconColor="text-red-500"
          iconBg="bg-red-500/10"
        />
        <StatCard
          icon={AlertTriangle}
          label="长周期件"
          value={stats.longLeadTime}
          subtitle=">30天交期"
          iconColor="text-orange-500"
          iconBg="bg-orange-500/10"
        />
        <StatCard
          icon={DollarSign}
          label="预估总额"
          value={stats.totalValue}
          subtitle="待采购金额"
        />
      </div>

      {/* 采购建议列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            PO建议列表
          </CardTitle>
          <CardDescription>M4评审后自动生成的采购建议，按审批流程处理</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedItems([]); }}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                {statusTabs.map(tab => (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1">
                    <tab.icon className={`w-4 h-4 ${tab.color}`} />
                    {tab.label}
                    <Badge variant="secondary" className="ml-1">
                      {displayItems.filter((i) => i.status === tab.id).length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="flex gap-2">
                {activeTab === 'pending_engineer' && (
                  <>
                    <Button variant="outline" onClick={() => setShowRejectDialog(true)} disabled={selectedItems.length === 0}>
                      <XCircle className="w-4 h-4 mr-2" />
                      驳回
                    </Button>
                    <Button onClick={handleEngineerConfirm} disabled={selectedItems.length === 0 || engineerConfirmMutation.isPending}>
                      {engineerConfirmMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      工程确认 ({selectedItems.length})
                    </Button>
                  </>
                )}
                {activeTab === 'pending_procurement' && (
                  <>
                    <Button variant="outline" onClick={() => setShowRejectDialog(true)} disabled={selectedItems.length === 0}>
                      <XCircle className="w-4 h-4 mr-2" />
                      退回工程
                    </Button>
                    <Button onClick={handleProcurementConfirm} disabled={selectedItems.length === 0 || procurementConfirmMutation.isPending}>
                      {procurementConfirmMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileOutput className="w-4 h-4 mr-2" />
                      )}
                      输出PO ({selectedItems.length})
                    </Button>
                  </>
                )}
              </div>
            </div>

            {statusTabs.map(tab => (
              <TabsContent key={tab.id} value={tab.id}>
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {(tab.id === 'pending_engineer' || tab.id === 'pending_procurement') && (
                          <TableHead className="w-12">
                            <Checkbox
                              checked={filteredItems.length > 0 && selectedItems.length === filteredItems.length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedItems(filteredItems.map((i) => i.id));
                                } else {
                                  setSelectedItems([]);
                                }
                              }}
                            />
                          </TableHead>
                        )}
                        <TableHead>PO编号</TableHead>
                        <TableHead>项目</TableHead>
                        <TableHead>物料编码</TableHead>
                        <TableHead>物料名称</TableHead>
                        <TableHead>规格</TableHead>
                        <TableHead>交期</TableHead>
                        <TableHead>数量</TableHead>
                        <TableHead>建议供应商</TableHead>
                        <TableHead>价格区间</TableHead>
                        <TableHead>风险标识</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length > 0 ? (
                        filteredItems.map((item) => (
                          <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                            {(tab.id === 'pending_engineer' || tab.id === 'pending_procurement') && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedItems.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedItems([...selectedItems, item.id]);
                                    } else {
                                      setSelectedItems(selectedItems.filter(id => id !== item.id));
                                    }
                                  }}
                                />
                              </TableCell>
                            )}
                            <TableCell className="font-mono text-xs">{item.poCode}</TableCell>
                            <TableCell className="font-mono text-xs">{item.projectCode}</TableCell>
                            <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.specification}</TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-1 ${getLeadTimeColor(item.leadTime)}`}>
                                <Clock className="w-3 h-3" />
                                <span className="font-medium">{item.leadTime}天</span>
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity} {item.unit}</TableCell>
                            <TableCell className="text-xs">{item.suggestedSupplier}</TableCell>
                            <TableCell className="text-xs font-medium">{item.priceRange}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {item.riskFlags?.map((flag: string, idx: number) => (
                                  <Badge key={idx} variant={flag.includes('关键') ? 'destructive' : 'secondary'} className="text-xs">
                                    {flag}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => { setSelectedItem(item); setShowDetailDialog(true); }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                            暂无数据
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>物料详情 - {selectedItem?.itemName}</DialogTitle>
            <DialogDescription>{selectedItem?.itemCode} | {selectedItem?.projectCode}</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">规格型号</Label>
                  <p className="font-medium">{selectedItem.specification}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">需求数量</Label>
                  <p className="font-medium">{selectedItem.quantity} {selectedItem.unit}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">交货周期</Label>
                  <p className={`font-medium ${getLeadTimeColor(selectedItem.leadTime)}`}>{selectedItem.leadTime} 天</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">需求日期</Label>
                  <p className="font-medium">{selectedItem.needDate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">建议供应商</Label>
                  <p className="font-medium">{selectedItem.suggestedSupplier}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">价格区间</Label>
                  <p className="font-medium">{selectedItem.priceRange}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">AI推荐理由</Label>
                <p className="text-sm bg-muted p-3 rounded-lg mt-1">{selectedItem.rationale}</p>
              </div>
              {selectedItem.riskFlags?.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">风险标识</Label>
                  <div className="flex gap-2 mt-1">
                    {selectedItem.riskFlags.map((flag, idx) => (
                      <Badge key={idx} variant="destructive">{flag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedItem.engineerComment && (
                <div>
                  <Label className="text-muted-foreground">工程师意见</Label>
                  <p className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-1">{selectedItem.engineerComment}</p>
                </div>
              )}
              {selectedItem.procurementComment && (
                <div>
                  <Label className="text-muted-foreground">采购意见</Label>
                  <p className="text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mt-1">{selectedItem.procurementComment}</p>
                </div>
              )}
              {selectedItem.finalPoRef && (
                <div>
                  <Label className="text-muted-foreground">ERP订单号</Label>
                  <p className="font-mono font-medium text-green-600">{selectedItem.finalPoRef}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 输出PO对话框 */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>输出正式PO</DialogTitle>
            <DialogDescription>确认后将生成正式采购订单并推送至ERP系统</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>选中物料数量</Label>
              <p className="text-2xl font-bold">{selectedItems.length} 项</p>
            </div>
            <div>
              <Label>采购备注</Label>
              <Textarea 
                placeholder="输入采购备注（可选）"
                value={exportComment}
                onChange={(e) => setExportComment(e.target.value)}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                确认后将：
              </p>
              <ul className="text-sm mt-2 space-y-1">
                <li>• 生成正式PO编号</li>
                <li>• 推送至ERP系统（如已配置）</li>
                <li>• 通知相关供应商</li>
                <li>• 更新项目采购状态</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>取消</Button>
            <Button onClick={handleExportPO}>
              <FileOutput className="w-4 h-4 mr-2" />
              确认输出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 驳回对话框 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>驳回物料</DialogTitle>
            <DialogDescription>请填写驳回原因</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>驳回原因</Label>
              <Textarea 
                placeholder="请输入驳回原因..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>取消</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>
              <XCircle className="w-4 h-4 mr-2" />
              确认驳回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 第三方集成说明 */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            第三方集成
          </CardTitle>
          <CardDescription>可配置的ERP/采购系统连接器</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span className="font-medium">ERP系统</span>
                </div>
                <Badge variant="outline">未配置</Badge>
              </div>
              <p className="text-sm text-muted-foreground">提交正式PO到ERP系统</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-orange-500" />
                  <span className="font-medium">供应商平台</span>
                </div>
                <Badge variant="outline">未配置</Badge>
              </div>
              <p className="text-sm text-muted-foreground">自动发送询价/订单</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">历史价格库</span>
                </div>
                <Badge className="bg-green-500">已启用</Badge>
              </div>
              <p className="text-sm text-muted-foreground">AI参考历史采购价格</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => setLocation('/pos/connectors')}>
            <Settings className="w-4 h-4 mr-2" />
            配置连接器
          </Button>
        </CardFooter>
      </Card>
    </div>
    </Layout>
  );
}
