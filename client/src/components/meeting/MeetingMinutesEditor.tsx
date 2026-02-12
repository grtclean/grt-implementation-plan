import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  User, 
  Calendar,
  Plus,
  Trash2,
  Edit,
  Save,
  Sparkles,
  Send,
  AlertCircle,
  Users,
  Target,
  ListTodo,
  MessageSquare
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

interface AgendaItem {
  id: string;
  title: string;
  duration: number;
  discussion: string;
  decisions: string[];
  actionItems: string[];
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  assignee: string;
  supporter?: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
}

interface MeetingMinutes {
  id: string;
  meetingId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  attendees: string[];
  absentees: string[];
  agenda: AgendaItem[];
  summary: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  nextMeetingDate?: string;
  notes: string;
  status: 'draft' | 'pending_review' | 'confirmed' | 'distributed';
  createdBy: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

interface MeetingMinutesEditorProps {
  meetingId: string;
  minutes?: MeetingMinutes;
  onSave?: (minutes: MeetingMinutes) => void;
  onConfirm?: (minutes: MeetingMinutes) => void;
  onDistribute?: (minutes: MeetingMinutes) => void;
  readOnly?: boolean;
}

export default function MeetingMinutesEditor({
  meetingId,
  minutes: initialMinutes,
  onSave,
  onConfirm,
  onDistribute,
  readOnly = false
}: MeetingMinutesEditorProps) {
  const { toast } = useToast();
  const [minutes, setMinutes] = useState<MeetingMinutes>(initialMinutes || {
    id: '',
    meetingId,
    title: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    location: '',
    attendees: [],
    absentees: [],
    agenda: [],
    summary: '',
    keyDecisions: [],
    actionItems: [],
    notes: '',
    status: 'draft',
    createdBy: ''
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddActionItem, setShowAddActionItem] = useState(false);
  const [editingActionItem, setEditingActionItem] = useState<ActionItem | null>(null);
  const [newAttendee, setNewAttendee] = useState('');
  const [newDecision, setNewDecision] = useState('');

  // AI生成会议纪要
  const generateMinutesMutation = trpc.meetingTaskLoop.generateMinutes.useMutation({
    onSuccess: (data) => {
      if ((data as any).minutes) {
        setMinutes(prev => ({
          ...prev,
          summary: (data as any).minutes.summary || prev.summary,
          keyDecisions: (data as any).minutes.keyDecisions || prev.keyDecisions,
          actionItems: (data as any).minutes.actionItems?.map((item: any, index: number) => ({
            id: `ai-${index}`,
            title: item.title || '',
            description: item.description || '',
            assignee: item.assignee || '',
            supporter: item.supporter || '',
            dueDate: item.dueDate || '',
            priority: item.priority || 'medium',
            status: 'pending'
          })) || prev.actionItems
        }));
      }
      toast({
        title: 'AI生成完成',
        description: '会议纪要已自动生成，请检查并修改',
      });
      setIsGenerating(false);
    },
    onError: (error) => {
      toast({
        title: '生成失败',
        description: error.message,
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  });

  const handleGenerateMinutes = () => {
    setIsGenerating(true);
    generateMinutesMutation.mutate({
      meetingId,
      title: meetingId,
      transcription: '', // 从会议记录获取
      agenda: minutes.agenda.map(a => ({ title: a.title })),
    } as any);
  };

  // 添加参会人员
  const handleAddAttendee = () => {
    if (newAttendee.trim()) {
      setMinutes(prev => ({
        ...prev,
        attendees: [...prev.attendees, newAttendee.trim()]
      }));
      setNewAttendee('');
    }
  };

  // 移除参会人员
  const handleRemoveAttendee = (index: number) => {
    setMinutes(prev => ({
      ...prev,
      attendees: prev.attendees.filter((_, i) => i !== index)
    }));
  };

  // 添加关键决议
  const handleAddDecision = () => {
    if (newDecision.trim()) {
      setMinutes(prev => ({
        ...prev,
        keyDecisions: [...prev.keyDecisions, newDecision.trim()]
      }));
      setNewDecision('');
    }
  };

  // 移除关键决议
  const handleRemoveDecision = (index: number) => {
    setMinutes(prev => ({
      ...prev,
      keyDecisions: prev.keyDecisions.filter((_, i) => i !== index)
    }));
  };

  // 添加/编辑行动项
  const handleSaveActionItem = (actionItem: ActionItem) => {
    if (editingActionItem) {
      setMinutes(prev => ({
        ...prev,
        actionItems: prev.actionItems.map(item => 
          item.id === editingActionItem.id ? actionItem : item
        )
      }));
    } else {
      setMinutes(prev => ({
        ...prev,
        actionItems: [...prev.actionItems, { ...actionItem, id: `action-${Date.now()}` }]
      }));
    }
    setShowAddActionItem(false);
    setEditingActionItem(null);
  };

  // 删除行动项
  const handleDeleteActionItem = (id: string) => {
    setMinutes(prev => ({
      ...prev,
      actionItems: prev.actionItems.filter(item => item.id !== id)
    }));
  };

  // 保存会议纪要
  const handleSave = () => {
    onSave?.(minutes);
    toast({
      title: '保存成功',
      description: '会议纪要已保存为草稿',
    });
  };

  // 确认会议纪要
  const handleConfirm = () => {
    const confirmedMinutes = {
      ...minutes,
      status: 'confirmed' as const,
      confirmedAt: new Date().toISOString()
    };
    setMinutes(confirmedMinutes);
    onConfirm?.(confirmedMinutes);
    toast({
      title: '确认成功',
      description: '会议纪要已确认，可以进行任务分发',
    });
  };

  // 分发任务
  const handleDistribute = () => {
    const distributedMinutes = {
      ...minutes,
      status: 'distributed' as const
    };
    setMinutes(distributedMinutes);
    onDistribute?.(distributedMinutes);
    toast({
      title: '分发成功',
      description: '任务已分发给相关责任人',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      draft: { label: '草稿', variant: 'secondary' },
      pending_review: { label: '待审核', variant: 'outline' },
      confirmed: { label: '已确认', variant: 'default' },
      distributed: { label: '已分发', variant: 'default' }
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      high: { label: '高', className: 'bg-red-100 text-red-800' },
      medium: { label: '中', className: 'bg-yellow-100 text-yellow-800' },
      low: { label: '低', className: 'bg-green-100 text-green-800' }
    };
    const config = priorityConfig[priority] || priorityConfig.medium;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* 头部信息 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              会议纪要
            </CardTitle>
            <CardDescription>
              记录会议内容、决议和行动项
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(minutes.status)}
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateMinutes}
                  disabled={isGenerating}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  {isGenerating ? 'AI生成中...' : 'AI生成'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />
                  保存
                </Button>
                {minutes.status === 'draft' && (
                  <Button size="sm" onClick={handleConfirm}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    确认
                  </Button>
                )}
                {minutes.status === 'confirmed' && (
                  <Button size="sm" onClick={handleDistribute}>
                    <Send className="h-4 w-4 mr-1" />
                    分发任务
                  </Button>
                )}
              </>
            )}
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="content">会议内容</TabsTrigger>
          <TabsTrigger value="decisions">决议事项</TabsTrigger>
          <TabsTrigger value="actions">行动项</TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="basic">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>会议标题</Label>
                  <Input
                    value={minutes.title}
                    onChange={(e) => setMinutes(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="输入会议标题"
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label>会议日期</Label>
                  <Input
                    type="date"
                    value={minutes.date}
                    onChange={(e) => setMinutes(prev => ({ ...prev, date: e.target.value }))}
                    disabled={readOnly}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>开始时间</Label>
                  <Input
                    type="time"
                    value={minutes.startTime}
                    onChange={(e) => setMinutes(prev => ({ ...prev, startTime: e.target.value }))}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label>结束时间</Label>
                  <Input
                    type="time"
                    value={minutes.endTime}
                    onChange={(e) => setMinutes(prev => ({ ...prev, endTime: e.target.value }))}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label>会议地点</Label>
                  <Input
                    value={minutes.location}
                    onChange={(e) => setMinutes(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="线上/线下地点"
                    disabled={readOnly}
                  />
                </div>
              </div>

              <Separator />

              {/* 参会人员 */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  参会人员
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {minutes.attendees.map((attendee, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {attendee}
                      {!readOnly && (
                        <button
                          onClick={() => handleRemoveAttendee(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {!readOnly && (
                  <div className="flex gap-2">
                    <Input
                      value={newAttendee}
                      onChange={(e) => setNewAttendee(e.target.value)}
                      placeholder="添加参会人员"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddAttendee()}
                    />
                    <Button variant="outline" size="sm" onClick={handleAddAttendee}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* 下次会议 */}
              <div className="space-y-2">
                <Label>下次会议日期</Label>
                <Input
                  type="date"
                  value={minutes.nextMeetingDate || ''}
                  onChange={(e) => setMinutes(prev => ({ ...prev, nextMeetingDate: e.target.value }))}
                  disabled={readOnly}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 会议内容 */}
        <TabsContent value="content">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  会议摘要
                </Label>
                <Textarea
                  value={minutes.summary}
                  onChange={(e) => setMinutes(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="输入会议摘要..."
                  rows={6}
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={minutes.notes}
                  onChange={(e) => setMinutes(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="其他备注信息..."
                  rows={4}
                  disabled={readOnly}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 决议事项 */}
        <TabsContent value="decisions">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  关键决议
                </Label>
                <ScrollArea className="h-[300px] border rounded-md p-4">
                  {minutes.keyDecisions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      暂无决议事项
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {minutes.keyDecisions.map((decision, index) => (
                        <li key={index} className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                          <CheckCircle2 className="h-4 w-4 mt-1 text-green-600 flex-shrink-0" />
                          <span className="flex-1">{decision}</span>
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDecision(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
                {!readOnly && (
                  <div className="flex gap-2">
                    <Input
                      value={newDecision}
                      onChange={(e) => setNewDecision(e.target.value)}
                      placeholder="添加决议事项"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddDecision()}
                    />
                    <Button variant="outline" onClick={handleAddDecision}>
                      <Plus className="h-4 w-4 mr-1" />
                      添加
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 行动项 */}
        <TabsContent value="actions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListTodo className="h-5 w-5" />
                  行动项清单
                </CardTitle>
                <CardDescription>
                  确认后将自动分发给责任人
                </CardDescription>
              </div>
              {!readOnly && (
                <Button onClick={() => setShowAddActionItem(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  添加行动项
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {minutes.actionItems.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无行动项</p>
                    <p className="text-sm">点击"添加行动项"或使用AI自动生成</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {minutes.actionItems.map((item) => (
                      <Card key={item.id} className="border-l-4 border-l-primary">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{item.title}</h4>
                                {getPriorityBadge(item.priority)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {item.description}
                              </p>
                              <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  <span>责任人: {item.assignee}</span>
                                </div>
                                {item.supporter && (
                                  <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    <span>支持人: {item.supporter}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>截止: {item.dueDate}</span>
                                </div>
                              </div>
                            </div>
                            {!readOnly && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingActionItem(item);
                                    setShowAddActionItem(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteActionItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}
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
      </Tabs>

      {/* 添加/编辑行动项对话框 */}
      <ActionItemDialog
        open={showAddActionItem}
        onOpenChange={(open) => {
          setShowAddActionItem(open);
          if (!open) setEditingActionItem(null);
        }}
        actionItem={editingActionItem}
        onSave={handleSaveActionItem}
      />
    </div>
  );
}

// 行动项编辑对话框
interface ActionItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionItem: ActionItem | null;
  onSave: (actionItem: ActionItem) => void;
}

function ActionItemDialog({ open, onOpenChange, actionItem, onSave }: ActionItemDialogProps) {
  const [formData, setFormData] = useState<ActionItem>({
    id: '',
    title: '',
    description: '',
    assignee: '',
    supporter: '',
    dueDate: '',
    priority: 'medium',
    status: 'pending'
  });

  useEffect(() => {
    if (actionItem) {
      setFormData(actionItem);
    } else {
      setFormData({
        id: '',
        title: '',
        description: '',
        assignee: '',
        supporter: '',
        dueDate: '',
        priority: 'medium',
        status: 'pending'
      });
    }
  }, [actionItem, open]);

  const handleSubmit = () => {
    if (!formData.title || !formData.assignee || !formData.dueDate) {
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {actionItem ? '编辑行动项' : '添加行动项'}
          </DialogTitle>
          <DialogDescription>
            设置任务详情、责任人和完成时间
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>任务标题 *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="输入任务标题"
            />
          </div>

          <div className="space-y-2">
            <Label>任务描述</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="详细描述任务内容"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>责任人 *</Label>
              <Input
                value={formData.assignee}
                onChange={(e) => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
                placeholder="输入责任人"
              />
            </div>
            <div className="space-y-2">
              <Label>支持人</Label>
              <Input
                value={formData.supporter || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, supporter: e.target.value }))}
                placeholder="输入支持人"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>完成时间 *</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>优先级</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'high' | 'medium' | 'low') => 
                  setFormData(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            {actionItem ? '保存' : '添加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
