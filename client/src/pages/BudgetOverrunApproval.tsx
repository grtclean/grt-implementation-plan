import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, StatCard } from "@/components/grt";
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
      toast.success(t("finance.overrun.approveSuccess"));
      setIsApproveDialogOpen(false);
      setApprovalComment('');
      refetch();
    },
    onError: (error) => {
      toast.error(`${t("finance.overrun.approveFailed")}: ${error.message}`);
    },
  });

  // 审批拒绝mutation
  const rejectMutation = trpc.budgetOverrunApproval.reject.useMutation({
    onSuccess: () => {
      toast.success(t("finance.overrun.rejectSuccess"));
      setIsRejectDialogOpen(false);
      setApprovalComment('');
      refetch();
    },
    onError: (error) => {
      toast.error(`${t("finance.overrun.operationFailed")}: ${error.message}`);
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
      toast.error(t("finance.overrun.rejectReasonRequired"));
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
        return t("finance.overrun.overrunMinor");
      case 'moderate':
        return t("finance.overrun.overrunModerate");
      case 'significant':
        return t("finance.overrun.overrunSignificant");
      case 'critical':
        return t("finance.overrun.overrunCritical");
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
        return t("finance.overrun.pending");
      case 'approved':
        return t("finance.overrun.approved");
      case 'rejected':
        return t("finance.overrun.rejected");
      case 'cancelled':
        return t("finance.overrun.cancelled");
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
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={AlertTriangle}
          title={t("finance.overrun.title")}
          description={t("finance.overrun.desc")}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t("finance.overrun.refresh")}
            </Button>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Clock} label={t("finance.overrun.pending")} value={stats.pending} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
          <StatCard icon={CheckCircle2} label={t("finance.overrun.approved")} value={stats.approved} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={XCircle} label={t("finance.overrun.rejected")} value={stats.rejected} iconColor="text-red-500" iconBg="bg-red-500/10" />
          <StatCard icon={FileText} label={t("finance.overrun.total")} value={stats.total} />
        </div>

        {/* 筛选和列表 */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t("finance.overrun.approvalList")}</CardTitle>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ApprovalStatus)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("finance.overrun.all")}</SelectItem>
                  <SelectItem value="pending">{t("finance.overrun.pending")}</SelectItem>
                  <SelectItem value="approved">{t("finance.overrun.approved")}</SelectItem>
                  <SelectItem value="rejected">{t("finance.overrun.rejected")}</SelectItem>
                  <SelectItem value="cancelled">{t("finance.overrun.cancelled")}</SelectItem>
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
                          <span className="text-muted-foreground">{t("finance.overrun.overrunLabel")}</span>
                          <span className="font-bold text-red-500">
                            ¥{approval.overrunAmount?.toLocaleString()} ({approval.overrunPercentage?.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("finance.overrun.approvalProgressLabel")}{approval.currentStep}/{approval.totalSteps}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("finance.overrun.noRecords")}</p>
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
                {t("finance.overrun.detailTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("finance.overrun.detailDesc")}
              </DialogDescription>
            </DialogHeader>
            {selectedApproval && (
              <div className="space-y-4">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t("finance.overrun.applicant")}</p>
                    <p className="font-medium">{selectedApproval.employeeName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t("finance.overrun.department")}</p>
                    <p className="font-medium">{selectedApproval.department}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t("finance.overrun.destination")}</p>
                    <p className="font-medium">{selectedApproval.destination}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t("finance.overrun.applyTime")}</p>
                    <p className="font-medium">{new Date(selectedApproval.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* 出差目的 */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("finance.overrun.tripPurpose")}</p>
                  <p className="font-medium">{selectedApproval.tripPurpose}</p>
                </div>

                {/* 费用信息 */}
                <div className="p-4 bg-muted/20 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("finance.overrun.budgetAmount")}</span>
                    <span className="font-medium">¥{selectedApproval.budgetAmount?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("finance.overrun.actualAmount")}</span>
                    <span className="font-medium">¥{selectedApproval.actualAmount?.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex items-center justify-between">
                    <span className="text-sm font-medium">{t("finance.overrun.overrunAmount")}</span>
                    <span className="font-bold text-red-500">
                      ¥{selectedApproval.overrunAmount?.toLocaleString()} ({selectedApproval.overrunPercentage?.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* 超支等级 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("finance.overrun.overrunLevel")}:</span>
                  <Badge className={getOverrunLevelColor(selectedApproval.overrunLevel)}>
                    {getOverrunLevelText(selectedApproval.overrunLevel)}
                  </Badge>
                </div>

                {/* 超支原因 */}
                {selectedApproval.reason && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t("finance.overrun.overrunReason")}</p>
                    <p className="p-3 bg-muted/20 rounded-lg text-sm">{selectedApproval.reason}</p>
                  </div>
                )}

                {/* 审批进度 */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t("finance.overrun.approvalProgress")}</p>
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
                    {t("finance.overrun.reject")}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsDetailOpen(false);
                      setIsApproveDialogOpen(true);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {t("finance.overrun.approve")}
                  </Button>
                </>
              )}
              {selectedApproval?.status !== 'pending' && (
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  {t("finance.overrun.close")}
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
                {t("finance.overrun.confirmApprove")}
              </DialogTitle>
              <DialogDescription>
                {t("finance.overrun.confirmApproveDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("finance.overrun.comment")}</label>
                <Textarea
                  placeholder={t("finance.overrun.commentPlaceholder")}
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                {t("finance.overrun.close")}
              </Button>
              <Button onClick={handleApprove} disabled={approveMutation.isPending}>
                {approveMutation.isPending ? t("finance.overrun.processing") : t("finance.overrun.confirmApproveBtn")}
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
                {t("finance.overrun.confirmReject")}
              </DialogTitle>
              <DialogDescription>
                {t("finance.overrun.confirmRejectDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("finance.overrun.rejectReason")} <span className="text-red-500">*</span></label>
                <Textarea
                  placeholder={t("finance.overrun.rejectPlaceholder")}
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                {t("finance.overrun.close")}
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
                {rejectMutation.isPending ? t("finance.overrun.processing") : t("finance.overrun.confirmRejectBtn")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
