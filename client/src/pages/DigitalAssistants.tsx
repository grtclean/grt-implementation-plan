/**
 * 员工数字助手管理页面
 * 用于创建、编辑和管理员工专属数字助手(DA)
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader, StatCard } from "@/components/grt";
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

// 沟通风格选项 — label keys resolved at render time via t()
const communicationStyleKeys = [
  { value: "formal", labelKey: "ai.digitalAssistant.styleFormal" },
  { value: "friendly", labelKey: "ai.digitalAssistant.styleFriendly" },
  { value: "concise", labelKey: "ai.digitalAssistant.styleConcise" },
  { value: "detailed", labelKey: "ai.digitalAssistant.styleDetailed" },
];

export default function DigitalAssistants() {
  const { t } = useLanguage();
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
  const employeeDAs = trpc.employeeDA.list.useQuery() as any;
  const functionalAssistants = trpc.employeeDA.listFunctional.useQuery() as any;
  const employees = trpc.hrm.getEmployees.useQuery();
  
  const createDA = trpc.employeeDA.create.useMutation({
    onSuccess: () => {
      toast.success(t("ai.digitalAssistant.createSuccess"));
      setShowCreateDialog(false);
      employeeDAs.refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`${t("ai.digitalAssistant.createFailed")}: ${error.message}`);
    }
  });

  const updateDA = trpc.employeeDA.update.useMutation({
    onSuccess: () => {
      toast.success(t("ai.digitalAssistant.updateSuccess"));
      setShowEditDialog(false);
      employeeDAs.refetch();
    },
    onError: (error) => {
      toast.error(`${t("ai.digitalAssistant.updateFailed")}: ${error.message}`);
    }
  });

  const toggleDAStatus = trpc.employeeDA.toggleStatus.useMutation({
    onSuccess: () => {
      toast.success(t("ai.digitalAssistant.statusUpdateSuccess"));
      employeeDAs.refetch();
    },
    onError: (error) => {
      toast.error(`${t("ai.digitalAssistant.statusUpdateFailed")}: ${error.message}`);
    }
  });

  const deleteDA = trpc.employeeDA.delete.useMutation({
    onSuccess: () => {
      toast.success(t("ai.digitalAssistant.deleteSuccess"));
      employeeDAs.refetch();
    },
    onError: (error) => {
      toast.error(`${t("ai.digitalAssistant.deleteFailed")}: ${error.message}`);
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
      displayName: employee ? `${employee.name} ${t("ai.digitalAssistant.daOf")}` : "",
    });
  };

  // 处理创建
  const handleCreate = () => {
    if (!formData.employeeId) {
      toast.error(t("ai.digitalAssistant.selectEmployeeError"));
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
  const filteredDAs = employeeDAs.data?.filter((da: any) => 
    da.assistantCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    da.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    da.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Bot}
          title={t("ai.digitalAssistant.title")}
          description={t("ai.digitalAssistant.description")}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => employeeDAs.refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("ai.digitalAssistant.refresh")}
              </Button>
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("ai.digitalAssistant.createDA")}
              </Button>
            </>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={User} label={t("ai.digitalAssistant.totalDAs")} value={employeeDAs.data?.length || 0} iconColor="text-blue-600" iconBg="bg-blue-100" />
          <StatCard icon={CheckCircle2} label={t("ai.digitalAssistant.activated")} value={employeeDAs.data?.filter((da: any) => da.isActive === 1).length || 0} iconColor="text-green-600" iconBg="bg-green-100" />
          <StatCard icon={Sparkles} label={t("ai.digitalAssistant.functionalAssistants")} value={functionalAssistants.data?.length || 0} iconColor="text-orange-600" iconBg="bg-orange-100" />
          <StatCard icon={Zap} label={t("ai.digitalAssistant.todayInteractions")} value={0} iconColor="text-purple-600" iconBg="bg-purple-100" />
        </div>

        {/* 主要内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="employee-da" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("ai.digitalAssistant.employeeDA")}
            </TabsTrigger>
            <TabsTrigger value="functional-ai" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t("ai.digitalAssistant.functionalAI")}
            </TabsTrigger>
          </TabsList>

          {/* 员工数字助手Tab */}
          <TabsContent value="employee-da" className="space-y-4">
            {/* 搜索栏 */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("ai.digitalAssistant.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* DA列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDAs.map((da: any) => (
                <Card key={da.id} className="bg-card/50 border-border hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{da.assistantCode}</CardTitle>
                          <CardDescription>{da.displayName || t("ai.digitalAssistant.noName")}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={da.isActive === 1 ? "default" : "secondary"}>
                        {da.isActive === 1 ? t("ai.digitalAssistant.activated") : t("ai.digitalAssistant.deactivated")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 能力标签 */}
                    <div className="flex flex-wrap gap-2">
                      {da.canTaskAssist === 1 && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {t("ai.digitalAssistant.capTaskAssist")}
                        </Badge>
                      )}
                      {da.canScheduleManage === 1 && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {t("ai.digitalAssistant.capSchedule")}
                        </Badge>
                      )}
                      {da.canDocumentDraft === 1 && (
                        <Badge variant="outline" className="text-xs">
                          <FileText className="w-3 h-3 mr-1" />
                          {t("ai.digitalAssistant.capDocDraft")}
                        </Badge>
                      )}
                      {da.canDataAnalysis === 1 && (
                        <Badge variant="outline" className="text-xs">
                          <BarChart3 className="w-3 h-3 mr-1" />
                          {t("ai.digitalAssistant.capDataAnalysis")}
                        </Badge>
                      )}
                      {da.canCommunicationProxy === 1 && (
                        <Badge variant="outline" className="text-xs">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          {t("ai.digitalAssistant.capCommProxy")}
                        </Badge>
                      )}
                    </div>

                    {/* 专业领域 */}
                    {da.expertise && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">{t("ai.digitalAssistant.expertise")}:</span>
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
                        {t("ai.digitalAssistant.edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDAStatus.mutate(da.id)}
                      >
                        {da.isActive === 1 ? (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
                            {t("ai.digitalAssistant.deactivate")}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            {t("ai.digitalAssistant.activate")}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(t("ai.digitalAssistant.deleteConfirm"))) {
                            deleteDA.mutate(da.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {t("ai.digitalAssistant.delete")}
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
                    <p className="text-muted-foreground mb-4">{t("ai.digitalAssistant.noDAs")}</p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t("ai.digitalAssistant.createFirstDA")}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 功能型AI助手Tab */}
          <TabsContent value="functional-ai" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {functionalAssistants.data?.map((assistant: any) => (
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
                        {assistant.isActive === 1 ? t("ai.digitalAssistant.enabled") : t("ai.digitalAssistant.disabled")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {assistant.description || t("ai.digitalAssistant.noDescription")}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        v{assistant.version || "1.0.0"}
                      </Badge>
                      <span>{t("ai.digitalAssistant.temperature")}: {assistant.temperature || 0.7}</span>
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
                {t("ai.digitalAssistant.createDialogTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("ai.digitalAssistant.createDialogDesc")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">{t("ai.digitalAssistant.basicInfo")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("ai.digitalAssistant.selectEmployee")} *</Label>
                    <Select
                      value={formData.employeeId}
                      onValueChange={handleEmployeeSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("ai.digitalAssistant.selectEmployee")} />
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
                    <Label>{t("ai.digitalAssistant.assistantCode")}</Label>
                    <Input
                      value={formData.employeeId ? generateDACode(formData.employeeId) : ""}
                      disabled
                      placeholder={t("ai.digitalAssistant.autoGenerated")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("ai.digitalAssistant.displayName")}</Label>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder={t("ai.digitalAssistant.displayNamePlaceholder")}
                  />
                </div>
              </div>

              {/* 能力配置 */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">{t("ai.digitalAssistant.capConfig")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{t("ai.digitalAssistant.capTaskAssist")}</span>
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
                      <span className="text-sm">{t("ai.digitalAssistant.capSchedule")}</span>
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
                      <span className="text-sm">{t("ai.digitalAssistant.capDocDraft")}</span>
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
                      <span className="text-sm">{t("ai.digitalAssistant.capDataAnalysis")}</span>
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
                      <span className="text-sm">{t("ai.digitalAssistant.capCommProxy")}</span>
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
                <h4 className="font-medium text-sm text-muted-foreground">{t("ai.digitalAssistant.personalSettings")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("ai.digitalAssistant.commStyle")}</Label>
                    <Select
                      value={formData.communicationStyle}
                      onValueChange={(value) => setFormData({ ...formData, communicationStyle: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {communicationStyleKeys.map((style) => (
                          <SelectItem key={style.value} value={style.value}>
                            {t(style.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("ai.digitalAssistant.expertise")}</Label>
                    <Input
                      value={formData.expertise}
                      onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                      placeholder={t("ai.digitalAssistant.expertisePlaceholder")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("ai.digitalAssistant.workHabits")}</Label>
                  <Textarea
                    value={formData.workHabits}
                    onChange={(e) => setFormData({ ...formData, workHabits: e.target.value })}
                    placeholder={t("ai.digitalAssistant.workHabitsPlaceholder")}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("ai.digitalAssistant.preferences")}</Label>
                  <Textarea
                    value={formData.preferences}
                    onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
                    placeholder={t("ai.digitalAssistant.preferencesPlaceholder")}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                {t("ai.digitalAssistant.cancel")}
              </Button>
              <Button onClick={handleCreate} disabled={createDA.isPending}>
                {createDA.isPending ? t("ai.digitalAssistant.creating") : t("ai.digitalAssistant.create")}
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
                {t("ai.digitalAssistant.editDialogTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("ai.digitalAssistant.editDialogDesc")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">{t("ai.digitalAssistant.basicInfo")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("ai.digitalAssistant.employeeId")}</Label>
                    <Input value={formData.employeeId} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("ai.digitalAssistant.assistantCode")}</Label>
                    <Input value={selectedDA?.assistantCode || ""} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("ai.digitalAssistant.displayName")}</Label>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  />
                </div>
              </div>

              {/* 能力配置 */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">{t("ai.digitalAssistant.capConfig")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{t("ai.digitalAssistant.capTaskAssist")}</span>
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
                      <span className="text-sm">{t("ai.digitalAssistant.capSchedule")}</span>
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
                      <span className="text-sm">{t("ai.digitalAssistant.capDocDraft")}</span>
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
                      <span className="text-sm">{t("ai.digitalAssistant.capDataAnalysis")}</span>
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
                      <span className="text-sm">{t("ai.digitalAssistant.capCommProxy")}</span>
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
                <h4 className="font-medium text-sm text-muted-foreground">{t("ai.digitalAssistant.personalSettings")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("ai.digitalAssistant.commStyle")}</Label>
                    <Select
                      value={formData.communicationStyle}
                      onValueChange={(value) => setFormData({ ...formData, communicationStyle: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {communicationStyleKeys.map((style) => (
                          <SelectItem key={style.value} value={style.value}>
                            {t(style.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("ai.digitalAssistant.expertise")}</Label>
                    <Input
                      value={formData.expertise}
                      onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("ai.digitalAssistant.workHabits")}</Label>
                  <Textarea
                    value={formData.workHabits}
                    onChange={(e) => setFormData({ ...formData, workHabits: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("ai.digitalAssistant.preferences")}</Label>
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
                {t("ai.digitalAssistant.cancel")}
              </Button>
              <Button onClick={handleUpdate} disabled={updateDA.isPending}>
                {updateDA.isPending ? t("ai.digitalAssistant.saving") : t("ai.digitalAssistant.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
