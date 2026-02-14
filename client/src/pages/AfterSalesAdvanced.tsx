/**
 * GRT_AfterSales_Core 售后服务高级功能页面
 * 
 * 提供Webhook配置、Tier1数据导入、AI报告生成功能
 */

import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Streamdown } from "streamdown";
import { 
  Webhook, 
  Database, 
  FileText, 
  Plus, 
  Trash2, 
  TestTube,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building2,
  Wrench,
  ClipboardList,
  Send,
  Eye,
  Globe,
  Bell,
  Clock,
  Play,
  Square,
  History,
  PenTool,
  Link,
  Copy,
  ExternalLink
} from "lucide-react";

// ============ Webhook配置组件 ============
function WebhookConfigTab() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const utils = trpc.useUtils();
  
  // 获取Webhook列表
  const { data: webhooksResponse, isLoading } = trpc.webhook.list.useQuery();
  // 安全访问数据 - 处理后端返回的嵌套对象结构
  const webhooksData = Array.isArray(webhooksResponse) ? webhooksResponse : (webhooksResponse?.items || []);
  
  // 创建Webhook
  const createMutation = trpc.webhook.create.useMutation({
    onSuccess: () => {
      toast({ title: "成功", description: "Webhook创建成功" });
      setIsCreateOpen(false);
      utils.webhook.list.invalidate();
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });
  
  // 删除Webhook
  const deleteMutation = trpc.webhook.delete.useMutation({
    onSuccess: () => {
      toast({ title: "成功", description: "Webhook删除成功" });
      utils.webhook.list.invalidate();
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });
  
  // 切换启用状态
  const toggleMutation = trpc.webhook.toggle.useMutation({
    onSuccess: () => {
      utils.webhook.list.invalidate();
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });
  
  // 测试Webhook
  const testMutation = trpc.webhook.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "测试成功", description: "Webhook连接正常" });
      } else {
        toast({ title: "测试失败", description: "连接失败", variant: "destructive" });
      }
      setTestingId(null);
    },
    onError: (error) => {
      toast({ title: "测试失败", description: error.message, variant: "destructive" });
      setTestingId(null);
    },
  });
  
  // 预览维护提醒消息
  const { data: previewData } = trpc.afterSales.reminder.previewWeChatMessage.useQuery(
    { daysAhead: 30 },
    { enabled: previewOpen }
  );
  
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "wecom": return <Badge className="bg-green-500">企业微信</Badge>;
      case "dingtalk": return <Badge className="bg-blue-500">钉钉</Badge>;
      case "feishu": return <Badge className="bg-purple-500">飞书</Badge>;
      case "custom": return <Badge variant="outline">自定义</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  const [formData, setFormData] = useState({
    name: "",
    type: "wecom" as "wecom" | "dingtalk" | "feishu" | "custom",
    webhookUrl: "",
    description: "",
  });
  
  const handleCreate = () => {
    if (!formData.name || !formData.webhookUrl) {
      toast({ title: "错误", description: "请填写名称和Webhook URL", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name: formData.name,
      url: formData.webhookUrl,
      type: formData.type,
      description: formData.description,
    });
  };
  
  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Webhook通知配置</h2>
          <p className="text-sm text-muted-foreground">配置企业微信、钉钉、飞书等消息推送渠道</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                预览消息
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>维护提醒消息预览</DialogTitle>
                <DialogDescription>
                  以下是将发送到Webhook的消息内容（{previewData?.reminderCount || 0}台设备需要维护）
                </DialogDescription>
              </DialogHeader>
              <div className="bg-muted p-4 rounded-lg">
                <Streamdown>{previewData?.message || "暂无数据"}</Streamdown>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                添加Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加Webhook配置</DialogTitle>
                <DialogDescription>配置新的消息推送渠道</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>名称 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="如：售后服务通知群"
                  />
                </div>
                <div className="space-y-2">
                  <Label>类型 *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v) => setFormData({ ...formData, type: v as "wecom" | "dingtalk" | "feishu" | "custom" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wecom">企业微信</SelectItem>
                      <SelectItem value="dingtalk">钉钉</SelectItem>
                      <SelectItem value="feishu">飞书</SelectItem>
                      <SelectItem value="custom">自定义</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Webhook URL *</Label>
                  <Input
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.type === "wecom" && "企业微信群机器人Webhook地址"}
                    {formData.type === "dingtalk" && "钉钉群机器人Webhook地址"}
                    {formData.type === "feishu" && "飞书群机器人Webhook地址"}
                    {formData.type === "custom" && "自定义Webhook地址，需支持POST JSON"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="备注说明..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "创建中..." : "创建"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Webhook列表 */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : webhooksData?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Webhook className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无Webhook配置</h3>
            <p className="text-muted-foreground mb-4">添加企业微信、钉钉或飞书机器人来接收维护提醒通知</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              添加第一个Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {webhooksData?.map((webhook) => (
            <Card key={webhook.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Webhook className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{webhook.name}</span>
                        {getTypeBadge(webhook.type)}
                        {webhook.enabled ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">已启用</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-400">已禁用</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate max-w-md">
                        {webhook.url}
                      </p>
                      {webhook.description && (
                        <p className="text-xs text-muted-foreground mt-1">{webhook.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!webhook.enabled}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: webhook.id })}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTestingId(webhook.id);
                        testMutation.mutate({ id: webhook.id });
                      }}
                      disabled={testingId === webhook.id}
                    >
                      {testingId === webhook.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ id: webhook.id })}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* 发送提醒按钮 */}
      {webhooksData && webhooksData.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">手动发送维护提醒</h3>
                <p className="text-sm text-muted-foreground">立即向所有启用的Webhook发送维护提醒通知</p>
              </div>
              <SendRemindersButton />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 发送提醒按钮组件
function SendRemindersButton() {
  const { toast } = useToast();
  const sendMutation = trpc.afterSales.reminder.sendReminders.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast({ 
          title: "发送成功", 
          description: `已发送 ${result.notificationsSent} 条通知，共 ${result.remindersFound} 台设备需要维护` 
        });
      } else {
        toast({ 
          title: "部分发送失败", 
          description: result.errors.join(", "), 
          variant: "destructive" 
        });
      }
    },
    onError: (error) => {
      toast({ title: "发送失败", description: error.message, variant: "destructive" });
    },
  });
  
  return (
    <Button 
      onClick={() => sendMutation.mutate()}
      disabled={sendMutation.isPending}
    >
      {sendMutation.isPending ? (
        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Send className="w-4 h-4 mr-2" />
      )}
      发送提醒
    </Button>
  );
}

// ============ 数据导入组件 ============
function DataImportTab() {
  const { toast } = useToast();
  const [importResult, setImportResult] = useState<any>(null);
  
  // 导入所有数据
  const seedAllMutation = trpc.afterSales.seed.seedAll.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      if (result.success) {
        toast({ 
          title: "导入成功", 
          description: `已导入 ${result.summary.clientsCreated} 个客户，${result.summary.equipmentsCreated} 台设备，${result.summary.logsCreated} 条服务记录` 
        });
      } else {
        toast({ 
          title: "部分导入失败", 
          description: result.errors.slice(0, 3).join("; "), 
          variant: "destructive" 
        });
      }
    },
    onError: (error) => {
      toast({ title: "导入失败", description: error.message, variant: "destructive" });
    },
  });
  
  // 仅导入客户
  const seedClientsMutation = trpc.afterSales.seed.seedClients.useMutation({
    onSuccess: (result) => {
      toast({ 
        title: result.success ? "导入成功" : "部分导入失败", 
        description: `已导入 ${result.clientsCreated} 个客户`,
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: (error) => {
      toast({ title: "导入失败", description: error.message, variant: "destructive" });
    },
  });
  
  // 仅导入设备
  const seedEquipmentsMutation = trpc.afterSales.seed.seedEquipments.useMutation({
    onSuccess: (result) => {
      toast({ 
        title: result.success ? "导入成功" : "部分导入失败", 
        description: `已导入 ${result.equipmentsCreated} 台设备`,
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: (error) => {
      toast({ title: "导入失败", description: error.message, variant: "destructive" });
    },
  });
  
  // 仅导入服务记录
  const seedLogsMutation = trpc.afterSales.seed.seedServiceLogs.useMutation({
    onSuccess: (result) => {
      toast({ 
        title: result.success ? "导入成功" : "部分导入失败", 
        description: `已导入 ${result.logsCreated} 条服务记录`,
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: (error) => {
      toast({ title: "导入失败", description: error.message, variant: "destructive" });
    },
  });
  
  const isAnyLoading = seedAllMutation.isPending || seedClientsMutation.isPending || 
                       seedEquipmentsMutation.isPending || seedLogsMutation.isPending;
  
  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h2 className="text-xl font-semibold">Tier1客户数据导入</h2>
        <p className="text-sm text-muted-foreground">导入博世、采埃孚、大陆汽车等Tier1客户的示例数据</p>
      </div>
      
      {/* 数据概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              Tier1客户
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">博世(2) / 采埃孚(2) / 大陆(1)</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 w-full"
              onClick={() => seedClientsMutation.mutate()}
              disabled={isAnyLoading}
            >
              {seedClientsMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "仅导入客户"}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="w-4 h-4 text-green-500" />
              清洗设备
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9</div>
            <p className="text-xs text-muted-foreground">超声波/喷淋/全自动清洗线</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 w-full"
              onClick={() => seedEquipmentsMutation.mutate()}
              disabled={isAnyLoading}
            >
              {seedEquipmentsMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "仅导入设备"}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-orange-500" />
              服务记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">维护/维修/巡检工单</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 w-full"
              onClick={() => seedLogsMutation.mutate()}
              disabled={isAnyLoading}
            >
              {seedLogsMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "仅导入记录"}
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* 一键导入 */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-medium">一键导入所有Tier1数据</h3>
              <p className="text-sm text-muted-foreground mt-1">
                包含5个客户档案、9台设备资产、4条历史服务记录
              </p>
            </div>
            <Button 
              size="lg"
              onClick={() => seedAllMutation.mutate()}
              disabled={isAnyLoading}
            >
              {seedAllMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  一键导入全部
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 导入结果 */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              )}
              导入结果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-500">{importResult.summary.clientsCreated}</div>
                <div className="text-xs text-muted-foreground">客户</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">{importResult.summary.equipmentsCreated}</div>
                <div className="text-xs text-muted-foreground">设备</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-500">{importResult.summary.logsCreated}</div>
                <div className="text-xs text-muted-foreground">服务记录</div>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm text-destructive font-medium">错误信息：</p>
                <ul className="text-xs text-destructive mt-1 space-y-1">
                  {importResult.errors.slice(0, 5).map((err: string, i: number) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* 数据说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">数据说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>博世(Bosch)</strong>：苏州工厂（Strategic级，3台设备）+ 长沙工厂（Key级，1台设备）</p>
          <p><strong>采埃孚(ZF)</strong>：上海总部（Strategic级，2台设备）+ 北京工厂（Key级，1台设备）</p>
          <p><strong>大陆汽车(Continental)</strong>：芜湖工厂（Strategic级，2台设备）</p>
          <p className="pt-2 border-t">所有设备均配置了维护周期和下次维护日期，可用于测试维护提醒功能。</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ AI报告生成组件 ============
function ReportGeneratorTab() {
  const { toast } = useToast();
  const [selectedLogId, setSelectedLogId] = useState<string>("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["zh", "en"]);
  const [generatedReports, setGeneratedReports] = useState<any[]>([]);
  const [previewReport, setPreviewReport] = useState<any>(null);
  
  // 获取服务工单列表
  const { data: logsData, isLoading: logsLoading } = trpc.afterSales.serviceLogs.list.useQuery({
    status: "Completed",
    pageSize: 50,
  });

  // 生成多语言报告
  const generateMutation = trpc.afterSales.report.generateMultiLanguage.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setGeneratedReports(result.reports);
        toast({ 
          title: "生成成功", 
          description: `已生成 ${result.reports.length} 份报告` 
        });
      } else {
        toast({ 
          title: "生成失败", 
          description: result.error, 
          variant: "destructive" 
        });
      }
    },
    onError: (error) => {
      toast({ title: "生成失败", description: error.message, variant: "destructive" });
    },
  });
  
  const handleGenerate = () => {
    if (!selectedLogId) {
      toast({ title: "错误", description: "请选择服务工单", variant: "destructive" });
      return;
    }
    if (selectedLanguages.length === 0) {
      toast({ title: "错误", description: "请至少选择一种语言", variant: "destructive" });
      return;
    }
    generateMutation.mutate({
      serviceLogId: parseInt(selectedLogId),
      languages: selectedLanguages as ("zh" | "en" | "de")[],
    });
  };
  
  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };
  
  const getLanguageName = (code: string) => {
    switch (code) {
      case "zh": return "中文";
      case "en": return "English";
      case "de": return "Deutsch";
      default: return code;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h2 className="text-xl font-semibold">AI服务报告生成</h2>
        <p className="text-sm text-muted-foreground">基于服务工单自动生成多语言专业报告</p>
      </div>
      
      {/* 生成配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">报告配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>选择服务工单 *</Label>
            <Select value={selectedLogId} onValueChange={setSelectedLogId}>
              <SelectTrigger>
                <SelectValue placeholder="选择已完成的服务工单" />
              </SelectTrigger>
              <SelectContent>
                {logsLoading ? (
                  <SelectItem value="loading" disabled>加载中...</SelectItem>
                ) : logsData?.length === 0 ? (
                  <SelectItem value="empty" disabled>暂无已完成的工单</SelectItem>
                ) : (
                  logsData?.map((log) => (
                    <SelectItem key={log.id} value={log.id.toString()}>
                      {log.ticketId} - {log.issueDescription || log.serviceType}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>报告语言</Label>
            <div className="flex gap-2">
              <Button
                variant={selectedLanguages.includes("zh") ? "default" : "outline"}
                size="sm"
                onClick={() => toggleLanguage("zh")}
              >
                🇨🇳 中文
              </Button>
              <Button
                variant={selectedLanguages.includes("en") ? "default" : "outline"}
                size="sm"
                onClick={() => toggleLanguage("en")}
              >
                🇺🇸 English
              </Button>
              <Button
                variant={selectedLanguages.includes("de") ? "default" : "outline"}
                size="sm"
                onClick={() => toggleLanguage("de")}
              >
                🇩🇪 Deutsch
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !selectedLogId}
            className="w-full"
          >
            {generateMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                AI生成中...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                生成报告
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {/* 生成的报告 */}
      {generatedReports.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">生成的报告</h3>
          <div className="grid gap-4">
            {generatedReports.map((report, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{report.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {getLanguageName(report.language)} • 
                          {report.aiGenerated ? " AI生成" : " 模板生成"} • 
                          {new Date(report.generatedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setPreviewReport(report)}>
                            <Eye className="w-4 h-4 mr-1" />
                            预览
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{report.title}</DialogTitle>
                            <DialogDescription>
                              {getLanguageName(report.language)} • {report.aiGenerated ? "AI生成" : "模板生成"}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <Streamdown>{report.content}</Streamdown>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        下载
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* 功能说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">功能说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>AI生成</strong>：使用LLM根据服务工单数据自动生成专业报告，包含服务摘要、问题分析、解决方案和后续建议。</p>
          <p><strong>多语言支持</strong>：支持中文、英文、德文三种语言，适用于不同国家的Tier1客户。</p>
          <p><strong>模板降级</strong>：当AI服务不可用时，自动切换到模板生成模式，确保报告输出。</p>
          <p><strong>客户签字</strong>：生成的报告可发送给客户进行签字确认，完成服务闭环。</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ 定时任务组件 ============
function SchedulerTab() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  
  // 获取定时任务状态
  const { data: status, isLoading } = trpc.afterSales.scheduler.getStatus.useQuery();

  // 获取执行历史
  const { data: history } = trpc.afterSales.scheduler.getHistory.useQuery({ limit: 10 });

  // 启动定时任务
  const startMutation = trpc.afterSales.scheduler.start.useMutation({
    onSuccess: (result) => {
      toast({ title: result.success ? "成功" : "失败", description: result.message });
      utils.afterSales.scheduler.getStatus.invalidate();
    },
  });

  // 停止定时任务
  const stopMutation = trpc.afterSales.scheduler.stop.useMutation({
    onSuccess: (result) => {
      toast({ title: result.success ? "成功" : "失败", description: result.message });
      utils.afterSales.scheduler.getStatus.invalidate();
    },
  });

  // 立即执行
  const executeMutation = trpc.afterSales.scheduler.executeNow.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "执行完成",
          description: `检查了 ${result.equipmentCount} 台设备，发送了 ${result.webhooksSent} 个通知`
        });
      } else {
        toast({ title: "执行失败", description: result.errors.join(", "), variant: "destructive" });
      }
      utils.afterSales.scheduler.getStatus.invalidate();
      utils.afterSales.scheduler.getHistory.invalidate();
    },
  });
  
  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin" /></div>;
  }
  
  return (
    <div className="space-y-6">
      {/* 任务状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            定时任务状态
          </CardTitle>
          <CardDescription>每日自动检查即将到期的设备并发送Webhook通知</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">任务状态</p>
              <div className="flex items-center gap-2 mt-1">
                {status?.config.enabled ? (
                  <><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="font-medium text-green-600">运行中</span></>
                ) : (
                  <><AlertCircle className="w-4 h-4 text-yellow-500" /><span className="font-medium text-yellow-600">已停止</span></>
                )}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">执行时间</p>
              <p className="font-medium mt-1">{status?.config.checkTime || "09:00"}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">上次执行</p>
              <p className="font-medium mt-1">{status?.lastRunTime || "未执行"}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">下次执行</p>
              <p className="font-medium mt-1">
                {status?.nextRunTime ? new Date(status.nextRunTime).toLocaleString('zh-CN') : "-"}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {status?.config.enabled ? (
              <Button variant="outline" onClick={() => stopMutation.mutate()} disabled={stopMutation.isPending}>
                <Square className="w-4 h-4 mr-2" />停止任务
              </Button>
            ) : (
              <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
                <Play className="w-4 h-4 mr-2" />启动任务
              </Button>
            )}
            <Button variant="secondary" onClick={() => executeMutation.mutate()} disabled={executeMutation.isPending}>
              <RefreshCw className={`w-4 h-4 mr-2 ${executeMutation.isPending ? 'animate-spin' : ''}`} />
              立即执行
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 执行历史 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            执行历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history && history.length > 0 ? (
            <div className="space-y-2">
              {history.map((log, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {log.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {log.status === 'partial' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                    {log.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    <div>
                      <p className="text-sm font-medium">{log.executedAt}</p>
                      <p className="text-xs text-muted-foreground">{log.details}</p>
                    </div>
                  </div>
                  <Badge variant={log.status === 'success' ? 'default' : log.status === 'partial' ? 'secondary' : 'destructive'}>
                    {log.status === 'success' ? '成功' : log.status === 'partial' ? '部分成功' : '失败'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">暂无执行记录</p>
          )}
        </CardContent>
      </Card>
      
      {/* 配置说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">功能说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>定时检查</strong>：每天按设定时间自动检查即将到期的设备（默认提前30/14/7/3/1天）。</p>
          <p><strong>Webhook通知</strong>：自动向已配置的企业微信/钉钉/飞书机器人发送维护提醒消息。</p>
          <p><strong>优先级排序</strong>：按客户等级（Tier1 {">"}  VIP {">"}  Standard）优先发送通知。</p>
          <p><strong>立即执行</strong>：点击“立即执行”按钮可手动触发一次检查和通知。</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ 签字确认组件 ============
function SignatureTab() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  
  // 获取待签字工单
  const { data: pendingLogs, isLoading } = trpc.afterSales.signature.getPendingLogs.useQuery();

  // 生成签字链接
  const generateUrlMutation = trpc.afterSales.signature.generateUrl.useMutation({
    onSuccess: (result) => {
      if (result.success && result.url) {
        const fullUrl = `${window.location.origin}${result.url}`;
        navigator.clipboard.writeText(fullUrl);
        toast({
          title: "链接已生成",
          description: `签字链接已复制到剪贴板，有效期至 ${new Date(result.expiresAt!).toLocaleString('zh-CN')}`
        });
        utils.afterSales.signature.getPendingLogs.invalidate();
      } else {
        toast({ title: "生成失败", description: result.error, variant: "destructive" });
      }
    },
  });

  // 发送提醒
  const sendReminderMutation = trpc.afterSales.signature.sendReminder.useMutation({
    onSuccess: (result) => {
      toast({ title: result.success ? "成功" : "失败", description: result.message });
    },
  });
  
  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin" /></div>;
  }
  
  return (
    <div className="space-y-6">
      {/* 待签字工单列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="w-5 h-5" />
            待签字工单
          </CardTitle>
          <CardDescription>已完成但尚未获得客户签字确认的服务工单</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingLogs && pendingLogs.length > 0 ? (
            <div className="space-y-3">
              {pendingLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.ticketId}</span>
                      <Badge variant="outline">{log.serviceType || '未分类'}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      客户: {log.clientName || '-'} | 设备: {log.equipmentSerialNumber || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      服务日期: {log.serviceDate ? new Date(log.serviceDate).toLocaleDateString('zh-CN') : '-'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => generateUrlMutation.mutate({ serviceLogId: log.id })}
                      disabled={generateUrlMutation.isPending}
                    >
                      <Link className="w-4 h-4 mr-1" />
                      生成链接
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-muted-foreground">所有工单均已完成签字确认</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 功能说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">功能说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>生成链接</strong>：为已完成的服务工单生成H5签字页面链接，有效期72小时。</p>
          <p><strong>客户签字</strong>：客户通过链接访问签字页面，查看服务详情、手写签名、评分和反馈。</p>
          <p><strong>后续流程</strong>：签字完成后自动触发财务开票流程和客户积分更新。</p>
          <p><strong>链接分享</strong>：可通过微信/邮件/短信等方式将链接发送给客户。</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ 主页面组件 ============
export default function AfterSalesAdvanced() {
  const { t } = useLanguage();
  
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Wrench} title="售后服务高级功能" description="Webhook通知配置、Tier1数据导入、AI报告生成" />
        
        {/* 标签页 */}
        <Tabs defaultValue="webhook" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:w-[700px]">
            <TabsTrigger value="webhook" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Webhook
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              数据导入
            </TabsTrigger>
            <TabsTrigger value="report" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              AI报告
            </TabsTrigger>
            <TabsTrigger value="scheduler" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              定时任务
            </TabsTrigger>
            <TabsTrigger value="signature" className="flex items-center gap-2">
              <PenTool className="w-4 h-4" />
              签字确认
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="webhook">
            <WebhookConfigTab />
          </TabsContent>
          
          <TabsContent value="import">
            <DataImportTab />
          </TabsContent>
          
          <TabsContent value="report">
            <ReportGeneratorTab />
          </TabsContent>
          
          <TabsContent value="scheduler">
            <SchedulerTab />
          </TabsContent>
          
          <TabsContent value="signature">
            <SignatureTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
