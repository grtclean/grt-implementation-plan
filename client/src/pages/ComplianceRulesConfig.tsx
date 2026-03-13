/**
 * 合规规则配置页面
 * 管理员可自定义各地区的工时阈值、预警触发条件和邮件通知模板
 */

import { PageHeader, StatCard } from "@/components/grt";
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
import { useLanguage } from "@/contexts/LanguageContext";

// 类型定义
type Jurisdiction = "DE" | "US" | "CN" | "OTHER";
type RuleType = "daily_limit" | "weekly_limit" | "rest_period" | "overtime_limit" | "exemption_check";
type AlertType = "VIOLATION_10H_LIMIT" | "VIOLATION_REST_PERIOD" | "EXEMPTION_AT_RISK" | "OVERTIME_WARNING" | "WEEKLY_SUMMARY";
type Severity = "critical" | "warning" | "info";

export default function ComplianceRulesConfig() {
  const { t, tpl } = useLanguage();
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
      toast.success(t("admin.complianceRules.ruleCreated"));
      setIsAddRuleOpen(false);
      refetchRules();
      resetNewRule();
    },
    onError: (error) => {
      toast.error(tpl("admin.complianceRules.createFailed", { msg: error.message }));
    }
  });

  const updateRuleMutation = trpc.compliance.updateRule.useMutation({
    onSuccess: () => {
      toast.success(t("admin.complianceRules.ruleUpdated"));
      setEditingRule(null);
      refetchRules();
    },
    onError: (error) => {
      toast.error(tpl("admin.complianceRules.updateFailed", { msg: error.message }));
    }
  });

  const deleteRuleMutation = trpc.compliance.deleteRule.useMutation({
    onSuccess: () => {
      toast.success(t("admin.complianceRules.ruleDeleted"));
      refetchRules();
    },
    onError: (error) => {
      toast.error(tpl("admin.complianceRules.deleteFailed", { msg: error.message }));
    }
  });

  const toggleRuleMutation = trpc.compliance.toggleRuleEnabled.useMutation({
    onSuccess: () => {
      refetchRules();
    }
  });

  const createTemplateMutation = trpc.compliance.createTemplate.useMutation({
    onSuccess: () => {
      toast.success(t("admin.complianceRules.templateCreated"));
      setIsAddTemplateOpen(false);
      refetchTemplates();
      resetNewTemplate();
    },
    onError: (error) => {
      toast.error(tpl("admin.complianceRules.createFailed", { msg: error.message }));
    }
  });

  const updateTemplateMutation = trpc.compliance.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success(t("admin.complianceRules.templateUpdated"));
      setEditingTemplate(null);
      refetchTemplates();
    },
    onError: (error) => {
      toast.error(tpl("admin.complianceRules.updateFailed", { msg: error.message }));
    }
  });

  const deleteTemplateMutation = trpc.compliance.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success(t("admin.complianceRules.templateDeleted"));
      refetchTemplates();
    },
    onError: (error) => {
      toast.error(tpl("admin.complianceRules.deleteFailed", { msg: error.message }));
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
    const keyMap: Record<string, string> = {
      DE: "admin.complianceRules.jurisdictionDE",
      US: "admin.complianceRules.jurisdictionUS",
      CN: "admin.complianceRules.jurisdictionCN",
      OTHER: "admin.complianceRules.jurisdictionOTHER",
      ALL: "admin.complianceRules.jurisdictionALL",
    };
    return keyMap[j] ? t(keyMap[j]) : j;
  };

  // 获取规则类型标签
  const getRuleTypeLabel = (type: string) => {
    const keyMap: Record<string, string> = {
      daily_limit: "admin.complianceRules.ruleTypeDailyLimit",
      weekly_limit: "admin.complianceRules.ruleTypeWeeklyLimit",
      rest_period: "admin.complianceRules.ruleTypeRestPeriod",
      overtime_limit: "admin.complianceRules.ruleTypeOvertimeLimit",
      exemption_check: "admin.complianceRules.ruleTypeExemptionCheck",
    };
    return keyMap[type] ? t(keyMap[type]) : type;
  };

  // 获取预警类型标签
  const getAlertTypeLabel = (type: string) => {
    const keyMap: Record<string, string> = {
      VIOLATION_10H_LIMIT: "admin.complianceRules.alertViolation10h",
      VIOLATION_REST_PERIOD: "admin.complianceRules.alertRestPeriod",
      EXEMPTION_AT_RISK: "admin.complianceRules.alertExemptionRisk",
      OVERTIME_WARNING: "admin.complianceRules.alertOvertimeWarning",
      WEEKLY_SUMMARY: "admin.complianceRules.alertWeeklySummary",
    };
    return keyMap[type] ? t(keyMap[type]) : type;
  };

  // 获取严重程度徽章
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{t("admin.complianceRules.severityCritical")}</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{t("admin.complianceRules.severityWarning")}</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{t("admin.complianceRules.severityInfo")}</Badge>;
    }
  };

  const rules = (rulesData as any)?.rules || [];
  const templates = (templatesData as any)?.templates || [];

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Settings}
          title={t("admin.complianceRules.title")}
          description={t("admin.complianceRules.description")}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/compliance-dashboard")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("admin.complianceRules.back")}
            </Button>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Shield} label={t("admin.complianceRules.totalRules")} value={(ruleStats as any)?.totalRules || 0} iconColor="text-primary" iconBg="bg-primary/20" />
          <StatCard icon={Clock} label={t("admin.complianceRules.enabledRules")} value={(ruleStats as any)?.enabledRules || 0} iconColor="text-green-400" iconBg="bg-green-500/20" />
          <StatCard icon={Mail} label={t("admin.complianceRules.totalTemplates")} value={(templateStats as any)?.totalTemplates || 0} iconColor="text-blue-400" iconBg="bg-blue-500/20" />
          <StatCard icon={FileText} label={t("admin.complianceRules.enabledTemplates")} value={(templateStats as any)?.enabledTemplates || 0} iconColor="text-purple-400" iconBg="bg-purple-500/20" />
        </div>

        {/* 主内容标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card/50 border border-border">
            <TabsTrigger value="rules" className="data-[state=active]:bg-primary/20">
              <Shield className="w-4 h-4 mr-2" />
              {t("admin.complianceRules.tabRules")}
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-primary/20">
              <Mail className="w-4 h-4 mr-2" />
              {t("admin.complianceRules.tabTemplates")}
            </TabsTrigger>
          </TabsList>

          {/* 合规规则标签页 */}
          <TabsContent value="rules" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("admin.complianceRules.ruleListTitle")}</CardTitle>
                  <CardDescription>{t("admin.complianceRules.ruleListDesc")}</CardDescription>
                </div>
                <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      {t("admin.complianceRules.addRule")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{t("admin.complianceRules.addRuleTitle")}</DialogTitle>
                      <DialogDescription>{t("admin.complianceRules.addRuleDesc")}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("admin.complianceRules.ruleName")}</Label>
                          <Input
                            value={newRule.ruleName}
                            onChange={(e) => setNewRule({...newRule, ruleName: e.target.value})}
                            placeholder={t("admin.complianceRules.ruleNamePlaceholder")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("admin.complianceRules.jurisdiction")}</Label>
                          <Select 
                            value={newRule.jurisdiction}
                            onValueChange={(v) => setNewRule({...newRule, jurisdiction: v as Jurisdiction})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DE">{t("admin.complianceRules.jurisdictionDE")}</SelectItem>
                              <SelectItem value="US">{t("admin.complianceRules.jurisdictionUS")}</SelectItem>
                              <SelectItem value="CN">{t("admin.complianceRules.jurisdictionCN")}</SelectItem>
                              <SelectItem value="OTHER">{t("admin.complianceRules.jurisdictionOTHER")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("admin.complianceRules.ruleType")}</Label>
                          <Select 
                            value={newRule.ruleType}
                            onValueChange={(v) => setNewRule({...newRule, ruleType: v as RuleType})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily_limit">{t("admin.complianceRules.ruleTypeDailyLimit")}</SelectItem>
                              <SelectItem value="weekly_limit">{t("admin.complianceRules.ruleTypeWeeklyLimit")}</SelectItem>
                              <SelectItem value="rest_period">{t("admin.complianceRules.ruleTypeRestPeriod")}</SelectItem>
                              <SelectItem value="overtime_limit">{t("admin.complianceRules.ruleTypeOvertimeLimit")}</SelectItem>
                              <SelectItem value="exemption_check">{t("admin.complianceRules.ruleTypeExemptionCheck")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("admin.complianceRules.thresholdUnit")}</Label>
                          <Select 
                            value={newRule.thresholdUnit}
                            onValueChange={(v) => setNewRule({...newRule, thresholdUnit: v as any})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hours">{t("admin.complianceRules.unitHours")}</SelectItem>
                              <SelectItem value="minutes">{t("admin.complianceRules.unitMinutes")}</SelectItem>
                              <SelectItem value="days">{t("admin.complianceRules.unitDays")}</SelectItem>
                              <SelectItem value="percentage">{t("admin.complianceRules.unitPercentage")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>{t("admin.complianceRules.threshold")}</Label>
                          <Input 
                            type="number"
                            value={newRule.thresholdValue}
                            onChange={(e) => setNewRule({...newRule, thresholdValue: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("admin.complianceRules.warningThreshold")}</Label>
                          <Input 
                            type="number"
                            value={newRule.warningThreshold}
                            onChange={(e) => setNewRule({...newRule, warningThreshold: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("admin.complianceRules.criticalThreshold")}</Label>
                          <Input 
                            type="number"
                            value={newRule.criticalThreshold}
                            onChange={(e) => setNewRule({...newRule, criticalThreshold: parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.complianceRules.ruleDescription")}</Label>
                        <Textarea
                          value={newRule.ruleDescription}
                          onChange={(e) => setNewRule({...newRule, ruleDescription: e.target.value})}
                          placeholder={t("admin.complianceRules.ruleDescPlaceholder")}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("admin.complianceRules.legalReference")}</Label>
                          <Input
                            value={newRule.legalReference}
                            onChange={(e) => setNewRule({...newRule, legalReference: e.target.value})}
                            placeholder={t("admin.complianceRules.legalRefPlaceholder")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("admin.complianceRules.priorityLabel")}</Label>
                          <Input 
                            type="number"
                            value={newRule.priority}
                            onChange={(e) => setNewRule({...newRule, priority: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.complianceRules.recommendedAction")}</Label>
                        <Textarea
                          value={newRule.recommendedAction}
                          onChange={(e) => setNewRule({...newRule, recommendedAction: e.target.value})}
                          placeholder={t("admin.complianceRules.recommendedActionPlaceholder")}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddRuleOpen(false)}>{t("admin.complianceRules.cancel")}</Button>
                      <Button
                        onClick={() => createRuleMutation.mutate(newRule)}
                        disabled={createRuleMutation.isPending}
                      >
                        {createRuleMutation.isPending ? t("admin.complianceRules.creating") : t("admin.complianceRules.createRule")}
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
                        <TableHead>{t("admin.complianceRules.thRuleName")}</TableHead>
                        <TableHead>{t("admin.complianceRules.thJurisdiction")}</TableHead>
                        <TableHead>{t("admin.complianceRules.thType")}</TableHead>
                        <TableHead>{t("admin.complianceRules.thThreshold")}</TableHead>
                        <TableHead>{t("admin.complianceRules.thLegalRef")}</TableHead>
                        <TableHead>{t("admin.complianceRules.thStatus")}</TableHead>
                        <TableHead>{t("admin.complianceRules.thAction")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {t("admin.complianceRules.noRules")}
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
                                    if (confirm(t("admin.complianceRules.confirmDeleteRule"))) {
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
                  <CardTitle>{t("admin.complianceRules.templateListTitle")}</CardTitle>
                  <CardDescription>{t("admin.complianceRules.templateListDesc")}</CardDescription>
                </div>
                <Dialog open={isAddTemplateOpen} onOpenChange={setIsAddTemplateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      {t("admin.complianceRules.addTemplate")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{t("admin.complianceRules.addTemplateTitle")}</DialogTitle>
                      <DialogDescription>{t("admin.complianceRules.addTemplateDesc")}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("admin.complianceRules.templateName")}</Label>
                          <Input
                            value={newTemplate.templateName}
                            onChange={(e) => setNewTemplate({...newTemplate, templateName: e.target.value})}
                            placeholder={t("admin.complianceRules.templateNamePlaceholder")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("admin.complianceRules.alertType")}</Label>
                          <Select 
                            value={newTemplate.alertType}
                            onValueChange={(v) => setNewTemplate({...newTemplate, alertType: v as AlertType})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="VIOLATION_10H_LIMIT">{t("admin.complianceRules.alertViolation10h")}</SelectItem>
                              <SelectItem value="VIOLATION_REST_PERIOD">{t("admin.complianceRules.alertRestPeriod")}</SelectItem>
                              <SelectItem value="EXEMPTION_AT_RISK">{t("admin.complianceRules.alertExemptionRisk")}</SelectItem>
                              <SelectItem value="OVERTIME_WARNING">{t("admin.complianceRules.alertOvertimeWarning")}</SelectItem>
                              <SelectItem value="WEEKLY_SUMMARY">{t("admin.complianceRules.alertWeeklySummary")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("admin.complianceRules.severity")}</Label>
                          <Select 
                            value={newTemplate.severity}
                            onValueChange={(v) => setNewTemplate({...newTemplate, severity: v as Severity})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="critical">{t("admin.complianceRules.severityCritical")}</SelectItem>
                              <SelectItem value="warning">{t("admin.complianceRules.severityWarning")}</SelectItem>
                              <SelectItem value="info">{t("admin.complianceRules.severityInfo")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("admin.complianceRules.applicableRegion")}</Label>
                          <Select 
                            value={newTemplate.jurisdiction}
                            onValueChange={(v) => setNewTemplate({...newTemplate, jurisdiction: v as any})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">{t("admin.complianceRules.jurisdictionALL")}</SelectItem>
                              <SelectItem value="DE">{t("admin.complianceRules.jurisdictionDE")}</SelectItem>
                              <SelectItem value="US">{t("admin.complianceRules.jurisdictionUS")}</SelectItem>
                              <SelectItem value="CN">{t("admin.complianceRules.jurisdictionCN")}</SelectItem>
                              <SelectItem value="OTHER">{t("admin.complianceRules.jurisdictionOTHER")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.complianceRules.templateDesc")}</Label>
                        <Textarea
                          value={newTemplate.templateDescription}
                          onChange={(e) => setNewTemplate({...newTemplate, templateDescription: e.target.value})}
                          placeholder={t("admin.complianceRules.templateDescPlaceholder")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.complianceRules.emailSubject")}</Label>
                        <Input
                          value={newTemplate.subjectTemplate}
                          onChange={(e) => setNewTemplate({...newTemplate, subjectTemplate: e.target.value})}
                          placeholder={t("admin.complianceRules.emailSubjectPlaceholder")}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("admin.complianceRules.availableVars")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.complianceRules.emailBody")}</Label>
                        <Textarea
                          value={newTemplate.bodyTemplate}
                          onChange={(e) => setNewTemplate({...newTemplate, bodyTemplate: e.target.value})}
                          placeholder={t("admin.complianceRules.emailBodyPlaceholder")}
                          className="min-h-[200px] font-mono text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={newTemplate.isHtml}
                          onCheckedChange={(v) => setNewTemplate({...newTemplate, isHtml: v})}
                        />
                        <Label>{t("admin.complianceRules.htmlFormat")}</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddTemplateOpen(false)}>{t("admin.complianceRules.cancel")}</Button>
                      <Button
                        onClick={() => createTemplateMutation.mutate(newTemplate)}
                        disabled={createTemplateMutation.isPending}
                      >
                        {createTemplateMutation.isPending ? t("admin.complianceRules.creatingTemplate") : t("admin.complianceRules.createTemplate")}
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
                        <TableHead>{t("admin.complianceRules.thTemplateName")}</TableHead>
                        <TableHead>{t("admin.complianceRules.thAlertType")}</TableHead>
                        <TableHead>{t("admin.complianceRules.thSeverity")}</TableHead>
                        <TableHead>{t("admin.complianceRules.thRegion")}</TableHead>
                        <TableHead>{t("admin.complianceRules.thStatus")}</TableHead>
                        <TableHead>{t("admin.complianceRules.thAction")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {t("admin.complianceRules.noTemplates")}
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
                                    if (confirm(t("admin.complianceRules.confirmDeleteTemplate"))) {
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
  );
}
