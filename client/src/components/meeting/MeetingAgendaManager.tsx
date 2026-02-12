/**
 * 会议议程管理组件
 * 支持议程项的添加、编辑、排序和时间跟踪
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  Circle,
  GripVertical,
  Trash2,
  Edit2,
  Timer,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MeetingAgendaItem } from "@/config/meeting-templates";

interface AgendaItemWithStatus extends MeetingAgendaItem {
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  actualDuration?: number;
  notes?: string;
  startTime?: Date;
}

interface MeetingAgendaManagerProps {
  initialAgenda?: MeetingAgendaItem[];
  onAgendaChange?: (agenda: AgendaItemWithStatus[]) => void;
  isLive?: boolean;
  meetingStartTime?: Date;
}

export function MeetingAgendaManager({
  initialAgenda = [],
  onAgendaChange,
  isLive = false,
  meetingStartTime,
}: MeetingAgendaManagerProps) {
  const [agenda, setAgenda] = useState<AgendaItemWithStatus[]>(
    initialAgenda.map(item => ({ ...item, status: 'pending' }))
  );
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItemWithStatus | null>(null);
  const [newItem, setNewItem] = useState({
    title: '',
    duration: 10,
    description: '',
    responsible: '',
  });

  // 计时器
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && currentItemIndex !== null) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, currentItemIndex]);

  // 通知父组件
  useEffect(() => {
    onAgendaChange?.(agenda);
  }, [agenda, onAgendaChange]);

  const totalDuration = agenda.reduce((sum, item) => sum + item.duration, 0);
  const completedDuration = agenda
    .filter(item => item.status === 'completed')
    .reduce((sum, item) => sum + (item.actualDuration || item.duration), 0);
  const progress = totalDuration > 0 ? (completedDuration / totalDuration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startItem = (index: number) => {
    const updatedAgenda = [...agenda];
    if (currentItemIndex !== null && currentItemIndex !== index) {
      // 暂停当前项
      updatedAgenda[currentItemIndex] = {
        ...updatedAgenda[currentItemIndex],
        status: 'pending',
      };
    }
    updatedAgenda[index] = {
      ...updatedAgenda[index],
      status: 'in_progress',
      startTime: new Date(),
    };
    setAgenda(updatedAgenda);
    setCurrentItemIndex(index);
    setElapsedTime(0);
    setIsTimerRunning(true);
  };

  const pauseItem = () => {
    setIsTimerRunning(false);
  };

  const resumeItem = () => {
    setIsTimerRunning(true);
  };

  const completeItem = (index: number) => {
    const updatedAgenda = [...agenda];
    updatedAgenda[index] = {
      ...updatedAgenda[index],
      status: 'completed',
      actualDuration: Math.ceil(elapsedTime / 60),
    };
    setAgenda(updatedAgenda);
    setIsTimerRunning(false);
    setCurrentItemIndex(null);
    setElapsedTime(0);

    // 自动开始下一项
    const nextIndex = agenda.findIndex((item, i) => i > index && item.status === 'pending');
    if (nextIndex !== -1 && isLive) {
      startItem(nextIndex);
    }
  };

  const skipItem = (index: number) => {
    const updatedAgenda = [...agenda];
    updatedAgenda[index] = {
      ...updatedAgenda[index],
      status: 'skipped',
    };
    setAgenda(updatedAgenda);
    if (currentItemIndex === index) {
      setIsTimerRunning(false);
      setCurrentItemIndex(null);
      setElapsedTime(0);
    }
  };

  const addItem = () => {
    const newAgendaItem: AgendaItemWithStatus = {
      id: `custom_${Date.now()}`,
      title: newItem.title,
      duration: newItem.duration,
      description: newItem.description,
      responsible: newItem.responsible || undefined,
      required: false,
      status: 'pending',
    };
    setAgenda([...agenda, newAgendaItem]);
    setNewItem({ title: '', duration: 10, description: '', responsible: '' });
    setIsAddDialogOpen(false);
  };

  const updateItem = () => {
    if (!editingItem) return;
    const updatedAgenda = agenda.map(item =>
      item.id === editingItem.id ? editingItem : item
    );
    setAgenda(updatedAgenda);
    setEditingItem(null);
  };

  const deleteItem = (index: number) => {
    const updatedAgenda = agenda.filter((_, i) => i !== index);
    setAgenda(updatedAgenda);
    if (currentItemIndex === index) {
      setCurrentItemIndex(null);
      setIsTimerRunning(false);
      setElapsedTime(0);
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= agenda.length) return;
    const updatedAgenda = [...agenda];
    [updatedAgenda[index], updatedAgenda[newIndex]] = [updatedAgenda[newIndex], updatedAgenda[index]];
    setAgenda(updatedAgenda);
  };

  const getStatusIcon = (status: AgendaItemWithStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'in_progress':
        return <Timer className="w-4 h-4 text-primary animate-pulse" />;
      case 'skipped':
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* 进度概览 */}
      <Card className="bg-background/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">会议进度</span>
              <Badge variant="outline" className="text-xs">
                {agenda.filter(i => i.status === 'completed').length}/{agenda.length} 完成
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>预计 {totalDuration} 分钟</span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>已用 {completedDuration} 分钟</span>
            <span>剩余 {totalDuration - completedDuration} 分钟</span>
          </div>
        </CardContent>
      </Card>

      {/* 当前议程计时器 */}
      {currentItemIndex !== null && (
        <Card className="bg-gradient-to-br from-primary/10 to-emerald-500/10 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">当前议程</p>
                <h3 className="font-medium">{agenda[currentItemIndex].title}</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-mono font-bold text-primary">
                    {formatTime(elapsedTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    / {agenda[currentItemIndex].duration}:00
                  </p>
                </div>
                <div className="flex gap-2">
                  {isTimerRunning ? (
                    <Button size="sm" variant="outline" onClick={pauseItem}>
                      <Pause className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={resumeItem}>
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  <Button size="sm" onClick={() => completeItem(currentItemIndex)}>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    完成
                  </Button>
                </div>
              </div>
            </div>
            {elapsedTime > agenda[currentItemIndex].duration * 60 && (
              <div className="mt-2 flex items-center gap-2 text-amber-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                已超时 {formatTime(elapsedTime - agenda[currentItemIndex].duration * 60)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 议程列表 */}
      <Card className="bg-background/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">会议议程</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              添加议程
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {agenda.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-all",
                    item.status === 'in_progress' && "border-primary bg-primary/5",
                    item.status === 'completed' && "border-emerald-500/30 bg-emerald-500/5",
                    item.status === 'skipped' && "opacity-50",
                    item.status === 'pending' && "border-border/50 hover:border-border"
                  )}
                >
                  {/* 拖拽手柄 */}
                  <div className="flex flex-col gap-1 pt-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === agenda.length - 1}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* 状态图标 */}
                  <div className="pt-1">
                    {getStatusIcon(item.status)}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={cn(
                        "font-medium text-sm",
                        item.status === 'skipped' && "line-through"
                      )}>
                        {item.title}
                        {item.required && <span className="text-destructive ml-1">*</span>}
                      </h4>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {item.actualDuration || item.duration}分钟
                        </Badge>
                        {item.responsible && (
                          <Badge variant="secondary" className="text-xs">
                            {item.responsible}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </p>
                    {item.outputs && item.outputs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.outputs.map((output, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {output}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-1">
                    {item.status === 'pending' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => startItem(index)}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditingItem(item)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {!item.required && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 添加议程对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-[#0F172A] border-border/50">
          <DialogHeader>
            <DialogTitle>添加议程项</DialogTitle>
            <DialogDescription>添加自定义议程项到会议中</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">议程标题</label>
              <Input
                placeholder="输入议程标题..."
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                className="bg-background/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">时长（分钟）</label>
                <Input
                  type="number"
                  min={1}
                  value={newItem.duration}
                  onChange={(e) => setNewItem({ ...newItem, duration: parseInt(e.target.value) || 10 })}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">负责人</label>
                <Input
                  placeholder="可选"
                  value={newItem.responsible}
                  onChange={(e) => setNewItem({ ...newItem, responsible: e.target.value })}
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              <Textarea
                placeholder="议程描述..."
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="bg-background/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={addItem} disabled={!newItem.title}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑议程对话框 */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="bg-[#0F172A] border-border/50">
          <DialogHeader>
            <DialogTitle>编辑议程项</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">议程标题</label>
                <Input
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">时长（分钟）</label>
                  <Input
                    type="number"
                    min={1}
                    value={editingItem.duration}
                    onChange={(e) => setEditingItem({ ...editingItem, duration: parseInt(e.target.value) || 10 })}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">负责人</label>
                  <Input
                    value={editingItem.responsible || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, responsible: e.target.value })}
                    className="bg-background/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">描述</label>
                <Textarea
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">备注</label>
                <Textarea
                  placeholder="添加备注..."
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  className="bg-background/50"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              取消
            </Button>
            <Button onClick={updateItem}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MeetingAgendaManager;
