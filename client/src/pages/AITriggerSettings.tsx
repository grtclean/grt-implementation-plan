import { PageHeader, StatusBadge, createStatusColorMap } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { 
  Zap, Plus, Edit, Trash2, Play, History, 
  CheckCircle2, XCircle, Clock, Settings2,
  AlertTriangle, Target, Gauge, Calendar
} from "lucide-react";
import { toast } from "sonner";

// Agent类型定义
const AGENT_TYPES = [
  { value: "Risk_Radar", label: "Risk Radar", desc: "项目风险分析", icon: "🎯", color: "text-red-500" },
  { value: "Gatekeeper", label: "Gatekeeper", desc: "Gate检查审核", icon: "🚦", color: "text-yellow-500" },
  { value: "Site_Copilot", label: "Site Copilot", desc: "现场问题诊断", icon: "🔧", color: "text-blue-500" },
  { value: "Technical_Writer", label: "Technical Writer", desc: "技术文档生成", icon: "📝", color: "text-green-500" },
];

// 触发类型定义
const TRIGGER_TYPES = [
  { value: "Stage_Change", label: "阶段变更", desc: "项目进入指定阶段时触发", icon: Target },
  { value: "Event_Based", label: "事件触发", desc: "特定事件发生时触发", icon: Zap },
  { value: "Threshold_Based", label: "阈值触发", desc: "指标超过阈值时触发", icon: Gauge },
  { value: "Time_Based", label: "定时触发", desc: "按Cron表达式定时执行", icon: Calendar },
  { value: "Manual", label: "手动触发", desc: "仅支持手动执行", icon: Play },
];

// 项目阶段定义（工业清洗设备）
const PROJECT_STAGES = [
  { value: "M0", label: "M0 - 商机确认" },
  { value: "M1", label: "M1 - 立项启动" },
  { value: "M2", label: "M2 - 方案设计" },
  { value: "M3", label: "M3 - 设计评审" },
  { value: "M4", label: "M4 - 采购生产" },
  { value: "M5", label: "M5 - 组装调试" },
  { value: "M6", label: "M6 - 厂内验收" },
  { value: "M7", label: "M7 - 预验收FAT" },
  { value: "M8", label: "M8 - 终验收SAT" },
  { value: "M9", label: "M9 - 质保期" },
  { value: "M10", label: "M10 - 质保结束" },
  { value: "M11", label: "M11 - 增值服务" },
  { value: "M12", label: "M12 - 项目关闭" },
];

// 事件类型定义
const EVENT_TYPES = [
  { value: "site_issue_created", label: "现场问题创建" },
  { value: "gate_check_failed", label: "Gate检查不通过" },
  { value: "risk_score_changed", label: "风险分数变化" },
  { value: "delivery_delayed", label: "交付延期" },
  { value: "customer_complaint", label: "客户投诉" },
];

// 阈值字段定义（工业清洗设备特定）
const THRESHOLD_FIELDS = [
  { value: "risk_score", label: "风险评分", unit: "分", min: 0, max: 100 },
  { value: "open_issue_count", label: "未关闭问题数", unit: "个", min: 0, max: 100 },
  { value: "critical_issue_count", label: "严重问题数", unit: "个", min: 0, max: 50 },
  { value: "delay_days", label: "延期天数", unit: "天", min: 0, max: 365 },
  { value: "cleaning_efficiency", label: "清洗效率", unit: "%", min: 0, max: 100 },
  { value: "cycle_time_deviation", label: "节拍偏差", unit: "%", min: -50, max: 50 },
];

export default function AITriggerSettings() {
  const { t } = useLanguage();
  const [selectedTrigger, setSelectedTrigger] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("triggers");

  // 表单状态
  const [formData, setFormData] = useState({
    triggerCode: "",
    name: "",
    description: "",
    agentType: "Risk_Radar" as string,
    triggerType: "Stage_Change" as string,
    triggerOnStages: [] as string[],
    triggerOnEvents: [] as string[],
    cronExpression: "",
    thresholdField: "",
    thresholdOperator: ">" as string,
    thresholdValue: 0,
    notifyOnSuccess: true,
    notifyOnFailure: true,
    autoApplyResult: false,
    isEnabled: true,
    priority: 5,
  });

  // 获取触发器列表
  const { data: triggers, isLoading, refetch } = (trpc.aiTrigger.list as any).useQuery({});
  
  // 获取执行历史
  const { data: execHistory, isLoading: historyLoading } = (trpc.aiTrigger.getExecutionHistory as any).useQuery(
    { triggerId: selectedTrigger?.id, pageSize: 50 },
    { enabled: !!selectedTrigger }
  );

  // 创建触发器
  const createMutation = trpc.aiTrigger.create.useMutation({
    onSuccess: () => {
      toast.success("触发器创建成功");
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 更新触发器
  const updateMutation = trpc.aiTrigger.update.useMutation({
    onSuccess: () => {
      toast.success("触发器更新成功");
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 删除触发器
  const deleteMutation = trpc.aiTrigger.delete.useMutation({
    onSuccess: () => {
      toast.success("触发器删除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  // 切换启用状态
  const toggleMutation = trpc.aiTrigger.toggle.useMutation({
    onSuccess: () => {
      toast.success("状态已更新");
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 手动执行触发器
  const executeMutation = trpc.aiTrigger.execute.useMutation({
    onSuccess: (result) => {
      toast.success(`触发器执行${(result as any).status === "Success" ? "成功" : "失败"}`);
      refetch();
    },
    onError: (error) => {
      toast.error(`执行失败: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      triggerCode: "",
      name: "",
      description: "",
      agentType: "Risk_Radar",
      triggerType: "Stage_Change",
      triggerOnStages: [],
      triggerOnEvents: [],
      cronExpression: "",
      thresholdField: "",
      thresholdOperator: ">",
      thresholdValue: 0,
      notifyOnSuccess: true,
      notifyOnFailure: true,
      autoApplyResult: false,
      isEnabled: true,
      priority: 5,
    });
  };

  const handleCreate = () => {
    const triggerConditions = formData.triggerType === "Threshold_Based" ? {
      threshold: {
        field: formData.thresholdField,
        operator: formData.thresholdOperator,
        value: formData.thresholdValue,
      }
    } : undefined;

    createMutation.mutate({
      triggerCode: formData.triggerCode || `TRG-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      agentType: formData.agentType,
      triggerType: formData.triggerType,
      triggerOnStages: formData.triggerOnStages,
      triggerOnEvents: formData.triggerOnEvents,
      cronExpression: formData.cronExpression || undefined,
      triggerConditions,
      notifyOnSuccess: formData.notifyOnSuccess,
      notifyOnFailure: formData.notifyOnFailure,
      autoApplyResult: formData.autoApplyResult,
      isEnabled: formData.isEnabled,
      priority: formData.priority,
    });
  };

  const handleUpdate = () => {
    if (!selectedTrigger) return;
    
    const triggerConditions = formData.triggerType === "Threshold_Based" ? {
      threshold: {
        field: formData.thresholdField,
        operator: formData.thresholdOperator,
        value: formData.thresholdValue,
      }
    } : undefined;

    updateMutation.mutate({
      id: selectedTrigger.id,
      name: formData.name,
      description: formData.description,
      agentType: formData.agentType,
      triggerType: formData.triggerType,
      triggerOnStages: formData.triggerOnStages,
      triggerOnEvents: formData.triggerOnEvents,
      cronExpression: formData.cronExpression || undefined,
      triggerConditions,
      notifyOnSuccess: formData.notifyOnSuccess,
      notifyOnFailure: formData.notifyOnFailure,
      autoApplyResult: formData.autoApplyResult,
      isEnabled: formData.isEnabled,
      priority: formData.priority,
    });
  };

  const handleEdit = (trigger: any) => {
    setSelectedTrigger(trigger);
    const conditions = trigger.triggerConditions || {};
    setFormData({
      triggerCode: trigger.triggerCode,
      name: trigger.name,
      description: trigger.description || "",
      agentType: trigger.agentType,
      triggerType: trigger.triggerType,
      triggerOnStages: trigger.triggerOnStages || [],
      triggerOnEvents: trigger.triggerOnEvents || [],
      cronExpression: trigger.cronExpression || "",
      thresholdField: conditions.threshold?.field || "",
      thresholdOperator: conditions.threshold?.operator || ">",
      thresholdValue: conditions.threshold?.value || 0,
      notifyOnSuccess: trigger.notifyOnSuccess === 1,
      notifyOnFailure: trigger.notifyOnFailure === 1,
      autoApplyResult: trigger.autoApplyResult === 1,
      isEnabled: trigger.isEnabled === 1,
      priority: trigger.priority || 5,
    });
    setIsEditDialogOpen(true);
  };

  const getAgentBadge = (agentType: string) => {
    const agent = AGENT_TYPES.find(a => a.value === agentType);
    return agent ? (
      <Badge variant="outline" className="gap-1">
        <span>{agent.icon}</span>
        {agent.label}
      </Badge>
    ) : null;
  };

  const getTriggerTypeBadge = (triggerType: string) => {
    const type = TRIGGER_TYPES.find(t => t.value === triggerType);
    if (!type) return null;
    const Icon = type.icon;
    return (
      <Badge variant="secondary" className="gap-1">
        <Icon className="w-3 h-3" />
        {type.label}
      </Badge>
    );
  };

  const executionStatusColors = createStatusColorMap({
    Success: "green",
    Failed: "red",
    Running: "blue",
  });

  const executionStatusLabels: Record<string, string> = {
    Success: "成功",
    Failed: "失败",
    Running: "执行中",
  };

  const getStatusBadge = (status: string) => {
    const color = executionStatusColors[status];
    if (color) {
      return <StatusBadge color={color}>{executionStatusLabels[status]}</StatusBadge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Zap}
          title="AI Agent触发器配置"
          description="配置AI Agent自动触发条件，实现项目风险分析、Gate检查、现场诊断的智能化"
          actions={
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  新增触发器
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>新增AI触发器</DialogTitle>
                  <DialogDescription>
                    配置AI Agent的自动触发条件和执行参数
                  </DialogDescription>
                </DialogHeader>
                <TriggerForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleCreate}
                  isLoading={createMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          }
        />

        {/* 工业清洗设备行业提示 */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">零部件工业清洗行业专用配置</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  已预置清洗效率、节拍偏差等行业特定阈值字段，支持M7预验收FAT、M8终验收SAT等关键阶段的自动触发
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="triggers" className="gap-2">
              <Settings2 className="w-4 h-4" />
              触发器配置
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              执行历史
            </TabsTrigger>
          </TabsList>

          {/* 触发器列表 */}
          <TabsContent value="triggers" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : triggers && (triggers as any).length > 0 ? (
              <div className="grid gap-4">
                {(triggers as any).map((trigger: any) => (
                  <Card key={trigger.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{trigger.name}</CardTitle>
                            <code className="text-xs bg-muted px-2 py-0.5 rounded">{trigger.triggerCode}</code>
                          </div>
                          <CardDescription>{trigger.description}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={trigger.isEnabled === 1}
                            onCheckedChange={(checked) => {
                              toggleMutation.mutate({ id: trigger.id });
                            }}
                          />
                          <Badge variant={trigger.isEnabled === 1 ? "default" : "secondary"}>
                            {trigger.isEnabled === 1 ? "已启用" : "已禁用"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {getAgentBadge(trigger.agentType)}
                          {getTriggerTypeBadge(trigger.triggerType)}
                          <Badge variant="outline" className="gap-1">
                            优先级: {trigger.priority}
                          </Badge>
                        </div>
                        
                        {/* 触发条件详情 */}
                        <div className="text-sm text-muted-foreground">
                          {trigger.triggerType === "Stage_Change" && trigger.triggerOnStages?.length > 0 && (
                            <span>触发阶段: {trigger.triggerOnStages.map((s: string) => 
                              PROJECT_STAGES.find(p => p.value === s)?.label || s
                            ).join(", ")}</span>
                          )}
                          {trigger.triggerType === "Event_Based" && trigger.triggerOnEvents?.length > 0 && (
                            <span>触发事件: {trigger.triggerOnEvents.map((e: string) => 
                              EVENT_TYPES.find(ev => ev.value === e)?.label || e
                            ).join(", ")}</span>
                          )}
                          {trigger.triggerType === "Threshold_Based" && trigger.triggerConditions?.threshold && (
                            <span>
                              阈值条件: {THRESHOLD_FIELDS.find(f => f.value === trigger.triggerConditions.threshold.field)?.label || trigger.triggerConditions.threshold.field} 
                              {" "}{trigger.triggerConditions.threshold.operator}{" "}
                              {trigger.triggerConditions.threshold.value}
                            </span>
                          )}
                          {trigger.triggerType === "Time_Based" && trigger.cronExpression && (
                            <span>Cron表达式: {trigger.cronExpression}</span>
                          )}
                        </div>

                        {/* 执行统计 */}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            执行次数: <span className="text-foreground font-medium">{trigger.executionCount || 0}</span>
                          </span>
                          <span className="text-green-500">
                            成功: {trigger.successCount || 0}
                          </span>
                          <span className="text-red-500">
                            失败: {trigger.failureCount || 0}
                          </span>
                          {trigger.lastExecutedAt && (
                            <span className="text-muted-foreground">
                              最后执行: {new Date(trigger.lastExecutedAt).toLocaleString("zh-CN")}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(trigger)}>
                            <Edit className="w-4 h-4 mr-1" />
                            编辑
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              executeMutation.mutate({ id: trigger.id, context: {} });
                            }}
                            disabled={executeMutation.isPending}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            手动执行
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSelectedTrigger(trigger);
                              setActiveTab("history");
                            }}
                          >
                            <History className="w-4 h-4 mr-1" />
                            执行历史
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-500 hover:text-red-600"
                            onClick={() => {
                              if (confirm("确定要删除此触发器吗？")) {
                                deleteMutation.mutate({ id: trigger.id });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            删除
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Zap className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">暂无触发器配置</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    添加AI触发器以实现项目风险分析、Gate检查的自动化
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    新增触发器
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 执行历史 */}
          <TabsContent value="history" className="space-y-4">
            {selectedTrigger && (
              <div className="flex items-center gap-2 mb-4">
                {getAgentBadge(selectedTrigger.agentType)}
                <span className="font-medium">{selectedTrigger.name}</span>
                <span className="text-muted-foreground">的执行历史</span>
              </div>
            )}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>执行时间</TableHead>
                    <TableHead>触发来源</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>完成时间</TableHead>
                    <TableHead>错误信息</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      </TableCell>
                    </TableRow>
                  ) : (execHistory as any)?.items && (execHistory as any).items.length > 0 ? (
                    (execHistory as any).items.map((exec: any) => (
                      <TableRow key={exec.id}>
                        <TableCell className="text-sm">
                          {new Date(exec.queuedAt).toLocaleString("zh-CN")}
                        </TableCell>
                        <TableCell>{exec.triggerSource || "-"}</TableCell>
                        <TableCell>{getStatusBadge(exec.status)}</TableCell>
                        <TableCell className="text-sm">
                          {exec.completedAt ? new Date(exec.completedAt).toLocaleString("zh-CN") : "-"}
                        </TableCell>
                        <TableCell className="text-red-500 text-sm max-w-xs truncate">
                          {exec.errorMessage || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        暂无执行历史
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 编辑对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑AI触发器</DialogTitle>
              <DialogDescription>
                修改触发器配置信息
              </DialogDescription>
            </DialogHeader>
            <TriggerForm 
              formData={formData} 
              setFormData={setFormData}
              onSubmit={handleUpdate}
              isLoading={updateMutation.isPending}
              isEdit
            />
          </DialogContent>
        </Dialog>
      </div>
  );
}

// 触发器表单组件
function TriggerForm({ 
  formData, 
  setFormData, 
  onSubmit, 
  isLoading,
  isEdit = false
}: {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isEdit?: boolean;
}) {
  const toggleStage = (stage: string) => {
    const stages = formData.triggerOnStages.includes(stage)
      ? formData.triggerOnStages.filter((s: string) => s !== stage)
      : [...formData.triggerOnStages, stage];
    setFormData({ ...formData, triggerOnStages: stages });
  };

  const toggleEvent = (event: string) => {
    const events = formData.triggerOnEvents.includes(event)
      ? formData.triggerOnEvents.filter((e: string) => e !== event)
      : [...formData.triggerOnEvents, event];
    setFormData({ ...formData, triggerOnEvents: events });
  };

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="space-y-4">
        <h3 className="font-medium">基本信息</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>触发器名称 *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：M7预验收风险分析"
            />
          </div>
          <div className="space-y-2">
            <Label>触发器代码</Label>
            <Input
              value={formData.triggerCode}
              onChange={(e) => setFormData({ ...formData, triggerCode: e.target.value })}
              placeholder="自动生成"
              disabled={isEdit}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>描述</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="描述触发器的用途和触发条件"
            rows={2}
          />
        </div>
      </div>

      {/* Agent类型 */}
      <div className="space-y-4">
        <h3 className="font-medium">AI Agent类型</h3>
        <div className="grid grid-cols-2 gap-3">
          {AGENT_TYPES.map((agent) => (
            <div
              key={agent.value}
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                formData.agentType === agent.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => setFormData({ ...formData, agentType: agent.value })}
            >
              <span className="text-2xl">{agent.icon}</span>
              <div>
                <p className="font-medium">{agent.label}</p>
                <p className="text-sm text-muted-foreground">{agent.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 触发类型 */}
      <div className="space-y-4">
        <h3 className="font-medium">触发类型</h3>
        <Select
          value={formData.triggerType}
          onValueChange={(value) => setFormData({ ...formData, triggerType: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <span className="flex items-center gap-2">
                  <type.icon className="w-4 h-4" />
                  {type.label} - {type.desc}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 阶段变更触发配置 */}
        {formData.triggerType === "Stage_Change" && (
          <div className="space-y-2">
            <Label>触发阶段（可多选）</Label>
            <div className="grid grid-cols-3 gap-2">
              {PROJECT_STAGES.map((stage) => (
                <div
                  key={stage.value}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                    formData.triggerOnStages.includes(stage.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => toggleStage(stage.value)}
                >
                  <CheckCircle2 className={`w-4 h-4 ${
                    formData.triggerOnStages.includes(stage.value) ? "text-primary" : "text-muted-foreground"
                  }`} />
                  {stage.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 事件触发配置 */}
        {formData.triggerType === "Event_Based" && (
          <div className="space-y-2">
            <Label>触发事件（可多选）</Label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map((event) => (
                <div
                  key={event.value}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.triggerOnEvents.includes(event.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => toggleEvent(event.value)}
                >
                  <CheckCircle2 className={`w-4 h-4 ${
                    formData.triggerOnEvents.includes(event.value) ? "text-primary" : "text-muted-foreground"
                  }`} />
                  {event.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 阈值触发配置 */}
        {formData.triggerType === "Threshold_Based" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>监控字段</Label>
                <Select
                  value={formData.thresholdField}
                  onValueChange={(value) => setFormData({ ...formData, thresholdField: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择字段" />
                  </SelectTrigger>
                  <SelectContent>
                    {THRESHOLD_FIELDS.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label} ({field.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>比较运算符</Label>
                <Select
                  value={formData.thresholdOperator}
                  onValueChange={(value) => setFormData({ ...formData, thresholdOperator: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">大于 (&gt;)</SelectItem>
                    <SelectItem value=">=">大于等于 (&gt;=)</SelectItem>
                    <SelectItem value="<">小于 (&lt;)</SelectItem>
                    <SelectItem value="<=">小于等于 (&lt;=)</SelectItem>
                    <SelectItem value="==">等于 (==)</SelectItem>
                    <SelectItem value="!=">不等于 (!=)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>阈值</Label>
                <Input
                  type="number"
                  value={formData.thresholdValue}
                  onChange={(e) => setFormData({ ...formData, thresholdValue: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>
        )}

        {/* 定时触发配置 */}
        {formData.triggerType === "Time_Based" && (
          <div className="space-y-2">
            <Label>Cron表达式</Label>
            <Input
              value={formData.cronExpression}
              onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
              placeholder="例如：0 0 9 * * 1-5（工作日9点执行）"
            />
            <p className="text-xs text-muted-foreground">
              格式：秒 分 时 日 月 周（0-6，0=周日）
            </p>
          </div>
        )}
      </div>

      {/* 执行选项 */}
      <div className="space-y-4">
        <h3 className="font-medium">执行选项</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>优先级（1-10，越大越优先）</Label>
            <Input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              min={1}
              max={10}
            />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.notifyOnSuccess}
              onCheckedChange={(checked) => setFormData({ ...formData, notifyOnSuccess: checked })}
            />
            <Label>执行成功时发送通知</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.notifyOnFailure}
              onCheckedChange={(checked) => setFormData({ ...formData, notifyOnFailure: checked })}
            />
            <Label>执行失败时发送通知</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.autoApplyResult}
              onCheckedChange={(checked) => setFormData({ ...formData, autoApplyResult: checked })}
            />
            <Label>自动应用AI分析结果</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.isEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
            />
            <Label>启用此触发器</Label>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onSubmit} disabled={isLoading || !formData.name}>
          {isLoading ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </div>
  );
}
