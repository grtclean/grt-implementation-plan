import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { PageHeader } from '@/components/grt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Play, Pause, RotateCcw, Plus, Trash2, CheckCircle2, AlertCircle, Users, BarChart3, Download, Share2, CalendarDays } from 'lucide-react';
import { Streamdown } from 'streamdown';
import { MEETING_TEMPLATES, getMeetingTemplate } from '@/config/meeting-templates';

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
  const { t } = useLanguage();

  // ── 从数据库加载已排会议列表 ──
  const meetingsQuery = trpc.smartMeeting.meeting.list.useQuery({ limit: 100 }, { retry: false });
  const scheduledMeetings: any[] = Array.isArray(meetingsQuery.data) ? meetingsQuery.data : [];
  // 按时间排序，UPCOMING 优先
  const upcomingMeetings = scheduledMeetings
    .filter((m: any) => m.status === "UPCOMING")
    .sort((a: any, b: any) => String(a.scheduledStart || "").localeCompare(String(b.scheduledStart || "")));

  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");

  // 会议基本信息
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [participants, setParticipants] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(0); // 秒

  // 计时器状态
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // 议程管理
  const [agendas, setAgendas] = useState<Agenda[]>([]);

  // 协作画布
  const [collaborativeNotes, setCollaborativeNotes] = useState('');

  // ── 选择会议后自动填充 ──
  function handleSelectMeeting(idStr: string) {
    setSelectedMeetingId(idStr);
    const meeting = scheduledMeetings.find((m: any) => String(m.id) === idStr);
    if (!meeting) return;

    const title = String(meeting.title || "");
    const desc = String(meeting.description || "");
    const dateStr = String(meeting.scheduledStart || "").slice(0, 10) || new Date().toISOString().slice(0, 10);

    setMeetingTitle(title);
    setMeetingDate(dateStr);

    // 提取参会人
    const descLines = desc.split("\n");
    let attendees = "";
    for (const line of descLines) {
      if (line.includes("参会") || line.includes("参与")) {
        attendees = line.replace(/.*[：:]/, "").trim();
        break;
      }
    }
    setParticipants(attendees || "待确认");

    // 根据标题匹配模板，自动生成议程
    let templateAgendas: Agenda[] = [];
    const templateMap: Record<string, string> = {
      "走线": "dept_walkthrough",
      "晨会": "bu_morning_standup",
      "销售周例会": "sales_weekly_review",
      "销售月度": "sales_monthly_kpi",
      "季度战略": "sales_quarterly_strategy",
      "月度经营": "monthly_business_review",
      "月度KPI": "sales_monthly_kpi",
      "设计评审": "drawing_review",
      "客户来访": "customer_first_meeting",
    };

    for (const [keyword, templateId] of Object.entries(templateMap)) {
      if (title.includes(keyword)) {
        const tpl = getMeetingTemplate(templateId);
        if (tpl) {
          templateAgendas = tpl.agenda.map((a, i) => ({
            id: String(i + 1),
            title: a.title,
            duration: a.duration,
            status: 'pending' as const,
          }));
        }
        break;
      }
    }

    // 如果没匹配到模板，从描述中提取议程
    if (templateAgendas.length === 0) {
      const agendaLines = descLines.filter(l => /^\d+[\.\)、]/.test(l.trim()) || l.trim().startsWith("→"));
      if (agendaLines.length > 0) {
        templateAgendas = agendaLines.map((line, i) => ({
          id: String(i + 1),
          title: line.replace(/^\d+[\.\)、]\s*/, "").replace(/→\s*/, "").replace(/\(\d+min\)/, "").trim(),
          duration: parseInt(line.match(/(\d+)min/)?.[1] || "10"),
          status: 'pending' as const,
        }));
      } else {
        templateAgendas = [
          { id: '1', title: '开场与目标确认', duration: 5, status: 'pending' },
          { id: '2', title: '主题讨论', duration: 30, status: 'pending' },
          { id: '3', title: '总结与行动项', duration: 10, status: 'pending' },
        ];
      }
    }

    setAgendas(templateAgendas);

    // 生成会议纪要模板
    setCollaborativeNotes(`# ${title}

## 会议信息
- **日期**: ${dateStr}
- **参会人员**: ${attendees || "待确认"}
- **会议ID**: ${meeting.id}

## 议程
${templateAgendas.map((a, i) => `### ${i + 1}. ${a.title} (${a.duration}分钟)\n- \n`).join("\n")}

## 决策记录
-

## 行动项
| 序号 | 行动项 | 责任人 | 截止日期 |
|------|--------|--------|----------|
| 1 | | | |
`);

    // 重置计时器
    setIsTimerRunning(false);
    setTimerSeconds(0);
  }

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
      owner: '洪香龙',
      dueDate: '2026-02-06',
      priority: 'high',
      status: 'pending',
      description: '完成修复，这个很紧急',
    },
    {
      id: '2',
      title: '周五前完成首页改版设计稿的定稿',
      owner: '孙淼', // demo
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
      title: t("mi.smart.newAgenda"),
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
      title: t("mi.smart.newActionItem"),
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

## ${t("mi.smart.exportMeetingInfo")}
- **${t("mi.smart.exportDate")}**: ${meetingDate}
- **${t("mi.smart.exportParticipants")}**: ${participants}
- **${t("mi.smart.exportDuration")}**: ${formatTime(timerSeconds)}

## ${t("mi.smart.exportAgendaStatus")}
${agendas.map((a, i) => `${i + 1}. ${a.title} (${a.duration}${t("mi.smart.exportMinutesUnit")}) - ${a.status}`).join('\n')}

## ${t("mi.smart.exportMinutesLabel")}
${collaborativeNotes}

## ${t("mi.smart.exportActionsLabel")}
${actionItems.map((item, i) => `${i + 1}. **${item.title}**
   - ${t("mi.smart.exportOwner")}: ${item.owner}
   - ${t("mi.smart.exportDeadline")}: ${item.dueDate}
   - ${t("mi.smart.exportPriority")}: ${item.priority}
   - ${t("mi.smart.exportStatus")}: ${item.status}`).join('\n\n')}

---
${t("mi.smart.exportGeneratedAt")}: ${new Date().toLocaleString()}
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
        {/* 选择已排会议 */}
        <Card className="bg-white shadow border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">选择会议:</span>
              </div>
              <Select value={selectedMeetingId} onValueChange={handleSelectMeeting}>
                <SelectTrigger className="w-[400px]">
                  <SelectValue placeholder={meetingsQuery.isLoading ? "加载中..." : `从 ${upcomingMeetings.length} 个待开会议中选择`} />
                </SelectTrigger>
                <SelectContent>
                  {upcomingMeetings.length === 0 && (
                    <SelectItem value="__none" disabled>暂无待开会议</SelectItem>
                  )}
                  {upcomingMeetings.map((m: any) => {
                    const dateStr = String(m.scheduledStart || "").slice(0, 10);
                    const timeStr = String(m.scheduledStart || "").slice(11, 16);
                    return (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {dateStr} {timeStr} | {String(m.title || "").slice(0, 40)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {meetingTitle && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  {meetingTitle.slice(0, 30)}
                </Badge>
              )}
              {participants && (
                <span className="text-xs text-gray-500">参会: {participants.slice(0, 30)}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 头部 */}
        <PageHeader
          icon={Clock}
          title={meetingTitle || "请选择会议"}
          description={t("mi.smart.description")}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={handleExportMinutes}>
                <Download className="w-4 h-4 mr-2" />
                {t("mi.smart.exportMinutes")}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                {t("mi.smart.share")}
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
                  {t("mi.smart.meetingTimer")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-900 text-white rounded-lg p-6 text-center">
                  <div className="text-4xl font-mono font-bold">{formatTime(timerSeconds)}</div>
                  <p className="text-sm text-slate-400 mt-2">{t("mi.smart.currentAgenda")}: {agendas.find(a => a.status === 'in-progress')?.title || t("mi.smart.notStarted")}</p>
                </div>

                <div className="flex gap-2">
                  {!isTimerRunning ? (
                    <Button onClick={handleTimerStart} className="flex-1 bg-green-600 hover:bg-green-700">
                      <Play className="w-4 h-4 mr-1" />
                      {t("mi.smart.start")}
                    </Button>
                  ) : (
                    <Button onClick={handleTimerPause} className="flex-1 bg-yellow-600 hover:bg-yellow-700">
                      <Pause className="w-4 h-4 mr-1" />
                      {t("mi.smart.pause")}
                    </Button>
                  )}
                  <Button onClick={handleTimerReset} variant="outline" className="flex-1">
                    <RotateCcw className="w-4 h-4 mr-1" />
                    {t("mi.smart.reset")}
                  </Button>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>• {t("mi.smart.totalAgenda")}: {agendas.reduce((sum, a) => sum + a.duration, 0)} {t("mi.smart.minutes")}</p>
                  <p>• {t("mi.smart.completed")}: {agendas.filter(a => a.status === 'completed').length}/{agendas.length}</p>
                </div>
              </CardContent>
            </Card>

            {/* 议程列表 */}
            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t("mi.smart.meetingAgenda")}</CardTitle>
                <CardDescription>{agendas.filter(a => a.status === 'completed').length}/{agendas.length} {t("mi.smart.agendaCompleted")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {agendas.map((agenda, index) => (
                  <div key={agenda.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(agenda.status)}
                        <span className="text-sm font-medium text-slate-900 flex-1">{agenda.title}</span>
                        <Badge variant="outline" className="text-xs">{agenda.duration}{t("mi.smart.minutesUnit")}</Badge>
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
                  {t("mi.smart.addAgenda")}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 中列：协作画布 */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-lg border-0 h-full">
              <CardHeader>
                <CardTitle className="text-lg">{t("mi.smart.collaborativeCanvas")}</CardTitle>
                <CardDescription>{t("mi.smart.canvasDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={collaborativeNotes}
                  onChange={(e) => setCollaborativeNotes(e.target.value)}
                  placeholder={t("mi.smart.notesPlaceholder")}
                  className="min-h-96 font-mono text-sm resize-none"
                />
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-2">{t("mi.smart.markdownPreview")}</p>
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
                  {t("mi.smart.aiInsights")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {aiInsights.map((insight, index) => (
                  <div key={index} className="p-3 bg-white rounded-lg border border-blue-200">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {insight.type === 'summary' && t("mi.smart.insightSummary")}
                        {insight.type === 'keypoint' && t("mi.smart.insightKeypoint")}
                        {insight.type === 'action' && t("mi.smart.insightAction")}
                        {insight.type === 'decision' && t("mi.smart.insightDecision")}
                      </Badge>
                      <span className="text-xs text-slate-500">{Math.round(insight.confidence * 100)}%</span>
                    </div>
                    <p className="text-sm text-slate-700">{insight.content}</p>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full">
                  {t("mi.smart.generateInsights")}
                </Button>
              </CardContent>
            </Card>

            {/* 行动项管理 */}
            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t("mi.smart.actionItems")}
                </CardTitle>
                <CardDescription>{actionItems.filter(a => a.status !== 'completed').length} {t("mi.smart.pendingCount")}</CardDescription>
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
                            {item.priority === 'high' && `🔴 ${t("mi.smart.priorityHigh")}`}
                            {item.priority === 'medium' && `🟡 ${t("mi.smart.priorityMedium")}`}
                            {item.priority === 'low' && `🟢 ${t("mi.smart.priorityLow")}`}
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
                  {t("mi.smart.addActionItem")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
