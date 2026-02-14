/**
 * 变更治理管理页面 - 试点A
 * CR→CAB→Release→Ack 全闭环
 */

import { useAuth } from "@/_core/hooks/useAuth";
import Layout from "@/components/Layout";
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

const statusLabels: Record<string, string> = {
  draft: "草稿",
  submitted: "已提交",
  under_review: "审批中",
  approved: "已批准",
  rejected: "已拒绝",
  scheduled: "已排期",
  deployed: "已部署",
  closed: "已关闭",
  cancelled: "已取消",
};

export default function ChangeManagement() {
  const { user } = useAuth();
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
      toast.success("变更请求已创建");
      setIsCreateDialogOpen(false);
      refetchCRs();
      resetForm();
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });

  const submitCRMutation = (trpc.changeManagement as any).submitChangeRequest.useMutation({
    onSuccess: () => {
      toast.success("变更请求已提交审批");
      refetchCRs();
    },
    onError: (error) => {
      toast.error("提交失败: " + error.message);
    },
  });

  const approvalMutation = (trpc.changeManagement as any).submitApprovalDecision.useMutation({
    onSuccess: () => {
      toast.success("审批决策已提交");
      refetchApprovals();
      refetchCRs();
    },
    onError: (error) => {
      toast.error("审批失败: " + error.message);
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
      comments: decision === "approved" ? "同意" : "不同意",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={GitBranch}
          title="变更治理中心"
          description="CR→CAB→Release→Ack 全闭环管理"
          actions={
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  新建变更请求
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>新建变更请求 (CR)</DialogTitle>
                <DialogDescription>
                  填写变更请求信息，提交后将进入CAB审批流程
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">变更标题 *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="简要描述变更内容"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">优先级 *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P0">P0 - 紧急</SelectItem>
                      <SelectItem value="P1">P1 - 高</SelectItem>
                      <SelectItem value="P2">P2 - 中</SelectItem>
                      <SelectItem value="P3">P3 - 低</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">详细描述 *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="详细说明变更内容、原因和预期效果"
                    rows={4}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="affectedSystems">影响系统（逗号分隔）</Label>
                  <Input
                    id="affectedSystems"
                    value={formData.affectedSystems}
                    onChange={(e) => setFormData({ ...formData, affectedSystems: e.target.value })}
                    placeholder="如：CRM, ERP, 财务系统"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="impactAssessment">影响评估 *</Label>
                  <Textarea
                    id="impactAssessment"
                    value={formData.impactAssessment}
                    onChange={(e) => setFormData({ ...formData, impactAssessment: e.target.value })}
                    placeholder="评估变更对业务和系统的影响"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rollbackPlan">回滚方案 *</Label>
                  <Textarea
                    id="rollbackPlan"
                    value={formData.rollbackPlan}
                    onChange={(e) => setFormData({ ...formData, rollbackPlan: e.target.value })}
                    placeholder="如果变更失败，如何回滚到之前状态"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="testPlan">测试计划 *</Label>
                  <Textarea
                    id="testPlan"
                    value={formData.testPlan}
                    onChange={(e) => setFormData({ ...formData, testPlan: e.target.value })}
                    placeholder="变更前后的测试验证计划"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button 
                  onClick={handleCreateCR}
                  disabled={createCRMutation.isPending || !formData.title || !formData.description}
                >
                  {createCRMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  创建
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
              <CardTitle className="text-sm font-medium">变更请求总数</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCRs || 0}</div>
              <p className="text-xs text-muted-foreground">所有CR记录</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">待审批</CardTitle>
              <Clock className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats?.pendingApproval || 0}</div>
              <p className="text-xs text-muted-foreground">等待CAB审批</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">本月已部署</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats?.deployedThisMonth || 0}</div>
              <p className="text-xs text-muted-foreground">成功上线</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">确认率</CardTitle>
              <Users className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats?.ackRate || 0}%</div>
              <p className="text-xs text-muted-foreground">目标 ≥90%</p>
            </CardContent>
          </Card>
        </div>

        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              变更请求
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              我的审批
              {pendingApprovals && pendingApprovals.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingApprovals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="releases" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              发布管理
            </TabsTrigger>
            <TabsTrigger value="cab" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              CAB成员
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              审计日志
            </TabsTrigger>
          </TabsList>

          {/* 变更请求列表 */}
          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>变更请求列表</CardTitle>
                <CardDescription>所有变更请求的状态和进度</CardDescription>
              </CardHeader>
              <CardContent>
                {crLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : crList?.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无变更请求，点击右上角按钮创建
                  </div>
                ) : (
                  <div className="space-y-3">
                    {crList?.items.map((cr) => (
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
                            {statusLabels[cr.status]}
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
                              提交审批
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
                <CardTitle>待我审批</CardTitle>
                <CardDescription>需要您审批的变更请求</CardDescription>
              </CardHeader>
              <CardContent>
                {!pendingApprovals || pendingApprovals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    暂无待审批项
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApprovals.map(({ approval, changeRequest }) => (
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
                            申请人: {changeRequest.requesterName}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                          <div><strong>描述:</strong> {changeRequest.description}</div>
                          <div><strong>影响评估:</strong> {changeRequest.impactAssessment}</div>
                          <div><strong>回滚方案:</strong> {changeRequest.rollbackPlan}</div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => handleApproval(approval.id, "rejected")}
                            disabled={approvalMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1 text-red-500" />
                            拒绝
                          </Button>
                          <Button
                            onClick={() => handleApproval(approval.id, "approved")}
                            disabled={approvalMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            批准
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
                <CardTitle>发布列表</CardTitle>
                <CardDescription>已创建的发布版本</CardDescription>
              </CardHeader>
              <CardContent>
                {!releases || releases.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无发布记录
                  </div>
                ) : (
                  <div className="space-y-3">
                    {releases.items.map((release) => (
                      <div
                        key={release.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{release.releaseNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            版本: {release.version} | 包含 {release.changeRequestIds.length} 个CR
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
                <CardTitle>CAB成员配置</CardTitle>
                <CardDescription>变更顾问委员会成员列表</CardDescription>
              </CardHeader>
              <CardContent>
                {!cabMembers || cabMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
                    尚未配置CAB成员
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cabMembers.map((member) => (
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
                            <Badge variant="destructive">必须</Badge>
                          )}
                          <Badge variant="outline">
                            {member.priorityLevels.join(", ")}
                          </Badge>
                          <Badge variant={member.isActive ? "default" : "secondary"}>
                            {member.isActive ? "启用" : "禁用"}
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
                <CardTitle>审计日志</CardTitle>
                <CardDescription>变更治理操作记录</CardDescription>
              </CardHeader>
              <CardContent>
                {!auditLogs || auditLogs.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无审计日志
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.items.map((log) => (
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
    </Layout>
  );
}
