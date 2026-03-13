/**
 * 社群管理设置页面
 * 功能：脱敏规则配置、AI回复模板管理、Webhook配置
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt";
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
  const { t } = useLanguage();
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
      toast.success(t("common.socialSettings.ruleCreated"));
      setShowRuleDialog(false);
      setNewRule({ name: "", pattern: "", patternType: "keyword", replacement: "[***]", category: "custom", priority: 0 });
      refetchRules();
    },
    onError: (error) => toast.error(`${t("common.socialSettings.createFailed")}: ${error.message}`),
  });

  const updateRuleMutation = trpc.socialCommunityEnhanced.updateDeidentificationRule.useMutation({
    onSuccess: () => {
      toast.success(t("common.socialSettings.ruleUpdated"));
      setShowRuleDialog(false);
      setEditingRule(null);
      refetchRules();
    },
    onError: (error) => toast.error(`${t("common.socialSettings.updateFailed")}: ${error.message}`),
  });

  const deleteRuleMutation = trpc.socialCommunityEnhanced.deleteDeidentificationRule.useMutation({
    onSuccess: () => {
      toast.success(t("common.socialSettings.ruleDeleted"));
      refetchRules();
    },
    onError: (error) => toast.error(`${t("common.socialSettings.deleteFailed")}: ${error.message}`),
  });

  const testDeidentificationMutation = trpc.socialCommunityEnhanced.testDeidentification.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      toast.success(t("common.socialSettings.testComplete"));
    },
    onError: (error) => toast.error(`${t("common.socialSettings.testFailed")}: ${error.message}`),
  });

  const createTemplateMutation = trpc.socialCommunityEnhanced.createAIReplyTemplate.useMutation({
    onSuccess: () => {
      toast.success(t("common.socialSettings.templateCreated"));
      setShowTemplateDialog(false);
      setNewTemplate({ name: "", category: "custom", promptTemplate: "", systemPrompt: "", variables: [], isDefault: false });
      refetchTemplates();
    },
    onError: (error) => toast.error(`${t("common.socialSettings.createFailed")}: ${error.message}`),
  });

  const updateTemplateMutation = trpc.socialCommunityEnhanced.updateAIReplyTemplate.useMutation({
    onSuccess: () => {
      toast.success(t("common.socialSettings.templateUpdated"));
      setShowTemplateDialog(false);
      setEditingTemplate(null);
      refetchTemplates();
    },
    onError: (error) => toast.error(`${t("common.socialSettings.updateFailed")}: ${error.message}`),
  });

  const deleteTemplateMutation = trpc.socialCommunityEnhanced.deleteAIReplyTemplate.useMutation({
    onSuccess: () => {
      toast.success(t("common.socialSettings.templateDeleted"));
      refetchTemplates();
    },
    onError: (error) => toast.error(`${t("common.socialSettings.deleteFailed")}: ${error.message}`),
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
      price: t("common.socialSettings.catPriceLabel"), formula: t("common.socialSettings.catFormulaLabel"), personal: t("common.socialSettings.catPersonalLabel"), business: t("common.socialSettings.catBusinessLabel"), custom: t("common.socialSettings.catCustomLabel"),
      greeting: t("common.socialSettings.catGreetingLabel"), technical: t("common.socialSettings.catTechnicalLabel"), sales: t("common.socialSettings.catSalesLabel"), support: t("common.socialSettings.catSupportLabel"), farewell: t("common.socialSettings.catFarewellLabel"),
    };
    return (
      <Badge variant="outline" className={styles[category] || styles.custom}>
        {labels[category] || category}
      </Badge>
    );
  };

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Settings}
          title={t("common.socialSettings.title")}
          description={t("common.socialSettings.description")}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="deidentification" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {t("common.socialSettings.tabDesensitize")}
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              {t("common.socialSettings.tabTemplates")}
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
                {t("common.socialSettings.desensitizeHint")}
              </p>
              <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingRule(null); setNewRule({ name: "", pattern: "", patternType: "keyword", replacement: "[***]", category: "custom", priority: 0 }); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("common.socialSettings.addRule")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingRule ? t("common.socialSettings.editRule") : t("common.socialSettings.addRuleTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("common.socialSettings.addRuleDesc")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{t("common.socialSettings.ruleName")}</Label>
                      <Input
                        value={editingRule?.name || newRule.name}
                        onChange={(e) => editingRule 
                          ? setEditingRule({ ...editingRule, name: e.target.value })
                          : setNewRule({ ...newRule, name: e.target.value })}
                        placeholder={t("common.socialSettings.ruleNamePlaceholder")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("common.socialSettings.matchType")}</Label>
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
                            <SelectItem value="keyword">{t("common.socialSettings.keyword")}</SelectItem>
                            <SelectItem value="regex">{t("common.socialSettings.regex")}</SelectItem>
                            <SelectItem value="ai_detect">{t("common.socialSettings.aiDetect")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("common.socialSettings.category")}</Label>
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
                            <SelectItem value="price">{t("common.socialSettings.catPrice")}</SelectItem>
                            <SelectItem value="formula">{t("common.socialSettings.catFormula")}</SelectItem>
                            <SelectItem value="personal">{t("common.socialSettings.catPersonal")}</SelectItem>
                            <SelectItem value="business">{t("common.socialSettings.catBusiness")}</SelectItem>
                            <SelectItem value="custom">{t("common.socialSettings.catCustom")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("common.socialSettings.matchPattern")}</Label>
                      <Textarea
                        value={editingRule?.pattern || newRule.pattern}
                        onChange={(e) => editingRule
                          ? setEditingRule({ ...editingRule, pattern: e.target.value })
                          : setNewRule({ ...newRule, pattern: e.target.value })}
                        placeholder={newRule.patternType === 'keyword' ? t("common.socialSettings.keywordPlaceholder") : t("common.socialSettings.regexPlaceholder")}
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        {newRule.patternType === 'keyword' ? t("common.socialSettings.keywordHint") : t("common.socialSettings.regexHint")}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("common.socialSettings.replacementText")}</Label>
                        <Input
                          value={editingRule?.replacement || newRule.replacement}
                          onChange={(e) => editingRule
                            ? setEditingRule({ ...editingRule, replacement: e.target.value })
                            : setNewRule({ ...newRule, replacement: e.target.value })}
                          placeholder="[***]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("common.socialSettings.priority")}</Label>
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
                      {t("common.socialSettings.cancel")}
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
                      {createRuleMutation.isPending || updateRuleMutation.isPending ? t("common.socialSettings.saving") : t("common.socialSettings.save")}
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
                            {rule.pattern_type === 'keyword' ? t("common.socialSettings.keywordBadge") : rule.pattern_type === 'regex' ? t("common.socialSettings.regexBadge") : t("common.socialSettings.aiDetectBadge")}
                          </Badge>
                          {rule.is_enabled ? (
                            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">{t("common.socialSettings.enabled")}</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">{t("common.socialSettings.disabledBadge")}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">{rule.pattern}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("common.socialSettings.replaceWith")}: <span className="text-primary">{rule.replacement}</span> | {t("common.socialSettings.priorityLabel")}: {rule.priority}
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
                            if (confirm(t("common.socialSettings.confirmDeleteRule"))) {
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
                  {t("common.socialSettings.testEffect")}
                </CardTitle>
                <CardDescription>{t("common.socialSettings.testEffectDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder={t("common.socialSettings.testPlaceholder")}
                  rows={3}
                />
                <Button
                  onClick={() => testDeidentificationMutation.mutate({ text: testText })}
                  disabled={!testText || testDeidentificationMutation.isPending}
                >
                  {testDeidentificationMutation.isPending ? t("common.socialSettings.testing") : t("common.socialSettings.testDesensitize")}
                </Button>
                {testResult && (
                  <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">{t("common.socialSettings.desensitizeResult")}</p>
                    <p className="text-sm text-primary">{testResult.deidentifiedText}</p>
                    {testResult.matchedRules?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">{t("common.socialSettings.matchedRules")}</p>
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
                {t("common.socialSettings.templateHint")}
              </p>
              <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingTemplate(null); setNewTemplate({ name: "", category: "custom", promptTemplate: "", systemPrompt: "", variables: [], isDefault: false }); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("common.socialSettings.addTemplate")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingTemplate ? t("common.socialSettings.editTemplate") : t("common.socialSettings.addTemplateTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("common.socialSettings.addTemplateDesc")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("common.socialSettings.templateName")}</Label>
                        <Input
                          value={editingTemplate?.name || newTemplate.name}
                          onChange={(e) => editingTemplate
                            ? setEditingTemplate({ ...editingTemplate, name: e.target.value })
                            : setNewTemplate({ ...newTemplate, name: e.target.value })}
                          placeholder={t("common.socialSettings.templateNamePlaceholder")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("common.socialSettings.category")}</Label>
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
                            <SelectItem value="greeting">{t("common.socialSettings.catGreeting")}</SelectItem>
                            <SelectItem value="technical">{t("common.socialSettings.catTechnical")}</SelectItem>
                            <SelectItem value="sales">{t("common.socialSettings.catSales")}</SelectItem>
                            <SelectItem value="support">{t("common.socialSettings.catSupport")}</SelectItem>
                            <SelectItem value="farewell">{t("common.socialSettings.catFarewell")}</SelectItem>
                            <SelectItem value="custom">{t("common.socialSettings.catCustom")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("common.socialSettings.systemPrompt")}</Label>
                      <Textarea
                        value={editingTemplate?.system_prompt || newTemplate.systemPrompt}
                        onChange={(e) => editingTemplate
                          ? setEditingTemplate({ ...editingTemplate, system_prompt: e.target.value })
                          : setNewTemplate({ ...newTemplate, systemPrompt: e.target.value })}
                        placeholder={t("common.socialSettings.systemPromptPlaceholder")}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("common.socialSettings.userPromptTemplate")}</Label>
                      <Textarea
                        value={editingTemplate?.prompt_template || newTemplate.promptTemplate}
                        onChange={(e) => editingTemplate
                          ? setEditingTemplate({ ...editingTemplate, prompt_template: e.target.value })
                          : setNewTemplate({ ...newTemplate, promptTemplate: e.target.value })}
                        placeholder={t("common.socialSettings.userPromptPlaceholder")}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("common.socialSettings.variableHint")}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingTemplate?.is_default || newTemplate.isDefault}
                        onCheckedChange={(checked) => editingTemplate
                          ? setEditingTemplate({ ...editingTemplate, is_default: checked })
                          : setNewTemplate({ ...newTemplate, isDefault: checked })}
                      />
                      <Label>{t("common.socialSettings.setDefault")}</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowTemplateDialog(false); setEditingTemplate(null); }}>
                      {t("common.socialSettings.cancel")}
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
                      {createTemplateMutation.isPending || updateTemplateMutation.isPending ? t("common.socialSettings.saving") : t("common.socialSettings.save")}
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
                            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs">{t("common.socialSettings.defaultBadge")}</Badge>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {getCategoryBadge(template.category)}
                          <span className="text-xs text-muted-foreground">{t("common.socialSettings.usageCount")}: {template.usage_count}</span>
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
                            if (confirm(t("common.socialSettings.confirmDeleteTemplate"))) {
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
                        <p className="text-xs text-muted-foreground mb-1">{t("common.socialSettings.systemPromptLabel")}</p>
                        <p className="text-sm line-clamp-2">{template.system_prompt}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t("common.socialSettings.userPromptLabel")}</p>
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
                  {t("common.socialSettings.webhookTitle")}
                </CardTitle>
                <CardDescription>
                  {t("common.socialSettings.webhookDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-500">{t("common.socialSettings.webhookConfigNote")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("common.socialSettings.webhookConfigDesc")}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("common.socialSettings.webhookReceiveUrl")}</Label>
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
                          toast.success(t("common.socialSettings.copiedToClipboard"));
                        }}
                      >
                        {t("common.socialSettings.copy")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("common.socialSettings.webhookUrlHint")}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("common.socialSettings.msgFormat")}</Label>
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
                      <Label>{t("common.socialSettings.authMethod")}</Label>
                      <Select defaultValue="bearer">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                          <SelectItem value="none">{t("common.socialSettings.noAuth")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
                      <span className="text-sm">{t("common.socialSettings.webhookStatus")}</span>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      <TestTube className="w-4 h-4 mr-2" />
                      {t("common.socialSettings.testConnection")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
