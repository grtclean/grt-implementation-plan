/**
 * v1.7.2 薪酬审批工作流面板
 * Salary Approval Workflow Dashboard
 * 
 * 功能：
 * - 审批工作流定义与管理
 * - 提交薪酬审批
 * - 多级审批操作（批准/拒绝）
 * - 审批记录查询与统计
 * - 审批流程可视化
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ClipboardCheck, Plus, CheckCircle2, XCircle, Clock, ArrowRight,
  Send, FileText, Users, BarChart3, AlertTriangle, Eye,
  RefreshCw, ChevronRight, UserCheck, Shield, Banknote
} from "lucide-react";
import { useState, useMemo } from "react";

// 审批状态映射
const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "待审批", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", icon: Clock },
  supervisor_review: { label: "主管审核", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: UserCheck },
  hr_review: { label: "HR确认", color: "bg-purple-500/10 text-purple-400 border-purple-500/30", icon: Users },
  finance_review: { label: "财务审核", color: "bg-orange-500/10 text-orange-400 border-orange-500/30", icon: Banknote },
  approved: { label: "已批准", color: "bg-green-500/10 text-green-400 border-green-500/30", icon: CheckCircle2 },
  rejected: { label: "已拒绝", color: "bg-red-500/10 text-red-400 border-red-500/30", icon: XCircle },
  cancelled: { label: "已取消", color: "bg-muted text-muted-foreground", icon: AlertTriangle },
};

export default function SalaryApproval() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState("records");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [approvalComment, setApprovalComment] = useState("");
  
  // 提交表单状态
  const [submitForm, setSubmitForm] = useState({
    workflowId: 1,
    batchTitle: "",
    totalAmount: 0,
    workerCount: 0,
    periodStart: 0,
    periodEnd: 0,
  });

  // 工作流表单状态
  const [workflowForm, setWorkflowForm] = useState({
    workflowName: "",
    workflowCode: "",
    description: "",
    steps: [
      { step: 1, role: "supervisor", title: "主管审核", required: true },
      { step: 2, role: "hr", title: "HR确认", required: true },
      { step: 3, role: "finance", title: "财务发放", required: true },
    ],
  });

  // 查询
  const recordsQuery = trpc.salaryApproval.getRecords.useQuery({});
  const workflowsQuery = trpc.salaryApproval.getWorkflows.useQuery({});
  const statsQuery = trpc.salaryApproval.getStats.useQuery();

  // 操作
  const submitMutation = trpc.salaryApproval.submit.useMutation({
    onSuccess: () => {
      toast({ title: "提交成功", description: "薪酬审批已提交" });
      setShowSubmitDialog(false);
      recordsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err) => {
      toast({ title: "提交失败", description: err.message, variant: "destructive" });
    },
  });

  const processMutation = trpc.salaryApproval.process.useMutation({
    onSuccess: (data) => {
      toast({
        title: (data as any).action === "approve" ? "已批准" : "已拒绝",
        description: data.message,
      });
      setSelectedRecord(null);
      setApprovalComment("");
      recordsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err) => {
      toast({ title: "操作失败", description: err.message, variant: "destructive" });
    },
  });

  const cancelMutation = trpc.salaryApproval.cancel.useMutation({
    onSuccess: () => {
      toast({ title: "已取消", description: "审批已取消" });
      setSelectedRecord(null);
      recordsQuery.refetch();
      statsQuery.refetch();
    },
  });

  const createWorkflowMutation = trpc.salaryApproval.createWorkflow.useMutation({
    onSuccess: () => {
      toast({ title: "创建成功", description: "审批工作流已创建" });
      setShowWorkflowDialog(false);
      workflowsQuery.refetch();
    },
    onError: (err) => {
      toast({ title: "创建失败", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!submitForm.batchTitle.trim()) {
      toast({ title: "请填写批次标题", variant: "destructive" });
      return;
    }
    submitMutation.mutate(submitForm);
  };

  const handleApprove = (recordId: number) => {
    processMutation.mutate({
      recordId,
      action: "approve",
      comment: approvalComment,
    });
  };

  const handleReject = (recordId: number) => {
    processMutation.mutate({
      recordId,
      action: "reject",
      comment: approvalComment,
    });
  };

  const stats = statsQuery.data as any;
  const records = recordsQuery.data?.records || [];
  const workflows = (workflowsQuery.data as any)?.workflows || workflowsQuery.data || [];

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
            <ClipboardCheck className="w-7 h-7 text-primary" />
            薪酬审批工作流
          </h1>
          <p className="text-muted-foreground mt-1">
            多级审批流程：计算 → 主管审核 → HR确认 → 财务发放
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
            <DialogTrigger asChild>
              <Button>
                <Send className="w-4 h-4 mr-1" />
                提交审批
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>提交薪酬审批</DialogTitle>
                <DialogDescription>填写审批信息并提交到工作流</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">批次标题 *</label>
                  <Input
                    placeholder="如：2026年1月绩效奖金"
                    value={submitForm.batchTitle}
                    onChange={(e) => setSubmitForm(prev => ({ ...prev, batchTitle: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">总金额 (元)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={submitForm.totalAmount || ""}
                      onChange={(e) => setSubmitForm(prev => ({ ...prev, totalAmount: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">涉及人数</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={submitForm.workerCount || ""}
                      onChange={(e) => setSubmitForm(prev => ({ ...prev, workerCount: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>取消</Button>
                <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                  提交
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase">总审批</p>
              <p className="text-lg font-bold">{stats?.total ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-yellow-500/10 text-yellow-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase">待处理</p>
              <p className="text-lg font-bold">{stats?.pending ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-green-500/10 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase">已批准</p>
              <p className="text-lg font-bold">{stats?.approved ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-red-500/10 text-red-400">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase">已拒绝</p>
              <p className="text-lg font-bold">{stats?.rejected ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-400">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase">总金额</p>
              <p className="text-lg font-bold">¥{(stats?.totalAmount ?? 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records">审批记录</TabsTrigger>
          <TabsTrigger value="workflows">工作流定义</TabsTrigger>
          <TabsTrigger value="timeline">审批流程图</TabsTrigger>
        </TabsList>

        {/* 审批记录 */}
        <TabsContent value="records" className="space-y-4">
          {records.length === 0 ? (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-12 text-center">
                <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium mb-2">暂无审批记录</p>
                <p className="text-sm text-muted-foreground mb-4">点击"提交审批"开始第一个薪酬审批流程</p>
                <Button onClick={() => setShowSubmitDialog(true)}>
                  <Send className="w-4 h-4 mr-1" />
                  提交审批
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {records.map((record: any) => {
                const statusInfo = STATUS_MAP[record.status] || STATUS_MAP.pending;
                const StatusIcon = statusInfo.icon;
                return (
                  <Card key={record.id} className="bg-card/50 border-border hover:border-border/80 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-md ${statusInfo.color}`}>
                            <StatusIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">{record.batchTitle}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>¥{(record.totalAmount || 0).toLocaleString()}</span>
                              <span>·</span>
                              <span>{record.workerCount || 0} 人</span>
                              <span>·</span>
                              <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                          {record.currentStep && (
                            <Badge variant="outline" className="text-[10px]">
                              步骤 {record.currentStep}/{record.totalSteps}
                            </Badge>
                          )}
                          {(record.status === "pending" || record.status === "supervisor_review" || record.status === "hr_review" || record.status === "finance_review") && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-400 hover:text-green-300"
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setApprovalComment("");
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 工作流定义 */}
        <TabsContent value="workflows" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  创建工作流
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>创建审批工作流</DialogTitle>
                  <DialogDescription>定义薪酬审批的多级审批步骤</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">工作流名称 *</label>
                    <Input
                      placeholder="如：标准薪酬审批流程"
                      value={workflowForm.workflowName}
                      onChange={(e) => setWorkflowForm(prev => ({ ...prev, workflowName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">工作流编码 *</label>
                    <Input
                      placeholder="如：SALARY_STANDARD"
                      value={workflowForm.workflowCode}
                      onChange={(e) => setWorkflowForm(prev => ({ ...prev, workflowCode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">描述</label>
                    <Textarea
                      placeholder="工作流描述..."
                      value={workflowForm.description}
                      onChange={(e) => setWorkflowForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">审批步骤</label>
                    <div className="space-y-2">
                      {workflowForm.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <Badge variant="outline" className="w-8 h-8 flex items-center justify-center rounded-full">
                            {step.step}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{step.title}</p>
                            <p className="text-xs text-muted-foreground">角色: {step.role}</p>
                          </div>
                          {step.required && (
                            <Badge variant="outline" className="text-[10px]">必须</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowWorkflowDialog(false)}>取消</Button>
                  <Button
                    onClick={() => createWorkflowMutation.mutate(workflowForm)}
                    disabled={createWorkflowMutation.isPending}
                  >
                    创建
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {workflows.length === 0 ? (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-8 text-center">
                <Shield className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">暂无工作流定义</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflows.map((wf: any) => (
                <Card key={wf.id} className="bg-card/50 border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{wf.workflowName}</CardTitle>
                      <Badge variant={wf.isActive ? "default" : "secondary"}>
                        {wf.isActive ? "启用" : "停用"}
                      </Badge>
                    </div>
                    <CardDescription>{wf.description || wf.workflowCode}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 flex-wrap">
                      {(wf.steps || []).map((step: any, i: number) => (
                        <div key={i} className="flex items-center gap-1">
                          {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                          <Badge variant="outline" className="text-[10px]">
                            {step.title}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 审批流程图 */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-lg">标准薪酬审批流程</CardTitle>
              <CardDescription>四级审批流程可视化</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4 py-8">
                {[
                  { step: 1, title: "绩效计算", role: "系统自动", icon: BarChart3, color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
                  { step: 2, title: "主管审核", role: "部门主管", icon: UserCheck, color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
                  { step: 3, title: "HR确认", role: "人力资源", icon: Users, color: "bg-green-500/10 text-green-400 border-green-500/30" },
                  { step: 4, title: "财务发放", role: "财务部门", icon: Banknote, color: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    {i > 0 && (
                      <div className="flex items-center">
                        <div className="w-12 h-0.5 bg-border" />
                        <ArrowRight className="w-4 h-4 text-muted-foreground -ml-1" />
                      </div>
                    )}
                    <div className={`flex flex-col items-center gap-2 p-4 rounded-lg border ${item.color} min-w-[120px]`}>
                      <item.icon className="w-8 h-8" />
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">{item.role}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-muted/20 rounded-lg">
                <p className="text-sm font-medium mb-2">流程说明</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>1. <strong>绩效计算</strong>：系统基于绩效排行榜数据自动计算奖金，生成审批单</p>
                  <p>2. <strong>主管审核</strong>：部门主管审核奖金金额和分配合理性</p>
                  <p>3. <strong>HR确认</strong>：人力资源部确认薪酬政策合规性</p>
                  <p>4. <strong>财务发放</strong>：财务部门确认预算并执行发放</p>
                  <p className="mt-2 text-yellow-400">任何步骤拒绝将终止流程，需重新提交审批</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 审批操作对话框 */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>审批操作</DialogTitle>
            <DialogDescription>
              {selectedRecord?.batchTitle} - ¥{(selectedRecord?.totalAmount || 0).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">批次标题</span>
                <span>{selectedRecord?.batchTitle}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">总金额</span>
                <span>¥{(selectedRecord?.totalAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">涉及人数</span>
                <span>{selectedRecord?.workerCount || 0} 人</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">当前状态</span>
                <Badge className={STATUS_MAP[selectedRecord?.status]?.color}>
                  {STATUS_MAP[selectedRecord?.status]?.label}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">审批意见</label>
              <Textarea
                placeholder="输入审批意见（可选）..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => cancelMutation.mutate({ recordId: selectedRecord?.id, reason: approvalComment })}
              disabled={cancelMutation.isPending}
            >
              取消审批
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReject(selectedRecord?.id)}
              disabled={processMutation.isPending}
            >
              <XCircle className="w-4 h-4 mr-1" />
              拒绝
            </Button>
            <Button
              onClick={() => handleApprove(selectedRecord?.id)}
              disabled={processMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              批准
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
