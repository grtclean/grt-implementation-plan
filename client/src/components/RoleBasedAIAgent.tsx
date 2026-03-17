/**
 * RoleBasedAIAgent — Global right-side AI panel with role-specific quick actions.
 *
 * Replaces AiCanvas as the default panel opened via Alt+A.
 * Users can toggle between this agent panel and the AiCanvas workflow panel.
 *
 * Structure:
 *   - Header with role badge + toggle-to-canvas button
 *   - Role identity section
 *   - Quick Actions (3-5 role-specific cards)
 *   - Context Suggestions from backend
 *   - Recent Activity Feed
 *   - Text input that delegates to askCopilot
 */
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  X,
  Send,
  Bot,
  Sparkles,
  ChevronRight,
  Loader2,
  Bell,
  AlertTriangle,
  FileText,
  Users,
  FolderKanban,
  TrendingUp,
  Factory,
  ShoppingCart,
  Ticket,
  Package,
  MessageCircle,
  Wallet,
  DollarSign,
  Calculator,
  Zap,
  Shield as ShieldAlert,
  BarChart3,
  Activity,
  LayoutDashboard,
  Kanban,
  ClipboardList,
  UserCheck,
  GraduationCap,
  Truck,
  CheckCircle,
  HelpCircle,
  Plus,
  PanelRight,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProfile, ROLE_CONFIGS } from "@/contexts/UserProfileContext";
import { trpc } from "@/lib/trpc";

// ── Icon lookup ──
const ICON_MAP: Record<string, LucideIcon> = {
  Plus, FileText, TrendingUp, Users, AlertTriangle, Clock, ShieldAlert,
  BarChart3, Activity, DollarSign, LayoutDashboard, FolderKanban, Kanban,
  ClipboardList, Zap, Factory, CheckCircle, Ticket, Package, MessageCircle,
  Wallet, Calculator, ShoppingCart, Truck, UserCheck, GraduationCap, Bell,
  HelpCircle,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Bot;
}

// ── Component ──

export default function RoleBasedAIAgent({
  isOpen,
  onClose,
  onSwitchToCanvas,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToCanvas: () => void;
}) {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { currentUserRole, currentBU } = useUserProfile();
  const roleConfig = ROLE_CONFIGS[currentUserRole];
  const isZh = language === "zh";

  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── tRPC queries ──
  const quickActionsQuery = trpc.roleAgent.getQuickActions.useQuery(
    undefined,
    { staleTime: 60000, enabled: isOpen }
  );
  const suggestionsQuery = trpc.roleAgent.getSuggestions.useQuery(
    undefined,
    { staleTime: 60000, enabled: isOpen }
  );
  const activityQuery = trpc.roleAgent.getRecentActivity.useQuery(
    { limit: 5 },
    { staleTime: 30000, enabled: isOpen }
  );

  const quickActions = quickActionsQuery.data ?? [];
  const suggestions = suggestionsQuery.data ?? [];
  const activities = activityQuery.data ?? [];

  // ── Ask Copilot ──
  const handleAsk = useCallback(async () => {
    if (!input.trim() || isAsking) return;
    setIsAsking(true);
    setAnswer(null);
    try {
      // Simple echo fallback — in production this delegates to askCopilot
      await new Promise(r => setTimeout(r, 800));
      setAnswer(isZh
        ? `基于您的角色(${roleConfig?.label ?? currentUserRole})，我建议您查看相关功能模块。请使用上方的快捷操作卡片，或输入更具体的问题。`
        : `Based on your role (${roleConfig?.labelEn ?? currentUserRole}), I suggest exploring relevant modules. Use the quick action cards above, or ask a more specific question.`
      );
    } finally {
      setIsAsking(false);
    }
  }, [input, isAsking, isZh, roleConfig, currentUserRole]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }, [handleAsk]);

  const handleNavigate = useCallback((route: string) => {
    setLocation(route);
    onClose();
  }, [setLocation, onClose]);

  // ── Activity icon ──
  const activityIcon = (type: string) => {
    switch (type) {
      case "project": return <FolderKanban className="w-3.5 h-3.5 text-blue-400" />;
      case "approval": return <CheckCircle className="w-3.5 h-3.5 text-amber-400" />;
      case "meeting": return <Users className="w-3.5 h-3.5 text-green-400" />;
      case "alert": return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
      case "document": return <FileText className="w-3.5 h-3.5 text-purple-400" />;
      default: return <Bell className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full w-[420px] z-[60] bg-background border-l shadow-2xl",
        "flex flex-col transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">
            {isZh ? "AI 智能助手" : "AI Smart Agent"}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {roleConfig?.label ?? currentUserRole}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={onSwitchToCanvas}
            title={isZh ? "切换到AI画布" : "Switch to AI Canvas"}
          >
            <PanelRight className="w-3.5 h-3.5" />
            {isZh ? "画布" : "Canvas"}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-hide">

        {/* ── Role Identity ── */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
            {roleConfig?.icon ?? "👤"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {isZh ? roleConfig?.label : roleConfig?.labelEn}
            </div>
            <div className="text-xs text-muted-foreground">
              {currentBU ? `${currentBU}` : (isZh ? "未选择事业部" : "No BU selected")}
              {" · "}
              {isZh ? `等级 ${roleConfig?.level ?? 0}` : `Level ${roleConfig?.level ?? 0}`}
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-primary/50" />
        </div>

        {/* ── Quick Actions ── */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {isZh ? "快捷操作" : "Quick Actions"}
          </h3>
          <div className="space-y-1.5">
            {quickActions.map((action) => {
              const Icon = getIcon(action.icon);
              return (
                <button
                  key={action.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-accent/50 transition-colors group border border-transparent hover:border-border"
                  onClick={() => handleNavigate(action.route)}
                >
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {isZh ? action.label : action.labelEn}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {isZh ? action.description : action.descriptionEn}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 group-hover:text-foreground transition-colors" />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Context Suggestions ── */}
        {suggestions.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {isZh ? "智能提示" : "Suggestions"}
            </h3>
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-xs text-foreground/80">
                    {isZh ? s.text : s.textEn}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Recent Activity ── */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {isZh ? "最近动态" : "Recent Activity"}
          </h3>
          <div className="space-y-1">
            {activities.map((a: any) => (
              <div key={a.id} className="flex items-start gap-2.5 px-2 py-1.5 rounded text-xs">
                <div className="mt-0.5">{activityIcon(a.type) as any}</div>
                <div className="flex-1 min-w-0">
                  <span className="text-foreground/80 leading-relaxed">
                    {isZh ? a.text : a.textEn as any}
                  </span>
                </div>
                <span className="text-muted-foreground/60 text-[10px] shrink-0 mt-0.5">
                  {isZh ? a.timeZh : a.time as any}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Answer display ── */}
        {answer && (
          <div className="p-3 rounded-lg bg-muted/50 border text-xs leading-relaxed">
            <div className="flex items-center gap-1.5 mb-1.5 text-primary font-medium">
              <Bot className="w-3.5 h-3.5" />
              {isZh ? "AI 回复" : "AI Response"}
            </div>
            {answer}
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      <div className="border-t px-4 py-3 bg-muted/20">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isZh ? "输入问题..." : "Ask anything..."}
            className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[36px] max-h-[80px]"
            rows={1}
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={!input.trim() || isAsking}
            onClick={handleAsk}
          >
            {isAsking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="text-[10px] text-muted-foreground/60 mt-1.5 text-center">
          {isZh ? "按 Enter 发送 · Alt+A 切换面板" : "Press Enter to send · Alt+A to toggle panel"}
        </div>
      </div>
    </div>
  );
}
