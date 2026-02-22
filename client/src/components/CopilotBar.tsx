/**
 * CopilotBar — Unified AI Help Panel
 *
 * Microsoft Office "Tell me what you want to do" pattern:
 * - Fixed bottom-right floating button (Ctrl+/)
 * - Slide-up panel with 3-tier search + multi-turn conversation
 * - Context-aware quick actions based on current route
 * - Feedback (thumbs up/down) per AI response
 */
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  useCopilot,
  type MenuMatch,
  type HelpMatch,
  type ConversationMessage,
} from "@/hooks/useCopilot";
import {
  MessageSquare,
  Search,
  X,
  ArrowRight,
  FileText,
  BookOpen,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Send,
  History,
  ChevronRight,
  Loader2,
  Bot,
  HelpCircle,
  Newspaper,
  RotateCcw,
  Keyboard,
} from "lucide-react";

// ── Quick Actions by route prefix ──

const ROUTE_QUICK_ACTIONS: Record<string, { label: string; query: string }[]> = {
  "/projects": [
    { label: "创建新项目", query: "如何创建新项目？" },
    { label: "阶段门审批", query: "项目阶段门审批流程是什么？" },
    { label: "项目看板", query: "如何使用项目看板视图？" },
  ],
  "/fmea": [
    { label: "创建FMEA", query: "如何创建新的FMEA分析？" },
    { label: "风险优先级", query: "FMEA风险优先级(AP)如何计算？" },
    { label: "关联控制计划", query: "如何将FMEA关联到控制计划？" },
  ],
  "/production": [
    { label: "工单管理", query: "如何创建和管理生产工单？" },
    { label: "工序步骤", query: "T1-T15工序步骤说明" },
    { label: "设备状态", query: "如何查看设备利用率？" },
  ],
  "/crm": [
    { label: "客户管理", query: "如何管理客户信息？" },
    { label: "线索跟进", query: "销售线索自动跟进规则" },
    { label: "商机分析", query: "如何使用商机分析功能？" },
  ],
  "/oa": [
    { label: "请假申请", query: "如何提交请假申请？" },
    { label: "审批流程", query: "OA审批流程怎么操作？" },
    { label: "用车申请", query: "用车申请步骤" },
  ],
  "/": [
    { label: "快速入门", query: "GRT系统快速入门指南" },
    { label: "切换事业部", query: "如何切换事业部上下文？" },
    { label: "全局搜索", query: "全局搜索(Ctrl+K)怎么用？" },
  ],
};

function getQuickActions(route: string) {
  for (const prefix of Object.keys(ROUTE_QUICK_ACTIONS)) {
    if (prefix !== "/" && route.startsWith(prefix)) {
      return ROUTE_QUICK_ACTIONS[prefix];
    }
  }
  return ROUTE_QUICK_ACTIONS["/"];
}

// ── Sub-components ──

function MenuMatchCard({ match, onClick }: { match: MenuMatch; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors text-left group"
    >
      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <ArrowRight className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{match.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {match.groupName} &middot; {match.path}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function HelpMatchCard({ match }: { match: HelpMatch }) {
  const categoryColors: Record<string, string> = {
    GETTING_STARTED: "bg-green-500/10 text-green-600",
    FEATURE_GUIDE: "bg-blue-500/10 text-blue-600",
    FAQ: "bg-amber-500/10 text-amber-600",
    TROUBLESHOOTING: "bg-red-500/10 text-red-600",
    BEST_PRACTICE: "bg-purple-500/10 text-purple-600",
    CHANGELOG: "bg-cyan-500/10 text-cyan-600",
    WALKTHROUGH: "bg-orange-500/10 text-orange-600",
  };

  return (
    <div className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <FileText className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{match.titleZh}</p>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 shrink-0", categoryColors[match.category])}>
            {match.category.replace("_", " ")}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">{match.title}</p>
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  onFeedback,
}: {
  message: ConversationMessage;
  onFeedback?: (isPositive: boolean) => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <p className="text-[10px] font-medium opacity-70 mb-1">参考来源:</p>
            <div className="flex flex-wrap gap-1">
              {message.sources.map((s, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1 py-0 h-4">
                  {s.type === "help" ? "📄" : "📚"} {s.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {/* Feedback */}
        {!isUser && onFeedback && (
          <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-border/20">
            <span className="text-[10px] opacity-50 mr-1">有帮助吗？</span>
            <button
              onClick={() => onFeedback(true)}
              className="p-0.5 rounded hover:bg-background/50 transition-colors"
            >
              <ThumbsUp className="w-3 h-3 opacity-50 hover:opacity-100" />
            </button>
            <button
              onClick={() => onFeedback(false)}
              className="p-0.5 rounded hover:bg-background/50 transition-colors"
            >
              <ThumbsDown className="w-3 h-3 opacity-50 hover:opacity-100" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──

export default function CopilotBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [location, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    query,
    menuMatches,
    helpMatches,
    conversation,
    isAskingAI,
    setQuery,
    askAI,
    sendFeedback,
    clearConversation,
  } = useCopilot();

  // Changelog query
  const { data: changelog } = trpc.help.getChangelog.useQuery(
    { limit: 3 },
    { enabled: isOpen }
  );

  // Keyboard shortcut: Ctrl+/
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Auto-focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-scroll conversation
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      askAI();
    }
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleQuickAction = (q: string) => {
    setQuery(q);
    askAI(q);
  };

  const quickActions = getQuickActions(location);
  const hasResults = menuMatches.length > 0 || helpMatches.length > 0;
  const hasConversation = conversation.length > 0;

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg",
          "bg-primary text-primary-foreground",
          "flex items-center justify-center",
          "hover:scale-105 active:scale-95 transition-transform",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isOpen && "hidden"
        )}
        title="GRT Copilot (Ctrl+/)"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[440px] max-h-[70vh] rounded-xl shadow-2xl border",
          "bg-background/95 backdrop-blur-md",
          "flex flex-col",
          "transition-all duration-300 ease-out origin-bottom-right",
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">GRT 智能助手</h3>
              <p className="text-[10px] text-muted-foreground">Copilot v2.0</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {hasConversation && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={clearConversation}
                title="新对话"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="px-4 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="告诉我你想做什么..."
              className="pl-9 pr-9 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1"
            />
            {query ? (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-primary" />
              </button>
            ) : (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <kbd className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground font-mono">
                  Ctrl /
                </kbd>
              </div>
            )}
          </div>
        </form>

        {/* Content area */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-3 space-y-3" ref={scrollRef}>
            {/* Conversation history */}
            {hasConversation && (
              <div className="space-y-3">
                {conversation.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    onFeedback={
                      msg.role === "assistant"
                        ? (isPositive) => sendFeedback(msg.id, isPositive)
                        : undefined
                    }
                  />
                ))}
                {isAskingAI && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <p className="text-sm text-muted-foreground">思考中...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search results */}
            {!hasConversation && query && hasResults && (
              <>
                {menuMatches.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      导航
                    </p>
                    <div className="space-y-0.5">
                      {menuMatches.map((m, i) => (
                        <MenuMatchCard
                          key={`${m.groupName}-${m.path}-${i}`}
                          match={m}
                          onClick={() => handleMenuClick(m.path)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {helpMatches.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      帮助文档
                    </p>
                    <div className="space-y-0.5">
                      {helpMatches.map((m) => (
                        <HelpMatchCard key={m.id} match={m} />
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground text-center pt-1">
                  按 <kbd className="px-1 py-0.5 rounded border bg-muted font-mono text-[9px]">Enter</kbd> 向AI提问
                </p>
              </>
            )}

            {/* Empty state: Quick actions */}
            {!hasConversation && !query && (
              <>
                {/* Quick actions */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    快速操作
                  </p>
                  <div className="space-y-1">
                    {quickActions.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => handleQuickAction(action.query)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors text-left"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                        <span className="text-sm">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* What's new */}
                {changelog && changelog.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        最新更新
                      </p>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                        NEW
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {changelog.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <Newspaper className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{entry.titleZh}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {entry.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleQuickAction("GRT系统有哪些功能？")}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3" />
              全部帮助
            </button>
            <button
              onClick={() => handleQuickAction("操作指南")}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3" />
              操作指南
            </button>
            <button
              onClick={() => handleQuickAction("版本更新内容")}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <History className="w-3 h-3" />
              版本日志
            </button>
          </div>
          <div className="flex items-center gap-1 opacity-60">
            <Keyboard className="w-3 h-3" />
            Ctrl+/
          </div>
        </div>
      </div>
    </>
  );
}
