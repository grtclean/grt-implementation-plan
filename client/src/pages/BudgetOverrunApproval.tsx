import { useAuth } from "@/_core/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  RefreshCw,
  ChevronRight,
  Building2,
  Plane
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ApprovalStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';

interface OverrunApproval {
  id: string;
  tripRequestId: string;
  employeeName: string;
  department: string;
  destination: string;
  tripPurpose: string;
  budgetAmount: number;
  actualAmount: number;
  overrunAmount: number;
  overrunPercentage: number;
  overrunLevel: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  createdAt: string;
  reason?: string;
}

export default function BudgetOverrunApproval() {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus>('pending');
  const [selectedApproval, setSelectedApproval] = useState<OverrunApproval | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 获取待审批列表
  const { data: approvalList, isLoading, refetch } = (trpc.budgetOverrunApproval.getPendingApprovals as any).useQuery({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  // 审批通过mutation
  const approveMutation = trpc.budgetOverrunApproval.approve.useMutation({
    onSuccess: () => {
      toast.success('审批通过成功');
      setIsApproveDialogOpen(false);
      setApprovalComment('');
      refetch();
    },
    onError: (error) => {
      toast.error(`审批失败: ${error.message}`);
    },
  });

  // 审批拒绝mutation
  const rejectMutation = trpc.budgetOverrunApproval.reject.useMutation({
    onSuccess: () => {
      toast.success('已拒绝该申请');
      setIsRejectDialogOpen(false);
      setApprovalComment('');
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleApprove = () => {
    if (!selectedApproval) return;
    approveMutation.mutate({
      approvalId: selectedApproval.id,
      comment: approvalComment,
    });
  };

  const handleReject = () => {
    if (!selectedApproval) return;
    if (!approvalComment.trim()) {
      toast.error('请填写拒绝原因');
      return;
    }
    rejectMutation.mutate({
      approvalId: selectedApproval.id,
      comment: approvalComment,
    });
  };

  // 超支等级颜色
  const getOverrunLevelColor = (level: string) => {
    switch (level) {
      case 'minor':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'moderate':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'significant':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'critical':
        return 'bg-red-700/10 text-red-700 border-red-700/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // 超支等级文本
  const getOverrunLevelText = (level: string) => {
    switch (level) {
      case 'minor':
        return '轻微超支 (0-20%)';
      case 'moderate':
        return '中度超支 (20-50%)';
      case 'significant':
        return '严重超支 (50-100%)';
      case 'critical':
        return '极度超支 (>100%)';
      default:
        return level;
    }
  };

  // 状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'approved':
        return 'bg-green-500/10 text-green-500';
      case 'rejected':
        return 'bg-red-500/10 text-red-500';
      case 'cancelled':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // 状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待审批';
      case 'approved':
        return '已通过';
      case 'rejected':
        return '已拒绝';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  // 统计数据
  const stats = {
    pending: approvalList?.filter((a: OverrunApproval) => a.status === 'pending').length || 0,
    approved: approvalList?.filter((a: OverrunApproval) => a.status === 'approved').length || 0,
    rejected: approvalList?.filter((a: OverrunApproval) => a.status === 'rejected').length || 0,
    total: approvalList?.length || 0,
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-primary" />
              预算超支审批
            </h1>
            <p className="text-muted-foreground mt-1">
              审批出差费用超出预算的申请
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-sm bg-yellow-500/10">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">待审批</p>
                  <p className="text-2xl font-bold font-heading">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-sm bg-green-500/10">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">已通过</p>
                  <p className="text-2xl font-bold font-heading">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-sm bg-red-500/10">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">已拒绝</p>
                  <p className="text-2xl font-bold font-heading">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-sm bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">总计</p>
                  <p className="text-2xl font-bold font-heading">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选和列表 */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">审批列表</CardTitle>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ApprovalStatus)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="pending">待审批</SelectItem>
                  <SelectItem value="approved">已通过</SelectItem>
                  <SelectItem value="rejected">已拒绝</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border border-border/50 rounded-lg">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-4 w-32 mb-4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : approvalList && approvalList.length > 0 ? (
              <div className="space-y-4">
                {approvalList.map((approval: OverrunApproval) => (
                  <div
                    key={approval.id}
                    className="p-4 border border-border/50 rounded-lg hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedApproval(approval);
                      setIsDetailOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{approval.employeeName}</span>
                          <Badge variant="outline" className="text-xs">
                            {approval.department}
                          </Badge>
                          <Badge className={getStatusColor(approval.status)}>
                            {getStatusText(approval.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Plane className="w-3 h-3" />
                            {approval.destination}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(approval.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {approval.tripPurpose}
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        <Badge className={getOverrunLevelColor(approval.overrunLevel)}>
                          {getOverrunLevelText(approval.overrunLevel)}
                        </Badge>
                        <div className="text-sm">
                          <span className="text-muted-foreground">超支: </span>
                          <span className="font-bold text-red-500">
                            ¥{approval.overrunAmount?.toLocaleString()} ({approval.overrunPercentage?.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          审批进度: {approval.currentStep}/{approval.totalSteps}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无审批记录</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 详情弹窗 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                预算超支审批详情
              </DialogTitle>
              <DialogDescription>
                查看超支详情并进行审批操作
              </DialogDescription>
            </DialogHeader>
            {selectedApproval && (
              <div className="space-y-4">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">申请人</p>
                    <p className="font-medium">{selectedApproval.employeeName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">部门</p>
                    <p className="font-medium">{selectedApproval.department}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">出差目的地</p>
                    <p className="font-medium">{selectedApproval.destination}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">申请时间</p>
                    <p className="font-medium">{new Date(selectedApproval.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* 出差目的 */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">出差目的</p>
                  <p className="font-medium">{selectedApproval.tripPurpose}</p>
                </div>

                {/* 费用信息 */}
                <div className="p-4 bg-muted/20 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">预算金额</span>
                    <span className="font-medium">¥{selectedApproval.budgetAmount?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">实际金额</span>
                    <span className="font-medium">¥{selectedApproval.actualAmount?.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex items-center justify-between">
                    <span className="text-sm font-medium">超支金额</span>
                    <span className="font-bold text-red-500">
                      ¥{selectedApproval.overrunAmount?.toLocaleString()} ({selectedApproval.overrunPercentage?.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* 超支等级 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">超支等级:</span>
                  <Badge className={getOverrunLevelColor(selectedApproval.overrunLevel)}>
                    {getOverrunLevelText(selectedApproval.overrunLevel)}
                  </Badge>
                </div>

                {/* 超支原因 */}
                {selectedApproval.reason && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">超支原因</p>
                    <p className="p-3 bg-muted/20 rounded-lg text-sm">{selectedApproval.reason}</p>
                  </div>
                )}

                {/* 审批进度 */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">审批进度</p>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: selectedApproval.totalSteps }).map((_, i) => (
                      <div key={i} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          i < selectedApproval.currentStep
                            ? 'bg-green-500 text-white'
                            : i === selectedApproval.currentStep
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {i + 1}
                        </div>
                        {i < selectedApproval.totalSteps - 1 && (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              {selectedApproval?.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDetailOpen(false);
                      setIsRejectDialogOpen(true);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    拒绝
                  </Button>
                  <Button
                    onClick={() => {
                      setIsDetailOpen(false);
                      setIsApproveDialogOpen(true);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    通过
                  </Button>
                </>
              )}
              {selectedApproval?.status !== 'pending' && (
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  关闭
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 审批通过弹窗 */}
        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                确认通过
              </DialogTitle>
              <DialogDescription>
                确认通过该预算超支申请
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">审批意见 (可选)</label>
                <Textarea
                  placeholder="请输入审批意见..."
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleApprove} disabled={approveMutation.isPending}>
                {approveMutation.isPending ? '处理中...' : '确认通过'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 审批拒绝弹窗 */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                确认拒绝
              </DialogTitle>
              <DialogDescription>
                确认拒绝该预算超支申请
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">拒绝原因 <span className="text-red-500">*</span></label>
                <Textarea
                  placeholder="请输入拒绝原因..."
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
                {rejectMutation.isPending ? '处理中...' : '确认拒绝'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
