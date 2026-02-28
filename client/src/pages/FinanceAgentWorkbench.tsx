import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Brain, Shield, AlertTriangle, CheckCircle2, Clock, Loader2,
  FileText, TrendingUp, ChevronRight, ShieldAlert, RefreshCw,
  Info, ArrowRight, XCircle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────

type TabKey = "submit" | "history" | "policy";

interface PolicyViolation {
  rule: string;
  detail: string;
  severity: "critical" | "warning";
}

interface BuBudgetContext {
  buName: string;
  quarterTarget: number;
  quarterActual: number;
  completionPct: number;
  currentExpenseRatio: number;
  redLineRatio: number;
  projectedRatio: number;
}

interface AiDiagnosticReport {
  decision: "pass" | "intercept" | "warn";
  score: number;
  interceptReason?: string;
  buContext: BuBudgetContext;
  diagnosis: string;
  recommendations: string[];
  policyViolations: PolicyViolation[];
  source: "llm" | "algorithmic";
  overridden?: boolean;
  overriddenBy?: string;
  overrideJustification?: string;
}

// ── Fluent UI Primitives ────────────────────────────────────────

function FluentCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-[#edebe9] rounded-xl shadow-sm ${className}`}>{children}</div>;
}

function FluentBadge({ children, color = "#0078d4", bg = "#e5f1fb" }: { children: React.ReactNode; color?: string; bg?: string }) {
  return <span style={{ color, backgroundColor: bg }} className="px-2 py-0.5 rounded-full text-xs font-medium">{children}</span>;
}

function FluentButton({ children, variant = "primary", onClick, className = "", disabled = false }: {
  children: React.ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger"; onClick?: () => void; className?: string; disabled?: boolean;
}) {
  const base = "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#0078d4] text-white hover:bg-[#106ebe] active:bg-[#005a9e]",
    secondary: "bg-[#f3f2f1] text-[#323130] hover:bg-[#edebe9] border border-[#d2d0ce]",
    ghost: "text-[#0078d4] hover:bg-[#f3f2f1]",
    danger: "bg-[#d13438] text-white hover:bg-[#a4262c]",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

// ── Skeleton Loading ────────────────────────────────────────────

function ReviewSkeleton() {
  return (
    <FluentCard className="p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <Loader2 className="w-6 h-6 text-[#0078d4] animate-spin" />
        <div>
          <div className="text-base font-semibold text-[#323130]">Finance Agent 正在核对...</div>
          <div className="text-xs text-[#a19f9d] mt-1">正在分析预算匹配度和费用政策合规性</div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-[#f3f2f1] rounded w-3/4" />
        <div className="h-4 bg-[#f3f2f1] rounded w-1/2" />
        <div className="h-4 bg-[#f3f2f1] rounded w-2/3" />
        <div className="h-8 bg-[#f3f2f1] rounded w-full mt-4" />
        <div className="h-4 bg-[#f3f2f1] rounded w-5/6" />
        <div className="h-4 bg-[#f3f2f1] rounded w-1/3" />
      </div>
    </FluentCard>
  );
}

// ── Intercept Card (核心) ───────────────────────────────────────

function InterceptCard({ report, onOverride }: { report: AiDiagnosticReport; onOverride: () => void }) {
  const { buContext, policyViolations, recommendations, diagnosis, score, interceptReason } = report;
  const ratioPercent = Math.min((buContext.projectedRatio / buContext.redLineRatio) * 100, 150);

  return (
    <FluentCard className="border-l-4 border-[#d13438] p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#d13438]" />
          <span className="font-bold text-[#d13438] text-base">【系统自动拦截通知】</span>
        </div>
        <span className={`text-2xl font-bold ${score < 50 ? "text-[#d13438]" : "text-[#ca5010]"}`}>
          {score}分
        </span>
      </div>

      {/* Intercept reason */}
      {interceptReason && (
        <div className="bg-[#fde7e9] border border-[#d13438]/20 rounded-lg p-3 mb-4">
          <div className="text-sm font-medium text-[#a4262c]">拦截原因: {interceptReason}</div>
        </div>
      )}

      {/* AI Diagnosis */}
      <div className="bg-[#faf9f8] border border-[#edebe9] rounded-lg p-4 mb-4">
        <div className="text-xs font-semibold text-[#605e5c] mb-2 flex items-center gap-1">
          <Brain className="w-3.5 h-3.5" /> AI 诊断分析
        </div>
        <div className="text-sm text-[#323130] leading-relaxed">{diagnosis}</div>
        {report.source === "algorithmic" && (
          <div className="text-xs text-[#a19f9d] mt-2">(算法引擎分析)</div>
        )}
      </div>

      {/* Expense Ratio Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-[#605e5c] mb-1">
          <span>费用率</span>
          <span>{buContext.projectedRatio}% / {buContext.redLineRatio}% 红线</span>
        </div>
        <div className="h-3 bg-[#f3f2f1] rounded-full overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(ratioPercent, 100)}%`,
              backgroundColor: buContext.projectedRatio > buContext.redLineRatio ? "#d13438" : buContext.projectedRatio > 4 ? "#ca5010" : "#107c10",
            }}
          />
          {/* Red line marker */}
          <div className="absolute top-0 h-full w-0.5 bg-[#d13438]" style={{ left: `${(buContext.redLineRatio / (buContext.redLineRatio * 1.5)) * 100}%` }} />
        </div>
      </div>

      {/* Policy Violations */}
      {policyViolations.length > 0 && (
        <div className="space-y-2 mb-4">
          {policyViolations.map((v, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <XCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${v.severity === "critical" ? "text-[#d13438]" : "text-[#ca5010]"}`} />
              <span className={v.severity === "critical" ? "text-[#a4262c]" : "text-[#8a8886]"}>
                {v.rule}: {v.detail} <FluentBadge color={v.severity === "critical" ? "#d13438" : "#ca5010"} bg={v.severity === "critical" ? "#fde7e9" : "#fff4ce"}>{v.severity}</FluentBadge>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-[#605e5c] mb-2">建议:</div>
          <ol className="list-decimal list-inside space-y-1">
            {recommendations.map((r, i) => (
              <li key={i} className="text-sm text-[#323130]">{r}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Override button */}
      <FluentButton variant="secondary" onClick={onOverride} className="w-full justify-center">
        <Shield className="w-4 h-4" /> 申请例外审批
      </FluentButton>
    </FluentCard>
  );
}

// ── Pass/Warn Card ──────────────────────────────────────────────

function ResultCard({ report }: { report: AiDiagnosticReport }) {
  const isPass = report.decision === "pass";
  const color = isPass ? "#107c10" : "#ca5010";
  const bgColor = isPass ? "#dff6dd" : "#fff4ce";
  const Icon = isPass ? CheckCircle2 : AlertTriangle;
  const label = isPass ? "审核通过" : "审核警告";

  return (
    <div className="bg-white border border-[#edebe9] rounded-xl shadow-sm border-l-4 p-6" style={{ borderLeftColor: color }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" style={{ color }} />
          <span className="font-bold text-base" style={{ color }}>{label}</span>
        </div>
        <span className="text-2xl font-bold" style={{ color }}>{report.score}分</span>
      </div>

      <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: bgColor }}>
        <div className="text-sm" style={{ color }}>{report.diagnosis}</div>
      </div>

      {/* Budget summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-[#faf9f8] rounded-lg">
          <div className="text-xs text-[#605e5c]">季度产值目标</div>
          <div className="text-sm font-semibold text-[#323130]">{(report.buContext.quarterTarget / 10000).toFixed(0)}万</div>
        </div>
        <div className="text-center p-2 bg-[#faf9f8] rounded-lg">
          <div className="text-xs text-[#605e5c]">完成率</div>
          <div className="text-sm font-semibold text-[#323130]">{report.buContext.completionPct}%</div>
        </div>
        <div className="text-center p-2 bg-[#faf9f8] rounded-lg">
          <div className="text-xs text-[#605e5c]">费用率</div>
          <div className="text-sm font-semibold" style={{ color: report.buContext.projectedRatio > 4 ? "#ca5010" : "#107c10" }}>
            {report.buContext.projectedRatio}%
          </div>
        </div>
      </div>

      {report.policyViolations.length > 0 && (
        <div className="space-y-1 mb-4">
          {report.policyViolations.map((v, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-[#8a8886]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#ca5010]" />
              {v.rule}: {v.detail}
            </div>
          ))}
        </div>
      )}

      {report.recommendations.length > 0 && (
        <div className="space-y-1">
          {report.recommendations.map((r, i) => (
            <div key={i} className="text-sm text-[#605e5c] flex items-start gap-1">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-[#0078d4] flex-shrink-0" /> {r}
            </div>
          ))}
        </div>
      )}

      {report.overridden && (
        <div className="mt-4 p-3 bg-[#e5f1fb] rounded-lg text-sm text-[#0078d4]">
          <span className="font-medium">已获例外审批</span> — {report.overriddenBy}: {report.overrideJustification}
        </div>
      )}
    </div>
  );
}

// ── Override Dialog ──────────────────────────────────────────────

function OverrideDialog({ claimId, onClose, onSuccess }: { claimId: number; onClose: () => void; onSuccess: () => void }) {
  const [justification, setJustification] = useState("");
  const overrideMut = trpc.financeAgent.overrideAndApprove.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[#0078d4]" />
          <h3 className="font-semibold text-[#323130]">申请例外审批</h3>
        </div>
        <p className="text-sm text-[#605e5c] mb-3">请填写例外审批理由 (至少10个字符):</p>
        <textarea
          className="w-full border border-[#d2d0ce] rounded-lg p-3 text-sm focus:outline-none focus:border-[#0078d4] resize-none"
          rows={4}
          value={justification}
          onChange={e => setJustification(e.target.value)}
          placeholder="例如: 海外展会为战略客户拓展需要, 已获BU总经理口头批准..."
        />
        <div className="flex gap-2 mt-4 justify-end">
          <FluentButton variant="secondary" onClick={onClose}>取消</FluentButton>
          <FluentButton
            variant="primary"
            onClick={() => overrideMut.mutate({ claimId, justification })}
            disabled={justification.length < 10 || overrideMut.isPending}
          >
            {overrideMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            提交申请
          </FluentButton>
        </div>
        {overrideMut.error && (
          <p className="text-xs text-[#d13438] mt-2">{overrideMut.error.message}</p>
        )}
      </div>
    </div>
  );
}

// ── Tab 1: Submit Review ────────────────────────────────────────

function SubmitReviewTab() {
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [showOverride, setShowOverride] = useState(false);

  // Fetch pending claims (submitted, draft) for selection
  const pendingQuery = trpc.financeAgent.listPendingReviews.useQuery({ page: 1, pageSize: 50 });

  // Fetch all recent claims (for the dropdown)
  const recentQuery = trpc.financeAgent.recentReviews.useQuery();

  // Submit mutation
  const submitMut = trpc.financeAgent.submitForReview.useMutation({
    onSuccess: (data) => setTaskId(data.taskId),
  });

  // Poll for status when taskId is set
  const statusQuery = trpc.financeAgent.getReviewStatus.useQuery(
    { taskId: taskId ?? 0 },
    {
      enabled: !!taskId,
      refetchInterval: (query) => {
        const status = query.state.data?.taskStatus;
        if (status === "completed" || status === "failed" || status === "not_found") return false;
        return 3000;
      },
    },
  );

  const isProcessing = !!taskId && (statusQuery.data?.taskStatus === "pending" || statusQuery.data?.taskStatus === "processing" || statusQuery.isLoading);
  const isCompleted = statusQuery.data?.taskStatus === "completed" && statusQuery.data?.report;
  const report = statusQuery.data?.report as AiDiagnosticReport | null;

  // Also show claims that exist but aren't in pending (like submitted ones from seed)
  const allClaims = recentQuery.data ?? [];

  const handleSubmit = () => {
    if (selectedClaimId) {
      setTaskId(null);
      submitMut.mutate({ claimId: selectedClaimId });
    }
  };

  const resetFlow = () => {
    setSelectedClaimId(null);
    setTaskId(null);
  };

  return (
    <div className="space-y-4">
      {/* Claim selector + submit */}
      <FluentCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-[#0078d4]" />
          <h3 className="font-semibold text-[#323130]">选择报销单</h3>
        </div>

        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-[#605e5c] block mb-1">报销单</label>
            <select
              className="w-full border border-[#d2d0ce] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0078d4] bg-white"
              value={selectedClaimId ?? ""}
              onChange={e => { setSelectedClaimId(Number(e.target.value) || null); setTaskId(null); }}
            >
              <option value="">-- 请选择 --</option>
              {/* Show pending reviews */}
              {pendingQuery.data?.rows.map(c => (
                <option key={c.id} value={c.id}>
                  {c.claimCode} — {c.claimTitle ?? c.claimType} (¥{Number(c.totalAmount).toLocaleString()}) [{c.status}]
                </option>
              ))}
              {/* Show recent claims that have results (for re-viewing) */}
              {allClaims.filter(c => !pendingQuery.data?.rows.some(p => p.id === c.id)).map(c => (
                <option key={c.id} value={c.id}>
                  {c.claimCode} — {c.claimTitle ?? c.claimType} (¥{Number(c.totalAmount).toLocaleString()}) [{c.status}]
                </option>
              ))}
            </select>
          </div>
          <FluentButton
            variant="primary"
            onClick={handleSubmit}
            disabled={!selectedClaimId || submitMut.isPending || isProcessing}
          >
            {submitMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            提交AI审核
          </FluentButton>
          {(isCompleted || taskId) && (
            <FluentButton variant="ghost" onClick={resetFlow}>
              <RefreshCw className="w-4 h-4" /> 重新选择
            </FluentButton>
          )}
        </div>
        {submitMut.error && (
          <p className="text-xs text-[#d13438] mt-2">{submitMut.error.message}</p>
        )}
      </FluentCard>

      {/* State 2: Processing skeleton */}
      {isProcessing && <ReviewSkeleton />}

      {/* State 3: Result */}
      {isCompleted && report && (
        report.decision === "intercept" ? (
          <>
            <InterceptCard report={report} onOverride={() => setShowOverride(true)} />
            {showOverride && selectedClaimId && (
              <OverrideDialog
                claimId={selectedClaimId}
                onClose={() => setShowOverride(false)}
                onSuccess={() => { statusQuery.refetch(); }}
              />
            )}
          </>
        ) : (
          <ResultCard report={report} />
        )
      )}

      {/* Show existing report if claim already has one (no task needed) */}
      {!taskId && selectedClaimId && (() => {
        const existing = allClaims.find(c => c.id === selectedClaimId);
        if (existing?.aiAuditResult) {
          const r = existing.aiAuditResult as unknown as AiDiagnosticReport;
          return r.decision === "intercept" ? (
            <>
              <InterceptCard report={r} onOverride={() => setShowOverride(true)} />
              {showOverride && (
                <OverrideDialog claimId={selectedClaimId} onClose={() => setShowOverride(false)} onSuccess={() => { recentQuery.refetch(); }} />
              )}
            </>
          ) : <ResultCard report={r} />;
        }
        return null;
      })()}
    </div>
  );
}

// ── Tab 2: History ──────────────────────────────────────────────

function ReviewHistoryTab() {
  const recentQuery = trpc.financeAgent.recentReviews.useQuery();

  const decisionColors: Record<string, { color: string; bg: string; label: string }> = {
    pass: { color: "#107c10", bg: "#dff6dd", label: "通过" },
    intercept: { color: "#d13438", bg: "#fde7e9", label: "拦截" },
    warn: { color: "#ca5010", bg: "#fff4ce", label: "警告" },
  };

  return (
    <FluentCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#0078d4]" />
          <h3 className="font-semibold text-[#323130]">审核历史</h3>
        </div>
        <FluentButton variant="ghost" onClick={() => recentQuery.refetch()}>
          <RefreshCw className="w-4 h-4" /> 刷新
        </FluentButton>
      </div>

      {recentQuery.isLoading ? (
        <div className="text-sm text-[#a19f9d] text-center py-8">加载中...</div>
      ) : !recentQuery.data?.length ? (
        <div className="text-sm text-[#a19f9d] text-center py-8">暂无审核记录, 请先使用 seedDemo 生成演示数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#edebe9] text-left text-xs text-[#605e5c]">
                <th className="py-2 px-3">编号</th>
                <th className="py-2 px-3">标题</th>
                <th className="py-2 px-3">类型</th>
                <th className="py-2 px-3 text-right">金额</th>
                <th className="py-2 px-3 text-center">评分</th>
                <th className="py-2 px-3 text-center">决策</th>
                <th className="py-2 px-3">状态</th>
                <th className="py-2 px-3">时间</th>
              </tr>
            </thead>
            <tbody>
              {recentQuery.data.map(row => {
                const dec = decisionColors[row.decision ?? ""] ?? { color: "#8a8886", bg: "#f3f2f1", label: row.decision ?? "-" };
                return (
                  <tr key={row.id} className="border-b border-[#f3f2f1] hover:bg-[#faf9f8]">
                    <td className="py-2.5 px-3 font-mono text-xs">{row.claimCode}</td>
                    <td className="py-2.5 px-3">{row.claimTitle ?? "-"}</td>
                    <td className="py-2.5 px-3"><FluentBadge>{row.claimType}</FluentBadge></td>
                    <td className="py-2.5 px-3 text-right font-medium">¥{Number(row.totalAmount).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`font-bold ${(row.aiAuditScore ?? 0) < 50 ? "text-[#d13438]" : (row.aiAuditScore ?? 0) < 70 ? "text-[#ca5010]" : "text-[#107c10]"}`}>
                        {row.aiAuditScore ?? "-"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <FluentBadge color={dec.color} bg={dec.bg}>{dec.label}</FluentBadge>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[#605e5c]">{row.status}</td>
                    <td className="py-2.5 px-3 text-xs text-[#a19f9d]">
                      {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString("zh-CN") : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </FluentCard>
  );
}

// ── Tab 3: Policy Rules ─────────────────────────────────────────

function PolicyRulesTab() {
  const rulesQuery = trpc.financeAgent.getPolicyRules.useQuery();
  const budgetQuery = trpc.financeAgent.getBudgetContext.useQuery({ departmentId: null });

  return (
    <div className="space-y-4">
      {/* Budget context */}
      <FluentCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-[#0078d4]" />
          <h3 className="font-semibold text-[#323130]">当前BU预算概览</h3>
        </div>
        {budgetQuery.data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-[#faf9f8] rounded-lg text-center">
              <div className="text-xs text-[#605e5c]">事业部</div>
              <div className="text-sm font-semibold mt-1">{budgetQuery.data.buName}</div>
            </div>
            <div className="p-3 bg-[#faf9f8] rounded-lg text-center">
              <div className="text-xs text-[#605e5c]">季度产值目标</div>
              <div className="text-sm font-semibold mt-1">¥{(budgetQuery.data.quarterTarget / 10000).toFixed(0)}万</div>
            </div>
            <div className="p-3 bg-[#faf9f8] rounded-lg text-center">
              <div className="text-xs text-[#605e5c]">完成率</div>
              <div className="text-sm font-semibold mt-1">{budgetQuery.data.completionPct}%</div>
            </div>
            <div className="p-3 bg-[#faf9f8] rounded-lg text-center">
              <div className="text-xs text-[#605e5c]">费用率 / 红线</div>
              <div className={`text-sm font-bold mt-1 ${budgetQuery.data.projectedRatio > 5 ? "text-[#d13438]" : budgetQuery.data.projectedRatio > 4 ? "text-[#ca5010]" : "text-[#107c10]"}`}>
                {budgetQuery.data.projectedRatio}% / {budgetQuery.data.redLineRatio}%
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-[#a19f9d]">加载中...</div>
        )}
      </FluentCard>

      {/* Policy rules */}
      <FluentCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5 text-[#0078d4]" />
          <h3 className="font-semibold text-[#323130]">费用审核政策规则</h3>
        </div>
        <div className="space-y-3">
          {(rulesQuery.data ?? []).map(rule => (
            <div key={rule.id} className="flex items-start gap-3 p-3 bg-[#faf9f8] rounded-lg">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                rule.severity === "critical" ? "bg-[#fde7e9] text-[#d13438]" : "bg-[#fff4ce] text-[#ca5010]"
              }`}>
                {rule.severity === "critical" ? <XCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#a19f9d]">{rule.id}</span>
                  <span className="font-medium text-sm text-[#323130]">{rule.name}</span>
                  <FluentBadge
                    color={rule.severity === "critical" ? "#d13438" : "#ca5010"}
                    bg={rule.severity === "critical" ? "#fde7e9" : "#fff4ce"}
                  >
                    {rule.severity}
                  </FluentBadge>
                </div>
                <div className="text-sm text-[#605e5c] mt-1">{rule.description}</div>
                <div className="text-xs text-[#a19f9d] mt-1">阈值: {typeof rule.threshold === "number" && rule.threshold < 1 ? `${(rule.threshold * 100)}%` : `¥${Number(rule.threshold).toLocaleString()}`}</div>
              </div>
            </div>
          ))}
        </div>
      </FluentCard>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function FinanceAgentWorkbench() {
  const [tab, setTab] = useState<TabKey>("submit");
  const { t } = useLanguage();

  const seedMut = trpc.financeAgent.seedDemo.useMutation();

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "submit", label: "提交审核", icon: <Brain className="w-4 h-4" /> },
    { key: "history", label: "审核历史", icon: <Clock className="w-4 h-4" /> },
    { key: "policy", label: "费用政策", icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f8]">
      {/* Header */}
      <div className="bg-white border-b border-[#edebe9] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0078d4] flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#323130]">Finance Agent</h1>
              <p className="text-xs text-[#a19f9d]">AI 费用审核拦截引擎 — 预算匹配 + 政策合规</p>
            </div>
          </div>
          <FluentButton
            variant="secondary"
            onClick={() => seedMut.mutate()}
            disabled={seedMut.isPending}
          >
            {seedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            生成演示数据
          </FluentButton>
        </div>

        {seedMut.isSuccess && (
          <div className="mt-2 text-xs text-[#107c10]">
            已生成 {seedMut.data.inserted} 条演示数据 (ID: {seedMut.data.ids.join(", ")})
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mt-4 -mb-[1px]">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t.key
                  ? "bg-[#faf9f8] text-[#0078d4] border border-[#edebe9] border-b-[#faf9f8]"
                  : "text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1]"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {tab === "submit" && <SubmitReviewTab />}
        {tab === "history" && <ReviewHistoryTab />}
        {tab === "policy" && <PolicyRulesTab />}
      </div>
    </div>
  );
}
