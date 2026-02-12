/**
 * 员工数字助手管理页面
 * 用于创建、编辑和管理员工专属数字助手(DA)
 */

import { useAuth } from "@/_core/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { 
  Bot, 
  Plus, 
  Search, 
  Settings,
  User,
  Sparkles,
  Calendar,
  FileText,
  BarChart3,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  RefreshCw,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// DA能力类型
interface DACapabilities {
  canTaskAssist: boolean;
  canScheduleManage: boolean;
  canDocumentDraft: boolean;
  canDataAnalysis: boolean;
  canCommunicationProxy: boolean;
}

// DA表单数据
interface DAFormData {
  employeeId: string;
  displayName: string;
  workHabits: string;
  preferences: string;
  expertise: string;
  communicationStyle: string;
  capabilities: DACapabilities;
}

// 默认能力配置
const defaultCapabilities: DACapabilities = {
  canTaskAssist: true,
  canScheduleManage: true,
  canDocumentDraft: true,
  canDataAnalysis: false,
  canCommunicationProxy: false,
};

// 沟通风格选项
const communicationStyles = [
  { value: "formal", label: "正式商务" },
  { value: "friendly", label: "友好亲切" },
  { value: "concise", label: "简洁高效" },
  { value: "detailed", label: "详细全面" },
];

export default function DigitalAssistants() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("employee-da");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDA, setSelectedDA] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // 表单状态
  const [formData, setFormData] = useState<DAFormData>({
    employeeId: "",
    displayName: "",
    workHabits: "",
    preferences: "",
    expertise: "",
    communicationStyle: "formal",
    capabilities: defaultCapabilities,
  });

  // API调用
  const employeeDAs = trpc.employeeDA.list.useQuery();
  const functionalAssistants = trpc.employeeDA.listFunctional.useQuery();
  const employees = trpc.hrm.getEmployees.useQuery();
  
  const createDA = trpc.employeeDA.create.useMutation({
    onSuccess: () => {
      toast.success("数字助手创建成功");
      setShowCreateDialog(false);
      employeeDAs.refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    }
  });

  const updateDA = trpc.employeeDA.update.useMutation({
    onSuccess: () => {
      toast.success("数字助手更新成功");
      setShowEditDialog(false);
      employeeDAs.refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    }
  });

  const toggleDAStatus = trpc.employeeDA.toggleStatus.useMutation({
    onSuccess: () => {
      toast.success("状态更新成功");
      employeeDAs.refetch();
    },
    onError: (error) => {
      toast.error(`状态更新失败: ${error.message}`);
    }
  });

  const deleteDA = trpc.employeeDA.delete.useMutation({
    onSuccess: () => {
      toast.success("数字助手已删除");
      employeeDAs.refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    }
  });

  // 重置表单
  const resetForm = () => {
    setFormData({
      employeeId: "",
      displayName: "",
      workHabits: "",
      preferences: "",
      expertise: "",
      communicationStyle: "formal",
      capabilities: defaultCapabilities,
    });
  };

  // 生成DA代码
  const generateDACode = (employeeId: string) => {
    return `${employeeId}-DA`;
  };

  // 处理员工选择
  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.data?.find((e: any) => e.employeeCode === employeeId);
    setFormData({
      ...formData,
      employeeId,
      displayName: employee ? `${employee.name}的数字助手` : "",
    });
  };

  // 处理创建
  const handleCreate = () => {
    if (!formData.employeeId) {
      toast.error("请选择员工");
      return;
    }
    createDA.mutate({
      employeeId: formData.employeeId,
      assistantCode: generateDACode(formData.employeeId),
      displayName: formData.displayName || `${formData.employeeId}-DA`,
      workHabits: formData.workHabits,
      preferences: formData.preferences,
      expertise: formData.expertise,
      communicationStyle: formData.communicationStyle,
      ...formData.capabilities,
    });
  };

  // 处理编辑
  const handleEdit = (da: any) => {
    setSelectedDA(da);
    setFormData({
      employeeId: da.employeeId,
      displayName: da.displayName || "",
      workHabits: da.workHabits || "",
      preferences: da.preferences || "",
      expertise: da.expertise || "",
      communicationStyle: da.communicationStyle || "formal",
      capabilities: {
        canTaskAssist: da.canTaskAssist === 1,
        canScheduleManage: da.canScheduleManage === 1,
        canDocumentDraft: da.canDocumentDraft === 1,
        canDataAnalysis: da.canDataAnalysis === 1,
        canCommunicationProxy: da.canCommunicationProxy === 1,
      },
    });
    setShowEditDialog(true);
  };

  // 处理更新
  const handleUpdate = () => {
    if (!selectedDA) return;
    updateDA.mutate({
      id: selectedDA.id,
      displayName: formData.displayName,
      workHabits: formData.workHabits,
      preferences: formData.preferences,
      expertise: formData.expertise,
      communicationStyle: formData.communicationStyle,
      ...formData.capabilities,
    });
  };

  // 过滤DA列表
  const filteredDAs = employeeDAs.data?.filter(da => 
    da.assistantCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    da.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    da.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading flex items-center gap-3">
              <Bot className="w-8 h-8 text-primary" />
              数字助手管理
            </h1>
            <p className="text-muted-foreground mt-1">
              管理员工数字助手(DA)和功能型AI助手配置
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => employeeDAs.refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              创建数字助手
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">员工DA总数</p>
                  <p className="text-2xl font-bold">{employeeDAs.data?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">已激活</p>
                  <p className="text-2xl font-bold">
                    {employeeDAs.data?.filter(da => da.isActive === 1).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-500/10 text-orange-500">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">功能型助手</p>
                  <p className="text-2xl font-bold">{functionalAssistants.data?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">今日交互</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主要内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="employee-da" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              员工数字助手
            </TabsTrigger>
            <TabsTrigger value="functional-ai" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              功能型AI助手
            </TabsTrigger>
          </TabsList>

          {/* 员工数字助手Tab */}
          <TabsContent value="employee-da" className="space-y-4">
            {/* 搜索栏 */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索员工号、助手名称..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* DA列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDAs.map((da) => (
                <Card key={da.id} className="bg-card/50 border-border hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{da.assistantCode}</CardTitle>
                          <CardDescription>{da.displayName || "未设置名称"}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={da.isActive === 1 ? "default" : "secondary"}>
                        {da.isActive === 1 ? "已激活" : "已停用"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 能力标签 */}
                    <div className="flex flex-wrap gap-2">
                      {da.canTaskAssist === 1 && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          任务协助
                        </Badge>
                      )}
                      {da.canScheduleManage === 1 && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          日程管理
                        </Badge>
                      )}
                      {da.canDocumentDraft === 1 && (
                        <Badge variant="outline" className="text-xs">
                          <FileText className="w-3 h-3 mr-1" />
                          文档起草
                        </Badge>
                      )}
                      {da.canDataAnalysis === 1 && (
                        <Badge variant="outline" className="text-xs">
                          <BarChart3 className="w-3 h-3 mr-1" />
                          数据分析
                        </Badge>
                      )}
                      {da.canCommunicationProxy === 1 && (
                        <Badge variant="outline" className="text-xs">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          沟通代理
                        </Badge>
                      )}
                    </div>

                    {/* 专业领域 */}
                    {da.expertise && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">专业领域：</span>
                        {da.expertise}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(da)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDAStatus.mutate(da.id)}
                      >
                        {da.isActive === 1 ? (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
                            停用
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            激活
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("确定要删除这个数字助手吗？")) {
                            deleteDA.mutate(da.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        删除
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* 空状态 */}
              {filteredDAs.length === 0 && (
                <Card className="col-span-full bg-card/50 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Bot className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">暂无员工数字助手</p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      创建第一个数字助手
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 功能型AI助手Tab */}
          <TabsContent value="functional-ai" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {functionalAssistants.data?.map((assistant) => (
                <Card key={assistant.id} className="bg-card/50 border-border hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{assistant.displayName}</CardTitle>
                          <CardDescription className="text-xs">{assistant.assistantCode}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={assistant.isActive === 1 ? "default" : "secondary"} className="text-xs">
                        {assistant.isActive === 1 ? "启用" : "停用"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {assistant.description || "暂无描述"}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        v{assistant.version || "1.0.0"}
                      </Badge>
                      <span>温度: {assistant.temperature || 0.7}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* 创建DA对话框 */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                创建员工数字助手
              </DialogTitle>
              <DialogDescription>
                为员工创建专属数字助手，配置个性化能力和工作偏好
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">基本信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>选择员工 *</Label>
                    <Select
                      value={formData.employeeId}
                      onValueChange={handleEmployeeSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择员工" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.data?.map((emp: any) => (
                          <SelectItem key={emp.employeeCode} value={emp.employeeCode}>
                            {emp.employeeCode} - {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>助手代码</Label>
                    <Input
                      value={formData.employeeId ? generateDACode(formData.employeeId) : ""}
                      disabled
                      placeholder="自动生成"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>显示名称</Label>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="例如：张三的数字助手"
                  />
                </div>
              </div>

              {/* 能力配置 */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">能力配置</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">任务协助</span>
                    </div>
                    <Switch
                      checked={formData.capabilities.canTaskAssist}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        capabilities: { ...formData.capabilities, canTaskAssist: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">日程管理</span>
                    </div>
                    <Switch
                      checked={formData.capabilities.canScheduleManage}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        capabilities: { ...formData.capabilities, canScheduleManage: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">文档起草</span>
                    </div>
                    <Switch
                      checked={formData.capabilities.canDocumentDraft}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        capabilities: { ...formData.capabilities, canDocumentDraft: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">数据分析</span>
                    </div>
                    <Switch
                      checked={formData.capabilities.canDataAnalysis}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        capabilities: { ...formData.capabilities, canDataAnalysis: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border col-span-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">沟通代理</span>
                    </div>
                    <Switch
                      checked={formData.capabilities.canCommunicationProxy}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        capabilities: { ...formData.capabilities, canCommunicationProxy: checked }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* 个性化设置 */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">个性化设置</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>沟通风格</Label>
                    <Select
                      value={formData.communicationStyle}
                      onValueChange={(value) => setFormData({ ...formData, communicationStyle: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {communicationStyles.map((style) => (
                          <SelectItem key={style.value} value={style.value}>
                            {style.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>专业领域</Label>
                    <Input
                      value={formData.expertise}
                      onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                      placeholder="例如：销售、技术、财务"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>工作习惯</Label>
                  <Textarea
                    value={formData.workHabits}
                    onChange={(e) => setFormData({ ...formData, workHabits: e.target.value })}
                    placeholder="描述员工的工作习惯，帮助DA更好地协助工作"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>偏好设置</Label>
                  <Textarea
                    value={formData.preferences}
                    onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
                    placeholder="描述员工的工作偏好，如汇报格式、提醒时间等"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={createDA.isPending}>
                {createDA.isPending ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 编辑DA对话框 */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" />
                编辑数字助手
              </DialogTitle>
              <DialogDescription>
                修改数字助手的配置和能力设置
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">基本信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>员工号</Label>
                    <Input value={formData.employeeId} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>助手代码</Label>
                    <Input value={selectedDA?.assistantCode || ""} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>显示名称</Label>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  />
                </div>
              </div>

              {/* 能力配置 */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">能力配置</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">任务协助</span>
                    </div>
                    <Switch
                      checked={formData.capabilities.canTaskAssist}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        capabilities: { ...formData.capabilities, canTaskAssist: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">日程管理</span>
                    </div>
                    <Switch
                      checked={formData.capabilities.canScheduleManage}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        capabilities: { ...formData.capabilities, canScheduleManage: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">文档起草</span>
                    </div>
                    <Switch
                      checked={formData.capabilities.canDocumentDraft}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        capabilities: { ...formData.capabilities, canDocumentDraft: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">数据分析</span>
                    </div>
                    <Switch
                      checked={formData.capabilities.canDataAnalysis}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        capabilities: { ...formData.capabilities, canDataAnalysis: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border col-span-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">沟通代理</span>
                    </div>
                    <Switch
                      checked={formData.capabilities.canCommunicationProxy}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        capabilities: { ...formData.capabilities, canCommunicationProxy: checked }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* 个性化设置 */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">个性化设置</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>沟通风格</Label>
                    <Select
                      value={formData.communicationStyle}
                      onValueChange={(value) => setFormData({ ...formData, communicationStyle: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {communicationStyles.map((style) => (
                          <SelectItem key={style.value} value={style.value}>
                            {style.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>专业领域</Label>
                    <Input
                      value={formData.expertise}
                      onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>工作习惯</Label>
                  <Textarea
                    value={formData.workHabits}
                    onChange={(e) => setFormData({ ...formData, workHabits: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>偏好设置</Label>
                  <Textarea
                    value={formData.preferences}
                    onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                取消
              </Button>
              <Button onClick={handleUpdate} disabled={updateDA.isPending}>
                {updateDA.isPending ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
