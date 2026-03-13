/**
 * 审批管理页面
 */
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { t } = useLanguage();
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
      toast({ title: t("admin.approval.approveSuccess"), description: t("admin.approval.approveSuccessDesc") });
    },
    onError: (error) => {
      toast({ title: t("admin.approval.approveFailed"), description: error.message, variant: 'destructive' });
    },
  });

  const rejectMutation = trpc.approval.rejectTask.useMutation({
    onSuccess: () => {
      toast({ title: t("admin.approval.rejected"), description: t("admin.approval.rejectedDesc") });
    },
    onError: (error) => {
      toast({ title: t("admin.approval.operationFailed"), description: error.message, variant: 'destructive' });
    },
  });

  const handleApprove = (taskId: number) => {
    approveMutation.mutate({ taskId, comments: '' } as any);
  };

  const handleReject = (taskId: number) => {
    rejectMutation.mutate({ taskId, comments: '', actionReason: t("admin.approval.doesNotMeetRequirements") } as any);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{t("admin.approval.statusPending")}</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t("admin.approval.statusApproved")}</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{t("admin.approval.statusRejected")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Clock}
        title={t("admin.approval.title")}
        description={t("admin.approval.description")}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label={t("admin.approval.statusPending")}
          value={statsData?.pendingTasksCount || 0}
          subtitle={t("admin.approval.needsHandling")}
          iconColor="text-orange-500"
          iconBg="bg-orange-50"
        />
        <StatCard
          icon={AlertCircle}
          label={t("admin.approval.overdueTasks")}
          value={statsData?.overdueTasksCount || 0}
          subtitle={t("admin.approval.urgentHandling")}
          iconColor="text-red-500"
          iconBg="bg-red-50"
        />
        <StatCard
          icon={Clock}
          label={t("admin.approval.avgApprovalTime")}
          value={`${statsData?.averageApprovalTime || 0} ${t("admin.approval.minutes")}`}
          subtitle={t("admin.approval.monthlyAvg")}
        />
        <StatCard
          icon={CheckCircle}
          label={t("admin.approval.processedThisMonth")}
          value={(statsData as any)?.completedThisMonth || 0}
          subtitle={t("admin.approval.approvalCompleted")}
          iconColor="text-green-500"
          iconBg="bg-green-50"
        />
      </div>

      {/* 审批任务列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("admin.approval.taskList")}</CardTitle>
              <CardDescription>{t("admin.approval.taskListDesc")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("admin.approval.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t("admin.approval.statusFilter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.approval.all")}</SelectItem>
                  <SelectItem value="pending">{t("admin.approval.statusPending")}</SelectItem>
                  <SelectItem value="approved">{t("admin.approval.statusApproved")}</SelectItem>
                  <SelectItem value="rejected">{t("admin.approval.statusRejected")}</SelectItem>
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
                {t("admin.approval.statusPending")}
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {t("admin.approval.statusApproved")}
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                {t("admin.approval.statusRejected")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">{t("admin.approval.loading")}</div>
              ) : tasksData?.items && tasksData.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.approval.taskNumber")}</TableHead>
                      <TableHead>{t("admin.approval.type")}</TableHead>
                      <TableHead>{t("admin.approval.titleCol")}</TableHead>
                      <TableHead>{t("admin.approval.applicant")}</TableHead>
                      <TableHead>{t("admin.approval.submitTime")}</TableHead>
                      <TableHead>{t("admin.approval.status")}</TableHead>
                      <TableHead className="text-right">{t("admin.approval.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasksData.items.map((task: any) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-mono">{task.taskNumber || `APR-${task.id}`}</TableCell>
                        <TableCell>{task.type || t("admin.approval.purchaseRequest")}</TableCell>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>{task.applicantName || t("admin.approval.unknown")}</TableCell>
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
                              {t("admin.approval.approve")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleReject(task.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              {t("admin.approval.reject")}
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
                  <p>{t("admin.approval.noPendingTasks")}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t("admin.approval.approvedList")}</p>
              </div>
            </TabsContent>

            <TabsContent value="rejected" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <XCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t("admin.approval.rejectedList")}</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
