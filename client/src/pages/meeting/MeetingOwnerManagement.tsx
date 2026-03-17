import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Crown, 
  Users, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  Bell,
  FileCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  Mail,
  MessageSquare
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, StatCard } from '@/components/grt';
import { useLanguage } from '@/contexts/LanguageContext';

// 会议类型配置 (i18n key references)
const MEETING_TYPE_KEYS = [
  { id: 'employee_interview', nameKey: 'meeting.owner.type.employee_interview', category: 'internal' },
  { id: 'performance_dialog', nameKey: 'meeting.owner.type.performance_dialog', category: 'internal' },
  { id: 'production_weekly', nameKey: 'meeting.owner.type.production_weekly', category: 'internal' },
  { id: 'monthly_analysis', nameKey: 'meeting.owner.type.monthly_analysis', category: 'internal' },
  { id: 'monthly_planning', nameKey: 'meeting.owner.type.monthly_planning', category: 'internal' },
  { id: 'annual_planning', nameKey: 'meeting.owner.type.annual_planning', category: 'internal' },
  { id: 'annual_summary', nameKey: 'meeting.owner.type.annual_summary', category: 'internal' },
  { id: 'customer_initial', nameKey: 'meeting.owner.type.customer_initial', category: 'customer' },
  { id: 'customer_review', nameKey: 'meeting.owner.type.customer_review', category: 'customer' },
  { id: 'customer_pre_acceptance', nameKey: 'meeting.owner.type.customer_pre_acceptance', category: 'customer' },
  { id: 'customer_final_acceptance', nameKey: 'meeting.owner.type.customer_final_acceptance', category: 'customer' },
  { id: 'customer_solution', nameKey: 'meeting.owner.type.customer_solution', category: 'customer' }
];

interface MeetingOwner {
  id: string;
  meetingType: string;
  meetingTypeName: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  backupOwnerId?: string;
  backupOwnerName?: string;
  autoReportEnabled: boolean;
  reportFrequency: 'immediate' | 'daily' | 'weekly';
  evidenceRequired: boolean;
  evidenceTypes: string[];
  notificationChannels: string[];
  createdAt: string;
  updatedAt: string;
}

interface ReportRule {
  id: string;
  meetingType: string;
  ruleName: string;
  triggerCondition: string;
  reportTo: string[];
  includeEvidence: boolean;
  reminderDays: number;
  isActive: boolean;
}

export default function MeetingOwnerManagement() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingOwner, setEditingOwner] = useState<MeetingOwner | null>(null);
  const [editingRule, setEditingRule] = useState<ReportRule | null>(null);

  // 获取MO列表
  const { data: ownersData, isLoading, refetch } = trpc.meetingTaskLoop.getMeetingOwners.useQuery({});
  const owners: MeetingOwner[] = ownersData?.owners || [];

  // 获取上报规则
  const { data: rulesData } = (trpc.meetingTaskLoop as any).getReportRules.useQuery({});
  const rules: ReportRule[] = rulesData?.rules || [];

  // 创建/更新MO
  const saveMutation = (trpc.meetingTaskLoop as any).saveMeetingOwner.useMutation({
    onSuccess: () => {
      toast({ title: t("meeting.owner.saveSuccess") });
      setShowAddDialog(false);
      setEditingOwner(null);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: t("meeting.owner.saveFailed"), description: error.message, variant: 'destructive' });
    }
  });

  // 删除MO
  const deleteMutation = (trpc.meetingTaskLoop as any).deleteMeetingOwner.useMutation({
    onSuccess: () => {
      toast({ title: t("meeting.owner.deleteSuccess") });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: t("meeting.owner.deleteFailed"), description: error.message, variant: 'destructive' });
    }
  });

  // 保存上报规则
  const saveRuleMutation = (trpc.meetingTaskLoop as any).saveReportRule.useMutation({
    onSuccess: () => {
      toast({ title: t("meeting.owner.ruleSaveSuccess") });
      setShowRuleDialog(false);
      setEditingRule(null);
    },
    onError: (error: any) => {
      toast({ title: t("meeting.owner.saveFailed"), description: error.message, variant: 'destructive' });
    }
  });

  // 过滤MO
  const filteredOwners = owners.filter(owner => {
    const matchSearch = !searchQuery || 
      owner.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      owner.meetingTypeName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchCategory = categoryFilter === 'all' || 
      MEETING_TYPE_KEYS.find(t => t.id === owner.meetingType)?.category === categoryFilter;
    
    return matchSearch && matchCategory;
  });

  // 统计
  const stats = {
    total: owners.length,
    internal: owners.filter(o => MEETING_TYPE_KEYS.find(t => t.id === o.meetingType)?.category === 'internal').length,
    customer: owners.filter(o => MEETING_TYPE_KEYS.find(t => t.id === o.meetingType)?.category === 'customer').length,
    autoReport: owners.filter(o => o.autoReportEnabled).length
  };

  return (
      <>
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Crown}
          title={t("meeting.owner.title")}
          description={t("meeting.owner.desc")}
          actions={
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("meeting.owner.assignMO")}
            </Button>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard icon={Crown} label={t("meeting.owner.totalMO")} value={stats.total} iconColor="text-primary" iconBg="bg-primary/10" />
          <StatCard icon={Users} label={t("meeting.owner.internalMeeting")} value={stats.internal} iconColor="text-blue-600" iconBg="bg-blue-500/10" />
          <StatCard icon={Users} label={t("meeting.owner.customerMeeting")} value={stats.customer} iconColor="text-green-600" iconBg="bg-green-500/10" />
          <StatCard icon={Bell} label={t("meeting.owner.autoReport")} value={stats.autoReport} iconColor="text-yellow-600" iconBg="bg-yellow-500/10" />
        </div>

        <Tabs defaultValue="owners" className="w-full">
          <TabsList>
            <TabsTrigger value="owners">{t("meeting.owner.tabOwners")}</TabsTrigger>
            <TabsTrigger value="rules">{t("meeting.owner.tabRules")}</TabsTrigger>
            <TabsTrigger value="evidence">{t("meeting.owner.tabEvidence")}</TabsTrigger>
          </TabsList>

          {/* MO列表 */}
          <TabsContent value="owners">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t("meeting.owner.ownerListTitle")}</CardTitle>
                    <CardDescription>{t("meeting.owner.ownerListDesc")}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t("meeting.owner.search")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-[200px]"
                      />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[120px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("meeting.owner.filterAll")}</SelectItem>
                        <SelectItem value="internal">{t("meeting.owner.internalMeeting")}</SelectItem>
                        <SelectItem value="customer">{t("meeting.owner.customerMeeting")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <p className="text-muted-foreground">{t("meeting.owner.loadingText")}</p>
                    </div>
                  ) : filteredOwners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mb-2 opacity-50" />
                      <p>{t("meeting.owner.noData")}</p>
                      <Button variant="link" onClick={() => setShowAddDialog(true)}>
                        {t("meeting.owner.clickToAssign")}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredOwners.map((owner) => (
                        <Card key={owner.id} className="hover:bg-muted/50 transition-colors">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">
                                    {MEETING_TYPE_KEYS.find(mt => mt.id === owner.meetingType)?.category === 'internal'
                                      ? t("meeting.owner.internal") : t("meeting.owner.customer")}
                                  </Badge>
                                  <span className="font-medium">{owner.meetingTypeName}</span>
                                </div>
                                
                                <div className="flex flex-wrap gap-4 text-sm mb-3">
                                  <div className="flex items-center gap-1">
                                    <Crown className="h-4 w-4 text-yellow-500" />
                                    <span>MO: {owner.ownerName}</span>
                                  </div>
                                  {owner.backupOwnerName && (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Users className="h-4 w-4" />
                                      <span>{t("meeting.owner.backupLabel")}: {owner.backupOwnerName}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span>{owner.ownerEmail}</span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {owner.autoReportEnabled && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                      <Bell className="h-3 w-3" />
                                      {t("meeting.owner.autoReport")}
                                    </Badge>
                                  )}
                                  {owner.evidenceRequired && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                      <FileCheck className="h-3 w-3" />
                                      {t("meeting.owner.evidenceRequired")}
                                    </Badge>
                                  )}
                                  {owner.notificationChannels.map((channel, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {channel === 'email' ? t("meeting.owner.channelEmail") :
                                       channel === 'webhook' ? t("meeting.owner.channelWebhook") : t("meeting.owner.channelInApp")}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingOwner(owner);
                                    setShowAddDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(t("meeting.owner.confirmDelete"))) {
                                      deleteMutation.mutate({ id: owner.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 上报规则 */}
          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t("meeting.owner.reportRulesTitle")}</CardTitle>
                    <CardDescription>{t("meeting.owner.reportRulesDesc")}</CardDescription>
                  </div>
                  <Button onClick={() => setShowRuleDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t("meeting.owner.addRule")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {rules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <Settings className="h-12 w-12 mb-2 opacity-50" />
                      <p>{t("meeting.owner.noReportRules")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rules.map((rule) => (
                        <Card key={rule.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{rule.ruleName}</span>
                                  <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                                    {rule.isActive ? t("meeting.owner.ruleEnabled") : t("meeting.owner.ruleDisabled")}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {t("meeting.owner.triggerCondition")}: {rule.triggerCondition}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {t("meeting.owner.reportTo")}: {rule.reportTo.join(', ')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch checked={rule.isActive} />
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 举证配置 */}
          <TabsContent value="evidence">
            <Card>
              <CardHeader>
                <CardTitle>{t("meeting.owner.evidenceConfigTitle")}</CardTitle>
                <CardDescription>{t("meeting.owner.evidenceConfigDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MEETING_TYPE_KEYS.map((type) => {
                    const owner = owners.find(o => o.meetingType === type.id);
                    return (
                      <Card key={type.id} className="bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">
                                  {type.category === 'internal' ? t("meeting.owner.internal") : t("meeting.owner.customer")}
                                </Badge>
                                <span className="font-medium">{t(type.nameKey)}</span>
                              </div>
                              {owner?.evidenceTypes && owner.evidenceTypes.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {owner.evidenceTypes.map((et, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {et}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">{t("meeting.owner.noEvidenceConfig")}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={owner?.evidenceRequired || false} />
                              <span className="text-sm text-muted-foreground">
                                {owner?.evidenceRequired ? t("meeting.owner.evidenceRequired") : t("meeting.owner.noEvidenceLabel")}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 添加/编辑MO对话框 */}
      <MeetingOwnerDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditingOwner(null);
        }}
        owner={editingOwner}
        onSave={(data) => saveMutation.mutate(data)}
      />

      {/* 添加上报规则对话框 */}
      <ReportRuleDialog
        open={showRuleDialog}
        onOpenChange={(open) => {
          setShowRuleDialog(open);
          if (!open) setEditingRule(null);
        }}
        rule={editingRule}
        onSave={(data) => saveRuleMutation.mutate(data)}
      />
      </>
  );
}

// MO编辑对话框
interface MeetingOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owner: MeetingOwner | null;
  onSave: (data: any) => void;
}

function MeetingOwnerDialog({ open, onOpenChange, owner, onSave }: MeetingOwnerDialogProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    meetingType: '',
    ownerId: '',
    ownerName: '',
    ownerEmail: '',
    backupOwnerId: '',
    backupOwnerName: '',
    autoReportEnabled: true,
    reportFrequency: 'immediate' as 'immediate' | 'daily' | 'weekly',
    evidenceRequired: false,
    evidenceTypes: [] as string[],
    notificationChannels: ['email', 'inApp'] as string[]
  });

  useState(() => {
    if (owner) {
      setFormData({
        meetingType: owner.meetingType,
        ownerId: owner.ownerId,
        ownerName: owner.ownerName,
        ownerEmail: owner.ownerEmail,
        backupOwnerId: owner.backupOwnerId || '',
        backupOwnerName: owner.backupOwnerName || '',
        autoReportEnabled: owner.autoReportEnabled,
        reportFrequency: owner.reportFrequency,
        evidenceRequired: owner.evidenceRequired,
        evidenceTypes: owner.evidenceTypes,
        notificationChannels: owner.notificationChannels
      });
    }
  });

  const handleSubmit = () => {
    if (!formData.meetingType || !formData.ownerName || !formData.ownerEmail) {
      return;
    }
    onSave({
      id: owner?.id,
      ...formData
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{owner ? t("meeting.owner.dialogTitleEdit") : t("meeting.owner.assignMO")}</DialogTitle>
          <DialogDescription>
            {t("meeting.owner.dialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>{t("meeting.owner.meetingType")} *</Label>
            <Select
              value={formData.meetingType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, meetingType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("meeting.owner.selectMeetingType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__placeholder__" disabled>{t("meeting.owner.selectMeetingType")}</SelectItem>
                {MEETING_TYPE_KEYS.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    [{type.category === 'internal' ? t("meeting.owner.internal") : t("meeting.owner.customer")}] {t(type.nameKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("meeting.owner.moName")} *</Label>
              <Input
                value={formData.ownerName}
                onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                placeholder={t("meeting.owner.moNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("meeting.owner.moEmail")} *</Label>
              <Input
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, ownerEmail: e.target.value }))}
                placeholder={t("meeting.owner.moEmailPlaceholder")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("meeting.owner.backupMoName")}</Label>
              <Input
                value={formData.backupOwnerName}
                onChange={(e) => setFormData(prev => ({ ...prev, backupOwnerName: e.target.value }))}
                placeholder={t("meeting.owner.optional")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("meeting.owner.reportFrequency")}</Label>
              <Select
                value={formData.reportFrequency}
                onValueChange={(value: 'immediate' | 'daily' | 'weekly') => 
                  setFormData(prev => ({ ...prev, reportFrequency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">{t("meeting.owner.freqImmediate")}</SelectItem>
                  <SelectItem value="daily">{t("meeting.owner.freqDaily")}</SelectItem>
                  <SelectItem value="weekly">{t("meeting.owner.freqWeekly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("meeting.owner.autoReport")}</Label>
                <p className="text-xs text-muted-foreground">{t("meeting.owner.autoReportDesc")}</p>
              </div>
              <Switch
                checked={formData.autoReportEnabled}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, autoReportEnabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>{t("meeting.owner.evidenceRequired")}</Label>
                <p className="text-xs text-muted-foreground">{t("meeting.owner.evidenceRequiredDesc")}</p>
              </div>
              <Switch
                checked={formData.evidenceRequired}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, evidenceRequired: checked }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("meeting.owner.notificationChannel")}</Label>
            <div className="flex gap-4">
              {[
                { id: 'email', labelKey: 'meeting.owner.channelEmail', icon: Mail },
                { id: 'webhook', labelKey: 'meeting.owner.channelWebhook', icon: MessageSquare },
                { id: 'inApp', labelKey: 'meeting.owner.channelInApp', icon: Bell }
              ].map((channel) => (
                <label key={channel.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notificationChannels.includes(channel.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          notificationChannels: [...prev.notificationChannels, channel.id]
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          notificationChannels: prev.notificationChannels.filter(c => c !== channel.id)
                        }));
                      }
                    }}
                    className="rounded"
                  />
                  <channel.icon className="h-4 w-4" />
                  <span className="text-sm">{t(channel.labelKey)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("meeting.owner.cancel")}
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-1" />
            {t("meeting.owner.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 上报规则对话框
interface ReportRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: ReportRule | null;
  onSave: (data: any) => void;
}

function ReportRuleDialog({ open, onOpenChange, rule, onSave }: ReportRuleDialogProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    meetingType: '',
    ruleName: '',
    triggerCondition: 'task_completed',
    reportTo: [] as string[],
    includeEvidence: true,
    reminderDays: 3,
    isActive: true
  });

  const handleSubmit = () => {
    if (!formData.ruleName || !formData.meetingType) return;
    onSave({
      id: rule?.id,
      ...formData
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? t("meeting.owner.ruleDialogTitleEdit") : t("meeting.owner.addRule")}</DialogTitle>
          <DialogDescription>
            {t("meeting.owner.reportRulesDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("meeting.owner.ruleName")} *</Label>
            <Input
              value={formData.ruleName}
              onChange={(e) => setFormData(prev => ({ ...prev, ruleName: e.target.value }))}
              placeholder={t("meeting.owner.ruleNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("meeting.owner.applicableMeetingType")} *</Label>
            <Select
              value={formData.meetingType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, meetingType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("meeting.owner.selectMeetingType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("meeting.owner.allMeetings")}</SelectItem>
                {MEETING_TYPE_KEYS.map((type) => (
                  <SelectItem key={type.id} value={type.id}>{t(type.nameKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("meeting.owner.triggerCondition")}</Label>
            <Select
              value={formData.triggerCondition}
              onValueChange={(value) => setFormData(prev => ({ ...prev, triggerCondition: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task_completed">{t("meeting.owner.triggerTaskCompleted")}</SelectItem>
                <SelectItem value="task_overdue">{t("meeting.owner.triggerTaskOverdue")}</SelectItem>
                <SelectItem value="all_tasks_completed">{t("meeting.owner.triggerAllCompleted")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("meeting.owner.reminderDays")}</Label>
            <Input
              type="number"
              value={formData.reminderDays}
              onChange={(e) => setFormData(prev => ({ ...prev, reminderDays: parseInt(e.target.value) || 0 }))}
              min={0}
              max={30}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>{t("meeting.owner.includeEvidence")}</Label>
            <Switch
              checked={formData.includeEvidence}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeEvidence: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>{t("meeting.owner.enableRule")}</Label>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("meeting.owner.cancel")}
          </Button>
          <Button onClick={handleSubmit}>
            {t("meeting.owner.saveRule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
