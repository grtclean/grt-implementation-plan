/**
 * 合规规则配置页面
 * 管理员可自定义各地区的工时阈值、预警触发条件和邮件通知模板
 */

import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { 
  AlertTriangle, 
  ArrowLeft, 
  BookOpen, 
  Clock, 
  Edit, 
  FileText, 
  Globe, 
  Mail, 
  Plus, 
  Settings, 
  Shield, 
  Trash2 
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// 类型定义
type Jurisdiction = "DE" | "US" | "CN" | "OTHER";
type RuleType = "daily_limit" | "weekly_limit" | "rest_period" | "overtime_limit" | "exemption_check";
type AlertType = "VIOLATION_10H_LIMIT" | "VIOLATION_REST_PERIOD" | "EXEMPTION_AT_RISK" | "OVERTIME_WARNING" | "WEEKLY_SUMMARY";
type Severity = "critical" | "warning" | "info";

export default function ComplianceRulesConfig() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("rules");
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  // 新规则表单状态
  const [newRule, setNewRule] = useState({
    ruleName: "",
    ruleDescription: "",
    jurisdiction: "DE" as Jurisdiction,
    ruleType: "daily_limit" as RuleType,
    thresholdValue: 10,
    thresholdUnit: "hours" as "hours" | "minutes" | "days" | "percentage",
    warningThreshold: 8,
    criticalThreshold: 10,
    legalReference: "",
    recommendedAction: "",
    priority: 100
  });

  // 新模板表单状态
  const [newTemplate, setNewTemplate] = useState({
    templateName: "",
    templateDescription: "",
    alertType: "VIOLATION_10H_LIMIT" as AlertType,
    severity: "warning" as Severity,
    jurisdiction: "ALL" as Jurisdiction | "ALL",
    subjectTemplate: "",
    bodyTemplate: "",
    isHtml: true,
    recipientTypes: ["supervisor", "hr"]
  });

  // 数据查询
  const { data: rulesData, refetch: refetchRules } = (trpc.compliance.getRules as any).useQuery({});
  const { data: templatesData, refetch: refetchTemplates } = (trpc.compliance.getTemplates as any).useQuery({});
  const { data: ruleStats } = trpc.compliance.getRuleStats.useQuery();
  const { data: templateStats } = trpc.compliance.getTemplateStats.useQuery();

  // Mutations
  const createRuleMutation = trpc.compliance.createRule.useMutation({
    onSuccess: () => {
      toast.success("规则创建成功");
      setIsAddRuleOpen(false);
      refetchRules();
      resetNewRule();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    }
  });

  const updateRuleMutation = trpc.compliance.updateRule.useMutation({
    onSuccess: () => {
      toast.success("规则更新成功");
      setEditingRule(null);
      refetchRules();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    }
  });

  const deleteRuleMutation = trpc.compliance.deleteRule.useMutation({
    onSuccess: () => {
      toast.success("规则已删除");
      refetchRules();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    }
  });

  const toggleRuleMutation = trpc.compliance.toggleRuleEnabled.useMutation({
    onSuccess: () => {
      refetchRules();
    }
  });

  const createTemplateMutation = trpc.compliance.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("模板创建成功");
      setIsAddTemplateOpen(false);
      refetchTemplates();
      resetNewTemplate();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    }
  });

  const updateTemplateMutation = trpc.compliance.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("模板更新成功");
      setEditingTemplate(null);
      refetchTemplates();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    }
  });

  const deleteTemplateMutation = trpc.compliance.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("模板已删除");
      refetchTemplates();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    }
  });

  const toggleTemplateMutation = trpc.compliance.toggleTemplateEnabled.useMutation({
    onSuccess: () => {
      refetchTemplates();
    }
  });

  // 重置表单
  const resetNewRule = () => {
    setNewRule({
      ruleName: "",
      ruleDescription: "",
      jurisdiction: "DE",
      ruleType: "daily_limit",
      thresholdValue: 10,
      thresholdUnit: "hours",
      warningThreshold: 8,
      criticalThreshold: 10,
      legalReference: "",
      recommendedAction: "",
      priority: 100
    });
  };

  const resetNewTemplate = () => {
    setNewTemplate({
      templateName: "",
      templateDescription: "",
      alertType: "VIOLATION_10H_LIMIT",
      severity: "warning",
      jurisdiction: "ALL",
      subjectTemplate: "",
      bodyTemplate: "",
      isHtml: true,
      recipientTypes: ["supervisor", "hr"]
    });
  };

  // 获取地区标签
  const getJurisdictionLabel = (j: string) => {
    const labels: Record<string, string> = {
      DE: "🇩🇪 德国",
      US: "🇺🇸 美国",
      CN: "🇨🇳 中国",
      OTHER: "🌍 其他",
      ALL: "🌐 全部"
    };
    return labels[j] || j;
  };

  // 获取规则类型标签
  const getRuleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily_limit: "每日上限",
      weekly_limit: "每周上限",
      rest_period: "休息时间",
      overtime_limit: "加班上限",
      exemption_check: "豁免检查"
    };
    return labels[type] || type;
  };

  // 获取预警类型标签
  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      VIOLATION_10H_LIMIT: "10小时违规",
      VIOLATION_REST_PERIOD: "休息不足",
      EXEMPTION_AT_RISK: "豁免风险",
      OVERTIME_WARNING: "加班预警",
      WEEKLY_SUMMARY: "每周摘要"
    };
    return labels[type] || type;
  };

  // 获取严重程度徽章
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">严重</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">警告</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">提示</Badge>;
    }
  };

  const rules = (rulesData as any)?.rules || [];
  const templates = (templatesData as any)?.templates || [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/compliance-dashboard")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6 text-primary" />
                合规规则配置
              </h1>
              <p className="text-muted-foreground">管理工时阈值、预警规则和邮件通知模板</p>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">总规则数</p>
                  <p className="text-2xl font-bold">{(ruleStats as any)?.totalRules || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Clock className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">启用规则</p>
                  <p className="text-2xl font-bold">{(ruleStats as any)?.enabledRules || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">总模板数</p>
                  <p className="text-2xl font-bold">{(templateStats as any)?.totalTemplates || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">启用模板</p>
                  <p className="text-2xl font-bold">{(templateStats as any)?.enabledTemplates || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主内容标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card/50 border border-border">
            <TabsTrigger value="rules" className="data-[state=active]:bg-primary/20">
              <Shield className="w-4 h-4 mr-2" />
              合规规则
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-primary/20">
              <Mail className="w-4 h-4 mr-2" />
              邮件模板
            </TabsTrigger>
          </TabsList>

          {/* 合规规则标签页 */}
          <TabsContent value="rules" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>合规规则列表</CardTitle>
                  <CardDescription>配置各地区的工时阈值和预警触发条件</CardDescription>
                </div>
                <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      添加规则
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>添加合规规则</DialogTitle>
                      <DialogDescription>创建新的工时合规规则</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>规则名称</Label>
                          <Input 
                            value={newRule.ruleName}
                            onChange={(e) => setNewRule({...newRule, ruleName: e.target.value})}
                            placeholder="例如：德国每日工时上限"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>管辖区</Label>
                          <Select 
                            value={newRule.jurisdiction}
                            onValueChange={(v) => setNewRule({...newRule, jurisdiction: v as Jurisdiction})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DE">🇩🇪 德国</SelectItem>
                              <SelectItem value="US">🇺🇸 美国</SelectItem>
                              <SelectItem value="CN">🇨🇳 中国</SelectItem>
                              <SelectItem value="OTHER">🌍 其他</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>规则类型</Label>
                          <Select 
                            value={newRule.ruleType}
                            onValueChange={(v) => setNewRule({...newRule, ruleType: v as RuleType})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily_limit">每日上限</SelectItem>
                              <SelectItem value="weekly_limit">每周上限</SelectItem>
                              <SelectItem value="rest_period">休息时间</SelectItem>
                              <SelectItem value="overtime_limit">加班上限</SelectItem>
                              <SelectItem value="exemption_check">豁免检查</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>阈值单位</Label>
                          <Select 
                            value={newRule.thresholdUnit}
                            onValueChange={(v) => setNewRule({...newRule, thresholdUnit: v as any})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hours">小时</SelectItem>
                              <SelectItem value="minutes">分钟</SelectItem>
                              <SelectItem value="days">天</SelectItem>
                              <SelectItem value="percentage">百分比</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>阈值</Label>
                          <Input 
                            type="number"
                            value={newRule.thresholdValue}
                            onChange={(e) => setNewRule({...newRule, thresholdValue: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>警告阈值</Label>
                          <Input 
                            type="number"
                            value={newRule.warningThreshold}
                            onChange={(e) => setNewRule({...newRule, warningThreshold: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>严重阈值</Label>
                          <Input 
                            type="number"
                            value={newRule.criticalThreshold}
                            onChange={(e) => setNewRule({...newRule, criticalThreshold: parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>规则描述</Label>
                        <Textarea 
                          value={newRule.ruleDescription}
                          onChange={(e) => setNewRule({...newRule, ruleDescription: e.target.value})}
                          placeholder="描述此规则的目的和适用场景"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>法律依据</Label>
                          <Input 
                            value={newRule.legalReference}
                            onChange={(e) => setNewRule({...newRule, legalReference: e.target.value})}
                            placeholder="例如：ArbZG §3"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>优先级</Label>
                          <Input 
                            type="number"
                            value={newRule.priority}
                            onChange={(e) => setNewRule({...newRule, priority: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>建议措施</Label>
                        <Textarea 
                          value={newRule.recommendedAction}
                          onChange={(e) => setNewRule({...newRule, recommendedAction: e.target.value})}
                          placeholder="当触发此规则时的建议处理措施"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddRuleOpen(false)}>取消</Button>
                      <Button 
                        onClick={() => createRuleMutation.mutate(newRule)}
                        disabled={createRuleMutation.isPending}
                      >
                        {createRuleMutation.isPending ? "创建中..." : "创建规则"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>规则名称</TableHead>
                        <TableHead>管辖区</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>阈值</TableHead>
                        <TableHead>法律依据</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            暂无合规规则
                          </TableCell>
                        </TableRow>
                      ) : (
                        rules.map((rule: any) => (
                          <TableRow key={rule.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div>
                                <p className="font-medium">{rule.ruleName}</p>
                                <p className="text-xs text-muted-foreground">{rule.ruleId}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getJurisdictionLabel(rule.jurisdiction)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{getRuleTypeLabel(rule.ruleType)}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <span className="font-mono">{rule.thresholdValue}</span>
                                <span className="text-muted-foreground ml-1">{rule.thresholdUnit}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {rule.legalReference ? (
                                <Badge variant="outline" className="text-xs">
                                  <BookOpen className="w-3 h-3 mr-1" />
                                  {rule.legalReference}
                                </Badge>
                              ) : "-"}
                            </TableCell>
                            <TableCell>
                              <Switch 
                                checked={rule.isEnabled === 1}
                                onCheckedChange={() => toggleRuleMutation.mutate({ ruleId: rule.ruleId })}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setEditingRule(rule)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (confirm("确定要删除此规则吗？")) {
                                      deleteRuleMutation.mutate({ ruleId: rule.ruleId });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 邮件模板标签页 */}
          <TabsContent value="templates" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>邮件模板列表</CardTitle>
                  <CardDescription>配置预警通知的邮件模板</CardDescription>
                </div>
                <Dialog open={isAddTemplateOpen} onOpenChange={setIsAddTemplateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      添加模板
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>添加邮件模板</DialogTitle>
                      <DialogDescription>创建新的预警通知邮件模板</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>模板名称</Label>
                          <Input 
                            value={newTemplate.templateName}
                            onChange={(e) => setNewTemplate({...newTemplate, templateName: e.target.value})}
                            placeholder="例如：德国10小时违规通知"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>预警类型</Label>
                          <Select 
                            value={newTemplate.alertType}
                            onValueChange={(v) => setNewTemplate({...newTemplate, alertType: v as AlertType})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="VIOLATION_10H_LIMIT">10小时违规</SelectItem>
                              <SelectItem value="VIOLATION_REST_PERIOD">休息不足</SelectItem>
                              <SelectItem value="EXEMPTION_AT_RISK">豁免风险</SelectItem>
                              <SelectItem value="OVERTIME_WARNING">加班预警</SelectItem>
                              <SelectItem value="WEEKLY_SUMMARY">每周摘要</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>严重程度</Label>
                          <Select 
                            value={newTemplate.severity}
                            onValueChange={(v) => setNewTemplate({...newTemplate, severity: v as Severity})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="critical">严重</SelectItem>
                              <SelectItem value="warning">警告</SelectItem>
                              <SelectItem value="info">提示</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>适用地区</Label>
                          <Select 
                            value={newTemplate.jurisdiction}
                            onValueChange={(v) => setNewTemplate({...newTemplate, jurisdiction: v as any})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">🌐 全部</SelectItem>
                              <SelectItem value="DE">🇩🇪 德国</SelectItem>
                              <SelectItem value="US">🇺🇸 美国</SelectItem>
                              <SelectItem value="CN">🇨🇳 中国</SelectItem>
                              <SelectItem value="OTHER">🌍 其他</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>模板描述</Label>
                        <Textarea 
                          value={newTemplate.templateDescription}
                          onChange={(e) => setNewTemplate({...newTemplate, templateDescription: e.target.value})}
                          placeholder="描述此模板的用途"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>邮件主题</Label>
                        <Input 
                          value={newTemplate.subjectTemplate}
                          onChange={(e) => setNewTemplate({...newTemplate, subjectTemplate: e.target.value})}
                          placeholder="使用 {{变量名}} 插入动态内容"
                        />
                        <p className="text-xs text-muted-foreground">
                          可用变量: {"{{employeeName}}"}, {"{{date}}"}, {"{{actualHours}}"}, {"{{riskReason}}"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>邮件正文</Label>
                        <Textarea 
                          value={newTemplate.bodyTemplate}
                          onChange={(e) => setNewTemplate({...newTemplate, bodyTemplate: e.target.value})}
                          placeholder="支持HTML格式，使用 {{变量名}} 插入动态内容"
                          className="min-h-[200px] font-mono text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={newTemplate.isHtml}
                          onCheckedChange={(v) => setNewTemplate({...newTemplate, isHtml: v})}
                        />
                        <Label>HTML格式</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddTemplateOpen(false)}>取消</Button>
                      <Button 
                        onClick={() => createTemplateMutation.mutate(newTemplate)}
                        disabled={createTemplateMutation.isPending}
                      >
                        {createTemplateMutation.isPending ? "创建中..." : "创建模板"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>模板名称</TableHead>
                        <TableHead>预警类型</TableHead>
                        <TableHead>严重程度</TableHead>
                        <TableHead>适用地区</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            暂无邮件模板
                          </TableCell>
                        </TableRow>
                      ) : (
                        templates.map((template: any) => (
                          <TableRow key={template.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div>
                                <p className="font-medium">{template.templateName}</p>
                                <p className="text-xs text-muted-foreground">{template.templateId}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getAlertTypeLabel(template.alertType)}</Badge>
                            </TableCell>
                            <TableCell>{getSeverityBadge(template.severity)}</TableCell>
                            <TableCell>{getJurisdictionLabel(template.jurisdiction)}</TableCell>
                            <TableCell>
                              <Switch 
                                checked={template.isEnabled === 1}
                                onCheckedChange={() => toggleTemplateMutation.mutate({ templateId: template.templateId })}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setEditingTemplate(template)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (confirm("确定要删除此模板吗？")) {
                                      deleteTemplateMutation.mutate({ templateId: template.templateId });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
