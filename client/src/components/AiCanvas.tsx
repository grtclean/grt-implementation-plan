/**
 * AiCanvas — Enterprise OS "AI Draft & Action Panel"
 *
 * The text input box is NOT just for notes — it automatically detects business
 * intent as you type and converts notes into actionable workflows.
 *
 * Features:
 *   - **Live Intent Bar**: Debounced quickParse shows detected intent below
 *     the textarea in real-time as the user types (1.2s debounce)
 *   - **Smart Flow mode**: Auto-parse on typing stop; one-click workflow creation
 *   - **Full Workflow Parse**: Ctrl+Enter or Send for detailed multi-suggestion results
 *   - Structured Action Cards showing template, entities, workflow steps
 *   - "Apply Workflow" button that creates tasks and routes to modules
 *   - Quick template picker for explicit template selection
 *   - Slide-in/slide-out animation (DOM always mounted)
 *
 * Keyboard shortcut: Alt+A
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  X,
  Send,
  Sparkles,
  FileText,
  Users,
  FolderKanban,
  ClipboardCheck,
  Zap,
  ChevronRight,
  Loader2,
  ArrowRight,
  Bot,
  Lightbulb,
  CheckCircle2,
  Circle,
  MapPin,
  Calendar,
  Package,
  UserCheck,
  Play,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

// ── Quick-action templates ──

interface CanvasTemplate {
  id: string;
  label: string;
  labelEn: string;
  icon: typeof FileText;
  department: string;
  departmentEn: string;
  route?: string;
  prompt: string;
}

const TEMPLATES: CanvasTemplate[] = [
  {
    id: "meeting-note",
    label: "会议纪要",
    labelEn: "Meeting Minutes",
    icon: FileText,
    department: "协作",
    departmentEn: "Collaboration",
    route: "/meeting-hub",
    prompt: "请整理以下会议内容为正式纪要，包含决议事项、负责人和截止日期：",
  },
  {
    id: "project-brief",
    label: "项目立项",
    labelEn: "Project Brief",
    icon: FolderKanban,
    department: "项目管理",
    departmentEn: "Project Mgmt",
    route: "/projects",
    prompt: "请根据以下描述生成项目立项书草案（含目标、范围、里程碑）：",
  },
  {
    id: "quality-report",
    label: "8D报告",
    labelEn: "8D Report",
    icon: ClipboardCheck,
    department: "质量",
    departmentEn: "Quality",
    route: "/8d-capa",
    prompt: "请根据以下问题描述生成8D报告草案：",
  },
  {
    id: "hr-request",
    label: "人事申请",
    labelEn: "HR Request",
    icon: Users,
    department: "人力资源",
    departmentEn: "HR",
    route: "/hr-lifecycle",
    prompt: "请起草一份人事相关申请（请假/调岗/培训需求）：",
  },
  {
    id: "expense-claim",
    label: "费用报销",
    labelEn: "Expense Claim",
    icon: FileText,
    department: "财务",
    departmentEn: "Finance",
    route: "/expense-report",
    prompt: "请整理以下费用为报销单草案：",
  },
  {
    id: "workflow-trigger",
    label: "发起审批",
    labelEn: "Start Approval",
    icon: Zap,
    department: "Smart OA",
    departmentEn: "Smart OA",
    route: "/oa-forms",
    prompt: "请根据以下内容确定审批类型并生成审批表单草案：",
  },
];

// ── Category color mapping ──

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  travel: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  quality: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  hr: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  finance: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  project: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  procurement: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  production: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  approval: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  general: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

// ── Types ──

interface WorkflowSuggestion {
  rank: number;
  confidence: number;
  suggestedTemplate: string;
  linkedEntities: string[];
  proposedWorkflow: { step: number; label: string; approver: string }[];
  route: string;
  category: string;
  matchedKeywords: string[];
}

interface CanvasEntry {
  id: string;
  type: "ai-workflow" | "template-draft" | "applied";
  originalText: string;
  summary: string;
  suggestions: WorkflowSuggestion[];
  entities?: { locations: string[]; people: string[]; dates: string[]; materials: string[] };
  appliedResult?: {
    taskId: string;
    workflowId: string;
    message: string;
    nextAction: { label: string; route: string };
    workflow: { step: number; label: string; approver: string; status: string }[];
  };
}

interface LiveHint {
  detected: boolean;
  category: string | null;
  template: string | null;
  confidence: number;
  route: string | null;
  matchCount: number;
}

// ── Component ──

export default function AiCanvas({
  isOpen,
  onClose,
  onSwitchToAgent,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToAgent?: () => void;
}) {
  const { language } = useLanguage();
  const [location, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<CanvasEntry[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [smartMode, setSmartMode] = useState(() => {
    return localStorage.getItem("grt_canvas_smart") !== "false";
  });
  const [liveHint, setLiveHint] = useState<LiveHint | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const thinkingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const zh = language === "zh";

  // tRPC mutations
  const quickParseMutation = trpc.aiCanvas.quickParse.useMutation();
  const parseMutation = trpc.aiCanvas.parseWorkflow.useMutation();
  const applyMutation = trpc.aiCanvas.applyWorkflow.useMutation();

  // Auto-focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      const id = setTimeout(() => textareaRef.current?.focus(), 200);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Toggle smart mode
  const toggleSmartMode = useCallback(() => {
    setSmartMode((prev) => {
      const next = !prev;
      localStorage.setItem("grt_canvas_smart", String(next));
      if (!next) setLiveHint(null);
      return next;
    });
  }, []);

  // ── Live Intent Detection (debounced quickParse) ──
  const runQuickParse = useCallback(
    async (text: string) => {
      if (!smartMode || text.trim().length < 6) {
        setLiveHint(null);
        return;
      }
      setHintLoading(true);
      try {
        const result = await quickParseMutation.mutateAsync({
          text: text.trim(),
          language: zh ? "zh" : "en",
        });
        setLiveHint(result);
      } catch {
        setLiveHint(null);
      } finally {
        setHintLoading(false);
      }
    },
    [smartMode, zh, quickParseMutation]
  );

  // Auto-resize textarea + trigger debounced quickParse
  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
      // Debounced live hint
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (smartMode && value.trim().length >= 6) {
        debounceRef.current = setTimeout(() => runQuickParse(value), 1200);
      } else {
        setLiveHint(null);
      }
    },
    [smartMode, runQuickParse]
  );

  // ── One-click convert from live hint ──
  const handleQuickConvert = useCallback(async () => {
    if (!input.trim() || !liveHint?.detected) return;
    // Trigger full parse immediately
    setLiveHint(null);
    await handleFullParse(input.trim());
  }, [input, liveHint]);

  // Full parse function (extracted for reuse)
  const handleFullParse = useCallback(
    async (userInput: string) => {
      setIsThinking(true);
      setInput("");
      setSelectedTemplate(null);
      setLiveHint(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      try {
        const result = await parseMutation.mutateAsync({
          text: userInput,
          language: zh ? "zh" : "en",
          currentRoute: location,
        });

        const entry: CanvasEntry = {
          id: crypto.randomUUID(),
          type: "ai-workflow",
          originalText: userInput,
          summary: result.summary,
          suggestions: result.detected
            ? (result.suggestions as WorkflowSuggestion[])
            : [],
          entities: result.entities,
        };
        setEntries((prev) => [entry, ...prev]);
      } catch {
        const entry: CanvasEntry = {
          id: crypto.randomUUID(),
          type: "ai-workflow",
          originalText: userInput,
          summary: zh
            ? "AI 解析暂时不可用，请稍后重试。"
            : "AI parsing temporarily unavailable. Please try again.",
          suggestions: [],
        };
        setEntries((prev) => [entry, ...prev]);
      } finally {
        setIsThinking(false);
      }
    },
    [zh, location, parseMutation]
  );

  // Submit: parse via tRPC, with template fallback
  const handleSubmit = useCallback(async () => {
    if (!input.trim()) return;
    const userInput = input.trim();
    const tpl = selectedTemplate
      ? TEMPLATES.find((t) => t.id === selectedTemplate)
      : null;

    // If explicit template selected, create a template-draft entry directly
    if (tpl) {
      setIsThinking(true);
      setInput("");
      setSelectedTemplate(null);
      setLiveHint(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      thinkingTimer.current = setTimeout(() => {
        thinkingTimer.current = null;
        const entry: CanvasEntry = {
          id: crypto.randomUUID(),
          type: "template-draft",
          originalText: userInput,
          summary: `[${zh ? tpl.label : tpl.labelEn}]\n\n${tpl.prompt}\n\n---\n${userInput}\n\n---\n${zh ? "已根据模板生成草案，请修改后提交至" : "Draft generated from template. Submit to"} ${zh ? tpl.department : tpl.departmentEn}。`,
          suggestions: [
            {
              rank: 1,
              confidence: 100,
              suggestedTemplate: zh ? tpl.label : tpl.labelEn,
              linkedEntities: [zh ? tpl.department : tpl.departmentEn],
              proposedWorkflow: [],
              route: tpl.route ?? "/",
              category: "general",
              matchedKeywords: [],
            },
          ],
        };
        setEntries((prev) => [entry, ...prev]);
        setIsThinking(false);
      }, 400);
      return;
    }

    // Otherwise call the full AI workflow parser
    await handleFullParse(userInput);
  }, [input, selectedTemplate, zh, handleFullParse]);

  // Apply workflow: create task + route
  const handleApplyWorkflow = useCallback(
    async (entryId: string, suggestion: WorkflowSuggestion) => {
      try {
        const entry = entries.find((e) => e.id === entryId);
        if (!entry) return;

        const result = await applyMutation.mutateAsync({
          originalText: entry.originalText,
          templateName: suggestion.suggestedTemplate,
          route: suggestion.route,
          workflowSteps: suggestion.proposedWorkflow,
          linkedEntities: suggestion.linkedEntities,
          language: zh ? "zh" : "en",
        });

        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  type: "applied" as const,
                  appliedResult: {
                    taskId: result.taskId,
                    workflowId: result.workflowId,
                    message: result.message,
                    nextAction: result.nextAction,
                    workflow: result.workflow,
                  },
                }
              : e
          )
        );
      } catch {
        // ignore
      }
    },
    [entries, applyMutation, zh]
  );

  const handleNavigate = (route: string) => {
    setLocation(route);
    onClose();
  };

  // Derive live hint color
  const hintColor = liveHint?.category
    ? CATEGORY_COLORS[liveHint.category] ?? CATEGORY_COLORS.general
    : CATEGORY_COLORS.general;

  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-full w-[420px] max-w-[95vw] bg-white border-l border-[#edebe9] shadow-2xl z-[60] flex flex-col",
        "transform transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
      )}
      aria-hidden={!isOpen}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#edebe9] bg-gradient-to-r from-[#f0f4ff] to-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0078d4] flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#323130]">
              {zh ? "AI 画布" : "AI Canvas"}
            </h2>
            <p className="text-[10px] text-[#605e5c]">
              {zh
                ? "输入笔记，自动变成业务流"
                : "Type notes, auto-convert to business workflows"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Smart mode toggle */}
          <button
            onClick={toggleSmartMode}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
              smartMode
                ? "bg-[#0078d4]/10 text-[#0078d4]"
                : "text-[#a19f9d] hover:text-[#605e5c]"
            )}
            title={
              zh
                ? smartMode
                  ? "智能流模式已开启 — 输入自动识别业务意图"
                  : "点击开启智能流模式"
                : smartMode
                  ? "Smart Flow ON — auto-detects business intent"
                  : "Click to enable Smart Flow"
            }
          >
            {smartMode ? (
              <ToggleRight className="w-3.5 h-3.5" />
            ) : (
              <ToggleLeft className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {zh ? "智能流" : "Smart"}
            </span>
          </button>
          {onSwitchToAgent && (
            <button
              onClick={onSwitchToAgent}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-[#a19f9d] hover:text-[#605e5c] hover:bg-[#f3f2f1] transition-colors"
              title={zh ? "切换到AI助手" : "Switch to AI Agent"}
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{zh ? "助手" : "Agent"}</span>
            </button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#605e5c] hover:text-[#323130]"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Template Quick Picks */}
      <div className="px-4 py-2.5 border-b border-[#edebe9] bg-[#faf9f8]">
        <p className="text-[10px] font-medium text-[#605e5c] mb-1.5 uppercase tracking-wider">
          {zh ? "快捷模板（可选）" : "Quick Templates (Optional)"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((tpl) => {
            const TplIcon = tpl.icon;
            const isSelected = selectedTemplate === tpl.id;
            return (
              <button
                key={tpl.id}
                onClick={() =>
                  setSelectedTemplate(isSelected ? null : tpl.id)
                }
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all duration-150 border",
                  isSelected
                    ? "bg-[#0078d4] text-white border-[#0078d4]"
                    : "bg-white text-[#323130] border-[#edebe9] hover:border-[#0078d4] hover:text-[#0078d4]"
                )}
              >
                <TplIcon className="w-3 h-3" />
                <span>{zh ? tpl.label : tpl.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-b border-[#edebe9]">
        {selectedTemplate && (
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-[#0078d4]" />
            <span className="text-xs text-[#0078d4] font-medium">
              {zh ? "模板: " : "Template: "}
              {zh
                ? TEMPLATES.find((t) => t.id === selectedTemplate)?.label
                : TEMPLATES.find((t) => t.id === selectedTemplate)?.labelEn}
            </span>
          </div>
        )}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              zh
                ? smartMode
                  ? "输入任何内容，AI实时识别业务意图…\n例: 下周去底特律工厂检查新一批物料\n例: 客户投诉产品质量问题需要8D分析\n例: 申请培训预算5万元"
                  : "输入笔记、想法或工作计划…\nCtrl+Enter 让 AI 解析意图"
                : smartMode
                  ? "Type anything — AI detects business intent in real-time…\ne.g. Plan trip to Detroit plant to check material batch\ne.g. Customer complaint needs 8D analysis\ne.g. Request training budget $50K"
                  : "Type notes, ideas, or work plans…\nCtrl+Enter to parse intent"
            }
            className={cn(
              "w-full min-h-[80px] max-h-[200px] resize-none rounded-lg border px-3 py-2.5 text-sm text-[#323130] placeholder:text-[#a19f9d] focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] transition-colors",
              smartMode && liveHint?.detected
                ? "border-[#0078d4]/50 bg-[#f8fbff]"
                : "border-[#edebe9] bg-[#faf9f8]"
            )}
          />
          <Button
            size="sm"
            className="absolute bottom-2 right-2 h-7 px-2.5 bg-[#0078d4] hover:bg-[#106ebe]"
            onClick={handleSubmit}
            disabled={!input.trim() || isThinking}
          >
            {isThinking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>

        {/* ── Live Intent Detection Bar ── */}
        {smartMode && input.trim().length >= 6 && (
          <div className="mt-2">
            {hintLoading && (
              <div className="flex items-center gap-1.5 text-[10px] text-[#a19f9d]">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{zh ? "正在识别意图..." : "Detecting intent..."}</span>
              </div>
            )}
            {!hintLoading && liveHint?.detected && (
              <div
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all",
                  hintColor.bg,
                  hintColor.border
                )}
              >
                <Workflow className={cn("w-3.5 h-3.5 shrink-0", hintColor.text)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-xs font-semibold", hintColor.text)}>
                      {liveHint.template}
                    </span>
                    <span className="text-[9px] text-[#a19f9d]">
                      {liveHint.confidence}%
                    </span>
                    {liveHint.matchCount > 1 && (
                      <span className="text-[9px] text-[#a19f9d]">
                        +{liveHint.matchCount - 1} {zh ? "其他" : "more"}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#605e5c] mt-0.5">
                    {zh
                      ? "点击「转为工作流」立即生成完整业务流程"
                      : "Click 'Convert' to generate full business workflow"}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-6 px-2.5 text-[10px] bg-[#0078d4] hover:bg-[#106ebe] gap-1 shrink-0"
                  onClick={handleQuickConvert}
                  disabled={isThinking}
                >
                  <Play className="w-2.5 h-2.5" />
                  {zh ? "转为工作流" : "Convert"}
                </Button>
              </div>
            )}
            {!hintLoading && liveHint && !liveHint.detected && input.trim().length >= 10 && (
              <div className="flex items-center gap-1.5 text-[10px] text-[#a19f9d]">
                <Lightbulb className="w-3 h-3" />
                <span>
                  {zh
                    ? "未识别到业务意图 — 试试包含「出差」「报销」「质量」「采购」等关键词"
                    : "No intent detected — try keywords like 'trip', 'expense', 'quality', 'purchase'"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Area */}
      <div ref={resultsRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {entries.length === 0 && !isThinking && (
          <div className="flex flex-col items-center justify-center py-8 text-[#a19f9d]">
            <Lightbulb className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">
              {zh ? "AI 画布就绪" : "AI Canvas Ready"}
            </p>
            <p className="text-xs mt-1 text-center max-w-[280px] leading-relaxed">
              {zh
                ? smartMode
                  ? "输入任何工作笔记，AI实时识别意图并自动推荐业务流程"
                  : "输入工作笔记，按 Ctrl+Enter 让AI识别意图"
                : smartMode
                  ? "Type work notes — AI detects intent in real-time and suggests business workflows"
                  : "Type work notes, press Ctrl+Enter to parse intent"}
            </p>
            {smartMode && (
              <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0078d4]/10 text-[10px] text-[#0078d4] font-medium">
                <Workflow className="w-3 h-3" />
                {zh ? "智能流模式已开启" : "Smart Flow ON"}
              </div>
            )}
            <div className="mt-4 space-y-2 text-xs text-[#605e5c] max-w-[300px]">
              <p className="font-medium text-[#0078d4]">
                {zh ? "试一试:" : "Try these:"}
              </p>
              <div className="p-2 rounded bg-[#f0f4ff] border border-[#deecf9] italic">
                {zh
                  ? "\"下周去底特律工厂检查新一批物料\""
                  : "\"Plan trip to Detroit plant next week\""}
              </div>
              <div className="p-2 rounded bg-red-50 border border-red-200 italic">
                {zh
                  ? "\"客户投诉轴承噪音超标，需要启动8D调查\""
                  : "\"Customer complaint about bearing noise, need 8D investigation\""}
              </div>
              <div className="p-2 rounded bg-amber-50 border border-amber-200 italic">
                {zh
                  ? "\"报销上周深圳出差机票酒店共计3500元\""
                  : "\"Reimburse Shenzhen trip flights + hotel $500 total\""}
              </div>
            </div>
          </div>
        )}

        {isThinking && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#f0f4ff] border border-[#deecf9] animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-[#0078d4]" />
            <span className="text-sm text-[#0078d4]">
              {zh ? "AI 正在生成业务流程..." : "AI generating business workflow..."}
            </span>
          </div>
        )}

        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-lg border border-[#edebe9] bg-white overflow-hidden shadow-sm"
          >
            {/* Entry header with original text */}
            <div className="px-3 py-2.5 bg-[#faf9f8] border-b border-[#edebe9]">
              <div className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#0078d4] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#605e5c] truncate">
                    {entry.originalText}
                  </p>
                </div>
                {entry.type === "applied" && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] h-4 px-1.5 shrink-0">
                    {zh ? "已应用" : "Applied"}
                  </Badge>
                )}
                {entry.type === "ai-workflow" &&
                  entry.suggestions.length > 0 && (
                    <Badge className="bg-[#0078d4]/10 text-[#0078d4] border-[#0078d4]/20 text-[9px] h-4 px-1.5 shrink-0">
                      {zh ? "已识别" : "Detected"}
                    </Badge>
                  )}
              </div>
            </div>

            {/* AI Summary */}
            <div className="px-3 py-2.5">
              <pre className="text-xs text-[#323130] whitespace-pre-wrap font-sans leading-relaxed">
                {entry.summary}
              </pre>
            </div>

            {/* Extracted Entities */}
            {entry.entities &&
              (entry.entities.locations.length > 0 ||
                entry.entities.dates.length > 0 ||
                entry.entities.materials.length > 0 ||
                entry.entities.people.length > 0) && (
                <div className="px-3 py-2 border-t border-[#edebe9] flex flex-wrap gap-1.5">
                  {entry.entities.locations.map((loc) => (
                    <Badge
                      key={loc}
                      variant="outline"
                      className="text-[9px] h-5 gap-1 bg-blue-50 text-blue-700 border-blue-200"
                    >
                      <MapPin className="w-2.5 h-2.5" />
                      {loc}
                    </Badge>
                  ))}
                  {entry.entities.dates.map((d) => (
                    <Badge
                      key={d}
                      variant="outline"
                      className="text-[9px] h-5 gap-1 bg-amber-50 text-amber-700 border-amber-200"
                    >
                      <Calendar className="w-2.5 h-2.5" />
                      {d}
                    </Badge>
                  ))}
                  {entry.entities.materials.map((m) => (
                    <Badge
                      key={m}
                      variant="outline"
                      className="text-[9px] h-5 gap-1 bg-purple-50 text-purple-700 border-purple-200"
                    >
                      <Package className="w-2.5 h-2.5" />
                      {m}
                    </Badge>
                  ))}
                  {entry.entities.people.map((p) => (
                    <Badge
                      key={p}
                      variant="outline"
                      className="text-[9px] h-5 gap-1 bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      <UserCheck className="w-2.5 h-2.5" />
                      {p}
                    </Badge>
                  ))}
                </div>
              )}

            {/* Action Cards for each suggestion */}
            {entry.suggestions.length > 0 && entry.type !== "applied" && (
              <div className="border-t border-[#edebe9]">
                {entry.suggestions.map((sug) => {
                  const catColor =
                    CATEGORY_COLORS[sug.category] ?? CATEGORY_COLORS.general;
                  return (
                    <div
                      key={sug.rank}
                      className={cn(
                        "px-3 py-3",
                        sug.rank > 1 && "border-t border-[#edebe9]"
                      )}
                    >
                      {/* Suggestion header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              "text-[9px] h-4 px-1.5 border",
                              catColor.bg,
                              catColor.text,
                              catColor.border
                            )}
                          >
                            {sug.suggestedTemplate}
                          </Badge>
                          <span className="text-[10px] text-[#a19f9d]">
                            {sug.confidence}%
                          </span>
                        </div>
                        {sug.rank === 1 && (
                          <Badge className="bg-[#0078d4] text-white text-[9px] h-4 px-1.5">
                            {zh ? "最佳匹配" : "Best Match"}
                          </Badge>
                        )}
                      </div>

                      {/* Linked Entities */}
                      <div className="mb-2">
                        <p className="text-[10px] font-medium text-[#605e5c] mb-1">
                          {zh ? "关联部门/模块:" : "Linked Entities:"}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {sug.linkedEntities.map((ent) => (
                            <span
                              key={ent}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[#f0f4ff] text-[#0078d4] border border-[#deecf9]"
                            >
                              {ent}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Workflow Steps */}
                      {sug.proposedWorkflow.length > 0 && (
                        <div className="mb-2.5">
                          <p className="text-[10px] font-medium text-[#605e5c] mb-1.5">
                            {zh ? "审批流程:" : "Proposed Workflow:"}
                          </p>
                          <div className="space-y-1">
                            {sug.proposedWorkflow.map((step, i) => (
                              <div
                                key={step.step}
                                className="flex items-center gap-2"
                              >
                                <div className="flex items-center gap-1 shrink-0">
                                  <div
                                    className={cn(
                                      "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold",
                                      i === 0
                                        ? "bg-[#0078d4] text-white"
                                        : "bg-[#edebe9] text-[#605e5c]"
                                    )}
                                  >
                                    {step.step}
                                  </div>
                                  {i < sug.proposedWorkflow.length - 1 && (
                                    <ChevronRight className="w-2.5 h-2.5 text-[#a19f9d]" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-[11px] text-[#323130]">
                                    {step.label}
                                  </span>
                                  <span className="text-[10px] text-[#a19f9d] ml-1.5">
                                    ({step.approver})
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs bg-[#0078d4] hover:bg-[#106ebe] gap-1.5"
                          onClick={() =>
                            handleApplyWorkflow(entry.id, sug)
                          }
                          disabled={applyMutation.isPending}
                        >
                          {applyMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          {zh ? "应用工作流" : "Apply Workflow"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-3 text-xs gap-1.5 text-[#0078d4] border-[#0078d4]/30 hover:bg-[#f0f4ff]"
                          onClick={() => handleNavigate(sug.route)}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {zh ? "前往模块" : "Go to Module"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Applied Workflow Result */}
            {entry.type === "applied" && entry.appliedResult && (
              <div className="border-t border-emerald-200 bg-emerald-50/50 px-3 py-3">
                <div className="flex items-start gap-2 mb-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    {entry.appliedResult.message}
                  </p>
                </div>

                {/* Task & Workflow IDs */}
                <div className="flex gap-2 mb-2.5">
                  <Badge
                    variant="outline"
                    className="text-[9px] h-5 bg-white border-emerald-300 text-emerald-700"
                  >
                    {entry.appliedResult.taskId}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[9px] h-5 bg-white border-emerald-300 text-emerald-700"
                  >
                    {entry.appliedResult.workflowId}
                  </Badge>
                </div>

                {/* Live workflow tracker */}
                <div className="space-y-1.5 mb-2.5">
                  {entry.appliedResult.workflow.map((step) => (
                    <div key={step.step} className="flex items-center gap-2">
                      {step.status === "active" ? (
                        <div className="w-4 h-4 rounded-full bg-[#0078d4] flex items-center justify-center animate-pulse">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      ) : (
                        <Circle className="w-4 h-4 text-[#a19f9d]" />
                      )}
                      <span
                        className={cn(
                          "text-[11px]",
                          step.status === "active"
                            ? "text-[#0078d4] font-medium"
                            : "text-[#a19f9d]"
                        )}
                      >
                        {step.label}
                      </span>
                      <span className="text-[10px] text-[#a19f9d]">
                        ({step.approver})
                      </span>
                    </div>
                  ))}
                </div>

                {/* Navigate to module */}
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                  onClick={() =>
                    handleNavigate(
                      entry.appliedResult?.nextAction.route ?? "/"
                    )
                  }
                >
                  <ArrowRight className="w-3 h-3" />
                  {entry.appliedResult.nextAction.label}
                </Button>
              </div>
            )}

            {/* Template-draft: simple route link */}
            {entry.type === "template-draft" &&
              entry.suggestions[0]?.route && (
                <div className="px-3 py-2 border-t border-[#edebe9] bg-[#faf9f8]">
                  <button
                    onClick={() => {
                      const route = entry.suggestions[0]?.route;
                      if (route) handleNavigate(route);
                    }}
                    className="flex items-center gap-1.5 text-xs text-[#0078d4] hover:underline"
                  >
                    <ArrowRight className="w-3 h-3" />
                    {zh ? "前往相关页面" : "Go to related page"}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#edebe9] bg-[#faf9f8]">
        <p className="text-[10px] text-[#a19f9d] text-center">
          {zh
            ? smartMode
              ? "Alt+A 打开 · 输入即识别 · 一键转工作流"
              : "Alt+A 打开 · Ctrl+Enter 发送 · 开启「智能流」实时识别"
            : smartMode
              ? "Alt+A toggle · Type to detect · One-click workflow"
              : "Alt+A toggle · Ctrl+Enter send · Enable 'Smart Flow' for live detection"}
        </p>
      </div>
    </div>
  );
}
