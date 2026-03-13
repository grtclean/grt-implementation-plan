/**
 * ProjectInteractionTimeline — 项目交互时间轴
 *
 * 高级 CRM 风格时间轴:
 *   - 左侧 M0-M12 里程碑节点 (垂直时间轴)
 *   - 点击会议节点 → 展示 AI 提取的红字需求 (痛点/风险)
 *   - 下方【基于此反馈生成新方案草稿】按钮 → 调用 iterateProposal
 *   - 全程骨架屏 + Tailwind CSS
 */
import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/grt";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Lightbulb,
  FileText,
  Loader2,
  ChevronRight,
  Milestone,
  Sparkles,
  Users,
  MessageSquareWarning,
  RefreshCw,
  Send,
  MessageCircle,
  GitCompareArrows,
  ArrowRightToLine,
  DollarSign,
  ListChecks,
  ShieldAlert,
  Database,
  Hash,
  Plus,
  Link,
  ShieldCheck,
  Pencil,
  Truck,
  MapPin,
  TestTube2,
  GraduationCap,
  Rocket,
  MessageSquare,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

/** M0-M12 里程碑阶段 — labels resolved via i18n t("mi.m0")…t("mi.m12") */
const MILESTONE_KEYS = ["M0","M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12"] as const;
const MILESTONE_I18N: Record<string, string> = {
  M0: "mi.m0", M1: "mi.m1", M2: "mi.m2", M3: "mi.m3", M4: "mi.m4",
  M5: "mi.m5", M6: "mi.m6", M7: "mi.m7", M8: "mi.m8", M9: "mi.m9",
  M10: "mi.m10", M11: "mi.m11", M12: "mi.m12",
};

/** Meeting category → Lucide icon mapping */
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CUSTOMER_MEETING: Users,
  GATE_REVIEW: ShieldCheck,
  DESIGN_REVIEW: Pencil,
  TEAM_SYNC: RefreshCw,
  SUPPLIER_MEETING: Truck,
  SITE_VISIT: MapPin,
  FAT_SAT: TestTube2,
  TRAINING: GraduationCap,
  PROJECT_KICKOFF: Rocket,
  OTHER: MessageSquare,
};

const CATEGORY_KEYS = [
  "CUSTOMER_MEETING", "GATE_REVIEW", "DESIGN_REVIEW", "TEAM_SYNC",
  "SUPPLIER_MEETING", "SITE_VISIT", "FAT_SAT", "TRAINING", "PROJECT_KICKOFF", "OTHER",
] as const;

const CATEGORY_I18N: Record<string, string> = {
  CUSTOMER_MEETING: "mi.category.customerMeeting",
  GATE_REVIEW: "mi.category.gateReview",
  DESIGN_REVIEW: "mi.category.designReview",
  TEAM_SYNC: "mi.category.teamSync",
  SUPPLIER_MEETING: "mi.category.supplierMeeting",
  SITE_VISIT: "mi.category.siteVisit",
  FAT_SAT: "mi.category.fatSat",
  TRAINING: "mi.category.training",
  PROJECT_KICKOFF: "mi.category.projectKickoff",
  OTHER: "mi.category.other",
};

const DIRECTION_COLORS: Record<string, string> = {
  INTERNAL: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  EXTERNAL: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

interface MeetingNode {
  id: number;
  title: string;
  milestone: string;
  stageCode: string | null;
  meetingCategory: string;
  direction: string;
  scheduledStart: string | null;
  status: string;
  type: string;
  projectId: number | null;
  departmentId: number | null;
  aiSummary: {
    highlights?: string[];
    decisions?: string[];
    risks?: string[];
    nextSteps?: string[];
    sentiment?: string;
    generatedAt?: string;
  } | null;
  transcript: string | null;
}

interface VersionEntry {
  id: number;
  version: number;
  parentProposalId: number | null;
  iterationReason: string | null;
  status: string;
  createdBy: string | null;
  createdAt: string | null;
}

// ═══════════════════════════════════════════════════════════
// Query options
// ═══════════════════════════════════════════════════════════
const Q = { retry: false, refetchOnWindowFocus: false } as const;

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

/** 骨架屏：时间轴加载态 */
function TimelineSkeleton() {
  return (
    <div className="space-y-6 py-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 骨架屏：AI 摘要面板 */
function SummarySkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
      <Separator className="my-3" />
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Separator className="my-3" />
      <Skeleton className="h-10 w-56 rounded-md" />
    </div>
  );
}

/** 转写文本输入面板 */
function TranscriptInputPanel({
  meetingId,
  onAnalysisStarted,
}: {
  meetingId: number;
  onAnalysisStarted: (taskId: number) => void;
}) {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const analyzeMutation = trpc.meetingIntelligence.analyzeMeetingTranscript.useMutation({
    onSuccess: (data) => onAnalysisStarted(data.taskId),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t("mi.transcript")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          className="w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={t("mi.transcriptPlaceholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={100_000}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t("mi.charCount")}: {text.length.toLocaleString()}
          </span>
          <Button
            size="sm"
            disabled={!text.trim() || analyzeMutation.isPending}
            onClick={() => analyzeMutation.mutate({ meetingId, transcript: text.trim() })}
          >
            {analyzeMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            {t("mi.submitAnalysis")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** 客户反馈录入表单 */
function CustomerFeedbackForm({ projectId, meetingId }: { projectId: number; meetingId?: number }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [feedbackType, setFeedbackType] = useState<"pain_point" | "requirement_change" | "objection" | "budget_signal">("pain_point");
  const [severity, setSeverity] = useState<"high" | "medium" | "low">("medium");
  const [content, setContent] = useState("");

  const submitMutation = trpc.meetingIntelligence.submitCustomerFeedback.useMutation({
    onSuccess: () => {
      setContent("");
      toast({ title: t("mi.submitFeedback"), description: "OK" });
    },
  });

  const typeOptions = [
    { value: "pain_point" as const, label: t("mi.feedbackType.painPoint") },
    { value: "requirement_change" as const, label: t("mi.feedbackType.requirementChange") },
    { value: "objection" as const, label: t("mi.feedbackType.objection") },
    { value: "budget_signal" as const, label: t("mi.feedbackType.budgetSignal") },
  ];
  const severityOptions = [
    { value: "high" as const, label: t("mi.severity.high") },
    { value: "medium" as const, label: t("mi.severity.medium") },
    { value: "low" as const, label: t("mi.severity.low") },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          {t("mi.customerFeedback")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("mi.feedbackType")}</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value as typeof feedbackType)}
            >
              {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("mi.severity")}</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as typeof severity)}
            >
              {severityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <textarea
          className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={t("mi.customerFeedback")}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={5000}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!content.trim() || submitMutation.isPending}
            onClick={() => submitMutation.mutate({ projectId, meetingId, feedbackType, severity, content: content.trim() })}
          >
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            {t("mi.submitFeedback")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** 方案版本对比面板 */
function ProposalDiffPanel({
  oldProposalId,
  newProposalId,
  onConfirm,
}: {
  oldProposalId: number;
  newProposalId: number;
  onConfirm: (acceptedFields: string[]) => void;
}) {
  const { t } = useLanguage();
  const [accepted, setAccepted] = useState<Set<string>>(new Set(["processFlow", "equipmentConfig", "budgetEstimate"]));

  const diffQuery = trpc.meetingIntelligence.getProposalDiff.useQuery(
    { oldProposalId, newProposalId },
    { ...Q, enabled: oldProposalId > 0 && newProposalId > 0 },
  );

  const toggle = (field: string) => {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field); else next.add(field);
      return next;
    });
  };

  if (diffQuery.isLoading) return <SummarySkeleton />;
  const diff = diffQuery.data;
  if (!diff) return null;

  const fields = [
    { key: "processFlow", label: "Process Flow", diff: diff.processFlowDiff },
    { key: "equipmentConfig", label: "Equipment Config", diff: diff.equipmentConfigDiff },
    { key: "budgetEstimate", label: "Budget Estimate", diff: diff.budgetEstimateDiff },
  ];

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4" />
          {t("mi.proposalDiff")} V{diff.oldVersion} → V{diff.newVersion}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map(({ key, label, diff: d }) => {
          const hasChanges = d.added.length > 0 || d.removed.length > 0 || d.changed.length > 0;
          return (
            <div key={key} className="rounded-lg border p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted.has(key)}
                  onChange={() => toggle(key)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">{label}</span>
                {hasChanges && (
                  <Badge variant="secondary" className="text-[10px]">
                    +{d.added.length} -{d.removed.length} ~{d.changed.length}
                  </Badge>
                )}
              </label>
              {hasChanges && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-red-50 dark:bg-red-950/20 rounded p-2">
                    <p className="font-medium text-red-600 mb-1">{t("mi.oldVersion")}</p>
                    {d.changed.map((k) => (
                      <p key={k} className="truncate text-red-800 dark:text-red-300">
                        {k}: {JSON.stringify(d.oldValues[k]).slice(0, 60)}
                      </p>
                    ))}
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded p-2">
                    <p className="font-medium text-green-600 mb-1">{t("mi.newVersion")}</p>
                    {d.changed.map((k) => (
                      <p key={k} className="truncate text-green-800 dark:text-green-300">
                        {k}: {JSON.stringify(d.newValues[k]).slice(0, 60)}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="flex justify-end">
          <Button size="sm" onClick={() => onConfirm(Array.from(accepted))}>
            <ListChecks className="h-4 w-4 mr-1" />
            {t("mi.confirmMerge")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** M3 推送确认对话框 */
function M3PushButton({ proposalId, onPushed }: { proposalId: number; onPushed: () => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);

  const pushMutation = trpc.meetingIntelligence.pushToM3.useMutation({
    onSuccess: () => {
      toast({ title: t("mi.pushSuccess") });
      setConfirming(false);
      onPushed();
    },
    onError: (err) => {
      toast({ title: t("mi.pushFailed"), description: err.message, variant: "destructive" });
    },
  });

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        <ArrowRightToLine className="h-4 w-4 mr-1" />
        {t("mi.pushToM3")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20">
      <p className="text-sm flex-1">{t("mi.pushConfirm")}</p>
      <Button
        size="sm"
        variant="destructive"
        disabled={pushMutation.isPending}
        onClick={() => pushMutation.mutate({ proposalId })}
      >
        {pushMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("mi.pushToM3")}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}

/** 里程碑节点 — 时间轴左侧圆圈 */
function MilestoneIcon({ status, isActive }: { status: "completed" | "active" | "upcoming"; isActive: boolean }) {
  const base = "flex items-center justify-center h-10 w-10 rounded-full border-2 flex-shrink-0 transition-all duration-200";
  if (status === "completed") {
    return (
      <div className={`${base} border-emerald-500 bg-emerald-50 dark:bg-emerald-950 ${isActive ? "ring-2 ring-emerald-300" : ""}`}>
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className={`${base} border-blue-500 bg-blue-50 dark:bg-blue-950 ${isActive ? "ring-2 ring-blue-300" : ""}`}>
        <Circle className="h-5 w-5 text-blue-600 fill-blue-600" />
      </div>
    );
  }
  return (
    <div className={`${base} border-gray-300 bg-gray-50 dark:bg-gray-900 ${isActive ? "ring-2 ring-gray-400" : ""}`}>
      <Circle className="h-5 w-5 text-gray-400" />
    </div>
  );
}

/** 红字需求面板 — AI 提取的痛点/风险 */
function AiInsightsPanel({
  meeting,
  onIterate,
  isIterating,
  projectId,
}: {
  meeting: MeetingNode;
  onIterate: () => void;
  isIterating: boolean;
  projectId: number;
}) {
  const { t } = useLanguage();
  const summary = meeting.aiSummary;

  // Fetch project feedback for this meeting's project
  const feedbackQuery = trpc.meetingIntelligence.getProjectFeedback.useQuery(
    { projectId, limit: 20 },
    { ...Q, enabled: projectId > 0 },
  );
  const feedbacks = feedbackQuery.data ?? [];
  const budgetSignals = feedbacks.filter((f) => f.feedbackType === "budget_signal");
  const requirementChanges = feedbacks.filter((f) => f.feedbackType === "requirement_change");
  const objections = feedbacks.filter((f) => f.feedbackType === "objection");
  const hasInsights = summary && (
    (summary.risks && summary.risks.length > 0) ||
    (summary.highlights && summary.highlights.length > 0) ||
    (summary.decisions && summary.decisions.length > 0) ||
    (summary.nextSteps && summary.nextSteps.length > 0)
  );

  return (
    <Card className="border-l-4 border-l-red-500 shadow-lg animate-in fade-in slide-in-from-right-2 duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            {t("mi.aiAnalysis")} — {meeting.title}
          </CardTitle>
          {summary?.sentiment && (
            <Badge variant={summary.sentiment === "negative" ? "destructive" : "secondary"} className="text-xs">
              {summary.sentiment === "negative" ? t("mi.sentiment.negative") : t("mi.sentiment.positive")}
            </Badge>
          )}
        </div>
        {summary?.generatedAt && (
          <p className="text-xs text-muted-foreground">
            {t("mi.analysisTime")}: {new Date(summary.generatedAt).toLocaleString()}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 红字需求 / 风险 */}
        {summary?.risks && summary.risks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-4 w-4" />
              {t("mi.painPoints")} ({summary.risks.length})
            </h4>
            <ul className="space-y-1.5">
              {summary.risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
                  <MessageSquareWarning className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-800 dark:text-red-300">{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 决策 */}
        {summary?.decisions && summary.decisions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-4 w-4" />
              {t("mi.decisions")} ({summary.decisions.length})
            </h4>
            <ul className="space-y-1.5">
              {summary.decisions.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2">
                  <ChevronRight className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-blue-800 dark:text-blue-300">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {summary?.nextSteps && summary.nextSteps.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-2">
              <FileText className="h-4 w-4" />
              {t("mi.actionItems")} ({summary.nextSteps.length})
            </h4>
            <ul className="space-y-1">
              {summary.nextSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm pl-2">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs font-medium flex-shrink-0">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 预算信号 */}
        {budgetSignals.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
              <DollarSign className="h-4 w-4" />
              {t("mi.budgetSignals")} ({budgetSignals.length})
            </h4>
            <ul className="space-y-1.5">
              {budgetSignals.map((bs) => (
                <li key={bs.id} className="flex items-start gap-2 text-sm bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md px-3 py-2">
                  <DollarSign className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-emerald-800 dark:text-emerald-300">{bs.content}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 需求变更 */}
        {requirementChanges.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1.5 mb-2">
              <ListChecks className="h-4 w-4" />
              {t("mi.requirementChanges")} ({requirementChanges.length})
            </h4>
            <ul className="space-y-1.5">
              {requirementChanges.map((rc) => (
                <li key={rc.id} className="flex items-start gap-2 text-sm bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md px-3 py-2">
                  <ChevronRight className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span className="text-orange-800 dark:text-orange-300">{rc.content}</span>
                  <Badge variant={rc.severity === "high" ? "destructive" : "secondary"} className="text-[10px] ml-auto flex-shrink-0">
                    {rc.severity}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 客户异议 */}
        {objections.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1.5 mb-2">
              <ShieldAlert className="h-4 w-4" />
              {t("mi.objections")} ({objections.length})
            </h4>
            <ul className="space-y-1.5">
              {objections.map((obj) => (
                <li key={obj.id} className="flex items-start gap-2 text-sm bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-md px-3 py-2">
                  <ShieldAlert className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
                  <span className="text-violet-800 dark:text-violet-300">{obj.content}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 无 AI 分析 */}
        {!hasInsights && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">{t("mi.noAnalysis")}</p>
            <p className="text-xs mt-1">{t("mi.noAnalysisDesc")}</p>
          </div>
        )}

        <Separator />

        {/* 方案迭代按钮 */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onIterate}
            disabled={isIterating || !hasInsights}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
          >
            {isIterating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("mi.iterating")}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("mi.iterateBtn")}
              </>
            )}
          </Button>
          {!hasInsights && (
            <span className="text-xs text-muted-foreground">{t("mi.needAnalysisFirst")}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** 版本历史面板 */
function VersionHistoryPanel({ versions, isLoading }: { versions: VersionEntry[]; isLoading: boolean }) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }
  if (!versions.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Milestone className="h-4 w-4" />
          {t("mi.versionHistory")} ({versions.length} {t("mi.versions")})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {versions.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors text-sm"
            >
              <Badge variant="outline" className="font-mono text-xs min-w-[42px] justify-center">
                V{v.version}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                  {v.iterationReason || t("mi.initialVersion")}
                </p>
              </div>
              <Badge
                variant={v.status === "APPROVED" ? "default" : v.status === "DRAFT" ? "secondary" : "outline"}
                className="text-xs"
              >
                {v.status}
              </Badge>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : ""}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** T-项目选择器 — 选择/创建 T-项目编号 */
function TProjectSelector({
  tProjects,
  selectedId,
  onSelect,
  onCreateNew,
  onConvert,
}: {
  tProjects: Array<{ id: number; tNumber: string; displayName: string; status: string; grtNumber: string | null }>;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onCreateNew: () => void;
  onConvert: () => void;
}) {
  const { t } = useLanguage();
  const selected = tProjects.find(p => p.id === selectedId);

  return (
    <Card className="border-l-4 border-l-violet-500">
      <CardContent className="py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Hash className="h-4 w-4 text-violet-600" />
          <span className="text-sm font-medium">{t("mi.tProject.label")}</span>
          <select
            className="border rounded px-2 py-1 text-sm min-w-[200px] bg-background"
            value={selectedId ?? ""}
            onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">{t("mi.tProject.selectPlaceholder")}</option>
            {tProjects.map(p => (
              <option key={p.id} value={p.id}>
                {p.tNumber} — {p.displayName} [{p.status}]
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={onCreateNew}>
            <Plus className="h-3 w-3 mr-1" /> {t("mi.tProject.createNew")}
          </Button>
          {selected && selected.status === "ORDER_RECEIVED" && !selected.grtNumber && (
            <Button size="sm" variant="default" onClick={onConvert}>
              <ArrowRightToLine className="h-3 w-3 mr-1" /> {t("mi.tProject.convertToGRT")}
            </Button>
          )}
          {selected?.grtNumber && (
            <Badge variant="default" className="bg-green-600">{selected.grtNumber}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** 沟通后三输出操作按钮 */
function PostCommActionButtons({
  tProjectId,
  meetingId,
  convertedProjectId,
  onRouteToM2,
  onAnalyzeComm,
  onRecordEvidence,
  isAnalyzing,
}: {
  tProjectId: number;
  meetingId?: number;
  convertedProjectId?: number | null;
  onRouteToM2: () => void;
  onAnalyzeComm: () => void;
  onRecordEvidence: () => void;
  isAnalyzing: boolean;
}) {
  const { t } = useLanguage();
  void tProjectId;
  void meetingId;

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          {t("mi.tProject.postCommActions")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button variant="outline" className="justify-start h-auto py-2" onClick={onRouteToM2}>
            <Lightbulb className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-left">{t("mi.tProject.action.simulateSolution")}</span>
          </Button>
          <Button variant="outline" className="justify-start h-auto py-2" onClick={onAnalyzeComm} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" /> : <Sparkles className="h-4 w-4 mr-2 text-amber-500 flex-shrink-0" />}
            <span className="text-sm text-left">{t("mi.tProject.action.analyzeComm")}</span>
          </Button>
          <Button variant="outline" className="justify-start h-auto py-2" onClick={onRecordEvidence}>
            <Database className="h-4 w-4 mr-2 text-emerald-500 flex-shrink-0" />
            <span className="text-sm text-left">{t("mi.tProject.action.recordEvidence")}</span>
          </Button>
        </div>
        {convertedProjectId === undefined && (
          <p className="text-xs text-muted-foreground mt-2 italic">{t("mi.tProject.needConvert")}</p>
        )}
      </CardContent>
    </Card>
  );
}

/** 会议筛选栏 — 按类别/方向过滤 */
function MeetingFilterBar({
  categoryFilter,
  directionFilter,
  onCategoryChange,
  onDirectionChange,
}: {
  categoryFilter: string | null;
  directionFilter: string | null;
  onCategoryChange: (cat: string | null) => void;
  onDirectionChange: (dir: string | null) => void;
}) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{t("mi.meetingCategory")}:</span>
          <button
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${!categoryFilter ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => onCategoryChange(null)}
          >
            {t("mi.allCategories")}
          </button>
          {CATEGORY_KEYS.map((cat) => {
            const CatIcon = CATEGORY_ICONS[cat] ?? MessageSquare;
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                className={`text-xs px-2 py-1 rounded-full border transition-colors flex items-center gap-1 ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => onCategoryChange(active ? null : cat)}
              >
                <CatIcon className="h-3 w-3" />
                {t(CATEGORY_I18N[cat])}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{t("mi.meetingDirection")}:</span>
          {([null, "INTERNAL", "EXTERNAL"] as const).map((dir) => (
            <button
              key={dir ?? "all"}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${directionFilter === dir ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              onClick={() => onDirectionChange(dir)}
            >
              {dir === null ? t("mi.allDirections") : t(`mi.direction.${dir.toLowerCase()}`)}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** 创建阶段会议对话框 */
function CreateStageMeetingDialog({
  initialStageCode,
  tProjectId,
  onCreated,
  onCancel,
}: {
  initialStageCode: string;
  tProjectId: number | null;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [stageCode, setStageCode] = useState(initialStageCode);
  const [category, setCategory] = useState("CUSTOMER_MEETING");
  const [direction, setDirection] = useState("INTERNAL");
  const [description, setDescription] = useState("");

  const createMutation = trpc.smartMeeting.meeting.createStageMeeting.useMutation({
    onSuccess: () => {
      toast({ title: t("mi.stageMeetingCreated") });
      onCreated();
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card className="border-l-4 border-l-indigo-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("mi.createMeeting")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("mi.selectStage")}</label>
            <select className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" value={stageCode} onChange={(e) => setStageCode(e.target.value)}>
              {MILESTONE_KEYS.map((k) => <option key={k} value={k}>{k} — {t(MILESTONE_I18N[k])}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("mi.selectCategory")}</label>
            <select className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_KEYS.map((c) => <option key={c} value={c}>{t(CATEGORY_I18N[c])}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("mi.selectDirection")}</label>
            <div className="flex items-center gap-3 mt-1">
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input type="radio" name="dir" value="INTERNAL" checked={direction === "INTERNAL"} onChange={() => setDirection("INTERNAL")} />
                {t("mi.direction.internal")}
              </label>
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input type="radio" name="dir" value="EXTERNAL" checked={direction === "EXTERNAL"} onChange={() => setDirection("EXTERNAL")} />
                {t("mi.direction.external")}
              </label>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("mi.createMeeting")}</label>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("mi.createMeeting")}
            maxLength={500}
          />
        </div>
        <textarea
          className="w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("mi.desc")}
          maxLength={5000}
        />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm"
            disabled={!title.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate({
              title: title.trim(),
              stageCode: stageCode as "M0",
              meetingCategory: category as "CUSTOMER_MEETING",
              direction: direction as "INTERNAL",
              description: description.trim() || undefined,
              tProjectId: tProjectId ?? undefined,
            })}
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            {t("mi.createMeeting")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function ProjectInteractionTimeline() {
  const { t } = useLanguage();

  // ── State ─────────────────────────────────────────────────
  const [selectedTProjectId, setSelectedTProjectId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTProjectName, setNewTProjectName] = useState("");
  const [newTProjectCustomer, setNewTProjectCustomer] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingNode | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
  const [iterationTaskId, setIterationTaskId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState<string | null>(null);
  const [showCreateMeetingDialog, setShowCreateMeetingDialog] = useState(false);
  const [createMeetingStageCode, setCreateMeetingStageCode] = useState("M0");
  const [analysisTaskId, setAnalysisTaskId] = useState<number | null>(null);
  const { toast } = useToast();

  // ── Queries ───────────────────────────────────────────────
  const meetingsQuery = trpc.smartMeeting.meeting.list.useQuery(
    { limit: 100 },
    Q,
  );

  // 版本历史（当选中会议关联了方案时查询）
  const versionsQuery = trpc.meetingIntelligence.getProposalVersionHistory.useQuery(
    { requirementId: selectedProposalId ?? 0 },
    { ...Q, enabled: !!selectedProposalId },
  );

  // 轮询迭代状态
  const iterationStatusQuery = trpc.meetingIntelligence.getIterationStatus.useQuery(
    { taskId: iterationTaskId ?? 0 },
    {
      ...Q,
      enabled: !!iterationTaskId,
      refetchInterval: iterationTaskId ? 2000 : false,
    },
  );

  // 轮询转写分析状态
  const analysisStatusQuery = trpc.meetingIntelligence.getAnalysisStatus.useQuery(
    { taskId: analysisTaskId ?? 0 },
    {
      ...Q,
      enabled: !!analysisTaskId,
      refetchInterval: analysisTaskId ? 2000 : false,
    },
  );

  // 当分析完成时停止轮询并刷新会议列表
  const analysisDone = analysisStatusQuery.data?.status === "completed" || analysisStatusQuery.data?.status === "failed";
  useEffect(() => {
    if (analysisDone && analysisTaskId) {
      setAnalysisTaskId(null);
      if (analysisStatusQuery.data?.status === "completed") {
        meetingsQuery.refetch();
        toast({ title: t("mi.iterationComplete") });
      }
    }
  }, [analysisDone, analysisTaskId, analysisStatusQuery.data?.status, meetingsQuery, toast, t]);

  // confirmIteration mutation
  const confirmMutation = trpc.meetingIntelligence.confirmIteration.useMutation({
    onSuccess: () => {
      versionsQuery.refetch();
      toast({ title: t("mi.confirmMerge") });
    },
  });

  // ── Seed demo ────────────────────────────────────────────
  const seedMutation = trpc.smartMeeting.seed.seedDemo.useMutation({
    onSuccess: (data) => {
      meetingsQuery.refetch();
      toast({ title: t("mi.seedDemo"), description: (data as Record<string, unknown>)?.message as string || "OK" });
    },
    onError: (err) => {
      toast({ title: "Seed failed", description: err.message, variant: "destructive" });
    },
  });

  // ── T-Project hooks ──────────────────────────────────────
  const tProjectsQuery = trpc.meetingIntelligence.listTProjects.useQuery(undefined, Q);

  const createTProjectMutation = trpc.meetingIntelligence.createTProject.useMutation({
    onSuccess: (data) => {
      setSelectedTProjectId(data.tProjectId);
      setShowCreateDialog(false);
      setNewTProjectName("");
      setNewTProjectCustomer("");
      tProjectsQuery.refetch();
      toast({ title: t("mi.tProject.created"), description: data.tNumber });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const convertToGRTMutation = trpc.meetingIntelligence.convertToGRT.useMutation({
    onSuccess: (data) => {
      tProjectsQuery.refetch();
      toast({ title: t("mi.tProject.converted"), description: data.grtNumber });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const assignMeetingMutation = trpc.meetingIntelligence.assignMeetingToTProject.useMutation({
    onSuccess: () => {
      meetingsQuery.refetch();
      toast({ title: t("mi.tProject.meetingAssigned") });
    },
  });

  const analyzeCommMutation = trpc.meetingIntelligence.analyzeCommStrategy.useMutation({
    onSuccess: () => {
      toast({ title: t("mi.tProject.commAnalysisQueued") });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const recordEvidenceMutation = trpc.meetingIntelligence.recordEvidence.useMutation({
    onSuccess: () => {
      toast({ title: t("mi.tProject.evidenceRecorded") });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const seedTProjectsMutation = trpc.meetingIntelligence.seedTProjects.useMutation({
    onSuccess: (data) => {
      tProjectsQuery.refetch();
      meetingsQuery.refetch();
      toast({ title: t("mi.tProject.seedDemo"), description: (data as Record<string, unknown>)?.message as string || "OK" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Derived: selected T-project object
  const selectedTProject = (tProjectsQuery.data ?? []).find(
    (p: Record<string, unknown>) => (p as { id: number }).id === selectedTProjectId
  ) as { id: number; tNumber: string; displayName: string; status: string; grtNumber: string | null; convertedProjectId: number | null } | undefined;

  // ── Mutations ─────────────────────────────────────────────
  const iterateMutation = trpc.meetingIntelligence.iterateProposal.useMutation({
    onSuccess: (data) => {
      setIterationTaskId(data.taskId);
    },
  });

  // 当迭代完成时停止轮询
  const iterationDone = iterationStatusQuery.data?.status === "completed" || iterationStatusQuery.data?.status === "failed";
  useEffect(() => {
    if (iterationDone && iterationTaskId) {
      setIterationTaskId(null);
    }
  }, [iterationDone, iterationTaskId]);

  // ── 构建时间轴数据 ─────────────────────────────────────────
  const meetings: MeetingNode[] = (meetingsQuery.data ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as number,
    title: (m.title as string) || t("mi.unnamed"),
    milestone: ((m.stageCode ?? m.stage_code) as string) || inferMilestone(m.title as string),
    stageCode: ((m.stageCode ?? m.stage_code) as string | null) ?? null,
    meetingCategory: ((m.meetingCategory ?? m.meeting_category) as string) || "OTHER",
    direction: ((m.direction) as string) || "INTERNAL",
    scheduledStart: m.scheduledStart as string | null,
    status: m.status as string,
    type: m.type as string,
    projectId: m.projectId as number | null,
    departmentId: m.departmentId as number | null,
    aiSummary: m.aiSummary as MeetingNode["aiSummary"],
    transcript: m.transcript as string | null,
  }));

  // 按类别/方向过滤后按里程碑分组
  const filteredMeetings = meetings.filter((m) => {
    if (categoryFilter && m.meetingCategory !== categoryFilter) return false;
    if (directionFilter && m.direction !== directionFilter) return false;
    return true;
  });
  const milestoneMap = new Map<string, MeetingNode[]>();
  for (const m of filteredMeetings) {
    const list = milestoneMap.get(m.milestone) ?? [];
    list.push(m);
    milestoneMap.set(m.milestone, list);
  }

  // ── Handlers ──────────────────────────────────────────────
  const handleSelectMeeting = useCallback((meeting: MeetingNode) => {
    setSelectedMeeting(meeting);
    setIterationTaskId(null);
    // 假设 requirementId = 1 (实际项目中从会议或项目获取)
    setSelectedProposalId(1);
  }, []);

  const handleIterate = useCallback(() => {
    if (!selectedMeeting?.aiSummary) return;

    const feedback = [
      ...(selectedMeeting.aiSummary.risks ?? []).map(r => `[痛点] ${r}`),
      ...(selectedMeeting.aiSummary.decisions ?? []).map(d => `[决策] ${d}`),
      ...(selectedMeeting.aiSummary.nextSteps ?? []).map(s => `[行动] ${s}`),
    ].join("\n");

    iterateMutation.mutate({
      proposalId: selectedProposalId ?? 1,
      meetingFeedback: feedback || t("mi.defaultFeedback"),
      meetingId: selectedMeeting.id,
    });
  }, [selectedMeeting, selectedProposalId, iterateMutation, t]);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Calendar}
        title={t("mi.title")}
        description={t("mi.desc")}
      />

      {/* T-项目选择器 */}
      <TProjectSelector
        tProjects={((tProjectsQuery.data ?? []) as Array<Record<string, unknown>>).map(p => ({
          id: p.id as number,
          tNumber: p.tNumber as string ?? p.t_number as string ?? "",
          displayName: p.displayName as string ?? p.display_name as string ?? "",
          status: p.status as string ?? "INQUIRY",
          grtNumber: (p.grtNumber as string | null) ?? (p.grt_number as string | null) ?? null,
        }))}
        selectedId={selectedTProjectId}
        onSelect={setSelectedTProjectId}
        onCreateNew={() => setShowCreateDialog(true)}
        onConvert={() => {
          if (!selectedTProject) return;
          convertToGRTMutation.mutate({
            tProjectId: selectedTProject.id,
            projectName: selectedTProject.displayName,
            customerId: 1,
          });
        }}
      />

      {/* 新建 T-项目对话框 (inline) */}
      {showCreateDialog && (
        <Card className="border-l-4 border-l-violet-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("mi.tProject.createDialog.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("mi.tProject.createDialog.name")}</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  value={newTProjectName}
                  onChange={(e) => setNewTProjectName(e.target.value)}
                  placeholder={t("mi.tProject.createDialog.name")}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("mi.tProject.createDialog.customer")}</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  value={newTProjectCustomer}
                  onChange={(e) => setNewTProjectCustomer(e.target.value)}
                  placeholder={t("mi.tProject.createDialog.customer")}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button
                size="sm"
                disabled={!newTProjectName.trim() || createTProjectMutation.isPending}
                onClick={() => createTProjectMutation.mutate({
                  displayName: newTProjectName.trim(),
                  customerName: newTProjectCustomer.trim() || undefined,
                })}
              >
                {createTProjectMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                {t("mi.tProject.createNew")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* T-项目 seed 按钮 (当无 T-项目时) */}
      {(tProjectsQuery.data ?? []).length === 0 && !tProjectsQuery.isLoading && (
        <div className="flex justify-center">
          <Button
            size="sm"
            variant="outline"
            disabled={seedTProjectsMutation.isPending}
            onClick={() => seedTProjectsMutation.mutate()}
          >
            {seedTProjectsMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Database className="h-4 w-4 mr-1" />}
            {t("mi.tProject.seedDemo")}
          </Button>
        </div>
      )}

      {/* 会议筛选栏 */}
      <MeetingFilterBar
        categoryFilter={categoryFilter}
        directionFilter={directionFilter}
        onCategoryChange={setCategoryFilter}
        onDirectionChange={setDirectionFilter}
      />

      {/* 创建阶段会议对话框 */}
      {showCreateMeetingDialog && (
        <CreateStageMeetingDialog
          initialStageCode={createMeetingStageCode}
          tProjectId={selectedTProjectId}
          onCreated={() => {
            setShowCreateMeetingDialog(false);
            meetingsQuery.refetch();
          }}
          onCancel={() => setShowCreateMeetingDialog(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── 左侧：M0-M12 时间轴 ──────────────────────────── */}
        <div className="lg:col-span-5 xl:col-span-4">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t("mi.milestones")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {meetingsQuery.isLoading ? (
                <div className="px-4 pb-4">
                  <TimelineSkeleton />
                </div>
              ) : meetingsQuery.isError ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-muted-foreground">
                  <AlertTriangle className="h-10 w-10 mb-3 text-red-400" />
                  <p className="text-sm font-medium mb-1 text-red-600">{t("mi.queryError")}</p>
                  <p className="text-xs mb-4 text-center text-red-500">{meetingsQuery.error.message}</p>
                  <Button size="sm" variant="outline" onClick={() => meetingsQuery.refetch()}>
                    <RefreshCw className="h-4 w-4 mr-1" /> {t("mi.retry")}
                  </Button>
                </div>
              ) : meetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-muted-foreground">
                  <Database className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium mb-1">{t("mi.noMeetingData")}</p>
                  <p className="text-xs mb-4 text-center">{t("mi.seedDesc")}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={seedMutation.isPending}
                    onClick={() => seedMutation.mutate()}
                  >
                    {seedMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4 mr-1" />
                    )}
                    {t("mi.seedDemo")}
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  {/* 垂直连接线 */}
                  <div className="absolute left-[35px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700" />

                  <div className="space-y-1 py-2">
                    {MILESTONE_KEYS.map((key) => {
                      const nodeMeetings = milestoneMap.get(key) ?? [];
                      const hasCompleted = nodeMeetings.some(m => m.status === "ENDED");
                      const hasActive = nodeMeetings.some(m => m.status === "LIVE");
                      const nodeStatus = hasCompleted ? "completed" : hasActive ? "active" : "upcoming";
                      const isSelected = selectedMeeting && nodeMeetings.some(m => m.id === selectedMeeting.id);

                      return (
                        <div key={key} className="relative">
                          {/* 里程碑标题行 */}
                          <div className="flex items-center gap-3 px-4 py-2">
                            <MilestoneIcon status={nodeStatus} isActive={!!isSelected} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground tracking-wider">{key}</span>
                                <span className="text-sm font-medium truncate">{t(MILESTONE_I18N[key])}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {nodeMeetings.length > 0 && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {nodeMeetings.length} {t("mi.meetings")}
                                  </span>
                                )}
                                {/* Category breakdown mini-icons */}
                                {nodeMeetings.length > 0 && Object.entries(
                                  nodeMeetings.reduce<Record<string, number>>((acc, m) => {
                                    acc[m.meetingCategory] = (acc[m.meetingCategory] ?? 0) + 1;
                                    return acc;
                                  }, {})
                                ).map(([cat, cnt]) => {
                                  const CatIcon = CATEGORY_ICONS[cat] ?? MessageSquare;
                                  return (
                                    <span key={cat} className="text-[10px] text-muted-foreground flex items-center gap-0.5" title={t(CATEGORY_I18N[cat] ?? "mi.category.other")}>
                                      <CatIcon className="h-2.5 w-2.5" />{cnt}
                                    </span>
                                  );
                                })}
                                {/* + button to create meeting for this stage */}
                                <button
                                  className="h-5 w-5 rounded-full bg-muted hover:bg-primary/10 flex items-center justify-center ml-1"
                                  title={t("mi.createMeeting")}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCreateMeetingStageCode(key);
                                    setShowCreateMeetingDialog(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 该里程碑下的会议列表 */}
                          {nodeMeetings.length > 0 && (
                            <div className="ml-[52px] mr-4 mb-2 space-y-1">
                              {nodeMeetings.map((meeting) => {
                                const isActive = selectedMeeting?.id === meeting.id;
                                const hasAi = !!(meeting.aiSummary?.risks?.length || meeting.aiSummary?.decisions?.length);

                                return (
                                  <button
                                    key={meeting.id}
                                    onClick={() => handleSelectMeeting(meeting)}
                                    className={`w-full text-left px-3 py-2 rounded-lg border transition-all duration-200 group
                                      ${isActive
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-sm"
                                        : "border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                      }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium truncate flex-1">{meeting.title}</span>
                                      {selectedTProjectId && (
                                        <span
                                          role="button"
                                          tabIndex={0}
                                          className="text-violet-500 hover:text-violet-700 cursor-pointer flex-shrink-0"
                                          title={t("mi.tProject.meetingAssigned")}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            assignMeetingMutation.mutate({ meetingId: meeting.id, tProjectId: selectedTProjectId });
                                          }}
                                          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); assignMeetingMutation.mutate({ meetingId: meeting.id, tProjectId: selectedTProjectId }); } }}
                                        >
                                          <Link className="h-3.5 w-3.5" />
                                        </span>
                                      )}
                                      {hasAi && (
                                        <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                      )}
                                      {/* Category icon */}
                                      {(() => {
                                        const CatIcon = CATEGORY_ICONS[meeting.meetingCategory] ?? MessageSquare;
                                        return <CatIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />;
                                      })()}
                                      {/* Direction badge */}
                                      <Badge className={`text-[10px] px-1.5 py-0 ${DIRECTION_COLORS[meeting.direction] ?? ""}`}>
                                        {t(`mi.direction.${meeting.direction.toLowerCase()}`)}
                                      </Badge>
                                      {meeting.type === "MAJOR" && (
                                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                          {t("mi.badge.important")}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {meeting.scheduledStart
                                          ? new Date(meeting.scheduledStart).toLocaleDateString()
                                          : t("mi.datePending")}
                                      </span>
                                      <Badge
                                        variant={
                                          meeting.status === "ENDED" ? "secondary" :
                                          meeting.status === "LIVE" ? "default" : "outline"
                                        }
                                        className="text-[10px] px-1.5 py-0"
                                      >
                                        {meeting.status === "ENDED" ? t("mi.status.ended") :
                                         meeting.status === "LIVE" ? t("mi.status.live") : t("mi.status.upcoming")}
                                      </Badge>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── 右侧：AI 洞察 + 方案操作 ──────────────────────── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {!selectedMeeting && (
            /* 未选中状态提示 */
            <Card className="border-l-4 border-l-blue-400">
              <CardContent className="py-4 flex items-center gap-3">
                <Calendar className="h-8 w-8 opacity-40 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t("mi.selectMeeting")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("mi.selectMeetingDesc")}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 功能模块总览 — 始终显示 */}
          <Card className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950/30">
            <CardContent className="py-4">
              <h3 className="text-sm font-semibold mb-3">{t("mi.featureOverview")}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: FileText, label: t("mi.transcript"), color: "text-cyan-600", active: !!selectedMeeting },
                  { icon: MessageCircle, label: t("mi.customerFeedback"), color: "text-emerald-600", active: true },
                  { icon: GitCompareArrows, label: t("mi.proposalDiff"), color: "text-purple-600", active: false },
                  { icon: ArrowRightToLine, label: t("mi.pushToM3"), color: "text-orange-600", active: false },
                ].map(({ icon: Icon, label, color, active }) => (
                  <div key={label} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${active ? "bg-white dark:bg-slate-800 shadow-sm" : "opacity-50"}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="truncate">{label}</span>
                    {active && <CheckCircle2 className="h-3 w-3 text-green-500 ml-auto flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 转写文本输入 — 选中会议后显示 */}
          {selectedMeeting && (
            <TranscriptInputPanel
              meetingId={selectedMeeting.id}
              onAnalysisStarted={(taskId) => setAnalysisTaskId(taskId)}
            />
          )}

          {/* AI 分析轮询状态 */}
          {analysisTaskId && (
            <Card className="border-l-4 border-l-cyan-500">
              <CardContent className="py-3 flex items-center gap-3 text-cyan-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">{t("mi.iterationInProgress")}</span>
              </CardContent>
            </Card>
          )}

          {/* AI 洞察面板 — 选中会议后显示 */}
          {selectedMeeting && (
            <AiInsightsPanel
              meeting={selectedMeeting}
              onIterate={handleIterate}
              isIterating={iterateMutation.isPending}
              projectId={selectedTProjectId ?? 1}
            />
          )}

          {/* 沟通后三输出操作 */}
          {selectedTProjectId && selectedMeeting && (
            <PostCommActionButtons
              tProjectId={selectedTProjectId}
              meetingId={selectedMeeting.id}
              convertedProjectId={selectedTProject?.convertedProjectId}
              onRouteToM2={() => {
                if (selectedTProject?.convertedProjectId) {
                  window.location.href = `/pos/projects/${selectedTProject.convertedProjectId}/stage/m2`;
                } else {
                  toast({ title: t("mi.tProject.needConvert"), variant: "destructive" });
                }
              }}
              onAnalyzeComm={() => {
                const notes = selectedMeeting.transcript || selectedMeeting.aiSummary?.decisions?.join("\n") || "Communication notes pending";
                analyzeCommMutation.mutate({
                  tProjectId: selectedTProjectId,
                  meetingId: selectedMeeting.id,
                  communicationNotes: notes,
                });
              }}
              onRecordEvidence={() => {
                recordEvidenceMutation.mutate({
                  tProjectId: selectedTProjectId,
                  meetingId: selectedMeeting.id,
                  evidenceType: "communication_record",
                  title: `${selectedMeeting.title} - ${new Date().toLocaleDateString()}`,
                  content: selectedMeeting.transcript || JSON.stringify(selectedMeeting.aiSummary) || "No content",
                });
              }}
              isAnalyzing={analyzeCommMutation.isPending}
            />
          )}

          {/* 客户反馈录入 — 始终显示（meetingId 可选） */}
          <CustomerFeedbackForm
            projectId={selectedTProjectId ?? 1}
            meetingId={selectedMeeting?.id}
          />

              {/* 迭代状态提示 */}
              {iterationTaskId && (
                <Card className="border-l-4 border-l-indigo-500">
                  <CardContent className="py-4">
                    {iterationStatusQuery.isLoading ? (
                      <SummarySkeleton />
                    ) : iterationStatusQuery.data?.status === "completed" ? (
                      <div className="flex items-center gap-3 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{t("mi.iterationComplete")}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            ID: {iterationStatusQuery.data.proposal?.id} |
                            V{iterationStatusQuery.data.proposal?.version} |
                            {iterationStatusQuery.data.proposal?.status}
                          </p>
                        </div>
                      </div>
                    ) : iterationStatusQuery.data?.status === "failed" ? (
                      <div className="flex items-center gap-3 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{t("mi.iterationFailed")}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {iterationStatusQuery.data.errorMessage || t("mi.unknownError")}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-blue-600">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <div>
                          <p className="font-medium">{t("mi.iterationInProgress")}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {t("mi.taskStatus")}: {iterationStatusQuery.data?.status ?? "pending"}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 方案版本对比 (当有迭代完成的新旧版本时显示) */}
              {iterationStatusQuery.data?.status === "completed" &&
                iterationStatusQuery.data.proposal?.parentProposalId &&
                iterationStatusQuery.data.proposal?.id && (
                <ProposalDiffPanel
                  oldProposalId={iterationStatusQuery.data.proposal.parentProposalId}
                  newProposalId={iterationStatusQuery.data.proposal.id}
                  onConfirm={(fields) => {
                    confirmMutation.mutate({
                      proposalId: iterationStatusQuery.data!.proposal!.id,
                      acceptFields: fields as ("processFlow" | "equipmentConfig" | "budgetEstimate")[],
                      parentProposalId: iterationStatusQuery.data!.proposal!.parentProposalId!,
                    });
                  }}
                />
              )}

              {/* M3 推送按钮 (版本链中有 APPROVED 方案时显示) */}
              {((versionsQuery.data ?? []) as VersionEntry[]).some(v => v.status === "APPROVED") && (
                <div className="flex justify-end">
                  <M3PushButton
                    proposalId={((versionsQuery.data ?? []) as VersionEntry[]).find(v => v.status === "APPROVED")!.id}
                    onPushed={() => versionsQuery.refetch()}
                  />
                </div>
              )}

              {/* 版本历史 */}
              <VersionHistoryPanel
                versions={(versionsQuery.data ?? []) as VersionEntry[]}
                isLoading={versionsQuery.isLoading}
              />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

/** 从会议标题推断所属里程碑阶段 */
function inferMilestone(title: string): string {
  if (!title) return "M0";
  const upper = title.toUpperCase();
  for (const key of MILESTONE_KEYS) {
    if (upper.includes(key)) return key;
  }
  // 关键词匹配
  if (/需求|确认|启动/.test(title)) return "M0";
  if (/概念|评审/.test(title)) return "M1";
  if (/可行性/.test(title)) return "M2";
  if (/方案|冻结/.test(title)) return "M3";
  if (/详细设计/.test(title)) return "M4";
  if (/设计验证/.test(title)) return "M5";
  if (/试制/.test(title)) return "M6";
  if (/验证/.test(title)) return "M7";
  if (/小批/.test(title)) return "M8";
  if (/量产/.test(title)) return "M9";
  if (/交付|验收/.test(title)) return "M10";
  if (/售后/.test(title)) return "M11";
  if (/关闭|结项/.test(title)) return "M12";
  return "M0";
}
