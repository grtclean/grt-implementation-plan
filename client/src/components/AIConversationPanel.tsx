/**
 * AI智能对话面板组件
 * v2.5.8 - 侧边栏AI对话入口、自然语言查询、上下文对话、快捷操作建议
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare,
  Send,
  X,
  Sparkles,
  Search,
  BarChart3,
  FileText,
  Users,
  Loader2,
  ChevronRight,
  History,
  Lightbulb,
  Trash2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Streamdown } from 'streamdown';

// ==================== 类型定义 ====================

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  intent?: ParsedIntent;
  suggestedActions?: SuggestedAction[];
}

interface ParsedIntent {
  primaryIntent: string;
  confidence: number;
  entities: Array<{ type: string; value: string }>;
}

interface SuggestedAction {
  label: string;
  action: string;
  icon: string;
  params?: Record<string, any>;
}

interface QuickQuery {
  label: string;
  query: string;
  icon: React.ReactNode;
  category: string;
}

// ==================== 快捷查询配置 ====================

const QUICK_QUERIES: QuickQuery[] = [
  { label: '本月项目统计', query: '统计本月所有项目的进度和状态', icon: <BarChart3 className="w-4 h-4" />, category: '项目' },
  { label: '待处理商机', query: '显示所有待跟进的商机列表', icon: <Users className="w-4 h-4" />, category: 'CRM' },
  { label: '成本预警', query: '查看当前有哪些项目成本超预算', icon: <FileText className="w-4 h-4" />, category: '成本' },
  { label: '今日会议', query: '今天有哪些会议需要参加', icon: <MessageSquare className="w-4 h-4" />, category: '日程' },
  { label: '培训进度', query: '查看我的培训完成情况', icon: <Sparkles className="w-4 h-4" />, category: '培训' },
  { label: '系统帮助', query: '如何使用成本管理功能', icon: <Lightbulb className="w-4 h-4" />, category: '帮助' }
];

// ==================== 主组件 ====================

interface AIConversationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

export default function AIConversationPanel({ isOpen, onClose, onNavigate }: AIConversationPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // 模拟AI响应（实际应调用后端API）
      const response = await simulateAIResponse(content, sessionId);
      
      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        intent: response.intent,
        suggestedActions: response.suggestedActions
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: '抱歉，处理您的请求时遇到了问题。请稍后重试。',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId]);

  // 处理快捷查询
  const handleQuickQuery = (query: string) => {
    sendMessage(query);
  };

  // 处理建议操作
  const handleSuggestedAction = (action: SuggestedAction) => {
    if (action.action === 'navigate' && onNavigate && action.params?.path) {
      onNavigate(action.params.path);
    } else if (action.action === 'query') {
      sendMessage(action.params?.query || action.label);
    }
  };

  // 清空对话
  const clearConversation = () => {
    setMessages([]);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full bg-card border-l border-border shadow-2xl z-50 flex flex-col transition-all duration-300",
        isExpanded ? "w-[600px]" : "w-[400px]"
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">GRT 智能助手</h3>
            <p className="text-xs text-muted-foreground">自然语言查询系统数据</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "收起" : "展开"}>
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={clearConversation} title="清空对话">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 消息区域 */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-6">
            {/* 欢迎信息 */}
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h4 className="text-lg font-semibold mb-2">您好！我是GRT智能助手</h4>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                我可以帮您查询项目、商机、成本等系统数据，也可以回答关于系统使用的问题。
              </p>
            </div>

            {/* 快捷查询 */}
            <div>
              <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Search className="w-4 h-4" />
                快捷查询
              </h5>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_QUERIES.map((item, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => handleQuickQuery(item.query)}
                  >
                    {item.icon}
                    <span className="ml-2 text-xs">{item.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onActionClick={handleSuggestedAction}
              />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">正在思考...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* 输入区域 */}
      <div className="p-4 border-t border-border bg-card/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的问题..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          按 Enter 发送，支持自然语言查询
        </p>
      </div>
    </div>
  );
}

// ==================== 消息气泡组件 ====================

interface MessageBubbleProps {
  message: Message;
  onActionClick: (action: SuggestedAction) => void;
}

function MessageBubble({ message, onActionClick }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg p-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <div className="space-y-3">
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
              <Streamdown>{message.content}</Streamdown>
            </div>

            {/* 意图识别信息 */}
            {message.intent && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {message.intent.primaryIntent}
                </Badge>
                <span>置信度: {(message.intent.confidence * 100).toFixed(0)}%</span>
              </div>
            )}

            {/* 建议操作 */}
            {message.suggestedActions && message.suggestedActions.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">建议操作：</p>
                <div className="flex flex-wrap gap-2">
                  {message.suggestedActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onActionClick(action)}
                    >
                      <ChevronRight className="w-3 h-3 mr-1" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-xs opacity-60 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

// ==================== 模拟AI响应 ====================

async function simulateAIResponse(query: string, sessionId: string): Promise<{
  content: string;
  intent?: ParsedIntent;
  suggestedActions?: SuggestedAction[];
}> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

  // 简单的意图识别
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('项目') && (lowerQuery.includes('统计') || lowerQuery.includes('进度'))) {
    return {
      content: `## 本月项目统计\n\n根据系统数据，本月共有 **12个** 活跃项目：\n\n| 状态 | 数量 | 占比 |\n|------|------|------|\n| 进行中 | 8 | 67% |\n| 待启动 | 2 | 17% |\n| 已完成 | 2 | 17% |\n\n**关键指标：**\n- 平均进度：68%\n- 按时交付率：85%\n- 成本控制率：92%`,
      intent: { primaryIntent: 'aggregate', confidence: 0.92, entities: [{ type: 'date', value: '本月' }, { type: 'entity', value: '项目' }] },
      suggestedActions: [
        { label: '查看项目详情', action: 'navigate', icon: 'file', params: { path: '/projects' } },
        { label: '导出报表', action: 'query', icon: 'download', params: { query: '导出本月项目报表' } }
      ]
    };
  }

  if (lowerQuery.includes('商机') || lowerQuery.includes('客户')) {
    return {
      content: `## 待跟进商机\n\n当前有 **5个** 商机需要跟进：\n\n1. **华为技术 - 清洗设备采购** (金额: ¥280万)\n   - 阶段：方案评估\n   - 预计成交：2周内\n\n2. **比亚迪 - 产线升级** (金额: ¥150万)\n   - 阶段：需求确认\n   - 预计成交：1个月\n\n3. **宁德时代 - 新建产线** (金额: ¥420万)\n   - 阶段：商务谈判\n   - 预计成交：3周内`,
      intent: { primaryIntent: 'search', confidence: 0.88, entities: [{ type: 'entity', value: '商机' }] },
      suggestedActions: [
        { label: '查看CRM', action: 'navigate', icon: 'users', params: { path: '/crm/opportunities' } },
        { label: '添加跟进记录', action: 'query', icon: 'plus', params: { query: '如何添加商机跟进记录' } }
      ]
    };
  }

  if (lowerQuery.includes('成本') && (lowerQuery.includes('预警') || lowerQuery.includes('超预算'))) {
    return {
      content: `## 成本预警项目\n\n当前有 **2个** 项目存在成本预警：\n\n### 🔴 严重预警\n- **项目A-2024-001** - 预算使用率 **105%**\n  - 超支原因：材料价格上涨\n  - 建议：申请追加预算\n\n### 🟡 警告\n- **项目B-2024-003** - 预算使用率 **92%**\n  - 风险：人工成本接近上限\n  - 建议：优化工时安排`,
      intent: { primaryIntent: 'search', confidence: 0.95, entities: [{ type: 'entity', value: '成本' }, { type: 'condition', value: '预警' }] },
      suggestedActions: [
        { label: '查看成本详情', action: 'navigate', icon: 'chart', params: { path: '/cost' } },
        { label: '查看预警规则', action: 'navigate', icon: 'settings', params: { path: '/cost?tab=alerts' } }
      ]
    };
  }

  if (lowerQuery.includes('会议') || lowerQuery.includes('日程')) {
    return {
      content: `## 今日会议安排\n\n今天共有 **3场** 会议：\n\n| 时间 | 会议 | 地点 |\n|------|------|------|\n| 09:00 | 项目周例会 | 会议室A |\n| 14:00 | 客户方案评审 | 线上 |\n| 16:30 | 技术分享会 | 培训室 |\n\n**提醒：** 14:00的客户方案评审需要准备PPT材料。`,
      intent: { primaryIntent: 'temporal', confidence: 0.90, entities: [{ type: 'date', value: '今天' }, { type: 'entity', value: '会议' }] },
      suggestedActions: [
        { label: '查看日程', action: 'navigate', icon: 'calendar', params: { path: '/agenda' } },
        { label: '创建会议', action: 'query', icon: 'plus', params: { query: '如何创建新会议' } }
      ]
    };
  }

  if (lowerQuery.includes('培训') || lowerQuery.includes('学习')) {
    return {
      content: `## 培训进度概览\n\n您的培训完成情况：\n\n- **已完成：** 8门课程\n- **进行中：** 2门课程\n- **待开始：** 3门课程\n\n### 近期培训\n1. **高级调试技术** - 进度 75%\n2. **客户沟通技巧** - 进度 40%\n\n### 证书状态\n- 已获得：3个\n- 待考核：1个`,
      intent: { primaryIntent: 'search', confidence: 0.85, entities: [{ type: 'entity', value: '培训' }] },
      suggestedActions: [
        { label: '查看培训', action: 'navigate', icon: 'book', params: { path: '/training' } },
        { label: '我的证书', action: 'navigate', icon: 'award', params: { path: '/capability-certificates' } }
      ]
    };
  }

  if (lowerQuery.includes('帮助') || lowerQuery.includes('如何') || lowerQuery.includes('怎么')) {
    return {
      content: `## 系统帮助\n\n我可以帮助您了解系统的各项功能：\n\n### 常用功能\n- **项目管理：** 创建项目、设置里程碑、跟踪进度\n- **CRM：** 管理客户、商机、联系人\n- **成本管理：** 预算编制、成本追踪、预警设置\n- **培训管理：** 课程安排、考核评估、证书管理\n\n### 快捷操作\n您可以直接问我：\n- "创建一个新项目"\n- "查看客户列表"\n- "本月成本报表"`,
      intent: { primaryIntent: 'help', confidence: 0.95, entities: [] },
      suggestedActions: [
        { label: '帮助中心', action: 'navigate', icon: 'help', params: { path: '/help' } },
        { label: '系统指南', action: 'navigate', icon: 'book', params: { path: '/system-guide' } }
      ]
    };
  }

  // 默认响应
  return {
    content: `我理解您想了解 "${query}"。\n\n目前我可以帮您：\n- 查询项目、商机、成本等数据\n- 查看会议和培训安排\n- 回答系统使用问题\n\n请尝试更具体地描述您的需求，例如："本月项目统计"或"待处理商机"。`,
    intent: { primaryIntent: 'unknown', confidence: 0.4, entities: [] },
    suggestedActions: [
      { label: '项目统计', action: 'query', icon: 'chart', params: { query: '本月项目统计' } },
      { label: '商机列表', action: 'query', icon: 'users', params: { query: '待处理商机' } }
    ]
  };
}

// ==================== 浮动按钮组件 ====================

interface AIFloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export function AIFloatingButton({ onClick, isOpen }: AIFloatingButtonProps) {
  if (isOpen) return null;

  return (
    <Button
      onClick={onClick}
      className="fixed right-6 bottom-6 w-14 h-14 rounded-full shadow-lg z-40 bg-primary hover:bg-primary/90"
      size="icon"
    >
      <Sparkles className="w-6 h-6" />
    </Button>
  );
}
