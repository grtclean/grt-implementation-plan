/**
 * AI Assistant Hub - AI助手中心
 * 
 * 功能：
 * 1. Solution Assistant - 方案助手
 * 2. Quotation Assistant - 报价助手
 * 3. Planning Assistant - 规划助手
 * 4. KPI Assistant - KPI助手
 * 5. Employee AI Assistant - 员工个人AI助手
 */

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import PersonalAssistantChat from "@/components/PersonalAssistantChat";
import {
  Bot,
  Brain,
  Calculator,
  Calendar,
  ChartBar,
  FileText,
  Lightbulb,
  MessageSquare,
  Plus,
  Send,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Zap,
  RefreshCw,
  History,
  BookOpen,
  GraduationCap,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  Clock,
  Star,
} from "lucide-react";

// 助手类型定义
type AssistantType = "solution" | "quotation" | "planning" | "kpi" | "employee";

interface AssistantConfig {
  id: AssistantType;
  name: string;
  nameCn: string;
  description: string;
  icon: React.ElementType;
  color: string;
  features: string[];
}

const ASSISTANT_CONFIGS: AssistantConfig[] = [
  {
    id: "solution",
    name: "Solution Assistant",
    nameCn: "方案助手",
    description: "智能分析客户需求，推荐最佳解决方案",
    icon: Lightbulb,
    color: "bg-amber-500",
    features: ["需求分析", "方案推荐", "技术选型", "风险评估"],
  },
  {
    id: "quotation",
    name: "Quotation Assistant",
    nameCn: "报价助手",
    description: "基于历史数据和市场分析，生成精准报价",
    icon: Calculator,
    color: "bg-emerald-500",
    features: ["成本估算", "利润分析", "竞品对比", "报价优化"],
  },
  {
    id: "planning",
    name: "Planning Assistant",
    nameCn: "规划助手",
    description: "项目规划与资源调度智能助手",
    icon: Calendar,
    color: "bg-blue-500",
    features: ["进度规划", "资源分配", "里程碑设定", "风险预警"],
  },
  {
    id: "kpi",
    name: "KPI Assistant",
    nameCn: "KPI助手",
    description: "绩效指标分析与优化建议",
    icon: ChartBar,
    color: "bg-purple-500",
    features: ["指标分析", "趋势预测", "改进建议", "对标分析"],
  },
  {
    id: "employee",
    name: "Personal Assistant",
    nameCn: "个人助手",
    description: "您的专属AI助手，持续学习您的工作习惯",
    icon: User,
    color: "bg-rose-500",
    features: ["个性化学习", "技能提升", "职业规划", "日常协助"],
  },
];

// 消息类型
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export default function AIAssistantHub() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AssistantType>("solution");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [selectedAssistantType, setSelectedAssistantType] = useState<string>("general");
  const [customName, setCustomName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // tRPC queries
  const { data: myAssistant, refetch: refetchAssistant } = trpc.employeeAiAssistant.getMyAssistant.useQuery(
    undefined,
    { enabled: !!user && (activeTab as string) === "employee" }
  );
  
  const { data: mySessions } = trpc.employeeAiAssistant.getMySessions.useQuery(
    { limit: 10 },
    { enabled: !!user && (activeTab as string) === "employee" && !!myAssistant }
  );

  const { data: skillMap } = trpc.employeeAiAssistant.getSkillMap.useQuery(
    undefined,
    { enabled: !!user && (activeTab as string) === "employee" }
  );

  const { data: careerPaths } = trpc.employeeAiAssistant.getCareerPaths.useQuery(
    undefined,
    { enabled: !!user && (activeTab as string) === "employee" }
  );

  // tRPC mutations
  const initializeAssistant = trpc.employeeAiAssistant.initialize.useMutation({
    onSuccess: () => {
      toast.success("AI助手初始化成功！");
      refetchAssistant();
      setShowSetupDialog(false);
    },
    onError: (error) => {
      toast.error(`初始化失败: ${error.message}`);
    },
  });

  const getOrCreateSession = trpc.employeeAiAssistant.getOrCreateSession.useMutation();
  
  const sendMessageMutation = trpc.employeeAiAssistant.sendMessage.useMutation({
    onSuccess: (data) => {
      if (data.success && data.response) {
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error(`发送失败: ${error.message}`);
      setIsLoading(false);
    },
  });

  // AI Chat mutation for Solution/Quotation/Planning/KPI assistants
  const aiChatMutation = trpc.aiChat.sendMessage.useMutation({
    onSuccess: (data: any) => {
      if (data.success && data.response) {
        const responseContent = typeof data.response === 'string'
          ? data.response
          : JSON.stringify(data.response);
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else if (!data.success) {
        toast.error(data.error || "AI响应失败");
      }
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error(`AI服务错误: ${error.message}`);
      setIsLoading(false);
    },
  });

  // Get quick prompts for current assistant
  const { data: quickPrompts } = (trpc.aiChat.getQuickPrompts as any).useQuery(
    { assistantType: activeTab as "solution" | "quotation" | "planning" | "kpi" },
    { enabled: (activeTab as string) !== "employee" }
  );

  // Chat history queries and mutations
  const { data: chatSessions, refetch: refetchSessions } = (trpc.chatHistory.getSessions as any).useQuery(
    { assistantType: activeTab as "solution" | "quotation" | "planning" | "kpi" | "personal", limit: 20 },
    { enabled: !!user && (activeTab as string) !== "employee" }
  );

  const { data: chatStats } = trpc.chatHistory.getStats.useQuery(
    undefined,
    { enabled: !!user }
  );

  const createSessionMutation = trpc.chatHistory.createSession.useMutation({
    onSuccess: (data: any) => {
      setCurrentSessionId(data.id);
      refetchSessions();
    },
  });

  const addMessageMutation = trpc.chatHistory.addMessage.useMutation();

  const { data: sessionMessages, refetch: refetchMessages } = trpc.chatHistory.getMessages.useQuery(
    { sessionId: currentSessionId ?? 0, limit: 100 },
    { enabled: !!currentSessionId }
  );

  // Load session messages when session changes
  useEffect(() => {
    if (sessionMessages && sessionMessages.length > 0) {
      const loadedMessages: ChatMessage[] = sessionMessages.map((m: { id: number; role: string; content: string; createdAt: Date }) => ({
        id: m.id.toString(),
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        timestamp: new Date(m.createdAt),
      }));
      setMessages(loadedMessages);
    }
  }, [sessionMessages]);

  // Create new session when switching tabs
  const handleNewSession = async () => {
    const assistantType = activeTab as "solution" | "quotation" | "planning" | "kpi";
    const session = await createSessionMutation.mutateAsync({
      assistantType: assistantType,
      title: `${ASSISTANT_CONFIGS.find(c => c.id === activeTab)?.nameCn || "AI助手"} - ${new Date().toLocaleDateString()}`,
    });
    setMessages([]);
    return { sessionId: (session as any).id };
  };

  // Load existing session
  const handleLoadSession = async (sessionId: number) => {
    setCurrentSessionId(sessionId);
    setShowHistoryDialog(false);
    refetchMessages();
  };

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    if ((activeTab as string) === "employee" && myAssistant) {
      try {
        const session = await getOrCreateSession.mutateAsync({ title: "New Chat" } as any);
        await sendMessageMutation.mutateAsync({
          sessionId: session.sessionId,
          message: messageContent,
        });
      } catch (error) {
        setIsLoading(false);
      }
    } else if ((activeTab as string) !== "employee") {
      // 确保有会话，如果没有则创建新会话
      let sessionId = currentSessionId;
      if (!sessionId) {
        try {
          const session = await handleNewSession();
          sessionId = session?.sessionId ?? null;
          if (sessionId) setCurrentSessionId(sessionId);
        } catch (error) {
          console.error("Failed to create session:", error);
        }
      }

      // 保存用户消息到数据库
      if (sessionId) {
        try {
          await addMessageMutation.mutateAsync({
            sessionId,
            role: "user",
            content: messageContent,
          });
        } catch (error) {
          console.error("Failed to save user message:", error);
        }
      }

      // 使用真实LLM API
      const previousMessages = messages.slice(-10).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));
      
      aiChatMutation.mutate({
        assistantType: activeTab as "solution" | "quotation" | "planning" | "kpi",
        message: messageContent,
        context: {
          previousMessages
        }
      }, {
        onSuccess: async (data: any) => {
          // 保存AI响应到数据库
          if (sessionId && data.success && data.response) {
            const responseContent = typeof data.response === 'string'
              ? data.response
              : JSON.stringify(data.response);
            try {
              await addMessageMutation.mutateAsync({
                sessionId,
                role: "assistant",
                content: responseContent,
              });
            } catch (error) {
              console.error("Failed to save assistant message:", error);
            }
          }
        }
      });
    }
  };

  // 模拟响应
  const getSimulatedResponse = (type: AssistantType, query: string): string => {
    const responses: Record<AssistantType, string> = {
      solution: `基于您的需求"${query}"，我分析了以下几个方面：\n\n**技术可行性**：该方案在技术上完全可行，建议采用模块化设计。\n\n**推荐方案**：\n1. 采用微服务架构\n2. 使用容器化部署\n3. 实施CI/CD流程\n\n**风险评估**：整体风险可控，主要关注点在于数据迁移阶段。`,
      quotation: `根据您的询价"${query}"，我为您生成了以下报价分析：\n\n**成本构成**：\n- 硬件成本：约占35%\n- 软件成本：约占25%\n- 人工成本：约占30%\n- 其他费用：约占10%\n\n**建议报价区间**：基于历史数据和市场分析，建议报价在标准价格的95%-105%之间。`,
      planning: `针对您的规划需求"${query}"，我制定了以下计划：\n\n**阶段划分**：\n1. 需求确认阶段（2周）\n2. 设计阶段（3周）\n3. 开发阶段（6周）\n4. 测试阶段（2周）\n5. 部署上线（1周）\n\n**关键里程碑**：设计评审、代码冻结、UAT测试、正式上线`,
      kpi: `关于您的KPI查询"${query}"，分析结果如下：\n\n**当前表现**：\n- 完成率：87%\n- 同比增长：12%\n- 环比变化：+5%\n\n**改进建议**：\n1. 优化流程效率\n2. 加强团队协作\n3. 提升客户满意度`,
      employee: `您好！我是您的个人AI助手。关于"${query}"，我可以为您提供以下帮助...`,
    };
    return responses[type];
  };

  // 初始化助手
  const handleInitializeAssistant = () => {
    initializeAssistant.mutate({
      templateType: selectedAssistantType,
      customName: customName || undefined,
    } as any);
  };

  // 渲染助手卡片
  const renderAssistantCard = (config: AssistantConfig) => {
    const Icon = config.icon;
    const isActive = activeTab === config.id;
    
    return (
      <Card
        key={config.id}
        className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
          isActive ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
        }`}
        onClick={() => {
          setActiveTab(config.id);
          setMessages([]);
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">{config.nameCn}</CardTitle>
              <CardDescription className="text-xs">{config.name}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{config.description}</p>
          <div className="flex flex-wrap gap-1">
            {config.features.map((feature, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染聊天界面
  const renderChatInterface = () => {
    // 如果是员工助手标签页，使用PersonalAssistantChat组件
    if ((activeTab as string) === "employee") {
      return <PersonalAssistantChat />;
    }

    const activeConfig = ASSISTANT_CONFIGS.find(c => c.id === activeTab);
    if (!activeConfig) return null;

    const Icon = activeConfig.icon;

    return (
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${activeConfig.color}`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>{activeConfig.nameCn}</CardTitle>
                <CardDescription>{activeConfig.description}</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {(activeTab as string) !== "employee" && (
                <Button variant="outline" size="sm" onClick={() => setShowHistoryDialog(true)}>
                  <History className="w-4 h-4 mr-1" />
                  历史
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => {
                setMessages([]);
                setCurrentSessionId(null);
              }}>
                <RefreshCw className="w-4 h-4 mr-1" />
                新对话
              </Button>
              {(activeTab as string) === "employee" && !myAssistant && (
                <Button size="sm" onClick={() => setShowSetupDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  初始化助手
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <Bot className="w-16 h-16 mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">开始对话</h3>
              <p className="text-sm max-w-md">
                {(activeTab as string) === "employee" && !myAssistant
                  ? "请先初始化您的个人AI助手"
                  : `向${activeConfig.nameCn}提问，获取专业建议`}
              </p>
              {(activeTab as string) !== "employee" && (
                <div className="mt-6 grid grid-cols-2 gap-2">
                  {activeConfig.features.map((feature, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setInputMessage(`请帮我分析${feature}相关的问题`)}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      {feature}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Streamdown>{msg.content}</Streamdown>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="animate-pulse flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-sm text-muted-foreground">正在思考...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder={(activeTab as string) === "employee" && !myAssistant ? "请先初始化助手..." : "输入您的问题..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={isLoading || ((activeTab as string) === "employee" && !myAssistant)}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading || ((activeTab as string) === "employee" && !myAssistant)}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // 渲染员工助手详情面板
  const renderEmployeeAssistantPanel = () => {
    if ((activeTab as string) !== "employee") return null;

    return (
      <div className="space-y-4">
        {/* 助手状态卡片 */}
        {myAssistant ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{myAssistant.assistantName}</CardTitle>
                    <CardDescription>
                      类型: {myAssistant.assistantType} | 状态: {myAssistant.status}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={myAssistant.status === "active" ? "default" : "secondary"}>
                  {myAssistant.status === "active" ? "活跃" : "暂停"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">助手编码</p>
                  <p className="font-mono">{myAssistant.assistantCode}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">最后活跃</p>
                  <p>{myAssistant.lastActiveAt ? new Date(myAssistant.lastActiveAt).toLocaleString() : "从未"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">尚未初始化个人助手</h3>
              <p className="text-sm text-muted-foreground mb-4">
                创建您的专属AI助手，它将学习您的工作习惯并提供个性化帮助
              </p>
              <Button onClick={() => setShowSetupDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                初始化我的助手
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 技能图谱 */}
        {skillMap && (skillMap as any).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                技能图谱
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(skillMap as any).slice(0, 5).map((skill: any) => (
                  <div key={skill.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{skill.skillName}</span>
                      <span className="text-muted-foreground">
                        Lv.{skill.currentLevel} / {skill.targetLevel || 10}
                      </span>
                    </div>
                    <Progress value={((skill.currentLevel || 0) / (skill.targetLevel || 10)) * 100} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 职业发展路径 */}
        {careerPaths && careerPaths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                职业发展路径
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {careerPaths.map((path) => (
                  <div key={path.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{path.currentRole}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-primary">{path.targetRole}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {path.pathType === "vertical" ? "纵向晋升" : path.pathType === "horizontal" ? "横向发展" : "跨职能"}
                        </Badge>
                        <span>进度: {path.progressPercentage}%</span>
                      </div>
                    </div>
                    <Progress value={path.progressPercentage} className="w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 最近会话 */}
        {mySessions && mySessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                最近会话
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mySessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{session.title || "无标题会话"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {session.messageCount} 条消息
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-7 h-7 text-primary" />
              AI 助手中心
            </h1>
            <p className="text-muted-foreground mt-1">
              智能助手为您提供专业的业务支持和个性化服务
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <BookOpen className="w-4 h-4 mr-2" />
              使用指南
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              设置
            </Button>
          </div>
        </div>

        {/* 助手选择卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {ASSISTANT_CONFIGS.map(renderAssistantCard)}
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 聊天界面 */}
          <div className="lg:col-span-2">
            {renderChatInterface()}
          </div>

          {/* 侧边栏 */}
          <div className="space-y-4">
            {(activeTab as string) === "employee" ? (
              renderEmployeeAssistantPanel()
            ) : (
              <>
                {/* 快捷操作 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      快捷操作
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {activeTab === "solution" && (
                      <>
                        <Button variant="outline" className="w-full justify-start" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          生成方案文档
                        </Button>
                        <Button variant="outline" className="w-full justify-start" size="sm">
                          <Target className="w-4 h-4 mr-2" />
                          需求分析报告
                        </Button>
                      </>
                    )}
                    {activeTab === "quotation" && (
                      <>
                        <Button variant="outline" className="w-full justify-start" size="sm">
                          <Calculator className="w-4 h-4 mr-2" />
                          快速报价
                        </Button>
                        <Button variant="outline" className="w-full justify-start" size="sm">
                          <TrendingUp className="w-4 h-4 mr-2" />
                          利润分析
                        </Button>
                      </>
                    )}
                    {activeTab === "planning" && (
                      <>
                        <Button variant="outline" className="w-full justify-start" size="sm">
                          <Calendar className="w-4 h-4 mr-2" />
                          创建项目计划
                        </Button>
                        <Button variant="outline" className="w-full justify-start" size="sm">
                          <Target className="w-4 h-4 mr-2" />
                          设置里程碑
                        </Button>
                      </>
                    )}
                    {activeTab === "kpi" && (
                      <>
                        <Button variant="outline" className="w-full justify-start" size="sm">
                          <ChartBar className="w-4 h-4 mr-2" />
                          生成KPI报告
                        </Button>
                        <Button variant="outline" className="w-full justify-start" size="sm">
                          <TrendingUp className="w-4 h-4 mr-2" />
                          趋势分析
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* 使用统计 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ChartBar className="w-4 h-4" />
                      使用统计
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">128</p>
                        <p className="text-xs text-muted-foreground">本月对话</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-500">94%</p>
                        <p className="text-xs text-muted-foreground">满意度</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-500">45</p>
                        <p className="text-xs text-muted-foreground">方案生成</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-500">12h</p>
                        <p className="text-xs text-muted-foreground">节省时间</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 最近活动 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      最近活动
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { action: "生成了项目报价", time: "10分钟前", icon: Calculator },
                        { action: "分析了客户需求", time: "1小时前", icon: Lightbulb },
                        { action: "更新了KPI指标", time: "3小时前", icon: ChartBar },
                      ].map((activity, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                          <activity.icon className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p>{activity.action}</p>
                            <p className="text-xs text-muted-foreground">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 初始化助手对话框 */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>初始化个人AI助手</DialogTitle>
            <DialogDescription>
              选择助手类型并设置个性化配置，助手将根据您的工作习惯持续学习
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>助手类型</Label>
              <Select value={selectedAssistantType} onValueChange={setSelectedAssistantType}>
                <SelectTrigger>
                  <SelectValue placeholder="选择助手类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">通用助手</SelectItem>
                  <SelectItem value="sales">销售助手</SelectItem>
                  <SelectItem value="tech">技术助手</SelectItem>
                  <SelectItem value="pm">项目管理助手</SelectItem>
                  <SelectItem value="hr">人力资源助手</SelectItem>
                  <SelectItem value="finance">财务助手</SelectItem>
                  <SelectItem value="production">生产管理助手</SelectItem>
                  <SelectItem value="engineering">工程助手</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>自定义名称（可选）</Label>
              <Input
                placeholder="例如：小智"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
              取消
            </Button>
            <Button onClick={handleInitializeAssistant} disabled={initializeAssistant.isPending}>
              {initializeAssistant.isPending ? "初始化中..." : "确认初始化"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 历史对话对话框 */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              历史对话
            </DialogTitle>
            <DialogDescription>
              查看和继续之前的对话记录
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {chatSessions && chatSessions.length > 0 ? (
              <div className="space-y-2">
                {chatSessions.map((session: { id: number; title: string | null; assistantType: string; createdAt: Date; status: string }) => (
                  <Card
                    key={session.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                      currentSessionId === session.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => handleLoadSession(session.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">
                              {session.title || `对话 #${session.id}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(session.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {session.assistantType}
                          </Badge>
                          {session.status === "active" && (
                            <Badge variant="default" className="text-xs">
                              活跃
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无历史对话</p>
                <p className="text-sm">开始一段新对话后，记录将自动保存</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              关闭
            </Button>
            <Button onClick={() => {
              handleNewSession();
              setShowHistoryDialog(false);
            }}>
              <Plus className="w-4 h-4 mr-1" />
              新建对话
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
