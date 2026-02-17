import Layout from "@/components/Layout";
import FeatureGuide from "@/components/FeatureGuide";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Plus, Truck, Package, CheckCircle2, Clock, AlertTriangle, XCircle,
  ChevronRight, Target, TrendingUp, FileCheck, AlertCircle, Bot,
  ClipboardCheck, MapPin, Phone, User, Calendar, ArrowRight, Sparkles,
  RefreshCw, Eye, Settings, History
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";

const stageColorMap = createStatusColorMap({
  M7_Pre_Acceptance: "blue",
  M8_Installation: "purple",
  M9_Final_Acceptance: "orange",
  Completed: "green",
});

const stageLabels: Record<string, string> = {
  M7_Pre_Acceptance: "M7 预验收",
  M8_Installation: "M8 安装调试",
  M9_Final_Acceptance: "M9 终验收",
  Completed: "已完成",
};

const statusColorMap = createStatusColorMap({
  Pending: "slate",
  In_Progress: "blue",
  Blocked: "red",
  Completed: "green",
  Cancelled: "gray",
});

const statusLabels: Record<string, string> = {
  Pending: "待处理",
  In_Progress: "进行中",
  Blocked: "已阻塞",
  Completed: "已完成",
  Cancelled: "已取消",
};

const gateResultColorMap = createStatusColorMap({
  Pass: "green",
  Conditional_Pass: "yellow",
  Fail: "red",
});

const gateResultLabels: Record<string, string> = {
  Pass: "通过",
  Conditional_Pass: "有条件通过",
  Fail: "不通过",
};

const severityColorMap = createStatusColorMap({
  Low: "green",
  Medium: "yellow",
  High: "orange",
  Critical: "red",
});

export default function DeliveryManagement() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("deliveries");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isGateCheckDialogOpen, setIsGateCheckDialogOpen] = useState(false);
  const [isAICheckDialogOpen, setIsAICheckDialogOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  
  // Form state for new delivery
  const [newDelivery, setNewDelivery] = useState({
    projectId: 0,
    projectNo: "",
    customerName: "",
    siteAddress: "",
    siteContactName: "",
    siteContactPhone: "",
    plannedM7Date: "",
    plannedM8Date: "",
    plannedM9Date: "",
    specialRequirements: "",
  });

  // Form state for new issue
  const [newIssue, setNewIssue] = useState({
    deliveryId: 0,
    issueCategory: "Missing_Part" as "Missing_Part" | "Damage" | "Dimension_Error" | "Function_Fail" | "Doc_Missing" | "Other",
    severity: "Medium" as "Low" | "Medium" | "High" | "Critical",
    title: "",
    description: "",
    affectedComponent: "",
  });

  // AI Gate check state
  const [aiGateCheckInput, setAiGateCheckInput] = useState({
    deliveryId: 0,
    projectNo: "",
    currentStage: "M7_Pre_Acceptance" as "M7_Pre_Acceptance" | "M8_Installation" | "M9_Final_Acceptance",
    shippingCleanlinessReport: "",
    cycleTimeActual: 0,
    cycleTimeTarget: 0,
    openIssueCount: 0,
    criticalIssueCount: 0,
  });

  // Queries — typed tRPC calls to real delivery router
  const deliveriesQuery = trpc.m7m9.delivery.list.useQuery({ page: 1, pageSize: 20 });
  const statsQuery = trpc.m7m9.delivery.getStats.useQuery();
  const issuesQuery = trpc.m7m9.siteIssue.list.useQuery({ page: 1, pageSize: 20 });
  const issueStatsQuery = trpc.m7m9.siteIssue.getStats.useQuery({});

  const defaultStats = {
    byStage: { M7_Pre_Acceptance: 0, M8_Installation: 0, M9_Final_Acceptance: 0, Completed: 0 },
    total: 0,
    blocked: 0,
  };
  const defaultIssueStats = {
    byStatus: { Open: 0, Investigating: 0, Resolved: 0, Closed: 0, Escalated: 0 },
    bySeverity: { Critical: 0, High: 0 },
    total: 0,
  };

  const deliveries = deliveriesQuery.data?.items ?? [];
  const stats = statsQuery.data ?? defaultStats;
  const issues = issuesQuery.data?.items ?? [];
  const issueStats = issueStatsQuery.data ?? defaultIssueStats;

  // Mutations — typed tRPC calls
  const createDeliveryMutation = trpc.m7m9.delivery.create.useMutation({
    onSuccess: () => {
      toast.success("交付任务创建成功");
      setIsCreateDialogOpen(false);
      deliveriesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const createIssueMutation = trpc.m7m9.siteIssue.create.useMutation({
    onSuccess: () => {
      toast.success("现场问题已记录");
      setIsIssueDialogOpen(false);
      issuesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const aiGateCheckMutation = trpc.m7m9.gateCheck.executeAIGateCheck.useMutation({
    onSuccess: (data) => {
      toast.success(`AI Gate检查完成: ${data.decision}`);
      setIsAICheckDialogOpen(false);
      deliveriesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`检查失败: ${error.message}`);
    },
  });

  const handleCreateDelivery = () => {
    if (!newDelivery.projectNo.trim()) {
      toast.error("请输入项目编号");
      return;
    }
    createDeliveryMutation.mutate({
      projectId: newDelivery.projectId || 1,
      projectNo: newDelivery.projectNo,
      customerName: newDelivery.customerName,
      siteAddress: newDelivery.siteAddress,
      siteContactName: newDelivery.siteContactName,
      siteContactPhone: newDelivery.siteContactPhone,
      plannedM7Date: newDelivery.plannedM7Date,
      plannedM8Date: newDelivery.plannedM8Date,
      plannedM9Date: newDelivery.plannedM9Date,
      specialRequirements: newDelivery.specialRequirements,
    });
  };

  const handleCreateIssue = () => {
    if (!newIssue.title.trim()) {
      toast.error("请输入问题标题");
      return;
    }
    createIssueMutation.mutate({
      deliveryId: newIssue.deliveryId || selectedDelivery?.id || 1,
      issueCategory: newIssue.issueCategory,
      severity: newIssue.severity,
      title: newIssue.title,
      description: newIssue.description,
      affectedComponent: newIssue.affectedComponent,
    });
  };

  const handleAIGateCheck = () => {
    aiGateCheckMutation.mutate({
      deliveryId: aiGateCheckInput.deliveryId || selectedDelivery?.id || 1,
      projectNo: aiGateCheckInput.projectNo || selectedDelivery?.projectNo || "PRJ-2026-001",
      currentStage: aiGateCheckInput.currentStage,
      shippingCleanlinessReport: aiGateCheckInput.shippingCleanlinessReport || undefined,
      cycleTimeActual: aiGateCheckInput.cycleTimeActual || undefined,
      cycleTimeTarget: aiGateCheckInput.cycleTimeTarget || undefined,
      openIssueCount: aiGateCheckInput.openIssueCount,
      criticalIssueCount: aiGateCheckInput.criticalIssueCount,
    });
  };

  const getStageProgress = (stage: string) => {
    const stages = ["M7_Pre_Acceptance", "M8_Installation", "M9_Final_Acceptance", "Completed"];
    const index = stages.indexOf(stage);
    return ((index + 1) / stages.length) * 100;
  };

  return (
    <Layout>
      <FeatureGuide
        featureId="delivery-management"
        title="M7-M9 交付管理"
        description="管理设备交付全流程，从预验收到终验收"
        steps={[
          { title: "交付列表", description: "查看所有交付任务，按阶段和状态筛选" },
          { title: "Gate检查", description: "M7预验收检查清单，AI智能检查" },
          { title: "现场问题", description: "记录和追踪现场问题，AI诊断建议" },
          { title: "阶段推进", description: "完成检查后推进到下一阶段" },
        ]}
      />
      
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={Truck}
          title="M7-M9 交付管理"
          description="预验收 → 安装调试 → 终验收 全流程管理"
          actions={
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  新建交付
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>创建交付任务</DialogTitle>
                  <DialogDescription>
                    填写交付基本信息，系统将自动初始化M7-M9阶段
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="projectNo">项目编号 *</Label>
                      <Input
                        id="projectNo"
                        value={newDelivery.projectNo}
                        onChange={(e) => setNewDelivery({ ...newDelivery, projectNo: e.target.value })}
                        placeholder="PRJ-2024-XXX"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="customerName">客户名称</Label>
                      <Input
                        id="customerName"
                        value={newDelivery.customerName}
                        onChange={(e) => setNewDelivery({ ...newDelivery, customerName: e.target.value })}
                        placeholder="客户公司名称"
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="siteAddress">现场地址</Label>
                    <Input
                      id="siteAddress"
                      value={newDelivery.siteAddress}
                      onChange={(e) => setNewDelivery({ ...newDelivery, siteAddress: e.target.value })}
                      placeholder="设备安装地址"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="siteContactName">现场联系人</Label>
                      <Input
                        id="siteContactName"
                        value={newDelivery.siteContactName}
                        onChange={(e) => setNewDelivery({ ...newDelivery, siteContactName: e.target.value })}
                        placeholder="联系人姓名"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="siteContactPhone">联系电话</Label>
                      <Input
                        id="siteContactPhone"
                        value={newDelivery.siteContactPhone}
                        onChange={(e) => setNewDelivery({ ...newDelivery, siteContactPhone: e.target.value })}
                        placeholder="联系电话"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="plannedM7Date">计划M7日期</Label>
                      <Input
                        id="plannedM7Date"
                        type="date"
                        value={newDelivery.plannedM7Date}
                        onChange={(e) => setNewDelivery({ ...newDelivery, plannedM7Date: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="plannedM8Date">计划M8日期</Label>
                      <Input
                        id="plannedM8Date"
                        type="date"
                        value={newDelivery.plannedM8Date}
                        onChange={(e) => setNewDelivery({ ...newDelivery, plannedM8Date: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="plannedM9Date">计划M9日期</Label>
                      <Input
                        id="plannedM9Date"
                        type="date"
                        value={newDelivery.plannedM9Date}
                        onChange={(e) => setNewDelivery({ ...newDelivery, plannedM9Date: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="specialRequirements">特殊要求</Label>
                    <Textarea
                      id="specialRequirements"
                      value={newDelivery.specialRequirements}
                      onChange={(e) => setNewDelivery({ ...newDelivery, specialRequirements: e.target.value })}
                      placeholder="客户特殊要求或注意事项"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateDelivery}>
                    创建交付
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={ClipboardCheck}
            label="M7 预验收"
            value={stats.byStage.M7_Pre_Acceptance}
            iconColor="text-blue-400"
            iconBg="bg-blue-500/10"
          />
          <StatCard
            icon={Settings}
            label="M8 安装调试"
            value={stats.byStage.M8_Installation}
            iconColor="text-purple-400"
            iconBg="bg-purple-500/10"
          />
          <StatCard
            icon={FileCheck}
            label="M9 终验收"
            value={stats.byStage.M9_Final_Acceptance}
            iconColor="text-orange-400"
            iconBg="bg-orange-500/10"
          />
          <StatCard
            icon={CheckCircle2}
            label="已完成"
            value={stats.byStage.Completed}
            iconColor="text-green-400"
            iconBg="bg-green-500/10"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-card/50 border border-border">
            <TabsTrigger value="deliveries" className="data-[state=active]:bg-primary/20">
              <Truck className="w-4 h-4 mr-2" />
              交付列表
            </TabsTrigger>
            <TabsTrigger value="issues" className="data-[state=active]:bg-primary/20">
              <AlertTriangle className="w-4 h-4 mr-2" />
              现场问题
              {(issueStats.byStatus.Open + issueStats.byStatus.Investigating) > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {issueStats.byStatus.Open + issueStats.byStatus.Investigating}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="gate-check" className="data-[state=active]:bg-primary/20">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Gate检查
            </TabsTrigger>
            <TabsTrigger value="ai-agent" className="data-[state=active]:bg-primary/20">
              <Bot className="w-4 h-4 mr-2" />
              AI Agent
            </TabsTrigger>
          </TabsList>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries" className="space-y-4">
            {deliveriesQuery.isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-card/50 border-border animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-6 bg-muted rounded w-1/3 mb-3" />
                      <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : deliveries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Truck className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无交付任务</p>
                <p className="text-sm">点击"新建交付"创建第一个交付任务</p>
              </div>
            ) : (
            <div className="grid gap-4">
              {deliveries.map((delivery: any) => (
                <Card key={delivery.id} className="bg-card/50 border-border hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{delivery.deliveryCode}</h3>
                          <StatusBadge color={stageColorMap[delivery.currentStage as keyof typeof stageColorMap] ?? 'gray'}>
                            {stageLabels[delivery.currentStage]}
                          </StatusBadge>
                          <StatusBadge color={statusColorMap[delivery.status as keyof typeof statusColorMap] ?? 'slate'}>
                            {statusLabels[delivery.status]}
                          </StatusBadge>
                          {delivery.m7GateResult && (
                            <StatusBadge color={gateResultColorMap[delivery.m7GateResult as keyof typeof gateResultColorMap] ?? 'gray'}>
                              M7: {gateResultLabels[delivery.m7GateResult]}
                            </StatusBadge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            <span>{delivery.projectNo}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{delivery.customerName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{delivery.siteAddress}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{delivery.siteContactName}</span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>交付进度</span>
                            <span>{Math.round(getStageProgress(delivery.currentStage))}%</span>
                          </div>
                          <Progress value={getStageProgress(delivery.currentStage)} className="h-2" />
                          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>M7</span>
                            <span>M8</span>
                            <span>M9</span>
                            <span>完成</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDelivery(delivery);
                            setIsAICheckDialogOpen(true);
                          }}
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          AI检查
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDelivery(delivery);
                            setIsIssueDialogOpen(true);
                          }}
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          报告问题
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toast.info("功能开发中，敬请期待")}>
                          <Eye className="w-4 h-4 mr-1" />
                          详情
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            )}
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <Badge variant="outline" className="bg-red-500/10 text-red-400">
                  待处理: {issueStats.byStatus.Open}
                </Badge>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400">
                  调查中: {issueStats.byStatus.Investigating}
                </Badge>
                <Badge variant="outline" className="bg-orange-500/10 text-orange-400">
                  Critical: {issueStats.bySeverity.Critical}
                </Badge>
              </div>
              <Button onClick={() => setIsIssueDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                新建问题
              </Button>
            </div>
            
            {issuesQuery.isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="bg-card/50 border-border animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-5 bg-muted rounded w-1/4 mb-3" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : issues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mb-3 text-green-500 opacity-50" />
                <p className="font-medium">暂无现场问题</p>
                <p className="text-sm">当前没有待处理的现场问题</p>
              </div>
            ) : (
            <div className="grid gap-4">
              {issues.map((issue: any) => (
                <Card key={issue.id} className="bg-card/50 border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{issue.ticketCode}</h3>
                          <StatusBadge color={severityColorMap[issue.severity as keyof typeof severityColorMap] ?? 'gray'}>
                            {issue.severity}
                          </StatusBadge>
                          <Badge variant="outline">
                            {issue.issueCategory.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{issue.title}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>报告人: {issue.reportedByName}</span>
                          <span>日期: {issue.createdAt}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => toast.info("AI诊断功能开发中，敬请期待")}>
                          <Bot className="w-4 h-4 mr-1" />
                          AI诊断
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toast.info("功能开发中，敬请期待")}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            )}
          </TabsContent>

          {/* Gate Check Tab */}
          <TabsContent value="gate-check" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  M7 预验收检查清单
                </CardTitle>
                <CardDescription>
                  标准M7预验收检查项目，确保设备发货前满足所有条件
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {/* Document Completeness */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-400" />
                      文档完整性
                    </h4>
                    <div className="grid gap-2 pl-6">
                      {["BOM清单完整", "电气图纸完整", "操作手册已生成", "维护SOP已生成", "报警列表已确认"].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Design Review */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-400" />
                      设计评审
                    </h4>
                    <div className="grid gap-2 pl-6">
                      {["URS已冻结", "机械BOM已冻结", "电气IO已确认", "风险评估已完成"].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Production Readiness */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-400" />
                      生产准备
                    </h4>
                    <div className="grid gap-2 pl-6">
                      {["物料齐套", "生产工单已创建", "质检标准已确认"].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Customer Confirmation */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-green-400" />
                      客户确认
                    </h4>
                    <div className="grid gap-2 pl-6">
                      {["客户签字确认", "交付地址已确认", "现场联系人已确认"].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => toast.info("功能开发中，敬请期待")}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重置
                  </Button>
                  <Button onClick={() => toast.info("Gate检查提交功能开发中，敬请期待")}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    提交检查
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Agent Tab */}
          <TabsContent value="ai-agent" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-400" />
                    Gatekeeper Agent
                  </CardTitle>
                  <CardDescription>
                    智能Gate检查，自动验证发货条件
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    基于清洁度报告、节拍数据、PLC日志等自动判断是否满足发货条件
                  </p>
                  <Button className="w-full" onClick={() => setIsAICheckDialogOpen(true)}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    执行AI Gate检查
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-400" />
                    Site Copilot Agent
                  </CardTitle>
                  <CardDescription>
                    现场问题诊断，智能解决方案建议
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    分析现场问题，提供根因分析、解决方案和所需备件清单
                  </p>
                  <Button className="w-full" variant="outline" onClick={() => toast.info("Site Copilot Agent 开发中，敬请期待")}>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    诊断现场问题
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-orange-400" />
                    Risk Radar Agent
                  </CardTitle>
                  <CardDescription>
                    项目风险分析，识别潜在问题
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    分析URS复杂度、客户等级、历史问题，评估项目风险等级
                  </p>
                  <Button className="w-full" variant="outline" onClick={() => toast.info("Risk Radar Agent 开发中，敬请期待")}>
                    <Target className="w-4 h-4 mr-2" />
                    分析项目风险
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-green-400" />
                    Technical Writer Agent
                  </CardTitle>
                  <CardDescription>
                    技术文档生成，自动化文档输出
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    根据报警列表生成故障排除指南、维护SOP、操作手册
                  </p>
                  <Button className="w-full" variant="outline" onClick={() => toast.info("Technical Writer Agent 开发中，敬请期待")}>
                    <FileCheck className="w-4 h-4 mr-2" />
                    生成技术文档
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            {/* AI Execution History */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  AI Agent 执行历史
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无执行记录</p>
                  <p className="text-sm">执行AI Agent后，历史记录将显示在这里</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* AI Gate Check Dialog */}
      <Dialog open={isAICheckDialogOpen} onOpenChange={setIsAICheckDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI智能Gate检查
            </DialogTitle>
            <DialogDescription>
              输入检查参数，AI将自动分析并给出检查结果
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>当前阶段</Label>
              <Select
                value={aiGateCheckInput.currentStage}
                onValueChange={(value: any) => setAiGateCheckInput({ ...aiGateCheckInput, currentStage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M7_Pre_Acceptance">M7 预验收</SelectItem>
                  <SelectItem value="M8_Installation">M8 安装调试</SelectItem>
                  <SelectItem value="M9_Final_Acceptance">M9 终验收</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label>清洁度报告URL</Label>
              <Input
                value={aiGateCheckInput.shippingCleanlinessReport}
                onChange={(e) => setAiGateCheckInput({ ...aiGateCheckInput, shippingCleanlinessReport: e.target.value })}
                placeholder="https://..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>实际节拍(秒)</Label>
                <Input
                  type="number"
                  value={aiGateCheckInput.cycleTimeActual}
                  onChange={(e) => setAiGateCheckInput({ ...aiGateCheckInput, cycleTimeActual: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label>目标节拍(秒)</Label>
                <Input
                  type="number"
                  value={aiGateCheckInput.cycleTimeTarget}
                  onChange={(e) => setAiGateCheckInput({ ...aiGateCheckInput, cycleTimeTarget: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>未解决问题数</Label>
                <Input
                  type="number"
                  value={aiGateCheckInput.openIssueCount}
                  onChange={(e) => setAiGateCheckInput({ ...aiGateCheckInput, openIssueCount: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Critical问题数</Label>
                <Input
                  type="number"
                  value={aiGateCheckInput.criticalIssueCount}
                  onChange={(e) => setAiGateCheckInput({ ...aiGateCheckInput, criticalIssueCount: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAICheckDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAIGateCheck}>
              <Sparkles className="w-4 h-4 mr-2" />
              执行AI检查
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Issue Dialog */}
      <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>报告现场问题</DialogTitle>
            <DialogDescription>
              记录现场发现的问题，系统将自动分配处理
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>问题标题 *</Label>
              <Input
                value={newIssue.title}
                onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                placeholder="简要描述问题"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>问题类别</Label>
                <Select
                  value={newIssue.issueCategory}
                  onValueChange={(value: any) => setNewIssue({ ...newIssue, issueCategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Missing_Part">缺件</SelectItem>
                    <SelectItem value="Damage">损坏</SelectItem>
                    <SelectItem value="Dimension_Error">尺寸错误</SelectItem>
                    <SelectItem value="Function_Fail">功能故障</SelectItem>
                    <SelectItem value="Doc_Missing">文档缺失</SelectItem>
                    <SelectItem value="Other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>严重程度</Label>
                <Select
                  value={newIssue.severity}
                  onValueChange={(value: any) => setNewIssue({ ...newIssue, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">低</SelectItem>
                    <SelectItem value="Medium">中</SelectItem>
                    <SelectItem value="High">高</SelectItem>
                    <SelectItem value="Critical">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label>受影响部件</Label>
              <Input
                value={newIssue.affectedComponent}
                onChange={(e) => setNewIssue({ ...newIssue, affectedComponent: e.target.value })}
                placeholder="受影响的部件或模块"
              />
            </div>
            
            <div className="grid gap-2">
              <Label>详细描述</Label>
              <Textarea
                value={newIssue.description}
                onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                placeholder="详细描述问题情况"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIssueDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateIssue}>
              提交问题
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
