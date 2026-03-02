/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  GRT Dual-AI Collaboration Matrix
 * ══════════════════════════════════════════════════════════════════════════════
 *
 *  This page implements the CEO's "Dual-Agent Collaboration" vision:
 *
 *  ┌────────────────────┬────────────────────┬────────────────────┐
 *  │  GEMINI (Planner)  │  CEO (Approver)    │  CLAUDE (Executor) │
 *  │  Strategy & Chat   │  Task Staging      │  Execution Queue   │
 *  └────────────────────┴────────────────────┴────────────────────┘
 *
 *  DUAL-AI HANDOFF PROCESS:
 *  ─────────────────────────
 *  1. CEO types a requirement into the Gemini chat (Column 1)
 *  2. Gemini (via /api/cicd.askGeminiPlanner) analyzes the prompt and returns:
 *     - A strategic reply (displayed in the chat window)
 *     - A `suggestedTask` object (title, scope, categories, rules, priority)
 *  3. The suggestedTask auto-fills the staging form in Column 2
 *  4. CEO reviews, tweaks scope/categories/priority, then clicks [Approve]
 *  5. Approval calls cicd.create → task enters the Claude execution queue
 *  6. Column 3 shows real-time pipeline status grouped by scope
 *     (Pending → Running → Completed), driven by cicd.list
 *
 *  SOURCE MODES:
 *  ─────────────
 *  - MANUAL: CEO types directly into Gemini chat
 *  - AUTO_FETCH: System scrapes error logs, monitoring alerts, user feedback
 *    via cicd.autoFetch (Column 3 header button)
 *
 *  DESIGN: Microsoft Fluent Design (#faf9f8 background, clean card layout)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/grt";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bot,
  Send,
  User,
  Loader2,
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertCircle,
  XCircle,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Zap,
  Shield,
  ArrowRight,
  ArrowUpRight,
  Trash2,
  Eye,
  RotateCcw,
  MessageSquareWarning,
  X,
  Terminal,
  Cloud,
  Copy,
  Check,
  Rocket,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";

// ══════════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════════

// Chat message in the Gemini conversation panel
interface ChatMessage {
  id: string;
  role: "user" | "gemini";
  content: string;
  timestamp: Date;
}

// The shape Gemini returns for a suggested task
interface SuggestedTask {
  title: string;
  scope: string;
  categories: string[];
  rules: string;
  priority: number;
}

// ══════════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════════

// Quick prompt suggestions shown as chips in the Gemini chat
// when the conversation is empty. Clicking a chip auto-fills the input.
const QUICK_PROMPTS = [
  { zh: "优化M6生产报表加载速度", en: "Optimize M6 dashboard load time" },
  { zh: "CRM客户管理增加批量导入", en: "Add bulk import to CRM customers" },
  { zh: "质量月报PDF导出乱码修复", en: "Fix quality report PDF encoding" },
  { zh: "移动端审批按钮太小", en: "Mobile approval buttons too small" },
  { zh: "供应链追溯图谱性能优化", en: "Supply chain traceability performance" },
  { zh: "HR薪酬分析增加对比视图", en: "Add comparison view to HR compensation" },
];

// Available scopes (GRT system modules) for the scope dropdown
const SCOPE_OPTIONS = [
  "M6-MES",
  "CRM",
  "HR",
  "Quality",
  "SupplyChain",
  "Finance",
  "R&D",
  "Service",
  "Mobile",
  "AI",
  "General",
];

// Category checkboxes — each represents a tech layer the task touches
const CATEGORY_OPTIONS = [
  "Frontend",
  "Backend",
  "DB",
  "API",
  "UX",
  "Export",
  "Mobile",
  "AI",
  "DevOps",
  "Security",
];

// Priority levels (1=critical → 4=low)
const PRIORITY_OPTIONS = [
  { value: 1, label: "P1 紧急", labelEn: "P1 Critical", color: "bg-red-500" },
  { value: 2, label: "P2 高", labelEn: "P2 High", color: "bg-orange-500" },
  { value: 3, label: "P3 中", labelEn: "P3 Medium", color: "bg-blue-500" },
  { value: 4, label: "P4 低", labelEn: "P4 Low", color: "bg-gray-400" },
];

// Status badge configuration for the execution queue
const STATUS_CONFIG: Record<
  string,
  { label: string; labelEn: string; icon: typeof Clock; color: string }
> = {
  PENDING: {
    label: "排队中",
    labelEn: "Pending",
    icon: Clock,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  IN_PROGRESS: {
    label: "执行中",
    labelEn: "Running",
    icon: PlayCircle,
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  },
  COMPLETED: {
    label: "已完成",
    labelEn: "Completed",
    icon: CheckCircle2,
    color:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  FAILED: {
    label: "失败",
    labelEn: "Failed",
    icon: XCircle,
    color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
  SKIPPED: {
    label: "跳过",
    labelEn: "Skipped",
    icon: AlertCircle,
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  },
};

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export default function DualAIMatrix() {
  const { language } = useLanguage();

  // ── Column 1: Gemini Chat State ──
  // Stores the full conversation history between CEO and Gemini
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  // Current text in the chat input box
  const [chatInput, setChatInput] = useState("");
  // Ref to auto-scroll chat window to bottom
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Column 2: Task Staging Form State ──
  // This form auto-fills when Gemini returns a suggestedTask,
  // but the CEO can tweak every field before approving
  const [stagingTask, setStagingTask] = useState<SuggestedTask | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formScope, setFormScope] = useState("General");
  const [formCategories, setFormCategories] = useState<string[]>([]);
  const [formRules, setFormRules] = useState("");
  const [formPriority, setFormPriority] = useState(3);

  // ── tRPC hooks ──
  // askGeminiPlanner: sends the CEO's prompt to the Gemini stub
  // on the backend (LLM or rule-based fallback)
  const geminiMutation = trpc.cicd.askGeminiPlanner.useMutation({
    onSuccess: (data) => {
      // Step 1: Add Gemini's reply to the chat window
      const geminiMsg: ChatMessage = {
        id: `gemini-${Date.now()}`,
        role: "gemini",
        content: data.reply || "No analysis returned.",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, geminiMsg]);

      // Step 2: If Gemini returned a suggestedTask, auto-fill the staging form
      // This is the core HANDOFF: Gemini → CEO staging area
      if (data.suggestedTask) {
        const st = data.suggestedTask;
        setStagingTask(st);
        setFormTitle(st.title || "");
        setFormScope(st.scope || "General");
        setFormCategories(st.categories || []);
        setFormRules(st.rules || "");
        setFormPriority(st.priority || 3);
        toast.success(
          language === "zh"
            ? "Gemini 已生成任务建议，请审核后确认"
            : "Gemini generated a task suggestion. Please review and confirm."
        );
      }
    },
    onError: () => {
      // Even on error, show a message in chat so the CEO knows
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "gemini",
        content:
          language === "zh"
            ? "[Gemini 暂时不可用，请稍后重试]"
            : "[Gemini temporarily unavailable, please retry]",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    },
  });

  // cicd.create: sends the approved task into the execution pipeline
  // This is the HANDOFF: CEO → Claude execution queue
  const createMutation = trpc.cicd.create.useMutation({
    onSuccess: () => {
      toast.success(
        language === "zh"
          ? "任务已发送至 Claude 执行队列！"
          : "Task sent to Claude execution queue!"
      );
      // Clear the staging form after successful submission
      setStagingTask(null);
      setFormTitle("");
      setFormScope("General");
      setFormCategories([]);
      setFormRules("");
      setFormPriority(3);
      // Refetch the execution queue to show the new task
      taskListQuery.refetch();
    },
  });

  // cicd.list: fetches all tasks for the execution queue (Column 3)
  const taskListQuery = trpc.cicd.list.useQuery(undefined, {
    refetchInterval: 5000, // Poll every 5s for real-time feel
  });

  // ── File-Based Queue Bridge: Completion Polling ──
  // Every 5 seconds, check if Claude CLI Sentinel has moved any task
  // files from data/dev-queue/pending/ to data/dev-queue/completed/.
  // If so, update the DB status to COMPLETED and refetch the task list.
  const queueStatusQuery = trpc.cicd.getQueueStatus.useQuery(undefined, {
    refetchInterval: 5000, // Poll the file system every 5s
  });
  const checkCompletedMutation = trpc.cicd.checkCompletedTasks.useMutation({
    onSuccess: (data) => {
      if (data.updated.length > 0) {
        toast.success(
          language === "zh"
            ? `Claude CLI 已完成 ${data.updated.length} 个任务！`
            : `Claude CLI completed ${data.updated.length} task(s)!`
        );
        taskListQuery.refetch();
        statsQuery.refetch();
      }
    },
  });
  // Auto-poll: trigger checkCompletedTasks whenever queueStatus shows
  // completed files that might not yet be reflected in the DB
  useEffect(() => {
    const completed = queueStatusQuery.data?.completed ?? [];
    if (completed.length > 0) {
      checkCompletedMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueStatusQuery.data?.completed?.length]);

  // ── Column 3: Task Detail Dialog State ──
  // When the CEO clicks a task card, it opens a detail dialog
  // with stage promotion, status update, and Gemini analysis history
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // ── Column 3: Scope filter ──
  // Filter execution queue by business scope (e.g. "M6-MES", "CRM")
  const [filterScope, setFilterScope] = useState<string>("all");

  // cicd.promoteStage: advance task to next pipeline stage (DEV→TEST→PROD)
  // This requires CEO approval — the CEO must explicitly click [Promote]
  const promoteMutation = trpc.cicd.promoteStage.useMutation({
    onSuccess: () => {
      toast.success(
        language === "zh" ? "任务已推进至下一阶段" : "Task promoted to next stage"
      );
      taskListQuery.refetch();
      statsQuery.refetch();
    },
  });

  // cicd.rejectStage: reject/rollback a task (CEO says No-Go)
  const rejectMutation = trpc.cicd.rejectStage.useMutation({
    onSuccess: () => {
      toast.success(
        language === "zh" ? "任务已退回" : "Task rejected/rolled back"
      );
      taskListQuery.refetch();
      statsQuery.refetch();
    },
  });

  // cicd.updateStage: update the status within the current stage
  // (e.g. PENDING → IN_PROGRESS → COMPLETED within DEV)
  const updateStageMutation = trpc.cicd.updateStage.useMutation({
    onSuccess: () => {
      toast.success(
        language === "zh" ? "状态已更新" : "Status updated"
      );
      taskListQuery.refetch();
    },
  });

  // cicd.delete: remove a task from the queue entirely
  const deleteMutation = trpc.cicd.delete.useMutation({
    onSuccess: () => {
      toast.success(language === "zh" ? "任务已删除" : "Task deleted");
      setSelectedTaskId(null);
      taskListQuery.refetch();
      statsQuery.refetch();
    },
  });

  // cicd.getStageLogs: fetch audit trail for the selected task
  // Shows every stage transition (promote, reject, create) with timestamps
  const stageLogsQuery = trpc.cicd.getStageLogs.useQuery(
    { id: selectedTaskId ?? 0 },
    { enabled: !!selectedTaskId }
  );

  // cicd.autoFetch: scrapes system logs/errors for automatic issue detection
  const autoFetchMutation = trpc.cicd.autoFetch.useMutation({
    onSuccess: (data) => {
      toast.success(
        language === "zh"
          ? `自动抓取 ${data.fetched} 条问题`
          : `Auto-fetched ${data.fetched} issues`
      );
      taskListQuery.refetch();
    },
  });

  // cicd.getDashboardStats: aggregate counts for the stats bar
  const statsQuery = trpc.cicd.getDashboardStats.useQuery();

  // ── HITL: Human-in-the-Loop Approval Box ──
  // Poll for questions Claude CLI has written to data/dev-queue/questions/
  const questionsQuery = trpc.cicd.getQuestions.useQuery(undefined, {
    refetchInterval: 3000, // Poll every 3s for urgency
  });
  const answerMutation = trpc.cicd.answerQuestion.useMutation({
    onSuccess: (data) => {
      toast.success(
        language === "zh"
          ? `已回复任务 #${data.taskId}，Claude 将继续执行`
          : `Answered task #${data.taskId} — Claude will resume`
      );
      setHitlAnswers({});
      questionsQuery.refetch();
    },
  });
  // Local state: CEO's typed answers keyed by taskId
  const [hitlAnswers, setHitlAnswers] = useState<Record<number, string>>({});
  // Collapse/expand the HITL panel
  const [hitlMinimized, setHitlMinimized] = useState(false);

  // ── Launch Modal State ──
  // When the CEO clicks "Approve & Send to Execution", instead of
  // immediately creating the task, we open a modal offering two
  // execution paths: Local CLI or Cloud GitHub Actions.
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  // Track whether the CLI command has been copied to clipboard
  const [cliCopied, setCliCopied] = useState(false);
  // Track which option has been selected in the launch modal
  const [launchMode, setLaunchMode] = useState<"select" | "local" | "cloud">("select");

  // cicd.triggerGitHubDispatch: triggers the .github/workflows/claude-auto-dev.yml
  // via the GitHub repository_dispatch API for cloud-based execution
  const githubDispatchMutation = trpc.cicd.triggerGitHubDispatch.useMutation({
    onSuccess: (data) => {
      toast.success(
        language === "zh"
          ? "GitHub Actions 已触发！流水线正在云端执行..."
          : "GitHub Action Triggered! Pipeline running in the cloud."
      );
      // Now also save the task to DB for tracking
      submitTaskToDB();
    },
    onError: (err) => {
      toast.error(
        language === "zh"
          ? `GitHub 触发失败: ${err.message}`
          : `GitHub dispatch failed: ${err.message}`
      );
    },
  });

  const pendingQuestions = questionsQuery.data ?? [];

  // ── Auto-scroll chat to bottom when new messages arrive ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ══════════════════════════════════════════════════════════════
  //  HANDLERS
  // ══════════════════════════════════════════════════════════════

  // Handle sending a message to Gemini
  // This initiates the Dual-AI handoff: CEO prompt → Gemini analysis
  const handleSendToGemini = useCallback(() => {
    if (!chatInput.trim()) return;

    // Add the CEO's message to the chat first
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    // Call the backend: cicd.askGeminiPlanner
    // The backend will either invoke the real LLM (Google Generative AI SDK)
    // or fall back to a rule-based mock response
    geminiMutation.mutate({ prompt: chatInput });

    // Clear the input
    setChatInput("");
  }, [chatInput, geminiMutation]);

  // Handle category checkbox toggle
  const toggleCategory = useCallback((cat: string) => {
    setFormCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  // ── Submit to DB helper (shared by both Local and Cloud paths) ──
  // Creates the task in the CI/CD pipeline without launching execution.
  // Called AFTER the CEO selects an execution engine in the Launch Modal.
  const submitTaskToDB = useCallback(() => {
    createMutation.mutate({
      title: formTitle,
      sourceMode: "MANUAL",
      categories: formCategories,
      scope: formScope,
      priority: formPriority,
      rules: formRules || undefined,
      assignee: "Claude",
      geminiAnalysis: stagingTask
        ? { suggestion: stagingTask, approvedAt: new Date().toISOString() } as any
        : undefined,
    });
  }, [
    formTitle,
    formScope,
    formCategories,
    formRules,
    formPriority,
    stagingTask,
    createMutation,
  ]);

  // Handle "Approve & Send to Execution" button click.
  // CHANGED: Instead of immediately creating the task in the DB,
  // we now open the Launch Modal so the CEO can choose the execution engine.
  const handleApproveTask = useCallback(() => {
    if (!formTitle.trim()) {
      toast.error(
        language === "zh" ? "请填写任务标题" : "Please enter a task title"
      );
      return;
    }
    // Open the Launch Modal — task is NOT created yet
    setLaunchMode("select");
    setCliCopied(false);
    setLaunchModalOpen(true);
  }, [formTitle, language]);

  // ── Generate the Claude CLI command string ──
  // This is the command the CEO can copy and paste into their terminal
  // to execute the task locally via Claude CLI.
  const generateCliCommand = useCallback(() => {
    const escapedTitle = formTitle.replace(/"/g, '\\"');
    const escapedScope = formScope.replace(/"/g, '\\"');
    const escapedRules = (formRules || "Ensure build passes").replace(/"/g, '\\"');
    return `claude "Task: ${escapedTitle}. Scope: ${escapedScope}. Strict Rules: ${escapedRules}. Please execute and update the UI."`;
  }, [formTitle, formScope, formRules]);

  // ── Copy CLI command to clipboard ──
  const handleCopyCliCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generateCliCommand());
      setCliCopied(true);
      toast.success(
        language === "zh"
          ? "CLI 命令已复制到剪贴板！"
          : "CLI command copied to clipboard!"
      );
      // Also save the task to DB for tracking
      submitTaskToDB();
      setTimeout(() => setCliCopied(false), 3000);
    } catch {
      toast.error(
        language === "zh"
          ? "复制失败，请手动选择并复制"
          : "Copy failed, please select and copy manually"
      );
    }
  }, [generateCliCommand, language, submitTaskToDB]);

  // ── Trigger GitHub Actions (Cloud path) ──
  const handleTriggerGitHub = useCallback(() => {
    githubDispatchMutation.mutate({
      taskId: 0, // Will be filled by the create callback
      title: formTitle,
      scope: formScope,
      rules: formRules || "Ensure build passes and no regressions",
    });
  }, [formTitle, formScope, formRules, githubDispatchMutation]);

  // ══════════════════════════════════════════════════════════════
  //  GROUP EXECUTION QUEUE TASKS BY SCOPE
  // ══════════════════════════════════════════════════════════════

  // Group the pipeline tasks by their business scope for Column 3.
  // If filterScope is set, only include tasks matching that scope.
  const filteredTasks = (taskListQuery.data || []).filter(
    (task: any) => filterScope === "all" || (task.scope || "Unscoped") === filterScope
  );
  const tasksByScope = filteredTasks.reduce(
    (acc: Record<string, any[]>, task: any) => {
      const scope = task.scope || "Unscoped";
      if (!acc[scope]) acc[scope] = [];
      acc[scope].push(task);
      return acc;
    },
    {} as Record<string, any[]>
  );

  // Extract unique scopes for the filter dropdown
  const allScopes = [
    ...new Set(
      (taskListQuery.data || []).map((t: any) => t.scope || "Unscoped")
    ),
  ] as string[];

  // Get the current status for a task based on its active stage
  const getActiveStatus = (task: any): string => {
    if (task.currentStage === "DEV") return task.devStatus || "PENDING";
    if (task.currentStage === "TEST") return task.testStatus || "PENDING";
    return task.prodStatus || "PENDING";
  };

  // ══════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        icon={Zap}
        title={
          language === "zh"
            ? "双AI协作矩阵"
            : "Dual-AI Collaboration Matrix"
        }
        description={
          language === "zh"
            ? "Gemini 战略规划 → CEO 审核确认 → Claude 自动执行"
            : "Gemini Strategic Planning → CEO Review → Claude Auto-Execution"
        }
      />

      {/* ── Stats Bar ── */}
      {statsQuery.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["DEV", "TEST", "PROD"] as const).map((stage) => (
            <Card key={stage} className="bg-card">
              <CardContent className="p-3 flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    stage === "DEV"
                      ? "bg-blue-500/10 text-blue-500"
                      : stage === "TEST"
                      ? "bg-yellow-500/10 text-yellow-500"
                      : "bg-green-500/10 text-green-500"
                  }`}
                >
                  {stage === "DEV" ? (
                    <PlayCircle className="w-4 h-4" />
                  ) : stage === "TEST" ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stage}</p>
                  <p className="text-lg font-semibold">
                    {statsQuery.data.stageCounts[stage] || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="bg-card">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-500">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === "zh" ? "总任务" : "Total"}
                </p>
                <p className="text-lg font-semibold">
                  {Object.values(statsQuery.data.stageCounts).reduce(
                    (a: number, b: unknown) => a + (Number(b) || 0),
                    0
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
           3-COLUMN LAYOUT: Gemini | CEO Staging | Claude Queue
           Microsoft Fluent Design: #faf9f8 bg, clean cards, blue accent
         ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ────────────────────────────────────
            COLUMN 1: Gemini Strategy & Planning
            ──────────────────────────────────── */}
        <Card className="bg-[#faf9f8] dark:bg-card border flex flex-col">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="w-5 h-5 text-blue-600" />
              {language === "zh"
                ? "Gemini 战略规划"
                : "Gemini Strategy & Planning"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {language === "zh"
                ? "与 Gemini AI 对话，分析需求并生成任务建议"
                : "Chat with Gemini AI to analyze requirements & generate task suggestions"}
            </p>
          </CardHeader>

          {/* Chat Messages Window */}
          <CardContent className="flex-1 p-3 overflow-y-auto min-h-[400px] max-h-[600px] space-y-3">
            {/* Welcome message + quick prompt chips if no conversation yet.
                Quick prompts let the CEO start with a single click
                instead of typing from scratch. */}
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                <Bot className="w-12 h-12 text-blue-400 opacity-50" />
                <p className="text-sm text-center">
                  {language === "zh"
                    ? "向 Gemini 描述您的需求"
                    : "Describe your requirement to Gemini"}
                </p>
                {/* Quick prompt suggestion chips */}
                <div className="flex flex-wrap gap-2 justify-center max-w-[90%]">
                  {QUICK_PROMPTS.map((qp, i) => (
                    <button
                      key={i}
                      className="px-3 py-1.5 text-xs rounded-full border border-blue-200 dark:border-blue-800 bg-white dark:bg-muted hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 transition-colors"
                      onClick={() => {
                        // Auto-fill and send the quick prompt
                        const prompt = language === "zh" ? qp.zh : qp.en;
                        setChatInput(prompt);
                      }}
                    >
                      {language === "zh" ? qp.zh : qp.en}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Render each chat message */}
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {/* Gemini avatar (left side) */}
                {msg.role === "gemini" && (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-muted border"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      msg.role === "user"
                        ? "text-blue-200"
                        : "text-muted-foreground"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {/* CEO avatar (right side) */}
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator when Gemini is thinking */}
            {geminiMutation.isPending && (
              <div className="flex gap-2 items-center">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-muted border rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={chatEndRef} />
          </CardContent>

          {/* Chat Input Bar */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  language === "zh"
                    ? "与 Gemini 对话来规划功能..."
                    : "Chat with Gemini to plan features..."
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendToGemini();
                  }
                }}
                disabled={geminiMutation.isPending}
                className="flex-1"
              />
              <Button
                onClick={handleSendToGemini}
                disabled={!chatInput.trim() || geminiMutation.isPending}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {geminiMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* ────────────────────────────────────
            COLUMN 2: CEO Task Staging (Approval)
            ────────────────────────────────────
            This column is the CEO's decision point.
            Gemini's suggestedTask auto-fills these fields,
            but the CEO has full control to modify before approving.
            Clicking [Approve] triggers cicd.create → Claude queue. */}
        <Card className="bg-[#faf9f8] dark:bg-card border flex flex-col">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-amber-500" />
              {language === "zh"
                ? "任务暂存区 (待确认)"
                : "Task Staging (Pending Confirmation)"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {language === "zh"
                ? "审核 Gemini 的建议，调整后发送至执行队列"
                : "Review Gemini's suggestion, adjust and send to execution queue"}
            </p>
          </CardHeader>

          <CardContent className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Show empty state if no task staged yet */}
            {!stagingTask && !formTitle && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-12">
                <ArrowRight className="w-10 h-10 opacity-30" />
                <p className="text-sm text-center">
                  {language === "zh"
                    ? "等待 Gemini 生成任务建议...\n或直接手动填写"
                    : "Waiting for Gemini task suggestion...\nor fill in manually"}
                </p>
              </div>
            )}

            {/* ── Task Title ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {language === "zh" ? "任务标题" : "Task Title"}
              </Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={
                  language === "zh"
                    ? "例如：M6仪表板优化"
                    : "e.g. M6 Dashboard Optimization"
                }
              />
            </div>

            {/* ── Scope Dropdown ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {language === "zh" ? "业务范围 (Scope)" : "Business Scope"}
              </Label>
              <Select value={formScope} onValueChange={setFormScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Category Checkboxes ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {language === "zh" ? "技术分类 (Categories)" : "Categories"}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={formCategories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            {/* ── Priority ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {language === "zh" ? "优先级" : "Priority"}
              </Label>
              <Select
                value={String(formPriority)}
                onValueChange={(v) => setFormPriority(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={String(p.value)}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${p.color}`}
                        />
                        {language === "zh" ? p.label : p.labelEn}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Acceptance Rules ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {language === "zh" ? "验收规则" : "Acceptance Rules"}
              </Label>
              <Textarea
                value={formRules}
                onChange={(e) => setFormRules(e.target.value)}
                placeholder={
                  language === "zh"
                    ? "例如：响应时间 < 500ms"
                    : "e.g. Response < 500ms"
                }
                rows={2}
              />
            </div>

            {/* ── Gemini Suggestion Indicator ── */}
            {stagingTask && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md text-xs text-blue-700 dark:text-blue-300">
                <Bot className="w-3.5 h-3.5" />
                {language === "zh"
                  ? "此任务由 Gemini 建议生成"
                  : "This task was suggested by Gemini"}
              </div>
            )}
          </CardContent>

          {/* ── Approve Button ──
              This is the CRITICAL handoff point:
              CEO clicks → cicd.create → task enters Claude's execution queue */}
          <div className="p-4 border-t">
            <Button
              onClick={handleApproveTask}
              disabled={!formTitle.trim() || createMutation.isPending}
              className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5 mr-2" />
              )}
              {language === "zh"
                ? "审批并发送至执行队列"
                : "Approve & Send to Execution Queue"}
            </Button>
          </div>
        </Card>

        {/* ────────────────────────────────────
            COLUMN 3: Claude Execution Queue
            ────────────────────────────────────
            Displays all tasks in the CI/CD pipeline,
            grouped by scope. Each task shows its current
            stage (DEV/TEST/PROD) and status within that stage. */}
        <Card className="bg-[#faf9f8] dark:bg-card border flex flex-col">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-5 h-5 text-green-600" />
                  {language === "zh"
                    ? "Auto-Dev 执行追踪"
                    : "Auto-Dev Execution Tracker"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === "zh"
                    ? "Claude 自动执行：DEV → TEST → PROD"
                    : "Claude auto-execution: DEV → TEST → PROD"}
                </p>
              </div>
              <div className="flex gap-1.5 items-center">
                {/* File Queue Bridge status indicator */}
                {(() => {
                  const pending = queueStatusQuery.data?.pending?.length ?? 0;
                  const completed = queueStatusQuery.data?.completed?.length ?? 0;
                  if (pending > 0 || completed > 0) {
                    return (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-6 gap-1 animate-pulse"
                        title={`Pending: ${pending} | Completed: ${completed} files in queue`}
                      >
                        <span className="w-2 h-2 rounded-full bg-yellow-400" />
                        {pending > 0
                          ? `${pending} queued`
                          : `${completed} done`}
                      </Badge>
                    );
                  }
                  return null;
                })()}
                {/* Scope filter: narrow down execution queue by module */}
                <Select value={filterScope} onValueChange={setFilterScope}>
                  <SelectTrigger className="h-8 w-[100px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === "zh" ? "全部" : "All"}
                    </SelectItem>
                    {allScopes.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Auto-fetch button: scrapes system issues */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => autoFetchMutation.mutate()}
                  disabled={autoFetchMutation.isPending}
                >
                  {autoFetchMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span className="ml-1.5 text-xs">
                    {language === "zh" ? "抓取" : "Fetch"}
                  </span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-3 overflow-y-auto min-h-[400px] max-h-[600px] space-y-4">
            {/* Loading state */}
            {taskListQuery.isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Empty state */}
            {!taskListQuery.isLoading &&
              Object.keys(tasksByScope).length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <Sparkles className="w-10 h-10 opacity-30" />
                  <p className="text-sm">
                    {language === "zh"
                      ? "执行队列为空"
                      : "Execution queue is empty"}
                  </p>
                </div>
              )}

            {/* Tasks grouped by scope */}
            {Object.entries(tasksByScope).map(([scope, tasks]) => (
              <div key={scope} className="space-y-2">
                {/* Scope group header */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold"
                  >
                    {scope}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {(tasks as any[]).length}{" "}
                    {language === "zh" ? "个任务" : "tasks"}
                  </span>
                </div>

                {/* Task cards within this scope
                    Each card shows pipeline progress + interactive controls.
                    Clicking the card opens a detail dialog for stage management. */}
                {(tasks as any[]).map((task: any) => {
                  const status = getActiveStatus(task);
                  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusCfg.icon;
                  // Check if task can be promoted (not already in PROD)
                  const canPromote = task.currentStage !== "PROD";

                  return (
                    <div
                      key={task.id}
                      className="p-2.5 bg-white dark:bg-muted rounded-lg border hover:border-blue-300 transition-colors cursor-pointer"
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      {/* Row 1: Title + Priority */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium line-clamp-1 flex-1">
                          {task.title}
                        </h4>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                            PRIORITY_OPTIONS.find(
                              (p) => p.value === task.priority
                            )?.color || "bg-gray-400"
                          }`}
                        />
                      </div>

                      {/* Row 2: Stage pipeline visualization
                          ── DEV → TEST → PROD ──
                          Current stage = blue, past stages = green, future = gray */}
                      <div className="flex items-center gap-1 mt-1.5">
                        {(["DEV", "TEST", "PROD"] as const).map(
                          (stage, i) => (
                            <div key={stage} className="flex items-center gap-1">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  task.currentStage === stage
                                    ? "bg-blue-600 text-white font-medium"
                                    : i <
                                      ["DEV", "TEST", "PROD"].indexOf(
                                        task.currentStage
                                      )
                                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                }`}
                              >
                                {stage}
                              </span>
                              {i < 2 && (
                                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                          )
                        )}
                      </div>

                      {/* Row 3: Status badge + categories + assignee */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Badge
                          className={`text-[10px] px-1.5 py-0 border-0 ${statusCfg.color}`}
                        >
                          <StatusIcon className="w-3 h-3 mr-0.5" />
                          {language === "zh"
                            ? statusCfg.label
                            : statusCfg.labelEn}
                        </Badge>
                        {Array.isArray(task.categories) &&
                          task.categories.slice(0, 3).map((cat: string) => (
                            <Badge
                              key={cat}
                              variant="outline"
                              className="text-[9px] px-1 py-0"
                            >
                              {cat}
                            </Badge>
                          ))}
                        {task.assignee && (
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {task.assignee}
                          </span>
                        )}
                      </div>

                      {/* Row 4: Quick action buttons
                          ── Promote: advance to next stage (CEO approval)
                          ── Update: change status within current stage
                          These are the CEO's pipeline control buttons. */}
                      <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-dashed">
                        {/* Promote to next stage */}
                        {canPromote && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-[10px] h-6 px-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              promoteMutation.mutate({ id: task.id });
                            }}
                            disabled={promoteMutation.isPending}
                          >
                            <ArrowUpRight className="w-3 h-3 mr-0.5" />
                            {language === "zh" ? "推进" : "Promote"}
                          </Button>
                        )}
                        {/* Mark status as IN_PROGRESS */}
                        {status === "PENDING" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-[10px] h-6 px-1.5 text-yellow-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStageMutation.mutate({
                                id: task.id,
                                status: "IN_PROGRESS",
                              });
                            }}
                          >
                            <PlayCircle className="w-3 h-3 mr-0.5" />
                            {language === "zh" ? "开始" : "Start"}
                          </Button>
                        )}
                        {/* Mark status as COMPLETED */}
                        {status === "IN_PROGRESS" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-[10px] h-6 px-1.5 text-green-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStageMutation.mutate({
                                id: task.id,
                                status: "COMPLETED",
                              });
                            }}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-0.5" />
                            {language === "zh" ? "完成" : "Done"}
                          </Button>
                        )}
                        {/* View detail */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[10px] h-6 px-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTaskId(task.id);
                          }}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          LAUNCH MODAL — "Select Execution Engine"
          ──────────────────────────────────────────
          Opens when the CEO clicks "Approve & Send to Execution".
          Offers two execution paths:
            1. LOCAL:  Generate a Claude CLI command (copy to clipboard)
            2. CLOUD:  Trigger GitHub Actions via repository_dispatch API
         ══════════════════════════════════════════════════════════════ */}
      <Dialog open={launchModalOpen} onOpenChange={setLaunchModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Rocket className="w-5 h-5 text-blue-600" />
              {language === "zh"
                ? "选择执行引擎"
                : "Select Execution Engine"}
            </DialogTitle>
          </DialogHeader>

          {/* Task Summary Card */}
          <div className="p-3 bg-[#faf9f8] dark:bg-muted rounded-lg border space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white text-[10px] border-0">
                {formScope}
              </Badge>
              <span className={`w-2 h-2 rounded-full ${
                PRIORITY_OPTIONS.find(p => p.value === formPriority)?.color || "bg-gray-400"
              }`} />
              <span className="text-[10px] text-muted-foreground">
                {PRIORITY_OPTIONS.find(p => p.value === formPriority)
                  ?.[language === "zh" ? "label" : "labelEn"] || "P3"}
              </span>
            </div>
            <h3 className="font-semibold text-sm">{formTitle}</h3>
            {formRules && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {language === "zh" ? "规则: " : "Rules: "}{formRules}
              </p>
            )}
            {formCategories.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {formCategories.map(cat => (
                  <Badge key={cat} variant="outline" className="text-[9px] px-1 py-0">{cat}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Execution Engine Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* ── Option 1: Local CLI ── */}
            <button
              className={`p-4 rounded-lg border-2 text-left transition-all hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-950/20 ${
                launchMode === "local"
                  ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                  : "border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => setLaunchMode("local")}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {language === "zh" ? "本地 CLI" : "Local CLI"}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {language === "zh"
                      ? "生成 Claude CLI 命令"
                      : "Generate Claude CLI Command"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === "zh"
                  ? "复制命令到终端，在本地机器上执行 Claude"
                  : "Copy command to terminal, execute Claude on local machine"}
              </p>
            </button>

            {/* ── Option 2: Cloud GitHub Actions ── */}
            <button
              className={`p-4 rounded-lg border-2 text-left transition-all hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 ${
                launchMode === "cloud"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : "border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => setLaunchMode("cloud")}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {language === "zh" ? "云端 GitHub Actions" : "Cloud GitHub Actions"}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {language === "zh"
                      ? "触发 Auto-Dev 流水线"
                      : "Trigger Auto-Dev Pipeline"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === "zh"
                  ? "通过 GitHub API 触发云端 CI/CD 流水线"
                  : "Trigger cloud CI/CD pipeline via GitHub Actions API"}
              </p>
            </button>
          </div>

          {/* ── Local CLI: Copyable Command Block ── */}
          {launchMode === "local" && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">
                  {language === "zh" ? "Claude CLI 命令" : "Claude CLI Command"}
                </span>
              </div>
              <div className="relative">
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                  {generateCliCommand()}
                </pre>
                <Button
                  size="sm"
                  className={`absolute top-2 right-2 h-8 gap-1.5 ${
                    cliCopied
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                  onClick={handleCopyCliCommand}
                >
                  {cliCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {language === "zh" ? "已复制" : "Copied"}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      {language === "zh" ? "复制" : "Copy"}
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <GitBranch className="w-3 h-3" />
                {language === "zh"
                  ? "粘贴到终端执行。任务将同时记录到执行队列。"
                  : "Paste into terminal to execute. Task will also be tracked in the queue."}
              </p>
            </div>
          )}

          {/* ── Cloud: GitHub Actions Trigger ── */}
          {launchMode === "cloud" && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">
                  {language === "zh"
                    ? "GitHub Actions 云端执行"
                    : "GitHub Actions Cloud Execution"}
                </span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {language === "zh" ? "工作流" : "Workflow"}:
                  </span>
                  <code className="font-mono text-blue-600 dark:text-blue-400">
                    claude-auto-dev.yml
                  </code>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {language === "zh" ? "触发方式" : "Trigger"}:
                  </span>
                  <code className="font-mono text-blue-600 dark:text-blue-400">
                    repository_dispatch → claude-task
                  </code>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {language === "zh" ? "执行环境" : "Runner"}:
                  </span>
                  <code className="font-mono text-blue-600 dark:text-blue-400">
                    ubuntu-latest (GitHub-hosted)
                  </code>
                </div>
              </div>

              {githubDispatchMutation.isSuccess ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      {language === "zh"
                        ? "GitHub Actions 已触发！"
                        : "GitHub Action Triggered!"}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {language === "zh"
                        ? "流水线正在云端执行中..."
                        : "Pipeline running in the cloud..."}
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 gap-2"
                  onClick={handleTriggerGitHub}
                  disabled={githubDispatchMutation.isPending}
                >
                  {githubDispatchMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  {language === "zh"
                    ? githubDispatchMutation.isPending
                      ? "正在触发..."
                      : "触发 GitHub Actions"
                    : githubDispatchMutation.isPending
                    ? "Triggering..."
                    : "Trigger GitHub Actions (Auto-Dev)"}
                </Button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLaunchModalOpen(false)}
            >
              {language === "zh" ? "关闭" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          HITL: Claude Execution Condition Approval Box
          ──────────────────────────────────────────────
          Floating panel that appears when Claude CLI writes a question
          to data/dev-queue/questions/. The CEO types an answer and
          clicks [Confirm & Resume Claude]. The answer is written to
          data/dev-queue/answers/ so Claude CLI can resume execution.
         ══════════════════════════════════════════════════════════════ */}
      {pendingQuestions.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[90vw] animate-in slide-in-from-bottom-5 duration-300">
          <div className="rounded-xl border-2 border-orange-400 bg-white dark:bg-gray-900 shadow-2xl shadow-orange-200/40 dark:shadow-orange-900/20 overflow-hidden">
            {/* Header bar — orange warning style */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <div className="flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 animate-pulse" />
                <span className="font-semibold text-sm">
                  {language === "zh"
                    ? "Claude 执行条件批准框"
                    : "Claude Execution Approval"}
                </span>
                <Badge className="bg-white/20 text-white text-[10px] border-0">
                  {pendingQuestions.length}
                </Badge>
              </div>
              <button
                onClick={() => setHitlMinimized(!hitlMinimized)}
                className="p-1 rounded hover:bg-white/20 transition-colors"
              >
                {hitlMinimized ? (
                  <MessageSquareWarning className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Body — question cards */}
            {!hitlMinimized && (
              <div className="max-h-[400px] overflow-y-auto p-3 space-y-3">
                {pendingQuestions.map((q: any) => (
                  <div
                    key={q.taskId}
                    className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 p-3 space-y-2"
                  >
                    {/* Task ID + timestamp */}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] font-mono border-orange-300 text-orange-700 dark:text-orange-400">
                        Task #{q.taskId}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(q.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Question */}
                    <div className="text-sm font-medium text-orange-900 dark:text-orange-200">
                      {q.question}
                    </div>

                    {/* Context (if provided) */}
                    {q.context && (
                      <p className="text-xs text-muted-foreground bg-white dark:bg-gray-800 rounded p-2 border">
                        {q.context}
                      </p>
                    )}

                    {/* Quick-pick option buttons (if provided) */}
                    {q.options.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {q.options.map((opt: string, i: number) => (
                          <button
                            key={i}
                            className="px-2.5 py-1 text-xs rounded-full border border-orange-300 dark:border-orange-700 bg-white dark:bg-gray-800 hover:bg-orange-100 dark:hover:bg-orange-950 text-orange-700 dark:text-orange-300 transition-colors"
                            onClick={() =>
                              setHitlAnswers((prev) => ({
                                ...prev,
                                [q.taskId]: opt,
                              }))
                            }
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Answer input + submit */}
                    <div className="flex gap-2">
                      <Input
                        value={hitlAnswers[q.taskId] ?? ""}
                        onChange={(e) =>
                          setHitlAnswers((prev) => ({
                            ...prev,
                            [q.taskId]: e.target.value,
                          }))
                        }
                        placeholder={
                          language === "zh"
                            ? "输入您的决策..."
                            : "Type your decision..."
                        }
                        className="flex-1 h-9 text-sm border-orange-200 dark:border-orange-800 focus:ring-orange-400"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && hitlAnswers[q.taskId]?.trim()) {
                            answerMutation.mutate({
                              taskId: q.taskId,
                              answer: hitlAnswers[q.taskId],
                            });
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-9 bg-orange-500 hover:bg-orange-600 text-white whitespace-nowrap"
                        disabled={
                          !hitlAnswers[q.taskId]?.trim() ||
                          answerMutation.isPending
                        }
                        onClick={() =>
                          answerMutation.mutate({
                            taskId: q.taskId,
                            answer: hitlAnswers[q.taskId],
                          })
                        }
                      >
                        {answerMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            {language === "zh" ? "确认" : "Confirm"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TASK DETAIL DIALOG
          ──────────────────
          Opens when the CEO clicks a task card in Column 3.
          Shows full task details, stage history, and control buttons:
            - Promote: advance to next pipeline stage
            - Reject: rollback to DEV with a reason
            - Update Status: change status within current stage
            - Delete: remove from queue entirely
         ══════════════════════════════════════════════════════════════ */}
      {selectedTaskId && (() => {
        // Find the selected task from the list
        const task = (taskListQuery.data || []).find(
          (t: any) => t.id === selectedTaskId
        );
        if (!task) return null;

        const status = getActiveStatus(task);
        const canPromote = task.currentStage !== "PROD";

        return (
          <Dialog
            open={!!selectedTaskId}
            onOpenChange={() => setSelectedTaskId(null)}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  {task.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Pipeline stage visualization (large) */}
                <div className="flex items-center justify-center gap-2">
                  {(["DEV", "TEST", "PROD"] as const).map((stage, i) => (
                    <div key={stage} className="flex items-center gap-2">
                      <div
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          task.currentStage === stage
                            ? "bg-blue-600 text-white"
                            : i <
                              ["DEV", "TEST", "PROD"].indexOf(
                                task.currentStage
                              )
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                        }`}
                      >
                        {stage}
                      </div>
                      {i < 2 && (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Task metadata grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">
                      {language === "zh" ? "当前状态" : "Status"}
                    </span>
                    <p className="font-medium">{status}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">
                      {language === "zh" ? "优先级" : "Priority"}
                    </span>
                    <p className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          PRIORITY_OPTIONS.find(
                            (p) => p.value === task.priority
                          )?.color || "bg-gray-400"
                        }`}
                      />
                      {PRIORITY_OPTIONS.find((p) => p.value === task.priority)
                        ?.[language === "zh" ? "label" : "labelEn"] || "P3"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">
                      {language === "zh" ? "执行者" : "Assignee"}
                    </span>
                    <p className="font-medium">{task.assignee || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">
                      {language === "zh" ? "来源模式" : "Source"}
                    </span>
                    <p className="font-medium">{task.sourceMode}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">
                      {language === "zh" ? "分类" : "Categories"}
                    </span>
                    <div className="flex gap-1.5 mt-0.5 flex-wrap">
                      {Array.isArray(task.categories) &&
                        task.categories.map((cat: string) => (
                          <Badge
                            key={cat}
                            variant="outline"
                            className="text-xs"
                          >
                            {cat}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  {task.rules && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs">
                        {language === "zh" ? "验收规则" : "Rules"}
                      </span>
                      <p className="text-sm bg-muted p-2 rounded mt-0.5">
                        {task.rules}
                      </p>
                    </div>
                  )}
                  {/* CEO approval status display */}
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">
                      {language === "zh" ? "CEO审批" : "CEO Approvals"}
                    </span>
                    <div className="flex gap-3 mt-1">
                      {(["Dev", "Test", "Prod"] as const).map((s) => {
                        const key = `ceoApproved${s}` as keyof typeof task;
                        const approved = !!(task as any)[key];
                        return (
                          <span
                            key={s}
                            className={`text-xs flex items-center gap-1 ${
                              approved
                                ? "text-green-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {approved ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {s}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Stage Transition Audit Log ──
                      Every promote, reject, and create action is logged
                      in cicd_stage_logs. This gives the CEO full visibility
                      into the lifecycle of each task through the pipeline. */}
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">
                      {language === "zh" ? "阶段变更记录" : "Stage Transition Log"}
                    </span>
                    <div className="mt-1 space-y-1.5 max-h-[160px] overflow-y-auto">
                      {stageLogsQuery.isLoading && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {language === "zh" ? "加载中..." : "Loading..."}
                        </div>
                      )}
                      {stageLogsQuery.data &&
                        (stageLogsQuery.data as any[]).length === 0 && (
                          <p className="text-xs text-muted-foreground py-1">
                            {language === "zh" ? "暂无记录" : "No logs yet"}
                          </p>
                        )}
                      {stageLogsQuery.data &&
                        (stageLogsQuery.data as any[]).map((log: any) => (
                          <div
                            key={log.id}
                            className="flex items-start gap-2 text-xs border-l-2 border-blue-200 dark:border-blue-800 pl-2 py-0.5"
                          >
                            <span
                              className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                log.action === "promote"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                  : log.action === "reject"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              }`}
                            >
                              {log.action}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="text-muted-foreground">
                                {log.fromStage ? `${log.fromStage} → ` : ""}
                                {log.toStage}
                              </span>
                              {log.note && (
                                <p className="text-muted-foreground truncate">
                                  {log.note}
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {log.actor || "—"}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Dialog Action Buttons ──
                  These are the CEO's pipeline management controls:
                  Promote: Advance to next stage (requires CEO go-ahead)
                  Reject: Rollback to DEV (with auto-reason)
                  Start/Complete: Update status within current stage
                  Delete: Remove task from pipeline entirely */}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {/* Delete button (danger) */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (
                      confirm(
                        language === "zh"
                          ? "确定要删除此任务吗？"
                          : "Delete this task?"
                      )
                    ) {
                      deleteMutation.mutate({ id: task.id });
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {language === "zh" ? "删除" : "Delete"}
                </Button>

                {/* Reject / Rollback to DEV */}
                {task.currentStage !== "DEV" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      rejectMutation.mutate({
                        id: task.id,
                        reason:
                          language === "zh"
                            ? "CEO退回至DEV阶段"
                            : "CEO rejected — rolled back to DEV",
                        rollbackTo: "DEV",
                      });
                    }}
                    disabled={rejectMutation.isPending}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    {language === "zh" ? "退回DEV" : "Rollback"}
                  </Button>
                )}

                {/* Status update within current stage */}
                {status === "PENDING" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateStageMutation.mutate({
                        id: task.id,
                        status: "IN_PROGRESS",
                      })
                    }
                  >
                    <PlayCircle className="w-4 h-4 mr-1" />
                    {language === "zh" ? "开始执行" : "Start"}
                  </Button>
                )}
                {status === "IN_PROGRESS" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600"
                    onClick={() =>
                      updateStageMutation.mutate({
                        id: task.id,
                        status: "COMPLETED",
                      })
                    }
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {language === "zh" ? "标记完成" : "Complete"}
                  </Button>
                )}

                {/* Promote to next stage (primary action) */}
                {canPromote && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() =>
                      promoteMutation.mutate({ id: task.id })
                    }
                    disabled={promoteMutation.isPending}
                  >
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    {language === "zh"
                      ? `推进至 ${
                          task.currentStage === "DEV" ? "TEST" : "PROD"
                        }`
                      : `Promote → ${
                          task.currentStage === "DEV" ? "TEST" : "PROD"
                        }`}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
