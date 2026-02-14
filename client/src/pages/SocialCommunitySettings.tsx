/**
 * 社群管理设置页面
 * 功能：脱敏规则配置、AI回复模板管理、Webhook配置
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Shield, Bot, Webhook, Plus, Edit, Trash2, TestTube,
  RefreshCw, CheckCircle, XCircle, AlertTriangle, Settings
} from "lucide-react";

export default function SocialCommunitySettings() {
  const [activeTab, setActiveTab] = useState("deidentification");
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  // 新建规则表单
  const [newRule, setNewRule] = useState({
    name: "",
    pattern: "",
    patternType: "keyword" as "keyword" | "regex" | "ai_detect",
    replacement: "[***]",
    category: "custom" as "price" | "formula" | "personal" | "business" | "custom",
    priority: 0,
  });

  // 新建模板表单
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "custom" as "greeting" | "technical" | "sales" | "support" | "farewell" | "custom",
    promptTemplate: "",
    systemPrompt: "",
    variables: [] as string[],
    isDefault: false,
  });

  // tRPC查询
  const { data: rules, refetch: refetchRules } = trpc.socialCommunityEnhanced.getDeidentificationRules.useQuery();
  const { data: templates, refetch: refetchTemplates } = trpc.socialCommunityEnhanced.getAIReplyTemplates.useQuery();

  // tRPC mutations
  const createRuleMutation = trpc.socialCommunityEnhanced.createDeidentificationRule.useMutation({
    onSuccess: () => {
      toast.success("脱敏规则创建成功");
      setShowRuleDialog(false);
      setNewRule({ name: "", pattern: "", patternType: "keyword", replacement: "[***]", category: "custom", priority: 0 });
      refetchRules();
    },
    onError: (error) => toast.error(`创建失败: ${error.message}`),
  });

  const updateRuleMutation = trpc.socialCommunityEnhanced.updateDeidentificationRule.useMutation({
    onSuccess: () => {
      toast.success("规则更新成功");
      setShowRuleDialog(false);
      setEditingRule(null);
      refetchRules();
    },
    onError: (error) => toast.error(`更新失败: ${error.message}`),
  });

  const deleteRuleMutation = trpc.socialCommunityEnhanced.deleteDeidentificationRule.useMutation({
    onSuccess: () => {
      toast.success("规则已删除");
      refetchRules();
    },
    onError: (error) => toast.error(`删除失败: ${error.message}`),
  });

  const testDeidentificationMutation = trpc.socialCommunityEnhanced.testDeidentification.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      toast.success("测试完成");
    },
    onError: (error) => toast.error(`测试失败: ${error.message}`),
  });

  const createTemplateMutation = trpc.socialCommunityEnhanced.createAIReplyTemplate.useMutation({
    onSuccess: () => {
      toast.success("模板创建成功");
      setShowTemplateDialog(false);
      setNewTemplate({ name: "", category: "custom", promptTemplate: "", systemPrompt: "", variables: [], isDefault: false });
      refetchTemplates();
    },
    onError: (error) => toast.error(`创建失败: ${error.message}`),
  });

  const updateTemplateMutation = trpc.socialCommunityEnhanced.updateAIReplyTemplate.useMutation({
    onSuccess: () => {
      toast.success("模板更新成功");
      setShowTemplateDialog(false);
      setEditingTemplate(null);
      refetchTemplates();
    },
    onError: (error) => toast.error(`更新失败: ${error.message}`),
  });

  const deleteTemplateMutation = trpc.socialCommunityEnhanced.deleteAIReplyTemplate.useMutation({
    onSuccess: () => {
      toast.success("模板已删除");
      refetchTemplates();
    },
    onError: (error) => toast.error(`删除失败: ${error.message}`),
  });

  // 分类标签颜色
  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      price: "bg-red-500/20 text-red-400 border-red-500/30",
      formula: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      personal: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      business: "bg-green-500/20 text-green-400 border-green-500/30",
      custom: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      greeting: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      technical: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      sales: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      support: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      farewell: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    };
    const labels: Record<string, string> = {
      price: "价格", formula: "配方", personal: "个人", business: "商业", custom: "自定义",
      greeting: "问候", technical: "技术", sales: "销售", support: "支持", farewell: "告别",
    };
    return (
      <Badge variant="outline" className={styles[category] || styles.custom}>
        {labels[category] || category}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              社群管理设置
            </h1>
            <p className="text-muted-foreground">
              配置消息脱敏规则、AI回复模板和Webhook集成
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="deidentification" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              脱敏规则
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI模板
            </TabsTrigger>
            <TabsTrigger value="webhook" className="flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              Webhook
            </TabsTrigger>
          </TabsList>

          {/* 脱敏规则配置 */}
          <TabsContent value="deidentification" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                配置消息脱敏规则，自动识别和替换敏感信息
              </p>
              <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingRule(null); setNewRule({ name: "", pattern: "", patternType: "keyword", replacement: "[***]", category: "custom", priority: 0 }); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    添加规则
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingRule ? "编辑脱敏规则" : "添加脱敏规则"}</DialogTitle>
                    <DialogDescription>
                      配置敏感信息识别模式和替换文本
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>规则名称</Label>
                      <Input
                        value={editingRule?.name || newRule.name}
                        onChange={(e) => editingRule 
                          ? setEditingRule({ ...editingRule, name: e.target.value })
                          : setNewRule({ ...newRule, name: e.target.value })}
                        placeholder="如：手机号码脱敏"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>匹配类型</Label>
                        <Select
                          value={editingRule?.patternType || newRule.patternType}
                          onValueChange={(v: any) => editingRule
                            ? setEditingRule({ ...editingRule, patternType: v })
                            : setNewRule({ ...newRule, patternType: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="keyword">关键词</SelectItem>
                            <SelectItem value="regex">正则表达式</SelectItem>
                            <SelectItem value="ai_detect">AI检测</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>分类</Label>
                        <Select
                          value={editingRule?.category || newRule.category}
                          onValueChange={(v: any) => editingRule
                            ? setEditingRule({ ...editingRule, category: v })
                            : setNewRule({ ...newRule, category: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="price">价格信息</SelectItem>
                            <SelectItem value="formula">配方信息</SelectItem>
                            <SelectItem value="personal">个人信息</SelectItem>
                            <SelectItem value="business">商业信息</SelectItem>
                            <SelectItem value="custom">自定义</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>匹配模式</Label>
                      <Textarea
                        value={editingRule?.pattern || newRule.pattern}
                        onChange={(e) => editingRule
                          ? setEditingRule({ ...editingRule, pattern: e.target.value })
                          : setNewRule({ ...newRule, pattern: e.target.value })}
                        placeholder={newRule.patternType === 'keyword' ? "关键词1,关键词2,关键词3" : "正则表达式，如：1[3-9]\\d{9}"}
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        {newRule.patternType === 'keyword' ? "多个关键词用逗号分隔" : "使用JavaScript正则表达式语法"}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>替换文本</Label>
                        <Input
                          value={editingRule?.replacement || newRule.replacement}
                          onChange={(e) => editingRule
                            ? setEditingRule({ ...editingRule, replacement: e.target.value })
                            : setNewRule({ ...newRule, replacement: e.target.value })}
                          placeholder="[***]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>优先级</Label>
                        <Input
                          type="number"
                          value={editingRule?.priority || newRule.priority}
                          onChange={(e) => editingRule
                            ? setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 0 })
                            : setNewRule({ ...newRule, priority: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowRuleDialog(false); setEditingRule(null); }}>
                      取消
                    </Button>
                    <Button
                      onClick={() => {
                        if (editingRule) {
                          updateRuleMutation.mutate({
                            id: editingRule.id,
                            name: editingRule.name,
                            pattern: editingRule.pattern,
                            patternType: editingRule.patternType,
                            replacement: editingRule.replacement,
                            category: editingRule.category,
                            priority: editingRule.priority,
                          });
                        } else {
                          createRuleMutation.mutate(newRule);
                        }
                      }}
                      disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                    >
                      {createRuleMutation.isPending || updateRuleMutation.isPending ? "保存中..." : "保存"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* 规则列表 */}
            <div className="grid gap-4">
              {rules?.map((rule: any) => (
                <Card key={rule.id} className="bg-card/50 border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{rule.name}</h3>
                          {getCategoryBadge(rule.category)}
                          <Badge variant="outline" className="text-xs">
                            {rule.pattern_type === 'keyword' ? '关键词' : rule.pattern_type === 'regex' ? '正则' : 'AI检测'}
                          </Badge>
                          {rule.is_enabled ? (
                            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">启用</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">禁用</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">{rule.pattern}</p>
                        <p className="text-xs text-muted-foreground">
                          替换为: <span className="text-primary">{rule.replacement}</span> | 优先级: {rule.priority}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingRule(rule);
                            setShowRuleDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("确定要删除此规则吗？")) {
                              deleteRuleMutation.mutate({ id: rule.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 测试脱敏 */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  测试脱敏效果
                </CardTitle>
                <CardDescription>输入测试文本，验证脱敏规则效果</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="输入包含敏感信息的测试文本，如：我的手机号是13812345678，报价是10000元"
                  rows={3}
                />
                <Button
                  onClick={() => testDeidentificationMutation.mutate({ text: testText })}
                  disabled={!testText || testDeidentificationMutation.isPending}
                >
                  {testDeidentificationMutation.isPending ? "测试中..." : "测试脱敏"}
                </Button>
                {testResult && (
                  <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">脱敏结果:</p>
                    <p className="text-sm text-primary">{testResult.deidentifiedText}</p>
                    {testResult.matchedRules?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">匹配的规则:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {testResult.matchedRules.map((r: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {r.ruleName}: {r.matches.join(', ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI回复模板 */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                配置AI回复模板，提高回复质量和一致性
              </p>
              <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingTemplate(null); setNewTemplate({ name: "", category: "custom", promptTemplate: "", systemPrompt: "", variables: [], isDefault: false }); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    添加模板
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingTemplate ? "编辑AI模板" : "添加AI模板"}</DialogTitle>
                    <DialogDescription>
                      配置AI回复的系统提示词和用户提示词模板
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>模板名称</Label>
                        <Input
                          value={editingTemplate?.name || newTemplate.name}
                          onChange={(e) => editingTemplate
                            ? setEditingTemplate({ ...editingTemplate, name: e.target.value })
                            : setNewTemplate({ ...newTemplate, name: e.target.value })}
                          placeholder="如：技术问题回复"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>分类</Label>
                        <Select
                          value={editingTemplate?.category || newTemplate.category}
                          onValueChange={(v: any) => editingTemplate
                            ? setEditingTemplate({ ...editingTemplate, category: v })
                            : setNewTemplate({ ...newTemplate, category: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="greeting">问候语</SelectItem>
                            <SelectItem value="technical">技术支持</SelectItem>
                            <SelectItem value="sales">销售咨询</SelectItem>
                            <SelectItem value="support">售后支持</SelectItem>
                            <SelectItem value="farewell">告别语</SelectItem>
                            <SelectItem value="custom">自定义</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>系统提示词</Label>
                      <Textarea
                        value={editingTemplate?.system_prompt || newTemplate.systemPrompt}
                        onChange={(e) => editingTemplate
                          ? setEditingTemplate({ ...editingTemplate, system_prompt: e.target.value })
                          : setNewTemplate({ ...newTemplate, systemPrompt: e.target.value })}
                        placeholder="定义AI的角色和行为规则..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>用户提示词模板</Label>
                      <Textarea
                        value={editingTemplate?.prompt_template || newTemplate.promptTemplate}
                        onChange={(e) => editingTemplate
                          ? setEditingTemplate({ ...editingTemplate, prompt_template: e.target.value })
                          : setNewTemplate({ ...newTemplate, promptTemplate: e.target.value })}
                        placeholder="使用 {{变量名}} 作为占位符，如：请回复以下问题：{{message}}"
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        使用 {"{{变量名}}"} 语法定义可替换的变量
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingTemplate?.is_default || newTemplate.isDefault}
                        onCheckedChange={(checked) => editingTemplate
                          ? setEditingTemplate({ ...editingTemplate, is_default: checked })
                          : setNewTemplate({ ...newTemplate, isDefault: checked })}
                      />
                      <Label>设为默认模板</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowTemplateDialog(false); setEditingTemplate(null); }}>
                      取消
                    </Button>
                    <Button
                      onClick={() => {
                        if (editingTemplate) {
                          updateTemplateMutation.mutate({
                            id: editingTemplate.id,
                            name: editingTemplate.name,
                            category: editingTemplate.category,
                            promptTemplate: editingTemplate.prompt_template,
                            systemPrompt: editingTemplate.system_prompt,
                            isDefault: editingTemplate.is_default,
                          });
                        } else {
                          createTemplateMutation.mutate(newTemplate);
                        }
                      }}
                      disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                    >
                      {createTemplateMutation.isPending || updateTemplateMutation.isPending ? "保存中..." : "保存"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* 模板列表 */}
            <div className="grid gap-4 md:grid-cols-2">
              {templates?.map((template: any) => (
                <Card key={template.id} className="bg-card/50 border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {template.name}
                          {template.is_default && (
                            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs">默认</Badge>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {getCategoryBadge(template.category)}
                          <span className="text-xs text-muted-foreground">使用次数: {template.usage_count}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingTemplate(template);
                            setShowTemplateDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("确定要删除此模板吗？")) {
                              deleteTemplateMutation.mutate({ id: template.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">系统提示词:</p>
                        <p className="text-sm line-clamp-2">{template.system_prompt}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">用户提示词模板:</p>
                        <p className="text-sm line-clamp-2 font-mono text-xs">{template.prompt_template}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Webhook配置 */}
          <TabsContent value="webhook" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="w-5 h-5" />
                  Social Bridge Webhook配置
                </CardTitle>
                <CardDescription>
                  配置与Social Bridge的Webhook集成，启用微信群消息监听
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-500">配置说明</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Social Bridge是微信群消息转发服务，需要单独部署。配置Webhook URL后，
                        群消息将自动转发到本系统进行AI处理和审核。
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Webhook接收地址（本系统）</Label>
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}/api/trpc/socialCommunity.receiveMessage`}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/trpc/socialCommunity.receiveMessage`);
                          toast.success("已复制到剪贴板");
                        }}
                      >
                        复制
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      将此地址配置到Social Bridge的消息转发目标
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>消息格式</Label>
                      <Select defaultValue="json">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="form">Form Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>认证方式</Label>
                      <Select defaultValue="bearer">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                          <SelectItem value="none">无认证</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
                      <span className="text-sm">Webhook状态: 等待配置</span>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      <TestTube className="w-4 h-4 mr-2" />
                      测试连接
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
