/**
 * 变更治理管理页面 - 试点A
 * CR→CAB→Release→Ack 全闭环
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  GitBranch, 
  Loader2, 
  Package, 
  Plus, 
  RefreshCw, 
  Send, 
  Shield, 
  Users, 
  XCircle 
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// 状态颜色映射
const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  submitted: "bg-blue-500",
  under_review: "bg-yellow-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
  scheduled: "bg-purple-500",
  deployed: "bg-emerald-500",
  closed: "bg-gray-700",
  cancelled: "bg-gray-400",
};

const priorityColors: Record<string, string> = {
  P0: "bg-red-600",
  P1: "bg-orange-500",
  P2: "bg-yellow-500",
  P3: "bg-blue-500",
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  draft: "projects.change.statusDraft",
  submitted: "projects.change.statusSubmitted",
  under_review: "projects.change.statusUnderReview",
  approved: "projects.change.statusApproved",
  rejected: "projects.change.statusRejectedLabel",
  scheduled: "projects.change.statusScheduled",
  deployed: "projects.change.statusDeployed",
  closed: "projects.change.statusClosed",
  cancelled: "projects.change.statusCancelled",
};

export default function ChangeManagement() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("requests");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCR, setSelectedCR] = useState<string | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "P2" as "P0" | "P1" | "P2" | "P3",
    affectedSystems: "",
    impactAssessment: "",
    rollbackPlan: "",
    testPlan: "",
  });

  // 查询
  const { data: stats, isLoading: statsLoading } = (trpc.changeManagement as any).getStats.useQuery();
  const { data: crList, isLoading: crLoading, refetch: refetchCRs } = (trpc.changeManagement as any).listChangeRequests.useQuery({
    page: 1,
    pageSize: 50,
  });
  const { data: pendingApprovals, refetch: refetchApprovals } = (trpc.changeManagement as any).getMyPendingApprovals.useQuery();
  const { data: releases, refetch: refetchReleases } = (trpc.changeManagement as any).listReleases.useQuery({
    page: 1,
    pageSize: 20,
  });
  const { data: cabMembers } = (trpc.changeManagement as any).getCABMembers.useQuery();
  const { data: auditLogs } = (trpc.changeManagement as any).getAuditLogs.useQuery({ pageSize: 20 });

  // Mutations
  const createCRMutation = (trpc.changeManagement as any).createChangeRequest.useMutation({
    onSuccess: () => {
      toast.success(t("projects.change.crCreated"));
      setIsCreateDialogOpen(false);
      refetchCRs();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(t("projects.change.createFailed") + ": " + error.message);
    },
  });

  const submitCRMutation = (trpc.changeManagement as any).submitChangeRequest.useMutation({
    onSuccess: () => {
      toast.success(t("projects.change.crSubmitted"));
      refetchCRs();
    },
    onError: (error: any) => {
      toast.error(t("projects.change.submitFailed") + ": " + error.message);
    },
  });

  const approvalMutation = (trpc.changeManagement as any).submitApprovalDecision.useMutation({
    onSuccess: () => {
      toast.success(t("projects.change.decisionSubmitted"));
      refetchApprovals();
      refetchCRs();
    },
    onError: (error: any) => {
      toast.error(t("projects.change.decisionFailed") + ": " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "P2",
      affectedSystems: "",
      impactAssessment: "",
      rollbackPlan: "",
      testPlan: "",
    });
  };

  const handleCreateCR = () => {
    createCRMutation.mutate({
      ...formData,
      affectedSystems: formData.affectedSystems.split(",").map(s => s.trim()).filter(Boolean),
    });
  };

  const handleSubmitCR = (id: string) => {
    submitCRMutation.mutate({ id });
  };

  const handleApproval = (approvalId: string, decision: "approved" | "rejected") => {
    approvalMutation.mutate({
      approvalId,
      decision,
      comments: decision === "approved" ? t("projects.change.agree") : t("projects.change.disagree"),
    });
  };

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={GitBranch}
          title={t("projects.change.title")}
          description={t("projects.change.description")}
          actions={
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("projects.change.newCR")}
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("projects.change.newCRTitle")}</DialogTitle>
                <DialogDescription>
                  {t("projects.change.newCRDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">{t("projects.change.changeTitle")} *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t("projects.change.changeTitlePlaceholder")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">{t("projects.change.priorityLabel")} *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P0">P0 - {t("projects.priority.critical")}</SelectItem>
                      <SelectItem value="P1">P1 - {t("projects.priority.high")}</SelectItem>
                      <SelectItem value="P2">P2 - {t("projects.priority.medium")}</SelectItem>
                      <SelectItem value="P3">P3 - {t("projects.priority.low")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">{t("projects.change.detailedDescription")} *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t("projects.change.detailedDescPlaceholder")}
                    rows={4}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="affectedSystems">{t("projects.change.affectedSystems")}</Label>
                  <Input
                    id="affectedSystems"
                    value={formData.affectedSystems}
                    onChange={(e) => setFormData({ ...formData, affectedSystems: e.target.value })}
                    placeholder={t("projects.change.affectedSystemsPlaceholder")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="impactAssessment">{t("projects.change.impactAssessment")} *</Label>
                  <Textarea
                    id="impactAssessment"
                    value={formData.impactAssessment}
                    onChange={(e) => setFormData({ ...formData, impactAssessment: e.target.value })}
                    placeholder={t("projects.change.impactAssessmentPlaceholder")}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rollbackPlan">{t("projects.change.rollbackPlan")} *</Label>
                  <Textarea
                    id="rollbackPlan"
                    value={formData.rollbackPlan}
                    onChange={(e) => setFormData({ ...formData, rollbackPlan: e.target.value })}
                    placeholder={t("projects.change.rollbackPlanPlaceholder")}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="testPlan">{t("projects.change.testPlan")} *</Label>
                  <Textarea
                    id="testPlan"
                    value={formData.testPlan}
                    onChange={(e) => setFormData({ ...formData, testPlan: e.target.value })}
                    placeholder={t("projects.change.testPlanPlaceholder")}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  {t("projects.change.cancel")}
                </Button>
                <Button
                  onClick={handleCreateCR}
                  disabled={createCRMutation.isPending || !formData.title || !formData.description}
                >
                  {createCRMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("projects.change.createBtn")}
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("projects.change.totalCRs")}</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCRs || 0}</div>
              <p className="text-xs text-muted-foreground">{t("projects.change.allCRRecords")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("projects.change.pendingApproval")}</CardTitle>
              <Clock className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats?.pendingApproval || 0}</div>
              <p className="text-xs text-muted-foreground">{t("projects.change.awaitingCAB")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("projects.change.deployedThisMonth")}</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats?.deployedThisMonth || 0}</div>
              <p className="text-xs text-muted-foreground">{t("projects.change.successfullyLaunched")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("projects.change.ackRate")}</CardTitle>
              <Users className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats?.ackRate || 0}%</div>
              <p className="text-xs text-muted-foreground">{t("projects.change.targetAbove90")}</p>
            </CardContent>
          </Card>
        </div>

        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t("projects.change.tabRequests")}
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {t("projects.change.tabApprovals")}
              {pendingApprovals && pendingApprovals.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingApprovals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="releases" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t("projects.change.tabReleases")}
            </TabsTrigger>
            <TabsTrigger value="cab" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t("projects.change.tabCAB")}
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              {t("projects.change.tabAudit")}
            </TabsTrigger>
          </TabsList>

          {/* 变更请求列表 */}
          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("projects.change.crList")}</CardTitle>
                <CardDescription>{t("projects.change.crListDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {crLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : crList?.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("projects.change.noCRsHint")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {crList?.items.map((cr: any) => (
                      <div
                        key={cr.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Badge className={priorityColors[cr.priority]}>{cr.priority}</Badge>
                          <div>
                            <div className="font-medium">{cr.crNumber}</div>
                            <div className="text-sm text-muted-foreground">{cr.title}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={statusColors[cr.status]}>
                            {t(STATUS_LABEL_KEYS[cr.status] || cr.status)}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {cr.requesterName}
                          </div>
                          {cr.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={() => handleSubmitCR(cr.id)}
                              disabled={submitCRMutation.isPending}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              {t("projects.change.submitApproval")}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 我的审批 */}
          <TabsContent value="approvals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("projects.change.pendingMyApproval")}</CardTitle>
                <CardDescription>{t("projects.change.pendingMyApprovalDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {!pendingApprovals || pendingApprovals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    {t("projects.change.noPendingApprovals")}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApprovals.map(({ approval, changeRequest }: any) => (
                      <div
                        key={approval.id}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className={priorityColors[changeRequest.priority]}>
                              {changeRequest.priority}
                            </Badge>
                            <div>
                              <div className="font-medium">{changeRequest.crNumber}</div>
                              <div className="text-sm">{changeRequest.title}</div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("projects.change.applicant")}: {changeRequest.requesterName}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                          <div><strong>{t("projects.change.descriptionLabel")}</strong> {changeRequest.description}</div>
                          <div><strong>{t("projects.change.impactLabel")}</strong> {changeRequest.impactAssessment}</div>
                          <div><strong>{t("projects.change.rollbackLabel")}</strong> {changeRequest.rollbackPlan}</div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => handleApproval(approval.id, "rejected")}
                            disabled={approvalMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1 text-red-500" />
                            {t("projects.change.rejectBtn")}
                          </Button>
                          <Button
                            onClick={() => handleApproval(approval.id, "approved")}
                            disabled={approvalMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            {t("projects.change.approveBtn")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 发布管理 */}
          <TabsContent value="releases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("projects.change.releaseList")}</CardTitle>
                <CardDescription>{t("projects.change.releaseListDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {!releases || releases.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("projects.change.noReleases")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {releases.items.map((release: any) => (
                      <div
                        key={release.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{release.releaseNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {t("projects.change.version")}: {release.version} | {release.changeRequestIds.length} {t("projects.change.containsCRs")}
                          </div>
                        </div>
                        <Badge variant="outline">{release.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CAB成员 */}
          <TabsContent value="cab" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("projects.change.cabConfig")}</CardTitle>
                <CardDescription>{t("projects.change.cabConfigDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {!cabMembers || cabMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
                    {t("projects.change.noCABMembers")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cabMembers.map((member: any) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{member.userName}</div>
                            <div className="text-sm text-muted-foreground">{member.role}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.isMandatory && (
                            <Badge variant="destructive">{t("projects.change.mandatory")}</Badge>
                          )}
                          <Badge variant="outline">
                            {member.priorityLevels.join(", ")}
                          </Badge>
                          <Badge variant={member.isActive ? "default" : "secondary"}>
                            {member.isActive ? t("projects.change.enabled") : t("projects.change.disabled")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 审计日志 */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("projects.change.auditLog")}</CardTitle>
                <CardDescription>{t("projects.change.auditLogDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {!auditLogs || auditLogs.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("projects.change.noAuditLogs")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.items.map((log: any) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{log.entityType}</Badge>
                          <span>{log.action}</span>
                          <span className="text-muted-foreground">by {log.performerName}</span>
                        </div>
                        <div className="text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("zh-CN")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
