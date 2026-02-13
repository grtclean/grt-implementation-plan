import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Factory, RefreshCw, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, Loader2, Settings, Play, Eye, Plus,
  ArrowLeftRight, Download, Upload, Activity,
  Package, Timer, TrendingUp, BarChart3
} from "lucide-react";
import { toast } from "sonner";

const workOrderStatusMap = createStatusColorMap({
  Created: 'gray',
  Pending: 'gray',
  InProgress: 'blue',
  Completed: 'green',
  OnHold: 'yellow',
  Cancelled: 'red',
});

const workOrderStatusLabels: Record<string, string> = {
  Created: '已创建',
  Pending: '待开始',
  InProgress: '进行中',
  Completed: '已完成',
  OnHold: '暂停',
  Cancelled: '已取消',
};

// 工序状态颜色
const operationStatusColors: Record<string, string> = {
  Pending: 'bg-gray-200 text-gray-700',
  InProgress: 'bg-blue-100 text-blue-700 animate-pulse',
  Completed: 'bg-green-100 text-green-700',
  Failed: 'bg-red-100 text-red-700',
};

interface WorkOrder {
  id: number;
  workOrderCode: string;
  projectCode: string;
  productName: string;
  status: string;
  progress: number;
  lastSync: string;
  operations?: Operation[];
}

interface Operation {
  id: string;
  name: string;
  status: string;
  progress: number;
  operator?: string;
  startTime?: string;
  endTime?: string;
}

export default function POSMESSync() {
  const [, setLocation] = useLocation();
  const [syncing, setSyncing] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkOrder, setNewWorkOrder] = useState({
    projectId: '',
    workOrderType: 'Production',
    items: [] as { itemCode: string; itemName: string; quantity: number; unit: string }[],
  });

  const { data: syncRecords, isLoading, refetch } = trpc.pos.mes.list.useQuery({ page: 1, pageSize: 20 });
  const { data: connectionStatus } = trpc.pos.mes.getConnectionStatus.useQuery();

  const syncMutation = trpc.pos.mes.sync.useMutation({
    onSuccess: () => {
      toast.success('同步成功');
      refetch();
    },
    onError: () => toast.error('同步失败'),
  });

  const createWorkOrderMutation = trpc.pos.mes.createWorkOrderFromProject.useMutation({
    onSuccess: (result) => {
      toast.success(`工单 ${result.workOrderCode} 创建成功`);
      setShowCreateDialog(false);
      refetch();
    },
    onError: () => toast.error('创建工单失败'),
  });

  const trpcUtils = trpc.useUtils();

  const writeBackMutation = trpc.pos.mes.writeBackProgress.useMutation({
    onSuccess: () => {
      toast.success('进度已回写到项目阶段');
    },
    onError: () => toast.error('回写失败'),
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncMutation.mutateAsync({ id: 1, direction: 'FromMES' });
    } finally {
      setSyncing(false);
    }
  };

  const handlePullProgress = async (workOrderCode: string) => {
    try {
      const result = await trpcUtils.pos.mes.pullProgressFromMES.fetch({ workOrderCode });
      toast.success(`进度已更新: ${Math.round(result.completionRate * 100)}%`);
      refetch();
    } catch {
      toast.error('拉取进度失败');
    }
  };

  const handleWriteBack = async (workOrder: WorkOrder) => {
    await writeBackMutation.mutateAsync({
      workOrderCode: workOrder.workOrderCode,
      projectId: workOrder.id, // Use work order ID as project reference
      stageId: 'M7',
      progress: workOrder.progress,
      status: workOrder.status as any,
    });
  };

  const displayWorkOrders: WorkOrder[] = (syncRecords?.items as WorkOrder[]) ?? [];

  // 计算统计数据
  const stats = {
    total: displayWorkOrders.length,
    inProgress: displayWorkOrders.filter((w) => w.status === 'InProgress').length,
    completed: displayWorkOrders.filter((w) => w.status === 'Completed').length,
    onHold: displayWorkOrders.filter((w) => w.status === 'OnHold').length,
    avgProgress: displayWorkOrders.length > 0
      ? Math.round(displayWorkOrders.reduce((acc, w) => acc + w.progress, 0) / displayWorkOrders.length)
      : 0,
  };

  const mesConnected = connectionStatus?.mes?.connected ?? false;

  return (
    <Layout>
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Factory}
        title="MES同步"
        description="工单与进度看板 - 双向数据同步"
        actions={
          <div className="flex gap-2">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  创建工单
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>从项目创建工单</DialogTitle>
                  <DialogDescription>选择项目并创建MES工单</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>项目ID</Label>
                    <Input
                      placeholder="输入项目ID"
                      value={newWorkOrder.projectId}
                      onChange={(e) => setNewWorkOrder({ ...newWorkOrder, projectId: e.target.value })}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      createWorkOrderMutation.mutate({
                        projectId: parseInt(newWorkOrder.projectId) || 1,
                        workOrderType: 'Production',
                        items: [
                          { itemCode: 'ITEM-001', itemName: '清洗槽', quantity: 1, unit: '套', plannedStartDate: '2024-02-01', plannedEndDate: '2024-03-01' }
                        ],
                      });
                    }}
                    disabled={createWorkOrderMutation.isPending}
                  >
                    {createWorkOrderMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    创建工单
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => setLocation('/pos/connectors')}>
              <Settings className="w-4 h-4 mr-2" />
              配置连接
            </Button>
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              同步MES
            </Button>
          </div>
        }
      />

      {/* 连接状态 */}
      <Card className={`border-l-4 ${mesConnected ? 'border-l-green-500' : 'border-l-yellow-500'}`}>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${mesConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
              <span className="font-medium">MES连接状态</span>
              <Badge variant={mesConnected ? 'default' : 'secondary'}>
                {mesConnected ? '已连接' : '未连接'}
              </Badge>
            </div>
            {connectionStatus?.mes?.lastSync && (
              <span className="text-sm text-muted-foreground">
                上次同步: {connectionStatus.mes.lastSync}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={Factory} label="工单总数" value={stats.total} subtitle="活跃工单" />
        <StatCard icon={Activity} label="进行中" value={stats.inProgress} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={CheckCircle2} label="已完成" value={stats.completed} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={AlertTriangle} label="异常暂停" value={stats.onHold} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
        <StatCard icon={TrendingUp} label="平均进度" value={`${stats.avgProgress}%`} subtitle="整体完成度" />
      </div>

      {/* 工单看板 - 可视化视图 */}
      <Tabs defaultValue="kanban" className="w-full">
        <TabsList>
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            看板视图
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Factory className="w-4 h-4" />
            列表视图
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Timer className="w-4 h-4" />
            工序详情
          </TabsTrigger>
        </TabsList>

        {/* 看板视图 */}
        <TabsContent value="kanban" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 待开始 */}
            <Card className="bg-gray-50 dark:bg-gray-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  待开始
                  <Badge variant="secondary">{displayWorkOrders.filter((w: WorkOrder) => w.status === 'Pending' || w.status === 'Created').length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {displayWorkOrders.filter((w: WorkOrder) => w.status === 'Pending' || w.status === 'Created').map((wo) => (
                  <Card key={wo.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedWorkOrder(wo)}>
                    <CardContent className="p-3">
                      <p className="font-mono text-sm">{wo.workOrderCode}</p>
                      <p className="text-sm text-muted-foreground truncate">{wo.productName}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-xs">{wo.projectCode}</Badge>
                        <Button size="sm" variant="ghost" className="h-6 px-2">
                          <Play className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            {/* 进行中 */}
            <Card className="bg-blue-50 dark:bg-blue-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  进行中
                  <Badge className="bg-blue-500">{stats.inProgress}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {displayWorkOrders.filter((w: WorkOrder) => w.status === 'InProgress').map((wo) => (
                  <Card key={wo.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500" onClick={() => setSelectedWorkOrder(wo)}>
                    <CardContent className="p-3">
                      <p className="font-mono text-sm">{wo.workOrderCode}</p>
                      <p className="text-sm text-muted-foreground truncate">{wo.productName}</p>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>进度</span>
                          <span className="font-medium">{wo.progress}%</span>
                        </div>
                        <Progress value={wo.progress} className="h-2" />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-xs">{wo.projectCode}</Badge>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={(e) => { e.stopPropagation(); handlePullProgress(wo.workOrderCode); }}>
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={(e) => { e.stopPropagation(); handleWriteBack(wo); }}>
                            <Upload className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            {/* 异常暂停 */}
            <Card className="bg-yellow-50 dark:bg-yellow-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  异常暂停
                  <Badge className="bg-yellow-500">{stats.onHold}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {displayWorkOrders.filter((w: WorkOrder) => w.status === 'OnHold').map((wo) => (
                  <Card key={wo.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-yellow-500" onClick={() => setSelectedWorkOrder(wo)}>
                    <CardContent className="p-3">
                      <p className="font-mono text-sm">{wo.workOrderCode}</p>
                      <p className="text-sm text-muted-foreground truncate">{wo.productName}</p>
                      <div className="mt-2">
                        <Progress value={wo.progress} className="h-2 bg-yellow-200" />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="destructive" className="text-xs">需处理</Badge>
                        <Button size="sm" variant="ghost" className="h-6 px-2">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            {/* 已完成 */}
            <Card className="bg-green-50 dark:bg-green-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  已完成
                  <Badge className="bg-green-500">{stats.completed}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {displayWorkOrders.filter((w: WorkOrder) => w.status === 'Completed').map((wo) => (
                  <Card key={wo.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-green-500" onClick={() => setSelectedWorkOrder(wo)}>
                    <CardContent className="p-3">
                      <p className="font-mono text-sm">{wo.workOrderCode}</p>
                      <p className="text-sm text-muted-foreground truncate">{wo.productName}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-xs">{wo.projectCode}</Badge>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 列表视图 */}
        <TabsContent value="table" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                工单列表
              </CardTitle>
              <CardDescription>MES系统工单状态与进度</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : displayWorkOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Factory className="w-12 h-12 mb-3 opacity-50" />
                  <p className="font-medium">暂无工单数据</p>
                  <p className="text-sm">创建工单或同步MES系统获取数据</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>工单编号</TableHead>
                      <TableHead>项目编号</TableHead>
                      <TableHead>产品名称</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>进度</TableHead>
                      <TableHead>最后同步</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayWorkOrders.map((wo) => (
                      <TableRow key={wo.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedWorkOrder(wo)}>
                        <TableCell className="font-mono">{wo.workOrderCode}</TableCell>
                        <TableCell className="font-mono">{wo.projectCode}</TableCell>
                        <TableCell>{wo.productName}</TableCell>
                        <TableCell>
                          <StatusBadge color={workOrderStatusMap[wo.status as keyof typeof workOrderStatusMap] ?? 'gray'}>
                            {workOrderStatusLabels[wo.status]}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 w-32">
                            <Progress value={wo.progress} className="flex-1" />
                            <span className="text-xs text-muted-foreground w-8">{wo.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{wo.lastSync}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handlePullProgress(wo.workOrderCode); }}>
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleWriteBack(wo); }}>
                              <Upload className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 工序详情视图 */}
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                工序进度详情
              </CardTitle>
              <CardDescription>查看各工单的工序执行状态</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {displayWorkOrders.filter((w: WorkOrder) => w.operations).map((wo) => (
                  <div key={wo.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">{wo.workOrderCode} - {wo.productName}</h4>
                        <p className="text-sm text-muted-foreground">{wo.projectCode}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge color={workOrderStatusMap[wo.status as keyof typeof workOrderStatusMap] ?? 'gray'}>
                          {workOrderStatusLabels[wo.status]}
                        </StatusBadge>
                        <span className="text-lg font-bold">{wo.progress}%</span>
                      </div>
                    </div>
                    
                    {/* 工序流程图 */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {wo.operations?.map((op: Operation, index: number) => (
                        <div key={op.id} className="flex items-center">
                          <div className={`
                            min-w-[120px] p-3 rounded-lg border-2 
                            ${operationStatusColors[op.status]}
                            ${op.status === 'InProgress' ? 'border-blue-500' : 'border-transparent'}
                          `}>
                            <div className="flex items-center gap-2 mb-1">
                              {op.status === 'Completed' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                              {op.status === 'InProgress' && <Activity className="w-4 h-4 text-blue-600" />}
                              {op.status === 'Pending' && <Clock className="w-4 h-4 text-gray-400" />}
                              {op.status === 'Failed' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                              <span className="font-medium text-sm">{op.name}</span>
                            </div>
                            {op.operator && (
                              <p className="text-xs text-muted-foreground">{op.operator}</p>
                            )}
                            {op.status !== 'Pending' && (
                              <Progress value={op.progress} className="h-1 mt-2" />
                            )}
                          </div>
                          {index < (wo.operations?.length || 0) - 1 && (
                            <ArrowRight className="w-4 h-4 mx-1 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 数据流向说明 */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            双向数据同步
          </CardTitle>
          <CardDescription>POS与MES系统的数据同步关系</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 py-4">
            <div className="text-center p-4 border rounded-lg bg-primary/5">
              <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">POS系统</p>
              <p className="text-sm text-muted-foreground">项目管理</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1">
                <ArrowRight className="w-6 h-6 text-primary" />
                <span className="text-xs bg-primary/10 px-2 py-1 rounded">创建工单</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs bg-green-500/10 px-2 py-1 rounded">回写进度</span>
                <ArrowRight className="w-6 h-6 text-green-500 rotate-180" />
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-orange-500/5">
              <Factory className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <p className="font-medium">MES系统</p>
              <p className="text-sm text-muted-foreground">生产执行</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <h5 className="font-medium flex items-center gap-2 mb-2">
                <Download className="w-4 h-4 text-primary" />
                从MES拉取
              </h5>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 工单执行状态</li>
                <li>• 工序完成进度</li>
                <li>• 操作人员信息</li>
                <li>• 异常报警记录</li>
              </ul>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <h5 className="font-medium flex items-center gap-2 mb-2">
                <Upload className="w-4 h-4 text-green-500" />
                回写到项目
              </h5>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 更新项目阶段进度</li>
                <li>• 同步实际完成时间</li>
                <li>• 记录生产异常</li>
                <li>• 触发后续流程</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}
