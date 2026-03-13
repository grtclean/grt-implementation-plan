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
import { useLanguage } from "@/contexts/LanguageContext";
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

// ── Quick Actions by route prefix (i18n key-based) ──

type QuickActionDef = { labelKey: string; queryKey: string };
const ROUTE_QUICK_ACTION_KEYS: Record<string, QuickActionDef[]> = {
  "/projects": [
    { labelKey: "copilot.qa.projects.create", queryKey: "copilot.qa.projects.createQ" },
    { labelKey: "copilot.qa.projects.gate", queryKey: "copilot.qa.projects.gateQ" },
    { labelKey: "copilot.qa.projects.board", queryKey: "copilot.qa.projects.boardQ" },
  ],
  "/fmea": [
    { labelKey: "copilot.qa.fmea.create", queryKey: "copilot.qa.fmea.createQ" },
    { labelKey: "copilot.qa.fmea.priority", queryKey: "copilot.qa.fmea.priorityQ" },
    { labelKey: "copilot.qa.fmea.link", queryKey: "copilot.qa.fmea.linkQ" },
  ],
  "/production": [
    { labelKey: "copilot.qa.production.workorder", queryKey: "copilot.qa.production.workorderQ" },
    { labelKey: "copilot.qa.production.steps", queryKey: "copilot.qa.production.stepsQ" },
    { labelKey: "copilot.qa.production.equipment", queryKey: "copilot.qa.production.equipmentQ" },
  ],
  "/crm": [
    { labelKey: "copilot.qa.crm.customers", queryKey: "copilot.qa.crm.customersQ" },
    { labelKey: "copilot.qa.crm.leads", queryKey: "copilot.qa.crm.leadsQ" },
    { labelKey: "copilot.qa.crm.opportunity", queryKey: "copilot.qa.crm.opportunityQ" },
  ],
  "/oa": [
    { labelKey: "copilot.qa.oa.leave", queryKey: "copilot.qa.oa.leaveQ" },
    { labelKey: "copilot.qa.oa.approval", queryKey: "copilot.qa.oa.approvalQ" },
    { labelKey: "copilot.qa.oa.vehicle", queryKey: "copilot.qa.oa.vehicleQ" },
  ],
  "/": [
    { labelKey: "copilot.qa.default.start", queryKey: "copilot.qa.default.startQ" },
    { labelKey: "copilot.qa.default.bu", queryKey: "copilot.qa.default.buQ" },
    { labelKey: "copilot.qa.default.search", queryKey: "copilot.qa.default.searchQ" },
  ],
};

function getQuickActionKeys(route: string): QuickActionDef[] {
  for (const prefix of Object.keys(ROUTE_QUICK_ACTION_KEYS)) {
    if (prefix !== "/" && route.startsWith(prefix)) {
      return ROUTE_QUICK_ACTION_KEYS[prefix];
    }
  }
  return ROUTE_QUICK_ACTION_KEYS["/"];
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
  t,
}: {
  message: ConversationMessage;
  onFeedback?: (isPositive: boolean) => void;
  t: (key: string) => string;
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
            <p className="text-[10px] font-medium opacity-70 mb-1">{t("copilot.sources")}:</p>
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
            <span className="text-[10px] opacity-50 mr-1">{t("copilot.feedback.helpful")}</span>
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
  const { t } = useLanguage();
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
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
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

  const quickActionKeys = getQuickActionKeys(location);
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
              <h3 className="text-sm font-semibold">{t("copilot.title")}</h3>
              <p className="text-[10px] text-muted-foreground">{t("copilot.version")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {hasConversation && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={clearConversation}
                title={t("copilot.newConversation")}
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
              placeholder={t("copilot.placeholder")}
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
                    t={t}
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
                      <p className="text-sm text-muted-foreground">{t("copilot.thinking")}</p>
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
                      {t("copilot.nav")}
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
                      {t("copilot.helpDocs")}
                    </p>
                    <div className="space-y-0.5">
                      {helpMatches.map((m) => (
                        <HelpMatchCard key={m.id} match={m} />
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground text-center pt-1">
                  {t("copilot.pressEnter")}
                </p>
              </>
            )}

            {/* Empty state: Quick actions */}
            {!hasConversation && !query && (
              <>
                {/* Quick actions */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {t("copilot.quickActions")}
                  </p>
                  <div className="space-y-1">
                    {quickActionKeys.map((action) => (
                      <button
                        key={action.labelKey}
                        onClick={() => handleQuickAction(t(action.queryKey))}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors text-left"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                        <span className="text-sm">{t(action.labelKey)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* What's new */}
                {changelog && changelog.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("copilot.whatsNew")}
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
              onClick={() => handleQuickAction(t("copilot.footer.allHelpQuery"))}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3" />
              {t("copilot.footer.allHelp")}
            </button>
            <button
              onClick={() => handleQuickAction(t("copilot.footer.guideQuery"))}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3" />
              {t("copilot.footer.guide")}
            </button>
            <button
              onClick={() => handleQuickAction(t("copilot.footer.changelogQuery"))}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <History className="w-3 h-3" />
              {t("copilot.footer.changelog")}
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
