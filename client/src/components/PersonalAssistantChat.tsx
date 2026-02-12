import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Plus, Settings, MessageSquare, BookOpen, Target, Award, History, Lightbulb, CheckCircle2, Database, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface PersonalAssistantChatProps {
  assistantId?: string;
  onClose?: () => void;
}

type TabType = "chat" | "skills" | "career" | "learning" | "goals" | "achievements" | "history" | "knowledge";

interface KnowledgeBase {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  lastUpdated: Date;
}

export default function PersonalAssistantChat({ assistantId, onClose }: PersonalAssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [tabContent, setTabContent] = useState<Record<TabType, string>>({
    chat: "",
    skills: "",
    career: "",
    learning: "",
    goals: "",
    achievements: "",
    history: "",
    knowledge: "",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化个人助手
  const initializeMutation = trpc.employeeAiAssistant.initialize.useMutation();
  const getSessionMutation = trpc.employeeAiAssistant.getOrCreateSession.useMutation();
  const sendMessageMutation = trpc.employeeAiAssistant.sendMessage.useMutation();

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化助手
  useEffect(() => {
    const initializeAssistant = async () => {
      try {
        const result = await initializeMutation.mutateAsync({
          assistantType: "personal",
        });

        if (result.success) {
          const session = await getSessionMutation.mutateAsync({
            sessionTitle: `个人助手 - ${new Date().toLocaleDateString()}`,
          });

          if (session) {
            setSessionId((session as any).id?.toString() || (session as any).sessionId?.toString() || null);
            setMessages([
              {
                id: "welcome",
                role: "assistant",
                content: "👋 欢迎使用个人助手！我是您的专属AI助手，可以帮助您：\n\n• 📚 **技能推荐** - 获取个性化的技能学习建议\n• 🎯 **职业规划** - 规划您的职业发展路径\n• 📖 **学习资源** - 推荐优质的学习资源\n• ✅ **目标管理** - 创建和追踪职业目标\n• 🏆 **成就系统** - 记录您的成就和进度\n\n请告诉我您需要什么帮助？",
                timestamp: new Date(),
              },
            ]);
          }
        }
      } catch (error) {
        console.error("Failed to initialize assistant:", error);
        setMessages([
          {
            id: "error",
            role: "assistant",
            content: "❌ 个人助手初始化失败，请稍后重试。",
            timestamp: new Date(),
          },
        ]);
      }
    };

    initializeAssistant();
  }, []);

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !sessionId || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // 根据当前标签页，添加上下文提示词
      let contextPrompt = userMessage;
      if (activeTab === "skills") {
        contextPrompt = `[技能推荐模式] ${userMessage}`;
      } else if (activeTab === "career") {
        contextPrompt = `[职业规划模式] ${userMessage}`;
      } else if (activeTab === "learning") {
        contextPrompt = `[学习资源推荐模式] ${userMessage}`;
      } else if (activeTab === "goals") {
        contextPrompt = `[目标管理模式] ${userMessage}`;
      } else if (activeTab === "achievements") {
        contextPrompt = `[成就系统模式] ${userMessage}`;
      }

      const result = await sendMessageMutation.mutateAsync({
        sessionId: parseInt(sessionId),
        message: contextPrompt,
      });

      if (result.success && result.response) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "❌ 消息发送失败，请重试。",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // 标签页配置
  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: "chat", label: "对话", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "skills", label: "技能推荐", icon: <Lightbulb className="w-4 h-4" /> },
    { id: "career", label: "职业规划", icon: <Target className="w-4 h-4" /> },
    { id: "learning", label: "学习资源", icon: <BookOpen className="w-4 h-4" /> },
    { id: "goals", label: "目标管理", icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: "achievements", label: "成就系统", icon: <Award className="w-4 h-4" /> },
    { id: "history", label: "对话历史", icon: <History className="w-4 h-4" /> },
  ];

  // 渲染标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case "chat":
        return (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>正在初始化个人助手...</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <Streamdown>{message.content}</Streamdown>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground px-4 py-2 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        );

      case "skills":
        return (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">📚 技能推荐</h3>
              <p className="text-sm text-muted-foreground mb-4">
                基于您的工作经历和学习记录，我为您推荐以下技能：
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-card border border-border rounded">
                  <p className="font-medium text-sm">Python 数据分析</p>
                  <p className="text-xs text-muted-foreground">推荐指数: ⭐⭐⭐⭐⭐</p>
                </div>
                <div className="p-3 bg-card border border-border rounded">
                  <p className="font-medium text-sm">项目管理</p>
                  <p className="text-xs text-muted-foreground">推荐指数: ⭐⭐⭐⭐</p>
                </div>
                <div className="p-3 bg-card border border-border rounded">
                  <p className="font-medium text-sm">团队领导力</p>
                  <p className="text-xs text-muted-foreground">推荐指数: ⭐⭐⭐⭐</p>
                </div>
              </div>
              <Button className="w-full mt-4" variant="default" size="sm">
                获取详细学习路径
              </Button>
            </Card>
          </div>
        );

      case "career":
        return (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">🎯 职业发展规划</h3>
              <p className="text-sm text-muted-foreground mb-4">
                根据您的能力和兴趣，以下是推荐的职业发展路径：
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-card border border-border rounded">
                  <p className="font-medium text-sm">路径 1: 技术专家</p>
                  <p className="text-xs text-muted-foreground">预计时间: 2-3 年</p>
                </div>
                <div className="p-3 bg-card border border-border rounded">
                  <p className="font-medium text-sm">路径 2: 项目经理</p>
                  <p className="text-xs text-muted-foreground">预计时间: 1-2 年</p>
                </div>
                <div className="p-3 bg-card border border-border rounded">
                  <p className="font-medium text-sm">路径 3: 部门主管</p>
                  <p className="text-xs text-muted-foreground">预计时间: 3-5 年</p>
                </div>
              </div>
              <Button className="w-full mt-4" variant="default" size="sm">
                查看详细规划
              </Button>
            </Card>
          </div>
        );

      case "learning":
        return (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">📖 学习资源推荐</h3>
              <p className="text-sm text-muted-foreground mb-4">
                为您精选的优质学习资源：
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-card border border-border rounded">
                  <p className="font-medium text-sm">📹 视频课程: Python 高级编程</p>
                  <p className="text-xs text-muted-foreground">平台: Udemy | 难度: 中级</p>
                </div>
                <div className="p-3 bg-card border border-border rounded">
                  <p className="font-medium text-sm">📚 书籍: 《高效能人士的七个习惯》</p>
                  <p className="text-xs text-muted-foreground">作者: 史蒂芬·柯维</p>
                </div>
                <div className="p-3 bg-card border border-border rounded">
                  <p className="font-medium text-sm">🎓 认证课程: 敏捷项目管理</p>
                  <p className="text-xs text-muted-foreground">认证: PMI-ACP</p>
                </div>
              </div>
            </Card>
          </div>
        );

      case "goals":
        return (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">✅ 职业目标管理</h3>
              <p className="text-sm text-muted-foreground mb-4">
                您的职业目标：
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-card border border-border rounded flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">完成 Python 高级认证</p>
                    <p className="text-xs text-muted-foreground">截止日期: 2026年6月</p>
                  </div>
                </div>
                <div className="p-3 bg-card border border-border rounded flex items-start gap-3">
                  <div className="w-5 h-5 border-2 border-yellow-500 rounded flex-shrink-0 mt-0.5"></div>
                  <div>
                    <p className="font-medium text-sm">晋升为高级工程师</p>
                    <p className="text-xs text-muted-foreground">截止日期: 2026年12月</p>
                  </div>
                </div>
              </div>
              <Button className="w-full mt-4" variant="default" size="sm">
                添加新目标
              </Button>
            </Card>
          </div>
        );

      case "achievements":
        return (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">🏆 成就系统</h3>
              <p className="text-sm text-muted-foreground mb-4">
                您已获得的成就和徽章：
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-card border border-border rounded text-center">
                  <p className="text-2xl mb-1">🌟</p>
                  <p className="text-xs font-medium">初学者</p>
                  <p className="text-xs text-muted-foreground">完成第一课</p>
                </div>
                <div className="p-3 bg-card border border-border rounded text-center">
                  <p className="text-2xl mb-1">🚀</p>
                  <p className="text-xs font-medium">快速学习者</p>
                  <p className="text-xs text-muted-foreground">7天内完成5课</p>
                </div>
                <div className="p-3 bg-card border border-border rounded text-center">
                  <p className="text-2xl mb-1">💎</p>
                  <p className="text-xs font-medium">精通者</p>
                  <p className="text-xs text-muted-foreground">技能等级达5</p>
                </div>
                <div className="p-3 bg-card border border-border rounded text-center opacity-50">
                  <p className="text-2xl mb-1">👑</p>
                  <p className="text-xs font-medium">大师</p>
                  <p className="text-xs text-muted-foreground">敬请期待</p>
                </div>
              </div>
            </Card>
          </div>
        );

      case "history":
        return (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">📜 对话历史</h3>
              <p className="text-sm text-muted-foreground mb-4">
                您最近的对话记录：
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-card border border-border rounded cursor-pointer hover:bg-muted transition">
                  <p className="font-medium text-sm">如何提升领导力？</p>
                  <p className="text-xs text-muted-foreground">2026-02-07 14:30</p>
                </div>
                <div className="p-3 bg-card border border-border rounded cursor-pointer hover:bg-muted transition">
                  <p className="font-medium text-sm">推荐学习Python的资源</p>
                  <p className="text-xs text-muted-foreground">2026-02-07 10:15</p>
                </div>
                <div className="p-3 bg-card border border-border rounded cursor-pointer hover:bg-muted transition">
                  <p className="font-medium text-sm">我的职业发展方向</p>
                  <p className="text-xs text-muted-foreground">2026-02-06 16:45</p>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border border-border">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h2 className="text-lg font-semibold">个人AI助手</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMessages([]);
              setSessionId(null);
            }}
            title="开始新对话"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" title="设置">
            <Settings className="w-4 h-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="flex gap-1 p-2 border-b border-border bg-card overflow-x-auto">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </Button>
        ))}
      </div>

      {/* 内容区域 */}
      {renderTabContent()}

      {/* 输入区域（仅在对话标签页显示） */}
      {activeTab === "chat" && (
        <div className="border-t border-border p-4 bg-card">
          <div className="flex gap-2">
            <Input
              placeholder="输入您的问题或需求..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isLoading || !sessionId}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim() || !sessionId}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
