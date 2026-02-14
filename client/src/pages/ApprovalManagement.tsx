/**
 * 审批管理页面
 */
import { useState } from 'react';
import Layout from '@/components/Layout';
import { PageHeader, StatCard } from '@/components/grt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle, Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

export default function ApprovalManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [activeTab, setActiveTab] = useState('pending');

  // 获取待审批任务
  const { data: tasksData, isLoading } = trpc.approval.getMyApprovalTasks.useQuery({
    status: selectedStatus as any,
    page: 1,
    pageSize: 20,
  });

  // 获取审批统计
  const { data: statsData } = trpc.approval.getApprovalStats.useQuery();

  // 审批操作
  const approveMutation = trpc.approval.approveTask.useMutation({
    onSuccess: () => {
      toast({ title: '审批成功', description: '任务已通过审批' });
    },
    onError: (error) => {
      toast({ title: '审批失败', description: error.message, variant: 'destructive' });
    },
  });

  const rejectMutation = trpc.approval.rejectTask.useMutation({
    onSuccess: () => {
      toast({ title: '已拒绝', description: '任务已被拒绝' });
    },
    onError: (error) => {
      toast({ title: '操作失败', description: error.message, variant: 'destructive' });
    },
  });

  const handleApprove = (taskId: number) => {
    approveMutation.mutate({ taskId, comments: '' } as any);
  };

  const handleReject = (taskId: number) => {
    rejectMutation.mutate({ taskId, comments: '', actionReason: '不符合要求' } as any);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">待审批</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">已通过</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">已拒绝</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Layout>
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Clock}
        title="审批管理"
        description="处理待审批的采购申请、订单和其他文件"
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="待审批"
          value={statsData?.pendingTasksCount || 0}
          subtitle="需要处理"
          iconColor="text-orange-500"
          iconBg="bg-orange-50"
        />
        <StatCard
          icon={AlertCircle}
          label="超期任务"
          value={statsData?.overdueTasksCount || 0}
          subtitle="紧急处理"
          iconColor="text-red-500"
          iconBg="bg-red-50"
        />
        <StatCard
          icon={Clock}
          label="平均审批时间"
          value={`${statsData?.averageApprovalTime || 0} 分钟`}
          subtitle="本月平均"
        />
        <StatCard
          icon={CheckCircle}
          label="本月已处理"
          value={(statsData as any)?.completedThisMonth || 0}
          subtitle="审批完成"
          iconColor="text-green-500"
          iconBg="bg-green-50"
        />
      </div>

      {/* 审批任务列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>审批任务</CardTitle>
              <CardDescription>查看和处理待审批的任务</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索任务..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="pending">待审批</SelectItem>
                  <SelectItem value="approved">已通过</SelectItem>
                  <SelectItem value="rejected">已拒绝</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending" className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                待审批
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                已通过
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                已拒绝
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : tasksData?.items && tasksData.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>任务编号</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead>申请人</TableHead>
                      <TableHead>提交时间</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasksData.items.map((task: any) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-mono">{task.taskNumber || `APR-${task.id}`}</TableCell>
                        <TableCell>{task.type || '采购申请'}</TableCell>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>{task.applicantName || '未知'}</TableCell>
                        <TableCell>{new Date(task.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleApprove(task.id)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              通过
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleReject(task.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              拒绝
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无待审批任务</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>已通过的审批任务列表</p>
              </div>
            </TabsContent>

            <TabsContent value="rejected" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <XCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>已拒绝的审批任务列表</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}
