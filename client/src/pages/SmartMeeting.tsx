import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Clock,
  ListTodo,
  FileText,
  Brain,
  Video,
  Users,
  Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/grt";
import { useState, useEffect, useCallback, useRef } from "react";
import { Streamdown } from "streamdown";

// 议程项类型
interface AgendaItem {
  id: string;
  title: string;
  duration: number; // 分钟
  completed: boolean;
}

// 行动项类型
interface ActionItem {
  id: string;
  content: string;
  assignee?: string;
  dueDate?: string;
  completed: boolean;
}

// AI洞察类型
interface AIInsight {
  id: string;
  type: "summary" | "suggestion" | "action";
  content: string;
  timestamp: Date;
}

export default function SmartMeeting() {
  const { language, t } = useLanguage();
  
  // 议程状态
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([
    { id: "1", title: "开场与目标确认", duration: 5, completed: false },
    { id: "2", title: "上周工作回顾", duration: 10, completed: false },
    { id: "3", title: "本周重点任务", duration: 15, completed: false },
    { id: "4", title: "问题讨论", duration: 15, completed: false },
    { id: "5", title: "总结与行动项", duration: 5, completed: false },
  ]);
  const [newAgendaTitle, setNewAgendaTitle] = useState("");
  const [newAgendaDuration, setNewAgendaDuration] = useState(10);
  
  // 计时器状态
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentAgendaIndex, setCurrentAgendaIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 协作画布状态
  const [canvasContent, setCanvasContent] = useState(`# 会议纪要

## 参会人员
- 

## 讨论要点

### 1. 上周工作回顾


### 2. 本周重点任务


### 3. 问题与解决方案


## 行动项
- TODO: 
- Action: 

## 下次会议安排
`);
  
  // 行动项状态
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  
  // AI洞察状态
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  
  // 计时器逻辑
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);
  
  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  
  // 获取当前议程项的剩余时间
  const getCurrentAgendaRemaining = () => {
    if (currentAgendaIndex >= agendaItems.length) return 0;
    const targetSeconds = agendaItems[currentAgendaIndex].duration * 60;
    return Math.max(0, targetSeconds - timerSeconds);
  };
  
  // 添加议程项
  const addAgendaItem = () => {
    if (!newAgendaTitle.trim()) return;
    const newItem: AgendaItem = {
      id: Date.now().toString(),
      title: newAgendaTitle,
      duration: newAgendaDuration,
      completed: false,
    };
    setAgendaItems(prev => [...prev, newItem]);
    setNewAgendaTitle("");
    setNewAgendaDuration(10);
  };
  
  // 删除议程项
  const removeAgendaItem = (id: string) => {
    setAgendaItems(prev => prev.filter(item => item.id !== id));
  };
  
  // 切换议程项完成状态
  const toggleAgendaComplete = (id: string) => {
    setAgendaItems(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };
  
  // 下一个议程项
  const nextAgenda = () => {
    if (currentAgendaIndex < agendaItems.length - 1) {
      // 标记当前项为完成
      setAgendaItems(prev => prev.map((item, index) => 
        index === currentAgendaIndex ? { ...item, completed: true } : item
      ));
      setCurrentAgendaIndex(prev => prev + 1);
      setTimerSeconds(0);
    }
  };
  
  // 重置计时器
  const resetTimer = () => {
    setTimerSeconds(0);
    setIsTimerRunning(false);
  };
  
  // 提取行动项
  const extractActionItems = useCallback(() => {
    setIsAIProcessing(true);
    
    // 模拟AI处理延迟
    setTimeout(() => {
      const lines = canvasContent.split("\n");
      const newActions: ActionItem[] = [];
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        // 匹配 TODO: 或 Action: 开头的行
        if (trimmedLine.startsWith("TODO:") || trimmedLine.startsWith("- TODO:")) {
          const content = trimmedLine.replace(/^-?\s*TODO:\s*/i, "").trim();
          if (content) {
            newActions.push({
              id: Date.now().toString() + Math.random(),
              content,
              completed: false,
            });
          }
        } else if (trimmedLine.startsWith("Action:") || trimmedLine.startsWith("- Action:")) {
          const content = trimmedLine.replace(/^-?\s*Action:\s*/i, "").trim();
          if (content) {
            newActions.push({
              id: Date.now().toString() + Math.random(),
              content,
              completed: false,
            });
          }
        }
      });
      
      if (newActions.length > 0) {
        setActionItems(prev => [...prev, ...newActions]);
        
        // 添加AI洞察
        setAiInsights(prev => [...prev, {
          id: Date.now().toString(),
          type: "action",
          content: `已提取 ${newActions.length} 个行动项`,
          timestamp: new Date(),
        }]);
      } else {
        setAiInsights(prev => [...prev, {
          id: Date.now().toString(),
          type: "suggestion",
          content: "未找到行动项。请在画布中使用 'TODO:' 或 'Action:' 前缀标记行动项。",
          timestamp: new Date(),
        }]);
      }
      
      setIsAIProcessing(false);
    }, 1000);
  }, [canvasContent]);
  
  // 生成AI摘要
  const generateAISummary = useCallback(() => {
    setIsAIProcessing(true);
    
    setTimeout(() => {
      // 简单的摘要生成逻辑
      const wordCount = canvasContent.split(/\s+/).length;
      const lineCount = canvasContent.split("\n").filter(l => l.trim()).length;
      const headingCount = (canvasContent.match(/^#+\s/gm) || []).length;
      
      const summary = `**会议纪要摘要**\n\n- 文档长度: ${wordCount} 字\n- 有效行数: ${lineCount} 行\n- 章节数: ${headingCount} 个\n- 已完成议程: ${agendaItems.filter(a => a.completed).length}/${agendaItems.length}\n- 待处理行动项: ${actionItems.filter(a => !a.completed).length} 个`;
      
      setAiInsights(prev => [...prev, {
        id: Date.now().toString(),
        type: "summary",
        content: summary,
        timestamp: new Date(),
      }]);
      
      setIsAIProcessing(false);
    }, 1500);
  }, [canvasContent, agendaItems, actionItems]);
  
  // 切换行动项完成状态
  const toggleActionComplete = (id: string) => {
    setActionItems(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };
  
  // 删除行动项
  const removeActionItem = (id: string) => {
    setActionItems(prev => prev.filter(item => item.id !== id));
  };
  
  // 清除AI洞察
  const clearInsights = () => {
    setAiInsights([]);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Video}
          title={language === "zh" ? "智慧会议" : "Smart Meeting"}
          description={language === "zh" ? "会议驾驶舱 - 议程管理、协作记录、AI洞察" : "Meeting Cockpit - Agenda, Collaboration, AI Insights"}
          actions={<>
            <Badge variant="outline" className="gap-1">
              <Users className="w-3 h-3" />
              {language === "zh" ? "3 参会者" : "3 Participants"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Calendar className="w-3 h-3" />
              {new Date().toLocaleDateString()}
            </Badge>
          </>}
        />

        {/* 三栏布局 - 会议驾驶舱 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-6">
          {/* 左栏：议程与计时器 */}
          <div className="space-y-4">
            {/* 计时器卡片 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  {language === "zh" ? "会议计时" : "Meeting Timer"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 主计时器显示 */}
                <div className="text-center">
                  <div className="text-5xl font-mono font-bold text-primary">
                    {formatTime(timerSeconds)}
                  </div>
                  {currentAgendaIndex < agendaItems.length && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {language === "zh" ? "当前议程剩余" : "Current agenda remaining"}: 
                      <span className={cn(
                        "ml-1 font-medium",
                        getCurrentAgendaRemaining() < 60 ? "text-destructive" : "text-foreground"
                      )}>
                        {formatTime(getCurrentAgendaRemaining())}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* 控制按钮 */}
                <div className="flex justify-center gap-2">
                  <Button
                    variant={isTimerRunning ? "destructive" : "default"}
                    size="sm"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                  >
                    {isTimerRunning ? (
                      <><Pause className="w-4 h-4 mr-1" /> {language === "zh" ? "暂停" : "Pause"}</>
                    ) : (
                      <><Play className="w-4 h-4 mr-1" /> {language === "zh" ? "开始" : "Start"}</>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetTimer}>
                    <RotateCcw className="w-4 h-4 mr-1" />
                    {language === "zh" ? "重置" : "Reset"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextAgenda}>
                    {language === "zh" ? "下一项" : "Next"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 议程列表卡片 */}
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-primary" />
                  {language === "zh" ? "会议议程" : "Agenda"}
                </CardTitle>
                <CardDescription>
                  {agendaItems.filter(a => a.completed).length}/{agendaItems.length} {language === "zh" ? "已完成" : "completed"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 议程项列表 */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {agendaItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                        index === currentAgendaIndex && "bg-primary/10 border-primary/30",
                        item.completed && "opacity-60"
                      )}
                    >
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => toggleAgendaComplete(item.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm truncate",
                          item.completed && "line-through"
                        )}>
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.duration} {language === "zh" ? "分钟" : "min"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAgendaItem(item.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                {/* 添加新议程项 */}
                <div className="space-y-2">
                  <Input
                    placeholder={language === "zh" ? "新议程项..." : "New agenda item..."}
                    value={newAgendaTitle}
                    onChange={(e) => setNewAgendaTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addAgendaItem()}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={newAgendaDuration}
                      onChange={(e) => setNewAgendaDuration(parseInt(e.target.value) || 10)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground self-center">
                      {language === "zh" ? "分钟" : "min"}
                    </span>
                    <Button size="sm" onClick={addAgendaItem} className="ml-auto">
                      <Plus className="w-4 h-4 mr-1" />
                      {language === "zh" ? "添加" : "Add"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 中栏：协作画布 */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {language === "zh" ? "协作画布" : "Live Canvas"}
              </CardTitle>
              <CardDescription>
                {language === "zh" 
                  ? "支持Markdown格式，使用 TODO: 或 Action: 标记行动项" 
                  : "Supports Markdown. Use TODO: or Action: to mark action items"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[500px] font-mono text-sm resize-none"
                placeholder={language === "zh" 
                  ? "在此输入会议纪要...\n\n使用 TODO: 或 Action: 前缀标记行动项" 
                  : "Enter meeting notes here...\n\nUse TODO: or Action: prefix to mark action items"}
                value={canvasContent}
                onChange={(e) => setCanvasContent(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* 右栏：AI洞察 */}
          <div className="space-y-4">
            {/* AI控制面板 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  {language === "zh" ? "AI洞察" : "AI Insights"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={extractActionItems}
                  disabled={isAIProcessing}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {language === "zh" ? "提取行动项" : "Extract Actions"}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={generateAISummary}
                  disabled={isAIProcessing}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {language === "zh" ? "生成摘要" : "Generate Summary"}
                </Button>
                {aiInsights.length > 0 && (
                  <Button 
                    variant="ghost" 
                    className="w-full text-muted-foreground"
                    onClick={clearInsights}
                  >
                    {language === "zh" ? "清除洞察" : "Clear Insights"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* 行动项列表 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  {language === "zh" ? "行动项" : "Action Items"}
                  {actionItems.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {actionItems.filter(a => !a.completed).length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {actionItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {language === "zh" 
                      ? "点击\"提取行动项\"从画布中提取任务" 
                      : "Click \"Extract Actions\" to extract tasks from canvas"}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {actionItems.map(item => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-2 p-2 rounded-lg border",
                          item.completed && "opacity-60"
                        )}
                      >
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => toggleActionComplete(item.id)}
                          className="mt-0.5"
                        />
                        <p className={cn(
                          "flex-1 text-sm",
                          item.completed && "line-through"
                        )}>
                          {item.content}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeActionItem(item.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI洞察历史 */}
            {aiInsights.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    {language === "zh" ? "洞察历史" : "Insight History"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto">
                    {aiInsights.slice().reverse().map(insight => (
                      <div
                        key={insight.id}
                        className="p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={
                            insight.type === "summary" ? "default" :
                            insight.type === "action" ? "secondary" : "outline"
                          }>
                            {insight.type === "summary" ? (language === "zh" ? "摘要" : "Summary") :
                             insight.type === "action" ? (language === "zh" ? "行动" : "Action") :
                             (language === "zh" ? "建议" : "Suggestion")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {insight.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-sm">
                          <Streamdown>{insight.content}</Streamdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
