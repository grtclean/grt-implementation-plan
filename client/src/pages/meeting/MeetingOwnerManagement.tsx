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
import DashboardLayout from '@/components/DashboardLayout';

// 会议类型配置
const MEETING_TYPES = [
  { id: 'employee_interview', name: '员工访谈', category: 'internal' },
  { id: 'performance_dialog', name: '员工绩效对话', category: 'internal' },
  { id: 'production_weekly', name: '生产周会', category: 'internal' },
  { id: 'monthly_analysis', name: '月度经营分析会', category: 'internal' },
  { id: 'monthly_planning', name: '月度计划会议', category: 'internal' },
  { id: 'annual_planning', name: '年度规划会议', category: 'internal' },
  { id: 'annual_summary', name: '年度总结会议', category: 'internal' },
  { id: 'customer_initial', name: '客户首次沟通', category: 'customer' },
  { id: 'customer_review', name: '客户图纸评审会', category: 'customer' },
  { id: 'customer_pre_acceptance', name: '客户预验收会议', category: 'customer' },
  { id: 'customer_final_acceptance', name: '客户终验收会议', category: 'customer' },
  { id: 'customer_solution', name: '客户方案沟通确认会议', category: 'customer' }
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
      toast({ title: '保存成功' });
      setShowAddDialog(false);
      setEditingOwner(null);
      refetch();
    },
    onError: (error) => {
      toast({ title: '保存失败', description: error.message, variant: 'destructive' });
    }
  });

  // 删除MO
  const deleteMutation = (trpc.meetingTaskLoop as any).deleteMeetingOwner.useMutation({
    onSuccess: () => {
      toast({ title: '删除成功' });
      refetch();
    },
    onError: (error) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' });
    }
  });

  // 保存上报规则
  const saveRuleMutation = (trpc.meetingTaskLoop as any).saveReportRule.useMutation({
    onSuccess: () => {
      toast({ title: '规则保存成功' });
      setShowRuleDialog(false);
      setEditingRule(null);
    },
    onError: (error) => {
      toast({ title: '保存失败', description: error.message, variant: 'destructive' });
    }
  });

  // 过滤MO
  const filteredOwners = owners.filter(owner => {
    const matchSearch = !searchQuery || 
      owner.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      owner.meetingTypeName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchCategory = categoryFilter === 'all' || 
      MEETING_TYPES.find(t => t.id === owner.meetingType)?.category === categoryFilter;
    
    return matchSearch && matchCategory;
  });

  // 统计
  const stats = {
    total: owners.length,
    internal: owners.filter(o => MEETING_TYPES.find(t => t.id === o.meetingType)?.category === 'internal').length,
    customer: owners.filter(o => MEETING_TYPES.find(t => t.id === o.meetingType)?.category === 'customer').length,
    autoReport: owners.filter(o => o.autoReportEnabled).length
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              Meeting Owner 管理
            </h1>
            <p className="text-muted-foreground">
              为不同会议类型指派负责人，配置自动上报规则
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            指派MO
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">总MO数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.internal}</p>
                  <p className="text-sm text-muted-foreground">内部会议</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.customer}</p>
                  <p className="text-sm text-muted-foreground">客户会议</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-100">
                  <Bell className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.autoReport}</p>
                  <p className="text-sm text-muted-foreground">自动上报</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="owners" className="w-full">
          <TabsList>
            <TabsTrigger value="owners">MO列表</TabsTrigger>
            <TabsTrigger value="rules">上报规则</TabsTrigger>
            <TabsTrigger value="evidence">举证配置</TabsTrigger>
          </TabsList>

          {/* MO列表 */}
          <TabsContent value="owners">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Meeting Owner 列表</CardTitle>
                    <CardDescription>管理各类会议的负责人</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="搜索..."
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
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="internal">内部会议</SelectItem>
                        <SelectItem value="customer">客户会议</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <p className="text-muted-foreground">加载中...</p>
                    </div>
                  ) : filteredOwners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mb-2 opacity-50" />
                      <p>暂无数据</p>
                      <Button variant="link" onClick={() => setShowAddDialog(true)}>
                        点击指派MO
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
                                    {MEETING_TYPES.find(t => t.id === owner.meetingType)?.category === 'internal' 
                                      ? '内部' : '客户'}
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
                                      <span>备份: {owner.backupOwnerName}</span>
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
                                      自动上报
                                    </Badge>
                                  )}
                                  {owner.evidenceRequired && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                      <FileCheck className="h-3 w-3" />
                                      需要举证
                                    </Badge>
                                  )}
                                  {owner.notificationChannels.map((channel, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {channel === 'email' ? '邮件' : 
                                       channel === 'webhook' ? '企微/钉钉' : '站内'}
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
                                    if (confirm('确定删除该MO配置？')) {
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
                    <CardTitle>自动上报规则</CardTitle>
                    <CardDescription>配置任务完成后的自动上报逻辑</CardDescription>
                  </div>
                  <Button onClick={() => setShowRuleDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    添加规则
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {rules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <Settings className="h-12 w-12 mb-2 opacity-50" />
                      <p>暂无上报规则</p>
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
                                    {rule.isActive ? '启用' : '禁用'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  触发条件: {rule.triggerCondition}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  上报给: {rule.reportTo.join(', ')}
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
                <CardTitle>举证要求配置</CardTitle>
                <CardDescription>配置不同会议类型的举证材料要求</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MEETING_TYPES.map((type) => {
                    const owner = owners.find(o => o.meetingType === type.id);
                    return (
                      <Card key={type.id} className="bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">
                                  {type.category === 'internal' ? '内部' : '客户'}
                                </Badge>
                                <span className="font-medium">{type.name}</span>
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
                                <p className="text-sm text-muted-foreground">未配置举证要求</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={owner?.evidenceRequired || false} />
                              <span className="text-sm text-muted-foreground">
                                {owner?.evidenceRequired ? '需要举证' : '无需举证'}
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
    </DashboardLayout>
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
          <DialogTitle>{owner ? '编辑' : '指派'} Meeting Owner</DialogTitle>
          <DialogDescription>
            为会议类型指定负责人和配置上报规则
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>会议类型 *</Label>
            <Select
              value={formData.meetingType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, meetingType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择会议类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" disabled>选择会议类型</SelectItem>
                {MEETING_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    [{type.category === 'internal' ? '内部' : '客户'}] {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>MO姓名 *</Label>
              <Input
                value={formData.ownerName}
                onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                placeholder="输入负责人姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>MO邮箱 *</Label>
              <Input
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, ownerEmail: e.target.value }))}
                placeholder="输入邮箱"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>备份MO姓名</Label>
              <Input
                value={formData.backupOwnerName}
                onChange={(e) => setFormData(prev => ({ ...prev, backupOwnerName: e.target.value }))}
                placeholder="可选"
              />
            </div>
            <div className="space-y-2">
              <Label>上报频率</Label>
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
                  <SelectItem value="immediate">即时</SelectItem>
                  <SelectItem value="daily">每日汇总</SelectItem>
                  <SelectItem value="weekly">每周汇总</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>自动上报</Label>
                <p className="text-xs text-muted-foreground">任务完成后自动通知MO</p>
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
                <Label>需要举证</Label>
                <p className="text-xs text-muted-foreground">任务完成时需上传证明材料</p>
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
            <Label>通知渠道</Label>
            <div className="flex gap-4">
              {[
                { id: 'email', label: '邮件', icon: Mail },
                { id: 'webhook', label: '企微/钉钉', icon: MessageSquare },
                { id: 'inApp', label: '站内通知', icon: Bell }
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
                  <span className="text-sm">{channel.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-1" />
            保存
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
          <DialogTitle>{rule ? '编辑' : '添加'}上报规则</DialogTitle>
          <DialogDescription>
            配置任务完成后的自动上报逻辑
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>规则名称 *</Label>
            <Input
              value={formData.ruleName}
              onChange={(e) => setFormData(prev => ({ ...prev, ruleName: e.target.value }))}
              placeholder="输入规则名称"
            />
          </div>

          <div className="space-y-2">
            <Label>适用会议类型 *</Label>
            <Select
              value={formData.meetingType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, meetingType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择会议类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有会议</SelectItem>
                {MEETING_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>触发条件</Label>
            <Select
              value={formData.triggerCondition}
              onValueChange={(value) => setFormData(prev => ({ ...prev, triggerCondition: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task_completed">任务完成时</SelectItem>
                <SelectItem value="task_overdue">任务逾期时</SelectItem>
                <SelectItem value="all_tasks_completed">所有任务完成时</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>提前提醒天数</Label>
            <Input
              type="number"
              value={formData.reminderDays}
              onChange={(e) => setFormData(prev => ({ ...prev, reminderDays: parseInt(e.target.value) || 0 }))}
              min={0}
              max={30}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>包含举证材料</Label>
            <Switch
              checked={formData.includeEvidence}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeEvidence: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>启用规则</Label>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            保存规则
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
