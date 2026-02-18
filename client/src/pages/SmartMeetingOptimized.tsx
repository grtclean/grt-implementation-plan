import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/grt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Play, Pause, RotateCcw, Plus, Trash2, CheckCircle2, AlertCircle, Users, BarChart3, Download, Share2 } from 'lucide-react';
import { Streamdown } from 'streamdown';

interface Agenda {
  id: string;
  title: string;
  duration: number; // 分钟
  startTime?: number;
  endTime?: number;
  status: 'pending' | 'in-progress' | 'completed';
}

interface ActionItem {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  description?: string;
}

interface AIInsight {
  type: 'summary' | 'keypoint' | 'action' | 'decision';
  content: string;
  confidence: number;
}

/**
 * 智慧会议管理 - 优化版本
 * 包含：计时器、议程、协作画布、AI洞察、行动项
 */
export default function SmartMeetingOptimized() {
  // 会议基本信息
  const [meetingTitle, setMeetingTitle] = useState('产品迭代规划会议');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [participants, setParticipants] = useState('6');
  const [meetingDuration, setMeetingDuration] = useState(0); // 秒

  // 计时器状态
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // 议程管理
  const [agendas, setAgendas] = useState<Agenda[]>([
    { id: '1', title: '开场与目标确认', duration: 5, status: 'completed' },
    { id: '2', title: '上周工作回顾', duration: 10, status: 'in-progress' },
    { id: '3', title: '本周重点任务', duration: 15, status: 'pending' },
    { id: '4', title: '问题讨论', duration: 15, status: 'pending' },
    { id: '5', title: '总结与行动项', duration: 5, status: 'pending' },
  ]);

  // 协作画布
  const [collaborativeNotes, setCollaborativeNotes] = useState(`# 会议纪要

## 会议信息
- **日期**: 2026-02-06
- **会议类型**: 周会
- **参会人员**: 张伟, 李明, 王芳, 陈强, 刘洋, 赵六

## 关键讨论点

### 1. 上周工作回顾
- TODO: 完成上周任务总结

### 2. 本周重点任务
- Action: 确定本周优先级任务
- TODO: 分配任务负责人

## 决策记录
- Decision: 采用敏捷迭代方式，每两周一个迭代
`);

  // AI洞察
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([
    {
      type: 'summary',
      content: '本次「产品迭代规划会议」，共6人参会，讨论了6个主要议题，形成4项行动计划，其中1项为高优先级。',
      confidence: 0.95,
    },
    {
      type: 'keypoint',
      content: '确定采用敏捷迭代方式，每两周一个迭代',
      confidence: 0.98,
    },
  ]);

  // 行动项
  const [actionItems, setActionItems] = useState<ActionItem[]>([
    {
      id: '1',
      title: '完成修复，这个很紧急',
      owner: '李明',
      dueDate: '2026-02-06',
      priority: 'high',
      status: 'pending',
      description: '完成修复，这个很紧急',
    },
    {
      id: '2',
      title: '周五前完成首页改版设计稿的定稿',
      owner: '王芳',
      dueDate: '2026-02-12',
      priority: 'medium',
      status: 'pending',
      description: '周五前完成首页改版设计稿的定稿',
    },
    {
      id: '3',
      title: '一份自动化测试方案文档',
      owner: '陈强',
      dueDate: '2026-02-11',
      priority: 'medium',
      status: 'pending',
      description: '一份自动化测试方案文档',
    },
  ]);

  // 计时器效果
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 计时器控制
  const handleTimerStart = () => setIsTimerRunning(true);
  const handleTimerPause = () => setIsTimerRunning(false);
  const handleTimerReset = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  // 议程管理
  const handleAddAgenda = () => {
    const newAgenda: Agenda = {
      id: Date.now().toString(),
      title: '新议程...',
      duration: 10,
      status: 'pending',
    };
    setAgendas([...agendas, newAgenda]);
  };

  const handleDeleteAgenda = (id: string) => {
    setAgendas(agendas.filter(a => a.id !== id));
  };

  const handleUpdateAgenda = (id: string, updates: Partial<Agenda>) => {
    setAgendas(agendas.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  // 行动项管理
  const handleAddActionItem = () => {
    const newItem: ActionItem = {
      id: Date.now().toString(),
      title: '新行动项...',
      owner: '',
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'medium',
      status: 'pending',
    };
    setActionItems([...actionItems, newItem]);
  };

  const handleDeleteActionItem = (id: string) => {
    setActionItems(actionItems.filter(a => a.id !== id));
  };

  const handleUpdateActionItem = (id: string, updates: Partial<ActionItem>) => {
    setActionItems(actionItems.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  // 导出会议纪要
  const handleExportMinutes = () => {
    const content = `# ${meetingTitle}

## 会议信息
- **日期**: ${meetingDate}
- **参会人数**: ${participants}
- **会议时长**: ${formatTime(timerSeconds)}

## 议程执行情况
${agendas.map((a, i) => `${i + 1}. ${a.title} (${a.duration}分钟) - ${a.status}`).join('\n')}

## 会议纪要
${collaborativeNotes}

## 行动项
${actionItems.map((item, i) => `${i + 1}. **${item.title}**
   - 负责人: ${item.owner}
   - 截止日期: ${item.dueDate}
   - 优先级: ${item.priority}
   - 状态: ${item.status}`).join('\n\n')}

---
生成时间: ${new Date().toLocaleString()}
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meetingTitle}-${meetingDate}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in-progress':
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 头部 */}
        <PageHeader
          icon={Clock}
          title={meetingTitle}
          description="智慧会议管理系统 - 优化版本"
          actions={
            <>
              <Button variant="outline" size="sm" onClick={handleExportMinutes}>
                <Download className="w-4 h-4 mr-2" />
                导出纪要
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                分享
              </Button>
            </>
          }
        />

        {/* 主容器 - 三列布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左列：计时器和议程 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 计时器卡片 */}
            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  会议计时
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-900 text-white rounded-lg p-6 text-center">
                  <div className="text-4xl font-mono font-bold">{formatTime(timerSeconds)}</div>
                  <p className="text-sm text-slate-400 mt-2">当前议程：{agendas.find(a => a.status === 'in-progress')?.title || '未开始'}</p>
                </div>

                <div className="flex gap-2">
                  {!isTimerRunning ? (
                    <Button onClick={handleTimerStart} className="flex-1 bg-green-600 hover:bg-green-700">
                      <Play className="w-4 h-4 mr-1" />
                      开始
                    </Button>
                  ) : (
                    <Button onClick={handleTimerPause} className="flex-1 bg-yellow-600 hover:bg-yellow-700">
                      <Pause className="w-4 h-4 mr-1" />
                      暂停
                    </Button>
                  )}
                  <Button onClick={handleTimerReset} variant="outline" className="flex-1">
                    <RotateCcw className="w-4 h-4 mr-1" />
                    重置
                  </Button>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>• 总议程：{agendas.reduce((sum, a) => sum + a.duration, 0)} 分钟</p>
                  <p>• 已完成：{agendas.filter(a => a.status === 'completed').length}/{agendas.length}</p>
                </div>
              </CardContent>
            </Card>

            {/* 议程列表 */}
            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">会议议程</CardTitle>
                <CardDescription>{agendas.filter(a => a.status === 'completed').length}/{agendas.length} 已完成</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {agendas.map((agenda, index) => (
                  <div key={agenda.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(agenda.status)}
                        <span className="text-sm font-medium text-slate-900 flex-1">{agenda.title}</span>
                        <Badge variant="outline" className="text-xs">{agenda.duration}分钟</Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAgenda(agenda.id)}
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Button onClick={handleAddAgenda} variant="outline" size="sm" className="w-full mt-2">
                  <Plus className="w-3 h-3 mr-1" />
                  添加议程
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 中列：协作画布 */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-lg border-0 h-full">
              <CardHeader>
                <CardTitle className="text-lg">协作画布</CardTitle>
                <CardDescription>支持Markdown格式、TODO、Action、Decision标记</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={collaborativeNotes}
                  onChange={(e) => setCollaborativeNotes(e.target.value)}
                  placeholder="输入会议笔记..."
                  className="min-h-96 font-mono text-sm resize-none"
                />
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Markdown预览：</p>
                  <div className="prose prose-sm max-w-none">
                    <Streamdown>{collaborativeNotes}</Streamdown>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右列：AI洞察和行动项 */}
          <div className="lg:col-span-1 space-y-6">
            {/* AI洞察面板 */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  AI洞察
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {aiInsights.map((insight, index) => (
                  <div key={index} className="p-3 bg-white rounded-lg border border-blue-200">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {insight.type === 'summary' && '摘要'}
                        {insight.type === 'keypoint' && '关键点'}
                        {insight.type === 'action' && '行动'}
                        {insight.type === 'decision' && '决策'}
                      </Badge>
                      <span className="text-xs text-slate-500">{Math.round(insight.confidence * 100)}%</span>
                    </div>
                    <p className="text-sm text-slate-700">{insight.content}</p>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full">
                  生成AI洞察
                </Button>
              </CardContent>
            </Card>

            {/* 行动项管理 */}
            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  行动项
                </CardTitle>
                <CardDescription>{actionItems.filter(a => a.status !== 'completed').length} 待完成</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {actionItems.map((item) => (
                  <div key={item.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 group">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={item.status === 'completed'}
                        onChange={(e) =>
                          handleUpdateActionItem(item.id, {
                            status: e.target.checked ? 'completed' : 'pending',
                          })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{item.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className={`text-xs ${getPriorityColor(item.priority)}`}>
                            {item.priority === 'high' && '🔴 高'}
                            {item.priority === 'medium' && '🟡 中'}
                            {item.priority === 'low' && '🟢 低'}
                          </Badge>
                          <span className="text-xs text-slate-600">{item.owner}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{item.dueDate}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteActionItem(item.id)}
                        className="opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button onClick={handleAddActionItem} variant="outline" size="sm" className="w-full mt-2">
                  <Plus className="w-3 h-3 mr-1" />
                  添加行动项
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
