/**
 * 告警静默规则继承管理组件
 * 支持规则模板机制、模板继承、快速创建相似规则
 */

import { useState } from 'react';
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader, StatCard } from '@/components/grt';
import {
  FileText,
  Plus,
  Copy,
  GitBranch,
  Settings,
  Trash2,
  ChevronRight,
  Clock,
  Filter,
  BellOff
} from 'lucide-react';

// 类型定义
type MatchType = 'prefix' | 'suffix' | 'contains' | 'regex' | 'exact';
type LogicOperator = 'AND' | 'OR';
type TemplateCategory = 'maintenance' | 'deployment' | 'testing' | 'scheduled' | 'custom';

interface SilenceCondition {
  field: string;
  matchType: MatchType;
  value: string;
}

interface SilenceConditionGroup {
  operator: LogicOperator;
  conditions: SilenceCondition[];
}

interface SilenceTimeWindow {
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  timezone: string;
}

interface SilenceRuleTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  conditionGroups: SilenceConditionGroup[];
  timeWindows: SilenceTimeWindow[];
  isBuiltIn: boolean;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}

interface SilenceRule {
  id: string;
  name: string;
  description: string;
  templateId: string | null;
  parentRuleId: string | null;
  conditionGroups: SilenceConditionGroup[];
  timeWindows: SilenceTimeWindow[];
  enabled: boolean;
  priority: number;
  createdAt: number;
}

// 模拟数据
const mockTemplates: SilenceRuleTemplate[] = [
  {
    id: 'builtin-1',
    name: '计划维护窗口',
    description: '用于计划性系统维护期间静默告警',
    category: 'maintenance',
    conditionGroups: [
      {
        operator: 'OR',
        conditions: [
          { field: 'alertType', matchType: 'contains', value: 'maintenance' }
        ]
      }
    ],
    timeWindows: [
      { startTime: '02:00', endTime: '06:00', daysOfWeek: [0], timezone: 'Asia/Shanghai' }
    ],
    isBuiltIn: true,
    usageCount: 15,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000
  },
  {
    id: 'builtin-2',
    name: '部署发布窗口',
    description: '用于代码部署和发布期间静默告警',
    category: 'deployment',
    conditionGroups: [
      {
        operator: 'AND',
        conditions: [
          { field: 'alertType', matchType: 'exact', value: 'deployment' }
        ]
      }
    ],
    timeWindows: [],
    isBuiltIn: true,
    usageCount: 8,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 14 * 24 * 60 * 60 * 1000
  },
  {
    id: 'custom-1',
    name: '生产环境夜间静默',
    description: '生产环境夜间低优先级告警静默',
    category: 'custom',
    conditionGroups: [
      {
        operator: 'AND',
        conditions: [
          { field: 'environment', matchType: 'exact', value: 'production' },
          { field: 'severity', matchType: 'exact', value: 'low' }
        ]
      }
    ],
    timeWindows: [
      { startTime: '22:00', endTime: '08:00', daysOfWeek: [1, 2, 3, 4, 5], timezone: 'Asia/Shanghai' }
    ],
    isBuiltIn: false,
    usageCount: 3,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000
  }
];

const mockRules: SilenceRule[] = [
  {
    id: 'rule-1',
    name: '周日维护窗口',
    description: '每周日凌晨维护期间静默',
    templateId: 'builtin-1',
    parentRuleId: null,
    conditionGroups: mockTemplates[0].conditionGroups,
    timeWindows: mockTemplates[0].timeWindows,
    enabled: true,
    priority: 10,
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000
  },
  {
    id: 'rule-2',
    name: '周日维护窗口-数据库',
    description: '数据库相关告警特殊处理',
    templateId: 'builtin-1',
    parentRuleId: 'rule-1',
    conditionGroups: [
      {
        operator: 'AND',
        conditions: [
          { field: 'source', matchType: 'prefix', value: 'db-' }
        ]
      }
    ],
    timeWindows: mockTemplates[0].timeWindows,
    enabled: true,
    priority: 15,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000
  }
];

const categoryLabelKeys: Record<TemplateCategory, string> = {
  maintenance: 'admin.alertSilence.catMaintenance',
  deployment: 'admin.alertSilence.catDeployment',
  testing: 'admin.alertSilence.catTesting',
  scheduled: 'admin.alertSilence.catScheduled',
  custom: 'admin.alertSilence.catCustom',
};

const categoryColors: Record<TemplateCategory, string> = {
  maintenance: 'bg-blue-500',
  deployment: 'bg-green-500',
  testing: 'bg-yellow-500',
  scheduled: 'bg-purple-500',
  custom: 'bg-gray-500'
};

export default function AlertSilenceInheritanceManager() {
  const { t, tpl } = useLanguage();
  const [templates, setTemplates] = useState<SilenceRuleTemplate[]>(mockTemplates);
  const [rules, setRules] = useState<SilenceRule[]>(mockRules);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateRuleDialog, setShowCreateRuleDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<TemplateCategory>('custom');
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');
  const [selectedTemplateForRule, setSelectedTemplateForRule] = useState<string>('');

  // 创建模板
  const handleCreateTemplate = () => {
    const newTemplate: SilenceRuleTemplate = {
      id: `custom-${Date.now()}`,
      name: newTemplateName,
      description: newTemplateDescription,
      category: newTemplateCategory,
      conditionGroups: [],
      timeWindows: [],
      isBuiltIn: false,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setTemplates([...templates, newTemplate]);
    setShowCreateDialog(false);
    setNewTemplateName('');
    setNewTemplateDescription('');
    setNewTemplateCategory('custom');
  };

  // 从模板创建规则
  const handleCreateRuleFromTemplate = () => {
    const template = templates.find(t => t.id === selectedTemplateForRule);
    if (!template) return;

    const newRule: SilenceRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName,
      description: newRuleDescription,
      templateId: template.id,
      parentRuleId: null,
      conditionGroups: [...template.conditionGroups],
      timeWindows: [...template.timeWindows],
      enabled: false,
      priority: 0,
      createdAt: Date.now()
    };
    setRules([...rules, newRule]);
    
    setTemplates(templates.map(t => 
      t.id === template.id ? { ...t, usageCount: t.usageCount + 1 } : t
    ));
    
    setShowCreateRuleDialog(false);
    setNewRuleName('');
    setNewRuleDescription('');
    setSelectedTemplateForRule('');
  };

  // 创建子规则
  const handleCreateChildRule = (parentRule: SilenceRule) => {
    const newRule: SilenceRule = {
      id: `rule-${Date.now()}`,
      name: `${parentRule.name} - ${t("admin.alertSilence.childRuleSuffix")}`,
      description: tpl("admin.alertSilence.inheritedFrom", { name: parentRule.name }),
      templateId: parentRule.templateId,
      parentRuleId: parentRule.id,
      conditionGroups: [...parentRule.conditionGroups],
      timeWindows: [...parentRule.timeWindows],
      enabled: false,
      priority: parentRule.priority + 1,
      createdAt: Date.now()
    };
    setRules([...rules, newRule]);
  };

  // 复制规则
  const handleDuplicateRule = (rule: SilenceRule) => {
    const newRule: SilenceRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      name: `${rule.name} ${t("admin.alertSilence.duplicateSuffix")}`,
      parentRuleId: null,
      enabled: false,
      createdAt: Date.now()
    };
    setRules([...rules, newRule]);
  };

  // 切换规则状态
  const handleToggleRule = (ruleId: string) => {
    setRules(rules.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
  };

  // 删除规则
  const handleDeleteRule = (ruleId: string) => {
    const hasChildren = rules.some(r => r.parentRuleId === ruleId);
    if (hasChildren) {
      alert(t("admin.alertSilence.cannotDeleteWithChildren"));
      return;
    }
    setRules(rules.filter(r => r.id !== ruleId));
  };

  // 统计数据
  const stats = {
    totalTemplates: templates.length,
    builtInTemplates: templates.filter(t => t.isBuiltIn).length,
    customTemplates: templates.filter(t => !t.isBuiltIn).length,
    totalRules: rules.length,
    enabledRules: rules.filter(r => r.enabled).length,
    rulesWithInheritance: rules.filter(r => r.parentRuleId !== null).length
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={BellOff}
        title={t("admin.alertSilence.title")}
        description={t("admin.alertSilence.description")}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={FileText} label={t("admin.alertSilence.totalTemplates")} value={stats.totalTemplates} />
        <StatCard icon={Settings} label={t("admin.alertSilence.builtInTemplates")} value={stats.builtInTemplates} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={Plus} label={t("admin.alertSilence.customTemplates")} value={stats.customTemplates} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Filter} label={t("admin.alertSilence.totalRules")} value={stats.totalRules} />
        <StatCard icon={Clock} label={t("admin.alertSilence.enabledRules")} value={stats.enabledRules} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={GitBranch} label={t("admin.alertSilence.inheritedRules")} value={stats.rulesWithInheritance} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">{t("admin.alertSilence.tabTemplates")}</TabsTrigger>
          <TabsTrigger value="rules">{t("admin.alertSilence.tabRules")}</TabsTrigger>
          <TabsTrigger value="inheritance">{t("admin.alertSilence.tabInheritance")}</TabsTrigger>
        </TabsList>

        {/* 模板库 */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("admin.alertSilence.createTemplate")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("admin.alertSilence.createNewTemplate")}</DialogTitle>
                  <DialogDescription>{t("admin.alertSilence.createNewTemplateDesc")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t("admin.alertSilence.templateName")}</Label>
                    <Input
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder={t("admin.alertSilence.templateNamePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.alertSilence.templateDescription")}</Label>
                    <Textarea
                      value={newTemplateDescription}
                      onChange={(e) => setNewTemplateDescription(e.target.value)}
                      placeholder={t("admin.alertSilence.templateDescPlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.alertSilence.category")}</Label>
                    <Select value={newTemplateCategory} onValueChange={(v) => setNewTemplateCategory(v as TemplateCategory)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabelKeys).map(([key, labelKey]) => (
                          <SelectItem key={key} value={key}>{t(labelKey)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("admin.alertSilence.cancel")}</Button>
                  <Button onClick={handleCreateTemplate} disabled={!newTemplateName}>{t("admin.alertSilence.create")}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className={categoryColors[template.category]}>
                      {t(categoryLabelKeys[template.category])}
                    </Badge>
                    {template.isBuiltIn && (
                      <Badge variant="outline">{t("admin.alertSilence.builtIn")}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{tpl("admin.alertSilence.usageCount", { count: String(template.usageCount) })}</span>
                    <span>{tpl("admin.alertSilence.conditionGroups", { count: String(template.conditionGroups.length) })}</span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedTemplateForRule(template.id);
                        setShowCreateRuleDialog(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t("admin.alertSilence.createRule")}
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Copy className="h-3 w-3 mr-1" />
                      {t("admin.alertSilence.copy")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 规则列表 */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showCreateRuleDialog} onOpenChange={setShowCreateRuleDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("admin.alertSilence.createRule")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("admin.alertSilence.createRuleFromTemplate")}</DialogTitle>
                  <DialogDescription>{t("admin.alertSilence.createRuleFromTemplateDesc")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t("admin.alertSilence.selectTemplate")}</Label>
                    <Select value={selectedTemplateForRule} onValueChange={setSelectedTemplateForRule}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("admin.alertSilence.selectTemplatePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.alertSilence.ruleName")}</Label>
                    <Input
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      placeholder={t("admin.alertSilence.ruleNamePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.alertSilence.ruleDescription")}</Label>
                    <Textarea
                      value={newRuleDescription}
                      onChange={(e) => setNewRuleDescription(e.target.value)}
                      placeholder={t("admin.alertSilence.ruleDescPlaceholder")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateRuleDialog(false)}>{t("admin.alertSilence.cancel")}</Button>
                  <Button onClick={handleCreateRuleFromTemplate} disabled={!selectedTemplateForRule || !newRuleName}>{t("admin.alertSilence.create")}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Switch 
                        checked={rule.enabled}
                        onCheckedChange={() => handleToggleRule(rule.id)}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{rule.name}</h3>
                          {rule.parentRuleId && (
                            <Badge variant="outline" className="text-xs">
                              <GitBranch className="h-3 w-3 mr-1" />
                              {t("admin.alertSilence.inherited")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{tpl("admin.alertSilence.priority", { val: String(rule.priority) })}</Badge>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleCreateChildRule(rule)}
                      >
                        <GitBranch className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDuplicateRule(rule)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 继承关系 */}
        <TabsContent value="inheritance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.alertSilence.inheritanceTree")}</CardTitle>
              <CardDescription>{t("admin.alertSilence.inheritanceTreeDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.filter(r => !r.parentRuleId).map((rootRule) => (
                  <div key={rootRule.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{rootRule.name}</span>
                      <Badge variant={rootRule.enabled ? 'default' : 'secondary'}>
                        {rootRule.enabled ? t("admin.alertSilence.isEnabled") : t("admin.alertSilence.isDisabled")}
                      </Badge>
                    </div>
                    {rules.filter(r => r.parentRuleId === rootRule.id).map((childRule) => (
                      <div key={childRule.id} className="ml-8 mt-2 flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <GitBranch className="h-4 w-4 text-purple-500" />
                        <span>{childRule.name}</span>
                        <Badge variant={childRule.enabled ? 'default' : 'secondary'} className="text-xs">
                          {childRule.enabled ? t("admin.alertSilence.isEnabled") : t("admin.alertSilence.isDisabled")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
